"""Score 9,000+ contacts to find AI recruiters using embedding similarity.

Uses all-MiniLM-L6-v2 to embed contact profiles and compute cosine similarity
against target AI recruiter profiles. Applies keyword boosts, crypto filtering,
region signals, and ai_tier company data.

Usage:
    python3 mlx-training/score_ai_recruiters.py
    python3 mlx-training/score_ai_recruiters.py --top 50
    python3 mlx-training/score_ai_recruiters.py --csv output.csv
    python3 mlx-training/score_ai_recruiters.py --tag-db
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
from dataclasses import dataclass, field

import numpy as np
import psycopg2
from dotenv import load_dotenv
from sklearn.metrics.pairwise import cosine_similarity

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

NEON_URL = os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL")
if not NEON_URL:
    sys.exit("Error: NEON_DATABASE_URL not found in environment")

# ---------------------------------------------------------------------------
# Target descriptions — what we're looking for
# ---------------------------------------------------------------------------
TARGET_QUERIES = [
    "AI recruiter, ML recruiter, talent acquisition for AI Engineer, ML Engineer, LLM Engineer",
    "Hiring manager at AI company, CTO AI startup, VP Engineering ML company, Head of AI",
    "Technical recruiter machine learning, deep learning, NLP, computer vision, remote EU EMEA",
    "Talent partner React Engineer, Frontend Engineer, Full Stack at AI company, remote Europe",
    "Recruiter Anthropic OpenAI DeepSeek Mistral Cohere Hugging Face AI startup scale-up",
]

# ---------------------------------------------------------------------------
# Keyword signals — explicit pattern matching for precision
# ---------------------------------------------------------------------------
AI_RECRUITER_TITLE_PATTERNS = re.compile(
    r"\b(ai\s+recruit|ml\s+recruit|machine\s+learning\s+recruit"
    r"|ai/ml\s+recruit|data\s*&\s*ai\s+recruit|ai\s+talent"
    r"|ml\s+talent|ai\s+hiring|head\s+of\s+ai|vp\s+.*ai"
    r"|ai\s+engineer|ml\s+engineer|llm\s+engineer"
    r"|machine\s+learning\s+engineer|genai\s+engineer"
    r"|ai\s+headhunt|ml\s+headhunt"
    r"|scaling\s+ai\s+team|build.*ai\s+team"
    r"|ai\s+start.?up|ai.?led\s+business"
    r"|data\s+science\s+recruit|nlp\s+recruit)\b",
    re.IGNORECASE,
)

AI_COMPANY_KEYWORDS = re.compile(
    r"\b(anthropic|openai|deepseek|mistral|cohere|hugging\s*face"
    r"|stability\s*ai|together\s*ai|anyscale|modal|replicate"
    r"|weights\s*&\s*biases|wandb|scale\s*ai|labelbox"
    r"|pinecone|weaviate|qdrant|chroma|langchain"
    r"|databricks|snowflake|datadog)\b",
    re.IGNORECASE,
)

EU_REGION_PATTERNS = re.compile(
    r"\b(eu\b|europe|emea|uk|united\s+kingdom|germany|france|netherlands"
    r"|ireland|spain|portugal|poland|sweden|denmark|finland|norway"
    r"|austria|switzerland|belgium|czech|romania|hungary|italy"
    r"|remote.*europ|europ.*remote|dach|nordic|global|worldwide)\b",
    re.IGNORECASE,
)

# Crypto/Web3 exclusion — same filter as resume-data.json
CRYPTO_PATTERNS = re.compile(
    r"\b(crypto|defi|blockchain|web3|nft|token|solidity"
    r"|smart\s+contract|dapp|dao\b|decentralized|solana"
    r"|ethereum\s+develop|layer\s*[12]|zk.?proof"
    r"|the\s+crypto\s+recruiter)\b",
    re.IGNORECASE,
)

# Non-recruiter roles to deprioritize
NON_RECRUITER_PATTERNS = re.compile(
    r"\b(software\s+engineer|backend\s+engineer|frontend\s+engineer"
    r"|full.?stack\s+engineer|devops|sre|data\s+analyst"
    r"|product\s+designer|ux\s+design|marketing\s+manager"
    r"|sales\s+execut|account\s+manag|finance\s+analyst)\b",
    re.IGNORECASE,
)

RECRUITER_PATTERNS = re.compile(
    r"\b(recruit|talent|hiring|headhunt|people\s+partner"
    r"|talent\s+acqui|hr\s+partner|staffing|sourcer)\b",
    re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# Scoring parameters
# ---------------------------------------------------------------------------
TIER1_THRESHOLD = 0.55
TIER2_THRESHOLD = 0.42

AI_TITLE_BOOST = 0.15       # explicit "AI Recruiter" in title
AI_COMPANY_BOOST = 0.10     # works at known AI company
AI_TIER_BOOST = 0.08        # company has ai_tier >= 1
EU_REGION_BOOST = 0.05      # mentions EU/EMEA in title
RECRUITER_BOOST = 0.05      # is clearly a recruiter role
NON_RECRUITER_PENALTY = -0.12  # is clearly a non-recruiter (engineer, designer)
CRYPTO_PENALTY = -0.30      # crypto/web3 signal → strong demotion


# ---------------------------------------------------------------------------
# MLX Metal embedding engine
# ---------------------------------------------------------------------------
MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"


def _load_mlx_model():
    """Load embedding model in MLX (native Metal GPU) with HF batch tokenizer."""
    from mlx_embeddings.utils import load as mlx_load
    from transformers import AutoTokenizer
    model, _ = mlx_load(MODEL_ID)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)  # HF tokenizer for proper batching
    return model, tokenizer


def mlx_encode(texts: list[str], model, tokenizer, batch_size: int = 256) -> np.ndarray:
    """Batch-encode texts on Metal GPU via MLX. Returns L2-normalized embeddings."""
    import mlx.core as mx

    all_embs = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        inputs = tokenizer(batch, padding=True, truncation=True, max_length=128, return_tensors="np")

        input_ids = mx.array(inputs["input_ids"])
        attention_mask = mx.array(inputs["attention_mask"])
        token_type_ids = mx.zeros_like(input_ids)

        output = model(input_ids=input_ids, attention_mask=attention_mask, token_type_ids=token_type_ids)
        hidden = output.last_hidden_state

        # Mean pooling with attention mask
        mask = mx.expand_dims(attention_mask, -1).astype(mx.float32)
        summed = mx.sum(hidden * mask, axis=1)
        counts = mx.maximum(mx.sum(mask, axis=1), mx.array(1e-9))
        embs = summed / counts

        # L2 normalize
        norms = mx.sqrt(mx.sum(embs * embs, axis=-1, keepdims=True))
        embs = embs / mx.maximum(norms, mx.array(1e-9))

        mx.eval(embs)
        all_embs.append(np.array(embs))

    return np.concatenate(all_embs, axis=0)


@dataclass
class ScoredContact:
    id: int
    first_name: str
    last_name: str
    position: str
    company: str
    email: str | None
    linkedin_url: str | None
    email_verified: bool
    ai_tier: int | None
    company_category: str | None
    raw_score: float
    boosted_score: float
    tier: int
    signals: list[str] = field(default_factory=list)


def fetch_contacts() -> list[dict]:
    conn = psycopg2.connect(NEON_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT c.id, c.first_name, c.last_name, c.position, c.company,
                       c.email, c.linkedin_url, c.email_verified, c.tags,
                       co.ai_tier, co.category as company_category
                FROM contacts c
                LEFT JOIN companies co ON c.company_id = co.id
                WHERE c.do_not_contact = false
                  AND c.position IS NOT NULL AND c.position != ''
                ORDER BY c.id
            """)
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]
    finally:
        conn.close()


