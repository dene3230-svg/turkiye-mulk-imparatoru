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
  termDurationSec = 180,
  now = Date.now(),
  termMonths = 6
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
  const safeTermMonths = Math.max(1, Math.min(24, Math.round(termMonths)));
  const monthlyInstallment = Math.ceil(totalDue / safeTermMonths);
  const currentGameDay = Math.floor((state.gameMinutes ?? 540) / 1440) + 1;
  const dueAt = now + termDurationSec * 1000;
  const seizureAt = dueAt + 60_000; // Legacy fallback window

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
    termMonths: safeTermMonths,
    paidMonths: 0,
    monthlyInstallment,
    nextDueGameDay: currentGameDay + 30, // 30-day in-game monthly installment schedule
    overdueDays: 0,
    defaultInterestAccrued: 0,
    legalWarningSent: false,
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

/**
 * Pays 1 monthly (30-day) installment on an active loan.
 * Timely payment increases credit score by +35 to +60 points and advances nextDueGameDay by 30 days.
 */
export function payMonthlyLoanInstallment(
  state: EmpireState,
  loanId: string,
  now = Date.now()
): {
  state: EmpireState;
  ok: boolean;
  error?: string;
  paidAmount?: number;
  paidInFull?: boolean;
  creditScoreDelta?: number;
  loan?: LoanRecord;
} {
  const loan = (state.activeLoans ?? []).find((l) => l.id === loanId);
  if (!loan || loan.status === 'paid' || loan.status === 'seized') {
    return { state, ok: false, error: 'Aktif kredi bulunamadı.' };
  }

  const installment = Math.min(
    loan.remainingAmount,
    Math.max(1, loan.monthlyInstallment ?? loan.remainingAmount)
  );
  if (state.cash < installment) {
    return {
      state,
      ok: false,
      error: `Aylık taksit ödemesi için yetersiz nakit (Gerekli: ₺${installment.toLocaleString('tr-TR')}).`,
    };
  }

  const currentGameDay = Math.floor((state.gameMinutes ?? 540) / 1440) + 1;
  const dueDay = loan.nextDueGameDay ?? currentGameDay;
  const isOnTime = (loan.overdueDays ?? 0) === 0 && currentGameDay <= dueDay;

  const nextRemaining = Math.max(0, loan.remainingAmount - installment);
  const paidInFull = nextRemaining === 0;
  // On-time monthly installment: +40 pts (or +60 when loan fully paid off on time)
  const creditScoreDelta = isOnTime ? (paidInFull ? 60 : 40) : paidInFull ? 20 : 10;

  const nextDueDay = paidInFull ? dueDay : Math.max(dueDay, currentGameDay) + 30;
  const updatedLoan: LoanRecord = {
    ...loan,
    remainingAmount: nextRemaining,
    paidMonths: (loan.paidMonths ?? 0) + 1,
    nextDueGameDay: nextDueDay,
    overdueDays: 0,
    legalWarningSent: false,
    status: paidInFull ? 'paid' : 'active',
  };

  return {
    ok: true,
    paidAmount: installment,
    paidInFull,
    creditScoreDelta,
    loan: updatedLoan,
    state: {
      ...state,
      cash: state.cash - installment,
      creditScore: clampCreditScore(state.creditScore + creditScoreDelta),
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
  const currentGameDay = Math.floor((state.gameMinutes ?? 540) / 1440) + 1;
  const onTime =
    loan.nextDueGameDay !== undefined
      ? currentGameDay <= loan.nextDueGameDay && (loan.overdueDays ?? 0) === 0
      : now <= loan.dueAt;
  const scoreBoost = paidInFull ? (onTime ? 60 : 20) : 0;

  const updatedLoan: LoanRecord = {
    ...loan,
    remainingAmount: nextRemaining,
    overdueDays: paidInFull ? 0 : loan.overdueDays,
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
  defaultInterestAdded: number;
  legalWarnings: LoanRecord[];
  seizedLoans: Array<{ loan: LoanRecord; business: OwnedBusiness; cashSeized?: number }>;
}

/**
 * v1.3.0 Monthly 30-Day Credit & Foreclosure Engine:
 * - Game-day monthly tracking (nextDueGameDay):
 *   * Day > nextDueGameDay: sharp credit score drop (-100 pts on first missed day), daily default interest (+1.5%/day).
 *   * Overdue >= 15 game days: Legal Warning issued (Yasal Takip Uyarısı).
 *   * Overdue >= 30 game days: Foreclosure (Haciz) — first seizes player's cash, then seizes collateral (or lowest-valued) business if debt remains!
 * - Also preserves legacy real-time `seizureAt` enforcement when `daysPassed === 0` for backward compatibility.
 */
export function enforceOverdueLoans(
  state: EmpireState,
  generatedIncomeThisTick: number,
  now = Date.now(),
  daysPassed = 0
): LoanEnforcementResult {
  const loans = state.activeLoans ?? [];
  if (loans.length === 0) {
    return { state, garnishedTotal: 0, defaultInterestAdded: 0, legalWarnings: [], seizedLoans: [] };
  }

  const currentGameDay = Math.floor((state.gameMinutes ?? 540) / 1440) + 1;
  let cash = state.cash;
  let creditScore = state.creditScore;
  let businesses = [...state.businesses];
  let garnishedTotal = 0;
  let defaultInterestAdded = 0;
  const legalWarnings: LoanRecord[] = [];
  const seizedLoans: Array<{ loan: LoanRecord; business: OwnedBusiness; cashSeized?: number }> = [];
  let changed = false;

  const nextLoans: LoanRecord[] = loans.map((loan) => {
    if (loan.status === 'paid' || loan.status === 'seized') return loan;

    const hasMonthlySchedule = typeof loan.nextDueGameDay === 'number';
    const isLegacyOverdue = now >= loan.dueAt && now >= loan.seizureAt;
    const isGameDayOverdue = hasMonthlySchedule && currentGameDay > (loan.nextDueGameDay ?? 999999);

    // 1) Game-day monthly installment overdue & foreclosure pipeline
    if (isGameDayOverdue) {
      changed = true;
      const newOverdueDays = Math.max(1, currentGameDay - (loan.nextDueGameDay ?? currentGameDay));
      const prevOverdueDays = loan.overdueDays ?? 0;
      const deltaDays = Math.max(0, daysPassed > 0 ? daysPassed : newOverdueDays - prevOverdueDays);

      let remaining = loan.remainingAmount;
      let accruedPenalty = loan.defaultInterestAccrued ?? 0;

      // Sharp credit score hit when first crossing missed installment day (-110 pts)
      if (prevOverdueDays === 0) {
        creditScore = clampCreditScore(creditScore - 110);
      }

      // Daily default (temerrüt) interest: +1.5% of monthly installment per overdue game day
      if (deltaDays > 0) {
        const baseInst = loan.monthlyInstallment ?? Math.round(loan.totalDue / 6);
        const dailyPenalty = Math.max(500, Math.round(baseInst * 0.015 * deltaDays));
        remaining += dailyPenalty;
        accruedPenalty += dailyPenalty;
        defaultInterestAdded += dailyPenalty;
      }

      // 15+ overdue game days -> Legal Tracking Warning
      let warningSent = Boolean(loan.legalWarningSent);
      if (newOverdueDays >= 15 && !warningSent) {
        warningSent = true;
        creditScore = clampCreditScore(creditScore - 40);
        legalWarnings.push({
          ...loan,
          remainingAmount: remaining,
          overdueDays: newOverdueDays,
          defaultInterestAccrued: accruedPenalty,
          legalWarningSent: true,
          status: 'garnishing',
        });
      }

      // 30+ overdue game days -> HACİZ (Foreclosure: cash first, then collateral/lowest business)
      if (newOverdueDays >= 30) {
        const cashSeized = Math.min(cash, remaining);
        if (cashSeized > 0) {
          cash -= cashSeized;
          remaining -= cashSeized;
          garnishedTotal += cashSeized;
        }

        if (remaining <= 0) {
          // Cash fully settled the debt during foreclosure!
          businesses = businesses.map((b) =>
            b.id === loan.collateralBusinessId ? { ...b, pledgedLoanId: undefined } : b
          );
          creditScore = clampCreditScore(creditScore - 80);
          return {
            ...loan,
            remainingAmount: 0,
            overdueDays: newOverdueDays,
            defaultInterestAccrued: accruedPenalty,
            status: 'paid',
          };
        }

        // Cash was not enough -> seize collateral business (or lowest-valued business)
        const targetBiz =
          businesses.find((b) => b.id === loan.collateralBusinessId) ??
          [...businesses].sort((a, b) => a.purchaseCost - b.purchaseCost)[0];

        if (targetBiz) {
          businesses = businesses.filter((b) => b.id !== targetBiz.id);
          seizedLoans.push({
            loan: {
              ...loan,
              remainingAmount: remaining,
              overdueDays: newOverdueDays,
              defaultInterestAccrued: accruedPenalty,
              status: 'seized',
            },
            business: targetBiz,
            cashSeized,
          });
        }
        creditScore = clampCreditScore(creditScore - 150);
        return {
          ...loan,
          remainingAmount: remaining,
          overdueDays: newOverdueDays,
          defaultInterestAccrued: accruedPenalty,
          status: 'seized',
        };
      }

      return {
        ...loan,
        remainingAmount: remaining,
        overdueDays: newOverdueDays,
        defaultInterestAccrued: accruedPenalty,
        legalWarningSent: warningSent,
        status: 'garnishing',
      };
    }

    // 2) Legacy real-time seizure fallback (used only when real-time clock jumps past seizureAt)
    if (isLegacyOverdue) {
      changed = true;
      let remaining = loan.remainingAmount;
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
        return { ...loan, remainingAmount: 0, status: 'paid' };
      }

      const targetBiz =
        businesses.find((b) => b.id === loan.collateralBusinessId) ??
        [...businesses].sort((a, b) => a.purchaseCost - b.purchaseCost)[0];
      if (targetBiz) {
        businesses = businesses.filter((b) => b.id !== targetBiz.id);
        seizedLoans.push({
          loan: { ...loan, remainingAmount: remaining, status: 'seized' },
          business: targetBiz,
        });
      }
      creditScore = clampCreditScore(creditScore - 220);
      return { ...loan, remainingAmount: remaining, status: 'seized' };
    }

    return loan;
  });

  if (!changed) {
    return { state, garnishedTotal: 0, defaultInterestAdded: 0, legalWarnings: [], seizedLoans: [] };
  }

  return {
    garnishedTotal,
    defaultInterestAdded,
    legalWarnings,
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
