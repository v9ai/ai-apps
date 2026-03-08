# Reflection in AI/Agentic Systems: Research Notes

## Core Thesis

Most production "reflection" loops — where an LLM evaluates its own output, critiques it, and tries again — add latency and cost without measurable quality improvement. The pattern that actually works is **verification** (external signals like test results, tool outputs, ground truth checks), not **introspection** (the same model re-reading its own output with the same biases and no new information).

What the industry calls "reflection" is often verification rebranded. When people show impressive reflection results, look closely: there's almost always an external signal (a compiler, a test suite, a search engine) doing the real work. The LLM isn't reflecting — it's reacting to new information.

## The Pattern Taxonomy

### Constitutional AI (Bai et al., 2022)

Anthropic's Constitutional AI introduced the idea of self-critique at scale. The model generates a response, then critiques it against a set of principles (the "constitution"), then revises. Key insight: this works because the constitution provides an **external reference frame** — the model isn't just asking "is this good?" but "does this violate principle X?" The principles act as a pseudo-verification signal.

The original paper (Bai et al., "Constitutional AI: Harmlessness from AI Feedback," 2022) showed that RLHF from AI feedback could match human feedback for harmlessness. But the gains came from the constitutional principles as structured constraints, not from free-form self-reflection. When you remove the constitution and just ask "improve this," quality degrades.

### Reflexion (Shinn et al., 2023)

Reflexion (Shinn, Cassano, Gopinath, Narasimhan, Yao, 2023) introduced verbal reinforcement learning — the agent reflects on task feedback stored in an episodic memory buffer, then uses those reflections in subsequent attempts. Achieved 91% pass@1 on HumanEval (vs. 80% baseline) and significant gains on ALFWorld and HotPotQA.

Critical detail: Reflexion's gains on code generation came from **test execution feedback**. The agent writes code, runs the tests, sees which tests fail and why, then uses that concrete failure information to revise. This is verification with a reflection wrapper — strip the test execution and Reflexion degrades to baseline. On HotPotQA, the feedback signal was whether the answer was correct or not. On ALFWorld, it was environment feedback.

The paper itself notes: "Reflexion works best when the environment provides informative feedback." When feedback is binary (right/wrong) rather than diagnostic, gains diminish substantially.

### Self-Refine (Madaan et al., 2023)

Self-Refine (Madaan, Tandon, Gupta, Hallinan, Gao, Wiegreffe, Alon, Dziri, Prabhumoye, Yang, Gupta, Majumder, Hermann, Welleck, 2023) proposed iterative self-refinement without any external signal — the model generates, critiques its own output, then refines based on its own critique. Tested on dialogue response generation, code optimization, math reasoning, sentiment transfer, acronym generation, and constrained generation.

Results: Self-Refine showed improvements on most tasks, but the gains were modest (5-20% relative improvement) and came with 2-3x the token cost. On tasks with clear, objective criteria (like "generate a sentence using all these words"), gains were largest. On open-ended tasks (like dialogue), the model tended to converge on blander, more generic outputs — trading distinctiveness for perceived "safety."

Important caveat from the paper: Self-Refine used GPT-4 as the base model. When replicated with weaker models (GPT-3.5), the self-critique was less reliable and sometimes made outputs worse. The model needs to be "smart enough" to critique effectively, which creates a bootstrap problem.

### CRITIC (Gou et al., 2024)

CRITIC (Gou, Shao, Gong, Shen, Yang, Duan, Chen, 2024) explicitly separates the verification step — the model generates, then uses external tools (search engines, code interpreters, calculators) to verify claims, then revises based on tool output. This is the pattern done right: the "reflection" is actually verification.

CRITIC achieved substantial gains on QA (using search verification), math (using Python execution), and toxicity reduction (using a toxicity classifier). The key finding: **removing the tool verification step and relying only on self-evaluation eliminated most of the gains**. The tools were doing the heavy lifting.

## When Reflection Actually Works

### Pattern 1: Code Generation with Test Execution

The clearest success case. Generate code → run tests → see failures → fix based on failure output → repeat. This works because:
- The verification signal is **objective** (tests pass or fail)
- The signal is **diagnostic** (stack traces tell you what went wrong)
- The signal contains **new information** the model didn't have when generating

