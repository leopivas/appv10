import { useEffect, useState } from "react";
import { useAuth, authFetch } from "@/context/auth-context";
import { Redirect } from "wouter";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Server as ServerIcon, Plus, Play, Square, RefreshCw, Trash2, Key, Copy } from "lucide-react";

type Emulator = {
  id: string; name: string; processCmd: string; workingDir: string | null;
  autoStart: boolean; status: string; pid: number | null; lastError: string | null;
  updatedAt: number;
};
type Server = {
  id: string; name: string; description: string | null; hostname: string | null;
  tags: string | null; online: boolean; lastSeenAt: number | null;
  agentKeyMasked: string; os: string | null; agentVersion: string | null;
  cpu: number; memUsedMb: number; memTotalMb: number;
  emulators: Emulator[];
};

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5" data-testid="server-status">
      <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} />
      <span className="text-xs uppercase tracking-wider">{online ? "Online" : "Offline"}</span>
    </span>
  );
}

function EmuStatusBadge({ status }: { status: string }) {
  const c: Record<string,string> = {
    running: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    starting: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    stopping: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    stopped: "bg-neutral-500/20 text-neutral-300 border-neutral-500/40",
    error: "bg-red-500/20 text-red-300 border-red-500/40",
  };
  return <Badge className={c[status] ?? c.stopped}>{status}</Badge>;
}

