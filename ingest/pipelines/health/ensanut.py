"""ENSANUT health survey processing pipeline.

Processes ENSANUT Continua 2022 microdata to extract prevalence
rates for obesity, overweight, diabetes, and hypertension.

Data source:
    https://ensanut.insp.mx/encuestas/ensanutcontinua2022/descargas.php

Two CSV files are used:
    - ensadul (adult health questionnaire, 20+ years):
        Key columns: a0301 (diabetes dx), a0401 (hypertension dx),
        sexo, edad, entidad, ponde_f (survey weight).
    - ensaantro (anthropometry & blood pressure):
        Key columns: an01_1/an01_2 (weight kg), an04_1/an04_2 (height cm),
        an27_01s-an27_03s / an27_01d-an27_03d (systolic/diastolic BP),
        h0302 (sex), h0303 (age), entidad, ponde_f (survey weight).

Processing logic:
    1. Download CSVs from ENSANUT site (POST with base64 file key).
    2. Diabetes: a0301 == 1 (doctor-diagnosed).
    3. Hypertension (self-reported): a0401 == 1 (doctor-diagnosed).
    4. Hypertension (measured): average of 2nd+3rd BP readings >= 140/90.
    5. Obesity: BMI >= 30 (from average of two weight/height measurements).
    6. Overweight: 25 <= BMI < 30.
    7. Compute weighted prevalence by age group, sex, state.
    8. Upsert into ensanut_stats table.

Usage:
    python -m ingest.pipelines.health.ensanut --year 2022
    python -m ingest.pipelines.health.ensanut --dry-run
"""

import argparse
import logging
import os
import ssl
import urllib.request
import zipfile
from pathlib import Path
from typing import Any

import pandas as pd
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ingest.pipelines.health.ensanut")

# ---------------------------------------------------------------------------
# Download configuration
# ---------------------------------------------------------------------------

# Base64-encoded file keys extracted from the ENSANUT download page.
# The site uses POST form submit with these keys to serve the actual ZIP files.
DOWNLOAD_KEYS_2022 = {
    "adult_health": (
        "MDEtQ29tcG9uZW50ZSBkZSBTQUxVRC8wNC1DdWVzdGlvbmFyaW8gZGUgc2FsdWQg"
        "ZGUgYWR1bHRvcyAoMjAgYcOxb3MgbyBtw6FzKS9lbnNhZHVsMjAyMl9lbnRyZWdh"
        "X3cuY3N2LmNzdi56aXA="
    ),
    "anthropometry": (
        "MDItQ29tcG9uZW50ZSBkZSBOVVRSSUNJw5NOLzAxLUN1ZXN0aW9uYXJpbyBkZSBh"
        "bnRyb3BvbWV0csOtYSB5IHRlbnNpw7NuIGFydGVyaWFsL2Vuc2FhbnRybzIwMjJf"
        "ZW50cmVnYV93LmNzdi5jc3Yuemlw"
    ),
}

DOWNLOAD_URL_2022 = "https://ensanut.insp.mx/encuestas/ensanutcontinua2022/descargas.php"

CACHE_DIR = Path("data/ensanut")

# ---------------------------------------------------------------------------
# Age brackets
# ---------------------------------------------------------------------------

AGE_BRACKETS = [
    (20, 29, "20-29"),
    (30, 39, "30-39"),
    (40, 49, "40-49"),
    (50, 59, "50-59"),
    (60, 69, "60-69"),
    (70, 79, "70-79"),
    (80, 999, "80+"),
]

SEX_MAP = {1: "M", 2: "F"}


def age_to_bracket(age: int) -> str:
    """Map age in years to a bracket label."""
    for lo, hi, label in AGE_BRACKETS:
        if lo <= age <= hi:
            return label
    if age >= 20:
        return "80+"
    return "unknown"


# ---------------------------------------------------------------------------
# Download helpers
# ---------------------------------------------------------------------------

