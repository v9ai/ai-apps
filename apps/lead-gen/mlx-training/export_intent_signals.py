"""Export intent signal training data as JSONL for MLX LoRA fine-tuning.

Sources (in priority order):
  1. Greenhouse JSON files (e.g., crates/ats/data/anthropic-jobs.json)
     — Rich job postings with structured fields (departments, offices, metadata)
  2. Neon PostgreSQL tables (company_snapshots, linkedin_posts, company_facts)

Usage:
  python3 mlx-training/export_intent_signals.py                         # all sources
  python3 mlx-training/export_intent_signals.py --task greenhouse       # Greenhouse JSON only
  python3 mlx-training/export_intent_signals.py --task neon             # Neon DB only
  python3 mlx-training/export_intent_signals.py --stats                 # counts only
  python3 mlx-training/export_intent_signals.py --greenhouse-dir crates/ats/data
"""

from __future__ import annotations

import argparse
import html as html_lib
import json
import os
import random
import re
import sys
from pathlib import Path

# ── Constants ────────────────────────────────────────────────────────────────

INTENT_SIGNAL_SYSTEM = (
    "You detect buying/hiring intent signals in B2B company content.\n"
    "Analyze the text and identify ALL relevant signals present.\n"
    'Return JSON: {"signals": [{"signal_type": "...", "confidence": 0.0-1.0, "evidence": ["..."], "decay_days": N}]}\n\n'
    "Signal types:\n"
    "- hiring_intent (decay: 30): Company is actively hiring, growing team, open positions\n"
    "- tech_adoption (decay: 60): Uses or adopts specific tech (PyTorch, CUDA, k8s, Rust, etc.)\n"
    "- growth_signal (decay: 45): Funding, revenue growth, expansion, new offices, M&A\n"
    "- budget_cycle (decay: 90): Budget planning, vendor evaluation, procurement, RFP\n"
    "- leadership_change (decay: 60): New executives, hiring for leadership, C-suite changes\n"
    "- product_launch (decay: 30): New product/feature, GA release, beta announcement\n\n"
    "IMPORTANT: A job posting ALWAYS has hiring_intent. Also look for:\n"
    "- Tech stack in requirements → tech_adoption\n"
    "- 'Quickly growing' / 'scaling' / funding mentions → growth_signal\n"
    "- VP/Director/Head-of titles being hired → leadership_change\n"
    "- New product/team being built → product_launch\n\n"
    'If no signals: {"signals": []}\n'
    "CRITICAL: Respond with ONLY a valid JSON object, no markdown."
)

SIGNAL_TYPES = [
    "hiring_intent",
    "tech_adoption",
    "growth_signal",
    "budget_cycle",
    "leadership_change",
    "product_launch",
]

DEFAULT_DECAY_DAYS = {
    "hiring_intent": 30,
    "tech_adoption": 60,
    "growth_signal": 45,
    "budget_cycle": 90,
    "leadership_change": 60,
    "product_launch": 30,
}

# ── Keyword lists per signal type ────────────────────────────────────────────
# Tuned for job postings AND general company content.

HIRING_KW = [
    "we're hiring", "we are hiring", "hiring for", "looking for",
    "open role", "open position", "join our team", "join us",
    "now hiring", "apply now", "expanding team", "new hires",
    "headcount", "growing our team", "building our team",
    "responsibilities", "you may be a good fit", "strong candidates",
    "about the role", "compensation", "annual salary",
]

TECH_KW = [
    "pytorch", "tensorflow", "jax", "cuda", "gpu cluster",
    "kubernetes", "docker", "mlops", "ci/cd pipeline",
    "distributed systems", "deep learning", "machine learning model",
    "llm", "large language model", "transformer architecture",
    "vector database", "rag pipeline", "fine-tuning",
    "data pipeline", "spark", "kafka", "terraform",
    "migrating to", "adopting", "new stack", "tech stack migration",
]

GROWTH_KW = [
    "quickly growing", "rapidly growing", "fast-growing",
    "raised $", "series a", "series b", "series c", "series d",
    "funding round", "revenue growth", "ipo", "pre-ipo",
    "acquisition", "acquired", "new office", "expanding to",
    "growth stage", "hypergrowth",
]

