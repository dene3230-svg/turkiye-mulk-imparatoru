import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialEmpireState,
  purchaseBusiness,
  tickEconomy,
  collectBusinessCash,
  upgradeBusiness,
  hireStaff,
  sellBusiness,
  claimMissionReward,
  takeoverCompetitorBusiness,
  checkMinDistance75m,
  calculateBusinessIncomePerSec,
  calculateTakeoverPrice,
  getCompanyTier,
  formatTL,
} from './economy';
import {
  TURKEY_PROVINCES,
  GEOGRAPHIC_REGIONS,
  resolvePinLocation,
  isPointInTurkey,
} from './provinces81';
import {
  checkLocalWaterShield,
  evaluateNominatimReverse,
} from './waterShield';
import { BUSINESS_BLUEPRINTS, MISSION_CATALOG } from './catalog';
import { APP_VERSION, compareSemver } from '../services/otaUpdate';
import type { RemoteBusinessRecord } from '../types/game';

const TEST_OWNER = { id: 'player-1', name: 'Test Yatırımcı' };

test('all 81 Turkish provinces (01 Adana - 81 Düzce) and 7 regions are defined completely', () => {
  assert.equal(TURKEY_PROVINCES.length, 81);
  const plates = new Set(TURKEY_PROVINCES.map((p) => p.plate));
  assert.equal(plates.size, 81);
  assert.equal(TURKEY_PROVINCES[0].name, 'Adana');
  assert.equal(TURKEY_PROVINCES[31].name, 'Isparta');
  assert.equal(TURKEY_PROVINCES[33].name, 'İstanbul');
  assert.equal(TURKEY_PROVINCES[80].name, 'Düzce');

  const regionsUsed = new Set(TURKEY_PROVINCES.map((p) => p.region));
  assert.equal(regionsUsed.size, GEOGRAPHIC_REGIONS.length);
});

test('all 8 requested business sectors exist with realistic tiers and locks', () => {
  const ids = BUSINESS_BLUEPRINTS.map((b) => b.id);
  assert.deepEqual(ids, [
    'kafe',
    'internet_kafe',
    'ps_salonu',
    'oyun_merkezi',
    'restoran',
    'supermarket',
    'otel',
    'avm',
  ]);
  assert.equal(BUSINESS_BLUEPRINTS[0].minCompanyLevel, 1);
  assert.equal(BUSINESS_BLUEPRINTS[7].minCompanyLevel, 5);
});

test('water shield blocks seas, straits, and major Turkish lakes while allowing Turkish land', () => {
  // Bosphorus water point
  assert.equal(checkLocalWaterShield(41.045, 29.042)?.status, 'water');
  // Sea of Marmara
  assert.equal(checkLocalWaterShield(40.72, 28.3)?.status, 'water');
  // Van Lake
  assert.equal(checkLocalWaterShield(38.63, 42.92)?.status, 'water');
  // Tuz Lake
  assert.equal(checkLocalWaterShield(38.76, 33.41)?.status, 'water');
  // Eğirdir Lake
  assert.equal(checkLocalWaterShield(38.04, 30.87)?.status, 'water');
  // Outside Turkey
  assert.equal(isPointInTurkey(48.85, 2.35), false);

  // Land coordinates pass local shield
  assert.equal(checkLocalWaterShield(41.043, 29.004), null); // Beşiktaş
  assert.equal(checkLocalWaterShield(37.7648, 30.5566), null); // Isparta center
  assert.equal(checkLocalWaterShield(39.9208, 32.8541), null); // Ankara Kızılay

  // Nominatim reverse classifier
  const waterRes = evaluateNominatimReverse({
    category: 'natural',
    type: 'water',
    name: 'Marmara Denizi',
    address: { sea: 'Marmara Denizi' },
  });
  assert.equal(waterRes.isLand, false);
  assert.equal(waterRes.status, 'water');

  const landRes = evaluateNominatimReverse({
    category: 'highway',
    type: 'residential',
    address: {
      country_code: 'tr',
      road: 'Barbaros Bulvarı',
      suburb: 'Beşiktaş',
      city: 'İstanbul',
    },
  });
  assert.equal(landRes.isLand, true);
  assert.equal(landRes.status, 'valid');
  assert.equal(landRes.resolvedDistrict, 'Beşiktaş');
});

