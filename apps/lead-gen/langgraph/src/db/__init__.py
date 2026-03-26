"""Database access layer for Neon PostgreSQL."""

from .connection import get_connection

__all__ = ["get_connection"]
