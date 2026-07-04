import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  useGetLiveStatus, getGetLiveStatusQueryKey,
  useGetRoomInfo,
  useGetUserProfile, getGetUserProfileQueryKey,
  useBulkLiveCheck,
  useGetRateLimits, getGetRateLimitsQueryKey,
  useMintJwt,
} from "@workspace/api-client-react";
import {
  Radio, Search, Users, Activity, Diamond, Heart, Eye, Zap,
  Crown, UserCircle, ExternalLink, Copy, CheckCircle2, XCircle,
  Wifi, WifiOff, RefreshCw, Loader2, Key, BarChart2, Lock,
  ChevronRight, Globe, Bell, BellOff, Trash2, Bookmark, BookmarkCheck,
  Star, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/auth-context";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { void navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-muted-foreground hover:text-foreground transition-colors ml-1"
      title="Copy"
    >
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-chart-3" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

const WATCHLIST_KEY = "creatools_watchlist";

interface WatchlistEntry {
  uniqueId: string;
  addedAt: string;
  lastStatus: "live" | "offline" | "unknown";
  lastViewerCount: number | null;
  lastChecked: string | null;
  lastTitle: string | null;
}

function loadWatchlist(): WatchlistEntry[] {
  try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]") as WatchlistEntry[]; }
  catch { return []; }
}

function saveWatchlist(list: WatchlistEntry[]) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
}

function addToWatchlistStore(uniqueId: string): boolean {
  const list = loadWatchlist();
  if (list.find((e) => e.uniqueId === uniqueId)) return false;
  list.push({ uniqueId, addedAt: new Date().toISOString(), lastStatus: "unknown", lastViewerCount: null, lastChecked: null, lastTitle: null });
  saveWatchlist(list);
  return true;
}

// ─── Tab types ─────────────────────────────────────────────────────────────────

