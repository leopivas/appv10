import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import { OverlayPageBase, OverlayLink, ComoFunciona, SettingsCard, ToggleRow, SegmentControl, SliderField, ColorPalette } from "./overlay-item-base";
import { useAuth } from "@/context/auth-context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function OverlayGamer() {
  const { user } = useAuth();
  const overlayUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=gamer&session=${user?.id ?? "demo"}`;
  const [style, setStyle] = useState("hud");
  const [palette, setPalette] = useState("#06b6d4");
  const [showViewers, setShowViewers] = useState(true);
  const [showLikes, setShowLikesG] = useState(true);
  const [showTimer, setShowTimer] = useState(false);
  const [opacity, setOpacity] = useState(85);

  return (
    <OverlayPageBase
      title="Gamer"
      subtitle="Overlay estilo HUD para gamers — métricas da live no estilo game."
      icon={<Gamepad2 className="w-5 h-5 text-white" />}
      iconBg="linear-gradient(135deg, #06b6d4, #7c3aed)"
      requiresPlan="pro"
    >
      <ComoFunciona steps={[
        "Exibe métricas da live em estilo HUD de jogo.",
        "Compatible com jogos de PC, console e mobile.",
        "Adicione no OBS como Browser Source (1920×1080).",
      ]} />
      {/* Preview */}
      <SettingsCard title="Prévia HUD">
        <div className="rounded-xl min-h-[180px] relative overflow-hidden p-4" style={{background:"rgba(0,0,0,0.8)"}}>
          <div className="absolute top-3 left-3 space-y-1.5">
            {showViewers && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{background:`${palette}20`,border:`1px solid ${palette}40`,color:palette}}>
                👥 12.847 <span className="font-normal opacity-60">viewers</span>
              </div>
            )}
            {showLikes && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{background:"rgba(236,72,153,0.15)",border:"1px solid rgba(236,72,153,0.3)",color:"#ec4899"}}>
                ❤️ 3.326 <span className="font-normal opacity-60">likes</span>
              </div>
            )}
            {showTimer && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.6)"}}>
                ⏱ 01:23:45
              </div>
            )}
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex justify-center">
            <div className="text-[10px]" style={{color:"rgba(255,255,255,0.2)"}}>LIVE • HUD</div>
          </div>
        </div>
      </SettingsCard>
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsCard title="Estilo">
          <SegmentControl options={[{label:"HUD",value:"hud"},{label:"Minimal",value:"minimal"},{label:"Neon",value:"neon"}]} value={style} onChange={setStyle} />
        </SettingsCard>
        <SettingsCard title="Cor principal"><ColorPalette colors={["#06b6d4","#a855f7","#f97316","#22c55e","#ec4899"]} value={palette} onChange={setPalette} /></SettingsCard>
        <SettingsCard title="Exibir">
          <div className="space-y-3">
            <ToggleRow label="Viewers" checked={showViewers} onChange={setShowViewers} />
            <ToggleRow label="Likes" checked={showLikes} onChange={setShowLikesG} />
            <ToggleRow label="Timer da live" checked={showTimer} onChange={setShowTimer} />
          </div>
        </SettingsCard>
        <SettingsCard title="Opacidade"><SliderField label="Opacidade do HUD" value={opacity} min={20} max={100} unit="%" onChange={setOpacity} /></SettingsCard>
      </div>
      <SettingsCard title="Link do Overlay (OBS / TikTok Studio)"><OverlayLink url={overlayUrl} /></SettingsCard>
    </OverlayPageBase>
  );
}
