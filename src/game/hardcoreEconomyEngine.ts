import type {
  BoardContract,
  EmpireState,
  MegaProjectDef,
  MegaProjectId,
  MegaProjectState,
  OperationalCrisisEvent,
  OperationalCrisisType,
  OwnedBusiness,
  ProgressiveTaxResult,
  WageRaiseRequest,
} from '../types/game';
import { getBlueprintById } from './catalog';
import { TURKEY_EMPLOYER_SGK_RATE } from './hrEngine';

// ── Constants ────────────────────────────────────────────────────────────────

export const HQ_BUREAUCRACY_FREE_BRANCHES = 4;
export const HQ_BUREAUCRACY_DAILY_COST_PER_EXTRA_BRANCH = 18_500;

export const CONDITION_WARNING_THRESHOLD = 60;
export const CONDITION_SUSPEND_THRESHOLD = 25;

export const UNMANAGED_EFFICIENCY_CAP = 0.55;
export const REJECTED_RAISE_EFFICIENCY_CAP = 0.30;

export const INFLATION_INTERVAL_DAYS = 20;
export const INFLATION_WAVE_MULTIPLIER = 1.08;

export const RAISE_REQUEST_INTERVAL_DAYS = 15;
export const CRISIS_MIN_INTERVAL_DAYS = 8;

export const NEGATIVE_CASH_DAILY_PENALTY_RATE = 0.05;
export const FORECLOSURE_STREAK_DAYS = 3;

export const PRESTIGE_IPO_MIN_BRANCHES = 4;
export const PRESTIGE_IPO_MIN_CITIES = 2;
export const PRESTIGE_IPO_MIN_NET_WORTH = 50_000_000;

export const MEGA_PROJECT_CATALOG: MegaProjectDef[] = [
  {
    id: 'lojistik_merkezi',
    name: 'Marmara Lojistik Merkezi',
    categoryLabel: 'Lojistik & Tedarik',
    description:
      'Holdingin tüm şubelerine merkezi dağıtım sağlar. Tüm şubelerde kalıcı %6 tedarik indirimi ve düzenli lojistik geliri üretir.',
    capitalCost: 22_000_000,
    buildDays: 15,
    dailyNetIncome: 780_000,
    prestigeBonus: 8,
    brandBonus: 6,
    supplyDiscountBonus: 0.06,
  },
  {
    id: 'mega_avm',
    name: 'Anadolu Mega AVM',
    categoryLabel: 'Ticari Gayrimenkul',
    description:
      '140 mağazalı bölgesel alışveriş kompleksi. Tamamlandığında yüksek günlük kira geliri ve marka prestiji sağlar.',
    capitalCost: 48_000_000,
    buildDays: 18,
    dailyNetIncome: 1_850_000,
    prestigeBonus: 14,
    brandBonus: 10,
    supplyDiscountBonus: 0.02,
  },
  {
    id: 'grand_otel',
    name: 'Boğaz 5★ Grand Otel',
    categoryLabel: 'Turizm & Konaklama',
    description:
      'Uluslararası iş dünyasına hitap eden lüks otel yatırımı. Yüksek döviz bazlı günlük kâr ve güçlü marka algısı sunar.',
    capitalCost: 75_000_000,
    buildDays: 22,
    dailyNetIncome: 3_100_000,
    prestigeBonus: 20,
    brandBonus: 14,
    supplyDiscountBonus: 0,
  },
  {
    id: 'holding_gokdeleni',
    name: 'Holding Genel Merkez Gökdeleni',
    categoryLabel: 'Amiral Gemisi',
    description:
      '52 katlı finans ve yönetim kulesi. Ofis kira gelirleri ve kurumsal dev ölçeğiyle imparatorluğun zirve sembolüdür.',
    capitalCost: 135_000_000,
    buildDays: 30,
    dailyNetIncome: 5_900_000,
    prestigeBonus: 30,
    brandBonus: 20,
    supplyDiscountBonus: 0.04,
  },
];

// ── 1. Progressive Corporate Tax Brackets & HQ Bureaucracy Overhead ─────────

export function calculateProgressiveDailyCorporateTax(
  dailyNetBeforeTax: number,
  prestigeMarketTier = 0
): ProgressiveTaxResult {
  const safeProfit = Number.isFinite(dailyNetBeforeTax) ? Math.max(0, dailyNetBeforeTax) : 0;
  const prestigeSurchargePct = Math.max(0, Math.round(prestigeMarketTier)) * 2;

  let baseBracketPct = 15;
  let bracketLabel = '0 – 250.000 ₺ (%15)';
  if (safeProfit > 5_000_000) {
    baseBracketPct = 42;
    bracketLabel = '5.000.000 ₺+ (%42)';
  } else if (safeProfit > 1_000_000) {
    baseBracketPct = 35;
    bracketLabel = '1M – 5M ₺ (%35)';
  } else if (safeProfit > 250_000) {
    baseBracketPct = 25;
    bracketLabel = '250B – 1M ₺ (%25)';
  }

  const totalTopBracketPct = Math.min(55, baseBracketPct + prestigeSurchargePct);

  if (safeProfit <= 0) {
    return {
      bracketPct: totalTopBracketPct,
      baseBracketPct,
      prestigeTaxSurchargePct: prestigeSurchargePct,
      taxAmount: 0,
      effectiveRatePct: 0,
      bracketLabel,
    };
  }

  // Marginal progressive calculation across the 4 official corporate profit tiers
  const tier1 = Math.min(safeProfit, 250_000);
  const tier2 = Math.min(Math.max(0, safeProfit - 250_000), 750_000);
  const tier3 = Math.min(Math.max(0, safeProfit - 1_000_000), 4_000_000);
  const tier4 = Math.max(0, safeProfit - 5_000_000);

  const surchargeRate = prestigeSurchargePct / 100;
  const rawTax =
    tier1 * (0.15 + surchargeRate) +
    tier2 * (0.25 + surchargeRate) +
    tier3 * (0.35 + surchargeRate) +
    tier4 * (0.42 + surchargeRate);

  const taxAmount = Math.max(0, Math.round(rawTax));
  const effectiveRatePct = Number(((taxAmount / safeProfit) * 100).toFixed(1));

  return {
    bracketPct: totalTopBracketPct,
    baseBracketPct,
    prestigeTaxSurchargePct: prestigeSurchargePct,
    taxAmount,
    effectiveRatePct,
    bracketLabel,
  };
}

export function calculateHqBureaucracyDailyCost(branchCount: number): number {
  const safeCount = Math.max(0, Math.floor(branchCount));
  if (safeCount <= HQ_BUREAUCRACY_FREE_BRANCHES) return 0;
  return (safeCount - HQ_BUREAUCRACY_FREE_BRANCHES) * HQ_BUREAUCRACY_DAILY_COST_PER_EXTRA_BRANCH;
}

