import { useState } from "react";
import { Tv2, Copy, CheckCircle2, ExternalLink, Eye, MessageSquare, Gift, UserPlus, Share2, BarChart2, Sliders, Info, Twitch, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useGetLiveStatus, getGetLiveStatusQueryKey } from "@workspace/api-client-react";

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  function copy() {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    toast({ title: "Copiado!", description: label ?? "URL copiada para a área de transferência" });
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button variant="outline" size="sm" onClick={copy} className="shrink-0">
      {copied ? <CheckCircle2 className="w-4 h-4 mr-1.5 text-green-400" /> : <Copy className="w-4 h-4 mr-1.5" />}
      {copied ? "Copiado!" : "Copiar"}
    </Button>
  );
}

const OBS_STEPS = [
  { n: 1, title: "Abra o OBS Studio", desc: "Certifique-se de que o OBS está em versão 28+ para suporte completo a Browser Source." },
  { n: 2, title: "Adicione uma fonte", desc: 'Clique em "+" na seção "Sources" e selecione "Browser Source".' },
  { n: 3, title: "Cole a URL", desc: "Cole a URL do overlay gerada abaixo no campo URL. Defina largura 1920 e altura 1080 (ou a resolução do seu canvas)." },
  { n: 4, title: "Marque \"Shutdown source when not visible\"", desc: "Isso economiza recursos quando a cena não está ativa." },
  { n: 5, title: "Posicione e redimensione", desc: "Arraste o Browser Source para cobrir a tela toda ou posicione onde quiser o overlay." },
];

const TIKTOK_STEPS = [
  { n: 1, title: "Abra o TikTok LIVE Studio", desc: "Baixe o TikTok LIVE Studio em tiktok.com/live-studio se ainda não tiver." },
  { n: 2, title: "Vá em Configurações → Fontes", desc: 'Clique em "+" e adicione um "Browser Source" igual ao OBS.' },
  { n: 3, title: "Cole a URL do overlay", desc: "Use a mesma URL gerada abaixo. TikTok Studio usa o mesmo padrão de browser source." },
  { n: 4, title: "Ative o overlay", desc: "Habilite a fonte e posicione sobre o seu conteúdo para mostrar chat e gifts ao vivo." },
];