export default function ServersPage() {
  const { user, loading, token } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newHost, setNewHost] = useState("");
  const [showKey, setShowKey] = useState<{ id: string; key: string } | null>(null);
  const [emuForms, setEmuForms] = useState<Record<string, { name: string; cmd: string; dir: string }>>({});

  const api = <T,>(path: string, init?: RequestInit) => authFetch(path, token, init) as Promise<T>;

  async function load() {
    try {
      const j = await api<{ servers: Server[] }>("/servers");
      setServers(j.servers);
    } catch (e) { toast.error(String((e as Error).message)); }
  }

  useEffect(() => {
    if (!user?.isAdmin || !token) return;
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
     
  }, [user?.isAdmin, token]);

  if (loading) return <div className="p-6 text-neutral-400">Carregando…</div>;
  if (!user?.isAdmin) return <Redirect to="/" />;

  async function createServer() {
    if (!newName.trim()) { toast.error("Nome obrigatório"); return; }
    try {
      const j = await api<{ server: Server & { agentKey: string } }>("/servers", {
        method: "POST",
        body: JSON.stringify({ name: newName, description: newDesc, hostname: newHost }),
      });
      toast.success("Servidor criado");
      setNewName(""); setNewDesc(""); setNewHost(""); setCreating(false);
      setShowKey({ id: j.server.id, key: j.server.agentKey });
      load();
    } catch (e) { toast.error(String((e as Error).message)); }
  }

  async function revealKey(id: string) {
    const j = await api<{ agentKey: string }>(`/servers/${id}/agent-key`);
    setShowKey({ id, key: j.agentKey });
  }
  async function rotateKey(id: string) {
    if (!confirm("Rotacionar chave? O agent atual vai parar de responder até você atualizar.")) return;
    const j = await api<{ agentKey: string }>(`/servers/${id}/rotate-key`, { method: "POST" });
    setShowKey({ id, key: j.agentKey });
    load();
  }
  async function removeServer(id: string) {
    if (!confirm("Excluir servidor e todos seus emuladores?")) return;
    await api(`/servers/${id}`, { method: "DELETE" });
    toast.success("Servidor removido");
    load();
  }
  async function sendCmd(serverId: string, emulatorId: string | undefined, action: string) {
    try {
      await api(`/servers/${serverId}/commands`, {
        method: "POST",
        body: JSON.stringify({ action, emulatorId }),
      });
      toast.success(`${action} enfileirado`);
      load();
    } catch (e) { toast.error(String((e as Error).message)); }
  }
  async function addEmulator(serverId: string) {
    const f = emuForms[serverId] ?? { name: "", cmd: "", dir: "" };
    if (!f.name.trim() || !f.cmd.trim()) { toast.error("Nome e comando obrigatórios"); return; }
    await api(`/servers/${serverId}/emulators`, {
      method: "POST",
      body: JSON.stringify({ name: f.name, processCmd: f.cmd, workingDir: f.dir, autoStart: false }),
    });
    setEmuForms((p) => ({ ...p, [serverId]: { name: "", cmd: "", dir: "" } }));
    load();
  }
  async function removeEmu(serverId: string, emuId: string) {
    if (!confirm("Excluir emulador?")) return;
    await api(`/servers/${serverId}/emulators/${emuId}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="p-6 space-y-6" data-testid="servers-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ServerIcon className="h-6 w-6" /> Servidores & Emuladores
          </h1>
          <p className="text-sm text-neutral-400">Gerencie servidores remotos, ligue/desligue processos e monitore em tempo real.</p>
        </div>
        <Button data-testid="add-server-btn" onClick={() => setCreating(!creating)}>
          <Plus className="h-4 w-4 mr-2" /> Novo servidor
        </Button>
      </div>

      {creating && (
        <Card data-testid="create-server-form">
          <CardHeader><CardTitle className="text-base">Adicionar servidor</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div><Label>Nome</Label><Input data-testid="new-server-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="VPS-Hostinger-01"/></div>
            <div><Label>Hostname / IP</Label><Input data-testid="new-server-host" value={newHost} onChange={(e) => setNewHost(e.target.value)} placeholder="123.45.67.89"/></div>
            <div><Label>Descrição</Label><Input data-testid="new-server-desc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="opcional"/></div>
            <div className="md:col-span-3 flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setCreating(false)}>Cancelar</Button>
              <Button data-testid="save-server-btn" onClick={createServer}>Criar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showKey && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4"/> Chave do agent</CardTitle>
            <CardDescription>Copie agora — só é exibida enquanto essa tela está aberta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 rounded bg-neutral-900 text-xs flex-1 break-all" data-testid="agent-key-value">{showKey.key}</code>
              <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(showKey.key); toast.success("Copiado"); }}>
                <Copy className="h-3 w-3 mr-1"/> Copiar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowKey(null)}>Fechar</Button>
            </div>
            <p className="text-xs text-neutral-400">
              Use no agent (Python): <code>export CREATOOLS_AGENT_KEY="{showKey.key}"</code>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {servers.length === 0 && (
          <div className="text-center text-neutral-500 py-12 border border-dashed rounded-lg">
            Nenhum servidor cadastrado. Clique em "Novo servidor" para começar.
          </div>
        )}
        {servers.map((s) => (
          <Card key={s.id} data-testid={`server-card-${s.id}`}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-lg flex items-center gap-3">
                  {s.name} <StatusDot online={s.online} />
                </CardTitle>
                <CardDescription className="mt-1">
                  {s.hostname && <span className="mr-3">🌐 {s.hostname}</span>}
                  {s.os && <span className="mr-3">💻 {s.os}</span>}
                  {s.agentVersion && <span className="mr-3">🔧 v{s.agentVersion}</span>}
                  {s.online && <span className="mr-3">CPU {s.cpu}%</span>}
                  {s.online && s.memTotalMb > 0 && <span>RAM {s.memUsedMb}/{s.memTotalMb} MB</span>}
                </CardDescription>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => revealKey(s.id)} data-testid={`reveal-key-${s.id}`}><Key className="h-4 w-4"/></Button>
                <Button size="sm" variant="ghost" onClick={() => rotateKey(s.id)}><RefreshCw className="h-4 w-4"/></Button>
                <Button size="sm" variant="ghost" onClick={() => removeServer(s.id)} data-testid={`delete-server-${s.id}`}><Trash2 className="h-4 w-4 text-red-400"/></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                {s.emulators.length === 0 && <div className="text-xs text-neutral-500 italic">Sem emuladores cadastrados</div>}
                {s.emulators.map((e) => (
                  <div key={e.id} className="flex items-center justify-between p-3 rounded border border-neutral-800 bg-neutral-900/40" data-testid={`emulator-row-${e.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{e.name}</span>
                        <EmuStatusBadge status={e.status}/>
                        {e.pid && <span className="text-xs text-neutral-500">PID {e.pid}</span>}
                      </div>
                      <code className="text-xs text-neutral-400 block truncate">{e.processCmd}</code>
                      {e.lastError && <div className="text-xs text-red-400 mt-1">⚠ {e.lastError}</div>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => sendCmd(s.id, e.id, "start")} disabled={!s.online} data-testid={`start-emu-${e.id}`}><Play className="h-4 w-4 text-emerald-400"/></Button>
                      <Button size="sm" variant="ghost" onClick={() => sendCmd(s.id, e.id, "stop")} disabled={!s.online} data-testid={`stop-emu-${e.id}`}><Square className="h-4 w-4 text-red-400"/></Button>
                      <Button size="sm" variant="ghost" onClick={() => sendCmd(s.id, e.id, "restart")} disabled={!s.online}><RefreshCw className="h-4 w-4 text-blue-400"/></Button>
                      <Button size="sm" variant="ghost" onClick={() => removeEmu(s.id, e.id)}><Trash2 className="h-4 w-4 text-neutral-500"/></Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-2 md:grid-cols-4 border-t border-neutral-800 pt-3">
                <Input placeholder="Nome" value={emuForms[s.id]?.name ?? ""} onChange={(e) => setEmuForms((p) => ({ ...p, [s.id]: { ...(p[s.id] ?? { name:"", cmd:"", dir:"" }), name: e.target.value } }))} data-testid={`emu-name-${s.id}`}/>
                <Input className="md:col-span-2" placeholder="Comando (ex: node dist/index.js)" value={emuForms[s.id]?.cmd ?? ""} onChange={(e) => setEmuForms((p) => ({ ...p, [s.id]: { ...(p[s.id] ?? { name:"", cmd:"", dir:"" }), cmd: e.target.value } }))} data-testid={`emu-cmd-${s.id}`}/>
                <div className="flex gap-2">
                  <Input placeholder="cwd (opcional)" value={emuForms[s.id]?.dir ?? ""} onChange={(e) => setEmuForms((p) => ({ ...p, [s.id]: { ...(p[s.id] ?? { name:"", cmd:"", dir:"" }), dir: e.target.value } }))}/>
                  <Button onClick={() => addEmulator(s.id)} data-testid={`add-emu-${s.id}`}><Plus className="h-4 w-4"/></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Como conectar um servidor</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Na sua VPS (Windows ou Linux), instale o agent Python e defina as variáveis:</p>
          <Textarea readOnly className="font-mono text-xs h-40"
            value={`# Baixe o agent
curl -O ${location.origin}/agent.py

# Configure a chave (copie do painel ao criar o servidor)
export CREATOOLS_AGENT_KEY="srvk_..."
export CREATOOLS_PANEL_URL="${location.origin}"

# Instale deps e rode
pip3 install requests psutil
python3 agent.py`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
