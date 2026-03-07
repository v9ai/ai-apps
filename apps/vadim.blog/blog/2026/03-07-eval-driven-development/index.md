---
slug: eval-driven-development
title: "Eval Driven Development"
description: "Here's the counterintuitive premise: for any LLM application where errors have real consequences, you must build your evaluation harness *before* you write a single prompt. You don't prompt-engineer b"
date: 2026-03-07
authors: [nicolad]
tags:
  - eval
  - driven
  - development
---

Here's the counterintuitive premise: for any LLM application where errors have real consequences, you must build your evaluation harness *before* you write a single prompt. You don't prompt-engineer by vibes, tweaking until an output looks good. You start by defining what "good" means, instrumenting its measurement, and only then do you optimize. This is Eval-Driven Development. It's the only sane way to build reliable, high-stakes AI systems.

In most software, a bug might crash an app. In high-stakes AI, a bug can trigger a misdiagnosis, approve a fraudulent transaction, deploy vulnerable code to production, or greenlight a toxic post to millions of users. The consequences are not hypothetical. An AI-generated radiology summary that fabricates a nodule sends a patient into an unnecessary biopsy. A compliance pipeline that hallucinates a regulatory citation exposes a bank to enforcement action. A code review agent that misses a SQL injection in a PR puts an entire user base at risk. The tolerance for error in these domains is asymptotically approaching zero. This changes everything about how you build.

The typical LLM workflow—prompt, eyeball output, tweak, repeat—fails catastrophically here. You cannot perceive precision and recall by looking at a single response. You need structured, automated measurement against known ground truth. I learned this building a multi-agent fact-checking pipeline: a five-agent system that ingests documents, extracts claims, cross-references them against source material, and synthesizes a verification report. The entire development process was inverted. The planted errors, the matching algorithm, and the evaluation categories were defined *first*. Prompt tuning came second, with every change measured against the established baseline. The harness wasn't a validation step; it was the foundation.

## 1. The Asymmetric Cost of Error Dictates Architecture

In high-stakes AI, false positives and false negatives are not equally bad. The asymmetry is domain-specific, but it's always there.

*   **A false negative** means the system misses a real problem—an inconsistency in a medical record, a miscalculated risk exposure, an unpatched vulnerability. This is bad—it reduces the system's value—but it's the baseline state of the world without the AI. The document would have gone unreviewed anyway.
*   **A false positive** means the system raises a false alarm—flagging a healthy scan as abnormal, blocking a legitimate transaction as fraudulent, rejecting safe code as vulnerable. This is actively harmful. It wastes expert time, erodes trust, and trains users to ignore the system. It makes the system a net negative.

Consider a medical record summarizer used during clinical handoffs. A missed allergy (false negative) is dangerous but recoverable—clinicians have other safeguards. A fabricated allergy to a first-line antibiotic (false positive) can delay critical treatment and cause the care team to distrust every future output. In financial compliance, a missed suspicious transaction is bad; flagging a Fortune 500 client's routine wire transfer as money laundering is a relationship-ending event.

This asymmetry directly shapes the evaluation strategy. You cannot collapse quality into a single "accuracy" score. You must measure **recall** (completeness) and **precision** (correctness) independently, and you must design your metrics to reflect their unequal impact. In most domains, the architecture must be built to maximize precision, even at some cost to recall. Crying wolf is the cardinal sin.

## 2. Build a Multi-Layer Diagnostic Harness, Not a Monolith

When a test fails, you need to know *why*. A single, monolithic eval script conflates pipeline failures, prompt failures, and data-passing bugs. The fact-checking pipeline I built uses a four-layer architecture for diagnostic precision.

1.  **The Integrated Harness (`run_evals.py`):** A 700+ line orchestrator that runs the full multi-agent pipeline end-to-end. It executes 30+ structured assertions across six categories (Recall, Precision, Hallucination, Grounding, Consistency, Severity). This layer answers: does the whole system work?
2.  **The Promptfoo Pipeline Eval (`promptfoo.yaml`):** A separate layer using the open-source Promptfoo framework. It runs 20+ JavaScript assertions on the same cached pipeline output, providing a standardized web viewer and parallel execution. This layer ensures results are shareable and reproducible.
3.  **Agent-Level Evals:** Isolated Promptfoo configs that test individual agents (Claim Extractor, Cross-Referencer, Synthesizer) with direct inputs. If the pipeline misses a date inconsistency, this layer tells you if it's because the Cross-Referencer failed to detect it or because the Synthesizer later dropped the finding.
4.  **Prompt Precision A/B Tests:** Controlled experiments that run the same test cases against two prompt variants: a precise, detailed prompt and a vague, underspecified one. This quantifies the *causal impact* of prompt engineering choices, separating signal from noise.

