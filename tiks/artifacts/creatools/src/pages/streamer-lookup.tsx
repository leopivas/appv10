import { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetLiveStatus, getGetLiveStatusQueryKey,
  useGetRoomInfo,
  useGetUserProfile, getGetUserProfileQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search, Activity, Eye, Heart, Wifi, WifiOff, Loader2,
  ExternalLink, UserCircle, Globe, Crown, Lock, ChevronRight,
  Bookmark, BookmarkCheck, Copy, CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { void navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-muted-foreground hover:text-foreground transition-colors ml-1"
    >
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

const WATCHLIST_KEY = "creatools_watchlist";
function isInWatchlist(uniqueId: string): boolean {
  try { return (JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]") as { uniqueId: string }[]).some((e) => e.uniqueId === uniqueId); }
  catch { return false; }
}
function addToWatchlist(uniqueId: string) {
  try {
    const list = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]") as object[];
    if (!list.find((e) => (e as { uniqueId: string }).uniqueId === uniqueId)) {
      list.push({ uniqueId, addedAt: new Date().toISOString(), lastStatus: "unknown", lastViewerCount: null, lastChecked: null, lastTitle: null });
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
    }
  } catch {}
}

export default function StreamerLookup() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [input, setInput] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [watchlisted, setWatchlisted] = useState(false);

  const liveStatus = useGetLiveStatus(
    { uniqueId: username ?? "" },
    { query: { queryKey: getGetLiveStatusQueryKey({ uniqueId: username ?? "" }), enabled: !!username } }
  );
  const roomInfo = useGetRoomInfo();
  const userProfile = useGetUserProfile(
    { uniqueId: username ?? "" },
    { query: { queryKey: getGetUserProfileQueryKey({ uniqueId: username ?? "" }), enabled: !!username } }
  );

  const isProPlan = user?.plan === "pro";
  const loading = liveStatus.isLoading || userProfile.isLoading;

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

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const u = input.trim().replace(/^@/, "");
    if (!u) return;
    setUsername(u);
    setWatchlisted(isInWatchlist(u));
    roomInfo.mutate({ data: { uniqueId: u } });
  };

  const handleWatchlist = () => {
    if (!username) return;
    addToWatchlist(username);
    setWatchlisted(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Streamer Lookup
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Check live status, room info and profile for any TikTok creator.
        </p>
      </div>

      <form onSubmit={handleLookup} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">@</span>
          <Input
            placeholder="username"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="pl-7 font-mono text-sm bg-card border-border"
          />
        </div>
        <Button type="submit" disabled={!input.trim() || loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-1.5" />Lookup</>}
        </Button>
      </form>

      {username && (
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {ls?.isLive && (
              <Button size="sm" onClick={() => setLocation(`/monitor/${username}`)}>
                <Activity className="w-3.5 h-3.5 mr-1.5" />Monitor LIVE
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleWatchlist} disabled={watchlisted}
              className={watchlisted ? "text-primary border-primary/40" : ""}>
              {watchlisted
                ? <><BookmarkCheck className="w-3.5 h-3.5 mr-1.5" />In Watchlist</>
                : <><Bookmark className="w-3.5 h-3.5 mr-1.5" />Add to Watchlist</>}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={`https://tiktok.com/@${username}/live`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />Open on TikTok
              </a>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Live Status */}
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
                    {ls.isLive ? (
                      <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-sm px-3 py-1">
                        <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse inline-block" />LIVE
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-sm px-3 py-1">
                        <WifiOff className="w-3.5 h-3.5 mr-2" />Offline
                      </Badge>
                    )}
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

            {/* Room Info */}
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
                  <p className="text-xs text-muted-foreground">Not live — no room data</p>
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
                        <Eye className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-1" />
                        <p className="text-sm font-bold font-mono text-cyan-400">{fmt(ri.viewerCount)}</p>
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

            {/* User Profile */}
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
                {!username ? null : userProfile.isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" />Fetching…</div>
                ) : !up ? (
                  <p className="text-xs text-muted-foreground">No data</p>
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
                        <AvatarFallback className="text-xs">{username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">{up.nickname ?? username}</p>
                        <p className="text-xs text-muted-foreground font-mono">@{username}</p>
                      </div>
                    </div>
                    {up.bio && <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-muted pl-2">{up.bio}</p>}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Followers", value: up.followerCount, color: "text-primary" },
                        { label: "Following", value: up.followingCount, color: "text-muted-foreground" },
                        { label: "Videos", value: up.videoCount, color: "text-cyan-400" },
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

      {!username && (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Search className="w-10 h-10 text-muted" />
            <p className="font-medium">Enter a TikTok username above</p>
            <p className="text-sm">Returns live status, room info, and user profile in one shot</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
