import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBusinessIncomePerSec,
  createInitialEmpireState,
  purchaseBusiness,
  tickEconomy,
} from './economy';
import {
  calculateDailyConditionWear,
  calculateHqBureaucracyDailyCost,
  calculateInflationMarginFactor,
  calculateProgressiveDailyCorporateTax,
  calculateRegionalSaturationFactor,
  calculateStrictCreditLimit,
  claimBoardContractReward,
  ensureBoardContracts,
  executePrestigeIpoExpansion,
  generateRaiseRequestsForDay,
  getBranchManagementEfficiencyCap,
  getConditionPerformanceMultiplier,
  getPrestigeIpoStatus,
  maybeGenerateOperationalCrisis,
  performBranchMaintenance,
  processHardcoreDailySettlement,
  resolveOperationalCrisis,
  resolveRaiseRequest,
  startMegaProject,
  syncBranchMenuPricesToInflation,
  upgradeBranchEquipment,
} from './hardcoreEconomyEngine';
import { computeExecutiveDashboardMetrics } from './dashboardMetrics';
import { resolvePinLocation } from './provinces81';
import type { EmpireState, HiredStaff, PinLocationInfo } from '../types/game';

function landPin(lat: number, lng: number, cityPlate: number): PinLocationInfo {
  const base = resolvePinLocation(lat, lng, cityPlate);
  return {
    ...base,
    isWithinTurkey: true,
    landStatus: 'valid',
    resolvedAddress: 'Merkez, Türkiye',
  };
}

function makeStaff(id: string, role: HiredStaff['role'], dailyWage = 2000): HiredStaff {
  return {
    id,
    name: `Personel ${id}`,
    role,
    roleTitle: role === 'mudur_yardimcisi' ? 'Müdür Yardımcısı' : 'Çalışan',
    stars: 3,
    speed: 75,
    efficiency: 80,
    leadership: 70,
    hireCost: 25_000,
    hourlySalary: Math.round(dailyWage / 8),
    dailyWage,
    dailyEmployerSgk: Math.round(dailyWage * 0.225),
    hiredAt: 1000,
    assignedCityPlate: 34,
  };
}

function openBranches(state: EmpireState): EmpireState {
  return {
    ...state,
    businesses: state.businesses.map((b) => ({ ...b, constructionDaysRemaining: 0 })),
  };
}

test('1. Progressive corporate tax brackets (15/25/35/42%) & HQ bureaucracy overhead from 5th branch', () => {
  const t1 = calculateProgressiveDailyCorporateTax(200_000, 0);
  assert.equal(t1.bracketPct, 15);
  assert.equal(t1.taxAmount, 30_000);

  const t2 = calculateProgressiveDailyCorporateTax(600_000, 0);
  assert.equal(t2.bracketPct, 25);
  assert.equal(t2.taxAmount, 250_000 * 0.15 + 350_000 * 0.25);

  const t3 = calculateProgressiveDailyCorporateTax(2_000_000, 0);
  assert.equal(t3.bracketPct, 35);
  assert.equal(t3.taxAmount, 250_000 * 0.15 + 750_000 * 0.25 + 1_000_000 * 0.35);

  const t4 = calculateProgressiveDailyCorporateTax(6_000_000, 0);
  assert.equal(t4.bracketPct, 42);
  assert.ok(t4.taxAmount > t3.taxAmount);

  // Prestige tier adds +2% tax surcharge
  const t4Prestige = calculateProgressiveDailyCorporateTax(6_000_000, 2);
  assert.equal(t4Prestige.bracketPct, 46);
  assert.ok(t4Prestige.taxAmount > t4.taxAmount);

  // HQ Bureaucracy overhead: 0 up to 4 branches, positive from 5th branch onward
  assert.equal(calculateHqBureaucracyDailyCost(0), 0);
  assert.equal(calculateHqBureaucracyDailyCost(4), 0);
  assert.equal(calculateHqBureaucracyDailyCost(5), 18_500);
  assert.equal(calculateHqBureaucracyDailyCost(7), 55_500);
});

