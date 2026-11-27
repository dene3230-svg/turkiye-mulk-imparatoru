import type {
  ActiveAdCampaign,
  EmpireState,
  OwnedBusiness,
  RemoteBusinessRecord,
  StockQuote,
} from '../types/game';
import { getBlueprintById } from './catalog';
import {
  calculateBusinessHourlyIncome,
  isBusinessUnderConstruction,
} from './economy';
import { getBranchStaffSlots } from './hrEngine';
import { calculateBranchServiceQuality } from './officeEngine';
import { getBranchFacilityLevel } from './branchOpsEngine';
import { computeExecutiveDashboardMetrics } from './dashboardMetrics';

export type ReportPeriodId = '24h' | '7d' | '30d';

export interface ExpenseBreakdown {
  personnelPct: number;
  rentTaxPct: number;
  supplyOpsPct: number;
  hqBureaucracyPct: number;
  personnelCost: number;
  rentTaxCost: number;
  supplyOpsCost: number;
  hqBureaucracyCost: number;
  totalExpense: number;
}

export interface SmartBranchAlert {
  id: string;
  type: 'warning' | 'opportunity';
  businessId: string;
  businessName: string;
  headline: string;
  detail: string;
  actionLabel: 'ŞUBEYE GİT' | 'YÖNET';
}

export interface SectorDistributionSlice {
  sectorKey: string;
  label: string;
  color: string;
  sharePct: number;
  branchCount: number;
  dailyRevenue: number;
}

export interface ReportTrendPoint {
  label: string;
  revenue: number;
  profit: number;
}

export interface HoldingReportsSnapshot {
  period: ReportPeriodId;
  periodDays: number;
  periodTitle: string;
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  profitMarginPct: number;
  trendSeries: ReportTrendPoint[];
  expenseBreakdown: ExpenseBreakdown;
  alerts: SmartBranchAlert[];
  customerSatisfactionPct: number;
  brandRecognitionPct: number;
  sectorSlices: SectorDistributionSlice[];
  activeBranchCount: number;
  totalStaffCount: number;
  bulkAdCost: number;
  bulkBonusCost: number;
  progressiveTaxBracketPct: number;
  dailyCorporateTaxEstimate: number;
  dailyHqBureaucracyCost: number;
  inflationIndex: number;
}

const SECTOR_META: Record<string, { label: string; color: string }> = {
  kafe: { label: 'Kafe', color: '#38BDF8' },
  restoran: { label: 'Restoran', color: '#F59E0B' },
  supermarket: { label: 'Market', color: '#10B981' },
  otopark: { label: 'Otopark', color: '#A855F7' },
  avm: { label: 'AVM', color: '#EC4899' },
  grand_otel: { label: 'Otel', color: '#818CF8' },
  fabrika: { label: 'Fabrika', color: '#FB7185' },
  enerji_santrali: { label: 'Enerji', color: '#FACC15' },
};

const FALLBACK_COLORS = ['#38BDF8', '#F59E0B', '#10B981', '#818CF8', '#F43F5E', '#A855F7'];

export function computeBulkAdCampaignCost(activeBranchCount: number): number {
  if (activeBranchCount <= 0) return 15_000;
  return Math.round((activeBranchCount * 12_000) / 1_000) * 1_000;
}

export function computeBulkStaffBonusCost(
  activeBranchCount: number,
  totalStaffCount: number
): number {
  if (activeBranchCount <= 0 && totalStaffCount <= 0) return 10_000;
  const raw = Math.max(10_000, totalStaffCount * 3_000 + activeBranchCount * 1_500);
  return Math.round(raw / 1_000) * 1_000;
}

function getPeriodDays(period: ReportPeriodId): number {
  if (period === '24h') return 1;
  if (period === '7d') return 7;
  return 30;
}

function getPeriodTitle(period: ReportPeriodId): string {
  if (period === '24h') return 'Günlük Ciro';
  if (period === '7d') return '7 Günlük Ciro';
  return '30 Günlük Ciro';
}

