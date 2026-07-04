import { useState } from "react";
import { useGetGiftersLeaderboard, getGetGiftersLeaderboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Diamond, RefreshCw, Crown, Search, Globe } from "lucide-react";

const REGIONS = [
  { code: "GLOBAL", label: "Global" },
  { code: "US+", label: "United States" },
  { code: "BR", label: "Brazil" },
  { code: "JP", label: "Japan" },
  { code: "KR", label: "South Korea" },
  { code: "TW", label: "Taiwan" },
  { code: "ID", label: "Indonesia" },
  { code: "UK+", label: "United Kingdom" },
  { code: "DE+", label: "Germany" },
  { code: "FR+", label: "France" },
  { code: "BK", label: "Balkans" },
  { code: "MENA", label: "Middle East" },
  { code: "TR", label: "Turkey" },
];

const PERIODS = [
  { code: "daily", label: "Daily" },
  { code: "weekly", label: "Weekly" },
  { code: "monthly", label: "Monthly" },
  { code: "lifetime", label: "Lifetime" },
];

interface GifterEntry {
  rank: number;
  platformId?: string;
  username?: string;
  displayName?: string;
  totalDiamonds?: number;
  creatorsGifted?: number;
  giftCount?: number;
  profilePic?: string;
  profileUrl?: string;
  masked?: boolean;
}

function DiamondCount({ count }: { count: number }) {
  if (count >= 1_000_000) return <span>{(count / 1_000_000).toFixed(1)}M 💎</span>;
  if (count >= 1_000) return <span>{(count / 1_000).toFixed(0)}K 💎</span>;
  return <span>{count} 💎</span>;
}

export default function Gifters() {
  const [region, setRegion] = useState("GLOBAL");
  const [period, setPeriod] = useState("daily");
  const [searchQuery, setSearchQuery] = useState("");
  const [, nav] = useLocation();

  const { data, isLoading, refetch } = useGetGiftersLeaderboard(
    { region, period, limit: 100 },
    { query: { queryKey: getGetGiftersLeaderboardQueryKey({ region, period, limit: 100 }), staleTime: 1000 * 60 * 5 } }
  );

  const raw = data as { gifters?: GifterEntry[]; region?: string; period?: string } | undefined;
  const gifters: GifterEntry[] = (raw?.gifters ?? []).filter((g) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.username?.toLowerCase().includes(q) ||
      g.displayName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Diamond className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">Gifters Leaderboard</h1>
          </div>
          <p className="text-muted-foreground text-sm">Top diamond spenders across TikTok LIVE</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="w-44">
            <Globe className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REGIONS.map((r) => (
              <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search gifters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="w-4 h-4 text-yellow-400" />
            Top Gifters — {raw?.region ?? region} · {raw?.period ?? period}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-1 p-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : gifters.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Diamond className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No gifters data available</p>
              <p className="text-xs mt-1 opacity-60">Global Agency tier required for unmasked rows</p>
            </div>
          ) : (
            <div className="py-1">
              {gifters.map((g) => (
                <div
                  key={g.rank}
                  className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-accent/40 transition-colors group cursor-pointer"
                  onClick={() => !g.masked && g.username && nav(`/gifters/${g.username}`)}
                >
                  <div className="w-8 text-center shrink-0">
                    {g.rank <= 3 ? (
                      <span className="text-lg">{["🥇", "🥈", "🥉"][g.rank - 1]}</span>
                    ) : (
                      <span className="text-muted-foreground font-mono text-sm">{g.rank}</span>
                    )}
                  </div>
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarImage src={g.profilePic} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {g.masked ? "?" : (g.displayName?.[0] ?? g.username?.[0] ?? "?").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${g.masked ? "italic text-muted-foreground" : ""}`}>
                      {g.masked ? `someone-${g.platformId?.slice(-6) ?? g.rank}` : (g.displayName ?? g.username ?? "Unknown")}
                    </p>
                    {!g.masked && g.username && (
                      <p className="text-xs text-muted-foreground">@{g.username}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono text-cyan-400">
                      <DiamondCount count={g.totalDiamonds ?? 0} />
                    </p>
                    {g.creatorsGifted !== undefined && (
                      <p className="text-xs text-muted-foreground">{g.creatorsGifted} creators</p>
                    )}
                  </div>
                  {g.giftCount !== undefined && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {g.giftCount.toLocaleString()} gifts
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
