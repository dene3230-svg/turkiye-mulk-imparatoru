import type {
  EmpireState,
  OfficeBenefits,
  OfficeTierDef,
  OfficeTierId,
  OfficeUpgradeDef,
  OwnedBusiness,
  PersonalAssetDef,
  ServiceQualityReport,
  StaffRole,
} from '../types/game';
import { getBranchStaffSlots, resolveBusinessAutomation } from './hrEngine';

export const OFFICE_TIERS: OfficeTierDef[] = [
  {
    id: 'home_office',
    level: 1,
    name: 'Home Ofis / Küçük Büro',
    subtitle: 'Başlangıç Çalışma Alanı',
    description:
      'Girişimcilik yolculuğunun ilk durağı. Mütevazı bir masa ve temel ekipmanlarla işlerinizi yönetirsiniz.',
    cost: 0,
    minBrandRecognition: 0,
    basePrestige: 10,
    supplyDiscountRate: 0,
    loanInterestDiscount: 0,
    maxHireableExecutive: 'sube_muduru',
    accentColor: '#64748B',
  },
  {
    id: 'plaza_floor',
    level: 2,
    name: 'Plaza Katı',
    subtitle: 'Kurumsal İş Merkezi',
    description:
      'Şehir merkezinde cam cepheli profesyonel ofis katı. Bankalar ve tedarikçiler firmanızı ciddiye almaya başlar.',
    cost: 4_500_000,
    minBrandRecognition: 12,
    basePrestige: 32,
    supplyDiscountRate: 0.04,
    loanInterestDiscount: 0.01,
    maxHireableExecutive: 'bolge_sorumlusu',
    accentColor: '#0284C7',
  },
  {
    id: 'bosphorus_suite',
    level: 3,
    name: 'Boğaz Manzaralı Yönetici Ofisi',
    subtitle: 'Üst Düzey Prestij Merkezi',
    description:
      'Boğaz panoramalı özel yönetici katı. Üst düzey Genel Müdür adayları ve kurumsal kredi avantajları açılır.',
    cost: 35_000_000,
    minBrandRecognition: 35,
    basePrestige: 56,
    supplyDiscountRate: 0.08,
    loanInterestDiscount: 0.022,
    maxHireableExecutive: 'genel_mudur',
    accentColor: '#D97706',
  },
  {
    id: 'holding_tower',
    level: 4,
    name: 'Holding Gökdeleni',
    subtitle: 'Türkiye Genel Merkezi',
    description:
      'Finans merkezinde kendi holding kuleniz. Toptancılarda maksimum ıskonto, en düşük banka faizi ve CEO atama prestiji sağlar.',
    cost: 240_000_000,
    minBrandRecognition: 62,
    basePrestige: 76,
    supplyDiscountRate: 0.11,
    loanInterestDiscount: 0.035,
    maxHireableExecutive: 'ceo',
    accentColor: '#7C3AED',
  },
];

