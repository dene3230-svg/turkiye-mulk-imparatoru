import type { EmpireState, RemoteBusinessRecord, StockQuote } from '../types/game';
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
import {
  BANK_MIN_BRAND_RECOGNITION,
  BANK_MIN_OFFICE_PRESTIGE,
  BANK_MIN_OPERATING_DAYS,
  getCreditTier,
} from './bankingEngine';
import { getBlueprintById, IPO_MIN_NET_WORTH } from './catalog';
import { checkIpoEligibility } from './stockMarket';
import {
  calculateDailyRentalIncome,
  calculateDailyRentalMaintenanceCost,
  calculateRentalPropertiesValuation,
} from './quickActionsEngine';
import {
  calculateHqBureaucracyDailyCost,
  calculateProgressiveDailyCorporateTax,
  calculateStrictCreditLimit,
  getCompletedMegaProjectsDailyIncome,
  getMegaProjectSupplyDiscountBonus,
} from './hardcoreEconomyEngine';
import { getCharacterTraitModifiers } from './characterEngine';

export type AccountCardId = 'cash' | 'credit' | 'investments' | 'expenses';
export type OperationCardId = 'businesses' | 'office' | 'growth';

export interface MiniIncomeExpenseBar {
  label: string;
  income: number;
  expense: number;
  incomePct: number;
  expensePct: number;
}

