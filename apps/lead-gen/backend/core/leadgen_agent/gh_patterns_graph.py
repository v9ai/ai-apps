"""GitHub patterns & candidate discovery graph.

Native Python port of ``crates/gh`` (Rust). One LangGraph graph with a
``command`` parameter multiplexes five subcommands that the Rust crate
shipped as separate binaries:

* ``scan_orgs``             — scan orgs in Neon (or discover via topic search)
                              and populate pattern scores on ``companies``.
* ``match_paper_authors``   — pick the likeliest GitHub login for contacts
                              tagged with papers (deterministic scoring, no
                              LLM). Reads input contacts from state.
* ``scrape_contributors``   — discover AI repos, scrape their contributors,
                              hydrate full profiles via GraphQL, persist to
                              ``gh_contributor_embeddings``.
* ``export_contributors``   — push high-scoring contributors from the
                              embeddings table to the ``contacts`` table.
* ``search_candidates``     — multi-channel sourcing (bio search + stargazer
                              mining + contributor mining + org members +
                              network expansion) → hydrate → score → export.

Replacements vs the Rust crate:

* Candle BERT embeddings → ``embed_texts`` in :mod:`embeddings` (BGE-M3 via
  the local Rust/Candle HTTP server on port 7799).
* LanceDB contributor store → two Postgres tables (``gh_org_patterns``,
  ``gh_contributor_embeddings``) with a ``pgvector`` column.
* ``sqlx``/Rust async → ``psycopg`` (autocommit).
* ``reqwest`` → ``httpx.AsyncClient``.
* GraphQL → raw ``httpx`` POST to ``https://api.github.com/graphql`` (keeps
  the dependency surface narrow; no ``gql`` required).

Environment variables honoured (superset of the Rust crate's):

* ``GITHUB_TOKEN`` / ``GH_TOKEN``
* ``NEON_DATABASE_URL`` / ``DATABASE_URL``
* ``ICP_EMBED_URL`` (forwarded from :mod:`embeddings`)
* Command-specific knobs are read from the state payload — same keys as the
  Rust binaries (``scan_mode``, ``scan_limit``, ``gh_topics``, ``gh_repo``,
  ``max_repos`` … see :class:`GhPatternsState`).

# Requires: numpy
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import math
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable, Sequence, TypedDict

import httpx
import numpy as np
import psycopg
from langgraph.graph import END, START, StateGraph

from .embeddings import EMBED_DIM, embed_texts, vector_to_pg_literal

log = logging.getLogger(__name__)


# ── Constants ────────────────────────────────────────────────────────────────

GITHUB_REST = "https://api.github.com"
GITHUB_GRAPHQL = "https://api.github.com/graphql"
USER_AGENT = "github-patterns/0.2-py"
BACKOFF_SECS: tuple[int, ...] = (1, 2, 4)

AI_TOPICS: tuple[str, ...] = (
    "machine-learning", "deep-learning", "artificial-intelligence", "llm",
    "large-language-model", "generative-ai", "nlp", "computer-vision",
    "reinforcement-learning", "neural-network", "rag", "vector-database",
    "embeddings", "fine-tuning", "ai-agent", "multimodal",
)
AI_NAME_HINTS: tuple[str, ...] = (
    "llm", "gpt", "bert", "rag", "agent", "copilot", "model", "inference",
    "embedding", "finetune", "fine-tune", "train", "diffusion",
)
AI_FRAMEWORKS: tuple[str, ...] = (
    "transformers", "pytorch", "torch", "tensorflow", "jax", "langchain",
    "llamaindex", "llama-index", "openai", "anthropic", "huggingface",
    "diffusers", "sentence-transformers", "vllm", "ollama", "ggml", "gguf",
    "candle", "mlx", "deepspeed", "accelerate", "peft", "rlhf", "trl",
    "axolotl",
)
INFRA_TOOLS: tuple[str, ...] = (
    "kubernetes", "k8s", "terraform", "pulumi", "docker", "helm", "argo",
    "grafana", "prometheus",
)
CLOUD_PROVIDERS: tuple[str, ...] = (
    "aws", "gcp", "azure", "cloudflare", "vercel", "fly",
)
HIRING_KEYWORDS: tuple[str, ...] = (
    "we are hiring", "we're hiring", "join our team", "join us",
    "open positions", "open roles", "job openings", "careers",
    "work with us", "come work", "apply now", "job board",
    "we are looking for", "we're looking for", "recruiting",
)
AI_README_KEYWORDS: tuple[str, ...] = (
    "machine learning", "deep learning", "neural network",
    "large language model", "llm", "gpt", "transformer", "foundation model",
    "generative ai", "reinforcement learning", "computer vision",
    "natural language processing", "nlp", "embedding", "fine-tuning",
    "fine tuning", "rag", "retrieval-augmented", "vector database",
    "semantic search", "ai agent", "autonomous agent", "multimodal",
)
README_QUALITY_SIGNALS: tuple[str, ...] = (
    "ci", "coverage", "passing", "build", "license", "pypi", "crates.io",
    "docker", "kubernetes", "terraform", "github actions",
)

PYTHON_AI: frozenset[str] = frozenset({
    "torch", "tensorflow", "jax", "flax", "keras", "paddle", "paddlepaddle",
    "mindspore", "mxnet", "transformers", "huggingface-hub", "huggingface_hub",
    "datasets", "evaluate", "peft", "trl", "accelerate", "bitsandbytes",
    "optimum", "diffusers", "sentence-transformers", "sentence_transformers",
    "tokenizers", "langchain", "langchain-core", "langchain-openai",
    "langchain-anthropic", "langchain-community", "llama-index", "llama_index",
    "llamaindex", "openai", "anthropic", "cohere", "mistralai", "groq",
    "litellm", "instructor", "guidance", "outlines", "vllm",
    "llama-cpp-python", "ctransformers", "mlx", "mlx-lm", "ggml", "xformers",
    "flash-attn", "deepspeed", "fairseq", "megatron", "torchvision", "timm",
    "einops", "albumentations", "opencv-python", "open-clip-torch", "ragas",
    "langsmith", "weave", "trulens", "phoenix", "promptflow", "faiss-cpu",
    "faiss-gpu",
})
PYTHON_VECTOR_DB: frozenset[str] = frozenset({
    "pinecone", "pinecone-client", "weaviate-client", "chromadb",
    "qdrant-client", "pymilvus", "lancedb", "pgvector",
})
JS_AI: frozenset[str] = frozenset({
    "openai", "@anthropic-ai/sdk", "langchain", "@langchain/core",
    "@langchain/openai", "@langchain/anthropic", "llamaindex", "ai",
    "@ai-sdk/openai", "@ai-sdk/anthropic", "@huggingface/inference",
    "transformers", "@xenova/transformers", "@tensorflow/tfjs", "ml5",
    "brain.js", "groq-sdk", "cohere-ai", "mistralai",
})
RUST_AI: frozenset[str] = frozenset({
    "candle-core", "candle-nn", "candle-transformers", "ort", "llm",
    "mistralrs", "fastembed", "rust-bert", "tokenizers", "hf-hub",
    "llama-cpp-rs", "tch",
})
MANIFEST_PATHS: tuple[str, ...] = (
    "requirements.txt", "requirements/base.txt", "requirements/prod.txt",
    "pyproject.toml", "setup.cfg", "package.json", "Cargo.toml",
)

# AI/ML skill taxonomy (tag → trigger keywords).
SKILL_TAXONOMY: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("agents", ("agent", "agentic", "crewai", "autogen", "langgraph", "multi-agent", "tool use", "function calling", "griptape", "swarm")),
    ("computer-vision", ("computer vision", "opencv", "cv2", "yolo", "object detection", "image classification", "image segmentation")),
    ("deep-learning", ("deep learning", "neural network", "backprop", "gradient descent", "activation function")),
    ("distributed-training", ("distributed training", "deepspeed", "fsdp", "megatron", "data parallel", "model parallel", "horovod", "multi-gpu", "multi gpu")),
    ("embeddings", ("embedding", "sentence-transformer", "bge", "e5-", "gte-", "ada-002")),
    ("evaluation", ("eval", "evaluation", "benchmark", "lm-eval", "eleuther", "human-eval", "humaneval", "helm", "mmlu", "red team", "safety eval")),
    ("fine-tuning", ("fine-tun", "lora", "qlora", "peft", "trl", "sft", "dpo", "orpo", "rlhf")),
    ("generative-ai", ("generative ai", "generative model", "diffusion", "stable diffusion", "dalle", "imagen")),
    ("inference", ("inference", "vllm", "text-generation-inference", "tgi", "triton server", "onnx", "tensorrt", "torchserve", "sglang")),
    ("llm", ("llm", "large language model", "language model", "gpt", "llama", "mistral", "qwen", "deepseek", "claude", "gemini", "openai", "anthropic", "chatgpt")),
    ("machine-learning", ("machine learning", "scikit", "sklearn", "xgboost", "lightgbm", "catboost", "random forest", "gradient boosting")),
    ("mlops", ("mlops", "mlflow", "weights & biases", "wandb", "dvc", "bentoml", "ray train", "kubeflow", "sagemaker", "vertex ai")),
    ("model-serving", ("model serving", "model deployment", "seldon", "kserve", "ray serve", "sagemaker endpoint")),
    ("multimodal", ("multimodal", "vision-language", "clip", "llava", "whisper", "text-to-speech", "speech-to-text", "image generation")),
    ("nlp", ("nlp", "natural language processing", "tokenizer", "spacy", "nltk", "hugging face", "huggingface", "transformers library")),
    ("prompt-engineering", ("prompt engineer", "prompt design", "chain of thought", "few-shot", "in-context learning", "system prompt")),
    ("python", ("python", "pip install", "conda env", ".py", "pyproject.toml", "setup.py")),
    ("rag", ("rag", "retrieval-augmented", "retrieval augmented", "langchain", "llamaindex", "llama-index", "haystack")),
    ("reinforcement-learning", ("reinforcement learning", "rlhf", "reward model", "policy gradient", "proximal policy", "ppo", "grpo")),
    ("rust", ("rust-lang", "cargo.toml", " tokio ", "candle-core", "rust developer", "written in rust")),
    ("transformers", ("transformer", "self-attention", "bert", "roberta", "deberta", "t5", "gpt2", "vision transformer", "vit")),
    ("typescript", ("typescript", "nextjs", "next.js", "deno", "bun", "nodejs")),
    ("vector-db", ("vector database", "vector db", "lancedb", "pinecone", "weaviate", "qdrant", "milvus", "chromadb", "chroma", "faiss", "pgvector", "vector store")),
)

AI_RELEVANT_TOPICS: frozenset[str] = frozenset({
    "machine-learning", "deep-learning", "artificial-intelligence", "llm",
    "large-language-model", "large-language-models", "generative-ai", "nlp",
    "natural-language-processing", "computer-vision", "reinforcement-learning",
    "neural-network", "neural-networks", "rag", "vector-database", "embeddings",
    "fine-tuning", "ai-agent", "ai-agents", "multimodal", "langchain",
    "llamaindex", "transformers", "pytorch", "tensorflow", "huggingface",
    "stable-diffusion", "diffusion-models", "mlops",
})

# Scoring weights (from Rust crate — must sum to 1.0).
RISING_WEIGHTS: tuple[float, ...] = (0.15, 0.06, 0.08, 0.12, 0.08, 0.06, 0.05, 0.18, 0.22)
STRENGTH_WEIGHTS: tuple[float, ...] = (0.22, 0.20, 0.10, 0.13, 0.08, 0.05, 0.22)

# search_candidates channel tables.
SEARCH_QUERIES: tuple[tuple[str, str], ...] = (
    ("A: bio AI engineer",   "location:London AI engineer language:python type:user"),
    ("B: RAG + LLM",         "location:London RAG LLM type:user"),
    ("C: frameworks",        "location:London langchain langgraph crewai type:user"),
    ("D: senior ML",         "location:London machine learning followers:>20 type:user"),
    ("E: UK-wide RAG",       'location:"United Kingdom" RAG LLM type:user'),
    ("F: Claude/Anthropic",  "location:London anthropic claude type:user"),
    ("G: deep learning",     "location:London deep learning pytorch type:user"),
    ("H: agentic AI",        "location:London agentic agent framework type:user"),
    ("I: fine-tuning",       "location:London fine-tuning LoRA type:user"),
    ("J: MLOps",             "location:London MLOps deployment type:user"),
    ("K: principal/staff",   "location:London principal staff AI engineer type:user"),
    ("L: DSPy/instructor",   "location:London dspy instructor outlines type:user"),
    ("M: retrieval expert",  "location:London retrieval vector search embedding type:user"),
    ("N: UK principal",      'location:"United Kingdom" principal AI staff engineer type:user'),
    ("O: vector DB",         "location:London pinecone weaviate qdrant lancedb type:user"),
)
STARGAZER_REPOS: tuple[str, ...] = (
    "langchain-ai/langgraph", "crewAIInc/crewAI", "anthropics/anthropic-cookbook",
    "anthropics/anthropic-sdk-python", "vllm-project/vllm", "openai/evals",
    "microsoft/autogen", "huggingface/transformers", "chroma-core/chroma",
    "stanfordnlp/dspy", "jxnl/instructor", "outlines-dev/outlines",
    "run-llama/llama_index",
)
CONTRIBUTOR_REPOS: tuple[str, ...] = (
    "langchain-ai/langchain", "langchain-ai/langgraph", "run-llama/llama_index",
    "crewAIInc/crewAI", "microsoft/autogen", "vllm-project/vllm",
    "chroma-core/chroma", "anthropics/anthropic-sdk-python",
    "stanfordnlp/dspy", "jxnl/instructor", "microsoft/semantic-kernel",
    "BerriAI/litellm",
)
LONDON_AI_ORGS: tuple[str, ...] = (
    "deepmind", "alan-turing-institute", "stability-ai", "faculty-ai",
    "benevolentai", "huggingface", "cohere-ai", "google-deepmind",
)

_LONDON_RE = re.compile(r"\b(london|greater london)\b", re.IGNORECASE)
_UK_WIDE_RE = re.compile(
    r"\b(uk|united kingdom|england|cambridge|oxford|brighton|reading|bristol|manchester)\b",
    re.IGNORECASE,
)


# Shared GraphQL User fragment (kept in sync with Rust USER_GQL_FIELDS).
USER_GQL_FIELDS = """
    login id: databaseId
    url bio company location email name
    avatarUrl websiteUrl twitterUsername
    publicRepositories: repositories(privacy: PUBLIC) { totalCount }
    publicGists: gists(privacy: PUBLIC) { totalCount }
    followers { totalCount }
    following { totalCount }
    isHireable
    createdAt updatedAt
    contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalRepositoriesWithContributedCommits
        hasAnyContributions
        contributionCalendar {
            totalContributions
            weeks { contributionDays { contributionCount date } }
        }
    }
    pinnedItems(first: 6) {
        nodes { ... on Repository { name stargazerCount primaryLanguage { name } } }
    }
    repositoriesContributedTo(first: 10, contributionTypes: [COMMIT, PULL_REQUEST], orderBy: {field: STARGAZERS, direction: DESC}) {
        nodes { nameWithOwner stargazerCount primaryLanguage { name } repositoryTopics(first: 5) { nodes { topic { name } } } }
    }
    topRepositories: repositories(first: 3, orderBy: {field: STARGAZERS, direction: DESC}, privacy: PUBLIC, isFork: false) {
        nodes { name stargazerCount primaryLanguage { name } repositoryTopics(first: 5) { nodes { topic { name } } } }
    }
    organizations(first: 5) { nodes { login name } }
    status { message }
