import { useState } from 'react';
import {
  Activity,
  BarChart3,
  Briefcase,
  Building2,
  CalendarCheck2,
  Car,
  FileSpreadsheet,
  Landmark,
  Lock,
  MapPin,
  Presentation,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Swords,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import type {
  AdCampaignTierId,
  BranchConceptIconId,
  BranchUpgradeTrackId,
  EmpireState,
  OfficeEquipmentId,
  OfficeTierId,
  RemoteBusinessRecord,
  StockQuote,
} from '../types/game';
import {
  computeFinanceCommandMetrics,
  type ExecutiveDashboardMetrics,
} from '../game/dashboardMetrics';
import { computeBusinessesOverviewMetrics } from '../game/branchOpsEngine';
import { formatTL } from '../game/economy';
import {
  OFFICE_EQUIPMENT_ITEMS,
  OFFICE_EQUIPMENT_MAX_LEVEL,
  calculatePersonalAssetsValuation,
  getNextOfficeTier,
  getOfficeEquipmentLevel,
  getOfficeEquipmentUpgradeCost,
  getOfficeTierById,
} from '../game/officeEngine';
import {
  BranchManagementModal,
  BranchSelectorModal,
} from './BranchOperationsModals';
import { HoldingReportsModal } from './HoldingReportsModal';
import { OfficeInteriorPreview } from './OfficeInteriorPreview';

/* ============================================================================
   1. FINANS WORKSPACE (3 Sütunlu Finans, Bankalar & Borsa Komuta Merkezi)
   ============================================================================ */
interface FinansWorkspaceProps {
  state: EmpireState;
  metrics: ExecutiveDashboardMetrics;
  stockQuotes: StockQuote[];
  now: number;
  onOpenBanking: (tab?: 'loans' | 'own-bank') => void;
  onOpenAccounting: () => void;
  onOpenBorsa: () => void;
  onOpenInvestments: () => void;
  onOpenDayEnd: () => void;
  onCollectDayEndAll: () => void;
}

function buildSparklineGeometry(points: number[], width: number, height: number) {
  const safe = points.length >= 2 ? points : [40, 45, 42, 55, 50, 62];
  const padX = 4;
  const padY = 5;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  const coords = safe.map((val, idx) => {
    const x = padX + (idx / Math.max(1, safe.length - 1)) * usableW;
    const clamped = Math.max(5, Math.min(100, val));
    const y = padY + (1 - clamped / 100) * usableH;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  const linePath = coords
    .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
    .join(' ');
  const first = coords[0];
  const last = coords[coords.length - 1];
  const areaPath = `${linePath} L ${last.x} ${height} L ${first.x} ${height} Z`;

  return { linePath, areaPath, last };
}

export function FinansWorkspace({
  state,
  metrics,
  stockQuotes,
  now,
  onOpenBanking,
  onOpenAccounting,
  onOpenBorsa,
  onOpenInvestments,
  onOpenDayEnd,
  onCollectDayEndAll,
}: FinansWorkspaceProps) {
  const fm = computeFinanceCommandMetrics(state, stockQuotes, metrics, now);
  const spark = buildSparklineGeometry(fm.bistSparklinePoints, 220, 52);
  const bistUp = fm.bistDailyChangePct >= 0;

  return (
    <section
      aria-label="Finans Kontrol Merkezi"
      data-testid="workspace-finance"
      className="flex h-full min-h-0 w-full flex-col gap-2 overflow-y-auto px-2.5 py-2 min-[680px]:overflow-hidden lg:gap-3 lg:px-4 lg:py-3"
    >
      {/* 1. TOP COMPACT KPI STRIP (4 BOXES) */}
      <div
        data-testid="finance-kpi-strip"
        className="grid shrink-0 grid-cols-2 gap-1.5 min-[680px]:grid-cols-4 lg:gap-3"
      >
        <div className="rounded-[20px] border border-[#334155] bg-[#222B38] px-2.5 py-1.5 lg:px-3.5 lg:py-2.5">
          <div className="truncate text-[9.5px] font-medium text-slate-400 lg:text-[11px]">
            Toplam Likit Kasa
          </div>
          <div
            data-testid="finance-kpi-cash"
            className={`mt-0.5 truncate font-mono-num text-xs font-extrabold lg:mt-1 lg:text-lg ${
              metrics.totalCash < 0 ? 'text-[#B86B5E]' : 'text-white'
            }`}
          >
            {formatTL(metrics.totalCash)}
          </div>
        </div>

        <div className="rounded-[20px] border border-[#C8AE7D]/45 bg-[#222B38] px-2.5 py-1.5 lg:px-3.5 lg:py-2.5">
          <div className="truncate text-[9.5px] font-medium text-slate-400 lg:text-[11px]">
            Kredi Puanı & Aktif Borç
          </div>
          <div
            data-testid="finance-kpi-credit"
            className="mt-0.5 truncate font-mono-num text-xs font-extrabold text-[#C8AE7D] lg:mt-1 lg:text-lg"
          >
            {state.creditScore} <span className="text-slate-500">·</span>{' '}
            <span className={metrics.activeLoanDebt > 0 ? 'text-[#B86B5E]' : 'text-[#B86B5E]'}>
              {formatTL(metrics.activeLoanDebt, true)}
            </span>
          </div>
        </div>

        <div className="rounded-[20px] border border-[#334155] bg-[#222B38] px-2.5 py-1.5 lg:px-3.5 lg:py-2.5">
          <div className="truncate text-[9.5px] font-medium text-slate-400 lg:text-[11px]">
            Borsa & Yatırım Portföyü
          </div>
          <div
            data-testid="finance-kpi-portfolio"
            className="mt-0.5 truncate font-mono-num text-xs font-extrabold text-[#7E96B0] lg:mt-1 lg:text-lg"
          >
            {formatTL(metrics.stockPortfolioValue)}
          </div>
        </div>

        <div className="rounded-[20px] border border-[#B86B5E]/45 bg-[#222B38] px-2.5 py-1.5 lg:px-3.5 lg:py-2.5">
          <div className="truncate text-[9.5px] font-medium text-slate-400 lg:text-[11px]">
            Günlük Operasyon Gideri
          </div>
          <div
            data-testid="finance-kpi-expenses"
            className="mt-0.5 truncate font-mono-num text-xs font-extrabold text-[#B86B5E] lg:mt-1 lg:text-lg"
          >
            {formatTL(metrics.dailyOperatingExpenses)}
          </div>
        </div>
      </div>

      {/* 2. 3-COLUMN FINANCIAL COMMAND CENTER */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 min-[680px]:grid-cols-12 lg:gap-3">
        {/* ============================================================
            COLUMN 1 (LEFT — GOLD/AMBER): BANKALAR & TİCARİ KREDİLER
           ============================================================ */}
        <div
          data-testid="finance-col-banking"
          className="flex min-h-0 flex-col justify-between rounded-[20px] border border-[#C8AE7D]/45 bg-[#222B38] p-2.5 min-[680px]:col-span-4 lg:p-4"
        >
          {/* Top Icon + Limit Badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 text-[#C8AE7D] lg:h-10 lg:w-10">
              <Landmark className="h-4 w-4 lg:h-5 lg:w-5" />
            </div>
            <span
              data-testid="finance-credit-limit-badge"
              className="rounded-full border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 px-2.5 py-0.5 font-mono-num text-[9.5px] font-extrabold text-[#C8AE7D] lg:px-3 lg:py-1 lg:text-xs"
            >
              Limit: {formatTL(metrics.availableCreditLimit, true)}
            </span>
          </div>

          {/* Title & Description */}
          <div className="mt-1.5 lg:mt-2.5">
            <h2 className="text-[11px] font-extrabold tracking-wide text-white lg:text-sm">
              BANKALAR & TİCARİ KREDİLER
            </h2>
            <p className="mt-0.5 line-clamp-2 text-[9.5px] leading-snug text-slate-300 lg:mt-1 lg:text-xs">
              Sıkı kredi denetimi, aylık taksit ödemeleri, teminat yönetimi ve kendi bankanı kurma.
            </p>
          </div>

          {/* Credit Eligibility Progress Bar */}
          <div
            data-testid="finance-credit-eligibility"
            className="mt-2 rounded-xl border border-[#334155] bg-[#181F29] px-2.5 py-1.5 lg:mt-3 lg:px-3 lg:py-2.5"
          >
            <div className="flex items-center justify-between gap-1.5 text-[9.5px] lg:text-[11px]">
              <span className="font-bold text-slate-200">Kredi Uygunluğu</span>
              <span
                data-testid="finance-credit-lock-badge"
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono-num text-[8.5px] font-extrabold lg:px-2 lg:text-[10px] ${
                  fm.creditUnlocked
                    ? 'border border-[#7A9E7E]/45 bg-[#7A9E7E]/15 text-[#7A9E7E]'
                    : 'border border-[#B86B5E]/45 bg-[#B86B5E]/15 text-[#B86B5E]'
                }`}
              >
                {fm.creditUnlocked ? (
                  <ShieldCheck className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                ) : (
                  <Lock className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                )}
                {fm.creditUnlocked ? `UYGUN · %100` : `KİLİTLİ · %${fm.creditEligibilityPct}`}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#1D2532] lg:h-2">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  fm.creditUnlocked
                    ? 'bg-[#7A9E7E] '
                    : 'bg-[#7E96B0] '
                }`}
                style={{ width: `${fm.creditEligibilityPct}%` }}
              />
            </div>
            <div className="mt-1 truncate text-[8.5px] text-slate-400 lg:text-[10px]">
              {fm.creditLockSummary}
            </div>
          </div>

          {/* Active Loans + Interest Discount Row */}
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5 text-[9.5px] lg:mt-2.5 lg:text-xs">
            <span className="font-semibold text-slate-300">
              <strong className="font-mono-num text-white">{metrics.activeLoanCount}</strong> aktif
              kredi
            </span>
            <span
              data-testid="finance-interest-discount"
              className="rounded-full border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 px-2 py-0.5 font-mono-num text-[9px] font-bold text-[#C8AE7D] lg:px-2.5 lg:text-[11px]"
            >
              Faiz İndirimi:{' '}
              <strong className="text-[#7E96B0]">-%{metrics.loanInterestDiscountPct}</strong>
            </span>
          </div>

          {/* Bottom Action Buttons */}
          <div className="mt-2 grid grid-cols-2 gap-1.5 lg:mt-3 lg:gap-2">
            <button
              type="button"
              data-testid="finance-btn-take-loan"
              onClick={() => onOpenBanking('loans')}
              className="flex min-h-[32px] items-center justify-center rounded-xl border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 px-2 py-1 text-[9.5px] font-extrabold tracking-wide text-amber-100 transition-all hover:bg-[#C8AE7D]/15 active:scale-[0.98] lg:min-h-[40px] lg:text-xs"
            >
              KREDİ ÇEK
            </button>
            <button
              type="button"
              data-testid="finance-btn-create-bank"
              onClick={() => onOpenBanking('own-bank')}
              className="flex min-h-[32px] flex-col items-center justify-center rounded-xl border border-slate-600/80 bg-[#1A243B]/90 px-1.5 py-1 text-center transition-all hover:border-[#C8AE7D]/45 hover:bg-[#222E4A] active:scale-[0.98] lg:min-h-[40px]"
            >
              <span className="text-[9px] font-extrabold leading-none tracking-wide text-white lg:text-[11px]">
                BANKA KUR
              </span>
              <span className="mt-0.5 font-mono-num text-[7.5px] font-bold leading-none text-[#C8AE7D] lg:text-[9.5px]">
                (5 Milyar ₺)
              </span>
            </button>
          </div>
        </div>

        {/* ============================================================
            COLUMN 2 (CENTER — SPLIT CYAN & EMERALD): BİLANÇO + 00:00
           ============================================================ */}
        <div
          data-testid="finance-col-center"
          className="flex min-h-0 flex-col gap-2 min-[680px]:col-span-4 lg:gap-3"
        >
          {/* TOP CARD: BİLANÇO, VERGİ & MUHASEBE */}
          <div
            data-testid="finance-card-accounting"
            className="flex min-h-0 flex-1 flex-col justify-between rounded-[20px] border border-[#334155] bg-[#222B38] p-2.5 lg:p-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-[#334155] bg-[#7E96B0]/15 text-[#7E96B0] lg:h-9 lg:w-9">
                <FileSpreadsheet className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              </div>
              <span
                data-testid="finance-pending-tax-badge"
                className={`rounded-full border px-2 py-0.5 font-mono-num text-[9px] font-extrabold lg:px-2.5 lg:text-[11px] ${
                  fm.unpaidTaxCount > 0
                    ? 'border-[#C8AE7D]/45 bg-[#C8AE7D]/15 text-[#C8AE7D]'
                    : 'border-[#334155] bg-[#7E96B0]/15 text-[#7E96B0]'
                }`}
              >
                {fm.unpaidTaxCount} Bekleyen Vergi
              </span>
            </div>

            <div className="mt-1">
              <h2 className="text-[10.5px] font-extrabold tracking-wide text-white lg:text-xs">
                BİLANÇO, VERGİ & MUHASEBE
              </h2>
              <p className="mt-1 hidden text-xs leading-snug text-slate-300 lg:block">
                KDV, SGK, Kurumlar ve Belediye vergileri, günlük/aylık/yıllık kâr-zarar tabloları.
              </p>
            </div>

            {/* Mini Revenue vs Expense Bar Chart + Accounting Status */}
            <div className="mt-1 flex items-end justify-between gap-2">
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-[9px] font-semibold text-slate-300 lg:text-[11px]">
                  Muhasebe:{' '}
                  <strong
                    className={
                      fm.accountingAutoActive ? 'text-[#7A9E7E]' : 'text-[#7E96B0]'
                    }
                  >
                    {fm.accountingAutoActive ? 'Otomatik Takip' : 'Manuel Takip'}
                  </strong>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[8px] text-slate-400 lg:text-[9.5px]">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7E96B0]" />
                    Gelir
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    Gider
                  </span>
                </div>
              </div>

              {/* 4-pair Mini Bar Chart */}
              <div
                data-testid="finance-mini-barchart"
                aria-label="Gelir gider mini grafiği"
                className="flex h-7 shrink-0 items-end gap-1.5 rounded-lg border border-[#334155] bg-[#181F29] px-2 py-1 lg:h-11 lg:gap-2 lg:px-2.5"
              >
                {fm.miniBars.map((bar, idx) => (
                  <div key={`${bar.label}-${idx}`} className="flex h-full items-end gap-0.5">
                    <div
                      className="w-1.5 rounded-t-sm bg-gradient-to-t from-cyan-500 to-sky-300 lg:w-2"
                      style={{ height: `${bar.incomePct}%` }}
                      title={`${bar.label} Gelir: ${formatTL(bar.income, true)}`}
                    />
                    <div
                      className="w-1.5 rounded-t-sm bg-gradient-to-t from-rose-600 to-rose-400 lg:w-2"
                      style={{ height: `${bar.expensePct}%` }}
                      title={`${bar.label} Gider: ${formatTL(bar.expense, true)}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              data-testid="finance-btn-accounting"
              onClick={onOpenAccounting}
              className="mt-1.5 flex min-h-[28px] w-full items-center justify-center rounded-xl border border-[#334155] bg-[#7E96B0]/15 px-3 py-1 text-[9.5px] font-extrabold tracking-wide text-cyan-100 transition-all hover:bg-[#7E96B0]/15 active:scale-[0.98] lg:mt-2 lg:min-h-[34px] lg:text-xs"
            >
              DETAY / ÖDE
              {fm.unpaidTaxTotal > 0 ? ` (${formatTL(fm.unpaidTaxTotal, true)})` : ''}
            </button>
          </div>

          {/* BOTTOM CARD: 00:00 GÜN SONU KAPANIŞI */}
          <div
            data-testid="finance-card-dayend"
            className="flex min-h-0 flex-1 flex-col justify-between rounded-[20px] border border-[#7A9E7E]/45 bg-[#222B38] p-2.5 lg:p-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-[#7A9E7E]/45 bg-[#7A9E7E]/15 text-[#7A9E7E] lg:h-9 lg:w-9">
                <CalendarCheck2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              </div>
              <button
                type="button"
                data-testid="finance-dayend-pending-badge"
                onClick={onOpenDayEnd}
                className={`rounded-full border px-2 py-0.5 font-mono-num text-[9px] font-extrabold transition-colors lg:px-2.5 lg:text-[11px] ${
                  fm.pendingDayEndCount > 0
                    ? 'border-[#7A9E7E]/45 bg-[#7A9E7E]/15 text-[#7A9E7E] hover:bg-[#7A9E7E]/15'
                    : 'border-slate-600/70 bg-[#1D2532] text-slate-300 hover:border-[#7A9E7E]/45'
                }`}
              >
                {fm.pendingDayEndCount} Bekleyen Kapanış
              </button>
            </div>

            <div className="mt-1">
              <h2 className="text-[10.5px] font-extrabold tracking-wide text-white lg:text-xs">
                00:00 GÜN SONU KAPANIŞI
              </h2>
              <p className="mt-1 hidden text-xs leading-snug text-slate-300 lg:block">
                Şube bazlı günlük kâr/zarar raporlarını incele ve bekleyen net nakit tahsilatlarını kasaya aktar.
              </p>
              <div className="mt-0.5 flex items-center justify-between gap-2 text-[9px] lg:mt-1.5 lg:text-[11px]">
                <span className="truncate text-slate-300">
                  {fm.pendingDayEndCount > 0
                    ? 'Biriken Net Hasılat:'
                    : `Arşiv: ${fm.archivedDayEndCount} kapanış`}
                </span>
                <span
                  data-testid="finance-dayend-net-amount"
                  className={`shrink-0 font-mono-num font-extrabold ${
                    (fm.pendingDayEndCount > 0 ? fm.pendingDayEndNetCash : fm.accruedTodayNetCash) <
                    0
                      ? 'text-[#B86B5E]'
                      : 'text-[#7A9E7E]'
                  }`}
                >
                  {fm.pendingDayEndCount > 0
                    ? `${fm.pendingDayEndNetCash >= 0 ? '+' : ''}${formatTL(
                        fm.pendingDayEndNetCash,
                        true
                      )}`
                    : `${fm.accruedTodayNetCash >= 0 ? '+' : ''}${formatTL(
                        fm.accruedTodayNetCash,
                        true
                      )}`}
                </span>
              </div>
            </div>

            <button
              type="button"
              data-testid="finance-btn-settle-dayend"
              onClick={() => {
                if (fm.pendingDayEndCount > 0) {
                  onCollectDayEndAll();
                } else {
                  onOpenDayEnd();
                }
              }}
              className={`mt-1.5 flex min-h-[28px] w-full items-center justify-center rounded-xl px-3 py-1 text-[9.5px] font-extrabold tracking-wide transition-all active:scale-[0.98] lg:mt-2 lg:min-h-[34px] lg:text-xs ${
                fm.pendingDayEndCount > 0
                  ? 'border border-[#334155] bg-[#7A9E7E] text-cyan-100  hover:brightness-110'
                  : 'border border-[#334155] bg-[#7E96B0]/15 text-[#7E96B0] hover:bg-[#7E96B0]/15'
              }`}
            >
              HASILATI AKTAR
            </button>
          </div>
        </div>

        {/* ============================================================
            COLUMN 3 (RIGHT — INDIGO/PURPLE): BORSA İSTANBUL & HALKA ARZ
           ============================================================ */}
        <div
          data-testid="finance-col-borsa"
          className="flex min-h-0 flex-col justify-between rounded-[20px] border border-[#334155] bg-[#222B38] p-2.5 min-[680px]:col-span-4 lg:p-4"
        >
          {/* Top Icon + Stock Positions Badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#334155] bg-[#7E96B0]/15 text-[#7E96B0] lg:h-10 lg:w-10">
              <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5" />
            </div>
            <button
              type="button"
              data-testid="finance-positions-badge"
              onClick={onOpenInvestments}
              className="rounded-full border border-[#334155] bg-[#7E96B0]/15 px-2.5 py-0.5 font-mono-num text-[9.5px] font-extrabold text-[#7E96B0] transition-colors hover:bg-[#7E96B0]/15 lg:px-3 lg:py-1 lg:text-xs"
            >
              {fm.stockPositionCount} Hisse Pozisyonu
            </button>
          </div>

          {/* Title & Description */}
          <div className="mt-1.5 lg:mt-2.5">
            <h2 className="text-[11px] font-extrabold tracking-wide text-white lg:text-sm">
              BORSA İSTANBUL & HALKA ARZ
            </h2>
            <p className="mt-0.5 line-clamp-2 text-[9.5px] leading-snug text-slate-300 lg:mt-1 lg:text-xs">
              Canlı hisse alım-satım emirleri, temettü gelirleri ve kendi holdingini halka arz etme.
            </p>
          </div>

          {/* Live BIST 100 Sparkline Box */}
          <div
            data-testid="finance-bist-sparkline"
            className="mt-1.5 rounded-xl border border-[#334155] bg-[#0D132B]/85 px-2.5 py-1.5 lg:mt-2.5 lg:px-3 lg:py-2.5"
          >
            <div className="flex items-center justify-between gap-2 text-[9.5px] lg:text-xs">
              <span className="font-bold text-slate-200">
                BIST 100{' '}
                <strong className="ml-1 font-mono-num text-white">
                  {fm.bistIndexValue.toLocaleString('tr-TR')}
                </strong>
              </span>
              <span
                data-testid="finance-bist-change"
                className={`font-mono-num font-extrabold ${
                  bistUp ? 'text-[#7E96B0]' : 'text-[#B86B5E]'
                }`}
              >
                {bistUp ? '↗ +' : '↘ '}
                {fm.bistDailyChangePct.toFixed(2)}%
              </span>
            </div>

            <svg
              viewBox="0 0 220 52"
              preserveAspectRatio="none"
              aria-label="BIST 100 endeks grafiği"
              className="mt-1 h-9 w-full overflow-visible lg:mt-1.5 lg:h-14"
            >
              <defs>
                <linearGradient id="bistSparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={bistUp ? '#7E96B0' : '#B86B5E'} stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#181F29" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="bistSparkStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7E96B0" />
                  <stop offset="100%" stopColor={bistUp ? '#7A9E7E' : '#B86B5E'} />
                </linearGradient>
              </defs>
              <path d={spark.areaPath} fill="url(#bistSparkFill)" />
              <path
                d={spark.linePath}
                fill="none"
                stroke="url(#bistSparkStroke)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx={spark.last.x}
                cy={spark.last.y}
                r="3"
                fill={bistUp ? '#7A9E7E' : '#B86B5E'}
              />
            </svg>
          </div>

          {/* IPO Eligibility Readiness Strip */}
          <div
            data-testid="finance-ipo-readiness"
            className="mt-1.5 flex flex-col gap-1 text-[9px] lg:mt-2 lg:text-[11px]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold text-[#7E96B0]">{fm.ipoStatusText}</span>
              <span className="shrink-0 font-mono-num text-[8.5px] font-bold text-slate-400 lg:text-[10px]">
                {formatTL(fm.ipoNetWorth, true)} / {formatTL(fm.ipoTargetNetWorth, true)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1D2532]">
              <div
                className="h-full rounded-full bg-[#7E96B0]"
                style={{ width: `${Math.max(5, fm.ipoNetWorthPct)}%` }}
              />
            </div>
          </div>

          {/* Bottom Full-Width Action Button */}
          <button
            type="button"
            data-testid="finance-btn-borsa"
            onClick={onOpenBorsa}
            className="mt-2 flex min-h-[32px] w-full items-center justify-center rounded-xl border border-[#334155] bg-[#7E96B0]/15 px-3 py-1 text-[9.5px] font-extrabold tracking-wide text-indigo-100 transition-all hover:bg-[#7E96B0]/15 active:scale-[0.98] lg:mt-3 lg:min-h-[40px] lg:text-xs"
          >
            BORSA & HALKA ARZ AÇ
          </button>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   2. İŞLETMELER WORKSPACE — ADIM 1 (4 Kartlı Panel) + ADIM 2 & ADIM 3 AKIŞI
   ============================================================================ */
interface BusinessesWorkspaceProps {
  state: EmpireState;
  competitorBusinesses: RemoteBusinessRecord[];
  now: number;
  onGoMapNewBranch: () => void;
  onOpenHr: (businessId?: string) => void;
  onOpenFranchise: () => void;
  onOpenRivals: () => void;
  onFocusBusinessOnMap: (businessId: string) => void;
  onEnterInterior: (businessId: string) => void;
  onCustomizeBranch: (
    businessId: string,
    updates: {
      customName: string;
      brandColor: string;
      conceptIcon: BranchConceptIconId;
    }
  ) => boolean;
  onLaunchBranchMarketing: (businessId: string, tierId: AdCampaignTierId) => boolean;
  onUpgradeBranchFacility: (businessId: string, trackId: BranchUpgradeTrackId) => boolean;
  onLaunchHoldingBulkAds: () => boolean;
  onDistributeHoldingBonus: () => boolean;
}

function StatusDotsRow({
  label,
  filled,
  colorClass,
}: {
  label: string;
  filled: number;
  colorClass: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-[9.5px] lg:text-xs">
      <span className="truncate font-semibold text-slate-300">{label}</span>
      <div className="flex shrink-0 items-center gap-1">
        {[1, 2, 3, 4, 5].map((dot) => (
          <span
            key={dot}
            className={`h-2 w-2 rounded-full lg:h-2.5 lg:w-2.5 ${
              dot <= filled ? colorClass : 'bg-slate-700/90'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function BusinessesWorkspace({
  state,
  competitorBusinesses,
  now,
  onGoMapNewBranch,
  onOpenHr,
  onOpenFranchise,
  onOpenRivals,
  onFocusBusinessOnMap,
  onEnterInterior,
  onCustomizeBranch,
  onLaunchBranchMarketing,
  onUpgradeBranchFacility,
  onLaunchHoldingBulkAds,
  onDistributeHoldingBonus,
}: BusinessesWorkspaceProps) {
  const [flowStep, setFlowStep] = useState<'overview' | 'select' | 'manage' | 'reports'>('overview');
  const [selectorViewMode, setSelectorViewMode] = useState<'card' | 'list'>('card');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(
    state.businesses[0]?.id ?? null
  );

  const metrics = computeBusinessesOverviewMetrics(state, now);
  const managedBranch =
    state.businesses.find((b) => b.id === selectedBranchId) ?? state.businesses[0] ?? null;

  const openBranchSelector = () => {
    if (!selectedBranchId && state.businesses[0]) {
      setSelectedBranchId(state.businesses[0].id);
    }
    setFlowStep('select');
  };

  const openBranchManagement = (businessId: string) => {
    setSelectedBranchId(businessId);
    setFlowStep('manage');
  };

  const visibleStaff = metrics.teamMembers.slice(0, 4);

  return (
    <section
      aria-label="İşletme ve Şube Yönetimi"
      data-testid="workspace-businesses"
      className="panel-scroll flex h-full min-h-0 w-full flex-col gap-2 overflow-y-auto px-2.5 py-2 lg:gap-3 lg:px-5 lg:py-3.5"
    >
      {/* ==================== TOP ACTION BAR (NO ŞUBE KOTASI!) ==================== */}
      <div
        data-testid="businesses-top-action-bar"
        className="flex shrink-0 flex-wrap items-center justify-between gap-1.5 rounded-[20px] border border-[#334155] bg-[#101A30]/90 px-2.5 py-1.5 lg:gap-2 lg:px-4 lg:py-2.5"
      >
        <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
          <button
            type="button"
            data-testid="biz-top-hr-btn"
            onClick={() => onOpenHr(state.businesses[0]?.id)}
            className="flex items-center gap-1.5 rounded-xl border border-[#334155] bg-[#7E96B0]/15 px-2.5 py-1 text-[10px] font-bold text-[#7E96B0] transition-colors hover:bg-[#7E96B0]/15 whitespace-nowrap lg:px-3.5 lg:py-1.5 lg:text-xs"
          >
            <Users className="h-3.5 w-3.5" />
            İK & Personel
          </button>
          <button
            type="button"
            data-testid="biz-top-franchise-btn"
            onClick={onOpenFranchise}
            className="flex items-center gap-1.5 rounded-xl border border-[#7A9E7E]/45 bg-[#7A9E7E]/15 px-2.5 py-1 text-[10px] font-bold text-[#7A9E7E] transition-colors hover:bg-[#7A9E7E]/15 whitespace-nowrap lg:px-3.5 lg:py-1.5 lg:text-xs"
          >
            <Store className="h-3.5 w-3.5" />
            Franchise & Bayilik
          </button>
          <button
            type="button"
            data-testid="biz-top-rivals-btn"
            onClick={onOpenRivals}
            className="flex items-center gap-1.5 rounded-xl border border-[#B86B5E]/45 bg-[#B86B5E]/15 px-2.5 py-1 text-[10px] font-bold text-[#B86B5E] transition-colors hover:bg-[#B86B5E]/15 whitespace-nowrap lg:px-3.5 lg:py-1.5 lg:text-xs"
          >
            <Swords className="h-3.5 w-3.5" />
            Rakip İşletmeler ({competitorBusinesses.length})
          </button>
        </div>

        <button
          type="button"
          data-testid="new-branch-on-map-btn"
          onClick={onGoMapNewBranch}
          className="flex items-center gap-1.5 rounded-[14px] bg-[#C8AE7D] px-3 py-1.5 text-[10px] font-bold text-[#181F29] transition-colors hover:bg-[#D2BB8E] whitespace-nowrap lg:px-4 lg:py-1.5 lg:text-xs"
        >
          <MapPin className="h-3.5 w-3.5 text-[#181F29]" strokeWidth={1.5} />
          Haritada Yeni Şube Kur
        </button>
      </div>

      {/* ==================== 2x2 MANAGEMENT GRID (ADIM 1) ==================== */}
      <div
        data-testid="businesses-overview-grid"
        className="grid shrink-0 grid-cols-1 gap-2 pb-2 min-[640px]:grid-cols-2 lg:min-h-0 lg:flex-1 lg:gap-3.5 lg:pb-0"
      >
        {/* CARD 1 (TOP-LEFT): İŞLETMELERİM */}
        <div
          data-testid="biz-card-my-branches"
          className="flex flex-col justify-between rounded-[20px] border border-[#334155] bg-[#222B38] p-2.5 lg:min-h-0 lg:p-4"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#334155] bg-[#7E96B0]/15 text-[#7E96B0] lg:h-10 lg:w-10">
                  <Store className="h-4 w-4 lg:h-5 lg:w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[11px] font-extrabold tracking-wide text-white lg:text-sm">
                    İŞLETMELERİM
                  </h2>
                  <p className="truncate text-[9px] text-slate-400 lg:text-[11px]">
                    Kurulmuş aktif şubeleriniz ve operasyon özeti
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-[#334155] bg-[#7E96B0]/15 px-2 py-0.5 font-mono-num text-[9.5px] font-extrabold text-[#7E96B0] lg:px-2.5 lg:text-xs">
                {metrics.activeBranches} Aktif
                {metrics.underConstructionBranches > 0
                  ? ` · ${metrics.underConstructionBranches} İnşaat`
                  : ''}
              </span>
            </div>

            {/* Lead Branch Summary Box */}
            <div className="rounded-xl border border-[#334155] bg-[#0B1427]/85 px-2.5 py-2 lg:px-3 lg:py-2.5">
              {metrics.leadBranch ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-extrabold text-white lg:text-sm">
                      {metrics.leadBranch.name}{' '}
                      <span className="font-mono-num text-[#7E96B0]">
                        (Sv. {metrics.leadBranch.level})
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400 lg:text-[11px]">
                      Toplam {metrics.totalBranches} şube · Öncü: {metrics.leadBranch.sectorName}
                    </div>
                  </div>
                  <div className="shrink-0 text-right font-mono-num text-xs font-extrabold text-[#7A9E7E] lg:text-sm">
                    {formatTL(metrics.leadBranch.dailyRevenue, true)}
                    <span className="ml-0.5 text-[9px] font-semibold text-slate-400">/gün</span>
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 lg:text-xs">
                  Henüz aktif şubeniz yok. Haritadan sınırsız sayıda yeni şube kurabilirsiniz.
                </div>
              )}

              {/* Average Service Quality Bar */}
              <div className="mt-2">
                <div className="mb-1 flex items-center justify-between text-[9px] lg:text-[11px]">
                  <span className="font-semibold text-slate-300">Ortalama Hizmet Kalitesi</span>
                  <span className="font-mono-num font-extrabold text-[#7E96B0]">
                    %{metrics.avgQualityPct} ({metrics.avgServiceQuality.toFixed(1)}/5)
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1D2532] lg:h-2">
                  <div
                    className="h-full rounded-full bg-[#7A9E7E] transition-all"
                    style={{ width: `${Math.max(6, metrics.avgQualityPct)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <button
              type="button"
              data-testid="biz-open-branch-selector-btn"
              onClick={openBranchSelector}
              className="flex min-h-[32px] w-full items-center justify-center rounded-[14px] border border-[#7E96B0]/50 bg-[#7E96B0]/20 px-3 py-1 text-[10px] font-bold tracking-wide text-slate-100 transition-colors hover:bg-[#7E96B0]/30 lg:min-h-[38px] lg:text-xs"
            >
              ŞUBELERİ GÖR / YÖNET
            </button>
            <p className="mt-1 text-center text-[8.5px] font-medium text-slate-400 lg:text-[10px]">
              İsim Değiştir, Reklam Ver, Geliştir
            </p>
          </div>
        </div>

        {/* CARD 2 (TOP-RIGHT): İŞLETMELERİN TOPLAM DURUMU */}
        <div
          data-testid="biz-card-total-status"
          className="flex flex-col justify-between rounded-[20px] border border-[#334155] bg-[#222B38] p-2.5 lg:min-h-0 lg:p-4"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#334155] bg-[#7E96B0]/15 text-[#7E96B0] lg:h-10 lg:w-10">
                <BarChart3 className="h-4 w-4 lg:h-5 lg:w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[11px] font-extrabold tracking-wide text-white lg:text-sm">
                  İŞLETMELERİN TOPLAM DURUMU
                </h2>
                <p className="truncate text-[9px] text-slate-400 lg:text-[11px]">
                  Genel ciro, hizmet kalitesi ve franchise göstergeleri
                </p>
              </div>
            </div>

            {/* 3 Summary KPI Figures */}
            <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-[#334155] bg-[#0B1427]/85 p-2 lg:gap-2 lg:p-2.5">
              <div className="min-w-0">
                <div className="truncate text-[8.5px] font-semibold text-slate-400 lg:text-[10px]">
                  Günlük Ciro
                </div>
                <div
                  data-testid="biz-total-daily-revenue"
                  className="mt-0.5 truncate font-mono-num text-[11px] font-extrabold text-[#7A9E7E] lg:text-sm"
                >
                  {formatTL(metrics.totalDailyRevenue, true)}
                </div>
              </div>
              <div className="min-w-0 border-x border-[#334155] px-1.5">
                <div className="truncate text-[8.5px] font-semibold text-slate-400 lg:text-[10px]">
                  Hizmet Kalitesi
                </div>
                <div className="mt-0.5 flex items-center gap-1 font-mono-num text-[11px] font-extrabold text-[#C8AE7D] lg:text-sm">
                  <span>{metrics.avgServiceQuality.toFixed(1)}</span>
                  <Star className="h-3 w-3 shrink-0 fill-amber-400 text-[#C8AE7D]" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="truncate text-[8.5px] font-semibold text-slate-400 lg:text-[10px]">
                  Franchise Teklifi
                </div>
                <div className="mt-0.5 truncate font-mono-num text-[11px] font-extrabold text-[#7E96B0] lg:text-sm">
                  {metrics.pendingFranchiseAppsCount} Bekleyen
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Progress Bars + Raporları Gör Button */}
          <div className="mt-2 flex items-end justify-between gap-2.5">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div>
                <div className="flex justify-between text-[9px] lg:text-[11px]">
                  <span className="truncate text-slate-300">Müşteri Memnuniyeti</span>
                  <span className="font-mono-num font-bold text-[#7A9E7E]">
                    %{metrics.customerSatisfactionPct}
                  </span>
                </div>
                <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-[#1D2532]">
                  <div
                    className="h-full rounded-full bg-[#7A9E7E]"
                    style={{ width: `${Math.max(5, metrics.customerSatisfactionPct)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[9px] lg:text-[11px]">
                  <span className="truncate text-slate-300">Marka Tanınırlığı</span>
                  <span className="font-mono-num font-bold text-[#C8AE7D]">
                    %{metrics.brandRecognitionPct}
                  </span>
                </div>
                <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-[#1D2532]">
                  <div
                    className="h-full rounded-full bg-[#C8AE7D]"
                    style={{ width: `${Math.max(5, metrics.brandRecognitionPct)}%` }}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              data-testid="biz-open-reports-btn"
              onClick={() => setFlowStep('reports')}
              className="flex min-h-[32px] shrink-0 items-center justify-center rounded-xl border border-[#334155] bg-[#7E96B0]/15 px-3 py-1 text-[10px] font-extrabold tracking-wide text-sky-100 transition-all hover:bg-[#7E96B0]/15 active:scale-[0.98] lg:min-h-[38px] lg:px-4 lg:text-xs"
            >
              RAPORLARI GÖR
            </button>
          </div>
        </div>

        {/* CARD 3 (BOTTOM-LEFT): PERSONELLER / EKİP LİSTESİ */}
        <div
          data-testid="biz-card-staff-list"
          className="flex flex-col justify-between rounded-[20px] border border-[#334155] bg-[#222B38] p-2.5 lg:min-h-0 lg:p-4"
        >
          <div className="space-y-2 lg:min-h-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#334155] bg-[#7E96B0]/15 text-[#7E96B0] lg:h-10 lg:w-10">
                  <Users className="h-4 w-4 lg:h-5 lg:w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[11px] font-extrabold tracking-wide text-white lg:text-sm">
                    PERSONELLER / EKİP LİSTESİ
                  </h2>
                  <p className="truncate text-[9px] text-slate-400 lg:text-[11px]">
                    Şubelerdeki aktif çalışanlar ve görev durumları
                  </p>
                </div>
              </div>
              <span className="shrink-0 font-mono-num text-[10px] font-bold text-[#7E96B0] lg:text-xs">
                {metrics.totalStaffCount} Kişi
              </span>
            </div>

            {/* Compact Staff Rows */}
            <div className="space-y-1 rounded-xl border border-[#334155] bg-[#0B1326]/85 p-2">
              {visibleStaff.length === 0 ? (
                <div className="py-2 text-center text-[10px] text-slate-400 lg:text-xs">
                  Henüz atanmış personel bulunmuyor. İK menüsünden ekip kurabilirsiniz.
                </div>
              ) : (
                visibleStaff.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-[#101C36]/75 px-2 py-1 text-[9.5px] lg:px-2.5 lg:py-1.5 lg:text-xs"
                  >
                    <div className="min-w-0 flex-1 truncate">
                      <span className="font-bold text-white">{member.name}</span>
                      <span className="ml-1 text-slate-400">({member.roleTitle})</span>
                    </div>
                    <span className="shrink-0 font-mono-num font-bold text-[#7E96B0]">
                      Sv.{member.level}
                    </span>
                    <span
                      className={`shrink-0 font-bold ${
                        member.status === 'Çalışıyor' ? 'text-[#7A9E7E]' : 'text-[#C8AE7D]'
                      }`}
                    >
                      {member.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            type="button"
            data-testid="biz-open-hr-payroll-btn"
            onClick={() => onOpenHr(state.businesses[0]?.id)}
            className="mt-2 flex min-h-[32px] w-full items-center justify-center rounded-xl border border-[#334155] bg-[#7E96B0]/15 px-3 py-1 text-[10px] font-extrabold tracking-wide text-indigo-100 transition-all hover:bg-[#7E96B0]/15 active:scale-[0.98] lg:min-h-[38px] lg:text-xs"
          >
            İK & MAAŞ YÖNETİMİ
          </button>
        </div>

        {/* CARD 4 (BOTTOM-RIGHT): PERSONEL DURUMU & VERİMLİLİK */}
        <div
          data-testid="biz-card-staff-efficiency"
          className="flex flex-col justify-between rounded-[20px] border border-[#7A9E7E]/45 bg-[#222B38] p-2.5 lg:min-h-0 lg:p-4"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#7A9E7E]/45 bg-[#7A9E7E]/15 text-[#7A9E7E] lg:h-10 lg:w-10">
                <Activity className="h-4 w-4 lg:h-5 lg:w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[11px] font-extrabold tracking-wide text-white lg:text-sm">
                  PERSONEL DURUMU & VERİMLİLİK
                </h2>
                <p className="truncate text-[9px] text-slate-400 lg:text-[11px]">
                  Boşta kadro, yorulma seviyesi ve performans puanları
                </p>
              </div>
            </div>

            {/* Split Metrics + Colored Dot Indicators */}
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#334155] bg-[#0B1427]/85 p-2 lg:gap-3 lg:p-2.5">
              <div className="space-y-1 text-[9.5px] lg:text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Boşta Personel:</span>
                  <span className="font-mono-num font-extrabold text-white">
                    {metrics.idleStaffCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Yorulma Seviyesi:</span>
                  <span
                    className={`font-mono-num font-extrabold ${
                      metrics.fatiguePct >= 60 ? 'text-[#B86B5E]' : 'text-[#C8AE7D]'
                    }`}
                  >
                    %{metrics.fatiguePct}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Ortalama Verim:</span>
                  <span className="font-mono-num font-extrabold text-[#7A9E7E]">
                    %{metrics.avgEfficiencyPct}
                  </span>
                </div>
              </div>

              <div className="space-y-1 border-l border-[#334155] pl-2 lg:pl-3">
                <StatusDotsRow
                  label="Başarım"
                  filled={metrics.performanceDots}
                  colorClass="bg-[#C8AE7D] "
                />
                <StatusDotsRow
                  label="Moral"
                  filled={metrics.moraleDots}
                  colorClass="bg-[#7E96B0] "
                />
                <StatusDotsRow
                  label="Verimlilik"
                  filled={metrics.efficiencyDots}
                  colorClass="bg-[#7A9E7E] "
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            data-testid="biz-hire-train-staff-btn"
            onClick={() => onOpenHr(state.businesses[0]?.id)}
            className="mt-2 flex min-h-[32px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#7A9E7E]/45 bg-[#7A9E7E]/15 px-3 py-1 text-[10px] font-extrabold tracking-wide text-emerald-100 transition-all hover:bg-[#7A9E7E]/15 active:scale-[0.98] lg:min-h-[38px] lg:text-xs"
          >
            <UserPlus className="h-3.5 w-3.5" />
            YENİ PERSONEL AL / EĞİT
          </button>
        </div>
      </div>

      {/* ==================== ADIM 2: ŞUBE SEÇİMİ MODALI ==================== */}
      {flowStep === 'select' && (
        <BranchSelectorModal
          state={state}
          now={now}
          viewMode={selectorViewMode}
          selectedBranchId={selectedBranchId}
          onChangeViewMode={setSelectorViewMode}
          onSelectBranch={setSelectedBranchId}
          onManageBranch={openBranchManagement}
          onFocusOnMap={onFocusBusinessOnMap}
          onEnterInterior={onEnterInterior}
          onGoMapNewBranch={onGoMapNewBranch}
          onClose={() => setFlowStep('overview')}
        />
      )}

      {/* ==================== ADIM 3: ŞUBE YÖNETİM & ÖZELLEŞTİRME MODALI ==================== */}
      {flowStep === 'manage' && managedBranch && (
        <BranchManagementModal
          state={state}
          business={managedBranch}
          now={now}
          onBackToSelector={() => setFlowStep('select')}
          onClose={() => setFlowStep('overview')}
          onCustomizeBranch={onCustomizeBranch}
          onLaunchMarketing={onLaunchBranchMarketing}
          onUpgradeFacility={onUpgradeBranchFacility}
        />
      )}

      {/* ==================== TOPLAM DURUM VE RAPORLAR KARAR MERKEZİ ==================== */}
      {flowStep === 'reports' && (
        <HoldingReportsModal
          state={state}
          now={now}
          onClose={() => setFlowStep('overview')}
          onNavigateToBranch={openBranchManagement}
          onLaunchBulkAds={onLaunchHoldingBulkAds}
          onDistributeBulkBonus={onDistributeHoldingBonus}
        />
      )}
    </section>
  );
}

/* ============================================================================
   3. OFİSİM WORKSPACE — 3-Column Dark Navy "OFİSİM & PRESTİJ YÖNETİMİ"
   ============================================================================ */
interface OfficeWorkspaceProps {
  state: EmpireState;
  metrics: ExecutiveDashboardMetrics;
  unreadNotifCount: number;
  claimableMissionCount: number;
  chatCount: number;
  onUpgradeEquipment: (id: OfficeEquipmentId) => void;
  onUpgradeOfficeTier: (tierId: OfficeTierId) => void;
  onOpenOfficeModal: (tab: 'design' | 'assets' | 'phone') => void;
  onOpenPatronChat: () => void;
  onOpenMarketNews: () => void;
  onOpenMissions: () => void;
  onOpenNotifications: () => void;
  onOpenLeaderboard: () => void;
}

function EquipmentIcon({ id }: { id: OfficeEquipmentId }) {
  if (id === 'exec_desk') return <Briefcase className="h-4 w-4 lg:h-5 lg:w-5" />;
  if (id === 'meeting_room') return <Presentation className="h-4 w-4 lg:h-5 lg:w-5" />;
  if (id === 'guest_hospitality') return <UserCheck className="h-4 w-4 lg:h-5 lg:w-5" />;
  return <ShieldCheck className="h-4 w-4 lg:h-5 lg:w-5" />;
}

export function OfficeWorkspace({
  state,
  metrics,
  unreadNotifCount,
  chatCount,
  onUpgradeEquipment,
  onUpgradeOfficeTier,
  onOpenOfficeModal,
}: OfficeWorkspaceProps) {
  const currentTier = getOfficeTierById(state.officeTierId);
  const nextTier = getNextOfficeTier(state.officeTierId);
  const ownedAssetsCount = (state.personalAssetIds ?? []).length;
  const personalAssetsVal = calculatePersonalAssetsValuation(state);
  const prestigePct = Math.max(0, Math.min(100, Math.round(metrics.officePrestige)));

  const canAffordNextTier =
    Boolean(nextTier) &&
    state.cash >= (nextTier?.cost ?? 0) &&
    (state.brandRecognition ?? 5) >= (nextTier?.minBrandRecognition ?? 0);

  return (
    <section
      aria-label="Ofisim ve Prestij Yönetimi 3 Sütunlu Kontrol Paneli"
      data-testid="workspace-office"
      className="panel-scroll h-full w-full p-1.5 lg:p-3.5"
    >
      <div className="grid min-h-full grid-cols-1 gap-1.5 min-[680px]:h-full min-[680px]:grid-cols-12 lg:gap-3.5">
        {/* ============================================================
            COLUMN 1 (LEFT): MEVCUT OFİS, İÇ MEKAN ÖNİZLEME, PRESTİJ & BONUSLAR
           ============================================================ */}
        <div
          data-testid="office-col-left"
          className="flex min-h-0 flex-col justify-between gap-1.5 min-[680px]:col-span-4 lg:gap-2.5"
        >
          {/* Current Office Title */}
          <div className="shrink-0 px-0.5 leading-tight">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[10px] font-extrabold tracking-wide text-slate-100 lg:text-xs">
                MEVCUT OFİS
              </h2>
              <span className="font-mono-num text-[9px] font-bold text-[#C8AE7D] lg:text-[10px]">
                Kademe {currentTier.level}/4
              </span>
            </div>
            <div
              data-testid="office-current-tier-name"
              className="mt-0.5 truncate text-[10.5px] font-semibold uppercase tracking-wide text-slate-300 lg:text-xs"
            >
              {currentTier.name}
            </div>
          </div>

          {/* Architectural Interior Preview Card */}
          <div
            data-testid="office-interior-preview"
            className="relative min-h-[96px] flex-[1.15] overflow-hidden rounded-[20px] border border-[#334155] bg-[#0D1628]"
          >
            <OfficeInteriorPreview tierId={currentTier.id} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#181F29]/85 to-transparent" />
            <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[8.5px] font-bold text-slate-200 lg:bottom-2 lg:left-3 lg:right-3 lg:text-[10px]">
              <span className="truncate drop-shadow">{currentTier.subtitle}</span>
              <span className="shrink-0 rounded-md bg-black/70 px-1.5 py-0.5 font-mono-num text-[#C8AE7D] border border-[#C8AE7D]/45">
                Tanınırlık %{metrics.brandRecognitionPct}
              </span>
            </div>
          </div>

          {/* Prestige Score Progress Bar (0 - 100) */}
          <div className="shrink-0 space-y-1 px-0.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-extrabold tracking-wide text-slate-100 lg:text-xs">
                PRESTİJ PUANI:{' '}
                <strong
                  data-testid="office-prestige-score"
                  className="font-mono-num text-[#C8AE7D]"
                >
                  {prestigePct}
                </strong>{' '}
                <span className="font-mono-num font-semibold text-slate-400">/ 100</span>
              </span>
              <span className="font-mono-num text-[9.5px] font-bold text-[#C8AE7D] lg:text-[11px]">
                %{prestigePct}
              </span>
            </div>
            <div className="relative h-3.5 w-full overflow-hidden rounded-full border border-[#334155] bg-[#222B38] lg:h-4.5">
              <div
                className="flex h-full items-center justify-end rounded-full bg-[#C8AE7D] pr-1.5 transition-all duration-300"
                style={{ width: `${Math.max(14, prestigePct)}%` }}
              >
                <span className="font-mono-num text-[8px] font-black text-[#181F29] lg:text-[9.5px]">
                  {prestigePct}%
                </span>
              </div>
            </div>
          </div>

          {/* Active Office Bonuses Card */}
          <div
            data-testid="office-active-bonuses"
            className="shrink-0 rounded-[20px] border border-[#334155] bg-[#111B30]/85 p-2 lg:p-3.5"
          >
            <div className="text-[9.5px] font-extrabold tracking-wide text-slate-100 lg:text-[11px]">
              AKTİF OFİS BONUSLARI
            </div>
            <div className="mt-1.5 flex flex-col gap-1.5 lg:mt-2 lg:gap-2">
              <div
                data-testid="office-bonus-interest"
                className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border border-[#334155] bg-[#7E96B0]/15 px-2.5 py-0.5 text-[9.5px] font-bold text-[#7E96B0] lg:px-3 lg:py-1 lg:text-xs"
              >
                <span className="truncate">Banka Faiz İndirimi:</span>
                <strong className="shrink-0 font-mono-num text-[#7E96B0]">
                  -%{metrics.loanInterestDiscountPct}
                </strong>
              </div>
              <div
                data-testid="office-bonus-supply"
                className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border border-[#B86B5E]/45 bg-[#B86B5E]/15 px-2.5 py-0.5 text-[9.5px] font-bold text-[#B86B5E] lg:px-3 lg:py-1 lg:text-xs"
              >
                <span className="truncate">Tedarikçi İndirimi:</span>
                <strong className="shrink-0 font-mono-num text-[#B86B5E]">
                  -%{metrics.supplyDiscountPct}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            COLUMN 2 (CENTER): OFİS DONANIMLARI & YÜKSELTMELER (4 KART)
           ============================================================ */}
        <div
          data-testid="office-col-center"
          className="flex min-h-0 flex-col gap-1.5 min-[680px]:col-span-4 lg:gap-2.5"
        >
          <div className="shrink-0 px-0.5 leading-tight">
            <h2 className="text-[10px] font-extrabold tracking-wide text-slate-100 lg:text-xs">
              OFİS DONANIMLARI & YÜKSELTMELER
            </h2>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1.5 lg:gap-2.5">
            {OFFICE_EQUIPMENT_ITEMS.map((item) => {
              const level = getOfficeEquipmentLevel(state, item.id);
              const isMax = level >= OFFICE_EQUIPMENT_MAX_LEVEL;
              const upgradeCost = getOfficeEquipmentUpgradeCost(item.id, level);
              const canAfford = !isMax && state.cash >= upgradeCost;
              const pct = Math.round((level / OFFICE_EQUIPMENT_MAX_LEVEL) * 100);

              return (
                <div
                  key={item.id}
                  data-testid={`office-equip-card-${item.id}`}
                  className="flex min-h-0 flex-1 items-center justify-between gap-1.5 rounded-[20px] border border-[#334155] bg-[#111B30]/85 px-2 py-1.5 transition-colors hover:border-[#334155] lg:gap-2.5 lg:px-3.5 lg:py-2.5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-1.5 lg:gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-[#334155] bg-[#7E96B0]/15 text-[#7E96B0] lg:h-10 lg:w-10">
                      <EquipmentIcon id={item.id} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col leading-tight lg:flex-row lg:items-baseline lg:gap-1.5">
                        <span
                          data-testid={`office-equip-name-${item.id}`}
                          className="truncate text-[9.5px] font-extrabold leading-tight text-white lg:text-[13px]"
                        >
                          {item.name}
                        </span>
                        <span
                          data-testid={`office-equip-level-${item.id}`}
                          className="shrink-0 font-mono-num text-[9px] font-bold leading-tight text-[#7E96B0] lg:text-[11px]"
                        >
                          (Sv. {level})
                        </span>
                      </div>
                      <div className="hidden truncate text-[10px] text-slate-400 lg:block">
                        {item.shortBenefit}
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#1D2532] lg:mt-1.5 lg:h-2">
                        <div
                          className="h-full rounded-full bg-[#7A9E7E] transition-all duration-300"
                          style={{ width: `${Math.max(10, pct)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid={`office-equip-upgrade-${item.id}`}
                    disabled={isMax}
                    onClick={() => onUpgradeEquipment(item.id)}
                    title={
                      isMax
                        ? `${item.name} maksimum seviyede`
                        : `${item.name} Sv. ${level + 1} · ${formatTL(upgradeCost)}`
                    }
                    className={`flex shrink-0 flex-col items-center justify-center rounded-full px-2 py-1 text-center transition-all lg:min-w-[84px] lg:px-3.5 lg:py-1.5 ${
                      isMax
                        ? 'cursor-default border border-[#7A9E7E]/45 bg-[#7A9E7E]/15 text-[#7A9E7E]'
                        : canAfford
                        ? 'bg-[#7E96B0] text-[#181F29]  hover:brightness-110 active:scale-95'
                        : 'border border-[#334155] bg-[#7E96B0]/15 text-[#7E96B0] hover:bg-[#7E96B0]/15'
                    }`}
                  >
                    <span className="text-[8.5px] font-black leading-none tracking-wide lg:text-[10.5px] whitespace-nowrap">
                      {isMax ? 'MAKS' : 'YÜKSELT'}
                    </span>
                    {!isMax && (
                      <span
                        className={`mt-0.5 font-mono-num text-[7.5px] font-bold leading-none lg:text-[9px] whitespace-nowrap ${
                          canAfford ? 'text-slate-900' : 'text-[#7E96B0]/90'
                        }`}
                      >
                        {formatTL(upgradeCost, true)}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ============================================================
            COLUMN 3 (RIGHT): KİŞİSEL ALAN & HIZLI ERİŞİM (3 KART: A / B / C)
           ============================================================ */}
        <div
          data-testid="office-col-right"
          className="flex min-h-0 flex-col gap-1.5 min-[680px]:col-span-4 lg:gap-2.5"
        >
          <div className="shrink-0 px-0.5 leading-tight">
            <h2 className="text-[10px] font-extrabold tracking-wide text-slate-100 lg:text-xs">
              KİŞİSEL ALAN & HIZLI ERİŞİM
            </h2>
          </div>

          {/* Card A — Akıllı Telefonum */}
          <div
            data-testid="office-card-phone"
            className="flex min-h-0 flex-1 flex-col justify-between rounded-[20px] border border-[#334155] bg-[#111B30]/85 p-2 lg:p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 lg:gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-[#334155] bg-[#7E96B0]/15 text-[#7E96B0] lg:h-10 lg:w-10">
                  <Smartphone className="h-4 w-4 lg:h-5 lg:w-5" />
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="text-[10px] font-extrabold tracking-wide text-white lg:text-xs">
                    AKILLI TELEFONUM
                  </div>
                  <div className="mt-0.5 truncate text-[9px] text-slate-300 lg:text-[11px]">
                    Sosyal Medya & Mesajlar
                    {unreadNotifCount + chatCount > 0 && (
                      <span className="ml-1 font-mono-num text-[#7E96B0]">
                        · {unreadNotifCount > 0 ? `${unreadNotifCount} yeni` : `${chatCount} msj`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className="font-mono-num text-[11px] font-extrabold text-[#7E96B0] lg:text-xs">
                A
              </span>
            </div>

            <div className="mt-1.5 flex justify-end lg:mt-2">
              <button
                type="button"
                data-testid="office-open-phone-btn"
                onClick={() => onOpenOfficeModal('phone')}
                className="min-w-[84px] rounded-full border border-[#334155] bg-[#7E96B0]/15 px-5 py-1 text-[9.5px] font-extrabold tracking-wide text-sky-100 hover:bg-[#7E96B0]/15 lg:min-w-[112px] lg:py-1.5 lg:text-[11px] whitespace-nowrap"
              >
                AÇ
              </button>
            </div>
          </div>

          {/* Card B — Ofis Seviyesi Yükselt */}
          <div
            data-testid="office-card-tier-upgrade"
            className="flex min-h-0 flex-1 flex-col justify-between rounded-[20px] border border-[#334155] bg-[#111B30]/85 p-2 lg:p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 lg:gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 text-[#C8AE7D] lg:h-10 lg:w-10">
                  <Building2 className="h-4 w-4 lg:h-5 lg:w-5" />
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="text-[10px] font-extrabold tracking-wide text-white lg:text-xs">
                    OFİS SEVİYESİ YÜKSELT
                  </div>
                  <div
                    data-testid="office-next-tier-summary"
                    className="mt-0.5 line-clamp-2 text-[9px] text-slate-300 lg:text-[11px]"
                  >
                    {nextTier
                      ? `Sonraki: ${nextTier.name} — ${formatTL(nextTier.cost, true)}`
                      : 'Zirve Seviye: Holding Gökdeleni Aktif'}
                  </div>
                </div>
              </div>
              <span className="font-mono-num text-[11px] font-extrabold text-[#C8AE7D] lg:text-xs">
                B
              </span>
            </div>

            <div className="mt-1.5 grid grid-cols-2 gap-1.5 lg:mt-2 lg:gap-2">
              <button
                type="button"
                data-testid="office-tier-upgrade-btn"
                disabled={!nextTier}
                onClick={() => {
                  if (nextTier) {
                    onUpgradeOfficeTier(nextTier.id);
                  }
                }}
                className={`rounded-full py-1 text-[9.5px] font-extrabold tracking-wide transition-all lg:py-1.5 lg:text-[11px] whitespace-nowrap ${
                  !nextTier
                    ? 'cursor-default border border-[#7A9E7E]/45 bg-[#7A9E7E]/15 text-[#7A9E7E]'
                    : canAffordNextTier
                    ? 'border border-[#7A9E7E]/45 bg-[#7A9E7E]/15 text-emerald-100  hover:bg-[#7A9E7E]/35'
                    : 'border border-[#7A9E7E]/45 bg-[#7A9E7E]/15 text-[#7A9E7E] hover:bg-[#7A9E7E]/15'
                }`}
              >
                {nextTier ? 'YÜKSELT' : 'MAKSİMUM'}
              </button>
              <button
                type="button"
                data-testid="office-open-upgrades-btn"
                onClick={() => onOpenOfficeModal('design')}
                className="rounded-full border border-[#334155] bg-[#7E96B0]/15 py-1 text-[9.5px] font-extrabold tracking-wide text-sky-100 hover:bg-[#7E96B0]/15 lg:py-1.5 lg:text-[11px] whitespace-nowrap"
              >
                DETAY
              </button>
            </div>
          </div>

          {/* Card C — Kişisel Varlıklar */}
          <div
            data-testid="office-card-assets"
            className="flex min-h-0 flex-1 flex-col justify-between rounded-[20px] border border-[#334155] bg-[#111B30]/85 p-2 lg:p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 lg:gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-fuchsia-400/35 bg-fuchsia-500/15 text-[#7E96B0] lg:h-10 lg:w-10">
                  <Car className="h-4 w-4 lg:h-5 lg:w-5" />
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="text-[10px] font-extrabold tracking-wide text-white lg:text-xs">
                    KİŞİSEL VARLIKLAR
                  </div>
                  <div className="mt-0.5 truncate text-[9px] text-slate-300 lg:text-[11px]">
                    Araçlar & Gayrimenkul
                    {ownedAssetsCount > 0 && (
                      <span className="ml-1 font-mono-num text-fuchsia-300">
                        · {ownedAssetsCount} varlık
                        <span className="hidden lg:inline">
                          {' '}
                          ({formatTL(personalAssetsVal, true)})
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className="font-mono-num text-[11px] font-extrabold text-fuchsia-300 lg:text-xs">
                C
              </span>
            </div>

            <div className="mt-1.5 flex justify-end lg:mt-2">
              <button
                type="button"
                data-testid="office-open-assets-btn"
                onClick={() => onOpenOfficeModal('assets')}
                className="min-w-[84px] rounded-full border border-[#334155] bg-[#7E96B0]/15 px-5 py-1 text-[9.5px] font-extrabold tracking-wide text-sky-100 hover:bg-[#7E96B0]/15 lg:min-w-[112px] lg:py-1.5 lg:text-[11px] whitespace-nowrap"
              >
                AÇ
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
