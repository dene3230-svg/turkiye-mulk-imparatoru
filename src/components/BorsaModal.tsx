import { useState } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Rocket,
  Briefcase,
  CheckCircle2,
} from 'lucide-react';
import type { EmpireState, StockQuote } from '../types/game';
import {
  calculatePortfolioMarketValue,
  checkIpoEligibility,
} from '../game/stockMarket';
import { formatTL } from '../game/economy';

interface BorsaModalProps {
  open: boolean;
  state: EmpireState;
  quotes: StockQuote[];
  netWorth: number;
  onBuyStock: (ticker: string, qty: number) => void;
  onSellStock: (ticker: string, qty: number) => void;
  onLaunchIpo: (ticker: string, holdingName: string) => void;
  onClose: () => void;
}

function MiniSparkline({ values, positive }: { values: number[]; positive: boolean }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(0.01, max - min);
  const width = 92;
  const height = 28;
  const points = values
    .map((v, idx) => {
      const x = (idx / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={positive ? '#10B981' : '#EF4444'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function BorsaModal({
  open,
  state,
  quotes,
  netWorth,
  onBuyStock,
  onSellStock,
  onLaunchIpo,
  onClose,
}: BorsaModalProps) {
  const [tab, setTab] = useState<'bist' | 'ipo'>('bist');
  const [ipoTicker, setIpoTicker] = useState('FUGM');
  const [ipoName, setIpoName] = useState('Anadolu Yatırım Holding A.Ş.');

  if (!open) return null;

  const bistQuotes = quotes.filter((q) => !q.isPlayerIpo);
  const ipoQuotes = quotes.filter((q) => q.isPlayerIpo);
  const portfolioValue = calculatePortfolioMarketValue(state, quotes);
  const ipoElig = checkIpoEligibility(state, netWorth);

  const renderQuoteRow = (q: StockQuote) => {
    const holding = (state.stockPortfolio ?? []).find((h) => h.ticker === q.ticker);
    const changePct = q.openPrice > 0 ? ((q.price - q.openPrice) / q.openPrice) * 100 : 0;
    const positive = changePct >= 0;
    const pnl = holding ? Math.round((q.price - holding.avgCost) * holding.shares) : 0;

    return (
      <div
        key={q.ticker}
        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950/60"
      >
        <div className="flex items-center gap-2.5 min-w-[180px]">
          <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-900 font-mono-num text-xs font-extrabold text-amber-300 dark:bg-slate-800">
            {q.ticker}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-slate-900 dark:text-white">
              {q.name}
            </div>
            <div className="truncate text-[10px] text-slate-500 dark:text-slate-400">
              {q.sector} · Temettü %{(q.dividendYieldAnnual * 100).toFixed(1)}
            </div>
          </div>
        </div>

        <MiniSparkline values={q.history} positive={positive} />

        <div className="text-right min-w-[85px]">
          <div className="font-mono-num text-xs font-extrabold text-slate-900 dark:text-white">
            ₺{q.price.toFixed(2)}
          </div>
          <div
            className={`flex items-center justify-end gap-0.5 font-mono-num text-[10px] font-bold ${
              positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>
              {positive ? '+' : ''}
              {changePct.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {[10, 100].map((qty) => (
            <button
              key={qty}
              type="button"
              disabled={state.cash < q.price * qty}
              onClick={() => onBuyStock(q.ticker, qty)}
              className="rounded-lg bg-emerald-600 px-2 py-1 font-mono-num text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              +{qty} Al
            </button>
          ))}
          {holding && holding.shares > 0 && (
            <button
              type="button"
              onClick={() => onSellStock(q.ticker, holding.shares)}
              className="rounded-lg bg-red-600 px-2 py-1 font-mono-num text-[11px] font-bold text-white hover:bg-red-700"
            >
              Sat ({holding.shares})
            </button>
          )}
        </div>

        {holding && holding.shares > 0 && (
          <div className="w-full border-t border-slate-100 pt-1 text-[10px] text-slate-500 dark:border-slate-800 flex justify-between font-mono-num">
            <span>
              Portföy: {holding.shares} lot · Ort. ₺{holding.avgCost.toFixed(2)}
            </span>
            <span className={pnl >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
              Kâr/Zarar: {pnl >= 0 ? '+' : ''}
              {formatTL(pnl)}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Canlı Borsa ve Halka Arz"
      data-testid="borsa-modal"
      className="fixed inset-0 z-[1260] flex items-center justify-center bg-slate-950/60 p-2.5 safe-inset"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full max-h-[610px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold sm:text-base">
              İstanbul Borsa & Oyuncu Holding Halka Arz (IPO)
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Nakit: <strong className="font-mono-num">{formatTL(state.cash)}</strong> · Hisse
              Portföyü:{' '}
              <strong className="font-mono-num text-emerald-700 dark:text-emerald-400">
                {formatTL(portfolioValue)}
              </strong>{' '}
              · Canlı temettü otomatik ödenir
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Borsa Penceresini Kapat"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 2 Exact Requested Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50/90 px-4 py-2 dark:border-slate-800 dark:bg-slate-950/60">
          <button
            type="button"
            data-testid="borsa-tab-bist"
            onClick={() => setTab('bist')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
              tab === 'bist'
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>BIST Devleri (8)</span>
          </button>
          <button
            type="button"
            data-testid="borsa-tab-ipo"
            onClick={() => setTab('ipo')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
              tab === 'ipo'
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Rocket className="h-3.5 w-3.5" />
            <span>Oyuncu Holdingleri (Halka Arz)</span>
          </button>
        </div>

        {/* Body */}
        <div className="panel-scroll flex-1 p-3.5">
          {tab === 'bist' ? (
            <div className="space-y-2">{bistQuotes.map(renderQuoteRow)}</div>
          ) : (
            <div className="space-y-3">
              {/* Player IPO Launch Card */}
              <div className="rounded-xl border border-amber-300/80 bg-amber-50/70 p-3.5 dark:border-amber-800/70 dark:bg-amber-950/30">
                {state.playerIpo ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <div>
                        <div className="text-xs font-bold">
                          Holdinginiz Halka Açık: [{state.playerIpo.ticker}]{' '}
                          {state.playerIpo.holdingName}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300">
                          Halka Arz Geliri: {formatTL(state.playerIpo.raisedCapital)} · Yeni
                          işletme ve fabrika kurdukça hisse fiyatınız otomatik yükselir.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-amber-900 dark:text-amber-300">
                        Kendi Holdingini Halka Arz Et (IPO)
                      </h3>
                      <span className="font-mono-num text-[11px] font-bold">
                        Değer: {formatTL(netWorth, true)} / ₺10 Mn · {ipoElig.factoryCount} Fabrika
                        / {ipoElig.businessCount} İşletme
                      </span>
                    </div>
                    {!ipoElig.eligible ? (
                      <p className="mt-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-400">
                        {ipoElig.reason}
                      </p>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          onLaunchIpo(ipoTicker, ipoName);
                        }}
                        className="mt-2.5 flex flex-wrap items-center gap-2"
                      >
                        <input
                          type="text"
                          maxLength={4}
                          value={ipoTicker}
                          onChange={(e) => setIpoTicker(e.target.value.toUpperCase())}
                          placeholder="FUGM"
                          className="h-9 w-24 rounded-lg border border-slate-300 bg-white px-2.5 font-mono-num text-xs font-extrabold uppercase dark:border-slate-700 dark:bg-slate-900"
                        />
                        <input
                          type="text"
                          maxLength={42}
                          value={ipoName}
                          onChange={(e) => setIpoName(e.target.value)}
                          placeholder="Holding Adı"
                          className="h-9 flex-1 min-w-[180px] rounded-lg border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"
                        />
                        <button
                          type="submit"
                          className="h-9 rounded-lg bg-amber-600 px-4 text-xs font-bold text-white hover:bg-amber-700"
                        >
                          Halka Arzı Başlat
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">{ipoQuotes.map(renderQuoteRow)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
