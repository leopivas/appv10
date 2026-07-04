import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Gamepad2, RotateCcw, Play, Square, Plus, Trash2,
  Wifi, WifiOff, User, Shuffle, Gift, Zap, X,
} from "lucide-react";

// ── Wheel Spin ────────────────────────────────────────────────────────────────

const WHEEL_COLORS = [
  "#06b6d4", "#8b5cf6", "#f43f5e", "#f59e0b",
  "#10b981", "#3b82f6", "#ec4899", "#84cc16",
];

function SpinWheel({ items }: { items: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const angleRef = useRef(0);
  const animRef = useRef<number>(0);

  const draw = useCallback((angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = cx - 8;
    const n = items.length;
    if (n === 0) return;
    const arc = (2 * Math.PI) / n;

    ctx.clearRect(0, 0, size, size);

    for (let i = 0; i < n; i++) {
      const start = angle + i * arc;
      const end = start + arc;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(10, Math.min(14, 120 / n))}px sans-serif`;
      const label = items[i].length > 16 ? items[i].slice(0, 15) + "…" : items[i];
      ctx.fillText(label, r - 10, 5);
      ctx.restore();
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
    ctx.fillStyle = "#0f172a";
    ctx.fill();
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pointer (top)
    ctx.beginPath();
    ctx.moveTo(cx, 4);
    ctx.lineTo(cx - 10, 20);
    ctx.lineTo(cx + 10, 20);
    ctx.closePath();
    ctx.fillStyle = "#f8fafc";
    ctx.fill();
  }, [items]);

  useEffect(() => { draw(angleRef.current); }, [draw, items]);

  function spin() {
    if (spinning || items.length < 2) return;
    setWinner(null);
    setSpinning(true);
    const totalRotation = (Math.PI * 2) * (8 + Math.floor(Math.random() * 8)) + Math.random() * Math.PI * 2;
    const start = performance.now();
    const duration = 4000 + Math.random() * 2000;
    const startAngle = angleRef.current;

    function frame(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = startAngle + totalRotation * ease;
      angleRef.current = current;
      draw(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(frame);
      } else {
        setSpinning(false);
        const arc = (2 * Math.PI) / items.length;
        // Pointer is at top (Math.PI * 1.5 in canvas coords = angle 0 from top)
        const normalised = ((current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        // pointer at -angle relative to items
        const idx = Math.floor(((2 * Math.PI - normalised) % (2 * Math.PI)) / arc) % items.length;
        setWinner(items[idx]);
      }
    }
    animRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <canvas ref={canvasRef} width={320} height={320} className="rounded-full shadow-2xl shadow-black/50" />
      </div>
      <Button
        onClick={spin}
        disabled={spinning || items.length < 2}
        className="gap-2 px-8 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-400 hover:to-pink-400 text-white border-0 shadow-lg shadow-violet-500/20"
      >
        <Shuffle className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} />
        {spinning ? "Girando..." : "Girar!"}
      </Button>
      {winner && (
        <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-500/20 to-pink-500/20 border border-violet-500/30 text-center">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="text-xs text-muted-foreground">Vencedor</p>
            <p className="text-lg font-bold text-violet-300">{winner}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function WheelGame() {
  const [items, setItems] = useState<string[]>(["Opção 1", "Opção 2", "Opção 3", "Opção 4"]);
  const [input, setInput] = useState("");

  function addItem() {
    const v = input.trim();
    if (!v || items.includes(v)) return;
    setItems((p) => [...p, v]);
    setInput("");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="flex flex-col items-center">
        <SpinWheel items={items} />
      </div>
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Opções da roda</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Adicionar opção..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            className="text-sm font-mono"
          />
          <Button onClick={addItem} disabled={!input.trim()} size="icon" className="shrink-0 bg-violet-500 hover:bg-violet-400">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/50 border border-border group">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: WHEEL_COLORS[i % WHEEL_COLORS.length] }}
              />
              <span className="text-sm flex-1">{item}</span>
              <button onClick={() => setItems((p) => p.filter((_, j) => j !== i))} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setItems([])} className="gap-2 text-xs text-muted-foreground w-full">
            <Trash2 className="w-3 h-3" />
            Limpar tudo
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Random Viewer Picker ──────────────────────────────────────────────────────

function RandomPicker() {
  const [inputVal, setInputVal] = useState("");
  const [username, setUsername] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [viewers, setViewers] = useState<Map<string, string>>(new Map());
  const [winner, setWinner] = useState<{ id: string; name: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "chatters" | "gifters">("all");
  const chattersRef = useRef<Set<string>>(new Set());
  const giftersRef = useRef<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);

  const disconnect = useCallback(() => {
    wsRef.current?.close(); wsRef.current = null;
    setConnected(false); setConnecting(false);
  }, []);

  const connect = useCallback(async (user: string) => {
    disconnect();
    setConnecting(true);
    setViewers(new Map());
    chattersRef.current.clear();
    giftersRef.current.clear();
    setWinner(null);
    try {
      const r = await fetch(`/api/tiktok/jwt?uniqueId=${encodeURIComponent(user)}`);
      if (!r.ok) throw new Error();
      const { jwtKey } = await r.json() as { jwtKey: string };
      const ws = new WebSocket(`wss://api.tik.tools?uniqueId=${encodeURIComponent(user)}&jwtKey=${jwtKey}`);
      wsRef.current = ws;
      ws.onopen = () => { setConnected(true); setConnecting(false); };
      ws.onclose = () => { setConnected(false); setConnecting(false); };
      ws.onerror = () => { setConnected(false); setConnecting(false); };
      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data as string) as Record<string, unknown>;
          const uid = String(d.uniqueId ?? d.userId ?? "");
          const nick = String(d.nickname ?? d.displayName ?? uid);
          if (!uid || uid === user) return;
          const t = d.type as string;
          if (["chat","gift","follow","like","share","join","member"].includes(t)) {
            setViewers((p) => { const n = new Map(p); n.set(uid, nick); return n; });
          }
          if (t === "chat") chattersRef.current.add(uid);
          if (t === "gift") giftersRef.current.add(uid);
        } catch { /* ignore */ }
      };
    } catch { setConnecting(false); }
  }, [disconnect]);

  useEffect(() => () => { wsRef.current?.close(); }, []);

  function pick() {
    let pool = Array.from(viewers.entries());
    if (filter === "chatters") pool = pool.filter(([id]) => chattersRef.current.has(id));
    if (filter === "gifters") pool = pool.filter(([id]) => giftersRef.current.has(id));
    if (!pool.length) return;
    const [id, name] = pool[Math.floor(Math.random() * pool.length)];
    setWinner({ id, name });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            {connected ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-muted-foreground" />}
            Conectar ao Stream
          </h3>
          <div className="flex gap-2">
            <Input placeholder="@username" value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && connect(inputVal.trim().replace(/^@/, ""))} className="font-mono text-sm" />
            <Button onClick={() => { const u = inputVal.trim().replace(/^@/, ""); setUsername(u); connect(u); }} disabled={!inputVal.trim() || connecting} className="gap-2 bg-gradient-to-r from-cyan-500 to-violet-500 text-white border-0 shrink-0">
              <Play className="w-3.5 h-3.5" />
              {connecting ? "..." : "Conectar"}
            </Button>
            {connected && (
              <Button variant="outline" onClick={disconnect} className="border-red-500/30 text-red-400 hover:bg-red-500/10 shrink-0">
                <Square className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          {connected && (
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              @{username} — {viewers.size} viewers
            </Badge>
          )}

          <Separator />

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Filtrar pool</p>
            <div className="flex gap-2 flex-wrap">
              {(["all", "chatters", "gifters"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${filter === f ? "bg-primary/15 border-primary/30 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  {f === "all" ? "Todos" : f === "chatters" ? "Chatters 💬" : "Gifters 🎁"}
                  {f === "chatters" && connected && <span className="ml-1 text-muted-foreground">({chattersRef.current.size})</span>}
                  {f === "gifters" && connected && <span className="ml-1 text-muted-foreground">({giftersRef.current.size})</span>}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={pick} disabled={viewers.size === 0} className="w-full gap-2 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white border-0 shadow-lg shadow-pink-500/20">
            <Shuffle className="w-4 h-4" />
            Sortear Viewer!
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center gap-4">
          {winner ? (
            <div className="text-center space-y-3">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500/30 to-violet-500/30 border-2 border-pink-500/40 flex items-center justify-center mx-auto shadow-lg shadow-pink-500/20">
                <User className="w-12 h-12 text-pink-300" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">🎉 Vencedor sortado!</p>
                <p className="text-2xl font-bold text-pink-300">{winner.name}</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">@{winner.id}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setWinner(null)} className="gap-2">
                <RotateCcw className="w-3.5 h-3.5" />
                Novo sorteio
              </Button>
            </div>
          ) : (
            <div className="text-center text-muted-foreground/50 space-y-2">
              <Shuffle className="w-12 h-12 mx-auto" />
              <p className="text-sm">{connected ? "Clique em Sortear Viewer!" : "Conecte a um stream primeiro"}</p>
            </div>
          )}
        </div>
      </div>

      {/* Viewer list */}
      {viewers.size > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Pool atual — {viewers.size} viewers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {Array.from(viewers.values()).map((name, i) => (
                <Badge key={i} variant="outline" className="text-xs font-mono">{name}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Gift Race ─────────────────────────────────────────────────────────────────

function GiftRace() {
  const [inputVal, setInputVal] = useState("");
  const [username, setUsername] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [racers, setRacers] = useState<Map<string, { name: string; diamonds: number; gifts: number }>>(new Map());
  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const disconnect = useCallback(() => {
    wsRef.current?.close(); wsRef.current = null;
    setConnected(false); setConnecting(false);
  }, []);

  const connect = useCallback(async (user: string) => {
    disconnect();
    setConnecting(true);
    try {
      const r = await fetch(`/api/tiktok/jwt?uniqueId=${encodeURIComponent(user)}`);
      if (!r.ok) throw new Error();
      const { jwtKey } = await r.json() as { jwtKey: string };
      const ws = new WebSocket(`wss://api.tik.tools?uniqueId=${encodeURIComponent(user)}&jwtKey=${jwtKey}`);
      wsRef.current = ws;
      ws.onopen = () => { setConnected(true); setConnecting(false); };
      ws.onclose = () => { setConnected(false); setConnecting(false); };
      ws.onerror = () => { setConnected(false); setConnecting(false); };
      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data as string) as Record<string, unknown>;
          if (d.type !== "gift") return;
          const uid = String(d.uniqueId ?? d.userId ?? "");
          const nick = String(d.nickname ?? d.displayName ?? uid);
          const diamonds = Number(d.diamondCount ?? 0) * Number(d.repeatCount ?? 1);
          if (!uid) return;
          setRacers((p) => {
            const n = new Map(p);
            const e = n.get(uid) ?? { name: nick, diamonds: 0, gifts: 0 };
            n.set(uid, { name: nick, diamonds: e.diamonds + diamonds, gifts: e.gifts + 1 });
            return n;
          });
        } catch { /* ignore */ }
      };
    } catch { setConnecting(false); }
  }, [disconnect]);

  useEffect(() => () => { wsRef.current?.close(); if (timerRef.current) clearInterval(timerRef.current); }, []);

  function startRace() {
    setRacers(new Map());
    setTimeLeft(duration);
    setRunning(true);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function stopRace() {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setTimeLeft(0);
  }

  const sorted = Array.from(racers.entries()).sort((a, b) => b[1].diamonds - a[1].diamonds);
  const max = sorted[0]?.[1].diamonds ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1 flex-1 min-w-48">
          <p className="text-xs text-muted-foreground">Username do Stream</p>
          <div className="flex gap-2">
            <Input placeholder="@username" value={inputVal} onChange={(e) => setInputVal(e.target.value)} className="font-mono text-sm" />
            <Button onClick={() => { const u = inputVal.trim().replace(/^@/, ""); setUsername(u); connect(u); }} disabled={!inputVal.trim() || connecting} className="gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white border-0 shrink-0">
              <Wifi className="w-3.5 h-3.5" />
              {connecting ? "..." : connected ? "Reconectar" : "Conectar"}
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Duração (seg)</p>
          <div className="flex gap-1">
            {[30, 60, 120, 300].map((s) => (
              <button key={s} onClick={() => setDuration(s)} disabled={running} className={`text-xs px-2.5 py-1.5 rounded-lg border font-mono transition-all disabled:opacity-50 ${duration === s ? "bg-primary/15 border-primary/30 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {s < 60 ? `${s}s` : `${s / 60}m`}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={startRace} disabled={!connected || running} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black border-0">
            <Zap className="w-3.5 h-3.5" />
            {running ? `${timeLeft}s` : "Iniciar Race"}
          </Button>
          {running && (
            <Button variant="outline" onClick={stopRace} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              <Square className="w-3.5 h-3.5" />
            </Button>
          )}
          {!running && racers.size > 0 && (
            <Button variant="ghost" onClick={() => setRacers(new Map())} className="gap-2 text-muted-foreground">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {running && (
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000"
            style={{ width: `${(timeLeft / duration) * 100}%` }}
          />
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground/40">
          <Gift className="w-12 h-12" />
          <p className="text-sm">{connected ? (running ? "Aguardando presentes..." : "Inicie a race para começar") : "Conecte a um stream primeiro"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(([uid, data], i) => (
            <div key={uid} className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border overflow-hidden ${i === 0 ? "border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-transparent" : "border-border bg-card/50"}`}>
              <div className="absolute left-0 top-0 bottom-0 bg-amber-500/8 transition-all duration-700" style={{ width: `${(data.diamonds / max) * 100}%` }} />
              <span className="relative z-10 w-6 text-center text-sm font-bold shrink-0">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}</span>
              <span className="relative z-10 flex-1 font-semibold text-sm">{data.name}</span>
              <div className="relative z-10 text-right shrink-0">
                <p className="font-bold font-mono text-amber-300">💎 {data.diamonds.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{data.gifts} presentes</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Minigames() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/15 via-pink-500/8 to-cyan-500/10 border border-white/8 p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(270_80%_65%/0.08),transparent_60%)] pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Gamepad2 className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Interatividade</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Minigames</h1>
          <p className="text-muted-foreground mt-1 text-sm">Engaje sua audiência com jogos interativos durante a LIVE</p>
        </div>
      </div>

      <Tabs defaultValue="wheel">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="wheel" className="gap-2">🎡 Roda da Sorte</TabsTrigger>
          <TabsTrigger value="picker" className="gap-2">🎲 Sorteio de Viewer</TabsTrigger>
          <TabsTrigger value="race" className="gap-2">🏁 Gift Race</TabsTrigger>
        </TabsList>

        <TabsContent value="wheel" className="mt-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                🎡 Roda da Sorte
                <Badge variant="outline" className="text-xs ml-auto">Sem conexão necessária</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WheelGame />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="picker" className="mt-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                🎲 Sorteio de Viewer
                <Badge variant="outline" className="text-xs ml-auto border-cyan-500/30 text-cyan-400">WebSocket</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RandomPicker />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="race" className="mt-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                🏁 Gift Race
                <Badge variant="outline" className="text-xs ml-auto border-amber-500/30 text-amber-400">WebSocket</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GiftRace />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
