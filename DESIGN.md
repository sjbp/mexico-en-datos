# Mexico en Datos — Design Document

*Last updated: April 11, 2026*

## Vision

A public website that makes Mexico's public data accessible, interactive, and understandable for everyone — not just economists and statisticians. Think **FRED meets Our World in Data, for Mexico**.

The platform combines clean data visualizations with opinionated storytelling. An AI assistant lets anyone query Mexican statistical data in natural language and get instant, sourced insights with inline charts.

**Primary data sources**: INEGI (BIE-BISE indicators), Banxico (monetary/financial), SESNSP (crime), ENOE (employment microdata), ENVIPE (victimization survey), Sec. Salud/DGIS (mortality microdata), ENSANUT (health survey).

**Name**: Mexico en Datos
**URL**: https://datamx.sebastian.mx
**GitHub**: https://github.com/sjbp/mexico-en-datos
**Hosting**: Vercel (project: mexico-en-datos, Analytics enabled)

---

## Strategic Positioning

### What exists today and where it fails

| Platform | Strength | Gap we fill |
|---|---|---|
| INEGI Banco de Indicadores | 4000+ indicators | Terrible UX; designed for statisticians |
| DataMexico | Trade, employment, demographics | Overwhelming UX; no inflation, prices, or security data |
| Mexico Como Vamos | Good editorial layer | Static; headline numbers only; no interactive exploration |
| TradingEconomics Mexico | Clean time series | Generic; no Mexican context; English-only; no microdata |
| CONEVAL | Authoritative poverty data | PDF-heavy; zero interactivity |
| DGIS Cubos Dinamicos | Hospital discharges, health infrastructure | 2005-era Java app; impossible for non-specialists |
| SINAVE Boletin Epidemiologico | Weekly disease surveillance | Locked in PDFs; no one can query it |
| IMSS Datos Abiertos | Insured workers, utilization | Clean CSVs but no visualization layer |

### Our differentiation
1. **Clean, fast, modern UX** — not a government portal
2. **Opinionated data storytelling** — not just charts, but narrative context on why numbers matter
3. **All Mexican public data in one place** — macro indicators, health, survey microdata, geographic data. Not just INEGI — we integrate Banxico, SESNSP, ENOE, ENVIPE, and mortality records
4. **AI-powered querying** — ask questions in Spanish, get charts + insights via Claude tool use with streaming
5. **Flexible visualizations** — AI chooses the best chart type (bar, scatter, distribution, time series) based on the question

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│              Frontend (Next.js 16 on Vercel)          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ Scorecard│ │  Topic   │ │  Source  │ │   AI    │ │
│  │ Homepage │ │ Sections │ │ Explorer │ │  Chat   │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
└────────────────────┬─────────────────────────────────┘
                     │ Server components + API routes
┌────────────────────┴─────────────────────────────────┐
│            Vercel AI SDK (streaming)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │streamText│ │  useChat │ │create_   │             │
│  │+ tools   │ │  hook    │ │chart tool│             │
│  └──────────┘ └──────────┘ └──────────┘             │
└────────────────────┬─────────────────────────────────┘
                     │ cached data functions
┌────────────────────┴─────────────────────────────────┐
│                    Neon PostgreSQL                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │indicators│ │indicator │ │geographic│ │ domain  │ │
│  │ (catalog)│ │ _values  │ │ _areas   │ │ tables  │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
└────────────────────┬─────────────────────────────────┘
                     │ psql / psycopg2
