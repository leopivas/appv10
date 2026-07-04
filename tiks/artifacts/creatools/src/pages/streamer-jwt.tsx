import { useState } from "react";
import { useLocation } from "wouter";
import { useMintJwt } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Key, Loader2, XCircle, Activity, Copy, CheckCircle2 } from "lucide-react";

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { void navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-muted-foreground hover:text-foreground transition-colors ml-1 shrink-0"
    >
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function StreamerJwt() {
  const [, setLocation] = useLocation();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ token: string; uniqueId: string } | null>(null);
  const mintJwt = useMintJwt();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = input.trim().replace(/^@/, "");
    if (!u) return;
    mintJwt.mutate(
      { data: { uniqueId: u } },
      { onSuccess: (data) => setResult(data as { token: string; uniqueId: string }) }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          JWT / WebSocket
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate a signed JWT to open a WebSocket connection to any creator's LIVE stream.
        </p>
      </div>

      <Card className="bg-card border-border max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Mint JWT Token</CardTitle>
          <CardDescription>
            Tokens are scoped to a single username and expire after 10 minutes.
            Use the generated WebSocket URL to receive real-time events (chat, gifts, likes, joins).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">@</span>
              <Input
                placeholder="username"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="pl-7 font-mono text-sm bg-background border-border"
              />
            </div>
            <Button type="submit" disabled={!input.trim() || mintJwt.isPending}>
              {mintJwt.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Key className="w-4 h-4 mr-1.5" />Mint</>}
            </Button>
          </form>

          {mintJwt.isError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <XCircle className="w-4 h-4 shrink-0" />
              {mintJwt.error instanceof Error ? mintJwt.error.message : "Failed to mint JWT"}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <Separator />
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">JWT Token</p>
                <div className="flex items-start gap-2">
                  <code className="text-xs font-mono bg-background border border-border rounded-md p-2.5 flex-1 break-all leading-relaxed text-foreground/80">
                    {result.token}
                  </code>
                  <CopyBtn value={result.token} />
                </div>
              </div>

              <div className="bg-background border border-border rounded-md p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">WebSocket URL</p>
                <div className="flex items-start gap-2">
                  <code className="text-xs font-mono text-primary break-all leading-relaxed flex-1">
                    {`wss://api.tik.tools?uniqueId=${result.uniqueId}&jwtKey=${result.token}`}
                  </code>
                  <CopyBtn value={`wss://api.tik.tools?uniqueId=${result.uniqueId}&jwtKey=${result.token}`} />
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full"
                onClick={() => setLocation(`/monitor/${result.uniqueId}`)}>
                <Activity className="w-4 h-4 mr-2" />Open Monitor for @{result.uniqueId}
              </Button>

              <div className="rounded-md bg-muted/30 border border-border p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground/80">WebSocket Events</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                  {["chat", "gift", "like", "member", "follow", "share", "roomInfo", "roomUserSeq"].map((ev) => (
                    <span key={ev} className="text-foreground/60">• {ev}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
