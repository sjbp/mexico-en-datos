"""Data integrity validation for Mexico en Datos.

Runs comprehensive checks across all data tables and reports issues.
Exit code 0 = all checks pass. Exit code 1 = failures found.

Usage:
    python -m ingest.validate
    python -m ingest.validate --verbose
    python -m ingest.validate --table indicators
"""

import argparse
import sys
from datetime import date, timedelta

from ingest.utils.db import get_connection

# ---------------------------------------------------------------------------
# Layer 1: Structural checks
# ---------------------------------------------------------------------------

STRUCTURAL_CHECKS = {
    "indicators": {
        "min_rows": 15,
        "required_columns": ["id", "name_es", "topic", "unit", "frequency"],
        "no_nulls": ["id", "name_es", "topic"],
    },
    "indicator_values": {
        "min_rows": 20000,
        "required_columns": [
            "indicator_id",
            "geo_code",
            "period",
            "period_date",
            "value",
        ],
        "no_nulls": ["indicator_id", "geo_code", "period", "period_date"],
    },
    "geographic_areas": {
        "exact_rows": 33,
        "no_nulls": ["code", "name", "level"],
    },
    "employment_stats": {
        "min_rows": 800,
        "no_nulls": ["quarter", "geo_code", "dimension", "dimension_value"],
    },
    "envipe_stats": {
        "min_rows": 100,
        "no_nulls": ["year", "geo_code", "crime_type"],
    },
    "mortality_stats": {
        "min_rows": 1000,
        "no_nulls": ["year", "geo_code", "cause_group", "age_group", "sex", "deaths"],
    },
}

# Primary-key-like columns used for duplicate detection
_PK_COLUMNS = {
    "indicators": ["id"],
    "indicator_values": ["indicator_id", "geo_code", "period"],
    "geographic_areas": ["code"],
    "employment_stats": ["quarter", "geo_code", "dimension", "dimension_value"],
    "envipe_stats": ["year", "geo_code", "crime_type"],
    "mortality_stats": ["year", "geo_code", "cause_group", "age_group", "sex"],
}

# ---------------------------------------------------------------------------
# Layer 2: Value range checks
# ---------------------------------------------------------------------------

RANGE_CHECKS = [
    {
        "name": "Inflation range",
        "query": (
            "SELECT COUNT(*) FROM indicator_values "
            "WHERE indicator_id = 'SP30578' "
            "AND (CAST(value AS FLOAT) < -5 OR CAST(value AS FLOAT) > 200)"
        ),
        "expected": 0,
        "message": "Inflation values outside -5% to 200% range",
    },
    {
        "name": "Exchange rate range",
        "query": (
            "SELECT COUNT(*) FROM indicator_values "
            "WHERE indicator_id = 'SF43718' "
            "AND (CAST(value AS FLOAT) < 1 OR CAST(value AS FLOAT) > 50)"
        ),
        "expected": 0,
        "message": "Exchange rate values outside 1-50 range",
    },
    {
        "name": "Unemployment range",
        "query": (
            "SELECT COUNT(*) FROM indicator_values "
            "WHERE indicator_id = '444612' "
            "AND (CAST(value AS FLOAT) < 0 OR CAST(value AS FLOAT) > 30)"
        ),
        "expected": 0,
        "message": "Unemployment values outside 0-30% range",
    },
    {
        "name": "IGAE range",
        "query": (
            "SELECT COUNT(*) FROM indicator_values "
            "WHERE indicator_id = '736939' "
            "AND (CAST(value AS FLOAT) < 30 OR CAST(value AS FLOAT) > 200)"
        ),
        "expected": 0,
        "message": "IGAE index values outside 30-200 range",
    },
    {
        "name": "Informality rate range",
        "query": (
            "SELECT COUNT(*) FROM employment_stats "
            "WHERE informality_rate IS NOT NULL "
            "AND (informality_rate < 0 OR informality_rate > 100)"
        ),
        "expected": 0,
        "message": "Informality rate values outside 0-100% range",
    },
    {
        "name": "Cifra negra range",
        "query": (
            "SELECT COUNT(*) FROM envipe_stats "
            "WHERE cifra_negra IS NOT NULL "
            "AND (cifra_negra < 0 OR cifra_negra > 100)"
        ),
        "expected": 0,
        "message": "Cifra negra values outside 0-100% range",
    },
    {
        "name": "Mortality rate range",
        "query": (
            "SELECT COUNT(*) FROM mortality_stats "
            "WHERE rate_per_100k IS NOT NULL "
            "AND (rate_per_100k < 0 OR rate_per_100k > 500)"
        ),
        "expected": 0,
        "message": "Mortality rate values outside 0-500 per 100k range",
    },
    {
        "name": "Homicide rate range",
        "query": (
            "SELECT COUNT(*) FROM indicator_values "
            "WHERE indicator_id = 'sesnsp_homicide_rate' "
            "AND (CAST(value AS FLOAT) < 0 OR CAST(value AS FLOAT) > 200)"
        ),
        "expected": 0,
        "message": "Homicide rate values outside 0-200 per 100k range",
    },
]

