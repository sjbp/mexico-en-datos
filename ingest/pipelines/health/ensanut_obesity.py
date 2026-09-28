"""Adult obesity prevalence, as published by INSP (ENSANUT).

Obesity is not computed from microdata: the public anthropometry files
are a subset of the sample INSP analyzes, so they cannot reproduce the
official figures (see ensanut.py). Values are transcribed from INSP's
publications. Add a year when INSP publishes a single-year national
figure for adults 20+.

Sources (adults 20+, BMI >= 30, national):
    2006, 2012, 2016, 2022: Campos-Nonato et al., "Prevalencia de obesidad y
        factores de riesgo asociados en adultos mexicanos: Ensanut 2022",
        Salud Publica Mex 2023, cuadro de tendencias 2006-2022.
        https://ensanut.insp.mx/encuestas/ensanutcontinua2022/doctos/analiticos/31-Obesidad.y.riesgo-ENSANUT2022-14809-72498-2-10-20230619.pdf
    2023: INSP, Ensanut Continua 2023, Resultados Nacionales, seccion 9.1.
        https://ensanut.insp.mx/encuestas/ensanutcontinua2023/doctos/informes/ensanut_23_112024.pdf

Usage:
    python -m ingest.pipelines.health.ensanut_obesity
    python -m ingest.pipelines.health.ensanut_obesity --dry-run
"""

import argparse
import logging

from dotenv import load_dotenv

from ingest.utils.db import get_connection, upsert_indicator, upsert_values

load_dotenv()

logger = logging.getLogger("ingest.pipelines.health.ensanut_obesity")

INDICATOR = {
    "id": "ensanut_obesidad",
    "name_es": "Obesidad en adultos (20 anos o mas)",
    "name_en": "Adult obesity (20+)",
    "topic": "health",
    "subtopic": "",
    "unit": "percent",
    "frequency": "annual",
    "source": "ENSANUT",
    "geo_levels": ["national"],
}

# National % of adults 20+ with BMI >= 30
VALUES = {
    "2006": 30.4,
    "2012": 32.4,
    "2016": 33.3,
    "2022": 36.9,
    "2023": 38.9,
}


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Load INSP's published adult obesity figures.")
    parser.add_argument("--dry-run", action="store_true", help="Print values without writing.")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    values = [
        {"geo_code": "00", "period": year, "period_date": f"{year}-01-01", "value": v, "status": "final"}
        for year, v in sorted(VALUES.items())
    ]
    if args.dry_run:
        logger.info("[DRY RUN] %s: %s", INDICATOR["id"], VALUES)
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