function buildTrendSeries(
  period: ReportPeriodId,
  dailyRevenue: number,
  dailyProfit: number,
  state: EmpireState
): ReportTrendPoint[] {
  const history = Array.isArray(state.dayEndHistory) ? state.dayEndHistory : [];

  if (period === '24h') {
    const labels = ['04:00', '08:00', '12:00', '16:00', '20:00', '24:00'];
    const curve = [0.45, 0.72, 0.94, 0.86, 1.18, 1.05];
    return labels.map((label, i) => ({
      label,
      revenue: Math.max(0, Math.round((dailyRevenue / 6) * curve[i])),
      profit: Math.round((dailyProfit / 6) * curve[i]),
    }));
  }

  if (period === '7d') {
    const labels = ['1 gün', '2 gün', '3 gün', '4 gün', '5 gün', '6 gün', '7 gün'];
    const recent = history.slice(-7);
    const wave = [0.76, 0.88, 0.82, 0.96, 0.91, 1.04, 1.12];
    return labels.map((label, idx) => {
      const h = recent[idx];
      if (h && Number.isFinite(h.dailyGrossRevenue) && h.dailyGrossRevenue > 0) {
        return {
          label,
          revenue: Math.round(h.dailyGrossRevenue),
          profit: Math.round(h.dailyNetCashFlow),
        };
      }
      return {
        label,
        revenue: Math.max(0, Math.round(dailyRevenue * wave[idx])),
        profit: Math.round(dailyProfit * wave[idx]),
      };
    });
  }

  // 30d: 6 five-day buckets
  const labels = ['5. Gün', '10. Gün', '15. Gün', '20. Gün', '25. Gün', '30. Gün'];
  const wave = [0.72, 0.81, 0.87, 0.93, 1.02, 1.14];
  return labels.map((label, idx) => ({
    label,
    revenue: Math.max(0, Math.round(dailyRevenue * 5 * wave[idx])),
    profit: Math.round(dailyProfit * 5 * wave[idx]),
  }));
}

export function scanSmartBranchAlerts(
  state: EmpireState,
  now: number
): SmartBranchAlert[] {
  const businesses = Array.isArray(state.businesses) ? state.businesses : [];
  const active = businesses.filter((b) => !isBusinessUnderConstruction(b));
  if (active.length === 0) return [];

  const alerts: SmartBranchAlert[] = [];

  // 1) Find worst operational warning candidate (fatigue / morale / maintenance / stock / staffing)
  let worstWarning: {
    biz: OwnedBusiness;
    severity: number;
    fatiguePct: number;
    revDropPct: number;
    reasonText: string;
  } | null = null;

  for (const biz of active) {
    const quality = calculateBranchServiceQuality(biz, state.cityManagers ?? [], businesses);
    const slots = getBranchStaffSlots(biz);
    const staffCount = slots.workers + slots.assistantManagers + slots.branchManagers;
    const morale = Math.max(0, Math.min(100, biz.staffMorale ?? 78));
    const maint = Math.max(0, Math.min(100, biz.maintenanceLevel ?? 82));
    const stock = Math.max(0, Math.min(100, biz.stockLevel ?? 85));

    // Fatigue rises as morale drops or staffing is thin
    const understaffPenalty = staffCount <= 1 ? 22 : staffCount === 2 ? 12 : 0;
    const fatiguePct = Math.max(
      10,
      Math.min(95, Math.round((100 - morale) * 1.15 + understaffPenalty))
    );
    const revDropPct = Math.max(
      5,
      Math.min(45, Math.round((100 - quality.customerTrafficPct) * 0.65 + (fatiguePct >= 35 ? 8 : 0)))
    );

    const hasWarning =
      fatiguePct >= 32 || morale < 82 || maint < 80 || stock < 75 || staffCount < 2;

    if (hasWarning) {
      let reasonText = `Personel yorgunluğu %${fatiguePct} (Ciro -%${revDropPct})`;
      if (stock < 65) {
        reasonText = `Stok kritik (%${Math.round(stock)}) — satış kaybı riski`;
      } else if (maint < 70) {
        reasonText = `Bakım & hijyen düşük (%${Math.round(maint)})`;
      } else if (staffCount === 0) {
        reasonText = `Personel eksik! Müşteri trafiği -%${revDropPct}`;
      }
      const severity = fatiguePct + (100 - stock) * 0.5 + (100 - maint) * 0.5;
      if (!worstWarning || severity > worstWarning.severity) {
        worstWarning = { biz, severity, fatiguePct, revDropPct, reasonText };
      }
    }
  }

  if (worstWarning) {
    alerts.push({
      id: `warn-${worstWarning.biz.id}`,
      type: 'warning',
      businessId: worstWarning.biz.id,
      businessName: worstWarning.biz.customName,
      headline: `${worstWarning.biz.customName}:`,
      detail: worstWarning.reasonText,
      actionLabel: 'ŞUBEYE GİT',
    });
  }

  // 2) Find strongest growth opportunity candidate (high quality / demand with room to upgrade capacity)
  let bestOpportunity: { biz: OwnedBusiness; score: number; detail: string } | null = null;

  for (const biz of active) {
    const capLevel = getBranchFacilityLevel(biz, 'capacity');
    const eqLevel = getBranchFacilityLevel(biz, 'equipment');
    const quality = calculateBranchServiceQuality(biz, state.cityManagers ?? [], businesses);
    const hourly = calculateBusinessHourlyIncome(biz, state.activeEvent, now, businesses, state);

    const hasGrowthRoom = capLevel < 10 || eqLevel < 10;
    const isStrongPerformer = quality.stars >= 3.2 && hourly > 0;
    if (hasGrowthRoom && isStrongPerformer) {
      // Prefer a different branch than the warning one when multiple branches exist
      const diversityBonus = worstWarning && biz.id === worstWarning.biz.id ? -1000 : 1000;
      const score = diversityBonus + quality.stars * 100 + (10 - capLevel) * 18 + hourly / 1000;
      const detail =
        capLevel <= 2
          ? 'Tam kapasite! Büyütme önerilir'
          : `Yüksek talep (★${quality.stars.toFixed(1)}) — ekipman & kapasite artır`;
      if (!bestOpportunity || score > bestOpportunity.score) {
        bestOpportunity = { biz, score, detail };
      }
    }
  }

  if (bestOpportunity) {
    alerts.push({
      id: `opp-${bestOpportunity.biz.id}`,
      type: 'opportunity',
      businessId: bestOpportunity.biz.id,
      businessName: bestOpportunity.biz.customName,
      headline: `${bestOpportunity.biz.customName}:`,
      detail: bestOpportunity.detail,
      actionLabel: 'YÖNET',
    });
  }

  return alerts;
}

