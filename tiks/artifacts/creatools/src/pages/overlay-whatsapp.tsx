import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { OverlayPageBase, OverlayLink, ComoFunciona, SettingsCard, ToggleRow, SegmentControl } from "./overlay-item-base";
import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function OverlayWhatsapp() {
  const { user } = useAuth();
  const overlayUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=whatsapp&session=${user?.id ?? "demo"}`;
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("Entre em contato comigo pelo WhatsApp!");
  const [showQR, setShowQR] = useState(true);
  const [showButton, setShowButton] = useState(true);
  const [position, setPosition] = useState("bottom-right");

  return (
    <OverlayPageBase
      title="WhatsApp"
      subtitle="Exiba seu QR Code e botão de contato durante a live."
      icon={<MessageCircle className="w-5 h-5 text-white" />}
      iconBg="linear-gradient(135deg, #25d366, #128c7e)"
    >
      <ComoFunciona steps={[
        "Configure seu número do WhatsApp abaixo.",
        "Um QR Code e/ou botão aparece no overlay durante a live.",
        "Viewers podem escanear e entrar em contato diretamente.",
      ]} />
      <SettingsCard title="Configuração">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Número do WhatsApp (com DDD)</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ex: 5511999999999"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Mensagem padrão</Label>
            <Input value={message} onChange={e => setMessage(e.target.value)}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
          </div>
        </div>
      </SettingsCard>
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsCard title="Exibir">
          <div className="space-y-3">
            <ToggleRow label="Mostrar QR Code" checked={showQR} onChange={setShowQR} />
            <ToggleRow label="Mostrar botão" checked={showButton} onChange={setShowButton} />
          </div>
        </SettingsCard>
        <SettingsCard title="Posição">
          <SegmentControl options={[{label:"↙",value:"bottom-left"},{label:"↘",value:"bottom-right"},{label:"↗",value:"top-right"},{label:"↖",value:"top-left"}]} value={position} onChange={setPosition} />
        </SettingsCard>
      </div>
      <SettingsCard title="Link do Overlay (OBS / TikTok Studio)"><OverlayLink url={overlayUrl} /></SettingsCard>
    </OverlayPageBase>
  );
}
