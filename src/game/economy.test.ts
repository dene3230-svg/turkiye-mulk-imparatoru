import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUSINESS_BLUEPRINTS,
  COMPANY_TIERS,
  MIN_BUSINESS_DISTANCE_METERS,
  STARTING_CREDIT_SCORE,
} from './catalog.ts';
import {
  GAME_MINUTES_PER_REAL_SEC,
  STARTING_GAME_MINUTES,
  calculateBusinessCapacity,
  calculateBusinessIncomePerSec,
  calculateNetWorth,
  calculateTakeoverPrice,
  checkMinDistance75m,
  claimMissionReward,
  createHeadquartersForCity,
  createInitialEmpireState,
  formatGameClock,
  getCompanyTier,
  getEffectiveSimSeconds,
  hasAvmSynergyForBusiness,
  hasFactorySupplySynergy,
  hasParkingSynergyForBusiness,
  purchaseBusiness,
  resolveInitialFocusTarget,
  takeoverCompetitorBusiness,
  tickEconomy,
} from './economy.ts';
import { calculateAccountingReport } from './accountingEngine.ts';
import { ACTIVE_MISSION_SLOTS, ensureDynamicMissions } from './missionEngine.ts';
import {
  GEOGRAPHIC_REGIONS,
  TURKEY_PROVINCES,
  getProvinceByPlate,
  haversineMeters,
  resolvePinLocation,
} from './provinces81.ts';
import { checkLocalWaterShield, evaluateNominatimReverse } from './waterShield.ts';
import {
  MAX_BRANCH_ASSISTANT_MANAGERS,
  MAX_BRANCH_MANAGERS,
  MAX_BRANCH_WORKERS,
  generateCandidatePool,
  getBranchStaffSlots,
  hireCandidateFromPool,
  resolveBusinessAutomation,
} from './hrEngine.ts';
import {
  applyRealtimeBusinessDelete,
  applyRealtimeBusinessPatch,
  applyRealtimeBusinessUpsert,
  findUnsyncedLocalBusinesses,
  formatOwnerDisplayName,
  formatSupabaseError,
  generateSeedCityRivals,
  isRealPlayerBusiness,
  mergeWorldAndSeedRivals,
  normalizeRecord,
  ownedToRemoteRecord,
  parseOwnerAndHolding,
} from '../services/cityRoom.ts';
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
  payMonthlyLoanInstallment,
  repayLoan,
  takeLoanFromBank,
} from './bankingEngine.ts';
import {
  HOLDING_MIN_LEVEL,
  HOLDING_MIN_NET_WORTH,
  createMonthlyTaxObligation,
  getProgressiveTaxRates,
  hireAccountant,
  hireCeo,
  payPendingTaxBill,
  toggleCeoAutonomousGrowth,
} from './corporateEngine.ts';
import {
  approveFranchiseApplication,
  buildNationalRivalDirectory,
  calculateDynamicTakeoverOffer,
  generateAiFranchiseApplication,
  getChainStatusForBusiness,
  launchBusinessAdCampaign,
  launchCompetitiveBlitz,
  prepareChainCloneDraft,
  processAutoFranchiseApplications,
  toggleGeneralManagerAutoAds,
} from './strategyEngine.ts';
import { APP_VERSION, compareSemver } from '../services/otaUpdate.ts';
import {
  generateEdgeToEdgeMainActivity,
  patchAndroidManifest,
  patchAndroidStyles,
} from '../../scripts/patch-android.js';
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

  assert.equal(APP_VERSION, '1.3.2');
  assert.equal(compareSemver('1.3.1', '1.3.2'), 1);
  assert.equal(compareSemver('1.3.2', '1.3.2'), 0);
  assert.ok(getCompanyTier(25_000_000).level >= 7);
});

test('v1.3.0 Accelerated Time & Calendar controls: pause freezes clock/income, 1x/2x/4x scale accurately, formatGameClock shows Gün/Ay/HH:MM', () => {
  const now = 300_000;
  let state = createInitialEmpireState(now);
  assert.equal(state.gameMinutes, STARTING_GAME_MINUTES);
  assert.equal(GAME_MINUTES_PER_REAL_SEC, 36);
  const startClock = formatGameClock(STARTING_GAME_MINUTES);
  assert.equal(startClock.label, 'Gün 1 • 1. Ay • 09:00');
  assert.equal(startClock.totalDaysLabel, 'Toplam 1. Gün');

  const owner = { id: 'p1', name: 'Patron' };
  const built = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Saat Kafe', owner, [], now);
  assert.equal(built.ok, true);
  state = built.state;

  // Pause (elapsedSec = 0) completely freezes gameMinutes & pendingCash
  const pausedTick = tickEconomy(state, 0, now);
  assert.equal(pausedTick.state.gameMinutes, STARTING_GAME_MINUTES);
  assert.equal(pausedTick.state.businesses[0].pendingCash, 0);
  assert.equal(pausedTick.hoursPassed, 0);
  assert.equal(pausedTick.daysPassed, 0);
  assert.equal(pausedTick.dayEndSummary, null);

  // 1x = 36 min/real-sec (~1.67s/hr, 40s/day), 2x = ~0.80s/hr, 4x = ~0.35s/hr
  const dt1x = getEffectiveSimSeconds(1, 1);
  const dt2x = getEffectiveSimSeconds(1, 2);
  const dt4x = getEffectiveSimSeconds(1, 4);
  assert.equal(dt1x, 1);
  assert.ok(dt2x > 2.0 && dt2x < 2.2, '2x should advance ~1 in-game hour every 0.80s');
  assert.ok(dt4x > 4.6 && dt4x < 4.9, '4x should advance ~1 in-game hour every 0.35s');

  const tick1x = tickEconomy(state, dt1x, now + 1000);
  assert.equal(tick1x.state.gameMinutes, STARTING_GAME_MINUTES + 36);
  const tick4x = tickEconomy(state, dt4x, now + 1000);
  assert.ok(tick4x.state.gameMinutes >= STARTING_GAME_MINUTES + 170);
  assert.ok(tick4x.state.businesses[0].pendingCash > tick1x.state.businesses[0].pendingCash * 4.2);

  // 40 seconds at 1x = 1440 game minutes = 1 full 24-hour in-game day!
  const tickFullDay = tickEconomy(state, 40, now + 40_000);
  assert.equal(tickFullDay.daysPassed, 1);
  assert.equal(tickFullDay.hoursPassed, 24);
  assert.equal(formatGameClock(tickFullDay.state.gameMinutes).label, 'Gün 2 • 1. Ay • 09:00');
});

