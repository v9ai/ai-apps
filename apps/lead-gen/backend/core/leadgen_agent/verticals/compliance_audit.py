"""Compliance audit prep — ISO / SIL / IEC / SOC 2 audit-readiness buyers.

Targets companies that
  (a) ship safety-critical or regulated software (medical, automotive,
      industrial control, fintech) and must pass yearly ISO 27001, IEC 62304,
      IEC 61508 / SIL 2-3, ISO 26262, SOC 2, HITRUST or HIPAA audits, or
  (b) sell consulting / tooling for static analysis, code-quality evidence
      packs, traceability matrices, MISRA / CERT-C compliance, or
  (c) maintain large code or document corpora that auditors must ingest.

Buyer pain: yearly audit cycles, manual evidence collection, cyclomatic-
complexity reports, requirements-to-code traceability, lots of code &
documents to summarise for the auditor on a deadline.

product_id=2 is reserved for the audit-prep companion product; the row in
`products` is expected to be seeded separately. Until then the discovery and
scoring path still works — enrichment writes signals keyed on this product_id,
but no email templates / positioning content are bound yet.
"""

from __future__ import annotations

import re

from .registry import AntiIcpPredicate, ProductVertical, SignalRule, register


# ── Signal rules ──────────────────────────────────────────────────────────

_SIGNAL_RULES: tuple[SignalRule, ...] = (
    # --- audit_standard_detected (label) — which standard they prep for ---
    # Order: most-specific medical / functional-safety first; generic SOC 2 last.
    SignalRule(
        key="audit_standard_detected",
        pattern=re.compile(r"\bIEC[- ]?62304\b", re.I),
        kind="label",
        label="iec_62304",
    ),
    SignalRule(
        key="audit_standard_detected",
        pattern=re.compile(
            r"\bIEC[- ]?61508\b|\bSIL[- ]?[1-4]\b|\bfunctional safety\b", re.I
        ),
        kind="label",
        label="iec_61508_sil",
    ),
    SignalRule(
        key="audit_standard_detected",
        pattern=re.compile(r"\bISO[- ]?26262\b|\bASIL\b", re.I),
        kind="label",
        label="iso_26262",
    ),
    SignalRule(
        key="audit_standard_detected",
        pattern=re.compile(r"\bISO[- ]?27001\b", re.I),
        kind="label",
        label="iso_27001",
    ),
    SignalRule(
        key="audit_standard_detected",
        pattern=re.compile(r"\bSOC[- ]?2\b|\bSOC II\b", re.I),
        kind="label",
        label="soc_2",
    ),
    SignalRule(
        key="audit_standard_detected",
        pattern=re.compile(r"\bHITRUST\b", re.I),
        kind="label",
        label="hitrust",
    ),
    SignalRule(
        key="audit_standard_detected",
        pattern=re.compile(r"\bHIPAA\b", re.I),
        kind="label",
        label="hipaa",
    ),
    SignalRule(
        key="audit_standard_detected",
        pattern=re.compile(r"\bFedRAMP\b|\bFISMA\b", re.I),
        kind="label",
        label="fedramp",
    ),
    # --- code_quality_evidence (bool) — they care about static-analysis output ---
    SignalRule(
        key="code_quality_evidence",
        pattern=re.compile(
            r"\b(cyclomatic complexity|MISRA[- ]?C(\+\+)?|CERT[- ]?C(\+\+)?|"
            r"static analysis|coverity|polyspace|sonarqube|"
            r"requirements traceability|traceability matrix)\b",
            re.I,
        ),
        kind="bool",
    ),
    # --- audit_cycle_pain (bool) — language about yearly / surveillance audits ---
    SignalRule(
        key="audit_cycle_pain",
        pattern=re.compile(
            r"\b(annual audit|yearly audit|surveillance audit|recertification|"
            r"audit prep|audit readiness|evidence collection|audit deadline|"
            r"audit cycle)\b",
            re.I,
        ),
        kind="bool",
    ),
    # --- regulated_industry (bool) — sector exposure ---
    SignalRule(
        key="regulated_industry",
        pattern=re.compile(
            r"\b(medical device|MedTech|in[- ]vitro diagnostic|IVD|"
            r"automotive (safety|software)|aerospace|avionics|DO[- ]?178[CB]?|"
            r"industrial control|SCADA|PLC|safety[- ]critical|"
            r"FDA (510k|submission)|MDR|EU MDR|notified body)\b",
            re.I,
        ),
        kind="bool",
    ),
)


# ── Anti-ICP predicates ───────────────────────────────────────────────────

