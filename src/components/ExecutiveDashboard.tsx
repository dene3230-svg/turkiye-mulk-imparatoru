import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Coffee,
  CreditCard,
  Factory,
  Gamepad2,
  Handshake,
  Home,
  Hotel,
  Landmark,
  Megaphone,
  MessageSquare,
  Monitor,
  Plus,
  Settings,
  ShoppingBag,
  TrendingUp,
  UserCheck,
  Users,
  Utensils,
  Car,
} from 'lucide-react';
import type { EmpireState, OwnedBusiness, RemoteBusinessRecord } from '../types/game';
import type { ExecutiveDashboardMetrics, IncomeExpensePoint } from '../game/dashboardMetrics';
import { calculateBusinessHourlyIncome, formatTL, isBusinessUnderConstruction } from '../game/economy';
import { calculateBranchServiceQuality } from '../game/officeEngine';
import {
  calculateDailyRentalIncome,
  ensureDailyOffersForDay,
} from '../game/quickActionsEngine';
import { getBlueprintById } from '../game/catalog';
import {
  CONDITION_SUSPEND_THRESHOLD,
  CONDITION_WARNING_THRESHOLD,
  FORECLOSURE_STREAK_DAYS,
  hasBranchManager,
} from '../game/hardcoreEconomyEngine';

export type QuickActionId =
  | 'ads'
  | 'rentals'
  | 'franchise'
  | 'offers'
  | 'borsa'
  | 'bank'
  | 'hr'
  | 'reports';

interface ExecutiveDashboardProps {
  state: EmpireState;
  metrics: ExecutiveDashboardMetrics;
  now: number;
  franchiseOfferCount: number;
  competitorBusinesses?: RemoteBusinessRecord[];
  onQuickAction: (action: QuickActionId) => void;
  onManageBranch: (businessId: string) => void;
  onDiscoverBranches: () => void;
  onOpenSettings: () => void;
  onOpenCrisis?: () => void;
  onOpenRaiseRequests?: () => void;
  onOpenStrategicHub?: () => void;
}

function buildSmoothCurvePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
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

