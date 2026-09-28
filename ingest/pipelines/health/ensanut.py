"""ENSANUT health survey processing pipeline.

Processes ENSANUT Continua adult-questionnaire microdata into weighted
prevalence of doctor-diagnosed diabetes and hypertension (adults 20+).

Data source:
    https://ensanut.insp.mx/encuestas/ensanutcontinua{year}/descargas.php

Validation against INSP's published national figures (adults 20+):
    2022: diabetes 10.9%, hypertension 15.9% -> pipeline 10.9 / 15.9
    2023: diabetes 11.0%, hypertension 17.4% -> pipeline 11.0 / 17.3

Obesity and measured hypertension are not computed here: the public
anthropometry files are a subset of the sample INSP analyzes (e.g. ~2.6K
valid adults vs 5,474 in 2023), so they cannot reproduce the official
figures. Official obesity is loaded by ensanut_obesity.py instead.

Processing logic:
    1. Find the adult-questionnaire CSV on the year's download page (the
       site serves files via POST with a base64 key embedded in the page).
    2. Diabetes: a0301 == 1 (doctor-diagnosed; excludes gestational).
    3. Hypertension: a0401 == 1 (doctor-diagnosed; excludes pregnancy-only).
    4. Weighted prevalence (ponde_f) by state, age group and sex.
    5. Upsert into ensanut_stats.

Usage:
    python -m ingest.pipelines.health.ensanut --year 2024
    python -m ingest.pipelines.health.ensanut --all
    python -m ingest.pipelines.health.ensanut --year 2024 --dry-run
"""

import argparse
import base64
import io
import logging
import os
import re
import ssl
import sys
import urllib.request
import zipfile
from datetime import date
from pathlib import Path
from typing import Any

import pandas as pd
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ingest.pipelines.health.ensanut")

DOWNLOAD_URL = "https://ensanut.insp.mx/encuestas/ensanutcontinua{year}/descargas.php"
ADULT_FILE_PATTERN = re.compile(r"Cuestionario de salud de adultos.*\.csv\.csv\.zip$")
FIRST_YEAR = 2022
CACHE_DIR = Path("data/ensanut")

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

CONDITIONS = [
    ("a0301", "diabetes"),
    ("a0401", "hypertension"),
]


def age_to_bracket(age: float) -> str:
    """Map age in years to a bracket label ('unknown' under 20 or missing)."""
    for lo, hi, label in AGE_BRACKETS:
        if lo <= age <= hi:
            return label
    return "unknown"


# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------

def _ssl_context() -> ssl.SSLContext:
    # The ENSANUT site has had certificate issues; content is public data.
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def find_adult_file_key(year: int) -> str | None:
    """Return the POST key for the adult-questionnaire CSV zip, or None."""
    url = DOWNLOAD_URL.format(year=year)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        page = urllib.request.urlopen(req, context=_ssl_context(), timeout=60).read()
    except Exception as exc:
        logger.warning("Could not open %s: %s", url, exc)
        return None
    for key in re.findall(r"ArchId([A-Za-z0-9+/=]+)", page.decode("utf-8", "replace")):
        try:
            path = base64.b64decode(key).decode("utf-8", "replace")
        except ValueError:
            continue
        if ADULT_FILE_PATTERN.search(path):
            return key
    return None


def download_adult_csv(year: int) -> Path | None:
    """Download and extract the adult-questionnaire CSV. None if not published."""
    out_dir = CACHE_DIR / str(year)
    cached = sorted(out_dir.glob("*.csv")) if out_dir.exists() else []
    cached = [p for p in cached if not p.stem.endswith(("_valores", "_variables"))]
    if cached:
        logger.info("Using cached CSV: %s", cached[0])
        return cached[0]

    key = find_adult_file_key(year)
    if key is None:
        logger.warning("ENSANUT %d: adult questionnaire not found on download page", year)
        return None

    url = DOWNLOAD_URL.format(year=year)
    logger.info("Downloading ENSANUT %d adult questionnaire", year)
    req = urllib.request.Request(
        url,
        data=f"ArchId{key}=".encode("utf-8"),
        headers={"User-Agent": "Mozilla/5.0", "Content-Type": "application/x-www-form-urlencoded"},
    )
    resp = urllib.request.urlopen(req, context=_ssl_context(), timeout=300)
    content_type = resp.headers.get("Content-Type", "")
    if "zip" not in content_type and "octet" not in content_type:
        raise RuntimeError(f"Expected a ZIP for ENSANUT {year}, got {content_type}")

    zf = zipfile.ZipFile(io.BytesIO(resp.read()))
    # The zip also ships value/variable catalogs; we want the data file
    names = [
        n for n in zf.namelist()
        if n.lower().endswith(".csv") and not Path(n).stem.endswith(("_valores", "_variables"))
    ]
    if not names:
        raise FileNotFoundError(f"No data CSV in ENSANUT {year} zip: {zf.namelist()}")
    out_dir.mkdir(parents=True, exist_ok=True)
    zf.extract(names[0], out_dir)
    path = out_dir / names[0]
    logger.info("Extracted %s", path)
    return path