This stratification is crucial. The integrated test catches systemic issues, the agent tests isolate component failures, and the A/B tests measure prompt efficacy. Development velocity skyrockets because you can iterate on a single agent in 5 seconds instead of running the full 30-second pipeline.

## 3. Ground Truth is a Domain Argument, Not a Checklist

Your ground truth test case is the foundation. If it's simplistic, your metrics are lies. You need richly constructed test fixtures that mirror real-world complexity—not toy examples.

For a medical record summarizer, this means building a synthetic patient chart across multiple encounter notes, lab results, and imaging reports, then planting specific errors weighted by clinical severity. For a financial report analyzer, it means constructing a set of interconnected filings—10-K, earnings transcript, risk disclosures—with deliberate inconsistencies.

Here's what a well-designed ground truth looks like. Suppose you're building a pipeline that cross-checks corporate filings. Your test fixture contains eight planted errors, each designed to test a specific capability and weighted by business impact:

*   **D-01: Date Discrepancy (Weight: 2).** The earnings call transcript references Q3 revenue of $4.2B recognized through September 30; the 10-K reports the fiscal quarter ending October 31. Tests basic cross-document consistency.
*   **D-02: Metric Contradiction (Weight: 2).** The CEO's letter claims 18% year-over-year growth; the actual financial tables show 11.3%. Tests direct factual contradiction between narrative and data.
*   **D-03: Source Misquotation (Weight: 2).** The risk disclosure paraphrases a regulatory requirement but subtly inverts a key condition. Tests citation accuracy requiring domain knowledge.
*   **D-05: Cross-Document Inference (Weight: 2).** The filing claims no material exposure to a specific market; a subsidiary's footnote reveals 30% revenue concentration there. Tests cross-document *inference*.

The other four errors (unit conversion mistakes, outdated references, omissions, inconsistent terminology) have a weight of 1. The weighting is critical. The total possible weight is 12. A system that catches the four critical errors (weight 2 each) but misses all others scores a weighted recall of 8/12 (67%). A system that catches only the four minor errors scores 4/12 (33%). The metric reflects domain impact, not just a detection count.

## 4. Matching Algorithms Encode Precision-Recall Tradeoffs

Determining if a pipeline "detected" an error is not a simple string equality. The eval harness uses a nuanced matching algorithm with two primary modes, each representing a deliberate tradeoff.

*   **"Any" Mode:** The check passes if *any* keyword from a list appears in the extracted output text. Used for errors where a keyword is uniquely specific. For the date discrepancy (D-01), keywords are `"september 30"`, `"october 31"`, `"quarter end"`, `"date discrepancy"`. If the output contains "october 31," it's almost certainly referring to the planted error. This mode maximizes **recall** (sensitivity).

*   **"Keyword Plus Signal" Mode:** The check passes only if BOTH a topic keyword *and* a signal word are present. Used for ambiguous topics. For the metric contradiction (D-02), keywords are `"growth"`, `"18%"`, `"year-over-year"`. But merely mentioning growth doesn't mean the system detected the *contradiction*. So it also requires a signal word from `"contradict"`, `"incorrect"`, `"does not match"`, `"overstated"`. This mode maximizes **precision** (specificity).

The algorithm defensively extracts and concatenates text from nested report fields (like `top_findings.description` and `verified_facts.summary`) into flat blobs for searching. This avoids the brittleness of relying on a single, specific output field. The matching logic itself is more predictable than the LLM it evaluates, which is essential.

## 5. Precision is Measured on Pristine Documents, Recall on Dirty Ones

You cannot measure precision and recall on the same dataset. The harness uses two separate test cases.

**Recall** is measured on the "dirty" fixture with its eight planted errors. Did you find them?

