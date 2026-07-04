import { useState } from "react";
import { Sparkles, Download, Search, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";

interface Effect {
  id: string;
  name: string;
  emoji: string;
  category: string;
  requiresPro: boolean;
  downloaded: boolean;
}

const EFFECTS: Effect[] = [
  { id: "1", name: "Explosão de Confete", emoji: "🎊", category: "Celebração", requiresPro: false, downloaded: false },
  { id: "2", name: "Chuva de Presentes", emoji: "🎁", category: "Celebração", requiresPro: false, downloaded: true },
  { id: "3", name: "Raio Neon", emoji: "⚡", category: "Efeitos", requiresPro: true, downloaded: false },
  { id: "4", name: "Fogos de Artifício", emoji: "🎆", category: "Celebração", requiresPro: false, downloaded: false },
  { id: "5", name: "Portal Mágico", emoji: "🌀", category: "Fantasia", requiresPro: true, downloaded: false },
  { id: "6", name: "Corações Flutuantes", emoji: "💕", category: "Romance", requiresPro: false, downloaded: false },
  { id: "7", name: "Invasão Alienígena", emoji: "👽", category: "Sci-Fi", requiresPro: true, downloaded: false },
  { id: "8", name: "Chuva de Estrelas", emoji: "🌟", category: "Fantasia", requiresPro: true, downloaded: false },
  { id: "9", name: "Vitória Épica", emoji: "🏆", category: "Celebração", requiresPro: false, downloaded: false },
  { id: "10", name: "Tsunami de Likes", emoji: "❤️", category: "Engajamento", requiresPro: true, downloaded: false },
  { id: "11", name: "DJ Lights", emoji: "🎧", category: "Música", requiresPro: true, downloaded: false },
  { id: "12", name: "Bomba de Emoji", emoji: "💥", category: "Efeitos", requiresPro: false, downloaded: false },
];

const CATEGORIES = ["Todos", "Celebração", "Efeitos", "Fantasia", "Romance", "Sci-Fi", "Música", "Engajamento"];

export default function EffectBattle() {
  const { user } = useAuth();
  const isPro = user?.plan === "pro";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [downloaded, setDownloaded] = useState<Record<string, boolean>>({});

  const filtered = EFFECTS.filter(e =>
    (category === "Todos" || e.category === category) &&
    (e.name.toLowerCase().includes(search.toLowerCase()))
  );

  function handleDownload(id: string, requiresPro: boolean) {
    if (requiresPro && !isPro) return;
    setDownloaded(prev => ({ ...prev, [id]: true }));
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #ec4899, #a855f7)" }}>
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>FERRAMENTAS</span>
            <Badge className="text-[10px] px-2 py-0.5" style={{ background: "rgba(249,115,22,0.15)", color: "#f97316", border: "none" }}>PRO</Badge>
          </div>
          <h1 className="text-xl font-bold text-white">Effect Battle</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Efeitos visuais para battles e momentos épicos da live.</p>
        </div>
      </div>

      {!isPro && (
        <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" style={{ color: "#f97316" }} />
            <span className="text-sm" style={{ color: "#f97316" }}>Efeitos PRO desbloqueados apenas no plano PRO</span>
          </div>
          <Button size="sm" style={{ background: "#f97316" }}>Assinar PRO →</Button>
        </div>
      )}

      {/* Search + Category filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar efeito..."
            className="pl-9" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{
                background: category === c ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.05)",
                color: category === c ? "#a78bfa" : "rgba(255,255,255,0.4)",
              }}>{c}</button>
          ))}
        </div>
      </div>

      {/* Effects grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filtered.map(effect => {
          const isLocked = effect.requiresPro && !isPro;
          const isDl = downloaded[effect.id] || effect.downloaded;
          return (
            <div key={effect.id}
              className="relative rounded-xl p-4 flex flex-col items-center gap-3 text-center overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${isLocked ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.07)"}` }}>
              {effect.requiresPro && (
                <div className="absolute top-2 right-2">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}>PRO</span>
                </div>
              )}
              <div className={`text-4xl ${isLocked ? "opacity-40 grayscale" : ""}`}>{effect.emoji}</div>
              <div>
                <p className={`text-sm font-medium ${isLocked ? "text-white/40" : "text-white"}`}>{effect.name}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{effect.category}</p>
              </div>
              {isLocked ? (
                <Button size="sm" disabled className="w-full gap-1.5 opacity-50">
                  <Lock className="w-3.5 h-3.5" /> Bloqueado
                </Button>
              ) : isDl ? (
                <Button size="sm" variant="outline" className="w-full gap-1.5" disabled>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Instalado
                </Button>
              ) : (
                <Button size="sm" className="w-full gap-1.5" onClick={() => handleDownload(effect.id, effect.requiresPro)}
                  style={{ background: "rgba(124,58,237,0.3)", color: "#a78bfa" }}>
                  <Download className="w-3.5 h-3.5" /> Baixar
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
