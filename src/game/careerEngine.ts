import type {
  BusinessBlueprint,
  CareerRankId,
  CareerState,
  EmpireState,
  JobCategoryId,
  JobListing,
  PinLocationInfo,
  ProvinceUnlockRequirement,
} from '../types/game';
import { FIRST_SHOP_ENTRY_COST } from './catalog';
import { getProvinceByPlate } from './provinces81';
import { getCharacterTraitModifiers } from './characterEngine';

export interface CareerRankDef {
  id: CareerRankId;
  index: number;
  title: string;
  shortTitle: string;
  minShifts: number;
  wageMultiplier: number;
  tipMultiplier: number;
  promotionBonusCash: number;
  description: string;
}

export const CAREER_RANKS: CareerRankDef[] = [
  {
    id: 'barista_kasiyer',
    index: 0,
    title: 'Barista / Kasiyer',
    shortTitle: 'Çalışan',
    minShifts: 0,
    wageMultiplier: 1.0,
    tipMultiplier: 1.0,
    promotionBonusCash: 0,
    description: 'Vardiyalı işlerde tecrübe kazan, bahşiş topla ve ilk sermayeni biriktir.',
  },
  {
    id: 'vardiya_amiri',
    index: 1,
    title: 'Vardiya Amiri',
    shortTitle: 'Vardiya Amiri',
    minShifts: 3,
    wageMultiplier: 1.45,
    tipMultiplier: 1.35,
    promotionBonusCash: 5_000,
    description: 'Ekip koordinasyonu ile +%45 vardiya maaşı ve +%35 daha yüksek bahşiş kazan.',
  },
  {
    id: 'sube_muduru',
    index: 2,
    title: 'Şube Müdürü',
    shortTitle: 'Şube Müdürü',
    minShifts: 8,
    wageMultiplier: 2.1,
    tipMultiplier: 1.75,
    promotionBonusCash: 15_000,
    description: 'Yönetici maaşıyla hızla sermaye biriktir ve kendi dükkânını açmaya hazırlan.',
  },
];

export const JOB_CATEGORIES: Array<{ id: JobCategoryId | 'all'; label: string }> = [
  { id: 'all', label: 'Tümü' },
  { id: 'kafe_restoran', label: 'Kafe & Restoran' },
  { id: 'magaza', label: 'Mağaza' },
  { id: 'ofis', label: 'Ofis & Finans' },
  { id: 'otel_turizm', label: 'Otel & Turizm' },
];

export function createInitialCareerState(): CareerState {
  return {
    rankId: 'barista_kasiyer',
    shiftsCompleted: 0,
    careerXp: 0,
    totalWagesEarned: 0,
    totalTipsEarned: 0,
    activeJobId: null,
    activeJobCityPlate: null,
    activeJobDistrict: null,
  };
}

export function getCareerRankDef(rankId: CareerRankId): CareerRankDef {
  return CAREER_RANKS.find((r) => r.id === rankId) ?? CAREER_RANKS[0];
}

export function resolveCareerRankByShifts(shiftsCompleted: number): CareerRankDef {
  let current = CAREER_RANKS[0];
  for (const rank of CAREER_RANKS) {
    if (shiftsCompleted >= rank.minShifts) {
      current = rank;
    }
  }
  return current;
}

export function getNextCareerRank(rankId: CareerRankId): CareerRankDef | null {
  const idx = CAREER_RANKS.findIndex((r) => r.id === rankId);
  if (idx < 0 || idx >= CAREER_RANKS.length - 1) return null;
  return CAREER_RANKS[idx + 1];
}

export function getCareerStatusBadgeLabel(state: EmpireState): string {
  const count = state.businesses.length;
  if (count === 0) {
    const rank = getCareerRankDef(state.career?.rankId ?? 'barista_kasiyer');
    return rank.shortTitle;
  }
  if (count <= 2) return 'İşletme Sahibi';
  if (count <= 6) return 'Bölge Lideri';
  return 'Holding Patronu';
}