export const OFFICE_UPGRADES: OfficeUpgradeDef[] = [
  {
    id: 'exec_desk',
    name: 'Yönetici Masası & Ergonomik Takım',
    description: 'Ceviz kaplama yönetici masası ve profesyonel sunum ekranı. Ofis prestijini artırır.',
    cost: 350_000,
    minOfficeLevel: 1,
    prestigeBonus: 6,
    supplyDiscountBonus: 0.01,
    loanInterestDiscountBonus: 0.002,
    brandBonus: 2,
  },
  {
    id: 'meeting_room',
    name: 'Kurumsal Toplantı Salonu',
    description: 'Tedarikçiler ve banka müdürleriyle resmi pazarlık masası. Kredi yeterliliği ve tedarik indirimi sağlar.',
    cost: 1_250_000,
    minOfficeLevel: 1,
    prestigeBonus: 10,
    supplyDiscountBonus: 0.02,
    loanInterestDiscountBonus: 0.004,
    brandBonus: 3,
  },
  {
    id: 'reception',
    name: 'Sekreterya & Resepsiyon Ekibi',
    description: 'Profesyonel karşılama ve randevu yönetimi. Müşteri ve iş ortaklarında kurumsal güven yaratır.',
    cost: 2_800_000,
    minOfficeLevel: 2,
    prestigeBonus: 8,
    supplyDiscountBonus: 0.005,
    loanInterestDiscountBonus: 0.002,
    brandBonus: 4,
  },
  {
    id: 'pr_studio',
    name: 'Kurumsal İletişim & PR Odası',
    description: 'Marka yönetimi ve basın ilişkileri birimi. Firma tanınırlığını kalıcı olarak yükseltir.',
    cost: 7_500_000,
    minOfficeLevel: 2,
    prestigeBonus: 9,
    supplyDiscountBonus: 0.01,
    loanInterestDiscountBonus: 0.002,
    brandBonus: 6,
  },
  {
    id: 'vip_lounge',
    name: 'VIP Yatırımcı Lounge',
    description: 'Banka yönetim kurulları ve büyük tedarikçi patronları için özel ağırlama salonu.',
    cost: 22_000_000,
    minOfficeLevel: 3,
    prestigeBonus: 10,
    supplyDiscountBonus: 0.01,
    loanInterestDiscountBonus: 0.005,
    brandBonus: 5,
  },
  {
    id: 'helipad',
    name: 'Çatı Helikopter Pisti',
    description: 'Holding gökdeleninizin tepesinde özel iniş pisti. Ülke çapında zirve prestij simgesi.',
    cost: 75_000_000,
    minOfficeLevel: 4,
    prestigeBonus: 12,
    supplyDiscountBonus: 0.01,
    loanInterestDiscountBonus: 0.005,
    brandBonus: 8,
  },
];

export const PERSONAL_ASSETS: PersonalAssetDef[] = [
  {
    id: 'classic_watch',
    name: 'İsviçre Klasik Saat',
    category: 'Aksesuar',
    description: 'İş toplantılarında güven ve titizlik simgesi olan sınırlı üretim mekanik kol saati.',
    cost: 480_000,
    prestigeBonus: 3,
    brandBonus: 1,
  },
  {
    id: 'luxury_sedan',
    name: 'Makam Aracı (Lüks Sedan)',
    category: 'Ulaşım',
    description: 'Şoförlü zırhlı makam aracı; banka ve tedarikçi ziyaretlerinde kurumsal ağırlık sağlar.',
    cost: 4_800_000,
    prestigeBonus: 6,
    brandBonus: 3,
  },
  {
    id: 'bosphorus_residence',
    name: 'Boğaz Manzaralı Rezidans',
    category: 'Gayrimenkul',
    description: 'İstanbul Boğazı’na hakim özel rezidans dairesi; iş dünyasında seçkin çevre kazandırır.',
    cost: 45_000_000,
    prestigeBonus: 9,
    brandBonus: 5,
  },
  {
    id: 'private_yacht',
    name: 'Özel Motoryat',
    category: 'Denizcilik',
    description: 'Göcek ve Bodrum koylarında yatırımcıları ağırlayabileceğiniz 32 metrelik özel yat.',
    cost: 135_000_000,
    prestigeBonus: 11,
    brandBonus: 7,
  },
  {
    id: 'private_jet',
    name: 'Özel İş Jeti',
    category: 'Havacılık',
    description: '81 ildeki şubelerinizi aynı gün denetlemenizi sağlayan kıtalararası özel iş jeti.',
    cost: 480_000_000,
    prestigeBonus: 15,
    brandBonus: 10,
  },
];

const EXEC_RANK: Record<'sube_muduru' | 'bolge_sorumlusu' | 'genel_mudur' | 'ceo', number> = {
  sube_muduru: 1,
  bolge_sorumlusu: 2,
  genel_mudur: 3,
  ceo: 4,
};

export function getOfficeTierById(id?: OfficeTierId | null): OfficeTierDef {
  return OFFICE_TIERS.find((t) => t.id === id) ?? OFFICE_TIERS[0];
}

export function calculatePersonalAssetsValuation(state: Pick<EmpireState, 'personalAssetIds'>): number {
  const owned = new Set(state.personalAssetIds ?? []);
  return PERSONAL_ASSETS.filter((a) => owned.has(a.id)).reduce((s, a) => s + a.cost, 0);
}

