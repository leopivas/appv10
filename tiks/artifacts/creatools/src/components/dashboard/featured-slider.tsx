import { useState, useEffect, useCallback, useRef } from "react";
import { useUIConfig, type FeaturedSlide } from "@/context/ui-config-context";
import { ChevronLeft, ChevronRight, Sparkles, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

const DEFAULT_SLIDE: FeaturedSlide = {
  id: "__default__",
  title: "Bem-vindo ao Creatools",
  subtitle: "Seu painel de monitoramento TikTok LIVE",
  body: "Acompanhe canais ao vivo, monitore criadores em tempo real e verifique o status de múltiplas contas de uma só vez.",
  badge: "Novo",
  badgeColor: "#a78bfa",
};

function SlideCard({ slide }: { slide: FeaturedSlide }) {
  const [, setLocation] = useLocation();

  const handleCta = () => {
    if (!slide.ctaUrl) return;
    if (slide.ctaUrl.startsWith("http")) {
      window.open(slide.ctaUrl, "_blank", "noopener");
    } else {
      setLocation(slide.ctaUrl);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="relative w-full h-32 rounded-xl overflow-hidden mb-3 shrink-0"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
        {slide.imageUrl ? (
          <img
            src={slide.imageUrl}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(236,72,153,0.1) 100%)",
            }}>
            <Sparkles className="w-10 h-10 text-purple-400/40" />
          </div>
        )}
        {slide.badge && (
          <span
            className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: `${slide.badgeColor ?? "#a78bfa"}33`,
              color: slide.badgeColor ?? "#a78bfa",
              backdropFilter: "blur(4px)",
              border: `1px solid ${slide.badgeColor ?? "#a78bfa"}40`,
            }}>
            {slide.badge}
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <h4 className="text-sm font-bold text-white leading-tight truncate mb-1">
          {slide.title}
        </h4>
        {slide.subtitle && (
          <p className="text-xs font-medium mb-1" style={{ color: "#a78bfa" }}>
            {slide.subtitle}
          </p>
        )}
        {slide.body && (
          <p
            className="text-xs leading-relaxed line-clamp-3 flex-1"
            style={{ color: "rgba(255,255,255,0.5)" }}>
            {slide.body}
          </p>
        )}
        {slide.ctaLabel && slide.ctaUrl && (
          <button
            onClick={handleCta}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
            style={{ background: "linear-gradient(90deg, #7c3aed, #ec4899)", color: "white" }}>
            {slide.ctaLabel}
            {slide.ctaUrl.startsWith("http") && <ExternalLink className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  );
}

export function FeaturedSlider() {
  const { config } = useUIConfig();
  const configured = config?.featuredSlides ?? [];
  const slides = configured.length > 0 ? configured : [DEFAULT_SLIDE];
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => setIdx((i) => (i + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setIdx((i) => (i - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    intervalRef.current = setInterval(next, 6000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [slides.length, paused, next]);

  const current = slides[idx % slides.length];

  return (
    <div
      className="rounded-2xl border border-white/8 p-4"
      style={{ background: "rgba(255,255,255,0.03)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
            Destaques
          </p>
        </div>
        {slides.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={prev}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.4)" }}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.25)" }}>
              {idx + 1}/{slides.length}
            </span>
            <button
              onClick={next}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.4)" }}>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <SlideCard slide={current} />

      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="rounded-full transition-all"
              style={{
                width: i === idx ? 14 : 5,
                height: 5,
                background: i === idx ? "#a78bfa" : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
