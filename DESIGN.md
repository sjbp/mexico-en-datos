# INEGI Data Platform — Design Document

## Vision

A public website that makes Mexico's public data accessible, interactive, and understandable for everyone — not just economists and statisticians. Think **FRED meets Our World in Data, for Mexico**.

The platform combines beautiful data visualizations with an AI interface that lets anyone query Mexican statistical data in natural language and get instant, sourced insights.

**Primary data sources**: INEGI (statistics), Secretaría de Salud / DGIS / SINAVE (health), IMSS (social security), CONAPO (demographics), CONEVAL (poverty), and more.

**URL concept**: TBD — looking for something that signals the AI-first positioning

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
| DGIS Cubos Dinámicos | Hospital discharges, health infrastructure | 2005-era Java app; impossible for non-specialists |
| SINAVE Boletín Epidemiológico | Weekly disease surveillance | Locked in PDFs; no one can query it |
| IMSS Datos Abiertos | Insured workers, utilization | Clean CSVs but no visualization layer |

### Our differentiation
1. **Clean, fast, modern UX** — not a government portal
2. **AI-powered querying** — ask questions in Spanish, get charts + insights
3. **Opinionated data storytelling** — not just charts, but context on why numbers matter
4. **All Mexican public data in one place** — macro indicators, health, survey microdata, geographic data, business directory. Not just INEGI — we integrate Secretaría de Salud, IMSS, CONAPO, CONEVAL, and more
5. **Shareable** — every chart/insight gets a unique URL, optimized for social sharing (LinkedIn, X)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Explorer  │ │ Stories  │ │ AI Chat  │ │ Search │ │
│  │ (charts) │ │ (narratives)│ │(queries)│ │        │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────┐
│                   API Layer (Next.js API routes)     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Indicator│ │ Microdata│ │ AI/LLM   │            │
│  │ Service  │ │ Service  │ │ Service  │            │
│  └──────────┘ └──────────┘ └──────────┘            │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────┐
│               Data Layer (PostgreSQL + Cache)        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Indicator│ │ Microdata│ │ Geographic│            │
│  │ Time     │ │ Aggregates│ │ Reference│            │
│  │ Series   │ │          │ │          │            │
│  └──────────┘ └──────────┘ └──────────┘            │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────┐
│              Data Ingestion Pipeline (Python)        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ INEGI API│ │ Microdata│ │ Geographic│ │ Health │ │
│  │ Sync     │ │ Download │ │ Import   │ │ Multi- │ │
│  │ (cron)   │ │ & Process│ │          │ │ Source │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└─────────────────────────────────────────────────────┘
```

### Tech stack
- **Frontend**: Next.js (React), Tailwind CSS, D3.js / Observable Plot for charts, Mapbox/MapLibre for maps
- **Backend**: Next.js API routes (TypeScript)
- **Database**: Neon (serverless PostgreSQL) — branching for safe migrations, `@neondatabase/serverless` driver for Vercel edge, standard `psql` for local dev and pipeline ingestion
- **Cache**: Redis or Vercel KV for hot indicator data
- **Data pipeline**: Python scripts for INEGI API sync, microdata processing, geographic data import, multi-source health data integration (DGIS, SINAVE, IMSS, CONAPO, CONEVAL)
- **AI**: Claude API for natural language queries over the data
- **Hosting**: Vercel (frontend + API) + Neon (database)
- **Search**: PostgreSQL full-text search (upgrade to Typesense/Meilisearch if needed)

---

## Data Priority & Scope Sequence

Based on public value, media coverage, visualization gaps, and technical feasibility:

### Scope 1: Macro Indicators Explorer ("Mexican FRED")
**Datasets**: INPC (inflation), IGAE/PIB (GDP/economic activity), ENOE headline indicators (unemployment, informality), consumer/business confidence, trade balance

**Why first**: All available via INEGI API (no microdata wrangling). Highest media/investor interest. Biweekly/monthly release cadence keeps engagement constant. Proven LinkedIn appeal from mexico-jobs.

### Scope 2: Employment Deep Dive (expand mexico-jobs)
**Datasets**: ENOE microdata — informality by sector/state/age/gender, underemployment, wage distribution, occupation breakdowns

**Why second**: Builds on existing mexico-jobs work. Microdata already familiar. High public interest.

### Scope 3: Crime & Security
**Datasets**: ENVIPE (victimization, cifra negra, crime types by state), ENSU (quarterly urban safety perception)

**Why third**: Massive public interest + biggest visualization gap in the landscape. DataMexico ignores security entirely.

### Scope 4: Health & Mortality
**Datasets**: INEGI mortality/birth microdata, IMSS coverage, CONAPO life expectancy/projections, CONEVAL health access, CLUES facility catalog, COVID-19 historical microdata. Phase B adds DGIS hospital discharge data and SINAVE epidemiological surveillance.

**Why fourth**: Massive public interest (obesity, diabetes, mortality trends). Unique integration opportunity — nobody links mortality + morbidity + infrastructure + coverage geographically. Directly relevant to Sofía's domain. Multi-source (not just INEGI) sets us apart from every existing platform.

### Scope 5: Income, Poverty & Inequality
**Datasets**: ENIGH (income/expenditure by decile, state, household type), CONEVAL poverty lines as reference

**Why fifth**: Defines inequality narrative in Mexico. Strong academic + policy + media interest.

### Scope 6: Demographics & Census Explorer
**Datasets**: Censo 2020 (population, age structure, housing, migration by municipality), geographic framework (Marco Geoestadistico)

**Why sixth**: Foundation dataset. Enables geographic drill-down for all other data. Map-based exploration.

### Scope 7: Business Directory (DENUE)
**Datasets**: 6M+ geolocated economic establishments with activity, size, contact

**Why seventh**: Unique business value. Density maps, sector clustering, market analysis.

### Scope 8: AI Data Assistant
**Datasets**: All ingested data from Scopes 1-7

**Why last**: Requires enough data breadth to be useful. Natural language queries across all datasets.

---

## Scope 1 — Macro Indicators Explorer (Detail)

This is the MVP. A clean, fast time-series explorer for Mexico's key economic indicators.

### Features
1. **Indicator browser** — searchable catalog organized by topic (Prices, Economic Activity, Employment, Trade, Confidence)
2. **Interactive time series chart** — zoomable, hover tooltips, date range selector
3. **Multi-series comparison** — overlay 2-3 indicators on the same chart
4. **Geographic breakdown** — state-level view where available
5. **Latest release highlight** — hero card showing most recent value, change, trend
6. **Share/embed** — unique URL per chart configuration, OG image for social preview
7. **Data download** — CSV export of any viewed series
8. **Release calendar** — upcoming INEGI publication dates (from SNIEG calendar)

### Data model (PostgreSQL)

```sql
-- Reference tables
CREATE TABLE indicators (
    id TEXT PRIMARY KEY,           -- INEGI indicator ID
    name_es TEXT NOT NULL,
    name_en TEXT,
    topic TEXT NOT NULL,           -- prices, gdp, employment, trade, confidence
    subtopic TEXT,
    unit TEXT,                     -- percent, index, millions_mxn, thousands_people
    frequency TEXT,                -- biweekly, monthly, quarterly, annual
    source TEXT,                   -- BIE or BISE
    geo_levels TEXT[],             -- {national, state, municipal}
    last_synced_at TIMESTAMPTZ,
    metadata JSONB
);

