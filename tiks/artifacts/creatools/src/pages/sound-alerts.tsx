import { useState, useEffect, useRef, useCallback } from "react";
import {
  Volume2, VolumeX, Play, Trash2, Upload, Plus, Mic,
  RotateCcw, Info, ChevronDown, ChevronUp, TestTube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  loadTTSConfig, saveTTSConfig, DEFAULT_TTS_CONFIG, TTS_EVENT_TYPES,
  type TTSConfig,
} from "@/hooks/use-tts-engine";
import {
  loadSoundAlerts, saveSoundAlerts,
  type SoundAlertConfig,
} from "@/hooks/use-sound-alerts-engine";

// ─── Voice selector ─────────────────────────────────────────────────────────
function VoiceSelector({ voiceURI, onChange }: { voiceURI: string; onChange: (v: string) => void }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  return (
    <select
      value={voiceURI}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-sm rounded-lg px-3 py-2"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
    >
      <option value="" style={{ background: "#1a1625" }}>— Padrão do sistema —</option>
      {voices.map((v) => (
        <option key={v.voiceURI} value={v.voiceURI} style={{ background: "#1a1625" }}>
          {v.name} ({v.lang}){v.localService ? " ✓" : " ☁"}
        </option>
      ))}
    </select>
  );
}

// ─── TTS Tab ─────────────────────────────────────────────────────────────────
function TTSTab() {
  const [config, setConfig] = useState<TTSConfig>(() => loadTTSConfig());
  const [saved, setSaved] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const previewInputRef = useRef<HTMLInputElement>(null);

  const save = useCallback((cfg: TTSConfig) => {
    saveTTSConfig(cfg);
    setConfig(cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, []);

  const patch = useCallback((partial: Partial<TTSConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      saveTTSConfig(next);
      return next;
    });
  }, []);

  const patchEvent = useCallback((id: string, partial: Partial<TTSConfig["events"][string]>) => {
    setConfig((prev) => {
      const next = {
        ...prev,
        events: {
          ...prev.events,
          [id]: { ...prev.events[id], ...partial },
        },
      };
      saveTTSConfig(next);
      return next;
    });
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const speakPreview = (text: string) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    if (config.voiceURI) {
      const voice = window.speechSynthesis.getVoices().find((v) => v.voiceURI === config.voiceURI);
      if (voice) utter.voice = voice;
    }
    utter.volume = config.volume;
    utter.rate = config.rate;
    utter.pitch = config.pitch;
    window.speechSynthesis.speak(utter);
  };

  const reset = () => save({ ...DEFAULT_TTS_CONFIG });

  const FAKE_VARS: Record<string, Record<string, string>> = {
    gift:      { user: "João Silva", gift: "Universe", count: "3", diamonds: "15000", message: "" },
    follow:    { user: "Maria123", gift: "", count: "1", diamonds: "0", message: "" },
    subscribe: { user: "Pedro_TT", gift: "", count: "1", diamonds: "0", message: "" },
    share:     { user: "Ana Gamer", gift: "", count: "1", diamonds: "0", message: "" },
    like:      { user: "Lucas", gift: "", count: "100", diamonds: "0", message: "" },
    member:    { user: "Carlos", gift: "", count: "1", diamonds: "0", message: "" },
    chat:      { user: "Fernanda", gift: "", count: "1", diamonds: "0", message: "Vai Brasil!" },
  };

  function applyFakeVars(template: string, eventId: string): string {
    const vars = FAKE_VARS[eventId] || {};
    let result = template;
    for (const [key, val] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), val);
    }
    return result;
  }

  return (
    <div className="space-y-6">
      {/* Global TTS enable */}
      <div className="rounded-xl p-4 flex items-center justify-between gap-4"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: config.enabled ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.05)" }}>
            <Mic className={`w-4 h-4 ${config.enabled ? "text-purple-400" : "text-white/30"}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Text-to-Speech</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Leitura em voz alta dos eventos da live</p>
          </div>
        </div>
        <Switch checked={config.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
      </div>

      {/* Voice & controls */}
      <div className="rounded-xl p-4 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Configuração de Voz</p>

        <div className="space-y-1.5">
          <Label className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Voz</Label>
          <VoiceSelector voiceURI={config.voiceURI} onChange={(v) => patch({ voiceURI: v })} />
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>✓ = local · ☁ = online</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {([ 
            { label: "Volume", key: "volume" as const, min: 0, max: 1, step: 0.05, fmt: (v: number) => `${Math.round(v * 100)}%` },
            { label: "Velocidade", key: "rate" as const, min: 0.5, max: 2, step: 0.1, fmt: (v: number) => `${v.toFixed(1)}x` },
            { label: "Tom (Pitch)", key: "pitch" as const, min: 0, max: 2, step: 0.1, fmt: (v: number) => v.toFixed(1) },
          ] as const).map(({ label, key, min, max, step, fmt }) => (
            <div key={key} className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</Label>
                <span className="text-xs font-mono text-white">{fmt(config[key])}</span>
              </div>
              <Slider
                value={[config[key]]} min={min} max={max} step={step}
                onValueChange={([v]) => patch({ [key]: v })}
                className="[&_[role=slider]]:bg-purple-500 [&_[role=slider]]:border-purple-400"
              />
            </div>
          ))}
        </div>

        {/* Preview input */}
        <div className="flex gap-2">
          <Input
            ref={previewInputRef}
            placeholder="Digite um texto para testar a voz..."
            defaultValue="Olá! Bem-vindo à live. João enviou um Universe!"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
            onKeyDown={(e) => e.key === "Enter" && speakPreview((e.target as HTMLInputElement).value)}
          />
          <Button size="sm" onClick={() => speakPreview(previewInputRef.current?.value || "Teste de voz")}
            style={{ background: "#7c3aed", whiteSpace: "nowrap" }}>
            <TestTube className="w-3.5 h-3.5 mr-1.5" />Testar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => window.speechSynthesis.cancel()}>
            <VolumeX className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Per-event config */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Eventos</p>
          <button onClick={reset} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg"
            style={{ color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.04)" }}>
            <RotateCcw className="w-3 h-3" />Restaurar padrões
          </button>
        </div>

        {TTS_EVENT_TYPES.map(({ id, label }) => {
          const evCfg = config.events[id] || { enabled: false, template: "", cooldown: 0 };
          const expanded = expandedEvents.has(id);
          const preview = applyFakeVars(evCfg.template, id);

          return (
            <div key={id} className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${evCfg.enabled ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.06)"}`, background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center gap-3 p-3">
                <Switch checked={evCfg.enabled} onCheckedChange={(v) => patchEvent(id, { enabled: v })} />
                <span className="text-sm font-medium text-white flex-1">{label}</span>
                {evCfg.enabled && (
                  <button
                    onClick={() => speakPreview(preview)}
                    className="p-1.5 rounded-lg text-xs flex items-center gap-1"
                    style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}
                    title="Testar este evento">
                    <Play className="w-3 h-3" />
                  </button>
                )}
                <button onClick={() => toggleExpand(id)} className="p-1.5 rounded-lg"
                  style={{ color: "rgba(255,255,255,0.3)" }}>
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {expanded && (
                <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <div className="space-y-1.5 pt-3">
                    <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Mensagem TTS</Label>
                    <Input
                      value={evCfg.template}
                      onChange={(e) => patchEvent(id, { template: e.target.value })}
                      placeholder="Ex: {user} enviou {gift}"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontFamily: "monospace", fontSize: "13px" }}
                    />
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                      Variáveis: <code className="text-purple-400">{"{user}"}</code>{" "}
                      <code className="text-purple-400">{"{gift}"}</code>{" "}
                      <code className="text-purple-400">{"{count}"}</code>{" "}
                      <code className="text-purple-400">{"{diamonds}"}</code>{" "}
                      <code className="text-purple-400">{"{message}"}</code>
                    </p>
                    {preview && (
                      <p className="text-[11px] px-2 py-1 rounded" style={{ background: "rgba(124,58,237,0.08)", color: "rgba(167,139,250,0.8)" }}>
                        Preview: "{preview}"
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Cooldown</Label>
                      <span className="text-xs font-mono text-white">
                        {evCfg.cooldown === 0 ? "Sem limite" : `${evCfg.cooldown}s`}
                      </span>
                    </div>
                    <Slider
                      value={[evCfg.cooldown]} min={0} max={120} step={5}
                      onValueChange={([v]) => patchEvent(id, { cooldown: v })}
                      className="[&_[role=slider]]:bg-purple-500 [&_[role=slider]]:border-purple-400"
                    />
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                      Intervalo mínimo entre leituras deste evento
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {saved && (
        <p className="text-xs text-green-400 text-center">✓ Configurações salvas</p>
      )}
    </div>
  );
}

