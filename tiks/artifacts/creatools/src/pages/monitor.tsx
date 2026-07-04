import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useMintJwt, useGetRoomInfo, useGetGiftCatalog, getGetGiftCatalogQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle, Gift, Heart, UserPlus, Share2, Users,
  Wifi, WifiOff, Loader2, ArrowLeft, ExternalLink, RefreshCw, Diamond,
  Clock, Download, Bookmark, BookmarkCheck, TrendingUp,
  Crown, Smile, HelpCircle, Package, Zap, Shield,
  Award, Target, AlertTriangle, ShoppingBag, Trash2, Radio,
  ChevronDown, ChevronUp, Filter, X, Languages, AlignLeft,
  Swords, Bell, Star, Tv2, Hash,
  Mic, MicOff, Play, Pause, StopCircle, Flag,
  Volume2, VolumeX,
} from "lucide-react";
import { useTTSEngine } from "@/hooks/use-tts-engine";
import { useSoundAlertsEngine } from "@/hooks/use-sound-alerts-engine";
import { useEventsEngine, type OverlayAlertState } from "@/hooks/use-events-engine";
import { authFetch, useAuth } from "@/context/auth-context";

// ─── Event types ────────────────────────────────────────────────────────────
type EventType =
  // Core interaction
  | "chat" | "gift" | "like" | "member" | "follow" | "share"
  | "subscribe" | "emoteChat" | "questionNew" | "envelopeOpen"
  | "unauthedGift"
  // Battles & rankings
  | "linkMicBattle" | "linkMicArmies" | "battleArmies"
  | "rankUpdate" | "hourlyRankUpdate" | "goalUpdate"
  // Stream lifecycle
  | "liveIntro" | "streamEnd" | "streamPaused" | "streamResumed"
  // Captions & translations
  | "caption" | "translation"
  // Moderation
  | "imDelete" | "msgDetect" | "controlMessage" | "moderatorBadge"
  // Shopping & monetization
  | "oecLiveShoppingInfo" | "productOffer" | "productClick"
  // Community & system
  | "communityMessage" | "barrageInfo" | "systemMessage"
  | "poke" | "noticeMessage" | "roomInfo" | "roomUserSeq" | string;

interface LiveEvent {
  id: string;
  event: EventType;
  timestamp: Date;
  user?: { nickname?: string; uniqueId?: string; payGrade?: number; level?: number };
  comment?: string;
  giftName?: string;
  giftId?: string;
  repeatCount?: number;
  diamondCount?: number;
  likeCount?: number;
  // subscribe
  subMonth?: number;
  newSubscriber?: boolean;
  // emoteChat
  emotes?: Array<{ name?: string; emoteId?: string }>;
  // questionNew
  question?: string;
  // envelopeOpen
  treasureCount?: number;
  // linkMicBattle / battleArmies
  battleStatus?: number;
  armies?: Array<{ hostUserId: string; points: number }>;
  // rankUpdate / hourlyRankUpdate
  rank?: number;
  // goalUpdate
  goalTitle?: string;
  goalProgress?: number;
  // liveIntro
  introTitle?: string;
  // shopping
  productTitle?: string;
  productId?: string;
  // caption / translation
  captionText?: string;
  language?: string;
  translatedText?: string;
  originalText?: string;
  // poke
  targetUser?: { nickname?: string; uniqueId?: string };
  // controlMessage / systemMessage / noticeMessage
  messageText?: string;
  action?: string;
  // raw fallback
  rawData?: Record<string, unknown>;
}

interface TopGifter { userId: string; nickname: string; diamonds: number; giftCount: number; }
interface GiftTally { name: string; icon: string; count: number; totalDiamonds: number; }
type ConnStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

// ─── Gift overlay types & constants ──────────────────────────────────────────
interface ComboOverlay {
  key: string;
  giftName: string;
  giftIcon?: string;
  count: number;
  totalDiamonds: number;
  isEnigma: boolean;
  isLuva: boolean;
  isFamous: boolean;
}
interface TapHeart { id: string; x: number; }

const ENIGMA_GIFTS = new Set([
  "enigma", "anonymous", "mystery box", "mystery", "question mark", "unknown",
]);
const LUVA_GIFTS = new Set([
  "boxing glove", "luva", "glove", "guante", "handschuh", "gant", "punch",
]);
const FAMOUS_GIFTS = new Set([
  "lion", "universe", "tiktok universe", "rose", "sunglasses", "interstellar",
  "tiger", "diamond", "gimme", "planet", "boxing glove", "luva", "glove",
  "enigma", "anonymous", "dj on stage", "concert", "sports car", "private jet",
  "castle", "crown", "galaxy", "perfume", "go go", "gamer", "space explorer",
  "drama queen", "vip entrance", "butterfly", "hearts", "magic wand",
]);

// Diamond threshold for "famous" flash (≥ 500 diamonds per repeat unit)
const FAMOUS_DIAMOND_THRESHOLD = 500;

// Emoji map for special gifts
function getGiftEmoji(name: string): string {
  const n = name.toLowerCase();
  if (ENIGMA_GIFTS.has(n)) return "🎭";
  if (LUVA_GIFTS.has(n)) return "🥊";
  if (n.includes("lion")) return "🦁";
  if (n.includes("rose")) return "🌹";
  if (n.includes("universe") || n.includes("galaxy") || n.includes("planet") || n.includes("interstellar")) return "🌌";
  if (n.includes("crown") || n.includes("queen") || n.includes("king")) return "👑";
  if (n.includes("diamond")) return "💎";
  if (n.includes("tiger")) return "🐯";
  if (n.includes("butterfly")) return "🦋";
  if (n.includes("dragon")) return "🐉";
  if (n.includes("rocket") || n.includes("space")) return "🚀";
  if (n.includes("car") || n.includes("sport")) return "🏎️";
  if (n.includes("jet") || n.includes("plane")) return "✈️";
  if (n.includes("castle")) return "🏰";
  if (n.includes("concert") || n.includes("dj")) return "🎵";
  return "🎁";
}

