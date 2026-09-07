# SET Signal Brief

Thai-language quant newsletter on the SET100. A Supabase pipeline pulls daily prices for all 100 constituents plus the SET index, scores every stock (trend / momentum / volume / RSI), labels the market regime, and a scheduled Claude task writes the morning brief into Notion. This repo holds the landing page, the API, the database schema and the Edge Functions.

```
┌──────────────┐  18:30 BKK   ┌────────────────────┐  06:30 BKK   ┌──────────────┐
│ Yahoo Finance│ ───────────▶ │ Supabase (Postgres)│ ───────────▶ │ Notion brief │
│ .BK quotes   │ pg_cron +    │ daily_prices       │ scheduled    │ (Thai, daily)│
└──────────────┘ edge fn      │ screen() / regime()│ Claude task  └──────────────┘
                              │ briefs / scorecard │
                              └─────────┬──────────┘
                                        │ /api/summary, /subscribe (Edge Function, CORS)
                              ┌─────────▼──────────┐
                              │ Static landing page│  React + TypeScript + Vite + Tailwind
                              │ GitHub Pages/Vercel│  (shipped on Preact via compat alias)
                              └────────────────────┘
```

## Stack

| Layer | Choice |
|---|---|
| Front end | React 18 API on **Preact** (`preact/compat` alias), **TypeScript**, **Vite 5**, **Tailwind 3**, lucide icons; single-file build (67 KB) |
| API | Supabase **Edge Function** `landing` — `GET /api/summary`, `POST /subscribe` (public, CORS) |
| Data | Supabase **Postgres 17** — `instruments`, `daily_prices`, `briefs`, `subscribers`; SQL functions `screen()`, `market_regime()`, `scorecard()` |
| Ingestion | Edge Function `fetch-set-prices` (Yahoo chart API) triggered by **pg_cron + pg_net** |
| Newsletter | Claude scheduled task → Notion database (see `docs/scheduled-brief-prompt.md`) |

## Local development

```bash
npm install
npm run dev          # http://localhost:5173 — talks to the live API via VITE_API_BASE
npm run typecheck
npm run build        # dist/index.html (single file)
```

`VITE_API_BASE` lives in `.env.production` (public value, no secrets). Override with `.env.local` if you point at another project.

## Deploy the site

**GitHub Pages (zero config):** push to `main`; `.github/workflows/deploy-pages.yml` builds and publishes. In the repo settings → Pages, set *Source* to **GitHub Actions** once. The site will be at `https://<user>.github.io/set-signal-brief/`.

**Vercel / Netlify:** import the repo; `vercel.json` already sets build `npm run build`, output `dist`. Add env `VITE_API_BASE` if you change projects.

After the first deploy, tell the API where the site lives so `GET /functions/v1/landing` redirects there:

```sql
insert into public.app_config(key, value) values ('site_url', 'https://<your-site>')
on conflict (key) do update set value = excluded.value;
```

## Deploy the backend (new project)

```bash
supabase link --project-ref <ref>
supabase db push                                   # applies supabase/migrations in order
supabase functions deploy fetch-set-prices          # verify_jwt = true
supabase functions deploy landing --no-verify-jwt   # public API
```

Then insert `functions_url` and `anon_key` into `public.app_config` (see the comment in `20260907_02_pg_net_cron_trigger.sql`) and backfill:

```sql
select public.trigger_price_fetch('2y');           -- ~50k bars, takes ~1 minute
select * from public.v_data_health;
select * from public.v_latest_regime;
select * from public.v_latest_screen limit 10;
```

## Operations

- `public.v_data_health` — latest trade date, symbol coverage, last fetch failures.
- `public.fetch_runs` — one row per ingestion run with per-symbol errors.
- `public.scorecard()` / `v_scorecard_summary` — forward 1d/5d returns of every published top setup vs SET; the landing page shows it automatically once 10 calls have matured.
- `public.subscribers` — waitlist (email, plan, source). Service-role only; export from the Supabase dashboard.
- SET50/SET100 constituents change every January and July — update `instruments` from the SET PDF and set `active=false` on leavers.

## Disclaimer

Automated technical analysis for education only; not investment advice. Price data comes from a public, unofficial source and may be delayed or wrong. If this becomes a paid product, license a SET data feed and check SEC rules on investment advice.
