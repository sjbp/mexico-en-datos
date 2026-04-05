# Mexico en Datos — Design Document

*Last updated: April 5, 2026*

## Vision

A public website that makes Mexico's public data accessible, interactive, and understandable for everyone — not just economists and statisticians. Think **FRED meets Our World in Data, for Mexico**.

The platform combines clean data visualizations with opinionated storytelling. An AI assistant lets anyone query Mexican statistical data in natural language and get instant, sourced insights with inline charts.

**Primary data sources**: INEGI (BIE-BISE indicators), Banxico (monetary/financial), SESNSP (crime), ENOE (employment microdata), ENVIPE (victimization survey), INEGI/DGIS (mortality microdata).

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
4. **AI-powered querying** — ask questions in Spanish, get charts + insights via Claude tool use
5. **Shareable** — every chart/insight gets a unique URL

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
| Frontend | Next.js 16.2.1, React 19, TypeScript | App Router, server components |
| Styling | Tailwind CSS | Custom design system in `site/med.css` |
| Charts | Canvas 2D (custom) | Known dev-mode bfcache issue; works in production |
| AI Assistant | Claude Sonnet 4 via API | 10 tools mapping to data.ts functions, inline chart generation |
| Database | Neon PostgreSQL | `@neondatabase/serverless` driver for Vercel edge |
| Python pipeline | Python 3.12+, uv | Dependencies in `pyproject.toml` |
| Node runtime | Node 22 via fnm | |
| Hosting | Vercel | Frontend + API routes, Vercel Analytics enabled |
| Design system | `site/med.css` + `site/med.js` | `MED` namespace: sparklines, time series, hbars, treemap |

---

## Three-Module Architecture

The platform is organized into three complementary modules:

### 1. Scorecard (Homepage)

Eight headline indicators that give a pulse-check on Mexico. Displayed as cards with latest value, trend direction, sparkline, and source attribution.

| # | Indicator | Source | Indicator ID | Status |
|---|---|---|---|---|
| 1 | Inflacion anual | Banxico | SP30578 | ✅ LIVE |
| 2 | Crecimiento PIB | INEGI | 735904 | ✅ LIVE |
| 3 | Desempleo | INEGI | 444612 | ✅ LIVE |
| 4 | Tipo de cambio USD/MXN | Banxico | SF43718 | ✅ LIVE |
| 5 | Informalidad laboral | INEGI | 444619 | ✅ LIVE |
| 6 | Homicidios (tasa por 100k) | SESNSP | sesnsp_homicide_rate | ✅ LIVE |
| 7 | Sin acceso a salud (%) | CONEVAL | static | 📋 STATIC (39.1%, 2024) |
| 8 | Confianza del consumidor | INEGI | 454168 | ✅ LIVE |

7 of 8 indicators are live. Only "Sin acceso a salud" remains static (CONEVAL source, no API).

Configuration lives in `app/src/lib/scorecard.ts`. Each item has a `sourceType` (`'inegi'` or `'static'`), display format, "good direction" (up/down), and link to detail page.

### 2. Topic Sections

Five topic sections with landing pages and sub-pages where applicable:

| # | Topic | Route | Status | Notes |
|---|---|---|---|---|
| 1 | Economia | `/economia` | ✅ BUILT | IGAE chart, 4 headline stats, sector breakdown |
| 2 | Empleo | `/empleo` | ✅ BUILT | 4 headline stats, informality by sector, trends (4 quarters ENOE data) |
| 3 | Seguridad | `/seguridad` | ✅ BUILT | Homicide stats, cifra negra (90.2%), crime types, state rankings |
| 4 | Salud | `/salud` | ✅ BUILT | Leading causes of death from 800K records, narrative context |
| 5 | Comercio | `/comercio` | ✅ BUILT | Export/import multi-series chart, nearshoring context |

### 3. Data Source Explorer

Browse available data by institution at `/fuentes`. Each source gets a detail page at `/fuentes/[slug]`.

Active sources: INEGI and Banxico. Additional source cards displayed for SESNSP, CONEVAL, CONAPO, Secretaria de Salud (6 total).

### 4. AI Assistant

