import type {
  ActiveAdCampaign,
  AdCampaignTierId,
  BranchConceptIconId,
  BranchUpgradeTrackId,
  EmpireState,
  OwnedBusiness,
} from '../types/game';
import { getBlueprintById } from './catalog';
import {
  calculateBusinessHourlyIncome,
  isBusinessUnderConstruction,
} from './economy';
import { calculateBranchServiceQuality } from './officeEngine';

export const BRANCH_FACILITY_MAX_LEVEL = 10;

export const BRANCH_BRAND_COLORS = [
  '#22D3EE', // Cyan
  '#F59E0B', // Amber / Gold
  '#10B981', // Emerald
  '#818CF8', // Indigo
  '#F43F5E', // Rose
  '#A855F7', // Purple
] as const;

export const BRANCH_CONCEPT_ICONS: Array<{
  id: BranchConceptIconId;
  label: string;
}> = [
  { id: 'coffee', label: 'Kafe' },
  { id: 'utensils', label: 'Restoran' },
  { id: 'store', label: 'Mağaza' },
  { id: 'building', label: 'Plaza' },
  { id: 'crown', label: 'VIP' },
  { id: 'sparkles', label: 'Butik' },
];

export interface BranchUpgradeTrackDef {
  id: BranchUpgradeTrackId;
  name: string;
  shortDesc: string;
  baseCost: number;
  costGrowth: number;
  revenueStepBonus: number; // per level above 1 (e.g. 0.15 => x1.15, x1.30...)
}

export const BRANCH_UPGRADE_TRACKS: BranchUpgradeTrackDef[] = [
  {
    id: 'capacity',
    name: 'Masa / Alan Kapasitesi',
    shortDesc: 'Daha fazla oturma, raf ve servis alanı ile günlük müşteri kapasitesini artırır.',
    baseCost: 50_000,
    costGrowth: 1.55,
    revenueStepBonus: 0.15,
  },
  {
    id: 'equipment',
    name: 'Mutfak / Ekipman Altyapısı',
    shortDesc: 'Profesyonel cihaz ve otomasyon altyapısıyla servis hızı ve gelir çarpanını büyütür.',
    baseCost: 110_000,
    costGrowth: 1.6,
    revenueStepBonus: 0.25,
  },
  {
    id: 'ambiance',
    name: 'Konsept & Müşteri Deneyimi',
    shortDesc: 'İç mekan tasarımı ve marka algısıyla sepet ortalamasını yükseltir.',
    baseCost: 75_000,
    costGrowth: 1.5,
    revenueStepBonus: 0.12,
  },
];

export interface BranchMarketingCampaignDef {
  id: AdCampaignTierId;
  name: string;
  cost: number;
  customerBoostPct: number; // e.g., 5, 15, 30
  revenueBoost: number; // e.g., 0.08, 0.20, 0.38
  durationGameHours: number;
  durationGameMinutes: number;
  description: string;
}

export const BRANCH_MARKETING_CAMPAIGNS: BranchMarketingCampaignDef[] = [
  {
    id: 'brochure',
    name: 'Lokal Broşür',
    cost: 5_000,
    customerBoostPct: 5,
    revenueBoost: 0.08,
    durationGameHours: 12,
    durationGameMinutes: 720,
    description: 'Çevre sokak ve iş merkezlerinde hızlı yerel tanıtım.',
  },
  {
    id: 'social',
    name: 'Sosyal Medya Reklamı',
    cost: 12_000,
    customerBoostPct: 15,
    revenueBoost: 0.2,
    durationGameHours: 24,
    durationGameMinutes: 1440,
    description: 'İlçe ve şehir hedefli sponsorlu dijital kampanya.',
  },
  {
    id: 'billboard',
    name: 'Şehir Billboard Paketi',
    cost: 35_000,
    customerBoostPct: 30,
    revenueBoost: 0.38,
    durationGameHours: 48,
    durationGameMinutes: 2880,
    description: 'Ana caddelerde yüksek görünürlüklü marka kampanyası.',
  },
];

export function getBranchFacilityLevel(
  business: OwnedBusiness,
  trackId: BranchUpgradeTrackId
): number {
  const raw =
    trackId === 'capacity'
      ? business.capacityLevel
      : trackId === 'equipment'
      ? business.equipmentLevel
      : business.ambianceLevel;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 1;
  return Math.max(1, Math.min(BRANCH_FACILITY_MAX_LEVEL, Math.round(raw)));
}