// ── 2. Branch Condition, Depreciation, Maintenance & Equipment Renewal ──────

export function calculateDailyConditionWear(business: OwnedBusiness): number {
  const level = Math.max(1, business.level ?? 1);
  const eqLevel = Math.max(1, Math.min(10, business.equipmentLevel ?? 1));
  const staffLoad = Math.min(6, business.employees?.length ?? business.staffCount ?? 0);
  // Base wear 2.4%, increases with branch level & workload, softened by modern equipment -> clamped to 2.0%..4.0%
  const rawWear = 2.4 + (level - 1) * 0.28 + staffLoad * 0.14 - (eqLevel - 1) * 0.18;
  return Number(Math.max(2.0, Math.min(4.0, rawWear)).toFixed(2));
}

export function getConditionPerformanceMultiplier(condition: number): number {
  const c = Number.isFinite(condition) ? Math.max(0, Math.min(100, condition)) : 100;
  if (c < CONDITION_SUSPEND_THRESHOLD) {
    return 0; // Suspended until repaired!
  }
  if (c >= CONDITION_WARNING_THRESHOLD) {
    return 1.0;
  }
  // Between 25% and 59.9%: sharply degrades from 0.42 up to 0.80
  const ratio =
    (c - CONDITION_SUSPEND_THRESHOLD) /
    (CONDITION_WARNING_THRESHOLD - CONDITION_SUSPEND_THRESHOLD);
  return Number((0.42 + ratio * 0.38).toFixed(3));
}

export function getMaintenanceRepairCost(business: OwnedBusiness): number {
  const bp = getBlueprintById(business.blueprintId);
  const condition = Math.max(0, Math.min(100, business.maintenanceLevel ?? 100));
  const missing = Math.max(10, 100 - condition);
  const base = Math.max(12_000, Math.round((business.purchaseCost || bp?.baseCost || 120_000) * 0.045));
  return Math.round((base * (missing / 45)) / 500) * 500;
}

export function getEquipmentRenewalCost(business: OwnedBusiness): number {
  const bp = getBlueprintById(business.blueprintId);
  const eqLevel = Math.max(1, Math.min(10, business.equipmentLevel ?? 1));
  const base = Math.max(35_000, Math.round((business.purchaseCost || bp?.baseCost || 120_000) * 0.16));
  return Math.round((base * Math.pow(1.28, eqLevel - 1)) / 1000) * 1000;
}

export function getPriceSyncCost(business: OwnedBusiness): number {
  const level = Math.max(1, business.level ?? 1);
  return Math.round((4_500 + level * 1_500) / 500) * 500;
}

export function performBranchMaintenance(
  state: EmpireState,
  businessId: string
): { state: EmpireState; ok: boolean; error?: string; cost?: number; newCondition?: number } {
  const biz = state.businesses.find((b) => b.id === businessId);
  if (!biz) return { state, ok: false, error: 'Şube bulunamadı.' };
  const currentCond = Math.round(biz.maintenanceLevel ?? 100);
  if (currentCond >= 99 && !biz.suspendedForMaintenance) {
    return { state, ok: false, error: 'Şube kondisyonu zaten tam durumda (%100).' };
  }
  const cost = getMaintenanceRepairCost(biz);
  if (state.cash < cost) {
    return {
      state,
      ok: false,
      error: `Bakım için yeterli nakit yok (Gerekli: ₺${cost.toLocaleString('tr-TR')}).`,
    };
  }
  const nextCond = Math.min(100, Math.round(currentCond + 40));
  const nextBusinesses = state.businesses.map((b) =>
    b.id === businessId
      ? {
          ...b,
          maintenanceLevel: nextCond,
          suspendedForMaintenance: nextCond < CONDITION_SUSPEND_THRESHOLD,
        }
      : b
  );
  return {
    state: {
      ...state,
      cash: state.cash - cost,
      businesses: nextBusinesses,
    },
    ok: true,
    cost,
    newCondition: nextCond,
  };
}

export function upgradeBranchEquipment(
  state: EmpireState,
  businessId: string
): { state: EmpireState; ok: boolean; error?: string; cost?: number; nextLevel?: number } {
  const biz = state.businesses.find((b) => b.id === businessId);
  if (!biz) return { state, ok: false, error: 'Şube bulunamadı.' };
  const currentEq = Math.max(1, Math.min(10, biz.equipmentLevel ?? 1));
  const cost = getEquipmentRenewalCost(biz);
  if (state.cash < cost) {
    return {
      state,
      ok: false,
      error: `Ekipman yenileme için yetersiz nakit (Gerekli: ₺${cost.toLocaleString('tr-TR')}).`,
    };
  }
  const nextLevel = Math.min(10, currentEq + 1);
  const nextBusinesses = state.businesses.map((b) =>
    b.id === businessId
      ? {
          ...b,
          equipmentLevel: nextLevel,
          maintenanceLevel: 100,
          suspendedForMaintenance: false,
        }
      : b
  );
  return {
    state: {
      ...state,
      cash: state.cash - cost,
      businesses: nextBusinesses,
    },
    ok: true,
    cost,
    nextLevel,
  };
}

export function syncBranchMenuPricesToInflation(
  state: EmpireState,
  businessId: string
): { state: EmpireState; ok: boolean; error?: string; cost?: number; nextIndex?: number } {
  const biz = state.businesses.find((b) => b.id === businessId);
  if (!biz) return { state, ok: false, error: 'Şube bulunamadı.' };
  const inflation = Math.max(1, state.inflationIndex ?? 1.0);
  const currentAdj = biz.priceAdjustmentIndex ?? 1.0;
  if (currentAdj >= inflation - 0.005) {
    return { state, ok: false, error: 'Şube menü fiyatları güncel enflasyonla uyumlu.' };
  }
  const cost = getPriceSyncCost(biz);
  if (state.cash < cost) {
    return {
      state,
      ok: false,
      error: `Fiyat etiketi ve menü güncelleme maliyeti karşılanamıyor (₺${cost.toLocaleString('tr-TR')}).`,
    };
  }
  const nextBusinesses = state.businesses.map((b) =>
    b.id === businessId ? { ...b, priceAdjustmentIndex: Number(inflation.toFixed(3)) } : b
  );
  return {
    state: {
      ...state,
      cash: state.cash - cost,
      businesses: nextBusinesses,
    },
    ok: true,
    cost,
    nextIndex: Number(inflation.toFixed(3)),
  };
}