test('2. Branch condition depreciation (2-4%/day), <60% penalty, <25% suspension (0 TL), Bakım Yap & Ekipman Yenile', () => {
  const now = 500_000;
  let state = createInitialEmpireState(now, 34);
  state.cash = 10_000_000;
  const owner = { id: 'p1', name: 'Patron' };
  const built = purchaseBusiness(state, 'kafe', landPin(41.04, 29.01, 34), 'Kondisyon Kafe', owner, [], now);
  assert.equal(built.ok, true);
  state = openBranches(built.state);
  const biz = state.businesses[0];

  const wear = calculateDailyConditionWear(biz);
  assert.ok(wear >= 2.0 && wear <= 4.0, `Expected wear 2..4%, got ${wear}`);

  assert.equal(getConditionPerformanceMultiplier(85), 1.0);
  assert.ok(getConditionPerformanceMultiplier(45) < 0.7 && getConditionPerformanceMultiplier(45) > 0.4);
  assert.equal(getConditionPerformanceMultiplier(24), 0);

  // Branch below 25% condition produces 0 revenue
  const suspendedBiz = { ...biz, maintenanceLevel: 20, suspendedForMaintenance: true };
  assert.equal(calculateBusinessIncomePerSec(suspendedBiz, null, now, [suspendedBiz], state), 0);

  // Bakım Yap restores condition +40% and unsuspends branch
  const maintRes = performBranchMaintenance({ ...state, businesses: [suspendedBiz] }, biz.id);
  assert.equal(maintRes.ok, true);
  assert.equal(maintRes.state.businesses[0].maintenanceLevel, 60);
  assert.equal(maintRes.state.businesses[0].suspendedForMaintenance, false);
  assert.ok(maintRes.state.cash < state.cash);

  // Ekipman Yenile restores 100% condition and raises equipmentLevel
  const eqRes = upgradeBranchEquipment(maintRes.state, biz.id);
  assert.equal(eqRes.ok, true);
  assert.equal(eqRes.state.businesses[0].maintenanceLevel, 100);
  assert.equal(eqRes.state.businesses[0].equipmentLevel, 2);
});

test('3. Unmanaged branch 55% efficiency cap & 15-day staff raise requests (approve vs reject 30% / resign)', () => {
  const now = 600_000;
  let state = createInitialEmpireState(now, 34);
  state.cash = 10_000_000;
  const owner = { id: 'p1', name: 'Patron' };
  const built = purchaseBusiness(state, 'kafe', landPin(41.04, 29.01, 34), 'Kadro Kafe', owner, [], now);
  state = openBranches(built.state);

  // Only a regular worker (no Şube Müdürü / Müdür Yardımcısı) -> capped at 55%
  const workerOnly = {
    ...state.businesses[0],
    employees: [makeStaff('w1', 'calisan', 1800)],
    staffCount: 1,
  };
  assert.equal(getBranchManagementEfficiencyCap(workerOnly, 1).capPct, 55);
  const incUnmanaged = calculateBusinessIncomePerSec(workerOnly, null, now, [workerOnly], state);

  // Adding a Müdür Yardımcısı removes the 55% cap
  const withManager = {
    ...workerOnly,
    employees: [...workerOnly.employees, makeStaff('m1', 'mudur_yardimcisi', 3200)],
    staffCount: 2,
  };
  assert.equal(getBranchManagementEfficiencyCap(withManager, 1).capPct, 100);
  const incManaged = calculateBusinessIncomePerSec(withManager, null, now, [withManager], state);
  assert.ok(incManaged > incUnmanaged * 1.5, 'Managed branch must significantly outperform 55%-capped branch');

  // 15-day raise requests
  const withStaffState: EmpireState = {
    ...state,
    inflationIndex: 1.16,
    businesses: [withManager],
  };
  const requests = generateRaiseRequestsForDay(withStaffState, 15);
  assert.equal(requests.length, 1);

  // Approving increases wage and restores morale
  const approved = resolveRaiseRequest(
    { ...withStaffState, pendingRaiseRequests: requests },
    requests[0].id,
    'approve',
    15
  );
  assert.equal(approved.ok, true);
  assert.ok(
    (approved.state.businesses[0].employees[0].dailyWage ?? 0) > (withManager.employees[0].dailyWage ?? 0)
  );

  // Rejecting applies 5-day 30% efficiency cap (and triggers resignation on low morale/high raise)
  const lowMoraleState: EmpireState = {
    ...withStaffState,
    businesses: [{ ...withManager, staffMorale: 50 }],
    pendingRaiseRequests: requests,
  };
  const rejected = resolveRaiseRequest(lowMoraleState, requests[0].id, 'reject', 15);
  assert.equal(rejected.ok, true);
  assert.equal(rejected.resigned, true);
  assert.equal(getBranchManagementEfficiencyCap(rejected.state.businesses[0], 16).capPct, 30);
});

