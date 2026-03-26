"""
duckdb_analytics/schema.py
Complete DuckDB schema setup for Scrapus analytics
"""

import duckdb
from datetime import datetime, timedelta
from typing import Optional

class DuckDBSchema:
    """Initialize and manage DuckDB analytics schema."""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = None
    
    def connect(self) -> duckdb.DuckDBPyConnection:
        """Initialize DuckDB connection with M1 optimizations."""
        self.conn = duckdb.connect(self.db_path)
        
        # M1-specific configuration
        self.conn.execute("SET threads = 4;")  # M1 has 4 performance cores
        self.conn.execute("SET max_memory = '4GB';")  # Leave 2GB for system
        self.conn.execute("SET temp_directory = '/tmp/duckdb_temp';")
        self.conn.execute("SET enable_object_cache = true;")
        self.conn.execute("SET default_null_order = 'nulls_last';")
        
        return self.conn
    
    def init_schema(self) -> None:
        """Create analytics schema - idempotent."""
        if not self.conn:
            self.connect()
        
        # Companies analytics table (denormalized from SQLite)
        self.conn.execute("""
        CREATE TABLE IF NOT EXISTS companies_analytics (
            company_id         INTEGER PRIMARY KEY,
            name               VARCHAR,
            normalized_name    VARCHAR,
            domain             VARCHAR,
            industry           VARCHAR,
            size_tier          VARCHAR,  -- 'startup' | 'scale-up' | 'enterprise'
            location           VARCHAR,
            founded_year       INTEGER,
            employee_count     INTEGER,
            revenue_tier       VARCHAR,  -- 'seed' | 'series_a' | 'unicorn'
            funding_amount_usd DOUBLE,
            lead_score         DOUBLE,
            lead_confidence    DOUBLE,
            is_qualified       BOOLEAN,
            created_at         TIMESTAMP,
            updated_at         TIMESTAMP,
            last_qualified_at  TIMESTAMP
        );
        """)
        
        # Persons analytics (for co-founder analysis)
        self.conn.execute("""
        CREATE TABLE IF NOT EXISTS persons_analytics (
            person_id    INTEGER PRIMARY KEY,
            name         VARCHAR,
            role         VARCHAR,
            company_id   INTEGER,
            created_at   TIMESTAMP,
            updated_at   TIMESTAMP
        );
        """)
        
        # Products analytics
        self.conn.execute("""
        CREATE TABLE IF NOT EXISTS products_analytics (
            product_id    INTEGER PRIMARY KEY,
            name          VARCHAR,
            company_id    INTEGER,
            description   VARCHAR,
            created_at    TIMESTAMP
        );
        """)
        
        # Edges - graph relationships (optimized for analytical queries)
        self.conn.execute("""
        CREATE TABLE IF NOT EXISTS edges_analytics (
            edge_id      INTEGER PRIMARY KEY,
            source_type  VARCHAR,  -- 'company' | 'person' | 'product'
            source_id    INTEGER,
            relation     VARCHAR,  -- 'acquired' | 'invested_in' | 'works_at' etc
            target_type  VARCHAR,
            target_id    INTEGER,
            confidence   DOUBLE,
            weight       DOUBLE,
            created_at   TIMESTAMP
        );
        """)
        
        # Lead qualification history (for cohort analysis)
        self.conn.execute("""
        CREATE TABLE IF NOT EXISTS lead_qualification_history (
            company_id         INTEGER,
            qualified_date     DATE,
            lead_score         DOUBLE,
            lead_confidence    DOUBLE,
            reason_qualified   VARCHAR,  -- 'high_score' | 'manual_override' etc
            created_at         TIMESTAMP
        );
        """)
        
        # Conversion tracking for funnel analysis
        self.conn.execute("""
        CREATE TABLE IF NOT EXISTS lead_conversion_events (
            company_id       INTEGER,
            event_type       VARCHAR,  -- 'qualified' | 'contacted' | 'demo' | 'converted'
            event_date       DATE,
            event_timestamp  TIMESTAMP,
            conversion_week  DATE,  -- Start of ISO week
            conversion_month DATE,  -- First day of month
            metadata         JSON
        );
        """)
        
        # Daily aggregations (materialized view source)
        self.conn.execute("""
        CREATE TABLE IF NOT EXISTS daily_lead_metrics (
            metric_date    DATE PRIMARY KEY,
            qualified_new  INTEGER,
            qualified_total INTEGER,
            avg_score      DOUBLE,
            p50_score      DOUBLE,
            p90_score      DOUBLE,
            high_confidence_pct DOUBLE,
            contacted      INTEGER,
            conversions    INTEGER
        );
        """)
        
        # Company clustering results (from entity resolution)
        self.conn.execute("""
        CREATE TABLE IF NOT EXISTS entity_clusters (
            cluster_id      INTEGER,
            company_ids     INTEGER[],  -- Array of merged company IDs
            canonical_name  VARCHAR,
            canonical_id    INTEGER,
            cluster_size    INTEGER,
            created_at      TIMESTAMP,
            PRIMARY KEY (cluster_id)
        );
        """)
        
        print("✓ DuckDB analytics schema initialized")

    def create_materialized_views(self) -> None:
        """Create materialized views for high-traffic queries."""
        if not self.conn:
            self.connect()
        
        # View 1: Company network density
        self.conn.execute("""
        CREATE OR REPLACE VIEW company_network_density AS
        SELECT
            source_id AS company_id,
            COUNT(DISTINCT target_id) AS connected_companies,
            COUNT(DISTINCT relation) AS relation_types,
            AVG(confidence) AS avg_relation_confidence,
            SUM(weight) AS total_edge_weight
        FROM edges_analytics
        WHERE source_type = 'company' AND target_type = 'company'
        GROUP BY source_id;
        """)
        
        # View 2: Lead scoring distribution
        self.conn.execute("""
        CREATE OR REPLACE VIEW lead_score_distribution AS
        SELECT
            industry,
            size_tier,
            ROUND(lead_score, 1) AS score_bucket,
            COUNT(*) AS count,
            COUNT(CASE WHEN is_qualified THEN 1 END) AS qualified_count,
            ROUND(100.0 * COUNT(CASE WHEN is_qualified THEN 1 END) / COUNT(*), 2) AS qualification_rate,
            ROUND(AVG(lead_confidence), 3) AS avg_confidence
        FROM companies_analytics
        WHERE lead_score > 0
        GROUP BY industry, size_tier, ROUND(lead_score, 1)
        ORDER BY industry, size_tier, score_bucket DESC;
        """)
        
        # View 3: Funnel conversion metrics
        self.conn.execute("""
        CREATE OR REPLACE VIEW lead_funnel_metrics AS
        SELECT
            conversion_week,
            COUNT(DISTINCT CASE WHEN event_type = 'qualified' THEN company_id END) AS qualified,
            COUNT(DISTINCT CASE WHEN event_type = 'contacted' THEN company_id END) AS contacted,
            COUNT(DISTINCT CASE WHEN event_type = 'demo' THEN company_id END) AS demo,
            COUNT(DISTINCT CASE WHEN event_type = 'converted' THEN company_id END) AS converted,
            ROUND(100.0 * COUNT(DISTINCT CASE WHEN event_type = 'contacted' THEN company_id END) / 
                  COUNT(DISTINCT CASE WHEN event_type = 'qualified' THEN company_id END), 2) AS contact_rate,
            ROUND(100.0 * COUNT(DISTINCT CASE WHEN event_type = 'converted' THEN company_id END) / 
                  COUNT(DISTINCT CASE WHEN event_type = 'qualified' THEN company_id END), 2) AS conversion_rate
        FROM lead_conversion_events
        GROUP BY conversion_week
        ORDER BY conversion_week DESC;
        """)
        
        # View 4: Industry heat map
        self.conn.execute("""
        CREATE OR REPLACE VIEW industry_heat_map AS
        SELECT
            industry,
            size_tier,
            COUNT(*) AS total_companies,
            COUNT(CASE WHEN is_qualified THEN 1 END) AS qualified_companies,
            ROUND(100.0 * COUNT(CASE WHEN is_qualified THEN 1 END) / COUNT(*), 2) AS qualification_pct,
            ROUND(AVG(lead_score), 3) AS avg_lead_score,
            ROUND(AVG(lead_confidence), 3) AS avg_confidence,
            MIN(lead_score) AS min_score,
            MAX(lead_score) AS max_score,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lead_score) AS median_score
        FROM companies_analytics
        GROUP BY industry, size_tier
        ORDER BY qualification_pct DESC;
        """)
        
        # View 5: Top connected companies (collaboration network)
        self.conn.execute("""
        CREATE OR REPLACE VIEW top_connected_companies AS
        SELECT
            c.company_id,
            c.name,
            c.industry,
            c.lead_score,
            nd.connected_companies,
            nd.relation_types,
            nd.avg_relation_confidence,
            ROW_NUMBER() OVER (ORDER BY nd.connected_companies DESC) AS network_rank
        FROM companies_analytics c
        LEFT JOIN company_network_density nd ON c.company_id = nd.company_id
        WHERE nd.connected_companies > 0
        ORDER BY nd.connected_companies DESC
        LIMIT 100;
        """)
        
        print("✓ Materialized views created")
