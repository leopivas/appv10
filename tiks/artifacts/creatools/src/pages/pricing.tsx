import { useEffect, useState } from "react";
import { Check, X, Zap, Shield, Crown, Activity, Loader2, ExternalLink, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth, authFetch } from "@/context/auth-context";
import { useSearch } from "wouter";

interface StripeConfig {
  configured: boolean;
  publishableKey: string | null;
  basicPriceId: string | null;
  proPriceId: string | null;
  paymentsEnabled: boolean;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Plan {
  id: "free" | "basic" | "pro";
  name: string;
  price: string;
  period: string;
  description: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline";
  icon: React.ElementType;
  iconColor: string;
  features: { text: string; included: boolean }[];
  highlight?: boolean;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "",
    description: "Start monitoring TikTok LIVE streams at no cost.",
    icon: Zap,
    iconColor: "text-chart-3",
    features: [
      { text: "Live channels dashboard", included: true },
      { text: "Real-time monitor (WebSocket)", included: true },
      { text: "Gift & event feed", included: true },
      { text: "Gift catalog", included: true },
      { text: "Bulk check multiple accounts", included: false },
      { text: "Viewer counts in bulk check", included: false },
      { text: "Priority support", included: false },
    ],
  },
  {
    id: "basic",
    name: "Basic",
    price: "$9",
    period: "/mo",
    description: "Bulk check, viewer counts, and higher limits for growing teams.",
    badge: "Popular",
    badgeVariant: "default",
    icon: Shield,
    iconColor: "text-primary",
    highlight: true,
    features: [
      { text: "Everything in Free", included: true },
      { text: "Bulk check multiple accounts", included: true },
      { text: "Viewer counts in bulk check", included: true },
      { text: "Stream title in bulk check", included: true },
      { text: "Higher API limits", included: true },
      { text: "Priority support", included: true },
      { text: "Early access to new features", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "/mo",
    description: "Full access, unlimited WebSockets, and maximum throughput for professionals.",
    badge: "Full access",
    badgeVariant: "secondary",
    icon: Crown,
    iconColor: "text-secondary",
    features: [
      { text: "Everything in Basic", included: true },
      { text: "Unlimited WebSockets", included: true },
      { text: "User profile data", included: true },
      { text: "Follower & video counts", included: true },
      { text: "Bio & social metadata", included: true },
      { text: "Dedicated support", included: true },
      { text: "Early access to new features", included: true },
    ],
  },
];

export default function Pricing() {
  const { user, token } = useAuth();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);

  const [stripeConfig, setStripeConfig] = useState<StripeConfig | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    fetch(`${BASE}/api/stripe/config`)
      .then((r) => r.json())
      .then((d: StripeConfig) => setStripeConfig(d))
      .catch(() => setStripeConfig({ configured: false, publishableKey: null, basicPriceId: null, proPriceId: null, paymentsEnabled: true }));
  }, []);

  useEffect(() => {
    if (searchParams.get("success") === "1") showToast("✓ Subscription activated! Your plan has been updated.", "ok");
    if (searchParams.get("canceled") === "1") showToast("Payment canceled. You have not been charged.", "err");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleSubscribe(planId: "basic" | "pro") {
    if (!token) { showToast("Please sign in to subscribe.", "err"); return; }
    if (!stripeConfig?.configured) { showToast("Payments are not configured on this server.", "err"); return; }

    const priceId = planId === "basic" ? stripeConfig.basicPriceId : stripeConfig.proPriceId;
    if (!priceId) { showToast(`Price ID for the ${planId} plan is not configured.`, "err"); return; }

    setLoadingPlan(planId);
    try {
      const data = await authFetch("/stripe/checkout", token, {
        method: "POST",
        body: JSON.stringify({ priceId }),
      }) as { url: string };
      window.location.href = data.url;
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create checkout session.", "err");
      setLoadingPlan(null);
    }
  }

  async function handlePortal() {
    if (!token) return;
    setPortalLoading(true);
    try {
      const data = await authFetch("/stripe/portal", token, { method: "POST" }) as { url: string };
      window.location.href = data.url;
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to open billing portal.", "err");
      setPortalLoading(false);
    }
  }

  const currentPlan = user?.plan ?? "free";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg border transition-all ${
            toast.type === "ok"
              ? "bg-chart-3/10 border-chart-3/30 text-chart-3"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium">
          <Activity className="w-3 h-3" />
          Creatools Plans
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Plans & Pricing</h1>
        <p className="text-muted-foreground">
          Choose the right plan for your TikTok LIVE monitoring needs.
          Cancel anytime — no commitments.
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = currentPlan === plan.id;

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col bg-card border transition-all ${
                plan.highlight
                  ? "border-primary/50 shadow-lg shadow-primary/10"
                  : "border-border"
              } ${isCurrentPlan ? "ring-1 ring-primary/30" : ""}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant={plan.badgeVariant ?? "default"} className="px-3 py-0.5 text-xs">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {isCurrentPlan && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5 text-chart-3 border-chart-3/30">
                        ✓ Current plan
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  )}
                </div>

                <CardDescription className="text-sm leading-relaxed mt-1">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col flex-1 gap-6">
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-2.5 text-sm">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-chart-3 mt-0.5 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                      )}
                      <span className={feature.included ? "text-foreground" : "text-muted-foreground/60"}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {plan.id === "free" ? (
                  <Button variant="outline" className="w-full" disabled={isCurrentPlan}>
                    {isCurrentPlan ? "✓ Current plan" : "Get started free"}
                  </Button>
                ) : isCurrentPlan ? (
                  <Button className="w-full" variant="outline" onClick={handlePortal} disabled={portalLoading}>
                    {portalLoading
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading…</>
                      : <><CreditCard className="w-4 h-4 mr-2" />Manage subscription</>}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                    onClick={() => handleSubscribe(plan.id as "basic" | "pro")}
                    disabled={loadingPlan !== null || !stripeConfig?.configured || !user}
                  >
                    {loadingPlan === plan.id ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Please wait…</>
                    ) : !user ? (
                      "Sign in to subscribe"
                    ) : !stripeConfig?.configured ? (
                      "Payments not configured"
                    ) : (
                      `Subscribe to ${plan.name}`
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Current plan card */}
      {user && (
        <div className="max-w-5xl mx-auto">
          <Card className="bg-card/50 border-border">
            <CardContent className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Your current plan</p>
                <p className="text-xs text-muted-foreground">
                  Signed in as <span className="font-mono">{user.email}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="capitalize text-sm px-3 py-1">
                  {currentPlan === "free" ? "Free" : currentPlan === "basic" ? "Basic" : "Pro"}
                </Badge>
                {currentPlan !== "free" && (
                  <Button size="sm" variant="ghost" onClick={handlePortal} disabled={portalLoading}>
                    {portalLoading
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <><ExternalLink className="w-3 h-3 mr-1" />Portal</>}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payments disabled by admin */}
      {stripeConfig && !stripeConfig.paymentsEnabled && (
        <div className="max-w-5xl mx-auto text-center text-xs text-muted-foreground border border-yellow-500/30 bg-yellow-500/5 rounded-lg p-4">
          <p className="font-medium text-yellow-400 mb-1">Payments temporarily disabled</p>
          <p>The admin has disabled payments. Subscriptions are unavailable while in test mode.</p>
        </div>
      )}

      {/* Stripe not configured notice */}
      {stripeConfig && stripeConfig.paymentsEnabled && !stripeConfig.configured && (
        <div className="max-w-5xl mx-auto text-center text-xs text-muted-foreground border border-border rounded-lg p-4">
          <p className="font-medium text-foreground mb-1">Payments not configured</p>
          <p>
            Set the{" "}
            <code className="text-primary">STRIPE_SECRET_KEY</code>,{" "}
            <code className="text-primary">STRIPE_PRICE_ID_BASIC</code>, and{" "}
            <code className="text-primary">STRIPE_PRICE_ID_PRO</code>{" "}
            environment variables on the server to enable checkout.
          </p>
        </div>
      )}

      <div className="max-w-5xl mx-auto text-center text-xs text-muted-foreground pb-4">
        <p>Payments securely processed by Stripe. Cancel anytime.</p>
      </div>
    </div>
  );
}
