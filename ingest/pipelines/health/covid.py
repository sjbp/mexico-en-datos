"""COVID-19 Historical Data Pipeline.

Downloads the DGE (Direccion General de Epidemiologia) COVID-19 open dataset,
processes case-level records into aggregated statistics, and stores results
in the mortality_stats table (cause_group='covid19') and as health indicators.

Data source:
    https://datos.gob.mx/busca/dataset/informacion-referente-a-casos-covid-19-en-mexico
    Direct download: https://datosabiertos.salud.gob.mx/gobmx/salud/datos_abiertos/datos_abiertos_covid19.zip

This is one of the largest open datasets in Mexico (~20M+ rows covering 2020-2023).
Key columns:
    - FECHA_INGRESO: admission date
    - FECHA_SINTOMAS: symptom onset date
    - FECHA_DEF: date of death (9999-99-99 = survived)
    - ENTIDAD_RES: state of residence
    - MUNICIPIO_RES: municipality of residence
    - SEXO: 1=F, 2=M
    - EDAD: age in years
    - CLASIFICACION_FINAL: 1-3 = confirmed COVID, 4-7 = not COVID
    - TIPO_PACIENTE: 1=outpatient, 2=hospitalized
    - INTUBADO: 1=yes, 2=no (if hospitalized)
    - DIABETES, HIPERTENSION, OBESIDAD, etc.: comorbidity flags (1=yes, 2=no)

Processing logic:
    1. Download and extract the CSV (~4GB uncompressed).
    2. Filter to confirmed cases (CLASIFICACION_FINAL in 1,2,3).
    3. Aggregate deaths by year, state, age group, sex into mortality_stats.
    4. Aggregate case counts, hospitalizations, deaths by month for time series.
    5. Compute comorbidity prevalence among deaths vs. survivors.

Usage:
    python -m ingest.pipelines.health.covid --full
    python -m ingest.pipelines.health.covid --dry-run
    python -m ingest.pipelines.health.covid --deaths-only
"""

import argparse
import csv
import logging
import os
from pathlib import Path
from typing import Any

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ingest.pipelines.health.covid")

COVID_DATA_URL = "https://datosabiertos.salud.gob.mx/gobmx/salud/datos_abiertos/datos_abiertos_covid19.zip"

# Confirmed COVID classifications
CONFIRMED_CLASSIFICATIONS = {"1", "2", "3"}

AGE_BRACKETS = [
    (0, 4, "0-4"),
    (5, 14, "5-14"),
    (15, 24, "15-24"),
    (25, 34, "25-34"),
    (35, 44, "35-44"),
    (45, 54, "45-54"),
    (55, 64, "55-64"),
    (65, 74, "65-74"),
    (75, 999, "75+"),
]

COMORBIDITIES = [
    "DIABETES", "HIPERTENSION", "OBESIDAD", "TABAQUISMO",
    "CARDIOVASCULAR", "RENAL_CRONICA", "EPOC", "ASMA", "INMUSUPR",
]


def age_to_bracket(age: int | None) -> str:
    """Convert age to bracket string."""
    if age is None or age < 0:
        return "unknown"
    for lo, hi, label in AGE_BRACKETS:
        if lo <= age <= hi:
            return label
    return "75+"


def download_covid_data(cache_dir: Path | None = None) -> Path | None:
    """Download COVID-19 dataset ZIP and extract CSV.

    Returns path to extracted CSV, or None on failure.
    WARNING: This file is ~4GB uncompressed. Ensure sufficient disk space.
    """
    import urllib.request
    import zipfile

    if cache_dir is None:
        cache_dir = Path("data/cache/covid")
    cache_dir.mkdir(parents=True, exist_ok=True)

    # Check for cached CSV first
    csv_files = list(cache_dir.glob("*.csv"))
    if csv_files:
        logger.info("Using cached COVID CSV: %s", csv_files[0])
        return csv_files[0]

    zip_path = cache_dir / "datos_abiertos_covid19.zip"
    try:
        logger.info("Downloading COVID dataset (~600MB compressed)...")
        urllib.request.urlretrieve(COVID_DATA_URL, zip_path)
    except Exception:
        logger.exception("Failed to download COVID data")
        return None

    logger.info("Extracting ZIP...")
    with zipfile.ZipFile(zip_path, "r") as zf:
        csv_names = [n for n in zf.namelist() if n.lower().endswith(".csv")]
        if not csv_names:
            logger.error("No CSV found in COVID ZIP")
            return None
        zf.extract(csv_names[0], cache_dir)
        return cache_dir / csv_names[0]


