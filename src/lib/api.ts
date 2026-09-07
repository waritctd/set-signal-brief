// API client. When the bundle is served by the Supabase Edge Function ("/functions/v1/landing"),
// the API lives under the same path. When deployed elsewhere (Vercel, Netlify, GitHub Pages),
// point VITE_API_BASE at the function URL, e.g. https://<ref>.supabase.co/functions/v1/landing
export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ??
  window.location.pathname.replace(/\/$/, "");

export type Regime = "risk-on" | "mixed" | "risk-off";

export interface Summary {
  regime: {
    trade_date: string;
    set_close: number;
    set_chg_1d_pct: number;
    set_ret_20d_pct: number;
    breadth_above_sma50_pct: number;
    breadth_above_sma200_pct: number;
    advancers: number;
    decliners: number;
    regime: Regime;
  } | null;
  top: { symbol: string; close: number; chg_1d_pct: number; ret_20d_pct: number; rsi14: number; vol_ratio_20: number; score: number; breakout_20d: boolean }[];
  set_series: { d: string; c: number }[];
  score: { briefs_scored: number; calls: number; avg_call_5d_pct: number; avg_set_5d_pct: number; beat_set_5d_pct: number } | null;
  subscribers: number;
}

export async function fetchSummary(): Promise<Summary> {
  const r = await fetch(`${API_BASE}/api/summary`, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`summary ${r.status}`);
  return r.json();
}

export async function subscribe(input: { email: string; name?: string; plan: "free" | "pro"; website?: string }) {
  const r = await fetch(`${API_BASE}/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; already?: boolean; error?: string };
  if (!r.ok || !j.ok) throw new Error(j.error ?? "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
  return j;
}

export const thDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00+07:00");
  const m = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."][d.getUTCMonth()];
  return `${d.getUTCDate()} ${m} ${d.getUTCFullYear() + 543}`;
};
export const pct = (n: number | null | undefined, digits = 2) =>
  n == null ? "–" : `${n > 0 ? "+" : ""}${Number(n).toFixed(digits)}%`;
export const num = (n: number, digits = 2) => Number(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
