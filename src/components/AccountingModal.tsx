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
} from 'lucide-react';
import type { EmpireState, StockQuote } from '../types/game';
import { calculateAccountingReport } from '../game/accountingEngine';
import { formatGameClock, formatTL } from '../game/economy';
import { MobileGameModal, type MobileModalTab } from './MobileGameModal';

interface AccountingModalProps {
  open: boolean;
  state: EmpireState;
  quotes: StockQuote[];
  now: number;
  onPayTaxBill?: (taxId: string) => void;
  onOpenHrAccounting?: () => void;
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
  onSwitchToBanking,
  onSwitchToBorsa,
  onSwitchToInvestments,
  onClose,
}: AccountingModalProps) {
  const [period, setPeriod] = useState<'hourly' | 'daily'>('hourly');

  const report = useMemo(
    () => calculateAccountingReport(state, quotes, now),
    [state, quotes, now]
  );

  if (!open) return null;

  const clock = formatGameClock(state.gameMinutes);
  const mult = period === 'daily' ? 24 : 1;
  const unit = period === 'daily' ? '/gün' : '/sa';
  const holdingCount = (state.stockPortfolio ?? []).filter((h) => h.shares > 0).length;
  const pendingBills = (state.pendingTaxes ?? []).filter((b) => b.status !== 'paid');

  const totalRevenue = report.hourlyTotalRevenue * mult;
  const totalExpenses = report.hourlyTotalExpenses * mult;
  const netProfit = report.hourlyNetProfit * mult;

  const rawBarTotal = totalRevenue + totalExpenses;
  const revBarPct = rawBarTotal > 0 ? Math.round((totalRevenue / rawBarTotal) * 100) : 0;
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
      value: report.hourlyBranchGross * mult,
      color: 'bg-emerald-500',
    },
    {
      label: 'Franchise Telif (Royalty) Geliri',
      value: report.hourlyFranchiseRoyaltyIncome * mult,
      color: 'bg-amber-400',
    },
    {
      label: 'Banka Kredi Faiz Kazancı',
      value: report.hourlyBankInterestIncome * mult,
      color: 'bg-sky-400',
    },
    {
      label: 'Borsa Temettü Gelirleri',
      value: report.hourlyStockDividendIncome * mult,
      color: 'bg-indigo-400',
    },
  ];

  const expenseRows = [
    {
      label: 'Personel, Yönetici & Genel Müdürlük Maaşları',
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
      color: 'bg-orange-400',
    },
    {
      label: `KDV (%${Math.round(report.taxRates.kdvRate * 100)})`,
      value: report.hourlyKdvTax * mult,
      note: null as string | null,
      color: 'bg-amber-400',
    },
    {
      label: `Personel SGK & Stopaj Primi (%${Math.round(report.taxRates.sgkRate * 100)})`,
      value: report.hourlySgkTax * mult,
      note: null as string | null,
      color: 'bg-pink-400',
    },
    {
      label: `Kurumlar / Gelir Vergisi (%${Math.round(report.taxRates.corporateRate * 100)})`,
      value: report.hourlyCorporateTax * mult,
      note: state.accountant
        ? `${state.accountant.title} yasal optimizasyonu: -%${Math.round(
            state.accountant.taxOptimizationRate * 100
          )}`
        : null,
      color: 'bg-fuchsia-400',
    },
    {
      label: `Belediye İlan ve Çevre Vergisi (%${(report.taxRates.municipalRate * 100).toFixed(1)})`,
      value: report.hourlyMunicipalTax * mult,
      note: null as string | null,
      color: 'bg-violet-400',
    },
    {
      label: 'Banka Kredi Taksitleri (Aylık Amortisman)',
      value: report.hourlyLoanInstallments * mult,
      note: null as string | null,
      color: 'bg-red-500',
    },
    {
      label: 'Ödenen Franchise Payları & İşletme Bakım',
      value: (report.hourlyFranchiseRoyaltyPaid + report.hourlyMaintenanceCost) * mult,
      note: null as string | null,
      color: 'bg-slate-400',
    },
  ];

  return (
    <div data-testid="accounting-modal">
      <MobileGameModal
        title="Finans Merkezi"
        subtitle="Muhasebe, Gelir-Gider & Kademeli Vergi Bilançosu"
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="accounting-period-hourly"
                onClick={() => setPeriod('hourly')}
                className={`min-h-[40px] rounded-lg border px-3.5 text-xs font-bold transition-all duration-200 ease-out active:scale-[0.98] ${
                  period === 'hourly'
                    ? 'border-amber-300/80 bg-amber-400 text-slate-950 font-black'
                    : 'border-slate-500/60 bg-slate-800/85 text-slate-100 hover:border-slate-400 hover:bg-slate-700'
                }`}
              >
                Saatlik Bilanço
              </button>
              <button
                type="button"
                data-testid="accounting-period-daily"
                onClick={() => setPeriod('daily')}
                className={`min-h-[40px] rounded-lg border px-3.5 text-xs font-bold transition-all duration-200 ease-out active:scale-[0.98] ${
                  period === 'daily'
                    ? 'border-amber-300/80 bg-amber-400 text-slate-950 font-black'
                    : 'border-slate-500/60 bg-slate-800/85 text-slate-100 hover:border-slate-400 hover:bg-slate-700'
                }`}
              >
                Günlük (24 Saat)
              </button>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600/70 bg-slate-950/90 px-3 py-1.5 text-xs font-bold text-amber-300">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{clock.label}</span>
              <span className="text-slate-400">· {clock.totalDaysLabel}</span>
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
                +{formatTL(totalRevenue, true)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-600/60 bg-slate-900/85 p-3">
              <div className="text-xs text-slate-400">Gider + Vergi ({unit})</div>
              <div className="mt-1 font-mono-num text-base font-black text-rose-400">
                -{formatTL(totalExpenses, true)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-600/60 bg-slate-900/85 p-3">
              <div className="text-xs text-slate-400">Vergi Sonrası Net Kâr ({unit})</div>
              <div
                data-testid="accounting-net-profit"
                className={`mt-1 font-mono-num text-base font-black ${
                  netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {netProfit >= 0 ? '+' : ''}
                {formatTL(netProfit, true)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-600/60 bg-slate-900/85 p-3">
              <div className="text-xs text-slate-400">Net Kâr Marjı</div>
              <div
                className={`mt-1 flex items-center gap-1 font-mono-num text-base font-black ${
                  report.profitMarginPct >= 0 ? 'text-amber-300' : 'text-rose-400'
                }`}
              >
                {report.profitMarginPct >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>%{report.profitMarginPct.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Progressive Tax Regime & Accountant Automation Status */}
        <section
          data-testid="tax-regime-panel"
          className="rounded-xl border border-amber-400/50 bg-slate-900/85 p-3 space-y-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-black text-white">
                Vergi Kademesi: {report.taxRates.stageLabel}
              </span>
            </div>
            <span className="font-mono-num text-xs font-bold text-rose-300">
              Toplam Vergi ({unit}): -{formatTL(report.hourlyTotalTaxes * mult, true)}
            </span>
          </div>

          <p className="text-xs text-slate-300">{report.taxRates.incentiveNote}</p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 font-mono-num text-xs">
            <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-2">
              <div className="text-[11px] text-slate-400">KDV</div>
              <div className="font-black text-amber-300">
                %{Math.round(report.taxRates.kdvRate * 100)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-2">
              <div className="text-[11px] text-slate-400">SGK & Stopaj</div>
              <div className="font-black text-pink-300">
                %{Math.round(report.taxRates.sgkRate * 100)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-2">
              <div className="text-[11px] text-slate-400">Kurumlar/Gelir</div>
              <div className="font-black text-fuchsia-300">
                %{Math.round(report.taxRates.corporateRate * 100)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-2">
              <div className="text-[11px] text-slate-400">Belediye</div>
              <div className="font-black text-violet-300">
                %{(report.taxRates.municipalRate * 100).toFixed(1)}
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
                  Muhasebeci atanmadı: Aylık vergi ve kredi taksitlerini manuel ödemelisiniz.
                </span>
                {onOpenHrAccounting && (
                  <button
                    type="button"
                    data-testid="goto-hire-accountant-btn"
                    onClick={onOpenHrAccounting}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-300/80 bg-amber-400 px-3 text-xs font-black text-slate-950 transition-all duration-200 ease-out hover:bg-amber-300 active:scale-[0.98] whitespace-nowrap"
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
                      SGK {formatTL(bill.breakdown.sgkStopaj, true)} · Kurumlar{' '}
                      {formatTL(bill.breakdown.corporateTax, true)}
                    </div>
                  </div>
                  {onPayTaxBill && (
                    <button
                      type="button"
                      data-testid={`pay-tax-${bill.id}`}
                      disabled={state.cash < bill.amount}
                      onClick={() => onPayTaxBill(bill.id)}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-emerald-300/80 bg-emerald-500 px-3 font-mono-num text-xs font-black text-slate-950 transition-all duration-200 ease-out hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
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
              Gelir Kalemleri ({period === 'daily' ? 'Günlük' : 'Saatlik'})
            </h3>
            {revenueRows.map((row) => {
              const pct = totalRevenue > 0 ? Math.round((row.value / totalRevenue) * 100) : 0;
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
              Gider & Vergi Kalemleri ({period === 'daily' ? 'Günlük' : 'Saatlik'})
            </h3>
            {expenseRows.map((row) => {
              const pct = totalExpenses > 0 ? Math.round((row.value / totalExpenses) * 100) : 0;
              return (
                <div key={row.label} className="text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-200">{row.label}</span>
                    <span className="shrink-0 font-mono-num font-bold text-rose-400">
                      -{formatTL(row.value)}
                    </span>
                  </div>
                  {row.note && (
                    <div className="mt-0.5 text-xs font-semibold text-emerald-400">
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
            <span className="text-xs text-slate-400">Net kâra göre sıralı</span>
          </div>

          {report.branches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-600 p-6 text-center text-xs text-slate-400">
              Henüz aktif şubeniz yok. Haritada pin bırakarak ilk işletmenizi kurduğunuzda
              şube bilançosu burada canlı güncellenir.
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
                    className="rounded-xl border border-slate-600/60 bg-slate-950/80 p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-bold text-white">{b.name}</span>
                          {b.autoCollectActive && (
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
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-rose-500/20 px-2 py-1 text-xs font-bold text-rose-300">
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
