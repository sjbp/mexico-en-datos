# Mexico en Datos — Project Instructions

## Data Pipeline Checklist

**Whenever you add a new indicator, data source, or pipeline:**

1. **Pipeline config** — Add the series/source to the appropriate pipeline in `ingest/pipelines/`
2. **Run the pipeline** — Ingest the data with `uv run python -m ingest.pipelines.<name>`
3. **GitHub Action** — Verify the new data is covered by an existing workflow in `.github/workflows/`. If the pipeline or series is new, update the relevant workflow or create one. Current schedules:
   - `sync-daily.yml` — Banxico (all series in BANXICO_SERIES) + INEGI indicators
   - `sync-monthly.yml` — SESNSP homicides
   - `sync-quarterly-enoe.yml` — ENOE employment microdata
   - `sync-annual-health.yml` — Mortality + health data
4. **Indicator description** — Add an entry in `app/src/lib/indicatorDescriptions.ts`
5. **Topic label** — If a new topic key is introduced, add it to `fmtTopic()` in `app/src/lib/format.ts`
6. **Cache pre-warm** — If the indicator is used by a homepage suggestion, add it to `ensureWarmed()` in `app/src/app/api/chat/route.ts`
7. **Sitemap** — Auto-generated from DB, no manual step needed

## Key Conventions

- All user-facing text in Spanish
- Topic keys in DB are English (prices, economic_activity, etc.) — always use `fmtTopic()` for display
- Chart components: HBar (div), TimeSeries (canvas), Scatter (canvas), DotStrip (SVG), Sparkline (SVG)
- AI chat uses Vercel AI SDK streaming with `useChat` hook
- In-memory cache (30-min TTL) wraps all chat data functions — defined in `app/src/lib/cache.ts`
