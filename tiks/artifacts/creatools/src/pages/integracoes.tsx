import { useState } from "react";
import { Link2, Wifi, WifiOff, Settings, CheckCircle2, XCircle, Music, Tablet, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface OBSConfig {
  host: string;
  port: string;
  password: string;
  connected: boolean;
  autoConnect: boolean;
}

interface SpotifyConfig {
  connected: boolean;
  showTrack: boolean;
  showArtist: boolean;
  position: string;
}

export default function Integracoes() {
  const [obs, setObs] = useState<OBSConfig>({ host: "localhost", port: "4455", password: "", connected: false, autoConnect: false });
  const [obsConnecting, setObsConnecting] = useState(false);
  const [spotify, setSpotify] = useState<SpotifyConfig>({ connected: false, showTrack: true, showArtist: true, position: "bottom-left" });

  function connectObs() {
    setObsConnecting(true);
    setTimeout(() => {
      setObsConnecting(false);
      setObs(o => ({ ...o, connected: !o.connected }));
    }, 1500);
  }

  const integrations = [
    {
      id: "obs",
      name: "OBS Control",
      desc: "Controle o OBS Studio via WebSocket — troque cenas, mute microfone e mais.",
      icon: <Monitor className="w-5 h-5 text-white" />,
      iconBg: "linear-gradient(135deg, #6366f1, #3b82f6)",
      badge: null,
      status: obs.connected ? "Conectado" : "Desconectado",
      ok: obs.connected,
    },
    {
      id: "deck",
      name: "TIKSCAN Deck",
      desc: "Controle macros e ações da live por botões físicos (StreamDeck, TouchPortal, etc).",
      icon: <Tablet className="w-5 h-5 text-white" />,
      iconBg: "linear-gradient(135deg, #06b6d4, #3b82f6)",
      badge: "BETA",
      status: "Em breve",
      ok: false,
    },
    {
      id: "spotify",
      name: "Spotify",
      desc: "Exiba a música que está tocando em overlay durante a live.",
      icon: <Music className="w-5 h-5 text-white" />,
      iconBg: "linear-gradient(135deg, #22c55e, #16a34a)",
      badge: null,
      status: spotify.connected ? "Conectado" : "Desconectado",
      ok: spotify.connected,
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
          <Link2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>INTEGRAÇÕES</span>
          </div>
          <h1 className="text-xl font-bold text-white">Integrações</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Conecte ferramentas externas à sua live.</p>
        </div>
      </div>

      <div className="space-y-4">
        {integrations.map(int => (
          <div key={int.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
            <div className="flex items-center gap-4 px-4 py-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: int.iconBg }}>{int.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{int.name}</p>
                  {int.badge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(34,211,238,0.12)", color: "#22d3ee" }}>{int.badge}</span>}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{int.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                {int.ok
                  ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                  : <XCircle className="w-4 h-4" style={{ color: "rgba(255,255,255,0.2)" }} />}
                <span className="text-xs font-medium" style={{ color: int.ok ? "#4ade80" : "rgba(255,255,255,0.35)" }}>{int.status}</span>
              </div>
            </div>

            {/* OBS Settings */}
            {int.id === "obs" && (
              <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1 col-span-2">
                    <Label className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Host</Label>
                    <Input value={obs.host} onChange={e => setObs(o => ({ ...o, host: e.target.value }))}
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13, height: 34 }} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Porta</Label>
                    <Input value={obs.port} onChange={e => setObs(o => ({ ...o, port: e.target.value }))}
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13, height: 34 }} />
                  </div>
                  <div className="space-y-1 col-span-3">
                    <Label className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Senha (opcional)</Label>
                    <Input type="password" value={obs.password} onChange={e => setObs(o => ({ ...o, password: e.target.value }))} placeholder="deixe vazio se não tiver"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13, height: 34 }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={obs.autoConnect} onCheckedChange={v => setObs(o => ({ ...o, autoConnect: v }))} />
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Conectar automaticamente</span>
                  </div>
                  <Button size="sm" onClick={connectObs} disabled={obsConnecting}
                    style={{ background: obs.connected ? "rgba(239,68,68,0.2)" : "rgba(99,102,241,0.3)", color: obs.connected ? "#f87171" : "#a5b4fc" }}>
                    {obsConnecting ? <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />Conectando…</span>
                      : obs.connected ? <><WifiOff className="w-3.5 h-3.5" /> Desconectar</> : <><Wifi className="w-3.5 h-3.5" /> Conectar</>}
                  </Button>
                </div>
              </div>
            )}

            {/* Spotify Settings */}
            {int.id === "spotify" && (
              <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                {spotify.connected ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}>
                      <Music className="w-4 h-4 text-green-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">Blinding Lights</p>
                        <p className="text-xs text-green-400">The Weeknd · tocando agora</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white">Mostrar nome da música</span>
                        <Switch checked={spotify.showTrack} onCheckedChange={v => setSpotify(s => ({ ...s, showTrack: v }))} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white">Mostrar artista</span>
                        <Switch checked={spotify.showArtist} onCheckedChange={v => setSpotify(s => ({ ...s, showArtist: v }))} />
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setSpotify(s => ({ ...s, connected: false }))}>Desconectar</Button>
                  </div>
                ) : (
                  <Button className="gap-1.5 w-full" onClick={() => setSpotify(s => ({ ...s, connected: true }))} style={{ background: "#22c55e", color: "white" }}>
                    <Music className="w-4 h-4" /> Conectar com Spotify
                  </Button>
                )}
              </div>
            )}

            {/* Deck (em breve) */}
            {int.id === "deck" && (
              <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <p className="text-sm text-center py-2" style={{ color: "rgba(255,255,255,0.25)" }}>Em desenvolvimento — disponível em breve 🚀</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
