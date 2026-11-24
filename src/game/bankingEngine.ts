import type {
  BankRecord,
  CreditTierRule,
  EmpireState,
  LoanRecord,
  OwnedBusiness,
} from '../types/game';
import { BANK_MIN_NET_WORTH } from './catalog';

export const CREDIT_SCORE_MIN = 0;
export const CREDIT_SCORE_MAX = 1900;

export const CREDIT_TIERS: CreditTierRule[] = [
  {
    key: 'blacklist',
    label: 'Kara Liste',
    minScore: 0,
    maxScore: 699,
    maxLoanAmount: 0,
    rateSpread: 0,
    collateralMultiplier: 99,
    badgeColor: '#DC2626',
  },
  {
    key: 'high_risk',
    label: 'Yüksek Risk',
    minScore: 700,
    maxScore: 999,
    maxLoanAmount: 250_000,
    rateSpread: 0.12, // Baz faize +12%
    collateralMultiplier: 1.5, // 1.5x işletme teminatı
    badgeColor: '#EA580C',
  },
  {
    key: 'standard',
    label: 'Standart',
    minScore: 1000,
    maxScore: 1299,
    maxLoanAmount: 1_500_000,
    rateSpread: 0.04, // Baz faize +4%
    collateralMultiplier: 1.2, // 1.2x işletme teminatı
    badgeColor: '#0284C7',
  },
  {
    key: 'good_boss',
    label: 'İyi Patron',
    minScore: 1300,
    maxScore: 1599,
    maxLoanAmount: 7_500_000,
    rateSpread: 0, // Baz faiz oranı (%0 ek)
    collateralMultiplier: 1.0, // 1.0x teminat
    badgeColor: '#059669',
  },
  {
    key: 'vip_holding',
    label: 'VIP Holding',
    minScore: 1600,
    maxScore: 1900,
    maxLoanAmount: 50_000_000,
    rateSpread: -0.03, // Baz faiz üzerinden %3 VIP indirimi
    collateralMultiplier: 0.85,
    badgeColor: '#CA8A04',
  },
];

export const DEFAULT_SYSTEM_BANKS: BankRecord[] = [
  {
    id: 'sys-bank-anadolu',
    ownerId: 'system-bank-1',
    ownerName: 'Anadolu Kalkınma Konsorsiyumu',
    bankName: 'Anadolu Ticaret Bankası',
    brandColor: '#0F766E',
    emblem: '🏛️',
    hqCityPlate: 34,
    hqCityName: 'İstanbul',
    hqLat: 41.0782,
    hqLng: 29.0112,
    poolCapital: 120_000_000,
    baseInterestRate: 0.12,
    minCreditScore: 700,
    totalLoansIssued: 42,
    totalInterestEarned: 18_400_000,
    seizedAssetsCount: 3,
    createdAt: 1735689600000,
    isSystemBank: true,
  },
  {
    id: 'sys-bank-baskent',
    ownerId: 'system-bank-2',
    ownerName: 'Başkent Finans A.Ş.',
    bankName: 'Başkent Yatırım Bankası',
    brandColor: '#1D4ED8',
    emblem: 'bank-baskent',
    hqCityPlate: 6,
    hqCityName: 'Ankara',
    hqLat: 39.9208,
    hqLng: 32.8541,
    poolCapital: 250_000_000,
    baseInterestRate: 0.09,
    minCreditScore: 1100,
    totalLoansIssued: 29,
    totalInterestEarned: 24_900_000,
    seizedAssetsCount: 1,
    createdAt: 1735689600000,
    isSystemBank: true,
  },
  {
    id: 'sys-bank-turkuaz',
    ownerId: 'system-bank-3',
    ownerName: 'Turkuaz Katılım & Finans A.Ş.',
    bankName: 'Turkuaz Bank',
    brandColor: '#0891B2',
    emblem: 'bank-turkuaz',
    hqCityPlate: 35,
    hqCityName: 'İzmir',
    hqLat: 38.4237,
    hqLng: 27.1428,
    poolCapital: 185_000_000,
    baseInterestRate: 0.105,
    minCreditScore: 900,
    totalLoansIssued: 36,
    totalInterestEarned: 21_200_000,
    seizedAssetsCount: 2,
    createdAt: 1735689600000,
    isSystemBank: true,
  },
];

export function clampCreditScore(score: number): number {
  return Math.max(CREDIT_SCORE_MIN, Math.min(CREDIT_SCORE_MAX, Math.round(score)));
}