# ---------------------------------------------------------------------------
# Layer 3: Freshness checks
# ---------------------------------------------------------------------------

FRESHNESS_CHECKS = [
    {
        "name": "Banxico freshness",
        "query": "SELECT MAX(period_date) FROM indicator_values WHERE indicator_id = 'SF43718'",
        "max_age_days": 7,
        "message": "Banxico exchange rate data is stale",
    },
    {
        "name": "INEGI freshness",
        "query": "SELECT MAX(period_date) FROM indicator_values WHERE indicator_id = '736939'",
        "max_age_days": 120,
        "message": "INEGI IGAE data is stale",
    },
    {
        "name": "ENOE freshness",
        "query": "SELECT MAX(quarter_date) FROM employment_stats",
        "max_age_days": 365,
        "message": "ENOE employment data is stale (no recent quarter)",
    },
]

# ---------------------------------------------------------------------------
# Layer 4: Known-value spot checks
# ---------------------------------------------------------------------------

SPOT_CHECKS = [
    {
        "name": "Geographic areas count",
        "query": "SELECT COUNT(*) FROM geographic_areas",
        "expected_value": 33,
        "message": "Geographic areas count is not 33",
    },
    {
        "name": "National geo exists",
        "query": "SELECT COUNT(*) FROM geographic_areas WHERE code = '00' AND level = 'national'",
        "expected_value": 1,
        "message": "National geographic area (00) missing",
    },
    {
        "name": "All states present",
        "query": "SELECT COUNT(*) FROM geographic_areas WHERE level = 'state'",
        "expected_value": 32,
        "message": "Not all 32 states present in geographic_areas",
    },
    {
        "name": "No empty indicators",
        "query": (
            "SELECT COUNT(*) FROM indicators i "
            "WHERE NOT EXISTS (SELECT 1 FROM indicator_values iv WHERE iv.indicator_id = i.id)"
        ),
        "expected_value": 0,
        "message": "Some indicators have zero values in indicator_values",
    },
    {
        "name": "ENOE multiple quarters",
        "query": "SELECT COUNT(DISTINCT quarter) FROM employment_stats",
        "min_value": 3,
        "message": "ENOE has fewer than 3 quarters of data",
    },
    {
        "name": "ENVIPE multiple years",
        "query": "SELECT COUNT(DISTINCT year) FROM envipe_stats",
        "min_value": 2,
        "message": "ENVIPE has fewer than 2 years of data",
    },
    {
        "name": "Mortality cause groups",
        "query": (
            "SELECT COUNT(DISTINCT cause_group) FROM mortality_stats "
            "WHERE geo_code = '00' AND age_group = 'all' AND sex = 'all'"
        ),
        "min_value": 8,
        "message": "Mortality has fewer than 8 cause groups nationally",
    },
]

# ---------------------------------------------------------------------------
# Layer 5: Cross-source consistency
# ---------------------------------------------------------------------------

