# Requires: numpy
"""Multi-label logistic scorer for LinkedIn post intent classification.

Direct Python port of ``crates/linkedin-posts/src/intent_scorer.rs`` and the
keyword tables from ``crates/linkedin-posts/src/scoring.rs``.

Computes seven independent intent probabilities per post::

    hiring_signal, ai_ml_content, remote_signal, engineering_culture,
    company_growth, thought_leadership, noise

Scoring:  z = biases + weights @ features; prob = sigmoid(z).

Feature vector (12 elements)::

    [hiring_kw_density, ai_kw_density, remote_kw_density, eng_kw_density,
     culture_kw_density, noise_kw_density, text_length_norm, reactions_norm,
     comments_norm, has_url, is_repost, media_type_enc]

JSON file format matches the Rust scorer exactly:
``{"weights": [[..12..]; 7], "biases": [..7..], "trained": bool}``.
"""

from __future__ import annotations

import json
import logging
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np

log = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────

NUM_FEATURES = 12
NUM_LABELS = 7

LABEL_HIRING = 0
LABEL_AI_ML = 1
LABEL_REMOTE = 2
LABEL_ENG_CULTURE = 3
LABEL_COMPANY_GROWTH = 4
LABEL_THOUGHT_LEADERSHIP = 5
LABEL_NOISE = 6

LABEL_NAMES: tuple[str, ...] = (
    "hiring_signal",
    "ai_ml_content",
    "remote_signal",
    "engineering_culture",
    "company_growth",
    "thought_leadership",
    "noise",
)

DEFAULT_RELEVANCE_THRESHOLD = 0.15

# ── Keyword tables (port of scoring.rs) ──────────────────────────────────────

HIRING_KEYWORDS: tuple[str, ...] = (
    "we're hiring",
    "we are hiring",
    "hiring for",
    "looking for",
    "open role",
    "open position",
    "join our team",
    "join us",
    "now hiring",
    "apply now",
    "job opening",
    "job opportunity",
    "come work with",
    "growing our team",
    "building our team",
    "talent acquisition",
    "new role",
    "new opening",
)

AI_KEYWORDS: tuple[str, ...] = (
    "machine learning",
    "deep learning",
    "artificial intelligence",
    " llm ",
    "llm,",
    "llms",
    "large language model",
    "natural language processing",
    " nlp ",
    "computer vision",
    "neural network",
    "pytorch",
    "tensorflow",
    "transformer",
    " gpt",
    "langchain",
    "rag ",
    "retrieval augmented",
    "fine-tuning",
    "embeddings",
    "vector database",
    "mlops",
    "ml engineer",
    "ai engineer",
    "data scientist",
    "data engineer",
    "research scientist",
    "head of ai",
    "vp of ai",
    "director of ai",
    "prompt engineer",
    "genai",
    "generative ai",
    "gen ai",
    "diffusion model",
    "reinforcement learning",
)

REMOTE_KEYWORDS: tuple[str, ...] = (
    "fully remote",
    "remote-first",
    "remote first",
    "work from anywhere",
    "remote position",
    "remote role",
    "remote opportunity",
    "distributed team",
    "async-first",
    "global team",
    "worldwide",
)

ENGINEERING_KEYWORDS: tuple[str, ...] = (
    "software engineer",
    "backend engineer",
    "frontend engineer",
    "full-stack",
    "fullstack",
    "devops",
    "infrastructure",
    "platform engineer",
    "site reliability",
    " sre ",
    "distributed systems",
    "microservices",
    "kubernetes",
    " k8s",
    "typescript",
    "python",
    " rust ",
    " golang",
    "system design",
    "tech lead",
    "staff engineer",
    "principal engineer",
    "engineering manager",
)

CULTURE_KEYWORDS: tuple[str, ...] = (
    "engineering culture",
    "tech stack",
    "engineering blog",
    "tech talk",
    "open source",
    "developer experience",
    "team culture",
    "how we build",
    "our engineering",
    "series a",
    "series b",
    "series c",
    "raised",
    "funding",
    "yc ",
    "y combinator",
)

NOISE_KEYWORDS: tuple[str, ...] = (
    "happy birthday",
    "work anniversary",
    "congratulations on",
    "congrats on your",
    "thrilled to announce my",
    "blessed to",
    "grateful for this journey",
    "like if you agree",
    "share if you",
    "agree or disagree",
    "hot take:",
    "unpopular opinion",
    "thoughts?",
    "#motivation",
    "#mondaymotivation",
    "#blessed",
    "#grateful",
    "personal news:",
)


# ── Word-boundary matcher (port of scoring::has_word) ────────────────────────


def has_word(text: str, word: str) -> bool:
    """Return True if ``word`` appears in ``text`` at an ASCII word boundary."""
    if not word or len(word) > len(text):
        return False
    start = 0
    while True:
        idx = text.find(word, start)
        if idx == -1:
            return False
        before_ok = idx == 0 or not text[idx - 1].isalnum()
        after = idx + len(word)
        after_ok = after >= len(text) or not text[after].isalnum()
        if before_ok and after_ok:
            return True
        start = idx + 1


