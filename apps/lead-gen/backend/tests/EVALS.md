# Offline Eval Harness

Answers the question **"is the LLM output quality drifting?"** for the product-intelligence graphs and the email composer:

| Graph | Test | Golden set |
|---|---|---|
| `deep_icp_graph` | `test_deep_icp_eval.py` (pre-existing) | `golden/deep_icp.json` |
| `pricing_graph` | `test_pricing_eval.py` | `golden/pricing.json` |
| `gtm_graph` | `test_gtm_eval.py` | `golden/gtm.json` |
| `positioning_graph` (team 4, WIP) | `test_positioning_eval.py` | `golden/positioning.json` |
| `email_compose_graph` | `test_email_eval.py` | `golden/email.json` |

Without this harness, "the pipeline works" just means "it doesn't crash."

---

## How to run

Evals are **gated** so normal `pytest` never triggers them (they cost DeepSeek tokens and take minutes):

```bash
# From backend/
EVAL=1 DEEPSEEK_API_KEY=... pytest tests/test_pricing_eval.py -s
EVAL=1 DEEPSEEK_API_KEY=... pytest tests/test_gtm_eval.py      -s
EVAL=1 DEEPSEEK_API_KEY=... pytest tests/test_positioning_eval.py -s
EVAL=1 DEEPSEEK_API_KEY=... pytest tests/test_email_eval.py    -s
```

Or run all five at once:

```bash
EVAL=1 DEEPSEEK_API_KEY=... pytest tests/test_deep_icp_eval.py tests/test_pricing_eval.py tests/test_gtm_eval.py tests/test_positioning_eval.py tests/test_email_eval.py -s
```

The `-s` flag surfaces the per-graph pass-rate header and failure list.

### Switching to a stronger judge

By default the judge is `deepseek-v4-pro` (cheap, already funding the graphs themselves). To use Claude Opus 4.7 as a second-opinion judge:

```bash
EVAL=1 STRONG_JUDGE=1 ANTHROPIC_API_KEY=... pytest tests/test_pricing_eval.py -s
```

The harness detects the `anthropic` SDK at import time. If it isn't installed the flag is silently ignored and we fall back to DeepSeek. To install:

```bash
uv pip install anthropic
# or
pip install anthropic
```

`STRONG_JUDGE_MODEL` overrides the model string (default `claude-opus-4-7`).

### No Neon required

The pricing / gtm evals monkey-patch the graphs' `load_inputs` node and the module-level `psycopg.connect` symbol inside `_run()`. This means **you do NOT need `NEON_DATABASE_URL` for evals** — the live graph still runs every LLM node, but reads product inputs from the golden JSON and swallows the final `UPDATE products ...` write. The positioning eval will follow the same pattern once team 4's graph lands.

---

## Golden set format

Each file is a JSON array of entries. Every entry has:

| Key | Type | Purpose |
|---|---|---|
| `id` | integer | Stable identifier (unique across the file) |
| `product` | object | Feeds the graph's `state["product"]` — must have `id`, `name`, `url`, `domain`, `description`, optional `highlights` |
| `expected_*` | varies | Hand-labeled golden — see per-graph keys below |

### pricing.json

```jsonc
{
  "expected_value_metric_signals": ["per transaction", "TPV", ...],
  "expected_model_type": "usage",               // or "subscription"/"hybrid"/...
  "expected_tier_count_range": [2, 4],          // inclusive
  "expected_wtp_signals": ["$8-$14/seat", ...],
  "expected_free_offer": true,                  // currently not scored — reserved
  "expected_billing_units": ["per_seat"],       // currently not scored — reserved
  "expected_risks": ["race-to-bottom on fees", ...]
}
```

### gtm.json

```jsonc
{
  "expected_channels": ["product-led growth", "community", ...],
  "expected_icps": ["remote teams 10-200 people", ...],
  "expected_pain_points": ["fragmented docs across tools", ...],
  "expected_positioning_axes": ["all-in-one vs best-of-breed", ...]
}
```

### positioning.json

```jsonc
{
  "expected_category": "project management / issue tracking",
  "expected_differentiators": ["keyboard-first UX", ...],
  "expected_positioning_axes": ["speed vs bloat", ...],
  "expected_competitor_frame": ["jira (legacy, slow)", ...],
  "expected_narrative_hooks": ["the purpose-built jira alternative", ...]
}
```

### email.json

Different shape — entries are scenarios for the email composer, not products.

```jsonc
{
  "id": "ml-engineer-cold-outreach",          // string, stable
  "scenario_label": "Cold outreach — ...",     // human-readable
  "input": {                                   // fed verbatim to email_compose
    "recipient_name": "Mira Chen",
    "company_name": "Vellum AI",
    "recipient_context": "Senior ML Engineer ...",
    "instructions": "Write a concise warm cold email ..."
    // optional: "linkedin_post_content"
  },
  "expected_signals": ["LLM evaluation", "RAG", ...],   // ≥1 must appear in body
  "expected_cta_kind": "intro_chat",                    // intro_chat / freelance_explore / timeline_question / ...
  "must_avoid_phrases": ["I hope this finds you well", ...]  // documented; checked deterministically against AI_MARKERS
}
```

