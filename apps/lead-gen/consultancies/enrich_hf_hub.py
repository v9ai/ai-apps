"""
HuggingFace Hub Deep Search — Company Enrichment via HF Presence
================================================================
Uses the HuggingFace Hub API as a **signal source** for company AI sophistication.
Companies that publish models, datasets, and Spaces on HF are strong AI-native signals.

Usage:
    python enrich_hf_hub.py                    # Enrich all unenriched companies
    python enrich_hf_hub.py --dry-run          # Print results only
    python enrich_hf_hub.py --limit 10         # Process first N
    python enrich_hf_hub.py --company "Hugging Face"  # Single company lookup
"""

from __future__ import annotations

import argparse
import json
import logging
import math
import os
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
from huggingface_hub import HfApi, ModelInfo, DatasetInfo, SpaceInfo

load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

LOG_FMT = "%(asctime)s [%(levelname)s] %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FMT)
log = logging.getLogger("enrich-hf-hub")

RATE_LIMIT_DELAY = 1.0  # seconds between HF API calls


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class HFOrgSignals:
    """Signals extracted from a HuggingFace organization."""
    org_name: str = ""
    resolved_via: str = ""  # domain, name, github, search
    model_count: int = 0
    dataset_count: int = 0
    space_count: int = 0
    total_downloads: int = 0
    total_likes: int = 0
    task_diversity: list[str] = field(default_factory=list)
    last_modified: str = ""  # ISO timestamp
    paper_count: int = 0
    model_sizes: list[str] = field(default_factory=list)  # parameter count labels
    top_models: list[dict] = field(default_factory=list)  # top 5 by downloads


@dataclass
class CompanyRecord:
    """Company loaded from Neon for HF enrichment."""
    id: int
    key: str
    name: str
    website: str
    canonical_domain: str
    github_url: str = ""
    # HF results
    hf_signals: HFOrgSignals | None = None
    hf_presence_score: float = 0.0
    hf_score_reasons: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Org name resolution
# ---------------------------------------------------------------------------

def _normalize_name(name: str) -> list[str]:
    """Generate candidate HF org names from a company name."""
    candidates = []
    clean = name.strip()

    # Lowercase, strip common suffixes
    lower = clean.lower()
    for suffix in (" inc", " inc.", " ltd", " ltd.", " llc", " gmbh",
                   " co.", " co", " corp", " corp.", " ai", " labs",
                   " technologies", " technology", " software"):
        if lower.endswith(suffix):
            lower = lower[: -len(suffix)].strip()

    # kebab-case
    kebab = re.sub(r"[^a-z0-9]+", "-", lower).strip("-")
    candidates.append(kebab)

    # no separator (always include — HF orgs often use this form)
    no_sep = re.sub(r"[^a-z0-9]", "", lower)
    candidates.append(no_sep)

    # with -ai suffix
    if not kebab.endswith("-ai"):
        candidates.append(f"{kebab}-ai")
        candidates.append(f"{no_sep}ai")

    # Common HF org naming patterns
    candidates.append(f"{no_sep}forai")     # CohereForAI
    candidates.append(f"{kebab}-for-ai")
    candidates.append(f"{no_sep}labs")      # CohereLabs
    candidates.append(f"{kebab}-labs")
    candidates.append(f"{no_sep}-hf")
    candidates.append(f"{no_sep}research")  # GoogleResearch-style

    # Original casing (some orgs use PascalCase)
    pascal = re.sub(r"[^a-zA-Z0-9]", "", clean)
    if pascal.lower() not in [c.lower() for c in candidates]:
        candidates.append(pascal)

    return list(dict.fromkeys(candidates))  # dedupe preserving order


def _domain_to_org(domain: str) -> list[str]:
    """Extract candidate org names from a domain."""
    if not domain:
        return []
    # strip www
    d = domain.lower().replace("www.", "")
    # Remove TLD
    parts = d.split(".")
    if len(parts) >= 2:
        base = parts[0]
        # explosion.ai -> explosion
        return [base]
    return []


