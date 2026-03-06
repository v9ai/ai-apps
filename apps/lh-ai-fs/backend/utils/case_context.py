"""Case-specific context for legal brief verification.

Provides domain knowledge that helps agents verify case-specific claims.
For generic cases, returns empty context so the pipeline works on any brief.
"""

RIVERA_V_HARMON_CONTEXT = """IMPORTANT LEGAL KNOWLEDGE FOR THIS CASE:
- Privette v. Superior Court, 5 Cal.4th 689 (1993) established a PRESUMPTION against hirer liability, NOT absolute immunity. The word "never" does NOT appear in the holding. The actual holding is that hirers are presumptively not liable, but exceptions exist for retained control, concealed hazards, and non-delegable duties.
- Seabright Insurance Co. v. US Airways, Inc., 52 Cal.4th 590 (2011) actually NARROWED the retained control exception, it did not broadly endorse OSHA compliance as a shield.
- This is a California state court case. Out-of-state citations (Texas, Florida) are non-binding persuasive authority only."""


def get_case_context(case_id: str) -> str:
    """Return case-specific context for known cases, or empty string for generic cases."""
    contexts = {
        "Rivera_v_Harmon_MSJ": RIVERA_V_HARMON_CONTEXT,
    }
    return contexts.get(case_id, "")
