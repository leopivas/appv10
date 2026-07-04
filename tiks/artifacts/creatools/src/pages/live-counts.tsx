import { useGetLiveCounts, getGetLiveCountsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio, RefreshCw, Globe, TrendingUp } from "lucide-react";

const REGION_LABELS: Record<string, string> = {
  "US+": "United States",
  "BR": "Brazil",
  "LATAM": "Latin America",
  "JP": "Japan",
  "KR": "South Korea",
  "TW": "Taiwan",
  "ID": "Indonesia",
  "MY": "Malaysia",
  "PH": "Philippines",
  "TH": "Thailand",
  "VN": "Vietnam",
  "DE+": "Germany",
  "FR+": "France",
  "UK+": "United Kingdom",
  "IT+": "Italy",
  "ES+": "Spain",
  "TR": "Turkey",
  "BK": "Balkans",
  "MENA": "Middle East & N. Africa",
  "RU": "Russia",
  "IN": "India",
  "SA": "Saudi Arabia",
  "EG": "Egypt",
  "NG": "Nigeria",
  "MX": "Mexico",
  "CO": "Colombia",
  "AR": "Argentina",
  "PK": "Pakistan",
  "BD": "Bangladesh",
};

interface LiveCountsResponse {
  status_code?: number;
  global_live?: number;
  global_live_verified?: number;
  regions?: Record<string, number>;
}

function formatCount(n?: number): string {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function LiveCounts() {
  const { data, isLoading, refetch, dataUpdatedAt } = useGetLiveCounts({
    query: {
      queryKey: getGetLiveCountsQueryKey(),
      staleTime: 1000 * 30,
      refetchInterval: 1000 * 30,
    },
  });

  const raw = data as LiveCountsResponse | undefined;
  const regions = raw?.regions ?? {};
  const sorted = Object.entries(regions).sort((a, b) => b[1] - a[1]);
  const globalLive = raw?.global_live;
  const globalVerified = raw?.global_live_verified;
  const updatedAt = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">Live Counts</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Global + per-region live creator counts — refreshed every 30s
          </p>
        </div>
        <div className="flex items-center gap-3">
          {updatedAt && (
            <span className="text-xs text-muted-foreground">
              Updated {updatedAt.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Global Live Creators</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-foreground">{formatCount(globalLive)}</span>
                <Badge className="mb-1 bg-red-500/10 text-red-400 border-red-500/30 text-xs animate-pulse">
                  <Radio className="w-2.5 h-2.5 mr-1" />LIVE
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Verified Creators Live</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-foreground">{formatCount(globalVerified)}</span>
                <span className="text-xs text-muted-foreground mb-1">verified accounts</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Region breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Live Creators by Region</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-1 p-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Radio className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No regional data available</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sorted.map(([code, count], idx) => {
                const max = sorted[0]?.[1] ?? 1;
                const pct = Math.round((count / max) * 100);
                const label = REGION_LABELS[code] ?? code;
                return (
                  <div key={code} className="flex items-center gap-4 px-4 py-3 hover:bg-accent/30 transition-colors">
                    <div className="w-6 text-center text-xs text-muted-foreground font-mono shrink-0">
                      {idx + 1}
                    </div>
                    <div className="w-10 text-right">
                      <Badge variant="outline" className="text-xs font-mono px-1.5">{code}</Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{label}</span>
                        <span className="text-sm font-mono text-foreground shrink-0 ml-2">{count.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
