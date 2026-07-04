import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { OverlayPageBase, OverlayLink, ComoFunciona, SettingsCard, ToggleRow, SliderField, ColorPalette } from "./overlay-item-base";
import { useAuth } from "@/context/auth-context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function OverlayLevelUp() {
  const { user } = useAuth();
  const overlayUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=levelup&session=${user?.id ?? "demo"}`;
  const [palette, setPalette] = useState("#22c55e");
  const [showXP, setShowXP] = useState(true);
  const [showName, setShowName] = useState(true);
  const [duration, setDuration] = useState(4);

  return (
    <OverlayPageBase
      title="Level Up"
      subtitle="Animação de level up quando viewers atingem marcos de interação."
      icon={<TrendingUp className="w-5 h-5 text-white" />}
      iconBg="linear-gradient(135deg, #22c55e, #06b6d4)"
    >
      <ComoFunciona steps={[
        "Dispara animação quando um viewer atinge um novo nível.",
        "Níveis baseados em moedas, likes ou presentes enviados.",
        "Adicione no OBS como Browser Source (1920×1080).",
      ]} />
      <SettingsCard title="Prévia">
        <div className="rounded-xl min-h-[160px] flex flex-col items-center justify-center gap-3" style={{background:"rgba(0,0,0,0.6)"}}>
          <div className="text-4xl animate-bounce">⬆️</div>
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest" style={{color:palette}}>Level Up!</p>
            {showName && <p className="text-lg font-black text-white mt-1">Alex Silva</p>}
            {showXP && <p className="text-sm font-bold mt-1" style={{color:palette}}>Nível 12 → 13</p>}
          </div>
        </div>
      </SettingsCard>
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsCard title="Cor"><ColorPalette colors={["#22c55e","#a855f7","#06b6d4","#f59e0b","#ec4899"]} value={palette} onChange={setPalette} /></SettingsCard>
        <SettingsCard title="Exibir">
          <div className="space-y-3">
            <ToggleRow label="Mostrar nome" checked={showName} onChange={setShowName} />
            <ToggleRow label="Mostrar XP/nível" checked={showXP} onChange={setShowXP} />
          </div>
        </SettingsCard>
        <SettingsCard title="Duração"><SliderField label="Duração" value={duration} min={2} max={10} unit="s" onChange={setDuration} /></SettingsCard>
      </div>
      <SettingsCard title="Link do Overlay (OBS / TikTok Studio)"><OverlayLink url={overlayUrl} /></SettingsCard>
    </OverlayPageBase>
  );
}
