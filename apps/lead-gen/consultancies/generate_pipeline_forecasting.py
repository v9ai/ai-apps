"""
Pipeline Forecasting Analysis Generator
=========================================
Reads ai-features.json, filters for pipeline prediction/forecasting features,
computes analysis stats, and writes pipeline-forecasting-analysis.json.

Usage:
    python generate_pipeline_forecasting.py              # Generate from ai-features.json
    python generate_pipeline_forecasting.py --input /path/to/ai-features.json
    python generate_pipeline_forecasting.py --output /path/to/output.json
    python generate_pipeline_forecasting.py --verbose    # Print each matched company
"""

import argparse
import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path


# ── Helpers ───────────────────────────────────────────────────────────────────

ARTICLE_PATTERNS = re.compile(
    r"^(\d+\s+best|\d+\s+top|\d+\s+ai|best\s+ai|top\s+\d|what\s+is|how\s+to|why\s+|"
    r"the\s+\d|guide\s+to|introduction|overview|vs\.|comparison|review|"
    r"welcome\s+to|ai\s+for\s+|era\s+of\s+|building\s+an?\s+)",
    re.IGNORECASE,
)


def clean_company_name(name: str, domain: str) -> str:
    """Return a clean company name, falling back to domain for article-like titles."""
    if not name:
        return domain
    # Long titles are likely article/page titles
    if len(name) > 55:
        return domain
    # Starts with an article-like pattern
    if ARTICLE_PATTERNS.match(name.strip()):
        return domain
    # Contains question mark (article title heuristic)
    if "?" in name:
        return domain
    return name


PIPELINE_KEYWORDS = {
    "pipeline", "forecast", "predict", "revenue forecast", "predictive pipeline",
    "sales forecast", "revenue intelligence",
}


def is_pipeline_feature(feature: dict) -> bool:
    """Return True if this feature is about pipeline prediction/forecasting."""
    name_lower = feature.get("name", "").lower()
    return any(kw in name_lower for kw in PIPELINE_KEYWORDS)


def classify_ai_implementation(impl: str) -> str:
    """Classify the AI implementation approach into a broad category."""
    lower = impl.lower()
    if any(k in lower for k in ("time-series", "timeseries", "time series")):
        return "Time-series forecasting"
    if any(k in lower for k in ("trains ml", "trains a ml", "ml model", "machine learning model")):
        return "ML model / Machine Learning"
    if "predictive analytics" in lower:
        return "Predictive analytics"
    if any(k in lower for k in ("neural network", "deep learning", "lstm", "transformer")):
        return "Neural network / Deep learning"
    if any(k in lower for k in ("regression", "linear model", "logistic")):
        return "Regression model"
    if any(k in lower for k in ("ml", "machine learning", "trains", "trains model", "random forest", "gradient")):
        return "ML model / Machine Learning"
    return "Predictive analytics"


# ── Core logic ────────────────────────────────────────────────────────────────

def filter_pipeline_companies(data: list[dict]) -> list[dict]:
    """Filter ai-features.json for companies with pipeline prediction features."""
    results = []
    for company in data:
        pipeline_features = [f for f in company.get("features", []) if is_pipeline_feature(f)]
        if not pipeline_features:
            continue

        # Pick the best feature: prefer "Pipeline Forecasting" exact match, else first match
        best = next(
            (f for f in pipeline_features if "pipeline forecast" in f.get("name", "").lower()),
            pipeline_features[0],
        )

        name = clean_company_name(company.get("name", ""), company.get("domain", ""))
        results.append({
            "name": name,
            "domain": company.get("domain", ""),
            "website": company.get("website", ""),
            "automation_level": company.get("automation_level", "assisted"),
            "feature": best,
        })

    return results