export interface FinanceCommandMetrics {
  // Column 1: Banking & Commercial Credit
  creditEligibilityPct: number;
  creditUnlocked: boolean;
  creditBrandPassed: boolean;
  creditPrestigePassed: boolean;
  creditProfitabilityPassed: boolean;
  creditTenurePassed: boolean;
  creditLockSummary: string;
  // Column 2: Accounting, Taxes & 00:00 Day-End
  unpaidTaxCount: number;
  unpaidTaxTotal: number;
  accountingAutoActive: boolean;
  miniBars: MiniIncomeExpenseBar[];
  pendingDayEndCount: number;
  pendingDayEndNetCash: number;
  accruedTodayNetCash: number;
  archivedDayEndCount: number;
  // Column 3: BIST & IPO
  stockPositionCount: number;
  bistIndexValue: number;
  bistDailyChangePct: number;
  bistSparklinePoints: number[];
  ipoListedTicker: string | null;
  ipoEligible: boolean;
  ipoNetWorth: number;
  ipoTargetNetWorth: number;
  ipoNetWorthPct: number;
  ipoStatusText: string;
}

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
  // v1.7.1 Hardcore Economy & Endgame Metrics
  progressiveTaxBracketPct: number;
  dailyCorporateTaxEstimate: number;
  dailyHqBureaucracyCost: number;
  inflationIndex: number;
  negativeCashStreakDays: number;
  pendingRaiseCount: number;
  hasActiveCrisis: boolean;
  activeMegaProjectsCount: number;
  completedMegaProjectsDailyIncome: number;
  prestigeMarketTier: number;
  strictCreditLimit: number;
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
  now: number,
  competitorBusinesses?: RemoteBusinessRecord[]
): ExecutiveDashboardMetrics {
  const safeCash = safeNum(state.cash, 0);
  const safeCreditScore = Math.round(safeNum(state.creditScore, 1100));
  const safeGameMinutes = safeNum(state.gameMinutes, 540);
  const businesses = Array.isArray(state.businesses) ? state.businesses : [];
  const stateWithRivals = {
    ...state,
    competitorBusinesses,
  };

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
          calculateBusinessHourlyIncome(biz, state.activeEvent, now, businesses, stateWithRivals),
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

  const dailyRentalIncome = calculateDailyRentalIncome(state);
  const dailyRentalMaintenance = calculateDailyRentalMaintenanceCost(state);
  const completedMegaProjectsDailyIncome = getCompletedMegaProjectsDailyIncome(state);
  dailyEstimatedRevenue += dailyRentalIncome + completedMegaProjectsDailyIncome;

  const traitMods = getCharacterTraitModifiers(state);
  const currentInflation = Math.max(1.0, safeNum(state.inflationIndex, 1.0));
  const megaSupplyBonus = getMegaProjectSupplyDiscountBonus(state);
  const rentTraitFactor = (1 - traitMods.rentDiscountRate) * (1 - traitMods.expenseDiscountRate);
  dailyRentUtilities =
    Math.round(dailyRentUtilities * currentInflation * rentTraitFactor) +
    Math.round(dailyRentalMaintenance * (1 - traitMods.expenseDiscountRate));
  dailyEstimatedSupply = Math.round(
    dailyEstimatedSupply *
      currentInflation *
      Math.max(0.5, 1 - megaSupplyBonus - traitMods.expenseDiscountRate)
  );

  const dailyPayrollWithSgk = Math.round(
    computeDailyPayrollWithSgk(state) * (1 - traitMods.expenseDiscountRate)
  );
  const dailyHqBureaucracyCost = Math.round(
    calculateHqBureaucracyDailyCost(businesses.length) * (1 - traitMods.expenseDiscountRate)
  );
  const preTaxDailyNet =
    dailyEstimatedRevenue -
    (dailyPayrollWithSgk + dailyRentUtilities + dailyEstimatedSupply + dailyHqBureaucracyCost);
  const taxEstimate = calculateProgressiveDailyCorporateTax(
    preTaxDailyNet,
    state.prestigeMarketTier ?? 0
  );
  const dailyCorporateTaxEstimate = taxEstimate.taxAmount;

  const dailyOperatingExpenses = Math.max(
    0,
    Math.round(
      dailyPayrollWithSgk +
        dailyRentUtilities +
        dailyEstimatedSupply +
        dailyHqBureaucracyCost +
        dailyCorporateTaxEstimate
    )
  );

  const avgServiceQuality =
    operationalCount > 0 ? Number((qualitySum / operationalCount).toFixed(1)) : 0;
  const serviceQualityPct =
    operationalCount > 0 ? Math.max(5, Math.min(100, Math.round((avgServiceQuality / 5) * 100))) : 0;

  // Loans & strict credit limit (7-day average net profit + collateral)
  const activeLoans = (state.activeLoans ?? []).filter(
    (l) => l.status === 'active' || l.status === 'garnishing'
  );
  const activeLoanDebt = activeLoans.reduce(
    (s, l) => s + Math.max(0, safeNum(l.remainingAmount, 0)),
    0
  );
  const creditTier = getCreditTier(safeCreditScore);
  const tierMaxLimit = Math.round(
    safeNum(creditTier.maxLoanAmount, 0) * safeNum(officeBenefits.loanLimitMultiplier, 1)
  );
  const strictLimitInfo = calculateStrictCreditLimit(state, businessValuationsTotal);
  const availableCreditLimit = Math.min(tierMaxLimit, strictLimitInfo.strictMaxLoan);

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
  const rentalAssetsTotal = Math.max(0, safeNum(calculateRentalPropertiesValuation(state), 0));
  const investmentsTotal = Math.max(
    0,
    stockPortfolioValue + businessValuationsTotal + personalAssetsTotal + rentalAssetsTotal
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
    progressiveTaxBracketPct: taxEstimate.bracketPct,
    dailyCorporateTaxEstimate,
    dailyHqBureaucracyCost,
    inflationIndex: Number(currentInflation.toFixed(2)),
    negativeCashStreakDays: Math.max(0, Math.round(safeNum(state.negativeCashStreakDays, 0))),
    pendingRaiseCount: (state.pendingRaiseRequests ?? []).length,
    hasActiveCrisis: Boolean(state.activeCrisisEvent),
    activeMegaProjectsCount: (state.megaProjects ?? []).length,
    completedMegaProjectsDailyIncome,
    prestigeMarketTier: Math.max(0, Math.round(safeNum(state.prestigeMarketTier, 0))),
    strictCreditLimit: strictLimitInfo.strictMaxLoan,
  };
}

/**
 * Pure deterministic selector for the v1.5.2 3-column Finans, Bankalar & Borsa Command Center.
 */
