"""Neon PostgreSQL connection management."""

import os

import psycopg
from psycopg.rows import dict_row


def get_connection() -> psycopg.Connection:
    """Get a psycopg connection to the Neon PostgreSQL database."""
    url = os.environ["DATABASE_URL"]
    return psycopg.connect(url, row_factory=dict_row)