test('75m minimum distance shield and starter 3-branch quota are strictly enforced', () => {
  const now = 1_700_000_000_000;
  let state = { ...createInitialEmpireState(now), cash: 400_000 };

  const p1 = { ...resolvePinLocation(37.7648, 30.5566, 32), landStatus: 'valid' as const };
  const first = purchaseBusiness(state, 'kafe', p1, 'Isparta Merkez Kafe', TEST_OWNER, [], now);
  assert.equal(first.ok, true);
  state = first.state;

  // Attempt to place another business 30m away -> must be blocked
  const tooClose = { ...resolvePinLocation(37.76505, 30.5566, 32), landStatus: 'valid' as const };
  const distCheck = checkMinDistance75m(tooClose.lat, tooClose.lng, [
    { lat: p1.lat, lng: p1.lng, name: 'Isparta Merkez Kafe' },
  ]);
  assert.equal(distCheck.allowed, false);

  const blocked = purchaseBusiness(state, 'kafe', tooClose, 'Çok Yakın Kafe', TEST_OWNER, [], now);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.error?.includes('75m'));

  // Company level 1 quota is 3 branches max
  assert.equal(getCompanyTier(250_000).maxBranches, 3);
  const p2 = { ...resolvePinLocation(37.770, 30.560, 32), landStatus: 'valid' as const };
  const p3 = { ...resolvePinLocation(37.775, 30.565, 32), landStatus: 'valid' as const };
  const p4 = { ...resolvePinLocation(37.780, 30.570, 32), landStatus: 'valid' as const };

  // Keep cash modest so net worth stays in Tier 1 (< 320,000) to verify 3-branch cap
  state = { ...state, cash: 200_000 };
  const r2 = purchaseBusiness(state, 'kafe', p2, 'Şube 2', TEST_OWNER, [], now);
  assert.equal(r2.ok, true);
  state = r2.state;
  const r3 = purchaseBusiness(state, 'kafe', p3, 'Şube 3', TEST_OWNER, [], now);
  assert.equal(r3.ok, true);
  state = r3.state;

  // 4th branch at Tier 1 must fail quota check
  state = { ...state, cash: 100_000 };
  const tierNow = getCompanyTier(250_000);
  assert.equal(tierNow.level, 1);
  // Ensure net worth stays below 320k for test
  const cappedState = { ...state, cash: 65_000 };
  const r4 = purchaseBusiness(cappedState, 'kafe', p4, 'Şube 4', TEST_OWNER, [], now);
  assert.equal(r4.ok, false);
  assert.ok(r4.error?.includes('kotanız doldu'));
});

test('AVM synergy boosts same-city businesses by 25% and 1.5x competitor takeover works', () => {
  const now = 1_700_000_000_000;
  let state = { ...createInitialEmpireState(now), cash: 8_000_000 };

  const loc1 = { ...resolvePinLocation(41.043, 29.004, 34), landStatus: 'valid' as const };
  const loc2 = { ...resolvePinLocation(41.055, 29.015, 34), landStatus: 'valid' as const };

  const cafeRes = purchaseBusiness(state, 'kafe', loc1, 'Beşiktaş Kafe', TEST_OWNER, [], now);
  assert.equal(cafeRes.ok, true);
  state = cafeRes.state;
  const cafeBeforeAvm = calculateBusinessIncomePerSec(
    cafeRes.business!,
    state.activeEvent,
    now,
    state.businesses
  );

  // Establish AVM in Istanbul -> boosts Beşiktaş Kafe by 25%
  const avmRes = purchaseBusiness(state, 'avm', loc2, 'Boğaz AVM', TEST_OWNER, [], now);
  assert.equal(avmRes.ok, true);
  state = avmRes.state;

  const cafeAfterAvm = calculateBusinessIncomePerSec(
    cafeRes.business!,
    state.activeEvent,
    now,
    state.businesses
  );
  assert.ok(cafeAfterAvm > cafeBeforeAvm * 1.2);

  // Competitor hostile takeover at 1.5x valuation
  const rival: RemoteBusinessRecord = {
    id: 'rival-biz-1',
    owner_id: 'rival-user',
    owner_name: 'Rakip Holding',
    city_plate: 34,
    city_name: 'İstanbul',
    district: 'Kadıköy',
    business_name: 'Kadıköy PS Arena',
    business_type: 'ps_salonu',
    lat: 40.99,
    lng: 29.03,
    level: 2,
    hourly_income: 20_000,
    valuation: 200_000,
    created_at: new Date(now).toISOString(),
  };

  assert.equal(calculateTakeoverPrice(200_000), 300_000);
  const cashBeforeTakeover = state.cash;
  const taken = takeoverCompetitorBusiness(state, rival, TEST_OWNER, now);
  assert.equal(taken.ok, true);
  assert.equal(taken.state.cash, cashBeforeTakeover - 300_000);
  assert.equal(taken.business?.ownerId, TEST_OWNER.id);

  // Tick, collect, upgrade, hire, claim mission, sell
  const ticked = tickEconomy(taken.state, 60, now + 60_000, 0);
  const collected = collectBusinessCash(ticked.state, cafeRes.business!.id, now + 61_000);
  assert.equal(collected.ok, true);
  const up = upgradeBusiness(collected.state, cafeRes.business!.id, now + 62_000);
  assert.equal(up.ok, true);
  const hired = hireStaff(up.state, cafeRes.business!.id, now + 63_000);
  assert.equal(hired.ok, true);
  const m = claimMissionReward(hired.state, MISSION_CATALOG[0], now + 64_000);
  assert.equal(m.ok, true);
  const sold = sellBusiness(m.state, cafeRes.business!.id, now + 65_000);
  assert.equal(sold.ok, true);
});

test('OTA version is bumped to 1.1.0 and semver comparison works', () => {
  assert.equal(APP_VERSION, '1.1.0');
  assert.equal(compareSemver('1.0.0', '1.1.0'), 1);
  assert.equal(formatTL(1_500_000, true), '₺1,50 Mn');
});
