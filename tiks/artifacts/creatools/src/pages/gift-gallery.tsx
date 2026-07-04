import { useState, useMemo } from "react";
import { useGetGiftCatalog, getGetGiftCatalogQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Diamond, SortAsc, SortDesc, Calculator, ChevronDown, ChevronUp } from "lucide-react";

type SortKey = "rank" | "diamondCount" | "name" | "valueUsd" | "valueBrl";
type SortDir = "asc" | "desc";

const PRICE_TIERS = [
  { label: "All", min: 0, max: Infinity },
  { label: "Free", min: 0, max: 0 },
  { label: "1–99", min: 1, max: 99 },
  { label: "100–999", min: 100, max: 999 },
  { label: "1k–9.9k", min: 1000, max: 9999 },
  { label: "10k+", min: 10000, max: Infinity },
];

const COIN_TO_USD = 0.005;
const TIKTOK_CUT = 0.5; // 50% cut TikTok takes — creator receives ~50% of coin value

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
}
function fmtUSD(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export default function GiftGallery() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [calcOpen, setCalcOpen] = useState(false);

  // Calculator state
  const [calcMode, setCalcMode] = useState<"received" | "target">("received");
  const [calcGiftId, setCalcGiftId] = useState<string>("");
  const [calcQty, setCalcQty] = useState<string>("1");
  const [calcTargetBrl, setCalcTargetBrl] = useState<string>("100");

  const { data: gifts, isLoading } = useGetGiftCatalog({
    query: { queryKey: getGetGiftCatalogQueryKey(), staleTime: 1000 * 60 * 60 },
  });

  const filtered = useMemo(() => {
    if (!gifts) return [];
    const tier = PRICE_TIERS[tierFilter];
    return gifts
      .filter((g) => {
        const matchSearch = g.name.toLowerCase().includes(search.toLowerCase());
        const matchTier = g.diamondCount >= tier.min && g.diamondCount <= tier.max;
        return matchSearch && matchTier;
      })
      .sort((a, b) => {
        const mul = sortDir === "asc" ? 1 : -1;
        if (sortKey === "name") return mul * a.name.localeCompare(b.name);
        return mul * ((a[sortKey] as number) - (b[sortKey] as number));
      });
  }, [gifts, search, tierFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = sortDir === "asc" ? SortAsc : SortDesc;

  function diamondColor(count: number) {
    if (count === 0) return "text-muted-foreground";
    if (count <= 100) return "text-cyan-400";
    if (count <= 1000) return "text-green-400";
    if (count <= 10000) return "text-violet-400";
    return "text-yellow-400";
  }

  // Calculator logic
  const selectedGift = gifts?.find((g) => g.id === calcGiftId) ?? (gifts && gifts.length > 0 ? gifts[0] : null);
  const brlPerUsd = selectedGift && selectedGift.diamondCount > 0
    ? selectedGift.valueBrl / selectedGift.valueUsd
    : 5.5;

  const calcResult = useMemo(() => {
    if (!selectedGift) return null;
    const qty = parseFloat(calcQty) || 0;
    const targetBrl = parseFloat(calcTargetBrl) || 0;

    if (calcMode === "received") {
      const grossUsd = qty * selectedGift.diamondCount * COIN_TO_USD;
      const grossBrl = grossUsd * brlPerUsd;
      // Creator receives ~50% after TikTok cut (diamonds are already the creator's share)
      // Actually diamonds = what creator gets, so no additional cut needed on diamond value
      // But the task specifies "após taxa TikTok de ~50%", meaning the caller wants to show
      // net earnings. Diamond value IS already the net creator payout.
      return {
        mode: "received" as const,
        qty,
        diamonds: qty * selectedGift.diamondCount,
        grossUsd,
        grossBrl,
        viewerPaidUsd: grossUsd / TIKTOK_CUT,
        viewerPaidBrl: grossBrl / TIKTOK_CUT,
      };
    } else {
      const giftsNeeded = Math.ceil(targetBrl / selectedGift.valueBrl);
      const earnedUsd = giftsNeeded * selectedGift.valueUsd;
      const earnedBrl = giftsNeeded * selectedGift.valueBrl;
      return {
        mode: "target" as const,
        giftsNeeded,
        targetBrl,
        earnedUsd,
        earnedBrl,
        viewerCostUsd: earnedUsd / TIKTOK_CUT,
        viewerCostBrl: earnedBrl / TIKTOK_CUT,
      };
    }
  }, [selectedGift, calcMode, calcQty, calcTargetBrl, brlPerUsd]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Diamond className="w-7 h-7 text-yellow-400" />
          Gift Gallery
        </h1>
        <p className="text-muted-foreground mt-1">All known TikTok LIVE gifts with coin costs, USD and BRL values</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search gifts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border font-mono text-sm"
          />
        </div>

        {/* Price tier filter */}
        <div className="flex items-center gap-1 flex-wrap">
          {PRICE_TIERS.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setTierFilter(i)}
              className={`text-xs px-2.5 py-1.5 rounded font-mono transition-colors ${
                tierFilter === i
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Sort buttons */}
        <div className="flex items-center gap-1">
          {(["rank", "diamondCount", "valueUsd", "valueBrl", "name"] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded font-mono transition-colors ${
                sortKey === key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {key === "rank" ? "🔥" : key === "diamondCount" ? "💎" : key === "valueUsd" ? "$" : key === "valueBrl" ? "R$" : "A–Z"}
              {sortKey === key && <SortIcon className="w-3 h-3" />}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      {!isLoading && gifts && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono flex-wrap">
          <span>Showing <span className="text-foreground font-semibold">{filtered.length}</span> of {gifts.length} gifts</span>
          {filtered.length > 0 && (
            <>
              <span>·</span>
              <span>
                Cheapest: <span className="text-cyan-400">{filtered.reduce((a, b) => a.diamondCount < b.diamondCount ? a : b).diamondCount.toLocaleString()} 💎</span>
              </span>
              <span>·</span>
              <span>
                Most expensive: <span className="text-yellow-400">{filtered.reduce((a, b) => a.diamondCount > b.diamondCount ? a : b).diamondCount.toLocaleString()} 💎</span>
              </span>
            </>
          )}
        </div>
      )}

      {/* ROI Calculator */}
      <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
        <button
          onClick={() => setCalcOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/4 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold text-foreground">Gift ROI Calculator</span>
            <span className="text-xs text-muted-foreground ml-1">— how much did you earn / need?</span>
          </div>
          {calcOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {calcOpen && (
          <div className="px-4 pb-4 border-t border-border/50 pt-4 space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setCalcMode("received")}
                className={`text-xs px-3 py-1.5 rounded-lg font-mono transition-colors ${calcMode === "received" ? "bg-violet-500/20 text-violet-300 border border-violet-500/40" : "text-muted-foreground border border-transparent hover:border-border"}`}
              >
                I received gifts →
              </button>
              <button
                onClick={() => setCalcMode("target")}
                className={`text-xs px-3 py-1.5 rounded-lg font-mono transition-colors ${calcMode === "target" ? "bg-violet-500/20 text-violet-300 border border-violet-500/40" : "text-muted-foreground border border-transparent hover:border-border"}`}
              >
                I want to earn R$ →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Gift selector */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-mono">Gift type</label>
                <select
                  value={calcGiftId || (selectedGift?.id ?? "")}
                  onChange={(e) => setCalcGiftId(e.target.value)}
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  {isLoading ? (
                    <option>Loading...</option>
                  ) : (
                    (gifts ?? []).slice().sort((a, b) => a.diamondCount - b.diamondCount).map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.diamondCount.toLocaleString()} 💎)
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Qty or target BRL */}
              {calcMode === "received" ? (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-mono">Number of gifts received</label>
                  <Input
                    type="number"
                    min={1}
                    value={calcQty}
                    onChange={(e) => setCalcQty(e.target.value)}
                    className="bg-card border-border font-mono text-sm"
                    placeholder="e.g. 10"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-mono">Target earnings (R$)</label>
                  <Input
                    type="number"
                    min={1}
                    value={calcTargetBrl}
                    onChange={(e) => setCalcTargetBrl(e.target.value)}
                    className="bg-card border-border font-mono text-sm"
                    placeholder="e.g. 100"
                  />
                </div>
              )}

              {/* Gift info */}
              {selectedGift && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-mono">Gift value</label>
                  <div className="bg-card border border-border rounded-md px-3 py-2 text-sm font-mono space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">💎</span>
                      <span className="text-cyan-400">{selectedGift.diamondCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">USD</span>
                      <span className="text-green-400">{fmtUSD(selectedGift.valueUsd)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">BRL</span>
                      <span className="text-emerald-400">{fmtBRL(selectedGift.valueBrl)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Results */}
            {calcResult && selectedGift && (
              <div className="rounded-xl border border-violet-500/20 p-4 space-y-3" style={{ background: "rgba(139,92,246,0.05)" }}>
                {calcResult.mode === "received" && (
                  <>
                    <p className="text-xs text-muted-foreground font-mono mb-2">
                      {calcResult.qty.toLocaleString()} × <span className="text-foreground">{selectedGift.name}</span> =
                      <span className="text-violet-300 ml-1">{calcResult.diamonds.toLocaleString()} 💎</span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <p className="text-xs text-muted-foreground mb-1">You earned (USD)</p>
                        <p className="text-lg font-bold text-green-400 font-mono">{fmtUSD(calcResult.grossUsd)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">net, after TikTok cut</p>
                      </div>
                      <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <p className="text-xs text-muted-foreground mb-1">You earned (BRL)</p>
                        <p className="text-lg font-bold text-emerald-400 font-mono">{fmtBRL(calcResult.grossBrl)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">net, after TikTok cut</p>
                      </div>
                      <div className="rounded-lg p-3 text-center border border-dashed border-border/50" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <p className="text-xs text-muted-foreground mb-1">Viewers spent (USD)</p>
                        <p className="text-base font-semibold text-yellow-400/70 font-mono">{fmtUSD(calcResult.viewerPaidUsd)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">gross (2× your earnings)</p>
                      </div>
                      <div className="rounded-lg p-3 text-center border border-dashed border-border/50" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <p className="text-xs text-muted-foreground mb-1">Viewers spent (BRL)</p>
                        <p className="text-base font-semibold text-yellow-400/70 font-mono">{fmtBRL(calcResult.viewerPaidBrl)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">gross (2× your earnings)</p>
                      </div>
                    </div>
                  </>
                )}
                {calcResult.mode === "target" && (
                  <>
                    <p className="text-xs text-muted-foreground font-mono mb-2">
                      To earn <span className="text-violet-300">{fmtBRL(calcResult.targetBrl)}</span> from <span className="text-foreground">{selectedGift.name}</span>:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <p className="text-xs text-muted-foreground mb-1">Gifts needed</p>
                        <p className="text-2xl font-black text-violet-400 font-mono">{calcResult.giftsNeeded.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{selectedGift.name}</p>
                      </div>
                      <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <p className="text-xs text-muted-foreground mb-1">You'd earn (BRL)</p>
                        <p className="text-lg font-bold text-emerald-400 font-mono">{fmtBRL(calcResult.earnedBrl)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">net earnings</p>
                      </div>
                      <div className="rounded-lg p-3 text-center border border-dashed border-border/50" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <p className="text-xs text-muted-foreground mb-1">Viewers must spend (BRL)</p>
                        <p className="text-base font-semibold text-yellow-400/70 font-mono">{fmtBRL(calcResult.viewerCostBrl)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">total cost to senders</p>
                      </div>
                      <div className="rounded-lg p-3 text-center border border-dashed border-border/50" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <p className="text-xs text-muted-foreground mb-1">Viewers must spend (USD)</p>
                        <p className="text-base font-semibold text-yellow-400/70 font-mono">{fmtUSD(calcResult.viewerCostUsd)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">total cost to senders</p>
                      </div>
                    </div>
                  </>
                )}
                <p className="text-xs text-muted-foreground font-mono">
                  * TikTok keeps ~50% of coin revenue. Creator payout: 1 💎 ≈ {fmtUSD(COIN_TO_USD)}.
                  BRL rate from admin settings.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gift grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {isLoading
          ? Array(24).fill(0).map((_, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <Skeleton className="w-14 h-14 rounded-xl" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-12" />
                </CardContent>
              </Card>
            ))
          : filtered.length === 0
          ? (
            <div className="col-span-full py-16 text-center text-muted-foreground border border-border border-dashed rounded-lg">
              No gifts match your search.
            </div>
          )
          : filtered.map((gift) => (
              <Card
                key={gift.id}
                className="bg-card border-border hover:border-primary/40 transition-all hover:scale-105 group cursor-default"
              >
                <CardContent className="p-3 flex flex-col items-center gap-2 text-center">
                  <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-muted/30 group-hover:bg-muted/50 transition-colors">
                    {gift.iconUrl ? (
                      <img
                        src={gift.iconUrl}
                        alt={gift.name}
                        className="w-11 h-11 object-contain drop-shadow"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Diamond className={`w-8 h-8 ${diamondColor(gift.diamondCount)}`} />
                    )}
                  </div>
                  <div className="w-full">
                    <p className="text-xs font-medium text-foreground leading-tight truncate" title={gift.name}>
                      {gift.name}
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Diamond className={`w-2.5 h-2.5 shrink-0 ${diamondColor(gift.diamondCount)}`} />
                      <span className={`text-xs font-mono font-bold ${diamondColor(gift.diamondCount)}`}>
                        {gift.diamondCount.toLocaleString()}
                      </span>
                    </div>
                    {gift.valueUsd > 0 && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {fmtUSD(gift.valueUsd)}
                      </p>
                    )}
                    {gift.valueBrl > 0 && (
                      <p className="text-xs text-emerald-400/70 font-mono">
                        {fmtBRL(gift.valueBrl)}
                      </p>
                    )}
                  </div>
                  {gift.diamondCount >= 10000 && (
                    <Badge variant="outline" className="text-xs border-yellow-400/40 text-yellow-400 px-1.5 py-0">
                      Rare
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))
        }
      </div>
    </div>
  );
}
