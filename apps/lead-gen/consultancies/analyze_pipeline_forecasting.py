"""
Pipeline Forecasting Analysis
==============================
Analyzes the pipeline-forecasting-analysis.json file and generates
detailed reports, statistics, and visualizations.

Usage:
    python analyze_pipeline_forecasting.py              # Full analysis report
    python analyze_pipeline_forecasting.py --summary    # Quick summary only
    python analyze_pipeline_forecasting.py --csv        # Export to CSV
    python analyze_pipeline_forecasting.py --compare    # Compare top companies
"""

import argparse
import json
from collections import Counter
from pathlib import Path
from datetime import datetime


def load_data() -> dict:
    """Load the pipeline forecasting analysis JSON."""
    data_path = Path(__file__).parent / "data" / "pipeline-forecasting-analysis.json"
    with open(data_path, "r") as f:
        return json.load(f)


def print_summary(data: dict):
    """Print high-level summary."""
    print("\n" + "=" * 70)
    print("  PIPELINE FORECASTING ANALYSIS - SUMMARY")
    print("=" * 70)
    print(f"\n  Generated: {data['generated_at']}")
    print(f"  Total companies analyzed: {data['total_companies']}")
    
    analysis = data["analysis"]
    breakdown = analysis["automation_level_breakdown"]
    realtime = analysis["realtime_vs_batch"]
    
    print(f"\n  Automation Levels:")
    for level, count in breakdown.items():
        pct = (count / data["total_companies"]) * 100 if data["total_companies"] > 0 else 0
        bar = "█" * int(pct / 5)
        print(f"    {level:12} {count:2} ({pct:5.1f}%) {bar}")
    
    print(f"\n  Realtime vs Batch:")
    print(f"    Batch:   {realtime['batch']} ({realtime['batch']/data['total_companies']*100:.0f}%)")
    print(f"    Realtime: {realtime['realtime']} ({realtime['realtime']/data['total_companies']*100:.0f}%)")


def print_data_sources(data: dict):
    """Print data source frequency analysis."""
    print("\n" + "=" * 70)
    print("  DATA SOURCE FREQUENCY")
    print("=" * 70)
    
    sources = data["analysis"]["data_source_frequency"]
    sorted_sources = sorted(sources.items(), key=lambda x: x[1], reverse=True)
    max_count = max(sources.values()) if sources else 1
    
    print(f"\n  {'Data Source':<30} {'Count':>6} {'Usage %':>8}  Bar")
    print("  " + "-" * 55)
    
    for source, count in sorted_sources:
        pct = (count / data["total_companies"]) * 100
        bar_len = int((count / max_count) * 20)
        bar = "█" * bar_len
        print(f"  {source:<30} {count:>6} {pct:>7.1f}%  {bar}")
    
    # Group by category
    print("\n  Data Source Categories:")
    core_sources = [s for s, c in sorted_sources if s.lower().startswith(("crm", "historical", "pipeline", "sales"))]
    external_sources = [s for s, c in sorted_sources if s.lower() in ("market trends", "web signals", "job postings")]
    behavioral_sources = [s for s, c in sorted_sources if "lead" in s.lower() or "engagement" in s.lower()]
    
    print(f"    Core sales data:      {len(core_sources)} sources")
    print(f"    External signals:     {len(external_sources)} sources")
    print(f"    Behavioral signals:   {len(behavioral_sources)} sources")


def print_ai_approaches(data: dict):
    """Print AI implementation type breakdown."""
    print("\n" + "=" * 70)
    print("  AI IMPLEMENTATION APPROACHES")
    print("=" * 70)
    
    approaches = data["analysis"]["ai_implementation_types"]
    total = sum(approaches.values())
    
    print(f"\n  {'Approach':<30} {'Count':>6} {'Percentage':>10}")
    print("  " + "-" * 50)
    
    for approach, count in sorted(approaches.items(), key=lambda x: x[1], reverse=True):
        pct = (count / total) * 100 if total > 0 else 0
        print(f"  {approach:<30} {count:>6} {pct:>9.1f}%")
    
    print("\n  Implementation Details:")
    for company in data["companies"]:
        impl = company["feature"]["ai_implementation"]
        approach_type = "ML" if "ML" in impl or "machine learning" in impl.lower() else \
                       "Time-series" if "time-series" in impl.lower() else "Predictive"
        print(f"    {company['name'][:40]:<40} → {approach_type}")


def print_company_details(data: dict):
    """Print detailed company breakdown."""
    print("\n" + "=" * 70)
    print("  COMPANY DETAILS")
    print("=" * 70)
    
    for i, company in enumerate(data["companies"], 1):
        feature = company["feature"]
        print(f"\n  {i:2}. {company['name']}")
        print(f"      Domain: {company['domain']}")
        print(f"      Automation: {company['automation_level']}")
        print(f"      Feature: {feature['name']}")
        print(f"      Description: {feature['description'][:100]}...")
        print(f"      AI Approach: {feature['ai_implementation'][:100]}...")
        print(f"      Data Sources ({len(feature['data_sources'])}): {', '.join(feature['data_sources'][:5])}")
        if len(feature['data_sources']) > 5:
            print(f"                     + {len(feature['data_sources']) - 5} more")


def print_insights(data: dict):
    """Print key insights."""
    print("\n" + "=" * 70)
    print("  KEY INSIGHTS")
    print("=" * 70)
    
    for i, insight in enumerate(data["analysis"]["key_insights"], 1):
        print(f"\n  {i}. {insight['insight']}")
        print(f"     {insight['detail']}")