The email eval runs **two layers** per entry: 6 deterministic checks (subject ≤50, opening ≤3 sentences, no AI markers, `{{name}}` placeholder, signature, word-count) and 4 judge metrics (`signal_injection`, `cta_clarity`, `no_fabrication`, `tone_match`). The deterministic layer is free; the judge layer is one DeepSeek (or Claude) call per metric × entry. No DB stubs needed — `email_compose_graph` has no DB writes.

---

## How to extend

Each file ships with **8 carefully reasoned entries**. The bar is 15+ entries per graph — grow the sets incrementally:

1. Pick a real, recognizable B2B product not already in the file (Stripe, Linear, Notion, Retool, Vercel, Modal, PromptLoop, CareLink EHR are already used).
2. Write the `product` payload — keep the `description` to 1-2 sentences. The graph's `_product_brief` will serialize it for the LLM.
3. Run the graph once manually to bootstrap expected labels:
   ```python
   from leadgen_agent.pricing_graph import build_graph
   out = await build_graph().ainvoke({"product_id": 0, "product": {...}})
   ```
4. **Edit by hand** — trim hallucinations, add obvious-but-missing options, keep 3-5 items per expected list.
5. Re-run the eval and check that the aggregate pass rate stays >= 0.80.

Entries that consistently pass for the wrong reasons (e.g. judge being too lenient) should be tightened; entries that fail because the graph is actually right but the golden is wrong should be corrected in the golden.

---

## Judge prompt

Single prompt shape for all metrics, defined in `_eval_utils.build_judge_prompt`:

```
System: You are an offline evaluator for a B2B product-intelligence pipeline.
You score ONE metric at a time against a hand-labeled golden expected value.
Be strict but fair: credit semantic matches and reasonable synonyms; penalize
missing or hallucinated content.
Respond with strict JSON only: {"score": float in [0,1],
"verdict": "pass"|"fail", "reason": "one-sentence justification"}.

User:
  Product: <name>
  Metric: <metric_name>
  Rubric: <rubric>

  Expected (golden):
  <expected>

  Actual output (from the live graph):
  <serialized output>

  Return strict JSON: {"score": <float 0..1>, "verdict": "pass" if >=0.7
  else "fail", "reason": "<=1 sentence"}.
```

Per metric rubrics live next to each test (`METRICS` lists in each `test_*_eval.py`).

---

## Pass / fail

| Layer | Threshold | Source |
|---|---|---|
| Per-cell (entry × metric) | **score >= 0.7** | Matches `test_deep_icp_eval.py` |
| Aggregate across all cells | **rate >= 0.80** | Matches `OPTIMIZATION-STRATEGY.md` eval-first bar |

`aggregate_gate()` in `_eval_utils.py` computes both. Runtime errors (graph crashes, DB stubs firing incorrectly) count as failures for *all* metrics of the affected entry so a broken graph can never accidentally pass.

---

## deepeval gotchas

The deep_icp eval uses `deepeval.metrics` (AnswerRelevancy, Faithfulness, GEval). These evals deliberately do **not** — reasons:

- **deepeval treats every metric as its own LLM call.** Five metrics × fifteen entries × two judges = 150 calls per test. With DeepSeek that's ~$0.60 per full run; with Claude Opus it's ~$8-12.
- **deepeval's `GEval` wraps a generic chain-of-thought prompt.** We bypass that layer and call the judge directly with our own rubric, so the prompt is inspectable and diffable.
- **deepeval's `DeepEvalBaseLLM` requires a `load_model` + sync `generate` pair.** Our judge is async-first, and wrapping `ainvoke` inside a sync shim was the biggest source of flakes in deep_icp (see the `LocalJudge` class there).

The trade-off: the evals here don't benefit from deepeval's telemetry / report dashboard. If that matters, the `_eval_utils.run_judge` function is a drop-in replacement point — swap in `deepeval.metrics.GEval.a_measure(...)`.

**Rate limiting.** DeepSeek's `deepseek-v4-pro` can be slow (5-30s per call). A full sweep of all three new tests costs ~200 judge calls, so expect 10-20 minutes on a clean run. The tests are async but call the judge serially to keep the output log readable.

**JSON repair.** The judge is prompted for strict JSON but DeepSeek occasionally wraps with markdown fences — `_eval_utils._run_deepseek_judge` routes through `leadgen_agent.llm.ainvoke_json`, which handles both fences and the `json-repair` fallback. Anthropic replies have been clean in testing but go through the same `_normalize_judge_response` defensive parser.
