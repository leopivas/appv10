import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Setup from "./pages/setup";
import LandingPage from "./pages/landing";
import Dashboard from "./pages/dashboard";
import Monitor from "./pages/monitor";
import BulkCheck from "./pages/bulk-check";
import StreamerLookup from "./pages/streamer-lookup";
import StreamerWatchlist from "./pages/streamer-watchlist";
import StreamerJwt from "./pages/streamer-jwt";
import StreamerRateLimits from "./pages/streamer-rate-limits";
import Settings from "./pages/settings";
import GiftGallery from "./pages/gift-gallery";
import Pricing from "./pages/pricing";
import Login from "./pages/login";
import Profile from "./pages/profile";
import Admin from "./pages/admin";
import Atendimento from "./pages/atendimento";
import Leaderboards from "./pages/leaderboards";
import CountryLeaderboard from "./pages/country-leaderboard";
import GamingLeaderboard from "./pages/gaming-leaderboard";
import Gifters from "./pages/gifters";
import GifterProfile from "./pages/gifter-profile";
import LiveCaptions from "./pages/live-captions";
import LiveAnalytics from "./pages/live-analytics";
import Webhooks from "./pages/webhooks";
import Notifications from "./pages/notifications";
import LiveCounts from "./pages/live-counts";
import DevTools from "./pages/dev-tools";
import StreamTools from "./pages/stream-tools";
import ObsOverlay from "./pages/obs-overlay";
import OverlayAlerts from "./pages/overlay-alerts";
import OverlayTopGifters from "./pages/overlay-top-gifters";
import OverlayStats from "./pages/overlay-stats";
import OverlayGoal from "./pages/overlay-goal";
import OverlayCombo from "./pages/overlay-combo";
import OverlaySubscribe from "./pages/overlay-subscribe";
import OverlayChat from "./pages/overlay-chat";
import OverlayTicker from "./pages/overlay-ticker";
import Overlays from "./pages/overlays";
import Scoreboards from "./pages/scoreboards";
import Minigames from "./pages/minigames";
import OverlayLikes from "./pages/overlay-likes";
import OverlayLikesUpgrade from "./pages/overlay-likes-upgrade";
import OverlayCoins from "./pages/overlay-coins";
import OverlayShare from "./pages/overlay-share";
import OverlayBattle from "./pages/overlay-battle";
import OverlayGifts from "./pages/overlay-gifts";
import OverlayWhatsapp from "./pages/overlay-whatsapp";
import OverlayMvp from "./pages/overlay-mvp";
import OverlayPote from "./pages/overlay-pote";
import OverlayNotificacoes from "./pages/overlay-notificacoes";
import OverlayGamer from "./pages/overlay-gamer";
import OverlayLevelUp from "./pages/overlay-level-up";
import Events from "./pages/events";
import SoundAlerts from "./pages/sound-alerts";
import LayoutEditor from "./pages/layout-editor";
import EffectBattle from "./pages/effect-battle";
import TrollGift from "./pages/troll-gift";
import Integracoes from "./pages/integracoes";
import Album from "./pages/album";
import StreamerPublicProfile from "./pages/streamer-public-profile";
import MinigamesRoleta from "./pages/minigames-roleta";
import MinigamesWordBomb from "./pages/minigames-word-bomb";
import MinigamesSentido from "./pages/minigames-sentido";
import MinigamesDefender from "./pages/minigames-defender";
import MinigamesBau from "./pages/minigames-bau";
import ServersPage from "./pages/servers";
import AiAssistant from "./pages/ai-assistant";
import AiVideos from "./pages/ai-videos";
import OverlayScoreboard from "./pages/overlay-scoreboard";
import AppLayout from "./components/layout/app-layout";
import { AuthProvider, useAuth } from "./context/auth-context";
import { UIConfigProvider } from "./context/ui-config-context";
import { WatchlistProvider } from "./context/watchlist-context";
import { MaintenanceProvider, useMaintenance } from "./context/maintenance-context";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache "fresh" por 5 min — não refetcha ao trocar de página nesse período
      staleTime: 5 * 60_000,
      // Mantém cache em memória por 15 min (mesmo com usuário fora do site)
      gcTime: 15 * 60_000,
      // NÃO refetcha ao trocar aba/janela
      refetchOnWindowFocus: false,
      // NÃO refetcha automaticamente ao remontar (usa cache se ainda fresh)
      refetchOnMount: false,
      // Só refetcha se reconectar do offline
      refetchOnReconnect: "always",
      retry: 1,
      // DESATIVADO — refetch em background era o que causava "recarregamento"
      // Componentes que precisam de tempo real devem opt-in com refetchInterval na useQuery
      refetchInterval: false,
      // Mantém dados anteriores enquanto refetcha (sem "piscar" a tela)
      placeholderData: (previousData: unknown) => previousData,
    },
  },
});

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Redirect to="/login" />;
  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Redirect to="/login" />;
  if (!user.isAdmin) return <Redirect to="/" />;
  return <Component />;
}

function GuestRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Redirect to="/" />;
  return <Component />;
}

// Admin maintenance banner shown at top of page for admins only
function AdminMaintenanceBanner() {
  const { maint } = useMaintenance();
  const { user } = useAuth();
  if (!maint.enabled || !user?.isAdmin) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[999] flex items-center justify-center gap-2 py-1.5 text-xs font-semibold"
      style={{ background: "#f59e0b", color: "#000" }}>
      <span>⚠️ MODO MANUTENÇÃO ATIVO — Usuários comuns veem tela de manutenção no painel</span>
    </div>
  );
}

function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <LandingPage />;
  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={() => <GuestRoute component={Login} />} />
      <Route path="/setup" component={Setup} />
      <Route path="/installer" component={Setup} />
      <Route path="/install" component={Setup} />
      {/* Public landing page — handles auth check internally */}
      <Route path="/" component={HomeRoute} />
      {/* /landing — admin preview route (accessible while logged in, bypasses enabled check) */}
      <Route path="/landing" component={() => <LandingPage isPreview />} />
      {/* Overlays — no AppLayout, no auth required (runs inside OBS/TikTok Studio) */}
      {/* IMPORTANT: specific paths must come BEFORE :username wildcard */}
      {/* Public streamer profile — standalone, no auth, no sidebar */}
      <Route path="/s/:username" component={StreamerPublicProfile} />
      <Route path="/overlay/alerts/:username" component={OverlayAlerts} />
      <Route path="/overlay/top-gifters/:username" component={OverlayTopGifters} />
      <Route path="/overlay/stats/:username" component={OverlayStats} />
      <Route path="/overlay/goal/:username" component={OverlayGoal} />
      <Route path="/overlay/combo/:username" component={OverlayCombo} />
      <Route path="/overlay/subscribe/:username" component={OverlaySubscribe} />
      <Route path="/overlay/chat/:username" component={OverlayChat} />
      <Route path="/overlay/ticker/:username" component={OverlayTicker} />
      <Route path="/overlay/scoreboard/:username" component={OverlayScoreboard} />
      <Route path="/overlay/:username" component={ObsOverlay} />
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/monitor/:username" component={() => <ProtectedRoute component={Monitor} />} />

            {/* Streamer tools — each as its own page */}
            <Route path="/streamer/lookup" component={() => <ProtectedRoute component={StreamerLookup} />} />
            <Route path="/streamer/bulk-check" component={() => <ProtectedRoute component={BulkCheck} />} />
            <Route path="/streamer/watchlist" component={() => <ProtectedRoute component={StreamerWatchlist} />} />
            <Route path="/streamer/jwt" component={() => <ProtectedRoute component={StreamerJwt} />} />
            <Route path="/streamer/rate-limits" component={() => <ProtectedRoute component={StreamerRateLimits} />} />

            {/* Legacy redirects */}
            <Route path="/bulk-check" component={() => <Redirect to="/streamer/bulk-check" />} />
            <Route path="/streamers" component={() => <Redirect to="/streamer/lookup" />} />

            {/* Leaderboards */}
            <Route path="/leaderboards" component={() => <ProtectedRoute component={Leaderboards} />} />
            <Route path="/leaderboards/country" component={() => <ProtectedRoute component={CountryLeaderboard} />} />
            <Route path="/leaderboards/gaming" component={() => <ProtectedRoute component={GamingLeaderboard} />} />

            {/* Gifters */}
            <Route path="/gifters" component={() => <ProtectedRoute component={Gifters} />} />
            <Route path="/gifters/:username" component={() => <ProtectedRoute component={GifterProfile} />} />

            {/* Live tools */}
            <Route path="/live-captions" component={() => <ProtectedRoute component={LiveCaptions} />} />
            <Route path="/live-captions/:username" component={() => <ProtectedRoute component={LiveCaptions} />} />
            <Route path="/live-analytics" component={() => <ProtectedRoute component={LiveAnalytics} />} />

            {/* Webhooks */}
            <Route path="/webhooks" component={() => <ProtectedRoute component={Webhooks} />} />

            {/* Notifications / Watchlist */}
            <Route path="/notifications" component={() => <ProtectedRoute component={Notifications} />} />

            {/* Gift catalog */}
            <Route path="/gift-gallery" component={() => <ProtectedRoute component={GiftGallery} />} />

            {/* Live Counts */}
            <Route path="/live-counts" component={() => <ProtectedRoute component={LiveCounts} />} />

            {/* Developer Tools */}
            <Route path="/dev-tools" component={() => <ProtectedRoute component={DevTools} />} />

            {/* Overlay Studio hub */}
            <Route path="/overlays" component={() => <ProtectedRoute component={Overlays} />} />

            {/* Overlay sub-pages */}
            <Route path="/overlays/likes" component={() => <ProtectedRoute component={OverlayLikes} />} />
            <Route path="/overlays/likes-upgrade" component={() => <ProtectedRoute component={OverlayLikesUpgrade} />} />
            <Route path="/overlays/coins" component={() => <ProtectedRoute component={OverlayCoins} />} />
            <Route path="/overlays/share" component={() => <ProtectedRoute component={OverlayShare} />} />
            <Route path="/overlays/battle" component={() => <ProtectedRoute component={OverlayBattle} />} />
            <Route path="/overlays/gifts" component={() => <ProtectedRoute component={OverlayGifts} />} />
            <Route path="/overlays/whatsapp" component={() => <ProtectedRoute component={OverlayWhatsapp} />} />
            <Route path="/overlays/mvp" component={() => <ProtectedRoute component={OverlayMvp} />} />
            <Route path="/overlays/pote" component={() => <ProtectedRoute component={OverlayPote} />} />
            <Route path="/overlays/notificacoes" component={() => <ProtectedRoute component={OverlayNotificacoes} />} />
            <Route path="/overlays/gamer" component={() => <ProtectedRoute component={OverlayGamer} />} />
            <Route path="/overlays/level-up" component={() => <ProtectedRoute component={OverlayLevelUp} />} />

            {/* Tools */}
            <Route path="/events" component={() => <ProtectedRoute component={Events} />} />
            <Route path="/sound-alerts" component={() => <ProtectedRoute component={SoundAlerts} />} />
            <Route path="/layout" component={() => <ProtectedRoute component={LayoutEditor} />} />
            <Route path="/effect-battle" component={() => <ProtectedRoute component={EffectBattle} />} />
            <Route path="/troll-gift" component={() => <ProtectedRoute component={TrollGift} />} />
            <Route path="/integracoes" component={() => <ProtectedRoute component={Integracoes} />} />
            <Route path="/album" component={() => <ProtectedRoute component={Album} />} />

            {/* Stream Tools — OBS/TikTok Studio overlays */}
            <Route path="/stream-tools" component={() => <ProtectedRoute component={StreamTools} />} />

            {/* Scoreboards & Minigames */}
            <Route path="/scoreboards" component={() => <ProtectedRoute component={Scoreboards} />} />
            <Route path="/minigames" component={() => <ProtectedRoute component={Minigames} />} />
            <Route path="/minigames/roleta" component={() => <ProtectedRoute component={MinigamesRoleta} />} />
            <Route path="/minigames/word-bomb" component={() => <ProtectedRoute component={MinigamesWordBomb} />} />
            <Route path="/minigames/sentido" component={() => <ProtectedRoute component={MinigamesSentido} />} />
            <Route path="/minigames/defender" component={() => <ProtectedRoute component={MinigamesDefender} />} />
            <Route path="/minigames/bau" component={() => <ProtectedRoute component={MinigamesBau} />} />

            <Route path="/pricing" component={Pricing} />
            <Route path="/ai" component={() => <ProtectedRoute component={AiAssistant} />} />
            <Route path="/ai/assistant" component={() => <ProtectedRoute component={AiAssistant} />} />
            <Route path="/ai/videos" component={() => <ProtectedRoute component={AiVideos} />} />
            <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
            <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />

            {/* Admin — hard-gated: non-admins are redirected to / */}
            <Route path="/admin" component={() => <AdminRoute component={Admin} />} />
            <Route path="/servers" component={() => <AdminRoute component={ServersPage} />} />
            <Route path="/atendimento" component={() => <AdminRoute component={Atendimento} />} />

            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UIConfigProvider>
          <AuthProvider>
            <MaintenanceProvider>
              <WatchlistProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <AdminMaintenanceBanner />
                  <Router />
                </WouterRouter>
                <Toaster />
              </WatchlistProvider>
            </MaintenanceProvider>
          </AuthProvider>
        </UIConfigProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
