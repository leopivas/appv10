import { useParams } from "wouter";
import { useGetGifterProfile, useGetTopGifters, getGetGifterProfileQueryKey, getGetTopGiftersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Diamond, ArrowLeft, Crown, Users, Gift, TrendingUp, Clock, ExternalLink, Flame } from "lucide-react";

interface GifterProfileData {
  username?: string;
  displayName?: string;
  profilePic?: string;
  totalDiamonds?: number;
  creatorsGifted?: number;
  giftCount?: number;
  loyaltyScore?: number;
  firstGiftAt?: string;
  lastGiftAt?: string;
  masked?: boolean;
  topCreators?: Array<{ creator?: string; diamonds?: number; giftCount?: number }>;
  recentGifts?: Array<{ giftName?: string; diamonds?: number; creator?: string; sentAt?: string }>;
  velocity?: { daily?: number; weekly?: number; monthly?: number };
}

function StatBlock({ label, value, sub, icon: Icon }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold font-mono">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function formatDiamonds(n?: number) {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M 💎`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K 💎`;
  return `${n} 💎`;
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function GifterProfile() {
  const params = useParams<{ username: string }>();
  const [, nav] = useLocation();
  const username = params?.username ?? "";

  const { data: profileData, isLoading: loadingProfile } = useGetGifterProfile(
    { username },
    { query: { queryKey: getGetGifterProfileQueryKey({ username }), enabled: !!username, staleTime: 1000 * 60 * 5 } }
  );

  const { data: topGiftersData, isLoading: _loadingTop } = useGetTopGifters(
    { creator: username, limit: 20 },
    { query: { queryKey: getGetTopGiftersQueryKey({ creator: username, limit: 20 }), enabled: !!username, staleTime: 1000 * 60 * 5 } }
  );

  const profile = profileData as GifterProfileData | undefined;
  const topGifters = topGiftersData as { gifters?: Array<{ creator?: string; totalDiamonds?: number; giftCount?: number }> } | undefined;

  const loading = loadingProfile;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => nav("/gifters")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Diamond className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">Gifter Profile</h1>
          </div>
          <p className="text-muted-foreground text-sm">@{username}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      ) : !profile ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Diamond className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No data found for @{username}</p>
            <p className="text-xs text-muted-foreground mt-1">Global Agency tier required for unmasked gifter profiles</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Profile header */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-4 flex-wrap">
                <Avatar className="w-16 h-16 shrink-0">
                  <AvatarImage src={profile.profilePic} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                    {profile.masked ? "?" : (profile.displayName?.[0] ?? profile.username?.[0] ?? "?").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className={`text-xl font-semibold ${profile.masked ? "italic text-muted-foreground" : ""}`}>
                    {profile.masked ? `Anonymous Gifter` : (profile.displayName ?? profile.username ?? username)}
                  </p>
                  {!profile.masked && profile.username && (
                    <p className="text-sm text-muted-foreground">@{profile.username}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {profile.loyaltyScore !== undefined && (
                      <Badge variant="secondary" className="text-xs">
                        <Flame className="w-3 h-3 mr-1 text-orange-400" />
                        Loyalty {profile.loyaltyScore?.toLocaleString()}
                      </Badge>
                    )}
                    {profile.firstGiftAt && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Since {formatDate(profile.firstGiftAt)}
                      </Badge>
                    )}
                    {!profile.masked && profile.username && (
                      <Button size="sm" variant="outline" className="text-xs h-7" asChild>
                        <a href={`https://tiktok.com/@${profile.username}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 mr-1" />TikTok
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBlock
              icon={Diamond}
              label="Total Diamonds"
              value={formatDiamonds(profile.totalDiamonds)}
            />
            <StatBlock
              icon={Users}
              label="Creators Gifted"
              value={profile.creatorsGifted ?? "—"}
            />
            <StatBlock
              icon={Gift}
              label="Total Gifts"
              value={profile.giftCount?.toLocaleString() ?? "—"}
            />
            <StatBlock
              icon={TrendingUp}
              label="Last Gift"
              value={formatDate(profile.lastGiftAt)}
            />
          </div>

          {/* Velocity */}
          {profile.velocity && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Gift Velocity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {profile.velocity.daily !== undefined && (
                    <div className="text-center p-3 rounded-lg bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Daily avg</p>
                      <p className="text-lg font-bold font-mono text-cyan-400">{formatDiamonds(profile.velocity.daily)}</p>
                    </div>
                  )}
                  {profile.velocity.weekly !== undefined && (
                    <div className="text-center p-3 rounded-lg bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Weekly avg</p>
                      <p className="text-lg font-bold font-mono text-cyan-400">{formatDiamonds(profile.velocity.weekly)}</p>
                    </div>
                  )}
                  {profile.velocity.monthly !== undefined && (
                    <div className="text-center p-3 rounded-lg bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Monthly avg</p>
                      <p className="text-lg font-bold font-mono text-cyan-400">{formatDiamonds(profile.velocity.monthly)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top creators supported */}
          {(profile.topCreators ?? []).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  Top Creators Supported
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="py-1">
                  {(profile.topCreators ?? []).map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 py-2.5 px-4 hover:bg-accent/40 rounded-lg transition-colors cursor-pointer"
                      onClick={() => c.creator && nav(`/monitor/${c.creator}`)}
                    >
                      <span className="text-muted-foreground font-mono text-sm w-6">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">@{c.creator ?? "Unknown"}</p>
                      </div>
                      <span className="text-sm font-mono text-cyan-400">{formatDiamonds(c.diamonds)}</span>
                      {c.giftCount !== undefined && (
                        <Badge variant="outline" className="text-xs shrink-0">{c.giftCount} gifts</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent big gifts */}
          {(profile.recentGifts ?? []).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gift className="w-4 h-4 text-primary" />
                  Recent Big Gifts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="py-1">
                  {(profile.recentGifts ?? []).map((g, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 px-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{g.giftName ?? "Gift"}</p>
                        {g.creator && <p className="text-xs text-muted-foreground">to @{g.creator}</p>}
                      </div>
                      <span className="text-sm font-mono text-cyan-400 shrink-0">{formatDiamonds(g.diamonds)}</span>
                      {g.sentAt && (
                        <span className="text-xs text-muted-foreground shrink-0">{formatDate(g.sentAt)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
