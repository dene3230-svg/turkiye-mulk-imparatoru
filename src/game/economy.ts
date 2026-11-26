import type {
  BusinessBlueprint,
  BusinessTypeId,
  CompanyTier,
  DayEndBranchLine,
  DayEndSummary,
  DaySimAutoStopAlert,
  EmpireState,
  FranchiseApplication,
  FranchiseBrand,
  GameSpeed,
  HeadquartersInfo,
  MarketEvent,
  MissionDef,
  MonthlyClosingSummary,
  OwnedBusiness,
  PinLocationInfo,
  RemoteBusinessRecord,
  StockQuote,
} from '../types/game';
import {
  AVM_SYNERGY_MULTIPLIER,
  BANK_LICENSE_COST,
  BUSINESS_BLUEPRINTS,
  COMPANY_TIERS,
  FACTORY_SUPPLIED_TYPES,
  FACTORY_SUPPLY_DISCOUNT,
  FRANCHISE_BRANCH_BONUS_MULTIPLIER,
  MARKET_EVENT_TEMPLATES,
  MIN_BUSINESS_DISTANCE_METERS,
  PARKING_CAPACITY_BONUS,
  PARKING_SYNERGY_RADIUS_METERS,
  STARTING_BRAND_RECOGNITION,
  STARTING_CASH,
  STARTING_CREDIT_SCORE,
  SUPERMARKET_CHAIN_DISCOUNT,
  TAKEOVER_VALUATION_MULTIPLIER,
  getBlueprintById,
  isFactoryType,
  isParkingType,
} from './catalog';
import { DEFAULT_PROVINCE_PLATE, getProvinceByPlate, haversineMeters } from './provinces81';
import {
  MAX_BRANCH_WORKERS,
  TURKEY_EMPLOYER_SGK_RATE,
  calculateStaffQualityMultiplier,
  calculateTotalDailyPayrollBreakdown,
  calculateTotalHourlyPayroll,
  generateCandidatePool,
  getBranchStaffSlots,
  getStaffDailyCost,
  resolveBusinessAutomation,
} from './hrEngine';
import {
  calculateDividendPerTick,
  calculatePortfolioMarketValue,
} from './stockMarket';
import {
  enforceOverdueLoans,
  type LoanEnforcementResult,
} from './bankingEngine';
import {
  createInitialDynamicMissions,
  evaluateDynamicMissionProgress,
  generateNextDynamicMission,
} from './missionEngine';
import {
  extractBaseBrandName,
  getActiveCompetitiveBlitzBoost,
  getChainStatusForBusiness,
  isAdCampaignActive,
  processAutoFranchiseApplications,
  runGeneralManagerAutoAds,
} from './strategyEngine';
import {
  calculateHourlyTaxBreakdown,
  createMonthlyTaxObligation,
  generateAccountantPool,
  generateCeoPool,
  processAccountantAutoPayments,
  runAutonomousCeoTick,
  type AccountantAutoPayResult,
} from './corporateEngine';
import {
  calculateBranchServiceQuality,
  calculateBrandDemandMultiplier,
  calculateOfficeBenefits,
  calculatePersonalAssetsValuation,
  computeNextBrandRecognition,
} from './officeEngine';
export const HIGH_VAULT_NOTIFY_RATIO = 0.75;
export const STARTING_GAME_MINUTES = 9 * 60; // Gün 1 • 09:00
// v1.4.0 Time Flow:
// 1x: 36 game min / real sec -> ~1.67s = 1 game hour, 40s = 1 full game day
// 2x: ~75 game min / real sec -> ~0.80s = 1 game hour
// 4x: ~171.4 game min / real sec -> ~0.35s = 1 game hour
// 'day' (Gün Gün Simülasyon): 160x sim-sec -> at 250ms tick = 1.0 full game day per tick (4 days/sec)
export const GAME_MINUTES_PER_REAL_SEC = 36;

export function getEffectiveSimSeconds(realDtSec: number, speed: GameSpeed): number {
  if (speed === 0 || realDtSec <= 0) return 0;
  if (speed === 1) return realDtSec;
  if (speed === 2) return realDtSec * 2.0833;
  if (speed === 4) return realDtSec * 4.7619;
  if (speed === 'day') return realDtSec * 160;
  return realDtSec;
}

export function formatGameClock(gameMinutes: number): {
  totalDays: number;
  day: number;
  month: number;
  hour: number;
  minute: number;
  label: string;
  compactLabel: string;
  totalDaysLabel: string;
} {
  const safeMin = Math.max(0, Math.floor(gameMinutes));
  const totalDays = Math.floor(safeMin / 1440) + 1;
  const month = Math.floor((totalDays - 1) / 30) + 1;
  const day = ((totalDays - 1) % 30) + 1;
  const rem = safeMin % 1440;
  const hour = Math.floor(rem / 60);
  const minute = Math.floor((rem % 60) / 10) * 10;
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return {
    totalDays,
    day,
    month,
    hour,
    minute,
    label: `Gün ${day} • ${month}. Ay • ${hh}:${mm}`,
    compactLabel: `G${day}·${month}.Ay ${hh}:${mm}`,
    totalDaysLabel: `Toplam ${totalDays}. Gün`,
  };
}

export function createHeadquartersForCity(cityPlate = DEFAULT_PROVINCE_PLATE): HeadquartersInfo {
  const prov = getProvinceByPlate(cityPlate);
  return {
    cityPlate: prov.plate,
    cityName: prov.name,
    lat: prov.lat,
    lng: prov.lng,
    zoom: prov.zoom,
  };
}

export function resolveInitialFocusTarget(state: EmpireState): {
  cityPlate: number;
  lat: number;
  lng: number;
  zoom: number;
} {
  // 1) If HQ points to an existing business (or saved first-business coordinates), focus directly on it
  if (state.hq) {
    if (state.hq.businessId) {
      const hqBiz = state.businesses.find((b) => b.id === state.hq?.businessId);
      if (hqBiz) {
        return {
          cityPlate: hqBiz.cityPlate,
          lat: hqBiz.lat,
          lng: hqBiz.lng,
          zoom: 15,
        };
      }
    }
    if (state.businesses.length === 0) {
      return {
        cityPlate: state.hq.cityPlate,
        lat: state.hq.lat,
        lng: state.hq.lng,
        zoom: state.hq.zoom || getProvinceByPlate(state.hq.cityPlate).zoom,
      };
    }
  }

  // 2) Fallback to earliest built business (first branch) if player has businesses
  if (state.businesses.length > 0) {
    const firstBiz = [...state.businesses].sort((a, b) => a.createdAt - b.createdAt)[0];
    return {
      cityPlate: firstBiz.cityPlate,
      lat: firstBiz.lat,
      lng: firstBiz.lng,
      zoom: 15,
    };
  }

  // 3) Fallback to saved HQ city or default province
  const fallbackPlate = state.hq?.cityPlate ?? DEFAULT_PROVINCE_PLATE;
  const prov = getProvinceByPlate(fallbackPlate);
  return {
    cityPlate: prov.plate,
    lat: prov.lat,
    lng: prov.lng,
    zoom: prov.zoom,
  };
}

export function createInitialEmpireState(
  now = Date.now(),
  startingCityPlate = DEFAULT_PROVINCE_PLATE
): EmpireState {
  const initialTemplate = MARKET_EVENT_TEMPLATES[2]; // Ticari Emlak Canlanması
  return {
    cash: STARTING_CASH,
    totalEarnedLifetime: 0,
    companyXp: 0,
    gameMinutes: STARTING_GAME_MINUTES,
    hq: createHeadquartersForCity(startingCityPlate),
    businesses: [],
    cityManagers: [],
    candidatePool: generateCandidatePool(now, 'kafe'),
    supermarketChain: null,
    ownFranchises: [],
    franchiseApplications: [],
    autoApproveFranchiseApps: true,
    franchiseRoyaltiesEarned: 0,
    competitiveBlitzes: [],
    acquiredRivalIds: [],
    stockPortfolio: [],
    playerIpo: null,
    creditScore: STARTING_CREDIT_SCORE,
    ownBank: null,
    activeLoans: [],
    accountant: null,
    accountantPool: generateAccountantPool(now),
    ceo: null,
    ceoPool: generateCeoPool(now),
    pendingTaxes: [],
    totalTaxesPaid: 0,
    lastCeoActionGameDay: 0,
    activeMissions: createInitialDynamicMissions(),
    claimedMissionIds: [],
    completedMissionsCount: 0,
    pendingDayEndReports: [],
    dayEndHistory: [],
    brandRecognition: STARTING_BRAND_RECOGNITION,
    officeTierId: 'home_office',
    officeUpgradeIds: [],
    personalAssetIds: [],
    activeEvent: {
      ...initialTemplate,
      startedAt: now,
      endsAt: now + initialTemplate.durationSec * 1000,
    },
    lastSavedAt: now,
  };
}

/** Returns true if the business is still in its initial construction / renovation period. */
export function isBusinessUnderConstruction(business: OwnedBusiness): boolean {
  return (business.constructionDaysRemaining ?? 0) > 0;
}