interface JobTemplate {
  key: string;
  title: string;
  workplaceSuffix: string;
  category: JobCategoryId;
  categoryLabel: string;
  baseWage: number;
  tipRange: [number, number];
  xpReward: number;
  shiftHoursLabel: string;
  shiftDurationSec: number;
  requiredLevel: number;
  requiredRank?: CareerRankId;
  description: string;
  perks: string[];
}

const JOB_TEMPLATES: JobTemplate[] = [
  {
    key: 'barista',
    title: 'Barista',
    workplaceSuffix: 'Kahve Evi',
    category: 'kafe_restoran',
    categoryLabel: 'Kafe & Restoran',
    baseWage: 2_600,
    tipRange: [180, 420],
    xpReward: 45,
    shiftHoursLabel: '08:00 - 16:00',
    shiftDurationSec: 18,
    requiredLevel: 1,
    description: 'Sabah ve öğle yoğunluğunda espresso hazırlayıp sıcak servis sunarak yüksek bahşiş topla.',
    perks: ['Yüksek bahşiş kavanozu', 'Hızlı vardiya süresi', 'Tecrübesiz başlangıç'],
  },
  {
    key: 'garson',
    title: 'Servis Elemanı & Garson',
    workplaceSuffix: 'Lokanta & Bistro',
    category: 'kafe_restoran',
    categoryLabel: 'Kafe & Restoran',
    baseWage: 3_100,
    tipRange: [240, 520],
    xpReward: 55,
    shiftHoursLabel: '12:00 - 20:00',
    shiftDurationSec: 20,
    requiredLevel: 1,
    description: 'Öğle ve akşam servisinde masalara hızlı servis yaparak bahşiş gelirini katla.',
    perks: ['Masa başı bahşiş bonusu', 'Ücretsiz yemek', 'Hızlı terfi puanı'],
  },
  {
    key: 'kasiyer',
    title: 'Mağaza Kasiyeri',
    workplaceSuffix: 'Süpermarket',
    category: 'magaza',
    categoryLabel: 'Mağaza',
    baseWage: 2_900,
    tipRange: [120, 260],
    xpReward: 50,
    shiftHoursLabel: '09:00 - 17:00',
    shiftDurationSec: 18,
    requiredLevel: 1,
    description: 'Yoğun kasada barkod okutup ödeme alarak düzenli ve garantili günlük maaş kazan.',
    perks: ['Yüksek sabit maaş', 'Düzenli mesai', 'Perakende deneyimi'],
  },
  {
    key: 'satis_danismani',
    title: 'Satış Danışmanı',
    workplaceSuffix: 'Teknoloji & Moda',
    category: 'magaza',
    categoryLabel: 'Mağaza',
    baseWage: 3_900,
    tipRange: [260, 580],
    xpReward: 70,
    shiftHoursLabel: '10:00 - 19:00',
    shiftDurationSec: 21,
    requiredLevel: 1,
    requiredRank: 'vardiya_amiri',
    description: 'Müşterilere doğru ürünü önerip satış primi ve kasa bonusu elde et.',
    perks: ['Satış primi + bahşiş', '+70 Kariyer XP', 'Vardiya Amiri avantajı'],
  },
  {
    key: 'ofis_asistani',
    title: 'Ofis Operasyon Asistanı',
    workplaceSuffix: 'Ticaret Merkezi',
    category: 'ofis',
    categoryLabel: 'Ofis & Finans',
    baseWage: 4_400,
    tipRange: [220, 460],
    xpReward: 85,
    shiftHoursLabel: '09:00 - 18:00',
    shiftDurationSec: 22,
    requiredLevel: 1,
    description: 'Dosyalama, müşteri randevuları ve finans takibiyle kurumsal tecrübe ve yüksek XP kazan.',
    perks: ['Yüksek XP getirisi', 'Kurumsal prim', 'Holding yönetimi hazırlığı'],
  },
  {
    key: 'resepsiyonist',
    title: 'Ön Büro & Resepsiyonist',
    workplaceSuffix: 'Butik Otel',
    category: 'otel_turizm',
    categoryLabel: 'Otel & Turizm',
    baseWage: 4_800,
    tipRange: [340, 740],
    xpReward: 95,
    shiftHoursLabel: '08:00 - 16:00',
    shiftDurationSec: 22,
    requiredLevel: 1,
    requiredRank: 'vardiya_amiri',
    description: 'Turist ve iş misafirlerini karşıla, oda teslimlerini yönet ve yüksek bahşiş topla.',
    perks: ['Turist bahşişi', 'Yüksek sabit yevmiye', 'Prestij kazanımı'],
  },
  {
    key: 'sube_yoneticisi',
    title: 'Sözleşmeli Şube Yöneticisi',
    workplaceSuffix: 'Plaza & Zincir',
    category: 'ofis',
    categoryLabel: 'Ofis & Finans',
    baseWage: 6_800,
    tipRange: [450, 950],
    xpReward: 130,
    shiftHoursLabel: '09:00 - 18:00',
    shiftDurationSec: 24,
    requiredLevel: 2,
    requiredRank: 'sube_muduru',
    description: 'Bölgenin önde gelen şubelerinden birini yöneterek kendi işletmen için hızla sermaye biriktir.',
    perks: ['Yönetici maaşı', 'Yüksek performans primi', 'Hızlı sermaye birikimi'],
  },
];

