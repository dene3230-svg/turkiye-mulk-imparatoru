import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BANK_LICENSE_COST,
  BANK_MIN_NET_WORTH,
  BANK_MIN_POOL_CAPITAL,
  BUSINESS_BLUEPRINTS,
  COMPANY_TIERS,
  IPO_MIN_NET_WORTH,
  MIN_BUSINESS_DISTANCE_METERS,
  STARTING_BRAND_RECOGNITION,
  STARTING_CASH,
  STARTING_CREDIT_SCORE,
  getBlueprintById,
} from './catalog.ts';
import {
  GAME_MINUTES_PER_REAL_SEC,
  STARTING_GAME_MINUTES,
  calculateBusinessCapacity,
  calculateBusinessIncomePerSec,
  calculateDailyRentAndUtilities,
  calculateDoubleShiftCost,
  calculateNetWorth,
  calculateTakeoverPrice,
  checkMinDistance75m,
  claimMissionReward,
  collectDayEndReport,
  createHeadquartersForCity,
  createInitialEmpireState,
  evaluateDaySimAutoStop,
  formatGameClock,
  getCompanyTier,
  getEffectiveSimSeconds,
  hasAvmSynergyForBusiness,
  hasFactorySupplySynergy,
  hasParkingSynergyForBusiness,
  hireDoubleShiftCrew,
  isBusinessUnderConstruction,
  purchaseBusiness,
  resolveInitialFocusTarget,
  takeoverCompetitorBusiness,
  tickEconomy,
} from './economy.ts';
import { buildPeriodAccountingSummary, calculateAccountingReport } from './accountingEngine.ts';
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
  BRANCH_LIMIT_ERROR_TEXT,
  MAX_BRANCH_ASSISTANT_MANAGERS,
  MAX_BRANCH_MANAGERS,
  MAX_BRANCH_TOTAL_SLOTS,
  MAX_BRANCH_WORKERS,
  ROLE_WAGE_MULTIPLIER,
  TURKEY_EMPLOYER_SGK_RATE,
  TURKEY_MIN_WAGE_MONTHLY_GROSS,
  TURKEY_MIN_WAGE_MONTHLY_NET,
  assignFirstCandidateForRole,
  calculateRoleWageBreakdown,
  checkBranchRoleSlotAvailable,
  dismissStaffMember,
  formatCandidateSalaryLabel,
  generateCandidatePool,
  getBranchStaffSlots,
  getBranchTotalStaffCount,
  hireCandidateFromPool,
  promoteBranchEmployee,
  resolveBusinessAutomation,
} from './hrEngine.ts';
import {
  applyRealtimeBusinessDelete,
  applyRealtimeBusinessPatch,
  applyRealtimeBusinessUpsert,
  buildBusinessesUpsertPayload,
  computeWorldDbStats,
  ensureUuidForBusinessId,
  extractMissingColumnName,
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
  BANK_MIN_BRAND_RECOGNITION,
  BANK_MIN_OFFICE_PRESTIGE,
  BANK_MIN_OPERATING_DAYS,
  DEFAULT_SYSTEM_BANKS,
  calculateEffectiveInterestRate,
  calculateRequiredCollateral,
  createPlayerBank,
  enforceOverdueLoans,
  evaluateLoanEligibility,
  getCreditTier,
  payMonthlyLoanInstallment,
  repayLoan,
  takeLoanFromBank,
} from './bankingEngine.ts';
import {
  OFFICE_EQUIPMENT_ITEMS,
  OFFICE_EQUIPMENT_MAX_LEVEL,
  OFFICE_TIERS,
  OFFICE_UPGRADES,
  PERSONAL_ASSETS,
  buyOfficeUpgrade,
  buyPersonalAsset,
  calculateBranchServiceQuality,
  calculateOfficeBenefits,
  canOfficeHireRole,
  getNextOfficeTier,
  getOfficeEquipmentLevel,
  getOfficeEquipmentUpgradeCost,
  investInBranchQuality,
  upgradeOfficeEquipment,
  upgradeOfficeTier,
} from './officeEngine.ts';
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
import { APP_VERSION, checkForOtaUpdate, compareSemver } from '../services/otaUpdate.ts';
import {
  acceptDailyOffer,
  buyRentalProperty,
  calculateDailyRentalIncome,
  declineDailyOffer,
  ensureDailyOffersForDay,
  getMergedRentalProperties,
  launchHoldingPromotion,
  purchaseStorePerk,
  signLeaseContract,
} from './quickActionsEngine.ts';
import {
  BRANCH_BRAND_COLORS,
  BRANCH_MARKETING_CAMPAIGNS,
  BRANCH_UPGRADE_TRACKS,
  computeBusinessesOverviewMetrics,
  customizeBranchIdentity,
  getBranchFacilityLevel,
  getBranchFacilityTotalMultiplier,
  launchBranchMarketingCampaign,
  upgradeBranchFacility,
} from './branchOpsEngine.ts';
import {
  computeHoldingReportsSnapshot,
  distributeHoldingStaffBonus,
  launchHoldingWideAdCampaign,
  scanSmartBranchAlerts,
} from './holdingReportsEngine.ts';
import {
  computeExecutiveDashboardMetrics,
  computeFinanceCommandMetrics,
} from './dashboardMetrics.ts';
import {
  hashPassword,
  loginPlayerAccountWithAdapter,
  registerPlayerAccountWithAdapter,
  validateLoginInput,
  validateRegistrationInput,
  verifyPassword,
  type PlayerAccountRow,
  type PlayerAccountsDbAdapter,
} from '../lib/playerAuth.ts';
import {
  safeJsonParse,
  safeReadStorageJson,
  withSafeTimeout,
} from '../lib/safeStartup.ts';
import {
  generateEdgeToEdgeMainActivity,
  patchAndroidManifest,
  patchAndroidStyles,
} from '../../scripts/patch-android.js';
import type { EmpireState, PinLocationInfo, RemoteBusinessRecord } from '../types/game.ts';

function landPin(lat: number, lng: number, plate = 34): PinLocationInfo {
  const base = resolvePinLocation(lat, lng, plate);
  return {
    ...base,
    isWithinTurkey: true,
    landStatus: 'valid',
    resolvedAddress: 'Beşiktaş, İstanbul, Türkiye',
  };
}

/** Test helper: marks all businesses as finished construction so post-opening operations can be tested directly. */
function openAllBranches(state: EmpireState): EmpireState {
  return {
    ...state,
    businesses: state.businesses.map((b) => ({
      ...b,
      constructionDaysRemaining: 0,
    })),
  };
}

/** Test helper: creates a bank-qualified established company state (Day 20+, Brand >= 25%, Plaza Office, positive day-end history). */
function makeBankQualifiedState(state: EmpireState): EmpireState {
  return {
    ...state,
    gameMinutes: Math.max(state.gameMinutes ?? 540, 20 * 1440 + 540),
    brandRecognition: Math.max(state.brandRecognition ?? 5, 25),
    officeTierId: state.officeTierId === 'home_office' ? 'plaza_floor' : (state.officeTierId ?? 'plaza_floor'),
    dayEndHistory:
      (state.dayEndHistory?.length ?? 0) > 0
        ? state.dayEndHistory
        : [
            {
              id: 'hist-seed-1',
              completedDay: 19,
              month: 1,
              dayOfMonth: 19,
              dailyGrossRevenue: 120_000,
              dailySupplyCost: 48_000,
              dailyUtilitiesAndRent: 22_000,
              dailySalariesPaid: 18_000,
              dailyNetCashFlow: 32_000,
              manualCollectibleNet: 0,
              autoSettledNet: 32_000,
              creditScoreDelta: 5,
              weeklyDividendPaid: 0,
              monthlyClosing: null,
              branchLines: [],
              collected: true,
            },
          ],
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

test('all 14 business sectors exist including Parking, 3 Factories & Multi-Billion Energy Plant', () => {
  const ids = BUSINESS_BLUEPRINTS.map((b) => b.id);
  assert.equal(ids.length, 14);
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
    'enerji_santrali',
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
  state.cash = 5_000_000;
  const owner = { id: 'p1', name: 'Patron' };
  const p1 = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067), 'Kafe 1', owner, [], 1000);
  assert.equal(p1.ok, true);
  const dup = purchaseBusiness(p1.state, 'kafe', landPin(41.0425, 29.0067), 'Kafe 2', owner, [], 1001);
  assert.equal(dup.ok, false);
});