BUDGET_KW = [
    "q1 planning", "annual budget", "rfp", "vendor evaluation",
    "procurement", "new fiscal year", "budget approved",
    "evaluating solutions", "budget allocation", "cost optimization",
]

LEADERSHIP_KW = [
    "new cto", "new vp", "appointed", "joined as",
    "promoted to", "new head of", "welcome our new",
    "announcing our new", "engineering manager", "director",
    "vice president", "head of engineering", "chief",
    "principal engineer", "staff engineer", "tech lead",
]

PRODUCT_KW = [
    "launching a new", "introducing our", "announcing",
    "new product", "new feature release", "beta release",
    "ga release", "just shipped", "now available",
    "public preview", "new platform launch", "product launch",
]

KEYWORD_MAP = {
    "hiring_intent": HIRING_KW,
    "tech_adoption": TECH_KW,
    "growth_signal": GROWTH_KW,
    "budget_cycle": BUDGET_KW,
    "leadership_change": LEADERSHIP_KW,
    "product_launch": PRODUCT_KW,
}

# Department → signal type mapping for Greenhouse structured data
DEPT_SIGNAL_MAP = {
    "Sales": ["hiring_intent"],
    "Engineering": ["hiring_intent", "tech_adoption"],
    "AI Research": ["hiring_intent", "tech_adoption"],
    "Software Engineering": ["hiring_intent", "tech_adoption"],
    "Security": ["hiring_intent", "tech_adoption"],
    "Product Management": ["hiring_intent", "product_launch"],
    "Marketing": ["hiring_intent", "growth_signal"],
    "Finance": ["hiring_intent", "budget_cycle"],
    "People": ["hiring_intent", "growth_signal"],
    "Legal": ["hiring_intent"],
    "Data Science": ["hiring_intent", "tech_adoption"],
    "Compute": ["hiring_intent", "tech_adoption"],
}

# ── HTML handling ───────────────────────────────────────────────────────────

_TAG_RE = re.compile(r"<[^>]+>")
_ENTITY_RE = re.compile(r"&(?:#\d+|#x[\da-fA-F]+|\w+);")
_WS_RE = re.compile(r"\s+")


def strip_html(text: str | None) -> str:
    """Strip HTML tags and entities. Handles both raw HTML and HTML-escaped content."""
    if not text:
        return ""
    # First unescape HTML entities (&lt; → <, &amp; → &, etc.)
    text = html_lib.unescape(text)
    # Then strip actual HTML tags
    text = _TAG_RE.sub(" ", text)
    # Clean remaining entities
    text = _ENTITY_RE.sub(" ", text)
    text = _WS_RE.sub(" ", text)
    return text.strip()


# ── DB connection ────────────────────────────────────────────────────────────


def get_conn():
    url = os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        return None  # Allow running without DB (Greenhouse-only mode)
    try:
        import psycopg2
        return psycopg2.connect(url)
    except Exception as e:
        print(f"  WARNING: Cannot connect to Neon: {e}", file=sys.stderr)
        return None


# ── Bootstrap labeling ───────────────────────────────────────────────────────


def bootstrap_label(text: str, is_job_posting: bool = False,
                    structured_signals: dict | None = None) -> dict:
    """Generate intent signal labels from keyword matching + structured data.

    For job postings: hiring_intent is always present (confidence=0.95).
    Additional signals are detected from content + structured fields.
    """
    lower = text.lower()
    signals = []
    seen_types = set()

    # Job postings always have hiring_intent.
    # Confidence scales with explicit keyword density (range 0.75–0.97) to give the
    # model a real distribution to learn from instead of a constant spike at 0.95.
    if is_job_posting:
        hiring_hits = [kw for kw in HIRING_KW if kw in lower]
        base_conf = 0.75
        bonus = min(len(hiring_hits) * 0.04, 0.22)
        hiring_conf = round(base_conf + bonus, 2)
        signals.append({
            "signal_type": "hiring_intent",
            "confidence": hiring_conf,
            "evidence": (hiring_hits[:3] if hiring_hits else ["active job posting"]),
            "decay_days": 30,
        })
        seen_types.add("hiring_intent")

    # Structured signals from Greenhouse metadata
    if structured_signals:
        for sig_type, evidence_list in structured_signals.items():
            if sig_type not in seen_types and evidence_list:
                signals.append({
                    "signal_type": sig_type,
                    "confidence": 0.85,
                    "evidence": evidence_list[:3],
                    "decay_days": DEFAULT_DECAY_DAYS[sig_type],
                })
                seen_types.add(sig_type)

    # Keyword-based signals
    for signal_type, keywords in KEYWORD_MAP.items():
        if signal_type in seen_types:
            continue
        hits = [kw for kw in keywords if kw in lower]
        # Hiring is already added above for job postings; other signals need 2+ hits
        threshold = 2
        if len(hits) >= threshold:
            confidence = min(len(hits) / max(len(keywords) * 0.3, 1), 1.0)
            signals.append({
                "signal_type": signal_type,
                "confidence": round(confidence, 2),
                "evidence": hits[:3],
                "decay_days": DEFAULT_DECAY_DAYS[signal_type],
            })

    return {"signals": signals}


