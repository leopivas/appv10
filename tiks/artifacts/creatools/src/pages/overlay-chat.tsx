/**
 * /overlay/chat/:username
 * Chat wall overlay — feed limpo de mensagens do chat da live.
 * Ideal para stream sem poluição visual de eventos.
 * Transparente, sem auth, roda direto no OBS/TikTok Studio.
 */
import { useEffect, useRef, useState } from "react";
import { useParams, useSearch } from "wouter";

interface ChatMsg {
  id: string;
  nickname: string;
  comment: string;
  badge?: string;
  isMod?: boolean;
  isSub?: boolean;
  ts: number;
}

const BADGE_COLORS: Record<string, string> = {
  mod: "#10b981",
  sub: "#8b5cf6",
};

function ChatBubble({ msg, fontSize }: { msg: ChatMsg; fontSize: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 15000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className={`chat-bubble ${fontSize}`}>
      <div className="chat-header">
        {msg.isMod && <span className="badge mod">MOD</span>}
        {msg.isSub && <span className="badge sub">SUB</span>}
        <span className="chat-nick">{msg.nickname}</span>
        <span className="chat-sep">:</span>
      </div>
      <span className="chat-text">{msg.comment}</span>
    </div>
  );
}

export default function OverlayChat() {
  const { username } = useParams<{ username: string }>();
  const search = useSearch();
  const p = new URLSearchParams(search);

  const maxMsgs  = Number(p.get("max") ?? "8");
  const fontSize = p.get("size") ?? "md";
  const position = p.get("pos") ?? "bottom-left";
  const showMod  = p.get("mod") !== "0";
  const showSub  = p.get("sub") !== "0";
  const bgOpacity = Number(p.get("bg") ?? "50");

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const counterRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            if (data.type === "chat") {
              const d = data as {
                uniqueId?: string; nickname?: string; comment?: string;
                isModerator?: boolean; isSubscriber?: boolean;
              };
              const comment = d.comment?.trim() ?? "";
              if (!comment) return;
              const id = String(++counterRef.current);
              setMessages((prev) => [
                ...prev.slice(-(maxMsgs - 1)),
                {
                  id,
                  nickname: d.nickname ?? d.uniqueId ?? "?",
                  comment,
                  isMod: !!d.isModerator,
                  isSub: !!d.isSubscriber,
                  ts: Date.now(),
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
  }, [username, maxMsgs]);

  const posClass: Record<string, string> = {
    "top-left":      "top-4 left-4",
    "top-right":     "top-4 right-4",
    "bottom-left":   "bottom-4 left-4",
    "bottom-right":  "bottom-4 right-4",
    "top-center":    "top-4 left-1/2 -translate-x-1/2",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  };

  const fontCls = fontSize === "lg" ? "text-lg" : fontSize === "sm" ? "text-xs" : "text-sm";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: transparent !important; }

        .chat-wall {
          position: fixed;
          width: 360px;
          display: flex; flex-direction: column; gap: 5px;
          pointer-events: none; user-select: none;
        }

        .chat-bubble {
          display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap;
          padding: 8px 12px; border-radius: 10px;
          background: rgba(0,0,0,${bgOpacity / 100});
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.08);
          animation: slideIn 0.25s ease-out;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .chat-header { display: flex; align-items: center; gap: 4px; flex-wrap: nowrap; }
        .chat-nick { font-weight: 700; color: #67e8f9; font-size: inherit; white-space: nowrap; }
        .chat-sep  { color: rgba(255,255,255,0.4); margin-right: 2px; }
        .chat-text { color: rgba(255,255,255,0.92); word-break: break-word; }

        .badge {
          font-size: 0.6rem; font-weight: 800; padding: 1px 5px;
          border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .badge.mod { background: #10b981; color: white; }
        .badge.sub { background: #8b5cf6; color: white; }

        .text-xs  .chat-bubble { font-size: 0.75rem; }
        .text-sm  .chat-bubble { font-size: 0.875rem; }
        .text-lg  .chat-bubble { font-size: 1.05rem; }
      `}</style>

      <div className={`chat-wall ${fontCls} ${posClass[position] ?? posClass["bottom-left"]}`}>
        {messages.map((m) => (
          <ChatBubble key={m.id} msg={m} fontSize={fontCls} />
        ))}
      </div>
    </>
  );
}