Claude Sonnet 4 with tool use, accessible from any page:
- **Slide-out chat panel** triggered by "Pregunta con IA" button in NavBar
- **Hero section** redesigned as "Que quieres saber sobre Mexico?" with inline input
- **10 data tools** mapping to `data.ts` functions for querying indicators, employment, security, health, and geographic data
- **Inline chart generation** in chat responses (HBar, TimeSeries components)
- **System prompt** optimized for concise, visual-first answers in Spanish
- API route at `/api/chat`

---

## Data Model

### Core tables

```sql
-- Indicator catalog
CREATE TABLE indicators (
    id TEXT PRIMARY KEY,              -- INEGI/Banxico indicator ID
    name_es TEXT NOT NULL,
    name_en TEXT,
    topic TEXT NOT NULL,              -- prices, gdp, employment, trade, confidence
    subtopic TEXT,
    unit TEXT,                        -- percent, index, millions_mxn, etc.
    frequency TEXT,                   -- biweekly, monthly, quarterly, annual
    source TEXT,                      -- BIE-BISE, banxico
    geo_levels TEXT[],
    last_synced_at TIMESTAMPTZ,
    metadata JSONB
);

-- Time series values (core data)
CREATE TABLE indicator_values (
    indicator_id TEXT REFERENCES indicators(id),
    geo_code TEXT NOT NULL,           -- '00' national, '01'-'32' states
    period TEXT NOT NULL,             -- '2024/01', '2024/Q1', '2024'
    period_date DATE NOT NULL,
    value NUMERIC,
    status TEXT,
    PRIMARY KEY (indicator_id, geo_code, period)
);

-- Geographic reference
CREATE TABLE geographic_areas (
    code TEXT PRIMARY KEY,            -- '00' national, '01'-'32' states
    name TEXT NOT NULL,
    level TEXT NOT NULL,              -- national, state, municipality
    parent_code TEXT REFERENCES geographic_areas(code),
    lat NUMERIC,
    lng NUMERIC
);
```

**Status**: All three tables populated. ~27K rows in `indicator_values` (22 INEGI indicators + Banxico series + 17,391 SESNSP homicide rows). 33 geographic areas (national + 32 states).

### Domain tables

```sql
-- Employment (ENOE microdata aggregates)
CREATE TABLE employment_stats (...);     -- 003_employment_tables.sql
-- ✅ POPULATED: 3,461 rows — ENOE 2024 Q2-Q4 + 2025 Q1
-- Dimensions: sector, age_group, gender, education

-- Security: annual victimization
CREATE TABLE envipe_stats (...);         -- 004_security_tables.sql
-- ✅ POPULATED: 1,555 rows — 2022-2024, crime types, cifra negra, trust by state

-- Security: quarterly perception
CREATE TABLE ensu_stats (...);           -- 004_security_tables.sql
-- ⬜ EMPTY: schema exists, pipeline skeleton ready

-- Health: mortality
CREATE TABLE mortality_stats (...);      -- 005_health_tables.sql
-- ✅ POPULATED: 9,270 rows — 2023, 10 ICD-10 cause groups, by state/age/sex

-- Health: facilities
CREATE TABLE health_facilities (...);    -- 005_health_tables.sql
-- ⬜ EMPTY: schema exists, pipeline skeleton ready
```

---

## Ingestion Pipelines

### Active pipelines (producing data)

| Pipeline | File | Source | Data |
|---|---|---|---|
| INEGI Indicators | `ingest/pipelines/indicators.py` | INEGI BIE-BISE API | ~22 economic indicators (GDP, IGAE, employment, trade, confidence) |
| Banxico SIE | `ingest/pipelines/banxico.py` | Banxico SIE API | Inflation (SP30578), USD/MXN (SF43718), tasa objetivo (SF61745) |
| SESNSP | `ingest/pipelines/sesnsp.py` | SESNSP monthly CSVs | 17,391 rows of homicide data by state (2015-2025) |
| ENOE | `ingest/pipelines/enoe.py` | ENOE quarterly microdata | 3,461 rows: 4 quarters processed (2024 Q2-Q4, 2025 Q1) |
| ENVIPE | `ingest/pipelines/envipe.py` | ENVIPE annual microdata | 1,555 rows: 3 years processed (2022-2024) |
| Mortality | `ingest/pipelines/health/mortality.py` | INEGI/DGIS mortality microdata | 9,270 aggregated rows from 800K death records (2023), 10 ICD-10 cause groups |

