import { useMemo } from 'react';
import {
  Building2,
  Crown,
  FlaskConical,
  Flame,
  Landmark,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import type {
  AccountCardId,
  ExecutiveDashboardMetrics,
  IncomeExpensePoint,
  OperationCardId,
} from '../game/dashboardMetrics';
import { formatTL } from '../game/economy';

interface ExecutiveDashboardProps {
  metrics: ExecutiveDashboardMetrics;
  selectedAccountId: AccountCardId;
  onSelectAccount: (id: AccountCardId) => void;
  onOpenAccountDetail: (id: AccountCardId) => void;
  onManageOperation: (id: OperationCardId) => void;
  onDetailOperation: (id: OperationCardId) => void;
}

function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function IncomeExpenseChart({ series }: { series: IncomeExpensePoint[] }) {
  const chart = useMemo(() => {
    const w = 300;
    const h = 92;
    const padL = 34;
    const padR = 8;
    const padT = 8;
    const padB = 18;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const safeSeries = series.map((s) => ({
      label: s.label || 'G1',
      income: Number.isFinite(s.income) ? Math.max(0, s.income) : 0,
      expense: Number.isFinite(s.expense) ? Math.max(0, s.expense) : 0,
      net: Number.isFinite(s.net) ? s.net : 0,
    }));

    const rawMax = Math.max(
      1000,
      ...safeSeries.map((s) => Math.max(s.income, s.expense))
    );
    const maxVal = rawMax * 1.15;

    const toCoords = (vals: number[]) =>
      vals.map((val, idx) => {
        const x =
          padL + (safeSeries.length > 1 ? (idx / (safeSeries.length - 1)) * plotW : plotW / 2);
        const clamped = Math.max(0, Math.min(maxVal, Number.isFinite(val) ? val : 0));
        const y = padT + plotH - (clamped / maxVal) * plotH;
        return { x, y };
      });

    const incPts = toCoords(safeSeries.map((s) => s.income));
    const expPts = toCoords(safeSeries.map((s) => s.expense));
    const incLine = buildSmoothPath(incPts);
    const expLine = buildSmoothPath(expPts);

    const baseY = padT + plotH;
    const incArea =
      incPts.length > 1
        ? `${incLine} L ${incPts[incPts.length - 1].x.toFixed(1)} ${baseY} L ${incPts[0].x.toFixed(1)} ${baseY} Z`
        : '';
    const expArea =
      expPts.length > 1
        ? `${expLine} L ${expPts[expPts.length - 1].x.toFixed(1)} ${baseY} L ${expPts[0].x.toFixed(1)} ${baseY} Z`
        : '';

    const yTicks = [1, 0.66, 0.33, 0].map((ratio) => ({
      y: padT + plotH * (1 - ratio),
      label: formatTL(Math.round(maxVal * ratio), true).replace('₺', ''),
    }));

    return { w, h, padL, padR, baseY, incLine, expLine, incArea, expArea, incPts, yTicks };
  }, [series]);

  return (
    <svg
      viewBox={`0 0 ${chart.w} ${chart.h}`}
      className="h-full w-full overflow-visible"
      preserveAspectRatio="none"
      role="img"
      aria-label="Kazanç ve gider akış grafiği"
    >
      <defs>
        <linearGradient id="execIncomeFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="execExpenseFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FB923C" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#FB923C" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {chart.yTicks.map((tick, idx) => (
        <g key={idx}>
          <line
            x1={chart.padL}
            y1={tick.y}
            x2={chart.w - chart.padR}
            y2={tick.y}
            stroke="rgba(148,163,184,0.16)"
            strokeWidth="0.8"
          />
          <text
            x={chart.padL - 4}
            y={tick.y + 3}
            textAnchor="end"
            fill="#94A3B8"
            fontSize="7.5"
            fontFamily="JetBrains Mono, monospace"
          >
            {tick.label}
          </text>
        </g>
      ))}

      {chart.incArea && <path d={chart.incArea} fill="url(#execIncomeFill)" />}
      {chart.expArea && <path d={chart.expArea} fill="url(#execExpenseFill)" />}

      {chart.incLine && (
        <path
          d={chart.incLine}
          fill="none"
          stroke="#22D3EE"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      )}
      {chart.expLine && (
        <path
          d={chart.expLine}
          fill="none"
          stroke="#FB923C"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      )}

      {series.map((pt, idx) => (
        <text
          key={`${pt.label}-${idx}`}
          x={chart.incPts[idx]?.x ?? 0}
          y={chart.h - 3}
          textAnchor="middle"
          fill="#94A3B8"
          fontSize="7.5"
          fontFamily="JetBrains Mono, monospace"
        >
          {pt.label}
        </text>
      ))}
    </svg>
  );
}

const ACCOUNT_STYLE: Record<
  AccountCardId,
  {
    bg: string;
    border: string;
    selectedBorder: string;
    glow: string;
    iconBg: string;
    pillBg: string;
    dotColor: string;
  }
> = {
  cash: {
    bg: 'from-[#0D5A6E]/85 via-[#0B3549]/85 to-[#092030]/90',
    border: 'border-cyan-500/35 hover:border-cyan-400/65',
    selectedBorder: 'border-cyan-300 ring-1 ring-cyan-400/60',
    glow: 'shadow-[0_0_24px_rgba(34,211,238,0.28)]',
    iconBg: 'bg-cyan-400/15 text-cyan-200 border-cyan-300/35',
    pillBg: 'bg-cyan-400/20 text-cyan-200',
    dotColor: 'bg-cyan-300 shadow-[0_0_10px_#22D3EE]',
  },
  credit: {
    bg: 'from-[#6B4F14]/85 via-[#3D2E0D]/85 to-[#1F1808]/90',
    border: 'border-amber-500/35 hover:border-amber-400/65',
    selectedBorder: 'border-amber-300 ring-1 ring-amber-400/60',
    glow: 'shadow-[0_0_24px_rgba(251,191,36,0.25)]',
    iconBg: 'bg-amber-400/15 text-amber-200 border-amber-300/35',
    pillBg: 'bg-amber-400/20 text-amber-200',
    dotColor: 'bg-amber-300 shadow-[0_0_10px_#FBBF24]',
  },
  investments: {
    bg: 'from-[#363B7E]/85 via-[#222657]/85 to-[#131738]/90',
    border: 'border-indigo-400/35 hover:border-indigo-300/65',
    selectedBorder: 'border-indigo-300 ring-1 ring-indigo-400/60',
    glow: 'shadow-[0_0_24px_rgba(129,140,248,0.28)]',
    iconBg: 'bg-indigo-400/15 text-indigo-200 border-indigo-300/35',
    pillBg: 'bg-indigo-400/20 text-indigo-200',
    dotColor: 'bg-indigo-300 shadow-[0_0_10px_#818CF8]',
  },
  expenses: {
    bg: 'from-[#701D3D]/85 via-[#431226]/85 to-[#240B16]/90',
    border: 'border-rose-400/35 hover:border-rose-300/65',
    selectedBorder: 'border-rose-300 ring-1 ring-rose-400/60',
    glow: 'shadow-[0_0_24px_rgba(251,113,133,0.28)]',
    iconBg: 'bg-rose-400/15 text-rose-200 border-rose-300/35',
    pillBg: 'bg-rose-400/20 text-rose-200',
    dotColor: 'bg-rose-300 shadow-[0_0_10px_#FB7185]',
  },
};

export function ExecutiveDashboard({
  metrics,
  selectedAccountId,
  onSelectAccount,
  onOpenAccountDetail,
  onManageOperation,
  onDetailOperation,
}: ExecutiveDashboardProps) {
  const trendSign = metrics.weeklyTrendDeltaPct >= 0 ? '+' : '';
  const cashSign = metrics.dailyCashDeltaPct >= 0 ? '+' : '';

  return (
    <section
      aria-label="Finansal Genel Bakış 3 Sütunlu Kontrol Paneli"
      data-testid="executive-dashboard"
      className="panel-scroll h-full w-full p-1.5 lg:p-3.5"
    >
      <div className="grid min-h-full grid-cols-1 gap-1.5 min-[680px]:h-full min-[680px]:grid-cols-12 lg:gap-3.5">
        {/* ============================================================
            COLUMN 1 (LEFT): KAZANÇ VE GİDER + HAFTALIK TRENDLER + TOPLAM KASA
           ============================================================ */}
        <div
          data-testid="dashboard-col-left"
          className="flex min-h-0 flex-col gap-1.5 min-[680px]:col-span-4 lg:gap-3"
        >
          {/* 1A. Kazanç ve Gider Chart Card */}
          <div className="flex min-h-0 flex-[1.15] flex-col rounded-2xl border border-slate-700/65 bg-[#111B30]/85 p-2 backdrop-blur-md lg:p-3.5">
            <div className="flex items-center justify-between gap-1">
              <h2 className="text-[10px] font-extrabold tracking-wide text-slate-100 lg:text-xs">
                KAZANÇ VE GİDER
              </h2>
              <span className="font-mono-num text-[9px] text-slate-400 lg:text-[10px]">
                7 Günlük Akış
              </span>
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[9px] lg:mt-1 lg:text-[11px]">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 lg:h-2 lg:w-2" aria-hidden="true" />
                <span className="text-slate-300">Gelir</span>
                <span className="font-mono-num font-bold text-cyan-300">
                  {formatTL(metrics.totalPeriodIncome, true)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400 lg:h-2 lg:w-2" aria-hidden="true" />
                <span className="text-slate-300">Gider</span>
                <span className="font-mono-num font-bold text-orange-300">
                  {formatTL(metrics.totalPeriodExpense, true)}
                </span>
              </div>
            </div>

            <div className="mt-1 min-h-0 flex-1 lg:mt-1.5">
              <IncomeExpenseChart series={metrics.incomeExpenseSeries} />
            </div>
          </div>

          {/* 1B. Haftalık Trendler Vertical Bar Chart Card */}
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-700/65 bg-[#111B30]/85 p-2 backdrop-blur-md lg:p-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[10px] font-extrabold tracking-wide text-slate-100 lg:text-xs">
                HAFTALIK TRENDLER
              </h2>
              <span
                data-testid="weekly-trend-delta"
                className={`font-mono-num text-[10.5px] font-extrabold lg:text-xs ${
                  metrics.weeklyTrendDeltaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {trendSign}
                {metrics.weeklyTrendDeltaPct.toFixed(1)}%
              </span>
            </div>

            <div className="mt-1 flex min-h-0 flex-1 items-end justify-between gap-1 px-0.5 pt-0.5 lg:mt-2 lg:gap-1.5 lg:px-1">
              {metrics.weeklyTrends.map((bar, idx) => {
                const gradient =
                  bar.tone === 'emerald'
                    ? 'from-emerald-300 via-emerald-400 to-teal-600 shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                    : bar.tone === 'amber'
                    ? 'from-amber-300 via-orange-400 to-amber-600 shadow-[0_0_10px_rgba(251,146,60,0.35)]'
                    : 'from-cyan-300 via-sky-400 to-blue-600 shadow-[0_0_10px_rgba(56,189,248,0.28)]';
                return (
                  <div
                    key={`${bar.label}-${idx}`}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-0.5 lg:gap-1"
                    title={`${bar.label}: ${bar.net >= 0 ? '+' : ''}${formatTL(bar.net)}`}
                  >
                    <div className="flex h-full w-full items-end justify-center">
                      <div
                        className={`w-full max-w-[14px] rounded-t-md bg-gradient-to-b ${gradient} transition-all duration-300 lg:max-w-[20px]`}
                        style={{ height: `${bar.pctHeight}%` }}
                      />
                    </div>
                    <span className="font-mono-num text-[7.5px] text-slate-400 lg:text-[9.5px]">
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 1C. Toplam Kasa Summary Card */}
          <div
            data-testid="dashboard-total-cash-card"
            className="shrink-0 rounded-2xl border border-slate-700/70 bg-gradient-to-r from-[#13203A]/95 to-[#0E182C]/95 px-2.5 py-1.5 backdrop-blur-md lg:px-4 lg:py-3"
          >
            <div className="text-[9px] font-bold tracking-wider text-slate-400 lg:text-[10px]">
              TOPLAM KASA
            </div>
            <div className="mt-0.5 flex items-baseline justify-between gap-2">
              <span
                className={`truncate font-mono-num text-sm font-extrabold tracking-tight lg:text-xl ${
                  metrics.totalCash < 0 ? 'text-rose-400' : 'text-white'
                }`}
              >
                {formatTL(metrics.totalCash)}
              </span>
              <span
                className={`shrink-0 font-mono-num text-[10.5px] font-bold lg:text-xs ${
                  metrics.dailyCashDeltaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ({cashSign}
                {metrics.dailyCashDeltaPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================
            COLUMN 2 (CENTER): HESAPLARIM — 2x2 SELECTABLE CARD GRID
           ============================================================ */}
        <div
          data-testid="dashboard-col-center"
          className="flex min-h-0 flex-col gap-1 min-[680px]:col-span-4 lg:gap-2.5"
        >
          <div className="flex shrink-0 items-end justify-between px-0.5">
            <div>
              <h2 className="text-[10px] font-extrabold tracking-wide text-slate-100 lg:text-xs">
                HESAPLARIM
              </h2>
              <p className="text-[9px] text-slate-400 lg:text-[10px]">
                İnteraktif hesap kartı seçimi
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenAccountDetail(selectedAccountId)}
              className="flex items-center gap-0.5 text-[9.5px] font-bold text-cyan-300 hover:text-cyan-200 whitespace-nowrap lg:text-[10px]"
            >
              <span>Seçili Detay</span>
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-1.5 lg:gap-3">
            {metrics.accountCards.map((card) => {
              const selected = selectedAccountId === card.id;
              const style = ACCOUNT_STYLE[card.id];
              return (
                <button
                  key={card.id}
                  type="button"
                  data-testid={`account-card-${card.id}`}
                  aria-pressed={selected}
                  onClick={() => {
                    if (selected) {
                      onOpenAccountDetail(card.id);
                    } else {
                      onSelectAccount(card.id);
                    }
                  }}
                  className={`group relative flex h-full min-h-0 flex-col justify-between rounded-2xl border bg-gradient-to-br p-2 text-left transition-all lg:p-3.5 ${
                    style.bg
                  } ${selected ? `${style.selectedBorder} ${style.glow}` : style.border}`}
                >
                  {/* Top row: SEÇİLİ label + index number */}
                  <div className="flex w-full items-center justify-between gap-1">
                    {selected ? (
                      <span
                        data-testid={`account-selected-badge-${card.id}`}
                        className="rounded-md bg-white/15 px-1.5 py-0.5 text-[8.5px] font-extrabold tracking-wider text-white lg:text-[9px]"
                      >
                        SEÇİLİ
                      </span>
                    ) : (
                      <span className="truncate text-[8.5px] font-semibold text-slate-300/80 lg:text-[9px]">
                        {card.badgeText}
                      </span>
                    )}
                    <span className="font-mono-num text-[11px] font-extrabold text-white/75 lg:text-xs">
                      {card.index}
                    </span>
                  </div>

                  {/* Center Emblem */}
                  <div className="my-0.5 flex items-center justify-end pr-0.5 lg:my-1">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-lg border lg:h-10 lg:w-10 lg:rounded-xl ${style.iconBg}`}
                    >
                      {card.id === 'cash' ? (
                        <ShieldCheck className="h-3.5 w-3.5 lg:h-5 lg:w-5" />
                      ) : card.id === 'credit' ? (
                        <Landmark className="h-3.5 w-3.5 lg:h-5 lg:w-5" />
                      ) : card.id === 'investments' ? (
                        <TrendingUp className="h-3.5 w-3.5 lg:h-5 lg:w-5" />
                      ) : (
                        <Flame className="h-3.5 w-3.5 lg:h-5 lg:w-5" />
                      )}
                    </div>
                  </div>

                  {/* Bottom Title, Amount & Toggle Indicator */}
                  <div className="min-w-0">
                    <div className="line-clamp-2 text-[8.5px] font-extrabold leading-tight tracking-wide text-slate-100 lg:text-[10.5px]">
                      {card.title}
                    </div>
                    <div className="mt-0.5 truncate font-mono-num text-xs font-extrabold text-white lg:text-lg">
                      {formatTL(card.amount, true)}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-1 lg:mt-1">
                      <span className="truncate text-[8px] text-slate-300/90 lg:text-[10px]">
                        {card.subtitle}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`flex h-3 w-5 shrink-0 items-center rounded-full p-0.5 transition-all lg:h-3.5 lg:w-6 ${
                          selected ? 'justify-end bg-white/25' : 'justify-start bg-black/30'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full lg:h-2.5 lg:w-2.5 ${style.dotColor}`} />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================
            COLUMN 3 (RIGHT): FİLO & YÖNETİM / OPERASYON KARTLARI
           ============================================================ */}
        <div
          data-testid="dashboard-col-right"
          className="flex min-h-0 flex-col gap-1.5 min-[680px]:col-span-4 lg:gap-2.5"
        >
          <div className="flex shrink-0 items-center justify-between px-0.5">
            <h2 className="text-[10px] font-extrabold tracking-wide text-slate-100 lg:text-xs">
              FİLO & YÖNETİM
            </h2>
            <span className="text-[9.5px] font-bold tracking-wide text-slate-300 lg:text-[10px]">
              İŞLETMELER
            </span>
          </div>

          {/* Card A — Aktif İşletmeler */}
          <div
            data-testid="op-card-businesses"
            className="flex min-h-0 flex-1 flex-col justify-between rounded-2xl border border-slate-700/70 bg-[#111B30]/85 p-2 backdrop-blur-md lg:p-3.5"
          >
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-emerald-400/35 bg-emerald-500/15 text-emerald-300 lg:h-9 lg:w-9 lg:rounded-xl">
                  <Building2 className="h-3.5 w-3.5 lg:h-4.5 lg:w-4.5" />
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="text-[9px] font-extrabold tracking-wide text-slate-200 lg:text-[11px]">
                    AKTİF İŞLETMELER
                  </div>
                  <div className="truncate font-mono-num text-xs font-extrabold text-white lg:text-base">
                    {metrics.branchCount} Adet
                    {metrics.underConstructionCount > 0 && (
                      <span className="ml-1 text-[9px] font-semibold text-amber-300 lg:text-[10px]">
                        ({metrics.underConstructionCount} İnşaat)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className="font-mono-num text-[11px] font-extrabold text-cyan-300 lg:text-xs">
                A
              </span>
            </div>

            <div className="my-0.5 space-y-0.5 lg:my-1.5 lg:space-y-1">
              <div className="flex items-center justify-between text-[9px] text-slate-300 lg:text-[10px]">
                <span>
                  Kalite:{' '}
                  <strong className="font-mono-num text-emerald-300">
                    {metrics.avgServiceQuality > 0 ? `${metrics.avgServiceQuality.toFixed(1)}★` : '—'}
                  </strong>
                </span>
                <span className="font-mono-num text-slate-200">
                  Gider {formatTL(metrics.dailyOperatingExpenses, true)}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800/90 lg:h-1.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-all duration-300"
                  style={{ width: `${Math.max(8, metrics.serviceQualityPct)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 lg:gap-2">
              <button
                type="button"
                data-testid="op-manage-businesses"
                onClick={() => onManageOperation('businesses')}
                className="rounded-full border border-emerald-400/70 bg-emerald-500/15 py-0.5 text-[9.5px] font-extrabold tracking-wide text-emerald-200 hover:bg-emerald-500/25 lg:py-1.5 lg:text-[11px] whitespace-nowrap"
              >
                YÖNET
              </button>
              <button
                type="button"
                data-testid="op-detail-businesses"
                onClick={() => onDetailOperation('businesses')}
                className="rounded-full border border-sky-400/45 bg-sky-500/10 py-0.5 text-[9.5px] font-bold tracking-wide text-sky-200 hover:bg-sky-500/20 lg:py-1.5 lg:text-[11px] whitespace-nowrap"
              >
                DETAY
              </button>
            </div>
          </div>

          {/* Card B — Ofis Prestiji */}
          <div
            data-testid="op-card-office"
            className="flex min-h-0 flex-1 flex-col justify-between rounded-2xl border border-slate-700/70 bg-[#111B30]/85 p-2 backdrop-blur-md lg:p-3.5"
          >
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-amber-400/35 bg-amber-500/15 text-amber-300 lg:h-9 lg:w-9 lg:rounded-xl">
                  <Crown className="h-3.5 w-3.5 lg:h-4.5 lg:w-4.5" />
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="text-[9px] font-extrabold tracking-wide text-slate-200 lg:text-[11px]">
                    OFİS PRESTİJİ
                  </div>
                  <div className="truncate font-mono-num text-xs font-extrabold text-white lg:text-base">
                    {metrics.officeTierName}
                  </div>
                </div>
              </div>
              <span className="font-mono-num text-[11px] font-extrabold text-amber-300 lg:text-xs">
                B
              </span>
            </div>

            <div className="my-0.5 space-y-0.5 lg:my-1.5 lg:space-y-1">
              <div className="flex items-center justify-between text-[9px] text-slate-300 lg:text-[10px]">
                <span>
                  Tanınırlık{' '}
                  <strong className="font-mono-num text-amber-300">
                    %{metrics.brandRecognitionPct}
                  </strong>
                </span>
                <span className="font-mono-num text-emerald-300">
                  Tedarik -%{metrics.supplyDiscountPct}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800/90 lg:h-1.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-300"
                  style={{ width: `${Math.max(8, metrics.officePrestige)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 lg:gap-2">
              <button
                type="button"
                data-testid="op-manage-office"
                onClick={() => onManageOperation('office')}
                className="rounded-full border border-emerald-400/70 bg-emerald-500/15 py-0.5 text-[9.5px] font-extrabold tracking-wide text-emerald-200 hover:bg-emerald-500/25 lg:py-1.5 lg:text-[11px] whitespace-nowrap"
              >
                YÖNET
              </button>
              <button
                type="button"
                data-testid="op-detail-office"
                onClick={() => onDetailOperation('office')}
                className="rounded-full border border-sky-400/45 bg-sky-500/10 py-0.5 text-[9.5px] font-bold tracking-wide text-sky-200 hover:bg-sky-500/20 lg:py-1.5 lg:text-[11px] whitespace-nowrap"
              >
                DETAY
              </button>
            </div>
          </div>

          {/* Card C — Ar-Ge & Büyüme */}
          <div
            data-testid="op-card-growth"
            className="flex min-h-0 flex-1 flex-col justify-between rounded-2xl border border-slate-700/70 bg-[#111B30]/85 p-2 backdrop-blur-md lg:p-3.5"
          >
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-300 lg:h-9 lg:w-9 lg:rounded-xl">
                  <FlaskConical className="h-3.5 w-3.5 lg:h-4.5 lg:w-4.5" />
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="text-[9px] font-extrabold tracking-wide text-slate-200 lg:text-[11px]">
                    AR-GE & BÜYÜME
                  </div>
                  <div className="truncate font-mono-num text-xs font-extrabold text-white lg:text-base">
                    {metrics.activeGrowthProjects} Proje · Sv.{metrics.companyLevel}
                  </div>
                </div>
              </div>
              <span className="font-mono-num text-[11px] font-extrabold text-fuchsia-300 lg:text-xs">
                C
              </span>
            </div>

            <div className="my-0.5 space-y-0.5 lg:my-1.5 lg:space-y-1">
              <div className="flex items-center justify-between text-[9px] text-slate-300 lg:text-[10px]">
                <span>
                  Bütçe{' '}
                  <strong className="font-mono-num text-fuchsia-300">
                    {formatTL(metrics.growthBudget, true)}
                  </strong>
                </span>
                <span className="font-mono-num text-cyan-300">%{metrics.tierProgressPct}</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800/90 lg:h-1.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-400 transition-all duration-300"
                  style={{ width: `${Math.max(8, metrics.tierProgressPct)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 lg:gap-2">
              <button
                type="button"
                data-testid="op-manage-growth"
                onClick={() => onManageOperation('growth')}
                className="rounded-full border border-fuchsia-400/75 bg-fuchsia-500/15 py-0.5 text-[9.5px] font-extrabold tracking-wide text-fuchsia-200 hover:bg-fuchsia-500/25 lg:py-1.5 lg:text-[11px] whitespace-nowrap"
              >
                YÖNET
              </button>
              <button
                type="button"
                data-testid="op-detail-growth"
                onClick={() => onDetailOperation('growth')}
                className="rounded-full border border-sky-400/45 bg-sky-500/10 py-0.5 text-[9.5px] font-bold tracking-wide text-sky-200 hover:bg-sky-500/20 lg:py-1.5 lg:text-[11px] whitespace-nowrap"
              >
                DETAY
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
