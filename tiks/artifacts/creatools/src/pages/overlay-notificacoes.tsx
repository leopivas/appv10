import { useState } from "react";
import { Bell } from "lucide-react";
import { OverlayPageBase, OverlayLink, ComoFunciona, SettingsCard, ToggleRow, SegmentControl, SliderField, ColorPalette } from "./overlay-item-base";
import { useAuth } from "@/context/auth-context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function OverlayNotificacoes() {
  const { user } = useAuth();
  const overlayUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=notifications&session=${user?.id ?? "demo"}`;
  const [showGifts, setShowGifts] = useState(true);
  const [showFollows, setShowFollows] = useState(true);
  const [showShares, setShowShares] = useState(true);
  const [showLikes, setShowLikes] = useState(false);
  const [position, setPosition] = useState("top-right");
  const [duration, setDuration] = useState(5);
  const [palette, setPalette] = useState("#a855f7");

  return (
    <OverlayPageBase
      title="Notificações"
      subtitle="Alertas visuais para gifts, follows, shares e likes durante a live."
      icon={<Bell className="w-5 h-5 text-white" />}
      iconBg="linear-gradient(135deg, #a855f7, #3b82f6)"
    >
      <ComoFunciona steps={[
        "Notificações aparecem automaticamente na tela durante a live.",
        "Configure quais eventos disparam notificações abaixo.",
        "Adicione no OBS como Browser Source (1920×1080).",
      ]} />
      {/* Preview */}
      <SettingsCard title="Prévia">
        <div className="rounded-xl p-4 min-h-[140px] relative overflow-hidden" style={{background:"rgba(0,0,0,0.6)"}}>
          <div className="absolute top-3 right-3 flex flex-col gap-2 max-w-[220px]">
            {showGifts && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm" style={{background:`${palette}20`,border:`1px solid ${palette}40`,backdropFilter:"blur(8px)"}}>
                <span>🎁</span>
                <span className="font-medium text-white text-xs">Alex Silva enviou <strong style={{color:palette}}>Rosa</strong></span>
              </div>
            )}
            {showFollows && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm" style={{background:"rgba(34,197,94,0.15)",border:"1px solid rgba(34,197,94,0.3)"}}>
                <span>👤</span><span className="font-medium text-white text-xs">Maria começou a seguir</span>
              </div>
            )}
          </div>
        </div>
      </SettingsCard>
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsCard title="Eventos">
          <div className="space-y-3">
            <ToggleRow label="🎁 Gifts" checked={showGifts} onChange={setShowGifts} />
            <ToggleRow label="👤 Follows" checked={showFollows} onChange={setShowFollows} />
            <ToggleRow label="🔗 Shares" checked={showShares} onChange={setShowShares} />
            <ToggleRow label="❤️ Likes" checked={showLikes} onChange={setShowLikes} />
          </div>
        </SettingsCard>
        <SettingsCard title="Posição">
          <SegmentControl options={[{label:"↙",value:"bottom-left"},{label:"↘",value:"bottom-right"},{label:"↗",value:"top-right"},{label:"↖",value:"top-left"}]} value={position} onChange={setPosition} />
        </SettingsCard>
        <SettingsCard title="Cor principal"><ColorPalette colors={["#a855f7","#06b6d4","#f97316","#22c55e","#ec4899"]} value={palette} onChange={setPalette} /></SettingsCard>
        <SettingsCard title="Duração"><SliderField label="Duração do alerta" value={duration} min={2} max={15} unit="s" onChange={setDuration} /></SettingsCard>
      </div>
      <SettingsCard title="Link do Overlay (OBS / TikTok Studio)"><OverlayLink url={overlayUrl} /></SettingsCard>
    </OverlayPageBase>
  );
}