### Pipeline skeletons (code exists, not yet running)

| Pipeline | File | Data source | Blocking on |
|---|---|---|---|
| ENSU | `ingest/pipelines/ensu.py` | ENSU quarterly microdata | Microdata download + aggregation |
| CLUES | `ingest/pipelines/health/clues.py` | Health facility catalog | CSV download + geocoding |
| IMSS Coverage | `ingest/pipelines/health/imss_coverage.py` | IMSS Datos Abiertos | CSV download + processing |
| CONAPO | `ingest/pipelines/health/conapo.py` | CONAPO projections | Excel processing |
| COVID | `ingest/pipelines/health/covid.py` | Historical COVID microdata | CSV processing |

### INEGI API migration issues (Dec 2025)

The INEGI BIE underwent a major migration in December 2025:

- **Source parameter changed**: `BIE` became `BIE-BISE`
- **Many indicator IDs were reassigned**: Old IDs (e.g., 444612-444621 which were INPC series) now return employment data
- **INPC data no longer available via BIE API**: INEGI moved INPC to a new "Canasta y Ponderadores 2024" system. The old INPC indicator 628194 is frozen at July 2024
- **Workaround**: We now source inflation data from Banxico SIE API (series SP30578, SP1)
- **Stale warning**: indicator 628194 displays a stale INPC warning banner on the frontend

---

## INEGI API Reference

### Indicators API (BIE-BISE)

**Base URL**: `https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml/`

**Auth**: Free token from INEGI developer portal (email registration).

**Endpoint format**:
```
INDICATOR/{id}/es/{geo}/{recent}/BIE-BISE/2.0/{token}?type=json
```

| Parameter | Values |
|---|---|
| `id` | Indicator ID (6-digit for BIE-BISE, 10-digit for BISE-only) |
| `geo` | `00` (national), `01`-`32` (states) — NOT `0700` |
| `recent` | `true` (latest) or `false` (full history) |
| `source` | `BIE-BISE` (NOT the old `BIE`) |

**Biweekly period format**: API returns `YYYY/MM/01` (1ra quincena) and `YYYY/MM/02` (2da quincena).

**Rate limits**: Undocumented; connections reset after ~50-100 rapid requests. Use >=0.5s delays between calls.

**Catalog endpoint**: `{catalog}/{id}/{lang}/{source}/{version}/{token}` for `CL_INDICATOR`, `CL_UNIT`, `CL_GEO_AREA`, `CL_FREQ`, `CL_TOPIC`.

### Verified working indicator IDs

| ID | Description |
|---|---|
| 735904 | PIB Crecimiento (var % anual, trimestral) |
| 736939 | IGAE Total (indice, mensual) |
| 736940 | IGAE Total (var % anual, mensual) |
| 736941 | IGAE Actividades Primarias (indice, mensual) |
| 736883 | IGAE Actividades Secundarias (indice, mensual) |
| 736895 | IGAE Actividades Terciarias (indice, mensual) |
| 444612 | Tasa de desocupacion (mensual, 32 ciudades) |
| 444619 | Tasa de informalidad laboral TIL1 (mensual, 32 ciudades) |
| 444616 | Tasa de subocupacion (mensual, 32 ciudades) |
| 444620 | PEA (mensual, 32 ciudades) |
| 127598 | Exportaciones totales (mensual, USD) |
| 127601 | Importaciones totales (mensual, USD) |
| 454168 | Confianza del Consumidor ICC (mensual) |
| 628194 | INPC indice (FROZEN Jul 2024 — do not use for current data) |

**Known gaps**: INPC data is no longer accessible via BIE API. Use Banxico SIE instead.

### Licensing
- Free to republish, including commercially
- Must attribute: `Fuente: INEGI, [producto]`
- Cannot imply INEGI endorsement

---

## Banxico SIE API Reference

**Base URL**: `https://www.banxico.org.mx/SieAPIRest/service/v1/series/{id}/datos`

