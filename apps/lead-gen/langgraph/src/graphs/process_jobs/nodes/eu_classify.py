"""Phase 3 — EU Remote Classification node.

Delegates to the eu_classifier subgraph for each role-match job.
"""

from src.db.connection import get_connection
from src.db.queries import fetch_role_match_jobs
from src.graphs.eu_classifier import build_eu_classifier_graph


def eu_classify_jobs_node(state: dict) -> dict:
    """Phase 3 node: classify role-match jobs for EU-remote eligibility."""
    conn = get_connection()
    rows = fetch_role_match_jobs(conn, state.get("limit", 100))
    conn.close()
    print(f"  Found {len(rows)} jobs to EU-classify")

    graph = build_eu_classifier_graph()
    stats = {"processed": 0, "euRemote": 0, "nonEu": 0, "errors": 0}

    for job in rows:
        try:
            result = graph.invoke({
                "job": dict(job),
                "signals": None,
                "classification": None,
                "source": "",
            })
            classification = result.get("classification") or {}
            is_eu = classification.get("isRemoteEU", False)
            stats["processed"] += 1
            if is_eu:
                stats["euRemote"] += 1
            else:
                stats["nonEu"] += 1
        except Exception as e:
            print(f"    Error classifying {job.get('id')}: {e}")
            stats["errors"] += 1

    return {"phase_results": [{"phase": "eu_classify", **stats}]}
