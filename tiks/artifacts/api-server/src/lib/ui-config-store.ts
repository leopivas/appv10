import { db } from "@workspace/db";
import { uiConfigTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export interface NavItemConfig {
  id: string;
  label: string;
  href: string;
  icon: string;
  matchPrefix?: string;
  adminOnly?: boolean;
  requiresPlan?: string;
  visible: boolean;
  children?: NavItemConfig[];
}

export interface NavSectionConfig {
  id: string;
  label?: string;
  items: NavItemConfig[];
}

export interface CenterButton {
  id: string;
  label: string;
  url: string;
  badge?: string;
  color?: "purple" | "blue" | "green" | "red" | "gray" | "cyan";
  openInNewTab?: boolean;
}

export interface HeaderConfig {
  appName?: string;
  appSubtitle?: string;
  logoUrl?: string;
  showSubtitle?: boolean;
  showUpgradeBtn?: boolean;
  showFlag?: boolean;
  centerButtons?: CenterButton[];
}

export interface FeaturedSlide {
  id: string;
  title: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  badge?: string;
  badgeColor?: string;
}

export interface UIConfig {
  navType: "sidebar" | "topbar";
  primaryColor: string;
  secondaryColor: string;
  logoText: string;
  logoUrl: string;
  sidebarSections: NavSectionConfig[];
  headerConfig?: HeaderConfig;
  featuredSlides?: FeaturedSlide[];
  updatedAt: string;
}

const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  appName: "Creatools",
  appSubtitle: "Painel do Criador",
  showSubtitle: true,
  showUpgradeBtn: true,
  showFlag: false,
  centerButtons: [
    { id: "discord", label: "Discord", url: "https://discord.gg/creatools", badge: "", color: "purple", openInNewTab: true },
  ],
};

const DEFAULT_UI_CONFIG: UIConfig = {
  navType: "sidebar",
  primaryColor: "180 100% 50%",
  secondaryColor: "333 99% 52%",
  logoText: "Creatools",
  logoUrl: "",
  sidebarSections: [
    {
      id: "main",
      items: [
        { id: "dashboard",     label: "Dashboard",    href: "/",                icon: "LayoutDashboard", visible: true },
        { id: "monitor",       label: "Monitor",      href: "/monitor/example", icon: "Activity",        matchPrefix: "/monitor",       visible: true },
        { id: "notifications", label: "Notificações", href: "/notifications",   icon: "Bell",            matchPrefix: "/notifications", visible: true },
        { id: "gift-gallery",  label: "Gift Gallery", href: "/gift-gallery",    icon: "Diamond",         visible: true },
      ],
    },
    {
      id: "streamer",
      label: "Streamer Tools",
      items: [
        { id: "overlays",     label: "Overlay Studio",   href: "/overlays",             icon: "Monitor",   matchPrefix: "/overlays",             visible: true },
        { id: "stream-tools", label: "Stream Tools",     href: "/stream-tools",         icon: "Tv2",       matchPrefix: "/stream-tools",         visible: true },
        { id: "scoreboards",  label: "Scoreboards",      href: "/scoreboards",          icon: "Trophy",    matchPrefix: "/scoreboards",          visible: true },
        { id: "minigames",    label: "Minigames",        href: "/minigames",            icon: "Gamepad2",  matchPrefix: "/minigames",            visible: true },
        { id: "lookup",       label: "Lookup",           href: "/streamer/lookup",      icon: "Search",    matchPrefix: "/streamer/lookup",      visible: true },
        { id: "bulk-check",   label: "Bulk Check",       href: "/streamer/bulk-check",  icon: "Users",     matchPrefix: "/streamer/bulk-check",  requiresPlan: "basic", visible: true },
        { id: "watchlist",    label: "Watchlist",        href: "/streamer/watchlist",   icon: "Star",      matchPrefix: "/streamer/watchlist",   visible: true },
        { id: "jwt",          label: "JWT / WebSocket",  href: "/streamer/jwt",         icon: "Key",       matchPrefix: "/streamer/jwt",         requiresPlan: "basic", visible: true },
        { id: "rate-limits",  label: "Rate Limits",      href: "/streamer/rate-limits", icon: "BarChart2", matchPrefix: "/streamer/rate-limits", visible: true },
        { id: "dev-tools",    label: "Dev Tools",        href: "/dev-tools",            icon: "Code2",     matchPrefix: "/dev-tools",            requiresPlan: "pro",   visible: true },
      ],
    },
    {
      id: "live-tools",
      label: "Live Tools",
      items: [
        { id: "live-counts",    label: "Live Counts",    href: "/live-counts",    icon: "Radio",     matchPrefix: "/live-counts",    requiresPlan: "basic", visible: true },
        { id: "live-captions",  label: "Live Captions",  href: "/live-captions",  icon: "Subtitles", matchPrefix: "/live-captions",  requiresPlan: "pro",   visible: true },
        { id: "live-analytics", label: "Live Analytics", href: "/live-analytics", icon: "BarChart2", matchPrefix: "/live-analytics", requiresPlan: "pro",   visible: true },
        { id: "webhooks",       label: "Webhooks",       href: "/webhooks",       icon: "Webhook",   matchPrefix: "/webhooks",       requiresPlan: "pro",   visible: true },
      ],
    },
    {
      id: "leaderboards",
      label: "Leaderboards",
      items: [
        { id: "leaderboards",         label: "Leagues", href: "/leaderboards",         icon: "Crown",    matchPrefix: "/leaderboards",         visible: true },
        { id: "leaderboards-country", label: "Country", href: "/leaderboards/country", icon: "Globe",    matchPrefix: "/leaderboards/country", visible: true },
        { id: "leaderboards-gaming",  label: "Gaming",  href: "/leaderboards/gaming",  icon: "Gamepad2", matchPrefix: "/leaderboards/gaming",  visible: true },
        { id: "gifters",              label: "Gifters", href: "/gifters",               icon: "Diamond",  matchPrefix: "/gifters",              visible: true },
      ],
    },
    {
      id: "account",
      items: [
        { id: "pricing",  label: "Planos",  href: "/pricing",  icon: "Tag",      visible: true },
        { id: "settings", label: "Ajustes", href: "/settings", icon: "Settings", visible: true },
      ],
    },
    {
      id: "admin",
      items: [
        { id: "admin", label: "Admin Panel", href: "/admin", icon: "Shield", adminOnly: true, visible: true },
      ],
    },
  ],
  updatedAt: new Date().toISOString(),
};

