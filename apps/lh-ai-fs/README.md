# BS Detector

Legal briefs lie. Not always intentionally — but they do. They cite cases that don't say what they claim. They quote authority with words quietly removed. They state facts that contradict the documents sitting right next to them.

Your task: build an AI pipeline that catches it.

## Quick Start

```bash
cp .env.example .env      # Add your API key
make up                   # Build & start app
make eval                 # Run evaluation suite
```

The API runs at `http://localhost:8002`. The UI runs at `http://localhost:5175`.

Both services hot-reload — edit files on your host and changes appear automatically.

### Makefile Commands

| Command | Description |
|---------|-------------|
| `make up` | Build images and start all services |
| `make down` | Stop and remove containers |
| `make eval` | Run the promptfoo evaluation suite in Docker |
| `make logs` | Tail container logs |

### Manual Setup (without Docker)

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # Add your API key
uvicorn main:app --reload --port 8002
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Architecture

5 specialized agents with parallel execution:

```
Documents → Parser → [Citation Verifier ∥ Fact Checker] → Synthesizer → Judicial Memo → JSON Report
```

- **Document Parser**: Extracts citations and factual claims from MSJ
- **Citation Verifier**: Checks quote accuracy, jurisdiction, proposition support (citations verified in parallel)
- **Fact Checker**: Cross-references dates, PPE, control, scaffolding across all docs
- **Report Synthesizer**: Aggregates results, ranks findings by severity, calculates confidence scores
- **Judicial Memo**: Writes a formal judicial memo with key issues, recommended actions, and overall assessment

Citation verification and fact checking run **in parallel** via `asyncio.gather()`.

## Evaluation

The test case — *Rivera v. Harmon Construction Group* — contains **8 planted discrepancies** across the MSJ and supporting documents (police report, medical records, witness statement). The eval suite measures how many the pipeline catches, how many it fabricates, and whether its evidence is grounded in source text.

### How to run

```bash
# Full pipeline eval (recommended — Docker)
make eval

# Prompt-level A/B evals (citation + fact checking prompts)
make eval-precision

# Both
make eval-all

# Without Docker
cd backend && python run_evals.py          # pipeline eval
cd backend && python run_evals.py --view   # + open promptfoo web viewer
cd backend && python -m evals.harness      # standalone harness with metrics
LLM_JUDGE=1 python -m evals.harness       # + LLM-as-judge scoring
```

### Eval layers

The suite has four layers, each testing at a different level of abstraction:

| Layer | Config | What it tests | Runner |
|-------|--------|---------------|--------|
| **Pipeline (end-to-end)** | `backend/promptfooconfig.yaml` | Full agent pipeline against 20 assertions | `make eval` |
| **Python harness** | `backend/evals/harness.py` | Precision/recall/F1 against 8 ground-truth discrepancies | `python -m evals.harness` |
| **Prompt precision A/B** | `evals/promptfoo/prompt-precision-*.yaml` | Precise vs. imprecise prompt variants for citation verification and fact checking | `make eval-precision` |
| **Agent-level** | `evals/promptfoo/fact-checking.yaml`, root `promptfooconfig.yaml` | Individual FactChecker and CitationVerifier agents in isolation | `npx promptfoo eval --config <file>` |

### Pipeline eval assertions (20 tests)

| Category | IDs | Count | What it checks |
|----------|-----|-------|----------------|
| **Structural** | S-01 – S-07 | 7 | Valid JSON, required fields, motion ID, ≥3 citations, ≥3 facts, confidence scores in [0,1], judicial memo present, 4 documents in metadata |
| **Discrepancy detection** | D-01 – D-08 | 8 | Each of the 8 planted errors (see table below). Weighted: critical bugs get 2x |
| **Quality** | Q-01 – Q-05 | 5 | No fabricated case names, ≥1 high-confidence finding, ≥1 contradictory fact, ≥1 unsupported citation, ≥50% of findings have textual evidence |
| **Negative (precision)** | N-01 | 1 | Clean internally-consistent documents produce ≤1 finding and 0 contradictions |

### The 8 planted discrepancies

| ID | Category | What's wrong | Weight |
|----|----------|-------------|--------|
| D-01 DATE | Fact | MSJ says March 14; police/medical/witness all say March 12 | 2x |
| D-02 PPE | Fact | MSJ claims no PPE; police + witness confirm harness, hard hat, vest | 2x |
| D-03 PRIVETTE | Citation | "never liable" — word "never" inserted into Privette holding (it's a presumption, not absolute) | 2x |
| D-04 SOL | Fact | Statute of limitations calculation uses wrong date (362 days off March 14) | 1x |
| D-05 CTRL | Fact | MSJ claims no hirer control; Donner (Harmon foreman) directed crew, dismissed safety concerns | 2x |
| D-06 JURISDICTION | Citation | Dixon (Texas) and Okafor (Florida) cited as authority in California court | 1x |
| D-07 SCAFFOLDING | Fact | MSJ silent on scaffold defects; police + witness document rust, plywood base, bent pins | 1x |
| D-08 SPOLIATION | Fact | Scaffolding rebuilt with new components post-incident — potential evidence destruction | 1x |

### Metrics

The Python harness (`backend/evals/harness.py`) calculates:

| Metric | How it's measured | What it tells you |
|--------|-------------------|-------------------|
| **Recall** | Matched discrepancies / 8 ground truth | How many planted errors were caught |
| **Precision** | True positives / total findings | What fraction of findings are real (not hallucinated) |
| **F1** | Harmonic mean of precision and recall | Single balanced score |
| **Grounding rate** | Findings with evidence traceable to source documents | Whether the pipeline cites real text or fabricates evidence |
| **False discovery rate** | False positives / total findings | How much noise the pipeline adds |

Matching uses keyword overlap (≥2 keyword hits from ground truth). Optionally, `LLM_JUDGE=1` adds semantic matching via LLM-as-judge, and combined metrics report the union of both methods.

### Prompt precision A/B tests

The `evals/promptfoo/prompt-precision-*.yaml` configs run every test case through **two prompt variants** (precise and imprecise) side by side. This measures the impact of prompt engineering on:

- **Schema compliance** — does the output parse as valid JSON with correct fields?
- **Recall** — does it catch the planted errors?
- **Precision** — does it avoid false-flagging correct claims?
- **Uncertainty** — does it hedge on a fictitious citation rather than hallucinating a verdict?

### Run history

Each harness run is persisted to `backend/evals/evals.db` (SQLite) with the git SHA, timestamp, and all metrics. This lets you track recall/precision trends across commits.

### View results

```bash
npx promptfoo view              # interactive web viewer
cat backend/eval_results.json   # JSON output from harness
```

## API

### POST /analyze

Returns a structured verification report:

```json
{
  "report": {
    "motion_id": "Rivera_v_Harmon_MSJ",
    "verified_citations": [...],
    "verified_facts": [...],
    "top_findings": [...],
    "confidence_scores": {
      "citation_verification": 0.85,
      "fact_consistency": 0.9,
      "overall": 0.87
    },
    "judicial_memo": "...",
    "unknown_issues": [...]
  }
}
```

### GET /health

Returns `{"status": "ok"}`.
