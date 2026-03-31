-- Migration 001: Initial schema for México en Datos - Scope 1 (Macro Indicators Explorer)
-- Run: psql $DATABASE_URL -f db/migrations/001_initial_schema.sql

BEGIN;

-- Geographic reference areas (national, state, municipality)
CREATE TABLE IF NOT EXISTS geographic_areas (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('national', 'state', 'municipality')),
    parent_code TEXT REFERENCES geographic_areas(code),
    lat NUMERIC,
    lng NUMERIC
);

CREATE INDEX idx_geo_level ON geographic_areas (level);
CREATE INDEX idx_geo_parent ON geographic_areas (parent_code);

-- Indicator catalog: one row per INEGI indicator
CREATE TABLE IF NOT EXISTS indicators (
    id TEXT PRIMARY KEY,              -- INEGI indicator ID (e.g. '628194')
    name_es TEXT NOT NULL,
    name_en TEXT,
    topic TEXT NOT NULL,              -- prices, gdp, employment, trade, confidence
    subtopic TEXT,
    unit TEXT,                        -- percent, index, millions_mxn, thousands_people
    frequency TEXT,                   -- biweekly, monthly, quarterly, annual
    source TEXT,                      -- BIE or BISE
    geo_levels TEXT[],                -- {national, state, municipal}
    last_synced_at TIMESTAMPTZ,
    metadata JSONB
);

CREATE INDEX idx_indicators_topic ON indicators (topic);
CREATE INDEX idx_indicators_source ON indicators (source);
CREATE INDEX idx_indicators_frequency ON indicators (frequency);

-- Time series values: the core data table
CREATE TABLE IF NOT EXISTS indicator_values (
    indicator_id TEXT NOT NULL REFERENCES indicators(id),
    geo_code TEXT NOT NULL,           -- '00' = national, '09' = CDMX, etc.
    period TEXT NOT NULL,             -- '2024/01', '2024/Q1', '2024'
    period_date DATE NOT NULL,        -- normalized to first day of period
    value NUMERIC,
    status TEXT,                      -- preliminary, revised, final
    PRIMARY KEY (indicator_id, geo_code, period)
);

-- Primary lookup pattern: indicator + geography + time range
CREATE INDEX idx_values_lookup ON indicator_values (indicator_id, geo_code, period_date);

-- For queries filtering by indicator across all geographies
CREATE INDEX idx_values_indicator ON indicator_values (indicator_id);

-- For queries filtering by geography across all indicators
CREATE INDEX idx_values_geo ON indicator_values (geo_code);

-- For time-range scans
CREATE INDEX idx_values_period_date ON indicator_values (period_date);

COMMIT;
