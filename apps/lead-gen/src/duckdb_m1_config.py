"""
duckdb_analytics/m1_config.py
M1-specific DuckDB optimization configuration
"""

M1_CONFIG = {
    # M1 Hardware Properties
    'hardware': {
        'cores_performance': 4,      # P-cores (high performance)
        'cores_efficiency': 4,       # E-cores (efficiency)
        'total_memory_gb': 16,
        'memory_for_duckdb_gb': 4,   # Leave 2GB for OS, 10GB for LLM
        'unified_memory': True,
        'cache_line_bytes': 128,
    },
    
    # DuckDB Thread Configuration
    'duckdb': {
        'threads': 4,                         # Use P-cores only
        'max_memory': '4GB',
        'memory_limit_enforcement': True,
        'temporary_directory': '/tmp/duckdb_temp',
        'block_size': 262144,                 # 256 KB blocks
        'use_fsync': False,                   # M1 NVMe is fast
        'enable_object_cache': True,
        'object_cache_size': '500MB',
        'prefetch': True,
        'prefetch_size': 4,
        'default_null_order': 'nulls_last',
    },
    
    # Query Optimization
    'query_optimization': {
        'enable_join_pushdown': True,
        'enable_equality_propagation': True,
        'enable_statistical_pruning': True,
        'join_selectivity_threshold': 0.1,
        'chunk_size': 4096,                   # Columnar chunks
    },
    
    # Index Configuration
    'indexing': {
        'adaptive_indexes': True,
        'analyze_on_insert': False,           # Manual ANALYZE better
        'index_cardinality_threshold': 0.1,
    },
    
    # Expected Batch Sizes (M1 tuned)
    'batch_sizes': {
        'companies_sync': 5000,
        'edges_sync': 10000,
        'event_batch': 50000,
    },
    
    # Materialized View Refresh Schedule
    'view_refresh': {
        'daily_metrics': 'hourly',
        'lead_score_distribution': 'daily',
        'industry_heatmap': 'daily',
        'company_network_density': 'daily',
    }
}

def apply_m1_config(conn: duckdb.DuckDBPyConnection) -> None:
    """Apply M1-optimized configuration to DuckDB connection."""
    cfg = M1_CONFIG['duckdb']
    
    conn.execute(f"SET threads = {cfg['threads']};")
    conn.execute(f"SET max_memory = '{cfg['max_memory']}';")
    conn.execute(f"SET temp_directory = '{cfg['temporary_directory']}';")
    conn.execute(f"SET enable_object_cache = {str(cfg['enable_object_cache']).lower()};")
    conn.execute(f"SET default_null_order = '{cfg['default_null_order']}';")
    
    # Query optimization
    opt = M1_CONFIG['query_optimization']
    conn.execute(f"SET enable_join_pushdown = {str(opt['enable_join_pushdown']).lower()};")
