-- Türkiye Mülk İmparatoru v1.3.1 — Tam Supabase Çok Oyunculu Şema
-- Tablolar: public.businesses, public.franchises, public.banks, public.loans, public.ipo_listings, public.patron_chat

-- 1. 81 İl Canlı Harita İşletmeleri
create table if not exists public.businesses (
  id text primary key,
  owner_id text not null,
  owner_name text not null,
  city_plate integer not null check (city_plate >= 1 and city_plate <= 81),
  city_name text not null,
  district text not null default '',
  business_name text not null,
  business_type text not null,
  lat double precision not null,
  lng double precision not null,
  level integer not null default 1,
  hourly_income numeric not null default 3600,
  valuation numeric not null default 60000,
  created_at timestamptz not null default now()
);

create index if not exists idx_businesses_city_plate on public.businesses (city_plate);
create index if not exists idx_businesses_owner_id on public.businesses (owner_id);
create index if not exists idx_businesses_created_at on public.businesses (created_at desc);

-- Realtime DELETE olaylarının `old.id` bilgisini eksiksiz yayınlaması için
alter table public.businesses replica identity full;

-- 2. Çok Oyunculu Franchise (Bayilik) Markaları
create table if not exists public.franchises (
  id text primary key,
  owner_id text not null,
  owner_name text not null,
  brand_name text not null,
  business_type text not null,
  license_fee numeric not null default 35000,
  royalty_rate numeric not null default 0.15 check (royalty_rate >= 0.10 and royalty_rate <= 0.25),
  branch_count integer not null default 0,
  total_royalty_earned numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_franchises_owner on public.franchises (owner_id);

-- 3. Oyuncu Kontrollü Bankalar
create table if not exists public.banks (
  id text primary key,
  owner_id text not null,
  owner_name text not null,
  bank_name text not null,
  brand_color text not null default '#B45309',
  emblem text not null default '🏦',
  hq_city_plate integer not null default 34,
  hq_city_name text not null default 'İstanbul',
  hq_lat double precision not null default 41.0422,
  hq_lng double precision not null default 29.0067,
  pool_capital numeric not null default 10000000,
  base_interest_rate numeric not null default 0.12 check (base_interest_rate >= 0.05 and base_interest_rate <= 0.30),
  min_credit_score integer not null default 900,
  total_loans_issued integer not null default 0,
  total_interest_earned numeric not null default 0,
  seized_assets_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_banks_owner on public.banks (owner_id);

-- 4. Teminatlı Krediler ve Otomatik Haciz Kayıtları
create table if not exists public.loans (
  id text primary key,
  bank_id text not null,
  bank_name text not null,
  lender_owner_id text not null,
  borrower_id text not null,
  borrower_name text not null,
  principal numeric not null,
  interest_rate numeric not null,
  total_due numeric not null,
  remaining_amount numeric not null,
  collateral_business_id text not null,
  collateral_business_name text not null,
  collateral_valuation numeric not null default 0,
  due_at timestamptz not null,
  seizure_at timestamptz not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists idx_loans_borrower on public.loans (borrower_id);
create index if not exists idx_loans_lender on public.loans (lender_owner_id);

-- 5. Oyuncu Holdingleri Halka Arz (IPO) Tahtası
create table if not exists public.ipo_listings (
  ticker text primary key,
  owner_id text not null,
  owner_name text not null,
  holding_name text not null,
  price numeric not null default 100,
  open_price numeric not null default 100,
  market_cap numeric not null default 10000000,
  business_count integer not null default 5,
  factory_count integer not null default 1,
  created_at timestamptz not null default now()
);

-- 6. Patron Sohbeti (Şehir İçi & Türkiye Geneli)
create table if not exists public.patron_chat (
  id text primary key,
  channel text not null,
  sender_id text not null,
  sender_name text not null,
  sender_badge text not null default 'Patron',
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_patron_chat_channel on public.patron_chat (channel, created_at desc);

-- RLS Politikaları
alter table public.businesses enable row level security;
alter table public.franchises enable row level security;
alter table public.banks enable row level security;
alter table public.loans enable row level security;
alter table public.ipo_listings enable row level security;
alter table public.patron_chat enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['businesses', 'franchises', 'banks', 'loans', 'ipo_listings', 'patron_chat'] loop
    execute format('drop policy if exists "Public read %I" on public.%I', tbl, tbl);
    execute format('create policy "Public read %I" on public.%I for select using (true)', tbl, tbl);
    execute format('drop policy if exists "Public insert %I" on public.%I', tbl, tbl);
    execute format('create policy "Public insert %I" on public.%I for insert with check (true)', tbl, tbl);
    execute format('drop policy if exists "Public update %I" on public.%I', tbl, tbl);
    execute format('create policy "Public update %I" on public.%I for update using (true) with check (true)', tbl, tbl);
    execute format('drop policy if exists "Public delete %I" on public.%I', tbl, tbl);
    execute format('create policy "Public delete %I" on public.%I for delete using (true)', tbl, tbl);
  end loop;
end $$;

-- Realtime Yayınları
alter publication supabase_realtime add table public.businesses;
alter publication supabase_realtime add table public.franchises;
alter publication supabase_realtime add table public.banks;
alter publication supabase_realtime add table public.loans;
alter publication supabase_realtime add table public.ipo_listings;
alter publication supabase_realtime add table public.patron_chat;
