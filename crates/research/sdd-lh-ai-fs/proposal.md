# Change Proposal: BS Detector Pipeline Implementation

## Intent
Implement a multi-agent AI pipeline ("BS Detector") that analyzes legal briefs for misrepresentations by extracting citations, verifying authority support, cross-referencing facts across documents, and producing structured verification reports with an evaluation harness.

## Scope

### In Scope
- **Tier 1 (Core):**
  - Extract all citations from Motion for Summary Judgment
  - Verify cited authority supports claimed propositions
  - Flag direct quote accuracy
  - Produce structured JSON verification report
  
- **Tier 2 (Expected):**
  - Build evaluation harness measuring precision, recall, hallucination rate
  - Cross-document consistency checking (MSJ vs police report, medical records, witness statement)
  - Express uncertainty appropriately ("could not verify")
  - Structured data passing between agents
  
- **Tier 3 (Stretch):**
  - Minimum 4 well-defined agents with distinct roles
  - Confidence scoring layer with reasoning
  - Judicial memo agent for summary synthesis
  - Graceful failure handling in orchestration
  - UI for structured report display (beyond raw JSON)
  - Reflection document on tradeoffs

### Out of Scope
- Full legal database integration for citation verification
- Real-time analysis of streaming documents
- Multi-language support beyond English
- Integration with external legal research tools
- Production deployment infrastructure
- Advanced UI features beyond basic report display

## Approach

### Architecture
1. **Multi-Agent Pipeline:**
   - Citation Extractor Agent: Identifies and extracts legal citations
   - Authority Verifier Agent: Validates citation support for propositions
   - Fact Consistency Agent: Cross-references facts across documents
   - Report Synthesizer Agent: Generates structured JSON output
   - Judicial Memo Agent (stretch): Creates judge-friendly summary
   - Confidence Scorer Agent (stretch): Adds confidence ratings

2. **Data Flow:**
   ```
   Documents → Citation Extraction → Authority Verification → Fact Consistency → Report Synthesis → Output
   ```

3. **Evaluation Framework:**
   - Ground truth based on known discrepancies
   - Automated metrics calculation
   - Single command execution

### Implementation Phases
1. **Foundation (2 hours):**
   - Set up agent skeletons with clear interfaces
   - Implement basic document parsing
   - Create structured output schema

2. **Core Functionality (2 hours):**
   - Build citation extraction and verification
   - Implement fact cross-referencing
   - Create evaluation harness

3. **Enhancements (1.5 hours):**
   - Add confidence scoring
   - Implement judicial memo agent
   - Improve error handling

4. **Polish & Documentation (0.5 hours):**
   - UI integration
   - Reflection document
   - README updates

## Affected Areas

### Backend (`backend/`)
- `main.py`: New `/analyze` endpoint
- `agents/`: New directory for agent implementations
  - `citation_extractor.py`
  - `authority_verifier.py`
  - `fact_consistency.py`
  - `report_synthesizer.py`
  - `judicial_memo.py` (stretch)
  - `confidence_scorer.py` (stretch)
- `orchestration/`: Pipeline coordination logic
- `evaluation/`: Eval harness and metrics calculation
- `schemas/`: Pydantic models for structured data
- `utils/`: Document parsing and helper functions

### Frontend (`frontend/`)
- New report display component
- Structured visualization of findings
- Confidence score indicators (stretch)

### Configuration
- `.env`: Additional configuration for agent parameters
- `docker-compose.yml`: Ensure all services properly linked

### Documentation
- `README.md`: Updated with eval instructions
- `REFLECTION.md`: Design decisions and tradeoffs

## Risks

### Technical Risks
1. **LLM Hallucinations:** Agents may fabricate findings
   - Mitigation: Structured prompts with uncertainty expression, confidence scoring
   
2. **Citation Verification Accuracy:** Limited context for legal authority verification
   - Mitigation: Focus on obvious discrepancies, express uncertainty for ambiguous cases
   
3. **Performance:** Multiple LLM calls may be slow
   - Mitigation: Parallel processing where possible, clear timeout handling
   
4. **Evaluation Ground Truth:** Limited to provided discrepancies
   - Mitigation: Design extensible eval framework for additional test cases

### Project Risks
1. **Time Constraints:** 6-hour limit may prevent full stretch goals
   - Mitigation: Prioritize core functionality, document stretch goal designs
   
2. **Complexity Management:** Multiple agents increase coordination complexity
   - Mitigation: Clear interfaces, error handling, and logging

## Rollback Plan

### Immediate Rollback (if pipeline fails)
1. Revert to previous working state of `/analyze` endpoint
2. Maintain backward compatibility with existing API structure
3. Preserve evaluation harness as separate module

### Partial Rollback Options
1. Disable specific agents while maintaining core functionality
2. Fall back to simpler analysis if complex verification fails
3. Return basic extraction results if full pipeline errors

## Success Criteria

### Tier 1 (Must Achieve)
- ✅ `/analyze` endpoint returns structured JSON verification report
- ✅ Extracts citations from MSJ with at least 80% accuracy
- ✅ Flags at least 3 of 8 known discrepancies
- ✅ Produces non-hallucinated output for ambiguous cases

### Tier 2 (Should Achieve)
- ✅ Evaluation harness runs with single command
- ✅ Measures precision, recall, hallucination rate
- ✅ Cross-document consistency checking implemented
- ✅ Structured data passing between agents

### Tier 3 (Could Achieve)
- ✅ 4+ well-defined agents with distinct roles
- ✅ Confidence scoring with reasoning
- ✅ Judicial memo agent for summary
- ✅ Graceful failure handling
- ✅ UI displays structured report
- ✅ Reflection document completed

### Quality Metrics
- **Precision:** >70% (avoiding false flags)
- **Recall:** >60% (catching known flaws)
- **Hallucination Rate:** <10% (not fabricating findings)
- **Execution Time:** <30 seconds for full analysis
- **Code Quality:** Clear agent decomposition, precise prompts, documented tradeoffs

### Evaluation Success
- Eval suite produces honest metrics (not cherry-picked)
- Clear documentation on how to run evals
- Reflection demonstrates thoughtful design decisions
- Progress demonstrates effective time investment prioritization