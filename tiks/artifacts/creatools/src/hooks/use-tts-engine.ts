import { useRef, useCallback } from "react";

export interface TTSEventConfig {
  enabled: boolean;
  template: string;
  cooldown: number;
}

export interface TTSConfig {
  enabled: boolean;
  voiceURI: string;
  volume: number;
  rate: number;
  pitch: number;
  events: Record<string, TTSEventConfig>;
}

export const TTS_EVENT_TYPES = [
  { id: "gift",      label: "🎁 Gift",      defaultTemplate: "{user} enviou {gift}" },
  { id: "follow",    label: "👤 Follow",    defaultTemplate: "{user} seguiu" },
  { id: "subscribe", label: "⭐ Sub",       defaultTemplate: "{user} se inscreveu" },
  { id: "share",     label: "🔗 Share",     defaultTemplate: "{user} compartilhou" },
  { id: "like",      label: "❤️ Like",      defaultTemplate: "{user} curtiu" },
  { id: "member",    label: "🚪 Entrou",    defaultTemplate: "{user} entrou na live" },
  { id: "chat",      label: "💬 Chat",      defaultTemplate: "{user} disse: {message}" },
];

export const DEFAULT_TTS_CONFIG: TTSConfig = {
  enabled: false,
  voiceURI: "",
  volume: 0.8,
  rate: 1.0,
  pitch: 1.0,
  events: Object.fromEntries(
    TTS_EVENT_TYPES.map(({ id, defaultTemplate }) => [
      id,
      {
        enabled: id === "gift" || id === "follow" || id === "subscribe",
        template: defaultTemplate,
        cooldown: id === "like" ? 60 : id === "member" ? 10 : 0,
      } satisfies TTSEventConfig,
    ])
  ),
};

const LS_KEY = "creatools_tts_config";

export function loadTTSConfig(): TTSConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_TTS_CONFIG;
    const parsed = JSON.parse(raw) as Partial<TTSConfig>;
    return {
      ...DEFAULT_TTS_CONFIG,
      ...parsed,
      events: {
        ...DEFAULT_TTS_CONFIG.events,
        ...(parsed.events || {}),
      },
    };
  } catch {
    return DEFAULT_TTS_CONFIG;
  }
}

export function saveTTSConfig(config: TTSConfig): void {
  localStorage.setItem(LS_KEY, JSON.stringify(config));
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), val);
  }
  return result;
}

export function useTTSEngine() {
  const queueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);
  const configRef = useRef<TTSConfig>(loadTTSConfig());
  const cooldownsRef = useRef<Record<string, number>>({});

  const reloadConfig = useCallback(() => {
    configRef.current = loadTTSConfig();
  }, []);

  const processQueue = useCallback(() => {
    if (speakingRef.current || queueRef.current.length === 0) return;
    const text = queueRef.current.shift()!;
    speakingRef.current = true;
    const utter = new SpeechSynthesisUtterance(text);
    const cfg = configRef.current;
    if (cfg.voiceURI) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find((v) => v.voiceURI === cfg.voiceURI);
      if (voice) utter.voice = voice;
    }
    utter.volume = cfg.volume;
    utter.rate = cfg.rate;
    utter.pitch = cfg.pitch;
    const done = () => {
      speakingRef.current = false;
      processQueue();
    };
    utter.onend = done;
    utter.onerror = done;
    window.speechSynthesis.speak(utter);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      queueRef.current.push(text);
      processQueue();
    },
    [processQueue]
  );

  const handleEvent = useCallback(
    (eventType: string, vars: Record<string, string>) => {
      const cfg = configRef.current;
      if (!cfg.enabled) return;
      const evCfg = cfg.events[eventType];
      if (!evCfg?.enabled) return;
      const now = Date.now();
      const last = cooldownsRef.current[eventType] ?? 0;
      if (evCfg.cooldown > 0 && now - last < evCfg.cooldown * 1000) return;
      cooldownsRef.current[eventType] = now;
      const text = applyTemplate(evCfg.template, vars);
      speak(text);
    },
    [speak]
  );

  const speakPreview = useCallback(
    (text: string) => {
      window.speechSynthesis.cancel();
      queueRef.current = [];
      speakingRef.current = false;
      speak(text);
    },
    [speak]
  );

  const stopAll = useCallback(() => {
    window.speechSynthesis.cancel();
    queueRef.current = [];
    speakingRef.current = false;
  }, []);

  return { handleEvent, reloadConfig, stopAll, speakPreview, configRef };
}
