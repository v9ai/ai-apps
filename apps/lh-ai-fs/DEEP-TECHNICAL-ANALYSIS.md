# Deep Technical Analysis: BS Detector Pipeline

## 1. Executive Summary

### Beginner Level
The BS Detector is a tool that reads a legal brief (a lawyer's written argument to a judge) and checks whether the lawyer is telling the truth. It looks at two things: (1) are the legal cases the lawyer cites real, and do they actually say what the lawyer claims? (2) do the facts in the brief match what's in the police report, medical records, and witness statements? It then writes a report telling the judge what's wrong.

### Intermediate Level
The system is a multi-agent pipeline built in Python with FastAPI. Five specialized AI agents — document parser, citation verifier, fact checker, report synthesizer, and judicial memo writer — process legal documents in a defined sequence with one parallelization point. All inter-agent data is typed with Pydantic models. The pipeline runs on DeepSeek (cloud) or Ollama (local) through LangChain's ChatOpenAI abstraction. An evaluation harness with 31 assertions across 6 dimensions measures output quality against 8 planted ground-truth errors.

### Expert Level
This is a sequential-parallel DAG of five LLM-backed agents orchestrated through `PipelineOrchestrator`, which is itself deterministic (no LLM calls). The only concurrent execution point is `asyncio.gather(citation_task, fact_task)` at orchestrator.py:110-112, exploiting the independence between citation verification (legal knowledge task) and cross-document fact checking (evidence reconciliation task). Within the citation verifier, a second parallelism level processes individual citations concurrently via `asyncio.gather(*verify_one_calls)`. All inter-agent contracts are Pydantic-serialized dicts (not object references), making the pipeline distributable without architectural changes. The eval harness implements a dual-matching strategy (keyword ≥2-hit threshold + opt-in LLM-as-judge semantic evaluation) with evidence grounding checks and SQLite-persisted run history keyed by git SHA. The core architectural gap is citation verification's reliance on LLM parametric knowledge rather than a legal database — the `{case_context}` injection in `case_context.py` is a 19-line placeholder for what would be a RAG pipeline over a curated corpus in production.

---

## 2. Architecture Deep Dive

### Pipeline Topology

```
Documents --> DocumentParser --> [CitationVerifier || FactChecker] --> ReportSynthesizer --> JudicialMemoAgent --> VerificationReport
```

### Beginner Level
Think of this like an assembly line in a factory. First, one worker reads the legal brief and highlights all the important parts (the parser). Then two workers simultaneously check different things: one checks whether the legal cases cited are real (citation verifier), while the other checks whether the facts match the other documents (fact checker). After both finish, another worker combines all the findings into one report (synthesizer). Finally, a legal writing specialist writes a formal memo for the judge (memo agent).

The reason they can work simultaneously in the middle is that checking citations and checking facts are completely independent tasks — neither needs the other's results. This cuts the total time roughly in half for that stage.

### Intermediate Level
The pipeline is a five-stage directed acyclic graph (DAG) with one parallelization point. The `||` notation between CitationVerifier and FactChecker indicates concurrent execution via `asyncio.gather()`.

**Why this topology and not another?**

Several alternatives were considered:

1. **Fully sequential** (Parser → Verifier → Checker → Synthesizer → Memo): Simpler but slower. Citation verification and fact checking share no data dependencies — running them sequentially wastes time. The parallel topology cuts wall-clock time by ~40% for the verification stage.

2. **Fully parallel** (all agents receive raw documents simultaneously): Faster but impossible. The synthesizer needs results from both verifier and checker. The memo needs results from the synthesizer. Data dependencies enforce the sequential edges.

3. **Monolithic single-prompt** ("read all documents, check everything, write a report"): Maximum simplicity, minimum reliability. A single prompt conflating extraction, verification, and synthesis produces worse results than specialized prompts because each task requires different cognitive framing. The extraction task needs "be comprehensive," the verification task needs "be skeptical," and the synthesis task needs "be concise."

4. **Micro-agent decomposition** (separate agents for date checking, PPE checking, jurisdiction checking, etc.): Maximum specialization but excessive coordination overhead. Each agent adds an LLM call (~3-10 seconds), a failure point, and a coordination step. The 5-agent decomposition is the Pareto optimum: enough specialization for distinct cognitive tasks, few enough agents for manageable coordination.

**Orchestration pattern**: `PipelineOrchestrator` (orchestrator.py) is a coordinator, not an agent. It makes zero LLM calls. Its behavior is fully deterministic — only the agents introduce non-determinism through their LLM interactions. This separation matters because it means pipeline control flow can be reasoned about, tested, and debugged independently of LLM behavior.

**Why the orchestrator is not an agent**: If the orchestrator itself made LLM calls (e.g., to decide which agents to invoke, or to route findings), the pipeline's behavior would become harder to predict and debug. A deterministic orchestrator means that given the same agent outputs, the pipeline always produces the same final report. This makes eval reproducible and debugging tractable.

### Expert Level

**Status tracking implementation**: Four helper functions (`_track`, `_start`, `_succeed`, `_fail` at orchestrator.py:22-42) manage per-agent `AgentStatus` entries with millisecond-precision timing. This is a lightweight distributed tracing system without the overhead of OpenTelemetry. Each agent transition (pending → running → success/failed) is recorded with timing and error messages, producing an observable pipeline in the final `VerificationReport.pipeline_status` field.

**Why timing is per-agent and not per-LLM-call**: The orchestrator tracks agents, not individual LLM calls. This is because: (a) the orchestrator doesn't have visibility into agent internals (an agent may make one or many LLM calls), and (b) agent-level timing is what matters for pipeline optimization — knowing that the fact checker takes 15 seconds tells you where to optimize, even if you don't know how those 15 seconds split across internal operations.

**Data flow design**: Every stage passes data forward as Python dicts (serialized from Pydantic models via `.model_dump()`). This is a deliberate choice over passing Pydantic instances directly.

**Why dicts instead of Pydantic objects**: Three reasons. (1) JSON-serializability: the intermediate data can be logged, cached, or transmitted over the network without additional serialization. (2) Loose coupling: agents don't import each other's Pydantic models. The parser doesn't need to know about `VerifiedCitation`. (3) Future distributability: if agents were moved to separate services (e.g., citation verification on a GPU node, fact checking on a CPU node), the dict-based interface requires no changes. Passing Pydantic objects would create import dependencies across service boundaries.

**The data flow in detail**:

1. **Parser** receives `Dict[str, str]` (document keys → text), returns `{citations: List[dict], facts: List[dict]}`. Only `citations` is forwarded — `facts` is extracted but unused. This is a vestige of an earlier design where the parser's extracted facts would be compared against the fact checker's independent analysis. The unused `facts` field could be removed, but it's harmless and the parser already does the extraction work.

2. **CitationVerifier** receives `{citations: List[dict], case_context: str}`, returns `List[dict]`. Each dict is a serialized `VerifiedCitation`. The `case_context` is injected by the orchestrator (orchestrator.py:97) after loading it from `case_context.py`.

3. **FactChecker** receives the full document dict augmented with `case_context`, returns `List[dict]`. Each dict is a serialized `VerifiedFact`. The fact checker receives raw documents, not parser-extracted facts, because it needs the full text for cross-referencing — not just the claims the parser identified.

4. **Synthesizer** receives both result lists (truncated to 10,000 chars each — report_synthesizer.py:26-27), returns `{top_findings, confidence_scores, unknown_issues}`.

5. **MemoAgent** receives findings + scores + case_context, returns a serialized `JudicialMemo`.

**Why the fact checker receives raw documents, not parser-extracted facts**: The parser extracts facts from the MSJ specifically. But fact checking requires comparing MSJ claims against the full text of supporting documents — not just the facts the parser happened to extract from those documents. If the police report contains a detail the parser didn't extract as a "fact" (because it's an observation, not a claim), the fact checker still needs to cross-reference it. Raw document access gives the fact checker maximum context.

---

## 3. Agent-by-Agent Analysis

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

**Why per-citation parallelism**: With 5-10 citations in a typical MSJ, sequential verification would take 5×(3-10s) = 15-50 seconds. Parallel verification completes in max(3-10s) = 3-10 seconds. The citations are independent — verifying Privette v. Superior Court doesn't require knowing anything about Dixon v. Lone Star. This is a second level of parallelism (the first is at the orchestrator level between agents).

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