// ── 3. Manager Efficiency Cap & 15-Day Staff Wage Raise Requests ────────────

export function hasBranchManager(business: OwnedBusiness): boolean {
  return (business.employees ?? []).some(
    (e) => e.role === 'sube_muduru' || e.role === 'mudur_yardimcisi'
  );
}

export function getBranchManagementEfficiencyCap(
  business: OwnedBusiness,
  currentGameDay = 1
): {
  capMultiplier: number; // 0.30, 0.55, or 1.0
  capPct: number;
  reason: 'none' | 'no_manager' | 'raise_rejected';
} {
  if ((business.moralePenaltyUntilDay ?? 0) >= currentGameDay) {
    return {
      capMultiplier: REJECTED_RAISE_EFFICIENCY_CAP,
      capPct: 30,
      reason: 'raise_rejected',
    };
  }
  if (!hasBranchManager(business)) {
    return {
      capMultiplier: UNMANAGED_EFFICIENCY_CAP,
      capPct: 55,
      reason: 'no_manager',
    };
  }
  return {
    capMultiplier: 1.0,
    capPct: 100,
    reason: 'none',
  };
}

export function generateRaiseRequestsForDay(
  state: EmpireState,
  currentDay: number
): WageRaiseRequest[] {
  const existing = state.pendingRaiseRequests ?? [];
  const existingStaffIds = new Set(existing.map((r) => r.staffId));
  const inflation = Math.max(1, state.inflationIndex ?? 1.0);
  const requests: WageRaiseRequest[] = [...existing];

  for (const biz of state.businesses) {
    if ((biz.constructionDaysRemaining ?? 0) > 0) continue;
    for (const emp of biz.employees ?? []) {
      if (requests.length >= 4) break;
      if (existingStaffIds.has(emp.id)) continue;
      const baseDaily = Math.max(
        600,
        Math.round(emp.dailyWage ?? (emp.hourlySalary ?? 100) * 8)
      );
      const inflationBonus = Math.round((inflation - 1) * 40);
      const starBonus = Math.min(8, emp.stars * 2);
      const requestedRaisePct = Math.max(14, Math.min(28, 12 + starBonus + inflationBonus));
      const proposedDailyWage = Math.round((baseDaily * (1 + requestedRaisePct / 100)) / 50) * 50;

      requests.push({
        id: `raise-${currentDay}-${emp.id}`,
        businessId: biz.id,
        businessName: biz.customName,
        staffId: emp.id,
        staffName: emp.name,
        role: emp.role,
        currentDailyWage: baseDaily,
        requestedRaisePct,
        proposedDailyWage,
        createdOnDay: currentDay,
        reason:
          inflation > 1.05
            ? `Enflasyon artışı (x${inflation.toFixed(2)}) ve 15 günlük kıdem zammı talebi`
            : '15 günlük performans ve kıdem maaş artışı talebi',
      });
      existingStaffIds.add(emp.id);
      break; // max 1 request per branch per wave
    }
  }

  return requests;
}

export function resolveRaiseRequest(
  state: EmpireState,
  requestId: string,
  decision: 'approve' | 'reject',
  currentDay: number
): { state: EmpireState; ok: boolean; resigned?: boolean; summary: string } {
  const req = (state.pendingRaiseRequests ?? []).find((r) => r.id === requestId);
  if (!req) {
    return { state, ok: false, summary: 'Zam talebi bulunamadı.' };
  }

  const remainingRequests = (state.pendingRaiseRequests ?? []).filter((r) => r.id !== requestId);

  if (decision === 'approve') {
    const nextBusinesses = state.businesses.map((b) => {
      if (b.id !== req.businessId) return b;
      const nextEmployees = (b.employees ?? []).map((emp) => {
        if (emp.id !== req.staffId) return emp;
        const nextDaily = req.proposedDailyWage;
        const nextSgk = Math.round(nextDaily * TURKEY_EMPLOYER_SGK_RATE);
        const nextHourly = Math.max(emp.hourlySalary, Math.round(nextDaily / 8));
        return {
          ...emp,
          dailyWage: nextDaily,
          dailyEmployerSgk: nextSgk,
          hourlySalary: nextHourly,
        };
      });
      return {
        ...b,
        employees: nextEmployees,
        staffMorale: Math.min(98, Math.round((b.staffMorale ?? 75) + 14)),
        moralePenaltyUntilDay: 0,
      };
    });

    return {
      state: {
        ...state,
        businesses: nextBusinesses,
        pendingRaiseRequests: remainingRequests,
      },
      ok: true,
      resigned: false,
      summary: `${req.staffName} maaş zammı (+%${req.requestedRaisePct}) onaylandı; şube morali yükseldi.`,
    };
  }

  // Reject: severe morale drop -> efficiency dragged to 30% for 5 days, or staff resigns!
  let staffResigned = false;
  const nextBusinesses = state.businesses.map((b) => {
    if (b.id !== req.businessId) return b;
    const prevMorale = b.staffMorale ?? 70;
    const shouldResign = prevMorale < 58 || req.requestedRaisePct >= 22;
    if (shouldResign) {
      staffResigned = true;
    }
    const nextEmployees = shouldResign
      ? (b.employees ?? []).filter((e) => e.id !== req.staffId)
      : b.employees ?? [];

    return {
      ...b,
      employees: nextEmployees,
      staffCount: Math.max(0, nextEmployees.length),
      staffMorale: Math.max(20, Math.round(prevMorale - 28)),
      moralePenaltyUntilDay: currentDay + 5,
    };
  });

  return {
    state: {
      ...state,
      businesses: nextBusinesses,
      pendingRaiseRequests: remainingRequests,
    },
    ok: true,
    resigned: staffResigned,
    summary: staffResigned
      ? `${req.staffName} zam reddedildiği için istifa etti! Şube verimi 5 gün %30'a geriledi.`
      : `${req.staffName} zam talebi reddedildi. Moral düştü; şube verimi 5 gün boyunca %30 ile sınırlı.`,
  };
}

// ── 4. Regional Market Saturation, Inflation Lag & Operational Crises ───────

