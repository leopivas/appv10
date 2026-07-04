import { useState, useRef } from "react";
import { RotateCcw, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OverlayLink } from "./overlay-item-base";
import { useAuth } from "@/context/auth-context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const COLORS = ["#7c3aed","#ec4899","#f97316","#22c55e","#06b6d4","#f59e0b","#a855f7","#3b82f6"];

interface WheelItem { id: string; label: string; color: string }
const DEFAULT_ITEMS: WheelItem[] = [
  { id:"1", label:"Desafio 1", color: COLORS[0] },
  { id:"2", label:"Desafio 2", color: COLORS[1] },
  { id:"3", label:"Perdeu!", color: COLORS[2] },
  { id:"4", label:"Prêmio 🎁", color: COLORS[3] },
  { id:"5", label:"Tente de novo", color: COLORS[4] },
  { id:"6", label:"Surpresa!", color: COLORS[5] },
];

export default function MinigamesRoleta() {
  const { user } = useAuth();
  const overlayUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=roleta&session=${user?.id ?? "demo"}`;
  const [items, setItems] = useState<WheelItem[]>(DEFAULT_ITEMS);
  const [newLabel, setNewLabel] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<WheelItem | null>(null);

  function spin() {
    if (spinning) return;
    setWinner(null);
    setSpinning(true);
    const extra = 1800 + Math.random() * 720;
    const next = rotation + extra;
    setRotation(next);
    setTimeout(() => {
      setSpinning(false);
      const idx = Math.floor(items.length - (((next % 360) / 360) * items.length)) % items.length;
      setWinner(items[idx]);
    }, 3000);
  }

  function addItem() {
    if (!newLabel.trim()) return;
    setItems(prev => [...prev, { id: crypto.randomUUID(), label: newLabel, color: COLORS[prev.length % COLORS.length] }]);
    setNewLabel("");
  }

  const size = 240;
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  const step = (2 * Math.PI) / items.length;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/minigames"><button className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "rgba(255,255,255,0.3)" }}><ChevronLeft className="w-4 h-4" /></button></Link>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}>
          <span className="text-xl">🎡</span>
        </div>
        <div>
          <div className="flex gap-2 items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>MINIGAME</span>
          </div>
          <h1 className="text-xl font-bold text-white">Roleta</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* Wheel */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative" style={{ width: size + 20, height: size + 20 }}>
            {/* Pointer */}
            <div className="absolute top-1/2 -right-1 -translate-y-1/2 z-10">
              <div className="w-0 h-0" style={{ borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderRight: "16px solid white" }} />
            </div>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
              style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? "transform 3s cubic-bezier(0.17,0.67,0.12,0.99)" : "none", display: "block", margin: "10px" }}>
              {items.map((item, i) => {
                const startAngle = i * step - Math.PI / 2;
                const endAngle = startAngle + step;
                const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
                const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
                const largeArc = step > Math.PI ? 1 : 0;
                const midAngle = startAngle + step / 2;
                const tx = cx + (r * 0.65) * Math.cos(midAngle);
                const ty = cy + (r * 0.65) * Math.sin(midAngle);
                return (
                  <g key={item.id}>
                    <path d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`} fill={item.color} stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
                    <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                      fontSize={items.length > 6 ? 9 : 11} fontWeight="700" fill="white"
                      transform={`rotate(${(midAngle * 180 / Math.PI) + 90}, ${tx}, ${ty})`}
                      style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
                      {item.label.length > 10 ? item.label.slice(0, 9) + "…" : item.label}
                    </text>
                  </g>
                );
              })}
              <circle cx={cx} cy={cy} r={14} fill="#1a1625" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            </svg>
          </div>
          <Button onClick={spin} disabled={spinning} className="gap-2 w-full" style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)", maxWidth: size + 20 }}>
            <RotateCcw className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} /> {spinning ? "Girando…" : "Girar Roleta!"}
          </Button>
          {winner && (
            <div className="text-center px-4 py-3 rounded-xl w-full" style={{ background: `${winner.color}20`, border: `1px solid ${winner.color}50`, maxWidth: size + 20 }}>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Resultado:</p>
              <p className="text-lg font-black text-white mt-0.5">{winner.label} 🎉</p>
            </div>
          )}
        </div>

        {/* Items list */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-white">Opções da Roleta</p>
          <div className="flex gap-2">
            <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Nova opção..."
              onKeyDown={e => e.key === "Enter" && addItem()}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
            <Button size="sm" onClick={addItem} style={{ background: "#7c3aed" }}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {items.map((item, i) => (
              <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: item.color }} />
                <span className="flex-1 text-sm text-white">{item.label}</span>
                <button onClick={() => setItems(prev => prev.filter(x => x.id !== item.id))} className="p-1 rounded hover:bg-red-500/10 text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="pt-2 space-y-2 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Link OBS</p>
            <OverlayLink url={overlayUrl} />
          </div>
        </div>
      </div>
    </div>
  );
}
