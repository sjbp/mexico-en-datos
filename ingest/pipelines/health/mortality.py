"""INEGI Mortality Microdata Pipeline — ICD-10 cause-of-death aggregates.

Downloads INEGI's annual mortality microdata (defunciones generales), classifies
each record by our curated ICD-10 cause groupings, and writes pre-aggregated
counts and rates into the `mortality_stats` table.

Data source:
    https://www.inegi.org.mx/programas/mortalidad/
    Microdata ZIP:
    https://www.inegi.org.mx/contenidos/programas/mortalidad/{year}/microdatos/defunciones_base_datos_{year}_csv.zip

Key columns in the microdata CSV:
    - causa_def  : ICD-10 cause of death code (e.g. 'I219', 'E119')
    - edad       : age at death (coded, needs decoding)
    - sexo       : sex (1=M, 2=F)
    - ent_regis  : state of registration (2-digit code)
    - mun_regis  : municipality of registration (3-digit code)
    - anio_ocur  : year of occurrence

Processing logic:
    1. Download and extract the CSV for the requested year.
    2. Map each ICD-10 code to one of our curated cause groups (see CAUSE_GROUPS).
    3. Decode age into age brackets: 0-4, 5-14, 15-24, 25-34, 35-44, 45-54,
       55-64, 65-74, 75+.
    4. Group by (year, geo_code, cause_group, age_group, sex) and count deaths.
    5. Compute rate_per_100k using CONAPO population denominators (when available).
    6. Upsert aggregated rows into mortality_stats.

Usage:
    python -m ingest.pipelines.health.mortality --year 2023
    python -m ingest.pipelines.health.mortality --full  # all available years
    python -m ingest.pipelines.health.mortality --year 2023 --dry-run
"""

import argparse
import io
import logging
import os
import re
import zipfile
from pathlib import Path
from typing import Any

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ingest.pipelines.health.mortality")

# ---------------------------------------------------------------------------
# ICD-10 cause group mapping
# ---------------------------------------------------------------------------

CAUSE_GROUPS: list[dict[str, str]] = [
    {
        "name": "Enfermedades del corazón",
        "code": "cardiovascular",
        "icd10_range": "I00-I99",
        "pattern": r"^I",
    },
    {
        "name": "Diabetes mellitus",
        "code": "diabetes",
        "icd10_range": "E10-E14",
        "pattern": r"^E1[0-4]",
    },
    {
        "name": "Tumores malignos",
        "code": "cancer",
        "icd10_range": "C00-D48",
        "pattern": r"^[CD][0-4]",
    },
    {
        "name": "Enfermedades del hígado",
        "code": "liver_disease",
        "icd10_range": "K70-K77",
        "pattern": r"^K7[0-7]",
    },
    {
        "name": "Enfermedades cerebrovasculares",
        "code": "cerebrovascular",
        "icd10_range": "I60-I69",
        "pattern": r"^I6[0-9]",
    },
    {
        "name": "Homicidios",
        "code": "homicide",
        "icd10_range": "X85-Y09",
        "pattern": r"^(X8[5-9]|X9[0-9]|Y0[0-9])",
    },
    {
        "name": "Infecciones respiratorias",
        "code": "respiratory",
        "icd10_range": "J00-J99",
        "pattern": r"^J",
    },
    {
        "name": "Accidentes de tránsito",
        "code": "traffic_accidents",
        "icd10_range": "V01-V89",
        "pattern": r"^V[0-8]",
    },
    {
        "name": "Enfermedades del riñón",
        "code": "kidney_disease",
        "icd10_range": "N17-N19",
        "pattern": r"^N1[7-9]",
    },
    {
        "name": "COVID-19",
        "code": "covid19",
        "icd10_range": "U07",
        "pattern": r"^U07",
    },
]

# Compiled patterns for fast matching
_COMPILED_PATTERNS = [(cg["code"], cg["icd10_range"], re.compile(cg["pattern"])) for cg in CAUSE_GROUPS]


def classify_icd10(code: str) -> tuple[str, str] | None:
    """Return (cause_group_code, icd10_range) for an ICD-10 code, or None."""
    code = code.strip().upper()
    for group_code, icd10_range, pattern in _COMPILED_PATTERNS:
        if pattern.match(code):
            return group_code, icd10_range
    return None


# ---------------------------------------------------------------------------
# Age bracket mapping
# ---------------------------------------------------------------------------

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


def age_to_bracket(age_years: int | None) -> str:
    """Convert numeric age in years to an age bracket string."""
    if age_years is None or age_years < 0:
        return "unknown"
    for lo, hi, label in AGE_BRACKETS:
        if lo <= age_years <= hi:
            return label
    return "75+"


def decode_age(edad_raw: str | None) -> int | None:
    """Decode INEGI's edad field into age in years.

    INEGI encodes age as a 4-character string where the first digit indicates
    the unit (1=hours, 2=days, 3=months, 4=years, 5=years>100) and the remaining
    digits are the value. This is a simplified decoder.
    """
    if edad_raw is None:
        return None
    try:
        val = int(edad_raw)
    except (ValueError, TypeError):
        return None
    if val >= 4000:
        # Unit = years
        return val - 4000
    if val >= 5000:
        return val - 5000 + 100
    # Sub-year ages map to 0
    if val >= 1000:
        return 0
    return None


SEX_MAP = {"1": "M", "2": "F"}


# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------

BASE_URL = "https://www.inegi.org.mx/contenidos/programas/mortalidad/{year}/microdatos/defunciones_base_datos_{year}_csv.zip"

