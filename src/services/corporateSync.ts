import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { withSafeTimeout } from '../lib/safeStartup';
import type {
  BankRecord,
  BusinessTypeId,
  ChatMessage,
  FranchiseBrand,
  LoanRecord,
  StockQuote,
} from '../types/game';
import { isValidBusinessType } from '../game/catalog';
import { SEED_FRANCHISE_BRANDS } from '../game/holdingEngine';
import { DEFAULT_SYSTEM_BANKS } from '../game/bankingEngine';
import { SEED_PLAYER_IPOS } from '../game/stockMarket';

// Session-level circuit breaker for missing/schema-mismatched optional tables (404 / PGRST205 / 400)
const UNAVAILABLE_CACHE_KEY = 'tmi_unavailable_supabase_tables_v172';
const unavailableTables = new Set<string>();

try {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const raw = window.sessionStorage.getItem(UNAVAILABLE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const t of parsed) if (typeof t === 'string') unavailableTables.add(t);
      }
    }
  }
} catch {
  // ignore storage access issues
}

function markTableUnavailable(table: string): void {
  unavailableTables.add(table);
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(UNAVAILABLE_CACHE_KEY, JSON.stringify(Array.from(unavailableTables)));
    }
  } catch {
    // ignore storage access issues
  }
}

function isTableUnavailableOrSchemaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const obj = error as { code?: string; status?: number; message?: string };
  const code = String(obj.code ?? '');
  const msg = String(obj.message ?? '').toLowerCase();
  if (
    obj.status === 404 ||
    obj.status === 400 ||
    code === 'PGRST205' ||
    code === 'PGRST204' ||
    code === '42P01' ||
    code === '42703' ||
    code === '42501'
  ) {
    return true;
  }
  return (
    msg.includes('could not find') ||
    msg.includes('does not exist') ||
    msg.includes('schema cache')
  );
}

// --- FRANCHISES (public.franchises) ---
export async function fetchAllFranchises(): Promise<FranchiseBrand[]> {
  if (unavailableTables.has('franchises')) {
    return SEED_FRANCHISE_BRANDS;
  }
  return withSafeTimeout(
    async () => {
      try {
        const { data, error } = await supabase
          .from('franchises')
          .select('*')
          .limit(100);

        if (error || !data) {
          if (isTableUnavailableOrSchemaError(error)) {
            markTableUnavailable('franchises');
          }
          return SEED_FRANCHISE_BRANDS;
        }

        const remote: FranchiseBrand[] = data.map((row: Record<string, unknown>) => {
          const rawType = String(row.business_type ?? 'kafe');
          return {
            id: String(row.id),
            ownerId: String(row.owner_id),
            ownerName: String(row.owner_name ?? 'Holding'),
            brandName: String(row.brand_name ?? 'Marka'),
            businessType: (isValidBusinessType(rawType) ? rawType : 'kafe') as BusinessTypeId,
            licenseFee: Number(row.license_fee ?? 35_000),
            royaltyRate: Number(row.royalty_rate ?? 0.15),
            branchCount: Number(row.branch_count ?? 0),
            totalRoyaltyEarned: Number(row.total_royalty_earned ?? 0),
            createdAt: row.created_at ? new Date(String(row.created_at)).getTime() : Date.now(),
          };
        });

        remote.sort((a, b) => b.branchCount - a.branchCount);
        const ids = new Set(remote.map((r) => r.id));
        return [...remote, ...SEED_FRANCHISE_BRANDS.filter((s) => !ids.has(s.id))];
      } catch {
        return SEED_FRANCHISE_BRANDS;
      }
    },
    5000,
    SEED_FRANCHISE_BRANDS,
    'fetchAllFranchises'
  );
}

export async function publishFranchiseBrand(brand: FranchiseBrand): Promise<boolean> {
  if (unavailableTables.has('franchises')) return false;
  try {
    const { error } = await supabase.from('franchises').upsert(
      {
        id: brand.id,
        owner_id: brand.ownerId,
        owner_name: brand.ownerName,
        brand_name: brand.brandName,
        business_type: brand.businessType,
        license_fee: brand.licenseFee,
        royalty_rate: brand.royaltyRate,
        branch_count: brand.branchCount,
        total_royalty_earned: brand.totalRoyaltyEarned,
      },
      { onConflict: 'id' }
    );
    if (error && isTableUnavailableOrSchemaError(error)) {
      markTableUnavailable('franchises');
    }
    return !error;
  } catch {
    return false;
  }
}

