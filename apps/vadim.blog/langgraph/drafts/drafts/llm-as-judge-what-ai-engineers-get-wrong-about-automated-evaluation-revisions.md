**DECISION: REVISE**

## Critical Issues (must fix)

- [ ] **FACT-CHECK: Unsupported Claims** — Several key claims in the draft are not found in the research brief. They must be removed or replaced with insights from the provided research.
    - **Section: Opening / The Mechanics...:** The claim "Claude 3.5 Sonnet rates its own outputs 25% higher than a human panel would" is not supported by the research brief. The research does not contain this specific finding or any data on Claude 3.5 Sonnet.
    - **Section: The Mechanics...:** The claim "53.3% of teams with deployed AI agents now use it [LLM-as-Judge]" is not in the research.
    - **Section: The Three Biases...:** The "CALM framework" and "12 bias types" are not mentioned in the research. The claim about a "2025 ACL study" on position bias scaling with candidate count is not present.
    - **Section: The Meta-Evaluation Paradox:** The claim citing a "2025 medRxiv study in a global health context" with specific odds ratios (OR 2.65 vs. 1.23) is not in the research brief.
    - **Section: Where LLM Judges Consistently Fail:** The claim about a "March 2026 study documented 'translationese bias'" is not in the research.
    - **Section: The 90/10 Hybrid Approach:** The statistic "59.8% of production AI teams still use human review" is not supported by the research.
    - **Section: The Tooling Landscape / What the Job Market Says:** All data and statistics from `nomadically.work` (1,780 jobs, skill tag rankings, EU market percentages) are not in the research brief. The research does not contain any job market analysis.

- [ ] **CITATION PASS: Fabricated/Unverified Citations** — The draft cites several papers that do not appear in the research brief. All citations must be replaced with or cross-referenced to the papers provided in the research.
    - **Zheng et al. (2023)** is cited but not in the research brief.
    - **Panickssery et al. (2024)** is cited but not in the research brief.
    - **Liu et al.** is cited but not in the research brief.
    - The draft's closing attribution references "Zheng et al. (2023), Panickssery et al. (2024), Liu et al.," which are not the provided sources. It should reference the papers from the research brief (e.g., Bang et al., 2023; Borji, 2023; Harrer, 2023; etc.).

## Suggestions (should fix)

- [ ] **DEPTH PASS: Integrate Provided Research** — The draft currently builds its argument on sources outside the research. To meet the depth requirement, the core argument should be rebuilt using the findings, limitations, and consensus from the provided papers.
    - Replace examples of LLM limitations (hallucinations, reasoning failures) with findings from **Bang et al. (2023)** and **Borji (2023)**.
    - Discuss ethical and oversight imperatives using **Budhwar et al. (2023), Schwartz et al. (2022), and Harrer (2023)**.
    - For the section on failure domains (e.g., specialized domains), integrate insights from **Harrer (2023)** on healthcare and **DeepSeek-AI et al. (2025)** on security/vulnerabilities.
    - Frame the need for explainability and transparency using **Longo et al. (2024)**.

- [ ] **STRUCTURE & TONE: Align with Research Scope** — The draft's structure (e.g., "The Tooling Landscape," "What the Job Market Says") ventures far beyond the critique of "what engineers get wrong," which is the core angle, and into areas unsupported by research. Refocus the article on the critical flaws and conceptual misunderstandings, using the provided research as the evidential backbone.

## Minor Notes (nice to have)

- [ ] **CLARITY:** The opening paragraph is strong but could be tightened. Consider integrating a key quote from the research (e.g., "LLMs can generate incorrect information, known as hallucinations" from Bang et al., 2023) earlier to ground the critique.
- [ ] **TONE:** The tone is appropriately authoritative. Maintain this while ensuring all new claims are firmly rooted in the provided citations.

**Revision Instructions:** The writer must revise the draft to eliminate all claims and data points not found in the research brief. The argument should be reconstructed using the findings, citations, and consensus from the provided research papers. The article's scope should be tightened to a critical analysis of engineering misconceptions about automated LLM evaluation, supported by the supplied academic research.