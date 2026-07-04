import { Check, Star } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: string;
  features: string[];
  color: string;
  isActive: boolean;
  order: number;
}

interface PricingTableProps {
  plans: PricingPlan[];
  recommendedPlanId: string;
  onSelect?: (planId: string) => void;
}

const COLOR_MAP: Record<string, { border: string; glow: string; badge: string; btn: string; star: string }> = {
  gray:   { border: "border-white/10",   glow: "",                                    badge: "bg-white/10 text-white/60",                 btn: "bg-white/10 hover:bg-white/15 text-white",                                        star: "text-white/40" },
  cyan:   { border: "border-cyan-500/40", glow: "shadow-[0_0_30px_rgba(34,211,238,0.1)]", badge: "bg-cyan-500/20 text-cyan-300",             btn: "bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-semibold", star: "text-cyan-400" },
  violet: { border: "border-violet-500/40", glow: "shadow-[0_0_30px_rgba(139,92,246,0.15)]", badge: "bg-violet-500/20 text-violet-300",     btn: "bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 text-white font-semibold", star: "text-violet-400" },
  blue:   { border: "border-blue-500/40", glow: "shadow-[0_0_30px_rgba(59,130,246,0.1)]",   badge: "bg-blue-500/20 text-blue-300",           btn: "bg-gradient-to-r from-blue-500 to-blue-400 text-white font-semibold",           star: "text-blue-400" },
  pink:   { border: "border-pink-500/40", glow: "shadow-[0_0_30px_rgba(236,72,153,0.1)]",   badge: "bg-pink-500/20 text-pink-300",           btn: "bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold",           star: "text-pink-400" },
};

function formatPrice(price: number, currency: string, period: string): string {
  if (price === 0) return "Grátis";
  const val = (price / 100).toLocaleString("pt-BR", { style: "currency", currency });
  if (period === "monthly") return `${val}/mês`;
  if (period === "yearly") return `${val}/ano`;
  return val;
}

export function PricingTable({ plans, recommendedPlanId, onSelect }: PricingTableProps) {
  const [, setLocation] = useLocation();
  const sorted = [...plans].sort((a, b) => a.order - b.order);

  const handleSelect = (planId: string) => {
    if (onSelect) { onSelect(planId); return; }
    setLocation("/login");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl mx-auto">
      {sorted.map((plan) => {
        const isRecommended = plan.id === recommendedPlanId;
        const colors = COLOR_MAP[plan.color] ?? COLOR_MAP.gray;

        return (
          <div key={plan.id} className="relative">
            {isRecommended && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                <span className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${colors.badge}`}>
                  <Star className={`w-3 h-3 fill-current ${colors.star}`} />
                  Mais Popular
                </span>
              </div>
            )}
            <Card
              className={`relative overflow-hidden h-full flex flex-col bg-[#0d0820] transition-all duration-300 hover:-translate-y-1 ${colors.border} ${isRecommended ? colors.glow : ""}`}
              style={{ border: isRecommended ? undefined : "1px solid rgba(255,255,255,0.07)" }}
            >
              {isRecommended && (
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `var(--gradient-top, linear-gradient(to right, #22d3ee, #8b5cf6))` }} />
              )}
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    <p className="text-xs text-white/40 mt-0.5">{plan.description}</p>
                  </div>
                  {isRecommended && (
                    <Badge className={`text-[10px] shrink-0 ${colors.badge}`}>
                      Recomendado
                    </Badge>
                  )}
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-white">
                    {formatPrice(plan.price, plan.currency, plan.billingPeriod)}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-white/30 text-sm ml-1">/{plan.billingPeriod === "monthly" ? "mês" : "ano"}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${colors.star}`} />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full mt-2 border-0 ${colors.btn}`}
                  onClick={() => handleSelect(plan.id)}
                >
                  {plan.price === 0 ? "Começar Grátis" : "Assinar"}
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
