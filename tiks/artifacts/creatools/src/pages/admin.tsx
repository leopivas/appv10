import { useState, useEffect, useCallback, useRef } from "react";
import {
  Shield, Trash2, RefreshCw, UserCog, Crown, Zap, Users2, Search,
  Settings2, CreditCard, Radio, CheckCircle2, XCircle, Loader2, KeyRound, Eye, EyeOff,
  Plus, Edit2, Palette, Layout, ChevronUp, ChevronDown, ToggleLeft, ToggleRight,
  Star, Save, RotateCcw, Globe, Lock,
  Server, Activity, AlertTriangle, MessageSquare, Check, X, Clock,
  Cpu, HardDrive, Key, PlugZap, Megaphone, Pin, Info, Sparkles,
  BookOpen, Building2, Users, Bell, BarChart2, LayoutDashboard,
  AlertCircle, Wrench, ChevronRight, FileText, Image, ExternalLink, UserPlus, Pencil,
  Database, RefreshCcw, Monitor, Trophy, Gamepad2, Heart, Tv2, Code2, Home, Link2,
  Tag, Layers, Mic, Video, Wifi, Package, Award, Hash, GripVertical, Diamond,
} from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth, authFetch, type AuthUser } from "@/context/auth-context";
import { useUIConfig, type NavSectionConfig, type NavItemConfig, type CenterButton, type FeaturedSlide } from "@/context/ui-config-context";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Role {
  id: string; name: string; description: string; color: string;
  permissions: string[]; createdAt: string;
}
interface Plan {
  id: string; order?: number; name: string; description: string; price: number;
  currency: string; billingPeriod: string; permissions: string[];
  tiktokUsernameChangesPerWeek: number; maxConcurrentWs: number; maxApiCallsPerWindow: number;
  maxLiveHoursPerMonth: number; maxLiveAnalyses: number; maxWebhooks: number;
  features: string[]; color: string; isActive: boolean;
}
interface PermissionDef { id: string; label: string; category: string; }
interface StripeConfig {
  secretKeySet: boolean; webhookSecretSet: boolean; publishableKey: string | null;
  priceIdBasic: string | null; priceIdPro: string | null; tiktoolsKeySet: boolean; paymentsEnabled: boolean;
}
interface Announcement {
  id: string; title: string; body: string;
  type: "info" | "warning" | "success" | "new" | "update";
  pinned: boolean; createdAt: number; emoji?: string; imageUrl?: string;
}
interface Ticket {
  id: string; type: string; userId: string; userName: string; userEmail: string;
  status: "pending" | "approved" | "denied" | "cancelled";
  oldValue?: string; newValue?: string; reason: string; customReason?: string;
  adminNote?: string; createdAt: string; resolvedAt?: string;
}
interface SystemStatus {
  checks: Record<string, { ok: boolean; message: string; latencyMs?: number }>;
  server: { nodeVersion: string; platform: string; uptime: number; memoryMb: number; freeMemMb: number; cpus: number };
  config: { tiktoolsKeySet: boolean; tiktoolsKeyMasked: string | null; stripeKeySet: boolean; jwtSecretIsDefault: boolean };
  users: { total: number; admins: number; byPlan: Record<string, number> };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const PLAN_COLORS: Record<string, string> = {
  free: "bg-muted/40 text-muted-foreground border-muted",
  basic: "bg-cyan-400/10 text-cyan-400 border-cyan-400/30",
  pro: "bg-violet-400/10 text-violet-400 border-violet-400/30",
};
const PLAN_LABEL: Record<string, string> = { free: "Gratuito", basic: "Basic", pro: "PRO" };
const PRESET_COLORS = [
  { label: "Cyan",   hsl: "180 100% 50%" }, { label: "Pink",   hsl: "333 99% 52%" },
  { label: "Violet", hsl: "270 80% 60%" }, { label: "Green",  hsl: "142 71% 45%" },
  { label: "Orange", hsl: "28 99% 54%" },  { label: "Blue",   hsl: "221 83% 53%" },
  { label: "Red",    hsl: "0 84% 60%" },   { label: "Yellow", hsl: "48 97% 52%" },
];
const ANN_TYPES: Array<{ value: Announcement["type"]; label: string; color: string }> = [
  { value: "info",    label: "Info",      color: "#60a5fa" },
  { value: "new",     label: "Novo",      color: "#a78bfa" },
  { value: "update",  label: "Update",    color: "#22d3ee" },
  { value: "success", label: "Sucesso",   color: "#22c55e" },
  { value: "warning", label: "Aviso",     color: "#f97316" },
];

function limitLabel(v: number, unit = ""): string {
  if (v === -1) return "Ilimitado";
  if (v === 0) return "Bloqueado";
  return `${v}${unit}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => { const k = key(item); (acc[k] = acc[k] || []).push(item); return acc; }, {} as Record<string, T[]>);
}

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ResultBadge({ r }: { r: { ok: boolean; message: string } }) {
  return (
    <div className={`flex items-center gap-2 text-sm p-2 rounded-md ${r.ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
      {r.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
      {r.message}
    </div>
  );
}

function PermissionCheckboxGroup({ allPermissions, selected, onChange }: {
  allPermissions: PermissionDef[]; selected: string[]; onChange: (p: string[]) => void;
}) {
  const groups = groupBy(allPermissions, (p) => p.category);
  const toggle = (id: string) => selected.includes(id) ? onChange(selected.filter((x) => x !== id)) : onChange([...selected, id]);
  const toggleAll = (ids: string[], checked: boolean) => checked ? onChange([...new Set([...selected, ...ids])]) : onChange(selected.filter((x) => !ids.includes(x)));
  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([cat, perms]) => {
        const allSel = perms.every((p) => selected.includes(p.id));
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox checked={allSel} onCheckedChange={(v) => toggleAll(perms.map((p) => p.id), !!v)} />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat}</p>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pl-6">
              {perms.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <Checkbox id={`perm-${p.id}`} checked={selected.includes(p.id)} onCheckedChange={() => toggle(p.id)} />
                  <label htmlFor={`perm-${p.id}`} className="text-sm cursor-pointer">{p.label}</label>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: VISÃO GERAL
// ════════════════════════════════════════════════════════════════════════════
function VisaoGeralSection() {
  const { token } = useAuth();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/admin/system-status", token!).then((d) => setStatus(d as SystemStatus)).finally(() => setLoading(false));
  }, [token]);

  const planOrder = ["free", "basic", "pro"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Visão Geral</h2>
        <p className="text-sm text-muted-foreground">Estatísticas e status do sistema em tempo real.</p>
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-400" /></div>
      ) : status ? (
        <>
          {/* User stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total de Usuários", value: status.users.total, color: "#a78bfa", icon: Users2 },
              { label: "Admins",            value: status.users.admins, color: "#f97316", icon: Shield },
              { label: "Plano Gratuito",    value: status.users.byPlan["free"] ?? 0, color: "#9ca3af", icon: Users },
              { label: "Plano PRO",         value: status.users.byPlan["pro"] ?? 0,  color: "#ec4899", icon: Crown },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/8 p-4" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
                <p className="text-3xl font-bold text-white">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Plan distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Distribuição de Planos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {planOrder.map((planId) => {
                  const count = status.users.byPlan[planId] ?? 0;
                  const pct = status.users.total > 0 ? Math.round((count / status.users.total) * 100) : 0;
                  return (
                    <div key={planId} className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${PLAN_COLORS[planId] ?? ""}`}>{PLAN_LABEL[planId] ?? planId}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-purple-500/60 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Server info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Node.js",    value: status.server.nodeVersion },
              { label: "Plataforma", value: status.server.platform },
              { label: "Uptime",     value: (() => { const h = Math.floor(status.server.uptime / 3600); const m = Math.floor((status.server.uptime % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; })() },
              { label: "RAM Total",  value: `${status.server.memoryMb} MB` },
              { label: "RAM Livre",  value: `${status.server.freeMemMb} MB` },
              { label: "CPUs",       value: String(status.server.cpus) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/8 p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className="font-semibold text-white font-mono text-sm">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Service checks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-400" />Serviços</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(status.checks).map(([key, check]) => (
                <div key={key} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${check.ok ? "bg-green-400" : "bg-red-400"}`} />
                  <span className="text-sm font-medium flex-1">{{ tiktools: "tik.tools API", altApi: "API Alternativa", stripe: "Stripe" }[key] ?? key}</span>
                  <span className="text-xs text-muted-foreground">{check.message}</span>
                  {check.latencyMs !== undefined && (
                    <Badge variant="outline" className={`text-xs ${check.latencyMs < 500 ? "text-green-400 border-green-400/20" : "text-yellow-400 border-yellow-400/20"}`}>{check.latencyMs}ms</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : <p className="text-muted-foreground text-sm">Não foi possível carregar o status.</p>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: USUÁRIOS
// ════════════════════════════════════════════════════════════════════════════
interface EditUserDraft {
  id: string; name: string; email: string; plan: string; isAdmin: boolean;
  tiktokUsername: string; roleId: string;
  newPassword: string; newPasswordConfirm: string;
}

function UsuariosSection({ roles }: { roles: Role[] }) {
  const { user: me, token } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterAdmin, setFilterAdmin] = useState("all");
  const [editDraft, setEditDraft] = useState<EditUserDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    authFetch("/auth/users", token!).then((d: { users: AuthUser[] }) => setUsers(d.users ?? [])).finally(() => setLoading(false));
  }, [token]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function openEdit(u: AuthUser) {
    setEditDraft({
      id: u.id, name: u.name, email: u.email,
      plan: u.plan, isAdmin: u.isAdmin,
      tiktokUsername: u.tiktokUsername ?? "",
      roleId: u.roleId ?? "",
      newPassword: "", newPasswordConfirm: "",
    });
    setShowPw(false);
  }

  async function saveEdit() {
    if (!editDraft) return;
    if (editDraft.newPassword && editDraft.newPassword !== editDraft.newPasswordConfirm) {
      toast({ title: "As senhas não coincidem", variant: "destructive" }); return;
    }
    if (editDraft.newPassword && editDraft.newPassword.length < 6) {
      toast({ title: "Senha mínima de 6 caracteres", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        name: editDraft.name, email: editDraft.email,
        plan: editDraft.plan, isAdmin: editDraft.isAdmin,
        tiktokUsername: editDraft.tiktokUsername || null,
      };
      if (editDraft.newPassword) patch.newPassword = editDraft.newPassword;
      await authFetch(`/auth/users/${editDraft.id}`, token!, { method: "PATCH", body: JSON.stringify(patch) });
      if (editDraft.roleId !== (users.find(u => u.id === editDraft.id)?.roleId ?? "")) {
        await authFetch(`/admin/users/${editDraft.id}/role`, token!, {
          method: "PATCH", body: JSON.stringify({ roleId: editDraft.roleId || null }),
        });
      }
      toast({ title: "Usuário atualizado com sucesso!" });
      setEditDraft(null);
      fetchUsers();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Erro ao salvar", variant: "destructive" });
    } finally { setSaving(false); }
  }

  const deleteUser = (id: string) => {
    authFetch(`/auth/users/${id}`, token!, { method: "DELETE" })
      .then(() => { fetchUsers(); toast({ title: "Usuário removido" }); })
      .catch(() => toast({ title: "Erro ao deletar", variant: "destructive" }));
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      || (u.tiktokUsername ?? "").toLowerCase().includes(q);
    const matchPlan = filterPlan === "all" || u.plan === filterPlan;
    const matchAdmin = filterAdmin === "all" || (filterAdmin === "admin" ? u.isAdmin : !u.isAdmin);
    return matchSearch && matchPlan && matchAdmin;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.isAdmin).length,
    byPlan: { free: users.filter(u => u.plan === "free").length, basic: users.filter(u => u.plan === "basic").length, pro: users.filter(u => u.plan === "pro").length },
    withTiktok: users.filter(u => !!u.tiktokUsername).length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Usuários</h2>
          <p className="text-sm text-muted-foreground">Gerencie contas, planos, funções e permissões.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Atualizar
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "#a78bfa" },
          { label: "Admins", value: stats.admins, color: "#f97316" },
          { label: "Gratuito", value: stats.byPlan.free, color: "#6b7280" },
          { label: "Basic", value: stats.byPlan.basic, color: "#22d3ee" },
          { label: "PRO", value: stats.byPlan.pro, color: "#ec4899" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/6 p-3 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar nome, email ou @TikTok..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterPlan} onValueChange={setFilterPlan}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos planos</SelectItem>
            <SelectItem value="free">Gratuito</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="pro">PRO</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAdmin} onValueChange={setFilterAdmin}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
            <SelectItem value="user">Usuários</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>TikTok</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
              ) : filtered.map((u) => (
                <TableRow key={u.id} className={u.id === me?.id ? "bg-primary/5" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                        style={{ background: u.isAdmin ? "rgba(249,115,22,0.15)" : "rgba(124,58,237,0.15)", color: u.isAdmin ? "#f97316" : "#a78bfa" }}>
                        {u.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm leading-tight">{u.name}{u.id === me?.id && <span className="ml-1.5 text-[10px] text-purple-400/50">(você)</span>}</p>
                        <p className="text-xs text-muted-foreground leading-tight">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.tiktokUsername ? (
                      <div className="flex items-center gap-1">
                        {u.tiktokProfilePicture && <img src={u.tiktokProfilePicture} alt="" className="w-5 h-5 rounded-full object-cover" />}
                        <span className="text-sm font-mono text-purple-300">@{u.tiktokUsername}</span>
                        {u.tiktokVerified && <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />}
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                    {u.tiktokFollowerCount ? <p className="text-[11px] text-muted-foreground mt-0.5">{u.tiktokFollowerCount.toLocaleString("pt-BR")} seg.</p> : null}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${PLAN_COLORS[u.plan] ?? ""}`}>
                      {PLAN_LABEL[u.plan] ?? u.plan}
                    </span>
                  </TableCell>
                  <TableCell>
                    {u.roleId ? (
                      <span className="text-xs text-muted-foreground">{roles.find(r => r.id === u.roleId)?.name ?? u.roleId}</span>
                    ) : <span className="text-xs text-muted-foreground/40">—</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {u.isAdmin && <Badge className="text-[10px] px-1.5 py-0 h-4 bg-orange-500/15 text-orange-400 border-orange-400/20">Admin</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white" onClick={() => openEdit(u)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {u.id !== me?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deletar {u.name}?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação é irreversível. Todos os dados do usuário serão perdidos.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive hover:bg-destructive/80" onClick={() => deleteUser(u.id)}>Deletar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editDraft} onOpenChange={(o) => !o && setEditDraft(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserCog className="w-5 h-5 text-purple-400" />Editar usuário</DialogTitle>
            <DialogDescription>Edite os dados, plano, função e permissões do usuário.</DialogDescription>
          </DialogHeader>
          {editDraft && (
            <div className="space-y-4 py-1">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome</Label>
                  <Input value={editDraft.name} onChange={(e) => setEditDraft(d => d ? { ...d, name: e.target.value } : d)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={editDraft.email} onChange={(e) => setEditDraft(d => d ? { ...d, email: e.target.value } : d)} />
                </div>
              </div>

              {/* TikTok */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5"><SiTiktok className="w-3 h-3" />@ TikTok</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <Input className="pl-7" value={editDraft.tiktokUsername} placeholder="seuusuario"
                    onChange={(e) => setEditDraft(d => d ? { ...d, tiktokUsername: e.target.value.replace(/^@/, "") } : d)} />
                </div>
              </div>

              <Separator />

              {/* Plan & role */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Plano</Label>
                  <Select value={editDraft.plan} onValueChange={(v) => setEditDraft(d => d ? { ...d, plan: v } : d)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Gratuito</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">PRO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Função (Role)</Label>
                  <Select value={editDraft.roleId || "none"} onValueChange={(v) => setEditDraft(d => d ? { ...d, roleId: v === "none" ? "" : v } : d)}>
                    <SelectTrigger><SelectValue placeholder="Sem função" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Sem função —</SelectItem>
                      {roles.map((r) => <SelectItem key={r.id} value={r.id}><span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full" style={{ background: r.color }} />{r.name}</span></SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Admin toggle */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
                <Switch checked={editDraft.isAdmin} onCheckedChange={(v) => setEditDraft(d => d ? { ...d, isAdmin: v } : d)}
                  disabled={editDraft.id === me?.id} />
                <div>
                  <p className="text-sm font-medium">Acesso administrativo</p>
                  <p className="text-xs text-muted-foreground">Permite acesso ao painel admin completo</p>
                </div>
                {editDraft.isAdmin && <Shield className="w-4 h-4 text-orange-400 ml-auto shrink-0" />}
              </div>

              <Separator />

              {/* Password reset */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5"><KeyRound className="w-3 h-3" />Redefinir senha (opcional)</Label>
                <div className="relative">
                  <Input type={showPw ? "text" : "password"} placeholder="Nova senha (deixe em branco para não alterar)"
                    value={editDraft.newPassword} onChange={(e) => setEditDraft(d => d ? { ...d, newPassword: e.target.value } : d)}
                    className="pr-9" />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {editDraft.newPassword && (
                  <Input type={showPw ? "text" : "password"} placeholder="Confirmar nova senha"
                    value={editDraft.newPasswordConfirm} onChange={(e) => setEditDraft(d => d ? { ...d, newPasswordConfirm: e.target.value } : d)} />
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDraft(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: PLANOS
// ════════════════════════════════════════════════════════════════════════════
function PlanosSection({ plans, permissions, onRefresh }: { plans: Plan[]; permissions: PermissionDef[]; onRefresh: () => void }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [newFeature, setNewFeature] = useState("");
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [newPlanId, setNewPlanId] = useState("");
  const [newPlanName, setNewPlanName] = useState("");
  const [creating, setCreating] = useState(false);

  const savePlan = async () => {
    if (!editPlan) return;
    setSaving(true);
    try {
      await authFetch(`/admin/plans/${editPlan.id}`, token!, { method: "PATCH", body: JSON.stringify(editPlan) });
      toast({ title: "Plano salvo!" });
      onRefresh();
      setEditPlan(null);
    } catch { toast({ title: "Erro ao salvar plano", variant: "destructive" }); }
    setSaving(false);
  };

  const createPlan = async () => {
    if (!newPlanId.trim() || !newPlanName.trim()) {
      toast({ title: "ID e nome são obrigatórios", variant: "destructive" }); return;
    }
    setCreating(true);
    try {
      const created = await authFetch("/admin/plans", token!, {
        method: "POST",
        body: JSON.stringify({ id: newPlanId.trim().toLowerCase().replace(/\s+/g, "_"), name: newPlanName.trim(), order: plans.length }),
      }) as { plan: Plan };
      toast({ title: "Plano criado!" });
      onRefresh();
      setShowNewPlan(false);
      setNewPlanId(""); setNewPlanName("");
      setEditPlan(created.plan);
    } catch (err) { toast({ title: err instanceof Error ? err.message : "Erro ao criar plano", variant: "destructive" }); }
    setCreating(false);
  };

  const deletePlan = async (id: string) => {
    try {
      await authFetch(`/admin/plans/${id}`, token!, { method: "DELETE" });
      toast({ title: "Plano removido" });
      onRefresh();
    } catch (err) { toast({ title: err instanceof Error ? err.message : "Erro ao remover", variant: "destructive" }); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Planos</h2>
          <p className="text-sm text-muted-foreground">Configure preços, limites e permissões de cada plano. Use -1 para ilimitado, 0 para bloqueado.</p>
        </div>
        <Button size="sm" onClick={() => setShowNewPlan(true)}>
          <Plus className="w-4 h-4 mr-1.5" />Criar Plano
        </Button>
      </div>

      {/* Create new plan inline form */}
      {showNewPlan && (
        <Card className="border-dashed border-purple-500/30">
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">Novo plano</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="space-y-1">
                <Label className="text-xs">ID único (ex: premium)</Label>
                <Input value={newPlanId} onChange={(e) => setNewPlanId(e.target.value)} placeholder="premium" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} placeholder="Premium" className="h-8 text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={createPlan} disabled={creating}>
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}Criar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowNewPlan(false); setNewPlanId(""); setNewPlanName(""); }}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {plans.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((plan) => (
          <Card key={plan.id} className={`border ${plan.isActive ? "" : "opacity-50"}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${PLAN_COLORS[plan.id] ?? ""}`}>{plan.name}</span>
                    {!plan.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Inativo</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground">Preço</p>
                      <p className="font-bold text-white">{plan.price === 0 ? "Grátis" : fmtBRL(plan.price)}<span className="font-normal text-muted-foreground">/{plan.billingPeriod === "monthly" ? "mês" : plan.billingPeriod === "yearly" ? "ano" : plan.billingPeriod}</span></p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground">Live/mês</p>
                      <p className="font-semibold">{limitLabel(plan.maxLiveHoursPerMonth, "h")}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground">Análises/live</p>
                      <p className="font-semibold">{limitLabel(plan.maxLiveAnalyses)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground">Webhooks</p>
                      <p className="font-semibold">{limitLabel(plan.maxWebhooks)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground">WebSockets</p>
                      <p className="font-semibold">{limitLabel(plan.maxConcurrentWs)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground">API calls/janela</p>
                      <p className="font-semibold">{limitLabel(plan.maxApiCallsPerWindow)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditPlan({ ...plan })}>
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" />Editar
                  </Button>
                  {!["free", "basic", "pro"].includes(plan.id) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover plano "{plan.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>Usuários neste plano manterão o acesso — apenas o plano em si será removido da lista.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive hover:bg-destructive/80" onClick={() => void deletePlan(plan.id)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editPlan} onOpenChange={(o) => !o && setEditPlan(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar plano — {editPlan?.name}</DialogTitle>
            <DialogDescription>Configure preços, limites e permissões. Use -1 para ilimitado, 0 para bloqueado.</DialogDescription>
          </DialogHeader>
          {editPlan && (
            <div className="space-y-5 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={editPlan.name} onChange={(e) => setEditPlan((p) => p ? { ...p, name: e.target.value } : p)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Preço (centavos BRL)</Label>
                  <Input type="number" value={editPlan.price} onChange={(e) => setEditPlan((p) => p ? { ...p, price: Number(e.target.value) } : p)} />
                  <p className="text-xs text-muted-foreground">{fmtBRL(editPlan.price)}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input value={editPlan.description} onChange={(e) => setEditPlan((p) => p ? { ...p, description: e.target.value } : p)} />
              </div>

              <Separator />
              <p className="text-sm font-semibold">Limites do Plano</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Horas de live/mês (-1=ilimitado)", key: "maxLiveHoursPerMonth" as keyof Plan },
                  { label: "Análises de live (-1=ilimitado)",  key: "maxLiveAnalyses" as keyof Plan },
                  { label: "Webhooks (-1=ilimitado)",          key: "maxWebhooks" as keyof Plan },
                  { label: "WebSockets simultâneos",           key: "maxConcurrentWs" as keyof Plan },
                  { label: "API calls/janela",                 key: "maxApiCallsPerWindow" as keyof Plan },
                  { label: "Trocas de username/semana",        key: "tiktokUsernameChangesPerWeek" as keyof Plan },
                ].map(({ label, key }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs">{label}</Label>
                    <Input type="number" min={-1}
                      value={editPlan[key] as number}
                      onChange={(e) => setEditPlan((p) => p ? { ...p, [key]: Number(e.target.value) } : p)} />
                    <p className="text-xs text-muted-foreground">{limitLabel(editPlan[key] as number)}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={editPlan.isActive} onCheckedChange={(v) => setEditPlan((p) => p ? { ...p, isActive: v } : p)} />
                <Label>Plano ativo (visível para usuários)</Label>
              </div>

              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Funcionalidades incluídas</Label>
                <div className="space-y-1.5">
                  {editPlan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={f}
                        onChange={(e) => { const feats = [...editPlan.features]; feats[i] = e.target.value; setEditPlan((p) => p ? { ...p, features: feats } : p); }}
                        className="h-7 text-xs" />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => setEditPlan((p) => p ? { ...p, features: p.features.filter((_, j) => j !== i) } : p)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <Input value={newFeature} onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Adicionar funcionalidade..." className="h-7 text-xs"
                      onKeyDown={(e) => { if (e.key === "Enter" && newFeature.trim()) { setEditPlan((p) => p ? { ...p, features: [...p.features, newFeature.trim()] } : p); setNewFeature(""); } }} />
                    <Button size="icon" variant="outline" className="h-7 w-7 shrink-0"
                      onClick={() => { if (newFeature.trim()) { setEditPlan((p) => p ? { ...p, features: [...p.features, newFeature.trim()] } : p); setNewFeature(""); } }}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Permissões</Label>
                <PermissionCheckboxGroup allPermissions={permissions} selected={editPlan.permissions}
                  onChange={(p) => setEditPlan((prev) => prev ? { ...prev, permissions: p } : prev)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlan(null)}>Cancelar</Button>
            <Button onClick={savePlan} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}Salvar plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: ANÚNCIOS
// ════════════════════════════════════════════════════════════════════════════
function AnunciosSection() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", type: "info" as Announcement["type"], pinned: false, emoji: "", imageUrl: "" });
  const [editAnn, setEditAnn] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    authFetch("/announcements", token!).then((d: { announcements: Announcement[] }) => setAnns(d.announcements ?? [])).finally(() => setLoading(false));
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const createAnn = async () => {
    if (!form.title.trim() || !form.body.trim()) { toast({ title: "Título e texto são obrigatórios", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await authFetch("/announcements", token!, { method: "POST", body: JSON.stringify(form) });
      toast({ title: "Anúncio publicado!" });
      setForm({ title: "", body: "", type: "info", pinned: false, emoji: "", imageUrl: "" });
      setCreating(false);
      load();
    } catch { toast({ title: "Erro ao publicar", variant: "destructive" }); }
    setSaving(false);
  };

  const updateAnn = async () => {
    if (!editAnn) return;
    setSaving(true);
    try {
      await authFetch(`/announcements/${editAnn.id}`, token!, { method: "PATCH", body: JSON.stringify(editAnn) });
      toast({ title: "Anúncio atualizado!" });
      setEditAnn(null);
      load();
    } catch { toast({ title: "Erro ao atualizar", variant: "destructive" }); }
    setSaving(false);
  };

  const togglePin = async (ann: Announcement) => {
    await authFetch(`/announcements/${ann.id}`, token!, { method: "PATCH", body: JSON.stringify({ pinned: !ann.pinned }) });
    load();
  };

  const deleteAnn = async (id: string) => {
    await authFetch(`/announcements/${id}`, token!, { method: "DELETE" });
    toast({ title: "Anúncio removido" });
    load();
  };

  const AnnForm = ({ value, onChange, onSubmit, onCancel, submitLabel }: {
    value: typeof form; onChange: (v: typeof form) => void;
    onSubmit: () => void; onCancel: () => void; submitLabel: string;
  }) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Título</Label>
          <Input placeholder="Título do anúncio" value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={value.type} onValueChange={(v) => onChange({ ...value, type: v as Announcement["type"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ANN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}><span style={{ color: t.color }}>● </span>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Texto</Label>
        <textarea className="w-full px-3 py-2 rounded-md text-sm resize-none outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white", minHeight: "80px" }}
          placeholder="Conteúdo do anúncio..." value={value.body}
          onChange={(e) => onChange({ ...value, body: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">URL da Imagem (opcional — aparece no carrossel)</Label>
        <Input placeholder="https://exemplo.com/imagem.png" value={value.imageUrl} onChange={(e) => onChange({ ...value, imageUrl: e.target.value })} />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={value.pinned} onCheckedChange={(v) => onChange({ ...value, pinned: v })} />
          <Label className="text-sm">Fixar no topo</Label>
        </div>
        <div className="flex items-center gap-2 flex-1">
          <Label className="text-sm shrink-0">Emoji</Label>
          <Input className="w-16 text-center" value={value.emoji} onChange={(e) => onChange({ ...value, emoji: e.target.value })} placeholder="🎉" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onSubmit} disabled={saving} size="sm">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Megaphone className="w-3.5 h-3.5 mr-1.5" />}{submitLabel}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Anúncios / Novidades</h2>
          <p className="text-sm text-muted-foreground">Publique notificações que aparecem no sino de todos os usuários.</p>
        </div>
        {!creating && <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-2" />Novo anúncio</Button>}
      </div>

      {creating && (
        <Card className="border-purple-500/30">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Criar anúncio</CardTitle></CardHeader>
          <CardContent>
            <AnnForm value={form} onChange={setForm} onSubmit={createAnn} onCancel={() => setCreating(false)} submitLabel="Publicar" />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : anns.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhum anúncio publicado.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {anns.map((ann) => {
            const tc = ANN_TYPES.find((t) => t.value === ann.type);
            const isEditing = editAnn?.id === ann.id;
            return (
              <Card key={ann.id} className={ann.pinned ? "border-yellow-400/30" : ""}>
                <CardContent className="p-4">
                  {isEditing ? (
                    <AnnForm
                      value={{ title: editAnn.title, body: editAnn.body, type: editAnn.type, pinned: editAnn.pinned, emoji: editAnn.emoji ?? "", imageUrl: editAnn.imageUrl ?? "" }}
                      onChange={(v) => setEditAnn({ ...editAnn, ...v })}
                      onSubmit={updateAnn}
                      onCancel={() => setEditAnn(null)}
                      submitLabel="Salvar"
                    />
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {ann.pinned && <Pin className="w-3 h-3 text-yellow-400 shrink-0" />}
                          {ann.emoji && <span>{ann.emoji}</span>}
                          <span className="text-sm font-semibold text-white">{ann.title}</span>
                          <Badge variant="outline" className="text-xs" style={{ color: tc?.color, borderColor: `${tc?.color}40` }}>{tc?.label ?? ann.type}</Badge>
                          <span className="text-xs text-muted-foreground ml-auto">{new Date(ann.createdAt).toLocaleDateString("pt-BR")}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{ann.body}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title={ann.pinned ? "Desafixar" : "Fixar"} onClick={() => void togglePin(ann)}>
                          <Pin className={`w-3.5 h-3.5 ${ann.pinned ? "text-yellow-400" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditAnn({ ...ann })}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover anúncio?</AlertDialogTitle>
                              <AlertDialogDescription>"{ann.title}" será removido permanentemente.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive hover:bg-destructive/80" onClick={() => void deleteAnn(ann.id)}>Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: CONTEÚDO (Blog + Agências + Landing page)
// ════════════════════════════════════════════════════════════════════════════
interface Agency { id: string; name: string; handle: string; verified: boolean; description: string; website?: string; }

function ConteudoSection() {
  const [agencies, setAgencies] = useState<Agency[]>([
    { id: "1", name: "Agência Parceira 1", handle: "@agencia1", verified: true, description: "Especialistas em TikTok LIVE", website: "" },
  ]);
  const [newAgency, setNewAgency] = useState<Omit<Agency, "id">>({ name: "", handle: "", verified: false, description: "", website: "" });
  const [addingAgency, setAddingAgency] = useState(false);
  const [tab, setTab] = useState<"blog" | "agencies" | "landing">("blog");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Conteúdo</h2>
        <p className="text-sm text-muted-foreground">Gerencie blog, influenciadores parceiros e a landing page.</p>
      </div>

      <div className="flex gap-2">
        {([["blog", "Blog", BookOpen], ["agencies", "Influenciadores Parceiros", Users], ["landing", "Landing Page", Image]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === id ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "text-muted-foreground hover:text-white"}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === "blog" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4" />Blog — Integração WordPress</CardTitle>
            <CardDescription>Configure a URL do seu WordPress para exibir posts automaticamente no dashboard dos usuários.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
              <AlertCircle className="w-5 h-5 text-orange-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-300">Integração em desenvolvimento</p>
                <p className="text-xs text-orange-300/70">A integração com WordPress será configurada em breve. Por enquanto, os posts são exibidos como placeholders no dashboard.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>URL do WordPress (ex: https://seublog.com)</Label>
              <div className="flex gap-2">
                <Input placeholder="https://..." className="flex-1" />
                <Button variant="outline" disabled>Salvar</Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>API Key do WordPress REST (se necessário)</Label>
              <Input placeholder="Application Password ou JWT..." type="password" />
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "agencies" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Gerencie os influenciadores/agências parceiras exibidos no dashboard.</p>
            <Button size="sm" onClick={() => setAddingAgency(true)}><Plus className="w-4 h-4 mr-1.5" />Adicionar</Button>
          </div>

          {addingAgency && (
            <Card className="border-purple-500/30">
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Nome</Label><Input value={newAgency.name} onChange={(e) => setNewAgency((p) => ({ ...p, name: e.target.value }))} placeholder="Nome do influenciador" /></div>
                  <div className="space-y-1.5"><Label>@ TikTok</Label><Input value={newAgency.handle} onChange={(e) => setNewAgency((p) => ({ ...p, handle: e.target.value }))} placeholder="@handle" /></div>
                </div>
                <div className="space-y-1.5"><Label>Descrição</Label><Input value={newAgency.description} onChange={(e) => setNewAgency((p) => ({ ...p, description: e.target.value }))} placeholder="Breve descrição..." /></div>
                <div className="flex items-center gap-2">
                  <Switch checked={newAgency.verified} onCheckedChange={(v) => setNewAgency((p) => ({ ...p, verified: v }))} />
                  <Label>Verificado</Label>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => {
                    if (newAgency.name && newAgency.handle) {
                      setAgencies((a) => [...a, { ...newAgency, id: Date.now().toString() }]);
                      setNewAgency({ name: "", handle: "", verified: false, description: "", website: "" });
                      setAddingAgency(false);
                    }
                  }}>Adicionar</Button>
                  <Button variant="outline" size="sm" onClick={() => setAddingAgency(false)}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {agencies.map((ag) => (
              <Card key={ag.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>{ag.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-white">{ag.name}</p>
                      {ag.verified && <span className="text-xs text-green-400 font-bold">✓ Verificado</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{ag.handle}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ag.description}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setAgencies((a) => a.filter((x) => x.id !== ag.id))}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "landing" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Image className="w-4 h-4" />Landing Page — Slides e Header</CardTitle>
            <CardDescription>Edite os slides e o conteúdo exibido na página inicial pública.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)" }}>
              <Info className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-cyan-300">Editor visual em desenvolvimento</p>
                <p className="text-xs text-cyan-300/70">O editor de slides e header da landing page será implementado na próxima versão. Você poderá editar título, subtítulo, CTAs e as features exibidas.</p>
              </div>
            </div>
            {[
              { label: "Título principal", value: "Engaje seus fãs em tempo real." },
              { label: "Subtítulo",        value: "Rankings, overlays e métricas para suas lives no TikTok." },
              { label: "CTA primário",     value: "Criar conta grátis" },
            ].map((f) => (
              <div key={f.label} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Input defaultValue={f.value} disabled />
              </div>
            ))}
            <Button variant="outline" disabled>Salvar (em breve)</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: SISTEMA
// ════════════════════════════════════════════════════════════════════════════
function SistemaSection() {
  const { token } = useAuth();
  const { toast } = useToast();

  // tiktools
  const [tiktoolsKey, setTiktoolsKey] = useState("");
  const [tiktoolsMasked, setTiktoolsMasked] = useState<string | null>(null);
  const [showTiktoolsKey, setShowTiktoolsKey] = useState(false);
  const [savingTiktools, setSavingTiktools] = useState(false);
  const [testingTiktools, setTestingTiktools] = useState(false);
  const [tiktoolsResult, setTiktoolsResult] = useState<{ ok: boolean; message: string } | null>(null);

  // maintenance mode
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [maintenanceETA, setMaintenanceETA] = useState("");
  const [maintenanceLandingAlert, setMaintenanceLandingAlert] = useState("");
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  // per-page maintenance: key = page path (e.g. "/monitor"), value = {enabled, message, estimatedReturn}
  const [pagesMaint, setPagesMaint] = useState<Record<string, { enabled: boolean; message: string; estimatedReturn: string }>>({});
  const [savingPages, setSavingPages] = useState(false);

  // stripe
  const [stripeConfig, setStripeConfig] = useState<StripeConfig | null>(null);
  const [stripePublishable, setStripePublishable] = useState("");
  const [stripeBasic, setStripeBasic] = useState("");
  const [stripePro, setStripePro] = useState("");
  const [paymentsEnabled, setPaymentsEnabled] = useState(true);
  const [savingStripe, setSavingStripe] = useState(false);
  const [stripeResult, setStripeResult] = useState<{ ok: boolean; message: string } | null>(null);

  interface AltApiConfig { enabled: boolean; baseUrl: string; apiKeyHeader: string; apiKey: string; testPath: string; notes: string; }
  const [altApi, setAltApi] = useState<AltApiConfig>({ enabled: false, baseUrl: "", apiKeyHeader: "x-api-key", apiKey: "", testPath: "/api/live/top-channels", notes: "" });
  const [savingAlt, setSavingAlt] = useState(false);
  const [altResult, setAltResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [sc, ac, tc, mc] = await Promise.all([
        authFetch("/admin/stripe-config", token!) as Promise<StripeConfig>,
        authFetch("/admin/alt-api-config", token!) as Promise<AltApiConfig>,
        authFetch("/admin/tiktools-config", token!) as Promise<{ apiKeySet: boolean; apiKeyMasked: string | null }>,
        authFetch("/admin/maintenance", token!) as Promise<{ enabled: boolean; message?: string }>,
      ]);
      setStripeConfig(sc); setStripePublishable(sc.publishableKey ?? "");
      setStripeBasic(sc.priceIdBasic ?? ""); setStripePro(sc.priceIdPro ?? "");
      setPaymentsEnabled(sc.paymentsEnabled); setAltApi(ac); setTiktoolsMasked(tc.apiKeyMasked);
      setMaintenance(mc.enabled); setMaintenanceMessage(mc.message ?? "");
      setMaintenanceETA((mc as { estimatedReturn?: string }).estimatedReturn ?? "");
      setMaintenanceLandingAlert((mc as { landingAlert?: string }).landingAlert ?? "");
      const loadedPages = (mc as { pages?: Record<string, { enabled: boolean; message?: string; estimatedReturn?: string }> }).pages ?? {};
      const pageState: Record<string, { enabled: boolean; message: string; estimatedReturn: string }> = {};
      for (const [pagePath, cfg] of Object.entries(loadedPages)) {
        pageState[pagePath] = { enabled: cfg.enabled, message: cfg.message ?? "", estimatedReturn: cfg.estimatedReturn ?? "" };
      }
      setPagesMaint(pageState);
    } catch { /* ignore */ }
  }, [token]);

  const toggleMaintenance = async (val: boolean) => {
    setSavingMaintenance(true);
    setMaintenance(val);
    try {
      await authFetch("/admin/maintenance", token!, { method: "PATCH", body: JSON.stringify({ enabled: val, message: maintenanceMessage, estimatedReturn: maintenanceETA || undefined, landingAlert: maintenanceLandingAlert || undefined }) });
      toast({ title: val ? "⚠️ Modo manutenção ATIVADO!" : "✅ Modo manutenção desativado!" });
    } catch {
      setMaintenance(!val);
      toast({ title: "Erro ao salvar modo manutenção", variant: "destructive" });
    }
    setSavingMaintenance(false);
  };

  const saveMaintenance = async () => {
    setSavingMaintenance(true);
    try {
      await authFetch("/admin/maintenance", token!, { method: "PATCH", body: JSON.stringify({ enabled: maintenance, message: maintenanceMessage, estimatedReturn: maintenanceETA || undefined, landingAlert: maintenanceLandingAlert || undefined }) });
      toast({ title: "Manutenção atualizada!" });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSavingMaintenance(false);
  };

  const togglePageMaint = (pagePath: string, enabled: boolean) => {
    setPagesMaint(prev => ({
      ...prev,
      [pagePath]: { ...(prev[pagePath] ?? { message: "", estimatedReturn: "" }), enabled },
    }));
  };

  const setPageMaintField = (pagePath: string, field: "message" | "estimatedReturn", value: string) => {
    setPagesMaint(prev => ({
      ...prev,
      [pagePath]: { ...(prev[pagePath] ?? { enabled: false, message: "", estimatedReturn: "" }), [field]: value },
    }));
  };

  const savePagesMaint = async () => {
    setSavingPages(true);
    try {
      const pages: Record<string, { enabled: boolean; message?: string; estimatedReturn?: string }> = {};
      for (const [pagePath, cfg] of Object.entries(pagesMaint)) {
        pages[pagePath] = { enabled: cfg.enabled, message: cfg.message || undefined, estimatedReturn: cfg.estimatedReturn || undefined };
      }
      await authFetch("/admin/maintenance", token!, { method: "PATCH", body: JSON.stringify({ pages }) });
      toast({ title: "Manutenção por página salva!" });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSavingPages(false);
  };

  useEffect(() => { void load(); }, [load]);

  const saveTiktools = async () => {
    if (!tiktoolsKey.trim()) return;
    setSavingTiktools(true);
    try {
      const r = await authFetch("/admin/tiktools-config", token!, { method: "PATCH", body: JSON.stringify({ apiKey: tiktoolsKey }) }) as { ok: boolean; apiKeyMasked: string };
      setTiktoolsMasked(r.apiKeyMasked); setTiktoolsKey("");
      toast({ title: "Chave tik.tools atualizada e salva!" });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSavingTiktools(false);
  };

  const testTiktools = async () => {
    setTestingTiktools(true); setTiktoolsResult(null);
    try { const r = await authFetch("/admin/test-tiktools", token!, { method: "POST" }) as { ok: boolean; message: string }; setTiktoolsResult(r); }
    catch { setTiktoolsResult({ ok: false, message: "Erro de conexão" }); }
    setTestingTiktools(false);
  };

  const saveStripe = async () => {
    setSavingStripe(true);
    try {
      await authFetch("/admin/stripe-config", token!, { method: "PATCH", body: JSON.stringify({ publishableKey: stripePublishable || null, priceIdBasic: stripeBasic || null, priceIdPro: stripePro || null, paymentsEnabled }) });
      toast({ title: "Stripe atualizado!" }); void load();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSavingStripe(false);
  };

  const saveAlt = async () => {
    setSavingAlt(true);
    try { await authFetch("/admin/alt-api-config", token!, { method: "PATCH", body: JSON.stringify(altApi) }); toast({ title: "API alternativa salva!" }); }
    catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSavingAlt(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Sistema</h2>
        <p className="text-sm text-muted-foreground">Configurações de API, integrações externas e modo de manutenção.</p>
      </div>

      {/* Maintenance mode */}
      <Card className={maintenance ? "border-yellow-400/40" : ""}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${maintenance ? "bg-yellow-500/20" : "bg-muted/20"}`}>
                <Wrench className={`w-5 h-5 ${maintenance ? "text-yellow-400" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-semibold text-sm text-white">Modo Manutenção</p>
                <p className="text-xs text-muted-foreground">{maintenance ? "Ativo — usuários verão aviso de manutenção" : "Inativo — plataforma funcionando normalmente"}</p>
              </div>
            </div>
            <Switch checked={maintenance} onCheckedChange={toggleMaintenance} disabled={savingMaintenance} />
          </div>
          {maintenance && (
            <div className="mt-3 flex items-center gap-2 p-2 rounded-lg" style={{ background: "rgba(249,115,22,0.1)" }}>
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
              <p className="text-xs text-yellow-300">Modo manutenção ATIVO. Usuários verão tela de manutenção. Administradores ainda têm acesso total.</p>
            </div>
          )}
          <div className="mt-3 space-y-2.5">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mensagem para usuários (painel — overlay de manutenção)</Label>
              <Input value={maintenanceMessage} onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="Ex: Estamos realizando melhorias. Obrigado pela paciência!" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Previsão de retorno</Label>
              <Input value={maintenanceETA} onChange={(e) => setMaintenanceETA(e.target.value)}
                placeholder="Ex: 13h30 (horário de Brasília)" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Alerta na Landing Page (deixe vazio para não exibir)</Label>
              <Input value={maintenanceLandingAlert} onChange={(e) => setMaintenanceLandingAlert(e.target.value)}
                placeholder="Ex: Estamos em manutenção. Acesso ao painel temporariamente indisponível." className="text-sm" />
            </div>
            <Button size="sm" variant="outline" onClick={saveMaintenance} disabled={savingMaintenance} className="w-full">
              {savingMaintenance ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              Salvar configurações de manutenção
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Per-page maintenance */}
      {(() => {
        const PAGE_MAINT_ITEMS: { path: string; label: string; category: string }[] = [
          { path: "/",                   label: "Dashboard",         category: "PAINEL" },
          { path: "/monitor",            label: "Monitor / Conexão", category: "PAINEL" },
          { path: "/overlays",           label: "Sobreposições",     category: "PAINEL" },
          { path: "/events",             label: "Eventos",           category: "FERRAMENTAS" },
          { path: "/sound-alerts",       label: "Alertas Sonoros",   category: "FERRAMENTAS" },
          { path: "/layout",             label: "Layout OBS",        category: "FERRAMENTAS" },
          { path: "/effect-battle",      label: "Effect Battle",     category: "FERRAMENTAS" },
          { path: "/minigames",          label: "Minigames",         category: "JOGOS" },
          { path: "/live-counts",        label: "Live Counts",       category: "LIVE" },
          { path: "/live-captions",      label: "Live Captions",     category: "LIVE" },
          { path: "/live-analytics",     label: "Live Analytics",    category: "LIVE" },
          { path: "/leaderboards",       label: "Leaderboards",      category: "RANKINGS" },
          { path: "/gifters",            label: "Gifters",           category: "RANKINGS" },
          { path: "/integracoes",        label: "Integrações",       category: "OUTROS" },
          { path: "/pricing",            label: "Planos / Preços",   category: "OUTROS" },
        ];
        const categories = [...new Set(PAGE_MAINT_ITEMS.map(p => p.category))];
        const activeCount = PAGE_MAINT_ITEMS.filter(p => pagesMaint[p.path]?.enabled).length;
        return (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Layers className="w-4 h-4 text-orange-400" />
                <CardTitle className="text-sm">Manutenção por Página</CardTitle>
                {activeCount > 0 && (
                  <Badge className="text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                    {activeCount} {activeCount === 1 ? "página bloqueada" : "páginas bloqueadas"}
                  </Badge>
                )}
              </div>
              <CardDescription>
                Desative seções individuais sem derrubar o painel inteiro. Administradores continuam com acesso total.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {categories.map(cat => (
                <div key={cat} className="space-y-2">
                  <p className="text-[10px] font-bold tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>{cat}</p>
                  <div className="space-y-2">
                    {PAGE_MAINT_ITEMS.filter(p => p.category === cat).map(page => {
                      const cfg = pagesMaint[page.path] ?? { enabled: false, message: "", estimatedReturn: "" };
                      return (
                        <div key={page.path} className="rounded-xl p-3 space-y-2"
                          style={{
                            background: cfg.enabled ? "rgba(249,115,22,0.06)" : "rgba(255,255,255,0.02)",
                            border: cfg.enabled ? "1px solid rgba(249,115,22,0.25)" : "1px solid rgba(255,255,255,0.05)",
                          }}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {cfg.enabled
                                ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                                : <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
                              }
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white truncate">{page.label}</p>
                                <p className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>{page.path}</p>
                              </div>
                            </div>
                            <Switch
                              checked={cfg.enabled}
                              onCheckedChange={v => togglePageMaint(page.path, v)}
                            />
                          </div>
                          {cfg.enabled && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Mensagem (opcional)</Label>
                                <Input
                                  value={cfg.message}
                                  onChange={e => setPageMaintField(page.path, "message", e.target.value)}
                                  placeholder="Seção em manutenção…"
                                  className="text-xs h-8"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Previsão de retorno (opcional)</Label>
                                <Input
                                  value={cfg.estimatedReturn}
                                  onChange={e => setPageMaintField(page.path, "estimatedReturn", e.target.value)}
                                  placeholder="Ex: 14h00"
                                  className="text-xs h-8"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={savePagesMaint} disabled={savingPages} className="w-full">
                {savingPages ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                Salvar manutenção por página
              </Button>
            </CardContent>
          </Card>
        );
      })()}

      {/* tik.tools API Key */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-purple-400" />
            <CardTitle className="text-sm">tik.tools API Key</CardTitle>
            {tiktoolsMasked ? (
              <Badge className="text-xs bg-green-500/10 text-green-400 border-green-500/20">Configurada: {tiktoolsMasked}</Badge>
            ) : (
              <Badge className="text-xs bg-red-500/10 text-red-400 border-red-500/20">Não configurada</Badge>
            )}
          </div>
          <CardDescription>Chave necessária para acessar dados de lives do TikTok. Salva de forma persistente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Input type={showTiktoolsKey ? "text" : "password"} placeholder="tiktools_••••••••" value={tiktoolsKey}
              onChange={(e) => setTiktoolsKey(e.target.value)} className="pr-10 font-mono text-sm" />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowTiktoolsKey((v) => !v)}>{showTiktoolsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveTiktools} disabled={savingTiktools || !tiktoolsKey.trim()}>
              {savingTiktools ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}Salvar chave
            </Button>
            <Button variant="outline" size="sm" onClick={testTiktools} disabled={testingTiktools}>
              {testingTiktools ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Testando…</> : <><Radio className="w-3.5 h-3.5 mr-1.5" />Testar conexão</>}
            </Button>
          </div>
          {tiktoolsResult && <ResultBadge r={tiktoolsResult} />}
        </CardContent>
      </Card>

      {/* Stripe */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-400" />
            <CardTitle className="text-sm">Stripe — Pagamentos</CardTitle>
            {stripeConfig && <Badge className={`text-xs ${stripeConfig.secretKeySet ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-muted/40 text-muted-foreground"}`}>{stripeConfig.secretKeySet ? "SK configurada" : "SK não configurada"}</Badge>}
            <div className="ml-auto flex items-center gap-2"><Label className="text-xs text-muted-foreground">Pagamentos</Label><Switch checked={paymentsEnabled} onCheckedChange={setPaymentsEnabled} /></div>
          </div>
          <CardDescription>Configure as chaves e Price IDs para cobrar assinaturas. Chaves secretas via variáveis de ambiente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md bg-muted/20 border border-border px-3 py-2 text-xs text-muted-foreground">
            <p className="font-medium">Configurar via env vars do Replit (recomendado):</p>
            <p className="font-mono mt-1">STRIPE_SECRET_KEY · STRIPE_WEBHOOK_SECRET</p>
          </div>
          <div className="space-y-2"><Label className="text-xs text-muted-foreground">Publishable Key (pk_...)</Label><Input value={stripePublishable} onChange={(e) => setStripePublishable(e.target.value)} placeholder="pk_live_••••••••" className="font-mono text-sm" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">Price ID — Basic</Label><Input value={stripeBasic} onChange={(e) => setStripeBasic(e.target.value)} placeholder="price_••••••••" className="font-mono text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">Price ID — PRO</Label><Input value={stripePro} onChange={(e) => setStripePro(e.target.value)} placeholder="price_••••••••" className="font-mono text-sm" /></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveStripe} disabled={savingStripe}>{savingStripe ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}Salvar</Button>
          </div>
          {stripeResult && <ResultBadge r={stripeResult} />}
        </CardContent>
      </Card>

      {/* API Alternativa */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <PlugZap className="w-4 h-4 text-cyan-400" />
            <CardTitle className="text-sm">API Alternativa</CardTitle>
            <Switch checked={altApi.enabled} onCheckedChange={(v) => setAltApi((p) => ({ ...p, enabled: v }))} />
          </div>
          <CardDescription>Use uma API personalizada em vez da tik.tools padrão.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">Base URL</Label><Input value={altApi.baseUrl} onChange={(e) => setAltApi((p) => ({ ...p, baseUrl: e.target.value }))} placeholder="https://api.exemplo.com" className="font-mono text-sm" disabled={!altApi.enabled} /></div>
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">Header da API Key</Label><Input value={altApi.apiKeyHeader} onChange={(e) => setAltApi((p) => ({ ...p, apiKeyHeader: e.target.value }))} placeholder="x-api-key" disabled={!altApi.enabled} /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">API Key</Label><Input value={altApi.apiKey} onChange={(e) => setAltApi((p) => ({ ...p, apiKey: e.target.value }))} type="password" disabled={!altApi.enabled} /></div>
          <Button size="sm" onClick={saveAlt} disabled={savingAlt}>{savingAlt ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}Salvar</Button>
          {altResult && <ResultBadge r={altResult} />}
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: FUNÇÕES (ROLES)
// ════════════════════════════════════════════════════════════════════════════
function FuncoesSection({ roles, permissions, onRefresh }: { roles: Role[]; permissions: PermissionDef[]; onRefresh: () => void }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: "", description: "", color: "#7c3aed", permissions: [] as string[] });
  const [saving, setSaving] = useState(false);

  const saveRole = async (isNew: boolean) => {
    setSaving(true);
    try {
      if (isNew) {
        await authFetch("/admin/roles", token!, { method: "POST", body: JSON.stringify(form) });
        setForm({ name: "", description: "", color: "#7c3aed", permissions: [] });
        setCreating(false);
      } else if (editRole) {
        await authFetch(`/admin/roles/${editRole.id}`, token!, { method: "PATCH", body: JSON.stringify(editRole) });
        setEditRole(null);
      }
      toast({ title: "Função salva!" });
      onRefresh();
    } catch { toast({ title: "Erro ao salvar função", variant: "destructive" }); }
    setSaving(false);
  };

  const deleteRole = async (id: string) => {
    await authFetch(`/admin/roles/${id}`, token!, { method: "DELETE" });
    toast({ title: "Função removida" });
    onRefresh();
  };

  const RoleForm = ({ value, onChange, isNew }: { value: typeof form | Role; onChange: (v: typeof form | Role) => void; isNew: boolean }) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Nome</Label><Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Ex: Moderador" /></div>
        <div className="space-y-1.5">
          <Label>Cor</Label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button key={c.hsl} title={c.label}
                className={`w-6 h-6 rounded-full border-2 transition-all ${value.color === `hsl(${c.hsl})` || value.color === c.hsl ? "border-white scale-110" : "border-transparent"}`}
                style={{ background: `hsl(${c.hsl})` }}
                onClick={() => onChange({ ...value, color: `hsl(${c.hsl})` })} />
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-1.5"><Label>Descrição</Label><Input value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} /></div>
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Permissões</Label>
        <PermissionCheckboxGroup allPermissions={permissions} selected={value.permissions}
          onChange={(p) => onChange({ ...value, permissions: p })} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => saveRole(isNew)} disabled={saving}>{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}Salvar</Button>
        <Button variant="outline" size="sm" onClick={() => isNew ? setCreating(false) : setEditRole(null)}>Cancelar</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-white mb-1">Funções</h2><p className="text-sm text-muted-foreground">Crie e gerencie funções com permissões específicas.</p></div>
        {!creating && <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-2" />Nova função</Button>}
      </div>

      {creating && (
        <Card className="border-purple-500/30">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Nova função</CardTitle></CardHeader>
          <CardContent><RoleForm value={form} onChange={(v) => setForm(v as typeof form)} isNew={true} /></CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {roles.length === 0 && !creating && <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhuma função criada.</CardContent></Card>}
        {roles.map((role) => (
          <Card key={role.id}>
            <CardContent className="p-4">
              {editRole?.id === role.id ? (
                <RoleForm value={editRole} onChange={(v) => setEditRole(v as Role)} isNew={false} />
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: role.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white">{role.name}</p>
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{role.permissions.length} permissão(ões)</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditRole({ ...role })}><Edit2 className="w-3.5 h-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Deletar função "{role.name}"?</AlertDialogTitle><AlertDialogDescription>Usuários com esta função perderão as permissões associadas.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/80" onClick={() => void deleteRole(role.id)}>Deletar</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: CUSTOMIZAÇÃO UI
// ════════════════════════════════════════════════════════════════════════════
function CustomizacaoSection() {
  const { token } = useAuth();
  const { toast } = useToast();
  const { config: uiConfig, refresh: reloadUI } = useUIConfig();
  const [local, setLocal] = useState<typeof uiConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => { if (uiConfig) setLocal(JSON.parse(JSON.stringify(uiConfig))); }, [uiConfig]);

  const updateItemLabel = (secId: string, itemIdx: number, label: string) => {
    setLocal((prev) => { if (!prev) return prev; const s = [...prev.sidebarSections]; const sec = { ...s.find((x) => x.id === secId)! }; sec.items = sec.items.map((it, i) => i === itemIdx ? { ...it, label } : it); return { ...prev, sidebarSections: s.map((x) => x.id === secId ? sec : x) }; });
  };
  const toggleItemVisible = (secId: string, itemIdx: number) => {
    setLocal((prev) => { if (!prev) return prev; const s = [...prev.sidebarSections]; const sec = { ...s.find((x) => x.id === secId)! }; sec.items = sec.items.map((it, i) => i === itemIdx ? { ...it, visible: !it.visible } : it); return { ...prev, sidebarSections: s.map((x) => x.id === secId ? sec : x) }; });
  };
  const moveItem = (secId: string, itemIdx: number, dir: -1 | 1) => {
    setLocal((prev) => { if (!prev) return prev; const s = [...prev.sidebarSections]; const sec = { ...s.find((x) => x.id === secId)! }; const items = [...sec.items]; const newIdx = itemIdx + dir; if (newIdx < 0 || newIdx >= items.length) return prev; [items[itemIdx], items[newIdx]] = [items[newIdx], items[itemIdx]]; sec.items = items; return { ...prev, sidebarSections: s.map((x) => x.id === secId ? sec : x) }; });
  };

  const save = async () => {
    if (!local) return; setSaving(true);
    try { await authFetch("/admin/ui-config", token!, { method: "PATCH", body: JSON.stringify(local) }); reloadUI(); toast({ title: "Customização salva!" }); }
    catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSaving(false);
  };

  const doReset = async () => {
    setResetting(true);
    try { await authFetch("/admin/ui-config/reset", token!, { method: "POST" }); reloadUI(); toast({ title: "Configuração resetada!" }); }
    catch { toast({ title: "Erro ao resetar", variant: "destructive" }); }
    setResetting(false);
  };

  // center buttons helpers
  const addCenterBtn = () => {
    const btn: CenterButton = { id: `btn_${Date.now()}`, label: "Novo Botão", url: "https://", color: "purple" };
    setLocal((p) => p ? { ...p, headerConfig: { ...p.headerConfig, centerButtons: [...(p.headerConfig?.centerButtons ?? []), btn] } } : p);
  };
  const updateCenterBtn = (idx: number, patch: Partial<CenterButton>) => {
    setLocal((p) => { if (!p) return p; const btns = [...(p.headerConfig?.centerButtons ?? [])]; btns[idx] = { ...btns[idx], ...patch }; return { ...p, headerConfig: { ...p.headerConfig, centerButtons: btns } }; });
  };
  const removeCenterBtn = (idx: number) => {
    setLocal((p) => { if (!p) return p; const btns = [...(p.headerConfig?.centerButtons ?? [])]; btns.splice(idx, 1); return { ...p, headerConfig: { ...p.headerConfig, centerButtons: btns } }; });
  };
  const moveCenterBtn = (idx: number, dir: -1 | 1) => {
    setLocal((p) => { if (!p) return p; const btns = [...(p.headerConfig?.centerButtons ?? [])]; const ni = idx + dir; if (ni < 0 || ni >= btns.length) return p; [btns[idx], btns[ni]] = [btns[ni], btns[idx]]; return { ...p, headerConfig: { ...p.headerConfig, centerButtons: btns } }; });
  };

  // featured slides helpers
  const addSlide = () => {
    const slide: FeaturedSlide = { id: `slide_${Date.now()}`, title: "Novo Slide", subtitle: "", body: "", ctaLabel: "Saiba mais", ctaUrl: "", badge: "", badgeColor: "purple" };
    setLocal((p) => p ? { ...p, featuredSlides: [...(p.featuredSlides ?? []), slide] } : p);
  };
  const updateSlide = (idx: number, patch: Partial<FeaturedSlide>) => {
    setLocal((p) => { if (!p) return p; const slides = [...(p.featuredSlides ?? [])]; slides[idx] = { ...slides[idx], ...patch }; return { ...p, featuredSlides: slides }; });
  };
  const removeSlide = (idx: number) => {
    setLocal((p) => { if (!p) return p; const slides = [...(p.featuredSlides ?? [])]; slides.splice(idx, 1); return { ...p, featuredSlides: slides }; });
  };
  const moveSlide = (idx: number, dir: -1 | 1) => {
    setLocal((p) => { if (!p) return p; const slides = [...(p.featuredSlides ?? [])]; const ni = idx + dir; if (ni < 0 || ni >= slides.length) return p; [slides[idx], slides[ni]] = [slides[ni], slides[idx]]; return { ...p, featuredSlides: slides }; });
  };

  if (!local) return <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  const hcfg = local.headerConfig ?? {};
  const centerBtns = hcfg.centerButtons ?? [];
  const featuredSlides = local.featuredSlides ?? [];

  const BTN_COLORS: CenterButton["color"][] = ["purple", "blue", "green", "red", "gray", "cyan"];

  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-white mb-1">Customização</h2><p className="text-sm text-muted-foreground">Edite aparência, cabeçalho, botões e slides da plataforma.</p></div>

      {/* Theme colors */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Cores do Tema</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Cor Primária",    key: "primaryColor" as const },
            { label: "Cor Secundária",  key: "secondaryColor" as const },
          ].map(({ label, key }) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_COLORS.map((c) => (
                  <button key={c.hsl} title={c.label}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${local[key] === c.hsl ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ background: `hsl(${c.hsl})` }}
                    onClick={() => setLocal((p) => p ? { ...p, [key]: c.hsl } : p)} />
                ))}
              </div>
              <Input value={local[key]} onChange={(e) => setLocal((p) => p ? { ...p, [key]: e.target.value } : p)} placeholder="180 100% 50%" />
              <div className="h-5 rounded-md" style={{ background: `hsl(${local[key]})` }} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Header config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Cabeçalho (TopBar)</CardTitle>
          <CardDescription>Nome do app, subtítulo e visibilidade de elementos no topo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do App</Label>
              <Input value={hcfg.appName ?? ""} onChange={(e) => setLocal((p) => p ? { ...p, headerConfig: { ...p.headerConfig, appName: e.target.value } } : p)} placeholder="Creatools" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Subtítulo</Label>
              <Input value={hcfg.appSubtitle ?? ""} onChange={(e) => setLocal((p) => p ? { ...p, headerConfig: { ...p.headerConfig, appSubtitle: e.target.value } } : p)} placeholder="TikTok LIVE Studio" className="text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">URL do Logo (substitui ícone padrão)</Label>
            <Input value={hcfg.logoUrl ?? ""} onChange={(e) => setLocal((p) => p ? { ...p, headerConfig: { ...p.headerConfig, logoUrl: e.target.value || undefined } } : p)} placeholder="https://exemplo.com/logo.png" className="text-sm" />
          </div>
          <div className="flex flex-wrap gap-4">
            {[
              { key: "showSubtitle" as const, label: "Mostrar subtítulo" },
              { key: "showUpgradeBtn" as const, label: "Botão Upgrade" },
              { key: "showFlag" as const, label: "Bandeira/País" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!(hcfg as Record<string, unknown>)[key]}
                  onChange={(e) => setLocal((p) => p ? { ...p, headerConfig: { ...p.headerConfig, [key]: e.target.checked } } : p)}
                  className="rounded" />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Center buttons */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Botões Centrais (TopBar)</CardTitle>
              <CardDescription>Links rápidos exibidos no centro do cabeçalho.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addCenterBtn}><Plus className="w-3.5 h-3.5 mr-1.5" />Adicionar</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {centerBtns.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhum botão configurado. Clique em "Adicionar" para criar.</p>
          )}
          {centerBtns.map((btn, idx) => (
            <div key={btn.id} className="rounded-xl border border-white/8 p-3 space-y-2" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => moveCenterBtn(idx, -1)} disabled={idx === 0} className="text-white/30 hover:text-white/70 disabled:opacity-20"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => moveCenterBtn(idx, 1)} disabled={idx === centerBtns.length - 1} className="text-white/30 hover:text-white/70 disabled:opacity-20"><ChevronDown className="w-3.5 h-3.5" /></button>
                </div>
                <Input value={btn.icon ?? ""} onChange={(e) => updateCenterBtn(idx, { icon: e.target.value || undefined })} placeholder="Emoji/ícone (ex: 🚀)" className="text-sm w-28 shrink-0" />
                <Input value={btn.label} onChange={(e) => updateCenterBtn(idx, { label: e.target.value })} placeholder="Label" className="text-sm flex-1" />
                <Input value={btn.url} onChange={(e) => updateCenterBtn(idx, { url: e.target.value })} placeholder="https://..." className="text-sm flex-1" />
                <button onClick={() => removeCenterBtn(idx)} className="text-red-400 hover:text-red-300 shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {BTN_COLORS.map((c) => (
                    <button key={c} title={c}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${btn.color === c ? "border-white scale-110" : "border-transparent"}`}
                      style={{ background: c === "purple" ? "#7c3aed" : c === "blue" ? "#2563eb" : c === "green" ? "#16a34a" : c === "red" ? "#dc2626" : c === "gray" ? "#6b7280" : "#06b6d4" }}
                      onClick={() => updateCenterBtn(idx, { color: c })} />
                  ))}
                </div>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="checkbox" checked={!!btn.openInNewTab} onChange={(e) => updateCenterBtn(idx, { openInNewTab: e.target.checked })} />
                  Abrir em nova aba
                </label>
                <Input value={btn.badge ?? ""} onChange={(e) => updateCenterBtn(idx, { badge: e.target.value || undefined })} placeholder="Badge (opcional)" className="text-xs flex-1 h-7" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Featured slides */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Slides em Destaque (Dashboard)</CardTitle>
              <CardDescription>Carrossel de destaques exibido na coluna direita do Dashboard.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addSlide}><Plus className="w-3.5 h-3.5 mr-1.5" />Adicionar</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {featuredSlides.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhum slide configurado. Clique em "Adicionar" para criar.</p>
          )}
          {featuredSlides.map((slide, idx) => (
            <div key={slide.id} className="rounded-xl border border-white/8 p-3 space-y-2" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-0.5 shrink-0 pt-1">
                  <button onClick={() => moveSlide(idx, -1)} disabled={idx === 0} className="text-white/30 hover:text-white/70 disabled:opacity-20"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => moveSlide(idx, 1)} disabled={idx === featuredSlides.length - 1} className="text-white/30 hover:text-white/70 disabled:opacity-20"><ChevronDown className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={slide.title} onChange={(e) => updateSlide(idx, { title: e.target.value })} placeholder="Título" className="text-sm" />
                    <Input value={slide.subtitle ?? ""} onChange={(e) => updateSlide(idx, { subtitle: e.target.value || undefined })} placeholder="Subtítulo" className="text-sm" />
                  </div>
                  <Input value={slide.body ?? ""} onChange={(e) => updateSlide(idx, { body: e.target.value || undefined })} placeholder="Texto / Descrição" className="text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={slide.ctaLabel ?? ""} onChange={(e) => updateSlide(idx, { ctaLabel: e.target.value || undefined })} placeholder="Texto do botão CTA" className="text-sm" />
                    <Input value={slide.ctaUrl ?? ""} onChange={(e) => updateSlide(idx, { ctaUrl: e.target.value || undefined })} placeholder="URL do CTA" className="text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={slide.badge ?? ""} onChange={(e) => updateSlide(idx, { badge: e.target.value || undefined })} placeholder="Badge (ex: NOVO)" className="text-sm" />
                    <Input value={slide.imageUrl ?? ""} onChange={(e) => updateSlide(idx, { imageUrl: e.target.value || undefined })} placeholder="URL da imagem (opcional)" className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Cor do Badge</Label>
                    <div className="flex gap-1.5 flex-wrap">
                      {(["purple","blue","green","red","orange","cyan","pink"] as const).map((c) => {
                        const hex = c==="purple"?"#7c3aed":c==="blue"?"#2563eb":c==="green"?"#16a34a":c==="red"?"#dc2626":c==="orange"?"#ea580c":c==="cyan"?"#0891b2":"#db2777";
                        return (
                          <button key={c} title={c}
                            className={`w-5 h-5 rounded-full border-2 transition-all ${slide.badgeColor===c?"border-white scale-110":"border-transparent opacity-60 hover:opacity-100"}`}
                            style={{ background: hex }}
                            onClick={() => updateSlide(idx, { badgeColor: c })} />
                        );
                      })}
                    </div>
                  </div>
                </div>
                <button onClick={() => removeSlide(idx)} className="text-red-400 hover:text-red-300 mt-1 shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={doReset} disabled={resetting}><RotateCcw className="w-4 h-4 mr-2" />Resetar padrão</Button>
        <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-2" />Salvar</Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: LANDING PAGE
// ════════════════════════════════════════════════════════════════════════════

interface LandingFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  imageUrl: string;
  demoUrl: string;
  order: number;
}

interface LandingContent {
  enabled: boolean;
  hero: { headline: string; subheadline: string; ctaLabel: string; backgroundGradient: string };
  features: LandingFeature[];
  plans: { visiblePlanIds: string[]; recommendedPlanId: string };
  cta: { text: string; subtext: string; buttonLabel: string };
}

const EMPTY_FEATURE: LandingFeature = { id: "", title: "", description: "", icon: "LayoutDashboard", imageUrl: "", demoUrl: "", order: 0 };
const LUCIDE_ICONS = ["LayoutDashboard","Activity","Users","Trophy","Monitor","Key","Star","Zap","Shield","Globe","BarChart2","Radio","Diamond","Search","Settings","Bell","Heart","Tv2","Gamepad2","Code2"];

// ── Partner types (for admin) ─────────────────────────────────────────────────
interface LandingPartner {
  id: string;
  tiktokHandle: string;
  displayName: string;
  avatarUrl: string;
  followers: number;
  addedAt: string;
  isLive?: boolean;
  viewerCount?: number;
}
function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Partners admin section ─────────────────────────────────────────────────────
function EditPartnerDialog({ partner, token, toast, onSaved }: {
  partner: LandingPartner;
  token: string;
  toast: ReturnType<typeof useToast>["toast"];
  onSaved: (updated: LandingPartner) => void;
}) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(partner.displayName);
  const [avatarUrl, setAvatarUrl] = useState(partner.avatarUrl);
  const [followers, setFollowers] = useState(String(partner.followers));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/landing/partners/${partner.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, avatarUrl, followers: Number(followers) || 0 }),
      });
      if (!res.ok) { toast({ title: "Erro ao salvar", variant: "destructive" }); return; }
      const updated = await res.json() as LandingPartner;
      onSaved(updated);
      setOpen(false);
      toast({ title: "Parceiro atualizado!" });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/30 hover:text-white"
        title="Editar dados manualmente" onClick={() => { setDisplayName(partner.displayName); setAvatarUrl(partner.avatarUrl); setFollowers(String(partner.followers)); setOpen(true); }}>
        <Pencil className="w-3.5 h-3.5" />
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: "#100c28", border: "1px solid rgba(255,255,255,0.1)" }} onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="font-bold text-white text-base">Editar @{partner.tiktokHandle}</h3>
              <p className="text-xs text-white/35 mt-1">Insira os dados manualmente. A foto pode ser uma URL de imagem do perfil do TikTok.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Nome de exibição</label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Nome do streamer" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">URL da foto de perfil</label>
                <Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." />
                {avatarUrl && <img src={avatarUrl} alt="" className="mt-2 w-12 h-12 rounded-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Seguidores</label>
                <Input type="text" inputMode="numeric" value={followers} onChange={e => setFollowers(e.target.value)} placeholder="Ex: 2500000" />
                <p className="text-[10px] text-white/25 mt-1">Só dígitos — não use pontos nem vírgulas</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} className="text-white/50">Cancelar</Button>
              <Button onClick={() => void save()} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PartnersAdminSection({ token, toast }: { token: string; toast: ReturnType<typeof useToast>["toast"] }) {
  const [partners, setPartners] = useState<LandingPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [handle, setHandle] = useState("");
  const [adding, setAdding] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const loadPartners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/landing/partners", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json() as { partners: LandingPartner[] };
      setPartners(data.partners ?? []);
    } catch { toast({ title: "Erro ao carregar parceiros", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [token, toast]);

  useEffect(() => { void loadPartners(); }, [loadPartners]);

  const addPartner = async () => {
    const h = handle.trim().replace(/^@/, "");
    if (!h) return;
    setAdding(true);
    try {
      const res = await fetch("/api/landing/partners", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tiktokHandle: h }),
      });
      if (res.status === 409) { toast({ title: "Parceiro já adicionado", variant: "destructive" }); return; }
      if (!res.ok) { toast({ title: "Erro ao adicionar", variant: "destructive" }); return; }
      const partner = await res.json() as LandingPartner;
      setPartners(prev => [...prev, partner]);
      setHandle("");
      toast({ title: `@${partner.tiktokHandle} adicionado!` });
    } catch { toast({ title: "Erro ao adicionar parceiro", variant: "destructive" }); }
    finally { setAdding(false); }
  };

  const removePartner = async (id: string, h: string) => {
    try {
      await fetch(`/api/landing/partners/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setPartners(prev => prev.filter(p => p.id !== id));
      toast({ title: `@${h} removido` });
    } catch { toast({ title: "Erro ao remover", variant: "destructive" }); }
  };

  const refreshPartner = async (id: string) => {
    setRefreshingId(id);
    try {
      const res = await fetch(`/api/landing/partners/${id}/refresh`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { toast({ title: "Erro ao atualizar perfil", variant: "destructive" }); return; }
      const updated = await res.json() as LandingPartner;
      setPartners(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      toast({ title: "Perfil atualizado!" });
    } catch { toast({ title: "Erro ao atualizar", variant: "destructive" }); }
    finally { setRefreshingId(null); }
  };

  return (
    <div className="space-y-4">
      {/* Add partner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-amber-400" /> Adicionar Parceiro
          </CardTitle>
          <CardDescription>
            Digite o @ do TikTok para buscar e adicionar o streamer como parceiro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
              <Input
                className="pl-7"
                placeholder="nomeDoStreamer"
                value={handle}
                onChange={e => setHandle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && void addPartner()}
                disabled={adding}
              />
            </div>
            <Button onClick={() => void addPartner()} disabled={adding || !handle.trim()} className="gap-2 shrink-0">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {adding ? "Buscando…" : "Adicionar"}
            </Button>
          </div>
          <p className="text-xs text-white/30 mt-2">Após adicionar, clique no lápis (✏️) para inserir a foto e dados manualmente. Auto-busca requer plano Pro da tik.tools.</p>
        </CardContent>
      </Card>

      {/* Partners list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Parceiros ({partners.length})</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-white/50" onClick={() => void loadPartners()} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Recarregar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
          ) : partners.length === 0 ? (
            <div className="py-10 text-center text-white/30 text-sm">
              <SiTiktok className="w-8 h-8 mx-auto mb-2 opacity-20" />
              Nenhum parceiro adicionado ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {partners.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
                    style={{ border: p.isLive ? "2px solid #f59e0b" : "2px solid rgba(255,255,255,0.1)", background: "rgba(124,58,237,0.2)" }}>
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt={p.displayName} className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <SiTiktok className="w-4 h-4 text-white/30" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-white truncate">{p.displayName}</span>
                      {p.isLive && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                          <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" /> AO VIVO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-white/40">@{p.tiktokHandle}</span>
                      {p.followers > 0 && (
                        <span className="text-xs font-semibold" style={{ color: "#f59e0b" }}>
                          {fmtNum(p.followers)} seguidores
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <EditPartnerDialog partner={p} token={token} toast={toast}
                      onSaved={updated => setPartners(prev => prev.map(x => x.id === updated.id ? { ...x, ...updated } : x))} />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/30 hover:text-white"
                      title="Atualizar perfil via tik.tools (requer Pro)"
                      onClick={() => void refreshPartner(p.id)}
                      disabled={refreshingId === p.id}>
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === p.id ? "animate-spin" : ""}`} />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/50 hover:text-red-400"
                      title="Remover parceiro"
                      onClick={() => void removePartner(p.id, p.tiktokHandle)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LandingPageTab({ allPlans }: { allPlans: Plan[] }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [landing, setLanding] = useState<LandingContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<"general" | "features" | "plans" | "cta" | "partners">("general");
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [editFeature, setEditFeature] = useState<LandingFeature>(EMPTY_FEATURE);
  const [editIsNew, setEditIsNew] = useState(true);

  const fetchLanding = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/landing", { headers: { Authorization: `Bearer ${token}` } });
      setLanding(await res.json() as LandingContent);
    } catch { toast({ title: "Erro ao carregar landing page", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [token, toast]);

  useEffect(() => { void fetchLanding(); }, [fetchLanding]);

  const save = async (patch: Partial<LandingContent>) => {
    if (!landing) return;
    setSaving(true);
    try {
      const updated = { ...landing, ...patch };
      const res = await fetch("/api/landing", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const data = await res.json() as LandingContent;
      setLanding(data);
      toast({ title: "Salvo!" });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const openAddFeature = () => {
    const nextOrder = landing ? Math.max(0, ...landing.features.map(f => f.order)) + 1 : 0;
    setEditFeature({ ...EMPTY_FEATURE, id: crypto.randomUUID(), order: nextOrder });
    setEditIsNew(true);
    setFeatureDialogOpen(true);
  };

  const openEditFeature = (f: LandingFeature) => {
    setEditFeature({ ...f });
    setEditIsNew(false);
    setFeatureDialogOpen(true);
  };

  const saveFeature = () => {
    if (!landing || !editFeature.title.trim()) return;
    const features = editIsNew
      ? [...landing.features, editFeature]
      : landing.features.map(f => f.id === editFeature.id ? editFeature : f);
    void save({ features });
    setFeatureDialogOpen(false);
  };

  const deleteFeature = (id: string) => {
    if (!landing) return;
    void save({ features: landing.features.filter(f => f.id !== id) });
  };

  const moveFeature = (id: string, dir: -1 | 1) => {
    if (!landing) return;
    const sorted = [...landing.features].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(f => f.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const newOrder = sorted[swapIdx]!.order;
    const swapOrder = sorted[idx]!.order;
    const features = landing.features.map(f => {
      if (f.id === id) return { ...f, order: newOrder };
      if (f.id === sorted[swapIdx]!.id) return { ...f, order: swapOrder };
      return f;
    });
    void save({ features });
  };

  const togglePlanVisibility = (planId: string, checked: boolean) => {
    if (!landing) return;
    const ids = checked
      ? [...landing.plans.visiblePlanIds, planId]
      : landing.plans.visiblePlanIds.filter(id => id !== planId);
    void save({ plans: { ...landing.plans, visiblePlanIds: ids } });
  };

  if (loading || !landing) {
    return <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;
  }

  const sorted = [...landing.features].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="flex items-center gap-1 flex-wrap">
        {(["general","features","plans","cta","partners"] as const).map(sec => (
          <Button
            key={sec}
            variant={activeSection === sec ? "secondary" : "ghost"}
            size="sm"
            className="capitalize h-7"
            onClick={() => setActiveSection(sec)}
          >
            {sec === "general" ? "Geral" : sec === "features" ? "Funcionalidades" : sec === "plans" ? "Planos" : sec === "cta" ? "CTA / Rodapé" : "⭐ Parceiros"}
          </Button>
        ))}
        <Button size="sm" variant="outline" className="h-7 ml-auto gap-1" onClick={() => window.open("/landing", "_blank")}>
          <ExternalLink className="w-3.5 h-3.5" /> Prévia
        </Button>
      </div>

      {/* GENERAL */}
      {activeSection === "general" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Configurações Gerais</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Landing Page Ativa</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Quando desativada, visitantes são redirecionados ao login.</p>
              </div>
              <Switch checked={landing.enabled} onCheckedChange={(v) => void save({ enabled: v })} />
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Título Principal</Label>
                <Input value={landing.hero.headline} onChange={e => setLanding(l => l ? ({ ...l, hero: { ...l.hero, headline: e.target.value } }) : l)} />
              </div>
              <div className="space-y-1.5">
                <Label>Subtítulo</Label>
                <Textarea rows={2} value={landing.hero.subheadline} onChange={e => setLanding(l => l ? ({ ...l, hero: { ...l.hero, subheadline: e.target.value } }) : l)} />
              </div>
              <div className="space-y-1.5">
                <Label>Texto do Botão CTA</Label>
                <Input value={landing.hero.ctaLabel} onChange={e => setLanding(l => l ? ({ ...l, hero: { ...l.hero, ctaLabel: e.target.value } }) : l)} />
              </div>
            </div>
            <Button onClick={() => void save({ hero: landing.hero })} disabled={saving} size="sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Geral
            </Button>
          </CardContent>
        </Card>
      )}

      {/* FEATURES */}
      {activeSection === "features" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Gerencie os cards de funcionalidades exibidos na landing page.</p>
            <Button size="sm" onClick={openAddFeature}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar
            </Button>
          </div>
          {sorted.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Globe className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhuma funcionalidade adicionada.</p>
                <Button size="sm" variant="outline" className="mt-4" onClick={openAddFeature}><Plus className="w-4 h-4 mr-2" />Adicionar</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sorted.map((feat, i) => (
                <Card key={feat.id}>
                  <CardContent className="pt-4 flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" className="h-5 w-5" disabled={i === 0} onClick={() => moveFeature(feat.id, -1)}>
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-5 w-5" disabled={i === sorted.length - 1} onClick={() => moveFeature(feat.id, 1)}>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{feat.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{feat.description}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{feat.icon}</Badge>
                    <div className="flex gap-1">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => openEditFeature(feat)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover funcionalidade?</AlertDialogTitle>
                            <AlertDialogDescription>O card <strong>{feat.title}</strong> será removido da landing page.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteFeature(feat.id)} className="bg-destructive text-white">Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PLANS */}
      {activeSection === "plans" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exibição de Planos</CardTitle>
            <CardDescription>Escolha quais planos aparecem na landing page e qual é o recomendado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {allPlans.filter(p => p.isActive).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(plan => (
              <div key={plan.id} className="flex items-center gap-4">
                <Checkbox
                  id={`vis-${plan.id}`}
                  checked={landing.plans.visiblePlanIds.includes(plan.id)}
                  onCheckedChange={v => togglePlanVisibility(plan.id, !!v)}
                />
                <label htmlFor={`vis-${plan.id}`} className="flex-1 text-sm font-medium cursor-pointer">{plan.name}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="recommended"
                    id={`rec-${plan.id}`}
                    checked={landing.plans.recommendedPlanId === plan.id}
                    onChange={() => void save({ plans: { ...landing.plans, recommendedPlanId: plan.id } })}
                    className="cursor-pointer"
                  />
                  <label htmlFor={`rec-${plan.id}`} className="text-xs text-muted-foreground cursor-pointer">Recomendado</label>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      {activeSection === "cta" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Faixa CTA / Rodapé</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Título da Faixa CTA</Label>
              <Input value={landing.cta.text} onChange={e => setLanding(l => l ? ({ ...l, cta: { ...l.cta, text: e.target.value } }) : l)} />
            </div>
            <div className="space-y-1.5">
              <Label>Subtexto</Label>
              <Input value={landing.cta.subtext} onChange={e => setLanding(l => l ? ({ ...l, cta: { ...l.cta, subtext: e.target.value } }) : l)} />
            </div>
            <div className="space-y-1.5">
              <Label>Texto do Botão</Label>
              <Input value={landing.cta.buttonLabel} onChange={e => setLanding(l => l ? ({ ...l, cta: { ...l.cta, buttonLabel: e.target.value } }) : l)} />
            </div>
            <Button onClick={() => void save({ cta: landing.cta })} disabled={saving} size="sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar CTA
            </Button>
          </CardContent>
        </Card>
      )}

      {/* PARTNERS */}
      {activeSection === "partners" && (
        <PartnersAdminSection token={token ?? ""} toast={toast} />
      )}

      {/* Feature Dialog */}
      <Dialog open={featureDialogOpen} onOpenChange={setFeatureDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editIsNew ? "Nova Funcionalidade" : "Editar Funcionalidade"}</DialogTitle>
            <DialogDescription>Preencha os detalhes do card de funcionalidade.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={editFeature.title} onChange={e => setEditFeature(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Monitor em Tempo Real" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea rows={2} value={editFeature.description} onChange={e => setEditFeature(f => ({ ...f, description: e.target.value }))} placeholder="Descrição da funcionalidade..." />
            </div>
            <div className="space-y-1.5">
              <Label>Ícone (Lucide)</Label>
              <Select value={editFeature.icon} onValueChange={v => setEditFeature(f => ({ ...f, icon: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LUCIDE_ICONS.map(ic => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>URL da Imagem (opcional)</Label>
              <Input value={editFeature.imageUrl} onChange={e => setEditFeature(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label>URL do Demo Animado (GIF/MP4, opcional)</Label>
              <Input value={editFeature.demoUrl} onChange={e => setEditFeature(f => ({ ...f, demoUrl: e.target.value }))} placeholder="https://...demo.mp4" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeatureDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveFeature} disabled={saving || !editFeature.title.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PÁGINAS & MENU
// ════════════════════════════════════════════════════════════════════════════
const MENU_ICON_LIST = [
  "LayoutDashboard","Activity","Users","Trophy","Monitor","Key","Star","Zap",
  "Shield","Globe","BarChart2","Radio","Search","Bell","Heart","Tv2","Gamepad2",
  "Code2","Home","Link2","Tag","Layers","Mic","Video","Wifi","Package","Award",
  "Hash","ExternalLink","BookOpen","FileText","Image","Database","Cpu","Server",
  "Sparkles","Crown","CreditCard","Palette","Lock","Users2","Settings2",
];
const MENU_ICON_MAP: Record<string, React.ComponentType<{className?: string}>> = {
  LayoutDashboard, Activity, Users, Trophy, Monitor, Key, Star, Zap,
  Shield, Globe, BarChart2, Radio, Search, Bell, Heart, Tv2, Gamepad2,
  Code2, Home, Link2, Tag, Layers, Mic, Video, Wifi, Package, Award,
  Hash, ExternalLink, BookOpen, FileText, Image, Database, Cpu, Server,
  Sparkles, Crown, CreditCard, Palette, Lock, Users2, Settings2,
};
function MenuIcon({ name, className }: { name: string; className?: string }) {
  const Ic = MENU_ICON_MAP[name] ?? Layout;
  return <Ic className={className} />;
}
const BADGE_COLOR_PRESETS = ["#a78bfa","#22c55e","#f97316","#f87171","#22d3ee","#fbbf24","#60a5fa","#ffffff"];
const ITEM_COLOR_PRESETS  = ["","#ffffff","#a78bfa","#22d3ee","#22c55e","#f97316","#f87171","#fbbf24"];
const BADGE_PRESETS = ["Novo","PRO","APP","Beta","Hot","Free"];
const EMPTY_ITEM_FORM = { label:"", href:"", icon:"Link2", color:"", badge:"", badgeColor:"#a78bfa", visible:true, external:false };

interface PageEntry {
  id: string; path: string; label: string; category: string; icon: string;
  matchPrefix?: string; defaultBadge?: string; defaultBadgeColor?: string; adminOnly?: boolean;
}
interface MenuNavItem {
  id: string; label: string; href: string; icon: string; visible: boolean;
  adminOnly?: boolean; requiresPlan?: string; matchPrefix?: string;
  badge?: string; badgeColor?: string; color?: string; external?: boolean; isCustom?: boolean;
  children?: MenuNavItem[];
}
interface MenuSection { id: string; label?: string; items: MenuNavItem[]; }
interface UICfgFull {
  logoText?: string; logoUrl?: string; navType?: string;
  sidebarSections: MenuSection[];
}

const ALL_APP_PAGES: PageEntry[] = [
  // PAINEL
  { id: "dashboard",           path: "/",                     label: "Dashboard",              category: "PAINEL",      icon: "LayoutDashboard" },
  { id: "monitor",             path: "/monitor/example",      label: "Monitor / Conexão",      category: "PAINEL",      icon: "Activity",    matchPrefix: "/monitor" },
  { id: "overlays",            path: "/overlays",             label: "Sobreposições",           category: "PAINEL",      icon: "Monitor",     matchPrefix: "/overlays" },
  // FERRAMENTAS
  { id: "events",              path: "/events",               label: "Eventos",                category: "FERRAMENTAS", icon: "Zap",         defaultBadge: "PRO",  defaultBadgeColor: "#f97316" },
  { id: "sound-alerts",        path: "/sound-alerts",         label: "Alertas Sonoros",        category: "FERRAMENTAS", icon: "Radio" },
  { id: "layout",              path: "/layout",               label: "Layout OBS",             category: "FERRAMENTAS", icon: "Monitor",     defaultBadge: "PRO",  defaultBadgeColor: "#f97316" },
  { id: "effect-battle",       path: "/effect-battle",        label: "Effect Battle",          category: "FERRAMENTAS", icon: "Sparkles",    defaultBadge: "PRO",  defaultBadgeColor: "#f97316" },
  { id: "troll-gift",          path: "/troll-gift",           label: "Troll Gift",             category: "FERRAMENTAS", icon: "Zap",         defaultBadge: "APP",  defaultBadgeColor: "#22d3ee" },
  { id: "album",               path: "/album",                label: "Álbum",                  category: "FERRAMENTAS", icon: "Layers" },
  { id: "stream-tools",        path: "/stream-tools",         label: "Stream Tools",           category: "FERRAMENTAS", icon: "Tv2" },
  // JOGOS
  { id: "minigames",           path: "/minigames",            label: "Minigames",              category: "JOGOS",       icon: "Gamepad2",    matchPrefix: "/minigames" },
  { id: "scoreboards",         path: "/scoreboards",          label: "Scoreboards",            category: "JOGOS",       icon: "Trophy" },
  // LIVE
  { id: "live-counts",         path: "/live-counts",          label: "Live Counts",            category: "LIVE",        icon: "Radio" },
  { id: "live-captions",       path: "/live-captions",        label: "Live Captions",          category: "LIVE",        icon: "Subtitles",   matchPrefix: "/live-captions" },
  { id: "live-analytics",      path: "/live-analytics",       label: "Live Analytics",         category: "LIVE",        icon: "BarChart2" },
  // RANKINGS
  { id: "leaderboards",        path: "/leaderboards",         label: "Leagues",                category: "RANKINGS",    icon: "Crown",       matchPrefix: "/leaderboards" },
  { id: "leaderboards-country",path: "/leaderboards/country", label: "Country Rankings",       category: "RANKINGS",    icon: "Globe" },
  { id: "gifters",             path: "/gifters",              label: "Gifters",                category: "RANKINGS",    icon: "Diamond",     matchPrefix: "/gifters" },
  // STREAMER
  { id: "streamer-lookup",     path: "/streamer/lookup",      label: "Buscar Creator",         category: "STREAMER",    icon: "Search" },
  { id: "streamer-bulk",       path: "/streamer/bulk-check",  label: "Verificar Múltiplos",    category: "STREAMER",    icon: "Users" },
  { id: "streamer-watchlist",  path: "/streamer/watchlist",   label: "Watchlist",              category: "STREAMER",    icon: "Bell" },
  { id: "streamer-jwt",        path: "/streamer/jwt",         label: "JWT Generator",          category: "STREAMER",    icon: "Key" },
  { id: "streamer-rate-limits",path: "/streamer/rate-limits", label: "Rate Limits",            category: "STREAMER",    icon: "Activity" },
  // OUTROS
  { id: "webhooks",            path: "/webhooks",             label: "Webhooks",               category: "OUTROS",      icon: "Webhook" },
  { id: "notifications",       path: "/notifications",        label: "Notificações",           category: "OUTROS",      icon: "Bell" },
  { id: "gift-gallery",        path: "/gift-gallery",         label: "Gift Gallery",           category: "OUTROS",      icon: "Diamond" },
  { id: "dev-tools",           path: "/dev-tools",            label: "Dev Tools",              category: "OUTROS",      icon: "Code2" },
  { id: "integracoes",         path: "/integracoes",          label: "Integrações",            category: "OUTROS",      icon: "Zap" },
  { id: "pricing",             path: "/pricing",              label: "Planos / Preços",        category: "OUTROS",      icon: "Tag" },
  { id: "settings",            path: "/settings",             label: "Configurações",          category: "OUTROS",      icon: "Settings",    adminOnly: true },
  { id: "admin",               path: "/admin",                label: "Admin Panel",            category: "OUTROS",      icon: "Shield",      adminOnly: true },
];

function ItemForm({
  form, setForm, onSave, onCancel, isCustom = false, saving,
}: {
  form: typeof EMPTY_ITEM_FORM;
  setForm: (f: typeof EMPTY_ITEM_FORM) => void;
  onSave: () => void;
  onCancel: () => void;
  isCustom?: boolean;
  saving: boolean;
}) {
  return (
    <div className="mt-2 rounded-xl p-3 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Nome no menu</Label>
          <Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Ex: Dashboard" className="text-sm" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">URL / Link</Label>
          <Input value={form.href} onChange={e => setForm({ ...form, href: e.target.value })} placeholder="/pagina" className="text-sm font-mono" readOnly={!isCustom && !!form.href && !form.href.startsWith("http")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Ícone</Label>
          <Select value={form.icon} onValueChange={v => setForm({ ...form, icon: v })}>
            <SelectTrigger className="text-sm">
              <div className="flex items-center gap-2"><MenuIcon name={form.icon} className="w-3.5 h-3.5 shrink-0" /><span>{form.icon}</span></div>
            </SelectTrigger>
            <SelectContent className="max-h-52">
              {MENU_ICON_LIST.map(ic => (
                <SelectItem key={ic} value={ic}>
                  <div className="flex items-center gap-2"><MenuIcon name={ic} className="w-3.5 h-3.5 shrink-0" />{ic}</div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Cor do texto</Label>
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            {ITEM_COLOR_PRESETS.map(c => (
              <button key={c || "default"} title={c || "Padrão"} onClick={() => setForm({ ...form, color: c })}
                className={`w-5 h-5 rounded-full border-2 transition-all ${form.color === c ? "border-white scale-110" : "border-transparent opacity-70 hover:opacity-100"}`}
                style={{ background: c || "rgba(255,255,255,0.2)" }} />
            ))}
            <input type="color" value={form.color || "#ffffff"} onChange={e => setForm({ ...form, color: e.target.value })}
              className="w-5 h-5 rounded-full cursor-pointer border-0 bg-transparent" title="Cor personalizada" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Badge</Label>
          <div className="flex gap-1 flex-wrap mb-1.5">
            {["", ...BADGE_PRESETS].map(b => (
              <button key={b || "none"} onClick={() => setForm({ ...form, badge: b })}
                className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-all ${form.badge === b ? "border-primary text-primary" : "border-white/10 text-muted-foreground hover:border-white/25"}`}>
                {b || "Nenhum"}
              </button>
            ))}
          </div>
          <Input value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} placeholder="Texto personalizado..." className="text-xs h-7" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Cor do badge</Label>
          <div className="flex items-center gap-1 flex-wrap mt-1">
            {BADGE_COLOR_PRESETS.map(c => (
              <button key={c} title={c} onClick={() => setForm({ ...form, badgeColor: c })}
                className={`w-5 h-5 rounded-full border-2 transition-all ${form.badgeColor === c ? "border-white scale-110" : "border-transparent opacity-70 hover:opacity-100"}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={form.visible} onCheckedChange={v => setForm({ ...form, visible: v })} />
            <Label className="text-xs">Visível</Label>
          </div>
          {isCustom && (
            <div className="flex items-center gap-2">
              <Switch checked={form.external} onCheckedChange={v => setForm({ ...form, external: v })} />
              <Label className="text-xs">Nova aba</Label>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

function PaginasSection() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [uiCfg, setUiCfg] = useState<UICfgFull | null>(null);
  const [cfgLoading, setCfgLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"structure" | "pages">("structure");
  const [saving, setSaving] = useState(false);

  const [showAddSection, setShowAddSection] = useState(false);
  const [newSecLabel, setNewSecLabel] = useState("");
  const [renamingSec, setRenamingSec] = useState<{ id: string; label: string } | null>(null);

  const [editingItem, setEditingItem] = useState<{ sectionId: string; itemId: string } | null>(null);
  const [itemForm, setItemForm] = useState<typeof EMPTY_ITEM_FORM>({ ...EMPTY_ITEM_FORM });

  const [addModeSec, setAddModeSec] = useState<{ sectionId: string; mode: "page" | "custom" } | null>(null);
  const [customForm, setCustomForm] = useState<typeof EMPTY_ITEM_FORM>({ ...EMPTY_ITEM_FORM });
  const [pageSearch, setPageSearch] = useState("");

  const load = useCallback(async () => {
    setCfgLoading(true);
    try {
      const res = await fetch("/api/ui-config");
      if (res.ok) setUiCfg(await res.json() as UICfgFull);
    } catch { /* ignore */ }
    setCfgLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const saveCfg = async (cfg: UICfgFull, msg = "Menu atualizado!") => {
    setSaving(true);
    try {
      await authFetch("/admin/ui-config", token!, { method: "PATCH", body: JSON.stringify(cfg) });
      setUiCfg(cfg);
      if (msg) toast({ title: msg });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSaving(false);
  };

  const addSection = () => {
    if (!uiCfg || !newSecLabel.trim()) return;
    void saveCfg({ ...uiCfg, sidebarSections: [...uiCfg.sidebarSections, { id: `sec_${Date.now()}`, label: newSecLabel.trim(), items: [] }] }, "Seção criada!");
    setNewSecLabel(""); setShowAddSection(false);
  };
  const deleteSection = (id: string) => {
    if (!uiCfg) return;
    void saveCfg({ ...uiCfg, sidebarSections: uiCfg.sidebarSections.filter(s => s.id !== id) }, "Seção removida!");
  };
  const renameSection = () => {
    if (!uiCfg || !renamingSec) return;
    void saveCfg({ ...uiCfg, sidebarSections: uiCfg.sidebarSections.map(s => s.id === renamingSec.id ? { ...s, label: renamingSec.label } : s) }, "Seção renomeada!");
    setRenamingSec(null);
  };
  const moveSection = (id: string, dir: -1 | 1) => {
    if (!uiCfg) return;
    const secs = [...uiCfg.sidebarSections];
    const idx = secs.findIndex(s => s.id === id);
    const ni = idx + dir;
    if (ni < 0 || ni >= secs.length) return;
    [secs[idx], secs[ni]] = [secs[ni], secs[idx]];
    void saveCfg({ ...uiCfg, sidebarSections: secs }, "");
  };

  const deleteItem = (sectionId: string, itemId: string) => {
    if (!uiCfg) return;
    void saveCfg({ ...uiCfg, sidebarSections: uiCfg.sidebarSections.map(s => s.id === sectionId ? { ...s, items: s.items.filter(it => it.id !== itemId) } : s) }, "Item removido!");
  };
  const moveItem = (sectionId: string, idx: number, dir: -1 | 1) => {
    if (!uiCfg) return;
    const secs = uiCfg.sidebarSections.map(s => {
      if (s.id !== sectionId) return s;
      const items = [...s.items]; const ni = idx + dir;
      if (ni < 0 || ni >= items.length) return s;
      [items[idx], items[ni]] = [items[ni], items[idx]];
      return { ...s, items };
    });
    void saveCfg({ ...uiCfg, sidebarSections: secs }, "");
  };
  const startEditItem = (sectionId: string, item: MenuNavItem) => {
    setEditingItem({ sectionId, itemId: item.id });
    setItemForm({ label: item.label, href: item.href, icon: item.icon || "Link2", color: item.color ?? "", badge: item.badge ?? "", badgeColor: item.badgeColor ?? "#a78bfa", visible: item.visible, external: item.external ?? false });
    setAddModeSec(null);
  };
  const saveEditItem = () => {
    if (!uiCfg || !editingItem) return;
    const secs = uiCfg.sidebarSections.map(s => {
      if (s.id !== editingItem.sectionId) return s;
      return { ...s, items: s.items.map(it => it.id !== editingItem.itemId ? it : { ...it, label: itemForm.label || it.label, href: itemForm.href || it.href, icon: itemForm.icon, color: itemForm.color || undefined, badge: itemForm.badge || undefined, badgeColor: itemForm.badge ? (itemForm.badgeColor || undefined) : undefined, visible: itemForm.visible, external: itemForm.external || undefined }) };
    });
    void saveCfg({ ...uiCfg, sidebarSections: secs }, "Item salvo!");
    setEditingItem(null);
  };

  const addPageToSection = (sectionId: string, page: PageEntry) => {
    if (!uiCfg) return;
    const newItem: MenuNavItem = { id: page.id, label: page.label, href: page.path, icon: page.icon, visible: true, matchPrefix: page.matchPrefix, badge: page.defaultBadge, badgeColor: page.defaultBadgeColor, adminOnly: page.adminOnly };
    void saveCfg({ ...uiCfg, sidebarSections: uiCfg.sidebarSections.map(s => s.id === sectionId ? { ...s, items: [...s.items, newItem] } : s) }, `"${page.label}" adicionado!`);
    setAddModeSec(null); setPageSearch("");
  };
  const addCustomItem = (sectionId: string) => {
    if (!uiCfg || !customForm.label.trim() || !customForm.href.trim()) return;
    const newItem: MenuNavItem = { id: `custom_${Date.now()}`, label: customForm.label.trim(), href: customForm.href.trim(), icon: customForm.icon, color: customForm.color || undefined, badge: customForm.badge || undefined, badgeColor: customForm.badge ? (customForm.badgeColor || undefined) : undefined, visible: true, external: customForm.external || undefined, isCustom: true };
    void saveCfg({ ...uiCfg, sidebarSections: uiCfg.sidebarSections.map(s => s.id === sectionId ? { ...s, items: [...s.items, newItem] } : s) }, `"${newItem.label}" adicionado!`);
    setCustomForm({ ...EMPTY_ITEM_FORM }); setAddModeSec(null);
  };

  function pageInMenu(page: PageEntry): { sectionLabel: string } | null {
    if (!uiCfg) return null;
    for (const sec of uiCfg.sidebarSections) {
      if (sec.items.some(it => it.id === page.id || it.href === page.path)) return { sectionLabel: sec.label ?? sec.id };
    }
    return null;
  }

  const categories = [...new Set(ALL_APP_PAGES.map(p => p.category))];

  if (cfgLoading) return <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>;
  if (!uiCfg) return <p className="text-sm text-muted-foreground py-6 text-center">Erro ao carregar configuração.</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Páginas & Menu</h2>
          <p className="text-sm text-muted-foreground">Gerencie seções, páginas e itens customizados do menu lateral.</p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => setActiveTab("structure")}
            className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${activeTab === "structure" ? "bg-purple-600 text-white" : "text-muted-foreground hover:text-white"}`}>
            <Layout className="w-3 h-3 inline mr-1.5" />Estrutura
          </button>
          <button onClick={() => setActiveTab("pages")}
            className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${activeTab === "pages" ? "bg-purple-600 text-white" : "text-muted-foreground hover:text-white"}`}>
            <FileText className="w-3 h-3 inline mr-1.5" />Páginas
          </button>
        </div>
      </div>

      {/* ── ESTRUTURA TAB ─────────────────────────────────────── */}
      {activeTab === "structure" && (
        <div className="space-y-3">
          {showAddSection ? (
            <Card><CardContent className="p-3">
              <div className="flex gap-2 items-center">
                <Input value={newSecLabel} onChange={e => setNewSecLabel(e.target.value)} placeholder='Nome da seção (ex: FERRAMENTAS)' className="text-sm flex-1" autoFocus
                  onKeyDown={e => { if (e.key === "Enter") addSection(); if (e.key === "Escape") { setShowAddSection(false); setNewSecLabel(""); } }} />
                <Button size="sm" onClick={addSection} disabled={!newSecLabel.trim() || saving}><Plus className="w-3.5 h-3.5 mr-1" />Criar</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddSection(false); setNewSecLabel(""); }}>Cancelar</Button>
              </div>
            </CardContent></Card>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowAddSection(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />Nova Seção
            </Button>
          )}

          {uiCfg.sidebarSections.length === 0 && (
            <div className="text-center py-14 text-muted-foreground text-sm space-y-2">
              <Layout className="w-9 h-9 mx-auto opacity-20" />
              <p>Nenhuma seção criada. Crie uma seção para montar o menu lateral.</p>
            </div>
          )}

          {uiCfg.sidebarSections.map((sec, secIdx) => {
            const isRenaming = renamingSec?.id === sec.id;
            return (
              <Card key={sec.id} className="overflow-hidden">
                {/* Section header */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5" style={{ background: "rgba(124,58,237,0.06)" }}>
                  <GripVertical className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                  {isRenaming ? (
                    <div className="flex gap-2 flex-1 items-center">
                      <Input value={renamingSec.label} onChange={e => setRenamingSec({ ...renamingSec, label: e.target.value })}
                        className="h-7 text-sm flex-1" autoFocus
                        onKeyDown={e => { if (e.key === "Enter") renameSection(); if (e.key === "Escape") setRenamingSec(null); }} />
                      <Button size="sm" className="h-7 px-2 text-xs" onClick={renameSection}>OK</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setRenamingSec(null)}>×</Button>
                    </div>
                  ) : (
                    <button className="flex-1 text-left text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors"
                      title="Clique para renomear" onClick={() => setRenamingSec({ id: sec.id, label: sec.label ?? "" })}>
                      {sec.label || <span className="italic text-white/20 normal-case tracking-normal font-normal">Sem nome — clique para nomear</span>}
                    </button>
                  )}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-white disabled:opacity-20 transition-colors"
                      onClick={() => moveSection(sec.id, -1)} disabled={secIdx === 0}><ChevronUp className="w-3.5 h-3.5" /></button>
                    <button className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-white disabled:opacity-20 transition-colors"
                      onClick={() => moveSection(sec.id, 1)} disabled={secIdx === uiCfg.sidebarSections.length - 1}><ChevronDown className="w-3.5 h-3.5" /></button>
                    <button className="p-1 rounded hover:bg-red-500/10 text-muted-foreground/30 hover:text-red-400 transition-colors ml-1"
                      onClick={() => deleteSection(sec.id)} title="Excluir seção"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {/* Items */}
                <CardContent className="p-2 space-y-0.5">
                  {sec.items.length === 0 && (
                    <p className="text-xs text-muted-foreground/30 text-center py-4">Nenhum item — adicione abaixo.</p>
                  )}
                  {sec.items.map((item, itemIdx) => {
                    const isEditingThis = editingItem?.sectionId === sec.id && editingItem?.itemId === item.id;
                    return (
                      <div key={item.id}>
                        <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg group transition-all ${isEditingThis ? "bg-purple-500/8 border border-purple-500/20" : "hover:bg-white/3"}`}>
                          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <MenuIcon name={item.icon} className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                              <span style={{ color: item.color || undefined }}>{item.label}</span>
                              {item.badge && (
                                <span className="text-[9px] font-bold px-1 py-0.5 rounded-full shrink-0"
                                  style={{ background: `${item.badgeColor ?? "#f97316"}20`, color: item.badgeColor ?? "#f97316" }}>{item.badge}</span>
                              )}
                              {item.isCustom && <span className="text-[9px] px-1 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 shrink-0">Custom</span>}
                              {!item.visible && <span className="text-[9px] px-1 py-0.5 rounded-full bg-white/5 text-white/25 shrink-0">Oculto</span>}
                            </p>
                            <p className="text-[10px] font-mono text-muted-foreground/35 truncate">{item.href}</p>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button className="p-1 rounded hover:bg-white/5 text-muted-foreground disabled:opacity-20" onClick={() => moveItem(sec.id, itemIdx, -1)} disabled={itemIdx === 0}><ChevronUp className="w-3 h-3" /></button>
                            <button className="p-1 rounded hover:bg-white/5 text-muted-foreground disabled:opacity-20" onClick={() => moveItem(sec.id, itemIdx, 1)} disabled={itemIdx === sec.items.length - 1}><ChevronDown className="w-3 h-3" /></button>
                            <button className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-white"
                              onClick={() => isEditingThis ? setEditingItem(null) : startEditItem(sec.id, item)}>
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button className="p-1 rounded hover:bg-red-500/10 text-muted-foreground/30 hover:text-red-400" onClick={() => deleteItem(sec.id, item.id)}><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                        {isEditingThis && (
                          <ItemForm form={itemForm} setForm={setItemForm} onSave={saveEditItem} onCancel={() => setEditingItem(null)} isCustom={!!(item.isCustom || item.external)} saving={saving} />
                        )}
                      </div>
                    );
                  })}

                  {/* Add item area */}
                  {addModeSec?.sectionId === sec.id ? (
                    <div className="mt-1 rounded-xl p-3 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      {addModeSec.mode === "custom" ? (
                        <>
                          <p className="text-xs font-semibold text-white/60">Novo item customizado</p>
                          <ItemForm form={customForm} setForm={setCustomForm}
                            onSave={() => addCustomItem(sec.id)}
                            onCancel={() => { setAddModeSec(null); setCustomForm({ ...EMPTY_ITEM_FORM }); }}
                            isCustom saving={saving} />
                        </>
                      ) : (
                        <>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input value={pageSearch} onChange={e => setPageSearch(e.target.value)} placeholder="Buscar página do sistema..." className="pl-8 text-sm h-8" autoFocus />
                          </div>
                          <div className="space-y-0.5 max-h-48 overflow-y-auto">
                            {ALL_APP_PAGES.filter(p => {
                              const alreadyIn = sec.items.some(it => it.id === p.id || it.href === p.path);
                              if (alreadyIn) return false;
                              if (!pageSearch) return true;
                              return p.label.toLowerCase().includes(pageSearch.toLowerCase()) || p.path.toLowerCase().includes(pageSearch.toLowerCase());
                            }).map(page => (
                              <button key={page.id} onClick={() => addPageToSection(sec.id, page)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-left transition-colors">
                                <MenuIcon name={page.icon} className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white">{page.label}</p>
                                  <p className="text-[10px] font-mono text-muted-foreground/40 truncate">{page.path}</p>
                                </div>
                                {page.defaultBadge && (
                                  <span className="text-[9px] font-bold px-1 py-0.5 rounded-full shrink-0"
                                    style={{ background: `${page.defaultBadgeColor ?? "#f97316"}20`, color: page.defaultBadgeColor ?? "#f97316" }}>{page.defaultBadge}</span>
                                )}
                              </button>
                            ))}
                          </div>
                          <div className="flex justify-end">
                            <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setAddModeSec(null); setPageSearch(""); }}>Fechar</Button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2 pt-1 pl-1">
                      <button className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center gap-1"
                        onClick={() => { setAddModeSec({ sectionId: sec.id, mode: "page" }); setEditingItem(null); setPageSearch(""); }}>
                        <Plus className="w-3 h-3" />Página do sistema
                      </button>
                      <span className="text-muted-foreground/20">·</span>
                      <button className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center gap-1"
                        onClick={() => { setAddModeSec({ sectionId: sec.id, mode: "custom" }); setEditingItem(null); setCustomForm({ ...EMPTY_ITEM_FORM }); }}>
                        <Plus className="w-3 h-3" />Item customizado
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── PÁGINAS TAB ───────────────────────────────────────── */}
      {activeTab === "pages" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={pageSearch} onChange={e => setPageSearch(e.target.value)} placeholder="Buscar página..." className="pl-9" />
          </div>
          {categories.map(cat => {
            const pages = ALL_APP_PAGES.filter(p =>
              p.category === cat && (!pageSearch || p.label.toLowerCase().includes(pageSearch.toLowerCase()) || p.path.toLowerCase().includes(pageSearch.toLowerCase()))
            );
            if (!pages.length) return null;
            return (
              <div key={cat}>
                <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: "rgba(255,255,255,0.25)" }}>{cat}</h3>
                <div className="space-y-1.5">
                  {pages.map(page => {
                    const inMenu = pageInMenu(page);
                    return (
                      <Card key={page.id} className={inMenu ? "border-purple-500/20" : "border-white/5"}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: inMenu ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.05)" }}>
                              <MenuIcon name={page.icon} className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{page.label}</p>
                              <p className="text-[10px] font-mono truncate" style={{ color: "rgba(255,255,255,0.3)" }}>{page.path}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {inMenu ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                  style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa" }}>{inMenu.sectionLabel}</span>
                              ) : (
                                <Select onValueChange={sId => { if (sId) addPageToSection(sId, page); }}>
                                  <SelectTrigger className="h-7 text-xs w-36">
                                    <SelectValue placeholder="Add ao menu..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {uiCfg.sidebarSections.map(s => (
                                      <SelectItem key={s.id} value={s.id}>{s.label ?? s.id}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: GIFTS TIKTOK
// ════════════════════════════════════════════════════════════════════════════
interface CustomGift {
  id: string; name: string; iconUrl: string; diamondCount: number;
  source: string; createdAt: string; updatedAt: string;
}

interface GiftDraft { name: string; iconUrl: string; diamondCount: string; }

function GiftsSection() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [brlRate, setBrlRate] = useState<string>("");
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingRate, setSavingRate] = useState(false);

  const [customGifts, setCustomGifts] = useState<CustomGift[]>([]);
  const [loadingGifts, setLoadingGifts] = useState(true);

  const [newGift, setNewGift] = useState<GiftDraft>({ name: "", iconUrl: "", diamondCount: "" });
  const [addingGift, setAddingGift] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<GiftDraft>({ name: "", iconUrl: "", diamondCount: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const d = await authFetch("/admin/gifts/settings", token!) as { brlPerUsd: number };
      setBrlRate(String(d.brlPerUsd));
    } catch { /* ignore */ }
    setLoadingSettings(false);
  }, [token]);

  const loadCustomGifts = useCallback(async () => {
    setLoadingGifts(true);
    try {
      const d = await authFetch("/admin/gifts/custom", token!) as CustomGift[];
      setCustomGifts(d ?? []);
    } catch { /* ignore */ }
    setLoadingGifts(false);
  }, [token]);

  useEffect(() => { void loadSettings(); void loadCustomGifts(); }, [loadSettings, loadCustomGifts]);

  const saveRate = async () => {
    const v = parseFloat(brlRate);
    if (isNaN(v) || v <= 0) { toast({ title: "Taxa inválida", variant: "destructive" }); return; }
    setSavingRate(true);
    try {
      await authFetch("/admin/gifts/settings", token!, { method: "PATCH", body: JSON.stringify({ brlPerUsd: v }) });
      toast({ title: "Taxa BRL/USD atualizada!" });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Erro ao salvar", variant: "destructive" });
    }
    setSavingRate(false);
  };

  const addGift = async () => {
    const diamonds = parseInt(newGift.diamondCount, 10);
    if (!newGift.name.trim() || isNaN(diamonds) || diamonds < 0) {
      toast({ title: "Nome e diamonds (≥ 0) são obrigatórios", variant: "destructive" }); return;
    }
    setAddingGift(true);
    try {
      await authFetch("/admin/gifts/custom", token!, {
        method: "POST",
        body: JSON.stringify({ name: newGift.name, iconUrl: newGift.iconUrl, diamondCount: diamonds }),
      });
      toast({ title: "Gift adicionado!" });
      setNewGift({ name: "", iconUrl: "", diamondCount: "" });
      void loadCustomGifts();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Erro ao adicionar", variant: "destructive" });
    }
    setAddingGift(false);
  };

  const saveEdit = async () => {
    if (!editId) return;
    const diamonds = parseInt(editDraft.diamondCount, 10);
    if (!editDraft.name.trim() || isNaN(diamonds) || diamonds < 0) {
      toast({ title: "Dados inválidos", variant: "destructive" }); return;
    }
    setSavingEdit(true);
    try {
      await authFetch(`/admin/gifts/custom/${editId}`, token!, {
        method: "PATCH",
        body: JSON.stringify({ name: editDraft.name, iconUrl: editDraft.iconUrl, diamondCount: diamonds }),
      });
      toast({ title: "Gift atualizado!" });
      setEditId(null);
      void loadCustomGifts();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Erro ao atualizar", variant: "destructive" });
    }
    setSavingEdit(false);
  };

  const deleteGift = async (id: string) => {
    setDeletingId(id);
    try {
      await authFetch(`/admin/gifts/custom/${id}`, token!, { method: "DELETE" });
      toast({ title: "Gift removido" });
      void loadCustomGifts();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Erro ao remover", variant: "destructive" });
    }
    setDeletingId(null);
  };

  const openEdit = (g: CustomGift) => {
    setEditId(g.id);
    setEditDraft({ name: g.name, iconUrl: g.iconUrl, diamondCount: String(g.diamondCount) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Diamond className="w-5 h-5 text-yellow-400" />Gift Gallery — Configuração
        </h2>
        <p className="text-sm text-muted-foreground">
          Ajuste a taxa BRL/USD e gerencie gifts personalizados exibidos na Gift Gallery.
        </p>
      </div>

      {/* BRL Rate */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-400" />Taxa de Conversão BRL/USD
          </CardTitle>
          <CardDescription className="text-xs">
            Define quantos reais equivalem a 1 dólar para calcular valores em BRL na Gift Gallery.
            Ex: 5.5 significa R$5,50 por USD.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSettings ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" />Carregando...</div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">R$1 USD =</span>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={brlRate}
                  onChange={(e) => setBrlRate(e.target.value)}
                  className="pl-24 w-44 font-mono"
                  placeholder="5.50"
                />
              </div>
              <span className="text-sm text-muted-foreground font-mono">BRL</span>
              <Button size="sm" onClick={saveRate} disabled={savingRate}>
                {savingRate ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                Salvar
              </Button>
              <p className="text-xs text-muted-foreground font-mono ml-2">
                1 💎 = {brlRate ? `R$${(0.005 * parseFloat(brlRate || "0")).toFixed(4)}` : "—"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add custom gift */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-violet-400" />Adicionar Gift Personalizado
          </CardTitle>
          <CardDescription className="text-xs">
            Gifts adicionados aqui aparecem na Gift Gallery e sobrepõem dados da API se o ID coincidir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Nome do gift *</Label>
              <Input
                placeholder="Ex: Cyber Lion"
                value={newGift.name}
                onChange={(e) => setNewGift((p) => ({ ...p, name: e.target.value }))}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Diamonds (coins) *</Label>
              <Input
                type="number"
                min={0}
                placeholder="Ex: 29999"
                value={newGift.diamondCount}
                onChange={(e) => setNewGift((p) => ({ ...p, diamondCount: e.target.value }))}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">URL do ícone (opcional)</Label>
              <Input
                placeholder="https://..."
                value={newGift.iconUrl}
                onChange={(e) => setNewGift((p) => ({ ...p, iconUrl: e.target.value }))}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <Button size="sm" onClick={addGift} disabled={addingGift}>
            {addingGift ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
            Adicionar
          </Button>
        </CardContent>
      </Card>

      {/* Custom gifts list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Diamond className="w-4 h-4 text-yellow-400" />Gifts Personalizados
              <Badge variant="outline" className="text-xs ml-1">{customGifts.length}</Badge>
            </CardTitle>
            <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => void loadCustomGifts()} disabled={loadingGifts}>
              <RefreshCcw className={`w-3.5 h-3.5 ${loadingGifts ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingGifts ? (
            <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
          ) : customGifts.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhum gift personalizado adicionado ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">💎 Diamonds</TableHead>
                  <TableHead>Ícone URL</TableHead>
                  <TableHead>Adicionado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customGifts.map((g) => (
                  <TableRow key={g.id}>
                    {editId === g.id ? (
                      <>
                        <TableCell>
                          <Input
                            value={editDraft.name}
                            onChange={(e) => setEditDraft((p) => ({ ...p, name: e.target.value }))}
                            className="h-7 text-sm font-mono"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={editDraft.diamondCount}
                            onChange={(e) => setEditDraft((p) => ({ ...p, diamondCount: e.target.value }))}
                            className="h-7 text-sm font-mono w-28 ml-auto"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editDraft.iconUrl}
                            onChange={(e) => setEditDraft((p) => ({ ...p, iconUrl: e.target.value }))}
                            className="h-7 text-sm font-mono"
                            placeholder="https://..."
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(g.createdAt).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-green-400 hover:text-green-300" onClick={saveEdit} disabled={savingEdit}>
                              {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => setEditId(null)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium text-sm">{g.name}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-cyan-400">{g.diamondCount.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono max-w-[180px] truncate">
                          {g.iconUrl || <span className="italic">—</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(g.createdAt).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(g)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-300">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover gift?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    O gift &quot;{g.name}&quot; será removido da lista de gifts personalizados.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => void deleteGift(g.id)}
                                    disabled={deletingId === g.id}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    {deletingId === g.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: BANCO DE DADOS
// ════════════════════════════════════════════════════════════════════════════
function BancoDadosSection() {
  const { token } = useAuth();
  const { toast } = useToast();

  interface DbInfo { source: string; host: string; database: string; user: string; port: string; maskedUrl: string | null; }
  const [info, setInfo] = useState<DbInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [restartNeeded, setRestartNeeded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await authFetch("/admin/db-config", token!) as DbInfo;
      setInfo(d);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const testConnection = async () => {
    setTesting(true); setTestResult(null);
    try {
      const body: Record<string, string> = {};
      if (newUrl.trim()) body.url = newUrl.trim();
      const r = await authFetch("/admin/db-config/test", token!, { method: "POST", body: JSON.stringify(body) }) as { ok: boolean; message: string };
      setTestResult(r);
    } catch { setTestResult({ ok: false, message: "Erro de conexão" }); }
    setTesting(false);
  };

  const saveUrl = async () => {
    if (!newUrl.trim()) return;
    setSaving(true);
    try {
      await authFetch("/admin/db-config", token!, { method: "PATCH", body: JSON.stringify({ url: newUrl.trim() }) });
      toast({ title: "URL salva! Reinicie o servidor para aplicar." });
      setNewUrl(""); setRestartNeeded(true); void load();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSaving(false);
  };

  const sourceLabel: Record<string, string> = { env: "Variável de ambiente (DATABASE_URL)", file: "Arquivo de configuração (db-config.json)", none: "Não configurado" };
  const sourceBadgeClass: Record<string, string> = { env: "bg-blue-500/10 text-blue-400 border-blue-500/20", file: "bg-amber-500/10 text-amber-400 border-amber-500/20", none: "bg-red-500/10 text-red-400 border-red-500/20" };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Banco de Dados</h2>
        <p className="text-sm text-muted-foreground">Conexão PostgreSQL — visualize e altere a URL de acesso ao banco.</p>
      </div>

      {restartNeeded && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/30" style={{ background: "rgba(245,158,11,0.08)" }}>
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">Nova URL salva. <strong>Reinicie o servidor</strong> para aplicar as mudanças.</p>
        </div>
      )}

      {/* Status atual */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <CardTitle className="text-sm">Conexão Atual</CardTitle>
            {info && <Badge className={`text-xs ${sourceBadgeClass[info.source] ?? ""}`}>{sourceLabel[info.source] ?? info.source}</Badge>}
            <Button size="icon" variant="ghost" className="w-6 h-6 ml-auto" onClick={() => void load()} disabled={loading}>
              <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" />Carregando...</div>
          ) : info ? (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Host", value: info.host },
                  { label: "Banco", value: info.database },
                  { label: "Usuário", value: info.user },
                  { label: "Porta", value: info.port },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <p className="font-mono font-medium text-white">{value}</p>
                  </div>
                ))}
              </div>
              {info.maskedUrl && (
                <div className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <p className="text-xs text-muted-foreground mb-0.5">URL (senha mascarada)</p>
                  <p className="font-mono text-xs text-muted-foreground break-all">{info.maskedUrl}</p>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={testConnection} disabled={testing}>
                {testing ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Testando…</> : <><Activity className="w-3.5 h-3.5 mr-1.5" />Testar conexão atual</>}
              </Button>
              {testResult && (
                <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${testResult.ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                  {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                  {testResult.message}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Não foi possível carregar informações do banco.</p>
          )}
        </CardContent>
      </Card>

      {/* Alterar URL */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-purple-400" />
            <CardTitle className="text-sm">Alterar URL de Conexão</CardTitle>
          </div>
          <CardDescription>
            Salva em <code className="text-xs bg-muted/30 px-1 rounded">data/db-config.json</code>. A variável de ambiente <code className="text-xs bg-muted/30 px-1 rounded">DATABASE_URL</code> tem prioridade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Input
              type={showUrl ? "text" : "password"}
              placeholder="postgresql://user:senha@host:5432/database"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="pr-10 font-mono text-sm"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowUrl((v) => !v)}>
              {showUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveUrl} disabled={saving || !newUrl.trim()}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}Salvar URL
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setTestResult(null); testConnection(); }} disabled={testing || !newUrl.trim()}>
              {testing ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Testando…</> : <><Activity className="w-3.5 h-3.5 mr-1.5" />Testar nova URL</>}
            </Button>
          </div>
          {testResult && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${testResult.ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
              {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              {testResult.message}
            </div>
          )}
          <div className="rounded-lg px-3 py-2.5 text-xs text-muted-foreground" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="font-medium text-white/60 mb-1">Formato esperado:</p>
            <code className="font-mono">postgresql://usuario:senha@host:5432/nome_banco</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SUPORTE SECTION
// ════════════════════════════════════════════════════════════════════════════
interface AdminTicket {
  id: string; type: string; status: string;
  userId: string; userEmail: string; userName: string;
  oldValue?: string; newValue: string;
  reason: string; customReason?: string;
  adminNote?: string; createdAt: string; resolvedAt?: string; resolvedBy?: string;
}
interface AdminMessage {
  id: string; ticketId: string; fromAdmin: boolean; authorName: string; text: string; createdAt: string;
}

const TICKET_REASON_LABELS: Record<string, string> = {
  rebrand:     "Rebranding / mudança de nome",
  typo:        "Erro de digitação no cadastro",
  privacy:     "Privacidade / segurança",
  new_account: "Nova conta no TikTok",
  other:       "Outro motivo",
};
const TICKET_STATUS_LABELS: Record<string, string> = {
  pending:   "Pendente",
  approved:  "Aprovado",
  denied:    "Negado",
  cancelled: "Cancelado",
};
const TICKET_STATUS_COLORS: Record<string, string> = {
  pending:   "text-amber-400 border-amber-400/30 bg-amber-400/10",
  approved:  "text-green-400 border-green-400/30 bg-green-400/10",
  denied:    "text-destructive border-destructive/30 bg-destructive/10",
  cancelled: "text-muted-foreground border-muted bg-muted/20",
};

function SuporteSection() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets]     = useState<AdminTicket[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<"all" | "pending" | "approved" | "denied" | "cancelled">("pending");
  const [search, setSearch]       = useState("");
  const [messages, setMessages]   = useState<Record<string, AdminMessage[]>>({});
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [actionNote, setActionNote] = useState<Record<string, string>>({});
  const [acting, setActing]       = useState<string | null>(null);
  const [chatText, setChatText]   = useState<Record<string, string>>({});
  const [chatSending, setChatSending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await authFetch("/admin/support/tickets", token!) as { tickets: AdminTicket[] };
      setTickets(d.tickets ?? []);
    } catch { toast({ title: "Erro ao carregar tickets", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [token, toast]);

  useEffect(() => { void load(); }, [load]);

  // Auto-refresh every 15s so admin sees new tickets without manual refresh
  useEffect(() => {
    const interval = setInterval(() => { void load(); }, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function loadMessages(ticketId: string) {
    if (messages[ticketId]) return;
    try {
      const d = await authFetch(`/support/tickets/${ticketId}/messages`, token!) as { messages: AdminMessage[] };
      setMessages((p) => ({ ...p, [ticketId]: d.messages ?? [] }));
    } catch { /* silent */ }
  }

  async function sendMessage(ticketId: string) {
    const text = chatText[ticketId]?.trim();
    if (!text) return;
    setChatSending(ticketId);
    try {
      await authFetch(`/support/tickets/${ticketId}/messages`, token!, { method: "POST", body: JSON.stringify({ text }) });
      setChatText((p) => ({ ...p, [ticketId]: "" }));
      const d = await authFetch(`/support/tickets/${ticketId}/messages`, token!) as { messages: AdminMessage[] };
      setMessages((p) => ({ ...p, [ticketId]: d.messages ?? [] }));
    } catch (err) {
      toast({ title: "Erro ao enviar mensagem", description: err instanceof Error ? err.message : "Erro", variant: "destructive" });
    } finally { setChatSending(null); }
  }

  async function handleAction(ticketId: string, action: "approve" | "deny") {
    setActing(ticketId);
    try {
      await authFetch(`/admin/support/tickets/${ticketId}`, token!, {
        method: "PATCH",
        body: JSON.stringify({ action, adminNote: actionNote[ticketId] ?? "" }),
      });
      toast({ title: action === "approve" ? "Ticket aprovado!" : "Ticket negado" });
      setExpanded(null);
      await load();
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Erro", variant: "destructive" });
    } finally { setActing(null); }
  }

  const pending = tickets.filter((t) => t.status === "pending").length;
  const filtered = tickets.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.userEmail.toLowerCase().includes(q) ||
        t.userName.toLowerCase().includes(q) ||
        t.newValue.toLowerCase().includes(q) ||
        (t.oldValue ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-violet-400" />
            Tickets de Suporte
            {pending > 0 && (
              <Badge className="ml-1 bg-amber-400/20 text-amber-300 border-amber-400/30 text-xs">{pending} pendente{pending !== 1 ? "s" : ""}</Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie solicitações de alteração de username e outras requisições</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Buscar por usuário ou @..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-background border-border text-sm h-9" />
        </div>
        {(["all", "pending", "approved", "denied", "cancelled"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"}
            className={filter === f ? "bg-violet-600 hover:bg-violet-700" : ""}
            onClick={() => setFilter(f)}>
            {f === "all" ? "Todos" : TICKET_STATUS_LABELS[f]}
          </Button>
        ))}
      </div>

      {loading && <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" /><span>Carregando tickets…</span></div>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum ticket encontrado</p>
        </div>
      )}

      {!loading && filtered.map((ticket) => {
        const isOpen = expanded === ticket.id;
        const msgs   = messages[ticket.id] ?? [];

        return (
          <Card key={ticket.id} className={`bg-card border-border overflow-hidden ${ticket.status === "pending" ? "border-amber-400/20" : ""}`}>
            <CardContent className="p-0">
              {/* Header row */}
              <div className="flex items-start gap-3 p-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-xs border ${TICKET_STATUS_COLORS[ticket.status]}`}>
                      {TICKET_STATUS_LABELS[ticket.status]}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">{ticket.id.slice(-8)}</span>
                    <span className="text-xs text-muted-foreground">{new Date(ticket.createdAt).toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-white">{ticket.userName}</span>
                    <span className="text-muted-foreground text-xs">{ticket.userEmail}</span>
                  </div>
                  <p className="text-sm">
                    <span className="text-muted-foreground">{ticket.oldValue ? `@${ticket.oldValue}` : "sem vínculo"}</span>
                    <span className="mx-2 text-muted-foreground">→</span>
                    <span className="font-semibold text-violet-300">@{ticket.newValue}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {TICKET_REASON_LABELS[ticket.reason] ?? ticket.reason}
                    {ticket.customReason && `: ${ticket.customReason}`}
                  </p>
                  {ticket.adminNote && (
                    <p className="text-xs italic text-muted-foreground">Nota: {ticket.adminNote}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" variant="ghost" className="text-xs gap-1 h-8 px-2"
                    onClick={async () => {
                      const next = isOpen ? null : ticket.id;
                      setExpanded(next);
                      if (next) await loadMessages(next);
                    }}>
                    <MessageSquare className="w-3.5 h-3.5" />
                    {msgs.length > 0 ? msgs.length : "Chat"}
                    <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </Button>
                  {ticket.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline"
                        className="text-green-400 border-green-400/30 hover:bg-green-400/10 h-8 px-2 text-xs"
                        disabled={acting === ticket.id}
                        onClick={() => void handleAction(ticket.id, "approve")}>
                        {acting === ticket.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span className="ml-1 hidden sm:inline">Aprovar</span>
                      </Button>
                      <Button size="sm" variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10 h-8 px-2 text-xs"
                        disabled={acting === ticket.id}
                        onClick={() => void handleAction(ticket.id, "deny")}>
                        {acting === ticket.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                        <span className="ml-1 hidden sm:inline">Negar</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Expanded: admin note + chat */}
              {isOpen && (
                <div className="border-t border-border bg-background/40 p-4 space-y-4">
                  {/* Admin note input (pending only) */}
                  {ticket.status === "pending" && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Nota para o usuário (opcional)</Label>
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Explique a decisão, ou deixe em branco…"
                          value={actionNote[ticket.id] ?? ""}
                          onChange={(e) => setActionNote((p) => ({ ...p, [ticket.id]: e.target.value }))}
                          className="bg-background border-border text-sm resize-none h-16 flex-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs gap-1" disabled={acting === ticket.id}
                          onClick={() => void handleAction(ticket.id, "approve")}>
                          <Check className="w-3.5 h-3.5" />Aprovar com nota
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive border-destructive/30 text-xs gap-1" disabled={acting === ticket.id}
                          onClick={() => void handleAction(ticket.id, "deny")}>
                          <X className="w-3.5 h-3.5" />Negar com nota
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Chat */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mensagens</p>
                    {msgs.length === 0 && <p className="text-xs text-muted-foreground italic">Sem mensagens ainda</p>}
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {msgs.map((m) => (
                        <div key={m.id} className={`flex gap-2 ${m.fromAdmin ? "flex-row-reverse" : ""}`}>
                          <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${m.fromAdmin ? "bg-violet-600/20 border border-violet-400/20 text-right" : "bg-background border border-border"}`}>
                            <p className="text-xs font-semibold text-muted-foreground mb-0.5">{m.fromAdmin ? "🛡 " : ""}{m.authorName}</p>
                            <p className="text-sm leading-snug">{m.text}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{new Date(m.createdAt).toLocaleString("pt-BR")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enviar mensagem ao usuário…"
                        value={chatText[ticket.id] ?? ""}
                        onChange={(e) => setChatText((p) => ({ ...p, [ticket.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(ticket.id); } }}
                        className="flex-1 bg-background border-border text-sm h-9"
                        disabled={chatSending === ticket.id}
                      />
                      <Button size="sm" onClick={() => void sendMessage(ticket.id)} disabled={chatSending === ticket.id || !chatText[ticket.id]?.trim()}>
                        {chatSending === ticket.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN PAGE
// ════════════════════════════════════════════════════════════════════════════
type AdminSection = "overview" | "users" | "roles" | "plans" | "announcements" | "content" | "customization" | "landing" | "sistema" | "paginas" | "database" | "support" | "gifts";

const ADMIN_NAV: Array<{ id: AdminSection; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }> = [
  { id: "overview",      label: "Visão Geral",       icon: LayoutDashboard },
  { id: "users",         label: "Usuários",           icon: Users2 },
  { id: "roles",         label: "Funções",            icon: Star },
  { id: "plans",         label: "Planos",             icon: CreditCard },
  { id: "announcements", label: "Anúncios",           icon: Bell },
  { id: "support",       label: "Suporte",            icon: MessageSquare },
  { id: "paginas",       label: "Páginas",            icon: FileText },
  { id: "content",       label: "Conteúdo",           icon: BookOpen },
  { id: "customization", label: "Customização",       icon: Palette },
  { id: "landing",       label: "Landing Page",       icon: Globe },
  { id: "gifts",         label: "Gifts TikTok",       icon: Diamond },
  { id: "database",      label: "Banco de Dados",     icon: Database },
  { id: "sistema",       label: "Sistema",            icon: Server },
];

export default function Admin() {
  const { token } = useAuth();
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [roles, setRoles] = useState<Role[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [permissions, setPermissions] = useState<PermissionDef[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchRoles = useCallback(async () => {
    try {
      const data = await authFetch("/admin/roles", token!) as { roles: Role[]; permissions: PermissionDef[] };
      setRoles(data.roles ?? []); if (data.permissions?.length) setPermissions(data.permissions);
    } catch { /* ignore */ }
  }, [token]);

  const fetchPlans = useCallback(async () => {
    try {
      const data = await authFetch("/admin/plans", token!) as { plans: Plan[]; permissions: PermissionDef[] };
      setPlans(data.plans ?? []); if (data.permissions?.length) setPermissions(data.permissions);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { void fetchRoles(); void fetchPlans(); }, [fetchRoles, fetchPlans]);

  const active = ADMIN_NAV.find((n) => n.id === activeSection);

  return (
    <div className="flex gap-0 -mx-4 -mt-4 min-h-[calc(100vh-80px)]" style={{ marginLeft: "-1.5rem", marginRight: "-1.5rem", marginTop: "-1.5rem" }}>

      {/* Sidebar */}
      <aside className={`w-56 shrink-0 border-r border-white/8 flex flex-col py-4 px-2 hidden lg:flex`}
        style={{ background: "rgba(10,8,20,0.8)" }}>
        <div className="flex items-center gap-2 px-3 mb-6">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(239,68,68,0.15)" }}>
            <Shield className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Painel Admin</p>
            <p className="text-xs text-red-400 font-semibold">Master</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button key={item.id} onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm ${
                  isActive
                    ? "bg-purple-500/15 text-white font-semibold"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                }`}>
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-purple-400" : ""}`} />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(124,58,237,0.3)", color: "#a78bfa" }}>{item.badge}</span>
                )}
                {isActive && <div className="w-1 h-1 rounded-full bg-purple-400" />}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile top nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/8 flex overflow-x-auto"
        style={{ background: "rgba(10,8,20,0.95)" }}>
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button key={item.id} onClick={() => setActiveSection(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 text-xs shrink-0 ${isActive ? "text-purple-400" : "text-muted-foreground"}`}>
              <Icon className="w-4 h-4" />
              {item.label.split(" ")[0]}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 p-6 overflow-y-auto">
        {activeSection === "overview"      && <VisaoGeralSection />}
        {activeSection === "users"         && <UsuariosSection roles={roles} />}
        {activeSection === "roles"         && <FuncoesSection roles={roles} permissions={permissions} onRefresh={fetchRoles} />}
        {activeSection === "plans"         && <PlanosSection plans={plans} permissions={permissions} onRefresh={fetchPlans} />}
        {activeSection === "announcements" && <AnunciosSection />}
        {activeSection === "paginas"       && <PaginasSection />}
        {activeSection === "content"       && <ConteudoSection />}
        {activeSection === "customization" && <CustomizacaoSection />}
        {activeSection === "landing"       && <LandingPageTab allPlans={plans} />}
        {activeSection === "gifts"         && <GiftsSection />}
        {activeSection === "database"      && <BancoDadosSection />}
        {activeSection === "sistema"       && <SistemaSection />}
        {activeSection === "support"       && <SuporteSection />}
      </div>
    </div>
  );
}