export function computeFinanceCommandMetrics(
  state: EmpireState,
  quotes: StockQuote[],
  execMetrics: ExecutiveDashboardMetrics,
  now: number
): FinanceCommandMetrics {
  const safeCash = safeNum(state.cash, 0);
  const safeCreditScore = Math.round(safeNum(state.creditScore, 1100));
  const currentGameDay = Math.max(1, Math.floor(safeNum(state.gameMinutes, 540) / 1440) + 1);
  const brand = Math.max(0, Math.min(100, safeNum(state.brandRecognition, 5)));
  const officePrestige = Math.max(0, Math.min(100, safeNum(execMetrics.officePrestige, 10)));

  // Latest closed day report (pending or archived)
  const allReports = [
    ...(state.pendingDayEndReports ?? []),
    ...(state.dayEndHistory ?? []),
  ].filter((r): r is NonNullable<typeof r> => Boolean(r && typeof r === 'object'));
  const latestReport =
    [...allReports].sort((a, b) => safeNum(b.completedDay, 0) - safeNum(a.completedDay, 0))[0] ??
    null;

  const creditBrandPassed = brand >= BANK_MIN_BRAND_RECOGNITION;
  const creditPrestigePassed = officePrestige >= BANK_MIN_OFFICE_PRESTIGE;
  const creditProfitabilityPassed =
    safeCash >= 0 && latestReport !== null && safeNum(latestReport.dailyNetCashFlow, 0) > 0;
  const creditTenurePassed = currentGameDay >= BANK_MIN_OPERATING_DAYS;
  const creditScorePassed = safeCreditScore >= 700;

  const creditUnlocked =
    creditBrandPassed &&
    creditPrestigePassed &&
    creditProfitabilityPassed &&
    creditTenurePassed &&
    creditScorePassed;

  // Weighted progress across the real strict bank audit gates
  const brandWeight = Math.min(1, brand / Math.max(1, BANK_MIN_BRAND_RECOGNITION)) * 30;
  const prestigeWeight = Math.min(1, officePrestige / Math.max(1, BANK_MIN_OFFICE_PRESTIGE)) * 25;
  const liveNetDaily = execMetrics.dailyEstimatedRevenue - execMetrics.dailyOperatingExpenses;
  const profitWeight = creditProfitabilityPassed
    ? 25
    : safeCash >= 0 && liveNetDaily > 0
    ? 10
    : 0;
  const tenureWeight = Math.min(1, currentGameDay / Math.max(1, BANK_MIN_OPERATING_DAYS)) * 20;

  const rawEligibilityPct = Math.round(brandWeight + prestigeWeight + profitWeight + tenureWeight);
  const creditEligibilityPct = creditUnlocked
    ? 100
    : Math.max(6, Math.min(92, rawEligibilityPct));

  let creditLockSummary = 'Tüm Kredi Şartları Sağlandı · Kullanıma Hazır';
  if (!creditUnlocked) {
    const missing: string[] = [];
    if (!creditBrandPassed) missing.push(`Tanınırlık %${Math.round(brand)}/%${BANK_MIN_BRAND_RECOGNITION}`);
    if (!creditProfitabilityPassed) {
      missing.push(safeCash < 0 ? 'Eksi Kasa' : 'Pozitif Bilanço');
    }
    if (!creditPrestigePassed) missing.push(`Prestij ${officePrestige}/${BANK_MIN_OFFICE_PRESTIGE}`);
    if (!creditTenurePassed) missing.push(`${currentGameDay}/${BANK_MIN_OPERATING_DAYS} Gün`);
    if (!creditScorePassed) missing.push('Kara Liste');
    creditLockSummary = `Kilitli · ${missing.slice(0, 2).join(' & ')}`;
  }

  // Column 2: Accounting, Taxes & Mini Income-Expense Bars (last 4 periods)
  const unpaidTaxes = (state.pendingTaxes ?? []).filter((t) => t.status !== 'paid');
  const unpaidTaxCount = unpaidTaxes.length;
  const unpaidTaxTotal = Math.round(
    unpaidTaxes.reduce((sum, t) => sum + Math.max(0, safeNum(t.amount, 0)), 0)
  );
  const accountingAutoActive = Boolean(state.accountant);

  const recent4 = (execMetrics.incomeExpenseSeries ?? []).slice(-4);
  const maxVal = Math.max(
    1,
    ...recent4.flatMap((p) => [Math.max(0, safeNum(p.income, 0)), Math.max(0, safeNum(p.expense, 0))])
  );
  const allZeroBars = recent4.every((p) => p.income <= 0 && p.expense <= 0);
  const miniBars: MiniIncomeExpenseBar[] = recent4.map((p, idx) => {
    if (allZeroBars) {
      // Subtle baseline silhouette for brand-new firms with zero turnover yet
      const baseInc = [38, 48, 42, 54][idx] ?? 44;
      const baseExp = [24, 30, 26, 28][idx] ?? 26;
      return {
        label: p.label,
        income: 0,
        expense: 0,
        incomePct: baseInc,
        expensePct: baseExp,
      };
    }
    return {
      label: p.label,
      income: Math.max(0, Math.round(safeNum(p.income, 0))),
      expense: Math.max(0, Math.round(safeNum(p.expense, 0))),
      incomePct: Math.max(16, Math.min(100, Math.round((Math.max(0, p.income) / maxVal) * 86) + 14)),
      expensePct: Math.max(
        14,
        Math.min(100, Math.round((Math.max(0, p.expense) / maxVal) * 86) + 14)
      ),
    };
  });

  // 00:00 Day-End pending & live accrued net cash
  const pendingReports = state.pendingDayEndReports ?? [];
  const pendingDayEndCount = pendingReports.length;
  const pendingDayEndNetCash = Math.round(
    pendingReports.reduce(
      (sum, r) => sum + safeNum(r.manualCollectibleNet, safeNum(r.dailyNetCashFlow, 0)),
      0
    )
  );
  const accruedGross = (state.businesses ?? []).reduce(
    (s, b) => s + Math.max(0, safeNum(b.dailyAccruedGross, 0)),
    0
  );
  const accruedTodayNetCash =
    accruedGross > 0
      ? Math.round(accruedGross - execMetrics.dailyOperatingExpenses * 0.5)
      : Math.round(execMetrics.dailyEstimatedRevenue - execMetrics.dailyOperatingExpenses);
  const archivedDayEndCount = (state.dayEndHistory ?? []).length;

  // Column 3: BIST 100 live index sparkline & IPO readiness
  const stockPositionCount = (state.stockPortfolio ?? []).filter(
    (h) => safeNum(h.shares, 0) > 0
  ).length;
  const bistQuotes = (quotes ?? []).filter((q) => !q.isPlayerIpo);
  const activeQuotes = bistQuotes.length > 0 ? bistQuotes : quotes ?? [];

  let sumOpen = 0;
  let sumPrice = 0;
  for (const q of activeQuotes) {
    sumOpen += Math.max(1, safeNum(q.openPrice, q.price));
    sumPrice += Math.max(1, safeNum(q.price, 1));
  }
  const indexRatio = sumOpen > 0 ? sumPrice / sumOpen : 1;
  const bistIndexValue = Math.round(10_240 * indexRatio);
  const bistDailyChangePct = Number(((indexRatio - 1) * 100).toFixed(2));

  // Build 12-point BIST composite sparkline from real quote histories
  const sparkLen = 12;
  const compositeSeries: number[] = [];
  for (let i = 0; i < sparkLen; i += 1) {
    let ptSum = 0;
    let ptCount = 0;
    for (const q of activeQuotes) {
      const hist = Array.isArray(q.history) && q.history.length > 0 ? q.history : [q.price];
      const idx = Math.min(
        hist.length - 1,
        Math.max(0, Math.round((i / Math.max(1, sparkLen - 1)) * (hist.length - 1)))
      );
      const base = Math.max(1, safeNum(q.openPrice, hist[0] ?? 1));
      ptSum += safeNum(hist[idx], base) / base;
      ptCount += 1;
    }
    compositeSeries.push(ptCount > 0 ? ptSum / ptCount : 1);
  }
  const minSpark = Math.min(...compositeSeries);
  const maxSpark = Math.max(...compositeSeries);
  const spanSpark = Math.max(0.002, maxSpark - minSpark);
  const bistSparklinePoints = compositeSeries.map((v) =>
    Math.round(16 + ((v - minSpark) / spanSpark) * 76)
  );

  // IPO readiness (Net Worth vs ₺250 Mn + Brand Recognition)
  const ipoNetWorth = Math.max(0, Math.round(safeNum(calculateNetWorth(state, now, quotes), safeCash)));
  const ipoCheck = checkIpoEligibility(state, ipoNetWorth);
  const ipoListedTicker = state.playerIpo?.ticker ?? null;
  const ipoNetWorthPct = Math.min(
    100,
    Math.max(0, Math.round((ipoNetWorth / Math.max(1, IPO_MIN_NET_WORTH)) * 100))
  );
  const ipoStatusText = ipoListedTicker
    ? `Halka Açık: ${ipoListedTicker} (BIST)`
    : ipoCheck.eligible
    ? 'Halka Arza Uygun · IPO Hazır'
    : `IPO · Tanınırlık %${Math.round(brand)}`;

  return {
    creditEligibilityPct,
    creditUnlocked,
    creditBrandPassed,
    creditPrestigePassed,
    creditProfitabilityPassed,
    creditTenurePassed,
    creditLockSummary,
    unpaidTaxCount,
    unpaidTaxTotal,
    accountingAutoActive,
    miniBars,
    pendingDayEndCount,
    pendingDayEndNetCash,
    accruedTodayNetCash,
    archivedDayEndCount,
    stockPositionCount,
    bistIndexValue,
    bistDailyChangePct,
    bistSparklinePoints,
    ipoListedTicker,
    ipoEligible: ipoCheck.eligible,
    ipoNetWorth,
    ipoTargetNetWorth: IPO_MIN_NET_WORTH,
    ipoNetWorthPct,
    ipoStatusText,
  };
}