export function calculateRegionalSaturationFactor(
  business: OwnedBusiness,
  allOwnBusinesses: OwnedBusiness[],
  prestigeMarketTier = 0
): { multiplier: number; sameSectorNearbyCount: number } {
  let nearbySameSector = 0;
  for (const other of allOwnBusinesses) {
    if (other.id === business.id) continue;
    if (other.blueprintId !== business.blueprintId) continue;
    if (other.cityPlate !== business.cityPlate) continue;
    const dist = Math.hypot((other.lat ?? 0) - (business.lat ?? 0), (other.lng ?? 0) - (business.lng ?? 0));
    nearbySameSector += dist < 0.08 ? 1.2 : 0.75;
  }

  const competitionPressure = Math.max(0, prestigeMarketTier) * 0.04;
  if (nearbySameSector <= 0 && competitionPressure === 0) {
    return { multiplier: 1.0, sameSectorNearbyCount: 0 };
  }

  const rawMult = 1 - nearbySameSector * 0.13 - competitionPressure;
  return {
    multiplier: Number(Math.max(0.55, Math.min(1.0, rawMult)).toFixed(3)),
    sameSectorNearbyCount: Math.ceil(nearbySameSector),
  };
}

export function calculateInflationMarginFactor(
  business: OwnedBusiness,
  inflationIndex = 1.0
): { revenueMultiplier: number; costMultiplier: number; isLagging: boolean; lagPct: number } {
  const inf = Math.max(1.0, inflationIndex);
  const priceIdx = Math.max(1.0, business.priceAdjustmentIndex ?? 1.0);
  const ratio = priceIdx / inf;
  const isLagging = ratio < 0.96;
  const lagPct = Math.max(0, Math.round((1 - ratio) * 100));
  // If prices match inflation, revenue rises gently with inflation; if lagging, real margin compresses sharply
  const revenueMultiplier = isLagging
    ? Number(Math.max(0.55, ratio).toFixed(3))
    : Number(Math.min(1.85, priceIdx).toFixed(3));
  return {
    revenueMultiplier,
    costMultiplier: Number(inf.toFixed(3)),
    isLagging,
    lagPct,
  };
}

export function maybeGenerateOperationalCrisis(
  state: EmpireState,
  currentDay: number
): OperationalCrisisEvent | null {
  if (state.activeCrisisEvent) return state.activeCrisisEvent;
  const activeBranches = state.businesses.filter((b) => (b.constructionDaysRemaining ?? 0) <= 0);
  if (activeBranches.length === 0) return null;
  const lastDay = state.lastCrisisDay ?? 0;
  if (currentDay < CRISIS_MIN_INTERVAL_DAYS || currentDay - lastDay < CRISIS_MIN_INTERVAL_DAYS) {
    return null;
  }

  const types: OperationalCrisisType[] = [
    'equipment_failure',
    'tax_health_audit',
    'supplier_hike',
    'nearby_rival_opened',
  ];
  const chosenType = types[(currentDay + activeBranches.length) % types.length];
  const target = activeBranches[currentDay % activeBranches.length];
  const scaleCost = Math.max(18_000, Math.round((target.purchaseCost || 120_000) * 0.08));

  if (chosenType === 'equipment_failure') {
    return {
      id: `crisis-${currentDay}-eq`,
      type: 'equipment_failure',
      title: 'Acil Ekipman Arızası',
      description: `${target.customName} şubesinde ana işletme ekipmanları arızalandı. Hızlı servis müdahalesi yapılmazsa şube kondisyonu ciddi hasar alacak.`,
      targetBusinessId: target.id,
      targetBusinessName: target.customName,
      createdOnDay: currentDay,
      choices: [
        {
          id: 'fast_repair',
          label: 'Acil Teknik Servis Çağır',
          description: 'Aynı gün orijinal parça değişimi yapılır, kondisyon %95 üzerine çıkar.',
          cost: scaleCost,
          effectSummary: '+25 Kondisyon · Kesintisiz çalışma',
          tone: 'positive',
        },
        {
          id: 'temp_patch',
          label: 'Geçici Onarım Uygula',
          description: 'Düşük maliyetle günü kurtar ama şube kondisyonu -20% yıpranır.',
          cost: Math.round(scaleCost * 0.25),
          effectSummary: '-20 Kondisyon · Düşük bütçe',
          tone: 'warning',
        },
      ],
    };
  }

  if (chosenType === 'tax_health_audit') {
    return {
      id: `crisis-${currentDay}-audit`,
      type: 'tax_health_audit',
      title: 'Vergi & Sağlık Denetimi',
      description: `${target.customName} şubesine ani belediye ve maliye denetimi geldi. Eksik hijyen/evrak bulgularını hemen gidermeniz gerekiyor.`,
      targetBusinessId: target.id,
      targetBusinessName: target.customName,
      createdOnDay: currentDay,
      choices: [
        {
          id: 'full_compliance',
          label: 'Hızlı Uyum & Uzlaşma Öde',
          description: 'Denetim eksiklerini anında kapat, marka itibarını koru (+2 Tanınırlık).',
          cost: Math.round(scaleCost * 1.15),
          effectSummary: '+2% Tanınırlık · Ceza yok',
          tone: 'positive',
        },
        {
          id: 'absorb_fine',
          label: 'İdari Para Cezasını Kabul Et',
          description: 'Cezayı öde ama kamuoyu algısı -3% tanınırlık kaybı yaşar.',
          cost: Math.round(scaleCost * 0.55),
          effectSummary: '-3% Tanınırlık · Kısmi ödeme',
          tone: 'danger',
        },
      ],
    };
  }

  if (chosenType === 'supplier_hike') {
    return {
      id: `crisis-${currentDay}-supply`,
      type: 'supplier_hike',
      title: 'Ani Tedarikçi Zammı',
      description: `Ana hammadde tedarikçisi maliyet artışı nedeniyle sözleşmeyi yenilemek istiyor. Acil önlem alınmazsa tedarik giderleri şişecek.`,
      targetBusinessId: target.id,
      targetBusinessName: target.customName,
      createdOnDay: currentDay,
      choices: [
        {
          id: 'lock_contract',
          label: 'Peşin Toptan Alım Sözleşmesi',
          description: 'Peşin ödeme ile 10 gün boyunca %12 tedarik indirimi kilitle.',
          cost: Math.round(scaleCost * 1.2),
          effectSummary: '10 gün %12 tedarik indirimi',
          tone: 'positive',
        },
        {
          id: 'accept_hike',
          label: 'Mevcut Tedarikçiyle Devam Et',
          description: 'Nakit çıkışından kaçın ama enflasyon baskısı +3% artar.',
          cost: 0,
          effectSummary: 'Enflasyon endeksi +0.03 artar',
          tone: 'warning',
        },
      ],
    };
  }

  return {
    id: `crisis-${currentDay}-rival`,
    type: 'nearby_rival_opened',
    title: 'Yan Dükkâna Rakip Açıldı',
    description: `${target.customName} şubesinin hemen karşısında agresif fiyatlı yeni bir rakip açıldı. Müşteri kaybını önlemek için hamle yapın.`,
    targetBusinessId: target.id,
    targetBusinessName: target.customName,
    createdOnDay: currentDay,
    choices: [
      {
        id: 'counter_campaign',
        label: 'Karşı Kampanya & Kalite Yatırımı',
        description: 'Bölgesel reklam ve promosyonla müşterileri geri kazan (+3% Tanınırlık).',
        cost: Math.round(scaleCost * 1.1),
        effectSummary: '+3% Tanınırlık · Şube morali +10',
        tone: 'positive',
      },
      {
        id: 'hold_prices',
        label: 'Bekle ve Maliyet Kıs',
        description: 'Bütçe harcama ama hedef şubenin morali ve kondisyonu düşer.',
        cost: 0,
        effectSummary: '-12 Moral · -10 Kondisyon',
        tone: 'danger',
      },
    ],
  };
}