"""


# ── State ────────────────────────────────────────────────────────────────────


class GhPatternsState(TypedDict, total=False):
    """Input/output state for the GitHub patterns graph.

    Supply ``command`` (one of ``scan_orgs``, ``match_paper_authors``,
    ``scrape_contributors``, ``export_contributors``, ``search_candidates``)
    plus per-command knobs. Each command writes a ``result`` dict.
    """

    # routing
    command: str

    # common knobs
    scan_mode: str              # scan_orgs: "enrich"|"discover"; scrape_contributors: "discover"|"repo"|"top"
    scan_limit: int
    gh_topics: str              # comma-separated
    gh_min_stars: int
    gh_repo: str                # "owner/repo"
    max_repos: int
    max_contributors_per_repo: int
    top_n: int
    rescan: bool

    # match_paper_authors
    contacts: list[dict[str, Any]]
    match_threshold: float

    # export / search
    export_threshold: float
    export_top_n: int
    opp_id: str
    opp_skills: list[str]
    dry_run: bool

    # output
    result: dict[str, Any]
    error: str


# ── GitHub REST/GraphQL client ────────────────────────────────────────────────


class GhClient:
    """Lightweight async GitHub client with retry on 429/secondary-403."""

    def __init__(self, token: str, *, client: httpx.AsyncClient | None = None) -> None:
        self._token = token
        self._client = client or httpx.AsyncClient(
            timeout=60.0,
            headers={
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": USER_AGENT,
                "Authorization": f"Bearer {token}",
            },
        )

    @classmethod
    def from_env(cls) -> GhClient:
        token = (os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN") or "").strip()
        if not token:
            raise RuntimeError("GITHUB_TOKEN / GH_TOKEN not set")
        return cls(token)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _get(self, path: str) -> Any:
        return await self._get_url(f"{GITHUB_REST}{path}")

    async def _get_url(self, url: str) -> Any:
        last_exc: Exception | None = None
        for attempt, delay in enumerate(BACKOFF_SECS):
            try:
                return await self._get_url_once(url)
            except _RateLimitError:
                if attempt >= len(BACKOFF_SECS) - 1:
                    break
                log.warning("rate-limited on %s, retry in %ds", url, delay)
                await asyncio.sleep(delay)
            except _NotFoundError:
                raise
            except Exception as e:  # noqa: BLE001
                last_exc = e
                if attempt >= len(BACKOFF_SECS) - 1:
                    break
                await asyncio.sleep(delay)
        # One last attempt to surface a clean error.
        return await self._get_url_once(url)

    async def _get_url_once(self, url: str) -> Any:
        resp = await self._client.get(url)
        status = resp.status_code
        if status == 404:
            raise _NotFoundError(url)
        if status == 429 or (status == 403 and "x-ratelimit-remaining" in resp.headers):
            raise _RateLimitError(resp.headers.get("x-ratelimit-reset", "unknown"))
        if status >= 400:
            try:
                msg = resp.json().get("message", resp.text)
            except Exception:  # noqa: BLE001
                msg = resp.text
            raise RuntimeError(f"GitHub API {status}: {msg}")
        return resp.json()

    async def get_file_content(self, owner: str, repo: str, path: str) -> str | None:
        url = f"{GITHUB_REST}/repos/{owner}/{repo}/contents/{path}"
        try:
            resp = await self._client.get(url, headers={"Accept": "application/vnd.github.raw+json"})
        except httpx.HTTPError as e:
            log.debug("content fetch %s failed: %s", url, e)
            return None
        if resp.status_code == 404:
            return None
        if resp.status_code in (429, 403):
            raise _RateLimitError(resp.headers.get("x-ratelimit-reset", "unknown"))
        if resp.status_code >= 400:
            return None
        # Some responses still return JSON with base64 content when Accept
        # header is ignored — fall back gracefully.
        ctype = resp.headers.get("content-type", "")
        if "application/json" in ctype:
            try:
                data = resp.json()
                raw = data.get("content") or ""
                if data.get("encoding") == "base64":
                    return base64.b64decode(raw).decode("utf-8", errors="ignore")
                return raw
            except Exception:  # noqa: BLE001
                pass
        return resp.text

    # ── org / repo ────────────────────────────────────────────────────────

    async def org(self, login: str) -> dict[str, Any]:
        return await self._get(f"/orgs/{login}")

    async def org_repos(self, login: str, per_page: int = 30) -> list[dict[str, Any]]:
        return await self._get(
            f"/orgs/{login}/repos?per_page={per_page}&sort=pushed&direction=desc"
        )

    async def repo_languages(self, owner: str, repo: str) -> dict[str, int]:
        try:
            data = await self._get(f"/repos/{owner}/{repo}/languages")
            return data or {}
        except Exception as e:  # noqa: BLE001
            log.debug("repo_languages %s/%s: %s", owner, repo, e)
            return {}

    async def repo_contributors(self, owner: str, repo: str) -> list[dict[str, Any]]:
        try:
            return await self._get(
                f"/repos/{owner}/{repo}/contributors?per_page=100&anon=false"
            ) or []
        except Exception as e:  # noqa: BLE001
            log.debug("repo_contributors %s/%s: %s", owner, repo, e)
            return []

    async def repo_releases(self, owner: str, repo: str) -> list[dict[str, Any]]:
        try:
            return await self._get(f"/repos/{owner}/{repo}/releases?per_page=30") or []
        except Exception as e:  # noqa: BLE001
            log.debug("repo_releases %s/%s: %s", owner, repo, e)
            return []

    async def repo_commit_activity(self, owner: str, repo: str) -> list[dict[str, Any]]:
        try:
            return await self._get(f"/repos/{owner}/{repo}/stats/commit_activity") or []
        except Exception as e:  # noqa: BLE001
            log.debug("repo_commit_activity %s/%s: %s", owner, repo, e)
            return []

    async def get_user(self, login: str) -> dict[str, Any] | None:
        try:
            return await self._get(f"/users/{login}")
        except _NotFoundError:
            return None

    async def search_users(
        self,
        query: str,
        *,
        sort: str | None = None,
        order: str | None = None,
        per_page: int = 30,
        page: int = 1,
    ) -> dict[str, Any]:
        from urllib.parse import quote_plus
        url = f"{GITHUB_REST}/search/users?q={quote_plus(query)}&per_page={per_page}&page={page}"
        if sort:
            url += f"&sort={sort}"
        if order:
            url += f"&order={order}"
        try:
            return await self._get_url(url)
        except Exception as e:  # noqa: BLE001
            log.debug("search_users %r: %s", query, e)
            return {"total_count": 0, "items": []}

    async def search_repos(
        self,
        topic: str,
        *,
        language: str | None = None,
        min_stars: int = 50,
        per_page: int = 30,
    ) -> dict[str, Any]:
        from urllib.parse import quote_plus
        q = f"topic:{topic} stars:>={min_stars}"
        if language:
            q += f" language:{language}"
        url = f"{GITHUB_REST}/search/repositories?q={quote_plus(q)}&sort=updated&per_page={per_page}"
        try:
            return await self._get_url(url)
        except Exception as e:  # noqa: BLE001
            log.debug("search_repos topic=%s: %s", topic, e)
            return {"total_count": 0, "items": []}

    async def repo_stargazers(
        self, owner: str, repo: str, *, per_page: int = 100, page: int = 1
    ) -> list[dict[str, Any]]:
        try:
            return await self._get(
                f"/repos/{owner}/{repo}/stargazers?per_page={per_page}&page={page}"
            ) or []
        except Exception as e:  # noqa: BLE001
            log.debug("repo_stargazers %s/%s p%d: %s", owner, repo, page, e)
            return []

    # ── GraphQL ───────────────────────────────────────────────────────────

    async def graphql(self, query: str, variables: dict[str, Any] | None = None) -> dict[str, Any]:
        body: dict[str, Any] = {"query": query}
        if variables:
            body["variables"] = variables
        resp = await self._client.post(GITHUB_GRAPHQL, json=body)
        if resp.status_code in (429, 403):
            raise _RateLimitError(resp.headers.get("x-ratelimit-reset", "unknown"))
        if resp.status_code >= 400:
            raise RuntimeError(f"GraphQL {resp.status_code}: {resp.text[:400]}")
        raw = resp.json()
        data = raw.get("data")
        errors = raw.get("errors")
        if errors and (data is None or data == {}):
            raise RuntimeError(f"GraphQL errors: {json.dumps(errors)[:400]}")
        if errors:
            log.warning("GraphQL partial success: %d errors", len(errors))
        return data or {}

    async def get_users_graphql(self, logins: Sequence[str]) -> list[dict[str, Any]]:
        if not logins:
            return []
        parts = []
        for i, login in enumerate(logins):
            esc = login.replace("\\", "\\\\").replace('"', '\\"')
            parts.append(f'u{i}: user(login: "{esc}") {{ {USER_GQL_FIELDS} }}')
        query = "query { " + "\n".join(parts) + " }"
        try:
            data = await self.graphql(query)
        except Exception as e:  # noqa: BLE001
            log.debug("get_users_graphql failed (%d logins): %s", len(logins), e)
            return []
        out: list[dict[str, Any]] = []
        for v in data.values():
            if v:
                out.append(parse_gql_user(v))
        return out

    async def get_org_members_graphql(self, org: str, first: int = 20) -> list[dict[str, Any]]:
        query = (
            f'query {{ organization(login: "{org}") {{ membersWithRole(first: {first}) '
            f'{{ nodes {{ {USER_GQL_FIELDS} }} }} }} }}'
        )
        try:
            data = await self.graphql(query)
        except Exception as e:  # noqa: BLE001
            log.debug("get_org_members_graphql %s: %s", org, e)
            return []
        nodes = (((data.get("organization") or {}).get("membersWithRole") or {}).get("nodes") or [])
        return [parse_gql_user(n) for n in nodes if n]

    async def get_user_followers_graphql(self, login: str, first: int = 20) -> list[dict[str, Any]]:
        query = (
            f'query {{ user(login: "{login}") {{ followers(first: {first}) '
            f'{{ nodes {{ {USER_GQL_FIELDS} }} }} }} }}'
        )
        try:
            data = await self.graphql(query)
        except Exception as e:  # noqa: BLE001
            log.debug("get_user_followers_graphql %s: %s", login, e)
            return []
        nodes = (((data.get("user") or {}).get("followers") or {}).get("nodes") or [])
        return [parse_gql_user(n) for n in nodes if n]


class _RateLimitError(Exception):
    def __init__(self, reset_at: str) -> None:
        super().__init__(f"rate limited — reset at {reset_at}")
        self.reset_at = reset_at


class _NotFoundError(Exception):
    pass


# ── GraphQL user parser ──────────────────────────────────────────────────────


def parse_gql_user(value: dict[str, Any]) -> dict[str, Any]:
    """Flatten a GraphQL user node into the same shape the Rust crate used.

    Returns a dict with REST-compatible snake_case keys plus the enriched
    contributionsCollection / pinned / contributed / activity fields.
    """

    def _s(v: Any) -> str | None:
        return v if isinstance(v, str) and v else None

    created_at = value.get("createdAt") or ""
    updated_at = value.get("updatedAt") or ""
    cc = value.get("contributionsCollection") or {}
    cal = cc.get("contributionCalendar")
    contribution_calendar_json = json.dumps(cal) if cal else None

    pinned_nodes = ((value.get("pinnedItems") or {}).get("nodes") or [])
    pinned = [
        {
            "name": n.get("name") or "",
            "stars": int(n.get("stargazerCount") or 0),
            "language": ((n.get("primaryLanguage") or {}) or {}).get("name"),
        }
        for n in pinned_nodes if n and n.get("name")
    ]

    contrib_nodes = ((value.get("repositoriesContributedTo") or {}).get("nodes") or [])
    contributed = []
    for n in contrib_nodes:
        if not n or not n.get("nameWithOwner"):
            continue
        topics = [
            (((t or {}).get("topic") or {}).get("name") or "")
            for t in ((n.get("repositoryTopics") or {}).get("nodes") or [])
        ]
        topics = [t for t in topics if t]
        contributed.append({
            "name_with_owner": n.get("nameWithOwner") or "",
            "stars": int(n.get("stargazerCount") or 0),
            "language": ((n.get("primaryLanguage") or {}) or {}).get("name"),
            "topics": topics,
        })

    top_nodes = ((value.get("topRepositories") or {}).get("nodes") or [])
    top_repos = [
        {
            "name": n.get("name") or "",
            "stars": int(n.get("stargazerCount") or 0),
            "language": ((n.get("primaryLanguage") or {}) or {}).get("name"),
        }
        for n in top_nodes if n and n.get("name")
    ]

    org_nodes = ((value.get("organizations") or {}).get("nodes") or [])
    organizations = [
        {"login": n.get("login") or "", "name": n.get("name")} for n in org_nodes if n
    ]

    created_at_dt = _parse_iso(created_at)
    activity_profile = _compute_activity_profile(created_at_dt, cal)

    return {
        "login": value.get("login") or "",
        "id": int(value.get("id") or 0),
        "html_url": value.get("url") or "",
        "avatar_url": value.get("avatarUrl") or "",
        "name": _s(value.get("name")),
        "email": _s(value.get("email")),
        "bio": _s(value.get("bio")),
        "company": _s(value.get("company")),
        "location": _s(value.get("location")),
        "blog": _s(value.get("websiteUrl")),
        "twitter_username": _s(value.get("twitterUsername")),
        "public_repos": int(((value.get("publicRepositories") or {}).get("totalCount")) or 0),
        "public_gists": int(((value.get("publicGists") or {}).get("totalCount")) or 0),
        "followers": int(((value.get("followers") or {}).get("totalCount")) or 0),
        "following": int(((value.get("following") or {}).get("totalCount")) or 0),
        "hireable": value.get("isHireable"),
        "created_at": created_at,
        "updated_at": updated_at,
        "total_commit_contributions": cc.get("totalCommitContributions"),
        "total_pr_contributions": cc.get("totalPullRequestContributions"),
        "total_review_contributions": cc.get("totalPullRequestReviewContributions"),
        "total_repos_contributed_to": cc.get("totalRepositoriesWithContributedCommits"),
        "pinned_repos_json": json.dumps(pinned) if pinned else None,
        "contributed_repos_json": json.dumps(contributed) if contributed else None,
        "top_repos_json": json.dumps(top_repos) if top_repos else None,
        "organizations_json": json.dumps(organizations) if organizations else None,
        "status_message": _s(((value.get("status") or {}) or {}).get("message")),
        "has_any_contributions": cc.get("hasAnyContributions"),
        "contribution_calendar_json": contribution_calendar_json,
        "activity_profile": activity_profile,
    }


def _parse_iso(s: str) -> datetime | None:
    if not s:
        return None
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        return datetime.fromisoformat(s)
    except Exception:  # noqa: BLE001
        return None


def _compute_activity_profile(
    created_at: datetime | None,
    calendar: dict[str, Any] | None,
) -> dict[str, Any] | None:
    """Port of ``client.rs::compute_activity_profile``."""
    now = datetime.now(timezone.utc)
    if created_at is None:
        return None
    account_age_days = max(0, (now - created_at).days)
    account_age_years = account_age_days / 365.0

    if not calendar:
        return {
            "account_age_days": account_age_days,
            "account_age_years": account_age_years,
            "last_active_date": None,
            "days_since_last_active": None,
            "contributions_30d": 0,
            "contributions_90d": 0,
            "contributions_365d": 0,
            "current_streak_days": 0,
            "longest_streak_days": 0,
            "activity_trend": "unknown",
            "avg_daily_90d": 0.0,
        }

    today = now.date()
    days: list[tuple[str, int]] = []
    for week in calendar.get("weeks") or []:
        for day in week.get("contributionDays") or []:
            d = day.get("date")
            c = int(day.get("contributionCount") or 0)
            if d:
                days.append((d, c))
    days.sort(key=lambda x: x[0])

    last_active = next(
        (d for d, c in reversed(days) if c > 0), None
    )
    last_active_date = last_active
    days_since_last_active: int | None = None
    if last_active:
        try:
            d_obj = datetime.strptime(last_active, "%Y-%m-%d").date()
            days_since_last_active = max(0, (today - d_obj).days)
        except ValueError:
            pass

    def _window(n: int) -> int:
        cutoff = today - timedelta(days=n)
        total = 0
        for d, c in days:
            try:
                dd = datetime.strptime(d, "%Y-%m-%d").date()
            except ValueError:
                continue
            if dd > cutoff:
                total += c
        return total

    contributions_30d = _window(30)
    contributions_90d = _window(90)
    contributions_365d = _window(365)
    current_streak, longest_streak = _compute_streaks(days, today)

    recent_45 = _window(45)
    prior_45 = _window(90) - _window(45)
    if account_age_days < 90:
        trend = "new"
    elif contributions_90d == 0:
        trend = "dormant"
    elif prior_45 == 0:
        trend = "rising" if recent_45 > 0 else "dormant"
    elif recent_45 > prior_45 * 1.3:
        trend = "rising"
    elif recent_45 < prior_45 * 0.7:
        trend = "declining"
    else:
        trend = "stable"

    return {
        "account_age_days": account_age_days,
        "account_age_years": account_age_years,
        "last_active_date": last_active_date,
        "days_since_last_active": days_since_last_active,
        "contributions_30d": contributions_30d,
        "contributions_90d": contributions_90d,
        "contributions_365d": contributions_365d,
        "current_streak_days": current_streak,
        "longest_streak_days": longest_streak,
        "activity_trend": trend,
        "avg_daily_90d": contributions_90d / 90.0,
    }


def _compute_streaks(days: list[tuple[str, int]], today: Any) -> tuple[int, int]:
    # Current streak: consecutive days with contribs ending at today or yesterday.
    counts_by_date: dict[str, int] = {d: c for d, c in days}
    current = 0
    for offset in (0, 1):
        start = today - timedelta(days=offset)
        streak = 0
        check = start
        while counts_by_date.get(check.strftime("%Y-%m-%d"), 0) > 0:
            streak += 1
            check = check - timedelta(days=1)
        if streak > 0:
            current = streak
            break

    # Longest streak
    longest = 0
    streak = 0
    prev_date: Any = None
    for d, c in days:
        try:
            dd = datetime.strptime(d, "%Y-%m-%d").date()
        except ValueError:
            continue
        if c > 0:
            if prev_date is None or (dd - prev_date).days == 1:
                streak += 1
            else:
                streak = 1
            longest = max(longest, streak)
            prev_date = dd
        else:
            streak = 0
            prev_date = None
    return current, longest


# ── Skills / text helpers ────────────────────────────────────────────────────


def extract_skills(text: str) -> list[str]:
    lower = (text or "").lower()
    found: set[str] = set()
    for tag, keywords in SKILL_TAXONOMY:
        if any(kw in lower for kw in keywords):
            found.add(tag)
    return sorted(found)


def contributor_skills_text(
    bio: str | None,
    company: str | None,
    repos_json: str | None,
    pinned_repos_json: str | None = None,
    contributed_repos_json: str | None = None,
    top_repos_json: str | None = None,
) -> str:
    parts: list[str] = []
    if bio:
        parts.append(bio)
    if company:
        parts.append(company)
    text = " ".join(parts)

    def _append_list(raw: str | None, extract) -> None:
        nonlocal text
        if not raw:
            return
        try:
            arr = json.loads(raw)
        except (ValueError, TypeError):
            return
        if not isinstance(arr, list):
            return
        for item in arr:
            if not isinstance(item, dict):
                continue
            chunk = extract(item)
            if chunk:
                text += " " + chunk

    _append_list(repos_json, lambda item: item.get("repo") or "")

    def _pinned(item: dict[str, Any]) -> str:
        bits = [item.get("name") or ""]
        if item.get("language"):
            bits.append(str(item["language"]))
        return " ".join(b for b in bits if b)

    _append_list(pinned_repos_json, _pinned)

    def _contrib(item: dict[str, Any]) -> str:
        bits = [item.get("name_with_owner") or ""]
        for t in item.get("topics") or []:
            bits.append(str(t))
        if item.get("language"):
            bits.append(str(item["language"]))
        return " ".join(b for b in bits if b)

    _append_list(contributed_repos_json, _contrib)
    _append_list(top_repos_json, _pinned)
    return text


def is_bot(login: str) -> bool:
    low = (login or "").lower()
    return low.endswith("[bot]") or "dependabot" in low or "renovate" in low


def infer_position(bio: str | None) -> str | None:
    if not bio:
        return None
    b = bio.lower()
    if "principal" in b:
        return "Principal Engineer"
    if "staff engineer" in b or "staff software" in b:
        return "Staff Engineer"
    if "tech lead" in b or "team lead" in b or "engineering lead" in b:
        return "Lead Engineer"
    if "architect" in b:
        return "Architect"
    if "vp " in b or "vice president" in b:
        return "VP Engineering"
    if "director" in b:
        return "Director"
    if "head of" in b:
        return "Head of Engineering"
    if "manager" in b:
        return "Engineering Manager"
    if "founder" in b or "ceo" in b or "cto" in b:
        return "Founder"
    if "researcher" in b or "research scientist" in b or "research engineer" in b:
        return "Researcher"
    if "scientist" in b or "data scientist" in b:
        return "Scientist"
    if "consultant" in b:
        return "Consultant"
    if "student" in b or "intern" in b:
        return "Student"
    if "senior" in b:
        return "Senior Engineer"
    if "engineer" in b or "developer" in b or "programmer" in b:
        return "Engineer"
    return None


def infer_seniority_level(position: str | None) -> float:
    return {
        "VP Engineering": 1.0, "Director": 1.0, "Head of Engineering": 1.0,
        "Principal Engineer": 0.95,
        "Staff Engineer": 0.90, "Architect": 0.90,
        "Lead Engineer": 0.85, "Engineering Manager": 0.85,
        "Founder": 0.80,
        "Senior Engineer": 0.75,
        "Researcher": 0.70, "Scientist": 0.70, "Consultant": 0.70,
        "Engineer": 0.50,
        "Student": 0.20,
    }.get(position or "", 0.50)


# ── URL helpers ──────────────────────────────────────────────────────────────


def extract_org_from_url(url: str) -> str | None:
    if not url:
        return None
    url = url.strip().rstrip("/")
    if "github.com/" not in url:
        return None
    tail = url.split("github.com/", 1)[1]
    part = tail.split("/", 1)[0]
    if not part or part.startswith("?"):
        return None
    return part


# ── Pattern detectors / scoring ──────────────────────────────────────────────


def detect_ai_signals(tech_stack: dict[str, Any], repos: list[dict[str, Any]]) -> list[dict[str, Any]]:
    signals: list[dict[str, Any]] = []
    seen_topics: set[str] = set()
    for repo in repos:
        topics = repo.get("topics") or []
        for topic in topics:
            if any(t in topic for t in AI_TOPICS) and topic not in seen_topics:
                signals.append({"kind": "topic", "value": topic})
                seen_topics.add(topic)
        name_l = (repo.get("name") or "").lower()
        if any(h in name_l for h in AI_NAME_HINTS):
            signals.append({"kind": "repo_name", "repo": repo.get("name")})
    for fw in tech_stack.get("ai_frameworks", []):
        repo_name = ""
        for r in repos:
            nl = (r.get("name") or "").lower()
            dl = (r.get("description") or "").lower()
            topics = r.get("topics") or []
            if fw in nl or fw in dl or any(fw in t for t in topics):
                repo_name = r.get("name") or ""
                break
        signals.append({"kind": "framework", "name": fw, "repo": repo_name})
    total = sum(tech_stack.get("languages", {}).values())
    if total > 0:
        python = tech_stack.get("languages", {}).get("Python", 0)
        if python / total >= 0.60:
            signals.append({
                "kind": "python_heavy",
                "python_bytes": python,
                "total_bytes": total,
            })
    return signals


def score_ai(signals: list[dict[str, Any]], tech_stack: dict[str, Any]) -> float:
    pts = 0.0
    for s in signals:
        kind = s.get("kind")
        if kind == "framework":
            pts += 0.20
        elif kind == "python_heavy":
            pts += 0.15
        elif kind == "topic":
            pts += 0.08
        elif kind == "repo_name":
            pts += 0.04
    for dep in tech_stack.get("dep_signals", []):
        if dep.get("kind") == "ai_package":
            pts += 0.12
        elif dep.get("kind") == "vector_db":
            pts += 0.10
    readme = tech_stack.get("readme") or {}
    pts += len(readme.get("ai_mentions") or []) * 0.04
    if len(tech_stack.get("ai_frameworks") or []) >= 3:
        pts += 0.12
    if len(tech_stack.get("dep_signals") or []) >= 3:
        pts += 0.10
    return min(pts, 1.0)


def score_activity(summary: dict[str, Any]) -> float:
    pts = 0.0
    total_repos = summary.get("total_repos") or 0
    if total_repos > 0:
        pts += (summary.get("active_repos", 0) / total_repos) * 0.30
    pts += min(summary.get("avg_weekly_commits", 0) / 50.0, 0.25)
    pts += min(summary.get("releases_last_90d", 0) / 4.0, 0.20)
    pts += min(summary.get("total_contributors", 0) / 20.0, 0.15)
    pts += min(summary.get("total_stars", 0) / 1000.0, 0.10)
    return min(pts, 1.0)


def score_hiring(signals: list[dict[str, Any]], tech_stack: dict[str, Any]) -> float:
    pts = 0.0
    for s in signals:
        kind = s.get("kind")
        if kind == "frequent_releases":
            pts += min(s.get("releases_per_month", 0.0) / 4.0, 0.25)
        elif kind == "growing_contributors":
            pts += min(s.get("contributor_count", 0) / 20.0, 0.20)
        elif kind == "new_repo":
            pts += 0.15
        elif kind == "tech_migration":
            pts += 0.10
    readme = tech_stack.get("readme") or {}
    if readme.get("hiring"):
        pts += 0.20
    return min(pts, 1.0)


# ── README + deps ────────────────────────────────────────────────────────────


def extract_readme_signals(content: str) -> dict[str, Any]:
    if not content:
        return {}
    lower = content.lower()
    hiring = any(kw in lower for kw in HIRING_KEYWORDS)
    ai_mentions = [kw for kw in AI_README_KEYWORDS if kw in lower]
    has_ci_badge = "![" in lower and ("build" in lower or "ci" in lower or "workflow" in lower)
    has_docker = "docker" in lower or "dockerfile" in lower or "container" in lower
    word_count = len(content.split())
    has_quality = any(s in lower for s in README_QUALITY_SIGNALS)
    return {
        "hiring": hiring,
        "ai_mentions": ai_mentions,
        "has_ci_badge": has_ci_badge,
        "has_docker": has_docker,
        "word_count": word_count,
        "has_quality_signals": has_quality,
    }


async def fetch_readme(client: GhClient, owner: str, repo: str) -> dict[str, Any] | None:
    for name in ("README.md", "README.rst", "README.txt", "README"):
        try:
            content = await client.get_file_content(owner, repo, name)
        except _RateLimitError:
            raise
        except Exception:  # noqa: BLE001
            continue
        if content:
            return extract_readme_signals(content)
    return None


def _pep508_name(s: str) -> str:
    for sep in (">", "<", "=", "~", "[", ";", " "):
        s = s.split(sep, 1)[0]
    return s.strip().lower()


def _parse_requirements(content: str) -> list[dict[str, Any]]:
    signals: list[dict[str, Any]] = []
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("-") or "://" in line:
            continue
        name = _pep508_name(line)
        if not name:
            continue
        if name in PYTHON_AI or name.replace("-", "_") in PYTHON_AI:
            signals.append({"kind": "ai_package", "manager": "pip", "name": name})
        elif name in PYTHON_VECTOR_DB:
            signals.append({"kind": "vector_db", "name": name})
    return signals


def _parse_pyproject(content: str) -> list[dict[str, Any]]:
    try:
        # Python 3.11+ stdlib tomllib; fall back to nothing if older.
        import tomllib  # type: ignore[import-not-found]
    except Exception:  # noqa: BLE001
        return []
    try:
        data = tomllib.loads(content)
    except Exception:  # noqa: BLE001
        return []
    signals: list[dict[str, Any]] = []
    proj = (data.get("project") or {}).get("dependencies") or []
    if isinstance(proj, list):
        for item in proj:
            if isinstance(item, str):
                name = _pep508_name(item)
                if name in PYTHON_AI:
                    signals.append({"kind": "ai_package", "manager": "pip", "name": name})
                elif name in PYTHON_VECTOR_DB:
                    signals.append({"kind": "vector_db", "name": name})
    poetry = (((data.get("tool") or {}).get("poetry") or {}).get("dependencies") or {})
    if isinstance(poetry, dict):
        for key in poetry.keys():
            name = key.lower()
            if name in PYTHON_AI:
                signals.append({"kind": "ai_package", "manager": "pip", "name": name})
            elif name in PYTHON_VECTOR_DB:
                signals.append({"kind": "vector_db", "name": name})
    return signals


def _parse_package_json(content: str) -> list[dict[str, Any]]:
    try:
        data = json.loads(content)
    except Exception:  # noqa: BLE001
        return []
    signals: list[dict[str, Any]] = []
    for section in ("dependencies", "devDependencies", "peerDependencies"):
        obj = data.get(section) or {}
        if not isinstance(obj, dict):
            continue
        for key in obj.keys():
            if key in JS_AI:
                signals.append({"kind": "ai_package", "manager": "npm", "name": key})
    return signals


def _parse_cargo_toml(content: str) -> list[dict[str, Any]]:
    try:
        import tomllib  # type: ignore[import-not-found]
    except Exception:  # noqa: BLE001
        return []
    try:
        data = tomllib.loads(content)
    except Exception:  # noqa: BLE001
        return []
    signals: list[dict[str, Any]] = []
    for section in ("dependencies", "dev-dependencies", "build-dependencies"):
        obj = data.get(section) or {}
        if not isinstance(obj, dict):
            continue
        for key in obj.keys():
            if key in RUST_AI:
                signals.append({"kind": "ai_package", "manager": "cargo", "name": key})
    return signals


def parse_manifest(path: str, content: str) -> list[dict[str, Any]]:
    if path.endswith("requirements.txt") or path.endswith("requirements/base.txt") \
            or path.endswith("requirements/prod.txt"):
        return _parse_requirements(content)
    if path.endswith("pyproject.toml") or path.endswith("setup.cfg"):
        return _parse_pyproject(content)
    if path.endswith("package.json"):
        return _parse_package_json(content)
    if path.endswith("Cargo.toml"):
        return _parse_cargo_toml(content)
    return []


async def scan_repo_deps(client: GhClient, owner: str, repo: str) -> list[dict[str, Any]]:
    signals: list[dict[str, Any]] = []
    for path in MANIFEST_PATHS:
        try:
            content = await client.get_file_content(owner, repo, path)
        except _RateLimitError:
            raise
        except Exception:  # noqa: BLE001
            continue
        if not content:
            continue
        signals.extend(parse_manifest(path, content))
        if path.endswith(".txt") and signals:
            break
    # Dedup by name
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for s in signals:
        key = s.get("name") or ""
        if key and key not in seen:
            seen.add(key)
            out.append(s)
    return out


# ── Tech stack aggregation ───────────────────────────────────────────────────


async def aggregate_tech_stack(client: GhClient, org: str, repos: list[dict[str, Any]]) -> dict[str, Any]:
    non_fork = [r for r in repos if not r.get("fork")][:20]

    # Parallel language fetch
    lang_tasks = [client.repo_languages(org, r.get("name", "")) for r in non_fork]
    lang_results = await asyncio.gather(*lang_tasks, return_exceptions=True)

    languages: dict[str, int] = {}
    for r, res in zip(non_fork, lang_results):
        if isinstance(res, Exception) or not isinstance(res, dict):
            continue
        for lang, bytes_ in res.items():
            languages[lang] = languages.get(lang, 0) + int(bytes_ or 0)

    # Topic/name scan
    ai_frameworks: list[str] = []
    infra_tools: list[str] = []
    cloud_providers: list[str] = []

    def _push(bucket: list[str], candidates: tuple[str, ...], topics: list[str], name_l: str, desc_l: str) -> None:
        for c in candidates:
            if c in bucket:
                continue
            if any(c in t for t in topics) or c in name_l or c in desc_l:
                bucket.append(c)

    for r in repos:
        topics = r.get("topics") or []
        name_l = (r.get("name") or "").lower()
        desc_l = (r.get("description") or "").lower() if r.get("description") else ""
        _push(ai_frameworks, AI_FRAMEWORKS, topics, name_l, desc_l)
        _push(infra_tools, INFRA_TOOLS, topics, name_l, desc_l)
        _push(cloud_providers, CLOUD_PROVIDERS, topics, name_l, desc_l)

    # Parallel dep scanning (top 10 non-fork)
    dep_candidates = [r for r in repos if not r.get("fork")][:10]
    dep_tasks = [scan_repo_deps(client, org, r.get("name", "")) for r in dep_candidates]
    dep_results = await asyncio.gather(*dep_tasks, return_exceptions=True)

    dep_signals: list[dict[str, Any]] = []
    seen_names: set[str] = set()
    for res in dep_results:
        if isinstance(res, Exception):
            continue
        for s in res:
            key = s.get("name") or ""
            if key and key not in seen_names:
                seen_names.add(key)
                dep_signals.append(s)

    # README from the most-starred non-fork repo
    readme_signals: dict[str, Any] | None = None
    non_fork_all = [r for r in repos if not r.get("fork")]
    if non_fork_all:
        primary = max(non_fork_all, key=lambda r: r.get("stargazers_count") or 0)
        try:
            readme_signals = await fetch_readme(client, org, primary.get("name", ""))
        except _RateLimitError:
            readme_signals = None

    # Merge framework names from deps into ai_frameworks
    for sig in dep_signals:
        if sig.get("kind") == "ai_package":
            name_l = (sig.get("name") or "").lower()
            if name_l and name_l not in ai_frameworks:
                ai_frameworks.append(name_l)

    primary_language = max(languages.items(), key=lambda kv: kv[1])[0] if languages else None

    return {
        "languages": languages,
        "primary_language": primary_language,
        "ai_frameworks": ai_frameworks,
        "infra_tools": infra_tools,
        "cloud_providers": cloud_providers,
        "dep_signals": dep_signals,
        "readme": readme_signals,
    }


# ── Activity + hiring detectors ──────────────────────────────────────────────


async def summarise_activity(client: GhClient, org: str, repos: list[dict[str, Any]]) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    cutoff_90d = now - timedelta(days=90)

    def _parse_pushed(r: dict[str, Any]) -> datetime | None:
        return _parse_iso(r.get("pushed_at") or "")

    total_repos = len(repos)
    active_repos = sum(1 for r in repos if (p := _parse_pushed(r)) and p > cutoff_90d)
    total_stars = sum((r.get("stargazers_count") or 0) for r in repos)
    last_push = max(
        (p for r in repos if (p := _parse_pushed(r))), default=None
    )

    sample = [r for r in repos if not r.get("fork")][:5]
    commit_tasks = [client.repo_commit_activity(org, r.get("name", "")) for r in sample]
    contrib_tasks = [client.repo_contributors(org, r.get("name", "")) for r in sample]
    release_tasks = [client.repo_releases(org, r.get("name", "")) for r in sample]

    commit_results, contrib_results, release_results = await asyncio.gather(
        asyncio.gather(*commit_tasks, return_exceptions=True),
        asyncio.gather(*contrib_tasks, return_exceptions=True),
        asyncio.gather(*release_tasks, return_exceptions=True),
    )

    total_weekly = 0.0
    sampled = 0
    for res in commit_results:
        if isinstance(res, Exception) or not res:
            continue
        weekly = sum(int(w.get("total") or 0) for w in res)
        total_weekly += weekly / max(len(res), 1)
        sampled += 1
    avg_weekly_commits = total_weekly / sampled if sampled else 0.0

    logins: set[str] = set()
    for res in contrib_results:
        if isinstance(res, Exception) or not res:
            continue
        for c in res:
            logins.add(c.get("login") or "")

    releases_last_90d = 0
    for res in release_results:
        if isinstance(res, Exception) or not res:
            continue
        for rel in res:
            published = _parse_iso(rel.get("published_at") or "")
            if published and published > cutoff_90d:
                releases_last_90d += 1

    return {
        "total_repos": total_repos,
        "active_repos": active_repos,
        "avg_weekly_commits": avg_weekly_commits,
        "total_stars": total_stars,
        "total_contributors": len(logins),
        "last_push": last_push.isoformat() if last_push else None,
        "releases_last_90d": releases_last_90d,
    }


async def detect_hiring_signals(client: GhClient, org: str, repos: list[dict[str, Any]]) -> list[dict[str, Any]]:
    NEW_REPO_DAYS = 60
    now = datetime.now(timezone.utc)
    new_cutoff = now - timedelta(days=NEW_REPO_DAYS)
    cutoff_90d = now - timedelta(days=90)
    signals: list[dict[str, Any]] = []

    for repo in repos:
        if repo.get("fork"):
            continue
        created = _parse_iso(repo.get("created_at") or "")
        pushed = _parse_iso(repo.get("pushed_at") or "")
        name = repo.get("name") or ""

        if created and created > new_cutoff:
            signals.append({
                "kind": "new_repo",
                "name": name,
                "days_ago": max(0, (now - created).days),
            })
            lang = repo.get("language")
            if lang in ("Rust", "Go", "Zig"):
                signals.append({
                    "kind": "tech_migration",
                    "new_language": lang,
                    "repo": name,
                })

        if pushed and pushed > cutoff_90d:
            try:
                contribs = await client.repo_contributors(org, name)
                if len(contribs) >= 5:
                    signals.append({
                        "kind": "growing_contributors",
                        "repo": name,
                        "contributor_count": len(contribs),
                    })
            except Exception as e:  # noqa: BLE001
                log.debug("contributor fetch %s/%s: %s", org, name, e)

        try:
            releases = await client.repo_releases(org, name)
            if releases:
                recent = sum(
                    1 for r in releases
                    if (p := _parse_iso(r.get("published_at") or "")) and p > cutoff_90d
                )
                rate = recent / 3.0
                if rate >= 1.5:
                    signals.append({
                        "kind": "frequent_releases",
                        "repo": name,
                        "releases_per_month": rate,
                    })
        except Exception as e:  # noqa: BLE001
            log.debug("releases %s/%s: %s", org, name, e)

    return signals


# ── Whole-org analysis ───────────────────────────────────────────────────────


async def analyse_org(client: GhClient, org: str, max_repos: int = 30) -> dict[str, Any]:
    log.info("analysing org: %s", org)
    repos = await client.org_repos(org, per_page=max_repos) or []
    tech_stack = await aggregate_tech_stack(client, org, repos)
    ai_signals = detect_ai_signals(tech_stack, repos)
    ai_score = score_ai(ai_signals, tech_stack)
    activity = await summarise_activity(client, org, repos)
    activity_score = score_activity(activity)
    hiring_signals = await detect_hiring_signals(client, org, repos)
    hiring_score = score_hiring(hiring_signals, tech_stack)
    return {
        "org": org,
        "ai_score": ai_score,
        "activity_score": activity_score,
        "hiring_score": hiring_score,
        "tech_stack": tech_stack,
        "ai_signals": ai_signals,
        "hiring_signals": hiring_signals,
        "activity": activity,
    }


# ── Derived tags (from `store.rs::derive_tags`) ──────────────────────────────


def derive_tags(p: dict[str, Any]) -> list[str]:
    tags = ["github:analyzed"]
    ai = p.get("ai_score", 0.0)
    hiring = p.get("hiring_score", 0.0)
    activity = p.get("activity_score", 0.0)
    if ai > 0.60:
        tags.append("github:ai-native")
    elif ai > 0.25:
        tags.append("github:ai-adjacent")
    if hiring > 0.30:
        tags.append("github:hiring")
    readme = (p.get("tech_stack") or {}).get("readme") or {}
    if readme.get("hiring"):
        tags.append("github:hiring-readme")
    if activity > 0.50:
        tags.append("github:active")
    if activity > 0.50 and hiring > 0.20:
        tags.append("github:growing")

    languages = (p.get("tech_stack") or {}).get("languages") or {}
    total_bytes = sum(languages.values())
    if total_bytes > 0:
        python = languages.get("Python", 0)
        if python / total_bytes > 0.60:
            tags.append("github:python-heavy")

    primary = (p.get("tech_stack") or {}).get("primary_language")
    if primary == "Rust":
        tags.append("github:rust-native")
    if primary == "Go":
        tags.append("github:go-native")
    if primary == "TypeScript":
        tags.append("github:typescript-native")

    dep_signals = (p.get("tech_stack") or {}).get("dep_signals") or []
    if any(d.get("kind") == "vector_db" for d in dep_signals):
        tags.append("github:vector-db")

    ml_training_pkgs = {"torch", "tensorflow", "jax", "deepspeed", "accelerate", "trl", "peft"}
    if any(d.get("kind") == "ai_package" and (d.get("name") or "") in ml_training_pkgs for d in dep_signals):
        tags.append("github:ml-training")

    llm_pkgs = {"openai", "anthropic", "langchain", "langchain-core", "llamaindex", "llama_index", "litellm", "vllm"}
    llm_frameworks = {"langchain", "llamaindex", "openai", "anthropic"}
    has_llm = any(d.get("kind") == "ai_package" and (d.get("name") or "") in llm_pkgs for d in dep_signals) or \
        any(f in llm_frameworks for f in ((p.get("tech_stack") or {}).get("ai_frameworks") or []))
    if has_llm:
        tags.append("github:llm-consumer")

    infra = (p.get("tech_stack") or {}).get("infra_tools") or []
    if any(t in ("kubernetes", "k8s") for t in infra):
        tags.append("github:k8s")
    return tags


def merge_tags(existing_json: str | None, new_tags: list[str]) -> list[str]:
    existing: list[str] = []
    if existing_json:
        try:
            parsed = json.loads(existing_json)
            if isinstance(parsed, list):
                existing = [str(t) for t in parsed]
        except Exception:  # noqa: BLE001
            pass
    existing = [t for t in existing if not t.startswith("github:")]
    existing.extend(new_tags)
    return existing


# ── Contributor scoring (rising / strength / quality) ────────────────────────


def _tanh(x: float) -> float:
    try:
        return math.tanh(x)
    except OverflowError:
        return 1.0 if x > 0 else -1.0


def compute_contribution_quality(
    login: str,
    contributed_repos_json: str | None,
    top_repos_json: str | None,
) -> float:
    try:
        own = json.loads(top_repos_json) if top_repos_json else []
    except Exception:  # noqa: BLE001
        own = []
    try:
        contributed = json.loads(contributed_repos_json) if contributed_repos_json else []
    except Exception:  # noqa: BLE001
        contributed = []
    if not own and not contributed:
        return 0.0

    if own:
        max_stars = max((r.get("stars") or 0) for r in own)
        own_project_impact = math.log(max_stars + 1) / math.log(100_001)
    else:
        own_project_impact = 0.0

    login_prefix = f"{login}/"
    external = [r for r in contributed if not (r.get("name_with_owner") or "").startswith(login_prefix)]
    external_ratio = (len(external) / len(contributed)) if contributed else 0.0

    if external:
        star_scores = sorted(
            (math.log((r.get("stars") or 0) + 1) / math.log(100_001) for r in external),
            reverse=True,
        )
        top_n = min(len(star_scores), 3)
        star_quality = sum(star_scores[:top_n]) / top_n if top_n else 0.0
    else:
        star_quality = 0.0

    external_breadth = min(len(external) / 5.0, 1.0)

    ai_total = 0
    repo_count = 0
    for r in contributed:
        repo_count += 1
        topics = r.get("topics") or []
        if any(t in AI_RELEVANT_TOPICS for t in topics):
            ai_total += 1
    for r in own:
        repo_count += 1
        name_lower = (r.get("name") or "").lower()
        if any(kw in name_lower for kw in AI_RELEVANT_TOPICS):
            ai_total += 1
    ai_relevance = (ai_total / repo_count) if repo_count else 0.0

    score = (
        0.30 * own_project_impact
        + 0.18 * external_ratio
        + 0.25 * star_quality
        + 0.10 * external_breadth
        + 0.17 * ai_relevance
    )
    return max(0.0, min(1.0, score))


def compute_rising_score(record: dict[str, Any], skill_count: int) -> dict[str, float]:
    user = record.get("user") or {}
    followers = float(user.get("followers") or 0)
    total_contribs = float(record.get("total_contributions") or 0)
    public_repos = float(user.get("public_repos") or 0)
    repos_count = float(len(record.get("repos") or []))
    created_at = _parse_iso(user.get("created_at") or "") or datetime.now(timezone.utc)
    updated_at = _parse_iso(user.get("updated_at") or "") or datetime.now(timezone.utc)
    now = datetime.now(timezone.utc)
    account_age_days = max(1, (now - created_at).days)

    contribution_density = _tanh((total_contribs / (followers + 1.0)) / 50.0)
    novelty = max(0.0, 1.0 - account_age_days / (365.0 * 10.0))
    breadth = min(repos_count / 5.0, 1.0)

    commits = float(user.get("total_commit_contributions") or user.get("public_repos") or 0)
    prs = float(user.get("total_pr_contributions") or 0)
    reviews = float(user.get("total_review_contributions") or 0)
    activity = (
        min(commits / 200.0, 1.0) * 0.5
        + min(prs / 50.0, 1.0) * 0.3
        + min(reviews / 30.0, 1.0) * 0.2
    )
    skill_relevance = min(skill_count / 8.0, 1.0)

    days_since_update = (now - updated_at).days
    engagement_bits = [
        bool(user.get("email")),
        user.get("hireable") is True,
        bool(user.get("blog")),
        bool(user.get("twitter_username")),
        days_since_update < 90,
    ]
    engagement = sum(engagement_bits) / 5.0

    obscurity = 1.0 / (1.0 + followers / 500.0)

    ap = user.get("activity_profile")
    if ap:
        days_since = float(ap.get("days_since_last_active") or 365)
        calendar_recency = max(0.0, 1.0 - days_since / 180.0)
        frequency_signal = min((ap.get("avg_daily_90d") or 0.0) / 2.0, 1.0)
        trend_bonus_map = {
            "rising": 1.0, "stable": 0.7, "new": 0.5,
            "declining": 0.3, "dormant": 0.0,
        }
        trend_bonus = trend_bonus_map.get(ap.get("activity_trend") or "", 0.3)
        recency = 0.5 * calendar_recency + 0.3 * frequency_signal + 0.2 * trend_bonus
    else:
        if days_since_update < 30:
            recency = 0.6
        elif days_since_update < 90:
            recency = 0.3
        else:
            recency = 0.0

    presence = public_repos + followers
    realness = 0.5 + 0.5 * _tanh(presence * 0.2)

    contribution_quality = compute_contribution_quality(
        user.get("login") or "",
        user.get("contributed_repos_json"),
        user.get("top_repos_json"),
    )

    w_d, w_n, w_b, w_a, w_s, w_e, w_o, w_r, w_cq = RISING_WEIGHTS
    raw = (
        w_d * contribution_density
        + w_n * novelty
        + w_b * breadth
        + w_a * activity
        + w_s * skill_relevance
        + w_e * engagement
        + w_o * obscurity
        + w_r * recency
        + w_cq * contribution_quality
    )
    hireable_bonus = 1.15 if user.get("hireable") is True else 1.0
    if ap:
        d = ap.get("days_since_last_active")
        if d is not None and d <= 7:
            recency_bonus = 1.15
        elif d is not None and d <= 30:
            recency_bonus = 1.10
        elif d is not None and d <= 90:
            recency_bonus = 1.05
        else:
            recency_bonus = 1.0
    else:
        if days_since_update <= 30:
            recency_bonus = 1.10
        elif days_since_update <= 90:
            recency_bonus = 1.05
        else:
            recency_bonus = 1.0

    score = max(0.0, min(1.0, raw * realness * hireable_bonus * recency_bonus))
    return {
        "score": score,
        "contribution_density": contribution_density,
        "novelty": novelty,
        "breadth": breadth,
        "activity": activity,
        "skill_relevance": skill_relevance,
        "engagement": engagement,
        "obscurity": obscurity,
        "realness": realness,
        "recency": recency,
        "contribution_quality": contribution_quality,
    }


def compute_strength_score(record: dict[str, Any], skill_count: int) -> dict[str, float]:
    user = record.get("user") or {}
    followers = float(user.get("followers") or 0)
    public_repos = float(user.get("public_repos") or 0)
    repos_count = float(len(record.get("repos") or []))
    updated_at = _parse_iso(user.get("updated_at") or "") or datetime.now(timezone.utc)
    now = datetime.now(timezone.utc)
    days_since_update = (now - updated_at).days

    commits = float(user.get("total_commit_contributions") or user.get("public_repos") or 0)
    prs = float(user.get("total_pr_contributions") or 0)
    reviews = float(user.get("total_review_contributions") or 0)
    activity = (
        min(commits / 200.0, 1.0) * 0.5
        + min(prs / 50.0, 1.0) * 0.3
        + min(reviews / 30.0, 1.0) * 0.2
    )
    skill_depth = min(skill_count / 8.0, 1.0)
    breadth = min(repos_count / 5.0, 1.0)

    log_followers = math.log(followers + 1.0) / math.log(10_001.0)
    try:
        orgs = json.loads(user.get("organizations_json") or "[]")
    except Exception:  # noqa: BLE001
        orgs = []
    org_signal = min(len(orgs) / 3.0, 1.0)
    hireable_signal = 1.0 if user.get("hireable") is True else 0.0
    email_signal = 1.0 if user.get("email") else 0.0
    standing = log_followers * 0.5 + org_signal * 0.25 + hireable_signal * 0.15 + email_signal * 0.10

    engagement_bits = [
        bool(user.get("email")),
        user.get("hireable") is True,
        bool(user.get("blog")),
        bool(user.get("twitter_username")),
        days_since_update < 90,
    ]
    engagement = sum(engagement_bits) / 5.0

    presence = public_repos + followers
    realness = 0.5 + 0.5 * _tanh(presence * 0.2)

    contribution_quality = compute_contribution_quality(
        user.get("login") or "",
        user.get("contributed_repos_json"),
        user.get("top_repos_json"),
    )

    w_a, w_s, w_b, w_st, w_e, w_r, w_cq = STRENGTH_WEIGHTS
    raw = (
        w_a * activity + w_s * skill_depth + w_b * breadth
        + w_st * standing + w_e * engagement + w_r * realness
        + w_cq * contribution_quality
    )
    ap = user.get("activity_profile")
    if ap:
        d = ap.get("days_since_last_active")
        if d is not None and d <= 7:
            recency_bonus = 1.15
        elif d is not None and d <= 30:
            recency_bonus = 1.10
        elif d is not None and d <= 90:
            recency_bonus = 1.05
        else:
            recency_bonus = 1.0
    else:
        if days_since_update <= 30:
            recency_bonus = 1.10
        elif days_since_update <= 90:
            recency_bonus = 1.05
        else:
            recency_bonus = 1.0

    score = max(0.0, min(1.0, raw * realness * recency_bonus))
    return {
        "score": score,
        "activity": activity,
        "skill_depth": skill_depth,
        "breadth": breadth,
        "standing": standing,
        "engagement": engagement,
        "realness": realness,
        "contribution_quality": contribution_quality,
    }


def compute_opp_skill_match(candidate_skills: Sequence[str], opp_skills: Sequence[str]) -> float:
    if not opp_skills:
        return 0.0
    matched = sum(1 for s in candidate_skills if s in opp_skills)
    return max(0.0, min(1.0, matched / len(opp_skills)))


# ── ICP feature bridge (was `icp_bridge.rs`) ─────────────────────────────────


def candidate_to_features(candidate: dict[str, Any]) -> list[float]:
    """Map a candidate dict to a flat feature vector for ML scorers.

    Matches the Rust ``icp_bridge::candidate_to_features`` shape (13 floats
    in [0, 1]). Used by downstream scorers that don't want a full embedding.
    """
    followers = float(candidate.get("followers") or 0)
    public_repos = float(candidate.get("public_repos") or 0)
    ai_repos = float(candidate.get("ai_repos_count") or 0)
    return [
        float(candidate.get("rising_score") or 0.0),
        float(candidate.get("contribution_density") or 0.0),
        float(candidate.get("novelty") or 0.0),
        float(candidate.get("breadth") or 0.0),
        float(candidate.get("realness") or 0.0),
        min(math.log(followers + 1.0) / math.log(10_001.0), 1.0),
        min(public_repos / 50.0, 1.0),
        min(ai_repos / 5.0, 1.0),
        1.0 - min((candidate.get("days_since_last_active") or 365) / 365.0, 1.0),
        min((candidate.get("contributions_90d") or 0) / 200.0, 1.0),
        float(candidate.get("strength_score") or 0.0),
        float(candidate.get("opp_skill_match") or 0.0),
        float(candidate.get("contribution_quality") or 0.0),
    ]


async def candidate_to_embedding(candidate: dict[str, Any]) -> list[float]:
    """Return a BGE-M3 embedding of the candidate's skills text.

    Swaps in for the Rust crate's Candle-based `embed` module. Returns a
    1024-dim L2-normalized vector (see :mod:`embeddings`).
    """
    text = contributor_skills_text(
        candidate.get("bio"),
        candidate.get("company"),
        json.dumps(candidate.get("repos") or []),
        candidate.get("pinned_repos_json"),
        candidate.get("contributed_repos_json"),
        candidate.get("top_repos_json"),
    )
    if not text.strip():
        return [0.0] * EMBED_DIM
    vecs = await embed_texts([text])
    return vecs[0] if vecs else [0.0] * EMBED_DIM


# ── DB (psycopg) helpers ─────────────────────────────────────────────────────


def _dsn() -> str:
    dsn = (os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL") or "").strip()
    if not dsn:
        raise RuntimeError("NEON_DATABASE_URL / DATABASE_URL not set")
    return dsn


async def _ensure_tables() -> None:
    """Create gh_org_patterns / gh_contributor_embeddings if missing.

    ``companies`` is expected to already have github_* columns (see migration
    0000). We only own the two gh_* tables here.
    """
    dsn = _dsn()
    ddl_patterns = """
    CREATE TABLE IF NOT EXISTS gh_org_patterns (
        org              text PRIMARY KEY,
        ai_score         real NOT NULL,
        hiring_score     real NOT NULL,
        activity_score   real NOT NULL,
        patterns_json    jsonb NOT NULL,
        tags             jsonb NOT NULL DEFAULT '[]'::jsonb,
        analyzed_at      timestamptz NOT NULL DEFAULT now()
    );
    """
    ddl_embed = f"""
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE TABLE IF NOT EXISTS gh_contributor_embeddings (
        login                  text PRIMARY KEY,
        github_id              bigint,
        html_url               text,
        name                   text,
        email                  text,
        company                text,
        location               text,
        bio                    text,
        blog                   text,
        twitter_username       text,
        public_repos           integer,
        followers              integer,
        hireable               boolean,
        gh_created_at          text,
        gh_updated_at          text,
        repos_json             jsonb,
        total_contributions    integer,
        rising_score           real,
        strength_score         real,
        contribution_density   real,
        novelty                real,
        breadth                real,
        realness               real,
        skills_json            jsonb,
        account_age_days       integer,
        last_active_date       text,
        days_since_last_active integer,
        contributions_30d      integer,
        contributions_90d      integer,
        contributions_365d     integer,
        current_streak_days    integer,
        activity_trend         text,
        recency                real,
        contribution_quality   real,
        opp_skill_match        real,
        position_level         text,
        embedding              vector({EMBED_DIM}),
        inserted_at            timestamptz NOT NULL DEFAULT now()
    );
    """
    async with await psycopg.AsyncConnection.connect(dsn, autocommit=True) as conn:
        async with conn.cursor() as cur:
            await cur.execute(ddl_patterns)
            await cur.execute(ddl_embed)


async def save_org_patterns(
    company_id: int | None,
    company_key: str,
    github_url: str,
    patterns: dict[str, Any],
    existing_tags_json: str | None,
) -> int | None:
    """Persist OrgPatterns to Neon.

    Writes to both:
    * ``companies`` (when ``company_id`` is known, or inserted-by-key via
      ``ON CONFLICT (key)``) — keeps score columns and tags fresh.
    * ``gh_org_patterns`` — dedicated table keyed by org login (Python port
      of the Rust crate's Lance-less pattern store).

    Returns the ``companies.id`` when known/inserted, else ``None``.
    """
    new_tags = derive_tags(patterns)
    merged = merge_tags(existing_tags_json, new_tags)
    tags_json = json.dumps(merged)
    patterns_json = json.dumps(patterns, default=str)
    org = patterns.get("org") or ""

    dsn = _dsn()
    async with await psycopg.AsyncConnection.connect(dsn, autocommit=True) as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO gh_org_patterns (org, ai_score, hiring_score, activity_score, patterns_json, tags, analyzed_at)
                VALUES (%s, %s, %s, %s, %s::jsonb, %s::jsonb, now())
                ON CONFLICT (org) DO UPDATE SET
                    ai_score       = EXCLUDED.ai_score,
                    hiring_score   = EXCLUDED.hiring_score,
                    activity_score = EXCLUDED.activity_score,
                    patterns_json  = EXCLUDED.patterns_json,
                    tags           = EXCLUDED.tags,
                    analyzed_at    = now()
                """,
                (
                    org,
                    float(patterns.get("ai_score") or 0.0),
                    float(patterns.get("hiring_score") or 0.0),
                    float(patterns.get("activity_score") or 0.0),
                    patterns_json,
                    tags_json,
                ),
            )

            if company_id is not None:
                await cur.execute(
                    """
                    UPDATE companies SET
                        github_url            = %s,
                        github_org            = %s,
                        github_ai_score       = %s,
                        github_hiring_score   = %s,
                        github_activity_score = %s,
                        github_patterns       = %s,
                        github_analyzed_at    = now()::text,
                        tags                  = %s,
                        updated_at            = now()::text
                    WHERE id = %s
                    """,
                    (
                        github_url, org,
                        float(patterns.get("ai_score") or 0.0),
                        float(patterns.get("hiring_score") or 0.0),
                        float(patterns.get("activity_score") or 0.0),
                        patterns_json, tags_json, company_id,
                    ),
                )
                return company_id

            await cur.execute(
                """
                INSERT INTO companies
                  (key, name, github_url, github_org,
                   github_ai_score, github_hiring_score, github_activity_score,
                   github_patterns, github_analyzed_at, tags, category)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, now()::text, %s, 'UNKNOWN')
                ON CONFLICT (key) DO UPDATE SET
                    github_url            = EXCLUDED.github_url,
                    github_org            = EXCLUDED.github_org,
                    github_ai_score       = EXCLUDED.github_ai_score,
                    github_hiring_score   = EXCLUDED.github_hiring_score,
                    github_activity_score = EXCLUDED.github_activity_score,
                    github_patterns       = EXCLUDED.github_patterns,
                    github_analyzed_at    = now()::text,
                    tags                  = EXCLUDED.tags,
                    updated_at            = now()::text
                RETURNING id
                """,
                (
                    company_key, org, github_url, org,
                    float(patterns.get("ai_score") or 0.0),
                    float(patterns.get("hiring_score") or 0.0),
                    float(patterns.get("activity_score") or 0.0),
                    patterns_json, tags_json,
                ),
            )
            row = await cur.fetchone()
            return int(row[0]) if row else None


