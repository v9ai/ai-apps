"""OnboardingTutor — AI-powered onboarding & knowledge platform.

Targets companies that
  (a) run complex codebases (monorepos, microservices, polyglot stacks)
      where engineer ramp-up is slow and tribal-knowledge transfer hurts,
  (b) maintain distributed engineering teams with scattered internal docs,
  (c) ship safety-critical / regulated software and need cyclomatic-complexity
      reports, dependency traceability, and authority-leveled policy RAG for
      yearly ISO 26262 / IEC 61508 / DO-178C / ISO 27001 audits.

Pain mapped from products.icp_analysis (segments fit >= 0.7):
  - "Tech Companies with Complex Codebases" (0.90)
  - "Compliance Auditors / Functional-Safety Engineers" (0.88)
  - "Companies with Regulatory/Compliance Needs" (0.80)
  - "Organizations with Distributed Knowledge" (0.70)

Note: compliance_audit (product_id=2) covers the audit-prep buyer directly;
this vertical overlaps deliberately on functional-safety signals because
OnboardingTutor's segment 4 is auditor-adjacent (CKB ships Tarjan SCC,
hotspot detection, complexity metrics natively). Both verticals fire
independently per (company_id, product_id).
"""

from __future__ import annotations

import re

from .registry import AntiIcpPredicate, ProductVertical, SignalRule, register


# ── Signal rules ──────────────────────────────────────────────────────────

_SIGNAL_RULES: tuple[SignalRule, ...] = (
    # --- engineering_maturity_signal (label) ---
    # Patterns chosen to match against (path + query) text in
    # vertical_discovery_graph._classify_stack — every github_code_query
    # must produce a non-None stack_label or filter_hits drops the row.
    # These also fire on home/careers prose when companies mention ADRs,
    # engineering handbooks, or monorepo tooling explicitly.
    SignalRule(
        key="engineering_maturity_signal",
        pattern=re.compile(
            r"0001-record-architecture-decisions|docs?/adr|"
            r"doc/architecture/decisions|"
            r"\b(?:architecture[- ]decision[- ]records?|ADR practice)\b",
            re.I,
        ),
        kind="label",
        label="adr_practice",
    ),
    SignalRule(
        key="engineering_maturity_signal",
        pattern=re.compile(
            r"engineering[- ]handbook|onboarding\.md|"
            r"\bnew[- ]engineer\b|\bonboarding playbook\b",
            re.I,
        ),
        kind="label",
        label="onboarding_docs",
    ),
    SignalRule(
        key="engineering_maturity_signal",
        pattern=re.compile(
            r"(?:^|[/\s])(?:nx\.json|turbo\.json|pnpm-workspace\.yaml|lerna\.json)\b",
            re.I,
        ),
        kind="label",
        label="monorepo_at_scale",
    ),
    # --- complex_codebase_signal (label) — segment 1 (fit 0.90) ---
    # Order: most specific first; first_match_wins keeps a single label.
    SignalRule(
        key="complex_codebase_signal",
        pattern=re.compile(
            r"\b(\d{2,4}\+?\s+(?:micro)?services?|hundreds of (?:micro)?services|"
            r"100\+\s+repos|polyrepo at scale)\b",
            re.I,
        ),
        kind="label",
        label="service_scale",
    ),
    SignalRule(
        key="complex_codebase_signal",
        pattern=re.compile(
            r"\b(monorepo|micro[- ]?services? architecture|polyglot (?:stack|codebase)|"
            r"service[- ]oriented architecture|SOA)\b",
            re.I,
        ),
        kind="label",
        label="complex_architecture",
    ),
    SignalRule(
        key="complex_codebase_signal",
        pattern=re.compile(
            r"\b(legacy (?:system|code|codebase|monolith)|technical debt|tech debt)\b",
            re.I,
        ),
        kind="label",
        label="legacy_burden",
    ),
    # --- onboarding_pain_signal (bool) — direct pain in copy ---
    SignalRule(
        key="onboarding_pain_signal",
        pattern=re.compile(
            r"\b(time[- ]to[- ]productivity|ramp[- ]?up time|onboarding (?:new |)engineers?|"
            r"new[- ]hire (?:onboarding|ramp)|knowledge transfer|knowledge silos?|"
            r"tribal knowledge|undocumented code|institutional knowledge|"
            r"developer onboarding)\b",
            re.I,
        ),
        kind="bool",
    ),
    # --- distributed_team_signal (bool) — segment 3 ---
    SignalRule(
        key="distributed_team_signal",
        pattern=re.compile(
            r"\b(remote[- ]first|globally distributed (?:team|engineering)|"
            r"distributed engineering|async[- ]first|fully remote|"
            r"engineers? across \d+ (?:time ?zones|countries))\b",
            re.I,
        ),
        kind="bool",
    ),
    # --- functional_safety_exposure (label) — segment 4 (fit 0.88) ---
    SignalRule(
        key="functional_safety_exposure",
        pattern=re.compile(r"\bISO[- ]?26262\b|\bASIL[- ]?[A-D]\b", re.I),
        kind="label",
        label="iso_26262",
    ),
    SignalRule(
        key="functional_safety_exposure",
        pattern=re.compile(r"\bIEC[- ]?61508\b|\bSIL[- ]?[1-4]\b", re.I),
        kind="label",
        label="iec_61508",
    ),
    SignalRule(
        key="functional_safety_exposure",
        pattern=re.compile(r"\bDO[- ]?178[BC]?\b", re.I),
        kind="label",
        label="do_178c",
    ),
    SignalRule(
        key="functional_safety_exposure",
        pattern=re.compile(r"\bMISRA(?:[- ]C(?:\+\+)?)?\b|\bCERT[- ]?C(?:\+\+)?\b", re.I),
        kind="label",
        label="misra_cert",
    ),
    # --- compliance_doc_signal (bool) — policy/document corpus pain ---
    SignalRule(
        key="compliance_doc_signal",
        pattern=re.compile(
            r"\b(SOC[- ]?2|ISO[- ]?27001|HIPAA|PCI[- ]?DSS|FedRAMP|HITRUST|"
            r"GDPR (?:compliance|policies)|FDA 510\(k\)|MDR|EU MDR|"
            r"cyclomatic complexity|traceability matri(?:x|ces)|"
            r"requirements traceability)\b",
            re.I,
        ),
        kind="bool",
    ),
    # --- hiring_engineering_signal (bool) — actively scaling = onboarding cohort ---
    SignalRule(
        key="hiring_engineering_signal",
        pattern=re.compile(
            r"\b(hiring engineers?|growing (?:our |the )?engineering team|"
            r"scaling (?:our |the )?engineering|engineering team is (?:growing|expanding)|"
            r"doubl(?:ing|ed) (?:our |the )?engineering|join our engineering team)\b",
            re.I,
        ),
        kind="bool",
    ),
)


