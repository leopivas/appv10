import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare, RefreshCw, Send, Loader2, Check, X,
  Wifi, WifiOff, Clock, CheckCircle2, Users, Inbox,
  ChevronDown, ChevronUp, Search, TicketCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth, authFetch } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";

interface Ticket {
  id: string; type: string; status: string;
  userId: string; userEmail: string; userName: string;
  oldValue?: string; newValue: string;
  reason: string; customReason?: string;
  adminNote?: string; createdAt: string; resolvedAt?: string;
}
interface Message {
  id: string; ticketId: string; fromAdmin: boolean;
  authorName: string; text: string; createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente", approved: "Resolvido",
  denied: "Encerrado", cancelled: "Cancelado",
};
const STATUS_COLOR: Record<string, string> = {
  pending:   "text-amber-400 border-amber-400/30 bg-amber-400/10",
  approved:  "text-green-400 border-green-400/30 bg-green-400/10",
  denied:    "text-destructive border-destructive/30 bg-destructive/10",
  cancelled: "text-muted-foreground border-muted bg-muted/20",
};
const TYPE_LABEL: Record<string, string> = {
  general: "Suporte geral",
  tiktok_username_change: "Troca de @TikTok",
};

export default function Atendimento() {
  const { user, token } = useAuth();
  const { toast } = useToast();

  const [online, setOnline]       = useState(true);
  const [tickets, setTickets]     = useState<Ticket[]>([]);
  const [messages, setMessages]   = useState<Record<string, Message[]>>({});
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [filter, setFilter]       = useState<"pending" | "all">("pending");
  const [search, setSearch]       = useState("");
  const [chatText, setChatText]   = useState<Record<string, string>>({});
  const [chatSending, setChatSending] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState<Record<string, string>>({});
  const [acting, setActing]       = useState<string | null>(null);
  const heartbeatRef              = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef                   = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgEndRefs                = useRef<Record<string, HTMLDivElement | null>>({});

  // ── Heartbeat — marks this admin as "online" while page is open ──────────
  const sendHeartbeat = useCallback(async () => {
    if (!token) return;
    try {
      await authFetch("/support/heartbeat", token, { method: "POST" });
      setOnline(true);
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => {
    void sendHeartbeat();
    heartbeatRef.current = setInterval(() => void sendHeartbeat(), 30_000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [sendHeartbeat]);

  // ── Load all tickets ─────────────────────────────────────────────────────
  const loadTickets = useCallback(async (quiet = false) => {
    if (!token) return;
    if (!quiet) setLoading(true);
    try {
      const d = await authFetch("/admin/support/tickets", token) as { tickets: Ticket[] };
      setTickets(d.tickets ?? []);
    } catch { if (!quiet) toast({ title: "Erro ao carregar tickets", variant: "destructive" }); }
    finally { if (!quiet) setLoading(false); }
  }, [token, toast]);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  // Poll every 5s
  useEffect(() => {
    pollRef.current = setInterval(() => void loadTickets(true), 5_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadTickets]);

  // ── Load messages for a ticket ───────────────────────────────────────────
  const loadMessages = useCallback(async (ticketId: string, quiet = false) => {
    if (!token) return;
    try {
      const d = await authFetch(`/support/tickets/${ticketId}/messages`, token) as { messages: Message[] };
      setMessages((p) => ({ ...p, [ticketId]: d.messages ?? [] }));
      if (!quiet) setTimeout(() => msgEndRefs.current[ticketId]?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch { /* silent */ }
  }, [token]);

  // Poll messages when a ticket is expanded
  useEffect(() => {
    if (!expanded) return;
    const iv = setInterval(() => void loadMessages(expanded, true), 5_000);
    return () => clearInterval(iv);
  }, [expanded, loadMessages]);

  // Auto-scroll when messages update in expanded ticket
  useEffect(() => {
    if (expanded) {
      setTimeout(() => msgEndRefs.current[expanded]?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages, expanded]);

  // ── Send message ─────────────────────────────────────────────────────────
  async function sendMessage(ticketId: string) {
    const text = chatText[ticketId]?.trim();
    if (!text || chatSending) return;
    setChatSending(ticketId);
    try {
      await authFetch(`/support/tickets/${ticketId}/messages`, token, {
        method: "POST", body: JSON.stringify({ text }),
      });
      setChatText((p) => ({ ...p, [ticketId]: "" }));
      await loadMessages(ticketId, true);
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Erro", variant: "destructive" });
    } finally { setChatSending(null); }
  }

  // ── Approve / Deny ───────────────────────────────────────────────────────
  async function handleAction(ticketId: string, action: "approve" | "deny") {
    setActing(ticketId);
    try {
      await authFetch(`/admin/support/tickets/${ticketId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ action, adminNote: actionNote[ticketId]?.trim() ?? "" }),
      });
      toast({ title: action === "approve" ? "✓ Ticket resolvido" : "Ticket encerrado" });
      setExpanded(null);
      await loadTickets(true);
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Erro", variant: "destructive" });
    } finally { setActing(null); }
  }

  // ── Filtered tickets ─────────────────────────────────────────────────────
  const displayed = tickets.filter((t) => {
    if (filter === "pending" && t.status !== "pending") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.userName.toLowerCase().includes(q) ||
        t.userEmail.toLowerCase().includes(q) ||
        t.newValue.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = tickets.filter((t) => t.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-violet-400" />
            Central de Atendimento
            {pendingCount > 0 && (
              <Badge className="ml-1 bg-amber-400/20 text-amber-300 border-amber-400/30">
                {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Enquanto você está nesta página, o suporte aparece como <strong className="text-green-400">online</strong> para os usuários.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Online indicator */}
          <div className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border font-medium ${
            online ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-muted-foreground border-muted bg-muted/20"
          }`}>
            {online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {online ? "Online — usuários podem ver você" : "Offline"}
          </div>

          <Button variant="outline" size="sm" onClick={() => void loadTickets()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* ── Stats strip ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pendentes", value: tickets.filter((t) => t.status === "pending").length, color: "text-amber-400" },
          { label: "Resolvidos", value: tickets.filter((t) => t.status === "approved").length, color: "text-green-400" },
          { label: "Negados", value: tickets.filter((t) => t.status === "denied").length, color: "text-destructive" },
          { label: "Total", value: tickets.length, color: "text-violet-400" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuário ou assunto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 bg-background border-border text-sm h-9"
          />
        </div>
        <Button size="sm" variant={filter === "pending" ? "default" : "outline"}
          className={filter === "pending" ? "bg-violet-600 hover:bg-violet-700" : ""}
          onClick={() => setFilter("pending")}>
          <Inbox className="w-3.5 h-3.5 mr-1.5" />Pendentes
        </Button>
        <Button size="sm" variant={filter === "all" ? "default" : "outline"}
          className={filter === "all" ? "bg-violet-600 hover:bg-violet-700" : ""}
          onClick={() => setFilter("all")}>
          <Users className="w-3.5 h-3.5 mr-1.5" />Todos
        </Button>
      </div>

      {/* ── Ticket list ────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" /><span>Carregando…</span>
        </div>
      )}

      {!loading && displayed.length === 0 && (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <TicketCheck className="w-12 h-12 mx-auto opacity-20" />
          <p className="text-sm">
            {filter === "pending" ? "Nenhum ticket pendente 🎉" : "Nenhum ticket encontrado"}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {displayed.map((ticket) => {
          const isOpen = expanded === ticket.id;
          const msgs   = messages[ticket.id] ?? [];

          return (
            <Card key={ticket.id} className={`bg-card border-border overflow-hidden transition-all ${
              ticket.status === "pending" ? "border-amber-400/20 shadow-amber-400/5 shadow-lg" : ""
            }`}>
              {/* ── Ticket header ───────────────────────────────────── */}
              <div className="flex items-start gap-3 p-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-xs border shrink-0 ${STATUS_COLOR[ticket.status]}`}>
                      {STATUS_LABEL[ticket.status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                      {TYPE_LABEL[ticket.type] ?? ticket.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(ticket.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-white text-sm">{ticket.userName}</span>
                    <span className="text-xs text-muted-foreground">{ticket.userEmail}</span>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {ticket.type === "tiktok_username_change" ? (
                      <>
                        <span>{ticket.oldValue ? `@${ticket.oldValue}` : "sem vínculo"}</span>
                        <span className="mx-1.5">→</span>
                        <span className="text-violet-300 font-semibold">@{ticket.newValue}</span>
                      </>
                    ) : (
                      <span className="font-medium text-white">{ticket.newValue}</span>
                    )}
                  </p>

                  {ticket.customReason && (
                    <p className="text-xs text-muted-foreground italic">"{ticket.customReason}"</p>
                  )}
                  {ticket.adminNote && (
                    <p className="text-xs text-muted-foreground">Nota: {ticket.adminNote}</p>
                  )}
                </div>

                {/* ── Action buttons ──────────────────────────────── */}
                <div className="flex gap-1.5 shrink-0 items-center">
                  {ticket.status === "pending" && (
                    <>
                      <Button size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white h-8 px-2.5 text-xs gap-1"
                        disabled={acting === ticket.id}
                        onClick={() => void handleAction(ticket.id, "approve")}>
                        {acting === ticket.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">Resolver</span>
                      </Button>
                      <Button size="sm" variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10 h-8 px-2.5 text-xs gap-1"
                        disabled={acting === ticket.id}
                        onClick={() => void handleAction(ticket.id, "deny")}>
                        {acting === ticket.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">Encerrar</span>
                      </Button>
                    </>
                  )}

                  <Button size="sm" variant="ghost" className="h-8 px-2 gap-1 text-xs"
                    onClick={async () => {
                      if (isOpen) { setExpanded(null); return; }
                      setExpanded(ticket.id);
                      await loadMessages(ticket.id);
                    }}>
                    <MessageSquare className="w-3.5 h-3.5" />
                    {msgs.length > 0 && <span className="text-muted-foreground">{msgs.length}</span>}
                    {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </Button>
                </div>
              </div>

              {/* ── Expanded: note + chat ───────────────────────────── */}
              {isOpen && (
                <div className="border-t border-border bg-background/30 p-4 space-y-4">
                  {/* Admin note */}
                  {ticket.status === "pending" && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Nota de encerramento (opcional)</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Explique a decisão ao usuário…"
                          value={actionNote[ticket.id] ?? ""}
                          onChange={(e) => setActionNote((p) => ({ ...p, [ticket.id]: e.target.value }))}
                          className="flex-1 bg-background border-border text-sm h-9"
                        />
                        <Button size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white gap-1 text-xs shrink-0"
                          disabled={acting === ticket.id}
                          onClick={() => void handleAction(ticket.id, "approve")}>
                          <Check className="w-3.5 h-3.5" />Resolver com nota
                        </Button>
                        <Button size="sm" variant="outline"
                          className="text-destructive border-destructive/30 gap-1 text-xs shrink-0"
                          disabled={acting === ticket.id}
                          onClick={() => void handleAction(ticket.id, "deny")}>
                          <X className="w-3.5 h-3.5" />Encerrar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Chat */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Conversa
                      </p>
                      {ticket.resolvedAt && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          {STATUS_LABEL[ticket.status]} em {new Date(ticket.resolvedAt).toLocaleString("pt-BR")}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto rounded-lg bg-background/50 p-3 border border-border/50">
                      {msgs.length === 0 && (
                        <p className="text-xs text-muted-foreground italic text-center py-4">Sem mensagens ainda</p>
                      )}
                      {msgs.map((m) => (
                        <div key={m.id} className={`flex gap-2 ${m.fromAdmin ? "flex-row-reverse" : ""}`}>
                          <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                            m.fromAdmin
                              ? "bg-violet-600/25 border border-violet-400/20"
                              : "bg-muted/40 border border-border"
                          }`}>
                            <p className={`text-[10px] font-semibold mb-0.5 ${m.fromAdmin ? "text-violet-300" : "text-muted-foreground"}`}>
                              {m.fromAdmin ? "🛡 " : ""}{m.authorName}
                            </p>
                            <p className="leading-snug">{m.text}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 text-right">
                              {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={(el) => { msgEndRefs.current[ticket.id] = el; }} />
                    </div>

                    {/* Chat input */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Digite uma resposta…"
                        value={chatText[ticket.id] ?? ""}
                        onChange={(e) => setChatText((p) => ({ ...p, [ticket.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(ticket.id); } }}
                        className="flex-1 bg-background border-border text-sm h-9"
                        disabled={chatSending === ticket.id}
                      />
                      <Button size="sm" className="h-9 w-9 p-0"
                        onClick={() => void sendMessage(ticket.id)}
                        disabled={chatSending === ticket.id || !chatText[ticket.id]?.trim()}>
                        {chatSending === ticket.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── Footer note ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>Tickets e mensagens atualizam automaticamente a cada 5 segundos. O heartbeat de "online" é enviado a cada 30 segundos.</span>
      </div>
    </div>
  );
}
