"""Generate job opportunity briefs using local Qwen via MLX.

Loads Qwen on-demand to avoid competing with embedding model for RAM.
On M1 16GB: ~15-25 tok/s with Qwen3-4B-Instruct-4bit.

Usage:
    from src.vectordb.briefer import generate_brief, generate_briefs

    brief = generate_brief(job_text, profile_text)
    briefs = generate_briefs(jobs[:3])  # batch top 3
"""

from __future__ import annotations

from dataclasses import dataclass

from .search import DEFAULT_PROFILE

# Model to use — 4B fits comfortably on M1 16GB alongside embeddings
MODEL_ID = "mlx-community/Qwen3-4B-Instruct-2507-4bit"
FALLBACK_MODEL_ID = "mlx-community/Qwen2.5-3B-Instruct-4bit"

_model = None
_tokenizer = None
_active_model_id = None


def _load_model():
    """Lazy-load Qwen model. Tries primary, falls back to alternate."""
    global _model, _tokenizer, _active_model_id

    if _model is not None:
        return _model, _tokenizer

    from mlx_lm import load

    for model_id in [MODEL_ID, FALLBACK_MODEL_ID]:
        try:
            print(f"Loading {model_id}...")
            _model, _tokenizer = load(model_id)
            _active_model_id = model_id
            print(f"Loaded {model_id}")
            return _model, _tokenizer
        except Exception as e:
            print(f"  Failed to load {model_id}: {e}")
            continue

    raise RuntimeError(
        f"Could not load any generation model. "
        f"Install with: pip install mlx-lm && python -c \"from mlx_lm import load; load('{MODEL_ID}')\""
    )


@dataclass
class JobBrief:
    job_title: str
    company: str
    brief: str
    tokens: int
    elapsed_secs: float

    @property
    def tokens_per_sec(self) -> float:
        return self.tokens / self.elapsed_secs if self.elapsed_secs > 0 else 0


def generate_brief(
    job_text: str,
    profile: str | None = None,
    max_tokens: int = 250,
    temp: float = 0.7,
) -> str:
    """Generate a 2-paragraph brief for a single job."""
    import time

    from mlx_lm import generate

    model, tokenizer = _load_model()
    profile_text = profile or DEFAULT_PROFILE

    prompt = f"""Write a concise 2-paragraph job opportunity brief.

Job posting:
{job_text[:800]}

Candidate profile:
{profile_text}

Paragraph 1: Why this role fits the candidate's background.
Paragraph 2: One concern or gap to investigate before applying.

/no_think"""

    t0 = time.time()
    response = generate(
        model, tokenizer,
        prompt=prompt,
        max_tokens=max_tokens,
        temp=temp,
    )
    elapsed = time.time() - t0

    tokens = len(tokenizer.encode(response))
    speed = tokens / elapsed if elapsed > 0 else 0
    print(f"  Generated {tokens} tokens in {elapsed:.1f}s ({speed:.0f} tok/s)")

    return response


def generate_briefs(
    jobs: list[dict],
    profile: str | None = None,
    max_briefs: int = 3,
) -> list[JobBrief]:
    """Generate briefs for top N jobs.

    Args:
        jobs: List of dicts with at least 'title', 'company_name', 'description' or 'embedding_text'.
        profile: Override profile text.
        max_briefs: Max number of briefs to generate.
    """
    import time

    from mlx_lm import generate

    model, tokenizer = _load_model()
    profile_text = profile or DEFAULT_PROFILE

    results: list[JobBrief] = []
    for job in jobs[:max_briefs]:
        title = job.get("title", "Unknown")
        company = job.get("company_name", job.get("company_key", "Unknown"))
        text = job.get("description") or job.get("embedding_text") or job.get("text", "")

        prompt = f"""Write a 2-sentence assessment of this job for the candidate below.

Job: {title} at {company}
{text[:600]}

Candidate: {profile_text[:200]}

/no_think"""

        t0 = time.time()
        response = generate(
            model, tokenizer,
            prompt=prompt,
            max_tokens=150,
            temp=0.7,
        )
        elapsed = time.time() - t0
        tokens = len(tokenizer.encode(response))

        results.append(JobBrief(
            job_title=title,
            company=company,
            brief=response,
            tokens=tokens,
            elapsed_secs=elapsed,
        ))

    return results
