"""
sqlite_migrations.py
Schema migration system for Scrapus SQLite OLTP store.

Provides:
  - Version tracking via the schema_migrations table
  - Forward-only migration runner (no rollback by design)
  - Initial schema creation as migration 1
  - Safe ALTER TABLE patterns for SQLite (add column, rename via recreate)
  - CLI entry point for applying pending migrations

SQLite does not support DROP COLUMN or ALTER COLUMN directly.
Where needed, the standard recreate-table pattern is used:
  1. CREATE new_table with desired schema
  2. INSERT INTO new_table SELECT ... FROM old_table
  3. DROP old_table
  4. ALTER TABLE new_table RENAME TO old_table
  5. Re-create indexes and triggers

Author: Scrapus Pipeline
Target: Apple M1 16GB, SQLite 3.45+
"""

from __future__ import annotations

import hashlib
import logging
import sqlite3
import time
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Sequence

from sqlite_schema import (
    ALL_CREATE_TABLES,
    CURRENT_SCHEMA_VERSION,
    DEFAULT_DB_PATH,
    SQL_CREATE_INDEXES,
    SQL_CREATE_TRIGGERS,
    apply_m1_pragmas,
    get_connection,
    get_schema_version,
)

logger = logging.getLogger(__name__)


# =========================================================================
# Migration dataclass
# =========================================================================

@dataclass(frozen=True)
class Migration:
    """A single schema migration step."""

    version: int
    name: str
    description: str
    sql_statements: List[str]
    python_callable: Optional[Callable[[sqlite3.Connection], None]] = None

    @property
    def checksum(self) -> str:
        """Deterministic checksum of all SQL statements."""
        raw = "\n".join(self.sql_statements).encode("utf-8")
        return hashlib.sha256(raw).hexdigest()[:16]


# =========================================================================
# Migration registry — add new migrations here
# =========================================================================

def _build_initial_schema_sql() -> List[str]:
    """Collect all DDL for the initial schema (version 1)."""
    stmts: List[str] = []
    stmts.extend(ALL_CREATE_TABLES)
    stmts.extend(SQL_CREATE_INDEXES)
    stmts.extend(SQL_CREATE_TRIGGERS)
    return stmts


MIGRATIONS: List[Migration] = [
    Migration(
        version=1,
        name="initial_schema",
        description=(
            "Create all core OLTP tables: pages, entities, entity_clusters, "
            "entity_cluster_members, leads, lead_features, reports, domains, "
            "pipeline_runs, graph_edges. Plus indexes and triggers."
        ),
        sql_statements=_build_initial_schema_sql(),
    ),

    # -----------------------------------------------------------------
    # Future migrations go here.  Examples:
    # -----------------------------------------------------------------
    #
    # Migration(
    #     version=2,
    #     name="add_pages_embedding_id",
    #     description="Add embedding_id column to pages for LanceDB cross-ref.",
    #     sql_statements=[
    #         "ALTER TABLE pages ADD COLUMN embedding_id TEXT;",
    #         "CREATE INDEX IF NOT EXISTS idx_pages_embedding ON pages(embedding_id);",
    #     ],
    # ),
    #
    # Migration(
    #     version=3,
    #     name="add_leads_source_url",
    #     description="Track the primary source URL for each lead.",
    #     sql_statements=[
    #         "ALTER TABLE leads ADD COLUMN source_url TEXT;",
    #     ],
    # ),
    #
    # Migration(
    #     version=4,
    #     name="recreate_entities_add_embedding_dim",
    #     description="Add embedding_dim column via table recreate pattern.",
    #     sql_statements=[],  # empty — uses python_callable
    #     python_callable=_migrate_v4_entities_add_embedding_dim,
    # ),
]


# =========================================================================
# Safe ALTER TABLE helpers
# =========================================================================

def safe_add_column(
    conn: sqlite3.Connection,
    table: str,
    column: str,
    col_type: str,
    *,
    default: Optional[str] = None,
) -> bool:
    """
    Add a column if it does not already exist.

    SQLite raises OperationalError if the column already exists;
    this helper catches that gracefully.

    Args:
        conn: Open connection.
        table: Table name.
        column: New column name.
        col_type: SQL type (TEXT, REAL, INTEGER, etc.).
        default: Optional DEFAULT clause value.

    Returns:
        True if column was added, False if it already existed.
    """
    default_clause = f" DEFAULT {default}" if default is not None else ""
    sql = f"ALTER TABLE {table} ADD COLUMN {column} {col_type}{default_clause};"
    try:
        conn.execute(sql)
        logger.info("Added column %s.%s (%s)", table, column, col_type)
        return True
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            logger.debug("Column %s.%s already exists, skipping", table, column)
            return False
        raise