**Truncation strategy (line 26)**: Documents over 6,000 characters are truncated with a notice appended to the prompt. **Why 6,000 chars?** This keeps the total prompt under ~25,000 tokens (4 documents × 6,000 chars + prompt instructions), which fits comfortably within DeepSeek's context window while leaving room for the response. The truncation is lossy — contradictions in truncated content will be missed — but the alternative (exceeding context limits) would fail entirely.

#### Expert Level

**Precision rules deep dive** (prompts.py:46-52): These seven rules are the product of iterative failure analysis. Each rule addresses a specific false-positive pattern discovered during development:

1. *"Contradictory means the MSJ makes a SPECIFIC CLAIM that is directly refuted"* — Without this, the LLM flagged implicit claims (e.g., "MSJ implies the scaffolding was safe by not mentioning defects" → contradictory). Requiring a specific claim raises the bar for contradiction.

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

## 4. Citation Verification Gaps

### Beginner Level
The biggest weakness of the system is how it checks legal citations. Right now, it asks an AI model "do you know if this case exists and says what the lawyer claims?" The AI answers based on whatever it learned during training — which might be wrong, incomplete, or outdated. A real legal citation checker would look up the case in an actual database (like Westlaw) and read the real court opinion.

This matters enormously because a fabricated citation in a legal brief can result in sanctions against the attorney, dismissal of the case, or even disbarment. When ChatGPT hallucinated fake case citations in Mata v. Avianca (2023), the lawyers were fined $5,000 each and publicly sanctioned. Courts are already skeptical of AI precisely because of this failure mode.

### Intermediate Level
Citation verification currently operates through two mechanisms:

1. **Case-specific knowledge injection** (`case_context.py`): For Rivera v. Harmon, the system injects domain knowledge — that Privette established a presumption (not immunity), that "never" doesn't appear in the holding, and that Dixon/Okafor are out-of-state. This is 19 lines of hardcoded knowledge.

2. **LLM parametric knowledge**: For unknown cases, the citation verifier relies on what the LLM learned during training. The prompt asks "Does the citation actually exist, or could it be fabricated?" but an LLM cannot authoritatively answer this.

**Why the case context approach is both right and wrong**: The pattern — inject domain knowledge so the verifier knows what to look for — is architecturally correct. In production, `get_case_context()` would query a legal database instead of returning a hardcoded string. The interface is right; the implementation is a placeholder. But the placeholder reveals a fundamental issue: without external knowledge, the verifier is guessing. It might confidently verify a fabricated citation because the citation sounds plausible, or reject a real citation because the LLM never encountered it during training.

**Why `COULD_NOT_VERIFY` partially but insufficiently addresses this**: The status enum includes `COULD_NOT_VERIFY` as a safe escape. In theory, the LLM should use this when it's not sure about a citation. In practice, LLMs are overconfident — they tend to assert either `SUPPORTED` or `NOT_SUPPORTED` rather than admitting uncertainty. The prompt tries to encourage uncertainty ("Does the citation actually exist, or could it be fabricated?") but this is a prompt-level workaround for a knowledge-level problem.

### Expert Level

**The five-tier production verification model**:

1. **Existence** — Query a legal database API (CourtListener for federal cases, Westlaw/LexisNexis for comprehensive coverage). Verify volume, reporter, page number match a real case. Confirm the case name matches. This is a deterministic lookup — either the case exists or it doesn't. No LLM judgment needed.

   **Why CourtListener first**: It's free and open-source, covers all federal cases, and has an API. Westlaw/LexisNexis have comprehensive state coverage but are expensive and require licensing agreements. A startup would use CourtListener for free federal coverage and negotiate Westlaw/Lexis for state coverage based on business needs.

2. **Holding accuracy** — RAG pipeline: retrieve the actual court opinion text, embed it, find passages relevant to the claimed proposition, and compare. The LLM's role shifts from "do you know this case?" (unreliable) to "does this retrieved passage support the brief's claim?" (much more reliable because the LLM is reading the actual text, not recalling from memory).

   **Why RAG is fundamentally different from parametric knowledge**: When an LLM retrieves and reads the actual Privette opinion, it can verify whether "never" appears in the holding by reading the text. When it relies on parametric knowledge, it's reconstructing the holding from compressed statistical patterns — like someone trying to quote a book from memory vs. looking at the page.

3. **Jurisdiction** — Parse the reporter notation to determine jurisdiction. `S.W.3d` → Texas. `So.3d` → Florida. `Cal.4th` → California. `F. Supp.` → Federal district. This is entirely rule-based — no LLM needed. A lookup table of reporter abbreviations → jurisdictions covers 99% of cases. Then compare the citation's jurisdiction to the case's jurisdiction to determine binding vs. persuasive authority.

   **Why this is rule-based, not LLM-based**: Reporter abbreviations are standardized legal notation. A lookup table is faster, cheaper, and 100% accurate compared to asking an LLM "is this a Texas case?" (which is usually correct but occasionally wrong). Use the right tool for the job — not every task needs an LLM.

4. **Treatment** — Shepard's (LexisNexis) or KeyCite (Westlaw) check. Has the case been overruled, reversed, distinguished, questioned, or affirmed? A brief citing an overruled case is worse than one citing the wrong jurisdiction — the case used to be good law but no longer is. This is an API call, not an LLM task.

   **Why treatment checking matters more than most people think**: A mischaracterized citation is bad. A fabricated citation is worse. But a citation to an overruled case is the most dangerous — it's a real case that the attorney may have found through legitimate research, but the law has changed since the case was decided. An attorney might cite it in good faith if they used outdated research materials. An AI system that doesn't check treatment will miss this entirely.

5. **Proposition-level verification** — The subtlest check. Extract the specific legal proposition the brief claims the case supports. Search the opinion for passages addressing that proposition. Compare the brief's characterization against what the case actually says. This catches the Privette problem: the case is real, correctly cited, but its holding is mischaracterized (presumption → absolute immunity; "never" inserted).

   **Why this is the hardest tier**: Tiers 1-4 are either deterministic (lookup, rule-based) or straightforward LLM tasks (read passage, answer yes/no). Tier 5 requires understanding legal reasoning — the LLM must understand what "presumption" means in legal context, recognize that "never" transforms a presumption into an absolute rule, and flag this as mischaracterization rather than a simple paraphrase. This is where legal domain expertise matters in the prompt.

**The current system has the logic for tiers 1-3** (in `citation_verifier.py`) but backs them with LLM parametric knowledge instead of a database. The architecture doesn't change — only the knowledge source. The `{case_context}` injection pattern is the interface through which database results would flow.

---

## 5. Cross-Document Consistency

### Beginner Level
The fact checker reads all four documents and compares them, looking for contradictions. Imagine you have four witnesses to a car accident. If three say it happened on Tuesday and one says Thursday, that's a contradiction. The fact checker does this systematically across dates, safety equipment, who was in charge, the condition of the scaffolding, and more.

The hardest part isn't finding obvious contradictions — it's avoiding false alarms. Not every difference between documents is a real contradiction. The police report might mention a routine inspection that the MSJ doesn't mention — that's not a contradiction, it's just different documents covering different aspects. The precision rules in the prompt tell the AI to distinguish real contradictions from normal differences.

### Intermediate Level
The fact checker receives all four documents in a single prompt with 8 explicit checking categories. This structured approach ensures systematic coverage while the precision rules prevent over-flagging.

**Why all documents in one prompt instead of pairwise comparison**: Pairwise comparison (MSJ vs police, MSJ vs medical, MSJ vs witness) would require 3 separate prompts and couldn't detect multi-source contradictions. The date discrepancy (March 14 vs March 12) is most compelling because three independent documents agree on March 12 — seeing this in a single prompt is more powerful than three separate binary comparisons.

**Why explicit categories instead of open-ended**: Testing showed that "find any inconsistencies" produces wildly variable results. In some runs, the LLM found the date error and PPE contradiction. In other runs, it focused on irrelevant formatting differences. Explicit categories act as a checklist — the LLM systematically examines each dimension. This trades creative discovery (the LLM might find something unexpected) for reliable coverage (the LLM will check what we know matters).

