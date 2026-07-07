import { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2, Video, Trash2, Download, Play, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface VideoItem {
  id: string;
  prompt: string;
  model: string;
  size: string;
  duration: number;
  status: "pending" | "ready" | "failed";
  storage_path: string | null;
  error: string | null;
  created_at: string;
}

const PRESET_PROMPTS = [
  "Handful of golden TikTok coins bursting from a treasure chest, cinematic lighting, vertical framing",
  "A confetti explosion in slow motion with sparkles falling, black background, TikTok live overlay style",
  "Neon 'GO!' text animation with electric energy pulses, vertical vertical, 4k",
  "A trophy rotating with fireworks behind it, celebration overlay, transparent-friendly background",
];

export default function AiVideos() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<"sora-2" | "sora-2-pro">("sora-2");
  const [size, setSize] = useState("1024x1792");
  const [duration, setDuration] = useState<4 | 8 | 12>(4);
  const [creating, setCreating] = useState(false);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [usage, setUsage] = useState<{ used_this_month: number; limit: number; unlimited: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/ai/videos`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const d = await r.json();
        setVideos(d.videos ?? []);
      }
      const u = await fetch(`${BASE}/api/ai/video/usage`, { headers: { Authorization: `Bearer ${token}` } });
      if (u.ok) setUsage(await u.json());
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  // Poll pending videos every 10s
  useEffect(() => {
    if (!videos.some(v => v.status === "pending")) return;
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [videos, load]);

  async function generate() {
    if (!prompt.trim() || creating) return;
    setCreating(true);
    try {
      const r = await fetch(`${BASE}/api/ai/video/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt, model, size, duration }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ detail: "Falha ao gerar" }));
        throw new Error(err.detail);
      }
      toast({ title: "Vídeo em geração", description: "Pode levar 2-5 minutos. Vamos avisar quando estiver pronto." });
      setPrompt("");
      void load();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function deleteVideo(id: string) {
    if (!confirm("Excluir este vídeo?")) return;
    try {
      await fetch(`${BASE}/api/ai/video/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: "Vídeo excluído" });
      void load();
    } catch { toast({ title: "Erro ao excluir", variant: "destructive" }); }
  }

  const monthly = usage?.limit ?? 0;
  const used = usage?.used_this_month ?? 0;
  const unlimited = usage?.unlimited ?? false;
  const blocked = !unlimited && monthly > 0 && used >= monthly;

  return (
    <div className="space-y-4" data-testid="ai-videos-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Video className="w-7 h-7 text-pink-400" />
            Gerador de Vídeos IA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sora 2 — vídeos curtos para usar como overlays, alertas e transições
          </p>
        </div>
        {usage && (
          <Badge variant={blocked ? "destructive" : "outline"} className="font-mono">
            {unlimited ? "∞ ilimitado" : `${used} / ${monthly === 0 ? "0" : monthly} este mês`}
          </Badge>
        )}
      </div>

      <Card className="p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(236,72,153,0.2)" }}>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">Prompt do vídeo</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva o vídeo que você quer gerar…"
              className="mt-1.5 min-h-[80px] resize-none"
              disabled={creating || blocked}
              data-testid="ai-video-prompt"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRESET_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPrompt(p)}
                  className="text-[10px] px-2 py-1 rounded-full transition-all hover:scale-105"
                  style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)", color: "rgba(255,255,255,0.6)" }}
                  data-testid="ai-video-preset"
                >
                  <Sparkles className="w-2.5 h-2.5 inline mr-1" />
                  {p.slice(0, 45)}…
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Modelo</Label>
              <Select value={model} onValueChange={(v) => setModel(v as any)}>
                <SelectTrigger className="mt-1" data-testid="ai-video-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sora-2">Sora 2 (rápido)</SelectItem>
                  <SelectItem value="sora-2-pro">Sora 2 Pro (alta qualidade)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Formato</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger className="mt-1" data-testid="ai-video-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1792">Vertical 9:16 (TikTok)</SelectItem>
                  <SelectItem value="1280x720">Horizontal 16:9</SelectItem>
                  <SelectItem value="1792x1024">Widescreen</SelectItem>
                  <SelectItem value="1024x1024">Quadrado 1:1</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Duração</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v) as 4|8|12)}>
                <SelectTrigger className="mt-1" data-testid="ai-video-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 segundos</SelectItem>
                  <SelectItem value="8">8 segundos</SelectItem>
                  <SelectItem value="12">12 segundos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {blocked && (
            <div className="text-xs text-orange-400 flex items-center gap-2">
              <Zap className="w-3 h-3" />
              Limite mensal atingido. <a href="/pricing" className="underline">Faça upgrade</a> para continuar.
            </div>
          )}

          <Button
            onClick={generate}
            disabled={creating || !prompt.trim() || blocked}
            className="w-full sm:w-auto"
            data-testid="ai-video-generate-btn"
          >
            {creating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando…</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Gerar vídeo</>
            )}
          </Button>
          <p className="text-[10px] text-white/30">
            Geração leva 2-5 min (Sora 2) ou 3-10 min (Pro). Vídeo salvo no seu Object Storage privado.
          </p>
        </div>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-2">Meus vídeos ({videos.length})</h2>
        {videos.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nenhum vídeo ainda. Gere seu primeiro acima.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {videos.map((v) => (
              <Card key={v.id} className="p-3 space-y-2" data-testid="ai-video-card">
                <div className="aspect-[9/16] rounded-lg overflow-hidden bg-black/40 flex items-center justify-center relative">
                  {v.status === "ready" ? (
                    <video
                      src={`${BASE}/api/ai/video/${v.id}/file?auth=${token}`}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : v.status === "failed" ? (
                    <div className="text-center p-4">
                      <p className="text-xs text-red-400 font-semibold">Falhou</p>
                      <p className="text-[10px] text-white/40 mt-1">{v.error?.slice(0, 80)}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-violet-400 mx-auto" />
                      <p className="text-[10px] text-white/50 mt-2">Gerando…</p>
                    </div>
                  )}
                </div>
                <p className="text-xs line-clamp-2 text-white/70">{v.prompt}</p>
                <div className="flex items-center justify-between gap-1 text-[10px] text-white/40">
                  <span>{v.model} · {v.size} · {v.duration}s</span>
                  <div className="flex gap-1">
                    {v.status === "ready" && (
                      <a
                        href={`${BASE}/api/ai/video/${v.id}/file?auth=${token}`}
                        download={`creatools-${v.id.slice(0, 8)}.mp4`}
                        className="p-1 hover:bg-white/10 rounded"
                        title="Baixar"
                      >
                        <Download className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      onClick={() => deleteVideo(v.id)}
                      className="p-1 hover:bg-red-500/20 rounded text-red-400"
                      title="Excluir"
                      data-testid="ai-video-delete-btn"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