def safe_recreate_table(
    conn: sqlite3.Connection,
    table: str,
    new_create_sql: str,
    column_mapping: str,
    *,
    indexes: Optional[List[str]] = None,
    triggers: Optional[List[str]] = None,
) -> None:
    """
    Recreate a table with a new schema (the SQLite ALTER workaround).

    This is needed when you must DROP a column, change a column type,
    or add constraints that ALTER TABLE cannot handle.

    Steps:
        1. CREATE TABLE _tmp_<table> with the new schema
        2. INSERT INTO _tmp_<table> SELECT <column_mapping> FROM <table>
        3. DROP TABLE <table>
        4. ALTER TABLE _tmp_<table> RENAME TO <table>
        5. Re-create indexes / triggers

    Args:
        conn: Open connection (should be inside a transaction).
        table: Original table name.
        new_create_sql: Full CREATE TABLE statement for the temp table.
                        Must use the name ``_tmp_<table>``.
        column_mapping: The SELECT column list for data migration
                        (e.g., "id, name, CAST(score AS REAL) AS score").
        indexes: Optional list of CREATE INDEX statements to re-apply.
        triggers: Optional list of CREATE TRIGGER statements to re-apply.
    """
    tmp_table = f"_tmp_{table}"

    # Validate: new_create_sql must reference the tmp name
    if tmp_table not in new_create_sql:
        raise ValueError(
            f"new_create_sql must CREATE TABLE {tmp_table}, "
            f"got: {new_create_sql[:80]}..."
        )

    conn.execute(new_create_sql)
    conn.execute(
        f"INSERT INTO {tmp_table} SELECT {column_mapping} FROM {table}"  # noqa: S608
    )
    conn.execute(f"DROP TABLE {table}")  # noqa: S608
    conn.execute(f"ALTER TABLE {tmp_table} RENAME TO {table}")  # noqa: S608

    if indexes:
        for idx_sql in indexes:
            conn.execute(idx_sql)

    if triggers:
        for trg_sql in triggers:
            conn.execute(trg_sql)

    logger.info("Recreated table %s with new schema", table)


def table_has_column(
    conn: sqlite3.Connection,
    table: str,
    column: str,
) -> bool:
    """Check whether a column exists on a table."""
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return any(row[1] == column for row in rows)


def get_table_columns(
    conn: sqlite3.Connection,
    table: str,
) -> List[Dict[str, str]]:
    """
    Return column metadata for a table.

    Each dict has keys: cid, name, type, notnull, dflt_value, pk.
    """
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return [
        {
            "cid": row[0],
            "name": row[1],
            "type": row[2],
            "notnull": row[3],
            "dflt_value": row[4],
            "pk": row[5],
        }
        for row in rows
    ]


# =========================================================================
# Migration runner
# =========================================================================

class MigrationRunner:
    """
    Applies pending migrations in order to bring the schema to the
    current version.

    Usage::

        runner = MigrationRunner("scrapus_data/scrapus.db")
        applied = runner.run_pending()
        print(f"Applied {applied} migrations")
    """

    def __init__(
        self,
        db_path: str = DEFAULT_DB_PATH,
        *,
        migrations: Optional[List[Migration]] = None,
    ):
        self.db_path = db_path
        self.migrations = sorted(
            migrations or MIGRATIONS, key=lambda m: m.version
        )

    def get_current_version(self) -> int:
        """Return the latest applied migration version."""
        conn = get_connection(self.db_path)
        try:
            # Ensure schema_migrations table exists
            conn.execute(
                "CREATE TABLE IF NOT EXISTS schema_migrations ("
                "  version INTEGER PRIMARY KEY,"
                "  name TEXT NOT NULL,"
                "  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),"
                "  checksum TEXT"
                ")"
            )
            conn.commit()
            return get_schema_version(conn)
        finally:
            conn.close()

    def get_pending(self) -> List[Migration]:
        """Return migrations that have not yet been applied."""
        current = self.get_current_version()
        return [m for m in self.migrations if m.version > current]

    def run_pending(self) -> int:
        """
        Apply all pending migrations in version order.

        Returns:
            Number of migrations applied.
        """
        pending = self.get_pending()
        if not pending:
            logger.info("Schema is up to date (version %d)", self.get_current_version())
            return 0

        conn = get_connection(self.db_path)
        applied = 0

        for migration in pending:
            t0 = time.monotonic()
            logger.info(
                "Applying migration v%d: %s ...", migration.version, migration.name
            )

            try:
                conn.execute("BEGIN IMMEDIATE")

                # Run SQL statements
                for stmt in migration.sql_statements:
                    stmt = stmt.strip()
                    if stmt:
                        conn.execute(stmt)

                # Run optional Python callable
                if migration.python_callable is not None:
                    migration.python_callable(conn)

                # Record the migration
                conn.execute(
                    "INSERT OR REPLACE INTO schema_migrations "
                    "(version, name, checksum) VALUES (?, ?, ?)",
                    (migration.version, migration.name, migration.checksum),
                )

                conn.commit()
                elapsed = time.monotonic() - t0
                applied += 1
                logger.info(
                    "  v%d applied in %.3f s (checksum: %s)",
                    migration.version, elapsed, migration.checksum,
                )

            except Exception as e:
                conn.rollback()
                logger.error(
                    "Migration v%d FAILED: %s", migration.version, e
                )
                raise MigrationError(
                    f"Migration v{migration.version} ({migration.name}) failed: {e}"
                ) from e

        conn.close()
        logger.info("Applied %d migration(s). Schema now at version %d.",
                     applied, self.get_current_version())
        return applied

    def verify_checksums(self) -> List[Dict[str, str]]:
        """
        Compare recorded checksums against the current migration definitions.

        Returns a list of mismatches (empty = all good).
        """
        conn = get_connection(self.db_path)
        mismatches: List[Dict[str, str]] = []

        try:
            rows = conn.execute(
                "SELECT version, name, checksum FROM schema_migrations ORDER BY version"
            ).fetchall()
        except sqlite3.OperationalError:
            return mismatches
        finally:
            conn.close()

        recorded = {row[0]: (row[1], row[2]) for row in rows}
        defined = {m.version: m for m in self.migrations}

        for version, (name, checksum) in recorded.items():
            if version in defined:
                expected = defined[version].checksum
                if checksum and checksum != expected:
                    mismatches.append({
                        "version": str(version),
                        "name": name,
                        "recorded_checksum": checksum or "",
                        "expected_checksum": expected,
                    })

        return mismatches

    def get_history(self) -> List[Dict[str, str]]:
        """Return the full migration history."""
        conn = get_connection(self.db_path)
        try:
            rows = conn.execute(
                "SELECT version, name, applied_at, checksum "
                "FROM schema_migrations ORDER BY version"
            ).fetchall()
            return [
                {
                    "version": str(row[0]),
                    "name": row[1],
                    "applied_at": row[2],
                    "checksum": row[3] or "",
                }
                for row in rows
            ]
        except sqlite3.OperationalError:
            return []
        finally:
            conn.close()