export function calculateOfficeBenefits(
  state: Pick<EmpireState, 'officeTierId' | 'officeUpgradeIds' | 'personalAssetIds'>
): OfficeBenefits {
  const tier = getOfficeTierById(state.officeTierId);
  const ownedUpgrades = new Set(state.officeUpgradeIds ?? []);
  const ownedAssets = new Set(state.personalAssetIds ?? []);

  let prestige = tier.basePrestige;
  let supplyDiscount = tier.supplyDiscountRate;
  let interestDiscount = tier.loanInterestDiscount;

  for (const upg of OFFICE_UPGRADES) {
    if (ownedUpgrades.has(upg.id)) {
      prestige += upg.prestigeBonus;
      supplyDiscount += upg.supplyDiscountBonus;
      interestDiscount += upg.loanInterestDiscountBonus;
    }
  }

  for (const asset of PERSONAL_ASSETS) {
    if (ownedAssets.has(asset.id)) {
      prestige += asset.prestigeBonus;
    }
  }

  const officePrestige = Math.max(0, Math.min(100, Math.round(prestige)));
  const supplyDiscountRate = Number(Math.min(0.15, Math.max(0, supplyDiscount)).toFixed(4));
  const loanInterestDiscount = Number(Math.min(0.05, Math.max(0, interestDiscount)).toFixed(4));
  const loanLimitMultiplier = Number((1 + officePrestige * 0.008).toFixed(3)); // up to 1.8x loan limit at 100 prestige

  return {
    tier,
    officePrestige,
    supplyDiscountRate,
    loanInterestDiscount,
    loanLimitMultiplier,
    maxHireableExecutive: tier.maxHireableExecutive,
  };
}

export function canOfficeHireRole(
  state: Pick<EmpireState, 'officeTierId' | 'officeUpgradeIds' | 'personalAssetIds'>,
  role: StaffRole | 'ceo'
): { allowed: boolean; requiredTierName?: string } {
  if (role === 'calisan' || role === 'mudur_yardimcisi' || role === 'sube_muduru') {
    return { allowed: true };
  }
  const benefits = calculateOfficeBenefits(state);
  const currentRank = EXEC_RANK[benefits.maxHireableExecutive];
  const neededRank = EXEC_RANK[role];
  if (currentRank >= neededRank) {
    return { allowed: true };
  }
  const neededTier = OFFICE_TIERS.find((t) => EXEC_RANK[t.maxHireableExecutive] >= neededRank);
  return {
    allowed: false,
    requiredTierName: neededTier?.name ?? 'Üst Düzey Ofis',
  };
}

export function upgradeOfficeTier(
  state: EmpireState,
  targetTierId: OfficeTierId,
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string; tier?: OfficeTierDef } {
  const current = getOfficeTierById(state.officeTierId);
  const target = OFFICE_TIERS.find((t) => t.id === targetTierId);
  if (!target) {
    return { state, ok: false, error: 'Geçersiz ofis kademesi.' };
  }
  if (target.level <= current.level) {
    return { state, ok: false, error: 'Bu ofis kademesine zaten sahipsiniz.' };
  }
  if (target.level > current.level + 1) {
    const prevTier = OFFICE_TIERS.find((t) => t.level === target.level - 1);
    return {
      state,
      ok: false,
      error: `Önce "${prevTier?.name}" kademesine yükselmelisiniz.`,
    };
  }
  const brand = state.brandRecognition ?? 5;
  if (brand < target.minBrandRecognition) {
    return {
      state,
      ok: false,
      error: `${target.name} için en az %${target.minBrandRecognition} firma tanınırlığı gereklidir (Mevcut: %${brand.toFixed(1)}).`,
    };
  }
  if (state.cash < target.cost) {
    return {
      state,
      ok: false,
      error: `${target.name} kurulumu için ₺${target.cost.toLocaleString('tr-TR')} nakit gerekiyor.`,
    };
  }

  return {
    ok: true,
    tier: target,
    state: {
      ...state,
      cash: state.cash - target.cost,
      officeTierId: target.id,
      brandRecognition: Number(Math.min(100, brand + 4).toFixed(1)),
      lastSavedAt: now,
    },
  };
}