export function getCreditTier(score: number): CreditTierRule {
  const clamped = clampCreditScore(score);
  for (const tier of CREDIT_TIERS) {
    if (clamped >= tier.minScore && clamped <= tier.maxScore) {
      return tier;
    }
  }
  return CREDIT_TIERS[0];
}

export function calculateEffectiveInterestRate(
  baseInterestRate: number,
  creditScore: number
): number {
  const tier = getCreditTier(creditScore);
  return Math.max(0.02, Number((baseInterestRate + tier.rateSpread).toFixed(4)));
}

export function calculateRequiredCollateral(
  loanAmount: number,
  creditScore: number
): number {
  const tier = getCreditTier(creditScore);
  return Math.round(loanAmount * tier.collateralMultiplier);
}

export function createPlayerBank(
  state: EmpireState,
  params: {
    bankName: string;
    brandColor: string;
    emblem: string;
    hqCityPlate: number;
    hqCityName: string;
    hqLat: number;
    hqLng: number;
    initialPoolCapital: number;
    baseInterestRate: number; // 0.05..0.30
    minCreditScore: number;
  },
  netWorth: number,
  owner: { id: string; name: string },
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string; bank?: BankRecord } {
  if (state.ownBank) {
    return { state, ok: false, error: 'Zaten kurulu bir bankanız bulunuyor.' };
  }
  if (netWorth < BANK_MIN_NET_WORTH) {
    return {
      state,
      ok: false,
      error: 'Kendi bankanızı kurmak için şirket değeriniz en az ₺25.000.000 olmalıdır.',
    };
  }
  const name = params.bankName.trim();
  if (name.length < 3) {
    return { state, ok: false, error: 'Lütfen geçerli bir banka adı girin.' };
  }
  const licenseCost = 2_000_000;
  const pool = Math.max(1_000_000, Math.round(params.initialPoolCapital));
  const totalOutlay = licenseCost + pool;
  if (state.cash < totalOutlay) {
    return {
      state,
      ok: false,
      error: `Banka lisansı (₺2 Mn) ve ilk kredi havuzu için toplam ₺${totalOutlay.toLocaleString('tr-TR')} nakit gereklidir.`,
    };
  }

  const clampedRate = Math.max(0.05, Math.min(0.3, params.baseInterestRate));
  const clampedMinScore = Math.max(700, Math.min(1600, Math.round(params.minCreditScore)));

  const bank: BankRecord = {
    id: `bank-${owner.id}-${now}`,
    ownerId: owner.id,
    ownerName: owner.name,
    bankName: name.slice(0, 42),
    brandColor: params.brandColor || '#B45309',
    emblem: params.emblem || '🏦',
    hqCityPlate: params.hqCityPlate,
    hqCityName: params.hqCityName,
    hqLat: params.hqLat,
    hqLng: params.hqLng,
    poolCapital: pool,
    baseInterestRate: clampedRate,
    minCreditScore: clampedMinScore,
    totalLoansIssued: 0,
    totalInterestEarned: 0,
    seizedAssetsCount: 0,
    createdAt: now,
    isSystemBank: false,
  };

  return {
    ok: true,
    bank,
    state: {
      ...state,
      cash: state.cash - totalOutlay,
      ownBank: bank,
      lastSavedAt: now,
    },
  };
}

export function updateOwnBankSettings(
  state: EmpireState,
  params: {
    addCapital?: number;
    baseInterestRate?: number;
    minCreditScore?: number;
  },
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string; bank?: BankRecord } {
  if (!state.ownBank) {
    return { state, ok: false, error: 'Önce bir banka kurmalısınız.' };
  }
  const addCap = Math.max(0, Math.round(params.addCapital ?? 0));
  if (addCap > state.cash) {
    return { state, ok: false, error: 'Kredi havuzuna aktarmak için yetersiz nakit.' };
  }

  const updated: BankRecord = {
    ...state.ownBank,
    poolCapital: state.ownBank.poolCapital + addCap,
    baseInterestRate:
      params.baseInterestRate !== undefined
        ? Math.max(0.05, Math.min(0.3, params.baseInterestRate))
        : state.ownBank.baseInterestRate,
    minCreditScore:
      params.minCreditScore !== undefined
        ? Math.max(700, Math.min(1600, Math.round(params.minCreditScore)))
        : state.ownBank.minCreditScore,
  };

  return {
    ok: true,
    bank: updated,
    state: {
      ...state,
      cash: state.cash - addCap,
      ownBank: updated,
      lastSavedAt: now,
    },
  };
}

