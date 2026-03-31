"""ENVIPE (Encuesta Nacional de Victimizacion y Percepcion sobre Seguridad Publica) pipeline.

Downloads and processes ENVIPE microdata from INEGI to compute:
- Victimization prevalence rates by state and crime type
- Cifra negra (% of crimes not reported to authorities)
- Trust in institutions (police, military, judges) by state
- Average cost of crime per victim

Usage:
    uv run python -m ingest.pipelines.envipe --year 2024
    uv run python -m ingest.pipelines.envipe --year 2024 --dry-run
    uv run python -m ingest.pipelines.envipe --all  # Process all available years (2011-2024)

Data source:
    https://www.inegi.org.mx/programas/envipe/
    Microdata ZIP: https://www.inegi.org.mx/contenidos/programas/envipe/{year}/microdatos/envipe{year}_csv.zip

ENVIPE microdata structure (3 main tables per year):
    - TPer_Vic1: Person-level victimization (one row per person 18+)
        Key columns: CVE_ENT (state), FAC_PER (person weight), AP4_1 (victim yes/no),
        AP4_2_01..AP4_2_10 (crime types experienced)
    - TPer_Vic2: Crime-event detail (one row per victimization event)
        Key columns: CVE_ENT, FAC_DEL (crime weight), AP5_4 (reported to authority),
        AP5_10_1..AP5_10_4 (reasons not reported), BPCOD_PRES (estimated cost)
    - TVivienda: Household-level perception and trust
        Key columns: CVE_ENT, FAC_HOG (household weight), AP1_1_01..AP1_1_08 (trust levels)

Crime type mapping (AP4_2_XX):
    01 = Robo total de vehiculo
    02 = Robo parcial de vehiculo
    03 = Robo en casa habitacion
    04 = Robo/asalto en calle o transporte publico
    05 = Robo en forma distinta
    06 = Fraude
    07 = Extorsion
    08 = Amenazas
    09 = Lesiones
    10 = Otros delitos (kidnapping, sexual, etc.)

Aggregation steps:
    1. Download and extract CSV ZIP for the target year
    2. Load person-level file (TPer_Vic1)
    3. For each state (CVE_ENT) and crime type:
       - Sum weighted victims (FAC_PER where AP4_1==1) / weighted population 18+
       - Compute prevalence rate per 100k
    4. Load crime-event file (TPer_Vic2)
    5. For each state and crime type:
       - Cifra negra = 1 - (weighted crimes reported / weighted total crimes)
       - Average cost = weighted mean of BPCOD_PRES
    6. Load household file (TVivienda)
    7. For each state:
       - Trust in police = weighted % responding "mucha" or "algo" confianza
       - Trust in military, judges similarly
    8. Upsert aggregated rows into envipe_stats table
"""

import argparse
import io
import logging
import os
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Any

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ingest.pipelines.envipe")

# Available years for ENVIPE microdata
AVAILABLE_YEARS = list(range(2011, 2025))

# Download URL pattern
URL_PATTERN = "https://www.inegi.org.mx/contenidos/programas/envipe/{year}/microdatos/envipe{year}_csv.zip"

# Crime type codes from AP4_2_XX columns → our normalized labels
CRIME_TYPE_MAP = {
    "01": "vehicle_theft",
    "02": "vehicle_partial_theft",
    "03": "home_robbery",
    "04": "street_robbery",
    "05": "other_robbery",
    "06": "fraud",
    "07": "extortion",
    "08": "threats",
    "09": "assault",
    "10": "other",
}

# Simplified crime type grouping for the main table
CRIME_GROUP_MAP = {
    "vehicle_theft": "robbery",
    "vehicle_partial_theft": "robbery",
    "home_robbery": "robbery",
    "street_robbery": "robbery",
    "other_robbery": "robbery",
    "fraud": "fraud",
    "extortion": "extortion",
    "threats": "threats",
    "assault": "assault",
    "other": "other",
}


def get_download_url(year: int) -> str:
    """Build the microdata download URL for a given year."""
    return URL_PATTERN.format(year=year)