AlphaCode (Li et al., 2022), CodeT (Chen, Marobounce, et al., 2023), and Reflexion all demonstrate this. The pattern is: generate many candidates, filter by test execution, refine survivors. This is not reflection — it's generate-and-verify.

Real-world example: Claude Code's agentic loop. When it writes code, runs tests, sees failures, and fixes them, it's not "reflecting" — it's incorporating new information from the test runner. Each iteration adds signal the model didn't have. Contrast this with asking Claude to "review your code and improve it" without running anything — the model just reshuffles the same tokens with the same biases.

### Pattern 2: Math with Ground Truth / Verification

Math reasoning benefits from verification because answers can be checked. Generate a solution → verify each step computationally → fix errors. Works for the same reason as code: objective, external signal.

However, Huang et al. (2023) showed that without ground truth access, LLMs attempting to self-correct math reasoning actually **decreased** accuracy. The model would second-guess correct answers and "fix" them into wrong ones. Self-doubt is not self-improvement.

### Pattern 3: Factual Claims with Search Verification

CRITIC's strongest results came from verifying factual claims against search results. Generate text → extract claims → search for each claim → flag unsupported claims → revise. This works because search provides external evidence. It's fact-checking, not reflection.

### Pattern 4: Safety/Toxicity with Classifiers

Using a separate toxicity classifier or safety model to evaluate outputs, then revising flagged content. Constitutional AI does this implicitly (the constitution acts as the classifier). Works because the evaluator has a different perspective than the generator.

## When Reflection Fails

### The Huang et al. Bombshell (2023)

"Large Language Models Cannot Self-Correct Reasoning Yet" (Huang, Hu, Xia, Chen, He, 2023) is the most important paper in this space. Key findings:

1. **Without external feedback, self-correction hurts performance.** On GSM8K (math), MultiArQ (multi-step QA), and CommonSenseQA, asking GPT-4 to review and correct its own answers consistently decreased accuracy. The model changed correct answers to wrong ones more often than it fixed wrong answers.

2. **Self-consistency provides modest gains, but it's not self-correction.** Generating multiple answers and taking the majority vote (self-consistency, Wang et al., 2023) does improve accuracy. But this is statistical, not reflective — it's the same as running the model 5 times and picking the mode. No "reflection" needed.

3. **The oracle problem.** Most "self-correction" papers that show gains smuggle in external feedback. When Huang et al. controlled for this — removing all external signals and relying purely on the model's ability to evaluate its own reasoning — gains disappeared or reversed.

4. **Confidence calibration is poor.** LLMs are notoriously bad at estimating whether their own answers are correct. They express high confidence on wrong answers and sometimes low confidence on correct ones. This makes self-evaluation unreliable.

### Open-ended tasks get blander

On creative writing, dialogue, and open-ended generation, self-refinement consistently produces blander, more generic outputs. The self-critique penalizes anything unusual or distinctive because "unusual" pattern-matches to "probably wrong." After 2-3 refinement rounds, you get corporate-speak. This is the equivalent of editing a novel by committee — you sand off every edge.

In empirical testing, users consistently preferred the first-generation outputs over self-refined versions for creative tasks. The refinement process optimizes for "nothing obviously wrong" rather than "something distinctively right."

### Same biases, no new information

The fundamental problem: when a model evaluates its own output, it brings the same training data, the same biases, and the same reasoning patterns. If it couldn't see the error while generating, why would it see it while evaluating? This is like proofreading your own essay immediately after writing it — you'll miss the same errors because your brain fills in what it expects to see.

This is particularly damaging for:
- **Factual errors**: if the model's training data says X and X is wrong, self-reflection won't fix it because the model will evaluate X as correct
- **Reasoning errors**: systematic reasoning failures persist across generate-and-evaluate because the same faulty logic applies both times
- **Hallucinations**: the model is equally confident in hallucinated content during both generation and evaluation

## Cost and Latency Analysis

### Token Economics