# ── Anti-ICP predicates ───────────────────────────────────────────────────

_ANTI_ICP: tuple[AntiIcpPredicate, ...] = (
    AntiIcpPredicate(
        name="competing_lms_or_kb_vendor",
        predicate="domain_in",
        value=[
            # LMS / training platforms — direct competitors
            "workramp.com",
            "lessonly.com",
            "docebo.com",
            "pluralsight.com",
            "udemy.com",
            "coursera.org",
            "skillsoft.com",
            "cornerstoneondemand.com",
            "trainual.com",
            "sana.ai",
            # Knowledge-base / wiki competitors
            "guru.com",
            "notion.so",
            "confluence.atlassian.com",
            "slab.com",
            "tettra.com",
            # Dev-onboarding-adjacent tools
            "sourcegraph.com",
            "swimm.io",
            "stepsize.com",
        ],
        reason="Coopetition — LMS / KB / dev-onboarding vendors ship their own tooling.",
    ),
    AntiIcpPredicate(
        name="non_technical_business",
        predicate="description_regex",
        value=(
            r"(?i)\b(retail (?:chain|store)|restaurant chain|hospitality group|"
            r"food service|landscaping|cleaning service|laundromat|"
            r"hair salon|nail salon)\b"
        ),
        reason="Non-technical SMB — no codebase, no software-onboarding pain.",
    ),
    AntiIcpPredicate(
        name="solo_or_micro_team",
        predicate="description_regex",
        value=(
            r"(?i)\b(solo (?:founder|developer)|one[- ]person (?:team|company)|"
            r"two[- ]person startup|indie hacker|side project)\b"
        ),
        reason="No onboarding cohort — too small to need OnboardingTutor.",
    ),
    AntiIcpPredicate(
        name="basic_onboarding_only",
        predicate="description_regex",
        value=(
            r"(?i)\b(checklist app|simple onboarding tool|paper onboarding|"
            r"manual onboarding only)\b"
        ),
        reason="Anti-ICP per icp_analysis — basic checklist tools without AI/integration.",
    ),
)


# ── GitHub code-search queries + filters ──────────────────────────────────
#
# Strategy: surface organisations whose public code reveals the kind of
# complexity (or compliance burden) that creates an onboarding-tooling pain
# — not "are they teaching things" but "do their codebases need a CKB."
#
# Three angles:
#   (1) Architectural Decision Records — only orgs with mature engineering
#       culture and a complex topology bother to author ADRs.
#   (2) Public engineering / employee handbooks (GitLab-style) — proxy for
#       teams that take onboarding documentation seriously.
#   (3) Functional-safety artefacts (MISRA configs, ISO 26262 traceability) —
#       directly maps to segment 4.