# =========================================================================
# Exceptions
# =========================================================================

class MigrationError(Exception):
    """Raised when a migration fails to apply."""


# =========================================================================
# Convenience functions
# =========================================================================

def ensure_latest(db_path: str = DEFAULT_DB_PATH) -> int:
    """
    One-call convenience: bring the database to the latest schema version.

    Safe to call on every application start. Idempotent.

    Returns:
        Number of migrations applied (0 if already up to date).
    """
    runner = MigrationRunner(db_path)
    return runner.run_pending()


def get_migration_status(db_path: str = DEFAULT_DB_PATH) -> Dict[str, object]:
    """
    Return a diagnostic dict summarising migration state.

    Keys:
        current_version: int
        latest_available: int
        pending_count: int
        pending_names: list[str]
        checksum_mismatches: list
        history: list
    """
    runner = MigrationRunner(db_path)
    pending = runner.get_pending()
    return {
        "current_version": runner.get_current_version(),
        "latest_available": CURRENT_SCHEMA_VERSION,
        "pending_count": len(pending),
        "pending_names": [m.name for m in pending],
        "checksum_mismatches": runner.verify_checksums(),
        "history": runner.get_history(),
    }


# =========================================================================
# CLI entry point
# =========================================================================

if __name__ == "__main__":
    import argparse
    import json
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")

    parser = argparse.ArgumentParser(
        description="Scrapus SQLite schema migration tool"
    )
    parser.add_argument(
        "command",
        choices=["status", "migrate", "history", "verify"],
        help="Action to perform",
    )
    parser.add_argument(
        "--db",
        default=DEFAULT_DB_PATH,
        help=f"Path to SQLite database (default: {DEFAULT_DB_PATH})",
    )
    args = parser.parse_args()

    if args.command == "status":
        status = get_migration_status(args.db)
        print(json.dumps(status, indent=2, default=str))

    elif args.command == "migrate":
        n = ensure_latest(args.db)
        if n == 0:
            print("Already up to date.")
        else:
            print(f"Applied {n} migration(s).")

    elif args.command == "history":
        runner = MigrationRunner(args.db)
        history = runner.get_history()
        if not history:
            print("No migrations applied yet.")
        else:
            for entry in history:
                print(
                    f"  v{entry['version']:>3s}  {entry['name']:30s}  "
                    f"{entry['applied_at']}  [{entry['checksum']}]"
                )

    elif args.command == "verify":
        runner = MigrationRunner(args.db)
        mismatches = runner.verify_checksums()
        if not mismatches:
            print("All checksums match.")
        else:
            print(f"WARNING: {len(mismatches)} checksum mismatch(es):")
            for m in mismatches:
                print(
                    f"  v{m['version']}: recorded={m['recorded_checksum']}  "
                    f"expected={m['expected_checksum']}"
                )
            sys.exit(1)
