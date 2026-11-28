import test from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_SHOP_ENTRY_COST, STARTING_CASH, getBlueprintById } from './catalog.ts';
import { createInitialEmpireState, purchaseBusiness } from './economy.ts';
import {
  CAREER_RANKS,
  JOB_CATEGORIES,
  canApplyForJob,
  collectShiftTip,
  completeCareerShift,
  createInitialCareerState,
  generateCityJobListings,
  getCareerRankDef,
  getCareerStatusBadgeLabel,
  getEffectiveEstablishmentCost,
  getProvinceUnlockRequirement,
  getUnlockedCityPlates,
  isProvinceUnlocked,
  unlockProvinceLicense,
} from './careerEngine.ts';
import {
  SVG_MAP_HEIGHT,
  SVG_MAP_WIDTH,
  getAllProvinceVectorShapes,
  getProvinceDistrictShapes,
  getProvinceVectorShape,
  getTurkeyOutlinePathD,
  projectLatLngToSvg,
  svgPointToLatLng,
} from './turkeyVectorGeo.ts';
import {
  createGuestProfile,
  upgradeGuestToAccountWithAdapter,
  type PlayerAccountRow,
  type PlayerAccountsDbAdapter,
} from '../lib/playerAuth.ts';
import { APP_VERSION, compareSemver } from '../services/otaUpdate.ts';
import { getProvinceByPlate, resolvePinLocation } from './provinces81.ts';

function makeInMemoryAdapter(): PlayerAccountsDbAdapter {
  const rows = new Map<string, PlayerAccountRow>();
  return {
    async findByUsername(normalizedUsername: string) {
      return { row: rows.get(normalizedUsername) ?? null, error: undefined };
    },
    async createAccount(row: Omit<PlayerAccountRow, 'created_at'>) {
      if (rows.has(row.username)) {
        return { row: null, error: { code: '23505', message: 'unique constraint violation' } };
      }
      const inserted: PlayerAccountRow = {
        ...row,
        created_at: new Date().toISOString(),
      };
      rows.set(row.username, inserted);
      return { row: inserted, error: undefined };
    },
  };
}

test('v1.8.0 starts new players with ₺2.500 cash, 1 unlocked starting province (80 locked), and Çalışan career status', () => {
  assert.equal(STARTING_CASH, 2_500);
  assert.equal(FIRST_SHOP_ENTRY_COST, 20_000);
  assert.equal(APP_VERSION, '1.8.0');
  assert.equal(compareSemver('1.7.3', '1.8.0'), 1);

  const state = createInitialEmpireState(10_000, 32); // Isparta
  assert.equal(state.cash, 2_500);
  assert.deepEqual(getUnlockedCityPlates(state), [32]);
  assert.equal(isProvinceUnlocked(state, 32), true);
  assert.equal(isProvinceUnlocked(state, 34), false);
  assert.equal(state.career?.rankId, 'barista_kasiyer');
  assert.equal(getCareerStatusBadgeLabel(state), 'Çalışan');
});

test('v1.8.0 career job listings, tip collection, shift completion, automatic promotion, and first-shop capital progression work', () => {
  let state = createInitialEmpireState(20_000, 34); // İstanbul
  const listings = generateCityJobListings(34, undefined, 'barista_kasiyer');
  assert.ok(listings.length >= 4, 'Must generate listings across categories');
  assert.equal(JOB_CATEGORIES.length, 5);
  assert.equal(CAREER_RANKS.length, 3);

  const entryJob = listings.find((j) => j.requiredLevel === 1 && !j.requiredRank);
  assert.ok(entryJob, 'Must include at least one Level 1 starter job');
  assert.equal(canApplyForJob(entryJob, 1, 'barista_kasiyer').eligible, true);

  // Collect tips during shift -> immediately credits cash & career tip counter
  const cashBeforeTip = state.cash;
  state = collectShiftTip(state, 240, 20_100);
  assert.equal(state.cash, cashBeforeTip + 240);
  assert.equal(state.career?.totalTipsEarned, 240);

  // Complete 3 shifts -> automatically promotes Barista / Kasiyer -> Vardiya Amiri!
  let promotedToTitle: string | null = null;
  for (let i = 0; i < 3; i += 1) {
    const out = completeCareerShift(state, entryJob, 150, 20_500 + i * 100);
    assert.ok(out.wagePaid > 0);
    assert.ok(out.xpEarned > 0);
    state = out.state;
    if (out.promotedTo) {
      promotedToTitle = out.promotedTo.title;
    }
  }
  assert.equal(state.career?.shiftsCompleted, 3);
  assert.equal(state.career?.rankId, 'vardiya_amiri');
  assert.equal(promotedToTitle, 'Vardiya Amiri');
  assert.ok(state.cash > 2_500 + 3 * entryJob.dailyWage);

  // First-shop grant reduces starter Kafe cost to ₺20.000
  const kafeBp = getBlueprintById('kafe')!;
  const effectiveFirstKafeCost = getEffectiveEstablishmentCost(
    kafeBp,
    { landMultiplier: 1.2 },
    state.businesses.length
  );
  assert.equal(effectiveFirstKafeCost, FIRST_SHOP_ENTRY_COST);

  // Once cash reaches ₺20.000, player can open their first Kafe and transitions out of pure Çalışan status
  state = { ...state, cash: FIRST_SHOP_ENTRY_COST };
  const pin = {
    ...resolvePinLocation(41.0422, 29.0067, 34),
    isWithinTurkey: true,
    landStatus: 'valid' as const,
  };
  const bought = purchaseBusiness(state, 'kafe', pin, 'İlk Kafe', { id: 'g1', name: 'Deniz' }, [], 25_000);
  assert.equal(bought.ok, true);
  assert.equal(bought.state.businesses.length, 1);
  assert.equal(bought.state.cash, 0);
  assert.notEqual(getCareerStatusBadgeLabel(bought.state), 'Çalışan');
});

