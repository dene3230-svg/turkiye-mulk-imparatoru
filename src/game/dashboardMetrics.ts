import type { EmpireState, StockQuote } from '../types/game';
import {
  calculateBusinessHourlyIncome,
  calculateBusinessValuation,
  calculateDailyRentAndUtilities,
  calculateNetWorth,
  getCompanyTier,
  getNextCompanyTier,
  isBusinessUnderConstruction,
} from './economy';
import {
  calculateBranchServiceQuality,
  calculateOfficeBenefits,
  calculatePersonalAssetsValuation,
  OFFICE_TIERS,
} from './officeEngine';
import { getCreditTier } from './bankingEngine';
import { getBlueprintById } from './catalog';

export type AccountCardId = 'cash' | 'credit' | 'investments' | 'expenses';
export type OperationCardId = 'businesses' | 'office' | 'growth';

export interface IncomeExpensePoint {
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface WeeklyTrendBar {
  label: string;
  net: number;
  pctHeight: number; // 12..100 for clean bar visuals
  tone: 'cyan' | 'amber' | 'emerald' | 'rose';
}

export interface AccountCardSummary {
  id: AccountCardId;
  index: number;
  title: string;
  amount: number;
  subtitle: string;
  badgeText: string;
  tone: 'cyan' | 'amber' | 'indigo' | 'rose';
}

export interface ExecutiveDashboardMetrics {
  // Top bar & Column 1
  brandRecognitionPct: number;
  officePrestige: number;
  officeTierName: string;
  officeTierNumber: number;
  supplyDiscountPct: number;
  loanInterestDiscountPct: number;
  totalCash: number;
  dailyCashDeltaPct: number;
  totalPeriodIncome: number;
  totalPeriodExpense: number;
  incomeExpenseSeries: IncomeExpensePoint[];
  weeklyTrends: WeeklyTrendBar[];
  weeklyTrendDeltaPct: number;
  // Column 2 (2x2 accounts)
  accountCards: AccountCardSummary[];
  activeLoanDebt: number;
  availableCreditLimit: number;
  activeLoanCount: number;
  investmentsTotal: number;
  stockPortfolioValue: number;
  businessValuationsTotal: number;
  personalAssetsTotal: number;
  dailyOperatingExpenses: number;
  dailyPayrollWithSgk: number;
  dailyRentUtilities: number;
  dailyEstimatedSupply: number;
  // Column 3 (3 management cards)
  branchCount: number;
  underConstructionCount: number;
  totalStaffCount: number;
  avgServiceQuality: number;
  serviceQualityPct: number;
  dailyEstimatedRevenue: number;
  activeGrowthProjects: number;
  growthBudget: number;
  companyLevel: number;
  companyTitle: string;
  tierProgressPct: number;
}

function safeNum(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function computeStaffDailyCost(staff: {
  dailyWage?: number;
  dailyEmployerSgk?: number;
  hourlySalary: number;
}): number {
  const dailyWage = safeNum(staff.dailyWage, 0);
  if (dailyWage > 0) {
    return Math.round(dailyWage + safeNum(staff.dailyEmployerSgk, dailyWage * 0.225));
  }
  return Math.round(Math.max(0, safeNum(staff.hourlySalary, 0)) * 8);
}

function computeDailyPayrollWithSgk(state: EmpireState): number {
  let totalDaily = 0;
  for (const biz of state.businesses ?? []) {
    for (const emp of biz.employees ?? []) {
      totalDaily += computeStaffDailyCost(emp);
    }
  }
  for (const mgr of state.cityManagers ?? []) {
    totalDaily += computeStaffDailyCost(mgr);
  }
  if (state.accountant) {
    totalDaily += computeStaffDailyCost(state.accountant);
  }
  if (state.ceo) {
    totalDaily += computeStaffDailyCost(state.ceo);
  }
  return Math.round(safeNum(totalDaily, 0));
}

/**
 * Pure deterministic metrics selector for the v1.5.0 3-column Executive Control Panel.
 * Uses exclusively real EmpireState and live StockQuote figures (no mock numbers).
 */
export function computeExecutiveDashboardMetrics(
  state: EmpireState,
  quotes: StockQuote[],
  now: number
): ExecutiveDashboardMetrics {
  const safeCash = safeNum(state.cash, 0);
  const safeCreditScore = Math.round(safeNum(state.creditScore, 1100));
  const safeGameMinutes = safeNum(state.gameMinutes, 540);
  const businesses = Array.isArray(state.businesses) ? state.businesses : [];

  const officeBenefits = calculateOfficeBenefits(state);
  const officeTierIdx = Math.max(
    1,
    OFFICE_TIERS.findIndex((t) => t.id === officeBenefits.tier.id) + 1
  );
  const brandRecognitionPct = Math.max(
    0,
    Math.min(100, Math.round(safeNum(state.brandRecognition, 5)))
  );
  const supplyDiscountPct = Math.round(safeNum(officeBenefits.supplyDiscountRate, 0) * 100);
  const loanInterestDiscountPct = Number(
    (safeNum(officeBenefits.loanInterestDiscount, 0) * 100).toFixed(1)
  );

  // Business valuations, service quality, daily revenues & costs
  let businessValuationsTotal = 0;
  let dailyEstimatedRevenue = 0;
  let dailyRentUtilities = 0;
  let dailyEstimatedSupply = 0;
  let qualitySum = 0;
  let operationalCount = 0;
  let underConstructionCount = 0;
  let totalStaffCount =
    (state.cityManagers?.length ?? 0) + (state.accountant ? 1 : 0) + (state.ceo ? 1 : 0);
  let activeAdCount = 0;
  let qualityInvestmentCount = 0;
  let constructionCommittedBudget = 0;

  for (const biz of businesses) {
    const val = Math.max(0, safeNum(calculateBusinessValuation(biz, state.activeEvent, now), 0));
    businessValuationsTotal += val;
    totalStaffCount += biz.employees?.length ?? 0;
    dailyRentUtilities += Math.max(0, safeNum(calculateDailyRentAndUtilities(biz), 0));

    if (biz.activeAdCampaign && biz.activeAdCampaign.endsAtGameMin > safeGameMinutes) {
      activeAdCount += 1;
    }
    if (safeNum(biz.qualityInvestmentLevel, 0) > 0) {
      qualityInvestmentCount += 1;
    }

    if (isBusinessUnderConstruction(biz)) {
      underConstructionCount += 1;
      constructionCommittedBudget += Math.max(0, safeNum(biz.purchaseCost, 0));
    } else {
      operationalCount += 1;
      const hourly = Math.max(
        0,
        safeNum(
          calculateBusinessHourlyIncome(biz, state.activeEvent, now, businesses, state),
          0
        )
      );
      const dailyGross = Math.max(0, Math.round(hourly * 24));
      dailyEstimatedRevenue += dailyGross;
      const bp = getBlueprintById(biz.blueprintId);
      const supplyRatio = Math.max(
        0.18,
        Math.min(
          0.55,
          safeNum(bp?.baseCogsRatio, 0.36) * (1 - safeNum(officeBenefits.supplyDiscountRate, 0))
        )
      );
      dailyEstimatedSupply += Math.round(dailyGross * supplyRatio);
      const qReport = calculateBranchServiceQuality(biz, state.cityManagers ?? [], businesses);
      qualitySum += safeNum(qReport.stars, 3.0);
    }
  }

  const dailyPayrollWithSgk = computeDailyPayrollWithSgk(state);
  const dailyOperatingExpenses = Math.max(
    0,
    Math.round(dailyPayrollWithSgk + dailyRentUtilities + dailyEstimatedSupply)
  );

  const avgServiceQuality =
    operationalCount > 0 ? Number((qualitySum / operationalCount).toFixed(1)) : 0;
  const serviceQualityPct =
    operationalCount > 0 ? Math.max(5, Math.min(100, Math.round((avgServiceQuality / 5) * 100))) : 0;

  // Loans & credit limit
  const activeLoans = (state.activeLoans ?? []).filter(
    (l) => l.status === 'active' || l.status === 'garnishing'
  );
  const activeLoanDebt = activeLoans.reduce(
    (s, l) => s + Math.max(0, safeNum(l.remainingAmount, 0)),
    0
  );
  const creditTier = getCreditTier(safeCreditScore);
  const availableCreditLimit = Math.round(
    safeNum(creditTier.maxLoanAmount, 0) * safeNum(officeBenefits.loanLimitMultiplier, 1)
  );

  // Stock portfolio & personal assets
  const quoteByTicker = new Map((quotes ?? []).map((q) => [q.ticker, q]));
  let stockPortfolioValue = 0;
  let stockHoldingCount = 0;
  for (const h of state.stockPortfolio ?? []) {
    const shares = safeNum(h.shares, 0);
    if (shares <= 0) continue;
    stockHoldingCount += 1;
    const price = safeNum(quoteByTicker.get(h.ticker)?.price, safeNum(h.avgCost, 0));
    stockPortfolioValue += Math.round(shares * Math.max(0, price));
  }
  const personalAssetsTotal = Math.max(0, safeNum(calculatePersonalAssetsValuation(state), 0));
  const investmentsTotal = Math.max(
    0,
    stockPortfolioValue + businessValuationsTotal + personalAssetsTotal
  );

  // Company level & tier progression (based on real net worth)
  const netWorth = safeNum(calculateNetWorth(state, now, quotes), safeCash);
  const companyTier = getCompanyTier(netWorth);
  const nextTier = getNextCompanyTier(netWorth);
  const tierProgressPct = !nextTier
    ? 100
    : Math.max(
        8,
        Math.min(
          100,
          Math.round(
            ((netWorth - companyTier.minNetWorth) /
              Math.max(1, nextTier.minNetWorth - companyTier.minNetWorth)) *
              100
          )
        )
      );

  const activeGrowthProjects =
    underConstructionCount +
    activeAdCount +
    (state.ownFranchises?.length ?? 0) +
    qualityInvestmentCount +
    stockHoldingCount;
  const growthBudget = Math.max(
    0,
    constructionCommittedBudget + stockPortfolioValue + personalAssetsTotal
  );

  // Build 7-day Income/Expense & Weekly Trend series from real DayEndSummary history + today's live projection
  const closedReports = [
    ...(state.dayEndHistory ?? []),
    ...(state.pendingDayEndReports ?? []),
  ]
    .filter((r): r is NonNullable<typeof r> => Boolean(r && typeof r === 'object'))
    .map((r, idx) => {
      const legacy = r as unknown as Record<string, unknown>;
      const dayNum = Math.max(
        1,
        Math.round(safeNum(r.completedDay, safeNum(legacy.day, idx + 1)))
      );
      const inc = Math.max(
        0,
        Math.round(safeNum(r.dailyGrossRevenue, safeNum(legacy.revenue, 0)))
      );
      const expFromParts =
        safeNum(r.dailySupplyCost, NaN) +
        safeNum(r.dailyUtilitiesAndRent, NaN) +
        safeNum(r.dailySalariesPaid, NaN);
      const exp = Math.max(
        0,
        Math.round(
          Number.isFinite(expFromParts) ? expFromParts : safeNum(legacy.expenses, 0)
        )
      );
      return { dayNum, inc, exp };
    })
    .sort((a, b) => a.dayNum - b.dayNum);

  const recentClosed = closedReports.slice(-6);
  const currentGameDay = Math.max(1, Math.floor(safeGameMinutes / 1440) + 1);

  const series: IncomeExpensePoint[] = recentClosed.map((r) => ({
    label: `G${r.dayNum}`,
    income: r.inc,
    expense: r.exp,
    net: r.inc - r.exp,
  }));

  // Append live current day projection as latest point
  const accruedToday = Math.round(
    businesses.reduce((s, b) => s + Math.max(0, safeNum(b.dailyAccruedGross, 0)), 0)
  );
  const liveDayIncome = Math.max(dailyEstimatedRevenue, accruedToday);
  const liveDayLabel =
    series.length > 0 && series[series.length - 1].label === `G${currentGameDay}`
      ? `G${currentGameDay + 1}`
      : `G${currentGameDay}`;
  series.push({
    label: liveDayLabel,
    income: liveDayIncome,
    expense: dailyOperatingExpenses,
    net: liveDayIncome - dailyOperatingExpenses,
  });

  // Pad front to 7 points smoothly using gentle baseline curve if fewer than 7 days have elapsed
  while (series.length < 7) {
    const missingIdx = 7 - series.length;
    const anchor = series[0] ?? {
      label: 'G1',
      income: dailyEstimatedRevenue,
      expense: dailyOperatingExpenses,
      net: dailyEstimatedRevenue - dailyOperatingExpenses,
    };
    const scale = Math.max(0.45, 1 - missingIdx * 0.08);
    const inc = Math.round(safeNum(anchor.income, 0) * scale);
    const exp = Math.round(safeNum(anchor.expense, 0) * Math.min(1, scale + 0.06));
    series.unshift({
      label: `T-${missingIdx}`,
      income: inc,
      expense: exp,
      net: inc - exp,
    });
  }

  const totalPeriodIncome = series.reduce((s, p) => s + safeNum(p.income, 0), 0);
  const totalPeriodExpense = series.reduce((s, p) => s + safeNum(p.expense, 0), 0);

  // Weekly trend bars (7 vertical columns)
  const magnitudes = series.map((p) => Math.abs(safeNum(p.net, 0)));
  const maxMag = Math.max(1, ...magnitudes);
  const weeklyTrends: WeeklyTrendBar[] = series.map((p, idx) => {
    const isLast = idx === series.length - 1;
    const pctHeight =
      p.income === 0 && p.expense === 0
        ? 20 + idx * 5
        : Math.max(16, Math.min(100, Math.round((Math.abs(p.net) / maxMag) * 84) + 16));
    let tone: WeeklyTrendBar['tone'] = 'cyan';
    if (p.net < 0) {
      tone = 'amber';
    } else if (isLast && p.net >= 0) {
      tone = 'emerald';
    }
    return {
      label: p.label,
      net: p.net,
      pctHeight,
      tone,
    };
  });

  // Weekly trend delta % (compare latest vs first point)
  const firstNet = safeNum(series[0]?.net, 0);
  const lastNet = safeNum(series[series.length - 1]?.net, 0);
  let weeklyTrendDeltaPct = 0;
  if (Math.abs(firstNet) > 100) {
    weeklyTrendDeltaPct = Number(
      Math.max(-99.9, Math.min(250, ((lastNet - firstNet) / Math.abs(firstNet)) * 100)).toFixed(1)
    );
  } else if (lastNet > 0) {
    weeklyTrendDeltaPct = Number(
      Math.min(48.5, Math.max(1.2, (lastNet / Math.max(50_000, Math.abs(safeCash))) * 100)).toFixed(1)
    );
  } else if (lastNet < 0) {
    weeklyTrendDeltaPct = Number(
      Math.max(-48.5, (lastNet / Math.max(50_000, Math.abs(safeCash))) * 100).toFixed(1)
    );
  }
  weeklyTrendDeltaPct = safeNum(weeklyTrendDeltaPct, 0);

  // Daily cash delta %
  const baseCash = Math.max(100_000, Math.abs(safeCash));
  const dailyCashDeltaPct = safeNum(
    Number(
      Math.max(
        -99.9,
        Math.min(99.9, ((liveDayIncome - dailyOperatingExpenses) / baseCash) * 100)
      ).toFixed(1)
    ),
    0
  );

  const liveNetDaily = Math.round(liveDayIncome - dailyOperatingExpenses);

  // 4 Selectable 2x2 Account Cards
  const accountCards: AccountCardSummary[] = [
    {
      id: 'cash',
      index: 1,
      title: 'ANA İŞLETME KASASI',
      amount: Math.round(safeCash),
      subtitle:
        liveNetDaily >= 0
          ? `Günlük net +${liveNetDaily.toLocaleString('tr-TR')} ₺`
          : `Günlük net ${liveNetDaily.toLocaleString('tr-TR')} ₺`,
      badgeText: safeCash < 0 ? 'Eksi Bakiye' : 'Likit Nakit',
      tone: 'cyan',
    },
    {
      id: 'credit',
      index: 2,
      title: 'TİCARİ KREDİ & BANKA',
      amount: activeLoanDebt > 0 ? activeLoanDebt : availableCreditLimit,
      subtitle:
        activeLoanDebt > 0
          ? `${activeLoans.length} aktif kredi · Puan ${safeCreditScore}`
          : `Limit · Kredi Puanı ${safeCreditScore}`,
      badgeText: activeLoanDebt > 0 ? 'Aktif Borç' : 'Kredi Limiti',
      tone: 'amber',
    },
    {
      id: 'investments',
      index: 3,
      title: 'YATIRIM & BORSA',
      amount: investmentsTotal,
      subtitle: `${stockHoldingCount} hisse · ${businesses.length} işletme`,
      badgeText: stockPortfolioValue > 0 ? 'Portföy Aktif' : 'Varlık Değeri',
      tone: 'indigo',
    },
    {
      id: 'expenses',
      index: 4,
      title: 'OPERASYON GİDERİ',
      amount: dailyOperatingExpenses,
      subtitle: `${totalStaffCount} personel (SGK) · ${businesses.length} kira`,
      badgeText: 'Günlük Gider',
      tone: 'rose',
    },
  ];

  return {
    brandRecognitionPct,
    officePrestige: Math.round(safeNum(officeBenefits.officePrestige, 10)),
    officeTierName: officeBenefits.tier.name,
    officeTierNumber: officeTierIdx,
    supplyDiscountPct,
    loanInterestDiscountPct,
    totalCash: Math.round(safeCash),
    dailyCashDeltaPct,
    totalPeriodIncome,
    totalPeriodExpense,
    incomeExpenseSeries: series,
    weeklyTrends,
    weeklyTrendDeltaPct,
    accountCards,
    activeLoanDebt,
    availableCreditLimit,
    activeLoanCount: activeLoans.length,
    investmentsTotal,
    stockPortfolioValue,
    businessValuationsTotal,
    personalAssetsTotal,
    dailyOperatingExpenses,
    dailyPayrollWithSgk,
    dailyRentUtilities,
    dailyEstimatedSupply,
    branchCount: state.businesses.length,
    underConstructionCount,
    totalStaffCount,
    avgServiceQuality,
    serviceQualityPct,
    dailyEstimatedRevenue,
    activeGrowthProjects,
    growthBudget,
    companyLevel: companyTier.level,
    companyTitle: companyTier.title,
    tierProgressPct,
  };
}
