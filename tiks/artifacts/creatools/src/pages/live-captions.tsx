import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { useGetConfig } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Subtitles, Wifi, WifiOff, Loader2, Languages,
  Mic, MicOff, Volume2, RefreshCw, ArrowLeft, Copy
} from "lucide-react";
import { useLocation } from "wouter";

interface Caption {
  id: string;
  timestamp: Date;
  text: string;
  language?: string;
  translation?: string;
  translationLang?: string;
  isFinal?: boolean;
}

type WsState = "idle" | "connecting" | "connected" | "disconnected" | "error";

export default function LiveCaptions() {
  const params = useParams<{ username: string }>();
  const [, nav] = useLocation();
  const { toast } = useToast();

  const [username, setUsername] = useState(params?.username ?? "");
  const [inputUsername, setInputUsername] = useState(params?.username ?? "");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [wsState, setWsState] = useState<WsState>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: config } = useGetConfig(undefined);
  const apiKey = (config as { apiKeyMasked?: string; apiKeySet?: boolean } | undefined)?.apiKeySet ? "configured" : null;

  const connect = useCallback((uid: string) => {
    if (!uid) return;
    wsRef.current?.close();
    clearTimeout(reconnectRef.current);
    setWsState("connecting");
    setCaptions([]);

    // tik.tools captions WebSocket — connects directly from browser
    const wsUrl = `wss://api.tik.tools/captions?uniqueId=${encodeURIComponent(uid)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setWsState("connected");

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as {
          type?: string;
          data?: {
            text?: string;
            language?: string;
            translation?: string;
            translationLang?: string;
            isFinal?: boolean;
          };
        };

        if (msg.type === "caption" || msg.type === "translation") {
          const d = msg.data ?? {};
          const caption: Caption = {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            text: d.text ?? "",
            language: d.language,
            translation: d.translation,
            translationLang: d.translationLang,
            isFinal: d.isFinal ?? false,
          };
          setCaptions((prev) => {
            // Replace the last non-final caption if this is a continuation
            if (!caption.isFinal && prev.length > 0 && !prev[prev.length - 1].isFinal) {
              return [...prev.slice(0, -1), caption];
            }
            return [...prev.slice(-499), caption];
          });
        }
      } catch {}
    };

    ws.onclose = (ev) => {
      setWsState("disconnected");
      if (ev.code !== 1000) {
        // Auto-reconnect after 3s unless intentionally closed
        reconnectRef.current = setTimeout(() => connect(uid), 3000);
      }
    };

    ws.onerror = () => setWsState("error");
  }, []);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectRef.current);
    wsRef.current?.close(1000, "User disconnected");
    wsRef.current = null;
    setWsState("idle");
  }, []);

  useEffect(() => {
    if (params?.username) {
      setUsername(params.username);
      setInputUsername(params.username);
      connect(params.username);
    }
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close(1000, "Unmounted");
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [captions]);

  function handleConnect() {
    if (!inputUsername.trim()) return;
    const uid = inputUsername.trim().replace(/^@/, "");
    setUsername(uid);
    connect(uid);
  }

  const WsIcon = wsState === "connected" ? Wifi : wsState === "connecting" ? Loader2 : WifiOff;
  const wsColor =
    wsState === "connected" ? "text-green-400" :
    wsState === "connecting" ? "text-yellow-400 animate-spin" :
    wsState === "error" ? "text-red-400" :
    "text-muted-foreground";
  const wsBadge =
    wsState === "connected" ? "bg-green-500/10 text-green-400 border-green-500/30" :
    wsState === "connecting" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
    wsState === "error" ? "bg-red-500/10 text-red-400 border-red-500/30" :
    "bg-muted/40 text-muted-foreground";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => nav(-1 as never)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Subtitles className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">Live Captions</h1>
          </div>
          <p className="text-muted-foreground text-sm">Real-time speech-to-text transcription from TikTok LIVE</p>
        </div>
      </div>

      {/* Connect bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
          <Input
            placeholder="username"
            className="pl-7"
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value.replace(/^@/, ""))}
            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
          />
        </div>
        {wsState === "idle" || wsState === "disconnected" || wsState === "error" ? (
          <Button onClick={handleConnect} disabled={!inputUsername.trim()}>
            <Mic className="w-4 h-4 mr-2" />Connect
          </Button>
        ) : (
          <Button variant="outline" onClick={disconnect}>
            <MicOff className="w-4 h-4 mr-2" />Disconnect
          </Button>
        )}
        <Badge className={`${wsBadge} shrink-0`}>
          <WsIcon className={`w-3 h-3 mr-1.5 ${wsColor}`} />
          {wsState === "connected" ? "Live" :
           wsState === "connecting" ? "Connecting..." :
           wsState === "disconnected" ? "Reconnecting..." :
           wsState === "error" ? "Error" : "Idle"}
        </Badge>
      </div>

      {/* Stats bar */}
      {wsState === "connected" && username && (
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            <Languages className="w-3 h-3 mr-1" />@{username}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            <Volume2 className="w-3 h-3 mr-1" />{captions.length} captions
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-6"
            onClick={() => {
              const text = captions.map((c) => `[${c.timestamp.toLocaleTimeString()}] ${c.text}${c.translation ? ` (${c.translation})` : ""}`).join("\n");
              navigator.clipboard.writeText(text);
              toast({ title: "Transcript copied" });
            }}
          >
            <Copy className="w-3 h-3 mr-1" />Copy transcript
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-6"
            onClick={() => setCaptions([])}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Caption stream */}
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Subtitles className="w-4 h-4 text-primary" />
            Transcript
            {wsState === "connected" && (
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {wsState === "idle" && captions.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Subtitles className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Enter a username and connect to see live captions</p>
              <p className="text-xs mt-1 opacity-60">Captions are generated from TikTok's real-time speech-to-text</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3 pr-3">
                {captions.map((cap) => (
                  <div key={cap.id} className={`space-y-1 ${!cap.isFinal ? "opacity-60" : ""}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {cap.timestamp.toLocaleTimeString()}
                      </span>
                      {cap.language && (
                        <Badge variant="outline" className="text-xs px-1 py-0">{cap.language}</Badge>
                      )}
                      {!cap.isFinal && (
                        <Badge variant="outline" className="text-xs px-1 py-0 opacity-60">live...</Badge>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">{cap.text}</p>
                    {cap.translation && (
                      <p className="text-sm text-muted-foreground italic">
                        🌐 {cap.translation}
                        {cap.translationLang && (
                          <span className="text-xs ml-1">({cap.translationLang})</span>
                        )}
                      </p>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
