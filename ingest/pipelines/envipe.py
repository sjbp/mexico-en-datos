"""ENVIPE (Encuesta Nacional de Victimizacion y Percepcion sobre Seguridad Publica) pipeline.

Downloads and processes ENVIPE microdata from INEGI to compute:
- Victimization prevalence rates by state and crime type
- Cifra negra (% of crimes not reported to authorities)
- Trust in institutions (police, military, judges) by state

Usage:
    uv run python -m ingest.pipelines.envipe --year 2024
    uv run python -m ingest.pipelines.envipe --year 2024 --dry-run
    uv run python -m ingest.pipelines.envipe --all  # Process all available years

Data source:
    https://www.inegi.org.mx/programas/envipe/
    Microdata ZIP: https://www.inegi.org.mx/contenidos/programas/envipe/{year}/datosabiertos/conjunto_de_datos_envipe_{year}_csv.zip

ENVIPE microdata structure:
    - TPer_Vic1: Person-level victimization (one row per person 18+)
        Key columns: CVE_ENT (state), FAC_ELE (person weight), AP4_1 (victim yes/no),
        AP4_2_01..AP4_2_10 (crime types experienced),
        AP5_4_01..AP5_4_10 (trust in institutions)
    - TModVic: Crime-event detail (one row per victimization event)
        Key columns: ID_VIV (state from first 2 chars), BPCOD (crime code),
        BP1_20 (reported to MP: 1=yes, 2=no), FAC_DEL (crime weight)

Crime type mapping (AP4_2_XX / BPCOD):
    01 = Robo total de vehiculo
    02 = Robo parcial de vehiculo
    03 = Vandalismo
    04 = Robo en casa habitacion
    05 = Robo/asalto en calle o transporte publico
    06 = Robo en forma distinta
    07 = Fraude bancario
    08 = Fraude al consumidor
    09 = Extorsion
    10 = Amenazas
    11 = Lesiones
    12 = Secuestro
    13 = Acoso sexual
    14 = Violacion sexual
    15 = Otros delitos

Trust columns in TPer_Vic1 (AP5_4_XX, values 1-4):
    01 = Policia de Transito Municipal
    02 = Policia Preventiva Municipal
    03 = Policia Estatal
    04 = Guardia Nacional
    05 = Policia Ministerial
    06 = Ministerio Publico / Fiscalias Estatales
    07 = Fiscalia General de la Republica
    08 = Ejercito
    09 = Marina
    10 = Jueces
"""

import argparse
import glob
import logging
import os
import sys
import zipfile
from pathlib import Path
from typing import Any

import pandas as pd
import psycopg2
import psycopg2.extras
import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ingest.pipelines.envipe")

# Available years for ENVIPE microdata
AVAILABLE_YEARS = list(range(2011, 2025))

# Download URL pattern (datosabiertos, not microdatos)
URL_PATTERN = "https://www.inegi.org.mx/contenidos/programas/envipe/{year}/datosabiertos/conjunto_de_datos_envipe_{year}_csv.zip"

# BPCOD crime code -> our normalized label
BPCOD_MAP = {
    "01": "vehicle_theft",
    "02": "vehicle_partial_theft",
    "03": "vandalism",
    "04": "home_robbery",
    "05": "street_robbery",
    "06": "other_robbery",
    "07": "bank_fraud",
    "08": "consumer_fraud",
    "09": "extortion",
    "10": "threats",
    "11": "assault",
    "12": "kidnapping",
    "13": "sexual_harassment",
    "14": "sexual_assault",
    "15": "other",
}

# AP4_2_XX crime type in person table -> our normalized label
AP4_2_MAP = {
    "01": "vehicle_theft",
    "02": "vehicle_partial_theft",
    "03": "vandalism",
    "04": "home_robbery",
    "05": "street_robbery",
    "06": "other_robbery",
    "07": "bank_fraud",
    "08": "consumer_fraud",
    "09": "extortion",
    "10": "threats",
    "11": "assault",
    "12": "kidnapping",
    "13": "sexual_harassment",
}