/** Daily fixed commercial rent, electricity, water & construction installment for a branch. */
export function calculateDailyRentAndUtilities(business: OwnedBusiness): number {
  const bp = getBlueprintById(business.blueprintId);
  if (!bp) return 0;
  const levelScale = 1 + (business.level - 1) * 0.18;
  const baseRent = Math.round(bp.dailyRentBase * business.landMultiplier * levelScale);
  if (isBusinessUnderConstruction(business)) {
    const constructionRent = Math.round(baseRent * 0.65);
    const installment =
      business.constructionDailyInstallment ??
      Math.round((business.purchaseCost * 0.025) / 100) * 100;
    return constructionRent + installment;
  }
  return baseRent;
}

/** Extra budget required to hire a Double Shift Crew (-35% remaining construction days). */
export function calculateDoubleShiftCost(business: OwnedBusiness): number {
  return Math.max(15_000, Math.round((business.purchaseCost * 0.14) / 500) * 500);
}

/**
 * Hires a Double Shift Crew ("Çift Vardiya Ekip Tut") on an under-construction branch,
 * reducing remaining renovation days by 35% (at least 1 full day saved).
 */
export function hireDoubleShiftCrew(
  state: EmpireState,
  businessId: string,
  now = Date.now()
): ActionResult {
  const target = state.businesses.find((b) => b.id === businessId);
  if (!target) return { state, ok: false, error: 'İşletme bulunamadı.' };
  const rem = target.constructionDaysRemaining ?? 0;
  if (rem <= 0) {
    return { state, ok: false, error: 'Bu işletmenin inşaatı zaten tamamlandı.' };
  }
  if (target.doubleShiftApplied) {
    return { state, ok: false, error: 'Bu şubede Çift Vardiya ekibi zaten aktif.' };
  }
  if (rem <= 1) {
    return { state, ok: false, error: 'İnşaat yarın tamamlanacak; ek vardiya gerekmiyor.' };
  }

  const cost = calculateDoubleShiftCost(target);
  if (state.cash < cost) {
    return {
      state,
      ok: false,
      error: `Çift vardiya ekibi için ${formatTL(cost)} gerekiyor (yetersiz bakiye).`,
    };
  }

  const reducedDays = Math.max(1, Math.min(rem - 1, Math.round(rem * 0.65)));
  const updated: OwnedBusiness = {
    ...target,
    constructionDaysRemaining: reducedDays,
    doubleShiftApplied: true,
  };

  return {
    ok: true,
    business: updated,
    state: {
      ...state,
      cash: state.cash - cost,
      businesses: state.businesses.map((b) => (b.id === businessId ? updated : b)),
      lastSavedAt: now,
    },
  };
}

export function getAffinityMultiplier(
  blueprint: BusinessBlueprint,
  location: Pick<PinLocationInfo, 'footTraffic' | 'tourism' | 'business'>
): number {
  switch (blueprint.zoneAffinity) {
    case 'footTraffic':
      return location.footTraffic;
    case 'tourism':
      return location.tourism;
    case 'business':
      return location.business;
    default:
      return 1;
  }
}

export function calculateEstablishmentCost(
  blueprint: BusinessBlueprint,
  location: Pick<PinLocationInfo, 'landMultiplier'>
): number {
  return Math.round((blueprint.baseCost * location.landMultiplier) / 1000) * 1000;
}

export function hasAvmSynergyForBusiness(
  business: OwnedBusiness,
  allOwnBusinesses: OwnedBusiness[]
): boolean {
  if (business.blueprintId === 'avm') return false;
  return allOwnBusinesses.some(
    (other) =>
      other.id !== business.id &&
      other.blueprintId === 'avm' &&
      other.cityPlate === business.cityPlate
  );
}

/**
 * Checks if an owned Otopark or Katlı Otopark sits within 250m -> +15% customer capacity & throughput.
 */
export function hasParkingSynergyForBusiness(
  business: OwnedBusiness,
  allOwnBusinesses: OwnedBusiness[]
): boolean {
  if (isParkingType(business.blueprintId)) return false;
  return allOwnBusinesses.some(
    (other) =>
      other.id !== business.id &&
      isParkingType(other.blueprintId) &&
      haversineMeters(business.lat, business.lng, other.lat, other.lng) <=
        PARKING_SYNERGY_RADIUS_METERS
  );
}

/**
 * Checks if player owns at least 1 industrial factory AND this business benefits from the 35% supply discount.
 */
export function hasFactorySupplySynergy(
  business: OwnedBusiness,
  allOwnBusinesses: OwnedBusiness[]
): boolean {
  if (!FACTORY_SUPPLIED_TYPES.includes(business.blueprintId)) return false;
  return allOwnBusinesses.some((other) => isFactoryType(other.blueprintId));
}

export function calculateBusinessIncomePerSec(
  business: OwnedBusiness,
  activeEvent: MarketEvent | null,
  now = Date.now(),
  allOwnBusinesses?: OwnedBusiness[],
  stateContext?: Pick<
    EmpireState,
    'cityManagers' | 'supermarketChain' | 'gameMinutes' | 'competitiveBlitzes'
  > & { brandRecognition?: number }
): number {
  const bp = getBlueprintById(business.blueprintId);
  if (!bp) return 0;
  // v1.4.0: Businesses under construction / renovation generate 0 revenue until completed.
  if (isBusinessUnderConstruction(business)) return 0;

  const levelMultiplier = 1 + (business.level - 1) * 0.45;
  const automation = resolveBusinessAutomation(
    business,
    stateContext?.cityManagers ?? [],
    allOwnBusinesses ?? [business]
  );
  const staffMultiplier = calculateStaffQualityMultiplier(business, automation);
  const serviceReport = calculateBranchServiceQuality(
    business,
    stateContext?.cityManagers ?? [],
    allOwnBusinesses ?? [business]
  );
  const serviceTrafficMult = serviceReport.customerTrafficMultiplier;
  const brandDemandMult = calculateBrandDemandMultiplier(
    stateContext?.brandRecognition ?? STARTING_BRAND_RECOGNITION
  );
  const boostMultiplier = business.boostEndsAt > now ? 2.0 : 1.0;

  // Advertising campaign boost (Brochure +20%, Social +38%, Billboard +65%)
  const currentGameMin = stateContext?.gameMinutes ?? STARTING_GAME_MINUTES;
  const adMultiplier = isAdCampaignActive(business.activeAdCampaign, currentGameMin)
    ? 1 + (business.activeAdCampaign?.revenueBoost ?? 0)
    : 1.0;

  // Competitive Blitz boost (+25% in targeted rival city)
  const blitzBoost = getActiveCompetitiveBlitzBoost(
    business.cityPlate,
    stateContext?.competitiveBlitzes,
    currentGameMin
  );
  const blitzMultiplier = 1 + blitzBoost;

  const avmSynergy =
    allOwnBusinesses && hasAvmSynergyForBusiness(business, allOwnBusinesses)
      ? AVM_SYNERGY_MULTIPLIER
      : 1.0;

  const parkingSynergy =
    allOwnBusinesses && hasParkingSynergyForBusiness(business, allOwnBusinesses)
      ? 1 + PARKING_CAPACITY_BONUS
      : 1.0;

  // Factory 35% supply cost reduction -> translates into realistic margin uplift
  const factorySynergy =
    allOwnBusinesses && hasFactorySupplySynergy(business, allOwnBusinesses)
      ? 1 + FACTORY_SUPPLY_DISCOUNT * 0.45
      : 1.0;

  // Supermarket chain bulk procurement discount
  const supermarketChainSynergy =
    business.blueprintId === 'supermarket' && stateContext?.supermarketChain
      ? 1 + SUPERMARKET_CHAIN_DISCOUNT * 0.45
      : 1.0;

  // Cloned Zincir Marka synergy (2+ branches under same brand: +10%/+15% revenue + supply savings)
  const brandChainStatus = allOwnBusinesses
    ? getChainStatusForBusiness(business, allOwnBusinesses)
    : null;
  const clonedChainSynergy = brandChainStatus?.isChain
    ? 1 + brandChainStatus.revenueBonus + brandChainStatus.supplyDiscount * 0.35
    : 1.0;

  // Franchise branch +35% customer & revenue bonus (minus royalty share kept by brand owner)
  const franchiseGrossMult = business.franchiseId ? FRANCHISE_BRANCH_BONUS_MULTIPLIER : 1.0;
  const royaltyDeduction = business.franchiseId ? 1 - (business.franchiseRoyaltyRate ?? 0.15) : 1.0;

  let eventMultiplier = 1.0;
  if (activeEvent && activeEvent.endsAt > now) {
    if (
      activeEvent.category === 'all' ||
      activeEvent.category === bp.category ||
      (activeEvent.category === 'retail' &&
        (bp.category === 'mall' || bp.category === 'parking')) ||
      (activeEvent.category === 'cafe' && bp.category === 'food')
    ) {
      eventMultiplier = activeEvent.incomeMultiplier;
    }
  }

  return Math.round(
    bp.baseIncomePerSec *
      business.affinityMultiplier *
      levelMultiplier *
      staffMultiplier *
      serviceTrafficMult *
      brandDemandMult *
      boostMultiplier *
      adMultiplier *
      blitzMultiplier *
      avmSynergy *
      parkingSynergy *
      factorySynergy *
      supermarketChainSynergy *
      clonedChainSynergy *
      franchiseGrossMult *
      royaltyDeduction *
      eventMultiplier
  );
}

