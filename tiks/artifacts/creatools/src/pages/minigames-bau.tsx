import { useState } from "react";
import { ChevronLeft, Plus, Trash2, Gift, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { OverlayLink } from "./overlay-item-base";
import { useAuth } from "@/context/auth-context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Prize { id: string; label: string; probability: number; emoji: string; rarity: "comum" | "raro" | "lendario" }

const DEFAULT_PRIZES: Prize[] = [
  { id:"1", label:"Nada 😅", probability: 40, emoji: "💨", rarity:"comum" },
  { id:"2", label:"10 moedas", probability: 30, emoji: "🪙", rarity:"comum" },
  { id:"3", label:"Shoutout!", probability: 15, emoji: "📢", rarity:"raro" },
  { id:"4", label:"Sorteio VIP", probability: 10, emoji: "⭐", rarity:"raro" },
  { id:"5", label:"Prêmio Exclusivo", probability: 5, emoji: "👑", rarity:"lendario" },
];

const RARITY_COLORS: Record<string, string> = { comum:"rgba(255,255,255,0.3)", raro:"#a855f7", lendario:"#f59e0b" };

export default function MinigamesBau() {
  const { user } = useAuth();
  const overlayUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=bau&session=${user?.id ?? "demo"}`;
  const [prizes, setPrizes] = useState<Prize[]>(DEFAULT_PRIZES);
  const [triggerGift, setTriggerGift] = useState("rosa");
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<Prize | null>(null);
  const [opening, setOpening] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newEmoji, setNewEmoji] = useState("🎁");
  const [requireGift, setRequireGift] = useState(true);

  function openChest() {
    if (opening) return;
    setOpening(true);
    setIsOpen(false);
    setResult(null);
    setTimeout(() => {
      setIsOpen(true);
      const rand = Math.random() * 100;
      let cum = 0;
      for (const p of prizes) {
        cum += p.probability;
        if (rand < cum) { setResult(p); break; }
      }
      setOpening(false);
    }, 1000);
  }

  function addPrize() {
    if (!newLabel.trim()) return;
    setPrizes(prev => [...prev, { id: crypto.randomUUID(), label: newLabel, probability: 5, emoji: newEmoji, rarity: "comum" }]);
    setNewLabel("");
  }

  const totalProb = prizes.reduce((s, p) => s + p.probability, 0);

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/minigames"><button className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "rgba(255,255,255,0.3)" }}><ChevronLeft className="w-4 h-4" /></button></Link>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
          <span className="text-xl">🎁</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>MINIGAME</span>
          <h1 className="text-xl font-bold text-white">Baú de Presentes</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* Chest animation */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-48 h-48 flex items-center justify-center cursor-pointer" onClick={openChest}>
            <div className="text-8xl select-none transition-all duration-500" style={{ transform: isOpen ? "scale(1.1)" : "scale(1)" }}>
              {isOpen ? "📦" : "🎁"}
            </div>
            {opening && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
              </div>
            )}
          </div>

          {result && (
            <div className="text-center px-6 py-4 rounded-xl w-full max-w-[220px]"
              style={{ background: `${result.rarity === "lendario" ? "rgba(245,158,11,0.1)" : result.rarity === "raro" ? "rgba(168,85,247,0.1)" : "rgba(255,255,255,0.05)"}`, border: `1px solid ${RARITY_COLORS[result.rarity]}30` }}>
              <div className="text-4xl mb-2">{result.emoji}</div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: RARITY_COLORS[result.rarity] }}>{result.rarity}</p>
              <p className="text-base font-black text-white mt-1">{result.label}</p>
            </div>
          )}

          <Button onClick={openChest} disabled={opening} className="w-full max-w-[220px] gap-1.5"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
            <Gift className="w-4 h-4" /> {opening ? "Abrindo…" : "Abrir Baú!"}
          </Button>
        </div>

        {/* Config */}
        <div className="space-y-3">
          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-sm font-semibold text-white">Configuração</p>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Exigir presente</span>
              <Switch checked={requireGift} onCheckedChange={setRequireGift} />
            </div>
            {requireGift && (
              <div className="space-y-1.5">
                <label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Presente que ativa o baú</label>
                <Input value={triggerGift} onChange={e => setTriggerGift(e.target.value)} placeholder="Ex: rosa"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13 }} />
              </div>
            )}
          </div>

          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Prêmios</p>
              <span className="text-xs" style={{ color: totalProb === 100 ? "#4ade80" : totalProb > 100 ? "#f87171" : "rgba(255,255,255,0.3)" }}>Total: {totalProb}%</span>
            </div>
            <div className="flex gap-2">
              <Input value={newEmoji} onChange={e => setNewEmoji(e.target.value)} className="w-16 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
              <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Nome do prêmio"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13 }} />
              <Button size="sm" onClick={addPrize} className="shrink-0" style={{ background: "#7c3aed" }}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {prizes.map(p => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <span className="text-base">{p.emoji}</span>
                  <span className="flex-1 text-sm text-white">{p.label}</span>
                  <span className="text-xs font-mono font-bold" style={{ color: RARITY_COLORS[p.rarity] }}>{p.probability}%</span>
                  <button onClick={() => setPrizes(prev => prev.filter(x => x.id !== p.id))} className="p-0.5 text-red-400 hover:bg-red-500/10 rounded">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Link OBS</p>
            <OverlayLink url={overlayUrl} />
          </div>
        </div>
      </div>
    </div>
  );
}
