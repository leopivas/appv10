import { useState } from "react";
import { Package } from "lucide-react";
import { OverlayPageBase, OverlayLink, ComoFunciona, SettingsCard, ToggleRow } from "./overlay-item-base";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function OverlayPote() {
  const { user } = useAuth();
  const overlayUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=pote&session=${user?.id ?? "demo"}`;
  const [todosPresentes, setTodosPresentes] = useState(true);
  const [presenteEspecifico, setPresenteEspecifico] = useState(false);
  const [salvarEntreLives, setSalvarEntreLives] = useState(false);

  return (
    <OverlayPageBase
      title="Pote"
      subtitle="O pote continua na tela até iniciar outra transmissão."
      icon={<Package className="w-5 h-5 text-white" />}
      iconBg="linear-gradient(135deg, #06b6d4, #3b82f6)"
    >
      <ComoFunciona steps={[
        "O pote se enche conforme os viewers enviam presentes.",
        "Escolha quais presentes contam para o pote abaixo.",
        "Adicione o link no OBS como Browser Source.",
      ]} />

      <SettingsCard title="Configuração">
        <div className="space-y-3">
          <ToggleRow label="Todos os Presentes" checked={todosPresentes} onChange={setTodosPresentes} />
          <ToggleRow label="Presente Específico" checked={presenteEspecifico} onChange={setPresenteEspecifico} />
          <ToggleRow
            label="Salvar pote entre lives"
            desc="Salvar pote — o pote continua na tela para a próxima live"
            checked={salvarEntreLives}
            onChange={setSalvarEntreLives}
          />
        </div>
      </SettingsCard>

      {/* Pot preview */}
      <div className="rounded-xl overflow-hidden min-h-[220px] flex flex-col items-center justify-center gap-4"
        style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="text-7xl select-none">🫙</div>
        <div className="w-48 h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div className="h-full rounded-full w-[35%]" style={{ background: "linear-gradient(90deg, #06b6d4, #3b82f6)" }} />
        </div>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>35% cheio</p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 gap-1.5">
          ▶ Testar 50 Presentes
        </Button>
        <Button className="flex-1 gap-1.5" style={{ background: "#ef4444" }}>
          🔄 Resetar Pote
        </Button>
      </div>

      <SettingsCard title="Link Overlay — Pote">
        <OverlayLink url={overlayUrl} />
        <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>OBS Browser Source 1000×1000</p>
      </SettingsCard>
    </OverlayPageBase>
  );
}