export function calculateBusinessHourlyIncome(
  business: OwnedBusiness,
  activeEvent: MarketEvent | null,
  now = Date.now(),
  allOwnBusinesses?: OwnedBusiness[],
  stateContext?: Pick<
    EmpireState,
    'cityManagers' | 'supermarketChain' | 'gameMinutes' | 'competitiveBlitzes'
  > & { brandRecognition?: number }
): number {
  const bp = getBlueprintById(business.blueprintId);
  if (!bp) return 0;
  if (isBusinessUnderConstruction(business)) return 0;
  const perSec = calculateBusinessIncomePerSec(
    business,
    activeEvent,
    now,
    allOwnBusinesses,
    stateContext
  );
  const ratio = bp.baseHourlyIncome / Math.max(1, bp.baseIncomePerSec);
  return Math.round((perSec * ratio) / 50) * 50;
}

export function calculateBusinessCapacity(
  business: OwnedBusiness,
  allOwnBusinesses?: OwnedBusiness[],
  currentGameMinutes?: number
): number {
  const bp = getBlueprintById(business.blueprintId);
  if (!bp) return 10;
  const parkingMult =
    allOwnBusinesses && hasParkingSynergyForBusiness(business, allOwnBusinesses)
      ? 1 + PARKING_CAPACITY_BONUS
      : 1.0;
  const franchiseMult = business.franchiseId ? FRANCHISE_BRANCH_BONUS_MULTIPLIER : 1.0;
  const adMult =
    business.activeAdCampaign &&
    (currentGameMinutes === undefined || business.activeAdCampaign.endsAtGameMin > currentGameMinutes)
      ? 1 + business.activeAdCampaign.customerBoost
      : 1.0;
  const starSum = (business.employees ?? []).reduce((s, e) => s + e.stars, 0);
  const staffBonus = starSum > 0 ? starSum * 0.04 : business.staffCount * 0.08;

  return Math.round(
    bp.baseCapacity *
      (1 + (business.level - 1) * 0.35 + staffBonus) *
      parkingMult *
      franchiseMult *
      adMult
  );
}

export function calculateVaultCapacity(business: OwnedBusiness): number {
  const bp = getBlueprintById(business.blueprintId);
  if (!bp) return 0;
  const levelScale = 1 + (business.level - 1) * 0.5;
  return Math.round(
    bp.baseIncomePerSec * bp.vaultCapacitySec * business.affinityMultiplier * levelScale
  );
}

export function calculateUpgradeCost(business: OwnedBusiness): number {
  const bp = getBlueprintById(business.blueprintId);
  if (!bp) return Infinity;
  return Math.round((business.purchaseCost * 0.65 * Math.pow(1.48, business.level - 1)) / 1000) * 1000;
}

export function calculateStaffHireCost(business: OwnedBusiness): number {
  const bp = getBlueprintById(business.blueprintId);
  if (!bp) return Infinity;
  return Math.round((bp.staffCostBase * Math.pow(1.32, business.staffCount)) / 500) * 500;
}

export function calculateBoostCost(business: OwnedBusiness): number {
  const bp = getBlueprintById(business.blueprintId);
  if (!bp) return Infinity;
  return Math.round((bp.baseIncomePerSec * 45 * (1 + (business.level - 1) * 0.35)) / 500) * 500;
}

export function calculateBusinessValuation(
  business: OwnedBusiness,
  activeEvent: MarketEvent | null,
  now = Date.now()
): number {
  const bp = getBlueprintById(business.blueprintId);
  let valMult = 1.0;
  if (activeEvent && activeEvent.endsAt > now && bp) {
    if (activeEvent.category === 'all' || activeEvent.category === bp.category) {
      valMult = activeEvent.valuationMultiplier;
    }
  }
  const invested =
    business.purchaseCost * (1 + (business.level - 1) * 0.52) +
    business.staffCount * (bp?.staffCostBase ?? 15_000) * 0.5;
  return Math.round((invested * 0.9 * valMult) / 1000) * 1000;
}

export function calculateTakeoverPrice(valuation: number): number {
  return Math.round((valuation * TAKEOVER_VALUATION_MULTIPLIER) / 1000) * 1000;
}

export function calculateTotalIncomePerSec(state: EmpireState, now = Date.now()): number {
  return state.businesses.reduce(
    (sum, b) => sum + calculateBusinessIncomePerSec(b, state.activeEvent, now, state.businesses, state),
    0
  );
}

export function calculateTotalPendingCash(state: EmpireState): number {
  return state.businesses.reduce((sum, b) => sum + Math.floor(b.pendingCash), 0);
}

export function calculateNetWorth(
  state: EmpireState,
  now = Date.now(),
  stockQuotes?: StockQuote[]
): number {
  const assetsValue = state.businesses.reduce(
    (sum, b) => sum + calculateBusinessValuation(b, state.activeEvent, now) + Math.floor(b.pendingCash),
    0
  );
  const stocksValue = stockQuotes
    ? calculatePortfolioMarketValue(state, stockQuotes)
    : (state.stockPortfolio ?? []).reduce((s, h) => s + Math.round(h.shares * h.avgCost), 0);
  const bankValue = state.ownBank ? Math.round(state.ownBank.poolCapital + BANK_LICENSE_COST) : 0;
  const personalAssetsValue = calculatePersonalAssetsValuation(state);
  const activeDebt = (state.activeLoans ?? [])
    .filter((l) => l.status === 'active' || l.status === 'garnishing')
    .reduce((s, l) => s + l.remainingAmount, 0);

  return Math.max(
    0,
    Math.floor(state.cash) + assetsValue + stocksValue + bankValue + personalAssetsValue - activeDebt
  );
}

export function getCompanyTier(netWorth: number): CompanyTier {
  let current = COMPANY_TIERS[0];
  for (const tier of COMPANY_TIERS) {
    if (netWorth >= tier.minNetWorth) {
      current = tier;
    }
  }
  return current;
}

export function getNextCompanyTier(netWorth: number): CompanyTier | null {
  for (const tier of COMPANY_TIERS) {
    if (netWorth < tier.minNetWorth) {
      return tier;
    }
  }
  return null;
}

export interface DistanceCheckResult {
  allowed: boolean;
  nearestMeters: number | null;
  nearestName?: string;
}

export function checkMinDistance75m(
  lat: number,
  lng: number,
  existingPoints: Array<{ lat: number; lng: number; name: string }>,
  minMeters = MIN_BUSINESS_DISTANCE_METERS
): DistanceCheckResult {
  let nearestMeters: number | null = null;
  let nearestName: string | undefined;

  for (const pt of existingPoints) {
    const dist = haversineMeters(lat, lng, pt.lat, pt.lng);
    if (nearestMeters === null || dist < nearestMeters) {
      nearestMeters = dist;
      nearestName = pt.name;
    }
  }

  if (nearestMeters !== null && nearestMeters < minMeters) {
    return {
      allowed: false,
      nearestMeters: Math.round(nearestMeters),
      nearestName,
    };
  }

  return {
    allowed: true,
    nearestMeters: nearestMeters !== null ? Math.round(nearestMeters) : null,
    nearestName,
  };
}

export interface ActionResult {
  state: EmpireState;
  ok: boolean;
  error?: string;
  business?: OwnedBusiness;
  collectedAmount?: number;
}

