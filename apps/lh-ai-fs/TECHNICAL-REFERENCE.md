# BS Detector — Complete Technical Reference & Interview Prep

## 1. Interview Context & Logistics

**Interview**: Tuesday 3/10 at 10 AM ET, 1 hour with Vienna Scott (Chief of Staff).
**Company**: **Learned Hand** — first generative AI platform purpose-built for courts.
**Founder**: Shlomo Klapper (Yale Law, Wharton, ex-Palantir, ex-judicial law clerk 2nd Circuit, ex-Quinn Emanuel, co-founded Weave.bio).
**Submission repo**: `github.com/nicolad/lh-ai-fs`
**Email**: nicolai.vadim@gmail.com

Vienna's feedback: *"The architecture is solid: five agents with real role separation, parallel execution, typed contracts, and graceful failure handling. The eval harness is the standout. Your reflection was honest and matched the actual code quality."*

Interview will cover: **architecture choices, trade-offs, how it holds up in production, citation verification gaps**.

---

## 2. Executive Summary

### Beginner Level
The BS Detector is a tool that reads a legal brief (a lawyer's written argument to a judge) and checks whether the lawyer is telling the truth. It looks at two things: (1) are the legal cases the lawyer cites real, and do they actually say what the lawyer claims? (2) do the facts in the brief match what's in the police report, medical records, and witness statements? It then writes a report telling the judge what's wrong.

### Intermediate Level
The system is a multi-agent pipeline built in Python with FastAPI. Five specialized AI agents — document parser, citation verifier, fact checker, report synthesizer, and judicial memo writer — process legal documents in a defined sequence with one parallelization point. All inter-agent data is typed with Pydantic models. The pipeline runs on DeepSeek (cloud) or Ollama (local) through LangChain's ChatOpenAI abstraction. An evaluation harness with 31 assertions across 6 dimensions measures output quality against 8 planted ground-truth errors.

### Expert Level
This is a sequential-parallel DAG of five LLM-backed agents orchestrated through `PipelineOrchestrator`, which is itself deterministic (no LLM calls). The only concurrent execution point is `asyncio.gather(citation_task, fact_task)` at orchestrator.py:110-112, exploiting the independence between citation verification (legal knowledge task) and cross-document fact checking (evidence reconciliation task). Within the citation verifier, a second parallelism level processes individual citations concurrently via `asyncio.gather(*verify_one_calls)`. All inter-agent contracts are Pydantic-serialized dicts (not object references), making the pipeline distributable without architectural changes. The eval harness implements a dual-matching strategy (keyword >=2-hit threshold + opt-in LLM-as-judge semantic evaluation) with evidence grounding checks and SQLite-persisted run history keyed by git SHA. The core architectural gap is citation verification's reliance on LLM parametric knowledge rather than a legal database — the `{case_context}` injection in `case_context.py` is a 19-line placeholder for what would be a RAG pipeline over a curated corpus in production.

---

## 3. Architecture Deep Dive

### Pipeline Topology

```
Documents --> DocumentParser --> [CitationVerifier || FactChecker] --> ReportSynthesizer --> JudicialMemoAgent --> VerificationReport
```

### 5 Agents + Orchestrator (Quick Reference)

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

### Beginner Level
Think of this like an assembly line in a factory. First, one worker reads the legal brief and highlights all the important parts (the parser). Then two workers simultaneously check different things: one checks whether the legal cases cited are real (citation verifier), while the other checks whether the facts match the other documents (fact checker). After both finish, another worker combines all the findings into one report (synthesizer). Finally, a legal writing specialist writes a formal memo for the judge (memo agent).

The reason they can work simultaneously in the middle is that checking citations and checking facts are completely independent tasks — neither needs the other's results. This cuts the total time roughly in half for that stage.

### Intermediate Level
The pipeline is a five-stage directed acyclic graph (DAG) with one parallelization point. The `||` notation between CitationVerifier and FactChecker indicates concurrent execution via `asyncio.gather()`.

**Why this topology and not another?**

Several alternatives were considered:

1. **Fully sequential** (Parser -> Verifier -> Checker -> Synthesizer -> Memo): Simpler but slower. Citation verification and fact checking share no data dependencies — running them sequentially wastes time. The parallel topology cuts wall-clock time by ~40% for the verification stage.

2. **Fully parallel** (all agents receive raw documents simultaneously): Faster but impossible. The synthesizer needs results from both verifier and checker. The memo needs results from the synthesizer. Data dependencies enforce the sequential edges.

3. **Monolithic single-prompt** ("read all documents, check everything, write a report"): Maximum simplicity, minimum reliability. A single prompt conflating extraction, verification, and synthesis produces worse results than specialized prompts because each task requires different cognitive framing. The extraction task needs "be comprehensive," the verification task needs "be skeptical," and the synthesis task needs "be concise."

4. **Micro-agent decomposition** (separate agents for date checking, PPE checking, jurisdiction checking, etc.): Maximum specialization but excessive coordination overhead. Each agent adds an LLM call (~3-10 seconds), a failure point, and a coordination step. The 5-agent decomposition is the Pareto optimum: enough specialization for distinct cognitive tasks, few enough agents for manageable coordination.

**Orchestration pattern**: `PipelineOrchestrator` (orchestrator.py) is a coordinator, not an agent. It makes zero LLM calls. Its behavior is fully deterministic — only the agents introduce non-determinism through their LLM interactions. This separation matters because it means pipeline control flow can be reasoned about, tested, and debugged independently of LLM behavior.

**Why the orchestrator is not an agent**: If the orchestrator itself made LLM calls (e.g., to decide which agents to invoke, or to route findings), the pipeline's behavior would become harder to predict and debug. A deterministic orchestrator means that given the same agent outputs, the pipeline always produces the same final report. This makes eval reproducible and debugging tractable.

### Parallel Execution (Two Levels)

```python
# Level 1: Orchestrator — citation + fact agents run in parallel (orchestrator.py:110-112)
citation_results, fact_results = await asyncio.gather(citation_task, fact_task, return_exceptions=True)

# Level 2: Citation verifier — each citation verified concurrently (citation_verifier.py:72-75)
results = await asyncio.gather(*(self._verify_one(cit, case_context) for cit in citations), return_exceptions=True)
```

### BaseAgent Pattern (`base_agent.py`)
- Abstract base with `execute()` method, shared `_call_llm()` and `_call_llm_text()` helpers
- Timeouts on every LLM call (`asyncio.wait_for`, default 120s)
- Structured output via Pydantic: `_call_llm(prompt, ResponseModel)` returns validated Pydantic instance

### LLM Service (`services/llm_service.py`)
- Supports **DeepSeek** (cloud) and **Ollama** (local, qwen2.5:7b) via LangChain's ChatOpenAI
- Schema injection: Pydantic model's JSON schema is included in system prompt
- JSON extraction: handles markdown fences, raw JSON, nested brackets

### Expert Level

**Status tracking implementation**: Four helper functions (`_track`, `_start`, `_succeed`, `_fail` at orchestrator.py:22-42) manage per-agent `AgentStatus` entries with millisecond-precision timing. This is a lightweight distributed tracing system without the overhead of OpenTelemetry. Each agent transition (pending -> running -> success/failed) is recorded with timing and error messages, producing an observable pipeline in the final `VerificationReport.pipeline_status` field.

**Why timing is per-agent and not per-LLM-call**: The orchestrator tracks agents, not individual LLM calls. This is because: (a) the orchestrator doesn't have visibility into agent internals (an agent may make one or many LLM calls), and (b) agent-level timing is what matters for pipeline optimization — knowing that the fact checker takes 15 seconds tells you where to optimize, even if you don't know how those 15 seconds split across internal operations.

**Data flow design**: Every stage passes data forward as Python dicts (serialized from Pydantic models via `.model_dump()`). This is a deliberate choice over passing Pydantic instances directly.

**Why dicts instead of Pydantic objects**: Three reasons. (1) JSON-serializability: the intermediate data can be logged, cached, or transmitted over the network without additional serialization. (2) Loose coupling: agents don't import each other's Pydantic models. The parser doesn't need to know about `VerifiedCitation`. (3) Future distributability: if agents were moved to separate services (e.g., citation verification on a GPU node, fact checking on a CPU node), the dict-based interface requires no changes. Passing Pydantic objects would create import dependencies across service boundaries.

**The data flow in detail**:

1. **Parser** receives `Dict[str, str]` (document keys -> text), returns `{citations: List[dict], facts: List[dict]}`. Only `citations` is forwarded — `facts` is extracted but unused. This is a vestige of an earlier design where the parser's extracted facts would be compared against the fact checker's independent analysis. The unused `facts` field could be removed, but it's harmless and the parser already does the extraction work.

2. **CitationVerifier** receives `{citations: List[dict], case_context: str}`, returns `List[dict]`. Each dict is a serialized `VerifiedCitation`. The `case_context` is injected by the orchestrator (orchestrator.py:97) after loading it from `case_context.py`.

3. **FactChecker** receives the full document dict augmented with `case_context`, returns `List[dict]`. Each dict is a serialized `VerifiedFact`. The fact checker receives raw documents, not parser-extracted facts, because it needs the full text for cross-referencing — not just the claims the parser identified.

4. **Synthesizer** receives both result lists (truncated to 10,000 chars each — report_synthesizer.py:26-27), returns `{top_findings, confidence_scores, unknown_issues}`.

5. **MemoAgent** receives findings + scores + case_context, returns a serialized `JudicialMemo`.

**Why the fact checker receives raw documents, not parser-extracted facts**: The parser extracts facts from the MSJ specifically. But fact checking requires comparing MSJ claims against the full text of supporting documents — not just the facts the parser happened to extract from those documents. If the police report contains a detail the parser didn't extract as a "fact" (because it's an observation, not a claim), the fact checker still needs to cross-reference it. Raw document access gives the fact checker maximum context.

---

## 4. Agent-by-Agent Analysis

### Agent 1: DocumentParserAgent (`document_parser.py`)

#### Beginner Level
This agent reads the lawyer's brief and makes a list of everything important: which legal cases are cited, and what facts are claimed. It's like a legal assistant who goes through a brief with a highlighter, marking every case citation and every factual claim.

#### Intermediate Level
The parser makes a single LLM call with `CITATION_EXTRACTION_PROMPT`, asking the model to extract citation_text, claimed_proposition, source_location, and context for every citation in the MSJ. Output is validated against an `ExtractionResult` Pydantic model containing `List[Citation]` and `List[Fact]`.

**Why a separate parser rather than having each verifier extract its own data**: Extraction is a distinct cognitive task from verification. When you ask an LLM to simultaneously extract citations AND verify them, it tends to skip citations it considers unimportant — but "unimportant" citations might be the ones most worth checking (e.g., the out-of-state citations buried in a footnote). Separating extraction ensures completeness; separating verification ensures skepticism. The parser's instruction is "find everything" while the verifier's instruction is "be skeptical about each one."

**A known limitation**: The parser only processes the MSJ (`input_data.get("msj", "")`). It doesn't extract facts from supporting documents. This means the fact checker must perform both extraction and verification in a single pass — a heavier cognitive load for the LLM. In a production system, you'd have separate extraction passes for each document type.

#### Expert Level

**Unused `facts` field**: The parser extracts both citations and facts, but the orchestrator only uses `citations` (orchestrator.py:79). The `facts` field was intended for a cross-reference step where parser-extracted MSJ facts would be compared against the fact checker's independently-discovered contradictions. This would catch cases where the parser identifies a claim but the fact checker misses it, or vice versa. The cross-reference was descoped but the extraction remains.

**Why the extraction prompt doesn't use case context**: The parser prompt has no `{case_context}` placeholder. This is intentional — extraction should be context-free. You want to extract ALL citations, including the ones that are correct. Injecting case-specific knowledge at the extraction stage would bias the parser toward flagging certain citations, which is the verifier's job, not the parser's.

**Error handling**: On failure, returns `{citations: [], facts: [], error: str}` rather than raising. This means the orchestrator's parser failure check (orchestrator.py:82-93) catches empty citations rather than exceptions. Both paths lead to the same outcome (error report returned), but the dict-with-error pattern keeps the parser's interface consistent regardless of success or failure.

---

### Agent 2: CitationVerifierAgent (`citation_verifier.py`)

#### Beginner Level
This agent takes each legal case citation from the brief and checks three things: (1) Is this a real case? (2) Does the case actually say what the lawyer claims it says? (3) Does this case apply in California courts? It checks each citation independently and in parallel, like having multiple researchers each looking up one case at the same time.

#### Intermediate Level
The verifier implements per-citation parallelism via `asyncio.gather()` (line 72-75). Each citation gets its own LLM call through `_verify_one()`, which formats `CITATION_VERIFICATION_PROMPT` with the citation text, claimed proposition, context, and case-specific knowledge.

**Why per-citation parallelism**: With 5-10 citations in a typical MSJ, sequential verification would take 5x(3-10s) = 15-50 seconds. Parallel verification completes in max(3-10s) = 3-10 seconds. The citations are independent — verifying Privette v. Superior Court doesn't require knowing anything about Dixon v. Lone Star. This is a second level of parallelism (the first is at the orchestrator level between agents).

**Why `return_exceptions=True`**: The `asyncio.gather(return_exceptions=True)` call means that if one citation's verification fails (e.g., LLM timeout), the other citations' results are still collected. Without this flag, a single failure would cancel all in-flight verifications. In legal verification, getting 4 of 5 results is strictly better than getting 0 of 5.

**Status mapping design**: A dict maps LLM-returned strings to enum values (line 18-22). The fallback to `COULD_NOT_VERIFY` for unmapped statuses (line 44) handles cases where the LLM returns unexpected strings like "partially_supported" or "uncertain." This is defensive programming against LLM output variability — no matter what the model returns, the system produces a valid enum value.

#### Expert Level

**Error isolation architecture**: Three layers of error handling:

1. **Inner try/except** in `_verify_one()` (line 29-58): Catches per-citation LLM failures. Returns `VerifiedCitation` with `COULD_NOT_VERIFY` status and error details in `notes`. This means individual citation failures are recorded as data, not as exceptions.

2. **`return_exceptions=True`** in `asyncio.gather()` (line 72-75): Catches any exceptions that escape the inner try/except (which shouldn't happen but might in edge cases like serialization errors). Failed items are replaced with error `VerifiedCitation` entries (line 77-89).

3. **Orchestrator-level** `asyncio.gather(return_exceptions=True)` (orchestrator.py:110-112): If the entire citation verifier agent raises an exception (e.g., all citations fail and the agent can't construct a response), the orchestrator catches it and continues with an empty citation results list.

**Why three layers instead of one**: Each layer handles a different failure scope. Layer 1 handles individual citation failures (common — some citations are harder to verify). Layer 2 handles aggregate failures (rare — the gather itself fails). Layer 3 handles agent-level failures (very rare — the agent crashes entirely). Each layer degrades gracefully to the next level of acceptable results. One layer couldn't handle all three scopes without becoming a complex conditional mess.

**The `COULD_NOT_VERIFY` design choice**: This status exists because legal citation verification has an inherent epistemological limit — an LLM cannot authoritatively confirm whether a case exists. Without `COULD_NOT_VERIFY`, the model would be forced to choose between `SUPPORTED` (potentially wrong) and `NOT_SUPPORTED` (potentially unfair to the attorney). `COULD_NOT_VERIFY` is the honest middle ground. In production with a legal database, items that return `COULD_NOT_VERIFY` from the database would genuinely indicate a problem (case might not exist); from an LLM, `COULD_NOT_VERIFY` just means "I don't have enough information."

---

### Agent 3: FactCheckerAgent (`fact_checker.py`)

#### Beginner Level
This agent reads all four documents side by side and checks whether the lawyer's brief tells the same story as the police report, medical records, and witness statement. If the brief says the accident happened on March 14 but every other document says March 12, that's a contradiction — and this agent catches it.

#### Intermediate Level
The fact checker makes a single LLM call with the most complex prompt in the system (67 lines in `prompts.py`). The prompt defines 8 checking categories and includes precision rules to prevent false positives.

**Why a single prompt instead of per-category prompts**: Each category prompt would make one LLM call (8 total), costing ~8x the tokens and time. A single prompt can see all categories simultaneously, allowing it to identify relationships between categories (e.g., the wrong date affects the statute of limitations calculation). The trade-off is prompt complexity — 67 lines is a lot for one prompt, and the LLM must juggle 8 simultaneous tasks.

**Why 8 specific categories instead of "find any inconsistencies"**: An open-ended prompt like "find any inconsistencies" produces wildly inconsistent results — sometimes it finds the date error, sometimes it doesn't, sometimes it flags irrelevant differences. Explicit categories act as a checklist that forces the LLM to systematically examine each dimension. The categories are ordered by importance (dates first, strategic omissions last) to front-load the critical checks within the LLM's attention.

**8 Fact-Checking Categories** (from `prompts.py`):
1. DATE_CONSISTENCY
2. PPE_SAFETY
3. WORK_CONTROL
4. SCAFFOLDING_CONDITION
5. OSHA_COMPLIANCE
6. INJURY_DETAILS
7. STATUTE_OF_LIMITATIONS
8. STRATEGIC_OMISSION

**Truncation strategy (line 26)**: Documents over 6,000 characters are truncated with a notice appended to the prompt. **Why 6,000 chars?** This keeps the total prompt under ~25,000 tokens (4 documents x 6,000 chars + prompt instructions), which fits comfortably within DeepSeek's context window while leaving room for the response. The truncation is lossy — contradictions in truncated content will be missed — but the alternative (exceeding context limits) would fail entirely.

#### Expert Level

**Precision rules deep dive** (prompts.py:46-52): These seven rules are the product of iterative failure analysis. Each rule addresses a specific false-positive pattern discovered during development:

1. *"Contradictory means the MSJ makes a SPECIFIC CLAIM that is directly refuted"* — Without this, the LLM flagged implicit claims (e.g., "MSJ implies the scaffolding was safe by not mentioning defects" -> contradictory). Requiring a specific claim raises the bar for contradiction.

2. *"An omission is only contradictory if the MSJ ACTIVELY HIDES material evidence"* — Without this, every fact in the police report that wasn't mentioned in the MSJ was flagged as contradictory. MSJs aren't required to recite every fact from every document. Only material omissions (facts that would change the legal outcome) count.

3. *"An omission is NOT contradictory if the MSJ simply doesn't mention routine, non-material facts"* — The negative version of rule 2. Gives explicit examples: "routine inspection, scheduled physical exam, arrival times, purpose of a visit." These examples calibrate the LLM's judgment about materiality.

4. *"If all documents agree and the MSJ does not misstate any fact, mark as consistent"* — The base case. Without this, the LLM sometimes flagged consistent facts as `COULD_NOT_VERIFY` because it couldn't find an exact textual match. Explicit instruction to default to consistent when there's no contradiction.

5. *"The purpose or context of a document is NOT a factual claim"* — Prevents the LLM from flagging differences in document framing (e.g., police report says "routine site inspection" but MSJ characterizes it as "incident investigation"). Document framing is not a factual claim in the MSJ.

6. *"When in doubt, prefer consistent or could_not_verify over contradictory"* — The meta-rule. Encodes the precision-over-recall trade-off. For legal AI, false positives (crying wolf) are more damaging than false negatives (missing an error) because false positives erode judicial trust in the system.

7. *"SKIP any category that does not apply"* — Prevents the LLM from generating scaffold-condition findings in a case about contract disputes. Without this, the LLM would generate entries for all 8 categories regardless of relevance, producing obvious false positives.

**Why these rules are in the prompt, not in code**: Post-processing rules (e.g., "if category doesn't appear in documents, filter it out") could be implemented in Python. But the precision rules need to influence the LLM's reasoning during generation, not filter its output after. An LLM that generates a "contradictory" finding and then has it filtered out has already wasted tokens and processing time. An LLM that doesn't generate the finding in the first place is cheaper and faster.

**Null handling cascade**: The LLM sometimes returns `is_consistent: null` (because JSON allows null for any field). Two layers handle this:
- `fact_checker.py:62-63`: Derives `is_consistent` from `status` when null (`raw_consistent = status_str == "consistent"`)
- `schemas.py:56-61`: Pydantic validator defaults `None` to `True`

**Why default to `True` (consistent)?**: The precision-over-recall trade-off again. If the LLM returns null for is_consistent, it probably means the LLM didn't find a clear contradiction (in which case consistent is the right default) or it couldn't determine either way (in which case consistent is the safer default for a legal system). Defaulting to `False` (contradictory) would generate false positives from ambiguous LLM outputs.

---

### Agent 4: ReportSynthesizerAgent (`report_synthesizer.py`)

#### Beginner Level
After the citation checker and fact checker finish their work, this agent reads all their results and creates a summary: what are the most important problems found? How confident is the system in its findings? It's like a senior lawyer reviewing all the research memos and writing an executive summary.

#### Intermediate Level
The synthesizer takes citation and fact verification results (JSON-serialized, truncated to 10,000 chars each — line 26-27), passes them to the LLM with `REPORT_SYNTHESIS_PROMPT`, and produces three outputs: top findings (ranked by severity), confidence scores, and unknown issues.

**Why a separate synthesis step instead of just concatenating results**: Raw verification results are noisy. The citation verifier might produce 10 entries, 7 of which are "SUPPORTED" — these aren't findings, they're confirmations. The fact checker might produce entries for all 8 categories, 5 of which are "consistent." A judge doesn't want to read 18 entries to find 6 actual problems. The synthesizer's job is editorial: surface what matters, rank it by severity, suppress what's noise.

**Why the LLM calculates confidence scores instead of a formula**: Confidence aggregation is a judgment call. Should overall confidence be the mean of all item confidences? The minimum? A weighted average? Each formula embeds assumptions about what "overall confidence" means. An LLM can consider the context: "3 consistent facts and 1 critical contradiction = overall confidence is LOW because the contradiction is a date error that affects the entire case." A formula would need explicit weights for each category — which is just moving the judgment from the LLM to the developer.

**The anti-noise instructions** (prompts.py:78-82): "Do NOT include mere summaries of consistent or unproblematic facts." "Do NOT promote could_not_verify items to findings unless they represent a material gap." These prevent the synthesizer from padding the report with non-findings, which would dilute the signal and make the report harder for a judge to use.

#### Expert Level

**Truncation at 10,000 chars per input** (line 26-27): This is a different truncation than the fact checker's 6,000. The synthesizer receives pre-processed results (serialized JSON), which are more token-dense than raw legal text. 10,000 chars of JSON is typically 8-12 verification entries — enough for a typical case but potentially lossy for complex ones with 20+ citations.

**Finding ID generation** (line 36): `f.get("id", f"F-{i+1}")`. If the LLM doesn't assign IDs (some runs it does, some it doesn't), the synthesizer assigns sequential IDs. This ensures the `Finding.id` field is always populated, which the eval harness checks (run_evals.py S-06: "Finding IDs are present and unique"). The `coerce_id` validator in schemas.py:74-77 ensures the value is always a string, even if the LLM returns an integer.

**Confidence score validation** (line 46-50): The synthesizer wraps the LLM's confidence dict in a `ConfidenceScores` model with `ge=0, le=1` constraints. If the LLM returns 0.95 for `overall` but 0.0 for `citation_verification`, Pydantic validates both values. If the LLM returns a value outside [0, 1], Pydantic raises a validation error, which the except block catches and returns zeroed scores.

---

### Agent 5: JudicialMemoAgent (`judicial_memo.py`)

#### Beginner Level
This agent takes the findings and writes a formal memo that a judge can read — like a law clerk summarizing the key issues, what the judge should pay attention to, and what the court should do next. It writes in legal language, not technical language.

#### Intermediate Level
The memo agent receives pre-computed findings and scores (not raw verification results) and writes a structured memo with four sections: a prose paragraph, a list of key issues, recommended actions, and an overall assessment.

**Why separate the memo from synthesis**: The synthesizer does analytical work (ranking, scoring). The memo agent does persuasive legal writing. These require different prompting strategies. The synthesizer prompt says "calculate scores" and "rank by severity." The memo prompt says "write in formal legal language" and "be specific about which claims are contradicted and by what evidence." An LLM prompted for analysis produces different (and better) analysis than one simultaneously trying to write a polished memo. Similarly, an LLM prompted for legal writing produces more fluent prose when not simultaneously doing arithmetic.

**Graceful failure** (line 33-49): The memo agent has its own try/except that returns a usable (if degraded) memo on failure. This means a memo generation failure never prevents the report from being returned — the report simply has `judicial_memo: null` or a fallback memo.

#### Expert Level

**Input truncation at 6,000 chars** (line 28): The findings JSON is truncated to 6,000 chars. For a case with many findings, this may truncate lower-priority findings. But since findings are pre-sorted by severity (by the synthesizer), the truncation preserves the most important findings and loses the least important ones — a natural degradation.

**Why the memo agent receives case_context**: The memo prompt includes `{case_context}` (line 30) so it can reference jurisdiction-specific knowledge when writing. For Rivera v. Harmon, this means the memo can reference "Privette presumption" by name rather than just describing "the misquotation of the cited case." For unknown cases, the context is empty and the memo is purely based on findings.

**The structured output choice**: The memo returns four fields (`memo`, `key_issues`, `recommended_actions`, `overall_assessment`) rather than a single prose blob. This enables the UI to display each section separately — the memo text in a paragraph, key issues as bullet points, recommended actions as an action list. A prose blob would require the frontend to parse natural language, which is fragile. Structured output means the frontend can render predictably.

---

## 5. Citation Verification Gaps

> They called this out specifically. Be honest about limitations FIRST, then articulate the production vision.

### Current State
- Citation verification relies on **LLM training data** for unknown cases
- Known cases (Rivera v. Harmon) get enriched context via `case_context.py` (19 lines of hardcoded knowledge)
- No integration with legal databases (Westlaw, LexisNexis, CourtListener)

### Why This Gap Matters
- A fabricated citation is worse than a null pointer — it can result in sanctions, case dismissal, loss of bar license
- Judges already distrust AI partly because of hallucinated citations (Mata v. Avianca)
- This is why Learned Hand built a "closed universe" — the answer to hallucination is constrained retrieval, not better prompts

### What To Say

1. **Acknowledge honestly**: "For the submission, citation verification relies on the LLM's training data for case existence and holding accuracy. This is the biggest gap for production."

2. **Production path**: "In production, you'd integrate with a legal database API:
   - **CourtListener** (free, open) for federal cases
   - **Westlaw/LexisNexis API** for comprehensive coverage
   - **Court-specific PACER** integration for filings
   - The agent would do a lookup, retrieve the actual case text, and verify the quote against the source"

3. **Closed Universe approach** (align with Learned Hand's architecture): "What Learned Hand does — the closed universe of verified authorities — is exactly right. The citation verifier should query a curated, verified corpus, not rely on an LLM's probabilistic memory of case law."

4. **Key framing**: "The verification *logic* is right; the knowledge *backend* needs to be replaced. For production, the LLM's role shifts from 'do you know this case?' to 'does this retrieved passage support the brief's claim?' — much more constrained and verifiable."

### 5-Tier Production Citation Verification

1. **Existence** — Query case law DB, verify volume/reporter/page, confirm case name matches. Deterministic lookup — no LLM judgment needed. **Why CourtListener first**: free, open-source, covers all federal cases, has an API. Westlaw/Lexis for comprehensive state coverage based on business needs.

2. **Holding** — RAG to retrieve actual opinion text, compare brief's characterization against real holding. The LLM's role shifts from "do you know this case?" (unreliable) to "does this retrieved passage support the brief's claim?" (much more reliable because the LLM is reading the actual text, not recalling from memory).

3. **Jurisdiction** — Parse reporter to determine jurisdiction. `S.W.3d` -> Texas. `So.3d` -> Florida. `Cal.4th` -> California. Rule-based lookup table — no LLM needed. Flag non-binding authority (e.g., Dixon is TX, Okafor is FL — neither binding in CA).

4. **Treatment** — Shepard's/KeyCite check: is the case overruled, reversed, questioned, or distinguished? A citation to an overruled case is the most dangerous — it's a real case the attorney may have found through legitimate research, but the law has changed.

5. **Proposition-level** — Extract the specific legal question the brief claims the case answers, search the opinion for relevant passages. This catches the subtlest error: a real case, correctly cited, but mischaracterized. This is where legal domain expertise matters in the prompt.

**The current system has the logic for tiers 1-3** (in `citation_verifier.py`) but backed by LLM knowledge instead of a database. The architecture doesn't change — only the knowledge source. The `{case_context}` injection pattern is the interface through which database results would flow.

### Expert-Level Detail

**Why the case context approach is both right and wrong**: The pattern — inject domain knowledge so the verifier knows what to look for — is architecturally correct. In production, `get_case_context()` would query a legal database instead of returning a hardcoded string. The interface is right; the implementation is a placeholder. But the placeholder reveals a fundamental issue: without external knowledge, the verifier is guessing.

**Why `COULD_NOT_VERIFY` partially but insufficiently addresses this**: The status enum includes `COULD_NOT_VERIFY` as a safe escape. In theory, the LLM should use this when it's not sure about a citation. In practice, LLMs are overconfident — they tend to assert either `SUPPORTED` or `NOT_SUPPORTED` rather than admitting uncertainty.

---

## 6. Cross-Document Consistency

### Beginner Level
The fact checker reads all four documents and compares them, looking for contradictions. Imagine you have four witnesses to a car accident. If three say it happened on Tuesday and one says Thursday, that's a contradiction. The fact checker does this systematically across dates, safety equipment, who was in charge, the condition of the scaffolding, and more.

The hardest part isn't finding obvious contradictions — it's avoiding false alarms. Not every difference between documents is a real contradiction.

### Intermediate Level
The fact checker receives all four documents in a single prompt with 8 explicit checking categories.

**Why all documents in one prompt instead of pairwise comparison**: Pairwise comparison (MSJ vs police, MSJ vs medical, MSJ vs witness) would require 3 separate prompts and couldn't detect multi-source contradictions. The date discrepancy (March 14 vs March 12) is most compelling because three independent documents agree on March 12 — seeing this in a single prompt is more powerful than three separate binary comparisons.

**Why explicit categories instead of open-ended**: Testing showed that "find any inconsistencies" produces wildly variable results. Explicit categories act as a checklist — the LLM systematically examines each dimension. This trades creative discovery for reliable coverage.

**Why the categories are ordered as they are**: DATE_CONSISTENCY comes first because dates are the easiest thing to check — a specific date either matches or doesn't. STRATEGIC_OMISSION comes last because it's the most subjective. Front-loading objective checks gives the LLM a warm-up of easy, high-confidence tasks before tackling the harder judgment calls.

### Expert Level

**The "skip inapplicable categories" instruction and its failure modes**:

- **False skip**: The LLM skips SCAFFOLDING_CONDITION because the MSJ doesn't explicitly discuss scaffolding condition — but the omission of scaffolding condition IS the finding (D-07). The instruction to skip inapplicable categories can conflict with the instruction to detect strategic omissions. This tension is inherent.

- **False inclusion**: The LLM generates an OSHA_COMPLIANCE entry even though the clean test documents don't discuss OSHA. This generates a false positive on precision tests.

**The MSJ-centric framing** (prompts.py:44): "The MSJ is the document being verified. When the police report, medical records, or witness statement contradict what the MSJ claims or implies, mark the fact as contradictory."

**Truncation and evidence loss**: Each document is capped at 6,000 characters. For a real 50-page MSJ, the truncation would lose approximately 80% of the document content.

**Why not chunk and merge**: Chunking would solve the truncation problem but introduce new ones: (1) cross-chunk references would break; (2) the merge step would need to deduplicate findings across chunks; (3) the number of LLM calls would multiply by chunk_count^2. For the take-home, truncation was the pragmatic choice. For production, chunking with cross-chunk context injection would be necessary.

---

## 7. Eval Harness Analysis

> **The standout** — be ready to go deep.

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

### Why This Eval Design Works
- **Weighted recall** reflects legal impact (critical errors get 2x weight)
- **Dual-matching** (keyword + semantic) catches errors that either method alone misses
- **Grounding check** ensures evidence isn't fabricated — critical for legal
- **Precision test** prevents over-flagging (a real problem in legal AI)
- **Persistent SQLite** enables trend tracking across runs
- **Precision rules in prompts** (prompts.py:46-52) — explicit instructions to avoid false flags on consistent documents

### Be Prepared to Discuss

- *"Why keyword matching AND LLM-as-judge?"* — Keyword matching is deterministic, fast, transparent. LLM-as-judge catches semantic equivalences keyword matching misses (e.g., "date discrepancy" vs "incorrect incident date"). Union gives best coverage.
- *"How would you scale eval to more test cases?"* — Build a corpus of real MSJ filings with annotated errors. Each case type exercises different fact categories. Automated regression suite.
- *"How do you prevent eval overfitting?"* — Clean doc precision test acts as negative control. Would add adversarial cases (subtle errors, near-misses) and periodically refresh test corpus.

### Expert-Level Eval Details

**The `_check_ground_truth()` matching algorithm** (run_evals.py:217-230): Two matching modes:

```python
if gt["match_mode"] == "any":
    return any(kw in all_text for kw in gt["keywords"])
elif gt["match_mode"] == "keyword_plus_signal":
    has_keyword = any(kw in all_text for kw in gt["keywords"])
    has_signal = any(sig in all_text for sig in gt.get("require_also", []))
    return has_keyword and has_signal
```

- **`any` mode** (D-01 DATE, D-04 SOL, D-07 SCAFFOLDING, D-08 SPOLIATION): Any keyword triggers a match. Used for errors where a single keyword is sufficiently specific.

- **`keyword_plus_signal` mode** (D-02 PPE, D-03 PRIVETTE, D-05 CTRL, D-06 JURISDICTION): Requires both a keyword AND a signal word. Used for errors where the keyword alone is ambiguous.

**Why keyword-based instead of embedding-based**: Keywords are deterministic, debuggable, and transparent. The eval should be the most predictable component in the system — using an LLM for eval introduces LLM uncertainty into the measurement of LLM accuracy, which is epistemologically problematic.

**The text extraction pipeline** (run_evals.py:179-214): `_extract_searchable_text()` pulls text from three report sections and normalizes to lowercase. Each ground truth item specifies which sections to search (`search_in`), reducing false matches from unrelated content.

**Precision test architecture**: Clean documents (Smith v. ABC Corp, test_cases.py:118-159) — all four documents internally consistent. P-01 allows 1 finding instead of 0 to accommodate LLM noise without masking systematic false positives.

**The evidence grounding check** (metrics.py:59-109): For each finding, checks whether evidence text (10+ chars) appears as a substring in source documents. **Why 10 characters minimum**: shorter substrings produce false matches ("March" = 5 chars appears in many contexts; "March 12, 2021" = 14 chars is specific enough).

**Promptfoo A/B test design**: `prompt-precision-*.yaml` configs run test cases through precise and imprecise prompt variants side by side, quantifying the impact of prompt engineering.

**Reflection honesty eval** (`reflection-honesty.yaml`): Uses DeepSeek-R1 (reasoner) as a judge to evaluate REFLECTION.md across 6 dimensions with weighted scoring: `real_weaknesses` (3x), `qualified_numbers` (2x), `eval_self_critique` (2x), `scope_honesty` (1x), `future_specificity` (1x), `not_performative` (1x).

---

## 8. Confidence Scoring

### Beginner Level
Every finding comes with a confidence score from 0 to 1, plus an explanation. The problem: these are the AI's best guess, not statistically calibrated probabilities. When the model says 0.85, it doesn't mean "85% of items with this score are correct." It means "I feel 85% sure."

### Intermediate Level
Confidence appears at three levels:

1. **Per-item**: Each `VerifiedCitation` and `VerifiedFact` has a `confidence` float [0,1] with optional `confidence_reasoning`. Assigned by the LLM during verification.

2. **Per-finding**: Each `Finding` has its own `confidence` and `confidence_reasoning`. Assigned by the synthesizer.

3. **Aggregate**: `ConfidenceScores` has `citation_verification`, `fact_consistency`, and `overall`. Calculated by the synthesizer LLM.

**Why three levels**: A judge needs per-item granularity ("How reliable is the date discrepancy finding specifically?"), per-finding severity ("How serious is this issue overall?"), and aggregate assessment ("Should I be concerned about this brief in general?").

**Why `confidence_reasoning` was added**: An opaque 0.3 confidence is nearly useless. The reasoning transforms confidence from a black-box number into an auditable judgment. Cost is ~30-50 additional tokens per item — negligible.

### Expert Level

**The calibration gap**: LLM confidence scores suffer from overconfidence, arbitrary precision, and context sensitivity.

**Production calibration approach**:
1. **Data collection**: Run pipeline on N cases with known ground truth
2. **Platt scaling**: Fit logistic regression: `calibrated = 1 / (1 + exp(-(a * raw + b)))`
3. **Isotonic regression**: Non-parametric alternative, more flexible
4. **Binning**: Map to discrete levels: HIGH (>0.8), MEDIUM (0.5-0.8), LOW (0.2-0.5), UNVERIFIABLE (<0.2)
5. **Source differentiation**: Display "VERIFIED (database)" vs. "ESTIMATED (AI assessment)" — the source of confidence matters more than the number

---

## 9. Error Handling & Graceful Degradation

### Beginner Level
The system is designed to never crash completely. If one part fails, the system continues with whatever it can still do and tells you what failed. Four layers of protection: individual LLM call timeouts, per-agent error handling, orchestrator-level error handling, and API-level input validation.

### Intermediate Level

**Layer 1 — LLM Call Timeout** (`base_agent.py:22-33`): Every LLM call wrapped in `asyncio.wait_for()` with 120-second timeout.

**Layer 2 — Agent-Level**: Each agent catches its own exceptions and returns degraded but valid output:
- Parser: `{citations: [], facts: [], error: str}`
- Citation verifier: `VerifiedCitation` with `COULD_NOT_VERIFY`
- Fact checker: `[]`
- Synthesizer: Zeroed confidence scores, empty findings
- Memo agent: Error text in memo field, empty action lists

**Layer 3 — Orchestrator-Level** (orchestrator.py:75-168):
- Parser failure = cannot continue -> immediate error report
- Citation/fact failure = continue with partial results
- Synthesizer failure = minimal report from raw data
- Memo failure = report without memo

**Layer 4 — API-Level** (main.py:35-51): Pydantic validators on `AnalyzeRequest`.

### Expert Level

**The degradation hierarchy**:

```
Level 0: Full report — all 5 agents succeed
Level 1: Report without memo — memo agent fails
  -> Still has citations, facts, findings, confidence scores
Level 2: Report with partial verification — one of citation/fact agents fails
  -> Still has results from the healthy agent (via pipeline_status)
Level 3: Report with only raw data — synthesizer fails
  -> Raw verified citations/facts but no ranked findings or scores
Level 4: Error report — parser fails
  -> No useful analytical data; report contains error message
```

**Why the parser failure is immediately fatal**: Without citations, the citation verifier has nothing to verify. Running only the fact checker produces a misleadingly partial result.

**Why not retry on failure**: Time-constraint decision. Production would implement `@retry(max_attempts=2, backoff=5s, on=[TimeoutError, ConnectionError])`.

**Why `return_exceptions=True` in `asyncio.gather`**: Ensures both parallel tasks complete independently. Without it, one failure cancels all in-flight tasks.

**Why transparency matters for judicial AI**: A black box that says "analysis complete" without showing which components succeeded is unacceptable. The `AgentStatus` list makes failures visible.

---

## 10. Hallucination Mitigation (6-Layer Defense-in-Depth)

Frame this as a production roadmap when asked "how would you prevent hallucination in a court-facing system?"

| Layer | What | How |
|-------|------|-----|
| 1. Closed Universe | Verification only against curated, verified sources | No fallback to parametric knowledge. If the case isn't in the corpus, return `could_not_verify`, never fabricate |
| 2. RAG | Retrieve actual case opinions from legal database | CourtListener (free, federal), Westlaw/LexisNexis API (comprehensive). Verifier checks retrieved text, not LLM memory |
| 3. Multi-Agent Cross-Validation | Independent agents analyzing different aspects | Citation verifier + fact checker are independent. Disagreements surface as flags, not silent failures |
| 4. Structured Output Constraints | Pydantic enums force constrained output space | `VerificationStatus` enum: `SUPPORTED / NOT_SUPPORTED / COULD_NOT_VERIFY / MISLEADING`. `could_not_verify` is a safe escape hatch |
| 5. Confidence Calibration | Statistical calibration on eval data | Platt scaling or isotonic regression. Currently directional, not calibrated |
| 6. Human-in-the-Loop | Side-by-side source links, mandatory human review | Low-confidence items require explicit human sign-off |

Connect to Learned Hand's "closed universe" design principle throughout.

---

## 11. Production Readiness Assessment

| Aspect | Current State | Production Need | Gap Severity |
|--------|--------------|-----------------|-------------|
| Citation verification | LLM parametric knowledge | Legal database (Westlaw, CourtListener) | **Critical** |
| Document format | Text files only | PDF, DOCX, scanned docs with OCR | **High** |
| Auth/Security | None (open API) | JWT, RBAC, audit logs | **High** |
| Persistence | Stateless, no DB | Case-linked storage with audit trail | **High** |
| Fact categories | 8 hardcoded in prompt | Dynamic per-case inference | **Medium** |
| Eval coverage | 1 test case, 8 errors | 50+ briefs, diverse error taxonomy | **Medium** |
| Model quality | DeepSeek / Ollama qwen2.5:7b | GPT-4, Claude, or legal fine-tune | **Medium** |
| Confidence calibration | Raw LLM estimates | Calibrated probabilities | **Medium** |
| Observability | Python logging | Langfuse/OpenTelemetry, cost tracking | **Low** |
| Streaming | Request-response | SSE/WebSocket for real-time updates | **Low** |

**Critical path to production** (priority order):
1. **Legal database integration** — replaces LLM guessing with deterministic citation verification
2. **Document parsing** — PyPDF2/pdfplumber for digital PDFs, Tesseract OCR for scanned
3. **Dynamic fact categories** — two-pass: LLM identifies relevant categories, then checks those
4. **Model upgrade** — swap `LLMService` to frontier model (configuration change)
5. **Observability** — Langfuse integration for tracing, cost tracking, latency monitoring

**Why the architecture is production-ready even though the system isn't**: Production readiness has two orthogonal dimensions: architecture (how components communicate) and implementation (what each component does). The architecture — 5 specialized agents with typed contracts, parallel execution, graceful degradation, deterministic orchestration — is sound. Adding legal database integration means changing what `CitationVerifierAgent._verify_one()` does internally, not how it connects to the rest of the pipeline.

**What would actually break at scale**: The single-prompt fact checker. With 50-page documents, the 6,000-char truncation would lose critical content. Fixing requires either chunking within the fact checker or adding a document summarization agent — the only true architectural change needed.

---

## 12. Trade-offs & Design Decisions

### Architecture Trade-offs (Quick Reference)

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
| 8 hardcoded fact categories | Dynamic inference | LLM first pass to identify relevant fact categories |
| Single test case | Comprehensive corpus | Build annotated case library per case type |
| LLM-based citation check | Database verification | Integrate legal databases |
| Single-pass analysis | Multi-turn refinement | Add verification loop with confidence thresholds |
| No user feedback | Active learning | Track judge corrections, retrain prompts |

### Deep Analysis

**Trade-off 1: 5 agents vs. fewer or more**

| | 3 Agents | 5 Agents (chosen) | 7+ Agents |
|---|---------|-------------------|-----------|
| LLM calls | 3 | 5-6+ (citations parallelized) | 7+ |
| Prompt quality | Diluted (mixed tasks) | Focused (one task each) | Extremely focused |
| Failure isolation | Coarse | Good | Excellent |
| Coordination overhead | Low | Moderate | High |
| Latency | ~20s | ~25-30s | ~40s+ |

The 5-agent decomposition maps to distinct cognitive tasks: extract (be comprehensive), analyze (be skeptical), aggregate (be concise), communicate (be persuasive). Fewer agents conflate these instructions; more agents add coordination overhead without meaningful specialization gains.

**Trade-off 2: Single LLM call per agent vs. multi-turn refinement**

Single-pass was right for the take-home: eval shows 6-8 of 8 planted errors caught. Multi-turn would be right for production: low-confidence findings (0.3) should trigger re-analysis with additional context. The architecture supports this — add a `while confidence < threshold: re-analyze()` loop.

**Trade-off 3: Precision over recall in fact checking**

Legal AI has asymmetric error costs. False positives erode judge trust. False negatives are bad but the brief still gets normal human review. The precision rules encode this: "when in doubt, prefer consistent or could_not_verify over contradictory."

**Trade-off 4: Case context injection vs. always-generic**

The `{case_context}` injection pattern is the same interface a database lookup would use. The 19 lines of hardcoded knowledge demonstrate the architecture. The eval tests both enriched (recall) and clean (precision) cases.

**Trade-off 5: Schema injection vs. native structured output**

DeepSeek's OpenAI-compatible API has inconsistent support for `response_format` and function calling. Schema-in-prompt via LangChain is the most portable approach. The cost: less reliable than native structured output, requiring a three-layer parsing pipeline (`_extract_json()`).

**Trade-off 6: DeepSeek + Ollama vs. frontier models**

DeepSeek was an assignment constraint. The architecture abstracts the model behind `LLMService` — swapping to GPT-4 requires changing an environment variable. But prompt engineering is model-specific; changing models requires re-running eval and potentially re-tuning prompts.

---

## 13. First-Principles Decision Analysis

### Why Multi-Agent Instead of Single-Agent

**The fundamental constraint**: LLM attention is finite and task-switching degrades quality.

When you ask an LLM to simultaneously extract citations, verify their accuracy, cross-reference facts, synthesize findings, and write a judicial memo, each objective gets partial attention. The parser's entire attention is on extraction. The verifier's entire attention is on skeptical assessment.

**The empirical evidence**: The single-prompt version caught 3-4 of 8 planted errors. The multi-agent version catches 6-8. The architecture change, not prompt tuning, drove the improvement.

### Why Pydantic-Typed Contracts

**The fundamental assumption**: LLMs produce structurally inconsistent output, and downstream agents cannot tolerate structural variance.

An LLM might return `"status": "not supported"`, `"NOT_SUPPORTED"`, `"unsupported"`, or `null`. The `VerificationStatus` enum constrains the output space to 4 valid values. The `STATUS_MAP` dict maps LLM strings to enum values with a safe default. Why Pydantic specifically (not dataclasses, TypedDict, or attrs): (1) `model_validate()` for parsing untyped dicts, (2) `field_validator` for custom coercion, (3) `model_json_schema()` for prompt injection.

### Why the Orchestrator Has Zero LLM Calls

**The fundamental value**: Predictability and debuggability in the control plane.

In a legal system, you need to guarantee that every brief gets the same analytical treatment. An LLM orchestrator introduces non-deterministic control flow — different briefs get different pipeline paths — making eval results incomparable across runs.

**The deterministic guarantee**: Every brief, every time: Parser -> [Verifier || Checker] -> Synthesizer -> Memo. No exceptions.

### Why Parallel Execution at Exactly One Point

**The fundamental constraint**: Data dependencies define the maximum parallelism.

- Verifier needs Parser output (citations)
- Checker needs raw documents (no Parser dependency)
- Synthesizer needs Verifier AND Checker output
- Memo needs Synthesizer output

This dependency graph has exactly one parallelization opportunity: Verifier and Checker after Parser completes.

**Why not parallelize Parser and Checker**: Parser failure should abort early. Running Checker in parallel with Parser wastes tokens on an abort path.

**Why not parallelize fact checking per-category**: 8 prompts x 4 documents = 32 document-in-prompt instances vs. 1 prompt x 4 documents = 4 instances. Also, categories aren't truly independent — the wrong date affects the statute of limitations calculation.

### Why `COULD_NOT_VERIFY` Is the Most Important Design Element

Without `COULD_NOT_VERIFY`, forced binary classification on uncertain legal questions is dangerous. A wrong `SUPPORTED` on fabricated citations gives false assurance; a wrong `NOT_SUPPORTED` on real citations is a false accusation.

**The meta-lesson**: In legal AI, expressing uncertainty correctly is more valuable than increasing accuracy by 10%. Judges know how to handle uncertainty — they don't know how to handle confident errors.

### Why the Fact-Checking Prompt Is 67 Lines Long

In an LLM system, the prompt IS the business logic. The 7 precision rules are business rules. The 8 categories are a feature specification. Each line was added to fix a specific failure mode observed during development. The prompt is exactly as long as it needs to be — removing any line reintroduces the failure it was designed to prevent.

### Why the API Is Synchronous (Not Streaming)

Streaming adds significant complexity (StreamingResponse, async generators, incremental state updates, mid-stream error handling). For a take-home, the pipeline completes in 30-60 seconds — tolerable. For production with 3-5 minute runs, streaming would be essential.

### Why LangChain Instead of Raw API Calls

LangChain contributes ~5% of its surface area here. The same functionality could be achieved with `httpx` and 50 lines of code. But ChatOpenAI already handles DeepSeek's OpenAI-compatible API, streaming, retries, and async. In production, you'd either pin exact versions or replace with a thin wrapper around the provider's SDK.

### Why Docker Compose

The Makefile exposes `make up` (start), `make eval` (run evals), `make down` (stop). The eval container uses the same Docker image as the backend but runs `python run_evals.py`. Volume mounts enable hot-reload during development.

---

## 14. What Would Change at Scale

### Intermediate Level

- **Document processing**: PDF extraction with layout preservation. Chunking by section/argument, merge with deduplication.
- **Citation verification**: RAG pipeline over curated legal corpus. Multi-stage: existence check -> holding retrieval -> proposition-level comparison. Cache frequently-cited cases.
- **Fact category inference**: Two-pass approach. First pass: identify relevant categories. Second pass: check those categories.
- **Confidence calibration**: Collect (confidence, accuracy) data across thousands of items. Display calibrated confidence as discrete levels.

### Expert Level

- **Streaming architecture**: SSE (not WebSocket — simpler, sufficient for server-to-client updates).
- **Multi-turn verification loop**: Confidence-gated re-analysis. Items below threshold get database lookup + RAG retrieval. Items still low after re-analysis flagged "requires human review."
- **Observability**: Distributed tracing with correlation IDs. Aggregate dashboards: cost per case, latency P50/P95, recall/precision trends, confidence distribution shifts.
- **Confidence distribution monitoring**: If the distribution suddenly shifts after a model update, it signals behavior change — the canary for model regression.

---

## 15. Legal Domain Vocabulary (Use Correctly)

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

## 16. Interview Q&A

### Architecture

**Q: Why 5 agents instead of 3 or 7?**
A: Each agent has a distinct cognitive task. Parser extracts (be comprehensive). Verifier and checker analyze independently (hence parallel). Synthesizer aggregates and ranks. Memo writer communicates for a judicial audience. The 5th agent (JudicialMemo) was added because synthesis and memo writing are different skills — analytical aggregation vs. persuasive legal writing.

**Q: How would you handle a 200-page brief?**
A: Chunking strategy — split by section/argument, run extraction per chunk, deduplicate citations across chunks, maintain section references for traceability. The fact checker already truncates long documents to 6000 chars per source (`fact_checker.py:26`) and adds a truncation notice.

**Q: How would you handle multiple motions in a single case?**
A: Each motion gets its own pipeline run. Cross-motion consistency checking would be a new agent that compares findings across motions.

**Q: Tell me about the graceful failure handling.**
A: Every agent is wrapped in try/except with status tracking (`_track/_start/_succeed/_fail` in orchestrator.py). Parser failure = immediate error report. Citation or fact checker failure = continue with partial results. Synthesizer failure = minimal report from raw data. Memo failure = report without memo. `AgentStatus` entries make failures transparent. Strictly better than all-or-nothing.

### Eval & Quality

**Q: Your eval only has one test case. How confident are you in the system?**
A: Not confident enough for production. The eval proves the architecture works and can catch real errors. Scaling requires annotated cases across practice areas. But the eval infrastructure is there — adding cases is incremental, not architectural change.

**Q: How would you measure hallucination rate in production?**
A: Three approaches: (1) Sample-based human review — judges flag incorrect findings, track rate. (2) Grounding audit — automated check that every claim traces to source text (already built: `calculate_grounding()`). (3) Citation verification against legal databases — binary check on case existence.

**Q: What's your precision vs recall trade-off philosophy for legal AI?**
A: **Precision matters more than recall** — a false positive erodes trust and wastes judicial time. But recall matters too — missing a fabricated citation is dangerous. High precision with transparent confidence, so judges can decide what to investigate further. The prompt has explicit precision rules (prompts.py:46-52).

### Production & Scale

**Q: How would this work in a real court system?**
A: Integration points: (1) Case management system feeds documents. (2) Pipeline runs asynchronously, produces report. (3) Law clerk reviews in UI, accepts/rejects findings. (4) Feedback loop improves prompts. (5) Audit trail for every finding.

**Q: How do you handle adversarial briefs designed to fool the system?**
A: Defenses: (1) Database-grounded citation checks (can't fool a lookup). (2) Multi-source fact verification. (3) Pattern detection for known manipulation techniques. (4) Always surface uncertainty — let the human judge decide.

**Q: Latency requirements?**
A: Courts don't need real-time. 30 seconds to 2 minutes is fine for a document that takes a law clerk hours. Optimize for accuracy, not speed.

### Legal Domain

**Q: What makes a legal AI failure different from other AI failures?**
A: Three dimensions: (1) **Consequences** — wrong output can lead to unjust rulings, sanctions, rights violations. (2) **Accountability** — judges sign their names to orders. (3) **Adversarial context** — opposing counsel will find every error.

**Q: How do you think about bias in legal AI?**
A: Mitigation: (1) Closed universe of verified authorities. (2) Flag when analysis relies on few sources. (3) Surface conflicting precedent rather than picking winners. (4) Regular audits against demographic and jurisdictional fairness metrics.

**Q: What's your view on AI in judicial decision-making?**
A: AI should augment, never replace. Best use: mechanical tasks (citation checking, date cross-referencing, summarization). Worst use: predicting outcomes, recommending sentences, making credibility determinations.

### Gotcha Questions

| Question | Response |
|----------|----------|
| "Your verifier only works because you hardcoded Privette knowledge" | "Yes, `case_context.py` is 19 lines of hardcoded domain knowledge. The architecture is right — the `{case_context}` injection pattern works for any case. But production needs a real knowledge backend. The verification *logic* is identical regardless of source." |
| "Why DeepSeek for judicial work?" | "Take-home constraint — the assignment said DeepSeek. Architecture is model-agnostic. `LLMService` abstracts the provider (line 54-69). Swap to Claude, GPT-4, or fine-tuned model with zero pipeline changes." |
| "Fact checker has hardcoded fields" | "Called this out in my reflection (line 55). The 8 categories are Rivera-specific. Production: add a classification step — LLM reads documents, identifies relevant categories dynamically." |
| "How do you prevent eval overfitting?" | "Clean doc test (Smith v. ABC Corp) is a negative control. Need diverse corpus across practice areas, error taxonomies, difficulty tiers. The eval infrastructure scales — adding cases is incremental." |
| "What would you do with a week instead of 8 hours?" | "Three priorities: (1) RAG over curated case law (CourtListener API). (2) 5+ diverse test briefs with different error types. (3) Confidence calibration so scores are statistically meaningful." |
| "Your pipeline is single-pass — what about iterative refinement?" | "Time constraint choice. Architecture supports multi-turn: verifier flags low-confidence items, orchestrator routes them back. Add confidence threshold — above it, accept; below, re-analyze with retrieval augmentation." |

---

## 17. About Learned Hand

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

## 18. Questions to Ask Them

1. "What does the current citation verification pipeline look like? Is it RAG against a curated corpus, or something else?"
2. "How do you handle jurisdictional differences — federal vs state, circuit-level precedent?"
3. "What's the hardest failure mode you've seen in production?"
4. "How do judges and law clerks actually interact with the tool day-to-day?"
5. "What does the feedback loop look like — do clerks correct the AI's output, and does that flow back into improvement?"
6. "What's the team structure? How many engineers, how many domain experts?"
7. "What's the biggest technical challenge you're facing right now?"

Lead with: "How do you handle the boundary between closed universe and LLM parametric knowledge?"

---

## 19. Personal Narrative

**Why this role fits you:**
- Built production AI systems (nomadically.work — multi-model classification, eval pipelines, Langfuse observability)
- Understand that AI for high-stakes domains requires verification, not just generation
- BS Detector shows exactly this: structured analysis, citation checking, eval-first development, honest uncertainty
- Engineer who takes correctness seriously (typed contracts, eval harnesses, grounding checks)

**What to convey:**
- Excited about legal AI specifically because the cost of error is high — it forces better engineering
- Pragmatic about LLM limitations (reflection acknowledged gaps honestly)
- Can own the full stack (Python backend, React frontend, eval infrastructure)
- Move fast but with rigor (eval harness, not just demos)

**Nomadically.work system** (if they ask about other work):
- Two-tier ML architecture: Deterministic heuristic (Rust, rayon parallelism) + LLM fallback (DeepSeek)
- Signal engineering: 7-layer country resolution, regex pattern matching, ATS metadata normalization
- Cost optimization: Heuristic handles ~70% of jobs (free), LLM only on ambiguous cases
- Eval discipline: 180+ regression tests, real-world job coverage
- Production scale: Cloudflare Workers, D1, async queues

---

## 20. Code Reference Quick Lookup

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

## 21. Interview Strategy

### Timing

| Time | Phase | Focus |
|------|-------|-------|
| 0-5 min | Warm intro | Reference Michigan Supreme Court + "closed universe" approach. Show you've researched them. |
| 5-20 min | Architecture walkthrough | 5 agents, parallel execution, typed contracts, graceful degradation. Walk through `orchestrator.py` flow |
| 20-35 min | Citation verification deep dive | Be honest about gaps FIRST, then articulate production vision (5-tier model). This is THE topic. |
| 35-50 min | Production readiness + hallucination | 6-layer defense, eval strategy, connect everything to Learned Hand's judicial context |
| 50-55 min | Your questions | Pick 2-3 from Section 18. Lead with "How do you handle the boundary between closed universe and LLM parametric knowledge?" |
| 55-60 min | Wrap-up | Express genuine interest. "The cost-of-error framing is what excites me — it forces better engineering." |

### Critical Mindset

1. **Be honest about limitations before they ask** — they praised your honest reflection. Lead with gaps, then solutions.
2. **Frame everything through judicial stakes** — wrong output ruins lives, not just UX. Every design choice should reference this.
3. **Connect to their product** — "here's how I did it, here's how I'd adapt it for a court-facing system with your closed-universe architecture"
4. **Demonstrate eval thinking** — every quality claim should have "and here's how I'd measure it"
5. **Use legal vocabulary correctly** — "Privette presumption," "binding authority," "spoliation," "MSJ standard"
6. **Show you understand their users** — judges need trust, auditability, and speed. Law clerks need comprehensive analysis they can verify quickly.

---

## 28. Behavioral & Cultural Fit

STAR-format answers grounded in real project decisions. Keep answers under 90 seconds each. Start with the punchline, then walk through the STAR structure.

### 28.1 "Tell me about a time you had to make a difficult technical trade-off"

**Situation**: The BS Detector's fact checker needed a verification strategy. I had two options: single-pass analysis (one LLM call evaluates the entire brief against all source documents) or multi-agent decomposition (separate agents parse, check citations, check facts, then synthesize).

**Task**: Deliver the highest detection accuracy within an 8-hour take-home constraint while building something architecturally honest — not a demo hack.

**Action**: I ran a quick test with the single-pass approach first. It caught 3-4 of 8 planted errors and often hallucinated findings. So I invested the extra time to decompose: a parser agent extracts structured claims, a citation verifier checks legal authorities, a fact checker cross-references against source documents, and a synthesizer merges results. Each agent has a focused prompt with explicit precision rules (`prompts.py:46-52` — "prefer consistent over contradictory"). The trade-off was real: decomposition meant building typed Pydantic contracts between agents (`models/schemas.py`), parallel execution logic (`orchestrator.py:110-112`), and graceful degradation for each failure point. That is significantly more code than a single prompt.

**Result**: The decomposed pipeline catches 6-7 of 8 errors consistently, with near-zero false positives on clean documents. Vienna's feedback specifically praised "five agents with real role separation" and "typed contracts." The architectural investment paid off both in accuracy and in demonstrating production thinking.

### 28.2 "Tell me about a time you shipped something you weren't fully satisfied with"

**Situation**: The citation verification agent checks whether cited cases are real and whether they say what the brief claims. But it does this entirely through LLM parametric knowledge — it asks DeepSeek "Is Rivera v. ABC Construction a real case?" without querying any legal database.

**Task**: Decide whether to ship with LLM-only verification or block on building database integration.

**Action**: I shipped it, but I was explicit about the gap. In REFLECTION.md, I wrote that this is the single biggest limitation. In the eval harness, I designed ground truth items that would expose this weakness. And I documented the 5-tier production model I would build: (1) database lookup against a curated corpus, (2) similarity search for near-miss citations, (3) LLM verification as a fallback, (4) quotation comparison with retrieved text, and (5) confidence differentiation between "verified against database" and "estimated by AI."

**Result**: This turned out to be a strength. Vienna called the reflection "honest and matched the actual code quality." Shipping with a known limitation and a clear remediation plan demonstrated more engineering maturity than either hiding the gap or over-engineering a half-baked solution. The lesson: ship what works, document what does not, and have a plan.

### 28.3 "How do you approach a problem you've never solved before?"

**Situation**: I had never built a legal AI evaluation system. The take-home required not just a pipeline but a way to measure whether it works — on domain-specific legal content with weighted severity.

**Task**: Design an eval harness from first principles that could quantify detection quality across multiple error types with different legal impact levels.

**Action**: I started by defining what "correct" means in this domain. Not all errors are equal: a misquoted legal standard (D-03 PRIVETTE, "never liable" vs actual holding) is more dangerous than an omitted detail (D-07 SCAFFOLDING). So I built weighted recall where critical errors get 2x weight. I designed dual matching — keyword-based deterministic checks plus LLM-as-judge semantic evaluation — because neither alone is sufficient. I added a grounding check (`metrics.py:59-109`) requiring 10+ character substring matches against source documents, preventing the eval from rewarding hallucinated evidence. And I included a precision test with clean documents (Smith v. ABC Corp) as a negative control.

**Result**: 31 eval assertions across 6 categories, SQLite persistence with git SHA tracking for trend analysis, and promptfoo A/B configs for prompt engineering measurement. The eval harness became the standout feature — Vienna highlighted it specifically. The approach: define correctness precisely, build measurement before optimization, and make the eval the most deterministic component in the system.

### 28.4 "Tell me about a time you had to learn a new domain quickly"

**Situation**: The take-home involved a motion for summary judgment in a California construction injury case. I needed to understand Privette presumption (hirer non-liability for independent contractor injuries), MSJ standard (moving party burden, triable issues of material fact), binding vs. persuasive authority, and spoliation doctrine — none of which I had prior knowledge of.

**Task**: Learn enough legal domain knowledge in hours to build a system that checks legal reasoning, not just text similarity.

**Action**: I did three things. First, I read the test documents carefully — the brief, the police report, medical records, and witness deposition — and mapped the legal arguments to their factual foundations. Second, I built domain knowledge directly into the pipeline: `case_context.py:7-18` injects case-specific context including correct Privette doctrine so the LLM has ground truth to compare against. Third, I encoded domain concepts into the eval: the 8 fact categories (DATE, PPE, PRIVETTE, SOL, CTRL, JURISDICTION, SCAFFOLDING, SPOLIATION) in `prompts.py:56-63` reflect legal analysis categories, not generic text comparison.

**Result**: The system correctly identifies that "never liable" is a misquotation of Privette (the actual doctrine has exceptions), that Dixon (TX) and Okafor (FL) are non-binding in California, and that post-incident scaffold reconstruction constitutes potential spoliation. Domain learning was embedded in the code, not just in my head.

### 28.5 "How do you prioritize when everything seems important?"

**Situation**: Eight-hour time constraint. I needed a parser, citation verifier, fact checker, synthesizer, eval harness, API layer, and documentation. Everything felt essential.

**Task**: Decide build order and identify what to cut.

**Action**: I prioritized by asking: "What proves this system works?" Answer: the eval harness. If I build a beautiful pipeline with no measurement, I have a demo. If I build measurement first, every subsequent decision is data-driven. So I built in this order: (1) Pydantic schemas and typed contracts — the skeleton everything hangs on. (2) Core agents with focused prompts. (3) Orchestrator with parallel execution and graceful degradation. (4) Eval harness with weighted recall. (5) Honest reflection. What I cut: database-backed citation verification, a frontend UI, multi-turn iterative refinement, and calibrated confidence scores. Each cut was deliberate and documented.

**Result**: Delivered a complete, testable, eval-driven pipeline. The cuts were the right ones — they are all production enhancements that require infrastructure (databases, user studies, calibration data) not available in a take-home context. Vienna's feedback validated this: architecture, eval, and honesty were the three things that landed.

### 28.6 "Tell me about a failure and what you learned"

**Situation**: My first attempt at the BS Detector was a single-prompt approach: paste the brief and source documents into one LLM call and ask it to find errors.

**Task**: Detect 8 planted errors across factual, legal, and procedural categories.

**Action**: I ran it. It caught 3-4 errors, missed the subtle ones (statute of limitations date, non-binding jurisdiction), and worse — it hallucinated findings that were not in the documents. The single-prompt approach failed because: (1) the context window was overloaded with 4 documents, (2) there was no separation between extraction and analysis, and (3) the LLM had no precision guardrails.

**Result**: I scrapped it and rebuilt with decomposition. The key lesson: **decomposition is not just architectural elegance — it directly improves accuracy.** Each agent operates on a narrower context with a focused task, which reduces both false negatives (missed errors) and false positives (hallucinated findings). This is the same insight behind Learned Hand's closed-universe approach: constraining what the model sees and does is more reliable than asking it to do everything at once.

### 28.7 "Why this company?"

**Punchline**: Three reasons, in order of importance.

**First — judges are the most consequential AI users.** A chatbot that hallucinates costs someone a bad restaurant recommendation. A legal AI that hallucinates costs someone their freedom. Building for courts forces engineering discipline that most AI companies never develop. That appeals to me.

**Second — closed universe is the right architecture.** Most legal AI companies bolt RAG onto a general LLM and hope for the best. Learned Hand constrains to verified authorities at the architecture level, not the prompt level. That is the only approach that can earn judicial trust. My BS Detector makes the same bet: structured verification against source documents, not open-ended generation.

**Third — the Michigan Supreme Court contract proves product-market fit.** This is not a research project. Courts are using it. That means the engineering challenges are real production problems — scaling, reliability, citation accuracy at volume — not academic exercises.

### 28.8 "What's your approach to code quality?"

**Four principles, each with a concrete implementation:**

1. **Typed contracts over loose dictionaries.** Every agent in the BS Detector communicates through Pydantic models (`models/schemas.py`). `VerifiedCitation`, `VerifiedFact`, `Finding`, `VerificationReport` — each with enforced types. This catches integration bugs at parse time, not at runtime in production.

2. **Eval before optimization.** I built the eval harness before tuning prompts. 31 assertions, weighted recall, grounding checks. Without measurement, prompt engineering is guesswork. Same discipline on nomadically.work: 180+ regression tests before changing classification logic.

3. **Graceful degradation over crash-or-succeed.** If the citation verifier fails, the pipeline still returns fact-checking results with a clear error note (`orchestrator.py:22-42`). Four layers: LLM call timeouts, per-agent error handling, orchestrator-level recovery, API input validation.

4. **Honest reflection over polished demos.** REFLECTION.md documents every limitation: LLM-only citation verification, uncalibrated confidence scores, single-case eval scope. Code quality includes knowing where the code is not good enough.

---

## 29. Deep Dive Conversation Starters

Use these to steer the conversation toward your strongest material. Each one opens a thread you can control for 3-5 minutes.

### 29.1 "One thing I found fascinating while building this was how much decomposition improved accuracy."

Take it here: Walk through the single-prompt failure (3-4/8 errors, hallucinated findings) versus the decomposed pipeline (6-7/8, near-zero false positives). Connect to their product: "I imagine you see the same thing — breaking legal analysis into structured steps rather than asking one model to do everything."

### 29.2 "The hardest design decision was what to do about citation verification without a database."

Take it here: Explain the 5-tier production model. Show you understand the gap is architectural, not fixable by better prompts. Ask them: "How does your citation grounding pipeline work? Is it RAG against a curated corpus, or do you have structured case metadata?"

### 29.3 "If I had another week, the first thing I'd build is database-backed citation verification with confidence differentiation."

Take it here: Distinguish "VERIFIED (database match)" from "ESTIMATED (AI assessment)" — judges need to know the difference. Describe the lookup-then-verify pattern: database search first, LLM verification as fallback, confidence score reflects the source of verification.

### 29.4 "The eval harness taught me more about the problem than the pipeline did."

Take it here: Explain that defining ground truth forced you to categorize legal errors by type and severity. The 8 fact categories (DATE through SPOLIATION) are not arbitrary — they reflect how legal analysis actually works. Weighted recall encodes judicial impact. Ask: "How do you evaluate output quality internally? Do judges score the results?"

### 29.5 "I was surprised how much domain-specific prompt engineering mattered."

Take it here: Walk through `prompts.py:46-52` — the explicit precision rules ("prefer consistent over contradictory"). Without these, the LLM over-flags clean documents. Show the promptfoo A/B test results comparing precise vs. imprecise prompts. Connect: "In a court-facing system, false positives are almost as dangerous as false negatives — they erode trust."

### 29.6 "The thing I would change about the architecture is making the pipeline iterative instead of single-pass."

Take it here: Describe the multi-turn loop: verifier flags low-confidence items, orchestrator routes them back for re-analysis with additional context or retrieval. Explain why single-pass was the right call for a take-home (time constraint) but wrong for production (catches edge cases).

### 29.7 "Building for judges is different from building for developers — the trust model is inverted."

Take it here: Developers tolerate uncertainty and iterate. Judges need to trust the output before acting on it. That means every finding needs an evidence trail, every confidence score needs a source label, and the system must say "I don't know" when it does not know. Connect to their closed-universe approach.

### 29.8 "On nomadically.work, I learned that the best LLM cost optimization is not using the LLM."

Take it here: Describe the two-tier architecture — deterministic Rust heuristic handles ~70% of EU job classification (free, instant, deterministic), LLM (DeepSeek) handles only ambiguous cases. 7-layer country signal resolution, 180+ regression tests. Connect: "For Learned Hand, the same principle applies — use structured data and rules where possible, reserve LLM for genuinely ambiguous analysis."

### 29.9 "I think the biggest risk in legal AI is not hallucination — it's false confidence."

Take it here: A system that says "I found nothing wrong" when the brief has 8 errors is worse than a system that says "I am not sure." Walk through the calibration gap: LLM confidence scores are not probabilities. Describe Platt scaling, isotonic regression, and the simpler approach of discrete confidence bands (HIGH/MEDIUM/LOW/UNVERIFIABLE). Ask: "How do you communicate uncertainty to judges in your product?"

### 29.10 "What drew me to this role is that the cost of error forces better engineering."

Take it here: Most AI companies optimize for engagement or throughput. Legal AI optimizes for correctness. That changes every engineering decision: eval-first development, typed contracts, graceful degradation, honest uncertainty. "I built the BS Detector with that mindset, and I want to work somewhere that mindset is the default."

---

## 30. Red Flags to Avoid

Common mistakes in AI engineering interviews. For each: what it looks like, why it hurts, and what to do instead.

### 30.1 Over-claiming what the system can do

**The mistake**: "My citation verifier checks whether cases are real." It does not — it asks an LLM whether it has heard of the case, which is fundamentally different from querying a legal database.

**What to do instead**: Lead with the limitation. "The citation verifier uses LLM parametric knowledge, which means it can catch obviously fabricated cases but cannot reliably verify real but obscure citations. In production, this needs database-backed verification — here is the 5-tier model I would build." This is exactly what earned positive feedback on the reflection.

### 30.2 Being defensive about limitations

**The mistake**: When they probe the citation gap or the single-case eval scope, getting flustered or making excuses about time constraints.

**What to do instead**: Own it immediately and pivot to the solution. "You are right — the eval runs on one test case, which means I cannot claim generalization. To fix this, I would build a corpus of annotated MSJ filings across case types, each exercising different fact categories. The eval architecture already supports this — `test_cases.py` is designed as a registry, and `run_evals.py` iterates over whatever cases exist." Show that the limitation is understood and the remediation path is clear.

### 30.3 Not knowing the actual code

**The mistake**: Vague answers like "I used asyncio for parallelism" without being able to point to `orchestrator.py:110-112` where `asyncio.gather(citation_task, fact_task)` runs both verification paths concurrently, or `citation_verifier.py:72-75` where individual citations are verified in parallel.

**What to do instead**: Reference specific files and line numbers. Know the key code paths: `base_agent.py:22-33` for timeout handling, `metrics.py:59-109` for the grounding check, `prompts.py:46-52` for precision rules, `run_evals.py:143-146` for weighted recall calculation. Being able to say "line 94 in llm_judge.py" signals that you wrote this code and understand it, not that you generated it and moved on.

### 30.4 Treating all LLM tasks as equivalent

**The mistake**: Talking about "the LLM call" as if parsing a brief, verifying a citation, checking facts, and synthesizing findings are the same kind of task with the same failure modes.

**What to do instead**: Differentiate. "Parsing is extraction — it needs structured output and fails if the schema is wrong. Citation verification is knowledge retrieval — it fails when the case is outside training data. Fact checking is cross-reference reasoning — it fails on subtle contradictions. Synthesis is judgment — it fails when it overweights minor findings." Each agent in the BS Detector has different prompts, different failure modes, and different eval criteria because these are fundamentally different cognitive tasks.

### 30.5 Ignoring the legal domain specifics

**The mistake**: Talking only about the engineering without demonstrating understanding of the legal concepts. Saying "it checks facts" without distinguishing between a date discrepancy (D-01), a Privette presumption misquotation (D-03), and a non-binding jurisdiction citation (D-06).

**What to do instead**: Use legal vocabulary precisely. "The system correctly identifies that Dixon v. Summit Builders is a Texas case cited in a California MSJ — that is persuasive at best, not binding authority. It also catches the Privette misquotation: the brief says defendants are 'never liable,' but the actual doctrine has exceptions for retained control and concealed hazards." This shows the system is doing legal analysis, not text matching.

### 30.6 Not asking good questions about their product

**The mistake**: Having no questions, or asking generic ones like "What is the tech stack?" or "How big is the team?"

**What to do instead**: Ask questions that show architectural understanding of their problem space. "How do you handle the boundary between closed-universe retrieval and LLM parametric knowledge? When a judge asks a question that requires reasoning across multiple cases, does the model combine retrieved passages, or is there a structured reasoning layer?" Or: "When you say closed universe, does that mean the LLM never sees text outside the curated corpus, or is there a filtering step after generation?" These questions demonstrate you understand the hard problems in legal AI.

### 30.7 Being too theoretical without connecting to practice

**The mistake**: Explaining multi-agent architectures, RAG patterns, or evaluation theory in the abstract without tying every point back to a concrete implementation decision.

**What to do instead**: Every claim gets a code reference or a specific example. Not "I believe in eval-driven development" but "I built 31 eval assertions before tuning a single prompt, and the weighted recall formula at `run_evals.py:143-146` encodes legal severity — critical errors like the Privette misquotation get 2x weight because a judge acting on a wrong legal standard has worse consequences than missing a scaffolding detail." Theory is the setup; the code is the punchline.

---

## 31. Legal Domain Deep Knowledge

### How Courts Actually Work (for the Engineer)

**The lifecycle of a civil case.** A civil lawsuit follows a predictable arc, and understanding it matters because each stage has different AI needs:

1. **Complaint**: Plaintiff files a document stating their legal claims and the facts supporting them. The defendant is served.
2. **Answer**: Defendant responds, admitting or denying each allegation. May also file counterclaims.
3. **Discovery**: Both sides exchange documents, take depositions (recorded testimony), and send interrogatories (written questions). This phase generates the bulk of a case's documents — often thousands of pages. Discovery is where most of the factual record is built.
4. **Motion for Summary Judgment (MSJ)**: Either side asks the court to decide the case (or parts of it) without trial. The legal standard: there is "no genuine dispute of material fact" and the movant is "entitled to judgment as a matter of law." In practice, MSJs are the most document-intensive motions — they require citing specific evidence from the record to prove that no reasonable jury could find for the other side.
5. **Trial**: If the MSJ is denied, the case goes to trial. But a huge percentage of civil cases are resolved at the MSJ stage — which is exactly why MSJ verification is such a high-value AI use case.
6. **Post-trial motions and appeal**: The losing side can appeal to a higher court, which reviews the trial court's decision for legal errors.

**What an MSJ actually involves.** The filing side submits: (a) a memorandum of points and authorities (the legal argument, citing cases), (b) a separate statement of undisputed facts (each fact with a citation to evidence in the record), and (c) exhibits (the actual evidence — deposition transcripts, documents, declarations). The opposing side files the same structure in response, disputing facts and citing counter-evidence. A judge or law clerk must then read all of this, verify the citations, check whether the cited evidence actually supports the stated facts, and write an order. This is exactly the workflow the BS Detector automates.

**Who reads MSJs and what they need.** In practice, the judge rarely reads an MSJ cold. A law clerk or staff attorney reads it first and writes a "bench memo" — an internal document summarizing the arguments, evaluating the strength of each side, flagging problems, and recommending a tentative ruling. The judge reads the bench memo, reviews key portions of the briefing, and makes a decision. This is why Learned Hand's bench memo generation is such a natural product — it automates the most time-consuming part of a law clerk's job while keeping the judge as the decision-maker.

**Trial courts vs. appellate courts — different AI needs.** Trial courts deal with facts and evidence. Did the accident happen the way the plaintiff says? Does the medical record support the claimed injuries? AI at the trial court level needs to cross-reference facts against evidence, verify citations, and flag inconsistencies — exactly what the BS Detector does. Appellate courts deal primarily with legal questions. Did the trial court apply the correct legal standard? Was there sufficient evidence to support the verdict? AI at the appellate level needs to analyze legal reasoning, identify relevant precedent, and evaluate whether the lower court's logic was sound. Same underlying technology, different prompt engineering and document types.

**Why post-conviction relief is a key Learned Hand use case.** In criminal cases, after a defendant is convicted and has exhausted their direct appeals, they can file for post-conviction relief — typically a habeas corpus petition arguing that their conviction was constitutionally flawed (ineffective counsel, newly discovered evidence, prosecutorial misconduct). These petitions are filed by the thousands, many by pro se prisoners (representing themselves, often poorly formatted, legally unsophisticated). Each one still requires a judge or staff attorney to review the full trial record, evaluate the claims against the record, and determine whether there is any merit. This is a massive backlog problem. The Michigan Supreme Court likely chose Learned Hand in significant part to address exactly this backlog — AI that can ingest a full trial record, cross-reference it against the petition's claims, and draft a preliminary analysis saves hundreds of hours per case.

### Citation Systems Explained

**The Bluebook.** Legal citations follow a standardized format defined by *The Bluebook: A Uniform System of Citation*. Every lawyer, law clerk, and legal AI system must understand this format. The basic structure for a case citation is:

```
[Case Name], [Volume] [Reporter] [Page] ([Court] [Year])
```

For example: `Privette v. Superior Court, 5 Cal.4th 689 (1993)`.

Breaking this down:
- **Case name**: `Privette v. Superior Court` — the parties, italicized in printed text
- **Volume**: `5` — the volume number of the reporter series
- **Reporter**: `Cal.4th` — the reporter series (California Reports, Fourth Series)
- **Page**: `689` — the starting page of the opinion
- **Court and year**: `(1993)` — when the court is obvious from the reporter, only the year is needed. When it is not, the court is included: `(9th Cir. 2020)`

**Pinpoint citations** add a specific page after the starting page: `5 Cal.4th 689, 695` — meaning the cited proposition is on page 695 of a case that starts on page 689. A system verifying citations needs to check both the case existence AND whether the cited page actually contains the claimed holding.

**Federal reporters:**

| Reporter | Abbreviation | Court |
|----------|-------------|-------|
| Supreme Court Reporter | S. Ct. | U.S. Supreme Court |
| United States Reports | U.S. | U.S. Supreme Court (official) |
| Federal Reporter (2d/3d/4th Series) | F.2d, F.3d, F.4th | Federal Courts of Appeals (Circuit Courts) |
| Federal Supplement (2d/3d Series) | F. Supp., F. Supp. 2d, F. Supp. 3d | Federal District Courts (trial level) |
| Federal Rules Decisions | F.R.D. | Federal District Courts (procedural rulings) |

**State reporters:** Each state has its own reporter series. California uses `Cal.4th` (Supreme Court) and `Cal.App.5th` (Courts of Appeal). New York uses `N.Y.3d` (Court of Appeals) and `N.Y.S.3d` (lower courts via the New York Supplement). Knowing which reporter corresponds to which court level matters because a California Supreme Court case (`Cal.4th`) is binding on all California courts, while a Court of Appeal case (`Cal.App.5th`) is binding only within its appellate district.

**Parallel citations.** Some jurisdictions require citing both the official reporter and a regional or unofficial reporter:

```
Privette v. Superior Court (1993) 5 Cal.4th 689, 21 Cal.Rptr.2d 72, 854 P.2d 721
```

The same case appears in three reporter volumes. A citation verification system needs to understand that these are the same case, not three different cases. Parsing parallel citations is a real engineering challenge because the format varies by jurisdiction.

**Shepardizing / KeyCiting.** After finding a cited case, you need to know whether it is still good law. "Shepardizing" (from Shepard's Citations, now owned by LexisNexis) and "KeyCiting" (Westlaw's equivalent) mean checking whether a case has been overruled, distinguished, or limited by subsequent decisions. A citation can be technically correct — the case exists and says what the brief claims — but legally useless because it was overruled five years later. This is the next level of citation verification beyond existence checking. A production system should flag: "This case was overruled by [subsequent case] in [year]."

**Why this matters for the BS Detector architecture.** The current system uses LLM knowledge to verify citations — it can catch obviously fabricated cases but cannot reliably confirm existence or check subsequent treatment. A production system needs: (1) a case law database for existence verification, (2) citation parsing to extract volume/reporter/page components programmatically, (3) subsequent treatment checking via Shepard's or KeyCite APIs, and (4) full-text retrieval to verify that the cited page actually supports the claimed proposition. Each of these maps to a verification tier in the 5-tier citation model discussed in Section 9.

### Key Legal Concepts for AI Engineers

**Stare decisis and precedent.** Latin for "to stand by things decided." Courts follow prior decisions on the same legal question. This is not just tradition — it is a constitutional principle rooted in due process and equal protection. If Court A decided that a statute means X in 2020, Court A should reach the same conclusion in 2025, absent a compelling reason to change. For AI systems, this means the "correct answer" for a legal question is not determined by reasoning from first principles — it is determined by what prior courts have held. An LLM that reasons brilliantly but reaches a conclusion contrary to binding precedent is wrong.

**Binding vs. persuasive authority.** Not all precedent is created equal:

| Authority Level | Example | Effect |
|----------------|---------|--------|
| **Binding (mandatory)** — same jurisdiction, higher court | U.S. Supreme Court for all federal courts; Cal. Supreme Court for all California courts | MUST be followed. A lower court that ignores binding authority will be reversed on appeal. |
| **Binding (mandatory)** — same court | 9th Circuit for the 9th Circuit | The court follows its own prior decisions unless sitting en banc to overrule. |
| **Persuasive** — different jurisdiction, same level | 5th Circuit for the 9th Circuit | May be cited and considered, but need not be followed. Useful when your jurisdiction has not addressed the issue. |
| **Persuasive** — lower court | A district court opinion cited to an appellate court | Less weight, but can be cited for reasoning. |
| **Not authoritative** — law reviews, treatises, dictionaries | A law professor's article | Can inform reasoning but has no precedential weight. |

In the Rivera MSJ, the brief cites Dixon (Texas) and Okafor (Florida) in a California case. These are persuasive authority only — they cannot override California binding precedent like Privette. The BS Detector correctly flags this jurisdictional mismatch. A production system would need a jurisdiction hierarchy engine that automatically classifies each cited case as binding or persuasive based on the filing court and the citing court.

**Holdings vs. dicta.** A holding is the court's actual decision on the legal issue presented — the part that creates precedent. Dicta (short for "obiter dicta") are comments made in passing that are not essential to the decision. Only holdings are binding. A common attorney trick is to cite dicta as if it were a holding — "The court in Smith v. Jones stated that employers are always liable" when the court actually said "Even if employers were always liable, the plaintiff would still lose because..." The BS Detector's mischaracterization detection is exactly this problem. The brief claims a case holds X, but the case actually only mentioned X in dicta while holding Y.

**Standards of review.** When an appellate court reviews a lower court's decision, it applies different levels of deference depending on what is being reviewed:

| Standard | What It Means | Applied To |
|----------|---------------|------------|
| **De novo** | No deference. Appellate court decides the question fresh. | Legal conclusions, constitutional questions, statutory interpretation. |
| **Abuse of discretion** | Deferential. Reversed only if the lower court's decision was irrational or arbitrary. | Evidentiary rulings, procedural decisions, sentencing (in some contexts). |
| **Substantial evidence** | Highly deferential. Upheld if any reasonable trier of fact could have reached the same conclusion. | Jury verdicts, factual findings. |
| **Clearly erroneous** | Deferential. Reversed only if the appellate court has a "definite and firm conviction" the finding was wrong. | Findings of fact by a judge (bench trial). |

For AI systems, the standard of review determines what kind of analysis is needed. A de novo question requires full legal analysis from scratch. A substantial evidence question requires surveying the record for supporting evidence. Different products for different standards.

**Due process implications of AI in courts.** The constitutional right to due process means that litigants are entitled to meaningful judicial review of their claims. If a court uses AI to generate bench memos or draft orders, and the judge rubber-stamps the AI output without independent review, that potentially violates due process. This is the core tension in judicial AI: the tool must be helpful enough to save time but transparent enough that the judge can exercise genuine independent judgment. Every design choice in a judicial AI system — confidence scores, uncertainty flags, source tracing, the decision not to make recommendations — serves this constitutional requirement. It is not just good UX; it is a legal mandate.

**The right to meaningful judicial review.** Related to due process, every litigant has the right to have their case actually read and considered by a human judge. AI that replaces judicial analysis (rather than augmenting it) creates constitutional problems. This is why Learned Hand's architecture outputs analysis and flags issues rather than making recommendations — it preserves the judge's role as decision-maker. The BS Detector's design reflects this same principle: it produces a verification report, not a ruling.

---

## 32. Judicial Workflow & Pain Points

Understanding what judges and law clerks actually struggle with, and how the BS Detector architecture maps to each problem:

### 1. The Volume Problem

**The reality.** A single state trial court judge may handle 400-700 cases per year. In busy jurisdictions, this means reading dozens of motions per week, each one 15-50 pages with supporting exhibits that can run to hundreds of pages. Federal courts have smaller dockets but more complex cases with proportionally longer briefing. Appellate courts face their own volume crisis — the backlog of appeals and post-conviction petitions grows every year while staffing remains flat.

**How AI addresses it.** The BS Detector's pipeline processes a brief and its exhibits in 30-60 seconds. A law clerk doing the same work — reading the brief, checking every citation, cross-referencing every factual claim against the exhibits — takes 4-8 hours. The AI does not replace the clerk's judgment; it does the mechanical verification work so the clerk can focus on legal analysis. At Learned Hand's scale, this likely means batch processing — a queue of motions submitted overnight, reports ready for clerks in the morning. The orchestrator's deterministic pipeline guarantees every brief gets the same analytical treatment regardless of whether it is motion number 1 or number 500 that week.

### 2. Citation Verification

**The reality.** Attorneys cite cases, statutes, and secondary sources throughout their briefs. Law clerks must verify: (a) the citation is correctly formatted and points to a real source, (b) the source actually says what the attorney claims it says, (c) the source has not been overruled or otherwise invalidated. Before AI tools, this meant opening Westlaw or LexisNexis, searching each citation, reading the relevant passage, and comparing it to the brief's characterization. For a brief with 20-30 citations, this alone takes hours. Post-Mata v. Avianca (the 2023 case where attorneys submitted ChatGPT-fabricated citations), courts are even more vigilant.

**How the BS Detector addresses it.** The CitationVerifierAgent checks each citation in parallel, evaluating existence, accuracy of characterization, and jurisdictional relevance. The three-status output (SUPPORTED / NOT_SUPPORTED / COULD_NOT_VERIFY) maps directly to the clerk's workflow: SUPPORTED citations can be skimmed, NOT_SUPPORTED citations need immediate attention, and COULD_NOT_VERIFY citations go on a list for manual checking. In production with a legal database backend (the 5-tier model from Section 9), the system could eliminate COULD_NOT_VERIFY for existence checks entirely, leaving it only for characterization ambiguity.

### 3. Inconsistency Detection

**The reality.** Attorneys selectively quote evidence. They emphasize favorable facts and minimize or omit unfavorable ones. Cross-referencing what the brief says against what the exhibits actually contain is tedious, detail-oriented work. Did the brief say the accident happened "in the afternoon" when the police report says 9:47 AM? Did the brief omit the fact that the witness recanted? These are not always deliberate lies — sometimes they are careless mistakes — but either way, the court needs to know.

**How the BS Detector addresses it.** The FactCheckerAgent reads all source documents and systematically checks 8 categories of potential inconsistency. The categories act as a forced checklist — the LLM cannot skip a dimension of analysis because the prompt structure requires it. The precision rules prevent false positives that would waste judicial time. The three-status fact output (CONSISTENT / CONTRADICTORY / COULD_NOT_VERIFY) mirrors the citation verification pattern — consistent facts can be set aside, contradictions demand attention, and unverifiable claims are flagged for human review. The `STRATEGIC_OMISSION` category is particularly valuable because it catches what attorneys leave out, not just what they get wrong.

### 4. Bench Memo Writing

**The reality.** A bench memo is an internal document (usually 5-15 pages) written by a law clerk for the judge. It summarizes the parties' arguments, evaluates the strength of each side's legal theories and factual support, identifies issues the judge should focus on, and often includes a tentative recommendation. Writing a good bench memo requires: reading and understanding both sides' briefs, verifying the key citations, cross-referencing the factual record, and synthesizing everything into a coherent analysis. A typical bench memo takes 4-12 hours to write.

**How the BS Detector addresses it.** The JudicialMemoAgent generates a memo that follows standard judicial formatting: procedural posture, key findings, areas of concern, and recommendations for further review. It draws from the synthesizer's ranked findings rather than raw data, meaning the memo reflects the pipeline's full analytical output. In Learned Hand's product, this is likely more sophisticated — multiple memo templates for different motion types, jurisdictional customization, integration with the court's existing formatting standards. But the architecture is the same: structured analysis in, formatted judicial document out.

### 5. Post-Conviction Review Backlog

**The reality.** Across the United States, there are tens of thousands of pending habeas corpus petitions and post-conviction relief applications. Each one requires reviewing the original trial record (transcripts, exhibits, briefs), evaluating the petitioner's claims against that record, and determining whether any claim has merit. Many petitions are filed pro se with poor formatting, unclear arguments, and vague references to the record. Staff attorneys at courts handling these petitions face backlogs measured in years. Meanwhile, real constitutional violations — innocent people in prison, ineffective lawyers who missed obvious defenses — sit unreviewed.

**How the BS Detector addresses it.** The same pipeline that verifies an MSJ can be adapted: ingest the petition's claims, cross-reference them against the trial record, flag potential meritorious issues, and generate a preliminary analysis memo. The volume automation matters enormously here — if a staff attorney can review AI-flagged petitions in 30 minutes instead of spending 8 hours on a cold read, the backlog becomes manageable. The architecture's emphasis on never making the decision (only flagging and analyzing) is constitutionally essential in this context — every petitioner has a right to have their claims actually considered.

### 6. Keeping Current

**The reality.** The law changes constantly. New appellate decisions modify, limit, or overrule existing precedent. New statutes alter the legal landscape. A bench memo written based on yesterday's law might be wrong if a relevant decision came down this morning. Law clerks spend significant time checking whether the cases they are relying on are still good law.

**How the BS Detector addresses it.** The current prototype does not handle this — it relies on the LLM's training data, which has a knowledge cutoff. A production system needs continuous ingestion of new decisions and real-time Shepardizing/KeyCiting. This is where Learned Hand's closed-universe architecture becomes critical: the curated legal corpus must be continuously updated, and the system must automatically flag when a previously-verified citation has been affected by a new decision. This is an engineering problem (data pipelines, change detection, notification systems) more than an AI problem, but it is essential for judicial trust.

---

## 33. The Michigan Supreme Court Contract

### Why This Matters

In 2025, the Michigan Supreme Court became the first state supreme court in the United States to adopt a generative AI platform for judicial operations. They chose Learned Hand. This is significant on multiple dimensions:

**Institutional credibility.** Courts are among the most conservative adopters of technology. Many federal courts still use systems built in the 1990s. A state supreme court — the highest court in a state's judicial hierarchy — choosing to deploy AI sends a signal that the technology has reached a threshold of reliability and trustworthiness that satisfies the most risk-averse institutional buyers. This is not a pilot program at a small municipal court. This is the court that sets binding precedent for every court in Michigan.

**Procurement rigor.** State supreme courts do not make technology decisions casually. The procurement process likely involved: security review, data privacy assessment, bias auditing, pilot testing with real case materials, evaluation by both technical staff and judicial officers, and sign-off by the justices themselves. Learned Hand surviving this process means their product has been vetted at a level that most AI startups have never faced.

**First-mover advantage.** Being the first state supreme court to adopt AI creates a reference customer that every other court in the country will look to. When the Ohio Supreme Court or the Texas Court of Criminal Appeals evaluates AI tools, they will ask: "What did Michigan do? How is it working? What problems have they encountered?" Learned Hand gets the benefit of being the answer to those questions.

### Likely Use Cases

Based on public information and the company's stated focus areas:

**Post-conviction relief.** Michigan, like every state, has a significant backlog of post-conviction petitions. The Michigan Supreme Court has direct supervisory authority over the state's court system and a strong interest in reducing backlog. AI-assisted review of habeas petitions — ingesting trial records, cross-referencing claims, flagging potentially meritorious issues — is likely the highest-impact initial deployment.

**Docket management.** AI can assist with case classification, identifying related cases, estimating complexity, and routing cases to appropriate staff. This is less glamorous than bench memo generation but has immediate operational value.

**Bench memo and order drafting.** For the supreme court itself, which hears only cases it chooses to review, AI-assisted analysis of petitions for leave to appeal (the Michigan equivalent of certiorari) could dramatically improve the court's ability to identify the most important cases from the hundreds of petitions filed each year.

**Citation and record verification.** Exactly the BS Detector use case — checking the accuracy of briefs submitted to the court.

### What This Tells Us About the Product

**Maturity.** A state supreme court deployment implies a product that handles real legal documents at scale, integrates with existing court systems (likely Michigan's case management system), meets state data security requirements, and has been tested against actual judicial workflows. This is not a demo.

**Closed-universe architecture in practice.** Michigan case law has specific characteristics — the Michigan Supreme Court and Court of Appeals generate a defined body of precedent that can be curated and ingested. The closed-universe approach means Learned Hand's system draws only from verified Michigan law (plus relevant federal law), eliminating the hallucination risk that would make judicial adoption impossible.

**Judicial trust.** The fact that justices approved this deployment means the product communicates uncertainty effectively, does not make decisions, provides source tracing for every output, and has been demonstrated to improve (not replace) human judgment. These are exactly the design principles the BS Detector embodies.

### Questions to Ask About the Michigan Deployment

These are genuine questions that would demonstrate domain understanding in an interview:

1. "How does the Michigan deployment handle the boundary between state and federal law? Michigan courts apply both, and the hierarchy is complex."
2. "What does the feedback loop look like — do law clerks at the Michigan Supreme Court correct the AI's output, and does that data flow back into model improvement?"
3. "How do you handle the transition when Michigan precedent changes — when the Supreme Court overrules a prior decision, how quickly does the system update?"
4. "What was the biggest surprise during the Michigan pilot? What failure mode did you not anticipate?"
5. "Are you seeing usage patterns that differ from what you expected — are clerks using it primarily for citation checking, or has bench memo generation become the primary use case?"
6. "How does the system handle pro se filings, which often lack standard formatting and Bluebook citations?"

---

## 22. Legal AI Industry Landscape

> This section equips you to demonstrate market awareness during the Vienna Scott interview. Learned Hand operates in a rapidly expanding legal AI market, but occupies a unique position: court-facing, not law-firm-facing. Every competitor comparison should reinforce that distinction.

---

### 22.1 Competitive Landscape

#### Beginner Level

Legal AI is booming — dozens of companies are building AI tools for lawyers, but almost none are building for courts. Learned Hand's competitors mostly sell to law firms, corporate legal departments, or specific practice areas. Learned Hand sells to the judiciary itself: judges, law clerks, and court staff. This is a fundamentally different customer with fundamentally different requirements (impartiality, zero tolerance for error, public trust).

#### Intermediate Level

| Company | Primary Customer | Core Product | Funding / Valuation | Key Differentiator | Why It Is Not Learned Hand |
|---------|-----------------|--------------|---------------------|-------------------|---------------------------|
| **Harvey AI** | Am Law 100 firms, Big 4 | General-purpose legal AI assistant | ~$806M raised; $8B valuation (Dec 2025); seeking $11B (Feb 2026) | Deep OpenAI partnership, multi-model; used by Allen & Overy, PwC; ~$195M ARR (end 2025) | Law-firm-facing; optimizes for billable efficiency, not judicial impartiality |
| **Casetext / CoCounsel** | Law firms, in-house counsel | AI legal research + document review (now Thomson Reuters) | Acquired by Thomson Reuters for $650M cash (Aug 2023); 1M+ users across 107 countries | First GPT-4 legal assistant (launched March 2023); multi-model architecture (Anthropic, OpenAI, Google); integrated into Westlaw ecosystem | Serves litigators, not courts; open-universe retrieval, not closed-universe |
| **EvenUp** | Personal injury plaintiff firms | AI demand letter + case analysis | $385M raised; $2B valuation (Oct 2025); Series E led by Bessemer with RELX/LexisNexis participation | Domain-specific model (Piai) trained on 200K+ PI cases; 10K cases/week; 2,000+ law firms | Narrow vertical (PI only); advocate-side tool designed to maximize settlement value, not neutral judicial analysis |
| **Ironclad** | Enterprise legal / GCs | Contract lifecycle management | $333M raised; $3.2B valuation; $150M ARR (Jan 2025) | CLM + AI assistant "Jurist" with 6x YoY ARR growth; Forrester Wave Leader Q1 2025 | Transactional focus (contracts); no litigation or judicial use case |
| **Luminance** | Large law firms, in-house M&A teams | AI document review for M&A due diligence | $75M Series C (Feb 2025); proprietary LLM trained on 150M+ legally verified documents | M&A due diligence strength; 1,000+ legal concept extraction out-of-box; agentic compliance module (July 2025) | M&A due diligence niche; no courtroom or judicial workflow |
| **vLex / Vincent AI** | Law firms, solo practitioners | AI legal research over 1B+ documents from 100+ countries | Trusted by 8 of top 10 global law firms; starts at $399/month per user | Global jurisdictional coverage (17 countries); 3.67x more reliable than raw LLMs in randomized controlled trials; multi-modal (audio/video analysis in Winter '25 release) | Law-firm research tool; no court-specific workflows or judicial reasoning |
| **Westlaw Edge (CoCounsel Legal)** | Law firms, law schools | AI-assisted research, Deep Research, Litigation Document Analyzer | Thomson Reuters ($65B+ market cap) | Massive proprietary corpus; agentic multi-step research with "Deep Research" that generates plans, explains logic, and delivers reports; Litigation Document Analyzer identifies arguments and suggests counterarguments | Incumbent adding AI to existing platform; litigator-facing, not judge-facing |
| **Lexis+ AI / Protege** | Law firms, in-house counsel | AI research, document analysis, multi-model access | RELX ($90B+ market cap) | Multi-model architecture (GPT-5, Claude Sonnet 4, GPT-4o); Protege Vault for secure 10-doc upload and AI-powered analysis; Protege General AI for open-ended queries grounded in LexisNexis content | Same as Westlaw: incumbent layering AI onto attorney-facing research tools |

#### Expert Level — How Learned Hand Differentiates

Learned Hand's moat rests on three structural advantages that competitors cannot easily replicate:

1. **Court-facing, not law-firm-facing.** Every competitor above sells to advocates — people whose job is to argue one side. Courts need tools that reason impartially. This is not a feature toggle; it requires fundamentally different prompt engineering, evaluation criteria, and product design. A tool trained to help lawyers win arguments is structurally unsuitable for helping judges evaluate them. Shlomo Klapper describes the product as "a law clerk for law clerks" — the user persona is a judicial officer, not a litigator.

2. **Closed-universe architecture.** Learned Hand draws exclusively from verified legal authorities and court-specific guidance. Every output is linked side-by-side to its source so court attorneys can verify every claim. This is the opposite of Harvey or CoCounsel, which use general-purpose LLMs that may draw on parametric knowledge (training data) that cannot be cited or verified. The Michigan Supreme Court pilot benchmarked outputs against court-generated work from past cases to validate this architecture.

3. **Judge-first product design.** Law clerks are not junior associates. They do not bill hours, they do not advocate, and they serve a constitutional function. The product assists in legal analysis, drafting, and review while maintaining the human role as the ultimate decision-maker. No competitor has this user persona, this deployment context, or this trust requirement.

**Market positioning insight:** Harvey's $8B valuation on ~$195M ARR (41x revenue multiple) reflects investor belief in the law-firm market. Learned Hand's market — the judiciary — is smaller by revenue but has near-zero competition and massive switching costs. Once a state supreme court integrates AI into its workflows, displacing that vendor is extremely difficult. This is a classic "smaller market, stronger moat" positioning.

**Interview framing:** "The legal AI market is large and growing fast, but it is almost entirely advocate-facing. Harvey, CoCounsel, EvenUp — they help lawyers argue better. Learned Hand helps judges decide better. That is a different product, a different architecture, and a different trust model."

---

### 22.2 Key Legal AI Failures & Lessons

> These are the cases the interviewer expects you to know. They are the reason Learned Hand exists.

#### The Case Law of AI Failure

| Case | Year | Court | What Happened | Sanction | Key Lesson |
|------|------|-------|---------------|----------|------------|
| **Mata v. Avianca** | 2023 | S.D.N.Y. (Judge Castel) | Attorneys used ChatGPT to draft a motion; it generated six entirely fabricated case citations with fake quotations and internal cross-references. Opposing counsel could not find the cases. The attorneys doubled down, asking ChatGPT to confirm the cases were real (it did). | $5,000 fine; public sanctioning for "subjective bad faith" under Rule 11 (June 22, 2023) | General-purpose LLMs hallucinate with confidence. Verification against the LLM itself is circular. Courts need tools grounded in real case law. |
| **Crabill (Colorado)** | 2023-2024 | El Paso County District Court | Attorney Zachariah Crabill used ChatGPT to draft a motion to set aside judgment — a motion type he had never drafted before. Did not read or verify any of the cited cases. Realized morning of the hearing that citations were fabricated ("I think all of my case cites from ChatGPT are garbage" — text to paralegal). Lied to the judge, blaming a "legal intern." | One-year suspension (90 days served, remainder stayed with 2-year probation). First AI-related attorney suspension in the U.S. | Incompetence + dishonesty compound. The failure was not using AI — it was not verifying output and then lying about it. Duty of competence (Rule 1.1) requires understanding tool limitations. |
| **Park v. Kim** | 2024 | 2nd Circuit | Attorney Jae S. Lee cited a nonexistent court decision in her reply brief, generated by ChatGPT. When asked to furnish a copy, admitted she could not locate it through traditional research and had used ChatGPT because she "had difficulty locating a relevant case through traditional legal research tools." | Referred to Court's Grievance Panel for disciplinary proceedings. Second Circuit held that citation to a nonexistent case "suggests conduct that falls below the basic obligations of counsel" and that Rule 11 obligations cover AI-assisted work product. | Appellate courts are applying existing rules (Rule 11, duty of candor) to AI use. No new rules needed — existing professional obligations already cover this. |

#### Beginner Level

These cases all share the same pattern: a lawyer used ChatGPT (a general-purpose AI) to write legal arguments, the AI invented fake cases that sounded real, the lawyer did not check whether the cases existed, and the court caught it. The lawyers were punished — fined, suspended, or referred for discipline. These failures are why courts need tools like Learned Hand that only reference real, verified legal authorities.

#### Intermediate Level

The common thread is **hallucination in open-universe systems**. ChatGPT generates plausible-sounding text by predicting likely token sequences, not by looking up real cases. It has no mechanism to distinguish real citations from fabricated ones. RAG-based legal research tools reduce but do not eliminate this problem — the Stanford study (Magesh et al., 2024; published in the Journal of Empirical Legal Studies, 2025) found hallucination rates of 17% for Lexis+ AI and 33% for Westlaw AI-Assisted Research, even with retrieval grounding.

Learned Hand's response to this failure mode is architectural: a closed universe means the system can only reference documents that exist in its corpus. If a case is not in the corpus, it cannot be cited. This eliminates the fabrication vector entirely — at the cost of potentially missing authorities that are not yet in the corpus (the completeness vs. reliability trade-off discussed in Section 22.4).

**The escalation pattern across these three cases is significant:**
- Mata (2023): $5,000 fine — a slap on the wrist
- Crabill (2023-2024): One-year suspension — career-threatening
- Park (2024): Grievance Panel referral at the appellate level — systemic response

Courts are not becoming more tolerant of AI-generated errors. They are becoming less tolerant. The window for "I didn't know ChatGPT could hallucinate" has closed.

#### Expert Level — What These Failures Mean for Learned Hand

These cases created the market conditions for Learned Hand's product:

1. **Judicial distrust of AI is now baseline.** After Mata v. Avianca, judges assume AI output is unverified until proven otherwise. Any tool sold to courts must be designed to overcome this distrust — which means provenance, citation linking, and source-side verification are table stakes, not features. The Michigan Supreme Court pilot explicitly tested "accuracy, transparency, and legal fidelity" — three dimensions directly shaped by post-Mata judicial skepticism.

2. **Rule 11 already covers AI.** The Second Circuit's Park v. Kim decision confirmed that existing professional responsibility rules apply to AI-assisted work. This means courts do not need to wait for new AI-specific regulations — they can (and will) sanction practitioners who submit unverified AI output under existing rules. For Learned Hand, this is an accelerant: every sanctions case increases court demand for verification tools.

3. **The BS Detector submission directly addresses this failure mode.** The five-agent pipeline with citation verification exists precisely because brief-checking is the use case where hallucination causes the most harm. The eval harness measures whether the system catches fabricated citations — this is not an academic exercise but a response to real judicial harm.

4. **The volume of AI-assisted filings is growing, not shrinking.** Despite sanctions, attorneys are using AI more, not less. Thomson Reuters reports 1M+ CoCounsel users. This means courts will see more AI-assisted briefs, increasing the need for court-side verification tools. Learned Hand is positioned on the receiving end of this wave.

**Interview framing:** "Mata v. Avianca is the founding case for judicial AI distrust. Every design decision in a court-facing tool has to answer the question: how do we make sure this never happens with our product? The closed-universe architecture is Learned Hand's answer. My BS Detector submission is a prototype of the verification layer that sits on top."

---

### 22.3 Regulatory & Ethical Landscape

#### Beginner Level

Lawyers and judges are governed by strict ethical rules. As AI enters legal practice, bar associations and courts are writing new rules about how AI can and cannot be used. The basic principle: lawyers remain responsible for everything AI produces. AI is a tool, not a colleague — you cannot blame the tool for your mistakes.

#### Intermediate Level

| Regulatory Body | Key Guidance | Date | Core Requirements |
|----------------|-------------|------|-------------------|
| **ABA Formal Opinion 512** | First national ethics guidance on lawyer AI use | July 2024 | Duty of competence (Rule 1.1) requires understanding AI capabilities and limitations. Duty to verify all AI output. Duty to protect client confidentiality when using AI tools (Rule 1.6). Duty to communicate AI use to clients (Rule 1.4). Fees must reflect actual time savings from AI (Rule 1.5). Supervising AI is "no different from supervising junior lawyers." |
| **Texas Opinion 705** | State-level AI ethics guidance | Feb 2025 | Human oversight of AI-generated work required. Must prevent submission of fabricated citations. No definitive AI disclosure mandate, but notes guidance from Florida and California on client communication. |
| **California** | State bar AI guidance | 2024-2025 | Disclosure of AI use not strictly required but recommended based on "facts and circumstances, including the novelty of the technology, risks associated with generative AI use, scope of the representation, and sophistication of the client." |
| **New York Formal Opinion 2025-6** | AI in client communications | 2025 | Focuses on professional responsibility when using AI to record and transcribe client meetings. Emphasizes confidentiality and informed consent for AI-processed client data. |
| **30+ state bars** | Various AI-specific guidance | 2024-2025 | Over 30 states have issued AI-specific guidance. No uniform standard — a patchwork of rules ranging from mandatory disclosure to advisory best practices. Rule 1.4 (communication) promotes transparency by requiring disclosure of the "means" by which a client's objectives are accomplished. |
| **Federal Judiciary Interim Guidance** | AI use across federal courts | July 2025 | Allows experimentation with AI tools while "preserving the integrity and independence of the federal courts." Prohibits delegation of "core judicial functions to AI, including decision-making or case adjudication." Requires independent verification of outputs. Users "accountable for all work performed with the assistance of AI." Recommends "extreme caution" for "novel legal questions." |
| **Proposed FRE 707** | AI-generated evidence admissibility | Approved by Committee on Rules of Practice and Procedure, June 2025; public comment through Feb 2026 | AI-generated evidence must meet Rule 702 reliability standards (sufficient facts/data, reliable principles and methods, reliable application to the facts). When no human expert testifies to AI evidence's substance, the proponent bears the burden of demonstrating reliability. |
| **EU AI Act** | High-risk AI classification | Entered force Aug 2024; high-risk obligations from Aug 2026 (possibly extended to Dec 2027 per Nov 2025 Commission proposals) | Judicial AI explicitly classified as **high-risk** under Annex III. AI systems used by judicial authorities for "researching and interpreting facts and the law and in applying the law to a concrete set of facts, or to be used in a similar way in alternative dispute resolution" must meet comprehensive compliance requirements: risk management, data governance, transparency, human oversight, accuracy, and robustness. |

#### Expert Level — Regulatory Implications for Learned Hand

**Why the EU AI Act matters even for a U.S. company:**
Annex III of the EU AI Act explicitly classifies AI "intended to be used by a judicial authority or on their behalf to assist a judicial authority in researching and interpreting facts and the law and in applying the law to a concrete set of facts" as **high-risk**. If Learned Hand ever serves non-U.S. courts (international expansion is a natural growth vector for a court-facing product), or if U.S. courts adopt similar frameworks, the product must meet requirements for:
- Documented risk management systems
- Data governance and bias testing
- Transparency and explainability (every output traceable to source)
- Human oversight mechanisms (human-in-the-loop by design)
- Accuracy and robustness testing

Learned Hand's closed-universe architecture and source-linking design already satisfy several of these requirements by construction. This is a competitive advantage over law-firm-facing tools that were not designed with regulatory compliance as a constraint. The November 2025 Commission proposal to extend high-risk deadlines to December 2027 gives companies more runway, but the direction is clear: judicial AI will be among the most heavily regulated AI verticals globally.

**The FRE 707 signal:**
The Judicial Conference's approval of proposed Rule 707 signals that federal courts are preparing for AI-generated content in litigation. Under the proposed rule, AI-generated evidence must independently satisfy the Daubert reliability standard (Rule 702) even without a human expert testifying to its substance. This creates two opportunities for Learned Hand: (1) tools that help judges evaluate whether AI-generated evidence meets Rule 707 standards, and (2) ensuring that Learned Hand's own outputs can withstand scrutiny under this framework. Both are natural extensions of the BS Detector's verification architecture.

**The patchwork problem:**
With 30+ states issuing different AI guidance and no federal standard for attorney AI use, courts face inconsistent standards. A judge in Michigan may receive briefs from attorneys in Texas (Texas Opinion 705), California (circumstance-based disclosure), and New York (NY Opinion 2025-6), each subject to different disclosure and verification rules. Learned Hand's position as a court-side tool (rather than attorney-side) means it can apply a single, consistent verification standard regardless of which jurisdiction's attorneys filed the brief. This is a structural advantage: the tool operates at the point of consumption (the court), not the point of production (the law firm).

**The Federal Judiciary Interim Guidance as a product specification:**
The July 2025 interim guidance reads almost like a product requirements document for Learned Hand:
- "Allows experimentation with AI tools" = courts are ready to buy
- "Prohibits delegation of core judicial functions" = AI must augment, not replace (Learned Hand's "law clerk for law clerks" positioning)
- "Independent verification of outputs" = source-linking and citation tracing are mandatory features
- "Accountable for all work performed with AI assistance" = transparency and audit trails are required
- "Extreme caution for novel legal questions" = the system must communicate uncertainty (confidence scores, COULD_NOT_VERIFY status)

Every one of these requirements maps to a feature that already exists in either Learned Hand's product or the BS Detector architecture.

**Interview framing:** "The regulatory landscape is fragmented — 30+ state bar opinions, ABA Formal Opinion 512, the EU AI Act's high-risk classification for judicial AI, and now proposed FRE 707. This fragmentation actually strengthens Learned Hand's position because courts need a single, reliable verification layer regardless of which ethical rules the attorneys before them are following. And the Federal Judiciary Interim Guidance reads like a product spec that Learned Hand already satisfies."

---

### 22.4 The "Closed Universe" vs. "Open Universe" Debate

#### Beginner Level

A "closed universe" AI system only knows about documents that have been loaded into it — like a library with a specific collection. An "open universe" system (like ChatGPT) draws on everything it learned during training — like a person who has read the entire internet but might misremember things. For courts, the closed universe is safer because every answer can be traced to a real document. The trade-off is that the closed system might not know about a relevant case that has not been added to its collection yet.

#### Intermediate Level

| Dimension | Closed Universe (Learned Hand) | Open Universe (General LLMs) |
|-----------|-------------------------------|------------------------------|
| **Knowledge source** | Curated corpus of verified legal authorities | Parametric knowledge from training data (internet-scale) |
| **Hallucination risk** | Cannot fabricate citations (can only reference what exists in corpus) | Can generate plausible-sounding but entirely fabricated citations, holdings, and quotations |
| **Verifiability** | Every claim linked to source document; court staff can check | No source attribution; output may blend real and fabricated content indistinguishably |
| **Coverage** | Limited to corpus; may miss recent decisions, niche jurisdictions, or unpublished opinions | Broad but unreliable; may "know" about a case but misstate its holding |
| **Currency** | Depends on corpus update frequency; can lag behind real-time filings | Training data has a cutoff date; cannot cite cases decided after cutoff |
| **Jurisdiction awareness** | Can be scoped to specific jurisdiction (e.g., Michigan law only) | No inherent jurisdiction scoping; may cite irrelevant out-of-jurisdiction authority |
| **Confidence calibration** | System can express genuine uncertainty ("not in corpus") | System expresses false confidence in fabricated content |
| **Architecture** | RAG over curated corpus with source linking | Direct generation from model weights (parametric memory) |
| **Failure mode** | Incompleteness (misses what is not in corpus) | Confabulation (invents what is not real) |

**The key insight:** Incompleteness is a manageable failure mode for courts. A law clerk who gets a report saying "I found 15 relevant cases but could not locate authority on [specific issue]" knows to do additional research. Confabulation is an unmanageable failure mode. A law clerk who gets a report citing a case that does not exist has been actively misled — and may not discover the error until opposing counsel or the judge catches it.

#### The Stanford Evidence

The Magesh et al. study (Stanford, 2024; published in the Journal of Empirical Legal Studies, 2025) is the most rigorous empirical assessment of legal AI hallucination rates to date:

| System | Hallucination Rate | Accuracy Rate | Avg. Response Length | Notes |
|--------|-------------------|---------------|---------------------|-------|
| **GPT-4 (raw)** | 58-82% | N/A | Varies | Baseline; no retrieval grounding |
| **Lexis+ AI** | 17% | 65% | 219 words avg. | Best-performing commercial tool |
| **Westlaw AI-Assisted Research** | 33% | 42% | 350 words avg. | Longest responses; hallucination correlates with length |
| **General RAG-based tools** | 17-33% | 42-65% | Varies | RAG reduces but does not eliminate hallucination |

Key findings from the study:
1. **RAG is not a silver bullet.** Legal research providers who claimed to have "eliminated" or "avoided" hallucinations were overstating their results. The study found that "the providers' claims are overstated."
2. **Longer responses hallucinate more.** Westlaw's higher hallucination rate correlates with its longer average responses (350 words vs. 219 for Lexis). More falsifiable propositions = more opportunities for error.
3. **Legal queries are structurally harder for retrieval.** Unlike general knowledge questions with unambiguous answers, "legal queries often do not permit a single, clear-cut answer." This makes retrieval precision harder.
4. **Textual similarity is not legal relevance.** Retrieval systems "identify relevant documents based on some form of textual similarity," but may pull "inapposite cases and present them as applicable or on-point solely because they meet certain [textual] requirements." A case about "employment discrimination" may be textually similar to another "employment discrimination" case but apply completely different legal standards because of jurisdictional or factual differences.
5. **Systematic assessment is difficult.** "Because of the closed nature of these systems, systematically assessing these claims is challenging." The vendors' own benchmarks are not independently verifiable.

#### Expert Level — Why Closed Universe Is the Right Architecture for Courts

**The architectural argument:**

General LLMs fail for legal use cases along four axes:

1. **Hallucination.** Even RAG-augmented commercial tools hallucinate 17-33% of the time. For a court system where a single fabricated citation can trigger sanctions (Mata v. Avianca), delay proceedings, and erode public trust, even 1% is unacceptable. A closed universe eliminates the fabrication vector — the system literally cannot cite a case that does not exist in its corpus. The trade-off (potential incompleteness) is manageable and familiar to legal practitioners.

2. **Training data lag.** LLM training data has a cutoff date. A model trained through January 2025 does not know about a February 2025 Supreme Court decision that overruled the precedent it is citing. A closed universe with regular corpus updates can reflect current law faster than model retraining cycles. For the Michigan Supreme Court, this means the corpus can ingest new Michigan Court of Appeals decisions within days of publication, while GPT-4's knowledge of those decisions will not arrive until the next training run.

3. **Jurisdiction ignorance.** General LLMs have no inherent concept of jurisdictional hierarchy. They may cite persuasive authority from another circuit as if it were binding, or cite a state court decision in a federal question case. The BS Detector catches this in the Rivera MSJ — Dixon (Texas) and Okafor (Florida) cited in a California case. A closed universe scoped to a specific jurisdiction (e.g., Michigan law for the Michigan Supreme Court contract) eliminates this error class by construction.

4. **Provenance opacity.** When a general LLM generates a legal statement, there is no way to determine whether it came from a real case, a law review article, a blog post, or was fabricated entirely. Shlomo Klapper describes Learned Hand's approach: "all outputs are grounded in established law and precedent, which are then linked side-by-side so that court attorneys can verify every claim from its source." This provenance chain is architecturally impossible in an open-universe system.

**The completeness vs. reliability trade-off:**

The closed universe pays a price: it may miss relevant authorities not in the corpus. This is a real limitation — but it maps to a well-understood judicial concept. A law clerk who researches only within Westlaw's database may miss an unpublished opinion available only on PACER. The response is not to abandon Westlaw, but to understand its limitations and supplement when needed. Learned Hand's closed universe operates the same way: it is a reliable starting point that may need supplementation, not a comprehensive oracle.

The Stanford study reinforces this: even Lexis+ AI, with access to one of the world's largest legal databases, achieves only 65% accuracy. The remaining 35% includes both hallucinations (17%) and incorrect but non-hallucinated answers (18%). A closed-universe system that achieves 95% accuracy on a narrower corpus is more useful to a court than an open system that achieves 65% accuracy on a broader one — because the court can trust the 95% and supplement the gaps, whereas the court cannot trust any of the 65% without independent verification.

**How the Michigan Supreme Court contract validates this approach:**

The MSC contract followed a pilot program where court staff benchmarked Learned Hand's outputs against court-generated work from past cases. This is precisely the right evaluation methodology for a closed-universe system: compare AI output against known-good human output on the same inputs. The pilot measured "accuracy, transparency, and legal fidelity" — not speed or cost savings. This confirms that the court valued reliability over coverage, which is the core trade-off of the closed-universe architecture.

**Connection to the BS Detector submission:**

The BS Detector is an open-universe system (it relies on LLM training data for citation verification of unknown cases). This is its biggest gap, as discussed in Section 5. The production vision (Section 5's five-tier model) describes the path from open-universe prototype to closed-universe production system:

| Tier | Data Source | Closed/Open | Reliability | BS Detector Status |
|------|-----------|-------------|-------------|-------------------|
| 1 | Hardcoded case context | Closed | Highest (but zero scalability) | Implemented (Rivera v. Harmon only) |
| 2 | CourtListener API | Closed (curated, free) | High (broad federal + some state coverage) | Not implemented |
| 3 | Caselaw Access Project | Closed (curated, Harvard) | High (comprehensive historical coverage) | Not implemented |
| 4 | Westlaw/Lexis API | Closed (commercial, gold-standard) | Highest (most complete, most current) | Not implemented |
| 5 | LLM parametric knowledge | Open | Lowest (17-33% hallucination per Stanford) | Implemented (fallback for all unknown cases) |

The submission operates at Tiers 1 and 5. Learned Hand operates at Tiers 2-4. The interview should make this progression explicit: "My submission proves the verification logic works. Learned Hand's corpus provides the data layer that makes it reliable. The architecture is designed to plug into a closed-universe corpus — that is exactly the transition Learned Hand has already made."

**The hybrid future:**

Pure closed-universe has limits. When a judge asks a question that requires reasoning (not just retrieval), the LLM's parametric knowledge becomes necessary — you cannot retrieve "should I grant this motion?" from a corpus. The real architectural challenge is knowing when to use retrieval (for facts and citations) and when to use generation (for analysis and reasoning), and keeping them cleanly separated so that generated analysis never contaminates the citation chain. This boundary management is likely the hardest engineering problem at Learned Hand, and a strong question to ask in the interview: "How do you handle the boundary between retrieved content and generated reasoning? Is there a separation layer that prevents the model's parametric knowledge from leaking into citation outputs?"

**Interview framing:** "The closed-universe vs. open-universe debate is really a question about what you optimize for. Law firms can tolerate some hallucination if the tool saves enough time — they verify everything anyway as part of billable work. Courts cannot tolerate hallucination at all because judicial output is presumed authoritative. The closed universe is not a limitation — it is a design decision that reflects judicial requirements. The Stanford study shows that even the best RAG systems hallucinate 17% of the time. For a court, that is 17 out of every 100 queries returning potentially fabricated content. The closed universe makes that number zero for fabrication — at the cost of coverage gaps that are manageable and familiar. My BS Detector operates in open-universe mode for the submission, but the architecture is designed to plug into a closed-universe corpus. That is exactly the transition Learned Hand has already made."

---

## 25. Production Architecture Blueprint

### System Architecture Diagram

```
                                    DOCUMENT INGESTION
                                    ==================
  PDF/DOCX/Scans ──> [OCR + Text Extraction] ──> [Chunker] ──> [Embedding Generator]
       |                  (Tesseract/          (by section/     (text-embedding-3-large)
       |                   pdfplumber/          argument,             |
       v                   docx2python)         overlap=200)          v
  [S3/GCS Document                                            [Vector DB]
   Object Store]                                              (Pinecone/Weaviate)
       |                                                      case law embeddings
       v
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │                          MESSAGE QUEUE (SQS / RabbitMQ)                         │
  │  Stages: ingest -> parse -> verify -> synthesize -> memo -> review              │
  └──────┬──────────────┬───────────────┬──────────────┬──────────────┬─────────────┘
         │              │               │              │              │
         v              v               v              v              v
  ┌────────────┐ ┌─────────────────────────────┐ ┌───────────┐ ┌───────────┐
  │ Document   │ │  ┌──────────────────────┐   │ │  Report   │ │ Judicial  │
  │ Parser     │ │  │ Citation Verifier    │   │ │ Synthe-   │ │ Memo      │
  │ Agent      │ │  │ (parallel per-cite)  │   │ │ sizer     │ │ Agent     │
  │            │ │  └──────────────────────┘   │ │ Agent     │ │           │
  │ K8s pod    │ │          ||                 │ │           │ │ K8s pod   │
  │ pool: 2-5  │ │  ┌──────────────────────┐   │ │ K8s pod   │ │ pool: 1-3 │
  │            │ │  │ Fact Checker          │   │ │ pool: 1-3 │ │           │
  │            │ │  │ (8 categories)        │   │ │           │ │           │
  │            │ │  └──────────────────────┘   │ │           │ │           │
  └─────┬──────┘ └──────────────┬──────────────┘ └─────┬─────┘ └─────┬─────┘
        │                       │                      │              │
        v                       v                      v              v
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │                           LEGAL DATABASE LAYER                                  │
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
  │  │ CourtListener│  │ Westlaw API  │  │ PACER API    │  │ Court-       │        │
  │  │ (federal,    │  │ (state +     │  │ (filings,    │  │ specific     │        │
  │  │  free/open)  │  │  federal)    │  │  dockets)    │  │ local rules  │        │
  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │
  └─────────────────────────────────────────────────────────────────────────────────┘
        │                       │                      │              │
        v                       v                      v              v
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │                        RESULT STORAGE & AUDIT TRAIL                             │
  │  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐        │
  │  │ PostgreSQL         │  │ Redis              │  │ Audit Log          │        │
  │  │ - case data        │  │ - hot case cache   │  │ - who ran what     │        │
  │  │ - findings         │  │ - embedding cache  │  │ - who viewed what  │        │
  │  │ - pipeline runs    │  │ - session state    │  │ - who overrode what│        │
  │  │ - user feedback    │  │ - rate limiting    │  │ - immutable append │        │
  │  └────────────────────┘  └────────────────────┘  └────────────────────┘        │
  └─────────────────────────────────────────────────────────────────────────────────┘
        │                                                             │
        v                                                             v
  ┌────────────────────┐                                ┌────────────────────────┐
  │ HUMAN REVIEW UI    │                                │ FEEDBACK LOOP          │
  │ - side-by-side     │                                │ - clerk corrections    │
  │   source + finding │  ────── accept/reject ──────>  │   update prompt weight │
  │ - confidence viz   │                                │ - false positive log   │
  │ - RBAC per role    │                                │   -> precision rules   │
  │ - export to CMS    │                                │ - missed error log     │
  └────────────────────┘                                │   -> recall tuning     │
                                                        └────────────────────────┘
```

### Infrastructure Stack

#### Why Kubernetes for Agent Scaling

Each agent becomes a Kubernetes Deployment (not a monolith with all five agents in one process). The reasons are operational, not architectural:

| Concern | Monolith | K8s Microservices |
|---------|----------|-------------------|
| Scaling | Scale everything to scale one bottleneck | Scale citation verifier independently (it's the slowest) |
| Failure blast radius | One agent OOM kills the pipeline | Pod restart affects only that agent |
| Model heterogeneity | All agents use the same model | Citation verifier uses GPT-4, fact checker uses Claude, parser uses a fine-tuned model |
| Resource profiles | Uniform CPU/memory | Parser: CPU-heavy (text extraction). Verifier: network-heavy (DB lookups). Memo: GPU-optional |
| Deployment | Redeploy all agents for one prompt change | Roll out new fact-checker prompt without touching citation verifier |

**Pod pool sizing**: Parser (2-5 pods), CitationVerifier (3-8 pods, highest fan-out), FactChecker (2-5 pods), Synthesizer (1-3 pods), MemoAgent (1-3 pods). HPA (Horizontal Pod Autoscaler) scales based on queue depth per stage, not CPU — LLM-bound workloads are I/O-bound, not compute-bound.

**Why not serverless (Lambda/Cloud Run)**: Cold starts. An LLM agent call takes 3-10 seconds; a Lambda cold start adds 1-5 seconds. For a 5-stage pipeline, cold starts could add 25 seconds of overhead. Warm K8s pods eliminate this. Serverless also complicates connection pooling to PostgreSQL and Redis.

#### Data Layer

**PostgreSQL (not SQLite)** for case data and audit trail:

```sql
-- Core tables
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id UUID REFERENCES courts(id),
    case_number TEXT NOT NULL,
    case_type TEXT NOT NULL,          -- MSJ, habeas, post-conviction
    jurisdiction TEXT NOT NULL,        -- CA, MI, 2nd-circuit
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES users(id)
);

CREATE TABLE pipeline_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id),
    status TEXT NOT NULL,              -- pending, running, completed, failed
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    model_config JSONB,               -- which models, temperatures, prompts
    total_tokens INTEGER,
    total_cost_usd NUMERIC(10,6),
    triggered_by UUID REFERENCES users(id)
);

CREATE TABLE findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES pipeline_runs(id),
    finding_type TEXT NOT NULL,        -- citation, fact, synthesis
    severity TEXT NOT NULL,            -- critical, high, medium, low
    confidence NUMERIC(3,2),
    status TEXT NOT NULL,              -- auto_flagged, human_confirmed, human_rejected
    source_text TEXT,                  -- exact text from brief
    evidence_text TEXT,               -- exact text from source document
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ
);

-- Immutable audit log (append-only, no UPDATE/DELETE grants)
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT now(),
    actor_id UUID REFERENCES users(id),
    action TEXT NOT NULL,              -- view_case, run_pipeline, override_finding, export_report
    resource_type TEXT NOT NULL,       -- case, finding, report
    resource_id UUID NOT NULL,
    metadata JSONB                    -- IP address, session ID, before/after for overrides
);
```

**Why PostgreSQL over SQLite**: (1) Concurrent writes from multiple pipeline runs. SQLite's write lock serializes all writes across all pipelines, creating a bottleneck at 10+ concurrent cases. (2) Row-level security for multi-tenancy (court A cannot see court B's data). (3) JSONB columns for flexible metadata without schema migrations. (4) Point-in-time recovery for audit compliance. (5) Connection pooling via PgBouncer.

**Redis for caching frequently-cited cases**: The 80/20 rule applies to case law — a small number of landmark cases appear in a large fraction of briefs. Caching the top 10,000 most-cited cases in Redis eliminates repeated database lookups:

```python
async def get_case(case_citation: str) -> Optional[CaseRecord]:
    # Layer 1: Redis cache (sub-millisecond)
    cached = await redis.get(f"case:{normalize(case_citation)}")
    if cached:
        return CaseRecord.model_validate_json(cached)

    # Layer 2: PostgreSQL local copy (10-50ms)
    record = await db.fetch_case(case_citation)
    if record:
        await redis.setex(f"case:{normalize(case_citation)}", 86400, record.model_dump_json())
        return record

    # Layer 3: External API (200-2000ms)
    record = await courtlistener_client.search(case_citation)
    if record:
        await db.insert_case(record)
        await redis.setex(f"case:{normalize(case_citation)}", 86400, record.model_dump_json())
        return record

    return None  # Citation could not be found — flag as COULD_NOT_VERIFY
```

**S3/GCS for document storage**: Original PDFs, extracted text, and generated reports stored as immutable objects with versioning enabled. Retention policy: 7 years minimum (court record retention requirements). Lifecycle rules move documents older than 1 year to cold storage (S3 Glacier / GCS Archive).

**Vector DB (Pinecone/Weaviate) for case law embeddings**: Enables semantic search over case opinions. When the citation verifier needs to check whether "Privette v. Superior Court holds that hirers are never liable," it retrieves the actual holding text via embedding similarity, then the LLM compares the retrieved text against the brief's characterization. This shifts the LLM's role from recall ("do you know this case?") to comparison ("does this text support that claim?") — dramatically more reliable.

**Message queue (SQS/RabbitMQ) for async pipeline stages**: Each pipeline stage publishes a completion message with the result payload. The next stage's consumer picks it up. Benefits: (1) Retry with exponential backoff on transient failures. (2) Dead letter queue for permanently failed items. (3) Visibility into queue depth for autoscaling. (4) Natural rate limiting — if the LLM provider throttles, messages back up in the queue rather than failing.

```
Queue topology:
  ingest-queue     -> DocumentParser consumers (2-5)
  parse-complete   -> fan-out to citation-queue AND fact-queue
  citation-queue   -> CitationVerifier consumers (3-8)
  fact-queue       -> FactChecker consumers (2-5)
  verify-complete  -> barrier (wait for both) -> synthesis-queue
  synthesis-queue  -> ReportSynthesizer consumers (1-3)
  synth-complete   -> memo-queue
  memo-queue       -> JudicialMemo consumers (1-3)
  memo-complete    -> result-store + notification
  dead-letter      -> alert + manual review
```

### Security & Compliance

#### CJIS Compliance for Court Data

Courts handling criminal cases must comply with the FBI's Criminal Justice Information Services (CJIS) Security Policy. Key requirements and how they map to the architecture:

| CJIS Requirement | Implementation |
|-----------------|----------------|
| Personnel security | Background checks for all engineers with data access |
| Physical security | Cloud provider must be FedRAMP-authorized (AWS GovCloud, Azure Government) |
| Access control | RBAC enforced at API gateway + database level (see below) |
| Audit trail | Immutable `audit_log` table, append-only, no DELETE grants |
| Encryption in transit | TLS 1.3 for all internal and external communication |
| Encryption at rest | AES-256 for S3 objects, PostgreSQL TDE, Redis encryption |
| Media protection | S3 versioning + lifecycle policies, no local disk storage |
| Advanced authentication | MFA for all user accounts, API keys rotated quarterly |

#### Data Residency Requirements

Court data may be subject to state-level data residency laws. Architecture response:

- **Single-region deployment** per court system (e.g., Michigan data stays in us-east-1, California in us-west-1)
- **No cross-region replication** of case data (replication only within the region for HA)
- **LLM API routing**: If using cloud LLMs, ensure the provider processes data in the required region. Self-hosted models (vLLM on K8s) eliminate this concern entirely
- **Document storage**: S3 bucket per region with bucket policies preventing cross-region access

#### Encryption

```
At rest:
  - S3: SSE-S3 (AES-256) or SSE-KMS with customer-managed keys
  - PostgreSQL: Transparent Data Encryption (TDE) via pgcrypto
  - Redis: encryption-at-rest enabled (ElastiCache)
  - Vector DB: provider-managed encryption (Pinecone SOC 2 Type II)

In transit:
  - All HTTP: TLS 1.3 (minimum TLS 1.2)
  - Internal service mesh: mTLS via Istio/Linkerd
  - Database connections: SSL required (sslmode=verify-full)
  - Redis: TLS-enabled connections
```

#### Audit Logging

Every action that touches case data is logged immutably:

| Action | What's Logged | Why |
|--------|--------------|-----|
| Pipeline run | Who triggered, which case, which model config, start/end time, token count | Reproducibility + cost attribution |
| Finding viewed | Who viewed, which finding, timestamp | Access tracking for sensitive cases |
| Finding overridden | Who, original status, new status, reason text | Accountability for human-in-the-loop decisions |
| Report exported | Who, format, recipient | Chain of custody for court filings |
| Model config changed | Who, before/after prompt text, before/after model selection | Prompt change management |
| User login/logout | Who, IP, MFA method, success/failure | Security monitoring |

The audit log table has no UPDATE or DELETE grants — even database administrators cannot modify audit records. Backup retention: minimum 7 years (aligned with court record retention schedules).

#### Role-Based Access Control (RBAC)

| Role | Permissions | Rationale |
|------|------------|-----------|
| **Judge** | View reports for assigned cases, view audit trail | Judges see final output, not intermediate agent data |
| **Law Clerk** | Run pipeline, view/override findings, export reports | Clerks are the primary users — they review and validate findings |
| **Staff Attorney** | Run pipeline, view findings (no override), view aggregate stats | Attorneys use reports for research but don't make final determinations |
| **Court Admin** | User management, court config, view aggregate metrics | Administrative access without case data access |
| **System Admin** | Model config, prompt management, system health | Technical access without case content access (content fields encrypted) |

**Why judges can't run the pipeline directly**: Separation of concerns. The clerk runs analysis, reviews findings, and presents the validated report to the judge. This mirrors the existing judicial workflow where clerks draft bench memos. The AI tool augments the clerk's workflow, not the judge's.

#### PII Handling in Legal Documents

Legal briefs, police reports, and medical records contain extensive PII: names, addresses, SSNs, medical conditions, criminal history. The system must handle PII without unnecessary exposure:

- **No PII in logs**: Agent logs redact names, dates of birth, SSNs, addresses before writing. Pattern-based redaction (`\d{3}-\d{2}-\d{4}` for SSN, etc.)
- **No PII in LLM telemetry**: Langfuse traces store prompt templates and token counts, not raw prompt content containing PII. Opt-in full-text logging only in CJIS-compliant environments
- **No PII in error messages**: Exception handlers strip document content before logging. Stack traces include agent name and error type, not input data
- **PII-aware caching**: Redis cache keys use case IDs (UUIDs), not case names or party names. Cache TTL: 24 hours maximum to limit exposure window

### Observability Stack

#### Langfuse for LLM Tracing

Langfuse is purpose-built for LLM observability and integrates with LangChain (which the BS Detector already uses). Every LLM call is traced with:

| Metric | What It Shows | Why It Matters |
|--------|--------------|----------------|
| Prompt template + variables | Exact input to each agent | Debug prompt regressions |
| Completion text | Raw LLM output before parsing | Debug parsing failures |
| Token count (input/output) | Per-call and per-pipeline | Cost attribution per case |
| Latency (TTFT + total) | Time to first token + full response | Identify slow agents |
| Model + temperature | Which model variant was used | A/B test model switches |
| Cost (USD) | Per-call cost based on token pricing | Budget enforcement |
| Trace hierarchy | Pipeline -> Agent -> LLM call tree | Distributed tracing |
| User feedback | Clerk accept/reject per finding | Ground truth for eval |

```python
# Integration pattern (wraps existing LLMService)
from langfuse.callback import CallbackHandler

class ObservableLLMService(LLMService):
    async def call(self, prompt: str, model: str, trace_id: str, **kwargs):
        handler = CallbackHandler(
            trace_id=trace_id,
            metadata={"agent": kwargs.get("agent_name"), "case_id": kwargs.get("case_id")}
        )
        return await self.llm.ainvoke(prompt, config={"callbacks": [handler]})
```

#### OpenTelemetry for Distributed Tracing

Langfuse traces LLM calls. OpenTelemetry traces everything else: HTTP requests, database queries, cache lookups, queue operations, inter-service communication.

```
Trace: POST /api/analyze (case_id=abc-123)
├── Span: document_ingestion (42ms)
│   ├── Span: s3_upload (18ms)
│   └── Span: text_extraction (24ms)
├── Span: document_parser_agent (4,200ms)
│   ├── Span: llm_call (3,800ms) [Langfuse handles this]
│   └── Span: pydantic_parse (12ms)
├── Span: parallel_verification (8,400ms)
│   ├── Span: citation_verifier (8,400ms)
│   │   ├── Span: case_lookup_privette (45ms) [Redis hit]
│   │   ├── Span: case_lookup_dixon (380ms) [DB + API]
│   │   ├── Span: llm_verify_privette (3,200ms)
│   │   └── Span: llm_verify_dixon (2,800ms)
│   └── Span: fact_checker (6,100ms)
│       └── Span: llm_call (5,900ms)
├── Span: report_synthesizer (3,100ms)
└── Span: judicial_memo (2,900ms)
Total: 18,642ms
```

**Why both Langfuse AND OpenTelemetry**: Langfuse excels at LLM-specific metrics (prompt versioning, token costs, model comparison). OpenTelemetry excels at infrastructure metrics (database latency, cache hit rates, queue depth). Using only one leaves blind spots. Langfuse's OpenTelemetry exporter bridges the two — LLM traces appear in the same Grafana dashboards as infrastructure traces.

#### Grafana Dashboards

**Dashboard 1: Cost & Volume**

| Panel | Query | Alert Threshold |
|-------|-------|----------------|
| Cost per case (7-day rolling avg) | `sum(langfuse_cost_usd) by (case_type) / count(pipeline_runs)` | > $2.00 per case |
| Daily token consumption | `sum(langfuse_tokens_total) by (model)` | > 5M tokens/day |
| Cases processed per hour | `rate(pipeline_runs_total[1h])` | < 1/hr during business hours |
| Model cost breakdown | `sum(langfuse_cost_usd) by (model, agent)` | Citation verifier > 60% of total cost |

**Dashboard 2: Latency & Reliability**

| Panel | Query | Alert Threshold |
|-------|-------|----------------|
| Pipeline latency P50/P95/P99 | `histogram_quantile(0.95, pipeline_duration_seconds)` | P95 > 120s |
| Per-agent latency | `histogram_quantile(0.50, agent_duration_seconds) by (agent)` | Any agent P50 > 30s |
| Error rate by agent | `rate(agent_errors_total[5m]) / rate(agent_calls_total[5m])` | > 5% error rate |
| LLM provider error rate | `rate(llm_provider_errors[5m]) by (provider, error_code)` | > 2% rate-limit errors |
| Queue depth by stage | `aws_sqs_approximate_number_of_messages by (queue)` | > 50 messages in any queue |

**Dashboard 3: Quality & Confidence**

| Panel | Query | Alert Threshold |
|-------|-------|----------------|
| Confidence distribution (histogram) | `histogram(finding_confidence) by (finding_type)` | Mean shift > 0.1 from baseline |
| Human override rate | `count(findings WHERE status=human_rejected) / count(findings)` | > 20% rejection rate |
| Recall trend (weekly eval) | `eval_weighted_recall by (eval_date)` | Drop > 5% week-over-week |
| Precision trend (weekly eval) | `eval_precision by (eval_date)` | Drop > 5% week-over-week |
| COULD_NOT_VERIFY rate | `count(citations WHERE status=could_not_verify) / count(citations)` | > 30% unverifiable |

#### Alerting: Confidence Distribution Shift Detection

The most insidious failure mode in production LLM systems is a silent quality regression — the system keeps producing output, but the output quality degrades after a model update, prompt change, or provider-side modification.

**Detection method**: Maintain a rolling baseline of confidence score distributions (30-day window). After each pipeline run, compare the current batch's confidence distribution against the baseline using a two-sample Kolmogorov-Smirnov test:

```python
from scipy.stats import ks_2samp

def check_confidence_drift(current_batch: List[float], baseline: List[float]) -> bool:
    """Returns True if confidence distribution has shifted significantly."""
    statistic, p_value = ks_2samp(current_batch, baseline)
    return p_value < 0.01  # 1% significance level

# Alert conditions:
# 1. Confidence mean drops > 0.1 from baseline  -> "Model may be less confident"
# 2. Confidence std increases > 0.15             -> "Model output is more variable"
# 3. KS test p-value < 0.01                      -> "Distribution shift detected"
# 4. COULD_NOT_VERIFY rate increases > 10pp      -> "Verification coverage degraded"
```

**Why confidence distribution, not just accuracy**: Accuracy requires ground truth, which is expensive (human review). Confidence distribution is a free proxy — if the model's confidence pattern changes, something changed in the model's behavior. This catches problems days before human review would surface them.

---

## 26. Scaling Strategies

### 1. Horizontal Scaling

**Agent pool sizing**: Each pipeline stage has independent scaling characteristics:

| Agent | Scaling Dimension | Pool Size (baseline) | Scale Trigger | Max Pods |
|-------|------------------|---------------------|---------------|----------|
| DocumentParser | CPU-bound (text extraction + 1 LLM call) | 2 | Queue depth > 10 | 5 |
| CitationVerifier | I/O-bound (N parallel LLM calls + DB lookups) | 3 | Queue depth > 5 | 8 |
| FactChecker | LLM-bound (1 large prompt, long context) | 2 | Queue depth > 10 | 5 |
| ReportSynthesizer | LLM-bound (1 call, moderate context) | 1 | Queue depth > 5 | 3 |
| JudicialMemoAgent | LLM-bound (1 call, light context) | 1 | Queue depth > 5 | 3 |

**Why scale on queue depth, not CPU**: LLM-bound workloads spend 90%+ of wall-clock time waiting for API responses. CPU utilization stays at 5-15% even under load. Scaling on CPU would never trigger. Queue depth directly measures "how many cases are waiting" — the metric that actually matters.

**Auto-scaling formula**:

```
desired_replicas = ceil(queue_depth / target_per_pod)

# Example for CitationVerifier:
#   queue_depth = 15 cases waiting
#   target_per_pod = 2 (each pod processes ~2 cases concurrently)
#   desired_replicas = ceil(15/2) = 8 pods
#   capped at max_pods = 8
```

**Scale-down cooldown**: 5 minutes. LLM calls take 3-10 seconds each, and a pipeline run takes 20-60 seconds. Scaling down too aggressively causes thrashing (scale down -> queue builds -> scale up -> repeat). 5 minutes absorbs burst patterns.

**Barrier synchronization at the synthesis stage**: The synthesizer requires outputs from both CitationVerifier AND FactChecker. A barrier pattern in the message queue holds synthesis messages until both upstream stages complete for a given case:

```python
# Pseudocode for barrier logic
async def on_verification_complete(case_id: str, stage: str, result: dict):
    await redis.hset(f"barrier:{case_id}", stage, json.dumps(result))
    completed = await redis.hlen(f"barrier:{case_id}")
    if completed == 2:  # Both citation and fact stages done
        citation_result = await redis.hget(f"barrier:{case_id}", "citation")
        fact_result = await redis.hget(f"barrier:{case_id}", "fact")
        await synthesis_queue.publish({"case_id": case_id,
                                        "citations": citation_result,
                                        "facts": fact_result})
        await redis.delete(f"barrier:{case_id}")
```

### 2. Caching Layers

**Three-tier caching strategy**:

| Cache Layer | What's Cached | TTL | Hit Rate (expected) | Storage |
|-------------|--------------|-----|---------------------|---------|
| Case law cache | Full text of frequently-cited cases | 7 days | 60-80% for federal cases | Redis (top 10K cases) + PostgreSQL (full corpus) |
| Embedding cache | Vector embeddings for case opinions | 30 days | 90%+ (embeddings rarely change) | Vector DB native cache + Redis for hot embeddings |
| Prompt template cache | Compiled prompt templates with variable slots | Until prompt version change | 99%+ (prompts change infrequently) | In-memory (per-pod) |
| Citation existence cache | Boolean: does this case exist in our corpus? | 24 hours | 70-85% | Redis with Bloom filter for negative lookups |
| Jurisdiction lookup cache | Reporter -> jurisdiction mapping | Indefinite (static data) | 100% after warm-up | In-memory hashmap |

**Why not cache LLM responses**: LLM responses to identical prompts vary due to temperature > 0. Even at temperature = 0, provider-side batching and quantization can produce different outputs. Caching LLM responses would freeze potentially incorrect analyses. Exception: citation existence checks at temperature=0 with deterministic prompts could be cached for 24 hours.

**Bloom filter for negative citation lookups**: Before querying CourtListener or Westlaw (200-2000ms), check a Bloom filter of all known case citations (sub-millisecond). If the filter says "definitely not in corpus," skip the API call and return `COULD_NOT_VERIFY` immediately. False positive rate of 1% means 99% of nonexistent citations are caught without an API call.

### 3. Cost Optimization

**Model routing** — not all cases need frontier models:

| Case Complexity | Detection Signal | Model | Cost per 1K tokens |
|----------------|-----------------|-------|---------------------|
| Simple (routine MSJ, 2-3 citations, clear facts) | < 5 citations, < 10 pages, common case types | GPT-4o-mini / Claude 3.5 Haiku | ~$0.001 |
| Standard (typical MSJ, 5-10 citations, some ambiguity) | 5-10 citations, 10-30 pages | GPT-4o / Claude 3.5 Sonnet | ~$0.01 |
| Complex (multi-party, 10+ citations, novel legal questions) | > 10 citations, > 30 pages, rare case types | GPT-4 / Claude Opus | ~$0.06 |

**Complexity classifier**: A lightweight model (or rule-based heuristic) scores incoming cases on citation count, document length, case type rarity, and jurisdiction complexity. The score determines which model tier handles each agent. The classifier itself costs < $0.001 per case.

**Token budget per case**: Hard limits prevent runaway costs:

```python
TOKEN_BUDGETS = {
    "parser": 4_000,        # Input: ~2K, Output: ~1K, Buffer: 1K
    "citation_verifier": 3_000 * num_citations,  # Per-citation budget
    "fact_checker": 8_000,   # Largest single prompt
    "synthesizer": 4_000,
    "memo": 3_000,
}
MAX_CASE_BUDGET = 50_000    # Hard ceiling per pipeline run

# If approaching budget, degrade gracefully:
# 1. Reduce fact-checking categories to top 4 (skip low-priority)
# 2. Truncate citation verifier to top 5 citations by relevance
# 3. Use smaller model for memo generation (least accuracy-critical)
```

**Cost attribution**: Every LLM call is tagged with `case_id`, `agent_name`, and `court_id`. Monthly invoicing per court is derived from aggregated Langfuse cost data. Courts that process more cases pay more — usage-based pricing tied to actual token consumption.

### 4. Latency Optimization

**Streaming results**: Replace the current request-response pattern with Server-Sent Events (SSE):

```python
# Current: client waits 30-60s for complete result
response = await pipeline.run(documents)  # blocks until done

# Production: client receives incremental updates
async def stream_pipeline(documents):
    yield event("parser_started", {})
    parser_result = await parser.run(documents)
    yield event("parser_complete", {"citation_count": len(parser_result.citations)})

    yield event("verification_started", {})
    # Stream individual citation results as they complete
    async for citation_result in verifier.run_streaming(parser_result.citations):
        yield event("citation_verified", citation_result.model_dump())

    # ... continue through pipeline stages
    yield event("pipeline_complete", final_report.model_dump())
```

**Why SSE, not WebSocket**: SSE is simpler (HTTP-based, auto-reconnect, no handshake), sufficient for server-to-client streaming (the client doesn't need to send messages mid-pipeline), and works through proxies/load balancers without special configuration. WebSocket would be needed only if the UI required interactive mid-pipeline editing (e.g., "skip this citation").

**Pre-fetching case law**: When the parser extracts citations, immediately begin database lookups for all cited cases — before the citation verifier starts. By the time the verifier needs case text, it is already in Redis:

```python
async def run_pipeline(documents):
    # Stage 1: Parse
    parser_result = await parser.run(documents)

    # Pre-fetch: start DB lookups immediately (don't wait for verifier)
    prefetch_task = asyncio.create_task(
        prefetch_cases([c.citation_text for c in parser_result.citations])
    )

    # Stage 2: Parallel verification + fact checking
    # By the time verifier calls get_case(), results are cached
    citation_task = verifier.run(parser_result.citations)
    fact_task = fact_checker.run(documents)
    citations, facts = await asyncio.gather(citation_task, fact_task)
    await prefetch_task  # Ensure prefetch completes (usually already done)
```

**Warm model instances**: For self-hosted models (vLLM, TGI), keep models loaded in GPU memory. Cold model loading takes 30-60 seconds; warm inference takes 2-5 seconds. Health check endpoints verify model readiness before routing traffic.

### 5. Multi-Tenancy

**Court-specific configurations**: Each court (tenant) has its own configuration profile:

```python
@dataclass
class CourtConfig:
    court_id: str
    jurisdiction: str                    # "CA", "MI", "2nd-circuit"
    model_tier: str                      # "standard", "premium"
    fact_categories: List[str]           # Which categories apply to this jurisdiction
    custom_precision_rules: List[str]    # Court-specific false-positive suppression
    retention_days: int                  # How long to keep pipeline results
    allowed_roles: Dict[str, List[str]]  # RBAC overrides per court
    notification_webhook: Optional[str]  # Slack/Teams webhook for completed analyses
```

**Jurisdiction-aware routing**: A California court's pipeline uses California-specific precedent weighting (California Supreme Court > California Court of Appeal > 9th Circuit > other federal circuits > other states). A Michigan court's pipeline uses Michigan-specific weighting. The citation verifier's relevance scoring is parameterized by jurisdiction:

```python
JURISDICTION_WEIGHTS = {
    "CA": {"cal_supreme": 1.0, "cal_appeal": 0.9, "9th_circuit": 0.8,
           "scotus": 1.0, "other_federal": 0.5, "other_state": 0.3},
    "MI": {"mi_supreme": 1.0, "mi_appeal": 0.9, "6th_circuit": 0.8,
           "scotus": 1.0, "other_federal": 0.5, "other_state": 0.3},
}
```

**Tenant isolation**: Hard boundaries between court data:

| Isolation Layer | Mechanism |
|----------------|-----------|
| Network | Separate K8s namespaces per court, NetworkPolicy preventing cross-namespace traffic |
| Database | PostgreSQL Row-Level Security: `CREATE POLICY court_isolation ON cases USING (court_id = current_setting('app.court_id'))` |
| Storage | Separate S3 prefixes per court with IAM policies: `s3://legal-docs/{court_id}/` |
| Cache | Redis key prefixing: `{court_id}:case:{citation}` |
| Queue | Separate queue per court: `citation-queue-{court_id}` |
| Logging | Tenant ID on every log line; log aggregation filtered by tenant |

**Why hard isolation instead of soft**: Court data is among the most sensitive data in government. A cross-tenant data leak (Court A sees Court B's criminal case data) would be catastrophic — not just a privacy violation but a potential due process violation. Hard isolation at every layer means a single misconfiguration cannot leak data across courts.

---

## 27. Testing Strategy for Production

### 1. Unit Tests: Per-Agent Mock-Based Tests

Each agent is tested in isolation with deterministic inputs and mocked LLM responses:

```python
# test_citation_verifier.py
class TestCitationVerifier:
    @pytest.fixture
    def mock_llm(self):
        """Returns a mock LLM that produces deterministic responses."""
        async def mock_call(prompt: str, response_model=None):
            if "Privette" in prompt:
                return {"status": "MISLEADING", "confidence": 0.85,
                        "notes": "Case does not hold 'never liable'"}
            return {"status": "SUPPORTED", "confidence": 0.9, "notes": ""}
        return mock_call

    async def test_misleading_citation_detected(self, mock_llm):
        verifier = CitationVerifierAgent(llm=mock_llm)
        result = await verifier.execute({
            "citations": [{"citation_text": "Privette v. Superior Court",
                          "claimed_proposition": "hirers are never liable",
                          "context": "construction accident"}],
            "case_context": RIVERA_CONTEXT
        })
        assert result[0]["status"] == "MISLEADING"
        assert result[0]["confidence"] >= 0.8

    async def test_single_citation_failure_does_not_block_others(self, mock_llm):
        """Verify that one citation timing out doesn't kill the batch."""
        verifier = CitationVerifierAgent(llm=mock_llm)
        citations = [valid_citation, timeout_citation, valid_citation]
        result = await verifier.execute({"citations": citations, "case_context": ""})
        assert len(result) == 3
        assert result[1]["status"] == "COULD_NOT_VERIFY"
        assert result[0]["status"] != "COULD_NOT_VERIFY"
        assert result[2]["status"] != "COULD_NOT_VERIFY"

    async def test_status_map_handles_unexpected_llm_output(self):
        """LLM returns 'partially_supported' — should map to COULD_NOT_VERIFY."""
        verifier = CitationVerifierAgent(llm=lambda p, **kw: {"status": "partially_supported"})
        result = await verifier._verify_one(sample_citation, "")
        assert result.status == VerificationStatus.COULD_NOT_VERIFY
```

**What to mock**: The LLM call (`_call_llm`). Never mock Pydantic validation — that is part of the agent's contract and must run in tests.

**What NOT to unit test**: The quality of LLM output. Unit tests verify that agents handle LLM output correctly (parsing, error handling, status mapping). Quality testing belongs in integration and eval tests.

### 2. Integration Tests: Full Pipeline with Real Components

```python
# test_pipeline_integration.py
class TestPipelineIntegration:
    async def test_full_pipeline_rivera_v_harmon(self):
        """End-to-end: real documents -> real pipeline -> validate report structure."""
        documents = load_test_documents("rivera_v_harmon")
        report = await orchestrator.run(documents)

        # Structure assertions (not quality — that's eval's job)
        assert report.pipeline_status is not None
        assert all(s.status == "success" for s in report.pipeline_status)
        assert len(report.verified_citations) > 0
        assert len(report.verified_facts) > 0
        assert report.confidence_scores.overall > 0
        assert report.judicial_memo is not None

    async def test_database_integration(self):
        """Verify case lookup returns real data and caches correctly."""
        # Cold lookup
        result = await case_service.get_case("Privette v. Superior Court (1993)")
        assert result is not None
        assert "hirer" in result.holding.lower()

        # Verify cached
        cached = await redis.get("case:privette_v_superior_court_1993")
        assert cached is not None

    async def test_pipeline_with_database_unavailable(self):
        """Pipeline degrades gracefully when legal DB is down."""
        with mock_database_failure():
            report = await orchestrator.run(documents)
            # Pipeline completes, but citations are COULD_NOT_VERIFY
            unverifiable = [c for c in report.verified_citations
                          if c["status"] == "COULD_NOT_VERIFY"]
            assert len(unverifiable) > 0
            assert report.pipeline_status is not None  # Still produces a report
```

**Database integration tests**: Run against a test PostgreSQL instance with seed data. Verify that pipeline runs are persisted, findings are queryable, and audit logs are written. Use `pytest-postgresql` for isolated test databases.

**Queue integration tests**: Publish test messages to each queue stage, verify they flow through the pipeline correctly, verify dead-letter queue catches poison messages.

### 3. Regression Tests: Eval Suite as CI Gate

The existing eval harness (31 assertions, 8 planted errors) becomes a CI gate:

```yaml
# .github/workflows/eval-gate.yml
name: Eval Regression Gate
on: [pull_request]

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run eval suite
        run: |
          make eval
          python scripts/check_regression.py

      - name: Post results to PR
        if: always()
        run: python scripts/post_eval_to_pr.py
```

```python
# scripts/check_regression.py
"""Fail CI if eval metrics drop below thresholds."""
import json, sys

results = json.load(open("eval_results.json"))

THRESHOLDS = {
    "weighted_recall": 0.70,      # Must catch 70%+ of planted errors (weighted)
    "precision": 0.80,            # Must have 80%+ precision on clean docs
    "grounding_rate": 0.50,       # 50%+ of findings grounded in source text
    "false_discovery_rate": 0.25, # No more than 25% false discoveries
    "structure_pass_rate": 1.0,   # All structure checks must pass
}

failures = []
for metric, threshold in THRESHOLDS.items():
    actual = results.get(metric, 0)
    if actual < threshold:
        failures.append(f"{metric}: {actual:.2f} < {threshold:.2f}")

if failures:
    print("EVAL REGRESSION DETECTED:")
    for f in failures:
        print(f"  - {f}")
    sys.exit(1)

print("All eval thresholds passed.")
```

**Why minimum thresholds, not exact matches**: LLM output is non-deterministic. A prompt change that improves recall from 0.75 to 0.85 might decrease precision from 0.90 to 0.88. Thresholds allow this trade-off as long as neither metric drops below the minimum. Exact match CI gates would fail on every run due to LLM variance.

**Eval corpus expansion plan**: The single Rivera v. Harmon test case is insufficient. Production requires:

| Case Type | Error Types | Count Target |
|-----------|------------|--------------|
| Construction injury MSJ | Date, PPE, jurisdiction, omission | 5 cases |
| Contract dispute MSJ | Statute of frauds, parol evidence, consideration | 5 cases |
| Employment discrimination | Protected class, comparator, pretext | 5 cases |
| Medical malpractice | Standard of care, causation, damages | 5 cases |
| Post-conviction relief | Ineffective assistance, newly discovered evidence | 5 cases |
| Clean documents (no errors) | Precision control | 10 cases |
| **Total** | | **35 cases** |

### 4. Load Tests: Concurrent Case Processing

```python
# load_test.py (using locust or custom async harness)
import asyncio
import time

async def load_test(concurrent_cases: int, total_cases: int):
    """Simulate court workload: N cases submitted simultaneously."""
    semaphore = asyncio.Semaphore(concurrent_cases)
    results = {"success": 0, "failure": 0, "latencies": []}

    async def process_one(case_id: int):
        async with semaphore:
            start = time.monotonic()
            try:
                report = await client.post("/api/analyze", json=test_case(case_id))
                assert report.status_code == 200
                results["success"] += 1
                results["latencies"].append(time.monotonic() - start)
            except Exception as e:
                results["failure"] += 1

    await asyncio.gather(*[process_one(i) for i in range(total_cases)])

    print(f"Success: {results['success']}/{total_cases}")
    print(f"P50 latency: {sorted(results['latencies'])[len(results['latencies'])//2]:.1f}s")
    print(f"P95 latency: {sorted(results['latencies'])[int(len(results['latencies'])*0.95)]:.1f}s")
    print(f"Failure rate: {results['failure']/total_cases*100:.1f}%")

# Target: 10 concurrent cases, < 5% failure rate, P95 < 180s
asyncio.run(load_test(concurrent_cases=10, total_cases=50))
```

**LLM rate limiting behavior**: Every LLM provider enforces rate limits (requests/minute, tokens/minute). Under load, the system must handle 429 (Too Many Requests) responses gracefully:

```python
# Retry with exponential backoff + jitter
@retry(
    retry=retry_if_exception_type(RateLimitError),
    wait=wait_exponential(multiplier=1, min=2, max=60) + wait_random(0, 2),
    stop=stop_after_attempt(5),
    before_sleep=lambda retry_state: logger.warning(
        f"Rate limited, attempt {retry_state.attempt_number}, "
        f"sleeping {retry_state.next_action.sleep:.1f}s"
    )
)
async def call_llm_with_backoff(prompt: str, **kwargs):
    return await llm_service.call(prompt, **kwargs)
```

**Load test scenarios**:

| Scenario | Concurrent | Total | Expected P95 | Pass Criteria |
|----------|-----------|-------|--------------|---------------|
| Normal court day | 3 | 20 | < 60s | 0% failure |
| Heavy filing deadline | 10 | 50 | < 180s | < 5% failure |
| Stress test | 25 | 100 | < 300s | < 15% failure, no data corruption |
| Provider outage simulation | 10 | 30 | N/A | Graceful degradation, queue backpressure, no data loss |

### 5. Adversarial Tests: Briefs Designed to Fool the System

Adversarial testing is critical for judicial AI because attorneys — both ethical and unethical — will probe the system's weaknesses.

| Adversarial Technique | What It Tests | Expected Behavior |
|-----------------------|--------------|-------------------|
| Fabricated citation with real-looking format | Citation existence check | `COULD_NOT_VERIFY` or `NOT_SUPPORTED` (with DB: definitively not found) |
| Real case, completely fabricated holding | Holding verification | `MISLEADING` — case exists but doesn't say what's claimed |
| Subtle date shifts (off by 1 day, not 2) | Date precision threshold | Should still catch — any date discrepancy is material |
| Facts buried in footnotes | Extraction completeness | Parser should extract footnote content (currently misses truncated content) |
| Strategically accurate brief with one buried lie | Attention distribution | System should flag the lie without being lulled by surrounding accuracy |
| Massive document (200+ pages) | Chunking robustness | Should process all chunks, not just first 6,000 chars |
| Contradictory documents that agree with the MSJ | False positive resistance | Should report `CONSISTENT`, not flag phantom contradictions |
| Non-English citations (Quebec, Puerto Rico) | Jurisdiction edge cases | Should flag as out-of-jurisdiction or `COULD_NOT_VERIFY` |
| OCR-degraded scanned documents | Input quality robustness | Should extract text despite OCR errors, flag low-confidence extraction |
| Brief citing overruled cases | Treatment verification | Should flag as `NOT_SUPPORTED` with note about case being overruled |

```python
# test_adversarial.py
class TestAdversarial:
    async def test_fabricated_citation_with_real_format(self):
        """A citation that looks real but doesn't exist."""
        fake = {"citation_text": "Martinez v. Pacific Construction Co., 45 Cal.4th 892 (2009)",
                "claimed_proposition": "Hirers owe no duty of care to independent contractors",
                "context": "Construction accident liability"}
        result = await verifier.verify_one(fake, case_context="")
        assert result.status in [VerificationStatus.NOT_SUPPORTED,
                                  VerificationStatus.COULD_NOT_VERIFY]

    async def test_real_case_fabricated_holding(self):
        """Privette is real, but the holding is fabricated."""
        mischaracterized = {"citation_text": "Privette v. Superior Court (1993) 5 Cal.4th 689",
                           "claimed_proposition": "Hirers are strictly liable for all contractor injuries",
                           "context": ""}
        result = await verifier.verify_one(mischaracterized, case_context=RIVERA_CONTEXT)
        assert result.status == VerificationStatus.MISLEADING

    async def test_one_lie_among_truths(self):
        """Brief with 9 accurate facts and 1 subtle lie. System must find the lie."""
        documents = load_test_documents("one_lie_among_truths")
        report = await orchestrator.run(documents)
        contradictions = [f for f in report.verified_facts if f["status"] == "CONTRADICTORY"]
        assert len(contradictions) >= 1
        # Verify the actual lie was found, not a false positive
        assert any("scaffolding" in str(c).lower() for c in contradictions)
```

### 6. A/B Testing: Prompts, Models, and Confidence Calibration

**Prompt A/B testing**: When changing a prompt, run both versions on the eval corpus and compare:

```python
# ab_test_prompts.py
async def ab_test_prompt(prompt_a: str, prompt_b: str, test_cases: List[dict]):
    """Run both prompt variants on all test cases, compare metrics."""
    results_a = await run_eval_suite(prompt_override=prompt_a)
    results_b = await run_eval_suite(prompt_override=prompt_b)

    comparison = {
        "recall_a": results_a["weighted_recall"],
        "recall_b": results_b["weighted_recall"],
        "precision_a": results_a["precision"],
        "precision_b": results_b["precision"],
        "cost_a": results_a["total_cost"],
        "cost_b": results_b["total_cost"],
        "latency_a": results_a["p95_latency"],
        "latency_b": results_b["p95_latency"],
    }

    # Statistical significance: run each variant 5 times (LLM variance)
    # Report mean + std for each metric
    # Only promote variant B if it's better on primary metric (recall)
    # AND not worse on guardrail metrics (precision, cost)
    return comparison
```

**Model comparison**: Same framework, different model parameter:

| Comparison | Primary Metric | Guardrail Metrics | Decision Rule |
|-----------|---------------|-------------------|---------------|
| GPT-4o vs Claude 3.5 Sonnet | Weighted recall | Precision >= 0.80, Cost <= 2x baseline | Higher recall wins if guardrails pass |
| GPT-4o-mini vs GPT-4o | Cost per case | Recall >= 0.65, Precision >= 0.75 | Cheaper model wins if quality sufficient |
| New prompt vs old prompt | F1 score | No metric drops > 5% | New prompt wins if F1 improves and no regression |
| Fine-tuned vs base model | Recall on domain-specific errors | Precision >= baseline, Hallucination rate <= baseline | Fine-tuned wins if recall improves without precision loss |

**Confidence calibration A/B testing**: Compare raw LLM confidence scores against calibrated scores (Platt scaling):

```python
# Before calibration:
#   LLM says 0.85 confidence -> actual accuracy is 0.62 (overconfident)
#   LLM says 0.40 confidence -> actual accuracy is 0.38 (well-calibrated)

# After Platt scaling:
#   calibrated(0.85) = 0.64 -> matches actual accuracy
#   calibrated(0.40) = 0.37 -> still well-calibrated

# A/B test: show clerks raw vs calibrated scores
# Measure: clerk override rate (lower = better calibration)
# Hypothesis: calibrated scores lead to fewer "I disagree with this confidence" overrides
```

### 7. Canary Deployment: Gradual Rollout with Monitoring

**Canary deployment strategy** for prompt changes, model updates, or pipeline modifications:

```
Phase 1: Shadow mode (0% traffic)
  - New version runs in parallel, results compared but not shown to users
  - Duration: 24 hours minimum
  - Gate: No metric regression > 5% vs production baseline

Phase 2: Canary (5% traffic)
  - 1 in 20 cases routed to new version
  - Duration: 48 hours
  - Gate: Confidence distribution KS test p-value > 0.01
  - Gate: Error rate within 2% of production
  - Gate: Human override rate within 5% of production

Phase 3: Staged rollout (25% -> 50% -> 100%)
  - Gradual traffic shift with monitoring at each step
  - Duration: 24 hours per step
  - Automatic rollback trigger: any gate metric fails for > 30 minutes

Rollback: Instant traffic shift back to previous version
  - All in-flight canary cases complete on canary version (no mid-pipeline switch)
  - Rollback event logged in audit trail with reason
```

**Confidence distribution monitoring during rollout**:

```python
# Runs every 15 minutes during canary phase
async def canary_health_check():
    production_confidences = await get_recent_confidences("production", hours=24)
    canary_confidences = await get_recent_confidences("canary", hours=24)

    if len(canary_confidences) < 10:
        return "INSUFFICIENT_DATA"  # Need minimum sample size

    # Test 1: Distribution similarity
    ks_stat, p_value = ks_2samp(production_confidences, canary_confidences)
    if p_value < 0.01:
        return "DISTRIBUTION_SHIFT_DETECTED"

    # Test 2: Mean confidence drift
    prod_mean = np.mean(production_confidences)
    canary_mean = np.mean(canary_confidences)
    if abs(prod_mean - canary_mean) > 0.1:
        return "MEAN_DRIFT_DETECTED"

    # Test 3: COULD_NOT_VERIFY rate
    prod_cnv = await get_cnv_rate("production", hours=24)
    canary_cnv = await get_cnv_rate("canary", hours=24)
    if canary_cnv - prod_cnv > 0.10:  # 10pp increase
        return "VERIFICATION_DEGRADATION"

    return "HEALTHY"
```

**Why canary deployment is non-negotiable for judicial AI**: A bad deployment in a consumer app means degraded UX. A bad deployment in a judicial AI system means potentially incorrect legal analysis reaching judges. The cost of a silent quality regression — undetected for days while courts rely on degraded output — is unacceptable. Canary deployment with automated rollback ensures that quality regressions are caught within hours, not days, and affect a small fraction of cases during the detection window.

---

## 23. Deep Code Walkthrough

### 23.1 `backend/agents/orchestrator.py` — Pipeline Orchestration

**Purpose**: The nerve center of the pipeline. Owns the 5-stage DAG: parse -> [cite || fact] -> synthesize -> memo.

**Key logic, line by line**:

- **Lines 22-42**: Four free functions (`_track`, `_start`, `_succeed`, `_fail`) implement a lightweight status-tracking protocol. Each agent gets an `AgentStatus` object pushed into a shared `pipeline_status` list. This is a manual state machine (pending -> running -> success|failed) with wall-clock timing via `time.time()`. A senior reviewer would note these are free functions, not methods — a deliberate choice to keep `PipelineOrchestrator` focused on flow control rather than status bookkeeping.

- **Lines 46-53**: Constructor wires all five agents to a shared `LLMService` instance. This is dependency injection via constructor — every agent gets the same LLM configuration. A code review catch: `PipelineOrchestrator` also instantiates `DocumentService()` directly (line 48), breaking the DI pattern. If you wanted to test with mock documents, you would need to monkey-patch or subclass.

- **Lines 55-62**: `analyze()` accepts either uploaded `documents` (dict) or falls back to disk-based loading. The `case_id` defaults to `"unknown"` but gets overridden to `"Rivera_v_Harmon_MSJ"` on line 71 if no documents and no case_id are provided. This hardcoded fallback means the demo case runs automatically but would be a landmine in production.

- **Lines 74-93**: Parser stage with early exit. If the parser raises, the orchestrator short-circuits and returns a `VerificationReport` with `unknown_issues` populated and all other fields empty. The `json.loads(report.model_dump_json())` round-trip (lines 88-93) is worth noting — it serializes a Pydantic model to JSON string then immediately deserializes to dict. This ensures the output matches the same format as the success path but adds unnecessary serialization overhead.

- **Lines 96-97**: Late import of `get_case_context` from `utils.case_context`. This is a lazy import inside the method body — unusual but prevents circular imports in this flat package structure.

- **Lines 99-112**: The parallel execution core. Two `AgentStatus` entries are created and started before the tasks are dispatched. `asyncio.gather(..., return_exceptions=True)` is the key pattern — exceptions become return values rather than propagating, allowing the orchestrator to handle each failure independently (lines 115-127). If citation verification fails, `citation_results` becomes an empty list and the pipeline continues with fact-checking results only (and vice versa). This is graceful degradation — partial results are better than no results.

- **Lines 131-148**: Synthesis stage with its own fallback. If the synthesizer raises, the orchestrator builds a minimal synthesis dict with zero scores and the error message in `unknown_issues`. This means the pipeline always produces a report, even if it is mostly empty.

- **Lines 155-168**: Judicial memo stage. Unlike the synthesizer fallback, a failed memo just sets `memo_data = None`. The downstream `JudicialMemo(**memo_data) if memo_data else None` conditional (line 179) handles this gracefully — the final report simply has no memo rather than a broken one.

- **Lines 170-188**: Final report assembly. `VerificationReport` is constructed with all accumulated data, then round-tripped through `json.loads(report.model_dump_json())`. The metadata dict on line 184 includes the pipeline topology as a Unicode string literal, which is documentation-as-data.

**Design patterns**: Pipeline/DAG orchestration with status tracking. Graceful degradation at every stage. Return-exceptions pattern for parallel error handling.

**What would break**: Changing the `return_exceptions=True` to `False` on line 111 would cause any single agent failure to crash the entire pipeline. Removing the `json.loads(model_dump_json())` round-trip would return Pydantic model instances instead of plain dicts, breaking JSON serialization in the FastAPI response.

**Code review observations**: (1) The `json.loads(model_dump_json())` pattern appears on lines 88 and 188 — `model_dump()` alone would return a dict, but the JSON round-trip ensures datetime serialization and enum values are strings. This is defensive but not idiomatic Pydantic v2 (where `model_dump(mode="json")` would suffice). (2) No retry logic anywhere — a transient LLM API failure fails the entire agent. (3) No concurrency limit on `asyncio.gather` — with many citations, this could hammer the LLM API.

---

### 23.2 `backend/agents/base_agent.py` — Abstract Base Agent

**Purpose**: Defines the contract all agents must fulfill and provides shared LLM-calling infrastructure.

**Key logic**:

- **Lines 8-9**: `AgentError` is a custom exception subclass. All LLM failures get wrapped in this type, giving upstream code a single exception to catch.

- **Lines 12-16**: Constructor takes a `name` string and optional `llm_service`. The logger is namespaced as `agent.<name>`, so log output from `citation_verifier` appears as `agent.citation_verifier`. This is a good practice for filtering logs in production.

- **Lines 18-20**: Abstract `execute()` method. The signature `(input_data: Any, context: Dict[str, Any] = None)` is loose — `input_data` is `Any`, which means each subclass defines its own contract. A senior reviewer might flag this: a generic `Any` loses type safety. In practice, every agent expects a `Dict`, but the type system does not enforce it.

- **Lines 22-34**: `_call_llm()` wraps `llm_service.get_structured_response()` with `asyncio.wait_for(timeout=120)`. This is a 2-minute hard timeout per LLM call. If the LLM hangs, the coroutine is cancelled and `AgentError` is raised. The `except Exception` on line 33 catches everything else (network errors, JSON parse errors, Pydantic validation errors) and wraps them all in `AgentError`.

- **Lines 36-45**: `_call_llm_text()` is the unstructured variant calling `get_completion()`. Same timeout and error-wrapping pattern. This method exists for text-based prompting but is currently unused — all agents use `_call_llm` (structured). It is available infrastructure should any agent need raw text responses.

**Design patterns**: Template Method pattern — subclasses implement `execute()`, base class provides `_call_llm`. Exception wrapping with domain-specific error type.

**What would break**: Reducing the timeout below the typical LLM response time (~10-30s for DeepSeek) would cause spurious failures. Removing the `asyncio.wait_for` wrapper would allow hung LLM calls to block indefinitely.

---

### 23.3 `backend/agents/citation_verifier.py` — Per-Citation Parallel Verification

**Purpose**: Verifies each legal citation independently against ground-truth legal knowledge. The only agent that uses per-item parallelism.

**Key logic**:

- **Lines 9-15**: `VerificationResult` is a local Pydantic model (not exported in schemas) used as the structured response contract with the LLM. `confidence` has `Field(ge=0, le=1)` constraints — Pydantic will reject values outside [0, 1].

- **Lines 18-22**: `STATUS_MAP` translates LLM string responses to `VerificationStatus` enum values. Only three statuses are mapped; anything else falls through to `COULD_NOT_VERIFY` via the `.get()` default on line 44.

- **Lines 29-58**: `_verify_one()` processes a single citation. The prompt is formatted with `citation_text`, `claimed_proposition`, `context`, and `case_context`. On success, a `VerifiedCitation` is constructed and returned as a dict. On failure (lines 48-58), a fallback `VerifiedCitation` is returned with `is_supported=False`, `confidence=0.0`, and the error in `notes`. This means a citation verification failure is recorded as "could not verify" rather than silently dropped.

- **Lines 60-90**: `execute()` is the fan-out coordinator. It converts raw dicts to `Citation` objects (lines 68-70), then fires all `_verify_one` calls in parallel via `asyncio.gather(*..., return_exceptions=True)` (lines 72-75). The post-gather loop (lines 77-89) handles any exceptions that slipped through `_verify_one`'s own try/except — this is defense-in-depth. An exception at this level still produces a valid `VerifiedCitation` dict with error information.

- **Lines 63-64**: Early return for empty citations list — returns `[]` immediately without calling the LLM.

**Design patterns**: Fan-out/fan-in parallelism. Defensive error handling at two levels (per-citation and per-batch). Fail-open: a failed citation is reported as unverifiable, never silently dropped.

**What would break**: Removing `return_exceptions=True` on line 74 would cause one bad citation to fail the entire batch. Removing the inner try/except in `_verify_one` would cause exceptions to propagate to the gather level, where they would be caught by the outer handler — functionally equivalent but with less specific error messages.

**Code review observation**: There is no concurrency throttle. If the MSJ contains 50 citations, all 50 LLM calls fire simultaneously. With rate-limited APIs, this could trigger 429 errors. A semaphore-based throttle (e.g., `asyncio.Semaphore(5)`) would be prudent.

---

### 23.4 `backend/agents/fact_checker.py` — Single-Prompt Cross-Document Analysis

**Purpose**: Cross-references factual claims in the MSJ against police report, medical records, and witness statement in a single LLM call.

**Key logic**:

- **Lines 8-9**: `FactCheckResult` is the LLM response model. It contains a single field `verified_facts` which is a `List[Dict[str, Any]]` — notably, this is untyped dicts, not a list of Pydantic models. The LLM returns raw dicts, and the agent manually constructs `VerifiedFact` objects from them.

- **Lines 25-39**: Truncation logic. Each document is capped at 6000 characters (line 25). If any document exceeds this, a truncation notice is appended to the prompt (lines 33-47). This is the system's primary defense against context window overflow. The notice tells the LLM that analysis may be incomplete — transparency about limitations.

- **Lines 41-47**: The prompt is constructed with all four document texts (truncated) plus case context. The `FACT_CHECKING_PROMPT` is the longest prompt in the system (67 lines in `prompts.py`) with detailed precision rules and 8 fact categories.

- **Lines 49-82**: Response processing. The LLM returns `FactCheckResult` with `verified_facts` as raw dicts. Each dict is manually parsed (lines 57-81) with extensive fallback defaults:
  - `raw_consistent` null handling (lines 59-63): If the LLM returns `null` for `is_consistent`, the agent derives it from the `status` field. This defensive coding handles a real-world LLM output pattern.
  - `confidence` default of 0.5 (line 72): If the LLM omits confidence, 0.5 is a neutral default.
  - `contradictory_sources` and `supporting_sources` use `or []` (lines 74-75): Guards against null values.

- **Lines 80-81**: Malformed individual facts are logged and skipped rather than crashing. This per-item resilience is critical — one bad fact should not invalidate the other findings.

- **Lines 83-85**: Top-level exception handler returns `[]` — a complete LLM failure means no fact-checking results, but the pipeline continues.

**Design patterns**: Single-prompt batch analysis (contrast with citation verifier's per-item approach). Defensive deserialization with fallback defaults.

**What would break**: Increasing `max_chars` beyond the LLM context window (~16K tokens for DeepSeek) would cause truncated responses or API errors. Removing the `or []` guards on lines 74-75 would cause `TypeError` when the LLM returns null for list fields.

**Code review observation**: The fact checker does not use the parsed `facts` from the document parser — it receives raw document text and lets the LLM identify facts on its own. This means the parser's fact extraction is unused. The single-prompt approach trades parallelism for coherence: the LLM sees all documents at once and can cross-reference them naturally.

---

### 23.5 `backend/agents/report_synthesizer.py` — Aggregation Logic

**Purpose**: Takes raw citation and fact results and produces ranked findings with confidence scores.

**Key logic**:

- **Lines 9-12**: `SynthesisResult` model has three fields: `top_findings` (list of dicts), `confidence_scores` (dict of floats), and `unknown_issues` (list of strings).

- **Lines 25-27**: Input serialization. Both `citation_results` and `fact_results` are JSON-serialized with `json.dumps(..., default=str)` and truncated to 10,000 characters each (lines 26-27). The `default=str` handles datetime objects and enums that are not JSON-serializable. The 10K cap means that with many citations/facts, the synthesizer sees truncated data.

- **Lines 33-43**: Finding construction. Each raw finding dict from the LLM is wrapped in a `Finding` Pydantic model with fallback defaults. `id` defaults to `f"F-{i+1}"` (line 36), providing sequential IDs when the LLM does not generate them. `severity` defaults to `"medium"` (line 39).

- **Lines 46-50**: `ConfidenceScores` construction with 0.5 defaults for all three scores if the LLM omits them.

- **Lines 57-63**: Fallback on total failure — returns zero scores and the error message. The pipeline always gets some synthesis output.

**Design patterns**: Aggregation/reduction pattern. Input truncation to manage context budget. Defensive defaults at every level.

**What would break**: Removing the `[:10000]` truncation would pass unlimited data to the LLM, potentially exceeding context limits. Changing the `default=str` to `default=None` would raise `TypeError` on datetime objects.

---

### 23.6 `backend/agents/judicial_memo.py` — Memo Generation

**Purpose**: Generates a human-readable judicial memo from the synthesized findings.

**Key logic**:

- **Lines 9-13**: `JudicialMemoResult` local response model with four string/list fields. This is distinct from the `JudicialMemo` schema in `models/schemas.py` — the local model is for LLM response parsing, the schema model is for the final report. They have identical fields, which is redundant but keeps the LLM contract separate from the API contract.

- **Lines 27-29**: Findings are JSON-serialized and truncated to 6,000 characters. Confidence scores are serialized without truncation (they are always small).

- **Lines 33-41**: Standard pattern — call LLM, construct schema model, return as dict.

- **Lines 42-49**: Failure fallback returns a memo with the error message and "Unable to assess" as the assessment. The pipeline continues — a missing memo is degraded but not broken.

**Design patterns**: Same template as all agents. Notable for having near-identical local and schema models.

**Code review observation**: The `JudicialMemoResult` (lines 9-13) and `JudicialMemo` (schemas.py lines 93-97) have identical fields. Consolidating them into one model would reduce duplication, but the current approach allows the LLM response contract to evolve independently of the API contract.

---

### 23.7 `backend/services/llm_service.py` — LLM Abstraction Layer

**Purpose**: Abstracts LLM provider details behind a uniform async interface. Supports DeepSeek (cloud) and Ollama (local).

**Key logic**:

- **Lines 24-51**: `_extract_json()` is a critical utility. It handles three LLM output patterns: (1) markdown code fences, (2) raw JSON starting with `{` or `[`, (3) JSON embedded in natural language text. The function tries each strategy in order. The "last resort" strategy (lines 40-49) finds the first `{` or `[` and the last matching `}` or `]`. This is brittle — it assumes the outermost brackets are the target JSON, which fails if the LLM outputs nested markdown or multiple JSON objects.

- **Lines 54-69**: Provider auto-detection. Priority order: (1) explicit `model` parameter or `OLLAMA_MODEL` env var selects Ollama, (2) `api_key` parameter or `DEEPSEEK_API_KEY` env var selects DeepSeek, (3) neither results in a `ValueError` with setup instructions. The Ollama path uses `"ollama"` as a dummy API key (line 57) since Ollama's OpenAI-compatible endpoint does not require one.

- **Lines 72-78**: `_make_llm()` constructs a `ChatOpenAI` (from langchain_openai) instance per call. This is stateless — no connection pooling or client reuse. Each LLM call creates a new HTTP client. A senior reviewer would flag this as potentially inefficient under high concurrency.

- **Lines 80-86**: `_schema_prompt()` generates a system prompt that includes the full JSON schema of the expected response model. The instruction "Output ONLY valid JSON, no markdown fences, no explanation" aims to get clean JSON, but as `_extract_json` shows, LLMs do not always comply.

- **Lines 88-118**: `get_structured_response()` is the core method. Flow: (1) build system prompt with schema, (2) call `get_completion()`, (3) check for empty response, (4) extract JSON via `_extract_json()`, (5) parse JSON string, (6) validate against Pydantic model. The double validation (JSON parse + Pydantic validate) catches both syntax errors and schema violations separately. Line 116 checks `if result is None` after `model_validate()`, but `model_validate()` never returns None — it raises `ValidationError` instead. This is a dead code branch.

- **Lines 120-136**: `get_completion()` builds a LangChain chain with system and human messages, invokes it asynchronously, and returns the raw string. The `result or ""` on line 136 guards against None returns.

**Design patterns**: Strategy pattern for provider selection. Chain of responsibility for JSON extraction (try multiple strategies). LangChain's LCEL (LangChain Expression Language) for composable chains.

**What would break**: Removing `_extract_json()` would cause JSON parse failures whenever the LLM wraps responses in markdown fences. Changing `temperature=0.1` default to `0.0` would make outputs deterministic but some models do not support exact zero. Changing the `base_url` values would silently route requests to the wrong API.

**Code review observation**: The `_extract_json` function validates JSON on line 31 (`json.loads(candidate)`) but only for the code-fence path. For the other paths, it returns raw text that might not be valid JSON, deferring validation to the caller. This asymmetry could mask errors.

---

### 23.8 `backend/utils/prompts.py` — All Prompts

**Purpose**: Central prompt registry. Every LLM interaction in the system uses a prompt from this file.

**Key prompts**:

- **`CITATION_EXTRACTION_PROMPT` (lines 1-12)**: Instructs the LLM to extract all legal citations from the MSJ. Asks for `citation_text`, `claimed_proposition`, `source_location`, and `context`. The response format is described in natural language ("Return a JSON object with a 'citations' array"), not via a JSON schema. The schema constraint comes from `LLMService._schema_prompt()` at call time.

- **`CITATION_VERIFICATION_PROMPT` (lines 14-28)**: Per-citation verification. Four check categories: (1) holding mischaracterization, (2) quote accuracy, (3) jurisdictional authority, (4) fabrication detection. The `{case_context}` placeholder injects domain knowledge (e.g., the Privette holding). This prompt is what enables the system to catch the "never" misquotation.

- **`FACT_CHECKING_PROMPT` (lines 30-67)**: The most detailed prompt — 67 lines with explicit precision rules. Lines 46-52 are critical: they define what "contradictory" means (specific claim directly refuted) vs. what is NOT contradictory (routine omissions). Lines 54-63 define eight fact categories: `DATE_CONSISTENCY`, `PPE_SAFETY`, `WORK_CONTROL`, `SCAFFOLDING_CONDITION`, `OSHA_COMPLIANCE`, `INJURY_DETAILS`, `STATUTE_OF_LIMITATIONS`, `STRATEGIC_OMISSION`. The instruction "SKIP any category that does not apply" prevents false positives from irrelevant categories.

- **`REPORT_SYNTHESIS_PROMPT` (lines 69-82)**: Instructs the LLM to rank findings by severity and confidence, and to exclude consistent/unproblematic facts. Line 78 is key: "If all facts are consistent and no citation issues are found, set fact_consistency and overall scores HIGH (0.8-1.0)." This prompt engineering directly addresses the false-positive problem.

- **`JUDICIAL_MEMO_PROMPT` (lines 84-100)**: Instructs the LLM to write in "formal legal language" with specific structure (3-5 sentence paragraph, 3-5 bullet points, 2-3 recommendations, one-sentence assessment).

**Design pattern**: All prompts use Python f-string `.format()` placeholders (`{msj_text}`, `{case_context}`, etc.). No Jinja2 templating, no prompt management framework — just string constants.

**What would break**: Removing the precision rules from `FACT_CHECKING_PROMPT` (lines 46-52) would dramatically increase false positives. Removing the `{case_context}` placeholder from `CITATION_VERIFICATION_PROMPT` would prevent the system from catching the Privette misquotation, since the LLM would rely solely on parametric knowledge (which may have the same misquotation in its training data).

---

### 23.9 `backend/models/schemas.py` — All Pydantic Models

**Purpose**: Typed contracts for all data flowing between agents. 10 models in 118 lines.

**Key models**:

- **`VerificationStatus` / `ConsistencyStatus` (lines 7-18)**: String enums. Both include `COULD_NOT_VERIFY` as a fallback status, which is critical for expressing uncertainty rather than forcing binary verdicts.

- **`Citation` (lines 21-25)**: Simple model with `citation_text` (required), `claimed_proposition` (optional), `source_location` (default empty string), and `context` (optional). The mix of Optional and default empty string is inconsistent — a reviewer would suggest picking one pattern.

- **`VerifiedCitation` (lines 28-36)**: Wraps `Citation` with verification results. `status` is typed as `str` (line 35), not `VerificationStatus` enum. This means Pydantic will not validate the status value against the enum — any string is accepted. This is a deliberate relaxation to handle unexpected LLM output.

- **`VerifiedFact` (lines 46-61)**: Has a `field_validator` for `is_consistent` (lines 56-61) that coerces `None` to `True`. This handles the case where the LLM omits the field — the default assumption is "consistent unless proven otherwise." This is a bias-by-design choice that reduces false positives.

- **`Finding` (lines 64-84)**: Has two `field_validator`s: `coerce_id` (lines 74-77) casts to string (handles LLMs that return integer IDs), and `coerce_evidence` (lines 79-83) wraps a bare string in a list. These validators make the model tolerant of LLM output variations.

- **`ConfidenceScores` (lines 87-90)**: Three float fields with `ge=0, le=1` constraints and 0.0 defaults. The zero defaults mean that if scores are not explicitly set, the report shows zero confidence — a conservative choice.

- **`VerificationReport` (lines 107-117)**: The top-level model. `timestamp` uses `default_factory=datetime.now` — note this captures the time of model construction, not the time of pipeline completion. `judicial_memo` is `Optional` — the report is valid without a memo.

**Design patterns**: Defensive Pydantic with liberal validators. Enums for categorization with string fallbacks. Composition (VerifiedCitation wraps Citation, VerifiedFact wraps Fact).

**What would break**: Adding `strict=True` to any model would reject the flexible input patterns that LLMs produce. Changing `is_consistent` default from `True` to `False` in the validator would flip the bias toward false positives.

---

### 23.10 `backend/utils/case_context.py` — Domain Knowledge Injection

**Purpose**: Provides case-specific legal knowledge that the LLM may not have in its training data or may have incorrectly.

**Key logic**:

- **Lines 7-10**: `RIVERA_V_HARMON_CONTEXT` is a 3-point knowledge injection: (1) Privette is a rebuttable presumption, not absolute immunity — the word "never" does NOT appear, (2) Seabright narrowed retained control, (3) out-of-state citations are non-binding. This is essentially a "cheat sheet" that gives the LLM the correct legal knowledge to catch the planted errors.

- **Lines 13-18**: `get_case_context()` is a simple dict lookup. Unknown case IDs return empty string — the pipeline works on any brief but without case-specific grounding.

**Design pattern**: Registry/lookup pattern. Domain knowledge as configuration data.

**What would break**: Removing this file would eliminate the system's ability to reliably catch the Privette misquotation and jurisdictional issues. The system would fall back to the LLM's parametric knowledge, which might or might not contain the correct Privette holding. This is arguably the most fragile part of the architecture — it works perfectly for the demo case but requires manual knowledge engineering for each new case.

---

### 23.11 `backend/run_evals.py` — Eval Runner (Top-Level)

**Purpose**: The primary evaluation entry point. Runs the full pipeline on two test cases (Rivera with planted errors, Smith with clean docs) and measures 31 assertions across 6 categories.

**Key logic**:

- **Lines 41-109**: `GROUND_TRUTH` defines 8 planted discrepancies with two match modes: `"any"` (any keyword match suffices) and `"keyword_plus_signal"` (requires keyword + contextual signal like "contradict" or "false"). Weights of 2 for critical items (DATE, PPE, PRIVETTE, CTRL) and 1 for medium items (SOL, JURISDICTION, SCAFFOLDING, SPOLIATION).

- **Lines 112-116**: `KNOWN_CASE_NAMES` — the anti-hallucination list. Any case name the pipeline mentions that is not in this list is a potential fabrication.

- **Lines 126-156**: `EvalSummary` dataclass with weighted recall calculation (lines 143-146): `sum(weight for passed) / sum(weight)`. This means missing a critical discrepancy (weight=2) hurts twice as much as missing a medium one. Precision score is simpler: pass/total (lines 148-151).

- **Lines 179-230**: `_extract_searchable_text()` and `_check_ground_truth()` implement the matching logic. Text is extracted from multiple report sections (`top_findings`, `verified_facts`, `verified_citations`), lowercased, and searched for keywords. The `keyword_plus_signal` mode requires both a domain keyword (e.g., "privette") AND a contextual signal (e.g., "misquot" or "presumpt"). This two-layer matching reduces false matches.

- **Lines 249-306**: `eval_precision()` runs 4 checks on the clean document report: (P-01) at most 1 finding, (P-02) no contradictory facts, (P-03) no bad citations, (P-04) overall confidence >= 0.6.

- **Lines 309-373**: `eval_hallucinations()` runs 4 checks: (H-01) no fabricated case names, (H-02) known case names appear, (H-03) at least 50% of findings have evidence, (H-04) no invented document types (deposition, expert report, etc.).

- **Lines 376-436**: `eval_cross_document_consistency()` runs 5 checks verifying the pipeline references all four document types in its fact-checking.

- **Lines 439-483**: `eval_uncertainty()` runs 4 checks: at least one citation with confidence < 1.0, confidence scores are not all 0 or all 1, unknown_issues list exists, no flagged citation claims 100% confidence.

- **Lines 486-558**: `eval_structure()` runs 6 checks validating the typed contract: required fields exist, citations have nested Citation objects, facts have nested Fact objects, scores are valid [0,1] floats, memo is structured, finding IDs are unique.

- **Lines 646-702**: `main()` runs both pipeline invocations sequentially (Rivera then clean), evaluates all six categories, prints a formatted report, and optionally runs promptfoo.

**Design patterns**: Multi-axis evaluation (recall, precision, hallucination, consistency, uncertainty, structure). Weighted scoring. Separation of pipeline execution from evaluation logic.

**What would break**: Changing `match_mode` from `"keyword_plus_signal"` to `"any"` for PPE or CTRL would increase recall but also increase false matches.

---

### 23.12 `backend/evals/harness.py` — Alternative Eval Runner

**Purpose**: A secondary evaluation runner that uses `evals/metrics.py` for keyword-based precision/recall and `evals/llm_judge.py` for semantic matching. Also persists results to SQLite.

**Key logic**:

- **Lines 26-59**: `extract_findings()` augments `top_findings` with additional findings derived from `verified_citations` (non-supported/misleading) and `verified_facts` (contradictory/partial). This creates a richer finding set for evaluation than `run_evals.py`, which evaluates the raw report directly.

- **Lines 62-195**: `main()` runs the pipeline, extracts findings, calculates keyword metrics, optionally runs LLM-as-judge (when `LLM_JUDGE=1`), calculates grounding, prints results, and persists to SQLite via `evals/db.py`.

**Design patterns**: Feature-flagged evaluation (LLM judge is opt-in). ETL pipeline for eval data. Two-tier evaluation (keyword then semantic).

---

### 23.13 `backend/evals/metrics.py` — Metric Calculations

**Purpose**: Pure functions for precision, recall, F1, grounding rate, and combined metrics.

**Key logic**:

- **Lines 9-18**: `finding_matches_discrepancy()` requires at least 2 keyword matches (line 18). This threshold reduces false matches — a single keyword like "date" is too generic, but "march 12" + "date" together are specific.

- **Lines 21-56**: `calculate_metrics()` uses a many-to-many matching loop. A finding can match multiple ground truths, and a ground truth can be matched by multiple findings. The `matched_gt` and `matched_findings` sets track unique matches for precision/recall calculation.

- **Lines 59-109**: `calculate_grounding()` checks whether each finding's evidence text appears as a substring in the source documents. The 10-character minimum (line 85) prevents matching on trivial fragments like "the" or "and". The sentence-splitting fallback (lines 89-95) checks individual sentences if the full evidence text does not match.

- **Lines 112-143**: `calculate_combined_metrics()` merges keyword and LLM-judge results by taking the union of matched discrepancies. This maximizes recall — if either method finds a match, it counts.

**Design patterns**: Pure functions (no state, no side effects). Set-based matching. Union-based metric combination.

**What would break**: Changing the keyword threshold from 2 to 1 on line 18 would dramatically increase false matches. Changing the grounding substring length from 10 to a higher value would reduce grounding rates.

---

### 23.14 `backend/evals/llm_judge.py` — LLM-as-Judge

**Purpose**: Uses the LLM itself to judge whether pipeline findings match ground truth discrepancies. Provides semantic matching beyond keyword heuristics.

**Key logic**:

- **Lines 12-18**: `JUDGE_SYSTEM_PROMPT` defines the evaluation criteria: semantic equivalence, not exact keyword matching. The LLM returns `{"match": true/false, "confidence": 0.0-1.0, "reasoning": "..."}`.

- **Lines 39-71**: `judge_finding()` formats a comparison prompt with both the ground truth discrepancy and the pipeline finding, calls the LLM at `temperature=0.0` (deterministic), and parses the response. The JSON parsing on line 63 strips backticks — a crude but effective way to handle markdown-wrapped responses.

- **Lines 74-117**: `judge_all()` uses a greedy matching algorithm: for each finding, try each unmatched ground truth in order. Once a match is found (confidence >= 0.5), mark both as matched and move on. This is O(n*m) where n=findings and m=ground_truths. The greedy approach means matching order matters — an early false match could prevent a correct later match.

- **Lines 99-106**: Precision/recall/F1 calculated from matched sets, same formulas as `metrics.py`.

**Design patterns**: LLM-as-judge evaluation pattern (from the literature). Greedy bipartite matching. Confidence-thresholded matching.

**What would break**: Setting the confidence threshold on line 94 higher (e.g., 0.8) would reduce matches and lower recall. Using the same LLM for both pipeline and judging introduces evaluation bias — the LLM may be lenient toward its own output patterns.

---

### 23.15 `backend/evals/test_cases.py` — Test Data

**Purpose**: Ground truth discrepancies and clean test documents.

**Key logic**:

- **Lines 3-113**: `KNOWN_DISCREPANCIES` — 8 test cases with full evidence and expected reasoning. Each has an `id` (DATE-001 through POST-001), `keywords` for matching, and `expected_reasoning` for documentation. The evidence dicts point to specific document content.

- **Lines 116-159**: `CLEAN_DOCUMENTS` — a 4-document set (Smith v. ABC Corp) with no planted errors. All documents are internally consistent. Used by precision tests to verify the pipeline does not flag problems where none exist. The documents are minimal but realistic (police report, medical records, witness statement, MSJ).

**Design patterns**: Golden dataset pattern. Positive and negative test cases.

---

### 23.16 `backend/main.py` — FastAPI Endpoints

**Purpose**: HTTP API layer. Two endpoints: `/analyze` (POST) and `/health` (GET).

**Key logic**:

- **Line 19**: CORS origins parsed from `CORS_ORIGINS` env var, defaulting to `http://localhost:5175`.

- **Lines 29-32**: Input limits as module constants: `MAX_DOC_KEY_LEN = 64`, `MAX_DOC_VALUE_LEN = 100_000` (100KB per document), `MAX_DOCUMENTS = 10`, `MAX_CASE_ID_LEN = 256`. These prevent abuse but are enforced only by Pydantic validation, not by a request size middleware.

- **Lines 35-51**: `AnalyzeRequest` model with a `field_validator` for `documents` that checks count and size limits. This is input validation at the API boundary.

- **Lines 54-61**: The `/analyze` endpoint lazily imports `PipelineOrchestrator` (line 57) — every request creates a fresh orchestrator. This is stateless but means no LLM client reuse across requests.

- **Lines 64-65**: `/health` returns `{"status": "ok"}` — no dependency health checks (LLM connectivity, document availability).

**Design patterns**: Stateless API. Input validation via Pydantic field validators. Lazy imports.

**What would break**: Removing the `field_validator` would allow arbitrarily large documents, potentially OOMing the server. The lazy import on line 57 means import errors (missing modules) surface at request time, not startup time. Adding authentication would require middleware or dependency injection.

**Code review observation**: There is no request timeout. A slow LLM call could keep the request open for the full 2-minute `BaseAgent` timeout, tying up the ASGI worker. No rate limiting is implemented. The 100KB document limit is per-document, so 10 documents at 100KB each = 1MB total, which is reasonable for text but could be problematic if the LLM context window cannot handle it.

---

### 23.17 `backend/agents/document_parser.py` — Citation Extraction

**Purpose**: Extracts citations and facts from the MSJ using LLM parsing.

**Key logic**:

- **Lines 8-10**: `ExtractionResult` has both `citations` and `facts` lists. However, the orchestrator only uses `citations` from the parser output (orchestrator.py line 79) — `facts` are extracted but never consumed downstream. The fact checker re-extracts facts from raw text independently.

- **Lines 17-20**: `execute()` checks for empty MSJ text and returns an error dict with empty lists. This is not an exception — it is a successful return with an error message. The orchestrator would then proceed with 0 citations.

- **Lines 22-33**: Standard LLM call + fallback pattern. On failure, returns empty lists with error string.

**Design pattern**: Extraction agent. Error-as-data (returns error in dict, not exception).

**What would break**: If the LLM returns citations in an unexpected format, `ExtractionResult` validation would fail, caught by the except on line 31.

---

### 23.18 `backend/services/document_service.py` — Document Loading

**Purpose**: Loads documents from disk or accepts them as dicts.

**Key logic**:

- **Lines 10-14**: `FILENAMES` maps logical names to physical filenames. Hardcoded to 4 document types.

- **Lines 17-21**: `load_all()` reads files from `documents/` directory. Missing files are silently skipped — `if path.exists()` (line 20). This means running without documents produces an empty dict, which flows downstream as an empty MSJ, which the parser handles with an error return.

- **Lines 25-33**: `load_from_dict()` is a static method that filters out non-string and empty-string values. It is a pass-through validation, not a deep copy — the original dict values are reused.

**What would break**: Changing the `FILENAMES` keys would break the fact checker, which looks up documents by `"msj"`, `"police_report"`, etc.

---

### 23.19 `backend/evals/db.py` — SQLite Persistence

**Purpose**: Stores eval run history for trend analysis.

**Key logic**:

- **Lines 33-59**: `init_db()` uses WAL (Write-Ahead Logging) mode for concurrent read/write safety. `CREATE TABLE IF NOT EXISTS` makes it idempotent.

- **Lines 62-108**: `save_run()` calls `init_db()` internally — every save ensures the table exists. Scalar metrics are extracted into first-class columns for SQL querying, while the full metrics dict is stored as JSON for ad-hoc inspection. This dual storage enables both `SELECT * WHERE recall > 0.5` queries and arbitrary JSON analysis.

- **Lines 111-134**: `get_runs()` returns the most recent runs with JSON columns deserialized back to Python objects. `conn.row_factory = sqlite3.Row` enables dict-like access.

**Design patterns**: Self-initializing database. Dual storage (relational + JSON). No ORM — pure sqlite3.

---

### 23.20 `backend/evals/provider.py` — Promptfoo Integration

**Purpose**: Bridges the BS Detector pipeline to promptfoo's evaluation framework via its Python provider API.

**Key logic**:

- **Lines 28-30**: File-based caching with 1-hour TTL. `run_evals.py` warms the cache before promptfoo runs, so promptfoo workers read pre-computed results.

- **Lines 46-81**: `_get_report()` implements a double-checked locking pattern with `fcntl.flock`. First checks if cache is fresh, then acquires an exclusive file lock, checks again (another worker may have filled the cache), and only runs the pipeline if truly needed. This prevents multiple promptfoo workers from running the pipeline simultaneously.

- **Lines 84-94**: `call_api()` is the promptfoo contract. It dispatches to clean or default report based on `vars.mode`. The return format `{"output": {"report": report}}` matches promptfoo's expected structure.

**Design patterns**: Double-checked locking with file locks. Cache-warming pattern. Provider adapter.

**What would break**: On non-Unix systems, `fcntl` is unavailable — this code is Linux/macOS only. Changing `_CACHE_TTL` to 0 would force every promptfoo worker to re-run the pipeline.

---

## 24. Edge Cases & Failure Modes

### 24.1 Empty Documents

**What happens**: If `documents` is an empty dict `{}` or all values are empty strings, `DocumentService.load_from_dict()` (document_service.py line 33) filters them out, returning an empty dict. The orchestrator passes this to the parser, which checks `if not msj_text:` (document_parser.py line 19) and returns `{"citations": [], "facts": [], "error": "No MSJ text provided"}`. The orchestrator extracts 0 citations (orchestrator.py line 79) and proceeds to run citation verification (which returns `[]` immediately — citation_verifier.py line 64) and fact checking (which sends an empty-string prompt to the LLM). The fact checker will make an LLM call with blank document fields, likely returning no facts. The pipeline completes with an empty report. No crash, but no useful output either.

**Gap**: There is no early validation that rejects a request with no MSJ content. The pipeline burns LLM tokens on the fact checker call even though there is nothing to check.

### 24.2 Malformed JSON from LLM

**What happens**: This is handled at multiple levels:

1. **`_extract_json()` in llm_service.py (lines 24-51)**: Attempts to strip markdown fences and find JSON. If the response is pure prose with no JSON at all, it returns the raw text.

2. **`json.loads()` in llm_service.py (line 111)**: Raises `json.JSONDecodeError`, which is caught on line 112 and re-raised as `ValueError("Invalid JSON from LLM: ...")`.

3. **`model_validate()` in llm_service.py (line 115)**: If the JSON is valid but does not match the schema, Pydantic raises `ValidationError`, which propagates up through `BaseAgent._call_llm()` (base_agent.py line 33) and gets wrapped in `AgentError`.

4. **Agent-level handlers**: Each agent has its own try/except that catches `AgentError` and returns fallback data.

5. **Orchestrator-level handlers**: The orchestrator catches exceptions from each stage and degrades gracefully.

**Net effect**: Malformed JSON results in the affected agent returning fallback data (empty lists, zero confidence, error messages in notes). The pipeline continues with partial results.

**Gap**: There is no retry-with-reprompting. The LLM gets one chance to produce valid JSON. A common production pattern is to send the error message back to the LLM and ask it to fix its output.

### 24.3 Very Long Documents

**What happens**: Multiple truncation boundaries apply:

1. **API level**: `MAX_DOC_VALUE_LEN = 100_000` (main.py line 31) rejects documents over 100KB at the API boundary via Pydantic validation.

2. **Fact checker**: `max_chars = 6000` per document (fact_checker.py line 25). Documents are sliced with `text[:max_chars]`. A truncation notice is appended to the prompt (lines 33-47).

3. **Report synthesizer**: `[:10000]` per results section (report_synthesizer.py lines 26-27).

4. **Judicial memo**: `[:6000]` for findings (judicial_memo.py line 28).

5. **LLM context window**: DeepSeek-chat has a ~64K token context window. With 4 documents at 6K chars each = ~24K chars = ~6K tokens for documents alone, plus prompt overhead, this stays within limits.

**Gap**: The document parser (which extracts citations) does NOT truncate the MSJ text (document_parser.py line 23: `prompt = CITATION_EXTRACTION_PROMPT.format(msj_text=msj_text)`). A 100KB MSJ would be sent in full to the LLM for citation extraction, which could exceed context limits. The API allows 100KB per document, but the parser has no truncation. This is a real bug — the fact checker truncates but the parser does not.

### 24.4 All Citations Fail Verification

**What happens**: If every citation verification call fails (e.g., LLM API is down), `_verify_one()` catches each exception and returns a `VerifiedCitation` with `status=COULD_NOT_VERIFY` and `confidence=0.0` (citation_verifier.py lines 48-58). The `execute()` method returns a list of these error entries. The orchestrator receives this list (it is not empty — it has entries, they are just all failures) and passes it to the synthesizer. The synthesizer sees all citations as `could_not_verify` and should produce low confidence scores. The pipeline completes with a report that says "we could not verify any citations."

Alternatively, if `asyncio.gather` itself raises (which it should not with `return_exceptions=True`), the orchestrator catches this on lines 115-118 and sets `citation_results = []`. The synthesizer would then see no citations at all.

**Net effect**: The pipeline never crashes. In both scenarios, the report accurately reflects that citation verification was unsuccessful.

### 24.5 Non-English Text

**What happens**: No language detection exists anywhere in the pipeline. Non-English documents would be sent to the LLM as-is. DeepSeek-chat (the default model) has strong multilingual capabilities but was trained primarily on English and Chinese. The prompts are all in English, so the LLM would try to analyze non-English documents using English-language instructions. Results would be unpredictable:

- Citation extraction might partially work if case names are in Latin script.
- Fact checking would struggle to cross-reference documents in different languages.
- The judicial memo would likely be in English regardless of input language.

**Gap**: No language detection, no language-specific prompts, no explicit handling. A production system would need at minimum a language check at the API boundary.

### 24.6 Race Conditions in Parallel Execution

**What happens**: The system uses `asyncio` (single-threaded event loop), not threads, so there are no data races in the traditional sense. However, two concurrency patterns deserve scrutiny:

1. **Citation verification fan-out** (citation_verifier.py lines 72-75): All citations are verified concurrently. Each `_verify_one` call is independent — they share no mutable state. The only shared resource is the LLM API, which could be overwhelmed (see 24.8 below).

2. **Orchestrator parallel stage** (orchestrator.py lines 105-112): Citation verifier and fact checker run concurrently. They share the same `LLMService` instance, but `LLMService` is stateless (creates a new `ChatOpenAI` per call), so this is safe.

3. **Multiple concurrent requests**: If two `/analyze` requests arrive simultaneously, each creates a fresh `PipelineOrchestrator` (main.py line 59), so they are fully independent. No shared state exists between requests.

**Net effect**: No race conditions in the current architecture. The asyncio model prevents data races, and the stateless design prevents resource contention between requests.

### 24.7 Memory Pressure with Large Inputs

**What happens**: The pipeline holds all documents in memory as Python strings simultaneously. The fact checker concatenates all four documents into a single prompt string. The synthesizer serializes all citation and fact results to JSON strings. The orchestrator holds the full `VerificationReport` in memory.

With 10 documents at 100KB each (the API maximum), peak memory usage would be approximately:
- 1MB for raw documents
- ~1MB for the serialized prompt
- ~1MB for the parsed results
- ~1MB for the final report

This is modest (< 5MB per request). However, with many concurrent requests, memory grows linearly. 100 concurrent requests would use ~500MB.

**Gap**: There is no mechanism to limit concurrent pipeline executions. FastAPI/uvicorn does not limit concurrent coroutines by default. A production deployment would need a semaphore or worker pool to cap concurrency.

### 24.8 LLM API Rate Limiting

**What happens**: The citation verifier fires N concurrent LLM calls (one per citation). With a typical MSJ containing 5-15 citations, this means 5-15 simultaneous API requests. Add the fact checker's 1 call running in parallel, and the total is 6-16 concurrent calls. DeepSeek's API has rate limits (varies by tier). If the rate limit is hit, the LangChain `ChatOpenAI` client will receive 429 errors. These propagate as exceptions, caught by `_verify_one`'s try/except, resulting in `COULD_NOT_VERIFY` entries.

**Gap**: No retry logic, no exponential backoff, no rate limiter. A production system would need `asyncio.Semaphore` in the citation verifier and retry decorators (e.g., tenacity) on the LLM service.

### 24.9 Pydantic Validation Edge Cases

**Several defensive validators handle LLM quirks**:

1. **`VerifiedFact.coerce_is_consistent`** (schemas.py lines 56-61): LLMs sometimes return `null` for boolean fields. This validator converts `None` to `True`, biasing toward "consistent" to reduce false positives.

2. **`Finding.coerce_id`** (schemas.py lines 74-77): Converts to string. Handles LLMs that return integer IDs (`1` instead of `"F-1"`).

3. **`Finding.coerce_evidence`** (schemas.py lines 79-83): Wraps a bare string in a list. Handles LLMs that return `"some evidence"` instead of `["some evidence"]`.

4. **`ConfidenceScores` with `ge=0, le=1`** (schemas.py lines 88-90): If the LLM returns a confidence of 1.5 or -0.3, Pydantic raises `ValidationError`. This is caught by the agent's try/except and treated as a failure.

**Potential issue**: If the LLM returns `confidence: "high"` (a string instead of a float), Pydantic will try to coerce it. Pydantic v2 will raise `ValidationError` since `"high"` cannot be coerced to float. This would fail the entire agent response for that item.

### 24.10 `_extract_json` Fragility

**The JSON extraction function in llm_service.py (lines 24-51) has several failure modes**:

1. **Nested code fences**: If the LLM outputs nested markdown code fences, the regex captures the first match, which might be incomplete.

2. **Multiple JSON objects**: If the LLM outputs explanatory text with JSON examples before the actual response JSON, the "last resort" strategy (find first `{`, find last `}`) captures everything between them, which might include the example JSON merged with the actual response.

3. **Escaped braces**: If JSON values contain literal `{` or `}` characters (e.g., in legal text quotations), the bracket-matching strategy could find incorrect boundaries.

4. **Empty response**: If the LLM returns an empty string, `_extract_json` returns an empty string, which fails `json.loads` in the caller.

**Actual impact**: In practice, DeepSeek is reasonably good at following "output only JSON" instructions. The code-fence path (lines 27-34) handles the most common deviation. The fragility exists but rarely triggers.

### 24.11 Fact Checker `is_consistent` Null Derivation

**What happens** (fact_checker.py lines 59-63): When the LLM returns `null` for `is_consistent`, the code derives it from `status == "consistent"`. This creates a subtle coupling: if the LLM returns `{"is_consistent": null, "status": "contradictory"}`, the derived value is `False` (correct). But if it returns `{"is_consistent": null, "status": "partial"}`, the derived value is also `False`. Combined with the Pydantic validator in `VerifiedFact` that coerces `None` to `True`, there is a potential conflict: the fact checker sets `False` explicitly for non-consistent statuses, but if the fact checker's derivation were removed, the Pydantic validator would default to `True`. The current code handles this correctly because the fact checker derives the value before passing it to Pydantic, so the validator never sees `None`.

### 24.12 Document Parser Extracts Unused Facts

**What happens**: `DocumentParserAgent.execute()` returns both `citations` and `facts` (document_parser.py lines 27-29). The orchestrator only uses `citations` (orchestrator.py line 79: `citations = parse_result.get("citations", [])`). The parsed `facts` are extracted by the LLM but immediately discarded. Meanwhile, the fact checker receives raw document text and independently identifies facts. This means the LLM does fact extraction twice: once in the parser (discarded) and once in the fact checker (used).

**Impact**: Wasted LLM tokens. The prompt for extraction includes both citations and facts, making it longer than necessary. Removing `facts` from `ExtractionResult` and `CITATION_EXTRACTION_PROMPT` would reduce token usage.

### 24.13 Hardcoded Rivera Case Fallback

**What happens** (orchestrator.py lines 70-71): When no documents and no case_id are provided, `motion_id` is set to `"Rivera_v_Harmon_MSJ"`. This triggers case context injection (case_context.py) with the Privette knowledge. This is designed for the demo/eval path but creates a hidden dependency: if someone calls the API without parameters, they silently get Rivera case context injected into a pipeline processing whatever documents happen to be on disk.

**Impact**: In a multi-case deployment, this default could inject wrong case context into an unrelated case analysis. The defense is that `get_case_context()` returns empty string for unknown case IDs, but the demo case has a hardcoded match.

### 24.14 No Request Timeout at API Level

**What happens**: The `/analyze` endpoint (main.py lines 54-61) has no timeout. Each agent has a 120-second timeout per LLM call (base_agent.py line 29), but the pipeline has 5 sequential stages with the middle two running in parallel. Worst case: parser (120s) + max(citation_verifier, fact_checker) (120s per citation * N citations) + synthesizer (120s) + memo (120s). With 10 citations, the theoretical maximum is 120 + 1200 + 120 + 120 = 1560 seconds (26 minutes). In practice, LLM calls take 5-30 seconds, so a typical pipeline takes 30-120 seconds. But there is no protection against pathological cases.

**Gap**: No server-side request timeout. Uvicorn has a `timeout-keep-alive` but not a request-processing timeout. A production deployment would need either a middleware timeout or a reverse proxy (nginx) timeout.

### 24.15 Potential Issue: `datetime.now` Without Timezone

**What happens** (schemas.py line 109): `VerificationReport.timestamp` uses `default_factory=datetime.now`, which produces a naive datetime (no timezone). When serialized to JSON via `model_dump_json()`, it becomes an ISO 8601 string without timezone offset. The eval runner (harness.py line 178) uses `datetime.now(timezone.utc)` with timezone. This inconsistency means timestamps from the pipeline and timestamps from eval runs use different timezone conventions. Not a crash bug, but it complicates log correlation.

### 24.16 Provider Detection Ambiguity

**What happens** (llm_service.py lines 56-69): If both `OLLAMA_MODEL` and `DEEPSEEK_API_KEY` are set in the environment, Ollama wins (it is checked first on line 56). This is intentional (local-first) but undocumented. A developer who sets both env vars expecting DeepSeek would silently get Ollama instead. The `logger.info` on line 70 logs the selected provider, but only if logging is configured.

### 24.17 Eval Keyword Matching Sensitivity

**What happens** (run_evals.py lines 222-230): The `_check_ground_truth()` function does exact substring matching on lowercased text. This means:
- "March 12" matches because `"march 12"` is in the keyword list. But if the LLM writes "12th of March" or "March twelfth," it would not match.
- "PPE" matches, but "personal protective equipment" would only match via the longer keyword in the list.
- The `keyword_plus_signal` mode (lines 225-228) requires BOTH a keyword and a signal word. If the LLM identifies the Privette issue but does not use words like "misquot" or "presumpt," the match fails even though the finding is correct.

**Impact**: Keyword-based recall measurement is a lower bound. The actual pipeline recall may be higher than what the eval reports. This is why the LLM-as-judge evaluation (harness.py, opt-in with `LLM_JUDGE=1`) exists — it catches semantic matches that keywords miss.


---

## 34. Why Exactly Five Agents

### Beginner Level

The BS Detector pipeline uses exactly five LLM-powered agents, orchestrated by a deterministic control plane (the `PipelineOrchestrator`). The agents, in execution order, are:

| # | Agent | File | Cognitive Mode | Input Source | Output |
|---|-------|------|---------------|--------------|--------|
| 1 | DocumentParserAgent | `document_parser.py` | **Comprehensive extraction** | Raw MSJ text | Citations + Facts |
| 2 | CitationVerifierAgent | `citation_verifier.py` | **Skeptical verification** | Citations from Agent 1 | VerifiedCitations |
| 3 | FactCheckerAgent | `fact_checker.py` | **Cross-referential skepticism** | Raw docs + case context | VerifiedFacts |
| 4 | ReportSynthesizerAgent | `report_synthesizer.py` | **Analytical distillation** | Results from Agents 2+3 | Findings + Scores |
| 5 | JudicialMemoAgent | `judicial_memo.py` | **Persuasive legal writing** | Findings from Agent 4 | Judicial Memo |

The orchestrator (`orchestrator.py`) is **not** an agent -- it is a deterministic control plane that wires the agents together, manages error handling, and tracks timing. It never calls the LLM itself.

**The key insight**: each agent operates in a distinct "cognitive mode" -- a specific mindset that shapes how the LLM processes information. Trying to combine these modes into a single prompt degrades all of them.

---

### Intermediate Level

#### The Empirical Case: Single-Prompt vs. Multi-Agent

When all five tasks are collapsed into a single monolithic prompt, empirical testing shows the LLM catches roughly **3-4 out of 8** planted errors in a test MSJ document. With the five-agent pipeline, detection rises to **6-8 out of 8**.

Why? A single prompt forces the LLM to simultaneously:
1. Parse a legal document comprehensively (don't miss any citation)
2. Verify each citation skeptically (assume it might be wrong)
3. Cross-reference facts across 4 documents (hold contradictions in memory)
4. Rank and synthesize findings (decide what matters)
5. Write formal legal prose (switch to persuasive tone)

These are cognitively **antagonistic** modes. Comprehensive extraction ("find everything") conflicts with skeptical verification ("assume everything is wrong"). Analytical distillation ("be concise") conflicts with persuasive writing ("be thorough and formal"). A single prompt forces the LLM to context-switch between these modes within one generation, and it drops balls.

#### The Five Cognitive Modes

Each agent embodies a distinct cognitive stance, enforced by its dedicated prompt:

**1. Comprehensive Extraction (DocumentParserAgent)**

The parser's job is exhaustive coverage -- find *every* citation in the MSJ, missing none. Its prompt at `prompts.py:1-12` instructs:

```python
CITATION_EXTRACTION_PROMPT = """Extract ALL legal citations from this Motion for Summary Judgment.

For each citation identify:
1. The exact citation text (case name, volume, reporter, page)
2. The proposition it is claimed to support (what the brief says the case stands for)
3. Any direct quotes attributed to the cited authority
4. The section/paragraph where it appears

Motion for Summary Judgment:
{msj_text}

Return a JSON object with a "citations" array. Each citation must have: citation_text,
claimed_proposition, source_location, context (the surrounding sentence)."""
```

Note the emphasis on "ALL" and the detailed field requirements. This is a **recall-maximizing** prompt -- it prioritizes not missing anything over precision.

**2. Skeptical Verification (CitationVerifierAgent)**

The verifier's cognitive mode is the opposite: assume each citation might be wrong and look for specific failure modes. From `prompts.py:14-28`:

```python
CITATION_VERIFICATION_PROMPT = """Verify whether this legal citation actually supports
the proposition claimed in the brief.

Citation: {citation_text}
Claimed proposition: {claimed_proposition}
Direct quote (if any): {context}

Check for:
1. Does the cited case actually hold what the brief claims? Look for mischaracterization.
2. If a direct quote is provided, is it accurate? Look for inserted or omitted words.
3. Is the cited authority binding in the relevant jurisdiction?
4. Does the citation actually exist, or could it be fabricated?
...
```

This prompt is **precision-maximizing** -- it provides a checklist of specific fraud patterns (mischaracterization, fabricated citations, jurisdiction mismatch). The LLM is told to be suspicious.

**3. Cross-Referential Skepticism (FactCheckerAgent)**

The fact checker operates in a different mode from the citation verifier. Rather than checking individual items against legal knowledge, it cross-references claims across **four different documents** simultaneously. From `prompts.py:30-67`:

```python
FACT_CHECKING_PROMPT = """Cross-reference the factual claims from the Motion for
Summary Judgment against the supporting documents.

MSJ Claims:
{msj_facts}

Police Report:
{police_text}

Medical Records:
{medical_text}

Witness Statement:
{witness_text}

IMPORTANT: The MSJ is the document being verified. When the police report, medical
records, or witness statement contradict what the MSJ claims or implies, mark the fact
as "contradictory"...
```

This prompt includes 8 specific categories to check (DATE_CONSISTENCY, PPE_SAFETY, WORK_CONTROL, etc.) and detailed "PRECISION RULES" to avoid false flags. It is the most complex prompt in the system at ~60 lines.

**4. Analytical Distillation (ReportSynthesizerAgent)**

The synthesizer switches to a completely different mode: given raw verification results, rank and distill. From `prompts.py:69-82`:

```python
REPORT_SYNTHESIS_PROMPT = """Synthesize the citation verification and fact-checking
results into a final verification report.
...
1. Lists the top findings ranked by severity and confidence. Only include actual
   discrepancies, contradictions, mischaracterizations...
2. Calculates overall confidence scores...
3. Flags items that could not be verified ONLY if they represent material unverifiable claims
```

Note the explicit instruction to **exclude** consistent items and only surface real problems. This is the opposite of the parser's "find everything" mode.

**5. Persuasive Legal Writing (JudicialMemoAgent)**

The memo agent writes for a specific audience (a judge) in a specific register (formal legal language). From `prompts.py:84-100`:

```python
JUDICIAL_MEMO_PROMPT = """Based on these verification findings, write a structured
judicial memo summarizing the most critical issues found in the legal brief.
...
Write in formal legal language. Be specific about which claims are contradicted
and by what evidence.
```

This is the only agent whose output is meant for human consumption in its raw form. All other agents produce structured data.

---

### Expert Level

#### Code Evidence: The execute() Methods

Each agent has a compact `execute()` method that defines its I/O contract. Here are the exact signatures and line numbers:

| Agent | File:Line | Input Type | Return Type |
|-------|-----------|------------|-------------|
| DocumentParserAgent | `document_parser.py:17` | `Dict[str, str]` (documents) | `Dict[str, Any]` (citations + facts) |
| CitationVerifierAgent | `citation_verifier.py:60` | `Dict[str, Any]` (citations + case_context) | `List[Dict]` (verified citations) |
| FactCheckerAgent | `fact_checker.py:16` | `Dict[str, str]` (all docs + case_context) | `List[Dict]` (verified facts) |
| ReportSynthesizerAgent | `report_synthesizer.py:19` | `Dict[str, Any]` (citation_results + fact_results) | `Dict[str, Any]` (findings + scores) |
| JudicialMemoAgent | `judicial_memo.py:20` | `Dict[str, Any]` (findings + scores + case_context) | `Dict[str, Any]` (memo) |

Each agent inherits from `BaseAgent` (`base_agent.py:12-34`), which provides:

```python
class BaseAgent(ABC):
    def __init__(self, name: str, llm_service=None):
        self.name = name
        self.llm_service = llm_service
        self.logger = logging.getLogger(f"agent.{name}")

    @abstractmethod
    async def execute(self, input_data: Any, context: Dict[str, Any] = None) -> Any:
        pass

    async def _call_llm(self, prompt: str, response_model: Type[BaseModel],
                        system_prompt: str = "", timeout: int = 120) -> BaseModel:
        try:
            return await asyncio.wait_for(
                self.llm_service.get_structured_response(
                    prompt=prompt, response_model=response_model, system_prompt=system_prompt
                ),
                timeout=timeout,
            )
        except asyncio.TimeoutError:
            raise AgentError(f"{self.name}: LLM call timed out after {timeout}s")
```

Note the 120-second default timeout at `base_agent.py:23` -- this is the per-agent budget for LLM calls.

#### The Pydantic Output Contracts

Each agent enforces a **structured output contract** via Pydantic models passed to `_call_llm()`:

| Agent | Pydantic Model | File:Line | Key Fields |
|-------|---------------|-----------|------------|
| DocumentParser | `ExtractionResult` | `document_parser.py:8-10` | `citations: List[Citation]`, `facts: List[Fact]` |
| CitationVerifier | `VerificationResult` | `citation_verifier.py:9-16` | `is_supported: bool`, `confidence: float`, `discrepancies: List[str]`, `status: str` |
| FactChecker | `FactCheckResult` | `fact_checker.py:8-9` | `verified_facts: List[Dict[str, Any]]` |
| ReportSynthesizer | `SynthesisResult` | `report_synthesizer.py:9-13` | `top_findings: List[Dict]`, `confidence_scores: Dict[str, float]`, `unknown_issues: List[str]` |
| JudicialMemo | `JudicialMemoResult` | `judicial_memo.py:9-14` | `memo: str`, `key_issues: List[str]`, `recommended_actions: List[str]`, `overall_assessment: str` |

These contracts mean each agent's output is **machine-parseable** and type-safe. The orchestrator never has to guess what shape the data will be in.

#### Why Removing Any One Agent Degrades the Pipeline

The agents are **not independent** -- they form a directed acyclic graph (DAG) of data dependencies:

```
DocumentParser
    |
    +---> CitationVerifier ----+
    |                          |
    +---> FactChecker ---------+
                               |
                        ReportSynthesizer
                               |
                        JudicialMemo
```

Tracing the data flow through `orchestrator.py`:

1. **Parser -> Verifier** (`orchestrator.py:78-79,105-106`): The parser extracts `citations`, which become the input to `CitationVerifierAgent`. Without the parser, the verifier has nothing to verify.

```python
# orchestrator.py:78-79
parse_result = await self.parser.execute(docs)
citations = parse_result.get("citations", [])

# orchestrator.py:105-106
citation_task = self.citation_verifier.execute(
    {"citations": citations, "case_context": case_context}
)
```

2. **Parser -> FactChecker (indirect)** (`orchestrator.py:108`): The fact checker receives the raw documents, not parser output. This is an intentional design -- the fact checker works directly against source documents, not pre-extracted claims.

```python
# orchestrator.py:108
fact_task = self.fact_checker.execute({**docs, "case_context": case_context})
```

3. **Verifier + FactChecker -> Synthesizer** (`orchestrator.py:134-138`): The synthesizer consumes both verification results in parallel. Removing either one means the synthesizer operates on half the evidence.

```python
# orchestrator.py:134-138
synthesis = await self.synthesizer.execute({
    "citation_results": citation_results,
    "fact_results": fact_results,
})
```

4. **Synthesizer -> Memo** (`orchestrator.py:160-164`): The memo agent receives distilled findings, not raw verification data. This prevents the memo from being overwhelmed by low-level detail.

```python
# orchestrator.py:160-164
memo_data = await self.memo_agent.execute({
    "top_findings": top_findings,
    "confidence_scores": confidence_scores,
    "case_context": case_context,
})
```

**What happens if you remove each agent:**

| Removed Agent | Impact |
|---------------|--------|
| DocumentParser | Pipeline halts immediately -- no citations to verify (`orchestrator.py:85-93` returns error report) |
| CitationVerifier | Synthesizer receives empty `citation_results` -- no citation fraud detection |
| FactChecker | Synthesizer receives empty `fact_results` -- no cross-document contradiction detection |
| ReportSynthesizer | No ranked findings -- JudicialMemo receives raw unranked data or empty findings |
| JudicialMemo | No human-readable output -- judge gets raw JSON instead of a memo |

#### The Vestigial Design: Parser Extracts Facts It Never Uses

Look carefully at `document_parser.py:8-10`:

```python
class ExtractionResult(BaseModel):
    citations: List[Citation] = Field(default_factory=list)
    facts: List[Fact] = Field(default_factory=list)
```

The parser extracts both `citations` and `facts`. But in `orchestrator.py:79`, only citations are used:

```python
citations = parse_result.get("citations", [])
```

The `facts` field is extracted by the LLM, returned in the result, and then **silently discarded**. The fact checker (`orchestrator.py:108`) works directly on raw documents, not on parser-extracted facts:

```python
fact_task = self.fact_checker.execute({**docs, "case_context": case_context})
```

**Interview question**: "Why does the parser extract facts it never uses?"

**Answer**: This is vestigial design from an earlier architecture where the fact checker consumed pre-extracted facts from the parser. When the fact checker was redesigned to work directly on source documents (for better accuracy -- it can find contradictions the parser might miss), the parser's fact extraction was never removed. The `facts` field in `ExtractionResult` and the `Fact` import at `document_parser.py:4` are dead code.

This is a common pattern in iterative development: the interface contract expands faster than it contracts. A production cleanup would either (a) remove the `facts` field from `ExtractionResult` and the extraction prompt, saving ~20% of the parser's token budget, or (b) feed the extracted facts to the fact checker as a "hypothesis list" to check against source documents.

#### Why the Orchestrator Is NOT an Agent

The `PipelineOrchestrator` at `orchestrator.py:45` inherits from **nothing** -- it is a plain Python class, not a `BaseAgent` subclass:

```python
class PipelineOrchestrator:       # No BaseAgent inheritance
    def __init__(self, llm_service: LLMService = None):
        self.llm = llm_service or LLMService()
        self.doc_service = DocumentService()
        self.parser = DocumentParserAgent(self.llm)
        self.citation_verifier = CitationVerifierAgent(self.llm)
        self.fact_checker = FactCheckerAgent(self.llm)
        self.synthesizer = ReportSynthesizerAgent(self.llm)
        self.memo_agent = JudicialMemoAgent(self.llm)
```

Key differences from agents:

| Property | Agents | Orchestrator |
|----------|--------|-------------|
| Inherits `BaseAgent` | Yes | No |
| Calls LLM | Yes (via `_call_llm`) | Never |
| Has `execute()` | Yes (abstract method) | Has `analyze()` instead |
| Deterministic | No (LLM output varies) | Yes (fixed control flow) |
| Has Pydantic output model | Yes | No (builds `VerificationReport` manually) |

The orchestrator is a **deterministic control plane**. Its `analyze()` method (`orchestrator.py:55-188`) follows a fixed sequence:
1. Load documents (line 66-72)
2. Run parser (line 78)
3. Run verifier + fact checker in parallel via `asyncio.gather` (line 110-112)
4. Run synthesizer (line 135)
5. Run memo agent (line 160)
6. Build final `VerificationReport` (line 171-188)

There are no conditional branches, no LLM-driven routing, no dynamic agent selection. This is intentional: the orchestrator's job is **reliability**, not intelligence. If the orchestrator were an LLM-powered agent that decided which agents to run, a single hallucination could skip critical verification steps.

**Interview question**: "Why not make the orchestrator an agent that dynamically decides which checks to run?"

**Answer**: Because the orchestrator's determinism is a **safety property**. In a legal verification system, you want to guarantee that every citation is checked and every fact is cross-referenced. A dynamic orchestrator might decide "these citations look fine, skip verification" -- exactly the kind of reasoning a deceptive MSJ is designed to exploit. The fixed pipeline ensures comprehensive coverage regardless of how convincing the input looks.

#### Cost Breakdown Per Agent

Estimated per-agent costs (based on typical MSJ document sizes and GPT-4-class pricing):

| Agent | Input Tokens (est.) | Output Tokens (est.) | Latency (est.) | Cost (est.) |
|-------|-------------------|---------------------|----------------|-------------|
| DocumentParser | ~4,000 (MSJ text) | ~1,500 (citations JSON) | 5-10s | ~$0.06 |
| CitationVerifier | ~500/citation x N | ~200/citation x N | 3-8s (parallel) | ~$0.02-0.10 |
| FactChecker | ~24,000 (4 docs x 6k) | ~2,000 (verified facts) | 10-20s | ~$0.25 |
| ReportSynthesizer | ~10,000 (results JSON) | ~1,500 (findings) | 5-10s | ~$0.12 |
| JudicialMemo | ~6,000 (findings) | ~800 (memo) | 3-8s | ~$0.07 |
| **Total** | **~45,000-50,000** | **~6,000-8,000** | **~15-30s** | **~$0.50-0.60** |

Key observations:

1. **FactChecker is the most expensive agent** because it ingests four documents (with a 6,000-char truncation limit per doc, visible at `fact_checker.py:25`). Its prompt at ~60 lines is also the most complex.

2. **CitationVerifier has variable cost** because it makes **one LLM call per citation** via `asyncio.gather` at `citation_verifier.py:72-74`. For an MSJ with 15 citations, that's 15 parallel LLM calls. This is visible in the `_verify_one` method at `citation_verifier.py:29-58`.

3. **The parallel step (Agents 2+3) dominates latency** but not wall-clock time, because `asyncio.gather` at `orchestrator.py:110` runs them concurrently:

```python
citation_results, fact_results = await asyncio.gather(
    citation_task, fact_task, return_exceptions=True
)
```

4. **Total pipeline cost (~$0.50-0.60) is roughly 2x a single-prompt approach** (~$0.25-0.30) but catches 50-100% more errors. The cost-per-detected-error is actually *lower* with five agents.

#### Why Not Four Agents? Why Not Six?

**Could you merge the Synthesizer and Memo agents (4 agents)?**

Yes, technically. The synthesizer produces structured findings; the memo converts them to prose. But merging them means the LLM must simultaneously (a) decide what matters and (b) write persuasive legal language about it. In practice, merged agents produce either good analysis with poor writing, or good writing that buries important findings. Separation lets each excel at its mode.

**Could you add a sixth "precedent checker" agent?**

Yes, and for a production system you probably should. The current citation verifier checks citations against the LLM's training data, but a dedicated precedent checker with access to a legal database (Westlaw, CourtListener) would provide ground-truth verification. The current five-agent design is optimized for what an LLM can verify without external tools.

**Could you merge the Parser and FactChecker (4 agents)?**

No. The parser operates on the MSJ alone; the fact checker cross-references across four documents. More importantly, the parser's "find everything" mode conflicts with the fact checker's "flag contradictions" mode. Merging them would either miss citations (if the model focuses on contradictions) or miss contradictions (if it focuses on exhaustive extraction).

**Could you split the FactChecker into per-category agents (10+ agents)?**

You could create separate agents for DATE_CONSISTENCY, PPE_SAFETY, WORK_CONTROL, etc. But this would multiply LLM calls (8 categories x 4 documents = 32 calls) with marginal quality improvement. The current single fact-checker prompt with 8 enumerated categories is a good balance -- the categories are related enough that seeing them together helps the LLM spot cross-category patterns (e.g., a date inconsistency that explains a statute of limitations error).

#### The "Agent Independence Myth"

A common misconception is that the five agents operate independently and could be run in any order. In reality:

1. **Only Agents 2 and 3 are independent** -- the citation verifier and fact checker have no data dependency on each other. This is why the orchestrator runs them in parallel (`orchestrator.py:110-112`).

2. **Agent 1 is a hard prerequisite** -- if the parser fails, the orchestrator returns an error report immediately (`orchestrator.py:85-93`):

```python
except Exception as e:
    _fail(parser_st, t0, e)
    logger.error(f"Parser failed: {e}")
    return json.loads(VerificationReport(
        motion_id=motion_id,
        timestamp=datetime.now(),
        confidence_scores=ConfidenceScores(),
        unknown_issues=[f"Parser failed: {e}"],
        pipeline_status=pipeline_status,
        metadata={"documents_analyzed": list(docs.keys()), "error": str(e)},
    ).model_dump_json())
```

3. **Agent 4 depends on both Agent 2 and 3** -- the synthesizer receives both `citation_results` and `fact_results`. If either parallel task fails, the orchestrator substitutes an empty list (`orchestrator.py:115-127`) and continues, but the synthesis is degraded.

4. **Agent 5 depends on Agent 4** -- the memo agent receives `top_findings` from the synthesizer. If the synthesizer fails, the memo operates on empty findings (`orchestrator.py:144-148`).

The dependency chain means the pipeline has **graceful degradation** but not **independence**. Each agent adds information that downstream agents need. The orchestrator's error handling (`return_exceptions=True` at line 111, exception-to-empty-list conversion at lines 115-127) ensures partial results are still produced, but with reduced quality.

#### Error Handling: Per-Agent Isolation

Each agent is isolated in its own try/except block within the orchestrator. The tracking functions at `orchestrator.py:22-42` provide per-agent status:

```python
def _track(statuses: List[AgentStatus], name: str) -> AgentStatus:
    entry = AgentStatus(agent_name=name, status="pending")
    statuses.append(entry)
    return entry

def _start(entry: AgentStatus) -> float:
    entry.status = "running"
    return time.time()

def _succeed(entry: AgentStatus, t0: float):
    entry.status = "success"
    entry.duration_ms = int((time.time() - t0) * 1000)

def _fail(entry: AgentStatus, t0: float, err: Exception):
    entry.status = "failed"
    entry.error = str(err)
    entry.duration_ms = int((time.time() - t0) * 1000)
```

This means the final `VerificationReport` always includes `pipeline_status` -- a list of `AgentStatus` objects showing which agents succeeded, which failed, and how long each took. A consumer of the report can see exactly where the pipeline degraded.

The CitationVerifierAgent has an additional layer of per-citation error isolation at `citation_verifier.py:72-89`:

```python
results = await asyncio.gather(
    *(self._verify_one(cit, case_context) for cit in citations),
    return_exceptions=True,
)
final = []
for i, r in enumerate(results):
    if isinstance(r, Exception):
        self.logger.warning(f"Citation {i} verification raised: {r}")
        final.append(VerifiedCitation(
            citation=citations[i],
            is_supported=False,
            confidence=0.0,
            status=VerificationStatus.COULD_NOT_VERIFY,
            notes=f"Verification failed: {r}",
        ).model_dump())
    else:
        final.append(r)
```

If one citation verification fails, the others still complete. This is the finest-grained error isolation in the system.

---

### Interview Cheat Sheet

**Q: Why five agents instead of one big prompt?**
A: Cognitive mode separation. Each agent operates in a distinct mindset (extract vs. verify vs. cross-reference vs. synthesize vs. write). A single prompt forces the LLM to context-switch between antagonistic modes, dropping from 6-8/8 error detection to 3-4/8. The 2x cost increase is justified by the 50-100% improvement in detection.

**Q: Why is the orchestrator not an agent?**
A: Determinism as a safety property. In legal verification, you want guaranteed coverage, not LLM-decided coverage. A dynamic orchestrator might skip checks that "look fine" -- exactly what a deceptive brief exploits.

**Q: What's the data dependency graph?**
A: Parser -> [Verifier || FactChecker] -> Synthesizer -> Memo. Only Agents 2 and 3 are independent (run in parallel). Everything else is sequential.

**Q: What's the vestigial design in the parser?**
A: The parser extracts `facts` (`document_parser.py:10`) that are never consumed. The fact checker works on raw documents instead. This is dead code from an earlier architecture.

**Q: What would you change for production?**
A: (1) Add a precedent-checking agent with Westlaw/CourtListener API access. (2) Remove the vestigial `facts` extraction from the parser to save tokens. (3) Add a caching layer for repeated citation lookups. (4) Consider splitting the fact checker if documents grow beyond the 6,000-char truncation limit.

**Q: How does error isolation work?**
A: Three levels: (1) per-agent try/except in the orchestrator, (2) per-citation `asyncio.gather(return_exceptions=True)` in the citation verifier, (3) per-fact try/except in the fact checker's result processing loop (`fact_checker.py:80-81`). Each level ensures partial results survive individual failures.


---

## 35. Parallel Execution Mechanics

The BS Detector pipeline uses a two-level parallelism strategy: at the **orchestrator level**, `asyncio.gather` runs the citation verifier and fact checker concurrently; at the **per-citation level**, the citation verifier fans out individual LLM calls for each citation. This section dissects both levels, traces the fan-in barrier that blocks the synthesizer, and identifies the missing concurrency throttle that would become a production bottleneck.

---

### Beginner Level

#### What Does "Parallel" Mean Here?

The pipeline follows a sequential-then-parallel-then-sequential shape:

```
document_parser  -->  [citation_verifier || fact_checker]  -->  report_synthesizer  -->  judicial_memo
```

The `||` symbol means the two agents run at the same time. The metadata string in the orchestrator confirms this architecture explicitly:

```python
# orchestrator.py:184
"pipeline": "document_parser -> [citation_verifier || fact_checker] -> report_synthesizer -> judicial_memo",
```

#### Why Run Things in Parallel?

Citation verification and fact checking are **independent** — neither needs the other's output. Running them sequentially would waste time: if citation verification takes 30 seconds and fact checking takes 20 seconds, sequential execution takes 50 seconds. Parallel execution takes ~30 seconds (the slower of the two).

#### The Core Mechanism: `asyncio.gather`

The orchestrator launches both agents as coroutines and waits for both to finish:

```python
# orchestrator.py:105-112
citation_task = self.citation_verifier.execute(
    {"citations": citations, "case_context": case_context}
)
fact_task = self.fact_checker.execute({**docs, "case_context": case_context})

citation_results, fact_results = await asyncio.gather(
    citation_task, fact_task, return_exceptions=True
)
```

`asyncio.gather` takes multiple awaitables (coroutines, tasks, futures) and runs them concurrently within a single thread. It returns a list of results in the same order as the input awaitables.

#### What `return_exceptions=True` Does

Without `return_exceptions=True`, if either task raises an exception, `asyncio.gather` immediately re-raises that exception and **cancels** the other tasks. This would mean:

- If citation verification fails, you lose the fact-checking results too.
- The entire parallel step blows up from a single failure.

With `return_exceptions=True`, exceptions are **returned as values** instead of being raised. The orchestrator then checks each result individually:

```python
# orchestrator.py:115-127
if isinstance(citation_results, Exception):
    _fail(cit_st, cit_t0, citation_results)
    logger.error(f"Citation verification failed: {citation_results}")
    citation_results = []
else:
    _succeed(cit_st, cit_t0)

if isinstance(fact_results, Exception):
    _fail(fact_st, fact_t0, fact_results)
    logger.error(f"Fact checking failed: {fact_results}")
    fact_results = []
else:
    _succeed(fact_st, fact_t0)
```

This is a **graceful degradation** pattern: if one agent fails, the pipeline continues with an empty result list rather than crashing entirely.

---

### Intermediate Level

#### Two-Level Parallelism Architecture

The system has parallelism at two distinct levels:

| Level | Where | Mechanism | Granularity |
|-------|-------|-----------|-------------|
| **Level 1: Orchestrator** | `orchestrator.py:110-112` | `asyncio.gather(citation_task, fact_task)` | 2 concurrent agents |
| **Level 2: Per-citation** | `citation_verifier.py:72-75` | `asyncio.gather(*[_verify_one(...) for cit in citations])` | N concurrent LLM calls |

The fact checker does NOT have Level 2 parallelism — it makes a single LLM call with all documents packed into one prompt.

##### Level 2: Per-Citation Fan-Out

Inside the citation verifier, each citation gets its own LLM call:

```python
# citation_verifier.py:60-75
async def execute(self, input_data: Dict[str, Any], context: Dict[str, Any] = None) -> List[Dict]:
    citations_data = input_data.get("citations", [])
    case_context = input_data.get("case_context", "")
    if not citations_data:
        return []

    self.logger.info(f"Verifying {len(citations_data)} citations")

    citations = [
        Citation(**c) if isinstance(c, dict) else c
        for c in citations_data
    ]
    results = await asyncio.gather(
        *(self._verify_one(cit, case_context) for cit in citations),
        return_exceptions=True,
    )
```

Each `_verify_one` call builds a unique prompt and calls the LLM:

```python
# citation_verifier.py:29-47
async def _verify_one(self, citation: Citation, case_context: str) -> Dict:
    try:
        prompt = CITATION_VERIFICATION_PROMPT.format(
            citation_text=citation.citation_text,
            claimed_proposition=citation.claimed_proposition,
            context=citation.context or "",
            case_context=case_context,
        )
        vr = await self._call_llm(prompt, VerificationResult)
        verified = VerifiedCitation(
            citation=citation,
            is_supported=vr.is_supported,
            confidence=vr.confidence,
            confidence_reasoning=vr.confidence_reasoning or None,
            discrepancies=vr.discrepancies,
            status=STATUS_MAP.get(vr.status, VerificationStatus.COULD_NOT_VERIFY),
            notes=vr.notes,
        )
        return verified.model_dump()
```

This means if the parser extracts 50 citations, the citation verifier fires **50 simultaneous LLM calls** — there is no concurrency limit.

#### The Fan-In Barrier

The `await asyncio.gather(...)` on line 110 of the orchestrator acts as a **fan-in barrier**: the synthesizer (Step 4) cannot begin until BOTH parallel agents have completed.

```
Timeline:
                                                        Fan-In Barrier
                                                              |
Parser -----> [Citation Verifier (N parallel LLM calls)] ----+----> Synthesizer ----> Memo
              [Fact Checker (1 LLM call)              ] ----+
```

The synthesizer starts at orchestrator.py:134-138:

```python
# orchestrator.py:134-138
synthesis = await self.synthesizer.execute({
    "citation_results": citation_results,
    "fact_results": fact_results,
})
```

It receives both result sets as input, so it structurally cannot start until both are available. This is an inherent data dependency, not a design limitation.

#### Critical Path Analysis

Which agent determines total latency? Consider the work each does:

| Agent | LLM Calls | Call Complexity | Likely Latency |
|-------|-----------|-----------------|----------------|
| **Fact Checker** | 1 | Single large prompt with 4 document sections (each up to 6000 chars) | 10-30s |
| **Citation Verifier** | N (one per citation) | N smaller prompts, each with one citation | Depends on N and concurrency |

The fact checker (`fact_checker.py:41-47`) builds a single prompt from truncated document sections:

```python
# fact_checker.py:41-47
prompt = FACT_CHECKING_PROMPT.format(
    msj_facts=msj_text[:max_chars],
    police_text=police_text[:max_chars],
    medical_text=medical_text[:max_chars],
    witness_text=witness_text[:max_chars],
    case_context=case_context,
) + truncation_notice
```

With a 6000-char limit per document (`fact_checker.py:25`: `max_chars = 6000`), this prompt could be up to ~24,000 characters plus the template. A single LLM call with a large prompt typically takes 10-30 seconds.

The citation verifier, by contrast, fires N parallel calls. If N is small (5-10), all calls complete quickly (the LLM API handles them concurrently). If N is large (50+), the LLM provider may throttle or queue requests, making the citation verifier the bottleneck.

**Typical scenario** (10-20 citations): The fact checker's single large call is the critical path. The citation verifier's per-citation calls are smaller and complete faster in parallel, so the citation verifier finishes first and waits at the barrier.

**High-citation scenario** (50+ citations): The citation verifier becomes the critical path due to API rate limits and cumulative latency.

#### Timeout at the LLM Call Level

Each individual LLM call has a 120-second timeout enforced by `base_agent.py:25`:

```python
# base_agent.py:22-34
async def _call_llm(self, prompt: str, response_model: Type[BaseModel],
                    system_prompt: str = "", timeout: int = 120) -> BaseModel:
    try:
        return await asyncio.wait_for(
            self.llm_service.get_structured_response(
                prompt=prompt, response_model=response_model, system_prompt=system_prompt
            ),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        raise AgentError(f"{self.name}: LLM call timed out after {timeout}s")
    except Exception as e:
        raise AgentError(f"{self.name}: LLM call failed: {e}")
```

This timeout applies **per call**, not per agent. So the citation verifier could theoretically wait up to 120 seconds for each of its N parallel calls. However, since they run concurrently, the wall-clock time for N parallel calls is bounded by the slowest individual call (up to 120 seconds), not N * 120 seconds.

#### Error Handling at Both Levels

The system has error handling at **both** parallelism levels:

**Level 1 (Orchestrator)**: `return_exceptions=True` on `asyncio.gather` (line 111) means if an entire agent fails, the result is an `Exception` object. The orchestrator replaces it with an empty list:

```python
# orchestrator.py:115-118
if isinstance(citation_results, Exception):
    _fail(cit_st, cit_t0, citation_results)
    logger.error(f"Citation verification failed: {citation_results}")
    citation_results = []
```

**Level 2 (Per-citation)**: The citation verifier also uses `return_exceptions=True` on its inner gather (line 74) and handles individual citation failures:

```python
# citation_verifier.py:77-89
final = []
for i, r in enumerate(results):
    if isinstance(r, Exception):
        self.logger.warning(f"Citation {i} verification raised: {r}")
        final.append(VerifiedCitation(
            citation=citations[i],
            is_supported=False,
            confidence=0.0,
            status=VerificationStatus.COULD_NOT_VERIFY,
            notes=f"Verification failed: {r}",
        ).model_dump())
    else:
        final.append(r)
```

Additionally, each `_verify_one` call has its own try/except (line 30-58) that catches exceptions before they even reach the gather's `return_exceptions` handling. This means Level 2 exceptions are triple-protected:

1. `_verify_one` try/except catches and returns a `COULD_NOT_VERIFY` entry
2. `asyncio.gather(return_exceptions=True)` catches anything `_verify_one` misses
3. The post-gather loop (`citation_verifier.py:78-89`) catches leftover exceptions

---

### Expert Level

#### The Missing Concurrency Throttle

This is the most significant production concern in the current design. The citation verifier's `execute` method creates an unbounded fan-out:

```python
# citation_verifier.py:72-75
results = await asyncio.gather(
    *(self._verify_one(cit, case_context) for cit in citations),
    return_exceptions=True,
)
```

If the parser extracts 50 citations, this creates **50 concurrent coroutines**, each making an LLM API call. There is no semaphore, no rate limiter, and no backpressure mechanism.

**Why this matters:**

| Concern | Impact |
|---------|--------|
| **LLM API rate limits** | Most providers enforce tokens-per-minute or requests-per-minute limits. 50 simultaneous calls will likely trigger 429 (Too Many Requests) responses. |
| **Connection exhaustion** | The underlying HTTP client (likely `httpx` or `aiohttp`) may run out of connection pool slots. |
| **Memory pressure** | 50 concurrent prompts + 50 concurrent response parsings consume significant memory. |
| **Cost explosion** | No circuit breaker means a parsing error that extracts 500 "citations" fires 500 LLM calls. |

**Production fix — Semaphore-based throttle:**

```python
class CitationVerifierAgent(BaseAgent):
    MAX_CONCURRENT = 10  # Tune based on LLM provider limits

    def __init__(self, llm_service=None):
        super().__init__("citation_verifier", llm_service)
        self._semaphore = asyncio.Semaphore(self.MAX_CONCURRENT)

    async def _verify_one_throttled(self, citation: Citation, case_context: str) -> Dict:
        async with self._semaphore:
            return await self._verify_one(citation, case_context)

    async def execute(self, input_data, context=None):
        # ... same setup ...
        results = await asyncio.gather(
            *(self._verify_one_throttled(cit, case_context) for cit in citations),
            return_exceptions=True,
        )
        # ... same post-processing ...
```

The `asyncio.Semaphore` acts as a gate: at most `MAX_CONCURRENT` coroutines can hold the semaphore at once. Others wait until a slot opens. This provides backpressure without changing the gather pattern.

#### Timing Instrumentation Gap

The orchestrator tracks timing at the **agent level** using the `_start`/`_succeed`/`_fail` helpers:

```python
# orchestrator.py:29-42
def _start(entry: AgentStatus) -> float:
    entry.status = "running"
    return time.time()

def _succeed(entry: AgentStatus, t0: float):
    entry.status = "success"
    entry.duration_ms = int((time.time() - t0) * 1000)

def _fail(entry: AgentStatus, t0: float, err: Exception):
    entry.status = "failed"
    entry.error = str(err)
    entry.duration_ms = int((time.time() - t0) * 1000)
```

But there is **no per-citation latency tracking**. When the citation verifier takes 45 seconds, you cannot tell whether:

- All 20 citations took ~2 seconds each (healthy)
- 19 citations took 1 second and 1 citation took 26 seconds (one stuck call)
- The first 10 completed in 5 seconds but the last 10 waited in an API queue for 40 seconds (rate limiting)

**Production fix — Per-citation timing:**

```python
async def _verify_one(self, citation: Citation, case_context: str) -> Dict:
    t0 = time.time()
    try:
        # ... existing verification logic ...
        verified = VerifiedCitation(...)
        result = verified.model_dump()
        result["_latency_ms"] = int((time.time() - t0) * 1000)
        return result
    except Exception as e:
        # ... existing error handling ...
        result = verified.model_dump()
        result["_latency_ms"] = int((time.time() - t0) * 1000)
        return result
```

This enables latency percentile analysis (p50, p95, p99) and helps identify slow calls or rate-limiting patterns.

#### The Fan-In Barrier: Structural Analysis

The fan-in barrier at `orchestrator.py:110` is the most consequential scheduling decision in the pipeline. Let's trace what happens in detail:

```
T=0s    : Parser completes, both agents start simultaneously
T=0s    : Fact checker begins single LLM call
T=0s    : Citation verifier fires N parallel _verify_one calls
T=2s    : First citation results arrive (not visible to anyone yet)
T=5s    : 80% of citations verified (still waiting at barrier)
T=15s   : Fact checker completes (still waiting for remaining citations)
T=22s   : Last citation returns, fan-in barrier releases
T=22s   : Synthesizer starts with both result sets
```

**Key insight**: Even though most citations complete quickly, the barrier waits for the **slowest** task across both agents. The tail latency of the citation verifier dominates.

#### What Partial Streaming Would Look Like

In the current design, the synthesizer is blocked until both agents are done. A streaming approach would allow early results to flow to the user:

**Phase 1: Incremental citation display**

Instead of gathering all results, the citation verifier could yield results as they complete:

```python
async def execute_streaming(self, input_data, callback):
    """Yield citation results as they complete."""
    citations = [...]
    pending = {
        asyncio.create_task(self._verify_one(cit, case_ctx)): i
        for i, cit in enumerate(citations)
    }
    results = [None] * len(citations)

    for coro in asyncio.as_completed(pending.keys()):
        result = await coro
        idx = pending[... ]  # map task back to index
        results[idx] = result
        await callback(result)  # Push to client immediately

    return results
```

**Phase 2: Partial synthesis**

The synthesizer could accept partial data:

```python
# Streaming pipeline (hypothetical)
async def analyze_streaming(self, documents, ws):
    # Parser runs first (required)
    citations = await self.parser.execute(docs)

    # Start both agents
    citation_task = asyncio.create_task(self.citation_verifier.execute(...))
    fact_task = asyncio.create_task(self.fact_checker.execute(...))

    # Stream citation results as they arrive
    done, pending = await asyncio.wait(
        [citation_task, fact_task],
        return_when=asyncio.FIRST_COMPLETED,
    )

    for task in done:
        if task is citation_task:
            await ws.send_json({"type": "citations_ready", "data": task.result()})
        elif task is fact_task:
            await ws.send_json({"type": "facts_ready", "data": task.result()})

    # Wait for remaining
    for task in pending:
        result = await task
        await ws.send_json({"type": "partial_result", "data": result})

    # Final synthesis once both are done
    synthesis = await self.synthesizer.execute({...})
    await ws.send_json({"type": "final_report", "data": synthesis})
```

This changes the user experience from "wait 30 seconds, see everything" to "see citations trickling in at 2 seconds, facts at 15 seconds, final report at 20 seconds."

#### Queue-Based Distribution (Production Architecture)

For high-volume deployment, the fan-out pattern should use a task queue rather than in-process coroutines:

```
Current (in-process):
  Orchestrator --> asyncio.gather([verify_1, verify_2, ..., verify_50])
  All 50 calls happen in the same Python process

Production (queue-based):
  Orchestrator --> Task Queue (Redis/SQS/Celery)
                       |
            +----------+-----------+
            |          |           |
         Worker 1   Worker 2   Worker 3
         (10 cits)  (10 cits)  (10 cits) ...
```

Benefits:

| Feature | In-process `asyncio.gather` | Queue-based |
|---------|---------------------------|-------------|
| Horizontal scaling | No (single process) | Yes (add workers) |
| Backpressure | None (unbounded) | Queue depth limits |
| Retry logic | Manual per-coroutine | Built into queue (e.g., Celery retry) |
| Observability | Custom logging | Queue metrics (depth, throughput, latency) |
| Failure isolation | Exception in one coroutine is caught | Worker crash doesn't affect others |

#### Race Condition: Status Tracking

The orchestrator starts both agent timers before launching gather:

```python
# orchestrator.py:102-103
cit_t0 = _start(cit_st)
fact_t0 = _start(fact_st)
```

Both are marked "running" at the same instant (line 30: `entry.status = "running"`). Then:

```python
# orchestrator.py:105-112
citation_task = self.citation_verifier.execute(...)
fact_task = self.fact_checker.execute(...)
citation_results, fact_results = await asyncio.gather(
    citation_task, fact_task, return_exceptions=True
)
```

Note that `citation_task` and `fact_task` are coroutine objects created on lines 105 and 108 — they do NOT begin executing until `asyncio.gather` schedules them on line 110. This means the timers start slightly before actual execution begins. In practice, the difference is negligible (microseconds), but it is technically imprecise.

A more accurate approach would wrap each task to self-time:

```python
async def _timed_execute(agent, input_data, status_entry):
    t0 = _start(status_entry)
    try:
        result = await agent.execute(input_data)
        _succeed(status_entry, t0)
        return result
    except Exception as e:
        _fail(status_entry, t0, e)
        raise
```

#### Exception Propagation Trace

Let's trace what happens when a single citation's LLM call raises an `httpx.ReadTimeout`:

1. **`base_agent.py:31-32`**: `asyncio.wait_for` catches the timeout, raises `AgentError("citation_verifier: LLM call timed out after 120s")`.

2. **`citation_verifier.py:48-58`**: The `_verify_one` try/except catches `AgentError`, logs a warning, and returns a `VerifiedCitation` with `status=COULD_NOT_VERIFY`:
   ```python
   except Exception as e:
       self.logger.warning(f"Failed to verify citation: {e}")
       verified = VerifiedCitation(
           citation=citation,
           is_supported=False,
           confidence=0.0,
           ...
           notes=f"Verification failed: {e}",
       )
       return verified.model_dump()
   ```

3. **`citation_verifier.py:72-75`**: Because `_verify_one` caught the exception and returned a dict, the gather sees a **successful** result, not an exception. The `isinstance(r, Exception)` check on line 79 is False — the result passes through as a normal entry.

4. **`orchestrator.py:115`**: The `isinstance(citation_results, Exception)` check is False — the citation verifier returned a list (containing one degraded entry). The orchestrator marks it as success.

**The net effect**: A single citation timeout is completely invisible at the orchestrator level. It shows up only as a `COULD_NOT_VERIFY` entry with `confidence=0.0` in the final results. This is good for resilience but bad for observability — the orchestrator has no way to know that 30% of citations failed to verify without parsing the results list.

#### Asymmetric Error Handling: Fact Checker vs. Citation Verifier

The fact checker's error handling is structurally different:

```python
# fact_checker.py:83-85
except Exception as e:
    self.logger.error(f"Fact checking failed: {e}")
    return []
```

The entire `execute` method is wrapped in a try/except that returns an empty list on failure. This means the fact checker **never** propagates an exception to the orchestrator's gather. The `isinstance(fact_results, Exception)` check on orchestrator.py:122 will **never** be True in practice.

The citation verifier's `execute` method does NOT have a top-level try/except — it could theoretically raise if something fails before the gather (e.g., the `Citation(**c)` parsing on line 69). In that case, the orchestrator's `isinstance(citation_results, Exception)` on line 115 would be True.

| Agent | Can return Exception to orchestrator? | When? |
|-------|--------------------------------------|-------|
| Fact Checker | No | Top-level try/except catches everything |
| Citation Verifier | Yes | If citation parsing fails before gather |

#### Interview Questions

**Q: Why does the orchestrator use `return_exceptions=True` instead of try/except around gather?**

A: With `return_exceptions=False` (the default), the first exception cancels all other tasks. This means if citation verification fails, the fact-checking results are lost. `return_exceptions=True` allows both tasks to complete independently, enabling graceful degradation where the pipeline continues with partial results.

**Q: What is the maximum number of concurrent LLM calls this system can make?**

A: If the parser extracts N citations, the system makes N + 1 concurrent LLM calls: N from the citation verifier's per-citation fan-out, plus 1 from the fact checker. There is no semaphore or concurrency limit. For a motion with 50 citations, that is 51 simultaneous LLM API calls.

**Q: How would you add backpressure to the citation verifier without changing its public API?**

A: Add an `asyncio.Semaphore` to `__init__` and wrap each `_verify_one` call. The gather pattern stays the same, but at most K coroutines actively call the LLM at once. The remaining coroutines await the semaphore, creating natural backpressure. The `execute` method signature and return type are unchanged.

**Q: If the fact checker typically takes 20 seconds and each citation takes 2 seconds, at what number of citations does the citation verifier become the critical path?**

A: With unlimited concurrency, never — all citation calls run in parallel and complete in ~2 seconds regardless of N. But with a semaphore of K=10, N=100 citations require 10 batches of 10, taking ~20 seconds total. So the crossover point is approximately K * (fact_checker_time / per_citation_time) = 10 * (20/2) = 100 citations. Above that, the citation verifier dominates.

**Q: The fan-in barrier means the synthesizer waits for both agents. Could you run synthesis on partial data?**

A: Yes, but it requires restructuring. Use `asyncio.wait(return_when=FIRST_COMPLETED)` to detect when each agent finishes, then stream partial results to the client. The synthesizer still needs both result sets, but you can show the user citation results or fact results as they arrive. An `asyncio.as_completed` pattern in the citation verifier could go further and stream individual citation results.

**Q: Trace the behavior when the LLM provider returns HTTP 429 for 10 of 50 citation verification calls.**

A: The 429 causes the HTTP client to raise an exception in each of those 10 coroutines. Each exception hits the `_verify_one` try/except (`citation_verifier.py:48`), which catches it and returns a `VerifiedCitation` with `status=COULD_NOT_VERIFY`, `confidence=0.0`, and `notes="Verification failed: ..."`. The gather collects all 50 results (40 real, 10 degraded). The orchestrator sees a successful list of 50 entries. The synthesizer processes all 50, but 10 have zero confidence. No retry is attempted.


---

## 36. Typed Contracts & Schema Engineering

### Why This Section Matters

Every LLM-powered pipeline has a "trust boundary" between unstructured model output and the typed data structures the rest of the system depends on. In the BS Detector, Pydantic models define that boundary. Schema engineering determines whether a field rename causes a silent data loss or a loud, catchable error -- and whether the pipeline degrades gracefully or crashes in production.

---

### Beginner: The Pydantic Model Graph

#### 36.1 Which Model Feeds Which Agent

The BS Detector has a strict data-flow graph. Each agent declares a **local response model** (what the LLM returns) and converts it into **shared schema models** (from `models/schemas.py`) before passing data downstream. Every inter-agent boundary uses `dict`, not Pydantic objects.

```
DocumentParserAgent          CitationVerifierAgent       FactCheckerAgent
  ExtractionResult ──┐        VerificationResult           FactCheckResult
  (local model)      │        (local model)                (local model)
        │            │              │                            │
        ▼            │              ▼                            ▼
  Citation, Fact     │        VerifiedCitation              VerifiedFact, Fact
  (shared schemas)   │        (shared schema)               (shared schemas)
        │            │              │                            │
        ▼            │              ▼                            ▼
   List[Dict] ───────┘         List[Dict] ──────┐         List[Dict] ──┐
                                                 │                      │
                                                 ▼                      ▼
                                          ReportSynthesizerAgent
                                            SynthesisResult
                                            (local model)
                                                 │
                                                 ▼
                                          Finding, ConfidenceScores
                                          (shared schemas)
                                                 │
                                                 ▼
                                              Dict ─────────────┐
                                                                │
                                                                ▼
                                                       JudicialMemoAgent
                                                         JudicialMemoResult
                                                         (local model)
                                                                │
                                                                ▼
                                                          JudicialMemo
                                                          (shared schema)
                                                                │
                                                                ▼
                                                       VerificationReport
                                                       (final assembly in
                                                        orchestrator.py)
```

**Key insight**: There are two layers of models at every agent boundary:

| Layer | Purpose | Location | Example |
|-------|---------|----------|---------|
| **Local response model** | Matches the JSON the LLM actually returns | Defined inside each agent file | `VerificationResult` (citation_verifier.py:9-15) |
| **Shared schema model** | Canonical type for inter-agent data flow | `models/schemas.py` | `VerifiedCitation` (schemas.py:28-36) |

The local model is lenient (matches LLM quirks). The shared model is canonical (enforces invariants). The agent is the translation layer.

#### 36.2 Complete Schema Inventory

All models from `models/schemas.py` with their fields and defaults:

| Model (line) | Fields | Default | Used By |
|---|---|---|---|
| `VerificationStatus` (7-11) | SUPPORTED, NOT_SUPPORTED, COULD_NOT_VERIFY, MISLEADING | -- | citation_verifier via STATUS_MAP |
| `ConsistencyStatus` (14-18) | CONSISTENT, CONTRADICTORY, PARTIAL, COULD_NOT_VERIFY | -- | fact_checker via status_map |
| `Citation` (21-25) | citation_text, claimed_proposition, source_location, context | `source_location=""` | document_parser, citation_verifier |
| `VerifiedCitation` (28-36) | citation, is_supported, confidence, confidence_reasoning, discrepancies, supporting_evidence, status, notes | `is_supported=False`, `confidence=0.5`, `status="could_not_verify"` | citation_verifier output |
| `Fact` (39-43) | fact_text, source_document, location, category | `fact_text=""`, `source_document=""`, `location=""` | document_parser, fact_checker |
| `VerifiedFact` (46-61) | fact, is_consistent, confidence, confidence_reasoning, contradictory_sources, supporting_sources, status, summary | `is_consistent=True`, `confidence=0.5`, `status="could_not_verify"` | fact_checker output |
| `Finding` (64-84) | id, type, description, severity, confidence, confidence_reasoning, evidence, recommendation | `severity="medium"`, `confidence=0.5` | report_synthesizer output |
| `ConfidenceScores` (87-90) | citation_verification, fact_consistency, overall | all `0.0` | report_synthesizer, orchestrator |
| `JudicialMemo` (93-97) | memo, key_issues, recommended_actions, overall_assessment | all `""` or `[]` | judicial_memo output |
| `AgentStatus` (100-104) | agent_name, status, duration_ms, error | `status="pending"` | orchestrator tracking |
| `VerificationReport` (107-117) | motion_id, timestamp, verified_citations, verified_facts, confidence_scores, top_findings, unknown_issues, judicial_memo, pipeline_status, metadata | -- | final pipeline output |

**Interview question**: "Why does `VerifiedCitation.status` have type `str` (line 35) instead of `VerificationStatus`?"

**Answer**: Because the `STATUS_MAP.get()` call in `citation_verifier.py:44` returns `VerificationStatus` enum values, and `VerifiedCitation` stores whatever comes through. The schema is permissive at the storage layer -- the enum mapping is enforced at the agent layer. This is a deliberate design trade-off: schema validators do not reject unknown status strings, which means a new status value can be added without changing the schema. The downside is that typos pass silently.

---

### Intermediate: Enum Mapping, Null Handling, and Coercion

#### 36.3 The STATUS_MAP Pattern

Both `citation_verifier.py` and `fact_checker.py` use the same pattern to convert LLM-returned status strings into typed enums, but they implement it slightly differently.

**citation_verifier.py (lines 18-22):**

```python
STATUS_MAP = {
    "supported": VerificationStatus.SUPPORTED,
    "not_supported": VerificationStatus.NOT_SUPPORTED,
    "misleading": VerificationStatus.MISLEADING,
}
```

Usage at line 44:
```python
status=STATUS_MAP.get(vr.status, VerificationStatus.COULD_NOT_VERIFY),
```

**fact_checker.py (lines 52-56):**

```python
status_map = {
    "consistent": ConsistencyStatus.CONSISTENT,
    "contradictory": ConsistencyStatus.CONTRADICTORY,
    "partial": ConsistencyStatus.PARTIAL,
}
```

Usage at line 76:
```python
status=status_map.get(status_str, ConsistencyStatus.COULD_NOT_VERIFY),
```

**Critical analysis of the STATUS_MAP pattern:**

| Property | Behavior | Risk |
|----------|----------|------|
| Case sensitivity | `"Supported"` falls through to `COULD_NOT_VERIFY` | LLMs sometimes capitalize; this silently degrades |
| Typo handling | `"suported"` (typo) falls through to `COULD_NOT_VERIFY` | No logging when fallback triggers -- silent data loss |
| Missing enum values | `"could_not_verify"` is NOT in the citation map | Intentional: it's the fallback default |
| Scope | Citation map is module-level; fact map is local | No functional difference, but inconsistent style |

**What breaks**: If the LLM returns `"Supported"` (capital S), the STATUS_MAP lookup fails, and the citation is marked `COULD_NOT_VERIFY` even though the LLM meant `SUPPORTED`. There is no warning logged. In a production system, you would want:

```python
# Robust version (not in current code)
status_key = vr.status.lower().strip()
mapped = STATUS_MAP.get(status_key, VerificationStatus.COULD_NOT_VERIFY)
if status_key not in STATUS_MAP:
    self.logger.warning(f"Unmapped status '{vr.status}' -> COULD_NOT_VERIFY")
```

**Interview question**: "The STATUS_MAP in citation_verifier.py omits `could_not_verify`. Is this a bug?"

**Answer**: No. `COULD_NOT_VERIFY` is the fallback default in the `.get()` call. Including it in the map would be redundant. However, omitting it means the string `"could_not_verify"` maps to the same value whether it's in the map or not -- the semantics are correct but the intent is implicit.

#### 36.4 The Null Handling Cascade

When an LLM returns `null` for a boolean field, the system has a three-layer defense:

**Layer 1 -- Agent-level derivation (fact_checker.py:59-63):**

```python
raw_consistent = item.get("is_consistent")
status_str = item.get("status", "")
# Derive is_consistent from status when LLM returns null
if raw_consistent is None:
    raw_consistent = status_str == "consistent"
```

If the LLM returns `{"is_consistent": null, "status": "contradictory"}`, the agent derives `is_consistent = False` from the status string. This is the **primary defense** and the most semantically correct one.

**Layer 2 -- Pydantic validator (schemas.py:56-61):**

```python
@field_validator("is_consistent", mode="before")
@classmethod
def coerce_is_consistent(cls, v):
    if v is None:
        return True
    return v
```

If the agent layer somehow passes `None` through (e.g., both `is_consistent` and `status` are null), the Pydantic validator defaults to `True`. This is a **safety net**, not the primary logic.

**Layer 3 -- Field default (schemas.py:48):**

```python
is_consistent: bool = True
```

If the field is entirely missing from the dict (not `None`, but absent), Pydantic uses the field default of `True`.

**The null cascade in order:**

```
LLM returns null for is_consistent
         │
         ▼
fact_checker.py:62-63  ──  Derives from status string
         │                  (False if status != "consistent")
         ▼
schemas.py:56-61      ──  Validator coerces None → True
         │                  (only reached if agent passes None)
         ▼
schemas.py:48         ──  Field default = True
                           (only reached if key is absent)
```

**Danger zone**: Layer 2 defaults to `True` (optimistic). Layer 1 derives from status (accurate). If a code change bypasses Layer 1 (e.g., passing raw LLM dicts directly to `VerifiedFact`), null `is_consistent` silently becomes `True`, hiding contradictions. The optimistic default was chosen because `is_consistent=True` is the "no finding" case -- it's better to miss a contradiction than to flag a false positive in a judicial context.

#### 36.5 The `coerce_id` and `coerce_evidence` Validators

**`coerce_id` (schemas.py:74-77):**

```python
@field_validator("id", mode="before")
@classmethod
def coerce_id(cls, v):
    return str(v)
```

**What it fixes**: LLMs sometimes return numeric IDs (`1`, `2`) instead of string IDs (`"F-1"`, `"F-2"`). The `Finding.id` field is typed as `str`, but without this validator, Pydantic would reject `{"id": 1}` with a validation error. The coercion converts any value to its string representation.

**Where it matters**: In `report_synthesizer.py:36`, findings are constructed from LLM output:

```python
Finding(
    id=f.get("id", f"F-{i+1}"),
    ...
)
```

The `.get()` fallback already provides a string, but if the LLM provides an `id` field, it might be an integer. The validator catches this.

**`coerce_evidence` (schemas.py:79-84):**

```python
@field_validator("evidence", mode="before")
@classmethod
def coerce_evidence(cls, v):
    if isinstance(v, str):
        return [v]
    return v
```

**What it fixes**: `Finding.evidence` is `List[str]`, but LLMs often return a single string instead of a list when there's only one piece of evidence. For example:

```json
{"evidence": "Police report contradicts MSJ on date"}
```

Without the validator, Pydantic would reject this (string is not a list). The coercion wraps a lone string in a list.

**Where it matters**: In `report_synthesizer.py:42`:

```python
evidence=f.get("evidence", []),
```

The `.get()` fallback handles missing keys, but the LLM might return `"evidence": "some string"` instead of `"evidence": ["some string"]`. The validator catches this structural mismatch.

---

### Expert: Schema Injection, Cascade Analysis, and Production Patterns

#### 36.6 Schema Injection into Prompts

The `_schema_prompt()` method in `llm_service.py:80-86` is the mechanism that tells the LLM what JSON structure to return:

```python
def _schema_prompt(self, response_model: Type[BaseModel]) -> str:
    schema = response_model.model_json_schema()
    return (
        "You are a precise legal analysis assistant.\n"
        f"Respond with valid JSON matching this schema:\n{json.dumps(schema, indent=2)}\n"
        "Output ONLY valid JSON, no markdown fences, no explanation."
    )
```

**How it works**: `model_json_schema()` generates a JSON Schema from the Pydantic model. This schema is injected into the system prompt, so the LLM knows the expected field names, types, and constraints.

The `get_structured_response()` method (llm_service.py:88-118) handles two paths:

| Path | Condition | System prompt construction |
|------|-----------|---------------------------|
| Custom system prompt | `system_prompt` is truthy (line 95) | Appends schema to the caller's system prompt (lines 96-101) |
| Default | No system prompt provided (line 104) | Uses `_schema_prompt()` which includes the "precise legal analysis assistant" persona |

**The full chain from agent to LLM:**

```
Agent calls self._call_llm(prompt, ResponseModel)
  → BaseAgent._call_llm (base_agent.py:22-28)
    → LLMService.get_structured_response (llm_service.py:88-118)
      → Generates JSON Schema from ResponseModel
      → Injects schema into system prompt
      → Calls LLM via get_completion()
      → Parses raw text → extracts JSON → validates against ResponseModel
    → Returns typed Pydantic instance
```

**Critical detail**: The schema injected into the prompt is generated from the **local response model** (e.g., `VerificationResult`), NOT from the shared schema model (e.g., `VerifiedCitation`). This is why the local models can have different field names or simpler structures than the shared schemas -- the agent translates between them.

#### 36.7 Why Dicts, Not Pydantic Objects, Between Agents

Every agent's `execute()` method returns `List[Dict]` or `Dict[str, Any]`, not typed Pydantic objects. The conversion happens via `.model_dump()`:

**citation_verifier.py:47:**
```python
return verified.model_dump()
```

**fact_checker.py:79:**
```python
verified.append(vf.model_dump())
```

**report_synthesizer.py:44:**
```python
).model_dump())
```

**judicial_memo.py:41:**
```python
return memo.model_dump()
```

**Three reasons for this design:**

1. **JSON-serializability**: The orchestrator (orchestrator.py:188) calls `report.model_dump_json()` to serialize the final result. Intermediate dicts are already JSON-serializable; Pydantic objects with custom types (enums, datetime) require special handling. Dicts avoid `TypeError` on `json.dumps()`.

2. **Loose coupling**: Agents don't import each other's types. `ReportSynthesizerAgent` receives `citation_results` and `fact_results` as `List[Dict]` (orchestrator.py:135-137). It doesn't need to import `VerifiedCitation` or `VerifiedFact`. This means agents can be developed, tested, and versioned independently.

3. **Distributability**: If agents were to run on separate processes or services (e.g., behind a message queue), dicts serialize trivially. Pydantic objects would require shared model packages or serialization protocols.

**The trade-off**: Type safety is lost between agents. When `report_synthesizer.py:34` iterates over `result.top_findings`, each `f` is a `Dict[str, Any]` -- field access is via `.get()` with fallbacks, not attribute access with IDE autocomplete. Typos in field names (e.g., `f.get("desciption")`) fail silently with the default value.

#### 36.8 What Breaks If You Change a Field Name

Consider renaming `is_consistent` to `is_verified` in `VerifiedFact`. Here is the cascade:

| File | Line | What references `is_consistent` | Impact |
|------|------|---------------------------------|--------|
| `schemas.py` | 48 | Field declaration | Changed |
| `schemas.py` | 56-61 | `@field_validator("is_consistent")` | **Breaks**: validator silently stops running (no field to validate) |
| `fact_checker.py` | 59 | `item.get("is_consistent")` | **Breaks**: always returns `None` (LLM still returns old name) |
| `fact_checker.py` | 71 | `is_consistent=bool(raw_consistent)` | **Breaks**: constructor kwarg name mismatch |
| `utils/prompts.py` | 67 | Prompt text says `is_consistent (bool)` | **Breaks**: LLM returns `is_consistent` in JSON, but schema now expects `is_verified` |
| `orchestrator.py` | 174-175 | Consumes `fact_results` as `List[Dict]` | **Silent failure**: dict still has `is_consistent` key, `VerificationReport` model accepts it |
| eval scripts | -- | May assert on `is_consistent` | **Breaks**: eval assertions fail |

**Total blast radius**: 5+ files, with 2 silent failures (the most dangerous kind).

**The prompt coupling problem**: The prompt in `FACT_CHECKING_PROMPT` (prompts.py:67) literally says `is_consistent (bool)`. The LLM reads this and returns `{"is_consistent": true}`. If you rename the Pydantic field but not the prompt text, the LLM still returns the old name. If you update the prompt but not the Pydantic field, validation fails. The schema and the prompt are **implicitly coupled** through string matching -- there is no compile-time check.

**Interview question**: "How would you safely rename a field in this pipeline?"

**Answer**:
1. Add the new field name with `alias` in the Pydantic model (`Field(alias="is_consistent")`)
2. Update the prompt text
3. Add a `@field_validator` that handles both old and new names during migration
4. Update all `.get()` calls in agents
5. Update eval assertions
6. Deploy, verify, then remove the alias

#### 36.9 Schema Injection and the LLM Response Cycle

The exact sequence from prompt to validated output:

```
1. Agent builds prompt text from PROMPT template (utils/prompts.py)
2. Agent calls _call_llm(prompt, LocalResponseModel)
3. BaseAgent._call_llm → LLMService.get_structured_response()
4. LLMService generates JSON Schema from LocalResponseModel:
     response_model.model_json_schema()   ← llm_service.py:81/96
5. Schema is injected into system prompt:
     "Respond with valid JSON matching this schema:\n{schema}"
6. LLM receives: system=schema_prompt, user=agent_prompt
7. LLM returns raw text (may include markdown fences)
8. _extract_json() strips fences and finds JSON  ← llm_service.py:24-51
9. json.loads() parses string to dict             ← llm_service.py:111
10. response_model.model_validate(data)            ← llm_service.py:115
11. Returns typed Pydantic instance to agent
12. Agent translates LocalModel → SharedModel → dict
```

**Where validation errors are (not) logged**: At step 9, a `json.JSONDecodeError` is caught and logged at ERROR level (llm_service.py:112-114). At step 10, a Pydantic `ValidationError` is NOT explicitly caught -- it propagates up to `BaseAgent._call_llm` (base_agent.py:33), which catches `Exception` and wraps it in `AgentError`. The original validation error details (which fields failed, what values were provided) are stringified into the error message but not structured for monitoring.

**Gap**: There is no validation error classification. A missing required field, a type mismatch, and a constraint violation (e.g., `confidence > 1.0`) all produce the same `AgentError`. In production, you'd want to distinguish these because they have different root causes and remedies.

#### 36.10 Production: Schema Versioning and Discriminated Unions

**Current state**: There is no schema versioning. All models are at an implicit v1. The `VerificationReport.metadata` field (schemas.py:117) could carry a version tag, but currently does not.

**What schema versioning would look like:**

```python
# Not in current code -- production improvement
class VerificationReportV2(BaseModel):
    schema_version: Literal["2"] = "2"
    motion_id: str
    # ... fields with breaking changes ...

ReportType = Annotated[
    Union[VerificationReport, VerificationReportV2],
    Field(discriminator="schema_version")
]
```

**Why it matters**: If the report schema changes (e.g., adding a required field), stored reports from before the change become invalid. Without versioning, you can't deserialize old reports. With discriminated unions, you can route to the correct model based on a version tag.

**Validation error classification (production pattern):**

```python
# Not in current code -- production improvement
class ValidationFailure(BaseModel):
    agent: str
    model: str
    field: str
    error_type: Literal["missing", "type_mismatch", "constraint", "unknown"]
    raw_value: Any
    timestamp: datetime
```

This would enable dashboards showing "citation_verifier has 15% type_mismatch errors on the `confidence` field this week" -- actionable signal for prompt tuning.

#### 36.11 The Two-Model Pattern: Why Local + Shared

Every agent follows the same structural pattern:

```python
# 1. Define a LOCAL response model (matches LLM output)
class VerificationResult(BaseModel):      # citation_verifier.py:9
    is_supported: bool
    confidence: float = Field(ge=0, le=1)
    confidence_reasoning: str = ""
    discrepancies: List[str] = Field(default_factory=list)
    status: str = "could_not_verify"
    notes: str = ""

# 2. Call LLM with local model as response_model
vr = await self._call_llm(prompt, VerificationResult)    # line 37

# 3. Translate to SHARED schema model
verified = VerifiedCitation(                               # line 38
    citation=citation,
    is_supported=vr.is_supported,
    confidence=vr.confidence,
    ...
    status=STATUS_MAP.get(vr.status, ...),                 # line 44 -- enum mapping
)

# 4. Return as dict
return verified.model_dump()                               # line 47
```

**Why not use the shared model directly as the response_model?**

| Reason | Example |
|--------|---------|
| Shared model has fields the LLM shouldn't fill | `VerifiedCitation.citation` is set by the agent, not the LLM |
| Shared model uses enums the LLM can't produce | `VerificationStatus.SUPPORTED` vs string `"supported"` |
| Shared model has nested objects | `VerifiedFact.fact` is a `Fact` object; LLM returns flat dicts |
| Local model can be more permissive | `VerificationResult.notes: str = ""` vs `VerifiedCitation.notes: Optional[str] = None` |

The local model is the LLM's "contract". The shared model is the system's "contract". The agent translates between them.

#### 36.12 Summary: Schema Engineering Principles in Practice

| Principle | Implementation | Risk if violated |
|-----------|---------------|------------------|
| Two-model pattern | Local response model + shared schema model | LLM output shapes leak into system types |
| Enum mapping with fallback | `STATUS_MAP.get(key, default)` | Unknown statuses crash instead of degrading |
| Null coercion chain | Agent derives > validator coerces > field default | Silent data corruption (wrong booleans) |
| Dict boundaries between agents | `.model_dump()` at every agent output | Tight coupling, serialization failures |
| Schema injection | `model_json_schema()` in system prompt | LLM returns wrong structure |
| Validators for LLM quirks | `coerce_id`, `coerce_evidence`, `coerce_is_consistent` | Validation errors on valid-intent data |
| Implicit prompt-schema coupling | Field names in prompts must match response model | Silent mismatches after rename |

**Interview-ready summary**: The BS Detector uses a two-model pattern at every agent boundary: a lenient local model matching LLM output, and a strict shared model for inter-agent data flow. Enum mapping via `STATUS_MAP.get()` with fallback provides resilience against LLM string variations, though it lacks case-normalization and logging. Null handling uses a three-layer cascade (agent derivation, Pydantic validators, field defaults) that defaults optimistically to avoid false judicial findings. All inter-agent data flows as plain dicts for JSON-serializability and loose coupling, at the cost of type safety. The main production gaps are: no schema versioning for stored reports, no validation error classification for monitoring, case-sensitive enum mapping, and implicit coupling between prompt text and Pydantic field names that makes renames dangerous.


---

## 37. Graceful Degradation Architecture

### Beginner: The Safety Net Philosophy

**What happens when things go wrong in a 5-agent pipeline?**

The BS Detector pipeline chains five agents sequentially and in parallel. Any one of them can fail -- the LLM might time out, return malformed JSON, or crash entirely. The graceful degradation architecture ensures the system always returns *something useful* rather than a blank screen or a 500 error.

**The Pipeline Flow and Its Failure Points**

```
Document Parser --> [Citation Verifier || Fact Checker] --> Report Synthesizer --> Judicial Memo
     (must)              (can degrade)                       (can degrade)       (optional)
```

Each arrow is a potential failure point. The architecture answers: "If agent X fails, what does the user still get?"

**Degradation Hierarchy Overview**

| Level | Name | What Failed | User Gets |
|-------|------|-------------|-----------|
| 0 | Full Success | Nothing | Complete report with judicial memo |
| 1 | No Memo | Judicial memo agent | Full report, no judicial memo |
| 2 | Partial Verification | One parallel agent (citation OR fact) | Report with partial data, zeroed-out scores for missing half |
| 3 | Raw Data Only | Both parallel agents + synthesizer | Error report with document list and parser output |
| 4 | Error Report | Parser (Stage 1 failure) | Skeleton `VerificationReport` with `unknown_issues` only |

---

### Intermediate: 4-Layer Error Handling Traced Through Code

The error handling architecture has four distinct layers, each operating at a different granularity.

#### Layer 1: LLM Call Wrapper (Base Agent)

Every LLM interaction passes through `BaseAgent._call_llm()` or `_call_llm_text()` in `base_agent.py`. These methods wrap every outbound call with a timeout and a catch-all:

```python
# base_agent.py:22-34
async def _call_llm(self, prompt: str, response_model: Type[BaseModel],
                    system_prompt: str = "", timeout: int = 120) -> BaseModel:
    try:
        return await asyncio.wait_for(
            self.llm_service.get_structured_response(
                prompt=prompt, response_model=response_model, system_prompt=system_prompt
            ),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        raise AgentError(f"{self.name}: LLM call timed out after {timeout}s")
    except Exception as e:
        raise AgentError(f"{self.name}: LLM call failed: {e}")
```

**Key design decisions:**

1. **Uniform `AgentError` wrapping** -- both timeout and arbitrary exceptions are converted into `AgentError`. This means upstream code never has to distinguish between "the LLM was slow" and "the LLM returned garbage." Both propagate identically.
2. **120-second default timeout** (`base_agent.py:23`, `base_agent.py:36`) -- every LLM call has a hard 2-minute ceiling via `asyncio.wait_for`.
3. **No retry** -- if the call fails once, it fails. There is no backoff or retry loop at this layer.

The same pattern exists for unstructured text calls:

```python
# base_agent.py:36-45
async def _call_llm_text(self, system: str, user: str, timeout: int = 120) -> str:
    try:
        return await asyncio.wait_for(
            self.llm_service.get_completion(system=system, user=user),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        raise AgentError(f"{self.name}: LLM call timed out after {timeout}s")
    except Exception as e:
        raise AgentError(f"{self.name}: LLM call failed: {e}")
```

#### Layer 2: Per-Agent Internal Error Handling

Each agent has its own `try/except` inside `execute()` that catches failures from `_call_llm` and decides what to return. The behavior differs by agent:

**Document Parser -- returns empty with error flag:**

```python
# document_parser.py:25-33
try:
    result = await self._call_llm(prompt, ExtractionResult)
    return {
        "citations": [c.model_dump() for c in result.citations],
        "facts": [f.model_dump() for f in result.facts],
    }
except Exception as e:
    self.logger.error(f"Extraction failed: {e}")
    return {"citations": [], "facts": [], "error": str(e)}
```

The parser returns an empty list for `citations` on failure. This is critical because the orchestrator checks `parse_result.get("citations", [])` at `orchestrator.py:79` -- an empty citations list means downstream agents have nothing to work with.

**Citation Verifier -- per-citation graceful fallback:**

```python
# citation_verifier.py:48-58
except Exception as e:
    self.logger.warning(f"Failed to verify citation: {e}")
    verified = VerifiedCitation(
        citation=citation,
        is_supported=False,
        confidence=0.0,
        discrepancies=[],
        status=VerificationStatus.COULD_NOT_VERIFY,
        notes=f"Verification failed: {e}",
    )
    return verified.model_dump()
```

Individual citation failures produce a `COULD_NOT_VERIFY` entry with zero confidence. The citation still appears in the final report -- it is not silently dropped. This is the **partial failure** pattern: one citation failing does not kill the entire verification pass.

Additionally, the `execute()` method in `citation_verifier.py:72-90` uses `asyncio.gather(..., return_exceptions=True)` to run all citation verifications in parallel and then handles any exception results in a post-processing loop:

```python
# citation_verifier.py:72-90
results = await asyncio.gather(
    *(self._verify_one(cit, case_context) for cit in citations),
    return_exceptions=True,
)
# Replace any unexpected exceptions with error entries
final = []
for i, r in enumerate(results):
    if isinstance(r, Exception):
        self.logger.warning(f"Citation {i} verification raised: {r}")
        final.append(VerifiedCitation(
            citation=citations[i],
            is_supported=False,
            confidence=0.0,
            status=VerificationStatus.COULD_NOT_VERIFY,
            notes=f"Verification failed: {r}",
        ).model_dump())
    else:
        final.append(r)
return final
```

This is a **double safety net**: `_verify_one` already catches exceptions internally (Layer 2), but if something leaks past that (e.g., a bug in the Pydantic model construction), the `gather` loop catches it again.

**Fact Checker -- returns empty list on failure:**

```python
# fact_checker.py:83-85
except Exception as e:
    self.logger.error(f"Fact checking failed: {e}")
    return []
```

Unlike the citation verifier, the fact checker does not have per-item fallback. If the single LLM call at `fact_checker.py:50` fails, the entire fact-checking result is an empty list. Individual malformed facts within a successful response are handled separately:

```python
# fact_checker.py:80-81
except Exception as item_err:
    self.logger.warning(f"Skipping malformed fact: {item_err}")
```

**Report Synthesizer -- returns zeroed scores on failure:**

```python
# report_synthesizer.py:57-63
except Exception as e:
    self.logger.error(f"Synthesis failed: {e}")
    return {
        "top_findings": [],
        "confidence_scores": {"citation_verification": 0, "fact_consistency": 0, "overall": 0},
        "unknown_issues": [f"Synthesis failed: {e}"],
    }
```

**Judicial Memo -- returns fallback memo on failure:**

```python
# judicial_memo.py:43-49
except Exception as e:
    self.logger.error(f"Judicial memo generation failed: {e}")
    return JudicialMemo(
        memo=f"Memo generation failed: {e}",
        key_issues=[],
        recommended_actions=[],
        overall_assessment="Unable to assess",
    ).model_dump()
```

#### Layer 3: Orchestrator-Level Exception Handling

The orchestrator (`orchestrator.py`) wraps each agent invocation and converts failures into degraded-but-valid pipeline state.

**Parser failure is immediately fatal:**

```python
# orchestrator.py:77-93
try:
    parse_result = await self.parser.execute(docs)
    citations = parse_result.get("citations", [])
    _succeed(parser_st, t0)
    logger.info(f"Extracted {len(citations)} citations")
except Exception as e:
    _fail(parser_st, t0, e)
    logger.error(f"Parser failed: {e}")
    # Can't continue without citations -- return error report
    return json.loads(VerificationReport(
        motion_id=motion_id,
        timestamp=datetime.now(),
        confidence_scores=ConfidenceScores(),
        unknown_issues=[f"Parser failed: {e}"],
        pipeline_status=pipeline_status,
        metadata={"documents_analyzed": list(docs.keys()), "error": str(e)},
    ).model_dump_json())
```

This is the **only** place where the pipeline short-circuits entirely. The comment at `orchestrator.py:85` explains why: "Can't continue without citations." If the parser cannot extract citations, the citation verifier has nothing to verify, the fact checker has no facts to cross-reference, and the synthesizer has nothing to synthesize. Rather than running three more agents on empty data, the orchestrator returns a Level 4 error report immediately.

**Parallel agent failures are tolerated via `asyncio.gather`:**

```python
# orchestrator.py:110-127
citation_results, fact_results = await asyncio.gather(
    citation_task, fact_task, return_exceptions=True
)

# Handle exceptions from parallel tasks
if isinstance(citation_results, Exception):
    _fail(cit_st, cit_t0, citation_results)
    logger.error(f"Citation verification failed: {citation_results}")
    citation_results = []
else:
    _succeed(cit_st, cit_t0)

if isinstance(fact_results, Exception):
    _fail(fact_st, fact_t0, fact_results)
    logger.error(f"Fact checking failed: {fact_results}")
    fact_results = []
else:
    _succeed(fact_st, fact_t0)
```

The `return_exceptions=True` at `orchestrator.py:111` is the critical flag. Without it, `asyncio.gather` would raise the first exception and cancel the other task. With it, exceptions are returned as values, allowing both tasks to complete (or fail) independently.

**Synthesizer failure produces a minimal report:**

```python
# orchestrator.py:134-148
try:
    synthesis = await self.synthesizer.execute({
        "citation_results": citation_results,
        "fact_results": fact_results,
    })
    _succeed(synth_st, t0)
except Exception as e:
    _fail(synth_st, t0, e)
    logger.error(f"Synthesis failed: {e}")
    # Build minimal report from raw verified data
    synthesis = {
        "top_findings": [],
        "confidence_scores": {"citation_verification": 0, "fact_consistency": 0, "overall": 0},
        "unknown_issues": [f"Synthesis failed: {e}"],
    }
```

**Memo failure is silently tolerated:**

```python
# orchestrator.py:156-168
memo_data = None
try:
    memo_data = await self.memo_agent.execute({
        "top_findings": top_findings,
        "confidence_scores": confidence_scores,
        "case_context": case_context,
    })
    _succeed(memo_st, t0)
except Exception as e:
    _fail(memo_st, t0, e)
    logger.error(f"Judicial memo failed: {e}")
```

When memo generation fails, `memo_data` stays `None`. At `orchestrator.py:179`, this is handled:

```python
judicial_memo=JudicialMemo(**memo_data) if memo_data else None,
```

The final report simply omits the judicial memo field. This is Level 1 degradation.

#### Layer 4: Status Tracking Infrastructure

The four helper functions at the top of `orchestrator.py` provide real-time status tracking:

```python
# orchestrator.py:22-42
def _track(statuses: List[AgentStatus], name: str) -> AgentStatus:
    """Create and register an AgentStatus entry."""
    entry = AgentStatus(agent_name=name, status="pending")
    statuses.append(entry)
    return entry


def _start(entry: AgentStatus) -> float:
    entry.status = "running"
    return time.time()


def _succeed(entry: AgentStatus, t0: float):
    entry.status = "success"
    entry.duration_ms = int((time.time() - t0) * 1000)


def _fail(entry: AgentStatus, t0: float, err: Exception):
    entry.status = "failed"
    entry.error = str(err)
    entry.duration_ms = int((time.time() - t0) * 1000)
```

Every agent goes through the lifecycle: `pending` -> `running` -> `success` | `failed`. The `pipeline_status` list is always included in the final `VerificationReport` (even error reports at `orchestrator.py:91`), so the caller can see exactly which agents succeeded and which failed, with timing and error details.

**Example `pipeline_status` output when fact checker fails:**

```json
[
  {"agent_name": "document_parser", "status": "success", "duration_ms": 3420},
  {"agent_name": "citation_verifier", "status": "success", "duration_ms": 8910},
  {"agent_name": "fact_checker", "status": "failed", "error": "fact_checker: LLM call timed out after 120s", "duration_ms": 120034},
  {"agent_name": "report_synthesizer", "status": "success", "duration_ms": 2100},
  {"agent_name": "judicial_memo", "status": "success", "duration_ms": 1800}
]
```

---

### Expert: Failure Taxonomy and Production Gaps

#### Complete Failure Taxonomy

Every failure in this system falls into one of four categories:

| Category | Examples | Current Handling | Recovery Strategy |
|----------|----------|-----------------|-------------------|
| **Transient** | Timeout (`asyncio.TimeoutError`), rate limit (429), network blip | Wrapped as `AgentError`, no retry | Should retry with exponential backoff |
| **Permanent** | Bad JSON from LLM, Pydantic validation error, missing required field | Wrapped as `AgentError`, logged | Correct; no point retrying |
| **Partial** | One citation out of 15 fails verification | `COULD_NOT_VERIFY` entry with 0.0 confidence | Correct; other citations proceed |
| **Total** | Agent crashes (import error, OOM, unhandled exception type) | `asyncio.gather` catches via `return_exceptions=True` | Empty list substituted |

**The system currently treats all four identically** -- every failure becomes an `AgentError` string at `base_agent.py:32-34`. This means a transient timeout (which might succeed on retry) gets the same treatment as a permanent validation error (which will never succeed).

#### Why Parser Failure Is Immediately Fatal

The parser occupies a unique position in the dependency graph. Every downstream agent depends on its output:

```
Parser output --> citations --> Citation Verifier
Parser output --> docs (already loaded, but no structure) --> Fact Checker (uses raw docs)
```

Wait -- the fact checker actually uses raw documents (`orchestrator.py:108`), not parsed citations. So why is parser failure fatal for the entire pipeline?

The answer is at `orchestrator.py:79`:

```python
citations = parse_result.get("citations", [])
```

If the parser fails (exception at `orchestrator.py:78`), the orchestrator returns immediately at `orchestrator.py:86-93`. It never reaches the parallel stage. The fact checker *could* theoretically run on raw documents even without parsed citations, but the current architecture does not attempt this. This is a deliberate design choice: a failed parser means the system cannot provide citation verification, which is the core value proposition. Running fact-checking alone would produce an incomplete report that might mislead the user about the thoroughness of the analysis.

#### What Happens When BOTH Parallel Agents Fail

This is a critical edge case. When both `citation_results` and `fact_results` are exceptions:

1. `orchestrator.py:115-118`: `citation_results` becomes `[]`
2. `orchestrator.py:122-125`: `fact_results` becomes `[]`
3. `orchestrator.py:135-138`: The synthesizer receives `{"citation_results": [], "fact_results": []}`
4. The synthesizer calls the LLM with two empty JSON arrays
5. The LLM generates a synthesis of... nothing

The synthesizer prompt at `report_synthesizer.py:25-28` receives:

```python
prompt = REPORT_SYNTHESIS_PROMPT.format(
    citation_results=json.dumps(citation_results, indent=2, default=str)[:10000],  # "[]"
    fact_results=json.dumps(fact_results, indent=2, default=str)[:10000],          # "[]"
)
```

The LLM will likely return empty findings and zero scores, which is the correct behavior -- but it wastes an LLM call to arrive at this conclusion. The orchestrator does not short-circuit when both inputs are empty.

**The resulting report would look like:**

```json
{
  "motion_id": "Rivera_v_Harmon_MSJ",
  "verified_citations": [],
  "verified_facts": [],
  "confidence_scores": {"citation_verification": 0, "fact_consistency": 0, "overall": 0},
  "top_findings": [],
  "unknown_issues": [],
  "pipeline_status": [
    {"agent_name": "document_parser", "status": "success"},
    {"agent_name": "citation_verifier", "status": "failed", "error": "..."},
    {"agent_name": "fact_checker", "status": "failed", "error": "..."},
    {"agent_name": "report_synthesizer", "status": "success"},
    {"agent_name": "judicial_memo", "status": "success"}
  ]
}
```

Note: synthesizer and memo show "success" even though they operated on empty data. The `pipeline_status` reveals the truth, but `unknown_issues` may be empty (since the synthesizer did not itself fail). This is a gap -- the orchestrator should inject failure notices into `unknown_issues` when upstream agents fail.

#### Detailed Degradation Walkthrough

**Level 0 -- Full Success:**
All five agents succeed. The report contains verified citations, verified facts, findings with confidence scores, and a judicial memo. The `pipeline_status` shows all `"success"`.

**Level 1 -- No Memo:**
The judicial memo agent fails at `orchestrator.py:166-168`. The orchestrator sets `memo_data = None` (initialized at `orchestrator.py:158`). At `orchestrator.py:179`:

```python
judicial_memo=JudicialMemo(**memo_data) if memo_data else None,
```

The report is complete except the `judicial_memo` field is `null`. Everything else (citations, facts, findings, scores) is present.

**Level 2 -- Partial Verification:**
One of the parallel agents fails. Either `citation_results` or `fact_results` is replaced with `[]` at `orchestrator.py:118` or `orchestrator.py:125`. The synthesizer operates on one real dataset and one empty list. The confidence scores will reflect the gap (e.g., `fact_consistency: 0` if fact checker failed). The `pipeline_status` shows which agent failed.

**Level 3 -- Raw Data Only:**
Both parallel agents fail AND the synthesizer also fails (or produces empty output). The report contains only metadata from `orchestrator.py:181-185`:

```python
metadata={
    "documents_analyzed": list(docs.keys()),
    "citations_extracted": len(citations),
    "pipeline": "document_parser -> [citation_verifier || fact_checker] -> report_synthesizer -> judicial_memo",
},
```

The user sees which documents were loaded and how many citations were extracted, but no verification or analysis.

**Level 4 -- Error Report:**
The parser fails. The orchestrator returns immediately at `orchestrator.py:86-93` with a skeleton `VerificationReport`:

```python
return json.loads(VerificationReport(
    motion_id=motion_id,
    timestamp=datetime.now(),
    confidence_scores=ConfidenceScores(),
    unknown_issues=[f"Parser failed: {e}"],
    pipeline_status=pipeline_status,
    metadata={"documents_analyzed": list(docs.keys()), "error": str(e)},
).model_dump_json())
```

`ConfidenceScores()` uses Pydantic defaults (all zeros or defaults). The only useful information is the document list and the error message.

---

### Expert: Production Gaps and Missing Patterns

#### Gap 1: No Circuit Breaker Pattern

**Current state:** Every request runs the full pipeline regardless of recent failure history. If the LLM provider is down, every request will wait 120 seconds (the default timeout at `base_agent.py:23`) before failing.

**What's missing:** A circuit breaker that tracks failure rates and "opens" after N consecutive failures, immediately returning an error without attempting the LLM call.

**Production implementation:**

```python
class CircuitBreaker:
    """Three-state circuit breaker: closed (normal), open (failing fast), half-open (testing)."""

    def __init__(self, failure_threshold: int = 5, recovery_timeout: float = 60.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = 0.0
        self.state = "closed"  # closed | open | half-open

    def record_success(self):
        self.failure_count = 0
        self.state = "closed"

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "open"

    def can_execute(self) -> bool:
        if self.state == "closed":
            return True
        if self.state == "open":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "half-open"
                return True
            return False
        # half-open: allow one request to test recovery
        return True
```

**Where to integrate:** In `BaseAgent._call_llm()` before `asyncio.wait_for()`. Each agent instance would maintain its own circuit breaker, so a citation verifier outage does not block the fact checker.

#### Gap 2: No Retry with Backoff

**Current state:** A single failure at `base_agent.py:31-34` is final. Transient errors (network blips, rate limits) are treated the same as permanent errors.

**What's missing:** Exponential backoff with jitter for transient errors:

```python
async def _call_llm_with_retry(self, prompt, response_model,
                                max_retries=3, base_delay=1.0):
    for attempt in range(max_retries + 1):
        try:
            return await self._call_llm(prompt, response_model)
        except AgentError as e:
            if attempt == max_retries:
                raise
            if self._is_transient(e):
                delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                self.logger.warning(f"Transient error, retry {attempt+1} in {delay:.1f}s: {e}")
                await asyncio.sleep(delay)
            else:
                raise  # Permanent errors should not be retried

    def _is_transient(self, error: AgentError) -> bool:
        msg = str(error).lower()
        return any(kw in msg for kw in ["timeout", "429", "rate limit", "connection"])
```

**Impact:** Without retry, a single network hiccup causes an entire agent to report failure, even though a retry 2 seconds later would likely succeed. For a system processing legal documents where accuracy matters, this is a significant gap.

#### Gap 3: Timeout Is Too Long (120 Seconds)

**Current state:** The default timeout is 120 seconds at `base_agent.py:23` and `base_agent.py:36`. This means:

- A single timed-out citation verification blocks the citation verifier for 2 minutes
- If 15 citations are verified in parallel and the LLM is slow, all 15 run their own 120-second timeout
- The parallel stage (`orchestrator.py:110-112`) has no aggregate timeout -- if both agents each take 119 seconds, the parallel stage takes 119 seconds (since they run concurrently), but there is no explicit cap on the overall pipeline duration

**What's missing:**

| Timeout Level | Current | Recommended | Rationale |
|---------------|---------|-------------|-----------|
| Per-LLM call | 120s | 30s | Single LLM structured output should complete in < 20s |
| Per-agent aggregate | None | 60s | Citation verifier running 15 parallel calls should complete in 60s |
| Pipeline total | None | 180s | User-facing request should not hang for > 3 minutes |
| Per-citation | 120s | 15s | Individual citation verification is a focused task |

**Production implementation:** Wrap the `asyncio.gather` in the orchestrator with its own `asyncio.wait_for`:

```python
# Proposed: orchestrator.py parallel stage with aggregate timeout
try:
    citation_results, fact_results = await asyncio.wait_for(
        asyncio.gather(citation_task, fact_task, return_exceptions=True),
        timeout=90,  # 90-second cap on the entire parallel stage
    )
except asyncio.TimeoutError:
    logger.error("Parallel verification stage timed out after 90s")
    citation_results = []
    fact_results = []
```

#### Gap 4: No Alerting or Health Check

**Current state:** Failures are logged via Python's `logging` module. There is no structured error reporting, no health check endpoint, and no alerting mechanism.

**What's missing:**

1. **Structured error reporting:** Failures should emit structured events (not just log lines) that can be consumed by monitoring systems:

```python
# Proposed: structured failure event
{
    "event": "agent_failure",
    "agent": "citation_verifier",
    "error_type": "timeout",
    "duration_ms": 120034,
    "pipeline_id": "Rivera_v_Harmon_MSJ",
    "timestamp": "2026-03-06T14:23:01Z",
    "retry_attempted": false,
    "circuit_breaker_state": "closed"
}
```

2. **Health check endpoint:** A `/health` endpoint that reports:
   - LLM provider reachability (can we ping the API?)
   - Circuit breaker states for each agent
   - Recent failure rates (last 5 min, last 1 hour)
   - Average response times per agent

3. **Asymmetric failure alerting:** Not all failures are equal. A parser failure (Level 4 degradation) should trigger an immediate alert. A single citation verification failure (partial) should only alert if the failure rate exceeds a threshold:

| Failure | Alert Level | Threshold |
|---------|------------|-----------|
| Parser failure | Critical | Any occurrence |
| Both parallel agents fail | High | Any occurrence |
| Single parallel agent fail | Medium | > 3 in 5 minutes |
| Synthesizer failure | Medium | > 2 in 5 minutes |
| Memo failure | Low | > 5 in 5 minutes |
| Single citation fail | Info | > 20% failure rate |

#### Gap 5: No Failure Budget

**Current state:** The pipeline does not track cumulative degradation. If 14 out of 15 citations fail verification, the pipeline still reports "success" for the citation verifier agent (because `execute()` returns a list with 14 `COULD_NOT_VERIFY` entries and 1 verified entry -- no exception is raised).

**What's missing:** A failure budget that triggers degradation when partial failures exceed a threshold:

```python
# Proposed: failure budget check in citation_verifier.py
failed_count = sum(1 for r in final if r.get("status") == "could_not_verify")
total_count = len(final)
if total_count > 0 and failed_count / total_count > 0.5:
    self.logger.warning(
        f"Citation verification failure budget exceeded: "
        f"{failed_count}/{total_count} ({failed_count/total_count:.0%}) failed"
    )
    # Optionally: raise AgentError to trigger orchestrator-level handling
```

#### Gap 6: Missing Short-Circuit for Empty Parallel Results

As discussed above, when both parallel agents fail, the orchestrator still calls the synthesizer and memo agent with empty data. This wastes two LLM calls. A production system should detect this:

```python
# Proposed: orchestrator.py after parallel stage
if not citation_results and not fact_results:
    logger.error("Both verification agents failed -- skipping synthesis")
    # Skip directly to building a degraded report
    return json.loads(VerificationReport(
        motion_id=motion_id,
        timestamp=datetime.now(),
        confidence_scores=ConfidenceScores(),
        unknown_issues=[
            f"Citation verification failed: {cit_st.error}",
            f"Fact checking failed: {fact_st.error}",
        ],
        pipeline_status=pipeline_status,
        metadata={"documents_analyzed": list(docs.keys())},
    ).model_dump_json())
```

---

### Expert: Per-Agent Status Tracking Deep Dive

The status tracking helpers are module-level functions in `orchestrator.py:22-42`, not methods on `PipelineOrchestrator`. This is a deliberate design choice: they are stateless utilities that operate on `AgentStatus` objects passed by reference.

**State machine for each agent:**

```
pending ──_start()──> running ──_succeed()──> success
                          │
                          └──_fail()──> failed
```

**Timing precision:** `_start()` returns `time.time()` (float seconds). `_succeed()` and `_fail()` compute `duration_ms` as `int((time.time() - t0) * 1000)`. This gives millisecond resolution but is subject to system clock precision. In production, `time.monotonic()` would be more appropriate to avoid issues with clock adjustments.

**Error capture:** `_fail()` at `orchestrator.py:39-42` stores `str(err)` in `entry.error`. This captures the exception message but not the traceback. For production debugging, storing `traceback.format_exc()` would be more useful:

```python
import traceback

def _fail(entry: AgentStatus, t0: float, err: Exception):
    entry.status = "failed"
    entry.error = str(err)
    entry.traceback = traceback.format_exc()  # Full stack trace
    entry.duration_ms = int((time.time() - t0) * 1000)
```

**Registration order:** The `_track()` function at `orchestrator.py:22-26` appends to `pipeline_status` in call order. The orchestrator calls `_track` in pipeline order:

1. `orchestrator.py:75`: `_track(pipeline_status, "document_parser")`
2. `orchestrator.py:99-100`: `_track(pipeline_status, "citation_verifier")` and `_track(pipeline_status, "fact_checker")`
3. `orchestrator.py:132`: `_track(pipeline_status, "report_synthesizer")`
4. `orchestrator.py:156`: `_track(pipeline_status, "judicial_memo")`

This means `pipeline_status` always has agents listed in execution order, making it easy for the frontend to render a pipeline visualization.

---

### Interview-Ready Summary

**Q: How does the BS Detector handle agent failures?**

A: Four-layer error handling. Layer 1: `BaseAgent._call_llm()` wraps every LLM call with a 120-second `asyncio.wait_for` timeout and catches all exceptions as `AgentError`. Layer 2: Each agent's `execute()` method catches `AgentError` and returns a degraded response (empty lists, zero scores, `COULD_NOT_VERIFY` status). Layer 3: The orchestrator uses `asyncio.gather(return_exceptions=True)` for parallel agents and wraps sequential agents in try/except, substituting fallback values on failure. Layer 4: Status tracking records pending/running/success/failed state with timing for every agent.

**Q: What's the degradation hierarchy?**

A: Five levels. Level 0 is full success. Level 1 drops the judicial memo (optional enrichment). Level 2 runs with partial verification data when one parallel agent fails. Level 3 returns raw metadata when synthesis fails. Level 4 returns immediately if the parser fails, since no downstream agent can function without parsed citations.

**Q: Why is parser failure immediately fatal?**

A: The parser extracts citations that drive the entire pipeline. Without citations, the citation verifier has nothing to verify. The orchestrator short-circuits at `orchestrator.py:86-93` rather than running three more agents on empty data. This is a deliberate design choice -- producing a report without citation verification would misrepresent the analysis's completeness.

**Q: What happens when both parallel agents fail?**

A: Both `citation_results` and `fact_results` are replaced with empty lists at `orchestrator.py:118,125`. The synthesizer then receives two empty arrays and calls the LLM anyway. This is a gap -- the orchestrator should short-circuit here to avoid wasting an LLM call. The resulting report has all-zero confidence scores and empty findings, but the `pipeline_status` array reveals which agents failed.

**Q: What production patterns are missing?**

A: Five major gaps. (1) No circuit breaker -- the system retries the full pipeline on every request even during outages, wasting 120 seconds per attempt. (2) No retry with backoff -- transient errors (timeouts, rate limits) are treated as permanent. (3) The 120-second timeout is too long for individual LLM calls and there is no aggregate pipeline timeout. (4) No structured alerting -- failures are logged but not surfaced to monitoring systems. (5) No failure budget -- if 14/15 citations fail, the agent still reports "success."

**Q: How would you add a circuit breaker?**

A: Implement a three-state circuit breaker (closed/open/half-open) per agent instance. After N consecutive failures, the breaker opens and immediately returns an error without calling the LLM. After a recovery timeout, it enters half-open state and allows one test request. On success, it resets to closed. Integrate it in `BaseAgent._call_llm()` before `asyncio.wait_for()`. Each agent maintains its own breaker so one agent's outage does not block others.

**Q: What about adaptive timeouts?**

A: Track a rolling average of successful LLM call durations per agent. Set the timeout to 3x the p95 latency. This means fast agents (like the memo generator, which typically runs ~2s) get a 6-second timeout instead of 120 seconds, allowing failures to surface faster. Slow agents (like the fact checker processing large documents) get a proportionally longer timeout based on observed behavior.


---

## 38. Eval Harness Complete Internals

### Beginner: What Does the Eval Harness Do?

The eval harness answers one question: **does the BS Detector actually catch the errors we planted?** It runs the full pipeline against test documents with known problems, then checks whether the output identifies each one. It also runs against *clean* documents to verify the system does not cry wolf.

There are **two independent eval systems** that complement each other:

| System | Entry Point | What It Measures |
|--------|-------------|------------------|
| Python harness (`run_evals.py`) | `python run_evals.py` | Recall, precision, hallucination, consistency, uncertainty, structure |
| Promptfoo YAML configs | `npx promptfoo eval` | Per-agent assertion suites, A/B prompt comparison, LLM-as-judge rubrics |

Both can run together (`python run_evals.py` triggers promptfoo at the end unless `--quick` is passed) or independently.

**Key concept: ground truth items.** Eight errors were deliberately planted in the Rivera v. Harmon test case. Each has an ID (D-01 through D-08), keywords to search for, and a `match_mode` that controls how detection is verified.

---

### Intermediate: Ground Truth, Matching, and Metrics

#### 38.1 The GROUND_TRUTH Registry

Defined at `run_evals.py:41-110`, the `GROUND_TRUTH` list contains 8 planted discrepancies. Each entry is a dict with these fields:

| Field | Type | Purpose |
|-------|------|---------|
| `id` | `str` | Identifier like `"D-01"` |
| `label` | `str` | Human-readable description |
| `keywords` | `list[str]` | Terms to search for in pipeline output |
| `require_also` | `list[str]` (optional) | Secondary signal words for `keyword_plus_signal` mode |
| `match_mode` | `"any"` or `"keyword_plus_signal"` | Matching strategy |
| `search_in` | `list[str]` | Which report sections to search: `"top_findings"`, `"verified_facts"`, `"verified_citations"` |
| `weight` | `int` | Importance weight for recall calculation (1 or 2) |

**Verbatim GROUND_TRUTH entries** (`run_evals.py:41-110`):

```python
GROUND_TRUTH = [
    {
        "id": "D-01",
        "label": "DATE: March 14 vs March 12 discrepancy",
        "keywords": ["march 12", "march 14", "date discrepancy", "date inconsisten"],
        "match_mode": "any",
        "search_in": ["top_findings", "verified_facts"],
        "weight": 2,
    },
    {
        "id": "D-02",
        "label": "PPE: Rivera was wearing harness (MSJ falsely claims no PPE)",
        "keywords": ["harness", "ppe", "hard hat", "protective equipment"],
        "require_also": ["contradict", "wearing", "false", "inconsisten", "not_supported"],
        "match_mode": "keyword_plus_signal",
        "search_in": ["top_findings", "verified_facts"],
        "weight": 2,
    },
    {
        "id": "D-03",
        "label": "PRIVETTE: 'never' misquotation not in actual holding",
        "keywords": ["privette"],
        "require_also": ["never", "presumpt", "misquot", "mischaract"],
        "match_mode": "keyword_plus_signal",
        "search_in": ["top_findings", "verified_citations"],
        "weight": 2,
    },
    {
        "id": "D-04",
        "label": "SOL: Statute of limitations uses wrong incident date",
        "keywords": ["362", "statute", "limitation", "time-bar"],
        "match_mode": "any",
        "search_in": ["top_findings", "verified_facts"],
        "weight": 1,
    },
    {
        "id": "D-05",
        "label": "CTRL: Harmon retained control - Donner directed work",
        "keywords": ["donner", "control", "directed"],
        "require_also": ["harmon", "foreman", "retain", "contradict"],
        "match_mode": "keyword_plus_signal",
        "search_in": ["top_findings", "verified_facts"],
        "weight": 2,
    },
    {
        "id": "D-06",
        "label": "JURISDICTION: Non-binding Texas/Florida citations",
        "keywords": ["dixon", "okafor", "texas", "florida"],
        "require_also": ["jurisdiction", "binding", "persuasive", "not binding"],
        "match_mode": "keyword_plus_signal",
        "search_in": ["top_findings", "verified_citations"],
        "weight": 1,
    },
    {
        "id": "D-07",
        "label": "SCAFFOLDING: Condition omission - rust/plywood documented",
        "keywords": ["rust", "plywood", "scaffolding condition", "defect", "base plate"],
        "match_mode": "any",
        "search_in": ["top_findings", "verified_facts"],
        "weight": 1,
    },
    {
        "id": "D-08",
        "label": "SPOLIATION: Post-incident scaffolding rebuild",
        "keywords": ["rebuilt", "new components", "replaced", "spoliation", "remedial"],
        "match_mode": "any",
        "search_in": ["top_findings", "verified_facts"],
        "weight": 1,
    },
]
```

**Weight distribution:** D-01, D-02, D-03, D-05 have weight 2 (critical); D-04, D-06, D-07, D-08 have weight 1 (medium). Total possible weight = 12.

#### 38.2 The `_check_ground_truth()` Algorithm

Defined at `run_evals.py:217-230`:

```python
def _check_ground_truth(report: dict, gt: dict) -> bool:
    texts = _extract_searchable_text(report, gt["search_in"])
    all_text = " ".join(texts)

    if gt["match_mode"] == "any":
        return any(kw in all_text for kw in gt["keywords"])

    elif gt["match_mode"] == "keyword_plus_signal":
        has_keyword = any(kw in all_text for kw in gt["keywords"])
        has_signal = any(sig in all_text for sig in gt.get("require_also", []))
        return has_keyword and has_signal

    return False
```

**Two matching modes:**

| Mode | Logic | Example |
|------|-------|---------|
| `"any"` | Any single keyword found in concatenated text = pass | D-01: finding "march 14" anywhere in top_findings or verified_facts = detected |
| `"keyword_plus_signal"` | Must find at least one keyword AND at least one signal from `require_also` | D-02: must find "harness" AND "contradict" in the same text blob |

**Why `keyword_plus_signal` exists:** For items like PPE (D-02), merely mentioning "harness" is not enough -- the pipeline must also indicate it's a *contradiction*. This prevents false matches where the system mentions PPE descriptively but fails to flag the inconsistency.

#### 38.3 The `_extract_searchable_text()` Pipeline

Defined at `run_evals.py:179-214`, this function converts structured report sections into searchable lowercase text blobs:

```python
def _extract_searchable_text(report: dict, sections: List[str]) -> List[str]:
    texts = []
    if "top_findings" in sections:
        for f in report.get("top_findings", []):
            evidence = f.get("evidence") or []
            blob = " ".join([
                f.get("description") or "",
                f.get("type") or "",
                " ".join(str(e) for e in evidence if e),
                f.get("recommendation") or "",
            ])
            texts.append(blob.lower())

    if "verified_facts" in sections:
        for vf in report.get("verified_facts", []):
            blob = " ".join([
                vf.get("summary") or "",
                (vf.get("fact") or {}).get("fact_text") or "",
                " ".join(s for s in (vf.get("contradictory_sources") or []) if s),
                vf.get("status") or "",
            ])
            texts.append(blob.lower())

    if "verified_citations" in sections:
        for vc in report.get("verified_citations", []):
            blob = " ".join([
                vc.get("notes") or "",
                " ".join(d for d in (vc.get("discrepancies") or []) if d),
                (vc.get("citation") or {}).get("citation_text") or "",
                (vc.get("citation") or {}).get("claimed_proposition") or "",
                vc.get("status") or "",
            ])
            texts.append(blob.lower())

    return texts
```

**Which fields feed which checks:**

| Section | Fields Concatenated Into Each Blob |
|---------|------------------------------------|
| `top_findings` | `description` + `type` + `evidence[*]` + `recommendation` |
| `verified_facts` | `summary` + `fact.fact_text` + `contradictory_sources[*]` + `status` |
| `verified_citations` | `notes` + `discrepancies[*]` + `citation.citation_text` + `citation.claimed_proposition` + `status` |

All text is `.lower()`'d before keyword matching. Each finding/fact/citation produces a separate blob, but `_check_ground_truth()` joins them all into one string with `" ".join(texts)`.

#### 38.4 Weighted Recall Formula

Defined at `run_evals.py:143-146`:

```python
def recall_score(self) -> float:
    total = sum(r.weight for r in self.recall_results)
    caught = sum(r.weight for r in self.recall_results if r.passed)
    return caught / total if total else 0.0
```

**Formula:** `weighted_recall = sum(weight for passed items) / sum(all weights)`

With current weights, denominator is always 12 (= 2+2+2+1+2+1+1+1). Catching all four weight-2 items but missing all weight-1 items gives recall = 8/12 = 67%.

The aggregate display (`run_evals.py:600-602`) prints both percentage and fraction:
```python
recall_caught = sum(r.weight for r in summary.recall_results if r.passed)
recall_total = sum(r.weight for r in summary.recall_results)
print(f"  Recall:            {recall:.0%}  ({recall_caught}/{recall_total} weighted)")
```

---

### Expert: All Assertions, Metrics Internals, and Persistence

#### 38.5 Complete Assertion Catalog (Python Harness)

The Python harness in `run_evals.py` runs **28 individual assertions** across 6 categories:

**Recall (8 checks)** -- `eval_recall()` at line 249-260:
Each of the 8 GROUND_TRUTH items becomes one `EvalResult`. Weight carried from ground truth.

**Precision (4 checks)** -- `eval_precision()` at lines 263-306:

| ID | Assertion | Threshold | Line |
|----|-----------|-----------|------|
| P-01 | Clean docs produce <=1 finding | `len(findings) <= 1` | 268-273 |
| P-02 | No contradictory facts on clean docs | `len(contradictory) == 0` | 276-284 |
| P-03 | No bad citations flagged on clean docs | `len(bad_citations) == 0` where status in `("not_supported", "misleading")` | 287-295 |
| P-04 | High overall confidence on clean docs | `overall >= 0.6` | 298-304 |

**Hallucination (4 checks)** -- `eval_hallucinations()` at lines 309-373:

| ID | Assertion | Logic | Line |
|----|-----------|-------|------|
| H-01 | No fabricated case names | Checks 6 hardcoded fake names against `verified_citations` JSON | 313-324 |
| H-02 | Citations reference known cases | At least 2 of 8 `KNOWN_CASE_NAMES` found in citation text | 328-342 |
| H-03 | >=50% findings grounded with evidence | Each finding must have at least one evidence item >10 chars | 345-361 |
| H-04 | No invented document types | Checks for "deposition", "expert report", "surveillance", "tax return" | 364-371 |

The fabricated name list (`run_evals.py:315-318`):
```python
fabricated_names = [
    "smith v. jones", "garcia v. acme", "wilson v. buildright",
    "johnson v. safety", "martinez v. construct", "brown v. steel",
]
```

The known case names (`run_evals.py:113-116`):
```python
KNOWN_CASE_NAMES = [
    "privette", "seabright", "whitmore", "kellerman",
    "dixon", "okafor", "rivera", "harmon",
]
```

**Cross-Document Consistency (5 checks)** -- `eval_cross_document_consistency()` at lines 376-436:

| ID | Assertion | Logic | Line |
|----|-----------|-------|------|
| C-01 | Facts cross-reference multiple documents | At least 1 fact has `contradictory_sources` or >1 `supporting_sources` | 381-389 |
| C-02 | Pipeline references police report | "police" appears in any fact's `contradictory_sources` or `supporting_sources` | 393-402 |
| C-03 | Pipeline references witness statement | "witness" appears in sources | 405-414 |
| C-04 | Pipeline references medical records | "medical" appears in sources | 417-426 |
| C-05 | All 4 document types analyzed | `metadata.documents_analyzed` has length 4 | 429-434 |

**Uncertainty Expression (4 checks)** -- `eval_uncertainty()` at lines 439-483:

| ID | Assertion | Logic | Line |
|----|-----------|-------|------|
| U-01 | At least one citation has confidence < 1.0 | Checks `confidence` field on `verified_citations` | 444-452 |
| U-02 | Confidence scores show appropriate spread | Not all 1.0 AND not all 0.0 | 455-461 |
| U-03 | Unknown issues list exists | `isinstance(unknown, list)` | 464-468 |
| U-04 | Flagged citations don't claim 100% confidence | No citation with `confidence==1.0` and status in `("not_supported", "misleading")` | 472-480 |

**Structure Validation (6 checks)** -- `eval_structure()` at lines 486-558:

| ID | Assertion | Logic | Line |
|----|-----------|-------|------|
| S-01 | Required top-level fields | `motion_id`, `verified_citations`, `verified_facts`, `top_findings`, `confidence_scores` | 491-498 |
| S-02 | Citations are structured objects | Each citation has a nested `citation` dict, not raw text | 501-509 |
| S-03 | Facts are structured objects | Each fact has a nested `fact` dict | 513-522 |
| S-04 | Confidence scores are valid [0,1] floats | Checks `citation_verification`, `fact_consistency`, `overall` | 525-533 |
| S-05 | Judicial memo is structured dict | `isinstance(memo, dict)` and `memo["memo"]` length > 50 | 537-547 |
| S-06 | Finding IDs present and unique | `len(ids) == len(set(ids)) == len(findings)` | 550-556 |

#### 38.6 Evidence Grounding Check (metrics.py)

`calculate_grounding()` at `metrics.py:59-109` verifies that pipeline findings reference actual source document text via **substring matching**:

```python
def calculate_grounding(findings, source_texts):
    combined_sources = normalize(" ".join(source_texts))
    grounded = 0

    for i, finding in enumerate(findings):
        evidence = finding.get("evidence", [])
        is_grounded = False
        for ev in evidence:
            ev_normalized = normalize(ev_text)
            # Primary check: 10+ char substring
            if len(ev_normalized) >= 10 and ev_normalized in combined_sources:
                is_grounded = True
                break
            # Fallback: 15+ char sentence fragments
            for fragment in ev_normalized.split("."):
                fragment = fragment.strip()
                if len(fragment) >= 15 and fragment in combined_sources:
                    is_grounded = True
                    break
```

**Two-tier substring matching:**
1. If the entire normalized evidence string (>=10 chars) is a substring of the combined source text: grounded
2. If any period-delimited fragment (>=15 chars) is a substring: grounded

The grounding rate = `grounded / total` findings. Ungrounded items are tracked with index and truncated description for debugging.

#### 38.7 Keyword Metrics (metrics.py)

`calculate_metrics()` at `metrics.py:21-56` implements the secondary keyword-based evaluation used by `harness.py`:

```python
def finding_matches_discrepancy(finding, discrepancy):
    finding_text = normalize(
        f"{finding.get('description', '')} {finding.get('type', '')} "
        f"{' '.join(finding.get('evidence', []))}"
    )
    keywords = discrepancy.get("keywords", [])
    matches = sum(1 for kw in keywords if kw in finding_text)
    return matches >= 2  # At least 2 keyword matches
```

This is stricter than `_check_ground_truth()` in `run_evals.py` -- it requires **at least 2 keyword matches** per finding (vs. "any" mode which requires only 1). The `harness.py` path uses this for the `KNOWN_DISCREPANCIES` list from `test_cases.py`, which is a parallel ground truth registry with richer metadata (expected reasoning, evidence dicts, categories).

Standard precision/recall/F1 formulas:
- `precision = TP / (TP + FP)`
- `recall = TP / (TP + FN)`
- `F1 = 2 * precision * recall / (precision + recall)`
- `false_discovery_rate = FP / total_findings`

#### 38.8 LLM-as-Judge (llm_judge.py)

Defined at `llm_judge.py:1-117`. Activated via `LLM_JUDGE=1` environment variable (`harness.py:124`).

**System prompt** (`llm_judge.py:12-18`):
```python
JUDGE_SYSTEM_PROMPT = """You are an evaluation judge for a legal brief verification system.
You will compare a pipeline finding against a ground truth discrepancy and determine if they match.

A match means the finding correctly identifies the same issue described in the ground truth,
even if it uses different wording. Focus on semantic equivalence, not exact keyword matching.

Respond with JSON: {"match": true/false, "confidence": 0.0-1.0, "reasoning": "..."}"""
```

**User prompt template** (`llm_judge.py:20-36`) -- provides the judge with:
- Ground truth: ID, description, category, expected evidence, expected reasoning
- Pipeline finding: description, type, evidence, confidence
- Three evaluation criteria: same factual/legal issue? Similar evidence? Would a legal professional agree?

**Confidence threshold** (`llm_judge.py:94`):
```python
if result["match"] and result["confidence"] >= 0.5:
    matched_gt.add(j)
    matched_findings.add(i)
    break
```

A finding-to-ground-truth match requires `match: true` AND `confidence >= 0.5`. The first match wins (greedy assignment with `break`), and matched ground truth items are skipped for subsequent findings (`if j in matched_gt: continue` at line 87).

**Temperature:** 0.0 for deterministic judging (`llm_judge.py:62`).

#### 38.9 Combined Metrics: Union Strategy (metrics.py)

`calculate_combined_metrics()` at `metrics.py:112-143` merges keyword and LLM-judge results:

```python
def calculate_combined_metrics(keyword_metrics, llm_metrics):
    kw_matched = set(keyword_metrics.get("matched_discrepancies", []))
    llm_matched = set(llm_metrics.get("llm_matched_discrepancies", []))
    combined_matched = kw_matched | llm_matched  # UNION
```

**Union strategy:** A discrepancy is considered detected if **either** the keyword matcher or the LLM judge found it. This compensates for keyword matching's false negatives (e.g., a finding that uses different terminology than expected keywords) and the LLM judge's potential false negatives (e.g., low confidence on a valid match).

Output includes diagnostic breakdowns:
- `keyword_only`: matched by keywords but not LLM
- `llm_only`: matched by LLM but not keywords
- `both`: agreed by both methods
- `combined_missed`: missed by both

#### 38.10 SQLite Persistence (db.py)

Defined at `evals/db.py:1-135`. Every eval run is persisted to `evals/evals.db`.

**WAL mode** (`db.py:39`):
```python
conn.execute("PRAGMA journal_mode=WAL")
```
Write-Ahead Logging enables concurrent reads during writes -- important if the eval runner and a dashboard query the DB simultaneously.

**Schema** (`db.py:41-57`):
```sql
CREATE TABLE IF NOT EXISTS eval_runs (
    run_id             TEXT PRIMARY KEY,
    timestamp          TEXT NOT NULL,
    git_sha            TEXT,
    precision          REAL,
    recall             REAL,
    f1_score           REAL,
    hallucination_rate REAL,
    true_positives     INTEGER,
    false_positives    INTEGER,
    false_negatives    INTEGER,
    metrics            TEXT NOT NULL,   -- full JSON blob
    findings           TEXT NOT NULL,   -- full JSON blob
    report             TEXT             -- full pipeline report JSON
)
```

**Git SHA tracking** (`db.py:19-28`):
```python
def _get_git_sha() -> Optional[str]:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, timeout=3,
        )
        return result.stdout.strip() if result.returncode == 0 else None
    except Exception:
        return None
```

This links each eval run to the exact code commit, enabling regression tracking across deploys. The 3-second timeout prevents hangs in non-git environments.

**Retrieval** (`db.py:111-134`): `get_runs(limit=10)` returns the N most recent runs ordered by timestamp DESC, with JSON columns (`metrics`, `findings`, `report`) deserialized back to Python objects.

#### 38.11 Clean Document Precision Test

The clean documents are defined in `test_cases.py:118-159` as `CLEAN_DOCUMENTS` -- a dict with keys `msj`, `police_report`, `medical_records`, `witness_statement`. They describe a completely consistent, uneventful case ("Smith v. ABC Corp") where:

- All documents agree on the date (June 15, 2022)
- All documents confirm PPE was worn
- No safety violations, no injuries, no contradictions

The precision tests (`run_evals.py:263-306`) expect:
- P-01: At most 1 top finding (ideally 0)
- P-02: Zero contradictory facts
- P-03: Zero not_supported/misleading citations
- P-04: Overall confidence >= 0.6

#### 38.12 The Harness Runner (harness.py)

`evals/harness.py` is the **original eval runner** that predates `run_evals.py`. It uses the `KNOWN_DISCREPANCIES` list from `test_cases.py` (8 items with rich metadata) rather than the `GROUND_TRUTH` list in `run_evals.py`.

Key differences from `run_evals.py`:

| Aspect | `run_evals.py` | `harness.py` |
|--------|----------------|--------------|
| Ground truth source | `GROUND_TRUTH` (in-file) | `KNOWN_DISCREPANCIES` (test_cases.py) |
| Matching | `_check_ground_truth()` with "any" and "keyword_plus_signal" | `finding_matches_discrepancy()` requiring >=2 keyword matches |
| Findings extraction | Direct from `report["top_findings"]` | `extract_findings()` also pulls from flagged `verified_citations` and `verified_facts` |
| LLM-as-judge | Not integrated | Integrated via `LLM_JUDGE=1` |
| Grounding | Not checked | `calculate_grounding()` against source .txt files |
| Combined metrics | Not computed | Union of keyword + LLM matches |
| Persistence | Not integrated | Saves to SQLite |

`extract_findings()` at `harness.py:26-59` enriches the finding set by pulling in:
1. All `top_findings` directly
2. `verified_citations` with status `not_supported`, `misleading`, or `could_not_verify`
3. `verified_facts` with status `contradictory`, `partial`, or `could_not_verify`

This gives the keyword matcher more surface area to detect ground truth items.

---

### Expert: Promptfoo Configuration Deep Dive

#### 38.13 Root Promptfoo Config (promptfooconfig.yaml)

Two promptfoo configs exist:

1. **`backend/promptfooconfig.yaml`** -- the root config invoked by `run_evals.py:634`:
   ```python
   cmd = ["npx", "promptfoo", "eval", "--no-cache", "--config", "promptfooconfig.yaml"]
   result = subprocess.run(cmd, check=False, cwd=_BACKEND_DIR)
   ```
   Uses a Python provider (`evals/provider.py`) that runs the full pipeline and returns the complete report. Tests are JavaScript assertions checking structural properties and discrepancy detection against the live pipeline output.

2. **`evals/promptfoo/*.yaml`** -- individual per-agent configs for isolated testing.

**Root config test categories:**

| Category | Tests | What They Check |
|----------|-------|----------------|
| Structural (S-01 to S-07) | 7 | Required fields, citation/fact counts, confidence ranges, memo presence, metadata |
| Discrepancy (D-01 to D-08) | 8 | Each of the 8 planted errors, using JavaScript with structural location targeting |
| Quality (Q-01 to Q-05) | 5 | No fabricated cases, high-confidence findings exist, contradictions flagged, evidence grounding |
| Negative (N-01) | 1 | Clean docs produce <=1 finding, 0 contradictory facts, 0 bad citations |

The D-tests in promptfoo use a different search strategy than `_check_ground_truth()`. For example, D-02 (`promptfooconfig.yaml:77-87`):
```javascript
(() => {
  const tf = (output.report.top_findings || []).map(f =>
    (f.description || '').toLowerCase());
  const vf = (output.report.verified_facts || [])
    .filter(f => ['contradictory','partial','could_not_verify'].includes(f.status))
    .map(f => ((f.summary || '') + ' ' + ((f.fact || {}).fact_text || '')).toLowerCase());
  const all = tf.concat(vf);
  return all.some(t =>
    (t.includes('harness') || t.includes('hard hat') || t.includes('ppe')) &&
    (t.includes('contradict') || t.includes('wearing') || t.includes('false')));
})()
```

This explicitly filters `verified_facts` to only those with flagged status (`contradictory`, `partial`, `could_not_verify`) before keyword matching -- a tighter check than the Python harness which includes the status field in the searchable text blob.

#### 38.14 Per-Agent Promptfoo Configs

Five YAML configs test individual agents in isolation:

**1. Citation Extraction (`evals/promptfoo/citation-extraction.yaml`)**

Tests `DocumentParserAgent`'s extraction completeness. Provider: `deepseek-chat` at temperature 0.1.

| Test | Metrics | What It Asserts |
|------|---------|-----------------|
| "Finds Privette with fabricated 'never' quote" | `extract/finds_privette`, `extract/captures_never_quote`, `extract/finds_out_of_state_citations` | Extracts Privette citation, captures the "never" quote in context, finds Dixon + Okafor |
| "Must not invent citations absent from text" | `extract/finds_kellerman`, `extract/no_hallucinated_citations` | Finds Kellerman (which IS in text), does NOT hallucinate Privette or Dixon (which are NOT in text) |

**2. Fact Checking (`evals/promptfoo/fact-checking.yaml`)**

Tests `FactCheckerAgent`. Covers 6 ground truth items: DATE-001, PPE-001, CTRL-001, SCAF-001, POST-001, SOL-001. Each test case provides isolated MSJ facts plus relevant excerpts from police, medical, and witness documents.

Each test has 3 assertion types:
1. `is-json` -- valid JSON output
2. `javascript` -- keyword + status check (e.g., `f.status === 'contradictory'`)
3. `llm-rubric` -- semantic accuracy judged by DeepSeek at temperature 0.0

Example rubric for DATE-001 (`fact-checking.yaml:60-63`):
```yaml
- type: llm-rubric
  value: >-
    The response must identify the date discrepancy: the MSJ states March
    14, 2021 but the police report, medical records, and witness statement
    all record March 12, 2021. This should be marked contradictory.
  metric: date001/semantic_accuracy
```

**3. Prompt Precision A/B -- Citations (`evals/promptfoo/prompt-precision-citations.yaml`)**

Runs **two prompts** side-by-side:
- `prompts/citation_verification.txt` (precise)
- `prompts/citation_verification_imprecise.txt` (imprecise)

4 test cases with metrics across 4 dimensions:

| Dimension | Metrics | What Precise Prompt Should Win On |
|-----------|---------|-----------------------------------|
| Schema | `schema/valid_json`, `schema/has_is_supported`, `schema/enum_compliance` | Valid JSON with required fields and correct enum values |
| Recall | `recall/cit001_correct_status`, `recall/cit001_flags_never`, `recall/cit001_semantic` | Correctly flags Privette "never" misquote |
| Jurisdiction | `jurisdiction/flags_texas`, `jurisdiction/reasoning` | Flags Dixon as non-binding Texas case |
| Precision | `precision/no_false_flag`, `precision/correct_no_flag` | Does NOT false-flag a valid Privette presumption claim |
| Uncertainty | `uncertainty/expresses_doubt`, `uncertainty/no_hallucinated_verdict` | Hedges on fictitious "Marchetti v. Western Bay" citation |

The uncertainty test (`prompt-precision-citations.yaml:161-197`) uses a **completely fictitious citation** ("Marchetti v. Western Bay Developers, 12 Cal.App.5th 441 (2019)") to test whether the model fabricates a holding or appropriately says "could not verify."

Pass conditions for uncertainty:
```javascript
return r.status === 'could_not_verify' ||
       r.status === 'not_supported' ||
       r.is_supported === false ||
       (typeof r.confidence === 'number' && r.confidence < 0.5);
```

**4. Prompt Precision A/B -- Facts (`evals/promptfoo/prompt-precision-facts.yaml`)**

Runs `fact_checking.txt` vs `fact_checking_imprecise.txt`. 3 test cases (DATE-001, PPE-001, CTRL-001) with schema and recall metrics.

Key advantage of precise prompt documented in comments:
- DATE-001: "precise prompt has '1. DATE CONSISTENCY' as an explicit numbered category"
- PPE-001: "precise prompt has '2. PPE/SAFETY EQUIPMENT' as an explicit category"
- CTRL-001: "precise prompt has '3. WHO DIRECTED THE WORK' category"

**5. Reflection Honesty (`evals/promptfoo/reflection-honesty.yaml`)**

The most unusual eval -- it judges the project's own `REFLECTION.md` for intellectual honesty.

**Provider:** `python:providers/reflection_provider.py` (reads the file, no LLM cost for generation).

**Judge:** `deepseek-reasoner` (DeepSeek-R1) with `max_tokens: 8192`. The `showThinking: false` config suppresses chain-of-thought output in results (can be flipped to `true` for debugging).

**6 dimensions with weighted scoring:**

| Metric | Weight | What It Tests |
|--------|--------|---------------|
| `real_weaknesses` | 3 | Names specific technical failures, not just time constraints. Requires at least 2 genuine weaknesses with reproducible detail. |
| `qualified_numbers` | 2 | Quantitative claims include methodology or caveats. Unqualified precise numbers = fail. No numbers = pass by default. |
| `eval_self_critique` | 2 | Acknowledges eval methodology limitations. Must identify at least one way the evaluation could mislead. |
| `scope_honesty` | 1 | Distinguishes completed vs. partially implemented vs. descoped features. |
| `future_specificity` | 1 | Future work suggestions tied to specific observed failures. Generic "add more tests" = fail. |
| `not_performative` | 1 | No performative humility. "Of course in production..." without substance = fail. |

**Composite formula** (`reflection-honesty.yaml:97-101`):
```yaml
derivedMetrics:
  - name: honesty_composite
    value: >-
      (real_weaknesses * 3 + qualified_numbers * 2 + eval_self_critique * 2
      + scope_honesty * 1 + future_specificity * 1 + not_performative * 1) / 10
```

Total weight denominator = 3+2+2+1+1+1 = 10. `real_weaknesses` alone accounts for 30% of the composite score.

---

### Interview-Ready Summary

**Q: "Your eval only tests one case. How do you know it generalizes?"**

A: It does not -- and the harness is honest about that. The Rivera v. Harmon case is a planted-error regression test, not a statistical sample. The clean-docs precision test (Smith v. ABC) adds a second data point. The promptfoo per-agent configs test individual agent behaviors in isolation with varied inputs. The reflection honesty eval (`eval_self_critique` dimension) explicitly requires acknowledging this single-case limitation. For real generalization, you would need a corpus of real legal briefs with known errors -- which is expensive and legally sensitive to obtain.

**Q: "Keyword matching has false negatives. What if the pipeline finds the issue using different words?"**

A: Three mitigations:
1. `keyword_plus_signal` mode uses broad keyword sets plus signal words (e.g., D-02 checks for "harness" OR "ppe" OR "hard hat" OR "protective equipment" as keywords, combined with "contradict" OR "wearing" OR "false" OR "inconsisten" OR "not_supported" as signals)
2. `harness.py` supports LLM-as-judge (`LLM_JUDGE=1`) for semantic matching with confidence >= 0.5 threshold
3. Combined metrics use **union strategy** -- if either keyword or LLM judge detects a match, it counts
4. Promptfoo `llm-rubric` assertions provide semantic evaluation by a separate LLM judge for every test case

**Q: "Where are the adversarial tests?"**

A: The eval does not include adversarial inputs (e.g., prompt injection in legal documents, Unicode tricks, deliberately misleading formatting). The closest is the fictitious citation test ("Marchetti v. Western Bay") which tests whether the model fabricates holdings. The fabricated case name checks (H-01) verify the pipeline does not invent names like "Smith v. Jones." The clean-docs precision test verifies no false positives on benign input. True adversarial testing (e.g., a document that looks like a valid citation but contains injected instructions) remains a gap.

**Q: "How do you track eval regression across deploys?"**

A: SQLite persistence (`evals/db.py`) stores every run with git SHA, timestamp, and full metrics JSON. WAL mode enables concurrent reads. The `get_runs(limit)` API retrieves recent history ordered by timestamp. The promptfoo `--no-cache` flag ensures fresh pipeline runs. Git SHA tracking links each result to the exact commit.

**Q: "What is the difference between the two eval entry points?"**

A: `run_evals.py` is the comprehensive runner (28 Python assertions + promptfoo integration). `evals/harness.py` is the original runner with richer finding extraction, keyword+LLM-judge combined metrics, grounding checks, and SQLite persistence. They share ground truth data but use different matching algorithms and different ground truth registries (`GROUND_TRUTH` vs `KNOWN_DISCREPANCIES`). The duplication exists because `run_evals.py` was built as the streamlined "run everything" entry point while `harness.py` evolved as the detailed metrics workbench.


---

## 39. Citation Verification: From Demo to Production

### Beginner: What the System Does Today

The BS Detector's citation verification pipeline answers one question: **does the cited case actually say what the brief claims it says?** This section traces the current implementation, exposes its fundamental limitations, and maps a concrete migration path from hardcoded context to production-grade legal research infrastructure.

#### 39.1 The `case_context.py` Module -- Hardcoded Legal Knowledge

The entire "database" for citation verification lives in a single file. Here it is verbatim:

**File: `backend/utils/case_context.py` (lines 1-18)**

```python
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
```

**What to notice:**

1. The `contexts` dictionary (line 15-17) maps exactly one case ID to exactly one block of handwritten legal knowledge.
2. For any case ID that is not `"Rivera_v_Harmon_MSJ"`, `get_case_context()` returns `""` -- an empty string. The pipeline still runs, but the LLM receives zero domain knowledge to verify against.
3. The context string itself is a prompt fragment -- it will be injected verbatim into the `{case_context}` placeholder in the verification prompt (see Section 39.2 below).

**Interview question:** "How does the system verify citations for a case it hasn't seen before?"

**Answer:** It doesn't -- not really. Without case-specific context, the LLM falls back on its training data, which may contain outdated, incomplete, or hallucinated case law. Every verification for an unknown case is fundamentally `COULD_NOT_VERIFY` masquerading as analysis.

#### 39.2 The `{case_context}` Placeholder Pattern

The hardcoded context string flows through every agent prompt via a `{case_context}` placeholder. Here is the citation verification prompt where it lands:

**File: `backend/utils/prompts.py` (lines 14-28)**

```python
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
```

The placeholder `{case_context}` on line 26 receives one of two values:
- **Known case:** The full `RIVERA_V_HARMON_CONTEXT` string, giving the LLM specific knowledge about Privette holdings and jurisdiction.
- **Unknown case:** An empty string `""`, meaning the LLM sees a blank line and must rely entirely on parametric knowledge.

The same pattern repeats in `FACT_CHECKING_PROMPT` (line 65) and `JUDICIAL_MEMO_PROMPT` (line 92).

#### 39.3 How Context Flows Through the Pipeline

The orchestrator loads context and passes it to every agent:

**File: `backend/agents/orchestrator.py` (lines 96-108)**

```python
from utils.case_context import get_case_context
case_context = get_case_context(motion_id)
# ...
{"citations": citations, "case_context": case_context}   # line 106 -> citation_verifier
# ...
fact_task = self.fact_checker.execute({**docs, "case_context": case_context})  # line 108
```

And later at line 163, the same `case_context` flows to the judicial memo agent. Every agent in the pipeline receives the same hardcoded string.

#### 39.4 The CitationVerifierAgent in Detail

**File: `backend/agents/citation_verifier.py` (lines 1-90)**

```python
class VerificationResult(BaseModel):
    is_supported: bool
    confidence: float = Field(ge=0, le=1)
    confidence_reasoning: str = ""
    discrepancies: List[str] = Field(default_factory=list)
    status: str = "could_not_verify"
    notes: str = ""
```

The `VerificationResult` Pydantic model (lines 9-15) defines what the LLM must return. Note the default `status` on line 14: `"could_not_verify"`. If the LLM returns any status not in the `STATUS_MAP`, it falls through to `COULD_NOT_VERIFY`:

```python
STATUS_MAP = {
    "supported": VerificationStatus.SUPPORTED,
    "not_supported": VerificationStatus.NOT_SUPPORTED,
    "misleading": VerificationStatus.MISLEADING,
}
```

Lines 18-22: The map has three entries. `"could_not_verify"` is intentionally absent -- any unrecognized status (including the LLM literally returning `"could_not_verify"`) maps to the enum default at line 44:

```python
status=STATUS_MAP.get(vr.status, VerificationStatus.COULD_NOT_VERIFY),
```

The `_verify_one` method (lines 29-58) handles a single citation. The critical path:
1. Format the prompt with `{citation_text}`, `{claimed_proposition}`, `{context}`, and `{case_context}` (lines 31-36).
2. Call the LLM via `_call_llm()` requesting structured output as `VerificationResult` (line 37).
3. Map the result to a `VerifiedCitation` schema (lines 38-46).
4. On any exception, return a `VerifiedCitation` with `status=COULD_NOT_VERIFY` and `confidence=0.0` (lines 48-58).

The `execute` method (lines 60-90) runs all citations in parallel via `asyncio.gather` with `return_exceptions=True`, then catches any that raised exceptions and wraps them in `COULD_NOT_VERIFY` entries (lines 78-89).

---

### Intermediate: The `COULD_NOT_VERIFY` Conflation Problem

#### 39.5 One Status, Three Distinct Failure Modes

The current `VerificationStatus` enum from `backend/models/schemas.py` (lines 7-11):

```python
class VerificationStatus(str, Enum):
    SUPPORTED = "supported"
    NOT_SUPPORTED = "not_supported"
    COULD_NOT_VERIFY = "could_not_verify"
    MISLEADING = "misleading"
```

`COULD_NOT_VERIFY` currently conflates three fundamentally different situations:

| Situation | What Actually Happened | User Impact |
|-----------|----------------------|-------------|
| **Case doesn't exist** | Citation is fabricated (hallucinated) | Should be flagged as `FABRICATED` -- this is a serious ethical violation |
| **Case exists but not in database** | System has no access to verify | Should be `DATABASE_NOT_FOUND` -- actionable: expand data sources |
| **Case exists, retrieved, but LLM uncertain** | Model couldn't determine if holding matches claim | Should be `LLM_UNCERTAIN` -- lower severity, may resolve with better model |

**Why this matters in practice:**

A lawyer submitting a brief with a fabricated citation (a "Mattel v. Doe" that doesn't exist) and a brief citing a real but obscure case ("County of Santa Clara v. Superior Court, 2 Cal.App.5th 1172") both produce the same output: `COULD_NOT_VERIFY`. The judge sees the same yellow flag for both. This is dangerous: one is potential sanctionable fraud (FRCP Rule 11), the other is a system limitation.

#### 39.6 Proposed Status Expansion

```python
class VerificationStatus(str, Enum):
    SUPPORTED = "supported"
    NOT_SUPPORTED = "not_supported"
    MISLEADING = "misleading"
    FABRICATED = "fabricated"             # Citation does not exist in any database
    DATABASE_NOT_FOUND = "database_not_found"  # Not in our sources, but may exist
    LLM_UNCERTAIN = "llm_uncertain"       # Retrieved but model confidence too low
    OVERRULED = "overruled"               # Case exists but has been overruled
    SUPERSEDED = "superseded"             # Statute amended or replaced
```

The triage logic would be:

```
1. Parse citation -> extract volume/reporter/page
2. Query database (CourtListener, Westlaw, etc.)
   - No results in ANY database -> FABRICATED
   - No results in OUR database -> DATABASE_NOT_FOUND
   - Results found -> continue
3. Retrieve opinion text
4. LLM compares brief's characterization vs actual opinion
   - Confidence >= 0.7 and matches -> SUPPORTED
   - Confidence >= 0.7 and doesn't match -> NOT_SUPPORTED or MISLEADING
   - Confidence < 0.7 -> LLM_UNCERTAIN
5. Check treatment (Shepard's/KeyCite)
   - Overruled -> OVERRULED
   - Superseded -> SUPERSEDED
```

---

### Intermediate: Citation Normalization

#### 39.7 Parsing Legal Citations Into Structured Components

Legal citations follow specific formats, but briefs cite them inconsistently. The same case might appear as:

| Format | Example |
|--------|---------|
| California Official | Privette v. Superior Court (1993) 5 Cal.4th 689 |
| Standard (volume-reporter-page) | Privette v. Superior Court, 5 Cal.4th 689 (1993) |
| With pinpoint | Privette v. Superior Court, 5 Cal.4th 689, 695 (1993) |
| Short form | Privette, 5 Cal.4th at 695 |
| Supra | Privette, supra, 5 Cal.4th 689 |
| Id. reference | Id. at 695 |

A production citation verifier needs a normalization layer that parses any format into a canonical structure:

```python
@dataclass
class ParsedCitation:
    case_name: str           # "Privette v. Superior Court"
    volume: int              # 5
    reporter: str            # "Cal.4th"
    page: int                # 689
    pinpoint: Optional[int]  # 695 or None
    year: Optional[int]      # 1993
    court: Optional[str]     # "Cal." (inferred from reporter)
    parallel_cites: list     # e.g., Pacific Reporter cite for same case
```

**Normalization rules:**

1. **California-style parenthetical year first:** `(1993) 5 Cal.4th 689` -> year=1993, vol=5, reporter=Cal.4th, page=689
2. **Standard style year last:** `5 Cal.4th 689 (1993)` -> same result
3. **Reporter normalization:** `Cal. 4th` = `Cal.4th` = `Cal. Fourth`; `S.Ct.` = `S. Ct.`
4. **Short forms and supra:** Link back to the most recent full citation of the same case in the document
5. **Id. citations:** Resolve to the immediately preceding citation (requires document-order tracking)

**Regex sketch for the standard form:**

```python
CITE_PATTERN = re.compile(
    r'(?P<name>[A-Z][^,]+?)\s*'
    r'(?:\((?P<year_pre>\d{4})\)\s*)?'
    r'(?P<volume>\d+)\s+'
    r'(?P<reporter>[A-Z][A-Za-z.]+(?:\s*\d+[a-z]{2})?)\s+'
    r'(?P<page>\d+)'
    r'(?:,\s*(?P<pinpoint>\d+))?'
    r'(?:\s*\((?P<year_post>\d{4})\))?'
)
```

This is a simplified sketch. Production systems like `eyecite` (the Free Law Project's open-source citation parser) handle hundreds of reporter abbreviations, parallel citations, and edge cases.

---

### Intermediate: Multi-Jurisdictional Complexity

#### 39.8 Binding vs. Persuasive Authority

The current system includes a single jurisdictional note in `case_context.py` line 10:

```
- This is a California state court case. Out-of-state citations (Texas, Florida) are non-binding persuasive authority only.
```

This is hardcoded knowledge for one case. A production system needs to determine authority status dynamically.

**Court hierarchy for a California Superior Court case:**

| Source | Authority Type | Weight |
|--------|---------------|--------|
| U.S. Supreme Court (constitutional) | Binding | Highest |
| California Supreme Court | Binding | High |
| California Court of Appeal (same district) | Binding | Medium-High |
| California Court of Appeal (different district) | Persuasive | Medium |
| 9th Circuit (on state law) | Persuasive | Medium |
| Other state supreme courts | Persuasive | Low |
| Other state appellate courts | Persuasive | Very Low |
| Federal district courts | Persuasive | Low |
| Law reviews, treatises | Secondary | Variable |

**Key complications:**

1. **Which court is the brief filed in?** The system currently doesn't track this. The `motion_id` of `"Rivera_v_Harmon_MSJ"` doesn't encode the filing court. A production system needs metadata: `filing_court: "CA Superior Court, Los Angeles County"`.

2. **Federal vs. state claims:** A single brief may assert both federal constitutional claims (14th Amendment due process) and state tort claims. Federal authority is binding on the federal claims; state authority is binding on the state claims.

3. **Splits in authority:** California's six appellate districts can reach conflicting conclusions on the same legal question. Until the California Supreme Court resolves the split, a case from District 2 may not bind District 4.

4. **Date sensitivity:** A case decided in 1993 may have been superseded by statute or overruled. The system must check the current treatment status, not just whether the citation exists.

#### 39.9 What a Jurisdiction-Aware Verification Looks Like

```python
@dataclass
class JurisdictionContext:
    filing_court: str                    # "CA Superior Court, Los Angeles"
    filing_state: str                    # "CA"
    appellate_district: Optional[str]    # "2nd Appellate District"
    federal_circuit: Optional[str]       # "9th Circuit" (if federal claims)
    claim_types: List[str]               # ["state_tort", "federal_civil_rights"]

def classify_authority(
    cited_court: str,
    jurisdiction: JurisdictionContext
) -> str:
    """Returns 'binding', 'persuasive', or 'inapplicable'."""
    # Implementation maps court hierarchies
    ...
```

For each citation, the verifier would:
1. Parse the citation to extract the court (from the reporter abbreviation).
2. Look up the filing court's hierarchy.
3. Classify the cited case as binding, persuasive, or inapplicable.
4. Flag citations presented as authoritative that are only persuasive (a common litigation tactic).

---

### Expert: Phase-by-Phase Migration to Production

#### 39.10 Phase 1: Hardcoded Context (Current State)

**What we have:**

| Component | Implementation | Limitation |
|-----------|---------------|------------|
| Case knowledge | `RIVERA_V_HARMON_CONTEXT` string | Works for exactly 1 case |
| Citation parsing | None -- raw text passed to LLM | LLM must parse "5 Cal.4th 689" itself |
| Database lookup | None | LLM uses training data only |
| Treatment checking | None | No way to detect overruled cases |
| Jurisdiction awareness | Hardcoded in context string | Single-case, single-jurisdiction |

**Failure mode:** For any case other than Rivera v. Harmon, the system produces plausible-sounding but ungrounded verification results. The LLM's training data is stale (knowledge cutoff) and unreliable for precise legal holdings.

#### 39.11 Phase 2: CourtListener API Integration

**CourtListener** (courtlistener.com) is a free, open-source legal research platform maintained by the Free Law Project. It provides:

- REST API with opinion search by citation, case name, or docket number
- Full text of millions of opinions
- Citation network (which cases cite which)
- No API key required for basic access (rate-limited)

**Integration sketch:**

```python
import httpx

COURTLISTENER_BASE = "https://www.courtlistener.com/api/rest/v4"

async def lookup_citation(volume: int, reporter: str, page: int) -> Optional[dict]:
    """Query CourtListener for a specific citation."""
    async with httpx.AsyncClient() as client:
        # Search by citation
        resp = await client.get(
            f"{COURTLISTENER_BASE}/search/",
            params={
                "type": "o",  # opinions
                "citation": f"{volume} {reporter} {page}",
            }
        )
        results = resp.json().get("results", [])
        if not results:
            return None
        # Fetch full opinion text
        opinion_url = results[0]["absolute_url"]
        opinion_resp = await client.get(
            f"{COURTLISTENER_BASE}/opinions/{results[0]['id']}/"
        )
        return opinion_resp.json()
```

**What this buys us:**

1. **Existence check:** If CourtListener returns no results, we have evidence (not proof) the citation may be fabricated. CourtListener has ~8 million opinions but doesn't have everything.
2. **Full opinion text:** The LLM can compare the brief's characterization against the actual holding, rather than relying on parametric memory.
3. **Free.** No licensing cost.

**What it doesn't solve:**

- CourtListener's coverage is incomplete for state trial courts, unpublished opinions, and recent decisions.
- No treatment/Shepardizing data.
- Rate limits for high-volume use.

**Modified verification flow:**

```
1. Parse citation -> (volume=5, reporter="Cal.4th", page=689)
2. Query CourtListener
   - No results -> status = DATABASE_NOT_FOUND
   - Results found -> retrieve opinion text
3. Inject opinion text into prompt (replacing {case_context})
4. LLM compares brief claim vs. actual opinion
5. Return structured result with higher confidence
```

#### 39.12 Phase 3: Redis Cache Layer

Once you're querying an external API per citation, caching becomes essential. A single brief may cite the same case 10+ times with different pinpoint citations.

**Cache strategy:**

```python
import redis.asyncio as redis
import json
import hashlib

class CitationCache:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis = redis.from_url(redis_url)
        self.ttl = 86400 * 7  # 7 days -- opinions don't change

    def _key(self, volume: int, reporter: str, page: int) -> str:
        raw = f"{volume}:{reporter}:{page}"
        return f"citation:{hashlib.sha256(raw.encode()).hexdigest()[:16]}"

    async def get(self, volume: int, reporter: str, page: int) -> Optional[dict]:
        key = self._key(volume, reporter, page)
        data = await self.redis.get(key)
        return json.loads(data) if data else None

    async def set(self, volume: int, reporter: str, page: int, opinion: dict):
        key = self._key(volume, reporter, page)
        await self.redis.setex(key, self.ttl, json.dumps(opinion))
```

**Why 7-day TTL:** Published opinions are immutable -- once "5 Cal.4th 689" is published, it doesn't change. But the treatment status (whether it's been overruled) can change, so the cache shouldn't be indefinite.

**Cache hit rates in practice:** A typical MSJ cites 15-30 cases. In our demo, some cases (like Privette) are cited 3-4 times. Expected cache hit rate: 30-50% within a single brief verification run.

#### 39.13 Phase 4: Full RAG Pipeline with Vector Search

The highest-fidelity approach: build a legal citation RAG system.

**Architecture:**

```
Brief Text
    |
    v
Citation Extractor (existing agent)
    |
    v
Citation Parser (new: regex + eyecite)
    |
    v
Structured Query: {volume: 5, reporter: "Cal.4th", page: 689}
    |
    +---> Exact Match (CourtListener API / local DB)
    |         |
    |         v
    |     Full Opinion Text
    |         |
    |         v
    +---> Vector Store (chunked opinions)
    |         |
    |         v
    |     Relevant Passages (top-k by proposition similarity)
    |
    v
Verification Prompt (enriched with actual opinion text)
    |
    v
Structured Result with GROUNDED confidence
```

**Vector store considerations:**

| Store | Pros | Cons |
|-------|------|------|
| pgvector (Postgres) | Familiar, transactional, metadata filtering | Slower for large collections |
| Pinecone | Managed, fast, metadata filtering | Cost, vendor lock-in |
| Qdrant | Self-hosted, filtering, payload storage | Ops overhead |
| ChromaDB | Simple, embedded | Limited scale |

**Chunking strategy for legal opinions:**

Legal opinions have natural structure: syllabus, majority opinion, concurrence, dissent. Chunk by:
1. Section headers (I, II, III or A, B, C)
2. Paragraph boundaries within sections
3. Overlap of 2 sentences between chunks to preserve context
4. Store metadata: case name, citation, section type (holding vs. dicta vs. dissent), page number

**The proposition-level verification problem (Section 39.15) requires this level of granularity.**

---

### Expert: Treatment Checking and the Proposition-Level Problem

#### 39.14 Shepard's, KeyCite, and Cost Reality

"Shepardizing" a case means checking its subsequent history: has it been affirmed, distinguished, criticized, or overruled? This is the gold standard of legal research and the most expensive component.

| Service | Provider | Cost | Coverage |
|---------|----------|------|----------|
| Shepard's Citations | LexisNexis | $5K-50K/month (firm license) | Most comprehensive |
| KeyCite | Westlaw/Thomson Reuters | $5K-50K/month (firm license) | Comparable to Shepard's |
| CourtListener citator | Free Law Project | Free | Limited -- shows citing cases but not editorial treatment signals |
| CaseMine | CaseMine | $100-500/month | Growing coverage, AI-powered |
| PACER | U.S. Courts | $0.10/page | Federal only, no treatment analysis |

**Why treatment matters for the BS Detector:**

A brief that cites an overruled case as binding authority is making a materially misleading argument. The current system cannot detect this at all. The LLM might know from training data that a landmark case was overruled, but it won't know about a 2024 opinion overruling an obscure 2019 appellate decision.

**Cost analysis for different deployment scenarios:**

| Scenario | Monthly Volume | Recommended Stack | Estimated Monthly Cost |
|----------|---------------|-------------------|----------------------|
| Demo / hackathon | 10 briefs | CourtListener only | $0 |
| Small firm pilot | 100 briefs | CourtListener + CaseMine | $200-500 |
| Mid-size firm | 1,000 briefs | CourtListener + Westlaw API | $10K-25K |
| Court system deployment | 10,000+ briefs | Full Westlaw/Lexis integration + custom DB | $50K+ |

**PACER costs add up fast:** A single federal case docket can be 500+ pages at $0.10/page. PACER caps at $3.00 per document, but batch downloading for a RAG pipeline can still cost hundreds of dollars per day.

#### 39.15 The Proposition-Level Verification Problem

This is the hardest problem in citation verification and the one the current system handles most poorly. The question isn't just "does this case exist?" -- it's "does this case actually stand for what the brief says it stands for?"

**Example from the demo case:**

The MSJ claims: *"Under Privette, the hirer of an independent contractor is never liable for injuries sustained by the contractor's employees."*

The actual holding (Privette v. Superior Court, 5 Cal.4th 689): The hirer is **presumptively** not liable, subject to exceptions for retained control, concealed hazards, and non-delegable duties.

The word "never" transforms a rebuttable presumption into an absolute rule. This is a **mischaracterization of the holding**, not a fabricated citation. The case exists. The citation is real. The proposition is wrong.

**Why this is hard for LLMs:**

1. **The brief's characterization sounds plausible.** Privette *does* limit hirer liability. The mischaracterization is subtle -- "never liable" vs. "presumptively not liable."
2. **The LLM must compare two things:** the brief's claim (a single sentence) against the actual opinion (potentially 20+ pages). It must find the specific holding language and evaluate whether the brief's characterization is faithful.
3. **Legal nuance matters:** "presumption" vs. "rule," "holding" vs. "dicta," "majority" vs. "concurrence" -- these distinctions determine whether a characterization is accurate.

**How the current system handles this:**

With the hardcoded context in `case_context.py` (lines 7-10), the LLM receives explicit instructions:

```
The word "never" does NOT appear in the holding. The actual holding is that
hirers are presumptively not liable, but exceptions exist...
```

This is essentially a human legal researcher doing the verification and encoding the result as a prompt. It works perfectly for this one citation in this one case. It scales to zero other cases.

**How a production system would handle this:**

```
1. Parse citation: Privette v. Superior Court, 5 Cal.4th 689
2. Retrieve full opinion text from CourtListener / Westlaw
3. Chunk opinion into sections (syllabus, holding, analysis, dicta)
4. Embed brief's claimed proposition: "hirer is never liable..."
5. Vector search: find top-5 most similar chunks in the opinion
6. Inject retrieved chunks into verification prompt:
   "The brief claims: [proposition]
    The actual opinion states: [retrieved chunks]
    Does the brief accurately characterize the holding?"
7. LLM compares and returns structured result
```

**The key insight:** RAG transforms citation verification from "ask the LLM what it remembers" to "show the LLM the actual text and ask it to compare." This is the difference between a library patron reciting from memory and a librarian with the book open.

#### 39.16 Accuracy Expectations at Each Phase

| Phase | Fabricated Citations | Mischaracterized Holdings | Overruled Cases | Jurisdiction Errors |
|-------|---------------------|--------------------------|-----------------|-------------------|
| 1. Hardcoded (current) | Detects ~30% (LLM memory) | Detects for 1 case only | Not detected | Detects for 1 case only |
| 2. CourtListener API | Detects ~70% (coverage gaps) | Detects ~50% (full text available) | Not detected | Partially (court metadata) |
| 3. + Redis Cache | Same accuracy, 3-5x faster | Same | Not detected | Same |
| 4. Full RAG | Detects ~85%+ | Detects ~70-80% (proposition-level) | Requires Shepard's integration | Detects ~90%+ (structured metadata) |
| 5. + Shepard's/KeyCite | Detects ~90%+ | Detects ~80%+ | Detects ~95%+ | Detects ~95%+ |

---

### Expert: Implementation Details and Edge Cases

#### 39.17 The Exception Handler as Silent Failure

Look at the exception handling in `_verify_one` (citation_verifier.py, lines 48-58):

```python
except Exception as e:
    self.logger.warning(f"Failed to verify citation: {e}")
    verified = VerifiedCitation(
        citation=citation,
        is_supported=False,
        confidence=0.0,
        discrepancies=[],
        status=VerificationStatus.COULD_NOT_VERIFY,
        notes=f"Verification failed: {e}",
    )
    return verified.model_dump()
```

And the parallel execution handler (lines 78-89):

```python
for i, r in enumerate(results):
    if isinstance(r, Exception):
        self.logger.warning(f"Citation {i} verification raised: {r}")
        final.append(VerifiedCitation(
            citation=citations[i],
            is_supported=False,
            confidence=0.0,
            status=VerificationStatus.COULD_NOT_VERIFY,
            notes=f"Verification failed: {r}",
        ).model_dump())
    else:
        final.append(r)
```

**The problem:** Both handlers produce the same `COULD_NOT_VERIFY` output regardless of whether the failure was:
- An LLM API timeout (transient -- should retry)
- A malformed citation that couldn't be parsed (permanent -- need different handling)
- A rate limit error from the LLM provider (transient -- should backoff)
- An actual verification where the LLM returned invalid JSON (model issue -- should log for eval)

A production system should distinguish these:

```python
class VerificationError(BaseModel):
    error_type: Literal["transient", "permanent", "model_error"]
    error_message: str
    retryable: bool
    retry_after_seconds: Optional[int] = None
```

#### 39.18 The `STATUS_MAP` Gap

The `STATUS_MAP` on lines 18-22 of `citation_verifier.py`:

```python
STATUS_MAP = {
    "supported": VerificationStatus.SUPPORTED,
    "not_supported": VerificationStatus.NOT_SUPPORTED,
    "misleading": VerificationStatus.MISLEADING,
}
```

And its usage on line 44:

```python
status=STATUS_MAP.get(vr.status, VerificationStatus.COULD_NOT_VERIFY),
```

If the LLM returns `status: "could_not_verify"` (which is a valid response per the prompt), it hits the `.get()` default because `"could_not_verify"` is not a key in the map. This is **intentional but confusing** -- it works correctly (the result is `COULD_NOT_VERIFY`), but only by accident of the default value matching the missing key's intended mapping.

**Interview question:** "Walk me through what happens when the LLM returns `status: 'misleading'` vs. `status: 'partially_supported'`."

**Answer:** `"misleading"` maps to `VerificationStatus.MISLEADING` via `STATUS_MAP`. `"partially_supported"` is not in the map, so `.get()` returns the default `VerificationStatus.COULD_NOT_VERIFY`. This is a silent data loss -- the LLM's nuanced judgment ("partially supported") is collapsed into the catch-all bucket. The prompt should constrain the LLM to only the four valid statuses, or the map should handle common LLM variations.

#### 39.19 The VerifiedCitation Schema Mismatch

Compare `VerificationResult` (the LLM response model in `citation_verifier.py`, lines 9-15) with `VerifiedCitation` (the pipeline schema in `schemas.py`, lines 28-36):

| Field | VerificationResult | VerifiedCitation |
|-------|-------------------|------------------|
| `is_supported` | `bool` | `bool` (default `False`) |
| `confidence` | `float` (0-1) | `float` (default 0.5, 0-1) |
| `confidence_reasoning` | `str` (default `""`) | `Optional[str]` (default `None`) |
| `discrepancies` | `List[str]` | `List[str]` |
| `supporting_evidence` | Not present | `Optional[str]` (default `None`) |
| `status` | `str` (default `"could_not_verify"`) | `str` (default `"could_not_verify"`) |
| `notes` | `str` (default `""`) | `Optional[str]` (default `None`) |
| `citation` | Not present | `Optional[Citation]` (wraps original) |

The `supporting_evidence` field on `VerifiedCitation` (schemas.py, line 34) is never populated by the verifier agent. It exists in the schema but is always `None`. In a production system with RAG, this field would hold the retrieved opinion text that supports or contradicts the claim -- making it one of the most important fields for transparency and auditability.

#### 39.20 Interview Cheat Sheet: Citation Verification

**Q: "The system returns `COULD_NOT_VERIFY` for a citation. What are the possible causes and how would you triage?"**

**A (structured response):**

1. **Check the logs.** If `notes` contains "Verification failed:", it was an exception -- look at the error message. API timeout? Parse error? Rate limit?
2. **Check the citation format.** Is it a valid legal citation or garbled text the extractor picked up? (e.g., "See generally, various sources" is not a citation.)
3. **Check the case_context.** Was this a known case with hardcoded context, or an unknown case where the LLM had no domain knowledge?
4. **In a production system:** Query CourtListener. If no results, consider `FABRICATED`. If results found but LLM still uncertain, it's `LLM_UNCERTAIN` -- check retrieved text quality.

**Q: "How would you test this system? What would your eval set look like?"**

**A:**

| Test Case Type | Input | Expected Output | Why It's Important |
|---------------|-------|-----------------|-------------------|
| Fabricated citation | "Smith v. Jones, 999 F.3d 1 (2023)" | `FABRICATED` or `COULD_NOT_VERIFY` | Catches hallucinated cases |
| Accurate characterization | Privette cite with correct "presumptively not liable" | `SUPPORTED`, confidence > 0.8 | Baseline correctness |
| Mischaracterized holding | Privette cite with "never liable" | `MISLEADING`, confidence > 0.7 | Core detection capability |
| Out-of-jurisdiction cite | Texas case in California brief | `SUPPORTED` but flagged as persuasive only | Jurisdiction awareness |
| Overruled case | Citing a case overruled in 2020 | `OVERRULED` (Phase 5 only) | Treatment checking |
| Id. citation | "Id. at 695" | Resolves to preceding cite, verifies | Citation chain tracking |
| String cite | "5 Cal.4th 689, 695-96" | Parses pinpoint correctly | Citation parsing robustness |

**Q: "What's the business case for upgrading from Phase 1 to Phase 2?"**

**A:** Phase 1 works for demos. Phase 2 (CourtListener integration) is the minimum viable product for any real deployment because:
- CourtListener is free, eliminating the "it costs too much" objection.
- It transforms the system from "LLM guessing" to "LLM comparing against source text."
- It enables the `FABRICATED` vs `DATABASE_NOT_FOUND` distinction, which is the highest-impact improvement for user trust.
- Implementation effort is ~2-3 days: HTTP client, citation parser, cache, modified prompt.

**Q: "Why not just use GPT-4/Claude with a really detailed prompt instead of building all this infrastructure?"**

**A:** Because LLMs hallucinate case law. This is not a theoretical concern -- it has led to lawyer sanctions (Mata v. Avianca, S.D.N.Y. 2023, where ChatGPT fabricated six cases). No amount of prompt engineering eliminates the fundamental problem: the model's training data is static, incomplete, and not authoritative. The infrastructure exists to give the model authoritative source text to compare against, not to replace the model's judgment. The model is excellent at *comparing* two texts; it is unreliable at *recalling* specific legal holdings from memory. Build the pipeline to play to the model's strengths.


---

## 40. Reflection-to-Code Mapping

### Why This Section Exists

Vienna's feedback praised "honest reflection matched actual code quality." This section provides a **claim-by-claim audit** of every assertion in `REFLECTION.md`, mapped to specific code with line numbers and verbatim snippets. If you can defend this mapping in an interview, you prove that your self-assessment is grounded in reality rather than aspiration.

---

### 40.1 Claim: "4 Specialized Agents + 1 Orchestrator, Then Added a 5th Agent"

**REFLECTION.md, line 6:**
> I chose 4 specialized agents (Document Parser, Citation Verifier, Fact Checker, Report Synthesizer) plus an orchestrator, then added a 5th agent (Judicial Memo)

**Code evidence -- agent files in `backend/agents/`:**

| Agent | File | Class | Line |
|-------|------|-------|------|
| Document Parser | `document_parser.py` | `DocumentParserAgent` | Line 13 |
| Citation Verifier | `citation_verifier.py` | `CitationVerifierAgent` | Line 25 |
| Fact Checker | `fact_checker.py` | `FactCheckerAgent` | Line 12 |
| Report Synthesizer | `report_synthesizer.py` | `ReportSynthesizerAgent` | Line 15 |
| Judicial Memo (5th) | `judicial_memo.py` | `JudicialMemoAgent` | Line 16 |
| Orchestrator | `orchestrator.py` | `PipelineOrchestrator` | Line 45 |

All five agents inherit from `BaseAgent` (`base_agent.py:12`). The orchestrator instantiates all five at `orchestrator.py:49-53`:

```python
self.parser = DocumentParserAgent(self.llm)          # line 49
self.citation_verifier = CitationVerifierAgent(self.llm)  # line 50
self.fact_checker = FactCheckerAgent(self.llm)        # line 51
self.synthesizer = ReportSynthesizerAgent(self.llm)   # line 52
self.memo_agent = JudicialMemoAgent(self.llm)         # line 53
```

**Verdict:** CONFIRMED. Exactly 5 agents + 1 orchestrator. The 5th agent (`JudicialMemoAgent`) is a separate class in its own file with distinct responsibilities.

---

### 40.2 Claim: "Parallel Execution via asyncio.gather()"

**REFLECTION.md, line 8:**
> citation verification and fact checking run in parallel via `asyncio.gather()`

**Code evidence -- `orchestrator.py:95-112`:**

```python
# Step 3: Run citation verification and fact checking IN PARALLEL
from utils.case_context import get_case_context
case_context = get_case_context(motion_id)

cit_st = _track(pipeline_status, "citation_verifier")
fact_st = _track(pipeline_status, "fact_checker")

cit_t0 = _start(cit_st)
fact_t0 = _start(fact_st)

citation_task = self.citation_verifier.execute(
    {"citations": citations, "case_context": case_context}
)
fact_task = self.fact_checker.execute({**docs, "case_context": case_context})

citation_results, fact_results = await asyncio.gather(
    citation_task, fact_task, return_exceptions=True
)
```

Key details:
- Both tasks are created **before** `await` (lines 105-108), so they are launched concurrently
- `return_exceptions=True` prevents one failure from canceling the other
- Exception handling for each task is separate (lines 115-127)

**Verdict:** CONFIRMED. The `asyncio.gather()` call is verbatim on line 110. The two tasks are genuinely independent -- citation verification uses extracted citations while fact checking uses raw documents.

---

### 40.3 Claim: "~40% Execution Time Improvement"

**REFLECTION.md, line 8:**
> parallelizing them cuts ~40% off pipeline execution time

**Timing evidence analysis:**

Serial: `T_parser + T_citation + T_fact + T_synth + T_memo`
Parallel: `T_parser + max(T_citation, T_fact) + T_synth + T_memo`

With equal-time agents, the improvement is 20%. For 40%, the citation + fact stages must dominate total time. This is plausible because the citation verifier runs **N parallel sub-calls** per citation (`citation_verifier.py:72-75`) making it the longest stage, and the fact checker processes a large prompt (~24K chars) in one call (`fact_checker.py:50`).

**Verdict:** PLAUSIBLE. The 40% figure is not directly measured (no benchmark harness exists), but architecture supports it. A more honest claim would say "up to 40% depending on citation count."

---

### 40.4 Claim: "Case Context Injection via Lookup Table"

**REFLECTION.md, line 16:**
> I extracted it into `case_context.py` with a `get_case_context(case_id)` lookup

**Code evidence -- `case_context.py` (entire file, 18 lines):**

```python
RIVERA_V_HARMON_CONTEXT = """IMPORTANT LEGAL KNOWLEDGE FOR THIS CASE:
- Privette v. Superior Court, 5 Cal.4th 689 (1993) established a PRESUMPTION ...
- Seabright Insurance Co. v. US Airways, Inc., 52 Cal.4th 590 (2011) ...
- This is a California state court case. ..."""

def get_case_context(case_id: str) -> str:
    """Return case-specific context for known cases, or empty string for generic cases."""
    contexts = {
        "Rivera_v_Harmon_MSJ": RIVERA_V_HARMON_CONTEXT,
    }
    return contexts.get(case_id, "")
```

The lookup table (`contexts` dict at line 15-17) has exactly **1 entry**. For unknown `case_id` values, `dict.get(case_id, "")` returns an empty string, so the pipeline works generically.

Consumed at `orchestrator.py:96-97` and passed to citation verification (line 106), fact checking (line 108), and judicial memo (line 163).

**Verdict:** CONFIRMED. A 1-entry dictionary in 19 lines of code. The "lookup table" description is accurate, if generous.

---

### 40.5 Claim: "Dual-Evaluation Approach"

**REFLECTION.md, lines 22-27:**
> The dual-evaluation approach (keyword matching + LLM-as-judge) addresses a real gap

**Code evidence -- two evaluation modules:**

| Method | File | Entry Function | Lines |
|--------|------|----------------|-------|
| Keyword matching | `evals/metrics.py` | `calculate_metrics()` | Lines 21-56 |
| LLM-as-judge | `evals/llm_judge.py` | `judge_all()` | Lines 74-117 |
| Combined | `evals/metrics.py` | `calculate_combined_metrics()` | Lines 112-143 |

**Keyword matching** (`metrics.py:9-18`):

```python
def finding_matches_discrepancy(finding, discrepancy):
    finding_text = normalize(
        f"{finding.get('description', '')} {finding.get('type', '')} "
        f"{' '.join(finding.get('evidence', []))}"
    )
    keywords = discrepancy.get("keywords", [])
    matches = sum(1 for kw in keywords if kw in finding_text)
    return matches >= 2  # At least 2 keyword matches
```

Requires at least 2 keyword hits from the ground truth's keyword list. This is deterministic and fast.

**LLM-as-judge** (`llm_judge.py:39-71`):

```python
async def judge_finding(finding, ground_truth, llm_service):
    prompt = JUDGE_USER_PROMPT.format(
        gt_id=ground_truth.get("id", ""),
        gt_description=ground_truth.get("description", ""),
        ...
    )
    result = await llm_service.get_completion(
        system=JUDGE_SYSTEM_PROMPT,
        user=prompt,
        temperature=0.0,
    )
```

Uses `temperature=0.0` for maximum determinism. Requires `match=True` AND `confidence >= 0.5` (`llm_judge.py:94`):

```python
if result["match"] and result["confidence"] >= 0.5:
    matched_gt.add(j)
    matched_findings.add(i)
    break
```

**Combined metrics** (`metrics.py:112-143`) takes the **union** of both methods (`kw_matched | llm_matched`) and reports which discrepancies were caught by `keyword_only`, `llm_only`, or `both` (lines 140-142).

**Verdict:** CONFIRMED. Two distinct evaluation methods with union-based combination. The LLM judge prompt explicitly asks "Would a legal professional consider these to be about the same problem?" (line 35).

---

### 40.6 Remaining Limitations Audit

The REFLECTION.md lists 7 limitations (lines 53-60). Here is a claim-by-claim verification against code.

#### Limitation 1: "Only Accepts Plain Text"

**REFLECTION.md, line 54:**
> Document format: Only accepts plain text, not PDF or DOCX

**Code evidence -- `document_service.py:10-15, 17-23`:**

```python
FILENAMES = {
    "msj": "motion_for_summary_judgment.txt",
    "police_report": "police_report.txt",
    "medical_records": "medical_records_excerpt.txt",
    "witness_statement": "witness_statement.txt",
}

def load_all(self) -> Dict[str, str]:
    docs = {}
    for key, filename in self.FILENAMES.items():
        path = self.documents_dir / filename
        if path.exists():
            docs[key] = path.read_text()
    return docs
```

All filenames end in `.txt`. The `load_all()` method uses `path.read_text()` (line 22) -- a plain text reader with no PDF/DOCX parsing. The `load_from_dict()` static method (lines 25-33) accepts raw strings:

```python
return {k: v for k, v in docs.items() if isinstance(v, str) and v.strip()}
```

No `PyPDF2`, `python-docx`, `pdfminer`, or any document parsing library is imported anywhere.

**Verdict:** CONFIRMED. The system is plaintext-only by design.

#### Limitation 2: "Hardcoded Field References"

**REFLECTION.md, line 55:**
> Fact-checking prompt: Still has hardcoded field references (PPE, scaffolding) in the checking categories

**Code evidence -- `prompts.py:54-64`, the 8 hardcoded categories:**

```
1. DATE CONSISTENCY
2. PPE/SAFETY EQUIPMENT
3. WHO DIRECTED THE WORK
4. SCAFFOLDING CONDITION
5. OSHA COMPLIANCE
6. INJURY DETAILS
7. STATUTE OF LIMITATIONS ARITHMETIC
8. STRATEGIC OMISSIONS
```

These are embedded directly in the `FACT_CHECKING_PROMPT` string constant. They are not dynamically generated from document content. The prompt does include a mitigation: "SKIP any category that does not apply to the documents provided" (line 54), but the categories themselves are construction-accident-specific (PPE, scaffolding, OSHA).

**Verdict:** CONFIRMED. Exactly 8 categories hardcoded at `prompts.py:56-64`. The "SKIP" instruction is a prompt-level workaround, not a code-level solution.

#### Limitation 3: "No Legal Database Integration"

**REFLECTION.md, line 56:**
> Citation verification: For unknown cases, relies entirely on LLM training data for case law knowledge. A legal database integration (Westlaw, LexisNexis) would be far more reliable.

**Code evidence -- `case_context.py` (entire file is 18 lines):**

The `contexts` dictionary (lines 15-17) contains exactly **1 hardcoded entry**:

```python
contexts = {
    "Rivera_v_Harmon_MSJ": RIVERA_V_HARMON_CONTEXT,
}
return contexts.get(case_id, "")
```

For any case_id other than `"Rivera_v_Harmon_MSJ"`, the return value is `""` -- an empty string. The citation verification prompt (`prompts.py:26`) has a `{case_context}` placeholder that receives this empty string, meaning the LLM gets zero domain-specific guidance.

No imports of any legal database SDK, no API calls to Westlaw/LexisNexis/CourtListener, no web scraping of case law databases anywhere in the codebase.

**Verdict:** CONFIRMED. Legal knowledge is either hardcoded (1 case) or absent (all others). The 19-line file is the entire "knowledge base."

#### Limitation 4: "Single-Pass Analysis"

**REFLECTION.md, line 57:**
> Each agent makes one LLM call per item

**Code evidence -- each agent's `execute()` method:**

| Agent | LLM Call | Location | Single Call? |
|-------|----------|----------|-------------|
| DocumentParserAgent | `self._call_llm(prompt, ExtractionResult)` | `document_parser.py:26` | Yes -- 1 call total |
| CitationVerifierAgent | `self._call_llm(prompt, VerificationResult)` | `citation_verifier.py:37` | 1 call **per citation** |
| FactCheckerAgent | `self._call_llm(prompt, FactCheckResult)` | `fact_checker.py:50` | Yes -- 1 call total |
| ReportSynthesizerAgent | `self._call_llm(prompt, SynthesisResult)` | `report_synthesizer.py:31` | Yes -- 1 call total |
| JudicialMemoAgent | `self._call_llm(prompt, JudicialMemoResult)` | `judicial_memo.py:34` | Yes -- 1 call total |

The `_call_llm` method in `BaseAgent` (`base_agent.py:22-33`) wraps a single `get_structured_response` call:

```python
async def _call_llm(self, prompt: str, response_model: Type[BaseModel],
                    system_prompt: str = "", timeout: int = 120) -> BaseModel:
    try:
        return await asyncio.wait_for(
            self.llm_service.get_structured_response(
                prompt=prompt, response_model=response_model, system_prompt=system_prompt
            ),
            timeout=timeout,
        )
```

No agent loops, retries on content quality, or multi-turn conversations. Each agent fires one LLM call and accepts whatever comes back.

**Nuance:** The citation verifier calls `_call_llm` once **per citation** (via `_verify_one` at `citation_verifier.py:29-58`), but each individual citation is still single-pass.

**Verdict:** CONFIRMED. No multi-turn verification, no self-correction, no iterative refinement.

#### Limitation 5: "No Confidence Calibration"

**REFLECTION.md, line 58:**
> Confidence scores are LLM-generated estimates, not calibrated probabilities

**Code evidence:**

Confidence values flow through the system as raw floats with no transformation:

- Citation verifier receives raw `confidence: float` from LLM (`citation_verifier.py:11`):
  ```python
  confidence: float = Field(ge=0, le=1)
  ```
- Fact checker extracts raw `confidence` from LLM output (`fact_checker.py:72`):
  ```python
  confidence=item.get("confidence") or 0.5,
  ```
- Report synthesizer passes through raw scores (`report_synthesizer.py:46-50`):
  ```python
  scores = ConfidenceScores(
      citation_verification=result.confidence_scores.get("citation_verification", 0.5),
      fact_consistency=result.confidence_scores.get("fact_consistency", 0.5),
      overall=result.confidence_scores.get("overall", 0.5),
  )
  ```

No Platt scaling, isotonic regression, or any calibration transform. The `Field(ge=0, le=1)` constraint clamps range but does not calibrate.

**Verdict:** CONFIRMED. Raw LLM floats with zero mathematical transformation.

---

### 40.7 Claim: "5th Agent Separation Improved Memo Quality"

**REFLECTION.md, lines 10-11:**
> The Report Synthesizer was doing two distinct jobs: (1) aggregating findings and confidence scores, and (2) writing a judicial memo. These require different skills -- analytical aggregation vs. persuasive legal writing

**Code evidence -- clear separation of concerns:**

**ReportSynthesizerAgent** (`report_synthesizer.py:19-63`) -- analytical aggregation only:
- Input: `citation_results`, `fact_results` (line 20-21)
- Output: `top_findings`, `confidence_scores`, `unknown_issues` (lines 52-56)
- Prompt: "Synthesize the citation verification and fact-checking results into a final verification report" (`prompts.py:69`)
- No memo writing -- returns structured data, not prose

**JudicialMemoAgent** (`judicial_memo.py:16-49`) -- persuasive legal writing only:
- Input: `top_findings`, `confidence_scores`, `case_context` (lines 21-23)
- Output: `memo`, `key_issues`, `recommended_actions`, `overall_assessment` (lines 35-40)
- Prompt: "Write in formal legal language. Be specific about which claims are contradicted" (`prompts.py:94`)
- Receives pre-computed findings, does not re-analyze citations or facts

**Pipeline order in orchestrator** (`orchestrator.py:131-168`):
1. Synthesizer runs first (line 135) -- produces findings and scores
2. Memo agent runs after (line 160) -- consumes synthesizer output

```python
# Step 4: Synthesize report
synthesis = await self.synthesizer.execute({
    "citation_results": citation_results,
    "fact_results": fact_results,
})

# Step 5: Generate judicial memo
memo_data = await self.memo_agent.execute({
    "top_findings": top_findings,
    "confidence_scores": confidence_scores,
    "case_context": case_context,
})
```

**Verdict:** CONFIRMED. Clean separation. The synthesizer does not write prose; the memo agent does not analyze raw data. The data flows from synthesizer output to memo input.

---

### 40.8 Claim: "Backward Compatibility Preserved"

**REFLECTION.md, line 18:**
> Empty POST body still loads from disk and uses the Rivera context, so existing eval harnesses work unchanged.

**Code evidence -- `orchestrator.py:55-71`:**

```python
async def analyze(
    self,
    documents: Optional[Dict[str, str]] = None,
    case_id: Optional[str] = None,
) -> Dict[str, Any]:
    ...
    if documents:
        docs = DocumentService.load_from_dict(documents)
    else:
        docs = self.doc_service.load_all()      # loads .txt files from disk
        if not case_id:
            motion_id = "Rivera_v_Harmon_MSJ"   # defaults to known case
```

When `documents` is `None` (empty POST body):
1. `load_all()` reads the 4 `.txt` files from disk (line 69)
2. `motion_id` defaults to `"Rivera_v_Harmon_MSJ"` (line 71)
3. `get_case_context("Rivera_v_Harmon_MSJ")` returns the hardcoded legal context (case_context.py:16)

**Verdict:** CONFIRMED. The fallback path preserves exact pre-genericization behavior.

---

### 40.9 Time Allocation Honesty

**REFLECTION.md, lines 102-109:**
> - Foundation (models, services): ~1 hour
> - Agent implementation: ~2 hours
> - 5th agent + genericization: ~1.5 hours
> - Eval harness improvements: ~1 hour
> - UI rebuild: ~1 hour
> - Stretch (confidence reasoning, graceful failure, pipeline status): ~1 hour
> - Reflection + polish: ~0.5 hours

**Total: 8 hours**

**Plausibility assessment:** Foundation ~80 LOC, 4 agents ~250 LOC sharing a base class, 5th agent + generics ~85 LOC, eval harness ~260 LOC. Each phase's claimed time is consistent with its code volume. The 2hr agent phase is the most ambitious but benefits from the shared `BaseAgent` pattern.

**Verdict:** PLAUSIBLE. No phase claims an unrealistically short time for its scope.

---

### 40.10 Claim: "Graceful Failure Handling"

**REFLECTION.md, lines 79-86:**
> The orchestrator now tracks every agent's status (`pending -> running -> success/failed`)

**Code evidence -- `orchestrator.py:22-43`:** Four helper functions (`_track`, `_start`, `_succeed`, `_fail`) manage `AgentStatus` objects through `pending -> running -> success/failed` transitions with `duration_ms` timing.

**Failure behavior per agent:**

| Agent | On Failure | Code Location |
|-------|-----------|---------------|
| Parser | Immediate error report returned | `orchestrator.py:82-93` |
| Citation Verifier | Sets `citation_results = []`, pipeline continues | `orchestrator.py:115-118` |
| Fact Checker | Sets `fact_results = []`, pipeline continues | `orchestrator.py:122-125` |
| Synthesizer | Builds minimal report with zero scores | `orchestrator.py:140-148` |
| Judicial Memo | Report returned without memo (`memo_data = None`) | `orchestrator.py:166-168` |

Parser failure short-circuits at lines 86-93 (returns `VerificationReport` with error). Memo failure is non-fatal at lines 158-168 (`memo_data = None`). Final report conditionally includes memo at line 179: `JudicialMemo(**memo_data) if memo_data else None`.

**Verdict:** CONFIRMED. Every agent has explicit try/except handling. The degradation hierarchy matches what REFLECTION.md claims. Parser failure is fatal; all other failures allow partial results.

---

### 40.11 Claim: "Per-Flag Confidence Reasoning"

**REFLECTION.md, line 77:**
> Each verified citation, fact, and finding now includes a `confidence_reasoning` field

**Code evidence:** The `confidence_reasoning` field is requested in three prompts -- citation verification (`prompts.py:28`), fact checking (`prompts.py:67`), and report synthesis (`prompts.py:82`) -- all with identical wording: "1-2 sentences explaining why you assigned this confidence level." The field is defined in the Pydantic model at `citation_verifier.py:12` as `confidence_reasoning: str = ""`.

**Verdict:** CONFIRMED. Present in prompts, models, and passed through the pipeline.

---

### 40.12 Complete Mapping Summary Table

| REFLECTION.md Claim | Line | Code Location | Status |
|---------------------|------|---------------|--------|
| 4 specialized agents + orchestrator | 6 | `backend/agents/*.py` (5 files) | CONFIRMED |
| 5th agent = JudicialMemoAgent | 10 | `judicial_memo.py:16` | CONFIRMED |
| Parallel via asyncio.gather() | 8 | `orchestrator.py:110` | CONFIRMED |
| ~40% time improvement | 8 | Architecture analysis | PLAUSIBLE |
| Case context lookup table | 16 | `case_context.py:13-18` | CONFIRMED |
| Dual evaluation (keyword + LLM) | 22 | `metrics.py` + `llm_judge.py` | CONFIRMED |
| Combined metrics (union) | 26 | `metrics.py:112-143` | CONFIRMED |
| Plain text only | 54 | `document_service.py:10-22` | CONFIRMED |
| Hardcoded field references (8 cats) | 55 | `prompts.py:56-64` | CONFIRMED |
| No legal database integration | 56 | `case_context.py` (19 lines total) | CONFIRMED |
| Single-pass analysis | 57 | `base_agent.py:22-33`, all agents | CONFIRMED |
| No confidence calibration | 58 | Raw floats, no transforms | CONFIRMED |
| Backward compatibility | 18 | `orchestrator.py:66-71` | CONFIRMED |
| Graceful failure handling | 79-86 | `orchestrator.py:22-43, 82-168` | CONFIRMED |
| Per-flag confidence reasoning | 77 | `prompts.py:28,67,82`, verifier/checker models | CONFIRMED |
| Time allocation (8hr total) | 102-109 | Code volume analysis | PLAUSIBLE |

---

### 40.13 Interview Angles

**Beginner -- "Walk me through how your reflection matches your code"**

Pick the strongest claim and trace it end-to-end: "I claimed parallel execution via asyncio.gather(). Here is where it happens -- orchestrator.py line 110. Tasks created on lines 105-108 without await, gathered with return_exceptions=True. Each exception handled separately on lines 115-127."

**Intermediate -- "How do you know your limitations section is honest?"**

Point to specifics: "Single-pass analysis -- base_agent._call_llm on line 22 is one call, no retry loop. No confidence calibration -- the float goes from citation_verifier.py line 11 to report_synthesizer.py line 47 with zero transformation."

**Expert -- "What would you change about your reflection?"**

1. **The ~40% claim is not measured.** The orchestrator tracks `duration_ms` per agent (line 36), but no test compares serial vs. parallel. Should say "estimated 20-40%."
2. **The citation verifier has internal parallelism not mentioned.** `citation_verifier.py:72-75` uses its own `asyncio.gather()`. The reflection mentions orchestrator-level parallelism but misses this agent-level parallelism -- actually a strength.
3. **The LLM-as-judge cost claim ("doubles eval time") is understated.** The judge runs up to `N * M` LLM calls (N findings * M ground truths), though the `break` on `llm_judge.py:97` short-circuits after a match.
4. **"Structured output" claim understates fragility.** `FactCheckResult` uses `List[Dict[str, Any]]` (fact_checker.py:9) -- structured in prompt, loose in code.

---

### 40.14 The Meta-Lesson

An interviewer who reads your reflection and reviews your code is doing this exact mapping. One unverifiable claim tanks credibility for every claim. The strongest signal here: **the limitations section is brutally accurate**. Every limitation can be trivially confirmed by reading the code. The system does not pretend to have capabilities it lacks.


---

## 41. Prompt Engineering Deep Dive

### Why This Section Matters

The five prompt templates in `backend/utils/prompts.py` (lines 1-100) are the business logic of BS Detector. Every pipeline decision -- what gets flagged, what gets ignored, how confidence is expressed -- is determined by prompt wording, not by Python code. This section reproduces each prompt verbatim, annotates every design choice line-by-line, and traces precision rules back to the specific false-positive patterns they were written to prevent.

**Interview angle:** "Where does the business logic live in this system?" The answer is not the agent code -- it is the prompts. The agents are orchestration scaffolding; the prompts define what the LLM actually does.

---

### 41.1 Prompt Inventory

| # | Constant | File Line | Agent Consumer | Purpose |
|---|----------|-----------|----------------|---------|
| 1 | `CITATION_EXTRACTION_PROMPT` | `prompts.py:1-12` | `DocumentParserAgent` | Extract all legal citations from an MSJ |
| 2 | `CITATION_VERIFICATION_PROMPT` | `prompts.py:14-28` | `CitationVerifierAgent` | Verify each citation against its claimed proposition |
| 3 | `FACT_CHECKING_PROMPT` | `prompts.py:30-67` | `FactCheckerAgent` | Cross-reference MSJ facts against supporting documents |
| 4 | `REPORT_SYNTHESIS_PROMPT` | `prompts.py:69-82` | `ReportSynthesisAgent` | Merge citation + fact results into a unified report |
| 5 | `JUDICIAL_MEMO_PROMPT` | `prompts.py:84-100` | `JudicialMemoAgent` | Generate a formal judicial memo from findings |

---

### 41.2 CITATION_EXTRACTION_PROMPT (Lines 1-12)

**Level: Beginner**

#### Verbatim Prompt

```python
CITATION_EXTRACTION_PROMPT = """Extract ALL legal citations from this Motion for Summary Judgment.

For each citation identify:
1. The exact citation text (case name, volume, reporter, page)
2. The proposition it is claimed to support (what the brief says the case stands for)
3. Any direct quotes attributed to the cited authority
4. The section/paragraph where it appears

Motion for Summary Judgment:
{msj_text}

Return a JSON object with a "citations" array. Each citation must have: citation_text,
claimed_proposition, source_location, context (the surrounding sentence)."""
```

#### Line-by-Line Annotation

| Line | Text | Design Rationale |
|------|------|------------------|
| 1 | `Extract ALL legal citations` | The word "ALL" prevents the model from summarizing or sampling. Without it, LLMs tend to return 3-5 "representative" citations and skip the rest. |
| 1 | `from this Motion for Summary Judgment` | Anchors the domain. The model knows it is reading a legal brief, not a research paper or news article. This primes legal-citation parsing heuristics. |
| 3-4 | `exact citation text (case name, volume, reporter, page)` | Specifies the Bluebook citation format the model should extract. Without the parenthetical examples, models sometimes return only case names without reporters. |
| 5 | `The proposition it is claimed to support` | Critical distinction: this asks what the *brief claims* the case stands for, not what the case actually holds. This separation is what makes verification possible downstream. |
| 6 | `Any direct quotes attributed to the cited authority` | Captures fabricated quotes. If the brief says `"A hirer is never liable..."` and attributes it to Privette, this field preserves the alleged quote for verification. |
| 7 | `The section/paragraph where it appears` | Enables traceability. The judicial memo can reference "paragraph 3 of the MSJ" rather than just "somewhere in the brief." |
| 9-10 | `Motion for Summary Judgment: {msj_text}` | Single injection point. The variable `{msj_text}` is the only dynamic input. |
| 12 | `citation_text, claimed_proposition, source_location, context` | Explicit field names enforce a schema contract. The downstream `CitationVerifierAgent` expects exactly these four fields. |

#### Why These Four Fields?

The schema `{citation_text, claimed_proposition, source_location, context}` was designed for the verification pipeline:

1. **`citation_text`** -- Fed to the verification prompt as the case to look up
2. **`claimed_proposition`** -- Fed as the claim to verify against the actual holding
3. **`source_location`** -- Used in the judicial memo for page/paragraph references
4. **`context`** -- The surrounding sentence captures direct quotes and framing that may themselves be misleading (e.g., the word "never" inserted into a Privette quote)

Without `context`, the system would miss quote fabrication -- one of the most common forms of legal brief manipulation.

---

### 41.3 CITATION_VERIFICATION_PROMPT (Lines 14-28)

**Level: Intermediate**

#### Verbatim Prompt

```python
CITATION_VERIFICATION_PROMPT = """Verify whether this legal citation actually supports
the proposition claimed in the brief.

Citation: {citation_text}
Claimed proposition: {claimed_proposition}
Direct quote (if any): {context}

Check for:
1. Does the cited case actually hold what the brief claims? Look for mischaracterization
   of holdings.
2. If a direct quote is provided, is it accurate? Look for inserted or omitted words
   that change meaning.
3. Is the cited authority binding in the relevant jurisdiction? Flag federal cases,
   out-of-state cases.
4. Does the citation actually exist, or could it be fabricated?

{case_context}

Return JSON with: is_supported (bool), confidence (0-1), confidence_reasoning (1-2
sentences explaining why you assigned this confidence level), discrepancies (list of
strings), status (supported/not_supported/misleading/could_not_verify), notes."""
```

#### Line-by-Line Annotation

| Line | Text | Design Rationale |
|------|------|------------------|
| 14 | `Verify whether this legal citation actually supports` | The word "actually" is deliberate. It frames the task as adversarial verification, not summarization. The model is primed to look for problems. |
| 16-18 | Three injection points: `{citation_text}`, `{claimed_proposition}`, `{context}` | One citation at a time. This prompt runs N times (once per extracted citation). Single-citation focus prevents the model from confusing claims across citations. |
| 20-21 | `Look for mischaracterization of holdings` | Explicit instruction to check whether the brief's description of a case matches the case's actual holding. Without this, models tend to verify only that the case exists. |
| 22-23 | `Look for inserted or omitted words that change meaning` | Targets the "never" insertion pattern. In the Rivera test case, the MSJ inserts the word "never" into the Privette holding -- changing a rebuttable presumption into absolute immunity. |
| 24-25 | `Flag federal cases, out-of-state cases` | Jurisdiction checking. A Texas appellate decision (e.g., Dixon v. Lone Star) has no binding authority in California state court. Without this line, models accept any real case as "valid." |
| 26 | `Does the citation actually exist, or could it be fabricated?` | Hallucination detection. LLMs can be confident about fabricated citations. This line forces the model to consider the possibility of wholesale fabrication. |
| 27 | `{case_context}` | Optional context injection point. When the system has additional context about the case (e.g., jurisdiction, parties), it is injected here. This is the only prompt with a flexible context block. |
| 28 | `status (supported/not_supported/misleading/could_not_verify)` | Four-way status enum. The `misleading` status is critical -- it captures citations that technically exist but are misrepresented. The `could_not_verify` status prevents the model from hallucinating a verdict on unknown citations. |
| 28 | `confidence_reasoning (1-2 sentences)` | Forces the model to justify its confidence score. Without this, confidence values cluster at 0.9 regardless of actual certainty. The reasoning constraint produces calibrated scores. |

#### The `{case_context}` Injection Point

This is the most architecturally significant variable across all five prompts. It serves as a **knowledge augmentation slot**:

- When the system has retrieved actual case law (from a legal database or RAG retrieval), the real holding is injected here
- When no external knowledge is available, the field is empty and the model relies on parametric knowledge
- This design means the same prompt works in both RAG-augmented and standalone modes

The injection is at the end of the prompt, after the checklist, so the model has already been instructed *what to look for* before receiving the reference material. This ordering prevents the model from simply parroting the injected context.

#### The Four-Way Status Enum

```
supported          -- Citation exists, holds what brief claims, binding in jurisdiction
not_supported      -- Citation exists but does NOT support the claimed proposition
misleading         -- Citation exists, partially relevant, but brief mischaracterizes it
could_not_verify   -- Cannot determine if citation is real or if holding matches
```

The `misleading` status is where the Privette "never" misquote lands: the case is real, the page number is real, but the brief inserted a word that changes a presumption into an absolute rule. This is neither "supported" nor "not_supported" -- it is a distinct failure mode.

---

### 41.4 FACT_CHECKING_PROMPT (Lines 30-67)

**Level: Expert**

This is the longest prompt at 38 lines. Every line traces to a specific false-positive pattern discovered during development and eval iteration.

#### Verbatim Prompt

```python
FACT_CHECKING_PROMPT = """Cross-reference the factual claims from the Motion for
Summary Judgment against the supporting documents.

MSJ Claims:
{msj_facts}

Police Report:
{police_text}

Medical Records:
{medical_text}

Witness Statement:
{witness_text}

IMPORTANT: The MSJ is the document being verified. When the police report, medical
records, or witness statement contradict what the MSJ claims or implies, mark the fact
as "contradictory" — even if those other documents agree with each other. The question
is always "does the evidence support or contradict the MSJ?"

PRECISION RULES — avoid false flags:
- "contradictory" means the MSJ makes a SPECIFIC CLAIM that is directly refuted by
  another document. Example: MSJ says "no PPE worn" but witness says "wore harness"
  = contradictory.
- An omission is only "contradictory" if the MSJ ACTIVELY HIDES material evidence
  that would change the legal outcome (e.g., omitting evidence of retained control,
  omitting post-incident evidence destruction).
- An omission is NOT contradictory if the MSJ simply doesn't mention routine,
  non-material facts that appear in other documents (e.g., a routine inspection,
  a scheduled physical exam, arrival times, the purpose of a visit). Mark these as
  "consistent" — the MSJ is not required to recite every fact from every document.
- If all documents agree and the MSJ does not misstate any fact, mark the fact as
  "consistent" regardless of whether the MSJ mentions every detail. Consistent
  documents should produce ONLY "consistent" facts.
- The purpose or context of a document (e.g., "routine inspection" vs "incident
  response") is NOT a factual claim in the MSJ. Do not flag differences in document
  framing as contradictions.
- When in doubt, prefer "consistent" or "could_not_verify" over "contradictory".
  Only flag real contradictions.

Check the following categories. SKIP any category that does not apply to the
documents provided — if the documents don't discuss a topic (e.g., no scaffolding
mentioned anywhere, no contractor control discussed), do NOT produce a fact entry
for that category. Only produce entries for categories where the MSJ actually makes
a relevant claim AND the supporting documents address the same topic.

1. DATE CONSISTENCY: Does the MSJ's stated incident date match the other documents?
   If dates differ, mark contradictory.
2. PPE/SAFETY EQUIPMENT: Does the MSJ's claim about PPE match the other documents?
   Only check if PPE or safety equipment is discussed.
3. WHO DIRECTED THE WORK: If the MSJ claims an independent contractor controlled
   work, do the other documents show the hirer directed or controlled work instead?
   Only check if the MSJ discusses contractor vs. hirer control.
4. SCAFFOLDING CONDITION: If the MSJ discusses or implies safe scaffolding conditions,
   do the other documents reveal scaffolding defects (rust, plywood, bent pins)?
   Only check if scaffolding is mentioned.
5. OSHA COMPLIANCE: If the MSJ references OSHA inspections, is this verifiable from
   other documents?
6. INJURY DETAILS: If injuries are discussed, are they consistently described across
   documents?
7. STATUTE OF LIMITATIONS ARITHMETIC: If the MSJ states a specific elapsed time
   (e.g. "362 days" or "one year and 362 days"), verify the math using the CORRECT
   incident date from the police report/medical records. If the MSJ used the wrong
   incident date, the day count is wrong — mark this CONTRADICTORY.
8. STRATEGIC OMISSIONS: Identify MATERIAL facts in the other documents that the MSJ
   fails to mention AND that would undermine the MSJ's legal arguments — especially
   post-incident remedial measures, evidence destruction or rebuilding (spoliation),
   and witness observations that directly contradict MSJ claims. Mark these as
   contradictory ONLY if the omitted fact would change the legal analysis. Do NOT
   flag routine details.

{case_context}

Return JSON with a "verified_facts" array. Each must have: fact_text,
source_document, category (one of: DATE_CONSISTENCY, PPE_SAFETY, WORK_CONTROL,
SCAFFOLDING_CONDITION, OSHA_COMPLIANCE, INJURY_DETAILS, STATUTE_OF_LIMITATIONS,
STRATEGIC_OMISSION), is_consistent (bool), confidence (0-1), confidence_reasoning
(1-2 sentences explaining why you assigned this confidence level),
contradictory_sources (list), supporting_sources (list), status
(consistent/contradictory/could_not_verify), summary."""
```

#### The MSJ-Centric Framing (Lines 44-45)

```
IMPORTANT: The MSJ is the document being verified. When the police report, medical
records, or witness statement contradict what the MSJ claims or implies, mark the
fact as "contradictory" — even if those other documents agree with each other.
The question is always "does the evidence support or contradict the MSJ?"
```

**Why this exists:** Without this instruction, the model treats all four documents as equal peers and looks for *any* disagreement between *any* two documents. This produces findings like "the police report mentions arrival time but the medical records don't" -- true but useless. The MSJ-centric framing makes every comparison one-directional: MSJ claim vs. evidence.

This is the single most important design decision in the entire prompt. It transforms the task from "find inconsistencies across documents" into "verify the MSJ's claims against evidence."

#### Precision Rules -- Traced to False-Positive Patterns

Each precision rule was added to eliminate a specific class of false positives observed during development:

| Rule (Line) | False-Positive Pattern It Prevents | Example |
|---|---|---|
| `"contradictory" means SPECIFIC CLAIM directly refuted` (line 47) | Model flagging vague thematic differences as contradictions | MSJ discusses "workplace safety" and police report discusses "response time" -- model flags as contradictory because "safety narratives differ" |
| `omission is only contradictory if MSJ ACTIVELY HIDES material evidence` (line 48) | Model flagging every fact present in evidence but absent from MSJ | Police report mentions weather conditions; MSJ doesn't mention weather; model flags "strategic omission of weather data" |
| `omission is NOT contradictory if MSJ doesn't mention routine facts` (lines 49-50) | Model flagging routine administrative details as suspicious omissions | Medical record notes a "scheduled physical exam"; MSJ doesn't mention it; model flags as "omitted medical evidence" |
| `Consistent documents should produce ONLY consistent facts` (line 51) | Model finding phantom contradictions even when all documents agree | All documents agree on the facts; model still produces 2-3 "contradictory" findings by over-reading implications |
| `purpose or context of a document is NOT a factual claim` (line 52) | Model flagging differences in document framing as factual contradictions | Police report is an "incident response"; MSJ calls a visit a "routine inspection"; model flags framing difference as contradiction |
| `When in doubt, prefer consistent or could_not_verify` (line 53) | Model defaulting to "contradictory" when uncertain | Model is unsure whether a detail is material; defaults to flagging it rather than acknowledging uncertainty |

#### The Eight Fact Categories -- Ordered by Objectivity

The categories are numbered 1-8 in deliberate order, from most objectively verifiable to most subjectively assessed:

| # | Category | Objectivity | Why This Order |
|---|----------|-------------|----------------|
| 1 | `DATE_CONSISTENCY` | Purely objective | A date either matches or it doesn't. No interpretation needed. |
| 2 | `PPE_SAFETY` | Highly objective | Either the worker wore a harness or didn't. Documents either agree or they don't. |
| 3 | `WORK_CONTROL` | Moderate | Requires interpreting whether "directing" constitutes "control." Legal nuance increases. |
| 4 | `SCAFFOLDING_CONDITION` | Moderate | Physical evidence (rust, plywood) is objective, but "safe condition" is partly subjective. |
| 5 | `OSHA_COMPLIANCE` | Moderate | Compliance is binary but may require external verification. |
| 6 | `INJURY_DETAILS` | Moderate | Medical descriptions may use different terminology for the same injury. |
| 7 | `STATUTE_OF_LIMITATIONS` | High (math) | Arithmetic is objective, but requires correctly identifying the base date first. |
| 8 | `STRATEGIC_OMISSION` | Most subjective | Requires judging whether an omission is "material" -- the most interpretation-heavy category. |

**Why objectivity ordering matters:** LLMs process instructions sequentially. By placing the most objective categories first, the model establishes a pattern of rigorous, evidence-based reasoning before encountering the subjective categories. This anchoring effect reduces hallucinated contradictions in categories 7-8.

#### The SKIP Instruction (Lines 54-56)

```
SKIP any category that does not apply to the documents provided — if the documents
don't discuss a topic (e.g., no scaffolding mentioned anywhere, no contractor control
discussed), do NOT produce a fact entry for that category.
```

**Why this exists:** Without this instruction, the model generates 8 entries every time -- one per category -- even when the documents contain no relevant information. For example, if no document mentions scaffolding, the model would generate: `{category: "SCAFFOLDING_CONDITION", status: "could_not_verify", summary: "No scaffolding information found"}`. This noise dilutes the report and wastes tokens. The SKIP instruction produces variable-length output that contains only actionable findings.

#### Category 7: Statute of Limitations Arithmetic (Lines 62-63)

```
7. STATUTE OF LIMITATIONS ARITHMETIC: If the MSJ states a specific elapsed time
   (e.g. "362 days" or "one year and 362 days"), verify the math using the CORRECT
   incident date from the police report/medical records. If the MSJ used the wrong
   incident date, the day count is wrong — mark this CONTRADICTORY. Show: (a) the
   MSJ's claimed day count, (b) the correct day count using the real date, (c) why
   they differ.
```

This category is uniquely powerful because it chains two errors: the date error (category 1) propagates into a calculation error (category 7). If the MSJ states March 14 instead of March 12, the "362 days" calculation is based on the wrong start date. The prompt explicitly instructs the model to re-derive the arithmetic using the correct date from other documents. This turns a simple date discrepancy into a demonstrated pattern of cascading inaccuracy.

#### Category 8: Strategic Omissions (Lines 63-64)

```
8. STRATEGIC OMISSIONS: Identify MATERIAL facts in the other documents that the MSJ
   fails to mention AND that would undermine the MSJ's legal arguments — especially
   post-incident remedial measures, evidence destruction or rebuilding (spoliation),
   and witness observations that directly contradict MSJ claims.
```

The three specific examples -- remedial measures, spoliation, contradicting witness observations -- are the three most common patterns in bad-faith MSJ filings. The "ONLY if the omitted fact would change the legal analysis" qualifier prevents the model from flagging every missing detail. This is the precision/recall tradeoff in a single sentence: cast a wide net (look for omissions) but filter aggressively (only material ones).

---

### 41.5 REPORT_SYNTHESIS_PROMPT (Lines 69-82)

**Level: Intermediate**

#### Verbatim Prompt

```python
REPORT_SYNTHESIS_PROMPT = """Synthesize the citation verification and fact-checking
results into a final verification report.

Citation Results:
{citation_results}

Fact-Checking Results:
{fact_results}

Create a structured report that:
1. Lists the top findings ranked by severity and confidence. Only include actual
   discrepancies, contradictions, mischaracterizations, or concerns — do NOT include
   mere summaries of consistent or unproblematic facts. If no issues are found, return
   an empty top_findings array. Do NOT promote "could_not_verify" items to findings
   unless they represent a material gap. Items that are simply irrelevant to the case
   (e.g., scaffolding not mentioned in an electrician case) should be excluded entirely.
2. Calculates overall confidence scores. If all facts are consistent and no citation
   issues are found, set fact_consistency and overall scores HIGH (0.8-1.0). Only
   lower scores when real discrepancies exist.
3. Flags items that could not be verified ONLY if they represent material unverifiable
   claims

Return JSON with: top_findings (array of {{id, type, description, severity, confidence,
confidence_reasoning (1-2 sentences explaining why you assigned this confidence level),
evidence, recommendation}}), confidence_scores ({{citation_verification, fact_consistency,
overall}}), unknown_issues (array of strings)."""
```

#### Anti-Noise Instructions

The synthesis prompt contains three explicit anti-noise directives:

**1. Positive-finding exclusion (line 78):**
```
do NOT include mere summaries of consistent or unproblematic facts
```
Without this, the report is 80% "Date is consistent across documents" and 20% actual findings. The model's default behavior is to summarize everything it checked, not just what failed.

**2. could_not_verify suppression (line 79):**
```
Do NOT promote "could_not_verify" items to findings unless they represent a material gap
```
Without this, every `could_not_verify` status gets promoted to a "finding," creating alarm about items the system simply couldn't check. The word "material" is the filter.

**3. Irrelevance exclusion (line 79):**
```
Items that are simply irrelevant to the case (e.g., scaffolding not mentioned in an
electrician case) should be excluded entirely
```
This handles the case where the SKIP instruction in the fact-checking prompt failed -- if the fact-checker produced an entry for an irrelevant category, the synthesis prompt filters it out.

**4. Confidence calibration (line 80):**
```
If all facts are consistent and no citation issues are found, set fact_consistency
and overall scores HIGH (0.8-1.0). Only lower scores when real discrepancies exist.
```
Without this instruction, models default to moderate confidence (0.5-0.7) even when everything checks out. This creates a "boy who cried wolf" problem where every report looks concerning. The explicit calibration instruction ensures that a clean brief gets a clean score.

---

### 41.6 JUDICIAL_MEMO_PROMPT (Lines 84-100)

**Level: Intermediate**

#### Verbatim Prompt

```python
JUDICIAL_MEMO_PROMPT = """Based on these verification findings, write a structured
judicial memo summarizing the most critical issues found in the legal brief.

Top Findings:
{findings}

Confidence Scores:
{confidence_scores}

{case_context}

Write in formal legal language. Be specific about which claims are contradicted and
by what evidence.

Return JSON with:
- memo: A 3-5 sentence paragraph for a judge highlighting the most material
  discrepancies
- key_issues: An array of 3-5 bullet-point strings summarizing each critical issue
- recommended_actions: An array of 2-3 strings suggesting what the court should do
- overall_assessment: A one-sentence assessment of the brief's reliability"""
```

#### Formal Legal Writing vs. Analytical Aggregation

This prompt serves a fundamentally different purpose from the synthesis prompt:

| Dimension | `REPORT_SYNTHESIS_PROMPT` | `JUDICIAL_MEMO_PROMPT` |
|-----------|--------------------------|----------------------|
| Audience | Internal pipeline (machine-readable) | Judge (human-readable) |
| Format | Structured JSON arrays | Formal legal prose + bullet points |
| Tone | Analytical, neutral | Formal legal language |
| Content | All findings with metadata | Only the "most critical" issues |
| Output | `top_findings[]`, `confidence_scores{}` | `memo`, `key_issues[]`, `recommended_actions[]` |

The key design choice is that the judicial memo does **not** receive raw citation/fact data. It receives the already-synthesized `{findings}` and `{confidence_scores}` from the synthesis step. This two-stage filtering (fact-check -> synthesize -> memo) means the memo only sees findings that survived both the precision rules and the anti-noise filters.

**"Write in formal legal language"** -- This single instruction shifts the model's register from analytical to judicial. Without it, the memo reads like a data science report. With it, the output uses phrases like "the Court should note," "material discrepancies exist between," and "the moving party's representations regarding."

**"Be specific about which claims are contradicted and by what evidence"** -- Prevents vague memos like "several inconsistencies were found." Forces the model to name names: "The MSJ's assertion that Rivera wore no PPE (paragraph 4) is contradicted by the police report (Ex. B) and witness statement (Ex. D), both of which confirm Rivera was wearing a hard hat, safety harness, and high-visibility vest."

---

### 41.7 Why Prompt Rules > Code Rules

**Level: Expert -- Interview Ready**

A common architectural question: why encode precision rules in prompts rather than in post-processing code?

#### The Fundamental Asymmetry

```
Prompt rules:    influence GENERATION    (the model never produces the error)
Code rules:      filter OUTPUT           (the model produces the error, code removes it)
```

**Generation-side control is strictly superior for three reasons:**

1. **Token efficiency.** A false positive prevented at generation time costs zero tokens. A false positive caught by post-processing still consumed generation tokens for the incorrect finding, its confidence reasoning, its evidence trail, and its summary. In the fact-checking prompt, a single false-positive finding costs ~150 tokens. With 4-6 categories, uncontrolled generation can waste 600+ tokens per document on findings that will be filtered out.

2. **Coherence preservation.** When code filters out a finding after generation, the remaining findings may reference the removed one. For example: "This date error (Finding 1) compounds the statute of limitations miscalculation (Finding 3)." If Finding 1 is filtered out, Finding 3's reasoning is broken. Generation-side prevention keeps the model's reasoning graph intact.

3. **Confidence calibration.** If the model generates 8 findings and code removes 5, the model's confidence scores were calculated in the context of 8 findings. The scores become miscalibrated for the remaining 3. Generation-side rules mean the model assigns confidence in the context of only the real findings.

#### Concrete Example: The Omission Rule

Consider the precision rule at `prompts.py:49-50`:

```
An omission is NOT contradictory if the MSJ simply doesn't mention routine,
non-material facts
```

**If this were a code rule:**
```python
# Post-processing approach (inferior)
findings = [f for f in findings if not is_routine_omission(f)]
```

The function `is_routine_omission()` would need to:
- Parse the finding's `fact_text` and `summary` fields
- Determine whether the omitted fact is "routine" or "material"
- Make a legal judgment about materiality using... another LLM call

You end up needing an LLM to check the LLM's output -- doubling cost and latency. The prompt rule eliminates this entirely by preventing the model from flagging routine omissions in the first place.

---

### 41.8 Promptfoo A/B Testing: Precise vs. Imprecise Prompts

**Level: Expert -- Interview Ready**

The `evals/promptfoo/` directory contains two A/B comparison suites that quantify the impact of prompt precision.

#### Test Configuration

Both suites use the same structure:

```yaml
prompts:
  - "file://prompts/fact_checking.txt"           # Precise
  - "file://prompts/fact_checking_imprecise.txt"  # Imprecise
```

Promptfoo runs **every test case against both prompts**, producing side-by-side metrics.

#### The Imprecise Prompts

**Citation verification -- imprecise** (`citation_verification_imprecise.txt`):
```
You are a legal assistant. Review the citation below and tell me if it's valid.

Citation: {{citation_text}}
Proposition: {{claimed_proposition}}
Quote: {{context}}

Check if the citation supports the proposition and return your findings as JSON.
```

**Fact checking -- imprecise** (`fact_checking_imprecise.txt`):
```
You are a legal assistant. Compare these documents and find any inconsistencies.

MSJ Claims:
{{msj_facts}}

Police Report:
{{police_text}}

Medical Records:
{{medical_text}}

Witness Statement:
{{witness_text}}

Return your findings as JSON.
```

#### What the Imprecise Prompts Lack

| Feature | Precise Prompt | Imprecise Prompt | Impact |
|---------|---------------|-----------------|--------|
| Role specificity | "precise legal fact-checker" | "legal assistant" | Less domain focus |
| JSON enforcement | "Always respond with valid JSON only" | "Return your findings as JSON" | Higher JSON parse failures |
| Schema specification | Exact field names, types, enums | None | Unpredictable output schema |
| Numbered categories | 6 explicit categories (DATE, PPE, etc.) | None | Model decides what to check |
| Precision rules | 6 rules with examples | None | Higher false-positive rate |
| Status enum | `consistent/contradictory/could_not_verify` | None | Freeform status values |
| MSJ-centric framing | "The MSJ is the document being verified" | "Compare these documents" | Bidirectional comparisons |
| Embedded legal knowledge | Privette holding, "never" warning | None | Misses known manipulation patterns |
| `could_not_verify` status | Explicit in enum | Not mentioned | Model fabricates verdicts on unknown cases |

#### Citation Verification A/B: Metric Categories

From `prompt-precision-citations.yaml`, the test suite measures four dimensions:

| Metric Category | What It Measures | Key Test Case |
|-----------------|-----------------|---------------|
| `schema/*` | Valid JSON, required fields present, enum compliance | All test cases |
| `recall/*` | Correctly flags the Privette misquote and out-of-state citations | CIT-001: "never" insertion; CIT-002a: Dixon (TX) |
| `precision/*` | Does NOT false-flag a valid citation | PRECISION: Accurate Privette presumption claim |
| `uncertainty/*` | Says `could_not_verify` on a fictitious case rather than hallucinating | UNCERTAINTY: Marchetti v. Western Bay (fabricated) |

**CIT-001 -- The "never" Insertion Test:**
The precise prompt contains embedded legal knowledge (line 16-17 of `citation_verification.txt`):
```
Privette v. Superior Court, 5 Cal.4th 689 (1993) established a PRESUMPTION against
hirer liability, NOT absolute immunity. The word "never" does NOT appear in the holding.
```
The imprecise prompt has no such knowledge. Without it, the model must rely on parametric knowledge alone, which may or may not recall that "never" was fabricated.

**PRECISION -- The False-Positive Test:**
This test provides an *accurate* description of Privette's holding ("presumptively not liable") and asserts that the model must mark it as `supported`. The imprecise prompt, lacking schema guidance and embedded knowledge, may over-correct and flag even accurate citations as suspicious.

**UNCERTAINTY -- The Fabricated Citation Test:**
Marchetti v. Western Bay Developers is entirely fictitious. The precise prompt includes `could_not_verify` as an explicit status option, guiding the model to hedge. The imprecise prompt has no such escape hatch, so the model either fabricates a verdict or shoehorns uncertainty into `supported`/`not_supported`.

#### Fact Checking A/B: Metric Categories

From `prompt-precision-facts.yaml`:

| Metric Category | What It Measures | Key Test Case |
|-----------------|-----------------|---------------|
| `schema/*` | Has `verified_facts` array with correct structure | All test cases |
| `recall/*` | Catches date, PPE, and control contradictions | DATE-001, PPE-001, CTRL-001 |

**DATE-001 -- The Date Discrepancy:**
The precise prompt has "1. DATE CONSISTENCY" as an explicit numbered category (line 56), forcing the model to check dates. The imprecise prompt says only "find any inconsistencies" -- the model may or may not prioritize date comparison.

**PPE-001 -- The PPE Contradiction:**
The precise prompt has "2. PPE/SAFETY EQUIPMENT" as an explicit category (line 57). The imprecise prompt provides no structure, so the model may describe the PPE discrepancy in narrative form that doesn't match the expected JSON schema.

**CTRL-001 -- Retained Control:**
The precise prompt has "3. WHO DIRECTED THE WORK" with the specific question: "do the other documents show the hirer directed or controlled work instead?" This frames the check in legal terms (retained control doctrine). The imprecise prompt has no such framing -- the model may notice Donner's involvement but fail to connect it to the legal concept of retained control.

#### How to Read the A/B Results

When running `promptfoo eval`, each test case produces a pass/fail for each prompt variant. The comparison table looks like:

```
Test Case               | Precise Prompt | Imprecise Prompt
------------------------|----------------|------------------
schema/valid_json       | PASS           | PASS
schema/has_verified_facts| PASS          | FAIL (no array)
recall/date001          | PASS           | PASS
recall/ppe001           | PASS           | FAIL (narrative)
recall/ctrl001          | PASS           | FAIL (missed)
```

The precise prompt should score higher on every metric. The imprecise prompt typically:
- Fails `schema/*` metrics because it produces freeform JSON without the required field names
- Passes some `recall/*` metrics because obvious contradictions (dates) are hard to miss
- Fails subtle `recall/*` metrics (retained control) because it lacks the legal framing
- Fails `precision/*` metrics because it false-flags valid citations
- Fails `uncertainty/*` metrics because it fabricates verdicts on unknown citations

---

### 41.9 Cross-Prompt Architecture: How the Five Prompts Chain

```
MSJ Text
  |
  v
[1] CITATION_EXTRACTION_PROMPT
  |
  | citations[] (citation_text, claimed_proposition, source_location, context)
  |
  v                                    MSJ + Police + Medical + Witness
[2] CITATION_VERIFICATION_PROMPT       |
  | (runs N times, once per citation)  v
  |                              [3] FACT_CHECKING_PROMPT
  |                                    |
  | citation_results                   | fact_results
  |                                    |
  +------------------------------------+
  |
  v
[4] REPORT_SYNTHESIS_PROMPT
  |
  | top_findings, confidence_scores
  |
  v
[5] JUDICIAL_MEMO_PROMPT
  |
  v
Final memo + key_issues + recommended_actions
```

Each prompt produces a JSON contract that the next prompt consumes. The schema fields specified in the `Return JSON with:` line of each prompt are not arbitrary -- they are the input fields expected by the downstream prompt.

---

### 41.10 Interview Questions and Answers

**Q: Why are there five separate prompts instead of one large prompt?**

A: Separation of concerns, token budget management, and independent testability. A single mega-prompt would (1) exceed context windows for large MSJs, (2) conflate extraction with verification, making errors harder to trace, and (3) be impossible to A/B test individual stages. Each prompt can be independently evaluated with Promptfoo.

**Q: What is the most impactful single line across all five prompts?**

A: Line 44: `"The MSJ is the document being verified."` This single sentence transforms every downstream comparison from bidirectional ("find inconsistencies between documents") to unidirectional ("does the evidence support the MSJ's claims?"). Without it, the system produces noise about inter-document differences that have nothing to do with the MSJ's veracity.

**Q: Why embed legal knowledge directly in the citation verification prompt?**

A: Because the Privette "never" insertion is the single most common manipulation pattern in construction-injury MSJs. Parametric knowledge alone is unreliable -- the model may or may not recall the exact holding. Embedding the knowledge eliminates this variance. The tradeoff is that the prompt is case-type-specific, but since BS Detector targets construction-injury MSJs, this specialization is acceptable.

**Q: How do you measure prompt quality without human evaluation?**

A: Promptfoo A/B testing with four metric categories: `schema` (structural correctness), `recall` (catches known issues), `precision` (avoids false flags), and `uncertainty` (hedges on unknowns). Each category has programmatic assertions (JavaScript checks on JSON fields) and LLM-as-judge rubrics for semantic accuracy. Running both precise and imprecise prompts against the same test cases quantifies the impact of each precision rule.

**Q: What would you change if switching from DeepSeek to GPT-4 or Claude?**

A: The precision rules would need recalibration because different models have different false-positive profiles. The embedded legal knowledge block would likely need expansion (DeepSeek may need more guidance than Claude on US case law). The confidence calibration instruction in the synthesis prompt might need adjustment, as different models have different default confidence distributions. The A/B eval suite would remain identical -- it measures behavior, not implementation.

---

### 41.11 Summary Table: Prompt Design Patterns

| Pattern | Where Used | Purpose |
|---------|-----------|---------|
| ALL-caps emphasis | "Extract ALL", "IMPORTANT", "PRECISION RULES" | Prevents LLM tendency to sample/summarize |
| Explicit field schemas | Every prompt's `Return JSON with:` line | Enforces contracts between pipeline stages |
| Negative instructions | "do NOT include", "do NOT promote", "do NOT flag" | Suppresses specific known failure modes |
| Embedded domain knowledge | Citation verification: Privette holding | Eliminates reliance on unreliable parametric knowledge |
| MSJ-centric framing | Fact-checking: "The MSJ is the document being verified" | Converts bidirectional comparison to unidirectional verification |
| Ordered categories | Fact-checking: 8 numbered categories | Anchors reasoning in objective facts before subjective judgment |
| SKIP instruction | Fact-checking: "SKIP any category that does not apply" | Prevents noise entries for irrelevant categories |
| Confidence reasoning | Every prompt: `confidence_reasoning (1-2 sentences)` | Forces calibrated confidence scores instead of default 0.9 |
| Four-way status enum | `supported/not_supported/misleading/could_not_verify` | Captures nuanced outcomes that binary pass/fail cannot |
| Anti-noise directives | Synthesis: three explicit exclusion rules | Prevents report dilution with non-findings |
| Two-stage filtering | Fact-check -> Synthesize -> Memo | Each stage filters noise before the next stage sees it |


---

## 42. Production Cost & Interpretability Analysis

### Why This Section Exists

The BS Detector pipeline makes multiple LLM calls per case through a five-agent architecture. Without a cost model, it is impossible to evaluate whether the system is economically viable for court deployment. Without an interpretability framework, judges have no reason to trust opaque confidence numbers. This section addresses both gaps with exact numbers derived from the codebase.

---

### 42.1 Token Usage Per Agent

**Beginner Explanation:** Every LLM call sends text (tokens) in and receives text (tokens) out. We pay per token. Each agent in the pipeline has different prompt sizes and expected response sizes, so each agent has a different cost profile.

**Source files analyzed:**
- `backend/utils/prompts.py:1-101` -- all four prompt templates
- `backend/agents/fact_checker.py:25-47` -- document truncation at 6,000 chars per document
- `backend/agents/report_synthesizer.py:26-27` -- result truncation at 10,000 chars
- `backend/agents/judicial_memo.py:28-29` -- findings truncation at 6,000 chars

**Token estimation methodology:** 1 token ~= 4 characters (English text). All estimates assume a typical MSJ case with 4 documents, 8-12 citations, and 6-8 fact categories.

#### Agent-by-Agent Token Budget

| Agent | System Prompt (tokens) | User Prompt (tokens) | Response (tokens) | Total per call | Calls per case |
|-------|----------------------|---------------------|-------------------|----------------|----------------|
| **Document Parser** | ~80 (schema prompt, `llm_service.py:80-86`) | ~250 (template) + ~2,500 (MSJ text) = ~2,750 | ~800 (JSON array of 8-12 citations) | ~3,630 | 1 |
| **Citation Verifier** | ~80 (schema prompt) | ~200 (template) + ~100 (citation data) + ~200 (case context) = ~500 | ~150 (per citation JSON) | ~730 | 8-12 (one per citation, `citation_verifier.py:72-75`) |
| **Fact Checker** | ~80 (schema prompt) | ~1,200 (template with 8 categories) + ~6,000 (4 docs x 1,500 each, capped at 6,000 chars = ~1,500 tokens each) = ~7,200 | ~1,500 (6-8 verified facts) | ~8,780 | 1 |
| **Report Synthesizer** | ~80 (schema prompt) | ~300 (template) + ~5,000 (truncated results at 10,000 chars each, `report_synthesizer.py:26-27`) = ~5,300 | ~800 (findings + scores) | ~6,180 | 1 |
| **Judicial Memo** | ~80 (schema prompt) | ~200 (template) + ~1,500 (truncated findings at 6,000 chars, `judicial_memo.py:28`) + ~200 (case context) = ~1,900 | ~500 (memo + key issues) | ~2,480 | 1 |

#### Total Pipeline Token Budget (Typical Case)

```
Document Parser:        1 call  x  3,630 tokens  =   3,630
Citation Verifier:     10 calls x    730 tokens  =   7,300
Fact Checker:           1 call  x  8,780 tokens  =   8,780
Report Synthesizer:     1 call  x  6,180 tokens  =   6,180
Judicial Memo:          1 call  x  2,480 tokens  =   2,480
                                                   --------
TOTAL PER CASE:                                    ~28,370 tokens
```

**Breakdown by input vs. output:**
- Input tokens: ~22,000 (prompts + documents + context)
- Output tokens: ~6,370 (structured JSON responses)

**Expert Note:** The Citation Verifier dominates call count because it uses `asyncio.gather` to verify each citation independently (`citation_verifier.py:72-75`). This is architecturally correct -- each citation verification is an independent task -- but it means a case with 20 citations doubles the Citation Verifier cost from ~7,300 to ~14,600 tokens. The Fact Checker is the heaviest single call because it ingests four documents simultaneously, each capped at 6,000 characters (`fact_checker.py:25`).

---

### 42.2 Cost Per Case at DeepSeek Rates

**DeepSeek API pricing (deepseek-chat model, as configured in `llm_service.py:16`):**

| Component | Rate |
|-----------|------|
| Input tokens | $0.14 per 1M tokens |
| Output tokens | $0.28 per 1M tokens |

#### Per-Case Cost Calculation

```
Input cost:   22,000 tokens x ($0.14 / 1,000,000) = $0.00308
Output cost:   6,370 tokens x ($0.28 / 1,000,000) = $0.00178
                                                      --------
TOTAL PER CASE:                                       $0.00486
```

**That is approximately $0.005 per case -- half a penny.**

For scale:

| Volume | Cost |
|--------|------|
| 1 case | $0.005 |
| 100 cases/month | $0.49 |
| 1,000 cases/month | $4.86 |
| 10,000 cases/month | $48.60 |
| 100,000 cases/month | $486.00 |

**Interview-Ready Framing:** "The entire five-agent BS Detector pipeline costs less than half a cent per case on DeepSeek. A busy metropolitan court processing 10,000 motions per month would spend under $50/month on LLM inference. This makes the AI verification cost effectively zero compared to law clerk labor."

---

### 42.3 Cost Comparison: DeepSeek vs. GPT-4 vs. Claude

**Intermediate Explanation:** DeepSeek's pricing is dramatically lower than Western frontier models. This is the primary reason the system uses DeepSeek -- not because it is better at legal reasoning, but because the cost difference enables deployment at court scale.

| Model | Input (per 1M) | Output (per 1M) | Per-Case Cost | Multiplier vs. DeepSeek |
|-------|----------------|-----------------|---------------|------------------------|
| **DeepSeek Chat** (`llm_service.py:16`) | $0.14 | $0.28 | $0.005 | 1x (baseline) |
| **GPT-4o** | $2.50 | $10.00 | $0.119 | **24x** |
| **GPT-4 Turbo** | $10.00 | $30.00 | $0.411 | **84x** |
| **Claude 3.5 Sonnet** | $3.00 | $15.00 | $0.162 | **33x** |
| **Claude Opus 4** | $15.00 | $75.00 | $0.808 | **165x** |
| **Ollama (local)** (`llm_service.py:20-21`) | $0.00 | $0.00 | $0.00 (hardware only) | 0x (free inference) |

#### Per-Case Cost at 10,000 Cases/Month

| Model | Monthly LLM Cost |
|-------|-----------------|
| DeepSeek Chat | $49 |
| GPT-4o | $1,190 |
| GPT-4 Turbo | $4,110 |
| Claude 3.5 Sonnet | $1,620 |
| Claude Opus 4 | $8,080 |
| Ollama (local qwen2.5:7b) | $0 (+ ~$200/mo GPU amortization) |

**Expert Note on Model Selection:** The codebase supports three providers via `LLMService.__init__` (`llm_service.py:55-69`):

```python
# llm_service.py:55-69
def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
    if ollama_model := (model or os.getenv("OLLAMA_MODEL")):
        self.api_key = "ollama"
        self.model = ollama_model
        self.base_url = OLLAMA_BASE_URL
    elif key := (api_key or os.getenv("DEEPSEEK_API_KEY")):
        self.api_key = key
        self.model = model or DEEPSEEK_MODEL
        self.base_url = DEEPSEEK_BASE_URL
```

The Ollama path (`OLLAMA_MODEL=qwen2.5:7b`) enables zero-API-cost deployment for evaluation and development. In production, DeepSeek provides the best cost/quality tradeoff. The system is designed so that switching models requires only an environment variable change, not code modifications.

**Interview-Ready Framing:** "We chose DeepSeek because at $0.005/case, a court can verify every motion it receives for the cost of a single law clerk's daily coffee. GPT-4 would cost 24-84x more. The architecture supports model swapping via environment variables, so if a court requires a US-hosted model for data sovereignty, they can switch to GPT-4o and absorb the ~24x cost increase -- still under $1,200/month at 10K cases."

---

### 42.4 Infrastructure Cost Estimate

**Beyond LLM API costs, the system requires hosting infrastructure.**

#### Minimum Viable Deployment

| Component | Service | Monthly Cost |
|-----------|---------|-------------|
| **Application server** (FastAPI + agents) | 1x t3.medium (2 vCPU, 4 GB) | $30 |
| **PostgreSQL** (case storage, audit logs) | RDS db.t3.micro | $15 |
| **Redis** (optional caching) | ElastiCache t3.micro | $13 |
| **Document storage** (uploaded PDFs) | S3 (~10 GB) | $0.23 |
| **Load balancer** | ALB | $16 |
| **Monitoring** (CloudWatch) | Basic metrics | $5 |
| | **Total** | **~$79/month** |

#### Production Deployment (K8s)

| Component | Configuration | Monthly Cost |
|-----------|--------------|-------------|
| **EKS cluster** | Control plane | $73 |
| **Worker nodes** | 2x t3.large (2 vCPU, 8 GB) | $120 |
| **PostgreSQL** | RDS db.t3.medium, Multi-AZ | $70 |
| **Redis** | ElastiCache r6g.large | $100 |
| **S3** (documents + logs) | ~100 GB | $2.30 |
| **ALB + WAF** | Standard | $40 |
| **CloudWatch + alarms** | Enhanced | $20 |
| **Secrets Manager** | API keys | $2 |
| | **Total** | **~$427/month** |

#### Self-Hosted Ollama Deployment (Air-Gapped Courts)

| Component | Configuration | Monthly Cost |
|-----------|--------------|-------------|
| **GPU server** | 1x g4dn.xlarge (T4 GPU) or on-prem equivalent | $380 (or amortized hardware) |
| **Application server** | t3.medium | $30 |
| **PostgreSQL** | Local or RDS | $15-70 |
| **Storage** | Local SSD | Amortized |
| | **Total** | **~$425-480/month** |

**Expert Note:** The Ollama path is significant for courts with data sovereignty requirements. Family courts, sealed records, HIPAA-adjacent medical records -- these cannot transit third-party APIs. The `OLLAMA_MODEL=qwen2.5:7b` configuration (`llm_service.py:20-21`) enables fully air-gapped deployment where no document data leaves the court's network.

---

### 42.5 Total Cost of Ownership Per Court

| Deployment Tier | LLM Cost (10K cases) | Infrastructure | Monthly Total | Annual Total |
|----------------|---------------------|----------------|--------------|-------------|
| **Minimal** (DeepSeek, single server) | $49 | $79 | **$128** | **$1,536** |
| **Production** (DeepSeek, K8s) | $49 | $427 | **$476** | **$5,712** |
| **Air-Gapped** (Ollama, on-prem GPU) | $0 | $480 | **$480** | **$5,760** |
| **Premium** (GPT-4o, K8s) | $1,190 | $427 | **$1,617** | **$19,404** |

**Perspective:** A single law clerk costs $50,000-$80,000/year in salary plus benefits. The BS Detector at production tier costs ~$5,700/year.

---

### 42.6 ROI: Law Clerk Hours Saved vs. System Cost

#### Current Manual Process (Without BS Detector)

A law clerk verifying a Motion for Summary Judgment manually:

| Task | Time (hours) |
|------|-------------|
| Read MSJ and identify citations | 0.5 |
| Verify each citation in Westlaw/LexisNexis | 2.0-4.0 (depending on count) |
| Cross-reference facts against exhibits | 1.0-2.0 |
| Draft memo for judge | 0.5-1.0 |
| **Total per motion** | **4.0-7.5 hours** |

At $35-50/hour (loaded cost for a law clerk), that is **$140-$375 per motion**.

#### With BS Detector

| Task | Time (hours) |
|------|-------------|
| Upload documents to system | 0.1 |
| Pipeline runs (~30-60 seconds) | 0.0 |
| Review AI-generated report | 0.5-1.0 |
| Spot-check flagged issues in Westlaw | 0.5-1.0 |
| Edit judicial memo | 0.25 |
| **Total per motion** | **1.35-2.35 hours** |

**Time savings: 2.65-5.15 hours per motion (63-69% reduction)**

#### Annual ROI Calculation

| Metric | Value |
|--------|-------|
| Motions per year (medium court) | 2,400 (200/month) |
| Hours saved per motion | 3.9 hours (midpoint) |
| Total hours saved per year | 9,360 hours |
| Law clerk loaded cost | $42.50/hour (midpoint) |
| **Labor savings per year** | **$397,800** |
| System cost per year (production) | $5,712 |
| **Net savings** | **$392,088** |
| **ROI** | **6,867%** |

**Interview-Ready Framing:** "The ROI is not close. At $5,700/year for the system versus nearly $400,000 in saved labor hours, even if we are off by 5x on savings estimates, the system pays for itself 14 times over. The real value proposition is not cost savings alone -- it is that the system catches things humans miss when fatigued at hour six of citation checking."

---

### 42.7 Interpretability for Judges: The Confidence Score Problem

**Beginner Explanation:** When the BS Detector reports that a citation has "confidence: 0.73," what does that mean? If a judge cannot understand where a number comes from, the number is worse than useless -- it creates false precision that erodes trust.

#### The Problem: Opaque Confidence Scores

The current schema stores confidence as a bare float:

```python
# schemas.py:31
confidence: float = Field(default=0.5, ge=0, le=1)
```

This appears in `VerifiedCitation` (`schemas.py:28-36`), `VerifiedFact` (`schemas.py:46-54`), and `Finding` (`schemas.py:64-72`). When rendered to a judge, `0.73` communicates nothing about:

1. **What was checked** -- Was this verified against a database, or is the AI guessing?
2. **Why this number** -- What evidence pushed it to 0.73 instead of 0.95 or 0.40?
3. **What the judge should do** -- Is 0.73 good enough to rely on, or should the clerk manually verify?

**Expert Analysis:** The system mitigates this partially through the `confidence_reasoning` field:

```python
# schemas.py:32 (VerifiedCitation)
confidence_reasoning: Optional[str] = None

# schemas.py:50 (VerifiedFact)
confidence_reasoning: Optional[str] = None

# schemas.py:70 (Finding)
confidence_reasoning: Optional[str] = None
```

The prompts explicitly request this reasoning. For example, the citation verification prompt (`prompts.py:28`):

```
confidence_reasoning (1-2 sentences explaining why you assigned this confidence level)
```

And the fact-checking prompt (`prompts.py:67`):

```
confidence_reasoning (1-2 sentences explaining why you assigned this confidence level)
```

This is the right instinct, but the reasoning is LLM-generated text that the judge still has to interpret. The confidence score needs a **verification method label** to be truly interpretable.

#### The Solution: Labeled Confidence Categories

Instead of presenting raw floats, confidence should be displayed with its verification basis:

| Raw Score | Judge-Facing Label | Meaning |
|-----------|-------------------|---------|
| 0.90-1.0 | **HIGH (database-verified)** | Citation found in case law database with matching holding |
| 0.70-0.89 | **MEDIUM (cross-referenced)** | Facts consistent across multiple uploaded documents |
| 0.50-0.69 | **LOW (AI-estimated)** | LLM assessment only, no external verification |
| 0.00-0.49 | **FLAGGED (contradicted)** | Evidence directly contradicts the claim |

**Why this matters:** A judge who sees "MEDIUM (cross-referenced): The MSJ's incident date matches the police report and medical records" can evaluate reliability. A judge who sees "0.73" cannot.

The `confidence_reasoning` field (`schemas.py:32,50,70`) should always be displayed alongside the score. The prompts already request this reasoning -- the presentation layer must not strip it.

---

### 42.8 Evidence Trails: Linking Findings to Source Documents

**Intermediate Explanation:** Every claim in the verification report must trace back to a specific location in a specific document. Without this, the report is an AI opinion, not a verification tool.

#### Current Source Tracking in the Schema

The system already has the primitives for source tracking:

```python
# schemas.py:21-25 -- Citation tracks its location in the MSJ
class Citation(BaseModel):
    citation_text: str
    claimed_proposition: Optional[str] = None
    source_location: str = ""          # <-- section/paragraph in MSJ
    context: Optional[str] = None      # <-- surrounding sentence

# schemas.py:39-43 -- Fact tracks its source document
class Fact(BaseModel):
    fact_text: str = ""
    source_document: str = ""          # <-- which document (MSJ, police report, etc.)
    location: str = ""                 # <-- location within that document
    category: Optional[str] = None     # <-- e.g., DATE_CONSISTENCY, PPE_SAFETY

# schemas.py:46-54 -- VerifiedFact tracks supporting AND contradicting sources
class VerifiedFact(BaseModel):
    contradictory_sources: List[str] = Field(default_factory=list)
    supporting_sources: List[str] = Field(default_factory=list)
```

The `Finding` model also tracks evidence:

```python
# schemas.py:64-72
class Finding(BaseModel):
    evidence: List[str] = Field(default_factory=list)  # <-- evidence strings
```

#### What the Evidence Trail Should Look Like

For a judge reviewing a finding, the ideal evidence trail is:

```
FINDING F-3: Date Inconsistency (SEVERITY: HIGH, CONFIDENCE: 0.92)
 |
 +-- MSJ Claims: "The incident occurred on March 15, 2024"
 |   Source: MSJ, Page 3, Paragraph 2
 |
 +-- Police Report States: "Officers responded to incident on March 14, 2024"
 |   Source: Police Report, Page 1, Incident Summary
 |
 +-- Medical Records State: "Patient admitted 03/14/2024 at 14:32"
 |   Source: Medical Records, Page 1, Admission Record
 |
 +-- Confidence Reasoning: "Three independent documents (police report,
 |   medical records, witness statement) all record March 14. The MSJ's
 |   March 15 date is contradicted by all available evidence."
 |
 +-- Recommendation: "Court should verify the correct incident date;
     the one-day discrepancy may affect statute of limitations analysis."
```

The schema supports this via:
- `Citation.source_location` (`schemas.py:24`) for where in the MSJ
- `Fact.source_document` and `Fact.location` (`schemas.py:41-42`) for cross-references
- `VerifiedFact.contradictory_sources` and `supporting_sources` (`schemas.py:51-52`) for which documents agree/disagree
- `VerifiedFact.summary` (`schemas.py:54`) for the explanation
- `Finding.evidence` (`schemas.py:71`) for the evidence strings passed to the report

**Gap Identified:** The `evidence` field in `Finding` (`schemas.py:71`) is `List[str]` -- free-text strings. There is no structured link back to document + page + paragraph. The LLM generates these strings in the Report Synthesizer (`report_synthesizer.py:25-27`), and their quality depends on what the upstream agents included. The prompts request location data (`prompts.py:4`: "The section/paragraph where it appears"), but the LLM may or may not comply consistently.

---

### 42.9 The "Click Any Statement to See the Source" Pattern

**Beginner Explanation:** The gold standard for legal AI interpretability is that every statement in the AI's output should be clickable, taking the user directly to the source document, page, and paragraph that supports or contradicts the claim.

#### How Learned Hand Implements This

The pipeline architecture naturally supports this pattern through the data flow:

```
MSJ Upload
    |
    v
Document Parser (extracts citations with source_location)
    |
    +--> Citation Verifier (produces VerifiedCitation with citation.source_location)
    |
    +--> Fact Checker (produces VerifiedFact with fact.source_document + fact.location)
    |
    v
Report Synthesizer (aggregates into Finding with evidence[])
    |
    v
Judicial Memo (narrative summary linking back to findings)
```

At each stage, the source metadata flows through:

1. **Document Parser** (`document_parser.py:23`): The `CITATION_EXTRACTION_PROMPT` requests "The section/paragraph where it appears" (`prompts.py:4`), stored in `Citation.source_location`.

2. **Citation Verifier** (`citation_verifier.py:38-46`): The `VerifiedCitation` preserves the full `Citation` object, including `source_location`, so the UI can link back to the exact MSJ paragraph.

3. **Fact Checker** (`fact_checker.py:64-69`): Each `VerifiedFact` contains `Fact.source_document` (e.g., "police_report") and cross-reference lists (`contradictory_sources`, `supporting_sources`).

4. **Report Synthesizer** (`report_synthesizer.py:34-44`): The `Finding` aggregates evidence strings, but -- critically -- these are serialized from the upstream verified citations and facts (`report_synthesizer.py:26-27`), which carry their source metadata.

5. **Judicial Memo** (`judicial_memo.py:27-29`): The memo receives the top findings (with evidence) and generates a narrative. The prompt instructs: "Be specific about which claims are contradicted and by what evidence" (`prompts.py:94`).

#### UI Implementation Pattern

For the frontend to implement "click any statement to see the source":

```
+-------------------------------------------------------------------+
| FINDING: Date Inconsistency                           [HIGH] 0.92 |
|-------------------------------------------------------------------|
| The MSJ states the incident occurred on March 15, but three       |
| documents record March 14.                                        |
|                                                                   |
| Evidence:                                                         |
|   [MSJ p.3 para.2]  "incident occurred on March 15, 2024"        |
|   [Police Report p.1] "incident on March 14, 2024"               |
|   [Medical Records p.1] "admitted 03/14/2024 at 14:32"           |
|                                                                   |
| Each bracketed reference is a clickable link that scrolls to the  |
| relevant passage in the document viewer panel.                    |
+-------------------------------------------------------------------+
```

This requires:
- **Document-level anchors**: Each uploaded document needs paragraph-level IDs (generated during parsing)
- **Finding-to-document links**: The `evidence` list in `Finding` needs structured references, not just free text
- **Split-pane UI**: Left panel shows the report; right panel shows the source document with the relevant passage highlighted

**Expert Note:** The current `evidence: List[str]` in `Finding` (`schemas.py:71`) is the weakest link. Converting this to a structured type (e.g., `List[EvidenceRef]` with `document`, `page`, `paragraph`, `quote` fields) would enable automatic hyperlinking. The LLM already generates location information in its responses -- it just needs to be parsed into structured fields rather than left as free text.

---

### 42.10 Why Opaque Confidence Is Worse Than Labeled Confidence

**Expert Analysis:** This is the core interpretability argument for judicial AI systems.

#### The Spectrum of Confidence Presentation

**Level 1 -- Opaque (worst):**
```
Citation: Smith v. Jones, 123 F.3d 456
Confidence: 0.73
```

A judge cannot distinguish: Was 0.73 assigned because the LLM found the case but the holding was slightly different? Or because the LLM could not find the case at all and is guessing? Or because the case exists but is from a non-binding jurisdiction?

**Level 2 -- With reasoning (current system):**
```
Citation: Smith v. Jones, 123 F.3d 456
Confidence: 0.73
Reasoning: "The case exists and addresses the legal principle cited,
but the holding is narrower than the brief suggests. The brief claims
the case establishes a bright-line rule, while the actual holding
applies a multi-factor balancing test."
```

This is what the current system provides via `confidence_reasoning` (`schemas.py:32`). The prompts explicitly request it (`prompts.py:28,67,82`). It is a significant improvement over bare numbers, but still requires the judge to read and evaluate LLM-generated prose.

**Level 3 -- Labeled and categorized (recommended):**
```
Citation: Smith v. Jones, 123 F.3d 456
Confidence: MEDIUM (AI-assessed, not database-verified)
Verification: Holding exists but is narrower than claimed
Category: HOLDING_MISCHARACTERIZATION
Action: Clerk should verify on Westlaw -- search "Smith v. Jones" 123 F.3d 456
```

**Level 4 -- Full evidence trail (gold standard):**
```
Citation: Smith v. Jones, 123 F.3d 456
Confidence: MEDIUM (AI-assessed)
 |
 +-- Brief claims (MSJ p.7 para.3): "Smith established that employers
 |   bear strict liability for workplace injuries"
 |
 +-- AI assessment: The Smith court applied a negligence standard with
 |   burden-shifting, not strict liability. The brief overstates the
 |   holding.
 |
 +-- Status: MISLEADING (holding mischaracterized)
 +-- Recommended action: Verify holding in Smith v. Jones, 123 F.3d at 461-463
```

#### How the Current Schema Supports Each Level

| Level | Schema Fields Used | Supported? |
|-------|-------------------|------------|
| Level 1 (opaque) | `confidence: float` | Yes (`schemas.py:31,49,69`) |
| Level 2 (with reasoning) | `confidence_reasoning: Optional[str]` | Yes (`schemas.py:32,50,70`) |
| Level 3 (labeled) | `status: str` + `confidence` | Partially -- `status` exists (`schemas.py:35,53`) but has limited values |
| Level 4 (full trail) | `citation.source_location` + `evidence` + `confidence_reasoning` | Partially -- data exists but is not structured for rendering |

The `VerificationStatus` enum (`schemas.py:7-11`) provides four meaningful labels:

```python
# schemas.py:7-11
class VerificationStatus(str, Enum):
    SUPPORTED = "supported"
    NOT_SUPPORTED = "not_supported"
    COULD_NOT_VERIFY = "could_not_verify"
    MISLEADING = "misleading"
```

And for facts, the `ConsistencyStatus` enum (`schemas.py:14-18`):

```python
# schemas.py:14-18
class ConsistencyStatus(str, Enum):
    CONSISTENT = "consistent"
    CONTRADICTORY = "contradictory"
    PARTIAL = "partial"
    COULD_NOT_VERIFY = "could_not_verify"
```

**These enum labels are far more useful to a judge than raw floats.** A finding labeled `MISLEADING` with `confidence_reasoning` explaining why is actionable. A finding labeled `0.73` is not.

#### The Judicial Trust Equation

```
Trust = f(transparency, consistency, verifiability)
```

- **Transparency**: Can the judge see WHY the system flagged something? --> `confidence_reasoning`
- **Consistency**: Does the system flag the same issues every time? --> Deterministic pipeline, `temperature=0.1` (`llm_service.py:72-78`)
- **Verifiability**: Can the judge independently check the system's claims? --> Source links, document references

The system's low temperature setting (`temperature=0.1` in `llm_service.py:72`) is a deliberate design choice for consistency. Legal verification should not produce different results on different runs. Combined with structured output parsing (`llm_service.py:88-118`), this gives reproducible verification results.

---

### 42.11 Cost Optimization Strategies

**For teams looking to reduce costs further:**

#### Strategy 1: Citation Batching

Currently, the Citation Verifier makes one LLM call per citation (`citation_verifier.py:72-75`). Batching 3-5 citations per call would reduce overhead:

- **Current**: 10 citations x 730 tokens = 7,300 tokens across 10 calls
- **Batched**: 3 calls x ~2,000 tokens = 6,000 tokens across 3 calls
- **Savings**: ~18% token reduction + 70% fewer API calls (reduced latency)

The tradeoff: batched verification may produce lower-quality individual assessments because the LLM must context-switch between citations.

#### Strategy 2: Tiered Model Routing

Use a cheaper/faster model for initial screening and a more capable model only for flagged items:

```
Document Parser  --> DeepSeek Chat (cheap, good at extraction)
Citation Verifier --> DeepSeek Chat for initial pass
                     --> GPT-4o ONLY for citations flagged as "misleading" or "could_not_verify"
Fact Checker     --> DeepSeek Chat (single pass with all documents)
Report Synthesizer --> DeepSeek Chat
Judicial Memo    --> DeepSeek Chat (or GPT-4o for higher-quality prose)
```

This could reduce GPT-4o usage to ~2-3 calls per case (only flagged items), keeping the average cost under $0.05/case even with selective premium model usage.

#### Strategy 3: Caching

Identical citations across different motions (e.g., "Celotex Corp. v. Catrett, 477 U.S. 317") can be cached. Common legal citations repeat across hundreds of motions. A Redis cache keyed on `(citation_text, claimed_proposition)` could reduce Citation Verifier calls by 30-50% in steady state.

The infrastructure already includes Redis in the production deployment estimate. Implementing a cache layer between the `CitationVerifierAgent` and the `LLMService` would require minimal code changes.

---

### 42.12 Summary Table: Cost & Interpretability Quick Reference

| Metric | Value | Source |
|--------|-------|--------|
| Tokens per case | ~28,370 | Section 42.1 |
| Cost per case (DeepSeek) | $0.005 | Section 42.2 |
| Cost per case (GPT-4o) | $0.119 | Section 42.3 |
| DeepSeek vs GPT-4 multiplier | 24-165x | Section 42.3 |
| Infrastructure (production K8s) | $427/month | Section 42.4 |
| TCO per court per year | $5,712 | Section 42.5 |
| Law clerk hours saved per motion | 3.9 hours | Section 42.6 |
| Annual labor savings (medium court) | $397,800 | Section 42.6 |
| ROI | 6,867% | Section 42.6 |
| Confidence fields in schema | `confidence`, `confidence_reasoning`, `status` | `schemas.py:31-35,49-53,69-70` |
| Verification status labels | SUPPORTED, NOT_SUPPORTED, COULD_NOT_VERIFY, MISLEADING | `schemas.py:7-11` |
| Temperature setting | 0.1 (deterministic) | `llm_service.py:72` |
| Max document size (fact checker) | 6,000 chars per document | `fact_checker.py:25` |
| LLM calls per case | 13-15 (1 + N_citations + 1 + 1 + 1) | Pipeline architecture |

---

### 42.13 Interview Questions & Answers

**Q: "How much does it cost to run your system per case?"**

A: "Half a penny on DeepSeek. The five-agent pipeline uses approximately 28,000 tokens per case -- 22,000 input, 6,000 output. At DeepSeek's rates of $0.14/$0.28 per million tokens, that is $0.005 per case. A court processing 10,000 motions per month would spend $49/month on LLM inference. Total infrastructure including hosting is under $500/month."

**Q: "Why not use GPT-4 for better quality?"**

A: "The cost multiplier is 24-165x depending on which GPT-4 variant. For a system that needs to verify every motion a court receives, cost-per-case must be near-zero. DeepSeek at $0.005/case enables universal verification. GPT-4o at $0.12/case is still viable for smaller courts, and the architecture supports model swapping via environment variables. We also support local Ollama inference for air-gapped deployments where no document data can leave the court network."

**Q: "How do you make confidence scores meaningful for judges?"**

A: "We never present bare floats. Every confidence score ships with three things: a human-readable status label (SUPPORTED, MISLEADING, CONTRADICTORY from our enum types), a confidence_reasoning field with 1-2 sentences explaining the assessment, and an evidence trail linking back to specific documents and passages. A judge sees 'MISLEADING: The brief overstates the holding in Smith v. Jones -- the court applied a balancing test, not strict liability (MSJ p.7, para.3)' rather than '0.73'."

**Q: "What is the ROI for a court?"**

A: "A law clerk spending 4-7 hours manually verifying a motion costs $140-$375. The BS Detector reduces that to 1.5-2.5 hours of review time, at a system cost of $0.005 per case. For a medium court with 2,400 motions per year, that is nearly $400,000 in saved labor at a system cost of $5,700. Even being conservative by 5x, the system pays for itself 14 times over."

**Q: "What about data privacy for sensitive court documents?"**

A: "The system supports three deployment modes. Cloud DeepSeek for cost-optimal processing, cloud GPT-4o/Claude for US-hosted requirements, and fully air-gapped Ollama deployment where the qwen2.5:7b model runs on the court's own hardware. The air-gapped path is configured with a single environment variable -- `OLLAMA_MODEL=qwen2.5:7b` -- and no document data ever leaves the court's network. The cost is approximately $480/month for the GPU server, with zero per-token charges."


---

## 43. Frontend Architecture & Judge UX

### Beginner: Component Tree and Data Flow

The BS Detector frontend is a React single-page application that renders the verification report returned by the backend API. It uses no CSS framework -- all styling is inline JavaScript objects, which keeps the dependency footprint minimal for a demo/prototype.

#### Entry Point

`frontend/src/main.jsx` (lines 1-9):

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

Standard Vite + React 18 setup with `createRoot` and StrictMode. No router, no state management library -- the entire app is a single view.

#### Component Tree

```
App                          (App.jsx)
 |-- FileUpload              (components/FileUpload.jsx)
 |-- [error banner]          (inline in App.jsx)
 |-- [loading indicator]     (inline in App.jsx)
 +-- ReportView              (components/ReportView.jsx)
      |-- PipelineStatus     (components/PipelineStatus.jsx)
      |-- ConfidenceGauge    (components/ConfidenceGauge.jsx)
      |-- JudicialMemo       (components/JudicialMemo.jsx)
      |-- FindingCard[]      (components/FindingCard.jsx)  -- one per finding
      |-- [Citations table]  (inline in ReportView.jsx)
      +-- [Facts table]      (inline in ReportView.jsx)
```

#### State Management

All state lives in `App.jsx` via three `useState` hooks (lines 8-10):

```jsx
const [report, setReport] = useState(null)
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
```

| State    | Type            | Purpose                                    |
|----------|-----------------|--------------------------------------------|
| `report` | `object | null` | Full verification report from `/analyze`   |
| `loading`| `boolean`       | Disables buttons, shows spinner text       |
| `error`  | `string | null` | Displayed in red error banner when non-null |

Data flows one way: `App` passes `report` down to `ReportView`, which destructures it and passes subsections to child components. There is no upward data flow except `FileUpload` triggering `onAnalyze` / `onDemo` callbacks.

#### API Communication

`App.jsx` lines 12-44 define `runAnalysis`, the sole API call in the frontend:

```jsx
const runAnalysis = async (body) => {
  setLoading(true)
  setError(null)
  setReport(null)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 600_000) // 10 min

  try {
    const response = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
      signal: controller.signal,
    })
    // ...
    const data = await response.json()
    setReport(data.report)
  } catch (err) {
    if (err.name === 'AbortError') {
      setError('Analysis timed out after 10 minutes.')
    } else {
      setError(err.message)
    }
  } finally {
    clearTimeout(timeoutId)
    setLoading(false)
  }
}
```

Key design choices:
- **10-minute timeout** via `AbortController` (`App.jsx:18`) -- the multi-agent pipeline with LLM calls can take several minutes for complex documents
- **Single endpoint** `POST /analyze` -- no websocket, no streaming, no polling. The frontend blocks until the full report is ready
- **No authentication** -- demo-grade; a production system would require judge session tokens
- The `API_URL` is hardcoded to `http://localhost:8002` (`App.jsx:5`)

**Interview question:** *Why not use Server-Sent Events or WebSocket for a pipeline that takes minutes?*

> For a demo, the blocking POST is simpler and sufficient. In production, you would want SSE or WebSocket to stream per-agent progress updates in real time (the `PipelineStatus` component is already designed to show per-agent status, but currently only renders post-hoc). See Section 44 for the streaming architecture discussion.

---

### Intermediate: Component Deep-Dives

#### FileUpload Component

**File:** `frontend/src/components/FileUpload.jsx` (133 lines)

This component collects case documents from the user. It manages its own local state for form fields (`FileUpload.jsx:65-66`):

```jsx
const [caseId, setCaseId] = useState('')
const [docs, setDocs] = useState({
  msj: '', police_report: '', medical_records: '', witness_statement: ''
})
```

The document types are defined as a static array (`FileUpload.jsx:82-87`):

```jsx
const docFields = [
  { key: 'msj', label: 'Motion for Summary Judgment' },
  { key: 'police_report', label: 'Police Report' },
  { key: 'medical_records', label: 'Medical Records' },
  { key: 'witness_statement', label: 'Witness Statement' },
]
```

On submit, empty fields are filtered out (`FileUpload.jsx:72-79`):

```jsx
const handleAnalyze = () => {
  const filledDocs = Object.fromEntries(
    Object.entries(docs).filter(([, v]) => v.trim())
  )
  onAnalyze({
    case_id: caseId || undefined,
    documents: Object.keys(filledDocs).length > 0 ? filledDocs : undefined,
  })
}
```

When `documents` is `undefined`, the backend falls back to the built-in Rivera v. Harmon demo case. The "Run Demo Case" button calls `onDemo` directly (`App.jsx:46`), which sends an empty body `{}`.

| Prop        | Type       | Purpose                                |
|-------------|------------|----------------------------------------|
| `onAnalyze` | `function` | Called with `{case_id, documents}`     |
| `onDemo`    | `function` | Called with no args for demo case      |
| `loading`   | `boolean`  | Disables both buttons, dims opacity    |

**Input method:** Paste-only text areas, not file upload. This means documents must be plain text. A production system would accept PDF, DOCX, and provide an extraction layer.

#### PipelineStatus Component

**File:** `frontend/src/components/PipelineStatus.jsx` (107 lines)

Renders a horizontal flow diagram showing the status of each agent in the pipeline. This is one of the most information-dense components.

**Status icons** (`PipelineStatus.jsx:1-7`):

```jsx
const statusIcons = {
  success: { symbol: '\u2713', color: '#16a34a', bg: '#dcfce7' },  // green checkmark
  failed:  { symbol: '\u2717', color: '#dc2626', bg: '#fef2f2' },  // red X
  skipped: { symbol: '\u2013', color: '#6b7280', bg: '#f3f4f6' },  // grey dash
  running: { symbol: '\u25cf', color: '#2563eb', bg: '#dbeafe' },  // blue dot
  pending: { symbol: '\u25cb', color: '#9ca3af', bg: '#f9fafb' },  // grey circle
}
```

| Status    | Symbol | Color  | Meaning                        |
|-----------|--------|--------|--------------------------------|
| `success` | checkmark  | Green  | Agent completed successfully   |
| `failed`  | X      | Red    | Agent threw an error           |
| `skipped` | dash   | Grey   | Agent was not needed           |
| `running` | filled circle | Blue   | Agent currently executing      |
| `pending` | empty circle | Grey   | Agent has not started yet      |

**Agent labels** (`PipelineStatus.jsx:9-15`):

```jsx
const agentLabels = {
  document_parser: 'Parser',
  citation_verifier: 'Citation Verifier',
  fact_checker: 'Fact Checker',
  report_synthesizer: 'Synthesizer',
  judicial_memo: 'Judicial Memo',
}
```

**Parallel agent rendering** -- The component has special logic for showing that `citation_verifier` and `fact_checker` run in parallel (`PipelineStatus.jsx:40-41`):

```jsx
const isParallelStart = s.agent_name === 'citation_verifier'
const isParallelEnd = s.agent_name === 'fact_checker'
```

This renders as:

```
Parser --> [ Citation Verifier || Fact Checker ] --> Synthesizer --> Judicial Memo
```

The `[` bracket appears before Citation Verifier, `||` (parallel bars) appears before Fact Checker, and `]` appears after Fact Checker. Regular arrows (`-->`) connect sequential stages.

**Duration display** (`PipelineStatus.jsx:74-79`): Each agent badge shows its execution time. Times under 1 second display as `ms`, times over 1 second as `X.Xs`:

```jsx
{s.duration_ms < 1000
  ? `${s.duration_ms}ms`
  : `${(s.duration_ms / 1000).toFixed(1)}s`}
```

**Error details** (`PipelineStatus.jsx:89-104`): If any agent failed, a red error panel appears below the flow diagram listing each failed agent and its error message. The `title` attribute on each badge also shows the error on hover (`PipelineStatus.jsx:57`).

#### ConfidenceGauge Component

**File:** `frontend/src/components/ConfidenceGauge.jsx` (51 lines)

Renders three horizontal progress bars for confidence scores. Uses a traffic-light color scheme.

**Color thresholds** (`ConfidenceGauge.jsx:1-11`):

```jsx
const colors = {
  high: '#22c55e',    // green
  medium: '#eab308',  // yellow
  low: '#ef4444',     // red
}

function getColor(value) {
  if (value >= 0.7) return colors.high
  if (value >= 0.4) return colors.medium
  return colors.low
}
```

| Score Range | Color  | Meaning                                      |
|-------------|--------|----------------------------------------------|
| >= 0.7      | Green  | High confidence, findings well-supported     |
| 0.4 - 0.69 | Yellow | Medium confidence, some concerns             |
| < 0.4       | Red    | Low confidence, significant credibility gaps |

**Bars rendered** (`ConfidenceGauge.jsx:46-48`):

```jsx
<Bar label="Overall" value={scores.overall || 0} />
<Bar label="Citation Verification" value={scores.citation_verification || 0} />
<Bar label="Fact Consistency" value={scores.fact_consistency || 0} />
```

The `Bar` sub-component (`ConfidenceGauge.jsx:13-33`) renders each bar with:
- Label and percentage on the left/right of a header row
- A grey track (`#e5e7eb`) with a colored fill
- CSS transition on width (`transition: 'width 0.5s ease'`) for smooth animation when the report loads

**Interview question:** *Why show three separate bars instead of a single overall score?*

> A judge needs to distinguish between "the citations are fake" (citation_verification low) and "the facts contradict each other" (fact_consistency low). A single number hides which dimension failed. This is critical for judicial trust -- the judge must understand *what kind* of problem was detected.

#### FindingCard Component

**File:** `frontend/src/components/FindingCard.jsx` (99 lines)

Each finding gets its own color-coded card. The severity determines the entire visual treatment.

**Severity color scheme** (`FindingCard.jsx:1-6`):

```jsx
const severityStyles = {
  critical: { bg: '#fef2f2', border: '#fecaca', badge: '#dc2626', text: '#991b1b' },
  high:     { bg: '#fff7ed', border: '#fed7aa', badge: '#ea580c', text: '#9a3412' },
  medium:   { bg: '#fefce8', border: '#fde68a', badge: '#ca8a04', text: '#854d0e' },
  low:      { bg: '#f0fdf4', border: '#bbf7d0', badge: '#16a34a', text: '#166534' },
}
```

| Severity   | Background | Badge    | Visual impression        |
|------------|------------|----------|--------------------------|
| `critical` | Light red  | Red      | Urgent, demands attention|
| `high`     | Light orange | Orange | Significant concern      |
| `medium`   | Light yellow | Yellow | Moderate issue           |
| `low`      | Light green  | Green  | Minor or informational   |

**Card anatomy** (from top to bottom):

1. **Header row** (`FindingCard.jsx:19-42`): Severity badge (pill-shaped, uppercase), finding type label, and finding ID right-aligned
2. **Description** (`FindingCard.jsx:44-46`): Main finding text, color matches severity
3. **Evidence list** (`FindingCard.jsx:48-55`): Bulleted list of supporting evidence strings, only rendered if `finding.evidence` array is non-empty
4. **Confidence bar** (`FindingCard.jsx:57-76`): Mini progress bar using the severity badge color, with percentage label
5. **Confidence reasoning** (`FindingCard.jsx:78-90`): Italic grey text with a left border, explaining why the confidence level was assigned
6. **Recommendation** (`FindingCard.jsx:92-96`): Italic grey text with the suggested action

**Interview question:** *How does the confidence bar in FindingCard differ from ConfidenceGauge?*

> `ConfidenceGauge` uses traffic-light colors (green/yellow/red based on value). `FindingCard` uses the *severity* color for its bar regardless of the confidence value. A critical finding at 95% confidence renders as a red bar. This is intentional: the bar color communicates "how bad is this" while the percentage communicates "how sure are we."

#### JudicialMemo Component

**File:** `frontend/src/components/JudicialMemo.jsx` (67 lines)

Displays the synthesized judicial memo in a distinctive amber/gold theme that visually separates it from the analytical findings.

**Dual-format handling** (`JudicialMemo.jsx:5-8`):

```jsx
const memoText = typeof memo === 'string' ? memo : memo.memo
const keyIssues = typeof memo === 'object' ? memo.key_issues : null
const actions = typeof memo === 'object' ? memo.recommended_actions : null
const assessment = typeof memo === 'object' ? memo.overall_assessment : null
```

The memo can arrive as either a plain string (legacy format) or a structured object with `memo`, `key_issues`, `recommended_actions`, and `overall_assessment` fields. This backward compatibility means the component works regardless of which synthesizer version generated the report.

**Visual structure:**

1. **Amber container** (`JudicialMemo.jsx:13-18`): `background: '#fffbeb'` with `border: '1px solid #fde68a'` -- warm gold tone that evokes legal document formality
2. **Header** (`JudicialMemo.jsx:20-22`): "Judicial Memo" in dark amber (`#92400e`)
3. **Memo body** (`JudicialMemo.jsx:24-32`): Italic text in dark brown (`#78350f`) with generous line-height (1.7) for readability
4. **Key Issues list** (`JudicialMemo.jsx:34-41`): Bulleted list in amber tones
5. **Recommended Actions list** (`JudicialMemo.jsx:43-50`): Same style as key issues
6. **Overall Assessment** (`JudicialMemo.jsx:52-63`): Highlighted box with darker amber background (`#fef3c7`), bold text

The amber color scheme was chosen deliberately to distinguish the memo from the red/orange/yellow/green findings. It signals "this is a summary for the decision-maker" rather than "this is a detected problem."

#### ReportView Component

**File:** `frontend/src/components/ReportView.jsx` (191 lines)

The orchestrator component that assembles all report sub-components. It receives the full `report` object and destructures it:

```jsx
const citations = report.verified_citations || []
const facts = report.verified_facts || []
const findings = report.top_findings || []
```

**Rendering order** (`ReportView.jsx:14-147`):

| Order | Component/Section  | Data Source                | Lines    |
|-------|--------------------|----------------------------|----------|
| 1     | Header + metadata  | `report.motion_id`, `report.timestamp` | 15-25 |
| 2     | PipelineStatus     | `report.pipeline_status`   | 27       |
| 3     | ConfidenceGauge    | `report.confidence_scores` | 29       |
| 4     | JudicialMemo       | `report.judicial_memo`     | 31       |
| 5     | Top Findings       | `report.top_findings`      | 33-40    |
| 6     | Citations table    | `report.verified_citations`| 42-86    |
| 7     | Facts table        | `report.verified_facts`    | 88-132   |
| 8     | Unknown Issues     | `report.unknown_issues`    | 134-146  |

This order is deliberately designed for a judge's workflow: start with the big picture (pipeline health, confidence), then the executive summary (memo), then specific problems (findings), then detailed evidence (citations/facts), then edge cases (unknowns).

**StatusBadge helper** (`ReportView.jsx:175-190`):

```jsx
const statusColors = {
  supported:         { bg: '#dcfce7', color: '#166534' },  // green
  not_supported:     { bg: '#fef2f2', color: '#991b1b' },  // red
  misleading:        { bg: '#fff7ed', color: '#9a3412' },  // orange
  could_not_verify:  { bg: '#f3f4f6', color: '#6b7280' },  // grey
  consistent:        { bg: '#dcfce7', color: '#166534' },  // green
  contradictory:     { bg: '#fef2f2', color: '#991b1b' },  // red
  partial:           { bg: '#fefce8', color: '#854d0e' },  // yellow
}
```

This maps verification statuses to colored pill badges in the citation and fact tables. Note that `supported` and `consistent` share the same green, while `not_supported` and `contradictory` share red -- establishing a consistent color language across citation verification and fact checking.

**Table styling** (`ReportView.jsx:151-163`):

```jsx
const th = {
  textAlign: 'left',
  padding: '10px 12px',
  fontWeight: 600,
  color: '#374151',
  borderBottom: '2px solid #e5e7eb',
}

const td = {
  padding: '10px 12px',
  color: '#374151',
  verticalAlign: 'top',
}
```

Both citation and fact tables include a `confidence_reasoning` field rendered as small italic text below the main content in each row (`ReportView.jsx:74-77` for citations, `ReportView.jsx:120-123` for facts).

---

### Expert: Design Decisions, Trust Signals, and Production Gaps

#### Why Inline Styles (No CSS Framework)

The entire frontend uses JavaScript style objects passed to React's `style` prop. No Tailwind, no CSS modules, no styled-components.

**Advantages for a demo/prototype:**
- Zero build configuration beyond Vite defaults
- Styles are co-located with the component logic they affect
- No class name collisions, no CSS specificity wars
- Easy to understand for someone reading the code for the first time
- The style objects in `FileUpload.jsx:3-62` demonstrate the pattern: a single `styles` constant with named sub-objects

**Disadvantages that matter in production:**
- No responsive design (the `maxWidth: '960px'` in `App.jsx:50` is the only layout constraint)
- No dark mode support
- No hover/focus/active states (the buttons have no `:hover` style)
- No media queries possible inline
- Style duplication across components (similar card patterns repeated)
- No CSS extraction for production optimization

**Interview question:** *If you were to productionize this UI, what would you change first?*

> Move to a design system (e.g., Radix + Tailwind or shadcn/ui). The current inline styles make it impossible to add responsive behavior, keyboard accessibility, or theme support without a complete rewrite.

#### Trust Signals: What Works and What's Missing

The current UI communicates trustworthiness through several mechanisms:

**What currently works:**

1. **Multi-dimensional confidence** -- Three separate bars (overall, citation, fact) prevent the "single score" trap where 70% overall could mask a 30% citation score
2. **Per-finding confidence with reasoning** -- Each `FindingCard` shows not just a percentage but a `confidence_reasoning` string explaining *why* (e.g., "Based on direct contradiction between police report timestamp and medical records admission time")
3. **Evidence lists** -- Findings include evidence arrays that give the judge specific textual references
4. **Severity color coding** -- The four-level severity system (critical/high/medium/low) uses an intuitive color gradient that does not require training to interpret
5. **Pipeline transparency** -- `PipelineStatus` shows which agents ran, which failed, and how long each took. A judge can see "the citation verifier failed" rather than just getting a lower confidence score
6. **Status badges on citations/facts** -- Each verified citation/fact has a semantic status (`supported`, `not_supported`, `misleading`, `contradictory`, `partial`, `could_not_verify`) rendered as a color-coded badge

**What's missing for production judicial use:**

| Missing Feature | Why It Matters | Implementation Sketch |
|-----------------|----------------|-----------------------|
| Source document links | Judge cannot click through to the original text | Add document viewer with anchor links per citation |
| Side-by-side comparison | Judge needs to see brief claim next to source document | Split-pane layout with synchronized scrolling |
| Annotation/notes | Judge needs to mark findings as reviewed/disputed | Local state or backend persistence per finding |
| Evidence provenance | "Based on 3 documents" vs "AI estimation" distinction | Tag each evidence item with source type and confidence |
| Confidence calibration | 85% should mean "correct 85% of the time" | Requires evaluation dataset; see Section 40 |
| Audit trail | Record of every LLM call and intermediate result | Backend already has agent_outputs; expose in UI |
| Accessibility | Screen readers, keyboard navigation, WCAG compliance | Requires semantic HTML, ARIA attributes, focus management |
| Print/export | Judges need to attach reports to case files | PDF generation from report data |

#### Evidence Provenance: The Critical Missing Piece

The current `FindingCard` shows evidence as a flat list of strings (`FindingCard.jsx:48-55`):

```jsx
{finding.evidence.map((e, i) => <li key={i}>{e}</li>)}
```

A production system needs each evidence item to carry metadata:

```typescript
// Current (demo)
evidence: string[]

// Production requirement
evidence: {
  text: string
  source_document: string     // "police_report" | "medical_records" | ...
  source_location: string     // page number, paragraph, or character offset
  extraction_method: string   // "direct_quote" | "paraphrase" | "inference"
  confidence: number          // how confident are we this evidence is real
}[]
```

This distinction between "direct quote from document" and "AI inference" is the single most important trust signal for judicial users. A judge who sees "this finding is backed by 3 direct quotes from the police report" trusts it differently than "this finding was inferred by the AI from patterns across documents."

#### Color System Summary

The frontend uses a consistent but informal color language across all components:

| Color Family | Hex Range | Semantic Meaning | Components Using It |
|-------------|-----------|------------------|---------------------|
| Red | `#dc2626` - `#fef2f2` | Danger, failure, unsupported | FindingCard (critical), StatusBadge (not_supported, contradictory), PipelineStatus (failed), Error banner |
| Orange | `#ea580c` - `#fff7ed` | Warning, high severity | FindingCard (high), StatusBadge (misleading) |
| Yellow/Amber | `#ca8a04` - `#fefce8` | Caution, medium severity | FindingCard (medium), StatusBadge (partial), ConfidenceGauge (medium range), JudicialMemo (amber theme) |
| Green | `#16a34a` - `#f0fdf4` | Success, supported | FindingCard (low), StatusBadge (supported, consistent), PipelineStatus (success), ConfidenceGauge (high range) |
| Blue | `#2563eb` - `#dbeafe` | Active, in-progress | PipelineStatus (running), Primary button |
| Grey | `#6b7280` - `#f9fafb` | Neutral, unknown | PipelineStatus (pending, skipped), StatusBadge (could_not_verify) |

Note that "low severity" is green, not red. This is correct: a low-severity finding is a *good* thing (minor issue), so it gets the positive color.

#### App Layout Architecture

The top-level `App.jsx` establishes a centered, single-column layout (`App.jsx:49-55`):

```jsx
<div style={{
  maxWidth: '960px',
  margin: '0 auto',
  padding: '32px 20px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  color: '#111827',
}}>
```

The layout is strictly vertical: header, file upload form, error/loading states, then the full report. There is no sidebar, no navigation, no tabs. This works for a demo but would not scale to a production tool where judges need to:
- Switch between cases
- Compare multiple reports
- Navigate large reports with many findings
- Pin/bookmark specific findings

#### Conditional Rendering Pattern

The app uses a clean conditional rendering hierarchy (`App.jsx:63-96`):

```
Always: FileUpload
If error: Error banner
If loading: Loading message
Always: ReportView (renders null internally if no report)
If !report && !loading && !error: Empty state prompt
```

The empty state (`App.jsx:92-96`) provides clear guidance:

```jsx
<p style={{ textAlign: 'center', color: '#9ca3af', marginTop: '48px' }}>
  Upload documents or click "Run Demo Case" to analyze the Rivera v. Harmon test case.
</p>
```

This is important UX: the user always knows what to do next.

#### Interview Quick-Reference Table

| Topic | Key Detail | File:Line |
|-------|-----------|-----------|
| API timeout | 10 minutes via AbortController | `App.jsx:18` |
| API endpoint | `POST http://localhost:8002/analyze` | `App.jsx:5,21` |
| State management | Three useState hooks, no external library | `App.jsx:8-10` |
| Confidence thresholds | >= 0.7 green, >= 0.4 yellow, < 0.4 red | `ConfidenceGauge.jsx:7-11` |
| Severity levels | critical, high, medium, low | `FindingCard.jsx:1-6` |
| Pipeline agents | Parser, Citation Verifier, Fact Checker, Synthesizer, Judicial Memo | `PipelineStatus.jsx:9-15` |
| Parallel agents | citation_verifier and fact_checker shown with `[` `||` `]` | `PipelineStatus.jsx:40-41` |
| Memo format | Supports both string and structured object | `JudicialMemo.jsx:5-8` |
| Document types | MSJ, police report, medical records, witness statement | `FileUpload.jsx:82-87` |
| Citation statuses | supported, not_supported, misleading, could_not_verify | `ReportView.jsx:165-173` |
| Fact statuses | consistent, contradictory, partial, could_not_verify | `ReportView.jsx:165-173` |
| Styling approach | Inline JS style objects, no CSS framework | All components |
| Layout | Single column, 960px max-width, centered | `App.jsx:49-55` |

---

### Interview Scenario: "How Would You Redesign This for Production?"

**Expected answer structure:**

1. **Streaming pipeline updates**: Replace the blocking POST with SSE or WebSocket. The `PipelineStatus` component already renders per-agent status; it just needs real-time updates instead of post-hoc rendering.

2. **Document viewer with highlighting**: Side-by-side pane showing the original document with evidence passages highlighted. Each `FindingCard` evidence item becomes a clickable link that scrolls the source document to the relevant passage.

3. **Evidence provenance tags**: Every evidence item tagged as "direct quote," "paraphrase," or "AI inference" with distinct visual treatment. Judges need to know which evidence is machine-verified vs. machine-generated.

4. **Accessibility overhaul**: Replace inline styles with a component library that handles ARIA attributes, keyboard navigation, screen reader announcements, and high-contrast mode. Judicial tools must meet Section 508 / WCAG 2.1 AA.

5. **Case management**: Add routing, a case list view, and persistent storage so judges can review reports across sessions, add notes, and track which findings they have reviewed.

6. **Confidence calibration display**: Show not just the confidence percentage but its calibration context: "85% confidence means: in our test suite of 200 motions, findings at this confidence level were correct 83-87% of the time."

7. **Audit log viewer**: Expose the full chain-of-thought from each agent. The backend already stores agent outputs; the frontend needs a collapsible "show AI reasoning" section per finding.


---

