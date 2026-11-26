import {
  Bell,
  Building2,
  CalendarCheck2,
  Crown,
  FileSpreadsheet,
  Hammer,
  Landmark,
  Link2,
  MapPin,
  MessageSquare,
  Newspaper,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Swords,
  TrendingUp,
  Trophy,
  Users,
  Wrench,
} from 'lucide-react';
import type { EmpireState, RemoteBusinessRecord } from '../types/game';
import type { ExecutiveDashboardMetrics } from '../game/dashboardMetrics';
import {
  calculateBusinessHourlyIncome,
  formatTL,
  isBusinessUnderConstruction,
} from '../game/economy';
import { calculateBranchServiceQuality } from '../game/officeEngine';

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
   3. OFİSİM WORKSPACE (Ofis Yükseltmeleri, Prestij Puanı, Akıllı Telefon & Mesajlar)
   ============================================================================ */
interface OfficeWorkspaceProps {
  metrics: ExecutiveDashboardMetrics;
  unreadNotifCount: number;
  claimableMissionCount: number;
  chatCount: number;
  onOpenOfficeModal: (tab: 'design' | 'assets' | 'phone') => void;
  onOpenPatronChat: () => void;
  onOpenMarketNews: () => void;
  onOpenMissions: () => void;
  onOpenNotifications: () => void;
  onOpenLeaderboard: () => void;
}

export function OfficeWorkspace({
  metrics,
  unreadNotifCount,
  claimableMissionCount,
  chatCount,
  onOpenOfficeModal,
  onOpenPatronChat,
  onOpenMarketNews,
  onOpenMissions,
  onOpenNotifications,
  onOpenLeaderboard,
}: OfficeWorkspaceProps) {
  return (
    <section
      aria-label="Ofisim, Prestij ve Akıllı Telefon"
      data-testid="workspace-office"
      className="panel-scroll h-full w-full p-3 lg:p-5"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-3.5 md:grid-cols-12">
        {/* Left: Office Tier & Prestige Upgrade Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-amber-400/30 bg-gradient-to-br from-[#282012]/90 via-[#131C31]/90 to-[#0E1628]/95 p-4 md:col-span-6">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/15 text-amber-300">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-amber-300">
                    MERKEZ OFİS · KADEME {metrics.officeTierNumber}/4
                  </div>
                  <h2 className="text-base font-extrabold text-white">{metrics.officeTierName}</h2>
                </div>
              </div>
              <span className="font-mono-num text-xl font-extrabold text-amber-300">
                {metrics.officePrestige}/100
              </span>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300"
                style={{ width: `${Math.max(8, metrics.officePrestige)}%` }}
              />
            </div>

            <div className="mt-3.5 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-2.5">
                <div className="text-[10px] text-slate-400">Tanınırlık</div>
                <div className="mt-0.5 font-mono-num text-sm font-extrabold text-cyan-300">
                  %{metrics.brandRecognitionPct}
                </div>
              </div>
              <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-2.5">
                <div className="text-[10px] text-slate-400">Tedarik İndirimi</div>
                <div className="mt-0.5 font-mono-num text-sm font-extrabold text-emerald-300">
                  -%{metrics.supplyDiscountPct}
                </div>
              </div>
              <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-2.5">
                <div className="text-[10px] text-slate-400">Faiz İndirimi</div>
                <div className="mt-0.5 font-mono-num text-sm font-extrabold text-amber-300">
                  -%{metrics.loanInterestDiscountPct}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="office-open-upgrades-btn"
              onClick={() => onOpenOfficeModal('design')}
              className="rounded-xl border border-amber-400/60 bg-amber-400/20 py-2.5 text-xs font-extrabold text-amber-100 hover:bg-amber-400/30"
            >
              Ofis & Donanım Yükselt
            </button>
            <button
              type="button"
              data-testid="office-open-assets-btn"
              onClick={() => onOpenOfficeModal('assets')}
              className="rounded-xl border border-cyan-400/50 bg-cyan-500/15 py-2.5 text-xs font-extrabold text-cyan-100 hover:bg-cyan-500/25"
            >
              Kişisel Varlıklar
            </button>
          </div>
        </div>

        {/* Right: Executive Smartphone & Messages Hub */}
        <div className="flex flex-col justify-between rounded-2xl border border-cyan-400/30 bg-[#111B30]/85 p-4 md:col-span-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-500/15 text-cyan-300">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-cyan-300">YÖNETİCİ İLETİŞİM MERKEZİ</div>
                <h2 className="text-base font-extrabold text-white">Akıllı Telefon & Mesajlar</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenOfficeModal('phone')}
              className="rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1 text-[11px] font-bold text-cyan-200 hover:bg-cyan-500/25"
            >
              Telefon Ekranı
            </button>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenPatronChat}
              className="flex items-center gap-2.5 rounded-xl border border-slate-700/80 bg-slate-900/75 p-3 text-left hover:border-cyan-400/50"
            >
              <MessageSquare className="h-4.5 w-4.5 shrink-0 text-cyan-300" />
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-white">Patron Sohbeti</div>
                <div className="text-[10px] text-slate-400">{chatCount} canlı mesaj</div>
              </div>
            </button>

            <button
              type="button"
              onClick={onOpenNotifications}
              className="flex items-center gap-2.5 rounded-xl border border-slate-700/80 bg-slate-900/75 p-3 text-left hover:border-amber-400/50"
            >
              <Bell className="h-4.5 w-4.5 shrink-0 text-amber-300" />
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-white">Bildirimler</div>
                <div className="text-[10px] text-slate-400">{unreadNotifCount} okunmamış</div>
              </div>
            </button>

            <button
              type="button"
              onClick={onOpenMissions}
              className="flex items-center gap-2.5 rounded-xl border border-slate-700/80 bg-slate-900/75 p-3 text-left hover:border-emerald-400/50"
            >
              <Trophy className="h-4.5 w-4.5 shrink-0 text-emerald-300" />
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-white">Görevler</div>
                <div className="text-[10px] text-slate-400">
                  {claimableMissionCount > 0
                    ? `${claimableMissionCount} ödül hazır`
                    : 'Aktif hedefler'}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={onOpenMarketNews}
              className="flex items-center gap-2.5 rounded-xl border border-slate-700/80 bg-slate-900/75 p-3 text-left hover:border-indigo-400/50"
            >
              <Newspaper className="h-4.5 w-4.5 shrink-0 text-indigo-300" />
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-white">Piyasa Haberleri</div>
                <div className="text-[10px] text-slate-400">Güncel ekonomi akışı</div>
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="mt-3 w-full rounded-xl border border-slate-700/80 bg-slate-900/75 py-2 text-xs font-bold text-slate-200 hover:border-amber-400/50 hover:text-white"
          >
            Türkiye Patronlar Sıralamasını Görüntüle →
          </button>
        </div>
      </div>
    </section>
  );
}
