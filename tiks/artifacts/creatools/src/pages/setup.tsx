/**
 * Setup Wizard — first-time installation guide.
 * Accessible at /setup, redirects to / when setup is already complete.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { SiTiktok } from "react-icons/si";
import {
  CheckCircle2, Circle, ArrowRight, ArrowLeft, Loader2,
  Key, Shield, CreditCard, Zap, AlertCircle, Eye, EyeOff,
  CheckCheck, RefreshCw, Server, ExternalLink, Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface SetupStatus {
  needsSetup: boolean;
  hasUsers: boolean;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
}

type StepId = "welcome" | "account" | "tiktools" | "altapi" | "stripe" | "done";

const STEPS: { id: StepId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "welcome",  label: "Boas-vindas",    icon: Zap },
  { id: "account",  label: "Conta Admin",    icon: Shield },
  { id: "tiktools", label: "API TikTok",     icon: Key },
  { id: "altapi",   label: "API Alternativa",icon: Server },
  { id: "stripe",   label: "Pagamentos",     icon: CreditCard },
  { id: "done",     label: "Concluído",      icon: CheckCheck },
];

export default function Setup() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<StepId>("welcome");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Account fields
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // tik.tools
  const [tiktoolsKey, setTiktoolsKey] = useState("");
  const [apiTesting, setApiTesting] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Alt API
  const [altEnabled, setAltEnabled] = useState(false);
  const [altBaseUrl, setAltBaseUrl] = useState("");
  const [altApiKey, setAltApiKey] = useState("");
  const [altApiKeyHeader, setAltApiKeyHeader] = useState("x-api-key");
  const [altTestPath, setAltTestPath] = useState("/api/live/top-channels");
  const [altTesting, setAltTesting] = useState(false);
  const [altTestResult, setAltTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Stripe
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripePublishable, setStripePublishable] = useState("");
  const [stripeSecret, setStripeSecret] = useState("");
  const [stripeWebhook, setStripeWebhook] = useState("");
  const [stripeBasicPrice, setStripeBasicPrice] = useState("");
  const [stripeProPrice, setStripeProPrice] = useState("");

  // Result
  const [resultToken, setResultToken] = useState<string | null>(null);

  const BASE = typeof import.meta !== "undefined" ? (import.meta as { env: { BASE_URL: string } }).env.BASE_URL.replace(/\/$/, "") : "";

  useEffect(() => {
    fetch(`${BASE}/api/setup/status`)
      .then((r) => r.json() as Promise<SetupStatus>)
      .then((d) => {
        setStatus(d);
        if (!d.needsSetup) {
          setLocation("/");
        } else {
          setStep(d.hasUsers ? "tiktools" : "welcome");
        }
      })
      .catch(() => setError("Não foi possível verificar o status do sistema"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function testTiktools() {
    if (!tiktoolsKey.trim()) return;
    setApiTesting(true);
    setApiTestResult(null);
    try {
      const r = await fetch(`${BASE}/api/setup/test-api`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: tiktoolsKey }),
      });
      const d = await r.json() as { ok: boolean; message: string };
      setApiTestResult(d);
    } catch {
      setApiTestResult({ ok: false, message: "Erro de conexão" });
    } finally { setApiTesting(false); }
  }

  async function testAltApi() {
    if (!altBaseUrl.trim()) return;
    setAltTesting(true);
    setAltTestResult(null);
    try {
      const r = await fetch(`${BASE}/api/admin/test-alt-api`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl: altBaseUrl, apiKey: altApiKey, apiKeyHeader: altApiKeyHeader, testPath: altTestPath }),
      });
      const d = await r.json() as { ok: boolean; message: string };
      setAltTestResult(d);
    } catch {
      setAltTestResult({ ok: false, message: "Erro de conexão" });
    } finally { setAltTesting(false); }
  }

  async function finishSetup() {
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`${BASE}/api/setup/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminName: adminName || undefined,
          adminEmail: adminEmail || undefined,
          adminPassword: adminPassword || undefined,
          tiktoolsApiKey: tiktoolsKey,
          stripePublishableKey: stripeEnabled ? stripePublishable : undefined,
          stripeSecretKey: stripeEnabled ? stripeSecret : undefined,
          stripeWebhookSecret: stripeEnabled ? stripeWebhook : undefined,
          stripeBasicPriceId: stripeEnabled ? stripeBasicPrice : undefined,
          stripeProPriceId: stripeEnabled ? stripeProPrice : undefined,
          enablePayments: stripeEnabled,
        }),
      });
      const d = await r.json() as { ok: boolean; token?: string; message?: string; error?: string };
      if (!d.ok) { setError(d.error ?? "Erro na configuração"); setSubmitting(false); return; }
      if (d.token) {
        localStorage.setItem("creatools_token", d.token);
        setResultToken(d.token);
      }
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally { setSubmitting(false); }
  }

  const stepIdx = STEPS.findIndex((s) => s.id === step);

  function goNext() {
    const nextSteps: Record<StepId, StepId | null> = {
      welcome: status?.hasUsers ? "tiktools" : "account",
      account: "tiktools",
      tiktools: "altapi",
      altapi: "stripe",
      stripe: "done",
      done: null,
    };
    if (step === "stripe") { void finishSetup(); return; }
    const next = nextSteps[step];
    if (next) setStep(next);
  }

  function goBack() {
    const prevSteps: Record<StepId, StepId | null> = {
      welcome: null,
      account: "welcome",
      tiktools: status?.hasUsers ? null : "account",
      altapi: "tiktools",
      stripe: "altapi",
      done: null,
    };
    const prev = prevSteps[step];
    if (prev) setStep(prev);
  }

  function canProceed(): boolean {
    if (step === "welcome") return true;
    if (step === "account") return !!adminName.trim() && !!adminEmail.trim() && adminPassword.length >= 6;
    if (step === "tiktools") return !!tiktoolsKey.trim();
    if (step === "altapi") return true;
    if (step === "stripe") return true;
    return true;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0814" }}>
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #0d0d1a 0%, #12082a 50%, #0a0a1f 100%)" }}>
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 0 40px rgba(34,197,94,0.3)" }}>
            <CheckCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Instalação concluída!</h1>
          <p className="text-purple-300/60 mb-8">O sistema está configurado e pronto para usar.</p>

          <div className="space-y-3 mb-8 text-left rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              <span className="text-sm text-white/70">API tik.tools configurada</span>
            </div>
            {!status?.hasUsers && (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-sm text-white/70">Conta admin criada — {adminEmail}</span>
              </div>
            )}
            {stripeEnabled && (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-sm text-white/70">Stripe configurado</span>
              </div>
            )}
            {altEnabled && (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-sm text-white/70">API alternativa configurada</span>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (resultToken) setLocation("/");
              else setLocation("/login");
            }}
            className="w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 hover:opacity-90"
            style={{ background: "linear-gradient(90deg, #ec4899, #8b5cf6)" }}>
            Ir para o painel <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #0d0d1a 0%, #12082a 50%, #0a0a1f 100%)" }}>
      {/* Left: step list */}
      <div className="hidden lg:flex flex-col w-72 shrink-0 p-8"
        style={{ background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #06b6d4, #7c3aed)" }}>
            <SiTiktok className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-base text-white">Creatools</div>
            <div className="text-[10px] text-purple-400/50 tracking-widest uppercase">Wizard de Instalação</div>
          </div>
        </div>

        <div className="space-y-2">
          {STEPS.filter((s) => {
            if (s.id === "account" && status?.hasUsers) return false;
            return true;
          }).map((s, i) => {
            const sIdx = STEPS.findIndex((x) => x.id === s.id);
            const done = sIdx < stepIdx;
            const active = s.id === step;
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: active ? "rgba(124,58,237,0.15)" : "transparent" }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: done ? "#22c55e" : active ? "#7c3aed" : "rgba(255,255,255,0.05)" }}>
                  {done ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Icon className="w-3 h-3 text-white/60" />}
                </div>
                <span className="text-sm font-medium" style={{ color: active ? "white" : done ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)" }}>
                  {s.label}
                </span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400" />}
              </div>
            );
          })}
        </div>

        <div className="mt-auto pt-8">
          <div className="text-xs text-purple-300/30 space-y-1">
            <p>Creatools — Plataforma TikTok Live</p>
            <p>Este wizard configura tudo automaticamente.</p>
          </div>
        </div>
      </div>

      {/* Right: step content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          {/* Mobile step indicator */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            {STEPS.filter((s) => !(s.id === "account" && status?.hasUsers)).map((s) => {
              const sIdx = STEPS.findIndex((x) => x.id === s.id);
              const done = sIdx < stepIdx;
              const active = s.id === step;
              return (
                <div key={s.id} className="flex-1 h-1.5 rounded-full"
                  style={{ background: done ? "#22c55e" : active ? "#7c3aed" : "rgba(255,255,255,0.08)" }} />
              );
            })}
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm rounded-xl px-4 py-3 mb-6"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
            </div>
          )}

          {/* ── WELCOME ── */}
          {step === "welcome" && (
            <div>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: "linear-gradient(135deg, #06b6d4, #7c3aed)" }}>
                <SiTiktok className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-black text-white mb-3">Bem-vindo ao Creatools!</h1>
              <p className="text-purple-300/60 text-base mb-8 leading-relaxed">
                Este assistente vai configurar tudo que você precisa para monitorar lives do TikTok, criar overlays e gerenciar sua plataforma — sem precisar programar nada.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  { icon: Shield, label: "Criar sua conta de administrador" },
                  { icon: Key,    label: "Configurar a API do tik.tools (dados TikTok Live)" },
                  { icon: Server, label: "Opcional: API alternativa de backup" },
                  { icon: CreditCard, label: "Opcional: Stripe para cobrar usuários" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 text-sm text-white/60">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(124,58,237,0.2)" }}>
                      <Icon className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    {label}
                  </div>
                ))}
              </div>
              <div className="rounded-xl p-4" style={{ background: "rgba(6,182,212,0.07)", border: "1px solid rgba(6,182,212,0.15)" }}>
                <div className="flex items-start gap-2 text-sm text-cyan-300/70">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
                  <span>Você precisará de uma chave de API do <strong className="text-cyan-300">tik.tools</strong> para continuar. Obtenha em{" "}
                    <a href="https://tik.tools" target="_blank" rel="noopener noreferrer" className="underline text-cyan-400">tik.tools</a>.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── ACCOUNT ── */}
          {step === "account" && (
            <div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(124,58,237,0.2)" }}>
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Conta Admin</h2>
              <p className="text-purple-300/50 text-sm mb-6">Este será o primeiro usuário — com acesso total ao painel admin.</p>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-white/50 mb-1.5 block">Nome completo</Label>
                  <input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Seu nome"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder:text-purple-400/30"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }} />
                </div>
                <div>
                  <Label className="text-xs text-white/50 mb-1.5 block">E-mail</Label>
                  <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@exemplo.com"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder:text-purple-400/30"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }} />
                </div>
                <div>
                  <Label className="text-xs text-white/50 mb-1.5 block">Senha (mín. 6 caracteres)</Label>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="••••••••"
                      className="w-full px-4 pr-10 py-3 rounded-xl text-sm outline-none placeholder:text-purple-400/30"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }} />
                    <button type="button" onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400/40 hover:text-purple-300">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-xs text-white/40 flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-purple-400" />
                    O primeiro usuário criado recebe acesso de administrador automaticamente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── TIK.TOOLS ── */}
          {step === "tiktools" && (
            <div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(6,182,212,0.15)" }}>
                <Key className="w-6 h-6 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">API tik.tools</h2>
              <p className="text-purple-300/50 text-sm mb-6">
                O tik.tools fornece dados de lives do TikTok em tempo real — is this the main API used by the platform.
              </p>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs text-white/50">Chave de API</Label>
                    <a href="https://tik.tools/dashboard" target="_blank" rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 text-cyan-400 hover:text-cyan-300">
                      Obter chave <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input value={tiktoolsKey} onChange={(e) => { setTiktoolsKey(e.target.value); setApiTestResult(null); }}
                    placeholder="tk_live_••••••••••••••••••••••"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono placeholder:text-purple-400/30"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }} />
                </div>

                <button onClick={testTiktools} disabled={!tiktoolsKey.trim() || apiTesting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                  style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", color: "#22d3ee" }}>
                  {apiTesting ? <><Loader2 className="w-4 h-4 animate-spin" />Testando…</> : <><RefreshCw className="w-4 h-4" />Testar conexão</>}
                </button>

                {apiTestResult && (
                  <div className="flex items-start gap-2 text-sm rounded-xl px-4 py-3"
                    style={{
                      background: apiTestResult.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                      border: `1px solid ${apiTestResult.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                      color: apiTestResult.ok ? "#86efac" : "#fca5a5",
                    }}>
                    {apiTestResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                    {apiTestResult.message}
                  </div>
                )}

                {status?.hasApiKey && !tiktoolsKey && (
                  <div className="flex items-center gap-2 text-xs rounded-xl px-3 py-2"
                    style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#fcd34d" }}>
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    Chave atual: <span className="font-mono">{status.apiKeyMasked}</span> — deixe em branco para manter
                  </div>
                )}

                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wide">O que você pode configurar após isso:</p>
                  <div className="space-y-1">
                    {["Limites por plano (sandbox: 20 calls/janela)", "3 WebSockets simultâneos por usuário (tier gratuito)", "Sessões WS de até 10 minutos"].map((t) => (
                      <p key={t} className="text-xs text-white/30 flex items-center gap-1.5">
                        <Circle className="w-2 h-2 text-purple-400/40 shrink-0" />{t}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ALT API ── */}
          {step === "altapi" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}>
                  <Server className="w-6 h-6 text-violet-400" />
                </div>
                <Badge className="text-xs" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  Opcional
                </Badge>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">API Alternativa</h2>
              <p className="text-purple-300/50 text-sm mb-6">
                Configure uma API de backup — qualquer serviço com endpoint HTTP compatível com tik.tools. Será usada se o tik.tools estiver indisponível.
              </p>

              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setAltEnabled((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${altEnabled ? "bg-violet-500" : "bg-white/10"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${altEnabled ? "left-5" : "left-0.5"}`} />
                </button>
                <span className="text-sm text-white/60">{altEnabled ? "API alternativa habilitada" : "Desabilitado (recomendado pular)"}</span>
              </div>

              {altEnabled && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-white/50 mb-1.5 block">URL base da API</Label>
                    <input value={altBaseUrl} onChange={(e) => setAltBaseUrl(e.target.value)} placeholder="https://minha-api.com"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder:text-purple-400/30 font-mono"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-white/50 mb-1.5 block">Header da chave</Label>
                      <input value={altApiKeyHeader} onChange={(e) => setAltApiKeyHeader(e.target.value)} placeholder="x-api-key"
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }} />
                    </div>
                    <div>
                      <Label className="text-xs text-white/50 mb-1.5 block">Chave da API</Label>
                      <input value={altApiKey} onChange={(e) => setAltApiKey(e.target.value)} placeholder="Opcional"
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-white/50 mb-1.5 block">Endpoint de teste</Label>
                    <input value={altTestPath} onChange={(e) => setAltTestPath(e.target.value)} placeholder="/api/live/top-channels"
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none font-mono"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }} />
                  </div>
                  <button onClick={testAltApi} disabled={!altBaseUrl.trim() || altTesting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40"
                    style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#a78bfa" }}>
                    {altTesting ? <><Loader2 className="w-4 h-4 animate-spin" />Testando…</> : <><RefreshCw className="w-4 h-4" />Testar API alternativa</>}
                  </button>
                  {altTestResult && (
                    <div className="flex items-start gap-2 text-sm rounded-xl px-4 py-3"
                      style={{
                        background: altTestResult.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                        border: `1px solid ${altTestResult.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                        color: altTestResult.ok ? "#86efac" : "#fca5a5",
                      }}>
                      {altTestResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                      {altTestResult.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STRIPE ── */}
          {step === "stripe" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.15)" }}>
                  <CreditCard className="w-6 h-6 text-indigo-400" />
                </div>
                <Badge className="text-xs" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  Opcional
                </Badge>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Pagamentos (Stripe)</h2>
              <p className="text-purple-300/50 text-sm mb-6">
                Habilite cobrança de assinaturas com Stripe. Você pode configurar isso depois no painel admin.
              </p>

              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setStripeEnabled((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${stripeEnabled ? "bg-indigo-500" : "bg-white/10"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${stripeEnabled ? "left-5" : "left-0.5"}`} />
                </button>
                <span className="text-sm text-white/60">{stripeEnabled ? "Stripe habilitado" : "Desabilitado (pode configurar depois)"}</span>
              </div>

              {stripeEnabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { label: "Publishable Key (pk_...)", value: stripePublishable, set: setStripePublishable, placeholder: "pk_live_••••••••" },
                      { label: "Secret Key (sk_...)", value: stripeSecret, set: setStripeSecret, placeholder: "sk_live_••••••••" },
                      { label: "Webhook Secret (whsec_...)", value: stripeWebhook, set: setStripeWebhook, placeholder: "whsec_••••••••" },
                      { label: "Price ID — Basic+", value: stripeBasicPrice, set: setStripeBasicPrice, placeholder: "price_••••••••" },
                      { label: "Price ID — Pro", value: stripeProPrice, set: setStripeProPrice, placeholder: "price_••••••••" },
                    ].map(({ label, value, set, placeholder }) => (
                      <div key={label}>
                        <Label className="text-xs text-white/50 mb-1.5 block">{label}</Label>
                        <input value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder}
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none font-mono placeholder:text-purple-400/20"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }} />
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }}>
                    <p className="text-xs text-indigo-300/60 flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-400" />
                      As chaves secretas (sk_ e whsec_) são armazenadas como variáveis de ambiente e nunca aparecem no frontend.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center gap-3 mt-10">
            {step !== "welcome" && (
              <button onClick={goBack}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <ArrowLeft className="w-4 h-4" />Voltar
              </button>
            )}
            <button
              onClick={goNext}
              disabled={!canProceed() || submitting}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: "linear-gradient(90deg, #ec4899, #8b5cf6)" }}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Configurando…</>
              ) : step === "stripe" ? (
                <><CheckCheck className="w-4 h-4" />Finalizar instalação</>
              ) : (
                <>Próximo <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>

          {(step === "altapi" || step === "stripe") && (
            <p className="text-center text-xs text-white/25 mt-3">
              Você pode configurar isso depois em{" "}
              <span className="text-purple-400/60">Admin → Integrações</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