# Human-readable labels for the frontend
CRIME_LABEL_ES = {
    "vehicle_theft": "Robo total de vehiculo",
    "vehicle_partial_theft": "Robo parcial de vehiculo",
    "vandalism": "Vandalismo",
    "home_robbery": "Robo a casa habitacion",
    "street_robbery": "Robo/asalto en calle o transporte",
    "other_robbery": "Otro tipo de robo",
    "bank_fraud": "Fraude bancario",
    "consumer_fraud": "Fraude al consumidor",
    "extortion": "Extorsion",
    "threats": "Amenazas",
    "assault": "Lesiones",
    "kidnapping": "Secuestro",
    "sexual_harassment": "Acoso sexual",
    "sexual_assault": "Violacion sexual",
    "other": "Otros delitos",
    "total": "Total",
}


def _read_csv(filepath: Path) -> pd.DataFrame:
    """Read an INEGI CSV file, handling encoding and CR line terminators."""
    # INEGI files use latin-1 encoding and sometimes CR-only line endings
    # which cause trailing \r in field values
    df = pd.read_csv(filepath, dtype=str, low_memory=False, encoding="latin-1")
    # Strip whitespace/CR from all string columns
    for col in df.columns:
        df[col] = df[col].astype(str).str.strip().str.strip("\r\n")
    # Replace 'nan' (from NaN) back to empty string
    df = df.replace("nan", "")
    return df


def get_download_url(year: int) -> str:
    """Build the microdata download URL for a given year."""
    return URL_PATTERN.format(year=year)


def find_csv_file(base_dir: Path, table_prefix: str, year: int) -> Path | None:
    """Find a CSV data file with flexible naming conventions across years.

    INEGI changes naming conventions between years, so we search with glob patterns.
    """
    patterns = [
        # 2024/2023 lowercase pattern
        f"{base_dir}/{table_prefix}_envipe{year}/conjunto_de_datos/conjunto_de_datos_{table_prefix}_envipe{year}.csv",
        # 2022 and older uppercase pattern
        f"{base_dir}/conjunto_de_datos_{table_prefix}_ENVIPE_{year}/conjunto_de_datos/conjunto_de_datos_{table_prefix}_ENVIPE_{year}.csv",
    ]

    for pattern in patterns:
        matches = glob.glob(pattern, recursive=False)
        if matches:
            return Path(matches[0])

    # Fallback: case-insensitive glob
    all_csvs = glob.glob(f"{base_dir}/**/*{table_prefix}*{year}*.csv", recursive=True)
    data_csvs = [p for p in all_csvs if "conjunto_de_datos" in p and "diccionario" not in p and "catalogo" not in p]
    if data_csvs:
        return Path(data_csvs[0])

    return None


