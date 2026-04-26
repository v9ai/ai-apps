"""Controlled vocabulary for paper-author topic tags.

The previous tagging strategy emitted ``openalex:topic:<full-concept>`` strings
straight from OpenAlex (e.g. ``openalex:topic:Customer churn prediction in
banking``). The cardinality blew up and the contacts page tag dropdown became
useless. This module provides a 26-entry tier-1 vocabulary plus a
deterministic normalizer that maps OpenAlex concepts + GitHub repo topics +
paper titles into the controlled vocab. DeepSeek JSON-mode fallback runs only
when the keyword scan fails (rare).

The output prefix is ``topic:<slug>`` (replaces the noisy
``openalex:topic:<full>``). ``_merge_tags_with_topics`` in
``contact_enrich_paper_author_graph.py`` strips both prefixes before
re-deriving so re-runs converge.
"""

from __future__ import annotations

import logging
from typing import Iterable

from .llm import is_deepseek_configured

log = logging.getLogger(__name__)


TIER1_TOPIC_TAGS: tuple[str, ...] = (
    "agents",
    "alignment",
    "computer-vision",
    "diffusion",
    "distributed-training",
    "embeddings",
    "evaluation",
    "federated-learning",
    "fine-tuning",
    "generative-models",
    "graph-neural-networks",
    "inference-optimization",
    "interpretability",
    "knowledge-graphs",
    "llm",
    "mlops",
    "multimodal",
    "neural-networks",
    "nlp",
    "rag",
    "recommender-systems",
    "reinforcement-learning",
    "robotics",
    "speech",
    "time-series",
    "transformers",
)


# Heuristic table — case-insensitive substring match against each haystack
# string. Order doesn't matter; we collect all hits.
_KEYWORD_RULES: dict[str, tuple[str, ...]] = {
    "agents":                 ("agent", "autonomous", "tool use", "tool-use", "function calling"),
    "alignment":              ("alignment", "rlhf", "constitutional ai", "harmless", "helpful and harmless"),
    "computer-vision":        ("computer vision", "image recognition", "object detection", "image segmentation", "vision transformer"),
    "diffusion":              ("diffusion model", "denoising", "score-based", "latent diffusion", "stable diffusion"),
    "distributed-training":   ("distributed training", "data parallel", "tensor parallel", "pipeline parallel", "sharded"),
    "embeddings":             ("embedding", "sentence embedding", "vector representation", "representation learning"),
    "evaluation":             ("benchmark", "evaluation", "leaderboard", "human eval"),
    "federated-learning":     ("federated learning", "federated training"),
    "fine-tuning":            ("fine-tuning", "finetuning", "instruction tuning", "lora", "qlora", "peft", "supervised fine-tun"),
    "generative-models":      ("generative model", "gan", "vae", "variational autoencoder", "image generation"),
    "graph-neural-networks":  ("graph neural network", "gnn", "message passing", "graph attention"),
    "inference-optimization": ("inference optimization", "quantization", "pruning", "kv cache", "speculative decoding", "flashattention"),
    "interpretability":       ("interpretability", "explainability", "mechanistic", "attribution", "saliency"),
    "knowledge-graphs":       ("knowledge graph", "ontology", "knowledge base"),
    "llm":                    ("llm", "large language model", "language model", "gpt", "chatgpt", "instruction-tuned"),
    "mlops":                  ("mlops", "model serving", "model deployment", "pipeline", "experiment tracking"),
    "multimodal":             ("multimodal", "vision-language", "vlm", "image-text", "audio-visual"),
    "neural-networks":        ("neural network", "deep learning", "deep neural", "convolutional"),
    "nlp":                    ("natural language", "text classification", "named entity", "sequence labeling", "question answering"),
    "rag":                    ("rag", "retrieval-augmented", "retrieval augmented", "retrieval-based"),
    "recommender-systems":    ("recommender", "collaborative filtering", "recommendation system"),
    "reinforcement-learning": ("reinforcement learning", " rl ", "rlhf", "policy gradient", "q-learning", "actor-critic", "ppo"),
    "robotics":               ("robotic", "manipulation", "locomotion", "robot learning"),
    "speech":                 ("speech recognition", "speech synthesis", "asr", "tts", "audio classification"),
    "time-series":            ("time series", "time-series", "forecasting", "temporal"),
    "transformers":           ("transformer", "attention is all", "self-attention", "encoder-decoder"),
}


def _scan_haystacks(haystacks: Iterable[str]) -> set[str]:
    """Pure keyword scan — runs the rule table over every haystack string."""
    matched: set[str] = set()
    needles = [(tag, kw) for tag, kws in _KEYWORD_RULES.items() for kw in kws]
    for raw in haystacks:
        if not isinstance(raw, str):
            continue
        hay = raw.lower()
        if not hay:
            continue
        for tag, kw in needles:
            if tag in matched:
                continue
            if kw in hay:
                matched.add(tag)
    return matched


def normalize_topics_to_tags(
    openalex_concepts: list[str] | None = None,
    github_topics: list[str] | None = None,
    paper_titles: list[str] | None = None,
    *,
    use_llm_fallback: bool = False,
) -> list[str]:
    """Map free-text concepts into a sorted list of ``topic:<slug>`` tags.

    Pure function. Args may be ``None`` / empty. Output is deduplicated,
    case-folded, sorted alphabetically, and every entry is prefixed
    ``topic:`` so the contacts page tag dropdown can group them and the
    reverse-strip in ``_merge_tags_with_topics`` is unambiguous.

    ``use_llm_fallback`` defaults to False — keep the hot path deterministic.
    Callers that have spare LLM budget (e.g. one-shot backfills) can pass
    True; the LLM is consulted only when the keyword scan returns empty.
    """
    haystacks: list[str] = []
    for src in (openalex_concepts, github_topics, paper_titles):
        if src:
            haystacks.extend(s for s in src if isinstance(s, str))

    matched = _scan_haystacks(haystacks)

    if not matched and use_llm_fallback and is_deepseek_configured() and haystacks:
        try:
            matched |= _llm_classify_topics(haystacks)
        except Exception as e:  # noqa: BLE001
            log.warning("topic_taxonomy LLM fallback failed: %s", e)

    return sorted(f"topic:{slug}" for slug in matched)


async def _llm_classify_topics(haystacks: list[str]) -> set[str]:
    """LLM fallback — strict-enum JSON mode against TIER1_TOPIC_TAGS.

    Sync wrapper over an async DeepSeek call would deadlock in some event
    loops, so this is itself async; ``normalize_topics_to_tags`` doesn't await
    it (the fallback is gated off by default). Wire async callers explicitly
    when needed.
    """
    from .llm import ainvoke_json, make_llm  # local import — keep top-level light

    sample = "\n".join(f"- {h}" for h in haystacks[:30])
    prompt = (
        "Map the following research-topic strings to AI/ML topical tags drawn "
        "from a FIXED vocabulary. Return JSON: "
        '{"tags": ["llm", "rag", ...]}.  Only use tags from this list, exact '
        "lowercase, dash-cased: " + ", ".join(TIER1_TOPIC_TAGS) + ".\n\n"
        f"INPUT:\n{sample}\n\n"
        'If no tag clearly fits, return {"tags": []}.'
    )
    llm = make_llm(temperature=0.0)
    parsed = await ainvoke_json(llm, [{"role": "user", "content": prompt}])
    raw = parsed.get("tags") if isinstance(parsed, dict) else None
    if not isinstance(raw, list):
        return set()
    allowed = set(TIER1_TOPIC_TAGS)
    return {t.strip().lower() for t in raw if isinstance(t, str) and t.strip().lower() in allowed}