// ─── Sound Alerts Tab ────────────────────────────────────────────────────────
const SOUND_EVENT_TYPES = [
  { id: "gift",      label: "🎁 Gift" },
  { id: "follow",    label: "👤 Follow" },
  { id: "subscribe", label: "⭐ Inscrição" },
  { id: "share",     label: "🔗 Share" },
  { id: "like",      label: "❤️ Like" },
  { id: "member",    label: "🚪 Entrou" },
];

function SoundAlertRow({
  alert, onDelete, onUpdate, onPreview,
}: {
  alert: SoundAlertConfig;
  onDelete: () => void;
  onUpdate: (partial: Partial<SoundAlertConfig>) => void;
  onPreview: () => void;
}) {
  const eventLabel = SOUND_EVENT_TYPES.find((e) => e.id === alert.eventType)?.label || alert.eventType;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${alert.enabled ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)"}`, background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center gap-3 p-3">
        <Switch checked={alert.enabled} onCheckedChange={(v) => onUpdate({ enabled: v })} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{alert.name}</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            {eventLabel}{alert.minDiamonds > 0 ? ` · min. ${alert.minDiamonds} 💎` : ""}
            {alert.cooldown > 0 ? ` · ${alert.cooldown}s cooldown` : ""}
          </p>
        </div>
        {alert.audioData && (
          <button onClick={onPreview}
            className="p-1.5 rounded-lg"
            style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}
            title="Preview">
            <Play className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={() => setExpanded((v) => !v)} className="p-1.5 rounded-lg"
          style={{ color: "rgba(255,255,255,0.3)" }}>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Nome</Label>
              <Input value={alert.name} onChange={(e) => onUpdate({ name: e.target.value })}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Evento</Label>
              <select value={alert.eventType} onChange={(e) => onUpdate({ eventType: e.target.value })}
                className="w-full text-sm rounded-lg px-3 py-2"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
                {SOUND_EVENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id} style={{ background: "#1a1625" }}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Mín. Diamonds (gifts)</Label>
              <Input type="number" min={0} value={alert.minDiamonds}
                onChange={(e) => onUpdate({ minDiamonds: Number(e.target.value) || 0 })}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Cooldown (seg)</Label>
              <Input type="number" min={0} value={alert.cooldown}
                onChange={(e) => onUpdate({ cooldown: Number(e.target.value) || 0 })}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Volume</Label>
              <span className="text-xs font-mono text-white">{Math.round(alert.volume * 100)}%</span>
            </div>
            <Slider value={[alert.volume]} min={0} max={1} step={0.05}
              onValueChange={([v]) => onUpdate({ volume: v })}
              className="[&_[role=slider]]:bg-amber-500 [&_[role=slider]]:border-amber-400" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Arquivo de áudio {alert.audioData ? "✓" : "(sem arquivo)"}
            </Label>
            <AudioUploadButton
              hasFile={!!alert.audioData}
              onFile={(data, mime) => onUpdate({ audioData: data, audioMimeType: mime })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AudioUploadButton({ hasFile, onFile }: { hasFile: boolean; onFile: (data: string, mime: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      onFile(reader.result as string, file.type);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex gap-2 items-center">
      <input ref={inputRef} type="file" accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/*"
        className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
      <button
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm flex-1"
        style={{ background: hasFile ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${hasFile ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.1)"}`, color: hasFile ? "#fbbf24" : "rgba(255,255,255,0.4)" }}>
        <Upload className="w-3.5 h-3.5" />
        {hasFile ? "Trocar arquivo" : "Selecionar MP3/WAV"}
      </button>
    </div>
  );
}

function SoundAlertsTab() {
  const [alerts, setAlerts] = useState<SoundAlertConfig[]>(() => loadSoundAlerts());
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEvent, setNewEvent] = useState("gift");
  const audioCtxRef = useRef<AudioContext | null>(null);

  const save = (next: SoundAlertConfig[]) => {
    setAlerts(next);
    saveSoundAlerts(next);
  };

  const playPreview = async (alert: SoundAlertConfig) => {
    if (!alert.audioData) return;
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") await ctx.resume();
      const resp = await fetch(alert.audioData);
      const buf = await resp.arrayBuffer();
      const decoded = await ctx.decodeAudioData(buf);
      const src = ctx.createBufferSource();
      src.buffer = decoded;
      const gain = ctx.createGain();
      gain.gain.value = alert.volume;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch {}
  };

  const addAlert = () => {
    if (!newName.trim()) return;
    const next: SoundAlertConfig[] = [
      ...alerts,
      {
        id: crypto.randomUUID(),
        name: newName.trim(),
        eventType: newEvent,
        minDiamonds: 0,
        audioData: "",
        audioMimeType: "",
        volume: 0.8,
        enabled: true,
        cooldown: 0,
      },
    ];
    save(next);
    setNewName("");
    setShowNew(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-4 flex items-start gap-3"
        style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
        <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#fbbf24" }} />
        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
          Faça upload de arquivos MP3/WAV para cada evento. Os arquivos são armazenados no navegador.
          Para sons em {">"}5MB, considere comprimir antes de fazer upload.
        </p>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{alerts.length} alerta{alerts.length !== 1 ? "s" : ""} configurado{alerts.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={() => setShowNew(true)} className="gap-1.5" style={{ background: "#d97706" }}>
          <Plus className="w-3.5 h-3.5" />Novo Alerta
        </Button>
      </div>

      {showNew && (
        <div className="rounded-xl p-4 space-y-3"
          style={{ border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.05)" }}>
          <p className="text-sm font-semibold text-white">Novo Alerta Sonoro</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Nome</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Som de gift" onKeyDown={(e) => e.key === "Enter" && addAlert()}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Evento</Label>
              <select value={newEvent} onChange={(e) => setNewEvent(e.target.value)}
                className="w-full text-sm rounded-lg px-3 py-2"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
                {SOUND_EVENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id} style={{ background: "#1a1625" }}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addAlert} style={{ background: "#d97706" }}>Criar Alerta</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {alerts.length === 0 && !showNew && (
          <div className="text-center py-12" style={{ color: "rgba(255,255,255,0.25)" }}>
            <Volume2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum alerta sonoro configurado</p>
          </div>
        )}
        {alerts.map((a) => (
          <SoundAlertRow
            key={a.id}
            alert={a}
            onDelete={() => save(alerts.filter((x) => x.id !== a.id))}
            onUpdate={(partial) => save(alerts.map((x) => x.id === a.id ? { ...x, ...partial } : x))}
            onPreview={() => playPreview(a)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SoundAlerts() {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #7c3aed, #f59e0b)" }}>
          <Volume2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>FERRAMENTAS</span>
          </div>
          <h1 className="text-xl font-bold text-white">TTS &amp; Alertas Sonoros</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Voz automática e sons customizados para eventos da live. Ativo durante o Monitor.
          </p>
        </div>
      </div>

      <Tabs defaultValue="tts">
        <TabsList className="w-full grid grid-cols-2" style={{ background: "rgba(255,255,255,0.05)" }}>
          <TabsTrigger value="tts" className="gap-1.5 data-[state=active]:bg-purple-600/30 data-[state=active]:text-purple-300">
            <Mic className="w-3.5 h-3.5" />Text-to-Speech
          </TabsTrigger>
          <TabsTrigger value="sounds" className="gap-1.5 data-[state=active]:bg-amber-600/30 data-[state=active]:text-amber-300">
            <Volume2 className="w-3.5 h-3.5" />Alertas Sonoros
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tts" className="mt-6">
          <TTSTab />
        </TabsContent>
        <TabsContent value="sounds" className="mt-6">
          <SoundAlertsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
