import type {
  AutomationStatus,
  BranchStaffSlots,
  BusinessTypeId,
  EmpireState,
  HiredStaff,
  OwnedBusiness,
  StaffCandidate,
  StaffRole,
} from '../types/game';
import { hasChainBrandInCity } from './strategyEngine';
import { canOfficeHireRole } from './officeEngine';

export const MAX_BRANCH_WORKERS = 4;
export const MAX_BRANCH_ASSISTANT_MANAGERS = 1;
export const MAX_BRANCH_MANAGERS = 1;
export const MAX_BRANCH_TOTAL_SLOTS =
  MAX_BRANCH_WORKERS + MAX_BRANCH_ASSISTANT_MANAGERS + MAX_BRANCH_MANAGERS; // 6 slot

export const BRANCH_LIMIT_ERROR_TEXT = 'Bu şubede azami çalışan/müdür sınırına ulaşıldı!';

// v1.4.0 Türkiye Güncel Asgari Ücret & İşveren SGK Maliyet Tabanı (2025/2026)
export const TURKEY_MIN_WAGE_MONTHLY_NET = 22_104;
export const TURKEY_MIN_WAGE_MONTHLY_GROSS = 26_005;
export const TURKEY_MIN_WAGE_DAILY_GROSS = Math.round(TURKEY_MIN_WAGE_MONTHLY_GROSS / 30); // ₺867/gün brüt yevmiye
export const TURKEY_EMPLOYER_SGK_RATE = 0.225; // %20.5 SGK İşveren + %2 İşsizlik = %22.5

export const ROLE_WAGE_MULTIPLIER: Record<StaffRole, number> = {
  calisan: 1.0, // Standart asgari ücret tabanı
  mudur_yardimcisi: 1.4, // %40 daha yüksek
  sube_muduru: 1.9, // %90 daha yüksek
  bolge_sorumlusu: 2.8, // Bölge yöneticisi
  genel_mudur: 4.2, // Genel Müdürlük / İl Koordinatörü
};

const STAR_WAGE_STEP: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1.0,
  2: 1.08,
  3: 1.16,
  4: 1.25,
  5: 1.35,
};

export interface StaffDailyWageBreakdown {
  dailyGrossWage: number;
  dailyEmployerSgk: number;
  dailyTotalCost: number;
  hourlyTotalCost: number;
  monthlyGrossSalary: number;
  monthlyTotalCost: number;
}

export function calculateRoleWageBreakdown(
  role: StaffRole,
  stars: 1 | 2 | 3 | 4 | 5
): StaffDailyWageBreakdown {
  const dailyGrossWage = Math.round(
    TURKEY_MIN_WAGE_DAILY_GROSS * ROLE_WAGE_MULTIPLIER[role] * STAR_WAGE_STEP[stars]
  );
  const dailyEmployerSgk = Math.round(dailyGrossWage * TURKEY_EMPLOYER_SGK_RATE);
  const dailyTotalCost = dailyGrossWage + dailyEmployerSgk;
  const hourlyTotalCost = Math.max(1, Math.round(dailyTotalCost / 24));
  return {
    dailyGrossWage,
    dailyEmployerSgk,
    dailyTotalCost,
    hourlyTotalCost,
    monthlyGrossSalary: dailyGrossWage * 30,
    monthlyTotalCost: dailyTotalCost * 30,
  };
}

export function getStaffDailyCost(
  staff: Pick<StaffCandidate, 'role' | 'stars' | 'dailyWage' | 'dailyEmployerSgk' | 'hourlySalary'>
): StaffDailyWageBreakdown {
  if (typeof staff.dailyWage === 'number' && staff.dailyWage > 0) {
    const dailyGrossWage = Math.round(staff.dailyWage);
    const dailyEmployerSgk =
      typeof staff.dailyEmployerSgk === 'number'
        ? Math.round(staff.dailyEmployerSgk)
        : Math.round(dailyGrossWage * TURKEY_EMPLOYER_SGK_RATE);
    const dailyTotalCost = dailyGrossWage + dailyEmployerSgk;
    return {
      dailyGrossWage,
      dailyEmployerSgk,
      dailyTotalCost,
      hourlyTotalCost: Math.max(1, Math.round(dailyTotalCost / 24)),
      monthlyGrossSalary: dailyGrossWage * 30,
      monthlyTotalCost: dailyTotalCost * 30,
    };
  }
  return calculateRoleWageBreakdown(staff.role, staff.stars);
}