export function getBranchFacilityUpgradeCost(
  business: OwnedBusiness,
  trackId: BranchUpgradeTrackId
): number {
  const level = getBranchFacilityLevel(business, trackId);
  if (level >= BRANCH_FACILITY_MAX_LEVEL) return 0;
  const track = BRANCH_UPGRADE_TRACKS.find((t) => t.id === trackId) ?? BRANCH_UPGRADE_TRACKS[0];
  const raw = track.baseCost * Math.pow(track.costGrowth, level - 1);
  return Math.round(raw / 1_000) * 1_000;
}

export function getBranchTrackRevenueMultiplier(
  business: OwnedBusiness,
  trackId: BranchUpgradeTrackId
): number {
  const level = getBranchFacilityLevel(business, trackId);
  const track = BRANCH_UPGRADE_TRACKS.find((t) => t.id === trackId) ?? BRANCH_UPGRADE_TRACKS[0];
  return Number((1 + (level - 1) * track.revenueStepBonus).toFixed(2));
}

export function getBranchFacilityTotalMultiplier(business: OwnedBusiness): number {
  const cap = getBranchTrackRevenueMultiplier(business, 'capacity');
  const eq = getBranchTrackRevenueMultiplier(business, 'equipment');
  const amb = getBranchTrackRevenueMultiplier(business, 'ambiance');
  // Additive-compound balanced multiplier so upgrades meaningfully lift daily revenue
  return Number((1 + (cap - 1) + (eq - 1) + (amb - 1)).toFixed(3));
}

export function getDefaultConceptIconForSector(blueprintId: string): BranchConceptIconId {
  if (blueprintId === 'kafe') return 'coffee';
  if (blueprintId === 'restoran') return 'utensils';
  if (blueprintId === 'supermarket' || blueprintId === 'avm') return 'store';
  if (blueprintId === 'grand_otel') return 'crown';
  return 'building';
}

export function customizeBranchIdentity(
  state: EmpireState,
  businessId: string,
  updates: {
    customName: string;
    brandColor?: string;
    conceptIcon?: BranchConceptIconId;
  },
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string; business?: OwnedBusiness } {
  const existing = state.businesses.find((b) => b.id === businessId);
  if (!existing) {
    return { state, ok: false, error: 'Şube bulunamadı.' };
  }
  const cleanName = updates.customName.trim().replace(/\s+/g, ' ').slice(0, 42);
  if (cleanName.length < 2) {
    return { state, ok: false, error: 'Şube adı en az 2 karakter olmalıdır.' };
  }

  const updated: OwnedBusiness = {
    ...existing,
    customName: cleanName,
    brandColor: updates.brandColor ?? existing.brandColor ?? BRANCH_BRAND_COLORS[0],
    conceptIcon:
      updates.conceptIcon ??
      existing.conceptIcon ??
      getDefaultConceptIconForSector(existing.blueprintId),
  };

  return {
    ok: true,
    business: updated,
    state: {
      ...state,
      businesses: state.businesses.map((b) => (b.id === businessId ? updated : b)),
      lastSavedAt: now,
    },
  };
}

export function upgradeBranchFacility(
  state: EmpireState,
  businessId: string,
  trackId: BranchUpgradeTrackId,
  now = Date.now()
): {
  state: EmpireState;
  ok: boolean;
  error?: string;
  business?: OwnedBusiness;
  newLevel?: number;
  cost?: number;
} {
  const existing = state.businesses.find((b) => b.id === businessId);
  if (!existing) {
    return { state, ok: false, error: 'Şube bulunamadı.' };
  }
  const currentLevel = getBranchFacilityLevel(existing, trackId);
  if (currentLevel >= BRANCH_FACILITY_MAX_LEVEL) {
    return { state, ok: false, error: 'Bu geliştirme maksimum seviyeye ulaştı.' };
  }
  const cost = getBranchFacilityUpgradeCost(existing, trackId);
  if (state.cash < cost) {
    return { state, ok: false, error: 'Yetersiz bakiye.' };
  }

  const nextLevel = currentLevel + 1;
  const updated: OwnedBusiness = {
    ...existing,
    capacityLevel:
      trackId === 'capacity' ? nextLevel : getBranchFacilityLevel(existing, 'capacity'),
    equipmentLevel:
      trackId === 'equipment' ? nextLevel : getBranchFacilityLevel(existing, 'equipment'),
    ambianceLevel:
      trackId === 'ambiance' ? nextLevel : getBranchFacilityLevel(existing, 'ambiance'),
    maintenanceLevel: Math.min(100, Math.round((existing.maintenanceLevel ?? 80) + 6)),
    // Reflect combined facility growth cleanly in overall branch level
    level: Math.max(
      existing.level,
      Math.min(
        10,
        1 +
          Math.floor(
            ((trackId === 'capacity' ? nextLevel : getBranchFacilityLevel(existing, 'capacity')) +
              (trackId === 'equipment'
                ? nextLevel
                : getBranchFacilityLevel(existing, 'equipment')) +
              (trackId === 'ambiance'
                ? nextLevel
                : getBranchFacilityLevel(existing, 'ambiance')) -
              3) /
              2
          )
      )
    ),
  };

  return {
    ok: true,
    business: updated,
    newLevel: nextLevel,
    cost,
    state: {
      ...state,
      cash: state.cash - cost,
      businesses: state.businesses.map((b) => (b.id === businessId ? updated : b)),
      lastSavedAt: now,
    },
  };
}