async def upsert_contributor_embedding(
    record: dict[str, Any],
    *,
    skills: list[str],
    rising: dict[str, float],
    strength: dict[str, float],
    opp_skill_match: float,
    position_level: str | None,
    embedding: list[float] | None,
) -> None:
    user = record.get("user") or {}
    ap = user.get("activity_profile") or {}
    dsn = _dsn()
    emb_literal = vector_to_pg_literal(embedding) if embedding else None
    async with await psycopg.AsyncConnection.connect(dsn, autocommit=True) as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO gh_contributor_embeddings (
                    login, github_id, html_url, name, email, company, location, bio,
                    blog, twitter_username, public_repos, followers, hireable,
                    gh_created_at, gh_updated_at, repos_json, total_contributions,
                    rising_score, strength_score, contribution_density, novelty,
                    breadth, realness, skills_json, account_age_days,
                    last_active_date, days_since_last_active, contributions_30d,
                    contributions_90d, contributions_365d, current_streak_days,
                    activity_trend, recency, contribution_quality,
                    opp_skill_match, position_level, embedding
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s::jsonb, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s::jsonb, %s,
                    %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s::vector
                )
                ON CONFLICT (login) DO UPDATE SET
                    rising_score         = EXCLUDED.rising_score,
                    strength_score       = EXCLUDED.strength_score,
                    contribution_density = EXCLUDED.contribution_density,
                    novelty              = EXCLUDED.novelty,
                    breadth              = EXCLUDED.breadth,
                    realness             = EXCLUDED.realness,
                    skills_json          = EXCLUDED.skills_json,
                    recency              = EXCLUDED.recency,
                    contribution_quality = EXCLUDED.contribution_quality,
                    opp_skill_match      = EXCLUDED.opp_skill_match,
                    position_level       = EXCLUDED.position_level,
                    embedding            = EXCLUDED.embedding,
                    inserted_at          = now()
                """,
                (
                    user.get("login"), user.get("id"), user.get("html_url"),
                    user.get("name"), user.get("email"), user.get("company"),
                    user.get("location"), user.get("bio"),
                    user.get("blog"), user.get("twitter_username"),
                    user.get("public_repos"), user.get("followers"),
                    user.get("hireable"),
                    user.get("created_at"), user.get("updated_at"),
                    json.dumps(record.get("repos") or []),
                    int(record.get("total_contributions") or 0),
                    rising.get("score"), strength.get("score"),
                    rising.get("contribution_density"), rising.get("novelty"),
                    rising.get("breadth"), rising.get("realness"),
                    json.dumps(skills),
                    ap.get("account_age_days"), ap.get("last_active_date"),
                    ap.get("days_since_last_active"), ap.get("contributions_30d"),
                    ap.get("contributions_90d"), ap.get("contributions_365d"),
                    ap.get("current_streak_days"), ap.get("activity_trend"),
                    rising.get("recency"), rising.get("contribution_quality"),
                    opp_skill_match, position_level, emb_literal,
                ),
            )


async def load_known_logins() -> set[str]:
    dsn = _dsn()
    async with await psycopg.AsyncConnection.connect(dsn, autocommit=True) as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT login FROM gh_contributor_embeddings")
            rows = await cur.fetchall()
    return {r[0] for r in rows if r and r[0]}


async def save_contributor_contact(
    candidate: dict[str, Any],
    threshold: float,
    extra_tags: Sequence[str],
) -> int | None:
    """Port of `contrib_store::save_contributor_contact`.

    Upserts the candidate into the ``contacts`` table keyed by
    ``github_handle``. Returns the contact id on success, ``None`` when the
    candidate falls below ``threshold``.
    """
    rising = float(candidate.get("rising_score") or 0.0)
    strength = float(candidate.get("strength_score") or 0.0)
    best = max(rising, strength)
    if best < threshold:
        return None

    name = candidate.get("name") or ""
    login = candidate.get("login") or ""
    if name.strip():
        trimmed = name.strip()
        if " " in trimmed:
            first, last = trimmed.split(" ", 1)
        else:
            first, last = trimmed, ""
    else:
        first, last = login, ""

    company = candidate.get("company")
    if isinstance(company, str):
        company = company.lstrip("@").strip() or None

    position = infer_position(candidate.get("bio"))

    def _tier(s: float) -> str:
        return "A" if s >= 0.70 else ("B" if s >= 0.50 else "C")

    rising_tier = _tier(rising)
    strength_tier = _tier(strength)
    tags: list[str] = [
        "github:rising-star", "github:ai-contributor",
        f"github:score:{rising_tier}", f"github:strength:{strength_tier}",
    ]
    opp_match = float(candidate.get("opp_skill_match") or 0.0)
    if opp_match > 0.0:
        tags.append(f"opp:skill-match:{round(opp_match * 100)}pct")
    if position:
        level = infer_seniority_level(position)
        if level >= 0.90:
            label = "staff-plus"
        elif level >= 0.75:
            label = "senior"
        elif level >= 0.50:
            label = "mid"
        else:
            label = "junior"
        tags.append(f"seniority:{label}")
    for s in candidate.get("skills") or []:
        tags.append(f"skill:{s}")
    dsla = candidate.get("days_since_last_active")
    if isinstance(dsla, int):
        if dsla <= 7:
            tags.append("github:active-this-week")
        elif dsla <= 30:
            tags.append("github:active-this-month")
    trend = candidate.get("activity_trend")
    if trend:
        tags.append(f"github:trend:{trend}")
    cq = candidate.get("contribution_quality")
    if isinstance(cq, (int, float)) and cq >= 0.5:
        tags.append("github:quality:external-contributor")

    dominated_weak = (
        rising_tier == "C" and strength_tier == "C" and opp_match <= 0.50
    )
    seniority_mismatch = (
        infer_seniority_level(position) < 0.75 if position else True
    )
    for tag in extra_tags:
        if dominated_weak and seniority_mismatch and tag.startswith("opp:opp_"):
            log.info("dropping %s for %s (weak signals)", tag, login)
            continue
        tags.append(tag)

    dsn = _dsn()
    async with await psycopg.AsyncConnection.connect(dsn, autocommit=True) as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO contacts
                    (first_name, last_name, email, company, position, github_handle, tags, authority_score)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (github_handle) WHERE github_handle IS NOT NULL DO UPDATE SET
                    tags            = EXCLUDED.tags,
                    email           = COALESCE(EXCLUDED.email, contacts.email),
                    company         = COALESCE(EXCLUDED.company, contacts.company),
                    position        = COALESCE(EXCLUDED.position, contacts.position),
                    authority_score = EXCLUDED.authority_score,
                    updated_at      = now()::text
                RETURNING id
                """,
                (
                    first, last,
                    candidate.get("email"), company, position, login,
                    json.dumps(tags), strength,
                ),
            )
            row = await cur.fetchone()
    return int(row[0]) if row else None