export const ROLE_META: Record<
  StaffRole,
  {
    label: string;
    shortLabel: string;
    scope: 'branch' | 'city';
    description: string;
    baseHourlySalary: number;
    baseHireCost: number;
  }
> = {
  calisan: {
    label: 'Çalışan',
    shortLabel: 'Çalışan',
    scope: 'branch',
    description:
      'Türkiye asgari ücret tabanıyla çalışır; hız ve kapasiteyi artırır (Şube başına en fazla 4 çalışan).',
    baseHourlySalary: calculateRoleWageBreakdown('calisan', 1).hourlyTotalCost,
    baseHireCost: 4_000,
  },
  mudur_yardimcisi: {
    label: 'Müdür Yardımcısı',
    shortLabel: 'Müd. Yrd.',
    scope: 'branch',
    description:
      'Taban ücretten %40 yüksek maaşla otomatik stok takibi yapar (Şube başına en fazla 1 adet).',
    baseHourlySalary: calculateRoleWageBreakdown('mudur_yardimcisi', 1).hourlyTotalCost,
    baseHireCost: 26_000,
  },
  sube_muduru: {
    label: 'Şube Müdürü',
    shortLabel: 'Şube Müd.',
    scope: 'branch',
    description:
      'Taban ücretten %90 yüksek maaşla atandığı şubede tam otomasyon ve 00:00 otomatik gün sonu tahsilatı sağlar.',
    baseHourlySalary: calculateRoleWageBreakdown('sube_muduru', 1).hourlyTotalCost,
    baseHireCost: 65_000,
  },
  bolge_sorumlusu: {
    label: 'Bölge Sorumlusu',
    shortLabel: 'Bölge Sor.',
    scope: 'city',
    description:
      'Çok şubeli şehirlerde 4 şubeye kadar tam otomasyon, %15 tedarik indirimi ve otomatik tahsilat sağlar (Min. 2 şube).',
    baseHourlySalary: calculateRoleWageBreakdown('bolge_sorumlusu', 1).hourlyTotalCost,
    baseHireCost: 195_000,
  },
  genel_mudur: {
    label: 'Genel Müdür (İl Koordinatörü)',
    shortLabel: 'Genel Müdür',
    scope: 'city',
    description:
      'Şehirdeki tüm zincir şubelerde ortak tam otomasyon, +%20 verimlilik, otomatik tahsilat ve Otomatik Reklam Yönetimi sağlar.',
    baseHourlySalary: calculateRoleWageBreakdown('genel_mudur', 1).hourlyTotalCost,
    baseHireCost: 560_000,
  },
};

const ROLE_STAR_HIRE_COST: Record<StaffRole, Record<1 | 2 | 3 | 4 | 5, number>> = {
  calisan: { 1: 4_000, 2: 9_000, 3: 15_000, 4: 24_000, 5: 36_000 },
  mudur_yardimcisi: { 1: 26_000, 2: 33_000, 3: 41_000, 4: 49_000, 5: 58_000 },
  sube_muduru: { 1: 65_000, 2: 80_000, 3: 102_000, 4: 128_000, 5: 160_000 },
  bolge_sorumlusu: { 1: 165_000, 2: 195_000, 3: 235_000, 4: 300_000, 5: 390_000 },
  genel_mudur: { 1: 440_000, 2: 510_000, 3: 590_000, 4: 740_000, 5: 920_000 },
};

export function getBranchStaffSlots(business: OwnedBusiness): BranchStaffSlots {
  const employees = business.employees ?? [];
  const typedWorkers = employees.filter((e) => e.role === 'calisan').length;
  const assistantManagers = employees.filter((e) => e.role === 'mudur_yardimcisi').length;
  const branchManagers = employees.filter((e) => e.role === 'sube_muduru').length;
  // Support legacy businesses where staffCount existed before detailed employee records
  const workers =
    employees.length === 0 && business.staffCount > 0
      ? Math.min(MAX_BRANCH_WORKERS, business.staffCount)
      : typedWorkers;

  return {
    workers,
    maxWorkers: MAX_BRANCH_WORKERS,
    assistantManagers,
    maxAssistantManagers: MAX_BRANCH_ASSISTANT_MANAGERS,
    branchManagers,
    maxBranchManagers: MAX_BRANCH_MANAGERS,
  };
}

