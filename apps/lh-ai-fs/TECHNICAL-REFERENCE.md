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