# ── Greenhouse JSON ingestion ─────────────────────────────────────────────────


def extract_structured_signals(job: dict) -> dict[str, list[str]]:
    """Extract structured intent signals from Greenhouse job metadata."""
    signals: dict[str, list[str]] = {}

    # Department → signal type
    for dept in job.get("departments", []):
        dept_name = dept.get("name", "")
        for prefix, sig_types in DEPT_SIGNAL_MAP.items():
            if prefix.lower() in dept_name.lower():
                for st in sig_types:
                    signals.setdefault(st, []).append(f"department: {dept_name}")
                break

    # Title-based signals
    title = job.get("title", "").lower()
    if any(kw in title for kw in ["director", "vp", "head of", "chief", "manager", "lead"]):
        signals.setdefault("leadership_change", []).append(f"hiring for: {job['title']}")
    if any(kw in title for kw in ["engineer", "scientist", "ml", "ai", "data"]):
        signals.setdefault("tech_adoption", []).append(f"technical role: {job['title']}")

    # Location metadata
    for meta in job.get("metadata", []):
        if meta.get("name") == "Location Type" and meta.get("value") == "Remote":
            signals.setdefault("growth_signal", []).append("remote position available")

    # Multi-location = expansion signal
    offices = job.get("offices", [])
    if len(offices) > 2:
        office_names = [o["name"] for o in offices[:3]]
        signals.setdefault("growth_signal", []).append(
            f"multi-office presence: {', '.join(office_names)}"
        )

    return signals


def load_greenhouse_jobs(greenhouse_dir: Path) -> list[dict]:
    """Load and process Greenhouse JSON job files into training items."""
    items = []
    json_files = sorted(greenhouse_dir.glob("*-jobs.json")) + sorted(greenhouse_dir.glob("*_jobs.json"))

    if not json_files:
        # Also try direct JSON files
        json_files = sorted(greenhouse_dir.glob("*.json"))

    for json_file in json_files:
        try:
            with open(json_file) as f:
                jobs = json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"  WARNING: Skipping {json_file}: {e}", file=sys.stderr)
            continue

        if not isinstance(jobs, list):
            continue

        company_name = json_file.stem.replace("-jobs", "").replace("_jobs", "").replace("-", " ").title()

        for job in jobs:
            content = job.get("content", "")
            title = job.get("title", "")
            if not content or len(content) < 100:
                continue

            # Build rich text from structured + content
            text_parts = [f"Job Title: {title}"]

            location = job.get("location", {}).get("name", "")
            if location:
                text_parts.append(f"Location: {location}")

            for dept in job.get("departments", []):
                text_parts.append(f"Department: {dept['name']}")

            text_parts.append(f"\n{strip_html(content)}")
            full_text = "\n".join(text_parts)

            # Extract structured signals from metadata
            structured = extract_structured_signals(job)

            items.append({
                "id": job.get("id", 0),
                "text": full_text,
                "company": company_name,
                "source_type": "job_posting",
                "is_job_posting": True,
                "structured_signals": structured,
                "title": title,
                "department": job.get("departments", [{}])[0].get("name", ""),
            })

    return items


# ── Neon DB sources ──────────────────────────────────────────────────────────


