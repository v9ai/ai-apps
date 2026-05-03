"""Canonical skill taxonomy + synonym map for the JD stack-extraction graph.

The TS source of truth lives at ``src/schema/contracts/skill-taxonomy.ts`` and
is mirrored to ``salescue/data/skill_taxonomy.json`` by ``pnpm schema:generate``
so Python-side consumers don't have to parse TS. We load that JSON once at
import time and build:

  * ``SKILL_TAXONOMY``  — ``{tag: human_label}``
  * ``ESCO_MAP``        — ``{tag: ESCO label}`` (subset of taxonomy)
  * ``SKILL_SYNONYMS``  — ``{lower_phrase: tag}`` covering the canonical tag,
    its label, and a small hand-curated alias list ("k8s" → "kubernetes",
    "node.js" → "nodejs", etc.)

``canonicalize_phrase()`` returns the canonical tag for a free-text phrase or
``None`` when no confident mapping exists; the graph escalates ``None`` results
to an LLM tiebreak.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

log = logging.getLogger(__name__)

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_TAXONOMY_PATH = _BACKEND_DIR.parent / "salescue" / "data" / "skill_taxonomy.json"

# ESCO labels are kept on the TS side; this map is the v1.1.0 subset most
# common in remote-AI JDs. Add as needed — unmapped tags simply omit
# ``escoLabel`` in the graph output (the Zod schema marks it optional).
_ESCO_LABELS: dict[str, str] = {
    "javascript": "JavaScript (programming language)",
    "typescript": "TypeScript",
    "python": "Python (programming language)",
    "java": "Java (programming language)",
    "rust": "Rust (programming language)",
    "go": "Go (programming language)",
    "react": "React.js",
    "nextjs": "Next.js",
    "nodejs": "Node.js",
    "django": "Django (web framework)",
    "fastapi": "FastAPI",
    "flask": "Flask (web framework)",
    "postgresql": "PostgreSQL",
    "mysql": "MySQL",
    "mongodb": "MongoDB",
    "redis": "Redis",
    "aws": "Amazon Web Services",
    "gcp": "Google Cloud Platform",
    "azure": "Microsoft Azure",
    "docker": "Docker (software)",
    "kubernetes": "Kubernetes",
    "terraform": "Terraform",
    "graphql": "GraphQL",
    "rest-api": "REST (architectural style)",
    "machine-learning": "Machine learning",
    "deep-learning": "Deep learning",
    "tensorflow": "TensorFlow",
    "pytorch": "PyTorch",
    "nlp": "Natural language processing",
    "computer-vision": "Computer vision",
    "llm": "Large language models",
    "rag": "Retrieval-augmented generation",
    "embeddings": "Vector embeddings",
    "transformers": "Transformer (deep learning)",
    "agents": "AI agents",
    "langchain": "LangChain",
    "langgraph": "LangGraph",
    "git": "Git (software)",
    "linux": "Linux",
    "agile": "Agile software development",
    "tdd": "Test-driven development",
}

# Hand-curated aliases. Only add entries where the surface form differs from
# both the canonical tag and its label by more than punctuation. ``_normalize``
# already collapses spaces/dots/dashes so e.g. "Node.js" vs "node.js" doesn't
# need a separate row.
_HAND_ALIASES: dict[str, str] = {
    "k8s": "kubernetes",
    "node": "nodejs",
    "node.js": "nodejs",
    "nodejs": "nodejs",
    "next": "nextjs",
    "next.js": "nextjs",
    "react.js": "react",
    "reactjs": "react",
    "vue.js": "vue",
    "vuejs": "vue",
    "rest": "rest-api",
    "restful": "rest-api",
    "rest apis": "rest-api",
    "rest api": "rest-api",
    "ml": "machine-learning",
    "machinelearning": "machine-learning",
    "machine learning": "machine-learning",
    "dl": "deep-learning",
    "deep learning": "deep-learning",
    "computer vision": "computer-vision",
    "cv": "computer-vision",
    "natural language processing": "nlp",
    "large language model": "llm",
    "large language models": "llm",
    "llms": "llm",
    "retrieval augmented generation": "rag",
    "retrieval-augmented generation": "rag",
    "prompt engineering": "prompt-engineering",
    "fine tuning": "fine-tuning",
    "function calling": "function-calling",
    "structured output": "structured-output",
    "scikit-learn": "scikit",
    "sklearn": "scikit",
    "hf": "huggingface",
    "hugging face": "huggingface",
    "vector database": "vector-db",
    "vector databases": "vector-db",
    "vectordb": "vector-db",
    "ci/cd": "ci-cd",
    "cicd": "ci-cd",
    "spring boot": "spring-boot",
    "react native": "react-native",
    "drizzle": "drizzle-orm",
    "drizzle orm": "drizzle-orm",
    "tailwind css": "tailwind",
    "tailwindcss": "tailwind",
    "vercel ai sdk": "vercel-ai-sdk",
    "agentic ai": "agentic-ai",
    "ai agents": "agents",
    "openai api": "openai",
    "anthropic claude": "anthropic",
    "claude": "anthropic",
    "tensorflow 2": "tensorflow",
    "pytorch lightning": "pytorch",
}


def _normalize(text: str) -> str:
    """Lower-case + strip + collapse internal whitespace/dots so surface
    variants ("Node.js", "node.js", " NodeJS ") all hash to the same key."""
    out = text.strip().lower()
    # Treat "." and "_" as separators so "node.js" → "node js" → "node js"
    out = out.replace(".", " ").replace("_", " ").replace("/", " ")
    out = " ".join(out.split())
    return out


def _load_taxonomy() -> dict[str, str]:
    if not _TAXONOMY_PATH.exists():
        log.warning(
            "skill taxonomy json not found at %s — extract_stack will only "
            "match hand-aliased phrases",
            _TAXONOMY_PATH,
        )
        return {}
    with _TAXONOMY_PATH.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, dict):
        log.warning("skill taxonomy json is not an object; ignoring")
        return {}
    return {str(k): str(v) for k, v in data.items()}


SKILL_TAXONOMY: dict[str, str] = _load_taxonomy()
ESCO_MAP: dict[str, str] = {tag: label for tag, label in _ESCO_LABELS.items() if tag in SKILL_TAXONOMY}


def _build_synonyms() -> dict[str, str]:
    syn: dict[str, str] = {}
    # 1) canonical tag matches itself
    for tag, label in SKILL_TAXONOMY.items():
        syn[_normalize(tag)] = tag
        syn[_normalize(label)] = tag
    # 2) hand aliases override (and add) — done last so curated mappings win
    for phrase, tag in _HAND_ALIASES.items():
        if tag in SKILL_TAXONOMY:
            syn[_normalize(phrase)] = tag
    return syn


SKILL_SYNONYMS: dict[str, str] = _build_synonyms()


def canonicalize_phrase(phrase: str) -> str | None:
    """Map a free-text phrase to a canonical SKILL_TAXONOMY tag.

    Returns ``None`` when no confident match exists — callers can either drop
    the phrase or escalate to an LLM tiebreak. Substring matching is bounded:
    we only accept a substring hit when the canonical tag/label is a whole
    word inside the phrase, to avoid "javascripted" → "javascript".
    """
    if not phrase:
        return None
    norm = _normalize(phrase)
    if not norm:
        return None
    # Exact synonym hit (covers tag, label, hand-aliases).
    direct = SKILL_SYNONYMS.get(norm)
    if direct is not None:
        return direct
    # Whole-word substring fallback. Iterate in length-desc so "machine learning"
    # beats "learning" when both exist as keys.
    tokens = set(norm.split())
    for key in sorted(SKILL_SYNONYMS.keys(), key=len, reverse=True):
        key_tokens = key.split()
        if all(t in tokens for t in key_tokens) and key_tokens:
            return SKILL_SYNONYMS[key]
    return None


def esco_label(tag: str) -> str | None:
    return ESCO_MAP.get(tag)
