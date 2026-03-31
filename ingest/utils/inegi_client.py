"""INEGI API client with retry logic and rate limiting."""

import logging
import os
import time
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

BASE_URL = "https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml"
VERSION = "2.0"
LANG = "es"

# Rate limiting
REQUEST_DELAY_S = 0.5

# Retry config
MAX_RETRIES = 3
BACKOFF_BASE_S = 1.0


def _get_token() -> str:
    token = os.getenv("INEGI_API_TOKEN")
    if not token:
        raise RuntimeError("INEGI_API_TOKEN environment variable is not set")
    return token


def _request_with_retry(url: str, params: dict[str, str] | None = None) -> dict[str, Any]:
    """Make a GET request with exponential backoff retry."""
    last_exception: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.debug("Request attempt %d: %s", attempt, url)
            resp = requests.get(url, params=params, timeout=30)
            resp.raise_for_status()
            return resp.json()
        except (requests.RequestException, ValueError) as exc:
            last_exception = exc
            if attempt < MAX_RETRIES:
                wait = BACKOFF_BASE_S * (2 ** (attempt - 1))
                logger.warning(
                    "Request failed (attempt %d/%d), retrying in %.1fs: %s",
                    attempt,
                    MAX_RETRIES,
                    wait,
                    exc,
                )
                time.sleep(wait)
            else:
                logger.error("Request failed after %d attempts: %s", MAX_RETRIES, exc)

    raise RuntimeError(f"Request failed after {MAX_RETRIES} attempts") from last_exception


def _build_indicator_url(
    indicator_ids: str,
    geo: str = "00",
    recent: bool = False,
    source: str = "BIE-BISE",
) -> str:
    token = _get_token()
    recent_str = "true" if recent else "false"
    return (
        f"{BASE_URL}/INDICATOR/{indicator_ids}/{LANG}/{geo}/"
        f"{recent_str}/{source}/{VERSION}/{token}?type=json"
    )


def fetch_indicator(
    indicator_id: str,
    geo: str = "00",
    recent: bool = False,
    source: str = "BIE-BISE",
) -> list[dict[str, Any]]:
    """Fetch observations for a single indicator.

    Args:
        indicator_id: INEGI indicator ID.
        geo: Geographic code. '00' for national, '01' for Aguascalientes, etc.
        recent: If True, fetch only most recent observations.
        source: Data source — 'BIE' or 'BISE'.

    Returns:
        List of observation dicts with keys TIME_PERIOD, OBS_VALUE, OBS_STATUS, OBS_NOTE.
    """
    url = _build_indicator_url(indicator_id, geo, recent, source)
    time.sleep(REQUEST_DELAY_S)
    data = _request_with_retry(url)

    series = data.get("Series", [])
    if not series:
        logger.warning("No series returned for indicator %s (geo=%s)", indicator_id, geo)
        return []

    observations = series[0].get("OBSERVATIONS", [])
    logger.info(
        "Fetched %d observations for indicator %s (geo=%s)",
        len(observations),
        indicator_id,
        geo,
    )
    return observations


def fetch_indicators(
    indicator_ids: list[str],
    geo: str = "00",
    recent: bool = False,
    source: str = "BIE-BISE",
) -> dict[str, list[dict[str, Any]]]:
    """Batch-fetch multiple indicators in a single request.

    Args:
        indicator_ids: List of INEGI indicator IDs.
        geo: Geographic code.
        recent: If True, fetch only most recent observations.
        source: Data source.

    Returns:
        Dict mapping indicator ID to its list of observations.
    """
    ids_str = ",".join(indicator_ids)
    url = _build_indicator_url(ids_str, geo, recent, source)
    time.sleep(REQUEST_DELAY_S)
    data = _request_with_retry(url)

    result: dict[str, list[dict[str, Any]]] = {}
    for series_item in data.get("Series", []):
        ind_id = series_item.get("INDICADOR", "")
        result[ind_id] = series_item.get("OBSERVATIONS", [])

    logger.info(
        "Batch-fetched %d indicators (geo=%s): %s",
        len(result),
        geo,
        list(result.keys()),
    )
    return result


def fetch_catalog(
    catalog_type: str,
    indicator_id: str,
    source: str = "BIE-BISE",
) -> dict[str, Any]:
    """Fetch catalog/metadata for an indicator.

    Args:
        catalog_type: Catalog type string (e.g. 'CL_INDICATOR', 'CL_TOPIC', 'CL_UNIT').
        indicator_id: INEGI indicator ID.
        source: Data source.

    Returns:
        Parsed JSON response.
    """
    token = _get_token()
    url = (
        f"{BASE_URL}/{catalog_type}/{indicator_id}/{LANG}/"
        f"{source}/{VERSION}/{token}?type=json"
    )
    time.sleep(REQUEST_DELAY_S)
    return _request_with_retry(url)