def fetch_snapshots(conn) -> list[dict]:
    cur = conn.cursor()
    cur.execute("""
        SELECT cs.id, cs.text_sample, c.name
        FROM company_snapshots cs
        LEFT JOIN companies c ON cs.company_id = c.id
        WHERE cs.text_sample IS NOT NULL
          AND length(cs.text_sample) > 50
        ORDER BY cs.id
    """)
    rows = cur.fetchall()
    cur.close()
    return [{"id": r[0], "text": r[1], "company": r[2],
             "source_type": "company_snapshot", "is_job_posting": False} for r in rows]


def fetch_posts(conn) -> list[dict]:
    cur = conn.cursor()
    cur.execute("""
        SELECT lp.id, lp.content, c.name
        FROM linkedin_posts lp
        LEFT JOIN companies c ON lp.company_id = c.id
        WHERE lp.content IS NOT NULL
          AND length(lp.content) > 50
        ORDER BY lp.id
    """)
    rows = cur.fetchall()
    cur.close()
    return [{"id": r[0], "text": r[1], "company": r[2],
             "source_type": "linkedin_post", "is_job_posting": False} for r in rows]


def fetch_facts(conn) -> list[dict]:
    cur = conn.cursor()
    cur.execute("""
        SELECT cf.id, cf.value_text, c.name
        FROM company_facts cf
        LEFT JOIN companies c ON cf.company_id = c.id
        WHERE cf.field IN ('description', 'services')
          AND cf.value_text IS NOT NULL
          AND length(cf.value_text) > 50
        ORDER BY cf.id
    """)
    rows = cur.fetchall()
    cur.close()
    return [{"id": r[0], "text": r[1], "company": r[2],
             "source_type": "company_fact", "is_job_posting": False} for r in rows]


# ── Negative examples ────────────────────────────────────────────────────────

NEGATIVE_TEMPLATES = [
    # Original 8 (boilerplate / HR disclaimers)
    "About Anthropic: Anthropic is a public benefit corporation headquartered in San Francisco. "
    "We offer competitive compensation and benefits, optional equity donation matching, "
    "generous vacation and parental leave, flexible working hours.",

    "We encourage you to apply even if you do not believe you meet every single qualification. "
    "Not all strong candidates will meet every single qualification as listed.",

    "We believe that the highest-impact AI research will be big science. At Anthropic we work "
    "as a single cohesive team on just a few large-scale research efforts.",

    "The easiest way to understand our research directions is to read our recent research. "
    "This research continues many of the directions our team worked on prior to Anthropic.",

    "Education requirements: We require at least a Bachelor's degree in a related field "
    "or equivalent experience.",

    "Your safety matters to us. To protect yourself from potential scams, remember that "
    "recruiters only contact you from official email addresses.",

    "We do sponsor visas. However, we are not able to successfully sponsor visas for "
    "every role and every candidate.",

    "Currently, we expect all staff to be in one of our offices at least 25% of the time. "
    "However, some roles may require more time in our offices.",

    # Legal / privacy boilerplate
    "Privacy Policy. We collect information you provide directly to us, such as when you create "
    "an account or contact us for support. We may share your information with third-party vendors "
    "who assist us in operating our website and conducting our business.",

    "Terms of Service. By accessing this website, you agree to be bound by these Terms and "
    "Conditions of Use. If you disagree with any part of these terms, you may not access the website.",

    "Cookie Policy. We use cookies and similar tracking technologies to track the activity on "
    "our Service and hold certain information to improve your experience.",

    "All rights reserved. No part of this website may be reproduced, distributed, or transmitted "
    "in any form or by any means without the prior written permission of the publisher.",

    # Generic company marketing (no forward-looking signals)
    "We are committed to delivering exceptional value to our customers through innovative solutions "
    "and dedicated service excellence across all touchpoints.",

    "Our mission is to empower organizations worldwide with the tools and insights they need to "
    "succeed in an increasingly competitive market.",

    "Thank you for your interest. Please fill out the form below and a member of our team will "
    "be in touch within two business days.",

    "Our company was founded in 2010 with a focus on delivering reliable enterprise solutions "
    "to mid-market companies across North America.",

    "We serve customers across 30 countries and are proud of our track record of customer "
    "satisfaction, consistently scoring above 90% on annual NPS surveys.",

    "Our platform helps businesses streamline their operations and improve efficiency across "
    "departments, from finance to customer success.",

    # Static team/about pages (leadership mentions without change signal)
    "Meet the team. Our leadership team brings decades of experience across enterprise software, "
    "finance, and operations. Each member joined with a mission to build something lasting.",

    "John Smith, Chief Executive Officer. John has over 20 years of experience in enterprise "
    "software. Before joining, he held roles at Oracle and SAP.",

    "About us. We are a team of 200 passionate professionals dedicated to transforming the way "
    "businesses manage their data assets.",

    "Our values: integrity, collaboration, innovation, and customer focus guide everything "
    "we do and every decision we make as an organization.",

    "Company history. Founded in 2005, we have grown steadily to serve over 5,000 enterprise "
    "customers worldwide, maintaining profitability every year since 2009.",

    # Old news / past-tense press items (no live signal)
    "The company announced record Q4 earnings last year, with revenue up 12% year-over-year, "
    "driven by strong performance in the EMEA region.",

    "In 2022, the company completed its acquisition of a regional competitor, expanding its "
    "geographic footprint into the Southeast Asian market.",

    "The annual company retreat took place last month in Austin, where teams aligned on "
    "objectives that had been set during the prior year planning cycle.",

    # Support / documentation pages
    "To reset your password, click Forgot password on the login page and follow the "
    "instructions sent to your registered email address.",

    "System status: All systems operational. Scheduled maintenance window: Sunday 2am-4am UTC. "
    "No action required from users.",

    "API documentation. Authentication: include your API key as a Bearer token in the "
    "Authorization header of every request.",

    "Release notes v2.3.1: fixed a bug where users could not export reports in Safari. "
    "Minor UI improvements to the dashboard sidebar.",
]

