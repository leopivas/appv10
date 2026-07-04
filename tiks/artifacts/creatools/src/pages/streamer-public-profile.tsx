import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import {
  Radio, Users, ExternalLink, Copy, Check, Globe, Eye,
} from "lucide-react";
import { SiTiktok, SiInstagram, SiYoutube, SiWhatsapp, SiDiscord } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SocialLinks {
  instagram?: string;
  youtube?: string;
  whatsapp?: string;
  discord?: string;
  custom?: Array<{ label: string; url: string }>;
}

interface TopGifter {
  username: string;
  displayName: string;
  avatar: string | null;
  diamondCount: number;
}

interface TopGift {
  giftName: string;
  count: number;
  diamondValue: number;
}

interface ProfileSections {
  showStats: boolean;
  showLiveStatus: boolean;
  showTopGifts: boolean;
  showTopGifters: boolean;
  showSocialLinks: boolean;
}

interface PublicProfile {
  username: string;
  displayName: string;
  avatar: string | null;
  followerCount: number | null;
  totalLiveSessions: number | null;
  verified: boolean;
  bio: string | null;
  banner: string | null;
  socialLinks: SocialLinks;
  isLive: boolean;
  viewerCount: number | null;
  likeCount: number | null;
  topGifters: TopGifter[];
  topGifts: TopGift[];
  profileSections: ProfileSections;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

function SocialButton({
  href, icon: Icon, label, color,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
}) {
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] ${color}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-sm font-medium truncate">{label}</span>
      <ExternalLink className="w-3 h-3 ml-auto shrink-0 opacity-50" />
    </a>
  );
}