Each reflection pass roughly doubles the token count:
- **Pass 1 (generate)**: input prompt + output = N tokens
- **Pass 2 (critique)**: input prompt + Pass 1 output + critique prompt + critique output ≈ 2N tokens
- **Pass 3 (refine)**: all of the above + refinement prompt + refined output ≈ 3N tokens

For a typical 2000-token output with a 1000-token prompt:
- Single pass: ~3K total tokens
- One reflection round: ~9K total tokens (3x)
- Two reflection rounds: ~18K total tokens (6x)

At current API pricing (Claude Sonnet: $3/$15 per 1M input/output tokens; GPT-4o: $2.50/$10), a single reflection round roughly triples cost per request. Two rounds increase cost 5-6x.

### Latency

Each reflection round adds a full model round-trip:
- Single pass: 2-5 seconds
- One reflection: 6-15 seconds
- Two reflections: 12-30 seconds

For interactive applications, this latency kills UX. Users waiting 15+ seconds for a response that's marginally better than the 3-second version will not perceive value.

### The Diminishing Returns Curve

Empirical data from Self-Refine and CRITIC shows that most gains come from the first refinement round. The second round captures maybe 20% of the remaining improvement. By round 3, you're paying full cost for negligible gains. Papers typically show 2-3 rounds because more rounds don't help — but production systems sometimes run 5+ rounds "for quality," burning tokens for nothing.

## Practical Patterns That Actually Work

### 1. Generate + Verify (No Reflection Needed)

Generate output → run external verification → accept or reject. No self-critique, no refinement loop. If verification fails, regenerate from scratch rather than trying to patch.

Works for: code generation (run tests), math (compute answer), factual claims (search), structured output (validate JSON schema).

This is cheaper than reflection (you only pay for verification, not critique+refinement) and more reliable (external signals don't share the model's biases).

### 2. Generate + Tool-Check + Revise

Generate output → use tools to check specific aspects → feed tool results back as new context → revise once.

This is CRITIC's pattern, and it works because the tool provides genuinely new information. The key discipline: **one revision round maximum.** Multiple rounds show diminishing returns.

Works for: research synthesis (verify citations), data analysis (run calculations), technical writing (validate code examples by execution).

### 3. Multi-Agent Critique

Use a different model (or the same model with a different system prompt/persona) to critique, then revise. This partially solves the "same biases" problem because the critic has a different perspective.

Critical: the critic model should be specialized. A generic "review this" prompt produces generic feedback. A critic prompted with specific rubric criteria (factual accuracy, code correctness, argument structure) produces actionable feedback.

The debate protocol (Irving et al., 2018) formalized this: two models argue opposing positions, and a judge evaluates. This creates adversarial pressure that pure self-reflection can't generate.

### 4. Best-of-N Sampling

Generate N candidates → score by objective criteria → pick the best. No reflection needed. Often outperforms reflection at similar cost.

Empirically: generating 5 candidates and picking the best (by length, by scorer model, by verification) typically beats 1 candidate refined 5 times. The diversity from independent samples explores the solution space better than iterative refinement, which tends to get stuck in a local optimum.

### 5. Structured Self-Evaluation (Limited Scope)

Ask the model to evaluate specific, concrete aspects of its output: "Does this code handle the edge case where input is empty?" rather than "Is this code good?" Narrow, targeted self-evaluation works because it's closer to verification than introspection.

## Decision Framework: When to Use What

### Use reflection when:
- You have an **external verification signal** (tests, tools, search, classifiers)
- The task has **objective quality criteria** that can be checked
- The first-pass failure mode is **systematic** and **diagnosable** (not random)
- The **cost of failure** justifies the 3x token cost
- You limit to **one refinement round**

