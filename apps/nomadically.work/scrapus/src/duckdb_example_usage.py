"""
example_usage.py
Complete usage examples for DuckDB Analytics in Scrapus pipeline
"""

from duckdb_analytics import DuckDBAnalytics

# Initialize analytics engine
analytics = DuckDBAnalytics(
    db_path="scrapus_analytics.duckdb",
    sqlite_path="scrapus_data/scrapus.db"
)

# Sync SQLite → DuckDB (run once or on schedule)
analytics.sync_from_sqlite()

# =========================================================================
# EXAMPLE 1: Dashboard Summary
# =========================================================================

dashboard_data = analytics.get_dashboard_data(days=30)
print("Dashboard Summary:")
print(f"  Total companies: {dashboard_data['summary']['total_companies']}")
print(f"  Qualified leads: {dashboard_data['summary']['qualified_leads']}")
print(f"  Average lead score: {dashboard_data['summary']['avg_lead_score']}")
print(f"  Median lead score: {dashboard_data['summary']['median_lead_score']}")

# =========================================================================
# EXAMPLE 2: Lead Funnel Analysis
# =========================================================================

funnel = analytics.get_lead_funnel_daily('2024-01-01', '2024-01-31')
for day_metrics in funnel[:7]:
    print(f"{day_metrics['event_date']}: "
          f"{day_metrics['qualified']} qualified → "
          f"{day_metrics['contacted']} contacted "
          f"({day_metrics['contact_rate_pct']}%) → "
          f"{day_metrics['converted']} converted "
          f"({day_metrics['end_to_end_rate_pct']}%)")

# =========================================================================
# EXAMPLE 3: Industry Heat Map
# =========================================================================

heatmap = analytics.get_industry_heat_map()
print("\nTop Industries by Qualification Rate:")
for industry in heatmap[:5]:
    print(f"  {industry['industry']} ({industry['size_tier']}): "
          f"{industry['qualification_pct']}% qualified, "
          f"avg score {industry['avg_lead_score']}")

# =========================================================================
# EXAMPLE 4: Graph Traversal - Company Ecosystem
# =========================================================================

connections = analytics.find_company_connections(
    company_id=42,
    max_depth=2,
    relation_types=['acquired', 'invested_in']
)
print(f"\nFound {len(connections)} companies connected to target:")
for company in connections[:5]:
    print(f"  {company['name']} (depth {company['depth']}, "
          f"score {company['lead_score']}, qualified {company['is_qualified']})")

# =========================================================================
# EXAMPLE 5: Cohort Analysis - Track Conversion Over Time
# =========================================================================

cohorts = analytics.get_cohort_conversion_analysis(weeks=12)
print("\nCohort Conversion Analysis (Last 12 Weeks):")
print("Qualified Week | Cohort Size | W0 Conv | W1 Conv | W2 Conv | W3 Conv")
for cohort in cohorts[:5]:
    print(f"{cohort['qualified_week']} | {cohort['cohort_size']:>11} | "
          f"{cohort['conversion_pct_w0']:>7} | {cohort['conversion_pct_w1']:>7} | "
          f"{cohort['conversion_pct_w2']:>7} | {cohort['conversion_pct_w3']:>7}")

# =========================================================================
# EXAMPLE 6: Optimal Threshold Recommendation
# =========================================================================

threshold_rec = analytics.recommend_score_threshold(target_precision=0.90)
print(f"\nRecommended Lead Score Threshold:")
print(f"  Threshold: {threshold_rec['threshold']}")
print(f"  Companies at/above: {threshold_rec['companies_at_or_above']}")
print(f"  Precision: {threshold_rec['precision_at_threshold']}%")
print(f"  Recall: {threshold_rec['recall_at_threshold']}")

# =========================================================================
# EXAMPLE 7: Performance Monitoring
# =========================================================================

perf = analytics.get_query_performance_baseline()
print(f"\nQuery Performance (M1 Hardware):")
for query_name, time_ms in perf.items():
    if query_name != 'timestamp':
        print(f"  {query_name}: {time_ms} ms")

# =========================================================================
# EXAMPLE 8: Export for BI Tools
# =========================================================================

analytics.export_to_parquet("./exports/analytics_data")
print("\n✓ Exported all analytics tables to Parquet format")
