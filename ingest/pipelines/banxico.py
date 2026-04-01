"""Banxico SIE API pipeline.

Syncs exchange rate, inflation, and monetary policy data from Banco de México.

Usage:
    python -m ingest.pipelines.banxico --full
    python -m ingest.pipelines.banxico --series SP30578
    python -m ingest.pipelines.banxico          # recent (last 30 days)
"""

import argparse
import logging
import os
import sys
from datetime import datetime, timedelta
from typing import Any

import requests
from dotenv import load_dotenv

from ingest.utils.db import get_connection, upsert_indicator, upsert_values

load_dotenv()

logger = logging.getLogger("ingest.pipelines.banxico")

BASE_URL = "https://www.banxico.org.mx/SieAPIRest/service/v1/series"

BANXICO_SERIES = [
    {
        "id": "SP30578",
        "name_es": "Inflación general anual",
        "topic": "prices",
        "unit": "percent",
        "frequency": "monthly",
    },
    {
        "id": "SP1",
        "name_es": "INPC Índice General (Banxico)",
        "topic": "prices",
        "unit": "index",
        "frequency": "monthly",
    },
    {
        "id": "SF43718",
        "name_es": "Tipo de cambio USD/MXN (FIX)",
        "topic": "financial",
        "unit": "mxn_per_usd",
        "frequency": "daily",
    },
    {
        "id": "SF61745",
        "name_es": "Tasa objetivo Banxico",
        "topic": "financial",
        "unit": "percent",
        "frequency": "variable",
    },
    {
        "id": "SP74662",
        "name_es": "Inflación subyacente anual",
        "topic": "prices",
        "unit": "percent",
        "frequency": "monthly",
    },
]


def get_token() -> str:
    """Read the Banxico API token from environment."""
    token = os.getenv("BANXICO_API_TOKEN")
    if not token:
        raise RuntimeError("BANXICO_API_TOKEN environment variable is not set")
    return token


def fetch_series(
    series_id: str,
    token: str,
    *,
    full: bool = False,
) -> list[dict[str, str]]:
    """Fetch observation data for a single Banxico series.

    Returns a list of {"fecha": "DD/MM/YYYY", "dato": "value"} dicts.
    """
    if full:
        url = f"{BASE_URL}/{series_id}/datos"
    else:
        end = datetime.now()
        start = end - timedelta(days=30)
        start_str = start.strftime("%Y-%m-%d")
        end_str = end.strftime("%Y-%m-%d")
        url = f"{BASE_URL}/{series_id}/datos/{start_str}/{end_str}"

    headers = {"Bmx-Token": token}
    logger.info("GET %s", url)
    resp = requests.get(url, headers=headers, timeout=60)
    resp.raise_for_status()

    data = resp.json()
    series_list = data.get("bmx", {}).get("series", [])
    if not series_list:
        logger.warning("No series returned for %s", series_id)
        return []

    datos = series_list[0].get("datos", [])
    logger.info("Received %d observations for %s", len(datos), series_id)
    return datos


def parse_banxico_date(fecha: str) -> tuple[str, str]:
    """Parse a Banxico date string (DD/MM/YYYY) into (period, period_date).

    Returns:
        period: YYYY-MM-DD string used as the unique period key.
        period_date: Same as period (ISO date).
    """
    dt = datetime.strptime(fecha, "%d/%m/%Y")
    iso = dt.strftime("%Y-%m-%d")
    return iso, iso


def transform_observations(datos: list[dict[str, str]]) -> list[dict[str, Any]]:
    """Transform raw Banxico observations into value dicts for DB upsert."""
    values: list[dict[str, Any]] = []

    for obs in datos:
        raw = obs.get("dato", "")
        # Banxico uses "N/E" for missing data
        if not raw or raw in ("N/E", ""):
            continue

        # Remove commas (thousands separator in some series)
        raw = raw.replace(",", "")

        try:
            value = float(raw)
        except (ValueError, TypeError):
            logger.warning("Skipping non-numeric value: %r", raw)
            continue

        try:
            period, period_date = parse_banxico_date(obs["fecha"])
        except (ValueError, KeyError) as exc:
            logger.warning("Skipping observation — %s: %s", exc, obs)
            continue

        values.append({
            "geo_code": "00",
            "period": period,
            "period_date": period_date,
            "value": value,
            "status": "",
        })

    return values


def sync_series(
    series_cfg: dict[str, Any],
    token: str,
    conn: Any,
    *,
    full: bool = False,
) -> int:
    """Sync a single Banxico series to the database. Returns count upserted."""
    series_id = series_cfg["id"]
    logger.info(
        "Syncing %s (%s) full=%s",
        series_id,
        series_cfg["name_es"],
        full,
    )

    # Fetch from API
    datos = fetch_series(series_id, token, full=full)
    if not datos:
        return 0

    # Transform
    values = transform_observations(datos)
    logger.info("Transformed %d valid values for %s", len(values), series_id)

    if not values:
        return 0

    # Upsert indicator metadata
    metadata = {
        "id": series_id,
        "name_es": series_cfg["name_es"],
        "name_en": "",
        "topic": series_cfg["topic"],
        "subtopic": "",
        "unit": series_cfg["unit"],
        "frequency": series_cfg["frequency"],
        "source": "banxico",
        "geo_levels": ["national"],
    }
    upsert_indicator(conn, metadata)

    # Upsert values
    count = upsert_values(conn, series_id, values)
    return count


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Sync Banxico SIE series to the database."
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Fetch full history (default: recent 30 days only).",
    )
    parser.add_argument(
        "--series",
        type=str,
        default=None,
        help="Sync only a specific series ID (e.g. SP30578).",
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

    token = get_token()
    logger.info("Banxico API token loaded.")

    # Determine which series to sync
    if args.series:
        series_list = [s for s in BANXICO_SERIES if s["id"] == args.series]
        if not series_list:
            logger.error(
                "Series '%s' not found. Available: %s",
                args.series,
                [s["id"] for s in BANXICO_SERIES],
            )
            sys.exit(1)
    else:
        series_list = BANXICO_SERIES

    conn = get_connection()
    logger.info("Connected to database.")

    total_values = 0
    try:
        for series_cfg in series_list:
            count = sync_series(series_cfg, token, conn, full=args.full)
            total_values += count
    finally:
        conn.close()
        logger.info("Database connection closed.")

    logger.info(
        "Done. Synced %d series, upserted %d values total.",
        len(series_list),
        total_values,
    )


if __name__ == "__main__":
    main()