def download_and_extract(year: int, dest_dir: Path) -> Path:
    """Download ENVIPE microdata ZIP and extract to dest_dir."""
    url = get_download_url(year)
    zip_path = dest_dir / f"envipe{year}_csv.zip"

    if zip_path.exists():
        logger.info("ZIP already exists: %s", zip_path)
    else:
        logger.info("Downloading ENVIPE %d from: %s", year, url)
        resp = requests.get(url, stream=True, timeout=300)
        resp.raise_for_status()
        with open(zip_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
        logger.info("Downloaded %d bytes", zip_path.stat().st_size)

    extract_dir = dest_dir / str(year)
    if not extract_dir.exists():
        logger.info("Extracting to: %s", extract_dir)
        extract_dir.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(extract_dir)
    else:
        logger.info("Already extracted: %s", extract_dir)

    return extract_dir


def process_victimization(year: int, csv_dir: Path) -> list[dict[str, Any]]:
    """Process TPer_Vic1 (person-level) to compute victimization prevalence rates.

    Returns list of dicts with keys: year, geo_code, crime_type, prevalence_rate.
    """
    filepath = find_csv_file(csv_dir, "tper_vic1", year)
    if filepath is None:
        logger.error("TPer_Vic1 file not found for year %d in %s", year, csv_dir)
        return []

    logger.info("Reading TPer_Vic1: %s", filepath)
    df = _read_csv(filepath)
    logger.info("TPer_Vic1: %d rows, %d columns", len(df), len(df.columns))

    # Convert weight to numeric
    df["FAC_ELE"] = pd.to_numeric(df["FAC_ELE"], errors="coerce").fillna(0)

    # State code as 2-digit string
    df["state"] = df["CVE_ENT"].astype(str).str.zfill(2)

    # AP4_1: 1=victim, 2=not victim, 3=not selected
    # Only consider persons who were asked (AP4_1 in {1, 2})
    df_asked = df[df["AP4_1"].isin(["1", "2"])].copy()

    results = []

    # Crime type columns AP4_2_01..AP4_2_13
    crime_cols = {f"AP4_2_{i:02d}": AP4_2_MAP.get(f"{i:02d}", f"crime_{i:02d}")
                  for i in range(1, 14)}

    for state in list(df_asked["state"].unique()) + ["00"]:
        if state == "00":
            subset = df_asked
        else:
            subset = df_asked[df_asked["state"] == state]

        if len(subset) == 0:
            continue

        total_pop = subset["FAC_ELE"].sum()
        if total_pop == 0:
            continue

        # Total victimization
        total_victims = subset[subset["AP4_1"] == "1"]["FAC_ELE"].sum()
        prevalence = (total_victims / total_pop) * 100_000
        results.append({
            "year": year,
            "geo_code": state,
            "crime_type": "total",
            "prevalence_rate": round(prevalence, 1),
        })

        # By crime type
        for col, crime_label in crime_cols.items():
            if col not in subset.columns:
                continue
            crime_victims = subset[subset[col] == "1"]["FAC_ELE"].sum()
            if crime_victims > 0:
                crime_prev = (crime_victims / total_pop) * 100_000
                results.append({
                    "year": year,
                    "geo_code": state,
                    "crime_type": crime_label,
                    "prevalence_rate": round(crime_prev, 1),
                })

    logger.info("Computed %d victimization rows for %d", len(results), year)
    return results


def process_cifra_negra(year: int, csv_dir: Path) -> list[dict[str, Any]]:
    """Process TModVic (crime-event level) to compute cifra negra.

    Cifra negra = % of crimes NOT reported to authorities (MP).
    BP1_20: 1 = reported, 2 = not reported.

    Returns list of dicts with keys: year, geo_code, crime_type, cifra_negra, reported_rate.
    """
    filepath = find_csv_file(csv_dir, "tmod_vic", year)
    if filepath is None:
        # Try alternative name patterns
        filepath = find_csv_file(csv_dir, "TMod_Vic", year)
    if filepath is None:
        logger.error("TModVic file not found for year %d in %s", year, csv_dir)
        return []

    logger.info("Reading TModVic: %s", filepath)
    df = _read_csv(filepath)
    logger.info("TModVic: %d rows, %d columns", len(df), len(df.columns))

    df["FAC_DEL"] = pd.to_numeric(df["FAC_DEL"], errors="coerce").fillna(0)

    # Extract state from ID_VIV (first 2 chars)
    df["state"] = df["ID_VIV"].astype(str).str[:2]

    # Map BPCOD to crime type
    df["crime_label"] = df["BPCOD"].map(BPCOD_MAP).fillna("other")

    # BP1_20: 1 = reported, 2 = not reported
    # Filter to rows with valid BP1_20
    df_valid = df[df["BP1_20"].isin(["1", "2"])].copy()

    results = []

    for state in list(df_valid["state"].unique()) + ["00"]:
        if state == "00":
            subset = df_valid
        else:
            subset = df_valid[df_valid["state"] == state]

        if len(subset) == 0:
            continue

        # Total cifra negra
        total_crimes = subset["FAC_DEL"].sum()
        reported_crimes = subset[subset["BP1_20"] == "1"]["FAC_DEL"].sum()

        if total_crimes > 0:
            reported_rate = (reported_crimes / total_crimes) * 100
            cifra_negra = 100 - reported_rate
            results.append({
                "year": year,
                "geo_code": state,
                "crime_type": "total",
                "cifra_negra": round(cifra_negra, 1),
                "reported_rate": round(reported_rate, 1),
            })

        # By crime type
        for crime_label in sorted(subset["crime_label"].unique()):
            crime_subset = subset[subset["crime_label"] == crime_label]
            crime_total = crime_subset["FAC_DEL"].sum()
            crime_reported = crime_subset[crime_subset["BP1_20"] == "1"]["FAC_DEL"].sum()
            if crime_total > 0:
                rep_rate = (crime_reported / crime_total) * 100
                cn = 100 - rep_rate
                results.append({
                    "year": year,
                    "geo_code": state,
                    "crime_type": crime_label,
                    "cifra_negra": round(cn, 1),
                    "reported_rate": round(rep_rate, 1),
                })

    logger.info("Computed %d cifra negra rows for %d", len(results), year)
    return results


def process_trust(year: int, csv_dir: Path) -> list[dict[str, Any]]:
    """Process TPer_Vic1 person-level trust in institutions.

    Trust columns AP5_4_XX have values 1-4:
        1 = Mucha confianza, 2 = Algo de confianza,
        3 = Algo de desconfianza, 4 = Mucha desconfianza
    Trust = weighted % responding 1 or 2.

    We compute:
    - trust_police: average of Policia Preventiva Municipal (02) + Policia Estatal (03)
    - trust_military: average of Ejercito (08) + Marina (09)
    - trust_judges: Jueces (10)

    Returns list of dicts with keys: year, geo_code, trust_police, trust_military, trust_judges.
    """
    filepath = find_csv_file(csv_dir, "tper_vic1", year)
    if filepath is None:
        logger.error("TPer_Vic1 file not found for year %d in %s", year, csv_dir)
        return []

    logger.info("Reading TPer_Vic1 for trust: %s", filepath)
    df = _read_csv(filepath)

    df["FAC_ELE"] = pd.to_numeric(df["FAC_ELE"], errors="coerce").fillna(0)
    df["state"] = df["CVE_ENT"].astype(str).str.zfill(2)

    # Only use persons who were asked (AP4_1 in {1, 2})
    df = df[df["AP4_1"].isin(["1", "2"])].copy()

    trust_config = {
        "trust_police": ["AP5_4_02", "AP5_4_03"],     # Preventiva + Estatal
        "trust_military": ["AP5_4_08", "AP5_4_09"],    # Ejercito + Marina
        "trust_judges": ["AP5_4_10"],                   # Jueces
    }

    results = []

    for state in list(df["state"].unique()) + ["00"]:
        if state == "00":
            subset = df
        else:
            subset = df[df["state"] == state]

        if len(subset) == 0:
            continue

        row = {"year": year, "geo_code": state}

        for metric, cols in trust_config.items():
            trust_pcts = []
            for col in cols:
                if col not in subset.columns:
                    continue
                # Filter to valid responses (1-4, not blank/9)
                valid = subset[subset[col].isin(["1", "2", "3", "4"])].copy()
                if len(valid) == 0:
                    continue
                # Trust = responded 1 or 2
                trusting = valid[valid[col].isin(["1", "2"])]["FAC_ELE"].sum()
                total = valid["FAC_ELE"].sum()
                if total > 0:
                    trust_pcts.append((trusting / total) * 100)

            if trust_pcts:
                row[metric] = round(sum(trust_pcts) / len(trust_pcts), 1)
            else:
                row[metric] = None

        results.append(row)

    logger.info("Computed %d trust rows for %d", len(results), year)
    return results


def merge_results(
    victimization: list[dict],
    cifra_negra: list[dict],
    trust: list[dict],
) -> list[dict[str, Any]]:
    """Merge the three processing results into unified envipe_stats rows."""
    # Build lookup dicts
    cn_lookup: dict[tuple, dict] = {}
    for row in cifra_negra:
        key = (row["year"], row["geo_code"], row["crime_type"])
        cn_lookup[key] = row

    trust_lookup: dict[tuple, dict] = {}
    for row in trust:
        key = (row["year"], row["geo_code"])
        trust_lookup[key] = row

    # Start with victimization rows
    merged_keys: set[tuple] = set()
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
            "cost_per_victim": None,
        })
        merged_keys.add(key)

    # Add cifra negra rows that don't have a corresponding victimization row
    for row in cifra_negra:
        key = (row["year"], row["geo_code"], row["crime_type"])
        if key in merged_keys:
            continue
        trust_key = (row["year"], row["geo_code"])
        tr = trust_lookup.get(trust_key, {})

        merged.append({
            "year": row["year"],
            "geo_code": row["geo_code"],
            "crime_type": row["crime_type"],
            "prevalence_rate": None,
            "cifra_negra": row.get("cifra_negra"),
            "reported_rate": row.get("reported_rate"),
            "trust_police": tr.get("trust_police"),
            "trust_military": tr.get("trust_military"),
            "trust_judges": tr.get("trust_judges"),
            "cost_per_victim": None,
        })
        merged_keys.add(key)

    return merged


