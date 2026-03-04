# Implementation Tasks for bs-detector-pipeline

## Phase 1: Foundation & Core Infrastructure (2 hours)

### Task 1.1: Create project structure and base schemas
**File:** `backend/schemas/__init__.py`
- Create directory with __init__.py
- Define Pydantic models for all data structures
- Implement Citation, FactClaim, Discrepancy, QuoteVerification models
- Create AnalysisRequest and AnalysisResponse API schemas
**Verification:** Run `python -c "from schemas.models import Citation; print(Citation.schema())"` - should output JSON schema

### Task 1.2: Implement base agent interface and message bus
**File:** `backend/agents/base_agent.py`
- Create abstract Agent base class with process() and get_subscribed_topics()
- Define Message dataclass for agent communication
- Implement basic error handling in base class
**Verification:** Create test agent that inherits from base - should compile without errors

### Task 1.3: Set up LLM client wrapper
**File:** `backend/utils/llm_client.py`
- Create LLMClient class wrapping OpenAI calls
- Implement retry logic with exponential backoff
- Add token counting and cost estimation
- Support structured output via function calling
**Verification:** Run `python -c "from utils.llm_client import LLMClient; client = LLMClient(); print(client.get_model())"` - should print model name

### Task 1.4: Create document parser utility
**File:** `backend/utils/document_parser.py`
- Implement text chunking for large documents
- Add citation pattern matching (regex for legal citations)
- Create helper functions for extracting propositions around citations
- Implement basic text cleaning and normalization
**Verification:** Test with sample MSJ text - should extract at least 5 citation patterns

### Task 1.5: Update main.py with /analyze endpoint
**File:** `backend/main.py`
- Import AnalysisRequest and AnalysisResponse schemas
- Add POST /analyze endpoint with proper FastAPI decorators
- Implement basic request validation
- Create skeleton response returning placeholder data
**Verification:** Start server, POST to /analyze - should return 200 with placeholder JSON

## Phase 2: Core Agent Implementation (2 hours)

### Task 2.1: Implement Citation Extractor Agent
**File:** `backend/agents/citation_extractor.py`
- Inherit from base Agent class
- Implement citation extraction using regex patterns
- Extract context (500 chars around citation)
- Identify propositions supported by each citation
- Output structured Citation objects
**Verification:** Test with MSJ document - should extract all 8+ citations with context

### Task 2.2: Implement Fact Consistency Agent
**File:** `backend/agents/fact_consistency.py`
- Extract factual claims from MSJ using pattern matching
- Cross-reference with police report, medical records, witness statement
- Implement discrepancy detection for dates, PPE, conditions
- Output FactClaim objects with evidence sources
**Verification:** Test with known discrepancies - should detect date mismatch (March 14 vs 12)

### Task 2.3: Implement Quote Verifier Agent
**File:** `backend/agents/quote_verifier.py`
- Identify quoted text within citations
- Implement basic quote accuracy checking
- Flag obvious alterations (inserted "never" in Privette)
- Handle cases where source text unavailable
**Verification:** Test with Privette citation - should flag inserted "never" word

### Task 2.4: Implement Report Synthesizer Agent
**File:** `backend/agents/report_synthesizer.py`
- Aggregate findings from all agents
- Structure output according to AnalysisResponse schema
- Apply basic confidence scoring (binary: high/low)
- Generate executive summary of top findings
**Verification:** Test with mock agent outputs - should produce valid AnalysisResponse JSON

## Phase 3: Pipeline Orchestration (1 hour)

### Task 3.1: Create message bus system
**File:** `backend/orchestration/message_bus.py`
- Implement publish/subscribe pattern
- Support multiple message types
- Add error handling for unhandled messages
- Include logging for message flow
**Verification:** Create test publisher/subscriber - messages should route correctly

### Task 3.2: Implement pipeline orchestrator
**File:** `backend/orchestration/pipeline_orchestrator.py`
- Create PipelineOrchestrator class
- Register all agents with message bus
- Define execution flow: Citation → Fact → Quote → Report
- Implement timeout handling (30s total)
- Add error recovery (skip failed agents)
**Verification:** Run orchestrator with test documents - should complete within timeout

### Task 3.3: Connect orchestrator to API endpoint
**File:** `backend/main.py`
- Update /analyze endpoint to use PipelineOrchestrator
- Pass document texts from request to orchestrator
- Handle orchestrator errors with appropriate HTTP codes
- Add request/response logging
**Verification:** POST to /analyze with full documents - should return structured report