export function buyOfficeUpgrade(
  state: EmpireState,
  upgradeId: string,
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string; upgrade?: OfficeUpgradeDef } {
  const upg = OFFICE_UPGRADES.find((u) => u.id === upgradeId);
  if (!upg) return { state, ok: false, error: 'Ofis donanımı bulunamadı.' };

  const owned = state.officeUpgradeIds ?? [];
  if (owned.includes(upgradeId)) {
    return { state, ok: false, error: 'Bu ofis donanımı zaten kurulu.' };
  }

  const currentTier = getOfficeTierById(state.officeTierId);
  if (currentTier.level < upg.minOfficeLevel) {
    const reqTier = OFFICE_TIERS.find((t) => t.level === upg.minOfficeLevel);
    return {
      state,
      ok: false,
      error: `Bu donanım için en az "${reqTier?.name}" ofis seviyesi gereklidir.`,
    };
  }

  if (state.cash < upg.cost) {
    return {
      state,
      ok: false,
      error: `${upg.name} için ₺${upg.cost.toLocaleString('tr-TR')} nakit gerekiyor.`,
    };
  }

  return {
    ok: true,
    upgrade: upg,
    state: {
      ...state,
      cash: state.cash - upg.cost,
      officeUpgradeIds: [...owned, upgradeId],
      brandRecognition: Number(Math.min(100, (state.brandRecognition ?? 5) + upg.brandBonus).toFixed(1)),
      lastSavedAt: now,
    },
  };
}

export function buyPersonalAsset(
  state: EmpireState,
  assetId: string,
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string; asset?: PersonalAssetDef } {
  const asset = PERSONAL_ASSETS.find((a) => a.id === assetId);
  if (!asset) return { state, ok: false, error: 'Kişisel varlık bulunamadı.' };

  const owned = state.personalAssetIds ?? [];
  if (owned.includes(assetId)) {
    return { state, ok: false, error: 'Bu kişisel varlığa zaten sahipsiniz.' };
  }
  if (state.cash < asset.cost) {
    return {
      state,
      ok: false,
      error: `${asset.name} için ₺${asset.cost.toLocaleString('tr-TR')} nakit gerekiyor.`,
    };
  }

  return {
    ok: true,
    asset,
    state: {
      ...state,
      cash: state.cash - asset.cost,
      personalAssetIds: [...owned, assetId],
      brandRecognition: Number(
        Math.min(100, (state.brandRecognition ?? 5) + asset.brandBonus).toFixed(1)
      ),
      lastSavedAt: now,
    },
  };
}

// ============================================================================
// BRANCH SERVICE QUALITY (1.0 - 5.0★) & COMPANY BRAND RECOGNITION (0 - 100%)
// ============================================================================