// ─── Event metadata ──────────────────────────────────────────────────────────
const EVENT_META: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  // ── Core interactions ──────────────────────────────────────────────────────
  chat:               { color: "text-cyan-400",         bg: "bg-cyan-400/10",       icon: MessageCircle, label: "CHAT" },
  gift:               { color: "text-yellow-400",       bg: "bg-yellow-400/10",     icon: Gift,          label: "GIFT" },
  unauthedGift:       { color: "text-yellow-600",       bg: "bg-yellow-600/10",     icon: Gift,          label: "GIFT?" },
  like:               { color: "text-pink-400",         bg: "bg-pink-400/10",       icon: Heart,         label: "LIKE" },
  member:             { color: "text-green-400",        bg: "bg-green-400/10",      icon: UserPlus,      label: "JOIN" },
  follow:             { color: "text-violet-400",       bg: "bg-violet-400/10",     icon: UserPlus,      label: "FOLLOW" },
  share:              { color: "text-blue-400",         bg: "bg-blue-400/10",       icon: Share2,        label: "SHARE" },
  subscribe:          { color: "text-amber-400",        bg: "bg-amber-400/10",      icon: Crown,         label: "SUB" },
  emoteChat:          { color: "text-purple-400",       bg: "bg-purple-400/10",     icon: Smile,         label: "EMOTE" },
  questionNew:        { color: "text-sky-400",          bg: "bg-sky-400/10",        icon: HelpCircle,    label: "QUESTION" },
  envelopeOpen:       { color: "text-orange-400",       bg: "bg-orange-400/10",     icon: Package,       label: "ENVELOPE" },
  poke:               { color: "text-pink-300",         bg: "bg-pink-300/10",       icon: Zap,           label: "POKE" },
  // ── Battles & rankings ─────────────────────────────────────────────────────
  linkMicBattle:      { color: "text-rose-400",         bg: "bg-rose-400/10",       icon: Swords,        label: "BATTLE" },
  linkMicArmies:      { color: "text-red-400",          bg: "bg-red-400/10",        icon: Shield,        label: "ARMIES" },
  battleArmies:       { color: "text-red-300",          bg: "bg-red-300/10",        icon: Shield,        label: "BATTLE ARMIES" },
  rankUpdate:         { color: "text-indigo-400",       bg: "bg-indigo-400/10",     icon: TrendingUp,    label: "RANK" },
  hourlyRankUpdate:   { color: "text-indigo-300",       bg: "bg-indigo-300/10",     icon: Award,         label: "HOURLY RANK" },
  goalUpdate:         { color: "text-lime-400",         bg: "bg-lime-400/10",       icon: Target,        label: "GOAL" },
  // ── Stream lifecycle ───────────────────────────────────────────────────────
  liveIntro:          { color: "text-teal-400",         bg: "bg-teal-400/10",       icon: Tv2,           label: "INTRO" },
  streamEnd:          { color: "text-destructive",      bg: "bg-destructive/10",    icon: StopCircle,    label: "STREAM END" },
  streamPaused:       { color: "text-amber-600",        bg: "bg-amber-600/10",      icon: Pause,         label: "PAUSED" },
  streamResumed:      { color: "text-green-500",        bg: "bg-green-500/10",      icon: Play,          label: "RESUMED" },
  // ── Captions & translations ────────────────────────────────────────────────
  caption:            { color: "text-sky-300",          bg: "bg-sky-300/10",        icon: AlignLeft,     label: "CAPTION" },
  translation:        { color: "text-violet-300",       bg: "bg-violet-300/10",     icon: Languages,     label: "TRANSLATE" },
  // ── Shopping & monetization ────────────────────────────────────────────────
  oecLiveShoppingInfo:{ color: "text-emerald-400",      bg: "bg-emerald-400/10",    icon: ShoppingBag,   label: "SHOPPING" },
  productOffer:       { color: "text-green-400",        bg: "bg-green-400/10",      icon: ShoppingBag,   label: "OFFER" },
  productClick:       { color: "text-teal-300",         bg: "bg-teal-300/10",       icon: Hash,          label: "PROD CLICK" },
  // ── Moderation ─────────────────────────────────────────────────────────────
  imDelete:           { color: "text-muted-foreground", bg: "bg-muted/20",          icon: Trash2,        label: "DELETED" },
  msgDetect:          { color: "text-yellow-600",       bg: "bg-yellow-600/10",     icon: AlertTriangle, label: "MOD" },
  controlMessage:     { color: "text-orange-500",       bg: "bg-orange-500/10",     icon: Flag,          label: "CONTROL" },
  moderatorBadge:     { color: "text-yellow-500",       bg: "bg-yellow-500/10",     icon: Star,          label: "MOD BADGE" },
  // ── Community & system ─────────────────────────────────────────────────────
  communityMessage:   { color: "text-cyan-300",         bg: "bg-cyan-300/10",       icon: MessageCircle, label: "COMMUNITY" },
  barrageInfo:        { color: "text-fuchsia-400",      bg: "bg-fuchsia-400/10",    icon: Radio,         label: "BARRAGE" },
  systemMessage:      { color: "text-muted-foreground", bg: "bg-muted/30",          icon: Bell,          label: "SYSTEM" },
  noticeMessage:      { color: "text-cyan-500",         bg: "bg-cyan-500/10",       icon: Bell,          label: "NOTICE" },
  // ── Mic events ─────────────────────────────────────────────────────────────
  micBattleStart:     { color: "text-rose-300",         bg: "bg-rose-300/10",       icon: Mic,           label: "MIC BATTLE" },
  micBattleEnd:       { color: "text-rose-200",         bg: "bg-rose-200/10",       icon: MicOff,        label: "MIC END" },
};

