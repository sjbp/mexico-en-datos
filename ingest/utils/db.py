"""Database connection helpers and upsert operations."""

import logging
import os
from typing import Any

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


def get_connection() -> psycopg2.extensions.connection:
    """Return a psycopg2 connection using DATABASE_URL from environment."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable is not set")
    return psycopg2.connect(database_url)


def upsert_indicator(conn: psycopg2.extensions.connection, indicator: dict[str, Any]) -> None:
    """Upsert a row into the indicators table.

    Args:
        conn: Database connection.
        indicator: Dict with keys: id, name_es, name_en, topic, subtopic, unit,
                   frequency, source, geo_levels.
    """
    sql = """
        INSERT INTO indicators (
            id, name_es, name_en, topic, subtopic, unit, frequency, source, geo_levels
        ) VALUES (
            %(id)s, %(name_es)s, %(name_en)s, %(topic)s, %(subtopic)s,
            %(unit)s, %(frequency)s, %(source)s, %(geo_levels)s
        )
        ON CONFLICT (id) DO UPDATE SET
            name_es    = EXCLUDED.name_es,
            name_en    = EXCLUDED.name_en,
            topic      = EXCLUDED.topic,
            subtopic   = EXCLUDED.subtopic,
            unit       = EXCLUDED.unit,
            frequency  = EXCLUDED.frequency,
            source     = EXCLUDED.source,
            geo_levels = EXCLUDED.geo_levels,
            last_synced_at = NOW()
    """
    with conn.cursor() as cur:
        cur.execute(sql, {
            "id": indicator["id"],
            "name_es": indicator.get("name_es"),
            "name_en": indicator.get("name_en"),
            "topic": indicator.get("topic"),
            "subtopic": indicator.get("subtopic"),
            "unit": indicator.get("unit"),
            "frequency": indicator.get("frequency"),
            "source": indicator.get("source", "BIE"),
            "geo_levels": indicator.get("geo_levels", ["national"]),
        })
    conn.commit()
    logger.debug("Upserted indicator %s", indicator["id"])


def upsert_values(
    conn: psycopg2.extensions.connection,
    indicator_id: str,
    values: list[dict[str, Any]],
) -> int:
    """Bulk upsert observation values for an indicator.

    Args:
        conn: Database connection.
        indicator_id: The indicator ID these values belong to.
        values: List of dicts with keys: geo_code, period, period_date, value, status.

    Returns:
        Number of rows upserted.
    """
    if not values:
        return 0

    sql = """
        INSERT INTO indicator_values (
            indicator_id, geo_code, period, period_date, value, status
        ) VALUES (
            %(indicator_id)s, %(geo_code)s, %(period)s, %(period_date)s,
            %(value)s, %(status)s
        )
        ON CONFLICT (indicator_id, geo_code, period) DO UPDATE SET
            period_date = EXCLUDED.period_date,
            value       = EXCLUDED.value,
            status      = EXCLUDED.status
    """
    rows = [
        {
            "indicator_id": indicator_id,
            "geo_code": v["geo_code"],
            "period": v["period"],
            "period_date": v["period_date"],
            "value": v["value"],
            "status": v.get("status", ""),
        }
        for v in values
    ]

    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, sql, rows, page_size=500)
    conn.commit()

    logger.info("Upserted %d values for indicator %s", len(rows), indicator_id)
    return len(rows)
