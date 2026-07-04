import { useRef, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RuleAction {
  id: string;
  type:
    | "play_sound"
    | "tts"
    | "overlay_alert"
    | "overlay_color"
    | "display_message"
    | "http_webhook"
    | "discord_webhook"
    | "delay";
  params: Record<string, unknown>;
}

export interface EventRule {
  id: string;
  userId?: string;
  name: string;
  enabled: boolean;
  triggerType: TriggerType;
  triggerFilters: Record<string, unknown>;
  actions: RuleAction[];
  cooldownSeconds: number;
  createdAt?: string;
  updatedAt?: string;
}

export type TriggerType =
  | "any_gift"
  | "gift_min_coins"
  | "gift_specific"
  | "follow"
  | "like_count"
  | "share"
  | "subscribe"
  | "chat_word"
  | "viewer_count"
  | "top_gifter_changed"
  | "first_chat"
  | "member_join";

export type ActionType = RuleAction["type"];

export interface LiveEventCtx {
  event: string;
  user?: { nickname?: string; uniqueId?: string };
  comment?: string;
  giftName?: string;
  giftImageUrl?: string;
  diamondCount?: number;
  repeatCount?: number;
  likeCount?: number;
  viewerCount?: number | null;
}

// ── Trigger evaluation ─────────────────────────────────────────────────────────

function evaluateTrigger(
  rule: EventRule,
  ctx: LiveEventCtx,
  firstChatSeen: Set<string>,
): boolean {
  const f = rule.triggerFilters;
  switch (rule.triggerType) {
    case "any_gift":
      return ctx.event === "gift" || ctx.event === "unauthedGift";

    case "gift_min_coins": {
      if (ctx.event !== "gift" && ctx.event !== "unauthedGift") return false;
      const min = Number(f.minCoins ?? 0);
      return (ctx.diamondCount ?? 0) >= min;
    }

    case "gift_specific": {
      if (ctx.event !== "gift" && ctx.event !== "unauthedGift") return false;
      const name = String(f.giftName ?? "").toLowerCase().trim();
      return name !== "" && (ctx.giftName ?? "").toLowerCase() === name;
    }

    case "follow":
      return ctx.event === "follow";

    case "like_count": {
      if (ctx.event !== "like") return false;
      const threshold = Number(f.likeCount ?? 1);
      return (ctx.likeCount ?? 1) >= threshold;
    }

    case "share":
      return ctx.event === "share";

    case "subscribe":
      return ctx.event === "subscribe";

    case "chat_word": {
      if (ctx.event !== "chat") return false;
      const word = String(f.word ?? "").toLowerCase().trim();
      return word !== "" && (ctx.comment ?? "").toLowerCase().includes(word);
    }

    case "viewer_count": {
      if (ctx.event !== "roomUserSeq") return false;
      const threshold = Number(f.count ?? 0);
      const dir = String(f.direction ?? "above");
      if (dir === "above") return (ctx.viewerCount ?? 0) >= threshold;
      return (ctx.viewerCount ?? 0) <= threshold;
    }

    case "top_gifter_changed":
      return ctx.event === "rankUpdate" || ctx.event === "hourlyRankUpdate";

    case "first_chat": {
      if (ctx.event !== "chat") return false;
      const uid = ctx.user?.uniqueId ?? ctx.user?.nickname ?? "";
      if (!uid || firstChatSeen.has(uid)) return false;
      firstChatSeen.add(uid);
      return true;
    }

    case "member_join":
      return ctx.event === "member";

    default:
      return false;
  }
}

// ── Template substitution ──────────────────────────────────────────────────────

function applyTemplate(template: string, ctx: LiveEventCtx): string {
  const vars: Record<string, string> = {
    user: ctx.user?.nickname ?? ctx.user?.uniqueId ?? "alguém",
    gift: ctx.giftName ?? "gift",
    diamonds: String(ctx.diamondCount ?? 0),
    count: String(ctx.repeatCount ?? 1),
    message: ctx.comment ?? "",
  };
  let result = template;
  for (const [k, v] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  }
  return result;
}

// ── Alert state ────────────────────────────────────────────────────────────────

export interface OverlayAlertState {
  id: string;
  title: string;
  message: string;
  color: string;
  icon: string;
  duration: number;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export interface EventsEngineOptions {
  onOverlayAlert?: (alert: OverlayAlertState) => void;
  onOverlayColor?: (color: string) => void;
  onDisplayMessage?: (msg: string, duration: number) => void;
  audioCtxRef?: React.MutableRefObject<AudioContext | null>;
}

export function useEventsEngine(options: EventsEngineOptions = {}) {
  const rulesRef = useRef<EventRule[]>([]);
  const cooldownsRef = useRef<Record<string, number>>({});
  const firstChatSeenRef = useRef<Set<string>>(new Set());

  const setRules = useCallback((rules: EventRule[]) => {
    rulesRef.current = rules;
  }, []);

  const resetSession = useCallback(() => {
    cooldownsRef.current = {};
    firstChatSeenRef.current = new Set();
  }, []);

  const executeAction = useCallback(
    async (action: RuleAction, ctx: LiveEventCtx): Promise<void> => {
      const p = action.params;
      switch (action.type) {
        case "play_sound": {
          const url = String(p.audioUrl ?? "");
          if (!url) break;
          try {
            const audioEl = new Audio(url);
            audioEl.volume = Math.max(0, Math.min(1, Number(p.volume ?? 0.8)));
            await audioEl.play();
          } catch {}
          break;
        }

        case "tts": {
          const template = String(p.template ?? "{user} acionou um evento");
          const text = applyTemplate(template, ctx);
          if (!text.trim()) break;
          const utter = new SpeechSynthesisUtterance(text);
          const voiceURI = String(p.voiceURI ?? "");
          if (voiceURI) {
            const voices = window.speechSynthesis.getVoices();
            const voice = voices.find((v) => v.voiceURI === voiceURI);
            if (voice) utter.voice = voice;
          }
          utter.volume = Math.max(0, Math.min(1, Number(p.volume ?? 0.8)));
          utter.rate = Math.max(0.1, Math.min(10, Number(p.rate ?? 1)));
          utter.pitch = Math.max(0, Math.min(2, Number(p.pitch ?? 1)));
          window.speechSynthesis.speak(utter);
          break;
        }

        case "overlay_alert": {
          const alert: OverlayAlertState = {
            id: `alert_${Date.now()}`,
            title: applyTemplate(String(p.title ?? "Evento!"), ctx),
            message: applyTemplate(String(p.message ?? ""), ctx),
            color: String(p.color ?? "#a855f7"),
            icon: String(p.icon ?? "🔔"),
            duration: Number(p.duration ?? 4000),
          };
          options.onOverlayAlert?.(alert);
          break;
        }

        case "overlay_color": {
          const color = String(p.color ?? "#a855f7");
          options.onOverlayColor?.(color);
          break;
        }

        case "display_message": {
          const msg = applyTemplate(String(p.message ?? ""), ctx);
          const duration = Number(p.duration ?? 4000);
          options.onDisplayMessage?.(msg, duration);
          break;
        }

        case "http_webhook": {
          const url = String(p.url ?? "");
          if (!url) break;
          const bodyTemplate = String(p.body ?? "{}");
          const bodyStr = applyTemplate(bodyTemplate, ctx);
          let bodyData: unknown;
          try { bodyData = JSON.parse(bodyStr); }
          catch { bodyData = { text: bodyStr }; }
          try {
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
              ...(p.headers as Record<string, string> ?? {}),
            };
            await fetch(url, {
              method: "POST",
              headers,
              body: JSON.stringify(bodyData),
            });
          } catch {}
          break;
        }

        case "discord_webhook": {
          const url = String(p.webhookUrl ?? "");
          if (!url) break;
          const title = applyTemplate(String(p.title ?? "Evento na live!"), ctx);
          const description = applyTemplate(String(p.description ?? ""), ctx);
          const color = parseInt(String(p.embedColor ?? "0xa855f7").replace(/^0x|^#/, ""), 16);
          const embed: Record<string, unknown> = {
            title,
            description: description || undefined,
            color: isNaN(color) ? 0xa855f7 : color,
            timestamp: new Date().toISOString(),
            footer: { text: "Creatools • TikTok LIVE" },
          };
          if (ctx.giftImageUrl) {
            embed.thumbnail = { url: ctx.giftImageUrl };
          }
          const payload = { embeds: [embed] };
          try {
            await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          } catch {}
          break;
        }

        case "delay": {
          const secs = Math.max(0, Math.min(60, Number(p.seconds ?? 1)));
          await new Promise<void>((r) => setTimeout(r, secs * 1000));
          break;
        }
      }
    },
    [options],
  );

  const handleEvent = useCallback(
    async (ctx: LiveEventCtx): Promise<void> => {
      const rules = rulesRef.current;
      if (!rules.length) return;
      const now = Date.now();
      for (const rule of rules) {
        if (!rule.enabled) continue;
        if (!evaluateTrigger(rule, ctx, firstChatSeenRef.current)) continue;
        if (rule.cooldownSeconds > 0) {
          const last = cooldownsRef.current[rule.id] ?? 0;
          if (now - last < rule.cooldownSeconds * 1000) continue;
        }
        cooldownsRef.current[rule.id] = now;
        for (const action of rule.actions) {
          await executeAction(action, ctx);
        }
      }
    },
    [executeAction],
  );

  return { setRules, handleEvent, resetSession, rulesRef };
}