test('4. Regional saturation, 20-day inflation wave, price sync & random operational crises', () => {
  const now = 700_000;
  let state = createInitialEmpireState(now, 34);
  state.cash = 20_000_000;
  const owner = { id: 'p1', name: 'Patron' };
  const b1 = purchaseBusiness(state, 'kafe', landPin(41.04, 29.01, 34), 'Kafe 1', owner, [], now);
  const b2 = purchaseBusiness(b1.state, 'kafe', landPin(41.05, 29.02, 34), 'Kafe 2', owner, [], now + 5);
  state = openBranches(b2.state);

  const satSingle = calculateRegionalSaturationFactor(state.businesses[0], [state.businesses[0]], 0);
  const satCrowded = calculateRegionalSaturationFactor(state.businesses[0], state.businesses, 0);
  assert.equal(satSingle.multiplier, 1.0);
  assert.ok(satCrowded.multiplier < 0.9, 'Same sector in same city must cause regional saturation');

  // Inflation lag reduces revenue factor until prices are synced
  const inflatedState: EmpireState = { ...state, inflationIndex: 1.25 };
  const lagBefore = calculateInflationMarginFactor(inflatedState.businesses[0], 1.25);
  assert.equal(lagBefore.isLagging, true);
  assert.ok(lagBefore.revenueMultiplier < 0.85);

  const synced = syncBranchMenuPricesToInflation(inflatedState, inflatedState.businesses[0].id);
  assert.equal(synced.ok, true);
  const lagAfter = calculateInflationMarginFactor(synced.state.businesses[0], 1.25);
  assert.equal(lagAfter.isLagging, false);

  // Operational Crisis generation & resolution
  const crisis = maybeGenerateOperationalCrisis(state, 10);
  assert.ok(crisis !== null);
  const resolved = resolveOperationalCrisis(
    { ...state, activeCrisisEvent: crisis },
    crisis!.choices[0].id,
    10
  );
  assert.equal(resolved.ok, true);
  assert.equal(resolved.state.activeCrisisEvent, null);
});

test('5. Negative cash 5% daily late penalty, 3-day automatic foreclosure & strict 7-day credit limit', () => {
  const now = 800_000;
  let state = createInitialEmpireState(now, 34);
  state.cash = 10_000_000;
  const owner = { id: 'p1', name: 'Patron' };
  const b1 = purchaseBusiness(state, 'kafe', landPin(41.04, 29.01, 34), 'Zayıf Şube', owner, [], now);
  const b2 = purchaseBusiness(b1.state, 'restoran', landPin(41.06, 29.03, 34), 'Güçlü Şube', owner, [], now + 5);
  state = openBranches(b2.state);
  state = {
    ...state,
    cash: -100_000,
    negativeCashStreakDays: 2, // 3rd day triggers foreclosure!
    businesses: [
      { ...state.businesses[0], totalEarned: 5_000, level: 1 },
      { ...state.businesses[1], totalEarned: 2_500_000, level: 3 },
    ],
  };

  const settlement = processHardcoreDailySettlement({
    state,
    businesses: state.businesses,
    projectedCashBeforeHardcore: state.cash,
    daysPassed: 1,
    currentDay: 5,
    dailyGrossRevenue: 0,
    dailyNetBeforeTax: -20_000,
  });

  assert.ok(settlement.dailyLatePenalty >= 5_000, '5% daily late penalty must apply to negative cash');
  assert.equal(settlement.foreclosedBranchName, 'Zayıf Şube', 'Lowest-profitability branch must be foreclosed on day 3');
  assert.equal(settlement.businesses.length, 1);
  assert.equal(settlement.foreclosedBranchesCount, 1);
  assert.equal(settlement.negativeCashStreakDays, 0);

  // Strict credit limit scales with 7-day average net profit + collateral - active debt
  const limitZero = calculateStrictCreditLimit({
    ...createInitialEmpireState(now, 34),
    businesses: [],
    dayEndHistory: [],
  });
  assert.equal(limitZero.strictMaxLoan, 0);

  const limitWithProfit = calculateStrictCreditLimit({
    ...state,
    dayEndHistory: [
      {
        id: 'd1',
        completedDay: 1,
        month: 1,
        dayOfMonth: 1,
        dailyGrossRevenue: 500_000,
        dailySupplyCost: 150_000,
        dailyUtilitiesAndRent: 50_000,
        dailySalariesPaid: 50_000,
        dailyNetCashFlow: 250_000,
        manualCollectibleNet: 0,
        autoSettledNet: 250_000,
        creditScoreDelta: 5,
        weeklyDividendPaid: 0,
        monthlyClosing: null,
        branchLines: [],
        collected: true,
      },
    ],
  });
  assert.ok(limitWithProfit.strictMaxLoan >= 250_000 * 18);
});