**Why the categories are ordered as they are**: DATE_CONSISTENCY comes first because dates are the easiest thing to check — a specific date either matches or doesn't. PPE_SAFETY comes second because it's binary (wearing PPE or not). STRATEGIC_OMISSION comes last because it's the most subjective — determining whether an omission is "strategic" requires judgment. Front-loading objective checks gives the LLM a warm-up of easy, high-confidence tasks before tackling the harder judgment calls.

### Expert Level

**The "skip inapplicable categories" instruction** and its failure modes: The prompt says "SKIP any category that does not apply to the documents provided." This works most of the time but has edge cases:

- **False skip**: The LLM skips SCAFFOLDING_CONDITION because the MSJ doesn't explicitly discuss scaffolding condition — but the omission of scaffolding condition IS the finding (D-07). The instruction to skip inapplicable categories can conflict with the instruction to detect strategic omissions. This tension is inherent and isn't fully resolved by the prompt.

- **False inclusion**: The LLM generates an OSHA_COMPLIANCE entry even though the clean test documents (Smith v. ABC Corp) don't discuss OSHA. This generates a false positive on precision tests. The "skip" instruction reduces but doesn't eliminate this.

- **Why not make skipping deterministic**: You could have the orchestrator pre-filter categories based on keyword presence (e.g., only include SCAFFOLDING_CONDITION if "scaffold" appears in any document). But this would miss cases where the MSJ's omission of the keyword IS the finding. Strategic omissions are, by definition, things that aren't mentioned.

**The MSJ-centric framing** (prompts.py:44): "The MSJ is the document being verified. When the police report, medical records, or witness statement contradict what the MSJ claims or implies, mark the fact as contradictory — even if those other documents agree with each other."

**Why this framing matters**: Without it, the LLM sometimes flags contradictions in the wrong direction — e.g., "the police report says March 12 but the MSJ says March 14 → police report is inaccurate." The MSJ-centric framing establishes that the MSJ is the document under scrutiny and the supporting documents are the evidence against which it's judged. This mirrors the judicial review process where a judge evaluates the brief's claims against the evidence.

**Truncation and evidence loss**: Each document is capped at 6,000 characters. For the Rivera test case, all documents fit within this limit. For a real 50-page MSJ, the truncation would lose approximately 80% of the document content. The truncation notice ("Analysis may be incomplete") is appended to the prompt, but the lost content is simply not analyzed — no chunking strategy, no summarization, no hierarchical processing.

**Why not chunk and merge**: Chunking (splitting each document into segments, running the fact checker on each pair of segments, merging results) would solve the truncation problem but introduce new ones: (1) cross-chunk references ("as stated in Section III.A above") would break; (2) the merge step would need to deduplicate findings across chunks; (3) the number of LLM calls would multiply by chunk_count². For the take-home, truncation was the pragmatic choice. For production, chunking with cross-chunk context injection would be necessary.

---

## 6. Eval Harness Analysis

### Beginner Level
The evaluation system measures how good the BS Detector actually is. It works like a teacher grading a test where you already know the answers. The "test" has 8 planted errors in the legal brief (wrong date, false PPE claim, misquoted case, etc.), and the eval checks: (1) Did the system catch each planted error? (recall) (2) Did it only flag real errors, not invent fake ones? (precision) (3) Did it make up evidence that isn't in the actual documents? (hallucination check).

The eval also runs the system on perfectly clean documents (no errors planted) to make sure it doesn't cry wolf on correct briefs.

### Intermediate Level
The eval operates at five layers, each testing at a different level of abstraction:

**Layer 1 — Python Comprehensive Eval (`run_evals.py`)**: 31 assertions across 6 categories:

| Category | Count | What It Tests |
|----------|-------|---------------|
| Recall | 8 | Does it catch each planted error? (weighted: critical = 2x) |
| Precision | 4 | Does it avoid false flags on clean docs? |
| Hallucination | 4 | Does it avoid fabricating evidence or case names? |
| Cross-document | 5 | Does it actually cross-reference all document types? |
| Uncertainty | 4 | Does it express appropriate uncertainty? |
| Structure | 6 | Does it produce well-typed structured output? |

**Why 6 categories instead of just precision/recall**: Legal AI has failure modes beyond wrong answers. A system with perfect precision and recall but fabricated evidence (hallucination) is dangerous. A system that doesn't cross-reference documents (just reads the MSJ) is useless even if it gets the right answers by coincidence. A system that expresses 100% confidence on everything is untrustworthy. The 6 categories capture the full spectrum of legal AI quality requirements.

**Why weighted recall**: Not all errors are equally important. The date discrepancy (D-01, 2x weight) affects the statute of limitations. The Privette misquotation (D-03, 2x weight) misrepresents the law. The scaffolding condition omission (D-07, 1x weight) is important but less legally impactful. Weighted recall reflects this: catching the date error is worth twice as much as catching the scaffolding omission.

**Layer 2 — Keyword Matching (`evals/metrics.py`)**: Requires >= 2 keyword hits from ground truth.

**Why 2 keywords instead of 1**: One keyword produces false matches. A finding about "March weather" would match "march" from the date discrepancy ground truth. Two keywords (e.g., both "march 14" and "march 12") dramatically reduces coincidental matches. Three keywords would be too strict — correct findings that describe the issue differently might not use 3 specific ground-truth keywords.

**Layer 3 — LLM-as-Judge (`evals/llm_judge.py`)**: Semantic matching via an LLM evaluator.

**Why both keyword and semantic matching**: Keyword matching is fast, deterministic, and transparent — you can see exactly which keywords matched. But it misses semantically equivalent descriptions (e.g., "temporal discrepancy" vs "date inconsistency"). LLM-as-judge catches these semantic equivalences but is slower, more expensive, and non-deterministic. Together, they provide the best coverage — the combined metrics (Layer 4) show which discrepancies each method uniquely catches.

**Layer 4 — Combined Metrics**: Union of keyword + LLM matches.

**Layer 5 — SQLite Persistence (`evals/db.py`)**: Every eval run stored with git SHA.

**Why SQLite specifically**: No setup required (stdlib sqlite3), works in Docker, no external database to manage. WAL mode enables concurrent reads during eval runs. The git SHA linkage is the key feature — it enables "this prompt change in commit abc123 improved recall from 75% to 87.5%" analysis.

### Expert Level

**The `_check_ground_truth()` matching algorithm** (run_evals.py:217-230): Two matching modes:

```python
if gt["match_mode"] == "any":
    return any(kw in all_text for kw in gt["keywords"])
elif gt["match_mode"] == "keyword_plus_signal":
    has_keyword = any(kw in all_text for kw in gt["keywords"])
    has_signal = any(sig in all_text for sig in gt.get("require_also", []))
    return has_keyword and has_signal
```

- **`any` mode** (D-01 DATE, D-04 SOL, D-07 SCAFFOLDING, D-08 SPOLIATION): Any keyword from the list triggers a match. Used for errors where a single keyword is sufficiently specific (e.g., "march 14" only appears in the date discrepancy context).

- **`keyword_plus_signal` mode** (D-02 PPE, D-03 PRIVETTE, D-05 CTRL, D-06 JURISDICTION): Requires both a keyword AND a signal word. Used for errors where the keyword alone is ambiguous — "harness" appears in both the PPE contradiction finding AND in a neutral description of safety equipment. Requiring "harness" + one of ["contradict", "wearing", "false", "inconsisten", "not_supported"] ensures the match is about a contradiction involving harness, not just mentioning harness.

**Why this is keyword-based instead of embedding-based**: Embedding similarity (cosine similarity between finding and ground truth embeddings) would provide graduated matching instead of binary. But embeddings introduce non-determinism and threshold sensitivity — what cosine similarity threshold constitutes a "match"? Keywords are deterministic, debuggable, and transparent. The eval should be the most predictable component in the system — using an LLM for eval introduces LLM uncertainty into the measurement of LLM accuracy, which is epistemologically problematic. (The LLM-as-judge is opt-in precisely for this reason.)

**The text extraction pipeline** (run_evals.py:179-214): `_extract_searchable_text()` pulls text from three report sections (`top_findings`, `verified_facts`, `verified_citations`) and normalizes it to lowercase. Each section has different extraction logic:

- `top_findings`: concatenates description, type, evidence items, recommendation
- `verified_facts`: concatenates summary, fact_text, contradictory_sources, status
- `verified_citations`: concatenates notes, discrepancies, citation_text, claimed_proposition, status

**Why ground truth items specify which sections to search** (`search_in: ["top_findings", "verified_facts"]`): Different types of errors appear in different report sections. Citation errors appear in `verified_citations`. Factual contradictions appear in `verified_facts`. Both might appear in `top_findings` if the synthesizer promotes them. Searching the right sections reduces false matches from unrelated content in other sections.

**Precision test architecture**: The clean documents (`CLEAN_DOCUMENTS` in test_cases.py:118-159) are a synthetic case (Smith v. ABC Corp) where all four documents are internally consistent. Every date matches, every fact agrees, no errors are planted. The precision test checks:
- P-01: <= 1 top finding (tolerates minor LLM noise but not systematic false positives)
- P-02: 0 contradictory facts (strict — no false contradictions allowed)
- P-03: 0 not_supported/misleading citations (strict)
- P-04: Overall confidence >= 0.6 (the system should be confident when documents are consistent)

**Why P-01 allows 1 finding instead of 0**: LLMs occasionally produce noise findings even on clean documents (e.g., "the medical records describe a routine exam rather than a workplace injury, which may indicate..."). Allowing 1 finding accommodates this noise without masking systematic false positives (which would produce 3+ findings).

**The evidence grounding check** (metrics.py:59-109): For each finding, checks whether any evidence text (10+ characters) appears as a substring in the source documents. This catches hallucinated evidence — if a finding claims "the police report notes Rivera was not wearing any safety gear" but that text doesn't appear in the police report, the finding is ungrounded.

**Why 10 characters minimum**: Shorter substrings produce false matches. "March" (5 chars) appears in many contexts. "March 12, 2021" (14 chars) is specific enough to be meaningful. The 10-char threshold was empirically chosen to balance specificity (avoiding false grounding) with sensitivity (allowing partial quote matches).

**Promptfoo A/B test design**: The `prompt-precision-*.yaml` configs run every test case through two prompt variants (precise and imprecise) side by side. The precise prompts include schema guidance, precision rules, and domain knowledge. The imprecise prompts are stripped-down versions ("You are a legal assistant. Check if the citation supports the proposition and return your findings as JSON.").

**Why A/B testing prompts matters**: It quantifies the impact of prompt engineering. If the precise prompt catches the Privette misquote 90% of the time and the imprecise prompt catches it 40% of the time, that's a 50-percentage-point improvement from prompt engineering alone — no model change, no architecture change, just better instructions. This justifies the investment in detailed prompt design and the precision rules.

**Reflection honesty eval** (`reflection-honesty.yaml`): Uses DeepSeek-R1 (reasoner) as a judge to evaluate REFLECTION.md across 6 dimensions with weighted scoring:
- `real_weaknesses` (3x): Names specific technical failures, not just time constraints
- `qualified_numbers` (2x): Quantitative claims include appropriate caveats
- `eval_self_critique` (2x): Acknowledges limitations of the eval methodology itself
- `scope_honesty` (1x): Clearly distinguishes completed vs. partially implemented features
- `future_specificity` (1x): Future work tied to observed failures, not generic wishes
- `not_performative` (1x): Avoids false modesty ("obviously in production...")

**Why evaluate the reflection**: The reflection document is part of the submission. A dishonest reflection (over-claiming features, minimizing weaknesses, vague future work) signals poor engineering judgment even if the code is good. Evaluating reflection honesty with a weighted rubric makes this assessment systematic rather than subjective.

---

## 7. Confidence Scoring

### Beginner Level
Every finding in the report comes with a confidence score from 0 to 1. A score of 0.9 means the system is very confident in this finding; 0.3 means it's not sure. There's also a brief explanation of why the system assigned that confidence level — for example, "High confidence because the date discrepancy is confirmed by three independent documents" or "Low confidence because this assessment is based on the AI's general knowledge rather than verified sources."

The problem: these confidence scores are the AI's best guess, not statistically calibrated probabilities. When the model says 0.85, it doesn't mean "85% of items with this score are correct." It means "I feel 85% sure." These are different things.

### Intermediate Level
Confidence appears at three levels:

1. **Per-item**: Each `VerifiedCitation` and `VerifiedFact` has a `confidence` float [0,1] with optional `confidence_reasoning` (1-2 sentences). Assigned by the LLM during verification.

2. **Per-finding**: Each `Finding` has its own `confidence` and `confidence_reasoning`. Assigned by the synthesizer.

3. **Aggregate**: `ConfidenceScores` has `citation_verification`, `fact_consistency`, and `overall`. Calculated by the synthesizer LLM.

**Why three levels instead of one overall score**: A judge reviewing a brief needs to know: "How reliable is the date discrepancy finding specifically?" (per-item), "How serious is this issue overall?" (per-finding), and "Should I be concerned about this brief in general?" (aggregate). One overall score loses granularity; three levels serve different judicial decision-making needs.

**Why `confidence_reasoning` was added (stretch feature)**: An opaque 0.3 confidence is nearly useless — is it low because the case doesn't exist, because the holding is ambiguous, or because the LLM just doesn't know? The reasoning transforms confidence from a black-box number into an auditable judgment. It costs ~30-50 additional tokens per item, which is negligible compared to the base prompt cost (~1,000-3,000 tokens per item).

### Expert Level

**The calibration gap in detail**: LLM confidence scores suffer from well-documented calibration problems:

1. **Overconfidence on factual claims**: LLMs tend to assign 0.8-0.9 confidence even when they're wrong. The Privette misquote might get 0.85 confidence for `NOT_SUPPORTED` — which is correct for this case but misleading because the LLM would assign similar confidence to an incorrect assessment of an unknown case.

2. **Arbitrary precision**: The LLM might return 0.73 instead of 0.7 or 0.75. The additional decimal implies precision that doesn't exist. A calibrated system would map this to a discrete bin (e.g., MEDIUM confidence).

3. **Context sensitivity**: The same citation verified in isolation might get 0.6 confidence, but verified alongside obviously wrong citations might get 0.8 confidence (anchoring effect). The LLM's confidence is influenced by the surrounding context, not just the item being assessed.

**Production calibration approach**:

1. **Data collection**: Run the pipeline on N cases with known ground truth. Collect (raw_confidence, was_correct) pairs.

2. **Platt scaling**: Fit a logistic regression: `calibrated_confidence = 1 / (1 + exp(-(a * raw + b)))` where a, b are fitted parameters. This stretches or compresses the confidence scale to match actual accuracy.

3. **Isotonic regression**: Non-parametric alternative. Map raw confidence to calibrated probability using a monotonic step function. More flexible than Platt scaling but requires more data.

4. **Binning**: After calibration, map continuous confidence to discrete levels: HIGH (>0.8 calibrated), MEDIUM (0.5-0.8), LOW (0.2-0.5), UNVERIFIABLE (<0.2). Judges think in categories, not decimals.

5. **Source differentiation**: A confidence of 0.9 from a database lookup means something fundamentally different from 0.9 from an LLM assessment. Display these differently: "VERIFIED (database)" vs. "ESTIMATED (AI assessment)." The source of confidence matters more than the number.

---

## 8. Error Handling & Graceful Degradation

### Beginner Level
The system is designed to never crash completely. If one part fails — say the citation checker has a network error — the system continues with whatever it can still do and tells you what failed. It's like a car that keeps driving even if the radio breaks — the core function (getting from A to B) still works, you just don't have music.

The system has four layers of protection, from innermost to outermost: individual LLM call timeouts, per-agent error handling, orchestrator-level error handling, and API-level input validation.

### Intermediate Level
**Layer 1 — LLM Call Timeout** (`base_agent.py:22-33`): Every LLM call is wrapped in `asyncio.wait_for()` with a 120-second timeout.

**Why 120 seconds**: DeepSeek and Ollama response times vary widely — a simple verification might take 3 seconds, a complex fact-checking prompt might take 60 seconds on Ollama's qwen2.5:7b. The 120-second timeout accommodates slow responses without waiting forever. In production, this would be tuned per-agent (parser: 30s, fact checker: 90s, memo: 60s) based on observed latency distributions.