CONSISTENCY_CHECKS = [
    {
        "name": "Foreign key: indicator_values -> indicators",
        "query": (
            "SELECT COUNT(*) FROM indicator_values iv "
            "WHERE NOT EXISTS (SELECT 1 FROM indicators i WHERE i.id = iv.indicator_id)"
        ),
        "expected_value": 0,
        "message": "indicator_values references non-existent indicator IDs",
    },
    {
        "name": "Geo codes valid (INEGI/Banxico)",
        "query": (
            "SELECT COUNT(*) FROM indicator_values iv "
            "WHERE iv.indicator_id NOT LIKE 'sesnsp%%' "
            "AND iv.geo_code != '00' "
            "AND NOT EXISTS ("
            "  SELECT 1 FROM geographic_areas ga WHERE ga.code = iv.geo_code"
            ")"
        ),
        "expected_value": 0,
        "message": "indicator_values has geo_codes not in geographic_areas",
    },
]


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------


class ValidationRunner:
    """Executes validation checks and tracks results."""

    def __init__(self, conn, verbose: bool = False, table_filter: str | None = None):
        self.conn = conn
        self.verbose = verbose
        self.table_filter = table_filter
        self.passed = 0
        self.failed = 0
        self.errors: list[str] = []

    def _log_pass(self, name: str, detail: str = ""):
        self.passed += 1
        msg = f"  PASS  {name}"
        if detail and self.verbose:
            msg += f"  ({detail})"
        print(msg)

    def _log_fail(self, name: str, detail: str = ""):
        self.failed += 1
        msg = f"  FAIL  {name}"
        if detail:
            msg += f"  -- {detail}"
        print(msg)
        self.errors.append(f"{name}: {detail}")

    # -- Layer 1 ----------------------------------------------------------

    def run_structural(self):
        print("\n=== Layer 1: Structural Checks ===")
        cur = self.conn.cursor()

        for table, spec in STRUCTURAL_CHECKS.items():
            if self.table_filter and table != self.table_filter:
                continue

            # Row count
            cur.execute(f"SELECT COUNT(*) FROM {table}")  # noqa: S608
            count = cur.fetchone()[0]

            if "exact_rows" in spec:
                if count == spec["exact_rows"]:
                    self._log_pass(f"{table} row count", f"{count} rows (exact)")
                else:
                    self._log_fail(
                        f"{table} row count",
                        f"expected {spec['exact_rows']}, got {count}",
                    )
            elif "min_rows" in spec:
                if count >= spec["min_rows"]:
                    self._log_pass(f"{table} row count", f"{count} rows (min {spec['min_rows']})")
                else:
                    self._log_fail(
                        f"{table} row count",
                        f"expected >= {spec['min_rows']}, got {count}",
                    )

            # Null checks
            for col in spec.get("no_nulls", []):
                cur.execute(f"SELECT COUNT(*) FROM {table} WHERE {col} IS NULL")  # noqa: S608
                null_count = cur.fetchone()[0]
                if null_count == 0:
                    self._log_pass(f"{table}.{col} no nulls")
                else:
                    self._log_fail(
                        f"{table}.{col} no nulls",
                        f"{null_count} null values found",
                    )

            # Duplicate primary keys
            pk_cols = _PK_COLUMNS.get(table)
            if pk_cols:
                cols_str = ", ".join(pk_cols)
                cur.execute(
                    f"SELECT {cols_str}, COUNT(*) FROM {table} "  # noqa: S608
                    f"GROUP BY {cols_str} HAVING COUNT(*) > 1 LIMIT 5"
                )
                dupes = cur.fetchall()
                if not dupes:
                    self._log_pass(f"{table} no duplicate keys")
                else:
                    sample = "; ".join(str(d) for d in dupes[:3])
                    self._log_fail(
                        f"{table} no duplicate keys",
                        f"{len(dupes)}+ duplicate groups found, e.g. {sample}",
                    )

    # -- Layer 2 ----------------------------------------------------------

    def run_range_checks(self):
        print("\n=== Layer 2: Value Range Checks ===")
        cur = self.conn.cursor()

        for check in RANGE_CHECKS:
            if self.table_filter:
                # Skip checks that don't reference the filtered table
                if self.table_filter not in check["query"]:
                    continue
            try:
                cur.execute(check["query"])
                result = cur.fetchone()[0]
                if result == check["expected"]:
                    self._log_pass(check["name"])
                else:
                    self._log_fail(
                        check["name"],
                        f"{check['message']} ({result} violations)",
                    )
            except Exception as e:
                self._log_fail(check["name"], f"Query error: {e}")
                self.conn.rollback()

    # -- Layer 3 ----------------------------------------------------------

    def run_freshness_checks(self):
        print("\n=== Layer 3: Freshness Checks ===")
        cur = self.conn.cursor()
        today = date.today()

        for check in FRESHNESS_CHECKS:
            if self.table_filter:
                if self.table_filter not in check["query"]:
                    continue
            try:
                cur.execute(check["query"])
                result = cur.fetchone()[0]
                if result is None:
                    self._log_fail(check["name"], "No data found (NULL max date)")
                    continue

                # result might be a date or datetime
                if hasattr(result, "date"):
                    result = result.date()

                age_days = (today - result).days
                threshold = check["max_age_days"]

                if age_days <= threshold:
                    self._log_pass(
                        check["name"],
                        f"latest={result}, age={age_days}d (max {threshold}d)",
                    )
                else:
                    self._log_fail(
                        check["name"],
                        f"{check['message']} (latest={result}, age={age_days}d, max={threshold}d)",
                    )
            except Exception as e:
                self._log_fail(check["name"], f"Query error: {e}")
                self.conn.rollback()

    # -- Layer 4 ----------------------------------------------------------

    def run_spot_checks(self):
        print("\n=== Layer 4: Known-Value Spot Checks ===")
        cur = self.conn.cursor()

        for check in SPOT_CHECKS:
            if self.table_filter:
                if self.table_filter not in check["query"]:
                    continue
            try:
                cur.execute(check["query"])
                result = cur.fetchone()[0]

                if "expected_value" in check:
                    if result == check["expected_value"]:
                        self._log_pass(check["name"], f"value={result}")
                    else:
                        self._log_fail(
                            check["name"],
                            f"{check['message']} (expected {check['expected_value']}, got {result})",
                        )
                elif "min_value" in check:
                    if result >= check["min_value"]:
                        self._log_pass(check["name"], f"value={result} (min {check['min_value']})")
                    else:
                        self._log_fail(
                            check["name"],
                            f"{check['message']} (got {result})",
                        )
            except Exception as e:
                self._log_fail(check["name"], f"Query error: {e}")
                self.conn.rollback()

    # -- Layer 5 ----------------------------------------------------------

    def run_consistency_checks(self):
        print("\n=== Layer 5: Cross-Source Consistency ===")
        cur = self.conn.cursor()

        for check in CONSISTENCY_CHECKS:
            if self.table_filter:
                if self.table_filter not in check["query"]:
                    continue
            try:
                cur.execute(check["query"])
                result = cur.fetchone()[0]
                if result == check["expected_value"]:
                    self._log_pass(check["name"])
                else:
                    self._log_fail(
                        check["name"],
                        f"{check['message']} ({result} violations)",
                    )
            except Exception as e:
                self._log_fail(check["name"], f"Query error: {e}")
                self.conn.rollback()

    # -- Summary -----------------------------------------------------------

    def run_all(self):
        self.run_structural()
        self.run_range_checks()
        self.run_freshness_checks()
        self.run_spot_checks()
        self.run_consistency_checks()

        total = self.passed + self.failed
        print(f"\n{'=' * 50}")
        print(f"Results: {self.passed}/{total} checks passed")

        if self.errors:
            print(f"\nFailures ({len(self.errors)}):")
            for err in self.errors:
                print(f"  - {err}")

        return self.failed == 0


def main():
    parser = argparse.ArgumentParser(description="Validate Mexico en Datos data integrity")
    parser.add_argument("--verbose", action="store_true", help="Show extra details for passing checks")
    parser.add_argument("--table", type=str, default=None, help="Only check a specific table")
    args = parser.parse_args()

    conn = get_connection()
    try:
        runner = ValidationRunner(conn, verbose=args.verbose, table_filter=args.table)
        success = runner.run_all()
    finally:
        conn.close()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
