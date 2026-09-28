# Mexico en Datos — Project Instructions

This is a public-facing data platform. Every change is visible to real users. Prioritize correctness, simplicity, and visual consistency above all else.

**Key documents:**
- `BRAND.md` — Design system: colors, typography, spacing, component specs. Follow it for all visual work.
- `DESIGN.md` — Full architecture, data model, API references, roadmap.

**Next.js version note:** This project uses Next.js 16 which has breaking changes from earlier versions. APIs, conventions, and file structure may differ from training data. When in doubt, read the code before writing new code.

## Core Principles

1. **Data accuracy is non-negotiable.** Wrong numbers are worse than a broken page. Always validate data after ingestion. Never hardcode values that should come from the DB.
2. **Simplicity over cleverness.** The codebase is intentionally small (~9K lines frontend, ~5K lines Python). Don't add abstractions, libraries, or patterns that aren't needed. If something works in 10 lines, don't make it 50.
3. **Spanish-first.** All user-facing text must be in Spanish. Topic keys in the DB are English — always use `fmtTopic()` from `lib/format.ts` for display. Never show raw English DB values to users.
4. **Visual consistency.** Follow the existing dark theme, accent color (#FF9F43), chart patterns, and component styles. Don't introduce new colors, fonts, or layout patterns without strong reason.
5. **Ship small.** Prefer small, focused PRs over large multi-concern changes. One PR = one thing. Easy to review, easy to revert.

## Architecture Overview

- **Frontend:** Next.js 16 App Router, React 19, Tailwind CSS. Server components by default, `'use client'` only where interactivity is needed.
- **Database:** Neon PostgreSQL via `@neondatabase/serverless`. All queries go through `lib/db.ts` → `query<T>()`.
- **Data layer:** `lib/data.ts` has all data-fetching functions. Chat tools use cached wrappers (30-min TTL) from `lib/cache.ts`.
- **AI chat:** Vercel AI SDK. `streamText` + `createUIMessageStream` on server, `useChat` hook on client. Custom `data-*` stream parts for charts.
- **Pipelines:** Python + uv in `ingest/`. Each pipeline is a standalone module. Run with `uv run python -m ingest.pipelines.<name>`.
- **Deployment:** Vercel auto-deploys from `main`. Preview deployments for PRs.

## When Working on Issues

### Before coding
- Read the issue carefully. If requirements are unclear, ask in a comment before starting.
- Check if the issue touches data, frontend, or both. Plan accordingly.
- Read the relevant existing code before writing new code.

### PR standards
- Branch name: `fix/description` or `feat/description`
- PR title: clear, concise, imperative ("Add TIIE indicator", "Fix chart tooltip on mobile")
- PR body: what changed and why, in 3-5 bullet points
- Build must pass (`cd app && npx next build`)
- Link the issue in the PR body (`Closes #123`)

### After coding
- Run `cd app && npx next build` to verify TypeScript + compilation
- For data changes: verify the data looks correct (row counts, value ranges)
- For UI changes: describe what the user will see differently

## Data Pipeline Checklist

**Whenever adding a new indicator, data source, or pipeline:**

1. **Pipeline config** — Add the series/source to the appropriate pipeline in `ingest/pipelines/`
2. **Ingest the data** — Run `uv run python -m ingest.pipelines.<name>` with appropriate flags
3. **Validate** — Run `uv run python -m ingest.validate` to check data integrity
4. **GitHub Action** — Verify the new data is covered by an existing workflow in `.github/workflows/`:
   - `sync-daily.yml` — Banxico (all BANXICO_SERIES) + INEGI indicators
   - `sync-monthly.yml` — SESNSP homicides
   - `sync-quarterly-enoe.yml` — ENOE employment microdata
   - `sync-annual-health.yml` — Mortality + health data
   - If a new pipeline isn't covered, update the relevant workflow or create one
5. **Indicator description** — Add an entry in `app/src/lib/indicatorDescriptions.ts` with `summary` and `context`
6. **Topic label** — If a new topic key is introduced, add it to `fmtTopic()` in `app/src/lib/format.ts`
7. **Cache pre-warm** — If relevant to homepage suggestions, add to `ensureWarmed()` in the chat route
8. **Sitemap** — Auto-generated from DB, no manual step needed
9. **SEO / Social** — OG image is automatic for new indicator IDs. New topic pages, static pages, or changes to the homepage scorecard have extra steps — see the "SEO / Social Sharing" section below.

## Frontend Conventions

### Pages and routing
- All pages in `app/src/app/`. Follow existing patterns (Breadcrumb, heading, subtitle).
- Use server components for data-heavy pages. Client components only for interactivity.
- Metadata exports for SEO on every page (`title`, `description`).

### Components
- UI components in `components/ui/`. Chart components in `components/charts/`.
- Charts use canvas (TimeSeries, Scatter) or SVG (DotStrip, Sparkline) or divs (HBar). No external chart libraries.
- All charts must handle mobile widths (375px). Canvas charts need touch event handlers for tooltips.
- Tooltips use `position: absolute` (not `fixed`) because the chat panel has CSS transforms.

### Styling
- Tailwind only. No inline styles except for dynamic values (positions, transforms).
- Use CSS variables: `--accent`, `--text-primary`, `--text-secondary`, `--text-muted`, `--surface`, `--border`.
- Mobile: use `max-sm:` prefix for mobile-specific overrides.
- Color palette for charts: `seriesColor(i)` from `lib/colors.ts`. Primary accent: `#FF9F43`.

### Common patterns
- Format topic keys: `fmtTopic(topic)` from `lib/format.ts`
- Format numbers: `fmtNum`, `fmtPct`, `fmtCurrency`, `fmtCompact` from `lib/format.ts`
- State code → name: `stateName(code)` in the chat route, or `STATE_NAMES` lookup
- Indicator name cleanup: `.replace(/\s*\(.*\)$/, '')` to strip parenthetical in display

## SEO / Social Sharing

Every user-facing page must be both indexable (Google returns it with a page-specific title and description) and shareable (Slack/WhatsApp/Twitter show a rich preview card). Same metadata, same mental model — treat them together.

### Per-page metadata

Every `page.tsx` exports `metadata` (or `generateMetadata` for dynamic routes) with:
- `title` — page-specific, not the site-wide default
- `description` — ~150 chars, Spanish, describes the page's actual content
- `alternates.canonical` for non-root routes

Root `layout.tsx` sets site-wide `openGraph` + `twitter` defaults. Page-level metadata inherits and overrides title/description. Never leave a new page on the site-wide default — every page has its own story.

### OG image system

All OG infrastructure lives in `app/src/lib/og/`:
- `fonts.ts` — bundled Inter TTFs (`loadInter()`)
- `tokens.ts` — brand colors + `OG_SIZE` (1200×630)
- `sparkline.ts` — SVG path builder
- `render.tsx` — three reusable templates (treemap, editorial, dramatic)
- `topics.ts` — per-topic config (`TOPIC_DEFAULTS`) + manual override map (`TOPIC_OVERRIDES`)

Per-route `opengraph-image.tsx` conventions in the repo today:
- `/` → template B (dashboard grid of 4 headline indicators)
- `/indicador/[id]` → template A (hero number + sparkline) — fully dynamic, works for any new indicator
- Topic routes → template picked via `TOPIC_DEFAULTS` in `lib/og/topics.ts`

**Satori constraint:** `ImageResponse` from `next/og` uses Satori, which renders only a flexbox-CSS subset. CSS Grid, some positioning tricks, and many CSS properties don't work. Inline `<svg>` is supported for sparklines and simple paths. Start from the existing templates — don't write raw CSS from scratch.

All OG routes must export `runtime = 'nodejs'` + `dynamic = 'force-dynamic'`. Data comes from cached wrappers (`cached(getX)`), never raw imports.

### Structured data (JSON-LD)

Root `page.tsx` emits Schema.org Dataset markup for Google Dataset Search. Add topic- or indicator-level structured data only when it would materially improve search visibility — don't ship it for every new page reflexively.

### Sitemap

`app/src/app/sitemap.ts` auto-regenerates from the DB — new indicator IDs appear automatically. Routes not derived from DB content (new topic pages, new static pages) need a manual entry.

### When adding...

**A new indicator ID (via ingest pipeline):**
- OG image is automatic via `/indicador/[id]/opengraph-image.tsx`
- Sitemap is automatic
- Must add `indicatorDescriptions.ts` entry (the `summary` doubles as the page SEO description)

**A new topic page (e.g. `/educacion`):**
1. `page.tsx` exports `metadata` with a Spanish title + description
2. Add `opengraph-image.tsx` in the route folder: `export default async function OGImage() { return renderTopicOG('educacion'); }`
3. Add the topic to `TopicKey` + `TOPIC_DEFAULTS` in `lib/og/topics.ts` — pick `treemap` if there's a top-N categorical dataset, otherwise `editorial`
4. If treemap, add a `dataSource` branch in `getTreemapItems()` in `lib/og/render.tsx`
5. Add the topic label to `fmtTopic()` in `lib/format.ts`
6. Add a manual sitemap entry if the route isn't auto-discovered

**A new static page (e.g. `/metodologia`):**
- Export `metadata` with page-specific Spanish title + description
- Add `opengraph-image.tsx` only if the page deserves a custom preview; otherwise it inherits the root OG

**A new indicator joining the homepage scorecard:**
- Added via `SCORECARD` in `lib/scorecard.ts`
- Consider whether it should displace one of the 4 hardcoded cards in the root OG — see `CARD_IDS` in `app/src/app/opengraph-image.tsx`. Only swap if the new indicator is more iconic than an existing one.

**A social campaign with a featured fact:**
- Populate `TOPIC_OVERRIDES` in `lib/og/topics.ts` with a `DramaticConfig` for the target topic. That topic's preview flips to the op-ed / newspaper-style cover until the override is removed.

### Spanish-first

All OG text (labels, titles, footers) and metadata copy must be Spanish. Topic keys in the DB are English — always use `fmtTopic()` for display. Never expose raw English DB values in user-facing text, including metadata and OG images.

### Verifying

- `cd app && npx next build` — confirms all OG routes compile
- `npx next start -p 3000` then `curl -o /tmp/og.png http://localhost:3000/<route>/opengraph-image` — renders the PNG locally
- On the preview deployment, paste the URL into Slack / WhatsApp to confirm the real preview card

## AI Chat Conventions

### Tools
- 11 tools defined in `app/src/app/api/chat/route.ts`
- Data tools (get_indicator_*, get_employment_*, etc.) auto-generate default charts in `writeChartParts`
- `create_chart` is the flexible tool — Claude picks chart type and fields
- All data functions in tool execute blocks use cached wrappers (never raw imports)

### Adding a new chat tool
1. Define with `tool()` from `ai` package, Zod schema for `inputSchema`
2. Use cached data functions inside `execute`
3. If the tool should auto-generate a chart, add a case in `writeChartParts`
4. Tool descriptions must be in Spanish
5. Update the system prompt if the tool enables new visualization patterns

### System prompt
- Located in the `SYSTEM_PROMPT` constant in the chat route
- Instructs Claude to always visualize data, keep text short, cite sources
- Lists which tools produce which chart types
- Changes to the system prompt affect all users — be conservative

## Risk Levels

Not all work carries the same risk. Follow the appropriate workflow:

### Low risk (implement directly in a PR)
- Bug fixes with clear reproduction steps
- Adding a new series to an existing pipeline (e.g., new Banxico series ID)
- Updating indicator descriptions or translations
- CSS/styling fixes
- Mobile responsiveness improvements

### Medium risk (implement in PR, describe changes clearly for review)
- New frontend pages or components
- Changes to existing chart components
- New AI chat tools
- Modifications to the system prompt
- Changes to GitHub Action workflows

### High risk (propose first, implement only after approval)
- **New data sources** — Requires new pipeline, possibly new DB tables, new frontend. See workflow below.
- **Database schema changes** — Migration risks, could break existing data
- **Major architectural changes** — Changing streaming approach, switching dependencies, etc.

### New data source workflow
When an issue requests data from a source we don't have yet:

1. **Research phase** (comment on the issue, don't write code yet):
   - What data is available? What API/format?
   - What DB table structure is needed?
   - What frontend pages would display it?
   - What's the update frequency?
   - Estimate complexity (pipeline + schema + frontend)

2. **Wait for owner approval** on the proposal before proceeding.

3. **Implementation phase** (after approval):
   - Create DB migration in `db/migrations/`
   - Write pipeline in `ingest/pipelines/`
   - Add to GitHub Actions workflow
   - Add frontend (indicator descriptions, topic labels, etc.)
   - Follow the full Data Pipeline Checklist below

4. **Open PR** with a thorough description of all changes.

## What NOT to Do

- **Don't add npm dependencies** unless absolutely necessary. The frontend has ~10 deps and should stay lean.
- **Don't change the database schema** without explicit approval. Migration risks are high.
- **Don't modify the system prompt** for minor tweaks. It affects every chat interaction.
- **Don't use `position: fixed`** for tooltips or overlays inside the chat panel (CSS transform breaks it).
- **Don't hardcode data values** in the frontend. Everything should come from the DB or be computed.
- **Don't use English in user-facing text.** Even error messages, badges, and alt text should be in Spanish.
- **Don't create new CSS files or design tokens.** Use existing Tailwind classes and CSS variables.
- **Don't add "coming soon" features** that don't work. Ship only what's functional.

## Key Files Reference

| Purpose | File |
|---|---|
| Root layout + SEO metadata | `app/src/app/layout.tsx` |
| Homepage | `app/src/app/page.tsx` |
| AI chat route (tools + streaming) | `app/src/app/api/chat/route.ts` |
| Chat panel UI | `app/src/components/ui/ChatPanel.tsx` |
| All data-fetching functions | `app/src/lib/data.ts` |
| Query cache | `app/src/lib/cache.ts` |
| Number/topic formatting | `app/src/lib/format.ts` |
| Indicator descriptions | `app/src/lib/indicatorDescriptions.ts` |
| Source definitions | `app/src/lib/sources.ts` |
| Scorecard config | `app/src/lib/scorecard.ts` |
| OG image templates + per-topic config | `app/src/lib/og/render.tsx`, `app/src/lib/og/topics.ts` |
| Chart color palette | `app/src/lib/colors.ts` |
| Canvas utilities | `app/src/lib/canvas.ts` |
| Banxico pipeline | `ingest/pipelines/banxico.py` |
| INEGI pipeline | `ingest/pipelines/indicators.py` |
| Full architecture doc | `DESIGN.md` |