export function resolveOperationalCrisis(
  state: EmpireState,
  choiceId: string,
  currentDay: number
): { state: EmpireState; ok: boolean; error?: string; summary: string } {
  const crisis = state.activeCrisisEvent;
  if (!crisis) return { state, ok: false, error: 'Aktif operasyonel kriz bulunmuyor.', summary: '' };
  const choice = crisis.choices.find((c) => c.id === choiceId);
  if (!choice) return { state, ok: false, error: 'Geçersiz karar seçeneği.', summary: '' };

  if (choice.cost > 0 && state.cash < choice.cost) {
    return {
      state,
      ok: false,
      error: `Bu karar için yeterli nakit yok (Gerekli: ₺${choice.cost.toLocaleString('tr-TR')}).`,
      summary: '',
    };
  }

  let nextCash = state.cash - choice.cost;
  let nextBrand = state.brandRecognition ?? 5;
  let nextInflation = state.inflationIndex ?? 1.0;
  let nextSupplyDiscountUntil = state.supplyDiscountUntilDay ?? 0;
  let nextSupplyDiscountPct = state.supplyDiscountPct ?? 0;
  let nextBusinesses = [...state.businesses];

  if (crisis.type === 'equipment_failure' && crisis.targetBusinessId) {
    nextBusinesses = nextBusinesses.map((b) => {
      if (b.id !== crisis.targetBusinessId) return b;
      const delta = choice.id === 'fast_repair' ? 25 : -20;
      const nextMaint = Math.max(15, Math.min(100, Math.round((b.maintenanceLevel ?? 80) + delta)));
      return {
        ...b,
        maintenanceLevel: nextMaint,
        suspendedForMaintenance: nextMaint < CONDITION_SUSPEND_THRESHOLD,
      };
    });
  } else if (crisis.type === 'tax_health_audit') {
    nextBrand = Math.max(
      1,
      Math.min(100, Number((nextBrand + (choice.id === 'full_compliance' ? 2 : -3)).toFixed(1)))
    );
  } else if (crisis.type === 'supplier_hike') {
    if (choice.id === 'lock_contract') {
      nextSupplyDiscountUntil = Math.max(nextSupplyDiscountUntil, currentDay + 10);
      nextSupplyDiscountPct = Math.max(nextSupplyDiscountPct, 0.12);
    } else {
      nextInflation = Number((nextInflation + 0.03).toFixed(3));
    }
  } else if (crisis.type === 'nearby_rival_opened' && crisis.targetBusinessId) {
    if (choice.id === 'counter_campaign') {
      nextBrand = Math.min(100, Number((nextBrand + 3).toFixed(1)));
      nextBusinesses = nextBusinesses.map((b) =>
        b.id === crisis.targetBusinessId
          ? { ...b, staffMorale: Math.min(100, (b.staffMorale ?? 75) + 10) }
          : b
      );
    } else {
      nextBusinesses = nextBusinesses.map((b) =>
        b.id === crisis.targetBusinessId
          ? {
              ...b,
              staffMorale: Math.max(25, (b.staffMorale ?? 75) - 12),
              maintenanceLevel: Math.max(20, (b.maintenanceLevel ?? 80) - 10),
            }
          : b
      );
    }
  }

  return {
    state: {
      ...state,
      cash: nextCash,
      brandRecognition: nextBrand,
      inflationIndex: nextInflation,
      supplyDiscountUntilDay: nextSupplyDiscountUntil,
      supplyDiscountPct: nextSupplyDiscountPct,
      businesses: nextBusinesses,
      activeCrisisEvent: null,
      lastCrisisDay: currentDay,
    },
    ok: true,
    summary: `${crisis.title} çözüldü: ${choice.label} (${choice.effectSummary}).`,
  };
}

// ── 5. Strict Banking Credit Limit (7-Day Avg Net Profit + Collateral) ──────

export function calculateStrictCreditLimit(
  state: EmpireState,
  collateralValuationOverride = 0
): {
  strictMaxLoan: number;
  sevenDayAvgNetProfit: number;
  propertyCollateralValue: number;
  activeDebt: number;
} {
  const reports = [
    ...(state.dayEndHistory ?? []),
    ...(state.pendingDayEndReports ?? []),
  ].sort((a, b) => b.completedDay - a.completedDay);

  const recent7 = reports.slice(0, 7);
  const sevenDayAvgNetProfit =
    recent7.length > 0
      ? Math.round(
          recent7.reduce((sum, r) => sum + (r.dailyNetCashFlow ?? 0), 0) / recent7.length
        )
      : 0;

  const unpledgedBusinessesValue = (state.businesses ?? [])
    .filter((b) => !b.pledgedLoanId)
    .reduce((sum, b) => sum + Math.round((b.purchaseCost ?? 0) * (1 + (b.level - 1) * 0.45)), 0);

  const ownedRentalsValue = (state.rentalProperties ?? [])
    .filter((r) => r.owned)
    .reduce((sum, r) => sum + (r.purchasePrice ?? 0), 0);

  const propertyCollateralValue = Math.max(
    Math.round(unpledgedBusinessesValue + ownedRentalsValue),
    Math.max(0, Math.round(collateralValuationOverride))
  );

  const activeDebt = (state.activeLoans ?? [])
    .filter((l) => l.status === 'active' || l.status === 'garnishing')
    .reduce((sum, l) => sum + Math.max(0, l.remainingAmount ?? 0), 0);

  // Strict capacity: 18x positive 7-day average net profit + 55% of property collateral - active debt
  const profitCapacity = Math.max(0, sevenDayAvgNetProfit) * 18;
  const collateralCapacity = Math.round(propertyCollateralValue * 0.55);
  const strictMaxLoan = Math.max(0, Math.round(profitCapacity + collateralCapacity - activeDebt));

  return {
    strictMaxLoan,
    sevenDayAvgNetProfit,
    propertyCollateralValue,
    activeDebt,
  };
}