# Hard negatives: texts that contain signal-adjacent language but carry NO live intent signal.
# These teach the model the critical distinction between past/stable state and forward-looking signal.
HARD_NEGATIVE_TEMPLATES = [
    # Hiring language but role is closed / historical
    "We hired 50 engineers last year as part of our growth initiative. The team is now fully "
    "staffed and we are focused on execution for the remainder of the fiscal year.",

    "Our recruiting team worked hard throughout 2023 to fill critical roles across engineering "
    "and product. We are proud of the team we built and the culture we have maintained.",

    "The position has been filled. Thank you to all applicants for their interest in joining "
    "our team. We will keep your resume on file for future opportunities.",

    "We are not currently accepting applications for this role. Please check back later or "
    "subscribe to our talent community to be notified of future openings.",

    "Last year we expanded our team by 30%, adding headcount across sales, engineering, and "
    "customer success. Our current headcount sits at approximately 400 employees.",

    # Tech stack mentioned but it is stable legacy usage, not adoption
    "Our platform is built on PyTorch and Kubernetes, technologies we have relied on "
    "since 2019 and that continue to serve our production workloads reliably.",

    "We use standard machine learning infrastructure including TensorFlow and Docker for "
    "containerization, which has been in place for several years.",

    "Our existing data pipeline uses Kafka and Spark, which have served us well for high-"
    "throughput streaming workloads since the platform launch.",

    "The engineering team uses Terraform for infrastructure management and has done so for "
    "the past four years. Our CI/CD pipeline is mature and stable.",

    # Funding mentioned but it is old news
    "In 2020 we raised a Series B round led by Sequoia Capital. Those funds were deployed "
    "over three years to build out our core platform and expand the team.",

    "Our last funding round closed three years ago. Since then we have been focused on "
    "reaching profitability, which we achieved in Q2 of last year.",

    "The company has been profitable since 2018 and has not required external funding. "
    "We grow organically from revenue and maintain a conservative balance sheet.",

    # Leadership bios without change signal
    "Jane Doe, VP of Engineering. Jane joined the company five years ago as a senior engineer "
    "and has led the engineering organization since 2021.",

    "Our CTO has been with the company since its founding and brings deep expertise in "
    "distributed systems and large-scale infrastructure.",

    "The executive team has remained stable for the past three years, with low turnover "
    "reflecting the strong culture and long-term orientation of the business.",

    # Product mentions but mature / old releases
    "Our flagship product, launched in 2018, serves over 10,000 enterprise customers globally "
    "and generates the majority of company revenue.",

    "Version 3.0 was released two years ago. We continue to support it with security patches "
    "and minor updates while the team works on the long-term roadmap.",

    "The platform has been generally available since 2019. Customers can access it via web, "
    "mobile, and API. Documentation is available at docs.example.com.",

    # Growth language that is historical or aspirational without evidence
    "Looking back on 2024, we saw strong revenue growth. We are grateful to our customers "
    "and team for making it a record year.",

    "The company has expanded steadily over the past decade, growing from 10 to 500 employees "
    "through disciplined hiring and organic demand.",

    "We have offices in New York, London, and Singapore, which we opened between 2015 and 2020 "
    "to serve our growing international customer base.",
]


