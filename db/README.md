# Database

PostgreSQL schema and migrations for México en Datos, hosted on [Neon](https://neon.tech).

## Setup

Set your Neon connection string:

```bash
export DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

## Running migrations

Neon uses the standard PostgreSQL wire protocol, so `psql` works directly:

```bash
# 1. Create tables and indexes
psql $DATABASE_URL -f db/migrations/001_initial_schema.sql

# 2. Seed geographic areas (national + 32 states)
psql $DATABASE_URL -f db/migrations/002_seed_geographic_areas.sql
```

Run migrations in order. Each migration is wrapped in a transaction and is idempotent (uses `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`).

## Schema overview

| Table | Purpose |
|---|---|
| `geographic_areas` | National, state, and municipality reference data with INEGI codes |
| `indicators` | Catalog of INEGI indicators (topic, frequency, unit, source) |
| `indicator_values` | Time series data points keyed by indicator + geography + period |
