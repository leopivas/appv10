/**
 * /overlays — Painel central de overlays para OBS / TikTok Studio / Streamlabs
 * Semelhante ao tikfinity: cada overlay tem URL copiável e preview.
 */
import { useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import {
  Monitor, Copy, CheckCircle2, ExternalLink,
  Trophy, Zap, BarChart2, Target, Gamepad2, Gift,
  ChevronDown, ChevronRight, Eye, Info, Star, MessageSquare, Ticket, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  function copy() {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    toast({ title: "Copiado!", description: "URL copiada para a área de transferência." });
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button variant="outline" size="sm" onClick={copy} className="shrink-0 gap-1.5">
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copiado!" : "Copiar URL"}
    </Button>
  );
}

function UrlBox({ url, label }: { url: string; label?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      {label && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>}
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono text-primary/80 break-all leading-relaxed">{url}</code>
        <div className="flex gap-1.5 shrink-0">
          <CopyBtn value={url} />
          <Button variant="ghost" size="sm" asChild className="gap-1 px-2">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Eye className="w-3.5 h-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc, color }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; desc: string; color: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        <p className="text-muted-foreground text-sm">{desc}</p>
      </div>
    </div>
  );
}

// ── Obs how-to steps ──────────────────────────────────────────────────────────
function ObsHowTo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card/50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="w-4 h-4" />
        Como adicionar no OBS / TikTok Studio / Streamlabs
        {open ? <ChevronDown className="w-4 h-4 ml-auto" /> : <ChevronRight className="w-4 h-4 ml-auto" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <Separator />
          {[
            { n: 1, t: "Copie a URL do overlay", d: "Use o botão \"Copiar URL\" em qualquer overlay abaixo com o seu username." },
            { n: 2, t: "OBS: Adicionar Browser Source", d: "Sources → (+) → Browser Source. Cole a URL. Resolução: 1920×1080. Marque \"Shutdown source when not visible\"." },
            { n: 3, t: "TikTok LIVE Studio", d: "Configurações → Sources → (+) → Browser Source. Cole a mesma URL." },
            { n: 4, t: "Streamlabs / Streamlabs Desktop", d: "Sources → (+) → Browser Source. Cole a URL e defina a resolução." },
            { n: 5, t: "Fundo transparente", d: "Todos os overlays são 100% transparentes por padrão — funciona perfeitamente com chroma key ou background removal." },
          ].map(s => (
            <div key={s.n} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{s.n}</div>
              <div>
                <p className="font-semibold text-sm">{s.t}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Overlays() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const { user } = useAuth();
  const defaultUser = user?.tiktokUsername ?? "";

  // Shared username — auto-fill from logged-in account
  const [inputUser, setInputUser] = useState(defaultUser);
  const [username,  setUsername]  = useState(defaultUser);
  const apply = useCallback(() => setUsername(inputUser.trim().replace(/^@/, "")), [inputUser]);

  // ── Alerts overlay config ──────────────────────────────────────────────────
  const [alertGifts,   setAlertGifts]   = useState(true);
  const [alertFollows, setAlertFollows] = useState(true);
  const [alertLikes,   setAlertLikes]   = useState(true);
  const [alertSubs,    setAlertSubs]    = useState(true);
  const [alertJoins,   setAlertJoins]   = useState(false);
  const [alertPos,     setAlertPos]     = useState("top-center");
  const [alertMin,     setAlertMin]     = useState(0);

  function buildAlertsUrl() {
    const p = new URLSearchParams();
    if (!alertGifts)   p.set("gifts", "0");
    if (!alertFollows) p.set("follows", "0");
    if (alertLikes)    p.set("likes", "1");
    if (!alertSubs)    p.set("subs", "0");
    if (alertJoins)    p.set("joins", "1");
    if (alertPos !== "top-center") p.set("pos", alertPos);
    if (alertMin > 0)  p.set("min", String(alertMin));
    const qs = p.toString() ? `?${p}` : "";
    return `${origin}/overlay/alerts/${username || "SEU_USUARIO"}${qs}`;
  }

  // ── Top Gifters config ─────────────────────────────────────────────────────
  const [gtMax,      setGtMax]      = useState(5);
  const [gtDiamonds, setGtDiamonds] = useState(true);
  const [gtCompact,  setGtCompact]  = useState(false);
  const [gtTitle,    setGtTitle]    = useState("Top Gifters");

  function buildTopGiftersUrl() {
    const p = new URLSearchParams();
    if (gtMax !== 5)       p.set("max", String(gtMax));
    if (!gtDiamonds)       p.set("diamonds", "0");
    if (gtCompact)         p.set("compact", "1");
    if (gtTitle !== "Top Gifters") p.set("title", gtTitle);
    const qs = p.toString() ? `?${p}` : "";
    return `${origin}/overlay/top-gifters/${username || "SEU_USUARIO"}${qs}`;
  }

  // ── Stats config ───────────────────────────────────────────────────────────
  const [statsLayout,  setStatsLayout]  = useState("horizontal");
  const [statsViewers, setStatsViewers] = useState(true);
  const [statsLikes,   setStatsLikes]   = useState(true);
  const [statsFoll,    setStatsFoll]    = useState(true);
  const [statsDiam,    setStatsDiam]    = useState(true);

  function buildStatsUrl() {
    const p = new URLSearchParams();
    if (statsLayout !== "horizontal") p.set("layout", statsLayout);
    if (!statsViewers) p.set("viewers", "0");
    if (!statsLikes)   p.set("likes", "0");
    if (!statsFoll)    p.set("followers", "0");
    if (!statsDiam)    p.set("diamonds", "0");
    const qs = p.toString() ? `?${p}` : "";
    return `${origin}/overlay/stats/${username || "SEU_USUARIO"}${qs}`;
  }

  // ── Goal config ────────────────────────────────────────────────────────────
  const [goalValue, setGoalValue] = useState("1000");
  const [goalMode,  setGoalMode]  = useState("diamonds");
  const [goalLabel, setGoalLabel] = useState("");
  const [goalColor, setGoalColor] = useState("#06b6d4");

  function buildGoalUrl() {
    const p = new URLSearchParams();
    p.set("goal", goalValue);
    if (goalMode !== "diamonds") p.set("mode", goalMode);
    if (goalLabel) p.set("label", goalLabel);
    if (goalColor !== "#06b6d4") p.set("color", goalColor); // URLSearchParams handles encoding
    return `${origin}/overlay/goal/${username || "SEU_USUARIO"}?${p}`;
  }

  // ── Combo config ───────────────────────────────────────────────────────────
  const [comboMin, setComboMin] = useState(2);
  const [comboTap, setComboTap] = useState(30);

  function buildComboUrl() {
    const p = new URLSearchParams();
    if (comboMin !== 2)  p.set("min", String(comboMin));
    if (comboTap !== 30) p.set("tap", String(comboTap));
    const qs = p.toString() ? `?${p}` : "";
    return `${origin}/overlay/combo/${username || "SEU_USUARIO"}${qs}`;
  }

  // ── Basic overlay (chat + events) ──────────────────────────────────────────
  const [basicChat,    setBasicChat]    = useState(true);
  const [basicGifts,   setBasicGifts]   = useState(true);
  const [basicFollows, setBasicFollows] = useState(true);
  const [basicStats,   setBasicStats]   = useState(true);
  const [basicBg,      setBasicBg]      = useState(0);
  const [basicSize,    setBasicSize]    = useState("md");

  function buildBasicUrl() {
    const p = new URLSearchParams();
    if (!basicChat)    p.set("chat", "0");
    if (!basicGifts)   p.set("gifts", "0");
    if (!basicFollows) p.set("follows", "0");
    if (!basicStats)   p.set("stats", "0");
    if (basicBg > 0)   p.set("bg", String(basicBg));
    if (basicSize !== "md") p.set("size", basicSize);
    const qs = p.toString() ? `?${p}` : "";
    return `${origin}/overlay/${username || "SEU_USUARIO"}${qs}`;
  }

  // ── Subscribe overlay config ───────────────────────────────────────────────
  const [subPos, setSubPos] = useState("top-right");

  function buildSubscribeUrl() {
    const p = new URLSearchParams();
    if (subPos !== "top-right") p.set("pos", subPos);
    const qs = p.toString() ? `?${p}` : "";
    return `${origin}/overlay/subscribe/${username || "SEU_USUARIO"}${qs}`;
  }

  // ── Chat Wall overlay config ───────────────────────────────────────────────
  const [chatMax,  setChatMax]  = useState(8);
  const [chatPos,  setChatPos]  = useState("bottom-left");
  const [chatBg,   setChatBg]   = useState(50);
  const [chatSize, setChatSize] = useState("md");

  function buildChatUrl() {
    const p = new URLSearchParams();
    if (chatMax !== 8)           p.set("max", String(chatMax));
    if (chatPos !== "bottom-left") p.set("pos", chatPos);
    if (chatBg !== 50)           p.set("bg", String(chatBg));
    if (chatSize !== "md")       p.set("size", chatSize);
    const qs = p.toString() ? `?${p}` : "";
    return `${origin}/overlay/chat/${username || "SEU_USUARIO"}${qs}`;
  }

  // ── Gift Ticker overlay config ─────────────────────────────────────────────
  const [tickerPos,   setTickerPos]   = useState("bottom");
  const [tickerMin,   setTickerMin]   = useState(0);
  const [tickerSpeed, setTickerSpeed] = useState(40);

  function buildTickerUrl() {
    const p = new URLSearchParams();
    if (tickerPos !== "bottom") p.set("pos", tickerPos);
    if (tickerMin > 0)          p.set("min", String(tickerMin));
    if (tickerSpeed !== 40)     p.set("speed", String(tickerSpeed));
    const qs = p.toString() ? `?${p}` : "";
    return `${origin}/overlay/ticker/${username || "SEU_USUARIO"}${qs}`;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/20 via-cyan-500/10 to-pink-500/20 border border-white/10 p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.15),transparent_60%)] pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/30">
            <Monitor className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Overlay Studio</h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-xl">
              Overlays profissionais em tempo real para OBS, TikTok LIVE Studio e Streamlabs. Configure, copie a URL e adicione como Browser Source.
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {["OBS Studio", "TikTok Studio", "Streamlabs", "XSplit", "Twitch Studio"].map(s => (
                <Badge key={s} variant="outline" className="text-xs border-white/15 text-white/60">{s}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Username input (shared) ── */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label className="text-sm font-semibold">Username do TikTok <span className="text-muted-foreground font-normal">(aplicado a todos os overlays)</span></Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <Input
                    placeholder="seu_usuario"
                    className="pl-7 font-mono"
                    value={inputUser}
                    onChange={(e) => setInputUser(e.target.value.replace(/^@/, ""))}
                    onKeyDown={(e) => e.key === "Enter" && apply()}
                  />
                </div>
                <Button onClick={apply} disabled={!inputUser.trim()}>Aplicar</Button>
              </div>
            </div>
            {username && (
              <Badge className="mb-0.5 bg-green-500/15 text-green-400 border-green-500/20 text-sm px-3">
                ✓ @{username}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <ObsHowTo />

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList className="bg-card border border-border flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="alerts"    className="gap-1.5"><Zap       className="w-3.5 h-3.5"/>Alertas</TabsTrigger>
          <TabsTrigger value="combo"     className="gap-1.5"><Gamepad2  className="w-3.5 h-3.5"/>Combos</TabsTrigger>
          <TabsTrigger value="gifters"   className="gap-1.5"><Trophy    className="w-3.5 h-3.5"/>Top Gifters</TabsTrigger>
          <TabsTrigger value="stats"     className="gap-1.5"><BarChart2 className="w-3.5 h-3.5"/>Stats Bar</TabsTrigger>
          <TabsTrigger value="goal"      className="gap-1.5"><Target    className="w-3.5 h-3.5"/>Meta</TabsTrigger>
          <TabsTrigger value="subscribe" className="gap-1.5"><Star      className="w-3.5 h-3.5"/>Membros</TabsTrigger>
          <TabsTrigger value="chat"      className="gap-1.5"><MessageSquare className="w-3.5 h-3.5"/>Chat Wall</TabsTrigger>
          <TabsTrigger value="ticker"    className="gap-1.5"><Ticket    className="w-3.5 h-3.5"/>Gift Ticker</TabsTrigger>
          <TabsTrigger value="basic"     className="gap-1.5"><Monitor   className="w-3.5 h-3.5"/>Chat + Eventos</TabsTrigger>
        </TabsList>

        {/* ── ALERTS ── */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-5">
              <SectionHeader icon={Zap} title="Overlay de Alertas" color="bg-gradient-to-br from-orange-500 to-red-600"
                desc="Alertas animados para gifts, follows, shares e tap-tap. Suporte a luva, lion, galaxy e mais." />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Eventos</Label>
                  {[
                    { label: "🎁 Gifts", value: alertGifts, set: setAlertGifts },
                    { label: "💙 Follows / Shares", value: alertFollows, set: setAlertFollows },
                    { label: "❤️ Tap Tap (likes burst)", value: alertLikes, set: setAlertLikes },
                    { label: "⭐ Membros / Subscribe", value: alertSubs, set: setAlertSubs },
                    { label: "👋 Entradas na live", value: alertJoins, set: setAlertJoins },
                  ].map(({ label, value, set }) => (
                    <div key={label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border">
                      <Label className="text-sm">{label}</Label>
                      <Switch checked={value} onCheckedChange={set} />
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Posição</Label>
                  <Select value={alertPos} onValueChange={setAlertPos}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["top-center","top-left","top-right","bottom-left","bottom-right","bottom-center"].map(v => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label className="text-sm">Mínimo de diamonds</Label>
                      <span className="text-xs font-mono text-muted-foreground">💎 {alertMin}</span>
                    </div>
                    <Slider value={[alertMin]} onValueChange={([v]) => setAlertMin(v)} min={0} max={500} step={10} />
                    <p className="text-xs text-muted-foreground">Gifts abaixo desse valor não disparam alerta</p>
                  </div>
                </div>
              </div>

              <UrlBox url={buildAlertsUrl()} label="URL do Overlay — cole no OBS Browser Source" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── COMBOS ── */}
        <TabsContent value="combo" className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-5">
              <SectionHeader icon={Gamepad2} title="Combos & Tap-Tap" color="bg-gradient-to-br from-pink-500 to-purple-600"
                desc="Animação central na tela quando um gift é repetido (2x, 3x, LUVA!) ou muitos likes chegam ao mesmo tempo." />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Mínimo de combos para ativar</Label>
                    <span className="text-xs font-mono text-primary">{comboMin}x</span>
                  </div>
                  <Slider value={[comboMin]} onValueChange={([v]) => setComboMin(v)} min={2} max={20} step={1} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Likes para acionar Tap-Tap</Label>
                    <span className="text-xs font-mono text-primary">{comboTap} likes</span>
                  </div>
                  <Slider value={[comboTap]} onValueChange={([v]) => setComboTap(v)} min={5} max={100} step={5} />
                </div>
              </div>

              <div className="rounded-lg bg-muted/30 border border-border p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Gifts suportados com animação especial:</p>
                <p>🥊 Luva · 🦁 Lion · 🌌 Galaxy · 🪐 Universe · 🏰 Castle · 🌹 Rose · 🎭 Drama · 🎵 TikTok · 🎁 Qualquer gift</p>
                <p>👆 Tap Tap — detectado automaticamente por burst de likes</p>
              </div>

              <UrlBox url={buildComboUrl()} label="URL do Overlay — cole no OBS Browser Source" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TOP GIFTERS ── */}
        <TabsContent value="gifters" className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-5">
              <SectionHeader icon={Trophy} title="Top Gifters ao Vivo" color="bg-gradient-to-br from-yellow-500 to-amber-600"
                desc="Placar em tempo real dos maiores doadores da live. Atualiza a cada gift recebido." />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Título do placar</Label>
                    <Input value={gtTitle} onChange={(e) => setGtTitle(e.target.value)} placeholder="Top Gifters" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label className="text-sm">Nº de entradas</Label>
                      <span className="text-xs font-mono text-primary">Top {gtMax}</span>
                    </div>
                    <Slider value={[gtMax]} onValueChange={([v]) => setGtMax(v)} min={3} max={10} step={1} />
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "💎 Mostrar diamonds", value: gtDiamonds, set: setGtDiamonds },
                    { label: "📦 Modo compacto (horizontal)", value: gtCompact, set: setGtCompact },
                  ].map(({ label, value, set }) => (
                    <div key={label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border">
                      <Label className="text-sm">{label}</Label>
                      <Switch checked={value} onCheckedChange={set} />
                    </div>
                  ))}
                </div>
              </div>

              <UrlBox url={buildTopGiftersUrl()} label="URL do Overlay — cole no OBS Browser Source" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── STATS ── */}
        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-5">
              <SectionHeader icon={BarChart2} title="Barra de Stats" color="bg-gradient-to-br from-cyan-500 to-blue-600"
                desc="Counter de viewers, likes, seguidores e diamonds no canto da tela. Atualiza em tempo real." />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Layout</Label>
                  <Select value={statsLayout} onValueChange={setStatsLayout}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="horizontal">Horizontal (linha)</SelectItem>
                      <SelectItem value="vertical">Vertical (coluna)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Métricas</Label>
                  {[
                    { label: "👁 Viewers", v: statsViewers, s: setStatsViewers },
                    { label: "❤️ Likes", v: statsLikes, s: setStatsLikes },
                    { label: "👤 Seguidores", v: statsFoll, s: setStatsFoll },
                    { label: "💎 Diamonds", v: statsDiam, s: setStatsDiam },
                  ].map(({ label, v, s }) => (
                    <div key={label} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/40 border border-border">
                      <Label className="text-sm">{label}</Label>
                      <Switch checked={v} onCheckedChange={s} />
                    </div>
                  ))}
                </div>
              </div>

              <UrlBox url={buildStatsUrl()} label="URL do Overlay — cole no OBS Browser Source" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── GOAL ── */}
        <TabsContent value="goal" className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-5">
              <SectionHeader icon={Target} title="Barra de Meta" color="bg-gradient-to-br from-emerald-500 to-teal-600"
                desc="Barra de progresso animada para metas de diamonds, viewers ou likes. Brilha ao atingir a meta." />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Tipo de meta</Label>
                    <Select value={goalMode} onValueChange={setGoalMode}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diamonds">💎 Diamonds</SelectItem>
                        <SelectItem value="viewers">👁 Viewers</SelectItem>
                        <SelectItem value="likes">❤️ Likes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Valor da meta</Label>
                    <Input
                      type="number" min={1}
                      value={goalValue}
                      onChange={(e) => setGoalValue(e.target.value)}
                      placeholder="1000"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Label personalizada <span className="text-muted-foreground">(opcional)</span></Label>
                    <Input
                      value={goalLabel}
                      onChange={(e) => setGoalLabel(e.target.value)}
                      placeholder="ex: Meta de Gifts"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Cor da barra</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color" value={goalColor}
                        onChange={(e) => setGoalColor(e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                      />
                      <code className="text-xs font-mono text-muted-foreground">{goalColor}</code>
                    </div>
                  </div>
                </div>
              </div>

              <UrlBox url={buildGoalUrl()} label="URL do Overlay — cole no OBS Browser Source" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SUBSCRIBE ── */}
        <TabsContent value="subscribe" className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-5">
              <SectionHeader icon={Star} title="Alerta de Membros / Subscribe" color="bg-gradient-to-br from-violet-500 to-indigo-600"
                desc="Animação exclusiva quando um viewer assina (se torna membro) da sua live. Aparece automaticamente." />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Posição</Label>
                  <Select value={subPos} onValueChange={setSubPos}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["top-center","top-left","top-right","bottom-left","bottom-right","bottom-center"].map(v => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg bg-muted/30 border border-border p-3 text-xs text-muted-foreground space-y-1.5">
                  <p className="font-semibold text-foreground">Variações visuais automáticas:</p>
                  <p>🎉 Novo membro (1º mês)</p>
                  <p>⭐ Membro veterano (3+ meses)</p>
                  <p>💎 Membro fiel (12+ meses)</p>
                </div>
              </div>

              <UrlBox url={buildSubscribeUrl()} label="URL do Overlay — cole no OBS Browser Source" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CHAT WALL ── */}
        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-5">
              <SectionHeader icon={MessageSquare} title="Chat Wall" color="bg-gradient-to-br from-blue-500 to-cyan-600"
                desc="Feed limpo só com mensagens do chat. Ideal para streams sem poluição visual. Transparente e personalizável." />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label className="text-sm">Máximo de mensagens</Label>
                      <span className="text-xs font-mono text-primary">{chatMax}</span>
                    </div>
                    <Slider value={[chatMax]} onValueChange={([v]) => setChatMax(v)} min={3} max={20} step={1} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Posição</Label>
                    <Select value={chatPos} onValueChange={setChatPos}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["bottom-left","bottom-right","top-left","top-right","bottom-center","top-center"].map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label className="text-sm">Opacidade do fundo</Label>
                      <span className="text-xs font-mono text-muted-foreground">{chatBg}%</span>
                    </div>
                    <Slider value={[chatBg]} onValueChange={([v]) => setChatBg(v)} min={0} max={90} step={5} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Tamanho do texto</Label>
                    <Select value={chatSize} onValueChange={setChatSize}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sm">Pequeno</SelectItem>
                        <SelectItem value="md">Médio (padrão)</SelectItem>
                        <SelectItem value="lg">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <UrlBox url={buildChatUrl()} label="URL do Overlay — cole no OBS Browser Source" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── GIFT TICKER ── */}
        <TabsContent value="ticker" className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-5">
              <SectionHeader icon={Ticket} title="Gift Ticker" color="bg-gradient-to-br from-amber-500 to-orange-600"
                desc="Faixa horizontal rolante com os últimos gifts recebidos. Aparece na parte inferior ou superior da tela." />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Posição</Label>
                    <Select value={tickerPos} onValueChange={setTickerPos}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom">Inferior (padrão)</SelectItem>
                        <SelectItem value="top">Superior</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label className="text-sm">Mínimo de diamonds</Label>
                      <span className="text-xs font-mono text-muted-foreground">💎 {tickerMin}</span>
                    </div>
                    <Slider value={[tickerMin]} onValueChange={([v]) => setTickerMin(v)} min={0} max={500} step={10} />
                    <p className="text-xs text-muted-foreground">Gifts abaixo desse valor não aparecem no ticker</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label className="text-sm">Velocidade de rolagem</Label>
                      <span className="text-xs font-mono text-primary">{tickerSpeed} px/s</span>
                    </div>
                    <Slider value={[tickerSpeed]} onValueChange={([v]) => setTickerSpeed(v)} min={10} max={120} step={10} />
                  </div>
                  <div className="rounded-lg bg-muted/30 border border-border p-3 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">Dica</p>
                    <p>Use junto com o overlay de Alertas para uma experiência completa — o Ticker mostra histórico enquanto os Alertas aparecem em destaque.</p>
                  </div>
                </div>
              </div>

              <UrlBox url={buildTickerUrl()} label="URL do Overlay — cole no OBS Browser Source" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BASIC (chat) ── */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-5">
              <SectionHeader icon={Monitor} title="Chat + Eventos" color="bg-gradient-to-br from-violet-500 to-fuchsia-600"
                desc="Overlay clássico com chat ao vivo, alertas de gift e barra de stats no canto. O mais completo." />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conteúdo</Label>
                  {[
                    { label: "💬 Chat", v: basicChat, s: setBasicChat },
                    { label: "🎁 Gifts", v: basicGifts, s: setBasicGifts },
                    { label: "💙 Follows / Shares", v: basicFollows, s: setBasicFollows },
                    { label: "👁 Barra de stats", v: basicStats, s: setBasicStats },
                  ].map(({ label, v, s }) => (
                    <div key={label} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/40 border border-border">
                      <Label className="text-sm">{label}</Label>
                      <Switch checked={v} onCheckedChange={s} />
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-sm">Opacidade do fundo</Label>
                      <span className="text-xs font-mono text-muted-foreground">{basicBg}%</span>
                    </div>
                    <Slider value={[basicBg]} onValueChange={([v]) => setBasicBg(v)} min={0} max={80} step={5} />
                    <p className="text-xs text-muted-foreground">0% = totalmente transparente (recomendado)</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Tamanho do texto</Label>
                    <Select value={basicSize} onValueChange={setBasicSize}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sm">Pequeno</SelectItem>
                        <SelectItem value="md">Médio (padrão)</SelectItem>
                        <SelectItem value="lg">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <UrlBox url={buildBasicUrl()} label="URL do Overlay — cole no OBS Browser Source" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Quick Reference ── */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" /> Referência rápida de overlays
          </CardTitle>
          <CardDescription className="text-xs">Todas as URLs geradas para @{username || "SEU_USUARIO"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: "Alertas (gifts, follows, tap-tap, sub)", url: buildAlertsUrl() },
            { label: "Combos & Luva (tap-tap 2x, 3x...)", url: buildComboUrl() },
            { label: "Top Gifters", url: buildTopGiftersUrl() },
            { label: "Stats Bar", url: buildStatsUrl() },
            { label: "Barra de Meta", url: buildGoalUrl() },
            { label: "Membros / Subscribe", url: buildSubscribeUrl() },
            { label: "Chat Wall", url: buildChatUrl() },
            { label: "Gift Ticker", url: buildTickerUrl() },
            { label: "Chat + Eventos (completo)", url: buildBasicUrl() },
          ].map(({ label, url }) => (
            <div key={label} className="flex items-center gap-2 py-1">
              <span className="text-xs text-muted-foreground w-44 shrink-0">{label}</span>
              <code className="flex-1 text-xs font-mono text-primary/70 truncate">{url}</code>
              <CopyBtn value={url} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