def _github_to_org(github_url: str) -> list[str]:
    """Extract org name from GitHub URL."""
    if not github_url:
        return []
    parsed = urlparse(github_url)
    parts = parsed.path.strip("/").split("/")
    if parts and parts[0]:
        return [parts[0].lower()]
    return []


def resolve_hf_org(api: HfApi, company: CompanyRecord) -> str | None:
    """Multi-step resolution of company → HF org name.

    Tries:
    1. Domain-derived names
    2. Normalized company name variants
    3. GitHub handle cross-reference
    4. HF search fallback
    """
    # Collect all candidates (ordered by confidence)
    candidates = []
    candidates.extend(_domain_to_org(company.canonical_domain))
    candidates.extend(_normalize_name(company.name))
    candidates.extend(_github_to_org(company.github_url))

    # Dedupe
    seen = set()
    unique = []
    for c in candidates:
        if c.lower() not in seen:
            seen.add(c.lower())
            unique.append(c)

    # Try each candidate — check if org exists by listing models
    for candidate in unique[:12]:  # limit attempts
        try:
            models = list(api.list_models(author=candidate, limit=1))
            if models:
                log.debug(f"  Resolved {company.name} → HF org '{candidate}' (direct)")
                return candidate
            time.sleep(0.3)
        except Exception:
            continue

    # Fallback: search HF for company name
    try:
        models = list(api.list_models(search=company.name, limit=10))
        if models:
            # Group by author, pick most common
            # Extract author from model ID (e.g. "CohereLabs/model" → "CohereLabs")
            authors: dict[str, int] = {}
            for m in models:
                author = m.author or ""
                if not author and m.id and "/" in m.id:
                    author = m.id.split("/")[0]
                if author:
                    authors[author] = authors.get(author, 0) + 1
            if authors:
                best = max(authors, key=authors.get)
                # Verify it's plausibly this company (fuzzy match)
                name_lower = company.name.lower().replace(" ", "")
                best_lower = best.lower().replace("-", "").replace("_", "")
                if (name_lower in best_lower or best_lower in name_lower
                        or _jaccard_sim(name_lower, best_lower) > 0.4):
                    log.debug(f"  Resolved {company.name} → HF org '{best}' (search)")
                    return best
    except Exception:
        pass

    return None


def _jaccard_sim(a: str, b: str) -> float:
    """Character-level Jaccard similarity."""
    sa, sb = set(a), set(b)
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


# ---------------------------------------------------------------------------
# Signal extraction
# ---------------------------------------------------------------------------

def extract_signals(api: HfApi, org: str) -> HFOrgSignals:
    """Query HF Hub API for all signals from an org."""
    signals = HFOrgSignals(org_name=org)

    # Models
    try:
        models = list(api.list_models(author=org, limit=500))
        signals.model_count = len(models)

        tasks = set()
        total_dl = 0
        total_likes = 0
        latest = ""
        papers = 0
        sizes = []
        top_by_dl: list[tuple[int, dict]] = []

        for m in models:
            if m.pipeline_tag:
                tasks.add(m.pipeline_tag)
            total_dl += m.downloads or 0
            total_likes += m.likes or 0

            modified = m.last_modified or ""
            if modified and modified > latest:
                latest = modified

            # Check for paper tags
            if m.tags:
                for tag in m.tags:
                    if tag.startswith("arxiv:"):
                        papers += 1
                        break

            # Model size from safetensors metadata
            if hasattr(m, "safetensors") and m.safetensors:
                params = getattr(m.safetensors, "total", 0)
                if params > 0:
                    sizes.append(_format_params(params))

            top_by_dl.append((m.downloads or 0, {
                "id": m.id,
                "downloads": m.downloads or 0,
                "pipeline_tag": m.pipeline_tag or "",
            }))

        signals.total_downloads = total_dl
        signals.total_likes = total_likes
        signals.task_diversity = sorted(tasks)
        signals.last_modified = latest
        signals.paper_count = papers
        signals.model_sizes = sizes[:10]

        top_by_dl.sort(key=lambda x: x[0], reverse=True)
        signals.top_models = [t[1] for t in top_by_dl[:5]]

    except Exception as e:
        log.warning(f"  Error fetching models for {org}: {e}")

    time.sleep(RATE_LIMIT_DELAY)

    # Datasets
    try:
        datasets = list(api.list_datasets(author=org, limit=500))
        signals.dataset_count = len(datasets)
    except Exception as e:
        log.warning(f"  Error fetching datasets for {org}: {e}")

    time.sleep(0.5)

    # Spaces
    try:
        spaces = list(api.list_spaces(author=org, limit=500))
        signals.space_count = len(spaces)
    except Exception as e:
        log.warning(f"  Error fetching spaces for {org}: {e}")

    return signals


