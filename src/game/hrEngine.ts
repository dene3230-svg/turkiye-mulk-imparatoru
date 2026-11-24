import type {
  AutomationStatus,
  BusinessTypeId,
  EmpireState,
  HiredStaff,
  OwnedBusiness,
  StaffCandidate,
  StaffRole,
} from '../types/game';
import { getBlueprintById } from './catalog';

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
    description: 'Müşterilere hizmet verir; yıldız seviyesine göre hız ve kapasiteyi artırır.',
    baseHourlySalary: 350,
    baseHireCost: 9_000,
  },
  mudur_yardimcisi: {
    label: 'Müdür Yardımcısı',
    shortLabel: 'Müd. Yrd.',
    scope: 'branch',
    description: 'Atandığı şubede Otomatik Stok ve Tedarik yetkisine sahip olur.',
    baseHourlySalary: 850,
    baseHireCost: 28_000,
  },
  sube_muduru: {
    label: 'Şube Müdürü',
    shortLabel: 'Şube Müd.',
    scope: 'branch',
    description: 'Atandığı şubede Tam Operasyonel Otomasyon (stok, bakım, vardiya) sağlar.',
    baseHourlySalary: 1_650,
    baseHireCost: 65_000,
  },
  bolge_sorumlusu: {
    label: 'Bölge Sorumlusu',
    shortLabel: 'Bölge Sor.',
    scope: 'city',
    description:
      'Aynı şehirde 4 şubeye kadar tam otomasyon, %15 tedarik indirimi ve saatlik Otomatik Hasılat Toplama sağlar.',
    baseHourlySalary: 3_900,
    baseHireCost: 195_000,
  },
  genel_mudur: {
    label: 'Genel Müdür (İl Koordinatörü)',
    shortLabel: 'Genel Müdür',
    scope: 'city',
    description:
      'Şehirdeki TÜM şubeleri yönetir: tam otomasyon, +%20 verimlilik ve saatlik Otomatik Hasılat Toplama sağlar.',
    baseHourlySalary: 9_500,
    baseHireCost: 580_000,
  },
};

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
    } else {
      stars = r > 0.86 ? 5 : r > 0.64 ? 4 : r > 0.36 ? 3 : r > 0.14 ? 2 : 1;
    }

    const baseStat = 32 + stars * 12;
    const jitter = () => Math.min(99, Math.max(20, Math.round(baseStat + (rand() - 0.4) * 18)));
    const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
    const meta = ROLE_META[role];
    const starCostMult = Math.pow(1.42, stars - 1);

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
      hourlySalary: Math.round((meta.baseHourlySalary * starCostMult) / 50) * 50,
      hireCost: Math.round((meta.baseHireCost * starCostMult) / 500) * 500,
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
      autoCollectRevenue: false,
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
      const starBoost = STAR_EFFICIENCY_MULTIPLIER[emp.stars] - 1;
      const skillBonus = ((emp.speed + emp.efficiency) / 200) * 0.12;
      employeeBonus += starBoost + skillBonus;
    }
  } else {
    // Fallback for legacy staffCount without detailed employee records
    employeeBonus = business.staffCount * 0.14;
  }

  // Operational efficiency drops when stock or maintenance is low!
  const stockFactor = 0.55 + 0.45 * (Math.max(0, Math.min(100, business.stockLevel ?? 100)) / 100);
  const maintFactor =
    0.6 + 0.4 * (Math.max(0, Math.min(100, business.maintenanceLevel ?? 100)) / 100);
  const opsFactor = stockFactor * maintFactor;

  return (1 + employeeBonus + automation.efficiencyBonus) * opsFactor;
}

export function calculateTotalHourlyPayroll(state: EmpireState): number {
  const branchPayroll = state.businesses.reduce(
    (sum, b) => sum + (b.employees ?? []).reduce((s, e) => s + e.hourlySalary, 0),
    0
  );
  const cityPayroll = (state.cityManagers ?? []).reduce((sum, m) => sum + m.hourlySalary, 0);
  return branchPayroll + cityPayroll;
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
    const cityBranches = state.businesses.filter((b) => b.cityPlate === targetCityPlate);
    if (candidate.role === 'bolge_sorumlusu' && cityBranches.length < 2) {
      return {
        state,
        ok: false,
        error: 'Bölge Sorumlusu atamak için bu şehirde en az 2 şubeniz olmalıdır.',
      };
    }
    if (candidate.role === 'genel_mudur' && cityBranches.length < 1) {
      return {
        state,
        ok: false,
        error: 'Genel Müdür atamak için bu şehirde en az 1 şubeniz olmalıdır.',
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

  // Branch-level hire
  const biz = state.businesses.find((b) => b.id === targetBusinessId);
  if (!biz) {
    return { state, ok: false, error: 'Atama yapılacak işletme seçilmedi.' };
  }
  const bp = getBlueprintById(biz.blueprintId);
  const currentEmps = biz.employees ?? [];

  if (candidate.role === 'mudur_yardimcisi' && currentEmps.some((e) => e.role === 'mudur_yardimcisi')) {
    return { state, ok: false, error: 'Bu şubede zaten bir Müdür Yardımcısı var.' };
  }
  if (candidate.role === 'sube_muduru' && currentEmps.some((e) => e.role === 'sube_muduru')) {
    return { state, ok: false, error: 'Bu şubede zaten bir Şube Müdürü var.' };
  }
  if (candidate.role === 'calisan' && bp && biz.staffCount >= bp.maxStaff) {
    return { state, ok: false, error: 'Bu şubenin çalışan kadrosu dolu.' };
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
