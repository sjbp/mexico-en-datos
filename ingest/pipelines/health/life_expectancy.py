"""Life expectancy at birth (CONAPO, via INEGI's interactive tables).

CONAPO's own download links are broken since its site moved to gob.mx, and
the series is not in INEGI's indicator API. INEGI republishes it as an
interactive table backed by a PX-Web JSON endpoint, which we query here.

Source (as cited by INEGI):
    CONAPO. Conciliacion Demografica de 1950 a 2019 y Proyecciones de la
    poblacion de Mexico y de las entidades federativas 2020 a 2070.
Table:
    https://www.inegi.org.mx/app/tabulados/interactivos/?px=Mortalidad_09&bd=Mortalidad

Years from 2020 on are CONAPO projections. We store every year up to the
current one and skip future projections.

Usage:
    python -m ingest.pipelines.health.life_expectancy
    python -m ingest.pipelines.health.life_expectancy --dry-run
"""

import argparse
import logging
import sys
from datetime import date
from typing import Any

import requests
from dotenv import load_dotenv

from ingest.utils.db import get_connection, upsert_indicator, upsert_values

load_dotenv()

logger = logging.getLogger("ingest.pipelines.health.life_expectancy")

DATATABLE_URL = "https://www.inegi.org.mx/app/tabulados/pxwebapi/api/datatable"
TABLE_FILE = "Mortalidad/Mortalidad_09"

INDICATOR = {
    "id": "esperanza_vida",
    "name_es": "Esperanza de vida al nacer",
    "name_en": "Life expectancy at birth",
    "topic": "health",
    "subtopic": "",
    "unit": "years",
    "frequency": "annual",
    "source": "CONAPO",
    "geo_levels": ["national", "state"],
}


def fetch_table() -> dict[str, Any]:
    """Request the full table (all states, years and sexes) as JSON."""
    all_values = {"filter": "all", "values": ["*"]}
    body = {
        "query": {
            "query": [
                {"code": "Entidad federativa", "selection": all_values},
                {"code": "Periodo", "selection": all_values},
                {"code": "Sexo", "selection": all_values},
            ],
            "response": {"format": "json-stat"},
        },
        "lang": "es",
        "file": TABLE_FILE,
        "stub": ["Entidad federativa"],
        "heading": ["Periodo", "Sexo"],
    }
    resp = requests.post(DATATABLE_URL, json=body, timeout=60)
    resp.raise_for_status()
    return resp.json()


def parse_table(table: dict[str, Any], max_year: int) -> list[dict[str, Any]]:
    """Extract total (both sexes) life expectancy by state and year.

    Layout: one row per state (INEGI code order, 0 = national), columns are
    year x sex, with sex varying fastest. Cells look like "75.3||".
    """
    stub = table["stub"][0]
    periods, sexes = table["heading"]
    if stub["label"][0] != "Estados Unidos Mexicanos" or stub["size"] != 33:
        raise ValueError(f"Unexpected state layout: {stub['label'][:2]}, size={stub['size']}")
    if sexes["label"][0] != "Total":
        raise ValueError(f"Unexpected sex layout: {sexes['label']}")

    n_cols = table["colCount"]
    data = table["data"]
    values = []
    for row in range(stub["size"]):
        geo_code = f"{row:02d}"
        for p_idx, year_label in enumerate(periods["label"]):
            year = int(year_label)
            if year > max_year:
                continue
            raw = data[row * n_cols + p_idx * sexes["size"]].split("|")[0].strip()
            if not raw:
                continue
            values.append({
                "geo_code": geo_code,
                "period": str(year),
                "period_date": f"{year}-01-01",
                "value": float(raw),
                "status": "projection" if year >= 2020 else "final",
            })
    return values


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Load life expectancy at birth (CONAPO).")
    parser.add_argument("--dry-run", action="store_true", help="Parse without writing to the DB.")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    values = parse_table(fetch_table(), max_year=date.today().year)
    national = [v for v in values if v["geo_code"] == "00"]
    if len(national) < 10:
        logger.error("Only %d national values parsed; table format may have changed", len(national))
        sys.exit(1)
    logger.info(
        "Parsed %d values (%d national, %s-%s)",
        len(values), len(national), national[0]["period"], national[-1]["period"],
    )

    if args.dry_run:
        for v in national:
            logger.info("  %s: %.1f", v["period"], v["value"])
        return

    conn = get_connection()
    try:
        upsert_indicator(conn, INDICATOR)
        count = upsert_values(conn, INDICATOR["id"], values)
        logger.info("Upserted %d values for %s", count, INDICATOR["id"])
    finally:
        conn.close()


if __name__ == "__main__":
    main()
