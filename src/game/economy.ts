import type {
  BusinessBlueprint,
  EmpireRank,
  EmpireState,
  MarketEvent,
  MissionDef,
  OwnedBusiness,
  PinLocationInfo,
} from '../types/game';
import {
  BUSINESS_BLUEPRINTS,
  EMPIRE_RANKS,
  MARKET_EVENT_TEMPLATES,
  STARTING_CASH,
  getBlueprintById,
} from './catalog';

export const HIGH_VAULT_NOTIFY_RATIO = 0.75;

export function createInitialEmpireState(now = Date.now()): EmpireState {
  const initialTemplate = MARKET_EVENT_TEMPLATES[2]; // Konut Kredisi Kampanyası
  return {
    cash: STARTING_CASH,
    totalEarnedLifetime: 0,
    businesses: [],
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
  location: PinLocationInfo
): number {
  switch (blueprint.zoneAffinity) {
    case 'footTraffic':
      return location.footTraffic;
    case 'tourism':
      return location.tourism;
    case 'business':
      return location.business;
    case 'logistics':
      return location.logistics;
    default:
      return 1;
  }
}

export function calculateEstablishmentCost(
  blueprint: BusinessBlueprint,
  location: PinLocationInfo
): number {
  return Math.round((blueprint.baseCost * location.landMultiplier) / 1000) * 1000;
}

export function calculateBusinessIncomePerSec(
  business: OwnedBusiness,
  activeEvent: MarketEvent | null,
  now = Date.now()
): number {
  const bp = getBlueprintById(business.blueprintId);
  if (!bp) return 0;

  const levelMultiplier = 1 + (business.level - 1) * 0.45;
  const staffMultiplier = 1 + business.staffCount * 0.14;
  const boostMultiplier = business.boostEndsAt > now ? 2.0 : 1.0;

  let eventMultiplier = 1.0;
  if (activeEvent && activeEvent.endsAt > now) {
    if (activeEvent.category === 'all' || activeEvent.category === bp.category) {
      eventMultiplier = activeEvent.incomeMultiplier;
    }
  }

  return Math.round(
    bp.baseIncomePerSec *
      business.affinityMultiplier *
      levelMultiplier *
      staffMultiplier *
      boostMultiplier *
      eventMultiplier
  );
}

export function calculateVaultCapacity(business: OwnedBusiness): number {
  const bp = getBlueprintById(business.blueprintId);
  if (!bp) return 0;
  const levelScale = 1 + (business.level - 1) * 0.5;
  return Math.round(bp.baseIncomePerSec * bp.vaultCapacitySec * business.affinityMultiplier * levelScale);
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
  return Math.round((invested * 0.85 * valMult) / 1000) * 1000;
}

export function calculateTotalIncomePerSec(state: EmpireState, now = Date.now()): number {
  return state.businesses.reduce(
    (sum, b) => sum + calculateBusinessIncomePerSec(b, state.activeEvent, now),
    0
  );
}

export function calculateTotalPendingCash(state: EmpireState): number {
  return state.businesses.reduce((sum, b) => sum + Math.floor(b.pendingCash), 0);
}

export function calculateNetWorth(state: EmpireState, now = Date.now()): number {
  const assetsValue = state.businesses.reduce(
    (sum, b) => sum + calculateBusinessValuation(b, state.activeEvent, now) + Math.floor(b.pendingCash),
    0
  );
  return Math.floor(state.cash) + assetsValue;
}

export function getEmpireRank(netWorth: number): EmpireRank {
  let current = EMPIRE_RANKS[0];
  for (const rank of EMPIRE_RANKS) {
    if (netWorth >= rank.minNetWorth) {
      current = rank;
    }
  }
  return current;
}

export function getNextEmpireRank(netWorth: number): EmpireRank | null {
  for (const rank of EMPIRE_RANKS) {
    if (netWorth < rank.minNetWorth) {
      return rank;
    }
  }
  return null;
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
  blueprintId: string,
  location: PinLocationInfo,
  customName: string,
  now = Date.now()
): ActionResult {
  const bp = getBlueprintById(blueprintId);
  if (!bp) {
    return { state, ok: false, error: 'Geçersiz işletme türü.' };
  }
  if (!location.isWithinTurkey) {
    return { state, ok: false, error: 'Lütfen Türkiye sınırları içinde bir nokta seçin.' };
  }
  const cost = calculateEstablishmentCost(bp, location);
  if (state.cash < cost) {
    return { state, ok: false, error: 'Yetersiz bakiye.' };
  }

  const trimmedName = customName.trim();
  if (!trimmedName) {
    return { state, ok: false, error: 'Lütfen işletmeniz için bir ad girin.' };
  }

  const affinityMultiplier = getAffinityMultiplier(bp, location);
  const newBusiness: OwnedBusiness = {
    id: `biz-${now}-${Math.floor(Math.random() * 10000)}`,
    blueprintId: bp.id,
    customName: trimmedName.slice(0, 42),
    lat: location.lat,
    lng: location.lng,
    cityId: location.cityId,
    cityName: location.cityName,
    districtName: location.districtName,
    level: 1,
    staffCount: 0,
    purchaseCost: cost,
    landMultiplier: location.landMultiplier,
    affinityMultiplier,
    pendingCash: 0,
    totalEarned: 0,
    boostEndsAt: 0,
    createdAt: now,
    notifiedHighVault: false,
  };

  return {
    ok: true,
    business: newBusiness,
    state: {
      ...state,
      cash: state.cash - cost,
      businesses: [newBusiness, ...state.businesses],
      lastSavedAt: now,
    },
  };
}

export interface TickResult {
  state: EmpireState;
  highVaultBusinessIds: string[];
  newMarketEvent: MarketEvent | null;
}

export function tickEconomy(
  state: EmpireState,
  elapsedSec: number,
  now = Date.now(),
  randomIndex?: number
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
    const incomePerSec = calculateBusinessIncomePerSec(b, activeEvent, now);
    const earned = incomePerSec * safeDt;
    const capacity = calculateVaultCapacity(b);

    // Managers (staff >= 3) auto-transfer 35% straight to treasury
    const autoRate = b.staffCount >= 3 ? 0.35 : 0;
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
      pendingCash: nextPending,
      totalEarned: b.totalEarned + directCash,
      notifiedHighVault: b.notifiedHighVault || hitHighRatio,
    };
  });

  return {
    state: {
      ...state,
      cash: state.cash + autoCollectedCash,
      totalEarnedLifetime: state.totalEarnedLifetime + totalGenerated,
      businesses: updatedBusinesses,
      activeEvent,
      lastSavedAt: now,
    },
    highVaultBusinessIds,
    newMarketEvent,
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

export function getMissionProgress(state: EmpireState, mission: MissionDef, now = Date.now()): number {
  switch (mission.targetType) {
    case 'businessCount':
      return state.businesses.length;
    case 'cityCount':
      return new Set(state.businesses.map((b) => b.cityId)).size;
    case 'netWorth':
      return calculateNetWorth(state, now);
    case 'maxLevel':
      return state.businesses.reduce((max, b) => Math.max(max, b.level), 0);
    case 'totalEarned':
      return Math.floor(state.totalEarnedLifetime);
    case 'staffTotal':
      return state.businesses.reduce((sum, b) => sum + b.staffCount, 0);
    default:
      return 0;
  }
}

export function claimMissionReward(
  state: EmpireState,
  mission: MissionDef,
  now = Date.now()
): ActionResult {
  if (state.claimedMissionIds.includes(mission.id)) {
    return { state, ok: false, error: 'Ödül zaten alındı.' };
  }
  const progress = getMissionProgress(state, mission, now);
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
