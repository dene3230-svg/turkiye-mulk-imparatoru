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
  state: EmpireState;
  quotes: StockQuote[];
  netWorth: number;
  onBuyStock: (ticker: string, qty: number) => void;
  onSellStock: (ticker: string, qty: number) => void;
  onLaunchIpo: (ticker: string, holdingName: string) => void;
  onSwitchToBanking?: () => void;
  onSwitchToAccounting?: () => void;
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
  state,
  quotes,
  netWorth,
  onBuyStock,
  onSellStock,
  onLaunchIpo,
  onSwitchToBanking,
  onSwitchToAccounting,
  onClose,
}: BorsaModalProps) {
  const [subTab, setSubTab] = useState<'bist' | 'ipo'>('bist');
  const [ipoTicker, setIpoTicker] = useState('FUGM');
  const [ipoName, setIpoName] = useState('Anadolu Yatırım Holding A.Ş.');

  if (!open) return null;

  const bistQuotes = quotes.filter((q) => !q.isPlayerIpo);
  const ipoQuotes = quotes.filter((q) => q.isPlayerIpo);
  const portfolioValue = calculatePortfolioMarketValue(state, quotes);
  const ipoElig = checkIpoEligibility(state, netWorth);

  const topTabs: MobileModalTab[] = [
    { id: 'borsa', label: 'Borsa', icon: <BarChart3 className="h-4 w-4" /> },
    ...(onSwitchToBanking
      ? [{ id: 'banka', label: 'Banka & Kredi', icon: <Landmark className="h-4 w-4" /> }]
      : []),
    ...(onSwitchToAccounting
      ? [{ id: 'muhasebe', label: 'Muhasebe', icon: <FileSpreadsheet className="h-4 w-4" /> }]
      : []),
  ];

  const renderQuoteCard = (q: StockQuote) => {
    const holding = (state.stockPortfolio ?? []).find((h) => h.ticker === q.ticker);
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
    <div data-testid="borsa-modal">
      <MobileGameModal
        title="Finans Merkezi"
        subtitle="Borsa & Halka Arz (IPO)"
        icon={<BarChart3 className="h-4 w-4" />}
        headerRight={
          <div className="hidden items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/90 px-2.5 py-1 text-xs sm:flex">
            <span className="text-slate-400">Hisse:</span>
            <strong className="font-mono-num text-emerald-400">
              {formatTL(portfolioValue, true)}
            </strong>
          </div>
        }
        tabs={topTabs}
        activeTabId="borsa"
        onSelectTab={(id) => {
          if (id === 'banka') onSwitchToBanking?.();
          if (id === 'muhasebe') onSwitchToAccounting?.();
        }}
        subHeader={
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
        }
        onClose={onClose}
        zIndexClass="z-[1260]"
      >
        {subTab === 'bist' ? (
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
