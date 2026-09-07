-- Core tables for the SET100 quant pipeline
create table if not exists public.instruments (
  symbol        text primary key,
  yahoo_symbol  text not null unique,
  name          text,
  kind          text not null default 'stock' check (kind in ('stock','index')),
  in_set50      boolean not null default false,
  in_set100     boolean not null default false,
  active        boolean not null default true,
  added_at      timestamptz not null default now()
);
create table if not exists public.daily_prices (
  symbol      text not null references public.instruments(symbol) on delete cascade,
  trade_date  date not null,
  open numeric(14,4), high numeric(14,4), low numeric(14,4), close numeric(14,4), adj_close numeric(14,4),
  volume      bigint,
  fetched_at  timestamptz not null default now(),
  primary key (symbol, trade_date)
);
create index if not exists daily_prices_date_idx on public.daily_prices(trade_date desc);
create table if not exists public.fetch_runs (
  id bigserial primary key, started_at timestamptz not null default now(), finished_at timestamptz,
  range_used text, symbols_ok int default 0, symbols_fail int default 0, rows_upserted int default 0, errors jsonb default '[]'::jsonb
);
create table if not exists public.briefs (
  trade_date date primary key, regime text, market_summary text, top_setups jsonb, notion_url text,
  created_at timestamptz not null default now()
);
alter table public.instruments  enable row level security;
alter table public.daily_prices enable row level security;
alter table public.fetch_runs   enable row level security;
alter table public.briefs       enable row level security;
create policy "public read instruments" on public.instruments  for select using (true);
create policy "public read prices"      on public.daily_prices for select using (true);
create policy "public read briefs"      on public.briefs       for select using (true);

-- SET100 constituents, H2 2026 (source: SET, SET50_SET100_H2_2026_revise.pdf). Update each January/July.
with set50(s) as (values ('ADVANC'),('AOT'),('AWC'),('BANPU'),('BBL'),('BCP'),('BDMS'),('BEM'),('BH'),('BJC'),('CCET'),('COM7'),('CPALL'),('CPF'),('CPN'),('CRC'),('DELTA'),('EGCO'),('GPSC'),('GULF'),('HMPRO'),('IVL'),('KBANK'),('KKP'),('KTB'),('KTC'),('LH'),('MINT'),('MRDIYT'),('MTC'),('OR'),('OSP'),('PTT'),('PTTEP'),('PTTGC'),('RATCH'),('SCB'),('SCC'),('SCGP'),('TCAP'),('TFG'),('THAI'),('TIDLOR'),('TISCO'),('TLI'),('TOP'),('TRUE'),('TTB'),('TU'),('WHA')),
rest(s) as (values ('AAV'),('AEONTS'),('AMATA'),('AP'),('AURA'),('BA'),('BAM'),('BCH'),('BCPG'),('BGRIM'),('BLA'),('BTG'),('BTS'),('CBG'),('CENTEL'),('CHG'),('CK'),('DOHOME'),('EA'),('ERW'),('GFPT'),('GLOBAL'),('GUNKUL'),('HANA'),('ICHI'),('IRPC'),('JMART'),('JMT'),('KCE'),('M'),('MEGA'),('MOSHI'),('PLANB'),('PR9'),('PRM'),('PTG'),('QH'),('RCL'),('SAWAD'),('SIRI'),('SPALI'),('SPRC'),('STA'),('STECON'),('STGT'),('TASCO'),('THCOM'),('TOA'),('VGI'),('WHAUP'))
insert into public.instruments(symbol, yahoo_symbol, kind, in_set50, in_set100)
select s, s||'.BK', 'stock', true, true from set50
union all select s, s||'.BK', 'stock', false, true from rest
union all select 'SET', '^SET.BK', 'index', false, false
on conflict (symbol) do nothing;