def generate_negatives(count: int) -> list[dict]:
    """Generate diverse negative examples (boilerplate / no-signal text)."""
    items = []
    pool = list(NEGATIVE_TEMPLATES)
    random.shuffle(pool)
    _companies = ["Generic Co", "Acme Corp", "Example Inc", "TechCorp", "Enterprise LLC"]
    _suffixes = ["", " Learn more.", " Contact us today.", " Read the full report."]
    for i in range(count):
        template = pool[i % len(pool)]
        suffix = _suffixes[i % len(_suffixes)]
        items.append({
            "id": f"neg_{i}",
            "text": template + suffix,
            "company": _companies[i % len(_companies)],
            "source_type": "boilerplate",
            "is_job_posting": False,
        })
    return items


def generate_hard_negatives(count: int) -> list[dict]:
    """Generate hard negative examples: signal-adjacent language without live intent signal."""
    items = []
    pool = list(HARD_NEGATIVE_TEMPLATES)
    random.shuffle(pool)
    _companies = ["Mature Corp", "StableTech", "OldGuard Inc", "Legacy Co", "Established LLC"]
    for i in range(count):
        template = pool[i % len(pool)]
        items.append({
            "id": f"hard_neg_{i}",
            "text": template,
            "company": _companies[i % len(_companies)],
            "source_type": "hard_negative",
            "is_job_posting": False,
        })
    return items


# ── Label validation (diagnostic, does not affect training data) ─────────────


def validate_labels(items: list[dict], sample_size: int = 60) -> None:
    """Spot-check bootstrap labels and surface obvious errors or false positives.

    Checks:
    - Job postings must always get hiring_intent.
    - Hard negatives must never get any signal (keyword leakage check).
    - Boilerplate must not receive tech_adoption (TECH_KW contamination check).
    """
    random.seed(0)
    sample = random.sample(items, min(sample_size, len(items)))
    issues: list[str] = []

    for item in sample:
        label = bootstrap_label(
            item["text"],
            is_job_posting=item.get("is_job_posting", False),
            structured_signals=item.get("structured_signals"),
        )
        signals = label["signals"]
        sig_types = {s["signal_type"] for s in signals}

        # Job posting must have hiring_intent
        if item.get("is_job_posting") and "hiring_intent" not in sig_types:
            issues.append(f"[MISSING hiring_intent on job] {item.get('title','?')[:60]}")

        # Hard negatives must have zero signals
        if item["source_type"] == "hard_negative" and signals:
            leaked = ", ".join(sig_types)
            issues.append(
                f"[HARD NEG leaked signal(s) {leaked}] {item['text'][:80]}"
            )

        # Boilerplate must not get tech_adoption
        if item["source_type"] == "boilerplate" and "tech_adoption" in sig_types:
            issues.append(f"[FALSE tech_adoption on boilerplate] {item['text'][:80]}")

    if issues:
        print(f"\n  Label validation: {len(issues)} issue(s) in {len(sample)} sampled examples:")
        for iss in issues[:20]:
            print(f"    {iss}")
        if len(issues) > 20:
            print(f"    ... and {len(issues) - 20} more")
    else:
        print(f"  Label validation: no issues in {len(sample)} sampled examples.")


# ── Format and export ────────────────────────────────────────────────────────