export function purchaseBusiness(
  state: EmpireState,
  blueprintId: BusinessTypeId,
  location: PinLocationInfo,
  customName: string,
  owner: { id: string; name: string },
  nearbyExisting: Array<{ lat: number; lng: number; name: string }> = [],
  now = Date.now(),
  franchiseBrand?: FranchiseBrand | null,
  chainCloneMeta?: {
    chainBrandName: string;
    chainBranchNumber: number;
    sourceBusinessId?: string;
  } | null
): ActionResult {
  const effectiveType = franchiseBrand ? franchiseBrand.businessType : blueprintId;
  const bp = getBlueprintById(effectiveType);
  if (!bp) {
    return { state, ok: false, error: 'Geçersiz işletme türü.' };
  }
  if (!location.isWithinTurkey) {
    return { state, ok: false, error: 'Lütfen Türkiye sınırları içinde bir nokta seçin.' };
  }
  if (location.landStatus === 'water' || location.landStatus === 'invalid') {
    return {
      state,
      ok: false,
      error: location.landMessage || 'Deniz, göl veya su yüzeyi üzerine inşaat yapılamaz.',
    };
  }

  const netWorth = calculateNetWorth(state, now);
  const tier = getCompanyTier(netWorth);
  if (state.businesses.length >= tier.maxBranches) {
    return {
      state,
      ok: false,
      error: `Şube kotanız doldu (${state.businesses.length}/${tier.maxBranches}). Şirket seviyenizi yükselterek yeni şube açabilirsiniz.`,
    };
  }
  if (!franchiseBrand && tier.level < bp.minCompanyLevel) {
    return {
      state,
      ok: false,
      error: `${bp.name} için Şirket Seviyesi ${bp.minCompanyLevel} gereklidir.`,
    };
  }

  const allExistingPoints = [
    ...state.businesses.map((b) => ({ lat: b.lat, lng: b.lng, name: b.customName })),
    ...nearbyExisting,
  ];
  const distCheck = checkMinDistance75m(location.lat, location.lng, allExistingPoints);
  if (!distCheck.allowed) {
    return {
      state,
      ok: false,
      error: `Mevcut "${distCheck.nearestName}" işletmesine ${distCheck.nearestMeters}m mesafedesiniz. En az ${MIN_BUSINESS_DISTANCE_METERS}m mesafe gereklidir.`,
    };
  }

  const baseCost = calculateEstablishmentCost(bp, location);
  const licenseFee = franchiseBrand ? franchiseBrand.licenseFee : 0;
  const totalCost = baseCost + licenseFee;
  if (state.cash < totalCost) {
    return { state, ok: false, error: 'Yetersiz bakiye.' };
  }

  const trimmedName = customName.trim();
  if (!trimmedName) {
    return { state, ok: false, error: 'Lütfen işletmeniz için bir ad girin.' };
  }

  const resolvedChainBrand = chainCloneMeta?.chainBrandName
    ? chainCloneMeta.chainBrandName.trim()
    : extractBaseBrandName(trimmedName);

  const affinityMultiplier = getAffinityMultiplier(bp, location);
  const generatedBusinessId =
    typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : (() => {
          const hex = (n: number, len: number) =>
            (Math.abs(Math.floor(n)) >>> 0).toString(16).padStart(len, '0').slice(-len);
          const a = hex(now, 8);
          const b = hex(Math.random() * 0xffff, 4);
          const c = `4${hex(Math.random() * 0xfff, 3)}`;
          const d = `${(8 + Math.floor(Math.random() * 4)).toString(16)}${hex(
            Math.random() * 0xfff,
            3
          )}`;
          const e = `${hex(Math.random() * 0xffffffff, 8)}${hex(Math.random() * 0xffff, 4)}`;
          return `${a}-${b}-${c}-${d}-${e}`;
        })();
  const newBusiness: OwnedBusiness = {
    id: generatedBusinessId,
    ownerId: owner.id,
    ownerName: owner.name,
    blueprintId: bp.id,
    customName: trimmedName.slice(0, 42),
    lat: location.lat,
    lng: location.lng,
    cityPlate: location.cityPlate,
    cityName: location.cityName,
    districtName: location.districtName,
    level: 1,
    staffCount: 0,
    employees: [],
    stockLevel: 100,
    maintenanceLevel: 100,
    purchaseCost: baseCost,
    landMultiplier: location.landMultiplier,
    affinityMultiplier,
    pendingCash: 0,
    totalEarned: 0,
    boostEndsAt: 0,
    createdAt: now,
    notifiedHighVault: false,
    constructionTotalDays: bp.constructionDays,
    constructionDaysRemaining: bp.constructionDays,
    constructionDailyInstallment: Math.round((baseCost * 0.015) / 100) * 100,
    doubleShiftApplied: false,
    dailyAccruedGross: 0,
    serviceQuality: 2.2,
    staffMorale: 78,
    qualityInvestmentLevel: 0,
    customerTrafficPct: 51,
    chainBrandName: resolvedChainBrand,
    chainBranchNumber: chainCloneMeta?.chainBranchNumber ?? 1,
    franchiseId: franchiseBrand?.id,
    franchiseBrandName: franchiseBrand?.brandName,
    franchiseOwnerId: franchiseBrand?.ownerId,
    franchiseRoyaltyRate: franchiseBrand?.royaltyRate,
  };

  // Ensure the cloned source business also shares the exact chainBrandName
  const existingUpdated = chainCloneMeta?.sourceBusinessId
    ? state.businesses.map((b) =>
        b.id === chainCloneMeta.sourceBusinessId
          ? {
              ...b,
              chainBrandName: resolvedChainBrand,
              chainBranchNumber: b.chainBranchNumber ?? 1,
            }
          : b
      )
    : state.businesses;

  const nextHq: HeadquartersInfo =
    state.businesses.length === 0 || !state.hq?.businessId
      ? {
          cityPlate: newBusiness.cityPlate,
          cityName: newBusiness.cityName,
          lat: newBusiness.lat,
          lng: newBusiness.lng,
          zoom: 15,
          businessId: newBusiness.id,
        }
      : state.hq;

  return {
    ok: true,
    business: newBusiness,
    state: {
      ...state,
      cash: state.cash - totalCost,
      hq: nextHq,
      businesses: [newBusiness, ...existingUpdated],
      lastSavedAt: now,
    },
  };
}

export function takeoverCompetitorBusiness(
  state: EmpireState,
  target: RemoteBusinessRecord,
  newOwner: { id: string; name: string },
  now = Date.now(),
  customMultiplier?: number
): ActionResult {
  if (target.owner_id === newOwner.id) {
    return { state, ok: false, error: 'Bu işletme zaten size ait.' };
  }

  const bp = getBlueprintById(target.business_type) ?? BUSINESS_BLUEPRINTS[0];
  const netWorth = calculateNetWorth(state, now);
  const tier = getCompanyTier(netWorth);
  if (state.businesses.length >= tier.maxBranches) {
    return {
      state,
      ok: false,
      error: `Devralma için boş şube kotası gerekiyor (${state.businesses.length}/${tier.maxBranches}).`,
    };
  }

  const mult =
    customMultiplier !== undefined
      ? Math.max(1.2, Math.min(1.5, customMultiplier))
      : TAKEOVER_VALUATION_MULTIPLIER;
  const takeoverPrice = Math.round((target.valuation * mult) / 1000) * 1000;
  if (state.cash < takeoverPrice) {
    return {
      state,
      ok: false,
      error: `Devralma için ${formatTL(takeoverPrice)} gereklidir (yetersiz bakiye).`,
    };
  }

  const prov = getProvinceByPlate(target.city_plate);
  const acquired: OwnedBusiness = {
    id: target.id,
    ownerId: newOwner.id,
    ownerName: newOwner.name,
    blueprintId: bp.id,
    customName: target.business_name,
    lat: target.lat,
    lng: target.lng,
    cityPlate: target.city_plate,
    cityName: target.city_name,
    districtName: target.district || prov.districts[0] || target.city_name,
    level: Math.max(1, target.level),
    staffCount: Math.min(bp.maxStaff, Math.max(1, target.level)),
    employees: [],
    stockLevel: 100,
    maintenanceLevel: 100,
    purchaseCost: Math.max(bp.baseCost, target.valuation),
    landMultiplier: prov.landMultiplier,
    affinityMultiplier: getAffinityMultiplier(bp, prov),
    pendingCash: 0,
    totalEarned: 0,
    boostEndsAt: 0,
    createdAt: now,
    notifiedHighVault: false,
    constructionTotalDays: 0,
    constructionDaysRemaining: 0,
    constructionDailyInstallment: 0,
    doubleShiftApplied: false,
    dailyAccruedGross: 0,
    chainBrandName: extractBaseBrandName(target.business_name),
    chainBranchNumber: 1,
  };

  return {
    ok: true,
    business: acquired,
    state: {
      ...state,
      cash: state.cash - takeoverPrice,
      businesses: [acquired, ...state.businesses.filter((b) => b.id !== acquired.id)],
      acquiredRivalIds: Array.from(new Set([...(state.acquiredRivalIds ?? []), target.id])),
      lastSavedAt: now,
    },
  };
}

export interface TickResult {
  state: EmpireState;
  highVaultBusinessIds: string[];
  newMarketEvent: MarketEvent | null;
  dividendPaid: number;
  autoCollectedHourlyAmount: number;
  hoursPassed: number;
  daysPassed: number;
  dayEndSummary: DayEndSummary | null;
  completedConstructions: OwnedBusiness[];
  daySimAutoStop: DaySimAutoStopAlert | null;
  loanEnforcement: LoanEnforcementResult;
  autoRenewedAdsCount: number;
  autoAdsSpent: number;
  autoAdBranchNames: string[];
  newFranchiseOpenings: FranchiseApplication[];
  accountantAutoPay: Omit<AccountantAutoPayResult, 'state'>;
  ceoActionsLog: string[];
  newTaxBillAmount: number;
}

/**
 * Evaluates whether Day-by-Day Fast Simulation ("Gün Gün İlerleme") should auto-stop
 * and protect the player:
 * 1) Any business finished construction & is ready to open
 * 2) A loan installment or monthly tax bill is due / overdue
 * 3) Main cash dropped below critical liquidity threshold
 */
