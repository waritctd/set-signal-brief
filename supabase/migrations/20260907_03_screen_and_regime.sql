-- Technical metrics per symbol for a trade date (defaults to the latest). RSI14 is the simple-average variant.
create or replace function public.screen(p_date date default null)
returns table (
  symbol text, in_set50 boolean, trade_date date, close numeric,
  chg_1d_pct numeric, ret_5d_pct numeric, ret_20d_pct numeric, ret_60d_pct numeric,
  sma20 numeric, sma50 numeric, sma200 numeric, rsi14 numeric, atr14 numeric, vol_ratio_20 numeric,
  high_52w numeric, low_52w numeric, pct_from_52w_high numeric, breakout_20d boolean, above_sma200 boolean,
  support numeric, resistance numeric, score numeric
) language sql stable as $$
with d as (select coalesce(p_date, (select max(trade_date) from public.daily_prices)) as dt),
px as (
  select p.symbol, p.trade_date, p.close, p.high, p.low, p.volume, lag(p.close) over w as prev_close,
         row_number() over (partition by p.symbol order by p.trade_date desc) as rn
  from public.daily_prices p
  join public.instruments i on i.symbol = p.symbol and i.kind = 'stock' and i.active
  cross join d where p.trade_date <= d.dt and p.trade_date > d.dt - interval '400 days'
  window w as (partition by p.symbol order by p.trade_date)
),
calc as (
  select *, greatest(high - low, abs(high - prev_close), abs(low - prev_close)) as tr,
         greatest(close - prev_close, 0) as gain, greatest(prev_close - close, 0) as loss from px
),
agg as (
  select symbol,
    max(close) filter (where rn = 1) as close, max(trade_date) filter (where rn = 1) as trade_date,
    max(prev_close) filter (where rn = 1) as prev_close,
    max(close) filter (where rn = 6) as close_5, max(close) filter (where rn = 21) as close_20, max(close) filter (where rn = 61) as close_60,
    avg(close) filter (where rn <= 20) as sma20, avg(close) filter (where rn <= 50) as sma50, avg(close) filter (where rn <= 200) as sma200,
    avg(gain) filter (where rn <= 14) as avg_gain, avg(loss) filter (where rn <= 14) as avg_loss, avg(tr) filter (where rn <= 14) as atr14,
    max(volume) filter (where rn = 1) as vol_today, avg(volume) filter (where rn between 2 and 21) as vol_avg20,
    max(high) filter (where rn between 2 and 21) as high_20_prior,
    max(high) filter (where rn <= 250) as high_52w, min(low) filter (where rn <= 250) as low_52w,
    min(low) filter (where rn <= 20) as low_20, max(high) filter (where rn <= 20) as high_20, count(*) as bars
  from calc group by symbol
),
m as (
  select a.*, i.in_set50,
    round(100*(a.close/nullif(a.prev_close,0)-1),2) as chg_1d_pct,
    round(100*(a.close/nullif(a.close_5,0)-1),2) as ret_5d_pct,
    round(100*(a.close/nullif(a.close_20,0)-1),2) as ret_20d_pct,
    round(100*(a.close/nullif(a.close_60,0)-1),2) as ret_60d_pct,
    case when a.avg_loss = 0 then 100 else round(100 - 100/(1 + a.avg_gain/nullif(a.avg_loss,0)),1) end as rsi14,
    round(a.vol_today/nullif(a.vol_avg20,0),2) as vol_ratio_20,
    round(100*(a.close/nullif(a.high_52w,0)-1),2) as pct_from_52w_high,
    (a.close > a.high_20_prior) as breakout_20d, (a.close > a.sma200) as above_sma200
  from agg a join public.instruments i on i.symbol = a.symbol where a.bars >= 60
)
select symbol, in_set50, trade_date, close, chg_1d_pct, ret_5d_pct, ret_20d_pct, ret_60d_pct,
  round(sma20,2), round(sma50,2), round(sma200,2), rsi14, round(atr14,2), vol_ratio_20,
  high_52w, low_52w, pct_from_52w_high, breakout_20d, above_sma200, low_20 as support, high_20 as resistance,
  -- Composite 0-100: trend 40 + momentum 30 + volume confirmation 15 + RSI-not-hot 15
  round((case when close > sma20 then 10 else 0 end + case when sma20 > sma50 then 10 else 0 end
       + case when close > sma50 then 10 else 0 end + case when close > sma200 then 10 else 0 end)
    + least(greatest(coalesce(ret_20d_pct,0),-15),15) + least(greatest(coalesce(ret_60d_pct,0)/2,-7.5),7.5) + 7.5
    + least(greatest((coalesce(vol_ratio_20,1)-1)*10,0),15)
    + case when rsi14 between 45 and 70 then 15 when rsi14 between 70 and 78 then 8 when rsi14 between 35 and 45 then 8 else 0 end, 1) as score
from m order by score desc, ret_20d_pct desc;
$$;

create or replace function public.market_regime(p_date date default null)
returns table (trade_date date, set_close numeric, set_chg_1d_pct numeric, set_ret_20d_pct numeric,
               set_above_sma50 boolean, set_above_sma200 boolean, breadth_above_sma50_pct numeric, breadth_above_sma200_pct numeric,
               advancers int, decliners int, regime text)
language sql stable as $$
with d as (select coalesce(p_date, (select max(trade_date) from public.daily_prices)) as dt),
idx as (
  select p.trade_date, p.close, lag(p.close) over (order by p.trade_date) as prev_close, lag(p.close, 20) over (order by p.trade_date) as close_20,
         avg(p.close) over (order by p.trade_date rows between 49 preceding and current row) as sma50,
         avg(p.close) over (order by p.trade_date rows between 199 preceding and current row) as sma200
  from public.daily_prices p cross join d where p.symbol = 'SET' and p.trade_date <= d.dt
),
last_idx as (select * from idx order by trade_date desc limit 1),
s as (select * from public.screen((select dt from d)))
select li.trade_date, li.close, round(100*(li.close/li.prev_close-1),2), round(100*(li.close/li.close_20-1),2),
  li.close > li.sma50, li.close > li.sma200,
  round(100.0*count(*) filter (where s.close > s.sma50)/count(*),1), round(100.0*count(*) filter (where s.above_sma200)/count(*),1),
  count(*) filter (where s.chg_1d_pct > 0)::int, count(*) filter (where s.chg_1d_pct < 0)::int,
  case when li.close > li.sma50 and li.close > li.sma200 and count(*) filter (where s.above_sma200) > count(*)/2 then 'risk-on'
       when li.close < li.sma50 and li.close < li.sma200 and count(*) filter (where s.above_sma200) < count(*)/2 then 'risk-off'
       else 'mixed' end
from last_idx li, s group by li.trade_date, li.close, li.prev_close, li.close_20, li.sma50, li.sma200;
$$;

create or replace view public.v_latest_screen as select * from public.screen();
create or replace view public.v_latest_regime as select * from public.market_regime();
create or replace view public.v_data_health as
  select (select max(trade_date) from public.daily_prices) as latest_trade_date,
         (select count(distinct symbol) from public.daily_prices where trade_date = (select max(trade_date) from public.daily_prices)) as symbols_on_latest_date,
         (select finished_at from public.fetch_runs order by id desc limit 1) as last_fetch_finished,
         (select symbols_fail from public.fetch_runs order by id desc limit 1) as last_fetch_failures;
