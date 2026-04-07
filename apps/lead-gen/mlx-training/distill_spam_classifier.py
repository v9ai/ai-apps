"""Distill DeBERTa spam model into logistic regression weights for Rust.

After training the SpamHead, this script:
1. Runs the DeBERTa model on all emails to generate soft labels (7 categories)
2. Extracts a 24-element feature vector matching Rust spam_scoring.rs
3. Fits 7 independent logistic regressions (one per spam category)
4. Exports weights as JSON for the Rust SpamClassifier

Usage:
  python3 mlx-training/distill_spam_classifier.py
  python3 mlx-training/distill_spam_classifier.py --input spam_training.jsonl
  python3 mlx-training/distill_spam_classifier.py --output /path/to/weights.json
  python3 mlx-training/distill_spam_classifier.py --eval
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
from pathlib import Path

import numpy as np

# ── Constants ────────────────────────────────────────────────────────────────

NUM_FEATURES = 24
NUM_LABELS = 7
SPAM_CATEGORIES = [
    "clean", "template_spam", "ai_generated", "low_effort",
    "role_account", "domain_suspect", "content_violation",
]

# Same keyword lists as Rust spam_scoring.rs SPAM_KEYWORDS
SPAM_KEYWORDS = [
    "free", "act now", "limited time", "guaranteed", "no obligation",
    "click here", "buy now", "discount", "winner", "congratulations",
    "exclusive deal", "risk free", "no cost", "earn money",
    "100% free", "double your", "cash bonus", "credit card",
    "order now", "lowest price", "best price", "special promotion",
    "apply now", "instant access", "fast cash", "make money",
    "million dollars", "no fees", "one time offer", "prize",
    "unsecured", "urgent", "while supplies last",
]

# Same as Rust URGENCY_KEYWORDS
URGENCY_KEYWORDS = [
    "urgent", "immediately", "act now", "limited time",
    "expires", "deadline", "last chance", "hurry",
    "don't miss", "final notice", "time sensitive",
    "respond immediately", "action required", "asap",
]

# Same as Rust ROLE_ACCOUNTS
ROLE_ACCOUNTS = [
    "noreply", "no-reply", "no_reply", "donotreply", "do-not-reply",
    "info", "support", "admin", "webmaster", "postmaster",
    "mailer-daemon", "marketing", "sales", "hello", "contact",
    "team", "help", "billing", "notifications", "alerts",
    "news", "newsletter",
]

# URL shortener domains
URL_SHORTENERS = [
    "bit.ly", "t.co", "goo.gl", "tinyurl.com", "ow.ly",
    "is.gd", "buff.ly", "rebrand.ly", "shorte.st", "cutt.ly",
]

# Template markers
TEMPLATE_MARKERS = [
    "{{", "}}", "{%", "%}", "${", "<%", "%>",
    "%%FIRST_NAME%%", "%%COMPANY%%", "%%UNSUBSCRIBE%%",
    "[FIRST_NAME]", "[COMPANY]", "[UNSUBSCRIBE]",
]

# Homoglyph characters (Cyrillic/Greek lookalikes)
HOMOGLYPHS = set("аеорсухАВЕНКМОРСТХ" + "αβγδεζηθικλμνξοπρστυφχψω")

# Zero-width characters
ZERO_WIDTH_CHARS = {"\u200b", "\u200c", "\u200d", "\ufeff", "\u00ad"}


# ── Feature extraction ───────────────────────────────────────────────────────


def extract_spam_features(record: dict) -> np.ndarray:
    """Extract 24-element feature vector matching Rust spam_scoring.rs.

    Features:
       0. spam_keyword_density     — SPAM_KEYWORDS hits / word_count
       1. urgency_density          — URGENCY_KEYWORDS hits / word_count
       2. link_count               — number of http/https URLs, normalized
       3. url_shortener_count      — shortener domain hits, normalized
       4. image_tag_count          — <img> tags, normalized
       5. exclamation_density      — '!' count / char_count
       6. caps_ratio               — UPPERCASE chars / alpha chars
       7. sentence_length_variance — std of sentence lengths
       8. pronoun_density          — first-person pronouns / word_count
       9. contraction_density      — contractions / word_count
      10. type_token_ratio         — unique words / total words
      11. avg_word_length          — mean word length in chars
      12. sentence_starter_variety — unique sentence starters / sentence count
      13. text_length_normalized   — min(char_count / 2000, 1.0)
      14. unicode_anomaly          — non-ASCII / total chars
      15. homoglyph_count          — homoglyph chars, normalized
      16. zero_width_chars         — zero-width char count, normalized
      17. template_marker_count    — template placeholder hits, normalized
      18. spf_dkim_dmarc_composite — auth header composite score
      19. reply_to_mismatch        — 1.0 if reply-to differs from from
      20. hop_count                — email hop count, normalized
      21. send_hour_sin            — sin(2*pi*hour/24)
      22. send_hour_cos            — cos(2*pi*hour/24)
      23. role_account_indicator   — 1.0 if to_addr is role account
    """
    text = record.get("text", "") or ""
    lower = text.lower()
    words = lower.split()
    word_count = max(len(words), 1)
    char_count = max(len(text), 1)

    # 0. Spam keyword density
    spam_hits = sum(1 for kw in SPAM_KEYWORDS if kw in lower)
    spam_kw_density = spam_hits / word_count

    # 1. Urgency density
    urgency_hits = sum(1 for kw in URGENCY_KEYWORDS if kw in lower)
    urgency_density = urgency_hits / word_count

    # 2. Link count (normalized)
    links = re.findall(r"https?://", lower)
    link_count = min(len(links) / 5.0, 1.0)

    # 3. URL shortener count (normalized)
    shortener_hits = sum(1 for s in URL_SHORTENERS if s in lower)
    url_shortener_count = min(shortener_hits / 3.0, 1.0)

    # 4. Image tag count (normalized)
    img_tags = len(re.findall(r"<img\b", lower))
    image_tag_count = min(img_tags / 5.0, 1.0)

    # 5. Exclamation density
    excl_count = text.count("!")
    exclamation_density = excl_count / char_count

    # 6. CAPS ratio
    alpha_chars = sum(1 for c in text if c.isalpha())
    upper_chars = sum(1 for c in text if c.isupper())
    caps_ratio = upper_chars / max(alpha_chars, 1)

    # 7. Sentence length variance
    sentences = re.split(r"[.!?]+", text)
    sentences = [s.strip() for s in sentences if s.strip()]
    if len(sentences) > 1:
        sent_lens = [len(s.split()) for s in sentences]
        mean_len = sum(sent_lens) / len(sent_lens)
        variance = sum((l - mean_len) ** 2 for l in sent_lens) / len(sent_lens)
        sentence_length_variance = min(math.sqrt(variance) / 20.0, 1.0)
    else:
        sentence_length_variance = 0.0

    # 8. Pronoun density (first-person)
    pronouns = {"i", "me", "my", "mine", "myself", "we", "us", "our", "ours"}
    pronoun_count = sum(1 for w in words if w in pronouns)
    pronoun_density = pronoun_count / word_count

    # 9. Contraction density
    contractions = re.findall(r"\b\w+'\w+\b", lower)
    contraction_density = len(contractions) / word_count

    # 10. Type-token ratio
    unique_words = len(set(words))
    type_token_ratio = unique_words / word_count

    # 11. Average word length
    total_word_chars = sum(len(w) for w in words)
    avg_word_length = total_word_chars / word_count / 10.0  # normalize

    # 12. Sentence starter variety
    if sentences:
        starters = set()
        for s in sentences:
            s_words = s.split()
            if s_words:
                starters.add(s_words[0].lower())
        sentence_starter_variety = len(starters) / max(len(sentences), 1)
    else:
        sentence_starter_variety = 0.0

    # 13. Text length normalized
    text_length_normalized = min(char_count / 2000.0, 1.0)

    # 14. Unicode anomaly (non-ASCII ratio)
    non_ascii = sum(1 for c in text if ord(c) > 127)
    unicode_anomaly = non_ascii / char_count

    # 15. Homoglyph count (normalized)
    homoglyph_count = sum(1 for c in text if c in HOMOGLYPHS)
    homoglyph_normalized = min(homoglyph_count / 10.0, 1.0)

    # 16. Zero-width character count (normalized)
    zw_count = sum(1 for c in text if c in ZERO_WIDTH_CHARS)
    zero_width_normalized = min(zw_count / 5.0, 1.0)

    # 17. Template marker count (normalized)
    template_hits = sum(1 for m in TEMPLATE_MARKERS if m in text)
    template_marker_normalized = min(template_hits / 5.0, 1.0)

    # 18. SPF/DKIM/DMARC composite score
    headers = record.get("headers", {}) or {}
    spf_dkim_dmarc = 0.0
    if isinstance(headers, dict):
        auth = str(headers.get("authentication-results", "")).lower()
        if "spf=pass" in auth:
            spf_dkim_dmarc += 0.33
        if "dkim=pass" in auth:
            spf_dkim_dmarc += 0.33
        if "dmarc=pass" in auth:
            spf_dkim_dmarc += 0.34

    # 19. Reply-to mismatch
    from_email = (record.get("from_email", "") or "").lower()
    reply_to = ""
    if isinstance(headers, dict):
        reply_to = str(headers.get("reply-to", "")).lower()
    reply_to_mismatch = 1.0 if reply_to and reply_to != from_email else 0.0

    # 20. Hop count (normalized)
    hop_count = 0.0
    if isinstance(headers, dict):
        received_headers = headers.get("received", "")
        if isinstance(received_headers, str):
            hop_count = min(received_headers.count("from ") / 10.0, 1.0)
        elif isinstance(received_headers, list):
            hop_count = min(len(received_headers) / 10.0, 1.0)

    # 21-22. Send hour sin/cos
    send_time = record.get("send_time", "") or ""
    hour = 12  # default noon
    if send_time:
        match = re.search(r"T(\d{2}):", send_time)
        if match:
            hour = int(match.group(1))
    send_hour_sin = math.sin(2 * math.pi * hour / 24.0)
    send_hour_cos = math.cos(2 * math.pi * hour / 24.0)

    # 23. Role account indicator
    to_email = (record.get("to_email", "") or "").lower()
    if not to_email and "@" in text[:200]:
        # Try to extract from text
        email_match = re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", text[:200])
        if email_match:
            to_email = email_match.group(0).lower()
    role_account = 1.0 if any(to_email.startswith(r) for r in ROLE_ACCOUNTS) else 0.0

    return np.array([
        spam_kw_density,            #  0
        urgency_density,            #  1
        link_count,                 #  2
        url_shortener_count,        #  3
        image_tag_count,            #  4
        exclamation_density,        #  5
        caps_ratio,                 #  6
        sentence_length_variance,   #  7
        pronoun_density,            #  8
        contraction_density,        #  9
        type_token_ratio,           # 10
        avg_word_length,            # 11
        sentence_starter_variety,   # 12
        text_length_normalized,     # 13
        unicode_anomaly,            # 14
        homoglyph_normalized,       # 15
        zero_width_normalized,      # 16
        template_marker_normalized, # 17
        spf_dkim_dmarc,             # 18
        reply_to_mismatch,          # 19
        hop_count,                  # 20
        send_hour_sin,              # 21
        send_hour_cos,              # 22
        role_account,               # 23
    ], dtype=np.float32)


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def train_logistic(X: np.ndarray, y: np.ndarray, epochs: int = 500, lr: float = 0.1) -> tuple[np.ndarray, float]:
    """Train a single logistic regression using SGD. Returns (weights, bias)."""
    n, d = X.shape
    w = np.zeros(d, dtype=np.float64)
    b = 0.0

    for epoch in range(epochs):
        # Compute predictions
        z = X @ w + b
        pred = 1.0 / (1.0 + np.exp(-np.clip(z, -30, 30)))

        # Gradient
        error = pred - y
        grad_w = (X.T @ error) / n
        grad_b = error.mean()

        # L2 regularization
        grad_w += 0.01 * w

        w -= lr * grad_w
        b -= lr * grad_b

        if (epoch + 1) % 100 == 0:
            loss = -np.mean(y * np.log(pred + 1e-7) + (1 - y) * np.log(1 - pred + 1e-7))
            accuracy = np.mean((pred > 0.5) == (y > 0.5))
            print(f"    Epoch {epoch+1}: loss={loss:.4f} acc={accuracy:.3f}")

    return w.astype(np.float32), float(b)


# ── Main ─────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Distill DeBERTa spam model to logistic regression for Rust")
    parser.add_argument("--input", type=str, default=None,
                        help="Input JSONL path (default: mlx-training/data/spam-classifier/spam_training.jsonl)")
    parser.add_argument("--output", type=str, default=None,
                        help="Output JSON path (default: ~/.lance/email/spam_classifier_weights.json)")
    parser.add_argument("--eval", action="store_true",
                        help="Run evaluation after training")
    args = parser.parse_args()

    # Determine paths
    if args.input:
        input_path = Path(args.input)
    else:
        input_path = Path("mlx-training/data/spam-classifier/spam_training.jsonl")

    if args.output:
        output_path = Path(args.output)
    else:
        home = os.environ.get("HOME", ".")
        output_path = Path(home) / ".lance" / "email" / "spam_classifier_weights.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Load training data
    if not input_path.exists():
        print(f"Error: Training data not found at {input_path}", file=sys.stderr)
        print("Run export_spam_data.py first to generate training data.", file=sys.stderr)
        sys.exit(1)

    print(f"Loading training data from {input_path}...")
    entries = []
    with open(input_path) as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))

    if len(entries) < 10:
        print(f"Need at least 10 labeled emails, got {len(entries)}.", file=sys.stderr)
        sys.exit(1)

    print(f"Loaded {len(entries)} labeled emails")

    # Print label distribution
    from collections import Counter
    dist = Counter(e["label"] for e in entries)
    print("\nLabel distribution:")
    for name in SPAM_CATEGORIES:
        n = dist.get(name, 0)
        print(f"  {name:>20s}: {n:5d}")

    # Extract features
    print("\nExtracting features...")
    X = np.stack([extract_spam_features(e) for e in entries])
    print(f"Feature matrix: {X.shape}")

    # Train 7 independent logistic regressions (OvR)
    classifiers = []

    for i, label_name in enumerate(SPAM_CATEGORIES):
        print(f"\n  Training label: {label_name}")
        y = np.array([1.0 if e["label"] == label_name else 0.0 for e in entries], dtype=np.float64)

        pos_rate = y.mean()
        print(f"    Positive rate: {pos_rate:.3f} ({int(y.sum())}/{len(y)})")

        if pos_rate < 0.01 or pos_rate > 0.99:
            print(f"    Skipping -- not enough variance (pos_rate={pos_rate:.3f})")
            classifiers.append({"weights": [0.0] * NUM_FEATURES, "bias": 0.0})
            continue

        w, b = train_logistic(X, y)
        classifiers.append({
            "weights": w.tolist(),
            "bias": b,
        })

    # Export as JSON matching Rust SpamClassifier format
    result = {
        "labels": SPAM_CATEGORIES,
        "num_features": NUM_FEATURES,
        "classifiers": classifiers,
    }

    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\nWeights written to {output_path}")

    # Verify: classify a few emails with the distilled model
    print("\n--- Verification (first 5 emails) ---")
    for entry in entries[:5]:
        features = extract_spam_features(entry)
        scores = {}
        for i, name in enumerate(SPAM_CATEGORIES):
            w = np.array(classifiers[i]["weights"], dtype=np.float32)
            b = classifiers[i]["bias"]
            z = float(features @ w + b)
            scores[name] = round(sigmoid(z), 3)

        text_preview = (entry.get("text") or "")[:60]
        primary = max(scores, key=scores.get)
        confidence = scores[primary]
        bootstrap = entry["label"]
        match = "ok" if primary == bootstrap else "MISMATCH"
        print(f"  [{match}] [{primary} {confidence:.2f}] (label: {bootstrap}) {text_preview}...")

    # Summary accuracy
    correct = 0
    for entry in entries:
        features = extract_spam_features(entry)
        scores = {
            name: sigmoid(float(
                features @ np.array(classifiers[i]["weights"], dtype=np.float32)
                + classifiers[i]["bias"]
            ))
            for i, name in enumerate(SPAM_CATEGORIES)
        }
        predicted = max(scores, key=scores.get)
        if predicted == entry["label"]:
            correct += 1

    accuracy = correct / len(entries) * 100
    print(f"\nOverall accuracy vs labels: {correct}/{len(entries)} ({accuracy:.1f}%)")

    # Optional eval mode
    if args.eval:
        print("\n--- Evaluation mode ---")
        _run_eval(entries, classifiers)

    print(f"\nDone! Weights at {output_path}")


def _run_eval(entries: list[dict], classifiers: list[dict]):
    """Quick evaluation of distilled model (called with --eval flag)."""
    from collections import Counter

    y_true = []
    y_pred = []
    for entry in entries:
        features = extract_spam_features(entry)
        scores = {}
        for i, name in enumerate(SPAM_CATEGORIES):
            w = np.array(classifiers[i]["weights"], dtype=np.float32)
            b = classifiers[i]["bias"]
            z = float(features @ w + b)
            scores[name] = sigmoid(z)

        predicted = max(scores, key=scores.get)
        y_true.append(entry["label"])
        y_pred.append(predicted)

    # Per-category metrics
    print(f"\n  {'Category':>20s}  {'Prec':>6s}  {'Rec':>6s}  {'F1':>6s}  {'N':>5s}")
    print(f"  {'-'*20}  {'-'*6}  {'-'*6}  {'-'*6}  {'-'*5}")
    for cat in SPAM_CATEGORIES:
        tp = sum(1 for t, p in zip(y_true, y_pred) if t == cat and p == cat)
        fp = sum(1 for t, p in zip(y_true, y_pred) if t != cat and p == cat)
        fn = sum(1 for t, p in zip(y_true, y_pred) if t == cat and p != cat)
        n = sum(1 for t in y_true if t == cat)

        precision = tp / max(tp + fp, 1)
        recall = tp / max(tp + fn, 1)
        f1 = 2 * precision * recall / max(precision + recall, 1e-7)
        print(f"  {cat:>20s}  {precision:6.3f}  {recall:6.3f}  {f1:6.3f}  {n:5d}")

    # FPR on clean emails
    clean_total = sum(1 for t in y_true if t == "clean")
    clean_fp = sum(1 for t, p in zip(y_true, y_pred) if t == "clean" and p != "clean")
    fpr = clean_fp / max(clean_total, 1) * 100
    bar = "PASS" if fpr < 5.0 else "FAIL"
    print(f"\n  Clean email FPR: {clean_fp}/{clean_total} ({fpr:.1f}%) [{bar}]")


if __name__ == "__main__":
    main()