export function evaluateDaySimAutoStop(
  prevState: EmpireState,
  nextState: EmpireState,
  completedConstructions: OwnedBusiness[],
  newTaxBillAmount: number
): DaySimAutoStopAlert | null {
  const currentDay = Math.floor((nextState.gameMinutes ?? STARTING_GAME_MINUTES) / 1440) + 1;

  if (completedConstructions.length > 0) {
    const first = completedConstructions[0];
    return {
      reason: 'construction_completed',
      title: 'İnşaat Tamamlandı — Açılışa Hazır!',
      message:
        completedConstructions.length === 1
          ? `"${first.customName}" şubesinin tadilat ve kurulum süreci tamamlandı! İşletme artık müşteri kabul edip ciro üretmeye başladı.`
          : `${completedConstructions.length} işletmenin inşaatı tamamlandı (ilk: "${first.customName}"). Şubeleriniz artık aktif ciro üretiyor!`,
      businessId: first.id,
      businessName: first.customName,
      gameDay: currentDay,
    };
  }

  const urgentLoan = (nextState.activeLoans ?? []).find(
    (l) =>
      (l.status === 'active' || l.status === 'garnishing') &&
      ((l.overdueDays ?? 0) > 0 || (l.nextDueGameDay ?? 999_999) - currentDay <= 1)
  );
  const urgentTax = (nextState.pendingTaxes ?? []).find(
    (t) => t.status !== 'paid' && (t.status === 'overdue' || t.dueGameDay - currentDay <= 1)
  );

  if (newTaxBillAmount > 0 || urgentLoan || urgentTax) {
    const amount = newTaxBillAmount || (urgentLoan?.monthlyInstallment ?? 0) || urgentTax?.amount || 0;
    const detail = urgentLoan
      ? `${urgentLoan.bankName} kredi taksiti (${formatTL(urgentLoan.monthlyInstallment ?? 0)}) vadesi geldi.`
      : newTaxBillAmount > 0
      ? `Ay sonu mali beyanname ve vergi tahakkuku (${formatTL(newTaxBillAmount)}) oluşturuldu.`
      : `Ödenmemiş vergi tahakkuku (${formatTL(urgentTax?.amount ?? 0)}) son ödeme gününe yaklaştı.`;
    return {
      reason: 'payment_due',
      title: 'Kredi / Vergi Ödeme Vadesi Geldi',
      message: `${detail} Gecikme faizi veya haciz riskine karşı simülasyon otomatik olarak 1x hızına alındı.`,
      amount,
      gameDay: currentDay,
    };
  }

  const dailyFixedBurn =
    nextState.businesses.reduce((s, b) => s + calculateDailyRentAndUtilities(b), 0) +
    calculateTotalDailyPayrollBreakdown(nextState).dailyTotalCost;
  const criticalThreshold = Math.max(25_000, Math.round(dailyFixedBurn * 2));

  if (nextState.cash < criticalThreshold && (nextState.cash < prevState.cash || nextState.cash < 25_000)) {
    return {
      reason: 'critical_cash',
      title: 'Kritik Nakit Uyarısı!',
      message: `Kasa bakiyeniz ${formatTL(nextState.cash)} seviyesine düştü (güvenli eşik: ${formatTL(criticalThreshold)}). Günlük kira, maaş ve tedarik akışını kontrol etmeniz için hız 1x'e çekildi.`,
      amount: nextState.cash,
      gameDay: currentDay,
    };
  }

  return null;
}