AVAILABLE_YEARS = list(range(2010, 2024))  # 2010-2023


def download_microdata(year: int, cache_dir: Path | None = None) -> Path:
    """Download and extract mortality microdata CSV for a given year.

    Returns the path to the extracted CSV file.
    """
    import urllib.request

    url = BASE_URL.format(year=year)
    if cache_dir is None:
        cache_dir = Path("data/cache/mortality")
    cache_dir.mkdir(parents=True, exist_ok=True)

    zip_path = cache_dir / f"defunciones_{year}.zip"
    csv_path = cache_dir / f"defunciones_{year}.csv"

    if csv_path.exists():
        logger.info("Using cached CSV: %s", csv_path)
        return csv_path

    logger.info("Downloading %s", url)
    urllib.request.urlretrieve(url, zip_path)

    logger.info("Extracting %s", zip_path)
    with zipfile.ZipFile(zip_path, "r") as zf:
        csv_names = [n for n in zf.namelist() if n.lower().endswith(".csv")]
        if not csv_names:
            raise FileNotFoundError(f"No CSV found in ZIP for year {year}")
        zf.extract(csv_names[0], cache_dir)
        extracted = cache_dir / csv_names[0]
        if extracted != csv_path:
            extracted.rename(csv_path)

    return csv_path


# ---------------------------------------------------------------------------
# Processing
# ---------------------------------------------------------------------------

def process_year(year: int, *, dry_run: bool = False) -> list[dict[str, Any]]:
    """Process one year of mortality microdata into aggregated rows.

    Returns a list of dicts ready for DB upsert.
    """
    import csv

    csv_path = download_microdata(year)
    logger.info("Processing %s", csv_path)

    # Accumulator: (year, geo_code, cause_group, age_group, sex) -> deaths
    counts: dict[tuple, int] = {}

    with open(csv_path, encoding="latin-1") as f:
        reader = csv.DictReader(f)
        for row in reader:
            icd_code = row.get("causa_def", "").strip()
            classification = classify_icd10(icd_code)
            if classification is None:
                continue

            cause_group, icd10_range = classification
            sex_raw = row.get("sexo", "").strip()
            sex = SEX_MAP.get(sex_raw, "unknown")
            age_years = decode_age(row.get("edad"))
            age_group = age_to_bracket(age_years)

            # Build geo_code: 2-digit state
            ent = row.get("ent_regis", "00").strip().zfill(2)
            geo_code = ent

            key = (year, geo_code, cause_group, age_group, sex)
            counts[key] = counts.get(key, 0) + 1

            # Also accumulate into 'all' aggregates
            key_all_sex = (year, geo_code, cause_group, age_group, "all")
            counts[key_all_sex] = counts.get(key_all_sex, 0) + 1

            key_all_age = (year, geo_code, cause_group, "all", sex)
            counts[key_all_age] = counts.get(key_all_age, 0) + 1

            key_all_both = (year, geo_code, cause_group, "all", "all")
            counts[key_all_both] = counts.get(key_all_both, 0) + 1

            # National aggregates
            key_nat = (year, "00", cause_group, age_group, sex)
            counts[key_nat] = counts.get(key_nat, 0) + 1
            key_nat_all = (year, "00", cause_group, "all", "all")
            counts[key_nat_all] = counts.get(key_nat_all, 0) + 1

    # Build icd10_range lookup
    icd_lookup = {cg["code"]: cg["icd10_range"] for cg in CAUSE_GROUPS}

    rows = []
    for (yr, geo, cause, age_grp, sx), deaths in counts.items():
        rows.append({
            "year": yr,
            "geo_code": geo,
            "cause_group": cause,
            "icd10_range": icd_lookup.get(cause),
            "age_group": age_grp,
            "sex": sx,
            "deaths": deaths,
            "rate_per_100k": None,  # computed in a separate pass with CONAPO data
        })

    logger.info("Year %d: %d aggregate rows from microdata", year, len(rows))
    return rows


# ---------------------------------------------------------------------------
# DB upsert
# ---------------------------------------------------------------------------

def upsert_mortality(conn: Any, rows: list[dict[str, Any]]) -> int:
    """Bulk upsert mortality_stats rows."""
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
            icd10_range  = EXCLUDED.icd10_range,
            deaths       = EXCLUDED.deaths,
            rate_per_100k = EXCLUDED.rate_per_100k
    """
    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, sql, rows, page_size=1000)
    conn.commit()
    logger.info("Upserted %d mortality_stats rows", len(rows))
    return len(rows)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Process INEGI mortality microdata into ICD-10 aggregates."
    )
    parser.add_argument(
        "--year",
        type=int,
        default=None,
        help="Process a single year (e.g. 2023).",
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Process all available years (2010-2023).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Process and count rows without writing to DB.",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable debug logging.",
    )
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    years = AVAILABLE_YEARS if args.full else ([args.year] if args.year else [2023])

    conn = None
    if not args.dry_run:
        conn = psycopg2.connect(os.getenv("DATABASE_URL", ""))
        logger.info("Connected to database.")

    total = 0
    try:
        for year in years:
            logger.info("--- Year %d ---", year)
            rows = process_year(year, dry_run=args.dry_run)
            if not args.dry_run and conn:
                total += upsert_mortality(conn, rows)
            else:
                logger.info("[DRY RUN] Would upsert %d rows for year %d", len(rows), year)
    finally:
        if conn:
            conn.close()

    logger.info("Done. Total rows upserted: %d", total)


if __name__ == "__main__":
    main()
