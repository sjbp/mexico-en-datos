"""ENOE microdata processing pipeline.

Downloads quarterly ENOE microdata from INEGI, processes it, and stores
pre-aggregated employment statistics by key dimensions.

Usage:
    python -m ingest.pipelines.enoe --quarter 2024Q1
    python -m ingest.pipelines.enoe --all
"""

import argparse
import logging
import os
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Any

import pandas as pd
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

from ingest.utils.db import get_connection

load_dotenv()

logger = logging.getLogger("ingest.pipelines.enoe")

# ── ENOE column mappings ──────────────────────────────────────────────────
# These come from the ENOE data dictionary (Cuestionario Basico / COE1 / COE2).
# Exact column names may vary by quarter — adjust as needed.

ENOE_COLUMNS = {
    "age": "EDA",              # Age in years
    "sex": "SEX",              # 1=Hombre, 2=Mujer
    "occupation_position": "POS_OCU",  # Position in occupation
    "sector": "RAMA",          # Economic sector / branch (2-digit SCIAN)
    "hourly_income": "ING_X_HRS",  # Hourly income (pesos)
    "hours_worked": "HRSOCUP",     # Hours worked per week
    "contract_type": "TIP_CON",    # Contract type (1=written, 2=verbal/none → informal)
    "locality_size": "T_LOC",      # Locality size category
    "state": "ENT",               # State code (01-32)
    "class_activity": "CLASE1",    # 1=employed, 2=unemployed
    "class_subactivity": "CLASE2", # Subclassification (underemployed, etc.)
    "education": "CS_P13_1",       # Education level
}

# ── Sector labels (RAMA codes → human-readable) ──────────────────────────
SECTOR_LABELS = {
    11: "Agricultura",
    21: "Mineria",
    22: "Electricidad y agua",
    23: "Construccion",
    31: "Manufactura",
    32: "Manufactura",
    33: "Manufactura",
    43: "Comercio al por mayor",
    46: "Comercio al por menor",
    48: "Transporte",
    49: "Transporte",
    51: "Medios masivos",
    52: "Servicios financieros",
    53: "Servicios inmobiliarios",
    54: "Servicios profesionales",
    55: "Corporativos",
    56: "Servicios de apoyo",
    61: "Educacion",
    62: "Salud",
    71: "Esparcimiento",
    72: "Alojamiento y alimentos",
    81: "Otros servicios",
    93: "Gobierno",
}

AGE_GROUP_BINS = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 100]
AGE_GROUP_LABELS = [
    "15-19", "20-24", "25-29", "30-34", "35-39",
    "40-44", "45-49", "50-54", "55-59", "60-64", "65+",
]

EDUCATION_LABELS = {
    0: "Sin instruccion",
    1: "Preescolar",
    2: "Primaria incompleta",
    3: "Primaria completa",
    4: "Secundaria incompleta",
    5: "Secundaria completa",
    6: "Preparatoria incompleta",
    7: "Preparatoria completa",
    8: "Superior incompleta",
    9: "Superior completa",
}

GENDER_LABELS = {1: "Hombre", 2: "Mujer"}


# ── Download ──────────────────────────────────────────────────────────────

def download_enoe(quarter: str, dest_dir: str | None = None) -> Path:
    """Download ENOE microdata ZIP for a given quarter.

    Args:
        quarter: Quarter string like '2024Q1'.
        dest_dir: Directory to save downloaded files. Uses temp dir if None.

    Returns:
        Path to extracted CSV directory.

    URL pattern:
        https://www.inegi.org.mx/contenidos/programas/enoe/15ymas/microdatos/{year}trim{q}_csv.zip
    """
    import urllib.request

    year = quarter[:4]
    q = quarter[-1]  # '1', '2', '3', '4'
    url = f"https://www.inegi.org.mx/contenidos/programas/enoe/15ymas/microdatos/{year}trim{q}_csv.zip"

    if dest_dir is None:
        dest_dir = tempfile.mkdtemp(prefix="enoe_")
    dest_path = Path(dest_dir)
    zip_path = dest_path / f"{year}trim{q}_csv.zip"

    logger.info("Downloading ENOE microdata from %s", url)
    urllib.request.urlretrieve(url, zip_path)
    logger.info("Downloaded to %s", zip_path)

    # Extract
    extract_dir = dest_path / f"{year}trim{q}"
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_dir)
    logger.info("Extracted to %s", extract_dir)

    return extract_dir