def tag_contacts_in_db(tier1_ids: list[int], tier2_ids: list[int]):
    """Write tier tags back to contacts.tags in Neon."""
    conn = psycopg2.connect(NEON_URL)
    try:
        with conn.cursor() as cur:
            # Clear old ai-recruiter tags first
            cur.execute("""
                UPDATE contacts
                SET tags = (
                    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)::text
                    FROM jsonb_array_elements_text(COALESCE(tags::jsonb, '[]'::jsonb)) AS elem
                    WHERE elem NOT LIKE 'ai-recruiter%%'
                ),
                updated_at = now()::text
                WHERE tags::text LIKE '%%ai-recruiter%%'
            """)
            cleared = cur.rowcount
            if cleared:
                print(f"  Cleared old ai-recruiter tags from {cleared} contacts")

            # Tag tier 1
            if tier1_ids:
                cur.execute("""
                    UPDATE contacts
                    SET tags = (
                        COALESCE(tags::jsonb, '[]'::jsonb) || '"ai-recruiter-tier-1"'::jsonb
                    )::text,
                    updated_at = now()::text
                    WHERE id = ANY(%s)
                """, (tier1_ids,))
                print(f"  Tagged {cur.rowcount} contacts as ai-recruiter-tier-1")

            # Tag tier 2
            if tier2_ids:
                cur.execute("""
                    UPDATE contacts
                    SET tags = (
                        COALESCE(tags::jsonb, '[]'::jsonb) || '"ai-recruiter-tier-2"'::jsonb
                    )::text,
                    updated_at = now()::text
                    WHERE id = ANY(%s)
                """, (tier2_ids,))
                print(f"  Tagged {cur.rowcount} contacts as ai-recruiter-tier-2")

            conn.commit()
    finally:
        conn.close()


