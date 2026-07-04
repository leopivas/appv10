/**
 * /overlay/stats/:username
 * Live stats bar — viewers, likes, followers, diamonds
 */
import { useEffect, useRef, useState } from "react";
import { useParams, useSearch } from "wouter";

interface Stats {
  viewers: number;
  likes: number;
  followers: number;
  diamonds: number;
}

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

export default function OverlayStats() {
  const { username } = useParams<{ username: string }>();
  const search = useSearch();
  const p = new URLSearchParams(search);

  const layout    = p.get("layout") ?? "horizontal"; // horizontal | vertical | compact
  const showV     = p.get("viewers")   !== "0";
  const showL     = p.get("likes")     !== "0";
  const showF     = p.get("followers") !== "0";
  const showD     = p.get("diamonds")  !== "0";
  const showLive  = p.get("badge")     !== "0";

  const [stats, setStats]   = useState<Stats>({ viewers: 0, likes: 0, followers: 0, diamonds: 0 });
  const [status, setStatus] = useState<"connecting" | "live" | "error">("connecting");
  const wsRef               = useRef<WebSocket | null>(null);
  const reconnectRef        = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        ws.onerror = () => { if (!destroyed) setStatus("error"); };
        ws.onclose = () => {
          if (!destroyed) { setStatus("connecting"); reconnectRef.current = setTimeout(connect, 3000); }
        };
        ws.onmessage = (msg) => {
          if (destroyed) return;
          try {
            const data = JSON.parse(msg.data as string) as Record<string, unknown>;
            if (data.type === "roomUser") {
              const d = data as { viewerCount?: number; likeCount?: number; totalFollowers?: number };
              setStats((prev) => ({
                ...prev,
                viewers:   d.viewerCount   ?? prev.viewers,
                likes:     d.likeCount     ?? prev.likes,
                followers: d.totalFollowers ?? prev.followers,
              }));
            }
            if (data.type === "gift") {
              const d = data as { diamondCount?: number; repeatCount?: number; giftType?: number };
              if (d.giftType === 1) return;
              const earned = (d.diamondCount ?? 0) * (d.repeatCount ?? 1);
              setStats((prev) => ({ ...prev, diamonds: prev.diamonds + earned }));
            }
          } catch { /* ignore */ }
        };
      } catch {
        if (!destroyed) setStatus("error");
      }
    }

    void connect();
    return () => { destroyed = true; };
  }, [username]);

  const items = [
    showV && { icon: "👁",  label: "Viewers",    value: fmt(stats.viewers),   color: "#06b6d4" },
    showL && { icon: "❤️", label: "Likes",       value: fmt(stats.likes),     color: "#ef4444" },
    showF && { icon: "👤",  label: "Seguidores",  value: fmt(stats.followers), color: "#a855f7" },
    showD && { icon: "💎",  label: "Diamonds",    value: fmt(stats.diamonds),  color: "#f59e0b" },
  ].filter(Boolean) as { icon: string; label: string; value: string; color: string }[];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { background: transparent !important; }
        .stats-root {
          position: fixed; inset: 0;
          pointer-events: none; user-select: none;
          display: flex; align-items: flex-start; justify-content: flex-end;
          padding: 12px;
        }
        .stats-bar {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 14px;
          border-radius: 99px;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow: 0 2px 20px rgba(0,0,0,0.5);
        }
        .stats-bar.vertical {
          flex-direction: column; border-radius: 16px; padding: 10px 14px;
        }
        .stat-item {
          display: flex; align-items: center; gap: 5px;
          font-family: system-ui, sans-serif;
          font-size: 0.85rem; color: white;
        }
        .stat-value {
          font-weight: 700; font-size: 0.9rem;
        }
        .stat-sep { width: 1px; height: 16px; background: rgba(255,255,255,0.12); }
        .live-dot {
          display: flex; align-items: center; gap: 5px;
          font-weight: 700; font-size: 0.75rem;
          color: #ef4444; letter-spacing: 0.08em;
        }
        .pulse-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 6px rgba(239,68,68,0.8);
          animation: pulse 1s ease-in-out infinite alternate;
        }
        @keyframes pulse { from { opacity:1; } to { opacity:0.4; } }
      `}</style>

      <div className="stats-root">
        <div className={`stats-bar ${layout === "vertical" ? "vertical" : ""}`}>
          {showLive && status === "live" && (
            <>
              <div className="live-dot">
                <div className="pulse-dot" />
                LIVE
              </div>
              {items.length > 0 && <div className="stat-sep" />}
            </>
          )}
          {items.map((item, i) => (
            <div key={item.label} style={{ display: "contents" }}>
              {i > 0 && layout !== "vertical" && <div className="stat-sep" />}
              <div className="stat-item">
                <span>{item.icon}</span>
                <span className="stat-value" style={{ color: item.color }}>{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
