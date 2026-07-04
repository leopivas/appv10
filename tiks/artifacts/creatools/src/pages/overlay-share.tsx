import { useState } from "react";
import { Share2 } from "lucide-react";
import { OverlayPageBase, OverlayLink, ComoFunciona, SettingsCard, SliderField, ToggleRow, ColorPalette } from "./overlay-item-base";
import { useAuth } from "@/context/auth-context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function OverlayShare() {
  const { user } = useAuth();
  const overlayUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=shares&session=${user?.id ?? "demo"}`;
  const [topN, setTopN] = useState(5);
  const [palette, setPalette] = useState("#06b6d4");
  const [highlight, setHighlight] = useState(true);

  const fakeRanking = [
    { name: "MiRanda", shares: "180", initials: "MI" },
    { name: "Rosa Margarita", shares: "120", initials: "RM" },
    { name: "JUH", shares: "72", initials: "JU" },
  ].slice(0, topN);

  return (
    <OverlayPageBase
      title="Top Shares"
      subtitle="Ranking de quem mais compartilhou sua live."
      icon={<Share2 className="w-5 h-5 text-white" />}
      iconBg="linear-gradient(135deg, #06b6d4, #3b82f6)"
    >
      <ComoFunciona steps={[
        "Mostra quem mais compartilhou a live no TikTok.",
        "Atualiza automaticamente durante a transmissão.",
        "Adicione no OBS como Browser Source.",
      ]} />
      <SettingsCard title="Prévia ao vivo">
        <div className="rounded-xl p-4 space-y-2 min-h-[160px]" style={{ background: "rgba(0,0,0,0.6)" }}>
          {fakeRanking.map((item, i) => (
            <div key={item.name} className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{ background: i===0&&highlight?`${palette}20`:"rgba(255,255,255,0.04)" }}>
              {i===0&&highlight?<span>👑</span>:<span className="text-xs font-bold w-5 text-center" style={{color:"rgba(255,255,255,0.3)"}}>{i+1}</span>}
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{background:palette,color:"white"}}>{item.initials}</div>
              <span className="flex-1 text-sm font-medium text-white">{item.name}</span>
              <span className="text-xs font-bold" style={{color:palette}}>🔗 {item.shares}</span>
            </div>
          ))}
        </div>
      </SettingsCard>
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsCard title="Cor principal"><ColorPalette colors={["#06b6d4","#a855f7","#f97316","#22c55e","#ec4899"]} value={palette} onChange={setPalette} /></SettingsCard>
        <SettingsCard title="Quantidade"><SliderField label="Quantos exibir" value={topN} min={3} max={10} onChange={setTopN} /></SettingsCard>
      </div>
      <SettingsCard title="Destaque"><ToggleRow label="Coroa + brilho no 1º" checked={highlight} onChange={setHighlight} /></SettingsCard>
      <SettingsCard title="Link do Overlay (OBS / TikTok Studio)"><OverlayLink url={overlayUrl} /></SettingsCard>
    </OverlayPageBase>
  );
}
