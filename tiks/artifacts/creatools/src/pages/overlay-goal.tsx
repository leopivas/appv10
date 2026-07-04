/**
 * /overlay/goal/:username
 * Meta de diamonds/viewers com barra de progresso animada
 */
import { useEffect, useRef, useState } from "react";
import { useParams, useSearch } from "wouter";

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

export default function OverlayGoal() {
  const { username } = useParams<{ username: string }>();
  const search = useSearch();
  const p = new URLSearchParams(search);

  const goal      = Number(p.get("goal") ?? "1000");
  const mode      = p.get("mode") ?? "diamonds"; // diamonds | viewers | likes
  const label     = p.get("label") ?? (mode === "diamonds" ? "Meta de Diamonds" : mode === "viewers" ? "Meta de Viewers" : "Meta de Likes");
  const colorPrimary = p.get("color") ?? "#06b6d4";

  const [current, setCurrent] = useState(0);
  const [status, setStatus]   = useState<"connecting" | "live" | "error">("connecting");
  const wsRef                 = useRef<WebSocket | null>(null);
  const reconnectRef          = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        if (!resp.ok) { setStatus("error"); return; }
        const { token } = await resp.json() as { token: string };
        if (destroyed) return;

        const ws = new WebSocket(
          `wss://api.tik.tools?uniqueId=${encodeURIComponent(username!)}&jwtKey=${encodeURIComponent(token)}`
        );
        wsRef.current = ws;
        ws.onopen = () => { if (!destroyed) setStatus("live"); };
        ws.onclose = () => {
          if (!destroyed) { setStatus("connecting"); reconnectRef.current = setTimeout(connect, 3000); }
        };
        ws.onmessage = (msg) => {
          if (destroyed) return;
          try {
            const data = JSON.parse(msg.data as string) as Record<string, unknown>;
            if (data.type === "roomUser") {
              const d = data as { viewerCount?: number; likeCount?: number };
              if (mode === "viewers") setCurrent(d.viewerCount ?? 0);
              if (mode === "likes")   setCurrent(d.likeCount   ?? 0);
            }
            if (data.type === "gift" && mode === "diamonds") {
              const d = data as { diamondCount?: number; repeatCount?: number; giftType?: number };
              if (d.giftType === 1) return;
              setCurrent((prev) => prev + (d.diamondCount ?? 0) * (d.repeatCount ?? 1));
            }
          } catch { /* ignore */ }
        };
      } catch {
        if (!destroyed) setStatus("error");
      }
    }

    void connect();
    return () => {
      destroyed = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [username, mode]);

  const pct     = Math.min(100, (current / goal) * 100);
  const reached = pct >= 100;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { background: transparent !important; }
        .goal-root {
          position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
          pointer-events: none; user-select: none;
          width: 380px;
        }
        .goal-card {
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          padding: 14px 18px;
          box-shadow: 0 4px 32px rgba(0,0,0,0.5);
        }
        .goal-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 10px;
          font-family: system-ui, sans-serif; font-size: 0.8rem;
          color: rgba(255,255,255,0.7);
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
        }
        .goal-values {
          font-weight: 700; font-size: 0.9rem; color: white;
        }
        .progress-track {
          width: 100%; height: 14px; border-radius: 99px;
          background: rgba(255,255,255,0.08);
          overflow: hidden; position: relative;
        }
        .progress-fill {
          height: 100%; border-radius: 99px;
          transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative; overflow: hidden;
        }
        .progress-shine {
          position: absolute; top: 0; left: -60%; width: 40%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          animation: shine 2.5s ease-in-out infinite;
        }
        @keyframes shine {
          0%   { left: -60%; }
          100% { left: 120%; }
        }
        .reached-glow {
          animation: reachedPulse 1s ease-in-out infinite alternate;
        }
        @keyframes reachedPulse {
          from { box-shadow: 0 0 0 0 rgba(74,222,128,0.4); }
          to   { box-shadow: 0 0 16px 4px rgba(74,222,128,0.3); }
        }
      `}</style>

      <div className="goal-root">
        <div className={`goal-card ${reached ? "reached-glow" : ""}`} style={{ borderColor: reached ? "rgba(74,222,128,0.4)" : undefined }}>
          <div className="goal-header">
            <span>{mode === "diamonds" ? "💎" : mode === "viewers" ? "👁" : "❤️"} {label}</span>
            <span className="goal-values">
              {fmt(current)} / {fmt(goal)}
            </span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${pct}%`,
                background: reached
                  ? "linear-gradient(90deg, #22c55e, #4ade80)"
                  : `linear-gradient(90deg, ${colorPrimary}, ${colorPrimary}cc)`,
              }}
            >
              <div className="progress-shine" />
            </div>
          </div>
          {reached && (
            <div style={{ marginTop: 8, textAlign: "center", fontWeight: 700, color: "#4ade80", fontSize: "0.85rem", fontFamily: "system-ui, sans-serif" }}>
              🎉 Meta atingida!
            </div>
          )}
        </div>
      </div>
    </>
  );
}