_ANTI_ICP: tuple[AntiIcpPredicate, ...] = (
    AntiIcpPredicate(
        name="big_four_audit_firm",
        predicate="domain_in",
        value=[
            "deloitte.com",
            "pwc.com",
            "ey.com",
            "kpmg.com",
            "bdo.com",
            "rsm.global",
            "grantthornton.com",
        ],
        reason="Big-Four / global accounting firms — too large, build internal tools.",
    ),
    AntiIcpPredicate(
        name="legal_compliance_only",
        predicate="description_regex",
        value=r"(?i)\b(law firm|legal compliance|GDPR consultancy only|"
              r"privacy attorneys?)\b",
        reason="Legal-only practices — no codebase / document corpus pain.",
    ),
    AntiIcpPredicate(
        name="standards_body",
        predicate="domain_in",
        value=[
            "iso.org",
            "iec.ch",
            "nist.gov",
            "ieee.org",
            "aamc.org",
        ],
        reason="Standards bodies issue the standards — they don't buy audit-prep tooling.",
    ),
)


# ── GitHub code-search queries + filters ──────────────────────────────────
#
# Targets repos that import or configure static-analysis / traceability tooling
# typically used during audit prep. Pushed-after constraint keeps the list
# fresh and skips abandoned projects.

_GITHUB_QUERIES: tuple[str, ...] = (
    "filename:.misra-c.json pushed:>2026-01-01",
    "filename:sonar-project.properties pushed:>2026-01-01",
    'path:.github/workflows "coverity" pushed:>2026-01-01',
    'path:.github/workflows "polyspace" pushed:>2026-01-01',
    '"IEC 62304" language:markdown pushed:>2026-01-01',
    '"requirements traceability" language:markdown pushed:>2026-01-01',
)

_GITHUB_OWNER_DENY: frozenset[str] = frozenset(
    {
        "SonarSource",        # SonarQube vendor
        "coverity",
        "MathWorks",          # Polyspace vendor
        "MISRA-C",
        "MISRA-Cpp",
        "CERTCC",             # CERT/CC org — standards publisher
        "OWASP",              # standards / curriculum
    }
)

_GITHUB_FILTER_OUT: tuple[re.Pattern[str], ...] = (
    re.compile(r"(?i)(tutorial|course|cheat(sheet)?|awesome|example|demo|starter|"
               r"workshop|exercise)"),
)


# ── Email templates keyed by step ─────────────────────────────────────────
#
# Empty until the corresponding rows are seeded in `email_templates` with
# tags = ["product:compliance_audit", "sequence:outreach", "step:N"].
# The email_outreach graph tolerates missing template names by skipping the
# step, so this vertical can run discovery + scoring before outreach is wired.

_TEMPLATE_NAME_BY_STEP: dict[int, str] = {}


# ── Keywords for the LLM expander ─────────────────────────────────────────

_KEYWORDS: tuple[str, ...] = (
    "iso 27001",
    "iec 62304",
    "iec 61508",
    "iso 26262",
    "soc 2",
    "hitrust",
    "hipaa compliance",
    "fedramp",
    "audit prep",
    "audit readiness",
    "compliance audit",
    "cyclomatic complexity",
    "misra-c",
    "cert-c",
    "static analysis",
    "requirements traceability",
    "safety-critical software",
    "medical device software",
    "functional safety",
    "do-178c",
)


# ── Score weights ─────────────────────────────────────────────────────────
#
# audit_standard_detected is necessary (no audit standard → not an audit-prep
# buyer); regulated_industry doubles confidence; code_quality_evidence and
# audit_cycle_pain are direct buying signals. Sums to ~1.0 so the default
# 0.66 / 0.33 tier thresholds map to the same hot/warm/cold semantics as
# Ingestible.

_SCORE_WEIGHTS: dict[str, float] = {
    "audit_standard_detected": 0.30,
    "regulated_industry":      0.25,
    "code_quality_evidence":   0.25,
    "audit_cycle_pain":        0.20,
}


# ── Register the vertical ─────────────────────────────────────────────────

COMPLIANCE_AUDIT = register(
    ProductVertical(
        slug="compliance_audit",
        product_id=2,
        schema_version="1.0.0",
        seed_query=(
            "Companies preparing for yearly ISO 27001 / IEC 62304 / IEC 61508 "
            "(SIL) / ISO 26262 / SOC 2 / HITRUST / FedRAMP audits, sitting on "
            "large codebases or document corpora, who need static-analysis "
            "evidence (cyclomatic complexity, MISRA / CERT-C compliance) and "
            "requirements-to-code traceability before the surveillance audit."
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
