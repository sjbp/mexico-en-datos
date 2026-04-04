# Mexico en Datos — Design Document

## Vision

A public website that makes Mexico's public data accessible, interactive, and understandable for everyone — not just economists and statisticians. Think **FRED meets Our World in Data, for Mexico**.

The platform combines clean data visualizations with opinionated storytelling. An AI interface (future) will let anyone query Mexican statistical data in natural language and get instant, sourced insights.

**Primary data sources**: INEGI (BIE-BISE indicators), Banxico (monetary/financial), SESNSP (crime), and future integration of IMSS, CONAPO, CONEVAL, Secretaria de Salud, and ENOE/ENVIPE/ENSU microdata.

**Name**: Mexico en Datos

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
2. **Opinionated data storytelling** — not just charts, but context on why numbers matter
3. **All Mexican public data in one place** — macro indicators, health, survey microdata, geographic data. Not just INEGI — we integrate Banxico, SESNSP, and will add Secretaria de Salud, IMSS, CONAPO, CONEVAL
4. **AI-powered querying** (future) — ask questions in Spanish, get charts + insights
5. **Shareable** — every chart/insight gets a unique URL, optimized for social sharing

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│              Frontend (Next.js 16 on Vercel)          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ Scorecard│ │  Topic   │ │  Source  │ │Indicator│ │
│  │ Homepage │ │ Sections │ │ Explorer │ │ Detail  │ │
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
│  │BIE-BISE  │ │ SIE API  │ │ CSV      │ │(future) │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
└──────────────────────────────────────────────────────┘
```

### Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 16.2.1, React 19, TypeScript | App Router, server components |
| Styling | Tailwind CSS | Custom design system in `site/med.css` |
| Charts | Canvas 2D (custom) | Known dev-mode bfcache issue; works in production |
| Database | Neon PostgreSQL | `@neondatabase/serverless` driver for Vercel edge |
| Python pipeline | Python 3.12+, uv | Dependencies in `pyproject.toml` |
| Node runtime | Node 22 via fnm | |
| Hosting | Vercel | Frontend + API routes |
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
| 6 | Homicidios (tasa por 100k) | SESNSP | static | 📋 STATIC (25.2, 2024) |
| 7 | Sin acceso a salud (%) | CONEVAL | static | 📋 STATIC (39.1%, 2024) |
| 8 | Confianza del consumidor | INEGI | 454168 | ✅ LIVE |

Configuration lives in `app/src/lib/scorecard.ts`. Each item has a `sourceType` (`'inegi'` or `'static'`), display format, "good direction" (up/down), and link to detail page.

### 2. Topic Sections

Eight deep-dive sections, each with a landing page and sub-pages:

| # | Topic | Route | Status | Notes |
|---|---|---|---|---|
| 1 | Economia | `/economia` | ✅ BUILT | IGAE chart, PIB, trade, confidence data |
| 2 | Empleo | `/empleo` | 🔧 STRUCTURE READY | Pages + pipeline skeleton, needs ENOE microdata |
| 3 | Seguridad | `/seguridad` | 🔧 STRUCTURE READY | Pages + pipeline skeleton, needs ENVIPE/ENSU/SESNSP data |
| 4 | Salud | `/salud` | 🔧 STRUCTURE READY | Pages + 5 health pipeline skeletons, needs microdata |
| 5 | Educacion | `/educacion` | 📋 PLACEHOLDER | Page exists, needs SEP data sources |
| 6 | Ingresos y Pobreza | `/ingresos` | 📋 PLACEHOLDER | Page exists, needs ENIGH/CONEVAL data |
| 7 | Comercio y Manufactura | `/comercio` | ✅ PARTIALLY BUILT | Has real export/import charts from INEGI |
| 8 | Poblacion | `/poblacion` | 📋 PLACEHOLDER | Page exists, needs Census/CONAPO data |

### 3. Data Source Explorer

Browse available data by institution at `/fuentes`. Each source gets a detail page at `/fuentes/[slug]`.

Planned sources: INEGI, Banxico, IMSS, CONEVAL, CONAPO, Secretaria de Salud.

---

## Data Model

### Core tables (populated)

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

**Status**: All three tables are populated with ~22 INEGI indicators + Banxico series and 33 geographic areas (national + 32 states).

### Domain tables (schema exists, data empty)

```sql
-- Scope 2: Employment (ENOE microdata aggregates)
CREATE TABLE employment_stats (...);     -- 003_employment_tables.sql