# ── Candidate assembly ───────────────────────────────────────────────────────


def build_candidate(
    record: dict[str, Any],
    *,
    skills: list[str],
    rising: dict[str, float],
    strength: dict[str, float],
    opp_skill_match: float,
) -> dict[str, Any]:
    user = record.get("user") or {}
    ap = user.get("activity_profile") or {}
    position = infer_position(user.get("bio"))
    return {
        "login": user.get("login") or "",
        "html_url": user.get("html_url") or "",
        "name": user.get("name"),
        "email": user.get("email"),
        "company": user.get("company"),
        "location": user.get("location"),
        "bio": user.get("bio"),
        "followers": int(user.get("followers") or 0),
        "public_repos": int(user.get("public_repos") or 0),
        "total_contributions": int(record.get("total_contributions") or 0),
        "ai_repos_count": len(record.get("repos") or []),
        "rising_score": rising.get("score", 0.0),
        "contribution_density": rising.get("contribution_density", 0.0),
        "novelty": rising.get("novelty", 0.0),
        "breadth": rising.get("breadth", 0.0),
        "realness": rising.get("realness", 0.0),
        "gh_created_at": user.get("created_at") or "",
        "skills": skills,
        "strength_score": strength.get("score", 0.0),
        "opp_skill_match": opp_skill_match,
        "position_level": position,
        "account_age_days": ap.get("account_age_days"),
        "last_active_date": ap.get("last_active_date"),
        "days_since_last_active": ap.get("days_since_last_active"),
        "contributions_30d": ap.get("contributions_30d"),
        "contributions_90d": ap.get("contributions_90d"),
        "contributions_365d": ap.get("contributions_365d"),
        "current_streak_days": ap.get("current_streak_days"),
        "activity_trend": ap.get("activity_trend"),
        "recency": rising.get("recency"),
        "contribution_quality": rising.get("contribution_quality"),
    }


