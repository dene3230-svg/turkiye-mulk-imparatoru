import type { EmpireState, PlayerIpoInfo, StockQuote } from '../types/game';
import { IPO_MIN_NET_WORTH, isFactoryType } from './catalog';

export const INITIAL_BIST_QUOTES: StockQuote[] = [
  {
    ticker: 'THYL',
    name: 'Anadolu Hava Yolları',
    sector: 'Havacılık & Lojistik',
    isPlayerIpo: false,
    price: 312.5,
    previousPrice: 308.0,
    openPrice: 305.0,
    dividendYieldAnnual: 0.048,
    history: [298, 301, 304, 302, 305, 307, 306, 309, 308, 311, 310, 312.5],
    marketCap: 430_000_000_000,
  },
  {
    ticker: 'ASLS',
    name: 'Atak Savunma',
    sector: 'Savunma & Teknoloji',
    isPlayerIpo: false,
    price: 78.4,
    previousPrice: 76.9,
    openPrice: 75.8,
    dividendYieldAnnual: 0.036,
    history: [73.2, 74.0, 74.8, 75.1, 75.8, 76.2, 75.9, 76.6, 77.1, 76.9, 77.8, 78.4],
    marketCap: 358_000_000_000,
  },
  {
    ticker: 'BIMX',
    name: 'Birlik Marketler',
    sector: 'Perakende Zinciri',
    isPlayerIpo: false,
    price: 545.0,
    previousPrice: 540.5,
    openPrice: 538.0,
    dividendYieldAnnual: 0.055,
    history: [528, 531, 534, 533, 538, 539, 541, 538, 540.5, 543, 542, 545],
    marketCap: 330_000_000_000,
  },
  {
    ticker: 'TOGR',
    name: 'Turan Otomotiv',
    sector: 'Elektrikli Otomotiv',
    isPlayerIpo: false,
    price: 214.0,
    previousPrice: 218.5,
    openPrice: 216.0,
    dividendYieldAnnual: 0.042,
    history: [222, 220, 219, 221, 216, 217, 215, 219, 218.5, 216, 215, 214],
    marketCap: 214_000_000_000,
  },
  {
    ticker: 'TUPR',
    name: 'Trakya Rafineri',
    sector: 'Enerji & Petrokimya',
    isPlayerIpo: false,
    price: 168.8,
    previousPrice: 166.2,
    openPrice: 165.0,
    dividendYieldAnnual: 0.088,
    history: [161, 162.5, 163, 164.2, 165, 164.8, 166, 165.4, 166.2, 167.5, 168.1, 168.8],
    marketCap: 325_000_000_000,
  },
  {
    ticker: 'GRNT',
    name: 'Güven Bankası',
    sector: 'Bankacılık & Finans',
    isPlayerIpo: false,
    price: 129.6,
    previousPrice: 127.8,
    openPrice: 126.5,
    dividendYieldAnnual: 0.062,
    history: [123, 124.2, 125.1, 126.0, 126.5, 127.1, 126.8, 127.5, 127.8, 128.4, 129.0, 129.6],
    marketCap: 544_000_000_000,
  },
  {
    ticker: 'ERCL',
    name: 'Ereğli Çelik',
    sector: 'Demir Çelik & Sanayi',
    isPlayerIpo: false,
    price: 54.2,
    previousPrice: 54.9,
    openPrice: 55.1,
    dividendYieldAnnual: 0.072,
    history: [56.2, 55.8, 55.5, 55.9, 55.1, 55.0, 54.7, 55.1, 54.9, 54.6, 54.4, 54.2],
    marketCap: 189_000_000_000,
  },
  {
    ticker: 'TRKC',
    name: 'TürkNet İletişim',
    sector: 'Telekomünikasyon',
    isPlayerIpo: false,
    price: 104.5,
    previousPrice: 103.2,
    openPrice: 102.0,
    dividendYieldAnnual: 0.068,
    history: [99.5, 100.2, 101.0, 101.4, 102.0, 102.6, 102.9, 103.0, 103.2, 103.8, 104.1, 104.5],
    marketCap: 230_000_000_000,
  },
];