CREATE TABLE indicator_values (
    indicator_id TEXT REFERENCES indicators(id),
    geo_code TEXT NOT NULL,        -- '00' national, '09' CDMX, etc.
    period TEXT NOT NULL,          -- '2024/01', '2024/Q1', '2024'
    period_date DATE NOT NULL,    -- normalized to first day of period
    value NUMERIC,
    status TEXT,                   -- preliminary, revised, final
    PRIMARY KEY (indicator_id, geo_code, period)
);

CREATE INDEX idx_values_lookup ON indicator_values (indicator_id, geo_code, period_date);

-- Geographic reference
CREATE TABLE geographic_areas (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level TEXT NOT NULL,           -- national, state, municipality
    parent_code TEXT REFERENCES geographic_areas(code),
    lat NUMERIC,
    lng NUMERIC
);
```

### Initial indicators to ingest (~50 series)

**Prices (INPC)**
- Headline CPI (national, by state)
- Core CPI
- CPI by major category: food, housing, transport, education, health, clothing
- Producer Price Index (INPP)

**Economic Activity**
- Quarterly GDP (national, by sector)
- Monthly IGAE (national, primary/secondary/tertiary)
- Timely GDP estimate (PIBO)
- Timely activity indicator (IOAE)

**Employment (ENOE headlines)**
- Unemployment rate (national, by state)
- Informality rate
- Underemployment rate
- Economically active population

**Trade**
- Exports (total, oil, non-oil, manufacturing)
- Imports (total, consumer, intermediate, capital)
- Trade balance

**Confidence**
- Consumer confidence index (ENCO)
- Business confidence by sector (EMOE)

### Ingestion pipeline

```
ingest/
  sync_indicators.py     -- Fetch latest values from INEGI API
  discover_indicators.py -- Catalog management (find IDs, resolve metadata)
  config/
    indicators.yaml      -- Curated list of indicator IDs + our metadata
  utils/
    inegi_client.py      -- INEGI API wrapper (token, rate limiting, retry)
    transforms.py        -- Period parsing, normalization