export function generateCityJobListings(
  cityPlate: number,
  districtName?: string,
  rankId: CareerRankId = 'barista_kasiyer'
): JobListing[] {
  const prov = getProvinceByPlate(cityPlate);
  const rankDef = getCareerRankDef(rankId);
  const economicBoost = 0.9 + Math.max(0.85, prov.landMultiplier) * 0.14;

  return JOB_TEMPLATES.map((tpl, idx) => {
    const resolvedDistrict =
      districtName && districtName.trim().length > 0
        ? districtName
        : prov.districts[idx % prov.districts.length] ?? 'Merkez';
    const dailyWage = Math.round((tpl.baseWage * economicBoost * rankDef.wageMultiplier) / 50) * 50;
    const minTip = Math.round((tpl.tipRange[0] * rankDef.tipMultiplier) / 10) * 10;
    const maxTip = Math.round((tpl.tipRange[1] * rankDef.tipMultiplier) / 10) * 10;

    return {
      id: `job-${prov.plate}-${resolvedDistrict.toLowerCase().replace(/\s+/g, '-')}-${tpl.key}`,
      title: tpl.title,
      workplaceName: `${resolvedDistrict} ${tpl.workplaceSuffix}`,
      category: tpl.category,
      categoryLabel: tpl.categoryLabel,
      cityPlate: prov.plate,
      cityName: prov.name,
      districtName: resolvedDistrict,
      dailyWage,
      tipRange: [minTip, maxTip],
      xpReward: tpl.xpReward,
      shiftHoursLabel: tpl.shiftHoursLabel,
      shiftDurationSec: tpl.shiftDurationSec,
      requiredLevel: tpl.requiredLevel,
      requiredRank: tpl.requiredRank,
      description: tpl.description,
      perks: tpl.perks,
    };
  });
}

export function canApplyForJob(
  job: JobListing,
  playerLevel: number,
  currentRankId: CareerRankId
): { eligible: boolean; reason?: string } {
  if (playerLevel < job.requiredLevel) {
    return {
      eligible: false,
      reason: `Seviye ${job.requiredLevel} gerekli (Mevcut: Seviye ${playerLevel})`,
    };
  }
  if (job.requiredRank) {
    const currentIdx = getCareerRankDef(currentRankId).index;
    const requiredDef = getCareerRankDef(job.requiredRank);
    if (currentIdx < requiredDef.index) {
      return {
        eligible: false,
        reason: `${requiredDef.title} terfisi gerekli (${requiredDef.minShifts} vardiya)`,
      };
    }
  }
  return { eligible: true };
}

