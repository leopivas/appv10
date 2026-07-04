/**
 * /overlay/combo/:username
 * Tap-Tap / Combo multiplier overlay — animação estilo "2x", "3x", "LUVA!", etc.
 * Dispara quando o mesmo gift é enviado repetidamente (streak) ou muitos likes rápidos.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearch } from "wouter";

interface ComboState {
  active: boolean;
  giftName: string;
  emoji: string;
  color: string;
  count: number;
  label: string;
  kind: "gift" | "like" | "tap";
}

const GIFT_MAP: Record<string, { emoji: string; color: string }> = {
  luva:     { emoji: "🥊", color: "#ff4d00" },
  glove:    { emoji: "🥊", color: "#ff4d00" },
  lion:     { emoji: "🦁", color: "#f59e0b" },
  galaxy:   { emoji: "🌌", color: "#8b5cf6" },
  universe: { emoji: "🪐", color: "#06b6d4" },
  castle:   { emoji: "🏰", color: "#ec4899" },
  rose:     { emoji: "🌹", color: "#ef4444" },
  drama:    { emoji: "🎭", color: "#a855f7" },
  tiktok:   { emoji: "🎵", color: "#00d4ff" },
};

function getGiftVisuals(name: string) {
  const n = name.toLowerCase();
  for (const [key, val] of Object.entries(GIFT_MAP)) {
    if (n.includes(key)) return val;
  }
  return { emoji: "🎁", color: "#f59e0b" };
}

function comboLabel(n: number): string {
  if (n >= 100) return "💯 x100";
  if (n >= 50)  return "🔥 x50";
  if (n >= 20)  return "⚡ x20";
  if (n >= 10)  return "🚀 x10";
  if (n >= 5)   return "✨ x5";
  if (n >= 3)   return "🔥 x3";
  return `⚡ x${n}`;
}

export default function OverlayCombo() {
  const { username } = useParams<{ username: string }>();
  const search = useSearch();
  const p = new URLSearchParams(search);

  const minCombo     = Number(p.get("min") ?? "2");
  const tapThreshold = Number(p.get("tap") ?? "30"); // likes in burst

  const [combo, setCombo]   = useState<ComboState | null>(null);
  const [show, setShow]     = useState(false);

  const hideTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const likeCount   = useRef(0);
  const likeTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsRef       = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Store latest repeatCount per gift to detect cumulative vs incremental
  const giftPeak    = useRef<Map<string, number>>(new Map());
  const giftStreaks = useRef<Map<string, { count: number; timer: ReturnType<typeof setTimeout> }>>(new Map());

  const showCombo = useCallback((state: Omit<ComboState, "active">) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setCombo({ ...state, active: true });
    setShow(true);
    hideTimer.current = setTimeout(() => setShow(false), 3200);
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

            // Gift streak detection
            if (data.type === "gift") {
              const d = data as {
                giftName?: string; repeatCount?: number;
                giftType?: number; diamondCount?: number;
              };
              const name = d.giftName ?? "Gift";
              const count = d.repeatCount ?? 1;
              const visuals = getGiftVisuals(name);

              // giftType 1 = streakable (still tapping) — repeatCount is CUMULATIVE from tik.tools
              // use the latest value directly (peak), not sum, to avoid double-counting
              if (d.giftType === 1) {
                const existing = giftStreaks.current.get(name);
                if (existing) clearTimeout(existing.timer);
                const prevPeak = giftPeak.current.get(name) ?? 0;
                giftPeak.current.set(name, count);
                const newCount = (existing?.count ?? 0) + Math.max(0, count - prevPeak);
                const timer = setTimeout(() => { giftStreaks.current.delete(name); giftPeak.current.delete(name); }, 2000);
                giftStreaks.current.set(name, { count: newCount, timer });

                if (newCount >= minCombo) {
                  showCombo({
                    giftName: name, emoji: visuals.emoji,
                    color: visuals.color, count: newCount,
                    label: comboLabel(newCount), kind: "gift",
                  });
                }
              } else {
                // Finalized gift
                giftStreaks.current.delete(name);
                if (count >= minCombo) {
                  showCombo({
                    giftName: name, emoji: visuals.emoji,
                    color: visuals.color, count,
                    label: comboLabel(count), kind: "gift",
                  });
                }
              }
            }

            // Tap-tap: rapid likes burst
            if (data.type === "like") {
              likeCount.current++;
              if (likeTimer.current) clearTimeout(likeTimer.current);
              likeTimer.current = setTimeout(() => {
                if (likeCount.current >= tapThreshold) {
                  showCombo({
                    giftName: "Tap Tap", emoji: "👆",
                    color: "#ff6b6b", count: likeCount.current,
                    label: "TAP TAP!", kind: "tap",
                  });
                }
                likeCount.current = 0;
              }, 1500);
            }
          } catch { /* ignore */ }
        };
      } catch { /* ignore */ }
    }

    void connect();
    return () => {
      destroyed = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (likeTimer.current) clearTimeout(likeTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      // clear all streak timers
      giftStreaks.current.forEach((v) => clearTimeout(v.timer));
      giftStreaks.current.clear();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [username, minCombo, tapThreshold, showCombo]);

  if (!combo) return null;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { background: transparent !important; }
        .combo-root {
          position: fixed; inset: 0;
          pointer-events: none; user-select: none;
          display: flex; align-items: center; justify-content: center;
        }
        .combo-card {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          transition: all 0.4s cubic-bezier(.34,1.56,.64,1);
        }
        .combo-emoji {
          font-size: 5rem; line-height: 1;
          filter: drop-shadow(0 0 20px var(--clr));
          animation: comboEmoji 0.5s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes comboEmoji {
          0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
          60%  { transform: scale(1.3) rotate(8deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); }
        }
        .combo-label {
          font-family: system-ui, sans-serif;
          font-size: 2.5rem; font-weight: 900;
          color: white;
          text-shadow: 0 0 20px var(--clr), 0 2px 12px rgba(0,0,0,0.8);
          animation: comboLabel 0.4s cubic-bezier(.34,1.56,.64,1) 0.1s both;
          letter-spacing: 0.04em;
        }
        @keyframes comboLabel {
          0%   { opacity: 0; transform: scale(0.5) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .combo-name {
          font-family: system-ui, sans-serif;
          font-size: 1rem; font-weight: 700;
          color: rgba(255,255,255,0.75);
          text-shadow: 0 1px 6px rgba(0,0,0,0.8);
          animation: comboLabel 0.4s cubic-bezier(.34,1.56,.64,1) 0.2s both;
          text-transform: uppercase; letter-spacing: 0.1em;
        }
        .fade-out { animation: fadeOut 0.5s ease forwards; }
        @keyframes fadeOut {
          from { opacity:1; transform: scale(1); }
          to   { opacity:0; transform: scale(0.8); }
        }
        .particles {
          position: absolute; width: 200px; height: 200px;
          pointer-events: none;
        }
        .particle {
          position: absolute; top: 50%; left: 50%;
          width: 8px; height: 8px; border-radius: 50%;
          animation: particle 0.8s ease-out forwards;
        }
        @keyframes particle {
          0%   { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0); opacity: 0; }
        }
      `}</style>

      <div className="combo-root">
        <div className={`combo-card ${!show ? "fade-out" : ""}`} style={{ "--clr": combo.color } as React.CSSProperties}>
          <div className="combo-emoji">{combo.emoji}</div>
          <div className="combo-label">{combo.label}</div>
          <div className="combo-name">{combo.giftName}</div>
        </div>
      </div>
    </>
  );
}
