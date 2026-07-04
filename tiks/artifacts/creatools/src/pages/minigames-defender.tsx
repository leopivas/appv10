import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Play, Square } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { OverlayLink } from "./overlay-item-base";
import { useAuth } from "@/context/auth-context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Enemy { id: number; x: number; y: number; speed: number; emoji: string }

const EMOJIS = ["👾","🤖","👹","💀","🦹","🐉","🔴","⬛"];

export default function MinigamesDefender() {
  const { user } = useAuth();
  const overlayUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=defender&session=${user?.id ?? "demo"}`;
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [shield, setShield] = useState(50);
  const [speed, setSpeed] = useState(3);
  const frameRef = useRef<number>(0);
  const idRef = useRef(0);

  useEffect(() => {
    if (!playing) return;
    const spawnInterval = setInterval(() => {
      setEnemies(prev => [...prev, {
        id: idRef.current++,
        x: Math.random() * 90,
        y: 0,
        speed: speed * (0.5 + Math.random()),
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      }]);
    }, 1200);

    const moveInterval = setInterval(() => {
      setEnemies(prev => {
        const surviving: Enemy[] = [];
        let missed = 0;
        prev.forEach(e => {
          if (e.y >= 88) { missed++; } else { surviving.push({ ...e, y: e.y + e.speed * 0.5 }); }
        });
        if (missed > 0) setLives(l => { const nl = l - missed; if (nl <= 0) { setPlaying(false); } return Math.max(0, nl); });
        return surviving;
      });
    }, 100);

    return () => { clearInterval(spawnInterval); clearInterval(moveInterval); };
  }, [playing, speed]);

  function shoot(enemyId: number) {
    setEnemies(prev => prev.filter(e => e.id !== enemyId));
    setScore(s => s + 10);
  }

  function startGame() {
    setScore(0); setLives(3); setEnemies([]); setPlaying(true);
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/minigames"><button className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "rgba(255,255,255,0.3)" }}><ChevronLeft className="w-4 h-4" /></button></Link>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #22c55e, #06b6d4)" }}>
          <span className="text-xl">🛡️</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>MINIGAME</span>
          <h1 className="text-xl font-bold text-white">Defender</h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm font-bold" style={{ color: "#f59e0b" }}>⭐ {score}</span>
          <span className="text-sm font-bold" style={{ color: "#ef4444" }}>{"❤️".repeat(Math.max(0, lives))}</span>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden relative"
        style={{ height: 360, background: "linear-gradient(180deg, #0a0820 0%, #1a1040 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Stars */}
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute rounded-full" style={{ width: 2, height: 2, background: "rgba(255,255,255,0.3)", left: `${(i * 37 + 11) % 100}%`, top: `${(i * 19 + 7) % 80}%` }} />
        ))}

        {!playing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
            <div className="text-6xl">🛡️</div>
            <p className="text-white font-bold text-lg">Defender!</p>
            <p className="text-sm px-8" style={{ color: "rgba(255,255,255,0.4)" }}>Clique nos inimigos para eliminá-los antes que ultrapassem a barreira. Viewers podem jogar via link OBS!</p>
            {lives === 0 && <p className="text-red-400 font-bold">Game Over! Score: {score}</p>}
            <Button onClick={startGame} style={{ background: "linear-gradient(135deg, #22c55e, #06b6d4)" }}>
              <Play className="w-4 h-4 mr-2" /> {lives === 0 ? "Jogar Novamente" : "Começar"}
            </Button>
          </div>
        )}

        {playing && enemies.map(e => (
          <button key={e.id} onClick={() => shoot(e.id)}
            className="absolute text-2xl hover:scale-150 transition-transform leading-none"
            style={{ left: `${e.x}%`, top: `${e.y}%`, cursor: "crosshair", transform: "translate(-50%, -50%)" }}>
            {e.emoji}
          </button>
        ))}

        {/* Shield */}
        {playing && (
          <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, #22c55e ${shield}%, rgba(255,255,255,0.05) ${shield}%)` }} />
        )}
      </div>

      {playing && (
        <Button variant="outline" onClick={() => setPlaying(false)} className="gap-1.5 w-full">
          <Square className="w-4 h-4" /> Parar Jogo
        </Button>
      )}

      {!playing && (
        <div className="space-y-3">
          <div className="space-y-2 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex justify-between text-xs">
              <span style={{ color: "rgba(255,255,255,0.4)" }}>Velocidade dos inimigos</span>
              <span className="font-bold text-white">{speed}</span>
            </div>
            <Slider value={[speed]} min={1} max={8} onValueChange={([v]) => setSpeed(v)}
              className="[&_[role=slider]]:bg-green-500 [&_[role=slider]]:border-green-400" />
          </div>
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Link OBS — Viewers podem jogar</p>
            <OverlayLink url={overlayUrl} />
          </div>
        </div>
      )}
    </div>
  );
}
