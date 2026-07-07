import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, Loader2, Bot, User as UserIcon, Zap, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const SUGGESTIONS = [
  "Sugira 5 títulos virais para minha próxima live de gaming",
  "Como aumentar meus gifts durante a live?",
  "Escreva uma descrição de perfil chamativa para meu TikTok",
  "Quais overlays do Creatools combinam com stream de música?",
  "Ideias de minigames para engajar viewers novos",
];

function newSessionId() {
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AiAssistant() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem("ai_session_id");
    if (stored) return stored;
    const id = newSessionId();
    localStorage.setItem("ai_session_id", id);
    return id;
  });
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [usage, setUsage] = useState<{ used_today: number; limit: number; unlimited: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadUsage = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/ai/chat/usage`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setUsage(await r.json());
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { void loadUsage(); }, [loadUsage]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    setInput("");
    setSending(true);

    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content };
    const asstMsg: Msg = { id: `a-${Date.now()}`, role: "assistant", content: "", streaming: true };
    setMessages((m) => [...m, userMsg, asstMsg]);

    try {
      const res = await fetch(`${BASE}/api/ai/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: content,
          history: messages.filter(m => !m.streaming).slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
        throw new Error(err.detail || "Falha na requisição");
      }

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.replace(/^data:\s*/, "").trim();
          if (!line) continue;
          try {
            const ev = JSON.parse(line);
            if (ev.delta) {
              setMessages((m) => m.map(msg => msg.id === asstMsg.id ? { ...msg, content: msg.content + ev.delta } : msg));
            }
            if (ev.done) break;
            if (ev.error) throw new Error(ev.error);
          } catch { /* skip malformed */ }
        }
      }

      setMessages((m) => m.map(msg => msg.id === asstMsg.id ? { ...msg, streaming: false } : msg));
      void loadUsage();
    } catch (e: any) {
      setMessages((m) => m.filter(msg => msg.id !== asstMsg.id));
      toast({ title: "Erro no assistente", description: e.message || "Tente novamente", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setMessages([]);
    const id = newSessionId();
    localStorage.setItem("ai_session_id", id);
    window.location.reload();
  }

  const daily = usage?.limit ?? 0;
  const used = usage?.used_today ?? 0;
  const unlimited = usage?.unlimited ?? false;
  const blocked = !unlimited && daily > 0 && used >= daily;

  return (
    <div className="space-y-4" data-testid="ai-assistant-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-violet-400" />
            Assistente I.A.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Claude Sonnet 4.5 — conselheiro de crescimento para streamers TikTok
          </p>
        </div>
        <div className="flex items-center gap-2">
          {usage && (
            <Badge variant={blocked ? "destructive" : "outline"} className="font-mono">
              {unlimited ? "∞ ilimitado" : `${used} / ${daily === 0 ? "0" : daily}/dia`}
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={reset} data-testid="ai-reset-btn">
            <Trash2 className="w-4 h-4 mr-2" />Nova conversa
          </Button>
        </div>
      </div>

      <Card className="flex flex-col h-[70vh] overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(124,58,237,0.2)" }}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}>
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold">Olá, {user?.name?.split(" ")[0] ?? "streamer"}!</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Sou seu copiloto para crescer no TikTok Live. Pergunte qualquer coisa sobre estratégia, overlays, gifts ou engajamento.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    disabled={blocked}
                    className="text-left text-xs px-3 py-2.5 rounded-lg transition-all hover:scale-[1.02]"
                    style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", color: "rgba(255,255,255,0.7)" }}
                    data-testid="ai-suggestion-btn"
                  >
                    <Zap className="w-3 h-3 inline mr-1.5 text-violet-400" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`ai-msg-${m.role}`}>
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}>
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${m.role === "user" ? "bg-violet-600 text-white" : "bg-white/5 text-white/90"}`}>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {m.content}
                    {m.streaming && <span className="inline-block ml-1 w-2 h-4 bg-violet-400 animate-pulse align-middle" />}
                  </div>
                </div>
                {m.role === "user" && (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <UserIcon className="w-4 h-4 text-white/50" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-white/5">
          {blocked && (
            <div className="mb-2 text-xs text-orange-400 flex items-center gap-2">
              <Zap className="w-3 h-3" />
              Limite diário atingido. <a href="/pricing" className="underline">Faça upgrade</a> para continuar.
            </div>
          )}
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
              placeholder={blocked ? "Limite atingido — faça upgrade para continuar" : "Pergunte qualquer coisa sobre sua stream…"}
              disabled={sending || blocked}
              className="resize-none min-h-[52px] max-h-32"
              data-testid="ai-chat-input"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={sending || !input.trim() || blocked}
              className="h-[52px] px-4"
              data-testid="ai-send-btn"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-white/30 mt-2">
            Powered by Claude Sonnet 4.5 · Session ID: <span className="font-mono">{sessionId.slice(-8)}</span>
          </p>
        </div>
      </Card>
    </div>
  );
}
