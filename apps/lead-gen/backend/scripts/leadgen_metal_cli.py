"""CLI port of the Rust ``leadgen-metal`` binary.

Replaces ``crates/metal/src/main.rs`` (clap-based, 20+ subcommands) with an
argparse-based Python CLI that dispatches to the ported LangGraph pipeline
(``leadgen_agent.pipeline_graph``) and a handful of small helper queries
against Neon.

Usage (from backend/):
    uv run python scripts/leadgen_metal_cli.py pipeline --yes
    uv run python scripts/leadgen_metal_cli.py pipeline --domains domains.txt --yes
    uv run python scripts/leadgen_metal_cli.py status
    uv run python scripts/leadgen_metal_cli.py top 20
    uv run python scripts/leadgen_metal_cli.py stage enrich
    uv run python scripts/leadgen_metal_cli.py block add example.com
    uv run python scripts/leadgen_metal_cli.py block list
    uv run python scripts/leadgen_metal_cli.py intent-detect
    uv run python scripts/leadgen_metal_cli.py ml-datagen --output data/labels.jsonl
    uv run python scripts/leadgen_metal_cli.py ml-eval --labels data/labels.jsonl --report-dir data/reports
    uv run python scripts/leadgen_metal_cli.py ml-optimize --labels data/labels.jsonl --output data/models

Requires: numpy
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from pathlib import Path

# ── Load env vars ─────────────────────────────────────────────────────────
_ROOT = Path(__file__).resolve().parents[2]  # apps/lead-gen/
_env_local = _ROOT / ".env.local"
_env_backend = Path(__file__).resolve().parents[1] / ".env"

for _envfile in (_env_backend, _env_local):
    if _envfile.exists():
        for line in _envfile.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import psycopg  # noqa: E402

from leadgen_agent import blocklist  # noqa: E402
from leadgen_agent.deep_icp_graph import _dsn  # noqa: E402
from leadgen_agent.pipeline_graph import (  # noqa: E402
    build_graph as build_pipeline_graph,
    run_contacts,
    run_discover,
    run_enrich,
    run_outreach,
    run_qa,
)

log = logging.getLogger("leadgen_metal_cli")


# ── Commands: pipeline / stage ──────────────────────────────────────────


async def cmd_pipeline(args: argparse.Namespace) -> int:
    domains: list[str] = []
    if args.domains:
        p = Path(args.domains)
        if not p.exists():
            print(f"domains file not found: {p}", file=sys.stderr)
            return 2
        domains = [
            line.strip()
            for line in p.read_text().splitlines()
            if line.strip() and not line.startswith("#")
        ]
        print(f"  Loaded {len(domains)} domains from {p}")

    if not args.yes:
        print("  --yes not set; outreach will be gated behind approval.")

    graph = build_pipeline_graph()
    payload: dict = {
        "domains": domains,
        "auto_confirm": bool(args.yes),
        "run_all": bool(args.all),
        "max_per_stage": args.limit,
        "seed_query": args.seed or os.environ.get("ICP_VERTICAL") or "AI consultancy remote",
    }
    result = await graph.ainvoke(payload)
    reports = result.get("reports") or []
    _print_reports(reports)
    return 0 if all(r.get("status") in ("OK", "SKIP") for r in reports) else 1


async def cmd_stage(args: argparse.Namespace) -> int:
    name = args.name.lower()
    state: dict = {"auto_confirm": True, "max_per_stage": args.limit}
    if args.domains:
        p = Path(args.domains)
        if p.exists():
            state["domains"] = [
                ln.strip() for ln in p.read_text().splitlines()
                if ln.strip() and not ln.startswith("#")
            ]

    runners = {
        "discover": run_discover,
        "enrich": run_enrich,
        "contacts": run_contacts,
        "qa": run_qa,
        "outreach": run_outreach,
    }
    if name not in runners:
        print(f"unknown stage: {name} (valid: {', '.join(runners)})", file=sys.stderr)
        return 2

    out = await runners[name](state)
    reports = out.get("reports") or []
    _print_reports(reports)
    return 0


# ── Commands: status / top ──────────────────────────────────────────────


def cmd_status(_args: argparse.Namespace) -> int:
    """Print pipeline funnel from Neon (replaces the Rust ``state::assess``
    action plan). Does not run anything, read-only snapshot."""
    dsn = _dsn()
    queries = [
        ("discovered", "SELECT COUNT(*) FROM companies"),
        (
            "enriched",
            "SELECT COUNT(*) FROM companies WHERE category IS NOT NULL AND ai_tier IS NOT NULL",
        ),
        ("contacts", "SELECT COUNT(*) FROM contacts"),
        (
            "contacts_with_email",
            "SELECT COUNT(*) FROM contacts WHERE email IS NOT NULL AND email <> ''",
        ),
    ]
    print("  ── Pipeline Status ──")
    with psycopg.connect(dsn, autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            for label, sql in queries:
                try:
                    cur.execute(sql)
                    n = (cur.fetchone() or [0])[0]
                    print(f"  {label:<22} {n:>8}")
                except psycopg.Error as e:
                    print(f"  {label:<22} ERROR: {e}")
    try:
        n = blocklist.count()
        print(f"  {'blocklist':<22} {n:>8}")
    except Exception as e:  # noqa: BLE001
        print(f"  blocklist              ERROR: {e}")
    return 0


def cmd_top(args: argparse.Namespace) -> int:
    n = args.n
    sql = """
        SELECT canonical_domain, name, category, ai_tier, score
        FROM companies
        WHERE score IS NOT NULL
        ORDER BY score DESC NULLS LAST
        LIMIT %s
    """
    print(f"  ── Top {n} Companies by Score ──")
    print(f"  {'#':<4} {'Domain':<30} {'Category':<14} {'AI Tier':<10} {'Score':<6}")
    print(f"  {'─' * 70}")
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (n,))
            for i, row in enumerate(cur.fetchall(), 1):
                domain, _name, category, ai_tier, score = row
                pct = (float(score) * 100.0) if score is not None else 0.0
                print(
                    f"  {i:<4} {(domain or '')[:30]:<30} "
                    f"{(category or '-')[:14]:<14} "
                    f"{(ai_tier or '-')[:10]:<10} "
                    f"{pct:>5.1f}%"
                )
    return 0


# ── Commands: block add/remove/list ─────────────────────────────────────


def cmd_block(args: argparse.Namespace) -> int:
    action = args.block_action
    if action == "add":
        inserted = blocklist.add(args.domain)
        if inserted:
            print(f"  Blocked: {blocklist.canonicalize_domain(args.domain)}")
        else:
            print(f"  Already blocked: {blocklist.canonicalize_domain(args.domain)}")
        print(f"  Total: {blocklist.count()} blocked domains")
        return 0
    if action == "remove":
        removed = blocklist.remove(args.domain)
        if removed:
            print(f"  Unblocked: {blocklist.canonicalize_domain(args.domain)}")
        else:
            print(f"  Not found: {blocklist.canonicalize_domain(args.domain)}")
        print(f"  Total: {blocklist.count()} blocked domains")
        return 0
    if action == "list":
        rows = blocklist.list_all()
        if not rows:
            print("  No blocked domains")
            return 0
        print(f"  Blocked domains ({len(rows)}):")
        for b in rows:
            reason = f" — {b.reason}" if b.reason else ""
            print(f"    {b.domain}{reason}")
        return 0
    print(f"unknown block action: {action}", file=sys.stderr)
    return 2


# ── Commands: intent-detect ─────────────────────────────────────────────


def cmd_intent_detect(args: argparse.Namespace) -> int:
    """Intent signal detection.

    TODO(port): the Rust implementation used a distilled IntentClassifier
    (logistic weights) in ``crates/metal/src/teams/intent.rs`` with an LLM
    fallback. The Python port should call the existing BGE-M3 embedder
    (``leadgen_agent.embeddings``) + ``icp_scoring.LogisticScorer`` once
    the training loop is ported. For now this is a stub so the CLI
    surface stays in parity.
    """
    mode = "fast (distilled classifier)" if args.fast else "LLM"
    print(f"  intent-detect ({mode}): not yet ported — see TODO in leadgen_metal_cli.py")
    print(f"  target domain: {args.domain or 'all'}")
    return 0


# ── Commands: ml-datagen / ml-eval / ml-optimize (stubs) ────────────────


def cmd_ml_datagen(args: argparse.Namespace) -> int:
    """Generate synthetic ML training data.

    TODO(port): ``crates/metal/src/kernel/data_gen.rs`` produced contact
    labels + remote-worldwide labels via templated generators. The Python
    port should emit the same JSONL shape so the existing evaluator still
    runs. Re-implement against ``icp_scoring`` + DB-sampled real companies
    for realistic distributions.
    """
    print(f"  ml-datagen: not yet ported — would write {args.count} samples to {args.output}")
    return 0


def cmd_ml_eval(args: argparse.Namespace) -> int:
    """Run ML eval harness on labeled data.

    TODO(port): ``crates/metal/src/kernel/ml_eval.rs`` loaded a
    ``LogisticScorer`` and computed F1/precision/recall/AUC/NDCG@10.
    ``leadgen_agent.icp_scoring.LogisticScorer`` already has the model
    surface; a follow-up session needs to add the metric computations
    (use scikit-learn or numpy directly) and the per-iteration report
    writer.
    """
    print(f"  ml-eval: not yet ported — would evaluate {args.labels} → {args.report_dir}")
    return 0


def cmd_ml_optimize(args: argparse.Namespace) -> int:
    """Optimize ML weights (grid search + SGD + isotonic calibration).

    TODO(port): ``crates/metal/src/kernel/weight_optimizer.rs`` ran a
    grid search across ICP weights followed by SGD fine-tuning and
    isotonic calibration. The three pieces exist in
    ``leadgen_agent.icp_scoring`` (``LogisticScorer`` + ``IsotonicCalibrator``);
    wire them together here and persist ``logistic_scorer.json`` +
    ``icp_weights.json`` + ``optimization_result.json`` into ``--output``.
    """
    print(f"  ml-optimize: not yet ported — would train on {args.labels} → {args.output}")
    return 0


# ── Output helpers ──────────────────────────────────────────────────────


def _print_reports(reports: list[dict]) -> None:
    if not reports:
        print("  (no stage reports)")
        return
    print()
    print("  ── Run Summary ──")
    total_ms = 0
    for r in reports:
        dur = int(r.get("duration_ms") or 0)
        total_ms += dur
        errs = r.get("errors") or []
        err_sample = f" {errs[0][:80]}" if errs else ""
        print(
            f"  [{(r.get('status') or '?'):>7}] {(r.get('stage') or '?'):<10} "
            f"processed={r.get('processed', 0):<4} "
            f"created={r.get('created', 0):<4} "
            f"errors={len(errs)} ({dur / 1000:.1f}s){err_sample}"
        )
    print(f"  ─────────────────")
    print(f"  Total: {total_ms / 1000:.1f}s")


# ── Main ────────────────────────────────────────────────────────────────


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="leadgen-metal",
        description="B2B lead generation pipeline — Python port of leadgen-metal.",
    )
    sub = p.add_subparsers(dest="command", required=True)

    # pipeline
    pp = sub.add_parser("pipeline", help="Run the full pipeline")
    pp.add_argument("--domains", help="Domains file (one per line)")
    pp.add_argument("-y", "--yes", action="store_true", help="Skip approval gate")
    pp.add_argument("-a", "--all", action="store_true", help="Run all stages")
    pp.add_argument("--seed", help="Discovery seed query")
    pp.add_argument("--limit", type=int, default=None, help="Max rows per stage")

    # status
    sub.add_parser("status", help="Show pipeline funnel from Neon")

    # top
    pt = sub.add_parser("top", help="Show top N companies by score")
    pt.add_argument("n", type=int, nargs="?", default=20)

    # stage
    ps = sub.add_parser("stage", help="Run a single stage")
    ps.add_argument("name", help="Stage name: discover|enrich|contacts|qa|outreach")
    ps.add_argument("--domains", help="Domains file (discover stage)")
    ps.add_argument("--limit", type=int, default=None)

    # block add/remove/list
    pb = sub.add_parser("block", help="Manage domain blocklist")
    bsub = pb.add_subparsers(dest="block_action", required=True)
    ba = bsub.add_parser("add", help="Add a domain to the blocklist")
    ba.add_argument("domain")
    br = bsub.add_parser("remove", help="Remove a domain from the blocklist")
    br.add_argument("domain")
    bsub.add_parser("list", help="List all blocked domains")

    # intent-detect
    pi = sub.add_parser("intent-detect", help="Detect intent signals for companies")
    pi.add_argument("--domain", help="Only process this domain")
    pi.add_argument("--fast", action="store_true", help="Use distilled classifier (stub)")

    # ml-datagen
    pmd = sub.add_parser("ml-datagen", help="Generate synthetic ML training data (stub)")
    pmd.add_argument("--output", type=Path, required=True)
    pmd.add_argument("--count", type=int, default=330)

    # ml-eval
    pme = sub.add_parser("ml-eval", help="Run ML eval harness (stub)")
    pme.add_argument("--labels", type=Path, required=True)
    pme.add_argument("--report-dir", type=Path, required=True)
    pme.add_argument("--scoring-only", action="store_true")

    # ml-optimize
    pmo = sub.add_parser("ml-optimize", help="Optimize ML weights (stub)")
    pmo.add_argument("--labels", type=Path, required=True)
    pmo.add_argument("--output", type=Path, required=True)

    return p


def main() -> int:
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    )
    parser = _build_parser()
    args = parser.parse_args()
    cmd = args.command

    try:
        if cmd == "pipeline":
            return asyncio.run(cmd_pipeline(args))
        if cmd == "stage":
            return asyncio.run(cmd_stage(args))
        if cmd == "status":
            return cmd_status(args)
        if cmd == "top":
            return cmd_top(args)
        if cmd == "block":
            return cmd_block(args)
        if cmd == "intent-detect":
            return cmd_intent_detect(args)
        if cmd == "ml-datagen":
            return cmd_ml_datagen(args)
        if cmd == "ml-eval":
            return cmd_ml_eval(args)
        if cmd == "ml-optimize":
            return cmd_ml_optimize(args)
    except KeyboardInterrupt:
        print("\n  Interrupted.", file=sys.stderr)
        return 130
    print(f"unknown command: {cmd}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
