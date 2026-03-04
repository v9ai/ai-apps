# Delta Specifications: bs-detector-pipeline Implementation

## Overview
This delta specification defines requirements for implementing the BS Detector pipeline that analyzes legal briefs for misrepresentations. The implementation MUST follow the multi-agent architecture outlined in the accepted proposal.

## 1. Core Analysis Pipeline Requirements

### 1.1 ADDED: Citation Extraction Agent
**Requirement 1.1.1:** The system MUST extract all legal citations from the Motion for Summary Judgment document.
- **Given** a Motion for Summary Judgment document is provided
- **When** the citation extraction agent processes the document
- **Then** it MUST identify and extract all case citations, statute references, and legal authorities mentioned

**Requirement 1.1.2:** The extraction agent MUST differentiate between direct quotes and paraphrased citations.
- **Given** a citation contains quoted text
- **When** the agent identifies the citation
- **Then** it MUST flag it as a direct quote and capture the exact text

### 1.2 ADDED: Authority Verification Agent
**Requirement 1.2.1:** For each extracted citation, the system MUST verify whether the cited authority actually supports the proposition as claimed.
- **Given** a citation and its claimed proposition from the MSJ
- **When** the authority verification agent analyzes the citation
- **Then** it MUST output a verification status of "supported", "unsupported", or "unverifiable"

**Requirement 1.2.2:** The verification agent MUST flag misrepresented quotes by comparing quoted text against the actual authority text.
- **Given** a citation marked as a direct quote
- **When** the actual authority text differs from the quoted text
- **Then** it MUST flag the discrepancy with specific differences noted

### 1.3 ADDED: Fact Consistency Agent
**Requirement 1.3.1:** The system MUST cross-reference factual claims in the MSJ against supporting documents (police report, medical records, witness statement).
- **Given** a factual claim in the MSJ
- **When** compared against the supporting documents
- **Then** it MUST identify corroboration, contradiction, or absence of information

**Requirement 1.3.2:** The agent MUST express uncertainty appropriately when verification is not possible.
- **Given** insufficient information to verify a claim
- **When** generating verification results
- **Then** it MUST output "could not verify" rather than fabricating findings

### 1.4 ADDED: Report Synthesis Agent
**Requirement 1.4.1:** The system MUST produce structured JSON output containing all verification findings.
- **Given** verification results from all agents
- **When** synthesizing the final report
- **Then** it MUST output valid JSON with structured findings for citations and facts

**Requirement 1.4.2:** The JSON output MUST NOT be a wall of prose but structured data.
- **Given** analysis results
- **When** formatting the output
- **Then** it MUST use a schema with discrete fields for each finding type

## 2. API Endpoint Requirements

### 2.1 MODIFIED: POST /analyze Endpoint
**Requirement 2.1.1:** The `/analyze` endpoint MUST accept document inputs and return the verification report.
- **Given** a request to `/analyze` with document contents
- **When** the endpoint is called
- **Then** it MUST return HTTP 200 with the structured verification report

**Requirement 2.1.2:** The endpoint MUST handle errors gracefully and return appropriate HTTP status codes.
- **Given** malformed input or processing errors
- **When** the endpoint encounters an error
- **Then** it MUST return 4xx or 5xx status codes with error details

## 3. Evaluation Framework Requirements

### 3.1 ADDED: Evaluation Harness
**Requirement 3.1.1:** The system MUST include an evaluation harness that measures precision, recall, and hallucination rate.
- **Given** ground truth discrepancies are known
- **When** the evaluation harness runs
- **Then** it MUST calculate and report precision, recall, and hallucination rate metrics

**Requirement 3.1.2:** The evaluation suite MUST be runnable via a single command.
- **Given** the evaluation code is implemented
- **When** a user executes the designated command
- **Then** it MUST run all evaluations and output metrics

### 3.2 ADDED: Ground Truth Validation
**Requirement 3.2.1:** The evaluation MUST use the provided known discrepancies as ground truth.
- **Given** the 8 known discrepancies documented in the spec
- **When** running evaluations
- **Then** the system MUST test against these discrepancies

## 4. Agent Architecture Requirements

