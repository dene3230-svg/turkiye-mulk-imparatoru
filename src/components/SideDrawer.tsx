import { useState } from 'react';
import {
  MapPin,
  Coins,
  Trophy,
  TrendingUp,
  Crown,
  CheckCircle2,
  DoorOpen,
  Users,
  Zap,
  Sparkles,
  CalendarDays,
  Building2,
  ArrowUpCircle,
  Wrench,
  Newspaper,
  Landmark,
  Flame,
  Swords,
  CopyPlus,
  Megaphone,
  Link2,
  Hammer,
  CalendarCheck2,
} from 'lucide-react';
import type {
  AdCampaignTierId,
  BankRecord,
  EmpireState,
  MissionDef,
  RemoteBusinessRecord,
  StockQuote,
} from '../types/game';
import { COMPANY_TIERS, getBlueprintById } from '../game/catalog';
import {
  calculateBusinessHourlyIncome,
  calculateDailyRentAndUtilities,
  calculateDoubleShiftCost,
  calculateNetWorth,
  calculateTotalPendingCash,
  calculateUpgradeCost,
  formatGameClock,
  formatTL,
  getCompanyTier,
  getMissionProgress,
  isBusinessUnderConstruction,
} from '../game/economy';
import { getBranchStaffSlots, resolveBusinessAutomation } from '../game/hrEngine';
import { ensureDynamicMissions } from '../game/missionEngine';
import { getCreditTier } from '../game/bankingEngine';
import {
  AD_CAMPAIGN_TIERS,
  calculateAdCampaignCost,
  formatRemainingGameHours,
  getChainStatusForBusiness,
  isAdCampaignActive,
} from '../game/strategyEngine';
import { MobileGameModal, type MobileModalTab } from './MobileGameModal';
import { BrandLogo } from './BrandLogo';
import type { ManagementTabId } from './RivalsStrategyModal';

export type DrawerTab = 'portfolio' | 'missions' | 'market';

interface SideDrawerProps {
  tab: DrawerTab;
  state: EmpireState;
  stockQuotes?: StockQuote[];
  allBanks?: BankRecord[];
  competitorBusinesses?: RemoteBusinessRecord[];
  now: number;
  onClose: () => void;
  onSelectManagementTab?: (tab: ManagementTabId) => void;
  onSelectBusiness: (businessId: string) => void;
  onEnterInterior: (businessId: string) => void;
  onOpenHrModal?: (businessId: string | null) => void;
  onCloneBusiness?: (businessId: string) => void;
  onLaunchAdCampaign?: (businessId: string, tierId: AdCampaignTierId) => void;
  onHireDoubleShift?: (businessId: string) => void;
  onOpenDayEndReport?: () => void;
  onCollectBusiness: (businessId: string) => void;
  onCollectAll: () => void;
  onUpgradeBusiness: (businessId: string) => void;
  onRestockBusiness: (businessId: string) => void;
  onClaimMission: (mission: MissionDef) => void;
  onEnablePinMode: () => void;
}

