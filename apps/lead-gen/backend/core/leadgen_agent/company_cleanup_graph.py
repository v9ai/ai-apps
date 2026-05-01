# Requires: numpy
"""Crypto/blockchain company cleanup graph — Python port of ``crates/company-cleanup``.

Replaces the Rust Candle + LanceDB pipeline with:

* BGE-M3 embeddings via ``embeddings.embed_texts`` (local :7799 server).
* An in-memory NumPy kNN over a 47-entry reference corpus (crypto vs
  non-crypto, with staffing/fintech negatives to prevent false positives).
* psycopg (autocommit) reads from ``companies`` and — only when
  ``delete=True`` — transactional DELETE of flagged companies plus their
  contacts (FK is ``SET NULL``, not ``CASCADE``, so contacts must be
  removed explicitly first).

**Dry-run is the default.** The graph only deletes when the caller sets
``state["delete"] = True`` (mirrors the Rust ``--delete`` CLI flag).
Confidence threshold for a delete is ``0.6``, same as the binary.

The secondary ``fix_positions.rs`` LinkedIn-headline classifier for the
``contacts`` table is **intentionally not ported** here — it is a
heuristic string-matching tool with no ML / embedding component and
belongs in a separate contacts-cleanup graph; see the crate-deletion
commit for the full decision notes.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any, TypedDict

import numpy as np
import psycopg
from langgraph.graph import END, START, StateGraph

from .deep_icp_graph import _dsn
from .embeddings import embed_texts

log = logging.getLogger(__name__)


TOP_K = 7
MAX_TEXT_CHARS = 2000
MIN_TEXT_CHARS = 20
CONFIDENCE_THRESHOLD = 0.6


# ── Reference corpus (ported from crates/company-cleanup/src/corpus.rs) ───────

CORPUS: list[tuple[str, bool]] = [
    # Crypto / Blockchain (label = True)
    ("Binance. The world's leading cryptocurrency exchange platform for Bitcoin, Ethereum and hundreds of altcoins. Cryptocurrency, Digital Assets. [crypto exchange, spot trading, futures, staking, launchpad]", True),
    ("Coinbase. Buy, sell, and manage cryptocurrency. We are building the cryptoeconomy — a more fair, accessible, efficient, and transparent financial system. Blockchain, Cryptocurrency. [crypto trading, custody, staking, wallet, institutional crypto]", True),
    ("Chainalysis. Blockchain analysis platform providing compliance and investigation tools for cryptocurrency businesses and government agencies. Blockchain, RegTech. [blockchain analytics, crypto compliance, transaction monitoring, KYT]", True),
    ("OpenSea. The world's first and largest NFT marketplace. Buy, sell, and discover exclusive digital items. NFT, Digital Art. [NFT marketplace, digital collectibles, NFT minting, auction]", True),
    ("Uniswap Labs. Building the Uniswap protocol, a decentralized exchange for swapping ERC-20 tokens on Ethereum. DeFi, Decentralized Finance. [decentralized exchange, DEX, liquidity pools, automated market maker, token swap]", True),
    ("Alchemy. The leading web3 development platform powering blockchain applications. Web3, Blockchain Infrastructure. [blockchain API, web3 development, NFT API, node infrastructure, blockchain data]", True),
    ("Ledger. Hardware wallet and security solutions for cryptocurrency and digital assets. Cryptocurrency, Hardware Security. [hardware wallet, cold storage, crypto security, digital asset management]", True),
    ("Aave. Open-source and non-custodial liquidity protocol for earning interest on deposits and borrowing assets. DeFi, Decentralized Finance. [lending protocol, flash loans, liquidity mining, DeFi governance]", True),
    ("Ripple. Enterprise blockchain and crypto solutions for cross-border payments and global money transfers. Blockchain, FinTech. [cross-border payments, XRP, digital asset settlement, blockchain payments, RippleNet]", True),
    ("ConsenSys. Building Ethereum-based infrastructure and applications including MetaMask and Infura. Blockchain, Ethereum. [MetaMask wallet, Infura nodes, Ethereum development, smart contracts, web3 tools]", True),
    ("MakerDAO. Decentralized autonomous organization governing the DAI stablecoin and the Maker protocol on Ethereum. DeFi, DAO. [stablecoin, decentralized governance, collateralized lending, DAI, crypto treasury]", True),
    ("Bitmain. Designs and manufactures ASIC chip hardware for Bitcoin mining. Crypto Mining, Hardware. [ASIC miners, Bitcoin mining, mining rigs, hash rate, proof of work]", True),
    ("Solana Labs. Building the fastest blockchain in the world for decentralized apps and marketplaces. Blockchain, Layer 1. [high-throughput blockchain, proof of history, Solana validator, dApp platform, token ecosystem]", True),
    ("Dapper Labs. Creator of NBA Top Shot and the Flow blockchain for digital collectibles and games. NFT, Blockchain Gaming. [NFT collectibles, Flow blockchain, blockchain gaming, digital assets, CryptoKitties]", True),
    ("Circle. Global financial technology firm and issuer of USDC stablecoin for digital dollar payments. Stablecoin, Crypto Payments. [USDC, stablecoin issuance, crypto payments, digital dollar, cross-border settlement]", True),
    ("Fireblocks. Enterprise platform for managing digital asset operations and building blockchain-based businesses. Digital Assets, Blockchain Infrastructure. [digital asset custody, MPC wallet, tokenization, DeFi access, crypto operations]", True),
    # Non-crypto (label = False)
    ("Stripe. Online payment processing platform for internet businesses. FinTech, Payments. [payment gateway, subscription billing, invoicing, fraud detection, financial APIs]", False),
    ("Datadog. Cloud monitoring and analytics platform for infrastructure, applications, and logs. SaaS, DevOps. [APM, infrastructure monitoring, log management, cloud security, observability]", False),
    ("Figma. Collaborative interface design tool for teams building digital products. Design, SaaS. [UI design, prototyping, design systems, collaboration, vector graphics]", False),
    ("Snowflake. Cloud-based data warehousing platform for analytics and data sharing. Data Analytics, Cloud. [data warehouse, SQL analytics, data lake, data sharing, cloud storage]", False),
    ("HubSpot. CRM platform for inbound marketing, sales, and customer service automation. SaaS, Marketing. [CRM, marketing automation, email marketing, lead management, sales pipeline]", False),
    ("GitLab. Complete DevOps platform for software development, CI/CD, and security. DevTools, SaaS. [version control, CI/CD pipelines, code review, DevSecOps, source code management]", False),
    ("Plaid. Financial data connectivity platform linking bank accounts to fintech applications. FinTech, Banking. [bank linking, financial data API, account verification, transaction data, open banking]", False),
    ("Vercel. Cloud platform for frontend frameworks providing deployment, hosting and serverless functions. Cloud, Developer Tools. [frontend hosting, serverless functions, edge network, Next.js deployment]", False),
    ("Scale AI. Data labeling and AI infrastructure platform for training machine learning models. AI, Data. [data annotation, ML training data, computer vision labeling, NLP annotation, AI infrastructure]", False),
    ("Notion. All-in-one workspace for notes, tasks, wikis, and project management. Productivity, SaaS. [note-taking, project management, wikis, team collaboration, knowledge base]", False),
    ("Brex. Corporate card and spend management platform for startups and enterprises. FinTech, Corporate Finance. [corporate credit card, expense management, AP automation, corporate treasury, spend control]", False),
    ("Twilio. Cloud communications platform providing voice, SMS, video, and authentication APIs. Communications, Cloud. [SMS API, voice API, video API, two-factor authentication, programmable messaging]", False),
    ("Palantir Technologies. Data analytics and intelligence platform for government and commercial enterprises. Data Analytics, Enterprise. [big data analytics, intelligence platform, data integration, government technology]", False),
    ("UiPath. Enterprise robotic process automation platform for automating business workflows. RPA, Enterprise. [robotic process automation, workflow automation, AI-powered bots, business process management]", False),
    ("Elastic. Search, observability, and security platform built on Apache Lucene. DevTools, Search. [full-text search, Elasticsearch, APM, SIEM, log analytics]", False),
    ("Revolut. Digital banking app for personal and business finances across multiple currencies. FinTech, Neobank. [digital banking, multi-currency accounts, money transfers, budgeting, business accounts]", False),
    # Recruitment / staffing negatives (prevent false positives)
    ("Harvey Nash. Global technology recruitment and IT outsourcing firm placing candidates in technology, digital, and transformation roles. Staffing and Recruiting. [technology recruitment, IT staffing, digital transformation, executive search]", False),
    ("Tenth Revolution Group. Global cloud technology staffing specialist. Recruitment firm placing professionals in Salesforce, AWS, Azure, and Microsoft roles. Staffing and Recruiting. [tech recruitment, cloud staffing, IT jobs, contract placement]", False),
    ("Hunter Bond. Global firm specialising in the finance and technology recruitment sectors. Staffing and Recruiting. [financial recruitment, technology jobs, executive search, contract staffing]", False),
    ("Nigel Frank International. Global recruitment agency for Microsoft technology professionals. Staffing and Recruiting. [Microsoft recruitment, Dynamics 365, Azure staffing, IT jobs]", False),
    ("Hamilton Barnes. Network and infrastructure recruitment consultancy placing engineers and architects. Staffing and Recruiting. [network engineer recruitment, infrastructure staffing, IT recruitment]", False),
    ("Investigo. Professional services and technology recruitment consultancy based in London. Staffing and Recruiting. [professional recruitment, technology staffing, interim management, consulting]", False),
    # Neobank / fintech negatives
    ("Monzo Bank. UK digital bank offering current accounts, savings, and financial management tools. FinTech, Neobank. [digital banking, current accounts, savings pots, budgeting, mobile banking]", False),
    # Workflow / infrastructure negatives
    ("Temporal Technologies. Open-source durable execution platform for building reliable distributed applications and workflows. Infrastructure, Developer Tools. [workflow orchestration, durable execution, microservices, distributed systems]", False),
    # AI / ML negatives
    ("Peak AI. AI platform helping businesses apply artificial intelligence to decision-making and operations. AI, Enterprise. [decision intelligence, AI platform, machine learning, predictive analytics]", False),
    ("Nous Research. Open-source AI research lab building large language models and AI tools. AI, Research. [large language models, open-source AI, fine-tuning, model training, AI research]", False),
    # Energy negative
    ("JD Ross Energy. Specialist energy recruitment and staffing consultancy for oil, gas, and renewables sectors. Energy, Staffing. [energy recruitment, oil and gas, renewable energy, power generation]", False),
]


# ── In-memory kNN corpus ──────────────────────────────────────────────────────


class _Corpus:
    """Reference corpus holder with a lazy-loaded normalised embedding matrix."""

    def __init__(self) -> None:
        self.texts: list[str] = [t for t, _ in CORPUS]
        self.labels: np.ndarray = np.array([1 if lbl else 0 for _, lbl in CORPUS], dtype=np.int8)
        self.matrix: np.ndarray | None = None

    async def ensure_loaded(self) -> None:
        if self.matrix is not None:
            return
        log.info("Embedding %d reference corpus texts for crypto classifier", len(self.texts))
        vecs = await embed_texts(self.texts)
        arr = np.asarray(vecs, dtype=np.float32)
        norms = np.linalg.norm(arr, axis=1, keepdims=True)
        norms = np.where(norms < 1e-12, 1.0, norms)
        self.matrix = arr / norms

    async def knn(self, query_vec: list[float], top_k: int) -> list[dict[str, Any]]:
        await self.ensure_loaded()
        assert self.matrix is not None
        q = np.asarray(query_vec, dtype=np.float32)
        n = np.linalg.norm(q)
        if n > 1e-12:
            q = q / n
        sims = self.matrix @ q
        dists = 1.0 - sims
        idx = np.argsort(dists)[:top_k]
        return [
            {
                "text": self.texts[int(i)],
                "label": int(self.labels[int(i)]),
                "distance": float(dists[int(i)]),
                "similarity": float(sims[int(i)]),
            }
            for i in idx
        ]


_CORPUS = _Corpus()


def _truncate(s: str, n: int = 60) -> str:
    return s if len(s) <= n else s[:n] + "..."


# ── Classification text builder (ported from db.rs::build_classification_text)


def _build_classification_text(rec: dict[str, Any]) -> str:
    parts: list[str] = [str(rec.get("name") or "").strip()]

    description = (rec.get("description") or "").strip()
    if description:
        parts.append(description)

    industry = (rec.get("industry") or "").strip()
    if industry:
        parts.append(industry)

    industries = rec.get("industries")
    if isinstance(industries, str) and industries:
        try:
            arr = json.loads(industries)
        except json.JSONDecodeError:
            arr = None
        if isinstance(arr, list) and arr:
            parts.append(", ".join(str(x) for x in arr))

    tags = rec.get("tags")
    if isinstance(tags, str) and tags:
        try:
            arr = json.loads(tags)
        except json.JSONDecodeError:
            arr = None
        if isinstance(arr, list) and arr:
            parts.append("[" + ", ".join(str(x) for x in arr) + "]")

    services = rec.get("services")
    if isinstance(services, str) and services:
        try:
            arr = json.loads(services)
        except json.JSONDecodeError:
            arr = None
        if isinstance(arr, list) and arr:
            parts.append("[" + ", ".join(str(x) for x in arr) + "]")

    joined = ". ".join(p for p in parts if p)
    return joined[:MAX_TEXT_CHARS]


# ── Classifier ────────────────────────────────────────────────────────────────


async def _classify(company_text: str) -> dict[str, Any]:
    """Embed + kNN + distance-weighted majority vote. Mirrors ``CryptoClassifier``."""
    vec_list = await embed_texts([company_text])
    neighbours = await _CORPUS.knn(vec_list[0], TOP_K)

    crypto_count = sum(1 for n in neighbours if n["label"] == 1)
    total = max(len(neighbours), 1)
    is_crypto = crypto_count * 2 > total  # strict majority

    weighted_crypto = 0.0
    weighted_total = 0.0
    for n in neighbours:
        sim = 1.0 / (1.0 + n["distance"])  # identical to Rust conversion
        weighted_total += sim
        if n["label"] == 1:
            weighted_crypto += sim
    if weighted_total > 0.0:
        share = weighted_crypto / weighted_total
        confidence = share if is_crypto else 1.0 - share
    else:
        confidence = 0.5

    top_matches: list[str] = []
    for n in neighbours[:3]:
        tag = "CRYPTO" if n["label"] == 1 else "CLEAN"
        top_matches.append(f"[{tag} d={n['distance']:.3f}] {_truncate(n['text'], 60)}")

    return {
        "is_crypto": bool(is_crypto),
        "confidence": float(confidence),
        "top_matches": top_matches,
    }


# ── State ─────────────────────────────────────────────────────────────────────


class CompanyCleanupState(TypedDict, total=False):
    company_id: int
    delete: bool  # default False -> dry-run (matches Rust binary default)
    company: dict[str, Any]
    classification_text: str
    verdict: dict[str, Any]
    flagged: bool
    deleted: bool
    contacts_deleted: int
    agent_timings: dict[str, float]
    _error: str


# ── Nodes ─────────────────────────────────────────────────────────────────────


async def load(state: CompanyCleanupState) -> dict:
    if state.get("_error"):
        return {}
    company_id = state.get("company_id")
    if company_id is None:
        return {"_error": "load: company_id is required"}

    sql = (
        "SELECT id, key, name, description, industry, industries, tags, services, "
        "category, blocked "
        "FROM companies WHERE id = %s LIMIT 1"
    )
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (int(company_id),))
                row = cur.fetchone()
                if not row:
                    return {"_error": f"load: company id {company_id} not found"}
                cols = [d[0] for d in cur.description or []]
    except psycopg.Error as e:
        return {"_error": f"load: {e}"}

    rec = dict(zip(cols, row))

    # Mirror fetch_companies WHERE-clause guards: skip staffing and rows with
    # no text to classify against.
    if rec.get("blocked"):
        return {"_error": f"load: company id {company_id} is blocked"}
    if (rec.get("category") or "") == "STAFFING":
        return {"_error": f"load: company id {company_id} is STAFFING (already handled)"}

    has_text = any(
        (rec.get(field) or "").strip() not in ("", "[]")
        for field in ("description", "industry", "tags", "services")
    )
    if not has_text:
        return {"_error": f"load: company id {company_id} has no classification text"}

    return {
        "company": {
            "id": rec["id"],
            "key": rec.get("key") or "",
            "name": rec.get("name") or "",
            "description": rec.get("description") or "",
            "industry": rec.get("industry") or "",
            "industries": rec.get("industries") or "",
            "tags": rec.get("tags") or "",
            "services": rec.get("services") or "",
        }
    }


async def build_text(state: CompanyCleanupState) -> dict:
    if state.get("_error"):
        return {}
    company = state.get("company") or {}
    text = _build_classification_text(company)
    if len(text) < MIN_TEXT_CHARS:
        return {
            "_error": f"build_text: too little text ({len(text)} chars) for "
            f"company {company.get('key') or company.get('id')}"
        }
    return {"classification_text": text}


async def classify(state: CompanyCleanupState) -> dict:
    if state.get("_error"):
        return {}
    text = state.get("classification_text") or ""
    if not text:
        return {"_error": "classify: missing classification_text"}

    t0 = time.perf_counter()
    try:
        verdict = await _classify(text)
    except Exception as e:  # noqa: BLE001
        return {"_error": f"classify: {e}"}

    flagged = bool(verdict["is_crypto"]) and float(verdict["confidence"]) >= CONFIDENCE_THRESHOLD
    if flagged:
        company = state.get("company") or {}
        log.info(
            "[company-cleanup] CRYPTO %s (conf=%.2f) | %s",
            company.get("key") or company.get("id"),
            verdict["confidence"],
            (verdict["top_matches"] or [""])[0],
        )

    return {
        "verdict": verdict,
        "flagged": flagged,
        "agent_timings": {"classify": round(time.perf_counter() - t0, 3)},
    }


async def delete_node(state: CompanyCleanupState) -> dict:
    """Transactional delete: contacts first (FK SET NULL), then company."""
    if state.get("_error"):
        return {}
    if not state.get("flagged"):
        return {"deleted": False, "contacts_deleted": 0}
    if not state.get("delete"):
        # Dry-run default — mirrors the Rust binary without ``--delete``.
        company = state.get("company") or {}
        log.info(
            "[company-cleanup] DRY-RUN would delete %s (id=%s)",
            company.get("key"),
            company.get("id"),
        )
        return {"deleted": False, "contacts_deleted": 0}

    company = state.get("company") or {}
    company_id = company.get("id")
    if company_id is None:
        return {"_error": "delete: missing company id"}

    t0 = time.perf_counter()
    contacts_deleted = 0
    try:
        # autocommit=False so all three statements share one transaction;
        # psycopg rolls back automatically if the ``with`` block raises.
        with psycopg.connect(_dsn(), connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT COUNT(*) FROM contacts WHERE company_id = %s",
                    (int(company_id),),
                )
                row = cur.fetchone()
                contacts_deleted = int(row[0]) if row else 0
                cur.execute(
                    "DELETE FROM contacts WHERE company_id = %s",
                    (int(company_id),),
                )
                cur.execute(
                    "DELETE FROM companies WHERE id = %s",
                    (int(company_id),),
                )
            conn.commit()
    except psycopg.Error as e:
        return {"_error": f"delete: {e}"}

    log.info(
        "[company-cleanup] DELETED %s (id=%s) + %d contacts",
        company.get("key"),
        company_id,
        contacts_deleted,
    )
    return {
        "deleted": True,
        "contacts_deleted": contacts_deleted,
        "agent_timings": {"delete": round(time.perf_counter() - t0, 3)},
    }


# ── Graph ─────────────────────────────────────────────────────────────────────


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(CompanyCleanupState)
    builder.add_node("load", load)
    builder.add_node("build_text", build_text)
    builder.add_node("classify", classify)
    builder.add_node("delete", delete_node)
    builder.add_edge(START, "load")
    builder.add_edge("load", "build_text")
    builder.add_edge("build_text", "classify")
    builder.add_edge("classify", "delete")
    builder.add_edge("delete", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