```

- **Sync frequency**: Daily cron (most indicators update monthly/quarterly, but biweekly CPI needs more frequent checks)
- **Initial load**: Full history for all configured indicators
- **Incremental**: Fetch only `recent=true`, compare with stored latest

### Frontend pages

```
/                           -- Landing: latest releases, trending charts
/explorador                 -- Full indicator browser with search
/explorador/[topic]         -- Topic page (e.g., /explorador/precios)
/indicador/[id]             -- Single indicator detail + chart
/comparar                   -- Multi-indicator comparison tool
/calendario                 -- Release calendar
```

### Estimated effort
- Data pipeline + initial ingestion: 2-3 days
- Database schema + API routes: 1-2 days
- Frontend (chart component, browser, pages): 3-4 days
- Share/embed + OG images: 1 day
- Polish + deploy: 1-2 days

---

## Scope 2 — Employment Deep Dive (Detail)

Expands mexico-jobs into the platform. Migrate existing work + add dimensions.

### New dimensions beyond current mexico-jobs
- Informality rate by state, sector, age, gender
- Wage distribution (income deciles of employed population)
- Occupation breakdown (SINCO classification)
- Working hours distribution
- Job quality index (composite: formal, full-time, above-minimum-wage)

### Data source
ENOE microdata (quarterly CSVs from INEGI). Already familiar from mexico-jobs.

### Pipeline
- Download quarterly ENOE ZIPs
- Process microdata → pre-aggregated tables by key dimensions
- Store aggregates in PostgreSQL (not raw microdata — too large for this use case)

### Frontend pages
```
/empleo                     -- Employment dashboard (headline metrics + trends)
/empleo/informalidad        -- Informality deep dive
/empleo/salarios            -- Wage distribution
/empleo/estados/[state]     -- State-level employment profile
/empleo/sectores/[sector]   -- Sector-level analysis
```

---

## Scope 3 — Crime & Security (Detail)

### Datasets
- **ENVIPE**: Annual. Victimization rates, cifra negra, crime types, cost of crime, trust in authorities. State-level.
- **ENSU**: Quarterly. Perception of safety in 75+ urban areas.

### Key visualizations
- State-level crime rate map (reported vs. estimated real via cifra negra)
- Crime type breakdown (extortion, robbery, fraud, assault, etc.)
- Safety perception over time by city
- Trust in police/military/judges by state
- "Cifra negra" — the gap between real and reported crime

### Pipeline
- ENVIPE + ENSU microdata download and pre-aggregation
- Store by state, city, crime type, year/quarter

### Frontend pages
```
/seguridad                  -- Security dashboard
/seguridad/estados/[state]  -- State security profile
/seguridad/cifra-negra      -- Unreported crime analysis
/seguridad/percepcion       -- Safety perception tracker (ENSU)
```

---

## Scope 4 — Health & Mortality (Detail)

**This is the first scope that goes beyond INEGI**, integrating data from 6+ government sources into a unified health data section. No platform in Mexico does this today.

### Data sources & what we get from each

| Source | Datasets | Format | Frequency | Granularity | Integration effort |
|---|---|---|---|---|---|
| **INEGI** | Mortality microdata (ICD-10 cause of death, age, sex, municipality) | CSV microdata | Annual | Municipal | Medium |
| **INEGI** | Birth statistics (cesarean rates, birth weight, maternal age, prenatal care) | CSV microdata | Annual | Municipal |  Medium |
| **IMSS Datos Abiertos** | Insured workers (coverage proxy by municipality, sector, salary range) | CSV | Monthly | Municipal | Low |
| **CONAPO** | Life expectancy, infant/maternal mortality rates, population projections | Excel | Annual | State/Municipal | Low |
| **CONEVAL** | % population without health access (carencia por acceso a servicios de salud) | Excel | Biennial | State/Municipal | Low |
| **Sec. Salud — CLUES** | Master catalog of 30K+ health facilities (geolocated, by institution type) | CSV | Periodic | Point-level | Low |
| **Sec. Salud — COVID** | Case-level COVID-19 data (comorbidities, hospitalization, outcomes) | CSV | Historical | Municipal | Low |
| **ENIGH** (health module) | Household health expenditure, insurance coverage by type | CSV microdata | Biennial | State | Medium |

### Phase B (harder, higher impact — separate work track)

| Source | Datasets | Challenge | Value |
|---|---|---|---|
| **DGIS Cubos Dinámicos** | Hospital discharges (diagnosis, procedures, length of stay, institution), healthcare infrastructure (beds, doctors, specialists by state/institution) | Trapped behind 2005-era Java web app. No API. Requires scraping or manual extraction. | Transformative — this is the core health utilization dataset in Mexico |
| **SINAVE Boletín Epidemiológico** | Weekly disease surveillance for 140+ diseases by state (dengue, influenza, COVID, TB, HIV, etc.) | Locked in weekly PDF bulletins. Requires PDF parsing pipeline. | Near-real-time disease tracking that nobody can currently query. Unique contribution |
| **ENSANUT** (INSP) | Measured prevalence of obesity, diabetes, hypertension; nutrition status; health service utilization | Infrequent (~6 years). Complex microdata with survey weights. Variable names change across editions. | Gold standard for disease prevalence. Enables "what % of Mexicans have diabetes?" type queries |

### Key visualizations

**Mortality & causes of death**
- Leading causes of death over time (heart disease, diabetes, homicide, COVID) — national and by state
- Age-standardized mortality rates by state (choropleth map)
- Excess mortality during COVID (2020-2022)
- Cause-specific deep dives (diabetes mortality trend, homicide mortality by municipality)

**Health coverage & access**
- % population without health insurance — the Seguro Popular → INSABI → IMSS-Bienestar transition impact
- IMSS coverage by municipality (formal employment proxy)
- Health facilities map (CLUES): hospitals, clinics, by institution (IMSS, ISSSTE, SSA, private)
- Doctors and hospital beds per capita by state

**Health expenditure**
- Out-of-pocket spending as % of total health expenditure (from ENIGH)
- Household health spending by income decile
- Public vs. private health spending trends

**Maternal & child health**
- Cesarean section rates by state (Mexico is ~45% vs WHO recommendation of 10-15%)
- Infant mortality trends
- Maternal mortality (rose during COVID)
- Teen pregnancy rates by state

**COVID-19 (historical)**
- Excess mortality by state and age group
- Comorbidity analysis (diabetes, hypertension, obesity as risk factors)
- Hospitalization and intubation rates over time

### Pipeline

```
ingest/pipelines/
  health/
    mortality.py       -- INEGI mortality microdata → ICD-10 aggregates by cause, age, sex, state, municipality
    births.py          -- INEGI birth microdata → indicators (c-section rate, teen births, etc.)
    imss_coverage.py   -- IMSS datos abiertos → monthly coverage by municipality
    conapo.py          -- Life expectancy, mortality rates, population projections
    coneval_health.py  -- Health access deprivation indicators
    clues.py           -- Health facility catalog → PostGIS points
    covid.py           -- COVID-19 historical microdata processing
    enigh_health.py    -- ENIGH health expenditure module extraction
    # Phase B
    dgis_scraper.py    -- DGIS cubos dinámicos extraction (web scraping)
    sinave_parser.py   -- SINAVE PDF bulletin parsing → structured data
    ensanut.py         -- ENSANUT microdata processing with survey weights
