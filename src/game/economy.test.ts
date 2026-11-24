import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUSINESS_BLUEPRINTS,
  COMPANY_TIERS,
  MIN_BUSINESS_DISTANCE_METERS,
  STARTING_CREDIT_SCORE,
} from './catalog.ts';
import {
  STARTING_GAME_MINUTES,
  calculateBusinessCapacity,
  calculateBusinessIncomePerSec,
  calculateNetWorth,
  calculateTakeoverPrice,
  checkMinDistance75m,
  claimMissionReward,
  createInitialEmpireState,
  formatGameClock,
  getCompanyTier,
  hasAvmSynergyForBusiness,
  hasFactorySupplySynergy,
  hasParkingSynergyForBusiness,
  purchaseBusiness,
  takeoverCompetitorBusiness,
  tickEconomy,
} from './economy.ts';
import { calculateAccountingReport } from './accountingEngine.ts';
import { ACTIVE_MISSION_SLOTS, ensureDynamicMissions } from './missionEngine.ts';
import {
  GEOGRAPHIC_REGIONS,
  TURKEY_PROVINCES,
  getProvinceByPlate,
  resolvePinLocation,
} from './provinces81.ts';
import { checkLocalWaterShield, evaluateNominatimReverse } from './waterShield.ts';
import {
  generateCandidatePool,
  hireCandidateFromPool,
  resolveBusinessAutomation,
} from './hrEngine.ts';
import {
  SEED_FRANCHISE_BRANDS,
  createFranchiseBrand,
  formSupermarketChain,
} from './holdingEngine.ts';
import {
  INITIAL_BIST_QUOTES,
  buyStockShares,
  checkIpoEligibility,
  createInitialStockQuotes,
  launchPlayerIpo,
  sellStockShares,
} from './stockMarket.ts';
import {
  DEFAULT_SYSTEM_BANKS,
  calculateEffectiveInterestRate,
  calculateRequiredCollateral,
  createPlayerBank,
  enforceOverdueLoans,
  getCreditTier,
  repayLoan,
  takeLoanFromBank,
} from './bankingEngine.ts';
import { APP_VERSION, compareSemver } from '../services/otaUpdate.ts';
import type { PinLocationInfo, RemoteBusinessRecord } from '../types/game.ts';

function landPin(lat: number, lng: number, plate = 34): PinLocationInfo {
  const base = resolvePinLocation(lat, lng, plate);
  return {
    ...base,
    isWithinTurkey: true,
    landStatus: 'valid',
    resolvedAddress: 'Beşiktaş, İstanbul, Türkiye',
  };
}

test('all 81 Turkish provinces (01 Adana - 81 Düzce) and 7 regions are defined completely', () => {
  assert.equal(TURKEY_PROVINCES.length, 81);
  assert.equal(GEOGRAPHIC_REGIONS.length, 7);
  assert.equal(getProvinceByPlate(1).name, 'Adana');
  assert.equal(getProvinceByPlate(32).name, 'Isparta');
  assert.equal(getProvinceByPlate(34).name, 'İstanbul');
  assert.equal(getProvinceByPlate(81).name, 'Düzce');
});

test('all 13 business sectors exist including Parking and 3 Factories', () => {
  const ids = BUSINESS_BLUEPRINTS.map((b) => b.id);
  assert.equal(ids.length, 13);
  for (const expected of [
    'kafe',
    'internet_kafe',
    'ps_salonu',
    'oyun_merkezi',
    'restoran',
    'supermarket',
    'otel',
    'avm',
    'otopark',
    'katli_otopark',
    'gida_fabrikasi',
    'elektronik_fabrikasi',
    'tekstil_fabrikasi',
  ]) {
    assert.ok(ids.includes(expected as typeof ids[number]), `Missing sector ${expected}`);
  }
  assert.equal(COMPANY_TIERS[0].maxBranches, 3);
});

