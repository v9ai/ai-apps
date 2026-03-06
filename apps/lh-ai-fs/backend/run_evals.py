#!/usr/bin/env python3
"""BS Detector — Evaluation Harness

Measures pipeline output quality across three axes:
  1. Recall     — catches known planted flaws (8 in Rivera case)
  2. Precision  — avoids false flags on clean, consistent documents
  3. Hallucination rate — does not fabricate findings or case names

Also validates:
  - Cross-document consistency checking (MSJ vs police/medical/witness)
  - Uncertainty expression ("could not verify" rather than fabricating)
  - Structured data passing between agents (Pydantic models, not raw text)

Usage:
    python run_evals.py              # Full eval suite
    python run_evals.py --view       # Also open promptfoo web viewer
    python run_evals.py --quick      # Skip promptfoo, Python evals only
"""
import asyncio
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

os.environ["PYTHONUNBUFFERED"] = "1"

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _BACKEND_DIR)
os.chdir(_BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv()

# ═══════════════════════════════════════════════════════════════════════
# Ground truth: 8 planted errors in the Rivera v. Harmon test case
# ═══════════════════════════════════════════════════════════════════════

GROUND_TRUTH = [
    {
        "id": "D-01",
        "label": "DATE: March 14 vs March 12 discrepancy",
        "keywords": ["march 12", "march 14", "date discrepancy", "date inconsisten"],
        "match_mode": "any",
        "search_in": ["top_findings", "verified_facts"],
        "weight": 2,
    },
    {
        "id": "D-02",
        "label": "PPE: Rivera was wearing harness (MSJ falsely claims no PPE)",
        "keywords": ["harness", "ppe", "hard hat", "protective equipment"],
        "require_also": ["contradict", "wearing", "false", "inconsisten", "not_supported"],
        "match_mode": "keyword_plus_signal",
        "search_in": ["top_findings", "verified_facts"],
        "weight": 2,
    },
    {
        "id": "D-03",
        "label": "PRIVETTE: 'never' misquotation not in actual holding",
        "keywords": ["privette"],
        "require_also": ["never", "presumpt", "misquot", "mischaract"],
        "match_mode": "keyword_plus_signal",
        "search_in": ["top_findings", "verified_citations"],
        "weight": 2,
    },
    {
        "id": "D-04",
        "label": "SOL: Statute of limitations uses wrong incident date",
        "keywords": ["362", "statute", "limitation", "time-bar"],
        "match_mode": "any",
        "search_in": ["top_findings", "verified_facts"],
        "weight": 1,
    },
    {
        "id": "D-05",
        "label": "CTRL: Harmon retained control — Donner directed work",
        "keywords": ["donner", "control", "directed"],
        "require_also": ["harmon", "foreman", "retain", "contradict"],
        "match_mode": "keyword_plus_signal",
        "search_in": ["top_findings", "verified_facts"],
        "weight": 2,
    },
    {
        "id": "D-06",
        "label": "JURISDICTION: Non-binding Texas/Florida citations",
        "keywords": ["dixon", "okafor", "texas", "florida"],
        "require_also": ["jurisdiction", "binding", "persuasive", "not binding"],
        "match_mode": "keyword_plus_signal",
        "search_in": ["top_findings", "verified_citations"],
        "weight": 1,
    },
    {
        "id": "D-07",
        "label": "SCAFFOLDING: Condition omission — rust/plywood documented",
        "keywords": ["rust", "plywood", "scaffolding condition", "defect", "base plate"],
        "match_mode": "any",
        "search_in": ["top_findings", "verified_facts"],
        "weight": 1,
    },
    {
        "id": "D-08",
        "label": "SPOLIATION: Post-incident scaffolding rebuild",
        "keywords": ["rebuilt", "new components", "replaced", "spoliation", "remedial"],
        "match_mode": "any",
        "search_in": ["top_findings", "verified_facts"],
        "weight": 1,
    },
]

# Known real case names from the MSJ — anything else is a hallucination
KNOWN_CASE_NAMES = [
    "privette", "seabright", "whitmore", "kellerman",
    "dixon", "okafor", "rivera", "harmon",
]

from evals.test_cases import CLEAN_DOCUMENTS


# ═══════════════════════════════════════════════════════════════════════
# Result dataclasses
# ═══════════════════════════════════════════════════════════════════════


@dataclass
class EvalResult:
    name: str
    passed: bool
    details: str = ""
    weight: int = 1


@dataclass
class EvalSummary:
    recall_results: List[EvalResult] = field(default_factory=list)
    precision_results: List[EvalResult] = field(default_factory=list)
    hallucination_results: List[EvalResult] = field(default_factory=list)
    consistency_results: List[EvalResult] = field(default_factory=list)
    uncertainty_results: List[EvalResult] = field(default_factory=list)
    structure_results: List[EvalResult] = field(default_factory=list)

    def recall_score(self) -> float:
        total = sum(r.weight for r in self.recall_results)
        caught = sum(r.weight for r in self.recall_results if r.passed)
        return caught / total if total else 0.0

    def precision_score(self) -> float:
        total = len(self.precision_results)
        passed = sum(1 for r in self.precision_results if r.passed)
        return passed / total if total else 1.0

    def hallucination_rate(self) -> float:
        total = len(self.hallucination_results)
        failed = sum(1 for r in self.hallucination_results if not r.passed)
        return failed / total if total else 0.0


# ═══════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════


def _safe_list(val) -> list:
    """Return val if it's a list, else empty list. Guards against None."""
    return val if isinstance(val, list) else []


def _safe_str(val) -> str:
    """Return str(val) or '' if None."""
    return str(val) if val is not None else ""


# ═══════════════════════════════════════════════════════════════════════
# Text extraction helpers
# ═══════════════════════════════════════════════════════════════════════


def _extract_searchable_text(report: dict, sections: List[str]) -> List[str]:
    """Extract lowercase text blobs from specified report sections."""
    texts = []
    if "top_findings" in sections:
        for f in report.get("top_findings", []):
            evidence = f.get("evidence") or []
            blob = " ".join([
                f.get("description") or "",
                f.get("type") or "",
                " ".join(str(e) for e in evidence if e),
                f.get("recommendation") or "",
            ])
            texts.append(blob.lower())

    if "verified_facts" in sections:
        for vf in report.get("verified_facts", []):
            blob = " ".join([
                vf.get("summary") or "",
                (vf.get("fact") or {}).get("fact_text") or "",
                " ".join(s for s in (vf.get("contradictory_sources") or []) if s),
                vf.get("status") or "",
            ])
            texts.append(blob.lower())

    if "verified_citations" in sections:
        for vc in report.get("verified_citations", []):
            blob = " ".join([
                vc.get("notes") or "",
                " ".join(d for d in (vc.get("discrepancies") or []) if d),
                (vc.get("citation") or {}).get("citation_text") or "",
                (vc.get("citation") or {}).get("claimed_proposition") or "",
                vc.get("status") or "",
            ])
            texts.append(blob.lower())

    return texts


def _check_ground_truth(report: dict, gt: dict) -> bool:
    """Check if a ground truth item is detected in the report."""
    texts = _extract_searchable_text(report, gt["search_in"])
    all_text = " ".join(texts)

    if gt["match_mode"] == "any":
        return any(kw in all_text for kw in gt["keywords"])

    elif gt["match_mode"] == "keyword_plus_signal":
        has_keyword = any(kw in all_text for kw in gt["keywords"])
        has_signal = any(sig in all_text for sig in gt.get("require_also", []))
        return has_keyword and has_signal

    return False


# ═══════════════════════════════════════════════════════════════════════
# Pipeline runner
# ═══════════════════════════════════════════════════════════════════════


async def run_pipeline(documents: Optional[dict] = None, case_id: Optional[str] = None) -> dict:
    from agents.orchestrator import PipelineOrchestrator
    orch = PipelineOrchestrator()
    return await orch.analyze(documents=documents, case_id=case_id)


# ═══════════════════════════════════════════════════════════════════════
# Eval checks
# ═══════════════════════════════════════════════════════════════════════


def eval_recall(report: dict) -> List[EvalResult]:
    """Measure recall: how many of the 8 planted errors are caught."""
    results = []
    for gt in GROUND_TRUTH:
        detected = _check_ground_truth(report, gt)
        results.append(EvalResult(
            name=f"{gt['id']} {gt['label']}",
            passed=detected,
            weight=gt["weight"],
            details="detected" if detected else "MISSED",
        ))
    return results


def eval_precision(clean_report: dict) -> List[EvalResult]:
    """Measure precision: clean docs should not produce false flags."""
    results = []

    # P-01: Should have <=1 top findings
    findings = clean_report.get("top_findings", [])
    results.append(EvalResult(
        name="P-01: Clean docs produce <=1 finding",
        passed=len(findings) <= 1,
        details=f"found {len(findings)} findings",
    ))

    # P-02: No contradictory facts on clean docs
    contradictory = [
        f for f in clean_report.get("verified_facts", [])
        if f.get("status") == "contradictory"
    ]
    results.append(EvalResult(
        name="P-02: No contradictory facts on clean docs",
        passed=len(contradictory) == 0,
        details=f"found {len(contradictory)} contradictory facts",
    ))

    # P-03: No not_supported/misleading citations on clean docs
    bad_citations = [
        c for c in clean_report.get("verified_citations", [])
        if c.get("status") in ("not_supported", "misleading")
    ]
    results.append(EvalResult(
        name="P-03: No bad citations flagged on clean docs",
        passed=len(bad_citations) == 0,
        details=f"found {len(bad_citations)} false-flagged citations",
    ))

    # P-04: Overall confidence should be high for clean docs
    scores = clean_report.get("confidence_scores", {})
    overall = scores.get("overall", 0)
    results.append(EvalResult(
        name="P-04: High overall confidence on clean docs",
        passed=overall >= 0.6,
        details=f"overall confidence = {overall:.2f}",
    ))

    return results


def eval_hallucinations(report: dict) -> List[EvalResult]:
    """Check for fabricated findings not grounded in documents."""
    results = []

    # H-01: No fabricated case names in citations
    cit_text = json.dumps(report.get("verified_citations", [])).lower()
    fabricated_names = [
        "smith v. jones", "garcia v. acme", "wilson v. buildright",
        "johnson v. safety", "martinez v. construct", "brown v. steel",
    ]
    found_fabricated = [name for name in fabricated_names if name in cit_text]
    results.append(EvalResult(
        name="H-01: No fabricated case names in citations",
        passed=len(found_fabricated) == 0,
        details=f"fabricated: {found_fabricated}" if found_fabricated else "clean",
    ))

    # H-02: All cited case names exist in source documents
    # Extract case names mentioned in verified citations
    all_cit_names = set()
    for vc in report.get("verified_citations", []):
        cit = vc.get("citation") or {}
        if not isinstance(cit, dict):
            cit = {}
        text = (str(cit.get("citation_text") or "") + " " + str(cit.get("claimed_proposition") or "")).lower()
        for known in KNOWN_CASE_NAMES:
            if known in text:
                all_cit_names.add(known)
    # At least some known case names should appear in extracted citations
    results.append(EvalResult(
        name="H-02: Citations reference known case names from source documents",
        passed=len(all_cit_names) >= 2,
        details=f"recognized cases: {sorted(all_cit_names)}",
    ))

    # H-03: Evidence in findings references actual document content
    findings = report.get("top_findings", [])
    grounded_count = 0
    for f in findings:
        evidence = f.get("evidence", [])
        if isinstance(evidence, list) and len(evidence) > 0:
            # Check at least one evidence item has substantive content
            has_substance = any(
                len(str(e).strip()) > 10 for e in evidence
            )
            if has_substance:
                grounded_count += 1
    grounding_ratio = grounded_count / len(findings) if findings else 1.0
    results.append(EvalResult(
        name="H-03: >=50% findings grounded with evidence",
        passed=grounding_ratio >= 0.5,
        details=f"{grounded_count}/{len(findings)} grounded ({grounding_ratio:.0%})",
    ))

    # H-04: No findings reference completely invented document types
    findings_text = json.dumps(report.get("top_findings", [])).lower()
    invented_sources = ["deposition", "expert report", "surveillance", "tax return"]
    found_invented = [s for s in invented_sources if s in findings_text]
    results.append(EvalResult(
        name="H-04: No findings reference document types not in the case",
        passed=len(found_invented) == 0,
        details=f"invented sources: {found_invented}" if found_invented else "clean",
    ))

    return results


def eval_cross_document_consistency(report: dict) -> List[EvalResult]:
    """Verify the pipeline performs cross-document consistency checks."""
    results = []

    # C-01: Facts reference multiple source documents
    multi_source_facts = [
        f for f in report.get("verified_facts", [])
        if len(_safe_list(f.get("contradictory_sources"))) > 0
        or len(_safe_list(f.get("supporting_sources"))) > 1
    ]
    results.append(EvalResult(
        name="C-01: Facts cross-reference multiple documents",
        passed=len(multi_source_facts) >= 1,
        details=f"{len(multi_source_facts)} facts reference multiple sources",
    ))

    # C-02: At least one fact cites police report as contradictory source
    police_refs = [
        f for f in report.get("verified_facts", [])
        if any("police" in _safe_str(s).lower() for s in _safe_list(f.get("contradictory_sources")))
        or any("police" in _safe_str(s).lower() for s in _safe_list(f.get("supporting_sources")))
    ]
    results.append(EvalResult(
        name="C-02: Pipeline references police report in fact checking",
        passed=len(police_refs) >= 1,
        details=f"{len(police_refs)} facts reference police report",
    ))

    # C-03: At least one fact cites witness statement
    witness_refs = [
        f for f in report.get("verified_facts", [])
        if any("witness" in _safe_str(s).lower() for s in _safe_list(f.get("contradictory_sources")))
        or any("witness" in _safe_str(s).lower() for s in _safe_list(f.get("supporting_sources")))
    ]
    results.append(EvalResult(
        name="C-03: Pipeline references witness statement in fact checking",
        passed=len(witness_refs) >= 1,
        details=f"{len(witness_refs)} facts reference witness statement",
    ))

    # C-04: At least one fact cites medical records
    medical_refs = [
        f for f in report.get("verified_facts", [])
        if any("medical" in _safe_str(s).lower() for s in _safe_list(f.get("contradictory_sources")))
        or any("medical" in _safe_str(s).lower() for s in _safe_list(f.get("supporting_sources")))
    ]
    results.append(EvalResult(
        name="C-04: Pipeline references medical records in fact checking",
        passed=len(medical_refs) >= 1,
        details=f"{len(medical_refs)} facts reference medical records",
    ))

    # C-05: Metadata confirms all 4 documents were analyzed
    docs_analyzed = report.get("metadata", {}).get("documents_analyzed", [])
    results.append(EvalResult(
        name="C-05: All 4 document types analyzed",
        passed=len(docs_analyzed) == 4,
        details=f"analyzed: {docs_analyzed}",
    ))

    return results


def eval_uncertainty(report: dict) -> List[EvalResult]:
    """Check appropriate uncertainty expression."""
    results = []

    # U-01: At least one citation expresses uncertainty (confidence < 1.0)
    uncertain_citations = [
        c for c in report.get("verified_citations", [])
        if c.get("confidence", 1.0) < 1.0
    ]
    results.append(EvalResult(
        name="U-01: At least one citation expresses uncertainty (confidence < 1.0)",
        passed=len(uncertain_citations) >= 1,
        details=f"{len(uncertain_citations)} citations with confidence < 1.0",
    ))

    # U-02: Confidence scores are not all 1.0 (overconfident) or all 0.0
    scores = report.get("confidence_scores", {})
    all_scores = [scores.get("citation_verification", 0), scores.get("fact_consistency", 0), scores.get("overall", 0)]
    results.append(EvalResult(
        name="U-02: Confidence scores express appropriate uncertainty",
        passed=not all(s == 1.0 for s in all_scores) and not all(s == 0.0 for s in all_scores),
        details=f"scores: {all_scores}",
    ))

    # U-03: unknown_issues list is populated when items can't be verified
    unknown = report.get("unknown_issues", [])
    results.append(EvalResult(
        name="U-03: Unknown issues list exists",
        passed=isinstance(unknown, list),
        details=f"{len(unknown)} unknown issues reported",
    ))

    # U-04: No citation claims absolute certainty (confidence=1.0) on a flagged item
    overconfident = [
        c for c in report.get("verified_citations", [])
        if c.get("confidence", 0) == 1.0
        and c.get("status") in ("not_supported", "misleading")
    ]
    results.append(EvalResult(
        name="U-04: Flagged citations don't claim 100% confidence",
        passed=len(overconfident) == 0,
        details=f"{len(overconfident)} overconfident flagged citations",
    ))

    return results


def eval_structure(report: dict) -> List[EvalResult]:
    """Validate structured data passing between agents."""
    results = []

    # S-01: Report contains all required top-level fields
    required_fields = ["motion_id", "verified_citations", "verified_facts",
                       "top_findings", "confidence_scores"]
    missing = [f for f in required_fields if f not in report]
    results.append(EvalResult(
        name="S-01: Report has required top-level fields",
        passed=len(missing) == 0,
        details=f"missing: {missing}" if missing else "all present",
    ))

    # S-02: Citations are structured (have citation sub-object, not raw text)
    citations = report.get("verified_citations", [])
    structured_cits = [
        c for c in citations
        if isinstance(c, dict) and isinstance(c.get("citation"), dict)
    ]
    results.append(EvalResult(
        name="S-02: Citations pass structured Citation objects (not raw text)",
        passed=len(structured_cits) == len(citations) if citations else True,
        details=f"{len(structured_cits)}/{len(citations)} structured",
    ))

    # S-03: Facts are structured (have fact sub-object)
    facts = report.get("verified_facts", [])
    structured_facts = [
        f for f in facts
        if isinstance(f, dict) and isinstance(f.get("fact"), dict)
    ]
    results.append(EvalResult(
        name="S-03: Facts pass structured Fact objects (not raw text)",
        passed=len(structured_facts) == len(facts) if facts else True,
        details=f"{len(structured_facts)}/{len(facts)} structured",
    ))

    # S-04: Confidence scores are valid numbers 0-1
    scores = report.get("confidence_scores", {})
    valid_scores = all(
        isinstance(scores.get(k), (int, float)) and 0 <= scores.get(k, -1) <= 1
        for k in ["citation_verification", "fact_consistency", "overall"]
    )
    results.append(EvalResult(
        name="S-04: Confidence scores are valid floats in [0, 1]",
        passed=valid_scores,
        details=f"scores: {scores}",
    ))

    # S-05: Judicial memo is structured (not raw string blob)
    memo = report.get("judicial_memo")
    is_structured_memo = (
        isinstance(memo, dict)
        and "memo" in memo
        and len(memo.get("memo", "")) > 50
    )
    results.append(EvalResult(
        name="S-05: Judicial memo is structured dict with required fields",
        passed=is_structured_memo,
        details="structured" if is_structured_memo else f"type: {type(memo).__name__}",
    ))

    # S-06: Finding IDs are present and unique
    findings = report.get("top_findings", [])
    ids = [f.get("id") for f in findings if f.get("id")]
    results.append(EvalResult(
        name="S-06: Finding IDs are present and unique",
        passed=len(ids) == len(set(ids)) and len(ids) == len(findings),
        details=f"{len(ids)} unique IDs for {len(findings)} findings",
    ))

    return results


# ═══════════════════════════════════════════════════════════════════════
# Printing
# ═══════════════════════════════════════════════════════════════════════


def _print_section(title: str, results: List[EvalResult]):
    passed = sum(1 for r in results if r.passed)
    total = len(results)
    status = "PASS" if passed == total else "PARTIAL" if passed > 0 else "FAIL"
    print(f"\n{'─' * 60}")
    print(f"  {title}  [{passed}/{total}] {status}")
    print(f"{'─' * 60}")
    for r in results:
        mark = "PASS" if r.passed else "FAIL"
        print(f"  {mark}: {r.name}")
        if r.details:
            print(f"         {r.details}")


def print_eval_report(summary: EvalSummary):
    recall = summary.recall_score()
    precision = summary.precision_score()
    hallucination = summary.hallucination_rate()

    print("\n" + "=" * 60)
    print("  BS DETECTOR — EVALUATION REPORT")
    print("=" * 60)

    _print_section("RECALL (catching known flaws)", summary.recall_results)
    _print_section("PRECISION (avoiding false flags)", summary.precision_results)
    _print_section("HALLUCINATION (not fabricating findings)", summary.hallucination_results)
    _print_section("CROSS-DOCUMENT CONSISTENCY", summary.consistency_results)
    _print_section("UNCERTAINTY EXPRESSION", summary.uncertainty_results)
    _print_section("STRUCTURED DATA PASSING", summary.structure_results)

    print("\n" + "=" * 60)
    print("  AGGREGATE METRICS")
    print("=" * 60)

    recall_caught = sum(r.weight for r in summary.recall_results if r.passed)
    recall_total = sum(r.weight for r in summary.recall_results)
    print(f"  Recall:            {recall:.0%}  ({recall_caught}/{recall_total} weighted)")
    print(f"  Precision:         {precision:.0%}  ({sum(1 for r in summary.precision_results if r.passed)}/{len(summary.precision_results)} checks)")
    print(f"  Hallucination:     {hallucination:.0%}  ({sum(1 for r in summary.hallucination_results if not r.passed)}/{len(summary.hallucination_results)} failures)")

    all_results = (
        summary.recall_results + summary.precision_results +
        summary.hallucination_results + summary.consistency_results +
        summary.uncertainty_results + summary.structure_results
    )
    total_pass = sum(1 for r in all_results if r.passed)
    total_checks = len(all_results)
    print(f"\n  Overall:           {total_pass}/{total_checks} checks passed")
    print("=" * 60)

    return total_pass == total_checks


# ═══════════════════════════════════════════════════════════════════════
# Promptfoo integration (optional)
# ═══════════════════════════════════════════════════════════════════════

CACHE_FILE = os.path.join(_BACKEND_DIR, "evals", ".report_cache.json")


def save_cache(report: dict, key: str = "default"):
    cache_path = CACHE_FILE if key == "default" else f"{CACHE_FILE}.{key}"
    with open(cache_path, "w") as f:
        json.dump(report, f, default=str)


def run_promptfoo(view=False):
    print("\n[promptfoo] Running eval suite...")
    cmd = ["npx", "promptfoo", "eval", "--no-cache", "--config", "promptfooconfig.yaml"]
    result = subprocess.run(cmd, check=False, cwd=_BACKEND_DIR)
    if view:
        subprocess.run(["npx", "promptfoo", "view"], check=False, cwd=_BACKEND_DIR)
    return result.returncode


# ═══════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════


async def main():
    view = "--view" in sys.argv
    quick = "--quick" in sys.argv

    summary = EvalSummary()

    # ── Rivera case (planted errors) ──────────────────────────────
    print("[eval] Running pipeline on Rivera v. Harmon (8 planted errors)...")
    t0 = time.time()
    rivera_report = await run_pipeline()
    t_rivera = time.time() - t0

    n_cit = len(rivera_report.get("verified_citations", []))
    n_fact = len(rivera_report.get("verified_facts", []))
    n_find = len(rivera_report.get("top_findings", []))
    print(f"[eval] Rivera done in {t_rivera:.0f}s — {n_cit} citations, {n_fact} facts, {n_find} findings")

    # Save cache for promptfoo
    save_cache(rivera_report)

    # Recall
    summary.recall_results = eval_recall(rivera_report)

    # Hallucination
    summary.hallucination_results = eval_hallucinations(rivera_report)

    # Cross-document consistency
    summary.consistency_results = eval_cross_document_consistency(rivera_report)

    # Uncertainty
    summary.uncertainty_results = eval_uncertainty(rivera_report)

    # Structure
    summary.structure_results = eval_structure(rivera_report)

    # ── Clean case (precision) ────────────────────────────────────
    print("\n[eval] Running pipeline on Smith v. ABC Corp (clean docs, expect ~0 findings)...")
    t0 = time.time()
    clean_report = await run_pipeline(documents=CLEAN_DOCUMENTS, case_id="clean_test")
    t_clean = time.time() - t0

    n_find_clean = len(clean_report.get("top_findings", []))
    print(f"[eval] Clean done in {t_clean:.0f}s — {n_find_clean} findings (expect 0-1)")

    save_cache(clean_report, key="clean")

    # Precision
    summary.precision_results = eval_precision(clean_report)

    # ── Print report ──────────────────────────────────────────────
    all_pass = print_eval_report(summary)

    # ── Promptfoo (optional) ──────────────────────────────────────
    if not quick:
        run_promptfoo(view=view)

    sys.exit(0 if all_pass else 1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[eval] Interrupted")
        sys.exit(130)
    except Exception as e:
        print(f"\n[eval] Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
