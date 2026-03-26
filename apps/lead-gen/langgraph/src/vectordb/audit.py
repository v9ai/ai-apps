"""Post-based contact audit: score contacts by their LinkedIn post content.

For each contact with scraped posts, computes AI/ML relevance from post
embeddings and keyword signals. Contacts below threshold can be marked
do_not_contact in Neon.

Usage:
    from src.vectordb.audit import audit_contacts
    results = audit_contacts(threshold=0.08, apply=False)
"""

from __future__ import annotations

import re

import lancedb
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from .config import LANCE_DB_PATH
from .embedder import embed_texts
from .schemas import AuditResult

# ---------------------------------------------------------------------------
# Target queries — what makes a contact worth keeping
# ---------------------------------------------------------------------------

AUDIT_TARGETS = [
    "AI recruiter hiring ML engineers, LLM engineers, data scientists",
    "Hiring manager at AI company, CTO AI startup, VP Engineering ML",
    "Technical recruiter machine learning, NLP, computer vision, remote EU",
    "AI startup founder hiring engineers, scaling AI team",
    "Recruiting for software engineer, React, TypeScript, full stack at AI company",
]

# ---------------------------------------------------------------------------
# Keyword signals applied to post text
# ---------------------------------------------------------------------------

_CRYPTO_RE = re.compile(
    r"\b(crypto|defi|blockchain|web3|nft|token|solidity"
    r"|smart\s+contract|dapp|dao\b|decentralized|solana"
    r"|ethereum\s+develop|layer\s*[12]|zk.?proof)\b",
    re.IGNORECASE,
)

_AI_RE = re.compile(
    r"\b(artificial\s+intelligence|machine\s+learning|deep\s+learning"
    r"|neural\s+network|llm|large\s+language\s+model|genai|generative\s+ai"
    r"|nlp|natural\s+language|computer\s+vision|mlops|data\s+science"
    r"|ai\s+engineer|ml\s+engineer|ai\s+team|ai\s+startup"
    r"|transformer|fine.?tun|rag|retrieval.augmented|embeddings?)\b",
    re.IGNORECASE,
)

_HIRING_RE = re.compile(
    r"\b(hiring|recruit|talent|we.re\s+looking|join\s+our\s+team"
    r"|open\s+role|job\s+opening|new\s+position|apply\s+now"
    r"|we.re\s+growing|scaling\s+our\s+team)\b",
    re.IGNORECASE,
)

_EU_REMOTE_RE = re.compile(
    r"\b(remote|europe|eu\b|emea|uk\b|germany|france|netherlands"
    r"|ireland|spain|poland|sweden|denmark|finland|austria"
    r"|switzerland|belgium|czech|romania|italy|global|worldwide)\b",
    re.IGNORECASE,
)

CRYPTO_PENALTY = -0.15
AI_BOOST = 0.05
HIRING_BOOST = 0.03
EU_REMOTE_BOOST = 0.02

# Threshold for counting a post as "relevant" when computing relevant_ratio
POST_RELEVANCE_THRESHOLD = 0.20


def _compute_keyword_adjustment(all_post_text: str) -> tuple[float, list[str]]:
    """Scan concatenated post text for keyword signals. Returns (adjustment, signal_list)."""
    adj = 0.0
    signals: list[str] = []

    if _CRYPTO_RE.search(all_post_text):
        adj += CRYPTO_PENALTY
        signals.append("crypto")

    if _AI_RE.search(all_post_text):
        adj += AI_BOOST
        signals.append("ai/ml")

    if _HIRING_RE.search(all_post_text):
        adj += HIRING_BOOST
        signals.append("hiring")

    if _EU_REMOTE_RE.search(all_post_text):
        adj += EU_REMOTE_BOOST
        signals.append("eu/remote")

    return adj, signals


def _build_reason(signals: list[str], best_sim: float, num_relevant: int, num_posts: int) -> str:
    """Build a human-readable reason string."""
    parts: list[str] = []
    if num_relevant == 0:
        parts.append("no AI-relevant posts")
    else:
        parts.append(f"{num_relevant}/{num_posts} posts AI-relevant")

    if "crypto" in signals:
        parts.append("crypto content")
    if "ai/ml" in signals:
        parts.append("AI/ML content")
    if "hiring" in signals:
        parts.append("hiring signals")
    if "eu/remote" in signals:
        parts.append("EU/remote signals")

    parts.append(f"best_sim={best_sim:.3f}")
    return "; ".join(parts)