test('water shield blocks seas, straits, and major Turkish lakes while allowing Turkish land', () => {
  assert.equal(checkLocalWaterShield(41.045, 29.04)?.isLand, false); // Bosphorus
  assert.equal(checkLocalWaterShield(40.72, 28.45)?.isLand, false); // Marmara
  assert.equal(checkLocalWaterShield(38.62, 42.95)?.isLand, false); // Van Gölü
  assert.equal(checkLocalWaterShield(41.0422, 29.0067), null); // Beşiktaş land

  const seaResult = evaluateNominatimReverse({
    category: 'natural',
    type: 'strait',
    display_name: 'İstanbul Boğazı',
    address: { country_code: 'tr' },
  });
  assert.equal(seaResult.isLand, false);
});

test('75m minimum distance shield and starter 3-branch quota are strictly enforced', () => {
  const distTooClose = checkMinDistance75m(41.0425, 29.0067, [
    { lat: 41.0422, lng: 29.0067, name: 'İlk Kafe' },
  ]);
  assert.equal(distTooClose.allowed, false);
  assert.ok((distTooClose.nearestMeters ?? 999) < MIN_BUSINESS_DISTANCE_METERS);

  let state = createInitialEmpireState(1000);
  state.cash = 280_000;
  const owner = { id: 'p1', name: 'Patron' };
  const p1 = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067), 'Kafe 1', owner, [], 1000);
  assert.equal(p1.ok, true);
  const dup = purchaseBusiness(p1.state, 'kafe', landPin(41.0425, 29.0067), 'Kafe 2', owner, [], 1001);
  assert.equal(dup.ok, false);
});

test('5-tier HR candidate pool & automation (Çalışan -> Müdür Yrd -> Şube Müd -> Bölge Sor 4x -> Genel Müdür +20%)', () => {
  const now = 50_000;
  let state = createInitialEmpireState(now);
  state.cash = 5_000_000;
  const owner = { id: 'p1', name: 'Patron' };

  // Build 2 cafes in Istanbul (plate 34)
  const b1 = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Şube 1', owner, [], now);
  assert.equal(b1.ok, true);
  state = b1.state;
  const b2 = purchaseBusiness(state, 'kafe', landPin(41.0522, 29.0067, 34), 'Şube 2', owner, [], now + 10);
  assert.equal(b2.ok, true);
  state = b2.state;

  // Verify unmanaged stock decays during tick
  const unmanagedTick = tickEconomy(state, 50, now + 50_000);
  assert.ok(unmanagedTick.state.businesses[0].stockLevel < 100);

  // Generate candidate pool and ensure all 5 roles & 1-5 star ratings exist
  const pool = generateCandidatePool(12345, 'kafe');
  assert.ok(pool.some((c) => c.role === 'calisan'));
  assert.ok(pool.some((c) => c.role === 'mudur_yardimcisi'));
  assert.ok(pool.some((c) => c.role === 'sube_muduru'));
  assert.ok(pool.some((c) => c.role === 'bolge_sorumlusu'));
  assert.ok(pool.some((c) => c.role === 'genel_mudur'));
  assert.ok(pool.every((c) => c.stars >= 1 && c.stars <= 5));
  state = { ...state, candidatePool: pool };

  // Hire Bölge Sorumlusu -> covers both branches in Istanbul (up to 4)
  const rm = pool.find((c) => c.role === 'bolge_sorumlusu')!;
  const hiredRm = hireCandidateFromPool(state, rm.id, null, 34, now + 100);
  assert.equal(hiredRm.ok, true);
  const autoRm = resolveBusinessAutomation(
    hiredRm.state.businesses[0],
    hiredRm.state.cityManagers,
    hiredRm.state.businesses
  );
  assert.equal(autoRm.fullAutomation, true);
  assert.equal(autoRm.managerRole, 'bolge_sorumlusu');

  // Hire Genel Müdür -> covers ALL branches in Istanbul + grants +20% efficiency bonus!
  const gm = hiredRm.state.candidatePool.find((c) => c.role === 'genel_mudur')!;
  const hiredGm = hireCandidateFromPool(hiredRm.state, gm.id, null, 34, now + 200);
  assert.equal(hiredGm.ok, true);
  const autoGm = resolveBusinessAutomation(
    hiredGm.state.businesses[1],
    hiredGm.state.cityManagers,
    hiredGm.state.businesses
  );
  assert.equal(autoGm.fullAutomation, true);
  assert.equal(autoGm.managerRole, 'genel_mudur');
  assert.equal(autoGm.efficiencyBonus, 0.2);

  // Automated branch keeps 100% stock & maintenance after ticking
  const autoTick = tickEconomy(hiredGm.state, 60, now + 60_000);
  assert.equal(autoTick.state.businesses[0].stockLevel, 100);
  assert.equal(autoTick.state.businesses[0].maintenanceLevel, 100);
});

