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

export const MAX_BRANCH_WORKERS = 4;
export const MAX_BRANCH_ASSISTANT_MANAGERS = 1;
export const MAX_BRANCH_MANAGERS = 1;

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
      'Müşterilere hizmet verir; hız ve kapasiteyi artırır (Şube başına en fazla 4 çalışan).',
    baseHourlySalary: 250,
    baseHireCost: 4_000,
  },
  mudur_yardimcisi: {
    label: 'Müdür Yardımcısı',
    shortLabel: 'Müd. Yrd.',
    scope: 'branch',
    description:
      'Atandığı şubede otomatik stok ve malzeme takibi yapar (Şube başına en fazla 1 adet).',
    baseHourlySalary: 650,
    baseHireCost: 26_000,
  },
  sube_muduru: {
    label: 'Şube Müdürü',
    shortLabel: 'Şube Müd.',
    scope: 'branch',
    description:
      'Atandığı şubede tam otomasyon (otomatik stok, bakım ve saatlik hasılatın otomatik ana kasaya toplanması) sağlar (Şube başına 1 adet).',
    baseHourlySalary: 1_250,
    baseHireCost: 65_000,
  },
  bolge_sorumlusu: {
    label: 'Bölge Sorumlusu',
    shortLabel: 'Bölge Sor.',
    scope: 'city',
    description:
      'Çok şubeli şehirlerde 4 şubeye kadar ortak tam otomasyon, %15 tedarik indirimi ve otomatik hasılat toplama sağlar (Min. 2 şube).',
    baseHourlySalary: 3_600,
    baseHireCost: 195_000,
  },
  genel_mudur: {
    label: 'Genel Müdür (İl Koordinatörü)',
    shortLabel: 'Genel Müdür',
    scope: 'city',
    description:
      'Şehirdeki tüm zincir şubelerde ortak tam otomasyon, +%20 verimlilik bonusu ve otomatik hasılat toplama sağlar (Min. 2 şube).',
    baseHourlySalary: 8_500,
    baseHireCost: 560_000,
  },
};

const ROLE_STAR_PRICING: Record<
  StaffRole,
  Record<1 | 2 | 3 | 4 | 5, { hireCost: number; hourlySalary: number }>
> = {
  calisan: {
    1: { hireCost: 4_000, hourlySalary: 250 },
    2: { hireCost: 9_500, hourlySalary: 400 },
    3: { hireCost: 16_500, hourlySalary: 650 },
    4: { hireCost: 28_000, hourlySalary: 1_050 },
    5: { hireCost: 44_000, hourlySalary: 1_600 },
  },
  mudur_yardimcisi: {
    1: { hireCost: 26_000, hourlySalary: 650 },
    2: { hireCost: 34_000, hourlySalary: 850 },
    3: { hireCost: 42_500, hourlySalary: 1_100 },
    4: { hireCost: 51_000, hourlySalary: 1_400 },
    5: { hireCost: 59_000, hourlySalary: 1_750 },
  },
  sube_muduru: {
    1: { hireCost: 65_000, hourlySalary: 1_200 },
    2: { hireCost: 82_000, hourlySalary: 1_550 },
    3: { hireCost: 105_000, hourlySalary: 1_950 },
    4: { hireCost: 132_000, hourlySalary: 2_400 },
    5: { hireCost: 168_000, hourlySalary: 2_950 },
  },
  bolge_sorumlusu: {
    1: { hireCost: 165_000, hourlySalary: 2_800 },
    2: { hireCost: 195_000, hourlySalary: 3_200 },
    3: { hireCost: 235_000, hourlySalary: 3_800 },
    4: { hireCost: 310_000, hourlySalary: 4_800 },
    5: { hireCost: 410_000, hourlySalary: 6_200 },
  },
  genel_mudur: {
    1: { hireCost: 440_000, hourlySalary: 6_500 },
    2: { hireCost: 510_000, hourlySalary: 7_500 },
    3: { hireCost: 590_000, hourlySalary: 8_800 },
    4: { hireCost: 760_000, hourlySalary: 11_200 },
    5: { hireCost: 960_000, hourlySalary: 14_200 },
  },
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
    const pricing = ROLE_STAR_PRICING[role][stars];

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
      hourlySalary: pricing.hourlySalary,
      hireCost: pricing.hireCost,
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
        error: 'Bölge Sorumlusu yalnızca birden fazla şubeniz olduğunda (min. 2 şube) atanabilir.',
      };
    }
    if (candidate.role === 'genel_mudur' && cityBranches.length < 2) {
      return {
        state,
        ok: false,
        error: 'Genel Müdür yalnızca bu şehirde en az 2 şubeli bir zinciriniz olduğunda atanabilir.',
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

  // Branch-level hire with strict slot enforcement (4 Çalışan, 1 Müd. Yrd., 1 Şube Müdürü)
  const biz = state.businesses.find((b) => b.id === targetBusinessId);
  if (!biz) {
    return { state, ok: false, error: 'Atama yapılacak işletme seçilmedi.' };
  }
  const slots = getBranchStaffSlots(biz);

  if (candidate.role === 'mudur_yardimcisi' && slots.assistantManagers >= slots.maxAssistantManagers) {
    return {
      state,
      ok: false,
      error: `Kadro Dolu (${slots.assistantManagers}/${slots.maxAssistantManagers} Müd. Yrd.). Şube başına en fazla 1 Müdür Yardımcısı alınabilir.`,
    };
  }
  if (candidate.role === 'sube_muduru' && slots.branchManagers >= slots.maxBranchManagers) {
    return {
      state,
      ok: false,
      error: `Kadro Dolu (${slots.branchManagers}/${slots.maxBranchManagers} Şube Müdürü). Şube başına en fazla 1 Şube Müdürü alınabilir.`,
    };
  }
  if (candidate.role === 'calisan' && slots.workers >= slots.maxWorkers) {
    return {
      state,
      ok: false,
      error: `Kadro Dolu (${slots.workers}/${slots.maxWorkers} Çalışan). Bu şubeye en fazla 4 çalışan alınabilir.`,
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
