import { X, ShieldAlert, MapPin, Handshake } from 'lucide-react';
import type { RemoteBusinessRecord } from '../types/game';
import { getBlueprintById } from '../game/catalog';
import { calculateTakeoverPrice, formatTL } from '../game/economy';
import { BrandLogo } from './BrandLogo';

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
      className="pointer-events-auto flex h-full w-[clamp(290px,36vw,400px)] flex-col overflow-hidden rounded-2xl border border-rose-500/40 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-800 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandLogo brandKey={competitor.owner_name} size={40} />
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-xs font-bold text-rose-400">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{competitor.owner_name}</span>
            </div>
            <h2 className="truncate text-sm font-black text-white">
              {competitor.business_name}
            </h2>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {String(competitor.city_plate).padStart(2, '0')} {competitor.city_name} ·{' '}
                {competitor.district || competitor.city_name}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Rakip Panelini Kapat"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-rose-500/20 hover:text-rose-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="panel-scroll flex-1 min-h-0 space-y-3 overflow-y-auto overscroll-contain p-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
          <div className="text-xs font-bold text-white">
            {bp?.name ?? competitor.business_type} · Seviye {competitor.level}
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            75m koruma alanı aktif · Kurumsal rakip mülkü
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5">
            <div className="text-xs text-slate-400">Saatlik Gelir</div>
            <div className="mt-0.5 font-mono-num text-sm font-black text-emerald-400">
              {formatTL(competitor.hourly_income)}/sa
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5">
            <div className="text-xs text-slate-400">Piyasa Değeri</div>
            <div className="mt-0.5 font-mono-num text-sm font-black text-white">
              {formatTL(competitor.valuation)}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3">
          <div className="text-xs font-bold text-amber-300">
            Rakip Devralma Teklifi (1.5× Değer)
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            Piyasa değerinin 1.5 katı bedelle bu işletmeyi satın alıp kendi portföyünüze
            katabilirsiniz.
          </p>
          <div className="mt-2 flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300">Devralma Bedeli:</span>
            <span className="font-mono-num text-sm font-black text-amber-300">
              {formatTL(takeoverPrice)}
            </span>
          </div>
        </div>

        {!hasQuota && (
          <p className="text-xs font-semibold text-rose-400">
            Şube kotanız dolu ({ownBranchCount}/{maxBranches}). Devralmak için şirket seviyenizi
            yükseltin.
          </p>
        )}

        <button
          type="button"
          disabled={!canTakeover}
          onClick={() => onTakeover(competitor)}
          className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
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