// ── 6. Mega Projects, Board Contracts & IPO / New Market Prestige ───────────

export function getMegaProjectSupplyDiscountBonus(state: EmpireState): number {
  const completedIds = new Set(
    (state.megaProjects ?? []).filter((p) => p.status === 'completed').map((p) => p.projectId)
  );
  let bonus = 0;
  for (const def of MEGA_PROJECT_CATALOG) {
    if (completedIds.has(def.id)) {
      bonus += def.supplyDiscountBonus;
    }
  }
  return Math.min(0.15, bonus);
}

export function getCompletedMegaProjectsDailyIncome(state: EmpireState): number {
  return (state.megaProjects ?? [])
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.dailyNetIncome, 0);
}

export function startMegaProject(
  state: EmpireState,
  projectId: MegaProjectId,
  currentDay: number
): { state: EmpireState; ok: boolean; error?: string; project?: MegaProjectState } {
  const def = MEGA_PROJECT_CATALOG.find((p) => p.id === projectId);
  if (!def) return { state, ok: false, error: 'Mega proje bulunamadı.' };
  const existing = (state.megaProjects ?? []).find((p) => p.projectId === projectId);
  if (existing) {
    return {
      state,
      ok: false,
      error:
        existing.status === 'completed'
          ? 'Bu mega proje zaten tamamlandı.'
          : `Bu proje zaten inşa halinde (${existing.daysRemaining} gün kaldı).`,
    };
  }
  if (state.cash < def.capitalCost) {
    return {
      state,
      ok: false,
      error: `Yetersiz sermaye (Gerekli: ₺${def.capitalCost.toLocaleString('tr-TR')}).`,
    };
  }

  const project: MegaProjectState = {
    projectId: def.id,
    name: def.name,
    status: 'constructing',
    startedOnDay: currentDay,
    totalDays: def.buildDays,
    daysRemaining: def.buildDays,
    capitalInvested: def.capitalCost,
    dailyNetIncome: def.dailyNetIncome,
  };

  return {
    state: {
      ...state,
      cash: state.cash - def.capitalCost,
      megaProjects: [...(state.megaProjects ?? []), project],
    },
    ok: true,
    project,
  };
}

export function ensureBoardContracts(state: EmpireState, currentDay: number): BoardContract[] {
  const existing = (state.boardContracts ?? []).filter(
    (c) => c.status === 'active' || c.status === 'completed'
  );
  if (existing.length >= 3) return existing;

  const existingKinds = new Set(existing.map((c) => c.kind));
  const nextContracts: BoardContract[] = [...existing];
  const scale = Math.max(1, Math.min(20, state.businesses.length || 1));

  const templates: Array<Omit<BoardContract, 'id' | 'startDay' | 'status' | 'currentProgress'>> = [
    {
      kind: 'maintain_profit_margin',
      title: 'Yüksek Kâr Marjı Disiplini',
      description: '10 oyun günü içinde 5 gün boyunca net kâr marjını %25 üzerinde tut.',
      targetValue: 5,
      deadlineDay: currentDay + 10,
      rewardCash: Math.round(450_000 * scale),
      rewardBrand: 4,
      rewardXp: 350,
    },
    {
      kind: 'approve_franchises',
      title: 'Franchise Ağını Genişlet',
      description: '15 oyun günü içinde toplam 3 aktif franchise markası veya şubesi yönet.',
      targetValue: 3,
      deadlineDay: currentDay + 15,
      rewardCash: Math.round(750_000 * scale),
      rewardBrand: 6,
      rewardXp: 500,
    },
    {
      kind: 'keep_high_condition',
      title: 'Kusursuz İşletme Kondisyonu',
      description: '12 oyun günü içinde 5 gün boyunca tüm aktif şubeleri %75+ kondisyonda tut.',
      targetValue: 5,
      deadlineDay: currentDay + 12,
      rewardCash: Math.round(520_000 * scale),
      rewardBrand: 5,
      rewardXp: 400,
    },
    {
      kind: 'grow_daily_revenue',
      title: 'Ciro Büyüme Hedefi',
      description: `14 oyun günü içinde günlük brüt ciroyu ₺${(350_000 * scale).toLocaleString('tr-TR')} üzerine çıkar.`,
      targetValue: 350_000 * scale,
      deadlineDay: currentDay + 14,
      rewardCash: Math.round(680_000 * scale),
      rewardBrand: 5,
      rewardXp: 450,
    },
  ];

  for (const tpl of templates) {
    if (nextContracts.length >= 3) break;
    if (existingKinds.has(tpl.kind)) continue;
    nextContracts.push({
      ...tpl,
      id: `contract-${tpl.kind}-${currentDay}`,
      startDay: currentDay,
      currentProgress: 0,
      status: 'active',
    });
    existingKinds.add(tpl.kind);
  }

  return nextContracts;
}

export function claimBoardContractReward(
  state: EmpireState,
  contractId: string,
  currentDay: number
): { state: EmpireState; ok: boolean; error?: string; rewardCash?: number } {
  const contract = (state.boardContracts ?? []).find((c) => c.id === contractId);
  if (!contract) return { state, ok: false, error: 'Kontrat bulunamadı.' };
  if (contract.status !== 'completed') {
    return { state, ok: false, error: 'Kontrat hedefi henüz tamamlanmadı.' };
  }

  const remaining = (state.boardContracts ?? []).filter((c) => c.id !== contractId);
  const replenished = ensureBoardContracts({ ...state, boardContracts: remaining }, currentDay);

  return {
    state: {
      ...state,
      cash: state.cash + contract.rewardCash,
      totalEarnedLifetime: state.totalEarnedLifetime + contract.rewardCash,
      brandRecognition: Math.min(100, Number(((state.brandRecognition ?? 5) + contract.rewardBrand).toFixed(1))),
      companyXp: (state.companyXp ?? 0) + contract.rewardXp,
      boardContracts: replenished,
    },
    ok: true,
    rewardCash: contract.rewardCash,
  };
}