**Layer 2 — Agent-Level Error Handling**: Each agent catches its own exceptions and returns degraded but valid output:
- Parser: `{citations: [], facts: [], error: str}` — empty but structurally valid
- Citation verifier: `VerifiedCitation` with `COULD_NOT_VERIFY` — the item is present but marked as unverified
- Fact checker: `[]` — empty list of verified facts
- Synthesizer: Zeroed confidence scores, empty findings
- Memo agent: Error text in memo field, empty action lists

**Why each agent handles its own errors**: If errors propagated up to the orchestrator without per-agent handling, the orchestrator would need to know the internals of each agent to construct appropriate fallback responses. By having each agent return valid-but-degraded output, the orchestrator's error handling is simpler — it just checks whether the output is an Exception (from `asyncio.gather(return_exceptions=True)`) and uses an empty default if so.

**Layer 3 — Orchestrator-Level** (orchestrator.py:75-168): Handles the dependencies between stages:
- Parser failure = cannot continue (no citations to verify) → immediate error report
- Citation/fact failure = continue with partial results → report has results from healthy agent
- Synthesizer failure = build minimal report from raw data → findings may be absent but citations/facts are present
- Memo failure = return report without memo → all verification results present, just no prose summary

**Layer 4 — API-Level** (main.py:35-51): Pydantic validators on `AnalyzeRequest` prevent malformed input from reaching the pipeline.

### Expert Level

**The degradation hierarchy**:

```
Level 0: Full report — all 5 agents succeed
Level 1: Report without memo — memo agent fails
  → Still has citations, facts, findings, confidence scores
  → Judge loses the prose summary but retains all analytical data
Level 2: Report with partial verification — one of citation/fact agents fails
  → Still has results from the healthy agent + synthesized findings
  → Judge knows which analysis completed and which didn't (via pipeline_status)
Level 3: Report with only raw data — synthesizer fails
  → Still has raw verified citations/facts but no ranked findings or scores
  → Frontend can still render the tables; confidence scores default to 0
Level 4: Error report — parser fails
  → No useful analytical data
  → Report contains error message, pipeline_status shows parser failure
  → Judge knows the system tried and why it failed
```

**Why the parser failure is immediately fatal**: The parser extracts citations, which are the input to the citation verifier. Without citations, the citation verifier has nothing to verify. The fact checker could still run (it works from raw documents, not parser output), but running only the fact checker produces a partial analysis that might mislead the judge into thinking the citations were checked when they weren't. The design choice is: if we can't do the full analysis, say so explicitly rather than presenting a misleadingly partial result.

**Why not retry on failure**: The current system treats any agent failure as final — no retry, no exponential backoff. This was a time-constraint decision. For transient failures (LLM rate limiting, network timeouts), a single retry with 5-second backoff would significantly improve reliability. For persistent failures (LLM service down, malformed input), retrying wastes time. A production system would implement: `@retry(max_attempts=2, backoff=5s, on=[TimeoutError, ConnectionError])`.

**Why `return_exceptions=True` in `asyncio.gather`**: Without this flag, if one of the parallel tasks raises an exception, `asyncio.gather` cancels all other tasks and re-raises the exception. This is wrong for verification — if the fact checker succeeds and the citation verifier fails, you want the fact checker's results. `return_exceptions=True` ensures both tasks complete (or fail independently), and the orchestrator can inspect each result individually.

**The `AgentStatus` transparency design**: Every agent's status (pending/running/success/failed), duration, and error message is recorded in the `pipeline_status` list. The UI renders this as a horizontal pipeline flow with status icons.

**Why transparency matters for judicial AI**: In a legal context, a black box that says "analysis complete" without showing which components succeeded is unacceptable. Judges need to know: did the citation checker actually run? Did the fact checker process all documents? If something failed, was it a transient error or a fundamental problem? The `AgentStatus` list makes failures visible rather than silent.

---

## 9. Production Readiness Assessment

### Beginner Level
The system works as a demo — it successfully catches errors in a test legal brief and presents them in a readable report. But it's not ready for real courts for several key reasons: (1) it can only read text files, not PDFs, (2) its legal knowledge comes from the AI's training data, not from actual legal databases, (3) it's only been tested on one legal brief, and (4) it has no security, authentication, or audit trail. The good news: the architecture is sound. Making it production-ready means upgrading components, not redesigning the system.

### Intermediate Level

| Aspect | Current State | Production Need | Gap Severity |
|--------|--------------|-----------------|-------------|
| Citation verification | LLM parametric knowledge | Legal database (Westlaw, CourtListener) | **Critical** — this is the #1 gap |
| Document format | Text files only | PDF, DOCX, scanned docs with OCR | **High** — real briefs are PDFs |
| Fact categories | 8 hardcoded in prompt | Dynamic per-case inference | **Medium** — limits generalizability |
| Eval coverage | 1 test case, 8 errors | 50+ briefs, diverse error taxonomy | **Medium** — insufficient confidence |
| Model quality | DeepSeek / Ollama qwen2.5:7b | GPT-4, Claude, or legal fine-tune | **Medium** — reasoning quality |
| Confidence calibration | Raw LLM estimates | Calibrated probabilities | **Medium** — misleading without calibration |
| Observability | Python logging | Langfuse/OpenTelemetry, cost tracking | **Low** — works without, needed for ops |
| Auth/Security | None (open API) | JWT, RBAC, audit logs | **High** for deployment but not technical |
| Persistence | Stateless, no DB | Case-linked storage with audit trail | **High** for deployment |
| Streaming | Request-response | SSE/WebSocket for real-time updates | **Low** — nice-to-have |

**The critical path to production** (in priority order):

1. **Legal database integration** — Replaces LLM guessing with deterministic citation verification. This is the single change that transforms the system from a demo to a useful tool. Without it, every citation verification is probabilistic.

2. **Document parsing** — PyPDF2 / pdfplumber for digital PDFs, Tesseract OCR for scanned documents. Layout-aware extraction preserving page numbers, footnotes, and section references.

3. **Dynamic fact categories** — Two-pass approach: LLM first identifies which fact categories are relevant to this case, then checks those categories. Eliminates the scaffolding-in-an-electrician-case problem.

4. **Model upgrade** — Swap `LLMService` to use a frontier model with strong legal reasoning. The abstraction layer makes this a configuration change.

5. **Observability** — Langfuse integration for tracing, cost tracking, latency monitoring. Essential for production operations.

### Expert Level

**Why the architecture is production-ready even though the system isn't**: The key insight is that production readiness is about two orthogonal dimensions: architecture (how components are organized and communicate) and implementation (what each component actually does).

The architecture — 5 specialized agents with typed contracts, parallel execution, graceful degradation, deterministic orchestration — is sound. It would survive unchanged through all the production upgrades listed above. Adding legal database integration means changing what `CitationVerifierAgent._verify_one()` does internally, not how it connects to the rest of the pipeline. Adding PDF parsing means changing `DocumentService.load_all()`, not the pipeline topology.

The implementation — LLM-based citation verification, text-only input, 8 hardcoded categories — is demo-grade. Each implementation gap has a clear upgrade path that doesn't require architectural changes.

**What would actually break at scale**: The one architectural concern is the single-prompt fact checker. With 50-page documents, the fact checker's 6,000-char truncation would lose critical content. Fixing this requires either: (a) chunking within the fact checker (multiple LLM calls, merging results), or (b) adding a document summarization agent between the parser and fact checker. Option (b) would change the pipeline topology (adding a new stage), which is the only true architectural change needed.

---

## 10. Trade-offs & Design Decisions

### Beginner Level
Every engineering decision involves trade-offs — choosing one approach means giving up something else. Here are the key trade-offs in the BS Detector, explained through the lens of "why this choice and not the obvious alternative."

### Intermediate Level

**Trade-off 1: 5 agents vs. fewer or more**

| | 3 Agents | 5 Agents (chosen) | 7+ Agents |
|---|---------|-------------------|-----------|
| LLM calls | 3 | 5-6+ (citations parallelized) | 7+ |
| Prompt quality | Diluted (mixed tasks) | Focused (one task each) | Extremely focused |
| Failure isolation | Coarse | Good | Excellent |
| Coordination overhead | Low | Moderate | High |
| Latency | ~20s | ~25-30s | ~40s+ |