```

### Data model additions

```sql
-- Mortality aggregates (pre-computed from microdata)
CREATE TABLE mortality_stats (
    year INT NOT NULL,
    geo_code TEXT NOT NULL,           -- state or municipality
    cause_group TEXT NOT NULL,        -- our curated cause groupings (maps to ICD-10 chapters/blocks)
    icd10_range TEXT,                 -- e.g., 'I00-I99' for cardiovascular
    age_group TEXT NOT NULL,          -- '0-4', '5-14', ..., '75+', 'all'
    sex TEXT NOT NULL,                -- 'M', 'F', 'all'
    deaths INT NOT NULL,
    rate_per_100k NUMERIC,           -- using CONAPO population denominators
    PRIMARY KEY (year, geo_code, cause_group, age_group, sex)
);

-- Health facility catalog
CREATE TABLE health_facilities (
    clues_id TEXT PRIMARY KEY,        -- CLUES unique identifier
    name TEXT NOT NULL,
    institution TEXT NOT NULL,        -- IMSS, ISSSTE, SSA, PEMEX, SEDENA, private, etc.
    facility_type TEXT NOT NULL,      -- hospital, clinic, health center, etc.
    geo_code TEXT NOT NULL,
    address TEXT,
    lat NUMERIC,
    lng NUMERIC,
    services JSONB,
    last_updated DATE
);

