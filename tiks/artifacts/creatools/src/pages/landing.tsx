import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, Redirect } from "wouter";
import { SiTiktok } from "react-icons/si";
import {
  LayoutDashboard, Activity, Users, Trophy, Monitor, type LucideProps,
  ArrowRight, Menu, X, Gamepad2, Bell, Diamond, Webhook,
  Code2, Eye, EyeOff, Heart, Gift, BarChart3, Zap, Star, Shield,
  MessageCircle, TrendingUp, Sparkles, Play, ChevronRight,
  Loader2, AlertCircle, CheckCircle2, XCircle, Search, UserPlus, Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingTable, type PricingPlan } from "@/components/pricing-table";
import { useUIConfig } from "@/context/ui-config-context";
import { useAuth } from "@/context/auth-context";
import { useMaintenance } from "@/context/maintenance-context";

// ── Types ─────────────────────────────────────────────────────────────────────
interface LandingFeature { id: string; title: string; description: string; icon: string; imageUrl: string; demoUrl: string; order: number }
interface LandingPartner { id: string; tiktokHandle: string; displayName: string; avatarUrl: string; followers: number; addedAt: string; isLive?: boolean; viewerCount?: number }
interface LandingContent {
  enabled: boolean;
  hero: { headline: string; subheadline: string; ctaLabel: string; backgroundGradient: string };
  features: LandingFeature[]; partners: LandingPartner[];
  plans: { visiblePlanIds: string[]; recommendedPlanId: string };
  cta: { text: string; subtext: string; buttonLabel: string };
}

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  LayoutDashboard, Activity, Users, Trophy, Monitor, Zap, Shield,
  BarChart3, Gamepad2, Bell, Diamond, Webhook, Code2, Star, TrendingUp,
};
function DynIcon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? LayoutDashboard;
  return <Icon className={className} />;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

// ── Animated counter ──────────────────────────────────────────────────────────
function useCounter(target: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const elRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = elRef.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const t0 = Date.now();
        const tick = () => {
          const p = Math.min((Date.now() - t0) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setCount(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    obs.observe(el); return () => obs.disconnect();
  }, [target, duration]);
  return { count, elRef };
}

// ── Scroll reveal ─────────────────────────────────────────────────────────────
function useReveal(threshold = 0.08) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); obs.disconnect(); } }, { threshold });
    obs.observe(el); return () => obs.disconnect();
  }, [threshold]);
  return { ref, v };
}
function Reveal({ children, delay = 0, y = 28, className = "" }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const { ref, v } = useReveal();
  return (
    <div ref={ref} className={className} style={{ opacity: v ? 1 : 0, transform: v ? "none" : `translateY(${y}px)`, transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Nav({ logo, logoUrl, onLogin, onSignup }: { logo: string; logoUrl: string; onLogin: () => void; onSignup: () => void }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h, { passive: true }); return () => window.removeEventListener("scroll", h);
  }, []);
  return (
    <nav className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      style={{ background: scrolled ? "rgba(6,4,16,0.92)" : "rgba(6,4,16,0.5)", backdropFilter: "blur(20px)", borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "1px solid transparent" }}>
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={onLogin}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#06b6d4,#7c3aed)" }}>
            {logoUrl ? <img src={logoUrl} alt={logo} className="h-5 object-contain" /> : <SiTiktok className="w-4 h-4 text-white" />}
          </div>
          <span className="text-white font-bold tracking-tight">{logo}</span>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="ghost" onClick={onLogin} className="text-white/50 hover:text-white hover:bg-white/5 text-sm h-9">Entrar</Button>
          <Button onClick={onSignup} className="h-9 px-5 text-sm border-0 text-white font-semibold" style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)" }}>
            Criar Conta Grátis
          </Button>
        </div>
        <button className="sm:hidden p-1.5 text-white/50" onClick={() => setOpen(o => !o)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <div className="sm:hidden px-5 pb-4 flex flex-col gap-2 border-t border-white/5">
          <Button variant="ghost" className="w-full text-white/50" onClick={() => { setOpen(false); onLogin(); }}>Entrar</Button>
          <Button className="w-full border-0 text-white" style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)" }} onClick={() => { setOpen(false); onSignup(); }}>Criar Conta Grátis</Button>
        </div>
      )}
    </nav>
  );
}