# ---------------------------------------------------------------------------
# Processing
# ---------------------------------------------------------------------------

def read_ensanut_csv(path: Path, usecols: list[str]) -> pd.DataFrame:
    """Read an ENSANUT CSV whatever its delimiter (';' in older, ',' in newer files)."""
    with open(path, encoding="latin-1") as f:
        header = f.readline()
    sep = ";" if header.count(";") > header.count(",") else ","
    df = pd.read_csv(path, sep=sep, encoding="latin-1", low_memory=False, dtype=str)
    # Some files start with a UTF-8 BOM read as latin-1 characters
    df.columns = [c.replace("ï»¿", "").lstrip("﻿").strip() for c in df.columns]
    missing = [c for c in usecols if c not in df.columns]
    if missing:
        raise ValueError(f"{path.name} is missing columns {missing}")
    return df[usecols]


def to_number(series: pd.Series) -> pd.Series:
    """Parse numbers that may use a decimal comma ('69,3')."""
    return pd.to_numeric(series.str.strip().str.replace(",", "."), errors="coerce")


def process_adult_health(year: int) -> list[dict[str, Any]] | None:
    """Compute diagnosed diabetes and hypertension prevalence for one year."""
    csv_path = download_adult_csv(year)
    if csv_path is None:
        return None

    df = read_ensanut_csv(csv_path, ["entidad", "edad", "sexo", "a0301", "a0401", "ponde_f"])
    logger.info("ENSANUT %d: loaded %d adult records", year, len(df))

    df = pd.DataFrame({
        "weight": to_number(df["ponde_f"]),
        "sex": to_number(df["sexo"]).map(SEX_MAP),
        "age_group": to_number(df["edad"]).apply(age_to_bracket),
        "geo_code": to_number(df["entidad"]).map(lambda x: f"{int(x):02d}" if pd.notna(x) else None),
        "a0301": to_number(df["a0301"]),
        "a0401": to_number(df["a0401"]),
    })
    df = df.dropna(subset=["weight", "sex", "geo_code"])
    df = df[(df["weight"] > 0) & (df["age_group"] != "unknown")]

    rows = []
    for column, condition in CONDITIONS:
        df["flag"] = (df[column] == 1).astype(int)
        for geo_code in ["00"] + sorted(df["geo_code"].unique()):
            geo = df if geo_code == "00" else df[df["geo_code"] == geo_code]
            for age_group in ["20+"] + [b[2] for b in AGE_BRACKETS]:
                age = geo if age_group == "20+" else geo[geo["age_group"] == age_group]
                for sex in ["all", "M", "F"]:
                    sub = age if sex == "all" else age[age["sex"] == sex]
                    if sub.empty or sub["weight"].sum() <= 0:
                        continue
                    prevalence = (sub["flag"] * sub["weight"]).sum() / sub["weight"].sum() * 100
                    rows.append({
                        "year": year,
                        "geo_code": geo_code,
                        "condition": condition,
                        "age_group": age_group,
                        "sex": sex,
                        "prevalence_pct": round(float(prevalence), 2),
                        "sample_size": int(len(sub)),
                    })

    logger.info("ENSANUT %d: %d aggregate rows", year, len(rows))
    return rows


# ---------------------------------------------------------------------------
# DB upsert
# ---------------------------------------------------------------------------

def upsert_ensanut(conn: Any, rows: list[dict[str, Any]]) -> int:
    """Bulk upsert ensanut_stats rows."""
    if not rows:
        return 0
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
        description="Process ENSANUT microdata for diagnosed diabetes and hypertension."
    )
    parser.add_argument("--year", type=int, help="Survey year to process (e.g. 2024).")
    parser.add_argument(
        "--all", action="store_true",
        help=f"Process every published year from {FIRST_YEAR} (unpublished years are skipped).",
    )
    parser.add_argument("--dry-run", action="store_true", help="Compute without writing to DB.")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable debug logging.")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    if args.all:
        years = list(range(FIRST_YEAR, date.today().year + 1))
    elif args.year:
        years = [args.year]
    else:
        parser.error("Specify --year YYYY or --all")

    conn = None
    if not args.dry_run:
        db_url = os.getenv("DATABASE_URL", "")
        if not db_url:
            logger.error("DATABASE_URL not set. Use --dry-run or set the env var.")
            sys.exit(1)
        conn = psycopg2.connect(db_url)

    processed = 0
    try:
        for year in years:
            rows = process_adult_health(year)
            if rows is None:
                continue
            processed += 1
            for condition in ("diabetes", "hypertension"):
                national = next(
                    r for r in rows
                    if r["condition"] == condition and r["geo_code"] == "00"
                    and r["age_group"] == "20+" and r["sex"] == "all"
                )
                logger.info(
                    "ENSANUT %d %s (national, 20+): %.1f%% (n=%d)",
                    year, condition, national["prevalence_pct"], national["sample_size"],
                )
            if conn is not None:
                upsert_ensanut(conn, rows)
    finally:
        if conn is not None:
            conn.close()

    if processed == 0:
        logger.error("No ENSANUT year could be processed: %s", years)
        sys.exit(1)


if __name__ == "__main__":
    main()