export function launchBranchMarketingCampaign(
  state: EmpireState,
  businessId: string,
  tierId: AdCampaignTierId,
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string; campaign?: ActiveAdCampaign } {
  const existing = state.businesses.find((b) => b.id === businessId);
  if (!existing) {
    return { state, ok: false, error: 'Şube bulunamadı.' };
  }
  const def =
    BRANCH_MARKETING_CAMPAIGNS.find((c) => c.id === tierId) ?? BRANCH_MARKETING_CAMPAIGNS[0];
  if (state.cash < def.cost) {
    return { state, ok: false, error: `${def.name} için yetersiz bakiye.` };
  }

  const startMin = state.gameMinutes ?? 540;
  const campaign: ActiveAdCampaign = {
    tierId: def.id,
    label: def.name,
    cost: def.cost,
    revenueBoost: def.revenueBoost,
    customerBoost: def.customerBoostPct / 100,
    startedAtGameMin: startMin,
    endsAtGameMin: startMin + def.durationGameMinutes,
    autoRenewedByGm: false,
  };

  return {
    ok: true,
    campaign,
    state: {
      ...state,
      cash: state.cash - def.cost,
      brandRecognition: Math.min(100, Number(((state.brandRecognition ?? 5) + 0.6).toFixed(1))),
      businesses: state.businesses.map((b) =>
        b.id === businessId ? { ...b, activeAdCampaign: campaign } : b
      ),
      lastSavedAt: now,
    },
  };
}

export interface TeamOverviewMember {
  id: string;
  name: string;
  roleTitle: string;
  level: number;
  status: 'Çalışıyor' | 'Boşta';
  branchName: string;
}

export interface BusinessesOverviewMetrics {
  totalBranches: number;
  activeBranches: number;
  underConstructionBranches: number;
  totalDailyRevenue: number;
  avgServiceQuality: number;
  avgQualityPct: number;
  pendingFranchiseAppsCount: number;
  customerSatisfactionPct: number;
  brandRecognitionPct: number;
  teamMembers: TeamOverviewMember[];
  totalStaffCount: number;
  idleStaffCount: number;
  fatiguePct: number;
  avgEfficiencyPct: number;
  performanceDots: number; // 1..5
  moraleDots: number; // 1..5
  efficiencyDots: number; // 1..5
  leadBranch: {
    id: string;
    name: string;
    level: number;
    dailyRevenue: number;
    sectorName: string;
  } | null;
}

