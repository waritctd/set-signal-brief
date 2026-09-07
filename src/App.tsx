import { useEffect, useState } from "react";
import { Activity, Gauge, ShieldAlert, ArrowRight, Clock, Database, FileText } from "lucide-react";
import LiveCard, { LiveCardSkeleton } from "./components/LiveCard";
import SignupForm from "./components/SignupForm";
import SampleIssue from "./components/SampleIssue";
import { fetchSummary, pct, type Summary } from "./lib/api";
import { ExternalLink } from "lucide-react";

function useSummary() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchSummary().then(setData).catch((e) => setError(String(e)));
  }, []);
  return { data, error };
}

const FEATURES = [
  { Icon: Gauge, t: "Regime & Breadth", d: "SET เทียบ SMA50/200, สัดส่วนหุ้นเหนือเส้นค่าเฉลี่ย, จำนวนขึ้น/ลง — เพื่อตอบคำถามเดียว: วันนี้ควรรุกหรือรับ" },
  { Icon: Activity, t: "Top setups + ระดับราคา", d: "คะแนน 0–100 จากเทรนด์ โมเมนตัม วอลุ่ม และ RSI ที่ไม่ร้อนเกิน พร้อมแนวรับ แนวต้าน ATR และ stop ที่สมเหตุสมผล" },
  { Icon: ShieldAlert, t: "สิ่งที่ต้องระวัง", d: "Overbought (RSI ≥ 80), breakout ที่มีวอลุ่มยืนยัน, หุ้นอ่อนแอที่สุด และแผนประจำวัน 4 บรรทัดรวมสูตร position size" },
];

// A real sequence — the order carries information, so the timeline is numbered by time of day.
const PIPELINE = [
  { Icon: Clock, time: "16:30", t: "ตลาดปิด", d: "SET100 ทั้ง 100 ตัว + ดัชนี SET" },
  { Icon: Database, time: "18:30", t: "ระบบดึงข้อมูล", d: "คำนวณ SMA / RSI / ATR / วอลุ่ม / 52 สัปดาห์ และให้คะแนนทุกตัว" },
  { Icon: FileText, time: "06:30", t: "ฉบับเช้าถึงมือคุณ", d: "สรุปภาษาไทย อ่านจบใน 3 นาที ก่อนตลาดเปิด 10:00" },
];

