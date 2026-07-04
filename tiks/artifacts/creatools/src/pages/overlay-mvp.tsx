import { useState } from "react";
import { Trophy } from "lucide-react";
import { OverlayPageBase, OverlayLink, ComoFunciona, SettingsCard, ToggleRow, SegmentControl, ColorPalette } from "./overlay-item-base";
import { useAuth } from "@/context/auth-context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function OverlayMvp() {
  const { user } = useAuth();
  const overlayUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=mvp&session=${user?.id ?? "demo"}`;
  const [metric, setMetric] = useState("coins");
  const [palette, setPalette] = useState("#f59e0b");
  const [showCrown, setShowCrown] = useState(true);
  const [animate, setAnimate] = useState(true);

  const metricLabels: Record<string,string> = { coins:"Moedas", likes:"Likes", shares:"Shares", gifts:"Presentes" };

  return (
    <OverlayPageBase
      title="MVP"
      subtitle="Destaque o viewer mais valioso da live em tempo real."
      icon={<Trophy className="w-5 h-5 text-white" />}
      iconBg="linear-gradient(135deg, #f59e0b, #a855f7)"
    >
      <ComoFunciona steps={[
        "Mostra o viewer com mais interações (moedas, likes, shares ou presentes).",
        "Atualiza em tempo real durante a live.",
        "Adicione no OBS como Browser Source.",
      ]} />
      {/* Preview */}
      <SettingsCard title="Prévia ao vivo">
        <div className="rounded-xl p-6 flex flex-col items-center gap-3" style={{background:"rgba(0,0,0,0.6)"}}>
          {showCrown && <div className="text-4xl">👑</div>}
          <p className="text-xs font-bold uppercase tracking-widest" style={{color:palette}}>TOP {metricLabels[metric]}</p>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black" style={{background:palette,color:"white"}}>AS</div>
          <p className="text-lg font-bold text-white">Alex Silva</p>
          <p className="text-2xl font-black" style={{color:palette}}>🪙 220,0K</p>
        </div>
      </SettingsCard>
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsCard title="Métrica">
          <SegmentControl options={[{label:"Moedas",value:"coins"},{label:"Likes",value:"likes"},{label:"Shares",value:"shares"},{label:"Gifts",value:"gifts"}]} value={metric} onChange={setMetric} />
        </SettingsCard>
        <SettingsCard title="Cor principal"><ColorPalette colors={["#f59e0b","#a855f7","#3b82f6","#22c55e","#ec4899"]} value={palette} onChange={setPalette} /></SettingsCard>
        <SettingsCard title="Extras">
          <div className="space-y-3">
            <ToggleRow label="Mostrar coroa" checked={showCrown} onChange={setShowCrown} />
            <ToggleRow label="Animação de entrada" checked={animate} onChange={setAnimate} />
          </div>
        </SettingsCard>
      </div>
      <SettingsCard title="Link do Overlay (OBS / TikTok Studio)"><OverlayLink url={overlayUrl} /></SettingsCard>
    </OverlayPageBase>
  );
}
