import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Trophy, Wifi, WifiOff, RotateCcw, Play, Square,
  Gift, Heart, UserPlus, MessageSquare, Share2, Flame,
} from "lucide-react";

interface ScoreEntry {
  uniqueId: string;
  nickname: string;
  points: number;
  gifts: number;
  diamonds: number;
  likes: number;
  follows: number;
  comments: number;
  shares: number;
}

interface ScoringRules {
  diamondPoints: number;
  likePoints: number;
  followPoints: number;
  commentPoints: number;
  sharePoints: number;
}

const DEFAULT_RULES: ScoringRules = {
  diamondPoints: 1,
  likePoints: 0.1,
  followPoints: 5,
  commentPoints: 0.5,
  sharePoints: 3,
};

const MEDAL = ["🥇", "🥈", "🥉"];
const MEDAL_COLORS = [
  "from-yellow-500/20 to-amber-500/10 border-yellow-500/30",
  "from-zinc-400/15 to-zinc-500/10 border-zinc-400/25",
  "from-orange-700/20 to-amber-800/10 border-orange-700/30",
];

function fmt(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toFixed(n % 1 === 0 ? 0 : 1);
}

export default function Scoreboards() {
  const [username, setUsername] = useState("");
  const [inputVal, setInputVal] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [scores, setScores] = useState<Map<string, ScoreEntry>>(new Map());
  const [rules, setRules] = useState<ScoringRules>(DEFAULT_RULES);
  const wsRef = useRef<WebSocket | null>(null);
  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  const sorted = Array.from(scores.values()).sort((a, b) => b.points - a.points);
  const totalPoints = sorted.reduce((s, e) => s + e.points, 0);

  const addPoints = useCallback((uniqueId: string, nickname: string, delta: Partial<ScoreEntry>) => {
    setScores((prev) => {
      const next = new Map(prev);
      const existing = next.get(uniqueId) ?? {
        uniqueId, nickname,
        points: 0, gifts: 0, diamonds: 0, likes: 0, follows: 0, comments: 0, shares: 0,
      };
      const updated = { ...existing };
      if (delta.nickname) updated.nickname = delta.nickname;
      updated.gifts += delta.gifts ?? 0;
      updated.diamonds += delta.diamonds ?? 0;
      updated.likes += delta.likes ?? 0;
      updated.follows += delta.follows ?? 0;
      updated.comments += delta.comments ?? 0;
      updated.shares += delta.shares ?? 0;
      const r = rulesRef.current;
      updated.points =
        updated.diamonds * r.diamondPoints +
        updated.likes * r.likePoints +
        updated.follows * r.followPoints +
        updated.comments * r.commentPoints +
        updated.shares * r.sharePoints;
      next.set(uniqueId, updated);
      return next;
    });
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
    setConnecting(false);
  }, []);

  const connect = useCallback(async (user: string) => {
    disconnect();
    setConnecting(true);
    try {
      const jwtRes = await fetch(`/api/tiktok/jwt?uniqueId=${encodeURIComponent(user)}`);
      if (!jwtRes.ok) throw new Error("JWT error");
      const { jwtKey } = await jwtRes.json() as { jwtKey: string };
      const ws = new WebSocket(`wss://api.tik.tools?uniqueId=${encodeURIComponent(user)}&jwtKey=${jwtKey}`);
      wsRef.current = ws;
      ws.onopen = () => { setConnected(true); setConnecting(false); };
      ws.onclose = () => { setConnected(false); setConnecting(false); };
      ws.onerror = () => { setConnected(false); setConnecting(false); };
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data as string) as Record<string, unknown>;
          const uid = String(data.uniqueId ?? data.userId ?? "");
          const nick = String(data.nickname ?? data.displayName ?? uid);
          if (!uid) return;
          const t = data.type as string;
          if (t === "gift") {
            const diamonds = Number(data.diamondCount ?? 0) * Number(data.repeatCount ?? 1);
            addPoints(uid, nick, { gifts: 1, diamonds });
          } else if (t === "like") {
            addPoints(uid, nick, { likes: Number(data.likeCount ?? 1) });
          } else if (t === "follow" || t === "member") {
            addPoints(uid, nick, { follows: 1 });
          } else if (t === "chat") {
            addPoints(uid, nick, { comments: 1 });
          } else if (t === "share") {
            addPoints(uid, nick, { shares: 1 });
          }
        } catch { /* ignore */ }
      };
    } catch {
      setConnecting(false);
    }
  }, [disconnect, addPoints]);

  useEffect(() => () => { wsRef.current?.close(); }, []);

  function handleStart() {
    const u = inputVal.trim().replace(/^@/, "");
    if (!u) return;
    setUsername(u);
    setScores(new Map());
    connect(u);
  }

  function recalc() {
    setScores((prev) => {
      const next = new Map(prev);
      const r = rules;
      next.forEach((e, k) => {
        next.set(k, {
          ...e,
          points:
            e.diamonds * r.diamondPoints +
            e.likes * r.likePoints +
            e.follows * r.followPoints +
            e.comments * r.commentPoints +
            e.shares * r.sharePoints,
        });
      });
      return next;
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/8 to-pink-500/10 border border-white/8 p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(40_100%_60%/0.08),transparent_60%)] pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Scoreboard ao Vivo</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight gradient-text">Scoreboards</h1>
            <p className="text-muted-foreground mt-1 text-sm">Pontue viewers em tempo real por presentes, likes, follows e comentários</p>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Conectado a @{username}
              </Badge>
            ) : connecting ? (
              <Badge className="gap-1.5 bg-amber-500/15 text-amber-400 border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Conectando...
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">
          {/* Connect */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {connected ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-muted-foreground" />}
                Conectar Stream
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="@username"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                className="font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button onClick={handleStart} disabled={!inputVal.trim() || connecting} className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black border-0">
                  <Play className="w-3.5 h-3.5" />
                  {connecting ? "Conectando..." : "Iniciar"}
                </Button>
                {connected && (
                  <Button variant="outline" onClick={disconnect} className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10">
                    <Square className="w-3.5 h-3.5" />
                    Parar
                  </Button>
                )}
              </div>
              {connected && (
                <Button variant="ghost" size="sm" onClick={() => { setScores(new Map()); }} className="w-full gap-2 text-muted-foreground hover:text-foreground">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Zerar placar
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Scoring Rules */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Regras de Pontuação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {([
                { key: "diamondPoints" as const, label: "Por diamante 💎", min: 0.1, max: 10, step: 0.1, icon: Gift },
                { key: "followPoints" as const, label: "Por follow 👤", min: 0, max: 50, step: 1, icon: UserPlus },
                { key: "sharePoints" as const, label: "Por share 🔗", min: 0, max: 20, step: 0.5, icon: Share2 },
                { key: "commentPoints" as const, label: "Por comentário 💬", min: 0, max: 5, step: 0.1, icon: MessageSquare },
                { key: "likePoints" as const, label: "Por like ❤️", min: 0, max: 2, step: 0.05, icon: Heart },
              ] as const).map(({ key, label, min, max, step }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <span className="text-xs font-mono text-primary">{rules[key]}</span>
                  </div>
                  <Slider
                    min={min} max={max} step={step}
                    value={[rules[key]]}
                    onValueChange={([v]) => setRules((r) => ({ ...r, [key]: v }))}
                    className="h-1.5"
                  />
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={recalc} className="w-full mt-1 gap-2 text-xs">
                <RotateCcw className="w-3 h-3" />
                Recalcular tudo
              </Button>
            </CardContent>
          </Card>

          {/* Stats summary */}
          {sorted.length > 0 && (
            <Card className="border-border bg-card">
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Participantes</span>
                  <span className="font-mono font-semibold">{sorted.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Pontos totais</span>
                  <span className="font-mono font-semibold text-amber-300">{fmt(totalPoints)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Diamantes</span>
                  <span className="font-mono font-semibold text-violet-300">{sorted.reduce((s, e) => s + e.diamonds, 0).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Leaderboard */}
        <div className="xl:col-span-2">
          <Card className="border-border bg-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                Placar em Tempo Real
                {sorted.length > 0 && (
                  <Badge variant="outline" className="ml-auto text-xs">{sorted.length} viewers</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                  <Trophy className="w-12 h-12 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">
                    {connected
                      ? "Aguardando eventos... Os viewers aparecerão aqui ao interagir."
                      : "Conecte a um stream para começar o scoreboard."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sorted.slice(0, 50).map((entry, i) => {
                    const pct = totalPoints > 0 ? (entry.points / totalPoints) * 100 : 0;
                    return (
                      <div
                        key={entry.uniqueId}
                        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl border overflow-hidden transition-all ${
                          i < 3
                            ? `bg-gradient-to-r ${MEDAL_COLORS[i]}`
                            : "border-border bg-card/50 hover:bg-accent/30"
                        }`}
                      >
                        {/* progress bar bg */}
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-amber-500/5 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                        <span className="relative z-10 w-6 text-center text-sm font-bold shrink-0">
                          {i < 3 ? MEDAL[i] : `${i + 1}`}
                        </span>
                        <div className="relative z-10 flex-1 min-w-0">
                          <span className="font-semibold text-sm truncate block">{entry.nickname}</span>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {entry.diamonds > 0 && (
                              <span className="text-[10px] text-violet-300 font-mono">💎 {entry.diamonds}</span>
                            )}
                            {entry.follows > 0 && (
                              <span className="text-[10px] text-cyan-300 font-mono">👤 {entry.follows}</span>
                            )}
                            {entry.comments > 0 && (
                              <span className="text-[10px] text-muted-foreground font-mono">💬 {entry.comments}</span>
                            )}
                            {entry.likes > 0 && (
                              <span className="text-[10px] text-pink-300 font-mono">❤️ {fmt(entry.likes)}</span>
                            )}
                          </div>
                        </div>
                        <span className={`relative z-10 text-lg font-bold font-mono shrink-0 ${i === 0 ? "text-yellow-300" : i === 1 ? "text-zinc-300" : i === 2 ? "text-orange-400" : "text-foreground"}`}>
                          {fmt(entry.points)}
                          <span className="text-xs font-normal text-muted-foreground ml-0.5">pts</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
