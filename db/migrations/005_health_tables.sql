-- Migration 005: Health & Mortality tables for Scope 4
-- Run: psql $DATABASE_URL -f db/migrations/005_health_tables.sql

BEGIN;

-- Mortality aggregates (pre-computed from INEGI microdata)
CREATE TABLE IF NOT EXISTS mortality_stats (
    year INT NOT NULL,
    geo_code TEXT NOT NULL,
    cause_group TEXT NOT NULL,           -- our curated groupings
    icd10_range TEXT,                    -- e.g., 'I00-I99' cardiovascular
    age_group TEXT NOT NULL,             -- '0-4', '5-14', ..., '75+', 'all'
    sex TEXT NOT NULL,                   -- 'M', 'F', 'all'
    deaths INT NOT NULL,
    rate_per_100k NUMERIC,
    PRIMARY KEY (year, geo_code, cause_group, age_group, sex)
);

CREATE INDEX IF NOT EXISTS idx_mortality_year ON mortality_stats (year);
CREATE INDEX IF NOT EXISTS idx_mortality_geo ON mortality_stats (geo_code);
CREATE INDEX IF NOT EXISTS idx_mortality_cause ON mortality_stats (cause_group);

-- Health facility catalog (CLUES)
CREATE TABLE IF NOT EXISTS health_facilities (
    clues_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    institution TEXT NOT NULL,           -- IMSS, ISSSTE, SSA, PEMEX, private, etc.
    facility_type TEXT NOT NULL,         -- hospital, clinic, health center
    geo_code TEXT NOT NULL,
    address TEXT,
    lat NUMERIC,
    lng NUMERIC,
    services JSONB,
    last_updated DATE
);

CREATE INDEX IF NOT EXISTS idx_facilities_geo ON health_facilities (geo_code);
CREATE INDEX IF NOT EXISTS idx_facilities_institution ON health_facilities (institution);
CREATE INDEX IF NOT EXISTS idx_facilities_type ON health_facilities (facility_type);

-- Health coverage indicators reuse the existing indicator_values table via topic='health'.
-- No new table needed — use existing indicators table with topic='health'.

COMMIT;