test('Parking 250m (+15% cap), Factory (%35 supply), Supermarket Chain (3+), and Franchise (+35%) synergies work', () => {
  const now = 60_000;
  let state = createInitialEmpireState(now);
  state.cash = 15_000_000;
  const owner = { id: 'p1', name: 'Holding' };

  // Establish Kafe + nearby Otopark within 120m (< 250m)
  const kafeRes = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Merkez Kafe', owner, [], now);
  assert.equal(kafeRes.ok, true);
  const baseCap = calculateBusinessCapacity(kafeRes.business!, kafeRes.state.businesses);
  const baseInc = calculateBusinessIncomePerSec(kafeRes.business!, null, now, kafeRes.state.businesses, kafeRes.state);

  // ~130m north (0.0012 deg lat)
  const parkRes = purchaseBusiness(kafeRes.state, 'otopark', landPin(41.0434, 29.0067, 34), 'Merkez Otopark', owner, [], now);
  assert.equal(parkRes.ok, true);
  assert.equal(hasParkingSynergyForBusiness(kafeRes.business!, parkRes.state.businesses), true);
  const capWithPark = calculateBusinessCapacity(kafeRes.business!, parkRes.state.businesses);
  assert.ok(capWithPark > baseCap);

  // Add Gıda Fabrikası -> triggers 35% supply discount boost on Kafe
  const facRes = purchaseBusiness(parkRes.state, 'gida_fabrikasi', landPin(41.06, 29.02, 34), 'Anadolu Gıda', owner, [], now);
  assert.equal(facRes.ok, true);
  assert.equal(hasFactorySupplySynergy(kafeRes.business!, facRes.state.businesses), true);
  const incWithParkAndFac = calculateBusinessIncomePerSec(
    kafeRes.business!,
    null,
    now,
    facRes.state.businesses,
    facRes.state
  );
  assert.ok(incWithParkAndFac > baseInc * 1.3);

  // Form Supermarket Chain (3 supermarkets)
  let s = facRes.state;
  for (let i = 0; i < 3; i++) {
    const sm = purchaseBusiness(s, 'supermarket', landPin(41.07 + i * 0.01, 29.03, 34), `Market ${i + 1}`, owner, [], now);
    assert.equal(sm.ok, true);
    s = sm.state;
  }
  const chainRes = formSupermarketChain(s, 'Anadolu Ekspres Marketler', now);
  assert.equal(chainRes.ok, true);
  assert.equal(chainRes.state.supermarketChain?.discountRate, 0.2);

  // Create Franchise brand (unlocked via Supermarket Chain!)
  const franRes = createFranchiseBrand(
    chainRes.state,
    { brandName: 'Anadolu Ekspres', businessType: 'supermarket', licenseFee: 120_000, royaltyRate: 0.15 },
    owner,
    now
  );
  assert.equal(franRes.ok, true);

  // Open a Franchise branch from seed brand -> starts with +35% bonus
  const seedBrand = SEED_FRANCHISE_BRANDS[0];
  const franchiseBranch = purchaseBusiness(
    franRes.state,
    seedBrand.businessType,
    landPin(41.12, 29.04, 34),
    'Galata Roastery Şube',
    owner,
    [],
    now,
    seedBrand
  );
  assert.equal(franchiseBranch.ok, true);
  assert.equal(franchiseBranch.business?.franchiseId, seedBrand.id);
});