-- Health coverage / access indicators (time series, reuses indicator_values table)
-- Use the existing indicators table with topic = 'health'
-- Examples: health_access_deprivation, imss_insured_workers, life_expectancy, infant_mortality_rate
```

### Frontend pages

```
/salud                              -- Health dashboard (headline metrics + trends)
/salud/mortalidad                   -- Causes of death explorer
/salud/mortalidad/[cause]           -- Cause-specific deep dive (e.g., /salud/mortalidad/diabetes)
/salud/cobertura                    -- Health insurance coverage & access
/salud/infraestructura              -- Health facilities map + capacity metrics
/salud/infraestructura/mapa         -- Interactive CLUES facility map
/salud/gasto                        -- Health expenditure (household + public)
/salud/materna-infantil             -- Maternal & child health indicators
/salud/covid                        -- COVID-19 historical analysis
/salud/estados/[state]              -- State health profile (all health metrics for one state)
# Phase B
/salud/vigilancia                   -- Disease surveillance (SINAVE data)
/salud/hospitalizacion              -- Hospital discharge analysis (DGIS data)
```

### Attribution (multi-source)

Health pages must credit each source used:
```
Fuentes: INEGI (Estadísticas de Mortalidad), IMSS (Datos Abiertos),
CONAPO (Proyecciones de Población), CONEVAL, Secretaría de Salud (CLUES/DGIS)
```

---

## Scope 5 — Income, Poverty & Inequality (Detail)

### Datasets
- **ENIGH**: Biennial. Income and expenditure by decile, source, state, household characteristics.
- **CONEVAL poverty lines** as reference thresholds.

### Key visualizations
- Income distribution (decile chart, Lorenz curve, Gini over time)
- Expenditure patterns by income level (what do rich vs. poor spend on?)
- State-level income map
- Poverty rate trends (using CONEVAL methodology)
- Income by education level, age, gender

### Pipeline
- ENIGH microdata download → aggregation by key dimensions
- Historical series (ENIGH 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024)

### Frontend pages
```
/ingresos                    -- Income & inequality dashboard
/ingresos/distribucion       -- Income distribution explorer
/ingresos/gasto              -- Expenditure patterns
/ingresos/pobreza            -- Poverty tracker
/ingresos/estados/[state]    -- State income profile
```

---

## Scope 6 — Demographics & Census Explorer (Detail)

### Datasets
- **Censo 2020**: Population, age, sex, ethnicity, disability, housing, migration, education. Down to AGEB (census tract) level.
- **Marco Geoestadistico**: Official boundaries (states, municipalities, localities).

### Key visualizations
- Population map (municipality-level choropleth)
- Age pyramid by state/municipality
- Population growth 2010 vs 2020
- Migration patterns
- Indigenous language speakers
- Housing conditions (water, electricity, internet access)

### Pipeline
- Census aggregate tables + selected microdata processing
- Import Marco Geoestadistico shapefiles → PostGIS or GeoJSON tiles
- Pre-compute map tiles for fast rendering

### Frontend pages
```
/poblacion                   -- Demographics dashboard
/poblacion/mapa              -- Interactive population map
/poblacion/piramide          -- Age pyramid explorer
/poblacion/municipios/[muni] -- Municipality profile
/poblacion/vivienda          -- Housing conditions
```

---

## Scope 7 — Business Directory (DENUE) (Detail)

### Datasets
- **DENUE**: 6M+ geolocated establishments with SCIAN activity code, size stratum, address.

### Key visualizations
- Business density heatmap
- Sector clustering by area
- Business count by activity and geography
- Establishment size distribution
- "What businesses are near me?" radius search

### Pipeline
- DENUE API bulk extraction (paginated by state + activity)
- Store in PostgreSQL with PostGIS for spatial queries
- Pre-aggregate counts by municipality + sector for fast dashboards

### Frontend pages
```
/negocios                    -- Business landscape dashboard
/negocios/mapa               -- Interactive business map
/negocios/sectores/[sector]  -- Sector deep dive
/negocios/estados/[state]    -- State business profile
```

---

## Scope 8 — AI Data Assistant (Detail)

### Concept
A conversational interface where users can ask questions in natural language (Spanish or English) and get data-backed answers with charts.

**Example queries:**
- "¿Cuál fue la inflación en alimentos el último año?"
- "Compara el desempleo en Nuevo León vs CDMX desde 2020"
- "¿Cuál es el estado más seguro de México?"
- "¿Cuántos negocios de comida hay en Guadalajara?"
- "¿Cuáles son las principales causas de muerte en México y cómo han cambiado?"
- "¿Qué porcentaje de la población no tiene seguro médico?"
- "¿Cuántos hospitales hay en Oaxaca vs Nuevo León?"

### Architecture
- Claude API with tool use
- Tools map to our API endpoints (get_indicator, compare_indicators, get_state_data, search_denue, get_health_stats, get_mortality_by_cause, etc.)
- Response includes structured data + auto-generated chart
- Citations link back to INEGI source

### Implementation
- Chat UI component with message history
- Backend orchestration: Claude receives user query → calls our data tools → formats response
- Chart generation from structured tool responses
- Source attribution on every response

### Frontend
```
/asistente                   -- AI chat interface
```

---

## Cross-Cutting Concerns

### Data freshness & sync
- **Indicator API data**: Daily cron checks for new values
- **Microdata (ENOE, ENVIPE, ENIGH, etc.)**: Manual trigger when INEGI publishes new edition (quarterly/annual/biennial). Could automate by monitoring INEGI calendar page.
- **DENUE**: Quarterly full refresh
- **Census**: One-time load (next update: 2030)
- **IMSS insured workers**: Monthly sync (clean CSV, low effort)
- **CONAPO projections**: Annual check for new projection series
- **CONEVAL health access**: Biennial (aligned with ENIGH)
- **CLUES facility catalog**: Quarterly check for updates
- **SINAVE bulletins** (Phase B): Weekly PDF fetch + parse
- **DGIS cubos** (Phase B): Annual scrape when new year's data is published

### Attribution
Each page must display source attribution per the terms of use of each data provider. Format:
```
Fuente: INEGI, [nombre del producto] | IMSS Datos Abiertos | CONAPO | ...
Última actualización: [date]
```
Health pages will cite multiple sources — show all that contribute to the displayed data.

### SEO & social sharing
- Each chart/page gets OG meta tags with a rendered preview image
- Structured data (schema.org Dataset) for search engines
- Spanish-first content with optional English toggle

### Performance
- Pre-aggregate everything possible at ingestion time
- Cache hot indicator data (latest values, common queries)
- Use static generation (ISR) for indicator pages that update infrequently
- Map tiles pre-rendered, not computed on request

### Accessibility
- Chart data available as tables (screen readers)
- Color-blind safe palettes
- Keyboard navigation for all interactive elements

---

## Project Structure

```
~/codetmp/inegi-data/
├── DESIGN.md                  -- This document
├── README.md                  -- Project overview + setup
├── app/                       -- Next.js application
│   ├── src/
│   │   ├── app/               -- Next.js app router pages
│   │   ├── components/        -- React components
│   │   │   ├── charts/        -- D3/Plot chart components
│   │   │   ├── maps/          -- Map components
│   │   │   ├── layout/        -- Navigation, footer, etc.
│   │   │   └── ui/            -- Shared UI primitives
│   │   ├── lib/               -- Utilities, API client, types
│   │   └── styles/            -- Tailwind + global styles
│   ├── public/
│   ├── package.json
│   ├── next.config.js
│   └── tailwind.config.js
├── ingest/                    -- Python data pipeline
│   ├── pipelines/
│   │   ├── indicators.py      -- INEGI API indicator sync
│   │   ├── enoe.py            -- ENOE microdata processing
│   │   ├── envipe.py          -- ENVIPE microdata processing
│   │   ├── enigh.py           -- ENIGH microdata processing
│   │   ├── census.py          -- Census data processing
│   │   ├── denue.py           -- DENUE extraction
│   │   ├── geographic.py      -- Marco Geoestadistico import
│   │   └── health/            -- Multi-source health data
│   │       ├── mortality.py   -- INEGI mortality microdata
│   │       ├── births.py      -- INEGI birth statistics
│   │       ├── imss.py        -- IMSS coverage data
│   │       ├── conapo.py      -- Life expectancy, projections
│   │       ├── coneval.py     -- Health access deprivation
│   │       ├── clues.py       -- Health facility catalog
│   │       ├── covid.py       -- COVID-19 historical data
│   │       ├── dgis.py        -- DGIS cubos scraping (Phase B)
│   │       └── sinave.py      -- SINAVE PDF parsing (Phase B)
│   ├── config/
│   │   └── indicators.yaml    -- Curated indicator catalog
│   ├── utils/
│   │   ├── inegi_client.py    -- INEGI API wrapper
│   │   ├── microdata.py       -- Common microdata processing
│   │   └── db.py              -- Database connection + helpers
│   ├── requirements.txt
│   └── Makefile               -- Pipeline commands
├── db/
│   └── migrations/            -- SQL migration files
└── scripts/
    └── setup.sh               -- Environment setup