def score_contacts(contacts: list[dict]) -> list[ScoredContact]:
    print("Loading MLX Metal embedding model...")
    model, tokenizer = _load_mlx_model()

    print(f"Encoding {len(TARGET_QUERIES)} target queries on Metal GPU...")
    target_embs = mlx_encode(TARGET_QUERIES, model, tokenizer)
    target_emb = np.mean(target_embs, axis=0, keepdims=True)
    target_emb = target_emb / np.linalg.norm(target_emb)

    texts = [f"{c['position'] or ''} at {c['company'] or ''}" for c in contacts]

    print(f"Encoding {len(texts)} contacts on Metal GPU...")
    t0 = time.time()
    contact_embs = mlx_encode(texts, model, tokenizer, batch_size=256)
    elapsed = time.time() - t0
    print(f"Encoded {len(texts)} contacts in {elapsed:.1f}s ({len(texts)/elapsed:.0f}/sec) [MLX Metal]")

    raw_scores = cosine_similarity(target_emb, contact_embs)[0]

    scored = []
    for i, c in enumerate(contacts):
        raw = float(raw_scores[i])
        boost = 0.0
        signals = []
        text = texts[i]

        # Keyword boosts
        if AI_RECRUITER_TITLE_PATTERNS.search(text):
            boost += AI_TITLE_BOOST
            signals.append("ai-title")

        if AI_COMPANY_KEYWORDS.search(text):
            boost += AI_COMPANY_BOOST
            signals.append("ai-company")

        ai_tier = c["ai_tier"] or 0
        if ai_tier >= 1:
            boost += AI_TIER_BOOST
            signals.append(f"ai-tier-{ai_tier}")

        if EU_REGION_PATTERNS.search(text):
            boost += EU_REGION_BOOST
            signals.append("eu-region")

        if RECRUITER_PATTERNS.search(text):
            boost += RECRUITER_BOOST
            signals.append("recruiter")

        # Penalties
        if CRYPTO_PATTERNS.search(text):
            boost += CRYPTO_PENALTY
            signals.append("crypto-penalty")

        if NON_RECRUITER_PATTERNS.search(text) and not RECRUITER_PATTERNS.search(text):
            boost += NON_RECRUITER_PENALTY
            signals.append("non-recruiter")

        final = raw + boost

        if final >= TIER1_THRESHOLD:
            tier = 1
        elif final >= TIER2_THRESHOLD:
            tier = 2
        else:
            tier = 3

        scored.append(ScoredContact(
            id=c["id"],
            first_name=c["first_name"],
            last_name=c["last_name"],
            position=c["position"],
            company=c["company"] or "",
            email=c["email"],
            linkedin_url=c["linkedin_url"],
            email_verified=c["email_verified"] or False,
            ai_tier=ai_tier,
            company_category=c["company_category"],
            raw_score=raw,
            boosted_score=final,
            tier=tier,
            signals=signals,
        ))

    scored.sort(key=lambda s: s.boosted_score, reverse=True)
    return scored