export default function StreamTools() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [inputUser, setInputUser] = useState("");

  const [showChat, setShowChat]       = useState(true);
  const [showGifts, setShowGifts]     = useState(true);
  const [showFollows, setShowFollows] = useState(true);
  const [showStats, setShowStats]     = useState(true);
  const [bgOpacity, setBgOpacity]     = useState(40);
  const [fontSize, setFontSize]       = useState("md");

  const [roomUser, setRoomUser] = useState("");
  const [roomInput, setRoomInput] = useState("");

  const { data: liveData } = useGetLiveStatus(
    { uniqueId: roomUser },
    { query: { queryKey: getGetLiveStatusQueryKey({ uniqueId: roomUser }), enabled: !!roomUser } }
  );
  const liveRaw = liveData as { is_live?: boolean; room_id?: string; viewer_count?: number; title?: string; thumbnail_url?: string } | undefined;

  function buildOverlayUrl(): string {
    const base = window.location.origin;
    const params = new URLSearchParams();
    if (!showChat)    params.set("chat", "0");
    if (!showGifts)   params.set("gifts", "0");
    if (!showFollows) params.set("follows", "0");
    if (!showStats)   params.set("stats", "0");
    if (bgOpacity !== 40) params.set("bg", String(bgOpacity));
    if (fontSize !== "md") params.set("size", fontSize);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return `${base}/overlay/${username || "USERNAME"}${qs}`;
  }

  const overlayUrl = buildOverlayUrl();
  const hasUsername = !!username;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/20 via-cyan-500/10 to-pink-500/20 border border-white/10 p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/30">
            <Tv2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Stream Tools</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Overlays em tempo real para OBS Studio e TikTok LIVE Studio — chat, gifts e estatísticas diretamente na sua transmissão.
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/20">OBS Studio</Badge>
              <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/20">TikTok LIVE Studio</Badge>
              <Badge className="bg-pink-500/15 text-pink-300 border-pink-500/20">Streamlabs</Badge>
              <Badge className="bg-green-500/15 text-green-300 border-green-500/20">XSplit</Badge>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="obs">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="obs" className="gap-2">
            <Monitor className="w-4 h-4" />OBS / Browser Source
          </TabsTrigger>
          <TabsTrigger value="tiktok" className="gap-2">
            <Tv2 className="w-4 h-4" />TikTok Studio
          </TabsTrigger>
          <TabsTrigger value="room" className="gap-2">
            <BarChart2 className="w-4 h-4" />Room Info
          </TabsTrigger>
        </TabsList>

        {/* ── OBS Tab ── */}
        <TabsContent value="obs" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Configuration */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-primary" />
                    Configurar Overlay
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Username */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Username do TikTok</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                        <Input
                          placeholder="seu_usuario"
                          className="pl-7 font-mono"
                          value={inputUser}
                          onChange={(e) => setInputUser(e.target.value.replace(/^@/, ""))}
                          onKeyDown={(e) => e.key === "Enter" && setUsername(inputUser.trim())}
                        />
                      </div>
                      <Button onClick={() => setUsername(inputUser.trim())} disabled={!inputUser.trim()}>
                        Aplicar
                      </Button>
                    </div>
                  </div>

                  {/* Events to show */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Eventos a exibir</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "chat", label: "💬 Chat", value: showChat, set: setShowChat },
                        { key: "gifts", label: "🎁 Gifts", value: showGifts, set: setShowGifts },
                        { key: "follows", label: "💙 Follows/Shares", value: showFollows, set: setShowFollows },
                        { key: "stats", label: "👁 Estatísticas", value: showStats, set: setShowStats },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
                          <Label className="text-sm cursor-pointer">{item.label}</Label>
                          <Switch checked={item.value} onCheckedChange={item.set} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Background opacity */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Opacidade do fundo</Label>
                      <span className="text-xs font-mono text-muted-foreground">{bgOpacity}%</span>
                    </div>
                    <Slider
                      value={[bgOpacity]}
                      onValueChange={([v]) => setBgOpacity(v)}
                      min={0} max={80} step={5}
                      className="py-1"
                    />
                    <p className="text-xs text-muted-foreground">0% = totalmente transparente (recomendado para OBS)</p>
                  </div>

                  {/* Font size */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Tamanho do texto</Label>
                    <Select value={fontSize} onValueChange={setFontSize}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sm">Pequeno</SelectItem>
                        <SelectItem value="md">Médio (padrão)</SelectItem>
                        <SelectItem value="lg">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* URL output */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <p className="text-sm font-semibold text-primary">URL do Browser Source</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <code className="flex-1 text-xs bg-background/60 p-3 rounded-lg border border-border break-all font-mono leading-relaxed">
                      {overlayUrl}
                    </code>
                    <CopyButton value={overlayUrl} label="URL do overlay copiada!" />
                  </div>
                  {!hasUsername && (
                    <p className="text-xs text-amber-400 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" />
                      Insira seu username acima para gerar a URL final
                    </p>
                  )}
                  {hasUsername && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={overlayUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />Pré-visualizar
                        </a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Instructions */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-violet-400" />
                    Como adicionar no OBS Studio
                  </CardTitle>
                  <CardDescription>Siga os passos abaixo para ativar o overlay</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {OBS_STEPS.map((step) => (
                    <div key={step.n} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-400 shrink-0 mt-0.5">
                        {step.n}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{step.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                    <p className="text-xs text-cyan-300 font-medium mb-1">💡 Dica de resolução</p>
                    <p className="text-xs text-muted-foreground">
                      Use <strong className="text-foreground">Largura: 1920 / Altura: 1080</strong> mesmo se o seu canvas for diferente — o overlay é responsivo e se adapta.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* What the overlay shows */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">O que aparece no overlay</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { icon: "💬", label: "Mensagens de chat", color: "text-white" },
                      { icon: "🎁", label: "Gifts com animação", color: "text-yellow-300" },
                      { icon: "💙", label: "Novos seguidores", color: "text-cyan-300" },
                      { icon: "📤", label: "Compartilhamentos", color: "text-green-300" },
                      { icon: "👁", label: "Viewers ao vivo", color: "text-white" },
                      { icon: "❤️", label: "Contador de likes", color: "text-red-300" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                        <span>{item.icon}</span>
                        <span className={`${item.color}`}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── TikTok Studio Tab ── */}
        <TabsContent value="tiktok" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tv2 className="w-4 h-4 text-cyan-400" />
                  Como usar no TikTok LIVE Studio
                </CardTitle>
                <CardDescription>O TikTok LIVE Studio também suporta Browser Sources</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {TIKTOK_STEPS.map((step) => (
                  <div key={step.n} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-xs font-bold text-cyan-400 shrink-0 mt-0.5">
                      {step.n}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <p className="text-sm font-semibold text-primary">URL do Browser Source (TikTok Studio)</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Use a mesma URL gerada na aba OBS:</p>
                  <div className="flex items-start gap-2">
                    <code className="flex-1 text-xs bg-background/60 p-3 rounded-lg border border-border break-all font-mono leading-relaxed">
                      {overlayUrl}
                    </code>
                    <CopyButton value={overlayUrl} label="URL copiada!" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-300">Compatibilidade</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Este overlay funciona em qualquer software de streaming que suporte <strong className="text-foreground">Browser Source</strong>:
                        OBS Studio, TikTok LIVE Studio, Streamlabs, XSplit, vMix e outros.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Room Info Tab ── */}
        <TabsContent value="room" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Verificar status e room info</CardTitle>
              <CardDescription>Busca o Room ID, título e estatísticas de qualquer stream ao vivo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1 max-w-sm">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <Input
                    placeholder="username"
                    className="pl-7 font-mono"
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value.replace(/^@/, ""))}
                    onKeyDown={(e) => e.key === "Enter" && setRoomUser(roomInput.trim())}
                  />
                </div>
                <Button onClick={() => setRoomUser(roomInput.trim())} disabled={!roomInput.trim()}>
                  Buscar
                </Button>
              </div>

              {roomUser && liveRaw && (
                <div className="space-y-3">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${liveRaw.is_live ? "border-green-500/30 bg-green-500/5" : "border-border bg-muted/20"}`}>
                    <span className={`w-2 h-2 rounded-full ${liveRaw.is_live ? "bg-green-400 animate-pulse" : "bg-muted-foreground"}`} />
                    <span className="text-sm font-medium">{liveRaw.is_live ? "🔴 AO VIVO agora" : "⚫ Offline"}</span>
                  </div>

                  {liveRaw.is_live && (
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="border-border">
                        <CardContent className="pt-3 pb-3">
                          <p className="text-xs text-muted-foreground">Room ID</p>
                          <div className="flex items-center gap-1 mt-1">
                            <code className="text-sm font-mono font-bold truncate">{liveRaw.room_id ?? "—"}</code>
                            {liveRaw.room_id && <CopyButton value={liveRaw.room_id} label="Room ID copiado" />}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-border">
                        <CardContent className="pt-3 pb-3">
                          <p className="text-xs text-muted-foreground">Viewers</p>
                          <p className="text-lg font-bold mt-1">{(liveRaw.viewer_count ?? 0).toLocaleString()}</p>
                        </CardContent>
                      </Card>
                      {liveRaw.title && (
                        <div className="col-span-2">
                          <Card className="border-border">
                            <CardContent className="pt-3 pb-3">
                              <p className="text-xs text-muted-foreground">Título do stream</p>
                              <p className="text-sm font-medium mt-1">{liveRaw.title}</p>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!roomUser && (
                <div className="py-10 text-center">
                  <BarChart2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Digite um username para verificar o status ao vivo</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