-- Scope 3: Security
CREATE TABLE envipe_stats (...);         -- 004_security_tables.sql (annual victimization)
CREATE TABLE ensu_stats (...);           -- 004_security_tables.sql (quarterly perception)

-- Scope 4: Health
CREATE TABLE mortality_stats (...);      -- 005_health_tables.sql (INEGI microdata)
CREATE TABLE health_facilities (...);    -- 005_health_tables.sql (CLUES catalog)
```

All domain tables have schemas defined in `db/migrations/` but are not yet populated.

---

## Ingestion Pipelines

### Active pipelines (producing data)

| Pipeline | File | Source API | Series |
|---|---|---|---|
| INEGI Indicators | `ingest/pipelines/indicators.py` | INEGI BIE-BISE | ~22 economic indicators (GDP, IGAE, employment, trade, confidence) |
| Banxico SIE | `ingest/pipelines/banxico.py` | Banxico SIE | Inflation (SP30578), USD/MXN (SF43718), tasa objetivo (SF61745) |

### Pipeline skeletons (code exists, not yet running)

| Pipeline | File | Data source | Blocking on |
|---|---|---|---|
| SESNSP | `ingest/pipelines/sesnsp.py` | SESNSP monthly CSVs | Data download + processing logic |
| ENOE | `ingest/pipelines/enoe.py` | ENOE quarterly microdata | Microdata download + aggregation |
| ENVIPE | `ingest/pipelines/envipe.py` | ENVIPE annual microdata | Microdata download + aggregation |
| ENSU | `ingest/pipelines/ensu.py` | ENSU quarterly microdata | Microdata download + aggregation |
| Mortality | `ingest/pipelines/health/mortality.py` | INEGI mortality microdata | ICD-10 mapping + aggregation |
| IMSS Coverage | `ingest/pipelines/health/imss_coverage.py` | IMSS Datos Abiertos | CSV download + processing |
| CONAPO | `ingest/pipelines/health/conapo.py` | CONAPO projections | Excel processing |
| COVID | `ingest/pipelines/health/covid.py` | Historical COVID microdata | CSV processing |
| CLUES | `ingest/pipelines/health/clues.py` | Health facility catalog | CSV download + geocoding |

### INEGI API migration issues (Dec 2025)

The INEGI BIE underwent a major migration in December 2025:

- **Source parameter changed**: `BIE` became `BIE-BISE`
- **Many indicator IDs were reassigned**: Old IDs (e.g., 444612-444621 which were INPC series) now return employment data
- **INPC data no longer available via BIE API**: INEGI moved INPC to a new "Canasta y Ponderadores 2024" system. The old INPC indicator 628194 is frozen at July 2024
- **Workaround**: We now source inflation data from Banxico SIE API (series SP30578, SP1)

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

### All 23 current pages

| Route | Description | Status |
|---|---|---|
| `/` | Homepage: hero, 8 scorecard cards, 8 topic cards, sources | ✅ BUILT |
| `/economia` | Economia landing: IGAE chart, key metrics | ✅ BUILT |
| `/empleo` | Employment landing | 🔧 STRUCTURE READY |
| `/empleo/informalidad` | Informality deep dive | 🔧 STRUCTURE READY |
| `/empleo/salarios` | Wage distribution | 🔧 STRUCTURE READY |
| `/seguridad` | Security landing | 🔧 STRUCTURE READY |
| `/seguridad/cifra-negra` | Unreported crime analysis | 🔧 STRUCTURE READY |
| `/seguridad/percepcion` | Safety perception tracker | 🔧 STRUCTURE READY |
| `/salud` | Health landing | 🔧 STRUCTURE READY |
| `/salud/mortalidad` | Mortality/causes of death | 🔧 STRUCTURE READY |
| `/salud/cobertura` | Health insurance coverage | 🔧 STRUCTURE READY |
| `/salud/infraestructura` | Health facilities | 🔧 STRUCTURE READY |
| `/comercio` | Trade & manufacturing | ✅ PARTIALLY BUILT |
| `/educacion` | Education placeholder | 📋 PLACEHOLDER |
| `/ingresos` | Income/poverty placeholder | 📋 PLACEHOLDER |
| `/poblacion` | Demographics placeholder | 📋 PLACEHOLDER |
| `/explorador` | Full indicator browser | ✅ BUILT |
| `/explorador/[topic]` | Topic-filtered browser | ✅ BUILT |
| `/indicador/[id]` | Individual indicator detail + chart | ✅ BUILT |
| `/comparar` | Multi-indicator comparison tool | ✅ BUILT |
| `/fuentes` | Data source explorer landing | ✅ BUILT |
| `/fuentes/[slug]` | Individual source page | ✅ BUILT |
| `/calendario` | Release calendar / coming soon | 📋 PLACEHOLDER |

### Persistent navigation

All pages share a NavBar in `layout.tsx`:
```
[Mexico en Datos]   Panorama   Temas (dropdown)   Fuentes   [Pregunta (AI CTA)]
```

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
| Financial (TODO) | Inflation, USD/MXN, tasa objetivo | Banxico SIE |

Total: ~22 indicators currently ingested. Banxico series are in the database but not yet in the YAML config.

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
│   │   ├── app/                    -- App Router pages (23 routes)
│   │   │   ├── page.tsx            -- Homepage (scorecard + topics + sources)
│   │   │   ├── economia/           -- Economia section
│   │   │   ├── empleo/             -- Employment (+ informalidad, salarios)
│   │   │   ├── seguridad/          -- Security (+ cifra-negra, percepcion)
│   │   │   ├── salud/              -- Health (+ mortalidad, cobertura, infraestructura)
│   │   │   ├── comercio/           -- Trade & manufacturing
│   │   │   ├── educacion/          -- Education (placeholder)
│   │   │   ├── ingresos/           -- Income/poverty (placeholder)
│   │   │   ├── poblacion/          -- Demographics (placeholder)
│   │   │   ├── explorador/         -- Indicator browser (+ [topic])
│   │   │   ├── indicador/[id]/     -- Individual indicator detail
│   │   │   ├── comparar/           -- Multi-indicator comparison
│   │   │   ├── fuentes/            -- Source explorer (+ [slug])
│   │   │   └── calendario/         -- Coming soon
│   │   ├── components/             -- React components (charts, layout, UI)
│   │   ├── lib/                    -- Utilities, types, data fetching
│   │   │   ├── scorecard.ts        -- 8 headline indicator config
│   │   │   └── data.ts             -- Data fetching functions
│   │   └── styles/                 -- Tailwind + global styles
│   ├── package.json
│   └── next.config.js
├── ingest/                         -- Python data pipelines
│   ├── pipelines/
│   │   ├── indicators.py           -- INEGI BIE-BISE sync (ACTIVE)
│   │   ├── banxico.py              -- Banxico SIE sync (ACTIVE)
│   │   ├── sesnsp.py               -- SESNSP crime data (skeleton)
│   │   ├── enoe.py                 -- ENOE microdata (skeleton)
│   │   ├── envipe.py               -- ENVIPE microdata (skeleton)
│   │   ├── ensu.py                 -- ENSU microdata (skeleton)
│   │   └── health/                 -- Health sub-pipelines (5 skeletons)
│   │       ├── mortality.py
│   │       ├── imss_coverage.py
│   │       ├── conapo.py
│   │       ├── covid.py
│   │       └── clues.py
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
Multi-source pages cite all contributing sources.

### SEO & social sharing
- Each chart/page gets OG meta tags with a rendered preview image
- Structured data (schema.org Dataset) for search engines
- Spanish-first content

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

## Open Questions

1. **Domain name**: Still TBD — `mexicoendatos.com` is the working name
2. **INPC from INEGI**: How to get current INPC data from INEGI's new "Canasta y Ponderadores 2024" system? For now Banxico is the workaround
3. **ENOE microdata timing**: When to process the first quarter of ENOE microdata? This unblocks the entire Empleo section
4. **Priority order for remaining scopes**: Security (SESNSP pipeline) vs Health (mortality microdata) vs Employment (ENOE) — which delivers the most value next?
5. **Open source?**: Open-sourcing could build community and trust, but increases maintenance burden
6. **AI assistant implementation**: Claude API with tool use over our data API — when to build this? Requires enough data breadth to be useful
7. **Health data gaps**: Mexico has no systematic mental health survey and no wait-time tracking. Should we document what data *doesn't exist*?
