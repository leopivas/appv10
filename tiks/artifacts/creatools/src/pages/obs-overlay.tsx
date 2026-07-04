import { useEffect, useRef, useState } from "react";
import { useParams, useSearch } from "wouter";

interface OverlayEvent {
  id: string;
  type: "chat" | "gift" | "follow" | "like" | "share" | "join";
  nickname: string;
  message?: string;
  giftName?: string;
  giftCount?: number;
  diamonds?: number;
  avatarUrl?: string;
  ts: number;
}

interface RoomStats {
  viewerCount: number;
  likeCount: number;
  totalFollowers: number;
}

const GIFT_EMOJI: Record<string, string> = {
  rose: "🌹", galaxy: "🌌", lion: "🦁", drama: "🎭",
  universe: "🪐", castle: "🏰", sunglasses: "😎",
};

function giftEmoji(name: string): string {
  const key = name?.toLowerCase() ?? "";
  for (const [k, v] of Object.entries(GIFT_EMOJI)) {
    if (key.includes(k)) return v;
  }
  return "🎁";
}

function EventBubble({ event, style }: { event: OverlayEvent; style?: string }) {
  if (event.type === "gift") {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/10 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-white shadow-lg shadow-orange-900/30 text-sm max-w-xs ${style ?? ""}`}>
        <span className="text-xl">{giftEmoji(event.giftName ?? "")}</span>
        <div className="min-w-0">
          <span className="font-bold truncate text-yellow-300">{event.nickname}</span>
          <span className="text-white/80"> sent </span>
          <span className="font-semibold text-orange-200">{event.giftName}</span>
          {event.giftCount && event.giftCount > 1 && (
            <span className="text-yellow-400 font-bold"> ×{event.giftCount}</span>
          )}
        </div>
      </div>
    );
  }
  if (event.type === "follow") {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/10 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white shadow-lg text-sm max-w-xs ${style ?? ""}`}>
        <span className="text-lg">💙</span>
        <span className="font-bold text-cyan-300 truncate">{event.nickname}</span>
        <span className="text-white/70"> followed!</span>
      </div>
    );
  }
  if (event.type === "share") {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/10 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-white shadow-lg text-sm max-w-xs ${style ?? ""}`}>
        <span className="text-lg">📤</span>
        <span className="font-bold text-green-300 truncate">{event.nickname}</span>
        <span className="text-white/70"> shared!</span>
      </div>
    );
  }
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/10 bg-black/40 text-white shadow-lg text-sm max-w-xs ${style ?? ""}`}>
      <span className="font-bold text-cyan-300 shrink-0 truncate max-w-[80px]">{event.nickname}:</span>
      <span className="text-white/90 break-words">{event.message}</span>
    </div>
  );
}

