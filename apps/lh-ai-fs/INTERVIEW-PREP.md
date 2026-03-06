# Learned Hand Interview Prep — Deep Dive

## Context

Interview: **Tuesday 3/10 at 10 AM ET**, 1 hour with Vienna Scott (Chief of Staff).
Company: **Learned Hand** — first generative AI platform purpose-built for courts.
Founder: **Shlomo Klapper** (Yale Law, Wharton, ex-Palantir, ex-judicial law clerk 2nd Circuit, ex-Quinn Emanuel, co-founded Weave.bio).
Submission repo: `github.com/nicolad/lh-ai-fs` (local at `/Users/vadimnicolai/Public/ai-apps/apps/lh-ai-fs/`)

Vienna's feedback: *"The architecture is solid: five agents with real role separation, parallel execution, typed contracts, and graceful failure handling. The eval harness is the standout. Your reflection was honest and matched the actual code quality."*

Interview will cover: **architecture choices, trade-offs, how it holds up in production, citation verification gaps**.

---

## 1. YOUR ARCHITECTURE (Know Cold)

### Pipeline Flow
```
Documents --> DocumentParser --> [CitationVerifier || FactChecker] --> ReportSynthesizer --> JudicialMemoAgent --> JSON Report
```

### 5 Agents + Orchestrator
| Agent | File | Role |
|-------|------|------|
| DocumentParser | `backend/agents/document_parser.py` | Extract citations + facts from MSJ |
| CitationVerifier | `backend/agents/citation_verifier.py` | Verify quote accuracy, jurisdiction, existence (parallelized per citation) |
| FactChecker | `backend/agents/fact_checker.py` | Cross-reference 8 fact categories across all docs |
| ReportSynthesizer | `backend/agents/report_synthesizer.py` | Aggregate findings, rank by severity, confidence scores |
| JudicialMemoAgent | `backend/agents/judicial_memo.py` | Formal judicial memo with key issues + recommendations |
| PipelineOrchestrator | `backend/agents/orchestrator.py` | Coordinates all agents, parallel execution (line 110-112) |

### Typed Contracts (Pydantic)
```
Parser --> {citations: List[Citation], facts: List[Fact]}
CitationVerifier --> List[VerifiedCitation]  (status: SUPPORTED|NOT_SUPPORTED|COULD_NOT_VERIFY|MISLEADING)
FactChecker --> List[VerifiedFact]  (status: CONSISTENT|CONTRADICTORY|PARTIAL|COULD_NOT_VERIFY)
Synthesizer --> {top_findings: List[Finding], confidence_scores: ConfidenceScores, unknown_issues: List[str]}
MemoAgent --> JudicialMemo {memo, key_issues, recommended_actions, overall_assessment}
Final --> VerificationReport (everything + pipeline_status + metadata)
```

### Key Design Decisions

**Parallel Execution (two levels)**:
```python
# Level 1: Orchestrator — citation + fact agents run in parallel (orchestrator.py:110-112)
citation_results, fact_results = await asyncio.gather(citation_task, fact_task, return_exceptions=True)

# Level 2: Citation verifier — each citation verified concurrently (citation_verifier.py:72-75)
results = await asyncio.gather(*(self._verify_one(cit, case_context) for cit in citations), return_exceptions=True)
```
Citation verification and fact checking are **independent** — run in parallel, ~40% time reduction. Within citation verification, each individual citation is also verified concurrently.

**BaseAgent pattern** (`base_agent.py`):
- Abstract base with `execute()` method, shared `_call_llm()` and `_call_llm_text()` helpers
- Timeouts on every LLM call (`asyncio.wait_for`, default 120s)
- Structured output via Pydantic: `_call_llm(prompt, ResponseModel)` returns validated Pydantic instance

**LLM Service** (`services/llm_service.py`):
- Supports **DeepSeek** (cloud) and **Ollama** (local, qwen2.5:7b) via LangChain's ChatOpenAI
- Schema injection: Pydantic model's JSON schema is included in system prompt
- JSON extraction: handles markdown fences, raw JSON, nested brackets

---

## 2. EVAL HARNESS (The Standout — Be Ready to Go Deep)

### Multi-Layer Evaluation

