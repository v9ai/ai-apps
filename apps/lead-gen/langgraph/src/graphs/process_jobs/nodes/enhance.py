"""Phase 1 — Enhancement node.

Advances new jobs directly to 'enhanced' status.
"""

from src.db.connection import get_connection
from src.db.mutations import promote_new_jobs


def enhance_jobs_node(state: dict) -> dict:
    """Phase 1 node: advance new jobs to 'enhanced' status."""
    conn = get_connection()

    enhanced = promote_new_jobs(conn)
    print(f"  Promoted {enhanced} new jobs to 'enhanced'")

    conn.close()
    return {"phase_results": [{"phase": "enhance", "enhanced": enhanced, "errors": 0}]}