export function getBranchTotalStaffCount(business: OwnedBusiness): number {
  const slots = getBranchStaffSlots(business);
  return slots.workers + slots.assistantManagers + slots.branchManagers;
}

export function checkBranchRoleSlotAvailable(
  business: OwnedBusiness,
  role: StaffRole
): { ok: boolean; current: number; max: number; error?: string } {
  const slots = getBranchStaffSlots(business);
  if (role === 'calisan') {
    if (slots.workers >= slots.maxWorkers) {
      return {
        ok: false,
        current: slots.workers,
        max: slots.maxWorkers,
        error: `${BRANCH_LIMIT_ERROR_TEXT} (${slots.workers}/${slots.maxWorkers} Çalışan)`,
      };
    }
    return { ok: true, current: slots.workers, max: slots.maxWorkers };
  }
  if (role === 'mudur_yardimcisi') {
    if (slots.assistantManagers >= slots.maxAssistantManagers) {
      return {
        ok: false,
        current: slots.assistantManagers,
        max: slots.maxAssistantManagers,
        error: `${BRANCH_LIMIT_ERROR_TEXT} (${slots.assistantManagers}/${slots.maxAssistantManagers} Müdür Yrd.)`,
      };
    }
    return { ok: true, current: slots.assistantManagers, max: slots.maxAssistantManagers };
  }
  if (role === 'sube_muduru') {
    if (slots.branchManagers >= slots.maxBranchManagers) {
      return {
        ok: false,
        current: slots.branchManagers,
        max: slots.maxBranchManagers,
        error: `${BRANCH_LIMIT_ERROR_TEXT} (${slots.branchManagers}/${slots.maxBranchManagers} Şube Müdürü)`,
      };
    }
    return { ok: true, current: slots.branchManagers, max: slots.maxBranchManagers };
  }
  return { ok: true, current: 0, max: 1 };
}

export function formatCandidateSalaryLabel(
  candidate: Pick<StaffCandidate, 'role' | 'stars' | 'dailyWage' | 'dailyEmployerSgk' | 'hourlySalary'>
): string {
  if (candidate.role === 'calisan' && candidate.stars <= 2) {
    return 'Asgari Ücret';
  }
  const wage = getStaffDailyCost(candidate);
  const roundedMonthly = Math.round(wage.monthlyGrossSalary / 500) * 500;
  return `₺${roundedMonthly.toLocaleString('tr-TR')}/ay`;
}

export const STAR_EFFICIENCY_MULTIPLIER: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1.06,
  2: 1.12,
  3: 1.22,
  4: 1.36,
  5: 1.55,
};

export const SECTOR_WORKER_TITLE: Record<BusinessTypeId, string> = {
  kafe: 'Barista',
  internet_kafe: 'Sistem Teknisyeni',
  ps_salonu: 'Salon Görevlisi',
  oyun_merkezi: 'VR Operatörü',
  restoran: 'Aşçı / Garson',
  supermarket: 'Kasiyer / Reyoncu',
  otel: 'Resepsiyonist',
  avm: 'AVM Danışmanı',
  otopark: 'Vale / Görevli',
  katli_otopark: 'Otopark Teknisyeni',
  gida_fabrikasi: 'Üretim İşçisi',
  elektronik_fabrikasi: 'Montaj Teknisyeni',
  tekstil_fabrikasi: 'Tekstil Ustası',
  enerji_santrali: 'Enerji Mühendisi',
};

const FIRST_NAMES = [
  'Ahmet',
  'Zeynep',
  'Mehmet',
  'Elif',
  'Can',
  'Selin',
  'Emre',
  'Deniz',
  'Burak',
  'Merve',
  'Kerem',
  'Ayşe',
  'Oğuz',
  'Buse',
  'Hakan',
  'Ceren',
  'Tolga',
  'İrem',
  'Murat',
  'Derya',
];