test('v1.2.6 Auto-Collect Revenue: Şube Müdürü, Bölge Sorumlusu & Genel Müdür all auto-collect hourly, Müdür Yrd. does NOT', () => {
  const now = 400_000;
  let state = createInitialEmpireState(now);
  state.cash = 10_000_000;
  const owner = { id: 'p1', name: 'Patron' };

  // Build 2 cafes in Istanbul (34), 1 in Ankara (6), 1 in Izmir (35)
  const b1 = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'İstanbul Kafe 1', owner, [], now);
  const b2 = purchaseBusiness(b1.state, 'kafe', landPin(41.0522, 29.0067, 34), 'İstanbul Kafe 2', owner, [], now + 10);
  const b3 = purchaseBusiness(b2.state, 'kafe', landPin(39.9208, 32.8541, 6), 'Ankara Kafe', owner, [], now + 20);
  const b4 = purchaseBusiness(b3.state, 'kafe', landPin(38.4237, 27.1428, 35), 'İzmir Kafe', owner, [], now + 25);
  state = b4.state;

  const pool = generateCandidatePool(54321, 'kafe');
  state = { ...state, candidatePool: pool };

  // Hire Şube Müdürü on Ankara Kafe -> fullAutomation true AND autoCollectRevenue MUST be TRUE in v1.2.6
  const bm = pool.find((c) => c.role === 'sube_muduru')!;
  const hiredBm = hireCandidateFromPool(state, bm.id, b3.business!.id, 6, now + 30);
  assert.equal(hiredBm.ok, true);
  const ankaraAuto = resolveBusinessAutomation(
    hiredBm.state.businesses.find((b) => b.id === b3.business!.id)!,
    hiredBm.state.cityManagers,
    hiredBm.state.businesses
  );
  assert.equal(ankaraAuto.fullAutomation, true);
  assert.equal(ankaraAuto.autoCollectRevenue, true);

  // Hire Müdür Yardımcısı on İzmir Kafe -> autoStock true, autoCollectRevenue MUST be FALSE
  const am = hiredBm.state.candidatePool.find((c) => c.role === 'mudur_yardimcisi')!;
  const hiredAm = hireCandidateFromPool(hiredBm.state, am.id, b4.business!.id, 35, now + 35);
  assert.equal(hiredAm.ok, true);
  const izmirAuto = resolveBusinessAutomation(
    hiredAm.state.businesses.find((b) => b.id === b4.business!.id)!,
    hiredAm.state.cityManagers,
    hiredAm.state.businesses
  );
  assert.equal(izmirAuto.autoStock, true);
  assert.equal(izmirAuto.autoCollectRevenue, false);

  // Hire Bölge Sorumlusu in Istanbul (has 2 branches) -> autoCollectRevenue = TRUE
  const rm = hiredAm.state.candidatePool.find((c) => c.role === 'bolge_sorumlusu')!;
  const hiredRm = hireCandidateFromPool(hiredAm.state, rm.id, null, 34, now + 40);
  assert.equal(hiredRm.ok, true);

  // Tick 2 seconds (= 72 game min -> 1 full in-game hour): Istanbul (Bölge Sorumlusu) AND Ankara (Şube Müdürü)
  // both auto-transfer cash into state.cash, while İzmir (Müdür Yrd. only) stays in pendingCash!
  const cashBefore = hiredRm.state.cash;
  const hourTick = tickEconomy(hiredRm.state, 2, now + 2040);
  assert.equal(hourTick.hoursPassed, 1);
  assert.ok(hourTick.autoCollectedHourlyAmount > 0);
  assert.ok(hourTick.state.cash > cashBefore);

  const ist1After = hourTick.state.businesses.find((b) => b.id === b1.business!.id)!;
  const ankaraAfter = hourTick.state.businesses.find((b) => b.id === b3.business!.id)!;
  const izmirAfter = hourTick.state.businesses.find((b) => b.id === b4.business!.id)!;
  assert.ok(ist1After.pendingCash < 1, 'Bölge Sorumlusu branch should auto-empty vault hourly');
  assert.ok(ankaraAfter.pendingCash < 1, 'Şube Müdürü branch should auto-empty vault hourly in v1.2.6');
  assert.ok(izmirAfter.pendingCash > 100, 'Müdür Yrd. branch should remain manual pendingCash');
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

test('v1.2.3 Android Edge-to-Edge Immersive & Display Cutout (shortEdges) native patches work', () => {
  const sampleManifest = `<manifest><application><activity android:name=".MainActivity"></activity></application></manifest>`;
  const patchedManifest = patchAndroidManifest(sampleManifest);
  assert.ok(patchedManifest.includes('android:screenOrientation="sensorLandscape"'));
  assert.ok(patchedManifest.includes('android:windowLayoutInDisplayCutoutMode="shortEdges"'));
  assert.ok(patchedManifest.includes('android:scheme="com.fugames.turkiyemulkimparatoru"'));

  const sampleStyles = `<resources><style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar"><item name="windowActionBar">false</item></style></resources>`;
  const patchedStyles = patchAndroidStyles(sampleStyles);
  assert.ok(patchedStyles.includes('android:windowLayoutInDisplayCutoutMode">shortEdges</item>'));
  assert.ok(patchedStyles.includes('android:statusBarColor">@android:color/transparent</item>'));

  const mainActivity = generateEdgeToEdgeMainActivity();
  assert.ok(mainActivity.includes('WindowCompat.setDecorFitsSystemWindows(getWindow(), false)'));
  assert.ok(mainActivity.includes('WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE'));
  assert.ok(mainActivity.includes('LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES'));
  assert.ok(mainActivity.includes('controller.hide(WindowInsetsCompat.Type.systemBars())'));
});

test('v1.2.6 Strict Per-Branch HR Slots (4 Çalışan, 1 Müd. Yrd., 1 Şube Müdürü), >=2 City Branch Guard & Balanced Costs', () => {
  const now = 700_000;
  let state = createInitialEmpireState(now);
  state.cash = 10_000_000;
  const owner = { id: 'p1', name: 'Patron' };

  const b1 = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Kadıköy Kafe', owner, [], now);
  assert.equal(b1.ok, true);
  state = b1.state;
  const bizId = b1.business!.id;

  // Verify affordable starter 1-2 star worker and Müdür Yardımcısı prices
  const freshPool = generateCandidatePool(99999, 'kafe');
  const starterWorker = freshPool.find((c) => c.role === 'calisan' && c.stars <= 2);
  assert.ok(starterWorker, 'Every candidate pool must include an affordable 1-2 star worker');
  assert.ok(starterWorker.hireCost >= 3_000 && starterWorker.hireCost <= 12_000);
  const asstManagers = freshPool.filter((c) => c.role === 'mudur_yardimcisi');
  assert.ok(asstManagers.every((c) => c.hireCost >= 25_000 && c.hireCost <= 60_000));

  // City-level managers MUST be blocked when player only has 1 branch in that city
  state = { ...state, candidatePool: freshPool };
  const rmCandidate = freshPool.find((c) => c.role === 'bolge_sorumlusu')!;
  const gmCandidate = freshPool.find((c) => c.role === 'genel_mudur')!;
  assert.equal(hireCandidateFromPool(state, rmCandidate.id, null, 34, now + 1).ok, false);
  assert.equal(hireCandidateFromPool(state, gmCandidate.id, null, 34, now + 2).ok, false);

  // Fill 4/4 Çalışan and verify 5th is strictly blocked
  for (let i = 0; i < MAX_BRANCH_WORKERS; i++) {
    const workerPool = generateCandidatePool(10_000 + i * 37, 'kafe');
    const worker = workerPool.find((c) => c.role === 'calisan')!;
    const res = hireCandidateFromPool({ ...state, candidatePool: workerPool }, worker.id, bizId, 34, now + 10 + i);
    assert.equal(res.ok, true);
    state = res.state;
  }
  const extraWorkerPool = generateCandidatePool(77777, 'kafe');
  const extraWorker = extraWorkerPool.find((c) => c.role === 'calisan')!;
  const fifthWorker = hireCandidateFromPool({ ...state, candidatePool: extraWorkerPool }, extraWorker.id, bizId, 34, now + 30);
  assert.equal(fifthWorker.ok, false);

  // Fill 1/1 Müd. Yrd. and verify 2nd is blocked
  const am1 = extraWorkerPool.find((c) => c.role === 'mudur_yardimcisi')!;
  const am1Res = hireCandidateFromPool({ ...state, candidatePool: extraWorkerPool }, am1.id, bizId, 34, now + 31);
  assert.equal(am1Res.ok, true);
  state = am1Res.state;
  const am2 = am1Res.state.candidatePool.find((c) => c.role === 'mudur_yardimcisi')!;
  assert.equal(hireCandidateFromPool(state, am2.id, bizId, 34, now + 32).ok, false);

  // Fill 1/1 Şube Müdürü and verify 2nd is blocked
  const bm1 = state.candidatePool.find((c) => c.role === 'sube_muduru')!;
  const bm1Res = hireCandidateFromPool(state, bm1.id, bizId, 34, now + 33);
  assert.equal(bm1Res.ok, true);
  state = bm1Res.state;
  const bm2 = state.candidatePool.find((c) => c.role === 'sube_muduru')!;
  assert.equal(hireCandidateFromPool(state, bm2.id, bizId, 34, now + 34).ok, false);

  const slots = getBranchStaffSlots(state.businesses[0]);
  assert.equal(slots.workers, MAX_BRANCH_WORKERS);
  assert.equal(slots.assistantManagers, MAX_BRANCH_ASSISTANT_MANAGERS);
  assert.equal(slots.branchManagers, MAX_BRANCH_MANAGERS);
});

test('v1.2.6 Calendar Day-End Summary, 7-Day Weekly Dividend, 30-Day Monthly Closing, 3 System Banks & Safe Seed Rivals', () => {
  const now = 800_000;
  // 3 system banks including Turkuaz Bank
  assert.equal(DEFAULT_SYSTEM_BANKS.length, 3);
  assert.ok(DEFAULT_SYSTEM_BANKS.some((b) => b.bankName === 'Turkuaz Bank'));

  // Seed city rivals in Istanbul: 3 distinct AI holdings, on land, > 400m from city center
  const istanbul = getProvinceByPlate(34);
  const rivals = generateSeedCityRivals(34);
  assert.equal(rivals.length, 3);
  for (const rival of rivals) {
    assert.equal(checkLocalWaterShield(rival.lat, rival.lng), null);
    assert.ok(haversineMeters(istanbul.lat, istanbul.lng, rival.lat, rival.lng) > 400);
  }

  // Test day-end transition (Day 1 -> Day 2)
  let state = createInitialEmpireState(now);
  const quotes = createInitialStockQuotes();
  const boughtStock = buyStockShares(state, quotes[0], 50, now);
  assert.equal(boughtStock.ok, true);
  state = {
    ...boughtStock.state,
    gameMinutes: 1440 - 10, // Day 1 23:50
  };

  // +20 game minutes (2 sec at 1x) crosses midnight -> Day 2 00:10
  const day1End = tickEconomy(state, 2, now + 2000, undefined, quotes);
  assert.equal(day1End.daysPassed, 1);
  assert.ok(day1End.dayEndSummary);
  assert.equal(day1End.dayEndSummary.completedDay, 1);
  assert.equal(day1End.dayEndSummary.monthlyClosing, null);
  assert.equal(day1End.dayEndSummary.weeklyDividendPaid, 0);

  // Day 7 -> Day 8 triggers 7-day weekly dividend!
  const day7End = tickEconomy(
    { ...state, gameMinutes: 7 * 1440 - 10 },
    2,
    now + 4000,
    undefined,
    quotes
  );
  assert.equal(day7End.dayEndSummary?.completedDay, 7);
  assert.ok((day7End.dayEndSummary?.weeklyDividendPaid ?? 0) > 0);

  // Day 30 -> Day 31 (Month 2 Day 1) triggers monthly balance closing!
  const day30End = tickEconomy(
    { ...state, gameMinutes: 30 * 1440 - 10 },
    2,
    now + 6000,
    undefined,
    quotes
  );
  assert.equal(day30End.dayEndSummary?.completedDay, 30);
  assert.equal(day30End.dayEndSummary?.monthlyClosing?.monthNumber, 1);
  assert.equal(formatGameClock(day30End.state.gameMinutes).month, 2);
  assert.equal(formatGameClock(day30End.state.gameMinutes).day, 1);
});

test('v1.2.7 Headquarters (HQ) city and first business coordinates persist permanently for map auto-focus', () => {
  const now = 900_000;
  const hqIzmir = createHeadquartersForCity(35);
  assert.equal(hqIzmir.cityPlate, 35);
  assert.equal(hqIzmir.cityName, 'İzmir');
  assert.equal(hqIzmir.businessId, undefined);

  // Starting a new game in İzmir focuses İzmir by default
  let state = createInitialEmpireState(now, 35);
  state.cash = 1_000_000;
  assert.equal(state.hq?.cityPlate, 35);
  assert.equal(state.hq?.cityName, 'İzmir');
  const initialFocus = resolveInitialFocusTarget(state);
  assert.equal(initialFocus.cityPlate, 35);
  assert.equal(initialFocus.lat, hqIzmir.lat);
  assert.equal(initialFocus.lng, hqIzmir.lng);

  // Building the first business in Ankara permanently locks HQ to that exact branch
  const owner = { id: 'p1', name: 'Patron' };
  const firstBuilt = purchaseBusiness(
    state,
    'kafe',
    landPin(39.9208, 32.8541, 6),
    'Anıtkabir Kafe',
    owner,
    [],
    now
  );
  assert.equal(firstBuilt.ok, true);
  assert.equal(firstBuilt.state.hq?.cityPlate, 6);
  assert.equal(firstBuilt.state.hq?.businessId, firstBuilt.business!.id);
  assert.equal(firstBuilt.state.hq?.lat, 39.9208);
  assert.equal(firstBuilt.state.hq?.lng, 32.8541);
  assert.equal(firstBuilt.state.hq?.zoom, 15);

  // Building a second business in İstanbul MUST NOT overwrite the original HQ
  const secondBuilt = purchaseBusiness(
    firstBuilt.state,
    'kafe',
    landPin(41.0422, 29.0067, 34),
    'Beşiktaş Kafe',
    owner,
    [],
    now + 100
  );
  assert.equal(secondBuilt.ok, true);
  assert.equal(secondBuilt.state.hq?.businessId, firstBuilt.business!.id);
  const focusAfterSecond = resolveInitialFocusTarget(secondBuilt.state);
  assert.equal(focusAfterSecond.cityPlate, 6);
  assert.equal(focusAfterSecond.lat, 39.9208);
  assert.equal(focusAfterSecond.lng, 32.8541);
  assert.equal(focusAfterSecond.zoom, 15);
});

test('v1.2.8 Branch Cloning forms automatic Zincir Marka (2+ branches) with supply discount, revenue boost & executive unlock', () => {
  const now = 950_000;
  let state = createInitialEmpireState(now, 34);
  state.cash = 5_000_000;
  const owner = { id: 'p1', name: 'Patron' };

  const first = purchaseBusiness(
    state,
    'kafe',
    landPin(41.0422, 29.0067, 34),
    'Boğaz Kahve',
    owner,
    [],
    now
  );
  assert.equal(first.ok, true);
  state = first.state;
  const soloStatus = getChainStatusForBusiness(first.business!, state.businesses);
  assert.equal(soloStatus.isChain, false);
  const soloIncome = calculateBusinessIncomePerSec(
    first.business!,
    null,
    now,
    state.businesses,
    state
  );

  // Clone into a 2nd branch in Ankara (cross-province chain!)
  const draft = prepareChainCloneDraft(first.business!, state.businesses);
  assert.equal(draft.brandName, 'Boğaz Kahve');
  assert.equal(draft.nextBranchNumber, 2);
  assert.equal(draft.suggestedName, 'Boğaz Kahve - 2. Şube');

  const cloned = purchaseBusiness(
    state,
    draft.businessType,
    landPin(39.9208, 32.8541, 6),
    draft.suggestedName,
    owner,
    [],
    now + 50,
    null,
    {
      chainBrandName: draft.brandName,
      chainBranchNumber: draft.nextBranchNumber,
      sourceBusinessId: draft.sourceBusinessId,
    }
  );
  assert.equal(cloned.ok, true);
  state = cloned.state;

  // Both branches now share Zincir Marka status (2 branches -> 12% supply discount, 10% revenue bonus)
  const chainStatus1 = getChainStatusForBusiness(state.businesses[0], state.businesses);
  const chainStatus2 = getChainStatusForBusiness(state.businesses[1], state.businesses);
  assert.equal(chainStatus1.isChain, true);
  assert.equal(chainStatus2.isChain, true);
  assert.equal(chainStatus1.branchCount, 2);
  assert.equal(chainStatus1.supplyDiscount, 0.12);
  assert.equal(chainStatus1.revenueBonus, 0.1);

  const originalAfterChain = state.businesses.find((b) => b.id === first.business!.id)!;
  const chainIncome = calculateBusinessIncomePerSec(
    originalAfterChain,
    null,
    now + 50,
    state.businesses,
    state
  );
  assert.ok(chainIncome > soloIncome * 1.08, 'Zincir Marka should increase branch revenue');

  const accounting = calculateAccountingReport(state, [], now + 50);
  assert.ok(accounting.hourlySupplyDiscountSaved > 0, 'Zincir Marka supply discount must appear in accounting');

  // Even though Istanbul only has 1 physical branch, belonging to a Zincir Marka unlocks Bölge Sorumlusu!
  const pool = generateCandidatePool(20261, 'kafe');
  const rm = pool.find((c) => c.role === 'bolge_sorumlusu')!;
  const hireRm = hireCandidateFromPool({ ...state, candidatePool: pool }, rm.id, null, 34, now + 100);
  assert.equal(hireRm.ok, true);
});

test('v1.2.8 3-Tier Ad Campaigns boost income/capacity & Genel Müdür Auto-Ads renews expired campaigns automatically', () => {
  const now = 1_000_000;
  let state = createInitialEmpireState(now, 34);
  state.cash = 10_000_000;
  const owner = { id: 'p1', name: 'Patron' };

  const b1 = purchaseBusiness(state, 'restoran', landPin(41.0422, 29.0067, 34), 'Lezzet 1', owner, [], now);
  const b2 = purchaseBusiness(b1.state, 'restoran', landPin(41.0522, 29.0067, 34), 'Lezzet 2', owner, [], now + 10);
  state = b2.state;

  const baseCap = calculateBusinessCapacity(state.businesses[0], state.businesses);
  const baseInc = calculateBusinessIncomePerSec(state.businesses[0], null, now + 10, state.businesses, state);

  // Launch manual Şehir Billboard campaign on branch 1
  const adRes = launchBusinessAdCampaign(state, state.businesses[0].id, 'billboard', now + 20, false);
  assert.equal(adRes.ok, true);
  assert.equal(adRes.campaign?.tierId, 'billboard');
  state = adRes.state;

  const boostedCap = calculateBusinessCapacity(state.businesses[0], state.businesses, state.gameMinutes);
  const boostedInc = calculateBusinessIncomePerSec(state.businesses[0], null, now + 20, state.businesses, state);
  assert.ok(boostedCap > baseCap * 1.4, 'Billboard ad should significantly boost customer capacity');
  assert.ok(boostedInc > baseInc * 1.6, 'Billboard ad should significantly boost branch revenue');

  // Hire Genel Müdür in Istanbul and enable Auto-Ads toggle
  const pool = generateCandidatePool(30303, 'restoran');
  const gm = pool.find((c) => c.role === 'genel_mudur')!;
  const hired = hireCandidateFromPool({ ...state, candidatePool: pool }, gm.id, null, 34, now + 30);
  assert.equal(hired.ok, true);
  const gmId = hired.state.cityManagers.find((m) => m.role === 'genel_mudur')!.id;

  const toggled = toggleGeneralManagerAutoAds(hired.state, gmId, true, now + 40);
  assert.equal(toggled.ok, true);
  assert.equal(toggled.state.cityManagers[0].autoAdsEnabled, true);

  // Tick 2s (>1 in-game hour) -> GM analyzes branch 1 (which has no active ad) and launches campaign automatically!
  const tickRes = tickEconomy(toggled.state, 2, now + 2040);
  assert.ok(tickRes.autoRenewedAdsCount >= 1, 'Genel Müdür should automatically launch ad campaign for unadvertised city branch');
  assert.ok(tickRes.autoAdsSpent > 0);
  const unadvertisedAfter = tickRes.state.businesses.find((b) => b.id === b1.business!.id)!;
  assert.ok(unadvertisedAfter.activeAdCampaign, 'Unadvertised branch should now have an active GM-managed ad campaign');
  assert.equal(unadvertisedAfter.activeAdCampaign?.autoRenewedByGm, true);
});

test('v1.2.8 Bidirectional Franchise Marketplace (Owned Branch -> Franchise -> AI Entrepreneur Applications & Royalties)', () => {
  const now = 1_100_000;
  let state = createInitialEmpireState(now, 34);
  state.cash = 2_000_000;
  const owner = { id: 'p1', name: 'Patron' };

  const built = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Anadolu Kahvecisi', owner, [], now);
  assert.equal(built.ok, true);
  state = built.state;

  // Player can publish franchise from their owned business
  const fran = createFranchiseBrand(
    state,
    { brandName: 'Anadolu Kahvecisi', businessType: 'kafe', licenseFee: 120_000, royaltyRate: 0.18 },
    owner,
    now + 10
  );
  assert.equal(fran.ok, true);
  assert.ok(fran.brand);
  state = fran.state;

  // Generate AI entrepreneur application and approve manually
  const aiApp = generateAiFranchiseApplication(fran.brand!, 777, now + 20);
  assert.equal(aiApp.applicantType, 'ai');
  assert.equal(aiApp.status, 'pending');
  state = { ...state, franchiseApplications: [aiApp] };

  const cashBefore = state.cash;
  const approved = approveFranchiseApplication(state, aiApp.id, now + 30);
  assert.equal(approved.ok, true);
  assert.equal(approved.state.cash, cashBefore + 120_000);
  assert.equal(approved.state.ownFranchises[0].branchCount, 1);
  assert.equal(approved.state.franchiseRoyaltiesEarned, 120_000);

  // Auto-franchise application processing during ticks
  const autoProc = processAutoFranchiseApplications(
    { ...approved.state, autoApproveFranchiseApps: true, gameMinutes: 540 + 240 },
    4,
    now + 40
  );
  assert.ok(autoProc.autoApprovedApps.length >= 1);
  assert.ok(autoProc.state.ownFranchises[0].branchCount >= 2);
});

test('v1.2.8 Rivals Strategy Center: National Directory, Dynamic 120%-150% Takeover & +25% Competitive Blitz', () => {
  const now = 1_200_000;
  let state = createInitialEmpireState(now, 34);
  state.cash = 10_000_000;
  const owner = { id: 'p1', name: 'Patron' };

  const ownBiz = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Merkez Kafe', owner, [], now);
  assert.equal(ownBiz.ok, true);
  state = ownBiz.state;

  const cityRivals = generateSeedCityRivals(34);
  const directory = buildNationalRivalDirectory(
    34,
    cityRivals,
    state.acquiredRivalIds ?? [],
    SEED_FRANCHISE_BRANDS,
    owner.id
  );
  assert.ok(directory.length >= 3, 'Directory must include city & national AI rival holdings');

  const targetEntry = directory.find((d) => d.record.city_plate === 34)!;
  assert.ok(targetEntry.holdingTotalValuation > 0);
  assert.ok(targetEntry.sectorMarketSharePct > 0);
  const offer = calculateDynamicTakeoverOffer(targetEntry.record);
  assert.ok(offer.multiplier >= 1.2 && offer.multiplier <= 1.5);

  // Competitive Blitz boosts player's city branches by +25%
  const incomeBeforeBlitz = calculateBusinessIncomePerSec(
    state.businesses[0],
    null,
    now + 10,
    state.businesses,
    state
  );
  const blitz = launchCompetitiveBlitz(state, targetEntry.record, now + 10);
  assert.equal(blitz.ok, true);
  state = blitz.state;
  const incomeAfterBlitz = calculateBusinessIncomePerSec(
    state.businesses[0],
    null,
    now + 10,
    state.businesses,
    state
  );
  assert.ok(incomeAfterBlitz > incomeBeforeBlitz * 1.2, 'Competitive blitz should boost city income by +25%');

  // Dynamic takeover removes rival from acquiredRivalIds & adds to player portfolio
  const takeover = takeoverCompetitorBusiness(
    state,
    targetEntry.record,
    owner,
    now + 20,
    offer.multiplier
  );
  assert.equal(takeover.ok, true);
  assert.ok(takeover.state.acquiredRivalIds?.includes(targetEntry.record.id));
  const dirAfter = buildNationalRivalDirectory(
    34,
    cityRivals,
    takeover.state.acquiredRivalIds ?? [],
    SEED_FRANCHISE_BRANDS,
    owner.id
  );
  assert.ok(!dirAfter.some((d) => d.record.id === targetEntry.record.id));
});

test('v1.3.0 Monthly 30-Day Credit Installments, Timely +40 Score Boost, Default Interest, 15d Legal Warning & 30d Foreclosure', () => {
  const now = 1_300_000;
  let state = createInitialEmpireState(now, 34);
  state.cash = 1_500_000;
  const owner = { id: 'p1', name: 'Patron' };

  const biz = purchaseBusiness(state, 'restoran', landPin(41.0422, 29.0067, 34), 'Teminat Restoran', owner, [], now);
  assert.equal(biz.ok, true);
  state = biz.state;

  const bank = DEFAULT_SYSTEM_BANKS[0];
  const loanRes = takeLoanFromBank(state, bank, 100_000, biz.business!, 400_000, owner, 180, now, 6);
  assert.equal(loanRes.ok, true);
  assert.ok(loanRes.loan);
  assert.equal(loanRes.loan.termMonths, 6);
  assert.equal(loanRes.loan.nextDueGameDay, 31); // Day 1 + 30
  assert.ok((loanRes.loan.monthlyInstallment ?? 0) > 15_000);

  // Timely installment payment boosts credit score by +40 and advances nextDueGameDay by +30
  const scoreBefore = loanRes.state.creditScore;
  const paid1 = payMonthlyLoanInstallment(loanRes.state, loanRes.loan.id, now + 100);
  assert.equal(paid1.ok, true);
  assert.equal(paid1.creditScoreDelta, 40);
  assert.equal(paid1.state.creditScore, scoreBefore + 40);
  assert.equal(paid1.loan?.nextDueGameDay, 61);

  // Simulate missing the next installment (advance to Day 62 -> 1 day overdue): sharp -110 score drop + default interest!
  const overdueState1 = {
    ...paid1.state,
    cash: 0, // player broke so foreclosure will seize business later
    gameMinutes: 61 * 1440 + 60, // Day 62
  };
  const enf1 = enforceOverdueLoans(overdueState1, 0, now + 1000, 1);
  assert.ok(enf1.state.creditScore < paid1.state.creditScore - 90, 'Missed installment must sharply drop credit score');
  assert.ok(enf1.defaultInterestAdded > 0, 'Overdue loan must accrue daily default interest');
  assert.equal(enf1.legalWarnings.length, 0);

  // Advance to 15 days overdue -> Legal Tracking Warning triggered!
  const overdueState15 = {
    ...enf1.state,
    gameMinutes: (61 + 15) * 1440 + 60, // Day 77
  };
  const enf15 = enforceOverdueLoans(overdueState15, 0, now + 2000, 14);
  assert.equal(enf15.legalWarnings.length, 1, '15+ overdue days must emit Yasal Takip Uyarısı');
  assert.equal(enf15.seizedLoans.length, 0);

  // Advance to 30 days overdue with 0 cash -> Collateral business foreclosed!
  const overdueState30 = {
    ...enf15.state,
    gameMinutes: (61 + 30) * 1440 + 60, // Day 92
  };
  const enf30 = enforceOverdueLoans(overdueState30, 0, now + 3000, 15);
  assert.equal(enf30.seizedLoans.length, 1, '30+ overdue days without cash must foreclose collateral business');
  assert.equal(enf30.state.businesses.length, 0);
});

test('v1.3.0 Level-1 Muhasebe Departmanı auto-pays due monthly loan installments & tax bills before overdue', () => {
  const now = 1_400_000;
  let state = createInitialEmpireState(now, 34); // Level 1 starter with 250k cash!
  const owner = { id: 'p1', name: 'Patron' };

  // Hire 1-star Muhasebeci right at Level 1 (no Holding lock!)
  assert.ok((state.accountantPool?.length ?? 0) >= 5);
  const starterAcc = state.accountantPool!.find((a) => a.stars === 1)!;
  assert.ok(starterAcc.hireCost <= 15_000, 'Level-1 starter accountant must be affordable');
  const hiredAcc = hireAccountant(state, starterAcc.id, now);
  assert.equal(hiredAcc.ok, true);
  assert.equal(hiredAcc.state.accountant?.id, starterAcc.id);

  // Add a business, a loan due on Day 31, and a pending tax bill due on Day 32
  state = { ...hiredAcc.state, cash: 1_000_000 };
  const biz = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Muhasebeli Kafe', owner, [], now);
  const loanRes = takeLoanFromBank(biz.state, DEFAULT_SYSTEM_BANKS[0], 50_000, biz.business!, 150_000, owner, 180, now, 3);
  assert.equal(loanRes.ok, true);

  const rawBill = createMonthlyTaxObligation(
    1,
    30,
    { kdv: 200, sgkStopaj: 100, corporateTax: 150, municipalTax: 50, totalTax: 500 },
    now
  )!;
  assert.ok(rawBill);
  const taxBill = { ...rawBill, dueGameDay: 31 };

  // Set clock right before Day 31 -> tick crosses into Day 31 -> Muhasebeci auto-pays BOTH loan installment & tax bill!
  const preDueState = {
    ...loanRes.state,
    pendingTaxes: [taxBill],
    gameMinutes: 30 * 1440 - 10, // Day 30 23:50
  };
  const tickRes = tickEconomy(preDueState, 1, now + 1000);
  assert.equal(tickRes.accountantAutoPay.autoPaidLoanCount, 1, 'Muhasebeci must auto-pay due monthly loan installment');
  assert.equal(tickRes.accountantAutoPay.autoPaidTaxCount, 1, 'Muhasebeci must auto-pay pending tax bill');
  assert.equal(tickRes.loanEnforcement.seizedLoans.length, 0);
  assert.equal(tickRes.state.activeLoans[0].overdueDays, 0);
  assert.equal(tickRes.state.pendingTaxes?.find((t) => t.id === taxBill.id)?.status, 'paid');
});

test('v1.3.0 Holding Board & Autonomous CEO: locked below Holding stage, unlocked at Sv.5/₺5.5M & protects 40% cash floor', () => {
  const now = 1_500_000;
  let state = createInitialEmpireState(now, 34);
  const ceoCand = state.ceoPool![0];

  // Blocked at Level 1
  const blocked = hireCeo(state, ceoCand.id, 1, 250_000, now);
  assert.equal(blocked.ok, false);

  // Unlocked at Holding stage (Sv.5 / >= ₺5.5M)
  state = { ...state, cash: 8_000_000 };
  const owner = { id: 'p1', name: 'Kurucu Başkan' };
  const b1 = purchaseBusiness(state, 'restoran', landPin(41.0422, 29.0067, 34), 'Holding Restoran', owner, [], now);
  state = b1.state;

  const hired = hireCeo(state, ceoCand.id, HOLDING_MIN_LEVEL, HOLDING_MIN_NET_WORTH, now + 10);
  assert.equal(hired.ok, true);
  assert.equal(hired.state.ceo?.id, ceoCand.id);

  const toggled = toggleCeoAutonomousGrowth(hired.state, true, now + 20);
  assert.equal(toggled.ok, true);
  assert.equal(toggled.state.ceo?.autonomousGrowthEnabled, true);

  // Advance across Day 4 boundary (3-day CEO cadence) -> CEO executes autonomous growth while keeping >= 40% cash floor!
  const cashBefore = toggled.state.cash;
  const preDayState = { ...toggled.state, gameMinutes: 3 * 1440 - 10 };
  const tickRes = tickEconomy(preDayState, 1, now + 1000, undefined, [], {
    owner,
    rivalRecords: generateSeedCityRivals(34),
  });
  assert.ok(tickRes.ceoActionsLog.length >= 1, 'Autonomous CEO should log growth/management actions');
  assert.ok(
    tickRes.state.cash >= cashBefore * 0.4 - 50_000,
    'Autonomous CEO must strictly preserve the 40% cash reserve floor'
  );
});

test('v1.3.0 Realistic Progressive Tax Curve (KDV, SGK, Kurumlar, Belediye) scales fairly from Genç Girişimci to Holding', () => {
  const now = 1_600_000;
  const starterRates = getProgressiveTaxRates(1, 250_000);
  const holdingRates = getProgressiveTaxRates(12, 15_000_000);
  assert.equal(starterRates.stageIndex, 0);
  assert.equal(holdingRates.stageIndex, 3);
  assert.ok(starterRates.kdvRate < holdingRates.kdvRate);
  assert.ok(starterRates.corporateRate < holdingRates.corporateRate);
  assert.ok(starterRates.sgkRate < holdingRates.sgkRate);

  let state = createInitialEmpireState(now, 34);
  const owner = { id: 'p1', name: 'Patron' };
  const b1 = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Vergi Kafe', owner, [], now);
  state = b1.state;

  const report = calculateAccountingReport(state, [], now);
  assert.equal(report.taxRates.stageIndex, 0);
  assert.ok(report.hourlyKdvTax > 0);
  assert.ok(report.hourlyMunicipalTax > 0);
  assert.equal(
    report.hourlyTotalTaxes,
    report.hourlyKdvTax + report.hourlySgkTax + report.hourlyCorporateTax + report.hourlyMunicipalTax
  );

  // Manual tax payment works and grants +10 credit score when paid on time
  const bill = createMonthlyTaxObligation(
    1,
    30,
    { kdv: 100, sgkStopaj: 50, corporateTax: 100, municipalTax: 50, totalTax: 300 },
    now
  )!;
  const withBill = { ...state, pendingTaxes: [bill] };
  const paid = payPendingTaxBill(withBill, bill.id, now + 50);
  assert.equal(paid.ok, true);
  assert.equal(paid.state.cash, state.cash - bill.amount);
  assert.equal(paid.state.creditScore, state.creditScore + 10);
});

test('v1.3.1 Multiplayer Shared Map Sync: nationwide real-player merge, idempotent Realtime INSERT/UPDATE/DELETE, and owner+holding formatting', () => {
  const now = 1_700_000;
  let state = createInitialEmpireState(now, 34);
  const playerA = { id: 'player-a-uuid', name: 'Ahmet Yılmaz' };
  const built = purchaseBusiness(
    state,
    'kafe',
    landPin(41.0422, 29.0067, 34),
    'Boğaz Kahve',
    playerA,
    [],
    now
  );
  assert.equal(built.ok, true);
  assert.ok(built.business);

  const remoteA = ownedToRemoteRecord(built.business!, 6_500, 125_000, 'Yılmaz Holding A.Ş.');
  assert.equal(remoteA.owner_id, 'player-a-uuid');
  assert.equal(remoteA.owner_name, 'Ahmet Yılmaz · Yılmaz Holding A.Ş.');
  assert.equal(remoteA.business_name, 'Boğaz Kahve');
  assert.equal(remoteA.business_type, 'kafe');
  assert.equal(remoteA.hourly_income, 6_500);
  assert.equal(isRealPlayerBusiness(remoteA), true);

  const parsed = parseOwnerAndHolding(remoteA.owner_name);
  assert.equal(parsed.playerName, 'Ahmet Yılmaz');
  assert.equal(parsed.holdingName, 'Yılmaz Holding A.Ş.');
  assert.equal(formatOwnerDisplayName('Selin Kaya', 'Kaya Yatırım'), 'Selin Kaya · Kaya Yatırım');

  // Seed AI rivals must be distinguished from real players
  const seedIst = generateSeedCityRivals(34);
  assert.equal(isRealPlayerBusiness(seedIst[0]), false);

  // Realtime INSERT / duplicate INSERT (idempotency) / UPDATE / PATCH / DELETE
  const remoteB: RemoteBusinessRecord = {
    id: 'biz-player-b-06',
    owner_id: 'player-b-uuid',
    owner_name: 'Deniz Demir · Başkent Holding',
    city_plate: 6,
    city_name: 'Ankara',
    district: 'Çankaya',
    business_name: 'Çankaya Teknoloji Plaza',
    business_type: 'avm',
    lat: 39.9208,
    lng: 32.8541,
    level: 2,
    hourly_income: 88_000,
    valuation: 2_400_000,
    created_at: new Date(now).toISOString(),
  };

  let world: RemoteBusinessRecord[] = [];
  world = applyRealtimeBusinessUpsert(world, remoteA);
  world = applyRealtimeBusinessUpsert(world, remoteA); // duplicate INSERT must not duplicate!
  assert.equal(world.length, 1);

  world = applyRealtimeBusinessUpsert(world, remoteB);
  assert.equal(world.length, 2);

  // UPDATE level & valuation
  world = applyRealtimeBusinessPatch(world, remoteB.id, { level: 3, valuation: 3_100_000 });
  assert.equal(world.find((r) => r.id === remoteB.id)?.level, 3);
  assert.equal(world.find((r) => r.id === remoteB.id)?.valuation, 3_100_000);

  // Player A sees Player B (even in another city!) + Istanbul seed rivals, but NOT own business
  const visibleToPlayerA = mergeWorldAndSeedRivals(
    world,
    seedIst,
    playerA.id,
    new Set([built.business!.id]),
    new Set()
  );
  assert.equal(visibleToPlayerA.some((r) => r.id === remoteA.id), false);
  assert.equal(visibleToPlayerA.some((r) => r.id === remoteB.id), true);
  assert.ok(visibleToPlayerA.some((r) => !isRealPlayerBusiness(r)));

  // Rivals Strategy Center places real live players at the top
  const directory = buildNationalRivalDirectory(34, visibleToPlayerA, [], [], playerA.id);
  assert.equal(directory[0].record.id, remoteB.id);
  assert.equal(directory[0].isAiHolding, false);

  // DELETE removes cleanly and deleting an unknown id is a safe no-op
  world = applyRealtimeBusinessDelete(world, remoteB.id);
  assert.equal(world.some((r) => r.id === remoteB.id), false);
  const unchanged = applyRealtimeBusinessDelete(world, 'non-existent-id');
  assert.equal(unchanged.length, world.length);
});

test('v1.3.2 Supabase Local Backfill Sync, Dual Coordinate Normalization (lat/lng & latitude/longitude), and Error Formatting', () => {
  // 1) Supports latitude/longitude + alternate column names from `select('*')`
  const fromLatLon = normalizeRecord({
    id: 'remote-alt-1',
    owner_id: 'other-player-77',
    owner_name: 'Mert Arslan',
    holding_name: 'Arslan Holding',
    name: 'Kordon Kafe',
    sector: 'kafe',
    city_plate: 35,
    latitude: 38.4237,
    longitude: 27.1428,
    level: 2,
    hourly_income: 12_000,
    valuation: 180_000,
  });
  assert.ok(fromLatLon);
  assert.equal(fromLatLon!.lat, 38.4237);
  assert.equal(fromLatLon!.lng, 27.1428);
  assert.equal(fromLatLon!.business_name, 'Kordon Kafe');
  assert.equal(fromLatLon!.owner_name, 'Mert Arslan · Arslan Holding');
  assert.equal(fromLatLon!.city_name, 'İzmir');
  assert.equal(isRealPlayerBusiness(fromLatLon!), true);

  // 2) Rejects missing or (0,0) coordinates safely
  assert.equal(normalizeRecord({ id: 'bad-1', lat: 0, lng: 0 }), null);
  assert.equal(normalizeRecord({ id: 'bad-2' }), null);

  // 3) Detects pre-existing local businesses missing or outdated in Supabase
  const localSynced: RemoteBusinessRecord = {
    id: 'local-1',
    owner_id: 'me-1',
    owner_name: 'Ben · Holding',
    city_plate: 34,
    city_name: 'İstanbul',
    district: 'Beşiktaş',
    business_name: 'Eski Kafe',
    business_type: 'kafe',
    lat: 41.0422,
    lng: 29.0067,
    level: 2,
    hourly_income: 9_000,
    valuation: 120_000,
    created_at: '2026-11-24T00:00:00.000Z',
  };
  const localMissing: RemoteBusinessRecord = {
    ...localSynced,
    id: 'local-2',
    business_name: 'Güncelleme Öncesi Dükkan',
    level: 1,
  };
  const localUpgraded: RemoteBusinessRecord = {
    ...localSynced,
    id: 'local-3',
    level: 4,
  };
  const remoteBaseline: RemoteBusinessRecord[] = [
    { ...localSynced },
    { ...localUpgraded, level: 2 }, // stale level on server
  ];

  const unsynced = findUnsyncedLocalBusinesses(
    [localSynced, localMissing, localUpgraded],
    remoteBaseline
  );
  assert.deepEqual(
    unsynced.map((r) => r.id),
    ['local-2', 'local-3']
  );

  // 4) Non-silent Supabase error formatting
  const formatted = formatSupabaseError({
    code: '42501',
    message: 'new row violates row-level security policy',
  });
  assert.ok(formatted.includes('42501'));
  assert.ok(formatted.includes('row-level security'));
});




