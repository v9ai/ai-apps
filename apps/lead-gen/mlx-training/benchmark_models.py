"""Benchmark Qwen3 model sizes for B2B outreach email generation.

Compares JSON validity, speed, subject/body compliance, and personalization
across model sizes to find the best quality/speed tradeoff on M1 MacBook Pro.

Usage:
  python3 mlx-training/benchmark_models.py
  python3 mlx-training/benchmark_models.py --models Qwen3-0.6B-4bit,Qwen3-1.7B-4bit
  python3 mlx-training/benchmark_models.py --max-tokens 400 --limit 10
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

# ── Constants ────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = (
    "You write B2B outreach emails for Vadim Nicolai, Senior Software Engineer "
    "(10+ years: React, TypeScript, AI/ML, Rust, Node.js, GraphQL). "
    "Never reference crypto, blockchain, trading, or Web3. "
    'Output ONLY valid JSON: {"subject": "...", "body": "..."}'
)

MODELS = [
    {"name": "Qwen3-0.6B-4bit", "model_id": "mlx-community/Qwen3-0.6B-4bit", "adapter": None},
    {"name": "Qwen3-1.7B-4bit", "model_id": "mlx-community/Qwen3-1.7B-4bit", "adapter": None},
    {"name": "Qwen3-1.7B-4bit+LoRA", "model_id": "mlx-community/Qwen3-1.7B-4bit", "adapter": "mlx-training/models/outreach-email"},
    {"name": "Qwen3-3B-4bit", "model_id": "mlx-community/Qwen3-3B-4bit", "adapter": None},
]

# Word count ranges by email type
WORD_LIMITS = {
    "initial": (80, 220),
    "followup_1": (60, 150),
    "followup_2": (50, 130),
    "followup_3": (35, 100),
}

# ── 20 fixed test prompts ────────────────────────────────────────────────────

TEST_PROMPTS = [
    # 5x initial
    {
        "email_type": "initial",
        "prompt": (
            "Write a initial outreach email.\n\n"
            "RECIPIENT:\n- Name: Sarah\n- Position: CTO\n- Department: Engineering\n\n"
            "COMPANY:\n- Name: NeuralScale\n- Industry: AI/ML Platform\n"
            "- Description: Building scalable ML infrastructure for enterprise. GPU cluster orchestration and model serving.\n"
            "- AI tier: AI-native\n- Services: ML Infrastructure, Model Serving, GPU Orchestration\n\n"
            "INSTRUCTIONS:\n- Cold outreach to explore engineering opportunities\n"
            "- Highlight relevant experience only\n- 100-180 words, one clear CTA\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
    {
        "email_type": "initial",
        "prompt": (
            "Write a initial outreach email.\n\n"
            "RECIPIENT:\n- Name: Michael\n- Position: VP of Engineering\n- Department: Engineering\n\n"
            "COMPANY:\n- Name: FinTechFlow\n- Industry: Fintech\n"
            "- Description: Payment processing and financial APIs for developers. PCI-compliant infrastructure.\n"
            "- Services: Payment Processing, Financial APIs, Compliance\n\n"
            "INSTRUCTIONS:\n- Cold outreach to explore engineering opportunities\n"
            "- Highlight relevant experience only\n- 100-180 words, one clear CTA\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
    {
        "email_type": "initial",
        "prompt": (
            "Write a initial outreach email.\n\n"
            "RECIPIENT:\n- Name: Lisa\n- Position: Head of AI\n- Department: AI/ML\n\n"
            "COMPANY:\n- Name: HealthAI\n- Industry: Healthtech\n"
            "- Description: AI-powered diagnostic tools for radiology. Medical image analysis using deep learning.\n"
            "- AI tier: AI-native\n- Services: Medical AI, Image Analysis, Diagnostics\n\n"
            "INSTRUCTIONS:\n- Cold outreach to explore engineering opportunities\n"
            "- Highlight relevant experience only\n- 100-180 words, one clear CTA\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
    {
        "email_type": "initial",
        "prompt": (
            "Write a initial outreach email.\n\n"
            "RECIPIENT:\n- Name: James\n- Position: Engineering Manager\n- Department: Engineering\n\n"
            "COMPANY:\n- Name: EdTechPro\n- Industry: Edtech\n"
            "- Description: Online learning platform with AI tutoring. Adaptive learning paths.\n"
            "- AI tier: AI-first\n- Services: AI Tutoring, Adaptive Learning, Content Platform\n\n"
            "INSTRUCTIONS:\n- Cold outreach to explore engineering opportunities\n"
            "- Highlight relevant experience only\n- 100-180 words, one clear CTA\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
    {
        "email_type": "initial",
        "prompt": (
            "Write a initial outreach email.\n\n"
            "RECIPIENT:\n- Name: Tom\n- Position: Founder & CEO\n- Department: Executive\n\n"
            "COMPANY:\n- Name: LogiTrack\n- Industry: Logistics\n"
            "- Description: Supply chain optimization platform. Route planning and demand forecasting.\n"
            "- AI tier: AI-first\n- Services: Supply Chain, Route Optimization, Demand Forecasting\n\n"
            "INSTRUCTIONS:\n- Cold outreach to explore engineering opportunities\n"
            "- Highlight relevant experience only\n- 100-180 words, one clear CTA\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
    # 5x followup_1
    {
        "email_type": "followup_1",
        "prompt": (
            "Write a first follow-up email.\n\n"
            "RECIPIENT:\n- Name: Emily\n- Position: Tech Lead\n- Department: Engineering\n\n"
            "COMPANY:\n- Name: DevToolsHQ\n- Industry: Developer Tools\n"
            "- Description: Code review automation and CI/CD platform. AI-assisted code analysis.\n"
            "- AI tier: AI-first\n- Services: Code Review, CI/CD, Static Analysis\n\n"
            "INSTRUCTIONS:\n- First follow-up, reference previous email\n"
            "- Acknowledge they may be busy\n- 80-120 words, one question or CTA\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
    {
        "email_type": "followup_1",
        "prompt": (
            "Write a first follow-up email.\n\n"
            "RECIPIENT:\n- Name: David\n- Position: Director of Engineering\n- Department: Engineering\n\n"
            "COMPANY:\n- Name: SecureNet\n- Industry: Cybersecurity\n"
            "- Description: Threat detection platform using behavioral analytics. Real-time security monitoring.\n"
            "- AI tier: AI-first\n- Services: Threat Detection, Security Analytics, SIEM\n\n"
            "INSTRUCTIONS:\n- First follow-up, reference previous email\n"
            "- Acknowledge they may be busy\n- 80-120 words, one question or CTA\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
    {
        "email_type": "followup_1",
        "prompt": (
            "Write a first follow-up email.\n\n"
            "RECIPIENT:\n- Name: Anna\n- Position: Head of Product Engineering\n- Department: Product\n\n"
            "COMPANY:\n- Name: EcommerceOS\n- Industry: E-commerce\n"
            "- Description: Headless commerce platform with React storefronts. Personalization engine.\n"
            "- AI tier: AI-first\n- Services: E-commerce Platform, Personalization, React Storefronts\n\n"
            "INSTRUCTIONS:\n- First follow-up, reference previous email\n"
            "- Acknowledge they may be busy\n- 80-120 words, one question or CTA\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
    {
        "email_type": "followup_1",
        "prompt": (
            "Write a first follow-up email.\n\n"
            "RECIPIENT:\n- Name: Priya\n- Position: Director of Data Science\n- Department: Data Science\n\n"
            "COMPANY:\n- Name: RoboticaLabs\n- Industry: Robotics\n"
            "- Description: Autonomous warehouse robotics. Computer vision and path planning.\n"
            "- AI tier: AI-native\n- Services: Warehouse Automation, Computer Vision, Path Planning\n\n"
            "INSTRUCTIONS:\n- First follow-up, reference previous email\n"
            "- Acknowledge they may be busy\n- 80-120 words, one question or CTA\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
    {
        "email_type": "followup_1",
        "prompt": (
            "Write a first follow-up email.\n\n"
            "RECIPIENT:\n- Name: Wei\n- Position: Engineering Manager (ML)\n- Department: AI/ML\n\n"
            "COMPANY:\n- Name: GreenEnergy AI\n- Industry: Cleantech\n"
            "- Description: AI optimization for renewable energy grids. Predictive maintenance for solar/wind.\n"
            "- AI tier: AI-native\n- Services: Energy Optimization, Predictive Maintenance, Grid Management\n\n"
            "INSTRUCTIONS:\n- First follow-up, reference previous email\n"
            "- Acknowledge they may be busy\n- 80-120 words, one question or CTA\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
    # 5x followup_2
    {
        "email_type": "followup_2",
        "prompt": (
            "Write a second follow-up email.\n\n"
            "RECIPIENT:\n- Name: Robert\n- Position: Senior Technical Recruiter\n- Department: Talent\n\n"
            "COMPANY:\n- Name: TrustGuard\n- Industry: Fraud Detection\n"
            "- Description: Transaction fraud detection with graph neural networks. Real-time risk scoring API.\n"
            "- AI tier: AI-native\n- Services: Fraud Detection, Graph Neural Networks, Risk Scoring\n\n"
            "INSTRUCTIONS:\n- Second follow-up, brief and respectful\n"
            "- Offer flexibility on timing\n- 70-100 words\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
    {
        "email_type": "followup_2",
        "prompt": (
            "Write a second follow-up email.\n\n"
            "RECIPIENT:\n- Name: Maria\n- Position: VP of Product\n- Department: Product\n\n"
            "COMPANY:\n- Name: LingvoLab\n- Industry: NLP Research\n"
            "- Description: Large language model fine-tuning and evaluation platform. Multilingual NLP tooling.\n"
            "- AI tier: AI-native\n- Services: LLM Fine-tuning, NLP Evaluation, Multilingual Models\n\n"
            "INSTRUCTIONS:\n- Second follow-up, brief and respectful\n"
            "- Offer flexibility on timing\n- 70-100 words\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
    {
        "email_type": "followup_2",
        "prompt": (
            "Write a second follow-up email.\n\n"
            "RECIPIENT:\n- Name: Rachel\n- Position: Head of Platform Engineering\n- Department: Platform\n\n"
            "COMPANY:\n- Name: CodePilotAI\n- Industry: AI Developer Tools\n"
            "- Description: AI code generation and refactoring tools. Context-aware code completion engine.\n"
            "- AI tier: AI-native\n- Services: Code Generation, Refactoring AI, Code Completion\n\n"
            "INSTRUCTIONS:\n- Second follow-up, brief and respectful\n"
            "- Offer flexibility on timing\n- 70-100 words\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
    {
        "email_type": "followup_2",
        "prompt": (
            "Write a second follow-up email.\n\n"
            "RECIPIENT:\n- Name: Alex\n- Position: Staff Engineer\n- Department: Engineering\n\n"
            "COMPANY:\n- Name: NeuroSearch\n- Industry: Enterprise Search\n"
            "- Description: Semantic enterprise search powered by embeddings. Knowledge graph construction.\n"
            "- AI tier: AI-native\n- Services: Semantic Search, Knowledge Graphs, Embeddings\n\n"
            "INSTRUCTIONS:\n- Second follow-up, brief and respectful\n"
            "- Offer flexibility on timing\n- 70-100 words\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
    {
        "email_type": "followup_2",
        "prompt": (
            "Write a second follow-up email.\n\n"
            "RECIPIENT:\n- Name: Carlos\n- Position: Senior ML Engineer\n- Department: AI/ML\n\n"
            "COMPANY:\n- Name: BioCompute\n- Industry: Biotech\n"
            "- Description: Computational biology platform. Protein structure prediction and drug discovery.\n"
            "- AI tier: AI-native\n- Services: Computational Biology, Drug Discovery, Protein Prediction\n\n"
            "INSTRUCTIONS:\n- Second follow-up, brief and respectful\n"
            "- Offer flexibility on timing\n- 70-100 words\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
    # 5x followup_3
    {
        "email_type": "followup_3",
        "prompt": (
            "Write a final follow-up email.\n\n"
            "RECIPIENT:\n- Name: Chris\n- Position: Head of ML Engineering\n- Department: AI/ML\n\n"
            "COMPANY:\n- Name: WaymakersAI\n- Industry: Autonomous Vehicles\n"
            "- Description: Self-driving perception and planning stack. LiDAR fusion and real-time decision systems.\n"
            "- AI tier: AI-native\n- Services: Perception Stack, LiDAR Fusion, Motion Planning\n\n"
            "INSTRUCTIONS:\n- Final follow-up, gracious close\n"
            "- Leave door open for future\n- 50-80 words\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
    {
        "email_type": "followup_3",
        "prompt": (
            "Write a final follow-up email.\n\n"
            "RECIPIENT:\n- Name: Nina\n- Position: Principal Engineer\n- Department: Engineering\n\n"
            "COMPANY:\n- Name: FactoryMind\n- Industry: Industrial IoT\n"
            "- Description: Smart factory monitoring with anomaly detection. Digital twin simulation for manufacturing.\n"
            "- AI tier: AI-native\n- Services: Anomaly Detection, Digital Twins, Smart Factory\n\n"
            "INSTRUCTIONS:\n- Final follow-up, gracious close\n"
            "- Leave door open for future\n- 50-80 words\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
    {
        "email_type": "followup_3",
        "prompt": (
            "Write a final follow-up email.\n\n"
            "RECIPIENT:\n- Name: Jordan\n- Position: Engineering Lead\n- Department: Engineering\n\n"
            "COMPANY:\n- Name: VoiceLayer\n- Industry: Conversational AI\n"
            "- Description: Voice assistant platform for customer service. ASR and dialog management.\n"
            "- AI tier: AI-native\n- Services: Voice Assistants, ASR, Dialog Management\n\n"
            "INSTRUCTIONS:\n- Final follow-up, gracious close\n"
            "- Leave door open for future\n- 50-80 words\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
    {
        "email_type": "followup_3",
        "prompt": (
            "Write a final follow-up email.\n\n"
            "RECIPIENT:\n- Name: Sandra\n- Position: Chief AI Officer\n- Department: AI/ML\n\n"
            "COMPANY:\n- Name: SafeHarbor\n- Industry: Privacy Tech\n"
            "- Description: Privacy-preserving ML with differential privacy and federated learning. GDPR compliance tools.\n"
            "- AI tier: AI-native\n- Services: Differential Privacy, Federated Learning, GDPR Compliance\n\n"
            "INSTRUCTIONS:\n- Final follow-up, gracious close\n"
            "- Leave door open for future\n- 50-80 words\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
    {
        "email_type": "followup_3",
        "prompt": (
            "Write a final follow-up email.\n\n"
            "RECIPIENT:\n- Name: Derek\n- Position: Head of Backend Engineering\n- Department: Engineering\n\n"
            "COMPANY:\n- Name: PixelFlow\n- Industry: Computer Vision\n"
            "- Description: Visual inspection and quality control for manufacturing. Custom model training platform.\n"
            "- AI tier: AI-native\n- Services: Visual Inspection, Quality Control, Model Training\n\n"
            "INSTRUCTIONS:\n- Final follow-up, gracious close\n"
            "- Leave door open for future\n- 50-80 words\n"
            "- Use {{name}} placeholder for recipient name"
        ),
    },
]


# ── Scoring ──────────────────────────────────────────────────────────────────


def parse_json_output(text: str) -> dict | None:
    """Extract JSON from model output, handling think tags and fences."""
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    try:
        data = json.loads(text)
        if isinstance(data, dict) and "subject" in data and "body" in data:
            return data
    except json.JSONDecodeError:
        pass
    return None


def check_subject(subject: str) -> bool:
    """Subject between 10-70 chars, not ALL CAPS."""
    return 10 <= len(subject) <= 70 and not subject.isupper()


def check_word_count(body: str, email_type: str) -> bool:
    """Body word count within expected range for email type."""
    wc = len(body.split())
    lo, hi = WORD_LIMITS.get(email_type, (50, 250))
    return lo <= wc <= hi


def check_personalization(body: str) -> bool:
    """Body contains {{name}} placeholder."""
    return "{{name}}" in body


# ── Benchmark runner ─────────────────────────────────────────────────────────


def run_benchmark(model_cfg: dict, prompts: list[dict], max_tokens: int, verbose: bool) -> dict:
    """Run all test prompts against one model, return aggregate metrics."""
    import mlx_lm

    name = model_cfg["name"]
    model_id = model_cfg["model_id"]
    adapter = model_cfg["adapter"]

    print(f"\n{'=' * 60}")
    print(f"  Benchmarking: {name}")
    print(f"  Model: {model_id}" + (f" + adapter: {adapter}" if adapter else ""))
    print(f"{'=' * 60}")

    # Load model (supports local paths and HF repo IDs)
    try:
        from hub import resolve_adapter
        resolved_adapter = resolve_adapter(adapter) if adapter else None
        if resolved_adapter:
            model, tokenizer = mlx_lm.load(model_id, adapter_path=resolved_adapter)
        else:
            if adapter:
                print(f"  Warning: adapter not found at {adapter}, using base model")
            model, tokenizer = mlx_lm.load(model_id)
    except Exception as e:
        print(f"  SKIPPED: could not load model — {e}")
        return {"name": name, "skipped": True, "error": str(e)}

    results = []
    total_tokens = 0
    total_time = 0.0

    for i, test in enumerate(prompts):
        email_type = test["email_type"]
        user_prompt = test["prompt"]

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        prompt_text = tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )

        # Timed generation
        t0 = time.perf_counter()
        output = mlx_lm.generate(
            model, tokenizer, prompt=prompt_text, max_tokens=max_tokens
        )
        t1 = time.perf_counter()

        elapsed = t1 - t0
        # Estimate token count from output (tokenize the output)
        output_tokens = len(tokenizer.encode(output))
        total_tokens += output_tokens
        total_time += elapsed

        # Score
        parsed = parse_json_output(output)
        json_valid = parsed is not None
        subject_ok = check_subject(parsed["subject"]) if parsed else False
        wc_ok = check_word_count(parsed["body"], email_type) if parsed else False
        pers_ok = check_personalization(parsed["body"]) if parsed else False

        tok_per_sec = output_tokens / elapsed if elapsed > 0 else 0

        result = {
            "index": i,
            "email_type": email_type,
            "json_valid": json_valid,
            "subject_ok": subject_ok,
            "word_count_ok": wc_ok,
            "personalization": pers_ok,
            "tokens": output_tokens,
            "elapsed_s": round(elapsed, 3),
            "tok_per_sec": round(tok_per_sec, 1),
        }
        if parsed:
            result["subject"] = parsed["subject"]
            result["body_words"] = len(parsed["body"].split())
        else:
            result["raw_preview"] = output[:150]

        results.append(result)

        status = "OK" if json_valid else "FAIL"
        if verbose:
            print(f"  [{i+1:2d}/{len(prompts)}] {status} type={email_type} "
                  f"tok={output_tokens} {tok_per_sec:.0f}t/s")

    # Aggregate
    n = len(results)
    json_pct = sum(1 for r in results if r["json_valid"]) / n * 100 if n else 0
    subj_pct = sum(1 for r in results if r["subject_ok"]) / n * 100 if n else 0
    wc_pct = sum(1 for r in results if r["word_count_ok"]) / n * 100 if n else 0
    pers_pct = sum(1 for r in results if r["personalization"]) / n * 100 if n else 0
    avg_tok_s = total_tokens / total_time if total_time > 0 else 0
    avg_ms_tok = (total_time / total_tokens * 1000) if total_tokens > 0 else 0

    return {
        "name": name,
        "model_id": model_id,
        "adapter": adapter,
        "skipped": False,
        "n": n,
        "json_valid_pct": round(json_pct, 1),
        "subject_pct": round(subj_pct, 1),
        "word_count_pct": round(wc_pct, 1),
        "personalization_pct": round(pers_pct, 1),
        "avg_tok_s": round(avg_tok_s, 1),
        "avg_ms_tok": round(avg_ms_tok, 1),
        "total_tokens": total_tokens,
        "total_time_s": round(total_time, 2),
        "results": results,
    }


# ── Output ───────────────────────────────────────────────────────────────────


def print_table(summaries: list[dict]):
    """Print ASCII comparison table."""
    print("\n" + "=" * 90)
    print("  BENCHMARK RESULTS")
    print("=" * 90)

    header = (
        f"{'Model':<25s} | {'JSON%':>6s} | {'Tok/s':>7s} | {'ms/tok':>6s} | "
        f"{'Subj%':>6s} | {'WC%':>6s} | {'Pers%':>6s}"
    )
    print(header)
    print("-" * 90)

    for s in summaries:
        if s.get("skipped"):
            print(f"{s['name']:<25s} | {'SKIPPED':^52s}")
            continue
        print(
            f"{s['name']:<25s} | {s['json_valid_pct']:5.1f}% | "
            f"{s['avg_tok_s']:7.1f} | {s['avg_ms_tok']:6.1f} | "
            f"{s['subject_pct']:5.1f}% | {s['word_count_pct']:5.1f}% | "
            f"{s['personalization_pct']:5.1f}%"
        )
    print("=" * 90)


def compute_recommendation(summaries: list[dict]) -> str | None:
    """Score = json% * 0.5 + wc% * 0.3 + speed_norm * 0.2. Return best name."""
    active = [s for s in summaries if not s.get("skipped")]
    if not active:
        return None

    # Normalize speed: fastest ms/tok gets 100, others proportionally
    ms_values = [s["avg_ms_tok"] for s in active if s["avg_ms_tok"] > 0]
    if not ms_values:
        return None
    min_ms = min(ms_values)

    best_name = None
    best_score = -1.0

    for s in active:
        ms = s["avg_ms_tok"] if s["avg_ms_tok"] > 0 else 9999
        speed_norm = (min_ms / ms) * 100  # 100 for fastest, lower for slower
        score = (s["json_valid_pct"] * 0.5
                 + s["word_count_pct"] * 0.3
                 + speed_norm * 0.2)
        s["_score"] = round(score, 1)
        if score > best_score:
            best_score = score
            best_name = s["name"]

    return best_name


def write_results(summaries: list[dict], out_path: Path):
    """Write full benchmark results to JSON."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(summaries, f, indent=2, default=str)
    print(f"\nResults written to {out_path}")


