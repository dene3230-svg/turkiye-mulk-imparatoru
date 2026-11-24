import { useState } from 'react';
import {
  X,
  Users,
  Star,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Wrench,
  UserMinus,
  Briefcase,
  Building2,
} from 'lucide-react';
import type { EmpireState, OwnedBusiness, StaffRole } from '../types/game';
import {
  ROLE_META,
  calculateTotalHourlyPayroll,
  resolveBusinessAutomation,
} from '../game/hrEngine';
import { formatTL } from '../game/economy';

interface HrManagementModalProps {
  open: boolean;
  business: OwnedBusiness | null;
  state: EmpireState;
  activeCityPlate: number;
  activeCityName: string;
  onHireCandidate: (candidateId: string, businessId: string | null, cityPlate: number) => void;
  onDismissStaff: (staffId: string, businessId?: string) => void;
  onRefreshPool: () => void;
  onRestockBusiness: (businessId: string) => void;
  onClose: () => void;
}

const ROLE_FILTERS: Array<{ id: 'all' | StaffRole; label: string }> = [
  { id: 'all', label: 'Tümü' },
  { id: 'calisan', label: '1. Çalışan' },
  { id: 'mudur_yardimcisi', label: '2. Müd. Yrd.' },
  { id: 'sube_muduru', label: '3. Şube Müd.' },
  { id: 'bolge_sorumlusu', label: '4. Bölge Sor.' },
  { id: 'genel_mudur', label: '5. Genel Müdür' },
];

