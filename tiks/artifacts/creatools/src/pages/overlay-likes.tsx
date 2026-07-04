import { useState } from "react";
import { Heart, RotateCcw } from "lucide-react";
import { OverlayPageBase, OverlayLink, ComoFunciona, SettingsCard, SliderField, ToggleRow, SegmentControl, CopyBtn } from "./overlay-item-base";
import { useAuth } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function OverlayLikes() {
  const { user } = useAuth();
  const session = user?.id ?? "demo";
  const overlayUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=likes&session=${session}`;

  const [topN, setTopN] = useState(5);
  const [width, setWidth] = useState(340);
  const [lineHeight, setLineHeight] = useState(60);
  const [spacing, setSpacing] = useState(10);
  const [showLikes, setShowLikes] = useState<"icone" | "numero" | "esconder">("icone");
  const [cardStyle, setCardStyle] = useState("vidro");
  const [avatar, setAvatar] = useState("redondo");
  const [highlight1st, setHighlight1st] = useState(true);
  const [resetProgress, setResetProgress] = useState(0);

  const fakeRanking = [
    { name: "Lucas_RJ", likes: "97,0K", initials: "LU", color: "#7c3aed" },
    { name: "Duda", likes: "90,6K", initials: "DU", color: "#ec4899" },
    { name: "Mariana", likes: "81,1K", initials: "MA", color: "#f97316" },
    { name: "Pedro.G", likes: "79,5K", initials: "PE", color: "#06b6d4" },
    { name: "Rafa", likes: "75,5K", initials: "RA", color: "#22c55e" },
  ].slice(0, topN);

  return (
    <OverlayPageBase
      title="Ranking de Likes"
      subtitle="Pódio dos top likers atualizado a cada 30s."
      icon={<Heart className="w-5 h-5 text-white" />}
      iconBg="linear-gradient(135deg, #ec4899, #7c3aed)"
      onReset={() => setResetProgress(0)}
    >
      <ComoFunciona steps={[
        "TikTok envia likes em batches. O Ranking atualiza a cada 30s.",
        "Após resetar, o primeiro update sai em 5s.",
        "Adicione o link abaixo no OBS como Browser Source (1920x1080).",
      ]} />

      {/* Reset progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          <span>Próxima atualização do ranking</span>
          <span className="font-mono font-bold text-white">{resetProgress}s</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(resetProgress / 30) * 100}%`, background: "linear-gradient(90deg, #7c3aed, #ec4899)" }} />
        </div>
      </div>

      {/* Preview */}
      <SettingsCard title="Prévia ao vivo">
        <div className="rounded-xl overflow-hidden p-4 space-y-2 min-h-[220px]"
          style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {fakeRanking.map((item, i) => (
            <div key={item.name} className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{
                background: i === 0 && highlight1st
                  ? "linear-gradient(90deg, rgba(124,58,237,0.3), rgba(236,72,153,0.15))"
                  : "rgba(255,255,255,0.05)",
                border: i === 0 && highlight1st ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.04)",
                height: lineHeight * 0.6,
              }}>
              {i === 0 && highlight1st
                ? <span className="text-lg">👑</span>
                : <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.4)", minWidth: 16, textAlign: "center" }}>{i + 1}</span>}
              <div className={`w-8 h-8 rounded-${avatar === "quadrado" ? "md" : "full"} flex items-center justify-center text-xs font-bold shrink-0`}
                style={{ background: item.color, color: "white" }}>{item.initials}</div>
              <span className="flex-1 text-sm font-medium text-white">{item.name}</span>
              <span className="text-xs font-bold flex items-center gap-1" style={{ color: "#ec4899" }}>
                {showLikes === "icone" ? "❤️ " : ""}
                {showLikes !== "esconder" ? item.likes : ""}
              </span>
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* Settings */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsCard title="Estilo do card">
          <SegmentControl
            options={[{ label: "Vidro", value: "vidro" }, { label: "Sólido", value: "solido" }, { label: "Contorno", value: "contorno" }, { label: "Sem fundo", value: "sem" }]}
            value={cardStyle} onChange={setCardStyle}
          />
        </SettingsCard>
        <SettingsCard title="Avatar">
          <SegmentControl
            options={[{ label: "Redondo", value: "redondo" }, { label: "Quadrado", value: "quadrado" }, { label: "Sem", value: "sem" }]}
            value={avatar} onChange={setAvatar}
          />
        </SettingsCard>
        <SettingsCard title="Mostrar likes">
          <SegmentControl
            options={[{ label: "❤️ Ícone", value: "icone" }, { label: "Número", value: "numero" }, { label: "Esconder", value: "esconder" }]}
            value={showLikes} onChange={(v) => setShowLikes(v as typeof showLikes)}
          />
        </SettingsCard>
        <SettingsCard title="Destaque do 1º lugar">
          <ToggleRow label="Coroa + brilho no 1º" checked={highlight1st} onChange={setHighlight1st} />
        </SettingsCard>
      </div>

      <SettingsCard title="Tamanho e quantidade">
        <div className="space-y-4">
          <SliderField label="Quantos exibir" value={topN} min={3} max={10} onChange={setTopN} />
          <SliderField label="Largura" value={width} min={240} max={600} unit="px" onChange={setWidth} />
          <SliderField label="Altura da linha" value={lineHeight} min={40} max={100} unit="px" onChange={setLineHeight} />
          <SliderField label="Espaço entre linhas" value={spacing} min={0} max={30} unit="px" onChange={setSpacing} />
        </div>
      </SettingsCard>

      {/* OBS Link */}
      <SettingsCard title="Link do Overlay (OBS / TikTok Studio)">
        <OverlayLink url={overlayUrl} />
      </SettingsCard>
    </OverlayPageBase>
  );
}