const LAST_NAMES = [
  'Yılmaz',
  'Kaya',
  'Demir',
  'Şahin',
  'Çelik',
  'Yıldız',
  'Aydın',
  'Öztürk',
  'Arslan',
  'Doğan',
  'Kılıç',
  'Aslan',
  'Çetin',
  'Kara',
  'Koç',
  'Kurt',
  'Özkan',
  'Şimşek',
];

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateCandidatePool(
  seed = Date.now(),
  sectorHint: BusinessTypeId = 'kafe'
): StaffCandidate[] {
  const rand = seededRand(Math.floor(seed));
  const roles: StaffRole[] = [
    'calisan',
    'calisan',
    'calisan',
    'mudur_yardimcisi',
    'mudur_yardimcisi',
    'sube_muduru',
    'sube_muduru',
    'bolge_sorumlusu',
    'genel_mudur',
  ];

  return roles.map((role, idx) => {
    const r = rand();
    let stars: 1 | 2 | 3 | 4 | 5 = 2;
    if (role === 'genel_mudur') {
      stars = r > 0.55 ? 5 : r > 0.2 ? 4 : 3;
    } else if (role === 'bolge_sorumlusu') {
      stars = r > 0.65 ? 5 : r > 0.3 ? 4 : 3;
    } else if (role === 'sube_muduru') {
      stars = r > 0.78 ? 5 : r > 0.45 ? 4 : r > 0.15 ? 3 : 2;
    } else if (role === 'calisan' && idx === 0) {
      // Guarantee an affordable starter 1-2 star worker in every pool (₺3.000 - ₺12.000)
      stars = r > 0.45 ? 2 : 1;
    } else {
      stars = r > 0.86 ? 5 : r > 0.64 ? 4 : r > 0.36 ? 3 : r > 0.14 ? 2 : 1;
    }

    const baseStat = 32 + stars * 12;
    const jitter = () => Math.min(99, Math.max(20, Math.round(baseStat + (rand() - 0.4) * 18)));
    const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
    const meta = ROLE_META[role];
    const wage = calculateRoleWageBreakdown(role, stars);
    const hireCost = ROLE_STAR_HIRE_COST[role][stars];

    const roleTitle = role === 'calisan' ? SECTOR_WORKER_TITLE[sectorHint] : meta.label;

    return {
      id: `cand-${seed}-${idx}-${Math.floor(rand() * 10000)}`,
      name: `${first} ${last}`,
      role,
      roleTitle,
      stars,
      speed: jitter(),
      efficiency: jitter(),
      leadership: role === 'calisan' ? Math.max(20, jitter() - 15) : Math.min(99, jitter() + 8),
      hourlySalary: wage.hourlyTotalCost,
      dailyWage: wage.dailyGrossWage,
      dailyEmployerSgk: wage.dailyEmployerSgk,
      monthlyGrossSalary: wage.monthlyGrossSalary,
      hireCost,
    };
  });
}

/**
 * Resolves the active automation tier for a given business considering:
 * 1) City-level Genel Müdür (covers ALL branches in that city +20% efficiency)
 * 2) City-level Bölge Sorumlusu (covers up to 4 branches in that city +15% bulk supply discount)
 * 3) Branch-level Şube Müdürü (full operational automation)
 * 4) Branch-level Müdür Yardımcısı (automatic stock & supply ordering)
 */
