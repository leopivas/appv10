import { useState, useRef, useCallback, useEffect } from "react";
import {
  Monitor, Plus, Layers, Eye, EyeOff, Trash2, Copy, CheckCircle2,
  ExternalLink, RotateCcw, Save, X, ChevronDown, ChevronUp,
  Maximize2, Move, Settings2, Info, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth, authFetch } from "@/context/auth-context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const MAX_LAYERS = 8;

// ─── Types ────────────────────────────────────────────────────────────────────
interface OverlayLayer {
  id: string;
  catalogId: string;
  label: string;
  icon: string;
  path: string;
  direct: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  visible: boolean;
  params: Record<string, string>;
}
interface Preset { id: string; name: string; layers: OverlayLayer[]; createdAt?: number }

type ParamDef =
  | { key: string; label: string; type: "slider"; min: number; max: number; step?: number; default: string }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[]; default: string }
  | { key: string; label: string; type: "text"; placeholder?: string; default: string };

// ─── Overlay-specific URL param schemas ──────────────────────────────────────
const OVERLAY_PARAMS: Record<string, ParamDef[]> = {
  main: [
    { key: "chat",    label: "Mostrar chat",   type: "select", options: [{ value: "1", label: "Sim" }, { value: "0", label: "Não" }], default: "1" },
    { key: "gifts",   label: "Mostrar gifts",  type: "select", options: [{ value: "1", label: "Sim" }, { value: "0", label: "Não" }], default: "1" },
    { key: "follows", label: "Seguimentos",    type: "select", options: [{ value: "1", label: "Sim" }, { value: "0", label: "Não" }], default: "1" },
    { key: "bg",      label: "Opacidade fundo",type: "slider", min: 0, max: 80, step: 5, default: "40" },
    { key: "size",    label: "Tamanho texto",  type: "select", options: [{ value: "sm", label: "Pequeno" }, { value: "md", label: "Médio" }, { value: "lg", label: "Grande" }], default: "md" },
  ],
  chat: [
    { key: "bg",   label: "Opacidade fundo",   type: "slider", min: 0, max: 80, step: 5, default: "40" },
    { key: "size", label: "Tamanho texto",      type: "select", options: [{ value: "sm", label: "Pequeno" }, { value: "md", label: "Médio" }, { value: "lg", label: "Grande" }], default: "md" },
    { key: "max",  label: "Máx mensagens",      type: "slider", min: 5, max: 30, step: 1, default: "10" },
  ],
  alerts: [
    { key: "size", label: "Tamanho", type: "select", options: [{ value: "sm", label: "Pequeno" }, { value: "md", label: "Médio" }, { value: "lg", label: "Grande" }], default: "md" },
  ],
  "top-gifters": [
    { key: "limit", label: "Qtd exibida",     type: "slider", min: 3, max: 10, step: 1, default: "5" },
    { key: "bg",    label: "Opacidade fundo", type: "slider", min: 0, max: 80, step: 5, default: "40" },
  ],
  stats: [
    { key: "bg", label: "Opacidade fundo", type: "slider", min: 0, max: 80, step: 5, default: "0" },
  ],
  goal: [
    { key: "target", label: "Meta (coins)", type: "text", placeholder: "10000", default: "" },
    { key: "label",  label: "Texto da meta", type: "text", placeholder: "Minha meta", default: "" },
    { key: "color",  label: "Cor da barra",  type: "select", options: [{ value: "purple", label: "Roxo" }, { value: "pink", label: "Rosa" }, { value: "blue", label: "Azul" }, { value: "green", label: "Verde" }], default: "purple" },
  ],
  ticker: [
    { key: "speed", label: "Velocidade", type: "select", options: [{ value: "slow", label: "Lento" }, { value: "normal", label: "Normal" }, { value: "fast", label: "Rápido" }], default: "normal" },
  ],
  subscribe: [
    { key: "bg", label: "Opacidade fundo", type: "slider", min: 0, max: 80, step: 5, default: "40" },
  ],
  combo: [
    { key: "threshold", label: "Mín combo",  type: "slider", min: 2, max: 20, step: 1, default: "3" },
  ],
};

