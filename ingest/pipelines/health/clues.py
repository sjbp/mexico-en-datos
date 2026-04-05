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

CLUES_URL = "http://www.dgis.salud.gob.mx/descargas/datosabiertos/recursosSalud/CLUES_2024.csv"
CLUES_URL_ALT = "http://www.dgis.salud.gob.mx/descargas/csv/clues.csv"

# Map CLAVE DE LA INSTITUCION codes to readable names
INSTITUTION_MAP: dict[str, str] = {
    "IMS": "IMSS",
    "IST": "ISSSTE",
    "SSA": "SSA",
    "IMB": "IMSS-Bienestar",
    "IMO": "IMSS-Bienestar",       # IMSS-Oportunidades → IMSS-Bienestar
    "PMX": "PEMEX",
    "SDN": "SEDENA",
    "SMA": "SEMAR",
    "DIF": "DIF",
    "HUN": "Universitario",
    "CRO": "Cruz Roja",
    "CIJ": "CIJ",                   # Centros de Integración Juvenil
    "SMP": "Privada",               # Sector Médico Privado
    "SME": "Estatal",               # Servicios Médicos Estatales
    "SMM": "Municipal",             # Servicios Médicos Municipales
    "SPC": "Protección Civil",
    "SCT": "SCT",
    "PGR": "PGR/FGR",
    "FGE": "FGR",                   # Fiscalía General del Estado
}

# Map NOMBRE TIPO ESTABLECIMIENTO to our categories
FACILITY_TYPE_MAP: dict[str, str] = {
    "HOSPITALIZ": "hospital",        # Matches HOSPITALIZACIÓN (with accent)
    "CONSULTA EXTERNA": "clinic",
    "ASISTENCIA SOCIAL": "social_assistance",
    "APOYO": "support",
}


def normalize_institution(code: str) -> str:
    """Map institution code (CLAVE DE LA INSTITUCION) to readable name."""
    return INSTITUTION_MAP.get(code.strip().upper(), "Otra")


def normalize_facility_type(raw: str) -> str:
    """Map NOMBRE TIPO ESTABLECIMIENTO to standard category."""
    raw_upper = raw.strip().upper()
    for key, value in FACILITY_TYPE_MAP.items():
        if key in raw_upper:
            return value
    return "other"


def download_clues(cache_dir: Path | None = None) -> Path | None:
    """Download CLUES CSV catalog.

    Returns path to downloaded CSV, or None if download fails.
    Tries primary URL first, then alternative. Also checks for
    a pre-downloaded file at data/clues/CLUES_2024.csv.
    """
    import ssl
    import urllib.request

    if cache_dir is None:
        cache_dir = Path("data/cache/clues")
    cache_dir.mkdir(parents=True, exist_ok=True)

    csv_path = cache_dir / "clues.csv"

    # Check for pre-downloaded file
    predownloaded = Path("data/clues/CLUES_2024.csv")
    if predownloaded.exists():
        logger.info("Using pre-downloaded CLUES CSV: %s", predownloaded)
        return predownloaded

    if csv_path.exists():
        logger.info("Using cached CLUES CSV: %s", csv_path)
        return csv_path

    # DGIS server often has SSL cert issues — use unverified context
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    for url in [CLUES_URL, CLUES_URL_ALT]:
        try:
            logger.info("Downloading CLUES catalog from %s", url)
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, context=ctx) as resp, open(csv_path, "wb") as out:
                out.write(resp.read())
            return csv_path
        except Exception:
            logger.warning("Failed to download from %s", url)

    logger.error("Could not download CLUES catalog from any source")
    return None


def process_clues(csv_path: Path) -> list[dict[str, Any]]:
    """Parse CLUES CSV and return list of health_facilities rows.

    CSV columns (2024 format):
        CLUES, NOMBRE DE LA ENTIDAD, CLAVE DE LA ENTIDAD,
        NOMBRE DEL MUNICIPIO, CLAVE DEL MUNICIPIO,
        NOMBRE DE LA LOCALIDAD, CLAVE DE LA LOCALIDAD,
        NOMBRE DE LA INSTITUCION, CLAVE DE LA INSTITUCION,
        NOMBRE TIPO ESTABLECIMIENTO, NOMBRE DE TIPOLOGIA,
        CLAVE DE TIPOLOGIA, NOMBRE DE LA UNIDAD,
        ESTATUS DE OPERACION, AÑO CIERRE
    """
    rows = []
    with open(csv_path, encoding="latin-1") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Only keep currently operating facilities
            estatus = row.get("ESTATUS DE OPERACION", "").strip().upper()
            if estatus != "EN OPERACION":
                continue

            clues_id = row.get("CLUES", "").strip()
            if not clues_id:
                continue

            # geo_code = state code (2-digit) for state-level aggregation
            ent = row.get("CLAVE DE LA ENTIDAD", "00").strip().zfill(2)

            # Build address from locality + municipality + state
            locality = row.get("NOMBRE DE LA LOCALIDAD", "").strip()
            municipality = row.get("NOMBRE DEL MUNICIPIO", "").strip()
            state = row.get("NOMBRE DE LA ENTIDAD", "").strip()
            address_parts = [p for p in [locality, municipality, state] if p]
            address = ", ".join(address_parts)

            rows.append({
                "clues_id": clues_id,
                "name": row.get("NOMBRE DE LA UNIDAD", "").strip(),
                "institution": normalize_institution(
                    row.get("CLAVE DE LA INSTITUCION", "")
                ),
                "facility_type": normalize_facility_type(
                    row.get("NOMBRE TIPO ESTABLECIMIENTO", "")
                ),
                "geo_code": ent,
                "address": address,
                "lat": None,  # Not in 2024 CSV; available via separate geo dataset
                "lng": None,
                "services": None,
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
    parser.add_argument("--csv", type=str, help="Path to pre-downloaded CLUES CSV file.")
    parser.add_argument("--db-url", type=str, help="Database URL (overrides DATABASE_URL env var).")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    if args.csv:
        csv_path = Path(args.csv)
        if not csv_path.exists():
            logger.error("CSV file not found: %s", csv_path)
            return
    else:
        csv_path = download_clues()
        if csv_path is None:
            logger.error("No CLUES data available.")
            return

    rows = process_clues(csv_path)

    if args.dry_run:
        logger.info("[DRY RUN] Would upsert %d facilities", len(rows))
        return

    db_url = args.db_url or os.getenv("DATABASE_URL", "")
    conn = psycopg2.connect(db_url)
    try:
        upsert_facilities(conn, rows)
    finally:
        conn.close()

    logger.info("Done.")


if __name__ == "__main__":
    main()
