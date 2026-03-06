"""Evaluation metrics for BS Detector pipeline."""
from typing import List, Dict, Any


def normalize(text: str) -> str:
    return text.lower().strip()


def finding_matches_discrepancy(finding: Dict[str, Any], discrepancy: Dict[str, Any]) -> bool:
    """Check if a pipeline finding matches a known discrepancy."""
    finding_text = normalize(
        f"{finding.get('description', '')} {finding.get('type', '')} "
        f"{' '.join(finding.get('evidence', []))}"
    )
    # Check if any keyword from the discrepancy appears in the finding
    keywords = discrepancy.get("keywords", [])
    matches = sum(1 for kw in keywords if kw in finding_text)
    return matches >= 2  # At least 2 keyword matches


def calculate_metrics(
    findings: List[Dict[str, Any]],
    ground_truth: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Calculate precision, recall, false discovery rate."""
    matched_gt = set()
    matched_findings = set()

    for i, finding in enumerate(findings):
        for j, gt in enumerate(ground_truth):
            if finding_matches_discrepancy(finding, gt):
                matched_gt.add(j)
                matched_findings.add(i)

    tp = len(matched_findings)
    fp = len(findings) - tp
    fn = len(ground_truth) - len(matched_gt)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    false_discovery_rate = fp / len(findings) if findings else 0.0

    return {
        "true_positives": tp,
        "false_positives": fp,
        "false_negatives": fn,
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "f1_score": round(f1, 3),
        "false_discovery_rate": round(false_discovery_rate, 3),
        "total_findings": len(findings),
        "total_ground_truth": len(ground_truth),
        "matched_discrepancies": [ground_truth[j]["id"] for j in sorted(matched_gt)],
        "missed_discrepancies": [ground_truth[j]["id"] for j in range(len(ground_truth)) if j not in matched_gt],
    }


def calculate_grounding(
    findings: List[Dict[str, Any]],
    source_texts: List[str],
) -> Dict[str, Any]:
    """Check whether each finding's evidence actually appears in source documents.

    Returns a grounding rate: fraction of findings whose evidence text can be
    found (as a substring) in at least one source document.
    """
    if not findings:
        return {"grounding_rate": 1.0, "grounded": 0, "ungrounded": 0, "total": 0}

    combined_sources = normalize(" ".join(source_texts))
    grounded = 0
    ungrounded_items = []

    for i, finding in enumerate(findings):
        evidence = finding.get("evidence", [])
        if isinstance(evidence, str):
            evidence = [evidence]

        is_grounded = False
        for ev in evidence:
            ev_text = ev if isinstance(ev, str) else str(ev.get("text", ev.get("quote", "")))
            # Check if a meaningful substring (10+ chars) of the evidence appears in sources
            ev_normalized = normalize(ev_text)
            if len(ev_normalized) >= 10 and ev_normalized in combined_sources:
                is_grounded = True
                break
            # Also check shorter key phrases (split on sentences)
            for fragment in ev_normalized.split("."):
                fragment = fragment.strip()
                if len(fragment) >= 15 and fragment in combined_sources:
                    is_grounded = True
                    break
            if is_grounded:
                break

        if is_grounded:
            grounded += 1
        else:
            ungrounded_items.append({"index": i, "description": finding.get("description", "")[:80]})

    total = len(findings)
    return {
        "grounding_rate": round(grounded / total, 3) if total else 1.0,
        "grounded": grounded,
        "ungrounded": total - grounded,
        "total": total,
        "ungrounded_items": ungrounded_items,
    }


def calculate_combined_metrics(
    keyword_metrics: Dict[str, Any],
    llm_metrics: Dict[str, Any],
) -> Dict[str, Any]:
    """Merge keyword-based and LLM-judge metrics into a combined view.

    Uses the higher recall signal from either method (union of matched discrepancies).
    """
    kw_matched = set(keyword_metrics.get("matched_discrepancies", []))
    llm_matched = set(llm_metrics.get("llm_matched_discrepancies", []))
    combined_matched = kw_matched | llm_matched

    total_gt = keyword_metrics.get("total_ground_truth", 8)
    combined_tp = len(combined_matched)
    combined_fn = total_gt - combined_tp
    total_findings = keyword_metrics.get("total_findings", 0)
    combined_fp = max(0, total_findings - combined_tp)

    precision = combined_tp / (combined_tp + combined_fp) if (combined_tp + combined_fp) > 0 else 0.0
    recall = combined_tp / (combined_tp + combined_fn) if (combined_tp + combined_fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "combined_precision": round(precision, 3),
        "combined_recall": round(recall, 3),
        "combined_f1_score": round(f1, 3),
        "combined_matched": sorted(combined_matched),
        "combined_missed": sorted(set(keyword_metrics.get("missed_discrepancies", [])) - llm_matched),
        "keyword_only": sorted(kw_matched - llm_matched),
        "llm_only": sorted(llm_matched - kw_matched),
        "both": sorted(kw_matched & llm_matched),
    }