export function tickEconomy(
  state: EmpireState,
  elapsedSec: number,
  now = Date.now(),
  randomIndex?: number,
  stockQuotes?: StockQuote[],
  ceoContext?: {
    owner: { id: string; name: string };
    rivalRecords?: RemoteBusinessRecord[];
  }
): TickResult {
  const safeDt = Math.max(0, Math.min(elapsedSec, 3600));
  if (safeDt === 0) {
    return {
      state,
      highVaultBusinessIds: [],
      newMarketEvent: null,
      dividendPaid: 0,
      autoCollectedHourlyAmount: 0,
      hoursPassed: 0,
      daysPassed: 0,
      dayEndSummary: null,
      completedConstructions: [],
      daySimAutoStop: null,
      loanEnforcement: {
        state,
        garnishedTotal: 0,
        defaultInterestAdded: 0,
        legalWarnings: [],
        seizedLoans: [],
      },
      autoRenewedAdsCount: 0,
      autoAdsSpent: 0,
      autoAdBranchNames: [],
      newFranchiseOpenings: [],
      accountantAutoPay: {
        autoPaidLoanAmount: 0,
        autoPaidLoanCount: 0,
        autoPaidTaxAmount: 0,
        autoPaidTaxCount: 0,
      },
      ceoActionsLog: [],
      newTaxBillAmount: 0,
    };
  }

  const prevMinutes = state.gameMinutes ?? STARTING_GAME_MINUTES;
  const nextMinutes = prevMinutes + safeDt * GAME_MINUTES_PER_REAL_SEC;
  const hoursPassed = Math.floor(nextMinutes / 60) - Math.floor(prevMinutes / 60);
  const prevTotalDay = Math.floor(prevMinutes / 1440) + 1;
  const nextTotalDay = Math.floor(nextMinutes / 1440) + 1;
  const daysPassed = Math.max(0, nextTotalDay - prevTotalDay);

  const highVaultBusinessIds: string[] = [];
  const completedConstructions: OwnedBusiness[] = [];

  let activeEvent = state.activeEvent;
  let newMarketEvent: MarketEvent | null = null;

  if (!activeEvent || activeEvent.endsAt <= now) {
    const idx =
      randomIndex !== undefined
        ? Math.abs(randomIndex) % MARKET_EVENT_TEMPLATES.length
        : Math.floor(Math.random() * MARKET_EVENT_TEMPLATES.length);
    const tpl = MARKET_EVENT_TEMPLATES[idx];
    activeEvent = {
      ...tpl,
      startedAt: now,
      endsAt: now + tpl.durationSec * 1000,
    };
    newMarketEvent = activeEvent;
  }

  // Allocate city manager daily payroll across overseen branches for accurate 00:00 branch P&L
  const cityManagers = state.cityManagers ?? [];
  const cityDailyPayrollByPlate = new Map<number, number>();
  for (const m of cityManagers) {
    if (m.assignedCityPlate !== undefined) {
      cityDailyPayrollByPlate.set(
        m.assignedCityPlate,
        (cityDailyPayrollByPlate.get(m.assignedCityPlate) ?? 0) + getStaffDailyCost(m).dailyTotalCost
      );
    }
  }
  const cityBranchCountByPlate = new Map<number, number>();
  for (const b of state.businesses) {
    cityBranchCountByPlate.set(b.cityPlate, (cityBranchCountByPlate.get(b.cityPlate) ?? 0) + 1);
  }

  let autoCollectedAtMidnight = 0;
  let dailyGrossRevenue = 0;
  let dailySupplyCost = 0;
  let dailyUtilitiesAndRent = 0;
  let dailyBranchSalaries = 0;
  let manualCollectibleNet = 0;
  let autoSettledNet = 0;
  const branchLines: DayEndBranchLine[] = [];

  const officeBenefits = calculateOfficeBenefits(state);

  const updatedBusinesses = state.businesses.map((b) => {
    const bp = getBlueprintById(b.blueprintId);
    const automation = resolveBusinessAutomation(b, cityManagers, state.businesses);
    const wasUnderConstruction = isBusinessUnderConstruction(b);
    const incomePerSec = calculateBusinessIncomePerSec(b, activeEvent, now, state.businesses, state);
    const earned = incomePerSec * safeDt;
    const capacity = calculateVaultCapacity(b);
    const slots = getBranchStaffSlots(b);

    // Stock, Maintenance & Staff Morale dynamics (paused during construction)
    let nextStock = b.stockLevel ?? 100;
    let nextMaint = b.maintenanceLevel ?? 100;
    let nextMorale = b.staffMorale ?? (slots.workers > 0 ? 78 : 55);

    if (!wasUnderConstruction) {
      if (automation.autoStock) {
        nextStock = 100;
      } else {
        nextStock = Math.max(15, nextStock - safeDt * 0.22);
      }

      if (automation.autoMaintenance) {
        nextMaint = 100;
      } else {
        nextMaint = Math.max(20, nextMaint - safeDt * 0.16);
      }

      // Morale degrades faster if understaffed (0-1 worker) or neglected; recovers with manager & quality investment
      if (automation.fullAutomation) {
        nextMorale = Math.min(96, nextMorale + safeDt * 0.08);
      } else if (slots.workers <= 1 || nextMaint < 55) {
        nextMorale = Math.max(25, nextMorale - safeDt * 0.18);
      } else {
        nextMorale = Math.max(45, nextMorale - safeDt * 0.05);
      }
    }

    const qualityPreview = calculateBranchServiceQuality(
      { ...b, stockLevel: nextStock, maintenanceLevel: nextMaint, staffMorale: nextMorale },
      cityManagers,
      state.businesses
    );

    // Intra-day: accumulate gross sales inside branch register (NEVER stream per-second to main cash)
    if (daysPassed === 0) {
      const nextDailyAccrued = wasUnderConstruction ? 0 : (b.dailyAccruedGross ?? 0) + earned;
      const nextPending = wasUnderConstruction
        ? b.pendingCash
        : Math.min(Math.max(capacity, nextDailyAccrued), b.pendingCash + earned);

      const hitHighRatio =
        !wasUnderConstruction &&
        !automation.autoCollectRevenue &&
        capacity > 0 &&
        nextPending / capacity >= HIGH_VAULT_NOTIFY_RATIO &&
        !b.notifiedHighVault;

      if (hitHighRatio) {
        highVaultBusinessIds.push(b.id);
      }

      return {
        ...b,
        stockLevel: Number(nextStock.toFixed(1)),
        maintenanceLevel: Number(nextMaint.toFixed(1)),
        staffMorale: Number(nextMorale.toFixed(1)),
        serviceQuality: qualityPreview.stars,
        customerTrafficPct: qualityPreview.customerTrafficPct,
        pendingCash: nextPending,
        dailyAccruedGross: nextDailyAccrued,
        notifiedHighVault: automation.autoCollectRevenue
          ? false
          : b.notifiedHighVault || hitHighRatio,
      };
    }

    // Midnight 00:00 Settlement (daysPassed >= 1)
    const prevRem = b.constructionDaysRemaining ?? 0;
    const nextRem = prevRem > 0 ? Math.max(0, prevRem - daysPassed) : 0;

    // Daily branch staff wages (gross + 22.5% employer SGK)
    const ownStaffDaily = (b.employees ?? []).reduce((s, e) => s + getStaffDailyCost(e).dailyTotalCost, 0);
    const sharedCityDaily = Math.round(
      (cityDailyPayrollByPlate.get(b.cityPlate) ?? 0) /
        Math.max(1, cityBranchCountByPlate.get(b.cityPlate) ?? 1)
    );
    const branchStaffWagesTotal = Math.round((ownStaffDaily + sharedCityDaily) * daysPassed);
    const branchRentAndUtil = Math.round(calculateDailyRentAndUtilities(b) * daysPassed);

    let branchGross = 0;
    let branchSupply = 0;
    if (!wasUnderConstruction) {
      branchGross = Math.round((b.dailyAccruedGross ?? 0) + earned);
      const supplyRatio = bp?.baseCogsRatio ?? 0.44;
      const rawSupply = Math.round(branchGross * supplyRatio);
      const chainStatus = getChainStatusForBusiness(b, state.businesses);
      let discountPct =
        automation.bulkSupplyDiscount +
        chainStatus.supplyDiscount +
        officeBenefits.supplyDiscountRate;
      if (hasFactorySupplySynergy(b, state.businesses)) {
        discountPct += FACTORY_SUPPLY_DISCOUNT;
      }
      if (b.blueprintId === 'supermarket' && state.supermarketChain) {
        discountPct += SUPERMARKET_CHAIN_DISCOUNT;
      }
      discountPct = Math.min(0.68, discountPct);
      branchSupply = Math.max(0, Math.round(rawSupply * (1 - discountPct)));
    }

    const branchNet = branchGross - branchSupply - branchRentAndUtil - branchStaffWagesTotal;
    const isAutoSettled = !wasUnderConstruction && automation.autoCollectRevenue;

    dailyGrossRevenue += branchGross;
    dailySupplyCost += branchSupply;
    dailyUtilitiesAndRent += branchRentAndUtil;
    dailyBranchSalaries += branchStaffWagesTotal;

    if (isAutoSettled) {
      autoSettledNet += branchNet;
      autoCollectedAtMidnight += branchNet;
    } else {
      manualCollectibleNet += branchNet;
    }

    branchLines.push({
      businessId: b.id,
      name: b.customName,
      cityLabel: `${String(b.cityPlate).padStart(2, '0')} ${b.cityName}`,
      sectorName: bp?.shortName ?? b.blueprintId,
      underConstruction: wasUnderConstruction,
      constructionDaysRemaining: nextRem,
      grossRevenue: branchGross,
      supplyCost: branchSupply,
      utilitiesAndRent: branchRentAndUtil,
      dailyStaffWages: branchStaffWagesTotal,
      netDailyProfit: branchNet,
      isLoss: branchNet < 0,
      autoSettled: isAutoSettled,
    });

    const updatedBiz: OwnedBusiness = {
      ...b,
      stockLevel: Number(nextStock.toFixed(1)),
      maintenanceLevel: Number(nextMaint.toFixed(1)),
      staffMorale: Number(nextMorale.toFixed(1)),
      serviceQuality: qualityPreview.stars,
      customerTrafficPct: qualityPreview.customerTrafficPct,
      constructionDaysRemaining: nextRem,
      dailyAccruedGross: 0,
      // Auto-settled branches clear immediately at 00:00; manual branches await Day-End Report collection
      pendingCash: isAutoSettled ? 0 : Math.max(0, branchNet),
      totalEarned: isAutoSettled ? b.totalEarned + Math.max(0, branchNet) : b.totalEarned,
      notifiedHighVault: false,
    };

    if (wasUnderConstruction && nextRem === 0) {
      completedConstructions.push(updatedBiz);
    }

    return updatedBiz;
  });

  // Live stock dividends
  let dividendPaid = stockQuotes
    ? calculateDividendPerTick(state, stockQuotes, safeDt)
    : 0;

  // Passive royalty stream if player owns active franchise brands with branches
  const passiveRoyaltyGain = (state.ownFranchises ?? []).reduce(
    (sum, f) => sum + f.branchCount * 420 * f.royaltyRate * safeDt,
    0
  );

  // Day-end 00:00 report, 7-day weekly dividend & 30-day monthly balance closing
  let dayEndSummary: DayEndSummary | null = null;
  let weeklyDividendBonus = 0;
  let nextCreditScore = state.creditScore ?? STARTING_CREDIT_SCORE;
  let nextPendingDayEndReports = [...(state.pendingDayEndReports ?? [])];
  let nextDayEndHistory = [...(state.dayEndHistory ?? [])];

  if (daysPassed > 0) {
    const completedDay = nextTotalDay - 1;
    const completedMonth = Math.floor((completedDay - 1) / 30) + 1;
    const completedDayOfMonth = ((completedDay - 1) % 30) + 1;

    // Corporate HQ daily payroll (Accountant + CEO incl. 22.5% employer SGK)
    const corpDailyCost = Math.round(
      ((state.accountant?.hourlySalary ?? 0) + (state.ceo?.hourlySalary ?? 0)) *
        24 *
        (1 + TURKEY_EMPLOYER_SGK_RATE) *
        daysPassed
    );
    const totalDailySalariesPaid = dailyBranchSalaries + corpDailyCost;
    const dailyNetCashFlow =
      dailyGrossRevenue - dailySupplyCost - dailyUtilitiesAndRent - totalDailySalariesPaid;

    // Deduct corporate HQ daily payroll automatically if accountant/CEO employed
    if (corpDailyCost > 0) {
      autoSettledNet -= corpDailyCost;
      autoCollectedAtMidnight -= corpDailyCost;
    }

    // Healthy daily standing gently grows credit score (+5/day), while garnishing reduces it (-10/day)
    const hasGarnishingLoan = (state.activeLoans ?? []).some((l) => l.status === 'garnishing');
    const creditScoreDelta = hasGarnishingLoan ? -10 : updatedBusinesses.length > 0 ? 5 : 2;
    nextCreditScore = Math.max(0, Math.min(1900, nextCreditScore + creditScoreDelta));

    // Weekly Dividend every 7th day
    if (completedDay % 7 === 0) {
      const portfolioVal = stockQuotes
        ? calculatePortfolioMarketValue(state, stockQuotes)
        : (state.stockPortfolio ?? []).reduce((s, h) => s + Math.round(h.shares * h.avgCost), 0);
      if (portfolioVal > 0) {
        weeklyDividendBonus = Math.max(500, Math.round(portfolioVal * 0.012));
        dividendPaid += weeklyDividendBonus;
      }
    }

    // Monthly Balance Sheet Closing every 30th day
    let monthlyClosing: MonthlyClosingSummary | null = null;
    if (completedDay % 30 === 0) {
      const projectedNetWorth = calculateNetWorth(
        { ...state, businesses: updatedBusinesses },
        now,
        stockQuotes
      );
      monthlyClosing = {
        monthNumber: Math.max(1, Math.floor(completedDay / 30)),
        totalDays: completedDay,
        netWorth: projectedNetWorth,
        branchCount: updatedBusinesses.length,
        estimatedMonthlyProfit: Math.round(dailyNetCashFlow * 30),
      };
    }

    const hasManualSettlement = branchLines.some((l) => !l.autoSettled);
    const alreadyCollected = !hasManualSettlement;

    dayEndSummary = {
      id: `dayend-${completedDay}-${now}`,
      completedDay,
      month: completedMonth,
      dayOfMonth: completedDayOfMonth,
      dailyGrossRevenue,
      dailySupplyCost,
      dailyUtilitiesAndRent,
      dailySalariesPaid: totalDailySalariesPaid,
      dailyNetCashFlow,
      manualCollectibleNet,
      autoSettledNet,
      creditScoreDelta,
      weeklyDividendPaid: weeklyDividendBonus,
      monthlyClosing,
      branchLines,
      collected: alreadyCollected,
    };

    if (branchLines.length > 0 || corpDailyCost > 0) {
      if (alreadyCollected) {
        nextDayEndHistory = [dayEndSummary, ...nextDayEndHistory].slice(0, 365);
      } else {
        nextPendingDayEndReports = [dayEndSummary, ...nextPendingDayEndReports].slice(0, 30);
      }
    }
  }

  const cleanedBusinesses = updatedBusinesses.map((b) =>
    b.activeAdCampaign && b.activeAdCampaign.endsAtGameMin <= nextMinutes
      ? { ...b, activeAdCampaign: null }
      : b
  );
  const activeBlitzes = (state.competitiveBlitzes ?? []).filter(
    (bl) => bl.endsAtGameMin > nextMinutes
  );

  // Monthly Tax Accrual & Overdue Tax tracking
  let nextPendingTaxes = [...(state.pendingTaxes ?? [])];
  let newTaxBillAmount = 0;

  if (daysPassed > 0) {
    const completedDay = nextTotalDay - 1;
    // Update overdue days on existing unpaid tax bills
    nextPendingTaxes = nextPendingTaxes.map((bill) => {
      if (bill.status === 'paid') return bill;
      const overdue = Math.max(0, nextTotalDay - bill.dueGameDay);
      return overdue > 0
        ? { ...bill, overdueDays: overdue, status: 'overdue' as const }
        : bill;
    });

    // Every 30th day (monthly closing): generate realistic Turkish monthly tax obligation
    if (completedDay % 30 === 0 && updatedBusinesses.length > 0) {
      const totalHourlyGross = updatedBusinesses.reduce(
        (sum, b) =>
          sum + calculateBusinessHourlyIncome(b, activeEvent, now, updatedBusinesses, state),
        0
      );
      const hourlyPayroll =
        calculateTotalHourlyPayroll(state) +
        (state.accountant?.hourlySalary ?? 0) +
        (state.ceo?.hourlySalary ?? 0);
      const hourlyRentAndUtilities = Math.round(
        updatedBusinesses.reduce((s, b) => s + calculateDailyRentAndUtilities(b), 0) / 24
      );
      const estNetWorth = calculateNetWorth(
        { ...state, businesses: updatedBusinesses },
        now,
        stockQuotes
      );
      const { breakdown } = calculateHourlyTaxBreakdown({
        hourlyGrossRevenue: totalHourlyGross,
        hourlyPayroll,
        hourlyOperatingExpensesBeforeTax:
          hourlyPayroll + hourlyRentAndUtilities + Math.round(totalHourlyGross * 0.2),
        hourlyRentAndUtilities,
        branchCount: updatedBusinesses.length,
        netWorth: estNetWorth,
        accountant: state.accountant,
      });
      const monthNum = Math.max(1, Math.floor(completedDay / 30));
      const newBill = createMonthlyTaxObligation(monthNum, completedDay, breakdown, now);
      if (newBill) {
        nextPendingTaxes = [newBill, ...nextPendingTaxes].slice(0, 12);
        newTaxBillAmount = newBill.amount;
      }
    }
  }

  const brandUpdate = computeNextBrandRecognition(
    state.brandRecognition ?? STARTING_BRAND_RECOGNITION,
    cleanedBusinesses,
    cityManagers,
    daysPassed,
    nextMinutes
  );

  // v1.4.1: Operating losses can push company treasury into negative balance (eksi kasa)!
  let preLoanState: EmpireState = {
    ...state,
    gameMinutes: nextMinutes,
    creditScore: nextCreditScore,
    brandRecognition: brandUpdate.nextBrand,
    cash: state.cash + autoCollectedAtMidnight + dividendPaid + passiveRoyaltyGain,
    totalEarnedLifetime:
      state.totalEarnedLifetime +
      Math.max(0, autoCollectedAtMidnight) +
      dividendPaid +
      passiveRoyaltyGain,
    franchiseRoyaltiesEarned: (state.franchiseRoyaltiesEarned ?? 0) + passiveRoyaltyGain,
    businesses: cleanedBusinesses,
    competitiveBlitzes: activeBlitzes,
    pendingTaxes: nextPendingTaxes,
    pendingDayEndReports: nextPendingDayEndReports,
    dayEndHistory: nextDayEndHistory,
    activeEvent,
    lastSavedAt: now,
  };

  // Genel Müdür automatic ad campaign renewal
  let autoRenewedAdsCount = 0;
  let autoAdsSpent = 0;
  let autoAdBranchNames: string[] = [];
  if (
    hoursPassed > 0 ||
    (preLoanState.cityManagers ?? []).some((m) => m.role === 'genel_mudur' && m.autoAdsEnabled)
  ) {
    const gmAdRes = runGeneralManagerAutoAds(
      preLoanState,
      (biz) =>
        calculateBusinessHourlyIncome(
          { ...biz, activeAdCampaign: null },
          activeEvent,
          now,
          preLoanState.businesses,
          preLoanState
        ),
      now
    );
    preLoanState = gmAdRes.state;
    autoRenewedAdsCount = gmAdRes.renewedCount;
    autoAdsSpent = gmAdRes.totalSpent;
    autoAdBranchNames = gmAdRes.renewedBranchNames;
  }

  // Automatic AI Franchise entrepreneur applications & branch openings
  const franchiseAppRes = processAutoFranchiseApplications(preLoanState, hoursPassed, now);
  preLoanState = franchiseAppRes.state;
  const newFranchiseOpenings = franchiseAppRes.autoApprovedApps;

  // v1.3.0 Muhasebeci / Mali Müşavir Automatic Tax & Monthly Loan Installment Payment
  const accPayRes = processAccountantAutoPayments(preLoanState, now);
  preLoanState = accPayRes.state;

  // Enforce overdue monthly loans (daily default interest -> 15d legal warning -> 30d foreclosure)
  const loanEnforcement = enforceOverdueLoans(
    preLoanState,
    Math.max(0, autoCollectedAtMidnight) + dividendPaid + passiveRoyaltyGain,
    now,
    daysPassed
  );
  let finalState = loanEnforcement.state;

  // v1.3.0 Holding Autonomous CEO growth execution
  let ceoActionsLog: string[] = [];
  if (daysPassed > 0 && finalState.ceo?.autonomousGrowthEnabled && ceoContext) {
    const nw = calculateNetWorth(finalState, now, stockQuotes);
    const tier = getCompanyTier(nw);
    const ceoRes = runAutonomousCeoTick(
      finalState,
      tier.maxBranches,
      tier.level,
      ceoContext.owner,
      ceoContext.rivalRecords ?? [],
      now
    );
    finalState = ceoRes.state;
    ceoActionsLog = ceoRes.actionsLog;
  }

  const daySimAutoStop =
    daysPassed > 0
      ? evaluateDaySimAutoStop(state, finalState, completedConstructions, newTaxBillAmount)
      : null;

  return {
    state: finalState,
    highVaultBusinessIds,
    newMarketEvent,
    dividendPaid,
    autoCollectedHourlyAmount: Math.max(0, autoCollectedAtMidnight),
    hoursPassed,
    daysPassed,
    dayEndSummary,
    completedConstructions,
    daySimAutoStop,
    loanEnforcement,
    autoRenewedAdsCount,
    autoAdsSpent,
    autoAdBranchNames,
    newFranchiseOpenings,
    accountantAutoPay: {
      autoPaidLoanAmount: accPayRes.autoPaidLoanAmount,
      autoPaidLoanCount: accPayRes.autoPaidLoanCount,
      autoPaidTaxAmount: accPayRes.autoPaidTaxAmount,
      autoPaidTaxCount: accPayRes.autoPaidTaxCount,
    },
    ceoActionsLog,
    newTaxBillAmount,
  };
}