// ─── Catalog ──────────────────────────────────────────────────────────────────
const CATALOG = [
  { id: "main",         label: "Overlay Principal", icon: "🎬", path: "/overlay",             defaultW: 100, defaultH: 100, direct: true  },
  { id: "chat",         label: "Chat ao vivo",      icon: "💬", path: "/overlay/chat",        defaultW: 22,  defaultH: 55,  direct: true  },
  { id: "alerts",       label: "Alertas",           icon: "🔔", path: "/overlay/alerts",      defaultW: 35,  defaultH: 18,  direct: true  },
  { id: "top-gifters",  label: "Top Gifters",       icon: "🏆", path: "/overlay/top-gifters", defaultW: 24,  defaultH: 42,  direct: true  },
  { id: "stats",        label: "Estatísticas",      icon: "📊", path: "/overlay/stats",       defaultW: 32,  defaultH: 10,  direct: true  },
  { id: "goal",         label: "Meta/Goal",         icon: "🎯", path: "/overlay/goal",        defaultW: 35,  defaultH: 9,   direct: true  },
  { id: "combo",        label: "Combo de Gifts",    icon: "🔥", path: "/overlay/combo",       defaultW: 24,  defaultH: 28,  direct: true  },
  { id: "subscribe",    label: "Subscribers",       icon: "⭐", path: "/overlay/subscribe",   defaultW: 30,  defaultH: 18,  direct: true  },
  { id: "ticker",       label: "Ticker/Rodapé",     icon: "📰", path: "/overlay/ticker",      defaultW: 100, defaultH: 7,   direct: true  },
  { id: "likes",        label: "Ranking Likes",     icon: "❤️", path: "/overlays/likes",      defaultW: 24,  defaultH: 42,  direct: false },
  { id: "battle",       label: "Battle",            icon: "⚔️", path: "/overlays/battle",     defaultW: 30,  defaultH: 14,  direct: false },
  { id: "coins",        label: "Coins",             icon: "🪙", path: "/overlays/coins",      defaultW: 24,  defaultH: 18,  direct: false },
  { id: "mvp",          label: "MVP",               icon: "👑", path: "/overlays/mvp",        defaultW: 30,  defaultH: 18,  direct: false },
  { id: "pote",         label: "Pote",              icon: "🫙", path: "/overlays/pote",       defaultW: 24,  defaultH: 22,  direct: false },
  { id: "gifts",        label: "Feed de Gifts",     icon: "🎁", path: "/overlays/gifts",      defaultW: 24,  defaultH: 38,  direct: false },
  { id: "share",        label: "Top Shares",        icon: "🔗", path: "/overlays/share",      defaultW: 24,  defaultH: 35,  direct: false },
  { id: "whatsapp",     label: "WhatsApp CTA",      icon: "💬", path: "/overlays/whatsapp",   defaultW: 24,  defaultH: 12,  direct: false },
  { id: "notificacoes", label: "Notificações",      icon: "📱", path: "/overlays/notificacoes", defaultW: 30, defaultH: 22, direct: false },
  { id: "gamer",        label: "Gamer HUD",         icon: "🎮", path: "/overlays/gamer",      defaultW: 30,  defaultH: 18,  direct: false },
  { id: "level-up",     label: "Level Up",          icon: "⬆️", path: "/overlays/level-up",   defaultW: 30,  defaultH: 18,  direct: false },
];

// ─── URL helpers ───────────────────────────────────────────────────────────────
function buildUrl(layer: OverlayLayer, username: string): string {
  const u = username || "USERNAME";
  const params = new URLSearchParams(layer.params);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const origin = window.location.origin;
  if (layer.direct) return `${origin}${BASE}${layer.path}/${u}${qs}`;
  return `${origin}${BASE}${layer.path}`;
}

function obsCss(l: OverlayLayer): string {
  return `position: absolute; left: ${l.x.toFixed(1)}%; top: ${l.y.toFixed(1)}%; width: ${l.w.toFixed(1)}%; height: ${l.h.toFixed(1)}%; opacity: ${(l.opacity / 100).toFixed(2)};`;
}

