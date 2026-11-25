import { useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  BarChart3,
  Landmark,
  TrendingUp,
  TrendingDown,
  Zap,
  AlertTriangle,
  Sparkles,
  CalendarDays,
  Wallet,
  Receipt,
  ShieldCheck,
  Calculator,
  Coins,
  Scale,
  Hammer,
  CalendarCheck2,
} from 'lucide-react';
import type { EmpireState, StockQuote } from '../types/game';
import {
  buildPeriodAccountingSummary,
  calculateAccountingReport,
  type AccountingPeriod,
} from '../game/accountingEngine';
import { formatGameClock, formatTL } from '../game/economy';
import { TURKEY_MIN_WAGE_MONTHLY_NET } from '../game/hrEngine';
import { MobileGameModal, type MobileModalTab } from './MobileGameModal';

interface AccountingModalProps {
  open: boolean;
  state: EmpireState;
  quotes: StockQuote[];
  now: number;
  onPayTaxBill?: (taxId: string) => void;
  onOpenHrAccounting?: () => void;
  onOpenDayEndReport?: () => void;
  onSwitchToBanking?: () => void;
  onSwitchToBorsa?: () => void;
  onSwitchToInvestments?: () => void;
  onClose: () => void;
}

export function AccountingModal({
  open,
  state,
  quotes,
  now,
  onPayTaxBill,
  onOpenHrAccounting,
  onOpenDayEndReport,
  onSwitchToBanking,
  onSwitchToBorsa,
  onSwitchToInvestments,
  onClose,
}: AccountingModalProps) {
  const [period, setPeriod] = useState<AccountingPeriod>('daily');

  const report = useMemo(
    () => calculateAccountingReport(state, quotes, now),
    [state, quotes, now]
  );

  const summary = useMemo(
    () => buildPeriodAccountingSummary(report, period, state, quotes, now),
    [report, period, state, quotes, now]
  );

  if (!open) return null;

  const clock = formatGameClock(state.gameMinutes);
  const mult = summary.multiplierHours;
  const unit = period === 'daily' ? '/gün' : period === 'monthly' ? '/ay' : '/yıl';
  const holdingCount = (state.stockPortfolio ?? []).filter((h) => h.shares > 0).length;
  const pendingBills = (state.pendingTaxes ?? []).filter((b) => b.status !== 'paid');
  const pendingDayEndCount = (state.pendingDayEndReports ?? []).length;

  const rawBarTotal = summary.totalRevenue + summary.totalExpenses;
  const revBarPct = rawBarTotal > 0 ? Math.round((summary.totalRevenue / rawBarTotal) * 100) : 0;
  const expBarPct = rawBarTotal > 0 ? 100 - revBarPct : 0;

  const topTabs: MobileModalTab[] = [
    { id: 'muhasebe', label: 'Muhasebe', icon: <FileSpreadsheet className="h-4 w-4" /> },
    ...(onSwitchToBanking
      ? [{ id: 'banka', label: 'Banka & Kredi', icon: <Landmark className="h-4 w-4" /> }]
      : []),
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

  const revenueRows = [
    {
      label: 'Şube & Fabrika Brüt Cirosu',
      value: summary.branchGross,
      color: 'bg-emerald-500',
    },
    {
      label: 'Franchise Telif (Royalty) Geliri',
      value: Math.round(report.hourlyFranchiseRoyaltyIncome * mult),
      color: 'bg-amber-400',
    },
    {
      label: 'Banka Kredi Faiz Kazancı',
      value: Math.round(report.hourlyBankInterestIncome * mult),
      color: 'bg-sky-400',
    },
    {
      label: 'Borsa Temettü Gelirleri',
      value: Math.round(report.hourlyStockDividendIncome * mult),
      color: 'bg-indigo-400',
    },
  ];

  const expenseRows = [
    {
      label: 'Personel & Yönetici Brüt Maaşları (Asgari Ücret Bazlı)',
      value: summary.staffGrossPayroll,
      note: `Baz Net Asgari Ücret: ${formatTL(TURKEY_MIN_WAGE_MONTHLY_NET)}/ay`,
      color: 'bg-rose-500',
    },
    {
      label: 'İşveren SGK Primi (%22,5)',
      value: summary.employerSgk,
      note: null as string | null,
      color: 'bg-pink-500',
    },
    {
      label: 'Ticari Kira, Elektrik, Su & İnşaat Taksitleri',
      value: summary.rentAndUtilities,
      note: null as string | null,
      color: 'bg-orange-500',
    },
    {
      label: 'Mal & Tedarik Maliyeti (Net)',
      value: summary.supplyNet,
      note:
        summary.supplyDiscountSaved > 0
          ? `Fabrika/Zincir indirimi: -${formatTL(summary.supplyDiscountSaved, true)}`
          : null,
      color: 'bg-orange-400',
    },
    {
      label: `KDV (%${Math.round(report.taxRates.kdvRate * 100)} Net)`,
      value: summary.kdvTax,
      note: null as string | null,
      color: 'bg-amber-400',
    },
    {
      label: `Muhtasar / Stopaj Vergisi (%${Math.round(report.taxRates.sgkRate * 100)})`,
      value: summary.muhtasarStopajTax,
      note: 'Maaş ve ticari işyeri kira stopajı dahil',
      color: 'bg-pink-400',
    },
    {
      label: `Kurumlar Vergisi (%${Math.round(report.taxRates.corporateRate * 100)})`,
      value: summary.corporateTax,
      note: state.accountant
        ? `${state.accountant.title} yasal optimizasyonu: -%${Math.round(
            state.accountant.taxOptimizationRate * 100
          )}`
        : null,
      color: 'bg-fuchsia-400',
    },
    {
      label: `Çevre Temizlik & İlan Reklam Vergisi (%${(report.taxRates.municipalRate * 100).toFixed(1)})`,
      value: summary.municipalTax,
      note: null as string | null,
      color: 'bg-violet-400',
    },
    {
      label: 'Banka Kredi Taksitleri, Franchise Payı & Bakım',
      value: summary.loanInstallments + summary.franchiseRoyaltyPaid + summary.maintenanceCost,
      note: null as string | null,
      color: 'bg-slate-400',
    },
  ];

  return (
    <div data-testid="accounting-modal">
      <MobileGameModal
        title="Finans & Muhasebe Merkezi"
        subtitle="Gün Sonu, Ay Sonu & Yıl Sonu Bilanço + Türkiye Vergi Sistemi"
        icon={<FileSpreadsheet className="h-4 w-4" />}
        tabs={topTabs}
        activeTabId="muhasebe"
        onSelectTab={(id) => {
          if (id === 'banka') onSwitchToBanking?.();
          if (id === 'borsa') onSwitchToBorsa?.();
          if (id === 'yatirimlarim') onSwitchToInvestments?.();
        }}
        subHeader={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                data-testid="accounting-period-daily"
                onClick={() => setPeriod('daily')}
                className={`min-h-[38px] rounded-lg border px-3 text-xs font-bold whitespace-nowrap transition-all ${
                  period === 'daily'
                    ? 'border-amber-300/80 bg-amber-400 text-slate-950 font-black'
                    : 'border-slate-500/60 bg-slate-800/85 text-slate-100 hover:bg-slate-700'
                }`}
              >
                Gün Sonu Raporu
              </button>
              <button
                type="button"
                data-testid="accounting-period-monthly"
                onClick={() => setPeriod('monthly')}
                className={`min-h-[38px] rounded-lg border px-3 text-xs font-bold whitespace-nowrap transition-all ${
                  period === 'monthly'
                    ? 'border-amber-300/80 bg-amber-400 text-slate-950 font-black'
                    : 'border-slate-500/60 bg-slate-800/85 text-slate-100 hover:bg-slate-700'
                }`}
              >
                Ay Sonu Raporu
              </button>
              <button
                type="button"
                data-testid="accounting-period-annual"
                onClick={() => setPeriod('annual')}
                className={`min-h-[38px] rounded-lg border px-3 text-xs font-bold whitespace-nowrap transition-all ${
                  period === 'annual'
                    ? 'border-amber-300/80 bg-amber-400 text-slate-950 font-black'
                    : 'border-slate-500/60 bg-slate-800/85 text-slate-100 hover:bg-slate-700'
                }`}
              >
                Yıl Sonu Bilanço Raporu
              </button>
            </div>
            <div className="flex items-center gap-2">
              {onOpenDayEndReport && pendingDayEndCount > 0 && (
                <button
                  type="button"
                  onClick={onOpenDayEndReport}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/60 bg-emerald-500/20 px-2.5 py-1.5 text-xs font-extrabold text-emerald-200 hover:bg-emerald-500/30 whitespace-nowrap"
                >
                  <CalendarCheck2 className="h-3.5 w-3.5" />
                  <span>00:00 Tahsilat ({pendingDayEndCount})</span>
                </button>
              )}
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600/70 bg-slate-950/90 px-2.5 py-1.5 text-xs font-bold text-amber-300 whitespace-nowrap">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>{clock.label}</span>
              </div>
            </div>
          </div>
        }
        onClose={onClose}
        zIndexClass="z-[1260]"
      >
        {/* Top KPI Summary */}
        <section className="grid grid-cols-1 gap-2.5 min-[900px]:grid-cols-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-600/60 bg-slate-900/85 p-3">
              <div className="text-xs text-slate-400">Brüt Gelir ({unit})</div>
              <div className="mt-1 font-mono-num text-base font-black text-emerald-400">
                +{formatTL(summary.totalRevenue, true)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-600/60 bg-slate-900/85 p-3">
              <div className="text-xs text-slate-400">Gider + Vergi ({unit})</div>
              <div className="mt-1 font-mono-num text-base font-black text-rose-400">
                -{formatTL(summary.totalExpenses, true)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-600/60 bg-slate-900/85 p-3">
              <div className="text-xs text-slate-400">Vergi Sonrası Net Kâr ({unit})</div>
              <div
                data-testid="accounting-net-profit"
                className={`mt-1 font-mono-num text-base font-black ${
                  summary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {summary.netProfit >= 0 ? '+' : ''}
                {formatTL(summary.netProfit, true)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-600/60 bg-slate-900/85 p-3">
              <div className="text-xs text-slate-400">Net Kâr Marjı</div>
              <div
                className={`mt-1 flex items-center gap-1 font-mono-num text-base font-black ${
                  summary.profitMarginPct >= 0 ? 'text-amber-300' : 'text-rose-400'
                }`}
              >
                {summary.profitMarginPct >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>%{summary.profitMarginPct.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Annual Balance Sheet Card (Shown prominently on Yıl Sonu Bilanço Raporu) */}
        {period === 'annual' && (
          <section
            data-testid="annual-balance-sheet"
            className="rounded-xl border border-sky-400/50 bg-sky-950/25 p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-sky-300" />
                <h3 className="text-sm font-black text-white">
                  Yıl Sonu Bilanço Tablosu (Aktif / Pasif / Özkaynak)
                </h3>
              </div>
              <span className="font-mono-num text-xs font-extrabold text-emerald-300">
                Net Özkaynak: {formatTL(summary.netEquity, true)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border border-emerald-500/35 bg-slate-950/75 p-2.5 space-y-1">
                <div className="font-bold text-emerald-300">AKTİF VARLIKLAR</div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kasa Nakit</span>
                  <span className="font-mono-num font-bold text-white">
                    {formatTL(summary.totalCashAssets, true)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ticari İşletmeler</span>
                  <span className="font-mono-num font-bold text-white">
                    {formatTL(summary.totalRealEstateAssets, true)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">BIST & Banka</span>
                  <span className="font-mono-num font-bold text-white">
                    {formatTL(summary.totalStockAssets + summary.totalBankAssets, true)}
                  </span>
                </div>
                <div className="border-t border-slate-800 pt-1 flex justify-between font-extrabold text-emerald-300">
                  <span>Toplam Aktif</span>
                  <span className="font-mono-num">{formatTL(summary.totalAssets, true)}</span>
                </div>
              </div>

              <div className="rounded-lg border border-rose-500/35 bg-slate-950/75 p-2.5 space-y-1">
                <div className="font-bold text-rose-300">PASİF YÜKÜMLÜLÜKLER</div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Banka Kredi Borçları</span>
                  <span className="font-mono-num font-bold text-rose-300">
                    {formatTL(summary.totalLoanLiabilities, true)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ödenecek Vergiler</span>
                  <span className="font-mono-num font-bold text-rose-300">
                    {formatTL(summary.totalTaxLiabilities, true)}
                  </span>
                </div>
                <div className="border-t border-slate-800 pt-1 flex justify-between font-extrabold text-rose-300">
                  <span>Toplam Pasif</span>
                  <span className="font-mono-num">{formatTL(summary.totalLiabilities, true)}</span>
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/40 bg-slate-950/75 p-2.5 space-y-1">
                <div className="font-bold text-amber-300">YILLIK VERGİ & ÖZKAYNAK</div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tahmini Yıllık Vergi</span>
                  <span className="font-mono-num font-bold text-amber-200">
                    {formatTL(summary.totalTaxes, true)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tahmini Yıllık SGK</span>
                  <span className="font-mono-num font-bold text-pink-200">
                    {formatTL(summary.employerSgk, true)}
                  </span>
                </div>
                <div className="border-t border-slate-800 pt-1 flex justify-between font-extrabold text-emerald-300">
                  <span>Net Özkaynak</span>
                  <span className="font-mono-num">{formatTL(summary.netEquity, true)}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Turkish 4-Tax Regime & Accountant Automation Status */}
        <section
          data-testid="tax-regime-panel"
          className="rounded-xl border border-amber-400/50 bg-slate-900/85 p-3 space-y-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-black text-white">
                Türkiye Vergi Kademesi: {report.taxRates.stageLabel}
              </span>
            </div>
            <span className="font-mono-num text-xs font-bold text-rose-300">
              Toplam Vergi ({unit}): -{formatTL(summary.totalTaxes, true)}
            </span>
          </div>

          <p className="text-xs text-slate-300">{report.taxRates.incentiveNote}</p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 font-mono-num text-xs">
            <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-2">
              <div className="text-[11px] text-slate-400">KDV</div>
              <div className="font-black text-amber-300">
                %{Math.round(report.taxRates.kdvRate * 100)} · {formatTL(summary.kdvTax, true)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-2">
              <div className="text-[11px] text-slate-400">Muhtasar / Stopaj</div>
              <div className="font-black text-pink-300">
                %{Math.round(report.taxRates.sgkRate * 100)} ·{' '}
                {formatTL(summary.muhtasarStopajTax, true)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-2">
              <div className="text-[11px] text-slate-400">Kurumlar Vergisi</div>
              <div className="font-black text-fuchsia-300">
                %{Math.round(report.taxRates.corporateRate * 100)} ·{' '}
                {formatTL(summary.corporateTax, true)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-2">
              <div className="text-[11px] text-slate-400">Çevre Temizlik & İlan</div>
              <div className="font-black text-violet-300">
                %{(report.taxRates.municipalRate * 100).toFixed(1)} ·{' '}
                {formatTL(summary.municipalTax, true)}
              </div>
            </div>
          </div>

          {/* Muhasebeci Auto-Payment & Pending Tax Bills */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2.5 text-xs">
            {state.accountant ? (
              <div className="flex items-center gap-2 text-emerald-300">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  <strong>{state.accountant.name}</strong> ({'★'.repeat(state.accountant.stars)}) ·
                  Aylık vergiler & kredi taksitleri otomatik ödeniyor!
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                <span className="text-amber-200">
                  Muhasebeci atanmadı: Aylık KDV, Muhtasar, Kurumlar ve ÇTV beyannamelerini manuel
                  ödemelisiniz.
                </span>
                {onOpenHrAccounting && (
                  <button
                    type="button"
                    data-testid="goto-hire-accountant-btn"
                    onClick={onOpenHrAccounting}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-300/80 bg-amber-400 px-3 text-xs font-black text-slate-950 transition-all hover:bg-amber-300 whitespace-nowrap"
                  >
                    <Calculator className="h-3.5 w-3.5" />
                    <span>Muhasebeci İşe Al (Sv.1+)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {pendingBills.length > 0 && (
            <div className="space-y-2 border-t border-slate-800 pt-2.5">
              <div className="text-xs font-bold text-rose-300">
                Bekleyen Vergi Tahakkukları ({pendingBills.length})
              </div>
              {pendingBills.map((bill) => (
                <div
                  key={bill.id}
                  data-testid={`pending-tax-${bill.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-400/50 bg-rose-950/30 px-3 py-2 text-xs"
                >
                  <div>
                    <div className="font-bold text-white">
                      {bill.monthNumber}. Ay Vergi Tahakkuku
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Son Ödeme: Gün {bill.dueGameDay} · KDV {formatTL(bill.breakdown.kdv, true)} ·
                      Muhtasar {formatTL(bill.breakdown.sgkStopaj, true)} · Kurumlar{' '}
                      {formatTL(bill.breakdown.corporateTax, true)} · ÇTV{' '}
                      {formatTL(bill.breakdown.municipalTax, true)}
                    </div>
                  </div>
                  {onPayTaxBill && (
                    <button
                      type="button"
                      data-testid={`pay-tax-${bill.id}`}
                      disabled={state.cash < bill.amount}
                      onClick={() => onPayTaxBill(bill.id)}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-emerald-300/80 bg-emerald-500 px-3 font-mono-num text-xs font-black text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
                    >
                      <Coins className="h-3.5 w-3.5" />
                      <span>Öde ({formatTL(bill.amount)})</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Ratio Bar */}
        <section className="rounded-xl border border-slate-600/60 bg-slate-900/75 p-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-emerald-400">Gelir %{revBarPct}</span>
            <span className="text-slate-400">
              Ödenen Toplam Vergi:{' '}
              <strong className="font-mono-num text-slate-200">
                {formatTL(state.totalTaxesPaid ?? 0, true)}
              </strong>
            </span>
            <span className="text-rose-400">Gider %{expBarPct}</span>
          </div>
          <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${revBarPct}%` }} />
            <div className="h-full bg-rose-500 transition-all" style={{ width: `${expBarPct}%` }} />
          </div>
        </section>

        {/* Revenue & Expense Ledgers */}
        <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
          <section className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3 space-y-2.5">
            <h3 className="text-sm font-bold text-emerald-300">
              Gelir Kalemleri ({summary.periodLabel})
            </h3>
            {revenueRows.map((row) => {
              const pct =
                summary.totalRevenue > 0 ? Math.round((row.value / summary.totalRevenue) * 100) : 0;
              return (
                <div key={row.label} className="text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-200">{row.label}</span>
                    <span className="shrink-0 font-mono-num font-bold text-emerald-400">
                      +{formatTL(row.value)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className={`h-full ${row.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}

            {report.hourlySectorBreakdown.length > 0 && (
              <div className="border-t border-emerald-500/20 pt-2.5">
                <div className="text-xs font-bold text-slate-300">Sektör Bazlı Ciro</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {report.hourlySectorBreakdown.map((sec) => (
                    <span
                      key={sec.sectorId}
                      className="rounded-lg border border-emerald-500/35 bg-slate-950/80 px-2.5 py-1 text-xs font-semibold text-slate-200"
                    >
                      {sec.sectorName} ({sec.branchCount}):{' '}
                      <strong className="font-mono-num text-emerald-400">
                        {formatTL(sec.hourlyGross * mult, true)}
                      </strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-3 space-y-2.5">
            <h3 className="text-sm font-bold text-rose-300">
              Gider & Vergi Kalemleri ({summary.periodLabel})
            </h3>
            {expenseRows.map((row) => {
              const pct =
                summary.totalExpenses > 0
                  ? Math.round((row.value / summary.totalExpenses) * 100)
                  : 0;
              return (
                <div key={row.label} className="text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-200">{row.label}</span>
                    <span className="shrink-0 font-mono-num font-bold text-rose-400">
                      -{formatTL(row.value)}
                    </span>
                  </div>
                  {row.note && (
                    <div className="mt-0.5 text-[11px] font-semibold text-emerald-400">
                      <Sparkles className="mr-1 inline h-3 w-3" />
                      {row.note}
                    </div>
                  )}
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className={`h-full ${row.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </section>
        </div>

        {/* Per-Branch Profitability */}
        <section className="rounded-xl border border-slate-600/60 bg-slate-900/80 p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white">
              Şube Bazlı Kârlılık ({report.branches.length} Şube)
            </h3>
            <span className="text-xs text-slate-400">Net kâra göre sıralı ({unit})</span>
          </div>

          {report.branches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-600 p-6 text-center text-xs text-slate-400">
              Henüz aktif şubeniz yok. Haritada pin bırakarak ilk işletmenizi kurduğunuzda şube
              bilançosu burada canlı güncellenir.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 min-[900px]:grid-cols-2">
              {report.branches.map((b, idx) => {
                const bGross = b.hourlyGross * mult;
                const bExp = b.hourlyExpenses * mult;
                const bNet = b.hourlyNet * mult;
                const isLoss = bNet < 0;
                const isTop = idx === 0 && !isLoss;
                return (
                  <div
                    key={b.businessId}
                    className={`rounded-xl border p-3 space-y-1.5 ${
                      isLoss
                        ? 'border-rose-500/55 bg-rose-950/30'
                        : 'border-slate-600/60 bg-slate-950/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="truncate text-sm font-bold text-white">{b.name}</span>
                          {b.underConstruction && (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-bold text-amber-300">
                              <Hammer className="h-3 w-3" /> {b.constructionDaysRemaining}g
                            </span>
                          )}
                          {b.autoCollectActive && !b.underConstruction && (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[11px] font-bold text-emerald-300">
                              <Zap className="h-3 w-3" /> Oto
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {b.cityLabel} · {b.sectorName} · Sv.{b.level}
                        </div>
                      </div>
                      {isLoss ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-rose-500/25 px-2 py-1 text-xs font-bold text-rose-200">
                          <AlertTriangle className="h-3.5 w-3.5" /> Zararda
                        </span>
                      ) : isTop ? (
                        <span className="shrink-0 rounded-lg bg-amber-400 px-2 py-1 text-xs font-bold text-slate-950">
                          En Kârlı · %{b.marginPct}
                        </span>
                      ) : (
                        <span className="shrink-0 font-mono-num text-xs font-bold text-slate-300">
                          %{b.marginPct}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-2 font-mono-num text-xs">
                      <div>
                        <div className="text-[11px] text-slate-400">Ciro</div>
                        <div className="font-bold text-emerald-400">+{formatTL(bGross, true)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Gider</div>
                        <div className="font-bold text-rose-400">-{formatTL(bExp, true)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Net</div>
                        <div
                          className={`font-black ${isLoss ? 'text-rose-400' : 'text-amber-300'}`}
                        >
                          {bNet >= 0 ? '+' : ''}
                          {formatTL(bNet, true)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </MobileGameModal>
    </div>
  );
}
