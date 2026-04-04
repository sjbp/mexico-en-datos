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
    "age": "eda",              # Age in years
    "sex": "sex",              # 1=Hombre, 2=Mujer
    "occupation_position": "pos_ocu",  # Position in occupation
    "sector": "rama_est2",     # Economic sector (ENOE 11-sector grouping)
    "hourly_income": "ing_x_hrs",  # Hourly income (pesos)
    "hours_worked": "hrsocup",     # Hours worked per week
    "contract_type": "tip_con",    # Contract type (1=written, 2=verbal/none → informal)
    "locality_size": "t_loc",      # Locality size category
    "state": "ent",               # State code (01-32)
    "class_activity": "clase1",    # 1=employed, 2=unemployed
    "class_subactivity": "clase2", # Subclassification (underemployed, etc.)
    "education": "cs_p13_1",       # Education level
    "weight": "fac_tri",          # Survey weight (quarterly expansion factor)
}

# ── Sector labels (rama_est2 codes → human-readable) ────────────────────
SECTOR_LABELS = {
    0: "No especificado",
    1: "Agricultura y ganaderia",
    2: "Industria extractiva y electricidad",
    3: "Industria manufacturera",
    4: "Construccion",
    5: "Comercio",
    6: "Restaurantes y alojamiento",
    7: "Transportes y comunicaciones",
    8: "Servicios profesionales y financieros",
    9: "Servicios sociales",
    10: "Servicios diversos",
    11: "Gobierno",
}

AGE_GROUP_BINS = [15, 25, 35, 45, 55, 65, 100]
AGE_GROUP_LABELS = [
    "15-24", "25-34", "35-44", "45-54", "55-64", "65+",
]