export function resolveBusinessAutomation(
  business: OwnedBusiness,
  cityManagers: HiredStaff[],
  allOwnBusinesses: OwnedBusiness[]
): AutomationStatus {
  const gm = cityManagers.find(
    (m) => m.role === 'genel_mudur' && m.assignedCityPlate === business.cityPlate
  );
  if (gm) {
    return {
      autoStock: true,
      autoMaintenance: true,
      fullAutomation: true,
      autoCollectRevenue: true,
      autoAdsActive: Boolean(gm.autoAdsEnabled),
      bulkSupplyDiscount: 0.2,
      efficiencyBonus: 0.2, // Exact +20% corporate efficiency bonus in city
      managerLabel: `Genel Müdür · ${gm.name} (${gm.stars}★)`,
      managerRole: 'genel_mudur',
    };
  }

  // Check Bölge Sorumlusu (each covers up to 4 branches in that city)
  const regionalManagers = cityManagers.filter(
    (m) => m.role === 'bolge_sorumlusu' && m.assignedCityPlate === business.cityPlate
  );
  if (regionalManagers.length > 0) {
    const cityBranches = allOwnBusinesses.filter((b) => b.cityPlate === business.cityPlate);
    const branchIndex = cityBranches.findIndex((b) => b.id === business.id);
    const maxCovered = regionalManagers.length * 4;
    if (branchIndex >= 0 && branchIndex < maxCovered) {
      const rm = regionalManagers[Math.floor(branchIndex / 4)];
      return {
        autoStock: true,
        autoMaintenance: true,
        fullAutomation: true,
        autoCollectRevenue: true,
        bulkSupplyDiscount: 0.15,
        efficiencyBonus: 0.08 + rm.stars * 0.02,
        managerLabel: `Bölge Sorumlusu · ${rm.name} (${rm.stars}★)`,
        managerRole: 'bolge_sorumlusu',
      };
    }
  }

  const branchManager = (business.employees ?? []).find((e) => e.role === 'sube_muduru');
  if (branchManager) {
    return {
      autoStock: true,
      autoMaintenance: true,
      fullAutomation: true,
      autoCollectRevenue: true, // Şube Müdürü tam otomasyon: otomatik stok, bakım ve saatlik otomatik hasılat toplama!
      bulkSupplyDiscount: 0.05,
      efficiencyBonus: 0.06 + branchManager.stars * 0.02,
      managerLabel: `Şube Müdürü · ${branchManager.name} (${branchManager.stars}★)`,
      managerRole: 'sube_muduru',
    };
  }

  const assistantManager = (business.employees ?? []).find((e) => e.role === 'mudur_yardimcisi');
  if (assistantManager) {
    return {
      autoStock: true,
      autoMaintenance: false,
      fullAutomation: false,
      autoCollectRevenue: false,
      bulkSupplyDiscount: 0.03,
      efficiencyBonus: 0.03 + assistantManager.stars * 0.01,
      managerLabel: `Müdür Yrd. · ${assistantManager.name} (${assistantManager.stars}★)`,
      managerRole: 'mudur_yardimcisi',
    };
  }

  return {
    autoStock: false,
    autoMaintenance: false,
    fullAutomation: false,
    autoCollectRevenue: false,
    bulkSupplyDiscount: 0,
    efficiencyBonus: 0,
    managerLabel: null,
    managerRole: null,
  };
}

/**
 * Computes combined staff quality multiplier for a business (employees + management).
 */
export function calculateStaffQualityMultiplier(
  business: OwnedBusiness,
  automation: AutomationStatus
): number {
  const employees = business.employees ?? [];
  let employeeBonus = 0;

  if (employees.length > 0) {
    for (const emp of employees) {
      const starMult = STAR_EFFICIENCY_MULTIPLIER[emp.stars] ?? 1.06;
      const starBoost = starMult - 1;
      const speedVal = Number.isFinite(emp.speed) ? emp.speed : 70;
      const effVal = Number.isFinite(emp.efficiency) ? emp.efficiency : 70;
      const skillBonus = ((speedVal + effVal) / 200) * 0.12;
      employeeBonus += starBoost + skillBonus;
    }
  } else {
    // Fallback for legacy staffCount without detailed employee records
    employeeBonus = (Number.isFinite(business.staffCount) ? business.staffCount : 0) * 0.14;
  }

  // Operational efficiency drops when stock or maintenance is low!
  const stockFactor = 0.55 + 0.45 * (Math.max(0, Math.min(100, business.stockLevel ?? 100)) / 100);
  const maintFactor =
    0.6 + 0.4 * (Math.max(0, Math.min(100, business.maintenanceLevel ?? 100)) / 100);
  const opsFactor = stockFactor * maintFactor;

  return (1 + employeeBonus + automation.efficiencyBonus) * opsFactor;
}

