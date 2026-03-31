"""Main sync pipeline for INEGI macro indicators.

Usage:
    python -m ingest.pipelines.indicators --full --topic prices
    python -m ingest.pipelines.indicators --dry-run
    python -m ingest.pipelines.indicators  # incremental (recent only)
"""

import argparse
import logging
import sys
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv

from ingest.utils.db import get_connection, upsert_indicator, upsert_values
from ingest.utils.inegi_client import fetch_indicator
from ingest.utils.transforms import normalize_value, parse_period

load_dotenv()

logger = logging.getLogger("ingest.pipelines.indicators")

CONFIG_PATH = Path(__file__).resolve().parent.parent / "config" / "indicators.yaml"


def load_config(path: Path | None = None) -> dict[str, Any]:
    """Load the indicators YAML config."""
    config_file = path or CONFIG_PATH
    with open(config_file) as f:
        return yaml.safe_load(f)


def build_indicator_metadata(
    topic_key: str,
    indicator_cfg: dict[str, Any],
) -> dict[str, Any]:
    """Build a metadata dict suitable for upsert_indicator."""
    return {
        "id": indicator_cfg["id"],
        "name_es": indicator_cfg.get("name_es", ""),
        "name_en": indicator_cfg.get("name_en", ""),
        "topic": topic_key,
        "subtopic": indicator_cfg.get("subtopic", ""),
        "unit": indicator_cfg.get("unit", ""),
        "frequency": indicator_cfg.get("frequency", "monthly"),
        "source": indicator_cfg.get("source", "BIE"),
        "geo_levels": indicator_cfg.get("geo_levels", ["national"]),
    }


def transform_observations(
    observations: list[dict[str, Any]],
    frequency: str,
    geo_code: str,
) -> list[dict[str, Any]]:
    """Transform raw INEGI observations into value dicts for DB upsert."""
    values: list[dict[str, Any]] = []

    for obs in observations:
        raw_value = normalize_value(obs.get("OBS_VALUE"))
        if raw_value is None:
            continue

        try:
            period, period_date = parse_period(obs["TIME_PERIOD"], frequency)
        except (ValueError, KeyError) as exc:
            logger.warning("Skipping observation — %s: %s", exc, obs)
            continue

        values.append({
            "geo_code": geo_code,
            "period": period,
            "period_date": period_date,
            "value": raw_value,
            "status": obs.get("OBS_STATUS", ""),
        })

    return values


def sync_indicator(
    indicator_cfg: dict[str, Any],
    topic_key: str,
    *,
    full: bool = False,
    dry_run: bool = False,
    conn: Any = None,
) -> int:
    """Sync a single indicator from INEGI to the database.

    Returns:
        Number of values upserted.
    """
    ind_id = indicator_cfg["id"]
    frequency = indicator_cfg.get("frequency", "monthly")
    source = indicator_cfg.get("source", "BIE")
    geo_levels = indicator_cfg.get("geo_levels", ["national"])

    geo_codes = []
    for level in geo_levels:
        if level == "national":
            geo_codes.append("00")
        # State-level sync can be added later — skip for now to keep Scope 1 focused

    total_upserted = 0

    for geo_code in geo_codes:
        if dry_run:
            logger.info(
                "[DRY RUN] Would fetch indicator %s (%s) geo=%s recent=%s source=%s",
                ind_id,
                indicator_cfg.get("name_es", ""),
                geo_code,
                not full,
                source,
            )
            continue

        logger.info(
            "Fetching indicator %s (%s) geo=%s full=%s",
            ind_id,
            indicator_cfg.get("name_es", ""),
            geo_code,
            full,
        )

        try:
            observations = fetch_indicator(
                indicator_id=ind_id,
                geo=geo_code,
                recent=not full,
                source=source,
            )
        except Exception:
            logger.exception("Failed to fetch indicator %s", ind_id)
            return total_upserted

        values = transform_observations(observations, frequency, geo_code)
        logger.info("Transformed %d valid values for indicator %s", len(values), ind_id)

        if conn is not None and values:
            # Upsert indicator metadata
            metadata = build_indicator_metadata(topic_key, indicator_cfg)
            upsert_indicator(conn, metadata)

            count = upsert_values(conn, ind_id, values)
            total_upserted += count

    return total_upserted


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Sync INEGI macro indicators to the database."
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Fetch full history (default: recent/incremental only).",
    )
    parser.add_argument(
        "--topic",
        type=str,
        default=None,
        help="Sync only a specific topic (e.g. 'prices', 'employment').",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be fetched without making requests or DB writes.",
    )
    parser.add_argument(
        "--config",
        type=str,
        default=None,
        help="Path to indicators YAML config (default: ingest/config/indicators.yaml).",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable debug logging.",
    )
    args = parser.parse_args(argv)

    # Configure logging
    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Load config
    config_path = Path(args.config) if args.config else None
    config = load_config(config_path)
    topics = config.get("topics", {})

    if args.topic:
        if args.topic not in topics:
            logger.error("Topic '%s' not found. Available: %s", args.topic, list(topics.keys()))
            sys.exit(1)
        topics = {args.topic: topics[args.topic]}

    # Connect to DB (unless dry run)
    conn = None
    if not args.dry_run:
        try:
            conn = get_connection()
            logger.info("Connected to database.")
        except Exception:
            logger.exception("Failed to connect to database.")
            sys.exit(1)

    # Sync
    total_indicators = 0
    total_values = 0

    try:
        for topic_key, topic_cfg in topics.items():
            logger.info("--- Topic: %s (%s) ---", topic_key, topic_cfg.get("name_es", ""))
            indicators = topic_cfg.get("indicators", [])

            for indicator_cfg in indicators:
                total_indicators += 1
                count = sync_indicator(
                    indicator_cfg,
                    topic_key,
                    full=args.full,
                    dry_run=args.dry_run,
                    conn=conn,
                )
                total_values += count
    finally:
        if conn is not None:
            conn.close()
            logger.info("Database connection closed.")

    logger.info(
        "Done. Processed %d indicators, upserted %d values.",
        total_indicators,
        total_values,
    )


if __name__ == "__main__":
    main()
