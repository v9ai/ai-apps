# Technical Design: BS Detector Pipeline

## Architecture Overview

### System Architecture Decision
**Choice:** Multi-Agent Orchestration with Message Bus Pattern

**Alternatives Considered:**
1. **Monolithic LLM Call**: Single prompt with all tasks
   - *Rationale rejected*: High token usage, prone to hallucination, violates explicit requirement for structured data passing
2. **Sequential Pipeline**: Strict linear agent execution
   - *Rationale rejected*: No error recovery, poor parallelism
3. **Microservices via API**: Each agent as separate service
   - *Rationale rejected*: Overhead too high for 6-hour timeframe

**Selected Architecture Rationale:**
- **Message Bus Pattern** allows agents to subscribe to specific message types
- **Central Orchestrator** manages flow but agents operate independently
- **Error Isolation** - single agent failure doesn't crash pipeline
- **Easy Testing** - agents can be tested in isolation
- **Flexible Routing** - supports both sequential and parallel execution

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Input Documents                          │
│  ┌──────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐  │
│  │ Motion   │ │ Police     │ │ Medical    │ │ Witness  │  │
│  │ (MSJ)    │ │ Report     │ │ Records    │ │ Statement│  │
│  └──────────┘ └────────────┘ └────────────┘ └──────────┘  │
└───────────────────┬─────────────────────────────────────────┘
                    │
           ┌────────▼──────────┐
           │   Document        │
           │   Preprocessor    │
           │  (Chunking, OCR)  │
           └────────┬──────────┘
                    │
           ┌────────▼──────────┐
           │   Message Bus     │<─────────────────┐
           │  (Event Router)   │                  │
           └───────┬───────────┘                  │
                   │                              │
    ┌──────────────┼──────────────┐               │
    │              │               │               │
┌───▼───┐   ┌─────▼──────┐   ┌────▼────┐         │
│Citation│   │Fact        │   │Quote    │         │
│Extractor│  │Consistency │   │Verifier │         │
│Agent   │  │Agent       │   │Agent    │         │
└───┬────┘  └─────┬──────┘   └────┬────┘         │
    │              │               │               │
    └──────────────┼───────────────┘               │
                   │                              │
           ┌───────▼───────────┐                  │
           │   Report          │◀─────────────────┘
           │   Synthesizer     │
           │   Agent           │
           └───────┬───────────┘
                   │
           ┌───────▼───────────┐
           │  Output Formatter │
           │  & Confidence     │
           │  Scorer           │
           └───────┬───────────┘
                   │
           ┌───────▼───────────┐
           │   Structured      │
           │   JSON Report     │
           └───────────────────┘
```

## Agent Design Specifications

### 1. Citation Extractor Agent
**Responsibilities:**
- Identify legal citations (case law, statutes, regulations)
- Extract citation context and proposition
- Normalize citation format

**Message Types:**
- `CITATION_EXTRACTION_REQUEST` (input)
- `CITATION_EXTRACTED` (output)

**Data Schema:**
```python
class Citation:
    id: str
    raw_text: str
    normalized_form: str
    context: str  # 500 chars around citation
    proposition: str  # What claim it supports
    confidence: float
```

### 2. Fact Consistency Agent
**Responsibilities:**
- Extract factual claims from MSJ
- Cross-reference with supporting documents
- Identify discrepancies with confidence scoring

**Message Types:**
- `FACT_EXTRACTION_REQUEST`
- `DOCUMENT_ANALYSIS_COMPLETE`
- `FACT_DISCREPANCY_FOUND`

**Data Schema:**
```python
class FactClaim:
    id: str
    text: str
    source_document: str
    supporting_evidence: List[Evidence]
    discrepancies: List[Discrepancy]
    
class Discrepancy:
    type: Literal["date", "ppe", "condition", "action"]
    confidence: float
    evidence_sources: List[str]
    description: str
```

### 3. Quote Verifier Agent
**Responsibilities:**
- Identify quoted text in citations
- Verify quote accuracy against source (when available)
- Flag omissions, alterations, ellipses

**Message Types:**
- `QUOTE_VERIFICATION_REQUEST`
- `QUOTE_VERIFIED`

**Data Schema:**
```python
class QuoteVerification:
    citation_id: str
    quoted_text: str
    is_accurate: bool
    alterations: List[Alteration]
    missing_context: str
    confidence: float
```

### 4. Report Synthesizer Agent
**Responsibilities:**
- Aggregate findings from all agents
- Apply confidence scoring rules
- Generate structured JSON output
- Create executive summary

**Message Types:**
- `REPORT_GENERATION_REQUEST`
- `REPORT_GENERATED`

**Data Schema:** (Matches expected API response)

## File Changes

### New Files to Create:
```
backend/
├── agents/
│   ├── __init__.py
│   ├── base_agent.py           # Abstract base class
│   ├── citation_extractor.py
│   ├── fact_consistency.py
│   ├── quote_verifier.py
│   ├── report_synthesizer.py
│   └── judicial_memo.py        # Stretch goal
├── orchestration/
│   ├── __init__.py
│   ├── message_bus.py          # Event routing system
│   └── pipeline_orchestrator.py
├── evaluation/
│   ├── __init__.py
│   ├── eval_runner.py
│   ├── metrics_calculator.py
│   ├── ground_truth.py         # Known discrepancies
│   └── test_cases/
├── schemas/
│   ├── __init__.py
│   ├── models.py              # Pydantic models
│   └── api_schemas.py         # Request/response schemas
├── utils/
│   ├── __init__.py
│   ├── document_parser.py
│   ├── citation_normalizer.py
│   └── llm_client.py          # Wrapper for OpenAI calls
└── main.py                    # Updated with /analyze endpoint
```

### Modified Files:
**backend/main.py:**
```python
# Add new endpoint
@app.post("/analyze")
async def analyze_documents(request: AnalysisRequest):
    """Main pipeline entry point"""
    orchestrator = PipelineOrchestrator()
    return await orchestrator.run(request.documents)