def print_report(scored: list[ScoredContact], top_n: int = 100):
    tier1 = [s for s in scored if s.tier == 1]
    tier2 = [s for s in scored if s.tier == 2]
    tier3 = [s for s in scored if s.tier == 3]

    tier1_with_email = [s for s in tier1 if s.email and s.email_verified]
    tier2_with_email = [s for s in tier2 if s.email and s.email_verified]

    # Outreach-ready: tier 1 + verified email + not crypto
    outreach_ready = [s for s in tier1_with_email if "crypto-penalty" not in s.signals]

    print(f"\n{'='*90}")
    print(f"  AI RECRUITER SCORING REPORT")
    print(f"  Target: AI Engineer / React Engineer | Remote EU / Worldwide")
    print(f"{'='*90}")

    print(f"\n  Total contacts scored: {len(scored)}")
    print(f"  Tier 1 (strong AI recruiter signal):  {len(tier1):>5} ({len(tier1_with_email)} with verified email)")
    print(f"  Tier 2 (tech recruiter / AI-adjacent): {len(tier2):>5} ({len(tier2_with_email)} with verified email)")
    print(f"  Tier 3 (filtered out):                 {len(tier3):>5}")
    print(f"\n  OUTREACH-READY (Tier 1 + verified email): {len(outreach_ready)}")

    # Tier 1 — full detail
    print(f"\n{'─'*90}")
    print(f"  TIER 1: AI RECRUITERS (top {min(top_n, len(tier1))})")
    print(f"{'─'*90}")
    for i, s in enumerate(tier1[:top_n]):
        email_str = s.email if s.email else "no email"
        verified = " ✓" if s.email_verified and s.email else ""
        badges = ""
        if s.ai_tier and s.ai_tier >= 1:
            badges += f" [AI-T{s.ai_tier}]"
        if "eu-region" in s.signals:
            badges += " [EU]"
        if "crypto-penalty" in s.signals:
            badges += " [CRYPTO]"
        sig_str = " ".join(f"+{s}" for s in s.signals if not s.startswith("crypto"))
        print(f"  {i+1:3d}. {s.first_name} {s.last_name}{badges}")
        print(f"       {s.position}")
        print(f"       {s.company} | score={s.boosted_score:.3f} (raw={s.raw_score:.3f}) | {email_str}{verified}")
        if s.linkedin_url:
            print(f"       {s.linkedin_url}")
        if sig_str:
            print(f"       signals: {sig_str}")
        print()

    # Outreach-ready summary
    print(f"\n{'─'*90}")
    print(f"  OUTREACH-READY: VERIFIED EMAIL + TIER 1 (top 30)")
    print(f"{'─'*90}")
    for i, s in enumerate(outreach_ready[:30]):
        badges = ""
        if s.ai_tier and s.ai_tier >= 1:
            badges += f" [AI-T{s.ai_tier}]"
        if "eu-region" in s.signals:
            badges += " [EU]"
        print(f"  {i+1:3d}. {s.first_name} {s.last_name} | {s.position[:70]}")
        print(f"       {s.company}{badges} | {s.email} | score={s.boosted_score:.3f}")

    print(f"\n{'='*90}")


def export_csv(scored: list[ScoredContact], path: str):
    exported = [s for s in scored if s.tier <= 2]
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "tier", "score", "raw_score", "first_name", "last_name", "position",
            "company", "ai_tier", "email", "email_verified", "linkedin_url", "signals",
        ])
        for s in exported:
            writer.writerow([
                s.tier, f"{s.boosted_score:.4f}", f"{s.raw_score:.4f}",
                s.first_name, s.last_name, s.position, s.company,
                s.ai_tier or 0, s.email or "", s.email_verified,
                s.linkedin_url or "", "|".join(s.signals),
            ])
    print(f"\nExported {len(exported)} Tier 1+2 contacts to {path}")


def main():
    parser = argparse.ArgumentParser(description="Score contacts for AI recruiter relevance")
    parser.add_argument("--top", type=int, default=80, help="Show top N tier-1 contacts")
    parser.add_argument("--csv", type=str, help="Export tier 1+2 to CSV")
    parser.add_argument("--tag-db", action="store_true", help="Write tier tags to contacts.tags in Neon")
    args = parser.parse_args()

    print("Fetching contacts from Neon...")
    contacts = fetch_contacts()
    print(f"Fetched {len(contacts)} contacts")

    scored = score_contacts(contacts)
    print_report(scored, top_n=args.top)

    if args.csv:
        export_csv(scored, args.csv)

    if args.tag_db:
        print("\nTagging contacts in Neon DB...")
        tier1_ids = [s.id for s in scored if s.tier == 1]
        tier2_ids = [s.id for s in scored if s.tier == 2]
        tag_contacts_in_db(tier1_ids, tier2_ids)
        print("Done.")


if __name__ == "__main__":
    main()
