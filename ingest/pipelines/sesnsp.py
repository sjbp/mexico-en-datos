"""SESNSP crime incidence data pipeline.

Downloads monthly homicide and other crime counts by state from the
Secretariado Ejecutivo del Sistema Nacional de Seguridad Pública.

Usage:
    python -m ingest.pipelines.sesnsp --full
    python -m ingest.pipelines.sesnsp --year 2024

Data source:
    https://www.gob.mx/sesnsp/acciones-y-programas/datos-abiertos-de-incidencia-delictiva

The SESNSP publishes monthly crime counts aggregated by:
    - State (entidad federativa)
    - Crime type and subtype (tipo de delito, subtipo)
    - Modality (modalidad)
    - Sex of victim (for some crime types)

The main CSV columns:
    - Año, Clave_Ent, Entidad, Tipo de delito, Subtipo de delito, Modalidad
    - Enero, Febrero, ..., Diciembre (monthly crime counts)

For homicide rate computation we need:
    1. Filter rows where 'Tipo de delito' contains 'Homicidio'
       (includes 'Homicidio doloso' and 'Homicidio culposo')
    2. Sum monthly counts by state and nationally
    3. Annualize and divide by CONAPO population estimates per 100k inhabitants

Output is stored in the indicator_values table with a dedicated indicator entry.
"""

import argparse
import csv
import logging
import os
import sys
import tempfile
from pathlib import Path
from typing import Any

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ingest.pipelines.sesnsp")

# Available years — SESNSP publishes data from 2015 onward
AVAILABLE_YEARS = list(range(2015, 2026))

# The SESNSP data portal URL — files are manually downloadable or
# available via a direct link that changes with each publication.
DATA_PORTAL_URL = (
    "https://www.gob.mx/sesnsp/acciones-y-programas/"
    "datos-abiertos-de-incidencia-delictiva"
)

# Monthly column names in the SESNSP CSV
MONTH_COLUMNS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

# State codes mapping (INEGI 2-digit codes)
# Used to normalize SESNSP Clave_Ent to our geo_code format
STATE_CODES = {
    1: "01", 2: "02", 3: "03", 4: "04", 5: "05", 6: "06", 7: "07", 8: "08",
    9: "09", 10: "10", 11: "11", 12: "12", 13: "13", 14: "14", 15: "15",
    16: "16", 17: "17", 18: "18", 19: "19", 20: "20", 21: "21", 22: "22",
    23: "23", 24: "24", 25: "25", 26: "26", 27: "27", 28: "28", 29: "29",
    30: "30", 31: "31", 32: "32",
}

# CONAPO mid-year population estimates (2024, thousands)
# TODO: Replace with dynamic lookup from a population table or CONAPO API
CONAPO_POPULATION_2024: dict[str, int] = {
    "00": 132_291_000,  # National
    "01": 1_572_000,    # Aguascalientes
    "02": 4_076_000,    # Baja California
    "03": 929_000,      # Baja California Sur
    "04": 1_086_000,    # Campeche
    "05": 3_348_000,    # Coahuila
    "06": 869_000,      # Colima
    "07": 6_028_000,    # Chiapas
    "08": 3_959_000,    # Chihuahua
    "09": 9_252_000,    # Ciudad de México
    "10": 1_993_000,    # Durango
    "11": 6_439_000,    # Guanajuato
    "12": 3_821_000,    # Guerrero
    "13": 3_248_000,    # Hidalgo
    "14": 8_698_000,    # Jalisco
    "15": 17_633_000,   # Estado de México
    "16": 5_040_000,    # Michoacán
    "17": 2_085_000,    # Morelos
    "18": 1_389_000,    # Nayarit
    "19": 5_931_000,    # Nuevo León
    "20": 4_250_000,    # Oaxaca
    "21": 6_886_000,    # Puebla
    "22": 2_436_000,    # Querétaro
    "23": 2_079_000,    # Quintana Roo
    "24": 2_979_000,    # San Luis Potosí
    "25": 3_268_000,    # Sinaloa
    "26": 3_193_000,    # Sonora
    "27": 2_690_000,    # Tabasco
    "28": 3_935_000,    # Tamaulipas
    "29": 1_467_000,    # Tlaxcala
    "30": 8_733_000,    # Veracruz
    "31": 2_345_000,    # Yucatán
    "32": 1_728_000,    # Zacatecas
}