# ── Processing ────────────────────────────────────────────────────────────

def load_sdem_csv(csv_dir: Path) -> pd.DataFrame:
    """Find and load the SDEM (sociodemographic) CSV from the extracted directory.

    The SDEM table contains sociodemographic + labor variables for all respondents.
    File naming varies: SDEMT{q}{yy}.csv or similar.
    """
    sdem_files = list(csv_dir.rglob("SDEM*.csv")) + list(csv_dir.rglob("sdem*.csv"))
    if not sdem_files:
        raise FileNotFoundError(f"No SDEM CSV found in {csv_dir}")

    csv_path = sdem_files[0]
    logger.info("Loading SDEM CSV: %s", csv_path)
    df = pd.read_csv(csv_path, low_memory=False)
    logger.info("Loaded %d rows, %d columns", len(df), len(df.columns))
    return df


def classify_informal(row: pd.Series) -> bool:
    """Classify a worker as informal based on ENOE criteria.

    Simplified informality: no written contract (TIP_CON != 1) or
    works in a micro-business without benefits.
    """
    tip_con = row.get(ENOE_COLUMNS["contract_type"])
    if pd.isna(tip_con):
        return False
    return int(tip_con) != 1


def add_derived_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Add derived columns needed for aggregation."""
    col = ENOE_COLUMNS

    # Filter to population 15+ who are in the labor force
    # CLASE1: 1=employed, 2=unemployed (both are PEA)
    df = df[df[col["class_activity"]].isin([1, 2])].copy()

    # Employed flag
    df["is_employed"] = df[col["class_activity"]] == 1

    # Informal flag (only for employed)
    df["is_informal"] = False
    employed_mask = df["is_employed"]
    df.loc[employed_mask, "is_informal"] = df.loc[employed_mask].apply(classify_informal, axis=1)

    # Underemployed: employed but wants to work more hours (CLASE2 == 1 in some schemas)
    if col["class_subactivity"] in df.columns:
        df["is_underemployed"] = (df["is_employed"]) & (df[col["class_subactivity"]] == 1)
    else:
        df["is_underemployed"] = False

    # Age group
    df["age_group"] = pd.cut(
        df[col["age"]],
        bins=AGE_GROUP_BINS,
        labels=AGE_GROUP_LABELS,
        right=False,
    )

    # Gender label
    df["gender"] = df[col["sex"]].map(GENDER_LABELS)

    # Sector label
    if col["sector"] in df.columns:
        df["sector"] = df[col["sector"]].apply(
            lambda x: SECTOR_LABELS.get(int(x), "Otro") if pd.notna(x) else "No especificado"
        )
    else:
        df["sector"] = "No especificado"

    # Education label
    if col["education"] in df.columns:
        df["education"] = df[col["education"]].apply(
            lambda x: EDUCATION_LABELS.get(int(x), "Otro") if pd.notna(x) else "No especificado"
        )
    else:
        df["education"] = "No especificado"

    # Monthly income estimate (hourly * hours * 4.33 weeks)
    if col["hourly_income"] in df.columns and col["hours_worked"] in df.columns:
        df["monthly_income"] = (
            pd.to_numeric(df[col["hourly_income"]], errors="coerce")
            * pd.to_numeric(df[col["hours_worked"]], errors="coerce")
            * 4.33
        )
    else:
        df["monthly_income"] = None

    return df


def aggregate_by_dimension(
    df: pd.DataFrame,
    dimension: str,
    geo_code: str,
    quarter: str,
    quarter_date: str,
) -> list[dict[str, Any]]:
    """Compute employment stats for one dimension.

    Args:
        df: Processed ENOE dataframe with derived columns.
        dimension: Column to group by ('sector', 'age_group', 'gender', 'education').
        geo_code: Geographic code ('00' for national, state codes).
        quarter: Quarter label like '2024/Q1'.
        quarter_date: Date string like '2024-01-01'.

    Returns:
        List of stat dicts ready for DB upsert.
    """
    col = ENOE_COLUMNS
    results = []

    grouped = df.groupby(dimension, observed=True)

    for dim_value, group in grouped:
        total_pea = len(group)
        employed = group["is_employed"].sum()
        unemployed = total_pea - employed
        informal = group["is_informal"].sum()
        underemployed = group["is_underemployed"].sum()

        unemployment_rate = (unemployed / total_pea * 100) if total_pea > 0 else None
        informality_rate = (informal / employed * 100) if employed > 0 else None

        employed_with_hours = group.loc[
            group["is_employed"] & group[col["hours_worked"]].notna()
        ]
        avg_hours = (
            employed_with_hours[col["hours_worked"]].mean()
            if len(employed_with_hours) > 0
            else None
        )

        employed_with_income = group.loc[
            group["is_employed"] & group["monthly_income"].notna() & (group["monthly_income"] > 0)
        ]
        avg_income = (
            employed_with_income["monthly_income"].mean()
            if len(employed_with_income) > 0
            else None
        )

        results.append({
            "quarter": quarter,
            "quarter_date": quarter_date,
            "geo_code": geo_code,
            "dimension": dimension,
            "dimension_value": str(dim_value),
            "employed": int(employed),
            "informal": int(informal),
            "underemployed": int(underemployed),
            "unemployment_rate": round(unemployment_rate, 2) if unemployment_rate is not None else None,
            "informality_rate": round(informality_rate, 2) if informality_rate is not None else None,
            "avg_hours_worked": round(avg_hours, 1) if avg_hours is not None else None,
            "avg_monthly_income": round(avg_income, 0) if avg_income is not None else None,
        })

    return results


def process_microdata(csv_dir: Path, quarter: str) -> list[dict[str, Any]]:
    """Process ENOE microdata and return aggregated stats for all dimensions.

    Args:
        csv_dir: Path to extracted CSV directory.
        quarter: Quarter string like '2024Q1'.

    Returns:
        List of all stat dicts across all dimensions and geographies.
    """
    # Parse quarter for DB format
    year = quarter[:4]
    q = quarter[-1]
    quarter_label = f"{year}/Q{q}"
    quarter_date = f"{year}-{(int(q) - 1) * 3 + 1:02d}-01"

    df = load_sdem_csv(csv_dir)
    df = add_derived_columns(df)

    dimensions = ["sector", "age_group", "gender", "education"]
    all_stats: list[dict[str, Any]] = []

    # National aggregates
    for dim in dimensions:
        logger.info("Aggregating dimension=%s geo=00 (national)", dim)
        stats = aggregate_by_dimension(df, dim, "00", quarter_label, quarter_date)
        all_stats.extend(stats)

    # State-level aggregates
    col = ENOE_COLUMNS
    if col["state"] in df.columns:
        for state_code, state_df in df.groupby(col["state"], observed=True):
            geo = f"{int(state_code):02d}"
            for dim in dimensions:
                logger.info("Aggregating dimension=%s geo=%s", dim, geo)
                stats = aggregate_by_dimension(state_df, dim, geo, quarter_label, quarter_date)
                all_stats.extend(stats)

    logger.info("Total aggregated rows: %d", len(all_stats))
    return all_stats


# ── Database ──────────────────────────────────────────────────────────────

def upsert_employment_stats(
    conn: psycopg2.extensions.connection,
    stats: list[dict[str, Any]],
) -> int:
    """Write employment stats to the database.

    Uses INSERT ... ON CONFLICT to upsert rows.

    Args:
        conn: Database connection.
        stats: List of stat dicts from process_microdata.

    Returns:
        Number of rows upserted.
    """
    if not stats:
        return 0

    sql = """
        INSERT INTO employment_stats (
            quarter, quarter_date, geo_code, dimension, dimension_value,
            employed, informal, underemployed,
            unemployment_rate, informality_rate,
            avg_hours_worked, avg_monthly_income
        ) VALUES (
            %(quarter)s, %(quarter_date)s, %(geo_code)s, %(dimension)s, %(dimension_value)s,
            %(employed)s, %(informal)s, %(underemployed)s,
            %(unemployment_rate)s, %(informality_rate)s,
            %(avg_hours_worked)s, %(avg_monthly_income)s
        )
        ON CONFLICT (quarter, geo_code, dimension, dimension_value) DO UPDATE SET
            quarter_date       = EXCLUDED.quarter_date,
            employed           = EXCLUDED.employed,
            informal           = EXCLUDED.informal,
            underemployed      = EXCLUDED.underemployed,
            unemployment_rate  = EXCLUDED.unemployment_rate,
            informality_rate   = EXCLUDED.informality_rate,
            avg_hours_worked   = EXCLUDED.avg_hours_worked,
            avg_monthly_income = EXCLUDED.avg_monthly_income
    """

    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, sql, stats, page_size=500)
    conn.commit()

    logger.info("Upserted %d employment_stats rows", len(stats))
    return len(stats)


# ── CLI ───────────────────────────────────────────────────────────────────

def parse_quarter(q: str) -> str:
    """Validate and normalize a quarter string like '2024Q1'."""
    q = q.strip().upper()
    if len(q) != 6 or q[4] != "Q" or q[5] not in "1234":
        raise ValueError(f"Invalid quarter format: {q}. Expected YYYYQN (e.g. 2024Q1)")
    return q


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Process ENOE microdata and store employment aggregates."
    )
    parser.add_argument(
        "--quarter",
        type=str,
        help="Quarter to process (e.g. 2024Q1).",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Process all available quarters (2019Q1 onwards).",
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        default=None,
        help="Directory containing already-downloaded ENOE CSVs (skip download).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Process data but don't write to database.",
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
        parser.error("Specify --quarter YYYYQN or --all")

    # Build list of quarters to process
    quarters: list[str] = []
    if args.all:
        # Process from 2019Q1 to latest available
        import datetime
        now = datetime.date.today()
        for year in range(2019, now.year + 1):
            for q in range(1, 5):
                quarter_end_month = q * 3
                if datetime.date(year, quarter_end_month, 1) <= now:
                    quarters.append(f"{year}Q{q}")
    else:
        quarters = [parse_quarter(args.quarter)]

    # Connect to DB
    conn = None
    if not args.dry_run:
        try:
            conn = get_connection()
            logger.info("Connected to database.")
        except Exception:
            logger.exception("Failed to connect to database.")
            sys.exit(1)

    total_rows = 0

    try:
        for quarter in quarters:
            logger.info("=== Processing %s ===", quarter)

            try:
                if args.data_dir:
                    csv_dir = Path(args.data_dir)
                else:
                    csv_dir = download_enoe(quarter)

                stats = process_microdata(csv_dir, quarter)

                if not args.dry_run and conn is not None:
                    count = upsert_employment_stats(conn, stats)
                    total_rows += count
                else:
                    logger.info("[DRY RUN] Would upsert %d rows for %s", len(stats), quarter)

            except Exception:
                logger.exception("Failed to process quarter %s", quarter)
                continue

    finally:
        if conn is not None:
            conn.close()
            logger.info("Database connection closed.")

    logger.info("Done. Total rows upserted: %d", total_rows)


if __name__ == "__main__":
    main()
