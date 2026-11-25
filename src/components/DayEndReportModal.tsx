import React, { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Coins,
  Hammer,
  History,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import type { DayEndSummary } from '../types/game';
import { formatTL } from '../game/economy';

interface DayEndReportModalProps {
  open: boolean;
  onClose: () => void;
  pendingReports: DayEndSummary[];
  historyReports: DayEndSummary[];
  onCollectAll: () => void;
  onCollectSingle: (reportId: string) => void;
}

export const DayEndReportModal: React.FC<DayEndReportModalProps> = ({
  open,
  onClose,
  pendingReports,
  historyReports,
  onCollectAll,
  onCollectSingle,
}) => {
  const [viewMode, setViewMode] = useState<'pending' | 'history'>(
    pendingReports.length > 0 ? 'pending' : 'history'
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!open) return null;

  const activeList =
    viewMode === 'pending' && pendingReports.length > 0
      ? pendingReports
      : historyReports.length > 0
      ? historyReports
      : pendingReports;

  const currentReport: DayEndSummary | null =
    activeList.find((r) => r.id === selectedId) ?? activeList[0] ?? null;

  const totalPendingNet = pendingReports.reduce((s, r) => s + r.manualCollectibleNet, 0);
  const lossBranchesCount = currentReport
    ? currentReport.branchLines.filter((l) => l.isLoss).length
    : 0;

  return (
    <div
      className="fixed inset-0 z-[1500] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-2 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Gün Sonu Raporu"
      data-testid="day-end-report-modal"
    >
      <div className="w-full max-w-3xl max-h-[92dvh] rounded-2xl bg-slate-950/96 border border-slate-700/85 shadow-2xl flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="shrink-0 h-12 px-4 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-900/80">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarCheck2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
              00:00 Gün Sonu Raporu & Hasılat Tahsilatı
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode / Day Selector Bar */}
        <div className="shrink-0 px-4 py-2 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setViewMode('pending');
                setSelectedId(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border ${
                viewMode === 'pending'
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Bekleyen Tahsilat ({pendingReports.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('history');
                setSelectedId(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border flex items-center gap-1 ${
                viewMode === 'history'
                  ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Arşiv ({historyReports.length})
            </button>
          </div>

          {activeList.length > 1 && (
            <div className="flex items-center gap-1 shrink-0">
              {activeList.slice(0, 7).map((rep) => (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => setSelectedId(rep.id)}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold border whitespace-nowrap ${
                    currentReport?.id === rep.id
                      ? 'bg-amber-500/25 border-amber-400/60 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Gün {rep.completedDay}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto panel-scroll p-3.5 sm:p-4 space-y-3">
          {!currentReport ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center space-y-2">
              <CalendarCheck2 className="w-8 h-8 text-slate-500 mx-auto" />
              <div className="text-sm font-bold text-white">Henüz Gün Sonu Raporu Oluşmadı</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                İşletme satışlarınız gün içinde kasada birikir ve gece saat <strong>00:00</strong>{' '}
                olduğunda şube bazlı kâr-zarar dökümüyle bu rapora yansır.
              </p>
            </div>
          ) : (
            <>
              {/* Report Day Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900/80 border border-slate-800 px-3.5 py-2.5">
                <div>
                  <div className="text-xs font-extrabold text-amber-300 uppercase tracking-wide">
                    Gün {currentReport.dayOfMonth} • {currentReport.month}. Ay (Toplam{' '}
                    {currentReport.completedDay}. Gün Kapanışı)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Saat 00:00 itibarıyla gün içi tüm şube ciroları, tedarik, kira ve SGK dahil
                    yevmiyeler kapatıldı.
                  </div>
                </div>
                {lossBranchesCount > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/45 text-rose-200 text-xs font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {lossBranchesCount} Şube Zararda
                  </div>
                )}
              </div>

              {/* 5 Summary KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5">
                  <div className="text-[10px] font-semibold text-slate-400">Brüt Ciro</div>
                  <div className="text-sm font-extrabold text-emerald-300 font-mono-num mt-0.5">
                    {formatTL(currentReport.dailyGrossRevenue)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5">
                  <div className="text-[10px] font-semibold text-slate-400">Mal & Tedarik</div>
                  <div className="text-sm font-extrabold text-rose-300 font-mono-num mt-0.5">
                    -{formatTL(currentReport.dailySupplyCost)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5">
                  <div className="text-[10px] font-semibold text-slate-400">Elektrik/Su/Kira</div>
                  <div className="text-sm font-extrabold text-rose-300 font-mono-num mt-0.5">
                    -{formatTL(currentReport.dailyUtilitiesAndRent)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5">
                  <div className="text-[10px] font-semibold text-slate-400">Personel (SGK)</div>
                  <div className="text-sm font-extrabold text-rose-300 font-mono-num mt-0.5">
                    -{formatTL(currentReport.dailySalariesPaid)}
                  </div>
                </div>
                <div
                  className={`col-span-2 sm:col-span-1 rounded-xl border p-2.5 ${
                    currentReport.dailyNetCashFlow >= 0
                      ? 'bg-emerald-950/40 border-emerald-500/40'
                      : 'bg-rose-950/45 border-rose-500/50'
                  }`}
                >
                  <div className="text-[10px] font-semibold text-slate-300">Net Günlük Kâr</div>
                  <div
                    className={`text-sm font-extrabold font-mono-num mt-0.5 flex items-center gap-1 ${
                      currentReport.dailyNetCashFlow >= 0 ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {currentReport.dailyNetCashFlow >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                    )}
                    {currentReport.dailyNetCashFlow >= 0 ? '+' : ''}
                    {formatTL(currentReport.dailyNetCashFlow)}
                  </div>
                </div>
              </div>

              {/* Per-Branch Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    Şube Bazlı Gün Sonu Kâr / Zarar Dökümü ({currentReport.branchLines.length})
                  </h3>
                  {currentReport.autoSettledNet !== 0 && (
                    <span className="text-[11px] font-semibold text-sky-300">
                      Müdür Oto-Aktarım: {currentReport.autoSettledNet >= 0 ? '+' : ''}
                      {formatTL(currentReport.autoSettledNet)}
                    </span>
                  )}
                </div>

                {currentReport.branchLines.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-400 text-center">
                    Bu gün aktif şube hareketi bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {currentReport.branchLines.map((line) => (
                      <div
                        key={line.businessId}
                        className={`rounded-xl border p-2.5 sm:p-3 transition-colors ${
                          line.isLoss
                            ? 'bg-rose-950/35 border-rose-500/50'
                            : 'bg-slate-900/75 border-slate-800'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs sm:text-sm font-extrabold text-white truncate">
                                {line.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                                {line.sectorName} • {line.cityLabel}
                              </span>
                              {line.underConstruction && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">
                                  <Hammer className="w-3 h-3" />
                                  İnşaatta (0 Ciro)
                                </span>
                              )}
                              {line.isLoss && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/25 border border-rose-400/50 text-rose-200 font-extrabold">
                                  ZARARDA
                                </span>
                              )}
                              {line.autoSettled && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-200 font-bold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Otomatik Aktarıldı
                                </span>
                              )}
                            </div>
                          </div>
                          <div
                            className={`text-sm font-extrabold font-mono-num ${
                              line.netDailyProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'
                            }`}
                          >
                            {line.netDailyProfit >= 0 ? '+' : ''}
                            {formatTL(line.netDailyProfit)}
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                          <div className="rounded-lg bg-slate-950/60 px-2 py-1 flex items-center justify-between">
                            <span className="text-slate-400">Brüt Ciro</span>
                            <span className="font-mono-num font-bold text-emerald-300">
                              {formatTL(line.grossRevenue)}
                            </span>
                          </div>
                          <div className="rounded-lg bg-slate-950/60 px-2 py-1 flex items-center justify-between">
                            <span className="text-slate-400">Mal/Tedarik</span>
                            <span className="font-mono-num font-bold text-rose-300">
                              -{formatTL(line.supplyCost)}
                            </span>
                          </div>
                          <div className="rounded-lg bg-slate-950/60 px-2 py-1 flex items-center justify-between">
                            <span className="text-slate-400">Kira/Elk./Su</span>
                            <span className="font-mono-num font-bold text-rose-300">
                              -{formatTL(line.utilitiesAndRent)}
                            </span>
                          </div>
                          <div className="rounded-lg bg-slate-950/60 px-2 py-1 flex items-center justify-between">
                            <span className="text-slate-400">Yevmiye+SGK</span>
                            <span className="font-mono-num font-bold text-rose-300">
                              -{formatTL(line.dailyStaffWages)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sticky Footer CTA */}
        <div className="shrink-0 px-4 py-3 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-300 flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
            {pendingReports.length > 0 ? (
              <span>
                Bekleyen {pendingReports.length} gün sonu net toplam:{' '}
                <strong
                  className={`font-mono-num ${
                    totalPendingNet >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {totalPendingNet >= 0 ? '+' : ''}
                  {formatTL(totalPendingNet)}
                </strong>
              </span>
            ) : (
              <span className="text-slate-400">Tüm gün sonu hasılatları kasaya aktarıldı.</span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {currentReport && !currentReport.collected && pendingReports.length > 1 && (
              <button
                type="button"
                onClick={() => onCollectSingle(currentReport.id)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white whitespace-nowrap"
              >
                Sadece Gün {currentReport.completedDay} Aktar
              </button>
            )}
            {pendingReports.length > 0 ? (
              <button
                type="button"
                data-testid="collect-day-end-btn"
                onClick={onCollectAll}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 whitespace-nowrap"
              >
                <Coins className="w-4 h-4" />
                Gün Sonu Hasılatını Kasaya Aktar ({totalPendingNet >= 0 ? '+' : ''}
                {formatTL(totalPendingNet)})
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
              >
                Kapat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
