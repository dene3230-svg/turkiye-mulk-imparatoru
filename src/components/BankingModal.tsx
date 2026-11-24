import { useState } from 'react';
import {
  X,
  Landmark,
  ShieldAlert,
  CheckCircle2,
  Coins,
  Building2,
  AlertTriangle,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';
import type {
  BankRecord,
  EmpireState,
  ProvinceInfo,
} from '../types/game';
import { BANK_MIN_NET_WORTH } from '../game/catalog';
import {
  CREDIT_TIERS,
  calculateEffectiveInterestRate,
  calculateRequiredCollateral,
  getCreditTier,
} from '../game/bankingEngine';
import { calculateBusinessValuation, formatTL } from '../game/economy';

interface BankingModalProps {
  open: boolean;
  state: EmpireState;
  allBanks: BankRecord[];
  activeProvince: ProvinceInfo;
  netWorth: number;
  now: number;
  onTakeLoan: (bankId: string, amount: number, collateralBusinessId: string) => void;
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
  onSwitchToBorsa?: () => void;
  onSwitchToAccounting?: () => void;
  onClose: () => void;
}

const BANK_COLORS = ['#0F766E', '#1D4ED8', '#B45309', '#7C3AED', '#BE123C', '#0F172A'];
const BANK_EMBLEMS = ['🏦', '🏛️', '💎', '👑', '🦅', '🛡️'];

export function BankingModal({
  open,
  state,
  allBanks,
  activeProvince,
  netWorth,
  now,
  onTakeLoan,
  onRepayLoan,
  onCreateBank,
  onUpdateBank,
  onSwitchToBorsa,
  onSwitchToAccounting,
  onClose,
}: BankingModalProps) {
  const [tab, setTab] = useState<'loans' | 'own-bank'>('loans');
  const [selectedBankId, setSelectedBankId] = useState<string>(allBanks[0]?.id ?? '');
  const [loanAmount, setLoanAmount] = useState<number>(100_000);
  const [collateralBizId, setCollateralBizId] = useState<string>(
    state.businesses.find((b) => !b.pledgedLoanId)?.id ?? ''
  );

  // Own Bank creation / management form
  const [bankName, setBankName] = useState('');
  const [brandColor, setBrandColor] = useState(BANK_COLORS[2]);
  const [emblem, setEmblem] = useState(BANK_EMBLEMS[0]);
  const [poolCapital, setPoolCapital] = useState(5_000_000);
  const [baseRatePct, setBaseRatePct] = useState(12);
  const [minScore, setMinScore] = useState(1000);
  const [addCapital, setAddCapital] = useState(1_000_000);

  if (!open) return null;

  const creditScore = state.creditScore ?? 1100;
  const tier = getCreditTier(creditScore);
  const scorePct = Math.min(100, Math.max(0, (creditScore / 1900) * 100));

  const selectedBank = allBanks.find((b) => b.id === selectedBankId) ?? allBanks[0];
  const freeBusinesses = state.businesses.filter((b) => !b.pledgedLoanId);
  const chosenBiz =
    freeBusinesses.find((b) => b.id === collateralBizId) ?? freeBusinesses[0] ?? null;
  const chosenBizVal = chosenBiz
    ? calculateBusinessValuation(chosenBiz, state.activeEvent, now)
    : 0;

  const effRate = selectedBank
    ? calculateEffectiveInterestRate(selectedBank.baseInterestRate, creditScore)
    : 0.12;
  const reqCollateral = calculateRequiredCollateral(loanAmount, creditScore);
  const activeLoans = (state.activeLoans ?? []).filter(
    (l) => l.status === 'active' || l.status === 'garnishing'
  );

  const canBorrow =
    Boolean(selectedBank) &&
    tier.maxLoanAmount > 0 &&
    creditScore >= (selectedBank?.minCreditScore ?? 700) &&
    loanAmount >= 25_000 &&
    loanAmount <= Math.min(tier.maxLoanAmount, selectedBank?.poolCapital ?? 0) &&
    Boolean(chosenBiz) &&
    chosenBizVal >= reqCollateral;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Finans ve Banka Merkezi"
      data-testid="banking-modal"
      className="fixed inset-0 z-[1260] flex items-center justify-center bg-slate-950/60 p-2.5 safe-inset"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full max-h-[615px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {/* Header with Unified Finance Switcher (Borsa | Banka) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3.5 py-2 dark:border-slate-800 sm:px-4 sm:py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 sm:flex">
              <Landmark className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-[clamp(0.84rem,1.6vw,1rem)] font-bold">
                Finans Merkezi · Banka & Kredi Piyasası
              </h2>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                0–1900 Kredi Puanı · Teminatlı Kredi · Özel Banka & Haciz
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {(onSwitchToBorsa || onSwitchToAccounting) && (
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                {onSwitchToBorsa && (
                  <button
                    type="button"
                    data-testid="finance-switch-borsa"
                    onClick={onSwitchToBorsa}
                    className="flex min-h-[34px] items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white whitespace-nowrap"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span>Borsa</span>
                  </button>
                )}
                <button
                  type="button"
                  data-testid="finance-switch-banka"
                  className="flex min-h-[34px] items-center gap-1 rounded-lg bg-sky-600 px-2.5 text-xs font-bold text-white shadow-xs whitespace-nowrap"
                >
                  <Landmark className="h-3.5 w-3.5" />
                  <span>Banka</span>
                </button>
                {onSwitchToAccounting && (
                  <button
                    type="button"
                    data-testid="finance-switch-accounting"
                    onClick={onSwitchToAccounting}
                    className="flex min-h-[34px] items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white whitespace-nowrap"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Muhasebe</span>
                  </button>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Banka Penceresini Kapat"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Credit Score Strip (0-1900) */}
        <div className="border-b border-slate-200 bg-slate-50/90 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                Kredi Puanınız:
              </span>
              <span
                data-testid="credit-score-value"
                className="font-mono-num text-sm font-extrabold"
                style={{ color: tier.badgeColor }}
              >
                {creditScore} / 1900
              </span>
              <span
                className="rounded-md px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: tier.badgeColor }}
              >
                {tier.label}
              </span>
            </div>
            <div className="font-mono-num text-[11px] text-slate-600 dark:text-slate-300">
              Limit: <strong>{formatTL(tier.maxLoanAmount, true)}</strong> · Faiz Farkı:{' '}
              <strong>
                {tier.rateSpread === 0
                  ? '%0 (Baz)'
                  : tier.rateSpread > 0
                  ? `+%${Math.round(tier.rateSpread * 100)}`
                  : `%${Math.round(tier.rateSpread * 100)} VIP`}
              </strong>{' '}
              · Teminat: <strong>{tier.collateralMultiplier}×</strong>
            </div>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${scorePct}%`, backgroundColor: tier.badgeColor }}
            />
          </div>
          <div className="mt-1 grid grid-cols-5 gap-1 text-[9px] text-slate-500">
            {CREDIT_TIERS.map((t) => (
              <div
                key={t.key}
                className={t.key === tier.key ? 'font-bold text-slate-900 dark:text-white' : ''}
              >
                {t.minScore}–{t.maxScore} {t.label}
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 px-4 py-2 dark:border-slate-800">
          <button
            type="button"
            data-testid="bank-tab-loans"
            onClick={() => setTab('loans')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
              tab === 'loans'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Kredi Çek & Borçlar ({activeLoans.length})
          </button>
          <button
            type="button"
            data-testid="bank-tab-own"
            onClick={() => setTab('own-bank')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
              tab === 'own-bank'
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {state.ownBank ? `Bankam: ${state.ownBank.bankName}` : 'Kendi Bankanı Kur (₺25 Mn)'}
          </button>
        </div>

        {/* Tab Body */}
        <div className="panel-scroll flex-1 p-3.5">
          {tab === 'loans' ? (
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-12">
              {/* Left: Borrow Form */}
              <div className="space-y-2.5 md:col-span-7">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                  <h3 className="text-xs font-bold">Banka Seç & Teminatlı Kredi Kullan</h3>

                  <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {allBanks.map((bank) => {
                      const rate = calculateEffectiveInterestRate(
                        bank.baseInterestRate,
                        creditScore
                      );
                      const isSel = selectedBank?.id === bank.id;
                      return (
                        <button
                          key={bank.id}
                          type="button"
                          onClick={() => setSelectedBankId(bank.id)}
                          className={`rounded-xl border p-2 text-left transition-colors ${
                            isSel
                              ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/35'
                              : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="truncate">
                              {bank.emblem} {bank.bankName}
                            </span>
                            <span className="font-mono-num text-emerald-700 dark:text-emerald-400">
                              %{(rate * 100).toFixed(1)}
                            </span>
                          </div>
                          <div className="mt-0.5 flex justify-between text-[10px] text-slate-500">
                            <span>Havuz: {formatTL(bank.poolCapital, true)}</span>
                            <span>Min Puan: {bank.minCreditScore}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold">Kredi Tutarı (₺)</label>
                      <input
                        type="number"
                        min={25000}
                        max={Math.max(25000, tier.maxLoanAmount)}
                        step={25000}
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono-num text-xs dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold">
                        Teminat İşletme (Min {formatTL(reqCollateral, true)})
                      </label>
                      <select
                        value={chosenBiz?.id ?? ''}
                        onChange={(e) => setCollateralBizId(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
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

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                    <span>
                      Toplam Geri Ödeme (%{(effRate * 100).toFixed(1)} faiz):
                    </span>
                    <strong className="font-mono-num text-slate-900 dark:text-white">
                      {formatTL(Math.round(loanAmount * (1 + effRate)))}
                    </strong>
                  </div>

                  <button
                    type="button"
                    disabled={!canBorrow}
                    onClick={() =>
                      selectedBank &&
                      chosenBiz &&
                      onTakeLoan(selectedBank.id, loanAmount, chosenBiz.id)
                    }
                    className="mt-2.5 w-full rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800"
                  >
                    {tier.maxLoanAmount <= 0
                      ? 'Kara Liste — Kredi Kapalı'
                      : !chosenBiz
                      ? 'Teminat İçin Önce İşletme Kurun'
                      : chosenBizVal < reqCollateral
                      ? `Teminat Yetersiz (Gerekli: ${formatTL(reqCollateral, true)})`
                      : `Krediyi Onayla · ${formatTL(loanAmount)}`}
                  </button>
                </div>
              </div>

              {/* Right: Active Loans & Seizure Countdown */}
              <div className="space-y-2 md:col-span-5">
                <h3 className="text-xs font-bold">Aktif Kredileriniz</h3>
                {activeLoans.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-700">
                    Aktif kredi borcunuz bulunmuyor. Zamanında ödenen krediler kredi puanınızı
                    yükseltir.
                  </div>
                ) : (
                  activeLoans.map((loan) => {
                    const secLeft = Math.max(0, Math.ceil((loan.dueAt - now) / 1000));
                    const seizureSec = Math.max(0, Math.ceil((loan.seizureAt - now) / 1000));
                    const isGarnishing = loan.status === 'garnishing';

                    return (
                      <div
                        key={loan.id}
                        className={`rounded-xl border p-3 ${
                          isGarnishing
                            ? 'border-red-400 bg-red-50/80 dark:border-red-800 dark:bg-red-950/40'
                            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/60'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>{loan.bankName}</span>
                          <span className="font-mono-num text-red-600 dark:text-red-400">
                            Kalan: {formatTL(loan.remainingAmount)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                          <Building2 className="h-3 w-3" />
                          <span>Teminat: {loan.collateralBusinessName}</span>
                        </div>
                        <div className="mt-1.5 text-[11px] font-semibold">
                          {isGarnishing ? (
                            <span className="flex items-center gap-1 text-red-700 dark:text-red-300">
                              <ShieldAlert className="h-3.5 w-3.5" />
                              Gelire El Konuluyor! Otomatik Haciz: {seizureSec}sn
                            </span>
                          ) : (
                            <span className="text-slate-600 dark:text-slate-300">
                              Vade Kalan Süre: <strong className="font-mono-num">{secLeft}sn</strong>
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={state.cash < loan.remainingAmount}
                          onClick={() => onRepayLoan(loan.id)}
                          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                        >
                          <Coins className="h-3.5 w-3.5" />
                          <span>Borcu Kapat (+65 Puan)</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : state.ownBank ? (
            <div className="mx-auto max-w-2xl space-y-3 rounded-xl border border-amber-300/70 bg-amber-50/40 p-4 dark:border-amber-800/70 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-xl text-white"
                    style={{ backgroundColor: state.ownBank.brandColor }}
                  >
                    {state.ownBank.emblem}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{state.ownBank.bankName}</h3>
                    <div className="text-[11px] text-slate-500">
                      Genel Müdürlük: {state.ownBank.hqCityName} · Kredi Havuzu:{' '}
                      <strong className="font-mono-num text-emerald-700 dark:text-emerald-400">
                        {formatTL(state.ownBank.poolCapital)}
                      </strong>
                    </div>
                  </div>
                </div>
                <span className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Faaliyette
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-[10px] text-slate-500">Baz Faiz</div>
                  <div className="font-mono-num font-bold">
                    %{Math.round(state.ownBank.baseInterestRate * 100)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-[10px] text-slate-500">Min Kredi Puanı</div>
                  <div className="font-mono-num font-bold">{state.ownBank.minCreditScore}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-[10px] text-slate-500">Haczedilen Mülk</div>
                  <div className="font-mono-num font-bold">{state.ownBank.seizedAssetsCount}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-semibold">
                    Havuz Sermayesi Ekle (₺)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500000}
                    value={addCapital}
                    onChange={(e) => setAddCapital(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono-num text-xs dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold">
                    Baz Faiz (%5–%30): %{baseRatePct}
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={30}
                    value={baseRatePct}
                    onChange={(e) => setBaseRatePct(Number(e.target.value))}
                    className="mt-2.5 w-full accent-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold">
                    Min Kredi Puanı: {minScore}
                  </label>
                  <input
                    type="range"
                    min={700}
                    max={1600}
                    step={50}
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="mt-2.5 w-full accent-amber-600"
                  />
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
                className="w-full rounded-xl bg-amber-600 py-2 text-xs font-bold text-white hover:bg-amber-700"
              >
                Banka Politikalarını & Sermayeyi Güncelle
              </button>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <h3 className="text-sm font-bold">Kendi Bankanı Kur (BDDK Lisansı)</h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Şirket değeri <strong>₺25.000.000</strong> seviyesine ulaşan holdingler kendi
                bankasını kurabilir, faiz ve puan filtresini belirleyip diğer oyunculara kredi
                verebilir.
              </p>

              {netWorth < BANK_MIN_NET_WORTH ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Mevcut Net Değeriniz: {formatTL(netWorth)} / Gerekli: ₺25.000.000
                  </span>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-semibold">Banka Adı</label>
                      <input
                        type="text"
                        maxLength={42}
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Örn: Boğaziçi Holding Bankası"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold">
                        Genel Müdürlük İli (Harita Konumu)
                      </label>
                      <div className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900">
                        {activeProvince.code} {activeProvince.name} ({activeProvince.lat.toFixed(2)},{' '}
                        {activeProvince.lng.toFixed(2)})
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1">
                      {BANK_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setBrandColor(c)}
                          className={`h-6 w-6 rounded-full border-2 ${
                            brandColor === c ? 'border-slate-900 scale-110 dark:border-white' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      {BANK_EMBLEMS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setEmblem(e)}
                          className={`h-7 w-7 rounded-lg text-sm ${
                            emblem === e ? 'bg-amber-200 dark:bg-amber-800' : 'bg-slate-200/70 dark:bg-slate-800'
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold">
                        İlk Kredi Havuzu (₺)
                      </label>
                      <input
                        type="number"
                        min={1000000}
                        step={500000}
                        value={poolCapital}
                        onChange={(e) => setPoolCapital(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono-num text-xs dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold">
                        Baz Faiz (%{baseRatePct})
                      </label>
                      <input
                        type="range"
                        min={5}
                        max={30}
                        value={baseRatePct}
                        onChange={(e) => setBaseRatePct(Number(e.target.value))}
                        className="mt-2.5 w-full accent-amber-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold">
                        Min Puan ({minScore})
                      </label>
                      <input
                        type="range"
                        min={700}
                        max={1600}
                        step={50}
                        value={minScore}
                        onChange={(e) => setMinScore(Number(e.target.value))}
                        className="mt-2.5 w-full accent-amber-600"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={bankName.trim().length < 3 || state.cash < poolCapital + 2_000_000}
                    onClick={() =>
                      onCreateBank({
                        bankName: bankName.trim(),
                        brandColor,
                        emblem,
                        hqCityPlate: activeProvince.plate,
                        hqCityName: activeProvince.name,
                        hqLat: activeProvince.lat,
                        hqLng: activeProvince.lng,
                        initialPoolCapital: poolCapital,
                        baseInterestRate: baseRatePct / 100,
                        minCreditScore: minScore,
                      })
                    }
                    className="w-full rounded-xl bg-amber-600 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    Bankayı Kur · Lisans (₺2 Mn) + Havuz ({formatTL(poolCapital, true)})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