export function calculateTotalDailyPayrollBreakdown(state: EmpireState): {
  dailyGrossWages: number;
  dailyEmployerSgk: number;
  dailyTotalCost: number;
} {
  let dailyGrossWages = 0;
  let dailyEmployerSgk = 0;
  for (const b of state.businesses) {
    for (const e of b.employees ?? []) {
      const w = getStaffDailyCost(e);
      dailyGrossWages += w.dailyGrossWage;
      dailyEmployerSgk += w.dailyEmployerSgk;
    }
  }
  for (const m of state.cityManagers ?? []) {
    const w = getStaffDailyCost(m);
    dailyGrossWages += w.dailyGrossWage;
    dailyEmployerSgk += w.dailyEmployerSgk;
  }
  return {
    dailyGrossWages,
    dailyEmployerSgk,
    dailyTotalCost: dailyGrossWages + dailyEmployerSgk,
  };
}

export function calculateTotalHourlyPayroll(state: EmpireState): number {
  const daily = calculateTotalDailyPayrollBreakdown(state);
  return Math.round(daily.dailyTotalCost / 24);
}

export interface HrActionResult {
  state: EmpireState;
  ok: boolean;
  error?: string;
}

export function refreshCandidatePool(state: EmpireState, sectorHint: BusinessTypeId = 'kafe', now = Date.now()): HrActionResult {
  const refreshFee = 2_500;
  if (state.cash < refreshFee) {
    return { state, ok: false, error: 'Aday havuzunu yenilemek için ₺2.500 gereklidir.' };
  }
  return {
    ok: true,
    state: {
      ...state,
      cash: state.cash - refreshFee,
      candidatePool: generateCandidatePool(now + Math.floor(Math.random() * 9999), sectorHint),
      lastSavedAt: now,
    },
  };
}

export function hireCandidateFromPool(
  state: EmpireState,
  candidateId: string,
  targetBusinessId: string | null,
  targetCityPlate: number,
  now = Date.now()
): HrActionResult {
  const candidate = (state.candidatePool ?? []).find((c) => c.id === candidateId);
  if (!candidate) {
    return { state, ok: false, error: 'Aday havuzunda bulunamadı.' };
  }
  if (state.cash < candidate.hireCost) {
    return { state, ok: false, error: 'İşe alım ücreti için yetersiz bakiye.' };
  }

  const meta = ROLE_META[candidate.role];

  if (meta.scope === 'city') {
    const officeCheck = canOfficeHireRole(state, candidate.role);
    if (!officeCheck.allowed) {
      return {
        state,
        ok: false,
        error: `${meta.label} adaylarını çekebilmek için Ofisim bölümünden en az "${officeCheck.requiredTierName}" seviyesine yükselmelisiniz.`,
      };
    }
    const cityBranches = state.businesses.filter((b) => b.cityPlate === targetCityPlate);
    const hasChainHere = hasChainBrandInCity(state.businesses, targetCityPlate);
    if (candidate.role === 'bolge_sorumlusu' && cityBranches.length < 2 && !hasChainHere) {
      return {
        state,
        ok: false,
        error: 'Bölge Sorumlusu yalnızca bu şehirde en az 2 şubeniz veya aktif bir Zincir Markanız olduğunda atanabilir.',
      };
    }
    if (candidate.role === 'genel_mudur' && cityBranches.length < 2 && !hasChainHere) {
      return {
        state,
        ok: false,
        error: 'Genel Müdür yalnızca bu şehirde en az 2 şubeniz veya aktif bir Zincir Markanız olduğunda atanabilir.',
      };
    }
    if (
      candidate.role === 'genel_mudur' &&
      (state.cityManagers ?? []).some(
        (m) => m.role === 'genel_mudur' && m.assignedCityPlate === targetCityPlate
      )
    ) {
      return {
        state,
        ok: false,
        error: 'Bu şehirde zaten bir Genel Müdür (İl Koordinatörü) görev yapıyor.',
      };
    }

    const hiredExec: HiredStaff = {
      ...candidate,
      hiredAt: now,
      assignedCityPlate: targetCityPlate,
      autoAdsEnabled: candidate.role === 'genel_mudur' ? false : undefined,
      coveredBusinessIds:
        candidate.role === 'bolge_sorumlusu'
          ? cityBranches.slice(0, 4).map((b) => b.id)
          : cityBranches.map((b) => b.id),
    };

    // Hiring Genel Müdür optionally saves individual manager overhead in that city (removes redundant branch/regional managers in that city? Let's keep existing employees or let player dismiss, and note cost elimination)
    const remainingManagers =
      candidate.role === 'genel_mudur'
        ? (state.cityManagers ?? []).filter(
            (m) => !(m.role === 'bolge_sorumlusu' && m.assignedCityPlate === targetCityPlate)
          )
        : state.cityManagers ?? [];

    const nextPool = state.candidatePool.filter((c) => c.id !== candidateId);

    return {
      ok: true,
      state: {
        ...state,
        cash: state.cash - candidate.hireCost,
        cityManagers: [hiredExec, ...remainingManagers],
        candidatePool:
          nextPool.length < 4 ? [...nextPool, ...generateCandidatePool(now + 77).slice(0, 5)] : nextPool,
        lastSavedAt: now,
      },
    };
  }

  // Branch-level hire with strict slot enforcement (4 Çalışan, 1 Müd. Yrd., 1 Şube Müdürü)
  const biz = state.businesses.find((b) => b.id === targetBusinessId);
  if (!biz) {
    return { state, ok: false, error: 'Atama yapılacak işletme seçilmedi.' };
  }
  const slotCheck = checkBranchRoleSlotAvailable(biz, candidate.role);
  if (!slotCheck.ok) {
    return {
      state,
      ok: false,
      error: slotCheck.error ?? BRANCH_LIMIT_ERROR_TEXT,
    };
  }

  const roleTitle =
    candidate.role === 'calisan' ? SECTOR_WORKER_TITLE[biz.blueprintId] : candidate.roleTitle;

  const hired: HiredStaff = {
    ...candidate,
    roleTitle,
    hiredAt: now,
    assignedBusinessId: biz.id,
  };

  const nextPool = state.candidatePool.filter((c) => c.id !== candidateId);

  return {
    ok: true,
    state: {
      ...state,
      cash: state.cash - candidate.hireCost,
      businesses: state.businesses.map((b) =>
        b.id === biz.id
          ? {
              ...b,
              employees: [...(b.employees ?? []), hired],
              staffCount: b.staffCount + 1,
            }
          : b
      ),
      candidatePool:
        nextPool.length < 4
          ? [...nextPool, ...generateCandidatePool(now + 131, biz.blueprintId).slice(0, 5)]
          : nextPool,
      lastSavedAt: now,
    },
  };
}

