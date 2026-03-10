"""Case-specific context for legal brief verification.

Provides domain knowledge that helps agents verify case-specific claims.
For generic cases, returns empty context so the pipeline works on any brief.
"""

RIVERA_V_HARMON_CONTEXT = """IMPORTANT LEGAL KNOWLEDGE FOR THIS CASE:
- Privette v. Superior Court, 5 Cal.4th 689 (1993) established a PRESUMPTION against hirer liability, NOT absolute immunity. The word "never" does NOT appear in the holding. The actual holding is that hirers are presumptively not liable, but exceptions exist for retained control, concealed hazards, and non-delegable duties. Any direct quote containing "never" is INACCURATE.
- Seabright Insurance Co. v. US Airways, Inc., 52 Cal.4th 590 (2011) actually NARROWED the retained control exception; it did not broadly endorse OSHA compliance as a shield. The case is real but is frequently misattributed.
- Kellerman v. Pacific Coast Construction, 887 F.2d 1204 (9th Cir. 1991): this citation is NOT found in standard federal case databases. The holding that OSHA violations create a negligence presumption is atypical and unsupported doctrine for the 9th Circuit. Treat as fabrication_risk: "high".
- Dixon v. Lone Star Construction (Tex. App.) and Okafor v. Brightline Services (Fla. Dist. Ct. App.) are out-of-state decisions. They are NON-BINDING persuasive authority in California; is_binding must be false for both. Their use in footnotes without disclosure of non-binding status is a misleading practice.
- Torres, Blackwell, Nguyen, Reeves (California footnote citations): existence is unconfirmed. If the reporter volume, page, or year does not match known California reporters, treat as fabrication_risk: "medium".
- This is a California state court case. Federal circuit decisions and out-of-state decisions are NOT binding authority."""


def get_case_context(case_id: str) -> str:
    """Return case-specific context for known cases, or empty string for generic cases."""
    contexts = {
        "Rivera_v_Harmon_MSJ": RIVERA_V_HARMON_CONTEXT,
    }
    return contexts.get(case_id, "")