export function calculateBranchServiceQuality(
  business: OwnedBusiness,
  cityManagers: EmpireState['cityManagers'] = [],
  allOwnBusinesses: OwnedBusiness[] = [business]
): ServiceQualityReport {
  const slots = getBranchStaffSlots(business);
  const employees = business.employees ?? [];
  const automation = resolveBusinessAutomation(business, cityManagers, allOwnBusinesses);
  const stock = Math.max(0, Math.min(100, business.stockLevel ?? 100));
  const maint = Math.max(0, Math.min(100, business.maintenanceLevel ?? 100));
  const morale = Math.max(0, Math.min(100, business.staffMorale ?? (slots.workers > 0 ? 78 : 50)));
  const qualityLv = Math.max(0, Math.min(5, business.qualityInvestmentLevel ?? 0));

  const issues: string[] = [];

  // 1) Staffing score (0..1.7 stars) — Having 0 workers destroys service!
  let staffStars = 0.15;
  if (slots.workers === 0 && slots.branchManagers === 0 && !automation.fullAutomation) {
    staffStars = 0.1;
    issues.push('Personel yok — müşteriler hizmet alamadan ayrılıyor');
  } else if (slots.workers === 0) {
    staffStars = 0.65;
    issues.push('Tezgahta/sahada çalışan personel eksik (en az 1–2 çalışan alın)');
  } else if (slots.workers === 1) {
    staffStars = 1.05;
    issues.push('Tek çalışan yoğun saatlerde kuyruk oluşturuyor');
  } else if (slots.workers === 2) {
    staffStars = 1.4;
  } else {
    staffStars = 1.65;
  }

  // Average star rating of branch staff adds up to +0.55★
  const avgEmpStars =
    employees.length > 0
      ? employees.reduce((s, e) => s + e.stars, 0) / employees.length
      : business.staffCount > 0
      ? 2.5
      : 0;
  const skillStars = avgEmpStars > 0 ? (avgEmpStars / 5) * 0.55 : 0;

  // 2) Cleanliness / Maintenance (0..1.1★)
  const maintStars = (maint / 100) * 1.1;
  if (maint < 60) {
    issues.push(`Temizlik & bakım zayıf (%${Math.round(maint)})`);
  }

  // 3) Stock availability (0..0.9★)
  const stockStars = (stock / 100) * 0.9;
  if (stock < 55) {
    issues.push(`Stok/ürün eksikliği müşteri kaçırıyor (%${Math.round(stock)})`);
  }

  // 4) Staff morale & fatigue (0..0.65★)
  const moraleStars = (morale / 100) * 0.65;
  if (morale < 55) {
    issues.push(`Personel yorgun / mutsuz (Moral %${Math.round(morale)})`);
  }

  // 5) Quality & training investment + management oversight (0..0.85★)
  const investStars = qualityLv * 0.13 + (automation.fullAutomation ? 0.2 : 0);

  const rawStars = 0.5 + staffStars + skillStars + maintStars + stockStars + moraleStars + investStars;
  const stars = Number(Math.max(1.0, Math.min(5.0, rawStars)).toFixed(1));

  // Piecewise customer traffic multiplier: bad service (<2.5★) causes severe customer collapse!
  let customerTrafficMultiplier = 1.0;
  if (stars < 2.0) {
    customerTrafficMultiplier = 0.2 + (stars - 1.0) * 0.22; // 1.0★ -> 0.20, 1.9★ -> 0.40
  } else if (stars < 3.0) {
    customerTrafficMultiplier = 0.42 + (stars - 2.0) * 0.43; // 2.0★ -> 0.42, 2.9★ -> 0.81
  } else if (stars < 4.0) {
    customerTrafficMultiplier = 0.85 + (stars - 3.0) * 0.25; // 3.0★ -> 0.85, 3.9★ -> 1.08
  } else {
    customerTrafficMultiplier = 1.1 + (stars - 4.0) * 0.15; // 4.0★ -> 1.10, 5.0★ -> 1.25
  }
  customerTrafficMultiplier = Number(customerTrafficMultiplier.toFixed(3));

  const statusLabel: ServiceQualityReport['statusLabel'] =
    stars >= 4.3
      ? 'Mükemmel Hizmet'
      : stars >= 3.5
      ? 'İyi Hizmet'
      : stars >= 2.6
      ? 'Orta Kalite'
      : stars >= 1.9
      ? 'Kötü Hizmet — Müşteri Kaybı'
      : 'Kritik — Müşteriler Kaçıyor';

  return {
    stars,
    customerTrafficMultiplier,
    customerTrafficPct: Math.round(customerTrafficMultiplier * 100),
    staffMorale: Math.round(morale),
    statusLabel,
    issues,
  };
}

/**
 * Brand Recognition (0..100%) customer demand multiplier:
 * Unknown new firm (5%) starts at ~0.84x demand; famous national brand (100%) earns up to 1.28x!
 */
export function calculateBrandDemandMultiplier(brandRecognition = 5): number {
  const clamped = Math.max(0, Math.min(100, brandRecognition));
  return Number((0.82 + (clamped / 100) * 0.46).toFixed(3));
}

export function calculateQualityInvestmentCost(business: OwnedBusiness): number {
  const lv = Math.max(0, Math.min(5, business.qualityInvestmentLevel ?? 0));
  return Math.max(45_000, Math.round((business.purchaseCost * 0.08 * Math.pow(1.45, lv)) / 1000) * 1000);
}

/**
 * Invests in branch service quality, staff training, hygiene & morale (+1 Quality Lv up to 5, resets morale/maint to 100).
 */
