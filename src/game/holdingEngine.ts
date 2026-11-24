import type {
  BusinessTypeId,
  EmpireState,
  FranchiseBrand,
  OwnedBusiness,
} from '../types/game';
import {
  SUPERMARKET_CHAIN_DISCOUNT,
  SUPERMARKET_CHAIN_MIN_COUNT,
} from './catalog';

export const SEED_FRANCHISE_BRANDS: FranchiseBrand[] = [
  {
    id: 'seed-fran-kahve',
    ownerId: 'seed-brand-1',
    ownerName: 'Galata Kahve Holding',
    brandName: 'Galata Roastery',
    businessType: 'kafe',
    licenseFee: 35_000,
    royaltyRate: 0.14,
    branchCount: 19,
    totalRoyaltyEarned: 4_820_000,
    createdAt: 1735689600000,
    isSeed: true,
  },
  {
    id: 'seed-fran-arena',
    ownerId: 'seed-brand-2',
    ownerName: 'Bosphorus Espor A.Ş.',
    brandName: 'CyberBosphorus Gaming',
    businessType: 'internet_kafe',
    licenseFee: 55_000,
    royaltyRate: 0.16,
    branchCount: 14,
    totalRoyaltyEarned: 6_150_000,
    createdAt: 1735689600000,
    isSeed: true,
  },
  {
    id: 'seed-fran-market',
    ownerId: 'seed-brand-3',
    ownerName: 'Anadolu Perakende Grubu',
    brandName: 'Ege Ekspres Market',
    businessType: 'supermarket',
    licenseFee: 190_000,
    royaltyRate: 0.12,
    branchCount: 27,
    totalRoyaltyEarned: 19_400_000,
    createdAt: 1735689600000,
    isSeed: true,
  },
  {
    id: 'seed-fran-restoran',
    ownerId: 'seed-brand-4',
    ownerName: 'Boğaz Gastronomi',
    brandName: 'Usta Ocakbaşı & Brasserie',
    businessType: 'restoran',
    licenseFee: 120_000,
    royaltyRate: 0.18,
    branchCount: 11,
    totalRoyaltyEarned: 11_200_000,
    createdAt: 1735689600000,
    isSeed: true,
  },
];

export function countSupermarkets(businesses: OwnedBusiness[]): number {
  return businesses.filter((b) => b.blueprintId === 'supermarket').length;
}

export function formSupermarketChain(
  state: EmpireState,
  brandNameRaw: string,
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string } {
  const smCount = countSupermarkets(state.businesses);
  if (smCount < SUPERMARKET_CHAIN_MIN_COUNT) {
    return {
      state,
      ok: false,
      error: `Zincir Market Markası kurmak için en az ${SUPERMARKET_CHAIN_MIN_COUNT} Süpermarket şubeniz olmalıdır (Mevcut: ${smCount}).`,
    };
  }
  const name = brandNameRaw.trim();
  if (name.length < 3) {
    return { state, ok: false, error: 'Lütfen en az 3 karakterlik bir Zincir Market adı girin.' };
  }

  return {
    ok: true,
    state: {
      ...state,
      supermarketChain: {
        name: name.slice(0, 38),
        formedAt: now,
        discountRate: SUPERMARKET_CHAIN_DISCOUNT,
      },
      lastSavedAt: now,
    },
  };
}

export function checkFranchiseCreationEligibility(state: EmpireState): {
  eligible: boolean;
  reason?: string;
  eligibleSectors: BusinessTypeId[];
} {
  const lv3Sectors = Array.from(
    new Set(state.businesses.filter((b) => b.level >= 3).map((b) => b.blueprintId))
  );

  if (state.supermarketChain && !lv3Sectors.includes('supermarket')) {
    lv3Sectors.push('supermarket');
  }

  if (lv3Sectors.length === 0) {
    return {
      eligible: false,
      reason:
        'Franchise markası açmak için en az Seviye 3 bir işletmeye veya Zincir Market Markasına (3+ Süpermarket) sahip olmalısınız.',
      eligibleSectors: [],
    };
  }

  return {
    eligible: true,
    eligibleSectors: lv3Sectors,
  };
}

export function createFranchiseBrand(
  state: EmpireState,
  params: {
    brandName: string;
    businessType: BusinessTypeId;
    licenseFee: number;
    royaltyRate: number; // 0.10 .. 0.25
  },
  owner: { id: string; name: string },
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string; brand?: FranchiseBrand } {
  const elig = checkFranchiseCreationEligibility(state);
  if (!elig.eligible) {
    return { state, ok: false, error: elig.reason };
  }
  if (!elig.eligibleSectors.includes(params.businessType)) {
    return {
      state,
      ok: false,
      error: 'Sadece Seviye 3+ olduğunuz sektörlerde veya Zincir Marketinizde franchise açabilirsiniz.',
    };
  }

  const brandName = params.brandName.trim();
  if (brandName.length < 3) {
    return { state, ok: false, error: 'Marka adı en az 3 karakter olmalıdır.' };
  }
  const licenseFee = Math.max(10_000, Math.min(2_500_000, Math.round(params.licenseFee)));
  const royaltyRate = Math.max(0.1, Math.min(0.25, Number(params.royaltyRate.toFixed(2))));

  const brand: FranchiseBrand = {
    id: `fran-${owner.id}-${now}`,
    ownerId: owner.id,
    ownerName: owner.name,
    brandName: brandName.slice(0, 38),
    businessType: params.businessType,
    licenseFee,
    royaltyRate,
    branchCount: 0,
    totalRoyaltyEarned: 0,
    createdAt: now,
  };

  return {
    ok: true,
    brand,
    state: {
      ...state,
      ownFranchises: [brand, ...(state.ownFranchises ?? [])],
      lastSavedAt: now,
    },
  };
}
