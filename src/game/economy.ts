import type {
  BusinessBlueprint,
  BusinessTypeId,
  CompanyTier,
  EmpireState,
  FranchiseBrand,
  MarketEvent,
  MissionDef,
  OwnedBusiness,
  PinLocationInfo,
  RemoteBusinessRecord,
  StockQuote,
} from '../types/game';
import {
  AVM_SYNERGY_MULTIPLIER,
  BUSINESS_BLUEPRINTS,
  COMPANY_TIERS,
  FACTORY_SUPPLIED_TYPES,
  FACTORY_SUPPLY_DISCOUNT,
  FRANCHISE_BRANCH_BONUS_MULTIPLIER,
  MARKET_EVENT_TEMPLATES,
  MIN_BUSINESS_DISTANCE_METERS,
  PARKING_CAPACITY_BONUS,
  PARKING_SYNERGY_RADIUS_METERS,
  STARTING_CASH,
  STARTING_CREDIT_SCORE,
  SUPERMARKET_CHAIN_DISCOUNT,
  TAKEOVER_VALUATION_MULTIPLIER,
  getBlueprintById,
  isFactoryType,
  isParkingType,
} from './catalog';
import { getProvinceByPlate, haversineMeters } from './provinces81';
import {
  calculateStaffQualityMultiplier,
  generateCandidatePool,
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

export const HIGH_VAULT_NOTIFY_RATIO = 0.75;

export function createInitialEmpireState(now = Date.now()): EmpireState {
  const initialTemplate = MARKET_EVENT_TEMPLATES[2]; // Ticari Emlak Canlanması
  return {
    cash: STARTING_CASH,
    totalEarnedLifetime: 0,
    businesses: [],
    cityManagers: [],
    candidatePool: generateCandidatePool(now, 'kafe'),
    supermarketChain: null,
    ownFranchises: [],
    franchiseRoyaltiesEarned: 0,
    stockPortfolio: [],
    playerIpo: null,
    creditScore: STARTING_CREDIT_SCORE,
    ownBank: null,
    activeLoans: [],
    claimedMissionIds: [],
    activeEvent: {
      ...initialTemplate,
      startedAt: now,
      endsAt: now + initialTemplate.durationSec * 1000,
    },
    lastSavedAt: now,
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
  stateContext?: Pick<EmpireState, 'cityManagers' | 'supermarketChain'>
): number {
  const bp = getBlueprintById(business.blueprintId);
  if (!bp) return 0;

  const levelMultiplier = 1 + (business.level - 1) * 0.45;
  const automation = resolveBusinessAutomation(
    business,
    stateContext?.cityManagers ?? [],
    allOwnBusinesses ?? [business]
  );
  const staffMultiplier = calculateStaffQualityMultiplier(business, automation);
  const boostMultiplier = business.boostEndsAt > now ? 2.0 : 1.0;

  const avmSynergy =
    allOwnBusinesses && hasAvmSynergyForBusiness(business, allOwnBusinesses)
      ? AVM_SYNERGY_MULTIPLIER
      : 1.0;

  const parkingSynergy =
    allOwnBusinesses && hasParkingSynergyForBusiness(business, allOwnBusinesses)
      ? 1 + PARKING_CAPACITY_BONUS
      : 1.0;

  // Factory 35% supply cost reduction -> translates into strong +22% net profit boost (35% cost saving on ~62% COGS)
  const factorySynergy =
    allOwnBusinesses && hasFactorySupplySynergy(business, allOwnBusinesses)
      ? 1 + FACTORY_SUPPLY_DISCOUNT * 0.65
      : 1.0;

  // Supermarket chain bulk procurement discount (+14% net margin)
  const chainSynergy =
    business.blueprintId === 'supermarket' && stateContext?.supermarketChain
      ? 1 + SUPERMARKET_CHAIN_DISCOUNT * 0.7
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
      boostMultiplier *
      avmSynergy *
      parkingSynergy *
      factorySynergy *
      chainSynergy *
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
  stateContext?: Pick<EmpireState, 'cityManagers' | 'supermarketChain'>
): number {
  const bp = getBlueprintById(business.blueprintId);
  if (!bp) return 0;
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
  allOwnBusinesses?: OwnedBusiness[]
): number {
  const bp = getBlueprintById(business.blueprintId);
  if (!bp) return 10;
  const parkingMult =
    allOwnBusinesses && hasParkingSynergyForBusiness(business, allOwnBusinesses)
      ? 1 + PARKING_CAPACITY_BONUS
      : 1.0;
  const franchiseMult = business.franchiseId ? FRANCHISE_BRANCH_BONUS_MULTIPLIER : 1.0;
  const starSum = (business.employees ?? []).reduce((s, e) => s + e.stars, 0);
  const staffBonus = starSum > 0 ? starSum * 0.04 : business.staffCount * 0.08;

  return Math.round(
    bp.baseCapacity * (1 + (business.level - 1) * 0.35 + staffBonus) * parkingMult * franchiseMult
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
  const bankValue = state.ownBank ? Math.round(state.ownBank.poolCapital + 2_000_000) : 0;
  const activeDebt = (state.activeLoans ?? [])
    .filter((l) => l.status === 'active' || l.status === 'garnishing')
    .reduce((s, l) => s + l.remainingAmount, 0);

  return Math.max(0, Math.floor(state.cash) + assetsValue + stocksValue + bankValue - activeDebt);
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
  franchiseBrand?: FranchiseBrand | null
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

  const affinityMultiplier = getAffinityMultiplier(bp, location);
  const newBusiness: OwnedBusiness = {
    id: `biz-${now}-${Math.floor(Math.random() * 100000)}`,
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
    franchiseId: franchiseBrand?.id,
    franchiseBrandName: franchiseBrand?.brandName,
    franchiseOwnerId: franchiseBrand?.ownerId,
    franchiseRoyaltyRate: franchiseBrand?.royaltyRate,
  };

  return {
    ok: true,
    business: newBusiness,
    state: {
      ...state,
      cash: state.cash - totalCost,
      businesses: [newBusiness, ...state.businesses],
      lastSavedAt: now,
    },
  };
}

export function takeoverCompetitorBusiness(
  state: EmpireState,
  target: RemoteBusinessRecord,
  newOwner: { id: string; name: string },
  now = Date.now()
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

  const takeoverPrice = calculateTakeoverPrice(target.valuation);
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
  };

  return {
    ok: true,
    business: acquired,
    state: {
      ...state,
      cash: state.cash - takeoverPrice,
      businesses: [acquired, ...state.businesses.filter((b) => b.id !== acquired.id)],
      lastSavedAt: now,
    },
  };
}

export interface TickResult {
  state: EmpireState;
  highVaultBusinessIds: string[];
  newMarketEvent: MarketEvent | null;
  dividendPaid: number;
  loanEnforcement: LoanEnforcementResult;
}

export function tickEconomy(
  state: EmpireState,
  elapsedSec: number,
  now = Date.now(),
  randomIndex?: number,
  stockQuotes?: StockQuote[]
): TickResult {
  const safeDt = Math.max(0, Math.min(elapsedSec, 3600));
  const highVaultBusinessIds: string[] = [];

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

  let autoCollectedCash = 0;
  let totalGenerated = 0;

  const updatedBusinesses = state.businesses.map((b) => {
    const automation = resolveBusinessAutomation(b, state.cityManagers ?? [], state.businesses);
    const incomePerSec = calculateBusinessIncomePerSec(b, activeEvent, now, state.businesses, state);
    const earned = incomePerSec * safeDt;
    const capacity = calculateVaultCapacity(b);

    // Stock & Maintenance dynamics: automated branches stay full, unmanaged branches decay gradually
    let nextStock = b.stockLevel ?? 100;
    let nextMaint = b.maintenanceLevel ?? 100;

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

    const autoRate = automation.fullAutomation ? 0.65 : b.staffCount >= 3 ? 0.35 : 0;
    const directCash = earned * autoRate;
    const vaultGain = earned - directCash;
    autoCollectedCash += directCash;
    totalGenerated += directCash;

    const nextPending = Math.min(capacity, b.pendingCash + vaultGain);
    const hitHighRatio =
      capacity > 0 && nextPending / capacity >= HIGH_VAULT_NOTIFY_RATIO && !b.notifiedHighVault;

    if (hitHighRatio) {
      highVaultBusinessIds.push(b.id);
    }

    return {
      ...b,
      stockLevel: Number(nextStock.toFixed(1)),
      maintenanceLevel: Number(nextMaint.toFixed(1)),
      pendingCash: nextPending,
      totalEarned: b.totalEarned + directCash,
      notifiedHighVault: b.notifiedHighVault || hitHighRatio,
    };
  });

  // Live stock dividends
  const dividendPaid = stockQuotes
    ? calculateDividendPerTick(state, stockQuotes, safeDt)
    : 0;

  // Passive royalty stream if player owns active franchise brands with branches
  const passiveRoyaltyGain = (state.ownFranchises ?? []).reduce(
    (sum, f) => sum + f.branchCount * 420 * f.royaltyRate * safeDt,
    0
  );

  const preLoanState: EmpireState = {
    ...state,
    cash: state.cash + autoCollectedCash + dividendPaid + passiveRoyaltyGain,
    totalEarnedLifetime:
      state.totalEarnedLifetime + totalGenerated + dividendPaid + passiveRoyaltyGain,
    franchiseRoyaltiesEarned: (state.franchiseRoyaltiesEarned ?? 0) + passiveRoyaltyGain,
    businesses: updatedBusinesses,
    activeEvent,
    lastSavedAt: now,
  };

  // Enforce overdue loans (garnishment -> automatic collateral seizure!)
  const loanEnforcement = enforceOverdueLoans(
    preLoanState,
    autoCollectedCash + dividendPaid + passiveRoyaltyGain,
    now
  );

  return {
    state: loanEnforcement.state,
    highVaultBusinessIds,
    newMarketEvent,
    dividendPaid,
    loanEnforcement,
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
  if (target.staffCount >= bp.maxStaff) {
    return { state, ok: false, error: 'Personel kadrosu dolu.' };
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
  switch (mission.targetType) {
    case 'businessCount':
      return state.businesses.length;
    case 'cityCount':
      return new Set(state.businesses.map((b) => b.cityPlate)).size;
    case 'netWorth':
      return calculateNetWorth(state, now, stockQuotes);
    case 'maxLevel':
      return state.businesses.reduce((max, b) => Math.max(max, b.level), 0);
    case 'totalEarned':
      return Math.floor(state.totalEarnedLifetime);
    case 'staffTotal':
      return (
        state.businesses.reduce((sum, b) => sum + b.staffCount, 0) +
        (state.cityManagers?.length ?? 0)
      );
    case 'factoryCount':
      return state.businesses.filter((b) => isFactoryType(b.blueprintId)).length;
    default:
      return 0;
  }
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

  return {
    ok: true,
    collectedAmount: mission.rewardCash,
    state: {
      ...state,
      cash: state.cash + mission.rewardCash,
      claimedMissionIds: [...state.claimedMissionIds, mission.id],
      lastSavedAt: now,
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
