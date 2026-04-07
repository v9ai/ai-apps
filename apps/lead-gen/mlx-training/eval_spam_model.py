"""Evaluate spam classifier: precision/recall, FPR, calibration, AI detection.

Loads the logistic regression weights exported by distill_spam_classifier.py
and evaluates against a labeled test JSONL file. Reports per-category metrics,
threshold sweeps, false positive rates, calibration error, and optional
comparison against Rust weights.

Usage:
  python3 mlx-training/eval_spam_model.py --input spam_test.jsonl
  python3 mlx-training/eval_spam_model.py --input spam_test.jsonl --weights weights.json
  python3 mlx-training/eval_spam_model.py --input spam_test.jsonl --compare-rust
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from pathlib import Path

import numpy as np

# Import feature extraction from distill script (same directory)
sys.path.insert(0, str(Path(__file__).parent))
from distill_spam_classifier import (
    SPAM_CATEGORIES,
    NUM_FEATURES,
    extract_spam_features,
)

# ── Scoring helpers ──────────────────────────────────────────────────────────


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def predict_scores(features: np.ndarray, classifiers: list[dict]) -> dict[str, float]:
    """Predict per-category scores from features and classifiers."""
    scores = {}
    for i, name in enumerate(SPAM_CATEGORIES):
        w = np.array(classifiers[i]["weights"], dtype=np.float32)
        b = classifiers[i]["bias"]
        z = float(features @ w + b)
        scores[name] = sigmoid(z)
    return scores


def predict_label(scores: dict[str, float]) -> str:
    """Return the category with highest score."""
    return max(scores, key=scores.get)


# ── Evaluation metrics ───────────────────────────────────────────────────────


def compute_per_category_metrics(y_true: list[str], y_pred: list[str]) -> dict:
    """Compute precision, recall, F1 per category."""
    metrics = {}
    for cat in SPAM_CATEGORIES:
        tp = sum(1 for t, p in zip(y_true, y_pred) if t == cat and p == cat)
        fp = sum(1 for t, p in zip(y_true, y_pred) if t != cat and p == cat)
        fn = sum(1 for t, p in zip(y_true, y_pred) if t == cat and p != cat)
        n = sum(1 for t in y_true if t == cat)

        precision = tp / max(tp + fp, 1)
        recall = tp / max(tp + fn, 1)
        f1 = 2 * precision * recall / max(precision + recall, 1e-7)

        metrics[cat] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "support": n,
            "tp": tp,
            "fp": fp,
            "fn": fn,
        }
    return metrics


def compute_threshold_sweep(
    entries: list[dict], classifiers: list[dict]
) -> dict[str, list[dict]]:
    """Compute precision/recall at thresholds [0.1..0.9] for each category."""
    thresholds = [round(t, 1) for t in np.arange(0.1, 1.0, 0.1)]
    results = {}

    for cat in SPAM_CATEGORIES:
        cat_results = []
        cat_idx = SPAM_CATEGORIES.index(cat)

        for threshold in thresholds:
            tp = fp = fn = tn = 0
            for entry in entries:
                features = extract_spam_features(entry)
                w = np.array(classifiers[cat_idx]["weights"], dtype=np.float32)
                b = classifiers[cat_idx]["bias"]
                z = float(features @ w + b)
                score = sigmoid(z)

                is_positive = entry["label"] == cat
                pred_positive = score >= threshold

                if is_positive and pred_positive:
                    tp += 1
                elif not is_positive and pred_positive:
                    fp += 1
                elif is_positive and not pred_positive:
                    fn += 1
                else:
                    tn += 1

            precision = tp / max(tp + fp, 1)
            recall = tp / max(tp + fn, 1)
            f1 = 2 * precision * recall / max(precision + recall, 1e-7)

            cat_results.append({
                "threshold": threshold,
                "precision": round(precision, 4),
                "recall": round(recall, 4),
                "f1": round(f1, 4),
            })
        results[cat] = cat_results

    return results


def compute_clean_fpr(y_true: list[str], y_pred: list[str]) -> dict:
    """Compute false positive rate on clean emails (critical: must be < 5%)."""
    clean_total = sum(1 for t in y_true if t == "clean")
    clean_fp = sum(1 for t, p in zip(y_true, y_pred) if t == "clean" and p != "clean")
    fpr = clean_fp / max(clean_total, 1)

    # Breakdown: what are clean emails misclassified as?
    misclassified_as = {}
    for t, p in zip(y_true, y_pred):
        if t == "clean" and p != "clean":
            misclassified_as[p] = misclassified_as.get(p, 0) + 1

    return {
        "clean_total": clean_total,
        "clean_false_positives": clean_fp,
        "fpr": round(fpr, 4),
        "fpr_pct": round(fpr * 100, 2),
        "misclassified_as": misclassified_as,
        "pass": fpr < 0.05,
    }


def compute_ece(
    entries: list[dict], classifiers: list[dict], n_bins: int = 10
) -> dict:
    """Compute Expected Calibration Error (ECE) per provider.

    ECE = sum_b (|B_b| / N) * |acc(B_b) - conf(B_b)|
    """
    # Group entries by provider
    by_provider: dict[str, list[dict]] = {}
    for entry in entries:
        provider = entry.get("provider", "unknown") or "unknown"
        by_provider.setdefault(provider, []).append(entry)

    provider_ece = {}
    for provider, provider_entries in by_provider.items():
        if len(provider_entries) < 5:
            continue

        confidences = []
        correct = []
        for entry in provider_entries:
            features = extract_spam_features(entry)
            scores = predict_scores(features, classifiers)
            pred = predict_label(scores)
            conf = scores[pred]
            confidences.append(conf)
            correct.append(1.0 if pred == entry["label"] else 0.0)

        # Bin by confidence
        bin_boundaries = np.linspace(0, 1, n_bins + 1)
        ece = 0.0
        n_total = len(confidences)

        for b in range(n_bins):
            lo, hi = bin_boundaries[b], bin_boundaries[b + 1]
            mask = [(lo <= c < hi) for c in confidences]
            bin_size = sum(mask)
            if bin_size == 0:
                continue

            bin_acc = sum(c for c, m in zip(correct, mask) if m) / bin_size
            bin_conf = sum(c for c, m in zip(confidences, mask) if m) / bin_size
            ece += (bin_size / n_total) * abs(bin_acc - bin_conf)

        provider_ece[provider] = round(ece, 4)

    return provider_ece


def compute_ai_detection_auc(
    entries: list[dict], classifiers: list[dict]
) -> dict:
    """Compute ROC AUC for ai_generated vs rest (simplified trapezoidal)."""
    ai_idx = SPAM_CATEGORIES.index("ai_generated")

    scores_and_labels = []
    for entry in entries:
        features = extract_spam_features(entry)
        w = np.array(classifiers[ai_idx]["weights"], dtype=np.float32)
        b = classifiers[ai_idx]["bias"]
        z = float(features @ w + b)
        score = sigmoid(z)
        is_ai = 1 if entry["label"] == "ai_generated" else 0
        scores_and_labels.append((score, is_ai))

    # Sort by score descending
    scores_and_labels.sort(key=lambda x: -x[0])

    total_pos = sum(1 for _, l in scores_and_labels if l == 1)
    total_neg = sum(1 for _, l in scores_and_labels if l == 0)

    if total_pos == 0 or total_neg == 0:
        return {"auc": -1.0, "total_ai": total_pos, "total_non_ai": total_neg}

    # Trapezoidal AUC
    tp = 0
    fp = 0
    prev_tpr = 0.0
    prev_fpr = 0.0
    auc = 0.0

    for score, label in scores_and_labels:
        if label == 1:
            tp += 1
        else:
            fp += 1

        tpr = tp / total_pos
        fpr = fp / total_neg

        # Trapezoidal rule
        auc += (fpr - prev_fpr) * (tpr + prev_tpr) / 2.0
        prev_tpr = tpr
        prev_fpr = fpr

    return {
        "auc": round(auc, 4),
        "total_ai": total_pos,
        "total_non_ai": total_neg,
    }


def compare_rust_weights(
    entries: list[dict],
    python_classifiers: list[dict],
    rust_weights_path: Path,
) -> dict:
    """Compare Python logistic predictions vs Rust weights JSON."""
    if not rust_weights_path.exists():
        return {"error": f"Rust weights not found: {rust_weights_path}"}

    with open(rust_weights_path) as f:
        rust_data = json.load(f)

    rust_classifiers = rust_data.get("classifiers", [])
    if len(rust_classifiers) != len(python_classifiers):
        return {"error": f"Classifier count mismatch: Python={len(python_classifiers)} Rust={len(rust_classifiers)}"}

    agreements = 0
    disagreements = 0
    max_score_diff = 0.0
    score_diffs = []

    for entry in entries:
        features = extract_spam_features(entry)

        py_scores = predict_scores(features, python_classifiers)
        rust_scores = predict_scores(features, rust_classifiers)

        py_pred = predict_label(py_scores)
        rust_pred = predict_label(rust_scores)

        if py_pred == rust_pred:
            agreements += 1
        else:
            disagreements += 1

        for cat in SPAM_CATEGORIES:
            diff = abs(py_scores[cat] - rust_scores[cat])
            score_diffs.append(diff)
            max_score_diff = max(max_score_diff, diff)

    return {
        "agreements": agreements,
        "disagreements": disagreements,
        "agreement_rate": round(agreements / max(agreements + disagreements, 1), 4),
        "max_score_diff": round(max_score_diff, 6),
        "mean_score_diff": round(sum(score_diffs) / max(len(score_diffs), 1), 6),
    }


# ── Main ─────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Evaluate spam classifier")
    parser.add_argument("--input", type=Path, required=True,
                        help="Test JSONL file with labeled emails")
    parser.add_argument("--weights", type=Path, default=None,
                        help="Weights JSON (default: ~/.lance/email/spam_classifier_weights.json)")
    parser.add_argument("--compare-rust", action="store_true",
                        help="Compare against Rust weights JSON")
    parser.add_argument("--rust-weights", type=Path, default=None,
                        help="Path to Rust weights JSON for --compare-rust")
    parser.add_argument("--report", action="store_true",
                        help="Write spam_eval_report.json alongside input file")
    parser.add_argument("--limit", type=int, default=None,
                        help="Limit number of test examples")
    parser.add_argument("--verbose", action="store_true",
                        help="Print per-example predictions")
    args = parser.parse_args()

    # Load test data
    if not args.input.exists():
        print(f"ERROR: Test file not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    entries = []
    with open(args.input) as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))

    if args.limit:
        entries = entries[:args.limit]

    print(f"Test examples: {len(entries)}")

    # Load weights
    if args.weights:
        weights_path = args.weights
    else:
        home = os.environ.get("HOME", ".")
        weights_path = Path(home) / ".lance" / "email" / "spam_classifier_weights.json"

    if not weights_path.exists():
        print(f"ERROR: Weights not found: {weights_path}", file=sys.stderr)
        print("Run distill_spam_classifier.py first.", file=sys.stderr)
        sys.exit(1)

    with open(weights_path) as f:
        weights_data = json.load(f)

    classifiers = weights_data["classifiers"]
    print(f"Weights: {weights_path}")
    print(f"Labels: {weights_data.get('labels', SPAM_CATEGORIES)}")
    print(f"Features: {weights_data.get('num_features', NUM_FEATURES)}")

    # Run predictions
    y_true = []
    y_pred = []

    for i, entry in enumerate(entries):
        features = extract_spam_features(entry)
        scores = predict_scores(features, classifiers)
        pred = predict_label(scores)

        y_true.append(entry["label"])
        y_pred.append(pred)

        if args.verbose:
            match = "ok" if pred == entry["label"] else "MISS"
            text_preview = (entry.get("text") or "")[:50]
            print(f"  [{i+1}] {match} pred={pred} true={entry['label']} {text_preview}...")

    # ── Results ────────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print("RESULTS")
    print(f"{'='*60}")

    # Overall accuracy
    n = len(y_true)
    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
    accuracy = correct / max(n, 1) * 100
    bar = "PASS" if accuracy >= 80 else "WARN" if accuracy >= 60 else "FAIL"
    print(f"\n  Overall accuracy: {correct}/{n} ({accuracy:.1f}%) [{bar}]")

    # Per-category metrics
    category_metrics = compute_per_category_metrics(y_true, y_pred)
    print(f"\n  {'Category':>20s}  {'Prec':>6s}  {'Rec':>6s}  {'F1':>6s}  {'N':>5s}")
    print(f"  {'-'*20}  {'-'*6}  {'-'*6}  {'-'*6}  {'-'*5}")
    for cat in SPAM_CATEGORIES:
        m = category_metrics[cat]
        print(f"  {cat:>20s}  {m['precision']:6.3f}  {m['recall']:6.3f}  {m['f1']:6.3f}  {m['support']:5d}")

    # Clean email FPR
    fpr_result = compute_clean_fpr(y_true, y_pred)
    bar = "PASS" if fpr_result["pass"] else "FAIL"
    print(f"\n  Clean email FPR: {fpr_result['clean_false_positives']}/{fpr_result['clean_total']} "
          f"({fpr_result['fpr_pct']:.1f}%) [{bar}]")
    if fpr_result["misclassified_as"]:
        print(f"    Misclassified as: {fpr_result['misclassified_as']}")

    # Threshold sweep (summary for top category only)
    print(f"\n  Threshold sweep (clean email precision/recall):")
    threshold_results = compute_threshold_sweep(entries, classifiers)
    clean_sweep = threshold_results.get("clean", [])
    print(f"    {'Thresh':>6s}  {'Prec':>6s}  {'Rec':>6s}  {'F1':>6s}")
    for tr in clean_sweep:
        print(f"    {tr['threshold']:6.1f}  {tr['precision']:6.3f}  {tr['recall']:6.3f}  {tr['f1']:6.3f}")

    # Per-provider calibration
    provider_ece = compute_ece(entries, classifiers)
    if provider_ece:
        print(f"\n  Per-provider ECE (Expected Calibration Error):")
        for provider, ece in sorted(provider_ece.items()):
            bar = "PASS" if ece < 0.1 else "WARN" if ece < 0.2 else "FAIL"
            print(f"    {provider:>20s}: {ece:.4f} [{bar}]")

    # AI detection AUC
    ai_result = compute_ai_detection_auc(entries, classifiers)
    if ai_result["auc"] >= 0:
        bar = "PASS" if ai_result["auc"] >= 0.9 else "WARN" if ai_result["auc"] >= 0.7 else "FAIL"
        print(f"\n  AI detection ROC AUC: {ai_result['auc']:.4f} [{bar}]")
        print(f"    AI emails: {ai_result['total_ai']}, Non-AI: {ai_result['total_non_ai']}")
    else:
        print(f"\n  AI detection: skipped (no AI-labeled examples)")

    # Compare Rust weights
    if args.compare_rust:
        rust_path = args.rust_weights
        if not rust_path:
            rust_path = Path("crates/metal/data/models/spam_classifier_weights.json")
        print(f"\n  Rust comparison ({rust_path}):")
        compare = compare_rust_weights(entries, classifiers, rust_path)
        if "error" in compare:
            print(f"    {compare['error']}")
        else:
            bar = "PASS" if compare["agreement_rate"] >= 0.95 else "WARN"
            print(f"    Agreement rate: {compare['agreement_rate']:.4f} ({compare['agreements']}/{compare['agreements'] + compare['disagreements']}) [{bar}]")
            print(f"    Max score diff: {compare['max_score_diff']:.6f}")
            print(f"    Mean score diff: {compare['mean_score_diff']:.6f}")

    # Write report if requested
    if args.report:
        report = {
            "n_examples": n,
            "accuracy": round(accuracy / 100, 4),
            "per_category": category_metrics,
            "clean_fpr": fpr_result,
            "ai_detection": ai_result,
            "provider_ece": provider_ece,
        }
        if args.compare_rust:
            report["rust_comparison"] = compare

        report_path = args.input.parent / "spam_eval_report.json"
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2)
        print(f"\nReport written to {report_path}")

    # Exit code based on clean FPR threshold
    if not fpr_result["pass"]:
        print(f"\nClean email FPR {fpr_result['fpr_pct']:.1f}% exceeds 5% threshold")
        sys.exit(1)
    print(f"\nClean email FPR {fpr_result['fpr_pct']:.1f}% meets 5% threshold")


if __name__ == "__main__":
    main()