// ── Floating badge gadget ─────────────────────────────────────────────────────
function FloatBadge({ icon, label, value, color, style, delay = "0s" }: { icon: React.ReactNode; label: string; value: string; color: string; style?: React.CSSProperties; delay?: string }) {
  return (
    <div className="absolute flex items-center gap-2.5 px-3 py-2.5 rounded-2xl pointer-events-none"
      style={{ background: "rgba(10,7,30,0.9)", backdropFilter: "blur(16px)", border: `1px solid ${color}40`, boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${color}15`, animation: `lp-float 4s ease-in-out infinite`, animationDelay: delay, zIndex: 20, ...style }}>
      <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>{icon}</div>
      <div>
        <p className="text-[10px] font-medium leading-none mb-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</p>
        <p className="text-xs font-bold leading-none" style={{ color }}>{value}</p>
      </div>
    </div>
  );
}

// ── Mock monitor UI ───────────────────────────────────────────────────────────
function MockMonitorUI() {
  const [chatIdx, setChatIdx] = useState(0);
  const CHATS = [
    { u: "gifter_top", m: "🎁 Enviou Universe × 5", g: true },
    { u: "lucas_fã", m: "você é incrível!! 🔥🔥", g: false },
    { u: "ana_mk", m: "primeira vez aqui, amando!", g: false },
    { u: "joao99", m: "🚀🚀🚀🚀🚀", g: false },
    { u: "mariana_s", m: "🎁 Enviou Rose × 10", g: true },
    { u: "tiago.live", m: "melhor live do dia!!!", g: false },
  ];
  useEffect(() => { const t = setInterval(() => setChatIdx(i => (i + 1) % 6), 2200); return () => clearInterval(t); }, []);
  const visible = [CHATS[chatIdx % 6], CHATS[(chatIdx + 1) % 6], CHATS[(chatIdx + 2) % 6], CHATS[(chatIdx + 3) % 6], CHATS[(chatIdx + 4) % 6]];

  return (
    <div className="relative w-full max-w-[340px] mx-auto select-none">
      {/* Ambient glow */}
      <div className="absolute inset-0 rounded-3xl blur-3xl opacity-40 pointer-events-none" style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)", transform: "scale(1.15) translateY(8%)" }} />

      {/* Main card */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: "rgba(12,8,30,0.97)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 40px 80px rgba(0,0,0,0.6)", transform: "perspective(1000px) rotateY(-6deg) rotateX(2deg)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)" }}>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />AO VIVO
            </span>
            <span className="text-xs text-white/30">@streamerpro</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/35">
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />48.2K</span>
            <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" />1.2M</span>
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {[{ l: "Gifts", v: "R$ 2.840", c: "#f59e0b" }, { l: "Novos Segs.", v: "+382", c: "#22d3ee" }, { l: "Engaj.", v: "94%", c: "#a78bfa" }].map(s => (
            <div key={s.l} className="py-2.5 px-3 text-center" style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}>
              <p className="text-xs font-bold" style={{ color: s.c }}>{s.v}</p>
              <p className="text-[9px] text-white/25 mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>
        {/* Animated chat */}
        <div className="px-4 py-3 space-y-2 overflow-hidden" style={{ minHeight: "130px" }}>
          {visible.map((c, i) => (
            <div key={`${chatIdx}-${i}`} className="flex items-start gap-1.5" style={{ animation: i === 0 ? "lp-chat-in 0.35s ease" : "none", opacity: i >= 4 ? 0.35 : 1 - i * 0.08 }}>
              <div className="w-4 h-4 rounded-full shrink-0 mt-0.5" style={{ background: `hsl(${(c.u.charCodeAt(0) * 47) % 360},60%,50%)` }} />
              <p className="text-[11px] leading-tight" style={{ color: c.g ? "#f59e0b" : "rgba(255,255,255,0.55)", fontWeight: c.g ? 600 : 400 }}>
                <span className="text-white/65 font-semibold">{c.u}: </span>{c.m}
              </p>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div className="px-4 py-2 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.2)" }}>
          <div className="flex items-center gap-1.5">
            <Gift className="w-3 h-3 text-amber-400" />
            <span className="text-[11px] text-white/50">Top: <span className="text-amber-400 font-semibold">@gifter_top</span></span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-white/25">
            <Zap className="w-3 h-3 text-violet-400" /><span>Creatools</span>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <FloatBadge icon={<Gift className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />} label="Gift recebido" value="+R$ 2.840" color="#f59e0b" style={{ top: "-6%", right: "-14%" }} delay="0s" />
      <FloatBadge icon={<Eye className="w-3.5 h-3.5" style={{ color: "#22d3ee" }} />} label="Ao vivo agora" value="48.2K views" color="#22d3ee" style={{ bottom: "18%", left: "-18%" }} delay="1.2s" />
      <FloatBadge icon={<Users className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />} label="Novos seguidores" value="+382 hoje" color="#a78bfa" style={{ bottom: "-8%", right: "-10%" }} delay="2.1s" />
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ hero, onCTA }: { hero: LandingContent["hero"]; onCTA: () => void }) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16" style={{ background: "#060410" }}>
      {/* Animated mesh gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 25% 55%, rgba(124,58,237,0.22) 0%, transparent 50%)" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 78% 25%, rgba(6,182,212,0.14) 0%, transparent 48%)" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 60% 85%, rgba(245,158,11,0.08) 0%, transparent 40%)" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 10% 10%, rgba(236,72,153,0.08) 0%, transparent 40%)" }} />
      {/* Animated orb */}
      <div className="absolute w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(124,58,237,0.12)", top: "20%", left: "5%", animation: "lp-orb 8s ease-in-out infinite" }} />
      <div className="absolute w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(6,182,212,0.08)", top: "10%", right: "10%", animation: "lp-orb 10s ease-in-out infinite reverse", animationDelay: "3s" }} />
      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.022] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "64px 64px" }} />

      <div className="relative max-w-6xl mx-auto px-5 w-full py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
              style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.28)", color: "#c4b5fd" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Plataforma #1 para TikTok LIVE
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.6rem] font-extrabold leading-[1.06] tracking-tight mb-6">
              <span className="text-white block">{hero.headline.split(" ").slice(0, 3).join(" ")}</span>
              <span className="block" style={{ background: "linear-gradient(90deg,#a78bfa,#22d3ee 50%,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "200% 100%", animation: "lp-gradient-shift 5s linear infinite" }}>
                {hero.headline.split(" ").slice(3).join(" ")}
              </span>
            </h1>

            <p className="text-lg text-white/40 leading-relaxed mb-8 max-w-md">{hero.subheadline}</p>

            <div className="flex flex-wrap items-center gap-3 mb-10">
              <Button size="lg" onClick={onCTA}
                className="h-12 px-8 text-base font-bold border-0 text-white"
                style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)", boxShadow: "0 0 0 0 rgba(124,58,237,0.5)", animation: "lp-btn-pulse 2.5s ease-in-out infinite" }}>
                {hero.ctaLabel} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="ghost" onClick={onCTA}
                className="h-12 px-6 text-base text-white/45 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/5">
                <Play className="w-4 h-4 mr-2 fill-current" />Ver demo
              </Button>
            </div>

            <div className="flex items-center gap-8 flex-wrap">
              {[{ val: "10+", sub: "ferramentas" }, { val: "Real-time", sub: "WebSocket" }, { val: "Grátis", sub: "para começar" }].map(s => (
                <div key={s.val}>
                  <p className="text-2xl font-black text-white">{s.val}</p>
                  <p className="text-xs text-white/25 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — mock UI with floating badges */}
          <div className="hidden lg:block relative py-16">
            <MockMonitorUI />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-32 pointer-events-none" style={{ background: "linear-gradient(to top,#060410,transparent)" }} />
    </section>
  );
}

// ── Tool ticker ────────────────────────────────────────────────────────────────
const TOOLS = [
  { icon: Monitor, label: "Overlay Studio" }, { icon: Activity, label: "Monitor Live" },
  { icon: Trophy, label: "Rankings" }, { icon: BarChart3, label: "Analytics" },
  { icon: Gamepad2, label: "Minigames" }, { icon: MessageCircle, label: "Chat Tools" },
  { icon: Diamond, label: "Gifters" }, { icon: Webhook, label: "Webhooks" },
  { icon: Bell, label: "Watchlist" }, { icon: Code2, label: "API & JWT" },
  { icon: TrendingUp, label: "Tendências" }, { icon: Sparkles, label: "IA na live" },
];
function ToolTicker() {
  const doubled = [...TOOLS, ...TOOLS];
  return (
    <div className="py-7 overflow-hidden" style={{ background: "#08051c", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="relative">
        <div className="flex gap-3" style={{ animation: "ticker 30s linear infinite" }}>
          {doubled.map(({ icon: Icon, label }, i) => (
            <div key={i} className="flex items-center gap-2 shrink-0 px-4 py-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)" }}>
              <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: i % 3 === 0 ? "#f59e0b" : i % 3 === 1 ? "#22d3ee" : "#a78bfa" }} />
              <span className="text-sm text-white/45 whitespace-nowrap font-medium">{label}</span>
            </div>
          ))}
        </div>
        <div className="absolute inset-y-0 left-0 w-24 pointer-events-none" style={{ background: "linear-gradient(to right,#08051c,transparent)" }} />
        <div className="absolute inset-y-0 right-0 w-24 pointer-events-none" style={{ background: "linear-gradient(to left,#08051c,transparent)" }} />
      </div>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────
const FEAT_COLORS = ["#f59e0b", "#22d3ee", "#a78bfa", "#f87171", "#34d399", "#fb923c", "#e879f9", "#38bdf8", "#4ade80"];
function FeatureCard({ feat, i, big = false }: { feat: LandingFeature; i: number; big?: boolean }) {
  const [hov, setHov] = useState(false);
  const c = FEAT_COLORS[i % FEAT_COLORS.length];
  return (
    <div className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${big ? "sm:col-span-2" : ""}`}
      style={{
        background: hov ? `rgba(14,10,32,0.98)` : "rgba(10,7,25,0.95)",
        border: `1px solid ${hov ? c + "50" : "rgba(255,255,255,0.06)"}`,
        boxShadow: hov ? `0 0 40px ${c}18, 0 24px 48px rgba(0,0,0,0.4)` : "0 4px 24px rgba(0,0,0,0.3)",
        transition: "all 0.3s ease",
      }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {/* Top glow line */}
      <div className="absolute top-0 inset-x-0 h-px transition-opacity duration-300" style={{ background: `linear-gradient(90deg,transparent,${c},transparent)`, opacity: hov ? 1 : 0 }} />

      <div className="p-6">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-all duration-300"
          style={{ background: `${c}14`, border: `1px solid ${c}28`, boxShadow: hov ? `0 0 20px ${c}30` : "none" }}>
          <DynIcon name={feat.icon} className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-white mb-2">{feat.title}</h3>
        <p className="text-sm text-white/35 leading-relaxed">{feat.description}</p>
        {(feat.imageUrl || feat.demoUrl) && (
          <div className="mt-4 rounded-xl overflow-hidden max-h-40 border border-white/5">
            {/\.(mp4|webm)/.test(feat.demoUrl || feat.imageUrl)
              ? <video src={feat.demoUrl || feat.imageUrl} autoPlay loop muted playsInline className="w-full object-cover" />
              : <img src={feat.imageUrl || feat.demoUrl} alt={feat.title} className="w-full object-cover" />}
          </div>
        )}
        {big && (
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold" style={{ color: c }}>
            Saiba mais <ChevronRight className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </div>
  );
}

function Features({ features }: { features: LandingFeature[] }) {
  const sorted = [...features].sort((a, b) => a.order - b.order);
  if (!sorted.length) return null;
  return (
    <section className="py-28 px-5 relative" style={{ background: "#060410" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.07) 0%, transparent 50%)" }} />
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-4"
            style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}>
            <Sparkles className="w-3 h-3" /> Ferramentas
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Tudo que sua live precisa
          </h2>
          <p className="text-white/35 text-lg max-w-lg mx-auto">Do overlay ao analytics — uma plataforma completa construída para streamers do TikTok LIVE.</p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((feat, i) => (
            <Reveal key={feat.id} delay={i * 45}>
              <FeatureCard feat={feat} i={i} big={i === 0 || i === 5} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Animated stat number ───────────────────────────────────────────────────────
function StatNum({ target, prefix = "", suffix = "", label, color }: { target: number; prefix?: string; suffix?: string; label: string; color: string }) {
  const { count, elRef } = useCounter(target);
  return (
    <div className="text-center">
      <span ref={elRef} className="block text-5xl lg:text-6xl font-black mb-2" style={{ color }}>
        {prefix}{target >= 1000 ? fmtK(count) : count}{suffix}
      </span>
      <p className="text-sm text-white/35">{label}</p>
    </div>
  );
}

// ── Stats band ────────────────────────────────────────────────────────────────
function StatsBand() {
  return (
    <section className="py-20 px-5 relative overflow-hidden" style={{ background: "#08051c" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.1) 0%, transparent 60%)" }} />
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(124,58,237,0.4),rgba(6,182,212,0.4),transparent)" }} />
      <div className="absolute bottom-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(245,158,11,0.3),transparent)" }} />
      <div className="max-w-5xl mx-auto">
        <Reveal className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-white/30">Por que o Creatools?</p>
        </Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
          <Reveal delay={0}><StatNum target={10} suffix="+" label="Ferramentas integradas" color="#a78bfa" /></Reveal>
          <Reveal delay={80}><StatNum target={0} suffix="ms" label="Latência WebSocket" color="#22d3ee" /></Reveal>
          <Reveal delay={160}><StatNum target={100} suffix="%" label="Dados em tempo real" color="#f59e0b" /></Reveal>
          <Reveal delay={240}><StatNum target={0} prefix="" suffix="" label="Cartão de crédito necessário" color="#34d399" /></Reveal>
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name: "Eros Prado", handle: "erosprado", quote: "O Creatools mudou completamente minha live. Os overlays são profissionais e o monitor em tempo real é indispensável.", stars: 5, color: "#f59e0b" },
  { name: "Ana Cherry", handle: "raq.sousaa", quote: "Finalmente uma ferramenta feita para streamers brasileiros. Os rankings de gifters engajam muito mais o público!", stars: 5, color: "#a78bfa" },
  { name: "Ribeiro", handle: "__ribeiroisa_", quote: "O dashboard de analytics me ajudou a entender meu público e crescer muito mais rápido. Recomendo muito!", stars: 5, color: "#22d3ee" },
];
function Testimonials() {
  return (
    <section className="py-24 px-5 relative" style={{ background: "#060410" }}>
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-4"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b" }}>
            <Star className="w-3 h-3 fill-current" /> Depoimentos
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">
            Criadores que <span style={{ background: "linear-gradient(90deg,#f59e0b,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>amam</span> a plataforma
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.handle} delay={i * 80}>
              <div className="relative rounded-2xl p-6 h-full"
                style={{ background: "rgba(10,7,28,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="absolute top-0 inset-x-0 h-px rounded-t-2xl" style={{ background: `linear-gradient(90deg,transparent,${t.color}60,transparent)` }} />
                <div className="flex items-center gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-current" style={{ color: t.color }} />)}
                </div>
                <p className="text-white/60 text-sm leading-relaxed mb-5">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${t.color}20`, color: t.color, border: `1px solid ${t.color}40` }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-white/30">@{t.handle}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Partner card ──────────────────────────────────────────────────────────────
function PartnerCard({ partner, index }: { partner: LandingPartner; index: number }) {
  const isLive = !!partner.isLive;
  const tilt = index % 2 === 0 ? -6 : 6;
  return (
    <div className="relative shrink-0 overflow-hidden"
      style={{ width: "160px", height: "240px", borderRadius: "18px", transform: `rotate(${tilt}deg)`, transition: "transform 0.35s ease, box-shadow 0.35s ease", cursor: "pointer", border: isLive ? "2px solid #f59e0b" : "1.5px solid rgba(255,255,255,0.1)", boxShadow: isLive ? "0 0 28px rgba(245,158,11,0.4), 0 16px 48px rgba(0,0,0,0.6)" : "0 16px 48px rgba(0,0,0,0.5)", flexShrink: 0 }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = `rotate(${tilt / 2}deg) translateY(-10px) scale(1.05)`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = `rotate(${tilt}deg)`; }}>
      {partner.avatarUrl ? (
        <img src={partner.avatarUrl} alt={partner.displayName} className="absolute inset-0 w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(160deg, hsl(${(partner.tiktokHandle.charCodeAt(0) * 37) % 360},60%,22%), hsl(${(partner.tiktokHandle.charCodeAt(0) * 67) % 360},50%,12%))` }}>
          <SiTiktok className="w-14 h-14 text-white/15" />
        </div>
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 55%, rgba(0,0,0,0.1) 100%)" }} />
      {isLive && (
        <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "rgba(239,68,68,0.9)", backdropFilter: "blur(8px)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[9px] font-black text-white tracking-wider">AO VIVO</span>
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 p-3">
        <p className="text-white font-bold text-sm leading-tight truncate">{partner.displayName}</p>
        <p className="text-white/45 text-xs mt-0.5 truncate">@{partner.tiktokHandle}</p>
        {partner.followers > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            <Users className="w-3 h-3" style={{ color: "#f59e0b" }} />
            <span className="text-xs font-bold" style={{ color: "#f59e0b" }}>{fmtK(partner.followers)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Partners carousel ─────────────────────────────────────────────────────────
function Partners({ partners }: { partners: LandingPartner[] }) {
  if (!partners.length) return null;
  const MIN = 8; let items = [...partners];
  while (items.length < MIN) items = [...items, ...partners];
  const doubled = [...items, ...items];
  const speed = Math.max(25, items.length * 6);
  const isFew = partners.length < 4;
  return (
    <section className="py-24 relative overflow-hidden" style={{ background: "#08051c" }}>
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(245,158,11,0.5),rgba(124,58,237,0.5),transparent)" }} />
      <Reveal className="text-center mb-14 px-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-4"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.28)", color: "#f59e0b" }}>
          <Star className="w-3 h-3 fill-current" /> Streamers Parceiros
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight">
          Criadores que <span style={{ background: "linear-gradient(90deg,#f59e0b,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>confiam</span> no Creatools
        </h2>
        <p className="text-white/35 max-w-md mx-auto">Streamers profissionais turbinando suas lives com nossas ferramentas.</p>
      </Reveal>
      <div className="py-10">
        {isFew ? (
          <div className="flex items-end justify-center gap-8 px-5 flex-wrap">
            {partners.map((p, i) => <PartnerCard key={p.id} partner={p} index={i} />)}
          </div>
        ) : (
          <div className="relative group/c" style={{ overflowX: "hidden" }}>
            <div className="flex gap-8 items-end group-hover/c:[animation-play-state:paused]"
              style={{ animation: `partnersScroll ${speed}s linear infinite`, paddingLeft: "32px" }}>
              {doubled.map((p, i) => <PartnerCard key={`${p.id}-${i}`} partner={p} index={i} />)}
            </div>
            <div className="absolute inset-y-0 left-0 w-28 pointer-events-none z-10" style={{ background: "linear-gradient(to right,#08051c,transparent)" }} />
            <div className="absolute inset-y-0 right-0 w-28 pointer-events-none z-10" style={{ background: "linear-gradient(to left,#08051c,transparent)" }} />
          </div>
        )}
      </div>
      <div className="absolute bottom-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(124,58,237,0.35),transparent)" }} />
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
function Pricing({ plans, recommended, onSelect }: { plans: PricingPlan[]; recommended: string; onSelect: () => void }) {
  return (
    <section className="py-28 px-5 relative" style={{ background: "#060410" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 80%, rgba(6,182,212,0.07) 0%, transparent 50%)" }} />
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-4"
            style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)", color: "#22d3ee" }}>
            <Zap className="w-3 h-3" /> Planos
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">Comece grátis, cresça sem limites</h2>
          <p className="text-white/35 text-lg max-w-md mx-auto">Escale conforme sua live cresce. Cancele quando quiser.</p>
        </Reveal>
        <Reveal delay={80}><PricingTable plans={plans} recommendedPlanId={recommended} onSelect={onSelect} /></Reveal>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CTA({ cta, onCTA }: { cta: LandingContent["cta"]; onCTA: () => void }) {
  return (
    <section className="py-32 px-5 relative overflow-hidden" style={{ background: "#08051c" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.18) 0%, transparent 55%)" }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
      {/* Decorative glowing orb behind text */}
      <div className="absolute w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(124,58,237,0.08)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />

      <Reveal>
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="text-6xl mb-6 animate-bounce" style={{ animationDuration: "2s" }}>🚀</div>
          <h2 className="text-4xl sm:text-6xl font-black text-white mb-5 tracking-tight leading-none">{cta.text}</h2>
          <p className="text-white/40 text-lg mb-10 max-w-xl mx-auto">{cta.subtext}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={onCTA}
              className="h-14 px-12 text-lg font-black border-0 text-white w-full sm:w-auto"
              style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444,#ec4899)", boxShadow: "0 0 60px rgba(245,158,11,0.3)" }}>
              {cta.buttonLabel} <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="ghost" onClick={onCTA} className="h-14 px-8 text-base text-white/40 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/5 w-full sm:w-auto">
              Ver planos e preços
            </Button>
          </div>
          <p className="text-white/20 text-sm mt-6">Grátis para começar · Sem cartão de crédito · Cancele quando quiser</p>
        </div>
      </Reveal>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer({ logo }: { logo: string }) {
  return (
    <footer className="py-10 px-5" style={{ background: "#060410", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#06b6d4,#7c3aed)" }}>
            <SiTiktok className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-white/60">{logo}</span>
        </div>
        <div className="flex items-center gap-6 text-xs text-white/20">
          <span>Termos de Uso</span><span>Privacidade</span><span>Suporte</span>
        </div>
        <p className="text-xs text-white/15">© {new Date().getFullYear()} {logo} · Plataforma para streamers TikTok LIVE</p>
      </div>
    </footer>
  );
}

// ── Auth Modal ────────────────────────────────────────────────────────────────
type AuthMode = "login" | "register";
type RegStep = "account" | "tiktok";
interface TikProfile {
  exists: boolean | null; uniqueId: string; reason?: string;
  nickname?: string | null; profilePictureUrl?: string | null; followerCount?: number;
}

function AuthErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 text-sm rounded-xl px-3 py-2.5"
      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{msg}
    </div>
  );
}

function AuthModal({ open, initialMode, onClose }: { open: boolean; initialMode: AuthMode; onClose: () => void }) {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [regStep, setRegStep] = useState<RegStep>("account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [tiktokHandle, setTiktokHandle] = useState("");
  const [tikProfile, setTikProfile] = useState<TikProfile | null>(null);
  const [tikLooking, setTikLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode); setRegStep("account");
      setEmail(""); setPassword(""); setName(""); setShowPw(false);
      setTiktokHandle(""); setTikProfile(null); setError(null); setLoading(false);
    }
  }, [open, initialMode]);

  useEffect(() => {
    const handle = tiktokHandle.trim().replace(/^@/, "");
    if (!handle || handle.length < 2) { setTikProfile(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setTikLooking(true);
      try {
        const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
        const r = await fetch(`${BASE}/api/tiktok/verify-username?uniqueId=${encodeURIComponent(handle)}`);
        const data = await r.json() as TikProfile;
        setTikProfile({ ...data, uniqueId: handle });
      } catch {
        setTikProfile({ exists: null, uniqueId: handle });
      } finally { setTikLooking(false); }
    }, 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [tiktokHandle]);

  function switchMode(m: AuthMode) {
    setMode(m); setRegStep("account"); setError(null);
    setEmail(""); setPassword(""); setName(""); setTiktokHandle(""); setTikProfile(null);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try { await login(email, password); onClose(); setLocation("/"); }
    catch (err) { setError(err instanceof Error ? err.message : "Algo deu errado"); }
    finally { setLoading(false); }
  }

  async function handleRegisterStep1(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (password.length < 6) { setError("A senha deve ter pelo menos 6 caracteres"); return; }
    setRegStep("tiktok");
  }

  async function handleRegisterFinish() {
    const handle = tiktokHandle.trim().replace(/^@/, "");
    if (!handle || handle.length < 2) { setError("Informe seu @ do TikTok (obrigatório)"); return; }
    setError(null); setLoading(true);
    try {
      await register(email, password, name, {
        username: tikProfile?.uniqueId ?? handle,
        profilePicture: tikProfile?.profilePictureUrl ?? undefined,
        displayName: tikProfile?.nickname ?? undefined,
        followerCount: tikProfile?.followerCount,
      });
      onClose(); setLocation("/");
    } catch (err) { setError(err instanceof Error ? err.message : "Algo deu errado"); }
    finally { setLoading(false); }
  }

  if (!open) return null;

  const isHandleValid = tikProfile?.exists === true;
  const isHandleNotFound = tikProfile?.exists === false && tikProfile?.reason !== "no_api_key";
  const handle = tiktokHandle.trim().replace(/^@/, "");
  const canFinish = handle.length >= 2 && !tikLooking;

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
    color: "white", width: "100%", padding: "12px 16px", borderRadius: "12px",
    fontSize: "14px", outline: "none",
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}
      style={{ background: "rgba(6,4,16,0.88)", backdropFilter: "blur(14px)" }}>
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "rgba(10,8,28,0.98)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 30px 90px rgba(0,0,0,0.75), 0 0 0 1px rgba(124,58,237,0.1)" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#06b6d4,#7c3aed)" }}>
              <SiTiktok className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm text-white leading-none">Creatools</div>
              <div className="text-[9px] text-purple-400/60 uppercase tracking-widest">TikTok Live Studio</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white transition-colors"
            style={{ background: "transparent" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Mode tabs */}
          <div className="grid grid-cols-2 gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.05)" }}>
            {(["login", "register"] as const).map((m) => (
              <button key={m} onClick={() => switchMode(m)}
                className="py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ background: mode === m ? "#7c3aed" : "transparent", color: mode === m ? "white" : "rgba(255,255,255,0.35)" }}>
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {/* Title */}
          <div>
            <h2 className="text-lg font-bold text-white mb-0.5">
              {mode === "login" ? "Bem-vindo de volta" : regStep === "account" ? "Criar sua conta" : "Vincular TikTok"}
            </h2>
            <p className="text-xs text-purple-300/45">
              {mode === "login" ? "Entre para acessar seus overlays e ferramentas"
               : regStep === "account" ? "Preencha seus dados para começar"
               : "Obrigatório — seu @ do TikTok fica vinculado à conta"}
            </p>
          </div>

          {/* ── LOGIN ── */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-3">
              <input type="email" placeholder="Seu email" value={email} onChange={(e) => setEmail(e.target.value)}
                required autoComplete="email" style={inputStyle}
                className="placeholder:text-purple-400/30 focus:border-purple-500/40" />
              <div className="relative">
                <input type={showPw ? "text" : "password"} placeholder="Sua senha" value={password}
                  onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: "40px" }}
                  className="placeholder:text-purple-400/30 focus:border-purple-500/40" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400/40 hover:text-purple-300 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && <AuthErrorBox msg={error} />}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:opacity-90"
                style={{ background: "linear-gradient(90deg,#ec4899,#8b5cf6,#06b6d4)", backgroundSize: "200% 100%" }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Entrando…</> : <><ArrowRight className="w-4 h-4" />Entrar</>}
              </button>
              <p className="text-center text-xs text-purple-300/30">
                Não tem conta?{" "}
                <button type="button" onClick={() => switchMode("register")} className="font-semibold hover:underline" style={{ color: "#a78bfa" }}>
                  Criar conta grátis
                </button>
              </p>
            </form>
          )}

          {/* ── REGISTER STEP 1: ACCOUNT ── */}
          {mode === "register" && regStep === "account" && (
            <form onSubmit={handleRegisterStep1} className="space-y-3">
              <input type="text" placeholder="Seu nome completo" value={name}
                onChange={(e) => setName(e.target.value)} required autoComplete="name"
                style={inputStyle} className="placeholder:text-purple-400/30 focus:border-purple-500/40" />
              <input type="email" placeholder="Seu email" value={email}
                onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                style={inputStyle} className="placeholder:text-purple-400/30 focus:border-purple-500/40" />
              <div className="relative">
                <input type={showPw ? "text" : "password"} placeholder="Senha (mínimo 6 caracteres)"
                  value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password"
                  style={{ ...inputStyle, paddingRight: "40px" }}
                  className="placeholder:text-purple-400/30 focus:border-purple-500/40" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400/40 hover:text-purple-300 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && <AuthErrorBox msg={error} />}
              <button type="submit"
                className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                style={{ background: "linear-gradient(90deg,#ec4899,#8b5cf6)" }}>
                Próximo — vincular TikTok <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-center text-xs text-purple-300/30">
                Já tem conta?{" "}
                <button type="button" onClick={() => switchMode("login")} className="font-semibold hover:underline" style={{ color: "#a78bfa" }}>
                  Entrar
                </button>
              </p>
            </form>
          )}

          {/* ── REGISTER STEP 2: TIKTOK ── */}
          {mode === "register" && regStep === "tiktok" && (
            <div className="space-y-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400/60 text-sm font-mono">@</span>
                <input type="text" placeholder="seuusuario" value={tiktokHandle}
                  onChange={(e) => setTiktokHandle(e.target.value.replace(/^@/, ""))}
                  autoComplete="off" autoFocus
                  style={{ ...inputStyle, paddingLeft: "32px", paddingRight: "40px",
                    borderColor: isHandleValid ? "rgba(34,197,94,0.45)" : isHandleNotFound ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.08)" }}
                  className="placeholder:text-purple-400/30" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {tikLooking && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
                  {!tikLooking && isHandleValid && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  {!tikLooking && isHandleNotFound && <XCircle className="w-4 h-4 text-orange-400" />}
                  {!tikLooking && !tikProfile && handle.length < 2 && <Search className="w-4 h-4 text-purple-400/30" />}
                </div>
              </div>

              {isHandleValid && tikProfile && (
                <div className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  {tikProfile.profilePictureUrl ? (
                    <img src={tikProfile.profilePictureUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.3)" }}>
                      <SiTiktok className="w-4 h-4 text-purple-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{tikProfile.nickname ?? tikProfile.uniqueId}</p>
                    {tikProfile.followerCount ? <p className="text-xs text-green-400/70">{tikProfile.followerCount.toLocaleString("pt-BR")} seguidores</p> : null}
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                </div>
              )}

              {/* Not found → warning only, does NOT block registration */}
              {isHandleNotFound && handle.length > 1 && (
                <div className="flex items-start gap-2 text-xs rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#fcd34d" }}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>@ não encontrado no TikTok — você pode criar a conta assim mesmo. O @ será salvo e poderá ser verificado depois.</span>
                </div>
              )}

              {error && <AuthErrorBox msg={error} />}
              <p className="text-[11px] text-purple-300/30 leading-relaxed">
                O @ do TikTok é obrigatório e ficará permanentemente vinculado à sua conta. Não poderá ser alterado nas páginas de análise — apenas no perfil.
              </p>

              <button onClick={() => void handleRegisterFinish()} disabled={loading || !canFinish}
                className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:opacity-90"
                style={{ background: "linear-gradient(90deg,#ec4899,#8b5cf6)" }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Criando conta…</> : <><UserPlus className="w-4 h-4" />Criar conta</>}
              </button>
              <button type="button" onClick={() => setRegStep("account")}
                className="w-full text-center text-xs text-purple-300/30 hover:text-purple-300/50 transition-colors">
                ← Voltar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage({ isPreview = false }: { isPreview?: boolean }) {
  const [, setLocation] = useLocation();
  const { config } = useUIConfig();
  const { maint } = useMaintenance();
  const [landing, setLanding] = useState<LandingContent | null>(null);
  const [partners, setPartners] = useState<LandingPartner[]>([]);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  const logo = config?.logoText ?? "Creatools";
  const logoUrl = config?.logoUrl ?? "";

  const load = useCallback(async () => {
    const ac = new AbortController();
    try {
      const [lr, pr, par] = await Promise.all([
        fetch("/api/landing", { signal: ac.signal }),
        fetch("/api/admin/plans", { signal: ac.signal }),
        fetch("/api/landing/partners", { signal: ac.signal }),
      ]);
      setLanding(await lr.json() as LandingContent);
      setPlans(((await pr.json()) as { plans: PricingPlan[] }).plans ?? []);
      setPartners(((await par.json()) as { partners: LandingPartner[] }).partners ?? []);
    } catch { /* abort */ }
    finally { setLoading(false); }
    return () => ac.abort();
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openAuth(mode: AuthMode) { setAuthMode(mode); setShowAuth(true); }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#060410" }}>
      <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );
  if (!landing) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#060410" }}>
      <Button variant="ghost" className="text-white/40" onClick={() => setLocation("/login")}>Ir para o login</Button>
    </div>
  );
  if (!landing.enabled && !isPreview) return <Redirect to="/login" />;

  const visiblePlans = plans
    .filter(p => landing.plans.visiblePlanIds.includes(p.id) && p.isActive)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen" style={{ background: "#060410" }}>
      <style>{`
        @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes partnersScroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes lp-float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-10px)} }
        @keyframes lp-orb { 0%,100%{transform:scale(1);opacity:0.7} 50%{transform:scale(1.15);opacity:1} }
        @keyframes lp-chat-in { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes lp-gradient-shift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes lp-btn-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,0.5),0 0 40px rgba(124,58,237,0.3)} 50%{box-shadow:0 0 0 8px rgba(124,58,237,0),0 0 60px rgba(124,58,237,0.45)} }
      `}</style>

      <AuthModal open={showAuth} initialMode={authMode} onClose={() => setShowAuth(false)} />
      {/* Maintenance alert banner — visible when landingAlert is set */}
      {maint.landingAlert && !isPreview && (
        <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium"
          style={{ background: "linear-gradient(90deg, rgba(234,179,8,0.95), rgba(249,115,22,0.95))", color: "#1a1200" }}>
          <Wrench className="w-4 h-4 shrink-0" />
          <span>{maint.landingAlert}</span>
          {maint.estimatedReturn && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: "rgba(0,0,0,0.2)" }}>
              Retorno: {maint.estimatedReturn}
            </span>
          )}
        </div>
      )}
      {/* Spacer when banner is active */}
      {maint.landingAlert && !isPreview && <div className="h-10" />}
      <Nav logo={logo} logoUrl={logoUrl} onLogin={() => openAuth("login")} onSignup={() => openAuth("register")} />
      <Hero hero={landing.hero} onCTA={() => openAuth("register")} />
      <ToolTicker />
      {landing.features.length > 0 && <Features features={landing.features} />}
      <StatsBand />
      {partners.length > 0 && <Partners partners={partners} />}
      <Testimonials />
      {visiblePlans.length > 0 && <Pricing plans={visiblePlans} recommended={landing.plans.recommendedPlanId} onSelect={() => openAuth("register")} />}
      <CTA cta={landing.cta} onCTA={() => openAuth("register")} />
      <Footer logo={logo} />
    </div>
  );
}
