import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Code2, Zap, RefreshCw, Play, Copy, Check, Link2, Info } from "lucide-react";

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

function JsonViewer({ data }: { data: unknown }) {
  const str = JSON.stringify(data, null, 2);
  return (
    <div className="relative">
      <div className="absolute top-2 right-2">
        <CopyButton text={str} />
      </div>
      <pre className="text-xs bg-muted/40 rounded-lg p-4 overflow-auto max-h-[500px] font-mono whitespace-pre-wrap break-all pr-8">
        {str}
      </pre>
    </div>
  );
}

function WebcastFetchTool() {
  const [uniqueId, setUniqueId] = useState("");
  const [cursor, setCursor] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleFetch() {
    const uid = uniqueId.trim().replace(/^@/, "");
    if (!uid) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body: Record<string, string> = { uniqueId: uid };
      if (cursor.trim()) body.cursor = cursor.trim();
      const resp = await fetch("/api/tiktok/webcast-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await resp.json() as Record<string, unknown>;
      if (!resp.ok) {
        setError(JSON.stringify(json, null, 2));
      } else {
        setResult(json);
        const newCursor = (json as { cursor?: string })?.cursor;
        if (newCursor) setCursor(newCursor);
      }
    } catch (e) {
      setError(String(e));
      toast({ title: "Request failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Webcast Fetch</span> is the HTTP alternative to WebSocket.
              Use it for serverless environments or when persistent connections aren't possible.
              Returns the same live events (chat, gifts, likes…) with a <code className="bg-muted px-1 rounded">cursor</code> for pagination.
              Keep calling with the returned cursor to poll for new events.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="wf-uid">TikTok Username</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
            <Input
              id="wf-uid"
              placeholder="username"
              className="pl-7"
              value={uniqueId}
              onChange={(e) => setUniqueId(e.target.value.replace(/^@/, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleFetch()}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wf-cursor">Cursor (optional)</Label>
          <Input
            id="wf-cursor"
            placeholder="Returned from previous response"
            value={cursor}
            onChange={(e) => setCursor(e.target.value)}
            className="font-mono text-xs"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleFetch} disabled={loading || !uniqueId.trim()}>
          {loading ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Fetching…</>
          ) : (
            <><Play className="w-4 h-4 mr-2" />Fetch Events</>
          )}
        </Button>
        {cursor && (
          <Button variant="outline" size="sm" onClick={handleFetch} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-1.5" />Poll Next
          </Button>
        )}
        {(result || error) && (
          <Button variant="ghost" size="sm" onClick={() => { setResult(null); setError(null); setCursor(""); }}>
            Clear
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4">
            <pre className="text-xs text-destructive font-mono whitespace-pre-wrap">{error}</pre>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {(result as { events?: unknown[] })?.events !== undefined && (
              <Badge variant="secondary">
                {(result as { events: unknown[] }).events.length} events
              </Badge>
            )}
            {(result as { cursor?: string })?.cursor && (
              <Badge variant="outline" className="font-mono text-xs max-w-xs truncate">
                cursor: {(result as { cursor: string }).cursor}
              </Badge>
            )}
          </div>
          <JsonViewer data={result} />
        </div>
      )}
    </div>
  );
}

function SignUrlTool() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleSign() {
    const target = url.trim();
    if (!target) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resp = await fetch("/api/tiktok/sign-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const json = await resp.json() as Record<string, unknown>;
      if (!resp.ok) {
        setError(JSON.stringify(json, null, 2));
        toast({ title: "Failed to sign URL", variant: "destructive" });
      } else {
        setResult(json);
      }
    } catch (e) {
      setError(String(e));
      toast({ title: "Request failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Sign URL</span> adds the{" "}
              <code className="bg-muted px-1 rounded">X-Bogus</code> and{" "}
              <code className="bg-muted px-1 rounded">X-Gnarly</code> anti-automation signatures
              required to call TikTok's internal webcast APIs directly.
              Requires <Badge variant="outline" className="text-[10px] px-1 py-0 ml-0.5">Agency</Badge> tier.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-1.5">
        <Label htmlFor="su-url">TikTok Webcast URL</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="su-url"
              placeholder="https://webcast.tiktok.com/webcast/..."
              className="pl-9 font-mono text-xs"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSign()}
            />
          </div>
          <Button onClick={handleSign} disabled={loading || !url.trim()}>
            {loading ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Signing…</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" />Sign URL</>
            )}
          </Button>
        </div>
      </div>

      {(result || error) && (
        <Button variant="ghost" size="sm" onClick={() => { setResult(null); setError(null); }}>
          Clear
        </Button>
      )}

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4">
            <pre className="text-xs text-destructive font-mono whitespace-pre-wrap">{error}</pre>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-3">
          {(result as { signedUrl?: string })?.signedUrl && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Signed URL</Label>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border border-border">
                <p className="text-xs font-mono break-all flex-1">
                  {(result as { signedUrl: string }).signedUrl}
                </p>
                <CopyButton text={(result as { signedUrl: string }).signedUrl} />
              </div>
            </div>
          )}
          {(result as { headers?: Record<string, string> })?.headers && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Required Headers</Label>
              <div className="space-y-2">
                {Object.entries((result as { headers: Record<string, string> }).headers).map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 border border-border">
                    <code className="text-xs text-primary font-mono shrink-0">{k}:</code>
                    <p className="text-xs font-mono break-all flex-1">{v}</p>
                    <CopyButton text={v} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <JsonViewer data={result} />
        </div>
      )}
    </div>
  );
}

function RoomInfoTool() {
  const [uniqueId, setUniqueId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleFetch() {
    const uid = uniqueId.trim().replace(/^@/, "");
    const rid = roomId.trim();
    if (!uid && !rid) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body: Record<string, string> = {};
      if (uid) body.uniqueId = uid;
      if (rid) body.roomId = rid;
      const resp = await fetch("/api/tiktok/room-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await resp.json() as Record<string, unknown>;
      if (!resp.ok) {
        setError(JSON.stringify(json, null, 2));
        toast({ title: "Request failed", variant: "destructive" });
      } else {
        setResult(json);
      }
    } catch (e) {
      setError(String(e));
      toast({ title: "Request failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Room Info</span> returns detailed stream metadata:
              title, viewer count, room ID, stream URL, stats and more.
              Provide a <code className="bg-muted px-1 rounded">uniqueId</code> (backend resolves the room automatically)
              or a direct <code className="bg-muted px-1 rounded">roomId</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="ri-uid">Username (resolves room automatically)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
            <Input
              id="ri-uid"
              placeholder="username"
              className="pl-7"
              value={uniqueId}
              onChange={(e) => setUniqueId(e.target.value.replace(/^@/, ""))}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ri-rid">Room ID (optional override)</Label>
          <Input
            id="ri-rid"
            placeholder="7123456789012345678"
            className="font-mono text-xs"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleFetch} disabled={loading || (!uniqueId.trim() && !roomId.trim())}>
          {loading ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Fetching…</>
          ) : (
            <><Play className="w-4 h-4 mr-2" />Get Room Info</>
          )}
        </Button>
        {(result || error) && (
          <Button variant="ghost" size="sm" onClick={() => { setResult(null); setError(null); }}>
            Clear
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4">
            <pre className="text-xs text-destructive font-mono whitespace-pre-wrap">{error}</pre>
          </CardContent>
        </Card>
      )}

      {result && <JsonViewer data={result} />}
    </div>
  );
}

function CheckAliveTool() {
  const [uniqueId, setUniqueId] = useState("");
  const [roomIds, setRoomIds] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleCheck() {
    const uid = uniqueId.trim().replace(/^@/, "");
    const rids = roomIds.trim();
    if (!uid && !rids) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = new URLSearchParams();
      if (uid) params.set("unique_id", uid);
      if (rids) params.set("room_ids", rids);
      const resp = await fetch(`/api/tiktok/check-alive?${params.toString()}`);
      const json = await resp.json() as Record<string, unknown>;
      if (!resp.ok) {
        setError(JSON.stringify(json, null, 2));
        toast({ title: "Request failed", variant: "destructive" });
      } else {
        setResult(json);
      }
    } catch (e) {
      setError(String(e));
      toast({ title: "Request failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Check Alive</span> is a lightweight, fast endpoint
              to verify if a single user or multiple rooms are currently live.
              Pass a <code className="bg-muted px-1 rounded">unique_id</code> for a single user,
              or comma-separated <code className="bg-muted px-1 rounded">room_ids</code> for batch room checks.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="ca-uid">Username</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
            <Input
              id="ca-uid"
              placeholder="username"
              className="pl-7"
              value={uniqueId}
              onChange={(e) => setUniqueId(e.target.value.replace(/^@/, ""))}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ca-rids">Room IDs (comma-separated)</Label>
          <Input
            id="ca-rids"
            placeholder="7123456789..., 7987654321..."
            className="font-mono text-xs"
            value={roomIds}
            onChange={(e) => setRoomIds(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleCheck} disabled={loading || (!uniqueId.trim() && !roomIds.trim())}>
          {loading ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Checking…</>
          ) : (
            <><Play className="w-4 h-4 mr-2" />Check Alive</>
          )}
        </Button>
        {(result || error) && (
          <Button variant="ghost" size="sm" onClick={() => { setResult(null); setError(null); }}>
            Clear
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4">
            <pre className="text-xs text-destructive font-mono whitespace-pre-wrap">{error}</pre>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-3">
          {Array.isArray((result as { data?: unknown[] })?.data) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {((result as { data: Array<{ room_id?: string; is_alive?: boolean }> }).data).map((item, i) => (
                <div key={i} className={`p-3 rounded-lg border text-sm font-mono ${
                  item.is_alive ? "border-green-500/30 bg-green-500/5 text-green-400" : "border-border text-muted-foreground"
                }`}>
                  <p className="font-medium">{item.is_alive ? "🟢 Live" : "⚫ Offline"}</p>
                  {item.room_id && <p className="text-xs mt-0.5 truncate opacity-70">{item.room_id}</p>}
                </div>
              ))}
            </div>
          )}
          <JsonViewer data={result} />
        </div>
      )}
    </div>
  );
}

export default function DevTools() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Code2 className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Developer Tools</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Raw API explorers — Webcast Fetch, Sign URL, Room Info, Check Alive
        </p>
      </div>

      <Tabs defaultValue="webcast-fetch">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="webcast-fetch">
            <RefreshCw className="w-4 h-4 mr-1.5" />Webcast Fetch
          </TabsTrigger>
          <TabsTrigger value="sign-url">
            <Zap className="w-4 h-4 mr-1.5" />Sign URL
          </TabsTrigger>
          <TabsTrigger value="room-info">
            <Info className="w-4 h-4 mr-1.5" />Room Info
          </TabsTrigger>
          <TabsTrigger value="check-alive">
            <Play className="w-4 h-4 mr-1.5" />Check Alive
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="webcast-fetch">
            <WebcastFetchTool />
          </TabsContent>
          <TabsContent value="sign-url">
            <SignUrlTool />
          </TabsContent>
          <TabsContent value="room-info">
            <RoomInfoTool />
          </TabsContent>
          <TabsContent value="check-alive">
            <CheckAliveTool />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
