import { useEffect, useState } from 'react';
import {
  Users,
  Star,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Wrench,
  UserMinus,
  Briefcase,
  Building2,
  Zap,
  Crown,
  Swords,
  Megaphone,
  Calculator,
  Lock,
  Sparkles,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import type { EmpireState, OwnedBusiness, StaffRole } from '../types/game';
import {
  ROLE_META,
  calculateTotalHourlyPayroll,
  getBranchStaffSlots,
  resolveBusinessAutomation,
} from '../game/hrEngine';
import {
  HOLDING_MIN_LEVEL,
  HOLDING_MIN_NET_WORTH,
  isHoldingStageUnlocked,
} from '../game/corporateEngine';
import { formatTL } from '../game/economy';
import { hasChainBrandInCity } from '../game/strategyEngine';
import { MobileGameModal, type MobileModalTab } from './MobileGameModal';
import type { ManagementTabId } from './RivalsStrategyModal';

interface HrManagementModalProps {
  open: boolean;
  business: OwnedBusiness | null;
  state: EmpireState;
  activeCityPlate: number;
  activeCityName: string;
  founderName?: string;
  companyLevel?: number;
  netWorth?: number;
  initialSubView?: 'branches' | 'hq';
  onSelectBranch?: (businessId: string) => void;
  onSelectManagementTab?: (tab: ManagementTabId) => void;
  onToggleGmAutoAds?: (managerId: string, enabled: boolean) => void;
  onHireCandidate: (candidateId: string, businessId: string | null, cityPlate: number) => void;
  onDismissStaff: (staffId: string, businessId?: string) => void;
  onRefreshPool: () => void;
  onRestockBusiness: (businessId: string) => void;
  onHireAccountant?: (accountantId: string) => void;
  onDismissAccountant?: () => void;
  onRefreshAccountantPool?: () => void;
  onHireCeo?: (ceoId: string) => void;
  onDismissCeo?: () => void;
  onToggleCeoAutonomous?: (enabled: boolean) => void;
  onClose: () => void;
}

const ROLE_FILTERS: Array<{ id: 'all' | StaffRole; label: string }> = [
  { id: 'all', label: 'Tümü' },
  { id: 'calisan', label: '1. Çalışan (4)' },
  { id: 'mudur_yardimcisi', label: '2. Müd. Yrd. (1)' },
  { id: 'sube_muduru', label: '3. Şube Müd. (1)' },
  { id: 'bolge_sorumlusu', label: '4. Bölge Sor.' },
  { id: 'genel_mudur', label: '5. Genel Müdür' },
];

export function HrManagementModal({
  open,
  business,
  state,
  activeCityPlate,
  activeCityName,
  founderName = 'Kurucu Yatırımcı',
  companyLevel = 1,
  netWorth = 0,
  initialSubView = 'branches',
  onSelectBranch,
  onSelectManagementTab,
  onToggleGmAutoAds,
  onHireCandidate,
  onDismissStaff,
  onRefreshPool,
  onRestockBusiness,
  onHireAccountant,
  onDismissAccountant,
  onRefreshAccountantPool,
  onHireCeo,
  onDismissCeo,
  onToggleCeoAutonomous,
  onClose,
}: HrManagementModalProps) {
  const [subView, setSubView] = useState<'branches' | 'hq'>(initialSubView);
  const [roleFilter, setRoleFilter] = useState<'all' | StaffRole>('all');

  useEffect(() => {
    if (open) {
      setSubView(initialSubView);
    }
  }, [open, initialSubView]);

  if (!open) return null;

  const effectiveBusiness = business ?? state.businesses[0] ?? null;
  const targetPlate = effectiveBusiness?.cityPlate ?? activeCityPlate;
  const targetCityName = effectiveBusiness?.cityName ?? activeCityName;
  const cityBranches = state.businesses.filter((b) => b.cityPlate === targetPlate);
  const hasChainHere = hasChainBrandInCity(state.businesses, targetPlate);
  const cityExecs = (state.cityManagers ?? []).filter((m) => m.assignedCityPlate === targetPlate);
  const automation = effectiveBusiness
    ? resolveBusinessAutomation(effectiveBusiness, state.cityManagers ?? [], state.businesses)
    : null;
  const slots = effectiveBusiness ? getBranchStaffSlots(effectiveBusiness) : null;
  const totalPayroll =
    calculateTotalHourlyPayroll(state) +
    (state.accountant?.hourlySalary ?? 0) +
    (state.ceo?.hourlySalary ?? 0);
  const pendingAppsCount = (state.franchiseApplications ?? []).filter(
    (a) => a.status === 'pending'
  ).length;
  const holdingUnlocked = isHoldingStageUnlocked(companyLevel, netWorth);
  const holdingProgressPct = Math.min(100, Math.round((netWorth / HOLDING_MIN_NET_WORTH) * 100));

  const candidates = (state.candidatePool ?? []).filter((c) =>
    roleFilter === 'all' ? true : c.role === roleFilter
  );
  const accountantPool = state.accountantPool ?? [];
  const ceoPool = state.ceoPool ?? [];

  const branchEmployees = effectiveBusiness?.employees ?? [];
  const workerStaff = branchEmployees.filter((e) => e.role === 'calisan');
  const assistantStaff = branchEmployees.find((e) => e.role === 'mudur_yardimcisi') ?? null;
  const branchManagerStaff = branchEmployees.find((e) => e.role === 'sube_muduru') ?? null;

  const topTabs: MobileModalTab[] | undefined = onSelectManagementTab
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

  return (
    <div data-testid="hr-management-modal">
      <MobileGameModal
        title="Yönetim Merkezi"
        subtitle={
          subView === 'hq'
            ? 'Genel Müdürlük · Muhasebe Departmanı & Holding CEO'
            : effectiveBusiness
            ? `İK & Çalışanlar · ${effectiveBusiness.customName}`
            : `İK & Çalışanlar · ${targetCityName}`
        }
        icon={<Users className="h-4 w-4" />}
        headerRight={
          subView === 'branches' ? (
            <button
              type="button"
              onClick={onRefreshPool}
              disabled={state.cash < 2500}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300/80 bg-amber-400 px-3 text-xs font-black text-slate-950 transition-all duration-200 ease-out hover:bg-amber-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500 whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Havuzu Yenile (₺2.500)</span>
            </button>
          ) : onRefreshAccountantPool ? (
            <button
              type="button"
              onClick={onRefreshAccountantPool}
              disabled={state.cash < 2500}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300/80 bg-amber-400 px-3 text-xs font-black text-slate-950 transition-all duration-200 ease-out hover:bg-amber-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500 whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Aday Yenile (₺2.500)</span>
            </button>
          ) : undefined
        }
        tabs={topTabs}
        activeTabId="hr"
        onSelectTab={(id) => onSelectManagementTab?.(id as ManagementTabId)}
        subHeader={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
              <button
                type="button"
                data-testid="hr-view-branches"
                onClick={() => setSubView('branches')}
                className={`inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg border px-3.5 text-xs font-bold transition-all duration-200 ease-out active:scale-[0.98] ${
                  subView === 'branches'
                    ? 'border-amber-300/85 bg-amber-400 text-slate-950 font-black'
                    : 'border-slate-500/60 bg-slate-800/85 text-slate-100 hover:border-slate-400 hover:bg-slate-700'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Şube Kadroları ({state.businesses.length})</span>
              </button>
              <button
                type="button"
                data-testid="hr-view-hq"
                onClick={() => setSubView('hq')}
                className={`inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg border px-3.5 text-xs font-bold transition-all duration-200 ease-out active:scale-[0.98] ${
                  subView === 'hq'
                    ? 'border-amber-300/85 bg-amber-400 text-slate-950 font-black'
                    : 'border-slate-500/60 bg-slate-800/85 text-slate-100 hover:border-slate-400 hover:bg-slate-700'
                }`}
              >
                <Calculator className="h-3.5 w-3.5" />
                <span>Genel Müdürlük</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
                    subView === 'hq'
                      ? 'bg-slate-950/20 text-slate-950'
                      : state.accountant
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-400/20 text-amber-300'
                  }`}
                >
                  {state.accountant ? 'Muhasebe Aktif' : 'Sv.1+ Açık'}
                </span>
              </button>
            </div>
            <span className="font-mono-num text-xs font-bold text-slate-300">
              Toplam Bordro: <strong className="text-amber-300">{formatTL(totalPayroll)}/sa</strong>
            </span>
          </div>
        }
        onClose={onClose}
        zIndexClass="z-[1265]"
      >
        {subView === 'hq' ? (
          /* ===================== GENEL MÜDÜRLÜK (MUHASEBE + HOLDING BOARD & CEO) ===================== */
          <div data-testid="hq-department-view" className="space-y-4">
            {/* 1. MUHASEBE & FİNANS DEPARTMANI (OPEN AT LEVEL 1!) */}
            <section className="rounded-xl border border-emerald-400/50 bg-slate-900/85 p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400/50 bg-emerald-500/20 text-emerald-300">
                    <Calculator className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      Muhasebe & Finans Departmanı
                    </h3>
                    <p className="text-xs text-slate-300">
                      Seviye 1&apos;den itibaren açık! Aylık vergi ve kredi taksitlerini vade günü
                      otomatik öder, haciz ve gecikme riskini sıfırlar.
                    </p>
                  </div>
                </div>
                <span className="rounded-lg border border-emerald-400/60 bg-emerald-500/15 px-2.5 py-1 text-xs font-black text-emerald-300">
                  Her Seviyede Erişilebilir
                </span>
              </div>

              {state.accountant ? (
                <div
                  data-testid="active-accountant-card"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/60 bg-emerald-950/35 p-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-black text-white">{state.accountant.name}</span>
                      <span className="text-amber-400">
                        {'★'.repeat(state.accountant.stars)}
                      </span>
                      <span className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-200">
                        {state.accountant.title}
                      </span>
                    </div>
                    <div className="text-xs text-slate-200">
                      Otomatik Vergi & Taksit Ödemesi Aktif · Yasal Vergi Optimizasyonu:{' '}
                      <strong className="text-emerald-300">
                        -%{Math.round(state.accountant.taxOptimizationRate * 100)}
                      </strong>{' '}
                      · Maaş:{' '}
                      <strong className="font-mono-num text-amber-300">
                        {formatTL(state.accountant.hourlySalary)}/sa
                      </strong>
                    </div>
                  </div>
                  {onDismissAccountant && (
                    <button
                      type="button"
                      data-testid="dismiss-accountant-btn"
                      onClick={onDismissAccountant}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-rose-400/60 bg-rose-500/20 px-3 text-xs font-bold text-rose-200 transition-all duration-200 ease-out hover:bg-rose-500/30 active:scale-[0.98]"
                    >
                      <UserMinus className="h-4 w-4" />
                      <span>Görevden Al</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-amber-200">
                    <span>
                      Aktif muhasebeci yok — vergi ve kredi taksitleri manuel ödenir.
                    </span>
                    <span className="font-mono-num font-bold text-emerald-300">
                      Nakit: {formatTL(state.cash, true)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 min-[900px]:grid-cols-2">
                    {accountantPool.map((acc) => {
                      const canAfford = state.cash >= acc.hireCost;
                      return (
                        <div
                          key={acc.id}
                          className="flex flex-col justify-between gap-2.5 rounded-xl border border-slate-600/60 bg-slate-950/85 p-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-white">{acc.name}</span>
                              <span className="flex items-center gap-0.5 text-amber-400">
                                {Array.from({ length: acc.stars }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                                  />
                                ))}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-sky-300">{acc.title}</div>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 pt-1 border-t border-slate-800">
                              <span>
                                Vergi İndirimi:{' '}
                                <strong className="text-emerald-400">
                                  -%{Math.round(acc.taxOptimizationRate * 100)}
                                </strong>
                              </span>
                              <span className="font-mono-num font-bold text-amber-300">
                                {formatTL(acc.hourlySalary)}/sa
                              </span>
                            </div>
                          </div>
                          {onHireAccountant && (
                            <button
                              type="button"
                              data-testid={`hire-accountant-${acc.stars}`}
                              disabled={!canAfford}
                              onClick={() => onHireAccountant(acc.id)}
                              className="min-h-[40px] w-full rounded-lg border border-emerald-300/80 bg-emerald-500 px-3 text-xs font-black text-slate-950 transition-all duration-200 ease-out hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
                            >
                              İşe Al · {formatTL(acc.hireCost)}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* 2. HOLDING YÖNETİM KURULU & PROFESYONEL CEO */}
            <section className="rounded-xl border border-amber-400/50 bg-slate-900/85 p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/50 bg-amber-400/20 text-amber-300">
                    <Crown className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      Holding Yönetim Kurulu & Profesyonel CEO
                    </h3>
                    <p className="text-xs text-slate-300">
                      Kurucu olarak Yönetim Kurulu Başkanısınız; Holding seviyesinde otonom CEO
                      atayarak şirketi tam otomatik büyütebilirsiniz.
                    </p>
                  </div>
                </div>
              </div>

              {/* Founder / Chairman Card */}
              <div
                data-testid="board-founder-card"
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/60 bg-amber-500/10 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-300/70 bg-amber-400 text-slate-950 font-black">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-white">{founderName}</span>
                      <span className="rounded-md border border-amber-300/80 bg-amber-400 px-2 py-0.5 text-[11px] font-black text-slate-950">
                        Kurucu
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-amber-200">
                      Yönetim Kurulu Başkanı · Şirket Seviyesi {companyLevel} · Net Değer:{' '}
                      {formatTL(netWorth, true)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional CEO Seat */}
              {!holdingUnlocked ? (
                <div
                  data-testid="ceo-locked-card"
                  className="rounded-xl border border-slate-600/70 bg-slate-950/85 p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-black text-slate-200">
                      <Lock className="h-4 w-4 text-amber-400" />
                      <span>Profesyonel CEO Koltuğu Kilitli</span>
                    </div>
                    <span className="font-mono-num text-xs font-bold text-amber-300">
                      {formatTL(netWorth, true)} / {formatTL(HOLDING_MIN_NET_WORTH, true)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-300"
                      style={{ width: `${holdingProgressPct}%` }}
                    />
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">
                    Holding aşamasına (Seviye {HOLDING_MIN_LEVEL} ·{' '}
                    <strong className="text-white">Anadolu Holdingi</strong> / ₺5,5 Mln net değer)
                    ulaştığınızda Profesyonel CEO atayabilirsiniz. CEO, kasanızın{' '}
                    <strong className="text-emerald-300">%40&apos;ını güvenli rezervde</strong>{' '}
                    koruyarak otomatik yeni şubeler açar, rakip satın alır, yönetici atar ve
                    reklam kampanyası başlatır.
                  </p>
                </div>
              ) : state.ceo ? (
                <div
                  data-testid="active-ceo-card"
                  className="rounded-xl border border-amber-400/70 bg-slate-950/90 p-3.5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-white">{state.ceo.name}</span>
                        <span className="text-amber-400">{'★'.repeat(state.ceo.stars)}</span>
                        <span className="rounded-md border border-amber-400/50 bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-200">
                          {state.ceo.title}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-300">
                        Liderlik {state.ceo.leadership} · Strateji {state.ceo.strategy} · Maaş:{' '}
                        <strong className="font-mono-num text-amber-300">
                          {formatTL(state.ceo.hourlySalary)}/sa
                        </strong>
                      </div>
                      <div className="mt-1 text-[11px] text-emerald-300">
                        Otonom Açılan Şube: <strong>{state.ceo.autoBranchesOpened}</strong> ·
                        Otonom Rakip Satın Alma: <strong>{state.ceo.autoTakeoversCount}</strong>
                      </div>
                    </div>

                    {onDismissCeo && (
                      <button
                        type="button"
                        onClick={onDismissCeo}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-rose-400/60 bg-rose-500/20 px-3 text-xs font-bold text-rose-200 transition-all duration-200 ease-out hover:bg-rose-500/30 active:scale-[0.98]"
                      >
                        <UserMinus className="h-4 w-4" />
                        <span>Görevden Al</span>
                      </button>
                    )}
                  </div>

                  {onToggleCeoAutonomous && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-400/45 bg-emerald-950/30 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-200">
                          <Sparkles className="h-4 w-4 shrink-0" />
                          <span>CEO Otonom Büyüme (%40 Nakit Korumalı)</span>
                        </div>
                        <div className="text-[11px] text-slate-300">
                          {state.ceo.autonomousGrowthEnabled
                            ? 'Aktif: CEO kârlı şubeler açar, zayıf rakipleri satın alır, yönetici atar ve reklam yönetir.'
                            : 'Kapalı: Açıldığında CEO kasanızın %40 rezervini koruyarak holdingi otonom büyütür.'}
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={state.ceo.autonomousGrowthEnabled}
                        data-testid="ceo-auto-growth-toggle"
                        onClick={() => onToggleCeoAutonomous(!state.ceo!.autonomousGrowthEnabled)}
                        className={`min-h-[38px] shrink-0 rounded-lg border px-3.5 text-xs font-black transition-all duration-200 ease-out active:scale-[0.98] ${
                          state.ceo.autonomousGrowthEnabled
                            ? 'border-emerald-300/80 bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                            : 'border-slate-500/70 bg-slate-800 text-slate-100 hover:bg-slate-700'
                        }`}
                      >
                        {state.ceo.autonomousGrowthEnabled ? 'Otonom Açık' : 'Kapalı · Aç'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 min-[900px]:grid-cols-3">
                  {ceoPool.map((ceo) => {
                    const canAfford = state.cash >= ceo.hireCost;
                    return (
                      <div
                        key={ceo.id}
                        className="flex flex-col justify-between gap-2.5 rounded-xl border border-slate-600/60 bg-slate-950/85 p-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-black text-white">{ceo.name}</span>
                            <span className="text-amber-400">{'★'.repeat(ceo.stars)}</span>
                          </div>
                          <div className="text-xs font-semibold text-amber-300">{ceo.title}</div>
                          <div className="text-xs text-slate-300">
                            Liderlik {ceo.leadership} · Strateji {ceo.strategy}
                          </div>
                          <div className="font-mono-num text-xs font-bold text-slate-200">
                            Maaş: {formatTL(ceo.hourlySalary)}/sa
                          </div>
                        </div>
                        {onHireCeo && (
                          <button
                            type="button"
                            data-testid={`hire-ceo-${ceo.stars}`}
                            disabled={!canAfford}
                            onClick={() => onHireCeo(ceo.id)}
                            className="min-h-[40px] w-full rounded-lg border border-amber-300/80 bg-amber-400 px-3 text-xs font-black text-slate-950 transition-all duration-200 ease-out hover:bg-amber-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
                          >
                            CEO Ata · {formatTL(ceo.hireCost, true)}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        ) : (
          /* ===================== ŞUBE KADROLARI & İK HAVUZU ===================== */
          <div className="space-y-3">
            {/* Selectable Branch Filter Cards (X/6 Sync!) */}
            {state.businesses.length > 0 && (
              <section className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">
                    Şube Seç & Kadroyu Filtrele ({state.businesses.length} İşletme)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Her şube: 4 Çalışan + 1 Müd. Yrd. + 1 Şube Müd. = 6 Kadro
                  </span>
                </div>
                <div className="no-scrollbar flex items-stretch gap-2 overflow-x-auto pb-1">
                  {state.businesses.map((b) => {
                    const isSelected = effectiveBusiness?.id === b.id;
                    const count = (b.employees ?? []).length;
                    const bSlots = getBranchStaffSlots(b);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        data-testid={`branch-filter-card-${b.id}`}
                        onClick={() => onSelectBranch?.(b.id)}
                        className={`flex min-w-[180px] shrink-0 flex-col justify-between gap-1 rounded-lg border px-3 py-2 text-left transition-all duration-200 ease-out active:scale-[0.98] ${
                          isSelected
                            ? 'border-amber-400/85 bg-amber-400/15 shadow-md shadow-amber-500/10'
                            : 'border-slate-500/60 bg-slate-900/85 hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-black text-white">
                            {b.customName}
                          </span>
                          <span
                            className={`shrink-0 rounded-md border px-1.5 py-0.5 font-mono-num text-[11px] font-black ${
                              count >= 6
                                ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-300'
                                : isSelected
                                ? 'border-amber-300/80 bg-amber-400 text-slate-950'
                                : 'border-slate-600 bg-slate-800 text-slate-200'
                            }`}
                          >
                            {count}/6
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                          <span className="inline-flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0 text-amber-400" />
                            {b.cityName}
                          </span>
                          <span className="font-mono-num shrink-0 text-slate-300">
                            {bSlots.workers}Ç · {bSlots.assistantManagers}Y · {bSlots.branchManagers}M
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Branch Automation & Stock/Maintenance Card */}
            {effectiveBusiness && automation ? (
              <section
                className={`rounded-xl border p-3 space-y-2.5 ${
                  automation.fullAutomation
                    ? 'border-emerald-500/60 bg-emerald-950/30'
                    : automation.autoStock
                    ? 'border-amber-400/60 bg-amber-950/25'
                    : 'border-rose-500/50 bg-rose-950/25'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                    {automation.fullAutomation || automation.autoStock ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-400" />
                    )}
                    <span>
                      {automation.fullAutomation
                        ? 'Tam Otomasyon Aktif (Stok + Bakım + Oto Tahsilat)'
                        : automation.autoStock
                        ? 'Kısmi Otomasyon (Otomatik Stok)'
                        : 'Yönetici Eksik — Şube Manuel Çalışıyor'}
                    </span>
                  </span>
                  {automation.autoCollectRevenue && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-0.5 text-xs font-bold text-slate-950">
                      <Zap className="h-3.5 w-3.5" /> Oto Hasılat Toplama
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300">
                  {automation.managerLabel
                    ? `Sorumlu: ${automation.managerLabel}${
                        automation.efficiencyBonus > 0
                          ? ` · +%${Math.round(automation.efficiencyBonus * 100)} verim`
                          : ''
                      }`
                    : 'Şube Müdürü atayarak bu şubede stok, bakım ve saatlik hasılatın ana kasaya otomatik aktarılmasını hemen aktif edin.'}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span>Stok Durumu</span>
                      <span className="font-mono-num text-white">
                        {Math.round(effectiveBusiness.stockLevel ?? 100)}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.round(effectiveBusiness.stockLevel ?? 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span>Temizlik & Bakım</span>
                      <span className="font-mono-num text-white">
                        {Math.round(effectiveBusiness.maintenanceLevel ?? 100)}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-sky-400"
                        style={{
                          width: `${Math.round(effectiveBusiness.maintenanceLevel ?? 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {((effectiveBusiness.stockLevel ?? 100) < 98 ||
                  (effectiveBusiness.maintenanceLevel ?? 100) < 98) && (
                  <button
                    type="button"
                    onClick={() => onRestockBusiness(effectiveBusiness.id)}
                    className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-amber-300/80 bg-amber-400 px-3 text-xs font-black text-slate-950 transition-all duration-200 ease-out hover:bg-amber-300 active:scale-[0.98]"
                  >
                    <Wrench className="h-4 w-4" />
                    <span>Manuel Stok & Bakım Yenile (%100)</span>
                  </button>
                )}
              </section>
            ) : (
              <section className="rounded-xl border border-slate-600/60 bg-slate-900/75 p-3 text-xs text-slate-300">
                <strong className="text-white">{targetCityName} İl Yönetimi:</strong> Henüz şubeniz
                yok. Haritada pin bırakarak ilk işletmenizi kurduğunuzda şube kadrosu burada açılır.
              </section>
            )}

            {/* Explicit 4+1+1 Branch Slots & City Executives */}
            <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
              {effectiveBusiness && slots && (
                <section
                  data-testid="hr-branch-slots"
                  className="rounded-xl border border-slate-600/60 bg-slate-900/80 p-3 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-white">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-sky-400" />
                      <span>
                        {effectiveBusiness.customName} ({branchEmployees.length}/6)
                      </span>
                    </span>
                    <span className="rounded-md border border-slate-600 bg-slate-950 px-2 py-0.5 text-[11px] text-amber-300">
                      {effectiveBusiness.cityName}
                    </span>
                  </div>

                  {/* 4 Worker Slots */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Çalışan Kadrosu ({slots.workers}/{slots.maxWorkers})
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {Array.from({ length: slots.maxWorkers }).map((_, idx) => {
                        const emp = workerStaff[idx];
                        if (!emp) {
                          return (
                            <div
                              key={`empty-worker-${idx}`}
                              className="flex min-h-[54px] items-center justify-between rounded-lg border border-dashed border-slate-600/80 bg-slate-950/50 px-2.5 py-2 text-xs text-slate-400"
                            >
                              <span>Boş Çalışan #{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => setRoleFilter('calisan')}
                                className="rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-amber-300 hover:border-amber-400"
                              >
                                Seç
                              </button>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={emp.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-slate-600/70 bg-slate-950/85 px-2.5 py-2"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-xs font-bold text-white">
                                {emp.name}{' '}
                                <span className="text-amber-400">{'★'.repeat(emp.stars)}</span>
                              </div>
                              <div className="truncate text-[11px] text-slate-400">
                                {emp.roleTitle} · {effectiveBusiness.customName} ({effectiveBusiness.cityName})
                              </div>
                              <div className="font-mono-num text-[11px] text-amber-300">
                                {formatTL(emp.hourlySalary)}/sa
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onDismissStaff(emp.id, effectiveBusiness.id)}
                              aria-label="İşten Çıkar"
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/15 text-rose-300 transition-all duration-200 hover:bg-rose-500/25 active:scale-95"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 1 Assistant Manager + 1 Branch Manager Slots */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-1">
                    {/* Müdür Yardımcısı */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Müdür Yardımcısı ({slots.assistantManagers}/1)
                      </div>
                      {assistantStaff ? (
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-400/50 bg-amber-950/25 px-2.5 py-2">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-white">
                              {assistantStaff.name}{' '}
                              <span className="text-amber-400">
                                {'★'.repeat(assistantStaff.stars)}
                              </span>
                            </div>
                            <div className="truncate text-[11px] text-slate-300">
                              {effectiveBusiness.customName} · {effectiveBusiness.cityName}
                            </div>
                            <div className="font-mono-num text-[11px] text-amber-300">
                              {formatTL(assistantStaff.hourlySalary)}/sa
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onDismissStaff(assistantStaff.id, effectiveBusiness.id)
                            }
                            aria-label="İşten Çıkar"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex min-h-[54px] items-center justify-between rounded-lg border border-dashed border-slate-600/80 bg-slate-950/50 px-2.5 py-2 text-xs text-slate-400">
                          <span>Boş Müd. Yrd.</span>
                          <button
                            type="button"
                            onClick={() => setRoleFilter('mudur_yardimcisi')}
                            className="rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-amber-300 hover:border-amber-400"
                          >
                            Seç
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Şube Müdürü */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Şube Müdürü ({slots.branchManagers}/1)
                      </div>
                      {branchManagerStaff ? (
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-400/60 bg-emerald-950/30 px-2.5 py-2">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-white">
                              {branchManagerStaff.name}{' '}
                              <span className="text-amber-400">
                                {'★'.repeat(branchManagerStaff.stars)}
                              </span>
                            </div>
                            <div className="truncate text-[11px] text-emerald-200">
                              {effectiveBusiness.customName} · {effectiveBusiness.cityName}
                            </div>
                            <div className="font-mono-num text-[11px] text-amber-300">
                              {formatTL(branchManagerStaff.hourlySalary)}/sa
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onDismissStaff(branchManagerStaff.id, effectiveBusiness.id)
                            }
                            aria-label="İşten Çıkar"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex min-h-[54px] items-center justify-between rounded-lg border border-dashed border-slate-600/80 bg-slate-950/50 px-2.5 py-2 text-xs text-slate-400">
                          <span>Boş Şube Müd.</span>
                          <button
                            type="button"
                            onClick={() => setRoleFilter('sube_muduru')}
                            className="rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-amber-300 hover:border-amber-400"
                          >
                            Seç
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* City Executives */}
              <section className="rounded-xl border border-slate-600/60 bg-slate-900/80 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-amber-400" />
                    {targetCityName} Üst Yönetimi (İl Kademesi)
                  </span>
                  <span className="font-mono-num text-slate-400">{cityBranches.length} şube</span>
                </div>
                {cityExecs.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Henüz Bölge Sorumlusu veya Genel Müdür atanmadı (Min. 2 şube gerekir).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {cityExecs.map((exec) => (
                      <div
                        key={exec.id}
                        className="rounded-lg border border-slate-600/70 bg-slate-950/85 px-3 py-2.5 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-white">
                              {exec.name}{' '}
                              <span className="text-amber-400">{'★'.repeat(exec.stars)}</span>
                            </div>
                            <div className="text-xs text-slate-400">
                              {ROLE_META[exec.role].label} · {targetCityName} ·{' '}
                              <span className="font-mono-num text-amber-300">
                                {formatTL(exec.hourlySalary)}/sa
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onDismissStaff(exec.id)}
                            aria-label="Görevden Al"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        </div>

                        {exec.role === 'genel_mudur' && onToggleGmAutoAds && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-fuchsia-500/45 bg-fuchsia-950/25 px-2.5 py-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-fuchsia-200">
                                <Megaphone className="h-3.5 w-3.5 shrink-0" />
                                <span>Otomatik Reklam Kampanyasını Aktif Et</span>
                              </div>
                              <div className="text-[11px] text-slate-300">
                                {exec.autoAdsEnabled
                                  ? 'Aktif: Biten reklamları kârlılık analizine göre tüm şehir şubelerinde yeniler.'
                                  : 'Kapalı: Açıldığında kasa uygun oldukça reklamları otomatik sürdürür.'}
                              </div>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={Boolean(exec.autoAdsEnabled)}
                              data-testid="gm-auto-ads-toggle"
                              onClick={() => onToggleGmAutoAds(exec.id, !exec.autoAdsEnabled)}
                              className={`min-h-[36px] shrink-0 rounded-lg border px-3 text-xs font-black transition-all duration-200 ease-out active:scale-[0.98] whitespace-nowrap ${
                                exec.autoAdsEnabled
                                  ? 'border-emerald-300/80 bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                                  : 'border-slate-500/70 bg-slate-800 text-slate-100 hover:bg-slate-700'
                              }`}
                            >
                              {exec.autoAdsEnabled ? 'Aktif (Açık)' : 'Kapalı · Aç'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Role Filter Row + Renewable 1-5 Star Candidate Pool */}
            <section className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-white">
                  1–5 Yıldız Aday Havuzu ({candidates.length} Aday)
                </h3>
                <span className="text-xs text-slate-400">
                  Nakit:{' '}
                  <strong className="font-mono-num text-emerald-400">
                    {formatTL(state.cash, true)}
                  </strong>
                </span>
              </div>

              <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
                {ROLE_FILTERS.map((rf) => (
                  <button
                    key={rf.id}
                    type="button"
                    onClick={() => setRoleFilter(rf.id)}
                    className={`min-h-[36px] shrink-0 rounded-lg border px-3 text-xs font-bold transition-all duration-200 ease-out active:scale-[0.98] ${
                      roleFilter === rf.id
                        ? 'border-amber-300/85 bg-amber-400 text-slate-950 font-black'
                        : 'border-slate-500/60 bg-slate-800/85 text-slate-100 hover:border-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {rf.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-2.5 min-[900px]:grid-cols-2">
                {candidates.map((cand) => {
                  const meta = ROLE_META[cand.role];
                  const isCityRole = meta.scope === 'city';
                  const canAfford = state.cash >= cand.hireCost;
                  const needsBranch = !isCityRole && !effectiveBusiness;
                  const needsMultiBranch = isCityRole && cityBranches.length < 2 && !hasChainHere;

                  let slotFullLabel: string | null = null;
                  if (slots) {
                    if (cand.role === 'calisan' && slots.workers >= slots.maxWorkers) {
                      slotFullLabel = `Kadro Dolu (${slots.workers}/${slots.maxWorkers})`;
                    } else if (
                      cand.role === 'mudur_yardimcisi' &&
                      slots.assistantManagers >= slots.maxAssistantManagers
                    ) {
                      slotFullLabel = `Kadro Dolu (${slots.assistantManagers}/${slots.maxAssistantManagers})`;
                    } else if (
                      cand.role === 'sube_muduru' &&
                      slots.branchManagers >= slots.maxBranchManagers
                    ) {
                      slotFullLabel = `Kadro Dolu (${slots.branchManagers}/${slots.maxBranchManagers})`;
                    }
                  }

                  const hasCityGmAlready =
                    cand.role === 'genel_mudur' &&
                    cityExecs.some((m) => m.role === 'genel_mudur');

                  const disabled =
                    !canAfford ||
                    needsBranch ||
                    needsMultiBranch ||
                    Boolean(slotFullLabel) ||
                    hasCityGmAlready;

                  const buttonLabel = slotFullLabel
                    ? slotFullLabel
                    : hasCityGmAlready
                    ? 'Genel Müdür Mevcut'
                    : needsMultiBranch
                    ? 'Min. 2 Şube Gerekir'
                    : needsBranch
                    ? 'Önce Şube Seçin'
                    : `İşe Al (${effectiveBusiness ? effectiveBusiness.customName : targetCityName}) · ${formatTL(cand.hireCost)}`;

                  return (
                    <div
                      key={cand.id}
                      className="flex flex-col justify-between gap-2.5 rounded-xl border border-slate-600/60 bg-slate-900/85 p-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-bold text-white">{cand.name}</span>
                            <span className="rounded-md border border-sky-400/40 bg-slate-800 px-2 py-0.5 text-xs font-bold text-sky-300">
                              {meta.label}
                            </span>
                          </div>
                          <span className="flex items-center gap-0.5 text-amber-400">
                            {Array.from({ length: cand.stars }).map((_, idx) => (
                              <Star
                                key={idx}
                                className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                              />
                            ))}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300">{meta.description}</p>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2 font-mono-num text-xs">
                          <div className="flex items-center gap-3 text-slate-300">
                            <span>Hız: {cand.speed}</span>
                            <span>Verim: {cand.efficiency}</span>
                            <span>Lider: {cand.leadership}</span>
                          </div>
                          <span className="font-bold text-amber-300">
                            Maaş: {formatTL(cand.hourlySalary)}/sa
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          onHireCandidate(cand.id, effectiveBusiness?.id ?? null, targetPlate)
                        }
                        className="min-h-[42px] w-full rounded-lg border border-amber-300/80 bg-amber-400 px-3 text-xs font-black text-slate-950 transition-all duration-200 ease-out hover:bg-amber-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-400"
                      >
                        {buttonLabel}
                      </button>
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
