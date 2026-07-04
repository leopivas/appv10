/**
 * /overlay/triggers/:username
 * Overlay OBS que recebe triggers manuais do painel do streamer via SSE
 * e exibe animações na tela (rose, luva, lion, galaxy, etc.)
 * Sem auth — roda dentro do OBS Browser Source
 */
import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";

interface TriggerEvent {
  type: string;
  ts: number;
}

interface ActiveAnim {
  id: string;
  type: string;
  startedAt: number;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ANIMATIONS: Record<string, {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  particles: string[];
  duration: number;
}> = {
  rose:   { label: "🌹 Rose",   emoji: "🌹", color: "#ff3366", bg: "rgba(255,51,102,0.15)",  particles: ["🌹","❤️","🌸","💕"], duration: 3500 },
  "2x":   { label: "2x",        emoji: "2️⃣", color: "#00e5ff", bg: "rgba(0,229,255,0.15)",   particles: ["2️⃣","⚡","✨","💥"], duration: 2500 },
  "3x":   { label: "3x",        emoji: "3️⃣", color: "#ffd700", bg: "rgba(255,215,0,0.15)",   particles: ["3️⃣","⚡","🔥","✨"], duration: 2500 },
  luva:   { label: "🥊 Luva",   emoji: "🥊", color: "#ff6b00", bg: "rgba(255,107,0,0.15)",   particles: ["🥊","💥","⚡","🔥"], duration: 2800 },
  lion:   { label: "🦁 Lion",   emoji: "🦁", color: "#ffd700", bg: "rgba(255,215,0,0.15)",   particles: ["🦁","👑","✨","⭐"], duration: 3000 },
  galaxy: { label: "🌌 Galaxy", emoji: "🌌", color: "#9b59b6", bg: "rgba(155,89,182,0.15)",  particles: ["🌌","⭐","🌟","💫"], duration: 4000 },
  fireworks: { label: "🎆 Fogos", emoji: "🎆", color: "#ff4444", bg: "rgba(255,68,68,0.15)", particles: ["🎆","🎇","✨","🎉"], duration: 3500 },
  dinheiro: { label: "💸 Grana", emoji: "💸", color: "#00ff88", bg: "rgba(0,255,136,0.15)",  particles: ["💸","💰","💵","🤑"], duration: 3000 },
};

function Particle({ emoji, delay, x }: { emoji: string; delay: number; x: number }) {
  return (
    <span
      className="absolute text-3xl select-none pointer-events-none"
      style={{
        left: `${x}%`,
        bottom: "0%",
        fontSize: "2rem",
        animation: `floatUp 2s ease-out ${delay}ms forwards`,
        opacity: 0,
      }}
    >
      {emoji}
    </span>
  );
}

function AnimCard({ anim, onDone }: { anim: ActiveAnim; onDone: () => void }) {
  const cfg = ANIMATIONS[anim.type] ?? ANIMATIONS["rose"];
  const particles = Array.from({ length: 12 }, (_, i) => ({
    emoji: cfg.particles[i % cfg.particles.length],
    delay: i * 100,
    x: 5 + Math.random() * 90,
  }));

  useEffect(() => {
    const t = setTimeout(onDone, cfg.duration + 200);
    return () => clearTimeout(t);
  }, [cfg.duration, onDone]);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ animation: `fadeIn 0.2s ease-out forwards` }}
    >
      {/* Background flash */}
      <div
        className="absolute inset-0"
        style={{
          background: cfg.bg,
          animation: `bgPulse ${cfg.duration}ms ease-out forwards`,
        }}
      />
      {/* Main emoji */}
      <div
        className="relative z-10 flex flex-col items-center gap-2"
        style={{ animation: `popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards` }}
      >
        <span style={{ fontSize: "8rem", filter: `drop-shadow(0 0 40px ${cfg.color})` }}>
          {cfg.emoji}
        </span>
        <span
          className="font-black tracking-tight"
          style={{
            fontSize: "3rem",
            color: cfg.color,
            textShadow: `0 0 30px ${cfg.color}`,
            WebkitTextStroke: "1px rgba(0,0,0,0.5)",
          }}
        >
          {cfg.label}
        </span>
      </div>
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p, i) => (
          <Particle key={i} emoji={p.emoji} delay={p.delay} x={p.x} />
        ))}
      </div>
    </div>
  );
}

export default function OverlayTriggers() {
  const { username } = useParams<{ username: string }>();
  const [anims, setAnims] = useState<ActiveAnim[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!username) return;

    function connect() {
      const es = new EventSource(`${BASE}/api/tiktok/triggers/${encodeURIComponent(username!)}/sse`);
      esRef.current = es;

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data as string) as TriggerEvent;
          if (!data?.type) return;
          const id = `${data.ts}-${Math.random()}`;
          setAnims((prev) => [...prev, { id, type: data.type, startedAt: data.ts }]);
        } catch { /* ignore */ }
      };

      es.onerror = () => {
        es.close();
        setTimeout(connect, 3000);
      };
    }

    connect();
    return () => { esRef.current?.close(); };
  }, [username]);

  function removeAnim(id: string) {
    setAnims((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div
      className="w-screen h-screen overflow-hidden relative"
      style={{ background: "transparent" }}
    >
      <style>{`
        @keyframes popIn {
          from { transform: scale(0.3) rotate(-10deg); opacity: 0; }
          to   { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes bgPulse {
          0%   { opacity: 0; }
          10%  { opacity: 1; }
          80%  { opacity: 0.6; }
          100% { opacity: 0; }
        }
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-80vh) scale(0.5) rotate(${Math.random() > 0.5 ? "20deg" : "-20deg"}); opacity: 0; }
        }
      `}</style>

      {/* Show only the latest animation (or stack them briefly) */}
      {anims.slice(-2).map((anim) => (
        <AnimCard key={anim.id} anim={anim} onDone={() => removeAnim(anim.id)} />
      ))}
    </div>
  );
}