test('5-tier HR candidate pool & automation (Çalışan -> Müdür Yrd -> Şube Müd -> Bölge Sor 4x -> Genel Müdür +20%)', () => {
  const now = 50_000;
  let state = createInitialEmpireState(now);
  state.cash = 25_000_000;
  state.officeTierId = 'bosphorus_suite'; // Unlocks Bölge Sorumlusu & Genel Müdür
  const owner = { id: 'p1', name: 'Patron' };

  // Build 2 cafes in Istanbul (plate 34)
  const b1 = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Şube 1', owner, [], now);
  assert.equal(b1.ok, true);
  state = b1.state;
  const b2 = purchaseBusiness(state, 'kafe', landPin(41.0522, 29.0067, 34), 'Şube 2', owner, [], now + 10);
  assert.equal(b2.ok, true);
  state = openAllBranches(b2.state);

  // Verify unmanaged stock decays during tick (post-construction)
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
  state.cash = 500_000_000;
  const owner = { id: 'p1', name: 'Holding' };

  // Establish Kafe + nearby Otopark within 120m (< 250m)
  const kafeRes = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Merkez Kafe', owner, [], now);
  assert.equal(kafeRes.ok, true);
  const openKafeState = openAllBranches(kafeRes.state);
  const openKafe = openKafeState.businesses[0];
  const baseCap = calculateBusinessCapacity(openKafe, openKafeState.businesses);
  const baseInc = calculateBusinessIncomePerSec(openKafe, null, now, openKafeState.businesses, openKafeState);

  // ~130m north (0.0012 deg lat)
  const parkRes = purchaseBusiness(openKafeState, 'otopark', landPin(41.0434, 29.0067, 34), 'Merkez Otopark', owner, [], now);
  assert.equal(parkRes.ok, true);
  const openParkState = openAllBranches(parkRes.state);
  assert.equal(hasParkingSynergyForBusiness(openKafe, openParkState.businesses), true);
  const capWithPark = calculateBusinessCapacity(openKafe, openParkState.businesses);
  assert.ok(capWithPark > baseCap);

  // Add Gıda Fabrikası -> triggers 35% supply discount boost on Kafe
  const facRes = purchaseBusiness(openParkState, 'gida_fabrikasi', landPin(41.06, 29.02, 34), 'Anadolu Gıda', owner, [], now);
  assert.equal(facRes.ok, true);
  const openFacState = openAllBranches(facRes.state);
  assert.equal(hasFactorySupplySynergy(openKafe, openFacState.businesses), true);
  const incWithParkAndFac = calculateBusinessIncomePerSec(
    openKafe,
    null,
    now,
    openFacState.businesses,
    openFacState
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

test('BIST Devleri (8 exact tickers) and Player Holding IPO (>=250M & 1 factory or 5 businesses) work', () => {
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

  // Ineligible at start (< 250M)
  assert.equal(checkIpoEligibility(state, calculateNetWorth(state)).eligible, false);

  // Give 300M cash + 1 factory -> eligible for IPO with 4-letter ticker FUGM!
  state.cash = IPO_MIN_NET_WORTH + 100_000_000;
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

test('Banking: 0-1900 Credit Score 5 tiers, Multi-Billion Player Bank (>=5B), Loans, Repayment & Automatic Seizure', () => {
  assert.equal(STARTING_CREDIT_SCORE, 1100);
  assert.equal(getCreditTier(500).key, 'blacklist');
  assert.equal(getCreditTier(500).maxLoanAmount, 0);
  assert.equal(getCreditTier(850).key, 'high_risk');
  assert.equal(getCreditTier(850).maxLoanAmount, 1_500_000);
  assert.equal(getCreditTier(850).collateralMultiplier, 1.6);
  assert.equal(getCreditTier(1100).key, 'standard');
  assert.equal(getCreditTier(1100).maxLoanAmount, 12_000_000);
  assert.equal(getCreditTier(1450).key, 'good_boss');
  assert.equal(getCreditTier(1450).maxLoanAmount, 75_000_000);
  assert.equal(getCreditTier(1750).key, 'vip_holding');
  assert.equal(getCreditTier(1750).maxLoanAmount, 500_000_000);

  // Rate spread check: base 10% -> VIP gets 7.5% (-2.5%), High Risk gets 24% (+14%)
  assert.equal(calculateEffectiveInterestRate(0.1, 1750), 0.075);
  assert.equal(calculateEffectiveInterestRate(0.1, 850), 0.24);
  assert.equal(calculateRequiredCollateral(100_000, 1100), 125_000);

  // Create business & take collateralized loan (on qualified established firm)
  const t0 = 100_000;
  let state = makeBankQualifiedState(createInitialEmpireState(t0));
  state.cash = 10_000_000;
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
    1_000_000,
    bizRes.business!,
    2_500_000,
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
    1_000_000,
    repaid.state.businesses[0],
    2_500_000,
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

  // Player bank creation requires >= ₺5 Milyar net worth + ₺1 Mr license + ₺2 Mr min pool!
  const bankFail = createPlayerBank(
    { ...createInitialEmpireState(), cash: 500_000_000 },
    {
      bankName: 'Küçük Bank',
      brandColor: '#000',
      emblem: '🏦',
      hqCityPlate: 34,
      hqCityName: 'İstanbul',
      hqLat: 41.04,
      hqLng: 29.0,
      initialPoolCapital: 2_000_000_000,
      baseInterestRate: 0.12,
      minCreditScore: 900,
    },
    500_000_000,
    { id: 'u1', name: 'Patron' }
  );
  assert.equal(bankFail.ok, false);

  const richState = { ...createInitialEmpireState(), cash: 6_000_000_000 };
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
      initialPoolCapital: BANK_MIN_POOL_CAPITAL,
      baseInterestRate: 0.1,
      minCreditScore: 1000,
    },
    6_000_000_000,
    { id: 'u1', name: 'Patron' }
  );
  assert.equal(bankOk.ok, true);
  assert.equal(bankOk.state.ownBank?.bankName, 'Boğaziçi Holding Bankası');
  assert.equal(bankOk.state.cash, 6_000_000_000 - BANK_LICENSE_COST - BANK_MIN_POOL_CAPITAL);
});

test('AVM synergy, 1.5x takeover, and v1.4.1 OTA semver work', () => {
  const now = 200_000;
  let state = createInitialEmpireState(now);
  state.cash = 1_500_000_000;
  const owner = { id: 'p1', name: 'Holding' };
  const kafe = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Kafe', owner, [], now);
  const avm = purchaseBusiness(kafe.state, 'avm', landPin(41.06, 29.02, 34), 'AVM', owner, [], now);
  assert.equal(avm.ok, true);
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

  assert.equal(APP_VERSION, '1.7.1');
  assert.equal(compareSemver('1.7.0', '1.7.1'), 1);
  assert.equal(compareSemver('1.3.2', '1.4.0'), 1);
  assert.equal(compareSemver('1.4.0', '1.4.0-fix'), 1);
  assert.equal(compareSemver('1.4.0-fix', '1.4.0-fix'), 0);
  assert.equal(compareSemver('1.4.0-fix', '1.4.1'), 1);
  assert.equal(compareSemver('1.4.1', '1.4.3'), 1);
  assert.equal(compareSemver('1.4.3', '1.4.5'), 1);
  assert.equal(compareSemver('1.4.0-fix', '1.4.0-fix2'), 1);
  assert.ok(getCompanyTier(BANK_MIN_NET_WORTH).level >= 7);
});

test('v1.6.0 Strict 2-State Time Control (Pause / Normal 30s = 1 Day): 48 min/sec, weekday header, dayProgressPct & zero acceleration', () => {
  const now = 300_000;
  let state = createInitialEmpireState(now);
  assert.equal(state.gameMinutes, STARTING_GAME_MINUTES);
  assert.equal(GAME_MINUTES_PER_REAL_SEC, 48);
  const startClock = formatGameClock(STARTING_GAME_MINUTES);
  assert.equal(startClock.label, 'Gün 1 • 1. Ay • 09:00');
  assert.equal(startClock.dayHeaderLabel, 'Gün 1 • Pazartesi');
  assert.equal(startClock.dayProgressPct, 37.5);

  const owner = { id: 'p1', name: 'Patron' };
  const built = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Saat Kafe', owner, [], now);
  assert.equal(built.ok, true);
  state = openAllBranches(built.state);

  // Pause (elapsedSec = 0) completely freezes gameMinutes & pendingCash
  const pausedTick = tickEconomy(state, 0, now);
  assert.equal(pausedTick.state.gameMinutes, STARTING_GAME_MINUTES);
  assert.equal(pausedTick.state.businesses[0].pendingCash, 0);
  assert.equal(pausedTick.hoursPassed, 0);
  assert.equal(pausedTick.daysPassed, 0);
  assert.equal(pausedTick.dayEndSummary, null);

  // Strict 2-state: paused returns 0, any active speed is locked strictly to 1x (no 2x/4x/day multiplier)
  assert.equal(getEffectiveSimSeconds(1, 0), 0);
  assert.equal(getEffectiveSimSeconds(1, 1), 1);
  assert.equal(getEffectiveSimSeconds(1, 2), 1);
  assert.equal(getEffectiveSimSeconds(1, 4), 1);
  assert.equal(getEffectiveSimSeconds(1, 'day'), 1);

  const tick1x = tickEconomy(state, 1, now + 1000);
  assert.equal(tick1x.state.gameMinutes, STARTING_GAME_MINUTES + 48);

  // EXACTLY 30 real seconds at 1x = 1440 game minutes = 1 full 24-hour in-game day!
  const tickFullDay = tickEconomy(state, 30, now + 30_000);
  assert.equal(tickFullDay.daysPassed, 1);
  assert.equal(tickFullDay.hoursPassed, 24);
  assert.equal(formatGameClock(tickFullDay.state.gameMinutes).dayHeaderLabel, 'Gün 2 • Salı');
  assert.equal(formatGameClock(tickFullDay.state.gameMinutes).label, 'Gün 2 • 1. Ay • 09:00');
});

test('v1.2.6 Auto-Collect Revenue: Şube Müdürü, Bölge Sorumlusu & Genel Müdür all auto-collect hourly, Müdür Yrd. does NOT', () => {
  const now = 400_000;
  let state = createInitialEmpireState(now);
  state.cash = 35_000_000;
  state.officeTierId = 'plaza_floor'; // Unlocks Bölge Sorumlusu
  const owner = { id: 'p1', name: 'Patron' };

  // Build 2 cafes in Istanbul (34), 1 in Ankara (6), 1 in Izmir (35)
  const b1 = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'İstanbul Kafe 1', owner, [], now);
  const b2 = purchaseBusiness(b1.state, 'kafe', landPin(41.0522, 29.0067, 34), 'İstanbul Kafe 2', owner, [], now + 10);
  const b3 = purchaseBusiness(b2.state, 'kafe', landPin(39.9208, 32.8541, 6), 'Ankara Kafe', owner, [], now + 20);
  const b4 = purchaseBusiness(b3.state, 'kafe', landPin(38.4237, 27.1428, 35), 'İzmir Kafe', owner, [], now + 25);
  state = openAllBranches(b4.state);

  const pool = generateCandidatePool(54321, 'kafe');
  state = { ...state, candidatePool: pool };

  // Hire Şube Müdürü on Ankara Kafe -> fullAutomation true AND autoCollectRevenue MUST be TRUE
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

  // Tick 1 full day across midnight 00:00: Şube Müdürü & Bölge Sorumlusu auto-settle into cash,
  // while İzmir (Müdür Yrd. only) awaits manual Day-End Report settlement!
  const cashBefore = hiredRm.state.cash;
  const fullDayTick = tickEconomy(hiredRm.state, 40, now + 40_040);
  assert.equal(fullDayTick.daysPassed, 1);
  assert.ok(fullDayTick.dayEndSummary);
  assert.ok(fullDayTick.dayEndSummary.autoSettledNet !== 0);
  assert.ok(fullDayTick.state.cash !== cashBefore);

  const ist1After = fullDayTick.state.businesses.find((b) => b.id === b1.business!.id)!;
  const ankaraAfter = fullDayTick.state.businesses.find((b) => b.id === b3.business!.id)!;
  const izmirLine = fullDayTick.dayEndSummary.branchLines.find((l) => l.businessId === b4.business!.id)!;
  assert.equal(ist1After.pendingCash, 0, 'Bölge Sorumlusu branch should auto-settle at 00:00');
  assert.equal(ankaraAfter.pendingCash, 0, 'Şube Müdürü branch should auto-settle at 00:00');
  assert.equal(izmirLine.autoSettled, false, 'Müdür Yrd. branch should remain manual in 00:00 Day-End Report');
});

test('v1.2.2 Accounting P&L Report calculates itemized revenues, factory supply savings, net profit & margin', () => {
  const now = 500_000;
  let state = createInitialEmpireState(now);
  state.cash = 150_000_000;
  const owner = { id: 'p1', name: 'Holding' };

  const kafe = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Merkez Kafe', owner, [], now);
  const openKafeState = openAllBranches(kafe.state);
  const reportBeforeFactory = calculateAccountingReport(openKafeState, [], now);
  assert.ok(reportBeforeFactory.hourlyTotalRevenue > 0);
  assert.ok(reportBeforeFactory.hourlyTotalExpenses > 0);
  assert.equal(reportBeforeFactory.branches.length, 1);
  assert.equal(reportBeforeFactory.hourlySupplyDiscountSaved, 0);

  // Adding a Gıda Fabrikası creates real supply discount savings in Accounting Report
  const withFac = purchaseBusiness(
    openKafeState,
    'gida_fabrikasi',
    landPin(41.06, 29.02, 34),
    'Anadolu Gıda',
    owner,
    [],
    now + 10
  );
  const reportWithFactory = calculateAccountingReport(openAllBranches(withFac.state), [], now + 10);
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
  state.cash = 10_000_000;
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
  state.cash = 10_000_000;
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
  state = openAllBranches(first.state);
  const soloStatus = getChainStatusForBusiness(state.businesses[0], state.businesses);
  assert.equal(soloStatus.isChain, false);
  const soloIncome = calculateBusinessIncomePerSec(
    state.businesses[0],
    null,
    now,
    state.businesses,
    state
  );

  // Clone into a 2nd branch in Ankara (cross-province chain!)
  const draft = prepareChainCloneDraft(state.businesses[0], state.businesses);
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
  state = openAllBranches(cloned.state);

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

  // Even though Istanbul only has 1 physical branch, belonging to a Zincir Marka unlocks Bölge Sorumlusu (with Plaza Office)!
  const pool = generateCandidatePool(20261, 'kafe');
  const rm = pool.find((c) => c.role === 'bolge_sorumlusu')!;
  const hireRm = hireCandidateFromPool(
    { ...state, officeTierId: 'plaza_floor', candidatePool: pool },
    rm.id,
    null,
    34,
    now + 100
  );
  assert.equal(hireRm.ok, true);
});

test('v1.2.8 3-Tier Ad Campaigns boost income/capacity & Genel Müdür Auto-Ads renews expired campaigns automatically', () => {
  const now = 1_000_000;
  let state = createInitialEmpireState(now, 34);
  state.cash = 40_000_000;
  state.officeTierId = 'bosphorus_suite'; // Unlocks Genel Müdür
  const owner = { id: 'p1', name: 'Patron' };

  const b1 = purchaseBusiness(state, 'restoran', landPin(41.0422, 29.0067, 34), 'Lezzet 1', owner, [], now);
  const b2 = purchaseBusiness(b1.state, 'restoran', landPin(41.0522, 29.0067, 34), 'Lezzet 2', owner, [], now + 10);
  state = openAllBranches(b2.state);

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
  state.cash = 8_000_000;
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
  state = openAllBranches(ownBiz.state);

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
  let state = makeBankQualifiedState(createInitialEmpireState(now, 34));
  state.cash = 25_000_000;
  const owner = { id: 'p1', name: 'Patron' };

  const biz = purchaseBusiness(state, 'restoran', landPin(41.0422, 29.0067, 34), 'Teminat Restoran', owner, [], now);
  assert.equal(biz.ok, true);
  state = biz.state;

  const bank = DEFAULT_SYSTEM_BANKS[0];
  const loanRes = takeLoanFromBank(state, bank, 1_000_000, biz.business!, 6_000_000, owner, 180, now, 6);
  assert.equal(loanRes.ok, true);
  assert.ok(loanRes.loan);
  assert.equal(loanRes.loan.termMonths, 6);
  assert.equal(loanRes.loan.nextDueGameDay, 51); // Day 21 + 30
  assert.ok((loanRes.loan.monthlyInstallment ?? 0) > 150_000);

  // Timely installment payment boosts credit score by +40 and advances nextDueGameDay by +30
  const scoreBefore = loanRes.state.creditScore;
  const paid1 = payMonthlyLoanInstallment(loanRes.state, loanRes.loan.id, now + 100);
  assert.equal(paid1.ok, true);
  assert.equal(paid1.creditScoreDelta, 40);
  assert.equal(paid1.state.creditScore, scoreBefore + 40);
  assert.equal(paid1.loan?.nextDueGameDay, 81);

  // Simulate missing the next installment (advance to Day 82 -> 1 day overdue): sharp -110 score drop + default interest!
  const overdueState1 = {
    ...paid1.state,
    cash: 0, // player broke so foreclosure will seize business later
    gameMinutes: 81 * 1440 + 60, // Day 82
  };
  const enf1 = enforceOverdueLoans(overdueState1, 0, now + 1000, 1);
  assert.ok(enf1.state.creditScore < paid1.state.creditScore - 90, 'Missed installment must sharply drop credit score');
  assert.ok(enf1.defaultInterestAdded > 0, 'Overdue loan must accrue daily default interest');
  assert.equal(enf1.legalWarnings.length, 0);

  // Advance to 15 days overdue -> Legal Tracking Warning triggered!
  const overdueState15 = {
    ...enf1.state,
    gameMinutes: (81 + 15) * 1440 + 60, // Day 97
  };
  const enf15 = enforceOverdueLoans(overdueState15, 0, now + 2000, 14);
  assert.equal(enf15.legalWarnings.length, 1, '15+ overdue days must emit Yasal Takip Uyarısı');
  assert.equal(enf15.seizedLoans.length, 0);

  // Advance to 30 days overdue with 0 cash -> Collateral business foreclosed!
  const overdueState30 = {
    ...enf15.state,
    gameMinutes: (81 + 30) * 1440 + 60, // Day 112
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

  // Add a business, a loan due on Day 51, and a pending tax bill due on Day 51
  state = { ...makeBankQualifiedState(hiredAcc.state), cash: 10_000_000 };
  const biz = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Muhasebeli Kafe', owner, [], now);
  const loanRes = takeLoanFromBank(biz.state, DEFAULT_SYSTEM_BANKS[0], 500_000, biz.business!, 2_000_000, owner, 180, now, 3);
  assert.equal(loanRes.ok, true);

  const rawBill = createMonthlyTaxObligation(
    1,
    50,
    { kdv: 200, sgkStopaj: 100, corporateTax: 150, municipalTax: 50, totalTax: 500 },
    now
  )!;
  assert.ok(rawBill);
  const taxBill = { ...rawBill, dueGameDay: 51 };

  // Set clock right before Day 51 -> tick crosses into Day 51 -> Muhasebeci auto-pays BOTH loan installment & tax bill!
  const preDueState = {
    ...loanRes.state,
    pendingTaxes: [taxBill],
    gameMinutes: 50 * 1440 - 10, // Day 50 23:50
  };
  const tickRes = tickEconomy(preDueState, 1, now + 1000);
  assert.equal(tickRes.accountantAutoPay.autoPaidLoanCount, 1, 'Muhasebeci must auto-pay due monthly loan installment');
  assert.equal(tickRes.accountantAutoPay.autoPaidTaxCount, 1, 'Muhasebeci must auto-pay pending tax bill');
  assert.equal(tickRes.loanEnforcement.seizedLoans.length, 0);
  assert.equal(tickRes.state.activeLoans[0].overdueDays, 0);
  assert.equal(tickRes.state.pendingTaxes?.find((t) => t.id === taxBill.id)?.status, 'paid');
});

test('v1.3.0 Holding Board & Autonomous CEO: locked below Holding stage & Holding Tower, unlocked at Sv.5/₺120M & protects 40% cash floor', () => {
  const now = 1_500_000;
  let state = createInitialEmpireState(now, 34);
  const ceoCand = state.ceoPool![0];

  // Blocked at Level 1
  const blocked = hireCeo(state, ceoCand.id, 1, 3_000_000, now);
  assert.equal(blocked.ok, false);

  // Unlocked at Holding stage (Sv.5 / >= ₺120M) with Holding Tower office!
  state = { ...state, cash: 200_000_000, officeTierId: 'holding_tower' };
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
    tickRes.state.cash >= cashBefore * 0.4 - 500_000,
    'Autonomous CEO must strictly preserve the 40% cash reserve floor'
  );
});

test('v1.3.0 Realistic Progressive Tax Curve (KDV, SGK, Kurumlar, Belediye) scales fairly from Genç Girişimci to Holding', () => {
  const now = 1_600_000;
  const starterRates = getProgressiveTaxRates(1, 3_000_000);
  const holdingRates = getProgressiveTaxRates(12, 300_000_000);
  assert.equal(starterRates.stageIndex, 0);
  assert.equal(holdingRates.stageIndex, 3);
  assert.ok(starterRates.kdvRate < holdingRates.kdvRate);
  assert.ok(starterRates.corporateRate < holdingRates.corporateRate);
  assert.ok(starterRates.sgkRate < holdingRates.sgkRate);

  let state = createInitialEmpireState(now, 34);
  const owner = { id: 'p1', name: 'Patron' };
  const b1 = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Vergi Kafe', owner, [], now);
  state = openAllBranches(b1.state);

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

test('v1.4.0 Construction Period (3-18d), Zero Revenue During Renovation, Daily Rent, and Double Shift (-35%) Crew', () => {
  const now = 1_800_000;
  let state = createInitialEmpireState(now, 34);
  state.cash = 25_000_000;
  const owner = { id: 'p1', name: 'Patron' };

  // All blueprints define a realistic 3-18 day construction window (including mega Energy Plant)
  for (const bp of BUSINESS_BLUEPRINTS) {
    assert.ok(bp.constructionDays >= 3 && bp.constructionDays <= 20, `${bp.id} constructionDays out of 3..20 range`);
    assert.ok(bp.dailyRentBase > 0, `${bp.id} dailyRentBase must be positive`);
    assert.ok(bp.unitSalePrice > 0, `${bp.id} unitSalePrice must be positive`);
    assert.ok(bp.baseCogsRatio >= 0.3 && bp.baseCogsRatio <= 0.55, `${bp.id} baseCogsRatio must be realistic`);
  }

  // Establish a Restoran (starts under construction, generates 0 income while building)
  const built = purchaseBusiness(state, 'restoran', landPin(41.0422, 29.0067, 34), 'Galata Lokanta', owner, [], now);
  assert.equal(built.ok, true);
  const biz = built.business!;
  assert.equal(isBusinessUnderConstruction(biz), true);
  assert.ok((biz.constructionDaysRemaining ?? 0) >= 3);
  assert.equal(calculateBusinessIncomePerSec(biz, null, now, built.state.businesses, built.state), 0);
  assert.ok(calculateDailyRentAndUtilities(biz) > 0);

  // Double Shift Crew cuts remaining construction days by 35% and cannot be applied twice
  const origDays = biz.constructionDaysRemaining!;
  const shiftCost = calculateDoubleShiftCost(biz);
  assert.ok(shiftCost > 0);
  const shifted = hireDoubleShiftCrew(built.state, biz.id, now + 100);
  assert.equal(shifted.ok, true);
  assert.equal(shifted.state.businesses[0].doubleShiftApplied, true);
  assert.ok((shifted.state.businesses[0].constructionDaysRemaining ?? 99) < origDays);
  const doubleApply = hireDoubleShiftCrew(shifted.state, biz.id, now + 200);
  assert.equal(doubleApply.ok, false);
});

test('v1.4.0 Auto-Stop Guard (Construction Complete, Payment Due, Critical Cash) on 30s/Day Clock', () => {
  const now = 1_900_000;
  // v1.6.0 strictly locks active simulation speed to 1x (30s = 1 full game day)
  assert.equal(getEffectiveSimSeconds(0.25, 1), 0.25);

  let state = createInitialEmpireState(now, 34);
  state.cash = 5_000_000;
  const owner = { id: 'p1', name: 'Patron' };
  const built = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Hızlı Kafe', owner, [], now);
  assert.equal(built.ok, true);

  // Set 1 day remaining -> advancing 1 full day (30 real sec) completes construction and triggers alert
  state = {
    ...built.state,
    businesses: built.state.businesses.map((b) => ({ ...b, constructionDaysRemaining: 1 })),
  };
  const completedTick = tickEconomy(state, 30, now + 30_000);
  assert.equal(completedTick.completedConstructions.length, 1);
  assert.equal(completedTick.daySimAutoStop?.reason, 'construction_completed');
  assert.equal(isBusinessUnderConstruction(completedTick.state.businesses[0]), false);

  // Payment due triggers Auto-Stop Guard
  const taxBill = createMonthlyTaxObligation(
    1,
    1,
    { kdv: 5_000, sgkStopaj: 2_000, corporateTax: 3_000, municipalTax: 1_000, totalTax: 11_000 },
    now
  )!;
  const withTax = { ...completedTick.state, pendingTaxes: [{ ...taxBill, dueGameDay: 2 }] };
  const paymentAlert = evaluateDaySimAutoStop(completedTick.state, withTax, [], 0);
  assert.equal(paymentAlert?.reason, 'payment_due');

  // Critical cash triggers Auto-Stop Guard
  const lowCashState = { ...completedTick.state, cash: 5_000 };
  const cashAlert = evaluateDaySimAutoStop(completedTick.state, lowCashState, [], 0);
  assert.equal(cashAlert?.reason, 'critical_cash');
});

test('v1.4.0 Midnight 00:00 Day-End Report: Per-Branch P&L, Loss Flagging & Manual Settlement Into Cash', () => {
  const now = 2_000_000;
  let state = createInitialEmpireState(now, 34);
  state.cash = 25_000_000;
  const owner = { id: 'p1', name: 'Patron' };

  // Active Kafe + Under-construction Restoran (which incurs rent with 0 revenue -> loss line!)
  const b1 = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Açık Kafe', owner, [], now);
  const b2 = purchaseBusiness(b1.state, 'restoran', landPin(41.0522, 29.0067, 34), 'Tadilattaki Restoran', owner, [], now + 5);
  state = {
    ...b2.state,
    businesses: b2.state.businesses.map((b) =>
      b.id === b1.business!.id ? { ...b, constructionDaysRemaining: 0 } : b
    ),
  };

  // Intra-day tick (10s) must NOT stream directly into main cash
  const cashBeforeDay = state.cash;
  const midday = tickEconomy(state, 10, now + 10_000);
  assert.equal(midday.daysPassed, 0);
  assert.equal(midday.state.cash, cashBeforeDay);
  const openMidday = midday.state.businesses.find((b) => b.id === b1.business!.id)!;
  assert.ok((openMidday.dailyAccruedGross ?? 0) > 0);

  // Cross 00:00 midnight -> Day-End Summary generated & queued in pendingDayEndReports
  const midnight = tickEconomy(midday.state, 30, now + 40_000);
  assert.equal(midnight.daysPassed, 1);
  assert.ok(midnight.dayEndSummary);
  assert.equal(midnight.dayEndSummary.branchLines.length, 2);

  const openLine = midnight.dayEndSummary.branchLines.find((l) => l.businessId === b1.business!.id)!;
  const buildLine = midnight.dayEndSummary.branchLines.find((l) => l.businessId === b2.business!.id)!;
  assert.ok(openLine.grossRevenue > 0);
  assert.ok(openLine.utilitiesAndRent > 0);
  assert.equal(buildLine.underConstruction, true);
  assert.equal(buildLine.grossRevenue, 0);
  assert.equal(buildLine.isLoss, true, 'Under-construction branch paying rent with 0 revenue must be flagged as loss');
  assert.ok((midnight.state.pendingDayEndReports?.length ?? 0) >= 1);

  // Collect Day-End Report -> settles manualCollectibleNet into cash & archives to dayEndHistory
  const preCollectCash = midnight.state.cash;
  const settled = collectDayEndReport(midnight.state);
  assert.equal(settled.ok, true);
  assert.equal(settled.state.cash, preCollectCash + (settled.collectedAmount ?? 0));
  assert.equal(settled.state.pendingDayEndReports?.length, 0);
  assert.ok((settled.state.dayEndHistory?.length ?? 0) >= 1);
});

test('v1.4.0 Turkey Min-Wage Payroll (+22.5% Employer SGK) & Daily/Monthly/Annual Balance Sheet with 4 Turkish Taxes', () => {
  assert.equal(TURKEY_MIN_WAGE_MONTHLY_NET, 22_104);
  assert.equal(TURKEY_MIN_WAGE_MONTHLY_GROSS, 26_005);
  assert.equal(TURKEY_EMPLOYER_SGK_RATE, 0.225);
  assert.equal(ROLE_WAGE_MULTIPLIER.calisan, 1.0);
  assert.equal(ROLE_WAGE_MULTIPLIER.mudur_yardimcisi, 1.4);
  assert.equal(ROLE_WAGE_MULTIPLIER.sube_muduru, 1.9);

  const workerWage = calculateRoleWageBreakdown('calisan', 1);
  const asstWage = calculateRoleWageBreakdown('mudur_yardimcisi', 1);
  const mgrWage = calculateRoleWageBreakdown('sube_muduru', 1);
  assert.equal(workerWage.dailyEmployerSgk, Math.round(workerWage.dailyGrossWage * 0.225));
  assert.equal(workerWage.dailyTotalCost, workerWage.dailyGrossWage + workerWage.dailyEmployerSgk);
  assert.ok(asstWage.dailyGrossWage > workerWage.dailyGrossWage * 1.35);
  assert.ok(mgrWage.dailyGrossWage > workerWage.dailyGrossWage * 1.85);

  const now = 2_100_000;
  let state = createInitialEmpireState(now, 34);
  state.cash = 25_000_000;
  const owner = { id: 'p1', name: 'Patron' };
  const built = purchaseBusiness(state, 'restoran', landPin(41.0422, 29.0067, 34), 'Bilanço Restoran', owner, [], now);
  state = openAllBranches(built.state);

  const report = calculateAccountingReport(state, [], now);
  const daily = buildPeriodAccountingSummary(report, 'daily', state, [], now);
  const monthly = buildPeriodAccountingSummary(report, 'monthly', state, [], now);
  const annual = buildPeriodAccountingSummary(report, 'annual', state, [], now);

  assert.equal(daily.multiplierHours, 24);
  assert.equal(monthly.multiplierHours, 24 * 30);
  assert.equal(annual.multiplierHours, 24 * 360);
  assert.ok(annual.kdvTax > monthly.kdvTax && monthly.kdvTax > daily.kdvTax);
  assert.equal(
    monthly.totalTaxes,
    monthly.kdvTax + monthly.muhtasarStopajTax + monthly.corporateTax + monthly.municipalTax
  );
  assert.equal(
    annual.totalAssets,
    annual.totalCashAssets + annual.totalRealEstateAssets + annual.totalStockAssets + annual.totalBankAssets
  );
  assert.equal(annual.netEquity, annual.totalAssets - annual.totalLiabilities);
});

test('v1.4.0-fix Startup Resilience: corrupt localStorage recovery & non-blocking withSafeTimeout', async () => {
  // Corrupt JSON strings & type mismatches return safe defaults without throwing
  const defaultObj = { theme: 'light', soundEnabled: true };
  assert.deepEqual(safeJsonParse('{bad-json', defaultObj), defaultObj);
  assert.deepEqual(safeJsonParse('null', defaultObj), defaultObj);
  assert.deepEqual(safeJsonParse('[1,2,3]', defaultObj), defaultObj);
  assert.deepEqual(safeJsonParse('{"theme":"dark","soundEnabled":false}', defaultObj), {
    theme: 'dark',
    soundEnabled: false,
  });

  // Corrupt or throwing storage adapter never crashes safeReadStorageJson
  const corruptStorage = {
    getItem: (key: string) => {
      if (key === 'throws') throw new Error('WebView storage quota error');
      if (key === 'corrupt') return '{"cash": NaN_BROKEN';
      if (key === 'wrong_shape') return '{"cash":"not-a-number"}';
      return '{"cash":500000}';
    },
  };
  const isCashObj = (v: unknown): v is { cash: number } =>
    typeof v === 'object' &&
    v !== null &&
    typeof (v as { cash?: unknown }).cash === 'number' &&
    Number.isFinite((v as { cash: number }).cash);

  assert.deepEqual(safeReadStorageJson('throws', { cash: 250_000 }, isCashObj, corruptStorage), {
    cash: 250_000,
  });
  assert.deepEqual(safeReadStorageJson('corrupt', { cash: 250_000 }, isCashObj, corruptStorage), {
    cash: 250_000,
  });
  assert.deepEqual(
    safeReadStorageJson('wrong_shape', { cash: 250_000 }, isCashObj, corruptStorage),
    { cash: 250_000 }
  );
  assert.deepEqual(safeReadStorageJson('valid', { cash: 250_000 }, isCashObj, corruptStorage), {
    cash: 500_000,
  });

  // Slow hanging Supabase promise resolves cleanly to fallback after timeout
  const hanging = new Promise<string>(() => {});
  const timedOut = await withSafeTimeout(hanging, 120, 'local-fallback', 'hanging-test');
  assert.equal(timedOut, 'local-fallback');

  // Rejected promise resolves cleanly to fallback without throwing
  const failing = Promise.reject(new Error('Network offline'));
  const recovered = await withSafeTimeout(failing, 500, 'offline-ok', 'failing-test');
  assert.equal(recovered, 'offline-ok');

  // Fast successful promise returns actual value
  const okVal = await withSafeTimeout(Promise.resolve('live-data'), 500, 'fallback', 'ok-test');
  assert.equal(okVal, 'live-data');
});

test('v1.4.1 Realistic Turkish Pricing (₺200 coffee / 70-80% expense ratio), Multi-Billion Sectors & Negative Cash on Loss', () => {
  const now = 2_200_000;
  const fresh = createInitialEmpireState(now, 34);
  assert.equal(fresh.cash, STARTING_CASH);
  assert.equal(fresh.cash, 3_000_000);
  assert.equal(fresh.brandRecognition, STARTING_BRAND_RECOGNITION);
  assert.equal(fresh.officeTierId, 'home_office');

  // Realistic unit price & establishment capitals
  const kafeBp = getBlueprintById('kafe')!;
  const avmBp = getBlueprintById('avm')!;
  const energyBp = getBlueprintById('enerji_santrali')!;
  assert.equal(kafeBp.unitSalePrice, 200);
  assert.ok(kafeBp.baseCost >= 1_500_000, 'Kafe setup must be in millions TL');
  assert.ok(avmBp.baseCost >= 600_000_000, 'AVM must be hundreds of millions TL');
  assert.ok(energyBp.baseCost >= 1_000_000_000, 'Enerji Santrali must be 1B+ TL');
  assert.equal(BANK_MIN_NET_WORTH, 5_000_000_000);
  assert.equal(BANK_LICENSE_COST, 1_000_000_000);
  assert.equal(BANK_MIN_POOL_CAPITAL, 2_000_000_000);

  // Neglected low-service branch operating with low cash closes day at a LOSS and drives cash NEGATIVE (< 0)
  let state = { ...fresh, cash: 5_000_000 };
  const built = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Zarar Kafe', { id: 'p1', name: 'Patron' }, [], now);
  assert.equal(built.ok, true);
  state = {
    ...openAllBranches(built.state),
    cash: 2_000, // very low cash reserve so a loss day pushes treasury into negative!
    businesses: built.state.businesses.map((b) => ({
      ...b,
      constructionDaysRemaining: 0,
      stockLevel: 10,
      maintenanceLevel: 15,
      staffMorale: 30,
      employees: [],
    })),
  };

  const dayTick = tickEconomy(state, 40, now + 40_000);
  assert.equal(dayTick.daysPassed, 1);
  assert.ok(dayTick.dayEndSummary);
  assert.equal(dayTick.dayEndSummary.branchLines[0].isLoss, true, 'Neglected branch with low traffic must close the day at a loss');
  const settled = collectDayEndReport(dayTick.state);
  assert.equal(settled.ok, true);
  assert.ok(settled.state.cash < 0, 'Settling a loss day with low reserves must push treasury cash below 0 (eksi kasa)');
});

test('v1.4.1 Service Quality (1.0-5.0★) collapses traffic on low staffing/hygiene and Brand Recognition grows/decays over days', () => {
  const now = 2_300_000;
  let state = createInitialEmpireState(now, 34);
  state.cash = 10_000_000;
  const owner = { id: 'p1', name: 'Patron' };
  const built = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Kalite Kafe', owner, [], now);
  assert.equal(built.ok, true);
  state = openAllBranches(built.state);

  // Unstaffed & neglected branch has terrible service quality & crashed traffic
  const neglectedBiz = {
    ...state.businesses[0],
    stockLevel: 15,
    maintenanceLevel: 20,
    staffMorale: 35,
    employees: [],
  };
  const badReport = calculateBranchServiceQuality(neglectedBiz, state.cityManagers, [neglectedBiz]);
  assert.ok(badReport.stars < 2.5, 'Neglected unstaffed branch must drop below 2.5★');
  assert.ok(badReport.customerTrafficMultiplier < 0.5, 'Poor service quality must sharply reduce customer traffic');
  assert.ok(badReport.issues.length >= 2);

  // Invest in Quality & Training + hire 2 staff -> stars & traffic surge significantly
  let improvedState = state;
  const pool = generateCandidatePool(8881, 'kafe');
  const workers = pool.filter((c) => c.role === 'calisan').slice(0, 2);
  for (const w of workers) {
    const h = hireCandidateFromPool({ ...improvedState, candidatePool: pool }, w.id, improvedState.businesses[0].id, 34, now + 50);
    if (h.ok) improvedState = h.state;
  }
  const invested = investInBranchQuality(improvedState, improvedState.businesses[0].id, now + 100);
  assert.equal(invested.ok, true);
  const goodReport = calculateBranchServiceQuality(
    invested.state.businesses[0],
    invested.state.cityManagers,
    invested.state.businesses
  );
  assert.ok(goodReport.stars > badReport.stars + 1.2, 'Staffing + quality investment must raise service quality stars');
  assert.ok(goodReport.customerTrafficMultiplier > badReport.customerTrafficMultiplier * 1.8);

  // Good service grows brandRecognition across a day; bad service decays it
  const brandBefore = invested.state.brandRecognition ?? 5;
  const goodDay = tickEconomy(invested.state, 40, now + 40_000);
  assert.ok((goodDay.state.brandRecognition ?? 0) > brandBefore, 'Good service quality should gradually increase brand recognition');

  const badBrandState = {
    ...state,
    brandRecognition: 20,
    businesses: [neglectedBiz],
  };
  const badDay = tickEconomy(badBrandState, 40, now + 80_000);
  assert.ok((badDay.state.brandRecognition ?? 20) < 20, 'Poor service quality must decay brand recognition');
});

test('v1.4.1 Strict Bank Credit Audit rejects brand-new/low-brand/low-prestige/loss firms and unlocks with office interest discount', () => {
  const now = 2_400_000;
  let state = createInitialEmpireState(now, 34);
  state.cash = 10_000_000;
  const owner = { id: 'p1', name: 'Patron' };
  const built = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Yeni Kafe', owner, [], now);
  assert.equal(built.ok, true);
  state = openAllBranches(built.state);

  const bank = DEFAULT_SYSTEM_BANKS[0];
  // Brand-new Day 1 firm with Home Office & 5% brand recognition MUST BE REJECTED with explicit Turkish reasons
  const auditDay1 = evaluateLoanEligibility(state, bank, 1_000_000, state.businesses[0], 3_000_000);
  assert.equal(auditDay1.eligible, false);
  assert.ok(auditDay1.reasons.length >= 3);
  assert.ok(auditDay1.checks.some((c) => c.id === 'tenure' && !c.passed));
  assert.ok(auditDay1.checks.some((c) => c.id === 'brand' && !c.passed));
  assert.ok(auditDay1.checks.some((c) => c.id === 'office' && !c.passed));

  const rejectedLoan = takeLoanFromBank(state, bank, 1_000_000, state.businesses[0], 3_000_000, owner, 180, now);
  assert.equal(rejectedLoan.ok, false);
  assert.ok((rejectedLoan.error ?? '').includes('Kredi başvurusu reddedildi'));

  // Negative cash also strictly blocks credit even if established
  const negCashQualified = { ...makeBankQualifiedState(state), cash: -50_000 };
  const negAudit = evaluateLoanEligibility(negCashQualified, bank, 1_000_000, negCashQualified.businesses[0], 3_000_000);
  assert.equal(negAudit.eligible, false);
  assert.ok(negAudit.checks.some((c) => c.id === 'profitability' && !c.passed));

  // Satisfying tenure (>=15d), brand (>=15%), office prestige (>=20), positive balance & collateral -> APPROVED!
  const qualified = makeBankQualifiedState(state);
  assert.ok(BANK_MIN_OPERATING_DAYS === 15);
  assert.ok(BANK_MIN_BRAND_RECOGNITION === 15);
  assert.ok(BANK_MIN_OFFICE_PRESTIGE === 20);
  const okAudit = evaluateLoanEligibility(qualified, bank, 1_000_000, qualified.businesses[0], 3_000_000);
  assert.equal(okAudit.eligible, true);
  // Plaza office grants loan interest discount vs Home Office base rate
  const baseRateNoOffice = calculateEffectiveInterestRate(bank.baseInterestRate, qualified.creditScore, 0);
  assert.ok(okAudit.effectiveInterestRate < baseRateNoOffice, 'High-prestige office must reduce effective loan interest rate');
});

test('v1.4.1 Ofisim System: 4 Office Tiers, Equipment Upgrades, Personal Assets, B2B Supply Discount & Executive HR Gate', () => {
  const now = 2_500_000;
  let state = createInitialEmpireState(now, 34);
  assert.equal(OFFICE_TIERS.length, 4);
  assert.equal(OFFICE_UPGRADES.length, 6);
  assert.equal(PERSONAL_ASSETS.length, 5);

  // Home Office starts at 10 prestige and blocks Bölge Sorumlusu / Genel Müdür / CEO
  const homeBenefits = calculateOfficeBenefits(state);
  assert.equal(homeBenefits.tier.id, 'home_office');
  assert.equal(homeBenefits.officePrestige, 10);
  assert.equal(canOfficeHireRole(state, 'sube_muduru').allowed, true);
  assert.equal(canOfficeHireRole(state, 'bolge_sorumlusu').allowed, false);
  assert.equal(canOfficeHireRole(state, 'genel_mudur').allowed, false);
  assert.equal(canOfficeHireRole(state, 'ceo').allowed, false);

  // Buy starter office equipment (Yönetici Masası + Toplantı Salonu) -> increases prestige & supply discount
  const desk = buyOfficeUpgrade(state, 'exec_desk', now);
  assert.equal(desk.ok, true);
  const meeting = buyOfficeUpgrade(desk.state, 'meeting_room', now + 10);
  assert.equal(meeting.ok, true);
  const afterEquip = calculateOfficeBenefits(meeting.state);
  assert.ok(afterEquip.officePrestige >= 26);
  assert.ok(afterEquip.supplyDiscountRate > 0);

  // Upgrade to Plaza Katı requires >= 15% brand recognition
  const plazaBlocked = upgradeOfficeTier({ ...meeting.state, cash: 50_000_000, brandRecognition: 8 }, 'plaza_floor', now + 20);
  assert.equal(plazaBlocked.ok, false);

  const plazaOk = upgradeOfficeTier({ ...meeting.state, cash: 50_000_000, brandRecognition: 20 }, 'plaza_floor', now + 30);
  assert.equal(plazaOk.ok, true);
  assert.equal(canOfficeHireRole(plazaOk.state, 'bolge_sorumlusu').allowed, true);
  assert.equal(canOfficeHireRole(plazaOk.state, 'genel_mudur').allowed, false);

  // Buy Personal Asset -> adds prestige, brand recognition & counts in Net Worth!
  const nwBeforeAsset = calculateNetWorth(plazaOk.state, now + 40);
  const watchRes = buyPersonalAsset(plazaOk.state, 'classic_watch', now + 40);
  assert.equal(watchRes.ok, true);
  assert.ok((watchRes.state.brandRecognition ?? 0) > (plazaOk.state.brandRecognition ?? 0));
  assert.ok(calculateOfficeBenefits(watchRes.state).officePrestige > calculateOfficeBenefits(plazaOk.state).officePrestige);
  // Personal asset preserves Net Worth (cash converted into owned luxury asset equity)
  assert.equal(calculateNetWorth(watchRes.state, now + 40), nwBeforeAsset);
});

test('v1.4.3 Account Validation, Salted Password Hashing & Supabase Adapter Register/Login Flow', async () => {
  const emptyReg = validateRegistrationInput({ username: '', password: '', displayName: '' });
  assert.equal(emptyReg.ok, false);

  const badUsername = validateRegistrationInput({
    username: 'Patron!#',
    password: '1234',
    displayName: 'Kemal Holding',
  });
  assert.equal(badUsername.ok, false);

  const shortPass = validateRegistrationInput({
    username: 'kemal34',
    password: '123',
    displayName: 'Kemal Holding',
  });
  assert.equal(shortPass.ok, false);

  const missingDisplay = validateRegistrationInput({
    username: 'kemal34',
    password: '1234',
    displayName: '   ',
  });
  assert.equal(missingDisplay.ok, false);

  const emptyLogin = validateLoginInput({ username: '', password: '1234' });
  assert.equal(emptyLogin.ok, false);

  // Per-user salted PBKDF2 hashing never stores plaintext and verifies accurately
  const hash1 = await hashPassword('gizli2026');
  const hash2 = await hashPassword('gizli2026');
  assert.notEqual(hash1, 'gizli2026');
  assert.notEqual(hash1, hash2, 'Each account hash must use a unique random salt');
  assert.equal(await verifyPassword('gizli2026', hash1), true);
  assert.equal(await verifyPassword('yanlis99', hash1), false);

  // In-memory Supabase player_accounts table adapter
  const rows = new Map<string, PlayerAccountRow>();
  const mockDb: PlayerAccountsDbAdapter = {
    async findByUsername(username) {
      return { row: rows.get(username) ?? null };
    },
    async createAccount(payload) {
      if (rows.has(payload.username)) {
        return { row: null, error: { code: '23505', message: 'duplicate key value' } };
      }
      const created: PlayerAccountRow = {
        ...payload,
        created_at: new Date().toISOString(),
      };
      rows.set(payload.username, created);
      return { row: created };
    },
  };

  // Register new account -> returns id (owner_id), username, and mandatory display_name
  const regOk = await registerPlayerAccountWithAdapter(
    { username: 'Patron34', password: 'sifre2026', displayName: 'Kemal Holding' },
    mockDb,
    false
  );
  assert.equal(regOk.ok, true);
  assert.ok(regOk.user);
  assert.equal(regOk.user.username, 'patron34');
  assert.equal(regOk.user.name, 'Kemal Holding');
  assert.equal(regOk.user.displayName, 'Kemal Holding');
  assert.equal(regOk.user.provider, 'account');
  assert.ok(regOk.user.id.length >= 10);

  // Duplicate username MUST be rejected with Turkish warning
  const dupReg = await registerPlayerAccountWithAdapter(
    { username: 'patron34', password: 'baska123', displayName: 'Başka Patron' },
    mockDb,
    false
  );
  assert.equal(dupReg.ok, false);
  assert.ok((dupReg.error ?? '').toLowerCase().includes('daha önce alınmış'));

  // Login with wrong password -> rejected
  const wrongLogin = await loginPlayerAccountWithAdapter(
    { username: 'patron34', password: 'hatali_sifre' },
    mockDb,
    false
  );
  assert.equal(wrongLogin.ok, false);
  assert.ok((wrongLogin.error ?? '').toLowerCase().includes('hatalı'));

  // Login with nonexistent username -> rejected
  const missingLogin = await loginPlayerAccountWithAdapter(
    { username: 'olmayan_kullanici', password: 'sifre2026' },
    mockDb,
    false
  );
  assert.equal(missingLogin.ok, false);

  // Login with correct credentials -> returns exact same id and display_name
  const okLogin = await loginPlayerAccountWithAdapter(
    { username: 'PATRON34', password: 'sifre2026' },
    mockDb,
    false
  );
  assert.equal(okLogin.ok, true);
  assert.equal(okLogin.user?.id, regOk.user.id);
  assert.equal(okLogin.user?.name, 'Kemal Holding');
});

test('v1.4.5 Unified Multiplayer Map Sync: deterministic UUID mapping, canonical upsert payload, schema fallback parser & live DB stats', () => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  // 1) Legacy non-UUID business ID converts deterministically to a valid RFC-4122 UUID
  const legacyId = 'biz-176400123-49182';
  const uuidA = ensureUuidForBusinessId(legacyId);
  const uuidB = ensureUuidForBusinessId(legacyId);
  assert.equal(uuidA, uuidB, 'Deterministic UUID must stay identical across syncs');
  assert.ok(uuidRegex.test(uuidA), `Expected valid v4 UUID, got ${uuidA}`);

  // Already-valid UUID passes through unchanged
  const nativeUuid = '156f51b8-95b0-4fed-a970-2afb214b6b57';
  assert.equal(ensureUuidForBusinessId(nativeUuid), nativeUuid);

  // 2) Upsert payload includes all requested fields: id, owner_id, owner_name, company_name, name, sector, level, hourly_revenue, lat, lng
  const rec = normalizeRecord({
    id: legacyId,
    owner_id: 'player-a',
    owner_name: 'Ahmet Yılmaz',
    company_name: 'Yılmaz Holding',
    name: 'Kadıköy Kafe',
    sector: 'kafe',
    level: 3,
    hourly_revenue: 14500,
    lat: 40.9909,
    lng: 29.0293,
  });
  assert.ok(rec);
  const payload = buildBusinessesUpsertPayload(rec);
  assert.equal(payload.id, uuidA);
  assert.equal(payload.owner_id, 'player-a');
  assert.equal(payload.owner_name, 'Ahmet Yılmaz');
  assert.equal(payload.company_name, 'Yılmaz Holding');
  assert.equal(payload.name, 'Kadıköy Kafe');
  assert.equal(payload.sector, 'kafe');
  assert.equal(payload.level, 3);
  assert.equal(payload.hourly_revenue, 14500);
  assert.equal(payload.lat, 40.9909);
  assert.equal(payload.lng, 29.0293);

  // 3) Schema fallback extractor parses both PostgREST PGRST204 and PostgreSQL 42703 errors
  assert.equal(
    extractMissingColumnName("Could not find the 'name' column of 'businesses' in the schema cache"),
    'name'
  );
  assert.equal(extractMissingColumnName('column businesses.latitude does not exist'), 'latitude');

  // 4) Live DB stats compute exact "DB Toplam: X | Rakip: Y" excluding current player (even across legacy ID -> UUID)
  const ownRow = normalizeRecord({
    id: uuidA,
    owner_id: 'player-a',
    owner_name: 'Ahmet Yılmaz',
    business_name: 'Kadıköy Kafe',
    business_type: 'kafe',
    lat: 40.9909,
    lng: 29.0293,
  })!;
  const rival1 = normalizeRecord({
    id: '256f51b8-95b0-4fed-a970-2afb214b6b51',
    owner_id: 'player-b',
    owner_name: 'Mehmet Demir',
    company_name: 'Demir A.Ş.',
    business_name: 'Ankara Restoran',
    sector: 'restoran',
    lat: 39.9208,
    lng: 32.8541,
  })!;
  const rival2 = normalizeRecord({
    id: '356f51b8-95b0-4fed-a970-2afb214b6b52',
    owner_id: 'player-c',
    owner_name: 'Ayşe Kaya',
    business_name: 'İzmir Otel',
    sector: 'otel',
    lat: 38.4237,
    lng: 27.1428,
  })!;

  const stats = computeWorldDbStats([ownRow, rival1, rival2], 'player-a', new Set([legacyId]));
  assert.equal(stats.dbTotal, 3);
  assert.equal(stats.rivalCount, 2);

  // mergeWorldAndSeedRivals must exclude ownRow even when ownIds contains the legacy non-UUID ID
  const merged = mergeWorldAndSeedRivals(
    [ownRow, rival1, rival2],
    [],
    'player-other',
    new Set([legacyId]),
    new Set()
  );
  assert.equal(merged.length, 2);
  assert.ok(merged.every((r) => r.id !== uuidA));
});

test('v1.5.0 Executive Dashboard Metrics: 7-day charts, 4 selectable account cards & 3 operational cards', () => {
  const now = 1_764_000_000_000;
  const quotes = createInitialStockQuotes();
  const baseState = createInitialEmpireState(now, 34);

  // 1) Fresh state produces 7 chart points, 7 weekly trend bars, 4 account cards & zero NaN
  const freshMetrics = computeExecutiveDashboardMetrics(baseState, quotes, now);
  assert.equal(freshMetrics.incomeExpenseSeries.length, 7);
  assert.equal(freshMetrics.weeklyTrends.length, 7);
  assert.equal(freshMetrics.accountCards.length, 4);
  assert.deepEqual(
    freshMetrics.accountCards.map((c) => c.id),
    ['cash', 'credit', 'investments', 'expenses']
  );
  assert.equal(freshMetrics.totalCash, baseState.cash);
  assert.equal(freshMetrics.branchCount, 0);
  assert.ok(Number.isFinite(freshMetrics.weeklyTrendDeltaPct));
  assert.ok(Number.isFinite(freshMetrics.dailyCashDeltaPct));

  // 2) Active empire with an operational branch & stock holding reflects real figures
  const pin = resolvePinLocation(41.0368, 28.9932, 34);
  const built = purchaseBusiness(
    { ...baseState, cash: 25_000_000 },
    'kafe',
    pin,
    'Karaköy Kahve',
    { id: 'u1', name: 'Patron' },
    [],
    now
  );
  assert.equal(built.ok, true);
  assert.ok(built.business);
  const operationalState = {
    ...built.state,
    businesses: built.state.businesses.map((b) => ({
      ...b,
      constructionDaysRemaining: 0,
      employees: [
        {
          id: 'emp-1',
          name: 'Deniz',
          role: 'calisan' as const,
          roleTitle: 'Barista',
          stars: 4 as const,
          speed: 82,
          efficiency: 85,
          leadership: 60,
          hourlySalary: 220,
          dailyWage: 1_200,
          dailyEmployerSgk: 270,
          hireCost: 12_000,
          hiredAt: now,
        },
      ],
    })),
    stockPortfolio: [{ ticker: quotes[0].ticker, shares: 100, avgCost: quotes[0].price }],
  };
  const activeMetrics = computeExecutiveDashboardMetrics(operationalState, quotes, now);
  assert.equal(activeMetrics.branchCount, 1);
  assert.ok(activeMetrics.avgServiceQuality > 0);
  assert.ok(activeMetrics.dailyEstimatedRevenue > 0);
  assert.ok(activeMetrics.dailyOperatingExpenses > 0);
  assert.ok(activeMetrics.stockPortfolioValue > 0);
  assert.ok(activeMetrics.investmentsTotal > activeMetrics.stockPortfolioValue);
  assert.equal(activeMetrics.accountCards[0].title, 'ANA İŞLETME KASASI');
  assert.equal(activeMetrics.accountCards[1].title, 'TİCARİ KREDİ & BANKA');
  assert.equal(activeMetrics.accountCards[2].title, 'YATIRIM & BORSA');
  assert.equal(activeMetrics.accountCards[3].title, 'OPERASYON GİDERİ');
});

test('v1.5.1 Ofisim & Prestij Yönetimi: 4 Equipment Upgrades (Sv.1-Sv.10), Real B2B Discounts & Billion-TL Holding Tower', () => {
  const now = 3_100_000;
  let state = createInitialEmpireState(now, 34);

  // 1) 4 required equipment tracks start at Sv. 1 and Holding Gökdeleni is in billions TL
  assert.equal(OFFICE_EQUIPMENT_ITEMS.length, 4);
  assert.deepEqual(
    OFFICE_EQUIPMENT_ITEMS.map((e) => e.id),
    ['exec_desk', 'meeting_room', 'guest_hospitality', 'security_secretariat']
  );
  const holdingTier = OFFICE_TIERS.find((t) => t.id === 'holding_tower');
  assert.ok(holdingTier && holdingTier.cost >= 1_000_000_000, 'Holding Gökdeleni must be >= 1 Milyar TL');
  assert.equal(getNextOfficeTier('bosphorus_suite')?.id, 'holding_tower');
  assert.equal(getNextOfficeTier('holding_tower'), null);

  for (const item of OFFICE_EQUIPMENT_ITEMS) {
    assert.equal(getOfficeEquipmentLevel(state, item.id), 1);
  }

  // 2) Upgrading equipment deducts cash, increments level, boosts prestige, B2B discounts & brand recognition
  const before = calculateOfficeBenefits(state);
  const deskCostLv1 = getOfficeEquipmentUpgradeCost('exec_desk', 1);
  assert.ok(deskCostLv1 > 0);

  // Insufficient cash guard
  const brokeAttempt = upgradeOfficeEquipment({ ...state, cash: 50_000 }, 'exec_desk', now);
  assert.equal(brokeAttempt.ok, false);

  state = { ...state, cash: 500_000_000 };
  const upDesk = upgradeOfficeEquipment(state, 'exec_desk', now + 10);
  assert.equal(upDesk.ok, true);
  assert.equal(upDesk.newLevel, 2);
  assert.equal(upDesk.state.cash, state.cash - deskCostLv1);
  assert.ok(getOfficeEquipmentUpgradeCost('exec_desk', 2) > deskCostLv1);

  const upMeeting = upgradeOfficeEquipment(upDesk.state, 'meeting_room', now + 20);
  const upGuest = upgradeOfficeEquipment(upMeeting.state, 'guest_hospitality', now + 30);
  const upSec = upgradeOfficeEquipment(upGuest.state, 'security_secretariat', now + 40);
  assert.equal(upSec.ok, true);

  const after = calculateOfficeBenefits(upSec.state);
  assert.ok(after.officePrestige > before.officePrestige, 'Equipment upgrades must increase officePrestige');
  assert.ok(after.supplyDiscountRate > before.supplyDiscountRate, 'Guest hospitality must raise supply discount');
  assert.ok(after.loanInterestDiscount > before.loanInterestDiscount, 'Meeting room must raise loan interest discount');
  assert.ok(after.loanLimitMultiplier > before.loanLimitMultiplier, 'Meeting room must raise loan limit multiplier');
  assert.ok((upSec.state.brandRecognition ?? 0) > (state.brandRecognition ?? 0), 'Upgrades must raise brand recognition');

  // 3) Max level (Sv. 10) guard
  const maxedState = {
    ...upSec.state,
    officeEquipmentLevels: { exec_desk: OFFICE_EQUIPMENT_MAX_LEVEL },
  };
  assert.equal(getOfficeEquipmentUpgradeCost('exec_desk', OFFICE_EQUIPMENT_MAX_LEVEL), 0);
  const maxAttempt = upgradeOfficeEquipment(maxedState, 'exec_desk', now + 50);
  assert.equal(maxAttempt.ok, false);
});

test('v1.5.2 Finans, Bankalar & Borsa 3-Column Command Center: Credit Eligibility Lock/Unlock, Mini Bars, 00:00 Pending Cash & BIST/IPO Sparkline', () => {
  const now = 3_200_000;
  const quotes = createInitialStockQuotes();

  // 1) Brand-new firm: credit is LOCKED, 4 mini bars, 12 BIST sparkline points, IPO locked
  const freshState = createInitialEmpireState(now, 34);
  const freshExec = computeExecutiveDashboardMetrics(freshState, quotes, now);
  const freshFin = computeFinanceCommandMetrics(freshState, quotes, freshExec, now);

  assert.equal(freshFin.creditUnlocked, false, 'New firm must have commercial credit locked');
  assert.ok(freshFin.creditEligibilityPct >= 6 && freshFin.creditEligibilityPct < 100);
  assert.ok(freshFin.creditLockSummary.startsWith('Kilitli'));
  assert.equal(freshFin.miniBars.length, 4);
  assert.equal(freshFin.bistSparklinePoints.length, 12);
  assert.ok(freshFin.bistIndexValue > 5_000);
  assert.ok(Number.isFinite(freshFin.bistDailyChangePct));
  assert.equal(freshFin.ipoEligible, false);
  assert.equal(freshFin.ipoTargetNetWorth, IPO_MIN_NET_WORTH);
  assert.equal(freshFin.accountingAutoActive, false);

  // 2) Mature profitable firm with pending 00:00 day-end cash, unpaid tax, stocks & high office prestige
  const matureState = {
    ...freshState,
    cash: 320_000_000,
    creditScore: 1450,
    gameMinutes: 25 * 1440,
    brandRecognition: 42,
    officeTierId: 'bosphorus_suite' as const,
    accountant: {
      id: 'acc-1',
      name: 'Selin Y.',
      title: 'Baş Muhasebeci',
      stars: 4 as const,
      taxOptimizationRate: 0.08,
      hourlySalary: 500,
      hireCost: 45_000,
      hiredAt: now,
    },
    pendingTaxes: [
      {
        id: 'tax-1',
        monthNumber: 1,
        dueGameDay: 30,
        amount: 245_000,
        breakdown: {
          kdv: 100_000,
          sgkStopaj: 65_000,
          corporateTax: 55_000,
          municipalTax: 25_000,
          totalTax: 245_000,
        },
        overdueDays: 0,
        status: 'pending' as const,
        createdAt: now,
      },
    ],
    pendingDayEndReports: [
      {
        id: 'de-24',
        completedDay: 24,
        month: 1,
        dayOfMonth: 24,
        dailyGrossRevenue: 1_200_000,
        dailySupplyCost: 420_000,
        dailyUtilitiesAndRent: 180_000,
        dailySalariesPaid: 150_000,
        dailyNetCashFlow: 450_000,
        manualCollectibleNet: 450_000,
        autoSettledNet: 0,
        creditScoreDelta: 12,
        weeklyDividendPaid: 0,
        monthlyClosing: null,
        branchLines: [],
        collected: false,
      },
    ],
    stockPortfolio: [{ ticker: quotes[0].ticker, shares: 500, avgCost: quotes[0].price }],
  };
  const matureExec = computeExecutiveDashboardMetrics(matureState, quotes, now);
  const matureFin = computeFinanceCommandMetrics(matureState, quotes, matureExec, now);

  assert.equal(matureFin.creditUnlocked, true, 'Mature profitable firm must unlock commercial credit');
  assert.equal(matureFin.creditEligibilityPct, 100);
  assert.equal(matureFin.unpaidTaxCount, 1);
  assert.equal(matureFin.unpaidTaxTotal, 245_000);
  assert.equal(matureFin.accountingAutoActive, true);
  assert.equal(matureFin.pendingDayEndCount, 1);
  assert.equal(matureFin.pendingDayEndNetCash, 450_000);
  assert.equal(matureFin.stockPositionCount, 1);
  assert.equal(matureFin.ipoNetWorthPct, 100);

  // 3) Settling pending day-end cash transfers 450k into cash and clears pending count
  const settled = collectDayEndReport(matureState, undefined, now + 100);
  assert.equal(settled.ok, true);
  assert.equal(settled.state.cash, matureState.cash + 450_000);
  const postSettleExec = computeExecutiveDashboardMetrics(settled.state, quotes, now + 100);
  const postSettleFin = computeFinanceCommandMetrics(settled.state, quotes, postSettleExec, now + 100);
  assert.equal(postSettleFin.pendingDayEndCount, 0);
  assert.equal(postSettleFin.pendingDayEndNetCash, 0);
});

test('v1.5.5 3-Step İşletmeler Flow: Unlimited Branches (No Quota), 4-Card Metrics, Customization, Campaigns & Facility Upgrades', () => {
  const now = 3_500_000;
  let state = createInitialEmpireState(now, 34);
  state.cash = 40_000_000;
  const owner = { id: 'p-v155', name: 'Patron' };

  // 1) Branch quota cap is completely removed: starter tier can open 4+ branches freely
  const coords: Array<[number, number, string]> = [
    [41.0422, 29.0067, 'Kadıköy Kafe'],
    [41.0522, 29.0267, 'Beşiktaş Restoran'],
    [41.0722, 29.0167, 'Levent Market'],
    [41.0922, 29.0367, 'Maslak Kafe'],
  ];
  for (const [lat, lng, label] of coords) {
    const res = purchaseBusiness(state, 'kafe', landPin(lat, lng, 34), label, owner, [], now);
    assert.equal(res.ok, true, `Must allow unlimited branch creation for ${label}`);
    state = res.state;
  }
  assert.equal(state.businesses.length, 4, 'Starter company must be allowed to exceed old 3-branch quota');

  // Open all branches so revenue & service quality compute actively
  state = openAllBranches(state);
  const targetId = state.businesses[0].id;

  // 2) Adım 1 overview metrics reflect active branches, revenue, quality, and team
  const overview = computeBusinessesOverviewMetrics(state, now);
  assert.equal(overview.totalBranches, 4);
  assert.equal(overview.activeBranches, 4);
  assert.ok(overview.totalDailyRevenue > 0);
  assert.ok(overview.avgServiceQuality > 0);
  assert.ok(overview.leadBranch !== null);

  // 3) Adım 3 Col 1: Customize branch name, brand color, and concept icon
  const badRename = customizeBranchIdentity(state, targetId, { customName: 'A' }, now + 10);
  assert.equal(badRename.ok, false, 'Single-character name must be rejected');

  const customRes = customizeBranchIdentity(
    state,
    targetId,
    {
      customName: 'Moda Sahil Kafe',
      brandColor: BRANCH_BRAND_COLORS[1],
      conceptIcon: 'crown',
    },
    now + 20
  );
  assert.equal(customRes.ok, true);
  assert.equal(customRes.business?.customName, 'Moda Sahil Kafe');
  assert.equal(customRes.business?.brandColor, BRANCH_BRAND_COLORS[1]);
  assert.equal(customRes.business?.conceptIcon, 'crown');
  state = customRes.state;

  // 4) Adım 3 Col 2: Launch Lokal Broşür (₺5.000 / +%5 müşteri) & Sosyal Medya Reklamı (₺12.000 / +%15 müşteri)
  assert.equal(BRANCH_MARKETING_CAMPAIGNS[0].cost, 5_000);
  assert.equal(BRANCH_MARKETING_CAMPAIGNS[0].customerBoostPct, 5);
  assert.equal(BRANCH_MARKETING_CAMPAIGNS[1].cost, 12_000);
  assert.equal(BRANCH_MARKETING_CAMPAIGNS[1].customerBoostPct, 15);

  const preAdCash = state.cash;
  const preAdIncome = calculateBusinessIncomePerSec(
    state.businesses[0],
    null,
    now + 25,
    state.businesses,
    state
  );
  const adRes = launchBranchMarketingCampaign(state, targetId, 'social', now + 30);
  assert.equal(adRes.ok, true);
  assert.equal(adRes.state.cash, preAdCash - 12_000);
  assert.equal(adRes.state.businesses[0].activeAdCampaign?.tierId, 'social');
  const postAdIncome = calculateBusinessIncomePerSec(
    adRes.state.businesses[0],
    null,
    now + 35,
    adRes.state.businesses,
    adRes.state
  );
  assert.ok(postAdIncome > preAdIncome, 'Active branch ad campaign must lift revenue');
  state = adRes.state;

  // 5) Adım 3 Col 3: Facility upgrades increase track level, multiplier, and branch income
  assert.equal(BRANCH_UPGRADE_TRACKS.length, 3);
  const preMult = getBranchFacilityTotalMultiplier(state.businesses[0]);
  assert.equal(preMult, 1);

  const capUp = upgradeBranchFacility(state, targetId, 'capacity', now + 40);
  assert.equal(capUp.ok, true);
  assert.equal(getBranchFacilityLevel(capUp.business!, 'capacity'), 2);
  const eqUp = upgradeBranchFacility(capUp.state, targetId, 'equipment', now + 50);
  assert.equal(eqUp.ok, true);
  assert.equal(getBranchFacilityLevel(eqUp.business!, 'equipment'), 2);

  const postMult = getBranchFacilityTotalMultiplier(eqUp.business!);
  assert.ok(postMult >= 1.4, `Expected combined facility multiplier >= 1.4, got ${postMult}`);
  const postUpgradeIncome = calculateBusinessIncomePerSec(
    eqUp.business!,
    null,
    now + 60,
    eqUp.state.businesses,
    eqUp.state
  );
  assert.ok(postUpgradeIncome > postAdIncome, 'Facility upgrades must lift real branch income');
});

test('v1.5.7 Toplam Durum ve Raporlar Decision Center: Period Scaling, Expense Breakdown, Smart Alerts, Sector Donut & Bulk Actions', () => {
  const now = 3_800_000;
  let state = createInitialEmpireState(now, 34);
  state.cash = 150_000_000;
  const owner = { id: 'p-v157', name: 'Patron' };

  const b1 = purchaseBusiness(state, 'kafe', landPin(41.0422, 29.0067, 34), 'Kadıköy Kafe', owner, [], now);
  assert.equal(b1.ok, true, `Kadıköy Kafe purchase failed: ${b1.error}`);
  const b2 = purchaseBusiness(b1.state, 'restoran', landPin(41.0522, 29.0267, 34), 'Beşiktaş Restoran', owner, [], now + 5);
  assert.equal(b2.ok, true, `Beşiktaş Restoran purchase failed: ${b2.error}`);
  const b3 = purchaseBusiness(b2.state, 'supermarket', landPin(41.0722, 29.0167, 34), 'Levent Market', owner, [], now + 10);
  assert.equal(b3.ok, true, `Levent Market purchase failed: ${b3.error}`);
  state = openAllBranches(b3.state);

  // Give branches realistic staff & make Beşiktaş Restoran fatigued so operational warning triggers
  state = {
    ...state,
    businesses: state.businesses.map((biz, idx) => {
      const isFatigued = biz.customName === 'Beşiktaş Restoran';
      return {
      ...biz,
      staffMorale: isFatigued ? 58 : 90,
      maintenanceLevel: isFatigued ? 74 : 92,
      stockLevel: 90,
      staffCount: 2,
      employees: [
        {
          id: `emp-${idx}-1`,
          name: `Çalışan ${idx + 1}`,
          role: 'calisan' as const,
          roleTitle: 'Uzman',
          stars: 4 as const,
          speed: 78,
          efficiency: 76,
          leadership: 65,
          hourlySalary: 95,
          hireCost: 15_000,
          hiredAt: now - 5000,
        },
        {
          id: `emp-${idx}-2`,
          name: `Müdür ${idx + 1}`,
          role: 'sube_muduru' as const,
          roleTitle: 'Şube Müdürü',
          stars: 4 as const,
          speed: 82,
          efficiency: 84,
          leadership: 86,
          hourlySalary: 145,
          hireCost: 30_000,
          hiredAt: now - 5000,
        },
      ],
      };
    }),
  };

  // 1) Period filtering scales revenue & expense cleanly across 24h, 7d, 30d
  const rep24h = computeHoldingReportsSnapshot(state, '24h', now);
  const rep7d = computeHoldingReportsSnapshot(state, '7d', now);
  const rep30d = computeHoldingReportsSnapshot(state, '30d', now);

  assert.equal(rep24h.periodDays, 1);
  assert.equal(rep7d.periodDays, 7);
  assert.equal(rep30d.periodDays, 30);
  assert.equal(rep7d.totalRevenue, rep24h.totalRevenue * 7);
  assert.equal(rep30d.totalRevenue, rep24h.totalRevenue * 30);
  assert.equal(rep7d.trendSeries.length, 7);

  // 2) Expense breakdown sums to exactly 100%
  const expSum =
    rep24h.expenseBreakdown.personnelPct +
    rep24h.expenseBreakdown.rentTaxPct +
    rep24h.expenseBreakdown.supplyOpsPct;
  assert.equal(expSum, 100, `Expense breakdown must sum to 100%, got ${expSum}`);
  assert.ok(rep24h.expenseBreakdown.personnelCost > 0);
  assert.ok(rep24h.expenseBreakdown.rentTaxCost > 0);
  assert.ok(rep24h.expenseBreakdown.supplyOpsCost > 0);

  // 3) Smart Alerts detect BOTH operational warning (fatigued Beşiktaş Restoran) & growth opportunity
  assert.ok(
    rep24h.alerts.some((a) => a.type === 'warning' && a.businessName === 'Beşiktaş Restoran'),
    'Must flag fatigued Beşiktaş Restoran as operational warning'
  );
  assert.ok(
    rep24h.alerts.some((a) => a.type === 'opportunity'),
    'Must identify a high-performing branch as growth opportunity'
  );

  // 4) Sector donut slices sum to 100% across Kafe, Restoran, Market
  assert.equal(rep24h.sectorSlices.length, 3);
  const sectorPctSum = rep24h.sectorSlices.reduce((s, x) => s + x.sharePct, 0);
  assert.equal(sectorPctSum, 100, `Sector distribution must sum to 100%, got ${sectorPctSum}`);

  // 5) Bulk Holding Action 1: Launch Holding-Wide Ads across all 3 active branches
  const cashBeforeAds = state.cash;
  const brandBeforeAds = state.brandRecognition ?? 5;
  const bulkAdsRes = launchHoldingWideAdCampaign(state, now + 100);
  assert.equal(bulkAdsRes.ok, true);
  assert.equal(bulkAdsRes.affectedBranches, 3);
  assert.equal(bulkAdsRes.state.cash, cashBeforeAds - rep24h.bulkAdCost);
  assert.ok((bulkAdsRes.state.brandRecognition ?? 0) > brandBeforeAds);
  assert.ok(
    bulkAdsRes.state.businesses.every((b) => b.activeAdCampaign?.label === 'Toplu Holding Kampanyası'),
    'Every active branch must receive the holding-wide campaign'
  );

  // 6) Bulk Holding Action 2: Distribute Staff Bonus cuts fatigue & lifts morale + efficiency
  const cashBeforeBonus = bulkAdsRes.state.cash;
  const moraleBefore = bulkAdsRes.state.businesses[1].staffMorale ?? 0;
  const effBefore = bulkAdsRes.state.businesses[1].employees![0].efficiency;
  const bonusRes = distributeHoldingStaffBonus(bulkAdsRes.state, now + 200);
  assert.equal(bonusRes.ok, true);
  assert.equal(bonusRes.state.cash, cashBeforeBonus - rep24h.bulkBonusCost);
  assert.ok((bonusRes.state.businesses[1].staffMorale ?? 0) > moraleBefore);
  assert.ok(bonusRes.state.businesses[1].employees![0].efficiency > effBefore);

  // 7) Optimum fallback: when all branches have 100 morale/stock/maint, >=3 staff & maxed capacity/equipment, alerts array is empty
  const optimumState: EmpireState = {
    ...bonusRes.state,
    businesses: bonusRes.state.businesses.map((b) => ({
      ...b,
      staffMorale: 100,
      maintenanceLevel: 100,
      stockLevel: 100,
      capacityLevel: 10,
      equipmentLevel: 10,
      employees: [
        ...(b.employees ?? []),
        {
          id: `extra-${b.id}`,
          name: 'Ekstra',
          role: 'calisan' as const,
          roleTitle: 'Uzman',
          stars: 5 as const,
          speed: 95,
          efficiency: 95,
          leadership: 90,
          hourlySalary: 95,
          hireCost: 20_000,
          hiredAt: now,
        },
      ],
    })),
  };
  assert.equal(scanSmartBranchAlerts(optimumState, now + 300).length, 0);
});

test('v1.5.8 İK & Personel Yönetimi: Strict Branch Limits (4 Çalışan, 1 Müdür Yrd., 1 Şube Müdürü = 6 Slot), Slot Assign, Promotion Guard & Salary Labels', () => {
  const now = 3_900_000;
  let state = createInitialEmpireState(now, 32); // Isparta
  state.cash = 25_000_000;
  const owner = { id: 'p-v158', name: 'Patron' };

  const b1 = purchaseBusiness(state, 'kafe', landPin(37.7648, 30.5566, 32), 'Isparta Merkez Kafe', owner, [], now);
  assert.equal(b1.ok, true);
  state = openAllBranches(b1.state);
  const bizId = state.businesses[0].id;

  // Populate rich candidate pool with workers, assistant managers, and branch managers
  state = {
    ...state,
    candidatePool: [
      ...generateCandidatePool(101, 'kafe'),
      ...generateCandidatePool(202, 'kafe'),
    ],
  };

  assert.equal(MAX_BRANCH_TOTAL_SLOTS, 6);
  assert.equal(getBranchTotalStaffCount(state.businesses[0]), 0);

  // 1) Assign 4 Çalışan via empty-slot ATA helper -> 5th Çalışan MUST be blocked with exact alert text
  for (let i = 1; i <= 4; i += 1) {
    const res = assignFirstCandidateForRole(state, bizId, 'calisan', now + i * 10);
    assert.equal(res.ok, true, `Worker #${i} assignment should succeed: ${res.error}`);
    state = res.state;
  }
  assert.equal(getBranchStaffSlots(state.businesses[0]).workers, 4);

  const worker5Res = assignFirstCandidateForRole(state, bizId, 'calisan', now + 50);
  assert.equal(worker5Res.ok, false, '5th worker must be strictly rejected');
  assert.ok(
    (worker5Res.error ?? '').includes(BRANCH_LIMIT_ERROR_TEXT),
    `Expected exact limit error, got: ${worker5Res.error}`
  );

  // Also direct hireCandidateFromPool for a 5th worker must be rejected with exact text
  const extraWorker = state.candidatePool.find((c) => c.role === 'calisan');
  assert.ok(extraWorker, 'Pool must still contain a worker candidate');
  const directWorker5 = hireCandidateFromPool(state, extraWorker!.id, bizId, 32, now + 55);
  assert.equal(directWorker5.ok, false);
  assert.ok((directWorker5.error ?? '').includes(BRANCH_LIMIT_ERROR_TEXT));

  // 2) Assign 1 Müdür Yrd. & 1 Şube Müdürü -> 2nd of either MUST be strictly blocked
  const amRes = assignFirstCandidateForRole(state, bizId, 'mudur_yardimcisi', now + 60);
  assert.equal(amRes.ok, true, `Assistant manager assignment failed: ${amRes.error}`);
  state = amRes.state;
  const am2Res = assignFirstCandidateForRole(state, bizId, 'mudur_yardimcisi', now + 70);
  assert.equal(am2Res.ok, false);
  assert.ok((am2Res.error ?? '').includes(BRANCH_LIMIT_ERROR_TEXT));

  const bmRes = assignFirstCandidateForRole(state, bizId, 'sube_muduru', now + 80);
  assert.equal(bmRes.ok, true, `Branch manager assignment failed: ${bmRes.error}`);
  state = bmRes.state;
  const bm2Res = assignFirstCandidateForRole(state, bizId, 'sube_muduru', now + 90);
  assert.equal(bm2Res.ok, false);
  assert.ok((bm2Res.error ?? '').includes(BRANCH_LIMIT_ERROR_TEXT));

  assert.equal(getBranchTotalStaffCount(state.businesses[0]), 6);
  assert.equal(checkBranchRoleSlotAvailable(state.businesses[0], 'calisan').ok, false);
  assert.equal(checkBranchRoleSlotAvailable(state.businesses[0], 'mudur_yardimcisi').ok, false);
  assert.equal(checkBranchRoleSlotAvailable(state.businesses[0], 'sube_muduru').ok, false);

  // 3) Promotion while management slot is full must be blocked with exact limit error
  const firstWorker = state.businesses[0].employees!.find((e) => e.role === 'calisan')!;
  const blockedPromo = promoteBranchEmployee(state, bizId, firstWorker.id, now + 100);
  assert.equal(blockedPromo.ok, false);
  assert.ok((blockedPromo.error ?? '').includes(BRANCH_LIMIT_ERROR_TEXT));

  // 4) Dismiss Assistant Manager -> opens 0/1 slot -> promoting a worker succeeds cleanly
  const currentAm = state.businesses[0].employees!.find((e) => e.role === 'mudur_yardimcisi')!;
  const dismissRes = dismissStaffMember(state, currentAm.id, bizId, now + 110);
  assert.equal(dismissRes.ok, true);
  state = dismissRes.state;
  assert.equal(getBranchStaffSlots(state.businesses[0]).assistantManagers, 0);

  const promoRes = promoteBranchEmployee(state, bizId, firstWorker.id, now + 120);
  assert.equal(promoRes.ok, true, `Promotion should succeed when Müd. Yrd. slot is open: ${promoRes.error}`);
  state = promoRes.state;
  assert.equal(getBranchStaffSlots(state.businesses[0]).assistantManagers, 1);
  assert.equal(getBranchStaffSlots(state.businesses[0]).workers, 3);

  // 5) Salary labels format 1-2 star workers as Asgari Ücret and managers as ₺.../ay
  const starterWorker = { role: 'calisan' as const, stars: 1 as const, hourlySalary: 45 };
  const seniorManager = { role: 'sube_muduru' as const, stars: 4 as const, hourlySalary: 120 };
  assert.equal(formatCandidateSalaryLabel(starterWorker), 'Asgari Ücret');
  assert.ok(formatCandidateSalaryLabel(seniorManager).endsWith('/ay'));
});

test('v1.6.0 Quick Actions Modules (Holding Promos, Rental Leases, Daily Offers, Store) & Offline OTA Fallback', async () => {
  const now = 6_000_000;
  let state = createInitialEmpireState(now, 34);
  state.cash = 10_000_000;

  // 1) Holding-wide promotion boosts brandRecognition & deducts cash
  const prevBrand = state.brandRecognition ?? 5;
  const promoRes = launchHoldingPromotion(state, 'social_media', now);
  assert.equal(promoRes.ok, true);
  assert.ok(promoRes.state.cash < state.cash);
  assert.ok((promoRes.state.brandRecognition ?? 0) > prevBrand);
  assert.equal(promoRes.state.activeHoldingPromo?.tierId, 'social_media');
  state = promoRes.state;

  // 2) Rental properties: purchase + sign tenant lease -> generates daily passive rent on 30s day tick
  const catalog = getMergedRentalProperties(state);
  assert.ok(catalog.length >= 6);
  const firstProp = catalog[0];
  const buyRes = buyRentalProperty(state, firstProp.catalogId, undefined, now + 10);
  assert.equal(buyRes.ok, true);
  assert.equal(buyRes.property?.owned, true);
  state = buyRes.state;

  const leaseRes = signLeaseContract(
    state,
    firstProp.catalogId,
    firstProp.tenantOffers[0].id,
    now + 20
  );
  assert.equal(leaseRes.ok, true);
  state = leaseRes.state;
  const dailyRent = calculateDailyRentalIncome(state);
  assert.ok(dailyRent > 0, 'Leased property must produce daily passive rent');

  const cashBeforeDay = state.cash;
  const dayTick = tickEconomy(state, 30, now + 30_020);
  assert.equal(dayTick.daysPassed, 1);
  assert.ok(
    dayTick.state.cash >= cashBeforeDay + dailyRent,
    '30-second day turnover must credit passive daily rental income'
  );
  state = dayTick.state;

  // 3) Daily timed offers: accept partnership offer & decline another
  const offers = ensureDailyOffersForDay(state);
  assert.ok(offers.length >= 2);
  const partnerOffer = offers.find((o) => o.kind === 'partnership_bonus')!;
  const cashBeforeOffer = state.cash;
  const acceptRes = acceptDailyOffer(state, partnerOffer.id, now + 40_000);
  assert.equal(acceptRes.ok, true);
  assert.ok(acceptRes.state.cash > cashBeforeOffer);
  state = acceptRes.state;

  const supplyOffer = offers.find((o) => o.kind === 'supply_discount')!;
  const declineRes = declineDailyOffer(state, supplyOffer.id, now + 40_100);
  assert.equal(declineRes.ok, true);
  assert.equal(
    declineRes.state.dailyOffers?.find((o) => o.id === supplyOffer.id)?.status,
    'declined'
  );
  state = declineRes.state;

  // 4) Holding Store perk purchase
  const prevScore = state.creditScore;
  const storeRes = purchaseStorePerk(state, 'store-credit-audit', now + 40_200);
  assert.equal(storeRes.ok, true);
  assert.ok(storeRes.state.creditScore > prevScore);

  // 5) OTA check never throws when unreachable and cleanly falls back to local bundle
  const otaFallback = await checkForOtaUpdate('1.7.0', 'http://127.0.0.1:1/unreachable-version.json');
  assert.equal(otaFallback.hasUpdate, false);
  assert.equal(otaFallback.fallbackLocal, true);
});
