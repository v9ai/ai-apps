---
slug: ai-agent-reflection-loops
title: "Reflection Is Mostly Stalling"
description: "I built a 4-agent journalism pipeline and watched the editor loop burn tokens without improving the draft. Here's what the research says about why LLM self-correction loops fail — and what to do instead."
date: 2026-03-08
authors: [nicolad]
tags:
  - reflection
  - ai-agents
  - llm
  - engineering
---

<AudioPlayer src="https://pub-dce8469a10bc41b08c963ff216ba6c24.r2.dev/vadim-blog/ai-agent-reflection-loops.wav" />

I built a journalism pipeline where four LLM agents — Researcher, SEO Strategist, Writer, Editor — collaborate to produce articles. The Editor reviews the Writer's draft against the research brief and either approves or requests revisions. On the first real run, the Editor correctly flagged fabricated statistics that the SEO agent had hallucinated. It requested a revision. The Writer revised. The Editor reviewed again. The revision was worse.

The Writer hadn't fixed the core problem. It had paraphrased the same draft, shuffled paragraphs, softened claims. The token cost tripled. The article quality didn't move.

That experience sent me down a rabbit hole into the research on LLM self-correction. What I found is that my pipeline's failure isn't a bug — it's the default behavior.

## The model can't debug itself with its own broken debugger

The intuition behind reflection is compelling: if a model can reason, it should be able to review its own reasoning. Generate, critique, revise. A virtuous cycle.

[Huang et al. (2023)](https://arxiv.org/abs/2310.01798) tested this directly. They asked GPT-4 to review and correct its own answers on GSM8K and MultiArQ. The result: accuracy **decreased**. The model changed correct answers to wrong ones more often than it fixed actual errors. The same flawed reasoning that produced the wrong answer gets applied during the critique. You're asking a buggy compiler to find its own bugs.

This isn't surprising if you think about it mechanically. The critique step uses the same weights, the same training distribution, the same blind spots. Without new information entering the loop, the model is just talking to itself.

## Four patterns of stalling

After reading the research and watching my own pipeline fail, I see four recurring failure modes.

**Critiques target the wrong layer.** The agent nitpicks style, formatting, and word choice while missing the actual problem. In my pipeline, the Editor caught the fabricated statistics — but the Writer's "revision" focused on tone and paragraph structure. The factual errors survived.

**Circular reasoning.** The model uses its flawed reasoning to evaluate its flawed reasoning. There's no external ground truth to break the loop. As Huang et al. showed, the buggy logic that produced a wrong answer is baked into the weights — the same logic runs during critique.

**Hallucinated errors.** The agent sometimes invents problems that don't exist, then "fixes" them by corrupting previously correct output. In my case, the SEO agent invented statistics ("68% of reflection steps produce no semantic change" — ironic, given the topic). The Writer dutifully included them. The Editor caught them. But on revision, the Writer introduced new unsourced claims to replace the old ones.

**Semantic no-ops.** The most common outcome: the agent performs the computational work — burning tokens, adding latency — but the core content is unchanged. The reflection loop is pure overhead.

## When reflection actually works (and why)

The technique isn't universally useless. But the cases where it works share one property: **external verification enters the loop.**

[Reflexion (Shinn et al., 2023)](https://arxiv.org/abs/2303.11366) achieved 91% pass@1 on HumanEval. Impressive — but it worked because the loop ran unit tests and fed concrete failure traces back to the model. Strip out the test execution and the gains evaporate. The model wasn't reflecting. It was reading error messages.

[CRITIC (Gou et al., 2024)](https://arxiv.org/abs/2305.11738) separates generation from verification explicitly: generate a claim, verify it with a search engine or code interpreter, then revise. Remove the tool verification step and most of the improvement disappears.

The pattern is binary. If your reflection loop introduces new, objective information — test results, API responses, database lookups — it can work. If the model is just re-reading its own output, you're paying for it to talk to itself.

## The cost math is brutal

A typical reflection loop for a 2,000-token document:

| Step | Input tokens | Output tokens | Running total |
|---|---|---|---|
| Generate | ~1,000 | ~2,000 | ~3,000 |
| Critique | ~4,000 (prompt + output + critique instruction) | ~1,500 | ~8,500 |
| Revise | ~7,000 (all of the above + revision instruction) | ~2,000 | ~17,500 |

One round of reflection multiplies token consumption by roughly 3x. Two rounds push it past 5x. And each round is a sequential API call — if generation takes three seconds, a critique-plus-revise cycle adds six to 10 seconds of latency.

In my journalism pipeline, a single article with one revision round cost approximately 45,000 tokens across four agents. The approved-on-first-pass version costs about 15,000. The revision didn't improve the article. It tripled the bill.

## What I actually did instead

After the reflection loop failed, I redesigned the pipeline around two principles: prevent bad input from entering the system, and cap revision to one round.

**Anti-hallucination at the prompt level.** Instead of relying on the Editor to catch fabricated data, I rewrote the SEO agent's prompt to explicitly forbid inventing statistics: "NEVER invent proprietary data claims, survey results, or analysis statistics." I added a cross-reference rule to the Writer: "ONLY use facts that appear in the Research Brief. If the SEO Strategy mentions data claims not in the Research Brief, DO NOT include them." Prevention beats correction.

**One revision maximum.** If the Editor says revise, the Writer gets one retry with the Editor's structured feedback, the original research, and the previous draft. If the Editor still rejects after that, the problem is upstream — in the research, the topic, or the prompt design. No amount of looping will fix it.

**Structured editor output.** Instead of free-form "please fix this," the Editor returns a checklist: Critical Issues (must fix), Suggestions (should fix), Minor Notes (nice to have). The Writer can mechanically address each item. This turns vague reflection into specific, actionable feedback.

The result: the pipeline produces better articles on the first pass because the inputs are cleaner. The revision loop exists as a safety net, not as the primary quality mechanism.

## Practical takeaways

1. **Audit your loops.** If the critique step doesn't call a tool, run a test, or query an external source, turn it off. Measure quality for 100 examples with and without it. If the difference is unmeasurable, delete it.

2. **Invest in verification, not reflection.** Test suites for code. Schema validators for structured data. Search APIs for factual claims. These are your quality multipliers — not the reflection wrapper.

3. **Cap revisions at one.** If one round with proper feedback doesn't fix it, the problem is in the prompt or the context, not the writing. Looping won't help.

4. **Prefer sampling to looping.** Given a fixed compute budget, generate multiple independent candidates and pick the best. Diversity of independent samples explores the solution space better than iterative polishing, which gets stuck in local optima.

5. **Prevent, don't correct.** Anti-hallucination guardrails in prompts are cheaper and more reliable than post-hoc reflection. A model that never fabricates data doesn't need an editor to catch fabrications.

The trajectory for better LLM applications isn't deeper introspection — it's richer verification and cleaner inputs. Stop building mirrors. Start building linters.
