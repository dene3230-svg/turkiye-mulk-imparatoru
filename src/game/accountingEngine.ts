import type {
  AccountingBranchRow,
  AccountingReport,
  AccountingSectorBreakdown,
  BusinessTypeId,
  EmpireState,
  StockQuote,
} from '../types/game';
import {
  BANK_LICENSE_COST,
  FACTORY_SUPPLY_DISCOUNT,
  SUPERMARKET_CHAIN_DISCOUNT,
  getBlueprintById,
} from './catalog';
import {
  calculateBusinessHourlyIncome,
  calculateBusinessValuation,
  calculateDailyRentAndUtilities,
  calculateNetWorth,
  hasFactorySupplySynergy,
  isBusinessUnderConstruction,
} from './economy';
import {
  TURKEY_EMPLOYER_SGK_RATE,
  calculateTotalDailyPayrollBreakdown,
  resolveBusinessAutomation,
} from './hrEngine';
import { getChainStatusForBusiness } from './strategyEngine';
import { calculateHourlyTaxBreakdown } from './corporateEngine';
import { calculatePortfolioMarketValue } from './stockMarket';
import { calculateOfficeBenefits, calculatePersonalAssetsValuation } from './officeEngine';

export type AccountingPeriod = 'daily' | 'monthly' | 'annual';

export interface PeriodAccountingSummary {
  period: AccountingPeriod;
  periodLabel: string;
  multiplierHours: number;
  totalRevenue: number;
  branchGross: number;
  passiveIncome: number;
  staffGrossPayroll: number;
  employerSgk: number;
  supplyNet: number;
  supplyDiscountSaved: number;
  rentAndUtilities: number;
  maintenanceCost: number;
  franchiseRoyaltyPaid: number;
  loanInstallments: number;
  kdvTax: number;
  muhtasarStopajTax: number;
  corporateTax: number;
  municipalTax: number;
  totalTaxes: number;
  totalExpenses: number;
  netProfit: number;
  profitMarginPct: number;
  // Annual Balance Sheet snapshot (Aktif / Pasif / Özkaynak)
  totalCashAssets: number;
  totalRealEstateAssets: number;
  totalStockAssets: number;
  totalBankAssets: number;
  totalAssets: number;
  totalLoanLiabilities: number;
  totalTaxLiabilities: number;
  totalLiabilities: number;
  netEquity: number;
}

/**
 * Pure P&L Accounting & Balance Sheet calculator (v1.4.0).
 * Computes realistic Turkish payroll + 22.5% employer SGK, commercial rent/utilities,
 * under-construction costs, supply discounts, and the 4 Turkish tax categories
 * (KDV, Muhtasar/Stopaj, Kurumlar Vergisi, Çevre Temizlik & İlan Reklam).
 */