# Indicator ID for homicide rate in our indicator_values table
# TODO: Create this indicator in the indicators table via a migration
HOMICIDE_RATE_INDICATOR_ID = "sesnsp_homicide_rate"
HOMICIDE_COUNT_INDICATOR_ID = "sesnsp_homicide_count"


def download_sesnsp(year: int | None = None) -> Path:
    """Download the SESNSP incidence CSV.

    The SESNSP publishes a single CSV with all years of data. If `year`
    is provided, we still download the full file and filter later.

    Returns path to the downloaded CSV file.

    NOTE: Skeleton — the actual download URL changes with each release
    and may require scraping the portal page to find the current link.
    """
    logger.info(
        "Would download SESNSP incidence data from: %s", DATA_PORTAL_URL
    )

    # TODO: Implement actual download
    # 1. Fetch the portal page
    # 2. Parse the download link for the latest CSV/XLSX
    # 3. Download the file
    # 4. If XLSX, convert to CSV using openpyxl
    #
    # import requests
    # resp = requests.get(download_url, stream=True)
    # with open(dest / "sesnsp_incidence.csv", "wb") as f:
    #     for chunk in resp.iter_content(chunk_size=8192):
    #         f.write(chunk)

    raise NotImplementedError(
        f"Download not yet implemented. Manually download the incidence CSV from "
        f"{DATA_PORTAL_URL} and pass the path via --csv-path."
    )


def process_incidence(
    csv_path: Path,
    year: int | None = None,
    crime_filter: str = "Homicidio doloso",
) -> list[dict[str, Any]]:
    """Parse SESNSP incidence CSV and aggregate homicide counts.

    Args:
        csv_path: Path to the SESNSP CSV file.
        year: If set, only process rows for this year. Otherwise all years.
        crime_filter: Crime type to filter on. Default is intentional homicide.

    Returns:
        List of dicts with keys:
            year, month (1-12), geo_code, crime_type, count
    """
    results: list[dict[str, Any]] = []

    logger.info("Processing SESNSP CSV: %s (filter: %s)", csv_path, crime_filter)

    # Try common encodings for Mexican government data
    for encoding in ("utf-8", "latin-1", "cp1252"):
        try:
            with open(csv_path, "r", encoding=encoding) as f:
                reader = csv.DictReader(f)

                for row in reader:
                    row_year = int(row.get("Año", 0))
                    if year and row_year != year:
                        continue

                    crime_type = row.get("Tipo de delito", "")
                    if crime_filter not in crime_type:
                        continue

                    # Normalize state code
                    raw_code = row.get("Clave_Ent", "0")
                    try:
                        state_int = int(raw_code)
                    except ValueError:
                        continue
                    geo_code = STATE_CODES.get(state_int, f"{state_int:02d}")

                    # Extract monthly counts
                    for month_idx, month_col in enumerate(MONTH_COLUMNS, start=1):
                        raw_val = row.get(month_col, "0").strip()
                        try:
                            count = int(raw_val)
                        except ValueError:
                            count = 0

                        results.append({
                            "year": row_year,
                            "month": month_idx,
                            "geo_code": geo_code,
                            "crime_type": crime_filter,
                            "count": count,
                        })

            logger.info(
                "Parsed %d monthly records (encoding=%s)", len(results), encoding
            )
            break  # Success — stop trying encodings
        except UnicodeDecodeError:
            continue
    else:
        logger.error("Could not decode CSV with any supported encoding")

    return results


