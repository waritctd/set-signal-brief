# Scheduled task: SET Signal Brief (weekdays 06:30 Bangkok)

The daily Thai brief is written by a Claude scheduled task (created from the Claude desktop app), cron `30 23 * * 0-4` UTC, with the Supabase and Notion connectors. It reads the screen, writes the brief into the Notion database **SET Signal Brief** (data source `1eb18e80-5cd9-4baf-841d-c8ce103c3c55`, under *Personal*), then records the run in `public.briefs` so the scorecard can measure it.

Behaviour:

1. Check `public.v_data_health`. If fewer than 90 symbols have the latest bar or the last fetch had >10 failures, call `select public.trigger_price_fetch('5d')`, wait, re-check; if still bad, write a "DATA ISSUE" page and stop.
2. If `public.briefs` already has a row for `latest_trade_date` (market holiday → no new bar), stop. This is what prevents duplicate briefs.
3. Query `v_latest_regime`, top 12 of `v_latest_screen`, confirmed breakouts (`breakout_20d and vol_ratio_20 >= 1.2`), overbought (`rsi14 >= 80`), big movers (`abs(chg_1d_pct) >= 4`), weakest 5, and the last 5 briefs for continuity.
4. Write the brief in Thai with fixed sections: ภาพรวมเช้านี้ → Regime & Breadth → Top 5 Setups (table + notes with ~2×ATR stops) → Breakout ที่มีวอลุ่มยืนยัน → ระวัง Overbought → หุ้นเคลื่อนไหวแรง → อ่อนแอที่สุด → แผนสำหรับวันนี้ → disclaimer → data/method line.
5. Create the Notion page (properties: Name, Trade date, Regime, SET close, SET chg %, Breadth >SMA200 %, Top setup, Status=auto, icon 📈).
6. `insert into public.briefs(trade_date, regime, market_summary, top_setups, notion_url) ... on conflict (trade_date) do update ...`.

The full prompt text lives in the scheduled task itself; edit it there (Claude app → scheduled tasks) rather than here.
