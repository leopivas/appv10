import { useState } from "react";
import { useGetGamingRanklist, useGetGamingMovers, useGetRegionMovers, getGetGamingRanklistQueryKey, getGetGamingMoversQueryKey, getGetRegionMoversQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { Gamepad2, TrendingUp, TrendingDown, Radio, Crown, RefreshCw, Eye, Globe } from "lucide-react";

const REGIONS = [
  { code: "US+", label: "United States" },
  { code: "BR", label: "Brazil" },
  { code: "LATAM", label: "Latin America" },
  { code: "JP", label: "Japan" },
  { code: "KR", label: "South Korea" },
  { code: "TW", label: "Taiwan" },
  { code: "ID", label: "Indonesia" },
  { code: "MY", label: "Malaysia" },
  { code: "PH", label: "Philippines" },
  { code: "TH", label: "Thailand" },
  { code: "VN", label: "Vietnam" },
  { code: "DE+", label: "Germany" },
  { code: "FR+", label: "France" },
  { code: "UK+", label: "United Kingdom" },
  { code: "IT+", label: "Italy" },
  { code: "ES+", label: "Spain" },
  { code: "TR", label: "Turkey" },
  { code: "BK", label: "Balkans" },
  { code: "MENA", label: "Middle East & North Africa" },
];

interface RanklistEntry {
  rank: number;
  uniqueId: string;
  nickname?: string;
  avatar?: string;
  score: number;
  usd?: number;
  isLive?: boolean;
  masked?: boolean;
}

interface MoverEntry {
  rank?: number;
  uniqueId: string;
  nickname?: string;
  avatar?: string;
  score?: number;
  direction?: "up" | "down" | "new";
  masked?: boolean;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-400 font-bold text-lg">🥇</span>;
  if (rank === 2) return <span className="text-slate-300 font-bold text-lg">🥈</span>;
  if (rank === 3) return <span className="text-amber-600 font-bold text-lg">🥉</span>;
  return <span className="text-muted-foreground font-mono text-sm w-8 text-center">{rank}</span>;
}

function MoverRow({ m }: { m: MoverEntry }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-accent/40 transition-colors group">
      <div className="w-8 flex justify-center shrink-0">
        {m.direction === "up" || !m.direction ? (
          <TrendingUp className="w-4 h-4 text-green-400" />
        ) : m.direction === "new" ? (
          <span className="text-xs text-blue-400 font-bold">NEW</span>
        ) : (
          <TrendingDown className="w-4 h-4 text-red-400" />
        )}
      </div>
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarImage src={m.avatar} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {m.masked ? "?" : (m.nickname?.[0] ?? m.uniqueId?.[0])?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${m.masked ? "italic text-muted-foreground" : ""}`}>
          {m.masked ? `someone-${m.uniqueId?.slice(-6)}` : (m.nickname ?? m.uniqueId)}
        </p>
        {!m.masked && <p className="text-xs text-muted-foreground">@{m.uniqueId}</p>}
      </div>
      {m.score !== undefined && (
        <span className="text-sm font-mono text-foreground shrink-0">{m.score.toLocaleString()}</span>
      )}
      {m.rank !== undefined && (
        <Badge variant="outline" className="text-xs shrink-0">#{m.rank}</Badge>
      )}
    </div>
  );
}

function EntryRow({ entry, onMonitor }: { entry: RanklistEntry; onMonitor?: (uid: string) => void }) {
  const [, nav] = useLocation();
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-accent/40 transition-colors group">
      <div className="w-8 flex justify-center shrink-0">
        <RankBadge rank={entry.rank} />
      </div>
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarImage src={entry.avatar} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {entry.masked ? "?" : (entry.nickname?.[0] ?? entry.uniqueId[0])?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${entry.masked ? "text-muted-foreground italic" : ""}`}>
          {entry.masked ? `someone-${entry.uniqueId?.slice(-6)}` : (entry.nickname ?? entry.uniqueId)}
        </p>
        {!entry.masked && (
          <p className="text-xs text-muted-foreground truncate">@{entry.uniqueId}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-mono text-foreground">{(entry.score ?? 0).toLocaleString()}</p>
        {entry.usd !== undefined && (
          <p className="text-xs text-muted-foreground">${entry.usd?.toFixed(0)}</p>
        )}
      </div>
      {entry.isLive && (
        <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-xs shrink-0">
          <Radio className="w-2.5 h-2.5 mr-1" />LIVE
        </Badge>
      )}
      {!entry.masked && onMonitor && (
        <Button
          size="icon"
          variant="ghost"
          className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={() => nav(`/monitor/${entry.uniqueId}`)}
          title="Monitor stream"
        >
          <Eye className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

export default function GamingLeaderboard() {
  const [region, setRegion] = useState("US+");
  const [, nav] = useLocation();

  const { data: ranklistData, isLoading: loadingRank, refetch: refetchRank } = useGetGamingRanklist(
    { region },
    { query: { queryKey: getGetGamingRanklistQueryKey({ region }), staleTime: 1000 * 60 * 2 } }
  );
  const { data: moversData, isLoading: loadingMovers, refetch: refetchMovers } = useGetGamingMovers(
    { region },
    { query: { queryKey: getGetGamingMoversQueryKey({ region }), staleTime: 1000 * 60 * 2 } }
  );
  const { data: regionMoversData, isLoading: loadingRegionMovers, refetch: refetchRegionMovers } = useGetRegionMovers(
    { region },
    { query: { queryKey: getGetRegionMoversQueryKey({ region }), staleTime: 1000 * 60 * 2 } }
  );

  const rawRanklist = ranklistData as { entries?: RanklistEntry[]; region?: string } | undefined;
  const rawMovers = moversData as { entries?: MoverEntry[] } | undefined;
  const rawRegionMovers = regionMoversData as { entries?: MoverEntry[] } | undefined;
  const entries: RanklistEntry[] = rawRanklist?.entries ?? [];
  const movers: MoverEntry[] = rawMovers?.entries ?? [];
  const regionMovers: MoverEntry[] = rawRegionMovers?.entries ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gamepad2 className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">Gaming Leaderboard</h1>
          </div>
          <p className="text-muted-foreground text-sm">Top 99 gaming creators currently live in a TikTok region</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((r) => (
                <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => { refetchRank(); refetchMovers(); refetchRegionMovers(); }}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="ranklist">
        <TabsList className="mb-4">
          <TabsTrigger value="ranklist">
            <Crown className="w-4 h-4 mr-1.5" />Top 99
          </TabsTrigger>
          <TabsTrigger value="movers">
            <TrendingUp className="w-4 h-4 mr-1.5" />Gaming Movers
          </TabsTrigger>
          <TabsTrigger value="region-movers">
            <Globe className="w-4 h-4 mr-1.5" />Region Movers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ranklist">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Gaming Top 99 — {region}</span>
                {rawRanklist?.region && rawRanklist.region !== region && (
                  <Badge variant="outline" className="text-xs">{rawRanklist.region}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingRank ? (
                <div className="space-y-1 p-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : entries.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Gamepad2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No data available for this region</p>
                  <p className="text-xs mt-1 opacity-60">Global Agency tier required for full access</p>
                </div>
              ) : (
                <div className="py-1">
                  {entries.map((entry) => (
                    <EntryRow key={entry.rank} entry={entry} onMonitor={(uid) => nav(`/monitor/${uid}`)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movers">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Gaming creators who entered / left Top 99 today</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingMovers ? (
                <div className="space-y-1 p-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : movers.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No movers data available</p>
                  <p className="text-xs mt-1 opacity-60">Global Agency tier required</p>
                </div>
              ) : (
                <div className="py-1">
                  {movers.map((m, i) => (
                    <MoverRow key={i} m={m} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="region-movers">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Regional leaderboard movers — {region}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingRegionMovers ? (
                <div className="space-y-1 p-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : regionMovers.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No regional movers data available</p>
                  <p className="text-xs mt-1 opacity-60">Global Agency tier required for unmasked rows</p>
                </div>
              ) : (
                <div className="py-1">
                  {regionMovers.map((m, i) => (
                    <MoverRow key={i} m={m} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
