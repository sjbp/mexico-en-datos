-- Migration 003: Pre-aggregated employment tables for ENOE microdata (Scope 2)
-- Run: psql $DATABASE_URL -f db/migrations/003_employment_tables.sql

BEGIN;

-- Employment aggregates by dimension
CREATE TABLE IF NOT EXISTS employment_stats (
    quarter TEXT NOT NULL,           -- '2024/Q1'
    quarter_date DATE NOT NULL,
    geo_code TEXT NOT NULL,          -- '00' national, '01'-'32' states
    dimension TEXT NOT NULL,         -- 'sector', 'age_group', 'gender', 'education', 'occupation'
    dimension_value TEXT NOT NULL,   -- e.g., 'Manufactura', '25-34', 'Mujer'
    employed INT,
    informal INT,
    underemployed INT,
    unemployment_rate NUMERIC,
    informality_rate NUMERIC,
    avg_hours_worked NUMERIC,
    avg_monthly_income NUMERIC,
    PRIMARY KEY (quarter, geo_code, dimension, dimension_value)
);

CREATE INDEX idx_employment_quarter ON employment_stats (quarter_date);
CREATE INDEX idx_employment_geo ON employment_stats (geo_code);
CREATE INDEX idx_employment_dimension ON employment_stats (dimension);

COMMIT;
