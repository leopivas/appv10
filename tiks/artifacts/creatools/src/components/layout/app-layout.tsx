import SupportWidget from "@/components/support-widget";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Activity, Settings, Diamond,
  Tag, LogOut, ChevronDown, ChevronRight, UserCircle, Shield, Menu, X,
  Lock, Zap, Crown, Search, Users, Star, Key, BarChart2,
  Globe, Gamepad2, Subtitles, Webhook, Radio, Bell, Code2, Tv2, Trophy,
  Monitor, Target, Layers, ChevronLeft, Megaphone, Pin, Info, Sparkles,
  AlertTriangle, CheckCircle2, ExternalLink, Wifi, MessageSquare, Server,
  LucideProps,
} from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth, authFetch } from "@/context/auth-context";
import { useUIConfig } from "@/context/ui-config-context";
import { useWatchlist } from "@/context/watchlist-context";
import { useMaintenance } from "@/context/maintenance-context";
import { PageMaintenanceOverlay, DashboardMaintenanceOverlay } from "@/components/maintenance-overlay";
import type { NavSectionConfig, CenterButton } from "@/context/ui-config-context";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PlanLevel = "free" | "basic" | "pro";

const PLAN_ORDER: Record<PlanLevel, number> = { free: 0, basic: 1, pro: 2 };
function planMeets(userPlan: PlanLevel, required: string): boolean {
  return PLAN_ORDER[userPlan] >= (PLAN_ORDER[required as PlanLevel] ?? 0);
}

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  LayoutDashboard, Activity, Settings, Diamond, Tag, Shield,
  Search, Users, Star, Key, BarChart2, Crown, Zap, Lock,
  Globe, Gamepad2, Subtitles, Webhook, Radio, Bell, Code2, Tv2, Trophy,
  Monitor, Target, Layers, Sparkles, Server,
};
function NavIcon({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? LayoutDashboard;
  return <Icon className={className} />;
}

const PLAN_CONFIG: Record<PlanLevel, { label: string; color: string; bg: string; badgeBg: string }> = {
  free:  { label: "Free",  color: "#9ca3af", bg: "rgba(156,163,175,0.1)", badgeBg: "rgba(156,163,175,0.15)" },
  basic: { label: "Basic", color: "#22d3ee", bg: "rgba(34,211,238,0.1)",  badgeBg: "rgba(34,211,238,0.15)" },
  pro:   { label: "PRO",   color: "#f97316", bg: "rgba(249,115,22,0.1)",  badgeBg: "rgba(249,115,22,0.2)" },
};

const DEFAULT_SECTIONS: NavSectionConfig[] = [
  {
    id: "main",
    label: "PAINEL",
    items: [
      { id: "dashboard", label: "Dashboard",     href: "/",                icon: "LayoutDashboard", visible: true },
      { id: "monitor",   label: "Conexão",        href: "/monitor/example", icon: "Activity",        matchPrefix: "/monitor", visible: true },
      {
        id: "overlays", label: "Sobreposições", href: "/overlays", icon: "Monitor", matchPrefix: "/overlays", visible: true,
        children: [
          { id: "ov-likes",        label: "Likes",         href: "/overlays/likes",         icon: "Layers", visible: true },
          { id: "ov-likes-up",     label: "Likes Upgrade", href: "/overlays/likes-upgrade", icon: "Layers", visible: true, badge: "PRO", badgeColor: "#f97316" },
          { id: "ov-coins",        label: "Moedas",        href: "/overlays/coins",         icon: "Layers", visible: true },
          { id: "ov-share",        label: "Share",         href: "/overlays/share",         icon: "Layers", visible: true },
          { id: "ov-battle",       label: "Battle",        href: "/overlays/battle",        icon: "Layers", visible: true, badge: "PRO", badgeColor: "#f97316" },
          { id: "ov-gifts",        label: "Gifts",         href: "/overlays/gifts",         icon: "Layers", visible: true },
          { id: "ov-whatsapp",     label: "WhatsApp",      href: "/overlays/whatsapp",      icon: "Layers", visible: true },
          { id: "ov-mvp",          label: "MVP",           href: "/overlays/mvp",           icon: "Layers", visible: true },
          { id: "ov-pote",         label: "Pote",          href: "/overlays/pote",          icon: "Layers", visible: true },
          { id: "ov-notificacoes", label: "Notificações",  href: "/overlays/notificacoes",  icon: "Layers", visible: true },
          { id: "ov-gamer",        label: "Gamer",         href: "/overlays/gamer",         icon: "Layers", visible: true, badge: "PRO", badgeColor: "#f97316" },
          { id: "ov-level-up",     label: "Level Up",      href: "/overlays/level-up",      icon: "Layers", visible: true },
        ],
      },
    ],
  },
  {
    id: "ferramentas",
    label: "FERRAMENTAS",
    items: [
      { id: "events",        label: "Eventos",        href: "/events",        icon: "Zap",     matchPrefix: "/events",        visible: true, badge: "PRO", badgeColor: "#f97316" },
      { id: "sound-alerts",  label: "Alertas Sonoros",href: "/sound-alerts",  icon: "Radio",   matchPrefix: "/sound-alerts",  visible: true },
      { id: "layout",        label: "Layout OBS",     href: "/layout",        icon: "Monitor", matchPrefix: "/layout",        visible: true, badge: "PRO", badgeColor: "#f97316" },
      { id: "effect-battle", label: "Effect Battle",  href: "/effect-battle", icon: "Sparkles",matchPrefix: "/effect-battle", visible: true, badge: "PRO", badgeColor: "#f97316" },
      { id: "troll-gift",    label: "Troll Gift",     href: "/troll-gift",    icon: "Zap",     matchPrefix: "/troll-gift",    visible: true, badge: "APP", badgeColor: "#22d3ee" },
      { id: "album",         label: "Álbum",          href: "/album",         icon: "Layers",  matchPrefix: "/album",         visible: true },
    ],
  },
  {
    id: "jogos-section",
    label: "JOGOS",
    items: [
      {
        id: "minigames", label: "Jogos", href: "/minigames", icon: "Gamepad2", matchPrefix: "/minigames", visible: true,
        children: [
          { id: "mg-roleta",    label: "Roleta",          href: "/minigames/roleta",    icon: "Gamepad2", visible: true },
          { id: "mg-wordbomb",  label: "Word Bomb",       href: "/minigames/word-bomb", icon: "Gamepad2", visible: true },
          { id: "mg-sentido",   label: "Verdade ou Mito", href: "/minigames/sentido",   icon: "Gamepad2", visible: true },
          { id: "mg-defender",  label: "Defender",        href: "/minigames/defender",  icon: "Gamepad2", visible: true },
          { id: "mg-bau",       label: "Baú",             href: "/minigames/bau",       icon: "Gamepad2", visible: true },
        ],
      },
    ],
  },
  {
    id: "integracoes-section",
    label: "INTEGRAÇÕES",
    items: [
      { id: "integracoes", label: "Integrações",   href: "/integracoes", icon: "Zap",      matchPrefix: "/integracoes", visible: true },
      { id: "pricing",     label: "Planos",         href: "/pricing",    icon: "Tag",       visible: true },
      { id: "settings",    label: "Configurações",  href: "/settings",   icon: "Settings",  adminOnly: true, visible: true },
    ],
  },
  {
    id: "live-tools",
    label: "LIVE",
    items: [
      { id: "live-counts",    label: "Live Counts",    href: "/live-counts",    icon: "Radio",     matchPrefix: "/live-counts",    requiresPlan: "basic", visible: true },
      { id: "live-captions",  label: "Live Captions",  href: "/live-captions",  icon: "Subtitles", matchPrefix: "/live-captions",  requiresPlan: "pro",   visible: true },
      { id: "live-analytics", label: "Live Analytics", href: "/live-analytics", icon: "BarChart2", matchPrefix: "/live-analytics", requiresPlan: "pro",   visible: true },
    ],
  },
  {
    id: "rankings",
    label: "RANKINGS",
    items: [
      { id: "leaderboards",         label: "Leagues", href: "/leaderboards",         icon: "Crown",    matchPrefix: "/leaderboards",         visible: true },
      { id: "leaderboards-country", label: "Country", href: "/leaderboards/country", icon: "Globe",    matchPrefix: "/leaderboards/country", visible: true },
      { id: "gifters",              label: "Gifters", href: "/gifters",               icon: "Diamond",  matchPrefix: "/gifters",              visible: true },
    ],
  },
  {
    id: "admin",
    items: [
      { id: "admin", label: "Admin Panel", href: "/admin", icon: "Shield", adminOnly: true, visible: true },
      { id: "servers", label: "Servidores", href: "/servers", icon: "Server", adminOnly: true, visible: true },
    ],
  },
];

// ── Announcement types ────────────────────────────────────────────────────────
interface Announcement {
  id: string;
  title: string;
  body: string;
  type: "info" | "warning" | "success" | "new" | "update";
  pinned: boolean;
  createdAt: number;
  emoji?: string;
}

const ANN_TYPE_CONFIG = {
  info:    { icon: Info,          color: "#60a5fa", bg: "rgba(96,165,250,0.1)",  label: "Info" },
  warning: { icon: AlertTriangle, color: "#f97316", bg: "rgba(249,115,22,0.1)",  label: "Aviso" },
  success: { icon: CheckCircle2,  color: "#22c55e", bg: "rgba(34,197,94,0.1)",   label: "OK" },
  new:     { icon: Sparkles,      color: "#a78bfa", bg: "rgba(167,139,250,0.1)", label: "Novo" },
  update:  { icon: Megaphone,     color: "#22d3ee", bg: "rgba(34,211,238,0.1)",  label: "Update" },
};

function annTimeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  const d = new Date(ts);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

// ── Announcement bell popup ───────────────────────────────────────────────────
function AnnouncementBell() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const LAST_SEEN_KEY = "ann_last_seen";

  function loadLastSeen(): number {
    try { return Number(localStorage.getItem(LAST_SEEN_KEY) ?? "0"); } catch { return 0; }
  }

  function markAllRead() {
    const now = Date.now();
    try { localStorage.setItem(LAST_SEEN_KEY, String(now)); } catch { /* ignore */ }
    setUnreadCount(0);
  }

  const fetchAnnouncements = useCallback(async () => {
    try {
      const data = await authFetch("/announcements", token) as { announcements: Announcement[] };
      setAnnouncements(data.announcements ?? []);
      const lastSeen = loadLastSeen();
      const unread = (data.announcements ?? []).filter((a) => a.createdAt > lastSeen).length;
      setUnreadCount(unread);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    void fetchAnnouncements();
    const interval = setInterval(() => void fetchAnnouncements(), 60_000);
    return () => clearInterval(interval);
  }, [fetchAnnouncements]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleOpen() {
    setOpen((v) => {
      if (!v) markAllRead();
      return !v;
    });
  }

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="relative p-2 rounded-lg transition-colors hover:bg-white/5"
        style={{ color: open ? "#a78bfa" : "rgba(255,255,255,0.4)" }}
        aria-label="Novidades"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse"
            style={{ background: "#ef4444", color: "white" }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+8px)] z-50 flex flex-col"
          style={{
            width: 340,
            maxHeight: 480,
            background: "#120d22",
            border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: 14,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" style={{ color: "#a78bfa" }} />
              <span className="font-semibold text-sm text-white">Novidades</span>
              {announcements.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>
                  {announcements.length}
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/5 transition-colors"
              style={{ color: "rgba(255,255,255,0.3)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            {announcements.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
                <Bell className="w-8 h-8" style={{ color: "rgba(255,255,255,0.1)" }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Nenhuma novidade ainda.</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {announcements.map((ann) => {
                  const cfg = ANN_TYPE_CONFIG[ann.type] ?? ANN_TYPE_CONFIG.info;
                  const AnnIcon = cfg.icon;
                  return (
                    <div key={ann.id} className="flex gap-3 p-3 rounded-xl transition-colors hover:bg-white/3"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                        style={{ background: cfg.bg }}>
                        {ann.emoji
                          ? <span className="text-base leading-none">{ann.emoji}</span>
                          : <AnnIcon className="w-4 h-4" style={{ color: cfg.color }} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-white leading-snug">
                            {ann.pinned && <Pin className="w-3 h-3 inline mr-1 opacity-50" />}
                            {ann.title}
                          </p>
                          <span className="text-[10px] shrink-0 mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                            {annTimeAgo(ann.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                          {ann.body}
                        </p>
                        <span className="mt-1.5 inline-flex text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 shrink-0 flex items-center justify-between"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
              Atualizado automaticamente
            </span>
            <Link href="/notifications" onClick={() => setOpen(false)}
              className="text-[11px] font-medium transition-colors hover:opacity-80"
              style={{ color: "#a78bfa" }}>
              Ver tudo →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// Live clock component
function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("pt-BR", { hour12: false }));
  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString("pt-BR", { hour12: false }));
    }, 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>{time}</span>;
}

function NavLinks({
  sections,
  onNavigate,
  userPlan,
  isAdmin,
  location,
  collapsed: sidebarCollapsed,
}: {
  sections: NavSectionConfig[];
  onNavigate?: () => void;
  userPlan: PlanLevel;
  isAdmin: boolean;
  location: string;
  collapsed?: boolean;
}) {
  const { liveCount } = useWatchlist();

  const [sectionCollapsed, setSectionCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem("nav_collapsed");
      return stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
    } catch { return {}; }
  });

  const toggleSection = useCallback((id: string) => {
    setSectionCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem("nav_collapsed", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Track which expandable parent items are open
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(() => {
    // Auto-expand parent if current location is a child
    return {};
  });

  const toggleExpand = useCallback((id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  function renderNavItem(item: NavSectionConfig["items"][number], depth = 0) {
    const isActive =
      location === item.href ||
      (item.matchPrefix && location.startsWith(item.matchPrefix));
    const locked = !!(item.requiresPlan && !planMeets(userPlan, item.requiresPlan));
    const showLiveBadge = item.id === "notifications" && liveCount > 0;
    const isAdminItem = item.adminOnly;
    const hasChildren = !!(item.children && item.children.length > 0);

    // Auto-expand if any child is active
    const anyChildActive = hasChildren && item.children!.some(
      c => location === c.href || (c.matchPrefix && location.startsWith(c.matchPrefix))
    );
    const isExpanded = expandedItems[item.id] !== undefined
      ? expandedItems[item.id]
      : anyChildActive;

    const itemPaddingLeft = sidebarCollapsed ? "px-2" : depth > 0 ? "pl-8 pr-3" : "px-3";

    if (hasChildren && !sidebarCollapsed) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleExpand(item.id)}
            className={`w-full flex items-center rounded-lg text-sm font-medium transition-all ${itemPaddingLeft} py-2`}
            style={{
              background: isActive || anyChildActive ? "rgba(124,58,237,0.1)" : "transparent",
              color: isActive || anyChildActive ? "#a78bfa" : "rgba(255,255,255,0.55)",
              borderLeft: isActive || anyChildActive ? "2px solid #7c3aed" : "2px solid transparent",
            }}
          >
            <NavIcon name={item.icon} className="shrink-0 w-4 h-4 mr-3" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full mr-1"
                style={{ background: `${item.badgeColor ?? "#f97316"}20`, color: item.badgeColor ?? "#f97316" }}>
                {item.badge}
              </span>
            )}
            {isExpanded
              ? <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
              : <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
            }
          </button>
          {isExpanded && (
            <div className="mt-0.5 space-y-0.5">
              {item.children!.filter(c => c.visible).map(child => {
                const childActive = location === child.href || (child.matchPrefix && location.startsWith(child.matchPrefix));
                return (
                  <Link
                    key={child.id}
                    href={child.href}
                    onClick={onNavigate}
                    className="flex items-center rounded-lg text-sm transition-all pl-9 pr-3 py-1.5"
                    style={{
                      background: childActive ? "rgba(124,58,237,0.12)" : "transparent",
                      color: childActive ? "#a78bfa" : "rgba(255,255,255,0.45)",
                      borderLeft: childActive ? "2px solid #7c3aed" : "2px solid transparent",
                    }}
                  >
                    <span className="flex-1 text-[13px]">{child.label}</span>
                    {child.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `${child.badgeColor ?? "#f97316"}20`, color: child.badgeColor ?? "#f97316" }}>
                        {child.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.id}
        href={locked ? "/pricing" : item.href}
        onClick={onNavigate}
        title={sidebarCollapsed ? item.label : undefined}
        className={`flex items-center rounded-lg text-sm font-medium transition-all group relative ${
          sidebarCollapsed ? "px-2 py-2.5 justify-center" : `${itemPaddingLeft} py-2`
        }`}
        style={{
          background: isActive ? "rgba(124,58,237,0.15)" : "transparent",
          color: isActive ? "#a78bfa" : isAdminItem ? "#f87171" : locked ? "rgba(255,255,255,0.2)" : (item.color || "rgba(255,255,255,0.55)"),
          borderLeft: isActive ? "2px solid #7c3aed" : "2px solid transparent",
        }}
      >
        <NavIcon name={item.icon} className={`shrink-0 ${sidebarCollapsed ? "w-4.5 h-4.5" : "w-4 h-4 mr-3"}`} />
        {!sidebarCollapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {showLiveBadge && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse"
                style={{ background: "#ef4444", color: "white" }}>
                {liveCount}
              </span>
            )}
            {item.badge && !showLiveBadge && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: `${item.badgeColor ?? "#f97316"}20`, color: item.badgeColor ?? "#f97316" }}>
                {item.badge}
              </span>
            )}
            {isAdminItem && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                Admin
              </span>
            )}
            {locked && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {item.requiresPlan === "basic" ? "Basic" : "Pro"}
              </span>
            )}
          </>
        )}
      </Link>
    );
  }

  return (
    <div className="space-y-0.5">
      {sections.map((section) => {
        const visibleItems = section.items.filter((item) => {
          if (!item.visible) return false;
          if (item.adminOnly && !isAdmin) return false;
          return true;
        });
        if (!visibleItems.length) return null;

        const isCollapsed = section.label ? !!sectionCollapsed[section.id] : false;

        return (
          <div key={section.id} className="mb-1">
            {section.label && !sidebarCollapsed && (
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center px-3 py-1.5 rounded-lg mb-0.5 group transition-all hover:bg-white/5"
              >
                <span className="flex-1 text-left text-[9px] font-bold uppercase tracking-[0.15em]"
                  style={{ color: "rgba(255,255,255,0.25)" }}>
                  {section.label}
                </span>
                {isCollapsed
                  ? <ChevronRight className="w-3 h-3 opacity-30" />
                  : <ChevronDown className="w-3 h-3 opacity-30" />}
              </button>
            )}

            {!isCollapsed && (
              <div className="space-y-0.5">
                {visibleItems.map((item) => renderNavItem(item))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Center button color map ───────────────────────────────────────────────────
const BTN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  purple: { bg: "rgba(124,58,237,0.18)", text: "#c4b5fd", border: "rgba(124,58,237,0.35)" },
  blue:   { bg: "rgba(59,130,246,0.18)", text: "#93c5fd", border: "rgba(59,130,246,0.35)" },
  green:  { bg: "rgba(34,197,94,0.18)",  text: "#86efac", border: "rgba(34,197,94,0.35)" },
  red:    { bg: "rgba(239,68,68,0.18)",  text: "#fca5a5", border: "rgba(239,68,68,0.35)" },
  gray:   { bg: "rgba(107,114,128,0.18)",text: "#d1d5db", border: "rgba(107,114,128,0.35)" },
  cyan:   { bg: "rgba(34,211,238,0.18)", text: "#67e8f9", border: "rgba(34,211,238,0.35)" },
};

// ── Per-page maintenance wrapper ──────────────────────────────────────────────
function PageMaintenanceWrapper({
  location, isAdmin, children,
}: { location: string; isAdmin: boolean; children: React.ReactNode }) {
  const { maint } = useMaintenance();
  if (isAdmin) return <>{children}</>;

  const pageMaint = Object.entries(maint.pages ?? {}).find(([path]) => {
    if (path === "/") return location === "/";
    return location === path || location.startsWith(path + "/") || location.startsWith(path);
  });

  if (pageMaint && pageMaint[1].enabled) {
    return (
      <div className="relative min-h-[60vh]">
        <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none" }}>
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <PageMaintenanceOverlay
            message={pageMaint[1].message}
            estimatedReturn={pageMaint[1].estimatedReturn}
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// ── Top Bar ───────────────────────────────────────────────────────────────────
interface TopBarProps {
  user: ReturnType<typeof useAuth>["user"];
  logout: () => void;
  isAdmin: boolean;
  userPlan: PlanLevel;
  planCfg: typeof PLAN_CONFIG[PlanLevel];
  initials: string;
  onMobileMenu: () => void;
  headerConfig: import("@/context/ui-config-context").HeaderConfig | undefined;
  logoText: string;
  logoUrl: string;
}

function TopBar({ user, logout, isAdmin, userPlan, planCfg, initials, onMobileMenu, headerConfig, logoText, logoUrl }: TopBarProps) {
  const appName    = headerConfig?.appName    ?? logoText;
  const appSub     = headerConfig?.appSubtitle;
  const showSub    = headerConfig?.showSubtitle ?? true;
  const showUpg    = headerConfig?.showUpgradeBtn ?? true;
  const showFlag   = headerConfig?.showFlag ?? false;
  const centerBtns = headerConfig?.centerButtons ?? [];
  const effectiveLogo = headerConfig?.logoUrl || logoUrl;

  return (
    <header className="h-14 flex items-center px-4 gap-3 shrink-0"
      style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>

      {/* Mobile menu */}
      <button className="md:hidden text-white/40 hover:text-white/70 mr-1 transition-colors" onClick={onMobileMenu}>
        <Menu className="w-5 h-5" />
      </button>

      {/* LEFT: app name + subtitle */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #06b6d4, #7c3aed)" }}>
          {effectiveLogo
            ? <img src={effectiveLogo} alt={appName} className="h-5 object-contain" />
            : <SiTiktok className="w-3.5 h-3.5 text-white" />}
        </div>
        <div className="hidden sm:block leading-none">
          <p className="text-sm font-bold text-white tracking-tight">{appName}</p>
          {showSub && appSub && (
            <p className="text-[9px] tracking-widest uppercase mt-0.5" style={{ color: "rgba(167,139,250,0.5)" }}>
              {appSub}
            </p>
          )}
        </div>
      </div>

      {/* CENTER: configurable action buttons */}
      {centerBtns.length > 0 && (
        <div className="hidden md:flex items-center gap-1.5 flex-1 justify-center">
          {centerBtns.map((btn: CenterButton) => {
            const bc = BTN_COLORS[btn.color ?? "purple"] ?? BTN_COLORS.purple;
            return (
              <a
                key={btn.id}
                href={btn.url}
                target={btn.openInNewTab ? "_blank" : undefined}
                rel={btn.openInNewTab ? "noopener noreferrer" : undefined}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105 shrink-0"
                style={{ background: bc.bg, color: bc.text, border: `1px solid ${bc.border}` }}>
                {btn.icon && <span className="text-sm leading-none">{btn.icon}</span>}
                {btn.label}
                {btn.badge && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.12)", color: bc.text }}>
                    {btn.badge}
                  </span>
                )}
                {btn.openInNewTab && <ExternalLink className="w-2.5 h-2.5 opacity-50" />}
              </a>
            );
          })}
        </div>
      )}

      {centerBtns.length === 0 && <div className="flex-1" />}

      {/* RIGHT cluster */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        {/* Country/flag badge */}
        {showFlag && (
          <div className="hidden sm:flex items-center px-2 py-1.5 rounded-lg text-[10px] font-semibold text-white/50"
            style={{ background: "rgba(255,255,255,0.04)" }}>
            🇧🇷
          </div>
        )}

        {/* Online dot */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
          style={{ background: "rgba(34,197,94,0.08)" }}>
          <Wifi className="w-3 h-3 text-green-400" />
          <span className="text-[10px] font-semibold text-green-400">Online</span>
        </div>

        {/* Announcements bell */}
        <AnnouncementBell />

        {/* Upgrade button */}
        {showUpg && userPlan !== "pro" && (
          <Link href="/pricing"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105 shrink-0"
            style={{ background: "linear-gradient(90deg, #7c3aed, #ec4899)", color: "white" }}>
            <Zap className="w-3 h-3" />
            Upgrade
          </Link>
        )}

        {/* User avatar + plan + name dropdown */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors shrink-0"
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)", color: "white" }}>
                  {initials}
                </div>
                <div className="hidden sm:block text-left leading-none">
                  <p className="text-xs font-medium text-white/80 truncate max-w-[90px]">{user.name ?? user.email?.split("@")[0]}</p>
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded"
                    style={{ background: planCfg.badgeBg, color: planCfg.color }}>
                    {planCfg.label}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-white/20 hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-2 py-1.5">
                <p className="text-xs text-muted-foreground">Conectado como</p>
                <p className="text-sm font-medium truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/profile" className="cursor-pointer"><UserCircle className="w-4 h-4 mr-2" />Meu Perfil</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/pricing" className="cursor-pointer"><Tag className="w-4 h-4 mr-2" />Planos</Link></DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/atendimento" className="cursor-pointer text-violet-400 focus:text-violet-400">
                      <MessageSquare className="w-4 h-4 mr-2" />Atendimento
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer text-red-400 focus:text-red-400">
                      <Shield className="w-4 h-4 mr-2" />Admin Panel
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-400 focus:text-red-400 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { config } = useUIConfig();
  const { maint } = useMaintenance();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar_collapsed") === "true"; } catch { return false; }
  });
  const { liveCount } = useWatchlist();

  const userPlan: PlanLevel = user?.plan ?? "free";
  const planCfg = PLAN_CONFIG[userPlan];
  const isAdmin = user?.isAdmin ?? false;

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "??";

  const logoText = config?.logoText ?? "Creatools";
  const logoUrl = config?.logoUrl ?? "";
  const navType = config?.navType ?? "sidebar";
  const sections: NavSectionConfig[] = config?.sidebarSections?.length
    ? config.sidebarSections
    : DEFAULT_SECTIONS;

  const toggleSidebar = () => {
    setSidebarCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem("sidebar_collapsed", String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // ── Topbar layout ──
  if (navType === "topbar") {
    return (
      <div className="flex flex-col h-screen w-full overflow-hidden" style={{ background: "#0a0814" }}>
        <header className="h-14 flex items-center px-4 gap-4 shrink-0" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #06b6d4, #7c3aed)" }}>
              {logoUrl ? <img src={logoUrl} alt={logoText} className="h-6 object-contain" /> : <SiTiktok className="w-4 h-4 text-white" />}
            </div>
            <span className="font-bold text-base tracking-tight text-white">{logoText}</span>
          </div>
          <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
            {sections.flatMap((s) => s.items).filter((item) => item.visible && (!item.adminOnly || isAdmin)).map((item) => {
              const isActive = location === item.href || (item.matchPrefix && location.startsWith(item.matchPrefix));
              const locked = !!(item.requiresPlan && !planMeets(userPlan, item.requiresPlan));
              return (
                <Link key={item.id} href={locked ? "/pricing" : item.href}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0"
                  style={{ color: isActive ? "#a78bfa" : "rgba(255,255,255,0.5)", background: isActive ? "rgba(124,58,237,0.12)" : "transparent" }}>
                  <NavIcon name={item.icon} className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)", color: "white" }}>{initials}</div>
                  <span className="text-sm font-medium text-white/70 hidden sm:block">{user.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild><Link href="/profile" className="cursor-pointer"><UserCircle className="w-4 h-4 mr-2" />Perfil</Link></DropdownMenuItem>
                {isAdmin && <DropdownMenuItem asChild><Link href="/admin" className="cursor-pointer text-red-400"><Shield className="w-4 h-4 mr-2" />Admin</Link></DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-400 cursor-pointer"><LogOut className="w-4 h-4 mr-2" />Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    );
  }

  // ── Sidebar layout (default) ──
  const sidebarW = sidebarCollapsed ? "w-14" : "w-60";

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {/* Logo header */}
      <div className={`h-14 flex items-center shrink-0 ${sidebarCollapsed ? "justify-center px-2" : "px-4"}`}
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {sidebarCollapsed ? (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #06b6d4, #7c3aed)" }}>
            {logoUrl ? <img src={logoUrl} alt={logoText} className="h-6 object-contain" /> : <SiTiktok className="w-4 h-4 text-white" />}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #06b6d4, #7c3aed)" }}>
              {logoUrl ? <img src={logoUrl} alt={logoText} className="h-6 object-contain" /> : <SiTiktok className="w-4 h-4 text-white" />}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm tracking-tight text-white leading-none truncate">{logoText}</div>
              <div className="text-[9px] tracking-widest uppercase mt-0.5" style={{ color: "rgba(167,139,250,0.5)" }}>TikTok Live Studio</div>
            </div>
          </div>
        )}
      </div>

      {/* User info at top */}
      {user && !sidebarCollapsed && (
        <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)", color: "white" }}>{initials}</div>
            <span className="text-xs truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{user.email}</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        <NavLinks
          sections={sections}
          onNavigate={onNavigate}
          userPlan={userPlan}
          isAdmin={isAdmin}
          location={location}
          collapsed={sidebarCollapsed}
        />
      </nav>

      {/* Upgrade banner */}
      {user && userPlan === "free" && !sidebarCollapsed && (
        <div className="px-3 pb-2 shrink-0">
          <Link href="/pricing">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:opacity-90"
              style={{ background: "linear-gradient(90deg, rgba(124,58,237,0.2), rgba(236,72,153,0.2))", border: "1px solid rgba(124,58,237,0.3)" }}>
              <Zap className="w-4 h-4 shrink-0" style={{ color: "#a78bfa" }} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold" style={{ color: "#a78bfa" }}>Upgrade agora</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Desbloqueie mais ferramentas</p>
              </div>
              <Crown className="w-3.5 h-3.5 shrink-0" style={{ color: "#f97316" }} />
            </div>
          </Link>
        </div>
      )}

      {/* Bottom: user dropdown + collapse */}
      <div className="shrink-0 px-2 pb-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {user && !sidebarCollapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left group mt-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)", color: "white" }}>{initials}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-white/70">{user.email?.split("@")[0]}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: planCfg.badgeBg, color: planCfg.color }}>{planCfg.label}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-white/20 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
              <div className="px-2 py-1.5">
                <p className="text-xs text-muted-foreground">Conectado como</p>
                <p className="text-sm font-medium truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/profile" className="cursor-pointer"><UserCircle className="w-4 h-4 mr-2" />Meu Perfil</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/pricing" className="cursor-pointer"><Tag className="w-4 h-4 mr-2" />{userPlan === "free" ? "Fazer upgrade" : "Gerenciar plano"}</Link></DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/atendimento" className="cursor-pointer text-violet-400 focus:text-violet-400">
                      <MessageSquare className="w-4 h-4 mr-2" />Atendimento
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer text-red-400 focus:text-red-400">
                      <Shield className="w-4 h-4 mr-2" />Admin Panel
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-400 focus:text-red-400 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Collapse button */}
        <button
          onClick={toggleSidebar}
          className="mt-2 w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:bg-white/5"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
          {!sidebarCollapsed && <span className="text-[10px] uppercase tracking-widest font-semibold">Recolher</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: "#0a0814" }}>
      {/* Desktop Sidebar */}
      <aside className={`${sidebarW} hidden md:flex flex-col shrink-0 transition-all duration-200`}
        style={{ background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 flex flex-col z-10"
            style={{ background: "#0f0b1f", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar — BetterTok style */}
        <TopBar
          user={user}
          logout={logout}
          isAdmin={isAdmin}
          userPlan={userPlan}
          planCfg={planCfg}
          initials={initials}
          onMobileMenu={() => setMobileOpen(true)}
          headerConfig={config?.headerConfig}
          logoText={logoText}
          logoUrl={logoUrl}
        />

        {/* Global maintenance overlay — covers all pages for non-admins */}
        {maint.enabled && !isAdmin && (
          <DashboardMaintenanceOverlay
            message={maint.message}
            estimatedReturn={maint.estimatedReturn}
          />
        )}

        {/* Page content with per-page maintenance overlay */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            <PageMaintenanceWrapper location={location} isAdmin={isAdmin}>
              {children}
            </PageMaintenanceWrapper>
          </div>
        </main>
      </div>

      {/* Floating support widget */}
      <SupportWidget />
    </div>
  );
}