def _kw_hits(lower: str, keywords: tuple[str, ...]) -> float:
    """Count the number of keywords that appear in ``lower``.

    Space-padded keywords (e.g. ``" llm "``) match via ``has_word`` so that
    strings at the start/end of ``lower`` still match, and ``rustproofing``
    does not match ``" rust "``.  Multi-word phrases use plain ``in``.
    """
    hits = 0
    for kw in keywords:
        trimmed = kw.strip()
        if trimmed == kw:
            if kw in lower:
                hits += 1
        else:
            if has_word(lower, trimmed):
                hits += 1
    return float(hits)


def keyword_match(text: str, keywords: tuple[str, ...]) -> bool:
    """Boundary-aware keyword match (port of ``scoring::keyword_match``)."""
    for kw in keywords:
        trimmed = kw.strip()
        if trimmed == kw:
            if kw in text:
                return True
        else:
            if has_word(text, trimmed):
                return True
    return False


def title_has_ai_signal(position: str) -> bool:
    return keyword_match(position.lower(), AI_KEYWORDS)


def title_has_engineering_signal(position: str) -> bool:
    return keyword_match(position.lower(), ENGINEERING_KEYWORDS)


# ── Feature extraction ───────────────────────────────────────────────────────


def extract_features(post: dict[str, Any]) -> np.ndarray:
    """Port of ``intent_scorer::extract_features``.

    Accepts any mapping with LinkedIn post fields (``post_text``,
    ``reactions_count``, etc.) and returns a shape-(12,) float32 array.
    """
    text = post.get("post_text") or ""
    lower = text.lower()
    word_count = max(len(lower.split()), 5)

    hiring = _kw_hits(lower, HIRING_KEYWORDS)
    ai = _kw_hits(lower, AI_KEYWORDS)
    remote = _kw_hits(lower, REMOTE_KEYWORDS)
    eng = _kw_hits(lower, ENGINEERING_KEYWORDS)
    culture = _kw_hits(lower, CULTURE_KEYWORDS)
    noise = _kw_hits(lower, NOISE_KEYWORDS)

    media_type = (post.get("media_type") or "none").lower()
    media_enc = {
        "image": 0.2,
        "article": 0.4,
        "document": 0.6,
        "video": 0.8,
        "poll": 1.0,
    }.get(media_type, 0.0)

    reactions = max(int(post.get("reactions_count") or 0), 0)
    comments = max(int(post.get("comments_count") or 0), 0)
    has_url = 1.0 if post.get("post_url") else 0.0
    is_repost = 1.0 if post.get("is_repost") else 0.0

    feats = np.array(
        [
            hiring / word_count,
            ai / word_count,
            remote / word_count,
            eng / word_count,
            culture / word_count,
            noise / word_count,
            min(len(text) / 500.0, 1.0),
            math.log(1.0 + reactions) / 10.0,
            math.log(1.0 + comments) / 8.0,
            has_url,
            is_repost,
            media_enc,
        ],
        dtype=np.float32,
    )
    return feats


# ── Intent probabilities ─────────────────────────────────────────────────────


@dataclass
class PostIntents:
    hiring_signal: float = 0.0
    ai_ml_content: float = 0.0
    remote_signal: float = 0.0
    engineering_culture: float = 0.0
    company_growth: float = 0.0
    thought_leadership: float = 0.0
    noise: float = 0.0

    @classmethod
    def from_array(cls, scores: np.ndarray) -> "PostIntents":
        return cls(
            hiring_signal=float(scores[LABEL_HIRING]),
            ai_ml_content=float(scores[LABEL_AI_ML]),
            remote_signal=float(scores[LABEL_REMOTE]),
            engineering_culture=float(scores[LABEL_ENG_CULTURE]),
            company_growth=float(scores[LABEL_COMPANY_GROWTH]),
            thought_leadership=float(scores[LABEL_THOUGHT_LEADERSHIP]),
            noise=float(scores[LABEL_NOISE]),
        )

    def as_array(self) -> np.ndarray:
        return np.array(
            [
                self.hiring_signal,
                self.ai_ml_content,
                self.remote_signal,
                self.engineering_culture,
                self.company_growth,
                self.thought_leadership,
                self.noise,
            ],
            dtype=np.float32,
        )

    def primary_intent(self) -> str:
        arr = self.as_array()
        return LABEL_NAMES[int(np.argmax(arr))]

    def relevance_score(self) -> float:
        return (
            0.30 * self.hiring_signal
            + 0.25 * self.ai_ml_content
            + 0.20 * self.remote_signal
            + 0.10 * self.engineering_culture
            + 0.10 * self.company_growth
            + 0.05 * self.thought_leadership
            - 0.30 * self.noise
        )


# ── Scorer ───────────────────────────────────────────────────────────────────


