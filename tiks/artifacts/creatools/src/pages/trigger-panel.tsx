/**
 * /trigger-panel — Painel do streamer para disparar animações manualmente
 * O streamer abre esta página durante a live e clica nos botões
 * Os triggers aparecem no overlay OBS em tempo real
 */
import { useState } from "react";
import { useAuth, authFetch } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Zap, Copy, CheckCircle2, ExternalLink, Radio } from "lucide-react";

const TRIGGERS = [
  { type: "rose",      emoji: "🌹", label: "Rose",     color: "bg-rose-500/20 hover:bg-rose-500/40 border-rose-500/50 text-rose-300" },
  { type: "2x",        emoji: "2️⃣", label: "2x",       color: "bg-cyan-500/20 hover:bg-cyan-500/40 border-cyan-500/50 text-cyan-300" },
  { type: "3x",        emoji: "3️⃣", label: "3x",       color: "bg-yellow-500/20 hover:bg-yellow-500/40 border-yellow-500/50 text-yellow-300" },
  { type: "luva",      emoji: "🥊", label: "Luva",     color: "bg-orange-500/20 hover:bg-orange-500/40 border-orange-500/50 text-orange-300" },
  { type: "lion",      emoji: "🦁", label: "Lion",     color: "bg-amber-500/20 hover:bg-amber-500/40 border-amber-500/50 text-amber-300" },
  { type: "galaxy",    emoji: "🌌", label: "Galaxy",   color: "bg-violet-500/20 hover:bg-violet-500/40 border-violet-500/50 text-violet-300" },
  { type: "fireworks", emoji: "🎆", label: "Fogos",    color: "bg-red-500/20 hover:bg-red-500/40 border-red-500/50 text-red-300" },
  { type: "dinheiro",  emoji: "💸", label: "Grana",    color: "bg-green-500/20 hover:bg-green-500/40 border-green-500/50 text-green-300" },
];

export default function TriggerPanel() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [customUser, setCustomUser] = useState(user?.tiktokUsername ?? "");
  const [firing, setFiring] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const username = customUser.trim().replace(/^@/, "") || user?.tiktokUsername || "";
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const overlayUrl = `${window.location.origin}${BASE}/overlay/triggers/${username}`;

  async function fireTrigger(type: string) {
    if (!username) {
      toast({ title: "Username obrigatório", description: "Defina seu @ do TikTok acima.", variant: "destructive" });
      return;
    }
    setFiring(type);
    try {
      await authFetch(`/tiktok/triggers/${encodeURIComponent(username)}/fire`, token, {
        method: "POST",
        body: JSON.stringify({ type }),
      });
      toast({ title: `${TRIGGERS.find(t => t.type === type)?.emoji ?? "🎬"} Animação disparada!`, description: `"${type}" enviado para o overlay.` });
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Falha ao disparar", variant: "destructive" });
    } finally {
      setFiring(null);
    }
  }

  function copyUrl() {
    void navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    toast({ title: "Copiado!", description: "URL do overlay copiada." });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Painel de Triggers</h1>
          <p className="text-sm text-muted-foreground">Dispare animações no overlay OBS em tempo real</p>
        </div>
      </div>

      {/* Username & overlay URL */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">@ do TikTok</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input
                  value={customUser}
                  onChange={(e) => setCustomUser(e.target.value)}
                  placeholder={user?.tiktokUsername ?? "seuusuario"}
                  className="pl-7 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">URL do Overlay (cole no OBS Browser Source)</Label>
            <div className="flex gap-2">
              <code className="flex-1 text-xs font-mono bg-muted/40 border border-border rounded-md px-3 py-2 truncate text-primary/80">
                {overlayUrl}
              </code>
              <Button size="icon" variant="outline" className="shrink-0" onClick={copyUrl}>
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button size="icon" variant="outline" className="shrink-0" asChild>
                <a href={overlayUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Radio className="w-3 h-3 text-green-500" />
              O overlay atualiza em tempo real via SSE — nenhum reload necessário
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Trigger buttons */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Animações</CardTitle>
          <CardDescription className="text-xs">Clique para disparar no overlay OBS</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TRIGGERS.map((t) => (
              <button
                key={t.type}
                disabled={firing !== null || !username}
                onClick={() => void fireTrigger(t.type)}
                className={`
                  relative flex flex-col items-center justify-center gap-2
                  rounded-xl border p-4 text-sm font-semibold
                  transition-all duration-150 active:scale-95
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${t.color}
                  ${firing === t.type ? "scale-95 opacity-70" : ""}
                `}
              >
                <span className="text-3xl">{t.emoji}</span>
                <span>{t.label}</span>
                {firing === t.type && (
                  <span className="absolute inset-0 rounded-xl bg-white/5 animate-pulse" />
                )}
              </button>
            ))}
          </div>
          {!username && (
            <p className="text-xs text-center text-muted-foreground mt-3">
              ⚠️ Defina o @ do TikTok acima para habilitar os triggers
            </p>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-muted/20 border-border">
        <CardContent className="pt-4">
          <ol className="text-sm space-y-1.5 text-muted-foreground list-decimal list-inside">
            <li>No OBS, adicione um <strong className="text-foreground">Browser Source</strong></li>
            <li>Cole a URL do overlay acima (tamanho: <code className="text-xs bg-muted px-1 rounded">1920×1080</code>)</li>
            <li>Marque <strong className="text-foreground">"Shutdown source when not visible"</strong></li>
            <li>Durante a live, clique nos botões para disparar as animações</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
