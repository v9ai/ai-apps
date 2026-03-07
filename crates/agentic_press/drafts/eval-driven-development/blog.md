# Eval Driven Development

Here’s the counterintuitive premise: for any LLM application where errors have real consequences, you must build your evaluation harness *before* you write a single prompt. You don’t prompt-engineer by vibes, tweaking until an output looks good. You start by defining what “good” means, instrumenting its measurement, and only then do you optimize. This is Eval-Driven Development. It’s the only sane way to build reliable, high-stakes AI systems.

In most software, a bug might crash an app. In legal AI, a bug can destroy a career, waste court time, and erode the foundational trust required for the system to exist. The post-*Mata v. Avianca* landscape is clear: courts now assume AI output is unverified until proven otherwise. Attorneys have been fined and suspended. The tolerance for error is asymptotically approaching zero. This changes everything about how you build.

The typical LLM workflow—prompt, eyeball output, tweak, repeat—fails catastrophically here. You cannot perceive precision and recall by looking at a single response. You need structured, automated measurement against known ground truth. For the BS Detector, a five-agent pipeline that fact-checks legal briefs, the entire development process was inverted. The eight planted errors, the matching algorithm, and the six evaluation categories were defined *first*. Prompt tuning came second, with every change measured against the established baseline. The harness wasn't a validation step; it was the foundation.

## 1. The Asymmetric Cost of Error Dictates Architecture

In legal AI, false positives and false negatives are not equally bad. They have an extreme, legally-defined asymmetry.
*   **A false negative** means the system misses a real error in a brief. The consequence is that a flawed legal argument goes unchallenged. This is bad—it reduces the system's value—but it's the baseline state of the world without the AI.
*   **A false positive** means the system wrongly accuses an attorney of citing a fabricated case or misstating a fact. The consequence is wasted judicial time, eroded trust, and potential professional sanctions. This is actively harmful. It makes the system a net negative.

This asymmetry directly shapes the evaluation strategy. You cannot collapse quality into a single "accuracy" score. You must measure **recall** (completeness) and **precision** (correctness) independently, and you must design your metrics to reflect their unequal impact. The system's architecture must be built to maximize precision, even at some cost to recall. Crying wolf is the cardinal sin.

## 2. Build a Multi-Layer Diagnostic Harness, Not a Monolith

When a test fails, you need to know *why*. A single, monolithic eval script conflates pipeline failures, prompt failures, and data-passing bugs. The BS Detector uses a four-layer architecture for diagnostic precision.

1.  **The Integrated Python Harness (`run_evals.py`):** A 700+ line orchestrator that runs the full five-agent pipeline end-to-end. It executes 31 structured assertions across six categories (Recall, Precision, Hallucination, etc.). This layer answers: does the whole system work?
2.  **The Promptfoo Pipeline Eval (`promptfoo.yaml`):** A separate layer using the open-source Promptfoo framework. It runs 20+ JavaScript assertions on the same cached pipeline output, providing a standardized web viewer and parallel execution. This layer ensures results are shareable and reproducible.
3.  **Agent-Level Evals:** Isolated Promptfoo configs that test individual agents (Citation Extractor, Fact Checker) with direct inputs. If the pipeline misses the date error, this layer tells you if it's because the Fact Checker failed to detect it or because the Synthesizer later dropped the finding.
4.  **Prompt Precision A/B Tests:** Controlled experiments that run the same test cases against two prompt variants: a precise, detailed prompt and a vague, underspecified one. This quantifies the *causal impact* of prompt engineering choices, separating signal from noise.

This stratification is crucial. The integrated test catches systemic issues, the agent tests isolate component failures, and the A/B tests measure prompt efficacy. Development velocity skyrockets because you can iterate on a single agent in 5 seconds instead of running the full 30-second pipeline.

## 3. Ground Truth is a Legal Argument, Not a Checklist

Your ground truth test case is the foundation. If it's simplistic, your metrics are lies. The BS Detector uses a single, richly constructed fictional case: *Rivera v. Harmon Construction Group*, a California workplace injury motion for summary judgment.

It contains eight planted errors, each designed to test a specific capability and weighted by legal significance:
*   **D-01: Date Discrepancy (Weight: 2).** Motion says March 14; all other docs say March 12. Tests basic cross-document consistency.
*   **D-02: PPE Contradiction (Weight: 2).** Motion claims no protective equipment; police report confirms hard hat and harness. Tests direct factual contradiction.
*   **D-03: Privette Misquotation (Weight: 2).** Motion inserts "never" into a key legal holding. Tests citation accuracy requiring domain knowledge.
*   **D-05: Retained Control Inference (Weight: 2).** Motion claims no control; witness statement shows foreman directed work. Tests cross-document *inference*.

The other four errors (statute of miscalculation, out-of-state citations, omission, spoliation) have a weight of 1. The weighting is critical. The total possible weight is 12. A system that catches the four critical errors (weight 2 each) but misses all others would score a weighted recall of 8/12 (67%). A system that catches only the four lesser errors would score 4/12 (33%). The metric reflects legal impact, not just a detection count.

## 4. Matching Algorithms Encode Precision-Recall Tradeoffs

Determining if a pipeline "detected" an error is not a simple string equality. The eval harness uses a nuanced matching algorithm with two primary modes, each representing a deliberate tradeoff.

