"""Evaluation harness for BS Detector pipeline."""
import asyncio
import json
import sys
import os
import logging

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from evals.test_cases import KNOWN_DISCREPANCIES
from evals.metrics import calculate_metrics, calculate_grounding
from evals import db

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("eval")


async def run_pipeline():
    """Run the BS Detector pipeline and return the report."""
    from agents.orchestrator import PipelineOrchestrator
    orchestrator = PipelineOrchestrator()
    return await orchestrator.analyze()


def extract_findings(report: dict) -> list:
    """Extract findings from pipeline report for evaluation."""
    findings = []

    # Get top findings
    for f in report.get("top_findings", []):
        findings.append(f)

    # Also extract from verified_citations that flagged issues
    for vc in report.get("verified_citations", []):
        if isinstance(vc, dict):
            status = vc.get("status", "")
            if status in ("not_supported", "misleading", "could_not_verify"):
                findings.append({
                    "description": f"Citation issue: {vc.get('notes', '')} {' '.join(vc.get('discrepancies', []))}",
                    "type": "citation",
                    "evidence": vc.get("discrepancies", []),
                    "confidence": vc.get("confidence", 0),
                })

    # Extract from verified_facts that found contradictions
    for vf in report.get("verified_facts", []):
        if isinstance(vf, dict):
            status = vf.get("status", "")
            if status in ("contradictory", "partial", "could_not_verify"):
                fact = vf.get("fact", {})
                findings.append({
                    "description": f"Fact inconsistency: {vf.get('summary', '')} {fact.get('fact_text', '')}",
                    "type": "fact",
                    "evidence": vf.get("contradictory_sources", []),
                    "confidence": vf.get("confidence", 0),
                })

    return findings


async def main():
    db.init_db(db.DB_PATH)

    print("=" * 60)
    print("BS DETECTOR — EVALUATION HARNESS")
    print("=" * 60)
    print()

    print("Running pipeline analysis...")
    try:
        report = await run_pipeline()
    except Exception as e:
        print(f"Pipeline failed: {e}")
        sys.exit(1)

    print(f"Pipeline completed. Extracting findings...")
    findings = extract_findings(report)
    print(f"Found {len(findings)} findings to evaluate")
    print()

    print("Calculating metrics against ground truth...")
    metrics = calculate_metrics(findings, KNOWN_DISCREPANCIES)

    # Grounding check: verify evidence references actual source text
    doc_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "documents")
    source_texts = []
    for fname in os.listdir(doc_dir):
        if fname.endswith(".txt"):
            with open(os.path.join(doc_dir, fname)) as f:
                source_texts.append(f.read())
    grounding = calculate_grounding(findings, source_texts)
    metrics["grounding"] = grounding

    print()
    print("-" * 40)
    print("RESULTS (Keyword Matching)")
    print("-" * 40)
    print(f"  Precision:          {metrics['precision']:.1%}")
    print(f"  Recall:             {metrics['recall']:.1%}")
    print(f"  F1 Score:           {metrics['f1_score']:.1%}")
    print(f"  False Discovery:    {metrics['false_discovery_rate']:.1%}")
    print(f"  True Positives:     {metrics['true_positives']}")
    print(f"  False Positives:    {metrics['false_positives']}")
    print(f"  False Negatives:    {metrics['false_negatives']}")
    print()
    print(f"  Matched:  {metrics['matched_discrepancies']}")
    print(f"  Missed:   {metrics['missed_discrepancies']}")
    print()

    print("-" * 40)
    print("EVIDENCE GROUNDING")
    print("-" * 40)
    print(f"  Grounding Rate:     {grounding['grounding_rate']:.1%}")
    print(f"  Grounded:           {grounding['grounded']}/{grounding['total']}")
    if grounding.get("ungrounded_items"):
        print(f"  Ungrounded findings:")
        for item in grounding["ungrounded_items"]:
            print(f"    [{item['index']}] {item['description']}")
    print()

    # LLM-as-Judge evaluation (opt-in via LLM_JUDGE=1)
    llm_metrics = None
    if os.environ.get("LLM_JUDGE") == "1":
        print("-" * 40)
        print("RESULTS (LLM-as-Judge)")
        print("-" * 40)
        try:
            from evals.llm_judge import judge_all
            from evals.metrics import calculate_combined_metrics
            from services.llm_service import LLMService
            llm_service = LLMService()
            llm_metrics = await judge_all(findings, KNOWN_DISCREPANCIES, llm_service)
            print(f"  LLM Precision:      {llm_metrics['llm_precision']:.1%}")
            print(f"  LLM Recall:         {llm_metrics['llm_recall']:.1%}")
            print(f"  LLM F1 Score:       {llm_metrics['llm_f1_score']:.1%}")
            print(f"  LLM Matched:  {llm_metrics['llm_matched_discrepancies']}")
            print(f"  LLM Missed:   {llm_metrics['llm_missed_discrepancies']}")
            print()
            combined = calculate_combined_metrics(metrics, llm_metrics)
            print("-" * 40)
            print("COMBINED METRICS")
            print("-" * 40)
            print(f"  Combined Recall:    {combined['combined_recall']:.1%}")
            print(f"  Combined F1:        {combined['combined_f1_score']:.1%}")
            print(f"  Keyword-only:       {combined['keyword_only']}")
            print(f"  LLM-only:           {combined['llm_only']}")
            print(f"  Both agreed:        {combined['both']}")
            print()
            metrics["llm_judge"] = llm_metrics
            metrics["combined"] = combined
        except Exception as e:
            logger.warning("LLM-as-judge failed: %s", e)
            print(f"  LLM-as-judge error: {e}")
            print()

    # Print judicial memo if present
    memo = report.get("judicial_memo")
    if memo:
        print("-" * 40)
        print("JUDICIAL MEMO")
        print("-" * 40)
        if isinstance(memo, dict):
            print(memo.get("memo", ""))
            if memo.get("key_issues"):
                print("\nKey Issues:")
                for issue in memo["key_issues"]:
                    print(f"  - {issue}")
            if memo.get("overall_assessment"):
                print(f"\nAssessment: {memo['overall_assessment']}")
        else:
            print(memo)
        print()

    import uuid
    from datetime import datetime, timezone
    run_id = uuid.uuid4().hex
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    git_sha = None
    try:
        import subprocess as _sp
        _r = _sp.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True, timeout=3)
        git_sha = _r.stdout.strip() if _r.returncode == 0 else None
    except Exception:
        pass
    try:
        run_id = db.save_run(run_id, timestamp, git_sha, metrics, findings, report)
        logger.info("Eval run persisted to SQLite (run_id=%s)", run_id)
    except Exception as e:
        logger.warning("Could not persist eval run to SQLite: %s", e)

    # Save full report
    with open("eval_results.json", "w") as f:
        json.dump({"run_id": run_id, "metrics": metrics, "report": report}, f, indent=2, default=str)
    print("Full results saved to eval_results.json")


if __name__ == "__main__":
    asyncio.run(main())