test('6. Endgame Mega Projects (15-30d), Board Contracts & IPO / New Market Prestige + Dashboard Metrics', () => {
  const now = 900_000;
  let state = createInitialEmpireState(now, 34);
  state.cash = 250_000_000;
  const owner = { id: 'p1', name: 'Holding' };

  // Build 5 branches across 2 cities to trigger HQ bureaucracy (5th branch) & IPO Prestige eligibility
  const coords = [
    landPin(41.01, 29.01, 34),
    landPin(41.05, 29.05, 34),
    landPin(41.09, 29.09, 34),
    landPin(39.92, 32.85, 6),
    landPin(39.95, 32.90, 6),
  ];
  for (let i = 0; i < coords.length; i += 1) {
    const res = purchaseBusiness(state, 'restoran', coords[i], `Şube ${i + 1}`, owner, [], now + i);
    assert.equal(res.ok, true);
    state = res.state;
  }
  state = openBranches(state);

  // Start Mega Project (15 days) and advance 15 days -> completed & paying daily income
  const started = startMegaProject(state, 'lojistik_merkezi', 1);
  assert.equal(started.ok, true);
  assert.equal(started.state.megaProjects?.[0].daysRemaining, 15);
  const doneSettlement = processHardcoreDailySettlement({
    state: started.state,
    businesses: started.state.businesses,
    projectedCashBeforeHardcore: started.state.cash,
    daysPassed: 15,
    currentDay: 16,
    dailyGrossRevenue: 2_000_000,
    dailyNetBeforeTax: 800_000,
  });
  assert.equal(doneSettlement.megaProjects[0].status, 'completed');
  assert.deepEqual(doneSettlement.completedMegaProjectNames, ['Marmara Lojistik Merkezi']);

  // Board Contracts initialization & claiming
  const contracts = ensureBoardContracts(started.state, 1);
  assert.equal(contracts.length, 3);
  const completedContract = { ...contracts[0], status: 'completed' as const, currentProgress: contracts[0].targetValue };
  const claimRes = claimBoardContractReward(
    { ...started.state, boardContracts: [completedContract, contracts[1], contracts[2]] },
    completedContract.id,
    5
  );
  assert.equal(claimRes.ok, true);
  assert.ok(claimRes.state.cash > started.state.cash);

  // IPO / New Market Prestige
  const prestigeCheck = getPrestigeIpoStatus(state, 80_000_000);
  assert.equal(prestigeCheck.eligible, true);
  const prestigeRes = executePrestigeIpoExpansion(state, 80_000_000);
  assert.equal(prestigeRes.ok, true);
  assert.equal(prestigeRes.state.prestigeMarketTier, 1);
  assert.equal(prestigeRes.state.permanentPrestigeBonusPct, 12);

  // Dashboard metrics include progressive tax bracket & HQ bureaucracy overhead for 5 branches
  const metrics = computeExecutiveDashboardMetrics(prestigeRes.state, [], now);
  assert.equal(metrics.dailyHqBureaucracyCost, 18_500);
  assert.ok(metrics.progressiveTaxBracketPct >= 17); // 15% + 2% prestige surcharge

  // End-to-end tickEconomy day rollover updates condition wear & board contracts
  const ticked = tickEconomy(state, 30, now + 30_000);
  assert.equal(ticked.daysPassed, 1);
  assert.ok((ticked.state.businesses[0].maintenanceLevel ?? 100) < 100);
  assert.ok((ticked.state.boardContracts ?? []).length === 3);
});
