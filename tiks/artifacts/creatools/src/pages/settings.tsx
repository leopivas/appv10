import { useState } from "react";
import { useGetConfig, getGetConfigQueryKey, useSaveConfig, useGetRateLimits, getGetRateLimitsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, Key, Zap, Wifi, Loader2, Eye, EyeOff, Diamond, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TIER_FEATURES: Record<string, string[]> = {
  sandbox: ["Top channels", "Live status check", "WebSocket (3 concurrent)", "Gift catalog", "20 API calls/window"],
  basic: ["Everything in Sandbox", "Bulk live check", "Resolve user IDs", "Higher rate limits"],
  pro: ["Everything in Basic", "User profiles", "Room cover images", "Priority support"],
  ultra: ["Everything in Pro", "Maximum rate limits", "Dedicated support"],
};

const TIER_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  sandbox: { border: "border-muted", text: "text-muted-foreground", bg: "bg-muted/20" },
  basic: { border: "border-cyan-400/50", text: "text-cyan-400", bg: "bg-cyan-400/10" },
  pro: { border: "border-violet-400/50", text: "text-violet-400", bg: "bg-violet-400/10" },
  ultra: { border: "border-yellow-400/50", text: "text-yellow-400", bg: "bg-yellow-400/10" },
};

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);

  const { data: config, isLoading: configLoading } = useGetConfig({
    query: { queryKey: getGetConfigQueryKey() },
  });

  const { data: rateLimits, isLoading: rateLimitsLoading } = useGetRateLimits({
    query: { queryKey: getGetRateLimitsQueryKey() },
  });

  const saveConfig = useSaveConfig();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    saveConfig.mutate(
      { data: { apiKey: apiKeyInput.trim() } },
      {
        onSuccess: () => {
          setApiKeyInput("");
          queryClient.invalidateQueries({ queryKey: getGetConfigQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetRateLimitsQueryKey() });
          toast({ title: "API key saved", description: "Your tik.tools key has been updated." });
        },
        onError: () => {
          toast({ title: "Failed to save", description: "Could not save API key.", variant: "destructive" });
        },
      }
    );
  };

  const tier = rateLimits?.tier?.toLowerCase() ?? "sandbox";
  const tierStyle = TIER_COLORS[tier] ?? TIER_COLORS.sandbox;
  const tierFeatures = TIER_FEATURES[tier] ?? TIER_FEATURES.sandbox;

  const apiUsagePct = rateLimits
    ? Math.max(0, 100 - Math.round((rateLimits.apiRemaining / Math.max(rateLimits.apiLimit, 1)) * 100))
    : 0;

  const wsPct = rateLimits
    ? Math.round((rateLimits.wsCurrent / Math.max(rateLimits.wsLimit, 1)) * 100)
    : 0;

  return (
    <div className="space-y-8 max-w-2xl animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your tik.tools API connection</p>
      </div>

      {/* API Key */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">API Key</CardTitle>
          </div>
          <CardDescription>
            Your tik.tools API key.{" "}
            <a href="https://tik.tools/pricing" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
              Get one free <ExternalLink className="w-3 h-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-md bg-background border border-border">
              {config?.apiKeySet ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="font-mono text-sm text-muted-foreground flex-1">{config.apiKeyMasked || "Key configured"}</span>
                  <Badge variant="outline" className="text-xs border-green-400/30 text-green-400">Active</Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  <span className="text-sm text-muted-foreground flex-1">No API key configured</span>
                  <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">Missing</Badge>
                </>
              )}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="api-key" className="text-xs text-muted-foreground uppercase tracking-wider">
                {config?.apiKeySet ? "Replace Key" : "Set Key"}
              </Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  placeholder="tk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="font-mono text-sm bg-background border-border pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
            <Button type="submit" disabled={!apiKeyInput.trim() || saveConfig.isPending}>
              {saveConfig.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : "Save API Key"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Usage & Rate Limits</CardTitle>
          </div>
          <CardDescription>Current API quota consumption</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {rateLimitsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : rateLimits ? (
            <>
              {/* Tier badge */}
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium ${tierStyle.border} ${tierStyle.text} ${tierStyle.bg}`}>
                  <span className="uppercase font-mono text-xs">{rateLimits.tier}</span>
                </div>
                {tier === "sandbox" && (
                  <a
                    href="https://tik.tools/pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-0.5"
                  >
                    Upgrade for more features <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* API Requests */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Zap className="w-3.5 h-3.5" />
                    API Requests
                  </span>
                  <span className="font-mono text-xs">
                    <span className="text-foreground">{rateLimits.apiRemaining}</span>
                    <span className="text-muted-foreground"> / {rateLimits.apiLimit} remaining</span>
                  </span>
                </div>
                <Progress value={apiUsagePct} className="h-1.5 bg-muted" />
              </div>

              {/* WebSocket */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Wifi className="w-3.5 h-3.5" />
                    WebSocket Connections
                  </span>
                  <span className="font-mono text-xs">
                    <span className="text-foreground">{rateLimits.wsCurrent}</span>
                    <span className="text-muted-foreground"> / {rateLimits.wsLimit} active</span>
                  </span>
                </div>
                <Progress value={wsPct} className="h-1.5 bg-muted" />
              </div>

              {/* Bulk check limit */}
              {rateLimits.bulkCheckLimit !== null && rateLimits.bulkCheckLimit !== undefined && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Diamond className="w-3.5 h-3.5 text-yellow-400" />
                  Bulk check limit: <span className="font-mono text-foreground">{rateLimits.bulkCheckLimit} usernames/request</span>
                </div>
              )}

              {rateLimits.apiResetAt && (
                <p className="text-xs text-muted-foreground font-mono">
                  Resets at {new Date(rateLimits.apiResetAt * 1000).toLocaleTimeString()}
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              Set an API key to view rate limits
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tier Capabilities */}
      {rateLimits && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {tier.charAt(0).toUpperCase() + tier.slice(1)} Tier Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {tierFeatures.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <span className={i === 0 ? "text-foreground" : "text-muted-foreground"}>{f}</span>
                </li>
              ))}
            </ul>
            {tier !== "ultra" && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Unlock more with a higher tier:</p>
                <div className="flex gap-2 flex-wrap">
                  {["basic", "pro", "ultra"].filter((t) => {
                    const order = ["sandbox", "basic", "pro", "ultra"];
                    return order.indexOf(t) > order.indexOf(tier);
                  }).map((t) => {
                    const s = TIER_COLORS[t];
                    return (
                      <a
                        key={t}
                        href="https://tik.tools/pricing"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs px-2 py-1 rounded border font-mono uppercase transition-opacity hover:opacity-80 ${s.border} ${s.text} ${s.bg}`}
                      >
                        {t}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Footer note */}
      <Card className="bg-card border-border border-dashed">
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <p><span className="text-foreground font-medium">Creatools</span> is powered by the tik.tools API.</p>
          <p>Sandbox tier: 20 API calls/window, 3 concurrent WebSockets, 10-min sessions.</p>
          <p className="text-muted-foreground/60 pt-1">creatools.co — Real-time TikTok LIVE monitoring</p>
        </CardContent>
      </Card>
    </div>
  );
}