def _format_params(n: int) -> str:
    """Format parameter count: 7000000000 -> '7B'."""
    if n >= 1_000_000_000:
        return f"{n / 1e9:.1f}B"
    if n >= 1_000_000:
        return f"{n / 1e6:.0f}M"
    if n >= 1_000:
        return f"{n / 1e3:.0f}K"
    return str(n)


# ---------------------------------------------------------------------------
# Presence scoring
# ---------------------------------------------------------------------------

def compute_hf_presence_score(signals: HFOrgSignals) -> tuple[float, list[str]]:
    """Compute HF presence score (0-100) with reasons.

    | Signal           | Weight | Logic                                    |
    |------------------|--------|------------------------------------------|
    | Has HF org       | 20     | Boolean: org found and verified          |
    | Model count      | 15     | log-scaled: 1→5, 5→10, 20+→15           |
    | Download volume  | 15     | log-scaled: 100→5, 10K→10, 1M+→15       |
    | Task diversity   | 15     | 1 task→5, 3→10, 5+→15                   |
    | Recency          | 10     | <30d→10, <90d→7, <365d→3                |
    | Dataset publish  | 10     | Has datasets = strong AI-native signal   |
    | Papers           | 10     | Linked papers = research investment      |
    | Spaces           | 5      | Interactive demos = product maturity     |
    """
    score = 0.0
    reasons = []

    # Has HF org (20)
    if signals.org_name:
        score += 20
        reasons.append(f"HF org: {signals.org_name}")
    else:
        reasons.append("No HF org found")
        return score, reasons

    # Model count (15) — log-scaled
    mc = signals.model_count
    if mc >= 20:
        score += 15
        reasons.append(f"{mc} models (extensive)")
    elif mc >= 5:
        score += 10
        reasons.append(f"{mc} models (moderate)")
    elif mc >= 1:
        score += 5
        reasons.append(f"{mc} model(s)")
    else:
        reasons.append("No models published")

    # Download volume (15) — log-scaled
    dl = signals.total_downloads
    if dl >= 1_000_000:
        score += 15
        reasons.append(f"{dl:,} total downloads (massive)")
    elif dl >= 10_000:
        score += 10
        reasons.append(f"{dl:,} total downloads (significant)")
    elif dl >= 100:
        score += 5
        reasons.append(f"{dl:,} total downloads")
    elif dl > 0:
        score += 2
        reasons.append(f"{dl} total downloads (low)")

    # Task diversity (15)
    td = len(signals.task_diversity)
    if td >= 5:
        score += 15
        reasons.append(f"{td} task types: {', '.join(signals.task_diversity[:5])}")
    elif td >= 3:
        score += 10
        reasons.append(f"{td} task types: {', '.join(signals.task_diversity)}")
    elif td >= 1:
        score += 5
        reasons.append(f"{td} task type(s): {', '.join(signals.task_diversity)}")

    # Recency (10)
    if signals.last_modified:
        try:
            last = datetime.fromisoformat(signals.last_modified.replace("Z", "+00:00"))
            days_ago = (datetime.now(timezone.utc) - last).days
            if days_ago < 30:
                score += 10
                reasons.append(f"Active in last 30 days ({days_ago}d ago)")
            elif days_ago < 90:
                score += 7
                reasons.append(f"Active in last 90 days ({days_ago}d ago)")
            elif days_ago < 365:
                score += 3
                reasons.append(f"Active in last year ({days_ago}d ago)")
            else:
                reasons.append(f"Inactive ({days_ago}d since last update)")
        except (ValueError, TypeError):
            pass

    # Dataset publishing (10)
    dc = signals.dataset_count
    if dc >= 5:
        score += 10
        reasons.append(f"{dc} datasets (strong data signal)")
    elif dc >= 1:
        score += 6
        reasons.append(f"{dc} dataset(s)")

    # Papers (10)
    pc = signals.paper_count
    if pc >= 5:
        score += 10
        reasons.append(f"{pc} papers linked (research org)")
    elif pc >= 1:
        score += 5
        reasons.append(f"{pc} paper(s) linked")

    # Spaces (5)
    sc = signals.space_count
    if sc >= 3:
        score += 5
        reasons.append(f"{sc} Spaces (product demos)")
    elif sc >= 1:
        score += 3
        reasons.append(f"{sc} Space(s)")

    return min(score, 100), reasons


