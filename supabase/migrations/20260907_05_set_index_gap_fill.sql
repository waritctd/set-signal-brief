-- Yahoo's ^SET.BK index series has holes. TDEX (SET50 ETF) is complete, so missing SET sessions are
-- spliced from TDEX daily returns and flagged source = 'proxy:TDEX'. Real bars replace proxies on later fetches.
insert into public.instruments(symbol, yahoo_symbol, kind, in_set50, in_set100, active)
values ('TDEX', 'TDEX.BK', 'index', false, false, true) on conflict (symbol) do nothing;

alter table public.daily_prices add column if not exists source text not null default 'yahoo';

create or replace function public.fill_set_index_gaps()
returns int language plpgsql security definer set search_path = public as $$
declare
  r record; v_prev_set numeric; v_prev_tdex numeric; v_filled int := 0;
begin
  v_prev_set := null; v_prev_tdex := null;
  for r in
    select t.trade_date, t.close as tdex_close, s.close as set_close, s.source
    from public.daily_prices t
    left join public.daily_prices s on s.symbol = 'SET' and s.trade_date = t.trade_date
    where t.symbol = 'TDEX' order by t.trade_date
  loop
    if r.set_close is not null and r.source = 'yahoo' then
      v_prev_set := r.set_close;
    elsif v_prev_set is not null and v_prev_tdex is not null and v_prev_tdex > 0 then
      v_prev_set := round(v_prev_set * (r.tdex_close / v_prev_tdex), 2);
      if r.set_close is null then
        insert into public.daily_prices(symbol, trade_date, close, adj_close, source)
        values ('SET', r.trade_date, v_prev_set, v_prev_set, 'proxy:TDEX');
        v_filled := v_filled + 1;
      elsif r.source like 'proxy:%' then
        update public.daily_prices set close = v_prev_set, adj_close = v_prev_set where symbol = 'SET' and trade_date = r.trade_date;
      end if;
    end if;
    v_prev_tdex := r.tdex_close;
  end loop;
  return v_filled;
end $$;
revoke all on function public.fill_set_index_gaps() from public, anon, authenticated;

-- 15 minutes after the daily fetch
select cron.schedule('fill-set-index-gaps', '45 11 * * 1-5', $$select public.fill_set_index_gaps();$$);

create or replace view public.v_data_health as
  select (select max(trade_date) from public.daily_prices) as latest_trade_date,
         (select count(distinct symbol) from public.daily_prices where trade_date = (select max(trade_date) from public.daily_prices)) as symbols_on_latest_date,
         (select finished_at from public.fetch_runs order by id desc limit 1) as last_fetch_finished,
         (select symbols_fail from public.fetch_runs order by id desc limit 1) as last_fetch_failures,
         (select count(*) from public.daily_prices where symbol = 'SET' and source like 'proxy:%') as set_proxy_rows;
