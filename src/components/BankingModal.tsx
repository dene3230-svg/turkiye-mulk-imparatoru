import { useState } from 'react';
import {
  Landmark,
  ShieldAlert,
  CheckCircle2,
  Coins,
  Building2,
  Lock,
  BarChart3,
  FileSpreadsheet,
  Wallet,
  CalendarClock,
  ShieldCheck,
} from 'lucide-react';
import type { BankRecord, EmpireState, ProvinceInfo } from '../types/game';
import {
  BANK_LICENSE_COST,
  BANK_MIN_NET_WORTH,
  BANK_MIN_POOL_CAPITAL,
} from '../game/catalog';
import {
  CREDIT_TIERS,
  calculateEffectiveInterestRate,
  calculateRequiredCollateral,
  evaluateLoanEligibility,
  getCreditTier,
} from '../game/bankingEngine';
import { calculateOfficeBenefits } from '../game/officeEngine';
import { getCurrentGameDay } from '../game/corporateEngine';
import { calculateBusinessValuation, formatTL } from '../game/economy';
import { MobileGameModal, type MobileModalTab } from './MobileGameModal';
import { BrandLogo } from './BrandLogo';

interface BankingModalProps {
  open: boolean;
  state: EmpireState;
  allBanks: BankRecord[];
  activeProvince: ProvinceInfo;
  netWorth: number;
  now: number;
  onTakeLoan: (
    bankId: string,
    amount: number,
    collateralBusinessId: string,
    termMonths: number
  ) => void;
  onPayInstallment?: (loanId: string) => void;
  onRepayLoan: (loanId: string) => void;
  onCreateBank: (params: {
    bankName: string;
    brandColor: string;
    emblem: string;
    hqCityPlate: number;
    hqCityName: string;
    hqLat: number;
    hqLng: number;
    initialPoolCapital: number;
    baseInterestRate: number;
    minCreditScore: number;
  }) => void;
  onUpdateBank: (params: {
    addCapital?: number;
    baseInterestRate?: number;
    minCreditScore?: number;
  }) => void;
  onSwitchToAccounting?: () => void;
  onSwitchToBorsa?: () => void;
  onSwitchToInvestments?: () => void;
  onClose: () => void;
}

const BANK_COLORS = ['#0F766E', '#1D4ED8', '#B45309', '#7C3AED', '#BE123C', '#0891B2'];
const MIN_LOAN_AMOUNT = 100_000;
const TERM_OPTIONS = [3, 6, 12];

