# Brief Stress-Tester

An adversarial AI pipeline that stress-tests legal briefs using a multi-agent debate: an Attacker finds weaknesses, a Defender rebuts them, and a Judge renders findings with severity scores and actionable fixes.

## Architecture

```mermaid
graph LR
    U[User] -->|Upload brief| S[Session]
    S --> A[Attacker - DeepSeek R1]
    A -->|attacks| D[Defender - Qwen Plus]
    D -->|rebuttals| J[Judge - DeepSeek Chat]
    J -->|findings| DB[(Supabase)]
    DB --> UI[Live SSE Feed]
    S -.->|rounds 1..N| A
    J --> CV[Citation Verifier - DeepSeek R1]
    J --> JE[Jurisdiction Expert - DeepSeek R1]
    CV & JE --> BR[Brief Rewriter - Qwen Plus]
```

## Why These Models

| Agent | Model | Rationale |
|-------|-------|-----------|
| Attacker | DeepSeek R1 (reasoner) | Extended chain-of-thought reasoning excels at finding subtle logical, factual, and legal weaknesses in arguments |
| Defender | Qwen Plus | Broad training corpus and strong instruction-following for mounting comprehensive legal defenses with citations |
| Judge | DeepSeek Chat | Balanced, fast inference for weighing both sides impartially and producing structured severity assessments |
| Citation Verifier | DeepSeek R1 (reasoner) | Deep reasoning catches mischaracterized holdings, overruled cases, and fabricated citations |
| Jurisdiction Expert | DeepSeek R1 (reasoner) | Chain-of-thought reasoning maps precedent hierarchies and jurisdiction-specific procedural rules |
| Brief Rewriter | Qwen Plus | Strong instruction-following produces precise, minimal-intervention revisions with tracked changes |

## Evaluation Framework

The project uses [Promptfoo](https://promptfoo.dev) for systematic prompt evaluation:

- **Attacker evals** -- Verify attacks are exhaustive, correctly typed, and cite real legal principles
- **Defender evals** -- Verify rebuttals address each attack, cite valid authority, and self-assess strength honestly
- **Judge evals** -- Verify findings are balanced, severity is calibrated, and fixes are actionable
- **Citation Verifier evals** -- Verify fabrication detection, overruled case identification, and mischaracterization catching
- **Jurisdiction Expert evals** -- Verify jurisdiction-specific analysis depth, binding authority identification, and procedural compliance checking
- **Brief Rewriter evals** -- Verify revisions are legally accurate, minimal-intervention, and address all findings
- **Red-team evals** -- Test prompt injection resistance and adversarial robustness
- **Consistency evals** -- Verify same brief produces consistent scores across runs

Run evals: `npm run test:prompts:all`

## Setup

1. Clone the repo and install dependencies:
   ```bash
   pnpm install
   ```

2. Copy environment variables:
   ```bash
   cp env.example .env.local
   ```

3. Fill in your `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   DEEPSEEK_API_KEY=...
   DASHSCOPE_API_KEY=...
   ```

4. Run Supabase migrations:
   ```bash
   npx supabase db push
   ```

5. Start the dev server:
   ```bash
   pnpm dev
   ```

## Testing

```bash
# Unit tests
npm test

# Prompt evals
npm run test:prompts:all
```

## What I Would Build Next

- **RAG with legal embeddings** -- Embed case law databases (CourtListener, Casetext) to ground attacker evidence and defender citations in real precedent rather than model knowledge
- ~~**Citation verification**~~ -- DONE: Citation Verifier agent detects fabricated citations, mischaracterized holdings, and overruled cases
- ~~**Brief diff mode**~~ -- DONE: Brief Rewriter agent generates revised briefs with tracked changes and finding references
- ~~**Multi-jurisdiction comparison**~~ -- DONE: Jurisdiction Expert agent performs deep jurisdiction-specific analysis with binding authority gaps and procedural compliance checking
- **Collaborative sessions** -- Allow multiple attorneys to view the same stress test in real-time, annotate findings, and mark issues as resolved
