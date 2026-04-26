"""ICP (Ideal Customer Profile) scoring.

Native Python port of the former Rust ``icp`` crate. Vectorized with
NumPy — same scoring formulas, same logistic regression, same isotonic
calibration. The SIMD / prefetch / ``#[repr(C, align(64))]`` machinery
from the Rust version is dropped; NumPy handles batching.

Public surface:
    IcpCriteria, IcpWeights, CompanyIcpWeights
    IcpMatcher  — populate per-contact features
    ContactBatch — vectorized feature + score arrays
    LogisticScorer — 7-feature logistic model
    IsotonicCalibrator — pool-adjacent-violators post-calibration
    sigmoid, smooth_recency
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np


# ─── math helpers ─────────────────────────────────────────────────────────


def sigmoid(x: float | np.ndarray) -> float | np.ndarray:
    arr = np.clip(np.asarray(x, dtype=np.float32), -88.0, 88.0)
    return 1.0 / (1.0 + np.exp(-arr))


def smooth_recency(days: int | np.ndarray) -> float | np.ndarray:
    """exp(-0.015 * days). Matches the Rust ``smooth_recency`` shape."""
    return np.exp(-0.015 * np.asarray(days, dtype=np.float32))


# ─── criteria / weights ───────────────────────────────────────────────────


@dataclass
class IcpCriteria:
    target_industries: list[str] = field(default_factory=lambda: ["ai", "ml", "saas", "infrastructure"])
    min_employees: int | None = 20
    max_employees: int | None = 500
    target_seniorities: list[str] = field(default_factory=lambda: ["vp", "director", "head", "chief", "cto", "ceo"])
    target_departments: list[str] = field(default_factory=lambda: ["engineering", "ai", "ml", "data", "platform"])
    target_tech_stack: list[str] = field(default_factory=lambda: ["rust", "python", "kubernetes", "pytorch", "tensorflow"])
    target_locations: list[str] = field(default_factory=list)
    funding_stages: list[str] = field(default_factory=list)
    topics: list[str] = field(default_factory=list)
    min_stars: int | None = None
    min_repos: int | None = None
    required_languages: list[str] = field(default_factory=list)
    active_within_days: int | None = None


@dataclass
class IcpWeights:
    industry_weight: float = 25.0
    employee_weight: float = 15.0
    seniority_weight: float = 25.0
    department_weight: float = 15.0
    tech_weight: float = 10.0
    email_weight: float = 5.0

    @classmethod
    def from_json(cls, path: str | Path) -> "IcpWeights":
        p = Path(path)
        if not p.exists():
            return cls()
        data = json.loads(p.read_text())
        return cls(**{k: data.get(k, getattr(cls(), k)) for k in cls.__dataclass_fields__})

    def to_json(self, path: str | Path) -> None:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(self.__dict__, indent=2))

    def as_weights(self) -> list[float]:
        return [
            self.industry_weight,
            self.employee_weight,
            self.seniority_weight,
            self.department_weight,
            self.tech_weight,
            self.email_weight,
        ]


@dataclass
class CompanyFeatureWeights:
    has_description: float = 0.05
    description_length_norm: float = 0.03
    has_website: float = 0.04
    has_linkedin: float = 0.03
    has_email: float = 0.06
    email_count: float = 0.02
    tag_count: float = 0.01
    service_count: float = 0.02
    ai_tier: float = 0.15
    is_consultancy: float = -0.08
    is_product: float = 0.06
    facts_count: float = 0.01
    has_github: float = 0.04
    github_ai_score: float = 0.10
    hf_presence_score: float = 0.08
    intent_score: float = 0.12
    contacts_count: float = 0.03
    dm_contacts_count: float = 0.08
    has_job_board: float = 0.05


@dataclass
class CompanyIcpWeights:
    bias: float = 0.10
    weights: CompanyFeatureWeights = field(default_factory=CompanyFeatureWeights)


def load_icp_weights(path: str | Path) -> IcpWeights:
    return IcpWeights.from_json(path)


def load_company_icp_weights(path: str | Path) -> CompanyIcpWeights:
    p = Path(path)
    if not p.exists():
        return CompanyIcpWeights()
    data = json.loads(p.read_text())
    bias = float(data.get("bias", 0.10))
    raw_weights = data.get("weights", {}) or {}
    feature_defaults = CompanyFeatureWeights()
    weights = CompanyFeatureWeights(
        **{
            k: float(raw_weights.get(k, getattr(feature_defaults, k)))
            for k in CompanyFeatureWeights.__dataclass_fields__
        }
    )
    return CompanyIcpWeights(bias=bias, weights=weights)


# ─── matcher ──────────────────────────────────────────────────────────────


def _matches_any(value: str, targets: list[str]) -> bool:
    if not value:
        return False
    lower = value.lower()
    return any(t in lower for t in targets)


@dataclass
class IcpMatcher:
    target_industries: list[str] = field(default_factory=lambda: ["ai", "ml", "saas", "infrastructure"])
    target_seniorities: list[str] = field(default_factory=lambda: ["vp", "director", "head", "chief", "cto", "ceo"])
    target_departments: list[str] = field(default_factory=lambda: ["engineering", "ai", "ml", "data", "platform"])
    target_tech_stack: list[str] = field(default_factory=lambda: ["rust", "python", "kubernetes", "pytorch", "tensorflow"])
    employee_range: tuple[int, int] = (20, 500)

    def tech_overlap(self, tech_stack: str) -> int:
        if not self.target_tech_stack:
            return 0
        lower = (tech_stack or "").lower()
        hits = sum(1 for t in self.target_tech_stack if t in lower)
        return min(10, int((hits / len(self.target_tech_stack)) * 10))

    def populate_slot(
        self,
        batch: "ContactBatch",
        idx: int,
        industry: str,
        employee_count: int,
        seniority: str,
        title: str,
        tech_stack: str,
        email_status: str,
        days_since_update: int,
    ) -> None:
        batch.industry_match[idx] = int(_matches_any(industry, self.target_industries))
        lo, hi = self.employee_range
        batch.employee_in_range[idx] = int(lo <= employee_count <= hi)
        batch.seniority_match[idx] = int(_matches_any(seniority, self.target_seniorities))
        batch.department_match[idx] = int(_matches_any(title, self.target_departments))
        batch.tech_overlap[idx] = self.tech_overlap(tech_stack)
        status = (email_status or "").lower()
        if status == "verified":
            batch.email_verified[idx] = 2
        elif status in ("catch-all", "catchall"):
            batch.email_verified[idx] = 1
        else:
            batch.email_verified[idx] = 0
        batch.recency_days[idx] = days_since_update


# ─── batch ────────────────────────────────────────────────────────────────


def _recency_bucket(days: np.ndarray) -> np.ndarray:
    """Discrete recency ramp from the Rust ``compute_scores`` path."""
    d = days.astype(np.int32)
    out = np.zeros_like(d, dtype=np.float32)
    out = np.where(d <= 7, 15.0, out)
    out = np.where((d > 7) & (d <= 14), 12.0, out)
    out = np.where((d > 14) & (d <= 30), 9.0, out)
    out = np.where((d > 30) & (d <= 90), 5.0, out)
    out = np.where((d > 90) & (d <= 180), 2.0, out)
    return out


@dataclass
class ContactBatch:
    capacity: int = 256
    industry_match: np.ndarray = field(init=False)
    employee_in_range: np.ndarray = field(init=False)
    seniority_match: np.ndarray = field(init=False)
    department_match: np.ndarray = field(init=False)
    tech_overlap: np.ndarray = field(init=False)
    email_verified: np.ndarray = field(init=False)
    recency_days: np.ndarray = field(init=False)
    semantic_icp_score: np.ndarray = field(init=False)
    scores: np.ndarray = field(init=False)
    count: int = 0

    def __post_init__(self) -> None:
        cap = self.capacity
        self.industry_match = np.zeros(cap, dtype=np.uint8)
        self.employee_in_range = np.zeros(cap, dtype=np.uint8)
        self.seniority_match = np.zeros(cap, dtype=np.uint8)
        self.department_match = np.zeros(cap, dtype=np.uint8)
        self.tech_overlap = np.zeros(cap, dtype=np.uint8)
        self.email_verified = np.zeros(cap, dtype=np.uint8)
        self.recency_days = np.zeros(cap, dtype=np.uint16)
        self.semantic_icp_score = np.zeros(cap, dtype=np.float32)
        self.scores = np.zeros(cap, dtype=np.float32)

    def _active(self) -> slice:
        return slice(0, self.count)

    def compute_scores(self, weights: IcpWeights | None = None) -> None:
        w = weights or IcpWeights()
        s = self._active()
        max_ = (
            w.industry_weight + w.employee_weight + w.seniority_weight
            + w.department_weight + w.tech_weight + w.email_weight
        )
        score = np.zeros(self.count, dtype=np.float32)
        score += self.industry_match[s].astype(np.float32) * w.industry_weight
        score += self.employee_in_range[s].astype(np.float32) * w.employee_weight
        score += self.seniority_match[s].astype(np.float32) * w.seniority_weight
        score += self.department_match[s].astype(np.float32) * w.department_weight
        score += (self.tech_overlap[s].astype(np.float32) / 10.0) * w.tech_weight

        email = self.email_verified[s]
        score += np.where(email == 2, w.email_weight, np.where(email == 1, w.email_weight * 0.4, 0.0))

        icp_fit = (score / max_) * 100.0
        recency = _recency_bucket(self.recency_days[s])
        self.scores[s] = icp_fit * 0.85 + recency

    def compute_scores_semantic(self, weights: IcpWeights, semantic_weight: float) -> None:
        s = self._active()
        base_max = (
            weights.industry_weight + weights.employee_weight + weights.seniority_weight
            + weights.department_weight + weights.tech_weight + weights.email_weight
        )
        total_max = base_max + semantic_weight

        score = np.zeros(self.count, dtype=np.float32)
        score += self.industry_match[s].astype(np.float32) * weights.industry_weight
        score += self.employee_in_range[s].astype(np.float32) * weights.employee_weight
        score += self.seniority_match[s].astype(np.float32) * weights.seniority_weight
        score += self.department_match[s].astype(np.float32) * weights.department_weight

        keyword_tech = self.tech_overlap[s].astype(np.float32) / 10.0
        semantic_tech = self.semantic_icp_score[s]
        blended_tech = np.maximum(keyword_tech, semantic_tech)
        score += blended_tech * weights.tech_weight

        email = self.email_verified[s]
        score += np.where(email == 2, weights.email_weight, np.where(email == 1, weights.email_weight * 0.4, 0.0))

        score += self.semantic_icp_score[s] * semantic_weight

        icp_fit = (score / total_max) * 100.0
        recency = _recency_bucket(self.recency_days[s])
        self.scores[s] = icp_fit * 0.85 + recency

    def compute_scores_fast(self, weights: IcpWeights) -> None:
        s = self._active()
        max_ = (
            weights.industry_weight + weights.employee_weight + weights.seniority_weight
            + weights.department_weight + weights.tech_weight + weights.email_weight
        )
        score = np.zeros(self.count, dtype=np.float32)
        score += self.industry_match[s].astype(np.float32) * weights.industry_weight
        score += self.employee_in_range[s].astype(np.float32) * weights.employee_weight
        score += self.seniority_match[s].astype(np.float32) * weights.seniority_weight
        score += self.department_match[s].astype(np.float32) * weights.department_weight
        score += (self.tech_overlap[s].astype(np.float32) / 10.0) * weights.tech_weight
        email = self.email_verified[s]
        score += np.where(email == 2, weights.email_weight, np.where(email == 1, weights.email_weight * 0.4, 0.0))

        icp_fit = (score / max_) * 100.0
        recency = np.minimum(np.exp(-0.015 * self.recency_days[s].astype(np.float32)), 1.0) * 15.0
        self.scores[s] = icp_fit * 0.85 + recency

    def compute_scores_logistic(self, scorer: "LogisticScorer") -> None:
        if not scorer.trained:
            self.compute_scores()
            return
        features = LogisticScorer.extract_features_batch(self)
        semantic = self.semantic_icp_score[: self.count]
        dot = np.full(self.count, scorer.bias, dtype=np.float32)
        for j in range(7):
            dot += scorer.weights[j] * features[:, j]
        has_semantic = semantic > 0
        dot = np.where(has_semantic, dot + scorer.semantic_weight * semantic, dot)
        self.scores[: self.count] = sigmoid(dot) * 100.0

    compute_scores_logistic_fast = compute_scores_logistic

    def top_k(self, k: int) -> list[int]:
        k = min(k, self.count)
        if k == 0:
            return []
        # argpartition gives top-k unordered; then sort the slice
        idx = np.argpartition(-self.scores[: self.count], k - 1)[:k]
        idx = idx[np.argsort(-self.scores[idx])]
        return idx.tolist()

    def top_k_scored(self, k: int) -> list[tuple[int, float]]:
        return [(i, float(self.scores[i])) for i in self.top_k(k)]

    def top_k_json(self, k: int) -> str:
        return json.dumps(
            [{"index": i, "score": round(float(s), 2)} for i, s in self.top_k_scored(k)]
        )


# ─── logistic scorer ──────────────────────────────────────────────────────


@dataclass
class WelfordStats:
    count: int = 0
    mean: float = 0.0
    m2: float = 0.0

    def update(self, value: float) -> None:
        self.count += 1
        delta = value - self.mean
        self.mean += delta / self.count
        delta2 = value - self.mean
        self.m2 += delta * delta2

    @property
    def variance(self) -> float:
        return 1.0 if self.count < 2 else self.m2 / self.count

    @property
    def std_dev(self) -> float:
        return max(math.sqrt(self.variance), 1e-6)

    def normalize(self, value: float) -> float:
        return (value - self.mean) / self.std_dev


@dataclass
class LogisticScorer:
    weights: np.ndarray = field(default_factory=lambda: np.zeros(7, dtype=np.float32))
    bias: float = 0.0
    feature_stats: list[WelfordStats] = field(default_factory=lambda: [WelfordStats() for _ in range(7)])
    trained: bool = False
    semantic_weight: float = 0.0

    @classmethod
    def default_pretrained(cls) -> "LogisticScorer":
        return cls(
            weights=np.array([0.8, 0.5, 0.8, 0.5, 0.3, 0.2, 0.3], dtype=np.float32),
            bias=-1.5,
            trained=True,
            semantic_weight=0.4,
        )

    @staticmethod
    def extract_features(batch: ContactBatch, idx: int) -> np.ndarray:
        return np.array(
            [
                float(batch.industry_match[idx]),
                float(batch.employee_in_range[idx]),
                float(batch.seniority_match[idx]),
                float(batch.department_match[idx]),
                float(batch.tech_overlap[idx]) / 10.0,
                float(batch.email_verified[idx]) / 2.0,
                float(smooth_recency(int(batch.recency_days[idx]))),
            ],
            dtype=np.float32,
        )

    @staticmethod
    def extract_features_batch(batch: ContactBatch) -> np.ndarray:
        s = slice(0, batch.count)
        feats = np.zeros((batch.count, 7), dtype=np.float32)
        feats[:, 0] = batch.industry_match[s]
        feats[:, 1] = batch.employee_in_range[s]
        feats[:, 2] = batch.seniority_match[s]
        feats[:, 3] = batch.department_match[s]
        feats[:, 4] = batch.tech_overlap[s].astype(np.float32) / 10.0
        feats[:, 5] = batch.email_verified[s].astype(np.float32) / 2.0
        feats[:, 6] = smooth_recency(batch.recency_days[s])
        return feats

    def score(self, features: np.ndarray) -> float:
        dot = float(self.bias + float(np.dot(self.weights, features)))
        return float(sigmoid(dot))

    def score_with_semantic(self, features: np.ndarray, semantic_score: float) -> float:
        dot = float(self.bias + float(np.dot(self.weights, features)) + self.semantic_weight * semantic_score)
        return float(sigmoid(dot))

    def score_batch(self, batch: ContactBatch) -> None:
        feats = self.extract_features_batch(batch)
        dot = np.full(batch.count, self.bias, dtype=np.float32)
        for j in range(7):
            dot += self.weights[j] * feats[:, j]
        semantic = batch.semantic_icp_score[: batch.count]
        has_sem = semantic > 0
        dot = np.where(has_sem, dot + self.semantic_weight * semantic, dot)
        batch.scores[: batch.count] = sigmoid(dot) * 100.0

    def fit(
        self,
        features: np.ndarray,
        labels: np.ndarray,
        learning_rate: float,
        epochs: int,
    ) -> None:
        features = np.asarray(features, dtype=np.float32)
        labels = np.asarray(labels, dtype=np.float32)
        for sample in features:
            for j in range(7):
                self.feature_stats[j].update(float(sample[j]))

        for epoch in range(epochs):
            lr = learning_rate * (0.995 ** epoch)
            for x, y in zip(features, labels):
                pred = self.score(x)
                error = pred - float(y)
                self.weights -= lr * error * x
                self.bias -= lr * error

        self.trained = True

    @classmethod
    def from_json(cls, path: str | Path) -> "LogisticScorer":
        p = Path(path)
        if not p.exists():
            return cls.default_pretrained()
        data: dict[str, Any] = json.loads(p.read_text())
        return cls(
            weights=np.array(data.get("weights", [0.0] * 7), dtype=np.float32),
            bias=float(data.get("bias", 0.0)),
            trained=bool(data.get("trained", False)),
            semantic_weight=float(data.get("semantic_weight", 0.0)),
        )

    def to_json(self, path: str | Path) -> None:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(
            json.dumps(
                {
                    "weights": self.weights.tolist(),
                    "bias": float(self.bias),
                    "trained": bool(self.trained),
                    "semantic_weight": float(self.semantic_weight),
                },
                indent=2,
            )
        )


# ─── isotonic calibration ─────────────────────────────────────────────────


@dataclass
class IsotonicCalibrator:
    breakpoints: list[tuple[float, float]] = field(default_factory=list)
    fitted: bool = False

    def fit(self, scores: np.ndarray | list[float], labels: np.ndarray | list[float]) -> None:
        scores = np.asarray(scores, dtype=np.float32)
        labels = np.asarray(labels, dtype=np.float32)
        if len(scores) != len(labels):
            raise ValueError("scores and labels must have same length")
        if len(scores) == 0:
            return

        order = np.argsort(scores, kind="stable")
        pairs = list(zip(scores[order].tolist(), labels[order].tolist()))

        # Pool-adjacent-violators
        blocks: list[list[float]] = []  # each: [score_sum, label_sum, count]
        for s, l in pairs:
            blocks.append([s, l, 1])
            while len(blocks) >= 2:
                last = blocks[-1]
                prev = blocks[-2]
                avg_last = last[1] / last[2]
                avg_prev = prev[1] / prev[2]
                if avg_last < avg_prev:
                    blocks.pop()
                    prev[0] += last[0]
                    prev[1] += last[1]
                    prev[2] += last[2]
                else:
                    break

        self.breakpoints = [(b[0] / b[2], b[1] / b[2]) for b in blocks]
        self.fitted = True

    def calibrate(self, raw_score: float) -> float:
        if not self.fitted or not self.breakpoints:
            return raw_score
        if raw_score <= self.breakpoints[0][0]:
            return self.breakpoints[0][1]
        if raw_score >= self.breakpoints[-1][0]:
            return self.breakpoints[-1][1]
        # find first bp with x > raw_score
        xs = [bp[0] for bp in self.breakpoints]
        pos = next((i for i, x in enumerate(xs) if x > raw_score), len(xs))
        if pos == 0:
            return self.breakpoints[0][1]
        x0, y0 = self.breakpoints[pos - 1]
        x1, y1 = self.breakpoints[pos]
        t = 0.5 if abs(x1 - x0) < 1e-10 else (raw_score - x0) / (x1 - x0)
        return y0 + t * (y1 - y0)

    def calibrate_batch(self, batch: ContactBatch) -> None:
        for i in range(batch.count):
            raw = float(batch.scores[i]) / 100.0
            batch.scores[i] = self.calibrate(raw) * 100.0


__all__ = [
    "CompanyFeatureWeights",
    "CompanyIcpWeights",
    "ContactBatch",
    "IcpCriteria",
    "IcpMatcher",
    "IcpWeights",
    "IsotonicCalibrator",
    "LogisticScorer",
    "WelfordStats",
    "load_company_icp_weights",
    "load_icp_weights",
    "sigmoid",
    "smooth_recency",
]