test('BIST Devleri (8 exact tickers) and Player Holding IPO (>=10M & 1 factory or 5 businesses) work', () => {
  const tickers = INITIAL_BIST_QUOTES.map((q) => q.ticker);
  assert.deepEqual(tickers, ['THYL', 'ASLS', 'BIMX', 'TOGR', 'TUPR', 'GRNT', 'ERCL', 'TRKC']);

  let state = createInitialEmpireState(10_000);
  const quotes = createInitialStockQuotes();

  // Buy & sell THYL
  const buy = buyStockShares(state, quotes[0], 10, 10_000);
  assert.equal(buy.ok, true);
  assert.equal(buy.state.stockPortfolio[0].shares, 10);
  const sell = sellStockShares(buy.state, quotes[0], 10, 10_001);
  assert.equal(sell.ok, true);
  assert.equal(sell.state.stockPortfolio.length, 0);

  // Ineligible at start (< 10M)
  assert.equal(checkIpoEligibility(state, calculateNetWorth(state)).eligible, false);

  // Give 12M cash + 1 factory -> eligible for IPO with 4-letter ticker FUGM!
  state.cash = 12_000_000;
  const fac = purchaseBusiness(
    state,
    'gida_fabrikasi',
    landPin(41.0422, 29.0067, 34),
    'FUGM Gıda Fabrikası',
    { id: 'u1', name: 'Patron' },
    [],
    10_000
  );
  assert.equal(fac.ok, true);
  const nw = calculateNetWorth(fac.state, 10_000);
  const ipo = launchPlayerIpo(
    fac.state,
    'FUGM',
    'FUGames Holding A.Ş.',
    nw,
    { id: 'u1', name: 'Patron' },
    quotes.map((q) => q.ticker),
    10_000
  );
  assert.equal(ipo.ok, true);
  assert.equal(ipo.quote?.ticker, 'FUGM');
  assert.ok((ipo.state.playerIpo?.raisedCapital ?? 0) > 0);
});

