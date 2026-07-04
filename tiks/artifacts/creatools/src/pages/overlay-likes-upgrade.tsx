import { useState } from "react";
import { Sparkles } from "lucide-react";
import { OverlayPageBase, OverlayLink, ComoFunciona, SettingsCard, SliderField, ToggleRow, SegmentControl, ColorPalette } from "./overlay-item-base";
import { useAuth } from "@/context/auth-context";

const PALETTES = ["#a855f7", "#3b82f6", "#f97316", "#22c55e", "#ec4899"];
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function OverlayLikesUpgrade() {
  const { user } = useAuth();
  const overlayUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=likes-upgrade&session=${user?.id ?? "demo"}`;

  const [palette, setPalette] = useState("#a855f7");
  const [cardStyle, setCardStyle] = useState("vidro");
  const [avatar, setAvatar] = useState("redondo");
  const [showLikes, setShowLikes] = useState("icone");
  const [textColor, setTextColor] = useState("#ffffff");
  const [flipSide, setFlipSide] = useState(false);
  const [topN, setTopN] = useState(5);
  const [width, setWidth] = useState(340);
  const [lineH, setLineH] = useState(60);
  const [spacing, setSpacing] = useState(10);
  const [highlight, setHighlight] = useState(true);

  const fakeRanking = [
    { name: "Lucas_RJ", likes: "97,0K", initials: "LU" },
    { name: "Duda", likes: "90,6K", initials: "DU" },
    { name: "Mariana", likes: "81,1K", initials: "MA" },
    { name: "Pedro.G", likes: "79,5K", initials: "PE" },
    { name: "Rafa", likes: "75,5K", initials: "RA" },
  ].slice(0, topN);

  return (
    <OverlayPageBase
      title="Likes Upgrade"
      subtitle="Placar animado dos top likers — visual premium pro OBS."
      icon={<Sparkles className="w-5 h-5 text-white" />}
      iconBg="linear-gradient(135deg, #a855f7, #ec4899)"
      requiresPlan="pro"
    >
      <ComoFunciona steps={[
        "Adicione o link abaixo no OBS como Browser Source (1080×1920).",
        "O placar atualiza automaticamente a cada 30s durante a live.",
        "Customize cores, estilos e quantidade de exibições abaixo.",
      ]} />

      {/* Live preview */}
      <SettingsCard title="Prévia ao vivo">
        <div className="rounded-xl overflow-hidden p-4 space-y-2 min-h-[240px] relative"
          style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${palette}40` }}>
          <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at 50% 0%, ${palette}, transparent 70%)` }} />
          {fakeRanking.map((item, i) => (
            <div key={item.name}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl ${flipSide ? "flex-row-reverse" : ""}`}
              style={{
                background: i === 0 && highlight
                  ? `linear-gradient(90deg, ${palette}40, transparent)`
                  : cardStyle === "solido" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
                border: i === 0 && highlight ? `1px solid ${palette}60` : "1px solid rgba(255,255,255,0.06)",
                height: lineH * 0.65,
              }}>
              {i === 0 && highlight ? <span className="text-base">👑</span>
                : <span className="text-sm font-bold w-5 text-center" style={{ color: "rgba(255,255,255,0.3)" }}>{i + 1}</span>}
              {avatar !== "sem" && (
                <div className={`w-8 h-8 rounded-${avatar === "quadrado" ? "md" : "full"} flex items-center justify-center text-xs font-bold shrink-0`}
                  style={{ background: palette, color: "white" }}>{item.initials}</div>
              )}
              <span className="flex-1 text-sm font-semibold" style={{ color: textColor }}>{item.name}</span>
              <span className="text-xs font-bold" style={{ color: palette }}>
                {showLikes === "icone" ? "❤️ " : ""}{showLikes !== "esconder" ? item.likes : ""}
              </span>
            </div>
          ))}
        </div>
      </SettingsCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsCard title="Paleta">
          <ColorPalette colors={PALETTES} value={palette} onChange={setPalette} />
        </SettingsCard>
        <SettingsCard title="Estilo do card">
          <SegmentControl options={[{label:"Vidro",value:"vidro"},{label:"Sólido",value:"solido"},{label:"Contorno",value:"contorno"},{label:"Sem fundo",value:"sem"}]} value={cardStyle} onChange={setCardStyle} />
        </SettingsCard>
        <SettingsCard title="Avatar">
          <SegmentControl options={[{label:"Redondo",value:"redondo"},{label:"Quadrado",value:"quadrado"},{label:"Sem",value:"sem"}]} value={avatar} onChange={setAvatar} />
        </SettingsCard>
        <SettingsCard title="Mostrar likes">
          <SegmentControl options={[{label:"❤️ Ícone",value:"icone"},{label:"Número",value:"numero"},{label:"Esconder",value:"esconder"}]} value={showLikes} onChange={setShowLikes} />
        </SettingsCard>
        <SettingsCard title="Cor do texto">
          <ColorPalette colors={["#ffffff","#f0f0f0","#fbbf24","#f472b6","#67e8f9","#4ade80"]} value={textColor} onChange={setTextColor} />
        </SettingsCard>
        <SettingsCard title="Inverter lado">
          <ToggleRow label="Posição · Foto · Nome" checked={flipSide} onChange={setFlipSide} />
        </SettingsCard>
      </div>

      <SettingsCard title="Tamanho">
        <div className="space-y-4">
          <SliderField label="Quantos exibir" value={topN} min={3} max={10} onChange={setTopN} />
          <SliderField label="Largura" value={width} min={240} max={600} unit="px" onChange={setWidth} />
          <SliderField label="Altura da linha" value={lineH} min={40} max={100} unit="px" onChange={setLineH} />
          <SliderField label="Espaço entre linhas" value={spacing} min={0} max={30} unit="px" onChange={setSpacing} />
        </div>
      </SettingsCard>

      <SettingsCard title="Destaque do 1º lugar">
        <ToggleRow label="Coroa + brilho no 1º" checked={highlight} onChange={setHighlight} />
      </SettingsCard>

      <SettingsCard title="Link do Overlay (OBS / TikTok Studio)">
        <OverlayLink url={overlayUrl} />
      </SettingsCard>
    </OverlayPageBase>
  );
}
