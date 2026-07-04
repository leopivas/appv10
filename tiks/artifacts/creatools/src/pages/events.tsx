import { useState, useRef, useCallback, useEffect } from "react";
import {
  Zap, Plus, Trash2, ChevronDown, ChevronUp, Download, Upload,
  GripVertical, Edit2, X, Check, Copy, Settings2, Bell,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth-context";
import { authFetch } from "@/context/auth-context";
import type { EventRule, RuleAction, TriggerType, ActionType } from "@/hooks/use-events-engine";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Trigger definitions ───────────────────────────────────────────────────────

interface TriggerDef {
  id: TriggerType;
  label: string;
  icon: string;
  description: string;
  filters?: FilterDef[];
}

interface FilterDef {
  key: string;
  label: string;
  type: "number" | "text" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

const TRIGGER_DEFS: TriggerDef[] = [
  {
    id: "any_gift",
    label: "Qualquer Gift",
    icon: "🎁",
    description: "Qualquer gift recebido na live",
    filters: [],
  },
  {
    id: "gift_min_coins",
    label: "Gift acima de N coins",
    icon: "💎",
    description: "Gift com valor mínimo de diamonds",
    filters: [
      { key: "minCoins", label: "Mínimo de diamonds", type: "number", placeholder: "100" },
    ],
  },
  {
    id: "gift_specific",
    label: "Gift específico",
    icon: "🎀",
    description: "Um gift com nome específico",
    filters: [
      { key: "giftName", label: "Nome do gift", type: "text", placeholder: "Rose" },
    ],
  },
  {
    id: "follow",
    label: "Follow",
    icon: "👤",
    description: "Novo seguidor na live",
    filters: [],
  },
  {
    id: "like_count",
    label: "N Likes acumulados",
    icon: "❤️",
    description: "Burst de likes acima de N",
    filters: [
      { key: "likeCount", label: "Mínimo de likes", type: "number", placeholder: "10" },
    ],
  },
  {
    id: "share",
    label: "Share",
    icon: "🔗",
    description: "Live compartilhada",
    filters: [],
  },
  {
    id: "subscribe",
    label: "Subscribe",
    icon: "⭐",
    description: "Nova inscrição na live",
    filters: [],
  },
  {
    id: "chat_word",
    label: "Palavra no chat",
    icon: "💬",
    description: "Palavra-chave detectada no chat",
    filters: [
      { key: "word", label: "Palavra ou frase", type: "text", placeholder: "olá" },
    ],
  },
  {
    id: "viewer_count",
    label: "Número de espectadores",
    icon: "👥",
    description: "Threshold de espectadores atingido",
    filters: [
      { key: "count", label: "Número de espectadores", type: "number", placeholder: "1000" },
      {
        key: "direction", label: "Direção", type: "select",
        options: [{ value: "above", label: "Acima de" }, { value: "below", label: "Abaixo de" }],
      },
    ],
  },
  {
    id: "top_gifter_changed",
    label: "Top gifter mudou",
    icon: "👑",
    description: "Mudança no ranking de gifters",
    filters: [],
  },
  {
    id: "first_chat",
    label: "Primeiro chat do usuário",
    icon: "🆕",
    description: "Primeira mensagem de um usuário na sessão",
    filters: [],
  },
  {
    id: "member_join",
    label: "Entrou na live",
    icon: "🚪",
    description: "Usuário entrou na live",
    filters: [],
  },
];

// ── Action definitions ─────────────────────────────────────────────────────────

interface ActionDef {
  id: ActionType;
  label: string;
  icon: string;
  description: string;
  fields: ActionFieldDef[];
}

interface ActionFieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "url" | "color" | "textarea" | "select";
  placeholder?: string;
  defaultValue?: string | number;
  options?: { value: string; label: string }[];
  help?: string;
}

const ACTION_DEFS: ActionDef[] = [
  {
    id: "play_sound",
    label: "Tocar Som",
    icon: "🔊",
    description: "Reproduz um arquivo de áudio via URL",
    fields: [
      { key: "audioUrl", label: "URL do áudio", type: "url", placeholder: "https://..." },
      { key: "volume", label: "Volume (0-1)", type: "number", placeholder: "0.8", defaultValue: 0.8 },
    ],
  },
  {
    id: "tts",
    label: "TTS (texto para voz)",
    icon: "🗣️",
    description: "Lê um texto em voz usando template",
    fields: [
      {
        key: "template", label: "Template", type: "text",
        placeholder: "{user} enviou {gift}",
        defaultValue: "{user} acionou um evento",
        help: "Vars: {user} {gift} {diamonds} {count} {message}",
      },
      { key: "volume", label: "Volume", type: "number", placeholder: "0.8", defaultValue: 0.8 },
      { key: "rate", label: "Velocidade", type: "number", placeholder: "1.0", defaultValue: 1.0 },
      { key: "pitch", label: "Tom", type: "number", placeholder: "1.0", defaultValue: 1.0 },
    ],
  },
  {
    id: "overlay_alert",
    label: "Alerta de Overlay",
    icon: "🔔",
    description: "Mostra alerta visual na tela do Monitor",
    fields: [
      { key: "title", label: "Título", type: "text", placeholder: "Gift recebido!", defaultValue: "{user} enviou {gift}!" },
      { key: "message", label: "Mensagem", type: "text", placeholder: "Obrigado pelo suporte!", defaultValue: "💎 {diamonds} diamonds" },
      { key: "icon", label: "Ícone/Emoji", type: "text", placeholder: "🎁", defaultValue: "🎁" },
      { key: "color", label: "Cor", type: "color", defaultValue: "#a855f7" },
      { key: "duration", label: "Duração (ms)", type: "number", placeholder: "4000", defaultValue: 4000 },
    ],
  },
  {
    id: "overlay_color",
    label: "Mudar cor do Overlay",
    icon: "🎨",
    description: "Muda a cor de destaque do Monitor",
    fields: [
      { key: "color", label: "Nova cor", type: "color", defaultValue: "#a855f7" },
    ],
  },
  {
    id: "display_message",
    label: "Exibir Mensagem",
    icon: "📢",
    description: "Mostra mensagem customizada temporária",
    fields: [
      { key: "message", label: "Mensagem", type: "text", placeholder: "{user} chegou!", defaultValue: "{user} chegou!" },
      { key: "duration", label: "Duração (ms)", type: "number", placeholder: "4000", defaultValue: 4000 },
    ],
  },
  {
    id: "http_webhook",
    label: "Webhook HTTP",
    icon: "🌐",
    description: "Envia POST para uma URL com payload do evento",
    fields: [
      { key: "url", label: "URL do Webhook", type: "url", placeholder: "https://..." },
      {
        key: "body", label: "Body (JSON template)", type: "textarea",
        placeholder: '{"user":"{user}","gift":"{gift}"}',
        defaultValue: '{"user":"{user}","event":"{event}","gift":"{gift}","diamonds":{diamonds}}',
        help: "Vars: {user} {gift} {diamonds} {count} {message}",
      },
    ],
  },
  {
    id: "discord_webhook",
    label: "Discord Webhook",
    icon: "💬",
    description: "Envia embed para um canal do Discord",
    fields: [
      { key: "webhookUrl", label: "URL do Webhook Discord", type: "url", placeholder: "https://discord.com/api/webhooks/..." },
      { key: "title", label: "Título do Embed", type: "text", placeholder: "🎁 Gift na live!", defaultValue: "🎁 {user} enviou {gift}!" },
      { key: "description", label: "Descrição", type: "text", placeholder: "💎 {diamonds} diamonds", defaultValue: "💎 {diamonds} diamonds" },
      { key: "embedColor", label: "Cor do Embed (hex)", type: "text", placeholder: "0xa855f7", defaultValue: "0xa855f7" },
    ],
  },
  {
    id: "delay",
    label: "Aguardar",
    icon: "⏱️",
    description: "Pausa antes da próxima ação",
    fields: [
      { key: "seconds", label: "Segundos", type: "number", placeholder: "2", defaultValue: 2 },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function defaultFilters(triggerType: TriggerType): Record<string, unknown> {
  const def = TRIGGER_DEFS.find((t) => t.id === triggerType);
  if (!def?.filters) return {};
  const out: Record<string, unknown> = {};
  for (const f of def.filters) {
    if (f.type === "number") out[f.key] = "";
    else if (f.type === "select") out[f.key] = f.options?.[0]?.value ?? "";
    else out[f.key] = "";
  }
  return out;
}

function defaultActionParams(actionType: ActionType): Record<string, unknown> {
  const def = ACTION_DEFS.find((a) => a.id === actionType);
  if (!def) return {};
  const out: Record<string, unknown> = {};
  for (const f of def.fields) {
    out[f.key] = f.defaultValue ?? "";
  }
  return out;
}

function newRule(): Omit<EventRule, "id" | "userId" | "createdAt" | "updatedAt"> {
  return {
    name: "",
    enabled: true,
    triggerType: "any_gift",
    triggerFilters: {},
    actions: [],
    cooldownSeconds: 0,
  };
}

// ── Action card (inside rule editor) ─────────────────────────────────────────

function ActionCard({
  action,
  onChange,
  onDelete,
}: {
  action: RuleAction;
  onChange: (updated: RuleAction) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const def = ACTION_DEFS.find((a) => a.id === action.type);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: action.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        border: isDragging ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(255,255,255,0.08)",
        background: isDragging ? "rgba(124,58,237,0.1)" : "rgba(255,255,255,0.02)",
      }}
      className="rounded-lg overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded cursor-grab active:cursor-grabbing hover:bg-white/10 touch-none"
          style={{ color: "rgba(255,255,255,0.3)" }}
          title="Arrastar para reordenar"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="text-base">{def?.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white">{def?.label ?? action.type}</p>
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{def?.description}</p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-1.5 rounded hover:bg-white/5"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-500/10 text-red-400">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && def && (
        <div
          className="px-3 pb-3 space-y-2.5 border-t"
          style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >
          {def.fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
                {field.label}
                {field.help && (
                  <span className="ml-1 font-normal" style={{ color: "rgba(255,255,255,0.3)" }}>
                    — {field.help}
                  </span>
                )}
              </Label>
              {field.type === "textarea" ? (
                <textarea
                  value={String(action.params[field.key] ?? "")}
                  onChange={(e) =>
                    onChange({ ...action, params: { ...action.params, [field.key]: e.target.value } })
                  }
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full text-xs rounded-lg px-3 py-2 resize-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    fontFamily: "monospace",
                    outline: "none",
                  }}
                />
              ) : field.type === "color" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={String(action.params[field.key] ?? "#a855f7")}
                    onChange={(e) =>
                      onChange({ ...action, params: { ...action.params, [field.key]: e.target.value } })
                    }
                    className="w-8 h-8 rounded cursor-pointer border-0"
                    style={{ background: "none" }}
                  />
                  <Input
                    value={String(action.params[field.key] ?? "#a855f7")}
                    onChange={(e) =>
                      onChange({ ...action, params: { ...action.params, [field.key]: e.target.value } })
                    }
                    placeholder="#a855f7"
                    className="flex-1 text-xs font-mono h-8"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
                  />
                </div>
              ) : field.type === "select" ? (
                <select
                  value={String(action.params[field.key] ?? "")}
                  onChange={(e) =>
                    onChange({ ...action, params: { ...action.params, [field.key]: e.target.value } })
                  }
                  className="w-full text-xs rounded-lg px-3 py-2"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
                >
                  {field.options?.map((o) => (
                    <option key={o.value} value={o.value} style={{ background: "#1a1625" }}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <Input
                  type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
                  value={String(action.params[field.key] ?? "")}
                  onChange={(e) =>
                    onChange({
                      ...action,
                      params: {
                        ...action.params,
                        [field.key]: field.type === "number" ? e.target.value : e.target.value,
                      },
                    })
                  }
                  placeholder={field.placeholder}
                  className="text-xs h-8"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Rule Editor Modal ─────────────────────────────────────────────────────────

function RuleEditor({
  rule,
  onSave,
  onCancel,
  saving,
}: {
  rule: Partial<EventRule>;
  onSave: (rule: Partial<EventRule>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<Partial<EventRule>>({
    name: "",
    enabled: true,
    triggerType: "any_gift",
    triggerFilters: {},
    actions: [],
    cooldownSeconds: 0,
    ...rule,
  });

  const triggerDef = TRIGGER_DEFS.find((t) => t.id === draft.triggerType);

  function updateActions(actions: RuleAction[]) {
    setDraft((d) => ({ ...d, actions }));
  }

  function addAction(type: ActionType) {
    const action: RuleAction = { id: makeid(), type, params: defaultActionParams(type) };
    setDraft((d) => ({ ...d, actions: [...(d.actions ?? []), action] }));
  }

  function updateAction(id: string, updated: RuleAction) {
    setDraft((d) => ({ ...d, actions: (d.actions ?? []).map((a) => a.id === id ? updated : a) }));
  }

  function deleteAction(id: string) {
    setDraft((d) => ({ ...d, actions: (d.actions ?? []).filter((a) => a.id !== id) }));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraft((d) => {
      const actions = d.actions ?? [];
      const oldIndex = actions.findIndex((a) => a.id === active.id);
      const newIndex = actions.findIndex((a) => a.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return d;
      return { ...d, actions: arrayMove(actions, oldIndex, newIndex) };
    });
  }

  function setTriggerType(type: TriggerType) {
    setDraft((d) => ({ ...d, triggerType: type, triggerFilters: defaultFilters(type) }));
  }

  function setFilter(key: string, value: unknown) {
    setDraft((d) => ({ ...d, triggerFilters: { ...(d.triggerFilters ?? {}), [key]: value } }));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "#1a1625", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <h2 className="text-base font-semibold text-white">
            {rule.id ? "Editar Regra" : "Nova Regra"}
          </h2>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: "rgba(255,255,255,0.5)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Name + enabled */}
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Nome da regra</Label>
              <Input
                value={draft.name ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Ex: Alerta de gift rosa"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
              />
            </div>
            <div className="space-y-1.5 text-center">
              <Label className="text-xs block" style={{ color: "rgba(255,255,255,0.4)" }}>Ativa</Label>
              <Switch
                checked={draft.enabled}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, enabled: v }))}
              />
            </div>
          </div>

          {/* Trigger */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
              🎯 Trigger (quando disparar)
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {TRIGGER_DEFS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTriggerType(t.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors"
                  style={{
                    background: draft.triggerType === t.id ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${draft.triggerType === t.id ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.07)"}`,
                    color: draft.triggerType === t.id ? "#c4b5fd" : "rgba(255,255,255,0.6)",
                  }}
                >
                  <span className="text-base shrink-0">{t.icon}</span>
                  <span className="text-[11px] font-medium leading-tight">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Trigger filters */}
            {triggerDef && triggerDef.filters && triggerDef.filters.length > 0 && (
              <div
                className="rounded-xl p-3 space-y-2.5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Filtros do trigger
                </p>
                {triggerDef.filters.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{f.label}</Label>
                    {f.type === "select" ? (
                      <select
                        value={String(draft.triggerFilters?.[f.key] ?? f.options?.[0]?.value ?? "")}
                        onChange={(e) => setFilter(f.key, e.target.value)}
                        className="w-full text-sm rounded-lg px-3 py-2"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
                      >
                        {f.options?.map((o) => (
                          <option key={o.value} value={o.value} style={{ background: "#1a1625" }}>{o.label}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        type={f.type === "number" ? "number" : "text"}
                        value={String(draft.triggerFilters?.[f.key] ?? "")}
                        onChange={(e) => setFilter(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)}
                        placeholder={f.placeholder}
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cooldown */}
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              ⏱️ Cooldown global (segundos) — 0 = sem cooldown
            </Label>
            <Input
              type="number"
              min={0}
              value={draft.cooldownSeconds ?? 0}
              onChange={(e) => setDraft((d) => ({ ...d, cooldownSeconds: Number(e.target.value) }))}
              className="w-32"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
            />
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
              ⚡ Ações (executadas em sequência)
            </Label>

            {(draft.actions ?? []).length === 0 && (
              <div
                className="rounded-xl p-4 text-center"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}
              >
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Nenhuma ação adicionada. Adicione pelo menos uma ação abaixo.
                </p>
              </div>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={(draft.actions ?? []).map((a) => a.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {(draft.actions ?? []).map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      onChange={(updated) => updateAction(action.id, updated)}
                      onDelete={() => deleteAction(action.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add action */}
            <div
              className="rounded-xl p-3 space-y-2"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                Adicionar ação
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {ACTION_DEFS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => addAction(a.id)}
                    className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
                    style={{ border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}
                  >
                    <span className="text-lg">{a.icon}</span>
                    <span className="text-[10px] font-medium text-center leading-tight">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-5 py-3 border-t"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button
            size="sm"
            disabled={!draft.name?.trim() || saving}
            onClick={() => onSave(draft)}
            style={{ background: "#7c3aed" }}
          >
            {saving ? "Salvando…" : rule.id ? "Salvar" : "Criar Regra"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Rule List Card ─────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  onEdit,
  onDelete,
  onToggle,
}: {
  rule: EventRule;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const triggerDef = TRIGGER_DEFS.find((t) => t.id === rule.triggerType);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
      style={{
        background: rule.enabled ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
        border: `1px solid ${rule.enabled ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}`,
      }}
    >
      <span className="text-xl">{triggerDef?.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{rule.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(124,58,237,0.15)", color: "#c4b5fd" }}
          >
            {triggerDef?.label}
          </span>
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>→</span>
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            {rule.actions.length} ação{rule.actions.length !== 1 ? "ões" : ""}
          </span>
          {rule.cooldownSeconds > 0 && (
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              · {rule.cooldownSeconds}s cooldown
            </span>
          )}
        </div>
      </div>
      <Switch checked={rule.enabled} onCheckedChange={onToggle} />
      <button
        onClick={onEdit}
        className="p-1.5 rounded-lg hover:bg-white/10"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        <Edit2 className="w-3.5 h-3.5" />
      </button>
      <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Events() {
  const { token } = useAuth();
  const [rules, setRules] = useState<EventRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorRule, setEditorRule] = useState<Partial<EventRule> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load rules from API
  const loadRules = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await authFetch("/events/rules", token) as { rules: EventRule[] };
      setRules(data.rules ?? []);
    } catch {
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadRules(); }, [loadRules]);

  // Save / create rule
  async function saveRule(draft: Partial<EventRule>) {
    if (!token) return;
    setSaving(true);
    try {
      if (draft.id) {
        const updated = await authFetch(`/events/rules/${draft.id}`, token, {
          method: "PUT",
          body: JSON.stringify(draft),
        }) as EventRule;
        setRules((prev) => prev.map((r) => r.id === updated.id ? updated : r));
      } else {
        const created = await authFetch("/events/rules", token, {
          method: "POST",
          body: JSON.stringify(draft),
        }) as EventRule;
        setRules((prev) => [...prev, created]);
      }
      setEditorRule(null);
    } catch {}
    setSaving(false);
  }

  // Toggle
  async function toggleRule(id: string) {
    if (!token) return;
    try {
      const updated = await authFetch(`/events/rules/${id}/toggle`, token, {
        method: "PATCH",
      }) as EventRule;
      setRules((prev) => prev.map((r) => r.id === id ? updated : r));
    } catch {}
  }

  // Delete
  async function deleteRule(id: string) {
    if (!token) return;
    try {
      await authFetch(`/events/rules/${id}`, token, { method: "DELETE" });
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch {}
  }

  // Export
  function exportRules() {
    const json = JSON.stringify({ rules: rules.map(({ id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, ...rest }) => rest) }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `creatools-rules-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import
  async function importRules(e: React.ChangeEvent<HTMLInputElement>) {
    if (!token) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as { rules?: unknown[] };
      const rulesData = Array.isArray(data) ? data : (data.rules ?? []);
      const result = await authFetch("/events/rules/import", token, {
        method: "POST",
        body: JSON.stringify({ rules: rulesData }),
      }) as { imported: number };
      await loadRules();
      alert(`${result.imported} regras importadas com sucesso!`);
    } catch {
      alert("Erro ao importar. Verifique o formato do arquivo JSON.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #a855f7, #3b82f6)" }}
        >
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}
            >
              ENGINE
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-0.5">Ações & Eventos</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Automação no-code: configure triggers e ações executadas em tempo real na live.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={exportRules}
            disabled={rules.length === 0}
            className="gap-1.5"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            <Download className="w-3.5 h-3.5" /> Exportar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            <Upload className="w-3.5 h-3.5" /> Importar
          </Button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={importRules} />
        </div>
      </div>

      {/* Stats bar */}
      {rules.length > 0 && (
        <div
          className="flex items-center gap-4 px-4 py-3 rounded-xl"
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-white font-medium">{enabledCount} ativa{enabledCount !== 1 ? "s" : ""}</span>
          </div>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            {rules.length} regra{rules.length !== 1 ? "s" : ""} no total
          </span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            Ativas durante o Monitor em tempo real
          </span>
        </div>
      )}

      <Tabs defaultValue="rules">
        <TabsList style={{ background: "rgba(255,255,255,0.05)" }}>
          <TabsTrigger value="rules">⚡ Regras ({rules.length})</TabsTrigger>
          <TabsTrigger value="guide">📖 Guia de Triggers & Ações</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-3 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              {loading ? "Carregando…" : rules.length === 0 ? "Nenhuma regra configurada ainda." : ""}
            </p>
            <Button
              size="sm"
              onClick={() => setEditorRule(newRule())}
              className="gap-1.5"
              style={{ background: "#7c3aed" }}
            >
              <Plus className="w-3.5 h-3.5" /> Nova Regra
            </Button>
          </div>

          {!loading && rules.length === 0 && (
            <div
              className="rounded-xl p-8 text-center"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}
            >
              <p className="text-3xl mb-3">⚡</p>
              <p className="text-sm font-medium text-white mb-1">Nenhuma regra ainda</p>
              <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                Crie sua primeira regra para automatizar ações durante a live
              </p>
              <Button size="sm" onClick={() => setEditorRule(newRule())} style={{ background: "#7c3aed" }}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Criar primeira regra
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {rules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onEdit={() => setEditorRule(rule)}
                onDelete={() => deleteRule(rule.id)}
                onToggle={() => toggleRule(rule.id)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="guide" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Triggers guide */}
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
                🎯 Triggers disponíveis ({TRIGGER_DEFS.length})
              </p>
              {TRIGGER_DEFS.map((t) => (
                <div key={t.id} className="flex items-start gap-2">
                  <span className="text-base shrink-0 mt-0.5">{t.icon}</span>
                  <div>
                    <p className="text-xs font-medium text-white">{t.label}</p>
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{t.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions guide */}
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
                ⚡ Ações disponíveis ({ACTION_DEFS.length})
              </p>
              {ACTION_DEFS.map((a) => (
                <div key={a.id} className="flex items-start gap-2">
                  <span className="text-base shrink-0 mt-0.5">{a.icon}</span>
                  <div>
                    <p className="text-xs font-medium text-white">{a.label}</p>
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl p-4 space-y-2"
            style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}
          >
            <p className="text-xs font-semibold text-purple-300">💡 Como funciona</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              As regras são avaliadas em tempo real enquanto você monitora uma live na página Monitor.
              Quando um evento do WebSocket corresponde ao trigger de uma regra, todas as ações são executadas em sequência.
              O cooldown evita spam — configure para 0 se quiser sem limite.
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              <strong className="text-purple-300">Templates:</strong> use <code className="bg-white/10 px-1 rounded">{`{user}`}</code>,{" "}
              <code className="bg-white/10 px-1 rounded">{`{gift}`}</code>,{" "}
              <code className="bg-white/10 px-1 rounded">{`{diamonds}`}</code>,{" "}
              <code className="bg-white/10 px-1 rounded">{`{count}`}</code>,{" "}
              <code className="bg-white/10 px-1 rounded">{`{message}`}</code>{" "}
              nas ações de TTS, alerta e webhook.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Rule Editor Modal */}
      {editorRule !== null && (
        <RuleEditor
          rule={editorRule}
          onSave={saveRule}
          onCancel={() => setEditorRule(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