## Phase 4: Evaluation Framework (1 hour)

### Task 4.1: Create ground truth data
**File:** `backend/evaluation/ground_truth.py`
- Encode 8 known discrepancies as structured data
- Create mapping to document sources
- Add metadata for each discrepancy type
- Include verification criteria for each
**Verification:** Import and print ground truth - should show all 8 discrepancies

### Task 4.2: Implement metrics calculator
**File:** `backend/evaluation/metrics_calculator.py`
- Calculate precision: TP / (TP + FP)
- Calculate recall: TP / (TP + FN)
- Calculate hallucination rate: fabricated / total
- Implement confusion matrix tracking
- Add execution time measurement
**Verification:** Test with mock findings - should compute correct metrics

### Task 4.3: Create evaluation runner
**File:** `backend/evaluation/eval_runner.py`
- Implement single command entry point
- Load test documents from backend/documents/
- Run pipeline and compare against ground truth
- Output metrics in structured JSON
- Add command-line arguments for verbosity
**Verification:** Run `python -m evaluation.eval_runner` - should output metrics JSON

### Task 4.4: Update README with eval instructions
**File:** `README.md`
- Add "Evaluation" section after Setup
- Document command: `python -m evaluation.eval_runner`
- Explain metrics (precision, recall, hallucination)
- Note ground truth based on known discrepancies
**Verification:** README should have clear eval instructions after "## The Task"

## Phase 5: Polish & Stretch Goals (1 hour)

### Task 5.1: Add confidence scoring layer
**File:** `backend/agents/confidence_scorer.py`
- Implement confidence scoring (0-100) for each finding
- Add reasoning for confidence levels
- Consider evidence quality and source agreement
- Apply thresholds (<70 = "could not verify")
**Verification:** Test with ambiguous claim - should output lower confidence

### Task 5.2: Implement judicial memo agent (stretch)
**File:** `backend/agents/judicial_memo.py`
- Synthesize top 3 findings into judge-friendly paragraph
- Use formal legal writing style
- Focus on most significant discrepancies
- Keep under 200 words
**Verification:** Test with sample findings - should produce coherent legal memo

### Task 5.3: Enhance frontend report display
**File:** `frontend/src/components/ReportDisplay.jsx`
- Create component to display structured findings
- Show citations vs fact discrepancies in tabs
- Display confidence scores visually
- Format JSON data in readable tables
**Verification:** UI should show structured report, not raw JSON

### Task 5.4: Create reflection document
**File:** `REFLECTION.md`
- Document design decisions and tradeoffs
- Explain time allocation choices
- Note limitations and future improvements
- Be honest about what wasn't completed
**Verification:** File exists with thoughtful analysis of implementation

## Phase 6: Integration & Testing (1 hour)

### Task 6.1: Create integration tests
**File:** `backend/test_integration.py`
- Test full pipeline with sample documents
- Verify agent communication works
- Check error recovery scenarios
- Validate output schema compliance
**Verification:** Run tests - all should pass

### Task 6.2: Add Docker support verification
**File:** `docker-compose.yml`
- Ensure all services start correctly
- Verify hot-reload works for development
- Check environment variables propagate
- Test API and UI connectivity
**Verification:** `docker compose up --build` - both services should start

### Task 6.3: Final end-to-end test
**Action:** Run complete workflow
1. Start services: `docker compose up`
2. POST to `/analyze` with all documents
3. Verify structured JSON response
4. Run eval suite: `python -m evaluation.eval_runner`
5. Check metrics are reasonable
**Verification:** Pipeline should detect at least 3 discrepancies with <10% hallucination

### Task 6.4: Update API documentation
**File:** `backend/main.py`
- Add comprehensive docstrings for /analyze endpoint
- Document request/response schemas
- Include example curl command
- Note limitations and assumptions
**Verification:** Swagger UI at /docs should show complete endpoint documentation

---

**Total Estimated Time:** 8 hours (prioritize Phases 1-4 for core functionality within 6 hours)

**Priority Order:** 
1. Phase 1-2 (Foundation & Core Agents) - MUST complete
2. Phase 3 (Orchestration) - MUST complete  
3. Phase 4 (Evaluation) - SHOULD complete
4. Phase 5-6 (Polish & Testing) - COULD complete as stretch goals

Each task is specific (file path), actionable (clear implementation steps), verifiable (test command provided), and small (focused scope).