def print_differentiators(data: dict):
    """Print competitive differentiators."""
    print("\n" + "=" * 70)
    print("  COMPETITIVE DIFFERENTIATORS")
    print("=" * 70)
    
    for diff in data["analysis"]["competitive_differentiators"]:
        print(f"\n  {diff['company']}")
        print(f"    {diff['differentiator']}")


def export_csv(data: dict, output_path: Path):
    """Export company data to CSV."""
    import csv
    
    csv_path = output_path or (Path(__file__).parent / "data" / "pipeline-forecasting-companies.csv")
    
    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "Name", "Domain", "Website", "Automation Level",
            "Feature Name", "Description", "AI Implementation",
            "Data Sources", "Data Source Count", "Is Realtime"
        ])
        
        for company in data["companies"]:
            feature = company["feature"]
            writer.writerow([
                company["name"],
                company["domain"],
                company["website"],
                company["automation_level"],
                feature["name"],
                feature["description"],
                feature["ai_implementation"],
                "; ".join(feature["data_sources"]),
                len(feature["data_sources"]),
                feature["is_realtime"]
            ])
    
    print(f"\n  CSV exported to: {csv_path}")


def compare_companies(data: dict, top_n: int = 5):
    """Compare top companies by data source sophistication."""
    print("\n" + "=" * 70)
    print(f"  TOP {top_n} COMPANIES BY DATA SOURCE SOPHISTICATION")
    print("=" * 70)
    
    # Sort by number of data sources
    sorted_companies = sorted(
        data["companies"],
        key=lambda c: len(c["feature"]["data_sources"]),
        reverse=True
    )
    
    print(f"\n  {'Rank':<5} {'Company':<35} {'Sources':>8} {'Data Sources'}")
    print("  " + "-" * 70)
    
    for i, company in enumerate(sorted_companies[:top_n], 1):
        sources = company["feature"]["data_sources"]
        name = company["name"][:35]
        print(f"  {i:<5} {name:<35} {len(sources):>8}  {', '.join(sources)}")
    
    # Show the least sophisticated
    print("\n" + "-" * 70)
    print(f"  {'Rank':<5} {'Company':<35} {'Sources':>8} {'Data Sources'}")
    print("  " + "-" * 70)
    
    for i, company in enumerate(reversed(sorted_companies[-3:]), 1):
        sources = company["feature"]["data_sources"]
        name = company["name"][:35]
        rank = data["total_companies"] - len(sorted_companies) + i
        print(f"  {rank:<5} {name:<35} {len(sources):>8}  {', '.join(sources)}")


def generate_markdown_report(data: dict, output_path: Path = None):
    """Generate a markdown report."""
    md_path = output_path or (Path(__file__).parent / "data" / "pipeline-forecasting-report.md")
    
    md = f"""# Pipeline Forecasting Analysis Report

**Generated:** {datetime.now().strftime("%Y-%m-%d %H:%M")}
**Data Source:** pipeline-forecasting-analysis.json

## Executive Summary

- **Total Companies Analyzed:** {data['total_companies']}
- **Primary Data Sources:** CRM data (88%), Historical sales data (82%), Market trends (53%)
- **Dominant AI Approach:** ML models (41%), Time-series forecasting (35%)
- **Automation Level:** 94% semi-auto, 6% agentic
- **Realtime Processing:** 0% (all batch)

## Key Findings

### Data Source Usage

| Data Source | Companies | Usage % |
|-------------|-----------|---------|
"""
    
    sources = sorted(data["analysis"]["data_source_frequency"].items(), key=lambda x: x[1], reverse=True)[:10]
    for source, count in sources:
        pct = (count / data["total_companies"]) * 100
        md += f"| {source} | {count} | {pct:.0f}% |\n"
    
    md += f"""
### AI Implementation Types

| Approach | Count | Percentage |
|----------|-------|------------|
"""
    
    for approach, count in data["analysis"]["ai_implementation_types"].items():
        total = sum(data["analysis"]["ai_implementation_types"].values())
        pct = (count / total) * 100
        md += f"| {approach} | {count} | {pct:.1f}% |\n"
    
    md += """
## Competitive Differentiators

"""
    
    for diff in data["analysis"]["competitive_differentiators"]:
        md += f"### {diff['company']}\n\n{diff['differentiator']}\n\n"
    
    md += """
## Methodology

This analysis examines 17 companies offering pipeline forecasting features in the AI sales/lead generation space.
Data was extracted from company websites using aiohttp + BeautifulSoup, then structured using Qwen3-8B (MLX).

Each company's forecasting implementation was analyzed for:
- Data sources used
- AI/ML approach
- Automation level
- Realtime vs batch processing
"""
    
    with open(md_path, "w") as f:
        f.write(md)
    
    print(f"\n  Markdown report saved to: {md_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Analyze pipeline forecasting data"
    )
    parser.add_argument("--summary", action="store_true",
                        help="Show summary only")
    parser.add_argument("--csv", action="store_true",
                        help="Export to CSV")
    parser.add_argument("--compare", action="store_true",
                        help="Compare top companies")
    parser.add_argument("--markdown", action="store_true",
                        help="Generate markdown report")
    parser.add_argument("--output", type=str,
                        help="Output path for CSV/Markdown")
    args = parser.parse_args()
    
    data = load_data()
    
    if args.summary:
        print_summary(data)
        return
    
    if args.csv:
        export_csv(data, Path(args.output) if args.output else None)
        return
    
    if args.compare:
        compare_companies(data)
        return
    
    if args.markdown:
        generate_markdown_report(data, Path(args.output) if args.output else None)
        return
    
    # Full report
    print_summary(data)
    print_data_sources(data)
    print_insights(data)
    print_differentiators(data)
    print_company_details(data)
    
    print("\n" + "=" * 70)
    print("  ANALYSIS COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