**Layer 1 — Keyword Matching** (`evals/metrics.py`):
- `finding_matches_discrepancy()`: requires >= 2 keyword hits from ground truth
- `calculate_metrics()`: precision, recall, F1, false discovery rate
- `calculate_grounding()`: checks evidence is traceable to source documents (10+ char substring match)

**Layer 2 — LLM-as-Judge** (`evals/llm_judge.py`):
- Opt-in via `LLM_JUDGE=1`
- Semantic matching with confidence threshold >= 0.5
- Prompts: "Does this pipeline finding correctly identify the ground truth discrepancy?"

**Layer 3 — Combined Metrics** (`metrics.py:112-143`):
- Union of keyword + LLM matches
- Shows keyword-only, LLM-only, and both-agreed categories

**Layer 4 — Comprehensive Eval** (`run_evals.py`):
- **31 assertions** across 6 categories:
  - **Recall** (8 checks, weighted): one per planted error, critical errors get 2x weight
  - **Precision** (4 checks): clean docs should produce <= 1 finding, 0 contradictions, no bad citations, high confidence
  - **Hallucination** (4 checks): no fabricated case names, known case names present, >= 50% findings grounded, no invented document types
  - **Cross-document consistency** (5 checks): facts cross-reference multiple docs, references police/witness/medical, all 4 docs analyzed
  - **Uncertainty** (4 checks): at least one uncertain citation, confidence not all 1.0 or 0.0, unknown issues list exists, no overconfident flagged items
  - **Structure** (6 checks): required fields present, structured Citation/Fact objects, valid confidence floats, structured memo, unique finding IDs

**Layer 5 — Persistence** (`evals/db.py`):
- SQLite database stores every eval run with metrics, findings, full report
- Git SHA recorded for each run — enables trend tracking across commits

### Ground Truth: Rivera v. Harmon (8 Planted Errors)
| ID | Category | Error | Weight | Severity |
|----|----------|-------|--------|----------|
| D-01 | DATE | March 14 vs March 12 (2 days off) | 2x | Critical |
| D-02 | PPE | "no PPE" vs harness/hat/vest evidence | 2x | Critical |
| D-03 | PRIVETTE | "never liable" — word "never" inserted (misquotation) | 2x | Critical |
| D-04 | SOL | Wrong incident date in statute of limitations calc | 1x | Medium |
| D-05 | CTRL | "no control" vs Foreman Donner directed work | 2x | Critical |
| D-06 | JURISDICTION | Dixon (TX) & Okafor (FL) non-binding in CA | 1x | Medium |
| D-07 | SCAFFOLDING | Omission of rust/plywood defects | 1x | Medium |
| D-08 | SPOLIATION | Post-incident rebuild (evidence destruction) | 1x | Medium |

### Precision Test: Clean Documents (Smith v. ABC Corp)
- Internally consistent, no planted errors
- Should produce <= 1 finding, 0 contradictions, no bad citations, high confidence

### 8 Fact-Checking Categories (from `prompts.py`)
1. DATE_CONSISTENCY
2. PPE_SAFETY
3. WORK_CONTROL
4. SCAFFOLDING_CONDITION
5. OSHA_COMPLIANCE
6. INJURY_DETAILS
7. STATUTE_OF_LIMITATIONS
8. STRATEGIC_OMISSION

### Why This Design Works
- **Weighted recall** reflects legal impact (critical errors get 2x weight)
- **Dual-matching** (keyword + semantic) catches errors that either method alone misses
- **Grounding check** ensures evidence isn't fabricated — critical for legal
- **Precision test** prevents over-flagging (a real problem in legal AI)
- **Persistent SQLite** enables trend tracking across runs
- **Precision rules in prompts** (prompts.py:46-52) — explicit instructions to avoid false flags on consistent documents

### Be Prepared to Discuss
- *"Why keyword matching AND LLM-as-judge?"* — Keyword matching is deterministic, fast, transparent. LLM-as-judge catches semantic equivalences keyword matching misses (e.g., "date discrepancy" vs "incorrect incident date"). Union gives best coverage.
- *"How would you scale eval to more test cases?"* — Build a corpus of real MSJ filings with annotated errors. Each case type (employment, personal injury, contract) exercises different fact categories. Automated regression suite.
- *"How do you prevent eval overfitting?"* — Clean doc precision test acts as negative control. Would add adversarial cases (subtle errors, near-misses) and periodically refresh test corpus.

