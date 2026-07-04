import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useBulkLiveCheck } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Star, Bell, BellOff, Trash2, RefreshCw, Activity,
  ExternalLink, Eye, Clock, Search,
} from "lucide-react";

interface WatchlistEntry {
  uniqueId: string;
  addedAt: string;
  lastStatus: "live" | "offline" | "unknown";
  lastViewerCount: number | null;
  lastChecked: string | null;
  lastTitle: string | null;
}

const WATCHLIST_KEY = "creatools_watchlist";

function loadWatchlist(): WatchlistEntry[] {
  try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]") as WatchlistEntry[]; }
  catch { return []; }
}
function saveWatchlist(list: WatchlistEntry[]) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
}

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

export default function StreamerWatchlist() {
  const [, setLocation] = useLocation();
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(() => loadWatchlist());
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const prevStatusRef = useRef<Record<string, "live" | "offline" | "unknown">>({});
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bulkCheck = useBulkLiveCheck();

  // Init prev status from stored
  useEffect(() => {
    for (const e of watchlist) {
      if (e.lastStatus !== "unknown") prevStatusRef.current[e.uniqueId] = e.lastStatus;
    }
  }, []);

  const refresh = useCallback(() => {
    const list = loadWatchlist();
    if (!list.length) return;
    setRefreshing(true);

    bulkCheck.mutate(
      { data: { uniqueIds: list.map((e) => e.uniqueId) } },
      {
        onSuccess: (data) => {
          const results = data as Array<{ uniqueId: string; isLive: boolean; viewerCount: number | null; title: string | null }>;
          const now = new Date().toISOString();

          for (const r of results) {
            const prev = prevStatusRef.current[r.uniqueId];
            if (r.isLive && prev === "offline" && notifEnabled && Notification.permission === "granted") {
              new Notification(`🔴 @${r.uniqueId} is LIVE!`, {
                body: r.title || "Started streaming on TikTok",
                tag: `live-${r.uniqueId}`,
              });
            }
            prevStatusRef.current[r.uniqueId] = r.isLive ? "live" : "offline";
          }

          const updated = list.map((entry) => {
            const r = results.find((x) => x.uniqueId === entry.uniqueId);
            if (!r) return entry;
            return { ...entry, lastStatus: r.isLive ? ("live" as const) : ("offline" as const), lastViewerCount: r.viewerCount, lastTitle: r.title, lastChecked: now };
          });
          saveWatchlist(updated);
          setWatchlist(updated);
          setRefreshing(false);
        },
        onError: () => setRefreshing(false),
      }
    );
  }, [bulkCheck, notifEnabled]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (watchlist.length > 0) {
      refresh();
      pollTimerRef.current = setInterval(refresh, 60_000);
    }
    return () => { if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; } };
  }, []);

  const handleEnableAlerts = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") { setNotifEnabled((v) => !v); return; }
    const perm = await Notification.requestPermission();
    if (perm === "granted") setNotifEnabled(true);
  };

  const remove = (uniqueId: string) => {
    const updated = loadWatchlist().filter((e) => e.uniqueId !== uniqueId);
    saveWatchlist(updated);
    setWatchlist(updated);
  };

  const liveCount = watchlist.filter((e) => e.lastStatus === "live").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            Watchlist
            {liveCount > 0 && (
              <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse inline-block" />
                {liveCount} live
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tracked streamers — auto-refreshes every 60s. Enable alerts to get a browser notification when one goes live.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline"
            className={notifEnabled ? "text-green-400 border-green-400/40" : ""}
            onClick={() => { void handleEnableAlerts(); }}>
            {notifEnabled ? <><Bell className="w-3.5 h-3.5 mr-1.5" />Alerts On</> : <><BellOff className="w-3.5 h-3.5 mr-1.5" />Enable Alerts</>}
          </Button>
          <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing || watchlist.length === 0}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {watchlist.length > 0 && (
        <div className="flex items-center gap-5 text-sm">
          <span className="text-green-400 font-medium">{watchlist.filter((e) => e.lastStatus === "live").length} live</span>
          <span className="text-muted-foreground">{watchlist.filter((e) => e.lastStatus === "offline").length} offline</span>
          <span className="text-muted-foreground">{watchlist.filter((e) => e.lastStatus === "unknown").length} unchecked</span>
        </div>
      )}

      {watchlist.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Star className="w-10 h-10 text-muted" />
            <div className="text-center">
              <p className="font-medium">Your watchlist is empty</p>
              <p className="text-sm mt-1">
                Go to <strong>Streamer Lookup</strong> and click <strong>Add to Watchlist</strong> after searching a creator.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setLocation("/streamer/lookup")}>
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
              return diff !== 0 ? diff : (b.lastViewerCount ?? 0) - (a.lastViewerCount ?? 0);
            })
            .map((entry) => (
              <Card key={entry.uniqueId}
                className={`bg-card border transition-all ${entry.lastStatus === "live" ? "border-green-500/40 shadow-[0_0_16px_-6px_rgba(74,222,128,0.2)]" : "border-border"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="w-9 h-9 border border-border shrink-0">
                        <AvatarFallback className={`text-xs font-bold ${entry.lastStatus === "live" ? "bg-green-500/10 text-green-400" : "bg-primary/10 text-primary"}`}>
                          {entry.uniqueId.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">@{entry.uniqueId}</p>
                        {entry.lastStatus === "live" ? (
                          <Badge className="text-[10px] px-1.5 py-0 bg-green-500/15 text-green-400 border-green-500/30 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1 animate-pulse inline-block" />LIVE
                          </Badge>
                        ) : entry.lastStatus === "offline" ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground mt-0.5">Offline</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground/50 mt-0.5">—</Badge>
                        )}
                      </div>
                    </div>
                    <button onClick={() => remove(entry.uniqueId)}
                      className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0 mt-0.5">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {entry.lastStatus === "live" && (
                    <div className="space-y-1 mb-3">
                      {entry.lastViewerCount != null && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Eye className="w-3 h-3 text-cyan-400" />
                          <span className="font-mono font-bold text-cyan-400">{fmt(entry.lastViewerCount)}</span>
                          <span className="text-muted-foreground">viewers</span>
                        </div>
                      )}
                      {entry.lastTitle && (
                        <p className="text-xs text-muted-foreground truncate border-l-2 border-green-500/30 pl-2">{entry.lastTitle}</p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-1.5">
                    <Button size="sm" variant={entry.lastStatus === "live" ? "default" : "outline"} className="flex-1 h-7 text-xs"
                      onClick={() => setLocation(`/monitor/${entry.uniqueId}`)}>
                      <Activity className="w-3 h-3 mr-1" />
                      {entry.lastStatus === "live" ? "Monitor" : "Open"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs px-2" asChild>
                      <a href={`https://tiktok.com/@${entry.uniqueId}/live`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                  </div>

                  {entry.lastChecked && (
                    <p className="text-[10px] text-muted-foreground/50 mt-2 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />checked {timeAgo(entry.lastChecked)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground/40 text-center">
        Watchlist stored in your browser · Auto-refreshes every 60s while page is open
      </p>
    </div>
  );
}
