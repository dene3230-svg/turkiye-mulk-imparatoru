import type {
  AccountantStaff,
  BusinessTypeId,
  CeoStaff,
  EmpireState,
  OwnedBusiness,
  PendingTaxObligation,
  RemoteBusinessRecord,
  TaxBreakdownValues,
  TaxRatesBreakdown,
} from '../types/game';
import { getBlueprintById } from './catalog';
import { TURKEY_PROVINCES, resolvePinLocation } from './provinces81';
import { payMonthlyLoanInstallment } from './bankingEngine';
import { hireCandidateFromPool } from './hrEngine';
import { launchBusinessAdCampaign } from './strategyEngine';
import { canOfficeHireRole } from './officeEngine';

export const HOLDING_MIN_LEVEL = 5;
export const HOLDING_MIN_NET_WORTH = 120_000_000;

export function isHoldingStageUnlocked(companyLevel: number, netWorth: number): boolean {
  return companyLevel >= HOLDING_MIN_LEVEL || netWorth >= HOLDING_MIN_NET_WORTH;
}

export function getCurrentGameDay(gameMinutes: number | undefined): number {
  const safeMin = Math.max(0, Math.floor(gameMinutes ?? 540));
  return Math.floor(safeMin / 1440) + 1;
}

// ============================================================================
// 1. REALISTIC PROGRESSIVE TAX SYSTEM (KDV, SGK & Stopaj, Kurumlar, Belediye)
// ============================================================================

/**
 * Progressive, player-friendly Turkish business tax curve:
 * - Stage 0 (1-2 branches): Genç Girişimci Teşviki — low rates so early game feels fast & fair.
 * - Stage 1 (3-5 branches): Büyüyen KOBİ — moderate rates.
 * - Stage 2 (6-9 branches): Kurumsal Şirket — standard commercial rates.
 * - Stage 3 (10+ branches or Holding): Holding Kademesi — full corporate rates.
 */
export function getProgressiveTaxRates(
  branchCount: number,
  netWorth = 0
): TaxRatesBreakdown {
  if (branchCount <= 2 && netWorth < 12_000_000) {
    return {
      stageIndex: 0,
      stageLabel: 'Genç Girişimci Teşviki (1–2 Şube)',
      kdvRate: 0.1,
      sgkRate: 0.14, // Muhtasar / Stopaj (Maaş & Kira Stopajı)
      corporateRate: 0.18, // Kurumlar / Gelir Vergisi teşvikli
      municipalRate: 0.015, // Çevre Temizlik & İlan Reklam
      incentiveNote:
        'İlk 1–2 şubede Genç Girişimci KDV, Muhtasar/Stopaj ve Kurumlar Vergisi teşviki uygulanır.',
    };
  }
  if (branchCount <= 5 && netWorth < 45_000_000) {
    return {
      stageIndex: 1,
      stageLabel: 'Büyüyen KOBİ Kademesi (3–5 Şube)',
      kdvRate: 0.1,
      sgkRate: 0.15,
      corporateRate: 0.2,
      municipalRate: 0.015,
      incentiveNote: 'KOBİ vergi dilimi aktif (KDV, Muhtasar/Stopaj, %20 Kurumlar, Çevre & İlan).',
    };
  }
  if (branchCount <= 9 && netWorth < HOLDING_MIN_NET_WORTH) {
    return {
      stageIndex: 2,
      stageLabel: 'Kurumsal Şirket Dilimi (6–9 Şube)',
      kdvRate: 0.14,
      sgkRate: 0.18,
      corporateRate: 0.22,
      municipalRate: 0.02,
      incentiveNote: 'Standart Türkiye ticari vergi tarifesi devrede.',
    };
  }
  return {
    stageIndex: 3,
    stageLabel: 'Holding Tam Vergi Kademesi (10+ Şube / Holding)',
    kdvRate: 0.18,
    sgkRate: 0.2,
    corporateRate: 0.25,
    municipalRate: 0.025,
    incentiveNote:
      'Tam Türkiye Kurumlar (%25), KDV, Muhtasar/Stopaj ve Çevre/İlan Reklam tarifesi aktif (5★ YMM ile %12 yasal optimizasyon).',
  };
}

