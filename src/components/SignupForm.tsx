import { useState, type FormEvent } from "react";
import { Check, Loader2 } from "lucide-react";
import { subscribe } from "../lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SignupForm({ defaultPlan = "pro" }: { defaultPlan?: "free" | "pro" }) {
  const [state, setState] = useState<{ kind: "idle" | "busy" | "ok" | "err"; msg?: string }>({ kind: "idle" });
  const [plan, setPlan] = useState<"free" | "pro">(defaultPlan);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    if (!EMAIL_RE.test(email)) return setState({ kind: "err", msg: "กรุณากรอกอีเมลให้ถูกต้อง" });
    setState({ kind: "busy" });
    try {
      const j = await subscribe({ email, name: String(fd.get("name") ?? ""), plan, website: String(fd.get("website") ?? "") });
      setState({ kind: "ok", msg: j.already ? "อีเมลนี้จองสิทธิ์ไว้แล้ว ขอบคุณค่ะ" : "จองสิทธิ์เรียบร้อย เราจะติดต่อกลับทางอีเมลก่อนเปิดรับสมาชิกรุ่นแรก" });
      e.currentTarget.reset();
    } catch (err) {
      setState({ kind: "err", msg: err instanceof Error ? err.message : "เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง" });
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
      <div>
        <label htmlFor="name" className="mb-1 block text-[13px] text-muted dark:text-muted-dark">ชื่อ (ไม่บังคับ)</label>
        <input id="name" name="name" className="input" autoComplete="name" maxLength={80} />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-[13px] text-muted dark:text-muted-dark">อีเมล</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required placeholder="you@example.com" />
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 block text-[13px] text-muted dark:text-muted-dark">สนใจแพ็กเกจ</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {([
            { v: "pro", t: "Pro Early Bird", s: "99 บาท/เดือน · ฉบับเต็มทุกวัน" },
            { v: "free", t: "Free", s: "Regime + setup อันดับ 1 ทุกเช้า" },
          ] as const).map((o) => (
            <label key={o.v} className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition ${plan === o.v ? "border-teal bg-teal-soft/60 dark:border-teal-dark dark:bg-teal-softdark" : "border-line dark:border-line-dark"}`}>
              <input type="radio" name="plan" value={o.v} checked={plan === o.v} onChange={() => setPlan(o.v)} className="mt-1 accent-[#1E6B62]" />
              <span><span className="block font-semibold">{o.t}</span><span className="block text-[13px] text-muted dark:text-muted-dark">{o.s}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      {/* honeypot */}
      <input name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-0 opacity-0" aria-hidden />
      <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-muted dark:text-muted-dark">ยกเลิกได้ทุกเมื่อ · ไม่ส่งสแปม · ยังไม่มีการเรียกเก็บเงินในขั้นตอนนี้</p>
        <button className="btn" type="submit" disabled={state.kind === "busy"}>
          {state.kind === "busy" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : state.kind === "ok" ? <Check className="h-4 w-4" aria-hidden /> : null}
          {state.kind === "ok" ? "จองแล้ว" : "จองสิทธิ์ Early Bird"}
        </button>
      </div>
      <p aria-live="polite" className={`min-h-[1.4em] text-[14px] sm:col-span-2 ${state.kind === "ok" ? "text-up dark:text-up-dark" : state.kind === "err" ? "text-down dark:text-down-dark" : "text-muted dark:text-muted-dark"}`}>
        {state.msg ?? ""}
      </p>
    </form>
  );
}
