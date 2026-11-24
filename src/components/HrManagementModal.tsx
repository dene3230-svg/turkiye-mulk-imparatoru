import { useState } from 'react';
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
} from 'lucide-react';
import type { EmpireState, OwnedBusiness, StaffRole } from '../types/game';
import {
  ROLE_META,
  calculateTotalHourlyPayroll,
  getBranchStaffSlots,
  resolveBusinessAutomation,
} from '../game/hrEngine';
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
  onSelectBranch?: (businessId: string) => void;
  onSelectManagementTab?: (tab: ManagementTabId) => void;
  onToggleGmAutoAds?: (managerId: string, enabled: boolean) => void;
  onHireCandidate: (candidateId: string, businessId: string | null, cityPlate: number) => void;
  onDismissStaff: (staffId: string, businessId?: string) => void;
  onRefreshPool: () => void;
  onRestockBusiness: (businessId: string) => void;
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
  onSelectBranch,
  onSelectManagementTab,
  onToggleGmAutoAds,
  onHireCandidate,
  onDismissStaff,
  onRefreshPool,
  onRestockBusiness,
  onClose,
}: HrManagementModalProps) {
  const [roleFilter, setRoleFilter] = useState<'all' | StaffRole>('all');

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
  const totalPayroll = calculateTotalHourlyPayroll(state);
  const pendingAppsCount = (state.franchiseApplications ?? []).filter(
    (a) => a.status === 'pending'
  ).length;

  const candidates = (state.candidatePool ?? []).filter((c) =>
    roleFilter === 'all' ? true : c.role === roleFilter
  );

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
          effectiveBusiness
            ? `İK & Çalışanlar · ${effectiveBusiness.customName}`
            : `İK & Çalışanlar · ${targetCityName}`
        }
        icon={<Users className="h-4 w-4" />}
        headerRight={
          <button
            type="button"
            onClick={onRefreshPool}
            disabled={state.cash < 2500}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-400 px-3 text-xs font-bold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Havuzu Yenile (₺2.500)</span>
          </button>
        }
        tabs={topTabs}
        activeTabId="hr"
        onSelectTab={(id) => onSelectManagementTab?.(id as ManagementTabId)}
        subHeader={
          <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap no-scrollbar">
            {ROLE_FILTERS.map((rf) => (
              <button
                key={rf.id}
                type="button"
                onClick={() => setRoleFilter(rf.id)}
                className={`min-h-[36px] shrink-0 rounded-xl px-3 text-xs font-bold transition ${
                  roleFilter === rf.id
                    ? 'bg-amber-400 text-slate-950'
                    : 'border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {rf.label}
              </button>
            ))}
          </div>
        }
        onClose={onClose}
        zIndexClass="z-[1265]"
      >
        {/* Branch Switcher + Strict Slot Counters & Payroll Bar */}
        <section className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {state.businesses.length > 1 && onSelectBranch && (
              <select
                aria-label="Hedef Şube Seç"
                value={effectiveBusiness?.id ?? ''}
                onChange={(e) => onSelectBranch(e.target.value)}
                className="min-h-[38px] rounded-xl border border-slate-700 bg-slate-950 px-2.5 text-xs font-bold text-white"
              >
                {state.businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.customName} ({b.cityName})
                  </option>
                ))}
              </select>
            )}
            {slots ? (
              <div className="flex flex-wrap items-center gap-1.5" data-testid="hr-branch-slots">
                <span
                  className={`rounded-lg border px-2.5 py-1 font-bold ${
                    slots.workers >= slots.maxWorkers
                      ? 'border-amber-400/60 bg-amber-400/15 text-amber-300'
                      : 'border-slate-700 bg-slate-950 text-slate-200'
                  }`}
                >
                  {slots.workers}/{slots.maxWorkers} Çalışan
                </span>
                <span
                  className={`rounded-lg border px-2.5 py-1 font-bold ${
                    slots.assistantManagers >= slots.maxAssistantManagers
                      ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300'
                      : 'border-slate-700 bg-slate-950 text-slate-200'
                  }`}
                >
                  {slots.assistantManagers}/{slots.maxAssistantManagers} Müd. Yrd.
                </span>
                <span
                  className={`rounded-lg border px-2.5 py-1 font-bold ${
                    slots.branchManagers >= slots.maxBranchManagers
                      ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300'
                      : 'border-slate-700 bg-slate-950 text-slate-200'
                  }`}
                >
                  {slots.branchManagers}/{slots.maxBranchManagers} Şube Müdürü
                </span>
              </div>
            ) : (
              <span className="font-bold text-slate-200">
                {targetCityName} İl Yönetimi ({cityBranches.length} Şube)
              </span>
            )}
          </div>
          <span className="font-mono-num text-xs font-bold text-slate-300">
            Saatlik Bordro: <strong className="text-amber-300">{formatTL(totalPayroll)}/sa</strong>
          </span>
        </section>

        {/* Branch Automation & Stock/Maintenance Card */}
        {effectiveBusiness && automation ? (
          <section
            className={`rounded-xl border p-3 space-y-2.5 ${
              automation.fullAutomation
                ? 'border-emerald-500/50 bg-emerald-950/30'
                : automation.autoStock
                ? 'border-amber-400/50 bg-amber-950/25'
                : 'border-rose-500/45 bg-rose-950/25'
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
                    style={{ width: `${Math.round(effectiveBusiness.maintenanceLevel ?? 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {((effectiveBusiness.stockLevel ?? 100) < 98 ||
              (effectiveBusiness.maintenanceLevel ?? 100) < 98) && (
              <button
                type="button"
                onClick={() => onRestockBusiness(effectiveBusiness.id)}
                className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 text-xs font-bold text-slate-950 hover:bg-amber-300"
              >
                <Wrench className="h-4 w-4" />
                <span>Manuel Stok & Bakım Yenile (%100)</span>
              </button>
            )}
          </section>
        ) : (
          <section className="rounded-xl border border-slate-800 bg-slate-900/75 p-3 text-xs text-slate-300">
            <strong className="text-white">{targetCityName} İl Yönetimi:</strong> Birden fazla
            şubeniz (min. 2 şube) olduğunda Bölge Sorumlusu (4 şube + %15 tedarik indirimi) veya
            Genel Müdür (tüm il + %20 verimlilik) atayabilirsiniz.
          </section>
        )}

        {/* Current Staff & City Executives */}
        <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
          {effectiveBusiness && (
            <section className="rounded-xl border border-slate-800 bg-slate-900/75 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-sky-400" />
                  Şube Kadrosu ({(effectiveBusiness.employees ?? []).length})
                </span>
                {slots && (
                  <span className="text-slate-400">
                    {slots.workers}/4 Çalışan · {slots.assistantManagers}/1 Yrd ·{' '}
                    {slots.branchManagers}/1 Müdür
                  </span>
                )}
              </div>
              {(effectiveBusiness.employees ?? []).length === 0 ? (
                <p className="text-xs text-slate-400">
                  Aşağıdaki aday havuzundan çalışan veya yönetici işe alın.
                </p>
              ) : (
                <div className="space-y-2">
                  {(effectiveBusiness.employees ?? []).map((emp) => (
                    <div
                      key={emp.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-white">
                          {emp.name}{' '}
                          <span className="text-amber-400">{'★'.repeat(emp.stars)}</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {emp.roleTitle} · Hız {emp.speed} · Verim {emp.efficiency} ·{' '}
                          <span className="font-mono-num text-amber-300">
                            {formatTL(emp.hourlySalary)}/sa
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDismissStaff(emp.id, effectiveBusiness.id)}
                        aria-label="İşten Çıkar"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="rounded-xl border border-slate-800 bg-slate-900/75 p-3 space-y-2">
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
                    className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-white">
                          {exec.name}{' '}
                          <span className="text-amber-400">{'★'.repeat(exec.stars)}</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {ROLE_META[exec.role].label} ·{' '}
                          <span className="font-mono-num text-amber-300">
                            {formatTL(exec.hourlySalary)}/sa
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDismissStaff(exec.id)}
                        aria-label="Görevden Al"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </div>

                    {exec.role === 'genel_mudur' && onToggleGmAutoAds && (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-fuchsia-500/35 bg-fuchsia-950/25 px-2.5 py-2">
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
                          className={`min-h-[36px] shrink-0 rounded-xl px-3 text-xs font-bold transition whitespace-nowrap ${
                            exec.autoAdsEnabled
                              ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                              : 'border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
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

        {/* Renewable 1-5 Star Candidate Pool */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              1–5 Yıldız Aday Havuzu ({candidates.length} Aday)
            </h3>
            <span className="text-xs text-slate-400">
              Nakit: <strong className="font-mono-num text-emerald-400">{formatTL(state.cash, true)}</strong>
            </span>
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
                : `İşe Al · ${formatTL(cand.hireCost)}`;

              return (
                <div
                  key={cand.id}
                  className="flex flex-col justify-between gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 p-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold text-white">{cand.name}</span>
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-bold text-sky-300">
                          {meta.label}
                        </span>
                      </div>
                      <span className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: cand.stars }).map((_, idx) => (
                          <Star key={idx} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
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
                    className="min-h-[42px] w-full rounded-xl bg-amber-400 px-3 text-xs font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-400"
                  >
                    {buttonLabel}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </MobileGameModal>
    </div>
  );
}