def _default_weights() -> np.ndarray:
    return np.array(
        [
            # hiring
            [25.0, 3.0, 5.0, 3.0, 2.0, -5.0, 1.0, 0.5, 0.3, 0.5, -1.0, 0.0],
            # ai_ml
            [2.0, 25.0, 2.0, 6.0, 2.0, -4.0, 1.0, 0.3, 0.5, 0.3, -0.5, 0.3],
            # remote
            [3.0, 2.0, 30.0, 2.0, 1.0, -4.0, 0.5, 0.2, 0.2, 0.3, -0.5, 0.0],
            # eng_culture
            [2.0, 5.0, 1.0, 20.0, 10.0, -4.0, 1.0, 0.5, 0.6, 0.3, -0.3, 0.5],
            # company_growth
            [2.0, 2.0, 1.0, 2.0, 25.0, -4.0, 0.5, 0.6, 0.4, 0.3, -0.3, 0.2],
            # thought_leadership
            [1.0, 5.0, 1.0, 5.0, 2.0, -8.0, 3.0, 1.5, 2.0, 0.3, -1.0, 0.8],
            # noise
            [-5.0, -4.0, -3.0, -3.0, -2.0, 20.0, -3.0, -0.3, -0.5, -0.5, 1.5, -0.5],
        ],
        dtype=np.float32,
    )


def _default_biases() -> np.ndarray:
    return np.array([-1.5, -1.2, -1.5, -1.2, -1.5, -1.0, -0.8], dtype=np.float32)


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


@dataclass
class PostIntentScorer:
    weights: np.ndarray = field(default_factory=_default_weights)
    biases: np.ndarray = field(default_factory=_default_biases)
    trained: bool = False

    @classmethod
    def default_pretrained(cls) -> "PostIntentScorer":
        return cls(weights=_default_weights(), biases=_default_biases(), trained=False)

    def score_intents(self, features: np.ndarray) -> PostIntents:
        z = self.biases + self.weights @ features
        probs = _sigmoid(z)
        return PostIntents.from_array(probs)

    @classmethod
    def from_json(cls, path: Path) -> "PostIntentScorer":
        raw = Path(path).read_text(encoding="utf-8")
        data = json.loads(raw)

        weights = np.array(data["weights"], dtype=np.float32)
        biases = np.array(data["biases"], dtype=np.float32)
        trained = bool(data.get("trained", False))

        if weights.shape != (NUM_LABELS, NUM_FEATURES):
            raise ValueError(
                f"weights shape {weights.shape} != ({NUM_LABELS}, {NUM_FEATURES})"
            )
        if biases.shape != (NUM_LABELS,):
            raise ValueError(f"biases shape {biases.shape} != ({NUM_LABELS},)")
        if not np.isfinite(weights).all():
            raise ValueError("weights contains non-finite values")
        if not np.isfinite(biases).all():
            raise ValueError("biases contains non-finite values")

        return cls(weights=weights, biases=biases, trained=trained)

    def to_json(self, path: Path) -> None:
        out = {
            "weights": self.weights.tolist(),
            "biases": self.biases.tolist(),
            "trained": self.trained,
        }
        Path(path).write_text(json.dumps(out, indent=2), encoding="utf-8")


# ── Analysis (port of analysis.rs) ───────────────────────────────────────────


@dataclass
class PostAnalysis:
    intents: PostIntents
    relevance_score: float
    keep: bool
    primary_intent: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "intents": {
                "hiring_signal": self.intents.hiring_signal,
                "ai_ml_content": self.intents.ai_ml_content,
                "remote_signal": self.intents.remote_signal,
                "engineering_culture": self.intents.engineering_culture,
                "company_growth": self.intents.company_growth,
                "thought_leadership": self.intents.thought_leadership,
                "noise": self.intents.noise,
            },
            "relevance_score": self.relevance_score,
            "keep": self.keep,
            "primary_intent": self.primary_intent,
        }


def analyze(post: dict[str, Any], scorer: PostIntentScorer) -> PostAnalysis:
    """Port of ``analysis::analyze``.

    TODO(port): the Rust crate ran a companion NER FSM
    (``crates/linkedin-posts/src/post_ner.rs``) that extracted companies,
    roles, and skills from post text and stored them as a JSON blob
    alongside the logistic features. That FSM is NOT ported — scoring
    here is purely keyword-feature-based and ``entities_json`` writes
    to the DB as NULL. If downstream consumers start reading structured
    post entities, wire a Python NER pass (e.g. spaCy, JobBERT) and
    populate that column from this function.
    """
    text = post.get("post_text") or ""
    if not text:
        intents = PostIntents(noise=1.0)
        return PostAnalysis(
            intents=intents,
            relevance_score=-0.30,
            keep=False,
            primary_intent="noise",
        )

    features = extract_features(post)
    intents = scorer.score_intents(features)
    relevance = intents.relevance_score()
    primary = intents.primary_intent()
    return PostAnalysis(
        intents=intents,
        relevance_score=relevance,
        keep=relevance >= DEFAULT_RELEVANCE_THRESHOLD,
        primary_intent=primary,
    )
