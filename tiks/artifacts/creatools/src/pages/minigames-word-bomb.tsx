import { useState, useEffect } from "react";
import { ChevronLeft, Plus, Trash2, Play, Square, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OverlayLink } from "./overlay-item-base";
import { useAuth } from "@/context/auth-context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const DEFAULT_WORDS = ["TIKTOK","LIVE","PRESENTE","SORTEIO","DESAFIO","JOGO","STREAMER","BRASIL","VIRAL","MÚSICA"];

export default function MinigamesWordBomb() {
  const { user } = useAuth();
  const overlayUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=word-bomb&session=${user?.id ?? "demo"}`;
  const [words, setWords] = useState(DEFAULT_WORDS);
  const [newWord, setNewWord] = useState("");
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const [letters, setLetters] = useState<string[]>([]);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setTimeLeft(prev => { if (prev <= 1) { setPlaying(false); return 0; } return prev - 1; }), 1000);
    return () => clearInterval(t);
  }, [playing]);

  function startGame() {
    const word = words[Math.floor(Math.random() * words.length)];
    setCurrent(word);
    setLetters(word.split("").sort(() => Math.random() - 0.5));
    setTyped("");
    setTimeLeft(30);
    setPlaying(true);
  }

  const timerPct = (timeLeft / 30) * 100;
  const timerColor = timeLeft > 15 ? "#22c55e" : timeLeft > 8 ? "#f59e0b" : "#ef4444";

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/minigames"><button className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "rgba(255,255,255,0.3)" }}><ChevronLeft className="w-4 h-4" /></button></Link>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
          <span className="text-xl">💣</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>MINIGAME</span>
          <h1 className="text-xl font-bold text-white">Word Bomb</h1>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* Game area */}
        <div className="space-y-4">
          <div className="rounded-xl p-6 space-y-4 text-center min-h-[280px] flex flex-col items-center justify-center"
            style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {playing ? (
              <>
                <div className="w-full space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>Tempo</span>
                    <span className="font-mono font-black" style={{ color: timerColor }}>{timeLeft}s</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${timerPct}%`, background: timerColor }} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {letters.map((l, i) => (
                    <span key={i} className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black"
                      style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "white" }}>{l}</span>
                  ))}
                </div>
                <Input value={typed} onChange={e => setTyped(e.target.value.toUpperCase())}
                  placeholder="Digite a palavra..."
                  className="text-center text-xl font-black uppercase"
                  style={{ background: typed === current ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${typed === current ? "rgba(34,197,94,0.5)" : "rgba(255,255,255,0.1)"}`, color: "white", height: 56 }} />
                {typed === current && <p className="text-green-400 font-bold text-lg">✅ Correto! +10 pontos</p>}
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-6xl">💣</div>
                <p className="text-base font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>Descubra a palavra embaralhada antes da bomba explodir!</p>
                {timeLeft === 0 && <p className="text-red-400 font-bold">💥 Bomba explodiu! Tente novamente.</p>}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={startGame} className="flex-1 gap-1.5" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
              <Play className="w-4 h-4" /> {playing ? "Reiniciar" : "Jogar!"}
            </Button>
            {playing && <Button variant="outline" onClick={() => setPlaying(false)} className="gap-1.5"><Square className="w-4 h-4" />Parar</Button>}
          </div>
        </div>

        {/* Word list */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-white">Banco de Palavras</p>
          <div className="flex gap-2">
            <Input value={newWord} onChange={e => setNewWord(e.target.value.toUpperCase())} placeholder="Nova palavra..."
              onKeyDown={e => e.key === "Enter" && (setWords(p => [...p, newWord.trim()]), setNewWord(""))}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13 }} />
            <Button size="sm" onClick={() => { if (newWord.trim()) { setWords(p => [...p, newWord.trim()]); setNewWord(""); } }} style={{ background: "#7c3aed" }}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {words.map((w, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span className="flex-1 text-sm font-mono text-white">{w}</span>
                <button onClick={() => setWords(prev => prev.filter((_, j) => j !== i))} className="p-0.5 text-red-400 hover:bg-red-500/10 rounded">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="pt-1 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Link OBS</p>
            <OverlayLink url={overlayUrl} />
          </div>
        </div>
      </div>
    </div>
  );
}