export function SideDrawer({
  tab,
  state,
  stockQuotes = [],
  allBanks = [],
  competitorBusinesses = [],
  now,
  onClose,
  onSelectManagementTab,
  onSelectBusiness,
  onEnterInterior,
  onOpenHrModal,
  onCloneBusiness,
  onLaunchAdCampaign,
  onHireDoubleShift,
  onOpenDayEndReport,
  onCollectBusiness,
  onCollectAll,
  onUpgradeBusiness,
  onRestockBusiness,
  onClaimMission,
  onEnablePinMode,
}: SideDrawerProps) {
  const [expandedAdBizId, setExpandedAdBizId] = useState<string | null>(null);
  const netWorth = calculateNetWorth(state, now, stockQuotes);
  const currentTier = getCompanyTier(netWorth);
  const uniqueCities = new Set(state.businesses.map((b) => b.cityPlate)).size;
  const dynamicMissions = ensureDynamicMissions(state, now, stockQuotes);
  const clock = formatGameClock(state.gameMinutes);
  const totalPendingCash = calculateTotalPendingCash(state);
  const pendingAppsCount = (state.franchiseApplications ?? []).filter(
    (a) => a.status === 'pending'
  ).length;

  const titles: Record<DrawerTab, string> = {
    portfolio: 'Yönetim Merkezi',
    missions: 'İmparatorluk Görevleri',
    market: 'Piyasa Haberleri',
  };

  const subtitles: Record<DrawerTab, string> = {
    portfolio: `${state.businesses.length}/${currentTier.maxBranches} şube · ${uniqueCities} il · Net: ${formatTL(netWorth, true)}`,
    missions: `${state.completedMissionsCount ?? state.claimedMissionIds.length} tamamlandı · ${(state.companyXp ?? 0).toLocaleString('tr-TR')} XP`,
    market: `${clock.label} · Sv.${currentTier.level} ${currentTier.title}`,
  };

  const eventRemaining = state.activeEvent
    ? Math.max(0, Math.ceil((state.activeEvent.endsAt - now) / 1000))
    : 0;

  // Yönetim window strictly uses 4 single-row scrollable tabs:
  // 1) İşletmelerim  2) İK & Çalışanlar  3) Franchise & Bayilik  4) Rakip İşletmeler
  const managementTabs: MobileModalTab[] | undefined =
    tab === 'portfolio'
      ? [
          {
            id: 'portfolio',
            label: 'İşletmelerim',
            badge: state.businesses.length,
            icon: <Building2 className="h-4 w-4" />,
          },
          {
            id: 'hr',
            label: 'İK & Çalışanlar',
            icon: <Users className="h-4 w-4" />,
          },
          {
            id: 'franchise',
            label: 'Franchise & Bayilik',
            badge: (state.ownFranchises?.length ?? 0) + pendingAppsCount || undefined,
            icon: <Crown className="h-4 w-4" />,
          },
          {
            id: 'rivals',
            label: 'Rakip İşletmeler',
            icon: <Swords className="h-4 w-4" />,
          },
        ]
      : undefined;

  // Compute live news intelligence for Haberler tab
  const topGainerStock = [...stockQuotes].sort((a, b) => {
    const ca = a.openPrice > 0 ? (a.price - a.openPrice) / a.openPrice : 0;
    const cb = b.openPrice > 0 ? (b.price - b.openPrice) / b.openPrice : 0;
    return cb - ca;
  })[0];
  const avgBankRate =
    allBanks.length > 0
      ? allBanks.reduce((s, b) => s + b.baseInterestRate, 0) / allBanks.length
      : 0.11;
  const creditTier = getCreditTier(state.creditScore ?? 1100);

  return (
    <div data-testid={`drawer-${tab}`}>
      <MobileGameModal
        title={titles[tab]}
        subtitle={subtitles[tab]}
        icon={
          tab === 'portfolio' ? (
            <Building2 className="h-4 w-4" />
          ) : tab === 'missions' ? (
            <Trophy className="h-4 w-4" />
          ) : (
            <Newspaper className="h-4 w-4" />
          )
        }
        headerRight={
          tab === 'portfolio' && totalPendingCash > 0 ? (
            <button
              type="button"
              data-testid="management-collect-all-btn"
              onClick={onCollectAll}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#7A9E7E] px-3 text-xs font-bold text-[#181F29] hover:bg-[#7A9E7E] whitespace-nowrap"
            >
              <Coins className="h-3.5 w-3.5" />
              <span>Tümünü Topla ({formatTL(totalPendingCash, true)})</span>
            </button>
          ) : undefined
        }
        tabs={managementTabs}
        activeTabId={tab === 'portfolio' ? 'portfolio' : undefined}
        onSelectTab={(id) => {
          if (onSelectManagementTab) {
            onSelectManagementTab(id as ManagementTabId);
          } else if (id === 'hr' && onOpenHrModal) {
            onClose();
            onOpenHrModal(state.businesses[0]?.id ?? null);
          }
        }}
        onClose={onClose}
        zIndexClass="z-[1240]"
      >
        {tab === 'portfolio' && (
          <div className="space-y-3">
            {onOpenDayEndReport && (state.pendingDayEndReports ?? []).length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#7A9E7E]/45 bg-emerald-950/45 px-3.5 py-2.5">
                <div className="text-xs text-[#7A9E7E] flex items-center gap-2">
                  <CalendarCheck2 className="h-4 w-4 text-[#7A9E7E] shrink-0" />
                  <span>
                    <strong>{(state.pendingDayEndReports ?? []).length} adet 00:00 Gün Sonu Raporu</strong>{' '}
                    hasılat tahsilatı bekliyor!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenDayEndReport}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#7A9E7E] px-3.5 text-xs font-extrabold text-[#181F29] hover:bg-[#7A9E7E] whitespace-nowrap"
                >
                  <Coins className="h-4 w-4" />
                  <span>Gün Sonu Raporunu Aç</span>
                </button>
              </div>
            )}

            {totalPendingCash > 0 && (state.pendingDayEndReports ?? []).length === 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#7A9E7E]/45 bg-emerald-950/35 px-3.5 py-2.5">
                <div className="text-xs text-[#7A9E7E]">
                  Şube kasalarında gün içi{' '}
                  <strong className="font-mono-num text-sm font-black text-[#7A9E7E]">
                    {formatTL(totalPendingCash)}
                  </strong>{' '}
                  satış birikti (00:00 kapanışında tahsil edilir).
                </div>
                <button
                  type="button"
                  onClick={onCollectAll}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#7A9E7E] px-4 text-xs font-bold text-[#181F29] hover:bg-[#7A9E7E] whitespace-nowrap"
                >
                  <Coins className="h-4 w-4" />
                  <span>Tümünü Topla</span>
                </button>
              </div>
            )}

            {state.businesses.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#334155] bg-[#222B38] px-4 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-[#C8AE7D]/15 text-[#C8AE7D]">
                  <MapPin className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-base font-bold text-white">Henüz İşletmeniz Yok</h3>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-300">
                  81 ilden birini seçin, kara üzerinde bir noktaya pin bırakıp ilk işletmenizi
                  kurun (Başlangıç kotası: {currentTier.maxBranches} şube).
                </p>
                <button
                  type="button"
                  onClick={onEnablePinMode}
                  className="mt-4 min-h-[44px] rounded-xl bg-[#C8AE7D] px-5 text-sm font-bold text-[#181F29] hover:bg-[#D2BB8E]"
                >
                  Haritaya Dön & Pin Bırak
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
                {state.businesses.map((biz) => {
                  const bp = getBlueprintById(biz.blueprintId);
                  const automation = resolveBusinessAutomation(
                    biz,
                    state.cityManagers ?? [],
                    state.businesses
                  );
                  const slots = getBranchStaffSlots(biz);
                  const hourly = calculateBusinessHourlyIncome(
                    biz,
                    state.activeEvent,
                    now,
                    state.businesses,
                    state
                  );
                  const pending = Math.floor(biz.pendingCash);
                  const upgradeCost = calculateUpgradeCost(biz);
                  const canUpgrade = Boolean(bp && biz.level < bp.maxLevel && state.cash >= upgradeCost);
                  const stockPct = Math.round(biz.stockLevel ?? 100);
                  const maintPct = Math.round(biz.maintenanceLevel ?? 100);
                  const needsService = stockPct < 95 || maintPct < 95;
                  const isHq = state.hq?.businessId === biz.id;
                  const chainStatus = getChainStatusForBusiness(biz, state.businesses);
                  const currentGameMin = state.gameMinutes ?? 540;
                  const hasActiveAd = isAdCampaignActive(biz.activeAdCampaign, currentGameMin);
                  const isAdExpanded = expandedAdBizId === biz.id;
                  const quotaFull = state.businesses.length >= currentTier.maxBranches;
                  const underConstruction = isBusinessUnderConstruction(biz);
                  const remConstDays = biz.constructionDaysRemaining ?? 0;
                  const doubleShiftCost = calculateDoubleShiftCost(biz);
                  const dailyRent = calculateDailyRentAndUtilities(biz);

                  return (
                    <div
                      key={biz.id}
                      data-testid={`branch-card-${biz.id}`}
                      className={`flex flex-col justify-between gap-2.5 rounded-xl border p-3 ${
                        underConstruction
                          ? 'border-[#C8AE7D]/45 bg-[#C8AE7D]/15'
                          : 'border-[#334155] bg-[#222B38]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectBusiness(biz.id)}
                          className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                        >
                          {chainStatus.isChain && (
                            <BrandLogo brandKey={chainStatus.brandName} size={36} />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-sm font-bold text-white hover:text-[#C8AE7D]">
                                {biz.customName}
                              </span>
                              {underConstruction && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-[#C8AE7D]/15 border border-[#C8AE7D]/45 px-1.5 py-0.5 text-[11px] font-extrabold text-[#C8AE7D]">
                                  <Hammer className="h-3 w-3" /> İnşaat · {remConstDays}g Kaldı
                                </span>
                              )}
                              {isHq && (
                                <span className="rounded-md bg-[#C8AE7D]/15 px-1.5 py-0.5 text-[11px] font-bold text-[#C8AE7D]">
                                  Merkez Üs
                                </span>
                              )}
                              {chainStatus.isChain && (
                                <span
                                  data-testid={`chain-badge-${biz.id}`}
                                  className="inline-flex items-center gap-0.5 rounded-md bg-[#7E96B0]/15 px-1.5 py-0.5 text-[11px] font-bold text-[#7E96B0]"
                                >
                                  <Link2 className="h-3 w-3" /> Zincir Marka ({chainStatus.branchCount} Şube)
                                </span>
                              )}
                              {automation.autoCollectRevenue && !underConstruction && (
                                <span
                                  data-testid="portfolio-auto-collect-badge"
                                  className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-[#7A9E7E]/15 px-2 py-0.5 text-[11px] font-bold text-[#7A9E7E]"
                                >
                                  <Zap className="h-3 w-3" /> Oto Tahsilat
                                </span>
                              )}
                              {hasActiveAd && biz.activeAdCampaign && (
                                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-fuchsia-500/20 px-2 py-0.5 text-[11px] font-bold text-fuchsia-300">
                                  <Megaphone className="h-3 w-3" /> +%
                                  {Math.round(biz.activeAdCampaign.revenueBoost * 100)} ·{' '}
                                  {formatRemainingGameHours(
                                    biz.activeAdCampaign.endsAtGameMin,
                                    currentGameMin
                                  )}
                                  {biz.activeAdCampaign.autoRenewedByGm ? ' (GM)' : ''}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-400">
                              {String(biz.cityPlate).padStart(2, '0')} {biz.cityName} ·{' '}
                              {biz.districtName} · Sv.{biz.level}/{bp?.maxLevel ?? 10} ·{' '}
                              {bp?.shortName} · Kira -{formatTL(dailyRent, true)}/gün
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-slate-300">
                              <span className="rounded bg-[#1D2532] px-1.5 py-0.5 font-semibold">
                                {slots.workers}/{slots.maxWorkers} Çalışan
                              </span>
                              <span className="rounded bg-[#1D2532] px-1.5 py-0.5 font-semibold">
                                {slots.assistantManagers}/{slots.maxAssistantManagers} Yrd.
                              </span>
                              <span className="rounded bg-[#1D2532] px-1.5 py-0.5 font-semibold">
                                {slots.branchManagers}/{slots.maxBranchManagers} Şube Müd.
                              </span>
                            </div>
                          </div>
                        </button>

                        <span
                          className={`shrink-0 font-mono-num text-sm font-black ${
                            underConstruction ? 'text-[#C8AE7D]' : 'text-[#7A9E7E]'
                          }`}
                        >
                          {underConstruction ? 'İnşaatta' : `${formatTL(hourly)}/sa`}
                        </span>
                      </div>

                      {/* Stock & Maintenance Health */}
                      <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#334155] bg-black/70 p-2 text-[11px]">
                        <div>
                          <div className="flex justify-between text-slate-400">
                            <span>Stok</span>
                            <span className="font-mono-num font-bold text-slate-200">
                              %{stockPct}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#1D2532]">
                            <div
                              className="h-full rounded-full bg-[#7A9E7E]"
                              style={{ width: `${stockPct}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-400">
                            <span>Bakım</span>
                            <span className="font-mono-num font-bold text-slate-200">
                              %{maintPct}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#1D2532]">
                            <div
                              className="h-full rounded-full bg-[#7E96B0]"
                              style={{ width: `${maintPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Primary Revenue / Construction Double Shift & Upgrade Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        {underConstruction ? (
                          onHireDoubleShift && !biz.doubleShiftApplied && remConstDays >= 2 ? (
                            <button
                              type="button"
                              data-testid={`drawer-double-shift-${biz.id}`}
                              disabled={state.cash < doubleShiftCost}
                              onClick={() => onHireDoubleShift(biz.id)}
                              className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#C8AE7D] px-3 text-xs font-black text-[#181F29] hover:bg-[#D2BB8E] disabled:cursor-not-allowed disabled:bg-[#1D2532] disabled:text-slate-500 whitespace-nowrap"
                            >
                              <Zap className="h-3.5 w-3.5" />
                              <span>Çift Vardiya (-%35 · {formatTL(doubleShiftCost, true)})</span>
                            </button>
                          ) : (
                            <div className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 px-3 text-xs font-bold text-[#C8AE7D] whitespace-nowrap">
                              <Hammer className="h-3.5 w-3.5" />
                              <span>
                                {biz.doubleShiftApplied
                                  ? `Çift Vardiya Aktif (${remConstDays}g)`
                                  : `Açılışa ${remConstDays} Gün Kaldı`}
                              </span>
                            </div>
                          )
                        ) : (
                          <button
                            type="button"
                            disabled={pending <= 0}
                            onClick={() => onCollectBusiness(biz.id)}
                            className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#7A9E7E] px-3 text-xs font-bold text-[#181F29] hover:bg-[#7A9E7E] disabled:cursor-not-allowed disabled:bg-[#1D2532] disabled:text-slate-500 whitespace-nowrap"
                          >
                            <Coins className="h-3.5 w-3.5" />
                            <span>
                              {pending > 0
                                ? `Hasılatı Topla (${formatTL(pending, true)})`
                                : '00:00 Bekliyor'}
                            </span>
                          </button>
                        )}

                        {bp && biz.level < bp.maxLevel && (
                          <button
                            type="button"
                            disabled={!canUpgrade}
                            onClick={() => onUpgradeBusiness(biz.id)}
                            className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#C8AE7D] px-3 text-xs font-bold text-[#181F29] hover:bg-[#D2BB8E] disabled:cursor-not-allowed disabled:bg-[#1D2532] disabled:text-slate-500 whitespace-nowrap"
                          >
                            <ArrowUpCircle className="h-3.5 w-3.5" />
                            <span>Yükselt ({formatTL(upgradeCost, true)})</span>
                          </button>
                        )}
                      </div>

                      {/* Prominent Chain Branch Clone + Ad Campaign Toggle Row */}
                      <div className="flex flex-wrap items-center gap-2">
                        {onCloneBusiness && (
                          <button
                            type="button"
                            data-testid={`clone-branch-btn-${biz.id}`}
                            disabled={quotaFull}
                            onClick={() => onCloneBusiness(biz.id)}
                            className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#334155] bg-[#7E96B0]/15 px-3 text-xs font-bold text-[#7E96B0] hover:bg-[#7E96B0]/15 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
                          >
                            <CopyPlus className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              {quotaFull ? 'Şube Kotası Dolu' : 'Şubeyi Çoğalt / Yeni Şube Aç'}
                            </span>
                          </button>
                        )}

                        {onLaunchAdCampaign && (
                          <button
                            type="button"
                            data-testid={`toggle-ad-panel-${biz.id}`}
                            onClick={() =>
                              setExpandedAdBizId((prev) => (prev === biz.id ? null : biz.id))
                            }
                            className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold whitespace-nowrap ${
                              isAdExpanded || hasActiveAd
                                ? 'border-fuchsia-400/60 bg-fuchsia-500/20 text-fuchsia-200'
                                : 'border-[#334155] bg-[#1D2532] text-slate-200 hover:bg-[#2A3444]'
                            }`}
                          >
                            <Megaphone className="h-3.5 w-3.5 shrink-0" />
                            <span>Reklam</span>
                          </button>
                        )}
                      </div>

                      {/* Expandable Advertising & Marketing Drawer */}
                      {isAdExpanded && onLaunchAdCampaign && (
                        <div
                          data-testid={`branch-ad-panel-${biz.id}`}
                          className="rounded-xl border border-fuchsia-500/35 bg-fuchsia-950/20 p-2.5 space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-fuchsia-200">
                              Reklam & Pazarlama Kampanyaları
                            </span>
                            {automation.autoAdsActive && (
                              <span className="rounded bg-[#7A9E7E]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#7A9E7E]">
                                GM Oto-Reklam Aktif
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                            {AD_CAMPAIGN_TIERS.map((tier) => {
                              const adCost = calculateAdCampaignCost(tier.id, biz);
                              const canAffordAd = state.cash >= adCost;
                              const isCurrentTier =
                                hasActiveAd && biz.activeAdCampaign?.tierId === tier.id;
                              return (
                                <button
                                  key={tier.id}
                                  type="button"
                                  data-testid={`launch-ad-${tier.id}-${biz.id}`}
                                  disabled={!canAffordAd}
                                  onClick={() => onLaunchAdCampaign(biz.id, tier.id)}
                                  className={`flex flex-col items-start justify-between rounded-xl border p-2 text-left transition ${
                                    isCurrentTier
                                      ? 'border-fuchsia-400 bg-fuchsia-500/25'
                                      : 'border-[#334155] bg-[#222B38] hover:border-fuchsia-400/60 disabled:opacity-45'
                                  }`}
                                >
                                  <div className="text-[11px] font-bold text-white">
                                    {tier.shortLabel}
                                  </div>
                                  <div className="mt-0.5 text-[10px] text-[#7A9E7E] font-semibold">
                                    +%{Math.round(tier.revenueBoost * 100)} Ciro ·{' '}
                                    {tier.durationGameHours}sa
                                  </div>
                                  <div className="mt-1 font-mono-num text-[11px] font-black text-[#C8AE7D]">
                                    {formatTL(adCost, true)}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Secondary Branch Controls */}
                      <div className="flex flex-wrap items-center gap-2 border-t border-[#334155] pt-2">
                        <button
                          type="button"
                          onClick={() => onSelectBusiness(biz.id)}
                          className="min-h-[38px] flex-1 rounded-xl border border-[#334155] bg-[#1D2532] px-2.5 text-xs font-bold text-[#C8AE7D] hover:bg-[#2A3444] whitespace-nowrap"
                        >
                          Haritada Gör
                        </button>
                        <button
                          type="button"
                          onClick={() => onEnterInterior(biz.id)}
                          className="inline-flex min-h-[38px] flex-1 items-center justify-center gap-1 rounded-xl border border-[#334155] bg-[#1D2532] px-2.5 text-xs font-bold text-[#7E96B0] hover:bg-[#2A3444] whitespace-nowrap"
                        >
                          <DoorOpen className="h-3.5 w-3.5" />
                          <span>İçeri Gir</span>
                        </button>
                        {needsService && (
                          <button
                            type="button"
                            onClick={() => onRestockBusiness(biz.id)}
                            className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 px-2.5 text-xs font-bold text-[#C8AE7D] hover:bg-[#C8AE7D]/15 whitespace-nowrap"
                          >
                            <Wrench className="h-3.5 w-3.5" />
                            <span>Bakım</span>
                          </button>
                        )}
                        {onOpenHrModal && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenHrModal(biz.id);
                            }}
                            className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl border border-[#334155] bg-[#7E96B0]/15 px-3 text-xs font-bold text-[#7E96B0] hover:bg-[#7E96B0]/15 whitespace-nowrap"
                          >
                            <Users className="h-3.5 w-3.5" />
                            <span>İK</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'missions' && (
          <div className="space-y-3">
            <section className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 px-3.5 py-2.5 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-[#C8AE7D]">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>Dinamik Görev Havuzu (Tamamlandıkça Otomatik Yenilenir)</span>
              </span>
              <span className="font-mono-num font-bold text-white">
                {(state.companyXp ?? 0).toLocaleString('tr-TR')} XP ·{' '}
                {state.completedMissionsCount ?? state.claimedMissionIds.length} Tamamlandı
              </span>
            </section>

            <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
              {dynamicMissions.map((mission) => {
                const progress = getMissionProgress(state, mission, now, stockQuotes);
                const completed = progress >= mission.targetValue;
                const pct = Math.min(
                  100,
                  Math.round((progress / Math.max(1, mission.targetValue)) * 100)
                );

                return (
                  <div
                    key={mission.id}
                    data-testid="dynamic-mission-card"
                    className={`flex flex-col justify-between gap-2.5 rounded-xl border p-3.5 ${
                      completed
                        ? 'border-[#C8AE7D]/45 bg-[#C8AE7D]/12'
                        : 'border-[#334155] bg-[#222B38]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                            {completed ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#7A9E7E]" />
                            ) : (
                              <Trophy className="h-4 w-4 shrink-0 text-[#C8AE7D]" />
                            )}
                            <span>{mission.title}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-300">{mission.description}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-mono-num text-sm font-black text-[#C8AE7D]">
                            +{formatTL(mission.rewardCash, true)}
                          </div>
                          <div className="font-mono-num text-xs font-bold text-[#7E96B0]">
                            +{mission.rewardXp ?? 150} XP
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#1D2532]">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            completed ? 'bg-[#7A9E7E]' : 'bg-[#C8AE7D]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                      <span className="font-mono-num font-semibold text-slate-300">
                        {mission.targetType === 'netWorth' || mission.targetType === 'totalEarned'
                          ? `${formatTL(progress, true)} / ${formatTL(mission.targetValue, true)}`
                          : `${Math.min(progress, mission.targetValue)} / ${mission.targetValue}`}
                      </span>

                      {completed ? (
                        <button
                          type="button"
                          data-testid="claim-mission-btn"
                          onClick={() => onClaimMission(mission)}
                          className="min-h-[40px] rounded-xl bg-[#C8AE7D] px-4 text-xs font-bold text-[#181F29] hover:bg-[#D2BB8E]"
                        >
                          Ödülü Al & Yenile
                        </button>
                      ) : (
                        <span className="font-semibold text-slate-400">Devam Ediyor (%{pct})</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'market' && (
          <div className="space-y-3">
            {/* Game Calendar Card */}
            <section className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#334155] bg-[#222B38] p-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <CalendarDays className="h-5 w-5 text-[#C8AE7D]" />
                <span>{clock.label}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="rounded-lg bg-[#1D2532] px-2.5 py-1 font-bold text-[#C8AE7D]">
                  {clock.totalDaysLabel}
                </span>
                <span>Haftalık Temettü: Her 7. Gün · Aylık Bilanço: Her 30. Gün</span>
              </div>
            </section>

            {/* Active Market Event */}
            {state.activeEvent && (
              <section className="rounded-xl border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 p-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#C8AE7D]">
                  <span className="flex items-center gap-1.5">
                    <Flame className="h-4 w-4" />
                    Son Dakika · Aktif Ekonomik Gündem
                  </span>
                  <span className="font-mono-num">{eventRemaining}sn</span>
                </div>
                <h3 className="mt-1.5 text-sm font-black text-white">
                  {state.activeEvent.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-200">
                  {state.activeEvent.description}
                </p>
                <div className="mt-2.5 flex items-center gap-3 text-xs font-bold text-[#7A9E7E]">
                  <span>Gelir x{state.activeEvent.incomeMultiplier.toFixed(2)}</span>
                  <span aria-hidden="true">·</span>
                  <span>Mülk Değeri x{state.activeEvent.valuationMultiplier.toFixed(2)}</span>
                </div>
              </section>
            )}

            {/* Sector Trend & Interest Rate Bulletins */}
            <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
              {topGainerStock && (
                <section className="rounded-xl border border-[#334155] bg-[#222B38] p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#7A9E7E]">
                    <TrendingUp className="h-4 w-4" />
                    <span>Borsa & Sektör Trendi</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <BrandLogo brandKey={topGainerStock.ticker} size={36} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white">
                        {topGainerStock.ticker} · {topGainerStock.name}
                      </div>
                      <div className="text-xs text-slate-300">
                        {topGainerStock.sector} sektörü öne çıkıyor · Fiyat:{' '}
                        <strong className="font-mono-num text-[#7A9E7E]">
                          ₺{topGainerStock.price.toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <section className="rounded-xl border border-[#334155] bg-[#222B38] p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#7E96B0]">
                  <Landmark className="h-4 w-4" />
                  <span>Faiz & Kredi Piyasası</span>
                </div>
                <div className="text-xs text-slate-200 leading-relaxed">
                  Piyasa ortalama banka baz faizi{' '}
                  <strong className="font-mono-num text-[#C8AE7D]">
                    %{(avgBankRate * 100).toFixed(1)}
                  </strong>{' '}
                  seviyesinde. Kredi notunuz ({state.creditScore} ·{' '}
                  <strong className="text-white">{creditTier.label}</strong>) ile{' '}
                  <strong className="font-mono-num text-[#7A9E7E]">
                    {formatTL(creditTier.maxLoanAmount, true)}
                  </strong>{' '}
                  limite erişebilirsiniz.
                </div>
              </section>
            </div>

            {/* Rival Holding Activity */}
            {competitorBusinesses.length > 0 && (
              <section className="rounded-xl border border-[#334155] bg-[#222B38] p-3 space-y-2">
                <div className="text-xs font-bold text-[#B86B5E]">
                  Rakip Holding Hamleleri ({competitorBusinesses.length} Aktif Mülk)
                </div>
                <div className="grid grid-cols-1 gap-2 min-[900px]:grid-cols-2">
                  {competitorBusinesses.slice(0, 4).map((rival) => (
                    <div
                      key={rival.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[#334155] bg-black/70 px-3 py-2 text-xs"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <BrandLogo brandKey={rival.owner_name} size={30} />
                        <div className="min-w-0">
                          <div className="truncate font-bold text-white">{rival.owner_name}</div>
                          <div className="truncate text-slate-400">
                            {rival.business_name} · {rival.city_name} (Sv.{rival.level})
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 font-mono-num font-bold text-[#C8AE7D]">
                        {formatTL(rival.valuation, true)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Company Tiers */}
            <section className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                <Crown className="h-4 w-4 text-[#C8AE7D]" />
                <span>Şirket Seviyeleri ve Şube Kotaları</span>
              </div>
              <div className="grid grid-cols-1 gap-2 min-[900px]:grid-cols-2">
                {COMPANY_TIERS.map((tier) => {
                  const unlocked = netWorth >= tier.minNetWorth;
                  const isCurrent = tier.level === currentTier.level;
                  return (
                    <div
                      key={tier.level}
                      className={`rounded-xl border px-3 py-2.5 text-xs ${
                        isCurrent
                          ? 'border-[#C8AE7D]/45 bg-[#C8AE7D]/12 text-white'
                          : unlocked
                          ? 'border-[#334155] bg-[#222B38] text-slate-200'
                          : 'border-[#334155] bg-black/70 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>
                          Sv.{tier.level} · {tier.title}
                        </span>
                        <span className="font-mono-num text-[#C8AE7D]">
                          {formatTL(tier.minNetWorth, true)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs opacity-85">{tier.unlocksText}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </MobileGameModal>
    </div>
  );
}