```

---

## Parallelization Plan

These scopes can be worked on in parallel by different agents/sessions:

| Track | Scopes | Dependencies |
|---|---|---|
| **A: Data pipeline** | Build ingestion framework + Scope 1 indicators | None — can start immediately |
| **B: Frontend foundation** | Next.js app, chart components, layout, routing | None — can start immediately |
| **C: Database** | Schema, migrations, geographic reference data | None — can start immediately |
| **D: Employment** (Scope 2) | Migrate mexico-jobs + expand | Needs B (frontend) and C (database) basics |
| **E: Crime** (Scope 3) | ENVIPE/ENSU pipeline + pages | Needs A (pipeline patterns) and B (frontend) |
| **F: Health Phase A** (Scope 4) | Mortality, births, IMSS, CONAPO, CONEVAL, CLUES, COVID | Needs A (pipeline patterns) and C (database). Can start alongside D/E — health pipelines are independent |
| **F2: Health Phase B** (Scope 4) | DGIS scraping, SINAVE PDF parsing, ENSANUT | Needs F complete. Higher effort, can be deferred |
| **G: Income** (Scope 5) | ENIGH pipeline + pages | Needs A and B |
| **H: Census/Maps** (Scope 6) | Geographic data + map components | Needs C (PostGIS) and B |
| **I: DENUE** (Scope 7) | Business directory pipeline + map | Needs H (maps) |
| **J: AI Assistant** (Scope 8) | Claude integration | Needs API layer from A+B with enough data |

**Immediate parallel tracks** (Scope 1 launch):
- Track A + Track B + Track C can all start simultaneously
- Target: working MVP with ~50 indicator time series in ~1 week

**Second wave** (after foundation is in place):
- Tracks D, E, F, G can all run in parallel — each is an independent data domain with its own pipeline + pages
- Health (Track F) is especially parallelizable: each sub-source (mortality, IMSS, CONAPO, etc.) is independent

---

## Success Metrics

- **Engagement**: Monthly unique visitors, return rate, time on site
- **Shareability**: Social shares per chart, embed count
- **Coverage**: Number of INEGI indicators/datasets available
- **AI usage**: Queries per session, answer satisfaction
- **SEO**: Organic search traffic for INEGI-related queries in Spanish
- **Community**: GitHub stars (if open-sourced), user feedback

---

## INEGI API Reference (for implementation)

### Indicators API
- **Base URL**: `https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml/`
- **Auth**: Free token, register at INEGI developer portal (email-based)
- **Endpoint**: `INDICATOR/{id}/{lang}/{geo}/{recent}/{source}/{version}/{token}?type=json`
  - `lang`: `es` or `en`
  - `geo`: `00` (national), 2-digit state, 5-digit municipality
  - `recent`: `true` (latest) or `false` (full history)
  - `source`: `BIE` (economic) or `BISE` (sociodemographic)
  - `version`: `2.0`
- **Catalog endpoint**: `{catalog}/{id}/{lang}/{source}/{version}/{token}` — catalogs: `CL_INDICATOR`, `CL_UNIT`, `CL_GEO_AREA`, `CL_FREQ`, `CL_TOPIC`
- **Formats**: `json`, `jsonp`, `xml`, `jsonStat`
- **Rate limits**: Undocumented, appears generous
- **Key challenge**: No "list all indicators" endpoint — must discover IDs via BIE web interface or catalog queries

### DENUE API
- **Base URL**: `https://www.inegi.org.mx/app/api/denue/v1/consulta/`
- **Auth**: Separate token from Indicators API
- **Key endpoints**: `Buscar` (radius search, max 5km), `Nombre` (name search), `BuscarAreaAct` (geographic + SCIAN filter), `Cuantificar` (count)
- **Returns**: JSON with 21-33 fields per establishment (name, activity, size, lat/lng, address, etc.)
- **Limitation**: 5km radius cap, no bulk export, pagination required

