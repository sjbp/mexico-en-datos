"""Multidimensional poverty indicators (CONEVAL methodology).

The measurement is biennial and based on ENIGH. Since 2025 it is published
by INEGI, which absorbed CONEVAL's measurement using the same methodology.
There is no machine-readable API, so values are transcribed from the
official publications cited below. Update after each release (ENIGH 2026
results are expected around August 2027).

Sources:
    2016-2024: INEGI, Pobreza multidimensional 2024, comunicado 118/25
        https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/pm/pm2025_08.pdf
    2008-2014: CONEVAL, Medicion de la pobreza (MCS-ENIGH series)

Usage:
    python -m ingest.pipelines.pobreza
    python -m ingest.pipelines.pobreza --dry-run
"""

import argparse
import logging

from dotenv import load_dotenv

from ingest.utils.db import get_connection, upsert_indicator, upsert_values

load_dotenv()

logger = logging.getLogger("ingest.pipelines.pobreza")

INDICATORS = [
    {
        "id": "coneval_sin_salud",
        "name_es": "Carencia por acceso a servicios de salud",
        "name_en": "Population without health access",
        "topic": "health",
        "subtopic": "",
        "unit": "percent",
        "frequency": "biennial",
        "source": "CONEVAL",
        "geo_levels": ["national"],
        # National % of the population
        "values": {
            "2008": 38.4,
            "2010": 29.2,
            "2012": 21.5,
            "2014": 18.2,
            "2016": 15.6,
            "2018": 16.2,
            "2020": 28.2,
            "2022": 39.1,
            "2024": 34.2,
        },
    },
]


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Load multidimensional poverty indicators.")
    parser.add_argument("--dry-run", action="store_true", help="Print values without writing.")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    conn = None if args.dry_run else get_connection()
    try:
        for ind in INDICATORS:
            values = [
                {
                    "geo_code": "00",
                    "period": year,
                    "period_date": f"{year}-01-01",
                    "value": value,
                    "status": "final",
                }
                for year, value in sorted(ind["values"].items())
            ]
            if conn is None:
                logger.info("[DRY RUN] %s: %s", ind["id"], ind["values"])
                continue
            meta = {k: v for k, v in ind.items() if k != "values"}
            upsert_indicator(conn, meta)
            count = upsert_values(conn, ind["id"], values)
            logger.info("Upserted %d values for %s", count, ind["id"])
    finally:
        if conn is not None:
            conn.close()


if __name__ == "__main__":
    main()
