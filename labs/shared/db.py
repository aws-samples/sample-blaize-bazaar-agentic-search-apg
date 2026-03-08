#!/usr/bin/env python3
"""
Database utilities for Blaize Bazaar Workshop Labs

Supports two connection modes:
  1. Direct psycopg 3 (workshop environment — fast, full pgvector support)
  2. RDS Data API fallback (testing — no VPC access needed)

Set USE_DATA_API=true in your .env to use the Data API path.
"""

import json
import os
from typing import Any, Optional

from shared.config import get_connection_string

# Detect connection mode
USE_DATA_API = os.getenv("USE_DATA_API", "false").lower() == "true"


# ============================================================
# Direct psycopg connection (default — workshop environment)
# ============================================================

def _get_psycopg_connection():
    """Open a synchronous psycopg 3 connection with dict_row factory."""
    import psycopg
    from psycopg.rows import dict_row
    return psycopg.connect(get_connection_string(), row_factory=dict_row)


def _psycopg_fetch_all(query: str, params: Optional[tuple] = None) -> list[dict]:
    """Execute query via psycopg and return all rows as dicts."""
    import psycopg
    from psycopg.rows import dict_row
    with psycopg.connect(get_connection_string(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]


def _psycopg_fetch_one(query: str, params: Optional[tuple] = None) -> Optional[dict]:
    """Execute query via psycopg and return one row as dict."""
    import psycopg
    from psycopg.rows import dict_row
    with psycopg.connect(get_connection_string(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            row = cur.fetchone()
            return dict(row) if row else None


# ============================================================
# RDS Data API fallback (testing without VPC access)
# ============================================================

def _get_data_api_client():
    """Get a configured RDS Data API client."""
    import boto3
    region = os.getenv("AWS_REGION", "us-west-2")
    return boto3.client("rds-data", region_name=region)


def _data_api_execute(query: str, params: Optional[tuple] = None) -> list[dict]:
    """Execute query via RDS Data API and return rows as dicts.

    Translates psycopg-style %s placeholders to Data API :param style.
    """
    cluster_arn = os.getenv("DB_CLUSTER_ARN", "")
    secret_arn = os.getenv("DB_SECRET_ARN", "")
    database = os.getenv("DB_NAME", "postgres")

    if not cluster_arn or not secret_arn:
        raise RuntimeError(
            "USE_DATA_API=true but DB_CLUSTER_ARN and DB_SECRET_ARN not set"
        )

    client = _get_data_api_client()

    # Convert psycopg %s params to Data API named params
    api_params = []
    converted_sql = query
    if params:
        for i, val in enumerate(params):
            param_name = f"p{i}"
            # Replace first occurrence of %s
            converted_sql = converted_sql.replace("%s", f":{param_name}", 1)

            # Determine type
            if isinstance(val, bool):
                api_params.append({"name": param_name, "value": {"booleanValue": val}})
            elif isinstance(val, int):
                api_params.append({"name": param_name, "value": {"longValue": val}})
            elif isinstance(val, float):
                api_params.append({"name": param_name, "value": {"doubleValue": val}})
            elif val is None:
                api_params.append({"name": param_name, "value": {"isNull": True}})
            else:
                api_params.append({"name": param_name, "value": {"stringValue": str(val)}})

    # Handle ::vector casts — Data API doesn't understand them with named params
    # Convert :paramN::vector to CAST(:paramN AS vector)
    import re
    converted_sql = re.sub(r':(\w+)::vector', r'CAST(:\1 AS vector)', converted_sql)

    kwargs = {
        "resourceArn": cluster_arn,
        "secretArn": secret_arn,
        "database": database,
        "sql": converted_sql,
        "includeResultMetadata": True,
    }
    if api_params:
        kwargs["parameters"] = api_params

    response = client.execute_statement(**kwargs)

    # Convert Data API response to list of dicts
    if "columnMetadata" not in response or "records" not in response:
        return []

    columns = [col["name"] for col in response["columnMetadata"]]
    rows = []
    for record in response["records"]:
        row = {}
        for col_name, field in zip(columns, record):
            if "isNull" in field and field["isNull"]:
                row[col_name] = None
            elif "longValue" in field:
                row[col_name] = field["longValue"]
            elif "doubleValue" in field:
                row[col_name] = field["doubleValue"]
            elif "stringValue" in field:
                # Try to parse numeric strings
                val = field["stringValue"]
                try:
                    if "." in val:
                        row[col_name] = float(val)
                    else:
                        row[col_name] = val
                except (ValueError, TypeError):
                    row[col_name] = val
            elif "booleanValue" in field:
                row[col_name] = field["booleanValue"]
            else:
                row[col_name] = str(field)
        rows.append(row)
    return rows


# ============================================================
# Public API — auto-selects connection mode
# ============================================================

def get_db_connection():
    """Open a database connection.

    Returns a psycopg Connection in direct mode.
    Raises RuntimeError in Data API mode (use fetch_all/fetch_one instead).
    """
    if USE_DATA_API:
        raise RuntimeError(
            "get_db_connection() not available in Data API mode. "
            "Use fetch_all() or fetch_one() instead, or set USE_DATA_API=false."
        )
    return _get_psycopg_connection()


def fetch_all(query: str, params: Optional[tuple] = None) -> list[dict]:
    """Execute a query and return all rows as dictionaries.

    Works with both psycopg (direct) and RDS Data API modes.

    Args:
        query: Parameterized SQL query (use %s placeholders)
        params: Query parameters (tuple)

    Returns:
        List of result rows as dictionaries
    """
    if USE_DATA_API:
        return _data_api_execute(query, params)
    return _psycopg_fetch_all(query, params)


def fetch_one(query: str, params: Optional[tuple] = None) -> Optional[dict]:
    """Execute a query and return a single row as a dictionary.

    Works with both psycopg (direct) and RDS Data API modes.

    Args:
        query: Parameterized SQL query (use %s placeholders)
        params: Query parameters (tuple)

    Returns:
        Single result row as dictionary, or None
    """
    if USE_DATA_API:
        rows = _data_api_execute(query, params)
        return rows[0] if rows else None
    return _psycopg_fetch_one(query, params)
