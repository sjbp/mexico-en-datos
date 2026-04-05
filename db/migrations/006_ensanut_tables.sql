-- Migration 006: ENSANUT health survey prevalence tables
-- Run: psql $DATABASE_URL -f db/migrations/006_ensanut_tables.sql

BEGIN;

CREATE TABLE IF NOT EXISTS ensanut_stats (
    year INT NOT NULL,
    geo_code TEXT NOT NULL,           -- '00' national, state codes
    condition TEXT NOT NULL,          -- 'obesity', 'overweight', 'diabetes', 'hypertension', 'anemia'
    age_group TEXT NOT NULL,          -- '20+', '20-29', '30-39', etc., or 'all'
    sex TEXT NOT NULL,                -- 'M', 'F', 'all'
    prevalence_pct NUMERIC,          -- % of population with condition
    sample_size INT,                  -- number of survey respondents
    PRIMARY KEY (year, geo_code, condition, age_group, sex)
);

CREATE INDEX IF NOT EXISTS idx_ensanut_year ON ensanut_stats (year);
CREATE INDEX IF NOT EXISTS idx_ensanut_condition ON ensanut_stats (condition);
CREATE INDEX IF NOT EXISTS idx_ensanut_geo ON ensanut_stats (geo_code);

COMMIT;