test('Banking: 0-1900 Credit Score 5 tiers, Player Bank (>=25M), Loans, Repayment, Garnishment & Automatic Seizure', () => {
  assert.equal(STARTING_CREDIT_SCORE, 1100);
  assert.equal(getCreditTier(500).key, 'blacklist');
  assert.equal(getCreditTier(500).maxLoanAmount, 0);
  assert.equal(getCreditTier(850).key, 'high_risk');
  assert.equal(getCreditTier(850).maxLoanAmount, 250_000);
  assert.equal(getCreditTier(850).collateralMultiplier, 1.5);
  assert.equal(getCreditTier(1100).key, 'standard');
  assert.equal(getCreditTier(1100).maxLoanAmount, 1_500_000);
  assert.equal(getCreditTier(1450).key, 'good_boss');
  assert.equal(getCreditTier(1450).maxLoanAmount, 7_500_000);
  assert.equal(getCreditTier(1750).key, 'vip_holding');
  assert.equal(getCreditTier(1750).maxLoanAmount, 50_000_000);

  // Rate spread check: base 10% -> VIP gets 7% (-3%), High Risk gets 22% (+12%)
  assert.equal(calculateEffectiveInterestRate(0.1, 1750), 0.07);
  assert.equal(calculateEffectiveInterestRate(0.1, 850), 0.22);
  assert.equal(calculateRequiredCollateral(100_000, 1100), 120_000);

  // Create business & take collateralized loan
  const t0 = 100_000;
  let state = createInitialEmpireState(t0);
  state.cash = 600_000;
  const bizRes = purchaseBusiness(
    state,
    'internet_kafe',
    landPin(41.0422, 29.0067, 34),
    'Teminat Kafe',
    { id: 'u1', name: 'Patron' },
    [],
    t0
  );
  assert.equal(bizRes.ok, true);
  const bank = DEFAULT_SYSTEM_BANKS[0];
  const loanRes = takeLoanFromBank(
    bizRes.state,
    bank,
    100_000,
    bizRes.business!,
    200_000,
    { id: 'u1', name: 'Patron' },
    180,
    t0
  );
  assert.equal(loanRes.ok, true);
  assert.equal(loanRes.state.businesses[0].pledgedLoanId, loanRes.loan!.id);

  // On-time repayment increases credit score
  const repaid = repayLoan(loanRes.state, loanRes.loan!.id, undefined, t0 + 30_000);
  assert.equal(repaid.ok, true);
  assert.ok(repaid.state.creditScore > STARTING_CREDIT_SCORE);

  // Overdue past seizureAt automatically seizes collateral business!
  const loanRes2 = takeLoanFromBank(
    repaid.state,
    bank,
    100_000,
    repaid.state.businesses[0],
    200_000,
    { id: 'u1', name: 'Patron' },
    60,
    t0 + 40_000
  );
  assert.equal(loanRes2.ok, true);
  const pastSeizure = enforceOverdueLoans(
    { ...loanRes2.state, cash: 0 },
    0,
    loanRes2.loan!.seizureAt + 1000
  );
  assert.equal(pastSeizure.seizedLoans.length, 1);
  assert.equal(pastSeizure.state.businesses.length, 0);
  assert.equal(pastSeizure.state.activeLoans[0].status, 'seized');

  // Player bank creation requires >= 25M
  const bankFail = createPlayerBank(
    createInitialEmpireState(),
    {
      bankName: 'Test Bank',
      brandColor: '#000',
      emblem: '🏦',
      hqCityPlate: 34,
      hqCityName: 'İstanbul',
      hqLat: 41.04,
      hqLng: 29.0,
      initialPoolCapital: 5_000_000,
      baseInterestRate: 0.12,
      minCreditScore: 900,
    },
    1_000_000,
    { id: 'u1', name: 'Patron' }
  );
  assert.equal(bankFail.ok, false);

  const richState = { ...createInitialEmpireState(), cash: 30_000_000 };
  const bankOk = createPlayerBank(
    richState,
    {
      bankName: 'Boğaziçi Holding Bankası',
      brandColor: '#B45309',
      emblem: '🏦',
      hqCityPlate: 34,
      hqCityName: 'İstanbul',
      hqLat: 41.04,
      hqLng: 29.0,
      initialPoolCapital: 5_000_000,
      baseInterestRate: 0.1,
      minCreditScore: 1000,
    },
    30_000_000,
    { id: 'u1', name: 'Patron' }
  );
  assert.equal(bankOk.ok, true);
  assert.equal(bankOk.state.ownBank?.bankName, 'Boğaziçi Holding Bankası');
});

test('AVM synergy, 1.5x takeover, and v1.2.0 OTA semver work', () => {
  const now = 200_000;
  let state = createInitialEmpireState(now);
  state.cash = 10_000_000;
  const owner = { id: 'p1', name: 'Holding' };
  const kafe = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Kafe', owner, [], now);
  const avm = purchaseBusiness(kafe.state, 'avm', landPin(41.06, 29.02, 34), 'AVM', owner, [], now);
  assert.equal(hasAvmSynergyForBusiness(kafe.business!, avm.state.businesses), true);

  const rival: RemoteBusinessRecord = {
    id: 'rival-1',
    owner_id: 'other',
    owner_name: 'Rakip',
    city_plate: 32,
    city_name: 'Isparta',
    district: 'Merkez',
    business_name: 'Rakip Kafe',
    business_type: 'kafe',
    lat: 37.7648,
    lng: 30.5566,
    level: 2,
    hourly_income: 5000,
    valuation: 100_000,
    created_at: new Date(now).toISOString(),
  };
  assert.equal(calculateTakeoverPrice(rival.valuation), 150_000);
  assert.equal(takeoverCompetitorBusiness(avm.state, rival, owner, now).ok, true);

  assert.equal(APP_VERSION, '1.2.2');
  assert.equal(compareSemver('1.2.1', '1.2.2'), 1);
  assert.equal(compareSemver('1.2.2', '1.2.2'), 0);
  assert.ok(getCompanyTier(25_000_000).level >= 7);
});