def process_covid_deaths(csv_path: Path) -> list[dict[str, Any]]:
    """Process COVID CSV into mortality_stats rows (deaths only).

    Returns list of dicts for upsert into mortality_stats.
    """
    # (year, geo_code, age_group, sex) -> deaths
    counts: dict[tuple, int] = {}

    logger.info("Processing COVID deaths from %s (this may take several minutes)...", csv_path)
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Only confirmed cases
            if row.get("CLASIFICACION_FINAL", "") not in CONFIRMED_CLASSIFICATIONS:
                continue

            # Only deaths (FECHA_DEF != 9999-99-99)
            fecha_def = row.get("FECHA_DEF", "9999-99-99").strip()
            if fecha_def == "9999-99-99" or not fecha_def:
                continue

            try:
                year = int(fecha_def[:4])
            except (ValueError, IndexError):
                continue

            ent = row.get("ENTIDAD_RES", "00").strip().zfill(2)
            sex_raw = row.get("SEXO", "")
            sex = "F" if sex_raw == "1" else "M" if sex_raw == "2" else "unknown"

            try:
                age = int(row.get("EDAD", ""))
            except (ValueError, TypeError):
                age = None
            age_group = age_to_bracket(age)

            # State-level
            key = (year, ent, age_group, sex)
            counts[key] = counts.get(key, 0) + 1

            # National
            key_nat = (year, "00", age_group, sex)
            counts[key_nat] = counts.get(key_nat, 0) + 1

            # Totals
            key_all = (year, ent, "all", "all")
            counts[key_all] = counts.get(key_all, 0) + 1
            key_nat_all = (year, "00", "all", "all")
            counts[key_nat_all] = counts.get(key_nat_all, 0) + 1

    rows = []
    for (year, geo, age_grp, sx), deaths in counts.items():
        rows.append({
            "year": year,
            "geo_code": geo,
            "cause_group": "covid19",
            "icd10_range": "U07",
            "age_group": age_grp,
            "sex": sx,
            "deaths": deaths,
            "rate_per_100k": None,
        })

    logger.info("Processed %d COVID mortality aggregate rows", len(rows))
    return rows


def upsert_mortality(conn: Any, rows: list[dict[str, Any]]) -> int:
    """Bulk upsert mortality_stats rows for COVID."""
    if not rows:
        return 0

    sql = """
        INSERT INTO mortality_stats (
            year, geo_code, cause_group, icd10_range, age_group, sex, deaths, rate_per_100k
        ) VALUES (
            %(year)s, %(geo_code)s, %(cause_group)s, %(icd10_range)s,
            %(age_group)s, %(sex)s, %(deaths)s, %(rate_per_100k)s
        )
        ON CONFLICT (year, geo_code, cause_group, age_group, sex) DO UPDATE SET
            icd10_range   = EXCLUDED.icd10_range,
            deaths        = EXCLUDED.deaths,
            rate_per_100k = EXCLUDED.rate_per_100k
    """
    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, sql, rows, page_size=1000)
    conn.commit()
    logger.info("Upserted %d COVID mortality rows", len(rows))
    return len(rows)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Process DGE COVID-19 historical data."
    )
    parser.add_argument("--full", action="store_true", help="Full processing.")
    parser.add_argument("--deaths-only", action="store_true",
                        help="Only process death aggregates (faster).")
    parser.add_argument("--dry-run", action="store_true", help="Don't write to DB.")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    csv_path = download_covid_data()
    if csv_path is None:
        logger.error("No COVID data available.")
        return

    rows = process_covid_deaths(csv_path)

    if args.dry_run:
        logger.info("[DRY RUN] Would upsert %d rows", len(rows))
        return

    conn = psycopg2.connect(os.getenv("DATABASE_URL", ""))
    try:
        upsert_mortality(conn, rows)
    finally:
        conn.close()

    logger.info("Done.")


if __name__ == "__main__":
    main()
