import { useAuth } from "@/context/auth-context";
import { UpdateCarousel } from "@/components/dashboard/update-carousel";
import { FeaturedSlider } from "@/components/dashboard/featured-slider";
import { useLocation } from "wouter";
import {
  Monitor, Zap, Gamepad2, Radio, Layers, BarChart2, Crown,
  ExternalLink, ChevronRight, CheckCircle2, Wifi, WifiOff,
  Star, Users, Megaphone, BookOpen, Sparkles, ArrowRight,
  Shield, Target, Tv2,
} from "lucide-react";
import { SiTiktok } from "react-icons/si";

// ── Feature pill data ──────────────────────────────────────────────────────────
const OVERLAY_PILLS = [
  { label: "Likes",         href: "/overlays/likes" },
  { label: "Battle",        href: "/overlays/battle",       badge: "PRO" },
  { label: "Coins",         href: "/overlays/coins" },
  { label: "MVP",           href: "/overlays/mvp" },
  { label: "Pote",          href: "/overlays/pote" },
  { label: "Gifts",         href: "/overlays/gifts" },
  { label: "WhatsApp",      href: "/overlays/whatsapp" },
  { label: "Notificações",  href: "/overlays/notificacoes" },
  { label: "Level Up",      href: "/overlays/level-up" },
  { label: "Gamer",         href: "/overlays/gamer",        badge: "PRO" },
  { label: "Share",         href: "/overlays/share" },
  { label: "Top Gifters",   href: "/overlays/top-gifters" },
];

const TOOL_CARDS = [
  { label: "Eventos",         icon: Zap,       href: "/events",        badge: "PRO",  color: "#f97316" },
  { label: "Alertas Sonoros", icon: Radio,     href: "/sound-alerts",  badge: null,   color: "#22d3ee" },
  { label: "Layout OBS",      icon: Monitor,   href: "/layout",        badge: "PRO",  color: "#a78bfa" },
  { label: "Effect Battle",   icon: Sparkles,  href: "/effect-battle", badge: "PRO",  color: "#ec4899" },
  { label: "Troll Gift",      icon: Target,    href: "/troll-gift",    badge: "APP",  color: "#22d3ee" },
  { label: "Álbum",           icon: Layers,    href: "/album",         badge: null,   color: "#34d399" },
];

const GAME_PILLS = [
  { label: "Roleta",        href: "/minigames/roleta" },
  { label: "Word Bomb",     href: "/minigames/word-bomb" },
  { label: "Verdade/Mito",  href: "/minigames/sentido" },
  { label: "Defender",      href: "/minigames/defender" },
  { label: "Baú",           href: "/minigames/bau" },
];

