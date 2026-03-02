"""
Database connection utilities for ML training scripts.
Connects directly to PostgreSQL (local or production).

Usage:
    from db_connection import query_to_df, get_connection
    df = query_to_df("SELECT * FROM \"Product\" LIMIT 10")
"""

import os
import psycopg2
import pandas as pd


def get_connection():
    """Get a connection to the PostgreSQL database."""
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "ecoterra"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
    )


def query_to_df(sql: str, params=None) -> pd.DataFrame:
    """Execute a query and return a pandas DataFrame."""
    conn = get_connection()
    try:
        return pd.read_sql(sql, conn, params=params)
    finally:
        conn.close()


def get_org_id() -> int:
    """Get the default organization ID (ECOTERRA)."""
    return int(os.getenv("ORG_ID", "1"))