export function calculateHourlyTaxBreakdown(params: {
  hourlyGrossRevenue: number;
  hourlyPayroll: number;
  hourlyRentAndUtilities?: number;
  hourlyOperatingExpensesBeforeTax: number;
  branchCount: number;
  netWorth?: number;
  accountant?: AccountantStaff | null;
}): { rates: TaxRatesBreakdown; breakdown: TaxBreakdownValues } {
  const rates = getProgressiveTaxRates(params.branchCount, params.netWorth ?? 0);
  if (params.branchCount === 0 && params.hourlyGrossRevenue <= 0) {
    return {
      rates,
      breakdown: { kdv: 0, sgkStopaj: 0, corporateTax: 0, municipalTax: 0, totalTax: 0 },
    };
  }

  // Legal tax optimization from hired Muhasebeci / Mali Müşavir (up to 12% savings)
  const optFactor = 1 - Math.min(0.14, Math.max(0, params.accountant?.taxOptimizationRate ?? 0));

  // Net KDV payable (after input VAT credit on supplies ~45% offset -> effective net VAT burden)
  const kdv = Math.round(params.hourlyGrossRevenue * rates.kdvRate * 0.55 * optFactor);
  // Muhtasar / Stopaj: applies to staff payroll + commercial rent withholding (kira stopajı)
  const stopajBase = params.hourlyPayroll + Math.round((params.hourlyRentAndUtilities ?? 0) * 0.5);
  const sgkStopaj = Math.round(stopajBase * rates.sgkRate);
  // Kurumlar Vergisi: applies strictly to pre-tax net operating profit
  const preTaxProfit = Math.max(
    0,
    params.hourlyGrossRevenue - params.hourlyOperatingExpensesBeforeTax
  );
  const corporateTax = Math.round(preTaxProfit * rates.corporateRate * optFactor);
  // Çevre Temizlik & İlan Reklam Vergisi (per branch fixed tariff + turnover bracket)
  const municipalTax = Math.round(
    (params.branchCount * 35 + params.hourlyGrossRevenue * rates.municipalRate) * optFactor
  );
  const totalTax = kdv + sgkStopaj + corporateTax + municipalTax;

  return {
    rates,
    breakdown: { kdv, sgkStopaj, corporateTax, municipalTax, totalTax },
  };
}

export function createMonthlyTaxObligation(
  monthNumber: number,
  completedDay: number,
  hourlyTax: TaxBreakdownValues,
  now = Date.now()
): PendingTaxObligation | null {
  if (hourlyTax.totalTax <= 0) return null;
  // Balanced monthly assessment: equivalent to 18 operating hours so taxes feel realistic yet never crush gameplay
  const scale = 18;
  const breakdown: TaxBreakdownValues = {
    kdv: Math.round(hourlyTax.kdv * scale),
    sgkStopaj: Math.round(hourlyTax.sgkStopaj * scale),
    corporateTax: Math.round(hourlyTax.corporateTax * scale),
    municipalTax: Math.round(hourlyTax.municipalTax * scale),
    totalTax: 0,
  };
  breakdown.totalTax =
    breakdown.kdv + breakdown.sgkStopaj + breakdown.corporateTax + breakdown.municipalTax;

  if (breakdown.totalTax <= 0) return null;

  return {
    id: `tax-m${monthNumber}-d${completedDay}-${now}`,
    monthNumber,
    dueGameDay: completedDay + 10, // 10 game days payment window
    amount: breakdown.totalTax,
    breakdown,
    overdueDays: 0,
    status: 'pending',
    createdAt: now,
  };
}

export function payPendingTaxBill(
  state: EmpireState,
  taxId: string,
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string; paidBill?: PendingTaxObligation } {
  const bills = state.pendingTaxes ?? [];
  const target = bills.find((b) => b.id === taxId && b.status !== 'paid');
  if (!target) {
    return { state, ok: false, error: 'Ödenecek vergi tahakkuku bulunamadı.' };
  }
  if (state.cash < target.amount) {
    return {
      state,
      ok: false,
      error: `Vergi ödemesi için yetersiz nakit (Gerekli: ₺${target.amount.toLocaleString('tr-TR')}).`,
    };
  }

  const paidBill: PendingTaxObligation = { ...target, status: 'paid' };
  const scoreBonus = target.overdueDays === 0 ? 10 : 0;

  return {
    ok: true,
    paidBill,
    state: {
      ...state,
      cash: state.cash - target.amount,
      creditScore: Math.min(1900, (state.creditScore ?? 1100) + scoreBonus),
      totalTaxesPaid: (state.totalTaxesPaid ?? 0) + target.amount,
      pendingTaxes: bills.map((b) => (b.id === taxId ? paidBill : b)),
      lastSavedAt: now,
    },
  };
}

