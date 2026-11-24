import { useMemo, useState } from 'react';
import {
  X,
  FileSpreadsheet,
  BarChart3,
  Landmark,
  TrendingUp,
  TrendingDown,
  Zap,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import type { EmpireState, StockQuote } from '../types/game';
import { calculateAccountingReport } from '../game/accountingEngine';
import { formatTL } from '../game/economy';

interface AccountingModalProps {
  open: boolean;
  state: EmpireState;
  quotes: StockQuote[];
  now: number;
  onSwitchToBorsa?: () => void;
  onSwitchToBanking?: () => void;
  onClose: () => void;
}

export function AccountingModal({
  open,
  state,
  quotes,
  now,
  onSwitchToBorsa,
  onSwitchToBanking,
  onClose,
}: AccountingModalProps) {
  const [period, setPeriod] = useState<'hourly' | 'daily'>('hourly');

  const report = useMemo(
    () => calculateAccountingReport(state, quotes, now),
    [state, quotes, now]
  );

  if (!open) return null;

  const mult = period === 'daily' ? 24 : 1;
  const unit = period === 'daily' ? '/gün' : '/sa';

  const totalRevenue = report.hourlyTotalRevenue * mult;
  const totalExpenses = report.hourlyTotalExpenses * mult;
  const netProfit = report.hourlyNetProfit * mult;

  const rawBarTotal = totalRevenue + totalExpenses;
  const revBarPct = rawBarTotal > 0 ? Math.round((totalRevenue / rawBarTotal) * 100) : 0;
  const expBarPct = rawBarTotal > 0 ? 100 - revBarPct : 0;

  const revenueRows = [
    {
      label: 'Şube & Fabrika Brüt Cirosu',
      value: report.hourlyBranchGross * mult,
      color: 'bg-emerald-500',
    },
    {
      label: 'Franchise Telif (Royalty) Geliri',
      value: report.hourlyFranchiseRoyaltyIncome * mult,
      color: 'bg-amber-500',
    },
    {
      label: 'Banka Kredi Faiz Kazancı',
      value: report.hourlyBankInterestIncome * mult,
      color: 'bg-sky-500',
    },
    {
      label: 'Borsa Temettü Gelirleri',
      value: report.hourlyStockDividendIncome * mult,
      color: 'bg-indigo-500',
    },
  ];

  const expenseRows = [
    {
      label: 'Personel & Yönetici Maaşları',
      value: report.hourlyStaffPayroll * mult,
      note: null as string | null,
      color: 'bg-rose-500',
    },
    {
      label: 'Stok & Tedarik (Net)',
      value: report.hourlySupplyNet * mult,
      note:
        report.hourlySupplyDiscountSaved > 0
          ? `Fabrika/Zincir indirimi: -${formatTL(report.hourlySupplyDiscountSaved * mult, true)}`
          : null,
      color: 'bg-orange-500',
    },
    {
      label: 'Ödenen Franchise Payları',
      value: report.hourlyFranchiseRoyaltyPaid * mult,
      note: null,
      color: 'bg-amber-600',
    },
    {
      label: 'Banka Kredi Taksitleri',
      value: report.hourlyLoanInstallments * mult,
      note: null,
      color: 'bg-red-600',
    },
    {
      label: 'İşletme Bakım & Enerji Giderleri',
      value: report.hourlyMaintenanceCost * mult,
      note: null,
      color: 'bg-slate-500',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Muhasebe ve Gelir-Gider Bilançosu"
      data-testid="accounting-modal"
      className="fixed inset-0 z-[1260] flex items-center justify-center bg-slate-950/60 p-2.5 safe-inset"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full max-h-[620px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {/* Header with 3-Tab Unified Finance Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3.5 py-2 dark:border-slate-800 sm:px-4 sm:py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 sm:flex">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-[clamp(0.84rem,1.6vw,1rem)] font-bold">
                Finans Merkezi · Muhasebe & Gelir-Gider Bilançosu
              </h2>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                Kalem Kalem Gelir-Gider Analizi · Kâr Marjı & Şube Kârlılık Karşılaştırması
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {(onSwitchToBorsa || onSwitchToBanking) && (
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
                {onSwitchToBanking && (
                  <button
                    type="button"
                    data-testid="finance-switch-banka"
                    onClick={onSwitchToBanking}
                    className="flex min-h-[34px] items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white whitespace-nowrap"
                  >
                    <Landmark className="h-3.5 w-3.5" />
                    <span>Banka</span>
                  </button>
                )}
                <button
                  type="button"
                  data-testid="finance-switch-accounting"
                  className="flex min-h-[34px] items-center gap-1 rounded-lg bg-amber-600 px-2.5 text-xs font-bold text-white shadow-xs whitespace-nowrap"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Muhasebe</span>
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Muhasebe Penceresini Kapat"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Period Switcher + Top 4 KPI Cards */}
        <div className="border-b border-slate-200 bg-slate-50/90 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-950/60 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                data-testid="accounting-period-hourly"
                onClick={() => setPeriod('hourly')}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
                  period === 'hourly'
                    ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Saatlik Bilanço
              </button>
              <button
                type="button"
                data-testid="accounting-period-daily"
                onClick={() => setPeriod('daily')}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
                  period === 'daily'
                    ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Günlük (24 Saat)
              </button>
            </div>

            {/* Visual Revenue vs Expense Ratio Bar */}
            <div className="flex min-w-[210px] flex-1 max-w-sm items-center gap-2 text-[11px]">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                Gelir %{revBarPct}
              </span>
              <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${revBarPct}%` }}
                />
                <div
                  className="h-full bg-rose-500 transition-all duration-300"
                  style={{ width: `${expBarPct}%` }}
                />
              </div>
              <span className="font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                Gider %{expBarPct}
              </span>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Brüt Gelir ({unit})
              </div>
              <div className="mt-0.5 font-mono-num text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                +{formatTL(totalRevenue, true)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Toplam Gider ({unit})
              </div>
              <div className="mt-0.5 font-mono-num text-sm font-extrabold text-rose-600 dark:text-rose-400">
                -{formatTL(totalExpenses, true)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Net Kâr ({unit})
              </div>
              <div
                data-testid="accounting-net-profit"
                className={`mt-0.5 font-mono-num text-sm font-extrabold ${
                  netProfit >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {netProfit >= 0 ? '+' : ''}
                {formatTL(netProfit, true)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Net Kâr Marjı
              </div>
              <div
                className={`mt-0.5 flex items-center gap-1 font-mono-num text-sm font-extrabold ${
                  report.profitMarginPct >= 0
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {report.profitMarginPct >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span>%{report.profitMarginPct.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Body: Itemized Revenue & Expense + Sector Breakdown + Branch P&L */}
        <div className="panel-scroll flex-1 space-y-3 p-3.5 sm:p-4">
          {/* Two-Column Revenue & Expense Ledger */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Revenue Ledger */}
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/15">
              <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                Gelir Kalemleri ({period === 'daily' ? 'Günlük' : 'Saatlik'})
              </h3>
              <div className="mt-2 space-y-2">
                {revenueRows.map((row) => {
                  const pct = totalRevenue > 0 ? Math.round((row.value / totalRevenue) * 100) : 0;
                  return (
                    <div key={row.label} className="text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-slate-700 dark:text-slate-200">
                          {row.label}
                        </span>
                        <span className="shrink-0 font-mono-num font-bold text-emerald-700 dark:text-emerald-400">
                          +{formatTL(row.value)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                        <div className={`h-full ${row.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sector Sub-breakdown */}
              {report.hourlySectorBreakdown.length > 0 && (
                <div className="mt-3 border-t border-emerald-200/60 pt-2 dark:border-emerald-900/40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Sektör Bazlı Ciro Dökümü
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {report.hourlySectorBreakdown.map((sec) => (
                      <span
                        key={sec.sectorId}
                        className="rounded-lg border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:border-emerald-800/60 dark:bg-slate-900 dark:text-slate-200"
                      >
                        {sec.sectorName} ({sec.branchCount}):{' '}
                        <strong className="font-mono-num text-emerald-700 dark:text-emerald-400">
                          {formatTL(sec.hourlyGross * mult, true)}
                        </strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Expense Ledger */}
            <div className="rounded-xl border border-rose-200/80 bg-rose-50/30 p-3 dark:border-rose-900/50 dark:bg-rose-950/15">
              <h3 className="text-xs font-bold text-rose-900 dark:text-rose-300">
                Gider Kalemleri ({period === 'daily' ? 'Günlük' : 'Saatlik'})
              </h3>
              <div className="mt-2 space-y-2">
                {expenseRows.map((row) => {
                  const pct =
                    totalExpenses > 0 ? Math.round((row.value / totalExpenses) * 100) : 0;
                  return (
                    <div key={row.label} className="text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-slate-700 dark:text-slate-200">
                          {row.label}
                        </span>
                        <span className="shrink-0 font-mono-num font-bold text-rose-600 dark:text-rose-400">
                          -{formatTL(row.value)}
                        </span>
                      </div>
                      {row.note && (
                        <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                          <Sparkles className="mr-0.5 inline h-3 w-3" />
                          {row.note}
                        </div>
                      )}
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                        <div className={`h-full ${row.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Per-Branch Profitability Ranking */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Şube Bazlı Kârlılık Karşılaştırması ({report.branches.length} şube)
              </h3>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                En yüksek net kârdan en düşüğe sıralı
              </span>
            </div>

            {report.branches.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Henüz aktif şube bulunmuyor. Haritada pin bırakarak ilk işletmenizi kurduğunuzda
                bilanço burada canlı güncellenir.
              </div>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="pb-1.5 pr-2 font-semibold">Şube</th>
                      <th className="pb-1.5 pr-2 font-semibold">Brüt Ciro</th>
                      <th className="pb-1.5 pr-2 font-semibold">Giderler</th>
                      <th className="pb-1.5 pr-2 font-semibold">Net Kâr</th>
                      <th className="pb-1.5 text-right font-semibold">Marj / Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {report.branches.map((b, idx) => {
                      const bGross = b.hourlyGross * mult;
                      const bExp = b.hourlyExpenses * mult;
                      const bNet = b.hourlyNet * mult;
                      const isLoss = bNet < 0;
                      const isTop = idx === 0 && !isLoss;
                      return (
                        <tr key={b.businessId}>
                          <td className="py-1.5 pr-2">
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                              <span className="truncate max-w-[160px]">{b.name}</span>
                              {b.autoCollectActive && (
                                <span
                                  title="Otomatik Tahsilat Aktif"
                                  className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 whitespace-nowrap"
                                >
                                  <Zap className="h-2.5 w-2.5" /> Oto
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {b.cityLabel} · {b.sectorName} · Sv.{b.level}
                            </div>
                          </td>
                          <td className="py-1.5 pr-2 font-mono-num text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                            +{formatTL(bGross, true)}
                          </td>
                          <td className="py-1.5 pr-2 font-mono-num text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            -{formatTL(bExp, true)}
                          </td>
                          <td
                            className={`py-1.5 pr-2 font-mono-num font-bold whitespace-nowrap ${
                              isLoss
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {bNet >= 0 ? '+' : ''}
                            {formatTL(bNet, true)}
                          </td>
                          <td className="py-1.5 text-right whitespace-nowrap">
                            {isLoss ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                                <AlertTriangle className="h-3 w-3" /> Zararda (%{b.marginPct})
                              </span>
                            ) : isTop ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                En Kârlı · %{b.marginPct}
                              </span>
                            ) : (
                              <span className="font-mono-num text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                %{b.marginPct}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