export function BankingModal({
  open,
  state,
  allBanks,
  activeProvince,
  netWorth,
  now,
  onTakeLoan,
  onPayInstallment,
  onRepayLoan,
  onCreateBank,
  onUpdateBank,
  onSwitchToAccounting,
  onSwitchToBorsa,
  onSwitchToInvestments,
  onClose,
}: BankingModalProps) {
  const [subTab, setSubTab] = useState<'loans' | 'own-bank'>('loans');
  const [selectedBankId, setSelectedBankId] = useState<string>(allBanks[0]?.id ?? '');
  const [loanAmount, setLoanAmount] = useState<number>(500_000);
  const [termMonths, setTermMonths] = useState<number>(6);
  const [collateralBizId, setCollateralBizId] = useState<string>(
    state.businesses.find((b) => !b.pledgedLoanId)?.id ?? ''
  );

  // Own Bank creation / management form (multi-billion TL scale)
  const [bankName, setBankName] = useState('');
  const [brandColor, setBrandColor] = useState(BANK_COLORS[2]);
  const [poolCapital, setPoolCapital] = useState(BANK_MIN_POOL_CAPITAL);
  const [baseRatePct, setBaseRatePct] = useState(14);
  const [minScore, setMinScore] = useState(1050);
  const [addCapital, setAddCapital] = useState(250_000_000);

  if (!open) return null;

  const currentGameDay = getCurrentGameDay(state.gameMinutes);
  const creditScore = state.creditScore ?? 1100;
  const tier = getCreditTier(creditScore);
  const officeBenefits = calculateOfficeBenefits(state);
  const scorePct = Math.min(100, Math.max(0, (creditScore / 1900) * 100));

  const selectedBank = allBanks.find((b) => b.id === selectedBankId) ?? allBanks[0];
  const freeBusinesses = state.businesses.filter((b) => !b.pledgedLoanId);
  const chosenBiz =
    freeBusinesses.find((b) => b.id === collateralBizId) ?? freeBusinesses[0] ?? null;
  const chosenBizVal = chosenBiz
    ? calculateBusinessValuation(chosenBiz, state.activeEvent, now)
    : 0;

  const maxLoanForPlayer = Math.max(
    MIN_LOAN_AMOUNT,
    Math.min(
      tier.maxLoanAmount > 0
        ? Math.round(tier.maxLoanAmount * officeBenefits.loanLimitMultiplier)
        : MIN_LOAN_AMOUNT,
      selectedBank?.poolCapital ?? tier.maxLoanAmount
    )
  );
  const sliderStep =
    maxLoanForPlayer >= 50_000_000 ? 500_000 : maxLoanForPlayer >= 5_000_000 ? 100_000 : 50_000;
  const clampedLoanAmount = Math.min(maxLoanForPlayer, Math.max(MIN_LOAN_AMOUNT, loanAmount));

  const eligibility = selectedBank
    ? evaluateLoanEligibility(
        state,
        selectedBank,
        clampedLoanAmount,
        chosenBiz,
        chosenBizVal
      )
    : null;

  const effRate = selectedBank
    ? calculateEffectiveInterestRate(
        selectedBank.baseInterestRate,
        creditScore,
        officeBenefits.loanInterestDiscount
      )
    : 0.14;
  const totalInterest = Math.round(clampedLoanAmount * effRate);
  const totalRepayment = clampedLoanAmount + totalInterest;
  const estimatedMonthlyInstallment = Math.ceil(totalRepayment / termMonths);
  const reqCollateral = calculateRequiredCollateral(clampedLoanAmount, creditScore);
  const activeLoans = (state.activeLoans ?? []).filter(
    (l) => l.status === 'active' || l.status === 'garnishing'
  );
  const holdingCount = (state.stockPortfolio ?? []).filter((h) => h.shares > 0).length;

  const canOpenOwnBank = Boolean(state.ownBank) || netWorth >= BANK_MIN_NET_WORTH;
  const effectiveSubTab = subTab === 'own-bank' && !canOpenOwnBank ? 'loans' : subTab;

  const canBorrow = Boolean(selectedBank) && Boolean(eligibility?.eligible);

  const topTabs: MobileModalTab[] = [
    ...(onSwitchToAccounting
      ? [{ id: 'muhasebe', label: 'Muhasebe', icon: <FileSpreadsheet className="h-4 w-4" /> }]
      : []),
    { id: 'banka', label: 'Banka & Kredi', icon: <Landmark className="h-4 w-4" /> },
    ...(onSwitchToBorsa
      ? [{ id: 'borsa', label: 'Borsa & Yatırım', icon: <BarChart3 className="h-4 w-4" /> }]
      : []),
    ...(onSwitchToInvestments
      ? [
          {
            id: 'yatirimlarim',
            label: 'Yatırımlarım',
            badge: holdingCount > 0 ? holdingCount : undefined,
            icon: <Wallet className="h-4 w-4" />,
          },
        ]
      : []),
  ];

  return (
    <div data-testid="banking-modal">
      <MobileGameModal
        title="Finans Merkezi"
        subtitle="Banka & 30 Günlük Aylık Kredi Sistemi"
        icon={<Landmark className="h-4 w-4" />}
        tabs={topTabs}
        activeTabId="banka"
        onSelectTab={(id) => {
          if (id === 'muhasebe') onSwitchToAccounting?.();
          if (id === 'borsa') onSwitchToBorsa?.();
          if (id === 'yatirimlarim') onSwitchToInvestments?.();
        }}
        subHeader={
          <div className="flex items-center justify-between gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="bank-tab-loans"
                onClick={() => setSubTab('loans')}
                className={`min-h-[40px] shrink-0 rounded-lg border px-3.5 text-xs font-bold transition-all duration-200 ease-out active:scale-[0.98] ${
                  effectiveSubTab === 'loans'
                    ? 'border-emerald-300/80 bg-emerald-500 text-slate-950 font-black'
                    : 'border-slate-500/60 bg-slate-800/85 text-slate-100 hover:border-slate-400 hover:bg-slate-700'
                }`}
              >
                Kredi Çek & Taksitler ({activeLoans.length})
              </button>
              <button
                type="button"
                data-testid="bank-tab-own"
                disabled={!canOpenOwnBank}
                title={
                  !canOpenOwnBank
                    ? `BDDK şartı: Kendi bankanızı kurmak için ₺5 Milyar net değer gerekir (Mevcut: ${formatTL(netWorth, true)})`
                    : undefined
                }
                onClick={() => canOpenOwnBank && setSubTab('own-bank')}
                className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg border px-3.5 text-xs font-bold transition-all duration-200 ease-out active:scale-[0.98] ${
                  !canOpenOwnBank
                    ? 'cursor-not-allowed border-slate-700/80 bg-slate-900/70 text-slate-500 opacity-70'
                    : effectiveSubTab === 'own-bank'
                    ? 'border-amber-300/80 bg-amber-400 text-slate-950 font-black'
                    : 'border-slate-500/60 bg-slate-800/85 text-slate-100 hover:border-slate-400 hover:bg-slate-700'
                }`}
              >
                {!canOpenOwnBank && <Lock className="h-3.5 w-3.5" />}
                <span>
                  {state.ownBank
                    ? `Bankam: ${state.ownBank.bankName}`
                    : 'Kendi Bankanı Kur (₺5 Milyar)'}
                </span>
              </button>
            </div>

            <span className="shrink-0 rounded-lg border border-slate-600/70 bg-slate-950 px-2.5 py-1 font-mono-num text-xs font-bold text-amber-300">
              Gün {currentGameDay}
            </span>
          </div>
        }
        onClose={onClose}
        zIndexClass="z-[1260]"
      >
        {/* Credit Score Card */}
        <section className="rounded-xl border border-slate-600/60 bg-slate-900/85 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">Kredi Puanı:</span>
              <span
                data-testid="credit-score-value"
                className="font-mono-num text-sm font-black"
                style={{ color: tier.badgeColor }}
              >
                {creditScore} / 1900
              </span>
              <span
                className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
                style={{ backgroundColor: tier.badgeColor }}
              >
                {tier.label}
              </span>
            </div>
            <div className="font-mono-num text-xs text-slate-300">
              Dinamik Limit:{' '}
              <strong className="text-white">{formatTL(tier.maxLoanAmount, true)}</strong> ·
              Teminat: <strong className="text-amber-300">{tier.collateralMultiplier}×</strong>
            </div>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${scorePct}%`, backgroundColor: tier.badgeColor }}
            />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              Faiz Farkı:{' '}
              <strong className="text-slate-100">
                {tier.rateSpread === 0
                  ? '%0 (Baz)'
                  : tier.rateSpread > 0
                  ? `+%${Math.round(tier.rateSpread * 100)}`
                  : `%${Math.round(tier.rateSpread * 100)} VIP`}
              </strong>
            </span>
            <span>
              Zamanında Aylık Taksit: <strong className="text-emerald-400">+40 Puan</strong> ·
              Gecikme: <strong className="text-rose-400">-110 Puan & %1.5/gün</strong>
            </span>
          </div>
          <div className="mt-2 hidden grid-cols-5 gap-1 text-[11px] text-slate-400 min-[900px]:grid">
            {CREDIT_TIERS.map((t) => (
              <div
                key={t.key}
                className={t.key === tier.key ? 'font-bold text-amber-300' : ''}
              >
                {t.minScore}–{t.maxScore} {t.label}
              </div>
            ))}
          </div>
        </section>

        {/* Muhasebeci Auto-Pay Banner */}
        {state.accountant && (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-400/50 bg-emerald-950/35 px-3 py-2 text-xs text-emerald-200">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              <strong>{state.accountant.name}</strong> ({state.accountant.title}) görevde: Aylık
              kredi taksitleriniz vade günü otomatik ödenerek gecikme ve haciz riskini önler.
            </span>
          </div>
        )}

        {effectiveSubTab === 'loans' ? (
          <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
            {/* Borrow Card */}
            <section className="rounded-xl border border-slate-600/60 bg-slate-900/80 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Banka Seç & Kredi Kullan</h3>
                <span className="text-xs font-semibold text-slate-400">
                  {allBanks.length} Banka · 30 Günlük Aylık Vade
                </span>
              </div>

              {/* Strict Bank Credit Qualification Audit (v1.4.1) */}
              {eligibility && (
                <div
                  data-testid="loan-eligibility-audit"
                  className={`rounded-xl border p-2.5 space-y-1.5 text-xs ${
                    eligibility.eligible
                      ? 'border-emerald-500/45 bg-emerald-950/25'
                      : 'border-rose-500/45 bg-rose-950/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 font-bold">
                    <span
                      className={
                        eligibility.eligible ? 'text-emerald-300' : 'text-rose-300'
                      }
                    >
                      {eligibility.eligible
                        ? 'Banka Kredi Denetimi Onaylandı'
                        : 'Kredi Başvurusu Şu An Reddedilir (Eksik Kriterler)'}
                    </span>
                    <span className="font-mono-num text-[11px] text-slate-300">
                      Ofis İndirimi: -%{(officeBenefits.loanInterestDiscount * 100).toFixed(1)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {eligibility.checks.map((chk) => (
                      <div
                        key={chk.id}
                        className={`flex items-start gap-1.5 rounded-lg px-2 py-1 text-[11px] ${
                          chk.passed
                            ? 'bg-emerald-500/10 text-emerald-200'
                            : 'bg-rose-500/15 text-rose-200'
                        }`}
                      >
                        {chk.passed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400 mt-0.5" />
                        ) : (
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-rose-400 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <div className="font-bold leading-tight">{chk.label}</div>
                          <div className="text-[10px] opacity-90 leading-snug">{chk.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bank Selector List */}
              <div className="grid grid-cols-1 gap-2">
                {allBanks.map((bank) => {
                  const rate = calculateEffectiveInterestRate(
                    bank.baseInterestRate,
                    creditScore,
                    officeBenefits.loanInterestDiscount
                  );
                  const isSel = selectedBank?.id === bank.id;
                  const scoreOk = creditScore >= bank.minCreditScore;
                  return (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => setSelectedBankId(bank.id)}
                      className={`flex min-h-[56px] w-full items-center justify-between gap-3 rounded-lg border p-2.5 text-left transition-all duration-200 ease-out active:scale-[0.98] ${
                        isSel
                          ? 'border-amber-400/85 bg-amber-400/15 shadow-md shadow-amber-500/10'
                          : 'border-slate-500/60 bg-slate-950/75 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <BrandLogo
                          brandKey={bank.id || bank.bankName}
                          customColor={bank.brandColor}
                          size={38}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-white sm:text-sm">
                            {bank.bankName}
                          </div>
                          <div className="text-xs text-slate-400">
                            Havuz:{' '}
                            <span className="font-mono-num text-slate-200">
                              {formatTL(bank.poolCapital, true)}
                            </span>{' '}
                            · Min Puan:{' '}
                            <span
                              className={
                                scoreOk ? 'font-bold text-emerald-400' : 'font-bold text-rose-400'
                              }
                            >
                              {bank.minCreditScore}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono-num text-sm font-black text-emerald-400">
                          %{(rate * 100).toFixed(1)}
                        </div>
                        <div className="text-[11px] text-slate-400">Etkin Faiz</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Loan Amount Fluid Range Slider, Term Months & Collateral Selector */}
              <div className="space-y-3 rounded-xl border border-slate-600/60 bg-slate-950/75 p-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="loan-amount-range"
                      className="text-xs font-semibold text-slate-300"
                    >
                      Kredi Tutarı
                    </label>
                    <span
                      data-testid="loan-slider-amount"
                      className="font-mono-num text-base font-black text-amber-300"
                    >
                      {formatTL(clampedLoanAmount)}
                    </span>
                  </div>

                  <input
                    id="loan-amount-range"
                    data-testid="loan-amount-slider"
                    type="range"
                    min={MIN_LOAN_AMOUNT}
                    max={maxLoanForPlayer}
                    step={sliderStep}
                    disabled={tier.maxLoanAmount <= 0}
                    value={clampedLoanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="mt-2 h-2.5 w-full cursor-pointer rounded-lg border border-slate-600/70 bg-slate-800 accent-amber-400 disabled:opacity-40"
                  />

                  <div className="mt-1 flex items-center justify-between font-mono-num text-[11px] text-slate-400">
                    <span>Min: {formatTL(MIN_LOAN_AMOUNT, true)}</span>
                    <span>Limit: {formatTL(maxLoanForPlayer, true)}</span>
                  </div>

                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {[
                      { label: '%25', ratio: 0.25 },
                      { label: '%50', ratio: 0.5 },
                      { label: '%75', ratio: 0.75 },
                      { label: 'Maks', ratio: 1 },
                    ].map((preset) => {
                      const raw =
                        Math.round((maxLoanForPlayer * preset.ratio) / sliderStep) * sliderStep;
                      const val = Math.min(maxLoanForPlayer, Math.max(MIN_LOAN_AMOUNT, raw));
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          disabled={tier.maxLoanAmount <= 0}
                          onClick={() => setLoanAmount(val)}
                          className={`min-h-[36px] rounded-lg border text-xs font-bold transition-all duration-200 ease-out active:scale-[0.98] ${
                            clampedLoanAmount === val
                              ? 'border-amber-300/85 bg-amber-400 text-slate-950 font-black'
                              : 'border-slate-500/60 bg-slate-900 text-slate-200 hover:border-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Monthly Installment Term Selector */}
                <div>
                  <span className="block text-xs font-semibold text-slate-300">
                    Vade Seçimi (Her 30 Oyun Günü = 1 Taksit)
                  </span>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {TERM_OPTIONS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        data-testid={`loan-term-${m}`}
                        onClick={() => setTermMonths(m)}
                        className={`min-h-[38px] rounded-lg border text-xs font-bold transition-all duration-200 ease-out active:scale-[0.98] ${
                          termMonths === m
                            ? 'border-amber-300/85 bg-amber-400 text-slate-950 font-black'
                            : 'border-slate-500/60 bg-slate-900 text-slate-200 hover:border-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {m} Ay ({m * 30} Gün)
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Teminat İşletme (Gerekli: {formatTL(reqCollateral, true)})
                  </label>
                  <select
                    value={chosenBiz?.id ?? ''}
                    onChange={(e) => setCollateralBizId(e.target.value)}
                    className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-500/70 bg-slate-950 px-3 text-xs font-semibold text-white"
                  >
                    {freeBusinesses.length === 0 ? (
                      <option value="">Teminat gösterecek işletme yok</option>
                    ) : (
                      freeBusinesses.map((b) => {
                        const val = calculateBusinessValuation(b, state.activeEvent, now);
                        return (
                          <option key={b.id} value={b.id}>
                            {b.customName} ({formatTL(val, true)})
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>
              </div>

              {/* Repayment Summary + Confirm CTA */}
              <div className="rounded-xl border border-slate-600/70 bg-slate-950/90 p-3 space-y-2.5">
                <div className="grid grid-cols-3 gap-2 border-b border-slate-800 pb-2 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-400">Etkin Faiz</div>
                    <div className="font-mono-num font-bold text-white">
                      %{(effRate * 100).toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Aylık Taksit</div>
                    <div className="font-mono-num font-black text-emerald-400">
                      {formatTL(estimatedMonthlyInstallment, true)}/ay
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Faiz Tutarı</div>
                    <div className="font-mono-num font-bold text-rose-400">
                      +{formatTL(totalInterest, true)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-300">
                    Toplam Geri Ödeme ({termMonths} Taksit):
                  </span>
                  <strong className="font-mono-num text-base font-black text-amber-300">
                    {formatTL(totalRepayment)}
                  </strong>
                </div>

                <button
                  type="button"
                  data-testid="confirm-loan-btn"
                  disabled={!canBorrow}
                  onClick={() =>
                    selectedBank &&
                    chosenBiz &&
                    onTakeLoan(selectedBank.id, clampedLoanAmount, chosenBiz.id, termMonths)
                  }
                  className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg border border-amber-300/80 bg-amber-400 px-4 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition-all duration-200 ease-out hover:bg-amber-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-400 disabled:shadow-none"
                >
                  <Coins className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {!eligibility?.eligible && eligibility?.reasons[0]
                      ? `Reddedildi: ${eligibility.reasons[0]}`
                      : `Krediyi Onayla · ${formatTL(clampedLoanAmount)}`}
                  </span>
                </button>
              </div>
            </section>

            {/* Active Loans List */}
            <section className="rounded-xl border border-slate-600/60 bg-slate-900/80 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  Aktif Krediler & Aylık Taksitler ({activeLoans.length})
                </h3>
                <span className="text-[11px] text-slate-400">15g Uyarı · 30g Haciz</span>
              </div>
              {activeLoans.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-600 p-6 text-center text-xs text-slate-300 leading-relaxed">
                  Aktif kredi borcunuz bulunmuyor. 30 günlük taksitleri zamanında ödedikçe kredi
                  puanınız <strong className="text-emerald-400">+40/+60 puan</strong> artar, dinamik
                  limitiniz büyür ve faiz oranlarınız düşer.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeLoans.map((loan) => {
                    const dueDay = loan.nextDueGameDay ?? currentGameDay + 30;
                    const daysUntilDue = dueDay - currentGameDay;
                    const overdueDays = loan.overdueDays ?? 0;
                    const isOverdue = overdueDays > 0 || loan.status === 'garnishing';
                    const isLegalWarning = overdueDays >= 15;
                    const installmentAmt = Math.min(
                      loan.remainingAmount,
                      loan.monthlyInstallment ?? loan.remainingAmount
                    );
                    const totalMonths = loan.termMonths ?? 6;
                    const paidMonths = loan.paidMonths ?? 0;

                    return (
                      <div
                        key={loan.id}
                        data-testid={`active-loan-${loan.id}`}
                        className={`rounded-xl border p-3 space-y-2.5 ${
                          isLegalWarning
                            ? 'border-rose-400/80 bg-rose-950/45'
                            : isOverdue
                            ? 'border-amber-400/75 bg-amber-950/30'
                            : 'border-slate-600/60 bg-slate-950/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <BrandLogo brandKey={loan.bankId || loan.bankName} size={30} />
                            <div className="min-w-0">
                              <div className="truncate text-xs font-bold text-white">
                                {loan.bankName}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                Taksit {paidMonths}/{totalMonths} · Teminat:{' '}
                                {loan.collateralBusinessName}
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="font-mono-num text-xs font-black text-rose-400">
                              Kalan: {formatTL(loan.remainingAmount)}
                            </div>
                            <div className="font-mono-num text-[11px] font-bold text-amber-300">
                              Aylık: {formatTL(installmentAmt)}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-700/80 bg-slate-900/80 px-2.5 py-2 text-xs font-semibold">
                          {isLegalWarning ? (
                            <div className="flex items-center gap-1.5 text-rose-300">
                              <ShieldAlert className="h-4 w-4 shrink-0" />
                              <span>
                                YASAL TAKİP UYARISI ({overdueDays}/30 gün gecikme)! 30. günde nakit
                                & {loan.collateralBusinessName} haczedilir.
                              </span>
                            </div>
                          ) : isOverdue ? (
                            <div className="flex items-center justify-between gap-2 text-amber-300">
                              <span className="flex items-center gap-1.5">
                                <ShieldAlert className="h-4 w-4 shrink-0" />
                                {overdueDays} gün gecikmede (Temerrüt: +
                                {formatTL(loan.defaultInterestAccrued ?? 0, true)})
                              </span>
                              <span className="font-mono-num text-[11px] text-rose-300">
                                Hacze {Math.max(0, 30 - overdueDays)} gün
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2 text-slate-200">
                              <span className="flex items-center gap-1.5">
                                <CalendarClock className="h-3.5 w-3.5 text-emerald-400" />
                                Son Ödeme: <strong className="text-white">Gün {dueDay}</strong>
                              </span>
                              <span className="font-mono-num text-[11px] text-emerald-400">
                                {Math.max(0, daysUntilDue)} gün kaldı
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                          {onPayInstallment && (
                            <button
                              type="button"
                              data-testid={`pay-installment-${loan.id}`}
                              disabled={state.cash < installmentAmt}
                              onClick={() => onPayInstallment(loan.id)}
                              className="flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-300/80 bg-emerald-500 px-3 text-xs font-black text-slate-950 transition-all duration-200 ease-out hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
                            >
                              <Coins className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                Taksit Öde ({formatTL(installmentAmt, true)})
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={state.cash < loan.remainingAmount}
                            onClick={() => onRepayLoan(loan.id)}
                            className="flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-300/75 bg-amber-400/20 px-3 text-xs font-black text-amber-200 transition-all duration-200 ease-out hover:bg-amber-400/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
                          >
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            <span>Tümünü Kapat (+65)</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        ) : state.ownBank ? (
          /* Own Bank Management */
          <section className="rounded-xl border border-amber-400/50 bg-slate-900/85 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <BrandLogo
                  brandKey={state.ownBank.bankName}
                  customColor={state.ownBank.brandColor}
                  size={44}
                />
                <div>
                  <h3 className="text-sm font-black text-white">{state.ownBank.bankName}</h3>
                  <div className="text-xs text-slate-300">
                    Genel Müdürlük: {state.ownBank.hqCityName} · Havuz:{' '}
                    <strong className="font-mono-num text-emerald-400">
                      {formatTL(state.ownBank.poolCapital)}
                    </strong>
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/50 bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Faaliyette
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 min-[900px]:grid-cols-2">
              <div className="rounded-lg border border-slate-700 bg-slate-950/75 p-3">
                <div className="text-xs text-slate-400">Baz Faiz / Min Puan</div>
                <div className="mt-1 font-mono-num text-sm font-black text-white">
                  %{Math.round(state.ownBank.baseInterestRate * 100)} · Min{' '}
                  {state.ownBank.minCreditScore} Puan
                </div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-950/75 p-3">
                <div className="text-xs text-slate-400">Haczedilen Mülk / Verilen Kredi</div>
                <div className="mt-1 font-mono-num text-sm font-black text-amber-300">
                  {state.ownBank.seizedAssetsCount} Mülk · {state.ownBank.totalLoansIssued} Kredi
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Havuz Sermayesi Ekle (₺)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500000}
                  value={addCapital}
                  onChange={(e) => setAddCapital(Number(e.target.value))}
                  className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-500/70 bg-slate-950 px-3 font-mono-num text-sm text-white"
                />
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Baz Faiz (%5–%30): %{baseRatePct}
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={30}
                    value={baseRatePct}
                    onChange={(e) => setBaseRatePct(Number(e.target.value))}
                    className="mt-1 w-full accent-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Min Kredi Puanı: {minScore}
                  </label>
                  <input
                    type="range"
                    min={700}
                    max={1600}
                    step={50}
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="mt-1 w-full accent-amber-400"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                onUpdateBank({
                  addCapital,
                  baseInterestRate: baseRatePct / 100,
                  minCreditScore: minScore,
                })
              }
              className="min-h-[44px] w-full rounded-lg border border-amber-300/80 bg-amber-400 px-4 text-sm font-black text-slate-950 transition-all duration-200 ease-out hover:bg-amber-300 active:scale-[0.98]"
            >
              Banka Politikalarını & Sermayeyi Güncelle
            </button>
          </section>
        ) : (
          /* Create Own Bank Form (Only reachable when netWorth >= ₺5 Milyar) */
          <section className="rounded-xl border border-slate-600/60 bg-slate-900/85 p-4 space-y-3">
            <h3 className="text-sm font-black text-white">Kendi Bankanı Kur (BDDK Milyarlık Lisans)</h3>
            <p className="text-xs text-slate-300">
              Holdinginizin net değeri ₺5 Milyar BDDK eşiğini geçti. ₺1 Milyar lisans + en az ₺2 Milyar kredi havuzu ile kendi bankanızı kurup diğer şirketlere ticari kredi kullandırabilirsiniz.
            </p>

            <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300">Banka Adı</label>
                <input
                  type="text"
                  maxLength={42}
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Örn: Boğaziçi Yatırım Bankası"
                  className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-500/70 bg-slate-950 px-3 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Genel Müdürlük İli
                </label>
                <div className="mt-1 flex min-h-[42px] items-center rounded-lg border border-slate-600 bg-slate-950 px-3 text-xs font-bold text-amber-300">
                  {activeProvince.code} {activeProvince.name}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <BrandLogo brandKey={bankName || 'Yeni Banka'} customColor={brandColor} size={42} />
              <div className="flex items-center gap-2">
                {BANK_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Renk ${c}`}
                    onClick={() => setBrandColor(c)}
                    className={`h-8 w-8 rounded-full border-2 transition-all duration-200 active:scale-95 ${
                      brandColor === c ? 'scale-110 border-white' : 'border-slate-600'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  İlk Kredi Havuzu (₺)
                </label>
                <input
                  type="number"
                  min={BANK_MIN_POOL_CAPITAL}
                  step={250000000}
                  value={poolCapital}
                  onChange={(e) => setPoolCapital(Number(e.target.value))}
                  className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-500/70 bg-slate-950 px-3 font-mono-num text-sm text-white"
                />
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Baz Faiz (%{baseRatePct})
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={30}
                    value={baseRatePct}
                    onChange={(e) => setBaseRatePct(Number(e.target.value))}
                    className="mt-1 w-full accent-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Min Puan ({minScore})
                  </label>
                  <input
                    type="range"
                    min={700}
                    max={1600}
                    step={50}
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="mt-1 w-full accent-amber-400"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={
                bankName.trim().length < 3 ||
                state.cash < Math.max(BANK_MIN_POOL_CAPITAL, poolCapital) + BANK_LICENSE_COST
              }
              onClick={() =>
                onCreateBank({
                  bankName: bankName.trim(),
                  brandColor,
                  emblem: 'bank',
                  hqCityPlate: activeProvince.plate,
                  hqCityName: activeProvince.name,
                  hqLat: activeProvince.lat,
                  hqLng: activeProvince.lng,
                  initialPoolCapital: Math.max(BANK_MIN_POOL_CAPITAL, poolCapital),
                  baseInterestRate: baseRatePct / 100,
                  minCreditScore: minScore,
                })
              }
              className="min-h-[46px] w-full rounded-lg border border-amber-300/80 bg-amber-400 px-4 text-sm font-black text-slate-950 transition-all duration-200 ease-out hover:bg-amber-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
            >
              Bankayı Kur · Lisans (₺1 Mr) + Havuz ({formatTL(Math.max(BANK_MIN_POOL_CAPITAL, poolCapital), true)})
            </button>
          </section>
        )}
      </MobileGameModal>
    </div>
  );
}
