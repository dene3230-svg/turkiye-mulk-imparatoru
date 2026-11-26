import {
  Briefcase,
  Building2,
  CalendarCheck2,
  Car,
  FileSpreadsheet,
  Hammer,
  Landmark,
  Link2,
  MapPin,
  Presentation,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Swords,
  TrendingUp,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react';
import type {
  EmpireState,
  OfficeEquipmentId,
  OfficeTierId,
  RemoteBusinessRecord,
} from '../types/game';
import type { ExecutiveDashboardMetrics } from '../game/dashboardMetrics';
import {
  calculateBusinessHourlyIncome,
  formatTL,
  isBusinessUnderConstruction,
} from '../game/economy';
import {
  OFFICE_EQUIPMENT_ITEMS,
  OFFICE_EQUIPMENT_MAX_LEVEL,
  calculateBranchServiceQuality,
  calculatePersonalAssetsValuation,
  getNextOfficeTier,
  getOfficeEquipmentLevel,
  getOfficeEquipmentUpgradeCost,
  getOfficeTierById,
} from '../game/officeEngine';
import { OfficeInteriorPreview } from './OfficeInteriorPreview';

/* ============================================================================
   1. FINANS WORKSPACE (Bankalar, Krediler, Bilanço, Borsa, 00:00 Gün Sonu)
   ============================================================================ */
interface FinansWorkspaceProps {
  state: EmpireState;
  metrics: ExecutiveDashboardMetrics;
  onOpenBanking: () => void;
  onOpenAccounting: () => void;
  onOpenBorsa: () => void;
  onOpenInvestments: () => void;
  onOpenDayEnd: () => void;
}

export function FinansWorkspace({
  state,
  metrics,
  onOpenBanking,
  onOpenAccounting,
  onOpenBorsa,
  onOpenInvestments,
  onOpenDayEnd,
}: FinansWorkspaceProps) {
  const unpaidTaxes = (state.pendingTaxes ?? []).filter((t) => t.status !== 'paid');
  const pendingDayEndCount = (state.pendingDayEndReports ?? []).length;

  return (
    <section
      aria-label="Finans Kontrol Merkezi"
      data-testid="workspace-finance"
      className="panel-scroll h-full w-full p-3 lg:p-5"
    >
      <div className="mx-auto max-w-6xl space-y-3 lg:space-y-4">
        {/* Compact KPI Strip */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-2xl border border-cyan-500/25 bg-[#111B30]/85 p-3">
            <div className="text-[11px] text-slate-400">Toplam Likit Kasa</div>
            <div
              className={`mt-1 font-mono-num text-base font-extrabold lg:text-lg ${
                metrics.totalCash < 0 ? 'text-rose-400' : 'text-white'
              }`}
            >
              {formatTL(metrics.totalCash)}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-500/25 bg-[#111B30]/85 p-3">
            <div className="text-[11px] text-slate-400">Kredi Puanı & Aktif Borç</div>
            <div className="mt-1 font-mono-num text-base font-extrabold text-amber-300 lg:text-lg">
              {state.creditScore} · {formatTL(metrics.activeLoanDebt, true)}
            </div>
          </div>
          <div className="rounded-2xl border border-indigo-500/25 bg-[#111B30]/85 p-3">
            <div className="text-[11px] text-slate-400">Borsa & Yatırım Portföyü</div>
            <div className="mt-1 font-mono-num text-base font-extrabold text-indigo-300 lg:text-lg">
              {formatTL(metrics.stockPortfolioValue)}
            </div>
          </div>
          <div className="rounded-2xl border border-rose-500/25 bg-[#111B30]/85 p-3">
            <div className="text-[11px] text-slate-400">Günlük Operasyon Gideri</div>
            <div className="mt-1 font-mono-num text-base font-extrabold text-rose-300 lg:text-lg">
              {formatTL(metrics.dailyOperatingExpenses)}
            </div>
          </div>
        </div>

        {/* 4 Financial Modules */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            data-testid="finance-card-banking"
            onClick={onOpenBanking}
            className="flex flex-col justify-between rounded-2xl border border-amber-400/30 bg-gradient-to-br from-[#2B2412]/90 to-[#111B30]/90 p-4 text-left transition-all hover:border-amber-300/70"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/35 bg-amber-500/15 text-amber-300">
                <Landmark className="h-5 w-5" />
              </div>
              <span className="font-mono-num text-xs font-bold text-amber-300">
                Limit {formatTL(metrics.availableCreditLimit, true)}
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-extrabold text-white">Bankalar & Ticari Krediler</h3>
              <p className="mt-1 text-xs text-slate-300">
                Sıkı kredi denetimi, aylık taksit ödemeleri, teminat yönetimi ve kendi bankanı kurma.
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-700/60 pt-2.5 text-[11px] font-bold text-amber-200">
              <span>{metrics.activeLoanCount} aktif kredi · Faiz indirimi -%{metrics.loanInterestDiscountPct}</span>
              <span>Aç →</span>
            </div>
          </button>

          <button
            type="button"
            data-testid="finance-card-accounting"
            onClick={onOpenAccounting}
            className="flex flex-col justify-between rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-[#10293B]/90 to-[#111B30]/90 p-4 text-left transition-all hover:border-cyan-300/70"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/35 bg-cyan-500/15 text-cyan-300">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <span className="font-mono-num text-xs font-bold text-cyan-300">
                {unpaidTaxes.length} Bekleyen Vergi
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-extrabold text-white">Bilanço, Vergi & Muhasebe</h3>
              <p className="mt-1 text-xs text-slate-300">
                KDV, SGK, Kurumlar ve Belediye vergileri, günlük/aylık/yıllık kâr-zarar tabloları.
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-700/60 pt-2.5 text-[11px] font-bold text-cyan-200">
              <span>Muhasebe: {state.accountant ? 'Otomatik Aktif' : 'Manuel Takip'}</span>
              <span>Aç →</span>
            </div>
          </button>

          <button
            type="button"
            data-testid="finance-card-borsa"
            onClick={onOpenBorsa}
            className="flex flex-col justify-between rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-[#1B1F47]/90 to-[#111B30]/90 p-4 text-left transition-all hover:border-indigo-300/70"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/35 bg-indigo-500/15 text-indigo-300">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="font-mono-num text-xs font-bold text-indigo-300">
                {(state.stockPortfolio ?? []).filter((h) => h.shares > 0).length} Hisse Pozisyonu
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-extrabold text-white">Borsa İstanbul & Halka Arz</h3>
              <p className="mt-1 text-xs text-slate-300">
                Canlı hisse alım-satım emirleri, temettü gelirleri ve kendi holdingini halka arz etme.
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-700/60 pt-2.5 text-[11px] font-bold text-indigo-200">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInvestments();
                }}
                className="underline decoration-indigo-400/50 underline-offset-2"
              >
                Yatırımlarım ({formatTL(metrics.stockPortfolioValue, true)})
              </span>
              <span>Piyasayı Aç →</span>
            </div>
          </button>

          <button
            type="button"
            data-testid="finance-card-dayend"
            onClick={onOpenDayEnd}
            className="flex flex-col justify-between rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-[#102E2B]/90 to-[#111B30]/90 p-4 text-left transition-all hover:border-emerald-300/70"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/35 bg-emerald-500/15 text-emerald-300">
                <CalendarCheck2 className="h-5 w-5" />
              </div>
              <span className="font-mono-num text-xs font-bold text-emerald-300">
                {pendingDayEndCount} Bekleyen Kapanış
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-extrabold text-white">00:00 Gün Sonu Hasılat & Kapanış</h3>
              <p className="mt-1 text-xs text-slate-300">
                Şube bazlı günlük kâr/zarar raporlarını incele ve bekleyen net nakit tahsilatlarını kasaya aktar.
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-700/60 pt-2.5 text-[11px] font-bold text-emerald-200">
              <span>Arşivde {(state.dayEndHistory ?? []).length} gün sonu kaydı</span>
              <span>Raporları Aç →</span>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   2. İŞLETMELER WORKSPACE (Şubeler, Personel, Hizmet Kalitesi, Franchise, Rakipler)
   ============================================================================ */
interface BusinessesWorkspaceProps {
  state: EmpireState;
  competitorBusinesses: RemoteBusinessRecord[];
  maxBranches: number;
  now: number;
  onGoMapNewBranch: () => void;
  onOpenHr: (businessId?: string) => void;
  onOpenFranchise: () => void;
  onOpenRivals: () => void;
  onFocusBusinessOnMap: (businessId: string) => void;
  onEnterInterior: (businessId: string) => void;
  onInvestQuality: (businessId: string) => void;
  onUpgradeBusiness: (businessId: string) => void;
  onCloneBusiness: (businessId: string) => void;
  onRestockBusiness: (businessId: string) => void;
}

export function BusinessesWorkspace({
  state,
  competitorBusinesses,
  maxBranches,
  now,
  onGoMapNewBranch,
  onOpenHr,
  onOpenFranchise,
  onOpenRivals,
  onFocusBusinessOnMap,
  onEnterInterior,
  onInvestQuality,
  onUpgradeBusiness,
  onCloneBusiness,
  onRestockBusiness,
}: BusinessesWorkspaceProps) {
  return (
    <section
      aria-label="İşletme ve Şube Yönetimi"
      data-testid="workspace-businesses"
      className="panel-scroll h-full w-full p-3 lg:p-5"
    >
      <div className="mx-auto max-w-6xl space-y-3">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-700/70 bg-[#111B30]/85 px-3.5 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenHr(state.businesses[0]?.id)}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/25 whitespace-nowrap"
            >
              <Users className="h-3.5 w-3.5" />
              İK & Personel
            </button>
            <button
              type="button"
              onClick={onOpenFranchise}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25 whitespace-nowrap"
            >
              <Store className="h-3.5 w-3.5" />
              Franchise & Bayilik
            </button>
            <button
              type="button"
              onClick={onOpenRivals}
              className="flex items-center gap-1.5 rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-500/25 whitespace-nowrap"
            >
              <Swords className="h-3.5 w-3.5" />
              Rakip İşletmeler ({competitorBusinesses.length})
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="font-mono-num text-xs font-bold text-slate-300">
              Şube Kotası: {state.businesses.length}/{maxBranches}
            </span>
            <button
              type="button"
              data-testid="new-branch-on-map-btn"
              onClick={onGoMapNewBranch}
              className="flex items-center gap-1.5 rounded-xl border border-amber-400/60 bg-amber-400/20 px-3 py-1.5 text-xs font-extrabold text-amber-200 hover:bg-amber-400/30 whitespace-nowrap"
            >
              <MapPin className="h-3.5 w-3.5" />
              Haritada Yeni Şube Kur
            </button>
          </div>
        </div>

        {/* Owned Businesses Grid */}
        {state.businesses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-[#111B30]/70 p-8 text-center">
            <Building2 className="mx-auto h-10 w-10 text-cyan-400/70" />
            <h3 className="mt-3 text-base font-extrabold text-white">Henüz Kurulmuş Şubeniz Yok</h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
              Türkiye haritasında istediğiniz il ve caddeye pin bırakarak ilk işletmenizi kurun, personel atayın ve hizmet kalitenizi yükselterek müşteri trafiğini artırın.
            </p>
            <button
              type="button"
              onClick={onGoMapNewBranch}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/60 bg-cyan-500/20 px-4 py-2 text-xs font-extrabold text-cyan-100 hover:bg-cyan-500/30"
            >
              <MapPin className="h-4 w-4" />
              Haritaya Git ve İlk İşletmeni Kur
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {state.businesses.map((biz) => {
              const underConst = isBusinessUnderConstruction(biz);
              const quality = calculateBranchServiceQuality(
                biz,
                state.cityManagers ?? [],
                state.businesses
              );
              const hourly = underConst
                ? 0
                : calculateBusinessHourlyIncome(
                    biz,
                    state.activeEvent,
                    now,
                    state.businesses,
                    state
                  );
              return (
                <div
                  key={biz.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-700/70 bg-[#111B30]/85 p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-extrabold text-white">
                          {biz.customName}
                        </h3>
                        <span className="shrink-0 font-mono-num text-[11px] font-bold text-cyan-300">
                          Sv.{biz.level}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {biz.cityName} · {biz.districtName} · {(biz.employees ?? []).length} Personel
                      </p>
                    </div>
                    <div className="text-right">
                      {underConst ? (
                        <span className="inline-flex items-center gap-1 font-mono-num text-xs font-bold text-amber-300">
                          <Hammer className="h-3.5 w-3.5" />
                          {biz.constructionDaysRemaining} Gün
                        </span>
                      ) : (
                        <div className="font-mono-num text-xs font-extrabold text-emerald-300">
                          {formatTL(hourly * 24, true)}/gün
                        </div>
                      )}
                      <div className="mt-0.5 flex items-center justify-end gap-1 font-mono-num text-[11px] text-amber-300">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {quality.stars.toFixed(1)} · Trafik %{quality.customerTrafficPct}
                      </div>
                    </div>
                  </div>

                  {/* Quality / Stock / Maintenance Bars */}
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10px] text-slate-300">
                    <div>
                      <div className="flex justify-between">
                        <span>Stok</span>
                        <span className="font-mono-num">%{Math.round(biz.stockLevel)}</span>
                      </div>
                      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full bg-cyan-400"
                          style={{ width: `${Math.max(4, Math.round(biz.stockLevel))}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between">
                        <span>Hijyen & Bakım</span>
                        <span className="font-mono-num">%{Math.round(biz.maintenanceLevel)}</span>
                      </div>
                      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full bg-emerald-400"
                          style={{ width: `${Math.max(4, Math.round(biz.maintenanceLevel))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-800 pt-2.5">
                    <button
                      type="button"
                      onClick={() => onOpenHr(biz.id)}
                      className="flex items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1 text-[11px] font-bold text-cyan-200 hover:bg-cyan-500/25"
                    >
                      <Users className="h-3 w-3" /> Personel
                    </button>
                    <button
                      type="button"
                      onClick={() => onInvestQuality(biz.id)}
                      className="flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-200 hover:bg-amber-500/25"
                    >
                      <Sparkles className="h-3 w-3" /> Kalite
                    </button>
                    <button
                      type="button"
                      onClick={() => onRestockBusiness(biz.id)}
                      className="flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700"
                    >
                      <Wrench className="h-3 w-3" /> İkmal
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpgradeBusiness(biz.id)}
                      className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/25"
                    >
                      Yükselt
                    </button>
                    <button
                      type="button"
                      onClick={() => onCloneBusiness(biz.id)}
                      className="flex items-center gap-1 rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/15 px-2.5 py-1 text-[11px] font-bold text-fuchsia-200 hover:bg-fuchsia-500/25"
                    >
                      <Link2 className="h-3 w-3" /> Çoğalt
                    </button>
                    <button
                      type="button"
                      onClick={() => onEnterInterior(biz.id)}
                      className="rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700"
                    >
                      İç Mekan
                    </button>
                    <button
                      type="button"
                      onClick={() => onFocusBusinessOnMap(biz.id)}
                      className="rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700"
                    >
                      Harita
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================================================================
   3. OFİSİM WORKSPACE — 3-Column Dark Navy "OFİSİM & PRESTİJ YÖNETİMİ"
   ============================================================================ */
interface OfficeWorkspaceProps {
  state: EmpireState;
  metrics: ExecutiveDashboardMetrics;
  unreadNotifCount: number;
  claimableMissionCount: number;
  chatCount: number;
  onUpgradeEquipment: (id: OfficeEquipmentId) => void;
  onUpgradeOfficeTier: (tierId: OfficeTierId) => void;
  onOpenOfficeModal: (tab: 'design' | 'assets' | 'phone') => void;
  onOpenPatronChat: () => void;
  onOpenMarketNews: () => void;
  onOpenMissions: () => void;
  onOpenNotifications: () => void;
  onOpenLeaderboard: () => void;
}

function EquipmentIcon({ id }: { id: OfficeEquipmentId }) {
  if (id === 'exec_desk') return <Briefcase className="h-4 w-4 lg:h-5 lg:w-5" />;
  if (id === 'meeting_room') return <Presentation className="h-4 w-4 lg:h-5 lg:w-5" />;
  if (id === 'guest_hospitality') return <UserCheck className="h-4 w-4 lg:h-5 lg:w-5" />;
  return <ShieldCheck className="h-4 w-4 lg:h-5 lg:w-5" />;
}

export function OfficeWorkspace({
  state,
  metrics,
  unreadNotifCount,
  chatCount,
  onUpgradeEquipment,
  onUpgradeOfficeTier,
  onOpenOfficeModal,
}: OfficeWorkspaceProps) {
  const currentTier = getOfficeTierById(state.officeTierId);
  const nextTier = getNextOfficeTier(state.officeTierId);
  const ownedAssetsCount = (state.personalAssetIds ?? []).length;
  const personalAssetsVal = calculatePersonalAssetsValuation(state);
  const prestigePct = Math.max(0, Math.min(100, Math.round(metrics.officePrestige)));

  const canAffordNextTier =
    Boolean(nextTier) &&
    state.cash >= (nextTier?.cost ?? 0) &&
    (state.brandRecognition ?? 5) >= (nextTier?.minBrandRecognition ?? 0);

  return (
    <section
      aria-label="Ofisim ve Prestij Yönetimi 3 Sütunlu Kontrol Paneli"
      data-testid="workspace-office"
      className="panel-scroll h-full w-full p-1.5 lg:p-3.5"
    >
      <div className="grid min-h-full grid-cols-1 gap-1.5 min-[680px]:h-full min-[680px]:grid-cols-12 lg:gap-3.5">
        {/* ============================================================
            COLUMN 1 (LEFT): MEVCUT OFİS, İÇ MEKAN ÖNİZLEME, PRESTİJ & BONUSLAR
           ============================================================ */}
        <div
          data-testid="office-col-left"
          className="flex min-h-0 flex-col justify-between gap-1.5 min-[680px]:col-span-4 lg:gap-2.5"
        >
          {/* Current Office Title */}
          <div className="shrink-0 px-0.5 leading-tight">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[10px] font-extrabold tracking-wide text-slate-100 lg:text-xs">
                MEVCUT OFİS
              </h2>
              <span className="font-mono-num text-[9px] font-bold text-amber-300 lg:text-[10px]">
                Kademe {currentTier.level}/4
              </span>
            </div>
            <div
              data-testid="office-current-tier-name"
              className="mt-0.5 truncate text-[10.5px] font-semibold uppercase tracking-wide text-slate-300 lg:text-xs"
            >
              {currentTier.name}
            </div>
          </div>

          {/* Architectural Interior Preview Card */}
          <div
            data-testid="office-interior-preview"
            className="relative min-h-[96px] flex-[1.15] overflow-hidden rounded-2xl border border-slate-700/75 bg-[#0D1628] shadow-[0_8px_28px_rgba(2,6,23,0.45)]"
          >
            <OfficeInteriorPreview tierId={currentTier.id} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0B1221]/85 to-transparent" />
            <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[8.5px] font-bold text-slate-200 lg:bottom-2 lg:left-3 lg:right-3 lg:text-[10px]">
              <span className="truncate drop-shadow">{currentTier.subtitle}</span>
              <span className="shrink-0 rounded-md bg-slate-950/75 px-1.5 py-0.5 font-mono-num text-amber-300 border border-amber-400/35">
                Tanınırlık %{metrics.brandRecognitionPct}
              </span>
            </div>
          </div>

          {/* Prestige Score Progress Bar (0 - 100) */}
          <div className="shrink-0 space-y-1 px-0.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-extrabold tracking-wide text-slate-100 lg:text-xs">
                PRESTİJ PUANI:{' '}
                <strong
                  data-testid="office-prestige-score"
                  className="font-mono-num text-amber-400"
                >
                  {prestigePct}
                </strong>{' '}
                <span className="font-mono-num font-semibold text-slate-400">/ 100</span>
              </span>
              <span className="font-mono-num text-[9.5px] font-bold text-amber-300 lg:text-[11px]">
                %{prestigePct}
              </span>
            </div>
            <div className="relative h-3.5 w-full overflow-hidden rounded-full border border-slate-700/70 bg-slate-900/90 lg:h-4.5">
              <div
                className="flex h-full items-center justify-end rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 pr-1.5 shadow-[0_0_16px_rgba(251,191,36,0.45)] transition-all duration-300"
                style={{ width: `${Math.max(14, prestigePct)}%` }}
              >
                <span className="font-mono-num text-[8px] font-black text-slate-950 lg:text-[9.5px]">
                  {prestigePct}%
                </span>
              </div>
            </div>
          </div>

          {/* Active Office Bonuses Card */}
          <div
            data-testid="office-active-bonuses"
            className="shrink-0 rounded-2xl border border-slate-700/70 bg-[#111B30]/85 p-2 backdrop-blur-md lg:p-3.5"
          >
            <div className="text-[9.5px] font-extrabold tracking-wide text-slate-100 lg:text-[11px]">
              AKTİF OFİS BONUSLARI
            </div>
            <div className="mt-1.5 flex flex-col gap-1.5 lg:mt-2 lg:gap-2">
              <div
                data-testid="office-bonus-interest"
                className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border border-cyan-400/55 bg-cyan-500/10 px-2.5 py-0.5 text-[9.5px] font-bold text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.14)] lg:px-3 lg:py-1 lg:text-xs"
              >
                <span className="truncate">Banka Faiz İndirimi:</span>
                <strong className="shrink-0 font-mono-num text-cyan-300">
                  -%{metrics.loanInterestDiscountPct}
                </strong>
              </div>
              <div
                data-testid="office-bonus-supply"
                className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border border-rose-400/55 bg-rose-500/10 px-2.5 py-0.5 text-[9.5px] font-bold text-rose-200 shadow-[0_0_12px_rgba(251,113,133,0.14)] lg:px-3 lg:py-1 lg:text-xs"
              >
                <span className="truncate">Tedarikçi İndirimi:</span>
                <strong className="shrink-0 font-mono-num text-rose-300">
                  -%{metrics.supplyDiscountPct}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            COLUMN 2 (CENTER): OFİS DONANIMLARI & YÜKSELTMELER (4 KART)
           ============================================================ */}
        <div
          data-testid="office-col-center"
          className="flex min-h-0 flex-col gap-1.5 min-[680px]:col-span-4 lg:gap-2.5"
        >
          <div className="shrink-0 px-0.5 leading-tight">
            <h2 className="text-[10px] font-extrabold tracking-wide text-slate-100 lg:text-xs">
              OFİS DONANIMLARI & YÜKSELTMELER
            </h2>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1.5 lg:gap-2.5">
            {OFFICE_EQUIPMENT_ITEMS.map((item) => {
              const level = getOfficeEquipmentLevel(state, item.id);
              const isMax = level >= OFFICE_EQUIPMENT_MAX_LEVEL;
              const upgradeCost = getOfficeEquipmentUpgradeCost(item.id, level);
              const canAfford = !isMax && state.cash >= upgradeCost;
              const pct = Math.round((level / OFFICE_EQUIPMENT_MAX_LEVEL) * 100);

              return (
                <div
                  key={item.id}
                  data-testid={`office-equip-card-${item.id}`}
                  className="flex min-h-0 flex-1 items-center justify-between gap-1.5 rounded-2xl border border-slate-700/70 bg-[#111B30]/85 px-2 py-1.5 backdrop-blur-md transition-colors hover:border-cyan-400/40 lg:gap-2.5 lg:px-3.5 lg:py-2.5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-1.5 lg:gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-indigo-400/35 bg-indigo-500/15 text-sky-300 lg:h-10 lg:w-10">
                      <EquipmentIcon id={item.id} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col leading-tight lg:flex-row lg:items-baseline lg:gap-1.5">
                        <span
                          data-testid={`office-equip-name-${item.id}`}
                          className="truncate text-[9.5px] font-extrabold leading-tight text-white lg:text-[13px]"
                        >
                          {item.name}
                        </span>
                        <span
                          data-testid={`office-equip-level-${item.id}`}
                          className="shrink-0 font-mono-num text-[9px] font-bold leading-tight text-cyan-300 lg:text-[11px]"
                        >
                          (Sv. {level})
                        </span>
                      </div>
                      <div className="hidden truncate text-[10px] text-slate-400 lg:block">
                        {item.shortBenefit}
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/95 lg:mt-1.5 lg:h-2">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-300 shadow-[0_0_8px_rgba(52,211,153,0.45)] transition-all duration-300"
                          style={{ width: `${Math.max(10, pct)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid={`office-equip-upgrade-${item.id}`}
                    disabled={isMax}
                    onClick={() => onUpgradeEquipment(item.id)}
                    title={
                      isMax
                        ? `${item.name} maksimum seviyede`
                        : `${item.name} Sv. ${level + 1} · ${formatTL(upgradeCost)}`
                    }
                    className={`flex shrink-0 flex-col items-center justify-center rounded-full px-2 py-1 text-center transition-all lg:min-w-[84px] lg:px-3.5 lg:py-1.5 ${
                      isMax
                        ? 'cursor-default border border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                        : canAfford
                        ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.38)] hover:brightness-110 active:scale-95'
                        : 'border border-cyan-400/35 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25'
                    }`}
                  >
                    <span className="text-[8.5px] font-black leading-none tracking-wide lg:text-[10.5px] whitespace-nowrap">
                      {isMax ? 'MAKS' : 'YÜKSELT'}
                    </span>
                    {!isMax && (
                      <span
                        className={`mt-0.5 font-mono-num text-[7.5px] font-bold leading-none lg:text-[9px] whitespace-nowrap ${
                          canAfford ? 'text-slate-900' : 'text-cyan-300/90'
                        }`}
                      >
                        {formatTL(upgradeCost, true)}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ============================================================
            COLUMN 3 (RIGHT): KİŞİSEL ALAN & HIZLI ERİŞİM (3 KART: A / B / C)
           ============================================================ */}
        <div
          data-testid="office-col-right"
          className="flex min-h-0 flex-col gap-1.5 min-[680px]:col-span-4 lg:gap-2.5"
        >
          <div className="shrink-0 px-0.5 leading-tight">
            <h2 className="text-[10px] font-extrabold tracking-wide text-slate-100 lg:text-xs">
              KİŞİSEL ALAN & HIZLI ERİŞİM
            </h2>
          </div>

          {/* Card A — Akıllı Telefonum */}
          <div
            data-testid="office-card-phone"
            className="flex min-h-0 flex-1 flex-col justify-between rounded-2xl border border-slate-700/70 bg-[#111B30]/85 p-2 backdrop-blur-md lg:p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 lg:gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-cyan-400/35 bg-cyan-500/15 text-cyan-300 lg:h-10 lg:w-10">
                  <Smartphone className="h-4 w-4 lg:h-5 lg:w-5" />
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="text-[10px] font-extrabold tracking-wide text-white lg:text-xs">
                    AKILLI TELEFONUM
                  </div>
                  <div className="mt-0.5 truncate text-[9px] text-slate-300 lg:text-[11px]">
                    Sosyal Medya & Mesajlar
                    {unreadNotifCount + chatCount > 0 && (
                      <span className="ml-1 font-mono-num text-cyan-300">
                        · {unreadNotifCount > 0 ? `${unreadNotifCount} yeni` : `${chatCount} msj`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className="font-mono-num text-[11px] font-extrabold text-cyan-300 lg:text-xs">
                A
              </span>
            </div>

            <div className="mt-1.5 flex justify-end lg:mt-2">
              <button
                type="button"
                data-testid="office-open-phone-btn"
                onClick={() => onOpenOfficeModal('phone')}
                className="min-w-[84px] rounded-full border border-sky-400/60 bg-sky-500/15 px-5 py-1 text-[9.5px] font-extrabold tracking-wide text-sky-100 hover:bg-sky-500/25 lg:min-w-[112px] lg:py-1.5 lg:text-[11px] whitespace-nowrap"
              >
                AÇ
              </button>
            </div>
          </div>

          {/* Card B — Ofis Seviyesi Yükselt */}
          <div
            data-testid="office-card-tier-upgrade"
            className="flex min-h-0 flex-1 flex-col justify-between rounded-2xl border border-slate-700/70 bg-[#111B30]/85 p-2 backdrop-blur-md lg:p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 lg:gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-amber-400/35 bg-amber-500/15 text-amber-300 lg:h-10 lg:w-10">
                  <Building2 className="h-4 w-4 lg:h-5 lg:w-5" />
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="text-[10px] font-extrabold tracking-wide text-white lg:text-xs">
                    OFİS SEVİYESİ YÜKSELT
                  </div>
                  <div
                    data-testid="office-next-tier-summary"
                    className="mt-0.5 line-clamp-2 text-[9px] text-slate-300 lg:text-[11px]"
                  >
                    {nextTier
                      ? `Sonraki: ${nextTier.name} — ${formatTL(nextTier.cost, true)}`
                      : 'Zirve Seviye: Holding Gökdeleni Aktif'}
                  </div>
                </div>
              </div>
              <span className="font-mono-num text-[11px] font-extrabold text-amber-300 lg:text-xs">
                B
              </span>
            </div>

            <div className="mt-1.5 grid grid-cols-2 gap-1.5 lg:mt-2 lg:gap-2">
              <button
                type="button"
                data-testid="office-tier-upgrade-btn"
                disabled={!nextTier}
                onClick={() => {
                  if (nextTier) {
                    onUpgradeOfficeTier(nextTier.id);
                  }
                }}
                className={`rounded-full py-1 text-[9.5px] font-extrabold tracking-wide transition-all lg:py-1.5 lg:text-[11px] whitespace-nowrap ${
                  !nextTier
                    ? 'cursor-default border border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                    : canAffordNextTier
                    ? 'border border-emerald-300 bg-emerald-500/25 text-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.35)] hover:bg-emerald-500/35'
                    : 'border border-emerald-400/60 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                }`}
              >
                {nextTier ? 'YÜKSELT' : 'MAKSİMUM'}
              </button>
              <button
                type="button"
                data-testid="office-open-upgrades-btn"
                onClick={() => onOpenOfficeModal('design')}
                className="rounded-full border border-sky-400/60 bg-sky-500/15 py-1 text-[9.5px] font-extrabold tracking-wide text-sky-100 hover:bg-sky-500/25 lg:py-1.5 lg:text-[11px] whitespace-nowrap"
              >
                DETAY
              </button>
            </div>
          </div>

          {/* Card C — Kişisel Varlıklar */}
          <div
            data-testid="office-card-assets"
            className="flex min-h-0 flex-1 flex-col justify-between rounded-2xl border border-slate-700/70 bg-[#111B30]/85 p-2 backdrop-blur-md lg:p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 lg:gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-fuchsia-400/35 bg-fuchsia-500/15 text-indigo-300 lg:h-10 lg:w-10">
                  <Car className="h-4 w-4 lg:h-5 lg:w-5" />
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="text-[10px] font-extrabold tracking-wide text-white lg:text-xs">
                    KİŞİSEL VARLIKLAR
                  </div>
                  <div className="mt-0.5 truncate text-[9px] text-slate-300 lg:text-[11px]">
                    Araçlar & Gayrimenkul
                    {ownedAssetsCount > 0 && (
                      <span className="ml-1 font-mono-num text-fuchsia-300">
                        · {ownedAssetsCount} varlık
                        <span className="hidden lg:inline">
                          {' '}
                          ({formatTL(personalAssetsVal, true)})
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className="font-mono-num text-[11px] font-extrabold text-fuchsia-300 lg:text-xs">
                C
              </span>
            </div>

            <div className="mt-1.5 flex justify-end lg:mt-2">
              <button
                type="button"
                data-testid="office-open-assets-btn"
                onClick={() => onOpenOfficeModal('assets')}
                className="min-w-[84px] rounded-full border border-sky-400/60 bg-sky-500/15 px-5 py-1 text-[9.5px] font-extrabold tracking-wide text-sky-100 hover:bg-sky-500/25 lg:min-w-[112px] lg:py-1.5 lg:text-[11px] whitespace-nowrap"
              >
                AÇ
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