*   **"Any" Mode:** The check passes if *any* keyword from a list appears in the extracted output text. Used for errors where a keyword is uniquely specific. For the date error (D-01), keywords are `"march twelve"`, `"march fourteen"`, `"date discrepancy"`. If the output contains "march twelve," it's almost certainly referring to the planted error. This mode maximizes **recall** (sensitivity).

*   **"Keyword Plus Signal" Mode:** The check passes only if BOTH a topic keyword *and* a signal word are present. Used for ambiguous topics. For the PPE error (D-02), keywords are `"hard hat"`, `"harness"`, `"ppe"`. But merely mentioning PPE doesn't mean the system detected the *contradiction*. So it also requires a signal word from `"contradict"`, `"false"`, `"not supported"`. This mode maximizes **precision** (specificity).

The algorithm defensively extracts and concatenates text from nested report fields (like `top_findings.description` and `verified_facts.summary`) into flat blobs for searching. This avoids the brittleness of relying on a single, specific output field. The matching logic itself is more predictable than the LLM it evaluates, which is essential.

## 5. Precision is Measured on Pristine Documents, Recall on Dirty Ones

You cannot measure precision and recall on the same dataset. The harness uses two separate test cases.

**Recall** is measured on the "dirty" *Rivera* case with its eight planted errors. Did you find them?

**Precision** is measured on a separate "clean" case, *Smith v. ABC Corp*—a set of four internally consistent documents with *zero* planted errors. Any finding produced here is a false positive. The precision checks are pragmatic:
*   P-01: Clean docs should produce **at most one finding**. (A zero-tolerance policy is unrealistic for stochastic LLMs; allowing one accommodates inherent noise.)
*   P-02: No verified facts marked `contradictory`.
*   P-03: No citations marked `not supported` or `misleading`.
*   P-04: Overall confidence score ≥ 0.6.

The **False Discovery Rate** (false positives / total findings) is calculated here. It's a more intuitive metric for stakeholders: "30% of this system's findings are wrong" is clearer than "precision is 70%."

## 6. Evidence Grounding is a Bulwark Against Hallucination

The most important guardrail is **evidence grounding**. Every finding must cite its source. The harness implements a mechanistic check: for each finding's evidence text, does a substring of at least 10 characters appear verbatim in the concatenated source documents?

This prevents the system from generating plausible-sounding findings plucked from thin air—the exact failure mode that doomed the attorneys in *Mata*. If the system says "the police report contradicts the motion on PPE," the judge must be able to locate that text. Grounding makes claims traceable.

The threshold is deliberately set at **≥50% of findings grounded**, not 100%. Why? Because some legitimate findings are inferential. The "retained control" finding combines a fact from the police report (foreman directed crew) with a fact from the witness statement (foreman dismissed safety concerns). The synthesized insight may not appear verbatim anywhere. The 50% threshold catches egregious hallucination while permitting necessary analytical synthesis.

## 7. LLM-as-Judge is a Semantic Supplement, Not the Primary

An LLM can be used as an evaluator ("LLM-as-Judge") to catch semantic matches keyword search misses (e.g., "date discrepancy" vs. "incorrect incident date"). However, it is an **opt-in secondary signal**, not the primary metric.

This is a critical philosophical stance. Using an LLM to evaluate an LLM introduces the very uncertainty you're trying to measure. It's non-deterministic, costly (80+ API calls per run), and creates an infinite regress (who evaluates the evaluator?).

In the BS Detector, the primary judge is the deterministic keyword algorithm. The LLM judge (DeepSeek, temperature 0.0) runs in parallel, and the **combined metrics** take the *union* of matches from both methods. You get the transparency and stability of keywords, augmented by the semantic understanding of the judge. The final scoring is defensible and explainable.

### Practical Takeaways for Your Project

1.  **Invert the Workflow.** For any non-trivial LLM app, define your evaluation metrics, ground truth, and matching logic *before* prompt engineering. Build the harness first.
2.  **Separate Precision & Recall.** Test them on different datasets. Use a "clean" case to measure false positives and a "dirty" case to measure detection capability.
3.  **Implement Mechanistic Grounding.** Add a mandatory check that evidence strings appear in source text. It's the single best guardrail against catastrophic hallucination.
4.  **Build a Multi-Layer Eval.** Use integrated tests for end-to-end validation and isolated agent-level tests for rapid iteration and root-cause analysis.
5.  **Weight Your Ground Truth.** Not all errors are equal. Embed domain-specific severity into your scoring.
6.  **Prefer Deterministic Evaluation.** Use LLM-as-Judge as a semantic supplement, not your primary scoring mechanism. Your measurement tool must be more stable than the system under test.
7.  **Persist Everything.** Log every eval run with a git SHA to a database (`SQLite` works). You need to track metrics over time to detect regressions the moment they happen.

### The Broader Implication

Eval-Driven Development is more than a technique for legal AI. It's the necessary maturation of LLM engineering for any domain where outputs have consequences—healthcare, finance, compliance, education. The era of shipping chatbots built on prompt-engineering-by-anecdote is ending. The next generation of AI applications will be distinguished not by the cleverness of their prompts, but by the rigor of their evaluation.

The BS Detector's harness, with its four-layer architecture, weighted ground truth, and grounding checks, is a blueprint. It acknowledges that the hardest part of building trustworthy AI isn't the model orchestration; it's building the system that tells you, unequivocally and at every step, whether you can trust it. Start there.