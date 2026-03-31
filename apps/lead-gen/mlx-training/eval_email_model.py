"""Evaluate fine-tuned email model on held-out test set.

Loads the LoRA adapter, runs inference on test.jsonl, and scores
each output for JSON validity, format compliance, quality, semantic
similarity, diversity, and structured rubric scoring.

Usage:
  python3 mlx-training/eval_email_model.py
  python3 mlx-training/eval_email_model.py --model mlx-community/Qwen3-0.6B-8bit --adapter mlx-training/models/outreach-email-0.6b
  python3 mlx-training/eval_email_model.py --report   # writes eval_report.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import mlx_lm

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

# ── Constants ────────────────────────────────────────────────────────────────

SPAM_WORDS = {"free", "urgent", "act now", "limited time", "guaranteed",
              "no obligation", "click here", "buy now", "discount", "winner"}

TECH_KEYWORDS = {
    "react", "typescript", "javascript", "python", "rust", "go", "java",
    "ai", "ml", "machine learning", "deep learning", "llm", "nlp",
    "kubernetes", "docker", "aws", "gcp", "azure", "terraform",
    "node", "next.js", "graphql", "postgresql", "redis",
}


# ── Scoring functions ────────────────────────────────────────────────────────


def parse_json_output(text: str) -> dict | None:
    """Extract JSON from model output, handling think tags."""
    # Strip think tags
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
    # Strip markdown fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    try:
        data = json.loads(text)
        if isinstance(data, dict) and "subject" in data and "body" in data:
            return data
    except json.JSONDecodeError:
        pass
    return None


def score_email(parsed: dict | None, email_type: str = "initial") -> dict:
    """Score a parsed email on multiple dimensions."""
    scores = {
        "json_valid": False,
        "subject_ok": False,
        "word_count_ok": False,
        "has_placeholder": False,
        "no_spam": False,
        "has_cta": False,
        "has_sign_off": False,
    }

    if not parsed:
        return scores

    subject = parsed.get("subject", "")
    body = parsed.get("body", "")

    scores["json_valid"] = True
    scores["subject_ok"] = 0 < len(subject) <= 60 and not subject.isupper()

    wc = len(body.split())
    limits = {
        "initial": (80, 220),
        "followup_1": (60, 150),
        "followup_2": (50, 130),
        "followup_3": (35, 100),
    }
    lo, hi = limits.get(email_type, (50, 250))
    scores["word_count_ok"] = lo <= wc <= hi

    scores["has_placeholder"] = "{{name}}" in body
    scores["no_spam"] = not any(w in body.lower() for w in SPAM_WORDS)

    cta_words = {"call", "chat", "meet", "connect", "schedule", "discuss", "talk", "catch up"}
    scores["has_cta"] = any(w in body.lower() for w in cta_words)

    sign_offs = {"thanks", "best", "cheers", "regards", "vadim"}
    scores["has_sign_off"] = any(w in body.lower().split("\n")[-1] for w in sign_offs)

    return scores


def detect_email_type(user_msg: str) -> str:
    """Detect email type from user message."""
    lower = user_msg.lower()
    if "final follow-up" in lower or "followup_3" in lower:
        return "followup_3"
    if "second follow-up" in lower or "followup_2" in lower:
        return "followup_2"
    if "first follow-up" in lower or "followup_1" in lower:
        return "followup_1"
    return "initial"


# ── Semantic metrics ────────────────────────────────────────────────────────


def compute_tfidf_similarity(generated_bodies: list[str], reference_bodies: list[str]) -> float:
    """Returns mean cosine similarity between generated and reference bodies."""
    if not HAS_SKLEARN or not generated_bodies or not reference_bodies:
        return -1.0
    if len(generated_bodies) != len(reference_bodies):
        return -1.0

    all_texts = generated_bodies + reference_bodies
    # Filter out empty strings
    if any(not t.strip() for t in all_texts):
        non_empty = [(g, r) for g, r in zip(generated_bodies, reference_bodies)
                     if g.strip() and r.strip()]
        if not non_empty:
            return -1.0
        generated_bodies = [g for g, _ in non_empty]
        reference_bodies = [r for _, r in non_empty]
        all_texts = generated_bodies + reference_bodies

    vectorizer = TfidfVectorizer(stop_words="english", max_features=5000)
    tfidf_matrix = vectorizer.fit_transform(all_texts)

    n = len(generated_bodies)
    gen_vecs = tfidf_matrix[:n]
    ref_vecs = tfidf_matrix[n:]

    similarities = []
    for i in range(n):
        sim = cosine_similarity(gen_vecs[i:i+1], ref_vecs[i:i+1])[0][0]
        similarities.append(float(sim))

    return sum(similarities) / len(similarities) if similarities else -1.0


def compute_diversity(generated_bodies: list[str]) -> float:
    """Returns diversity score (1 - mean pairwise cosine similarity). Higher = more diverse."""
    if not HAS_SKLEARN or len(generated_bodies) < 2:
        return -1.0

    non_empty = [b for b in generated_bodies if b.strip()]
    if len(non_empty) < 2:
        return -1.0

    vectorizer = TfidfVectorizer(stop_words="english", max_features=5000)
    tfidf_matrix = vectorizer.fit_transform(non_empty)

    sim_matrix = cosine_similarity(tfidf_matrix)
    n = sim_matrix.shape[0]
    total_sim = 0.0
    count = 0
    for i in range(n):
        for j in range(i + 1, n):
            total_sim += sim_matrix[i][j]
            count += 1

    mean_sim = total_sim / count if count > 0 else 0.0
    return 1.0 - mean_sim


# ── Rubric scoring ──────────────────────────────────────────────────────────


def score_rubric(parsed: dict, user_msg: str) -> dict:
    """Keyword-based rubric scoring (no LLM). Returns scores 0.0-1.0."""
    if not parsed:
        return {"personalization_score": 0.0, "value_prop_clarity": 0.0, "cta_specificity": 0.0}

    body = parsed.get("body", "").lower()
    subject = parsed.get("subject", "").lower()
    user_lower = user_msg.lower()

    # Personalization: mentions name placeholder + company name from context
    personalization = 0.0
    if "{{name}}" in parsed.get("body", ""):
        personalization += 0.5
    # Check if company name from user context appears in body
    # Extract potential company names from user message (after "company:" or similar patterns)
    company_match = re.search(r'(?:company|for|at|to)\s*[:\-]?\s*([A-Z][A-Za-z0-9\s&]+)', user_msg)
    if company_match:
        company_name = company_match.group(1).strip().lower()
        if company_name and company_name in body:
            personalization += 0.5
    elif personalization > 0:
        # Give partial credit if we can't extract company name but have placeholder
        personalization += 0.2

    # Value prop clarity: mentions specific tech skills
    tech_hits = sum(1 for kw in TECH_KEYWORDS if kw in body or kw in subject)
    value_prop = min(1.0, tech_hits / 3.0)

    # CTA specificity: specific CTA vs generic
    specific_ctas = ["15-minute", "15 minute", "30-minute", "30 minute", "quick call",
                     "brief call", "schedule a", "book a", "this week", "next week",
                     "tuesday", "wednesday", "thursday"]
    generic_ctas = ["let me know", "let us know", "get in touch", "reach out"]

    has_specific = any(c in body for c in specific_ctas)
    has_generic = any(c in body for c in generic_ctas)

    if has_specific:
        cta_specificity = 1.0
    elif has_generic:
        cta_specificity = 0.4
    else:
        cta_specificity = 0.0

    return {
        "personalization_score": round(personalization, 2),
        "value_prop_clarity": round(value_prop, 2),
        "cta_specificity": round(cta_specificity, 2),
    }


# ── Main ─────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Evaluate fine-tuned email model")
    parser.add_argument("--model", default="mlx-community/Qwen3-1.7B-4bit")
    parser.add_argument("--adapter", default="mlx-training/models/outreach-email")
    parser.add_argument("--test-file", type=Path, default=Path("mlx-training/data/outreach-email/test.jsonl"))
    parser.add_argument("--max-tokens", type=int, default=512)
    parser.add_argument("--temperature", type=float, default=0.3)
    parser.add_argument("--limit", type=int, help="Limit number of test examples")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--report", action="store_true", help="Write eval_report.json alongside test file")
    args = parser.parse_args()

    if not args.test_file.exists():
        print(f"ERROR: Test file not found: {args.test_file}", file=sys.stderr)
        sys.exit(1)

    # Load test data
    test_data = []
    with open(args.test_file) as f:
        for line in f:
            if line.strip():
                test_data.append(json.loads(line))

    if args.limit:
        test_data = test_data[:args.limit]

    print(f"Model: {args.model}")
    print(f"Adapter: {args.adapter}")
    print(f"Test examples: {len(test_data)}")
    print()

    # Load model + adapter
    adapter_path = args.adapter if Path(args.adapter).exists() else None
    if adapter_path:
        print(f"Loading model with adapter from {adapter_path}...")
        model, tokenizer = mlx_lm.load(args.model, adapter_path=adapter_path)
    else:
        print(f"Loading base model (no adapter found at {args.adapter})...")
        model, tokenizer = mlx_lm.load(args.model)

    # Run inference and score
    all_scores = []
    all_rubrics = []
    generated_bodies = []
    reference_bodies = []
    per_example = []

    for i, example in enumerate(test_data):
        messages = example["messages"]
        # Build prompt from system + user (exclude assistant for inference)
        prompt_messages = [m for m in messages if m["role"] != "assistant"]

        # Detect email type from user message
        user_msg = next((m["content"] for m in messages if m["role"] == "user"), "")
        email_type = detect_email_type(user_msg)

        # Extract reference (gold) body from assistant message
        ref_msg = next((m["content"] for m in messages if m["role"] == "assistant"), "")
        ref_parsed = parse_json_output(ref_msg)
        ref_body = ref_parsed.get("body", "") if ref_parsed else ""

        # Apply chat template
        prompt = tokenizer.apply_chat_template(
            prompt_messages, tokenize=False, add_generation_prompt=True
        )

        # Generate
        output = mlx_lm.generate(
            model, tokenizer, prompt=prompt,
            max_tokens=args.max_tokens,
        )

        # Score
        parsed = parse_json_output(output)
        scores = score_email(parsed, email_type)
        rubric = score_rubric(parsed, user_msg)
        all_scores.append(scores)
        all_rubrics.append(rubric)

        gen_body = parsed.get("body", "") if parsed else ""
        generated_bodies.append(gen_body)
        reference_bodies.append(ref_body)

        # Per-example record
        example_record = {
            "index": i,
            "email_type": email_type,
            "scores": scores,
            "rubric": rubric,
        }
        if parsed:
            example_record["subject"] = parsed.get("subject", "")
            example_record["word_count"] = len(gen_body.split())
        per_example.append(example_record)

        if args.verbose or not scores["json_valid"]:
            status = "PASS" if all(scores.values()) else "FAIL"
            print(f"  [{i+1}] {status} type={email_type}")
            if parsed:
                print(f"       subject: {parsed['subject'][:60]}")
                print(f"       words: {len(parsed['body'].split())}")
            else:
                print(f"       raw: {output[:100]}...")
            failed = [k for k, v in scores.items() if not v]
            if failed:
                print(f"       failed: {', '.join(failed)}")

    # Compute semantic metrics
    semantic_sim = compute_tfidf_similarity(generated_bodies, reference_bodies)
    diversity = compute_diversity(generated_bodies)

    # Aggregate
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)

    n = len(all_scores)
    metrics_summary = {}

    for metric in ["json_valid", "subject_ok", "word_count_ok", "has_placeholder",
                    "no_spam", "has_cta", "has_sign_off"]:
        passed = sum(1 for s in all_scores if s[metric])
        pct = (passed / n * 100) if n > 0 else 0
        bar = "PASS" if pct >= 90 else "WARN" if pct >= 70 else "FAIL"
        print(f"  {metric:20s}: {passed:3d}/{n} ({pct:5.1f}%) [{bar}]")
        metrics_summary[metric] = round(passed / n, 4) if n > 0 else 0.0

    # Semantic metrics
    if semantic_sim >= 0:
        bar = "PASS" if semantic_sim >= 0.5 else "WARN" if semantic_sim >= 0.3 else "FAIL"
        print(f"  {'semantic_similarity':20s}: {semantic_sim:.3f}        [{bar}]")
        metrics_summary["semantic_similarity"] = round(semantic_sim, 4)
    else:
        print(f"  {'semantic_similarity':20s}: skipped (sklearn not available)")

    if diversity >= 0:
        bar = "PASS" if diversity >= 0.5 else "WARN" if diversity >= 0.3 else "FAIL"
        print(f"  {'diversity':20s}: {diversity:.3f}        [{bar}]")
        metrics_summary["diversity"] = round(diversity, 4)
    else:
        print(f"  {'diversity':20s}: skipped (sklearn not available)")

    # Rubric averages
    for rubric_key in ["personalization_score", "value_prop_clarity", "cta_specificity"]:
        avg = sum(r[rubric_key] for r in all_rubrics) / n if n > 0 else 0.0
        bar = "PASS" if avg >= 0.6 else "WARN" if avg >= 0.3 else "FAIL"
        print(f"  {rubric_key:20s}: {avg:.3f}        [{bar}]")
        metrics_summary[rubric_key] = round(avg, 4)

    # Overall
    perfect = sum(1 for s in all_scores if all(s.values()))
    pct = (perfect / n * 100) if n > 0 else 0
    print(f"\n  {'all_pass':20s}: {perfect:3d}/{n} ({pct:5.1f}%)")

    # Write report if requested
    if args.report:
        report = {
            "model": args.model,
            "adapter": args.adapter,
            "n_examples": n,
            "metrics": metrics_summary,
            "per_example": per_example,
        }
        report_path = args.test_file.parent / "eval_report.json"
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2)
        print(f"\nReport written to {report_path}")

    # Return exit code based on JSON validity threshold
    json_rate = sum(1 for s in all_scores if s["json_valid"]) / n if n > 0 else 0
    if json_rate < 0.95:
        print(f"\nJSON validity {json_rate:.1%} below 95% threshold")
        sys.exit(1)
    print(f"\nJSON validity {json_rate:.1%} meets 95% threshold")


if __name__ == "__main__":
    main()
