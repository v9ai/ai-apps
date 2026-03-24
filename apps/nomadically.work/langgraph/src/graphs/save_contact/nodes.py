"""Node for the save_contact pipeline."""

import json
import sys

from .state import SaveContactState


def save_contact_node(state: SaveContactState) -> dict:
    name = state.get("recipient_name", "").strip()
    email = state.get("recipient_email", "").strip() or None
    role = state.get("recipient_role", "")
    post_url = state.get("post_url", "")

    if not name:
        print("  [save_contact] No recipient name, skipping", file=sys.stderr)
        return {"contact_id": None}

    # Split name into first/last
    parts = name.split(None, 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ""

    # Extract position and company from role (e.g. "CTO at Acme Inc")
    position = role
    company = None
    for sep in [" at ", " @ ", " - ", ", "]:
        if sep in role:
            position = role.split(sep, 1)[0].strip()
            company = role.split(sep, 1)[1].strip()
            break

    # Build linkedin_url from post_url if it's a linkedin URL
    linkedin_url = None
    if post_url and "linkedin.com" in post_url:
        linkedin_url = post_url

    print(f"  [save_contact] Upserting {first_name} {last_name} ({email})", file=sys.stderr)

    try:
        from src.db.connection import get_connection
        from src.db.mutations import upsert_contact

        conn = get_connection()
        contact_id = upsert_contact(
            conn,
            first_name=first_name,
            last_name=last_name,
            email=email,
            position=position or None,
            company=company,
            linkedin_url=linkedin_url,
            tags=json.dumps(["linkedin-outreach"]),
        )
        conn.close()
        print(f"  [save_contact] Contact saved: id={contact_id}", file=sys.stderr)
        return {"contact_id": contact_id}
    except Exception as e:
        print(f"  [save_contact] Failed to save contact: {e}", file=sys.stderr)
        return {"contact_id": None}
