import { useEffect, useRef, useState } from "react";
import { useParams, useSearch } from "wouter";

interface GifterEntry {
  uniqueId: string;
  nickname: string;
  diamonds: number;
  gifts: number;
  avatarUrl?: string;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

const MEDALS = ["🥇", "🥈", "🥉"];
const MEDAL_COLORS = [
  "from-yellow-500/40 to-amber-500/20 border-yellow-400/50 shadow-yellow-500/20",
  "from-zinc-400/30 to-zinc-500/20 border-zinc-300/40 shadow-zinc-400/10",
  "from-orange-700/30 to-amber-700/20 border-orange-600/40 shadow-orange-500/10",
];
const DEFAULT_COLORS = "from-white/5 to-white/3 border-white/10";

export default function OverlayTopGifters() {
  const { username } = useParams<{ username: string }>();
  const search = useSearch();
  const params = new URLSearchParams(search);

  const maxEntries  = Number(params.get("max") ?? "5");
  const title       = params.get("title") ?? "Top Gifters";
  const showDiamonds = params.get("diamonds") !== "0";
  const themeParam  = params.get("theme") ?? "dark";
  const compact     = params.get("compact") === "1";

  const [gifters, setGifters] = useState<Map<string, GifterEntry>>(new Map());
  const [status, setStatus] = useState<"connecting" | "live" | "error">("connecting");
  const wsRef = useRef<WebSocket | null>(null);

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
          if (!destroyed) { setStatus("connecting"); setTimeout(connect, 3000); }
        };

        ws.onmessage = (msg) => {
          if (destroyed) return;
          try {
            const data = JSON.parse(msg.data as string) as Record<string, unknown>;
            if (data.type === "gift") {
              const d = data as {
                uniqueId?: string; nickname?: string;
                diamondCount?: number; repeatCount?: number;
                giftType?: number; profilePictureUrl?: string;
              };
              // giftType 1 = streakable (not finalized), skip
              if (d.giftType === 1) return;
              const uid = d.uniqueId ?? "?";
              const nick = d.nickname ?? uid;
              const diamonds = (d.diamondCount ?? 0) * (d.repeatCount ?? 1);
              setGifters((prev) => {
                const next = new Map(prev);
                const ex = next.get(uid);
                next.set(uid, {
                  uniqueId: uid,
                  nickname: nick,
                  diamonds: (ex?.diamonds ?? 0) + diamonds,
                  gifts: (ex?.gifts ?? 0) + 1,
                  avatarUrl: d.profilePictureUrl ?? ex?.avatarUrl,
                });
                return next;
              });
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
      wsRef.current?.close();
    };
  }, [username]);

  const sorted = Array.from(gifters.values())
    .sort((a, b) => b.diamonds - a.diamonds)
    .slice(0, maxEntries);

  const isDark = themeParam !== "light";

  if (compact) {
    return (
      <div className="fixed inset-0 pointer-events-none select-none p-3 flex flex-col gap-1.5 items-start justify-start">
        {sorted.map((g, i) => (
          <div key={g.uniqueId}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm bg-black/60 border border-white/10 text-white text-sm shadow-lg">
            <span className="text-base leading-none">{MEDALS[i] ?? `#${i + 1}`}</span>
            <span className="font-bold text-cyan-300 max-w-[120px] truncate">{g.nickname}</span>
            {showDiamonds && (
              <span className="text-yellow-300 font-mono font-bold ml-1">
                💎 {fmt(g.diamonds)}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none select-none p-4 flex flex-col gap-2 items-start justify-start"
      style={{ background: "transparent" }}
    >
      {/* Title */}
      <div className="flex items-center gap-2 mb-1">
        <div className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/30 to-orange-500/20 border border-yellow-400/30 backdrop-blur-sm">
          <span className="text-yellow-200 font-bold text-sm tracking-wide uppercase">💎 {title}</span>
        </div>
        <div className={`w-2 h-2 rounded-full ${status === "live" ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]" : status === "connecting" ? "bg-yellow-400 animate-pulse" : "bg-red-400"}`} />
      </div>

      {/* Entries */}
      <div className="flex flex-col gap-1.5 w-[280px]">
        {sorted.length === 0 && status === "live" && (
          <div className="px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white/50 text-sm italic backdrop-blur-sm">
            Nenhum gift ainda…
          </div>
        )}
        {sorted.map((g, i) => {
          const colorCls = i < 3 ? MEDAL_COLORS[i] : DEFAULT_COLORS;
          return (
            <div
              key={g.uniqueId}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl backdrop-blur-sm bg-gradient-to-r border shadow-lg ${colorCls}`}
              style={{ animation: "fadeSlideIn 0.3s ease-out" }}
            >
              <span className="text-xl w-7 text-center shrink-0">{MEDALS[i] ?? `${i + 1}`}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-sm truncate">{g.nickname}</div>
                {showDiamonds && (
                  <div className="text-yellow-300 text-xs font-mono">💎 {fmt(g.diamonds)}</div>
                )}
              </div>
              <div className="text-white/50 text-xs font-mono shrink-0">{g.gifts} gifts</div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
