/**
 * /overlay/alerts/:username
 * OBS Browser Source — gift alerts com animações: tap-tap, 2x, 3x, 5x, luva, etc.
 * Transparente, sem auth, roda direto no OBS/TikTok Studio.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearch } from "wouter";

interface AlertItem {
  id: string;
  kind: "gift" | "follow" | "share" | "sub" | "like_burst" | "join";
  nickname: string;
  giftName?: string;
  giftIcon?: string;
  diamonds?: number;
  repeatCount?: number;
  combo?: number;
  subMonth?: number;
  ts: number;
}

// Combos: map gift name keywords → emoji + label
function getGiftVisuals(name: string): { emoji: string; color: string; label: string } {
  const n = name.toLowerCase();
  if (n.includes("luva") || n.includes("glove"))   return { emoji: "🥊", color: "#ff4d00", label: "LUVA!" };
  if (n.includes("lion"))     return { emoji: "🦁", color: "#f59e0b", label: "LION!" };
  if (n.includes("galaxy"))   return { emoji: "🌌", color: "#8b5cf6", label: "GALAXY!" };
  if (n.includes("universe")) return { emoji: "🪐", color: "#06b6d4", label: "UNIVERSE!" };
  if (n.includes("castle"))   return { emoji: "🏰", color: "#ec4899", label: "CASTLE!" };
  if (n.includes("rose"))     return { emoji: "🌹", color: "#ef4444", label: "ROSE!" };
  if (n.includes("drama"))    return { emoji: "🎭", color: "#a855f7", label: "DRAMA!" };
  if (n.includes("tiktok"))   return { emoji: "🎵", color: "#00d4ff", label: "TIKTOK!" };
  return { emoji: "🎁", color: "#f59e0b", label: name.toUpperCase() + "!" };
}

function comboLabel(n: number): string {
  if (n >= 100) return "💯 100x";
  if (n >= 50)  return "🔥 50x";
  if (n >= 20)  return "⚡ 20x";
  if (n >= 10)  return "🚀 10x";
  if (n >= 5)   return "✨ 5x";
  if (n >= 3)   return "🔥 3x";
  if (n >= 2)   return "⚡ 2x";
  return "";
}

function AlertCard({ alert, onDone }: { alert: AlertItem; onDone: (id: string) => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 400);
    const t2 = setTimeout(() => setPhase("out"), 5500);
    const t3 = setTimeout(() => onDone(alert.id), 6100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [alert.id, onDone]);

  if (alert.kind === "follow") {
    return (
      <div className={`alert-card follow-card phase-${phase}`}>
        <span className="text-2xl">💙</span>
        <div className="flex flex-col">
          <span className="font-extrabold text-cyan-300 text-base leading-tight">{alert.nickname}</span>
          <span className="text-white/70 text-sm">seguiu você!</span>
        </div>
      </div>
    );
  }

  if (alert.kind === "share") {
    return (
      <div className={`alert-card share-card phase-${phase}`}>
        <span className="text-2xl">📤</span>
        <div className="flex flex-col">
          <span className="font-extrabold text-green-300 text-base leading-tight">{alert.nickname}</span>
          <span className="text-white/70 text-sm">compartilhou!</span>
        </div>
      </div>
    );
  }

  if (alert.kind === "like_burst") {
    return (
      <div className={`alert-card like-card phase-${phase}`}>
        <span className="text-2xl">❤️</span>
        <div className="flex flex-col">
          <span className="font-extrabold text-red-300 text-base leading-tight">TAP TAP!</span>
          <span className="text-white/70 text-sm">{alert.nickname} está mandando likes!</span>
        </div>
      </div>
    );
  }

  if (alert.kind === "sub") {
    const months = alert.subMonth ?? 1;
    return (
      <div className={`alert-card sub-card phase-${phase}`}>
        <span className="text-2xl">{months >= 12 ? "💎" : months >= 3 ? "⭐" : "🎉"}</span>
        <div className="flex flex-col">
          <span className="font-extrabold text-violet-300 text-base leading-tight">{alert.nickname}</span>
          <span className="text-white/70 text-sm">{months > 1 ? `${months} meses de membro!` : "Novo membro!"}</span>
        </div>
      </div>
    );
  }

  if (alert.kind === "join") {
    return (
      <div className={`alert-card join-card phase-${phase}`}>
        <span className="text-2xl">👋</span>
        <div className="flex flex-col">
          <span className="font-extrabold text-lime-300 text-base leading-tight">{alert.nickname}</span>
          <span className="text-white/70 text-sm">entrou na live!</span>
        </div>
      </div>
    );
  }

  // gift
  const visuals = getGiftVisuals(alert.giftName ?? "");
  const combo = alert.repeatCount ?? 1;
  const comboLbl = comboLabel(combo);

  return (
    <div className={`alert-card gift-card phase-${phase}`} style={{ "--accent": visuals.color } as React.CSSProperties}>
      <div className="gift-emoji">{visuals.emoji}</div>
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-white text-base leading-tight truncate max-w-[140px]">{alert.nickname}</span>
          <span className="text-white/60 text-sm">enviou</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span className="font-extrabold text-sm" style={{ color: visuals.color }}>{visuals.label}</span>
          {combo > 1 && <span className="combo-badge">{comboLbl || `×${combo}`}</span>}
          {alert.diamonds && <span className="text-yellow-300 text-xs font-mono">💎 {alert.diamonds.toLocaleString()}</span>}
        </div>
      </div>
    </div>
  );
}

export default function OverlayAlerts() {
  const { username } = useParams<{ username: string }>();
  const search = useSearch();
  const params = new URLSearchParams(search);

  const showGifts   = params.get("gifts")   !== "0";
  const showFollows = params.get("follows") !== "0";
  const showLikes   = params.get("likes")   === "1";
  const showSubs    = params.get("subs")    !== "0";
  const showJoins   = params.get("joins")   === "1";
  const position    = params.get("pos") ?? "top-center";
  const minDiamonds = Number(params.get("min") ?? "0");

  const [alerts, setAlerts]       = useState<AlertItem[]>([]);
  const counterRef                = useRef(0);
  const likeCountRef              = useRef(0);
  const likeTimerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsRef                     = useRef<WebSocket | null>(null);
  const reconnectRef              = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addAlert = useCallback((a: Omit<AlertItem, "id" | "ts">) => {
    const id = String(++counterRef.current);
    setAlerts((prev) => [...prev.slice(-6), { ...a, id, ts: Date.now() }]);
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  useEffect(() => {
    if (!username) return;
    let destroyed = false;

    async function connect() {
      try {
        const resp = await fetch("/api/tiktok/jwt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uniqueId: username }),
        });
        if (!resp.ok) return;
        const { token } = await resp.json() as { token: string };
        if (destroyed) return;

        const ws = new WebSocket(
          `wss://api.tik.tools?uniqueId=${encodeURIComponent(username!)}&jwtKey=${encodeURIComponent(token)}`
        );
        wsRef.current = ws;

        ws.onclose = () => {
          if (!destroyed) reconnectRef.current = setTimeout(connect, 3000);
        };
        ws.onmessage = (msg) => {
          if (destroyed) return;
          try {
            const data = JSON.parse(msg.data as string) as Record<string, unknown>;
            const type = data.type as string;

            if (type === "gift" && showGifts) {
              const d = data as {
                uniqueId?: string; nickname?: string;
                giftName?: string; diamondCount?: number;
                repeatCount?: number; giftType?: number;
              };
              if (d.giftType === 1) return; // streakable — skip until finalized
              const totalDiamonds = (d.diamondCount ?? 0) * (d.repeatCount ?? 1);
              if (totalDiamonds < minDiamonds) return;
              addAlert({
                kind: "gift",
                nickname: d.nickname ?? "?",
                giftName: d.giftName ?? "Gift",
                diamonds: totalDiamonds,
                repeatCount: d.repeatCount ?? 1,
              });
            }

            if (type === "social" && showFollows) {
              const d = data as { nickname?: string; event?: string };
              if (d.event === "follow") addAlert({ kind: "follow", nickname: d.nickname ?? "?" });
              if (d.event === "share")  addAlert({ kind: "share",  nickname: d.nickname ?? "?" });
            }

            if (type === "like" && showLikes) {
              const d = data as { nickname?: string };
              likeCountRef.current++;
              if (likeTimerRef.current) clearTimeout(likeTimerRef.current);
              likeTimerRef.current = setTimeout(() => {
                if (likeCountRef.current >= 20) {
                  addAlert({ kind: "like_burst", nickname: d.nickname ?? "?" });
                }
                likeCountRef.current = 0;
              }, 2000);
            }

            if (type === "subscribe" && showSubs) {
              const d = data as { nickname?: string; subMonth?: number };
              addAlert({ kind: "sub", nickname: d.nickname ?? "?", subMonth: d.subMonth ?? 1 });
            }

            if (type === "join" && showJoins) {
              const d = data as { nickname?: string };
              addAlert({ kind: "join", nickname: d.nickname ?? "?" });
            }
          } catch { /* ignore */ }
        };
      } catch { /* ignore */ }
    }

    void connect();
    return () => {
      destroyed = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [username, showGifts, showFollows, showLikes, minDiamonds, addAlert]);

  const posClass: Record<string, string> = {
    "top-center":    "top-4 left-1/2 -translate-x-1/2 items-center",
    "top-left":      "top-4 left-4 items-start",
    "top-right":     "top-4 right-4 items-end",
    "bottom-left":   "bottom-4 left-4 items-start",
    "bottom-right":  "bottom-4 right-4 items-end",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center",
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: transparent !important; }

        .overlay-root {
          position: fixed; inset: 0;
          pointer-events: none; user-select: none;
          display: flex; flex-direction: column; gap: 10px;
        }

        .alert-card {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px;
          border-radius: 14px;
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 4px 24px rgba(0,0,0,0.4);
          width: 320px;
          transition: transform 0.4s cubic-bezier(.34,1.56,.64,1), opacity 0.3s ease;
        }

        .alert-card.phase-in  { opacity: 0; transform: translateY(-20px) scale(0.92); }
        .alert-card.phase-hold{ opacity: 1; transform: translateY(0) scale(1); }
        .alert-card.phase-out { opacity: 0; transform: translateY(-12px) scale(0.95); }

        .gift-card  { background: linear-gradient(135deg, rgba(0,0,0,0.75) 0%, color-mix(in srgb, var(--accent) 20%, transparent) 100%); border-color: color-mix(in srgb, var(--accent) 30%, transparent); }
        .follow-card{ background: linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(6,182,212,0.15) 100%); }
        .share-card { background: linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(16,185,129,0.15) 100%); }
        .like-card  { background: linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(239,68,68,0.15) 100%); }
        .sub-card   { background: linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(139,92,246,0.20) 100%); border-color: rgba(139,92,246,0.3); }
        .join-card  { background: linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(132,204,22,0.12) 100%); }

        .gift-emoji {
          font-size: 2.2rem; line-height: 1;
          filter: drop-shadow(0 0 8px var(--accent, #f59e0b));
          animation: bounceIn 0.5s cubic-bezier(.34,1.56,.64,1);
        }

        @keyframes bounceIn {
          0%   { transform: scale(0.3) rotate(-20deg); opacity: 0; }
          60%  { transform: scale(1.2) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); }
        }

        .combo-badge {
          font-weight: 900; font-size: 0.75rem;
          padding: 1px 7px; border-radius: 99px;
          background: linear-gradient(90deg, #f59e0b, #ef4444);
          color: white;
          animation: pulse 0.6s ease-in-out infinite alternate;
        }
        @keyframes pulse {
          from { filter: brightness(1); }
          to   { filter: brightness(1.3) drop-shadow(0 0 4px #f59e0b); }
        }
      `}</style>

      <div
        className={`overlay-root ${posClass[position] ?? posClass["top-center"]}`}
        style={{ display: "flex" }}
      >
        {alerts.map((a) => (
          <AlertCard key={a.id} alert={a} onDone={removeAlert} />
        ))}
      </div>
    </>
  );
}