const SILENT_EVENTS = new Set(["roomInfo", "roomUserSeq"]);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatEvent(ev: LiveEvent): string {
  switch (ev.event) {
    case "chat":
      return ev.comment || "";
    case "emoteChat":
      return [
        ev.emotes?.map((e) => e.name || "").filter(Boolean).join(" ") || "",
        ev.comment || "",
      ].filter(Boolean).join(" · ") || "sent an emote";
    case "gift":
    case "unauthedGift":
      return `sent ${ev.giftName || "a gift"}${(ev.repeatCount ?? 1) > 1 ? ` ×${ev.repeatCount}` : ""}${ev.diamondCount ? ` — ${ev.diamondCount.toLocaleString()} 💎` : ""}`;
    case "like":
      return `liked ×${ev.likeCount || 1}`;
    case "member":
      return "joined the stream";
    case "follow":
      return "followed";
    case "share":
      return "shared the stream";
    case "subscribe":
      return ev.newSubscriber
        ? `subscribed for the first time${ev.subMonth ? ` (month ${ev.subMonth})` : ""}!`
        : `renewed subscription${ev.subMonth ? ` (month ${ev.subMonth})` : ""}`;
    case "questionNew":
      return ev.question ? `"${ev.question}"` : "asked a question";
    case "envelopeOpen":
      return `opened a lucky envelope${ev.treasureCount ? ` — ${ev.treasureCount} treasures` : ""}${ev.diamondCount ? `, ${ev.diamondCount} 💎` : ""}`;
    case "linkMicBattle":
      if (ev.battleStatus === 1) return "Link Mic Battle started!";
      if (ev.battleStatus === 2) return "Link Mic Battle ended";
      return "Link Mic Battle event";
    case "linkMicArmies":
      return "Army battle scores updated";
    case "liveIntro":
      return ev.introTitle ? `"${ev.introTitle}"` : "Stream intro updated";
    case "rankUpdate":
      return ev.rank != null ? `Stream reached rank #${ev.rank}` : "Ranking updated";
    case "hourlyRankUpdate":
      return ev.rank != null ? `Hourly rank: #${ev.rank}` : "Hourly rank updated";
    case "goalUpdate":
      return [ev.goalTitle, ev.goalProgress != null ? `${ev.goalProgress}%` : ""].filter(Boolean).join(" — ") || "Goal updated";
    case "streamEnd":
      return "Stream has ended";
    case "barrageInfo":
      return "Barrage event";
    case "oecLiveShoppingInfo":
      return ev.productTitle ? `Product: ${ev.productTitle}` : "Live shopping event";
    case "imDelete":
      return "Message deleted by moderator";
    case "msgDetect":
      return "Message flagged by moderation";
    case "communityMessage":
      return ev.comment || "Community message";
    // ── Battles ──
    case "battleArmies":
      return ev.armies?.length
        ? ev.armies.map((a) => `${a.points} pts`).join(" vs ") + " (battle update)"
        : "Army battle scores updated";
    // ── Stream lifecycle ──
    case "streamPaused":
      return ev.messageText || "Stream paused";
    case "streamResumed":
      return ev.messageText || "Stream resumed";
    // ── Captions & translations ──
    case "caption":
      return ev.captionText
        ? `"${ev.captionText}"${ev.language ? ` [${ev.language}]` : ""}`
        : "Caption event";
    case "translation":
      return ev.translatedText
        ? `"${ev.translatedText}"${ev.language ? ` → ${ev.language}` : ""}${ev.originalText ? ` (from: "${ev.originalText}")` : ""}`
        : "Translation event";
    // ── Shopping ──
    case "productOffer":
      return ev.productTitle ? `Offer: ${ev.productTitle}` : "Product offered";
    case "productClick":
      return ev.productTitle ? `Clicked: ${ev.productTitle}` : "Product clicked";
    // ── Moderation ──
    case "controlMessage":
      return ev.action ? `Action: ${ev.action}` : ev.messageText || "Control message";
    case "moderatorBadge":
      return "Moderator badge awarded";
    // ── Community & system ──
    case "systemMessage":
      return ev.messageText || "System message";
    case "noticeMessage":
      return ev.messageText || "Notice from host";
    case "poke":
      return ev.targetUser
        ? `poked @${ev.targetUser.nickname || ev.targetUser.uniqueId || "someone"}`
        : "poked";
    // ── Mic events ──
    case "micBattleStart":
      return "Mic battle started!";
    case "micBattleEnd":
      return "Mic battle ended";
    default:
      return ev.messageText || ev.comment || "";
  }
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function diamondsToUsd(d: number): string { return (d / 200).toFixed(2); }

interface WatchlistEntry {
  uniqueId: string; addedAt: string;
  lastStatus: "live" | "offline" | "unknown";
  lastViewerCount: number | null;
  lastTitle: string | null; lastChecked: string | null;
}

function loadWatchlist(): WatchlistEntry[] {
  try { return JSON.parse(localStorage.getItem("creatools_watchlist") || "[]") as WatchlistEntry[]; }
  catch { return []; }
}
function saveWatchlistEntry(uniqueId: string, viewers: number | null) {
  const list = loadWatchlist();
  if (!list.find((e) => e.uniqueId === uniqueId)) {
    list.push({ uniqueId, addedAt: new Date().toISOString(), lastStatus: "live", lastViewerCount: viewers, lastTitle: null, lastChecked: new Date().toISOString() });
    localStorage.setItem("creatools_watchlist", JSON.stringify(list));
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Monitor() {
  const { username } = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const [searchInput, setSearchInput] = useState(username || "");
  const [activeUsername, setActiveUsername] = useState(username || "");

  // Sync search input and active username when route param changes
  useEffect(() => {
    if (username && username !== activeUsernameRef.current) {
      setSearchInput(username);
      setActiveUsername(username);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connStatus, setConnStatus] = useState<ConnStatus>("idle");
  const [viewerCount, setViewerCount] = useState<number | null>(null);
  const [totalDiamonds, setTotalDiamonds] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [topGifters, setTopGifters] = useState<TopGifter[]>([]);

  const [peakViewers, setPeakViewers] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);
  const [giftTally, setGiftTally] = useState<Record<string, GiftTally>>({});

  // Overlay state
  const [activeCombo, setActiveCombo] = useState<ComboOverlay | null>(null);
  const [tapHearts, setTapHearts] = useState<TapHeart[]>([]);
  const [giftFlash, setGiftFlash] = useState<{ key: string; emoji: string; name: string; diamonds: number } | null>(null);
  const [comboAnimKey, setComboAnimKey] = useState(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const giftFlashTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const likeFloodRef = useRef<{ count: number; timer?: ReturnType<typeof setTimeout> }>({ count: 0 });

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const sessionStartRef = useRef<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeUsernameRef = useRef(activeUsername);
  activeUsernameRef.current = activeUsername;

  // TTS & sound alerts engines
  const ttsEngine = useTTSEngine();
  const soundEngine = useSoundAlertsEngine();
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem("creatools_tts_config") || "{}").enabled === true; }
    catch { return false; }
  });
  // Stable refs so WS handler (memoized) can always access latest handlers
  const ttsHandleRef = useRef(ttsEngine.handleEvent);
  ttsHandleRef.current = ttsEngine.handleEvent;
  const soundHandleRef = useRef(soundEngine.handleEvent);
  soundHandleRef.current = soundEngine.handleEvent;

  // Events engine (automation rules) — must be declared before stable ref
  const { token: authToken } = useAuth();
  const [eventsAlert, setEventsAlert] = useState<OverlayAlertState | null>(null);
  const [eventsMessage, setEventsMessage] = useState<{ text: string; until: number } | null>(null);
  const eventsAlertTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const eventsMessageTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [eventsOverlayColor, setEventsOverlayColor] = useState<string | null>(null);
  const eventsOverlayColorTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const eventsEngine = useEventsEngine({
    onOverlayAlert: (alert) => {
      setEventsAlert(alert);
      clearTimeout(eventsAlertTimerRef.current);
      eventsAlertTimerRef.current = setTimeout(() => setEventsAlert(null), alert.duration);
    },
    onDisplayMessage: (msg, duration) => {
      setEventsMessage({ text: msg, until: Date.now() + duration });
      clearTimeout(eventsMessageTimerRef.current);
      eventsMessageTimerRef.current = setTimeout(() => setEventsMessage(null), duration);
    },
    onOverlayColor: (color) => {
      setEventsOverlayColor(color);
      clearTimeout(eventsOverlayColorTimerRef.current);
      eventsOverlayColorTimerRef.current = setTimeout(() => setEventsOverlayColor(null), 3000);
    },
  });

  // Stable ref for events engine handler (must be after eventsEngine)
  const eventsEngineHandleRef = useRef(eventsEngine.handleEvent);
  eventsEngineHandleRef.current = eventsEngine.handleEvent;
  const viewerCountRef = useRef<number | null>(null);

  // Load rules whenever monitor mounts and user is authenticated
  useEffect(() => {
    if (!authToken) return;
    authFetch("/events/rules", authToken)
      .then((data: unknown) => {
        const d = data as { rules?: import("@/hooks/use-events-engine").EventRule[] };
        if (d.rules) eventsEngine.setRules(d.rules);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  // Reset first-chat tracking on new session
  useEffect(() => {
    eventsEngine.resetSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUsername]);

  const mintJwt = useMintJwt();
  const roomInfo = useGetRoomInfo();
  const { data: giftCatalog } = useGetGiftCatalog({ query: { queryKey: getGetGiftCatalogQueryKey() } });

  const giftIconMap = useRef<Record<string, string>>({});
  const giftDiamondMap = useRef<Record<string, number>>({});
  useEffect(() => {
    if (giftCatalog) {
      for (const g of giftCatalog) {
        giftIconMap.current[g.name.toLowerCase()] = g.iconUrl;
        giftDiamondMap.current[g.name.toLowerCase()] = g.diamondCount;
      }
    }
  }, [giftCatalog]);

  // Session timer
  useEffect(() => {
    if (connStatus === "connected") {
      timerRef.current = setInterval(() => {
        if (sessionStartRef.current) setSessionDuration(Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [connStatus]);

  useEffect(() => {
    viewerCountRef.current = viewerCount;
    if (viewerCount !== null && viewerCount > peakViewers) setPeakViewers(viewerCount);
  }, [viewerCount, peakViewers]);

  useEffect(() => {
    if (activeUsername) setInWatchlist(loadWatchlist().some((e) => e.uniqueId === activeUsername));
  }, [activeUsername]);

  const addEvent = useCallback((ev: LiveEvent) => {
    setEvents((prev) => [ev, ...prev].slice(0, 500));
  }, []);

  const updateTopGifters = useCallback((userId: string, nickname: string, diamonds: number) => {
    setTopGifters((prev) => {
      const existing = prev.find((g) => g.userId === userId);
      if (existing) {
        return prev
          .map((g) => g.userId === userId ? { ...g, diamonds: g.diamonds + diamonds, giftCount: g.giftCount + 1 } : g)
          .sort((a, b) => b.diamonds - a.diamonds).slice(0, 10);
      }
      return [...prev, { userId, nickname, diamonds, giftCount: 1 }]
        .sort((a, b) => b.diamonds - a.diamonds).slice(0, 10);
    });
  }, []);

  const updateGiftTally = useCallback((giftName: string, diamonds: number) => {
    const key = giftName.toLowerCase();
    const icon = giftIconMap.current[key] || "";
    setGiftTally((prev) => {
      const existing = prev[key];
      if (existing) return { ...prev, [key]: { ...existing, count: existing.count + 1, totalDiamonds: existing.totalDiamonds + diamonds } };
      return { ...prev, [key]: { name: giftName, icon, count: 1, totalDiamonds: diamonds } };
    });
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null; }
    clearTimeout(comboTimerRef.current);
    clearTimeout(giftFlashTimerRef.current);
    clearTimeout(likeFloodRef.current.timer);
    setConnStatus("disconnected");
  }, []);

  const connect = useCallback((user: string, token: string) => {
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null; }
    setConnStatus("connecting");
    sessionStartRef.current = new Date();
    setSessionDuration(0);
    setPeakViewers(0);
    setGiftTally({});

    const ws = new WebSocket(`wss://api.tik.tools?uniqueId=${encodeURIComponent(user)}&jwtKey=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => setConnStatus("connected");

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as { event: string; data?: Record<string, unknown> };
        const d = (msg.data || {}) as Record<string, unknown>;

        // Silent metadata events — viewer count update fires engine for viewer_count trigger
        if (msg.event === "roomUserSeq") {
          const newCount = (d.viewerCount as number) ?? null;
          setViewerCount(newCount);
          viewerCountRef.current = newCount;
          eventsEngineHandleRef.current({
            event: "roomUserSeq",
            viewerCount: newCount,
          }).catch(() => {});
          return;
        }
        if (SILENT_EVENTS.has(msg.event)) return;

        // Compute diamonds for gift events
        let diamonds = (d.diamondCount as number) ?? 0;
        const giftKey = ((d.giftName as string) || "").toLowerCase();
        if ((msg.event === "gift" || msg.event === "unauthedGift") && !diamonds && giftKey) {
          const catalogDiamonds = giftDiamondMap.current[giftKey] ?? 0;
          const repeat = (d.repeatCount as number) ?? 1;
          diamonds = catalogDiamonds * repeat;
        }
        if (msg.event === "envelopeOpen") {
          diamonds = (d.diamonds as number) ?? (d.diamondCount as number) ?? 0;
        }

        // Extract user
        const user = d.user as LiveEvent["user"] | undefined;

        const ev: LiveEvent = {
          id: `${Date.now()}-${Math.random()}`,
          event: msg.event,
          timestamp: new Date(),
          user,
          comment: d.comment as string | undefined,
          giftName: d.giftName as string | undefined,
          giftId: d.giftId as string | undefined,
          repeatCount: d.repeatCount as number | undefined,
          diamondCount: diamonds || undefined,
          likeCount: d.likeCount as number | undefined,
          // subscribe
          subMonth: d.subMonth as number | undefined,
          newSubscriber: d.newSubscriber as boolean | undefined,
          // emoteChat
          emotes: d.emotes as LiveEvent["emotes"],
          // questionNew
          question: d.question as string | undefined ??
            (d.questionDetails as { question?: string } | undefined)?.question,
          // envelopeOpen
          treasureCount: d.treasureCount as number | undefined,
          // linkMicBattle / battleArmies
          battleStatus: d.battleStatus as number | undefined,
          armies: d.armies as LiveEvent["armies"],
          // rank
          rank: d.rank as number | undefined,
          // goalUpdate
          goalTitle: (d.goal as { title?: string } | undefined)?.title,
          goalProgress: (d.goal as { progress?: number } | undefined)?.progress,
          // liveIntro
          introTitle: d.title as string | undefined,
          // shopping
          productTitle: (d.product as { title?: string } | undefined)?.title ??
            (d.productInfo as { title?: string } | undefined)?.title ?? d.productTitle as string | undefined,
          productId: (d.product as { id?: string } | undefined)?.id ?? d.productId as string | undefined,
          // caption
          captionText: d.text as string | undefined ?? d.captionText as string | undefined,
          language: d.language as string | undefined,
          // translation
          translatedText: d.translatedText as string | undefined,
          originalText: d.originalText as string | undefined,
          // poke
          targetUser: d.targetUser as LiveEvent["targetUser"],
          // controlMessage / systemMessage / noticeMessage
          messageText: d.message as string | undefined ?? d.messageText as string | undefined ??
            (msg.event !== "caption" ? d.text as string | undefined : undefined),
          action: d.action as string | undefined,
          rawData: d,
        };

        // Aggregations
        if (msg.event === "like") setTotalLikes((n) => n + ((d.likeCount as number) || 1));
        if ((msg.event === "gift" || msg.event === "unauthedGift") && diamonds > 0) {
          setTotalDiamonds((n) => n + diamonds);
          const uid = user?.uniqueId || "unknown";
          const nick = user?.nickname || uid;
          updateTopGifters(uid, nick, diamonds);
          if (d.giftName) updateGiftTally(d.giftName as string, diamonds);
        }

        addEvent(ev);

        // TTS + sound alerts
        const userName = ev.user?.nickname || ev.user?.uniqueId || "alguém";
        ttsHandleRef.current(ev.event, {
          user: userName,
          gift: ev.giftName || "gift",
          count: String(ev.repeatCount || 1),
          diamonds: String(ev.diamondCount || 0),
          message: ev.comment || "",
        });
        soundHandleRef.current(ev.event, ev.diamondCount || 0);

        // Events engine (automation rules)
        eventsEngineHandleRef.current({
          event: ev.event,
          user: ev.user,
          comment: ev.comment,
          giftName: ev.giftName,
          giftImageUrl: (d.giftPictureUrl as string) || (d.giftImageUrl as string) || undefined,
          diamondCount: ev.diamondCount,
          repeatCount: ev.repeatCount,
          likeCount: ev.likeCount,
          viewerCount: viewerCountRef.current,
        }).catch(() => {});
      } catch {}
    };

    ws.onclose = () => {
      setConnStatus("disconnected");
      wsRef.current = null;
      reconnectTimer.current = setTimeout(() => startConnection(activeUsernameRef.current), 5000);
    };

    ws.onerror = () => setConnStatus("error");
  }, [addEvent, updateTopGifters, updateGiftTally]);

  const startConnection = useCallback((user: string) => {
    if (!user) return;
    setConnStatus("connecting");
    mintJwt.mutate(
      { data: { uniqueId: user } },
      {
        onSuccess: (data) => { connect(user, data.token); roomInfo.mutate({ data: { uniqueId: user } }); },
        onError: () => setConnStatus("error"),
      }
    );
  }, [mintJwt, connect, roomInfo]);

  // Reload TTS & sound configs whenever monitor mounts (user may have updated settings)
  useEffect(() => {
    ttsEngine.reloadConfig();
    soundEngine.reloadAlerts();
    setTtsEnabled(ttsEngine.configRef.current.enabled);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeUsername) {
      setEvents([]); setTotalDiamonds(0); setTotalLikes(0);
      setTopGifters([]); setViewerCount(null);
      startConnection(activeUsername);
    }
    return () => { disconnect(); };
  }, [activeUsername]);

  const handleMonitor = (e: React.FormEvent) => {
    e.preventDefault();
    const user = searchInput.trim().replace(/^@/, "");
    if (!user) return;
    setLocation(`/monitor/${user}`);
    setActiveUsername(user);
  };

  const handleExport = () => {
    const top5 = topGifters.slice(0, 5).map((g, i) => `  ${i + 1}. ${g.nickname} — ${g.diamonds.toLocaleString()} 💎`).join("\n");
    const eventTypes = Object.keys(EVENT_META);
    const breakdown = eventTypes
      .map((k) => { const c = events.filter((e) => e.event === k).length; return c > 0 ? `  ${EVENT_META[k].label.padEnd(14)} ${c}` : ""; })
      .filter(Boolean).join("\n");

    const summary = [
      "📊 Creatools Session Summary",
      "─".repeat(36),
      `Streamer:     @${activeUsername}`,
      `Duration:     ${formatDuration(sessionDuration)}`,
      `Peak Viewers: ${peakViewers.toLocaleString()}`,
      `Diamonds:     ${totalDiamonds.toLocaleString()} (~$${diamondsToUsd(totalDiamonds)} USD)`,
      `Likes:        ${totalLikes.toLocaleString()}`,
      `Events:       ${events.length}`,
      "",
      "Top Gifters:",
      top5 || "  (none)",
      "",
      "Event Breakdown:",
      breakdown || "  (none)",
      "",
      `Generated by Creatools · ${new Date().toLocaleString()}`,
    ].join("\n");

    void navigator.clipboard.writeText(summary);
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };

  const toggleFilter = (key: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Events that actually appeared in this session
  const seenEventTypes = [...new Set(events.map((e) => e.event))].filter((t) => !SILENT_EVENTS.has(t));

  const filteredEvents = activeFilters.size === 0
    ? events
    : events.filter((e) => activeFilters.has(e.event));

  const statusConfig = {
    idle:         { label: "Idle",           color: "text-muted-foreground", dot: "bg-muted-foreground" },
    connecting:   { label: "Connecting...",  color: "text-yellow-400",       dot: "bg-yellow-400 animate-pulse" },
    connected:    { label: "LIVE",           color: "text-green-400",        dot: "bg-green-400 animate-pulse" },
    disconnected: { label: "Reconnecting…", color: "text-orange-400",       dot: "bg-orange-400 animate-pulse" },
    error:        { label: "Error",          color: "text-destructive",      dot: "bg-destructive" },
  };
  const status = statusConfig[connStatus];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Events engine overlay color flash */}
      {eventsOverlayColor && (
        <div
          className="fixed inset-0 z-40 pointer-events-none animate-in fade-in duration-150"
          style={{ boxShadow: `inset 0 0 80px 20px ${eventsOverlayColor}55`, border: `2px solid ${eventsOverlayColor}88` }}
        />
      )}
      {/* Events engine overlay alerts */}
      {eventsAlert && (
        <div
          className="fixed top-6 right-6 z-50 flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-right-4 duration-300 max-w-sm"
          style={{ background: "#1a1625", border: `1px solid ${eventsAlert.color}40`, boxShadow: `0 0 24px ${eventsAlert.color}20` }}
        >
          <span className="text-2xl shrink-0 mt-0.5">{eventsAlert.icon}</span>
          <div>
            <p className="text-sm font-semibold text-white">{eventsAlert.title}</p>
            {eventsAlert.message && <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>{eventsAlert.message}</p>}
          </div>
          <button onClick={() => setEventsAlert(null)} className="shrink-0 p-1 rounded hover:bg-white/10" style={{ color: "rgba(255,255,255,0.4)" }}>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      {eventsMessage && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl animate-in fade-in duration-200 text-sm font-medium text-white text-center shadow-2xl max-w-md"
          style={{ background: "rgba(26,22,37,0.95)", border: "1px solid rgba(168,85,247,0.3)" }}
        >
          {eventsMessage.text}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="w-fit">
          <ArrowLeft className="w-4 h-4 mr-2" />Dashboard
        </Button>

        <form onSubmit={handleMonitor} className="flex gap-2 flex-1 max-w-lg">
          <Input
            placeholder="TikTok username..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="font-mono text-sm bg-card border-border"
          />
          <Button type="submit" disabled={!searchInput.trim() || connStatus === "connecting"}>
            {connStatus === "connecting" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Monitor"}
          </Button>
        </form>

        {activeUsername && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`flex items-center gap-1.5 text-sm font-medium ${status.color}`}>
              <span className={`w-2 h-2 rounded-full ${status.dot}`} />{status.label}
            </span>
            {connStatus === "connected" && (
              <span className="text-xs font-mono text-muted-foreground bg-muted/30 rounded px-1.5 py-0.5">
                <Clock className="w-3 h-3 inline mr-1" />{formatDuration(sessionDuration)}
              </span>
            )}
            {(connStatus === "disconnected" || connStatus === "error") && (
              <Button size="sm" variant="outline" onClick={() => startConnection(activeUsername)}>
                <RefreshCw className="w-3 h-3 mr-1" />Retry
              </Button>
            )}
            {connStatus === "connected" && (
              <Button size="sm" variant="outline" onClick={disconnect}>Disconnect</Button>
            )}
            {/* TTS quick toggle */}
            <button
              onClick={() => {
                ttsEngine.reloadConfig();
                const next = !ttsEngine.configRef.current.enabled;
                const updated = { ...ttsEngine.configRef.current, enabled: next };
                localStorage.setItem("creatools_tts_config", JSON.stringify(updated));
                ttsEngine.reloadConfig();
                setTtsEnabled(next);
                if (!next) ttsEngine.stopAll();
              }}
              title={ttsEnabled ? "TTS ativo — clique para desativar" : "TTS desativado — clique para ativar"}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all"
              style={{
                background: ttsEnabled ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.05)",
                color: ttsEnabled ? "#a78bfa" : "rgba(255,255,255,0.3)",
                border: `1px solid ${ttsEnabled ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              TTS
            </button>
          </div>
        )}
      </div>

      {activeUsername ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left sidebar ── */}
          <div className="space-y-4">
            {/* Stream info */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stream Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {roomInfo.data ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-border">
                        <AvatarImage src={roomInfo.data.owner?.profilePictureUrl || ""} />
                        <AvatarFallback className="text-xs">{activeUsername.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm">{roomInfo.data.owner?.nickname || activeUsername}</div>
                        <div className="text-xs text-muted-foreground font-mono">@{roomInfo.data.owner?.uniqueId || activeUsername}</div>
                      </div>
                    </div>
                    {roomInfo.data.title && (
                      <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2 leading-relaxed">{roomInfo.data.title}</p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-1"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-16" /></div>
                  </div>
                )}
                <a href={`https://tiktok.com/@${activeUsername}/live`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="w-3 h-3" />Open on TikTok
                </a>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Users,      color: "text-cyan-400",   value: viewerCount !== null ? viewerCount.toLocaleString() : "—", label: "Viewers" },
                { icon: TrendingUp, color: "text-cyan-300",   value: peakViewers > 0 ? peakViewers.toLocaleString() : "—", label: "Peak" },
                { icon: Heart,      color: "text-pink-400",   value: totalLikes.toLocaleString(), label: "Likes" },
                { icon: Clock,      color: "text-violet-400", value: formatDuration(sessionDuration), label: "Duration" },
              ].map(({ icon: Icon, color, value, label }) => (
                <Card key={label} className="bg-card border-border">
                  <CardContent className="p-3 text-center">
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                    <div className={`text-sm font-bold font-mono leading-tight ${color}`}>{value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </CardContent>
                </Card>
              ))}
              <Card className="bg-card border-border col-span-2">
                <CardContent className="p-3 text-center">
                  <Diamond className="w-4 h-4 mx-auto mb-1 text-yellow-400" />
                  <div className="text-sm font-bold font-mono text-yellow-400 leading-tight">
                    {totalDiamonds.toLocaleString()}
                    <span className="text-xs text-muted-foreground ml-1.5 font-normal">≈ ${diamondsToUsd(totalDiamonds)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Diamonds (est. revenue)</div>
                </CardContent>
              </Card>
            </div>

            {/* Session actions */}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={handleExport}>
                {exportCopied
                  ? <><BookmarkCheck className="w-3 h-3 mr-1.5 text-green-400" />Copied!</>
                  : <><Download className="w-3 h-3 mr-1.5" />Export</>}
              </Button>
              <Button size="sm" variant="outline"
                className={`flex-1 text-xs h-8 ${inWatchlist ? "text-primary border-primary/50" : ""}`}
                onClick={() => { saveWatchlistEntry(activeUsername, viewerCount); setInWatchlist(true); }}
                disabled={inWatchlist}>
                {inWatchlist ? <><BookmarkCheck className="w-3 h-3 mr-1.5" />Watchlisted</> : <><Bookmark className="w-3 h-3 mr-1.5" />Watchlist</>}
              </Button>
            </div>

            {/* Event breakdown */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Event Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pt-0">
                {seenEventTypes.length === 0 ? (
                  <p className="text-xs text-muted-foreground/50">No events yet</p>
                ) : seenEventTypes.map((key) => {
                  const meta = EVENT_META[key];
                  const count = events.filter((e) => e.event === key).length;
                  if (!meta || !count) return null;
                  const Icon = meta.icon;
                  return (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className={`flex items-center gap-1.5 ${meta.color}`}>
                        <Icon className="w-3 h-3" />{meta.label}
                      </span>
                      <span className="font-mono text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Top Gifters */}
            {topGifters.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Diamond className="w-3 h-3 text-yellow-400" />Top Gifters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {topGifters.map((gifter, i) => (
                    <div key={gifter.userId} className="flex items-center gap-2 text-xs">
                      <span className={`w-4 font-mono font-bold shrink-0 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                      <span className="flex-1 truncate text-foreground/90">{gifter.nickname}</span>
                      <span className="font-mono text-yellow-400 shrink-0">{gifter.diamonds.toLocaleString()} 💎</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Gift tally */}
            {Object.keys(giftTally).length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Gift className="w-3 h-3 text-yellow-400" />Gift Tally
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 pt-0">
                  {Object.values(giftTally)
                    .sort((a, b) => b.totalDiamonds - a.totalDiamonds)
                    .slice(0, 8)
                    .map((g) => (
                      <div key={g.name} className="flex items-center gap-2 text-xs">
                        {g.icon ? (
                          <img src={g.icon} alt={g.name} className="w-4 h-4 object-contain shrink-0" />
                        ) : (
                          <Gift className="w-3 h-3 text-yellow-400 shrink-0" />
                        )}
                        <span className="flex-1 truncate text-foreground/80">{g.name}</span>
                        <span className="font-mono text-muted-foreground shrink-0">×{g.count}</span>
                        <span className="font-mono text-yellow-400 shrink-0">{g.totalDiamonds.toLocaleString()}💎</span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Event Feed ── */}
          <div className="lg:col-span-2">
            <Card className="bg-card border-border h-full min-h-[500px] flex flex-col">
              <CardHeader className="pb-3 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Live Events Feed
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline"
                      className={`text-xs font-mono ${connStatus === "connected" ? "border-green-400/50 text-green-400" : "border-muted text-muted-foreground"}`}>
                      {filteredEvents.length} / {events.length}
                    </Badge>
                    <Button size="sm" variant="ghost" className={`h-7 px-2 text-xs gap-1 ${filterOpen ? "text-primary" : "text-muted-foreground"}`}
                      onClick={() => setFilterOpen((v) => !v)}>
                      <Filter className="w-3.5 h-3.5" />Filter
                      {activeFilters.size > 0 && <Badge className="ml-0.5 text-[10px] px-1 py-0 bg-primary/20 text-primary border-primary/30">{activeFilters.size}</Badge>}
                      {filterOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>

                {/* Filter chips */}
                {filterOpen && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex flex-wrap gap-1.5">
                      {activeFilters.size > 0 && (
                        <button onClick={() => setActiveFilters(new Set())}
                          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors">
                          <X className="w-2.5 h-2.5" />Clear
                        </button>
                      )}
                      {Object.entries(EVENT_META).map(([key, meta]) => {
                        const count = events.filter((e) => e.event === key).length;
                        if (!count) return null;
                        const Icon = meta.icon;
                        const active = activeFilters.has(key);
                        return (
                          <button key={key} onClick={() => toggleFilter(key)}
                            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                              active ? `${meta.bg} ${meta.color} border-current/30` : "text-muted-foreground border-border hover:border-muted-foreground"
                            }`}>
                            <Icon className="w-2.5 h-2.5" />{meta.label}
                            <span className="font-mono opacity-60">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent className="flex-1 p-0 min-h-0">
                <ScrollArea className="h-[500px] lg:h-[620px]">
                  {filteredEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      {connStatus === "connecting" ? (
                        <><Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" /><span className="text-sm">Connecting to @{activeUsername}...</span></>
                      ) : connStatus === "connected" ? (
                        <><Wifi className="w-8 h-8 mb-3 text-green-400 animate-pulse" /><span className="text-sm">Waiting for events...</span></>
                      ) : (
                        <><WifiOff className="w-8 h-8 mb-3 text-muted" /><span className="text-sm">Not connected</span></>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {filteredEvents.map((ev) => {
                        const meta = EVENT_META[ev.event];
                        const color = meta?.color || "text-muted-foreground";
                        const Icon = meta?.icon || MessageCircle;
                        const label = meta?.label || ev.event.toUpperCase();
                        const text = formatEvent(ev);
                        const payGrade = ev.user?.payGrade ?? (ev.user as { level?: number })?.level;
                        const giftIcon = ev.giftName ? giftIconMap.current[ev.giftName.toLowerCase()] : null;

                        return (
                          <div key={ev.id}
                            className="flex items-start gap-3 px-4 py-2 hover:bg-muted/10 transition-colors animate-in slide-in-from-top-1 duration-150">
                            <div className={`mt-0.5 shrink-0 ${color}`}>
                              {giftIcon ? (
                                <img src={giftIcon} alt={ev.giftName} className="w-3.5 h-3.5 object-contain" />
                              ) : (
                                <Icon className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className={`text-xs font-mono font-bold uppercase ${color}`}>{label}</span>
                                {ev.user && (
                                  <span className="text-xs font-semibold text-foreground/90">
                                    {ev.user.nickname || ev.user.uniqueId || "unknown"}
                                    {payGrade ? <span className="ml-1 text-[10px] font-mono text-muted-foreground">lv{payGrade}</span> : null}
                                  </span>
                                )}
                                {text && <span className="text-xs text-muted-foreground min-w-0 break-words">{text}</span>}
                              </div>
                            </div>
                            <time className="text-xs text-muted-foreground/50 font-mono shrink-0 tabular-nums">
                              {ev.timestamp.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                            </time>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Wifi className="w-10 h-10 mb-4 text-muted" />
            <p className="text-base font-medium">Enter a TikTok username to start monitoring</p>
            <p className="text-sm mt-1">Real-time events appear here via WebSocket</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