**Precision** is measured on a separate "clean" fixture—a set of four internally consistent documents with *zero* planted errors. Any finding produced here is a false positive. The precision checks are pragmatic:
*   P-01: Clean docs should produce **at most one finding**. (A zero-tolerance policy is unrealistic for stochastic LLMs; allowing one accommodates inherent noise.)
*   P-02: No verified facts marked `contradictory`.
*   P-03: No claims marked `unsupported` or `misleading`.
*   P-04: Overall confidence score >= 0.6.

The **False Discovery Rate** (false positives / total findings) is calculated here. It's a more intuitive metric for stakeholders: "30% of this system's findings are wrong" is clearer than "precision is 70%."

## 6. Evidence Grounding is a Bulwark Against Hallucination

The most important guardrail is **evidence grounding**. Every finding must cite its source. The harness implements a mechanistic check: for each finding's evidence text, does a substring of at least 10 characters appear verbatim in the concatenated source documents?

This prevents the system from generating plausible-sounding findings plucked from thin air—the exact failure mode that has already caused real damage across industries. When a code review agent says "this function is vulnerable to path traversal," the engineer must be able to see the actual code it's referencing. When a medical summarizer says "patient has a documented penicillin allergy," the clinician must be able to trace that to a specific note. Grounding makes claims traceable.

The threshold is deliberately set at **>=50% of findings grounded**, not 100%. Why? Because some legitimate findings are inferential. A finding like "the company's stated growth rate is inconsistent with its reported revenue figures" synthesizes data from two different documents—the narrative section and the financial tables. The synthesized insight may not appear verbatim anywhere. The 50% threshold catches egregious hallucination while permitting necessary analytical synthesis.

## 7. LLM-as-Judge is a Semantic Supplement, Not the Primary

An LLM can be used as an evaluator ("LLM-as-Judge") to catch semantic matches keyword search misses (e.g., "date discrepancy" vs. "temporal inconsistency between filings"). However, it is an **opt-in secondary signal**, not the primary metric.

This is a critical philosophical stance. Using an LLM to evaluate an LLM introduces the very uncertainty you're trying to measure. It's non-deterministic, costly (80+ API calls per run), and creates an infinite regress (who evaluates the evaluator?).

In my pipeline, the primary judge is the deterministic keyword algorithm. The LLM judge (DeepSeek, temperature 0.0) runs in parallel, and the **combined metrics** take the *union* of matches from both methods. You get the transparency and stability of keywords, augmented by the semantic understanding of the judge. The final scoring is defensible and explainable.

### Practical Takeaways for Your Project

1.  **Invert the Workflow.** For any non-trivial LLM app, define your evaluation metrics, ground truth, and matching logic *before* prompt engineering. Build the harness first.
2.  **Separate Precision & Recall.** Test them on different datasets. Use a "clean" case to measure false positives and a "dirty" case to measure detection capability.
3.  **Implement Mechanistic Grounding.** Add a mandatory check that evidence strings appear in source text. It's the single best guardrail against catastrophic hallucination.
4.  **Build a Multi-Layer Eval.** Use integrated tests for end-to-end validation and isolated agent-level tests for rapid iteration and root-cause analysis.
5.  **Weight Your Ground Truth.** Not all errors are equal. Embed domain-specific severity into your scoring.
6.  **Prefer Deterministic Evaluation.** Use LLM-as-Judge as a semantic supplement, not your primary scoring mechanism. Your measurement tool must be more stable than the system under test.
7.  **Persist Everything.** Log every eval run with a git SHA to a database (`SQLite` works). You need to track metrics over time to detect regressions the moment they happen.

### The Broader Implication

Eval-Driven Development is the necessary maturation of LLM engineering for any domain where outputs have consequences—healthcare, finance, compliance, code review, content moderation, education. The era of shipping AI features built on prompt-engineering-by-anecdote is ending. The next generation of AI applications will be distinguished not by the cleverness of their prompts, but by the rigor of their evaluation.

The four-layer architecture, weighted ground truth, and grounding checks described here form a blueprint. It acknowledges that the hardest part of building trustworthy AI isn't the model orchestration; it's building the system that tells you, unequivocally and at every step, whether you can trust it. Start there.