// Realistic seed rival player holdings so the IPO tab is alive immediately even before other players join
export const SEED_PLAYER_IPOS: StockQuote[] = [
  {
    ticker: 'KOCX',
    name: 'Anadolu Sanayi Holding',
    sector: 'Oyuncu Holdingi · Sanayi & Perakende',
    isPlayerIpo: true,
    ownerId: 'seed-rival-1',
    ownerName: 'Demirhan Holding',
    price: 142.0,
    previousPrice: 138.5,
    openPrice: 135.0,
    dividendYieldAnnual: 0.075,
    history: [128, 130, 132, 133.5, 135, 136, 137.2, 138, 138.5, 140, 141.2, 142],
    marketCap: 18_500_000,
    businessCount: 9,
    factoryCount: 2,
  },
  {
    ticker: 'EGEH',
    name: 'Ege Turizm & AVM A.Ş.',
    sector: 'Oyuncu Holdingi · Otel & AVM',
    isPlayerIpo: true,
    ownerId: 'seed-rival-2',
    ownerName: 'İzmir Yatırım Grubu',
    price: 118.4,
    previousPrice: 116.8,
    openPrice: 115.0,
    dividendYieldAnnual: 0.064,
    history: [110, 111.5, 112.2, 113.8, 115, 114.6, 115.9, 116.2, 116.8, 117.4, 118.0, 118.4],
    marketCap: 14_200_000,
    businessCount: 7,
    factoryCount: 1,
  },
];

export function createInitialStockQuotes(): StockQuote[] {
  return [...INITIAL_BIST_QUOTES, ...SEED_PLAYER_IPOS].map((q) => ({
    ...q,
    history: [...q.history],
  }));
}

export function tickStockQuotes(
  quotes: StockQuote[],
  ownIpoTicker?: string,
  ownNetWorth?: number,
  ownBusinessCount?: number,
  ownFactoryCount?: number
): StockQuote[] {
  return quotes.map((q) => {
    let nextPrice = q.price;
    if (ownIpoTicker && q.ticker === ownIpoTicker && ownNetWorth !== undefined) {
      // Player holding price scales dynamically with businesses, factories & net worth!
      const fundamentalPrice =
        Math.max(
          25,
          ownNetWorth / 100_000 + (ownBusinessCount ?? 0) * 6.5 + (ownFactoryCount ?? 0) * 18.0
        );
      const drift = (fundamentalPrice - q.price) * 0.25;
      const noise = (Math.random() - 0.48) * q.price * 0.015;
      nextPrice = Math.max(10, Number((q.price + drift + noise).toFixed(2)));
    } else {
      const volatility = q.isPlayerIpo ? 0.024 : 0.016;
      const changePct = (Math.random() - 0.488) * volatility;
      nextPrice = Math.max(5, Number((q.price * (1 + changePct)).toFixed(2)));
    }

    const nextHistory = [...q.history.slice(-23), nextPrice];
    return {
      ...q,
      previousPrice: q.price,
      price: nextPrice,
      history: nextHistory,
      marketCap:
        ownIpoTicker && q.ticker === ownIpoTicker && ownNetWorth !== undefined
          ? ownNetWorth
          : Math.round(q.marketCap * (nextPrice / Math.max(1, q.price))),
      businessCount:
        ownIpoTicker && q.ticker === ownIpoTicker && ownBusinessCount !== undefined
          ? ownBusinessCount
          : q.businessCount,
      factoryCount:
        ownIpoTicker && q.ticker === ownIpoTicker && ownFactoryCount !== undefined
          ? ownFactoryCount
          : q.factoryCount,
    };
  });
}

export function checkIpoEligibility(
  state: EmpireState,
  netWorth: number
): { eligible: boolean; reason?: string; factoryCount: number; businessCount: number } {
  const businessCount = state.businesses.length;
  const factoryCount = state.businesses.filter((b) => isFactoryType(b.blueprintId)).length;

  if (state.playerIpo) {
    return {
      eligible: false,
      reason: `Holdinginiz zaten ${state.playerIpo.ticker} koduyla Borsa'da işlem görüyor.`,
      factoryCount,
      businessCount,
    };
  }
  if (netWorth < IPO_MIN_NET_WORTH) {
    return {
      eligible: false,
      reason: 'Halka arz için şirket değeriniz en az ₺10.000.000 olmalıdır.',
      factoryCount,
      businessCount,
    };
  }
  if (factoryCount < 1 && businessCount < 5) {
    return {
      eligible: false,
      reason: 'Halka arz için en az 1 fabrika veya 5 aktif işletme gereklidir.',
      factoryCount,
      businessCount,
    };
  }
  return { eligible: true, factoryCount, businessCount };
}

