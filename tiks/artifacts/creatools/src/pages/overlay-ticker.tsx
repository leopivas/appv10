/**
 * /overlay/ticker/:username
 * Gift ticker horizontal — faixa na parte inferior com os últimos gifts recebidos.
 * Transparente, sem auth, roda direto no OBS/TikTok Studio.
 */
import { useEffect, useRef, useState } from "react";
import { useParams, useSearch } from "wouter";

interface TickerItem {
  id: string;
  nickname: string;
  giftName: string;
  emoji: string;
  diamonds: number;
  count: number;
  color: string;
  ts: number;
}

function getGiftVisuals(name: string): { emoji: string; color: string } {
  const n = name.toLowerCase();
  if (n.includes("luva") || n.includes("glove")) return { emoji: "🥊", color: "#ff4d00" };
  if (n.includes("lion"))     return { emoji: "🦁", color: "#f59e0b" };
  if (n.includes("galaxy"))   return { emoji: "🌌", color: "#8b5cf6" };
  if (n.includes("universe")) return { emoji: "🪐", color: "#06b6d4" };
  if (n.includes("castle"))   return { emoji: "🏰", color: "#ec4899" };
  if (n.includes("rose"))     return { emoji: "🌹", color: "#ef4444" };
  if (n.includes("drama"))    return { emoji: "🎭", color: "#a855f7" };
  if (n.includes("tiktok"))   return { emoji: "🎵", color: "#00d4ff" };
  if (n.includes("sun"))      return { emoji: "☀️", color: "#fbbf24" };
  if (n.includes("star"))     return { emoji: "⭐", color: "#fde047" };
  if (n.includes("heart"))    return { emoji: "💝", color: "#f43f5e" };
  if (n.includes("diamond"))  return { emoji: "💎", color: "#38bdf8" };
  return { emoji: "🎁", color: "#f59e0b" };
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

export default function OverlayTicker() {
  const { username } = useParams<{ username: string }>();
  const search = useSearch();
  const p = new URLSearchParams(search);

  const minDiamonds = Number(p.get("min") ?? "0");
  const maxItems    = Number(p.get("max") ?? "20");
  const position    = p.get("pos") ?? "bottom"; // bottom | top
  const speed       = Number(p.get("speed") ?? "40"); // px/s

  const [items, setItems] = useState<TickerItem[]>([]);
  const counterRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<Animation | null>(null);

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
            if (data.type === "gift") {
              const d = data as {
                nickname?: string; giftName?: string;
                diamondCount?: number; repeatCount?: number; giftType?: number;
              };
              if (d.giftType === 1) return;
              const diamonds = (d.diamondCount ?? 0) * (d.repeatCount ?? 1);
              if (diamonds < minDiamonds) return;
              const vis = getGiftVisuals(d.giftName ?? "");
              const id = String(++counterRef.current);
              setItems((prev) => [
                ...prev.slice(-(maxItems - 1)),
                {
                  id, ts: Date.now(),
                  nickname: d.nickname ?? "?",
                  giftName: d.giftName ?? "Gift",
                  emoji: vis.emoji, color: vis.color,
                  diamonds, count: d.repeatCount ?? 1,
                },
              ]);
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
  }, [username, minDiamonds, maxItems]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || items.length === 0) return;
    animRef.current?.cancel();
    const totalWidth = el.scrollWidth;
    const duration = (totalWidth / speed) * 1000;
    animRef.current = el.animate(
      [{ transform: "translateX(100vw)" }, { transform: `translateX(-${totalWidth}px)` }],
      { duration, iterations: Infinity, easing: "linear" }
    );
  }, [items, speed]);

  if (items.length === 0) return null;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: transparent !important; }

        .ticker-bar {
          position: fixed; left: 0; right: 0;
          ${position === "top" ? "top: 0;" : "bottom: 0;"}
          height: 48px;
          overflow: hidden;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(8px);
          border-${position === "top" ? "bottom" : "top"}: 1.5px solid rgba(255,255,255,0.08);
          display: flex; align-items: center;
        }

        .ticker-track {
          display: flex; align-items: center; gap: 40px;
          white-space: nowrap; will-change: transform;
        }

        .ticker-item {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 0 16px;
        }
        .ticker-emoji { font-size: 1.3rem; line-height: 1; }
        .ticker-nick  { font-weight: 700; font-size: 0.875rem; color: white; }
        .ticker-verb  { font-size: 0.8rem; color: rgba(255,255,255,0.55); }
        .ticker-gift  { font-weight: 800; font-size: 0.875rem; }
        .ticker-count { font-size: 0.75rem; color: rgba(255,255,255,0.6); font-weight: 600; }
        .ticker-diamonds { font-size: 0.7rem; color: #fde047; font-weight: 700; margin-left: 4px; }

        .ticker-sep { color: rgba(255,255,255,0.15); font-size: 1.2rem; user-select: none; }
      `}</style>

      <div className="ticker-bar">
        <div className="ticker-track" ref={containerRef}>
          {[...items, ...items].map((item, i) => (
            <span key={`${item.id}-${i}`} className="ticker-item">
              <span className="ticker-emoji">{item.emoji}</span>
              <span className="ticker-nick">{item.nickname}</span>
              <span className="ticker-verb"> enviou </span>
              <span className="ticker-gift" style={{ color: item.color }}>{item.giftName}</span>
              {item.count > 1 && <span className="ticker-count"> ×{item.count}</span>}
              <span className="ticker-diamonds">💎 {fmt(item.diamonds)}</span>
              <span className="ticker-sep"> · </span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
