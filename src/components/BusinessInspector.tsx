import { useState } from 'react';
import {
  X,
  TrendingUp,
  Users,
  Megaphone,
  Coins,
  Trash2,
  MapPin,
  ArrowUpCircle,
} from 'lucide-react';
import type { MarketEvent, OwnedBusiness } from '../types/game';
import { getBlueprintById } from '../game/catalog';
import {
  calculateBoostCost,
  calculateBusinessIncomePerSec,
  calculateBusinessValuation,
  calculateStaffHireCost,
  calculateUpgradeCost,
  calculateVaultCapacity,
  formatTL,
} from '../game/economy';

interface BusinessInspectorProps {
  business: OwnedBusiness;
  cash: number;
  activeEvent: MarketEvent | null;
  now: number;
  onCollect: (businessId: string) => void;
  onUpgrade: (businessId: string) => void;
  onHireStaff: (businessId: string) => void;
  onBoost: (businessId: string) => void;
  onSell: (businessId: string) => void;
  onClose: () => void;
}

export function BusinessInspector({
  business,
  cash,
  activeEvent,
  now,
  onCollect,
  onUpgrade,
  onHireStaff,
  onBoost,
  onSell,
  onClose,
}: BusinessInspectorProps) {
  const [confirmSell, setConfirmSell] = useState(false);

  const bp = getBlueprintById(business.blueprintId);
  const incomePerSec = calculateBusinessIncomePerSec(business, activeEvent, now);
  const capacity = calculateVaultCapacity(business);
  const vaultPct = capacity > 0 ? Math.min(100, (business.pendingCash / capacity) * 100) : 0;
  const upgradeCost = calculateUpgradeCost(business);
  const staffCost = calculateStaffHireCost(business);
  const boostCost = calculateBoostCost(business);
  const valuation = calculateBusinessValuation(business, activeEvent, now);

  const isMaxLevel = bp ? business.level >= bp.maxLevel : true;
  const isMaxStaff = bp ? business.staffCount >= bp.maxStaff : true;
  const boostRemainingSec = Math.max(0, Math.ceil((business.boostEndsAt - now) / 1000));
  const pendingWhole = Math.floor(business.pendingCash);

  return (
    <aside
      aria-label={`${business.customName} Yönetimi`}
      data-testid="business-inspector"
      className="pointer-events-auto flex h-full w-[clamp(290px,34vw,390px)] flex-col overflow-hidden rounded-2xl border border-slate-200/95 bg-white/98 text-slate-900 shadow-2xl dark:border-slate-700/90 dark:bg-slate-900/98 dark:text-slate-100"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>
              {business.cityName} · {business.districtName}
            </span>
          </div>
          <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {business.customName}
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {bp?.name} · Seviye {business.level}/{bp?.maxLevel ?? 10}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="İşletme Panelini Kapat"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="panel-scroll flex-1 space-y-3 p-3.5">
        {/* Live Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Anlık Gelir</div>
            <div className="mt-0.5 font-mono-num text-sm font-bold text-emerald-700 dark:text-emerald-400">
              +{formatTL(incomePerSec)}/sn
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Piyasa Değeri</div>
            <div className="mt-0.5 font-mono-num text-sm font-bold text-slate-900 dark:text-white">
              {formatTL(valuation)}
            </div>
          </div>
        </div>

        {/* Vault Cash Collection */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-900 dark:text-emerald-200">
              İşletme Kasası
            </span>
            <span className="font-mono-num font-bold text-emerald-800 dark:text-emerald-300">
              {formatTL(pendingWhole)} / {formatTL(capacity, true)}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-200/80 dark:bg-emerald-950">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-300 dark:bg-emerald-400"
              style={{ width: `${vaultPct}%` }}
            />
          </div>
          <button
            type="button"
            disabled={pendingWhole <= 0}
            onClick={() => onCollect(business.id)}
            className="mt-2.5 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 whitespace-nowrap"
          >
            <Coins className="h-4 w-4" />
            <span>
              {pendingWhole > 0 ? `Kasayı Topla (${formatTL(pendingWhole)})` : 'Gelir Birikiyor...'}
            </span>
          </button>
        </div>

        {/* Management Actions */}
        <div className="space-y-2">
          {/* Upgrade Level */}
          <button
            type="button"
            disabled={isMaxLevel || cash < upgradeCost}
            onClick={() => onUpgrade(business.id)}
            className="flex min-h-[52px] w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:bg-amber-50/70 disabled:cursor-not-allowed disabled:opacity-55 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                <ArrowUpCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {isMaxLevel ? 'Maksimum Seviye' : `Seviye ${business.level + 1} Yükselt`}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Gelir +%45 · Kasa kapasitesi +%50
                </div>
              </div>
            </div>
            {!isMaxLevel && (
              <span className="shrink-0 font-mono-num text-xs font-bold text-amber-700 dark:text-amber-400">
                {formatTL(upgradeCost)}
              </span>
            )}
          </button>

          {/* Hire Staff */}
          <button
            type="button"
            disabled={isMaxStaff || cash < staffCost}
            onClick={() => onHireStaff(business.id)}
            className="flex min-h-[52px] w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:bg-sky-50/70 disabled:cursor-not-allowed disabled:opacity-55 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Personel Al ({business.staffCount}/{bp?.maxStaff ?? 8})
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {business.staffCount >= 3
                    ? 'Otomatik aktarım aktif · +%14 verim'
                    : '3+ personelde otomatik tahsilat açılır'}
                </div>
              </div>
            </div>
            {!isMaxStaff && (
              <span className="shrink-0 font-mono-num text-xs font-bold text-sky-700 dark:text-sky-400">
                {formatTL(staffCost)}
              </span>
            )}
          </button>

          {/* Marketing Boost */}
          <button
            type="button"
            disabled={boostRemainingSec > 0 || cash < boostCost}
            onClick={() => onBoost(business.id)}
            className="flex min-h-[52px] w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:bg-indigo-50/70 disabled:cursor-not-allowed disabled:opacity-55 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                <Megaphone className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {boostRemainingSec > 0
                    ? `Kampanya Aktif (${boostRemainingSec}sn)`
                    : 'Reklam Kampanyası (2x Gelir)'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  60 saniye boyunca ciroyu 2 katına çıkarır
                </div>
              </div>
            </div>
            {boostRemainingSec === 0 && (
              <span className="shrink-0 font-mono-num text-xs font-bold text-indigo-700 dark:text-indigo-400">
                {formatTL(boostCost)}
              </span>
            )}
          </button>
        </div>

        {/* Lifetime Stat & Sell */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Toplam Kazanç:
          </span>
          <span className="font-mono-num font-bold text-slate-800 dark:text-slate-200">
            {formatTL(business.totalEarned)}
          </span>
        </div>

        {!confirmSell ? (
          <button
            type="button"
            onClick={() => setConfirmSell(true)}
            className="flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Mülkü Sat ({formatTL(valuation + pendingWhole)})</span>
          </button>
        ) : (
          <div className="rounded-xl border border-red-300 bg-red-50 p-2.5 dark:border-red-800 dark:bg-red-950/50">
            <p className="text-xs font-semibold text-red-800 dark:text-red-200">
              Bu mülkü {formatTL(valuation + pendingWhole)} karşılığında satmak istediğinize emin
              misiniz?
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => onSell(business.id)}
                className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
              >
                Evet, Sat
              </button>
              <button
                type="button"
                onClick={() => setConfirmSell(false)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