**Auth**: HTTP header `Bmx-Token: {token}` (free registration at Banxico portal).

**Date format**: `DD/MM/YYYY` in responses and query parameters.

**Response format**: JSON with `bmx.series[0].datos[]` array, each item has `fecha` and `dato` fields.

### Key series IDs

| Series ID | Description | Frequency |
|---|---|---|
| SP30578 | Inflacion interanual general (var % anual INPC) | Biweekly |
| SP1 | INPC indice general | Biweekly |
| SP74662 | Inflacion subyacente (var % anual) | Biweekly |
| SF43718 | Tipo de cambio USD/MXN FIX | Daily |
| SF61745 | Tasa objetivo Banxico | On change |

**Notes**:
- Banxico is the authoritative source for inflation data after INEGI's INPC migration
- Date range query: append `/{startDate}/{endDate}` to the URL
- Rate limits are generous but undocumented

---

## Frontend Routes

### All 14 current pages

| Route | Description | Status |
|---|---|---|
| `/` | Homepage: AI hero, 8 scorecard cards, 5 topic cards, 6 source cards | ✅ BUILT |
| `/economia` | IGAE chart, 4 headline stats, sector breakdown | ✅ BUILT |
| `/empleo` | 4 headline stats, informality by sector, trends (4 quarters) | ✅ BUILT |
| `/empleo/informalidad` | Breakdowns by sector, age, gender | ✅ BUILT |
| `/empleo/salarios` | Income by sector, education, gender | ✅ BUILT |
| `/seguridad` | Homicide stats, cifra negra (90.2%), crime types, state rankings | ✅ BUILT |
| `/salud` | Leading causes of death from 800K records, narrative context | ✅ BUILT |
| `/comercio` | Export/import multi-series chart, nearshoring context | ✅ BUILT |
| `/explorador` | Browse all 21 indicators | ✅ BUILT |
| `/explorador/[topic]` | Topic-filtered browser | ✅ BUILT |
| `/indicador/[id]` | Detail page with time series, description, metadata | ✅ BUILT |
| `/comparar` | Multi-indicator comparison | ✅ BUILT |
| `/fuentes` | 6 data source institution cards | ✅ BUILT |
| `/fuentes/[slug]` | Per-source detail (INEGI and Banxico active) | ✅ BUILT |

### Persistent navigation

All pages share a NavBar in `layout.tsx`:
```
[Mexico en Datos]   Panorama   Temas (dropdown: Economia, Empleo, Salud, Seguridad, Comercio)   Fuentes   [Pregunta con IA]
```

The "Pregunta con IA" button opens the slide-out ChatPanel from any page.

---

## Indicator Configuration

The curated indicator catalog lives in `ingest/config/indicators.yaml`, organized by topic:

| Topic | Indicators | Source |
|---|---|---|
| Precios | INPC (frozen, historical only) | INEGI BIE-BISE |
| Actividad Economica | PIB growth, IGAE total + 3 sectors | INEGI BIE-BISE |
| Empleo | Desocupacion, informalidad, subocupacion, PEA | INEGI BIE-BISE |
| Comercio Exterior | Exports, imports (monthly, USD) | INEGI BIE-BISE |
| Confianza | Consumer confidence ICC | INEGI BIE-BISE |
| Seguridad | Homicidios por estado (tasa por 100k) | SESNSP |
| Inflacion | Inflacion interanual, INPC indice, subyacente | Banxico SIE |
| Tipo de Cambio | USD/MXN FIX | Banxico SIE |
| Tasa Objetivo | Tasa objetivo Banxico | Banxico SIE |

Total: ~22 indicators ingested via INEGI/Banxico APIs + SESNSP homicide data in `indicator_values`.

---

## Project Structure