export function takeLoanFromBank(
  state: EmpireState,
  bank: BankRecord,
  amount: number,
  collateralBusiness: OwnedBusiness | null,
  collateralValuation: number,
  borrower: { id: string; name: string },
  termDurationSec = 180, // 3-minute lively game loan term
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string; loan?: LoanRecord } {
  const tier = getCreditTier(state.creditScore);
  if (tier.key === 'blacklist' || tier.maxLoanAmount <= 0) {
    return {
      state,
      ok: false,
      error: `Kredi puanınız (${state.creditScore}) Kara Liste (0-699) bölgesinde; kredi çekemezsiniz.`,
    };
  }
  if (state.creditScore < bank.minCreditScore) {
    return {
      state,
      ok: false,
      error: `${bank.bankName} en az ${bank.minCreditScore} kredi puanı şartı arıyor.`,
    };
  }
  if (bank.ownerId === borrower.id) {
    return { state, ok: false, error: 'Kendi bankanızdan kredi çekemezsiniz.' };
  }

  const principal = Math.round(amount);
  if (principal < 25_000) {
    return { state, ok: false, error: 'Minimum kredi tutarı ₺25.000 olmalıdır.' };
  }
  if (principal > tier.maxLoanAmount) {
    return {
      state,
      ok: false,
      error: `${tier.label} kademeniz en fazla ₺${tier.maxLoanAmount.toLocaleString('tr-TR')} krediye izin verir.`,
    };
  }
  if (principal > bank.poolCapital) {
    return { state, ok: false, error: 'Bankanın kredi havuzu sermayesi bu tutar için yetersiz.' };
  }

  const requiredCollateral = calculateRequiredCollateral(principal, state.creditScore);
  if (!collateralBusiness) {
    return {
      state,
      ok: false,
      error: `Bu kredi için en az ₺${requiredCollateral.toLocaleString('tr-TR')} değerinde bir işletmeyi teminat göstermelisiniz.`,
    };
  }
  if (collateralBusiness.pledgedLoanId) {
    return { state, ok: false, error: 'Bu işletme zaten başka bir kredi için teminat gösterilmiş.' };
  }
  if (collateralValuation < requiredCollateral) {
    return {
      state,
      ok: false,
      error: `${tier.label} kademesi ${tier.collateralMultiplier}× teminat ister (Gerekli: ₺${requiredCollateral.toLocaleString('tr-TR')}, Seçilen: ₺${collateralValuation.toLocaleString('tr-TR')}).`,
    };
  }

  const effectiveRate = calculateEffectiveInterestRate(bank.baseInterestRate, state.creditScore);
  const totalDue = Math.round(principal * (1 + effectiveRate));
  const dueAt = now + termDurationSec * 1000;
  const seizureAt = dueAt + 60_000; // 60s garnishment window before automatic collateral seizure!

  const loan: LoanRecord = {
    id: `loan-${now}-${Math.floor(Math.random() * 10000)}`,
    bankId: bank.id,
    bankName: bank.bankName,
    lenderOwnerId: bank.ownerId,
    borrowerId: borrower.id,
    borrowerName: borrower.name,
    principal,
    interestRate: effectiveRate,
    totalDue,
    remainingAmount: totalDue,
    collateralBusinessId: collateralBusiness.id,
    collateralBusinessName: collateralBusiness.customName,
    collateralValuation,
    createdAt: now,
    dueAt,
    seizureAt,
    status: 'active',
  };

  return {
    ok: true,
    loan,
    state: {
      ...state,
      cash: state.cash + principal,
      activeLoans: [loan, ...(state.activeLoans ?? [])],
      businesses: state.businesses.map((b) =>
        b.id === collateralBusiness.id ? { ...b, pledgedLoanId: loan.id } : b
      ),
      lastSavedAt: now,
    },
  };
}