export default function App() {
  const { data, error } = useSummary();

  return (
    <div className="mx-auto max-w-[1040px] px-5 pb-20 pt-6 sm:px-6">
      <header className="flex items-center justify-between gap-4 border-b border-line pb-5 dark:border-line-dark">
        <div>
          <div className="text-[17px] font-bold tracking-tight">SET Signal Brief</div>
          <div className="text-[12.5px] text-muted dark:text-muted-dark">สรุปสัญญาณเทคนิค SET100 ทุกเช้า · ภาษาไทย</div>
        </div>
        <nav className="flex items-center gap-4">
          <a href="#sample" className="hidden text-[14px] font-medium text-muted hover:text-ink dark:text-muted-dark dark:hover:text-ink-dark sm:inline">ดูตัวอย่างฉบับ</a>
          <a href="#join" className="btn">รับฟรีทุกเช้า</a>
        </nav>
      </header>

      <section className="grid grid-cols-1 items-start gap-9 pb-6 pt-10 md:grid-cols-[1.05fr_1fr] md:pt-14">
        <div>
          <div className="eyebrow mb-3">Quant newsletter · SET100 · ก่อนตลาดเปิด</div>
          <h1 className="text-[34px] font-bold leading-[1.15] tracking-tight sm:text-[42px]">
            ตื่นมาก็รู้ว่าวันนี้ตลาดอยู่โหมดไหน และหุ้นตัวไหนโครงสร้างดีที่สุด
          </h1>
          <p className="mt-4 max-w-[36ch] text-[17px] leading-relaxed">
            ระบบสแกนหุ้น <b className="text-teal dark:text-teal-dark">SET100 ทั้ง 100 ตัว</b> หลังปิดตลาดทุกวัน แล้วเขียนสรุปเป็นภาษาไทยให้อ่านจบใน 3 นาที:
            regime ตลาด, breadth, top setups พร้อม<b className="text-teal dark:text-teal-dark">แนวรับ แนวต้าน ATR และจุด stop</b> — ไม่มีเชียร์ ไม่มีข่าวลือ มีแต่ตัวเลข
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="#join" className="btn">จองสิทธิ์ Early Bird <ArrowRight className="h-4 w-4" aria-hidden /></a>
            <span className="text-[13px] text-muted dark:text-muted-dark">
              {data && data.subscribers > 0 ? `มีผู้จองแล้ว ${data.subscribers} คน · ` : ""}ไม่ใช่คำแนะนำการลงทุน
            </span>
          </div>
        </div>
        <div>
          {data ? <LiveCard data={data} /> : error ? (
            <div className="card p-5 text-[14px] text-muted dark:text-muted-dark">ยังโหลดข้อมูลล่าสุดไม่ได้ในขณะนี้ — ลองรีเฟรชอีกครั้ง</div>
          ) : <LiveCardSkeleton />}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-[26px] font-bold tracking-tight">ในแต่ละฉบับมีอะไร</h2>
        <p className="mt-1 max-w-[60ch] text-muted dark:text-muted-dark">โครงเดียวกันทุกวัน อ่านเร็ว เทียบย้อนหลังได้</p>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURES.map(({ Icon, t, d }) => (
            <div key={t} className="card p-5">
              <Icon className="h-5 w-5 text-teal dark:text-teal-dark" aria-hidden />
              <h3 className="mt-3 text-[17px] font-semibold">{t}</h3>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted dark:text-muted-dark">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-[26px] font-bold tracking-tight">ทำงานอย่างไร</h2>
        <p className="mt-1 max-w-[60ch] text-muted dark:text-muted-dark">อัตโนมัติทั้งสาย ตั้งแต่ราคาปิดจนถึงกล่องจดหมายของคุณ ทุกวันทำการ</p>
        <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {PIPELINE.map(({ Icon, time, t, d }, i) => (
            <li key={t} className="relative card p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono tnum text-[13px] text-teal dark:text-teal-dark">{time} น.</span>
                <Icon className="h-4 w-4 text-muted dark:text-muted-dark" aria-hidden />
              </div>
              <h3 className="mt-3 text-[17px] font-semibold">{t}</h3>
              <p className="mt-1 text-[14.5px] text-muted dark:text-muted-dark">{d}</p>
              {i < PIPELINE.length - 1 && <ArrowRight className="absolute -right-4 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-line dark:text-line-dark md:block" aria-hidden />}
            </li>
          ))}
        </ol>
      </section>

      <section id="join" className="mt-14 scroll-mt-8">
        <h2 className="text-[26px] font-bold tracking-tight">สมัครรับ</h2>
        <p className="mt-1 max-w-[62ch] text-muted dark:text-muted-dark">
          {data?.pricing?.pay_url_pro
            ? "ช่วง Early Bird: ล็อกราคานี้ตลอดอายุสมาชิก ชำระผ่าน PromptPay หรือบัตรได้ทันที หรือกรอกอีเมลเพื่อรับฉบับฟรีก่อน"
            : "ช่วง Early Bird: ล็อกราคานี้ตลอดอายุสมาชิก เปิดรับสมาชิกรุ่นแรกจำนวนจำกัด การชำระเงินยังไม่เปิด — จองสิทธิ์ก่อนแล้วเราจะติดต่อกลับ"}
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="card p-5">
            <h3 className="text-[18px] font-semibold">Free</h3>
            <div className="mt-1 text-[30px] font-bold tracking-tight">0 <span className="text-[14px] font-normal text-muted dark:text-muted-dark">บาท</span></div>
            <ul className="mt-3 space-y-1.5 text-[14.5px]">
              <li>· Regime ตลาด + SET close ทุกเช้า</li>
              <li>· Top setup อันดับ 1 (ชื่อหุ้น + เหตุผลสั้น)</li>
              <li>· ส่งทางอีเมล</li>
            </ul>
          </div>
          <div className="card border-teal p-5 ring-[3px] ring-teal-soft dark:border-teal-dark dark:ring-teal-softdark">
            <h3 className="text-[18px] font-semibold">
              Pro <span className="ml-2 rounded-full bg-amber-soft px-2 py-0.5 text-[11.5px] font-semibold text-amber dark:bg-amber-softdark dark:text-amber-dark">Early Bird</span>
            </h3>
            <div className="mt-1 text-[30px] font-bold tracking-tight">{data?.pricing?.pro_thb ?? 99} <span className="text-[14px] font-normal text-muted dark:text-muted-dark">บาท / เดือน · ปกติ {data?.pricing?.pro_regular_thb ?? 199}</span></div>
            <ul className="mt-3 space-y-1.5 text-[14.5px]">
              <li>· ฉบับเต็มทุกวันทำการ: Top 5 พร้อมแนวรับ-แนวต้าน-ATR-stop</li>
              <li>· Breakout / Overbought / หุ้นอ่อนแอ + แผนประจำวัน</li>
              <li>· ตารางผลตอบแทนย้อนหลังของทุก setup (โปร่งใส ไม่เลือกโชว์)</li>
              <li>· เข้าถึงข้อมูล screen ทั้ง SET100 รายวัน</li>
            </ul>
            {data?.pricing?.pay_url_pro && (
              <a href={data.pricing.pay_url_pro} target="_blank" rel="noopener" className="btn mt-4 w-full">
                สมัคร Pro {data.pricing.pro_thb} บาท/เดือน <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            )}
          </div>
        </div>
        <div className="mt-4"><SignupForm /></div>
      </section>

      <section id="sample" className="mt-14 scroll-mt-8">
        <h2 className="text-[26px] font-bold tracking-tight">หน้าตาของฉบับจริง</h2>
        <p className="mt-1 max-w-[60ch] text-muted dark:text-muted-dark">นี่คือฉบับล่าสุดที่ระบบเขียนจริง ไม่ใช่ตัวอย่างสมมติ — สมาชิก Pro ได้รับแบบนี้ทุกเช้าวันทำการ</p>
        <div className="mt-6">
          {data?.latest_brief ? <SampleIssue brief={data.latest_brief} /> : (
            <div className="card p-5 text-[14px] text-muted dark:text-muted-dark">ฉบับล่าสุดกำลังโหลด…</div>
          )}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-[26px] font-bold tracking-tight">ผลงานที่ตรวจสอบได้</h2>
        <p className="mt-1 max-w-[60ch] text-muted dark:text-muted-dark">ทุก setup ที่ประกาศ จะถูกบันทึกและวัดผลอัตโนมัติเทียบกับ SET</p>
        <div className="card mt-6 p-5">
          {data?.score && data.score.calls >= 10 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {[
                { v: `${data.score.beat_set_5d_pct}%`, l: "ของ setup ชนะ SET ใน 5 วัน" },
                { v: pct(data.score.avg_call_5d_pct), l: `ผลตอบแทนเฉลี่ย 5 วัน (SET ${pct(data.score.avg_set_5d_pct)})` },
                { v: String(data.score.calls), l: `setup ที่ติดตามผลแล้ว จาก ${data.score.briefs_scored} ฉบับ` },
              ].map((s) => (
                <div key={s.l} className="border-t-2 border-teal pt-2.5 dark:border-teal-dark">
                  <div className="font-mono tnum text-[30px] font-medium">{s.v}</div>
                  <div className="text-[13px] text-muted dark:text-muted-dark">{s.l}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14.5px] text-muted dark:text-muted-dark">
              เริ่มบันทึกผลทุก setup ตั้งแต่ 7 ก.ย. 2569 — ตารางผลตอบแทนย้อนหลัง (1 วัน / 5 วัน เทียบ SET) จะแสดงที่นี่อัตโนมัติเมื่อมีข้อมูลครบ 10 setup แรก ไม่มีการเลือกโชว์เฉพาะตัวที่ถูก
            </p>
          )}
        </div>
      </section>

      <footer className="mt-16 border-t border-line pt-5 text-[13px] leading-relaxed text-muted dark:border-line-dark dark:text-muted-dark">
        <p className="max-w-[85ch]">
          <b>ข้อจำกัดความรับผิดชอบ:</b> SET Signal Brief จัดทำโดยระบบอัตโนมัติจากข้อมูลราคาปิด เพื่อการศึกษาและวิเคราะห์เชิงเทคนิคเท่านั้น ไม่ใช่คำแนะนำการลงทุนหรือการชักชวนให้ซื้อขายหลักทรัพย์
          ผู้จัดทำไม่ได้เป็นผู้แนะนำการลงทุนที่ได้รับใบอนุญาตจากสำนักงาน ก.ล.ต. ผลตอบแทนในอดีตไม่ได้รับประกันผลตอบแทนในอนาคต โปรดศึกษาข้อมูลและรับความเสี่ยงด้วยตนเอง
        </p>
        <p className="mt-2 max-w-[85ch]">
          ข้อมูลราคา: แหล่งข้อมูลสาธารณะ อาจล่าช้าหรือคลาดเคลื่อน · ตัวชี้วัด: SMA20/50/200, RSI14, ATR14, วอลุ่มเทียบเฉลี่ย 20 วัน, high/low 52 สัปดาห์ · © {new Date().getFullYear() + 543} SET Signal Brief
        </p>
      </footer>
    </div>
  );
}
