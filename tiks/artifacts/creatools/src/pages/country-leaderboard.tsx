import { useState } from "react";
import { useGetCountryLeaderboard, getGetCountryLeaderboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Globe, Search, Radio, Diamond, RefreshCw, TrendingUp, Calendar } from "lucide-react";
import { useLocation } from "wouter";

const POPULAR = [
  { slug: "united-states-region", label: "🇺🇸 United States" },
  { slug: "brazil", label: "🇧🇷 Brazil" },
  { slug: "united-kingdom", label: "🇬🇧 United Kingdom" },
  { slug: "japan", label: "🇯🇵 Japan" },
  { slug: "south-korea", label: "🇰🇷 South Korea" },
  { slug: "indonesia", label: "🇮🇩 Indonesia" },
  { slug: "germany", label: "🇩🇪 Germany" },
  { slug: "france", label: "🇫🇷 France" },
  { slug: "italy", label: "🇮🇹 Italy" },
  { slug: "turkey", label: "🇹🇷 Turkey" },
  { slug: "balkans", label: "🇬🇷 Balkans" },
  { slug: "latam", label: "🌎 LATAM" },
  { slug: "mena", label: "🌍 MENA" },
  { slug: "taiwan", label: "🇹🇼 Taiwan" },
  { slug: "philippines", label: "🇵🇭 Philippines" },
  { slug: "thailand", label: "🇹🇭 Thailand" },
  { slug: "vietnam", label: "🇻🇳 Vietnam" },
  { slug: "malaysia", label: "🇲🇾 Malaysia" },
];

interface ChannelEntry {
  rank?: number;
  uniqueId?: string;
  displayName?: string;
  score?: number;
  alive?: boolean;
  roomId?: string;
  profilePic?: string;
  masked?: boolean;
}

interface LeaderboardData {
  country?: { code?: string; name?: string; slug?: string };
  region?: { code?: string };
  current?: {
    fetched_at?: string;
    live_count?: number;
    total_score?: number;
    channels?: ChannelEntry[];
  };
  history?: Array<{ date?: string; total_score?: number; entry_count?: number }>;
  masked?: boolean;
  next_reset?: string;
}

export default function CountryLeaderboard() {
  const [slug, setSlug] = useState("united-kingdom");
  const [inputSlug, setInputSlug] = useState("");
  const [, nav] = useLocation();

  const { data, isLoading, refetch } = useGetCountryLeaderboard(
    slug,
    { query: { queryKey: getGetCountryLeaderboardQueryKey(slug), staleTime: 1000 * 60 * 3 } }
  );

  const raw = data as LeaderboardData | undefined;
  const channels: ChannelEntry[] = raw?.current?.channels ?? [];

  function handleSearch() {
    const s = inputSlug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!s) return;
    setSlug(s);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">Country Leaderboard</h1>
          </div>
          <p className="text-muted-foreground text-sm">Real-time TikTok LIVE creator rankings by country or region</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="country-slug (e.g. greece, balkans)"
            className="pl-9"
            value={inputSlug}
            onChange={(e) => setInputSlug(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} disabled={!inputSlug.trim()} variant="outline">
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* Quick picks */}
      <div className="flex flex-wrap gap-2">
        {POPULAR.map((p) => (
          <button
            key={p.slug}
            onClick={() => setSlug(p.slug)}
            className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
              slug === p.slug
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-border hover:bg-accent text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Header stats */}
      {raw?.current && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Globe className="w-3 h-3" />Country
              </p>
              <p className="font-semibold">{raw.country?.name ?? slug}</p>
              {raw.region?.code && <p className="text-xs text-muted-foreground">{raw.region.code} region</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Radio className="w-3 h-3 text-red-400" />Live Creators
              </p>
              <p className="font-semibold text-red-400">{raw.current.live_count?.toLocaleString() ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Diamond className="w-3 h-3 text-cyan-400" />Total Score
              </p>
              <p className="font-semibold text-cyan-400">{raw.current.total_score?.toLocaleString() ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />Next Reset
              </p>
              <p className="font-semibold text-xs">
                {raw.next_reset ? new Date(raw.next_reset).toLocaleDateString() : "—"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ranking table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Rankings — {raw?.country?.name ?? slug}
            {raw?.masked && (
              <Badge variant="outline" className="ml-2 text-xs">PRO+ for full access</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-1 p-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : channels.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No leaderboard data for this country</p>
              <p className="text-xs mt-1 opacity-60">Try a different slug or check the URL</p>
            </div>
          ) : (
            <ScrollArea className="h-[480px]">
              <div className="py-1">
                {channels.map((ch) => (
                  <div
                    key={ch.rank}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-accent/40 transition-colors group cursor-pointer"
                    onClick={() => !ch.masked && ch.uniqueId && nav(`/monitor/${ch.uniqueId}`)}
                  >
                    <div className="w-8 text-center shrink-0">
                      {(ch.rank ?? 0) <= 3 ? (
                        <span className="text-lg">{["🥇", "🥈", "🥉"][(ch.rank ?? 1) - 1]}</span>
                      ) : (
                        <span className="text-muted-foreground font-mono text-sm">{ch.rank}</span>
                      )}
                    </div>
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={ch.profilePic} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {ch.masked ? "?" : (ch.displayName?.[0] ?? ch.uniqueId?.[0] ?? "?").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${ch.masked ? "italic text-muted-foreground" : ""}`}>
                        {ch.masked ? `someone-${ch.uniqueId?.slice(-6) ?? ch.rank}` : (ch.displayName ?? ch.uniqueId)}
                      </p>
                      {!ch.masked && ch.uniqueId && (
                        <p className="text-xs text-muted-foreground">@{ch.uniqueId}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono text-cyan-400">
                        {(ch.score ?? 0).toLocaleString()} 💎
                      </p>
                    </div>
                    {ch.alive && (
                      <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-xs shrink-0">
                        <Radio className="w-2.5 h-2.5 mr-1" />LIVE
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {(raw?.history ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />Score History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(raw?.history ?? []).map((h) => (
                <div key={h.date} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{h.date}</span>
                  <div className="flex items-center gap-4">
                    {h.entry_count !== undefined && (
                      <span className="text-muted-foreground text-xs">{h.entry_count} creators</span>
                    )}
                    <span className="font-mono text-cyan-400">{h.total_score?.toLocaleString()} 💎</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