export interface ShiftCompletionOutcome {
  state: EmpireState;
  wagePaid: number;
  tipsIncluded: number;
  xpEarned: number;
  promotedTo: CareerRankDef | null;
  promotionBonus: number;
}

/**
 * Pure transition when a player finishes a 2D shift: pays shift wage (+ any uncollected tips),
 * awards XP, increments completed shifts, and triggers automatic promotion + promotion bonus!
 */
export function completeCareerShift(
  state: EmpireState,
  job: JobListing,
  uncollectedTips: number,
  now = Date.now()
): ShiftCompletionOutcome {
  const prevCareer = state.career ?? createInitialCareerState();
  const prevRank = getCareerRankDef(prevCareer.rankId);
  const nextShifts = prevCareer.shiftsCompleted + 1;
  const nextRank = resolveCareerRankByShifts(nextShifts);
  const promotedTo = nextRank.index > prevRank.index ? nextRank : null;
  const promotionBonus = promotedTo ? promotedTo.promotionBonusCash : 0;

  const traitMods = getCharacterTraitModifiers(state);
  const safeWage = Math.max(0, Math.round(job.dailyWage));
  const safeTips = Math.max(0, Math.round(uncollectedTips * traitMods.tipMultiplier));
  const totalCashDelta = safeWage + safeTips + promotionBonus;
  const xpEarned = Math.max(10, Math.round(job.xpReward * traitMods.xpMultiplier));

  const nextCareer: CareerState = {
    ...prevCareer,
    rankId: nextRank.id,
    shiftsCompleted: nextShifts,
    careerXp: prevCareer.careerXp + xpEarned,
    totalWagesEarned: prevCareer.totalWagesEarned + safeWage + promotionBonus,
    totalTipsEarned: prevCareer.totalTipsEarned + safeTips,
    activeJobId: job.id,
    activeJobCityPlate: job.cityPlate,
    activeJobDistrict: job.districtName,
    lastShiftAt: now,
  };

  return {
    state: {
      ...state,
      cash: Math.round(state.cash + totalCashDelta),
      totalEarnedLifetime: Math.round(state.totalEarnedLifetime + totalCashDelta),
      companyXp: Math.round((state.companyXp ?? 0) + xpEarned),
      career: nextCareer,
      lastSavedAt: now,
    },
    wagePaid: safeWage,
    tipsIncluded: safeTips,
    xpEarned,
    promotedTo,
    promotionBonus,
  };
}

/**
 * Collects tips mid-shift immediately into player cash and career tip tally.
 */
export function collectShiftTip(
  state: EmpireState,
  tipAmount: number,
  now = Date.now()
): EmpireState {
  const traitMods = getCharacterTraitModifiers(state);
  const safeTip = Math.max(0, Math.round(tipAmount * traitMods.tipMultiplier));
  if (safeTip <= 0) return state;
  const prevCareer = state.career ?? createInitialCareerState();
  return {
    ...state,
    cash: Math.round(state.cash + safeTip),
    totalEarnedLifetime: Math.round(state.totalEarnedLifetime + safeTip),
    career: {
      ...prevCareer,
      totalTipsEarned: prevCareer.totalTipsEarned + safeTip,
    },
    lastSavedAt: now,
  };
}

// ============================================================================
// 81-PROVINCE UNLOCK PROGRESSION (1 STARTING PROVINCE OPEN, 80 LOCKED)
// ============================================================================

export function getUnlockedCityPlates(state: EmpireState): number[] {
  const set = new Set<number>();
  if (Array.isArray(state.unlockedCityPlates)) {
    for (const p of state.unlockedCityPlates) {
      if (Number.isInteger(p) && p >= 1 && p <= 81) set.add(p);
    }
  }
  if (state.hq?.cityPlate) {
    set.add(state.hq.cityPlate);
  }
  for (const b of state.businesses) {
    if (b.cityPlate >= 1 && b.cityPlate <= 81) set.add(b.cityPlate);
  }
  if (set.size === 0) set.add(34);
  return Array.from(set).sort((a, b) => a - b);
}

