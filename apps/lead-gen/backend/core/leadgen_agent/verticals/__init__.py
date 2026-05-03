"""Product-vertical registry.

Importing this package populates ``registry.VERTICALS`` with every product
module listed below. The generic enrichment scorer and discovery harvester
iterate ``VERTICALS`` — they never import product modules directly.

Adding a new product:
    1. Create ``verticals/<slug>.py`` constructing a ``ProductVertical``
       and calling ``register(it)`` (or assigning via ``register(...)``).
    2. Add ``from . import <slug>`` here.
    3. Done — no graph code changes needed.
"""

from __future__ import annotations

from .registry import (  # noqa: F401 — re-exports
    VERTICALS,
    AntiIcpPredicate,
    ProductVertical,
    SignalRule,
    all_verticals,
    apply_signal_rules,
    compute_score_and_tier,
    get_vertical,
    register,
)

# Import each vertical module to register it. Order determines default
# iteration order only when sorted() is bypassed — all_verticals() sorts by slug.
from . import compliance_audit  # noqa: F401,E402
from . import ingestible  # noqa: F401,E402
from . import onboardingtutor  # noqa: F401,E402

__all__ = [
    "VERTICALS",
    "AntiIcpPredicate",
    "ProductVertical",
    "SignalRule",
    "all_verticals",
    "apply_signal_rules",
    "compute_score_and_tier",
    "get_vertical",
    "register",
    "compliance_audit",
    "ingestible",
    "onboardingtutor",
]