/**
 * Settles uncollected 00:00 Day-End Report(s) ("Gün Sonu Hasılatını Kasaya Aktar")
 * into main treasury and archives them into dayEndHistory.
 */
export function collectDayEndReport(
  state: EmpireState,
  reportId?: string,
  now = Date.now()
): ActionResult {
  const pending = state.pendingDayEndReports ?? [];
  const targets = reportId ? pending.filter((r) => r.id === reportId) : pending;

  if (targets.length === 0) {
    return { state, ok: false, error: 'Tahsil edilecek gün sonu raporu bulunmuyor.' };
  }

  const targetIds = new Set(targets.map((r) => r.id));
  const netDelta = targets.reduce((sum, r) => sum + r.manualCollectibleNet, 0);
  const remaining = pending.filter((r) => !targetIds.has(r.id));
  const archived = targets.map((r) => ({ ...r, collected: true }));

  // Credit branch lifetime earnings for profitable manual lines in the collected reports
  const branchNetGain = new Map<string, number>();
  for (const rep of targets) {
    for (const line of rep.branchLines) {
      if (!line.autoSettled && line.netDailyProfit > 0) {
        branchNetGain.set(
          line.businessId,
          (branchNetGain.get(line.businessId) ?? 0) + line.netDailyProfit
        );
      }
    }
  }

  const nextBusinesses = state.businesses.map((b) => {
    const gain = branchNetGain.get(b.id) ?? 0;
    return {
      ...b,
      pendingCash: remaining.length === 0 ? 0 : Math.max(0, b.pendingCash - gain),
      totalEarned: b.totalEarned + gain,
      notifiedHighVault: false,
    };
  });

  return {
    ok: true,
    collectedAmount: netDelta,
    state: {
      ...state,
      // Allow negative netDelta (operating losses) to deduct from cash even below 0 (eksi bakiye)
      cash: state.cash + netDelta,
      totalEarnedLifetime: state.totalEarnedLifetime + Math.max(0, netDelta),
      businesses: nextBusinesses,
      pendingDayEndReports: remaining,
      dayEndHistory: [...archived, ...(state.dayEndHistory ?? [])].slice(0, 365),
      lastSavedAt: now,
    },
  };
}