test('v1.2.2 Time & Speed controls: pause freezes clock/income, 1x/2x/4x scale clock and hours accurately', () => {
  const now = 300_000;
  let state = createInitialEmpireState(now);
  assert.equal(state.gameMinutes, STARTING_GAME_MINUTES);
  assert.equal(formatGameClock(STARTING_GAME_MINUTES).label, 'Gün 1 • 09:00');

  const owner = { id: 'p1', name: 'Patron' };
  const built = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Saat Kafe', owner, [], now);
  assert.equal(built.ok, true);
  state = built.state;

  // Pause (elapsedSec = 0) completely freezes gameMinutes & pendingCash
  const pausedTick = tickEconomy(state, 0, now);
  assert.equal(pausedTick.state.gameMinutes, STARTING_GAME_MINUTES);
  assert.equal(pausedTick.state.businesses[0].pendingCash, 0);
  assert.equal(pausedTick.hoursPassed, 0);

  // 1x tick (1 sec = +10 game minutes) vs 4x tick (4 sec = +40 game minutes)
  const tick1x = tickEconomy(state, 1, now + 1000);
  assert.equal(tick1x.state.gameMinutes, STARTING_GAME_MINUTES + 10);
  const tick4x = tickEconomy(state, 4, now + 4000);
  assert.equal(tick4x.state.gameMinutes, STARTING_GAME_MINUTES + 40);
  assert.ok(tick4x.state.businesses[0].pendingCash > tick1x.state.businesses[0].pendingCash * 3.5);

  // 6 seconds at 1x = 60 game minutes -> 1 full in-game hour (Gün 1 • 10:00)
  const tickHour = tickEconomy(state, 6, now + 6000);
  assert.equal(tickHour.hoursPassed, 1);
  assert.equal(formatGameClock(tickHour.state.gameMinutes).label, 'Gün 1 • 10:00');
});

test('v1.2.2 Auto-Collect Revenue: strictly Bölge Sorumlusu (4 branches) & Genel Müdür (all city), NOT Şube Müdürü', () => {
  const now = 400_000;
  let state = createInitialEmpireState(now);
  state.cash = 10_000_000;
  const owner = { id: 'p1', name: 'Patron' };

  // Build 2 cafes in Istanbul (34) and 1 cafe in Ankara (6)
  const b1 = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'İstanbul Kafe 1', owner, [], now);
  const b2 = purchaseBusiness(b1.state, 'kafe', landPin(41.0522, 29.0067, 34), 'İstanbul Kafe 2', owner, [], now + 10);
  const b3 = purchaseBusiness(b2.state, 'kafe', landPin(39.9208, 32.8541, 6), 'Ankara Kafe', owner, [], now + 20);
  state = b3.state;

  const pool = generateCandidatePool(54321, 'kafe');
  state = { ...state, candidatePool: pool };

  // Hire Şube Müdürü on Ankara Kafe -> fullAutomation true, autoCollectRevenue MUST be FALSE
  const bm = pool.find((c) => c.role === 'sube_muduru')!;
  const hiredBm = hireCandidateFromPool(state, bm.id, b3.business!.id, 6, now + 30);
  assert.equal(hiredBm.ok, true);
  const ankaraAuto = resolveBusinessAutomation(
    hiredBm.state.businesses.find((b) => b.id === b3.business!.id)!,
    hiredBm.state.cityManagers,
    hiredBm.state.businesses
  );
  assert.equal(ankaraAuto.fullAutomation, true);
  assert.equal(ankaraAuto.autoCollectRevenue, false);

  // Hire Bölge Sorumlusu in Istanbul -> covers Istanbul branches with autoCollectRevenue = TRUE
  const rm = hiredBm.state.candidatePool.find((c) => c.role === 'bolge_sorumlusu')!;
  const hiredRm = hireCandidateFromPool(hiredBm.state, rm.id, null, 34, now + 40);
  assert.equal(hiredRm.ok, true);
  const istAuto = resolveBusinessAutomation(
    hiredRm.state.businesses.find((b) => b.id === b1.business!.id)!,
    hiredRm.state.cityManagers,
    hiredRm.state.businesses
  );
  assert.equal(istAuto.autoCollectRevenue, true);

  // Tick 6 seconds (= 1 full in-game hour): Istanbul branches auto-transfer cash straight into state.cash,
  // while Ankara (Şube Müdürü only) keeps revenue in pendingCash!
  const cashBefore = hiredRm.state.cash;
  const hourTick = tickEconomy(hiredRm.state, 6, now + 6040);
  assert.equal(hourTick.hoursPassed, 1);
  assert.ok(hourTick.autoCollectedHourlyAmount > 0);
  assert.ok(hourTick.state.cash > cashBefore);

  const ist1After = hourTick.state.businesses.find((b) => b.id === b1.business!.id)!;
  const ankaraAfter = hourTick.state.businesses.find((b) => b.id === b3.business!.id)!;
  assert.ok(ist1After.pendingCash < 1, 'Bölge Sorumlusu branch should auto-empty vault hourly');
  assert.ok(ankaraAfter.pendingCash > 100, 'Şube Müdürü branch should remain manual pendingCash');
});