export function computeHoldingReportsSnapshot(
  state: EmpireState,
  period: ReportPeriodId,
  now = Date.now(),
  quotes: StockQuote[] = [],
  competitorBusinesses?: RemoteBusinessRecord[]
): HoldingReportsSnapshot {
  const periodDays = getPeriodDays(period);
  const businesses = Array.isArray(state.businesses) ? state.businesses : [];
  const stateWithRivals = { ...state, competitorBusinesses };

  // Single source of truth: share the exact progressive tax, HQ bureaucracy overhead & inflation engine with ExecutiveDashboard!
  const execMetrics = computeExecutiveDashboardMetrics(state, quotes, now, competitorBusinesses);

  let activeBranchCount = 0;
  let satisfactionSum = 0;

  const sectorMap = new Map<
    string,
    { label: string; color: string; branchCount: number; dailyRevenue: number }
  >();

  const safeFinite = (v: number) => (Number.isFinite(v) ? v : 0);

  for (const biz of businesses) {
    const bp = getBlueprintById(biz.blueprintId);
    const underConst = isBusinessUnderConstruction(biz);

    const bizDailyRev = underConst
      ? 0
      : Math.max(
          0,
          Math.round(
            safeFinite(
              calculateBusinessHourlyIncome(biz, state.activeEvent, now, businesses, stateWithRivals)
            ) * 24
          )
        );

    if (!underConst) {
      activeBranchCount += 1;
      const q = calculateBranchServiceQuality(biz, state.cityManagers ?? [], businesses);
      satisfactionSum += safeFinite(q.customerTrafficPct);
    }

    const sectorKey = biz.blueprintId;
    const meta = SECTOR_META[sectorKey] ?? {
      label: bp?.name ?? biz.blueprintId,
      color: FALLBACK_COLORS[sectorMap.size % FALLBACK_COLORS.length],
    };
    const existing = sectorMap.get(sectorKey);
    if (existing) {
      existing.branchCount += 1;
      existing.dailyRevenue += bizDailyRev;
    } else {
      sectorMap.set(sectorKey, {
        label: meta.label,
        color: meta.color,
        branchCount: 1,
        dailyRevenue: bizDailyRev,
      });
    }
  }

  const totalStaffCount = execMetrics.totalStaffCount;

  // Exact parity with ExecutiveDashboard (progressive corporate tax + HQ bureaucracy overhead + inflation)
  const dailyRevenue = Math.max(0, Math.round(safeFinite(execMetrics.dailyEstimatedRevenue)));
  const dailyPersonnelCost = Math.max(0, Math.round(safeFinite(execMetrics.dailyPayrollWithSgk)));
  const dailyRentTaxTotal = Math.max(
    0,
    Math.round(safeFinite(execMetrics.dailyRentUtilities) + safeFinite(execMetrics.dailyCorporateTaxEstimate))
  );
  const dailySupplyOpsTotal = Math.max(0, Math.round(safeFinite(execMetrics.dailyEstimatedSupply)));
  const dailyHqBureaucracyTotal = Math.max(
    0,
    Math.round(safeFinite(execMetrics.dailyHqBureaucracyCost))
  );

  const totalRevenue = Math.round(dailyRevenue * periodDays);
  const personnelCost = Math.round(dailyPersonnelCost * periodDays);
  const rentTaxCost = Math.round(dailyRentTaxTotal * periodDays);
  const supplyOpsCost = Math.round(dailySupplyOpsTotal * periodDays);
  const hqBureaucracyCost = Math.round(dailyHqBureaucracyTotal * periodDays);
  const totalExpense = personnelCost + rentTaxCost + supplyOpsCost + hqBureaucracyCost;
  const netProfit = totalRevenue - totalExpense;
  const profitMarginPct =
    totalRevenue > 0 ? Math.max(-99, Math.min(95, Math.round((netProfit / totalRevenue) * 100))) : 0;

  // True proportional expense percentages summing cleanly to 100%
  let personnelPct = 45;
  let rentTaxPct = 30;
  let supplyOpsPct = 25;
  let hqBureaucracyPct = 0;
  if (totalExpense > 0) {
    personnelPct = Math.round((personnelCost / totalExpense) * 100);
    rentTaxPct = Math.round((rentTaxCost / totalExpense) * 100);
    hqBureaucracyPct =
      hqBureaucracyCost > 0 ? Math.round((hqBureaucracyCost / totalExpense) * 100) : 0;
    supplyOpsPct = Math.max(0, 100 - personnelPct - rentTaxPct - hqBureaucracyPct);
    if (personnelPct + rentTaxPct + hqBureaucracyPct > 100) {
      rentTaxPct = Math.max(0, 100 - personnelPct - hqBureaucracyPct);
      supplyOpsPct = 0;
    }
  }

  // Build Sector Distribution Slices summing to 100%
  const rawSlices = Array.from(sectorMap.entries()).map(([sectorKey, v]) => ({
    sectorKey,
    ...v,
  }));
  rawSlices.sort((a, b) => b.dailyRevenue - a.dailyRevenue || b.branchCount - a.branchCount);

  const totalWeight = rawSlices.reduce(
    (acc, s) => acc + (dailyRevenue > 0 ? s.dailyRevenue : s.branchCount),
    0
  );

  let assignedPct = 0;
  const sectorSlices: SectorDistributionSlice[] = rawSlices.map((s, idx) => {
    const weight = dailyRevenue > 0 ? s.dailyRevenue : s.branchCount;
    let sharePct =
      idx === rawSlices.length - 1
        ? Math.max(0, 100 - assignedPct)
        : totalWeight > 0
        ? Math.max(1, Math.round((weight / totalWeight) * 100))
        : 0;
    if (assignedPct + sharePct > 100) {
      sharePct = Math.max(0, 100 - assignedPct);
    }
    assignedPct += sharePct;
    return {
      sectorKey: s.sectorKey,
      label: s.label,
      color: s.color,
      sharePct,
      branchCount: s.branchCount,
      dailyRevenue: s.dailyRevenue,
    };
  });

  const customerSatisfactionPct =
    activeBranchCount > 0
      ? Math.max(15, Math.min(100, Math.round(satisfactionSum / activeBranchCount)))
      : 0;
  const brandRecognitionPct = Math.max(0, Math.min(100, Math.round(state.brandRecognition ?? 5)));

  const dailyNetProfit =
    dailyRevenue -
    (dailyPersonnelCost + dailyRentTaxTotal + dailySupplyOpsTotal + dailyHqBureaucracyTotal);
  const trendSeries = buildTrendSeries(period, dailyRevenue, dailyNetProfit, state);

  return {
    period,
    periodDays,
    periodTitle: getPeriodTitle(period),
    totalRevenue,
    totalExpense,
    netProfit,
    profitMarginPct,
    trendSeries,
    expenseBreakdown: {
      personnelPct,
      rentTaxPct,
      supplyOpsPct,
      hqBureaucracyPct,
      personnelCost,
      rentTaxCost,
      supplyOpsCost,
      hqBureaucracyCost,
      totalExpense,
    },
    alerts: scanSmartBranchAlerts(state, now),
    customerSatisfactionPct,
    brandRecognitionPct,
    sectorSlices,
    activeBranchCount,
    totalStaffCount,
    bulkAdCost: computeBulkAdCampaignCost(activeBranchCount),
    bulkBonusCost: computeBulkStaffBonusCost(activeBranchCount, totalStaffCount),
    progressiveTaxBracketPct: execMetrics.progressiveTaxBracketPct,
    dailyCorporateTaxEstimate: execMetrics.dailyCorporateTaxEstimate,
    dailyHqBureaucracyCost: execMetrics.dailyHqBureaucracyCost,
    inflationIndex: execMetrics.inflationIndex,
  };
}