export async function incrementFranchiseUsage(
  franchiseId: string,
  nextBranchCount: number,
  nextRoyaltyTotal: number
): Promise<void> {
  if (unavailableTables.has('franchises')) return;
  try {
    const { error } = await supabase
      .from('franchises')
      .update({
        branch_count: nextBranchCount,
        total_royalty_earned: nextRoyaltyTotal,
      })
      .eq('id', franchiseId);
    if (error && isTableUnavailableOrSchemaError(error)) {
      markTableUnavailable('franchises');
    }
  } catch {
    // silent offline fallback
  }
}

// --- BANKS (public.banks) ---
export async function fetchAllBanks(): Promise<BankRecord[]> {
  if (unavailableTables.has('banks')) {
    return DEFAULT_SYSTEM_BANKS;
  }
  return withSafeTimeout(
    async () => {
      try {
        const { data, error } = await supabase
          .from('banks')
          .select('*')
          .limit(100);

        if (error || !data) {
          if (isTableUnavailableOrSchemaError(error)) {
            markTableUnavailable('banks');
          }
          return DEFAULT_SYSTEM_BANKS;
        }

        const remote: BankRecord[] = data.map((row: Record<string, unknown>) => ({
          id: String(row.id),
          ownerId: String(row.owner_id),
          ownerName: String(row.owner_name ?? 'Bankacı'),
          bankName: String(row.bank_name ?? 'Özel Banka'),
          brandColor: String(row.brand_color ?? '#B45309'),
          emblem: String(row.emblem ?? '🏦'),
          hqCityPlate: Number(row.hq_city_plate ?? 34),
          hqCityName: String(row.hq_city_name ?? 'İstanbul'),
          hqLat: Number(row.hq_lat ?? 41.04),
          hqLng: Number(row.hq_lng ?? 29.0),
          poolCapital: Number(row.pool_capital ?? 10_000_000),
          baseInterestRate: Number(row.base_interest_rate ?? 0.12),
          minCreditScore: Number(row.min_credit_score ?? 900),
          totalLoansIssued: Number(row.total_loans_issued ?? 0),
          totalInterestEarned: Number(row.total_interest_earned ?? 0),
          seizedAssetsCount: Number(row.seized_assets_count ?? 0),
          createdAt: row.created_at ? new Date(String(row.created_at)).getTime() : Date.now(),
        }));

        remote.sort((a, b) => b.poolCapital - a.poolCapital);
        const ids = new Set(remote.map((r) => r.id));
        return [...remote, ...DEFAULT_SYSTEM_BANKS.filter((s) => !ids.has(s.id))];
      } catch {
        return DEFAULT_SYSTEM_BANKS;
      }
    },
    5000,
    DEFAULT_SYSTEM_BANKS,
    'fetchAllBanks'
  );
}

export async function publishBankRecord(bank: BankRecord): Promise<boolean> {
  if (unavailableTables.has('banks')) return false;
  try {
    const { error } = await supabase.from('banks').upsert(
      {
        id: bank.id,
        owner_id: bank.ownerId,
        owner_name: bank.ownerName,
        bank_name: bank.bankName,
        brand_color: bank.brandColor,
        emblem: bank.emblem,
        hq_city_plate: bank.hqCityPlate,
        hq_city_name: bank.hqCityName,
        hq_lat: bank.hqLat,
        hq_lng: bank.hqLng,
        pool_capital: bank.poolCapital,
        base_interest_rate: bank.baseInterestRate,
        min_credit_score: bank.minCreditScore,
        total_loans_issued: bank.totalLoansIssued,
        total_interest_earned: bank.totalInterestEarned,
        seized_assets_count: bank.seizedAssetsCount,
      },
      { onConflict: 'id' }
    );
    if (error && isTableUnavailableOrSchemaError(error)) {
      markTableUnavailable('banks');
    }
    return !error;
  } catch {
    return false;
  }
}

// --- LOANS (public.loans) ---
export async function publishLoanRecord(loan: LoanRecord): Promise<boolean> {
  if (unavailableTables.has('loans')) return false;
  try {
    const { error } = await supabase.from('loans').upsert(
      {
        id: loan.id,
        bank_id: loan.bankId,
        bank_name: loan.bankName,
        lender_owner_id: loan.lenderOwnerId,
        borrower_id: loan.borrowerId,
        borrower_name: loan.borrowerName,
        principal: loan.principal,
        interest_rate: loan.interestRate,
        total_due: loan.totalDue,
        remaining_amount: loan.remainingAmount,
        collateral_business_id: loan.collateralBusinessId,
        collateral_business_name: loan.collateralBusinessName,
        collateral_valuation: loan.collateralValuation,
        due_at: new Date(loan.dueAt).toISOString(),
        seizure_at: new Date(loan.seizureAt).toISOString(),
        status: loan.status,
      },
      { onConflict: 'id' }
    );
    if (error && isTableUnavailableOrSchemaError(error)) {
      markTableUnavailable('loans');
    }
    return !error;
  } catch {
    return false;
  }
}