def aggregate_national(
    records: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Aggregate state-level monthly counts into national totals.

    Groups by (year, month) and sums counts across all states.
    Returns records with geo_code='00'.
    """
    from collections import defaultdict

    totals: dict[tuple[int, int], int] = defaultdict(int)
    crime_type = records[0]["crime_type"] if records else "Homicidio doloso"

    for rec in records:
        key = (rec["year"], rec["month"])
        totals[key] += rec["count"]

    return [
        {
            "year": yr,
            "month": mo,
            "geo_code": "00",
            "crime_type": crime_type,
            "count": cnt,
        }
        for (yr, mo), cnt in sorted(totals.items())
    ]


def compute_rate(
    homicides: int,
    population: int,
    per: int = 100_000,
) -> float:
    """Compute homicide rate per 100k inhabitants.

    Args:
        homicides: Total homicide count for the period.
        population: Mid-year population estimate.
        per: Rate denominator (default 100,000).

    Returns:
        Rate as float, e.g., 25.2 means 25.2 homicides per 100k.
    """
    if population <= 0:
        return 0.0
    return (homicides / population) * per


def build_indicator_rows(
    records: list[dict[str, Any]],
    population: dict[str, int] | None = None,
) -> list[dict[str, Any]]:
    """Convert aggregated monthly counts to indicator_values rows.

    Produces two sets of rows:
    1. Monthly homicide counts (indicator_id = sesnsp_homicide_count)
    2. Annualized homicide rate per 100k (indicator_id = sesnsp_homicide_rate)

    Args:
        records: Output from process_incidence + aggregate_national.
        population: Dict mapping geo_code -> population. Defaults to CONAPO_POPULATION_2024.

    Returns:
        List of dicts ready for upsert into indicator_values.
    """
    if population is None:
        population = CONAPO_POPULATION_2024

    rows: list[dict[str, Any]] = []

    # Monthly count rows
    for rec in records:
        period = f"{rec['year']}/{rec['month']:02d}"
        period_date = f"{rec['year']}-{rec['month']:02d}-01"

        rows.append({
            "indicator_id": HOMICIDE_COUNT_INDICATOR_ID,
            "geo_code": rec["geo_code"],
            "period": period,
            "period_date": period_date,
            "value": rec["count"],
            "status": None,
        })

    # Annual rate rows — aggregate by (year, geo_code)
    from collections import defaultdict

    annual: dict[tuple[int, str], int] = defaultdict(int)
    for rec in records:
        annual[(rec["year"], rec["geo_code"])] += rec["count"]

    for (yr, geo), total_count in sorted(annual.items()):
        pop = population.get(geo)
        if not pop:
            logger.warning("No population data for geo_code=%s, skipping rate", geo)
            continue

        rate = compute_rate(total_count, pop)
        rows.append({
            "indicator_id": HOMICIDE_RATE_INDICATOR_ID,
            "geo_code": geo,
            "period": str(yr),
            "period_date": f"{yr}-06-15",  # Mid-year for annual
            "value": round(rate, 2),
            "status": None,
        })

    return rows


def upsert_indicator_values(
    conn: Any,
    rows: list[dict[str, Any]],
) -> int:
    """Upsert rows into indicator_values table.

    Returns number of rows upserted.
    """
    if not rows:
        return 0

    sql = """
        INSERT INTO indicator_values (
            indicator_id, geo_code, period, period_date, value, status
        ) VALUES (
            %(indicator_id)s, %(geo_code)s, %(period)s,
            %(period_date)s, %(value)s, %(status)s
        )
        ON CONFLICT (indicator_id, geo_code, period_date) DO UPDATE SET
            period = EXCLUDED.period,
            value  = EXCLUDED.value,
            status = EXCLUDED.status
    """

    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, sql, rows, page_size=500)
    conn.commit()
    logger.info("Upserted %d indicator_values rows", len(rows))
    return len(rows)


def ensure_indicators(conn: Any) -> None:
    """Create SESNSP indicator entries if they don't exist."""
    indicators = [
        {
            "id": HOMICIDE_COUNT_INDICATOR_ID,
            "name_es": "Homicidios dolosos (cuenta mensual)",
            "name_en": "Intentional homicides (monthly count)",
            "topic": "seguridad",
            "unit": "count",
            "frequency": "monthly",
            "source": "SESNSP",
        },
        {
            "id": HOMICIDE_RATE_INDICATOR_ID,
            "name_es": "Tasa de homicidios dolosos por 100 mil hab.",
            "name_en": "Intentional homicide rate per 100k",
            "topic": "seguridad",
            "unit": "rate_per_100k",
            "frequency": "annual",
            "source": "SESNSP",
        },
    ]

    sql = """
        INSERT INTO indicators (id, name_es, name_en, topic, unit, frequency, source)
        VALUES (%(id)s, %(name_es)s, %(name_en)s, %(topic)s, %(unit)s, %(frequency)s, %(source)s)
        ON CONFLICT (id) DO NOTHING
    """

    with conn.cursor() as cur:
        for ind in indicators:
            cur.execute(sql, ind)
    conn.commit()
    logger.info("Ensured SESNSP indicators exist")


def process_full(
    csv_path: Path,
    *,
    year: int | None = None,
    dry_run: bool = False,
    conn: Any = None,
) -> int:
    """Full pipeline: parse CSV, aggregate, compute rates, upsert.

    Returns number of rows upserted.
    """
    # 1. Parse and filter for homicidio doloso
    state_records = process_incidence(csv_path, year=year, crime_filter="Homicidio doloso")
    if not state_records:
        logger.warning("No homicide records found in CSV")
        return 0

    # 2. Compute national aggregates
    national_records = aggregate_national(state_records)
    all_records = state_records + national_records

    logger.info(
        "Processed %d state records + %d national records",
        len(state_records),
        len(national_records),
    )

    # 3. Build indicator_values rows (counts + rates)
    rows = build_indicator_rows(all_records)
    logger.info("Built %d indicator_values rows", len(rows))

    if dry_run:
        logger.info("[DRY RUN] Would upsert %d rows", len(rows))
        # Print sample
        for row in rows[:5]:
            logger.info("  Sample: %s", row)
        return 0

    # 4. Ensure indicator entries exist, then upsert
    if conn is not None:
        ensure_indicators(conn)
        return upsert_indicator_values(conn, rows)

    return 0


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Process SESNSP crime incidence data (homicides)."
    )
    parser.add_argument(
        "--csv-path",
        type=Path,
        default=None,
        help="Path to the SESNSP incidence CSV file (if already downloaded).",
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Process all years in the CSV.",
    )
    parser.add_argument(
        "--year",
        type=int,
        default=None,
        help=f"Process only this year (available: {AVAILABLE_YEARS[0]}-{AVAILABLE_YEARS[-1]}).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and aggregate but don't write to DB.",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable debug logging.",
    )
    args = parser.parse_args(argv)

    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    if not args.full and not args.year:
        parser.error("Specify --full or --year YYYY")

    # Resolve CSV path
    csv_path = args.csv_path
    if csv_path is None:
        try:
            csv_path = download_sesnsp(year=args.year)
        except NotImplementedError as e:
            logger.error("%s", e)
            sys.exit(1)

    if not csv_path.exists():
        logger.error("CSV file not found: %s", csv_path)
        sys.exit(1)

    # Validate year
    if args.year and args.year not in AVAILABLE_YEARS:
        logger.error(
            "Year %d not available. Valid range: %d-%d",
            args.year, AVAILABLE_YEARS[0], AVAILABLE_YEARS[-1],
        )
        sys.exit(1)

    # Connect to DB
    conn = None
    if not args.dry_run:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            logger.error("DATABASE_URL not set")
            sys.exit(1)
        try:
            conn = psycopg2.connect(database_url)
            logger.info("Connected to database.")
        except Exception:
            logger.exception("Failed to connect to database.")
            sys.exit(1)

    try:
        total = process_full(
            csv_path,
            year=args.year if not args.full else None,
            dry_run=args.dry_run,
            conn=conn,
        )
    finally:
        if conn is not None:
            conn.close()

    logger.info("Done. Total rows upserted: %d", total)


if __name__ == "__main__":
    main()