```
~/codetmp/inegi-data/
├── DESIGN.md                       -- This document
├── BRAND.md                        -- Visual design system spec
├── pyproject.toml                  -- Python project config (uv)
├── uv.lock                         -- uv lockfile
├── vercel.json                     -- Vercel deployment config
├── app/                            -- Next.js 16 application
│   ├── src/
│   │   ├── app/                    -- App Router pages (14 routes)
│   │   │   ├── page.tsx            -- Homepage (AI hero + scorecard + topics + sources)
│   │   │   ├── layout.tsx          -- Root layout (NavBar + ChatProvider + ChatPanel)
│   │   │   ├── sections/           -- Homepage section components
│   │   │   │   ├── Hero.tsx        -- AI-first hero ("Que quieres saber sobre Mexico?")
│   │   │   │   ├── HeadlineGrid.tsx
│   │   │   │   ├── TopicsGrid.tsx
│   │   │   │   ├── SourcesGrid.tsx
│   │   │   │   ├── InflationSection.tsx
│   │   │   │   └── MortalitySection.tsx
│   │   │   ├── economia/           -- Economia section
│   │   │   ├── empleo/             -- Employment (+ informalidad, salarios)
│   │   │   ├── seguridad/          -- Security (homicides, cifra negra, state rankings)
│   │   │   ├── salud/              -- Health (mortality causes of death)
│   │   │   ├── comercio/           -- Trade & manufacturing
│   │   │   ├── explorador/         -- Indicator browser (+ [topic])
│   │   │   ├── indicador/[id]/     -- Individual indicator detail
│   │   │   ├── comparar/           -- Multi-indicator comparison
│   │   │   ├── fuentes/            -- Source explorer (+ [slug])
│   │   │   └── api/
│   │   │       ├── chat/           -- AI assistant API route (Claude tool use)
│   │   │       ├── indicators/     -- Indicator CRUD + values + latest
│   │   │       ├── employment/     -- ENOE employment data + timeseries
│   │   │       ├── security/       -- ENVIPE + ENSU endpoints
│   │   │       ├── health/         -- Mortality + facilities endpoints
│   │   │       ├── geographic/     -- Geographic areas
│   │   │       └── topics/         -- Topic listing
│   │   ├── components/
│   │   │   ├── charts/             -- Chart components
│   │   │   │   ├── HBar.tsx        -- Horizontal bar chart (also used in AI chat)
│   │   │   │   ├── TimeSeries.tsx  -- Time series chart (also used in AI chat)
│   │   │   │   └── Sparkline.tsx   -- Inline sparkline for scorecard
│   │   │   └── ui/                 -- UI components
│   │   │       ├── NavBar.tsx      -- Persistent nav with Temas dropdown
│   │   │       ├── ChatPanel.tsx   -- Slide-out AI chat panel
│   │   │       ├── ChatProvider.tsx-- Chat state context provider
│   │   │       ├── StaleWarningBanner.tsx -- Stale INPC warning
│   │   │       ├── Card.tsx
│   │   │       ├── StatCard.tsx
│   │   │       ├── Badge.tsx
│   │   │       ├── Breadcrumb.tsx
│   │   │       ├── DataTable.tsx
│   │   │       ├── Footer.tsx
│   │   │       ├── NavTabs.tsx
│   │   │       ├── SearchInput.tsx
│   │   │       └── SectionHeader.tsx
│   │   ├── lib/                    -- Utilities, types, data fetching
│   │   │   ├── data.ts             -- Data fetching functions (10 used as AI tools)
│   │   │   ├── scorecard.ts        -- 8 headline indicator config
│   │   │   ├── sources.ts          -- Data source institution definitions
│   │   │   ├── types.ts            -- TypeScript types
│   │   │   ├── db.ts               -- Database connection
│   │   │   ├── format.ts           -- Number/date formatting
│   │   │   ├── colors.ts           -- Color palette
│   │   │   ├── canvas.ts           -- Canvas 2D chart utilities
│   │   │   └── indicatorDescriptions.ts
│   │   └── styles/                 -- Tailwind + global styles
│   ├── package.json
│   └── next.config.js
├── ingest/                         -- Python data pipelines
│   ├── pipelines/
│   │   ├── indicators.py           -- INEGI BIE-BISE sync (ACTIVE)
│   │   ├── banxico.py              -- Banxico SIE sync (ACTIVE)
│   │   ├── sesnsp.py               -- SESNSP homicide data (ACTIVE)
│   │   ├── enoe.py                 -- ENOE microdata (ACTIVE)
│   │   ├── envipe.py               -- ENVIPE microdata (ACTIVE)
│   │   ├── ensu.py                 -- ENSU microdata (skeleton)
│   │   └── health/
│   │       ├── mortality.py         -- Mortality microdata (ACTIVE)
│   │       ├── clues.py             -- Health facility catalog (skeleton)
│   │       ├── imss_coverage.py     -- IMSS data (skeleton)
│   │       ├── conapo.py            -- CONAPO projections (skeleton)
│   │       └── covid.py             -- COVID historical (skeleton)
│   ├── config/
│   │   └── indicators.yaml         -- Curated indicator catalog
│   └── utils/
│       ├── inegi_client.py         -- INEGI API wrapper
│       ├── transforms.py           -- Period parsing, normalization
│       └── db.py                   -- Database connection helpers
├── db/
│   └── migrations/
│       ├── 001_initial_schema.sql  -- indicators, indicator_values, geographic_areas
│       ├── 002_seed_geographic_areas.sql
│       ├── 003_employment_tables.sql
│       ├── 004_security_tables.sql
│       └── 005_health_tables.sql
└── site/                           -- Design system prototype
    ├── index.html                  -- Landing page prototype (mock data)
    ├── med.css                     -- CSS tokens + component classes
    └── med.js                      -- Chart library (MED namespace)
```