// ============================================================================
// 2. MUHASEBE & FİNANS DEPARTMANI (AVAILABLE FROM LEVEL 1!)
// ============================================================================

const ACCOUNTANT_NAMES = [
  'Deniz Aksoy',
  'Merve Yalçın',
  'Hakan Özdemir',
  'Selin Karaca',
  'Emrah Korkmaz',
  'Pınar Çetin',
  'Barış Doğan',
  'Aslıhan Erdem',
  'Gökhan Şimşek',
  'Tuğba Arslan',
];

const ACCOUNTANT_TITLES: Record<1 | 2 | 3 | 4 | 5, { title: string; hire: number; salary: number; opt: number }> = {
  1: { title: 'Ön Muhasebe Uzmanı', hire: 12_000, salary: 62, opt: 0.02 }, // ~₺1.488/gün (SGK dahil)
  2: { title: 'Muhasebe Sorumlusu', hire: 26_000, salary: 92, opt: 0.04 },
  3: { title: 'Serbest Muhasebeci (SMMM)', hire: 55_000, salary: 145, opt: 0.07 },
  4: { title: 'Kıdemli Mali Müşavir', hire: 110_000, salary: 215, opt: 0.1 },
  5: { title: 'Yeminli Mali Müşavir (YMM)', hire: 210_000, salary: 310, opt: 0.12 },
};

export function generateAccountantPool(seed = Date.now()): AccountantStaff[] {
  const safeSeed = Math.abs(Math.floor(seed));
  const starSet: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];
  return starSet.map((stars, idx) => {
    const meta = ACCOUNTANT_TITLES[stars];
    const name = ACCOUNTANT_NAMES[(safeSeed + idx * 3) % ACCOUNTANT_NAMES.length];
    return {
      id: `acc-${safeSeed}-${stars}-${idx}`,
      name,
      stars,
      title: meta.title,
      taxOptimizationRate: meta.opt,
      hireCost: meta.hire,
      hourlySalary: meta.salary,
    };
  });
}

export function hireAccountant(
  state: EmpireState,
  accountantId: string,
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string; accountant?: AccountantStaff } {
  // Available at ALL levels (Level 1+ — NO Holding lock!)
  const pool =
    state.accountantPool && state.accountantPool.length > 0
      ? state.accountantPool
      : generateAccountantPool(now);
  const candidate = pool.find((a) => a.id === accountantId);
  if (!candidate) {
    return { state, ok: false, error: 'Muhasebeci adayı bulunamadı.' };
  }
  if (state.cash < candidate.hireCost) {
    return {
      state,
      ok: false,
      error: `İşe alım bedeli için yetersiz nakit (Gerekli: ₺${candidate.hireCost.toLocaleString('tr-TR')}).`,
    };
  }

  const hired: AccountantStaff = { ...candidate, hiredAt: now };
  return {
    ok: true,
    accountant: hired,
    state: {
      ...state,
      cash: state.cash - candidate.hireCost,
      accountant: hired,
      accountantPool: pool.filter((a) => a.id !== accountantId),
      lastSavedAt: now,
    },
  };
}

export function dismissAccountant(
  state: EmpireState,
  now = Date.now()
): { state: EmpireState; ok: boolean } {
  if (!state.accountant) return { state, ok: false };
  return {
    ok: true,
    state: {
      ...state,
      accountant: null,
      lastSavedAt: now,
    },
  };
}

export interface AccountantAutoPayResult {
  state: EmpireState;
  autoPaidLoanAmount: number;
  autoPaidLoanCount: number;
  autoPaidTaxAmount: number;
  autoPaidTaxCount: number;
}

/**
 * If a Muhasebeci / Mali Müşavir is employed, automatically pays due/approaching monthly
 * loan installments and pending tax bills before they ever fall into overdue or foreclosure!
 */
