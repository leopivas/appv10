import { useState, useEffect, useRef, useCallback } from "react";
import {
  User, Lock, Shield, Save, Loader2, CheckCircle2, CreditCard,
  ExternalLink, Crown, Zap, Users,
  AlertCircle, XCircle, Search, MessageSquare, TicketCheck,
  ChevronDown, RefreshCw, Send, Clock, CheckCircle, X,
  Globe, Copy, Check, Radio, Plus, Trash2, QrCode,
} from "lucide-react";
import { SiTiktok, SiInstagram, SiYoutube, SiWhatsapp, SiDiscord } from "react-icons/si";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, authFetch } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const PLAN_CONFIG = {
  free:  { label: "Free",  color: "text-muted-foreground", icon: Zap,   bg: "bg-muted/40 border-muted" },
  basic: { label: "Basic", color: "text-cyan-400",         icon: Shield, bg: "bg-cyan-400/10 border-cyan-400/30" },
  pro:   { label: "Pro",   color: "text-violet-400",       icon: Crown,  bg: "bg-violet-400/10 border-violet-400/30" },
};

const CHANGE_REASONS = [
  { value: "rebrand",      label: "Fiz rebranding / mudei de nome no TikTok" },
  { value: "typo",         label: "Erro de digitação no cadastro" },
  { value: "privacy",      label: "Privacidade / segurança" },
  { value: "new_account",  label: "Criei uma nova conta no TikTok" },
  { value: "other",        label: "Outro motivo…" },
];

interface TikProfile {
  exists: boolean | null;
  uniqueId: string;
  nickname?: string | null;
  profilePictureUrl?: string | null;
  followerCount?: number;
  verified?: boolean;
}

