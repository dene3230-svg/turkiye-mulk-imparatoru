import { X, ShieldAlert, MapPin, Handshake, Building2 } from 'lucide-react';
import type { RemoteBusinessRecord } from '../types/game';
import { getBlueprintById } from '../game/catalog';
import { calculateTakeoverPrice, formatTL } from '../game/economy';

interface CompetitorInspectorProps {
  competitor: RemoteBusinessRecord;
  cash: number;
  ownBranchCount: number;
  maxBranches: number;
  onTakeover: (record: RemoteBusinessRecord) => void;
  onClose: () => void;
}

export function CompetitorInspector({
  competitor,
  cash,
  ownBranchCount,
  maxBranches,
  onTakeover,
  onClose,
}: CompetitorInspectorProps) {
  const bp = getBlueprintById(competitor.business_type);
  const takeoverPrice = calculateTakeoverPrice(competitor.valuation);
  const hasQuota = ownBranchCount < maxBranches;
  const canAfford = cash >= takeoverPrice;
  const canTakeover = hasQuota && canAfford;

  return (
    <aside
      aria-label={`Rakip İşletme: ${competitor.business_name}`}
      data-testid="competitor-inspector"
      className="pointer-events-auto flex h-full w-[clamp(290px,34vw,390px)] flex-col overflow-hidden rounded-2xl border border-red-200/90 bg-white/98 text-slate-900 shadow-2xl dark:border-red-900/70 dark:bg-slate-900/98 dark:text-slate-100"
    >
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 dark:text-red-400">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            <span>Rakip İşletme · Sahibi: {competitor.owner_name}</span>
          </div>
          <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {competitor.business_name}
          </h2>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <MapPin className="h-3 w-3 shrink-0" />
            <span>
              {String(competitor.city_plate).padStart(2, '0')} {competitor.city_name} ·{' '}
              {competitor.district || competitor.city_name}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Rakip Panelini Kapat"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="panel-scroll flex-1 space-y-3 p-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: bp?.accentColor ?? '#DC2626' }}
          >
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {bp?.name ?? competitor.business_type} · Seviye {competitor.level}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              75m koruma alanı aktif · Canlı oda mülkü
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Saatlik Gelir</div>
            <div className="mt-0.5 font-mono-num text-sm font-bold text-emerald-700 dark:text-emerald-400">
              {formatTL(competitor.hourly_income)}/sa
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Piyasa Değeri</div>
            <div className="mt-0.5 font-mono-num text-sm font-bold text-slate-900 dark:text-white">
              {formatTL(competitor.valuation)}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-300 bg-amber-50/75 p-3 dark:border-amber-800/70 dark:bg-amber-950/35">
          <div className="text-xs font-bold text-amber-900 dark:text-amber-300">
            Rakip Devralma Teklifi (1.5x Değer)
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
            Piyasa değerinin 1.5 katı bedelle bu işletmeyi anında satın alıp kendi portföyünüze
            katabilirsiniz.
          </p>
          <div className="mt-2 flex items-center justify-between text-xs font-bold">
            <span>Devralma Bedeli:</span>
            <span className="font-mono-num text-red-700 dark:text-amber-300">
              {formatTL(takeoverPrice)}
            </span>
          </div>
        </div>

        {!hasQuota && (
          <p className="text-xs font-semibold text-red-600 dark:text-red-400">
            Şube kotanız dolu ({ownBranchCount}/{maxBranches}). Devralmak için şirket seviyenizi
            yükseltin.
          </p>
        )}

        <button
          type="button"
          disabled={!canTakeover}
          onClick={() => onTakeover(competitor)}
          className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
        >
          <Handshake className="h-4 w-4" />
          <span>
            {canTakeover
              ? `Devral (Satın Al) · ${formatTL(takeoverPrice)}`
              : !hasQuota
              ? 'Şube Kotası Dolu'
              : `Yetersiz Bakiye (${formatTL(takeoverPrice)})`}
          </span>
        </button>
      </div>
    </aside>
  );
}