export function processAccountantAutoPayments(
  state: EmpireState,
  now = Date.now()
): AccountantAutoPayResult {
  if (!state.accountant) {
    return {
      state,
      autoPaidLoanAmount: 0,
      autoPaidLoanCount: 0,
      autoPaidTaxAmount: 0,
      autoPaidTaxCount: 0,
    };
  }

  const currentDay = getCurrentGameDay(state.gameMinutes);
  let working = state;
  let autoPaidLoanAmount = 0;
  let autoPaidLoanCount = 0;
  let autoPaidTaxAmount = 0;
  let autoPaidTaxCount = 0;

  // 1) Auto-pay monthly loan installments due today or overdue
  for (const loan of working.activeLoans ?? []) {
    if (loan.status !== 'active' && loan.status !== 'garnishing') continue;
    const dueDay = loan.nextDueGameDay ?? currentDay + 30;
    if (currentDay >= dueDay) {
      const installmentAmt = Math.min(
        loan.remainingAmount,
        loan.monthlyInstallment ?? loan.remainingAmount
      );
      if (working.cash >= installmentAmt) {
        const res = payMonthlyLoanInstallment(working, loan.id, now);
        if (res.ok && res.paidAmount) {
          working = res.state;
          autoPaidLoanAmount += res.paidAmount;
          autoPaidLoanCount += 1;
        }
      }
    }
  }

  // 2) Auto-pay pending tax bills due today or overdue
  for (const bill of working.pendingTaxes ?? []) {
    if (bill.status === 'paid') continue;
    if (currentDay >= bill.dueGameDay - 1 && working.cash >= bill.amount) {
      const res = payPendingTaxBill(working, bill.id, now);
      if (res.ok && res.paidBill) {
        working = res.state;
        autoPaidTaxAmount += res.paidBill.amount;
        autoPaidTaxCount += 1;
      }
    }
  }

  return {
    state: working,
    autoPaidLoanAmount,
    autoPaidLoanCount,
    autoPaidTaxAmount,
    autoPaidTaxCount,
  };
}

// ============================================================================
// 3. HOLDING BOARD OF DIRECTORS & AUTONOMOUS CEO (UNLOCKED AT HOLDING STAGE)
// ============================================================================

const CEO_CANDIDATES_TEMPLATE: Array<{
  name: string;
  stars: 3 | 4 | 5;
  title: string;
  leadership: number;
  strategy: number;
  hireCost: number;
  hourlySalary: number;
}> = [
  {
    name: 'Kerem Soylu',
    stars: 3,
    title: 'İcra Kurulu Başkanı (CEO)',
    leadership: 82,
    strategy: 80,
    hireCost: 450_000,
    hourlySalary: 320, // ~₺7.680/gün (SGK dahil)
  },
  {
    name: 'Aylin Karahan',
    stars: 4,
    title: 'Kıdemli Holding CEO',
    leadership: 90,
    strategy: 91,
    hireCost: 950_000,
    hourlySalary: 520,
  },
  {
    name: 'Levent Albayrak',
    stars: 5,
    title: 'Global Strateji CEO',
    leadership: 98,
    strategy: 99,
    hireCost: 1_850_000,
    hourlySalary: 780,
  },
];

export function generateCeoPool(seed = Date.now()): CeoStaff[] {
  const safeSeed = Math.abs(Math.floor(seed));
  return CEO_CANDIDATES_TEMPLATE.map((tpl, idx) => ({
    id: `ceo-${safeSeed}-${idx}`,
    ...tpl,
    autonomousGrowthEnabled: false,
    autoBranchesOpened: 0,
    autoTakeoversCount: 0,
  }));
}

export function hireCeo(
  state: EmpireState,
  ceoId: string,
  companyLevel: number,
  netWorth: number,
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string; ceo?: CeoStaff } {
  if (!isHoldingStageUnlocked(companyLevel, netWorth)) {
    return {
      state,
      ok: false,
      error: `Profesyonel CEO atamak için Holding seviyesine (Sv.${HOLDING_MIN_LEVEL} · ₺120 Mn net değer) ulaşmalısınız.`,
    };
  }
  const officeCheck = canOfficeHireRole(state, 'ceo');
  if (!officeCheck.allowed) {
    return {
      state,
      ok: false,
      error: `Profesyonel CEO istihdam etmek için Ofisim bölümünden "${officeCheck.requiredTierName}" seviyesine yükselmelisiniz.`,
    };
  }
  const pool = state.ceoPool && state.ceoPool.length > 0 ? state.ceoPool : generateCeoPool(now);
  const cand = pool.find((c) => c.id === ceoId);
  if (!cand) {
    return { state, ok: false, error: 'CEO adayı bulunamadı.' };
  }
  if (state.cash < cand.hireCost) {
    return {
      state,
      ok: false,
      error: `CEO imza bedeli için yetersiz nakit (Gerekli: ₺${cand.hireCost.toLocaleString('tr-TR')}).`,
    };
  }

  const hired: CeoStaff = {
    ...cand,
    hiredAt: now,
    autonomousGrowthEnabled: true, // Ready for immediate autonomous management (player can toggle anytime)
  };

  return {
    ok: true,
    ceo: hired,
    state: {
      ...state,
      cash: state.cash - cand.hireCost,
      ceo: hired,
      ceoPool: pool.filter((c) => c.id !== ceoId),
      lastSavedAt: now,
    },
  };
}

