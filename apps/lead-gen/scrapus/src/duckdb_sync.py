"""
duckdb_analytics/sync.py
Synchronize SQLite data to DuckDB for analytics
"""

class DuckDBSynchronizer:
    """One-way sync from SQLite (source of truth) to DuckDB (analytics)."""
    
    def __init__(self, sqlite_path: str, duckdb_conn: duckdb.DuckDBPyConnection):
        self.sqlite_path = sqlite_path
        self.duckdb_conn = duckdb_conn
    
    def sync_all_tables(self) -> None:
        """Full synchronization of all tables from SQLite to DuckDB."""
        import sqlite3
        from datetime import datetime
        
        sqlite_conn = sqlite3.connect(self.sqlite_path)
        
        try:
            # Sync companies
            self._sync_companies(sqlite_conn)
            # Sync persons
            self._sync_persons(sqlite_conn)
            # Sync products
            self._sync_products(sqlite_conn)
            # Sync edges
            self._sync_edges(sqlite_conn)
            # Sync frontier
            self._sync_frontier(sqlite_conn)
            
            print(f"✓ DuckDB sync completed at {datetime.now().isoformat()}")
        finally:
            sqlite_conn.close()
    
    def _sync_companies(self, sqlite_conn: sqlite3.Connection) -> None:
        """Sync companies table with revenue_tier extraction."""
        import json
        
        cursor = sqlite_conn.execute("""
            SELECT 
                id, name, normalized_name, domain, industry, size, location, 
                founded_year, employee_count, funding_info, description,
                lead_score, lead_confidence, is_qualified, metadata,
                created_at, updated_at
            FROM companies
        """)
        
        records = []
        for row in cursor.fetchall():
            try:
                metadata = json.loads(row[14]) if row[14] else {}
                revenue_tier = metadata.get('revenue_tier')
                funding_amount = metadata.get('funding_amount_usd')
                
                records.append({
                    'company_id': row[0],
                    'name': row[1],
                    'normalized_name': row[2],
                    'domain': row[3],
                    'industry': row[4],
                    'size_tier': self._normalize_size(row[5]),
                    'location': row[6],
                    'founded_year': row[7],
                    'employee_count': row[8],
                    'revenue_tier': revenue_tier,
                    'funding_amount_usd': float(funding_amount) if funding_amount else None,
                    'lead_score': row[11],
                    'lead_confidence': row[12],
                    'is_qualified': bool(row[13]),
                    'created_at': self._unix_to_timestamp(row[15]),
                    'updated_at': self._unix_to_timestamp(row[16]),
                    'last_qualified_at': None
                })
            except Exception as e:
                print(f"Error processing company {row[0]}: {e}")
                continue
        
        # Upsert into DuckDB
        import pyarrow as pa
        table = pa.Table.from_pylist(records)
        self.duckdb_conn.execute(
            "DELETE FROM companies_analytics WHERE company_id IN (SELECT company_id FROM TABLE(?))",
            [table]
        )
        self.duckdb_conn.execute("INSERT INTO companies_analytics SELECT * FROM (?)", [table])
        print(f"✓ Synced {len(records)} companies")
    
    def _sync_persons(self, sqlite_conn: sqlite3.Connection) -> None:
        """Sync persons table."""
        cursor = sqlite_conn.execute("""
            SELECT id, name, role, company_id, created_at, updated_at
            FROM persons
        """)
        
        records = []
        for row in cursor.fetchall():
            records.append({
                'person_id': row[0],
                'name': row[1],
                'role': row[2],
                'company_id': row[3],
                'created_at': self._unix_to_timestamp(row[4]),
                'updated_at': self._unix_to_timestamp(row[5])
            })
        
        import pyarrow as pa
        table = pa.Table.from_pylist(records)
        self.duckdb_conn.execute("DELETE FROM persons_analytics")
        self.duckdb_conn.execute("INSERT INTO persons_analytics SELECT * FROM (?)", [table])
        print(f"✓ Synced {len(records)} persons")
    
    def _sync_products(self, sqlite_conn: sqlite3.Connection) -> None:
        """Sync products table."""
        cursor = sqlite_conn.execute("""
            SELECT id, name, company_id, description, created_at
            FROM products
        """)
        
        records = []
        for row in cursor.fetchall():
            records.append({
                'product_id': row[0],
                'name': row[1],
                'company_id': row[2],
                'description': row[3],
                'created_at': self._unix_to_timestamp(row[4])
            })
        
        import pyarrow as pa
        table = pa.Table.from_pylist(records)
        self.duckdb_conn.execute("DELETE FROM products_analytics")
        self.duckdb_conn.execute("INSERT INTO products_analytics SELECT * FROM (?)", [table])
        print(f"✓ Synced {len(records)} products")
    
    def _sync_edges(self, sqlite_conn: sqlite3.Connection) -> None:
        """Sync edges table."""
        cursor = sqlite_conn.execute("""
            SELECT id, source_type, source_id, relation, target_type, target_id, 
                   confidence, weight, created_at
            FROM edges
        """)
        
        records = []
        for row in cursor.fetchall():
            records.append({
                'edge_id': row[0],
                'source_type': row[1],
                'source_id': row[2],
                'relation': row[3],
                'target_type': row[4],
                'target_id': row[5],
                'confidence': row[6],
                'weight': row[7],
                'created_at': self._unix_to_timestamp(row[8])
            })
        
        import pyarrow as pa
        table = pa.Table.from_pylist(records)
        self.duckdb_conn.execute("DELETE FROM edges_analytics")
        self.duckdb_conn.execute("INSERT INTO edges_analytics SELECT * FROM (?)", [table])
        print(f"✓ Synced {len(records)} edges")
    
    def _sync_frontier(self, sqlite_conn: sqlite3.Connection) -> None:
        """Optional: sync frontier table if analytics on crawl state needed."""
        pass
    
    @staticmethod
    def _normalize_size(size_str: str) -> str:
        """Normalize company size strings."""
        if not size_str:
            return 'unknown'
        size_lower = size_str.lower()
        if any(x in size_lower for x in ['1-10', 'tiny', 'seed']):
            return 'startup'
        elif any(x in size_lower for x in ['11-50', '51-200', 'early']):
            return 'scale-up'
        else:
            return 'enterprise'
    
    @staticmethod
    def _unix_to_timestamp(unix_time):
        """Convert Unix timestamp to DuckDB TIMESTAMP."""
        if unix_time is None:
            return None
        from datetime import datetime
        return datetime.utcfromtimestamp(unix_time)