_GITHUB_QUERIES: tuple[str, ...] = (
    # ADRs — mature engineering organisations with complex topologies
    "filename:0001-record-architecture-decisions.md",
    "path:docs/adr extension:md pushed:>2026-01-01",
    "path:doc/architecture/decisions extension:md pushed:>2026-01-01",
    # Engineering / onboarding handbooks
    "filename:engineering-handbook.md pushed:>2026-01-01",
    "filename:onboarding.md path:docs pushed:>2026-01-01",
    "filename:CONTRIBUTING.md \"new engineer\" pushed:>2026-01-01",
    # Monorepo configs at scale (Nx / Turborepo) — complex internal topology
    "filename:nx.json \"projects\" pushed:>2026-01-01",
    "filename:turbo.json \"pipeline\" pushed:>2026-01-01",
    # Functional-safety artefacts (segment 4)
    "\"ISO 26262\" filename:traceability",
    "filename:.misra-c.conf",
    "\"MISRA-C:2012\" extension:md",
)

_GITHUB_OWNER_DENY: frozenset[str] = frozenset(
    {
        # ADR template / tooling authors (false positives)
        "joelparkerhenderson",
        "npryce",
        # Monorepo tool authors
        "nrwl",
        "vercel",
        "lerna",
        # LMS / KB / dev-onboarding competitors
        "workramp",
        "lessonly",
        "docebo",
        "pluralsight",
        "linkedin",
        "coursera",
        "swimm-io",
        "sourcegraph",
        # Generic noise
        "github",
    }
)

_GITHUB_FILTER_OUT: tuple[re.Pattern[str], ...] = (
    re.compile(
        r"(?i)(tutorial|cheat(?:sheet)?|awesome|^examples?$|^demo$|"
        r"^starter$|workshop|exercise)"
    ),
)


# ── Email templates keyed by step ─────────────────────────────────────────
#
# Templates not yet seeded; the email_outreach graph skips missing names so
# discovery + scoring can run before outreach is wired. Seed rows in
# email_templates with tags = ["product:onboardingtutor", "sequence:outreach",
# "step:N"] before the first send.

_TEMPLATE_NAME_BY_STEP: dict[int, str] = {
    0: "onboardingtutor_outreach_day0",
    4: "onboardingtutor_outreach_day4",
    13: "onboardingtutor_outreach_day13",
}


# ── Keywords for the LLM expander ─────────────────────────────────────────

_KEYWORDS: tuple[str, ...] = (
    "developer onboarding",
    "engineer ramp-up",
    "time to productivity",
    "knowledge transfer",
    "tribal knowledge",
    "knowledge silos",
    "internal documentation",
    "engineering handbook",
    "architectural decision records",
    "codebase complexity",
    "monorepo",
    "microservices architecture",
    "distributed engineering team",
    "remote-first engineering",
    "spaced repetition learning",
    "compliance training",
    "policy training",
    "iso 26262",
    "iec 61508",
    "iso 27001",
    "misra",
    "do-178c",
    "functional safety",
    "cyclomatic complexity",
    "traceability matrix",
)


# ── Score weights ─────────────────────────────────────────────────────────
#
# Weighted toward segment 1 (complex codebase, fit 0.90) and the directly-
# observable onboarding-pain signal. Functional-safety carries weight to
# surface segment 4 (fit 0.88) without dominating. Distributed-team and
# hiring signals are corroborating-only. Sum = 1.0 so the default tier
# thresholds (0.66 hot / 0.33 warm) hold.

_SCORE_WEIGHTS: dict[str, float] = {
    "complex_codebase_signal":    0.25,
    "onboarding_pain_signal":     0.20,
    "functional_safety_exposure": 0.18,
    "engineering_maturity_signal": 0.15,
    "compliance_doc_signal":      0.10,
    "distributed_team_signal":    0.07,
    "hiring_engineering_signal":  0.05,
}


# ── Register the vertical ─────────────────────────────────────────────────

ONBOARDINGTUTOR = register(
    ProductVertical(
        slug="onboardingtutor",
        product_id=3,
        schema_version="1.0.0",
        seed_query=(
            "Mid-to-enterprise tech companies running complex codebases "
            "(monorepos, microservices, polyglot stacks) where engineer "
            "ramp-up is slow and tribal-knowledge transfer hurts; "
            "industrial-software, automotive, and medtech firms facing "
            "yearly ISO 26262 / IEC 61508 / DO-178C / ISO 27001 audits "
            "needing cyclomatic-complexity reports and dependency-graph "
            "traceability; companies with distributed engineering teams "
            "and scattered internal documentation."
        ),
        keywords=_KEYWORDS,
        signal_rules=_SIGNAL_RULES,
        anti_icp_predicates=_ANTI_ICP,
        github_code_queries=_GITHUB_QUERIES,
        github_owner_deny=_GITHUB_OWNER_DENY,
        github_filter_out=_GITHUB_FILTER_OUT,
        email_template_name_by_step=_TEMPLATE_NAME_BY_STEP,
        score_weights=_SCORE_WEIGHTS,
    )
)
