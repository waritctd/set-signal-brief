import { useMemo, useState } from "react";
import { marked } from "marked";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Summary } from "../lib/api";

marked.setOptions({ gfm: true, breaks: false });

// Renders the latest brief (Markdown from the database) as the on-site sample issue.
export default function SampleIssue({ brief }: { brief: NonNullable<Summary["latest_brief"]> }) {
  const [open, setOpen] = useState(false);
  const html = useMemo(() => marked.parse(brief.body_md) as string, [brief.body_md]);
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 dark:border-line-dark">
        <div>
          <div className="eyebrow">ตัวอย่างฉบับเต็ม · ฉบับล่าสุด</div>
          <div className="mt-0.5 text-[16px] font-semibold">{brief.title ?? `SET Signal Brief — ${brief.trade_date}`}</div>
        </div>
        <button type="button" className="btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
          {open ? "ย่อ" : "อ่านฉบับเต็ม"}
        </button>
      </div>
      <div className={`relative ${open ? "" : "max-h-[420px] overflow-hidden"}`}>
        <article className="prose-brief px-5 py-5" dangerouslySetInnerHTML={{ __html: html }} />
        {!open && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-surface to-transparent dark:from-surface-dark" />}
      </div>
    </div>
  );
}
