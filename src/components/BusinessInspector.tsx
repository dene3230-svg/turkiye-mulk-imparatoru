import { useState } from 'react';
import {
  X,
  TrendingUp,
  Users,
  Megaphone,
  Coins,
  Trash2,
  MapPin,
  ArrowUpCircle,
  DoorOpen,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Wrench,
  Factory,
  Car,
  Store,
  CopyPlus,
  Link2,
  Hammer,
  Zap,
  Clock,
  Star,
} from 'lucide-react';
import type { AdCampaignTierId, EmpireState, OwnedBusiness } from '../types/game';
import { getBlueprintById } from '../game/catalog';
import {
  calculateBusinessCapacity,
  calculateBusinessHourlyIncome,
  calculateBusinessIncomePerSec,
  calculateBusinessValuation,
  calculateDailyRentAndUtilities,
  calculateDoubleShiftCost,
  calculateUpgradeCost,
  calculateVaultCapacity,
  formatTL,
  hasAvmSynergyForBusiness,
  hasFactorySupplySynergy,
  hasParkingSynergyForBusiness,
  isBusinessUnderConstruction,
} from '../game/economy';
import { getBranchStaffSlots, resolveBusinessAutomation } from '../game/hrEngine';
import {
  AD_CAMPAIGN_TIERS,
  calculateAdCampaignCost,
  formatRemainingGameHours,
  getChainStatusForBusiness,
  isAdCampaignActive,
} from '../game/strategyEngine';
import {
  calculateBranchServiceQuality,
  calculateQualityInvestmentCost,
} from '../game/officeEngine';

interface BusinessInspectorProps {
  business: OwnedBusiness;
  state: EmpireState;
  now: number;
  onEnterInterior: (businessId: string) => void;
  onOpenHrModal: (businessId: string) => void;
  onCloneBusiness?: (businessId: string) => void;
  onLaunchAdCampaign?: (businessId: string, tierId: AdCampaignTierId) => void;
  onHireDoubleShift?: (businessId: string) => void;
  onInvestQuality?: (businessId: string) => void;
  onOpenDayEndReport?: () => void;
  onRestock: (businessId: string) => void;
  onCollect: (businessId: string) => void;
  onUpgrade: (businessId: string) => void;
  onBoost: (businessId: string) => void;
  onSell: (businessId: string) => void;
  onClose: () => void;
}