// ─── Open live preview in new window ──────────────────────────────────────────
function openPreviewWindow(layers: OverlayLayer[], username: string) {
  const u = username || "USERNAME";
  const visibleDirect = layers.filter(l => l.visible && l.direct);
  const iframes = visibleDirect.map(l => {
    const url = buildUrl(l, username);
    return `<iframe src="${url}" style="position:absolute;left:${l.x}%;top:${l.y}%;width:${l.w}%;height:${l.h}%;opacity:${(l.opacity / 100).toFixed(2)};border:none;"></iframe>`;
  }).join("\n");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Preview — ${u} — Creatools Layout Editor</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;background:#000;overflow:hidden}
    .canvas{position:relative;width:100%;height:100%;overflow:hidden}
    iframe{border:none;pointer-events:none}
    .badge{position:fixed;bottom:8px;left:8px;background:rgba(0,0,0,0.7);color:rgba(255,255,255,0.4);font:10px monospace;padding:4px 8px;border-radius:4px}
  </style>
</head>
<body>
  <div class="canvas">${iframes}</div>
  <div class="badge">Creatools Layout Preview · @${u} · ${visibleDirect.length} overlay(s)</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);
  const win = window.open(blobUrl, "_blank", "width=1280,height=720,menubar=no,toolbar=no");
  if (win) setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}

// ─── Small copy button ─────────────────────────────────────────────────────────
function CopyBtn({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [ok, setOk] = useState(false);
  const { toast } = useToast();
  return (
    <button onClick={() => { void navigator.clipboard.writeText(value); setOk(true); toast({ title: "Copiado!" }); setTimeout(() => setOk(false), 1800); }}
      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors shrink-0"
      style={{ background: ok ? "rgba(34,197,94,0.15)" : "rgba(124,58,237,0.15)", color: ok ? "#4ade80" : "#a78bfa" }}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}{ok ? "Copiado!" : label}
    </button>
  );
}

// ─── Canvas layer item ─────────────────────────────────────────────────────────
interface CanvasItemProps {
  layer: OverlayLayer;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent) => void;
}
function CanvasItem({ layer, selected, onSelect, onDragStart, onResizeStart }: CanvasItemProps) {
  if (!layer.visible) return null;
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseDown={(e) => { e.stopPropagation(); onSelect(); onDragStart(e); }}
      style={{
        position: "absolute",
        left: `${layer.x}%`, top: `${layer.y}%`,
        width: `${layer.w}%`, height: `${layer.h}%`,
        opacity: layer.opacity / 100,
        border: selected ? "2px solid #a78bfa" : "1.5px dashed rgba(167,139,250,0.35)",
        borderRadius: 6,
        background: selected ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.08)",
        cursor: "move",
        userSelect: "none",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 2,
        boxSizing: "border-box",
        zIndex: selected ? 10 : 1,
      }}>
      <span style={{ fontSize: "clamp(10px, 2vw, 18px)", lineHeight: 1 }}>{layer.icon}</span>
      <span style={{ fontSize: "clamp(7px, 1.1vw, 12px)", fontWeight: 600, color: "#c4b5fd", textAlign: "center", lineHeight: 1.2, padding: "0 4px" }}>
        {layer.label}
      </span>
      {selected && (
        <div
          onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e); }}
          style={{ position: "absolute", bottom: 2, right: 2, width: 10, height: 10, background: "#a78bfa", borderRadius: 2, cursor: "se-resize" }}
        />
      )}
    </div>
  );
}

