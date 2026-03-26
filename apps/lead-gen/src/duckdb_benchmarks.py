"""
duckdb_analytics/benchmarks.py
Comprehensive benchmark specifications with expected vs actual results
"""

BENCHMARK_SPECS = {
    # Query 1: Simple Graph Traversal (2-hop company connections)
    'graph_traversal_2hop': {
        'description': 'Find all companies within 2 hops from target company',
        'dataset_size': '1M edges, 500K companies',
        'sqlite_baseline_ms': 2500,
        'duckdb_expected_ms': 125,
        'expected_speedup': '20x',
        'reasons': [
            'Columnar execution for edge filtering',
            'Vectorized join operations',
            'Better CPU cache utilization'
        ]
    },
    
    # Query 2: Acquisition Chain Detection
    'acquisition_chain': {
        'description': 'Find acquisition paths (A → B → C) up to depth 3',
        'dataset_size': '1M edges, 500K companies',
        'sqlite_baseline_ms': 4500,
        'duckdb_expected_ms': 400,
        'expected_speedup': '11x',
        'reasons': [
            'Recursive CTE optimization in DuckDB',
            'Array operations for path tracking',
            'Vectorized filtering'
        ]
    },
    
    # Query 3: Daily Funnel Conversion
    'daily_funnel': {
        'description': 'Daily qualified→contacted→demo→converted counts',
        'dataset_size': '1M+ conversion events, 90 days',
        'sqlite_baseline_ms': 9000,
        'duckdb_expected_ms': 100,
        'expected_speedup': '90x',
        'reasons': [
            'Columnar aggregation (event_type filtering)',
            'Fast GROUP BY on date column',
            'Window function optimization'
        ]
    },
    
    # Query 4: Weekly Cohort Analysis
    'weekly_cohorts': {
        'description': 'Cohort retention/conversion across 12 weeks',
        'dataset_size': '200K+ qualified companies, 12 weeks history',
        'sqlite_baseline_ms': 12000,
        'duckdb_expected_ms': 300,
        'expected_speedup': '40x',
        'reasons': [
            'Efficient LEFT JOIN between qualified and converted',
            'Window function optimization',
            'Columnar filtering on qualification week'
        ]
    },
    
    # Query 5: Industry Trends (90 days)
    'industry_trends': {
        'description': 'Weekly qualification trends by industry/size tier',
        'dataset_size': '200K qualified in 90 days, 50 industries',
        'sqlite_baseline_ms': 10000,
        'duckdb_expected_ms': 400,
        'expected_speedup': '25x',
        'reasons': [
            'Vectorized GROUP BY on multiple columns',
            'Percentile computation (aggregation)',
            'Efficient window functions'
        ]
    },
    
    # Query 6: Duplicate Company Detection
    'duplicate_detection': {
        'description': 'Find duplicate companies by domain/name similarity',
        'dataset_size': '500K companies',
        'sqlite_baseline_ms': 22000,
        'duckdb_expected_ms': 500,
        'expected_speedup': '44x',
        'reasons': [
            'Sorted join optimization',
            'String function vectorization',
            'Efficient CROSS JOIN filtering'
        ]
    },
    
    # Query 7: Lead Score Distribution
    'score_distribution': {
        'description': 'Score histogram with precision-at-threshold analysis',
        'dataset_size': '500K companies with scores',
        'sqlite_baseline_ms': 8000,
        'duckdb_expected_ms': 200,
        'expected_speedup': '40x',
        'reasons': [
            'Efficient FLOOR bucketing (vectorized)',
            'Fast window functions (row_number)',
            'Cumulative aggregation'
        ]
    },
    
    # Query 8: Company Network Density
    'network_density': {
        'description': 'Connected companies count per node',
        'dataset_size': '1M edges, 500K companies',
        'sqlite_baseline_ms': 5000,
        'duckdb_expected_ms': 250,
        'expected_speedup': '20x',
        'reasons': [
            'Efficient COUNT(DISTINCT) in columnar store',
            'Fast filtering on source_type/target_type',
            'Aggregation optimization'
        ]
    }
}

def print_benchmark_summary():
    """Print benchmark specifications."""
    print("\n" + "="*80)
    print("DUCKDB ANALYTICS BENCHMARK SPECIFICATIONS")
    print("="*80 + "\n")
    
    total_sqlite_ms = 0
    total_duckdb_ms = 0
    
    for query_name, spec in BENCHMARK_SPECS.items():
        print(f"Query: {query_name}")
        print(f"  Description: {spec['description']}")
        print(f"  Dataset: {spec['dataset_size']}")
        print(f"  SQLite baseline: {spec['sqlite_baseline_ms']} ms")
        print(f"  DuckDB expected: {spec['duckdb_expected_ms']} ms")
        print(f"  Expected speedup: {spec['expected_speedup']}")
        print()
        
        total_sqlite_ms += spec['sqlite_baseline_ms']
        total_duckdb_ms += spec['duckdb_expected_ms']
    
    print("="*80)
    print(f"Total SQLite time (all queries): {total_sqlite_ms} ms")
    print(f"Total DuckDB time (all queries): {total_duckdb_ms} ms")
    print(f"Overall speedup: {round(total_sqlite_ms / total_duckdb_ms, 1)}x")
    print("="*80 + "\n")
