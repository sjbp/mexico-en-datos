"""Period parsing and value normalization for INEGI data."""

import logging
import re
from datetime import date
from typing import Any

logger = logging.getLogger(__name__)

# Frequency constants (matching INEGI FREQ codes and our config)
FREQ_BIWEEKLY = "biweekly"
FREQ_MONTHLY = "monthly"
FREQ_QUARTERLY = "quarterly"
FREQ_ANNUAL = "annual"

# Quarter month mapping
QUARTER_START_MONTH: dict[str, int] = {
    "01": 1, "02": 1, "03": 1,   # Q1
    "04": 4, "05": 4, "06": 4,   # Q2
    "07": 7, "08": 7, "09": 7,   # Q3
    "10": 10, "11": 10, "12": 10, # Q4
}

MONTH_TO_QUARTER: dict[int, int] = {
    1: 1, 2: 1, 3: 1,
    4: 2, 5: 2, 6: 2,
    7: 3, 8: 3, 9: 3,
    10: 4, 11: 4, 12: 4,
}

# Regex patterns for INEGI TIME_PERIOD formats
RE_BIWEEKLY_TEXT = re.compile(r"^(\d{4})/(\d{2})/(1ra|2da) quincena$")
RE_BIWEEKLY_NUM = re.compile(r"^(\d{4})/(\d{2})/(01|02)$")
RE_MONTHLY = re.compile(r"^(\d{4})/(\d{2})$")
RE_QUARTERLY_RANGE = re.compile(r"^(\d{4})/(\d{2})-(\d{2})$")
RE_ANNUAL = re.compile(r"^(\d{4})$")


def parse_period(time_period_str: str, frequency: str) -> tuple[str, date]:
    """Parse an INEGI TIME_PERIOD string into a normalized period label and date.

    Args:
        time_period_str: Raw TIME_PERIOD from INEGI API (e.g. "2024/01/2da quincena").
        frequency: One of 'biweekly', 'monthly', 'quarterly', 'annual'.

    Returns:
        Tuple of (period_text, period_date) where period_date is the first day
        of the period.

    Raises:
        ValueError: If the period string cannot be parsed.
    """
    raw = time_period_str.strip()

    # Try biweekly: "2024/01/1ra quincena" or "2024/01/2da quincena"
    m = RE_BIWEEKLY_TEXT.match(raw)
    if m:
        year, month = int(m.group(1)), int(m.group(2))
        half = m.group(3)
        if half == "1ra":
            return f"{year}/{month:02d}/Q1", date(year, month, 1)
        else:
            return f"{year}/{month:02d}/Q2", date(year, month, 16)

    # Try biweekly numeric: "2024/01/01" (1ra quincena) or "2024/01/02" (2da quincena)
    m = RE_BIWEEKLY_NUM.match(raw)
    if m:
        year, month = int(m.group(1)), int(m.group(2))
        half = m.group(3)
        if half == "01":
            return f"{year}/{month:02d}/Q1", date(year, month, 1)
        else:
            return f"{year}/{month:02d}/Q2", date(year, month, 16)

    # Try quarterly range: "2024/01-03"
    m = RE_QUARTERLY_RANGE.match(raw)
    if m:
        year = int(m.group(1))
        start_month = int(m.group(2))
        quarter = MONTH_TO_QUARTER.get(start_month, 1)
        return f"{year}/Q{quarter}", date(year, start_month, 1)

    # Try monthly: "2024/01"
    m = RE_MONTHLY.match(raw)
    if m:
        year, month = int(m.group(1)), int(m.group(2))
        if frequency == FREQ_QUARTERLY:
            # Monthly format but quarterly frequency — infer quarter
            quarter = MONTH_TO_QUARTER.get(month, 1)
            q_start = QUARTER_START_MONTH.get(f"{month:02d}", 1)
            return f"{year}/Q{quarter}", date(year, q_start, 1)
        return f"{year}/{month:02d}", date(year, month, 1)

    # Try annual: "2024"
    m = RE_ANNUAL.match(raw)
    if m:
        year = int(m.group(1))
        return str(year), date(year, 1, 1)

    raise ValueError(f"Cannot parse INEGI period '{raw}' with frequency '{frequency}'")


def normalize_value(obs_value: Any) -> float | None:
    """Parse an OBS_VALUE string to float, returning None for missing/invalid values.

    Args:
        obs_value: Raw value from INEGI API (usually a string).

    Returns:
        Float value or None if the value is missing or unparseable.
    """
    if obs_value is None:
        return None

    val_str = str(obs_value).strip()
    if not val_str or val_str.lower() in ("", "n/e", "n/d", "na", "null"):
        return None

    try:
        return float(val_str)
    except (ValueError, TypeError):
        logger.warning("Could not parse value: %r", obs_value)
        return None