# ---------------------------------------------------------------------------
# Neon helpers
# ---------------------------------------------------------------------------

def get_neon_conn():
    import psycopg2
    url = os.environ.get("NEON_DATABASE_URL", "")
    if not url:
        raise RuntimeError("NEON_DATABASE_URL not set")
    return psycopg2.connect(url, sslmode="require")


def load_companies(limit: int = 0) -> list[CompanyRecord]:
    """Load companies that haven't been HF-enriched yet."""
    conn = get_neon_conn()
    with conn.cursor() as cur:
        sql = """
            SELECT id, key, name, website, canonical_domain, github_url
            FROM companies
            WHERE blocked = false
              AND (hf_presence_score IS NULL OR hf_presence_score = 0)
            ORDER BY score DESC, created_at DESC
        """
        if limit > 0:
            sql += f" LIMIT {limit}"
        cur.execute(sql)
        rows = cur.fetchall()
    conn.close()

    companies = []
    for row in rows:
        companies.append(CompanyRecord(
            id=row[0], key=row[1], name=row[2],
            website=row[3] or "", canonical_domain=row[4] or "",
            github_url=row[5] or "",
        ))
    log.info(f"Loaded {len(companies)} companies for HF enrichment")
    return companies


def update_neon(companies: list[CompanyRecord]):
    """Write HF presence signals back to Neon."""
    conn = get_neon_conn()
    now = datetime.now(timezone.utc).isoformat()
    updated = 0
    facts_inserted = 0

    with conn.cursor() as cur:
        for c in companies:
            if not c.hf_signals:
                continue

            s = c.hf_signals
            try:
                # Update company columns
                cur.execute(
                    """
                    UPDATE companies SET
                        hf_org_name = %s,
                        hf_presence_score = %s,
                        updated_at = %s
                    WHERE id = %s
                    """,
                    (s.org_name or None, c.hf_presence_score, now, c.id),
                )

                # Optionally promote ai_tier if strong HF presence
                if c.hf_presence_score >= 60:
                    cur.execute(
                        """
                        UPDATE companies SET ai_tier = 2,
                            ai_classification_reason = COALESCE(ai_classification_reason, '')
                                || ' [HF presence: ' || %s || ']'
                        WHERE id = %s AND ai_tier < 2
                        """,
                        (str(round(c.hf_presence_score)), c.id),
                    )

                updated += 1

                # Insert provenance facts
                details_json = json.dumps({
                    "org_name": s.org_name,
                    "resolved_via": s.resolved_via,
                    "model_count": s.model_count,
                    "dataset_count": s.dataset_count,
                    "space_count": s.space_count,
                    "total_downloads": s.total_downloads,
                    "total_likes": s.total_likes,
                    "task_diversity": s.task_diversity,
                    "last_modified": s.last_modified,
                    "paper_count": s.paper_count,
                    "model_sizes": s.model_sizes,
                    "top_models": s.top_models,
                })

                fact_fields = [
                    ("hf_presence_score", str(c.hf_presence_score)),
                    ("hf_org_name", s.org_name),
                    ("hf_model_count", str(s.model_count)),
                    ("hf_total_downloads", str(s.total_downloads)),
                    ("hf_task_diversity", json.dumps(s.task_diversity)),
                    ("hf_last_activity", s.last_modified),
                    ("hf_details", details_json),
                ]

                for field_name, value in fact_fields:
                    if not value or value in ("0", "[]", ""):
                        continue
                    cur.execute(
                        """
                        INSERT INTO company_facts
                            (company_id, field, value_text, confidence,
                             source_type, source_url, observed_at, method)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            c.id, field_name, value,
                            min(c.hf_presence_score / 100.0, 1.0),
                            "HF_HUB",
                            f"https://huggingface.co/{s.org_name}",
                            now, "API",
                        ),
                    )
                    facts_inserted += 1

            except Exception as e:
                log.error(f"  Error updating {c.name}: {e}")
                conn.rollback()
                continue

        conn.commit()

    conn.close()
    log.info(f"Updated {updated} companies, inserted {facts_inserted} facts")


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def enrich_company(api: HfApi, company: CompanyRecord) -> CompanyRecord:
    """Run HF deep search for a single company."""
    log.info(f"[{company.name}] Resolving HF org...")

    org = resolve_hf_org(api, company)
    if not org:
        log.info(f"  No HF org found for {company.name}")
        company.hf_signals = HFOrgSignals()
        company.hf_presence_score = 0
        company.hf_score_reasons = ["No HF org found"]
        return company

    log.info(f"  Found HF org: {org}")
    signals = extract_signals(api, org)
    signals.resolved_via = "multi-step"

    score, reasons = compute_hf_presence_score(signals)

    company.hf_signals = signals
    company.hf_presence_score = score
    company.hf_score_reasons = reasons

    log.info(f"  HF Presence Score: {score}/100")
    for r in reasons:
        log.info(f"    - {r}")

    return company


def main():
    parser = argparse.ArgumentParser(description="HuggingFace Hub deep search enrichment")
    parser.add_argument("--dry-run", action="store_true", help="Print results, don't update DB")
    parser.add_argument("--limit", type=int, default=0, help="Process first N companies")
    parser.add_argument("--company", type=str, help="Single company name lookup (no DB)")
    args = parser.parse_args()

    api = HfApi()

    # Single company lookup mode
    if args.company:
        c = CompanyRecord(id=0, key="", name=args.company, website="", canonical_domain="")
        c = enrich_company(api, c)
        if c.hf_signals and c.hf_signals.org_name:
            print(f"\nResult for '{args.company}':")
            print(f"  HF Org: {c.hf_signals.org_name}")
            print(f"  Score: {c.hf_presence_score}/100")
            print(f"  Models: {c.hf_signals.model_count}")
            print(f"  Datasets: {c.hf_signals.dataset_count}")
            print(f"  Spaces: {c.hf_signals.space_count}")
            print(f"  Downloads: {c.hf_signals.total_downloads:,}")
            print(f"  Tasks: {', '.join(c.hf_signals.task_diversity)}")
            if c.hf_signals.top_models:
                print("  Top models:")
                for m in c.hf_signals.top_models:
                    print(f"    - {m['id']} ({m['downloads']:,} dl)")
        else:
            print(f"No HF presence found for '{args.company}'")
        return

    # Batch enrichment mode
    companies = load_companies(limit=args.limit)
    if not companies:
        log.info("No companies to enrich")
        return

    for i, c in enumerate(companies, 1):
        log.info(f"\n--- [{i}/{len(companies)}] {c.name} ---")
        enrich_company(api, c)
        time.sleep(RATE_LIMIT_DELAY)

    # Summary
    enriched = [c for c in companies if c.hf_presence_score > 0]
    log.info(f"\nSummary: {len(enriched)}/{len(companies)} companies have HF presence")

    if enriched:
        enriched.sort(key=lambda c: c.hf_presence_score, reverse=True)
        log.info("Top HF presence scores:")
        for c in enriched[:10]:
            log.info(f"  {c.hf_presence_score:5.0f}  {c.name} ({c.hf_signals.org_name})")

    if not args.dry_run and enriched:
        update_neon(companies)
    elif args.dry_run:
        log.info("DRY RUN — no DB updates")


if __name__ == "__main__":
    main()
