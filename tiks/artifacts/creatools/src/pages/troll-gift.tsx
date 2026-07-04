import { useState } from "react";
import { Laugh, Smartphone, Download, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";

const TROLL_GIFTS = [
  { id: "1", name: "Frango Assado", emoji: "🍗", trigger: "1 Lion" },
  { id: "2", name: "Chuveiro Frio", emoji: "🚿", trigger: "10 Rosa" },
  { id: "3", name: "Alarme Sonoro", emoji: "🔔", trigger: "5 Dedo Mindinho" },
  { id: "4", name: "Gato Dançante", emoji: "🐱", trigger: "1 TikTok" },
  { id: "5", name: "Tela Tremendo", emoji: "😱", trigger: "1 Universe" },
  { id: "6", name: "Inversão de Câmera", emoji: "📸", trigger: "20 Rosa" },
  { id: "7", name: "Papai Noel Invade", emoji: "🎅", trigger: "1 Leão" },
  { id: "8", name: "Flashbang", emoji: "💥", trigger: "5 TikTok" },
];

export default function TrollGift() {
  const { user } = useAuth();
  const isPro = user?.plan === "pro";
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
          <Laugh className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>FERRAMENTAS</span>
            <Badge className="text-[10px] px-2 py-0.5" style={{ background: "rgba(34,211,238,0.12)", color: "#22d3ee", border: "none" }}>APP</Badge>
          </div>
          <h1 className="text-xl font-bold text-white">Troll Gift</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Efeitos trolls disparados por gifts — exclusivo app TIKSCAN.</p>
        </div>
      </div>

      {/* Requires app */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.2)" }}>
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4" style={{ color: "#22d3ee" }} />
          <p className="text-sm font-semibold" style={{ color: "#22d3ee" }}>Requer App TIKSCAN</p>
        </div>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
          O Troll Gift funciona através do aplicativo TIKSCAN instalado no seu dispositivo. Os efeitos são aplicados diretamente na câmera durante a live.
        </p>
        <Button className="gap-1.5" style={{ background: "#22d3ee", color: "#0a0a14" }}>
          <Download className="w-4 h-4" /> Baixar App TIKSCAN
        </Button>
      </div>

      {/* How it works */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-sm font-semibold text-white">Como funciona</p>
        <div className="space-y-2">
          {[
            "Instale o app TIKSCAN no seu celular",
            "Conecte com sua conta Creatools",
            "Configure quais gifts disparam quais trolls",
            "Viewers enviam gifts → efeitos trolls aparecem na câmera! 😂",
          ].map((s, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: "rgba(34,211,238,0.15)", color: "#22d3ee" }}>{i + 1}</span>
              <p style={{ color: "rgba(255,255,255,0.6)" }}>{s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Troll list */}
      {!isPro && (
        <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" style={{ color: "#f97316" }} />
            <span className="text-sm" style={{ color: "#f97316" }}>Requer plano PRO para configurar trolls</span>
          </div>
          <Button size="sm" style={{ background: "#f97316" }}>Assinar PRO →</Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {TROLL_GIFTS.map(tg => (
          <div key={tg.id} className="rounded-xl p-4 space-y-2"
            style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${!isPro ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.07)"}` }}>
            <div className="flex items-center justify-between">
              <span className="text-2xl">{tg.emoji}</span>
              {!isPro && <Lock className="w-3.5 h-3.5" style={{ color: "rgba(249,115,22,0.5)" }} />}
            </div>
            <p className={`text-sm font-medium ${!isPro ? "text-white/40" : "text-white"}`}>{tg.name}</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>Trigger: {tg.trigger}</p>
            <button
              disabled={!isPro}
              onClick={() => setEnabled(prev => ({ ...prev, [tg.id]: !prev[tg.id] }))}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: enabled[tg.id] ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)",
                color: enabled[tg.id] ? "#4ade80" : "rgba(255,255,255,0.4)",
              }}>
              {enabled[tg.id] ? "✓ Ativo" : "Ativar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