export function repayLoan(
  state: EmpireState,
  loanId: string,
  payAmount?: number,
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string; paidInFull?: boolean; loan?: LoanRecord } {
  const loan = (state.activeLoans ?? []).find((l) => l.id === loanId);
  if (!loan || loan.status === 'paid' || loan.status === 'seized') {
    return { state, ok: false, error: 'Aktif kredi bulunamadı.' };
  }
  const amount = Math.min(
    loan.remainingAmount,
    Math.max(1, Math.round(payAmount ?? loan.remainingAmount))
  );
  if (state.cash < amount) {
    return { state, ok: false, error: 'Kredi ödemesi için yetersiz nakit.' };
  }

  const nextRemaining = Math.max(0, loan.remainingAmount - amount);
  const paidInFull = nextRemaining === 0;
  const onTime = now <= loan.dueAt;
  const scoreBoost = paidInFull ? (onTime ? 65 : 20) : 0;

  const updatedLoan: LoanRecord = {
    ...loan,
    remainingAmount: nextRemaining,
    status: paidInFull ? 'paid' : loan.status,
  };

  return {
    ok: true,
    paidInFull,
    loan: updatedLoan,
    state: {
      ...state,
      cash: state.cash - amount,
      creditScore: clampCreditScore(state.creditScore + scoreBoost),
      activeLoans: (state.activeLoans ?? []).map((l) => (l.id === loanId ? updatedLoan : l)),
      businesses: paidInFull
        ? state.businesses.map((b) =>
            b.id === loan.collateralBusinessId ? { ...b, pledgedLoanId: undefined } : b
          )
        : state.businesses,
      lastSavedAt: now,
    },
  };
}

export interface LoanEnforcementResult {
  state: EmpireState;
  garnishedTotal: number;
  seizedLoans: Array<{ loan: LoanRecord; business: OwnedBusiness }>;
}

/**
 * Enforces overdue loans during economy ticks:
 * 1) Past dueAt: automatically garnishes borrower's live income/cash toward remaining debt.
 * 2) Past seizureAt (if debt still unpaid): automatically seizes the collateralized business
 *    and transfers it to the bank owner!
 */
export function enforceOverdueLoans(
  state: EmpireState,
  generatedIncomeThisTick: number,
  now = Date.now()
): LoanEnforcementResult {
  const loans = state.activeLoans ?? [];
  if (loans.length === 0) {
    return { state, garnishedTotal: 0, seizedLoans: [] };
  }

  let cash = state.cash;
  let creditScore = state.creditScore;
  let businesses = [...state.businesses];
  let garnishedTotal = 0;
  const seizedLoans: Array<{ loan: LoanRecord; business: OwnedBusiness }> = [];
  let changed = false;

  const nextLoans: LoanRecord[] = loans.map((loan) => {
    if (loan.status === 'paid' || loan.status === 'seized') return loan;
    if (now < loan.dueAt) return loan;

    changed = true;
    let remaining = loan.remainingAmount;

    // Step 1: Automatic income garnishment (80% of live tick income + any available cash if overdue)
    const garnishCandidate = Math.max(0, Math.round(generatedIncomeThisTick * 0.85));
    const garnishActual = Math.min(remaining, Math.min(cash, garnishCandidate));
    if (garnishActual > 0) {
      cash -= garnishActual;
      remaining -= garnishActual;
      garnishedTotal += garnishActual;
    }

    if (remaining <= 0) {
      businesses = businesses.map((b) =>
        b.id === loan.collateralBusinessId ? { ...b, pledgedLoanId: undefined } : b
      );
      return {
        ...loan,
        remainingAmount: 0,
        status: 'paid',
      };
    }

    // Step 2: Past grace window -> Automatic Collateral Seizure to Bank Owner!
    if (now >= loan.seizureAt) {
      const targetBiz = businesses.find((b) => b.id === loan.collateralBusinessId);
      if (targetBiz) {
        businesses = businesses.filter((b) => b.id !== targetBiz.id);
        seizedLoans.push({ loan: { ...loan, remainingAmount: remaining, status: 'seized' }, business: targetBiz });
      }
      creditScore = clampCreditScore(creditScore - 220);
      return {
        ...loan,
        remainingAmount: remaining,
        status: 'seized',
      };
    }

    // Still in garnishing window
    if (loan.status === 'active') {
      creditScore = clampCreditScore(creditScore - 60);
    }
    return {
      ...loan,
      remainingAmount: remaining,
      status: 'garnishing',
    };
  });

  if (!changed) {
    return { state, garnishedTotal: 0, seizedLoans: [] };
  }

  return {
    garnishedTotal,
    seizedLoans,
    state: {
      ...state,
      cash,
      creditScore,
      businesses,
      activeLoans: nextLoans,
      lastSavedAt: now,
    },
  };
}