### Microdata (no API)
- **Download**: `https://www.inegi.org.mx/contenidos/programas/{program}/{year}/microdatos/{filename}_csv.zip`
- URLs are predictable but undocumented — can be scripted with curl/wget
- Formats vary: CSV, DBF, DTA, SAV depending on survey and year

### Licensing
- Free to republish, including commercially
- Must attribute: `Fuente: INEGI, [producto]`
- Cannot imply INEGI endorsement
- Must preserve metadata and disclose transformations

### Existing libraries
- **Python**: `INEGIpy` (pip) — wraps Indicators, DENUE, Routing, Marco Geoestadístico. MIT license. Low maintenance.
- **R**: `inegiR` (CRAN) — BIE series, DENUE. Actively maintained.
- **Node**: `inegi-denue` (npm) — DENUE only.

---

## Design System Reference

The visual design system is documented in `BRAND.md` and implemented as reusable components in:
- `site/med.css` — CSS tokens + component classes (BEM-ish, `med-` prefix)
- `site/med.js` — JS chart library (`MED` namespace): sparklines, time series, hbars, treemap, tooltips, color functions, number formatting

The landing page prototype (`site/index.html`) demonstrates all components with mock data. When we move to Next.js, these translate directly to React components as outlined in `BRAND.md`.

---

## Open Questions

1. **Domain name**: `mexicoendatos.com`? `datosabiertos.mx`? `inegifacil.com`?
2. **Open source?**: Open-sourcing could build community and trust, but increases maintenance burden
3. **Monetization**: Free public good? Freemium with AI queries as paid tier? Sponsorship?
4. **INEGI relationship**: Should we reach out to INEGI directly? They might be interested in an official collaboration
5. **Localization**: Spanish-first is clear, but how much English support?
6. **mexico-jobs migration**: Fold it into this platform entirely, or keep it standalone and link?
7. **Health data gaps worth flagging**: Mexico has no systematic mental health survey and no wait-time tracking. Should the platform explicitly document what data *doesn't exist* as a public service / advocacy tool?
8. **DGIS/SINAVE liberation**: These are high-value but high-effort. Worth building a standalone "Mexican Health Data API" as a sub-project that others can use?
