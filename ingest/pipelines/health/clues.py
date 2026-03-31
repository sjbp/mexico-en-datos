"""CLUES Health Facility Catalog Pipeline.

Downloads the CLUES (Clave Unica de Establecimientos de Salud) catalog from
the Secretaria de Salud and loads it into the health_facilities table.

Data source:
    http://www.dgis.salud.gob.mx/contenidos/intercambio/clues_gobmx.html
    Direct CSV download (periodic updates, ~30K+ facilities).

The CLUES catalog contains every registered health facility in Mexico:
    - Public: IMSS, ISSSTE, SSA/INSABI/IMSS-Bienestar, PEMEX, SEDENA, SEMAR
    - Private: hospitals, clinics, labs, pharmacies
    - Each facility has a unique CLUES ID, geolocation, institution, type

Key columns:
    - CLUES: unique facility identifier
    - NOMBRE: facility name
    - INSTITUCION: operating institution (IMSS, SSA, ISSSTE, etc.)
    - TIPOLOGIA: facility type classification
    - CVE_ENT + CVE_MUN: state and municipality codes (INEGI-compatible)
    - DOMICILIO: address
    - LATITUD, LONGITUD: geolocation (not always populated)
    - ESTATUS: active/inactive

Processing logic:
    1. Download CSV from DGIS/Salud portal.
    2. Filter to active facilities only.
    3. Normalize institution names to our standard categories.
    4. Build geo_code from CVE_ENT + CVE_MUN.
    5. Upsert into health_facilities table.

Usage:
    python -m ingest.pipelines.health.clues --full
    python -m ingest.pipelines.health.clues --dry-run
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

logger = logging.getLogger("ingest.pipelines.health.clues")

CLUES_URL = "http://www.dgis.salud.gob.mx/descargas/csv/clues.csv"

# Normalize raw institution names to our categories
INSTITUTION_MAP: dict[str, str] = {
    "IMSS": "IMSS",
    "ISSSTE": "ISSSTE",
    "SSA": "SSA",
    "IMSS-BIENESTAR": "IMSS-Bienestar",
    "INSABI": "IMSS-Bienestar",  # Transitioned in 2023
    "PEMEX": "PEMEX",
    "SEDENA": "SEDENA",
    "SEMAR": "SEMAR",
    "DIF": "DIF",
    "UNIVERSITARIO": "Universitario",
    "PRIVADA": "Privada",
    "CRUZ ROJA": "Cruz Roja",
}

FACILITY_TYPE_MAP: dict[str, str] = {
    "HOSPITAL GENERAL": "hospital",
    "HOSPITAL ESPECIALIZADO": "hospital",
    "HOSPITAL PSIQUIATRICO": "hospital",
    "HOSPITAL INTEGRAL": "hospital",
    "CENTRO DE SALUD": "health_center",
    "CENTRO DE SALUD URBANO": "health_center",
    "CENTRO DE SALUD RURAL": "health_center",
    "UNIDAD DE MEDICINA FAMILIAR": "clinic",
    "CLINICA DE MEDICINA FAMILIAR": "clinic",
    "CONSULTORIO": "clinic",
    "LABORATORIO": "lab",
    "FARMACIA": "pharmacy",
}


def normalize_institution(raw: str) -> str:
    """Map raw institution name to standard category."""
    raw_upper = raw.strip().upper()
    for key, value in INSTITUTION_MAP.items():
        if key in raw_upper:
            return value
    return "Otra"


def normalize_facility_type(raw: str) -> str:
    """Map raw facility type to standard category."""
    raw_upper = raw.strip().upper()
    for key, value in FACILITY_TYPE_MAP.items():
        if key in raw_upper:
            return value
    return "other"


def download_clues(cache_dir: Path | None = None) -> Path | None:
    """Download CLUES CSV catalog.

    Returns path to downloaded CSV, or None if download fails.
    """
    import urllib.request

    if cache_dir is None:
        cache_dir = Path("data/cache/clues")
    cache_dir.mkdir(parents=True, exist_ok=True)

    csv_path = cache_dir / "clues.csv"
    if csv_path.exists():
        logger.info("Using cached CLUES CSV: %s", csv_path)
        return csv_path

    try:
        logger.info("Downloading CLUES catalog from %s", CLUES_URL)
        urllib.request.urlretrieve(CLUES_URL, csv_path)
        return csv_path
    except Exception:
        logger.exception("Failed to download CLUES catalog")
        return None


def process_clues(csv_path: Path) -> list[dict[str, Any]]:
    """Parse CLUES CSV and return list of health_facilities rows."""
    rows = []
    with open(csv_path, encoding="latin-1") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Skip inactive facilities
            estatus = row.get("ESTATUS", "").strip().upper()
            if estatus and "ACTIV" not in estatus:
                continue

            clues_id = row.get("CLUES", "").strip()
            if not clues_id:
                continue

            ent = row.get("CVE_ENT", "00").strip().zfill(2)
            mun = row.get("CVE_MUN", "000").strip().zfill(3)
            geo_code = f"{ent}{mun}"

            lat = row.get("LATITUD", "").strip()
            lng = row.get("LONGITUD", "").strip()

            rows.append({
                "clues_id": clues_id,
                "name": row.get("NOMBRE", "").strip(),
                "institution": normalize_institution(row.get("INSTITUCION", "")),
                "facility_type": normalize_facility_type(row.get("TIPOLOGIA", "")),
                "geo_code": geo_code,
                "address": row.get("DOMICILIO", "").strip(),
                "lat": float(lat) if lat else None,
                "lng": float(lng) if lng else None,
                "services": None,  # populated from separate CLUES services dataset
                "last_updated": None,
            })

    logger.info("Parsed %d active facilities from CLUES", len(rows))
    return rows


def upsert_facilities(conn: Any, rows: list[dict[str, Any]]) -> int:
    """Bulk upsert health_facilities rows."""
    if not rows:
        return 0

    sql = """
        INSERT INTO health_facilities (
            clues_id, name, institution, facility_type, geo_code,
            address, lat, lng, services, last_updated
        ) VALUES (
            %(clues_id)s, %(name)s, %(institution)s, %(facility_type)s, %(geo_code)s,
            %(address)s, %(lat)s, %(lng)s, %(services)s, %(last_updated)s
        )
        ON CONFLICT (clues_id) DO UPDATE SET
            name          = EXCLUDED.name,
            institution   = EXCLUDED.institution,
            facility_type = EXCLUDED.facility_type,
            geo_code      = EXCLUDED.geo_code,
            address       = EXCLUDED.address,
            lat           = EXCLUDED.lat,
            lng           = EXCLUDED.lng,
            services      = EXCLUDED.services,
            last_updated  = EXCLUDED.last_updated
    """
    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, sql, rows, page_size=500)
    conn.commit()
    logger.info("Upserted %d health facilities", len(rows))
    return len(rows)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Import CLUES health facility catalog into the database."
    )
    parser.add_argument("--full", action="store_true", help="Full reload of CLUES catalog.")
    parser.add_argument("--dry-run", action="store_true", help="Don't write to DB.")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    csv_path = download_clues()
    if csv_path is None:
        logger.error("No CLUES data available.")
        return

    rows = process_clues(csv_path)

    if args.dry_run:
        logger.info("[DRY RUN] Would upsert %d facilities", len(rows))
        return

    conn = psycopg2.connect(os.getenv("DATABASE_URL", ""))
    try:
        upsert_facilities(conn, rows)
    finally:
        conn.close()

    logger.info("Done.")


if __name__ == "__main__":
    main()