export function getDefaultUIConfig(): UIConfig {
  return { ...DEFAULT_UI_CONFIG, updatedAt: new Date().toISOString() };
}

export async function loadUIConfig(): Promise<UIConfig> {
  const rows = await db.select().from(uiConfigTable).where(eq(uiConfigTable.id, "default"));
  if (rows[0]) {
    return {
      navType: (rows[0].navType as UIConfig["navType"]) ?? "sidebar",
      primaryColor: rows[0].primaryColor,
      secondaryColor: rows[0].secondaryColor,
      logoText: rows[0].logoText,
      logoUrl: rows[0].logoUrl,
      sidebarSections: (rows[0].sidebarSections as NavSectionConfig[]) ?? [],
      headerConfig: (rows[0].headerConfig as HeaderConfig | null) ?? DEFAULT_HEADER_CONFIG,
      featuredSlides: (rows[0].featuredSlides as FeaturedSlide[] | null) ?? [],
      updatedAt: rows[0].updatedAt,
    };
  }
  await saveUIConfig(DEFAULT_UI_CONFIG);
  return DEFAULT_UI_CONFIG;
}

export async function saveUIConfig(config: UIConfig): Promise<void> {
  await db.insert(uiConfigTable).values({
    id: "default",
    navType: config.navType,
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    logoText: config.logoText,
    logoUrl: config.logoUrl,
    sidebarSections: config.sidebarSections,
    headerConfig: (config.headerConfig ?? null) as unknown,
    featuredSlides: (config.featuredSlides ?? null) as unknown,
    updatedAt: config.updatedAt,
  }).onConflictDoUpdate({
    target: uiConfigTable.id,
    set: {
      navType: config.navType,
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      logoText: config.logoText,
      logoUrl: config.logoUrl,
      sidebarSections: config.sidebarSections,
      headerConfig: (config.headerConfig ?? null) as unknown,
      featuredSlides: (config.featuredSlides ?? null) as unknown,
      updatedAt: config.updatedAt,
    },
  });
}