const PARTNER_INFLUENCERS = [
  { name: "Criador Parceiro 1", handle: "@parceiro1", badge: "Verificado", avatar: "C1" },
  { name: "Criador Parceiro 2", handle: "@parceiro2", badge: "Verificado", avatar: "C2" },
  { name: "Criador Parceiro 3", handle: "@parceiro3", badge: "Verificado", avatar: "C3" },
  { name: "Criador Parceiro 4", handle: "@parceiro4", badge: "Verificado", avatar: "C4" },
];

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    free:  { bg: "rgba(156,163,175,0.15)", text: "#9ca3af", label: "Gratuito" },
    basic: { bg: "rgba(34,211,238,0.15)",  text: "#22d3ee", label: "Basic" },
    pro:   { bg: "rgba(249,115,22,0.2)",   text: "#f97316", label: "PRO" },
  };
  const c = colors[plan] ?? colors.free;
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.text }}>
      {c.label}
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const displayName = user?.tiktokDisplayName ?? user?.name ?? "Criador";
  const handle = user?.tiktokUsername;

  return (
    <div className="space-y-6 animate-in fade-in duration-400">

      {/* ── Welcome header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl p-5 border border-white/8"
        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(236,72,153,0.06) 50%, rgba(6,182,212,0.06) 100%)" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top left, rgba(124,58,237,0.15) 0%, transparent 60%)" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {user?.tiktokProfilePicture ? (
              <img src={user.tiktokProfilePicture} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-purple-500/40" />
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center ring-2 ring-purple-500/40 shrink-0"
                style={{ background: "rgba(124,58,237,0.2)" }}>
                <SiTiktok className="w-6 h-6 text-purple-400" />
              </div>
            )}
            <div>
              <p className="text-xs text-purple-300/50 font-medium mb-0.5">Bem-vindo de volta</p>
              <h1 className="text-2xl font-bold text-white">{displayName}</h1>
              {handle && (
                <p className="text-sm text-purple-300/60 font-mono">@{handle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <PlanBadge plan={user?.plan ?? "free"} />
            {user?.plan !== "pro" && (
              <button
                onClick={() => setLocation("/pricing")}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:opacity-90"
                style={{ background: "linear-gradient(90deg, #7c3aed, #ec4899)", color: "white" }}>
                <Sparkles className="w-3 h-3" />
                Fazer upgrade
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── Left column ────────────────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-5">

          {/* Conta TikTok conectada */}
          <div className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-purple-300/50">Conta TikTok Conectada</p>
              <div className="flex items-center gap-1.5">
                {handle ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-green-400 font-medium">Ativa</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-xs text-red-400 font-medium">Não vinculada</span>
                  </>
                )}
              </div>
            </div>
            {handle ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full shrink-0"
                  style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}>
                  <SiTiktok className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{user?.tiktokDisplayName ?? handle}</p>
                  <p className="text-sm text-purple-300/50 font-mono">@{handle}</p>
                  {user?.tiktokFollowerCount && user.tiktokFollowerCount > 0 && (
                    <p className="text-xs text-purple-300/40 mt-0.5 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {user.tiktokFollowerCount.toLocaleString("pt-BR")} seguidores
                    </p>
                  )}
                </div>
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <WifiOff className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-300">Nenhuma conta vinculada</p>
                  <p className="text-xs text-red-300/60">Seu @ do TikTok é necessário para as ferramentas funcionarem.</p>
                </div>
              </div>
            )}
          </div>

          {/* Update carousel */}
          <UpdateCarousel />

          {/* Overlays pills */}
          <div className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-purple-400" />
                <p className="text-sm font-semibold text-white">Sobreposições (Overlays)</p>
              </div>
              <button
                onClick={() => setLocation("/overlays")}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
                Ver todas <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {OVERLAY_PILLS.map((p) => (
                <button
                  key={p.href}
                  onClick={() => setLocation(p.href)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105"
                  style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)", color: "#c4b5fd" }}>
                  {p.label}
                  {p.badge && (
                    <span className="text-xs font-bold" style={{ color: "#f97316" }}>{p.badge}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tools cards */}
          <div className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-yellow-400" />
              <p className="text-sm font-semibold text-white">Ferramentas</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TOOL_CARDS.map((t) => (
                <button
                  key={t.href}
                  onClick={() => setLocation(t.href)}
                  className="group flex flex-col gap-2 p-3 rounded-xl text-left transition-all hover:scale-[1.02]"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${t.color}22` }}>
                      <t.icon className="w-4 h-4" style={{ color: t.color }} />
                    </div>
                    {t.badge && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                        style={{ background: t.badge === "PRO" ? "rgba(249,115,22,0.2)" : "rgba(34,211,238,0.15)",
                                 color: t.badge === "PRO" ? "#f97316" : "#22d3ee" }}>
                        {t.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{t.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Jogos pills */}
          <div className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-cyan-400" />
                <p className="text-sm font-semibold text-white">Jogos / Minigames</p>
              </div>
              <button
                onClick={() => setLocation("/minigames")}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
                Ver todos <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {GAME_PILLS.map((g) => (
                <button
                  key={g.href}
                  onClick={() => setLocation(g.href)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105"
                  style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", color: "#67e8f9" }}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column ───────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Featured slides */}
          <FeaturedSlider />

          {/* Stats rápidas */}
          <div className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest text-purple-300/50 mb-4">Acesso Rápido</p>
            <div className="space-y-2">
              {[
                { label: "Monitor Live",   icon: Wifi,     href: handle ? `/monitor/${handle}` : "/monitor/example", color: "#22d3ee" },
                { label: "Rankings",       icon: Crown,    href: "/leaderboards",  color: "#f97316" },
                { label: "Gifters",        icon: Star,     href: "/gifters",       color: "#a78bfa" },
                { label: "Live Analytics", icon: BarChart2, href: "/live-analytics", color: "#34d399" },
                { label: "Integrações",   icon: Tv2,      href: "/integracoes",   color: "#f472b6" },
              ].map((item) => (
                <button
                  key={item.href}
                  onClick={() => setLocation(item.href)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:scale-[1.01]"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${item.color}20` }}>
                    <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                  </div>
                  <span className="text-sm text-white/70 flex-1">{item.label}</span>
                  <ArrowRight className="w-3 h-3 text-white/20" />
                </button>
              ))}
            </div>
          </div>

          {/* Influenciadores parceiros */}
          <div className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <p className="text-sm font-semibold text-white">Influenciadores Parceiros</p>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>BETA</span>
            </div>
            <div className="space-y-3">
              {PARTNER_INFLUENCERS.map((p) => (
                <div key={p.handle} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>
                    {p.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.name}</p>
                    <p className="text-xs text-purple-300/50">{p.handle}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80" }}>
                    ✓ {p.badge}
                  </span>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full py-2 text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center justify-center gap-1 transition-colors">
              Ver todos <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Blog / Atualizações */}
          <div className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <p className="text-sm font-semibold text-white">Blog — Novidades</p>
              </div>
              <span className="text-xs text-purple-300/40">Em breve</span>
            </div>
            <div className="space-y-3">
              {[
                { title: "Novos overlays disponíveis para live", date: "1 jul. · 3 min" },
                { title: "Como usar o Effect Battle em sua live",   date: "28 jun. · 5 min" },
                { title: "Guia completo de Gifters e Rankings",     date: "20 jun. · 7 min" },
              ].map((post, i) => (
                <div key={i} className="flex gap-3 items-start p-2 rounded-lg transition-colors hover:bg-white/5 cursor-pointer">
                  <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center"
                    style={{ background: "rgba(6,182,212,0.1)" }}>
                    <BookOpen className="w-4 h-4 text-cyan-400/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/80 line-clamp-2 leading-snug">{post.title}</p>
                    <p className="text-xs text-purple-300/40 mt-1">{post.date}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-3 w-full py-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-1 transition-colors">
              Ver todos os posts <ExternalLink className="w-3 h-3" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
