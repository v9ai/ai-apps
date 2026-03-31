"""Evaluate fine-tuned email model on held-out test set.

Loads the LoRA adapter, runs inference on test.jsonl, and scores
each output for JSON validity, format compliance, and quality.

Usage:
  python3 mlx-training/eval_email_model.py
  python3 mlx-training/eval_email_model.py --model mlx-community/Qwen3-0.6B-8bit --adapter mlx-training/models/outreach-email-0.6b
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import mlx_lm

# ── Constants ────────────────────────────────────────────────────────────────

SPAM_WORDS = {"free", "urgent", "act now", "limited time", "guaranteed",
              "no obligation", "click here", "buy now", "discount", "winner"}


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
    for i, example in enumerate(test_data):
        messages = example["messages"]
        # Build prompt from system + user (exclude assistant for inference)
        prompt_messages = [m for m in messages if m["role"] != "assistant"]

        # Detect email type from user message
        user_msg = next((m["content"] for m in messages if m["role"] == "user"), "")
        email_type = detect_email_type(user_msg)

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
        all_scores.append(scores)

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

    # Aggregate
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)

    n = len(all_scores)
    for metric in ["json_valid", "subject_ok", "word_count_ok", "has_placeholder",
                    "no_spam", "has_cta", "has_sign_off"]:
        passed = sum(1 for s in all_scores if s[metric])
        pct = (passed / n * 100) if n > 0 else 0
        bar = "PASS" if pct >= 90 else "WARN" if pct >= 70 else "FAIL"
        print(f"  {metric:20s}: {passed:3d}/{n} ({pct:5.1f}%) [{bar}]")

    # Overall
    perfect = sum(1 for s in all_scores if all(s.values()))
    pct = (perfect / n * 100) if n > 0 else 0
    print(f"\n  {'all_pass':20s}: {perfect:3d}/{n} ({pct:5.1f}%)")

    # Return exit code based on JSON validity threshold
    json_rate = sum(1 for s in all_scores if s["json_valid"]) / n if n > 0 else 0
    if json_rate < 0.95:
        print(f"\nJSON validity {json_rate:.1%} below 95% threshold")
        sys.exit(1)
    print(f"\nJSON validity {json_rate:.1%} meets 95% threshold")


if __name__ == "__main__":
    main()
