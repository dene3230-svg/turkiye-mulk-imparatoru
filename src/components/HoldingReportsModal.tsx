import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Coins,
  Megaphone,
  PieChart,
  Sparkles,
  Target,
  ThumbsUp,
  X,
} from 'lucide-react';
import type { EmpireState } from '../types/game';
import { formatTL } from '../game/economy';
import {
  computeHoldingReportsSnapshot,
  type ReportPeriodId,
  type ReportTrendPoint,
  type SectorDistributionSlice,
} from '../game/holdingReportsEngine';

interface HoldingReportsModalProps {
  state: EmpireState;
  now: number;
  onClose: () => void;
  onNavigateToBranch: (businessId: string) => void;
  onLaunchBulkAds: () => boolean;
  onDistributeBulkBonus: () => boolean;
}

function buildSmoothCurve(points: ReportTrendPoint[], width: number, height: number) {
  const safe =
    points.length >= 2
      ? points
      : [
          { label: '1g', revenue: 100, profit: 60 },
          { label: '2g', revenue: 120, profit: 75 },
        ];
  const padX = 8;
  const padY = 10;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  const safeNum = (v: number) => (Number.isFinite(v) ? v : 0);
  const maxVal = Math.max(
    1,
    ...safe.map((p) => Math.max(safeNum(p.revenue), Math.abs(safeNum(p.profit))))
  );

  const toCoords = (selector: (p: ReportTrendPoint) => number) =>
    safe.map((p, idx) => {
      const x = padX + (idx / Math.max(1, safe.length - 1)) * usableW;
      const clamped = Math.max(0, safeNum(selector(p)));
      const y = padY + (1 - clamped / maxVal) * usableH;
      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
    });

  const buildPath = (coords: Array<{ x: number; y: number }>) => {
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i += 1) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cx = Number(((curr.x + next.x) / 2).toFixed(1));
      d += ` C ${cx} ${curr.y}, ${cx} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
  };

  const revCoords = toCoords((p) => p.revenue);
  const profCoords = toCoords((p) => Math.max(0, p.profit));
  const revLine = buildPath(revCoords);
  const profLine = buildPath(profCoords);
  const lastRev = revCoords[revCoords.length - 1];
  const revArea = `${revLine} L ${lastRev.x} ${height} L ${revCoords[0].x} ${height} Z`;

  return { revLine, revArea, profLine, lastRev };
}

function SectorDonutChart({ slices }: { slices: SectorDistributionSlice[] }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  if (slices.length === 0) {
    return (
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-600 text-[10px] font-bold text-slate-400">
        Veri Yok
      </div>
    );
  }

  let offsetAcc = 0;
  return (
    <svg
      viewBox="0 0 96 96"
      aria-label="Sektörel dağılım grafiği"
      data-testid="reports-sector-donut"
      className="h-20 w-20 shrink-0 lg:h-28 lg:w-28"
    >
      <circle
        cx="48"
        cy="48"
        r={radius}
        fill="none"
        stroke="#1E293B"
        strokeWidth="16"
      />
      {slices.map((slice) => {
        const arcLen = Math.max(2, (slice.sharePct / 100) * circumference);
        const dashArray = `${Math.max(1, arcLen - 2)} ${circumference}`;
        const dashOffset = -offsetAcc;
        offsetAcc += arcLen;
        return (
          <circle
            key={slice.sectorKey}
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke={slice.color}
            strokeWidth="16"
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 48 48)"
          />
        );
      })}
      <circle cx="48" cy="48" r="22" fill="#0E172B" />
      <text
        x="48"
        y="46"
        textAnchor="middle"
        className="fill-slate-400 text-[7px] font-bold"
      >
        SEKTÖR
      </text>
      <text
        x="48"
        y="56"
        textAnchor="middle"
        className="fill-white font-mono-num text-[11px] font-extrabold"
      >
        {slices.length}
      </text>
    </svg>
  );
}

const PERIOD_OPTIONS: Array<{ id: ReportPeriodId; label: string }> = [
  { id: '24h', label: '24 SAAT' },
  { id: '7d', label: '7 GÜN' },
  { id: '30d', label: '30 GÜN' },
];

export function HoldingReportsModal({
  state,
  now,
  onClose,
  onNavigateToBranch,
  onLaunchBulkAds,
  onDistributeBulkBonus,
}: HoldingReportsModalProps) {
  const [period, setPeriod] = useState<ReportPeriodId>('24h');
  const [actionToast, setActionToast] = useState<string | null>(null);

  const report = computeHoldingReportsSnapshot(state, period, now);
  const chart = buildSmoothCurve(report.trendSeries, 240, 82);
  const canAffordAds = report.activeBranchCount > 0 && state.cash >= report.bulkAdCost;
  const canAffordBonus =
    (report.activeBranchCount > 0 || report.totalStaffCount > 0) &&
    state.cash >= report.bulkBonusCost;

  const triggerBulkAds = () => {
    const ok = onLaunchBulkAds();
    if (ok) {
      setActionToast(`Tüm aktif şubelerde (${report.activeBranchCount}) reklam yayında!`);
      window.setTimeout(() => setActionToast(null), 2600);
    }
  };

  const triggerBulkBonus = () => {
    const ok = onDistributeBulkBonus();
    if (ok) {
      setActionToast('Tüm personele prim dağıtıldı — yorgunluk düştü!');
      window.setTimeout(() => setActionToast(null), 2600);
    }
  };

  return (
    <div
      data-testid="holding-reports-modal"
      className="fixed inset-0 z-[1055] flex items-center justify-center bg-[#040915]/82 p-1.5 lg:p-5"
      onClick={onClose}
    >
      <div
        className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-[20px] border border-[#334155] bg-[#222B38]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==================== HEADER + PERIOD FILTER ==================== */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#334155] bg-[#0C1528]/95 px-3 py-1.5 lg:px-5 lg:py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide lg:text-base">
              <span className="text-slate-400">İŞLETMELERİM</span>
              <span className="text-[#7E96B0]">&gt;</span>
              <span className="text-white">TOPLAM DURUM VE RAPORLAR</span>
            </div>
            <p className="text-[9px] text-slate-400 lg:text-xs">
              Holdinginizin mali ve operasyonel sağlık raporu
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Period Filter: 24 SAAT | 7 GÜN | 30 GÜN */}
            <div
              data-testid="reports-period-toggle"
              className="flex items-center gap-0.5 rounded-xl border border-[#334155] bg-[#0A1224] p-0.5"
            >
              {PERIOD_OPTIONS.map((opt) => {
                const active = period === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`reports-period-${opt.id}`}
                    onClick={() => setPeriod(opt.id)}
                    className={`rounded-lg px-2 py-0.5 text-[9.5px] font-extrabold tracking-wide transition-all whitespace-nowrap lg:px-3 lg:py-1 lg:text-xs ${
                      active
                        ? 'bg-[#7E96B0]/15 text-cyan-100  ring-1 ring-cyan-400/70'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              data-testid="reports-close-btn"
              onClick={onClose}
              aria-label="Raporları kapat"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-[#334155] bg-[#1D2532] text-slate-300 transition-colors hover:border-[#B86B5E]/45 hover:text-white lg:h-8 lg:w-8"
            >
              <X className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            </button>
          </div>
        </div>

        {/* ==================== 3-COLUMN DECISION CENTER ==================== */}
        <div className="panel-scroll grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto p-2 sm:grid-cols-3 lg:gap-3.5 lg:p-4">
          {/* ==============================================================
              COLUMN 1: HOLDİNG MALİ DURUMU & GİDER KIRILIMI
             ============================================================== */}
          <div
            data-testid="reports-col-financial"
            className="flex flex-col justify-between rounded-[20px] border border-[#C8AE7D]/45 bg-[#222B38] p-2.5 lg:p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 text-[#C8AE7D] lg:h-9 lg:w-9">
                  <Coins className="h-4 w-4 lg:h-5 lg:w-5" />
                </div>
                <h3 className="text-[11px] font-extrabold leading-tight tracking-wide text-white lg:text-xs">
                  HOLDİNG MALİ DURUMU & GİDER KIRILIMI
                </h3>
              </div>

              {/* Revenue, Net Profit, Margin Summary */}
              <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-xl border border-[#334155] bg-[#0A1326]/85 p-2 lg:p-2.5">
                <div className="min-w-0">
                  <div className="truncate text-[9px] font-semibold text-slate-400 lg:text-[10.5px]">
                    {report.periodTitle}:
                  </div>
                  <div
                    data-testid="reports-total-revenue"
                    className="mt-0.5 truncate font-mono-num text-xs font-extrabold text-[#7A9E7E] lg:text-sm"
                  >
                    {formatTL(report.totalRevenue, true)}
                  </div>
                </div>
                <div className="min-w-0 border-l border-[#334155] pl-2">
                  <div className="truncate text-[9px] font-semibold text-slate-400 lg:text-[10.5px]">
                    Net Kâr:
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span
                      data-testid="reports-net-profit"
                      className={`truncate font-mono-num text-xs font-extrabold lg:text-sm ${
                        report.netProfit >= 0 ? 'text-[#7A9E7E]' : 'text-[#B86B5E]'
                      }`}
                    >
                      {formatTL(report.netProfit, true)}
                    </span>
                    <span
                      data-testid="reports-profit-margin"
                      className={`shrink-0 font-mono-num text-[9.5px] font-bold ${
                        report.profitMarginPct >= 0 ? 'text-[#7E96B0]' : 'text-[#B86B5E]'
                      }`}
                    >
                      (%{report.profitMarginPct})
                    </span>
                  </div>
                </div>
              </div>

              {/* Smooth Revenue & Net Profit Area/Line Chart */}
              <div className="mt-2 rounded-xl border border-[#334155] bg-[#0A1326]/80 px-2 pb-1 pt-1.5 lg:mt-2.5 lg:pb-1.5 lg:pt-2">
                <svg
                  viewBox="0 0 240 82"
                  preserveAspectRatio="none"
                  aria-label="Gelir ve net kâr grafiği"
                  className="h-14 w-full overflow-visible lg:h-24"
                >
                  <defs>
                    <linearGradient id="repRevArea" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.34" />
                      <stop offset="55%" stopColor="#22D3EE" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.4" />
                    </linearGradient>
                    <linearGradient id="repRevStroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#38BDF8" />
                      <stop offset="60%" stopColor="#22D3EE" />
                      <stop offset="100%" stopColor="#FBBF24" />
                    </linearGradient>
                  </defs>
                  <path d={chart.revArea} fill="url(#repRevArea)" />
                  <path
                    d={chart.profLine}
                    fill="none"
                    stroke="#34D399"
                    strokeWidth="1.6"
                    strokeDasharray="4 3"
                    opacity="0.85"
                  />
                  <path
                    d={chart.revLine}
                    fill="none"
                    stroke="url(#repRevStroke)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                  <circle cx={chart.lastRev.x} cy={chart.lastRev.y} r="3.2" fill="#FBBF24" />
                </svg>
                <div className="mt-1 flex items-center justify-between text-[8px] font-medium text-slate-400 lg:text-[9.5px]">
                  {report.trendSeries.map((pt) => (
                    <span key={pt.label}>{pt.label}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Expense Breakdown Bar */}
            <div data-testid="reports-expense-breakdown" className="mt-2.5">
              <div className="text-[9.5px] font-extrabold tracking-wider text-slate-300 lg:text-[10.5px]">
                GİDER KIRILIMI
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1 text-[9.5px] lg:text-[11px]">
                <div>
                  <div className="truncate text-slate-300">Personel</div>
                  <div
                    data-testid="reports-exp-personnel-pct"
                    className="font-mono-num font-extrabold text-[#7E96B0]"
                  >
                    %{report.expenseBreakdown.personnelPct}
                  </div>
                </div>
                <div>
                  <div className="truncate text-slate-300">Kira/Sabit</div>
                  <div
                    data-testid="reports-exp-rent-pct"
                    className="font-mono-num font-extrabold text-[#C8AE7D]"
                  >
                    %{report.expenseBreakdown.rentTaxPct}
                  </div>
                </div>
                <div className="text-right">
                  <div className="truncate text-slate-300">Tedarik</div>
                  <div
                    data-testid="reports-exp-supply-pct"
                    className="font-mono-num font-extrabold text-[#B86B5E]"
                  >
                    %{report.expenseBreakdown.supplyOpsPct}
                  </div>
                </div>
              </div>

              <div className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full bg-[#1D2532]">
                <div
                  className="h-full bg-[#7E96B0] transition-all"
                  style={{ width: `${report.expenseBreakdown.personnelPct}%` }}
                />
                <div
                  className="h-full bg-[#C8AE7D] transition-all"
                  style={{ width: `${report.expenseBreakdown.rentTaxPct}%` }}
                />
                <div
                  className="h-full bg-[#B86B5E] transition-all"
                  style={{ width: `${report.expenseBreakdown.supplyOpsPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* ==============================================================
              COLUMN 2: AKILLI UYARILAR & FIRSATLAR
             ============================================================== */}
          <div
            data-testid="reports-col-alerts"
            className="flex flex-col justify-between rounded-[20px] border border-[#334155] bg-[#222B38] p-2.5 lg:p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#334155] bg-[#7E96B0]/15 text-[#7E96B0] lg:h-9 lg:w-9">
                  <Target className="h-4 w-4 lg:h-5 lg:w-5" />
                </div>
                <h3 className="text-[11px] font-extrabold leading-tight tracking-wide text-white lg:text-xs">
                  AKILLI UYARILAR & FIRSATLAR
                </h3>
              </div>

              {/* Dynamic Smart Diagnostic Cards */}
              <div className="mt-2 space-y-1.5 lg:mt-2.5 lg:space-y-2">
                {report.alerts.length === 0 ? (
                  <div
                    data-testid="reports-optimum-card"
                    className="flex items-center gap-2 rounded-xl border border-[#7A9E7E]/45 bg-[#7A9E7E]/15 p-2.5 text-emerald-100 lg:gap-2.5 lg:p-3"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#7A9E7E] lg:h-5 lg:w-5" />
                    <div className="text-[10.5px] font-bold leading-snug lg:text-xs">
                      Tüm şubeler optimum verimde çalışıyor
                    </div>
                  </div>
                ) : (
                  report.alerts.map((alert) => {
                    const isWarn = alert.type === 'warning';
                    return (
                      <div
                        key={alert.id}
                        data-testid={`reports-alert-${alert.type}`}
                        className={`rounded-xl border p-2 lg:p-2.5 ${
                          isWarn
                            ? 'border-[#C8AE7D]/45 bg-[#C8AE7D]'
                            : 'border-[#7A9E7E]/45 bg-[#7A9E7E]'
                        }`}
                      >
                        <div className="flex items-start gap-1.5 lg:gap-2">
                          {isWarn ? (
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C8AE7D] lg:h-4 lg:w-4" />
                          ) : (
                            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7A9E7E] lg:h-4 lg:w-4" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[10px] font-extrabold text-white lg:text-xs">
                              {alert.headline}
                            </div>
                            <p className="mt-0.5 text-[9px] leading-snug text-slate-200 lg:text-[11px]">
                              {alert.detail}
                            </p>
                          </div>
                        </div>

                        <div className="mt-1.5 flex justify-end lg:mt-2">
                          <button
                            type="button"
                            data-testid={`reports-alert-action-${alert.type}`}
                            onClick={() => onNavigateToBranch(alert.businessId)}
                            className={`rounded-lg border px-2 py-0.5 text-[9px] font-extrabold tracking-wide transition-all hover:brightness-125 lg:px-2.5 lg:py-1 lg:text-[10.5px] ${
                              isWarn
                                ? 'border-[#C8AE7D]/45 bg-[#C8AE7D]/15 text-amber-100'
                                : 'border-[#7A9E7E]/45 bg-[#7A9E7E]/15 text-emerald-100'
                            }`}
                          >
                            {alert.actionLabel}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Customer Satisfaction & Brand Recognition Bars */}
            <div className="mt-2 space-y-1.5 rounded-xl border border-[#334155] bg-[#0A1326]/85 p-2 lg:mt-3 lg:space-y-2 lg:p-2.5">
              <div>
                <div className="flex items-center justify-between text-[10px] lg:text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-slate-200">
                    <ThumbsUp className="h-3.5 w-3.5 text-[#7A9E7E]" />
                    Memnuniyet:
                  </span>
                  <span className="font-mono-num font-extrabold text-[#7A9E7E]">
                    %{report.customerSatisfactionPct}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#1D2532]">
                  <div
                    className="h-full rounded-full bg-[#7A9E7E] transition-all"
                    style={{ width: `${Math.max(5, report.customerSatisfactionPct)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] lg:text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-slate-200">
                    <Megaphone className="h-3.5 w-3.5 text-[#C8AE7D]" />
                    Bilinirlik:
                  </span>
                  <span className="font-mono-num font-extrabold text-[#C8AE7D]">
                    %{report.brandRecognitionPct}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#1D2532]">
                  <div
                    className="h-full rounded-full bg-[#C8AE7D] transition-all"
                    style={{ width: `${Math.max(5, report.brandRecognitionPct)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ==============================================================
              COLUMN 3: SEKTÖREL DAĞILIM & TOPLU HOLDİNG AKSİYONLARI
             ============================================================== */}
          <div
            data-testid="reports-col-sectors"
            className="flex flex-col justify-between rounded-[20px] border border-[#C8AE7D]/45 bg-[#222B38] p-2.5 lg:p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 text-[#C8AE7D] lg:h-9 lg:w-9">
                  <PieChart className="h-4 w-4 lg:h-5 lg:w-5" />
                </div>
                <h3 className="text-[10.5px] font-extrabold leading-tight tracking-wide text-white lg:text-xs">
                  SEKTÖREL DAĞILIM & TOPLU YÖNETİM
                </h3>
              </div>

              {/* Donut Chart + Sector Legend */}
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#334155] bg-[#0A1326]/85 p-2 lg:mt-2.5 lg:gap-2.5 lg:p-2.5">
                <SectorDonutChart slices={report.sectorSlices} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  {report.sectorSlices.length === 0 ? (
                    <div className="text-[10px] text-slate-400">
                      Henüz kurulmuş şube sektörü yok.
                    </div>
                  ) : (
                    report.sectorSlices.slice(0, 4).map((slice) => (
                      <div
                        key={slice.sectorKey}
                        className="flex items-center justify-between gap-1.5 text-[10px] lg:text-xs"
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: slice.color }}
                          />
                          <span className="truncate font-bold text-slate-200">
                            {slice.label}
                          </span>
                        </span>
                        <span
                          className="shrink-0 font-mono-num font-extrabold"
                          style={{ color: slice.color }}
                        >
                          %{slice.sharePct}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Bulk Holding Actions */}
            <div className="mt-2 space-y-1.5 lg:mt-3 lg:space-y-2">
              <div className="text-[9px] font-extrabold tracking-wider text-slate-300 lg:text-[10.5px]">
                TOPLU HOLDİNG AKSİYONLARI
              </div>

              {actionToast && (
                <div
                  data-testid="reports-bulk-action-toast"
                  className="rounded-lg border border-[#7A9E7E]/45 bg-[#7A9E7E]/15 px-2 py-0.5 text-[9.5px] font-bold text-[#7A9E7E] lg:px-2.5 lg:py-1 lg:text-[10px]"
                >
                  {actionToast}
                </div>
              )}

              <button
                type="button"
                data-testid="reports-bulk-ads-btn"
                disabled={!canAffordAds}
                onClick={triggerBulkAds}
                className={`flex min-h-[34px] w-full flex-col items-center justify-center rounded-xl border px-2.5 py-1 transition-all lg:min-h-[44px] lg:px-3 lg:py-1.5 ${
                  canAffordAds
                    ? 'border-[#334155] bg-[#7E96B0] text-cyan-50  hover:brightness-115 active:scale-[0.98]'
                    : 'cursor-not-allowed border-[#334155] bg-[#1D2532] text-slate-500'
                }`}
              >
                <span className="text-[9.5px] font-extrabold tracking-wide lg:text-xs">
                  TÜM ŞUBELERE REKLAM VER
                </span>
                <span className="font-mono-num text-[9px] font-bold text-[#7E96B0] lg:text-[11px]">
                  ({formatTL(report.bulkAdCost)})
                </span>
              </button>

              <button
                type="button"
                data-testid="reports-bulk-bonus-btn"
                disabled={!canAffordBonus}
                onClick={triggerBulkBonus}
                className={`flex min-h-[34px] w-full flex-col items-center justify-center rounded-xl border px-2.5 py-1 transition-all lg:min-h-[44px] lg:px-3 lg:py-1.5 ${
                  canAffordBonus
                    ? 'border-[#C8AE7D]/45 bg-[#C8AE7D] text-amber-50  hover:brightness-115 active:scale-[0.98]'
                    : 'cursor-not-allowed border-[#334155] bg-[#1D2532] text-slate-500'
                }`}
              >
                <span className="text-[9.5px] font-extrabold tracking-wide lg:text-xs">
                  TÜM PERSONELE PRİM DAĞIT
                </span>
                <span className="font-mono-num text-[9px] font-bold text-[#C8AE7D] lg:text-[11px]">
                  ({formatTL(report.bulkBonusCost)})
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