export function getPrestigeIpoStatus(
  state: EmpireState,
  netWorth: number
): {
  eligible: boolean;
  currentTier: number;
  nextTier: number;
  branchCount: number;
  cityCount: number;
  requiredBranches: number;
  requiredCities: number;
  requiredNetWorth: number;
  nextPermanentBonusPct: number;
  nextTaxSurchargePct: number;
  reasons: string[];
} {
  const currentTier = Math.max(0, state.prestigeMarketTier ?? 0);
  const nextTier = currentTier + 1;
  const requiredBranches = PRESTIGE_IPO_MIN_BRANCHES + currentTier * 2;
  const requiredCities = Math.min(6, PRESTIGE_IPO_MIN_CITIES + currentTier);
  const requiredNetWorth = PRESTIGE_IPO_MIN_NET_WORTH * Math.pow(2, currentTier);

  const branchCount = state.businesses.length;
  const cityCount = new Set(state.businesses.map((b) => b.cityPlate)).size;

  const reasons: string[] = [];
  if (branchCount < requiredBranches) {
    reasons.push(`En az ${requiredBranches} aktif şube gerekli (Mevcut: ${branchCount})`);
  }
  if (cityCount < requiredCities) {
    reasons.push(`En az ${requiredCities} farklı şehirde faaliyet gerekli (Mevcut: ${cityCount})`);
  }
  if (netWorth < requiredNetWorth) {
    reasons.push(
      `Net şirket değeri en az ₺${requiredNetWorth.toLocaleString('tr-TR')} olmalı`
    );
  }

  return {
    eligible: reasons.length === 0,
    currentTier,
    nextTier,
    branchCount,
    cityCount,
    requiredBranches,
    requiredCities,
    requiredNetWorth,
    nextPermanentBonusPct: nextTier * 12,
    nextTaxSurchargePct: nextTier * 2,
    reasons,
  };
}

export function executePrestigeIpoExpansion(
  state: EmpireState,
  netWorth: number
): { state: EmpireState; ok: boolean; error?: string; nextTier?: number; ipoCashBonus?: number } {
  const check = getPrestigeIpoStatus(state, netWorth);
  if (!check.eligible) {
    return { state, ok: false, error: check.reasons[0] ?? 'Halka arz prestij şartları henüz sağlanmadı.' };
  }

  const ipoCashBonus = Math.round(Math.max(5_000_000, netWorth * 0.12));

  return {
    state: {
      ...state,
      cash: state.cash + ipoCashBonus,
      totalEarnedLifetime: state.totalEarnedLifetime + ipoCashBonus,
      prestigeMarketTier: check.nextTier,
      ipoPrestigeCount: (state.ipoPrestigeCount ?? 0) + 1,
      permanentPrestigeBonusPct: check.nextPermanentBonusPct,
      brandRecognition: Math.min(100, Number(((state.brandRecognition ?? 5) + 10).toFixed(1))),
      companyXp: (state.companyXp ?? 0) + 1500 * check.nextTier,
    },
    ok: true,
    nextTier: check.nextTier,
    ipoCashBonus,
  };
}

// ── Daily Midnight Settlement Hook (called inside tickEconomy on daysPassed > 0) ──

export interface HardcoreDailySettlementResult {
  businesses: OwnedBusiness[];
  cashDelta: number;
  dailyCorporateTax: number;
  corporateTaxBracketPct: number;
  dailyHqBureaucracyCost: number;
  dailyLatePenalty: number;
  negativeCashStreakDays: number;
  foreclosedBranchName: string | null;
  foreclosedBranchesCount: number;
  inflationIndex: number;
  lastInflationDay: number;
  inflationWaveTriggered: boolean;
  pendingRaiseRequests: WageRaiseRequest[];
  lastRaiseCheckDay: number;
  newRaiseRequestsCount: number;
  activeCrisisEvent: OperationalCrisisEvent | null;
  lastCrisisDay: number;
  newCrisisTriggered: boolean;
  megaProjects: MegaProjectState[];
  megaProjectIncome: number;
  completedMegaProjectNames: string[];
  boardContracts: BoardContract[];
  brandBonusEarned: number;
}