export default function StreamerPublicProfile() {
  const params = useParams<{ username: string }>();
  const username = params.username;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const publicUrl = window.location.origin + BASE + `/s/${username ?? ""}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=ffffff&bgcolor=1a1a2e&data=${encodeURIComponent(publicUrl)}`;

  useEffect(() => {
    if (!username) return;
    void (async () => {
      try {
        const r = await fetch(`${BASE}/api/profile/public/${encodeURIComponent(username)}`);
        if (!r.ok) { setNotFound(true); return; }
        const data = await r.json() as PublicProfile;
        setProfile(data);

        // SEO
        document.title = `${data.displayName} — Creatools`;
        let og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
        if (!og) { og = document.createElement("meta"); og.setAttribute("property", "og:title"); document.head.appendChild(og); }
        og.content = `${data.displayName} no Creatools`;
        if (data.avatar) {
          let ogImg = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
          if (!ogImg) { ogImg = document.createElement("meta"); ogImg.setAttribute("property", "og:image"); document.head.appendChild(ogImg); }
          ogImg.content = data.avatar;
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [username, BASE]);

  async function copyUrl() {
    try { await navigator.clipboard.writeText(publicUrl); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex flex-col items-center justify-center gap-4 px-4">
        <SiTiktok className="w-12 h-12 text-[#ff004f]/50" />
        <h1 className="text-2xl font-bold text-white">Perfil não encontrado</h1>
        <p className="text-zinc-400 text-center max-w-sm">
          Este streamer não existe ou ainda não ativou o perfil público no Creatools.
        </p>
        <Link href="/">
          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:border-violet-500">
            Ir para o Creatools
          </Button>
        </Link>
      </div>
    );
  }

  const hasSocial =
    profile.socialLinks.instagram ||
    profile.socialLinks.youtube ||
    profile.socialLinks.whatsapp ||
    profile.socialLinks.discord ||
    (profile.socialLinks.custom ?? []).length > 0;

  return (
    <div className="min-h-screen bg-[#0d0d1a] flex flex-col items-center justify-start py-10 px-4">
      {/* Card */}
      <div className="w-full max-w-md space-y-0">

        {/* Banner */}
        {profile.banner && (
          <div
            className="w-full h-28 rounded-t-2xl bg-cover bg-center"
            style={{ backgroundImage: `url(${profile.banner})` }}
          />
        )}

        {/* Main card */}
        <div className={`bg-[#13132a] border border-zinc-800 rounded-2xl p-6 space-y-5 ${profile.banner ? "rounded-t-none border-t-0" : ""}`}>

          {/* Header: avatar + info */}
          <div className="flex items-center gap-4">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.displayName}
                className="w-20 h-20 rounded-full object-cover border-2 border-violet-500/40 shrink-0"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-violet-500/10 border-2 border-violet-500/30 flex items-center justify-center shrink-0">
                <SiTiktok className="w-8 h-8 text-violet-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white truncate">{profile.displayName}</h1>
                {profile.verified && (
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0">
                    ✓ Verificado
                  </Badge>
                )}
              </div>
              <p className="text-sm text-zinc-400">@{profile.username}</p>
              {profile.followerCount !== null && (
                <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                  <Users className="w-3 h-3" />
                  {formatCount(profile.followerCount)} seguidores
                </p>
              )}
            </div>
          </div>

          {/* LIVE badge */}
          {profile.isLive && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                  <span className="text-sm font-bold text-red-400 tracking-wide">AO VIVO AGORA</span>
                </div>
                {profile.viewerCount !== null && (
                  <>
                    <Separator orientation="vertical" className="h-4 bg-red-500/30" />
                    <span className="text-xs text-red-300 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {formatCount(profile.viewerCount)} espectadores
                    </span>
                  </>
                )}
                {profile.likeCount !== null && (
                  <>
                    <Separator orientation="vertical" className="h-4 bg-red-500/30" />
                    <span className="text-xs text-red-300 flex items-center gap-1">
                      ♥ {formatCount(profile.likeCount)}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
          )}

          {/* Social links */}
          {hasSocial && (
            <div className="space-y-2">
              {profile.socialLinks.instagram && (
                <SocialButton
                  href={profile.socialLinks.instagram.includes(".com") ? profile.socialLinks.instagram : `https://instagram.com/${profile.socialLinks.instagram.replace(/^@/, "")}`}
                  icon={SiInstagram}
                  label={`@${profile.socialLinks.instagram.replace(/^@/, "").replace(/.*instagram\.com\//, "")}`}
                  color="text-pink-400 border-pink-500/30 bg-pink-500/5 hover:bg-pink-500/10 hover:border-pink-500/50"
                />
              )}
              {profile.socialLinks.youtube && (
                <SocialButton
                  href={profile.socialLinks.youtube.includes(".com") ? profile.socialLinks.youtube : `https://youtube.com/@${profile.socialLinks.youtube.replace(/^@/, "")}`}
                  icon={SiYoutube}
                  label={profile.socialLinks.youtube.replace(/.*youtube\.com\/@?/, "").replace(/^@/, "") || profile.socialLinks.youtube}
                  color="text-red-400 border-red-500/30 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/50"
                />
              )}
              {profile.socialLinks.whatsapp && (
                <SocialButton
                  href={`https://wa.me/${profile.socialLinks.whatsapp.replace(/\D/g, "")}`}
                  icon={SiWhatsapp}
                  label={profile.socialLinks.whatsapp}
                  color="text-green-400 border-green-500/30 bg-green-500/5 hover:bg-green-500/10 hover:border-green-500/50"
                />
              )}
              {profile.socialLinks.discord && (
                <SocialButton
                  href={profile.socialLinks.discord.includes(".gg") || profile.socialLinks.discord.includes("discord.com") ? profile.socialLinks.discord : `https://discord.gg/${profile.socialLinks.discord}`}
                  icon={SiDiscord}
                  label={profile.socialLinks.discord.replace(/.*discord\.gg\//, "").replace(/.*discord\.com\/invite\//, "") || profile.socialLinks.discord}
                  color="text-indigo-400 border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/50"
                />
              )}
              {(profile.socialLinks.custom ?? []).map((link, i) => (
                <SocialButton
                  key={i}
                  href={link.url}
                  icon={Globe}
                  label={link.label}
                  color="text-zinc-300 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50 hover:border-zinc-600"
                />
              ))}
            </div>
          )}

          {/* Stats */}
          {profile.profileSections.showStats && (profile.followerCount !== null || (profile.totalLiveSessions !== null && profile.totalLiveSessions > 0)) && (
            <div className="flex items-center gap-4 px-1 flex-wrap">
              {profile.followerCount !== null && (
                <div className="text-center">
                  <p className="text-base font-bold text-white">{formatCount(profile.followerCount)}</p>
                  <p className="text-xs text-zinc-500">Seguidores</p>
                </div>
              )}
              {profile.followerCount !== null && profile.totalLiveSessions !== null && profile.totalLiveSessions > 0 && (
                <Separator orientation="vertical" className="h-8 bg-zinc-800" />
              )}
              {profile.totalLiveSessions !== null && profile.totalLiveSessions > 0 && (
                <div className="text-center">
                  <p className="text-base font-bold text-violet-400">{profile.totalLiveSessions}</p>
                  <p className="text-xs text-zinc-500">Lives monitoradas</p>
                </div>
              )}
              {profile.isLive && profile.viewerCount !== null && (
                <>
                  <Separator orientation="vertical" className="h-8 bg-zinc-800" />
                  <div className="text-center">
                    <p className="text-base font-bold text-red-400">{formatCount(profile.viewerCount)}</p>
                    <p className="text-xs text-zinc-500">Ao vivo agora</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Top gifts da sessão atual */}
          {profile.profileSections.showTopGifts && profile.isLive && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🎁</span> Top Gifts — Sessão Atual
              </p>
              {profile.topGifts.length > 0 ? (
                <div className="space-y-1.5">
                  {profile.topGifts.map((g, i) => (
                    <div key={g.giftName} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                      <span className="text-xs font-bold text-zinc-500 w-4 text-center">{i + 1}</span>
                      <span className="text-sm text-zinc-200 flex-1">{g.giftName}</span>
                      <span className="text-xs text-zinc-400">×{g.count}</span>
                      <span className="text-xs text-amber-400">💎 {formatCount(g.diamondValue)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic px-1">Nenhum gift registrado nesta sessão ainda.</p>
              )}
            </div>
          )}

          {/* Top gifters (ranking de gifters) */}
          {profile.profileSections.showTopGifters && profile.topGifters.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="text-amber-400">💎</span> Top Gifters
              </p>
              <div className="space-y-1.5">
                {profile.topGifters.map((g, i) => (
                  <div key={g.username} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <span className="text-xs font-bold text-zinc-500 w-4 text-center">{i + 1}</span>
                    {g.avatar ? (
                      <img src={g.avatar} alt="" className="w-7 h-7 rounded-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">?</div>
                    )}
                    <span className="text-sm text-zinc-200 flex-1 truncate">{g.displayName || g.username}</span>
                    <span className="text-xs text-amber-400 flex items-center gap-0.5">
                      💎 {formatCount(g.diamondCount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator className="bg-zinc-800" />

          {/* Monitor + Share buttons */}
          <div className="flex gap-2">
            <Link href={`/monitor/${profile.username}`} className="flex-1">
              <Button className="w-full bg-violet-600 hover:bg-violet-500 text-white gap-2">
                <SiTiktok className="w-3.5 h-3.5" />
                Monitorar no Creatools
              </Button>
            </Link>
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:border-zinc-500 gap-2 shrink-0"
              onClick={() => void copyUrl()}
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? "Copiado!" : "Copiar URL"}</span>
            </Button>
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:border-zinc-500 gap-1.5 shrink-0"
              onClick={() => setShowQr((v) => !v)}
              title="QR Code"
            >
              <span className="text-xs font-mono">QR</span>
            </Button>
          </div>

          {/* QR code */}
          {showQr && (
            <div className="flex flex-col items-center gap-2 py-2">
              <img
                src={qrUrl}
                alt="QR Code do perfil"
                className="w-44 h-44 rounded-lg border border-zinc-700"
              />
              <p className="text-xs text-zinc-500">Escaneie para acessar o perfil</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 pt-4">
          Criado com{" "}
          <a href={BASE + "/"} className="text-violet-400 hover:text-violet-300 transition-colors">
            Creatools
          </a>{" "}
          — Ferramentas para TikTok LIVE
        </p>
      </div>
    </div>
  );
}
