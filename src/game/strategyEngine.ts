import type {
  ActiveAdCampaign,
  AdCampaignTierId,
  BusinessTypeId,
  ChainCloneDraft,
  CompetitiveBlitz,
  EmpireState,
  FranchiseApplication,
  FranchiseBrand,
  OwnedBusiness,
  RemoteBusinessRecord,
} from '../types/game';
import { getBlueprintById } from './catalog';
import { TURKEY_PROVINCES, getProvinceByPlate } from './provinces81';
import { generateSeedCityRivals } from '../services/cityRoom';

// ============================================================================
// 1. CHAIN BRANDING & BRANCH CLONING (ZİNCİRLEŞME)
// ============================================================================

export function extractBaseBrandName(customName: string, existingChainBrand?: string): string {
  if (existingChainBrand && existingChainBrand.trim().length > 0) {
    return existingChainBrand.trim();
  }
  const cleaned = customName
    .replace(/\s*[-–·]\s*\d+\.\s*Şube$/i, '')
    .replace(/\s*#\d+$/i, '')
    .trim();
  return cleaned.length > 0 ? cleaned : customName.trim();
}

export function normalizeBrandKey(name: string): string {
  return name.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
}

export interface ChainBrandGroup {
  key: string;
  brandName: string;
  businessType: BusinessTypeId;
  branches: OwnedBusiness[];
  branchCount: number;
  isChain: boolean; // 2+ branches -> automatic Zincir Marka!
  supplyDiscount: number; // 0.12 for 2-3 branches, 0.18 for 4+
  revenueBonus: number; // 0.10 for 2-3 branches, 0.15 for 4+
}

export function getChainBranchGroups(businesses: OwnedBusiness[]): ChainBrandGroup[] {
  const map = new Map<string, { brandName: string; businessType: BusinessTypeId; branches: OwnedBusiness[] }>();

  for (const biz of businesses) {
    const baseName = extractBaseBrandName(biz.customName, biz.chainBrandName);
    const key = `${biz.blueprintId}::${normalizeBrandKey(baseName)}`;
    const existing = map.get(key);
    if (existing) {
      existing.branches.push(biz);
    } else {
      map.set(key, {
        brandName: baseName,
        businessType: biz.blueprintId,
        branches: [biz],
      });
    }
  }

  return Array.from(map.entries()).map(([key, group]) => {
    const count = group.branches.length;
    const isChain = count >= 2;
    return {
      key,
      brandName: group.brandName,
      businessType: group.businessType,
      branches: group.branches,
      branchCount: count,
      isChain,
      supplyDiscount: count >= 4 ? 0.18 : isChain ? 0.12 : 0,
      revenueBonus: count >= 4 ? 0.15 : isChain ? 0.1 : 0,
    };
  });
}

export function getChainStatusForBusiness(
  business: OwnedBusiness,
  allOwnBusinesses: OwnedBusiness[]
): {
  isChain: boolean;
  brandName: string;
  branchCount: number;
  supplyDiscount: number;
  revenueBonus: number;
} {
  const baseName = extractBaseBrandName(business.customName, business.chainBrandName);
  const key = `${business.blueprintId}::${normalizeBrandKey(baseName)}`;
  const matching = allOwnBusinesses.filter(
    (b) =>
      b.blueprintId === business.blueprintId &&
      `${b.blueprintId}::${normalizeBrandKey(extractBaseBrandName(b.customName, b.chainBrandName))}` ===
        key
  );
  const count = Math.max(1, matching.length);
  const isChain = count >= 2;
  return {
    isChain,
    brandName: baseName,
    branchCount: count,
    supplyDiscount: count >= 4 ? 0.18 : isChain ? 0.12 : 0,
    revenueBonus: count >= 4 ? 0.15 : isChain ? 0.1 : 0,
  };
}

export function hasChainBrandInCity(businesses: OwnedBusiness[], cityPlate: number): boolean {
  const groups = getChainBranchGroups(businesses);
  return groups.some((g) => g.isChain && g.branches.some((b) => b.cityPlate === cityPlate));
}

export function prepareChainCloneDraft(
  sourceBiz: OwnedBusiness,
  allOwnBusinesses: OwnedBusiness[]
): ChainCloneDraft {
  const status = getChainStatusForBusiness(sourceBiz, allOwnBusinesses);
  const nextBranchNumber = status.branchCount + 1;
  const brandName = status.brandName.slice(0, 28);
  return {
    sourceBusinessId: sourceBiz.id,
    brandName,
    nextBranchNumber,
    suggestedName: `${brandName} - ${nextBranchNumber}. Şube`.slice(0, 42),
    businessType: sourceBiz.blueprintId,
  };
}

// ============================================================================
// 2. ADVERTISING CAMPAIGNS & GENEL MÜDÜR AUTOMATIC AD MANAGEMENT
// ============================================================================

export interface AdCampaignTierDef {
  id: AdCampaignTierId;
  label: string;
  shortLabel: string;
  description: string;
  baseCost: number;
  durationGameHours: number;
  durationGameMinutes: number;
  revenueBoost: number; // +0.20, +0.38, +0.65
  customerBoost: number; // +0.18, +0.35, +0.60
}

export const AD_CAMPAIGN_TIERS: AdCampaignTierDef[] = [
  {
    id: 'brochure',
    label: 'Yerel Broşür Dağıtımı',
    shortLabel: 'Yerel Broşür',
    description: 'Mahalle ve çevre caddelerde el ilanı dağıtımı; uygun bütçeli hızlı trafik.',
    baseCost: 12_000,
    durationGameHours: 6,
    durationGameMinutes: 360,
    revenueBoost: 0.2,
    customerBoost: 0.18,
  },
  {
    id: 'social',
    label: 'Sosyal Medya Sponsorlu Reklam',
    shortLabel: 'Sosyal Medya',
    description: 'Şehir genelinde hedefli dijital reklamlar; güçlü müşteri ve ciro artışı.',
    baseCost: 38_000,
    durationGameHours: 12,
    durationGameMinutes: 720,
    revenueBoost: 0.38,
    customerBoost: 0.35,
  },
  {
    id: 'billboard',
    label: 'Şehir Billboard Kampanyası',
    shortLabel: 'Şehir Billboard',
    description: 'Ana arterler ve meydanlarda dev açıkhava reklamı; maksimum marka etkisi.',
    baseCost: 95_000,
    durationGameHours: 24,
    durationGameMinutes: 1440,
    revenueBoost: 0.65,
    customerBoost: 0.6,
  },
];

export function getAdTierById(tierId: AdCampaignTierId): AdCampaignTierDef {
  return AD_CAMPAIGN_TIERS.find((t) => t.id === tierId) ?? AD_CAMPAIGN_TIERS[0];
}

export function calculateAdCampaignCost(tierId: AdCampaignTierId, business: OwnedBusiness): number {
  const tier = getAdTierById(tierId);
  const levelFactor = 1 + (Math.max(1, business.level) - 1) * 0.22;
  return Math.round((tier.baseCost * levelFactor) / 500) * 500;
}

export function isAdCampaignActive(
  campaign: ActiveAdCampaign | null | undefined,
  currentGameMinutes: number
): boolean {
  return Boolean(campaign && campaign.endsAtGameMin > currentGameMinutes);
}

export function launchBusinessAdCampaign(
  state: EmpireState,
  businessId: string,
  tierId: AdCampaignTierId,
  now = Date.now(),
  autoRenewedByGm = false
): { state: EmpireState; ok: boolean; error?: string; campaign?: ActiveAdCampaign } {
  const biz = state.businesses.find((b) => b.id === businessId);
  if (!biz) return { state, ok: false, error: 'İşletme bulunamadı.' };

  const tier = getAdTierById(tierId);
  const cost = calculateAdCampaignCost(tierId, biz);
  if (state.cash < cost) {
    return { state, ok: false, error: `${tier.shortLabel} kampanyası için yetersiz bakiye.` };
  }

  const startMin = state.gameMinutes ?? 540;
  const campaign: ActiveAdCampaign = {
    tierId: tier.id,
    label: tier.label,
    cost,
    revenueBoost: tier.revenueBoost,
    customerBoost: tier.customerBoost,
    startedAtGameMin: startMin,
    endsAtGameMin: startMin + tier.durationGameMinutes,
    autoRenewedByGm,
  };

  return {
    ok: true,
    campaign,
    state: {
      ...state,
      cash: state.cash - cost,
      businesses: state.businesses.map((b) =>
        b.id === businessId ? { ...b, activeAdCampaign: campaign } : b
      ),
      lastSavedAt: now,
    },
  };
}

export function toggleGeneralManagerAutoAds(
  state: EmpireState,
  managerId: string,
  enabled: boolean,
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string } {
  const manager = (state.cityManagers ?? []).find((m) => m.id === managerId);
  if (!manager || manager.role !== 'genel_mudur') {
    return { state, ok: false, error: 'Genel Müdür bulunamadı.' };
  }
  return {
    ok: true,
    state: {
      ...state,
      cityManagers: (state.cityManagers ?? []).map((m) =>
        m.id === managerId ? { ...m, autoAdsEnabled: enabled } : m
      ),
      lastSavedAt: now,
    },
  };
}

export interface GmAutoAdResult {
  state: EmpireState;
  renewedCount: number;
  totalSpent: number;
  renewedBranchNames: string[];
}

/**
 * Genel Müdür automatic advertising engine:
 * For every Genel Müdür with autoAdsEnabled=true, inspects all branches in their city.
 * When a branch's campaign expires (or is missing), evaluates profitability (projected extra revenue
 * over campaign duration vs campaign cost + safe treasury reserve) and auto-renews the best tier!
 */
export function runGeneralManagerAutoAds(
  state: EmpireState,
  estimateBranchHourlyBase: (biz: OwnedBusiness) => number,
  now = Date.now()
): GmAutoAdResult {
  const enabledGms = (state.cityManagers ?? []).filter(
    (m) => m.role === 'genel_mudur' && m.autoAdsEnabled && m.assignedCityPlate !== undefined
  );
  if (enabledGms.length === 0) {
    return { state, renewedCount: 0, totalSpent: 0, renewedBranchNames: [] };
  }

  const currentMin = state.gameMinutes ?? 540;
  let workingState = state;
  let renewedCount = 0;
  let totalSpent = 0;
  const renewedBranchNames: string[] = [];

  for (const gm of enabledGms) {
    const cityBranches = workingState.businesses.filter(
      (b) => b.cityPlate === gm.assignedCityPlate
    );

    for (const biz of cityBranches) {
      if (isAdCampaignActive(biz.activeAdCampaign, currentMin)) continue;

      const baseHourly = Math.max(1000, estimateBranchHourlyBase(biz));
      // Evaluate tiers from highest impact to lowest for best positive ROI that respects cash reserve
      const orderedTiers: AdCampaignTierId[] = ['billboard', 'social', 'brochure'];
      let chosenTier: AdCampaignTierId | null = null;

      for (const tierId of orderedTiers) {
        const tier = getAdTierById(tierId);
        const cost = calculateAdCampaignCost(tierId, biz);
        const projectedExtraRevenue = baseHourly * tier.revenueBoost * tier.durationGameHours;
        const safeReserve = Math.max(15_000, cost * 0.35);

        if (
          workingState.cash >= cost + safeReserve &&
          projectedExtraRevenue >= cost * 0.9
        ) {
          chosenTier = tierId;
          break;
        }
      }

      // Fallback: if cash is very comfortable (> 4x brochure cost), still keep brochure active for chain momentum
      if (!chosenTier) {
        const brochureCost = calculateAdCampaignCost('brochure', biz);
        if (workingState.cash >= brochureCost * 3.5) {
          chosenTier = 'brochure';
        }
      }

      if (chosenTier) {
        const res = launchBusinessAdCampaign(workingState, biz.id, chosenTier, now, true);
        if (res.ok && res.campaign) {
          workingState = res.state;
          renewedCount += 1;
          totalSpent += res.campaign.cost;
          renewedBranchNames.push(`${biz.customName} (${getAdTierById(chosenTier).shortLabel})`);
        }
      }
    }
  }

  return {
    state: workingState,
    renewedCount,
    totalSpent,
    renewedBranchNames,
  };
}

// ============================================================================
// 3. AI & MULTIPLAYER FRANCHISE APPLICATIONS
// ============================================================================

const AI_ENTREPRENEUR_NAMES = [
  'Kaan Demir Yatırım',
  'Selin Kaya Girişim',
  'Mert Arslan Ticaret',
  'Ece Yıldız İşletmecilik',
  'Tolga Aydın Grup',
  'Defne Şahin Ortaklığı',
  'Burak Çelik A.Ş.',
  'İrem Koç Girişim',
  'Onur Özkan Perakende',
  'Zeynep Doğan Ltd.',
];

export function generateAiFranchiseApplication(
  brand: FranchiseBrand,
  seed: number,
  now = Date.now()
): FranchiseApplication {
  const safeSeed = Math.abs(Math.floor(seed));
  const applicantName = AI_ENTREPRENEUR_NAMES[safeSeed % AI_ENTREPRENEUR_NAMES.length];
  const province = TURKEY_PROVINCES[(safeSeed * 7 + 13) % TURKEY_PROVINCES.length];
  const districtName = province.districts[safeSeed % province.districts.length] || province.name;

  return {
    id: `fapp-${brand.id}-${now}-${safeSeed % 10000}`,
    franchiseId: brand.id,
    brandName: brand.brandName,
    businessType: brand.businessType,
    applicantName,
    applicantType: 'ai',
    cityPlate: province.plate,
    cityName: province.name,
    districtName,
    licenseFee: brand.licenseFee,
    royaltyRate: brand.royaltyRate,
    status: 'pending',
    createdAt: now,
  };
}

export function approveFranchiseApplication(
  state: EmpireState,
  applicationId: string,
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string; application?: FranchiseApplication } {
  const apps = state.franchiseApplications ?? [];
  const target = apps.find((a) => a.id === applicationId);
  if (!target) return { state, ok: false, error: 'Başvuru bulunamadı.' };
  if (target.status === 'approved') {
    return { state, ok: false, error: 'Bu bayilik başvurusu zaten onaylandı.' };
  }

  const approvedApp: FranchiseApplication = { ...target, status: 'approved' };
  const nextFranchises = (state.ownFranchises ?? []).map((f) =>
    f.id === target.franchiseId
      ? {
          ...f,
          branchCount: f.branchCount + 1,
          totalRoyaltyEarned: f.totalRoyaltyEarned + target.licenseFee,
        }
      : f
  );

  return {
    ok: true,
    application: approvedApp,
    state: {
      ...state,
      cash: state.cash + target.licenseFee,
      totalEarnedLifetime: state.totalEarnedLifetime + target.licenseFee,
      franchiseRoyaltiesEarned: (state.franchiseRoyaltiesEarned ?? 0) + target.licenseFee,
      ownFranchises: nextFranchises,
      franchiseApplications: apps.map((a) => (a.id === applicationId ? approvedApp : a)).slice(0, 20),
      lastSavedAt: now,
    },
  };
}

export interface AutoFranchiseProcessResult {
  state: EmpireState;
  newApplications: FranchiseApplication[];
  autoApprovedApps: FranchiseApplication[];
}

export function processAutoFranchiseApplications(
  state: EmpireState,
  hoursPassed: number,
  now = Date.now()
): AutoFranchiseProcessResult {
  const ownBrands = state.ownFranchises ?? [];
  if (hoursPassed <= 0 || ownBrands.length === 0) {
    return { state, newApplications: [], autoApprovedApps: [] };
  }

  const currentHourIndex = Math.floor((state.gameMinutes ?? 540) / 60);
  // Trigger an AI entrepreneur application roughly every 3 in-game hours
  const prevHourIndex = currentHourIndex - hoursPassed;
  const crossedSlot =
    Math.floor(currentHourIndex / 3) > Math.floor(Math.max(0, prevHourIndex) / 3);

  if (!crossedSlot) {
    return { state, newApplications: [], autoApprovedApps: [] };
  }

  const brand = ownBrands[currentHourIndex % ownBrands.length];
  const app = generateAiFranchiseApplication(brand, currentHourIndex * 31 + brand.branchCount * 17, now);

  let workingState: EmpireState = {
    ...state,
    franchiseApplications: [app, ...(state.franchiseApplications ?? [])].slice(0, 20),
  };

  const autoApprovedApps: FranchiseApplication[] = [];
  if (workingState.autoApproveFranchiseApps !== false) {
    const approved = approveFranchiseApplication(workingState, app.id, now);
    if (approved.ok && approved.application) {
      workingState = approved.state;
      autoApprovedApps.push(approved.application);
    }
  }

  return {
    state: workingState,
    newApplications: [app],
    autoApprovedApps,
  };
}

// ============================================================================
// 4. RIVALS STRATEGY CENTER (AI HOLDINGS + MULTIPLAYER COMPETITORS)
// ============================================================================

export interface RivalStrategyCardData {
  record: RemoteBusinessRecord;
  isAiHolding: boolean;
  holdingTotalValuation: number;
  holdingBranchCount: number;
  sectorMarketSharePct: number;
  isDistressed: boolean;
  distressLabel: string;
  takeoverMultiplier: number; // 1.20 .. 1.50
  takeoverPrice: number;
  blitzCost: number;
  linkedFranchise: FranchiseBrand | null;
}

const FLAGSHIP_AI_CITY_PLATES = [34, 6, 35, 7, 16];

export function calculateDynamicTakeoverOffer(record: RemoteBusinessRecord): {
  isDistressed: boolean;
  distressLabel: string;
  multiplier: number; // 1.20 .. 1.50
  price: number;
} {
  // Deterministic distress hash based on record ID & level so low-efficiency/distressed branches get 120%-132% buyout offers
  let hash = 0;
  for (let i = 0; i < record.id.length; i++) {
    hash = (hash * 31 + record.id.charCodeAt(i)) % 1000;
  }
  const isDistressed = record.level <= 2 || hash % 3 === 0;
  const multiplier = isDistressed
    ? Number((1.2 + (hash % 13) * 0.01).toFixed(2)) // 1.20 .. 1.32
    : Number((1.38 + (hash % 13) * 0.01).toFixed(2)); // 1.38 .. 1.50

  const price = Math.round((record.valuation * multiplier) / 1000) * 1000;
  const distressLabel = isDistressed
    ? `Nakit Sıkıntısı · %${Math.round(multiplier * 100)} Fırsat`
    : `Güçlü Bilanço · %${Math.round(multiplier * 100)}`;

  return { isDistressed, distressLabel, multiplier, price };
}

export function calculateCompetitiveBlitzCost(record: RemoteBusinessRecord): number {
  return Math.max(15_000, Math.min(85_000, Math.round((record.valuation * 0.035) / 1000) * 1000));
}

export function buildNationalRivalDirectory(
  activeCityPlate: number,
  liveCompetitorRecords: RemoteBusinessRecord[],
  acquiredRivalIds: string[] = [],
  allFranchises: FranchiseBrand[] = [],
  playerOwnerId?: string
): RivalStrategyCardData[] {
  const acquiredSet = new Set(acquiredRivalIds);
  const byId = new Map<string, RemoteBusinessRecord>();

  // 1) Add real live competitor records first
  for (const rec of liveCompetitorRecords) {
    if (rec.owner_id === playerOwnerId || acquiredSet.has(rec.id)) continue;
    byId.set(rec.id, rec);
  }

  // 2) Add deterministic AI rivals for active city + flagship Turkish metro cities
  const platesToInclude = Array.from(new Set([activeCityPlate, ...FLAGSHIP_AI_CITY_PLATES]));
  for (const plate of platesToInclude) {
    for (const seedRec of generateSeedCityRivals(plate)) {
      if (acquiredSet.has(seedRec.id) || byId.has(seedRec.id)) continue;
      byId.set(seedRec.id, seedRec);
    }
  }

  const allRecords = Array.from(byId.values());

  // Compute holding totals & sector totals for accurate market share %
  const holdingValMap = new Map<string, { val: number; count: number }>();
  const sectorValMap = new Map<BusinessTypeId, number>();

  for (const r of allRecords) {
    const prev = holdingValMap.get(r.owner_id) ?? { val: 0, count: 0 };
    holdingValMap.set(r.owner_id, { val: prev.val + r.valuation, count: prev.count + 1 });
    sectorValMap.set(r.business_type, (sectorValMap.get(r.business_type) ?? 0) + r.valuation);
  }

  return allRecords
    .map((record) => {
      const offer = calculateDynamicTakeoverOffer(record);
      const holdingStats = holdingValMap.get(record.owner_id) ?? {
        val: record.valuation,
        count: 1,
      };
      const sectorTotal = Math.max(1, sectorValMap.get(record.business_type) ?? record.valuation);
      const sectorMarketSharePct = Math.max(
        4,
        Math.min(68, Math.round((record.valuation / sectorTotal) * 100))
      );

      // Link a matching franchise if the rival owner or same sector offers a franchise brand
      const linkedFranchise =
        allFranchises.find((f) => f.ownerId === record.owner_id) ??
        allFranchises.find(
          (f) => f.businessType === record.business_type && f.ownerId !== playerOwnerId
        ) ??
        null;

      return {
        record,
        isAiHolding: record.owner_id.startsWith('ai-rival-') || record.id.startsWith('seed-rival-'),
        holdingTotalValuation: holdingStats.val,
        holdingBranchCount: holdingStats.count,
        sectorMarketSharePct,
        isDistressed: offer.isDistressed,
        distressLabel: offer.distressLabel,
        takeoverMultiplier: offer.multiplier,
        takeoverPrice: offer.price,
        blitzCost: calculateCompetitiveBlitzCost(record),
        linkedFranchise,
      };
    })
    .sort((a, b) => {
      // Prioritize real live players first, then current city, then distressed buyouts, then valuation
      const aReal = a.isAiHolding ? 0 : 1;
      const bReal = b.isAiHolding ? 0 : 1;
      if (aReal !== bReal) return bReal - aReal;
      const aLocal = a.record.city_plate === activeCityPlate ? 1 : 0;
      const bLocal = b.record.city_plate === activeCityPlate ? 1 : 0;
      if (aLocal !== bLocal) return bLocal - aLocal;
      if (a.isDistressed !== b.isDistressed) return a.isDistressed ? -1 : 1;
      return b.record.valuation - a.record.valuation;
    });
}

export function launchCompetitiveBlitz(
  state: EmpireState,
  rival: RemoteBusinessRecord,
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string; blitz?: CompetitiveBlitz } {
  const hasBranchInCity = state.businesses.some((b) => b.cityPlate === rival.city_plate);
  if (!hasBranchInCity) {
    const prov = getProvinceByPlate(rival.city_plate);
    return {
      state,
      ok: false,
      error: `Rekabetçi fiyat hamlesi için ${prov.name} ilinde en az 1 şubeniz olmalıdır.`,
    };
  }

  const cost = calculateCompetitiveBlitzCost(rival);
  if (state.cash < cost) {
    return {
      state,
      ok: false,
      error: `Rekabetçi kampanya hamlesi için yetersiz bakiye (Gerekli: ₺${cost.toLocaleString('tr-TR')}).`,
    };
  }

  const startMin = state.gameMinutes ?? 540;
  const existingActive = (state.competitiveBlitzes ?? []).find(
    (bl) => bl.targetRivalId === rival.id && bl.endsAtGameMin > startMin
  );
  if (existingActive) {
    return {
      state,
      ok: false,
      error: `${rival.business_name} karşısında aktif bir rekabetçi kampanyanız zaten sürüyor.`,
    };
  }

  const blitz: CompetitiveBlitz = {
    id: `blitz-${rival.id}-${now}`,
    targetRivalId: rival.id,
    targetOwnerName: rival.owner_name,
    cityPlate: rival.city_plate,
    cityName: rival.city_name,
    businessType: rival.business_type,
    revenueBoost: 0.25,
    endsAtGameMin: startMin + 360, // 6 in-game hours
    startedAt: now,
  };

  return {
    ok: true,
    blitz,
    state: {
      ...state,
      cash: state.cash - cost,
      competitiveBlitzes: [
        blitz,
        ...(state.competitiveBlitzes ?? []).filter((b) => b.endsAtGameMin > startMin),
      ],
      lastSavedAt: now,
    },
  };
}

export function getActiveCompetitiveBlitzBoost(
  cityPlate: number,
  blitzes: CompetitiveBlitz[] | undefined,
  currentGameMinutes: number
): number {
  if (!blitzes || blitzes.length === 0) return 0;
  const active = blitzes.filter(
    (bl) => bl.cityPlate === cityPlate && bl.endsAtGameMin > currentGameMinutes
  );
  if (active.length === 0) return 0;
  return Math.min(0.5, active.reduce((sum, bl) => sum + bl.revenueBoost, 0));
}

export function formatRemainingGameHours(endsAtGameMin: number, currentGameMin: number): string {
  const remMin = Math.max(0, Math.round(endsAtGameMin - currentGameMin));
  const hrs = Math.floor(remMin / 60);
  const mins = remMin % 60;
  if (hrs > 0 && mins > 0) return `${hrs}sa ${mins}dk`;
  if (hrs > 0) return `${hrs}sa`;
  return `${mins}dk`;
}

export function getSectorShortLabel(typeId: BusinessTypeId): string {
  return getBlueprintById(typeId)?.shortName ?? typeId;
}
