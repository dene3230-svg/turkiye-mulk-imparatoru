import { useEffect, useState } from 'react';
import { X, TrendingUp, TrendingDown, CheckCircle2, Coins, ArrowUpDown } from 'lucide-react';
import type { StockQuote } from '../types/game';
import { formatTL } from '../game/economy';
import { BrandLogo } from './BrandLogo';

interface StockTradeModalProps {
  open: boolean;
  side: 'buy' | 'sell';
  quote: StockQuote | null;
  cash: number;
  ownedShares: number;
  avgCost?: number;
  onConfirm: (ticker: string, qty: number) => void;
  onClose: () => void;
}

const PERCENT_SHORTCUTS = [
  { label: '%25', ratio: 0.25 },
  { label: '%50', ratio: 0.5 },
  { label: '%75', ratio: 0.75 },
  { label: '%100', ratio: 1 },
];

export function StockTradeModal({
  open,
  side,
  quote,
  cash,
  ownedShares,
  avgCost = 0,
  onConfirm,
  onClose,
}: StockTradeModalProps) {
  const unitPrice = quote?.price ?? 0;
  const maxQty =
    side === 'buy'
      ? unitPrice > 0
        ? Math.floor(cash / unitPrice)
        : 0
      : Math.max(0, Math.floor(ownedShares));

  const defaultQty = maxQty > 0 ? Math.max(1, Math.min(maxQty, Math.floor(maxQty * 0.25) || 1)) : 0;

  const [qty, setQty] = useState<number>(defaultQty);
  const [qtyText, setQtyText] = useState<string>(String(defaultQty));
  const [tlText, setTlText] = useState<string>(String(Math.round(defaultQty * unitPrice)));

  useEffect(() => {
    if (!open || !quote) return;
    const initMax =
      side === 'buy'
        ? quote.price > 0
          ? Math.floor(cash / quote.price)
          : 0
        : Math.max(0, Math.floor(ownedShares));
    const initQty = initMax > 0 ? Math.max(1, Math.min(initMax, Math.floor(initMax * 0.25) || 1)) : 0;
    setQty(initQty);
    setQtyText(String(initQty));
    setTlText(String(Math.round(initQty * quote.price)));
  }, [open, side, quote?.ticker]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !quote) return null;

  const clampedQty = Math.max(0, Math.min(maxQty, Math.floor(qty)));
  const totalTL = Math.round(clampedQty * unitPrice);
  const changePct = quote.openPrice > 0 ? ((quote.price - quote.openPrice) / quote.openPrice) * 100 : 0;
  const positive = changePct >= 0;
  const remainingCashAfterBuy = Math.max(0, cash - totalTL);
  const estimatedSellPnl = side === 'sell' ? Math.round((unitPrice - avgCost) * clampedQty) : 0;
  const canConfirm = clampedQty >= 1 && clampedQty <= maxQty && (side === 'sell' || cash >= totalTL);

  const applyQty = (next: number) => {
    const safe = Math.max(0, Math.min(maxQty, Math.floor(Number.isFinite(next) ? next : 0)));
    setQty(safe);
    setQtyText(String(safe));
    setTlText(String(Math.round(safe * unitPrice)));
  };

  const handleQtyInputChange = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, '');
    setQtyText(digits);
    const parsed = digits === '' ? 0 : parseInt(digits, 10);
    const safe = Math.max(0, Math.min(maxQty, Number.isFinite(parsed) ? parsed : 0));
    setQty(safe);
    setTlText(String(Math.round(safe * unitPrice)));
  };

  const handleTlInputChange = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, '');
    setTlText(digits);
    const parsedTl = digits === '' ? 0 : parseInt(digits, 10);
    if (!Number.isFinite(parsedTl) || unitPrice <= 0) {
      setQty(0);
      setQtyText('0');
      return;
    }
    const derivedQty = Math.max(0, Math.min(maxQty, Math.floor(parsedTl / unitPrice)));
    setQty(derivedQty);
    setQtyText(String(derivedQty));
  };

  const handleSelectPercent = (ratio: number) => {
    if (maxQty <= 0) {
      applyQty(0);
      return;
    }
    const computed = ratio >= 1 ? maxQty : Math.max(1, Math.floor(maxQty * ratio));
    applyQty(computed);
  };

  const isBuy = side === 'buy';

  return (
    <div
      data-testid="stock-trade-modal"
      className="fixed inset-0 z-[1320] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isBuy ? 'Hisse Alım Emri' : 'Hisse Satım Emri'}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-500/70 bg-slate-950/98 text-slate-100 shadow-[0_24px_80px_rgba(0,0,0,0.85)]"
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-700/80 bg-slate-900/95 px-3.5 py-2 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandLogo brandKey={quote.ticker || quote.name} size={32} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`rounded-md border px-1.5 py-0.5 text-[10px] font-black uppercase ${
                    isBuy
                      ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-300'
                      : 'border-rose-400/70 bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {isBuy ? 'ALIM EMRİ' : 'SATIM EMRİ'}
                </span>
                <span className="font-mono-num text-xs font-black text-amber-300">
                  {quote.ticker}
                </span>
                <span className="truncate text-xs sm:text-sm font-bold text-white">{quote.name}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="font-mono-num font-bold text-slate-200">
                  Birim: ₺{unitPrice.toFixed(2)}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 font-mono-num font-bold ${
                    positive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {positive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {positive ? '+' : ''}
                  {changePct.toFixed(2)}%
                </span>
                <span className="hidden sm:inline text-slate-500">·</span>
                <span className="hidden sm:inline font-mono-num text-slate-300">
                  {isBuy
                    ? `Bütçe: ${formatTL(cash)} (Maks ${maxQty.toLocaleString('tr-TR')} Lot)`
                    : `Eldeki: ${ownedShares.toLocaleString('tr-TR')} Lot (${formatTL(Math.round(ownedShares * unitPrice))})`}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Emir penceresini kapat"
            className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg border border-slate-500/60 bg-slate-800/90 text-slate-100 transition-all duration-200 ease-out hover:border-rose-400/70 hover:bg-rose-500/20 active:scale-[0.98]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-2.5 sm:p-4 space-y-2.5">
          {/* Available Budget / Holdings (mobile portrait) */}
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-600/60 bg-slate-900/85 px-2.5 py-1.5 text-xs sm:hidden">
            <div>
              <div className="text-[10px] text-slate-400">
                {isBuy ? 'Mevcut Nakit Bütçe' : 'Elimdeki Hisse'}
              </div>
              <div className="font-mono-num text-xs font-black text-white">
                {isBuy ? formatTL(cash) : `${ownedShares.toLocaleString('tr-TR')} Lot`}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400">
                {isBuy ? 'Alınabilir Maks. Lot' : 'Güncel Toplam Değer'}
              </div>
              <div className="font-mono-num text-xs font-black text-amber-300">
                {isBuy
                  ? `${maxQty.toLocaleString('tr-TR')} Lot`
                  : formatTL(Math.round(ownedShares * unitPrice))}
              </div>
            </div>
          </div>

          {/* Bidirectional Manual Numeric Inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="trade-qty-input"
                className="block text-[11px] font-bold text-slate-200"
              >
                Hisse Adedi (Lot)
              </label>
              <input
                id="trade-qty-input"
                data-testid="trade-qty-input"
                type="text"
                inputMode="numeric"
                value={qtyText}
                onChange={(e) => handleQtyInputChange(e.target.value)}
                placeholder="0"
                className="mt-1 min-h-[38px] w-full rounded-lg border border-slate-500/70 bg-slate-900 px-2.5 font-mono-num text-sm font-black text-white outline-none transition-all duration-200 focus:border-amber-400"
              />
            </div>

            <div>
              <label
                htmlFor="trade-tl-input"
                className="flex items-center justify-between text-[11px] font-bold text-slate-200"
              >
                <span>İşlem Tutarı (₺ TL)</span>
                <ArrowUpDown className="h-3 w-3 text-slate-400" />
              </label>
              <input
                id="trade-tl-input"
                data-testid="trade-tl-input"
                type="text"
                inputMode="numeric"
                value={tlText}
                onChange={(e) => handleTlInputChange(e.target.value)}
                placeholder="0"
                className="mt-1 min-h-[38px] w-full rounded-lg border border-slate-500/70 bg-slate-900 px-2.5 font-mono-num text-sm font-black text-amber-300 outline-none transition-all duration-200 focus:border-amber-400"
              />
            </div>
          </div>

          {/* Interactive Range Slider + Quick Percentage Shortcuts */}
          <div className="rounded-xl border border-slate-600/60 bg-slate-900/75 px-3 py-2 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-300">Miktar Kaydırma Çubuğu</span>
              <span className="font-mono-num font-black text-amber-300">
                {clampedQty.toLocaleString('tr-TR')} / {maxQty.toLocaleString('tr-TR')} Lot
              </span>
            </div>
            <input
              type="range"
              data-testid="trade-qty-slider"
              aria-label="Hisse miktarı kaydırma çubuğu"
              min={0}
              max={Math.max(1, maxQty)}
              step={1}
              disabled={maxQty <= 0}
              value={clampedQty}
              onChange={(e) => applyQty(Number(e.target.value))}
              className={`h-2 w-full cursor-pointer rounded-lg border border-slate-600/70 bg-slate-800 ${
                isBuy ? 'accent-emerald-400' : 'accent-rose-400'
              } disabled:opacity-40`}
            />

            {/* Quick Percentage Shortcuts (%25, %50, %75, %100) */}
            <div className="grid grid-cols-4 gap-2 pt-0.5">
              {PERCENT_SHORTCUTS.map((preset) => {
                const targetQty =
                  maxQty <= 0
                    ? 0
                    : preset.ratio >= 1
                    ? maxQty
                    : Math.max(1, Math.floor(maxQty * preset.ratio));
                const isActive = maxQty > 0 && clampedQty === targetQty;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    data-testid={`trade-pct-${Math.round(preset.ratio * 100)}`}
                    disabled={maxQty <= 0}
                    onClick={() => handleSelectPercent(preset.ratio)}
                    className={`min-h-[34px] rounded-lg border text-xs font-black transition-all duration-200 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${
                      isActive
                        ? 'border-amber-400/80 bg-amber-400 text-slate-950 shadow-sm shadow-amber-500/20'
                        : 'border-slate-500/60 bg-slate-800/90 text-slate-100 hover:border-amber-400/60 hover:bg-slate-700/90'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Order Confirmation Summary */}
          <div className="rounded-xl border border-slate-600/70 bg-slate-900/90 px-3 py-2 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200">
                {isBuy ? 'Toplam Ödenecek Tutar' : 'Kasaya Geçecek Tutar'}
              </span>
              <strong
                data-testid="trade-total-tl"
                className={`font-mono-num text-sm sm:text-base font-black ${
                  isBuy ? 'text-emerald-400' : 'text-amber-300'
                }`}
              >
                {formatTL(totalTL)}
              </strong>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>
                {clampedQty.toLocaleString('tr-TR')} Lot × ₺{unitPrice.toFixed(2)}
              </span>
              {isBuy ? (
                <span className="font-mono-num font-bold text-slate-200">
                  Kalan Nakit: {formatTL(remainingCashAfterBuy)}
                </span>
              ) : (
                <span
                  className={`font-mono-num font-bold ${
                    estimatedSellPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  K/Z: {estimatedSellPnl >= 0 ? '+' : ''}
                  {formatTL(estimatedSellPnl)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="flex shrink-0 items-center gap-2.5 border-t border-slate-700/80 bg-slate-900/95 px-3.5 py-2 sm:px-4 sm:py-3">
          <button
            type="button"
            data-testid="trade-cancel-btn"
            onClick={onClose}
            className="min-h-[40px] sm:min-h-[44px] flex-1 rounded-lg border border-slate-500/70 bg-slate-800/90 px-4 text-xs font-bold text-slate-100 transition-all duration-200 ease-out hover:border-slate-400 hover:bg-slate-700 active:scale-[0.98]"
          >
            İptal
          </button>
          <button
            type="button"
            data-testid="trade-confirm-btn"
            disabled={!canConfirm}
            onClick={() => {
              if (!canConfirm) return;
              onConfirm(quote.ticker, clampedQty);
              onClose();
            }}
            className={`inline-flex min-h-[40px] sm:min-h-[44px] flex-[1.6] items-center justify-center gap-1.5 rounded-lg border px-4 text-xs font-black transition-all duration-200 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500 ${
              isBuy
                ? 'border-emerald-300/80 bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                : 'border-rose-300/80 bg-rose-500 text-white hover:bg-rose-400'
            }`}
          >
            {isBuy ? <CheckCircle2 className="h-4 w-4" /> : <Coins className="h-4 w-4" />}
            <span>
              {isBuy ? `Alımı Onayla (${clampedQty} Lot)` : `Satışı Onayla (${clampedQty} Lot)`}
            </span>
          </button>
        </footer>
      </div>
    </div>
  );
}
