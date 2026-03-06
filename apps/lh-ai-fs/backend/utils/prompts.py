CITATION_EXTRACTION_PROMPT = """Extract ALL legal citations from this Motion for Summary Judgment.

For each citation identify:
1. The exact citation text (case name, volume, reporter, page)
2. The proposition it is claimed to support (what the brief says the case stands for)
3. Any direct quotes attributed to the cited authority
4. The section/paragraph where it appears

Motion for Summary Judgment:
{msj_text}

Return a JSON object with a "citations" array. Each citation must have: citation_text, claimed_proposition, source_location, context (the surrounding sentence)."""

CITATION_VERIFICATION_PROMPT = """Verify whether this legal citation actually supports the proposition claimed in the brief.

Citation: {citation_text}
Claimed proposition: {claimed_proposition}
Direct quote (if any): {context}

Check for:
1. Does the cited case actually hold what the brief claims? Look for mischaracterization of holdings.
2. If a direct quote is provided, is it accurate? Look for inserted or omitted words that change meaning.
3. Is the cited authority binding in the relevant jurisdiction? Flag federal cases, out-of-state cases.
4. Does the citation actually exist, or could it be fabricated?

{case_context}

Return JSON with: is_supported (bool), confidence (0-1), confidence_reasoning (1-2 sentences explaining why you assigned this confidence level), discrepancies (list of strings), status (supported/not_supported/misleading/could_not_verify), notes."""

FACT_CHECKING_PROMPT = """Cross-reference the factual claims from the Motion for Summary Judgment against the supporting documents.

MSJ Claims:
{msj_facts}

Police Report:
{police_text}

Medical Records:
{medical_text}

Witness Statement:
{witness_text}

IMPORTANT: The MSJ is the document being verified. When the police report, medical records, or witness statement contradict what the MSJ claims or implies, mark the fact as "contradictory" — even if those other documents agree with each other. The question is always "does the evidence support or contradict the MSJ?"

PRECISION RULES — avoid false flags:
- "contradictory" means the MSJ makes a SPECIFIC CLAIM that is directly refuted by another document. Example: MSJ says "no PPE worn" but witness says "wore harness" = contradictory.
- An omission is only "contradictory" if the MSJ ACTIVELY HIDES material evidence that would change the legal outcome (e.g., omitting evidence of retained control, omitting post-incident evidence destruction).
- An omission is NOT contradictory if the MSJ simply doesn't mention routine, non-material facts that appear in other documents (e.g., a routine inspection, a scheduled physical exam, arrival times, the purpose of a visit). Mark these as "consistent" — the MSJ is not required to recite every fact from every document.
- If all documents agree and the MSJ does not misstate any fact, mark the fact as "consistent" regardless of whether the MSJ mentions every detail. Consistent documents should produce ONLY "consistent" facts.
- The purpose or context of a document (e.g., "routine inspection" vs "incident response") is NOT a factual claim in the MSJ. Do not flag differences in document framing as contradictions.
- When in doubt, prefer "consistent" or "could_not_verify" over "contradictory". Only flag real contradictions.

Check the following categories. SKIP any category that does not apply to the documents provided — if the documents don't discuss a topic (e.g., no scaffolding mentioned anywhere, no contractor control discussed), do NOT produce a fact entry for that category. Only produce entries for categories where the MSJ actually makes a relevant claim AND the supporting documents address the same topic.

1. DATE CONSISTENCY: Does the MSJ's stated incident date match the other documents? If dates differ, mark contradictory.
2. PPE/SAFETY EQUIPMENT: Does the MSJ's claim about PPE match the other documents? Only check if PPE or safety equipment is discussed.
3. WHO DIRECTED THE WORK: If the MSJ claims an independent contractor controlled work, do the other documents show the hirer directed or controlled work instead? Only check if the MSJ discusses contractor vs. hirer control.
4. SCAFFOLDING CONDITION: If the MSJ discusses or implies safe scaffolding conditions, do the other documents reveal scaffolding defects (rust, plywood, bent pins)? Only check if scaffolding is mentioned.
5. OSHA COMPLIANCE: If the MSJ references OSHA inspections, is this verifiable from other documents?
6. INJURY DETAILS: If injuries are discussed, are they consistently described across documents?
7. STATUTE OF LIMITATIONS ARITHMETIC: If the MSJ states a specific elapsed time (e.g. "362 days" or "one year and 362 days"), verify the math using the CORRECT incident date from the police report/medical records. If the MSJ used the wrong incident date, the day count is wrong — mark this CONTRADICTORY. Show: (a) the MSJ's claimed day count, (b) the correct day count using the real date, (c) why they differ. This is a mathematical error that must be flagged.
8. STRATEGIC OMISSIONS: Identify MATERIAL facts in the other documents that the MSJ fails to mention AND that would undermine the MSJ's legal arguments — especially post-incident remedial measures, evidence destruction or rebuilding (spoliation), and witness observations that directly contradict MSJ claims. Mark these as contradictory ONLY if the omitted fact would change the legal analysis. Do NOT flag routine details.

{case_context}

Return JSON with a "verified_facts" array. Each must have: fact_text, source_document, category (one of: DATE_CONSISTENCY, PPE_SAFETY, WORK_CONTROL, SCAFFOLDING_CONDITION, OSHA_COMPLIANCE, INJURY_DETAILS, STATUTE_OF_LIMITATIONS, STRATEGIC_OMISSION), is_consistent (bool), confidence (0-1), confidence_reasoning (1-2 sentences explaining why you assigned this confidence level), contradictory_sources (list), supporting_sources (list), status (consistent/contradictory/could_not_verify), summary."""

REPORT_SYNTHESIS_PROMPT = """Synthesize the citation verification and fact-checking results into a final verification report.

Citation Results:
{citation_results}

Fact-Checking Results:
{fact_results}

Create a structured report that:
1. Lists the top findings ranked by severity and confidence. Only include actual discrepancies, contradictions, mischaracterizations, or concerns — do NOT include mere summaries of consistent or unproblematic facts. If no issues are found, return an empty top_findings array. Do NOT promote "could_not_verify" items to findings unless they represent a material gap. Items that are simply irrelevant to the case (e.g., scaffolding not mentioned in an electrician case) should be excluded entirely.
2. Calculates overall confidence scores. If all facts are consistent and no citation issues are found, set fact_consistency and overall scores HIGH (0.8-1.0). Only lower scores when real discrepancies exist.
3. Flags items that could not be verified ONLY if they represent material unverifiable claims

Return JSON with: top_findings (array of {{id, type, description, severity, confidence, confidence_reasoning (1-2 sentences explaining why you assigned this confidence level), evidence, recommendation}}), confidence_scores ({{citation_verification, fact_consistency, overall}}), unknown_issues (array of strings)."""

JUDICIAL_MEMO_PROMPT = """Based on these verification findings, write a structured judicial memo summarizing the most critical issues found in the legal brief.

Top Findings:
{findings}

Confidence Scores:
{confidence_scores}

{case_context}

Write in formal legal language. Be specific about which claims are contradicted and by what evidence.

Return JSON with:
- memo: A 3-5 sentence paragraph for a judge highlighting the most material discrepancies
- key_issues: An array of 3-5 bullet-point strings summarizing each critical issue
- recommended_actions: An array of 2-3 strings suggesting what the court should do
- overall_assessment: A one-sentence assessment of the brief's reliability"""
