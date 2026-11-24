import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Rocket,
  Briefcase,
  CheckCircle2,
  BarChart3,
  Landmark,
  FileSpreadsheet,
  Wallet,
} from 'lucide-react';
import type { EmpireState, StockQuote } from '../types/game';
import {
  calculatePortfolioMarketValue,
  checkIpoEligibility,
} from '../game/stockMarket';
import { formatTL } from '../game/economy';
import { MobileGameModal, type MobileModalTab } from './MobileGameModal';
import { BrandLogo } from './BrandLogo';

interface BorsaModalProps {
  open: boolean;
  mode: 'market' | 'portfolio';
  state: EmpireState;
  quotes: StockQuote[];
  netWorth: number;
  onBuyStock: (ticker: string, qty: number) => void;
  onSellStock: (ticker: string, qty: number) => void;
  onLaunchIpo: (ticker: string, holdingName: string) => void;
  onSwitchToAccounting?: () => void;
  onSwitchToBanking?: () => void;
  onSwitchMode?: (mode: 'market' | 'portfolio') => void;
  onClose: () => void;
}

function MiniSparkline({ values, positive }: { values: number[]; positive: boolean }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(0.01, max - min);
  const width = 88;
  const height = 28;
  const points = values
    .map((v, idx) => {
      const x = (idx / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="shrink-0 overflow-visible" aria-hidden="true">
      <polyline
        fill="none"
        stroke={positive ? '#34D399' : '#FB7185'}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function BorsaModal({
  open,
  mode,
  state,
  quotes,
  netWorth,
  onBuyStock,
  onSellStock,
  onLaunchIpo,
  onSwitchToAccounting,
  onSwitchToBanking,
  onSwitchMode,
  onClose,
}: BorsaModalProps) {
  const [subTab, setSubTab] = useState<'bist' | 'ipo'>('bist');
  const [ipoTicker, setIpoTicker] = useState('FUGM');
  const [ipoName, setIpoName] = useState('Anadolu Yatırım Holding A.Ş.');

  if (!open) return null;

  const bistQuotes = quotes.filter((q) => !q.isPlayerIpo);
  const ipoQuotes = quotes.filter((q) => q.isPlayerIpo);
  const holdings = (state.stockPortfolio ?? []).filter((h) => h.shares > 0);
  const portfolioValue = calculatePortfolioMarketValue(state, quotes);
  const portfolioCost = holdings.reduce((sum, h) => sum + Math.round(h.shares * h.avgCost), 0);
  const portfolioPnl = portfolioValue - portfolioCost;
  const portfolioPnlPct = portfolioCost > 0 ? (portfolioPnl / portfolioCost) * 100 : 0;
  const ipoElig = checkIpoEligibility(state, netWorth);

  const topTabs: MobileModalTab[] = [
    ...(onSwitchToAccounting
      ? [{ id: 'muhasebe', label: 'Muhasebe', icon: <FileSpreadsheet className="h-4 w-4" /> }]
      : []),
    ...(onSwitchToBanking
      ? [{ id: 'banka', label: 'Banka & Kredi', icon: <Landmark className="h-4 w-4" /> }]
      : []),
    { id: 'borsa', label: 'Borsa & Yatırım', icon: <BarChart3 className="h-4 w-4" /> },
    {
      id: 'yatirimlarim',
      label: 'Yatırımlarım',
      badge: holdings.length > 0 ? holdings.length : undefined,
      icon: <Wallet className="h-4 w-4" />,
    },
  ];

  const renderQuoteCard = (q: StockQuote) => {
    const holding = holdings.find((h) => h.ticker === q.ticker);
    const changePct = q.openPrice > 0 ? ((q.price - q.openPrice) / q.openPrice) * 100 : 0;
    const positive = changePct >= 0;
    const pnl = holding ? Math.round((q.price - holding.avgCost) * holding.shares) : 0;

    return (
      <div
        key={q.ticker}
        className="flex flex-col gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 p-3"
      >
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandLogo brandKey={q.ticker || q.name} size={40} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="rounded-md bg-slate-800 px-1.5 py-0.5 font-mono-num text-xs font-black text-amber-300">
                  {q.ticker}
                </span>
                <span className="truncate text-sm font-bold text-white">{q.name}</span>
              </div>
              <div className="truncate text-xs text-slate-400">
                {q.sector} · Temettü %{(q.dividendYieldAnnual * 100).toFixed(1)}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <div className="hidden sm:block">
              <MiniSparkline values={q.history} positive={positive} />
            </div>
            <div className="text-right">
              <div className="font-mono-num text-sm font-black text-white">
                ₺{q.price.toFixed(2)}
              </div>
              <div
                className={`flex items-center justify-end gap-0.5 font-mono-num text-xs font-bold ${
                  positive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {positive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span>
                  {positive ? '+' : ''}
                  {changePct.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[10, 100].map((qty) => (
            <button
              key={qty}
              type="button"
              disabled={state.cash < q.price * qty}
              onClick={() => onBuyStock(q.ticker, qty)}
              className="min-h-[40px] flex-1 rounded-xl bg-emerald-500 px-3 font-mono-num text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 whitespace-nowrap"
            >
              +{qty} Lot Al ({formatTL(Math.round(q.price * qty), true)})
            </button>
          ))}
          {holding && holding.shares > 0 && (
            <button
              type="button"
              onClick={() => onSellStock(q.ticker, holding.shares)}
              className="min-h-[40px] rounded-xl bg-rose-500 px-3.5 font-mono-num text-xs font-bold text-white transition hover:bg-rose-400 whitespace-nowrap"
            >
              Sat ({holding.shares})
            </button>
          )}
        </div>

        {holding && holding.shares > 0 && (
          <div className="flex items-center justify-between border-t border-slate-800 pt-2 font-mono-num text-xs text-slate-300">
            <span>
              Portföy: <strong className="text-white">{holding.shares} lot</strong> · Ort. ₺
              {holding.avgCost.toFixed(2)}
            </span>
            <span className={pnl >= 0 ? 'font-bold text-emerald-400' : 'font-bold text-rose-400'}>
              {pnl >= 0 ? '+' : ''}
              {formatTL(pnl)}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div data-testid={mode === 'portfolio' ? 'investments-modal' : 'borsa-modal'}>
      <MobileGameModal
        title="Finans Merkezi"
        subtitle={
          mode === 'portfolio'
            ? 'Yatırımlarım (Borsa Portföyü)'
            : 'Borsa & Halka Arz (IPO)'
        }
        icon={mode === 'portfolio' ? <Wallet className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
        headerRight={
          <div className="hidden items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/90 px-2.5 py-1 text-xs sm:flex">
            <span className="text-slate-400">Hisse:</span>
            <strong className="font-mono-num text-emerald-400">
              {formatTL(portfolioValue, true)}
            </strong>
          </div>
        }
        tabs={topTabs}
        activeTabId={mode === 'portfolio' ? 'yatirimlarim' : 'borsa'}
        onSelectTab={(id) => {
          if (id === 'muhasebe') onSwitchToAccounting?.();
          if (id === 'banka') onSwitchToBanking?.();
          if (id === 'borsa') onSwitchMode?.('market');
          if (id === 'yatirimlarim') onSwitchMode?.('portfolio');
        }}
        subHeader={
          mode === 'market' ? (
            <div className="flex items-center justify-between gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="borsa-tab-bist"
                  onClick={() => setSubTab('bist')}
                  className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition ${
                    subTab === 'bist'
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <Briefcase className="h-4 w-4" />
                  <span>BIST Devleri ({bistQuotes.length})</span>
                </button>
                <button
                  type="button"
                  data-testid="borsa-tab-ipo"
                  onClick={() => setSubTab('ipo')}
                  className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition ${
                    subTab === 'ipo'
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <Rocket className="h-4 w-4" />
                  <span>Oyuncu Holdingleri (IPO)</span>
                </button>
              </div>
              <div className="shrink-0 font-mono-num text-xs text-slate-300">
                Nakit: <strong className="text-white">{formatTL(state.cash, true)}</strong>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3 font-mono-num">
                <span className="text-slate-300">
                  Portföy: <strong className="text-white">{formatTL(portfolioValue)}</strong>
                </span>
                <span className="text-slate-400">
                  Maliyet: <strong className="text-slate-200">{formatTL(portfolioCost)}</strong>
                </span>
              </div>
              <span
                className={`rounded-lg px-2.5 py-1 font-mono-num font-black ${
                  portfolioPnl >= 0
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {portfolioPnl >= 0 ? '+' : ''}
                {formatTL(portfolioPnl)} ({portfolioPnlPct >= 0 ? '+' : ''}
                {portfolioPnlPct.toFixed(2)}%)
              </span>
            </div>
          )
        }
        onClose={onClose}
        zIndexClass="z-[1260]"
      >
        {mode === 'portfolio' ? (
          holdings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-300">
                <Wallet className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-white">Henüz Hisse Yatırımınız Yok</h3>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-300">
                Borsa & Yatırım sekmesinden BIST Devleri veya Oyuncu Holdingleri hisselerini satın
                alarak haftalık temettü ve sermaye kazancı elde edebilirsiniz.
              </p>
              <button
                type="button"
                onClick={() => onSwitchMode?.('market')}
                className="mt-4 min-h-[42px] rounded-xl bg-amber-400 px-5 text-xs font-bold text-slate-950 hover:bg-amber-300"
              >
                Borsa & Yatırım Ekranına Git
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
              {holdings.map((holding) => {
                const quote = quotes.find((q) => q.ticker === holding.ticker);
                const currentPrice = quote?.price ?? holding.avgCost;
                const costBasis = Math.round(holding.shares * holding.avgCost);
                const currentVal = Math.round(holding.shares * currentPrice);
                const pnl = currentVal - costBasis;
                const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
                const positive = pnl >= 0;
                const halfShares = Math.max(1, Math.floor(holding.shares / 2));

                return (
                  <div
                    key={holding.ticker}
                    data-testid={`holding-card-${holding.ticker}`}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/85 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <BrandLogo brandKey={holding.ticker} size={42} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-md bg-slate-800 px-1.5 py-0.5 font-mono-num text-xs font-black text-amber-300">
                              {holding.ticker}
                            </span>
                            <span className="truncate text-sm font-bold text-white">
                              {quote?.name ?? holding.ticker}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">
                            <strong className="font-mono-num text-slate-200">
                              {holding.shares} lot
                            </strong>{' '}
                            · Temettü %{((quote?.dividendYieldAnnual ?? 0.05) * 100).toFixed(1)}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="font-mono-num text-sm font-black text-white">
                          {formatTL(currentVal)}
                        </div>
                        <div
                          className={`font-mono-num text-xs font-bold ${
                            positive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {positive ? '+' : ''}
                          {formatTL(pnl)} ({positive ? '+' : ''}
                          {pnlPct.toFixed(2)}%)
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 font-mono-num text-xs">
                      <div>
                        <div className="text-[11px] text-slate-400">Alış Ort.</div>
                        <div className="font-bold text-slate-200">
                          ₺{holding.avgCost.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Güncel</div>
                        <div className="font-bold text-white">₺{currentPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Maliyet</div>
                        <div className="font-bold text-slate-300">{formatTL(costBasis, true)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {holding.shares >= 2 && (
                        <button
                          type="button"
                          onClick={() => onSellStock(holding.ticker, halfShares)}
                          className="min-h-[40px] flex-1 rounded-xl border border-rose-500/50 bg-rose-500/15 px-3 font-mono-num text-xs font-bold text-rose-300 hover:bg-rose-500/25 whitespace-nowrap"
                        >
                          %50 Sat ({halfShares} Lot)
                        </button>
                      )}
                      <button
                        type="button"
                        data-testid={`sell-all-${holding.ticker}`}
                        onClick={() => onSellStock(holding.ticker, holding.shares)}
                        className="min-h-[40px] flex-1 rounded-xl bg-rose-500 px-3 font-mono-num text-xs font-bold text-white hover:bg-rose-400 whitespace-nowrap"
                      >
                        Tümünü Sat ({formatTL(currentVal, true)})
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : subTab === 'bist' ? (
          <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
            {bistQuotes.map(renderQuoteCard)}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Player IPO Card */}
            <section className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3.5">
              {state.playerIpo ? (
                <div className="flex items-center gap-3">
                  <BrandLogo brandKey={state.playerIpo.ticker} size={42} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-black text-white">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span className="truncate">
                        [{state.playerIpo.ticker}] {state.playerIpo.holdingName}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300">
                      Halka Arz Geliri: {formatTL(state.playerIpo.raisedCapital)} · Yeni şube ve
                      fabrika kurdukça hisse değeriniz yükselir.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-amber-300">
                      Kendi Holdingini Halka Arz Et (IPO)
                    </h3>
                    <span className="font-mono-num text-xs font-bold text-slate-200">
                      Değer: {formatTL(netWorth, true)} / ₺10 Mn · {ipoElig.factoryCount} Fabrika
                    </span>
                  </div>
                  {!ipoElig.eligible ? (
                    <p className="text-xs font-semibold text-amber-200">{ipoElig.reason}</p>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        onLaunchIpo(ipoTicker, ipoName);
                      }}
                      className="flex flex-col gap-2 sm:flex-row"
                    >
                      <input
                        type="text"
                        maxLength={4}
                        value={ipoTicker}
                        onChange={(e) => setIpoTicker(e.target.value.toUpperCase())}
                        placeholder="FUGM"
                        className="min-h-[42px] w-full rounded-xl border border-slate-700 bg-slate-950 px-3 font-mono-num text-sm font-black uppercase text-amber-300 sm:w-28"
                      />
                      <input
                        type="text"
                        maxLength={42}
                        value={ipoName}
                        onChange={(e) => setIpoName(e.target.value)}
                        placeholder="Holding Adı"
                        className="min-h-[42px] flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white"
                      />
                      <button
                        type="submit"
                        className="min-h-[42px] rounded-xl bg-amber-400 px-4 text-xs font-bold text-slate-950 hover:bg-amber-300 whitespace-nowrap"
                      >
                        Halka Arzı Başlat
                      </button>
                    </form>
                  )}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
              {ipoQuotes.map(renderQuoteCard)}
            </div>
          </div>
        )}
      </MobileGameModal>
    </div>
  );
}