// ─── Per-overlay params editor ─────────────────────────────────────────────────
function ParamsEditor({ layer, onChange }: { layer: OverlayLayer; onChange: (params: Record<string, string>) => void }) {
  const defs = OVERLAY_PARAMS[layer.catalogId] ?? [];
  if (defs.length === 0) return (
    <p className="text-[10px] py-1" style={{ color: "rgba(255,255,255,0.25)" }}>Nenhum parâmetro configurável</p>
  );

  function setParam(key: string, value: string) {
    const updated = { ...layer.params };
    if (value === "" || value === (defs.find(d => d.key === key) as ParamDef | undefined)?.default) {
      delete updated[key];
    } else {
      updated[key] = value;
    }
    onChange(updated);
  }

  return (
    <div className="space-y-2.5">
      {defs.map(def => {
        const val = layer.params[def.key] ?? def.default;
        if (def.type === "slider") {
          return (
            <div key={def.key}>
              <div className="flex justify-between">
                <Label className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{def.label}</Label>
                <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>{val}</span>
              </div>
              <Slider value={[Number(val)]} min={def.min} max={def.max} step={def.step ?? 1}
                onValueChange={([v]) => setParam(def.key, String(v))}
                className="mt-1 [&_[role=slider]]:bg-violet-500" />
            </div>
          );
        }
        if (def.type === "select") {
          return (
            <div key={def.key}>
              <Label className="text-[10px] block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{def.label}</Label>
              <Select value={val} onValueChange={v => setParam(def.key, v)}>
                <SelectTrigger className="h-7 text-xs" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {def.options.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          );
        }
        // text
        return (
          <div key={def.key}>
            <Label className="text-[10px] block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{def.label}</Label>
            <Input value={val} onChange={e => setParam(def.key, e.target.value)}
              placeholder={(def as Extract<ParamDef, { type: "text" }>).placeholder}
              className="h-7 text-xs" style={{ background: "rgba(255,255,255,0.05)" }} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function LayoutEditor() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState(user?.tiktokUsername ?? "");
  const [usernameInput, setUsernameInput] = useState(user?.tiktokUsername ?? "");
  const [layers, setLayers] = useState<OverlayLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(true);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showUrlPanel, setShowUrlPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<"position" | "params">("position");
  const importRef = useRef<HTMLInputElement>(null);

  // ── Load presets from server ────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setPresetsLoading(true);
    authFetch("/layouts", token)
      .then((d) => setPresets(d as Preset[]))
      .catch(() => { /* silently ignore */ })
      .finally(() => setPresetsLoading(false));
  }, [token]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const resizeRef = useRef<{ id: string; sx: number; sy: number; ow: number; oh: number } | null>(null);

  const selectedLayer = layers.find(l => l.id === selectedId) ?? null;

  // ── Mouse drag/resize ──────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (dragRef.current) {
      const { id, sx, sy, ox, oy } = dragRef.current;
      const dx = ((e.clientX - sx) / rect.width) * 100;
      const dy = ((e.clientY - sy) / rect.height) * 100;
      setLayers(prev => prev.map(l => l.id === id
        ? { ...l, x: Math.max(0, Math.min(100 - l.w, ox + dx)), y: Math.max(0, Math.min(100 - l.h, oy + dy)) }
        : l));
    }
    if (resizeRef.current) {
      const { id, sx, sy, ow, oh } = resizeRef.current;
      const dw = ((e.clientX - sx) / rect.width) * 100;
      const dh = ((e.clientY - sy) / rect.height) * 100;
      setLayers(prev => prev.map(l => l.id === id
        ? { ...l, w: Math.max(5, Math.min(100, ow + dw)), h: Math.max(3, Math.min(100, oh + dh)) }
        : l));
    }
  }, []);

  const handleMouseUp = useCallback(() => { dragRef.current = null; resizeRef.current = null; }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [handleMouseMove, handleMouseUp]);

  // ── Layer actions ──────────────────────────────────────────────────────────
  function addLayer(cat: typeof CATALOG[0]) {
    if (layers.length >= MAX_LAYERS) { toast({ title: `Limite de ${MAX_LAYERS} camadas atingido` }); return; }
    const layer: OverlayLayer = {
      id: crypto.randomUUID(), catalogId: cat.id, label: cat.label,
      icon: cat.icon, path: cat.path, direct: cat.direct,
      x: Math.random() * 20 + 5, y: Math.random() * 20 + 5,
      w: cat.defaultW, h: cat.defaultH,
      opacity: 100, visible: true, params: {},
    };
    setLayers(prev => [...prev, layer]);
    setSelectedId(layer.id);
  }

  function removeLayer(id: string) {
    setLayers(prev => prev.filter(l => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function updateLayer(id: string, patch: Partial<OverlayLayer>) {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }

  // ── Presets ────────────────────────────────────────────────────────────────
  async function savePreset() {
    if (!presetName.trim() || !token) return;
    try {
      const p = await authFetch("/layouts", token, {
        method: "POST",
        body: JSON.stringify({ name: presetName.trim(), layers }),
      }) as Preset;
      setPresets(prev => [p, ...prev]);
      setPresetName(""); setShowPresetInput(false);
      toast({ title: `Preset "${p.name}" salvo na conta!` });
    } catch {
      toast({ title: "Erro ao salvar preset", variant: "destructive" });
    }
  }

  function loadPreset(p: Preset) {
    setLayers(p.layers); setSelectedId(null);
    toast({ title: `Preset "${p.name}" carregado!` });
  }

  async function deletePreset(id: string) {
    if (!token) return;
    setPresets(prev => prev.filter(p => p.id !== id));
    try {
      await authFetch(`/layouts/${id}`, token, { method: "DELETE" });
    } catch {
      // Re-fetch to restore state if delete failed
      authFetch("/layouts", token).then(d => setPresets(d as Preset[])).catch(() => null);
    }
  }

  async function renamePreset(id: string, newName: string) {
    if (!token || !newName.trim()) return;
    setRenamingId(null);
    try {
      const updated = await authFetch(`/layouts/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ name: newName.trim() }),
      }) as Preset;
      setPresets(prev => prev.map(p => p.id === id ? updated : p));
      toast({ title: `Preset renomeado para "${updated.name}"` });
    } catch {
      toast({ title: "Erro ao renomear", variant: "destructive" });
    }
  }

  function exportPreset(p: Preset) {
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${p.name.replace(/\s+/g, "_")}_layout.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importPreset(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as Preset;
        if (!parsed.name || !Array.isArray(parsed.layers)) throw new Error("Formato inválido");
        if (!token) return;
        const p = await authFetch("/layouts", token, {
          method: "POST",
          body: JSON.stringify({ name: `${parsed.name} (importado)`, layers: parsed.layers }),
        }) as Preset;
        setPresets(prev => [p, ...prev]);
        toast({ title: `Preset "${p.name}" importado!` });
      } catch {
        toast({ title: "Arquivo inválido ou corrompido", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  }

  const visibleDirectLayers = layers.filter(l => l.visible && l.direct);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}>
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>OVERLAY STUDIO</span>
              <Badge className="text-[10px] px-2 py-0.5" style={{ background: "rgba(249,115,22,0.15)", color: "#f97316", border: "none" }}>PRO</Badge>
            </div>
            <h1 className="text-xl font-bold text-white">Layout Editor</h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Posicione múltiplos overlays no canvas 16:9 e gere URLs para o OBS.
            </p>
          </div>
        </div>

        {/* Username + Preview */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>@</span>
            <Input value={usernameInput} onChange={e => setUsernameInput(e.target.value.replace(/^@/, ""))}
              placeholder="seu_tiktok" className="pl-6 w-36 text-sm h-8 font-mono"
              onKeyDown={e => e.key === "Enter" && setUsername(usernameInput.trim())} />
          </div>
          <Button size="sm" className="h-8 text-xs" onClick={() => setUsername(usernameInput.trim())}>Aplicar</Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
            disabled={visibleDirectLayers.length === 0}
            onClick={() => openPreviewWindow(layers, username)}
            title={visibleDirectLayers.length === 0 ? "Adicione overlays diretos ao canvas para pré-visualizar" : "Abrir preview em nova janela 1280×720"}>
            <Play className="w-3 h-3" /> Pré-visualizar
          </Button>
        </div>
      </div>

      {/* Presets bar */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
            {presetsLoading ? "Carregando…" : `Presets (${presets.length}):`}
          </span>

          {/* Save new preset */}
          {showPresetInput ? (
            <div className="flex items-center gap-1">
              <Input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Nome do preset"
                className="h-7 text-xs w-36" onKeyDown={e => e.key === "Enter" && void savePreset()} autoFocus />
              <Button size="sm" className="h-7 text-xs px-2" onClick={() => void savePreset()}>Salvar</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setShowPresetInput(false)}>✕</Button>
            </div>
          ) : (
            <button onClick={() => setShowPresetInput(true)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors"
              style={{ border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.35)" }}>
              <Save className="w-3 h-3" /> Salvar layout
            </button>
          )}

          {/* Import preset */}
          <button onClick={() => importRef.current?.click()}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors"
            style={{ border: "1px dashed rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.25)" }}
            title="Importar preset de arquivo JSON">
            <Plus className="w-3 h-3" /> Importar JSON
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) importPreset(f); e.target.value = ""; }} />

          {layers.length > 0 && (
            <button onClick={() => { setLayers([]); setSelectedId(null); }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ml-auto"
              style={{ color: "rgba(239,68,68,0.6)" }}>
              <RotateCcw className="w-3 h-3" /> Limpar
            </button>
          )}
        </div>

        {/* Preset chips */}
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {presets.map(p => (
              <div key={p.id} className="flex items-center gap-0.5 rounded-lg overflow-hidden"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {renamingId === p.id ? (
                  <div className="flex items-center gap-1 px-1.5">
                    <Input value={renameValue} onChange={e => setRenameValue(e.target.value)}
                      className="h-6 text-xs w-28 px-1" autoFocus
                      onKeyDown={e => { if (e.key === "Enter") void renamePreset(p.id, renameValue); if (e.key === "Escape") setRenamingId(null); }} />
                    <button onClick={() => void renamePreset(p.id, renameValue)}
                      className="text-[10px] px-1.5 py-0.5 rounded text-green-400 hover:bg-green-400/10">✓</button>
                    <button onClick={() => setRenamingId(null)} className="text-[10px] text-zinc-500 hover:text-white">✕</button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => loadPreset(p)} title={p.createdAt ? `Criado em ${new Date(p.createdAt).toLocaleDateString("pt-BR")}` : undefined}
                      className="text-xs px-2.5 py-1.5 font-medium transition-colors hover:bg-white/5"
                      style={{ color: "rgba(255,255,255,0.75)" }}>{p.name}</button>
                    <div className="flex items-center border-l gap-0 px-0.5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <button onClick={() => { setRenamingId(p.id); setRenameValue(p.name); }}
                        className="p-1 rounded hover:text-violet-400 transition-colors text-zinc-600" title="Renomear">
                        <Settings2 className="w-2.5 h-2.5" />
                      </button>
                      <button onClick={() => exportPreset(p)}
                        className="p-1 rounded hover:text-blue-400 transition-colors text-zinc-600" title="Exportar JSON">
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                      <button onClick={() => void deletePreset(p.id)}
                        className="p-1 rounded hover:text-red-400 transition-colors text-zinc-600" title="Apagar">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Three-column layout */}
      <div className="grid gap-3" style={{ gridTemplateColumns: showCatalog ? "190px 1fr 248px" : "32px 1fr 248px" }}>

        {/* ── Overlay Catalog ─────────────────────────────────────────────── */}
        <div className="space-y-2">
          <button onClick={() => setShowCatalog(v => !v)}
            className="w-full flex items-center gap-1.5 text-xs font-semibold px-2 py-1.5 rounded-lg"
            style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.04)" }}>
            <Layers className="w-3.5 h-3.5 shrink-0" />
            {showCatalog && <span className="flex-1 text-left">Overlays</span>}
          </button>

          {showCatalog && (
            <div className="space-y-0.5 max-h-[520px] overflow-y-auto pr-0.5" style={{ scrollbarWidth: "thin" }}>
              <p className="text-[10px] px-1 mb-1 font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>Browser Sources</p>
              {CATALOG.filter(c => c.direct).map(cat => (
                <button key={cat.id} onClick={() => addLayer(cat)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-all group"
                  style={{ color: "rgba(255,255,255,0.65)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(124,58,237,0.15)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <span className="text-sm">{cat.icon}</span>
                  <span className="flex-1 truncate">{cat.label}</span>
                  <Plus className="w-3 h-3 opacity-0 group-hover:opacity-60 shrink-0" />
                </button>
              ))}
              <p className="text-[10px] px-1 mt-3 mb-1 font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>Configuráveis</p>
              {CATALOG.filter(c => !c.direct).map(cat => (
                <button key={cat.id} onClick={() => addLayer(cat)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-all group"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <span className="text-sm">{cat.icon}</span>
                  <span className="flex-1 truncate">{cat.label}</span>
                  <Plus className="w-3 h-3 opacity-0 group-hover:opacity-60 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Canvas 16:9 ─────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>Canvas 1920×1080</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80" }}>
              {layers.filter(l => l.visible).length}/{layers.length} visíveis
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded ml-auto" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }}>
              {layers.length}/{MAX_LAYERS} camadas
            </span>
          </div>
          <div ref={canvasRef} onClick={() => setSelectedId(null)}
            style={{
              position: "relative", width: "100%", aspectRatio: "16/9",
              background: "linear-gradient(135deg, #0a0612 0%, #0d0a1a 100%)",
              border: "1px solid rgba(124,58,237,0.25)", borderRadius: 10, overflow: "hidden",
            }}>
            {/* Grid guides */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.07 }}>
              {[33, 66].map(p => <div key={`v${p}`} style={{ position: "absolute", left: `${p}%`, top: 0, width: 1, height: "100%", background: "rgba(255,255,255,0.5)" }} />)}
              {[33, 66].map(p => <div key={`h${p}`} style={{ position: "absolute", top: `${p}%`, left: 0, height: 1, width: "100%", background: "rgba(255,255,255,0.5)" }} />)}
            </div>

            {layers.length === 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Layers style={{ width: 28, height: 28, color: "rgba(255,255,255,0.08)" }} />
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.12)", fontWeight: 500 }}>
                  Clique em um overlay à esquerda para adicionar
                </p>
              </div>
            )}

            {layers.map(layer => (
              <CanvasItem key={layer.id} layer={layer} selected={selectedId === layer.id}
                onSelect={() => setSelectedId(layer.id)}
                onDragStart={(e) => { dragRef.current = { id: layer.id, sx: e.clientX, sy: e.clientY, ox: layer.x, oy: layer.y }; }}
                onResizeStart={(e) => { resizeRef.current = { id: layer.id, sx: e.clientX, sy: e.clientY, ow: layer.w, oh: layer.h }; }}
              />
            ))}

            <div style={{ position: "absolute", bottom: 6, right: 8, fontSize: 10, color: "rgba(255,255,255,0.12)", fontWeight: 600 }}>
              1920 × 1080
            </div>
          </div>
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
            <Move className="inline w-3 h-3 mr-0.5" /> Arraste para mover — <Maximize2 className="inline w-3 h-3 mr-0.5" /> canto inferior direito para redimensionar
          </p>
        </div>

        {/* ── Layer list + Properties ──────────────────────────────────────── */}
        <div className="space-y-3">
          {/* Layer list */}
          <div>
            <p className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
              <Layers className="w-3.5 h-3.5" /> Camadas ({layers.length}/{MAX_LAYERS})
            </p>
            <div className="space-y-1 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {layers.length === 0 && (
                <p className="text-xs py-4 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>Nenhuma camada adicionada</p>
              )}
              {[...layers].reverse().map(layer => (
                <div key={layer.id} onClick={() => setSelectedId(layer.id)}
                  className="group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer"
                  style={{
                    background: selectedId === layer.id ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selectedId === layer.id ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.06)"}`,
                  }}>
                  <span className="text-sm">{layer.icon}</span>
                  <span className="flex-1 text-xs truncate" style={{ color: "rgba(255,255,255,0.75)" }}>{layer.label}</span>
                  <button onClick={e => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                    className="p-0.5 rounded" style={{ opacity: 0.5 }}>
                    {layer.visible ? <Eye className="w-3 h-3" style={{ color: "#a78bfa" }} /> : <EyeOff className="w-3 h-3" style={{ color: "rgba(255,255,255,0.2)" }} />}
                  </button>
                  <button onClick={e => { e.stopPropagation(); removeLayer(layer.id); }}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3 h-3" style={{ color: "rgba(239,68,68,0.6)" }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Properties panel */}
          {selectedLayer && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(167,139,250,0.2)" }}>
              {/* Tab bar */}
              <div className="flex" style={{ background: "rgba(255,255,255,0.04)" }}>
                {(["position", "params"] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-colors"
                    style={{
                      background: activeTab === tab ? "rgba(124,58,237,0.2)" : "transparent",
                      color: activeTab === tab ? "#a78bfa" : "rgba(255,255,255,0.35)",
                      borderBottom: activeTab === tab ? "1px solid rgba(167,139,250,0.4)" : "1px solid transparent",
                    }}>
                    {tab === "position" ? <><Move className="w-3 h-3" /> Posição/Tamanho</> : <><Settings2 className="w-3 h-3" /> Parâmetros</>}
                  </button>
                ))}
              </div>

              <div className="p-3 space-y-3" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-[10px] font-semibold truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {selectedLayer.icon} {selectedLayer.label}
                </p>

                {activeTab === "position" && (
                  <>
                    {/* Position */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Posição</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(["x", "y"] as const).map(key => (
                          <div key={key}>
                            <Label className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{key.toUpperCase()}: {selectedLayer[key].toFixed(1)}%</Label>
                            <Slider value={[selectedLayer[key]]} min={0} max={95} step={0.5}
                              onValueChange={([v]) => updateLayer(selectedLayer.id, { [key]: v })}
                              className="mt-1 [&_[role=slider]]:bg-violet-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Size */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Tamanho</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(["w", "h"] as const).map(key => (
                          <div key={key}>
                            <Label className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{key.toUpperCase()}: {selectedLayer[key].toFixed(1)}%</Label>
                            <Slider value={[selectedLayer[key]]} min={3} max={100} step={0.5}
                              onValueChange={([v]) => updateLayer(selectedLayer.id, { [key]: v })}
                              className="mt-1 [&_[role=slider]]:bg-violet-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Opacity */}
                    <div>
                      <Label className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Opacidade: {selectedLayer.opacity}%</Label>
                      <Slider value={[selectedLayer.opacity]} min={10} max={100} step={5}
                        onValueChange={([v]) => updateLayer(selectedLayer.id, { opacity: v })}
                        className="mt-1 [&_[role=slider]]:bg-violet-500" />
                    </div>
                    {/* Quick position */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Posição rápida</p>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { label: "↖", x: 0, y: 0 }, { label: "↑", x: 50 - selectedLayer.w / 2, y: 0 }, { label: "↗", x: 100 - selectedLayer.w, y: 0 },
                          { label: "←", x: 0, y: 50 - selectedLayer.h / 2 }, { label: "⊙", x: 50 - selectedLayer.w / 2, y: 50 - selectedLayer.h / 2 }, { label: "→", x: 100 - selectedLayer.w, y: 50 - selectedLayer.h / 2 },
                          { label: "↙", x: 0, y: 100 - selectedLayer.h }, { label: "↓", x: 50 - selectedLayer.w / 2, y: 100 - selectedLayer.h }, { label: "↘", x: 100 - selectedLayer.w, y: 100 - selectedLayer.h },
                        ].map(({ label, x, y }) => (
                          <button key={label} onClick={() => updateLayer(selectedLayer.id, { x: Math.max(0, x), y: Math.max(0, y) })}
                            className="py-1 rounded text-xs font-bold"
                            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(124,58,237,0.2)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "params" && (
                  <>
                    {!selectedLayer.direct && (
                      <div className="flex items-start gap-2 px-2 py-2 rounded-lg"
                        style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#fbbf24" }} />
                        <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                          Obtenha a URL deste overlay na{" "}
                          <a href={`${BASE}${selectedLayer.path}`} target="_blank" rel="noopener noreferrer"
                            className="underline" style={{ color: "#fbbf24" }}>
                            página de configuração →
                          </a>
                        </p>
                      </div>
                    )}
                    <ParamsEditor layer={selectedLayer} onChange={params => updateLayer(selectedLayer.id, { params })} />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── URL output panel ─────────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={() => setShowUrlPanel(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3"
          style={{ background: "rgba(255,255,255,0.03)" }}>
          <span className="text-xs font-semibold flex items-center gap-2" style={{ color: "rgba(255,255,255,0.6)" }}>
            <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
            URLs para o OBS ({layers.filter(l => l.visible).length} overlay{layers.filter(l => l.visible).length !== 1 ? "s" : ""})
            {!username && <span className="text-[10px] text-amber-400 ml-1">— insira seu username acima</span>}
          </span>
          {showUrlPanel ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />}
        </button>

        {showUrlPanel && (
          <div className="px-4 pb-4 space-y-3 pt-2">
            {layers.length === 0 && (
              <p className="text-xs py-2 text-center" style={{ color: "rgba(255,255,255,0.25)" }}>Adicione overlays ao canvas para gerar as URLs</p>
            )}

            {layers.filter(l => l.visible).map(layer => {
              const url = buildUrl(layer, username);
              const css = obsCss(layer);
              return (
                <div key={layer.id} className="space-y-1.5 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm">{layer.icon}</span>
                    <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>{layer.label}</span>
                    {!layer.direct && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
                        Obter URL na config
                      </span>
                    )}
                    <span className="text-[10px] ml-auto" style={{ color: "rgba(255,255,255,0.25)" }}>
                      {layer.x.toFixed(0)}%, {layer.y.toFixed(0)}% · {layer.w.toFixed(0)}×{layer.h.toFixed(0)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <code className="flex-1 text-[11px] font-mono truncate" style={{ color: layer.direct ? "#a78bfa" : "rgba(255,255,255,0.3)" }}>{url}</code>
                    <CopyBtn value={url} label="URL" />
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-white/5 transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {layer.direct && (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                      style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
                      <span className="text-[10px] font-bold shrink-0" style={{ color: "#60a5fa" }}>CSS OBS:</span>
                      <code className="flex-1 text-[10px] font-mono truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{css}</code>
                      <CopyBtn value={css} label="CSS" />
                    </div>
                  )}
                </div>
              );
            })}

            {visibleDirectLayers.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#60a5fa" }} />
                <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                  No <strong className="text-white/60">OBS</strong>: adicione cada URL como <em>Browser Source</em> (1920×1080) e cole o <em>Custom CSS</em> acima para posicionar automaticamente. Use <strong className="text-white/60">Pré-visualizar</strong> acima para ver o resultado antes de ir ao vivo.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