### 4.1 ADDED: Multi-Agent System
**Requirement 4.1.1:** The pipeline MUST consist of at least 4 well-defined agents with distinct, non-overlapping roles.
- **Given** the pipeline architecture
- **When** examining agent implementations
- **Then** each agent MUST have a clear, single responsibility

**Requirement 4.1.2:** Agents MUST pass structured data between them, not raw text blobs.
- **Given** agent communication is required
- **When** data passes between agents
- **Then** it MUST be in defined structured formats

## 5. Quality and Performance Requirements

### 5.1 ADDED: Quality Metrics
**Requirement 5.1.1:** The system MUST achieve at least 80% accuracy in citation extraction.
- **Given** the MSJ document with citations
- **When** extraction is performed
- **Then** at least 80% of citations MUST be correctly identified

**Requirement 5.1.2:** The system MUST flag at least 3 of the 8 known discrepancies.
- **Given** the known discrepancies exist
- **When** analysis completes
- **Then** the report MUST identify at least 3 discrepancies

### 5.2 ADDED: Non-Hallucination Requirement
**Requirement 5.2.1:** The system MUST NOT fabricate findings for ambiguous cases.
- **Given** insufficient information to make a determination
- **When** generating verification results
- **Then** it MUST output "unverifiable" rather than incorrect determinations

## 6. Stretch Requirements

### 6.1 ADDED: Confidence Scoring Layer
**Requirement 6.1.1:** Each finding MAY include a confidence score with reasoning.
- **Given** a verification finding
- **When** confidence scoring is implemented
- **Then** each finding SHOULD include a confidence score (0-100) and reasoning text

### 6.2 ADDED: Judicial Memo Agent
**Requirement 6.2.1:** The system MAY include an agent that synthesizes top findings into a one-paragraph summary for a judge.
- **Given** verification findings are available
- **When** the judicial memo agent is implemented
- **Then** it SHOULD produce a concise, judge-focused summary paragraph

### 6.3 ADDED: UI Display Requirement
**Requirement 6.3.1:** The frontend UI MAY display the report in a structured, readable way beyond raw JSON.
- **Given** the verification report JSON
- **When** displayed in the UI
- **Then** it SHOULD present findings in an organized, human-readable format

## 7. Documentation Requirements

### 7.1 ADDED: Eval Suite Documentation
**Requirement 7.1.1:** The README MUST include clear instructions on how to run the evaluation suite.
- **Given** the evaluation harness exists
- **When** a user reads the README
- **Then** they MUST be able to run evaluations with provided commands

### 7.2 ADDED: Reflection Document
**Requirement 7.2.1:** The implementation MUST include a reflection document explaining design tradeoffs.
- **Given** the implementation is complete
- **When** reviewing the project
- **Then** a reflection document MUST be present discussing design decisions

## 8. Implementation Constraints

### 8.1 MODIFIED: Time Constraint
**Requirement 8.1.1:** The implementation MUST be designed for completion within 6 hours.
- **Given** the 6-hour time limit
- **When** prioritizing implementation tasks
- **Then** core functionality (Tier 1) MUST be completed before stretch goals

### 8.2 MODIFIED: AI Usage Policy
**Requirement 8.2.1:** The implementation SHOULD leverage AI/LLMs appropriately for agent tasks.
- **Given** the task involves complex text analysis
- **When** implementing agent logic
- **Then** LLMs SHOULD be used where they provide clear value

## 9. REMOVED Requirements
**Requirement 9.1:** No existing functionality is removed by this change.

## 10. Success Criteria Verification

### 10.1 ADDED: Acceptance Tests
**Requirement 10.1.1:** The system MUST pass acceptance tests verifying core functionality.
- **Given** the complete implementation
- **When** acceptance tests are run
- **Then** all Tier 1 requirements MUST be verified as working

**Requirement 10.1.2:** The eval suite MUST produce honest metrics, not cherry-picked results.
- **Given** the evaluation harness
- **When** run against the implementation
- **Then** it MUST report actual performance metrics honestly

---
*This delta specification defines 32 requirements (30 ADDED, 2 MODIFIED, 0 REMOVED) for implementing the BS Detector pipeline as proposed.*