import { Lock } from "lucide-react";
import type { Summary } from "../lib/api";
import { thDate, pct, num } from "../lib/api";

const REGIME_LABEL: Record<string, { th: string; cls: string; dot: string }> = {
  "risk-on": { th: "Risk-on · แนวโน้มขาขึ้น", cls: "text-up dark:text-up-dark", dot: "bg-up dark:bg-up-dark" },
  mixed: { th: "Mixed · ไม่ชัดเจน", cls: "text-amber dark:text-amber-dark", dot: "bg-amber dark:bg-amber-dark" },
  "risk-off": { th: "Risk-off · ระวังตัว", cls: "text-down dark:text-down-dark", dot: "bg-down dark:bg-down-dark" },
};

function Sparkline({ series }: { series: { d: string; c: number }[] }) {
  if (series.length < 2) return null;
  const w = 220, h = 48, pad = 3;
  const vals = series.map((p) => p.c);
  const min = Math.min(...vals), max = Math.max(...vals);
  const x = (i: number) => pad + (i / (series.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const path = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = vals[vals.length - 1];
  const upTrend = last >= vals[0];
  const stroke = upTrend ? "stroke-up dark:stroke-up-dark" : "stroke-down dark:stroke-down-dark";
  const fill = upTrend ? "fill-up/10 dark:fill-up-dark/10" : "fill-down/10 dark:fill-down-dark/10";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full" role="img" aria-label={`SET ${series.length} วันล่าสุด`}>
      <path d={`${path} L${x(vals.length - 1).toFixed(1)},${h} L${x(0)},${h} Z`} className={fill} stroke="none" />
      <path d={path} className={stroke} strokeWidth="1.75" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(vals.length - 1)} cy={y(last)} r="2.5" className={upTrend ? "fill-up dark:fill-up-dark" : "fill-down dark:fill-down-dark"} />
    </svg>
  );
}

function Breadth({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px] text-muted dark:text-muted-dark">
        <span>{label}</span>
        <span className="font-mono tnum text-ink dark:text-ink-dark">{value}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line dark:bg-line-dark">
        <div className="h-full rounded-full bg-teal dark:bg-teal-dark transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export function LiveCardSkeleton() {
  return (
    <div className="card animate-pulse p-5" aria-busy="true">
      <div className="h-3 w-40 rounded bg-line dark:bg-line-dark" />
      <div className="mt-4 h-7 w-56 rounded bg-line dark:bg-line-dark" />
      <div className="mt-4 h-12 w-full rounded bg-line dark:bg-line-dark" />
      <div className="mt-4 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-5 w-full rounded bg-line dark:bg-line-dark" />)}</div>
    </div>
  );
}

export default function LiveCard({ data }: { data: Summary }) {
  const r = data.regime;
  const rl = REGIME_LABEL[r?.regime ?? "mixed"];
  return (
    <div className="card p-5 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2 text-[12.5px] text-muted dark:text-muted-dark">
        <span className={`inline-block h-2 w-2 rounded-full ${rl.dot}`} />
        ข้อมูลล่าสุด: ปิดตลาด {r ? thDate(r.trade_date) : "–"}
      </div>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className={`text-[24px] font-bold leading-tight ${rl.cls}`}>{rl.th}</span>
        <span className="font-mono tnum text-[15px]">
          SET {r ? num(r.set_close) : "–"}{" "}
          <span className={r && r.set_chg_1d_pct >= 0 ? "text-up dark:text-up-dark" : "text-down dark:text-down-dark"}>{r ? pct(r.set_chg_1d_pct) : ""}</span>
        </span>
      </div>

      <div className="mt-3"><Sparkline series={data.set_series} /></div>

      <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3">
        <Breadth label="หุ้นเหนือ SMA200" value={r?.breadth_above_sma200_pct ?? 0} />
        <Breadth label="หุ้นเหนือ SMA50" value={r?.breadth_above_sma50_pct ?? 0} />
        <div>
          <div className="text-[12px] text-muted dark:text-muted-dark">ขึ้น / ลง</div>
          <div className="font-mono tnum text-[18px] leading-tight">
            <span className="text-up dark:text-up-dark">{r?.advancers ?? "–"}</span>
            <span className="text-muted dark:text-muted-dark"> / </span>
            <span className="text-down dark:text-down-dark">{r?.decliners ?? "–"}</span>
          </div>
        </div>
      </div>

      <div className="eyebrow mt-5">Top 5 setups วันนี้</div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-muted dark:text-muted-dark">
              <th className="py-1.5 pr-2 font-semibold">#</th>
              <th className="py-1.5 pr-2 font-semibold">หุ้น</th>
              <th className="py-1.5 pr-2 font-semibold">ปิด</th>
              <th className="py-1.5 pr-2 font-semibold">วันนี้</th>
              <th className="py-1.5 pr-2 font-semibold">20 วัน</th>
              <th className="py-1.5 pr-2 font-semibold">RSI</th>
              <th className="py-1.5 pr-2 font-semibold">วอลุ่ม</th>
              <th className="py-1.5 text-right font-semibold">คะแนน</th>
            </tr>
          </thead>
          <tbody className="font-mono tnum">
            {data.top.map((s, i) => (
              <tr key={s.symbol} className="border-t border-line dark:border-line-dark">
                <td className="py-1.5 pr-2 text-muted dark:text-muted-dark">{i + 1}</td>
                <td className="py-1.5 pr-2 font-sans font-semibold">
                  {s.symbol}
                  {s.breakout_20d && <span className="ml-1.5 rounded bg-amber-soft px-1 text-[10px] font-semibold text-amber dark:bg-amber-softdark dark:text-amber-dark">BREAKOUT</span>}
                </td>
                <td className="py-1.5 pr-2">{num(s.close)}</td>
                <td className={`py-1.5 pr-2 ${s.chg_1d_pct >= 0 ? "text-up dark:text-up-dark" : "text-down dark:text-down-dark"}`}>{pct(s.chg_1d_pct)}</td>
                <td className="py-1.5 pr-2">{pct(s.ret_20d_pct, 1)}</td>
                <td className="py-1.5 pr-2">{Math.round(s.rsi14)}</td>
                <td className="py-1.5 pr-2">{Number(s.vol_ratio_20).toFixed(2)}×</td>
                <td className="py-1.5 text-right font-medium text-teal dark:text-teal-dark">{Number(s.score).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-md border border-dashed border-line px-3 py-2.5 text-[13px] text-muted dark:border-line-dark dark:text-muted-dark">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>แนวรับ / แนวต้าน / ATR / จุด stop และคำอธิบาย setup ทีละตัว อยู่ในฉบับเต็มสำหรับสมาชิก Pro</span>
      </div>
    </div>
  );
}
