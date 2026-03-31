"""ENSU (Encuesta Nacional de Seguridad Publica Urbana) pipeline.

Downloads and processes ENSU quarterly data from INEGI to compute:
- Percentage of population that feels unsafe in their city
- Percentage that feels unsafe at night
- Percentage that witnessed criminal activity
- Percentage that expects to be a crime victim in the next 3 months

Usage:
    uv run python -m ingest.pipelines.ensu --quarter 2024/Q1
    uv run python -m ingest.pipelines.ensu --quarter 2024/Q1 --dry-run
    uv run python -m ingest.pipelines.ensu --all  # Process all available quarters

Data source:
    https://www.inegi.org.mx/programas/ensu/
    Published quarterly since 2013/Q4. Covers 75+ urban areas.

ENSU microdata structure:
    Single table (one row per selected person 18+ in urban areas):
    - CVE_CD: City code (2-3 digit, maps to INEGI city catalog)
    - NOM_CD: City name
    - FAC_ELE: Person expansion factor (survey weight)
    - BP1_1: Perception of safety in city (1=seguro, 2=inseguro)
    - BP1_2A_01..BP1_2A_07: Unsafe places (street, market, park, ATM, etc.)
    - BP1_3: Safety at night going out (1=seguro, 2=inseguro)
    - BP1_4A: Witnessed antisocial behavior (1=si, 2=no)
    - BP1_4B_01..BP1_4B_13: Types of antisocial behavior witnessed
    - BP1_5: Expects to be victim next 3 months (1=si, 2=no)

Aggregation steps:
    1. Download quarterly ENSU ZIP (or tabulated data)
    2. Load microdata CSV
    3. Group by CVE_CD (city)
    4. For each city:
       a. Total weighted population = sum(FAC_ELE)
       b. feels_unsafe_pct = sum(FAC_ELE where BP1_1==2) / total * 100
       c. feels_unsafe_night_pct = sum(FAC_ELE where BP1_3==2) / total * 100
       d. witnessed_crime_pct = sum(FAC_ELE where BP1_4A==1) / total * 100
       e. expects_crime_pct = sum(FAC_ELE where BP1_5==1) / total * 100
    5. Upsert into ensu_stats table
"""

import argparse
import logging
import os
import sys
import tempfile
from datetime import date
from pathlib import Path
from typing import Any

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ingest.pipelines.ensu")

# ENSU has been published quarterly since 2013/Q4
# Generate available quarters
AVAILABLE_QUARTERS: list[str] = []
for y in range(2013, 2027):
    start_q = 4 if y == 2013 else 1
    end_q = 4
    for q in range(start_q, end_q + 1):
        AVAILABLE_QUARTERS.append(f"{y}/Q{q}")

# Download URL pattern (varies by year, this is approximate)
URL_PATTERN = "https://www.inegi.org.mx/contenidos/programas/ensu/{year}/microdatos/ensu{year}_{month:02d}_csv.zip"

# City code to name mapping (subset — full catalog has 75+ cities)
# In production, load from INEGI's city catalog
CITY_CATALOG: dict[str, str] = {
    "1": "Aguascalientes",
    "2": "Tijuana",
    "3": "La Paz",
    "4": "Campeche",
    "5": "Saltillo",
    "6": "Colima-Villa de Alvarez",
    "7": "Tuxtla Gutierrez",
    "8": "Cd. Juarez",
    "9": "Chihuahua",
    "10": "CDMX",
    # ... full catalog loaded at runtime from INEGI reference
}


def quarter_to_date(quarter: str) -> date:
    """Convert '2024/Q1' to date(2024, 1, 1)."""
    parts = quarter.split("/")
    year = int(parts[0])
    q = int(parts[1].replace("Q", ""))
    month = (q - 1) * 3 + 1
    return date(year, month, 1)


def get_download_url(quarter: str) -> str:
    """Build the download URL for a given quarter.

    NOTE: ENSU URL patterns vary by year. Some years use month-based naming,
    others use quarter. This is approximate — verify against INEGI's actual
    file listing for each year.
    """
    parts = quarter.split("/")
    year = int(parts[0])
    q = int(parts[1].replace("Q", ""))
    # Quarter end month (ENSU reference month is last month of quarter)
    end_month = q * 3
    return URL_PATTERN.format(year=year, month=end_month)


def download_and_extract(quarter: str, dest_dir: Path) -> Path:
    """Download ENSU microdata ZIP and extract to dest_dir.

    NOTE: Skeleton — implement actual download with requests.
    """
    url = get_download_url(quarter)
    logger.info("Would download ENSU %s from: %s", quarter, url)
    logger.info("Extract to: %s", dest_dir)

    # TODO: Implement actual download
    raise NotImplementedError(
        f"Download not yet implemented. Manually download from {url} "
        f"and extract CSVs to {dest_dir}"
    )