def format_example(item: dict, label: dict) -> dict:
    """Format a single example as chat JSONL with system/user/assistant messages.

    Truncation strategy:
    - Job postings: preserve the structured header (title/location/dept) and take
      the first 1200 chars of the body, capped at 1800 total. The signal-rich content
      (responsibilities, requirements) appears early; EEO/benefits boilerplate at the
      end is noise.
    - All other sources: first 1200 chars.
    Shorter context = faster training (quadratic attention cost) and less dilution by
    boilerplate at the tail of long postings.
    """
    raw = item["text"]
    if item.get("is_job_posting"):
        lines = raw.split("\n")
        header = "\n".join(ln for ln in lines[:4] if ln.strip())
        body_start = raw.find("\n\n")
        body = raw[body_start:body_start + 1200].strip() if body_start != -1 else raw[:1200]
        text_clean = (header + "\n\n" + body)[:1800]
    else:
        text_clean = raw[:1200]

    company = item.get("company") or "Unknown"
    source_type = item["source_type"]

    user_msg = (
        f"Detect intent signals in this B2B content.\n\n"
        f"Source: {source_type}\n"
        f"Company: {company}\n"
        f"Content: {text_clean}"
    )

    return {
        "messages": [
            {"role": "system", "content": INTENT_SIGNAL_SYSTEM},
            {"role": "user", "content": user_msg},
            {"role": "assistant", "content": json.dumps(label)},
        ]
    }


def export_data(items: list[dict], out_dir: Path, stats_only: bool = False):
    """Label items and export to train/valid/test JSONL files."""
    if stats_only:
        print(f"  Total items: {len(items)}")
        by_source = {}
        for item in items:
            src = item["source_type"]
            by_source[src] = by_source.get(src, 0) + 1
        for src, count in sorted(by_source.items()):
            print(f"    {src}: {count}")

        # Show bootstrap label distribution
        pos_counts = {s: 0 for s in SIGNAL_TYPES}
        multi_signal = 0
        for item in items:
            label = bootstrap_label(
                item["text"],
                is_job_posting=item.get("is_job_posting", False),
                structured_signals=item.get("structured_signals"),
            )
            sigs = label["signals"]
            if len(sigs) > 1:
                multi_signal += 1
            for sig in sigs:
                pos_counts[sig["signal_type"]] += 1

        print("  Bootstrap label distribution:")
        for sig_type, count in pos_counts.items():
            pct = count / max(len(items), 1) * 100
            print(f"    {sig_type}: {count} ({pct:.1f}%)")
        print(f"    multi-signal examples: {multi_signal} ({multi_signal/max(len(items),1)*100:.1f}%)")
        return

    # Label all items
    examples = []
    for item in items:
        label = bootstrap_label(
            item["text"],
            is_job_posting=item.get("is_job_posting", False),
            structured_signals=item.get("structured_signals"),
        )
        example = format_example(item, label)
        # Stash company for split logic; removed before writing
        example["_company"] = item.get("company") or "Unknown"
        examples.append(example)

    if not examples:
        print("  No examples to export.")
        return

    # Company-stratified 80/10/10 split.
    # Splitting by company (not by random example) prevents the same company's boilerplate
    # from appearing in both train and valid, making val loss an honest generalization signal.
    # Negatives/hard-negatives (no real company) fall into their own bucket and are split 80/10/10
    # independently to preserve balance.
    random.seed(42)
    from collections import defaultdict

    synthetic_sources = {"boilerplate", "hard_negative"}
    real_by_company: dict[str, list] = defaultdict(list)
    synthetic_examples: list = []

    for ex in examples:
        if ex["_company"] in {"Generic Co", "Acme Corp", "Example Inc", "TechCorp",
                               "Enterprise LLC", "Mature Corp", "StableTech", "OldGuard Inc",
                               "Legacy Co", "Established LLC", "Unknown"}:
            # Check source_type instead (messages[1] contains source_type in user content)
            user_content = ex["messages"][1]["content"]
            is_synthetic = any(f"Source: {s}" in user_content for s in synthetic_sources)
            if is_synthetic:
                synthetic_examples.append(ex)
                continue
        real_by_company[ex["_company"]].append(ex)

    companies = list(real_by_company.keys())
    random.shuffle(companies)
    n_co = len(companies)
    train_cos = set(companies[:int(n_co * 0.8)])
    valid_cos = set(companies[int(n_co * 0.8):int(n_co * 0.9)])

    train, valid, test = [], [], []
    for co, exs in real_by_company.items():
        if co in train_cos:
            train.extend(exs)
        elif co in valid_cos:
            valid.extend(exs)
        else:
            test.extend(exs)

    # Split synthetic examples 80/10/10
    random.shuffle(synthetic_examples)
    n_syn = len(synthetic_examples)
    syn_train_end = int(n_syn * 0.8)
    syn_valid_end = int(n_syn * 0.9)
    train.extend(synthetic_examples[:syn_train_end])
    valid.extend(synthetic_examples[syn_train_end:syn_valid_end])
    test.extend(synthetic_examples[syn_valid_end:])

    # Remove temp key and shuffle
    for ex in train + valid + test:
        ex.pop("_company", None)
    random.shuffle(train)
    random.shuffle(valid)
    random.shuffle(test)

    out_dir.mkdir(parents=True, exist_ok=True)
    for name, subset in [("train", train), ("valid", valid), ("test", test)]:
        path = out_dir / f"{name}.jsonl"
        with open(path, "w") as f:
            for ex in subset:
                f.write(json.dumps(ex) + "\n")
        print(f"  {name}: {len(subset)} examples -> {path}")

    # Print signal distribution in train set
    print(f"\n  Train set signal distribution:")
    train_counts = {s: 0 for s in SIGNAL_TYPES}
    for ex in train:
        for sig in json.loads(ex["messages"][-1]["content"])["signals"]:
            train_counts[sig["signal_type"]] += 1
    for sig_type, count in train_counts.items():
        print(f"    {sig_type}: {count}")


