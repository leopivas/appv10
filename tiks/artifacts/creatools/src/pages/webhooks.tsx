import { useState } from "react";
import { useListWebhooks, useCreateWebhook, useDeleteWebhook, useTestWebhook, getListWebhooksQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Webhook, Plus, Trash2, TestTube, RefreshCw, Copy, Check, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const EVENTS = [
  { id: "live.start", label: "Live Start", description: "Creator goes live" },
  { id: "live.end", label: "Live End", description: "Creator ends stream" },
  { id: "gift", label: "Gift", description: "Gift received in stream" },
  { id: "chat", label: "Chat", description: "Chat message" },
  { id: "follow", label: "Follow", description: "New follower" },
  { id: "share", label: "Share", description: "Stream shared" },
  { id: "subscribe", label: "Subscribe", description: "New subscriber" },
  { id: "like", label: "Like", description: "Like event" },
];

interface WebhookEntry {
  id?: string;
  url?: string;
  events?: string[];
  creators?: string[];
  createdAt?: string;
  lastDelivery?: { status?: number; at?: string };
  secret?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CreateWebhookDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [creators, setCreators] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["live.start", "live.end"]);
  const { toast } = useToast();
  const { mutate, isPending } = useCreateWebhook();

  function toggle(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  function handleCreate() {
    if (!url || selectedEvents.length === 0) return;
    mutate(
      {
        data: {
          url,
          events: selectedEvents,
          creators: creators ? creators.split(",").map((c) => c.trim()).filter(Boolean) : [],
          secret: secret || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Webhook created" });
          setOpen(false);
          setUrl("");
          setSecret("");
          setCreators("");
          setSelectedEvents(["live.start", "live.end"]);
          onCreated();
        },
        onError: () => toast({ title: "Failed to create webhook", variant: "destructive" }),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />Create Webhook
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Webhook</DialogTitle>
          <DialogDescription>
            Receive HTTP POST notifications when creators go live or events occur.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="wh-url">Endpoint URL <span className="text-destructive">*</span></Label>
            <Input
              id="wh-url"
              placeholder="https://your-server.com/webhook"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-secret">Signing Secret (optional)</Label>
            <Input
              id="wh-secret"
              type="password"
              placeholder="Shared secret for HMAC verification"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-creators">Creators to watch (optional)</Label>
            <Input
              id="wh-creators"
              placeholder="username1, username2, ..."
              value={creators}
              onChange={(e) => setCreators(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Comma-separated usernames (without @). Leave empty to watch all.</p>
          </div>
          <div className="space-y-2">
            <Label>Events <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {EVENTS.map((ev) => (
                <div key={ev.id} className="flex items-start gap-2 p-2 rounded-md border border-border hover:bg-accent/40">
                  <Checkbox
                    id={`ev-${ev.id}`}
                    checked={selectedEvents.includes(ev.id)}
                    onCheckedChange={() => toggle(ev.id)}
                    className="mt-0.5"
                  />
                  <div>
                    <label htmlFor={`ev-${ev.id}`} className="text-sm font-medium cursor-pointer">{ev.label}</label>
                    <p className="text-xs text-muted-foreground">{ev.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isPending || !url || selectedEvents.length === 0}>
            {isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WebhookCard({ wh, onDeleted, onTested }: { wh: WebhookEntry; onDeleted: () => void; onTested: () => void }) {
  const { toast } = useToast();
  const { mutate: del, isPending: deleting } = useDeleteWebhook();
  const { mutate: test, isPending: testing } = useTestWebhook();

  function handleDelete() {
    if (!wh.id) return;
    del(
      { id: wh.id },
      {
        onSuccess: () => { toast({ title: "Webhook deleted" }); onDeleted(); },
        onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
      }
    );
  }

  function handleTest() {
    if (!wh.id) return;
    test(
      { id: wh.id, data: {} },
      {
        onSuccess: () => { toast({ title: "Test delivery sent" }); onTested(); },
        onError: () => toast({ title: "Test delivery failed", variant: "destructive" }),
      }
    );
  }

  const lastStatus = wh.lastDelivery?.status;
  const statusOk = lastStatus && lastStatus >= 200 && lastStatus < 300;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <p className="text-sm font-mono text-foreground truncate">{wh.url}</p>
              <CopyButton text={wh.url ?? ""} />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(wh.events ?? []).map((ev) => (
                <Badge key={ev} variant="secondary" className="text-xs">{ev}</Badge>
              ))}
            </div>
            {wh.creators && wh.creators.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {wh.creators.map((c) => (
                  <Badge key={c} variant="outline" className="text-xs">@{c}</Badge>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3 mt-2">
              {lastStatus !== undefined && (
                <span className={`text-xs font-mono ${statusOk ? "text-green-400" : "text-red-400"}`}>
                  Last: HTTP {lastStatus}
                </span>
              )}
              {wh.lastDelivery?.at && (
                <span className="text-xs text-muted-foreground">
                  {new Date(wh.lastDelivery.at).toLocaleString()}
                </span>
              )}
              {wh.createdAt && (
                <span className="text-xs text-muted-foreground">
                  Created {new Date(wh.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testing}
              className="text-xs"
            >
              <TestTube className="w-3.5 h-3.5 mr-1" />
              {testing ? "Sending..." : "Test"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Webhooks() {
  const { data, isLoading, refetch } = useListWebhooks({
    query: { queryKey: getListWebhooksQueryKey(), staleTime: 1000 * 30 },
  });

  const raw = data as { webhooks?: WebhookEntry[] } | WebhookEntry[] | undefined;
  const webhooks: WebhookEntry[] = Array.isArray(raw) ? raw : (raw?.webhooks ?? []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Webhook className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">Webhooks</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Receive HTTP notifications when creators go live or stream events occur
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <CreateWebhookDialog onCreated={() => refetch()} />
        </div>
      </div>

      <Card className="border-border bg-muted/20">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <div className="w-1 rounded-full bg-primary shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">How webhooks work</p>
              <p className="text-xs text-muted-foreground">
                When a watched creator goes live or an event occurs, tik.tools sends a POST request to your endpoint with a JSON body.
                Set a signing secret to verify requests via HMAC-SHA256. Leave the creators list empty to watch all creators in your account.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Webhook className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No webhooks configured</p>
            <p className="text-xs text-muted-foreground mt-1">Create one to receive live notifications</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh, i) => (
            <WebhookCard
              key={wh.id ?? i}
              wh={wh}
              onDeleted={() => refetch()}
              onTested={() => refetch()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