export function collectBusinessCash(
  state: EmpireState,
  businessId: string,
  now = Date.now()
): ActionResult {
  const target = state.businesses.find((b) => b.id === businessId);
  if (!target) return { state, ok: false, error: 'İşletme bulunamadı.' };

  const amount = Math.floor(target.pendingCash);
  if (amount <= 0) {
    return { state, ok: false, error: 'Toplanacak gelir henüz oluşmadı.' };
  }

  return {
    ok: true,
    collectedAmount: amount,
    state: {
      ...state,
      cash: state.cash + amount,
      totalEarnedLifetime: state.totalEarnedLifetime + amount,
      businesses: state.businesses.map((b) =>
        b.id === businessId
          ? {
              ...b,
              pendingCash: b.pendingCash - amount,
              totalEarned: b.totalEarned + amount,
              notifiedHighVault: false,
            }
          : b
      ),
      lastSavedAt: now,
    },
  };
}

export function collectAllCash(state: EmpireState, now = Date.now()): ActionResult {
  let collected = 0;
  const businesses = state.businesses.map((b) => {
    const amt = Math.floor(b.pendingCash);
    if (amt <= 0) return b;
    collected += amt;
    return {
      ...b,
      pendingCash: b.pendingCash - amt,
      totalEarned: b.totalEarned + amt,
      notifiedHighVault: false,
    };
  });

  if (collected <= 0) {
    return { state, ok: false, collectedAmount: 0, error: 'Toplanacak gelir bulunmuyor.' };
  }

  return {
    ok: true,
    collectedAmount: collected,
    state: {
      ...state,
      cash: state.cash + collected,
      totalEarnedLifetime: state.totalEarnedLifetime + collected,
      businesses,
      lastSavedAt: now,
    },
  };
}

export function upgradeBusiness(
  state: EmpireState,
  businessId: string,
  now = Date.now()
): ActionResult {
  const target = state.businesses.find((b) => b.id === businessId);
  if (!target) return { state, ok: false, error: 'İşletme bulunamadı.' };
  const bp = getBlueprintById(target.blueprintId);
  if (!bp) return { state, ok: false, error: 'Geçersiz işletme.' };
  if (target.level >= bp.maxLevel) {
    return { state, ok: false, error: 'Maksimum seviyeye ulaşıldı.' };
  }
  const cost = calculateUpgradeCost(target);
  if (state.cash < cost) {
    return { state, ok: false, error: 'Yükseltme için yetersiz bakiye.' };
  }

  const upgraded: OwnedBusiness = { ...target, level: target.level + 1 };
  return {
    ok: true,
    business: upgraded,
    state: {
      ...state,
      cash: state.cash - cost,
      businesses: state.businesses.map((b) => (b.id === businessId ? upgraded : b)),
      lastSavedAt: now,
    },
  };
}

export function hireStaff(
  state: EmpireState,
  businessId: string,
  now = Date.now()
): ActionResult {
  const target = state.businesses.find((b) => b.id === businessId);
  if (!target) return { state, ok: false, error: 'İşletme bulunamadı.' };
  const bp = getBlueprintById(target.blueprintId);
  if (!bp) return { state, ok: false, error: 'Geçersiz işletme.' };
  const slots = getBranchStaffSlots(target);
  if (slots.workers >= MAX_BRANCH_WORKERS) {
    return {
      state,
      ok: false,
      error: `Kadro Dolu (${slots.workers}/${MAX_BRANCH_WORKERS} Çalışan). Şube başına en fazla 4 çalışan alınabilir.`,
    };
  }
  const cost = calculateStaffHireCost(target);
  if (state.cash < cost) {
    return { state, ok: false, error: 'Personel alımı için yetersiz bakiye.' };
  }

  const updated: OwnedBusiness = { ...target, staffCount: target.staffCount + 1 };
  return {
    ok: true,
    business: updated,
    state: {
      ...state,
      cash: state.cash - cost,
      businesses: state.businesses.map((b) => (b.id === businessId ? updated : b)),
      lastSavedAt: now,
    },
  };
}

export function activateMarketingBoost(
  state: EmpireState,
  businessId: string,
  now = Date.now()
): ActionResult {
  const target = state.businesses.find((b) => b.id === businessId);
  if (!target) return { state, ok: false, error: 'İşletme bulunamadı.' };
  if (target.boostEndsAt > now) {
    return { state, ok: false, error: 'Kampanya zaten aktif.' };
  }
  const cost = calculateBoostCost(target);
  if (state.cash < cost) {
    return { state, ok: false, error: 'Kampanya için yetersiz bakiye.' };
  }

  const updated: OwnedBusiness = { ...target, boostEndsAt: now + 60_000 };
  return {
    ok: true,
    business: updated,
    state: {
      ...state,
      cash: state.cash - cost,
      businesses: state.businesses.map((b) => (b.id === businessId ? updated : b)),
      lastSavedAt: now,
    },
  };
}

export function sellBusiness(
  state: EmpireState,
  businessId: string,
  now = Date.now()
): ActionResult {
  const target = state.businesses.find((b) => b.id === businessId);
  if (!target) return { state, ok: false, error: 'İşletme bulunamadı.' };
  if (target.pledgedLoanId) {
    return {
      state,
      ok: false,
      error: 'Bu işletme aktif kredi teminatı olarak rehinli! Önce krediyi kapatın.',
    };
  }

  const valuation = calculateBusinessValuation(target, state.activeEvent, now);
  const pending = Math.floor(target.pendingCash);
  const payout = valuation + pending;

  return {
    ok: true,
    collectedAmount: payout,
    state: {
      ...state,
      cash: state.cash + payout,
      businesses: state.businesses.filter((b) => b.id !== businessId),
      lastSavedAt: now,
    },
  };
}

export function getMissionProgress(
  state: EmpireState,
  mission: MissionDef,
  now = Date.now(),
  stockQuotes?: StockQuote[]
): number {
  return evaluateDynamicMissionProgress(state, mission, now, stockQuotes);
}

export function claimMissionReward(
  state: EmpireState,
  mission: MissionDef,
  now = Date.now(),
  stockQuotes?: StockQuote[]
): ActionResult {
  if (state.claimedMissionIds.includes(mission.id)) {
    return { state, ok: false, error: 'Ödül zaten alındı.' };
  }
  const progress = getMissionProgress(state, mission, now, stockQuotes);
  if (progress < mission.targetValue) {
    return { state, ok: false, error: 'Görev henüz tamamlanmadı.' };
  }

  const nextCompletedCount = (state.completedMissionsCount ?? 0) + 1;
  const rewardXp = mission.rewardXp ?? 150;
  const remainingMissions = (state.activeMissions ?? []).filter((m) => m.id !== mission.id);

  const interimState: EmpireState = {
    ...state,
    cash: state.cash + mission.rewardCash,
    companyXp: (state.companyXp ?? 0) + rewardXp,
    claimedMissionIds: [...state.claimedMissionIds, mission.id],
    completedMissionsCount: nextCompletedCount,
    lastSavedAt: now,
  };

  // Automatically generate a fresh tailored replacement mission
  const replacement = generateNextDynamicMission(
    interimState,
    remainingMissions,
    nextCompletedCount + remainingMissions.length + 1,
    now,
    stockQuotes
  );

  return {
    ok: true,
    collectedAmount: mission.rewardCash,
    state: {
      ...interimState,
      activeMissions: [...remainingMissions, replacement],
    },
  };
}

export function formatTL(amount: number, compact = false): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);

  if (compact) {
    if (abs >= 1_000_000_000) {
      return `${sign}₺${(abs / 1_000_000_000).toFixed(2).replace('.', ',')} Mr`;
    }
    if (abs >= 1_000_000) {
      return `${sign}₺${(abs / 1_000_000).toFixed(2).replace('.', ',')} Mn`;
    }
    if (abs >= 100_000) {
      return `${sign}₺${Math.round(abs / 1_000)} B`;
    }
  }

  return `${sign}₺${abs.toLocaleString('tr-TR')}`;
}

export { BUSINESS_BLUEPRINTS };