export function launchPlayerIpo(
  state: EmpireState,
  tickerRaw: string,
  holdingNameRaw: string,
  netWorth: number,
  owner: { id: string; name: string },
  existingTickers: string[],
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string; quote?: StockQuote } {
  const elig = checkIpoEligibility(state, netWorth);
  if (!elig.eligible) {
    return { state, ok: false, error: elig.reason };
  }

  const ticker = tickerRaw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (ticker.length !== 4) {
    return { state, ok: false, error: 'Borsa kodu tam olarak 4 büyük harf olmalıdır (örn: FUGM).' };
  }
  if (existingTickers.includes(ticker)) {
    return { state, ok: false, error: `${ticker} borsa kodu zaten kullanılıyor.` };
  }

  const holdingName = holdingNameRaw.trim();
  if (holdingName.length < 3) {
    return { state, ok: false, error: 'Lütfen geçerli bir Holding adı girin.' };
  }

  const initialPrice = Number(
    Math.max(45, netWorth / 100_000 + elig.businessCount * 6.5 + elig.factoryCount * 18).toFixed(2)
  );
  const totalSharesIssued = 100_000;
  const publicFloatShares = 25_000; // 25% public float sold to institutional investors on IPO day
  const raisedCapital = Math.round(publicFloatShares * initialPrice * 0.55);

  const ipoInfo: PlayerIpoInfo = {
    ticker,
    holdingName: holdingName.slice(0, 42),
    listedAt: now,
    initialPrice,
    totalSharesIssued,
    publicFloatShares,
    raisedCapital,
  };

  const quote: StockQuote = {
    ticker,
    name: ipoInfo.holdingName,
    sector: 'Oyuncu Holdingi · Halka Arz',
    isPlayerIpo: true,
    ownerId: owner.id,
    ownerName: owner.name,
    price: initialPrice,
    previousPrice: initialPrice,
    openPrice: initialPrice,
    dividendYieldAnnual: 0.07,
    history: Array.from({ length: 12 }, () => initialPrice),
    marketCap: netWorth,
    businessCount: elig.businessCount,
    factoryCount: elig.factoryCount,
  };

  return {
    ok: true,
    quote,
    state: {
      ...state,
      cash: state.cash + raisedCapital,
      playerIpo: ipoInfo,
      lastSavedAt: now,
    },
  };
}

export function buyStockShares(
  state: EmpireState,
  quote: StockQuote,
  quantity: number,
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string } {
  const qty = Math.floor(quantity);
  if (qty <= 0) return { state, ok: false, error: 'Geçersiz adet.' };
  const totalCost = Math.round(quote.price * qty);
  if (state.cash < totalCost) {
    return { state, ok: false, error: 'Hisse alımı için yetersiz nakit bakiye.' };
  }

  const portfolio = state.stockPortfolio ?? [];
  const existing = portfolio.find((h) => h.ticker === quote.ticker);
  const nextPortfolio = existing
    ? portfolio.map((h) =>
        h.ticker === quote.ticker
          ? {
              ...h,
              shares: h.shares + qty,
              avgCost: Number(
                ((h.shares * h.avgCost + qty * quote.price) / (h.shares + qty)).toFixed(2)
              ),
            }
          : h
      )
    : [...portfolio, { ticker: quote.ticker, shares: qty, avgCost: quote.price }];

  return {
    ok: true,
    state: {
      ...state,
      cash: state.cash - totalCost,
      stockPortfolio: nextPortfolio,
      lastSavedAt: now,
    },
  };
}

export function sellStockShares(
  state: EmpireState,
  quote: StockQuote,
  quantity: number,
  now = Date.now()
): { state: EmpireState; ok: boolean; error?: string; proceeds?: number } {
  const qty = Math.floor(quantity);
  if (qty <= 0) return { state, ok: false, error: 'Geçersiz adet.' };
  const portfolio = state.stockPortfolio ?? [];
  const existing = portfolio.find((h) => h.ticker === quote.ticker);
  if (!existing || existing.shares < qty) {
    return { state, ok: false, error: 'Satılacak yeterli hisse adedi bulunmuyor.' };
  }

  const proceeds = Math.round(quote.price * qty);
  const remaining = existing.shares - qty;
  const nextPortfolio =
    remaining > 0
      ? portfolio.map((h) => (h.ticker === quote.ticker ? { ...h, shares: remaining } : h))
      : portfolio.filter((h) => h.ticker !== quote.ticker);

  return {
    ok: true,
    proceeds,
    state: {
      ...state,
      cash: state.cash + proceeds,
      stockPortfolio: nextPortfolio,
      lastSavedAt: now,
    },
  };
}

export function calculatePortfolioMarketValue(
  state: EmpireState,
  quotes: StockQuote[]
): number {
  const quoteMap = new Map(quotes.map((q) => [q.ticker, q.price]));
  return Math.round(
    (state.stockPortfolio ?? []).reduce(
      (sum, h) => sum + h.shares * (quoteMap.get(h.ticker) ?? h.avgCost),
      0
    )
  );
}

export function calculateDividendPerTick(
  state: EmpireState,
  quotes: StockQuote[],
  elapsedSec: number
): number {
  const quoteMap = new Map(quotes.map((q) => [q.ticker, q]));
  let payout = 0;
  for (const h of state.stockPortfolio ?? []) {
    const q = quoteMap.get(h.ticker);
    if (!q) continue;
    // Scaled lively game dividend: annual yield compressed into ~600s game-year cycle
    payout += h.shares * q.price * (q.dividendYieldAnnual / 600) * elapsedSec;
  }
  return payout;
}