export function BusinessInspector({
  business,
  state,
  now,
  onEnterInterior,
  onOpenHrModal,
  onCloneBusiness,
  onLaunchAdCampaign,
  onHireDoubleShift,
  onInvestQuality,
  onOpenDayEndReport,
  onRestock,
  onCollect,
  onUpgrade,
  onSell,
  onClose,
}: BusinessInspectorProps) {
  const [confirmSell, setConfirmSell] = useState(false);

  const bp = getBlueprintById(business.blueprintId);
  const automation = resolveBusinessAutomation(
    business,
    state.cityManagers ?? [],
    state.businesses
  );
  const slots = getBranchStaffSlots(business);
  const currentGameMin = state.gameMinutes ?? 540;
  const chainStatus = getChainStatusForBusiness(business, state.businesses);
  const hasActiveAd = isAdCampaignActive(business.activeAdCampaign, currentGameMin);
  const serviceQuality = calculateBranchServiceQuality(
    business,
    state.cityManagers ?? [],
    state.businesses
  );
  const qualityLv = business.qualityInvestmentLevel ?? 0;
  const qualityInvestCost = calculateQualityInvestmentCost(business);

  const incomePerSec = calculateBusinessIncomePerSec(
    business,
    state.activeEvent,
    now,
    state.businesses,
    state
  );
  const hourlyIncome = calculateBusinessHourlyIncome(
    business,
    state.activeEvent,
    now,
    state.businesses,
    state
  );
  const capacity = calculateBusinessCapacity(business, state.businesses, currentGameMin);
  const hasAvmBonus = hasAvmSynergyForBusiness(business, state.businesses);
  const hasParkingBonus = hasParkingSynergyForBusiness(business, state.businesses);
  const hasFactoryBonus = hasFactorySupplySynergy(business, state.businesses);

  const vaultCap = calculateVaultCapacity(business);
  const vaultPct = vaultCap > 0 ? Math.min(100, (business.pendingCash / vaultCap) * 100) : 0;
  const upgradeCost = calculateUpgradeCost(business);
  const valuation = calculateBusinessValuation(business, state.activeEvent, now);

  const isMaxLevel = bp ? business.level >= bp.maxLevel : true;
  const pendingWhole = Math.floor(business.pendingCash);
  const stockPct = Math.round(business.stockLevel ?? 100);
  const maintPct = Math.round(business.maintenanceLevel ?? 100);
  const underConstruction = isBusinessUnderConstruction(business);
  const remDays = business.constructionDaysRemaining ?? 0;
  const totalConstDays = Math.max(remDays, business.constructionTotalDays ?? bp?.constructionDays ?? 3);
  const constProgressPct =
    totalConstDays > 0 ? Math.min(100, Math.round(((totalConstDays - remDays) / totalConstDays) * 100)) : 100;
  const doubleShiftCost = calculateDoubleShiftCost(business);
  const dailyRentEstimate = calculateDailyRentAndUtilities(business);
  const dailyAccruedWhole = Math.floor(business.dailyAccruedGross ?? 0);
  const unitSalePrice = bp?.unitSalePrice ?? 200;
  const unitEstCost = Math.round(unitSalePrice * Math.min(0.82, (bp?.baseCogsRatio ?? 0.44) + 0.31));

  return (
    <aside
      aria-label={`${business.customName} Yönetimi`}
      data-testid="business-inspector"
      className="pointer-events-auto flex h-full w-[clamp(295px,35vw,405px)] flex-col overflow-hidden rounded-2xl border border-slate-200/95 bg-white/98 text-slate-900 shadow-2xl dark:border-slate-700/90 dark:bg-slate-900/98 dark:text-slate-100"
    >
      {/* Header */}
      <div className="compact-short-pad flex shrink-0 items-start justify-between gap-2 border-b border-slate-200 px-3.5 py-2 dark:border-slate-800 sm:px-4 sm:py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>
              {String(business.cityPlate).padStart(2, '0')} {business.cityName} ·{' '}
              {business.districtName}
            </span>
          </div>
          <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {business.customName}
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {bp?.name} · Seviye {business.level}/{bp?.maxLevel ?? 10} · Kapasite {capacity}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="İşletme Panelini Kapat"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="panel-scroll flex-1 min-h-0 space-y-2.5 overflow-y-auto overscroll-contain p-2.5 sm:p-3">
        {/* Automation & Ops Badge */}
        <div
          data-testid="automation-status-badge"
          className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-[11px] font-semibold ${
            automation.fullAutomation
              ? 'border-emerald-300 bg-emerald-50/80 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-300'
              : automation.autoStock
              ? 'border-amber-300 bg-amber-50/80 text-amber-800 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-300'
              : 'border-red-200 bg-red-50/75 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300'
          }`}
        >
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            {automation.fullAutomation || automation.autoStock ? (
              <ShieldCheck className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">
              {automation.fullAutomation
                ? `Otomasyon Aktif · ${automation.managerLabel}`
                : automation.autoStock
                ? `Otomatik Stok · ${automation.managerLabel}`
                : `Yönetici Yok · Stok %${stockPct} / Bakım %${maintPct}`}
            </span>
          </span>
          {!automation.fullAutomation && (stockPct < 95 || maintPct < 95) && (
            <button
              type="button"
              onClick={() => onRestock(business.id)}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white dark:bg-amber-600"
            >
              <Wrench className="h-3 w-3" /> Yenile
            </button>
          )}
        </div>

        {/* Automatic Hourly Revenue Collection Badge (Bölge Sorumlusu / Genel Müdür) */}
        {automation.autoCollectRevenue && (
          <div
            data-testid="auto-collect-badge"
            className="flex items-center justify-between gap-2 rounded-xl border border-emerald-400/80 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>Otomatik Tahsilat Aktif</span>
            </span>
            <span className="text-[10px] font-medium opacity-85">Her oyun saatinde kasaya</span>
          </div>
        )}

        {/* Active Synergies */}
        {(chainStatus.isChain || hasAvmBonus || hasParkingBonus || hasFactoryBonus || business.franchiseBrandName) && (
          <div className="flex flex-wrap gap-1 text-[10px] font-bold">
            {chainStatus.isChain && (
              <span className="flex items-center gap-1 rounded-lg bg-sky-100 px-2 py-0.5 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                <Link2 className="h-3 w-3" /> Zincir Marka ({chainStatus.branchCount} Şube)
              </span>
            )}
            {business.franchiseBrandName && (
              <span className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-0.5 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <Store className="h-3 w-3" /> {business.franchiseBrandName} (+%35)
              </span>
            )}
            {hasAvmBonus && (
              <span className="flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Sparkles className="h-3 w-3" /> AVM +%25
              </span>
            )}
            {hasParkingBonus && (
              <span className="flex items-center gap-1 rounded-lg bg-slate-200 px-2 py-0.5 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                <Car className="h-3 w-3" /> Otopark 250m +%15
              </span>
            )}
            {hasFactoryBonus && (
              <span className="flex items-center gap-1 rounded-lg bg-orange-100 px-2 py-0.5 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                <Factory className="h-3 w-3" /> Fabrika %35 Tedarik
              </span>
            )}
          </div>
        )}

        {/* Construction / Renovation Progress Banner (v1.4.0) */}
        {underConstruction && (
          <div
            data-testid="construction-banner"
            className="rounded-xl border border-amber-400/75 bg-amber-50/90 p-3 space-y-2 dark:border-amber-500/60 dark:bg-amber-950/40"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-800 dark:text-amber-300">
                <Hammer className="h-4 w-4 shrink-0" />
                <span>İnşaat & Tadilat Süreci</span>
              </div>
              <span
                data-testid="construction-days-remaining"
                className="rounded-lg bg-amber-500 px-2 py-0.5 font-mono-num text-[11px] font-black text-slate-950"
              >
                {remDays} Gün Kaldı
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-amber-200/80 dark:bg-amber-950">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                style={{ width: `${Math.max(8, constProgressPct)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-amber-900/90 dark:text-amber-200/90">
              <span>Gelir: ₺0 (Açılış bekleniyor)</span>
              <span className="font-mono-num font-bold text-rose-700 dark:text-rose-300">
                Kira+Tadilat: -{formatTL(dailyRentEstimate)}/gün
              </span>
            </div>

            {onHireDoubleShift && !business.doubleShiftApplied && remDays >= 2 ? (
              <button
                type="button"
                data-testid="double-shift-btn"
                disabled={state.cash < doubleShiftCost}
                onClick={() => onHireDoubleShift(business.id)}
                className="flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-black text-slate-950 shadow-sm hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
              >
                <Zap className="h-3.5 w-3.5 shrink-0" />
                <span>Çift Vardiya Ekip Tut (-%35 Süre · {formatTL(doubleShiftCost, true)})</span>
              </button>
            ) : business.doubleShiftApplied ? (
              <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/35 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 shrink-0" />
                <span>Çift Vardiya Ekibi Aktif — Tadilat %35 hızlandırıldı!</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Primary CTA: Enter Interior & AI Customer Simulation */}
        <button
          type="button"
          onClick={() => onEnterInterior(business.id)}
          className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-amber-700"
        >
          <DoorOpen className="h-4 w-4" />
          <span>{underConstruction ? 'Şantiyeyi İncele (İç Mekan)' : 'İçeri Gir / Yönet (Canlı İç Mekan)'}</span>
        </button>

        {/* Service Quality (1-5★) & Realistic Unit Margin Card (v1.4.1) */}
        <div
          data-testid="service-quality-card"
          className={`rounded-xl border p-2.5 space-y-2 ${
            serviceQuality.stars >= 3.5
              ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30'
              : serviceQuality.stars >= 2.5
              ? 'border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/30'
              : 'border-rose-300 bg-rose-50/80 dark:border-rose-800 dark:bg-rose-950/35'
          }`}
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 shrink-0" />
              <span>Hizmet Kalitesi: {serviceQuality.stars.toFixed(1)} ★</span>
            </span>
            <span className="font-mono-num text-[11px] font-black text-amber-700 dark:text-amber-300">
              Trafik %{serviceQuality.customerTrafficPct}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10.5px] text-slate-600 dark:text-slate-300">
            <span>{bp?.unitProductName ?? 'Birim Ürün'}: <strong>{formatTL(unitSalePrice)}</strong></span>
            <span>Masraf ~<strong>{formatTL(unitEstCost)}</strong> · Moral %{serviceQuality.staffMorale}</span>
          </div>
          {serviceQuality.issues.length > 0 && (
            <div className="text-[10.5px] font-semibold text-rose-700 dark:text-rose-300">
              Uyarı: {serviceQuality.issues[0]}
            </div>
          )}
          {onInvestQuality && (
            <button
              type="button"
              data-testid="invest-quality-btn"
              disabled={state.cash < qualityInvestCost}
              onClick={() => onInvestQuality(business.id)}
              className="flex min-h-[34px] w-full items-center justify-between gap-2 rounded-lg border border-amber-400/70 bg-amber-500/15 px-2.5 text-[11px] font-bold text-amber-900 hover:bg-amber-500/25 disabled:opacity-45 dark:text-amber-200"
            >
              <span>Kalite & Eğitim Yatırımı (Sv.{qualityLv}/5)</span>
              <span className="font-mono-num">{formatTL(qualityInvestCost, true)}</span>
            </button>
          )}
        </div>

        {/* Live Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Saatlik / Günlük Kira</div>
            <div className="mt-0.5 font-mono-num text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {underConstruction ? 'İnşaatta (₺0/sa)' : `${formatTL(hourlyIncome)}/sa`}
            </div>
            <div className="font-mono-num text-[10px] text-rose-600 dark:text-rose-400">
              Kira: -{formatTL(dailyRentEstimate, true)}/gün
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Piyasa Değeri</div>
            <div className="mt-0.5 font-mono-num text-xs font-bold text-slate-900 dark:text-white">
              {formatTL(valuation)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {business.pledgedLoanId ? 'Kredi Teminatında' : `+${formatTL(incomePerSec)}/sn`}
            </div>
          </div>
        </div>

        {/* Daily Register & 00:00 Settlement Info */}
        {!underConstruction && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Gün İçi Satış Kasası
              </span>
              <span className="font-mono-num font-bold text-emerald-800 dark:text-emerald-300">
                {formatTL(Math.max(dailyAccruedWhole, pendingWhole))}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-emerald-200/80 dark:bg-emerald-950">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-300 dark:bg-emerald-400"
                style={{ width: `${vaultPct}%` }}
              />
            </div>
            <div className="mt-1.5 text-[10.5px] text-emerald-800/90 dark:text-emerald-300/90">
              {automation.autoCollectRevenue
                ? 'Şube yöneticisi gece 00:00 kapanışında net kârı otomatik kasaya aktarır.'
                : 'Gün içi satışlar gece 00:00 Gün Sonu Raporu ile kasaya aktarılır.'}
            </div>
            {onOpenDayEndReport && (state.pendingDayEndReports ?? []).length > 0 ? (
              <button
                type="button"
                onClick={onOpenDayEndReport}
                className="mt-2 flex min-h-[36px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 whitespace-nowrap"
              >
                <Coins className="h-4 w-4" />
                <span>00:00 Gün Sonu Raporunu Aç ({state.pendingDayEndReports?.length})</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={pendingWhole <= 0}
                onClick={() => onCollect(business.id)}
                className="mt-2 flex min-h-[36px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600/90 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 whitespace-nowrap"
              >
                <Coins className="h-4 w-4" />
                <span>
                  {pendingWhole > 0
                    ? `Erken Avans Topla (${formatTL(pendingWhole)})`
                    : '00:00 Gün Sonu Kapanışı Bekleniyor'}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Management Actions */}
        <div className="space-y-1.5">
          {/* Open 1-5 Star HR & 5-Tier Automation Pool */}
          <button
            type="button"
            data-testid="open-hr-btn"
            onClick={() => onOpenHrModal(business.id)}
            className="flex min-h-[46px] w-full items-center justify-between gap-2 rounded-lg border border-sky-400/75 bg-sky-50/85 px-3 py-2 text-left transition-all duration-200 ease-out hover:bg-sky-100 active:scale-[0.98] dark:border-sky-500/70 dark:bg-sky-950/45 dark:hover:bg-sky-900/50"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Personel ({slots.workers + slots.assistantManagers + slots.branchManagers}/6)
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  {slots.workers}/{slots.maxWorkers} Çalışan · {slots.assistantManagers}/
                  {slots.maxAssistantManagers} Yrd. · {slots.branchManagers}/
                  {slots.maxBranchManagers} Şube Müd.
                </div>
              </div>
            </div>
            <span className="shrink-0 rounded-lg border border-sky-300/60 bg-sky-600 px-2.5 py-1 text-xs font-bold text-white">
              İK Aç
            </span>
          </button>

          <button
            type="button"
            disabled={isMaxLevel || state.cash < upgradeCost}
            onClick={() => onUpgrade(business.id)}
            className="flex min-h-[46px] w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:bg-amber-50/70 disabled:cursor-not-allowed disabled:opacity-55 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                <ArrowUpCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {isMaxLevel ? 'Maksimum Seviye' : `Seviye ${business.level + 1} Yükselt`}
                </div>
                <div className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                  {bp?.upgradeFocus}
                </div>
              </div>
            </div>
            {!isMaxLevel && (
              <span className="shrink-0 font-mono-num text-xs font-bold text-amber-700 dark:text-amber-400">
                {formatTL(upgradeCost)}
              </span>
            )}
          </button>

          {onCloneBusiness && (
            <button
              type="button"
              onClick={() => onCloneBusiness(business.id)}
              className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 transition-colors hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200 dark:hover:bg-sky-900/50"
            >
              <CopyPlus className="h-4 w-4" />
              <span>Şubeyi Çoğalt / Yeni Şube Aç (Zincirleş)</span>
            </button>
          )}

          {/* Reklam & Pazarlama (3 Tiers + GM Auto-Ads) */}
          <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/70 p-2.5 space-y-2 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/25">
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-fuchsia-800 dark:text-fuchsia-300">
                <Megaphone className="h-3.5 w-3.5 shrink-0" />
                <span>Reklam & Pazarlama</span>
              </span>
              {hasActiveAd && business.activeAdCampaign ? (
                <span className="rounded-md bg-fuchsia-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  +%{Math.round(business.activeAdCampaign.revenueBoost * 100)} ·{' '}
                  {formatRemainingGameHours(business.activeAdCampaign.endsAtGameMin, currentGameMin)}
                </span>
              ) : automation.autoAdsActive ? (
                <span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  GM Oto-Reklam
                </span>
              ) : null}
            </div>

            {onLaunchAdCampaign && (
              <div className="grid grid-cols-3 gap-1.5">
                {AD_CAMPAIGN_TIERS.map((tier) => {
                  const adCost = calculateAdCampaignCost(tier.id, business);
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      disabled={state.cash < adCost}
                      onClick={() => onLaunchAdCampaign(business.id, tier.id)}
                      className="flex flex-col items-start rounded-lg border border-fuchsia-200 bg-white p-1.5 text-left transition hover:border-fuchsia-400 disabled:opacity-45 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <span className="truncate text-[10px] font-bold text-slate-900 dark:text-white">
                        {tier.shortLabel}
                      </span>
                      <span className="text-[9.5px] font-semibold text-emerald-700 dark:text-emerald-400">
                        +%{Math.round(tier.revenueBoost * 100)} · {tier.durationGameHours}sa
                      </span>
                      <span className="mt-0.5 font-mono-num text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
                        {formatTL(adCost, true)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Lifetime Stat & Sell */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Toplam Kazanç:
          </span>
          <span className="font-mono-num font-bold text-slate-800 dark:text-slate-200">
            {formatTL(business.totalEarned)}
          </span>
        </div>

        {!confirmSell ? (
          <button
            type="button"
            disabled={Boolean(business.pledgedLoanId)}
            onClick={() => setConfirmSell(true)}
            className="flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-45 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>
              {business.pledgedLoanId
                ? 'Kredi Teminatlı (Satılamaz)'
                : `Mülkü Sat (${formatTL(valuation + pendingWhole)})`}
            </span>
          </button>
        ) : (
          <div className="rounded-xl border border-red-300 bg-red-50 p-2.5 dark:border-red-800 dark:bg-red-950/50">
            <p className="text-xs font-semibold text-red-800 dark:text-red-200">
              Bu mülkü {formatTL(valuation + pendingWhole)} karşılığında satmak istediğinize emin
              misiniz?
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => onSell(business.id)}
                className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
              >
                Evet, Sat
              </button>
              <button
                type="button"
                onClick={() => setConfirmSell(false)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