def compute_analysis(companies: list[dict]) -> dict:
    """Compute aggregate statistics over the pipeline-forecast companies."""
    total = len(companies)
    if total == 0:
        return {}

    # Automation level breakdown
    auto_counts: Counter = Counter(c["automation_level"] for c in companies)
    automation_breakdown = {
        "semi-auto": auto_counts.get("semi-auto", 0),
        "agentic": auto_counts.get("agentic", 0),
        "autonomous": auto_counts.get("autonomous", 0),
        "assisted": auto_counts.get("assisted", 0),
    }

    # Realtime vs batch
    realtime_count = sum(1 for c in companies if c["feature"].get("is_realtime", False))
    realtime_vs_batch = {"realtime": realtime_count, "batch": total - realtime_count}

    # Data source frequency (normalise: lowercase, strip)
    source_counter: Counter = Counter()
    for c in companies:
        for source in c["feature"].get("data_sources", []):
            source_counter[source.strip().lower()] += 1

    # Sort by frequency, keep original casing of the first occurrence
    canonical: dict[str, str] = {}
    for c in companies:
        for source in c["feature"].get("data_sources", []):
            key = source.strip().lower()
            if key not in canonical:
                canonical[key] = source.strip()
    data_source_freq = {
        canonical[k]: v
        for k, v in sorted(source_counter.items(), key=lambda x: -x[1])
    }

    # AI implementation type classification
    impl_types: Counter = Counter()
    for c in companies:
        impl = c["feature"].get("ai_implementation", "")
        impl_types[classify_ai_implementation(impl)] += 1
    ai_impl_types = dict(sorted(impl_types.items(), key=lambda x: -x[1]))

    # Key insights (algorithmic)
    most_common_source, most_common_count = source_counter.most_common(1)[0]
    second_source, second_count = source_counter.most_common(2)[-1]
    avg_sources = sum(len(c["feature"].get("data_sources", [])) for c in companies) / total
    dominant_impl, dominant_count = impl_types.most_common(1)[0]

    key_insights = [
        {
            "insight": f"{canonical.get(most_common_source, most_common_source).title()} is Universal",
            "detail": (
                f"{round(most_common_count/total*100)}% of companies ({most_common_count}/{total}) "
                f"use {canonical.get(most_common_source, most_common_source)} as a primary source, "
                f"making it the foundational data layer for pipeline forecasting."
            ),
        },
        {
            "insight": "Historical Data is Critical",
            "detail": (
                f"{round(second_count/total*100)}% of companies ({second_count}/{total}) rely on "
                f"{canonical.get(second_source, second_source)}, indicating that time-based "
                f"pattern recognition is essential for accurate forecasting."
            ),
        },
        {
            "insight": "No Realtime Forecasting" if realtime_count == 0 else "Realtime Forecasting Emerging",
            "detail": (
                f"{round(realtime_count/total*100)}% of pipeline forecasting features are realtime"
                + (" — all are batch processes. This suggests forecasting prioritizes accuracy over immediacy." if realtime_count == 0 else ".")
            ),
        },
        {
            "insight": f"{dominant_impl} Dominates",
            "detail": (
                f"{round(dominant_count/total*100)}% of implementations use {dominant_impl}. "
                f"Average data sources per company: {avg_sources:.1f}."
            ),
        },
        {
            "insight": "Semi-Auto Standard",
            "detail": (
                f"{round(auto_counts.get('semi-auto',0)/total*100)}% offer semi-auto forecasting "
                f"(humans review predictions). Agentic: {auto_counts.get('agentic',0)}, "
                f"autonomous: {auto_counts.get('autonomous',0)}."
            ),
        },
        {
            "insight": "Data Source Sophistication Varies",
            "detail": (
                f"Basic implementations use 2-3 data sources. "
                f"Advanced implementations use {max(len(c['feature'].get('data_sources',[])) for c in companies)}+ sources "
                f"including web signals, job postings, and engagement metrics."
            ),
        },
    ]

    # Competitive differentiators: top 3 by data source count + unique differentiator field
    sorted_by_sources = sorted(
        companies,
        key=lambda c: len(c["feature"].get("data_sources", [])),
        reverse=True,
    )
    differentiators = []
    for c in sorted_by_sources[:5]:
        diff_text = c.get("feature", {}).get("ai_implementation", "")[:200]
        if diff_text:
            differentiators.append({
                "company": c["domain"],
                "differentiator": diff_text,
            })

    return {
        "data_source_frequency": data_source_freq,
        "ai_implementation_types": ai_impl_types,
        "automation_level_breakdown": automation_breakdown,
        "realtime_vs_batch": realtime_vs_batch,
        "key_insights": key_insights,
        "competitive_differentiators": differentiators,
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Generate pipeline-forecasting-analysis.json from ai-features.json"
    )
    parser.add_argument(
        "--input", type=str,
        default=str(Path(__file__).parent / "data" / "ai-features.json"),
        help="Path to ai-features.json",
    )
    parser.add_argument(
        "--output", type=str,
        default=str(Path(__file__).parent / "data" / "pipeline-forecasting-analysis.json"),
        help="Output path for pipeline-forecasting-analysis.json",
    )
    parser.add_argument("--verbose", action="store_true", help="Print matched companies")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    print(f"Reading {input_path}...")
    with open(input_path) as f:
        all_companies = json.load(f)
    print(f"  {len(all_companies)} total companies loaded")

    companies = filter_pipeline_companies(all_companies)
    print(f"  {len(companies)} companies with pipeline prediction/forecasting features")

    if args.verbose:
        print()
        for c in companies:
            feat = c["feature"]
            print(f"  {c['name']} ({c['domain']})")
            print(f"    Feature: {feat['name']}")
            print(f"    Data sources ({len(feat.get('data_sources', []))}): {', '.join(feat.get('data_sources', []))}")
            print()

    analysis = compute_analysis(companies)

    output = {
        "generated_at": datetime.now().strftime("%Y-%m-%d"),
        "total_companies": len(companies),
        "companies": companies,
        "analysis": analysis,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nWrote {len(companies)} companies → {output_path}")

    # Quick summary
    print()
    print("── Summary ──────────────────────────────────────")
    al = analysis.get("automation_level_breakdown", {})
    print(f"  Automation: semi-auto={al.get('semi-auto',0)}, agentic={al.get('agentic',0)}, autonomous={al.get('autonomous',0)}")
    rv = analysis.get("realtime_vs_batch", {})
    print(f"  Realtime={rv.get('realtime',0)}, Batch={rv.get('batch',0)}")
    print(f"  AI implementation types: {analysis.get('ai_implementation_types', {})}")
    top_sources = list(analysis.get("data_source_frequency", {}).items())[:5]
    print(f"  Top data sources: {top_sources}")


if __name__ == "__main__":
    main()
