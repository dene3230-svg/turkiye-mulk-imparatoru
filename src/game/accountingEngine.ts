import type {
  AccountingBranchRow,
  AccountingReport,
  AccountingSectorBreakdown,
  BusinessTypeId,
  EmpireState,
  StockQuote,
} from '../types/game';
import {
  FACTORY_SUPPLY_DISCOUNT,
  SUPERMARKET_CHAIN_DISCOUNT,
  getBlueprintById,
} from './catalog';
import {
  calculateBusinessHourlyIncome,
  hasFactorySupplySynergy,
} from './economy';
import { resolveBusinessAutomation } from './hrEngine';
import { getChainStatusForBusiness } from './strategyEngine';

/**
 * Pure P&L Accounting & Balance Sheet calculator.
 * Produces itemized hourly revenue, expenses (with Factory/Chain/Manager discounts applied),
 * net profit, margin %, and per-branch profitability ranking.
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

  // Allocate city manager payroll across the branches they oversee for accurate per-branch P&L
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

    // Net operating revenue computed by economy engine (already reflects royalty deduction)
    const netOpHourly = calculateBusinessHourlyIncome(
      biz,
      state.activeEvent,
      now,
      state.businesses,
      state
    );

    // Recover gross revenue before franchise royalty deduction so ledger separates Revenue vs Royalty Expense
    const royaltyRate = biz.franchiseId ? biz.franchiseRoyaltyRate ?? 0.15 : 0;
    const grossHourly =
      royaltyRate > 0 && royaltyRate < 0.9 ? Math.round(netOpHourly / (1 - royaltyRate)) : netOpHourly;
    const royaltyPaid = Math.max(0, grossHourly - netOpHourly);

    hourlyBranchGross += grossHourly;
    hourlyFranchiseRoyaltyPaid += royaltyPaid;

    // Sector aggregation
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

    // Staff payroll for this branch
    const branchStaffPayroll = (biz.employees ?? []).reduce((s, e) => s + e.hourlySalary, 0);
    const sharedCityPayroll =
      (cityPayrollByPlate.get(biz.cityPlate) ?? 0) /
      Math.max(1, cityBranchCountByPlate.get(biz.cityPlate) ?? 1);
    hourlyBranchPayroll += branchStaffPayroll;

    // Supply / COGS cost (baseline ~22% of gross revenue for retail/food/cafe, ~14% for factories, ~6% for parking)
    const supplyRatio =
      bp?.category === 'parking'
        ? 0.05
        : bp?.category === 'factory'
        ? 0.16
        : bp?.category === 'mall' || bp?.category === 'tourism'
        ? 0.14
        : 0.22;
    const supplyGross = Math.round(grossHourly * supplyRatio);

    // Combine discounts: Factory 35%, Supermarket Chain 20%, Cloned Zincir Marka (12-18%), Manager Bulk Supply Discount
    const chainStatus = getChainStatusForBusiness(biz, state.businesses);
    let discountPct = automation.bulkSupplyDiscount + chainStatus.supplyDiscount;
    if (hasFactorySupplySynergy(biz, state.businesses)) {
      discountPct += FACTORY_SUPPLY_DISCOUNT;
    }
    if (biz.blueprintId === 'supermarket' && state.supermarketChain) {
      discountPct += SUPERMARKET_CHAIN_DISCOUNT;
    }
    discountPct = Math.min(0.65, discountPct);

    const discountSaved = Math.round(supplyGross * discountPct);
    const supplyNet = Math.max(0, supplyGross - discountSaved);
    hourlySupplyGross += supplyGross;
    hourlySupplyDiscountSaved += discountSaved;

    // Maintenance & utilities (~7% of gross, reduced to 5.5% under full automation)
    const maintCost = Math.round(grossHourly * (automation.fullAutomation ? 0.055 : 0.075));
    hourlyMaintenanceCost += maintCost;

    const totalBranchExpenses = Math.round(
      branchStaffPayroll + sharedCityPayroll + supplyNet + royaltyPaid + maintCost
    );
    const branchNet = grossHourly - totalBranchExpenses;
    const branchMargin = grossHourly > 0 ? Number(((branchNet / grossHourly) * 100).toFixed(1)) : 0;

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
    });
  }

  const cityManagerTotalPayroll = cityManagers.reduce((s, m) => s + m.hourlySalary, 0);
  const hourlyStaffPayroll = hourlyBranchPayroll + cityManagerTotalPayroll;
  const hourlySupplyNet = Math.max(0, hourlySupplyGross - hourlySupplyDiscountSaved);

  // Franchise royalty income from player-owned franchise brands
  const hourlyFranchiseRoyaltyIncome = Math.round(
    (state.ownFranchises ?? []).reduce((sum, f) => sum + f.branchCount * 420 * f.royaltyRate * 6, 0)
  );

  // Bank interest earnings (estimated hourly yield from player's own bank capital + issued loans)
  const hourlyBankInterestIncome = state.ownBank
    ? Math.round(
        (state.ownBank.poolCapital * state.ownBank.baseInterestRate) / 720 +
          state.ownBank.totalLoansIssued * 1850
      )
    : 0;

  // Stock dividend income (per game hour = 6 real seconds at 1x -> scaled to hourly display)
  const quoteByTicker = new Map(stockQuotes.map((q) => [q.ticker, q]));
  const hourlyStockDividendIncome = Math.round(
    (state.stockPortfolio ?? []).reduce((sum, holding) => {
      const q = quoteByTicker.get(holding.ticker);
      if (!q || holding.shares <= 0) return sum;
      return sum + (holding.shares * q.price * q.dividendYieldAnnual) / 120;
    }, 0)
  );

  // Active loan installment burden (hourly amortized installment)
  const hourlyLoanInstallments = Math.round(
    (state.activeLoans ?? [])
      .filter((l) => l.status === 'active' || l.status === 'garnishing')
      .reduce((sum, l) => sum + l.remainingAmount * 0.08, 0)
  );

  const hourlyTotalRevenue =
    hourlyBranchGross +
    hourlyFranchiseRoyaltyIncome +
    hourlyBankInterestIncome +
    hourlyStockDividendIncome;

  const hourlyTotalExpenses =
    hourlyStaffPayroll +
    hourlySupplyNet +
    hourlyFranchiseRoyaltyPaid +
    hourlyLoanInstallments +
    hourlyMaintenanceCost;

  const hourlyNetProfit = hourlyTotalRevenue - hourlyTotalExpenses;
  const profitMarginPct =
    hourlyTotalRevenue > 0
      ? Number(((hourlyNetProfit / hourlyTotalRevenue) * 100).toFixed(1))
      : 0;

  // Sort branches: highest net profit first
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
    hourlySupplyGross,
    hourlySupplyDiscountSaved,
    hourlySupplyNet,
    hourlyFranchiseRoyaltyPaid,
    hourlyLoanInstallments,
    hourlyMaintenanceCost,
    hourlyTotalExpenses,
    hourlyNetProfit,
    profitMarginPct,
    branches,
  };
}