export function HrManagementModal({
  open,
  business,
  state,
  activeCityPlate,
  activeCityName,
  onHireCandidate,
  onDismissStaff,
  onRefreshPool,
  onRestockBusiness,
  onClose,
}: HrManagementModalProps) {
  const [roleFilter, setRoleFilter] = useState<'all' | StaffRole>('all');

  if (!open) return null;

  const targetPlate = business?.cityPlate ?? activeCityPlate;
  const targetCityName = business?.cityName ?? activeCityName;
  const cityBranches = state.businesses.filter((b) => b.cityPlate === targetPlate);
  const cityExecs = (state.cityManagers ?? []).filter((m) => m.assignedCityPlate === targetPlate);
  const automation = business
    ? resolveBusinessAutomation(business, state.cityManagers ?? [], state.businesses)
    : null;
  const totalPayroll = calculateTotalHourlyPayroll(state);

  const candidates = (state.candidatePool ?? []).filter((c) =>
    roleFilter === 'all' ? true : c.role === roleFilter
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Personel ve İK Yönetimi"
      data-testid="hr-management-modal"
      className="fixed inset-0 z-[1265] flex items-center justify-center bg-slate-950/60 p-2.5 safe-inset"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100dvh-24px)] w-full max-w-3xl lg:max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="compact-short-pad flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3.5 py-2 dark:border-slate-800 sm:px-4 sm:py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold sm:text-base">
                Personel & İK Havuzu · {business ? business.customName : `${targetCityName} Yönetimi`}
              </h2>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                1–5 Yıldız Aday Havuzu · 5 Kademeli Kurumsal Otomasyon · Saatlik Bordro:{' '}
                <span className="font-mono-num font-bold text-slate-800 dark:text-slate-200">
                  {formatTL(totalPayroll)}/sa
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefreshPool}
              disabled={state.cash < 2500}
              className="flex h-8 items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Havuzu Yenile (₺2.500)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="İK Penceresini Kapat"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body: Left Current Team & Automation Status | Right Renewable 1-5 Star Candidate Pool */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-hidden p-2.5 min-[620px]:grid-cols-12 sm:p-3">
          {/* Left Column: Current Branch / City Automation */}
          <div className="panel-scroll min-h-0 flex flex-col gap-2.5 overflow-y-auto overscroll-contain min-[620px]:col-span-5">
            {business && automation ? (
              <div
                className={`rounded-xl border p-3 ${
                  automation.fullAutomation
                    ? 'border-emerald-300 bg-emerald-50/75 dark:border-emerald-800 dark:bg-emerald-950/35'
                    : automation.autoStock
                    ? 'border-amber-300 bg-amber-50/75 dark:border-amber-800 dark:bg-amber-950/35'
                    : 'border-red-300 bg-red-50/75 dark:border-red-800 dark:bg-red-950/35'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold">
                    {automation.fullAutomation || automation.autoStock ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                    <span>
                      {automation.fullAutomation
                        ? 'Otomasyon Aktif (Tam Yetki)'
                        : automation.autoStock
                        ? 'Kısmi Otomasyon (Otomatik Stok)'
                        : 'Yönetici Eksik — Verim Düşebilir'}
                    </span>
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                  {automation.managerLabel
                    ? `Sorumlu: ${automation.managerLabel}${
                        automation.efficiencyBonus > 0
                          ? ` · +%${Math.round(automation.efficiencyBonus * 100)} verim`
                          : ''
                      }`
                    : 'Müdür Yardımcısı, Şube Müdürü, Bölge Sorumlusu veya Genel Müdür atayarak şubeyi otomatikleştirin.'}
                </p>

                {/* Stock & Maintenance Meters */}
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold">
                      <span>Stok Durumu</span>
                      <span className="font-mono-num">{Math.round(business.stockLevel ?? 100)}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.round(business.stockLevel ?? 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold">
                      <span>Temizlik & Bakım</span>
                      <span className="font-mono-num">
                        {Math.round(business.maintenanceLevel ?? 100)}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-sky-500"
                        style={{ width: `${Math.round(business.maintenanceLevel ?? 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {((business.stockLevel ?? 100) < 98 || (business.maintenanceLevel ?? 100) < 98) && (
                  <button
                    type="button"
                    onClick={() => onRestockBusiness(business.id)}
                    className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-700"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    <span>Manuel Stok & Bakım Yenile (%100)</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                <div className="font-bold text-slate-900 dark:text-white">
                  {targetCityName} İl Yönetimi ({cityBranches.length} Şube)
                </div>
                <p className="mt-1 text-[11px]">
                  Şehir geneli Bölge Sorumlusu (4 şubeye kadar) veya Genel Müdür (tüm ilde +%20
                  verim) atamak için sağdaki havuzdan seçim yapabilirsiniz.
                </p>
              </div>
            )}

            {/* City-Level Executives */}
            <div className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-amber-600" />
                  {targetCityName} Üst Yönetimi (İl Kademesi)
                </span>
                <span className="font-mono-num text-[10px] text-slate-500">
                  {cityBranches.length} şube
                </span>
              </div>
              {cityExecs.length === 0 ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Henüz Bölge Sorumlusu veya Genel Müdür atanmadı.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {cityExecs.map((exec) => (
                    <div
                      key={exec.id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs dark:bg-slate-950/70"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-bold">
                          {exec.name} ·{' '}
                          <span className="text-amber-600 dark:text-amber-400">
                            {'★'.repeat(exec.stars)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {ROLE_META[exec.role].label} · {formatTL(exec.hourlySalary)}/sa
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDismissStaff(exec.id)}
                        title="Görevden Al"
                        className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Branch Staff List */}
            {business && (
              <div className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-sky-600" />
                    Şube Kadrosu ({(business.employees ?? []).length})
                  </span>
                </div>
                {(business.employees ?? []).length === 0 ? (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sağdaki 1–5 yıldızlı aday havuzundan çalışan veya müdür işe alın.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {(business.employees ?? []).map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs dark:bg-slate-950/70"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-bold">
                            {emp.name}{' '}
                            <span className="text-amber-500">{'★'.repeat(emp.stars)}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {emp.roleTitle} · Hız {emp.speed} · Verim {emp.efficiency} ·{' '}
                            {formatTL(emp.hourlySalary)}/sa
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDismissStaff(emp.id, business.id)}
                          title="İşten Çıkar"
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Renewable 1-5 Star Candidate Pool */}
          <div className="flex min-h-0 flex-col min-[620px]:col-span-7">
            {/* 5-Tier Filter Pills */}
            <div className="mb-1.5 flex shrink-0 items-center gap-1 overflow-x-auto pb-1">
              {ROLE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setRoleFilter(f.id)}
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors whitespace-nowrap ${
                    roleFilter === f.id
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="panel-scroll flex-1 min-h-0 space-y-2 overflow-y-auto overscroll-contain pr-1">
              {candidates.map((cand) => {
                const meta = ROLE_META[cand.role];
                const isCityRole = meta.scope === 'city';
                const canAfford = state.cash >= cand.hireCost;
                const needsBranch = !isCityRole && !business;
                const needsTwoBranches =
                  cand.role === 'bolge_sorumlusu' && cityBranches.length < 2;
                const needsOneBranch = cand.role === 'genel_mudur' && cityBranches.length < 1;
                const disabled = !canAfford || needsBranch || needsTwoBranches || needsOneBranch;

                return (
                  <div
                    key={cand.id}
                    className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {cand.name}
                          </span>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {meta.label}
                          </span>
                          <span className="flex items-center gap-0.5 text-amber-500">
                            {Array.from({ length: cand.stars }).map((_, idx) => (
                              <Star key={idx} className="h-3 w-3 fill-amber-400 text-amber-500" />
                            ))}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                          {meta.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          onHireCandidate(cand.id, business?.id ?? null, targetPlate)
                        }
                        className="shrink-0 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 whitespace-nowrap"
                      >
                        İşe Al · {formatTL(cand.hireCost)}
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-1.5 text-[10px] dark:border-slate-800/80">
                      <div className="flex items-center gap-3 font-mono-num font-semibold text-slate-600 dark:text-slate-300">
                        <span>Hız: {cand.speed}</span>
                        <span>Verimlilik: {cand.efficiency}</span>
                        <span>Liderlik: {cand.leadership}</span>
                      </div>
                      <div className="font-mono-num font-bold text-slate-700 dark:text-amber-300">
                        Maaş: {formatTL(cand.hourlySalary)}/sa
                        {needsTwoBranches && (
                          <span className="ml-2 text-red-600 dark:text-red-400">
                            (Min 2 şube gerekir)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