type Tab = "lookup" | "bulk" | "jwt" | "limits" | "watchlist";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "lookup",    label: "Streamer Lookup", icon: Search   },
  { id: "bulk",      label: "Bulk Check",      icon: Users    },
  { id: "jwt",       label: "JWT / WebSocket", icon: Key      },
  { id: "limits",    label: "Rate Limits",     icon: BarChart2 },
  { id: "watchlist", label: "Watchlist",       icon: Star     },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Streamers() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>("lookup");

  // ── Lookup state ────────────────────────────────────────────────────────────
  const [lookupInput, setLookupInput] = useState("");
  const [lookupUsername, setLookupUsername] = useState<string | null>(null);
  const [lookupInWatchlist, setLookupInWatchlist] = useState(false);

  // ── Bulk state ──────────────────────────────────────────────────────────────
  const [bulkInput, setBulkInput] = useState("");
  const [bulkResults, setBulkResults] = useState<Array<{
    uniqueId: string; isLive: boolean; roomId: string | null; title: string | null; viewerCount: number | null;
  }> | null>(null);

  // ── JWT state ───────────────────────────────────────────────────────────────
  const [jwtInput, setJwtInput] = useState("");
  const [jwtResult, setJwtResult] = useState<{ token: string; uniqueId: string } | null>(null);

  // ── Watchlist state ─────────────────────────────────────────────────────────
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(() => loadWatchlist());
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [watchlistRefreshing, setWatchlistRefreshing] = useState(false);
  const prevStatusRef = useRef<Record<string, "live" | "offline" | "unknown">>({});
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Hooks ───────────────────────────────────────────────────────────────────
  const liveStatus = useGetLiveStatus(
    { uniqueId: lookupUsername ?? "" },
    { query: { queryKey: getGetLiveStatusQueryKey({ uniqueId: lookupUsername ?? "" }), enabled: !!lookupUsername } }
  );
  const roomInfo = useGetRoomInfo();
  const userProfile = useGetUserProfile(
    { uniqueId: lookupUsername ?? "" },
    { query: { queryKey: getGetUserProfileQueryKey({ uniqueId: lookupUsername ?? "" }), enabled: !!lookupUsername } }
  );
  const bulkCheck = useBulkLiveCheck();
  const watchlistBulk = useBulkLiveCheck();
  const rateLimits = useGetRateLimits({ query: { queryKey: getGetRateLimitsQueryKey(), enabled: tab === "limits" } });
  const mintJwt = useMintJwt();

  // ── Watchlist polling ───────────────────────────────────────────────────────

  const refreshWatchlist = useCallback(() => {
    const list = loadWatchlist();
    if (!list.length) return;
    setWatchlistRefreshing(true);

    watchlistBulk.mutate(
      { data: { uniqueIds: list.map((e) => e.uniqueId) } },
      {
        onSuccess: (data) => {
          const results = data as Array<{ uniqueId: string; isLive: boolean; viewerCount: number | null; title: string | null }>;
          const now = new Date().toISOString();

          // Fire browser notifications for streamers that just went live
          for (const r of results) {
            const prev = prevStatusRef.current[r.uniqueId];
            if (r.isLive && prev === "offline" && notifEnabled && Notification.permission === "granted") {
              new Notification(`🔴 @${r.uniqueId} is LIVE!`, {
                body: r.title || "Just started streaming on TikTok",
                tag: `live-${r.uniqueId}`,
              });
            }
            prevStatusRef.current[r.uniqueId] = r.isLive ? "live" : "offline";
          }

          const updated = list.map((entry) => {
            const r = results.find((x) => x.uniqueId === entry.uniqueId);
            if (!r) return entry;
            return {
              ...entry,
              lastStatus: r.isLive ? ("live" as const) : ("offline" as const),
              lastViewerCount: r.viewerCount,
              lastTitle: r.title,
              lastChecked: now,
            };
          });
          saveWatchlist(updated);
          setWatchlist(updated);
          setWatchlistRefreshing(false);
        },
        onError: () => setWatchlistRefreshing(false),
      }
    );
  }, [watchlistBulk, notifEnabled]);

  // Auto-refresh every 60s when on watchlist tab
  useEffect(() => {
    if (tab === "watchlist" && watchlist.length > 0) {
      refreshWatchlist();
      pollTimerRef.current = setInterval(refreshWatchlist, 60_000);
    }
    return () => { if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; } };
  }, [tab]);

  // Init prevStatusRef from stored data
  useEffect(() => {
    for (const e of watchlist) {
      if (e.lastStatus !== "unknown") prevStatusRef.current[e.uniqueId] = e.lastStatus;
    }
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const u = lookupInput.trim().replace(/^@/, "");
    if (!u) return;
    setLookupUsername(u);
    setLookupInWatchlist(loadWatchlist().some((entry) => entry.uniqueId === u));
    roomInfo.mutate({ data: { uniqueId: u } });
  };

  const handleAddToWatchlist = () => {
    if (!lookupUsername) return;
    const added = addToWatchlistStore(lookupUsername);
    if (added) {
      setWatchlist(loadWatchlist());
      setLookupInWatchlist(true);
    }
  };

  const handleRemoveFromWatchlist = (uniqueId: string) => {
    const updated = loadWatchlist().filter((e) => e.uniqueId !== uniqueId);
    saveWatchlist(updated);
    setWatchlist(updated);
  };

  const handleBulk = (e: React.FormEvent) => {
    e.preventDefault();
    const ids = bulkInput
      .split(/[\n,]+/)
      .map((s) => s.trim().replace(/^@/, ""))
      .filter(Boolean);
    if (!ids.length) return;
    bulkCheck.mutate(
      { data: { uniqueIds: ids } },
      { onSuccess: (data) => setBulkResults(data as typeof bulkResults) }
    );
  };

  const handleMintJwt = (e: React.FormEvent) => {
    e.preventDefault();
    const u = jwtInput.trim().replace(/^@/, "");
    if (!u) return;
    mintJwt.mutate(
      { data: { uniqueId: u } },
      { onSuccess: (data) => setJwtResult(data as { token: string; uniqueId: string }) }
    );
  };

  const handleEnableAlerts = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      setNotifEnabled((v) => !v);
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") setNotifEnabled(true);
  };

  const isPaidPlan = user?.plan === "basic" || user?.plan === "pro";
  const isProPlan = user?.plan === "pro";

  // ── Derived lookup data ─────────────────────────────────────────────────────
  const ls = liveStatus.data as { isLive?: boolean; roomId?: string | null } | undefined;
  const ri = roomInfo.data as {
    alive?: boolean; title?: string | null; viewerCount?: number | null; likeCount?: number | null;
    owner?: { uniqueId?: string | null; nickname?: string | null; profilePictureUrl?: string | null };
  } | undefined;
  const up = userProfile.data as {
    available?: boolean; requiredTier?: string | null;
    nickname?: string | null; profilePictureUrl?: string | null;
    followerCount?: number | null; followingCount?: number | null;
    videoCount?: number | null; likeCount?: number | null; bio?: string | null;
  } | undefined;

  const lookupLoading = liveStatus.isLoading || userProfile.isLoading;

  const liveCount = watchlist.filter((e) => e.lastStatus === "live").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Radio className="w-5 h-5 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Streamer Panel</h1>
        </div>
        <p className="text-muted-foreground">Full access to all tik.tools API endpoints</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto pb-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isWatchlist = t.id === "watchlist";
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {isWatchlist && liveCount > 0 && (
                <span className="ml-1 w-4 h-4 rounded-full bg-chart-3/20 text-chart-3 text-[10px] font-bold flex items-center justify-center">
                  {liveCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB: Streamer Lookup ─────────────────────────────────────────────── */}
      {tab === "lookup" && (
        <div className="space-y-5">
          <form onSubmit={handleLookup} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">@</span>
              <Input
                placeholder="username"
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                className="pl-7 font-mono text-sm bg-card border-border"
              />
            </div>
            <Button type="submit" disabled={!lookupInput.trim() || lookupLoading}>
              {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-1.5" />Lookup</>}
            </Button>
          </form>

          {lookupUsername && (
            <div className="space-y-4">
              {/* Action bar */}
              <div className="flex items-center gap-2 flex-wrap">
                {ls?.isLive && (
                  <Button size="sm" variant="default" className="h-8 text-xs" onClick={() => setLocation(`/monitor/${lookupUsername}`)}>
                    <Activity className="w-3.5 h-3.5 mr-1.5" />Monitor LIVE
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-8 text-xs ${lookupInWatchlist ? "text-primary border-primary/40" : ""}`}
                  onClick={handleAddToWatchlist}
                  disabled={lookupInWatchlist}
                >
                  {lookupInWatchlist
                    ? <><BookmarkCheck className="w-3.5 h-3.5 mr-1.5" />In Watchlist</>
                    : <><Bookmark className="w-3.5 h-3.5 mr-1.5" />Add to Watchlist</>
                  }
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                  <a href={`https://tiktok.com/@${lookupUsername}/live`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />TikTok
                  </a>
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Live Status card */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Wifi className="w-3.5 h-3.5" /> Live Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {liveStatus.isLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" />Checking…</div>
                    ) : liveStatus.isError ? (
                      <p className="text-sm text-destructive">Error checking status</p>
                    ) : ls ? (
                      <>
                        <div className="flex items-center gap-2">
                          {ls.isLive ? (
                            <Badge className="bg-chart-3/15 text-chart-3 border-chart-3/30 text-sm px-3 py-1">
                              <span className="w-2 h-2 rounded-full bg-chart-3 mr-2 animate-pulse inline-block" />
                              LIVE
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-sm px-3 py-1">
                              <WifiOff className="w-3.5 h-3.5 mr-2" />Offline
                            </Badge>
                          )}
                        </div>
                        {ls.roomId && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/80">Room ID</span>
                            <div className="flex items-center gap-1 font-mono mt-0.5">
                              <span className="truncate">{ls.roomId}</span>
                              <CopyBtn value={ls.roomId} />
                            </div>
                          </div>
                        )}
                      </>
                    ) : null}
                  </CardContent>
                </Card>

                {/* Room Info card */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" /> Room Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {roomInfo.isPending ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" />Fetching…</div>
                    ) : !ri ? (
                      <p className="text-xs text-muted-foreground">No data yet</p>
                    ) : !ri.alive ? (
                      <p className="text-xs text-muted-foreground">Stream is not live — no room data available</p>
                    ) : (
                      <>
                        {ri.owner && (
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-9 h-9 border border-border">
                              <AvatarImage src={ri.owner.profilePictureUrl ?? ""} />
                              <AvatarFallback className="text-xs">{(ri.owner.uniqueId ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold">{ri.owner.nickname ?? ri.owner.uniqueId}</p>
                              <p className="text-xs text-muted-foreground font-mono">@{ri.owner.uniqueId}</p>
                            </div>
                          </div>
                        )}
                        {ri.title && <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2 leading-relaxed">{ri.title}</p>}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-background rounded-md p-2 text-center">
                            <Eye className="w-3.5 h-3.5 text-secondary mx-auto mb-1" />
                            <p className="text-sm font-bold font-mono text-secondary">{fmt(ri.viewerCount)}</p>
                            <p className="text-[10px] text-muted-foreground">Viewers</p>
                          </div>
                          <div className="bg-background rounded-md p-2 text-center">
                            <Heart className="w-3.5 h-3.5 text-pink-400 mx-auto mb-1" />
                            <p className="text-sm font-bold font-mono text-pink-400">{fmt(ri.likeCount)}</p>
                            <p className="text-[10px] text-muted-foreground">Likes</p>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* User Profile card */}
                <Card className={`bg-card border-border ${!isProPlan ? "opacity-75" : ""}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <UserCircle className="w-3.5 h-3.5" /> User Profile
                      {!isProPlan && (
                        <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 text-violet-400 border-violet-400/30">
                          <Crown className="w-2.5 h-2.5 mr-1" />Pro
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {userProfile.isLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" />Fetching…</div>
                    ) : !up ? (
                      <p className="text-xs text-muted-foreground">No data yet</p>
                    ) : !up.available ? (
                      <div className="flex flex-col items-center text-center gap-2 py-4">
                        <Lock className="w-6 h-6 text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground">
                          Requires <strong className="text-violet-400">{up.requiredTier ?? "Pro"}</strong> plan
                        </p>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setLocation("/pricing")}>
                          Upgrade <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-9 h-9 border border-border">
                            <AvatarImage src={up.profilePictureUrl ?? ""} />
                            <AvatarFallback className="text-xs">{lookupUsername.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold">{up.nickname ?? lookupUsername}</p>
                            <p className="text-xs text-muted-foreground font-mono">@{lookupUsername}</p>
                          </div>
                        </div>
                        {up.bio && <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-muted pl-2">{up.bio}</p>}
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: "Followers", value: up.followerCount, color: "text-primary" },
                            { label: "Following", value: up.followingCount, color: "text-muted-foreground" },
                            { label: "Videos", value: up.videoCount, color: "text-secondary" },
                            { label: "Likes", value: up.likeCount, color: "text-pink-400" },
                          ].map((s) => (
                            <div key={s.label} className="bg-background rounded-md p-2 text-center">
                              <p className={`text-sm font-bold font-mono ${s.color}`}>{fmt(s.value)}</p>
                              <p className="text-[10px] text-muted-foreground">{s.label}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {!lookupUsername && (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <Search className="w-10 h-10 text-muted" />
                <p className="font-medium">Enter a TikTok username to look up</p>
                <p className="text-sm">Returns live status, room info and user profile</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── TAB: Bulk Check ──────────────────────────────────────────────────── */}
      {tab === "bulk" && (
        <div className="space-y-5">
          {!isPaidPlan ? (
            <Card className="bg-card border-primary/20 border-dashed max-w-xl">
              <CardContent className="flex flex-col items-center text-center py-12 gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Basic+ plan required</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Bulk Check lets you verify multiple creators simultaneously with real-time viewer counts.
                  </p>
                </div>
                <Button onClick={() => setLocation("/pricing")}>
                  <Zap className="w-4 h-4 mr-2" />Upgrade to Basic
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <form onSubmit={handleBulk} className="space-y-3 max-w-lg">
                <Textarea
                  placeholder={"username1\nusername2\nusername3"}
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  rows={5}
                  className="font-mono text-sm bg-card border-border resize-none"
                />
                <Button type="submit" disabled={!bulkInput.trim() || bulkCheck.isPending} className="w-full">
                  {bulkCheck.isPending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking…</>
                    : <><Users className="w-4 h-4 mr-2" />Check All</>}
                </Button>
              </form>

              {bulkResults && (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="text-chart-3 font-medium">{bulkResults.filter((r) => r.isLive).length} live</span>
                    <span>{bulkResults.filter((r) => !r.isLive).length} offline</span>
                    <span>·</span>
                    <span>{bulkResults.length} total</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[...bulkResults]
                      .sort((a, b) => (a.isLive === b.isLive ? (b.viewerCount ?? 0) - (a.viewerCount ?? 0) : a.isLive ? -1 : 1))
                      .map((r) => (
                        <Card
                          key={r.uniqueId}
                          className={`bg-card border transition-colors cursor-pointer hover:border-primary/50 ${r.isLive ? "border-chart-3/30" : "border-border"}`}
                          onClick={() => setLocation(`/monitor/${r.uniqueId}`)}
                        >
                          <CardContent className="p-3 flex items-start gap-3">
                            <Avatar className="w-9 h-9 border border-border shrink-0">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {r.uniqueId.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-sm font-medium truncate">@{r.uniqueId}</p>
                                {r.isLive ? (
                                  <Badge className="text-[10px] px-1.5 py-0 bg-chart-3/15 text-chart-3 border-chart-3/30 shrink-0">LIVE</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground shrink-0">Offline</Badge>
                                )}
                              </div>
                              {r.isLive && r.viewerCount != null && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                  <Eye className="w-3 h-3" />
                                  <span className="font-mono text-secondary">{fmt(r.viewerCount)}</span>
                                </div>
                              )}
                              {r.title && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{r.title}</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: JWT / WebSocket ─────────────────────────────────────────────── */}
      {tab === "jwt" && (
        <div className="space-y-5 max-w-2xl">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" /> Mint JWT Token
              </CardTitle>
              <CardDescription>
                Generate a signed JWT to open a WebSocket connection to a creator's LIVE stream.
                Tokens expire after 10 minutes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleMintJwt} className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">@</span>
                  <Input
                    placeholder="username"
                    value={jwtInput}
                    onChange={(e) => setJwtInput(e.target.value)}
                    className="pl-7 font-mono text-sm bg-background border-border"
                  />
                </div>
                <Button type="submit" disabled={!jwtInput.trim() || mintJwt.isPending}>
                  {mintJwt.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Key className="w-4 h-4 mr-1.5" />Mint</>}
                </Button>
              </form>

              {mintJwt.isError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {mintJwt.error instanceof Error ? mintJwt.error.message : "Failed to mint JWT"}
                </div>
              )}

              {jwtResult && (
                <div className="space-y-3">
                  <Separator />
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">JWT Token</p>
                    <div className="flex items-start gap-2">
                      <code className="text-xs font-mono bg-background border border-border rounded-md p-2 flex-1 break-all leading-relaxed">
                        {jwtResult.token}
                      </code>
                      <CopyBtn value={jwtResult.token} />
                    </div>
                  </div>

                  <div className="bg-background border border-border rounded-md p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">WebSocket URL</p>
                    <div className="flex items-start gap-2">
                      <code className="text-xs font-mono text-primary break-all leading-relaxed flex-1">
                        {`wss://api.tik.tools?uniqueId=${jwtResult.uniqueId}&jwtKey=${jwtResult.token}`}
                      </code>
                      <CopyBtn value={`wss://api.tik.tools?uniqueId=${jwtResult.uniqueId}&jwtKey=${jwtResult.token}`} />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/monitor/${jwtResult.uniqueId}`)}
                    className="w-full"
                  >
                    <Activity className="w-4 h-4 mr-2" />Open full Monitor for @{jwtResult.uniqueId}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB: Rate Limits ─────────────────────────────────────────────────── */}
      {tab === "limits" && (
        <div className="space-y-5 max-w-2xl">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Live usage from the tik.tools API for your account key.</p>
            <Button size="sm" variant="outline" onClick={() => rateLimits.refetch()} disabled={rateLimits.isFetching}>
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${rateLimits.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {rateLimits.isLoading || rateLimits.isFetching ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
              <Loader2 className="w-5 h-5 animate-spin" />Loading rate limits…
            </div>
          ) : rateLimits.isError ? (
            <Card className="bg-card border-destructive/30">
              <CardContent className="py-6 text-center text-destructive text-sm">
                <XCircle className="w-6 h-6 mx-auto mb-2" />
                Failed to load rate limits — check your TIKTOOLS_API_KEY
              </CardContent>
            </Card>
          ) : rateLimits.data ? (() => {
            const rl = rateLimits.data as {
              tier?: string; apiLimit?: number; apiRemaining?: number; apiResetAt?: number | null;
              wsLimit?: number; wsCurrent?: number; bulkCheckLimit?: number | null;
            };
            const apiUsed = (rl.apiLimit ?? 0) - (rl.apiRemaining ?? 0);
            const apiPct = rl.apiLimit ? Math.round((apiUsed / rl.apiLimit) * 100) : 0;
            const wsPct = rl.wsLimit ? Math.round(((rl.wsCurrent ?? 0) / rl.wsLimit) * 100) : 0;
            return (
              <div className="space-y-4">
                {rl.tier && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Account tier:</span>
                    <Badge variant="outline" className="capitalize text-primary border-primary/30">{rl.tier}</Badge>
                  </div>
                )}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">API Calls (current window)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono">{apiUsed} / {rl.apiLimit ?? "?"}</span>
                      <span className={`text-xs font-mono ${apiPct >= 90 ? "text-destructive" : apiPct >= 70 ? "text-yellow-400" : "text-chart-3"}`}>
                        {rl.apiRemaining ?? "?"} remaining
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${apiPct >= 90 ? "bg-destructive" : apiPct >= 70 ? "bg-yellow-400" : "bg-chart-3"}`}
                        style={{ width: `${Math.min(apiPct, 100)}%` }}
                      />
                    </div>
                    {rl.apiResetAt && (
                      <p className="text-xs text-muted-foreground">
                        Resets {new Date(rl.apiResetAt * 1000).toLocaleTimeString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">WebSocket Connections</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono">{rl.wsCurrent ?? 0} / {rl.wsLimit ?? "?"}</span>
                      <span className="text-xs font-mono text-muted-foreground">{(rl.wsLimit ?? 0) - (rl.wsCurrent ?? 0)} available</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${wsPct >= 90 ? "bg-destructive" : wsPct >= 70 ? "bg-yellow-400" : "bg-primary"}`}
                        style={{ width: `${Math.min(wsPct, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
                {rl.bulkCheckLimit != null && (
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Bulk Check limit</span>
                      <span className="font-mono text-sm font-bold">{rl.bulkCheckLimit} usernames/request</span>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })() : null}
        </div>
      )}

      {/* ── TAB: Watchlist ───────────────────────────────────────────────────── */}
      {tab === "watchlist" && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                Your Watchlist
                {watchlist.length > 0 && (
                  <span className="text-muted-foreground font-normal text-sm">({watchlist.length} streamers)</span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tracked creators — auto-refreshes every 60s and sends a browser alert when one goes live.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className={`text-xs h-8 ${notifEnabled ? "text-chart-3 border-chart-3/40" : ""}`}
                onClick={() => { void handleEnableAlerts(); }}
              >
                {notifEnabled
                  ? <><Bell className="w-3.5 h-3.5 mr-1.5" />Alerts On</>
                  : <><BellOff className="w-3.5 h-3.5 mr-1.5" />Enable Alerts</>
                }
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8"
                onClick={refreshWatchlist}
                disabled={watchlistRefreshing || watchlist.length === 0}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${watchlistRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats row */}
          {watchlist.length > 0 && (
            <div className="flex items-center gap-6 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-chart-3 animate-pulse" />
                <span className="text-chart-3 font-medium">{watchlist.filter((e) => e.lastStatus === "live").length} live</span>
              </span>
              <span className="text-muted-foreground">{watchlist.filter((e) => e.lastStatus === "offline").length} offline</span>
              <span className="text-muted-foreground">{watchlist.filter((e) => e.lastStatus === "unknown").length} unchecked</span>
            </div>
          )}

          {/* Empty state */}
          {watchlist.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <Star className="w-10 h-10 text-muted" />
                <div className="text-center">
                  <p className="font-medium">Your watchlist is empty</p>
                  <p className="text-sm mt-1">
                    Look up a streamer in the <strong>Streamer Lookup</strong> tab and click{" "}
                    <strong>Add to Watchlist</strong>.
                  </p>
                  <p className="text-sm mt-1">
                    Or click <strong>+ Add to Watchlist</strong> on the Monitor page while watching someone.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setTab("lookup")}>
                  <Search className="w-3.5 h-3.5 mr-1.5" />Go to Lookup
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...watchlist]
                .sort((a, b) => {
                  const order = { live: 0, unknown: 1, offline: 2 };
                  const diff = order[a.lastStatus] - order[b.lastStatus];
                  if (diff !== 0) return diff;
                  return (b.lastViewerCount ?? 0) - (a.lastViewerCount ?? 0);
                })
                .map((entry) => (
                  <Card
                    key={entry.uniqueId}
                    className={`bg-card border transition-all ${
                      entry.lastStatus === "live"
                        ? "border-chart-3/40 shadow-[0_0_16px_-6px_rgba(0,255,128,0.2)]"
                        : "border-border"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="w-9 h-9 border border-border shrink-0">
                            <AvatarFallback className={`text-xs font-bold ${entry.lastStatus === "live" ? "bg-chart-3/10 text-chart-3" : "bg-primary/10 text-primary"}`}>
                              {entry.uniqueId.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">@{entry.uniqueId}</p>
                            {entry.lastStatus === "live" ? (
                              <Badge className="text-[10px] px-1.5 py-0 bg-chart-3/15 text-chart-3 border-chart-3/30 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-chart-3 mr-1 animate-pulse inline-block" />
                                LIVE
                              </Badge>
                            ) : entry.lastStatus === "offline" ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground mt-0.5">Offline</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground/50 mt-0.5">—</Badge>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFromWatchlist(entry.uniqueId)}
                          className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0 mt-0.5"
                          title="Remove from watchlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Viewer count + title */}
                      {entry.lastStatus === "live" && (
                        <div className="space-y-1 mb-3">
                          {entry.lastViewerCount != null && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Eye className="w-3 h-3 text-secondary" />
                              <span className="font-mono font-bold text-secondary">{fmt(entry.lastViewerCount)}</span>
                              <span className="text-muted-foreground">viewers</span>
                            </div>
                          )}
                          {entry.lastTitle && (
                            <p className="text-xs text-muted-foreground truncate border-l-2 border-chart-3/30 pl-2">{entry.lastTitle}</p>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant={entry.lastStatus === "live" ? "default" : "outline"}
                          className="flex-1 h-7 text-xs"
                          onClick={() => setLocation(`/monitor/${entry.uniqueId}`)}
                        >
                          <Activity className="w-3 h-3 mr-1" />
                          {entry.lastStatus === "live" ? "Monitor" : "Open"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2"
                          asChild
                        >
                          <a href={`https://tiktok.com/@${entry.uniqueId}/live`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                      </div>

                      {/* Last checked */}
                      {entry.lastChecked && (
                        <p className="text-[10px] text-muted-foreground/50 mt-2 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          checked {timeAgo(entry.lastChecked)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground/50 text-center pt-2">
            Watchlist is stored locally in your browser. Auto-refreshes every 60s while this tab is open.
          </p>
        </div>
      )}
    </div>
  );
}