def download_and_extract(year: int, dest_dir: Path) -> Path:
    """Download ENVIPE microdata ZIP and extract to dest_dir.

    Returns the path to the extracted directory containing CSVs.

    NOTE: This is a skeleton. In production, use requests or urllib to download
    the ~200MB ZIP file, with retry logic and progress reporting.
    """
    url = get_download_url(year)
    logger.info("Would download ENVIPE %d from: %s", year, url)
    logger.info("Extract to: %s", dest_dir)

    # TODO: Implement actual download
    # import requests
    # resp = requests.get(url, stream=True)
    # with open(dest_dir / f"envipe{year}.zip", "wb") as f:
    #     for chunk in resp.iter_content(chunk_size=8192):
    #         f.write(chunk)
    # with zipfile.ZipFile(dest_dir / f"envipe{year}.zip") as zf:
    #     zf.extractall(dest_dir)

    raise NotImplementedError(
        f"Download not yet implemented. Manually download from {url} "
        f"and extract CSVs to {dest_dir}"
    )


def process_victimization(year: int, csv_dir: Path) -> list[dict[str, Any]]:
    """Process TPer_Vic1 (person-level) to compute victimization prevalence rates.

    Returns list of dicts with keys: year, geo_code, crime_type, prevalence_rate.

    Processing logic:
    1. Read TPer_Vic1 CSV (person-level, one row per person 18+)
    2. Group by CVE_ENT (state code, 2-digit)
    3. For each state:
       a. Total weighted population 18+ = sum(FAC_PER)
       b. Total weighted victims = sum(FAC_PER where AP4_1 == 1)
       c. By crime type: sum(FAC_PER where AP4_2_XX == 1) for each XX
       d. Prevalence rate = (weighted victims / weighted pop) * 100_000
    4. Also compute national totals (geo_code='00')
    """
    # TODO: Implement with pandas
    # import pandas as pd
    # df = pd.read_csv(csv_dir / f"TPer_Vic1.csv", encoding="latin-1")
    # ...
    logger.warning("process_victimization: skeleton — no microdata processed")
    return []


def process_cifra_negra(year: int, csv_dir: Path) -> list[dict[str, Any]]:
    """Process TPer_Vic2 (crime-event level) to compute cifra negra and costs.

    Returns list of dicts with keys: year, geo_code, crime_type, cifra_negra,
    reported_rate, cost_per_victim.

    Processing logic:
    1. Read TPer_Vic2 CSV (one row per crime event reported in survey)
    2. Group by CVE_ENT and crime type
    3. For each group:
       a. Total weighted crimes = sum(FAC_DEL)
       b. Weighted reported crimes = sum(FAC_DEL where AP5_4 == 1)
       c. reported_rate = reported / total
       d. cifra_negra = 1 - reported_rate (as percentage)
       e. cost_per_victim = weighted mean of BPCOD_PRES (excluding missing/zero)
    4. Also compute national totals
    """
    # TODO: Implement with pandas
    logger.warning("process_cifra_negra: skeleton — no microdata processed")
    return []


def process_trust(year: int, csv_dir: Path) -> list[dict[str, Any]]:
    """Process TVivienda (household level) to compute trust in institutions.

    Returns list of dicts with keys: year, geo_code, trust_police, trust_military,
    trust_judges.

    Processing logic:
    1. Read TVivienda CSV (one row per household)
    2. Group by CVE_ENT
    3. Trust columns (AP1_1_XX) have values 1-4:
       1 = Mucha confianza, 2 = Algo, 3 = Poca, 4 = Nada
       Trust = weighted % responding 1 or 2
    4. AP1_1_01 = Policia preventiva municipal
       AP1_1_02 = Policia estatal
       AP1_1_05 = Ejercito/Marina
       AP1_1_07 = Jueces
    5. We average municipal + state police for trust_police
    """
    # TODO: Implement with pandas
    logger.warning("process_trust: skeleton — no microdata processed")
    return []