export default function ObsOverlay() {
  const { username } = useParams<{ username: string }>();
  const search = useSearch();
  const params = new URLSearchParams(search);

  const showChat    = params.get("chat")    !== "0";
  const showGifts   = params.get("gifts")   !== "0";
  const showFollows = params.get("follows") !== "0";
  const showStats   = params.get("stats")   !== "0";
  const bgOpacity   = params.get("bg") ?? "40";
  const fontSize    = params.get("size") ?? "md";

  const [events, setEvents] = useState<OverlayEvent[]>([]);
  const [stats, setStats] = useState<RoomStats | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "error">("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const counterRef = useRef(0);

  const fontClass = fontSize === "lg" ? "text-lg" : fontSize === "sm" ? "text-xs" : "text-sm";

  function addEvent(e: Omit<OverlayEvent, "id" | "ts">) {
    const id = String(++counterRef.current);
    setEvents((prev) => [...prev.slice(-29), { ...e, id, ts: Date.now() }]);
    setTimeout(() => {
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
    }, 12000);
  }

  useEffect(() => {
    if (!username) return;

    let destroyed = false;
    let ws: WebSocket | null = null;

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

        ws = new WebSocket(`wss://api.tik.tools?uniqueId=${encodeURIComponent(username!)}&jwtKey=${encodeURIComponent(token)}`);
        wsRef.current = ws;

        ws.onopen = () => { if (!destroyed) setStatus("live"); };
        ws.onerror = () => { if (!destroyed) setStatus("error"); };
        ws.onclose = () => {
          if (!destroyed) {
            setStatus("connecting");
            setTimeout(connect, 3000);
          }
        };

        ws.onmessage = (msg) => {
          if (destroyed) return;
          try {
            const data = JSON.parse(msg.data as string) as Record<string, unknown>;
            const type = data.type as string;

            if (type === "roomUser") {
              const d = data as { viewerCount?: number; likeCount?: number; totalFollowers?: number };
              setStats({ viewerCount: d.viewerCount ?? 0, likeCount: d.likeCount ?? 0, totalFollowers: d.totalFollowers ?? 0 });
            } else if (type === "chat" && showChat) {
              const d = data as { nickname?: string; comment?: string };
              addEvent({ type: "chat", nickname: d.nickname ?? "?", message: d.comment ?? "" });
            } else if (type === "gift" && showGifts) {
              const d = data as { nickname?: string; giftName?: string; repeatCount?: number; diamondCount?: number; giftType?: number };
              if (d.giftType !== 1) {
                addEvent({ type: "gift", nickname: d.nickname ?? "?", giftName: d.giftName ?? "Gift", giftCount: d.repeatCount, diamonds: d.diamondCount });
              }
            } else if (type === "social" && showFollows) {
              const d = data as { nickname?: string; event?: string };
              if (d.event === "follow") addEvent({ type: "follow", nickname: d.nickname ?? "?" });
              if (d.event === "share") addEvent({ type: "share", nickname: d.nickname ?? "?" });
            }
          } catch { /* ignore */ }
        };
      } catch {
        if (!destroyed) { setStatus("error"); }
      }
    }

    void connect();
    return () => {
      destroyed = true;
      ws?.close();
    };
  }, [username, showChat, showGifts, showFollows]);

  const chatEvents = events.filter((e) => e.type === "chat");
  const alertEvents = events.filter((e) => e.type !== "chat");

  return (
    <div
      className={`fixed inset-0 overflow-hidden pointer-events-none select-none ${fontClass}`}
      style={{ background: `rgba(0,0,0,${Number(bgOpacity) / 100})` }}
    >
      {/* Status indicator */}
      {status !== "live" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-black/70 text-white text-xs border border-white/10">
          <span className={`w-2 h-2 rounded-full ${status === "connecting" ? "bg-yellow-400 animate-pulse" : "bg-red-400"}`} />
          {status === "connecting" ? `Connecting to @${username}…` : `Cannot connect to @${username}`}
        </div>
      )}

      {/* Live stats bar — top right */}
      {showStats && stats && status === "live" && (
        <div className="absolute top-4 right-4 flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 font-bold">LIVE</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white text-xs">
            <span>👁</span>
            <span className="font-bold">{stats.viewerCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white text-xs">
            <span>❤️</span>
            <span className="font-bold">{stats.likeCount.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Alert events (gifts, follows, shares) — top center */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 max-w-sm w-full px-4">
        {alertEvents.slice(-3).map((e) => (
          <div key={e.id} className="animate-in slide-in-from-top-4 fade-in duration-300 w-full flex justify-center">
            <EventBubble event={e} />
          </div>
        ))}
      </div>

      {/* Chat — bottom left */}
      <div className="absolute bottom-6 left-4 flex flex-col-reverse gap-1.5 max-w-xs w-full">
        {chatEvents.slice(-8).reverse().map((e) => (
          <div key={e.id} className="animate-in slide-in-from-bottom-2 fade-in duration-200">
            <EventBubble event={e} />
          </div>
        ))}
      </div>
    </div>
  );
}
