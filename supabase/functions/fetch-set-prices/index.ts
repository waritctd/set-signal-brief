// fetch-set-prices: pulls daily OHLCV for every active instrument from Yahoo Finance's
// public chart endpoint and upserts into public.daily_prices.
// Query params: ?range=5d|1mo|3mo|1y|2y (default 1mo)  &symbols=PTT,AOT (optional subset)
// Scheduled from Postgres via pg_cron -> public.trigger_price_fetch() (see migrations).
import { createClient } from "npm:@supabase/supabase-js@2";

const BKK_OFFSET = 7 * 3600;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

type Row = { symbol: string; trade_date: string; open: number|null; high: number|null; low: number|null; close: number|null; adj_close: number|null; volume: number|null };

async function fetchYahoo(yahooSymbol: string, range: string): Promise<{ rows: Omit<Row,'symbol'>[]; error?: string }> {
  const hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
  let lastErr = "";
  for (const host of hosts) {
    const url = `https://${host}/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=1d&events=div%2Csplits`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
      if (!res.ok) { lastErr = `HTTP ${res.status}`; continue; }
      const j = await res.json();
      const r = j?.chart?.result?.[0];
      if (!r) { lastErr = j?.chart?.error?.description ?? "no result"; continue; }
      const ts: number[] = r.timestamp ?? [];
      const q = r.indicators?.quote?.[0] ?? {};
      const adj = r.indicators?.adjclose?.[0]?.adjclose ?? [];
      const rows: Omit<Row,'symbol'>[] = [];
      for (let i = 0; i < ts.length; i++) {
        if (q.close?.[i] == null) continue; // holiday / missing bar
        const d = new Date((ts[i] + BKK_OFFSET) * 1000).toISOString().slice(0, 10);
        rows.push({ trade_date: d, open: q.open?.[i] ?? null, high: q.high?.[i] ?? null, low: q.low?.[i] ?? null,
                    close: q.close[i], adj_close: adj?.[i] ?? q.close[i], volume: q.volume?.[i] ?? null });
      }
      return { rows };
    } catch (e) { lastErr = String(e); }
  }
  return { rows: [], error: lastErr };
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const range = url.searchParams.get("range") ?? "1mo";
  const subset = url.searchParams.get("symbols")?.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: run } = await sb.from("fetch_runs").insert({ range_used: range }).select("id").single();

  let q = sb.from("instruments").select("symbol,yahoo_symbol").eq("active", true);
  if (subset?.length) q = q.in("symbol", subset);
  const { data: instruments, error: instErr } = await q;
  if (instErr) return new Response(JSON.stringify({ error: instErr.message }), { status: 500 });

  let ok = 0, fail = 0, upserted = 0;
  const errors: { symbol: string; error: string }[] = [];
  const CONCURRENCY = 4;
  const queue = [...(instruments ?? [])];

  async function worker() {
    while (queue.length) {
      const inst = queue.shift()!;
      const { rows, error } = await fetchYahoo(inst.yahoo_symbol, range);
      if (error || rows.length === 0) { fail++; errors.push({ symbol: inst.symbol, error: error ?? "no rows" }); continue; }
      const payload: Row[] = rows.map(r => ({ symbol: inst.symbol, ...r }));
      for (let i = 0; i < payload.length; i += 500) {
        const { error: upErr } = await sb.from("daily_prices").upsert(payload.slice(i, i + 500), { onConflict: "symbol,trade_date" });
        if (upErr) { errors.push({ symbol: inst.symbol, error: upErr.message }); }
        else upserted += Math.min(500, payload.length - i);
      }
      ok++;
      await new Promise(r => setTimeout(r, 150)); // be polite to Yahoo
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (run?.id) {
    await sb.from("fetch_runs").update({ finished_at: new Date().toISOString(), symbols_ok: ok, symbols_fail: fail, rows_upserted: upserted, errors }).eq("id", run.id);
  }
  return new Response(JSON.stringify({ run_id: run?.id, range, symbols_ok: ok, symbols_fail: fail, rows_upserted: upserted, errors }), {
    headers: { "Content-Type": "application/json", "Connection": "keep-alive" },
  });
});
