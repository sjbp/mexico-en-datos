"""IMSS Insured Workers Pipeline — health coverage proxy.

Downloads monthly CSV data from IMSS datos abiertos on insured workers,
aggregates by municipality and sector, and stores as health coverage indicators
in the indicator_values table (topic='health').

Data source:
    http://datos.imss.gob.mx/dataset/asg-{year}
    Monthly CSV files with columns:
    - cve_delegacion: IMSS delegation code
    - cve_subdelegacion: sub-delegation
    - cve_municipio: municipality code (maps to INEGI geo codes)
    - sector_economico_1..4: SCIAN sector codes
    - trab_asegurados: total insured workers
    - no_trab: employer count
    - ta_sal: average salary of insured workers
    - sexo: M/F
    - rango_edad: age range
    - rango_uma: salary range in UMA

Processing logic:
    1. Download monthly CSVs for the requested year.
    2. Aggregate insured workers by state (2-digit geo_code) and nationally.
    3. Store monthly totals as indicator_values with indicator_id='imss_insured_workers'
       and topic='health'.
    4. Optionally compute coverage rate = insured / CONAPO population estimate.

Usage:
    python -m ingest.pipelines.health.imss_coverage --year 2024
    python -m ingest.pipelines.health.imss_coverage --full
    python -m ingest.pipelines.health.imss_coverage --dry-run
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

logger = logging.getLogger("ingest.pipelines.health.imss_coverage")

BASE_URL = "http://datos.imss.gob.mx/dataset/asg-{year}"
AVAILABLE_YEARS = list(range(2015, 2026))

# IMSS delegation → INEGI state code mapping (simplified, needs full mapping)
DELEGATION_TO_STATE: dict[str, str] = {
    # This mapping needs to be populated from IMSS catalog.
    # IMSS delegations don't map 1:1 to states in all cases.
}


def download_imss_data(year: int, cache_dir: Path | None = None) -> list[Path]:
    """Download IMSS monthly CSV files for a given year.

    Returns list of paths to downloaded CSV files.
    Note: IMSS data portal structure varies by year. This function handles
    the common patterns.
    """
    if cache_dir is None:
        cache_dir = Path("data/cache/imss")
    cache_dir.mkdir(parents=True, exist_ok=True)

    # TODO: Implement actual download logic.
    # IMSS datos abiertos has varying URL patterns per year.
    # Some years provide a single annual ZIP, others monthly CSVs.
    # Need to scrape the dataset page to find actual download links.
    logger.warning("Download not yet implemented — use cached files in %s", cache_dir)
    return list(cache_dir.glob(f"*{year}*.csv"))


def process_year(year: int, *, dry_run: bool = False) -> list[dict[str, Any]]:
    """Process one year of IMSS data into indicator_values rows.

    Returns list of dicts with keys matching indicator_values schema:
    indicator_id, geo_code, period, period_date, value, status.
    """
    csv_files = download_imss_data(year)
    if not csv_files:
        logger.warning("No CSV files found for year %d", year)
        return []

    # Accumulate monthly state-level totals
    # Key: (month, geo_code) -> total insured workers
    monthly_totals: dict[tuple[str, str], int] = {}

    for csv_path in csv_files:
        logger.info("Processing %s", csv_path)
        with open(csv_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                workers = int(row.get("trab_asegurados", 0) or 0)
                # Extract month from filename or date column
                # Build state geo_code from delegation mapping
                # Aggregate into monthly_totals
                pass  # TODO: implement row-level processing

    # Convert to indicator_values format
    rows = []
    for (month, geo_code), total in monthly_totals.items():
        rows.append({
            "indicator_id": "imss_insured_workers",
            "geo_code": geo_code,
            "period": f"{year}/{month}",
            "period_date": f"{year}-{month}-01",
            "value": total,
            "status": "final",
        })

    logger.info("Year %d: %d indicator_values rows", year, len(rows))
    return rows


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Process IMSS insured workers data into health coverage indicators."
    )
    parser.add_argument("--year", type=int, default=None, help="Process a single year.")
    parser.add_argument("--full", action="store_true", help="Process all available years.")
    parser.add_argument("--dry-run", action="store_true", help="Don't write to DB.")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    years = AVAILABLE_YEARS if args.full else ([args.year] if args.year else [2024])

    conn = None
    if not args.dry_run:
        conn = psycopg2.connect(os.getenv("DATABASE_URL", ""))
        logger.info("Connected to database.")

    total = 0
    try:
        for year in years:
            rows = process_year(year, dry_run=args.dry_run)
            if not args.dry_run and conn and rows:
                # Reuse existing upsert_values from db utils
                from ingest.utils.db import upsert_values
                total += upsert_values(conn, "imss_insured_workers", rows)
            else:
                logger.info("[DRY RUN] Would upsert %d rows for year %d", len(rows), year)
    finally:
        if conn:
            conn.close()

    logger.info("Done. Total rows upserted: %d", total)


if __name__ == "__main__":
    main()