def _to_native(val: Any) -> Any:
    """Convert numpy types to native Python types for psycopg2."""
    import numpy as np
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return float(val) if not np.isnan(val) else None
    return val


def upsert_envipe(conn: Any, rows: list[dict[str, Any]]) -> int:
    """Upsert rows into envipe_stats table."""
    if not rows:
        return 0

    # Convert numpy types to native Python
    rows = [{k: _to_native(v) for k, v in row.items()} for row in rows]

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


def process_year(year: int, *, dry_run: bool = False, conn: Any = None,
                 data_dir: Path | None = None) -> int:
    """Process a single ENVIPE year end-to-end."""
    logger.info("=== Processing ENVIPE %d ===", year)

    if dry_run:
        logger.info("[DRY RUN] Would process ENVIPE %d from %s", year, get_download_url(year))
        return 0

    if data_dir is None:
        data_dir = Path("data/envipe")
    data_dir.mkdir(parents=True, exist_ok=True)

    csv_dir = data_dir / str(year)
    if not csv_dir.exists():
        csv_dir = download_and_extract(year, data_dir)

    # Process each dimension
    victimization = process_victimization(year, csv_dir)
    cifra_negra = process_cifra_negra(year, csv_dir)
    trust = process_trust(year, csv_dir)

    # Merge into unified rows
    merged = merge_results(victimization, cifra_negra, trust)
    logger.info("Merged %d rows for ENVIPE %d", len(merged), year)

    # Print some key stats
    national_total = [r for r in merged if r["geo_code"] == "00" and r["crime_type"] == "total"]
    if national_total:
        nt = national_total[0]
        logger.info(
            "National total: prevalence=%.1f/100k, cifra_negra=%.1f%%, "
            "trust_police=%.1f%%, trust_military=%.1f%%, trust_judges=%.1f%%",
            nt.get("prevalence_rate") or 0,
            nt.get("cifra_negra") or 0,
            nt.get("trust_police") or 0,
            nt.get("trust_military") or 0,
            nt.get("trust_judges") or 0,
        )

    # Upsert to database
    if conn is not None and merged:
        return upsert_envipe(conn, merged)

    return len(merged)


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
        "--data-dir",
        type=Path,
        default=Path("data/envipe"),
        help="Directory containing extracted ENVIPE data.",
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
            total += process_year(year, dry_run=args.dry_run, conn=conn,
                                  data_dir=args.data_dir)
    finally:
        if conn is not None:
            conn.close()

    logger.info("Done. Total rows upserted: %d", total)


if __name__ == "__main__":
    main()
