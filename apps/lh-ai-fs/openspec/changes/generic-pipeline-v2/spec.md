# Delta Specification: generic-pipeline-v2

**Change ID:** generic-pipeline-v2
**Date:** 2026-03-04
**Status:** Implemented

---

## Overview

Six-phase improvement to the BS Detector pipeline:

1. **Fix verification failures**: Resolved all 10 FAIL items from the `promptfoo-langchain-sqlite` verification report.
2. **Genericize pipeline**: API accepts document uploads via JSON body; case-agnostic prompts with context injection.
3. **5th Agent (JudicialMemoAgent)**: Dedicated agent for structured judicial memo generation, extracted from ReportSynthesizer.
4. **LLM-as-Judge eval**: Semantic evaluation alongside keyword matching, activated via `LLM_JUDGE=1`.
5. **Structured UI**: React components for upload, confidence gauges, finding cards, citation/fact tables, judicial memo display.
6. **Updated reflection**: Comprehensive reflection addressing all 5 evaluation criteria.

## Files Changed

### Phase 1 — Verification Fixes
- `backend/services/llm_service.py`: F-01 (temperature default), F-02 (null check)
- `backend/evals/db.py`: F-03 (rename/signature), F-04 (NOT NULL), F-05 (JSON deserialization), F-06 (path threading)
- `backend/promptfooconfig.yaml`: F-07 (4 missing assertions)
- `backend/run_evals.py`: F-08 (returncode check), F-09 (exact error message)
- `backend/evals/harness.py`: F-10 (init_db call)
- `backend/evals/provider.py`: Updated save_run call signature

### Phase 2 — Genericization
- `backend/main.py`: AnalyzeRequest model, JSON body support
- `backend/services/document_service.py`: load_from_dict method
- `backend/agents/orchestrator.py`: documents/case_id parameters
- `backend/utils/prompts.py`: {case_context} placeholders, removed hardcoded Privette knowledge
- `backend/utils/case_context.py` (NEW): Case context lookup
- `backend/agents/citation_verifier.py`: Pass case_context to prompt

### Phase 3 — JudicialMemoAgent
- `backend/agents/judicial_memo.py` (NEW): JudicialMemoAgent
- `backend/models/schemas.py`: JudicialMemo model, updated VerificationReport
- `backend/agents/orchestrator.py`: Step 5 in pipeline
- `backend/agents/report_synthesizer.py`: Removed memo generation

### Phase 4 — Eval Improvements
- `backend/evals/llm_judge.py` (NEW): LLM-as-judge evaluation
- `backend/evals/metrics.py`: calculate_combined_metrics
- `backend/evals/test_cases.py`: expected_reasoning field
- `backend/evals/harness.py`: LLM_JUDGE=1 support

### Phase 5 — UI
- `frontend/src/App.jsx`: Rewritten with components
- `frontend/src/components/FileUpload.jsx` (NEW)
- `frontend/src/components/ReportView.jsx` (NEW)
- `frontend/src/components/FindingCard.jsx` (NEW)
- `frontend/src/components/ConfidenceGauge.jsx` (NEW)
- `frontend/src/components/JudicialMemo.jsx` (NEW)

### Phase 6 — Reflection
- `REFLECTION.md`: Updated with all sections