export function dismissStaffMember(
  state: EmpireState,
  staffId: string,
  businessId?: string,
  now = Date.now()
): HrActionResult {
  if (!businessId) {
    return {
      ok: true,
      state: {
        ...state,
        cityManagers: (state.cityManagers ?? []).filter((m) => m.id !== staffId),
        lastSavedAt: now,
      },
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      businesses: state.businesses.map((b) => {
        if (b.id !== businessId) return b;
        const filtered = (b.employees ?? []).filter((e) => e.id !== staffId);
        return {
          ...b,
          employees: filtered,
          staffCount: Math.max(0, filtered.length),
        };
      }),
      lastSavedAt: now,
    },
  };
}

export function assignFirstCandidateForRole(
  state: EmpireState,
  businessId: string,
  role: 'calisan' | 'mudur_yardimcisi' | 'sube_muduru',
  now = Date.now()
): HrActionResult {
  const biz = state.businesses.find((b) => b.id === businessId);
  if (!biz) {
    return { state, ok: false, error: 'Atama yapılacak işletme seçilmedi.' };
  }
  const slotCheck = checkBranchRoleSlotAvailable(biz, role);
  if (!slotCheck.ok) {
    return {
      state,
      ok: false,
      error: slotCheck.error ?? BRANCH_LIMIT_ERROR_TEXT,
    };
  }
  const matching = (state.candidatePool ?? [])
    .filter((c) => c.role === role)
    .sort((a, b) => a.hireCost - b.hireCost);
  if (matching.length === 0) {
    return {
      state,
      ok: false,
      error: `Havuzda uygun ${ROLE_META[role].label} adayı yok. "HAVUZU YENİLE" ile yeni aday çekin.`,
    };
  }
  const affordable = matching.find((c) => state.cash >= c.hireCost) ?? matching[0];
  return hireCandidateFromPool(state, affordable.id, biz.id, biz.cityPlate, now);
}