function HoldingTrendAreaChart({ series }: { series: IncomeExpensePoint[] }) {
  const chart = useMemo(() => {
    const w = 520;
    const h = 112;
    const padL = 8;
    const padR = 8;
    const padT = 14;
    const padB = 22;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const rawVals = series.map((pt) =>
      Number.isFinite(pt.income) ? Math.max(0, pt.income) : 0
    );
    const hasActivity = rawVals.some((v) => v > 0);
    // Gentle baseline silhouette when brand new with 0 turnover so chart never looks broken
    const values = hasActivity ? rawVals : [22, 46, 40, 52, 74, 86, 80];
    const maxVal = Math.max(100, ...values) * 1.15;
    const minVal = Math.min(...values) * 0.25;
    const span = Math.max(1, maxVal - minVal);

    const pts = values.map((v, idx) => {
      const x =
        padL + (values.length > 1 ? (idx / (values.length - 1)) * plotW : plotW / 2);
      const y = padT + plotH - ((v - minVal) / span) * plotH;
      return { x, y };
    });

    const linePath = buildSmoothCurvePath(pts);
    const baseY = padT + plotH;
    const areaPath =
      pts.length > 1
        ? `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${baseY} L ${pts[0].x.toFixed(1)} ${baseY} Z`
        : '';

    const dayLabels = ['1 gün', '2 gün', '3 gün', '4 gün', '5 gün', '6 gün', '7 gün'];

    return { w, h, pts, linePath, areaPath, dayLabels };
  }, [series]);

  return (
    <svg
      viewBox={`0 0 ${chart.w} ${chart.h}`}
      className="h-full w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="7 günlük holding gelir trend grafiği"
    >
      <defs>
        <linearGradient id="matteTrendStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#75B18D" />
          <stop offset="55%" stopColor="#9AB589" />
          <stop offset="100%" stopColor="#D6AE5A" />
        </linearGradient>
        <linearGradient id="matteTrendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#89B390" stopOpacity="0.42" />
          <stop offset="65%" stopColor="#4F706A" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#222B38" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {chart.areaPath && <path d={chart.areaPath} fill="url(#matteTrendFill)" />}
      {chart.linePath && (
        <path
          d={chart.linePath}
          fill="none"
          stroke="url(#matteTrendStroke)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      )}

      {chart.pts.map((pt, idx) => (
        <text
          key={idx}
          x={pt.x}
          y={chart.h - 4}
          textAnchor={idx === 0 ? 'start' : idx === chart.pts.length - 1 ? 'end' : 'middle'}
          fill="#8E9BAE"
          fontSize="10.5"
        >
          {chart.dayLabels[idx] ?? `${idx + 1} gün`}
        </text>
      ))}
    </svg>
  );
}

function SectorOutlineIcon({ business }: { business: OwnedBusiness }) {
  const bp = getBlueprintById(business.blueprintId);
  const iconClass = 'h-4 w-4 shrink-0';
  switch (bp?.iconKey) {
    case 'coffee':
      return <Coffee className={`${iconClass} text-[#C96859]`} strokeWidth={1.5} />;
    case 'utensils':
      return <Utensils className={`${iconClass} text-[#D8A338]`} strokeWidth={1.5} />;
    case 'shopping-cart':
      return <ShoppingBag className={`${iconClass} text-[#6EB288]`} strokeWidth={1.5} />;
    case 'monitor':
      return <Monitor className={`${iconClass} text-[#86A8C9]`} strokeWidth={1.5} />;
    case 'gamepad':
      return <Gamepad2 className={`${iconClass} text-[#A59BB8]`} strokeWidth={1.5} />;
    case 'hotel':
      return <Hotel className={`${iconClass} text-[#C6B074]`} strokeWidth={1.5} />;
    case 'car':
      return <Car className={`${iconClass} text-[#8E9BAE]`} strokeWidth={1.5} />;
    case 'factory':
      return <Factory className={`${iconClass} text-[#C18B59]`} strokeWidth={1.5} />;
    default:
      return <Building2 className={`${iconClass} text-[#6EB288]`} strokeWidth={1.5} />;
  }
}

export function ExecutiveDashboard({
  state,
  metrics,
  now,
  franchiseOfferCount,
  competitorBusinesses = [],
  onQuickAction,
  onManageBranch,
  onDiscoverBranches,
  onOpenSettings,
  onOpenCrisis,
  onOpenRaiseRequests,
  onOpenStrategicHub,
}: ExecutiveDashboardProps) {
  const dailyRevenue = Math.max(0, Math.round(metrics.dailyEstimatedRevenue));
  const monthlyProjected = Math.round(dailyRevenue * 30);
  const dailyExpenses = Math.max(0, Math.round(metrics.dailyOperatingExpenses));
  const dailyNetProfit = dailyRevenue - dailyExpenses;

  // Expense breakdown percentages (Personel / Kira-Vergi / Tedarik / Merkez Yönetim) — exact proportional shares
  const rentAndTaxCost = metrics.dailyRentUtilities + (metrics.dailyCorporateTaxEstimate ?? 0);
  const hqBureaucracyCost = Math.max(0, metrics.dailyHqBureaucracyCost ?? 0);
  const expSum = Math.max(
    1,
    metrics.dailyPayrollWithSgk + rentAndTaxCost + metrics.dailyEstimatedSupply + hqBureaucracyCost
  );
  const hasRealExpense =
    metrics.dailyPayrollWithSgk + rentAndTaxCost + metrics.dailyEstimatedSupply + hqBureaucracyCost > 0;
  const staffPct = hasRealExpense
    ? Math.round((metrics.dailyPayrollWithSgk / expSum) * 100)
    : 45;
  const rentPct = hasRealExpense
    ? Math.round((rentAndTaxCost / expSum) * 100)
    : 30;
  const hqPct =
    hasRealExpense && hqBureaucracyCost > 0
      ? Math.round((hqBureaucracyCost / expSum) * 100)
      : 0;
  const supplyPct = Math.max(0, 100 - staffPct - rentPct - hqPct);

  // Live subtitles for right-column Quick Action tiles
  const currentMin = state.gameMinutes ?? 540;
  const activePromo =
    state.activeHoldingPromo && state.activeHoldingPromo.endsAtGameMin > currentMin
      ? state.activeHoldingPromo
      : null;
  const dailyRentalIncome = calculateDailyRentalIncome(state);
  const pendingOffersCount = ensureDailyOffersForDay(state).filter(
    (o) => o.status === 'pending'
  ).length;

  const quickActions: Array<{
    id: QuickActionId;
    title: string;
    subtitle: string;
    bg: string;
    border: string;
    icon: typeof Megaphone;
  }> = [
    {
      id: 'ads',
      title: 'Reklam & Tanıtım',
      subtitle: activePromo
        ? `Aktif +${Math.round(activePromo.revenueBoost * 100)}%`
        : 'Şubeleri büyüt',
      bg: 'bg-[#A69BB8] hover:bg-[#B2A8C4]',
      border: 'border-[#B9B0C9]/45',
      icon: Megaphone,
    },
    {
      id: 'rentals',
      title: 'Kiralık İlanları',
      subtitle:
        dailyRentalIncome > 0
          ? `+${formatTL(dailyRentalIncome, true)}/gün`
          : 'Mülkleri kirala',
      bg: 'bg-[#8693B2] hover:bg-[#93A0BE]',
      border: 'border-[#A2AECB]/45',
      icon: Home,
    },
    {
      id: 'franchise',
      title: 'Franchise',
      subtitle: `Teklifleri gör (${franchiseOfferCount})`,
      bg: 'bg-[#C7B276] hover:bg-[#D1BD84]',
      border: 'border-[#DBC992]/45',
      icon: Handshake,
    },
    {
      id: 'offers',
      title: 'Teklifler',
      subtitle:
        pendingOffersCount > 0
          ? `${pendingOffersCount} fırsat bekliyor`
          : 'Tümü incelendi',
      bg: 'bg-[#9FB1C5] hover:bg-[#ACBDD0]',
      border: 'border-[#B7C7D8]/45',
      icon: MessageSquare,
    },
    {
      id: 'borsa',
      title: 'Yatırımlar & Borsa',
      subtitle: 'Holdingi büyüt',
      bg: 'bg-[#93AEC8] hover:bg-[#A1BBD3]',
      border: 'border-[#AFC6DC]/45',
      icon: TrendingUp,
    },
    {
      id: 'bank',
      title: 'Banka',
      subtitle: 'Kredi çek, öde',
      bg: 'bg-[#8894A4] hover:bg-[#95A1B1]',
      border: 'border-[#A4AFBE]/45',
      icon: CreditCard,
    },
    {
      id: 'hr',
      title: 'Personel',
      subtitle: `İK & ${metrics.totalStaffCount} kişi`,
      bg: 'bg-[#8AA096] hover:bg-[#97ADA3]',
      border: 'border-[#A7BBB1]/45',
      icon: Users,
    },
    {
      id: 'reports',
      title: 'Günlük Raporlar',
      subtitle: 'İstatistikler',
      bg: 'bg-[#C48C59] hover:bg-[#CE9867]',
      border: 'border-[#D8A77A]/45',
      icon: CheckCircle2,
    },
  ];

  return (
    <section
      aria-label="Genel Bakış Yönetici Kontrol Paneli"
      data-testid="executive-dashboard"
      className="panel-scroll h-full w-full bg-[#181F29] px-3 py-2.5 lg:px-5 lg:py-4"
    >
      <div className="grid grid-cols-1 gap-3.5 min-[760px]:grid-cols-12 min-[1024px]:h-full lg:gap-5">
        {/* ================================================================
            CENTER COLUMN (8/12): GENEL BAKIŞ
            1) HOLDİNG MALİ DURUMU
            2) AKTİF İŞLETMELERİM (N)
           ================================================================ */}
        <div
          data-testid="overview-main-column"
          className="flex flex-col gap-3 min-[760px]:col-span-8 min-[1024px]:min-h-0 lg:gap-4"
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-wider text-slate-100 lg:text-lg">
              GENEL BAKIŞ
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              {metrics.negativeCashStreakDays > 0 && (
                <span
                  data-testid="foreclosure-warning-badge"
                  className="inline-flex items-center gap-1 rounded-xl border border-[#B86B5E]/60 bg-[#B86B5E]/15 px-2.5 py-1 text-[11px] font-semibold text-[#B86B5E]"
                >
                  <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>
                    Haciz Riski {metrics.negativeCashStreakDays}/{FORECLOSURE_STREAK_DAYS} Gün
                  </span>
                </span>
              )}
              {metrics.hasActiveCrisis && onOpenCrisis && (
                <button
                  type="button"
                  data-testid="overview-crisis-btn"
                  onClick={onOpenCrisis}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#B86B5E]/60 bg-[#222B38] px-2.5 py-1 text-[11px] font-semibold text-[#B86B5E] hover:bg-[#2A3545]"
                >
                  <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>Kriz Kararı</span>
                </button>
              )}
              {metrics.pendingRaiseCount > 0 && onOpenRaiseRequests && (
                <button
                  type="button"
                  data-testid="overview-raises-btn"
                  onClick={onOpenRaiseRequests}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#C8AE7D]/55 bg-[#222B38] px-2.5 py-1 text-[11px] font-semibold text-[#C8AE7D] hover:bg-[#2A3545]"
                >
                  <UserCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>Zam Talebi ({metrics.pendingRaiseCount})</span>
                </button>
              )}
              {onOpenStrategicHub && (
                <button
                  type="button"
                  data-testid="overview-strategic-hub-btn"
                  onClick={onOpenStrategicHub}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#334155] bg-[#222B38] px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-slate-400 hover:bg-[#2A3545]"
                >
                  <Landmark className="h-3.5 w-3.5 text-[#C8AE7D]" strokeWidth={1.5} />
                  <span>Mega Projeler & Prestij</span>
                </button>
              )}
            </div>
          </div>

          {/* CARD 1: HOLDİNG MALİ DURUMU */}
          <div
            data-testid="holding-financial-card"
            className="flex min-h-0 flex-[1.25] flex-col justify-between rounded-[20px] border border-[#334155] bg-[#222B38] p-3.5 lg:p-5"
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-semibold tracking-wider text-slate-400 lg:text-xs">
                  HOLDİNG MALİ DURUMU
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-medium">
                  <span
                    data-testid="progressive-tax-badge"
                    className="rounded-lg border border-[#334155] bg-[#181F29] px-2 py-0.5 font-mono-num text-slate-300"
                  >
                    Vergi Dilimi: %{metrics.progressiveTaxBracketPct}
                  </span>
                  {metrics.inflationIndex > 1.0 && (
                    <span
                      data-testid="inflation-index-badge"
                      className="rounded-lg border border-[#C8AE7D]/45 bg-[#181F29] px-2 py-0.5 font-mono-num text-[#C8AE7D]"
                    >
                      Enflasyon: x{metrics.inflationIndex.toFixed(2)}
                    </span>
                  )}
                  {metrics.prestigeMarketTier > 0 && (
                    <span className="rounded-lg border border-[#7A9E7E]/45 bg-[#181F29] px-2 py-0.5 font-mono-num text-[#7A9E7E]">
                      Prestij K.{metrics.prestigeMarketTier}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-sm font-medium text-slate-200 lg:text-[17px]">
                  Günlük Ciro:{' '}
                  <strong
                    data-testid="overview-daily-revenue"
                    className="font-mono-num font-bold text-white"
                  >
                    {formatTL(dailyRevenue)}
                  </strong>
                </div>
                <div className="text-sm font-medium text-slate-200 lg:text-[17px]">
                  Aylık Tahmini Hasılat:{' '}
                  <strong
                    data-testid="overview-monthly-revenue"
                    className="font-mono-num font-bold text-white"
                  >
                    {formatTL(monthlyProjected)}
                  </strong>
                </div>
              </div>
            </div>

            {/* 7-Day Matte Area Trend Curve */}
            <div className="my-2 min-h-[76px] flex-1 lg:my-3 lg:min-h-[104px]">
              <HoldingTrendAreaChart series={metrics.incomeExpenseSeries} />
            </div>

            {/* Giderler / Net Kâr Row + Segmented GİDER KIRILIMI Bar */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs lg:text-[15px]">
                <div className="font-medium text-[#B86B5E]">
                  Giderler:{' '}
                  <strong
                    data-testid="overview-daily-expenses"
                    className="font-mono-num font-bold"
                  >
                    {formatTL(dailyExpenses)}
                  </strong>{' '}
                  / Gün
                </div>
                <div
                  className={`font-medium ${
                    dailyNetProfit >= 0 ? 'text-[#7A9E7E]' : 'text-[#B86B5E]'
                  }`}
                >
                  Net Kâr:{' '}
                  <strong
                    data-testid="overview-daily-net"
                    className="font-mono-num font-bold"
                  >
                    {dailyNetProfit >= 0 ? '' : '-'}
                    {formatTL(Math.abs(dailyNetProfit))}
                  </strong>{' '}
                  / Gün
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10.5px] font-semibold tracking-wider text-slate-400">
                  GİDER KIRILIMI
                </div>
                <div
                  data-testid="expense-breakdown-bar"
                  className="flex h-6 w-full overflow-hidden rounded-full border border-[#334155] bg-[#181F29] text-[10.5px] font-medium text-slate-100 lg:h-7 lg:text-xs"
                >
                  {staffPct > 0 && (
                    <div
                      data-testid="expense-staff-segment"
                      className="flex items-center justify-center overflow-hidden bg-[#7E96B0] font-semibold text-[#181F29] transition-all"
                      style={{ width: `${staffPct}%` }}
                      title={`Personel %${staffPct}`}
                    >
                      {staffPct > 12 && (
                        <span className="truncate whitespace-nowrap px-1.5">Personel %{staffPct}</span>
                      )}
                    </div>
                  )}
                  {rentPct > 0 && (
                    <div
                      data-testid="expense-rent-segment"
                      className="flex items-center justify-center overflow-hidden bg-[#3E4C5E] transition-all"
                      style={{ width: `${rentPct}%` }}
                      title={`Kira/Vergi %${rentPct}`}
                    >
                      {rentPct > 12 && (
                        <span className="truncate whitespace-nowrap px-1.5">Kira/Vergi %{rentPct}</span>
                      )}
                    </div>
                  )}
                  {supplyPct > 0 && (
                    <div
                      data-testid="expense-supply-segment"
                      className="flex items-center justify-center overflow-hidden bg-[#B86B5E] transition-all"
                      style={{ width: `${supplyPct}%` }}
                      title={`Tedarik %${supplyPct}`}
                    >
                      {supplyPct > 12 && (
                        <span className="truncate whitespace-nowrap px-1.5">Tedarik %{supplyPct}</span>
                      )}
                    </div>
                  )}
                  {hqPct > 0 && (
                    <div
                      data-testid="expense-hq-bureaucracy-segment"
                      className="flex items-center justify-center overflow-hidden bg-[#C8AE7D] font-semibold text-[#181F29] transition-all"
                      style={{ width: `${hqPct}%` }}
                      title={`Merkez Yönetim & Denetim Gideri: ${formatTL(hqBureaucracyCost)}/gün (%${hqPct})`}
                    >
                      {hqPct > 12 && (
                        <span className="truncate whitespace-nowrap px-1.5">Merkez %{hqPct}</span>
                      )}
                    </div>
                  )}
                </div>
                <div
                  data-testid="expense-breakdown-legend"
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-300"
                >
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#7E96B0]" />
                    <span>Personel</span>
                    <strong className="font-mono-num text-slate-100">%{staffPct}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#3E4C5E] ring-1 ring-slate-500/60" />
                    <span>Kira/Vergi</span>
                    <strong className="font-mono-num text-slate-100">%{rentPct}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#B86B5E]" />
                    <span>Tedarik</span>
                    <strong className="font-mono-num text-slate-100">%{supplyPct}</strong>
                  </span>
                  {hqBureaucracyCost > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-[#C8AE7D]" />
                      <span>Merkez</span>
                      <strong className="font-mono-num text-[#C8AE7D]">
                        %{hqPct} ({formatTL(hqBureaucracyCost, true)})
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: AKTİF İŞLETMELERİM (N) */}
          <div
            data-testid="active-businesses-card"
            className="flex min-h-0 flex-1 flex-col rounded-[20px] border border-[#334155] bg-[#222B38] p-3.5 lg:p-4"
          >
            <div className="mb-2.5 flex items-center justify-between">
              <div className="text-[11px] font-semibold tracking-wider text-slate-300 lg:text-xs">
                AKTİF İŞLETMELERİM ({state.businesses.length})
              </div>
              {state.businesses.length > 3 && (
                <span className="text-[11px] text-slate-400">
                  Kaydırarak tüm şubeleri görün
                </span>
              )}
            </div>

            <div className="no-scrollbar flex min-h-0 flex-1 items-stretch gap-2.5 overflow-x-auto pb-0.5 lg:gap-3">
              {state.businesses.map((biz) => {
                const underConst = isBusinessUnderConstruction(biz);
                const staffAssigned = biz.employees?.length ?? 0;
                const quality = calculateBranchServiceQuality(
                  biz,
                  state.cityManagers ?? [],
                  state.businesses
                );
                const efficiencyPct = Math.max(
                  15,
                  Math.min(100, Math.round((quality.stars / 5) * 100))
                );
                const dailyBizRev = underConst
                  ? 0
                  : Math.round(
                      calculateBusinessHourlyIncome(
                        biz,
                        state.activeEvent,
                        now,
                        state.businesses,
                        { ...state, competitorBusinesses }
                      ) * 24
                    );

                const conditionPct = Math.max(
                  0,
                  Math.min(100, Math.round(biz.maintenanceLevel ?? 100))
                );
                const isSuspended =
                  Boolean(biz.suspendedForMaintenance) ||
                  conditionPct < CONDITION_SUSPEND_THRESHOLD;
                const isCondWarn = !isSuspended && conditionPct < CONDITION_WARNING_THRESHOLD;
                const unmanaged = !hasBranchManager(biz);
                const effectiveEfficiencyPct = isSuspended
                  ? 0
                  : unmanaged
                  ? Math.min(55, efficiencyPct)
                  : efficiencyPct;

                const barColor = isSuspended
                  ? 'bg-[#B86B5E]'
                  : isCondWarn
                  ? 'bg-[#C8AE7D]'
                  : 'bg-[#7A9E7E]';

                return (
                  <div
                    key={biz.id}
                    data-testid={`overview-branch-${biz.id}`}
                    className="flex min-w-[166px] max-w-[202px] flex-1 flex-col justify-between rounded-[14px] border border-[#334155] bg-[#1C2430] p-2.5 lg:p-3"
                  >
                    <div>
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                          <SectorOutlineIcon business={biz} />
                        </div>
                        <div className="min-w-0 leading-tight">
                          <div className="truncate text-xs font-bold text-slate-100 lg:text-[13px]">
                            {biz.customName}
                          </div>
                          <div className="text-[10.5px] text-slate-400">
                            (Sv. {biz.level}) {unmanaged ? '· Müd. Yok' : ''}
                          </div>
                        </div>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between gap-1 text-[10.5px] text-slate-300">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-[#C8AE7D]" strokeWidth={1.5} />
                          <span className="font-mono-num">{staffAssigned}/6</span>
                        </span>
                        <span className="font-mono-num text-slate-400">
                          {underConst ? 'İnşaat' : `Verim %${effectiveEfficiencyPct}`}
                        </span>
                      </div>

                      <div className="mt-1.5 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span
                            className={
                              isSuspended
                                ? 'font-bold text-[#B86B5E]'
                                : isCondWarn
                                ? 'text-[#C8AE7D]'
                                : 'text-slate-400'
                            }
                          >
                            {underConst
                              ? `Kalan ${biz.constructionDaysRemaining}g`
                              : isSuspended
                              ? 'DURDU · BAKIM'
                              : `Kondisyon %${conditionPct}`}
                          </span>
                        </div>
                        <div
                          data-testid={`overview-branch-condition-bar-${biz.id}`}
                          className="h-1.5 w-full overflow-hidden rounded-full bg-[#2C3647]"
                        >
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${underConst ? 25 : Math.max(4, conditionPct)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2 pt-1">
                      <span className="font-mono-num text-xs font-bold text-slate-100">
                        {formatTL(dailyBizRev, true)}
                      </span>
                      <button
                        type="button"
                        data-testid={`overview-manage-branch-${biz.id}`}
                        onClick={() => onManageBranch(biz.id)}
                        className="rounded-full border border-[#475569] bg-[#222B38] px-3 py-1 text-[10.5px] font-semibold text-slate-200 hover:border-slate-400 hover:bg-[#2C3647] hover:text-white whitespace-nowrap"
                      >
                        YÖNET
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Dashed "+ Yeni İşletme / Şube Kur" Tile */}
              <button
                type="button"
                data-testid="overview-new-branch-tile"
                onClick={onDiscoverBranches}
                className="flex min-w-[155px] flex-1 flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#475569] bg-[#1C2430]/60 p-3 text-center text-slate-400 hover:border-slate-300 hover:bg-[#222B38] hover:text-slate-100"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#334155] text-slate-200">
                  <Plus className="h-4.5 w-4.5" strokeWidth={1.75} />
                </div>
                <span className="text-xs font-medium leading-snug">
                  + Yeni İşletme /
                  <br />
                  Şube Kur
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ================================================================
            RIGHT COLUMN (4/12): HIZLI AKSİYONLAR - BUGÜN (2x4 Matte Grid)
            + Bottom Full-Width Matte Gold CTA ("İşletmeleri Keşfet →")
           ================================================================ */}
        <div
          data-testid="quick-actions-column"
          className="flex min-h-0 flex-col gap-3 min-[760px]:col-span-4 lg:gap-4"
        >
          <div className="flex shrink-0 items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wider text-slate-300 lg:text-sm">
              HIZLI AKSİYONLAR - BUGÜN
            </h2>
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Hızlı Ayarlar"
              title="Ayarlar"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-[#222B38] hover:text-slate-100"
            >
              <Settings className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* 2x4 Matte Pastel Tile Card */}
          <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-4 gap-2.5 rounded-[20px] border border-[#334155] bg-[#222B38] p-3 lg:gap-3 lg:p-3.5">
            {quickActions.map((qa) => {
              const Icon = qa.icon;
              return (
                <button
                  key={qa.id}
                  type="button"
                  data-testid={`quick-action-${qa.id}`}
                  onClick={() => onQuickAction(qa.id)}
                  className={`flex flex-col items-center justify-center rounded-[15px] border px-2 py-2.5 text-center text-[#181F29] transition-colors ${qa.bg} ${qa.border}`}
                >
                  <Icon
                    className="mb-1.5 h-6 w-6 text-[#F8FAFC] lg:h-7 lg:w-7"
                    strokeWidth={1.5}
                  />
                  <span className="text-xs font-bold leading-tight text-[#111827] lg:text-[13.5px]">
                    {qa.title}
                  </span>
                  <span className="mt-0.5 truncate text-[10.5px] font-medium text-[#1F2937]/85 lg:text-[11.5px]">
                    {qa.subtitle}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom Primary CTA: İşletmeleri Keşfet → */}
          <button
            type="button"
            data-testid="discover-businesses-cta"
            onClick={onDiscoverBranches}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[16px] bg-[#C8AE7D] px-4 text-sm font-bold text-[#181F29] hover:bg-[#D2BB8E] lg:h-12 lg:text-[15px]"
          >
            <span>İşletmeleri Keşfet</span>
            <ArrowRight className="h-4.5 w-4.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </section>
  );
}
