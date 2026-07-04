import { useGetRateLimits, getGetRateLimitsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart2, RefreshCw, Loader2, XCircle } from "lucide-react";

export default function StreamerRateLimits() {
  const rateLimits = useGetRateLimits({ query: { queryKey: getGetRateLimitsQueryKey() } });

  const rl = rateLimits.data as {
    tier?: string; apiLimit?: number; apiRemaining?: number; apiResetAt?: number | null;
    wsLimit?: number; wsCurrent?: number; bulkCheckLimit?: number | null;
  } | undefined;

  const apiUsed = rl ? (rl.apiLimit ?? 0) - (rl.apiRemaining ?? 0) : 0;
  const apiPct = rl?.apiLimit ? Math.round((apiUsed / rl.apiLimit) * 100) : 0;
  const wsPct = rl?.wsLimit ? Math.round(((rl.wsCurrent ?? 0) / rl.wsLimit) * 100) : 0;

  function barColor(pct: number) {
    if (pct >= 90) return "bg-destructive";
    if (pct >= 70) return "bg-yellow-400";
    return "bg-primary";
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Rate Limits
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Live tik.tools API usage for your account key.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => rateLimits.refetch()} disabled={rateLimits.isFetching}>
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${rateLimits.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {rateLimits.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-10">
          <Loader2 className="w-5 h-5 animate-spin" />Loading…
        </div>
      ) : rateLimits.isError ? (
        <Card className="bg-card border-destructive/30 max-w-lg">
          <CardContent className="py-8 text-center text-destructive text-sm">
            <XCircle className="w-6 h-6 mx-auto mb-2" />
            Failed to load — check your TIKTOOLS_API_KEY in Settings
          </CardContent>
        </Card>
      ) : rl ? (
        <div className="space-y-4 max-w-xl">
          {rl.tier && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Account tier:</span>
              <Badge variant="outline" className="capitalize text-primary border-primary/30">{rl.tier}</Badge>
            </div>
          )}

          {/* API Calls */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                API Calls — current window
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono font-semibold">{apiUsed.toLocaleString()} <span className="text-muted-foreground font-normal">/ {(rl.apiLimit ?? 0).toLocaleString()}</span></span>
                <span className={`text-xs font-mono ${apiPct >= 90 ? "text-destructive" : apiPct >= 70 ? "text-yellow-400" : "text-green-400"}`}>
                  {(rl.apiRemaining ?? 0).toLocaleString()} remaining
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${barColor(apiPct)}`} style={{ width: `${Math.min(apiPct, 100)}%` }} />
              </div>
              {rl.apiResetAt && (
                <p className="text-xs text-muted-foreground">
                  Window resets at {new Date(rl.apiResetAt * 1000).toLocaleTimeString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* WebSocket */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                WebSocket Connections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono font-semibold">{rl.wsCurrent ?? 0} <span className="text-muted-foreground font-normal">/ {rl.wsLimit ?? "?"}</span></span>
                <span className="text-xs font-mono text-muted-foreground">{(rl.wsLimit ?? 0) - (rl.wsCurrent ?? 0)} available</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${barColor(wsPct)}`} style={{ width: `${Math.min(wsPct, 100)}%` }} />
              </div>
            </CardContent>
          </Card>

          {/* Bulk Check */}
          {rl.bulkCheckLimit != null && (
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bulk Check limit</span>
                <span className="font-mono text-sm font-bold">{rl.bulkCheckLimit} usernames / request</span>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}