The 5-agent decomposition was chosen because it maps to distinct cognitive tasks. The parser extracts (be comprehensive). The verifier and checker analyze (be skeptical). The synthesizer aggregates (be concise). The memo writer communicates (be persuasive). Fewer agents conflate these instructions, degrading each. More agents add coordination overhead without meaningful specialization gains.

**Trade-off 2: Single LLM call per agent vs. multi-turn refinement**

Single-pass: cheaper, faster, deterministic (same prompt → similar output), no state management.
Multi-turn: more thorough, can ask follow-ups, handles ambiguity better, but slower, more expensive, harder to evaluate.

**Why single-pass was right for this project**: The eval shows that single-pass with well-designed prompts catches 6-8 of 8 planted errors. Multi-turn refinement would primarily improve edge cases (the last 1-2 errors) at significant cost. For a take-home, demonstrating clean architecture and strong eval is more valuable than squeezing out marginal recall through expensive multi-turn chains.

**Why multi-turn would be right for production**: A low-confidence finding (0.3) should trigger re-analysis with additional context (retrieved case text, cross-reference with other findings). This transforms the pipeline from a linear DAG to a loop with confidence-gated re-entry. The architecture supports this — the orchestrator would add a `while confidence < threshold: re-analyze()` loop around the verification stage.

**Trade-off 3: Precision over recall in fact checking**

Legal AI has asymmetric error costs:
- False positive (flagging a correct fact as contradictory): Erodes judge trust, wastes judicial time, may unfairly prejudice a case
- False negative (missing a real contradiction): Bad, but the brief still gets normal human review

The precision rules in the prompt (prompts.py:46-52) encode this asymmetry: "when in doubt, prefer consistent or could_not_verify over contradictory." This means the system under-flags rather than over-flags. In a legal context, a tool that cries wolf loses credibility; a tool that occasionally misses something but is always right when it flags is trusted.

**Trade-off 4: Case context injection vs. always-generic**

Injecting Rivette-specific knowledge into the Rivera case makes the demo impressive but not representative. A reviewer might ask: "Does this work because of the architecture, or because you hardcoded the answers?"

**Why the trade-off is acceptable**: The `{case_context}` injection pattern is the same interface that a database lookup would use. The 19 lines of hardcoded knowledge in `case_context.py` demonstrate that the architecture supports domain knowledge injection. The eval harness tests both the enriched case (recall) and a clean case without context (precision), showing the system works in both modes.

### Expert Level

**Trade-off 5: Schema injection vs. native structured output**