# ── Main ─────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="Export intent signal training data for MLX LoRA fine-tuning"
    )
    parser.add_argument(
        "--task",
        choices=["greenhouse", "neon", "all"],
        default="all",
        help="Data source: greenhouse (local JSON), neon (PostgreSQL), or all",
    )
    parser.add_argument("--stats", action="store_true", help="Print counts only")
    parser.add_argument(
        "--out-dir", type=Path, default=Path("mlx-training/data/intent-signal")
    )
    parser.add_argument(
        "--greenhouse-dir",
        type=Path,
        default=Path("crates/ats/data"),
        help="Directory containing *-jobs.json Greenhouse files",
    )
    parser.add_argument(
        "--negatives",
        type=int,
        default=150,
        help="Number of diverse negative (boilerplate/no-signal) examples to generate",
    )
    parser.add_argument(
        "--hard-negatives",
        type=int,
        default=60,
        help="Number of hard negative examples (signal-adjacent language, no live signal)",
    )
    parser.add_argument(
        "--validate-labels",
        action="store_true",
        help="Spot-check bootstrap labels for obvious errors before exporting",
    )
    args = parser.parse_args()

    items: list[dict] = []

    # ── Greenhouse JSON (primary source) ──────────────────────────
    if args.task in ("greenhouse", "all"):
        print("Greenhouse JSON:")
        if args.greenhouse_dir.exists():
            gh_items = load_greenhouse_jobs(args.greenhouse_dir)
            print(f"  Loaded {len(gh_items)} job postings from {args.greenhouse_dir}")
            items.extend(gh_items)
        else:
            print(f"  Directory not found: {args.greenhouse_dir}")

    # ── Neon DB ────────────────────────────────────────────────────
    if args.task in ("neon", "all"):
        print("Neon PostgreSQL:")
        conn = get_conn()
        if conn:
            try:
                snapshots = fetch_snapshots(conn)
                posts = fetch_posts(conn)
                facts = fetch_facts(conn)
                print(f"  Snapshots: {len(snapshots)}, Posts: {len(posts)}, Facts: {len(facts)}")
                items.extend(snapshots)
                items.extend(posts)
                items.extend(facts)
            finally:
                conn.close()
        else:
            print("  Skipped (no database connection)")

    # ── Negative examples ─────────────────────────────────────────
    if args.negatives > 0:
        neg_items = generate_negatives(args.negatives)
        print(f"Negative examples: {len(neg_items)}")
        items.extend(neg_items)

    # ── Hard negative examples ────────────────────────────────────
    if args.hard_negatives > 0:
        hard_neg_items = generate_hard_negatives(args.hard_negatives)
        print(f"Hard negative examples: {len(hard_neg_items)}")
        items.extend(hard_neg_items)

    if not items:
        print("No data found.", file=sys.stderr)
        sys.exit(1)

    print(f"\nTotal items: {len(items)}")

    if args.validate_labels:
        print("\nLabel validation:")
        validate_labels(items)

    export_data(items, args.out_dir, args.stats)

    if not args.stats:
        print(f"\nDone. Training data in {args.out_dir}/")


if __name__ == "__main__":
    main()