export function dismissCeo(
  state: EmpireState,
  now = Date.now()
): { state: EmpireState; ok: boolean } {
  if (!state.ceo) return { state, ok: false };
  return {
    ok: true,
    state: {
      ...state,
      ceo: null,
      lastSavedAt: now,
    },
  };
}

export function toggleCeoAutonomousGrowth(
  state: EmpireState,
  enabled: boolean,
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string } {
  if (!state.ceo) {
    return { state, ok: false, error: 'Önce Profesyonel CEO atamalısınız.' };
  }
  return {
    ok: true,
    state: {
      ...state,
      ceo: { ...state.ceo, autonomousGrowthEnabled: enabled },
      lastSavedAt: now,
    },
  };
}

export interface CeoAutonomousTickResult {
  state: EmpireState;
  actionsLog: string[];
}

/**
 * Autonomous CEO growth engine (runs on day transitions when CEO has autonomousGrowthEnabled=true):
 * Protects a 40% cash safety reserve and autonomously:
 * 1) Launches profitable ads on unadvertised branches
 * 2) Hires missing Şube Müdürü / staff if cash is abundant
 * 3) Opens a new branch in an expanding Turkish province when branch quota & cash reserve permit!
 */
export function runAutonomousCeoTick(
  state: EmpireState,
  maxBranches: number,
  companyLevel: number,
  owner: { id: string; name: string },
  rivalRecords: RemoteBusinessRecord[] = [],
  now = Date.now()
): CeoAutonomousTickResult {
  const ceo = state.ceo;
  if (!ceo || !ceo.autonomousGrowthEnabled) {
    return { state, actionsLog: [] };
  }

  const currentDay = getCurrentGameDay(state.gameMinutes);
  const lastDay = state.lastCeoActionGameDay ?? 0;
  // Act at most once every 3 game days so expansion feels steady & controlled
  if (currentDay - lastDay < 3) {
    return { state, actionsLog: [] };
  }

  let working = state;
  const actionsLog: string[] = [];
  let openedCount = ceo.autoBranchesOpened;
  let takeoverCount = ceo.autoTakeoversCount;

  // Keep a conservative 40% cash safety floor (minimum ₺500K)
  const safeFloor = Math.max(500_000, working.cash * 0.4);

  // Action A: Ensure top branches run marketing campaigns
  const unadvertised = working.businesses.find(
    (b) => !b.activeAdCampaign || b.activeAdCampaign.endsAtGameMin <= (working.gameMinutes ?? 540)
  );
  if (unadvertised && working.cash > safeFloor + 60_000) {
    const adRes = launchBusinessAdCampaign(working, unadvertised.id, 'social', now, true);
    if (adRes.ok) {
      working = adRes.state;
      actionsLog.push(`CEO ${ceo.name}, ${unadvertised.customName} için Sosyal Medya reklamı başlattı`);
    }
  }

  // Action B: Acquire an affordable distressed rival if quota allows
  if (working.businesses.length < maxBranches && rivalRecords.length > 0) {
    const acquiredSet = new Set(working.acquiredRivalIds ?? []);
    const candidateRival = rivalRecords.find(
      (r) =>
        r.owner_id !== owner.id &&
        !acquiredSet.has(r.id) &&
        r.valuation * 1.25 <= working.cash - safeFloor
    );
    if (candidateRival) {
      const bp = getBlueprintById(candidateRival.business_type);
      const price = Math.round((candidateRival.valuation * 1.25) / 1000) * 1000;
      if (bp && working.cash - price >= safeFloor) {
        const prov = TURKEY_PROVINCES.find((p) => p.plate === candidateRival.city_plate) ?? TURKEY_PROVINCES[0];
        const acquiredBiz: OwnedBusiness = {
          id: candidateRival.id,
          ownerId: owner.id,
          ownerName: owner.name,
          blueprintId: bp.id,
          customName: `${candidateRival.business_name} (CEO)`,
          lat: candidateRival.lat,
          lng: candidateRival.lng,
          cityPlate: candidateRival.city_plate,
          cityName: candidateRival.city_name,
          districtName: candidateRival.district || prov.districts[0] || prov.name,
          level: Math.max(1, candidateRival.level),
          staffCount: 1,
          employees: [],
          stockLevel: 100,
          maintenanceLevel: 100,
          purchaseCost: price,
          landMultiplier: prov.landMultiplier,
          affinityMultiplier: 1.05,
          pendingCash: 0,
          totalEarned: 0,
          boostEndsAt: 0,
          createdAt: now,
          notifiedHighVault: false,
          chainBrandName: candidateRival.business_name,
          chainBranchNumber: 1,
        };
        working = {
          ...working,
          cash: working.cash - price,
          businesses: [acquiredBiz, ...working.businesses],
          acquiredRivalIds: Array.from(new Set([...(working.acquiredRivalIds ?? []), candidateRival.id])),
        };
        takeoverCount += 1;
        actionsLog.push(
          `CEO ${ceo.name}, ${candidateRival.city_name} ilinde ${candidateRival.business_name} şubesini devraldı`
        );
      }
    }
  }

  // Action C: Open a brand-new branch in a high-potential province when quota & budget permit
  if (actionsLog.length === 0 && working.businesses.length < maxBranches) {
    const candidateTypes: BusinessTypeId[] =
      companyLevel >= 5
        ? ['restoran', 'supermarket', 'ps_salonu', 'kafe']
        : ['ps_salonu', 'internet_kafe', 'kafe'];
    const chosenType = candidateTypes[currentDay % candidateTypes.length];
    const bp = getBlueprintById(chosenType);
    if (bp) {
      const targetProv = TURKEY_PROVINCES[(currentDay * 11 + working.businesses.length * 7) % TURKEY_PROVINCES.length];
      const estCost = Math.round((bp.baseCost * targetProv.landMultiplier) / 1000) * 1000;
      if (working.cash - estCost >= safeFloor) {
        const offsetLat = ((currentDay % 5) - 2) * 0.0045;
        const offsetLng = (((working.businesses.length + 1) % 5) - 2) * 0.0045;
        const pin = resolvePinLocation(targetProv.lat + offsetLat, targetProv.lng + offsetLng, targetProv.plate);
        const newBiz: OwnedBusiness = {
          id: `biz-ceo-${now}-${Math.floor(Math.random() * 10000)}`,
          ownerId: owner.id,
          ownerName: owner.name,
          blueprintId: bp.id,
          customName: `${targetProv.name} Holding ${bp.shortName}`,
          lat: pin.lat,
          lng: pin.lng,
          cityPlate: targetProv.plate,
          cityName: targetProv.name,
          districtName: pin.districtName,
          level: 1,
          staffCount: 0,
          employees: [],
          stockLevel: 100,
          maintenanceLevel: 100,
          purchaseCost: estCost,
          landMultiplier: targetProv.landMultiplier,
          affinityMultiplier: 1.08,
          pendingCash: 0,
          totalEarned: 0,
          boostEndsAt: 0,
          createdAt: now,
          notifiedHighVault: false,
          chainBrandName: `Holding ${bp.shortName}`,
          chainBranchNumber: 1,
        };
        working = {
          ...working,
          cash: working.cash - estCost,
          businesses: [newBiz, ...working.businesses],
        };
        openedCount += 1;
        actionsLog.push(
          `CEO ${ceo.name}, ${targetProv.name} ilinde otonom ${newBiz.customName} şubesini açtı`
        );
      }
    }
  }

  // Action D: Auto-hire a Şube Müdürü for an unmanaged branch if available in pool
  const unmanagedBranch = working.businesses.find(
    (b) => !(b.employees ?? []).some((e) => e.role === 'sube_muduru')
  );
  const bmCand = (working.candidatePool ?? []).find((c) => c.role === 'sube_muduru');
  if (unmanagedBranch && bmCand && working.cash - bmCand.hireCost >= safeFloor) {
    const hired = hireCandidateFromPool(working, bmCand.id, unmanagedBranch.id, unmanagedBranch.cityPlate, now);
    if (hired.ok) {
      working = hired.state;
      actionsLog.push(`CEO ${ceo.name}, ${unmanagedBranch.customName} şubesine Şube Müdürü atadı`);
    }
  }

  return {
    actionsLog,
    state: {
      ...working,
      lastCeoActionGameDay: currentDay,
      ceo: working.ceo
        ? {
            ...working.ceo,
            autoBranchesOpened: openedCount,
            autoTakeoversCount: takeoverCount,
          }
        : working.ceo,
      lastSavedAt: now,
    },
  };
}