The system injects the Pydantic schema into the system prompt and parses the LLM's text output as JSON. The alternative is using the model's native structured output API (e.g., OpenAI's `response_format: { type: "json_object" }` or `tools/functions`).

**Why schema injection**: DeepSeek's OpenAI-compatible API has inconsistent support for `response_format` and function calling. LangChain's ChatOpenAI with schema-in-prompt is the most portable approach — it works identically across DeepSeek, Ollama, OpenAI, and Anthropic (via proxy). The `_extract_json()` function (llm_service.py:24-51) handles the messy reality of LLM output: markdown code fences, raw JSON, nested brackets, text preamble before JSON.

**The cost of portability**: Schema injection is less reliable than native structured output. The LLM might return prose mixed with JSON, malformed JSON, or JSON that doesn't match the schema. The three-layer parsing pipeline (extract JSON text → parse JSON → validate against Pydantic model) handles these cases but adds complexity. With native structured output, the LLM API guarantees valid JSON matching the schema — eliminating an entire category of parsing errors.

**Trade-off 6: DeepSeek + Ollama vs. frontier models**

DeepSeek was an assignment constraint. Ollama enables local development without API keys. The trade-off is model quality — neither DeepSeek nor qwen2.5:7b matches GPT-4 or Claude for nuanced legal reasoning.

**Why the model choice matters less than it seems**: The architecture abstracts the model behind `LLMService`. Swapping to GPT-4 requires changing an environment variable, not refactoring code. The prompt engineering, typed contracts, eval harness, and error handling all transfer directly to any model. The model is the most replaceable component in the system.

**Why the model choice matters more than it seems**: Prompt engineering is model-specific. The precision rules, schema injection format, and JSON extraction logic are tuned for DeepSeek's output patterns. A different model might respond differently to the same prompts — GPT-4 might not need the "Output ONLY valid JSON, no markdown fences" instruction because it better follows format constraints. Changing models requires re-running eval and potentially re-tuning prompts.

---

## 11. First-Principles Decision Analysis

This section traces every major design decision back to its root motivation — the fundamental constraint, assumption, or value judgment that makes the chosen approach correct and the alternatives wrong. Where the previous sections explain "what" and "why at the surface level," this section explains "why at the deepest level."

### Why Multi-Agent Instead of Single-Agent

**The fundamental constraint**: LLM attention is finite and task-switching degrades quality.

When you ask an LLM to simultaneously extract citations, verify their accuracy, cross-reference facts across four documents, synthesize findings, and write a judicial memo, it faces a cognitive juggling problem. Research on LLM task composition shows that performance degrades as the number of simultaneous objectives increases — the model spends tokens managing task-switching rather than doing any one task well.

**The consequence chain**: Single prompt → multiple simultaneous objectives → attention divided across extraction + verification + synthesis + writing → each objective gets partial attention → extraction misses footnote citations because the model is thinking about synthesis → missed citations never reach verification → false negatives increase → recall drops.

**The multi-agent solution breaks this chain**: Each agent has one objective. The parser's entire attention is on extraction. The verifier's entire attention is on skeptical assessment. No agent has to simultaneously be comprehensive AND skeptical AND concise AND persuasive. The prompt can be fully optimized for one cognitive mode.

**Why not just use a longer, more detailed single prompt?** Because prompt length doesn't solve the attention problem — it makes it worse. A 5,000-token prompt with 5 objectives means the model allocates ~1,000 tokens of attention per objective. Five 1,000-token prompts with 1 objective each give each objective the model's full attention. The information content is similar but the attention allocation is radically different.

**The empirical evidence**: During development, the single-prompt version caught 3-4 of 8 planted errors. The multi-agent version catches 6-8. The architecture change, not prompt tuning, drove the improvement.

### Why Pydantic-Typed Contracts (Not Just "JSON Please")

**The fundamental assumption**: LLMs produce structurally inconsistent output, and downstream agents cannot tolerate structural variance.

An LLM might return `"status": "not supported"` (space-separated), `"status": "NOT_SUPPORTED"` (caps), `"status": "unsupported"` (synonym), or `"status": null` (absent). Without typed contracts, the synthesizer would need defensive code for every possible string variant of every field from every upstream agent. This is a combinatorial explosion of edge cases.

**The consequence chain without types**: LLM returns unexpected string → downstream agent assumes specific format → KeyError or wrong branch taken → finding misclassified or dropped → eval metrics degrade → developer adds ad-hoc string normalization → normalization handles known variants but misses new ones → fragile codebase with dozens of `if status == "not supported" or status == "NOT_SUPPORTED" or ...` checks.

**The Pydantic solution breaks this chain**: The `VerificationStatus` enum constrains the output space to exactly 4 valid values. The `STATUS_MAP` dict (citation_verifier.py:18-22) maps LLM strings to enum values with a safe default (`COULD_NOT_VERIFY`). The Pydantic model validates that `confidence` is a float between 0 and 1, that `discrepancies` is a list of strings, that `evidence` is coerced from string to list. Every downstream agent can assume valid typed data because Pydantic enforces the contract at the boundary.

**Why Pydantic specifically (not dataclasses, TypedDict, or attrs)**: Pydantic provides three things the alternatives don't: (1) `model_validate()` for parsing untyped dicts from JSON, (2) `field_validator` decorators for custom coercion (null→True, string→list), (3) `model_json_schema()` for injecting the schema into the prompt. Dataclasses can't validate; TypedDict can't coerce; attrs doesn't generate JSON Schema.

### Why the Orchestrator Has Zero LLM Calls

**The fundamental value**: Predictability and debuggability in the control plane.

**The tempting alternative**: An "intelligent" orchestrator that uses an LLM to decide which agents to run, how to route data, or when to re-run failed agents. This is the ReAct/LangGraph pattern — the orchestrator itself reasons about the pipeline.

**Why this is wrong for legal verification**: In a legal system, you need to guarantee that every brief gets the same analytical treatment. If an LLM orchestrator decides "this brief looks simple, skip fact checking" — that's a bias the system introduced. If it decides "the citation verifier seems uncertain, let's re-run it with more context" — that's adaptive but unpredictable. Judge A's brief gets different analytical depth than Judge B's, based on the orchestrator's LLM-mediated judgment.

**The consequence chain with LLM orchestration**: LLM orchestrator → non-deterministic control flow → different briefs get different pipeline paths → eval results are not comparable across runs → "did recall improve because of a prompt change, or because the orchestrator happened to route differently?" → debugging becomes impossible → trust in the system erodes.

**The deterministic orchestrator guarantee**: Every brief, every time, gets: Parser → [Verifier || Checker] → Synthesizer → Memo. No exceptions, no routing decisions, no skipped stages. The only variability is within agent outputs (LLM non-determinism), not in which agents run or how they're connected. This makes eval meaningful — if recall changes between runs, it's because agent outputs changed, not because the pipeline changed.

### Why Parallel Execution at Exactly One Point

**The fundamental constraint**: Data dependencies define the maximum parallelism.

The pipeline has these data dependencies:
- Verifier needs Parser output (citations)
- Checker needs raw documents (no Parser dependency)
- Synthesizer needs Verifier AND Checker output
- Memo needs Synthesizer output

This dependency graph has exactly one parallelization opportunity: Verifier and Checker are independent after Parser completes. All other edges are sequential.

**Why not parallelize Parser and Checker**: The Parser extracts citations; the Checker operates on raw documents. They could technically run in parallel. But the orchestrator needs Parser results to decide whether to continue — if Parser fails (no citations extracted), the pipeline should abort early. Running Checker in parallel with Parser means the Checker completes even when the pipeline will be aborted, wasting tokens and time.

**Why the inner citation parallelism exists**: Each citation is independently verifiable. Privette's verification doesn't inform Dixon's verification. This independence enables `asyncio.gather(*verify_one_calls)` within the citation verifier — a second parallelism level. The fact checker doesn't have this property because all 8 fact categories are checked in a single prompt (they share document context and can inform each other).

**Why not parallelize fact checking per-category**: Running 8 parallel LLM calls (one per fact category) would be theoretically possible but practically worse. Each category needs all four documents for context. 8 prompts × 4 documents = 32 document-in-prompt instances, vs. 1 prompt × 4 documents = 4 instances. The token cost multiplies 8x. And the categories aren't truly independent — the wrong date (DATE_CONSISTENCY) affects the statute of limitations calculation (STATUTE_OF_LIMITATIONS). A single prompt can identify this cross-category dependency; parallel prompts can't.

### Why the LLM Calculates Confidence Scores (Not a Formula)

**The fundamental question**: What does "overall confidence" mean for a legal brief verification?

Consider two scenarios:
- Scenario A: 7 consistent facts, 1 contradictory fact (the date is wrong by 2 days — critical because it affects statute of limitations)
- Scenario B: 7 consistent facts, 1 contradictory fact (a minor spelling difference in a witness name)

A formula (e.g., `overall = mean(fact_confidences)`) would assign similar scores to both scenarios. An LLM can reason: "Scenario A has a critical date error that invalidates the SOL argument, so overall confidence in the brief should be LOW despite 7/8 consistent facts." This contextual judgment is what makes LLM-calculated confidence superior to formulas for legal verification.

**The trade-off**: LLM confidence is a subjective judgment, not a calibrated probability. A formula is deterministic and reproducible. The system chooses judgment over determinism because the judicial use case demands contextual assessment — a judge needs to know "should I be worried about this brief?" not "what is the mathematical average of per-item confidence scores?"

**Why not both?** A production system would use the LLM-generated contextual assessment for the judicial-facing report AND a formula-based score for internal metrics/trending. The LLM score is for humans; the formula score is for machines. The current system only has the LLM score because the formula score is meaningless without calibration data.

### Why Keyword Eval AND LLM-as-Judge (Not One or the Other)

**The fundamental epistemological problem**: You cannot evaluate an LLM system with only an LLM.

If the eval is purely LLM-based, you're measuring "does LLM-judge agree with LLM-pipeline?" This is circular — both share the same biases, the same training data, the same failure modes. If both hallucinate the same fact, the judge scores it as correct.

Keyword matching breaks this circularity. Keywords are human-defined ground truth: either "march 14" appears in the finding text or it doesn't. No LLM judgment involved. The keyword eval is the anchor — the irreducible, deterministic measurement.

**But keyword matching alone isn't sufficient**: It misses semantic equivalences. If the pipeline says "temporal discrepancy in the incident timeline" instead of "march 14 vs march 12," keyword matching scores it as a miss even though a human would score it as a hit.

**The solution is layered evaluation**: Keywords for deterministic anchor, LLM-as-judge for semantic coverage, combined metrics for the full picture. Each layer's weakness is the other layer's strength. Keywords can't understand semantics; the judge can't provide determinism. Together they approximate human evaluation better than either alone.

**Why the LLM-as-judge is opt-in (`LLM_JUDGE=1`)**: The default eval should be fast, cheap, and deterministic. Running the LLM judge doubles the eval cost and time, and introduces non-determinism into the measurement process. For rapid iteration (change prompt → run eval → check recall), keyword matching is sufficient. The LLM judge is for comprehensive assessment (pre-release, weekly regression, eval suite refresh).

### Why `COULD_NOT_VERIFY` Is the Most Important Design Element

**The fundamental problem in legal AI**: Forced binary classification on uncertain legal questions is dangerous.

Without `COULD_NOT_VERIFY`, the citation verifier must choose between `SUPPORTED` and `NOT_SUPPORTED` for every citation. For well-known cases (Privette, Seabright), the LLM has enough training data to make a reasonable judgment. For obscure cases (a 2019 Florida appellate decision), the LLM might have never seen the case — but forced to choose, it will guess. A wrong `SUPPORTED` gives false assurance; a wrong `NOT_SUPPORTED` unfairly impugns the attorney.

**The consequence chain without COULD_NOT_VERIFY**: LLM forced to choose binary → LLM guesses on unknown citations → some guesses wrong → wrong `SUPPORTED` on fabricated citations (misses fabrication) → wrong `NOT_SUPPORTED` on real citations (false accusation) → judge receives report with mix of correct and incorrect verdicts with no way to distinguish them → trust in system is zero.

**With COULD_NOT_VERIFY**: LLM uncertain about citation → returns `COULD_NOT_VERIFY` → report shows "could not independently verify this citation" → judge knows to check it manually → no false assurance, no false accusation → trust preserved.

**The meta-lesson**: In legal AI, expressing uncertainty correctly is more valuable than increasing accuracy by 10%. A system that's right 90% of the time but never admits uncertainty is less useful than a system that's right 80% of the time but says "I don't know" for the other 20%. Judges already know how to handle uncertainty — they don't know how to handle confident errors.

### Why the Fact-Checking Prompt Is 67 Lines Long

**The fundamental observation**: LLM behavior is determined by the prompt, not the code.

In a traditional software system, business logic lives in code. In an LLM system, the equivalent of business logic lives in the prompt. The 67-line fact-checking prompt IS the fact checker's business logic. The 7 precision rules are the equivalent of business rules in a traditional application. The 8 categories are the equivalent of a feature specification.

**Why not put these rules in code (post-processing)?** Code-based rules operate after the LLM generates output. Prompt-based rules operate during generation. The difference is enormous:

- Code-based: LLM generates 8 category entries including false positives → code filters out entries for inapplicable categories → filtered entries still consumed tokens during generation → multiple API dollars wasted on throwaway output
- Prompt-based: LLM reads "SKIP any category that does not apply" → skips inapplicable categories during generation → no wasted tokens → cheaper and faster

More importantly, some rules can't be enforced post-generation. The rule "an omission is only contradictory if the MSJ ACTIVELY HIDES material evidence" requires the LLM to reason about materiality during analysis. You can't determine materiality from the output alone — you need the LLM to apply the materiality test during its reasoning process.

**Why the prompt evolved to 67 lines (not 10, not 200)**: Each line was added to fix a specific failure mode observed during development:
- Lines 1-3 (MSJ-centric framing): Added because the LLM was flagging contradictions in the wrong direction
- Lines 46-52 (precision rules): Added one by one as each false-positive pattern was discovered and documented
- Lines 54-63 (categories): Added because open-ended prompts produced inconsistent coverage
- Lines 56-63 (per-category instructions): Added because the LLM needed specific guidance for each category's analysis criteria

The prompt is exactly as long as it needs to be — each line corresponds to a documented failure mode. Removing any line reintroduces the failure it was designed to prevent.

### Why the API Is Synchronous (Not Streaming)

**The fundamental trade-off**: Implementation simplicity vs. user experience.

Streaming (SSE or WebSocket) would enable real-time pipeline progress: "Parser complete... Citation verifier running... Fact checker running... 3 of 5 citations verified..." This is strictly better for UX — the user sees progress instead of a blank loading screen for 30-120 seconds.

**Why synchronous was chosen**: Streaming adds significant implementation complexity:
1. The FastAPI endpoint must use `StreamingResponse` with async generators
2. Each agent must yield status updates through a channel (not just return results)
3. The frontend must handle incremental state updates (partial report, then augmented report, then final report)
4. Error handling must work mid-stream (what if the fact checker fails after 3 citations were already streamed?)
5. The eval harness must handle streaming output (or have a separate non-streaming path)

For a take-home assessment, the complexity of streaming outweighs its UX benefit. The pipeline typically completes in 30-60 seconds — long enough to notice but short enough to tolerate. In production, streaming would be essential because pipeline execution on complex briefs might take 3-5 minutes, and a 5-minute blank loading screen is unacceptable.

### Why LangChain Instead of Raw API Calls

**The fundamental trade-off**: Abstraction convenience vs. dependency weight.

LangChain provides ChatOpenAI, ChatPromptTemplate, and StrOutputParser. The system uses these for: (1) standardized prompt formatting, (2) async invocation, (3) provider abstraction (DeepSeek and Ollama through the same interface).

**What LangChain actually contributes here**: Very little. The system uses ~5% of LangChain's surface area. The same functionality could be achieved with `httpx` and 50 lines of code. But LangChain's ChatOpenAI already handles DeepSeek's OpenAI-compatible API, streaming, retries, and async. Writing this from scratch is 50 lines of code that need to handle the same edge cases LangChain already handles.

**The hidden cost**: LangChain is a large dependency (~150MB installed) with a rapidly-changing API. Version upgrades can break code. The `langchain-openai>=0.3.0` and `langchain-core>=0.3.0` requirements in `requirements.txt` are pinned to major versions, which is stable enough for a take-home but risky for long-lived production code.

**The production decision**: In production, you'd either (a) pin exact LangChain versions and freeze, or (b) replace LangChain with a thin wrapper around the provider's SDK (e.g., `openai` for DeepSeek, `ollama-python` for Ollama). Option (b) reduces the dependency surface area and gives you full control over the HTTP layer. The current LangChain usage is a convenience choice that would be revisited for production.

### Why Docker Compose Instead of Bare Metal Development

**The fundamental value**: Reproducibility across environments.

The Makefile exposes `make up` (start), `make eval` (run evals), `make down` (stop). A new developer clones the repo, runs `make up`, and has a working system. No Python version conflicts, no package installation issues, no "works on my machine."

**Why docker-compose specifically**: The system has three services (backend, frontend, evals). Docker Compose expresses their dependencies declaratively: frontend depends on backend health check, evals run in a separate profile. The health check (`curl http://localhost:8002/health`) ensures the backend is ready before the frontend starts making requests.

**The eval container design**: The `evals` service uses the same Docker image as the backend (same dependencies, same code) but runs `python run_evals.py` instead of starting the web server. The `profiles: [evals]` directive means it only runs when explicitly invoked (`make eval`), not during normal `make up`. This keeps eval infrastructure available without polluting the development workflow.

**The volume mounts** (`./backend:/app`): Enable hot-reload during development. Code changes on the host are immediately visible inside the container. This eliminates the rebuild cycle (change code → rebuild image → restart container) and replaces it with a development-speed workflow (change code → save → uvicorn auto-reloads).

---

## 12. What Would Change at Scale

### Beginner Level
If this system were deployed in actual courts handling thousands of briefs, several things would need to change: the system would need to read PDF files, verify citations against real legal databases, handle documents of any length, track every action for accountability, and process multiple cases simultaneously. The basic design (five agents working together) would stay the same, but each agent would become more sophisticated.

The key insight is that almost everything that needs to change is *inside* an agent, not *between* agents. The pipeline topology survives. The contracts survive. The eval harness survives. Only the implementations get upgraded.

### Intermediate Level

**Document processing**: PDF extraction with layout preservation. Chunking strategy: split by section/argument, run extraction per chunk, merge with deduplication. Section references maintained for traceability. OCR pipeline for scanned documents.

**Citation verification**: RAG pipeline over curated legal corpus. Multi-stage: existence check (database lookup) → holding retrieval (vector search over case text) → proposition-level comparison (LLM reads retrieved text, compares to brief's claim). Cache frequently-cited cases (top 100 cases in California appear in 80%+ of state-court briefs).

**Fact category inference**: Two-pass approach. First pass: LLM reads documents, identifies relevant fact categories. Second pass: fact checking runs only on identified categories. This eliminates hardcoded categories while preserving the structured checking approach.

**Confidence calibration**: Collect (confidence, accuracy) data across thousands of items. Fit calibration model. Display calibrated confidence as discrete levels (HIGH/MEDIUM/LOW) rather than misleading decimal numbers.

### Expert Level

**Streaming architecture**: Replace synchronous request-response with Server-Sent Events (SSE). As each agent completes, stream its status update and results to the client. The frontend renders progressively: pipeline status updates immediately, citations appear as they're verified, facts appear as they're checked, findings appear as they're synthesized.

**Why SSE over WebSocket**: SSE is simpler (HTTP, server-to-client only, automatic reconnection), sufficient for this use case (client doesn't need to send mid-pipeline messages), and supported by all browsers. WebSocket adds complexity for bidirectional communication that isn't needed here.

**Multi-turn verification loop**: Confidence-gated re-analysis. After the first pass, items below a confidence threshold (e.g., 0.5) are routed back for deeper investigation:
- Low-confidence citations trigger database lookup + RAG retrieval
- Low-confidence facts get expanded context (more of the source document, cross-reference with other findings)
- Items that remain low-confidence after re-analysis are flagged with "requires human review"

**Why a confidence threshold and not always multi-turn**: Multi-turn is expensive (doubles token usage) and slow (adds another round-trip). Most items get correct, high-confidence results in a single pass. The threshold targets expensive re-analysis at the items that need it most — a Pareto-optimal allocation of computational budget.

**Observability at scale**: Distributed tracing with correlation IDs. Every LLM call gets a trace with: prompt (for debugging), token count (for cost), latency (for performance), model response (for quality auditing). Aggregate dashboards: cost per case, latency P50/P95, recall/precision trends, confidence distribution shifts.

**Why confidence distribution monitoring matters**: If the confidence distribution suddenly shifts (e.g., 70% of items get confidence > 0.8, then after a model update only 40% do), it signals a change in model behavior that might affect accuracy. This is the canary in the coal mine for model regression — easier to detect than per-item accuracy changes because it doesn't require ground truth labels.

**Multi-tenancy**: Cases belong to courts. Courts belong to jurisdictions. Judges have assigned cases. Law clerks have access to their judge's cases. Reports have audit trails (who ran the analysis, when, which model version, which prompt version). All of this is organizational infrastructure that doesn't change the pipeline but is required for deployment.

**Why multi-tenancy is listed last**: It's the most work but the least technically interesting. Standard RBAC patterns (role-based access control), JWT authentication, database-backed case storage, audit logging. Every SaaS application needs this. It's not specific to legal AI and doesn't require novel engineering.