# ── Command: scan_orgs ───────────────────────────────────────────────────────


async def _cmd_scan_orgs(state: GhPatternsState) -> dict[str, Any]:
    scan_mode = (state.get("scan_mode") or "enrich").lower()
    scan_limit = int(state.get("scan_limit") or 50)
    rescan = bool(state.get("rescan"))
    client = GhClient.from_env()
    await _ensure_tables()
    try:
        if scan_mode == "discover":
            return await _scan_orgs_discover(client, state, scan_limit)
        return await _scan_orgs_enrich(client, scan_limit, rescan)
    finally:
        await client.aclose()


async def _scan_orgs_enrich(client: GhClient, limit: int, rescan: bool) -> dict[str, Any]:
    where = "WHERE github_url IS NOT NULL"
    if not rescan:
        where += " AND github_analyzed_at IS NULL"
    dsn = _dsn()
    processed = 0
    async with await psycopg.AsyncConnection.connect(dsn, autocommit=True) as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                f"SELECT id, key, name, github_url, tags FROM companies {where} "
                f"ORDER BY score DESC NULLS LAST LIMIT %s",
                (limit,),
            )
            rows = await cur.fetchall()
    log.info("enrich: %d companies to scan", len(rows))
    for row in rows:
        company_id, key, name, github_url, tags = row
        org = extract_org_from_url(github_url or "")
        if not org:
            log.warning("cannot extract org from url=%s company=%s", github_url, name)
            continue
        log.info("analysing org=%s company=%s", org, name)
        try:
            patterns = await analyse_org(client, org, max_repos=30)
        except Exception as e:  # noqa: BLE001
            log.warning("analyse_org failed for org=%s: %s", org, e)
            continue
        try:
            await save_org_patterns(company_id, key, github_url, patterns, tags)
            processed += 1
        except Exception as e:  # noqa: BLE001
            log.error("save failed for org=%s: %s", org, e)
        await asyncio.sleep(0.3)
    return {"mode": "enrich", "processed": processed, "total_candidates": len(rows)}