/** Bulk Action 1: Launch a holding-wide ad campaign across all active branches */
export function launchHoldingWideAdCampaign(
  state: EmpireState,
  now = Date.now()
): {
  state: EmpireState;
  ok: boolean;
  error?: string;
  cost?: number;
  affectedBranches?: number;
} {
  const activeBranches = state.businesses.filter((b) => !isBusinessUnderConstruction(b));
  if (activeBranches.length === 0) {
    return { state, ok: false, error: 'Reklam verilecek aktif şube bulunmuyor.' };
  }
  const cost = computeBulkAdCampaignCost(activeBranches.length);
  if (state.cash < cost) {
    return { state, ok: false, error: 'Toplu reklam kampanyası için yetersiz bakiye.' };
  }

  const startMin = state.gameMinutes ?? 540;
  const durationMin = 24 * 60; // 24 game hours
  const campaign: ActiveAdCampaign = {
    tierId: 'social',
    label: 'Toplu Holding Kampanyası',
    cost: Math.round(cost / activeBranches.length),
    revenueBoost: 0.22,
    customerBoost: 0.18,
    startedAtGameMin: startMin,
    endsAtGameMin: startMin + durationMin,
    autoRenewedByGm: false,
  };

  return {
    ok: true,
    cost,
    affectedBranches: activeBranches.length,
    state: {
      ...state,
      cash: state.cash - cost,
      brandRecognition: Math.min(100, Number(((state.brandRecognition ?? 5) + 1.5).toFixed(1))),
      businesses: state.businesses.map((b) =>
        isBusinessUnderConstruction(b) ? b : { ...b, activeAdCampaign: { ...campaign } }
      ),
      lastSavedAt: now,
    },
  };
}