export function getPromotionInfo(role: StaffRole): {
  nextRole: 'mudur_yardimcisi' | 'sube_muduru' | null;
  cost: number;
  label: string;
} {
  if (role === 'calisan') {
    return { nextRole: 'mudur_yardimcisi', cost: 18_000, label: 'Müdür Yrd. Terfi' };
  }
  if (role === 'mudur_yardimcisi') {
    return { nextRole: 'sube_muduru', cost: 38_000, label: 'Şube Müd. Terfi' };
  }
  return { nextRole: null, cost: 0, label: 'En Üst Şube Rolü' };
}

export function promoteBranchEmployee(
  state: EmpireState,
  businessId: string,
  staffId: string,
  now = Date.now()
): HrActionResult {
  const biz = state.businesses.find((b) => b.id === businessId);
  if (!biz) {
    return { state, ok: false, error: 'İşletme bulunamadı.' };
  }
  const target = (biz.employees ?? []).find((e) => e.id === staffId);
  if (!target) {
    return { state, ok: false, error: 'Personel bulunamadı.' };
  }
  const promo = getPromotionInfo(target.role);
  if (!promo.nextRole) {
    return { state, ok: false, error: 'Bu personel şube içi en yüksek kademededir.' };
  }
  const slotCheck = checkBranchRoleSlotAvailable(biz, promo.nextRole);
  if (!slotCheck.ok) {
    return {
      state,
      ok: false,
      error: slotCheck.error ?? BRANCH_LIMIT_ERROR_TEXT,
    };
  }
  if (state.cash < promo.cost) {
    return {
      state,
      ok: false,
      error: `Terfi eğitimi için ₺${promo.cost.toLocaleString('tr-TR')} gereklidir.`,
    };
  }

  const nextStars = Math.min(5, target.stars + 1) as 1 | 2 | 3 | 4 | 5;
  const nextWage = calculateRoleWageBreakdown(promo.nextRole, nextStars);

  return {
    ok: true,
    state: {
      ...state,
      cash: state.cash - promo.cost,
      businesses: state.businesses.map((b) =>
        b.id === businessId
          ? {
              ...b,
              employees: (b.employees ?? []).map((emp) =>
                emp.id === staffId
                  ? {
                      ...emp,
                      role: promo.nextRole!,
                      roleTitle: ROLE_META[promo.nextRole!].label,
                      stars: nextStars,
                      speed: Math.min(99, emp.speed + 6),
                      efficiency: Math.min(99, emp.efficiency + 8),
                      leadership: Math.min(99, emp.leadership + 12),
                      hourlySalary: nextWage.hourlyTotalCost,
                      dailyWage: nextWage.dailyGrossWage,
                      dailyEmployerSgk: nextWage.dailyEmployerSgk,
                      monthlyGrossSalary: nextWage.monthlyGrossSalary,
                    }
                  : emp
              ),
            }
          : b
      ),
      lastSavedAt: now,
    },
  };
}

export function restockAndMaintainBusiness(
  state: EmpireState,
  businessId: string,
  discountRate = 0,
  now = Date.now()
): HrActionResult {
  const biz = state.businesses.find((b) => b.id === businessId);
  if (!biz) return { state, ok: false, error: 'İşletme bulunamadı.' };

  const missingStock = Math.max(0, 100 - (biz.stockLevel ?? 100));
  const missingMaint = Math.max(0, 100 - (biz.maintenanceLevel ?? 100));
  if (missingStock < 1 && missingMaint < 1) {
    return { state, ok: false, error: 'Stok ve bakım zaten %100 dolu.' };
  }

  const baseCost = Math.round(((missingStock + missingMaint) * 65 * biz.level) * (1 - discountRate));
  const cost = Math.max(500, baseCost);
  if (state.cash < cost) {
    return { state, ok: false, error: 'Tedarik ve bakım için yetersiz bakiye.' };
  }

  return {
    ok: true,
    state: {
      ...state,
      cash: state.cash - cost,
      businesses: state.businesses.map((b) =>
        b.id === businessId ? { ...b, stockLevel: 100, maintenanceLevel: 100 } : b
      ),
      lastSavedAt: now,
    },
  };
}