async def _scan_orgs_discover(client: GhClient, state: GhPatternsState, limit: int) -> dict[str, Any]:
    topics_str = state.get("gh_topics") or "llm,machine-learning,langchain,generative-ai"
    min_stars = int(state.get("gh_min_stars") or 50)
    dsn = _dsn()
    existing: set[str] = set()
    async with await psycopg.AsyncConnection.connect(dsn, autocommit=True) as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT github_org FROM companies WHERE github_org IS NOT NULL")
            existing = {r[0] for r in await cur.fetchall() if r and r[0]}
    log.info("discover: %d orgs already in DB", len(existing))

    seen: set[str] = set()
    processed = 0
    for topic in [t.strip() for t in topics_str.split(",") if t.strip()]:
        if processed >= limit:
            break
        log.info("searching topic=%s min_stars=%d", topic, min_stars)
        results = await client.search_repos(topic, min_stars=min_stars, per_page=30)
        for repo in results.get("items") or []:
            if processed >= limit:
                break
            full_name = repo.get("full_name") or ""
            org = full_name.split("/", 1)[0] if "/" in full_name else ""
            if not org or org in existing or org in seen:
                continue
            seen.add(org)
            try:
                await client.org(org)
            except Exception:  # noqa: BLE001
                log.info("skip %s: not an org", org)
                continue
            github_url = f"https://github.com/{org}"
            key = org.lower().replace(".", "-").replace(" ", "-")
            log.info("analysing discovered org=%s", org)
            try:
                patterns = await analyse_org(client, org, max_repos=30)
            except Exception as e:  # noqa: BLE001
                log.warning("analyse_org failed for org=%s: %s", org, e)
                continue
            try:
                await save_org_patterns(None, key, github_url, patterns, None)
                processed += 1
            except Exception as e:  # noqa: BLE001
                log.error("save failed for org=%s: %s", org, e)
            await asyncio.sleep(0.3)
    return {"mode": "discover", "processed": processed}