export function investInBranchQuality(
  state: EmpireState,
  businessId: string,
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string; business?: OwnedBusiness } {
  const target = state.businesses.find((b) => b.id === businessId);
  if (!target) return { state, ok: false, error: 'İşletme bulunamadı.' };

  const currentLv = Math.max(0, Math.min(5, target.qualityInvestmentLevel ?? 0));
  if (currentLv >= 5 && (target.staffMorale ?? 80) >= 95 && (target.maintenanceLevel ?? 100) >= 95) {
    return { state, ok: false, error: 'Bu şube zaten maksimum hizmet kalitesi (5/5) ve tam moral düzeyinde.' };
  }

  const cost =
    currentLv < 5
      ? calculateQualityInvestmentCost(target)
      : Math.max(25_000, Math.round((target.purchaseCost * 0.03) / 1000) * 1000);

  if (state.cash < cost) {
    return {
      state,
      ok: false,
      error: `Hizmet kalitesi ve personel eğitimi için ₺${cost.toLocaleString('tr-TR')} nakit gerekiyor.`,
    };
  }

  const nextLv = Math.min(5, currentLv + 1);
  const updated: OwnedBusiness = {
    ...target,
    qualityInvestmentLevel: nextLv,
    staffMorale: 100,
    maintenanceLevel: 100,
  };
  const q = calculateBranchServiceQuality(updated, state.cityManagers, state.businesses);
  updated.serviceQuality = q.stars;
  updated.customerTrafficPct = q.customerTrafficPct;

  return {
    ok: true,
    business: updated,
    state: {
      ...state,
      cash: state.cash - cost,
      brandRecognition: Number(Math.min(100, (state.brandRecognition ?? 5) + 0.6).toFixed(1)),
      businesses: state.businesses.map((b) => (b.id === businessId ? updated : b)),
      lastSavedAt: now,
    },
  };
}

/**
 * Updates company Brand Recognition (0..100%) gradually at midnight 00:00 based on:
 * - Average active branch Service Quality (high quality grows brand slowly; bad quality < 2.6★ hurts brand!)
 * - Active advertising campaigns (+0.35%/day per advertised branch, capped)
 * - Active branch footprint
 */
export function computeNextBrandRecognition(
  currentBrand: number,
  businesses: OwnedBusiness[],
  cityManagers: EmpireState['cityManagers'],
  daysPassed: number,
  currentGameMinutes: number
): { nextBrand: number; delta: number; avgServiceQuality: number } {
  const safeBrand = Math.max(0, Math.min(100, currentBrand ?? 5));
  const activeBranches = businesses.filter((b) => (b.constructionDaysRemaining ?? 0) <= 0);
  if (activeBranches.length === 0 || daysPassed <= 0) {
    return { nextBrand: safeBrand, delta: 0, avgServiceQuality: 0 };
  }

  let totalStars = 0;
  let activeAds = 0;
  for (const b of activeBranches) {
    const q = calculateBranchServiceQuality(b, cityManagers, businesses);
    totalStars += q.stars;
    if (b.activeAdCampaign && b.activeAdCampaign.endsAtGameMin > currentGameMinutes) {
      activeAds += 1;
    }
  }
  const avgStars = totalStars / activeBranches.length;

  let dailyDelta = 0;
  if (avgStars >= 4.2) {
    dailyDelta = 0.45 + Math.min(0.4, activeBranches.length * 0.06);
  } else if (avgStars >= 3.4) {
    dailyDelta = 0.22 + Math.min(0.25, activeBranches.length * 0.04);
  } else if (avgStars >= 2.7) {
    dailyDelta = 0.04;
  } else if (avgStars >= 2.0) {
    dailyDelta = -0.35;
  } else {
    dailyDelta = -0.75;
  }

  // Ad campaigns gradually build brand awareness
  dailyDelta += Math.min(0.75, activeAds * 0.28);

  // Diminishing returns above 75% so reaching 100% takes sustained corporate excellence
  if (safeBrand > 75 && dailyDelta > 0) {
    dailyDelta *= 0.55;
  }

  const totalDelta = Number((dailyDelta * daysPassed).toFixed(2));
  const nextBrand = Number(Math.max(1, Math.min(100, safeBrand + totalDelta)).toFixed(1));
  return {
    nextBrand,
    delta: Number((nextBrand - safeBrand).toFixed(2)),
    avgServiceQuality: Number(avgStars.toFixed(1)),
  };
}