### Use better prompts instead when:
- You're considering reflection to fix **formatting issues** (just specify format in the prompt)
- You're considering reflection to improve **tone or style** (specify tone in the prompt)
- You're considering reflection because outputs are **too short or too long** (specify length in the prompt)
- The issue is **consistently reproducible** with the same prompt (it's a prompt problem, not a generation problem)

### Use verification (without reflection) when:
- You can automatically **validate outputs** (JSON schema, test suite, type checker)
- **Binary accept/reject** is sufficient (no need for partial revision)
- **Regeneration is cheap** (short outputs, fast model)
- You want to **minimize latency** (single pass + validation is faster than reflection)

### Never use reflection when:
- You have **no external feedback signal** — self-reflection without new info degrades quality
- The task is **open-ended creative** — reflection produces blander outputs
- You're trying to fix **factual accuracy** with the same model — it has the same wrong information
- **Latency matters** more than marginal quality — users won't wait 15s for a 5% improvement
- You're past the **first refinement round** — diminishing returns make further rounds wasteful

## The Deeper Problem: Reflection as Cargo Cult

Much of the reflection hype in production AI comes from cargo-culting academic papers without understanding what made them work. The academic papers that showed gains had:
1. External verification tools
2. Controlled benchmarks with measurable quality
3. Careful ablation studies showing what worked

Production deployments strip the verification tools (too complex to integrate), skip measurement (no equivalent of HumanEval pass@1 for your customer support bot), and run reflection anyway because "it's best practice."

The result: 3x cost, 3x latency, and no measurable improvement — but it *feels* more rigorous because the system is "checking its work." This is expensive theater.

## What the Literature Actually Shows

### Meta-Analysis Summary

Across 15+ papers on reflection/self-correction:
- **With external tools/verification**: consistent 10-30% improvement on objective benchmarks
- **Without external tools**: 0-5% improvement at best, frequent degradation on reasoning tasks
- **On creative/open-ended tasks**: consistent quality degradation after 1+ rounds
- **Cost multiplier**: 2-6x depending on number of rounds
- **Sweet spot**: exactly 1 round of tool-assisted verification + revision

### Key Papers

1. **Bai et al., 2022** — Constitutional AI. Self-critique against explicit principles. Works because principles = external reference frame.
2. **Shinn et al., 2023** — Reflexion. Verbal RL with episodic memory. Works because environment feedback provides the signal.
3. **Madaan et al., 2023** — Self-Refine. Iterative self-refinement. Modest gains on objective tasks, degradation on open-ended tasks.
4. **Gou et al., 2024** — CRITIC. Tool-assisted verification. Works because tools provide external evidence.
5. **Huang et al., 2023** — Cannot Self-Correct. Definitive negative result: self-correction without external feedback hurts performance.
6. **Wang et al., 2023** — Self-Consistency. Multiple samples + majority vote. Works but isn't self-reflection — it's statistics.
7. **Pan et al., 2024** — Survey of self-correction in LLMs. Confirms that intrinsic self-correction (no external info) rarely works.

## Practical Takeaways for Engineers

1. **Audit your reflection loops.** If there's no external signal in the loop, you're probably burning tokens for nothing. Add a tool, a test, or a classifier — or remove the loop.

2. **Measure before and after.** Set up an eval comparing single-pass vs. reflection outputs. If you can't measure the difference, your users can't perceive it either. Run at least 100 examples; anecdotal "it feels better" is not evidence.

3. **Cap at one round.** If one round of refinement doesn't fix it, a second round won't either. Invest the compute in better prompts or more diverse sampling instead.

4. **Prefer verification over introspection.** Code? Run tests. Facts? Search. Math? Compute. If you can't verify externally, generate multiple candidates and pick the best — it's cheaper and more effective than self-refinement.

5. **Watch for blandification.** If your refined outputs read more generic than your first-pass outputs, your reflection loop is destroying signal. A/B test with real users.

6. **Budget honestly.** Each reflection round ≈ 3x tokens. If you're running 3 rounds, you're paying 10x for ~15% improvement at best. That budget might be better spent on a larger model, better retrieval, or prompt engineering.

## Conclusion: Verification, Not Introspection

The future of quality improvement in LLM systems is not reflection — it's verification infrastructure. Build better test suites, integrate more tools, create specialized evaluator models, invest in retrieval systems that provide ground truth. These give the model **new information** to work with, which is the only thing that actually improves outputs.

Reflection without verification is an LLM talking to itself in a mirror, confidently repeating the same mistakes in slightly different words. It is the most expensive way to achieve nothing in modern AI engineering.