export function calculateAccountingReport(
  state: EmpireState,
  stockQuotes: StockQuote[] = [],
  now = Date.now()
): AccountingReport {
  const sectorMap = new Map<BusinessTypeId, AccountingSectorBreakdown>();
  const branches: AccountingBranchRow[] = [];

  let hourlyBranchGross = 0;
  let hourlyBranchPayroll = 0;
  let hourlySupplyGross = 0;
  let hourlySupplyDiscountSaved = 0;
  let hourlyFranchiseRoyaltyPaid = 0;
  let hourlyMaintenanceCost = 0;
  let hourlyRentAndUtilities = 0;

  const cityManagers = state.cityManagers ?? [];
  const cityPayrollByPlate = new Map<number, number>();
  for (const m of cityManagers) {
    if (m.assignedCityPlate !== undefined) {
      cityPayrollByPlate.set(
        m.assignedCityPlate,
        (cityPayrollByPlate.get(m.assignedCityPlate) ?? 0) + m.hourlySalary
      );
    }
  }
  const cityBranchCountByPlate = new Map<number, number>();
  for (const b of state.businesses) {
    cityBranchCountByPlate.set(b.cityPlate, (cityBranchCountByPlate.get(b.cityPlate) ?? 0) + 1);
  }

  for (const biz of state.businesses) {
    const bp = getBlueprintById(biz.blueprintId);
    const sectorName = bp?.shortName ?? biz.blueprintId;
    const automation = resolveBusinessAutomation(biz, cityManagers, state.businesses);
    const underConstruction = isBusinessUnderConstruction(biz);

    const netOpHourly = calculateBusinessHourlyIncome(
      biz,
      state.activeEvent,
      now,
      state.businesses,
      state
    );

    const royaltyRate = biz.franchiseId ? biz.franchiseRoyaltyRate ?? 0.15 : 0;
    const grossHourly =
      royaltyRate > 0 && royaltyRate < 0.9
        ? Math.round(netOpHourly / (1 - royaltyRate))
        : netOpHourly;
    const royaltyPaid = Math.max(0, grossHourly - netOpHourly);

    hourlyBranchGross += grossHourly;
    hourlyFranchiseRoyaltyPaid += royaltyPaid;

    const prevSector = sectorMap.get(biz.blueprintId);
    if (prevSector) {
      prevSector.branchCount += 1;
      prevSector.hourlyGross += grossHourly;
    } else {
      sectorMap.set(biz.blueprintId, {
        sectorId: biz.blueprintId,
        sectorName,
        branchCount: 1,
        hourlyGross: grossHourly,
      });
    }

    const branchStaffPayroll = (biz.employees ?? []).reduce((s, e) => s + e.hourlySalary, 0);
    const sharedCityPayroll =
      (cityPayrollByPlate.get(biz.cityPlate) ?? 0) /
      Math.max(1, cityBranchCountByPlate.get(biz.cityPlate) ?? 1);
    hourlyBranchPayroll += branchStaffPayroll;

    const branchHourlySgk = Math.round((branchStaffPayroll + sharedCityPayroll) * TURKEY_EMPLOYER_SGK_RATE);
    const branchHourlyRent = Math.round(calculateDailyRentAndUtilities(biz) / 24);
    hourlyRentAndUtilities += branchHourlyRent;

    const supplyRatio = bp?.baseCogsRatio ?? 0.44;
    const supplyGross = underConstruction ? 0 : Math.round(grossHourly * supplyRatio);

    const chainStatus = getChainStatusForBusiness(biz, state.businesses);
    const officeBenefits = calculateOfficeBenefits(state);
    let discountPct =
      automation.bulkSupplyDiscount +
      chainStatus.supplyDiscount +
      officeBenefits.supplyDiscountRate;
    if (hasFactorySupplySynergy(biz, state.businesses)) {
      discountPct += FACTORY_SUPPLY_DISCOUNT;
    }
    if (biz.blueprintId === 'supermarket' && state.supermarketChain) {
      discountPct += SUPERMARKET_CHAIN_DISCOUNT;
    }
    discountPct = Math.min(0.68, discountPct);

    const discountSaved = Math.round(supplyGross * discountPct);
    const supplyNet = Math.max(0, supplyGross - discountSaved);
    hourlySupplyGross += supplyGross;
    hourlySupplyDiscountSaved += discountSaved;

    const maintCost = underConstruction
      ? 0
      : Math.round(grossHourly * (automation.fullAutomation ? 0.035 : 0.05));
    hourlyMaintenanceCost += maintCost;

    const totalBranchExpenses = Math.round(
      branchStaffPayroll +
        sharedCityPayroll +
        branchHourlySgk +
        branchHourlyRent +
        supplyNet +
        royaltyPaid +
        maintCost
    );
    const branchNet = grossHourly - totalBranchExpenses;
    const branchMargin =
      grossHourly > 0 ? Number(((branchNet / grossHourly) * 100).toFixed(1)) : underConstruction ? -100 : 0;

    branches.push({
      businessId: biz.id,
      name: biz.customName,
      cityLabel: `${String(biz.cityPlate).padStart(2, '0')} ${biz.cityName}`,
      sectorName,
      level: biz.level,
      hourlyGross: grossHourly,
      hourlyExpenses: totalBranchExpenses,
      hourlyNet: branchNet,
      marginPct: branchMargin,
      autoCollectActive: automation.autoCollectRevenue,
      underConstruction,
      constructionDaysRemaining: biz.constructionDaysRemaining ?? 0,
      hourlyRentAndUtilities: branchHourlyRent,
    });
  }

  const cityManagerTotalPayroll = cityManagers.reduce((s, m) => s + m.hourlySalary, 0);
  const corporatePayroll =
    (state.accountant?.hourlySalary ?? 0) + (state.ceo?.hourlySalary ?? 0);
  const hourlyStaffPayroll = hourlyBranchPayroll + cityManagerTotalPayroll + corporatePayroll;

  // Employer SGK premium (22.5%) computed from Turkey payroll breakdown
  const dailyPayrollInfo = calculateTotalDailyPayrollBreakdown(state);
  const hourlyEmployerSgk = Math.round(dailyPayrollInfo.dailyEmployerSgk / 24);
  const hourlySupplyNet = Math.max(0, hourlySupplyGross - hourlySupplyDiscountSaved);

  const hourlyFranchiseRoyaltyIncome = Math.round(
    (state.ownFranchises ?? []).reduce((sum, f) => sum + f.branchCount * 420 * f.royaltyRate * 6, 0)
  );

  const hourlyBankInterestIncome = state.ownBank
    ? Math.round(
        (state.ownBank.poolCapital * state.ownBank.baseInterestRate) / 720 +
          state.ownBank.totalLoansIssued * 1850
      )
    : 0;

  const quoteByTicker = new Map(stockQuotes.map((q) => [q.ticker, q]));
  const hourlyStockDividendIncome = Math.round(
    (state.stockPortfolio ?? []).reduce((sum, holding) => {
      const q = quoteByTicker.get(holding.ticker);
      if (!q || holding.shares <= 0) return sum;
      return sum + (holding.shares * q.price * q.dividendYieldAnnual) / 120;
    }, 0)
  );

  const hourlyLoanInstallments = Math.round(
    (state.activeLoans ?? [])
      .filter((l) => l.status === 'active' || l.status === 'garnishing')
      .reduce((sum, l) => {
        const monthly = l.monthlyInstallment ?? Math.round(l.remainingAmount / 6);
        return sum + Math.round(monthly / 720);
      }, 0)
  );

  const hourlyTotalRevenue =
    hourlyBranchGross +
    hourlyFranchiseRoyaltyIncome +
    hourlyBankInterestIncome +
    hourlyStockDividendIncome;

  const operatingExpensesBeforeTax =
    hourlyStaffPayroll +
    hourlyEmployerSgk +
    hourlySupplyNet +
    hourlyRentAndUtilities +
    hourlyFranchiseRoyaltyPaid +
    hourlyLoanInstallments +
    hourlyMaintenanceCost;

  const estimatedNetWorth = calculateNetWorth(state, now, stockQuotes);
  const { rates: taxRates, breakdown: taxBreakdown } = calculateHourlyTaxBreakdown({
    hourlyGrossRevenue: hourlyTotalRevenue,
    hourlyPayroll: hourlyStaffPayroll,
    hourlyOperatingExpensesBeforeTax: operatingExpensesBeforeTax,
    hourlyRentAndUtilities,
    branchCount: state.businesses.length,
    netWorth: estimatedNetWorth,
    accountant: state.accountant,
  });

  const hourlyTotalExpenses = operatingExpensesBeforeTax + taxBreakdown.totalTax;
  const hourlyNetProfit = hourlyTotalRevenue - hourlyTotalExpenses;
  const profitMarginPct =
    hourlyTotalRevenue > 0
      ? Number(((hourlyNetProfit / hourlyTotalRevenue) * 100).toFixed(1))
      : 0;

  branches.sort((a, b) => b.hourlyNet - a.hourlyNet);

  const hourlySectorBreakdown = Array.from(sectorMap.values()).sort(
    (a, b) => b.hourlyGross - a.hourlyGross
  );

  return {
    hourlyBranchGross,
    hourlySectorBreakdown,
    hourlyFranchiseRoyaltyIncome,
    hourlyBankInterestIncome,
    hourlyStockDividendIncome,
    hourlyTotalRevenue,
    hourlyStaffPayroll,
    hourlyEmployerSgk,
    hourlySupplyGross,
    hourlySupplyDiscountSaved,
    hourlySupplyNet,
    hourlyRentAndUtilities,
    hourlyFranchiseRoyaltyPaid,
    hourlyLoanInstallments,
    hourlyMaintenanceCost,
    taxRates,
    hourlyKdvTax: taxBreakdown.kdv,
    hourlySgkTax: taxBreakdown.sgkStopaj,
    hourlyCorporateTax: taxBreakdown.corporateTax,
    hourlyMunicipalTax: taxBreakdown.municipalTax,
    hourlyTotalTaxes: taxBreakdown.totalTax,
    hourlyTotalExpenses,
    hourlyNetProfit,
    profitMarginPct,
    branches,
  };
}

