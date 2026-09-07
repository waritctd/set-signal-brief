// landing — public API for the SET Signal Brief site (the site itself is static, see /src).
//   GET  /landing               -> 302 to app_config.site_url when set, else a JSON pointer
//   GET  /landing/api/summary   -> live pipeline data (JSON, CORS-enabled)
//   POST /landing/subscribe     -> waitlist signup {email, name?, plan?} -> public.subscribers
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};
const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { ...init, headers: { "Content-Type": "application/json; charset=utf-8", ...CORS, ...(init.headers ?? {}) } });

const toNum = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v]));

async function summary() {
  const [regime, top, series, score, subs] = await Promise.all([
    sb.from("v_latest_regime").select("*").maybeSingle(),
    sb.from("v_latest_screen").select("symbol,close,chg_1d_pct,ret_20d_pct,rsi14,vol_ratio_20,score,breakout_20d").limit(5),
    sb.from("daily_prices").select("trade_date,close").eq("symbol", "SET").order("trade_date", { ascending: false }).limit(30),
    sb.from("v_scorecard_summary").select("*").maybeSingle(),
    sb.from("subscribers").select("email", { count: "exact", head: true }),
  ]);
  return {
    regime: regime.data ? toNum(regime.data) : null,
    top: (top.data ?? []).map(toNum),
    set_series: (series.data ?? []).reverse().map((r) => ({ d: r.trade_date, c: Number(r.close) })),
    score: score.data && score.data.calls != null ? toNum(score.data) : null,
    subscribers: subs.count ?? 0,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const path = new URL(req.url).pathname.replace(/\/$/, "");

  if (req.method === "GET" && path.endsWith("/api/summary")) {
    try { return json(await summary(), { headers: { "Cache-Control": "public, max-age=120" } }); }
    catch (e) { return json({ error: String(e) }, { status: 500 }); }
  }

  if (req.method === "POST" && path.endsWith("/subscribe")) {
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* empty body */ }
    if (String(body.website ?? "")) return json({ ok: true }); // honeypot hit: pretend success
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) return json({ ok: false, error: "อีเมลไม่ถูกต้อง" }, { status: 400 });
    const plan = body.plan === "free" ? "free" : "pro";
    const name = String(body.name ?? "").trim().slice(0, 80) || null;
    const { data: existing } = await sb.from("subscribers").select("email").eq("email", email).maybeSingle();
    if (existing) return json({ ok: true, already: true });
    const { error } = await sb.from("subscribers").insert({ email, name, plan, source: "landing" });
    if (error) return json({ ok: false, error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" }, { status: 500 });
    return json({ ok: true });
  }

  if (req.method === "GET") {
    // The front end is a static site (GitHub Pages / Vercel). Redirect there when configured.
    const { data } = await sb.from("app_config").select("value").eq("key", "site_url").maybeSingle();
    if (data?.value) return Response.redirect(data.value, 302);
    return json({ service: "set-signal-brief", endpoints: ["GET /api/summary", "POST /subscribe"] });
  }
  return new Response("Method not allowed", { status: 405 });
});