# ── Command: match_paper_authors ─────────────────────────────────────────────


def _split_name(full: str) -> tuple[str, str]:
    tokens = (full or "").split()
    if not tokens:
        return "", ""
    if len(tokens) == 1:
        return "", tokens[0]
    return tokens[0], tokens[-1]


def _sanitise_qualifier(s: str) -> str:
    return "".join(c for c in (s or "") if c not in '":\\').strip()


def _score_name_match(user: dict[str, Any], first: str, last: str) -> float:
    display = user.get("name") or user.get("login") or ""
    tokens = [
        t.lower() for t in re.split(r"[^A-Za-z]+", display) if t
    ]
    if not tokens:
        return 0.0
    last_lc = (last or "").lower()
    first_lc = (first or "").lower()
    if not last_lc or last_lc not in tokens:
        return 0.0
    if not first_lc:
        return 0.5
    if first_lc in tokens:
        return 0.9
    if len(first_lc) == 1 and tokens[0].startswith(first_lc):
        return 0.75
    login_lc = (user.get("login") or "").lower()
    if first_lc in login_lc and last_lc in login_lc:
        return 0.7
    return 0.5


def _score_paper_author(
    user: dict[str, Any],
    first: str,
    last: str,
    affiliation: str | None,
    email_domain: str | None,
    paper_skills: set[str],
) -> tuple[float, str]:
    name_score = _score_name_match(user, first, last)

    user_skill_text = contributor_skills_text(
        user.get("bio"),
        user.get("company"),
        "[]",
        user.get("pinned_repos_json"),
        user.get("contributed_repos_json"),
        user.get("top_repos_json"),
    )
    user_skills = set(extract_skills(user_skill_text))
    if paper_skills:
        overlap = len(user_skills & paper_skills)
        topical_score = min(overlap / len(paper_skills), 1.0)
    else:
        topical_score = 0.0

    affil_score = 0.0
    if affiliation and affiliation.strip():
        needle = affiliation.lower()
        haystack = " ".join([
            (user.get("company") or "").lower(),
            (user.get("bio") or "").lower(),
            (user.get("location") or "").lower(),
        ])
        if any(len(t) >= 4 and t in haystack for t in needle.split()):
            affil_score = 1.0

    homepage_score = 0.0
    if user.get("blog"):
        homepage_score += 0.5
    if user.get("twitter_username"):
        homepage_score += 0.25
    if email_domain and user.get("email"):
        if (user.get("email") or "").lower().endswith(email_domain):
            homepage_score = 1.0
    homepage_score = min(homepage_score, 1.0)

    combined = (
        0.45 * name_score
        + 0.30 * topical_score
        + 0.15 * affil_score
        + 0.10 * homepage_score
    )
    overlap_tags = sorted(user_skills & paper_skills)
    evidence = (
        f"name={name_score:.2f} topical={topical_score:.2f} "
        f"affil={affil_score:.2f} home={homepage_score:.2f} "
        f"overlap=[{','.join(overlap_tags)}]"
    )
    return max(0.0, min(1.0, combined)), evidence


async def _find_candidates(
    client: GhClient,
    name: str,
    affiliation: str | None,
    email: str | None,
) -> list[str]:
    queries: list[str] = [f'fullname:"{name}"']
    if affiliation and affiliation.strip():
        queries.append(f'fullname:"{name}" {_sanitise_qualifier(affiliation)}')
    if email and "@" in email:
        queries.append(f'fullname:"{name}" {email.split("@", 1)[1]}')
    seen: set[str] = set()
    out: list[str] = []
    for q in queries:
        resp = await client.search_users(q, sort="followers", order="desc", per_page=10, page=1)
        for item in resp.get("items") or []:
            login = item.get("login")
            if not login or login in seen:
                continue
            seen.add(login)
            out.append(login)
            if len(out) >= 8:
                return out
    return out


async def _cmd_match_paper_authors(state: GhPatternsState) -> dict[str, Any]:
    contacts = state.get("contacts") or []
    threshold = float(state.get("match_threshold") or 0.7)
    if not contacts:
        return {"results": []}
    client = GhClient.from_env()
    try:
        results: list[dict[str, Any]] = []
        for contact in contacts:
            rec = await _match_contact(client, contact, threshold)
            results.append(rec)
            await asyncio.sleep(0.15)
        return {"results": results}
    finally:
        await client.aclose()


async def _match_contact(client: GhClient, contact: dict[str, Any], threshold: float) -> dict[str, Any]:
    name = contact.get("name") or ""
    first, last = _split_name(name)
    logins = await _find_candidates(
        client, name, contact.get("affiliation"), contact.get("email"),
    )
    if not logins:
        return {
            "contact_id": contact.get("id"),
            "github_login": None,
            "github_confidence": 0.0,
            "github_evidence": "no candidates returned",
            "candidates_considered": 0,
        }
    top = logins[:5]
    users = await client.get_users_graphql(top)
    if not users:
        return {
            "contact_id": contact.get("id"),
            "github_login": None,
            "github_confidence": 0.0,
            "github_evidence": "hydrate failed",
            "candidates_considered": len(top),
        }
    paper_text = " ".join(contact.get("paper_titles") or [])
    paper_skills = set(extract_skills(paper_text))
    email = contact.get("email") or ""
    email_domain = email.split("@", 1)[1].lower() if "@" in email else None

    best: tuple[float, str, str] | None = None
    for u in users:
        score, why = _score_paper_author(
            u, first, last, contact.get("affiliation"), email_domain, paper_skills,
        )
        if best is None or score > best[0]:
            best = (score, u.get("login") or "", why)
    score, login, evidence = best or (0.0, "", "no scoreable candidate")
    matched = score >= threshold and bool(login)
    return {
        "contact_id": contact.get("id"),
        "github_login": login if matched else None,
        "github_confidence": score,
        "github_evidence": evidence,
        "candidates_considered": len(users),
    }


# ── Command: scrape_contributors ─────────────────────────────────────────────


async def _cmd_scrape_contributors(state: GhPatternsState) -> dict[str, Any]:
    scan_mode = (state.get("scan_mode") or "discover").lower()
    if scan_mode == "top":
        top_n = int(state.get("top_n") or 25)
        await _ensure_tables()
        return {"mode": "top", "top_candidates": await _top_candidates(top_n)}

    client = GhClient.from_env()
    await _ensure_tables()
    try:
        if scan_mode == "repo":
            full_name = state.get("gh_repo") or ""
            if "/" not in full_name:
                return {"error": "gh_repo must be 'owner/repo' in repo mode"}
            inserted = await _scrape_single_repo(
                client, full_name, state.get("max_contributors_per_repo") or 100,
            )
            return {"mode": "repo", "inserted": inserted, "repo": full_name}
        return await _scrape_discover(client, state)
    finally:
        await client.aclose()


async def _scrape_discover(client: GhClient, state: GhPatternsState) -> dict[str, Any]:
    topics_str = state.get("gh_topics") or "llm,machine-learning,generative-ai,deep-learning"
    min_stars = int(state.get("gh_min_stars") or 200)
    max_repos = int(state.get("max_repos") or 20)
    max_per_repo = int(state.get("max_contributors_per_repo") or 100)

    repos_seen: list[str] = []
    total_inserted = 0
    for topic in [t.strip() for t in topics_str.split(",") if t.strip()]:
        if len(repos_seen) >= max_repos:
            break
        log.info("searching topic=%s min_stars=%d", topic, min_stars)
        results = await client.search_repos(topic, min_stars=min_stars, per_page=30)
        for repo in results.get("items") or []:
            if len(repos_seen) >= max_repos:
                break
            full_name = repo.get("full_name") or ""
            if not full_name or full_name in repos_seen:
                continue
            repos_seen.append(full_name)
            total_inserted += await _scrape_single_repo(client, full_name, max_per_repo)
            await asyncio.sleep(0.4)
    return {"mode": "discover", "inserted": total_inserted, "repos": repos_seen}


async def _scrape_single_repo(client: GhClient, full_name: str, max_per_repo: int) -> int:
    owner, repo = full_name.split("/", 1)
    log.info("scraping contributors for %s", full_name)
    contribs = await client.repo_contributors(owner, repo)
    if not contribs:
        return 0

    known = await load_known_logins()
    to_fetch = [
        c for c in contribs[:max_per_repo]
        if c.get("login") and c["login"] not in known and not is_bot(c["login"])
    ]
    log.info("%s: %d contributors to fetch (skipping known)", full_name, len(to_fetch))

    inserted = 0
    for chunk_start in range(0, len(to_fetch), 10):
        chunk = to_fetch[chunk_start:chunk_start + 10]
        for c in chunk:
            login = c.get("login") or ""
            raw = await client.get_user(login)
            if not raw:
                continue
            # Hydrate via GraphQL to get enriched fields.
            users = await client.get_users_graphql([login])
            if not users:
                continue
            user = users[0]
            record = {
                "user": user,
                "repos": [{"repo": full_name, "contributions": c.get("contributions") or 0}],
                "total_contributions": c.get("contributions") or 0,
            }
            await _persist_contributor(record, opp_skills=[])
            inserted += 1
            await asyncio.sleep(0.17)
    return inserted


