import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialEmpireState,
  purchaseBusiness,
  tickEconomy,
  collectBusinessCash,
  collectAllCash,
  upgradeBusiness,
  hireStaff,
  sellBusiness,
  claimMissionReward,
  calculateNetWorth,
  calculateEstablishmentCost,
  getEmpireRank,
  formatTL,
} from './economy';
import { resolvePinLocation, isPointInTurkey } from './turkeyGeo';
import { MISSION_CATALOG, getBlueprintById } from './catalog';
import { compareSemver } from '../services/otaUpdate';

test('resolvePinLocation identifies major Turkish cities and boundaries accurately', () => {
  const ist = resolvePinLocation(41.025, 29.005);
  assert.equal(ist.isWithinTurkey, true);
  assert.equal(ist.cityId, 'istanbul');
  assert.equal(ist.cityName, 'İstanbul');
  assert.ok(ist.landMultiplier > 1.2);

  const antalya = resolvePinLocation(36.89, 30.71);
  assert.equal(antalya.isWithinTurkey, true);
  assert.equal(antalya.cityId, 'antalya');
  assert.ok(antalya.tourism >= 1.4);

  assert.equal(isPointInTurkey(48.8566, 2.3522), false); // Paris is outside Turkey
});

test('purchaseBusiness deducts balance, validates funds and turkey bounds', () => {
  const now = 1_700_000_000_000;
  const state = createInitialEmpireState(now);
  const ist = resolvePinLocation(41.02, 28.99);
  const bp = getBlueprintById('simit-kahve')!;
  const expectedCost = calculateEstablishmentCost(bp, ist);

  // Reject outside Turkey
  const outside = resolvePinLocation(51.5, -0.12);
  const badLoc = purchaseBusiness(state, 'simit-kahve', outside, 'Londra Kafe', now);
  assert.equal(badLoc.ok, false);

  // Reject too expensive
  const tooExpensive = purchaseBusiness(state, 'gokdelen-plaza', ist, 'Dev Kule', now);
  assert.equal(tooExpensive.ok, false);

  // Valid purchase
  const res = purchaseBusiness(state, 'simit-kahve', ist, 'Beşiktaş Altın Fırın', now);
  assert.equal(res.ok, true);
  assert.equal(res.state.businesses.length, 1);
  assert.equal(res.state.cash, state.cash - expectedCost);
  assert.equal(res.business?.customName, 'Beşiktaş Altın Fırın');
});

test('economy tick accumulates revenue, triggers high vault alert, and collects cleanly', () => {
  const now = 1_700_000_000_000;
  const initial = createInitialEmpireState(now);
  const ankara = resolvePinLocation(39.93, 32.86);
  const bought = purchaseBusiness(initial, 'simit-kahve', ankara, 'Çankaya Fırın', now);
  assert.equal(bought.ok, true);

  // Advance 150 seconds -> should reach >75% vault capacity (180s)
  const ticked = tickEconomy(bought.state, 150, now + 150_000, 0);
  const biz = ticked.state.businesses[0];
  assert.ok(biz.pendingCash > 0);
  assert.equal(ticked.highVaultBusinessIds.length, 1);

  const collected = collectBusinessCash(ticked.state, biz.id, now + 151_000);
  assert.equal(collected.ok, true);
  assert.ok((collected.collectedAmount ?? 0) > 50_000);
  assert.equal(Math.floor(collected.state.businesses[0].pendingCash), 0);

  // Collect all when empty returns ok=false
  const emptyCollect = collectAllCash(collected.state, now + 152_000);
  assert.equal(emptyCollect.ok, false);
});

test('upgrade, staff hire, mission claim, and sell work end-to-end', () => {
  const now = 1_700_000_000_000;
  let state = { ...createInitialEmpireState(now), cash: 1_000_000 };
  const izmir = resolvePinLocation(38.42, 27.14);

  const p = purchaseBusiness(state, 'simit-kahve', izmir, 'Alsancak Kafe', now);
  assert.equal(p.ok, true);
  state = p.state;
  const bizId = p.business!.id;

  // Claim first-business mission
  const firstMission = MISSION_CATALOG.find((m) => m.id === 'first-business')!;
  const claimed = claimMissionReward(state, firstMission, now);
  assert.equal(claimed.ok, true);
  assert.equal(claimed.collectedAmount, firstMission.rewardCash);
  state = claimed.state;

  // Upgrade to Lv 2
  const up = upgradeBusiness(state, bizId, now);
  assert.equal(up.ok, true);
  assert.equal(up.business?.level, 2);
  state = up.state;

  // Hire staff
  const hired = hireStaff(state, bizId, now);
  assert.equal(hired.ok, true);
  assert.equal(hired.business?.staffCount, 1);
  state = hired.state;

  assert.ok(calculateNetWorth(state, now) > 900_000);
  assert.equal(getEmpireRank(26_000_000).id, 'imparator');

  // Sell property
  const sold = sellBusiness(state, bizId, now);
  assert.equal(sold.ok, true);
  assert.equal(sold.state.businesses.length, 0);
  assert.ok(sold.state.cash > state.cash);
});

test('compareSemver accurately detects OTA updates', () => {
  assert.equal(compareSemver('1.0.0', '1.0.1'), 1);
  assert.equal(compareSemver('1.0.0', '1.1.0'), 1);
  assert.equal(compareSemver('1.2.0', '1.10.0'), 1);
  assert.equal(compareSemver('1.0.0', '1.0.0'), 0);
  assert.equal(compareSemver('1.2.0', '1.1.9'), -1);
});

test('formatTL produces clean Turkish currency labels', () => {
  assert.equal(formatTL(250_000), '₺250.000');
  assert.equal(formatTL(1_500_000, true), '₺1,50 Mn');
});