# ---------------------------------------------------------------------------
# Main audit function
# ---------------------------------------------------------------------------


def audit_contacts(
    threshold: float = 0.35,
) -> list[AuditResult]:
    """Score contacts by their LinkedIn post content and decide keep/remove.

    Contacts below threshold are automatically marked do_not_contact in Neon.

    Args:
        threshold: Contacts scoring below this are removed.

    Returns:
        List of AuditResult, sorted by final_score ascending (worst first).
    """
    db = lancedb.connect(LANCE_DB_PATH)

    # Load tables
    posts_df = db.open_table("posts").to_pandas()
    contacts_df = db.open_table("contacts").to_pandas()

    if posts_df.empty:
        print("No posts in LanceDB. Run 'python -m cli post-sync' first.")
        return []

    # Build contact lookup
    contact_lookup: dict[int, dict] = {}
    for _, c in contacts_df.iterrows():
        contact_lookup[int(c["neon_id"])] = {
            "name": f"{c['first_name']} {c['last_name']}",
            "position": c.get("position", ""),
            "company": c.get("company", ""),
        }

    # Embed target queries and average into one vector
    print("Embedding audit target queries...")
    target_embs = embed_texts(AUDIT_TARGETS)
    target_vec = np.mean(target_embs, axis=0, keepdims=True)
    target_vec = target_vec / np.linalg.norm(target_vec)

    # Group posts by contact
    grouped = posts_df.groupby("contact_neon_id")
    total_contacts = len(grouped)
    total_posts = len(posts_df)
    print(f"Auditing {total_contacts} contacts with {total_posts} posts...\n")

    results: list[AuditResult] = []

    for contact_id, group in grouped:
        contact_id = int(contact_id)
        info = contact_lookup.get(contact_id, {"name": "Unknown", "position": "", "company": ""})

        # Get post vectors (already embedded during sync)
        vectors = np.stack(group["vector"].values)

        # Cosine similarity of each post against target
        sims = cosine_similarity(target_vec, vectors)[0]

        best_sim = float(np.max(sims))
        avg_sim = float(np.mean(sims))
        num_relevant = int(np.sum(sims >= POST_RELEVANCE_THRESHOLD))
        relevant_ratio = num_relevant / len(sims) if len(sims) > 0 else 0.0

        # Keyword adjustment on all post text
        all_text = " ".join(str(t) for t in group["post_text"].fillna("").values)
        kw_adj, signals = _compute_keyword_adjustment(all_text)

        # Final score
        final = 0.6 * best_sim + 0.3 * avg_sim + 0.1 * relevant_ratio + kw_adj

        # Sample posts (top 2 by similarity)
        top_indices = np.argsort(sims)[::-1][:2]
        sample_posts = []
        for idx in top_indices:
            text = str(group.iloc[idx].get("post_text", "") or "")[:150].replace("\n", " ")
            sample_posts.append(text)

        decision = "keep" if final >= threshold else "remove"
        reason = _build_reason(signals, best_sim, num_relevant, len(group))

        results.append(AuditResult(
            neon_id=contact_id,
            name=info["name"],
            position=info["position"],
            company=info["company"],
            num_posts=len(group),
            best_post_sim=best_sim,
            avg_post_sim=avg_sim,
            num_relevant_posts=num_relevant,
            keyword_adjustment=kw_adj,
            final_score=final,
            decision=decision,
            reason=reason,
            sample_posts=sample_posts,
        ))

    # Sort by score ascending (worst first)
    results.sort(key=lambda r: r.final_score)

    # Apply removals to Neon
    remove_ids = [r.neon_id for r in results if r.decision == "remove"]
    if remove_ids:
        _mark_do_not_contact(remove_ids)

    return results


def _mark_do_not_contact(neon_ids: list[int]):
    """Set do_not_contact=true in Neon for the given contact IDs."""
    from src.db.connection import get_connection

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE contacts SET do_not_contact = true, updated_at = now()::text "
                "WHERE id = ANY(%s) AND do_not_contact = false",
                [neon_ids],
            )
            updated = cur.rowcount
        conn.commit()
        print(f"\nMarked {updated} contacts as do_not_contact in Neon.")
    finally:
        conn.close()