test('v1.8.0 81-province unlocking enforces level + license fee and unlocks city cleanly', () => {
  let state = createInitialEmpireState(30_000, 32); // Isparta unlocked, 80 locked
  const unlocked = getUnlockedCityPlates(state);
  const istReq = getProvinceUnlockRequirement(34, unlocked); // İstanbul (metropolis)
  const burdurReq = getProvinceUnlockRequirement(15, unlocked); // Burdur (smaller province)
  assert.ok(istReq.licenseCost > burdurReq.licenseCost);
  assert.ok(istReq.requiredLevel >= burdurReq.requiredLevel);

  // Fails if cash or level is insufficient
  const failTooLow = unlockProvinceLicense(state, 34, 1, 30_100);
  assert.equal(failTooLow.ok, false);

  // Succeeds when level & cash meet requirement
  state = { ...state, cash: istReq.licenseCost + 50_000 };
  const okUnlock = unlockProvinceLicense(state, 34, istReq.requiredLevel, 30_200);
  assert.equal(okUnlock.ok, true);
  assert.equal(isProvinceUnlocked(okUnlock.state, 34), true);
  assert.equal(okUnlock.state.cash, 50_000);
  assert.equal(getUnlockedCityPlates(okUnlock.state).length, 2);
});

test('v1.8.0 Vector SVG Turkey map generates valid clipped polygons for all 81 provinces and real districts', () => {
  const outline = getTurkeyOutlinePathD();
  assert.ok(outline.startsWith('M') && outline.endsWith('Z'));

  const shapes = getAllProvinceVectorShapes();
  assert.equal(shapes.length, 81);
  const plates = new Set<number>();
  for (const s of shapes) {
    plates.add(s.plate);
    assert.ok(s.polygon.length >= 3, `Province ${s.plate} (${s.name}) must have >= 3 polygon vertices`);
    assert.ok(s.pathD.startsWith('M') && s.pathD.endsWith('Z'));
    assert.ok(s.labelX >= 0 && s.labelX <= SVG_MAP_WIDTH);
    assert.ok(s.labelY >= 0 && s.labelY <= SVG_MAP_HEIGHT);
  }
  assert.equal(plates.size, 81, 'All 81 distinct plates 1..81 must exist');

  // Check real district subdivision for İstanbul (34), Ankara (6), Isparta (32)
  for (const plate of [34, 6, 32]) {
    const prov = getProvinceByPlate(plate);
    const districts = getProvinceDistrictShapes(plate);
    assert.equal(districts.length, prov.districts.length);
    for (const d of districts) {
      assert.ok(d.polygon.length >= 3, `District ${d.name} in ${prov.name} must have >= 3 vertices`);
      assert.ok(d.pathD.startsWith('M') && d.pathD.endsWith('Z'));
    }
  }

  // Projection round-trip accuracy
  const istShape = getProvinceVectorShape(34);
  assert.equal(istShape.plate, 34);
  const ist = getProvinceByPlate(34);
  const projected = projectLatLngToSvg(ist.lat, ist.lng);
  const back = svgPointToLatLng(projected.x, projected.y);
  assert.ok(Math.abs(back.lat - ist.lat) < 0.05);
  assert.ok(Math.abs(back.lng - ist.lng) < 0.05);
});

test('v1.8.0 Guest mode and seamless Guest -> Permanent Account upgrade preserve exact player UUID', async () => {
  const guestRes = createGuestProfile('Ege Yılmaz', false);
  assert.equal(guestRes.ok, true);
  assert.ok(guestRes.user);
  const guest = guestRes.user;
  assert.equal(guest.provider, 'guest');
  assert.equal(guest.name, 'Ege Yılmaz');
  assert.ok(guest.id.length >= 16);

  const adapter = makeInMemoryAdapter();
  const upgraded = await upgradeGuestToAccountWithAdapter(
    guest,
    {
      username: 'ege_patron',
      password: 'Password123',
      displayName: 'Ege Yılmaz Holding',
    },
    adapter,
    false
  );

  assert.equal(upgraded.ok, true);
  assert.ok(upgraded.user);
  assert.equal(upgraded.user.provider, 'account');
  assert.equal(
    upgraded.user.id,
    guest.id,
    'Upgraded account MUST retain the exact guest UUID so progress & Supabase records stay intact'
  );
  assert.equal(upgraded.user.username, 'ege_patron');
  assert.equal(getCareerRankDef(createInitialCareerState().rankId).id, 'barista_kasiyer');
});
