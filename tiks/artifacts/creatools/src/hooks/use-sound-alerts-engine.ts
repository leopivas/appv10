import { useRef, useCallback } from "react";

export interface SoundAlertConfig {
  id: string;
  name: string;
  eventType: string;
  minDiamonds: number;
  audioData: string;
  audioMimeType: string;
  volume: number;
  enabled: boolean;
  cooldown: number;
}

const LS_KEY = "creatools_sound_alerts_v2";

export function loadSoundAlerts(): SoundAlertConfig[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]") as SoundAlertConfig[];
  } catch {
    return [];
  }
}

export function saveSoundAlerts(alerts: SoundAlertConfig[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(alerts));
}

export function useSoundAlertsEngine() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const cooldownsRef = useRef<Record<string, number>>({});
  const alertsRef = useRef<SoundAlertConfig[]>(loadSoundAlerts());

  const reloadAlerts = useCallback(() => {
    alertsRef.current = loadSoundAlerts();
  }, []);

  const getCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const playAudioData = useCallback(
    async (audioData: string, volume: number): Promise<void> => {
      const ctx = getCtx();
      if (ctx.state === "suspended") await ctx.resume();
      const resp = await fetch(audioData);
      const buf = await resp.arrayBuffer();
      const decoded = await ctx.decodeAudioData(buf);
      const src = ctx.createBufferSource();
      src.buffer = decoded;
      const gain = ctx.createGain();
      gain.gain.value = Math.max(0, Math.min(1, volume));
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    },
    [getCtx]
  );

  const handleEvent = useCallback(
    (eventType: string, diamonds = 0) => {
      const now = Date.now();
      for (const alert of alertsRef.current) {
        if (!alert.enabled || !alert.audioData) continue;
        if (alert.eventType !== eventType) continue;
        if (alert.minDiamonds > 0 && diamonds < alert.minDiamonds) continue;
        const last = cooldownsRef.current[alert.id] ?? 0;
        if (alert.cooldown > 0 && now - last < alert.cooldown * 1000) continue;
        cooldownsRef.current[alert.id] = now;
        playAudioData(alert.audioData, alert.volume).catch(() => {});
      }
    },
    [playAudioData]
  );

  return { handleEvent, reloadAlerts, playAudioData, alertsRef };
}