EDUCATION_LABELS = {
    0: "Sin instruccion",
    1: "Primaria",
    2: "Primaria",
    3: "Primaria",
    4: "Secundaria",
    5: "Secundaria",
    6: "Preparatoria",
    7: "Preparatoria",
    8: "Universidad",
    9: "Universidad",
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
    url = f"https://www.inegi.org.mx/contenidos/programas/enoe/15ymas/microdatos/enoe_{year}_trim{q}_csv.zip"

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
    sdem_files = (
        list(csv_dir.rglob("SDEM*.csv"))
        + list(csv_dir.rglob("sdem*.csv"))
        + list(csv_dir.rglob("*SDEM*.csv"))
        + list(csv_dir.rglob("*SDEMT*.csv"))
        + list(csv_dir.rglob("*_SDEM*.csv"))
    )
    # Deduplicate
    sdem_files = list(dict.fromkeys(sdem_files))
    if not sdem_files:
        raise FileNotFoundError(f"No SDEM CSV found in {csv_dir}")

    csv_path = sdem_files[0]
    logger.info("Loading SDEM CSV: %s", csv_path)
    df = pd.read_csv(csv_path, low_memory=False, encoding="latin-1")
    # Normalize column names to lowercase (varies across quarters)
    df.columns = df.columns.str.lower().str.strip()
    logger.info("Loaded %d rows, %d columns", len(df), len(df.columns))
    return df


def classify_informal(seg_soc: pd.Series) -> pd.Series:
    """Classify workers as informal based on ENOE criteria.

    Uses the seg_soc (social security access) variable, which is the basis
    for INEGI's official TIL (Tasa de Informalidad Laboral):
    - 1 = Has social security (formal)
    - 2 = No social security (informal)
    - 0, 3 = Not applicable / not specified (treated as not informal)
    """
    return seg_soc == 2


def add_derived_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Add derived columns needed for aggregation."""
    col = ENOE_COLUMNS

    # Coerce key columns to numeric (CSV may load them as strings)
    for key in ["class_activity", "class_subactivity", "weight", "age",
                 "hours_worked", "hourly_income", "sex", "sector", "education"]:
        c = col.get(key)
        if c and c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")
    if "seg_soc" in df.columns:
        df["seg_soc"] = pd.to_numeric(df["seg_soc"], errors="coerce")
    if "sub_o" in df.columns:
        df["sub_o"] = pd.to_numeric(df["sub_o"], errors="coerce")

    # Filter to population 15+ who are in the labor force
    # CLASE1: 1=employed, 2=unemployed (both are PEA)
    df = df[df[col["class_activity"]].isin([1, 2])].copy()

    # Ensure weight has no NaNs
    df[col["weight"]] = df[col["weight"]].fillna(0)

    # Employed flag
    df["is_employed"] = df[col["class_activity"]] == 1

    # Informal flag (only for employed): seg_soc==2 means no social security
    df["is_informal"] = False
    employed_mask = df["is_employed"]
    if "seg_soc" in df.columns:
        df.loc[employed_mask, "is_informal"] = classify_informal(df.loc[employed_mask, "seg_soc"])
    else:
        # Fallback to contract type
        tip_con = col["contract_type"]
        if tip_con in df.columns:
            df.loc[employed_mask, "is_informal"] = df.loc[employed_mask, tip_con].isin([3, 4, 5, 6])

    # Underemployed: sub_o==1 means needs/wants more hours (official ENOE indicator)
    if "sub_o" in df.columns:
        df["is_underemployed"] = (df["is_employed"]) & (df["sub_o"] == 1)
    elif col["class_subactivity"] in df.columns:
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

    # Gender label (sex column may be string or int)
    sex_numeric = pd.to_numeric(df[col["sex"]], errors="coerce")
    df["gender"] = sex_numeric.map(GENDER_LABELS)

    # Sector label
    if col["sector"] in df.columns:
        sector_numeric = pd.to_numeric(df[col["sector"]], errors="coerce")
        df["sector"] = sector_numeric.map(SECTOR_LABELS).fillna("No especificado")
    else:
        df["sector"] = "No especificado"

    # Education label
    if col["education"] in df.columns:
        edu_numeric = pd.to_numeric(df[col["education"]], errors="coerce")
        df["education"] = edu_numeric.map(EDUCATION_LABELS).fillna("No especificado")
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

    w = col["weight"]
    grouped = df.groupby(dimension, observed=True)

    for dim_value, group in grouped:
        weights = group[w]
        total_pea = weights.sum()
        employed = (group["is_employed"] * weights).sum()
        unemployed = total_pea - employed
        informal = (group["is_informal"] * weights).sum()
        underemployed = (group["is_underemployed"] * weights).sum()

        unemployment_rate = (unemployed / total_pea * 100) if total_pea > 0 else None
        informality_rate = (informal / employed * 100) if employed > 0 else None

        employed_mask = group["is_employed"] & group[col["hours_worked"]].notna()
        employed_with_hours = group.loc[employed_mask]
        if len(employed_with_hours) > 0:
            wh = employed_with_hours[w]
            avg_hours = (employed_with_hours[col["hours_worked"]] * wh).sum() / wh.sum()
        else:
            avg_hours = None

        income_mask = group["is_employed"] & group["monthly_income"].notna() & (group["monthly_income"] > 0)
        employed_with_income = group.loc[income_mask]
        if len(employed_with_income) > 0:
            wi = employed_with_income[w]
            avg_income = (employed_with_income["monthly_income"] * wi).sum() / wi.sum()
        else:
            avg_income = None

        results.append({
            "quarter": quarter,
            "quarter_date": quarter_date,
            "geo_code": geo_code,
            "dimension": dimension,
            "dimension_value": str(dim_value),
            "employed": int(float(employed)),
            "informal": int(float(informal)),
            "underemployed": int(float(underemployed)),
            "unemployment_rate": float(round(unemployment_rate, 2)) if unemployment_rate is not None else None,
            "informality_rate": float(round(informality_rate, 2)) if informality_rate is not None else None,
            "avg_hours_worked": float(round(avg_hours, 1)) if avg_hours is not None else None,
            "avg_monthly_income": float(round(avg_income, 0)) if avg_income is not None else None,
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
