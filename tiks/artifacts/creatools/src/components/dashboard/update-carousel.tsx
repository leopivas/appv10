import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth, authFetch } from "@/context/auth-context";
import { ChevronLeft, ChevronRight, Megaphone, Sparkles, Info, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: "info" | "warning" | "success" | "new" | "update";
  pinned: boolean;
  createdAt: number;
  emoji?: string;
  imageUrl?: string;
}

const TYPE_CONFIG = {
  info:    { color: "#60a5fa", bg: "rgba(96,165,250,0.12)",   label: "Info",   icon: Info },
  warning: { color: "#f97316", bg: "rgba(249,115,22,0.12)",   label: "Aviso",  icon: AlertTriangle },
  success: { color: "#22c55e", bg: "rgba(34,197,94,0.12)",    label: "OK",     icon: CheckCircle2 },
  new:     { color: "#a78bfa", bg: "rgba(167,139,250,0.12)",  label: "Novo",   icon: Sparkles },
  update:  { color: "#22d3ee", bg: "rgba(34,211,238,0.12)",   label: "Update", icon: Megaphone },
};

function VersionLabel({ ann }: { ann: Announcement }) {
  const cfg = TYPE_CONFIG[ann.type] ?? TYPE_CONFIG.update;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}>
      {ann.emoji ?? cfg.label}
    </span>
  );
}

interface CarouselCardProps {
  ann: Announcement;
}

function CarouselCard({ ann }: CarouselCardProps) {
  const cfg = TYPE_CONFIG[ann.type] ?? TYPE_CONFIG.update;
  const AnnIcon = cfg.icon;

  return (
    <div className="flex h-full gap-4 p-5">
      {ann.imageUrl ? (
        <div className="shrink-0 w-24 h-24 rounded-xl overflow-hidden self-center"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <img src={ann.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center self-center"
          style={{ background: cfg.bg }}>
          <AnnIcon className="w-7 h-7" style={{ color: cfg.color }} />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-2">
          <VersionLabel ann={ann} />
          {ann.pinned && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>
              📌 Fixado
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-white leading-tight mb-1.5">{ann.title}</h3>
        <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "rgba(255,255,255,0.55)" }}>
          {ann.body}
        </p>
      </div>
    </div>
  );
}

export function UpdateCarousel() {
  const { token } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const data = await authFetch("/announcements", token) as { announcements: Announcement[] };
      const filtered = (data.announcements ?? [])
        .filter((a) => a.type === "update" || a.type === "new")
        .sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return b.createdAt - a.createdAt;
        });
      setItems(filtered);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { void fetchItems(); }, [fetchItems]);

  const next = useCallback(() => setIdx((i) => (i + 1) % Math.max(items.length, 1)), [items.length]);
  const prev = useCallback(() => setIdx((i) => (i - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1)), [items.length]);

  useEffect(() => {
    if (items.length <= 1 || paused) return;
    intervalRef.current = setInterval(next, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [items.length, paused, next]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-purple-500/20 overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(236,72,153,0.06) 100%)" }}>
        <div className="flex items-start gap-4 p-5">
          <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(124,58,237,0.2)" }}>
            <Megaphone className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-bold text-white">Creatools — TikTok LIVE Studio</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(124,58,237,0.3)", color: "#a78bfa" }}>BETA</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
              Sobreposições, rankings, alertas sonoros, jogos interativos e muito mais para suas lives no TikTok.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const current = items[idx];

  return (
    <div className="rounded-2xl border border-white/8 overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(236,72,153,0.06) 100%)", minHeight: 140 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}>

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at right top, rgba(167,139,250,0.08) 0%, transparent 60%)" }} />

      <div className="relative h-full">
        <CarouselCard ann={current} />
      </div>

      {items.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(0,0,0,0.4)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(0,0,0,0.4)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === idx ? 16 : 6,
                  height: 6,
                  background: i === idx ? "#a78bfa" : "rgba(255,255,255,0.2)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
