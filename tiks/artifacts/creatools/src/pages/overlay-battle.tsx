import { useState } from "react";
import { Swords } from "lucide-react";
import { OverlayPageBase, OverlayLink, ComoFunciona, SettingsCard, ToggleRow, SegmentControl } from "./overlay-item-base";
import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function OverlayBattle() {
  const { user } = useAuth();
  const overlayUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=battle&session=${user?.id ?? "demo"}`;
  const [colorA, setColorA] = useState("#3882f6");
  const [colorB, setColorB] = useState("#eab308");
  const [scoreColor, setScoreColor] = useState("#f7d800");
  const [style, setStyle] = useState("classico");
  const [hidePts, setHidePts] = useState(false);
  const [hideHost, setHideHost] = useState(false);
  const [solidBg, setSolidBg] = useState(false);
  const [opacity, setOpacity] = useState(100);

  return (
    <OverlayPageBase
      title="Battle"
      subtitle="Overlay de batalha com detecção automática via Euler."
      icon={<Swords className="w-5 h-5 text-white" />}
      iconBg="linear-gradient(135deg, #ef4444, #f97316)"
      requiresPlan="pro"
    >
      <ComoFunciona steps={[
        "Inicie uma batalha na sua live do TikTok.",
        "O overlay detecta automaticamente e exibe o placar.",
        "Adicione o link abaixo no OBS como Browser Source (960×200).",
      ]} />

      {/* Battle preview */}
      <SettingsCard title="Prévia — Estilo Clássico (Flip 5s)">
        <div className="rounded-xl overflow-hidden p-6" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold" style={{ background: colorA }}>VS</div>
              <p className="text-sm font-bold text-white">Time A</p>
              <p className="text-2xl font-black mt-1" style={{ color: colorA }}>12.350</p>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold px-3 py-1 rounded-full mb-1" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>VS</div>
              {!hidePts && <div className="w-2 h-2 rounded-full mx-auto" style={{ background: scoreColor }} />}
            </div>
            <div className="flex-1 text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold" style={{ background: colorB }}>VS</div>
              <p className="text-sm font-bold text-white">Time B</p>
              <p className="text-2xl font-black mt-1" style={{ color: colorB }}>9.870</p>
            </div>
          </div>
        </div>
      </SettingsCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsCard title="Opções">
          <div className="space-y-3">
            <ToggleRow label="Ocultar Pontos" checked={hidePts} onChange={setHidePts} />
            <ToggleRow label="Ocultar Pic Host" checked={hideHost} onChange={setHideHost} />
            <ToggleRow label="Fundo Sólido" checked={solidBg} onChange={setSolidBg} />
          </div>
        </SettingsCard>
        <SettingsCard title="Estilo VS">
          <SegmentControl
            options={[{label:"Clássico",value:"classico"},{label:"Flip",value:"flip"},{label:"Neon",value:"neon"},{label:"Galeria",value:"galeria"}]}
            value={style} onChange={setStyle}
          />
        </SettingsCard>
        <SettingsCard title="Cores da Batalha">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Label className="text-xs w-16 shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>Time A</Label>
              <input type="color" value={colorA} onChange={e => setColorA(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
              <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>{colorA}</span>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs w-16 shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>Time B</Label>
              <input type="color" value={colorB} onChange={e => setColorB(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
              <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>{colorB}</span>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs w-16 shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>Pontos</Label>
              <input type="color" value={scoreColor} onChange={e => setScoreColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
              <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>{scoreColor}</span>
            </div>
          </div>
        </SettingsCard>
      </div>

      <SettingsCard title="Link do Overlay (OBS / TikTok Studio)">
        <OverlayLink url={overlayUrl} />
        <p className="text-[11px] mt-2" style={{ color: "rgba(255,255,255,0.25)" }}>OBS Browser Source 960×200. Andar com flip pra placar pôr para cima.</p>
      </SettingsCard>
    </OverlayPageBase>
  );
}
