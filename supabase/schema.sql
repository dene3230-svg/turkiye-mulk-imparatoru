-- Türkiye Mülk İmparatoru — 81 İl Canlı Oda (public.businesses) Tablosu
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

alter table public.businesses enable row level security;

-- Herkes canlı haritadaki işletmeleri okuyabilir
drop policy if exists "Public read businesses" on public.businesses;
create policy "Public read businesses"
  on public.businesses for select
  using (true);

-- Oyuncular yeni işletme ekleyebilir, güncelleyebilir (devralma/seviye) ve silebilir
drop policy if exists "Public insert businesses" on public.businesses;
create policy "Public insert businesses"
  on public.businesses for insert
  with check (true);

drop policy if exists "Public update businesses" on public.businesses;
create policy "Public update businesses"
  on public.businesses for update
  using (true)
  with check (true);

drop policy if exists "Public delete businesses" on public.businesses;
create policy "Public delete businesses"
  on public.businesses for delete
  using (true);

-- Realtime yayınını etkinleştir
alter publication supabase_realtime add table public.businesses;
