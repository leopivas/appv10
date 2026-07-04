import { useState } from "react";
import { Gift, RotateCcw } from "lucide-react";
import { OverlayPageBase, OverlayLink, ComoFunciona, SettingsCard, ToggleRow } from "./overlay-item-base";
import { useAuth } from "@/context/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function GiftPreview({ title, subtitle, value, sender }: { title: string; subtitle: string; value: string; sender: string }) {
  return (
    <div className="rounded-xl overflow-hidden min-h-[220px] flex flex-col items-center justify-center gap-4 p-8"
      style={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="text-5xl">🌹</div>
      <p className="text-2xl font-black text-white tracking-wider">{title}</p>
      <p className="text-3xl font-black text-white">{sender}</p>
      <p className="text-lg font-bold" style={{ color: "#f97316" }}>{value}</p>
      {subtitle && <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{subtitle}</p>}
    </div>
  );
}

export default function OverlayGifts() {
  const { user } = useAuth();
  const session = user?.id ?? "demo";
  const topGifterUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=top-gifter&session=${session}`;
  const bestGiftUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=best-gift&session=${session}`;
  const fogosUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=fogos&session=${session}`;
  const [resetLive, setResetLive] = useState(true);

  return (
    <OverlayPageBase
      title="Gifts"
      subtitle="Overlays de presentes — Top Gifter, Melhor Presente e Fogos."
      icon={<Gift className="w-5 h-5 text-white" />}
      iconBg="linear-gradient(135deg, #f59e0b, #ef4444)"
    >
      <ComoFunciona steps={[
        "Cada aba abaixo tem seu próprio link de overlay.",
        "Adicione cada link no OBS como Browser Source separado.",
        "Configure o tamanho indicado para cada um.",
      ]} />

      <Tabs defaultValue="top-gifter">
        <TabsList className="w-full" style={{ background: "rgba(255,255,255,0.05)" }}>
          <TabsTrigger value="top-gifter" className="flex-1 gap-1.5">🏆 Top Gifter</TabsTrigger>
          <TabsTrigger value="best-gift" className="flex-1 gap-1.5">⭐ Melhor Presente</TabsTrigger>
          <TabsTrigger value="fogos" className="flex-1 gap-1.5">🎆 Fogos</TabsTrigger>
        </TabsList>

        <TabsContent value="top-gifter" className="space-y-4 mt-4">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Top Gifter — Maior Presente: mostra quem enviou o presente individual mais valioso.
          </p>
          <SettingsCard>
            <ToggleRow label="Reiniciar em nova transmissão" desc="O Top Gifter pertence entre lives." checked={resetLive} onChange={setResetLive} />
          </SettingsCard>
          <div className="min-h-[180px] rounded-xl flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>Prévia aparece ao vivo</p>
          </div>
          <SettingsCard title="Link Overlay — Top Gifter">
            <OverlayLink url={topGifterUrl} />
            <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>OBS Browser Source 500×300</p>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="best-gift" className="space-y-4 mt-4">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Melhor Presente: overlay estilizado mostrando o melhor gift da live.
          </p>
          <GiftPreview title="MELHOR PRESENTE" subtitle="Overlay estilizado mostrando o melhor gift da live" value="1500 COINS" sender="MARIA_LIVE" />
          <SettingsCard title="Link Overlay — Melhor Presente">
            <OverlayLink url={bestGiftUrl} />
            <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>OBS Browser Source 400×400</p>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="fogos" className="space-y-4 mt-4">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Fogos de artifício animados disparam quando alguém envia um presente especial.
          </p>
          <div className="min-h-[180px] rounded-xl flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-center">
              <div className="text-5xl mb-3">🎆</div>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Animação de fogos ao vivo</p>
            </div>
          </div>
          <SettingsCard title="Link Overlay — Fogos">
            <OverlayLink url={fogosUrl} />
            <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>OBS Browser Source 1920×1080</p>
          </SettingsCard>
        </TabsContent>
      </Tabs>
    </OverlayPageBase>
  );
}
