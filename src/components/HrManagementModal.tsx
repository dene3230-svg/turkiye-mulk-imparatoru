import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpCircle,
  Briefcase,
  Building2,
  CheckCircle2,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  UserMinus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { EmpireState, HiredStaff, OwnedBusiness, StaffCandidate, StaffRole } from '../types/game';
import {
  BRANCH_LIMIT_ERROR_TEXT,
  MAX_BRANCH_TOTAL_SLOTS,
  ROLE_META,
  calculateTotalDailyPayrollBreakdown,
  checkBranchRoleSlotAvailable,
  formatCandidateSalaryLabel,
  getBranchStaffSlots,
  getBranchTotalStaffCount,
  getPromotionInfo,
  getStaffDailyCost,
} from '../game/hrEngine';
import { formatTL } from '../game/economy';
import { calculateBranchServiceQuality } from '../game/officeEngine';
import { computeBulkStaffBonusCost } from '../game/holdingReportsEngine';
import type { ManagementTabId } from './RivalsStrategyModal';

export interface HrActionFeedback {
  ok: boolean;
  error?: string;
}

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
  onHireCandidate: (
    candidateId: string,
    businessId: string | null,
    cityPlate: number
  ) => HrActionFeedback | void;
  onAssignRoleSlot?: (
    businessId: string,
    role: 'calisan' | 'mudur_yardimcisi' | 'sube_muduru'
  ) => HrActionFeedback;
  onPromoteStaff?: (businessId: string, staffId: string) => HrActionFeedback;
  onDistributeBulkBonus?: () => boolean;
  onDismissStaff: (staffId: string, businessId?: string) => void;
  onRefreshPool: () => HrActionFeedback | void;
  onRestockBusiness?: (businessId: string) => void;
  onHireAccountant?: (accountantId: string) => void;
  onDismissAccountant?: () => void;
  onRefreshAccountantPool?: () => void;
  onHireCeo?: (ceoId: string) => void;
  onDismissCeo?: () => void;
  onToggleCeoAutonomous?: (enabled: boolean) => void;
  onClose: () => void;
}

type HrTabId = 'branches' | 'pool' | 'payroll';
type BranchRoleFilter = 'all' | 'calisan' | 'mudur_yardimcisi' | 'sube_muduru';

const HR_TABS: Array<{ id: HrTabId; label: string }> = [
  { id: 'branches', label: 'AKTİF ŞUBELER & KADRO' },
  { id: 'pool', label: 'ADAY HAVUZU (İŞE ALIM)' },
  { id: 'payroll', label: 'BORDRO & TERFİ YÖNETİMİ' },
];

const BRANCH_ROLE_FILTERS: Array<{ id: BranchRoleFilter; label: string }> = [
  { id: 'all', label: 'Tümü' },
  { id: 'calisan', label: 'Çalışan (Maks. 4)' },
  { id: 'mudur_yardimcisi', label: 'Müd. Yrd. (Maks. 1)' },
  { id: 'sube_muduru', label: 'Şube Müd. (Maks. 1)' },
];

function StarRating({ stars, size = 'sm' }: { stars: number; size?: 'xs' | 'sm' }) {
  const cls = size === 'xs' ? 'h-2.5 w-2.5 lg:h-3 lg:w-3' : 'h-3 w-3 lg:h-3.5 lg:w-3.5';
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${stars} yıldız`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${cls} ${
            n <= stars ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-600'
          }`}
        />
      ))}
    </span>
  );
}

function getRoleSortRank(role: StaffRole): number {
  if (role === 'sube_muduru') return 0;
  if (role === 'mudur_yardimcisi') return 1;
  return 2;
}

function getRoleShortDisplay(emp: Pick<HiredStaff, 'role' | 'roleTitle'>): string {
  if (emp.role === 'sube_muduru') return 'Şube Müdürü';
  if (emp.role === 'mudur_yardimcisi') return 'Müdür Yrd.';
  return emp.roleTitle && emp.roleTitle !== 'Çalışan' ? `${emp.roleTitle} / Çalışan` : 'Çalışan';
}