export function processHardcoreDailySettlement(params: {
  state: EmpireState;
  businesses: OwnedBusiness[];
  projectedCashBeforeHardcore: number;
  daysPassed: number;
  currentDay: number;
  dailyGrossRevenue: number;
  dailyNetBeforeTax: number;
}): HardcoreDailySettlementResult {
  const {
    state,
    daysPassed,
    currentDay,
    dailyGrossRevenue,
    dailyNetBeforeTax,
  } = params;

  const prestigeTier = state.prestigeMarketTier ?? 0;

  // 1. Progressive Corporate Tax & HQ Bureaucracy Overhead
  const taxResult = calculateProgressiveDailyCorporateTax(dailyNetBeforeTax, prestigeTier);
  const dailyCorporateTax = taxResult.taxAmount;
  const dailyHqBureaucracyCost =
    calculateHqBureaucracyDailyCost(params.businesses.length) * daysPassed;

  // 2. Daily Condition Depreciation (2%..4% per day) & <25% Suspension
  // Executive Genel Müdür overseeing the city provides preventive maintenance; all other branches wear 2%..4%/day.
  const gmCities = new Set(
    (state.cityManagers ?? [])
      .filter((m) => m.role === 'genel_mudur' && m.assignedCityPlate !== undefined)
      .map((m) => m.assignedCityPlate as number)
  );
  let nextBusinesses = params.businesses.map((b) => {
    if ((b.constructionDaysRemaining ?? 0) > 0) return b;
    if (gmCities.has(b.cityPlate)) {
      return { ...b, maintenanceLevel: 100, suspendedForMaintenance: false };
    }
    const wear = calculateDailyConditionWear(b) * daysPassed;
    const nextMaint = Number(Math.max(0, (b.maintenanceLevel ?? 100) - wear).toFixed(1));
    const suspended = nextMaint < CONDITION_SUSPEND_THRESHOLD;
    return {
      ...b,
      maintenanceLevel: nextMaint,
      suspendedForMaintenance: suspended,
    };
  });

  // 3. Mega Projects daily build progress & passive net income
  let megaProjectIncome = 0;
  let brandBonusEarned = 0;
  const completedMegaProjectNames: string[] = [];
  const nextMegaProjects: MegaProjectState[] = (state.megaProjects ?? []).map((proj) => {
    if (proj.status === 'completed') {
      megaProjectIncome += proj.dailyNetIncome * daysPassed;
      return proj;
    }
    const nextRem = Math.max(0, proj.daysRemaining - daysPassed);
    if (nextRem === 0) {
      completedMegaProjectNames.push(proj.name);
      const def = MEGA_PROJECT_CATALOG.find((d) => d.id === proj.projectId);
      if (def) brandBonusEarned += def.brandBonus;
      return {
        ...proj,
        status: 'completed' as const,
        daysRemaining: 0,
        completedOnDay: currentDay,
      };
    }
    return {
      ...proj,
      daysRemaining: nextRem,
    };
  });

  // 4. Periodic Inflation every 20 game days
  let inflationIndex = Math.max(1.0, state.inflationIndex ?? 1.0);
  let lastInflationDay = state.lastInflationDay ?? 0;
  let inflationWaveTriggered = false;
  if (currentDay >= INFLATION_INTERVAL_DAYS && currentDay - lastInflationDay >= INFLATION_INTERVAL_DAYS) {
    inflationIndex = Number((inflationIndex * INFLATION_WAVE_MULTIPLIER).toFixed(3));
    lastInflationDay = currentDay;
    inflationWaveTriggered = true;
  }

  // 5. 15-Day Staff Wage Raise Requests
  let pendingRaiseRequests = [...(state.pendingRaiseRequests ?? [])];
  let lastRaiseCheckDay = state.lastRaiseCheckDay ?? 0;
  let newRaiseRequestsCount = 0;
  if (
    currentDay >= RAISE_REQUEST_INTERVAL_DAYS &&
    currentDay - lastRaiseCheckDay >= RAISE_REQUEST_INTERVAL_DAYS &&
    nextBusinesses.some((b) => (b.employees?.length ?? 0) > 0)
  ) {
    const beforeCount = pendingRaiseRequests.length;
    pendingRaiseRequests = generateRaiseRequestsForDay(
      { ...state, businesses: nextBusinesses, inflationIndex, pendingRaiseRequests },
      currentDay
    );
    newRaiseRequestsCount = Math.max(0, pendingRaiseRequests.length - beforeCount);
    lastRaiseCheckDay = currentDay;
  }

  // 6. Random Operational Crisis (only 1 active at a time)
  let activeCrisisEvent = state.activeCrisisEvent ?? null;
  let lastCrisisDay = state.lastCrisisDay ?? 0;
  let newCrisisTriggered = false;
  if (!activeCrisisEvent) {
    const generated = maybeGenerateOperationalCrisis(
      { ...state, businesses: nextBusinesses, lastCrisisDay },
      currentDay
    );
    if (generated) {
      activeCrisisEvent = generated;
      lastCrisisDay = currentDay;
      newCrisisTriggered = true;
    }
  }

  // 7. Negative Cash 5% Daily Late Penalty & 3-Day Automatic Foreclosure
  let cashDelta = megaProjectIncome - dailyCorporateTax - dailyHqBureaucracyCost;
  const cashAfterTaxAndProjects = params.projectedCashBeforeHardcore + cashDelta;
  let dailyLatePenalty = 0;
  let negativeCashStreakDays = state.negativeCashStreakDays ?? 0;
  let foreclosedBranchName: string | null = null;
  let foreclosedBranchesCount = state.foreclosedBranchesCount ?? 0;

  if (cashAfterTaxAndProjects < 0) {
    dailyLatePenalty = Math.max(
      1_000,
      Math.round(Math.abs(cashAfterTaxAndProjects) * NEGATIVE_CASH_DAILY_PENALTY_RATE * daysPassed)
    );
    cashDelta -= dailyLatePenalty;
    negativeCashStreakDays += daysPassed;

    if (negativeCashStreakDays >= FORECLOSURE_STREAK_DAYS && nextBusinesses.length > 0) {
      // Seize & liquidate the lowest-profitability / lowest-level branch
      const sortedByWeakest = [...nextBusinesses].sort((a, b) => {
        const scoreA = (a.totalEarned ?? 0) + a.level * 100_000;
        const scoreB = (b.totalEarned ?? 0) + b.level * 100_000;
        return scoreA - scoreB;
      });
      const seized = sortedByWeakest[0];
      if (seized) {
        foreclosedBranchName = seized.customName;
        const liquidationProceeds = Math.round((seized.purchaseCost ?? 100_000) * 0.55);
        cashDelta += liquidationProceeds;
        nextBusinesses = nextBusinesses.filter((b) => b.id !== seized.id);
        negativeCashStreakDays = 0;
        foreclosedBranchesCount += 1;
      }
    }
  } else {
    negativeCashStreakDays = 0;
  }

  // 8. Board Contracts Progress & Deadline Tracking
  const ensuredContracts = ensureBoardContracts(
    { ...state, businesses: nextBusinesses },
    currentDay
  );
  const netAfterTax = dailyNetBeforeTax - dailyCorporateTax - dailyHqBureaucracyCost;
  const dailyMarginPct = dailyGrossRevenue > 0 ? (netAfterTax / dailyGrossRevenue) * 100 : 0;
  const activeOps = nextBusinesses.filter((b) => (b.constructionDaysRemaining ?? 0) <= 0);
  const allHighCondition =
    activeOps.length > 0 && activeOps.every((b) => (b.maintenanceLevel ?? 100) >= 75);
  const totalFranchiseCount =
    (state.ownFranchises ?? []).reduce((s, f) => s + Math.max(1, f.branchCount), 0) +
    nextBusinesses.filter((b) => Boolean(b.franchiseId)).length;

  const nextBoardContracts: BoardContract[] = ensuredContracts.map((contract) => {
    if (contract.status !== 'active') return contract;
    let progress = contract.currentProgress;

    if (contract.kind === 'maintain_profit_margin') {
      if (dailyMarginPct >= 25) progress += daysPassed;
    } else if (contract.kind === 'approve_franchises') {
      progress = Math.max(progress, totalFranchiseCount);
    } else if (contract.kind === 'keep_high_condition') {
      if (allHighCondition) progress += daysPassed;
    } else if (contract.kind === 'grow_daily_revenue') {
      progress = Math.max(progress, Math.round(dailyGrossRevenue));
    }

    if (progress >= contract.targetValue) {
      return { ...contract, currentProgress: contract.targetValue, status: 'completed' as const };
    }
    if (currentDay > contract.deadlineDay) {
      return { ...contract, currentProgress: progress, status: 'failed' as const };
    }
    return { ...contract, currentProgress: progress };
  });

  // Replace failed contracts automatically with fresh ones
  const refreshedContracts = ensureBoardContracts(
    { ...state, businesses: nextBusinesses, boardContracts: nextBoardContracts },
    currentDay
  );

  return {
    businesses: nextBusinesses,
    cashDelta,
    dailyCorporateTax,
    corporateTaxBracketPct: taxResult.bracketPct,
    dailyHqBureaucracyCost,
    dailyLatePenalty,
    negativeCashStreakDays,
    foreclosedBranchName,
    foreclosedBranchesCount,
    inflationIndex,
    lastInflationDay,
    inflationWaveTriggered,
    pendingRaiseRequests,
    lastRaiseCheckDay,
    newRaiseRequestsCount,
    activeCrisisEvent,
    lastCrisisDay,
    newCrisisTriggered,
    megaProjects: nextMegaProjects,
    megaProjectIncome,
    completedMegaProjectNames,
    boardContracts: refreshedContracts,
    brandBonusEarned,
  };
}