def process_quarter(quarter: str, csv_dir: Path) -> list[dict[str, Any]]:
    """Process ENSU microdata for a single quarter.

    Returns list of dicts ready for upsert into ensu_stats.

    Processing logic:
    1. Find the main microdata CSV in csv_dir
    2. Read with pandas (encoding latin-1, INEGI standard)
    3. Group by CVE_CD (city code)
    4. For each city, compute weighted percentages:
       - feels_unsafe_pct: BP1_1 == 2
       - feels_unsafe_night_pct: BP1_3 == 2
       - witnessed_crime_pct: BP1_4A == 1
       - expects_crime_pct: BP1_5 == 1
    5. Map CVE_CD to city name using NOM_CD from data or catalog
    """
    # TODO: Implement with pandas
    # import pandas as pd
    # df = pd.read_csv(csv_dir / "ensu_cb.csv", encoding="latin-1")
    #
    # results = []
    # for city_code, group in df.groupby("CVE_CD"):
    #     total_weight = group["FAC_ELE"].sum()
    #     if total_weight == 0:
    #         continue
    #     city_name = group["NOM_CD"].iloc[0] if "NOM_CD" in group.columns else CITY_CATALOG.get(str(city_code), f"Ciudad {city_code}")
    #     results.append({
    #         "quarter": quarter,
    #         "quarter_date": quarter_to_date(quarter),
    #         "city_code": str(city_code),
    #         "city_name": city_name,
    #         "feels_unsafe_pct": round(group.loc[group["BP1_1"] == 2, "FAC_ELE"].sum() / total_weight * 100, 1),
    #         "feels_unsafe_night_pct": round(group.loc[group["BP1_3"] == 2, "FAC_ELE"].sum() / total_weight * 100, 1),
    #         "witnessed_crime_pct": round(group.loc[group["BP1_4A"] == 1, "FAC_ELE"].sum() / total_weight * 100, 1),
    #         "expects_crime_pct": round(group.loc[group["BP1_5"] == 1, "FAC_ELE"].sum() / total_weight * 100, 1),
    #     })
    # return results

    logger.warning("process_quarter: skeleton — no microdata processed for %s", quarter)
    return []


def upsert_ensu(conn: Any, rows: list[dict[str, Any]]) -> int:
    """Upsert rows into ensu_stats table."""
    if not rows:
        return 0

    sql = """
        INSERT INTO ensu_stats (
            quarter, quarter_date, city_code, city_name,
            feels_unsafe_pct, feels_unsafe_night_pct,
            witnessed_crime_pct, expects_crime_pct
        ) VALUES (
            %(quarter)s, %(quarter_date)s, %(city_code)s, %(city_name)s,
            %(feels_unsafe_pct)s, %(feels_unsafe_night_pct)s,
            %(witnessed_crime_pct)s, %(expects_crime_pct)s
        )
        ON CONFLICT (quarter, city_code) DO UPDATE SET
            quarter_date           = EXCLUDED.quarter_date,
            city_name              = EXCLUDED.city_name,
            feels_unsafe_pct       = EXCLUDED.feels_unsafe_pct,
            feels_unsafe_night_pct = EXCLUDED.feels_unsafe_night_pct,
            witnessed_crime_pct    = EXCLUDED.witnessed_crime_pct,
            expects_crime_pct      = EXCLUDED.expects_crime_pct
    """

    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, sql, rows, page_size=500)
    conn.commit()
    logger.info("Upserted %d ENSU rows", len(rows))
    return len(rows)


def run_quarter(quarter: str, *, dry_run: bool = False, conn: Any = None) -> int:
    """Process a single ENSU quarter end-to-end."""
    logger.info("=== Processing ENSU %s ===", quarter)

    if dry_run:
        logger.info("[DRY RUN] Would process ENSU %s from %s", quarter, get_download_url(quarter))
        return 0

    with tempfile.TemporaryDirectory(prefix=f"ensu_{quarter.replace('/', '_')}_") as tmpdir:
        csv_dir = Path(tmpdir)

        try:
            download_and_extract(quarter, csv_dir)
        except NotImplementedError as e:
            logger.warning("%s", e)
            return 0

        rows = process_quarter(quarter, csv_dir)
        logger.info("Processed %d city rows for ENSU %s", len(rows), quarter)

        if conn is not None and rows:
            return upsert_ensu(conn, rows)

    return 0


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Process ENSU urban safety perception survey data."
    )
    parser.add_argument(
        "--quarter",
        type=str,
        default=None,
        help="Quarter to process, e.g. '2024/Q1'.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Process all available quarters.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be processed without downloading or writing to DB.",
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

    if not args.quarter and not args.all:
        parser.error("Specify --quarter YYYY/QN or --all")

    quarters = AVAILABLE_QUARTERS if args.all else [args.quarter]

    # Validate quarters
    for q in quarters:
        if q not in AVAILABLE_QUARTERS:
            logger.error("Quarter %s not recognized. Use format YYYY/QN (e.g. 2024/Q1)", q)
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

    total = 0
    try:
        for quarter in quarters:
            total += run_quarter(quarter, dry_run=args.dry_run, conn=conn)
    finally:
        if conn is not None:
            conn.close()

    logger.info("Done. Total rows upserted: %d", total)


if __name__ == "__main__":
    main()