async def _persist_contributor(
    record: dict[str, Any],
    *,
    opp_skills: Sequence[str],
) -> dict[str, Any]:
    user = record.get("user") or {}
    skills_text = contributor_skills_text(
        user.get("bio"),
        user.get("company"),
        json.dumps(record.get("repos") or []),
        user.get("pinned_repos_json"),
        user.get("contributed_repos_json"),
        user.get("top_repos_json"),
    )
    skills = extract_skills(skills_text)
    rising = compute_rising_score(record, len(skills))
    strength = compute_strength_score(record, len(skills))
    opp_skill_match = compute_opp_skill_match(skills, opp_skills)
    position = infer_position(user.get("bio"))

    try:
        vec = await embed_texts([skills_text]) if skills_text.strip() else []
        embedding = vec[0] if vec else None
    except Exception as e:  # noqa: BLE001
        log.warning("embedding failed for %s: %s", user.get("login"), e)
        embedding = None

    await upsert_contributor_embedding(
        record,
        skills=skills,
        rising=rising,
        strength=strength,
        opp_skill_match=opp_skill_match,
        position_level=position,
        embedding=embedding,
    )
    return build_candidate(
        record,
        skills=skills, rising=rising, strength=strength,
        opp_skill_match=opp_skill_match,
    )


async def _top_candidates(n: int) -> list[dict[str, Any]]:
    dsn = _dsn()
    async with await psycopg.AsyncConnection.connect(dsn, autocommit=True) as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT login, html_url, name, email, company, location, bio,
                       followers, public_repos, total_contributions, repos_json,
                       rising_score, strength_score, skills_json, position_level,
                       account_age_days, last_active_date, days_since_last_active,
                       contributions_30d, contributions_90d, contributions_365d,
                       current_streak_days, activity_trend, recency,
                       contribution_quality, opp_skill_match
                FROM gh_contributor_embeddings
                ORDER BY rising_score DESC NULLS LAST
                LIMIT %s
                """,
                (n,),
            )
            rows = await cur.fetchall()
            cols = [d.name for d in cur.description]
    out: list[dict[str, Any]] = []
    for row in rows:
        item = dict(zip(cols, row))
        # Unpack JSON columns
        try:
            item["repos"] = json.loads(item.pop("repos_json") or "[]")
        except Exception:  # noqa: BLE001
            item["repos"] = []
        try:
            item["skills"] = json.loads(item.pop("skills_json") or "[]")
        except Exception:  # noqa: BLE001
            item["skills"] = []
        item["ai_repos_count"] = len(item["repos"])
        out.append(item)
    return out


# ── Command: export_contributors ─────────────────────────────────────────────


async def _cmd_export_contributors(state: GhPatternsState) -> dict[str, Any]:
    threshold = float(state.get("export_threshold") or 0.5)
    top_n = int(state.get("export_top_n") or 500)
    opp_id = state.get("opp_id")
    extra_tags: list[str] = []
    if opp_id:
        extra_tags.append(f"opp:{opp_id}")
    await _ensure_tables()
    ranked = await _top_candidates(top_n)
    log.info("fetched %d contributors, threshold=%.2f", len(ranked), threshold)
    exported = 0
    skipped = 0
    for cand in ranked:
        try:
            result = await save_contributor_contact(cand, threshold, extra_tags)
        except Exception as e:  # noqa: BLE001
            log.warning("failed to export %s: %s", cand.get("login"), e)
            continue
        if result is not None:
            exported += 1
        else:
            skipped += 1
    return {"exported": exported, "skipped": skipped, "threshold": threshold}


# ── Command: search_candidates ───────────────────────────────────────────────


def _is_london(loc: str | None) -> bool:
    return bool(loc and _LONDON_RE.search(loc))


def _is_uk_wide(loc: str | None) -> bool:
    return bool(loc and _UK_WIDE_RE.search(loc))


async def _cmd_search_candidates(state: GhPatternsState) -> dict[str, Any]:
    dry_run = bool(state.get("dry_run"))
    opp_id = state.get("opp_id") or "opp_20260415_principal_ai_eng_ob"
    opp_skills = list(state.get("opp_skills") or [])
    threshold = float(state.get("export_threshold") or 0.3)
    top_n = int(state.get("top_n") or 50)

    client = GhClient.from_env()
    await _ensure_tables()
    try:
        return await _run_search_candidates(
            client, opp_id=opp_id, opp_skills=opp_skills,
            threshold=threshold, top_n=top_n, dry_run=dry_run,
        )
    finally:
        await client.aclose()


async def _run_search_candidates(
    client: GhClient,
    *,
    opp_id: str,
    opp_skills: list[str],
    threshold: float,
    top_n: int,
    dry_run: bool,
) -> dict[str, Any]:
    seen: set[str] = set()
    sources: dict[str, list[str]] = {}
    contrib_counts: dict[str, tuple[str, int]] = {}

    def _add_source(login: str, tag: str) -> None:
        sources.setdefault(login, []).append(tag)

    # Channel 1: bio search (A–O)
    for label, query in SEARCH_QUERIES:
        log.info("search pass %s", label)
        resp = await client.search_users(query, sort="followers", order="desc", per_page=100, page=1)
        for item in resp.get("items") or []:
            login = item.get("login") or ""
            if login and not is_bot(login):
                _add_source(login, f"src:bio/{label}")
                seen.add(login)
        await asyncio.sleep(2)

    # Channel 2: stargazers
    for repo_full in STARGAZER_REPOS:
        if "/" not in repo_full:
            continue
        owner, repo = repo_full.split("/", 1)
        log.info("mining stargazers: %s", repo_full)
        for page in range(1, 4):
            stargazers = await client.repo_stargazers(owner, repo, per_page=100, page=page)
            if not stargazers:
                break
            for sg in stargazers:
                login = sg.get("login") or ""
                if login and not is_bot(login):
                    _add_source(login, f"src:star/{repo_full}")
                    seen.add(login)
            if len(stargazers) < 100:
                break
            await asyncio.sleep(0.5)
        await asyncio.sleep(1)

    # Channel 3: contributors
    for repo_full in CONTRIBUTOR_REPOS:
        if "/" not in repo_full:
            continue
        owner, repo = repo_full.split("/", 1)
        log.info("mining contributors: %s", repo_full)
        contribs = await client.repo_contributors(owner, repo)
        for c in contribs:
            login = c.get("login") or ""
            contributions = int(c.get("contributions") or 0)
            if contributions >= 3 and not is_bot(login):
                _add_source(login, f"src:contrib/{repo_full}")
                prev = contrib_counts.get(login, (repo_full, 0))
                if contributions > prev[1]:
                    contrib_counts[login] = (repo_full, contributions)
                seen.add(login)
        await asyncio.sleep(1)

    # Channel 4: org members
    for org in LONDON_AI_ORGS:
        log.info("mining org members: %s", org)
        members = await client.get_org_members_graphql(org, 20)
        for m in members:
            login = m.get("login") or ""
            if login and not is_bot(login):
                _add_source(login, f"src:org/{org}")
                seen.add(login)
        await asyncio.sleep(1)

    log.info("discovery complete: %d unique logins", len(seen))

    known = await load_known_logins()
    logins = [l for l in seen if l not in known]
    log.info("hydrating %d profiles via GraphQL batches of 10", len(logins))

    candidates: list[tuple[dict[str, Any], bool]] = []
    batch_size = 10
    concurrency = 3
    total_batches = (len(logins) + batch_size - 1) // batch_size
    batch_idx = 0
    while batch_idx < total_batches:
        end = min(batch_idx + concurrency, total_batches)
        tasks = []
        for b in range(batch_idx, end):
            start = b * batch_size
            stop = min(start + batch_size, len(logins))
            tasks.append(client.get_users_graphql(logins[start:stop]))
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for res in results:
            if isinstance(res, Exception) or not res:
                continue
            for user in res:
                loc = user.get("location")
                london = _is_london(loc)
                uk = _is_uk_wide(loc)
                if not london and not uk:
                    continue
                repo_source, contrib_count = contrib_counts.get(
                    user.get("login") or "",
                    ("github-search", user.get("public_repos") or 0),
                )
                record = {
                    "user": user,
                    "repos": [{"repo": repo_source, "contributions": contrib_count}],
                    "total_contributions": contrib_count,
                }
                candidates.append((record, london))
        batch_idx = end
        await asyncio.sleep(0.4)

    log.info("hydrated %d candidates", len(candidates))

    # Build + persist + rank
    ranked: list[tuple[dict[str, Any], bool]] = []
    for record, london_verified in candidates:
        cand = await _persist_contributor(record, opp_skills=opp_skills)
        ranked.append((cand, london_verified))

    def _composite(s: dict[str, Any]) -> float:
        followers = float(s.get("followers") or 0)
        cred = 0.3 + 0.7 * min(math.log(followers + 1.0) / math.log(100.0), 1.0)
        cq = float(s.get("contribution_quality") or 0.0)
        if opp_skills:
            return (
                0.30 * (float(s.get("opp_skill_match") or 0.0) * cred)
                + 0.30 * float(s.get("strength_score") or 0.0)
                + 0.25 * float(s.get("rising_score") or 0.0)
                + 0.15 * cq
            )
        return (
            0.50 * float(s.get("strength_score") or 0.0)
            + 0.30 * float(s.get("rising_score") or 0.0)
            + 0.20 * cq
        )

    ranked.sort(key=lambda pair: _composite(pair[0]), reverse=True)

    # Channel 5: network expansion (top 15 seeds)
    seeds = [c["login"] for c, _ in ranked[:15] if c.get("login")]
    existing_logins = {c["login"] for c, _ in ranked if c.get("login")}
    net_logins: set[str] = set()
    for seed in seeds:
        followers = await client.get_user_followers_graphql(seed, 20)
        for f in followers:
            login = f.get("login") or ""
            if login and not is_bot(login) and login not in existing_logins and login not in known:
                loc = f.get("location")
                if _is_london(loc) or _is_uk_wide(loc):
                    _add_source(login, f"src:net/{seed}")
                    net_logins.add(login)
        await asyncio.sleep(1)
    if net_logins:
        log.info("network expansion: re-hydrating %d new logins", len(net_logins))
        net_list = list(net_logins)
        for chunk_start in range(0, len(net_list), 10):
            chunk = net_list[chunk_start:chunk_start + 10]
            users = await client.get_users_graphql(chunk)
            for user in users:
                record = {
                    "user": user,
                    "repos": [{
                        "repo": "network-expansion",
                        "contributions": user.get("public_repos") or 0,
                    }],
                    "total_contributions": user.get("public_repos") or 0,
                }
                cand = await _persist_contributor(record, opp_skills=opp_skills)
                ranked.append((cand, _is_london(user.get("location"))))
            await asyncio.sleep(0.5)
        ranked.sort(key=lambda pair: _composite(pair[0]), reverse=True)

    # Export
    exported = 0
    skipped = 0
    if dry_run:
        log.info("dry_run=True — skipping export")
    else:
        for cand, london_verified in ranked:
            extra = [
                f"opp:{opp_id}",
                "github:candidate-search-v2",
                "location:london-verified" if london_verified else "location:uk-wide",
            ]
            for s in sources.get(cand.get("login", ""), []):
                extra.append(s)
            try:
                result = await save_contributor_contact(cand, threshold, extra)
            except Exception as e:  # noqa: BLE001
                log.warning("export failed for %s: %s", cand.get("login"), e)
                continue
            if result is not None:
                exported += 1
            else:
                skipped += 1

    display = ranked[:top_n]
    return {
        "total": len(ranked),
        "london_verified": sum(1 for _, l in ranked if l),
        "uk_wide": sum(1 for _, l in ranked if not l),
        "exported": exported,
        "skipped": skipped,
        "threshold": threshold,
        "top": [
            {
                "login": c.get("login"),
                "name": c.get("name"),
                "rising_score": c.get("rising_score"),
                "strength_score": c.get("strength_score"),
                "opp_skill_match": c.get("opp_skill_match"),
                "composite": _composite(c),
                "location": c.get("location"),
                "company": c.get("company"),
                "london": london_verified,
                "sources": sources.get(c.get("login", ""), []),
            }
            for c, london_verified in display
        ],
    }


# ── Graph wiring ─────────────────────────────────────────────────────────────


async def dispatch(state: GhPatternsState) -> dict[str, Any]:
    command = (state.get("command") or "").strip().lower()
    if not command:
        return {"error": "command is required"}
    try:
        if command == "scan_orgs":
            result = await _cmd_scan_orgs(state)
        elif command == "match_paper_authors":
            result = await _cmd_match_paper_authors(state)
        elif command == "scrape_contributors":
            result = await _cmd_scrape_contributors(state)
        elif command == "export_contributors":
            result = await _cmd_export_contributors(state)
        elif command == "search_candidates":
            result = await _cmd_search_candidates(state)
        else:
            return {"error": f"unknown command: {command}"}
        return {"result": result}
    except Exception as e:  # noqa: BLE001
        log.exception("%s failed", command)
        return {"error": f"{command}: {e}"}


def build_graph() -> Any:
    graph = StateGraph(GhPatternsState)
    graph.add_node("dispatch", dispatch)
    graph.add_edge(START, "dispatch")
    graph.add_edge("dispatch", END)
    return graph.compile()


graph = build_graph()


__all__ = [
    "GhClient",
    "GhPatternsState",
    "analyse_org",
    "build_candidate",
    "build_graph",
    "candidate_to_embedding",
    "candidate_to_features",
    "compute_contribution_quality",
    "compute_opp_skill_match",
    "compute_rising_score",
    "compute_strength_score",
    "contributor_skills_text",
    "derive_tags",
    "dispatch",
    "extract_org_from_url",
    "extract_readme_signals",
    "extract_skills",
    "graph",
    "infer_position",
    "infer_seniority_level",
    "is_bot",
    "load_known_logins",
    "merge_tags",
    "parse_gql_user",
    "parse_manifest",
    "save_contributor_contact",
    "save_org_patterns",
    "upsert_contributor_embedding",
]
