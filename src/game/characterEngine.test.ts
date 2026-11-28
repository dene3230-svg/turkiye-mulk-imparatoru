import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  STARTING_TRAITS,
  createDefaultCharacterProfile,
  getCharacterTraitModifiers,
  getHairStylesForGender,
  resolveEffectiveCharacterOutfit,
  sanitizeCharacterForGender,
  shouldWearExecutiveSuit,
} from './characterEngine';
import {
  collectShiftTip,
  completeCareerShift,
  generateCityJobListings,
  getEffectiveEstablishmentCost,
  unlockProvinceLicense,
} from './careerEngine';
import { createInitialEmpireState, purchaseBusiness, tickEconomy } from './economy';
import { computeExecutiveDashboardMetrics } from './dashboardMetrics';
import { BUSINESS_BLUEPRINTS } from './catalog';
import { resolvePinLocation } from './provinces81';

describe('characterEngine — Character Creator & Trait Mechanics', () => {
  it('provides gender-specific hair styles and sanitizes incompatible style/accessory on gender switch', () => {
    const maleHairIds = getHairStylesForGender('male').map((h) => h.id);
    const femaleHairIds = getHairStylesForGender('female').map((h) => h.id);

    assert.ok(maleHairIds.includes('kisa'));
    assert.ok(maleHairIds.includes('yan_ayrik'));
    assert.ok(maleHairIds.includes('daginik'));

    assert.ok(femaleHairIds.includes('uzun'));
    assert.ok(femaleHairIds.includes('topuz'));
    assert.ok(femaleHairIds.includes('kut'));
    assert.ok(femaleHairIds.includes('dalgali'));

    const maleProfile = {
      ...createDefaultCharacterProfile('Kerem', 'male'),
      hairStyle: 'yan_ayrik' as const,
      accessory: 'sakal_biyik' as const,
    };

    const switchedToFemale = sanitizeCharacterForGender(maleProfile, 'female');
    assert.equal(switchedToFemale.gender, 'female');
    assert.ok(femaleHairIds.includes(switchedToFemale.hairStyle));
    assert.equal(switchedToFemale.accessory, 'yok');

    const switchedBackToMale = sanitizeCharacterForGender(
      { ...switchedToFemale, hairStyle: 'topuz' },
      'male'
    );
    assert.equal(switchedBackToMale.gender, 'male');
    assert.ok(maleHairIds.includes(switchedBackToMale.hairStyle));
  });

  it('defines all 4 starting traits and returns neutral modifiers when character is absent', () => {
    assert.equal(STARTING_TRAITS.length, 4);
    const neutral = getCharacterTraitModifiers(undefined);
    assert.equal(neutral.tipMultiplier, 1);
    assert.equal(neutral.xpMultiplier, 1);
    assert.equal(neutral.rentDiscountRate, 0);
    assert.equal(neutral.expenseDiscountRate, 0);
  });

  it('applies Sosyal (+20% tips) in collectShiftTip and completeCareerShift', () => {
    const now = 1_700_000_000_000;
    const baseState = createInitialEmpireState(now, 32);
    const sosyalProfile = {
      ...createDefaultCharacterProfile('Zeynep', 'female'),
      traitId: 'sosyal' as const,
    };
    const sosyalState = createInitialEmpireState(now, 32, sosyalProfile);

    const afterBaseTip = collectShiftTip(baseState, 100, now);
    const afterSosyalTip = collectShiftTip(sosyalState, 100, now);

    assert.equal(afterBaseTip.cash - baseState.cash, 100);
    assert.equal(afterSosyalTip.cash - sosyalState.cash, 120);

    const job = generateCityJobListings(32)[0];
    const baseShift = completeCareerShift(baseState, job, 200, now);
    const sosyalShift = completeCareerShift(sosyalState, job, 200, now);

    assert.equal(baseShift.tipsIncluded, 200);
    assert.equal(sosyalShift.tipsIncluded, 240);
  });

  it('applies Hızlı Öğrenen (+15% XP) in completeCareerShift and unlockProvinceLicense', () => {
    const now = 1_700_000_000_000;
    const baseState = createInitialEmpireState(now, 32);
    const fastProfile = {
      ...createDefaultCharacterProfile('Emre', 'male'),
      traitId: 'hizli_ogrenen' as const,
    };
    const fastState = createInitialEmpireState(now, 32, fastProfile);

    const job = generateCityJobListings(32)[0];
    const baseShift = completeCareerShift(baseState, job, 0, now);
    const fastShift = completeCareerShift(fastState, job, 0, now);

    assert.equal(fastShift.xpEarned, Math.round(job.xpReward * 1.15));
    assert.ok(fastShift.xpEarned > baseShift.xpEarned);

    const richBase = { ...baseState, cash: 5_000_000 };
    const richFast = { ...fastState, cash: 5_000_000 };
    const unlockBase = unlockProvinceLicense(richBase, 7, 5, now);
    const unlockFast = unlockProvinceLicense(richFast, 7, 5, now);

    assert.equal(unlockBase.ok, true);
    assert.equal(unlockFast.ok, true);
    assert.equal(unlockBase.state.companyXp - richBase.companyXp, 120);
    assert.equal(unlockFast.state.companyXp - richFast.companyXp, Math.round(120 * 1.15));
  });

  it('applies Pazarlıkçı (-10% rent & setup) and Hesap Uzmanı (-8% expenses) across economy and dashboard metrics', () => {
    const now = 1_700_000_000_000;
    const location = resolvePinLocation(37.7648, 30.5566); // Isparta
    const kafeBp = BUSINESS_BLUEPRINTS.find((b) => b.id === 'kafe')!;

    const normalFirstCost = getEffectiveEstablishmentCost(kafeBp, location, 0, 0);
    const pazarlikFirstCost = getEffectiveEstablishmentCost(kafeBp, location, 0, 0.1);
    assert.equal(pazarlikFirstCost, Math.round(normalFirstCost * 0.9));

    const owner = { id: 'u1', name: 'Test Patron' };
    const setupState = (traitId?: 'pazarlikci' | 'hesap_uzmani') => {
      const profile = traitId
        ? { ...createDefaultCharacterProfile('Test Patron', 'male'), traitId }
        : undefined;
      let st = createInitialEmpireState(now, 32, profile);
      st = { ...st, cash: 500_000 };
      const bought = purchaseBusiness(st, kafeBp.id, location, 'Test Kafe', owner, [], now);
      assert.equal(bought.ok, true);
      // Finish construction immediately so rent & supply are active
      const readyBiz = {
        ...bought.state.businesses[0],
        constructionDaysRemaining: 0,
      };
      return {
        ...bought.state,
        businesses: [readyBiz],
        // Advance just before midnight so a single tick triggers settlement
        gameMinutes: 23 * 60 + 50,
      };
    };

    const baseline = setupState(undefined);
    const pazarlikci = setupState('pazarlikci');
    const hesapUzmani = setupState('hesap_uzmani');

    const baseMetrics = computeExecutiveDashboardMetrics(baseline, [], now);
    const pazarlikMetrics = computeExecutiveDashboardMetrics(pazarlikci, [], now);
    const hesapMetrics = computeExecutiveDashboardMetrics(hesapUzmani, [], now);

    assert.ok(pazarlikMetrics.dailyRentUtilities < baseMetrics.dailyRentUtilities);
    assert.ok(hesapMetrics.dailyOperatingExpenses < baseMetrics.dailyOperatingExpenses);

    // Trigger midnight settlement via tickEconomy and verify day-end report mirrors discounts
    const baseTick = tickEconomy(baseline, 10, now + 10_000);
    const pazarlikTick = tickEconomy(pazarlikci, 10, now + 10_000);
    const hesapTick = tickEconomy(hesapUzmani, 10, now + 10_000);

    const baseReport = (baseTick.state.pendingDayEndReports ?? [])[0];
    const pazarlikReport = (pazarlikTick.state.pendingDayEndReports ?? [])[0];
    const hesapReport = (hesapTick.state.pendingDayEndReports ?? [])[0];

    assert.ok(baseReport && pazarlikReport && hesapReport);
    assert.ok(pazarlikReport.dailyUtilitiesAndRent < baseReport.dailyUtilitiesAndRent);
    assert.ok(
      hesapReport.dailyUtilitiesAndRent + hesapReport.dailySupplyCost <
        baseReport.dailyUtilitiesAndRent + baseReport.dailySupplyCost
    );
  });

  it('automatically transitions outfit to Takım Elbise when promoted to Şube Müdürü or Holding stage', () => {
    const now = 1_700_000_000_000;
    const profile = {
      ...createDefaultCharacterProfile('Zeynep', 'female'),
      outfit: 'barista_onlugu' as const,
    };
    const starterState = createInitialEmpireState(now, 32, profile);

    assert.equal(shouldWearExecutiveSuit(starterState), false);
    assert.equal(resolveEffectiveCharacterOutfit(profile, starterState), 'barista_onlugu');

    const promotedState = {
      ...starterState,
      career: {
        ...starterState.career!,
        rankId: 'sube_muduru' as const,
      },
    };
    assert.equal(shouldWearExecutiveSuit(promotedState), true);
    assert.equal(resolveEffectiveCharacterOutfit(profile, promotedState), 'takim_elbise');

    const holdingOfficeState = {
      ...starterState,
      officeTierId: 'plaza_floor' as const,
    };
    assert.equal(shouldWearExecutiveSuit(holdingOfficeState), true);
    assert.equal(resolveEffectiveCharacterOutfit(profile, holdingOfficeState), 'takim_elbise');
  });
});