def download_ensanut_csv(component: str, year: int = 2022) -> Path:
    """Download and extract an ENSANUT CSV component.

    Args:
        component: 'adult_health' or 'anthropometry'
        year: Survey year (currently only 2022 supported)

    Returns:
        Path to extracted CSV file.
    """
    if year != 2022:
        raise ValueError(f"Only 2022 is currently supported, got {year}")

    cache_dir = CACHE_DIR
    cache_dir.mkdir(parents=True, exist_ok=True)

    key = DOWNLOAD_KEYS_2022[component]
    zip_name = f"ensanut_{component}_{year}.csv.zip"
    zip_path = cache_dir / zip_name

    # Check for already-extracted CSVs
    extract_dir = cache_dir / f"{component}_{year}"
    existing_csvs = list(extract_dir.glob("*.csv")) if extract_dir.exists() else []

    # Also check the original extraction dirs
    if component == "adult_health":
        alt_dir = cache_dir / "ensadul2022"
        alt_csvs = list(alt_dir.glob("*.csv")) if alt_dir.exists() else []
        if alt_csvs:
            logger.info("Using cached CSV: %s", alt_csvs[0])
            return alt_csvs[0]
    elif component == "anthropometry":
        alt_dir = cache_dir / "ensaantro2022"
        alt_csvs = list(alt_dir.glob("*.csv")) if alt_dir.exists() else []
        if alt_csvs:
            logger.info("Using cached CSV: %s", alt_csvs[0])
            return alt_csvs[0]

    if existing_csvs:
        logger.info("Using cached CSV: %s", existing_csvs[0])
        return existing_csvs[0]

    # Download via POST
    logger.info("Downloading ENSANUT %s %d from %s", component, year, DOWNLOAD_URL_2022)
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    post_data = f"ArchId{key}=".encode("utf-8")
    req = urllib.request.Request(
        DOWNLOAD_URL_2022,
        data=post_data,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    resp = urllib.request.urlopen(req, context=ctx, timeout=300)
    content_type = resp.headers.get("Content-Type", "")

    if "zip" not in content_type and "octet" not in content_type:
        raise RuntimeError(
            f"Expected ZIP but got {content_type} for {component}. "
            "The ENSANUT download page may have changed."
        )

    with open(zip_path, "wb") as fp:
        fp.write(resp.read())
    logger.info("Downloaded %s (%d bytes)", zip_path, zip_path.stat().st_size)

    # Extract
    extract_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as zf:
        csv_names = [n for n in zf.namelist() if n.lower().endswith(".csv")]
        if not csv_names:
            raise FileNotFoundError(f"No CSV found in {zip_path}")
        zf.extract(csv_names[0], extract_dir)
        csv_path = extract_dir / csv_names[0]

    logger.info("Extracted %s", csv_path)
    return csv_path


# ---------------------------------------------------------------------------
# Data parsing helpers
# ---------------------------------------------------------------------------

def parse_comma_decimal(series: pd.Series) -> pd.Series:
    """Convert a series with comma decimals (e.g. '69,3') to float."""
    return pd.to_numeric(
        series.astype(str).str.strip().str.replace(",", "."),
        errors="coerce",
    )


def compute_weighted_prevalence(
    df: pd.DataFrame,
    condition_col: str,
    group_cols: list[str],
    weight_col: str = "weight",
) -> pd.DataFrame:
    """Compute weighted prevalence for a binary condition column.

    Args:
        df: DataFrame with condition column (1=positive, 0=negative) and weights.
        condition_col: Column name for the binary condition.
        group_cols: Columns to group by (e.g. ['age_group', 'sex', 'geo_code']).
        weight_col: Survey weight column name.

    Returns:
        DataFrame with columns: group_cols + [prevalence_pct, sample_size].
    """
    grouped = df.groupby(group_cols, as_index=False).agg(
        weighted_positive=(condition_col, lambda x: (x * df.loc[x.index, weight_col]).sum()),
        weighted_total=(weight_col, "sum"),
        sample_size=(condition_col, "count"),
    )
    grouped["prevalence_pct"] = round(
        grouped["weighted_positive"] / grouped["weighted_total"] * 100, 2
    )
    return grouped[group_cols + ["prevalence_pct", "sample_size"]]


# ---------------------------------------------------------------------------
# Processing: diabetes & hypertension (adult health questionnaire)
# ---------------------------------------------------------------------------

def process_adult_health(year: int = 2022) -> list[dict[str, Any]]:
    """Process adult health questionnaire for diabetes and hypertension.

    Key columns:
        a0301: 1=doctor-diagnosed diabetes, 2=borderline, 3=no
        a0401: 1=doctor-diagnosed hypertension, 2=borderline, 3=no
        sexo: 1=M, 2=F
        edad: age in years (20+)
        entidad: state code (1-32)
        ponde_f: survey weight (comma decimal)
    """
    csv_path = download_ensanut_csv("adult_health", year)
    logger.info("Processing adult health: %s", csv_path)

    df = pd.read_csv(
        csv_path,
        sep=";",
        encoding="latin-1",
        low_memory=False,
        usecols=["entidad", "edad", "sexo", "a0301", "a0401", "ponde_f"],
    )
    logger.info("Loaded %d adult health records", len(df))

    # Parse fields
    df["weight"] = parse_comma_decimal(df["ponde_f"])
    df["sex"] = df["sexo"].map(SEX_MAP)
    df["age_group"] = df["edad"].apply(age_to_bracket)
    df["geo_code"] = df["entidad"].apply(lambda x: str(int(x)).zfill(2))

    # Binary condition flags
    df["has_diabetes"] = (df["a0301"] == 1).astype(int)
    df["has_hypertension"] = (df["a0401"] == 1).astype(int)

    # Drop rows with missing weight or sex
    df = df.dropna(subset=["weight", "sex"])
    df = df[df["weight"] > 0]
    df = df[df["age_group"] != "unknown"]

    rows = []

    for condition_col, condition_name in [
        ("has_diabetes", "diabetes"),
        ("has_hypertension", "hypertension"),
    ]:
        # -- By age group + sex + state --
        for geo_code in ["00"] + sorted(df["geo_code"].unique()):
            subset = df if geo_code == "00" else df[df["geo_code"] == geo_code]
            if len(subset) == 0:
                continue

            # By age_group and sex
            for age_group in ["20+"] + [b[2] for b in AGE_BRACKETS]:
                age_subset = subset if age_group == "20+" else subset[subset["age_group"] == age_group]
                if len(age_subset) == 0:
                    continue

                for sex_label in ["all", "M", "F"]:
                    sex_subset = age_subset if sex_label == "all" else age_subset[age_subset["sex"] == sex_label]
                    if len(sex_subset) == 0:
                        continue

                    weighted_pos = (sex_subset[condition_col] * sex_subset["weight"]).sum()
                    weighted_total = sex_subset["weight"].sum()
                    if weighted_total > 0:
                        prevalence = round(weighted_pos / weighted_total * 100, 2)
                    else:
                        prevalence = None

                    rows.append({
                        "year": year,
                        "geo_code": geo_code,
                        "condition": condition_name,
                        "age_group": age_group,
                        "sex": sex_label,
                        "prevalence_pct": prevalence,
                        "sample_size": len(sex_subset),
                    })

    logger.info("Adult health: %d aggregate rows", len(rows))
    return rows


# ---------------------------------------------------------------------------
# Processing: obesity, overweight, measured hypertension (anthropometry)
# ---------------------------------------------------------------------------

def process_anthropometry(year: int = 2022) -> list[dict[str, Any]]:
    """Process anthropometry data for obesity, overweight, and measured hypertension.

    Key columns:
        an01_1, an01_2: weight (kg), two measurements (comma decimal)
        an04_1, an04_2: height (cm), two measurements (comma decimal)
        an27_01s-an27_03s: systolic BP readings 1-3
        an27_01d-an27_03d: diastolic BP readings 1-3
        h0302: sex (1=M, 2=F)
        h0303: age in years
        entidad: state code
        ponde_f: survey weight (comma decimal)
    """
    csv_path = download_ensanut_csv("anthropometry", year)
    logger.info("Processing anthropometry: %s", csv_path)

    use_cols = [
        "entidad", "h0302", "h0303", "ponde_f",
        "an01_1", "an01_2", "an04_1", "an04_2",
        "an27_01s", "an27_01d", "an27_02s", "an27_02d", "an27_03s", "an27_03d",
    ]
    df = pd.read_csv(
        csv_path,
        sep=";",
        encoding="latin-1",
        low_memory=False,
        usecols=use_cols,
    )
    logger.info("Loaded %d anthropometry records", len(df))

    # Parse fields
    df["weight_survey"] = parse_comma_decimal(df["ponde_f"])
    df["sex"] = df["h0302"].map(SEX_MAP)
    df["age"] = pd.to_numeric(df["h0303"], errors="coerce")

    # Filter to adults 20+
    df = df[df["age"] >= 20].copy()
    df["age_group"] = df["age"].apply(age_to_bracket)
    df["geo_code"] = df["entidad"].apply(lambda x: str(int(x)).zfill(2))

    # Drop rows without survey weight
    df = df.dropna(subset=["weight_survey", "sex"])
    df = df[df["weight_survey"] > 0]

    # -- BMI computation --
    # Average of two measurements for weight (kg) and height (cm)
    df["weight_kg_1"] = parse_comma_decimal(df["an01_1"])
    df["weight_kg_2"] = parse_comma_decimal(df["an01_2"])
    df["height_cm_1"] = parse_comma_decimal(df["an04_1"])
    df["height_cm_2"] = parse_comma_decimal(df["an04_2"])

    df["weight_kg"] = df[["weight_kg_1", "weight_kg_2"]].mean(axis=1)
    df["height_cm"] = df[["height_cm_1", "height_cm_2"]].mean(axis=1)
    df["height_m"] = df["height_cm"] / 100.0

    # BMI = weight / height^2
    df["bmi"] = df["weight_kg"] / (df["height_m"] ** 2)

    # Sanity filter: BMI between 10 and 80
    valid_bmi = df["bmi"].between(10, 80, inclusive="both")
    df_bmi = df[valid_bmi].copy()
    logger.info("Adults with valid BMI: %d / %d", len(df_bmi), len(df))

    df_bmi["is_obese"] = (df_bmi["bmi"] >= 30).astype(int)
    df_bmi["is_overweight"] = ((df_bmi["bmi"] >= 25) & (df_bmi["bmi"] < 30)).astype(int)

    # -- Blood pressure computation --
    # Use average of 2nd and 3rd readings (standard ENSANUT protocol).
    # Fall back to whichever readings are available.
    for col in ["an27_01s", "an27_01d", "an27_02s", "an27_02d", "an27_03s", "an27_03d"]:
        df[col] = pd.to_numeric(df[col].astype(str).str.strip(), errors="coerce")

    # Average of readings 2 and 3 (preferred), fallback to available readings
    df["sys_23"] = df[["an27_02s", "an27_03s"]].mean(axis=1)
    df["dia_23"] = df[["an27_02d", "an27_03d"]].mean(axis=1)
    # If both 2nd and 3rd are missing, use 1st reading
    df["systolic"] = df["sys_23"].fillna(df["an27_01s"])
    df["diastolic"] = df["dia_23"].fillna(df["an27_01d"])

    valid_bp = df["systolic"].notna() & df["diastolic"].notna()
    df_bp = df[valid_bp].copy()
    logger.info("Adults with valid BP: %d / %d", len(df_bp), len(df))

    df_bp["is_hypertensive_measured"] = (
        (df_bp["systolic"] >= 140) | (df_bp["diastolic"] >= 90)
    ).astype(int)

    # -- Build output rows --
    rows = []

    # Obesity and overweight from BMI data
    for condition_col, condition_name in [
        ("is_obese", "obesity"),
        ("is_overweight", "overweight"),
    ]:
        for geo_code in ["00"] + sorted(df_bmi["geo_code"].unique()):
            subset = df_bmi if geo_code == "00" else df_bmi[df_bmi["geo_code"] == geo_code]
            if len(subset) == 0:
                continue

            for age_group in ["20+"] + [b[2] for b in AGE_BRACKETS]:
                age_subset = subset if age_group == "20+" else subset[subset["age_group"] == age_group]
                if len(age_subset) == 0:
                    continue

                for sex_label in ["all", "M", "F"]:
                    sex_subset = age_subset if sex_label == "all" else age_subset[age_subset["sex"] == sex_label]
                    if len(sex_subset) == 0:
                        continue

                    weighted_pos = (sex_subset[condition_col] * sex_subset["weight_survey"]).sum()
                    weighted_total = sex_subset["weight_survey"].sum()
                    if weighted_total > 0:
                        prevalence = round(weighted_pos / weighted_total * 100, 2)
                    else:
                        prevalence = None

                    rows.append({
                        "year": year,
                        "geo_code": geo_code,
                        "condition": condition_name,
                        "age_group": age_group,
                        "sex": sex_label,
                        "prevalence_pct": prevalence,
                        "sample_size": len(sex_subset),
                    })

    # Measured hypertension from BP data
    for geo_code in ["00"] + sorted(df_bp["geo_code"].unique()):
        subset = df_bp if geo_code == "00" else df_bp[df_bp["geo_code"] == geo_code]
        if len(subset) == 0:
            continue

        for age_group in ["20+"] + [b[2] for b in AGE_BRACKETS]:
            age_subset = subset if age_group == "20+" else subset[subset["age_group"] == age_group]
            if len(age_subset) == 0:
                continue

            for sex_label in ["all", "M", "F"]:
                sex_subset = age_subset if sex_label == "all" else age_subset[age_subset["sex"] == sex_label]
                if len(sex_subset) == 0:
                    continue

                weighted_pos = (sex_subset["is_hypertensive_measured"] * sex_subset["weight_survey"]).sum()
                weighted_total = sex_subset["weight_survey"].sum()
                if weighted_total > 0:
                    prevalence = round(weighted_pos / weighted_total * 100, 2)
                else:
                    prevalence = None

                rows.append({
                    "year": year,
                    "geo_code": geo_code,
                    "condition": "hypertension_measured",
                    "age_group": age_group,
                    "sex": sex_label,
                    "prevalence_pct": prevalence,
                    "sample_size": len(sex_subset),
                })

    logger.info("Anthropometry: %d aggregate rows", len(rows))
    return rows


# ---------------------------------------------------------------------------
# DB upsert
# ---------------------------------------------------------------------------

def upsert_ensanut(conn: Any, rows: list[dict[str, Any]]) -> int:
    """Bulk upsert ensanut_stats rows."""
    if not rows:
        return 0

    # Ensure all numeric values are plain Python types (not numpy)
    for row in rows:
        if row["prevalence_pct"] is not None:
            row["prevalence_pct"] = float(row["prevalence_pct"])
        if row["sample_size"] is not None:
            row["sample_size"] = int(row["sample_size"])

    sql = """
        INSERT INTO ensanut_stats (
            year, geo_code, condition, age_group, sex, prevalence_pct, sample_size
        ) VALUES (
            %(year)s, %(geo_code)s, %(condition)s, %(age_group)s,
            %(sex)s, %(prevalence_pct)s, %(sample_size)s
        )
        ON CONFLICT (year, geo_code, condition, age_group, sex) DO UPDATE SET
            prevalence_pct = EXCLUDED.prevalence_pct,
            sample_size    = EXCLUDED.sample_size
    """
    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, sql, rows, page_size=1000)
    conn.commit()
    logger.info("Upserted %d ensanut_stats rows", len(rows))
    return len(rows)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Process ENSANUT microdata for health prevalence estimates."
    )
    parser.add_argument(
        "--year",
        type=int,
        default=2022,
        help="Survey year to process (default: 2022).",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Process all available years (currently only 2022).",
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

    years = [2022] if args.all else [args.year]

    conn = None
    if not args.dry_run:
        db_url = os.getenv("DATABASE_URL", "")
        if not db_url:
            logger.error("DATABASE_URL not set. Use --dry-run or set the env var.")
            return
        conn = psycopg2.connect(db_url)
        logger.info("Connected to database.")

    total = 0
    try:
        for year in years:
            logger.info("=== ENSANUT %d ===", year)

            # Adult health: diabetes, hypertension (self-reported)
            health_rows = process_adult_health(year)

            # Anthropometry: obesity, overweight, measured hypertension
            antro_rows = process_anthropometry(year)

            all_rows = health_rows + antro_rows
            logger.info(
                "Year %d: %d total rows (%d health, %d anthropometry)",
                year, len(all_rows), len(health_rows), len(antro_rows),
            )

            if not args.dry_run and conn:
                total += upsert_ensanut(conn, all_rows)
            else:
                # Print summary
                conditions = {}
                for r in all_rows:
                    c = r["condition"]
                    if c not in conditions:
                        conditions[c] = []
                    conditions[c].append(r)

                for cond, cond_rows in sorted(conditions.items()):
                    national_20plus_all = [
                        r for r in cond_rows
                        if r["geo_code"] == "00" and r["age_group"] == "20+" and r["sex"] == "all"
                    ]
                    if national_20plus_all:
                        r = national_20plus_all[0]
                        logger.info(
                            "[DRY RUN] %s: national 20+ prevalence = %.1f%% (n=%d)",
                            cond, r["prevalence_pct"], r["sample_size"],
                        )
    finally:
        if conn:
            conn.close()

    logger.info("Done. Total rows upserted: %d", total)


if __name__ == "__main__":
    main()