interface SupportTicket {
  id: string;
  type: string;
  status: "pending" | "approved" | "denied" | "cancelled";
  oldValue?: string;
  newValue: string;
  reason: string;
  customReason?: string;
  adminNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

interface SupportMessage {
  id: string;
  ticketId: string;
  fromAdmin: boolean;
  authorName: string;
  text: string;
  createdAt: string;
}

// ── TikTok section ─────────────────────────────────────────────────────────────
function TikTokSection() {
  const { user, token, refreshUser } = useAuth();
  const { toast } = useToast();

  // Direct change state
  const [newHandle, setNewHandle]         = useState("");
  const [tikProfile, setTikProfile]       = useState<TikProfile | null>(null);
  const [tikLooking, setTikLooking]       = useState(false);
  const [changeSaving, setChangeSaving]   = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Support/ticket state
  const [tickets, setTickets]             = useState<SupportTicket[]>([]);
  const [ticketMessages, setTicketMessages] = useState<Record<string, SupportMessage[]>>({});
  const [supportOnline, setSupportOnline] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqHandle, setReqHandle]         = useState("");
  const [reqProfile, setReqProfile]       = useState<TikProfile | null>(null);
  const [reqLooking, setReqLooking]       = useState(false);
  const [reqReason, setReqReason]         = useState("");
  const [reqCustom, setReqCustom]         = useState("");
  const [reqSending, setReqSending]       = useState(false);
  const [chatText, setChatText]           = useState<Record<string, string>>({});
  const [chatSending, setChatSending]     = useState<string | null>(null);
  const reqDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTickets = useCallback(async () => {
    if (!token) return;
    try {
      const d = await authFetch("/support/tickets", token) as { tickets: SupportTicket[] };
      setTickets(d.tickets ?? []);
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => { void fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${BASE}/api/support/online`)
      .then((r) => r.json())
      .then((d: { online: boolean }) => setSupportOnline(d.online))
      .catch(() => {/* silent */});
  }, []);

  // Debounce direct handle lookup
  useEffect(() => {
    const h = newHandle.trim().replace(/^@/, "");
    if (!h || h.length < 2) { setTikProfile(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setTikLooking(true);
      try {
        const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
        const r = await fetch(`${BASE}/api/tiktok/verify-username?uniqueId=${encodeURIComponent(h)}`);
        setTikProfile(await r.json() as TikProfile);
      } catch { setTikProfile({ exists: null, uniqueId: h }); }
      finally { setTikLooking(false); }
    }, 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [newHandle]);

  // Debounce request modal handle lookup
  useEffect(() => {
    const h = reqHandle.trim().replace(/^@/, "");
    if (!h || h.length < 2) { setReqProfile(null); return; }
    if (reqDebounce.current) clearTimeout(reqDebounce.current);
    reqDebounce.current = setTimeout(async () => {
      setReqLooking(true);
      try {
        const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
        const r = await fetch(`${BASE}/api/tiktok/verify-username?uniqueId=${encodeURIComponent(h)}`);
        setReqProfile(await r.json() as TikProfile);
      } catch { setReqProfile({ exists: null, uniqueId: h }); }
      finally { setReqLooking(false); }
    }, 700);
    return () => { if (reqDebounce.current) clearTimeout(reqDebounce.current); };
  }, [reqHandle]);

  async function handleDirectChange() {
    const handle = newHandle.trim().replace(/^@/, "");
    if (!handle) return;
    setChangeSaving(true);
    try {
      await authFetch("/auth/profile", token, {
        method: "PATCH",
        body: JSON.stringify({ tiktokUsername: handle }),
      });
      await refreshUser();
      setNewHandle("");
      setTikProfile(null);
      toast({ title: "TikTok atualizado!", description: `@${handle} vinculado com sucesso.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      // If limit exceeded, prompt to request change
      if (msg.includes("Limite") || msg.toLowerCase().includes("limit")) {
        toast({
          title: "Limite atingido",
          description: "Você atingiu o limite de alterações do seu plano. Solicite uma alteração via suporte.",
          variant: "destructive",
        });
        setShowRequestModal(true);
        setReqHandle(handle);
      } else {
        toast({ title: "Erro", description: msg, variant: "destructive" });
      }
    } finally {
      setChangeSaving(false);
    }
  }

  async function handleSubmitRequest() {
    const handle = reqHandle.trim().replace(/^@/, "");
    if (!handle || !reqReason) return;
    setReqSending(true);
    try {
      await authFetch("/support/tickets", token, {
        method: "POST",
        body: JSON.stringify({
          newTiktokUsername: handle,
          reason: reqReason,
          customReason: reqReason === "other" ? reqCustom : undefined,
        }),
      });
      await fetchTickets();
      setShowRequestModal(false);
      setReqHandle(""); setReqReason(""); setReqCustom(""); setReqProfile(null);
      toast({
        title: "Solicitação enviada!",
        description: supportOnline
          ? "O suporte está online e será notificado imediatamente."
          : "Seu ticket foi criado. Responderemos em breve.",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro ao enviar solicitação",
        variant: "destructive",
      });
    } finally {
      setReqSending(false);
    }
  }

  async function handleCancelTicket(id: string) {
    try {
      await authFetch(`/support/tickets/${id}/cancel`, token, { method: "PATCH" });
      await fetchTickets();
      toast({ title: "Ticket cancelado" });
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Erro", variant: "destructive" });
    }
  }

  async function loadMessages(ticketId: string) {
    if (ticketMessages[ticketId]) return;
    try {
      const d = await authFetch(`/support/tickets/${ticketId}/messages`, token) as { messages: SupportMessage[] };
      setTicketMessages((prev) => ({ ...prev, [ticketId]: d.messages }));
    } catch { /* silent */ }
  }

  async function sendMessage(ticketId: string) {
    const text = chatText[ticketId]?.trim();
    if (!text) return;
    setChatSending(ticketId);
    try {
      await authFetch(`/support/tickets/${ticketId}/messages`, token, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setChatText((prev) => ({ ...prev, [ticketId]: "" }));
      const d = await authFetch(`/support/tickets/${ticketId}/messages`, token) as { messages: SupportMessage[] };
      setTicketMessages((prev) => ({ ...prev, [ticketId]: d.messages }));
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Erro", variant: "destructive" });
    } finally {
      setChatSending(null);
    }
  }

  const plan = user?.plan ?? "free";
  const changesThisWeek = user?.tiktokUsernameChangesThisWeek ?? 0;

  // Plan limits (mirrors backend plans.json)
  const weekLimit: Record<string, number> = { free: 1, basic: 1, pro: -1 };
  const limit = weekLimit[plan] ?? 1;
  const canDirectChange = limit === -1 || changesThisWeek < limit;
  const pendingTicket = tickets.find((t) => t.status === "pending" && t.type === "tiktok_username_change");

  const statusColors: Record<string, string> = {
    pending:   "text-amber-400 border-amber-400/30 bg-amber-400/10",
    approved:  "text-green-400 border-green-400/30 bg-green-400/10",
    denied:    "text-destructive border-destructive/30 bg-destructive/10",
    cancelled: "text-muted-foreground border-muted bg-muted/20",
  };
  const statusLabel: Record<string, string> = {
    pending:   "Pendente",
    approved:  "Aprovado",
    denied:    "Negado",
    cancelled: "Cancelado",
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <SiTiktok className="w-4 h-4 text-[#ff004f]" />
            <CardTitle className="text-base">Conta TikTok vinculada</CardTitle>
          </div>
          <CardDescription>
            Seu usuário do TikTok é usado nas ferramentas de stream, overlays e análises.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Current linked account */}
          {user?.tiktokUsername ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
              {user.tiktokProfilePicture ? (
                <img
                  src={user.tiktokProfilePicture}
                  alt={user.tiktokDisplayName ?? user.tiktokUsername}
                  className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <SiTiktok className="w-5 h-5 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">
                  {user.tiktokDisplayName ?? user.tiktokUsername}
                  {user.hasTiktokOAuth && (
                    <Badge className="ml-2 text-[10px] bg-[#ff004f]/10 text-[#ff004f] border-[#ff004f]/30">OAuth</Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">@{user.tiktokUsername}</p>
                {user.tiktokFollowerCount !== null && user.tiktokFollowerCount !== undefined && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Users className="w-3 h-3" />
                    {user.tiktokFollowerCount.toLocaleString("pt-BR")} seguidores
                  </p>
                )}
              </div>
              {user.tiktokVerified && (
                <Badge className="shrink-0 bg-green-500/10 text-green-400 border-green-500/30 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />Verificado
                </Badge>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-dashed border-border">
              <SiTiktok className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Nenhuma conta vinculada</p>
                <p className="text-xs text-muted-foreground">Adicione seu @ do TikTok abaixo</p>
              </div>
            </div>
          )}

          {/* Limit info */}
          {limit > 0 && (
            <p className="text-xs text-muted-foreground">
              Alterações esta semana: <strong>{changesThisWeek}/{limit}</strong>
              {!canDirectChange && " — limite atingido"}
            </p>
          )}

          {/* Direct change input (if within limit) */}
          {canDirectChange && !pendingTicket && (
            <div className="space-y-2">
              <Label className="text-sm">
                {user?.tiktokUsername ? "Alterar usuário TikTok" : "Vincular usuário TikTok"}
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <Input
                    type="text"
                    placeholder="seuusuario"
                    value={newHandle}
                    onChange={(e) => setNewHandle(e.target.value.replace(/^@/, ""))}
                    className="bg-background border-border pl-7 pr-8"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {tikLooking && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                    {!tikLooking && tikProfile?.exists === true && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                    {!tikLooking && tikProfile?.exists === false && <XCircle className="w-3.5 h-3.5 text-destructive" />}
                    {!tikLooking && !tikProfile && <Search className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                </div>
                <Button
                  onClick={() => void handleDirectChange()}
                  disabled={changeSaving || tikProfile?.exists === false || !newHandle.trim()}
                  size="sm"
                >
                  {changeSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
              </div>

              {/* Profile preview */}
              {tikProfile?.exists === true && tikProfile.nickname && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/10 border border-green-500/20 text-sm">
                  {tikProfile.profilePictureUrl && (
                    <img src={tikProfile.profilePictureUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                  )}
                  <span className="font-medium">{tikProfile.nickname}</span>
                  <span className="text-muted-foreground text-xs">@{tikProfile.uniqueId}</span>
                  {tikProfile.followerCount !== undefined && tikProfile.followerCount > 0 && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {tikProfile.followerCount.toLocaleString("pt-BR")} seguidores
                    </span>
                  )}
                </div>
              )}
              {tikProfile?.exists === false && newHandle.trim().length > 1 && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Usuário @{newHandle} não encontrado
                </p>
              )}
            </div>
          )}

          {/* Limit reached — request change */}
          {!canDirectChange && !pendingTicket && (
            <div className="space-y-3 p-3 rounded-lg bg-amber-400/10 border border-amber-400/20">
              <p className="text-sm text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Você atingiu o limite de {limit} alteração(ões) por semana do seu plano {plan.toUpperCase()}.
              </p>
              <p className="text-xs text-muted-foreground">
                Faça upgrade para Pro (trocas ilimitadas) ou solicite uma alteração especial via suporte.
              </p>
              <div className="flex gap-2">
                <Link href="/pricing">
                  <Button size="sm" variant="default">Fazer upgrade</Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => setShowRequestModal(true)}>
                  <TicketCheck className="w-4 h-4 mr-1.5" />
                  Solicitar alteração
                </Button>
              </div>
            </div>
          )}

          {/* Pending ticket banner */}
          {pendingTicket && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-400/10 border border-amber-400/20">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Solicitação de alteração pendente</p>
                <p className="text-xs text-muted-foreground">
                  Para: @{pendingTicket.newValue} — aguardando aprovação do suporte
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive shrink-0"
                onClick={() => void handleCancelTicket(pendingTicket.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket history */}
      {tickets.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TicketCheck className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Histórico de solicitações</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="rounded-lg border border-border overflow-hidden">
                <div className="flex items-start gap-3 p-3 bg-background/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs border ${statusColors[t.status]}`}>
                        {statusLabel[t.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-sm mt-1">
                      {t.oldValue ? `@${t.oldValue}` : "sem vínculo"} → <strong>@{t.newValue}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {CHANGE_REASONS.find((r) => r.value === t.reason)?.label ?? t.reason}
                      {t.customReason && `: ${t.customReason}`}
                    </p>
                    {t.adminNote && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Resposta do suporte: {t.adminNote}
                      </p>
                    )}
                  </div>
                  {/* Chat toggle */}
                  {(t.status === "pending" || ticketMessages[t.id]) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-xs gap-1"
                      onClick={() => void loadMessages(t.id)}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Chat
                    </Button>
                  )}
                </div>

                {/* Chat panel */}
                {ticketMessages[t.id] !== undefined && (
                  <div className="border-t border-border p-3 space-y-2 bg-background/30">
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {ticketMessages[t.id].length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          {supportOnline
                            ? "Suporte online — envie uma mensagem!"
                            : "Sem mensagens ainda. Envie uma dúvida e responderemos em breve."}
                        </p>
                      )}
                      {ticketMessages[t.id].map((m) => (
                        <div
                          key={m.id}
                          className={`text-xs p-2 rounded-md max-w-[80%] ${
                            m.fromAdmin
                              ? "bg-primary/10 border border-primary/20 ml-0"
                              : "bg-muted/30 border border-border ml-auto text-right"
                          }`}
                        >
                          <p className="font-medium mb-0.5 text-muted-foreground">
                            {m.fromAdmin ? "Suporte" : "Você"}
                          </p>
                          {m.text}
                        </div>
                      ))}
                    </div>
                    {t.status === "pending" && (
                      <div className="flex gap-2">
                        <Input
                          value={chatText[t.id] ?? ""}
                          onChange={(e) => setChatText((p) => ({ ...p, [t.id]: e.target.value }))}
                          placeholder="Envie uma mensagem…"
                          className="text-xs h-8 bg-background"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(t.id); }
                          }}
                        />
                        <Button
                          size="sm"
                          className="h-8"
                          disabled={chatSending === t.id || !chatText[t.id]?.trim()}
                          onClick={() => void sendMessage(t.id)}
                        >
                          {chatSending === t.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Send className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Request Change Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TicketCheck className="w-5 h-5 text-primary" />
              Solicitar alteração de usuário TikTok
            </DialogTitle>
            <DialogDescription>
              {supportOnline ? (
                <span className="flex items-center gap-1.5 text-green-400">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Suporte online — responderemos em instantes!
                </span>
              ) : (
                "Suporte offline no momento. Seu ticket será respondido em breve."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Novo usuário TikTok</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input
                  type="text"
                  placeholder="seunovousuario"
                  value={reqHandle}
                  onChange={(e) => setReqHandle(e.target.value.replace(/^@/, ""))}
                  className="pl-7 pr-8 bg-background"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {reqLooking && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                  {!reqLooking && reqProfile?.exists === true && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                  {!reqLooking && reqProfile?.exists === false && <XCircle className="w-3.5 h-3.5 text-destructive" />}
                </div>
              </div>
              {reqProfile?.exists === true && reqProfile.nickname && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/10 border border-green-500/20 text-xs">
                  {reqProfile.profilePictureUrl && (
                    <img src={reqProfile.profilePictureUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                  )}
                  <span className="font-medium">{reqProfile.nickname}</span>
                  <span className="text-muted-foreground">@{reqProfile.uniqueId}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Motivo da alteração</Label>
              <div className="space-y-1.5">
                {CHANGE_REASONS.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      reqReason === r.value
                        ? "border-primary/50 bg-primary/5"
                        : "border-border bg-background hover:border-primary/30"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      reqReason === r.value ? "border-primary" : "border-muted-foreground"
                    }`}>
                      {reqReason === r.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reqReason === r.value}
                      onChange={() => setReqReason(r.value)}
                      className="sr-only"
                    />
                    <span className="text-sm">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {reqReason === "other" && (
              <div className="space-y-1.5">
                <Label className="text-sm">Descreva o motivo</Label>
                <Textarea
                  placeholder="Explique o motivo da sua solicitação…"
                  value={reqCustom}
                  onChange={(e) => setReqCustom(e.target.value)}
                  rows={3}
                  className="bg-background resize-none"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRequestModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleSubmitRequest()}
              disabled={
                reqSending ||
                !reqHandle.trim() ||
                !reqReason ||
                (reqReason === "other" && !reqCustom.trim()) ||
                reqProfile?.exists === false
              }
            >
              {reqSending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando…</>
                : supportOnline
                ? <><MessageSquare className="w-4 h-4 mr-2" />Iniciar chat</>
                : <><TicketCheck className="w-4 h-4 mr-2" />Abrir ticket</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Public profile section ────────────────────────────────────────────────────
interface SocialLinks {
  instagram?: string;
  youtube?: string;
  whatsapp?: string;
  discord?: string;
  custom?: Array<{ label: string; url: string }>;
}

interface ProfileSections {
  showStats: boolean;
  showLiveStatus: boolean;
  showTopGifts: boolean;
  showTopGifters: boolean;
  showSocialLinks: boolean;
}

const SECTION_LABELS: Record<keyof ProfileSections, string> = {
  showStats: "Estatísticas (seguidores, lives)",
  showLiveStatus: "Status ao vivo (badge + espectadores)",
  showTopGifts: "Top gifts da sessão atual",
  showTopGifters: "Ranking de top gifters",
  showSocialLinks: "Links sociais",
};

const SECTION_DEFAULTS: ProfileSections = {
  showStats: true,
  showLiveStatus: true,
  showTopGifts: true,
  showTopGifters: true,
  showSocialLinks: true,
};

interface PublicProfileSettings {
  publicProfileEnabled: boolean;
  profileBio: string | null;
  profileBanner: string | null;
  socialLinks: SocialLinks;
  profileSections: ProfileSections;
}

function PublicProfileSection() {
  const { user, token } = useAuth();
  const { toast } = useToast();

  const [enabled, setEnabled]     = useState(false);
  const [bio, setBio]             = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube]     = useState("");
  const [whatsapp, setWhatsapp]   = useState("");
  const [discord, setDiscord]     = useState("");
  const [banner, setBanner]       = useState("");
  const [sections, setSections]   = useState<ProfileSections>({ ...SECTION_DEFAULTS });
  const [custom, setCustom]       = useState<Array<{ label: string; url: string }>>([]);
  const [saving, setSaving]       = useState(false);
  const [loaded, setLoaded]       = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied]       = useState(false);
  const [showQr, setShowQr]       = useState(false);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const publicUrl = user?.tiktokUsername
    ? window.location.origin + BASE + `/s/${user.tiktokUsername}`
    : null;
  const qrUrl = publicUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=ffffff&bgcolor=0d0d1a&data=${encodeURIComponent(publicUrl)}`
    : null;

  useEffect(() => {
    if (!token || loaded) return;
    authFetch("/profile", token)
      .then((d) => {
        const p = d as PublicProfileSettings;
        setEnabled(p.publicProfileEnabled);
        setBio(p.profileBio ?? "");
        setBanner(p.profileBanner ?? "");
        setInstagram(p.socialLinks.instagram ?? "");
        setYoutube(p.socialLinks.youtube ?? "");
        setWhatsapp(p.socialLinks.whatsapp ?? "");
        setDiscord(p.socialLinks.discord ?? "");
        setCustom(p.socialLinks.custom ?? []);
        setSections(p.profileSections ?? { ...SECTION_DEFAULTS });
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [token, loaded]);

  async function handleSave() {
    setSaving(true);
    try {
      await authFetch("/profile", token, {
        method: "PATCH",
        body: JSON.stringify({
          publicProfileEnabled: enabled,
          profileBio: bio,
          profileBanner: banner,
          profileSections: sections,
          socialLinks: {
            instagram: instagram.trim() || undefined,
            youtube: youtube.trim() || undefined,
            whatsapp: whatsapp.trim() || undefined,
            discord: discord.trim() || undefined,
            custom: custom.filter((c) => c.label.trim() && c.url.trim()),
          },
        }),
      });
      toast({ title: "Perfil público salvo!", description: enabled ? "Seu perfil está visível em " + (publicUrl ?? "") : "Perfil público desativado." });
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Falha ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function copyUrl() {
    if (!publicUrl) return;
    try { await navigator.clipboard.writeText(publicUrl); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function addCustomLink() {
    if (custom.length >= 3) return;
    setCustom((prev) => [...prev, { label: "", url: "" }]);
  }

  function removeCustom(i: number) {
    setCustom((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateCustom(i: number, field: "label" | "url", value: string) {
    setCustom((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  }

  if (!loaded) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-5 flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando configurações…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Perfil Público</CardTitle>
          </div>
          <div className="flex items-center gap-2.5">
            {enabled && (
              <Radio className="w-3.5 h-3.5 text-green-400 animate-pulse" />
            )}
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>
        <CardDescription>
          Crie uma página pública com seus links e status ao vivo — ideal para colocar na bio do TikTok.
          {user?.tiktokUsername ? null : (
            <span className="text-amber-400"> Vincule seu @TikTok primeiro.</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Public URL */}
        {user?.tiktokUsername && publicUrl && (
          <div className="space-y-2">
            <Label className="text-sm">Seu link público</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background border border-border rounded-md px-3 py-2 text-primary truncate font-mono">
                {publicUrl}
              </code>
              <Button size="icon" variant="outline" className="shrink-0 border-border" onClick={() => void copyUrl()}>
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button size="icon" variant="outline" className="shrink-0 border-border" onClick={() => setShowQr((v) => !v)}>
                <QrCode className="w-4 h-4" />
              </Button>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <Button size="icon" variant="outline" className="shrink-0 border-border">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
            {showQr && qrUrl && (
              <div className="flex flex-col items-center gap-2 pt-2">
                <img src={qrUrl} alt="QR Code" className="w-40 h-40 rounded-lg border border-border" />
                <p className="text-xs text-muted-foreground">QR Code do seu perfil público</p>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Banner */}
        <div className="space-y-1.5">
          <Label className="text-sm">Banner (URL da imagem)</Label>
          <Input
            placeholder="https://exemplo.com/banner.jpg"
            value={banner}
            onChange={(e) => setBanner(e.target.value)}
            className="bg-background border-border text-sm"
          />
          <p className="text-xs text-muted-foreground">Aparece no topo do seu perfil público. Use uma imagem de 900×300px.</p>
          {banner && (
            <img
              src={banner}
              alt="Preview do banner"
              className="w-full h-20 object-cover rounded-lg border border-border"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          )}
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label className="text-sm">Bio / Apresentação</Label>
            <span className="text-xs text-muted-foreground">{bio.length}/300</span>
          </div>
          <Textarea
            placeholder="Conte um pouco sobre você e seu stream…"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 300))}
            rows={3}
            className="bg-background border-border resize-none text-sm"
          />
        </div>

        {/* Social Links */}
        <div className="space-y-3">
          <Label className="text-sm">Links sociais</Label>

          <div className="relative">
            <SiInstagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
            <Input
              placeholder="@seuinstagram ou URL completa"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="bg-background border-border pl-9 text-sm"
            />
          </div>

          <div className="relative">
            <SiYoutube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
            <Input
              placeholder="@seucanal ou URL do YouTube"
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
              className="bg-background border-border pl-9 text-sm"
            />
          </div>

          <div className="relative">
            <SiWhatsapp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
            <Input
              placeholder="+55 11 91234-5678"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="bg-background border-border pl-9 text-sm"
            />
          </div>

          <div className="relative">
            <SiDiscord className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
            <Input
              placeholder="discord.gg/seuservidor ou código do invite"
              value={discord}
              onChange={(e) => setDiscord(e.target.value)}
              className="bg-background border-border pl-9 text-sm"
            />
          </div>

          {/* Custom links */}
          {custom.map((link, i) => (
            <div key={i} className="flex gap-2">
              <Globe className="w-4 h-4 text-muted-foreground mt-2.5 shrink-0" />
              <Input
                placeholder="Título do link"
                value={link.label}
                onChange={(e) => updateCustom(i, "label", e.target.value)}
                className="bg-background border-border text-sm w-32 shrink-0"
              />
              <Input
                placeholder="https://…"
                value={link.url}
                onChange={(e) => updateCustom(i, "url", e.target.value)}
                className="bg-background border-border text-sm flex-1"
              />
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeCustom(i)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {custom.length < 3 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed border-border text-muted-foreground"
              onClick={addCustomLink}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Adicionar link personalizado
            </Button>
          )}
        </div>

        {/* Section visibility */}
        <div className="space-y-2">
          <Label className="text-sm">Seções visíveis no perfil público</Label>
          <div className="rounded-lg border border-border divide-y divide-border">
            {(Object.keys(SECTION_DEFAULTS) as Array<keyof ProfileSections>).map((key) => (
              <div key={key} className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm text-muted-foreground">{SECTION_LABELS[key]}</span>
                <Switch
                  checked={sections[key]}
                  onCheckedChange={(v) => setSections((prev) => ({ ...prev, [key]: v }))}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando…</> : <><Save className="w-4 h-4 mr-2" />Salvar perfil público</>}
          </Button>
          {user?.tiktokUsername && (
            <Button
              variant="outline"
              className="border-border text-muted-foreground"
              onClick={() => setShowPreview((v) => !v)}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {showPreview ? "Ocultar preview" : "Ver preview"}
            </Button>
          )}
        </div>

        {/* Preview card */}
        {showPreview && user?.tiktokUsername && (
          <div className="rounded-2xl border border-zinc-700 bg-[#13132a] p-4 space-y-3 text-sm">
            {banner && (
              <img
                src={banner}
                alt=""
                className="w-full h-16 object-cover rounded-xl"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div className="flex items-center gap-3">
              {user.tiktokProfilePicture ? (
                <img src={user.tiktokProfilePicture} alt="" className="w-12 h-12 rounded-full object-cover border border-violet-500/30" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                  <SiTiktok className="w-5 h-5 text-violet-400" />
                </div>
              )}
              <div>
                <p className="font-semibold text-white">{user.tiktokDisplayName ?? user.tiktokUsername}</p>
                <p className="text-xs text-zinc-400">@{user.tiktokUsername}</p>
              </div>
            </div>
            {bio && <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap">{bio}</p>}
            {(instagram || youtube || whatsapp || discord) && (
              <div className="flex flex-wrap gap-1.5">
                {instagram && <span className="px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs">Instagram</span>}
                {youtube && <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs">YouTube</span>}
                {whatsapp && <span className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs">WhatsApp</span>}
                {discord && <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs">Discord</span>}
                {custom.filter(c => c.label).map((c, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs">{c.label}</span>
                ))}
              </div>
            )}
            <div className="pt-1 border-t border-zinc-800">
              <p className="text-xs text-violet-400 font-medium">+ botão "Monitorar no Creatools"</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════════

export default function Profile() {
  const { user, token, refreshUser } = useAuth();
  const { toast } = useToast();

  const [name, setName]                   = useState(user?.name ?? "");
  const [email, setEmail]                 = useState(user?.email ?? "");
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPw, setCurrentPw]         = useState("");
  const [newPw, setNewPw]                 = useState("");
  const [confirmPw, setConfirmPw]         = useState("");
  const [pwLoading, setPwLoading]         = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await authFetch("/auth/profile", token, {
        method: "PATCH",
        body: JSON.stringify({ name, email }),
      });
      await refreshUser();
      toast({ title: "Perfil atualizado", description: "Suas alterações foram salvas." });
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Falha ao atualizar perfil", variant: "destructive" });
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { toast({ title: "Senhas não coincidem", variant: "destructive" }); return; }
    if (newPw.length < 6) { toast({ title: "Senha muito curta", description: "Mínimo de 6 caracteres.", variant: "destructive" }); return; }
    setPwLoading(true);
    try {
      await authFetch("/auth/password", token, {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      toast({ title: "Senha alterada", description: "Sua nova senha já está ativa." });
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Falha ao alterar senha", variant: "destructive" });
    } finally {
      setPwLoading(false);
    }
  }

  async function handleBillingPortal() {
    setPortalLoading(true);
    try {
      const data = await authFetch("/stripe/portal", token, { method: "POST" }) as { url: string };
      window.location.href = data.url;
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Não foi possível abrir o portal de assinatura", variant: "destructive" });
      setPortalLoading(false);
    }
  }

  const plan = user?.plan ?? "free";
  const planCfg = PLAN_CONFIG[plan];
  const PlanIcon = planCfg.icon;
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })
    : "";

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "??";

  return (
    <div className="space-y-8 max-w-2xl animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações de conta e assinatura</p>
      </div>

      {/* Account summary */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            {user?.tiktokProfilePicture ? (
              <img
                src={user.tiktokProfilePicture}
                alt={user.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-primary/20 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-xl font-bold text-primary shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg truncate">{user?.name}</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              {user?.tiktokUsername && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <SiTiktok className="w-3 h-3 text-[#ff004f]" />
                  @{user.tiktokUsername}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">Membro desde {memberSince}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge className={`text-xs font-medium border ${planCfg.bg} ${planCfg.color}`}>
                <PlanIcon className="w-3 h-3 mr-1" />
                {planCfg.label}
              </Badge>
              {user?.isAdmin && (
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                  <Shield className="w-3 h-3 mr-1" />Admin
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TikTok account section */}
      <TikTokSection />

      {/* Public profile */}
      <PublicProfileSection />

      {/* Subscription / billing */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Assinatura</CardTitle>
          </div>
          <CardDescription>Gerencie seu plano e informações de pagamento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${planCfg.bg}`}>
                <PlanIcon className={`w-5 h-5 ${planCfg.color}`} />
              </div>
              <div>
                <p className="font-medium text-sm">Plano {planCfg.label}</p>
                <p className="text-xs text-muted-foreground">
                  {plan === "free" ? "Acesso básico ao monitoramento" : plan === "basic" ? "Bulk check + viewer counts incluídos" : "Acesso total + WebSockets ilimitados"}
                </p>
              </div>
            </div>
            {plan === "free" ? (
              <Link href="/pricing">
                <Button size="sm" variant="default" className="shrink-0">Fazer upgrade</Button>
              </Link>
            ) : (
              <Button size="sm" variant="outline" onClick={handleBillingPortal} disabled={portalLoading} className="shrink-0">
                {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ExternalLink className="w-3.5 h-3.5 mr-1.5" />Gerenciar</>}
              </Button>
            )}
          </div>
          {plan === "free" && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Crown className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Faça upgrade para o plano <strong className="text-foreground">Basic</strong> e desbloqueie bulk check de múltiplos criadores com viewer counts em tempo real.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit profile */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Informações da conta</CardTitle>
          </div>
          <CardDescription>Atualize seu nome e endereço de e-mail</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Nome completo</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required className="bg-background border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-email">E-mail</Label>
              <Input id="p-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-background border-border font-mono text-sm" />
            </div>
            <Button type="submit" disabled={profileLoading}>
              {profileLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando…</> : <><Save className="w-4 h-4 mr-2" />Salvar alterações</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Alterar senha</CardTitle>
          </div>
          <CardDescription>
            {user?.hasTiktokOAuth
              ? "Sua conta foi criada via TikTok. Defina uma senha para também acessar via e-mail."
              : "Digite sua senha atual para definir uma nova"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {!user?.hasTiktokOAuth && (
              <div className="space-y-1.5">
                <Label htmlFor="curr-pw">Senha atual</Label>
                <Input id="curr-pw" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required autoComplete="current-password" className="bg-background border-border" />
              </div>
            )}
            <Separator />
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">Nova senha</Label>
              <Input id="new-pw" type="password" placeholder="Mínimo 6 caracteres" value={newPw} onChange={(e) => setNewPw(e.target.value)} required autoComplete="new-password" className="bg-background border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw">Confirmar nova senha</Label>
              <Input id="confirm-pw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required autoComplete="new-password" className={`bg-background border-border ${confirmPw && confirmPw !== newPw ? "border-destructive" : ""}`} />
              {confirmPw && confirmPw !== newPw && <p className="text-xs text-destructive">Senhas não coincidem</p>}
            </div>
            <Button type="submit" disabled={pwLoading} variant="outline">
              {pwLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Atualizando…</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Atualizar senha</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
