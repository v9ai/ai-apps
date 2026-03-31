"""Validate a JSONL file of generated emails against strict quality rules.

Standalone CLI tool for post-generation quality gating.

Usage:
  python3 mlx-training/validate_output.py --input generated.jsonl
  python3 mlx-training/validate_output.py --input generated.jsonl --report
  python3 mlx-training/validate_output.py --input generated.jsonl --strict
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from pydantic import BaseModel, field_validator


# ── Spam word list ──────────────────────────────────────────────────────────

SPAM_WORDS = {
    "free", "urgent", "act now", "limited time", "guaranteed", "no obligation",
    "click here", "buy now", "discount", "winner", "congratulations",
    "you've been selected", "earn money", "make money", "work from home",
    "be your own boss", "double your income", "100% free", "amazing offer",
    "apply now", "approval", "auto email", "best price", "big bucks", "billion",
    "cash", "cheap", "claim", "collect", "compare rates", "cost", "credit",
    "dear friend", "extra cash", "fantastic deal", "financial freedom", "for free",
    "free gift", "free info", "free money", "free offer", "free trial",
    "full refund", "get paid", "great offer", "hidden assets", "home based",
    "incredible deal", "information you requested", "investment", "join millions",
    "lifetime", "lose weight", "lowest price", "ludicrous", "make $",
    "million dollars", "miracle", "money back", "name brand", "no catch",
    "no cost", "no credit check", "no fees", "no gimmick", "no hidden costs",
    "no investment", "no obligation", "no purchase necessary",
    "no questions asked", "no strings attached", "not spam", "obligation free",
    "offer expires", "once in a lifetime", "only $", "open immediately",
    "order now", "potential earnings", "promise", "pure profit", "remove",
    "reverses aging", "risk free", "satisfaction guaranteed", "save $",
    "save big", "serious cash", "special promotion", "subject to credit",
    "take action", "thousands", "undisclosed", "unlimited", "unsubscribe",
    "valuable", "visit our website", "what are you waiting for",
    "while supplies last", "while you sleep", "win", "won",
    "you are a winner", "you have been chosen", "you have been selected",
    "your income",
}


# ── Pydantic v2 schema ─────────────────────────────────────────────────────


class EmailOutput(BaseModel):
    subject: str
    body: str

    @field_validator("subject")
    @classmethod
    def subject_ok(cls, v: str) -> str:
        assert 10 <= len(v) <= 70, f"Subject length {len(v)} not in 10-70"
        assert not v.isupper(), "Subject is ALL CAPS"
        assert not re.search(r"[!]{2,}", v), "Multiple exclamation marks"
        return v

    @field_validator("body")
    @classmethod
    def body_ok(cls, v: str) -> str:
        assert "{{name}}" in v, "Missing {{name}} placeholder"
        return v


# ── Tone classifier ────────────────────────────────────────────────────────


def classify_tone(body: str) -> str:
    """Returns: 'formal', 'casual', 'aggressive', or 'neutral'."""
    lower = body.lower()
    aggressive_markers = ["final notice", "last chance", "you must", "immediately", "demand"]
    if any(m in lower for m in aggressive_markers):
        return "aggressive"
    formal_markers = ["i would", "please", "kindly", "i am writing", "at your convenience"]
    if any(m in lower for m in formal_markers):
        return "formal"
    casual_markers = ["hey", "quick question", "catch up", "sounds good"]
    if any(m in lower for m in casual_markers):
        return "casual"
    return "neutral"


# ── Body structure detection ────────────────────────────────────────────────


def check_body_structure(body: str) -> dict:
    """Detect structural elements of an email body."""
    lines = body.strip().split("\n")
    first_line = lines[0].strip().lower() if lines else ""
    last_line = lines[-1].strip().lower() if lines else ""

    has_greeting = any(first_line.startswith(g) for g in ["hey", "hi", "hello", "dear"])

    tech_keywords = {
        "react", "typescript", "javascript", "python", "rust", "go", "java",
        "ai", "ml", "machine learning", "deep learning", "llm", "nlp",
        "kubernetes", "docker", "aws", "gcp", "azure", "terraform",
        "node", "next.js", "graphql", "postgresql", "redis",
    }
    body_lower = body.lower()
    has_value_prop = any(kw in body_lower for kw in tech_keywords)

    cta_words = {"call", "chat", "meet", "discuss", "schedule", "connect", "talk"}
    has_cta = any(w in body_lower for w in cta_words)

    sign_off_words = {"thanks", "best", "cheers", "regards", "vadim"}
    has_sign_off = any(w in last_line for w in sign_off_words)

    sentences = re.split(r'[.!?]+', body)
    sentence_count = len([s for s in sentences if s.strip()])

    return {
        "has_greeting": has_greeting,
        "has_value_prop": has_value_prop,
        "has_cta": has_cta,
        "has_sign_off": has_sign_off,
        "sentence_count": sentence_count,
    }


# ── Spam check ──────────────────────────────────────────────────────────────


def check_spam(text: str) -> list[str]:
    """Returns list of spam words found in text."""
    lower = text.lower()
    return [w for w in SPAM_WORDS if w in lower]


# ── Validate a single record ───────────────────────────────────────────────


def validate_record(record: dict, index: int) -> dict:
    """Validate a single email record. Returns validation result."""
    result = {
        "index": index,
        "valid": True,
        "errors": [],
        "warnings": [],
        "tone": "neutral",
        "structure": {},
        "spam_words": [],
    }

    # Parse JSON fields
    subject = record.get("subject")
    body = record.get("body")

    if not subject or not body:
        result["valid"] = False
        result["errors"].append("Missing 'subject' or 'body' field")
        return result

    # Pydantic validation
    try:
        EmailOutput(subject=subject, body=body)
    except Exception as e:
        result["valid"] = False
        for error in str(e).split("\n"):
            error = error.strip()
            if error and "assertion" in error.lower():
                result["errors"].append(error)
            elif error and "value_error" in error.lower():
                result["errors"].append(error)
        if not result["errors"]:
            result["errors"].append(str(e))
        return result

    # Spam check
    spam_found = check_spam(subject + " " + body)
    result["spam_words"] = spam_found
    if spam_found:
        result["warnings"].append(f"Spam words found: {', '.join(spam_found[:5])}")

    # Tone
    result["tone"] = classify_tone(body)
    if result["tone"] == "aggressive":
        result["warnings"].append("Aggressive tone detected")

    # Structure
    result["structure"] = check_body_structure(body)

    # Word count check
    wc = len(body.split())
    if wc < 40:
        result["warnings"].append(f"Body too short ({wc} words)")
    elif wc > 250:
        result["warnings"].append(f"Body too long ({wc} words)")

    return result


# ── Main ────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Validate generated email JSONL")
    parser.add_argument("--input", required=True, type=Path, help="Input JSONL file")
    parser.add_argument("--report", action="store_true", help="Write validation_report.json")
    parser.add_argument("--strict", action="store_true", help="Exit code 1 if any record fails")
    args = parser.parse_args()

    if not args.input.exists():
        print(f"ERROR: File not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    # Load records
    records = []
    with open(args.input) as f:
        for line in f:
            if line.strip():
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError as e:
                    records.append({"_parse_error": str(e)})

    print(f"Validating {len(records)} records from {args.input}\n")

    # Validate
    results = []
    pass_count = 0
    fail_count = 0
    warn_count = 0
    tone_counts: dict[str, int] = {}

    for i, record in enumerate(records):
        if "_parse_error" in record:
            result = {
                "index": i,
                "valid": False,
                "errors": [f"JSON parse error: {record['_parse_error']}"],
                "warnings": [],
                "tone": "unknown",
                "structure": {},
                "spam_words": [],
            }
        else:
            result = validate_record(record, i)

        results.append(result)

        if result["valid"]:
            if result["warnings"]:
                warn_count += 1
                status = "WARN"
            else:
                pass_count += 1
                status = "PASS"
        else:
            fail_count += 1
            status = "FAIL"

        tone = result.get("tone", "unknown")
        tone_counts[tone] = tone_counts.get(tone, 0) + 1

        # Print per-record
        errors_str = "; ".join(result["errors"][:3]) if result["errors"] else ""
        warns_str = "; ".join(result["warnings"][:3]) if result["warnings"] else ""
        line_parts = [f"  [{i+1:3d}] {status}"]
        if errors_str:
            line_parts.append(f"  {errors_str}")
        if warns_str:
            line_parts.append(f"  {warns_str}")
        print("".join(line_parts))

    # Summary
    n = len(results)
    print(f"\n{'=' * 60}")
    print("SUMMARY")
    print(f"{'=' * 60}")
    print(f"  Total:    {n}")
    print(f"  Pass:     {pass_count} ({pass_count/n*100:.1f}%)" if n else "  Pass:     0")
    print(f"  Warnings: {warn_count} ({warn_count/n*100:.1f}%)" if n else "  Warnings: 0")
    print(f"  Fail:     {fail_count} ({fail_count/n*100:.1f}%)" if n else "  Fail:     0")

    print(f"\n  Tone distribution:")
    for tone, count in sorted(tone_counts.items()):
        print(f"    {tone:12s}: {count:3d} ({count/n*100:.1f}%)")

    # Structure stats
    structure_keys = ["has_greeting", "has_value_prop", "has_cta", "has_sign_off"]
    struct_counts = {k: 0 for k in structure_keys}
    for r in results:
        for k in structure_keys:
            if r.get("structure", {}).get(k):
                struct_counts[k] += 1

    print(f"\n  Structure:")
    for k in structure_keys:
        c = struct_counts[k]
        print(f"    {k:18s}: {c:3d}/{n} ({c/n*100:.1f}%)" if n else f"    {k:18s}: 0")

    # Write report
    if args.report:
        report = {
            "input": str(args.input),
            "n_records": n,
            "pass": pass_count,
            "warnings": warn_count,
            "fail": fail_count,
            "tone_distribution": tone_counts,
            "structure_rates": {k: round(v / n, 4) if n else 0.0 for k, v in struct_counts.items()},
            "per_record": results,
        }
        report_path = args.input.parent / "validation_report.json"
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2)
        print(f"\nReport written to {report_path}")

    # Strict mode
    if args.strict and fail_count > 0:
        print(f"\nSTRICT: {fail_count} failures, exiting with code 1")
        sys.exit(1)


if __name__ == "__main__":
    main()
