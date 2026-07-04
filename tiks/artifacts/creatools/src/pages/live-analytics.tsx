import { useState } from "react";
import { useGetLiveAnalyticsVideoList, useGetLiveAnalyticsVideoDetail, useGetLiveAnalyticsUserInteractions, getGetLiveAnalyticsVideoListQueryKey, getGetLiveAnalyticsVideoDetailQueryKey, getGetLiveAnalyticsUserInteractionsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart2, Search, Play, Eye, Heart, Users, TrendingUp, Video, Lock, RefreshCw, Trophy, Diamond } from "lucide-react";
import { useLocation } from "wouter";

interface VideoEntry {
  video_id?: string;
  title?: string;
  duration?: number;
  viewer_count?: number;
  peak_viewer_count?: number;
  start_time?: number;
  end_time?: number;
  cover_url?: string;
  like_count?: number;
  comment_count?: number;
  new_followers?: number;
  diamonds?: number;
}

interface VideoDetail {
  video_id?: string;
  title?: string;
  total_views?: number;
  peak_viewers?: number;
  avg_viewers?: number;
  new_followers?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  diamonds?: number;
  duration?: number;
  engagement_rate?: number;
  start_time?: number;
}

function formatDuration(secs?: number): string {
  if (!secs) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function formatDate(ts?: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

interface InteractionEntry {
  uniqueId?: string;
  nickname?: string;
  avatarUrl?: string;
  giftScore?: number;
  rank?: number;
  diamonds?: number;
}

function AudienceRoster({ roomId }: { roomId: string }) {
  const { data, isLoading, refetch } = useGetLiveAnalyticsUserInteractions(
    { room_id: roomId, count: 50 },
    { query: { queryKey: getGetLiveAnalyticsUserInteractionsQueryKey({ room_id: roomId, count: 50 }), staleTime: 1000 * 60 * 2 } }
  );

  const raw = data as { users?: InteractionEntry[]; signedUrl?: string } | undefined;
  const users: InteractionEntry[] = raw?.users ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Audience ranked by gift score</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh
        </Button>
      </div>
      {isLoading ? (
        <div className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : raw?.signedUrl ? (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-amber-300 mb-1">Sign-and-return response</p>
            <p className="text-xs text-muted-foreground mb-2">
              Fetch this signed URL directly from your browser with your TikTok session cookies to get the audience roster.
            </p>
            <code className="text-xs bg-muted/60 p-2 rounded block break-all">{raw.signedUrl}</code>
          </CardContent>
        </Card>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No audience data — provide a valid Room ID and session cookies</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {users.map((u, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 text-center text-xs text-muted-foreground font-mono">{u.rank ?? i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.nickname ?? u.uniqueId ?? "Unknown"}</p>
                  {u.uniqueId && <p className="text-xs text-muted-foreground">@{u.uniqueId}</p>}
                </div>
                {u.diamonds !== undefined && (
                  <span className="text-sm font-mono text-cyan-400">{u.diamonds.toLocaleString()} 💎</span>
                )}
                {u.giftScore !== undefined && (
                  <span className="text-xs text-muted-foreground">{u.giftScore.toLocaleString()} pts</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function LiveAnalytics() {
  const [, nav] = useLocation();
  const [username, setUsername] = useState("");
  const [inputUsername, setInputUsername] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [audienceRoomId, setAudienceRoomId] = useState("");
  const [audienceRoomInput, setAudienceRoomInput] = useState("");

  const { data: videoListData, isLoading: loadingList, refetch: refetchList, error: listError } = useGetLiveAnalyticsVideoList(
    { unique_id: username, count: 20 },
    { query: { queryKey: getGetLiveAnalyticsVideoListQueryKey({ unique_id: username, count: 20 }), enabled: !!username, staleTime: 1000 * 60 * 5 } }
  );

  const { data: videoDetailData, isLoading: loadingDetail } = useGetLiveAnalyticsVideoDetail(
    { video_id: selectedVideoId ?? "" },
    { query: { queryKey: getGetLiveAnalyticsVideoDetailQueryKey({ video_id: selectedVideoId ?? "" }), enabled: !!selectedVideoId, staleTime: 1000 * 60 * 5 } }
  );

  const raw = videoListData as { videos?: VideoEntry[]; status_code?: number; error?: string } | undefined;
  const videos: VideoEntry[] = raw?.videos ?? [];
  const detail = videoDetailData as VideoDetail | undefined;

  function handleSearch() {
    const uid = inputUsername.trim().replace(/^@/, "");
    if (!uid) return;
    setUsername(uid);
    setSelectedVideoId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">Live Analytics</h1>
          </div>
          <p className="text-muted-foreground text-sm">Historical live stream data — views, gifts, followers, engagement</p>
        </div>
      </div>

      {/* Cookie notice */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-300">Session cookies required</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Live Analytics uses TikTok's internal API. You must be logged into TikTok and provide your session
                cookies via the <code className="bg-muted px-1 rounded">x-tiktok-cookie</code> header. This feature works best with
                your own account data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">
            <Video className="w-4 h-4 mr-1.5" />Stream History
          </TabsTrigger>
          <TabsTrigger value="audience">
            <Trophy className="w-4 h-4 mr-1.5" />Audience Roster
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="history">
            {/* Search */}
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input
                  placeholder="username"
                  className="pl-7"
                  value={inputUsername}
                  onChange={(e) => setInputUsername(e.target.value.replace(/^@/, ""))}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={!inputUsername.trim()}>
                <Search className="w-4 h-4 mr-2" />Search
              </Button>
              {username && (
                <Button variant="outline" size="icon" onClick={() => refetchList()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
            </div>

            {!username ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <BarChart2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Enter a username to view their live stream history</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Video list */}
                <div className="lg:col-span-1 space-y-3">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Past Streams — @{username}</h2>
                  {loadingList ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))
                  ) : videos.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <Video className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">No stream recordings found</p>
                        <p className="text-xs text-muted-foreground mt-1 opacity-60">
                          Cookie authentication may be required
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {videos.map((v) => (
                        <button
                          key={v.video_id}
                          onClick={() => setSelectedVideoId(v.video_id ?? null)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedVideoId === v.video_id
                              ? "bg-primary/10 border-primary/30"
                              : "border-border hover:bg-accent/40"
                          }`}
                        >
                          <p className="text-sm font-medium truncate mb-1">{v.title ?? "Untitled stream"}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span>{formatDate(v.start_time)}</span>
                            <span className="text-border">·</span>
                            <span>{formatDuration(v.duration)}</span>
                            {v.peak_viewer_count !== undefined && (
                              <>
                                <span className="text-border">·</span>
                                <span className="flex items-center gap-0.5">
                                  <Eye className="w-3 h-3" />{v.peak_viewer_count.toLocaleString()} peak
                                </span>
                              </>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Detail panel */}
                <div className="lg:col-span-2 space-y-4">
                  {!selectedVideoId ? (
                    <Card>
                      <CardContent className="py-16 text-center">
                        <Play className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">Select a stream to view analytics</p>
                      </CardContent>
                    </Card>
                  ) : loadingDetail ? (
                    <div className="grid grid-cols-2 gap-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-base font-semibold mb-0.5">{detail?.title ?? "Stream Analytics"}</h2>
                        {detail?.start_time && (
                          <p className="text-xs text-muted-foreground">{formatDate(detail.start_time)} · {formatDuration(detail.duration)}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <StatCard icon={Eye} label="Total Views" value={detail?.total_views ?? "—"} />
                        <StatCard icon={Users} label="Peak Viewers" value={detail?.peak_viewers ?? "—"} />
                        <StatCard icon={Users} label="Avg Viewers" value={detail?.avg_viewers ?? "—"} />
                        <StatCard icon={TrendingUp} label="New Followers" value={detail?.new_followers ?? "—"} />
                        <StatCard icon={Heart} label="Likes" value={detail?.like_count ?? "—"} />
                        <StatCard icon={Diamond} label="Diamonds" value={detail?.diamonds ?? "—"} />
                      </div>
                      {detail?.engagement_rate !== undefined && (
                        <Card>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Engagement Rate</span>
                              <span className="text-lg font-bold text-primary">{(detail.engagement_rate * 100).toFixed(1)}%</span>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${Math.min(100, (detail.engagement_rate ?? 0) * 100)}%` }}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="audience">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Real-time audience roster ranked by gift score for a live room. Requires the room ID of an active stream.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Room ID (e.g. 7123456789012345678)"
                  className="max-w-sm font-mono text-xs"
                  value={audienceRoomInput}
                  onChange={(e) => setAudienceRoomInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setAudienceRoomId(audienceRoomInput.trim())}
                />
                <Button onClick={() => setAudienceRoomId(audienceRoomInput.trim())} disabled={!audienceRoomInput.trim()}>
                  <Search className="w-4 h-4 mr-2" />Load Roster
                </Button>
              </div>
              {audienceRoomId ? (
                <AudienceRoster roomId={audienceRoomId} />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Trophy className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Enter a Room ID to load the live audience leaderboard</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
