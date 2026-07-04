import { useState } from "react";
import { ChevronLeft, Play, RotateCcw, ThumbsUp, ThumbsDown } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { OverlayLink } from "./overlay-item-base";
import { useAuth } from "@/context/auth-context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATEMENTS = [
  { text: "O TikTok foi criado em 2016", correct: true },
  { text: "A China tem mais usuários de TikTok que os EUA", correct: true },
  { text: "ByteDance é a empresa dona do Instagram", correct: false },
  { text: "O TikTok foi banido temporariamente na Índia", correct: true },
  { text: "Lives no TikTok podem durar até 4 horas", correct: true },
  { text: "O TikTok original se chamava Musical.ly", correct: false },
  { text: "Gift 'Lion' vale 29999 moedas", correct: true },
  { text: "É possível transmitir ao vivo sem 1000 seguidores", correct: false },
];

export default function MinigamesSentido() {
  const { user } = useAuth();
  const overlayUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=sentido&session=${user?.id ?? "demo"}`;
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [started, setStarted] = useState(false);

  const stmt = STATEMENTS[idx % STATEMENTS.length];

  function answer(val: boolean) {
    if (answered !== null) return;
    const correct = val === stmt.correct;
    setAnswered(val);
    setTotal(t => t + 1);
    if (correct) setScore(s => s + 1);
  }

  function next() {
    setAnswered(null);
    setIdx(i => i + 1);
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/minigames"><button className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "rgba(255,255,255,0.3)" }}><ChevronLeft className="w-4 h-4" /></button></Link>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}>
          <span className="text-xl">🧠</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>MINIGAME</span>
          <h1 className="text-xl font-bold text-white">Verdade ou Mito</h1>
        </div>
      </div>

      {!started ? (
        <div className="rounded-xl p-8 text-center space-y-4" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-6xl">🧠</div>
          <h2 className="text-xl font-bold text-white">Verdade ou Mito?</h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Teste seus viewers com afirmações sobre TikTok. Eles devem responder se é Verdade ou Mito no chat!</p>
          <Button onClick={() => setStarted(true)} style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}>
            <Play className="w-4 h-4 mr-2" /> Começar Jogo
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Score */}
          <div className="flex gap-3">
            <div className="flex-1 text-center px-4 py-3 rounded-xl" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <p className="text-2xl font-black text-green-400">{score}</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Acertos</p>
            </div>
            <div className="flex-1 text-center px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-2xl font-black text-white">{total - score}</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Erros</p>
            </div>
            <div className="flex-1 text-center px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-2xl font-black" style={{ color: "#a78bfa" }}>{total}</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Total</p>
            </div>
          </div>

          {/* Question card */}
          <div className="rounded-xl p-6 text-center space-y-6 min-h-[200px] flex flex-col items-center justify-center"
            style={{
              background: answered !== null
                ? answered === stmt.correct ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)"
                : "rgba(0,0,0,0.5)",
              border: `1px solid ${answered !== null ? answered === stmt.correct ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
              transition: "all 0.3s"
            }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Pergunta {total + 1}</p>
            <p className="text-lg font-bold text-white">{stmt.text}</p>
            {answered !== null && (
              <p className="text-sm font-bold" style={{ color: answered === stmt.correct ? "#4ade80" : "#f87171" }}>
                {answered === stmt.correct ? "✅ Correto!" : `❌ Era ${stmt.correct ? "Verdade" : "Mito"}!`}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => answer(true)} disabled={answered !== null}
              className="gap-2 h-14 text-base"
              style={{ background: answered === true ? (stmt.correct ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.2)") : "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}>
              <ThumbsUp className="w-5 h-5" /> Verdade
            </Button>
            <Button onClick={() => answer(false)} disabled={answered !== null}
              className="gap-2 h-14 text-base"
              style={{ background: answered === false ? (!stmt.correct ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.2)") : "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
              <ThumbsDown className="w-5 h-5" /> Mito
            </Button>
          </div>

          {answered !== null && (
            <Button onClick={next} className="w-full" style={{ background: "rgba(124,58,237,0.3)", color: "#a78bfa" }}>
              Próxima Pergunta →
            </Button>
          )}

          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Link OBS</p>
            <OverlayLink url={overlayUrl} />
          </div>
        </div>
      )}
    </div>
  );
}
