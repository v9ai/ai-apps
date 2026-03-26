"""
Benchmark: local mlx_lm.server inference

Measures latency, throughput, and output quality across clinical prompts.
Produces a structured JSON report + terminal summary.

Usage:
    # Benchmark local server (default)
    python benchmark_inference.py

    # Custom number of runs
    python benchmark_inference.py --runs 20

    # With concurrent requests (throughput test)
    python benchmark_inference.py --concurrency 8

    # Override model/URL via env
    LLM_BASE_URL=http://localhost:8080 LLM_MODEL=mlx-community/Qwen2.5-7B-Instruct-4bit \\
        python benchmark_inference.py

Requirements:
    pip install httpx rich mlx-lm
    ./serve.sh  # starts mlx_lm.server on port 8080
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import statistics
import time
from dataclasses import dataclass, field
from pathlib import Path

import httpx

try:
    from rich.console import Console
    from rich.table import Table

    RICH = True
except ImportError:
    RICH = False


# ---------------------------------------------------------------------------
# Clinical test prompts (representative of actual usage)
# ---------------------------------------------------------------------------

PROMPTS = [
    {
        "name": "ratio_interpretation",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a clinical biomarker assistant. Explain derived ratios "
                    "using published thresholds. Always cite the source paper. "
                    "Include a physician advisory."
                ),
            },
            {
                "role": "user",
                "content": (
                    "My TG/HDL ratio is 3.8 and my NLR is 4.2. "
                    "What do these values indicate about metabolic and inflammatory risk?"
                ),
            },
        ],
    },
    {
        "name": "trajectory_analysis",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a longitudinal health trajectory analyst. "
                    "Analyze biomarker trends over time using velocity and direction."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Over the last 6 months my fasting glucose went from 95 to 110 mg/dL "
                    "and my TyG index moved from 8.3 to 8.9. My HbA1c is 5.8%. "
                    "What trajectory am I on?"
                ),
            },
        ],
    },
    {
        "name": "short_factual",
        "messages": [
            {
                "role": "user",
                "content": "What is the De Ritis ratio and what are its optimal values?",
            }
        ],
    },
    {
        "name": "safety_boundary",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a clinical biomarker assistant. You must never diagnose "
                    "conditions or recommend treatments. Always include a physician advisory."
                ),
            },
            {
                "role": "user",
                "content": "Based on my blood work, do I have diabetes? Should I start metformin?",
            },
        ],
    },
]


# ---------------------------------------------------------------------------
# Backend configs
# ---------------------------------------------------------------------------

def _local_config() -> dict:
    """Read base_url/model from env (mirrors config.py defaults)."""
    base_url = os.getenv("LLM_BASE_URL", "http://localhost:8080").rstrip("/")
    if not base_url.endswith("/v1"):
        base_url += "/v1"
    return {
        "base_url": base_url,
        "model": os.getenv("LLM_MODEL", "mlx-community/Qwen2.5-7B-Instruct-4bit"),
        "api_key": os.getenv("LLM_API_KEY", "unused"),
    }


BACKEND_CONFIGS: dict[str, dict] = {
    "local": _local_config(),
}


@dataclass
class RunResult:
    backend: str
    prompt_name: str
    latency_ms: float
    prompt_tokens: int
    completion_tokens: int
    tokens_per_second: float
    content_length: int
    finish_reason: str
    error: str | None = None


@dataclass
class BenchmarkReport:
    backend: str
    runs: int
    results: list[RunResult] = field(default_factory=list)

    @property
    def successful(self) -> list[RunResult]:
        return [r for r in self.results if r.error is None]

    @property
    def error_rate(self) -> float:
        if not self.results:
            return 0.0
        return 1.0 - len(self.successful) / len(self.results)

    def latency_stats(self) -> dict:
        latencies = [r.latency_ms for r in self.successful]
        if not latencies:
            return {}
        return {
            "p50_ms": round(statistics.median(latencies), 1),
            "p95_ms": round(sorted(latencies)[int(len(latencies) * 0.95)], 1),
            "p99_ms": round(sorted(latencies)[int(len(latencies) * 0.99)], 1),
            "mean_ms": round(statistics.mean(latencies), 1),
            "stdev_ms": round(statistics.stdev(latencies), 1) if len(latencies) > 1 else 0,
            "min_ms": round(min(latencies), 1),
            "max_ms": round(max(latencies), 1),
        }

    def throughput_stats(self) -> dict:
        tps = [r.tokens_per_second for r in self.successful if r.tokens_per_second > 0]
        if not tps:
            return {}
        return {
            "mean_tok_per_sec": round(statistics.mean(tps), 1),
            "median_tok_per_sec": round(statistics.median(tps), 1),
        }


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------


async def run_single(
    client: httpx.AsyncClient,
    config: dict,
    prompt: dict,
    backend_name: str,
) -> RunResult:
    """Execute a single inference request and measure performance."""
    t0 = time.perf_counter()
    try:
        resp = await client.post(
            f"{config['base_url']}/chat/completions",
            json={
                "model": config["model"],
                "messages": prompt["messages"],
                "temperature": 0.3,
                "max_tokens": 1024,
                "stream": False,
            },
            headers={
                "Authorization": f"Bearer {config.get('api_key', '')}",
                "Content-Type": "application/json",
            },
            timeout=120.0,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        latency = (time.perf_counter() - t0) * 1000
        return RunResult(
            backend=backend_name,
            prompt_name=prompt["name"],
            latency_ms=latency,
            prompt_tokens=0,
            completion_tokens=0,
            tokens_per_second=0,
            content_length=0,
            finish_reason="error",
            error=str(e),
        )

    latency = (time.perf_counter() - t0) * 1000
    usage = data.get("usage", {})
    completion_tokens = usage.get("completion_tokens", 0)
    content = data["choices"][0]["message"]["content"]
    tps = (completion_tokens / (latency / 1000)) if latency > 0 and completion_tokens > 0 else 0

    return RunResult(
        backend=backend_name,
        prompt_name=prompt["name"],
        latency_ms=latency,
        prompt_tokens=usage.get("prompt_tokens", 0),
        completion_tokens=completion_tokens,
        tokens_per_second=tps,
        content_length=len(content),
        finish_reason=data["choices"][0].get("finish_reason", "unknown"),
    )


async def benchmark_backend(
    backend_name: str,
    runs: int = 10,
    concurrency: int = 1,
) -> BenchmarkReport:
    """Run full benchmark suite for a single backend."""
    config = BACKEND_CONFIGS[backend_name].copy()

    # Resolve API key from env
    if "api_key_env" in config:
        key = os.getenv(config.pop("api_key_env"), "")
        config["api_key"] = key

    report = BenchmarkReport(backend=backend_name, runs=runs)

    async with httpx.AsyncClient() as client:
        for run_idx in range(runs):
            if concurrency == 1:
                # Sequential: one prompt at a time
                for prompt in PROMPTS:
                    result = await run_single(client, config, prompt, backend_name)
                    report.results.append(result)
                    status = "OK" if result.error is None else f"ERR: {result.error[:50]}"
                    print(
                        f"  [{backend_name}] run {run_idx + 1}/{runs} "
                        f"| {prompt['name']:25s} "
                        f"| {result.latency_ms:7.0f}ms "
                        f"| {result.tokens_per_second:5.0f} tok/s "
                        f"| {status}"
                    )
            else:
                # Concurrent: fire all prompts at once
                tasks = [
                    run_single(client, config, prompt, backend_name)
                    for prompt in PROMPTS
                ]
                results = await asyncio.gather(*tasks)
                for r in results:
                    report.results.append(r)
                print(
                    f"  [{backend_name}] run {run_idx + 1}/{runs} "
                    f"| concurrent batch of {len(PROMPTS)} "
                    f"| mean {statistics.mean(r.latency_ms for r in results):.0f}ms"
                )

    return report


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def print_report(reports: list[BenchmarkReport]):
    """Print comparison table."""
    if RICH:
        console = Console()
        table = Table(title="Inference Benchmark Results", show_lines=True)
        table.add_column("Metric", style="bold")
        for r in reports:
            table.add_column(r.backend.upper(), justify="right")

        # Latency
        stats = [r.latency_stats() for r in reports]
        for metric in ["p50_ms", "p95_ms", "p99_ms", "mean_ms", "stdev_ms"]:
            table.add_row(
                metric.replace("_", " ").title(),
                *[str(s.get(metric, "N/A")) for s in stats],
            )

        # Throughput
        tp = [r.throughput_stats() for r in reports]
        for metric in ["mean_tok_per_sec", "median_tok_per_sec"]:
            table.add_row(
                metric.replace("_", " ").title(),
                *[str(t.get(metric, "N/A")) for t in tp],
            )

        # Error rate
        table.add_row(
            "Error Rate",
            *[f"{r.error_rate:.1%}" for r in reports],
        )

        table.add_row(
            "Total Requests",
            *[str(len(r.results)) for r in reports],
        )

        console.print(table)
    else:
        print("\n=== Benchmark Results ===")
        for r in reports:
            print(f"\n--- {r.backend.upper()} ---")
            print(f"  Latency: {r.latency_stats()}")
            print(f"  Throughput: {r.throughput_stats()}")
            print(f"  Error rate: {r.error_rate:.1%}")
            print(f"  Total requests: {len(r.results)}")


def save_report(reports: list[BenchmarkReport], output_path: str):
    """Save detailed JSON report."""
    data = {}
    for r in reports:
        data[r.backend] = {
            "runs": r.runs,
            "latency": r.latency_stats(),
            "throughput": r.throughput_stats(),
            "error_rate": r.error_rate,
            "total_requests": len(r.results),
            "results": [
                {
                    "prompt": res.prompt_name,
                    "latency_ms": round(res.latency_ms, 1),
                    "prompt_tokens": res.prompt_tokens,
                    "completion_tokens": res.completion_tokens,
                    "tokens_per_second": round(res.tokens_per_second, 1),
                    "finish_reason": res.finish_reason,
                    "error": res.error,
                }
                for res in r.results
            ],
        }

    Path(output_path).write_text(json.dumps(data, indent=2))
    print(f"\nDetailed report saved to {output_path}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

async def main():
    parser = argparse.ArgumentParser(description="Benchmark LLM inference backends")
    parser.add_argument(
        "--backends",
        nargs="+",
        default=["local"],
        choices=["local"],
        help="Backends to benchmark (currently: local mlx_lm.server)",
    )
    parser.add_argument("--runs", type=int, default=5, help="Number of runs per backend")
    parser.add_argument("--concurrency", type=int, default=1, help="Concurrent requests per run")
    parser.add_argument("--output", default="benchmark_results.json", help="Output JSON path")
    args = parser.parse_args()

    print(f"Benchmarking: {', '.join(args.backends)}")
    print(f"Runs: {args.runs} | Concurrency: {args.concurrency}")
    print(f"Prompts per run: {len(PROMPTS)}\n")

    reports = []
    for backend in args.backends:
        print(f"\n{'='*60}")
        print(f"  Backend: {backend.upper()}")
        print(f"{'='*60}")
        report = await benchmark_backend(backend, runs=args.runs, concurrency=args.concurrency)
        reports.append(report)

    print_report(reports)
    save_report(reports, args.output)


if __name__ == "__main__":
    asyncio.run(main())
