import { useState } from "react";
import { useWatchlist } from "@/context/watchlist-context";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell, BellOff, Plus, X, Radio, Eye, Clock, Trash2,
  BellRing, AlertCircle, ExternalLink, RefreshCw,
} from "lucide-react";

function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "agora mesmo";
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

function StatusDot({ isLive }: { isLive: boolean | null }) {
  if (isLive === null) return <span className="w-2 h-2 rounded-full bg-muted-foreground/30 inline-block" />;
  if (isLive) return <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" />;
  return <span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" />;
}

export default function Notifications() {
  const { creators, events, notifPermission, add, remove, requestPermission, liveCount } = useWatchlist();
  const [input, setInput] = useState("");
  const [, nav] = useLocation();

  function handleAdd() {
    const trimmed = input.trim().replace(/^@/, "");
    if (!trimmed) return;
    add(trimmed);
    setInput("");
  }

  const liveCreators = creators.filter((c) => c.isLive === true);
  const offlineCreators = creators.filter((c) => c.isLive !== true);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Notificações ao Vivo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Receba alertas quando os criadores que você segue entrarem ao vivo.
          </p>
        </div>
        {liveCount > 0 && (
          <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-sm px-3 py-1">
            <Radio className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
            {liveCount} ao vivo agora
          </Badge>
        )}
      </div>

      {/* Notification permission banner */}
      {notifPermission !== "granted" && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 py-4">
            <BellRing className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Ativar notificações do navegador</p>
              <p className="text-xs text-muted-foreground">
                {notifPermission === "denied"
                  ? "Notificações bloqueadas. Habilite nas configurações do navegador."
                  : "Permita notificações para receber alertas mesmo fora da aba."}
              </p>
            </div>
            {notifPermission !== "denied" && (
              <Button size="sm" onClick={requestPermission}>
                <BellRing className="w-3.5 h-3.5 mr-1.5" />
                Permitir
              </Button>
            )}
            {notifPermission === "denied" && (
              <BellOff className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Watch list management */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Criadores monitorados</CardTitle>
              <CardDescription>
                Verificação automática a cada 60 segundos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Add input */}
              <div className="flex gap-2">
                <Input
                  placeholder="@username do TikTok"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className="flex-1"
                />
                <Button onClick={handleAdd} disabled={!input.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Creator list */}
              {creators.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhum criador monitorado ainda.</p>
                  <p className="text-xs text-muted-foreground/70">Adicione um username acima para começar.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Live first */}
                  {liveCreators.map((c) => (
                    <div
                      key={c.username}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-red-500/5 border border-red-500/10 group"
                    >
                      <StatusDot isLive={c.isLive} />
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarImage
                          src={`https://unavatar.io/tiktok/${c.username}`}
                          alt={c.username}
                        />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {c.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => nav(`/monitor/${c.username}`)}
                          className="text-sm font-medium hover:text-primary transition-colors text-left truncate block"
                        >
                          @{c.username}
                        </button>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-400 border-red-500/20">
                            AO VIVO
                          </Badge>
                          {c.viewerCount !== null && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Eye className="w-3 h-3" />{c.viewerCount.toLocaleString()}
                            </span>
                          )}
                          {c.title && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{c.title}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-muted-foreground"
                        onClick={() => nav(`/monitor/${c.username}`)}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(c.username)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}

                  {/* Offline / unknown */}
                  {offlineCreators.map((c) => (
                    <div
                      key={c.username}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent/30 group transition-colors"
                    >
                      <StatusDot isLive={c.isLive} />
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarImage
                          src={`https://unavatar.io/tiktok/${c.username}`}
                          alt={c.username}
                        />
                        <AvatarFallback className="text-xs bg-muted/40">
                          {c.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">@{c.username}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {c.isLive === null
                            ? "Verificando..."
                            : c.lastChecked
                            ? `Offline · verificado ${timeAgo(c.lastChecked)}`
                            : "Offline"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-muted-foreground"
                        onClick={() => nav(`/monitor/${c.username}`)}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(c.username)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live grid if any are live */}
          {liveCreators.length > 0 && (
            <Card className="border-red-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                  Ao vivo agora
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {liveCreators.map((c) => (
                    <button
                      key={c.username}
                      onClick={() => nav(`/monitor/${c.username}`)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors text-left"
                    >
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarImage src={`https://unavatar.io/tiktok/${c.username}`} />
                        <AvatarFallback className="text-sm bg-red-500/10 text-red-400">
                          {c.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">@{c.username}</p>
                        {c.title && <p className="text-xs text-muted-foreground truncate">{c.title}</p>}
                        {c.viewerCount !== null && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Eye className="w-3 h-3" />{c.viewerCount.toLocaleString()} espectadores
                          </p>
                        )}
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Event history */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Histórico
                </CardTitle>
                {events.length > 0 && (
                  <span className="text-xs text-muted-foreground">{events.length} eventos</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <AlertCircle className="w-7 h-7 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhum evento ainda.</p>
                  <p className="text-xs text-muted-foreground/60">
                    Os alertas de live aparecem aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0"
                    >
                      <div className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${ev.type === "went_live" ? "bg-red-500" : "bg-muted-foreground/40"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {ev.type === "went_live" ? "🔴" : "⭕"} @{ev.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ev.type === "went_live" ? "Entrou ao vivo" : "Encerrou a live"}
                          {ev.viewerCount !== null && ` · ${ev.viewerCount.toLocaleString()} espectadores`}
                        </p>
                        {ev.title && (
                          <p className="text-xs text-muted-foreground/70 truncate">{ev.title}</p>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground/60 shrink-0 whitespace-nowrap">
                        {timeAgo(ev.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
