-- Migration 004: Security tables for Scope 3 (Crime & Security)
-- Tables for ENVIPE (annual victimization) and ENSU (quarterly urban safety perception)
-- Run: uv run python3 -c "import psycopg2; ..." or psql $DATABASE_URL -f db/migrations/004_security_tables.sql

BEGIN;

-- ENVIPE: Annual victimization survey data
CREATE TABLE IF NOT EXISTS envipe_stats (
    year INT NOT NULL,
    geo_code TEXT NOT NULL,              -- '00' national, state codes
    crime_type TEXT NOT NULL,            -- 'total', 'robbery', 'extortion', 'fraud', 'assault', 'threats', 'other'
    prevalence_rate NUMERIC,             -- victims per 100k population 18+
    cifra_negra NUMERIC,                 -- % of crimes not reported (dark figure)
    reported_rate NUMERIC,               -- % of crimes reported to authorities
    trust_police NUMERIC,               -- % trust in local police
    trust_military NUMERIC,
    trust_judges NUMERIC,
    cost_per_victim NUMERIC,            -- average cost of crime per victim (MXN)
    PRIMARY KEY (year, geo_code, crime_type)
);

CREATE INDEX IF NOT EXISTS idx_envipe_year ON envipe_stats (year);
CREATE INDEX IF NOT EXISTS idx_envipe_geo ON envipe_stats (geo_code);

-- ENSU: Quarterly urban safety perception
CREATE TABLE IF NOT EXISTS ensu_stats (
    quarter TEXT NOT NULL,               -- '2024/Q1'
    quarter_date DATE NOT NULL,
    city_code TEXT NOT NULL,             -- city identifier
    city_name TEXT NOT NULL,
    feels_unsafe_pct NUMERIC,            -- % population that feels unsafe
    feels_unsafe_night_pct NUMERIC,
    witnessed_crime_pct NUMERIC,
    expects_crime_pct NUMERIC,           -- expects to be victim next 3 months
    PRIMARY KEY (quarter, city_code)
);

CREATE INDEX IF NOT EXISTS idx_ensu_quarter ON ensu_stats (quarter_date);

COMMIT;