/**
 * Scales the AccountingReport into Daily (24h), Monthly (30d = 720h), or Annual (360d = 8640h)
 * Turkish financial statements + Balance Sheet snapshot.
 */
export function buildPeriodAccountingSummary(
  report: AccountingReport,
  period: AccountingPeriod,
  state: EmpireState,
  stockQuotes: StockQuote[] = [],
  now = Date.now()
): PeriodAccountingSummary {
  const multiplierHours = period === 'daily' ? 24 : period === 'monthly' ? 720 : 8640;
  const periodLabel =
    period === 'daily'
      ? 'Gün Sonu Raporu (24 Saat)'
      : period === 'monthly'
      ? 'Ay Sonu Raporu (30 Gün)'
      : 'Yıl Sonu Bilanço Raporu (360 Gün)';

  const totalRevenue = Math.round(report.hourlyTotalRevenue * multiplierHours);
  const branchGross = Math.round(report.hourlyBranchGross * multiplierHours);
  const passiveIncome = Math.round(
    (report.hourlyFranchiseRoyaltyIncome +
      report.hourlyBankInterestIncome +
      report.hourlyStockDividendIncome) *
      multiplierHours
  );
  const staffGrossPayroll = Math.round(report.hourlyStaffPayroll * multiplierHours);
  const employerSgk = Math.round(report.hourlyEmployerSgk * multiplierHours);
  const supplyNet = Math.round(report.hourlySupplyNet * multiplierHours);
  const supplyDiscountSaved = Math.round(report.hourlySupplyDiscountSaved * multiplierHours);
  const rentAndUtilities = Math.round(report.hourlyRentAndUtilities * multiplierHours);
  const maintenanceCost = Math.round(report.hourlyMaintenanceCost * multiplierHours);
  const franchiseRoyaltyPaid = Math.round(report.hourlyFranchiseRoyaltyPaid * multiplierHours);
  const loanInstallments = Math.round(report.hourlyLoanInstallments * multiplierHours);

  const kdvTax = Math.round(report.hourlyKdvTax * multiplierHours);
  const muhtasarStopajTax = Math.round(report.hourlySgkTax * multiplierHours);
  const corporateTax = Math.round(report.hourlyCorporateTax * multiplierHours);
  const municipalTax = Math.round(report.hourlyMunicipalTax * multiplierHours);
  const totalTaxes = kdvTax + muhtasarStopajTax + corporateTax + municipalTax;

  const totalExpenses =
    staffGrossPayroll +
    employerSgk +
    supplyNet +
    rentAndUtilities +
    maintenanceCost +
    franchiseRoyaltyPaid +
    loanInstallments +
    totalTaxes;
  const netProfit = totalRevenue - totalExpenses;
  const profitMarginPct =
    totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

  // Balance Sheet Assets & Liabilities
  const totalCashAssets = Math.round(state.cash);
  const totalRealEstateAssets = state.businesses.reduce(
    (s, b) => s + calculateBusinessValuation(b, state.activeEvent, now),
    0
  );
  const totalStockAssets = stockQuotes.length
    ? calculatePortfolioMarketValue(state, stockQuotes)
    : (state.stockPortfolio ?? []).reduce((s, h) => s + Math.round(h.shares * h.avgCost), 0);
  const totalBankAssets = state.ownBank
    ? Math.round(state.ownBank.poolCapital + BANK_LICENSE_COST)
    : 0;
  const totalPersonalAssets = calculatePersonalAssetsValuation(state);
  const totalAssets =
    totalCashAssets +
    totalRealEstateAssets +
    totalStockAssets +
    totalBankAssets +
    totalPersonalAssets;

  const totalLoanLiabilities = (state.activeLoans ?? [])
    .filter((l) => l.status === 'active' || l.status === 'garnishing')
    .reduce((s, l) => s + l.remainingAmount, 0);
  const totalTaxLiabilities = (state.pendingTaxes ?? [])
    .filter((t) => t.status !== 'paid')
    .reduce((s, t) => s + t.amount, 0);
  const totalLiabilities = totalLoanLiabilities + totalTaxLiabilities;
  const netEquity = totalAssets - totalLiabilities;

  return {
    period,
    periodLabel,
    multiplierHours,
    totalRevenue,
    branchGross,
    passiveIncome,
    staffGrossPayroll,
    employerSgk,
    supplyNet,
    supplyDiscountSaved,
    rentAndUtilities,
    maintenanceCost,
    franchiseRoyaltyPaid,
    loanInstallments,
    kdvTax,
    muhtasarStopajTax,
    corporateTax,
    municipalTax,
    totalTaxes,
    totalExpenses,
    netProfit,
    profitMarginPct,
    totalCashAssets,
    totalRealEstateAssets,
    totalStockAssets,
    totalBankAssets,
    totalAssets,
    totalLoanLiabilities,
    totalTaxLiabilities,
    totalLiabilities,
    netEquity,
  };
}
