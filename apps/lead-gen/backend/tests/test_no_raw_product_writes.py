"""Enforce that pricing_analysis / gtm_analysis writes funnel through
``db_columns.persist_product_jsonb``.

Fix 3 narrows the transactional-writer contract to the two jsonb columns
that this hygiene pass covers (pricing + GTM). Other ``UPDATE products SET``
sites (icp_analysis, intel_report, positioning_analysis, freshness_snapshot)
are intentionally out of scope here — expanding the whitelist to them is a
follow-up.
"""

from __future__ import annotations

import re
from pathlib import Path

AGENT_DIR = Path(__file__).resolve().parent.parent / "leadgen_agent"
ALLOWED = {"db_columns.py"}
COVERED_COLUMNS = ("pricing_analysis", "gtm_analysis")
PATTERN = re.compile(
    r"UPDATE\s+products\s+SET\s+(" + "|".join(COVERED_COLUMNS) + r")\b",
    re.IGNORECASE | re.DOTALL,
)


def test_no_raw_pricing_or_gtm_writes_outside_db_columns() -> None:
    offenders: list[tuple[str, str]] = []
    for path in sorted(AGENT_DIR.rglob("*.py")):
        if path.name in ALLOWED:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        if PATTERN.search(text):
            match = PATTERN.search(text)
            offenders.append(
                (str(path.relative_to(AGENT_DIR.parent)), match.group(0) if match else "")
            )
    assert not offenders, (
        "Raw `UPDATE products SET pricing_analysis/gtm_analysis` writes must go "
        "through db_columns.persist_product_jsonb:\n"
        + "\n".join(f"  {f}: {src}" for f, src in offenders)
    )