---

## 3. CITATION VERIFICATION GAPS (They Called This Out Specifically)

### Current State
- Citation verification relies on **LLM training data** for unknown cases
- Known cases (Rivera v. Harmon) get enriched context via `case_context.py`
- No integration with legal databases (Westlaw, LexisNexis, CourtListener)

### What You Should Say
1. **Acknowledge honestly**: "For the submission, citation verification relies on the LLM's training data for case existence and holding accuracy. This is the biggest gap for production."

2. **Production path**: "In production, you'd integrate with a legal database API:
   - **CourtListener** (free, open) for federal cases
   - **Westlaw/LexisNexis API** for comprehensive coverage
   - **Court-specific PACER** integration for filings
   - The agent would do a lookup, retrieve the actual case text, and verify the quote against the source"

3. **Closed Universe approach** (align with Learned Hand's architecture): "What Learned Hand does — the closed universe of verified authorities — is exactly right. The citation verifier should query a curated, verified corpus, not rely on an LLM's probabilistic memory of case law."

4. **Layered verification**: "I'd build three checks:
   - **Existence**: Does this case exist? (database lookup)
   - **Holding accuracy**: Does the case say what the brief claims? (RAG against actual opinion text)
   - **Applicability**: Is this binding in this jurisdiction? (court hierarchy check)"

5. **Confidence calibration**: "Currently confidence is LLM-estimated, not calibrated. With a database, you can assign VERIFIED/NOT_FOUND/PARTIAL_MATCH with real certainty."

### Why This Gap Matters for Legal AI
- A fabricated citation is worse than a null pointer — it can result in sanctions, case dismissal, loss of bar license
- Judges already distrust AI partly because of hallucinated citations (Mata v. Avianca)
- This is why Learned Hand built a "closed universe" — the answer to hallucination is constrained retrieval, not better prompts

---

## 4. TRADE-OFFS TO DISCUSS

### Architecture Trade-offs
| Decision | Alternative | Why You Chose This |
|----------|------------|-------------------|
| 5 separate agents | Monolithic single-prompt | Single responsibility, testable individually, parallel execution possible |
| Pydantic typed contracts | Free-form dicts | Type safety, validation, clear API between agents |
| Parallel citation + fact | Sequential | Independent tasks, 40% time reduction |
| Single LLM call per agent | Multi-turn refinement | Simplicity, cost control, good enough with structured prompts |
| DeepSeek + Ollama support | GPT-4/Claude only | Cost optimization; Ollama enables local dev with no API key |
| Case context injection | Always rely on LLM | Domain knowledge improves accuracy for known cases |
| Keyword eval + LLM judge | Only one method | Each catches different types of matches |
| BaseAgent abstract class | Standalone functions | Shared LLM calling + timeout logic, consistent error handling |

### Production Readiness Trade-offs
| Current | Production Need | How to Bridge |
|---------|----------------|---------------|
| Text-only docs | PDF/DOCX | Add document parsing layer (PyPDF, docx2python) |
| 8 hardcoded fact categories | Dynamic inference | LLM first pass to identify relevant fact categories per case |
| Single test case | Comprehensive corpus | Build annotated case library per case type |
| LLM-based citation check | Database verification | Integrate legal databases |
| Single-pass analysis | Multi-turn refinement | Add verification loop with confidence thresholds |
| No user feedback | Active learning | Track judge corrections, retrain prompts |

---

## 5. QUESTIONS THEY MIGHT ASK (WITH ANSWERS)

### Architecture
**Q: Why 5 agents instead of 3 or 7?**
A: Each agent has a distinct cognitive task. Parser extracts structured data. Verifier and checker do independent analysis (hence parallel). Synthesizer aggregates and ranks. Memo agent writes for a judicial audience. Fewer agents would conflate responsibilities; more would add coordination overhead without benefit. The 5th agent (JudicialMemo) was added because synthesis and memo writing are different skills — analytical aggregation vs. persuasive legal writing.

**Q: How would you handle a 200-page brief?**
A: Chunking strategy — split by section/argument, run extraction per chunk, deduplicate citations across chunks, maintain section references for traceability. The current architecture supports this — just feed chunks to the parser and merge results. The fact checker already truncates long documents to 6000 chars per source (`fact_checker.py:26`) and adds a truncation notice.

**Q: How would you handle multiple motions in a single case?**
A: Each motion gets its own pipeline run. Cross-motion consistency checking would be a new agent that compares findings across motions — checking for contradictions between the plaintiff's and defendant's claims.

**Q: Tell me about the graceful failure handling.**
A: Every agent is wrapped in try/except with status tracking (`_track/_start/_succeed/_fail` in orchestrator.py). Parser failure = immediate error report. Citation or fact checker failure = continue with partial results from healthy agent. Synthesizer failure = minimal report from raw data. Memo failure = report without memo. `AgentStatus` entries (with timing) make failures transparent. This is strictly better than all-or-nothing.

### Eval & Quality
**Q: Your eval only has one test case. How confident are you in the system?**
A: Honest answer: not confident enough for production. The eval proves the architecture works and can catch real errors. Scaling requires annotated cases across practice areas. But the eval infrastructure is there — adding cases is incremental work, not architectural change.

**Q: How would you measure hallucination rate in production?**
A: Three approaches: (1) Sample-based human review — judges flag incorrect findings, track rate. (2) Grounding audit — automated check that every claim traces to source text (already built: `calculate_grounding()` in metrics.py). (3) Citation verification against legal databases — binary check on case existence.

**Q: What's your precision vs recall trade-off philosophy for legal AI?**
A: For legal AI, **precision matters more than recall** — a false positive (flagging a correct citation as wrong) erodes trust and wastes judicial time. But recall matters too — missing a fabricated citation is dangerous. The right approach is high precision with transparent confidence, so judges can decide what to investigate further. The fact-checking prompt has explicit precision rules (prompts.py:46-52) to avoid false flags.

### Production & Scale
**Q: How would this work in a real court system?**
A: Integration points: (1) Case management system feeds documents. (2) Pipeline runs asynchronously, produces report. (3) Law clerk reviews report in UI, accepts/rejects findings. (4) Feedback loop improves prompts. (5) Audit trail for every finding (which source doc, which page, which agent produced it).

**Q: How do you handle adversarial briefs designed to fool the system?**
A: This is real — attorneys may craft briefs knowing AI reviews them. Defenses: (1) Database-grounded citation checks (can't fool a lookup). (2) Multi-source fact verification (cross-reference, don't trust single source). (3) Pattern detection for known manipulation techniques. (4) Always surface uncertainty — let the human judge decide.

**Q: Latency requirements?**
A: Courts don't need real-time. A 30-second to 2-minute pipeline run is fine for a document that takes a law clerk hours to review manually. Optimize for accuracy, not speed.

### Legal Domain
**Q: What makes a legal AI failure different from other AI failures?**
A: Three dimensions: (1) **Consequences** — wrong output can lead to unjust rulings, sanctions, rights violations. (2) **Accountability** — judges sign their names to orders; they need to trust the tool. (3) **Adversarial context** — opposing counsel will find every error. This means: verify everything, express uncertainty, never present AI output as ground truth.

**Q: How do you think about bias in legal AI?**
A: Bias in training data (e.g., over-representation of certain jurisdictions, case outcomes) can propagate. Mitigation: (1) Closed universe of verified authorities. (2) Flag when analysis relies on few sources. (3) Surface conflicting precedent rather than picking winners. (4) Regular audits against demographic and jurisdictional fairness metrics.

**Q: What's your view on AI in judicial decision-making?**
A: AI should augment, never replace. Best use: (1) Mechanical tasks — citation checking, date cross-referencing, document summarization. (2) Surfacing relevant precedent. (3) Flagging inconsistencies. Worst use: predicting outcomes, recommending sentences, making credibility determinations. The human judge must remain the decision-maker.

---

## 6. ABOUT LEARNED HAND (Show You've Done Research)

### Key Facts
- **Product**: Closed-universe AI platform for courts — draws only from verified legal authorities
- **Biggest customer**: Michigan Supreme Court (landmark contract, 2025)
- **Architecture**: RAG on curated legal corpus, not open-ended LLM generation
- **Philosophy**: Zero tolerance for hallucination; every output traces to a source
- **Audience**: Judges, law clerks, staff attorneys, appellate staff
- **Use cases**: Post-conviction relief, motion briefing, bench memo generation, docket management

### Align Your Submission With Their Product
| Your BS Detector | Learned Hand's Product | Alignment |
|-----------------|----------------------|-----------|
| Citation verification | Citation grounding in verified authorities | Direct overlap |
| Fact cross-referencing | Automatic fact extraction from exhibits | Direct overlap |
| Judicial memo generation | Bench memo / order drafting | Direct overlap |
| Confidence scores | Uncertainty communication to judges | Direct overlap |
| Multi-agent pipeline | Structured legal analysis workflow | Architectural alignment |
| Eval harness | Quality assurance for judicial tools | Engineering discipline |

### What to Say About Their Approach
"The closed universe architecture is exactly right for courts. General LLMs hallucinate case law because they generate text probabilistically — they don't actually know what's in a case. Constraining to verified authorities and providing source links solves this at the architecture level, not the prompt level."

---

## 7. YOUR NOMADICALLY.WORK SYSTEM (Show Broader AI Engineering)

If they ask about your other work, the EU job classifier demonstrates:
- **Two-tier ML architecture**: Deterministic heuristic (Rust, rayon parallelism) + LLM fallback (DeepSeek)
- **Signal engineering**: 7-layer country resolution, regex pattern matching, ATS metadata normalization
- **Cost optimization**: Heuristic handles ~70% of jobs (free), LLM only on ambiguous cases
- **Eval discipline**: 180+ regression tests, real-world job coverage
- **Production scale**: Cloudflare Workers, D1, async queues

---

## 8. QUESTIONS TO ASK THEM

1. "What does the current citation verification pipeline look like? Is it RAG against a curated corpus, or something else?"
2. "How do you handle jurisdictional differences — federal vs state, circuit-level precedent?"
3. "What's the hardest failure mode you've seen in production?"
4. "How do judges and law clerks actually interact with the tool day-to-day?"
5. "What does the feedback loop look like — do clerks correct the AI's output, and does that flow back into improvement?"
6. "What's the team structure? How many engineers, how many domain experts?"
7. "What's the biggest technical challenge you're facing right now?"

---

## 9. PERSONAL NARRATIVE

**Why this role fits you:**
- You've built production AI systems (nomadically.work — multi-model classification, eval pipelines, Langfuse observability)
- You understand that AI for high-stakes domains requires verification, not just generation
- Your BS Detector submission shows exactly this: structured analysis, citation checking, eval-first development, honest uncertainty
- You're an engineer who takes correctness seriously (typed contracts, eval harnesses, grounding checks)

**What to convey:**
- You're excited about legal AI specifically because the cost of error is high — it forces better engineering
- You're pragmatic about LLM limitations (your reflection acknowledged gaps honestly)
- You can own the full stack (Python backend, React frontend, eval infrastructure)
- You move fast but with rigor (eval harness, not just demos)

---

## 10. INTERVIEW LOGISTICS

- **When**: Tuesday 3/10, 10:00 AM ET
- **Duration**: 1 hour
- **With**: Vienna Scott (Chief of Staff)
- **Format**: Technical conversation (no coding challenge)
- **Prep**: "Nothing to prepare, just come ready to talk through your thinking"
- **Email for invite**: nicolai.vadim@gmail.com

---

## 11. EXACT CODE REFERENCES (Quick Lookup)

| What | File:Line | Key Detail |
|------|-----------|------------|
| Parallel execution | `orchestrator.py:110-112` | `asyncio.gather(citation_task, fact_task)` |
| Per-citation parallelism | `citation_verifier.py:72-75` | `asyncio.gather(*verify_one calls)` |
| Graceful failure tracking | `orchestrator.py:22-42` | `_track/_start/_succeed/_fail` helpers |
| Parser failure = early exit | `orchestrator.py:82-93` | Returns error VerificationReport |
| Case context injection | `case_context.py:7-18` | Rivera context with Privette knowledge |
| Fact truncation (6000 chars) | `fact_checker.py:26-39` | Truncates with notice |
| Precision rules in prompt | `prompts.py:46-52` | Explicit "prefer consistent over contradictory" |
| 8 fact categories | `prompts.py:56-63` | DATE through STRATEGIC_OMISSION |
| Grounding check | `metrics.py:59-109` | 10+ char substring match against source docs |
| LLM judge confidence threshold | `llm_judge.py:94` | `confidence >= 0.5` |
| Combined metrics (union) | `metrics.py:112-143` | keyword + LLM match union |
| SQLite eval persistence | `evals/db.py:33-59` | WAL mode, git SHA tracking |
| Clean doc test case | `test_cases.py:116-159` | Smith v. ABC Corp |
| 31 eval assertions | `run_evals.py:249-558` | 8+4+4+5+4+6 across 6 categories |
| Weighted recall | `run_evals.py:143-146` | `sum(weight for passed) / sum(weight)` |
| LLM service (DeepSeek + Ollama) | `llm_service.py:54-69` | Auto-detects provider |
| BaseAgent abstract | `base_agent.py:12-35` | Shared _call_llm with timeout |
| Pydantic schemas | `models/schemas.py` | All typed contracts |

---

## 12. HALLUCINATION MITIGATION (6-Layer Defense-in-Depth)

Frame this as a production roadmap when they ask "how would you prevent hallucination in a court-facing system?"

| Layer | What | How |
|-------|------|-----|
| 1. Closed Universe | Verification only against curated, verified sources | No fallback to parametric knowledge. If the case isn't in the corpus, return `could_not_verify`, never fabricate |
| 2. RAG | Retrieve actual case opinions from legal database | CourtListener (free, federal), Westlaw/LexisNexis API (comprehensive). Verifier checks retrieved text, not LLM memory |
| 3. Multi-Agent Cross-Validation | Independent agents analyzing different aspects | Citation verifier + fact checker are independent (your architecture). Disagreements surface as flags, not silent failures |
| 4. Structured Output Constraints | Pydantic enums force constrained output space | `VerificationStatus` enum: `SUPPORTED / NOT_SUPPORTED / COULD_NOT_VERIFY / MISLEADING`. `could_not_verify` is a safe escape hatch |
| 5. Confidence Calibration | Statistical calibration on eval data | Platt scaling or isotonic regression: map raw LLM confidence to calibrated probability. Currently directional, not calibrated |
| 6. Human-in-the-Loop | Side-by-side source links, mandatory human review | "Click any statement to see the source" (Learned Hand's actual UI). Low-confidence items require explicit human sign-off |

**Key framing:** "The verification *logic* is right; the knowledge *backend* needs to be replaced. For production, the LLM's role shifts from 'do you know this case?' to 'does this retrieved passage support the brief's claim?' — much more constrained and verifiable."

Connect to Learned Hand's "closed universe" design principle throughout.

---

## 13. 5-TIER PRODUCTION CITATION VERIFICATION

When they go deep on citation gaps, walk through these tiers:

1. **Existence** — Query case law DB, verify volume/reporter/page, confirm case name matches
2. **Holding** — RAG to retrieve actual opinion text, compare brief's characterization against real holding
3. **Jurisdiction** — Parse reporter to determine jurisdiction, flag non-binding authority (e.g., Dixon is TX, Okafor is FL — neither binding in CA)
4. **Treatment** — Shepard's/KeyCite check: is the case overruled, reversed, questioned, or distinguished?
5. **Proposition-level** — Extract the specific legal question the brief claims the case answers, search the opinion for relevant passages. This catches the subtlest error: a real case, correctly cited, but mischaracterized

Your submission has the logic for tiers 1-3 (in `citation_verifier.py`) but backed by LLM knowledge instead of a database. Tier 4-5 require legal database integration. The architecture doesn't change — only the knowledge source.

---

## 14. LEGAL DOMAIN VOCABULARY (Use Correctly)

| Term | Correct Usage | Common Mistake |
|------|--------------|---------------|
| **Privette PRESUMPTION** | A rebuttable presumption against hirer liability | Calling it a "rule" or "doctrine of immunity" — it's rebuttable |
| **Retained control exception** | Donner (Harmon's foreman) directing Rivera's crew defeats Privette presumption | Confusing it with general negligence |
| **Binding vs. persuasive authority** | Dixon (TX) and Okafor (FL) are non-binding persuasive authority in CA | Treating all cited cases as equal weight |
| **Spoliation** | Post-incident scaffolding rebuild = destruction of evidence | Misspelling as "spoilation" or treating it as merely "cleanup" |
| **MSJ standard** | No genuine dispute of material fact; view evidence in light most favorable to non-movant | Describing it as "proof beyond reasonable doubt" (that's criminal) |
| **Mischaracterization vs. fabrication** | Brief says Privette holds X when it actually holds Y (mischaracterization). Case name entirely made up (fabrication) | Conflating the two — they're different failure modes |
| **Mata v. Avianca** | The case where lawyers cited ChatGPT-hallucinated cases — judges already wary of AI citations | Not knowing this reference when discussing legal AI trust |

---

## 15. GOTCHA QUESTIONS (With Exact Responses)

| Question | Response |
|----------|----------|
| "Your verifier only works because you hardcoded Privette knowledge" | "Honest answer: yes, `case_context.py` is 19 lines of hardcoded domain knowledge. The architecture is right — the `{case_context}` injection pattern works for any case. But production needs a real knowledge backend. The verification *logic* is identical regardless of source." |
| "Why DeepSeek for judicial work?" | "Take-home constraint — the assignment said DeepSeek. The architecture is model-agnostic by design. `LLMService` abstracts the provider (line 54-69 of `llm_service.py`). Swap to Claude, GPT-4, or a fine-tuned model with zero pipeline changes." |
| "Fact checker has hardcoded fields" | "Called this out in my reflection (line 55). The 8 categories in `prompts.py:56-63` are Rivera-specific. Production: add a classification step — LLM reads documents, identifies relevant fact categories dynamically, then checks those. Per-document-pair checking with merge." |
| "How do you prevent eval overfitting?" | "Clean doc test (Smith v. ABC Corp) partially addresses this — it's a negative control. Need diverse eval corpus across practice areas, error taxonomies, difficulty tiers. Promptfoo A/B tests individual components. The eval infrastructure scales — adding cases is incremental, not architectural." |
| "What would you do with a week instead of 8 hours?" | "Three priorities: (1) RAG over curated case law (CourtListener API for federal cases), replacing LLM parametric knowledge. (2) 5+ diverse test briefs with different error types and practice areas. (3) Confidence calibration — collect eval data, fit a calibration model, so confidence scores are statistically meaningful." |
| "Your pipeline is single-pass — what about iterative refinement?" | "Single-pass was a time constraint choice. The architecture supports multi-turn: verifier flags low-confidence items, orchestrator routes them back for deeper analysis with additional context. Add a confidence threshold — above it, accept; below it, re-analyze with retrieval augmentation." |

---

## 16. INTERVIEW TIMING STRATEGY

| Time | Phase | Focus |
|------|-------|-------|
| 0-5 min | Warm intro | Reference Michigan Supreme Court + "closed universe" approach. Show you've researched them. |
| 5-20 min | Architecture walkthrough | 5 agents, parallel execution, typed contracts, graceful degradation. Walk through `orchestrator.py` flow |
| 20-35 min | Citation verification deep dive | Be honest about gaps FIRST, then articulate production vision (5-tier model). This is THE topic. |
| 35-50 min | Production readiness + hallucination | 6-layer defense, eval strategy, connect everything to Learned Hand's judicial context |
| 50-55 min | Your questions | Pick 2-3 from Section 8. Lead with "How do you handle the boundary between closed universe and LLM parametric knowledge?" |
| 55-60 min | Wrap-up | Express genuine interest. "The cost-of-error framing is what excites me — it forces better engineering." |

---

## 17. CRITICAL MINDSET

1. **Be honest about limitations before they ask** — they praised your honest reflection. Lead with gaps, then solutions.
2. **Frame everything through judicial stakes** — wrong output ruins lives, not just UX. Every design choice should reference this.
3. **Connect to their product** — "here's how I did it, here's how I'd adapt it for a court-facing system with your closed-universe architecture"
4. **Demonstrate eval thinking** — every quality claim should have "and here's how I'd measure it"
5. **Use legal vocabulary correctly** — "Privette presumption," "binding authority," "spoliation," "MSJ standard"
6. **Show you understand their users** — judges need trust, auditability, and speed. Law clerks need comprehensive analysis they can verify quickly.
