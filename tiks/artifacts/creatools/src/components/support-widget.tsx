import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare, X, Send, Loader2, ChevronDown, TicketCheck,
  Wifi, WifiOff, CheckCircle2, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth, authFetch } from "@/context/auth-context";

interface SupportTicket {
  id: string; type: string; status: string;
  newValue: string; reason: string; createdAt: string; adminNote?: string;
}
interface SupportMessage {
  id: string; ticketId: string; fromAdmin: boolean; authorName: string;
  text: string; createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Em atendimento", approved: "Resolvido",
  denied: "Encerrado", cancelled: "Cancelado",
};

export default function SupportWidget() {
  const { user, token } = useAuth();
  const [open, setOpen]           = useState(false);
  const [online, setOnline]       = useState(false);
  const [ticket, setTicket]       = useState<SupportTicket | null>(null);
  const [messages, setMessages]   = useState<SupportMessage[]>([]);
  const [loadingInit, setLoadingInit] = useState(false);
  const [unread, setUnread]       = useState(0);
  const lastMsgCount              = useRef(0);

  // Offline ticket form
  const [mode, setMode]           = useState<"chat" | "new_ticket">("chat");
  const [subject, setSubject]     = useState("");
  const [firstMsg, setFirstMsg]   = useState("");
  const [sending, setSending]     = useState(false);

  // Live chat
  const [chatText, setChatText]   = useState("");
  const [chatSending, setChatSending] = useState(false);
  const messagesEndRef            = useRef<HTMLDivElement>(null);
  const pollRef                   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Check online status ──────────────────────────────────────────────────
  const checkOnline = useCallback(async () => {
    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const d = await fetch(`${BASE}/api/support/online`).then((r) => r.json()) as { online: boolean };
      setOnline(d.online);
    } catch { /* silent */ }
  }, []);

  // ── Load user tickets ────────────────────────────────────────────────────
  const loadTickets = useCallback(async (quiet = false) => {
    if (!token) return;
    if (!quiet) setLoadingInit(true);
    try {
      const d = await authFetch("/support/tickets", token) as { tickets: SupportTicket[]; messages: SupportMessage[] };
      const general = (d.tickets ?? [])
        .filter((t) => t.type === "general" && t.status === "pending")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
      setTicket(general);
      if (general) {
        const msgs = (d.messages ?? []).filter((m) => m.ticketId === general.id);
        setMessages(msgs);
        if (quiet) {
          const newCount = msgs.length;
          if (newCount > lastMsgCount.current) {
            if (!open) setUnread((u) => u + (newCount - lastMsgCount.current));
          }
          lastMsgCount.current = newCount;
        } else {
          lastMsgCount.current = msgs.length;
        }
      } else {
        setMessages([]);
      }
    } catch { /* silent */ }
    finally { if (!quiet) setLoadingInit(false); }
  }, [token, open]);

  // ── On open ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setUnread(0);
      void checkOnline();
      void loadTickets();
    }
  }, [open, checkOnline, loadTickets]);

  // ── Polling (5s) when open ───────────────────────────────────────────────
  useEffect(() => {
    if (open && token) {
      pollRef.current = setInterval(() => {
        void checkOnline();
        void loadTickets(true);
      }, 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [open, token, checkOnline, loadTickets]);

  // ── Background poll for unread (30s) ─────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const bg = setInterval(() => { void loadTickets(true); }, 30000);
    return () => clearInterval(bg);
  }, [token, loadTickets]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // ── Send message ─────────────────────────────────────────────────────────
  async function sendMessage() {
    if (!chatText.trim() || !ticket || chatSending) return;
    const text = chatText.trim();
    setChatText("");
    setChatSending(true);
    try {
      await authFetch(`/support/tickets/${ticket.id}/messages`, token, {
        method: "POST", body: JSON.stringify({ text }),
      });
      await loadTickets(true);
    } catch { /* silent */ }
    finally { setChatSending(false); }
  }

  // ── Create ticket (new chat or offline) ──────────────────────────────────
  async function createTicket() {
    if (!subject.trim() || sending) return;
    setSending(true);
    try {
      const d = await authFetch("/support/tickets", token, {
        method: "POST",
        body: JSON.stringify({ type: "general", subject: subject.trim(), message: firstMsg.trim() || undefined }),
      }) as { ticket: SupportTicket };
      setTicket(d.ticket);
      setMessages(firstMsg.trim() ? [{
        id: "tmp", ticketId: d.ticket.id, fromAdmin: false,
        authorName: user?.name ?? "Você", text: firstMsg.trim(),
        createdAt: new Date().toISOString(),
      }] : []);
      lastMsgCount.current = firstMsg.trim() ? 1 : 0;
      setSubject(""); setFirstMsg(""); setMode("chat");
      void loadTickets(true);
    } catch { /* silent */ }
    finally { setSending(false); }
  }

  // ── Start new chat (online mode) ─────────────────────────────────────────
  async function startChat() {
    if (!firstMsg.trim() || sending) return;
    const text = firstMsg.trim();
    setSending(true);
    try {
      const d = await authFetch("/support/tickets", token, {
        method: "POST",
        body: JSON.stringify({ type: "general", subject: "Chat de suporte", message: text }),
      }) as { ticket: SupportTicket };
      setTicket(d.ticket);
      setMessages([{
        id: "tmp", ticketId: d.ticket.id, fromAdmin: false,
        authorName: user?.name ?? "Você", text,
        createdAt: new Date().toISOString(),
      }]);
      lastMsgCount.current = 1;
      setFirstMsg("");
      void loadTickets(true);
    } catch { /* silent */ }
    finally { setSending(false); }
  }

  if (!user || !token) return null;

  return (
    <>
      {/* ── Panel ─────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-20 right-4 z-50 w-[340px] max-h-[520px] flex flex-col rounded-2xl border border-border shadow-2xl overflow-hidden"
          style={{ background: "rgba(12,10,24,0.97)", backdropFilter: "blur(16px)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0"
            style={{ background: "rgba(139,92,246,0.12)" }}>
            <div className="flex-1 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-violet-400" />
              <span className="font-semibold text-sm text-white">Suporte</span>
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${online ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-muted-foreground border-muted bg-muted/20"}`}>
                {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {online ? "Online" : "Offline"}
              </span>
            </div>
            {ticket && (
              <Badge className={`text-xs border ${ticket.status === "pending" ? "text-amber-400 border-amber-400/30 bg-amber-400/10" : "text-muted-foreground border-muted bg-muted/20"}`}>
                {STATUS_LABEL[ticket.status] ?? ticket.status}
              </Badge>
            )}
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-white transition-colors ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {loadingInit ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* ── Active ticket chat ────────────────────────────────── */}
              {ticket && (
                <>
                  <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
                    {/* Topic */}
                    <div className="text-xs text-muted-foreground text-center pb-1">
                      Assunto: <span className="text-white font-medium">{ticket.newValue}</span>
                    </div>

                    {messages.map((m, i) => (
                      <div key={m.id ?? i} className={`flex gap-1.5 ${m.fromAdmin ? "" : "flex-row-reverse"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                          m.fromAdmin
                            ? "bg-violet-600/20 border border-violet-400/20"
                            : "bg-background border border-border"
                        }`}>
                          {m.fromAdmin && <p className="text-[10px] font-semibold text-violet-300 mb-0.5">🛡 {m.authorName}</p>}
                          <p>{m.text}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 text-right">
                            {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}

                    {ticket.adminNote && (
                      <div className="text-xs text-center text-muted-foreground italic mt-2">
                        Nota do suporte: {ticket.adminNote}
                      </div>
                    )}
                    {ticket.status !== "pending" && (
                      <div className="text-xs text-center mt-3 text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-green-400" />
                        Ticket {STATUS_LABEL[ticket.status]?.toLowerCase()}
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {ticket.status === "pending" && (
                    <div className="px-3 pb-3 pt-2 border-t border-border shrink-0">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Digite uma mensagem…"
                          value={chatText}
                          onChange={(e) => setChatText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
                          className="flex-1 bg-background border-border text-sm h-9"
                          disabled={chatSending}
                          autoFocus
                        />
                        <Button size="sm" onClick={() => void sendMessage()} disabled={chatSending || !chatText.trim()} className="h-9 w-9 p-0">
                          {chatSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                      </div>
                      <button
                        onClick={() => { setTicket(null); setMessages([]); setMode("chat"); }}
                        className="mt-2 text-xs text-muted-foreground hover:text-white transition-colors"
                      >
                        + Abrir novo ticket
                      </button>
                    </div>
                  )}

                  {ticket.status !== "pending" && (
                    <div className="px-3 pb-3 pt-2 border-t border-border shrink-0">
                      <Button size="sm" className="w-full text-xs" onClick={() => { setTicket(null); setMessages([]); setMode("chat"); }}>
                        Abrir novo ticket
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* ── No active ticket ─────────────────────────────────── */}
              {!ticket && (
                <div className="flex-1 overflow-y-auto">
                  {/* Online: quick chat */}
                  {online && mode === "chat" && (
                    <div className="p-4 space-y-3">
                      <div className="text-center space-y-1 py-3">
                        <div className="w-12 h-12 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center mx-auto">
                          <MessageSquare className="w-5 h-5 text-green-400" />
                        </div>
                        <p className="text-sm font-semibold text-white">Suporte online!</p>
                        <p className="text-xs text-muted-foreground">Envie sua mensagem e responderemos em instantes.</p>
                      </div>
                      <Textarea
                        placeholder="Como podemos te ajudar?"
                        value={firstMsg}
                        onChange={(e) => setFirstMsg(e.target.value)}
                        className="bg-background border-border text-sm resize-none h-24"
                        autoFocus
                      />
                      <Button className="w-full" disabled={!firstMsg.trim() || sending} onClick={() => void startChat()}>
                        {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                        Iniciar conversa
                      </Button>
                      <button onClick={() => setMode("new_ticket")} className="w-full text-xs text-muted-foreground hover:text-white transition-colors text-center">
                        Prefere enviar um ticket formal?
                      </button>
                    </div>
                  )}

                  {/* Offline: ticket form */}
                  {(!online || mode === "new_ticket") && (
                    <div className="p-4 space-y-3">
                      <div className="text-center space-y-1 py-2">
                        <div className="w-12 h-12 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto">
                          {online ? <TicketCheck className="w-5 h-5 text-amber-400" /> : <Clock className="w-5 h-5 text-amber-400" />}
                        </div>
                        <p className="text-sm font-semibold text-white">
                          {online ? "Enviar ticket" : "Suporte offline"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {online ? "Descreva seu problema e responderemos por aqui." : "Nenhum atendente disponível agora. Envie um ticket e responderemos assim que possível."}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Assunto</Label>
                        <Input
                          placeholder="Ex: Problema com overlay, dúvida sobre plano…"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="bg-background border-border text-sm h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Mensagem</Label>
                        <Textarea
                          placeholder="Descreva o problema com detalhes…"
                          value={firstMsg}
                          onChange={(e) => setFirstMsg(e.target.value)}
                          className="bg-background border-border text-sm resize-none h-24"
                        />
                      </div>
                      <Button className="w-full" disabled={!subject.trim() || sending} onClick={() => void createTicket()}>
                        {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TicketCheck className="w-4 h-4 mr-2" />}
                        Enviar ticket
                      </Button>
                      {online && (
                        <button onClick={() => setMode("chat")} className="w-full text-xs text-muted-foreground hover:text-white transition-colors text-center">
                          ← Voltar ao chat
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Floating button ──────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-50 w-13 h-13 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{
          width: 52, height: 52,
          background: open ? "rgba(139,92,246,0.9)" : "rgba(139,92,246,0.85)",
          boxShadow: "0 4px 24px rgba(139,92,246,0.4)",
        }}
        title="Suporte"
      >
        {open ? (
          <ChevronDown className="w-5 h-5 text-white" />
        ) : (
          <div className="relative">
            <MessageSquare className="w-5 h-5 text-white" />
            {unread > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </div>
        )}
      </button>
    </>
  );
}
