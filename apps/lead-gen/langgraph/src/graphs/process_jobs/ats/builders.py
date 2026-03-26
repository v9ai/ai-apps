"""ATS update builders — ported verbatim from workers/process-jobs/src/entry.py.

Build column name + value lists for DB updates from ATS API responses.
"""

import json
from datetime import datetime, timezone


def _json_col(val) -> str | None:
    """Serialize a value to JSON for a TEXT column, or None."""
    if val is None:
        return None
    return json.dumps(val)


def build_greenhouse_update(data: dict) -> tuple[list[str], list]:
    """Build column=? pairs and params for a Greenhouse job update."""
    cols = [
        "absolute_url", "internal_job_id", "requisition_id", "company_name",
        "first_published", "language",
    ]
    vals = [data.get(c) for c in cols]

    # JSON columns
    json_cols = [
        "metadata", "departments", "offices", "questions",
        "location_questions", "compliance", "demographic_questions",
        "data_compliance",
    ]
    for c in json_cols:
        cols.append(c)
        vals.append(_json_col(data.get(c, [])))

    # Optional overrides
    if data.get("content"):
        cols.append("description")
        vals.append(data["content"])
    loc = (data.get("location") or {})
    if isinstance(loc, dict) and loc.get("name"):
        cols.append("location")
        vals.append(loc["name"])

    return cols, vals


def build_lever_update(data: dict) -> tuple[list[str], list]:
    """Build column=? pairs and params for a Lever job update."""
    cols = []
    vals = []

    def _add(col, val):
        cols.append(col)
        vals.append(val)

    _add("absolute_url", data.get("hostedUrl") or data.get("applyUrl"))
    _add("company_name", data.get("text"))
    _add("description", data.get("description") or data.get("descriptionPlain"))
    _add("location", (data.get("categories") or {}).get("location"))
    _add("categories", _json_col(data.get("categories")))
    _add("workplace_type", data.get("workplaceType"))
    _add("country", data.get("country"))
    _add("opening", data.get("opening"))
    _add("opening_plain", data.get("openingPlain"))
    _add("description_body", data.get("descriptionBody"))
    _add("description_body_plain", data.get("descriptionBodyPlain"))
    _add("additional", data.get("additional"))
    _add("additional_plain", data.get("additionalPlain"))
    _add("lists", _json_col(data.get("lists", [])))

    created = data.get("createdAt")
    if isinstance(created, (int, float)):
        _add("ats_created_at", datetime.fromtimestamp(created / 1000, tz=timezone.utc).isoformat())
    else:
        _add("ats_created_at", created)

    return cols, vals


def build_ashby_update(data: dict, board_name: str) -> tuple[list[str], list]:
    """Build column=? pairs and params for an Ashby job update.

    Writes both common columns and Ashby-specific columns
    (ashby_department, ashby_team, ashby_employment_type, etc.).
    """
    cols = []
    vals = []

    def _add(col, val):
        cols.append(col)
        vals.append(val)

    # Common columns
    _add("absolute_url", data.get("jobUrl") or data.get("applyUrl"))
    _add("company_name", board_name)
    _add("description", data.get("descriptionHtml") or data.get("descriptionPlain"))
    _add("location", data.get("locationName") or data.get("location"))
    _add("workplace_type", "remote" if data.get("isRemote") else None)

    address = data.get("address") or {}
    postal = address.get("postalAddress") or {}
    _add("country", postal.get("addressCountry"))
    _add("ats_created_at", data.get("publishedAt"))

    # Ashby-specific columns
    _add("ashby_department", data.get("department"))
    _add("ashby_team", data.get("team"))
    _add("ashby_employment_type", data.get("employmentType"))
    is_remote = data.get("isRemote")
    _add("ashby_is_remote", (1 if is_remote else 0) if is_remote is not None else None)
    is_listed = data.get("isListed")
    _add("ashby_is_listed", (1 if is_listed else 0) if is_listed is not None else None)
    _add("ashby_published_at", data.get("publishedAt"))
    _add("first_published", data.get("publishedAt"))
    _add("ashby_job_url", data.get("jobUrl"))
    _add("ashby_apply_url", data.get("applyUrl"))
    _add("ashby_secondary_locations", _json_col(data.get("secondaryLocations")))
    _add("ashby_compensation", _json_col(data.get("compensation")))
    _add("ashby_address", _json_col(data.get("address")))

    # Categories — aggregated view for compatibility
    categories = {
        "department": data.get("department"),
        "team": data.get("team"),
        "location": data.get("location"),
        "allLocations": list(filter(None, [
            data.get("location"),
            *(
                loc.get("location")
                for loc in (data.get("secondaryLocations") or [])
            ),
        ])),
    }
    _add("categories", _json_col(categories))

    return cols, vals
