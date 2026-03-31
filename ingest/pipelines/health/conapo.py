"""CONAPO Life Expectancy & Population Projections Pipeline.

Downloads CONAPO's population projections and life expectancy estimates from
their published Excel files, extracts key indicators, and stores them in the
indicator_values table (topic='health').

Data source:
    https://www.gob.mx/conapo/acciones-y-programas/conciliacion-demografica-de-mexico-1950-2015-y-proyecciones-de-la-poblacion-de-mexico-y-de-las-entidades-federativas-2016-2050
    Also: https://datos.gob.mx/busca/dataset/proyecciones-de-la-poblacion-de-mexico-y-de-las-entidades-federativas-2016-2050

Key indicators extracted:
    - life_expectancy: Life expectancy at birth (years), by state and national
    - infant_mortality_rate: Deaths under 1 year per 1,000 live births
    - population_projection: Mid-year population estimate by state, year, sex, age group

Processing logic:
    1. Download CONAPO Excel files (projections by state, mortality indicators).
    2. Parse sheets for life expectancy, infant mortality, and population.
    3. Normalize into indicator_values format (one row per indicator/geo/period).
    4. Upsert into indicator_values with topic='health'.

Usage:
    python -m ingest.pipelines.health.conapo --full
    python -m ingest.pipelines.health.conapo --indicator life_expectancy
    python -m ingest.pipelines.health.conapo --dry-run
"""

import argparse
import logging
import os
from pathlib import Path
from typing import Any

import psycopg2
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ingest.pipelines.health.conapo")

# CONAPO publishes projection series periodically. These URLs may need updating.
CONAPO_URLS = {
    "projections_state": "https://www.gob.mx/cms/uploads/attachment/file/XXXXX/Proyecciones_Entidades.xlsx",
    "mortality_indicators": "https://www.gob.mx/cms/uploads/attachment/file/XXXXX/Indicadores_Mortalidad.xlsx",
}

INDICATORS = {
    "life_expectancy": {
        "name_es": "Esperanza de vida al nacer",
        "unit": "years",
        "frequency": "annual",
    },
    "infant_mortality_rate": {
        "name_es": "Tasa de mortalidad infantil",
        "unit": "per_1000_births",
        "frequency": "annual",
    },
}


def download_conapo_files(cache_dir: Path | None = None) -> dict[str, Path]:
    """Download CONAPO Excel files. Returns dict of label -> path."""
    if cache_dir is None:
        cache_dir = Path("data/cache/conapo")
    cache_dir.mkdir(parents=True, exist_ok=True)

    # TODO: Implement download. CONAPO URLs change periodically and may require
    # scraping the CONAPO page to find current file links.
    logger.warning("Download not yet implemented — use cached files in %s", cache_dir)
    return {}


def parse_life_expectancy(excel_path: Path) -> list[dict[str, Any]]:
    """Parse life expectancy data from CONAPO Excel.

    Returns list of indicator_values-compatible dicts.
    """
    # TODO: Implement Excel parsing with openpyxl or pandas.
    # CONAPO files typically have one sheet per indicator with states as rows
    # and years as columns (or vice versa).
    logger.info("Would parse life expectancy from %s", excel_path)
    return []


def parse_infant_mortality(excel_path: Path) -> list[dict[str, Any]]:
    """Parse infant mortality rate from CONAPO Excel."""
    logger.info("Would parse infant mortality from %s", excel_path)
    return []


def parse_population_projections(excel_path: Path) -> list[dict[str, Any]]:
    """Parse mid-year population projections by state, year, sex, age group.

    These population denominators are critical for computing rates_per_100k
    in the mortality pipeline.
    """
    logger.info("Would parse population projections from %s", excel_path)
    return []


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Process CONAPO life expectancy and population projections."
    )
    parser.add_argument("--indicator", type=str, default=None,
                        help="Process a single indicator (life_expectancy, infant_mortality_rate).")
    parser.add_argument("--full", action="store_true", help="Process all indicators.")
    parser.add_argument("--dry-run", action="store_true", help="Don't write to DB.")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    files = download_conapo_files()
    if not files:
        logger.warning("No CONAPO files available. Exiting.")
        return

    conn = None
    if not args.dry_run:
        conn = psycopg2.connect(os.getenv("DATABASE_URL", ""))
        logger.info("Connected to database.")

    try:
        # Register indicator metadata
        if conn:
            from ingest.utils.db import upsert_indicator
            for ind_id, meta in INDICATORS.items():
                upsert_indicator(conn, {
                    "id": ind_id,
                    "name_es": meta["name_es"],
                    "name_en": "",
                    "topic": "health",
                    "subtopic": "demographics",
                    "unit": meta["unit"],
                    "frequency": meta["frequency"],
                    "source": "CONAPO",
                    "geo_levels": ["national", "state"],
                })

        # Process each indicator
        # TODO: Call parse functions and upsert results
        logger.info("Processing complete (skeleton — parsing not yet implemented).")
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    main()