export function computeBusinessesOverviewMetrics(
  state: EmpireState,
  now: number
): BusinessesOverviewMetrics {
  const businesses = Array.isArray(state.businesses) ? state.businesses : [];
  let activeBranches = 0;
  let underConstructionBranches = 0;
  let totalDailyRevenue = 0;
  let qualitySum = 0;
  let satisfactionSum = 0;
  let leadBranch: BusinessesOverviewMetrics['leadBranch'] = null;

  const teamMembers: TeamOverviewMember[] = [];
  let idleStaffCount = 0;
  let efficiencySum = 0;
  let moraleSum = 0;
  let totalBranchSlotsNeeded = 0;

  for (const biz of businesses) {
    const bp = getBlueprintById(biz.blueprintId);
    const underConst = isBusinessUnderConstruction(biz);
    const quality = calculateBranchServiceQuality(biz, state.cityManagers ?? [], businesses);
    const hourly = underConst
      ? 0
      : calculateBusinessHourlyIncome(biz, state.activeEvent, now, businesses, state);
    const dailyRev = Math.max(0, Math.round(hourly * 24));

    if (underConst) {
      underConstructionBranches += 1;
    } else {
      activeBranches += 1;
      totalDailyRevenue += dailyRev;
      qualitySum += quality.stars;
      satisfactionSum += quality.customerTrafficPct;
      totalBranchSlotsNeeded += Math.max(2, Math.min(6, bp?.maxStaff ?? 4));
    }

    if (!leadBranch || dailyRev > leadBranch.dailyRevenue) {
      leadBranch = {
        id: biz.id,
        name: biz.customName,
        level: biz.level,
        dailyRevenue: dailyRev,
        sectorName: bp?.name ?? biz.blueprintId,
      };
    }

    for (const emp of biz.employees ?? []) {
      const isIdle = underConst;
      if (isIdle) idleStaffCount += 1;
      efficiencySum += Math.max(20, Math.min(100, emp.efficiency ?? 70));
      moraleSum += Math.max(20, Math.min(100, biz.staffMorale ?? 78));
      teamMembers.push({
        id: emp.id,
        name: emp.name,
        roleTitle: emp.roleTitle || 'Personel',
        level: emp.stars ?? 1,
        status: isIdle ? 'Boşta' : 'Çalışıyor',
        branchName: biz.customName,
      });
    }
  }

  for (const mgr of state.cityManagers ?? []) {
    const hasCityBranch = businesses.some((b) => b.cityPlate === mgr.assignedCityPlate);
    if (!hasCityBranch) idleStaffCount += 1;
    efficiencySum += Math.max(30, Math.min(100, mgr.efficiency ?? 80));
    moraleSum += 85;
    teamMembers.push({
      id: mgr.id,
      name: mgr.name,
      roleTitle: mgr.roleTitle || 'Bölge Yöneticisi',
      level: mgr.stars ?? 3,
      status: hasCityBranch ? 'Çalışıyor' : 'Boşta',
      branchName: 'Genel Merkez',
    });
  }

  if (state.accountant) {
    efficiencySum += 88;
    moraleSum += 86;
    teamMembers.push({
      id: state.accountant.id,
      name: state.accountant.name,
      roleTitle: state.accountant.title || 'Muhasebe',
      level: state.accountant.stars ?? 3,
      status: 'Çalışıyor',
      branchName: 'Genel Merkez',
    });
  }

  if (state.ceo) {
    efficiencySum += 94;
    moraleSum += 92;
    teamMembers.push({
      id: state.ceo.id,
      name: state.ceo.name,
      roleTitle: state.ceo.title || 'Holding CEO',
      level: state.ceo.stars ?? 5,
      status: 'Çalışıyor',
      branchName: 'Holding',
    });
  }

  const totalStaffCount = teamMembers.length;
  const avgServiceQuality =
    activeBranches > 0 ? Number((qualitySum / activeBranches).toFixed(1)) : 0;
  const avgQualityPct =
    activeBranches > 0 ? Math.max(10, Math.min(100, Math.round((avgServiceQuality / 5) * 100))) : 0;
  const customerSatisfactionPct =
    activeBranches > 0
      ? Math.max(15, Math.min(100, Math.round(satisfactionSum / activeBranches)))
      : 0;
  const brandRecognitionPct = Math.max(
    0,
    Math.min(100, Math.round(state.brandRecognition ?? 5))
  );
  const pendingFranchiseAppsCount = (state.franchiseApplications ?? []).filter(
    (a) => a.status === 'pending'
  ).length;

  const avgEfficiencyPct =
    totalStaffCount > 0 ? Math.round(efficiencySum / totalStaffCount) : 0;
  const avgMoralePct = totalStaffCount > 0 ? Math.round(moraleSum / totalStaffCount) : 0;

  // Workload fatigue rises when branches are understaffed relative to required slots
  const staffingCoverage =
    totalBranchSlotsNeeded > 0
      ? Math.min(1.2, totalStaffCount / totalBranchSlotsNeeded)
      : totalStaffCount > 0
      ? 1
      : 0;
  const fatiguePct =
    totalStaffCount === 0
      ? 0
      : Math.max(
          8,
          Math.min(92, Math.round((1.15 - staffingCoverage) * 58 + (100 - avgMoralePct) * 0.35))
        );

  const toDots = (pct: number) =>
    pct <= 0 ? 1 : Math.max(1, Math.min(5, Math.round(pct / 20)));

  return {
    totalBranches: businesses.length,
    activeBranches,
    underConstructionBranches,
    totalDailyRevenue,
    avgServiceQuality,
    avgQualityPct,
    pendingFranchiseAppsCount,
    customerSatisfactionPct,
    brandRecognitionPct,
    teamMembers,
    totalStaffCount,
    idleStaffCount,
    fatiguePct,
    avgEfficiencyPct,
    performanceDots: toDots(avgQualityPct || avgEfficiencyPct),
    moraleDots: toDots(100 - fatiguePct),
    efficiencyDots: toDots(avgEfficiencyPct),
    leadBranch,
  };
}
