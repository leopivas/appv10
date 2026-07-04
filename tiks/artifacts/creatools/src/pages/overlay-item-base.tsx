import { useState, useCallback } from "react";
import { Link } from "wouter";
import {
  ChevronLeft, Copy, CheckCircle2, RotateCcw, Info, ChevronDown, ChevronUp,
  Lock, ExternalLink, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

type PlanLevel = "free" | "basic" | "pro";
const PLAN_ORDER: Record<PlanLevel, number> = { free: 0, basic: 1, pro: 2 };
function planMeets(user: PlanLevel, req: string): boolean {
  return PLAN_ORDER[user] >= (PLAN_ORDER[req as PlanLevel] ?? 0);
}

export function CopyBtn({ value, label = "Copiar URL" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  return (
    <Button
      variant="outline"
      size="sm"
      className="shrink-0 gap-1.5"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        toast({ title: "Copiado!", description: "URL copiada para a área de transferência." });
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copiado!" : label}
    </Button>
  );
}

export function OverlayLink({ url, label }: { url: string; label?: string }) {
  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</p>}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <code className="flex-1 text-xs font-mono truncate" style={{ color: "#a78bfa" }}>{url}</code>
        <CopyBtn value={url} label="Copiar" />
        <Button variant="ghost" size="sm" className="px-2" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer"><Eye className="w-3.5 h-3.5" /></a>
        </Button>
      </div>
      <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
        OBS: adicione como <strong className="text-white/40">Browser Source</strong>. TikTok Studio: adicione como <strong className="text-white/40">Fonte Web</strong> e cole o link.
      </p>
    </div>
  );
}

export function ComoFunciona({ steps }: { steps: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(59,130,246,0.2)", background: "rgba(59,130,246,0.05)" }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
        style={{ color: "#60a5fa" }}
      >
        <span className="flex items-center gap-2"><Info className="w-4 h-4" />Como funciona?</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-1.5">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>{i + 1}</span>
              <p style={{ color: "rgba(255,255,255,0.6)" }}>{s}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function LockedBanner({ plan }: { plan: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl"
      style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4" style={{ color: "#f97316" }} />
        <span className="text-sm font-medium" style={{ color: "#f97316" }}>
          Disponível no plano {plan.toUpperCase()}
        </span>
      </div>
      <Link href="/pricing">
        <Button size="sm" style={{ background: "#f97316", color: "white" }}>
          Assinar {plan.toUpperCase()} →
        </Button>
      </Link>
    </div>
  );
}

interface OverlayPageBaseProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg?: string;
  requiresPlan?: string;
  onReset?: () => void;
  children: React.ReactNode;
}

export function OverlayPageBase({
  title, subtitle, icon, iconBg = "linear-gradient(135deg, #7c3aed, #ec4899)",
  requiresPlan, onReset, children,
}: OverlayPageBaseProps) {
  const { user } = useAuth();
  const plan = user?.plan ?? "free";
  const locked = !!requiresPlan && !planMeets(plan as PlanLevel, requiresPlan);

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/overlays">
            <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </Link>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg }}>
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>SOBREPOSIÇÃO</span>
              {requiresPlan && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                  style={{ background: requiresPlan === "pro" ? "rgba(249,115,22,0.15)" : "rgba(34,211,238,0.12)", color: requiresPlan === "pro" ? "#f97316" : "#22d3ee" }}>
                  {requiresPlan.toUpperCase()}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-white mt-0.5">{title}</h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{subtitle}</p>
          </div>
        </div>
        {onReset && !locked && (
          <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5 shrink-0">
            <RotateCcw className="w-3.5 h-3.5" />Resetar
          </Button>
        )}
      </div>

      {locked ? (
        <div className="space-y-4">
          <LockedBanner plan={requiresPlan!} />
          {children}
        </div>
      ) : children}
    </div>
  );
}

export interface SliderFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}

export function SliderField({ label, value, min = 0, max = 100, step = 1, unit = "", onChange }: SliderFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span style={{ color: "rgba(255,255,255,0.5)" }}>{label}</span>
        <span className="font-medium text-white">{value}{unit}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)}
        className="[&_[role=slider]]:bg-purple-500 [&_[role=slider]]:border-purple-400" />
    </div>
  );
}

export function SettingsCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      {title && <p className="text-sm font-semibold text-white">{title}</p>}
      {children}
    </div>
  );
}

export function ToggleRow({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {desc && <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function ColorPalette({ colors, value, onChange }: { colors: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {colors.map(c => (
        <button key={c}
          onClick={() => onChange(c)}
          className="w-7 h-7 rounded-lg transition-all hover:scale-110"
          style={{ background: c, outline: value === c ? `2px solid white` : "2px solid transparent", outlineOffset: 2 }}
        />
      ))}
    </div>
  );
}

export function SegmentControl({ options, value, onChange }: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
      {options.map(o => (
        <button key={o.value}
          onClick={() => onChange(o.value)}
          className="flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all"
          style={{
            background: value === o.value ? "rgba(124,58,237,0.4)" : "transparent",
            color: value === o.value ? "#a78bfa" : "rgba(255,255,255,0.4)",
          }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
