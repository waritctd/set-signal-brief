create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_cron;

create table if not exists public.app_config (key text primary key, value text not null);
alter table public.app_config enable row level security; -- service role only
-- Required rows (fill in for your project):
--   ('functions_url', 'https://<ref>.supabase.co/functions/v1')
--   ('anon_key',      '<legacy anon JWT — lets pg_net call the JWT-protected fetch function>')
--   ('site_url',      'https://<your-pages-or-vercel-domain>')   -- optional: GET /landing redirects here

create or replace function public.trigger_price_fetch(p_range text default '1mo', p_symbols text default null)
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare v_url text; v_key text; v_id bigint;
begin
  select value into v_url from public.app_config where key = 'functions_url';
  select value into v_key from public.app_config where key = 'anon_key';
  v_url := v_url || '/fetch-set-prices?range=' || p_range || case when p_symbols is not null then '&symbols=' || p_symbols else '' end;
  select net.http_get(url := v_url, headers := jsonb_build_object('Authorization', 'Bearer ' || v_key), timeout_milliseconds := 300000) into v_id;
  return v_id;
end $$;
revoke all on function public.trigger_price_fetch(text, text) from public, anon, authenticated;

-- Weekdays 18:30 Bangkok (11:30 UTC) refresh last 5 sessions; Saturdays 09:00 Bangkok 3-month refresh for adjustments
select cron.schedule('fetch-set-prices-daily',  '30 11 * * 1-5', $$select public.trigger_price_fetch('5d');$$);
select cron.schedule('fetch-set-prices-weekly', '0 2 * * 6',     $$select public.trigger_price_fetch('3mo');$$);
