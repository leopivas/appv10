import { useState } from "react";
import {
  useGetLeaderboardLeagues,
  useGetLeaderboardLeague,
  getGetLeaderboardLeaguesQueryKey,
  getGetLeaderboardLeagueQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Trophy, Wifi, Crown, TrendingUp, Users, Lock,
  ExternalLink, RefreshCw,
} from "lucide-react";
import { Link } from "wouter";

const REGIONS = [
  { value: "BK", label: "BK (Bangkok)" },
  { value: "TW", label: "TW (Taiwan)" },
  { value: "US+", label: "US+ (United States)" },
  { value: "CA", label: "CA (Canada)" },
  { value: "GB", label: "GB (United Kingdom)" },
  { value: "ID", label: "ID (Indonesia)" },
  { value: "MY", label: "MY (Malaysia)" },
  { value: "PH", label: "PH (Philippines)" },
  { value: "VN", label: "VN (Vietnam)" },
  { value: "TH", label: "TH (Thailand)" },
  { value: "JP", label: "JP (Japan)" },
  { value: "KR", label: "KR (Korea)" },
  { value: "BR", label: "BR (Brazil)" },
  { value: "MX", label: "MX (Mexico)" },
  { value: "DE", label: "DE (Germany)" },
  { value: "FR", label: "FR (France)" },
  { value: "SA", label: "SA (Saudi Arabia)" },
  { value: "EG", label: "EG (Egypt)" },
  { value: "TR", label: "TR (Turkey)" },
  { value: "RU", label: "RU (Russia)" },
];

const RANK_COLORS = ["text-yellow-400", "text-slate-300", "text-amber-600"];

export default function Leaderboards() {
  const [region, setRegion] = useState("BK");
  const [classType, setClassType] = useState<number | null>(null);

  const { data: leagues, isLoading: leaguesLoading, error: leaguesError, refetch: refetchLeagues } =
    useGetLeaderboardLeagues(region, {
      query: { queryKey: getGetLeaderboardLeaguesQueryKey(region), enabled: !!region },
    });

  const { data: leagueData, isLoading: leagueLoading, error: leagueError, refetch: refetchLeague } =
    useGetLeaderboardLeague(region, classType ?? 0, {
      query: {
        queryKey: getGetLeaderboardLeagueQueryKey(region, classType ?? 0),
        enabled: !!region && classType !== null,
      },
    });

  const selectedLeague = leagues?.leagues.find((l) => l.classType === classType);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          Leaderboards
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ranked TikTok LIVE creators by region and league class. Full data requires Ultra+ tier.
        </p>
      </div>

      {/* Controls */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5 min-w-[200px]">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Region</label>
              <Select value={region} onValueChange={(v) => { setRegion(v); setClassType(null); }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {leaguesLoading ? (
              <Skeleton className="h-9 w-48" />
            ) : leagues?.leagues && leagues.leagues.length > 0 ? (
              <div className="space-y-1.5 min-w-[200px]">
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">League Class</label>
                <Select
                  value={classType?.toString() ?? ""}
                  onValueChange={(v) => setClassType(parseInt(v, 10))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select league" />
                  </SelectTrigger>
                  <SelectContent>
                    {leagues.leagues.map((l) => (
                      <SelectItem key={l.classType} value={l.classType.toString()}>
                        {l.classLabel} ({l.classType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5"
              onClick={() => { refetchLeagues(); if (classType) refetchLeague(); }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leagues error */}
      {leaguesError && !leaguesLoading && (
        <Card className="bg-card border-border border-amber-500/20">
          <CardContent className="flex items-center gap-3 py-4">
            <Lock className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-400">Ultra+ Tier Required</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Leaderboard data requires an Ultra or Agency API key.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* League list (region overview) */}
      {!classType && !leaguesLoading && !leaguesError && leagues && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Available League Classes — {leagues.region}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leagues.leagues.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leagues available for this region.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {leagues.leagues.map((l) => (
                  <button
                    key={l.classType}
                    onClick={() => setClassType(l.classType)}
                    className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/30 border border-border hover:bg-accent hover:border-muted-foreground/30 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{l.classLabel}</p>
                      <p className="text-xs text-muted-foreground font-mono">{l.classType}</p>
                    </div>
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* League loading skeleton */}
      {leaguesLoading && (
        <Card className="bg-card border-border">
          <CardContent className="pt-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* League entries */}
      {classType && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                {selectedLeague?.classLabel ?? `Class ${classType}`} — {region}
              </CardTitle>
              <div className="flex items-center gap-2">
                {leagueData?.teaser && (
                  <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30 bg-amber-400/5">
                    <Lock className="w-2.5 h-2.5 mr-1" />Teaser (5 entries)
                  </Badge>
                )}
                {!leagueLoading && !leagueError && leagueData && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    <Users className="w-3 h-3 mr-1" />{leagueData.entries.length} entries
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {leagueLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="w-6 h-4" />
                    <Skeleton className="w-9 h-9 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : leagueError ? (
              <div className="flex items-center gap-3 py-4">
                <Lock className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-400">Ultra+ Tier Required</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Full leaderboard access requires an Ultra or Agency API key from tik.tools.
                  </p>
                </div>
              </div>
            ) : leagueData?.entries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No entries found for this league class.
              </p>
            ) : (
              <div className="space-y-1">
                {leagueData?.teaser && (
                  <div className="mb-3 flex items-center gap-2 text-xs text-amber-400 bg-amber-400/5 border border-amber-400/20 rounded-md px-3 py-2">
                    <Lock className="w-3 h-3 shrink-0" />
                    Showing 5 sample entries. Upgrade to Ultra+ for the full ranked list (up to 99 creators).
                  </div>
                )}
                {leagueData?.entries.map((entry, i) => (
                  <div key={entry.uniqueId} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/20 transition-colors group">
                    {/* Rank */}
                    <span className={`w-6 text-right font-mono font-bold text-sm shrink-0 ${
                      i === 0 ? RANK_COLORS[0] : i === 1 ? RANK_COLORS[1] : i === 2 ? RANK_COLORS[2] : "text-muted-foreground"
                    }`}>
                      {entry.rank}
                    </span>

                    {/* Avatar */}
                    <Avatar className="w-9 h-9 shrink-0">
                      {entry.avatarUrl && <AvatarImage src={entry.avatarUrl} />}
                      <AvatarFallback className="bg-muted text-xs font-semibold">
                        {(entry.nickname || entry.uniqueId || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {entry.nickname || entry.uniqueId}
                        {i === 0 && <Crown className="inline w-3.5 h-3.5 ml-1.5 text-yellow-400" />}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">@{entry.uniqueId}</p>
                    </div>

                    {/* Live indicator */}
                    {entry.isLive && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-400 border-green-400/20 shrink-0 gap-1">
                        <Wifi className="w-2.5 h-2.5" />LIVE
                      </Badge>
                    )}

                    {/* Score */}
                    <span className="font-mono text-xs text-muted-foreground shrink-0 text-right min-w-[60px]">
                      {entry.score.toLocaleString()} pts
                    </span>

                    {/* Monitor link */}
                    {entry.isLive && (
                      <Link href={`/monitor/${entry.uniqueId}`}>
                        <Button size="sm" variant="ghost"
                          className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs gap-1">
                          <ExternalLink className="w-3 h-3" />Monitor
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
