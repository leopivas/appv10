/**
 * /overlay/subscribe/:username
 * Alerta de assinaturas / membros — aparece quando alguém assina a live.
 * Transparente, sem auth, roda direto no OBS/TikTok Studio.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearch } from "wouter";

interface SubAlert {
  id: string;
  nickname: string;
  subMonth: number;
  kind: "new" | "renew";
  ts: number;
}

function SubCard({ alert, onDone }: { alert: SubAlert; onDone: (id: string) => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 400);
    const t2 = setTimeout(() => setPhase("out"), 6000);
    const t3 = setTimeout(() => onDone(alert.id), 6600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [alert.id, onDone]);

  const isLong = alert.subMonth >= 12;
  const isVet  = alert.subMonth >= 3;

  return (
    <div className={`sub-card phase-${phase} ${isLong ? "sub-long" : isVet ? "sub-vet" : "sub-new"}`}>
      <div className="sub-icon">
        {isLong ? "💎" : isVet ? "⭐" : "🎉"}
      </div>
      <div className="sub-body">
        <div className="sub-name">{alert.nickname}</div>
        <div className="sub-label">
          {alert.subMonth > 1
            ? `${alert.subMonth} meses de membro!`
            : "Novo membro!"}
        </div>
      </div>
      {alert.subMonth >= 6 && (
        <div className="sub-badge">{alert.subMonth}m</div>
      )}
    </div>
  );
}

export default function OverlaySubscribe() {
  const { username } = useParams<{ username: string }>();
  const search = useSearch();
  const p = new URLSearchParams(search);

  const position = p.get("pos") ?? "top-right";

  const [alerts, setAlerts] = useState<SubAlert[]>([]);
  const counterRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addAlert = useCallback((a: Omit<SubAlert, "id" | "ts">) => {
    const id = String(++counterRef.current);
    setAlerts((prev) => [...prev.slice(-5), { ...a, id, ts: Date.now() }]);
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
            if (data.type === "subscribe") {
              const d = data as {
                nickname?: string;
                subMonth?: number;
                oldSubscribeStatus?: number;
                subscribingStatus?: number;
              };
              const month = d.subMonth ?? 1;
              const isNew = (d.oldSubscribeStatus ?? 0) === 0;
              addAlert({
                nickname: d.nickname ?? "Alguém",
                subMonth: month,
                kind: isNew ? "new" : "renew",
              });
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
  }, [username, addAlert]);

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
          position: fixed; inset: 0; pointer-events: none; user-select: none;
          display: flex; flex-direction: column; gap: 10px;
        }

        .sub-card {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 18px; border-radius: 16px;
          backdrop-filter: blur(14px);
          border: 1.5px solid rgba(255,255,255,0.15);
          box-shadow: 0 6px 32px rgba(0,0,0,0.45);
          width: 340px;
          transition: transform 0.5s cubic-bezier(.34,1.56,.64,1), opacity 0.35s ease;
        }
        .sub-card.phase-in  { opacity: 0; transform: translateX(40px) scale(0.9); }
        .sub-card.phase-hold{ opacity: 1; transform: translateX(0) scale(1); }
        .sub-card.phase-out { opacity: 0; transform: translateX(20px) scale(0.95); }

        .sub-new  { background: linear-gradient(135deg, rgba(0,0,0,0.8), rgba(99,102,241,0.25)); border-color: rgba(99,102,241,0.4); }
        .sub-vet  { background: linear-gradient(135deg, rgba(0,0,0,0.8), rgba(234,179,8,0.25)); border-color: rgba(234,179,8,0.4); }
        .sub-long { background: linear-gradient(135deg, rgba(0,0,0,0.8), rgba(6,182,212,0.30)); border-color: rgba(6,182,212,0.5); }

        .sub-icon {
          font-size: 2.4rem; line-height: 1;
          animation: popIn 0.5s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes popIn {
          0%   { transform: scale(0) rotate(-30deg); }
          70%  { transform: scale(1.3) rotate(5deg); }
          100% { transform: scale(1) rotate(0); }
        }

        .sub-body { flex: 1; min-width: 0; }
        .sub-name {
          font-weight: 900; font-size: 1rem; color: white;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          text-shadow: 0 0 16px rgba(255,255,255,0.4);
        }
        .sub-label {
          font-size: 0.8rem; color: rgba(255,255,255,0.65); margin-top: 2px;
        }

        .sub-badge {
          background: linear-gradient(135deg, #6366f1, #06b6d4);
          color: white; font-weight: 900; font-size: 0.7rem;
          padding: 3px 8px; border-radius: 99px;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(99,102,241,0.5);
          animation: pulse 1.2s ease-in-out infinite alternate;
        }
        @keyframes pulse {
          from { filter: brightness(1); }
          to   { filter: brightness(1.25) drop-shadow(0 0 6px #6366f1); }
        }
      `}</style>

      <div className={`overlay-root ${posClass[position] ?? posClass["top-right"]}`}>
        {alerts.map((a) => (
          <SubCard key={a.id} alert={a} onDone={removeAlert} />
        ))}
      </div>
    </>
  );
}
