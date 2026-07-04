import { useState } from "react";
import { Coins } from "lucide-react";
import { OverlayPageBase, OverlayLink, ComoFunciona, SettingsCard, SliderField, ToggleRow, SegmentControl, ColorPalette } from "./overlay-item-base";
import { useAuth } from "@/context/auth-context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PALETTES = ["#f59e0b","#a855f7","#3b82f6","#22c55e","#ec4899"];

export default function OverlayCoins() {
  const { user } = useAuth();
  const overlayUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=coins&session=${user?.id ?? "demo"}`;
  const [topN, setTopN] = useState(5);
  const [width, setWidth] = useState(340);
  const [palette, setPalette] = useState("#f59e0b");
  const [cardStyle, setCardStyle] = useState("vidro");
  const [highlight, setHighlight] = useState(true);

  const fakeRanking = [
    { name: "Alex Silva", coins: "220,0K", initials: "AS" },
    { name: "enamorado", coins: "20,2K", initials: "EN" },
    { name: "Claudia Cruz", coins: "16,1K", initials: "CC" },
  ].slice(0, topN);

  return (
    <OverlayPageBase
      title="Top Moedas"
      subtitle="Ranking dos maiores doadores de moedas da live."
      icon={<Coins className="w-5 h-5 text-white" />}
      iconBg="linear-gradient(135deg, #f59e0b, #ea580c)"
    >
      <ComoFunciona steps={[
        "Mostra quem mais enviou moedas (coins) durante a live.",
        "Atualiza a cada 30 segundos automaticamente.",
        "Adicione no OBS como Browser Source.",
      ]} />
      <SettingsCard title="Prévia ao vivo">
        <div className="rounded-xl p-4 space-y-2 min-h-[180px]" style={{ background: "rgba(0,0,0,0.6)" }}>
          {fakeRanking.map((item, i) => (
            <div key={item.name} className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{ background: i===0&&highlight?`${palette}20`:"rgba(255,255,255,0.04)", border: i===0&&highlight?`1px solid ${palette}40`:"1px solid rgba(255,255,255,0.04)" }}>
              {i===0&&highlight?<span>👑</span>:<span className="text-xs font-bold w-5 text-center" style={{color:"rgba(255,255,255,0.3)"}}>{i+1}</span>}
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{background:palette,color:"white"}}>{item.initials}</div>
              <span className="flex-1 text-sm font-medium text-white">{item.name}</span>
              <span className="text-xs font-bold" style={{color:palette}}>🪙 {item.coins}</span>
            </div>
          ))}
        </div>
      </SettingsCard>
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsCard title="Paleta"><ColorPalette colors={PALETTES} value={palette} onChange={setPalette} /></SettingsCard>
        <SettingsCard title="Estilo">
          <SegmentControl options={[{label:"Vidro",value:"vidro"},{label:"Sólido",value:"solido"},{label:"Sem fundo",value:"sem"}]} value={cardStyle} onChange={setCardStyle} />
        </SettingsCard>
        <SettingsCard title="Quantidade"><SliderField label="Quantos exibir" value={topN} min={3} max={10} onChange={setTopN} /></SettingsCard>
        <SettingsCard title="Largura"><SliderField label="Largura" value={width} min={240} max={600} unit="px" onChange={setWidth} /></SettingsCard>
      </div>
      <SettingsCard title="Destaque do 1º lugar">
        <ToggleRow label="Coroa + brilho no 1º" checked={highlight} onChange={setHighlight} />
      </SettingsCard>
      <SettingsCard title="Link do Overlay (OBS / TikTok Studio)">
        <OverlayLink url={overlayUrl} />
      </SettingsCard>
    </OverlayPageBase>
  );
}