/** Bulk Action 2: Distribute holding-wide bonus to all staff to cut fatigue & lift efficiency */
export function distributeHoldingStaffBonus(
  state: EmpireState,
  now = Date.now()
): {
  state: EmpireState;
  ok: boolean;
  error?: string;
  cost?: number;
  affectedStaff?: number;
} {
  const activeBranches = state.businesses.filter((b) => !isBusinessUnderConstruction(b));
  let staffTotal = 0;
  for (const b of state.businesses) {
    const slots = getBranchStaffSlots(b);
    staffTotal += slots.workers + slots.assistantManagers + slots.branchManagers;
  }
  staffTotal += (state.cityManagers ?? []).length + (state.accountant ? 1 : 0) + (state.ceo ? 1 : 0);

  if (activeBranches.length === 0 && staffTotal === 0) {
    return { state, ok: false, error: 'Prim dağıtılacak aktif şube veya personel bulunmuyor.' };
  }

  const cost = computeBulkStaffBonusCost(activeBranches.length, staffTotal);
  if (state.cash < cost) {
    return { state, ok: false, error: 'Toplu personel primi için yetersiz bakiye.' };
  }

  return {
    ok: true,
    cost,
    affectedStaff: Math.max(staffTotal, activeBranches.length),
    state: {
      ...state,
      cash: state.cash - cost,
      businesses: state.businesses.map((b) => ({
        ...b,
        staffMorale: Math.min(100, Math.round((b.staffMorale ?? 78) + 18)),
        employees: (b.employees ?? []).map((emp) => ({
          ...emp,
          efficiency: Math.min(100, Math.round((emp.efficiency ?? 72) + 6)),
          speed: Math.min(100, Math.round((emp.speed ?? 72) + 5)),
        })),
      })),
      cityManagers: (state.cityManagers ?? []).map((mgr) => ({
        ...mgr,
        efficiency: Math.min(100, Math.round((mgr.efficiency ?? 80) + 5)),
      })),
      lastSavedAt: now,
    },
  };
}
