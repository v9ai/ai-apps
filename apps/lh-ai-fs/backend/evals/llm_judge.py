"""LLM-as-Judge evaluation for BS Detector findings.

Provides semantic evaluation alongside keyword matching. Activated when
LLM_JUDGE=1 environment variable is set.
"""
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger("eval.llm_judge")

JUDGE_SYSTEM_PROMPT = """You are an evaluation judge for a legal brief verification system.
You will compare a pipeline finding against a ground truth discrepancy and determine if they match.

A match means the finding correctly identifies the same issue described in the ground truth,
even if it uses different wording. Focus on semantic equivalence, not exact keyword matching.

Respond with JSON: {"match": true/false, "confidence": 0.0-1.0, "reasoning": "..."}"""

JUDGE_USER_PROMPT = """Ground Truth Discrepancy:
ID: {gt_id}
Description: {gt_description}
Category: {gt_category}
Expected Evidence: {gt_evidence}
Expected Reasoning: {gt_reasoning}

Pipeline Finding:
Description: {finding_description}
Type: {finding_type}
Evidence: {finding_evidence}
Confidence: {finding_confidence}

Does this pipeline finding correctly identify the ground truth discrepancy? Consider:
1. Does it address the same factual or legal issue?
2. Does it identify similar evidence or contradictions?
3. Would a legal professional consider these to be about the same problem?"""


async def judge_finding(
    finding: Dict[str, Any],
    ground_truth: Dict[str, Any],
    llm_service,
) -> Dict[str, Any]:
    """Use LLM to judge whether a finding matches a ground truth discrepancy."""
    prompt = JUDGE_USER_PROMPT.format(
        gt_id=ground_truth.get("id", ""),
        gt_description=ground_truth.get("description", ""),
        gt_category=ground_truth.get("category", ""),
        gt_evidence=json.dumps(ground_truth.get("evidence", {})),
        gt_reasoning=ground_truth.get("expected_reasoning", ""),
        finding_description=finding.get("description", ""),
        finding_type=finding.get("type", ""),
        finding_evidence=json.dumps(finding.get("evidence", []), default=str),
        finding_confidence=finding.get("confidence", 0),
    )

    try:
        result = await llm_service.get_completion(
            system=JUDGE_SYSTEM_PROMPT,
            user=prompt,
            temperature=0.0,
        )
        data = json.loads(result.strip().strip("`").strip())
        return {
            "match": bool(data.get("match", False)),
            "confidence": float(data.get("confidence", 0)),
            "reasoning": str(data.get("reasoning", "")),
        }
    except Exception as e:
        logger.warning(f"LLM judge failed for {ground_truth.get('id')}: {e}")
        return {"match": False, "confidence": 0.0, "reasoning": f"Judge error: {e}"}


async def judge_all(
    findings: List[Dict[str, Any]],
    ground_truth: List[Dict[str, Any]],
    llm_service,
) -> Dict[str, Any]:
    """Run LLM-as-judge on all findings vs ground truth. Returns metrics dict."""
    matched_gt = set()
    matched_findings = set()
    judgments = []

    for i, finding in enumerate(findings):
        for j, gt in enumerate(ground_truth):
            if j in matched_gt:
                continue
            result = await judge_finding(finding, gt, llm_service)
            judgments.append({
                "finding_idx": i,
                "gt_id": gt["id"],
                "result": result,
            })
            if result["match"] and result["confidence"] >= 0.5:
                matched_gt.add(j)
                matched_findings.add(i)
                break

    tp = len(matched_findings)
    fp = len(findings) - tp
    fn = len(ground_truth) - len(matched_gt)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "llm_precision": round(precision, 3),
        "llm_recall": round(recall, 3),
        "llm_f1_score": round(f1, 3),
        "llm_true_positives": tp,
        "llm_false_positives": fp,
        "llm_false_negatives": fn,
        "llm_matched_discrepancies": [ground_truth[j]["id"] for j in sorted(matched_gt)],
        "llm_missed_discrepancies": [ground_truth[j]["id"] for j in range(len(ground_truth)) if j not in matched_gt],
        "judgments": judgments,
    }