// --- PLAYER IPO LISTINGS (public.ipo_listings) ---
export async function fetchPlayerIpoListings(): Promise<StockQuote[]> {
  if (unavailableTables.has('ipo_listings')) {
    return SEED_PLAYER_IPOS;
  }
  return withSafeTimeout(
    async () => {
      try {
        const { data, error } = await supabase
          .from('ipo_listings')
          .select('*')
          .limit(50);

        if (error || !data) {
          if (isTableUnavailableOrSchemaError(error)) {
            markTableUnavailable('ipo_listings');
          }
          return SEED_PLAYER_IPOS;
        }

        const remote: StockQuote[] = data.map((row: Record<string, unknown>) => {
          const price = Number(row.price ?? 100);
          return {
            ticker: String(row.ticker),
            name: String(row.holding_name ?? 'Holding A.Ş.'),
            sector: 'Oyuncu Holdingi · Halka Arz',
            isPlayerIpo: true,
            ownerId: String(row.owner_id),
            ownerName: String(row.owner_name ?? 'Patron'),
            price,
            previousPrice: price,
            openPrice: Number(row.open_price ?? price),
            dividendYieldAnnual: 0.07,
            history: Array.from({ length: 12 }, () => price),
            marketCap: Number(row.market_cap ?? 10_000_000),
            businessCount: Number(row.business_count ?? 5),
            factoryCount: Number(row.factory_count ?? 1),
          };
        });

        remote.sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
        const tickers = new Set(remote.map((r) => r.ticker));
        return [...remote, ...SEED_PLAYER_IPOS.filter((s) => !tickers.has(s.ticker))];
      } catch {
        return SEED_PLAYER_IPOS;
      }
    },
    5000,
    SEED_PLAYER_IPOS,
    'fetchPlayerIpoListings'
  );
}

export async function publishPlayerIpoListing(quote: StockQuote): Promise<boolean> {
  if (unavailableTables.has('ipo_listings')) return false;
  try {
    const { error } = await supabase.from('ipo_listings').upsert(
      {
        ticker: quote.ticker,
        owner_id: quote.ownerId ?? '',
        owner_name: quote.ownerName ?? '',
        holding_name: quote.name,
        price: quote.price,
        open_price: quote.openPrice,
        market_cap: quote.marketCap,
        business_count: quote.businessCount ?? 0,
        factory_count: quote.factoryCount ?? 0,
      },
      { onConflict: 'ticker' }
    );
    if (error && isTableUnavailableOrSchemaError(error)) {
      unavailableTables.add('ipo_listings');
    }
    return !error;
  } catch {
    return false;
  }
}

// --- PATRON CHAT (Realtime Broadcast + public.patron_chat) ---
export function subscribePatronChat(
  channelKey: string,
  onMessage: (msg: ChatMessage) => void
): {
  send: (msg: ChatMessage) => Promise<void>;
  unsubscribe: () => void;
} {
  let channel: RealtimeChannel | null = null;

  try {
    channel = supabase
      .channel(`patron-chat-${channelKey}`)
      .on('broadcast', { event: 'chat-msg' }, (payload) => {
        const msg = payload?.payload as ChatMessage | undefined;
        if (msg?.id && msg?.text) {
          onMessage(msg);
        }
      })
      .subscribe();
  } catch {
    channel = null;
  }

  return {
    send: async (msg: ChatMessage) => {
      try {
        if (channel) {
          await channel.send({
            type: 'broadcast',
            event: 'chat-msg',
            payload: msg,
          });
        }
        if (!unavailableTables.has('patron_chat')) {
          const { error } = await supabase.from('patron_chat').insert({
            id: msg.id,
            channel: msg.channel,
            sender_id: msg.senderId,
            sender_name: msg.senderName,
            sender_badge: msg.senderBadge,
            message: msg.text,
          });
          if (error && isTableUnavailableOrSchemaError(error)) {
            unavailableTables.add('patron_chat');
          }
        }
      } catch {
        // local echo already shown
      }
    },
    unsubscribe: () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    },
  };
}
