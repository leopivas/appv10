import { MessageCircle, Wrench, Clock, AlertTriangle } from "lucide-react";
import { useUIConfig } from "@/context/ui-config-context";

interface DashboardMaintenanceOverlayProps {
  message?: string;
  estimatedReturn?: string;
}

export function DashboardMaintenanceOverlay({ message, estimatedReturn }: DashboardMaintenanceOverlayProps) {
  const { config } = useUIConfig();
  const logoText = config?.logoText ?? "Creatools";
  const logoUrl = config?.logoUrl ?? "";
  const headerCfg = config?.headerConfig;

  const appName = headerCfg?.appName ?? logoText;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={{
        backdropFilter: "blur(20px) saturate(0.3) brightness(0.5)",
        WebkitBackdropFilter: "blur(20px) saturate(0.3) brightness(0.5)",
        background: "rgba(10,8,20,0.8)",
      }}>

      <div className="flex flex-col items-center text-center px-6 max-w-md w-full">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
            style={{ background: "linear-gradient(135deg, #06b6d4, #7c3aed)", boxShadow: "0 0 60px rgba(124,58,237,0.4)" }}>
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-12 object-contain" />
            ) : (
              <span className="text-3xl font-black text-white tracking-tight">
                {appName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <p className="text-xl font-bold text-white tracking-tight">{appName}</p>
        </div>

        {/* Maintenance badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full mb-5"
          style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.4)" }}>
          <Wrench className="w-4 h-4 text-yellow-400 animate-pulse" />
          <span className="text-sm font-bold text-yellow-300">Em Manutenção</span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3 leading-tight">
          Estamos atualizando a plataforma
        </h2>

        {message && (
          <p className="text-sm leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
            {message}
          </p>
        )}

        {estimatedReturn && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-6"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
            <Clock className="w-4 h-4 text-purple-400 shrink-0" />
            <p className="text-sm font-medium text-purple-300">
              Previsão de retorno: <strong>{estimatedReturn}</strong>
            </p>
          </div>
        )}

        {!message && !estimatedReturn && (
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
            Voltamos em breve com melhorias. Obrigado pela paciência!
          </p>
        )}

        {/* Support chat button */}
        <button
          onClick={() => {
            if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>)["$crisp"]) {
              ((window as unknown as Record<string, unknown>)["$crisp"] as { push: (a: unknown[]) => void }).push(["do", "chat:open"]);
            }
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
          style={{ background: "linear-gradient(90deg, #7c3aed, #06b6d4)", color: "white" }}>
          <MessageCircle className="w-4 h-4" />
          Entrar em contato via chat
        </button>

        <p className="mt-6 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          {appName} · TikTok LIVE Studio
        </p>
      </div>
    </div>
  );
}

interface PageMaintenanceOverlayProps {
  message?: string;
  estimatedReturn?: string;
}

export function PageMaintenanceOverlay({ message, estimatedReturn }: PageMaintenanceOverlayProps) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center"
      style={{
        backdropFilter: "blur(14px) saturate(0.3)",
        WebkitBackdropFilter: "blur(14px) saturate(0.3)",
        background: "rgba(10,8,20,0.65)",
        borderRadius: "inherit",
      }}>
      <div className="flex flex-col items-center text-center px-6 max-w-sm w-full">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.3)" }}>
          <AlertTriangle className="w-7 h-7 text-yellow-400" />
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full mb-3"
          style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)" }}>
          <Wrench className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
          <span className="text-xs font-bold text-yellow-300 uppercase tracking-wider">Manutenção</span>
        </div>

        <h3 className="text-lg font-bold text-white mb-2">
          {message ?? "Esta seção está temporariamente indisponível"}
        </h3>

        {estimatedReturn && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}>
            <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <p className="text-xs font-medium text-purple-300">
              Previsão: <strong>{estimatedReturn}</strong>
            </p>
          </div>
        )}

        {!estimatedReturn && (
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            Aguarde, voltamos em breve.
          </p>
        )}
      </div>
    </div>
  );
}