```

**frontend/src/components/ReportDisplay.jsx:**
- New component to display structured findings
- Tabbed interface for citations vs fact discrepancies
- Confidence score visualization

## Interfaces

### External API Interface:
```python
class AnalysisRequest(BaseModel):
    msj_text: str
    police_report_text: str
    medical_records_text: str
    witness_statement_text: str

class AnalysisResponse(BaseModel):
    metadata: ResponseMetadata
    citations: List[VerifiedCitation]
    fact_discrepancies: List[FactDiscrepancy]
    quote_inaccuracies: List[QuoteInaccuracy]
    summary: ExecutiveSummary
    confidence_scores: ConfidenceBreakdown
    evaluation_metrics: Optional[EvalMetrics]  # For internal use
```

### Internal Agent Interface:
```python
class Agent(ABC):
    @abstractmethod
    async def process(self, message: Message) -> Message:
        """Process incoming message and return response"""
        pass
    
    @abstractmethod
    def get_subscribed_topics(self) -> List[str]:
        """Return list of message types this agent handles"""
        pass
```

## Testing Strategy

### Three-Tier Testing Approach:

**1. Unit Tests (Agent Level)**
- Each agent tested in isolation
- Mock LLM responses for predictable outputs
- Test edge cases (empty documents, malformed citations)

**2. Integration Tests (Pipeline Level)**
- Test message passing between agents
- Verify data transformation through pipeline
- Error recovery scenarios

**3. Evaluation Harness (System Level)**
```bash
# Run evaluation suite
python -m evaluation.eval_runner --documents-path ./documents
```

**Eval Metrics Calculation:**
```python
# Precision = TP / (TP + FP)
# Recall = TP / (TP + FN)  
# Hallucination Rate = Fabricated Findings / Total Findings

# Ground Truth Loading:
ground_truth = {
    "date_discrepancy": {
        "type": "fact",
        "msj_claim": "March 14, 2021",
        "actual_value": "March 12, 2021",
        "sources": ["police_report", "medical_records"]
    },
    # ... other known discrepancies
}
```

### Eval Output Format:
```json
{
  "precision": 0.85,
  "recall": 0.75,
  "hallucination_rate": 0.05,
  "false_positives": [...],
  "false_negatives": [...],
  "execution_time": "12.4s"
}
```

## Risk Mitigation Plan

### Technical Risks:

1. **LLM Hallucination Risk**
   - **Mitigation**: Structured prompts with "uncertainty expressions"
   - **Fallback**: Confidence thresholding (<0.7 → "could not verify")
   - **Detection**: Eval harness specifically measures hallucination rate

2. **Citation Verification Without Full Text**
   - **Mitigation**: Focus on obvious issues (wrong jurisdiction, date math)
   - **Alternative**: Flag for human review when ambiguous
   - **Transparency**: Report includes verification limitations

3. **Performance in 6-Hour Timeframe**
   - **Mitigation**: Prioritize core functionality (Tier 1)
   - **Fallback**: Implement stretch goals as clearly marked "TODO"
   - **Documentation**: Explicitly state what's implemented vs planned

### Failure Modes & Recovery:

| Failure Mode | Detection | Recovery Action |
|-------------|-----------|-----------------|
| LLM API Timeout | 30s timeout | Retry once, then use cached response |
| Malformed Citation | Regex validation | Flag as "unparseable" in report |
| Contradictory Evidence | Multiple source comparison | Lower confidence, present all evidence |
| Memory Overflow | Document chunking | Process in 4K token chunks |

## Implementation Priority Queue

1. **Hour 1-2**: Basic pipeline + citation extraction
2. **Hour 2-3**: Fact consistency checking
3. **Hour 3-4**: Evaluation harness
4. **Hour 4-5**: Report synthesis + confidence scoring
5. **Hour 5-6**: UI integration + stretch goals

## Success Validation Criteria

### Automated Checks:
- [ ] `/analyze` endpoint returns 200 with structured JSON
- [ ] Eval suite runs with single command
- [ ] All agents implement base interface
- [ ] Message bus routes messages correctly

### Manual Verification:
- [ ] At least 3 known discrepancies detected
- [ ] No fabricated findings on clean test document
- [ ] Uncertainty properly expressed for ambiguous cases
- [ ] UI displays structured report (not raw JSON)

This design provides a robust foundation for the BS Detector pipeline with clear interfaces, testability, and scalability within the 6-hour constraint.