test('v1.2.2 Accounting P&L Report calculates itemized revenues, factory supply savings, net profit & margin', () => {
  const now = 500_000;
  let state = createInitialEmpireState(now);
  state.cash = 10_000_000;
  const owner = { id: 'p1', name: 'Holding' };

  const kafe = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Merkez Kafe', owner, [], now);
  const reportBeforeFactory = calculateAccountingReport(kafe.state, [], now);
  assert.ok(reportBeforeFactory.hourlyTotalRevenue > 0);
  assert.ok(reportBeforeFactory.hourlyTotalExpenses > 0);
  assert.equal(reportBeforeFactory.branches.length, 1);
  assert.equal(reportBeforeFactory.hourlySupplyDiscountSaved, 0);

  // Adding a Gıda Fabrikası creates real supply discount savings in Accounting Report
  const withFac = purchaseBusiness(
    kafe.state,
    'gida_fabrikasi',
    landPin(41.06, 29.02, 34),
    'Anadolu Gıda',
    owner,
    [],
    now + 10
  );
  const reportWithFactory = calculateAccountingReport(withFac.state, [], now + 10);
  assert.ok(reportWithFactory.hourlySupplyDiscountSaved > 0);
  assert.equal(reportWithFactory.branches.length, 2);
  assert.equal(
    reportWithFactory.hourlyNetProfit,
    reportWithFactory.hourlyTotalRevenue - reportWithFactory.hourlyTotalExpenses
  );
  assert.ok(reportWithFactory.hourlySectorBreakdown.length === 2);
});

test('v1.2.2 Self-Renewing Dynamic Missions award Cash + XP and immediately replace claimed mission', () => {
  const now = 600_000;
  let state = createInitialEmpireState(now);
  const initialMissions = ensureDynamicMissions(state, now);
  assert.equal(initialMissions.length, ACTIVE_MISSION_SLOTS);
  assert.equal(initialMissions[0].id, 'dyn-starter-kafe-1');

  // Build first cafe to complete 'dyn-starter-kafe-1'
  const built = purchaseBusiness(
    state,
    'kafe',
    landPin(41.0422, 29.0067, 34),
    'İlk Kafe',
    { id: 'p1', name: 'Patron' },
    [],
    now
  );
  assert.equal(built.ok, true);
  state = built.state;

  const cashBefore = state.cash;
  const claim = claimMissionReward(state, initialMissions[0], now + 100);
  assert.equal(claim.ok, true);
  assert.equal(claim.state.cash, cashBefore + initialMissions[0].rewardCash);
  assert.ok(claim.state.companyXp > 0);
  assert.equal(claim.state.completedMissionsCount, 1);
  assert.equal(claim.state.activeMissions.length, ACTIVE_MISSION_SLOTS);
  assert.ok(
    !claim.state.activeMissions.some((m) => m.id === 'dyn-starter-kafe-1'),
    'Claimed mission must be replaced by a brand new mission'
  );
});