export function isProvinceUnlocked(state: EmpireState, plate: number): boolean {
  return getUnlockedCityPlates(state).includes(plate);
}

export function getProvinceUnlockRequirement(
  plate: number,
  unlockedPlates: number[]
): ProvinceUnlockRequirement {
  const prov = getProvinceByPlate(plate);
  const alreadyUnlocked = unlockedPlates.includes(plate);

  // Economic tier determines level requirement & license cost
  const economicScore = prov.landMultiplier * 0.5 + prov.business * 0.3 + prov.tourism * 0.2;
  let requiredLevel = 1;
  let baseLicense = 35_000;

  if (plate === 34 || economicScore >= 1.42) {
    requiredLevel = 3;
    baseLicense = 450_000;
  } else if (plate === 6 || plate === 35 || plate === 7 || economicScore >= 1.25) {
    requiredLevel = 2;
    baseLicense = 220_000;
  } else if (economicScore >= 1.12) {
    requiredLevel = 1;
    baseLicense = 95_000;
  } else {
    requiredLevel = 1;
    baseLicense = 45_000;
  }

  // Gentle expansion scaling per already unlocked city beyond the first
  const expansionScale = 1 + Math.max(0, unlockedPlates.length - 1) * 0.08;
  const licenseCost = Math.round((baseLicense * expansionScale) / 5_000) * 5_000;

  return {
    plate: prov.plate,
    cityName: prov.name,
    region: prov.region,
    requiredLevel,
    licenseCost,
    alreadyUnlocked,
  };
}

export function unlockProvinceLicense(
  state: EmpireState,
  plate: number,
  playerLevel: number,
  now = Date.now()
): { ok: boolean; error?: string; state: EmpireState; costPaid: number } {
  const unlocked = getUnlockedCityPlates(state);
  if (unlocked.includes(plate)) {
    return { ok: true, state, costPaid: 0 };
  }

  const req = getProvinceUnlockRequirement(plate, unlocked);
  if (playerLevel < req.requiredLevel) {
    return {
      ok: false,
      error: `${req.cityName} il lisansını açmak için en az Seviye ${req.requiredLevel} olmalısınız.`,
      state,
      costPaid: 0,
    };
  }
  if (state.cash < req.licenseCost) {
    return {
      ok: false,
      error: `Yetersiz kasa! ${req.cityName} ticari il lisansı için ₺${req.licenseCost.toLocaleString('tr-TR')} gerekli.`,
      state,
      costPaid: 0,
    };
  }

  const traitMods = getCharacterTraitModifiers(state);
  return {
    ok: true,
    costPaid: req.licenseCost,
    state: {
      ...state,
      cash: Math.round(state.cash - req.licenseCost),
      unlockedCityPlates: [...unlocked, plate].sort((a, b) => a - b),
      companyXp: Math.round((state.companyXp ?? 0) + Math.round(120 * traitMods.xpMultiplier)),
      lastSavedAt: now,
    },
  };
}

// ============================================================================
// FIRST SHOP MICRO-ENTREPRENEUR GRANT (₺2.500 -> SHIFTS -> ₺20.000 FIRST CAFE)
// ============================================================================

export function isEligibleForFirstShopGrant(
  ownBusinessCount: number,
  blueprintId: string
): boolean {
  return ownBusinessCount === 0 && blueprintId === 'kafe';
}

export function getEffectiveEstablishmentCost(
  blueprint: BusinessBlueprint,
  location: Pick<PinLocationInfo, 'landMultiplier'>,
  ownBusinessCount: number,
  rentDiscountRate = 0
): number {
  const safeDiscount = Math.max(0, Math.min(0.35, rentDiscountRate));
  if (isEligibleForFirstShopGrant(ownBusinessCount, blueprint.id)) {
    return Math.round((FIRST_SHOP_ENTRY_COST * (1 - safeDiscount)) / 500) * 500;
  }
  const base = Math.round((blueprint.baseCost * location.landMultiplier) / 1000) * 1000;
  return Math.round((base * (1 - safeDiscount)) / 1000) * 1000;
}