export function HrManagementModal({
  open,
  business,
  state,
  activeCityName,
  onSelectBranch,
  onHireCandidate,
  onAssignRoleSlot,
  onPromoteStaff,
  onDistributeBulkBonus,
  onDismissStaff,
  onRefreshPool,
  onClose,
}: HrManagementModalProps) {
  const [activeTab, setActiveTab] = useState<HrTabId>('branches');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    business?.id ?? state.businesses[0]?.id ?? ''
  );
  const [poolRoleFilter, setPoolRoleFilter] = useState<BranchRoleFilter>('all');
  const [limitAlert, setLimitAlert] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setActiveTab('branches');
    setLimitAlert(null);
    setStatusToast(null);
    if (business?.id && state.businesses.some((b) => b.id === business.id)) {
      setSelectedBranchId(business.id);
    } else if (state.businesses.length > 0) {
      setSelectedBranchId((prev) =>
        state.businesses.some((b) => b.id === prev) ? prev : state.businesses[0].id
      );
    }
  }, [open, business?.id, state.businesses]);

  const selectedBranch = useMemo<OwnedBusiness | null>(() => {
    if (state.businesses.length === 0) return null;
    return (
      state.businesses.find((b) => b.id === selectedBranchId) ??
      (business && state.businesses.find((b) => b.id === business.id)) ??
      state.businesses[0]
    );
  }, [state.businesses, selectedBranchId, business]);

  const payrollBreakdown = useMemo(
    () => calculateTotalDailyPayrollBreakdown(state),
    [state]
  );

  const bulkBonusCost = useMemo(() => {
    const activeBranches = state.businesses.length;
    const totalStaff = state.businesses.reduce(
      (sum, b) => sum + getBranchTotalStaffCount(b),
      (state.cityManagers ?? []).length
    );
    return computeBulkStaffBonusCost(activeBranches, totalStaff);
  }, [state]);

  // Branch-assignable candidates only (Çalışan, Müdür Yrd., Şube Müdürü)
  const branchCandidates = useMemo<StaffCandidate[]>(() => {
    const raw = (state.candidatePool ?? []).filter(
      (c) => c.role === 'calisan' || c.role === 'mudur_yardimcisi' || c.role === 'sube_muduru'
    );
    return raw;
  }, [state.candidatePool]);

  const filteredPoolCandidates = useMemo(() => {
    if (poolRoleFilter === 'all') return branchCandidates;
    return branchCandidates.filter((c) => c.role === poolRoleFilter);
  }, [branchCandidates, poolRoleFilter]);

  if (!open) return null;

  const flashError = (msg: string) => {
    setStatusToast(null);
    setLimitAlert(msg);
  };

  const flashSuccess = (msg: string) => {
    setLimitAlert(null);
    setStatusToast(msg);
  };

  const handleBranchPick = (id: string) => {
    setSelectedBranchId(id);
    setLimitAlert(null);
    onSelectBranch?.(id);
  };

  const handleCandidateAssign = (candidate: StaffCandidate) => {
    if (!selectedBranch) {
      flashError('Atama yapabilmek için önce aktif bir şube seçmelisiniz.');
      return;
    }
    const slotCheck = checkBranchRoleSlotAvailable(selectedBranch, candidate.role);
    if (!slotCheck.ok) {
      flashError(slotCheck.error ?? BRANCH_LIMIT_ERROR_TEXT);
      return;
    }
    if (state.cash < candidate.hireCost) {
      flashError(
        `İşe alım ücreti (${formatTL(candidate.hireCost)}) için yetersiz nakit.`
      );
      return;
    }
    const result = onHireCandidate(candidate.id, selectedBranch.id, selectedBranch.cityPlate);
    if (result && !result.ok) {
      flashError(result.error ?? BRANCH_LIMIT_ERROR_TEXT);
      return;
    }
    flashSuccess(`${candidate.name}, ${selectedBranch.customName} kadrosuna atandı.`);
  };

  const handleEmptySlotAssign = (role: 'calisan' | 'mudur_yardimcisi' | 'sube_muduru') => {
    if (!selectedBranch) {
      flashError('Atama yapılacak şube bulunamadı.');
      return;
    }
    const slotCheck = checkBranchRoleSlotAvailable(selectedBranch, role);
    if (!slotCheck.ok) {
      flashError(slotCheck.error ?? BRANCH_LIMIT_ERROR_TEXT);
      return;
    }
    if (onAssignRoleSlot) {
      const res = onAssignRoleSlot(selectedBranch.id, role);
      if (!res.ok) {
        flashError(res.error ?? BRANCH_LIMIT_ERROR_TEXT);
        return;
      }
      flashSuccess(`${ROLE_META[role].label} adayı ${selectedBranch.customName} şubesine atandı.`);
      return;
    }
    // Fallback if parent didn't pass onAssignRoleSlot
    const match = branchCandidates
      .filter((c) => c.role === role)
      .sort((a, b) => a.hireCost - b.hireCost)[0];
    if (!match) {
      flashError(
        `Havuzda uygun ${ROLE_META[role].label} adayı yok. Sağ üstten "HAVUZU YENİLE" butonuna basın.`
      );
      return;
    }
    handleCandidateAssign(match);
  };

  const handleDismiss = (staffId: string, staffName: string) => {
    if (!selectedBranch) return;
    onDismissStaff(staffId, selectedBranch.id);
    flashSuccess(`${staffName}, ${selectedBranch.customName} kadrosundan çıkarıldı.`);
  };

  const handlePromote = (biz: OwnedBusiness, emp: HiredStaff) => {
    if (!onPromoteStaff) return;
    const res = onPromoteStaff(biz.id, emp.id);
    if (!res.ok) {
      flashError(res.error ?? BRANCH_LIMIT_ERROR_TEXT);
      return;
    }
    flashSuccess(`${emp.name} bir üst kademeye terfi ettirildi!`);
  };

  const handleRefresh = () => {
    if (state.cash < 2_500) {
      flashError('Aday havuzunu yenilemek için ₺2.500 nakit gereklidir.');
      return;
    }
    const res = onRefreshPool();
    if (res && !res.ok) {
      flashError(res.error ?? 'Aday havuzu yenilenemedi.');
      return;
    }
    flashSuccess('Aday havuzu ₺2.500 karşılığında yenilendi.');
  };

  const handleBulkBonus = () => {
    if (!onDistributeBulkBonus) return;
    if (state.cash < bulkBonusCost) {
      flashError(`Toplu prim dağıtımı (${formatTL(bulkBonusCost)}) için yetersiz nakit.`);
      return;
    }
    const ok = onDistributeBulkBonus();
    if (ok) {
      flashSuccess('Tüm personele prim dağıtıldı — ekip morali ve verimliliği arttı!');
    }
  };

  const selectedSlots = selectedBranch ? getBranchStaffSlots(selectedBranch) : null;
  const sortedBranchEmployees = selectedBranch
    ? [...(selectedBranch.employees ?? [])].sort(
        (a, b) => getRoleSortRank(a.role) - getRoleSortRank(b.role) || b.stars - a.stars
      )
    : [];

  return (
    <div
      data-testid="hr-management-modal"
      className="fixed inset-0 z-[1060] flex items-center justify-center bg-[#040915]/84 p-1.5 backdrop-blur-sm lg:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-cyan-400/35 bg-gradient-to-b from-[#132240]/98 via-[#0E1830]/99 to-[#091020]/99 shadow-[0_24px_80px_rgba(0,0,0,0.85)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==================== TOP HEADER & SUMMARY STRIP ==================== */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-700/75 bg-[#0C1529]/95 px-3 py-1.5 lg:px-5 lg:py-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide lg:text-base">
              <span className="text-slate-400">İŞLETMELERİM</span>
              <span className="text-cyan-400">&gt;</span>
              <span className="text-white">İK & PERSONEL YÖNETİMİ</span>
            </div>
            <p className="text-[9px] text-slate-400 lg:text-xs">
              {activeCityName} Bölgesi • Kadro ve Bordro Merkezi
            </p>
          </div>

          {/* Compact KPI + Refresh Pool + Close */}
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-700/70 bg-[#0A1224]/90 px-2.5 py-1 text-[9.5px] lg:gap-4 lg:px-3 lg:py-1.5 lg:text-xs">
              <div className="flex items-center gap-1 whitespace-nowrap">
                <span className="text-slate-400">Günlük Bordro:</span>
                <span
                  data-testid="hr-daily-payroll"
                  className="font-mono-num font-extrabold text-amber-300"
                >
                  {formatTL(payrollBreakdown.dailyTotalCost)}/gün
                </span>
              </div>
              <span className="h-3 w-px bg-slate-700" />
              <div className="flex items-center gap-1 whitespace-nowrap">
                <span className="text-slate-400">Nakit:</span>
                <span
                  data-testid="hr-cash-display"
                  className="font-mono-num font-extrabold text-emerald-300"
                >
                  {formatTL(state.cash, true)}
                </span>
              </div>
            </div>

            <button
              type="button"
              data-testid="hr-refresh-pool-btn"
              onClick={handleRefresh}
              className="flex items-center gap-1 rounded-full border border-amber-400/75 bg-gradient-to-r from-amber-500/28 to-yellow-500/20 px-2.5 py-1 text-[9.5px] font-extrabold tracking-wide text-amber-100 shadow-[0_0_14px_rgba(245,158,11,0.28)] transition-all hover:brightness-120 active:scale-[0.98] whitespace-nowrap lg:px-3.5 lg:py-1.5 lg:text-xs"
            >
              <RefreshCw className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
              HAVUZU YENİLE (₺2.500)
            </button>

            <button
              type="button"
              data-testid="hr-close-btn"
              onClick={onClose}
              aria-label="İK panelini kapat"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 transition-colors hover:border-rose-400/60 hover:text-white lg:h-8 lg:w-8"
            >
              <X className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            </button>
          </div>
        </div>

        {/* ==================== 3-TAB BAR ==================== */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-700/65 bg-[#0A1326]/95 px-3 py-1.5 lg:px-5 lg:py-2">
          <div className="flex items-center gap-1.5 overflow-x-auto lg:gap-2">
            {HR_TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`hr-tab-${tab.id}`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setLimitAlert(null);
                  }}
                  className={`rounded-xl px-2.5 py-1 text-[9.5px] font-extrabold tracking-wide transition-all whitespace-nowrap lg:px-4 lg:py-1.5 lg:text-xs ${
                    active
                      ? 'border border-cyan-400/80 bg-cyan-500/22 text-cyan-50 shadow-[0_0_16px_rgba(34,211,238,0.28)]'
                      : 'border border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {selectedBranch && (
            <div className="hidden items-center gap-1.5 text-[10px] font-bold text-slate-300 sm:flex lg:text-xs">
              <Building2 className="h-3.5 w-3.5 text-cyan-300" />
              <span className="truncate max-w-[180px] text-white">
                {selectedBranch.customName}
              </span>
              <span className="font-mono-num text-cyan-300">
                ({getBranchTotalStaffCount(selectedBranch)}/{MAX_BRANCH_TOTAL_SLOTS})
              </span>
            </div>
          )}
        </div>

        {/* ==================== RED LIMIT WARNING / TOAST BANNER ==================== */}
        {limitAlert && (
          <div
            data-testid="hr-limit-alert"
            role="alert"
            className="mx-3 mt-1.5 flex shrink-0 items-center justify-between gap-2 rounded-xl border border-rose-500/80 bg-gradient-to-r from-rose-600/30 via-red-600/25 to-rose-700/25 px-3 py-1.5 text-[10.5px] font-extrabold text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.3)] lg:mx-5 lg:mt-2 lg:px-4 lg:py-2 lg:text-xs"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-300" />
              <span>{limitAlert}</span>
            </div>
            <button
              type="button"
              onClick={() => setLimitAlert(null)}
              className="rounded-lg px-1.5 py-0.5 text-rose-200 hover:bg-rose-500/25"
              aria-label="Uyarıyı kapat"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {!limitAlert && statusToast && (
          <div
            data-testid="hr-status-toast"
            className="mx-3 mt-1.5 flex shrink-0 items-center justify-between gap-2 rounded-xl border border-emerald-400/60 bg-emerald-500/18 px-3 py-1 text-[10px] font-bold text-emerald-100 lg:mx-5 lg:mt-2 lg:px-4 lg:py-1.5 lg:text-xs"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
              <span>{statusToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusToast(null)}
              className="text-emerald-200 hover:text-white"
              aria-label="Bildirimi kapat"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ==================== TAB 1: 3-COLUMN BRANCH STAFFING ==================== */}
        {activeTab === 'branches' && (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden p-2 sm:grid-cols-3 lg:gap-3.5 lg:p-4">
            {/* ==============================================================
                COLUMN 1: AKTİF ŞUBELER (ŞUBE SEÇİN) — NO NEW BRANCH BUTTONS
               ============================================================== */}
            <div
              data-testid="hr-col-branches"
              className="flex min-h-0 flex-col rounded-2xl border border-cyan-400/30 bg-gradient-to-b from-[#132240]/90 to-[#0C1528]/95 p-2 lg:p-3"
            >
              <div className="mb-1.5 flex shrink-0 items-center justify-between gap-1.5 lg:mb-2">
                <h3 className="text-[10px] font-extrabold tracking-wider text-cyan-200 lg:text-xs">
                  AKTİF ŞUBELER (ŞUBE SEÇİN)
                </h3>
                <span className="font-mono-num text-[9.5px] font-bold text-slate-400 lg:text-[11px]">
                  {state.businesses.length} Şube
                </span>
              </div>

              <div className="panel-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5 lg:space-y-2">
                {state.businesses.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 p-4 text-center text-[10.5px] text-slate-400">
                    <Building2 className="mb-1.5 h-6 w-6 text-slate-500" />
                    Henüz kurulmuş aktif şubeniz bulunmuyor.
                  </div>
                ) : (
                  state.businesses.map((biz) => {
                    const isSelected = selectedBranch?.id === biz.id;
                    const slots = getBranchStaffSlots(biz);
                    const totalInBranch = getBranchTotalStaffCount(biz);
                    const quality = calculateBranchServiceQuality(
                      biz,
                      state.cityManagers ?? [],
                      state.businesses
                    );
                    const qualityPct = Math.max(
                      10,
                      Math.min(100, Math.round((quality.stars / 5) * 100))
                    );

                    return (
                      <button
                        key={biz.id}
                        type="button"
                        data-testid={`hr-branch-card-${biz.id}`}
                        onClick={() => handleBranchPick(biz.id)}
                        className={`w-full rounded-xl border p-2 text-left transition-all lg:p-2.5 ${
                          isSelected
                            ? 'border-cyan-400/90 bg-gradient-to-r from-cyan-500/20 via-sky-500/12 to-[#101E38]/95 shadow-[0_0_16px_rgba(34,211,238,0.28)]'
                            : 'border-slate-700/75 bg-[#0D172B]/90 hover:border-slate-500/80 hover:bg-[#12203A]/90'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="truncate text-[10.5px] font-extrabold text-white lg:text-xs">
                            {biz.customName}{' '}
                            <span className="font-bold text-slate-300">(Sv. {biz.level})</span>
                          </span>
                          <span className="shrink-0 font-mono-num text-[9.5px] font-extrabold text-emerald-300 lg:text-[11px]">
                            {totalInBranch} / {MAX_BRANCH_TOTAL_SLOTS}
                          </span>
                        </div>

                        {/* Service Quality Bar */}
                        <div className="mt-1 flex items-center gap-2">
                          <span className="shrink-0 text-[8.5px] font-semibold text-slate-400 lg:text-[10px]">
                            Ort. Kalite
                          </span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isSelected
                                  ? 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                                  : 'bg-sky-400/80'
                              }`}
                              style={{ width: `${qualityPct}%` }}
                            />
                          </div>
                          <span className="shrink-0 font-mono-num text-[8.5px] font-bold text-amber-300 lg:text-[10px]">
                            ★{quality.stars.toFixed(1)}
                          </span>
                        </div>

                        {/* Role Occupancy Mini Badges */}
                        <div className="mt-1.5 flex items-center justify-between gap-1 text-[8.5px] lg:text-[10px]">
                          <span className="font-semibold text-slate-300">
                            Toplam Kadro:{' '}
                            <strong className="font-mono-num text-emerald-300">
                              {totalInBranch} / {MAX_BRANCH_TOTAL_SLOTS}
                            </strong>
                          </span>
                          <div className="flex items-center gap-1 font-mono-num font-bold">
                            <span
                              title="Çalışan (Maks 4)"
                              className={`rounded-md border px-1 py-0.5 ${
                                slots.workers >= slots.maxWorkers
                                  ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
                                  : 'border-slate-700 bg-slate-800/80 text-slate-300'
                              }`}
                            >
                              Ç:{slots.workers}/4
                            </span>
                            <span
                              title="Müdür Yardımcısı (Maks 1)"
                              className={`rounded-md border px-1 py-0.5 ${
                                slots.assistantManagers >= slots.maxAssistantManagers
                                  ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
                                  : 'border-slate-700 bg-slate-800/80 text-slate-400'
                              }`}
                            >
                              MY:{slots.assistantManagers}/1
                            </span>
                            <span
                              title="Şube Müdürü (Maks 1)"
                              className={`rounded-md border px-1 py-0.5 ${
                                slots.branchManagers >= slots.maxBranchManagers
                                  ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-200'
                                  : 'border-slate-700 bg-slate-800/80 text-slate-400'
                              }`}
                            >
                              ŞM:{slots.branchManagers}/1
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* ==============================================================
                COLUMN 2: ŞUBE KADROSU (SEÇİLİ) — STRICT 4 / 1 / 1 SLOTS
               ============================================================== */}
            <div
              data-testid="hr-col-roster"
              className="flex min-h-0 flex-col rounded-2xl border border-amber-400/30 bg-gradient-to-b from-[#17213B]/92 to-[#0C1528]/95 p-2 lg:p-3"
            >
              <div className="mb-1.5 flex shrink-0 items-center justify-between gap-1.5 lg:mb-2">
                <h3 className="truncate text-[10px] font-extrabold tracking-wider text-amber-300 lg:text-xs">
                  ŞUBE KADROSU (SEÇİLİ)
                </h3>
                {selectedBranch && (
                  <span className="truncate rounded-md border border-slate-700 bg-slate-800/80 px-1.5 py-0.5 text-[8.5px] font-bold text-slate-200 lg:text-[10px]">
                    {selectedBranch.customName}
                  </span>
                )}
              </div>

              <div className="panel-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5 lg:space-y-2">
                {!selectedBranch || !selectedSlots ? (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-700 p-4 text-center text-[10.5px] text-slate-400">
                    Kadro detaylarını görmek için soldan bir şube seçin.
                  </div>
                ) : (
                  <>
                    {/* Assigned Staff List */}
                    {sortedBranchEmployees.map((emp) => {
                      const wage = getStaffDailyCost(emp);
                      return (
                        <div
                          key={emp.id}
                          data-testid={`hr-assigned-staff-${emp.id}`}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-700/80 bg-[#0F1B33]/92 px-2.5 py-1.5 lg:px-3 lg:py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[10.5px] font-extrabold text-white lg:text-xs">
                              {emp.name}{' '}
                              <span className="font-semibold text-cyan-200">
                                ({getRoleShortDisplay(emp)})
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2">
                              <StarRating stars={emp.stars} size="xs" />
                              <span className="font-mono-num text-[8.5px] text-slate-400 lg:text-[10px]">
                                {formatTL(wage.dailyTotalCost)}/gün
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            data-testid={`hr-dismiss-btn-${emp.id}`}
                            onClick={() => handleDismiss(emp.id, emp.name)}
                            className="flex shrink-0 items-center gap-1 rounded-full border border-rose-400/75 bg-gradient-to-r from-rose-600 to-red-600 px-2.5 py-1 text-[9px] font-extrabold tracking-wide text-white shadow-[0_0_12px_rgba(244,63,94,0.35)] transition-all hover:brightness-115 active:scale-[0.96] lg:px-3 lg:text-[10.5px]"
                          >
                            <UserMinus className="h-3 w-3" />
                            ÇIKAR
                          </button>
                        </div>
                      );
                    })}

                    {/* ===== SLOT 1: ÇALIŞAN (MAKS 4) ===== */}
                    <div
                      data-testid="hr-slot-calisan"
                      className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 lg:px-3 lg:py-2.5 ${
                        selectedSlots.workers >= selectedSlots.maxWorkers
                          ? 'border-slate-700/75 bg-slate-900/70'
                          : 'border-dashed border-cyan-500/45 bg-[#0C1930]/80'
                      }`}
                    >
                      <div className="min-w-0">
                        <div
                          className={`text-[9.5px] font-extrabold tracking-wide lg:text-[11px] ${
                            selectedSlots.workers >= selectedSlots.maxWorkers
                              ? 'text-slate-400'
                              : 'text-cyan-100'
                          }`}
                        >
                          {selectedSlots.workers >= selectedSlots.maxWorkers
                            ? `+ ÇALIŞAN KADROSU DOLU (${selectedSlots.workers}/${selectedSlots.maxWorkers})`
                            : `+ BOŞ ÇALIŞAN YUVASI (${selectedSlots.workers}/${selectedSlots.maxWorkers})`}
                        </div>
                        <div className="text-[8.5px] text-slate-400 lg:text-[10px]">
                          Şube başına en fazla 4 çalışan
                        </div>
                      </div>

                      <button
                        type="button"
                        data-testid="hr-slot-assign-calisan"
                        disabled={selectedSlots.workers >= selectedSlots.maxWorkers}
                        onClick={() => handleEmptySlotAssign('calisan')}
                        className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[9.5px] font-extrabold tracking-wide transition-all lg:px-3.5 lg:text-[10.5px] ${
                          selectedSlots.workers >= selectedSlots.maxWorkers
                            ? 'cursor-not-allowed border border-slate-700 bg-slate-800/80 text-slate-500'
                            : 'border border-cyan-300/80 bg-gradient-to-r from-cyan-400 to-teal-400 text-[#051525] shadow-[0_0_14px_rgba(34,211,238,0.4)] hover:brightness-110 active:scale-[0.96]'
                        }`}
                      >
                        {selectedSlots.workers >= selectedSlots.maxWorkers ? (
                          <>
                            <Lock className="h-3 w-3" />
                            DOLU
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3" />
                            ATA
                          </>
                        )}
                      </button>
                    </div>

                    {/* ===== SLOT 2: MÜDÜR YARDIMCISI (MAKS 1) ===== */}
                    <div
                      data-testid="hr-slot-mudur_yardimcisi"
                      className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 lg:px-3 lg:py-2.5 ${
                        selectedSlots.assistantManagers >= selectedSlots.maxAssistantManagers
                          ? 'border-slate-700/75 bg-slate-900/70'
                          : 'border-dashed border-cyan-500/45 bg-[#0C1930]/80'
                      }`}
                    >
                      <div className="min-w-0">
                        <div
                          className={`text-[9.5px] font-extrabold tracking-wide lg:text-[11px] ${
                            selectedSlots.assistantManagers >= selectedSlots.maxAssistantManagers
                              ? 'text-slate-400'
                              : 'text-cyan-100'
                          }`}
                        >
                          {selectedSlots.assistantManagers >= selectedSlots.maxAssistantManagers
                            ? `+ MÜDÜR YRD. DOLU (${selectedSlots.assistantManagers}/${selectedSlots.maxAssistantManagers})`
                            : `+ BOŞ MÜDÜR YRD. YUVASI (${selectedSlots.assistantManagers}/${selectedSlots.maxAssistantManagers})`}
                        </div>
                        <div className="text-[8.5px] text-slate-400 lg:text-[10px]">
                          Otomatik stok takibi • Maksimum 1 adet
                        </div>
                      </div>

                      <button
                        type="button"
                        data-testid="hr-slot-assign-mudur_yardimcisi"
                        disabled={
                          selectedSlots.assistantManagers >= selectedSlots.maxAssistantManagers
                        }
                        onClick={() => handleEmptySlotAssign('mudur_yardimcisi')}
                        className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[9.5px] font-extrabold tracking-wide transition-all lg:px-3.5 lg:text-[10.5px] ${
                          selectedSlots.assistantManagers >= selectedSlots.maxAssistantManagers
                            ? 'cursor-not-allowed border border-slate-700 bg-slate-800/80 text-slate-500'
                            : 'border border-cyan-300/80 bg-gradient-to-r from-cyan-400 to-teal-400 text-[#051525] shadow-[0_0_14px_rgba(34,211,238,0.4)] hover:brightness-110 active:scale-[0.96]'
                        }`}
                      >
                        {selectedSlots.assistantManagers >= selectedSlots.maxAssistantManagers ? (
                          <>
                            <Lock className="h-3 w-3" />
                            DOLU
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3" />
                            ATA
                          </>
                        )}
                      </button>
                    </div>

                    {/* ===== SLOT 3: ŞUBE MÜDÜRÜ (MAKS 1) ===== */}
                    <div
                      data-testid="hr-slot-sube_muduru"
                      className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 lg:px-3 lg:py-2.5 ${
                        selectedSlots.branchManagers >= selectedSlots.maxBranchManagers
                          ? 'border-slate-700/75 bg-slate-900/70'
                          : 'border-dashed border-cyan-500/45 bg-[#0C1930]/80'
                      }`}
                    >
                      <div className="min-w-0">
                        <div
                          className={`text-[9.5px] font-extrabold tracking-wide lg:text-[11px] ${
                            selectedSlots.branchManagers >= selectedSlots.maxBranchManagers
                              ? 'text-slate-400'
                              : 'text-cyan-100'
                          }`}
                        >
                          {selectedSlots.branchManagers >= selectedSlots.maxBranchManagers
                            ? `+ ŞUBE MÜDÜRÜ DOLU (${selectedSlots.branchManagers}/${selectedSlots.maxBranchManagers})`
                            : `+ BOŞ ŞUBE MÜDÜRÜ YUVASI (${selectedSlots.branchManagers}/${selectedSlots.maxBranchManagers})`}
                        </div>
                        <div className="text-[8.5px] text-slate-400 lg:text-[10px]">
                          Tam otomasyon & 00:00 tahsilat • Maksimum 1 adet
                        </div>
                      </div>

                      <button
                        type="button"
                        data-testid="hr-slot-assign-sube_muduru"
                        disabled={selectedSlots.branchManagers >= selectedSlots.maxBranchManagers}
                        onClick={() => handleEmptySlotAssign('sube_muduru')}
                        className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[9.5px] font-extrabold tracking-wide transition-all lg:px-3.5 lg:text-[10.5px] ${
                          selectedSlots.branchManagers >= selectedSlots.maxBranchManagers
                            ? 'cursor-not-allowed border border-slate-700 bg-slate-800/80 text-slate-500'
                            : 'border border-cyan-300/80 bg-gradient-to-r from-cyan-400 to-teal-400 text-[#051525] shadow-[0_0_14px_rgba(34,211,238,0.4)] hover:brightness-110 active:scale-[0.96]'
                        }`}
                      >
                        {selectedSlots.branchManagers >= selectedSlots.maxBranchManagers ? (
                          <>
                            <Lock className="h-3 w-3" />
                            DOLU
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3" />
                            ATA
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ==============================================================
                COLUMN 3: BOŞTAKİLER & ADAYLAR + BOTTOM ACTIONS
               ============================================================== */}
            <div
              data-testid="hr-col-candidates"
              className="flex min-h-0 flex-col justify-between rounded-2xl border border-amber-400/35 bg-gradient-to-b from-[#1D223B]/92 to-[#0C1427]/96 p-2 lg:p-3"
            >
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-1.5 flex shrink-0 items-center justify-between gap-1.5 lg:mb-2">
                  <h3 className="text-[10px] font-extrabold tracking-wider text-amber-300 lg:text-xs">
                    BOŞTAKİLER & ADAYLAR
                  </h3>
                  <span className="font-mono-num text-[9.5px] font-bold text-slate-400 lg:text-[11px]">
                    {branchCandidates.length} Aday
                  </span>
                </div>

                <div className="panel-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5 lg:space-y-2">
                  {branchCandidates.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-[10px] text-slate-400">
                      Havuzda aday kalmadı. Sağ üstten <strong>HAVUZU YENİLE</strong> ile yeni
                      adaylar getirin.
                    </div>
                  ) : (
                    branchCandidates.map((cand) => {
                      const slotStatus = selectedBranch
                        ? checkBranchRoleSlotAvailable(selectedBranch, cand.role)
                        : { ok: true, current: 0, max: 1 };
                      const isLimitFull = !slotStatus.ok;
                      const salaryText = formatCandidateSalaryLabel(cand);

                      return (
                        <div
                          key={cand.id}
                          data-testid={`hr-candidate-card-${cand.id}`}
                          className={`rounded-xl border px-2.5 py-1.5 transition-all lg:px-3 lg:py-2 ${
                            isLimitFull
                              ? 'border-rose-500/35 bg-[#16182B]/85'
                              : 'border-slate-700/80 bg-[#0F1B33]/92 hover:border-cyan-400/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[10.5px] font-extrabold text-white lg:text-xs">
                                {cand.name}
                              </div>
                              <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-300 lg:text-[10.5px]">
                                <span>{ROLE_META[cand.role].shortLabel}</span>
                                <StarRating stars={cand.stars} size="xs" />
                              </div>
                            </div>

                            <button
                              type="button"
                              data-testid={`hr-hire-candidate-${cand.id}`}
                              data-candidate-role={cand.role}
                              onClick={() => handleCandidateAssign(cand)}
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-extrabold tracking-wide transition-all active:scale-[0.96] whitespace-nowrap lg:px-3 lg:text-[10.5px] ${
                                isLimitFull
                                  ? 'border border-rose-400/50 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30'
                                  : 'border border-cyan-300/80 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-[#041824] shadow-[0_0_14px_rgba(34,211,238,0.35)] hover:brightness-110'
                              }`}
                            >
                              İŞE AL & ATA
                            </button>
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[8.5px] text-slate-400 lg:text-[10px]">
                            <span>
                              Maaş:{' '}
                              <strong className="font-mono-num text-slate-200">{salaryText}</strong>
                            </span>
                            <span className="font-mono-num text-amber-300">
                              İşe Alım: {formatTL(cand.hireCost)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Bottom Stacked Buttons: TOPLU PRİM DAĞIT + KAPAT / GERİ DÖN */}
              <div className="mt-2 shrink-0 space-y-1.5 border-t border-slate-800/80 pt-2">
                <button
                  type="button"
                  data-testid="hr-bulk-bonus-btn"
                  onClick={handleBulkBonus}
                  className="flex min-h-[30px] w-full items-center justify-center gap-1.5 rounded-xl border border-sky-400/70 bg-gradient-to-r from-sky-600/45 to-blue-600/45 px-3 py-1 text-[9.5px] font-extrabold tracking-wide text-sky-50 shadow-[0_0_14px_rgba(56,189,248,0.22)] transition-all hover:brightness-115 active:scale-[0.98] lg:min-h-[36px] lg:text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-sky-200" />
                  TOPLU PRİM DAĞIT ({formatTL(bulkBonusCost)})
                </button>
                <button
                  type="button"
                  data-testid="hr-back-close-btn"
                  onClick={onClose}
                  className="flex min-h-[30px] w-full items-center justify-center rounded-xl border border-blue-400/40 bg-[#10213E]/90 px-3 py-1 text-[9.5px] font-extrabold tracking-wide text-slate-200 transition-all hover:border-cyan-400/60 hover:text-white active:scale-[0.98] lg:min-h-[36px] lg:text-xs"
                >
                  KAPAT / GERİ DÖN
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: ADAY HAVUZU (İŞE ALIM) ==================== */}
        {activeTab === 'pool' && (
          <div
            data-testid="hr-panel-pool"
            className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden p-2.5 lg:p-4"
          >
            {/* Filter Bar + Target Branch Selector */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700/75 bg-[#0C162B]/90 px-3 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {BRANCH_ROLE_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPoolRoleFilter(f.id)}
                    className={`rounded-lg px-2.5 py-1 text-[9.5px] font-extrabold transition-all lg:text-xs ${
                      poolRoleFilter === f.id
                        ? 'border border-cyan-400/75 bg-cyan-500/20 text-cyan-100'
                        : 'border border-slate-700/70 bg-slate-800/60 text-slate-300 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {state.businesses.length > 0 && (
                <div className="flex items-center gap-2 text-[10px] lg:text-xs">
                  <span className="font-semibold text-slate-400">Hedef Şube:</span>
                  <select
                    value={selectedBranch?.id ?? ''}
                    onChange={(e) => handleBranchPick(e.target.value)}
                    className="rounded-lg border border-cyan-400/50 bg-[#0A1326] px-2 py-1 font-bold text-white outline-none"
                  >
                    {state.businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.customName} ({getBranchTotalStaffCount(b)}/{MAX_BRANCH_TOTAL_SLOTS})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Candidate Grid */}
            <div className="panel-scroll grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 lg:gap-3">
              {filteredPoolCandidates.map((cand) => {
                const slotStatus = selectedBranch
                  ? checkBranchRoleSlotAvailable(selectedBranch, cand.role)
                  : { ok: true, current: 0, max: 1 };
                const isFull = !slotStatus.ok;
                return (
                  <div
                    key={cand.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-700/80 bg-[#0F1B33]/92 p-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-extrabold text-white lg:text-sm">
                            {cand.name}
                          </div>
                          <div className="text-[10px] font-bold text-cyan-300">
                            {ROLE_META[cand.role].label}
                          </div>
                        </div>
                        <StarRating stars={cand.stars} />
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-xl bg-[#0A1326]/90 p-2 text-center text-[9.5px]">
                        <div>
                          <div className="text-slate-400">Hız</div>
                          <div className="font-mono-num font-extrabold text-sky-300">
                            {cand.speed}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400">Verim</div>
                          <div className="font-mono-num font-extrabold text-emerald-300">
                            {cand.efficiency}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400">Liderlik</div>
                          <div className="font-mono-num font-extrabold text-amber-300">
                            {cand.leadership}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-800 pt-2">
                      <div className="text-[9.5px] lg:text-[10.5px]">
                        <div className="font-bold text-slate-200">
                          Maaş: {formatCandidateSalaryLabel(cand)}
                        </div>
                        <div className="font-mono-num text-amber-300">
                          İşe Alım: {formatTL(cand.hireCost)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCandidateAssign(cand)}
                        className={`rounded-full px-3 py-1.5 text-[9.5px] font-extrabold transition-all whitespace-nowrap ${
                          isFull
                            ? 'border border-rose-400/50 bg-rose-500/20 text-rose-200'
                            : 'border border-cyan-300/80 bg-gradient-to-r from-emerald-400 to-cyan-400 text-[#041824] hover:brightness-110'
                        }`}
                      >
                        İŞE AL & ATA
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: BORDRO & TERFİ YÖNETİMİ ==================== */}
        {activeTab === 'payroll' && (
          <div
            data-testid="hr-panel-payroll"
            className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden p-2.5 lg:p-4"
          >
            {/* Payroll Summary Strip */}
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-700/80 bg-[#0D172B]/90 p-2 lg:p-3">
                <div className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-400 lg:text-xs">
                  <Wallet className="h-3.5 w-3.5 text-sky-300" />
                  Günlük Brüt Ücret
                </div>
                <div className="mt-0.5 font-mono-num text-xs font-extrabold text-white lg:text-sm">
                  {formatTL(payrollBreakdown.dailyGrossWages)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-[#0D172B]/90 p-2 lg:p-3">
                <div className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-400 lg:text-xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
                  İşveren SGK (%22,5)
                </div>
                <div className="mt-0.5 font-mono-num text-xs font-extrabold text-amber-300 lg:text-sm">
                  {formatTL(payrollBreakdown.dailyEmployerSgk)}
                </div>
              </div>
              <div className="rounded-xl border border-cyan-400/35 bg-[#0E1E36]/90 p-2 lg:p-3">
                <div className="flex items-center gap-1 text-[9.5px] font-semibold text-cyan-200 lg:text-xs">
                  <Briefcase className="h-3.5 w-3.5 text-cyan-300" />
                  Toplam Günlük Bordro
                </div>
                <div className="mt-0.5 font-mono-num text-xs font-extrabold text-cyan-200 lg:text-sm">
                  {formatTL(payrollBreakdown.dailyTotalCost)}/gün
                </div>
              </div>
              <div className="rounded-xl border border-emerald-400/35 bg-[#0D2130]/90 p-2 lg:p-3">
                <div className="flex items-center gap-1 text-[9.5px] font-semibold text-emerald-200 lg:text-xs">
                  <Users className="h-3.5 w-3.5 text-emerald-300" />
                  Aylık Bordro Tahmini
                </div>
                <div className="mt-0.5 font-mono-num text-xs font-extrabold text-emerald-300 lg:text-sm">
                  {formatTL(payrollBreakdown.dailyTotalCost * 30, true)}/ay
                </div>
              </div>
            </div>

            {/* Staff Payroll & Promotion Rows */}
            <div className="panel-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5 lg:space-y-2">
              {state.businesses.every((b) => (b.employees ?? []).length === 0) ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-700 p-6 text-xs text-slate-400">
                  Bordro ve terfi listesinde henüz şube personeli bulunmuyor.
                </div>
              ) : (
                state.businesses.flatMap((biz) =>
                  (biz.employees ?? []).map((emp) => {
                    const wage = getStaffDailyCost(emp);
                    const promo = getPromotionInfo(emp.role);
                    const nextSlotOk = promo.nextRole
                      ? checkBranchRoleSlotAvailable(biz, promo.nextRole).ok
                      : false;

                    return (
                      <div
                        key={`${biz.id}-${emp.id}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700/80 bg-[#0F1B33]/92 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-xs font-extrabold text-white">
                              {emp.name}
                            </span>
                            <span className="rounded-md bg-cyan-500/15 px-1.5 py-0.5 text-[9.5px] font-bold text-cyan-200">
                              {getRoleShortDisplay(emp)}
                            </span>
                            <StarRating stars={emp.stars} size="xs" />
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[9.5px] text-slate-400">
                            <span>Şube: {biz.customName}</span>
                            <span className="font-mono-num text-amber-300">
                              Günlük: {formatTL(wage.dailyTotalCost)}
                            </span>
                            <span className="font-mono-num text-slate-300">
                              Aylık: {formatTL(wage.monthlyTotalCost)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {promo.nextRole ? (
                            <button
                              type="button"
                              data-testid={`hr-promote-btn-${emp.id}`}
                              onClick={() => handlePromote(biz, emp)}
                              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[9.5px] font-extrabold transition-all whitespace-nowrap ${
                                nextSlotOk
                                  ? 'border border-emerald-400/75 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
                                  : 'border border-rose-400/50 bg-rose-500/15 text-rose-200'
                              }`}
                            >
                              <ArrowUpCircle className="h-3.5 w-3.5" />
                              {promo.label} ({formatTL(promo.cost)})
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/12 px-2.5 py-1 text-[9.5px] font-bold text-amber-200">
                              <UserCheck className="h-3 w-3" />
                              Şube Lideri
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