┌────────────────────┴─────────────────────────────────┐
│           Data Ingestion Pipelines (Python / uv)      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │INEGI     │ │ Banxico  │ │ SESNSP   │ │Microdata│ │
│  │BIE-BISE  │ │ SIE API  │ │ CSV      │ │ENOE/etc │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
└──────────────────────────────────────────────────────┘
```

### Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 16, React 19, TypeScript | App Router, server components |
| Styling | Tailwind CSS | Custom design system |
| Charts | Canvas 2D + SVG (custom) | TimeSeries, Scatter (canvas), HBar (div), DotStrip, Sparkline (SVG) |
| AI Assistant | Vercel AI SDK + Claude Sonnet 4 | Streaming via `useChat`, 12 tools including `create_chart` |
| AI Streaming | `ai`, `@ai-sdk/anthropic`, `@ai-sdk/react` | `streamText` + `createUIMessageStream` for custom data parts |
| Cache | In-memory Map (30-min TTL) | Request dedup, suggestion pre-warming |
| Database | Neon PostgreSQL | `@neondatabase/serverless` driver |
| Python pipeline | Python 3.12+, uv | Dependencies in `pyproject.toml` |
| Hosting | Vercel | Frontend + API routes, Vercel Analytics enabled |

---

## Three-Module Architecture

### 1. Scorecard (Homepage)

Eight headline indicators that give a pulse-check on Mexico. Displayed as cards with latest value, trend direction, sparkline, and source attribution.

| # | Indicator | Source | Indicator ID | Status |
|---|---|---|---|---|
| 1 | Inflacion anual | Banxico | SP30578 | LIVE |
| 2 | Crecimiento PIB | INEGI | 735904 | LIVE |
| 3 | Desempleo | INEGI | 444612 | LIVE |
| 4 | Tipo de cambio USD/MXN | Banxico | SF43718 | LIVE |
| 5 | Informalidad laboral | INEGI | 444619 | LIVE |
| 6 | Homicidios (tasa por 100k) | SESNSP | sesnsp_homicide_rate | LIVE |
| 7 | Sin acceso a salud (%) | CONEVAL | static + coneval_sin_salud sparkline | STATIC (39.1%, 2022) |
| 8 | Confianza del consumidor | INEGI | 454168 | LIVE |

Configuration lives in `app/src/lib/scorecard.ts`. Static cards now compute period-over-period change from sparkline values (previously hardcoded to 0).

### 2. Topic Sections

Five topic sections with landing pages and sub-pages:

| Topic | Route | Notes |
|---|---|---|
| Economia | `/economia` | IGAE chart, 4 headline stats, sector breakdown |
| Empleo | `/empleo` | 4 headline stats, informality by sector, trends (4 quarters ENOE data) |
| Seguridad | `/seguridad` | Homicide stats, cifra negra, crime types, state rankings |
| Salud | `/salud` | Leading causes of death, ENSANUT prevalence, CLUES facilities |
| Comercio | `/comercio` | Export/import multi-series chart, nearshoring context |

### 3. Data Source Explorer

Browse available data by institution at `/fuentes`. Each source gets a detail page at `/fuentes/[slug]`.

7 active sources: INEGI, Banxico, SESNSP, ENOE, ENVIPE, Sec. Salud, ENSANUT.
2 coming soon: CONEVAL, IMSS.

Source cards on the homepage show last-updated dates queried from the DB.

### 4. AI Assistant

Claude Sonnet 4 with **streaming** via Vercel AI SDK, accessible from any page:

**Streaming architecture:**
- `useChat` hook from `@ai-sdk/react` for real-time token streaming
- `streamText` + `createUIMessageStream` on the server for custom `data-*` parts
- Charts appear as `data-hbar`, `data-scatter`, `data-timeseries`, `data-dotstrip` stream parts
- Text streams token-by-token while tools execute in the background

**12 data tools:**
- `get_indicator_latest` — latest value + previous for comparison
- `get_indicator_timeseries` — historical series (auto line chart)
- `get_indicator_by_state` — state rankings (auto bar + dotstrip)
- `search_indicators` — fuzzy search
- `get_employment_by_dimension` — employment breakdowns (auto bar + scatter)
- `get_employment_trends` — quarterly trends
- `get_cifra_negra` — dark figure crime stats (auto bar)
- `get_crime_stats` — victimization data (auto bar + scatter)
- `get_mortality_causes` — death rates (auto bar)
- `list_available_topics` — available data categories
- **`create_chart`** — flexible visualization tool (see below)

**`create_chart` tool:**
Claude has full control over chart type and field selection. It can create:
- **Bar charts** from any numeric field of any data source
- **Scatter plots** crossing any two numeric fields (e.g., informality vs income)
- **Distribution strips** showing spread across states
- **Time series** from any indicator

Sources: employment (7 numeric fields), crime (6 fields), cifra_negra, indicator_by_state, indicator_timeseries, mortality.

**5 chart components:**
| Component | Rendering | Use |
|---|---|---|
| `HBar` | Div/CSS | Rankings, comparisons |
| `TimeSeries` | Canvas 2D | Trends over time |
| `Scatter` | Canvas 2D | Two-variable correlations |
| `DotStrip` | SVG | Single-variable distributions |
| `Sparkline` | SVG | Inline mini-trends (scorecard) |

**Performance features:**
- In-memory query cache (30-min TTL) with request dedup across concurrent calls
- Pre-warming of cache on first chat request with queries expected from homepage suggestions
- `maxOutputTokens: 1024` for complex tool calls

### 5. FAQ Page

20 questions at `/preguntas-frecuentes` covering project purpose, data sources, methodology, AI assistant, and contributions. Includes JSON-LD `FAQPage` structured data for SEO.

---

## Data Model

### Core tables

```sql
CREATE TABLE indicators (
    id TEXT PRIMARY KEY,
    name_es TEXT NOT NULL,
    name_en TEXT,
    topic TEXT NOT NULL,
    subtopic TEXT,
    unit TEXT,
    frequency TEXT,
    source TEXT,
    geo_levels TEXT[],
    last_synced_at TIMESTAMPTZ,
    metadata JSONB
);