---

## Cross-Cutting Concerns

### Attribution
Each page displays source attribution per the terms of use of each data provider:
```
Fuente: INEGI, [nombre del producto] | Banxico SIE | SESNSP | ...
Ultima actualizacion: [date]
```
Multi-source pages cite all contributing sources. "Last updated" timestamps displayed on charts.

### Design polish
- Narrative context on all data sections (not just charts, but explanations of what the data means)
- "Last updated" timestamps on charts
- Stale INPC warning banner on indicator 628194
- Centered hero with AI-first presentation

### Performance
- Pre-aggregate everything at ingestion time
- Server components for data-heavy pages (no client-side fetch)
- Canvas 2D charts (lightweight, no D3 dependency)
- Static generation where update frequency allows

### Accessibility
- Chart data available as tables (screen readers)
- Color-blind safe palettes (design system in BRAND.md)
- Keyboard navigation for interactive elements

---

## Roadmap

### Completed

- **Scope 1: Macro indicators** — 22 indicators from INEGI + Banxico + SESNSP
- **Scope 2 partial: Employment** — ENOE 4 quarters, sector/age/gender/education breakdowns
- **Scope 3 partial: Security** — SESNSP homicides + ENVIPE cifra negra/victimization
- **Scope 4 partial: Health** — Mortality causes of death from 800K records
- **AI Assistant** — Claude tool use with 10 data tools + inline charts
- **Commerce** — Export/import charts with nearshoring context

### Next priorities

1. **More ENOE quarters** — process historical quarters (2020-2023) for long-term employment trends
2. **ENSU data** — quarterly urban safety perception (table exists, pipeline skeleton ready)
3. **CLUES health facilities** — 30K+ geolocated clinics/hospitals for map visualization
4. **OG images / social sharing** — rendered preview images for each chart/page
5. **Charting library evaluation** — consider replacing custom Canvas 2D with a library (uPlot, ECharts) for better interactivity and edge case handling
6. **More Banxico series** — remittances, TIIE, balance of payments
7. **CONEVAL integration** — poverty measurement, social program evaluation (would make "sin acceso a salud" live)

### Deferred

- **Education** (SEP data) — no clear data source via API
- **Income/Poverty** (ENIGH) — biennial, next edition 2026
- **Demographics/Census** — one-time load, lower urgency
- **DENUE business directory** — standalone product, not a topic section
- **DGIS hospital discharges / SINAVE epidemiology** — high effort (web scraping / PDF parsing)

---

## Open Questions

1. **INPC from INEGI**: How to get current INPC data from INEGI's new system? Banxico workaround is working but not ideal
2. **Open source strategy**: Repo is public — should we add a license and contributing guide?
3. **Data refresh automation**: Cron jobs for daily Banxico sync, weekly INEGI check?
4. **Chart library**: Custom Canvas 2D vs mature library (known tooltip issue in chat panel)