def merge_results(
    victimization: list[dict],
    cifra_negra: list[dict],
    trust: list[dict],
) -> list[dict[str, Any]]:
    """Merge the three processing results into unified envipe_stats rows.

    Join on (year, geo_code, crime_type). Trust data has no crime_type dimension,
    so it gets replicated across all crime types for a given state.
    """
    # Build lookup dicts
    cn_lookup: dict[tuple, dict] = {}
    for row in cifra_negra:
        key = (row["year"], row["geo_code"], row["crime_type"])
        cn_lookup[key] = row

    trust_lookup: dict[tuple, dict] = {}
    for row in trust:
        key = (row["year"], row["geo_code"])
        trust_lookup[key] = row

    merged = []
    for row in victimization:
        key = (row["year"], row["geo_code"], row["crime_type"])
        trust_key = (row["year"], row["geo_code"])

        cn = cn_lookup.get(key, {})
        tr = trust_lookup.get(trust_key, {})

        merged.append({
            "year": row["year"],
            "geo_code": row["geo_code"],
            "crime_type": row["crime_type"],
            "prevalence_rate": row.get("prevalence_rate"),
            "cifra_negra": cn.get("cifra_negra"),
            "reported_rate": cn.get("reported_rate"),
            "trust_police": tr.get("trust_police"),
            "trust_military": tr.get("trust_military"),
            "trust_judges": tr.get("trust_judges"),
            "cost_per_victim": cn.get("cost_per_victim"),
        })

    return merged


def upsert_envipe(conn: Any, rows: list[dict[str, Any]]) -> int:
    """Upsert rows into envipe_stats table.

    Returns number of rows upserted.
    """
    if not rows:
        return 0

    sql = """
        INSERT INTO envipe_stats (
            year, geo_code, crime_type, prevalence_rate, cifra_negra,
            reported_rate, trust_police, trust_military, trust_judges,
            cost_per_victim
        ) VALUES (
            %(year)s, %(geo_code)s, %(crime_type)s, %(prevalence_rate)s,
            %(cifra_negra)s, %(reported_rate)s, %(trust_police)s,
            %(trust_military)s, %(trust_judges)s, %(cost_per_victim)s
        )
        ON CONFLICT (year, geo_code, crime_type) DO UPDATE SET
            prevalence_rate = EXCLUDED.prevalence_rate,
            cifra_negra     = EXCLUDED.cifra_negra,
            reported_rate   = EXCLUDED.reported_rate,
            trust_police    = EXCLUDED.trust_police,
            trust_military  = EXCLUDED.trust_military,
            trust_judges    = EXCLUDED.trust_judges,
            cost_per_victim = EXCLUDED.cost_per_victim
    """

    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, sql, rows, page_size=500)
    conn.commit()
    logger.info("Upserted %d ENVIPE rows", len(rows))
    return len(rows)


def process_year(year: int, *, dry_run: bool = False, conn: Any = None) -> int:
    """Process a single ENVIPE year end-to-end.

    Returns number of rows upserted.
    """
    logger.info("=== Processing ENVIPE %d ===", year)

    if dry_run:
        logger.info("[DRY RUN] Would process ENVIPE %d from %s", year, get_download_url(year))
        return 0

    with tempfile.TemporaryDirectory(prefix=f"envipe_{year}_") as tmpdir:
        csv_dir = Path(tmpdir)

        try:
            download_and_extract(year, csv_dir)
        except NotImplementedError as e:
            logger.warning("%s", e)
            return 0

        # Process each dimension
        victimization = process_victimization(year, csv_dir)
        cifra_negra = process_cifra_negra(year, csv_dir)
        trust = process_trust(year, csv_dir)

        # Merge into unified rows
        merged = merge_results(victimization, cifra_negra, trust)
        logger.info("Merged %d rows for ENVIPE %d", len(merged), year)

        # Upsert to database
        if conn is not None and merged:
            return upsert_envipe(conn, merged)

    return 0


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Process ENVIPE victimization survey microdata."
    )
    parser.add_argument(
        "--year",
        type=int,
        default=None,
        help=f"Year to process (available: {AVAILABLE_YEARS[0]}-{AVAILABLE_YEARS[-1]}).",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Process all available years.",
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

    if not args.year and not args.all:
        parser.error("Specify --year YYYY or --all")

    years = AVAILABLE_YEARS if args.all else [args.year]

    # Validate years
    for y in years:
        if y not in AVAILABLE_YEARS:
            logger.error("Year %d not available. Valid range: %d-%d", y, AVAILABLE_YEARS[0], AVAILABLE_YEARS[-1])
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
        for year in years:
            total += process_year(year, dry_run=args.dry_run, conn=conn)
    finally:
        if conn is not None:
            conn.close()

    logger.info("Done. Total rows upserted: %d", total)


if __name__ == "__main__":
    main()
