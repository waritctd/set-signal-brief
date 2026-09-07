create table if not exists public.subscribers (
  email text primary key, name text, plan text not null default 'free' check (plan in ('free','pro')),
  source text default 'landing', confirmed boolean not null default false, created_at timestamptz not null default now()
);
alter table public.subscribers enable row level security; -- service role only

-- Forward returns of each brief's top setups vs the SET index (1 and 5 sessions)
create or replace function public.scorecard()
returns table (trade_date date, regime text, symbol text, entry_close numeric, fwd_1d_pct numeric, fwd_5d_pct numeric, set_fwd_1d_pct numeric, set_fwd_5d_pct numeric)
language sql stable as $$
with b as (select trade_date, regime, jsonb_array_elements_text(top_setups) as symbol from public.briefs),
px as (select symbol, trade_date, close, lead(close,1) over (partition by symbol order by trade_date) as c1,
              lead(close,5) over (partition by symbol order by trade_date) as c5 from public.daily_prices)
select b.trade_date, b.regime, b.symbol, p.close, round(100*(p.c1/p.close-1),2), round(100*(p.c5/p.close-1),2),
       round(100*(s.c1/s.close-1),2), round(100*(s.c5/s.close-1),2)
from b join px p on p.symbol = b.symbol and p.trade_date = b.trade_date
       join px s on s.symbol = 'SET' and s.trade_date = b.trade_date
where p.c1 is not null order by b.trade_date desc, b.symbol;
$$;

create or replace view public.v_scorecard_summary as
select count(distinct trade_date) as briefs_scored, count(*) as calls, round(avg(fwd_5d_pct),2) as avg_call_5d_pct,
       round(avg(set_fwd_5d_pct),2) as avg_set_5d_pct,
       round(100.0*count(*) filter (where fwd_5d_pct > set_fwd_5d_pct)/nullif(count(*) filter (where fwd_5d_pct is not null),0),1) as beat_set_5d_pct
from public.scorecard() where fwd_5d_pct is not null;