# ── Main ─────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Benchmark Qwen3 model sizes for email generation")
    parser.add_argument("--models", type=str, help="Comma-separated model names to test (e.g. Qwen3-0.6B-4bit,Qwen3-1.7B-4bit)")
    parser.add_argument("--max-tokens", type=int, default=400, help="Max tokens per generation (default: 400)")
    parser.add_argument("--limit", type=int, help="Limit number of test prompts (default: all 20)")
    parser.add_argument("--verbose", action="store_true", help="Show per-example results")
    args = parser.parse_args()

    # Filter models if requested
    models = MODELS
    if args.models:
        requested = {m.strip() for m in args.models.split(",")}
        models = [m for m in MODELS if m["name"] in requested]
        if not models:
            print(f"ERROR: no matching models. Available: {', '.join(m['name'] for m in MODELS)}", file=sys.stderr)
            sys.exit(1)

    # Select prompts
    prompts = TEST_PROMPTS
    if args.limit:
        prompts = prompts[:args.limit]

    print(f"Benchmarking {len(models)} model(s) on {len(prompts)} test prompts")
    print(f"Max tokens: {args.max_tokens}")

    summaries = []
    for model_cfg in models:
        summary = run_benchmark(model_cfg, prompts, args.max_tokens, args.verbose)
        summaries.append(summary)

    # Print table
    print_table(summaries)

    # Recommendation
    best = compute_recommendation(summaries)
    if best:
        s = next(s for s in summaries if s["name"] == best)
        print(f"\nRecommended: {best} — best quality/speed tradeoff "
              f"(JSON: {s['json_valid_pct']:.0f}%, speed: {s['avg_tok_s']:.0f} tok/s, "
              f"score: {s.get('_score', 0):.1f})")

    # Write JSON results
    out_path = Path("mlx-training/benchmark_results.json")
    write_results(summaries, out_path)


if __name__ == "__main__":
    main()