CREATE TABLE indicator_values (
    indicator_id TEXT REFERENCES indicators(id),
    geo_code TEXT NOT NULL,
    period TEXT NOT NULL,
    period_date DATE NOT NULL,
    value NUMERIC,
    status TEXT,
    PRIMARY KEY (indicator_id, geo_code, period)
);

CREATE TABLE geographic_areas (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level TEXT NOT NULL,
    parent_code TEXT REFERENCES geographic_areas(code),
    lat NUMERIC,
    lng NUMERIC
);
```

### Domain tables

```sql
CREATE TABLE employment_stats (...);     -- ENOE 2024 Q2-Q4 + 2025 Q1 (3,461 rows)
CREATE TABLE envipe_stats (...);         -- ENVIPE 2022-2024 (1,555 rows)
CREATE TABLE ensu_stats (...);           -- ENSU (schema exists, empty)
CREATE TABLE mortality_stats (...);      -- 2018-2023 mortality (9,270 rows)
CREATE TABLE health_facilities (...);    -- CLUES catalog (populated)
CREATE TABLE ensanut_stats (...);        -- ENSANUT 2022 (populated)
```

---

## Ingestion Pipelines

### Active pipelines

| Pipeline | File | Source | Data |
|---|---|---|---|
| INEGI Indicators | `ingest/pipelines/indicators.py` | INEGI BIE-BISE API | ~22 economic indicators |
| Banxico SIE | `ingest/pipelines/banxico.py` | Banxico SIE API | Inflation, USD/MXN, tasa objetivo |
| SESNSP | `ingest/pipelines/sesnsp.py` | SESNSP monthly CSVs | 17K+ rows homicide data by state |
| ENOE | `ingest/pipelines/enoe.py` | ENOE quarterly microdata | 3,461 rows: 4 quarters |
| ENVIPE | `ingest/pipelines/envipe.py` | ENVIPE annual microdata | 1,555 rows: 3 years |
| Mortality | `ingest/pipelines/health/mortality.py` | INEGI/DGIS microdata | 9,270 rows from 800K records |
| ENSANUT | `ingest/pipelines/health/ensanut.py` | ENSANUT 2022 survey | Obesity, diabetes, hypertension |
| CLUES | `ingest/pipelines/health/clues.py` | Health facility catalog | 30K+ facilities |

### Pipeline skeletons

| Pipeline | Blocking on |
|---|---|
| ENSU | Microdata download + aggregation |
| IMSS Coverage | CSV download + processing |

---

## Frontend Routes

### All pages

| Route | Description |
|---|---|
| `/` | Homepage: AI hero, 8 scorecard cards, 5 topic cards, 7 source cards |
| `/economia` | IGAE chart, 4 headline stats, sector breakdown |
| `/empleo` | 4 headline stats, informality by sector, trends |
| `/empleo/informalidad` | Breakdowns by sector, age, gender |
| `/empleo/salarios` | Income by sector, education, gender |
| `/seguridad` | Homicide stats, cifra negra, crime types, state rankings |
| `/salud` | Leading causes of death, ENSANUT, CLUES, life expectancy |
| `/comercio` | Export/import chart, nearshoring context |
| `/explorador` | Browse all indicators |
| `/explorador/[topic]` | Topic-filtered browser |
| `/indicador/[id]` | Detail page with time series, description, metadata |
| `/comparar` | Multi-indicator comparison |
| `/fuentes` | 9 data source institution cards |
| `/fuentes/[slug]` | Per-source detail page |
| `/preguntas-frecuentes` | 20-question FAQ with JSON-LD |

### Navigation

```
[Mexico en Datos]   Panorama   Temas (dropdown)   Fuentes   [Pregunta con IA]
```

---

## Roadmap

### Completed

- **Macro indicators** — 22 indicators from INEGI + Banxico + SESNSP
- **Employment** — ENOE 4 quarters, sector/age/gender/education breakdowns
- **Security** — SESNSP homicides + ENVIPE cifra negra/victimization
- **Health** — Mortality causes of death, ENSANUT prevalence, CLUES facilities
- **Commerce** — Export/import charts with nearshoring context
- **AI Assistant v1** — Direct Anthropic SDK, blocking tool loop, inline HBar/TimeSeries
- **AI Assistant v2** — Vercel AI SDK streaming, `useChat`, custom `data-*` stream parts
- **New chart types** — Scatter (canvas), DotStrip (SVG)
- **`create_chart` tool** — Claude picks chart type + fields for any data source
- **Query cache** — 30-min in-memory cache with dedup and pre-warming
- **FAQ page** — 20 questions with JSON-LD structured data
- **Source sync** — Homepage and `/fuentes` page now show the same 7 active + 2 coming soon sources with last-updated dates

### Next priorities

1. **SEO & discoverability** — sitemap.xml, Open Graph images, Schema.org Dataset markup, Google Search Console
2. **More ENOE quarters** — process historical quarters (2020-2023) for long-term employment trends
3. **ENSU data** — quarterly urban safety perception
4. **Data refresh automation** — cron jobs for daily Banxico sync, weekly INEGI check
5. **More Banxico series** — remittances, TIIE, balance of payments
6. **CONEVAL integration** — poverty measurement (would make "sin acceso a salud" live)
7. **OG images / social sharing** — rendered preview images for each chart/page

### Deferred

- **Education** (SEP data) — no clear data source via API
- **Income/Poverty** (ENIGH) — biennial, next edition 2026
- **Demographics/Census** — one-time load, lower urgency
- **DENUE business directory** — standalone product, not a topic section
- **DGIS hospital discharges / SINAVE epidemiology** — high effort (web scraping / PDF parsing)

---

## API References

### INEGI BIE-BISE API

**Endpoint**: `https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml/INDICATOR/{id}/es/{geo}/{recent}/BIE-BISE/2.0/{token}?type=json`

Free token from INEGI developer portal. Rate limits: ~50-100 rapid requests before reset, use >=0.5s delays.

**Known issue**: INPC data migrated away from BIE API (Dec 2025). Inflation now sourced from Banxico.

### Banxico SIE API

**Endpoint**: `https://www.banxico.org.mx/SieAPIRest/service/v1/series/{id}/datos`

Auth: `Bmx-Token` header. Key series: SP30578 (inflation), SF43718 (USD/MXN), SF61745 (tasa objetivo).

---

## Open Questions

1. **Data refresh automation**: Cron jobs for daily Banxico sync, weekly INEGI check?
2. **Open source strategy**: Repo is public — should we add a license and contributing guide?
3. **INPC from INEGI**: How to get current INPC data from INEGI's new system?
