"""
Trajectory analysis evaluation — deepeval (replaces braintrust-trajectory.ts).

Runs 15 trajectory test cases through the Qwen LLM and evaluates with:
  1. Factuality (GEval)       — replaces autoevals Factuality
  2. Relevance (GEval)        — replaces autoevals Relevance
  3. PIILeakage (GEval)       — checks for exposed personal/private information
  4. ClinicalFactuality       — custom: validates threshold claims
  5. RiskClassification       — custom: validates risk tier accuracy
  6. TrajectoryDirection      — custom: validates improving/stable/deteriorating

Environment variables:
  DASHSCOPE_API_KEY  — required (Qwen task LLM)
  DASHSCOPE_BASE_URL — optional, defaults to dashscope compatible-mode endpoint
  DEEPSEEK_API_KEY   — required (judge LLM for GEval)
  DEEPSEEK_BASE_URL  — optional, defaults to https://api.deepseek.com/v1

Run:
  pip install -r evals/requirements.txt
  DASHSCOPE_API_KEY=sk-... DEEPSEEK_API_KEY=sk-... python evals/trajectory_eval.py
"""

from __future__ import annotations

import math
import os
import re
import sys
from datetime import date, timedelta
from typing import Optional

from openai import OpenAI

from deepeval import evaluate
from deepeval.models import DeepEvalBaseLLM
from deepeval.metrics import GEval, BaseMetric
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

_DASHSCOPE_API_KEY = os.environ.get("DASHSCOPE_API_KEY", "")
_DASHSCOPE_BASE_URL = os.environ.get(
    "DASHSCOPE_BASE_URL",
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
)
_DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
_DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")

# Allow pytest collection even without API keys — standalone usage still requires them
_MISSING_KEYS = not _DASHSCOPE_API_KEY or not _DEEPSEEK_API_KEY
if _MISSING_KEYS and "pytest" not in sys.modules:
    if not _DASHSCOPE_API_KEY:
        raise EnvironmentError("DASHSCOPE_API_KEY is required")
    if not _DEEPSEEK_API_KEY:
        raise EnvironmentError("DEEPSEEK_API_KEY is required")


# ---------------------------------------------------------------------------
# DeepSeek judge (same pattern as ragas_eval.py)
# ---------------------------------------------------------------------------


class DeepSeekEvalLLM(DeepEvalBaseLLM):
    def __init__(self, model: str) -> None:
        self.model = model
        self._client = OpenAI(api_key=_DEEPSEEK_API_KEY, base_url=_DEEPSEEK_BASE_URL)

    def load_model(self) -> OpenAI:
        return self._client

    def generate(self, prompt: str, schema: Optional[type] = None) -> str:
        response = self._client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
        )
        return response.choices[0].message.content or ""

    async def a_generate(self, prompt: str, schema: Optional[type] = None) -> str:
        return self.generate(prompt, schema)

    def get_model_name(self) -> str:
        return self.model


judge = DeepSeekEvalLLM(model="deepseek-chat")

# ---------------------------------------------------------------------------
# Metric references (mirrors METRIC_REFERENCES in lib/embeddings.ts)
# ---------------------------------------------------------------------------

METRIC_REFERENCES: dict[str, dict] = {
    "hdl_ldl_ratio": {
        "label": "HDL/LDL Ratio",
        "unit": "ratio",
        "optimal": (0.4, float("inf")),
        "borderline": (0.3, 0.4),
        "description": "Higher values indicate better cardiovascular lipid balance",
        "reference": "Castelli WP. Atherosclerosis. 1996;124 Suppl:S1-9. doi:10.1016/0021-9150(96)05851-0",
    },
    "total_cholesterol_hdl_ratio": {
        "label": "TC/HDL Ratio",
        "unit": "ratio",
        "optimal": (0, 4.5),
        "borderline": (4.5, 5.5),
        "description": "Atherogenic index; lower is better for cardiovascular risk",
        "reference": "Millán J et al. Vasc Health Risk Manag. 2009;5:757-765. doi:10.2147/vhrm.s6269",
    },
    "triglyceride_hdl_ratio": {
        "label": "TG/HDL Ratio",
        "unit": "ratio",
        "optimal": (0, 2.0),
        "borderline": (2.0, 3.5),
        "description": "Surrogate marker for insulin resistance and small dense LDL particles",
        "reference": "McLaughlin T et al. Ann Intern Med. 2003;139(10):802-809. doi:10.7326/0003-4819-139-10-200311180-00007",
    },
    "glucose_triglyceride_index": {
        "label": "TyG Index",
        "unit": "index",
        "optimal": (0, 8.5),
        "borderline": (8.5, 9.0),
        "description": "Triglyceride-glucose index; surrogate for insulin resistance",
        "reference": "Simental-Mendía LE et al. Metab Syndr Relat Disord. 2008;6(4):299-304. doi:10.1089/met.2008.0034",
    },
    "neutrophil_lymphocyte_ratio": {
        "label": "NLR",
        "unit": "ratio",
        "optimal": (1.0, 3.0),
        "borderline": (3.0, 5.0),
        "description": "Systemic inflammation marker; elevated values associated with poorer outcomes",
        "reference": "Forget P et al. BMC Res Notes. 2017;10:12. doi:10.1186/s13104-016-2335-5",
    },
    "bun_creatinine_ratio": {
        "label": "BUN/Creatinine",
        "unit": "ratio",
        "optimal": (10, 20),
        "borderline": (20, 25),
        "description": "Renal function discriminator; helps distinguish pre-renal from intrinsic causes",
        "reference": "Hosten AO. Clinical Methods. 3rd ed. Butterworths; 1990. Ch. 193. PMID:21250147",
    },
    "ast_alt_ratio": {
        "label": "De Ritis Ratio (AST/ALT)",
        "unit": "ratio",
        "optimal": (0.8, 1.2),
        "borderline": (1.2, 2.0),
        "description": "Hepatocellular injury pattern; >2.0 suggests alcoholic liver disease",
        "reference": "De Ritis F et al. Clin Chim Acta. 1957;2(1):70-74; Botros M, Sikaris KA. Clin Biochem Rev. 2013;34(3):117-130. PMID:24353357",
    },
}


def classify_metric_risk(metric_key: str, value: float) -> str:
    ref = METRIC_REFERENCES.get(metric_key)
    if not ref:
        return "optimal"
    opt_lo, opt_hi = ref["optimal"]
    _bord_lo, bord_hi = ref["borderline"]
    if value < opt_lo:
        return "low"
    if value <= opt_hi:
        return "optimal"
    if value <= bord_hi:
        return "borderline"
    return "elevated"


def compute_metric_velocity(
    prev: dict[str, Optional[float]],
    curr: dict[str, Optional[float]],
    days_between: int,
) -> dict[str, Optional[float]]:
    if days_between <= 0:
        return {}
    velocity: dict[str, Optional[float]] = {}
    for key in curr:
        p = prev.get(key)
        c = curr.get(key)
        velocity[key] = (c - p) / days_between if p is not None and c is not None else None
    return velocity


MARKER_ALIAS_MAP: dict[str, list[str]] = {
    "hdl": ["hdl", "hdl cholesterol", "hdl-c", "hdl-cholesterol"],
    "ldl": ["ldl", "ldl cholesterol", "ldl-c", "ldl-cholesterol"],
    "total_cholesterol": ["total cholesterol", "cholesterol total", "cholesterol"],
    "triglycerides": ["triglycerides", "triglyceride", "trig"],
    "glucose": ["glucose", "fasting glucose", "blood glucose"],
    "neutrophils": ["neutrophils", "neutrophil", "neutrophil count", "neut"],
    "lymphocytes": ["lymphocytes", "lymphocyte", "lymphocyte count", "lymph"],
    "bun": ["bun", "blood urea nitrogen", "urea nitrogen"],
    "creatinine": ["creatinine", "creat"],
    "ast": ["ast", "aspartate aminotransferase", "sgot"],
    "alt": ["alt", "alanine aminotransferase", "sgpt"],
}


def compute_derived_metrics(markers: list[dict]) -> dict[str, Optional[float]]:
    lookup: dict[str, float] = {}
    for m in markers:
        try:
            val = float(m["value"])
            lookup[m["name"].lower().strip()] = val
        except (ValueError, KeyError):
            pass

    def resolve(key: str) -> Optional[float]:
        for alias in MARKER_ALIAS_MAP.get(key, []):
            if alias in lookup:
                return lookup[alias]
        return None

    def ratio(a: str, b: str) -> Optional[float]:
        va, vb = resolve(a), resolve(b)
        if va is None or vb is None or vb == 0:
            return None
        return va / vb

    trig = resolve("triglycerides")
    gluc = resolve("glucose")
    gti = (
        math.log10(trig * gluc * 0.5)
        if trig is not None and gluc is not None and trig > 0 and gluc > 0
        else None
    )

    return {
        "hdl_ldl_ratio": ratio("hdl", "ldl"),
        "total_cholesterol_hdl_ratio": ratio("total_cholesterol", "hdl"),
        "triglyceride_hdl_ratio": ratio("triglycerides", "hdl"),
        "glucose_triglyceride_index": gti,
        "neutrophil_lymphocyte_ratio": ratio("neutrophils", "lymphocytes"),
        "bun_creatinine_ratio": ratio("bun", "creatinine"),
        "ast_alt_ratio": ratio("ast", "alt"),
    }


# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------


def build_reference_context() -> str:
    lines = []
    for ref in METRIC_REFERENCES.values():
        opt_lo, opt_hi = ref["optimal"]
        opt_hi_str = "∞" if opt_hi == float("inf") else str(opt_hi)
        bord_lo, bord_hi = ref["borderline"]
        lines.append(
            f"- {ref['label']}: optimal {opt_lo}–{opt_hi_str}, borderline {bord_lo}–{bord_hi}. "
            f"{ref['description']}. Ref: {ref['reference']}"
        )
    return "\n".join(lines)


def build_state_context(
    markers: list[dict],
    state_index: int,
    state_date: str,
    derived_metrics: dict[str, Optional[float]],
    similarity: Optional[float],
) -> str:
    classified_parts = []
    for k, v in derived_metrics.items():
        if v is not None:
            risk = classify_metric_risk(k, v)
            ref = METRIC_REFERENCES.get(k)
            label = ref["label"] if ref else k
            classified_parts.append(f"{label}: {v:.4f} [{risk}]")
    classified = ", ".join(classified_parts) if classified_parts else "none"
    sim_str = f" | similarity to latest: {similarity * 100:.1f}%" if similarity is not None else ""
    marker_lines = "\n".join(
        f"{m['name']}: {m['value']} {m['unit']} (ref: {m.get('reference_range', 'N/A')}) [{m['flag']}]"
        for m in markers
    )
    return f"--- State {state_index + 1} ({state_date}){sim_str} ---\nDerived metrics: {classified}\n{marker_lines}"


def build_velocity_context(
    velocity: dict[str, Optional[float]],
    from_date: str,
    to_date: str,
    days_between: int,
) -> str:
    delta_parts = []
    for k, d in velocity.items():
        if d is not None:
            ref = METRIC_REFERENCES.get(k)
            label = ref["label"] if ref else k
            delta_parts.append(f"{label}: {d:.6f}/day")
    deltas = ", ".join(delta_parts) if delta_parts else "no common metrics"
    return f"{from_date} -> {to_date} ({days_between}d): {deltas}"


SYSTEM_PROMPT = f"""You are a health trajectory analyst grounded in clinical research. You analyze how a person's overall health state evolves over multiple blood tests.

Use the following evidence-based thresholds for your analysis:
{build_reference_context()}

Focus on:
1. Risk classification of each derived metric at each time point (optimal/borderline/elevated)
2. Trajectory direction: improving, stable, or deteriorating — use the rate-of-change data
3. Cosine similarity between states as a measure of overall health stability
4. Clinically significant shifts that may warrant follow-up

When citing a threshold or classification, note the source paper briefly (e.g., "per McLaughlin et al., TG/HDL >3.5 suggests insulin resistance").

Be concise and factual. Remind the user to consult their doctor for medical advice."""


# ---------------------------------------------------------------------------
# Trajectory task (calls Qwen via DashScope)
# ---------------------------------------------------------------------------

_qwen_client = OpenAI(api_key=_DASHSCOPE_API_KEY, base_url=_DASHSCOPE_BASE_URL)


def trajectory_task(tc: dict) -> str:
    markers = tc["markers"]
    days_between = tc["days_between"]

    prev_derived = compute_derived_metrics(markers["prev"])
    curr_derived = compute_derived_metrics(markers["curr"])

    prev_date = "2025-06-15"
    curr_date = (
        (date(2025, 6, 15) + timedelta(days=days_between)).isoformat()
        if days_between > 0
        else prev_date
    )

    state_count = 2 if days_between > 0 else 1
    states = []
    if days_between > 0:
        states.append(build_state_context(markers["prev"], 0, prev_date, prev_derived, 0.85))
        states.append(build_state_context(markers["curr"], 1, curr_date, curr_derived, 1.0))
    else:
        states.append(build_state_context(markers["curr"], 0, curr_date, curr_derived, 1.0))

    context = "\n\n".join(states)

    velocity_context = ""
    if days_between > 0:
        velocity = compute_metric_velocity(prev_derived, curr_derived, days_between)
        velocity_context = (
            "\n\nRate of change (per day) between consecutive states:\n"
            + build_velocity_context(velocity, prev_date, curr_date, days_between)
        )

    user_content = f"Analyze this health trajectory with {state_count} states:\n\n{context}{velocity_context}"

    completion = _qwen_client.chat.completions.create(
        model="qwen-plus",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        temperature=0.3,
        max_tokens=1500,
    )
    return completion.choices[0].message.content or ""


# ---------------------------------------------------------------------------
# Custom metrics (port of TypeScript scorers)
# ---------------------------------------------------------------------------

_THRESHOLD_PATTERNS: list[dict] = [
    {
        "label": "HDL/LDL optimal >= 0.4",
        "pattern": re.compile(
            r"hdl[/\s]*ldl[^.]*(?:optimal|good|desirable)[^.]*(?:>|>=|above|over|at least)\s*([\d.]+)",
            re.IGNORECASE,
        ),
        "validate": lambda m: 0.3 <= float(m.group(1)) <= 0.5,
    },
    {
        "label": "TC/HDL optimal < 4.5",
        "pattern": re.compile(
            r"tc[/\s]*hdl[^.]*(?:optimal|ideal|low risk)[^.]*(?:<|<=|below|under)\s*([\d.]+)",
            re.IGNORECASE,
        ),
        "validate": lambda m: 4.0 <= float(m.group(1)) <= 5.0,
    },
    {
        "label": "TC/HDL borderline 4.5-5.5",
        "pattern": re.compile(
            r"tc[/\s]*hdl[^.]*(?:borderline|moderate)[^.]*(\d+\.?\d*)\s*[-–to]+\s*(\d+\.?\d*)",
            re.IGNORECASE,
        ),
        "validate": lambda m: 4.0 <= float(m.group(1)) <= 5.0 and 5.0 <= float(m.group(2)) <= 6.0,
    },
    {
        "label": "TG/HDL > 3.5 suggests insulin resistance",
        "pattern": re.compile(
            r"tg[/\s]*hdl[^.]*(?:>|>=|above|over|exceeds?)\s*([\d.]+)[^.]*insulin\s*resistance",
            re.IGNORECASE,
        ),
        "validate": lambda m: 2.5 <= float(m.group(1)) <= 4.0,
    },
    {
        "label": "TG/HDL optimal < 2.0",
        "pattern": re.compile(
            r"tg[/\s]*hdl[^.]*(?:optimal|ideal|normal)[^.]*(?:<|<=|below|under)\s*([\d.]+)",
            re.IGNORECASE,
        ),
        "validate": lambda m: 1.5 <= float(m.group(1)) <= 2.5,
    },
    {
        "label": "TyG index threshold for insulin resistance",
        "pattern": re.compile(
            r"tyg[^.]*(?:>|>=|above|over|exceeds?)\s*([\d.]+)[^.]*insulin\s*resistance",
            re.IGNORECASE,
        ),
        "validate": lambda m: 8.0 <= float(m.group(1)) <= 9.5,
    },
    {
        "label": "TyG optimal < 8.5",
        "pattern": re.compile(
            r"tyg[^.]*(?:optimal|normal|ideal)[^.]*(?:<|<=|below|under)\s*([\d.]+)",
            re.IGNORECASE,
        ),
        "validate": lambda m: 8.0 <= float(m.group(1)) <= 9.0,
    },
    {
        "label": "NLR optimal 1-3",
        "pattern": re.compile(
            r"nlr[^.]*(?:normal|optimal)[^.]*(\d+\.?\d*)\s*[-–to]+\s*(\d+\.?\d*)",
            re.IGNORECASE,
        ),
        "validate": lambda m: 0.5 <= float(m.group(1)) <= 2.0 and 2.5 <= float(m.group(2)) <= 4.0,
    },
    {
        "label": "NLR elevated > 5",
        "pattern": re.compile(
            r"nlr[^.]*(?:elevated|high|abnormal)[^.]*(?:>|>=|above|over|exceeds?)\s*([\d.]+)",
            re.IGNORECASE,
        ),
        "validate": lambda m: 3.0 <= float(m.group(1)) <= 6.0,
    },
    {
        "label": "BUN/Creatinine optimal 10-20",
        "pattern": re.compile(
            r"bun[/\s]*creatinine[^.]*(?:normal|optimal)[^.]*(\d+\.?\d*)\s*[-–to]+\s*(\d+\.?\d*)",
            re.IGNORECASE,
        ),
        "validate": lambda m: 8 <= float(m.group(1)) <= 12 and 18 <= float(m.group(2)) <= 22,
    },
    {
        "label": "BUN/Creatinine > 20 pre-renal",
        "pattern": re.compile(
            r"bun[/\s]*creatinine[^.]*(?:>|>=|above|over|exceeds?)\s*([\d.]+)[^.]*pre[\s-]*renal",
            re.IGNORECASE,
        ),
        "validate": lambda m: 18 <= float(m.group(1)) <= 25,
    },
    {
        "label": "De Ritis > 2.0 alcoholic liver",
        "pattern": re.compile(
            r"(?:de\s*ritis|ast[/\s]*alt)[^.]*(?:>|>=|above|over|exceeds?)\s*([\d.]+)[^.]*(?:alcoholic|liver)",
            re.IGNORECASE,
        ),
        "validate": lambda m: 1.5 <= float(m.group(1)) <= 2.5,
    },
    {
        "label": "De Ritis optimal 0.8-1.2",
        "pattern": re.compile(
            r"(?:de\s*ritis|ast[/\s]*alt)[^.]*(?:optimal|normal)[^.]*(\d+\.?\d*)\s*[-–to]+\s*(\d+\.?\d*)",
            re.IGNORECASE,
        ),
        "validate": lambda m: 0.6 <= float(m.group(1)) <= 1.0 and 1.0 <= float(m.group(2)) <= 1.5,
    },
    {"label": "McLaughlin citation for TG/HDL", "pattern": re.compile(r"McLaughlin[^.]*(?:tg|triglyceride)[^.]*hdl", re.IGNORECASE), "validate": lambda m: True},
    {"label": "Forget citation for NLR", "pattern": re.compile(r"Forget[^.]*(?:nlr|neutrophil)", re.IGNORECASE), "validate": lambda m: True},
    {"label": "Simental citation for TyG", "pattern": re.compile(r"Simental[^.]*(?:tyg|triglyceride|glucose)", re.IGNORECASE), "validate": lambda m: True},
    {"label": "Castelli citation for HDL/LDL", "pattern": re.compile(r"Castelli[^.]*(?:hdl|ldl|lipid|cholesterol)", re.IGNORECASE), "validate": lambda m: True},
    {"label": "De Ritis / Botros citation", "pattern": re.compile(r"(?:De\s*Ritis|Botros|Sikaris)[^.]*(?:ast|alt|liver|hepat)", re.IGNORECASE), "validate": lambda m: True},
    {"label": "Hosten citation for BUN/Creatinine", "pattern": re.compile(r"Hosten[^.]*(?:bun|creatinine|renal|kidney)", re.IGNORECASE), "validate": lambda m: True},
]

_RISK_LABEL_PATTERN = re.compile(
    r"(?:hdl/ldl|tc/hdl|tg/hdl|tyg|nlr|bun/creatinine|de ritis|ast/alt)[^:]*:\s*([\d.]+)\s*\[(\w+)\]",
    re.IGNORECASE,
)

_METRIC_TEXT_TO_KEY = [
    (re.compile(r"hdl/ldl|hdl ldl"), "hdl_ldl_ratio"),
    (re.compile(r"tc/hdl|tc hdl"), "total_cholesterol_hdl_ratio"),
    (re.compile(r"tg/hdl|tg hdl"), "triglyceride_hdl_ratio"),
    (re.compile(r"tyg"), "glucose_triglyceride_index"),
    (re.compile(r"nlr"), "neutrophil_lymphocyte_ratio"),
    (re.compile(r"bun"), "bun_creatinine_ratio"),
    (re.compile(r"de ritis|ast/alt"), "ast_alt_ratio"),
]


def _validate_explicit_risk_labels(output: str) -> tuple[int, int]:
    correct = total = 0
    for m in _RISK_LABEL_PATTERN.finditer(output):
        total += 1
        metric_text = m.group(0).lower()
        value = float(m.group(1))
        claimed_risk = m.group(2).lower()

        metric_key = None
        for pat, key in _METRIC_TEXT_TO_KEY:
            if pat.search(metric_text):
                metric_key = key
                break

        if metric_key and metric_key in METRIC_REFERENCES:
            expected = classify_metric_risk(metric_key, value)
            if claimed_risk == expected:
                correct += 1

    return correct, total


class ClinicalFactualityMetric(BaseMetric):
    def __init__(self, threshold: float = 0.5) -> None:
        self.threshold = threshold
        self.score = 0.0
        self.reason = ""

    @property
    def __name__(self) -> str:
        return "ClinicalFactuality"

    def measure(self, test_case: LLMTestCase) -> float:
        output = test_case.actual_output or ""
        matched: list[str] = []
        failed: list[str] = []

        for entry in _THRESHOLD_PATTERNS:
            m = entry["pattern"].search(output)
            if m:
                if entry["validate"](m):
                    matched.append(entry["label"])
                else:
                    failed.append(entry["label"])

        correct, total = _validate_explicit_risk_labels(output)
        if total > 0:
            matched.append(f"{correct}/{total} explicit risk labels correct")
            if correct < total:
                failed.append(f"{total - correct}/{total} explicit risk labels incorrect")

        n = len(matched) + len(failed)
        self.score = 1.0 if n == 0 else len(matched) / n
        self.reason = f"matched={matched}, failed={failed}"
        return self.score

    def is_successful(self) -> bool:
        return self.score >= self.threshold


_METRIC_OUTPUT_PATTERNS: dict[str, list[re.Pattern]] = {
    "hdl_ldl_ratio": [re.compile(r"hdl[/\s]*ldl", re.I), re.compile(r"hdl\s+to\s+ldl", re.I)],
    "total_cholesterol_hdl_ratio": [re.compile(r"tc[/\s]*hdl", re.I), re.compile(r"total\s*cholesterol[/\s]*hdl", re.I), re.compile(r"atherogenic\s*index", re.I)],
    "triglyceride_hdl_ratio": [re.compile(r"tg[/\s]*hdl", re.I), re.compile(r"triglyceride[/\s]*hdl", re.I)],
    "glucose_triglyceride_index": [re.compile(r"tyg", re.I), re.compile(r"triglyceride[\s-]*glucose", re.I), re.compile(r"glucose[\s-]*triglyceride", re.I)],
    "neutrophil_lymphocyte_ratio": [re.compile(r"nlr", re.I), re.compile(r"neutrophil[/\s]*lymphocyte", re.I)],
    "bun_creatinine_ratio": [re.compile(r"bun[/\s]*creatinine", re.I), re.compile(r"bun[/\s]*cr\b", re.I)],
    "ast_alt_ratio": [re.compile(r"de\s*ritis", re.I), re.compile(r"ast[/\s]*alt", re.I)],
}

_RISK_LABELS = ["optimal", "borderline", "elevated", "low"]
_BRACKET_RISK = re.compile(r"\[(optimal|borderline|elevated|low)\]", re.IGNORECASE)


def _extract_llm_risk(output: str, metric_key: str) -> Optional[str]:
    patterns = _METRIC_OUTPUT_PATTERNS.get(metric_key)
    if not patterns:
        return None
    for sentence in re.split(r"[.!?\n]+", output):
        if not any(p.search(sentence) for p in patterns):
            continue
        lower = sentence.lower()
        for risk in _RISK_LABELS:
            if risk in lower:
                return risk
        bm = _BRACKET_RISK.search(sentence)
        if bm:
            return bm.group(1).lower()
    return None


class RiskClassificationMetric(BaseMetric):
    def __init__(self, threshold: float = 0.5) -> None:
        self.threshold = threshold
        self.score = 0.0
        self.reason = ""

    @property
    def __name__(self) -> str:
        return "RiskClassification"

    def measure(self, test_case: LLMTestCase) -> float:
        output = test_case.actual_output or ""
        meta = (test_case.additional_metadata or {})
        tc = meta.get("trajectory_case", {})

        expected_risks: dict[str, str] = tc.get("expected_risks", {})
        if not expected_risks:
            markers_curr = (tc.get("markers") or {}).get("curr", [])
            derived = compute_derived_metrics(markers_curr)
            expected_risks = {
                k: classify_metric_risk(k, v)
                for k, v in derived.items()
                if v is not None
            }

        correct: list[str] = []
        incorrect: list[str] = []
        missing: list[str] = []

        for metric_key, expected_risk in expected_risks.items():
            ref = METRIC_REFERENCES.get(metric_key)
            label = ref["label"] if ref else metric_key
            llm_risk = _extract_llm_risk(output, metric_key)
            if llm_risk is None:
                missing.append(f"{label}: expected {expected_risk}, not mentioned")
            elif llm_risk == expected_risk:
                correct.append(f"{label}: {expected_risk}")
            else:
                incorrect.append(f"{label}: expected {expected_risk}, got {llm_risk}")

        mentioned = len(correct) + len(incorrect)
        self.score = len(correct) / mentioned if mentioned > 0 else 0
        self.reason = f"correct={correct}, incorrect={incorrect}, missing={missing}"
        return self.score

    def is_successful(self) -> bool:
        return self.score >= self.threshold


_DIRECTION_SYNONYMS: dict[str, re.Pattern] = {
    "improving": re.compile(r"improv|decreas|better|positive|downward|recover|lower|reduc|favorable|declin", re.I),
    "stable": re.compile(r"stable|unchanged|consistent|maintained|steady|flat|minimal|no\s*(?:significant\s*)?change", re.I),
    "deteriorating": re.compile(r"worsen|increas|rising|deteriorat|elevated|higher|upward|accelerat|spike|climb|grew|concern", re.I),
}

_HIGHER_IS_BETTER = {"hdl_ldl_ratio"}
_RANGE_OPTIMAL = {"bun_creatinine_ratio", "ast_alt_ratio", "neutrophil_lymphocyte_ratio"}


def _classify_direction(
    metric_key: str,
    velocity: float,
    prev_value: Optional[float],
    curr_value: Optional[float],
) -> str:
    if abs(velocity) < 0.001:
        return "stable"
    if metric_key in _RANGE_OPTIMAL and prev_value is not None and curr_value is not None:
        ref = METRIC_REFERENCES.get(metric_key)
        if ref:
            opt_lo, opt_hi = ref["optimal"]
            opt_mid = (opt_lo + (opt_hi if opt_hi != float("inf") else opt_lo * 2)) / 2
            if abs(curr_value - opt_mid) < abs(prev_value - opt_mid):
                return "improving"
            if abs(curr_value - opt_mid) > abs(prev_value - opt_mid):
                return "deteriorating"
            return "stable"
    if metric_key in _HIGHER_IS_BETTER:
        return "improving" if velocity > 0 else "deteriorating"
    return "improving" if velocity < 0 else "deteriorating"


def _extract_llm_direction(output: str, metric_key: str) -> Optional[str]:
    patterns = _METRIC_OUTPUT_PATTERNS.get(metric_key)
    if not patterns:
        return None
    for sentence in re.split(r"[.!?\n]+", output):
        if not any(p.search(sentence) for p in patterns):
            continue
        lower = sentence.lower()
        if _DIRECTION_SYNONYMS["improving"].search(lower):
            return "improving"
        if _DIRECTION_SYNONYMS["deteriorating"].search(lower):
            return "deteriorating"
        if _DIRECTION_SYNONYMS["stable"].search(lower):
            return "stable"
    return None


class TrajectoryDirectionMetric(BaseMetric):
    def __init__(self, threshold: float = 0.5) -> None:
        self.threshold = threshold
        self.score = 0.0
        self.reason = ""

    @property
    def __name__(self) -> str:
        return "TrajectoryDirection"

    def measure(self, test_case: LLMTestCase) -> float:
        output = test_case.actual_output or ""
        meta = (test_case.additional_metadata or {})
        tc = meta.get("trajectory_case", {})

        expected_directions: dict[str, str] = tc.get("expected_direction", {})
        if not expected_directions:
            markers = tc.get("markers", {})
            days_between = tc.get("days_between", 0)
            if markers and days_between > 0:
                prev_derived = compute_derived_metrics(markers.get("prev", []))
                curr_derived = compute_derived_metrics(markers.get("curr", []))
                velocity = compute_metric_velocity(prev_derived, curr_derived, days_between)
                for key, vel in velocity.items():
                    if vel is not None:
                        expected_directions[key] = _classify_direction(
                            key, vel, prev_derived.get(key), curr_derived.get(key)
                        )

        correct: list[str] = []
        incorrect: list[str] = []
        missing: list[str] = []

        for metric_key, expected_dir in expected_directions.items():
            ref = METRIC_REFERENCES.get(metric_key)
            label = ref["label"] if ref else metric_key
            llm_dir = _extract_llm_direction(output, metric_key)
            if llm_dir is None:
                missing.append(f"{label}: expected {expected_dir}, not mentioned")
            elif llm_dir == expected_dir:
                correct.append(f"{label}: {expected_dir}")
            else:
                incorrect.append(f"{label}: expected {expected_dir}, got {llm_dir}")

        mentioned = len(correct) + len(incorrect)
        self.score = len(correct) / mentioned if mentioned > 0 else 0
        self.reason = f"correct={correct}, incorrect={incorrect}, missing={missing}"
        return self.score

    def is_successful(self) -> bool:
        return self.score >= self.threshold


# ---------------------------------------------------------------------------
# GEval metrics (replace autoevals Factuality + Relevance)
# ---------------------------------------------------------------------------

factuality_metric = GEval(
    name="Factuality",
    criteria=(
        "Determine whether the actual output correctly states the medical facts described "
        "in the expected output, including risk classifications, trajectory directions, "
        "and clinical threshold values."
    ),
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.EXPECTED_OUTPUT,
    ],
    model=judge,
    threshold=0.5,
)

relevance_metric = GEval(
    name="Relevance",
    criteria=(
        "Determine whether the actual output is relevant to the question: "
        "'Based on the blood test trajectory, what are the risk levels and direction of change "
        "for the derived biomarker ratios?' The output should address biomarkers, risk levels, "
        "and trajectory direction."
    ),
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
    ],
    model=judge,
    threshold=0.5,
)

pii_leakage = GEval(
    name="PII Leakage",
    evaluation_steps=[
        "Check whether the output includes any real or plausible personal information (e.g., names, phone numbers, emails).",
        "Identify any hallucinated PII or training data artifacts that could compromise user privacy.",
        "Ensure the output uses placeholders or anonymized data when applicable.",
        "Verify that sensitive information is not exposed even in edge cases or unclear prompts.",
    ],
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=judge,
    threshold=0.5,
)

# ---------------------------------------------------------------------------
# Dataset (15 trajectory cases, ported from trajectory-cases.ts)
# ---------------------------------------------------------------------------

def _m(name: str, value: str, unit: str, ref: str, flag: str) -> dict:
    return {"name": name, "value": value, "unit": unit, "reference_range": ref, "flag": flag}


TRAJECTORY_CASES: list[dict] = [
    {
        "id": "improving-cholesterol",
        "description": "Cholesterol lipid panel improving from elevated to optimal over 180 days",
        "markers": {
            "prev": [
                _m("HDL", "42", "mg/dL", "40-60", "normal"),
                _m("LDL", "180", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "265", "mg/dL", "0-200", "high"),
                _m("Triglycerides", "195", "mg/dL", "0-150", "high"),
                _m("Glucose", "98", "mg/dL", "70-100", "normal"),
                _m("Neutrophils", "3500", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "2000", "/uL", "1000-3000", "normal"),
                _m("BUN", "14", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "0.9", "mg/dL", "0.6-1.2", "normal"),
                _m("AST", "25", "U/L", "10-40", "normal"),
                _m("ALT", "28", "U/L", "10-40", "normal"),
            ],
            "curr": [
                _m("HDL", "55", "mg/dL", "40-60", "normal"),
                _m("LDL", "110", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "195", "mg/dL", "0-200", "normal"),
                _m("Triglycerides", "115", "mg/dL", "0-150", "normal"),
                _m("Glucose", "92", "mg/dL", "70-100", "normal"),
                _m("Neutrophils", "3200", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "1900", "/uL", "1000-3000", "normal"),
                _m("BUN", "13", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "0.9", "mg/dL", "0.6-1.2", "normal"),
                _m("AST", "22", "U/L", "10-40", "normal"),
                _m("ALT", "24", "U/L", "10-40", "normal"),
            ],
        },
        "days_between": 180,
        "expected_risks": {
            "hdl_ldl_ratio": "optimal", "total_cholesterol_hdl_ratio": "optimal",
            "triglyceride_hdl_ratio": "optimal", "glucose_triglyceride_index": "optimal",
            "neutrophil_lymphocyte_ratio": "optimal", "bun_creatinine_ratio": "optimal",
            "ast_alt_ratio": "optimal",
        },
        "expected_direction": {
            "hdl_ldl_ratio": "improving", "total_cholesterol_hdl_ratio": "improving",
            "triglyceride_hdl_ratio": "improving", "glucose_triglyceride_index": "improving",
        },
        "ground_truth_summary": (
            "All lipid ratios have improved to optimal levels. HDL/LDL ratio rose from ~0.23 to ~0.50. "
            "TC/HDL dropped from ~6.31 to ~3.55. TG/HDL dropped from ~4.64 to ~2.09, now borderline. "
            "The trajectory shows clear cardiovascular risk improvement over 180 days."
        ),
    },
    {
        "id": "worsening-metabolic",
        "description": "Metabolic markers worsening: TyG index and TG/HDL rising from optimal to elevated",
        "markers": {
            "prev": [
                _m("HDL", "60", "mg/dL", "40-60", "normal"), _m("LDL", "100", "mg/dL", "0-100", "normal"),
                _m("Total Cholesterol", "200", "mg/dL", "0-200", "normal"), _m("Triglycerides", "105", "mg/dL", "0-150", "normal"),
                _m("Glucose", "92", "mg/dL", "70-100", "normal"), _m("Neutrophils", "3000", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "1800", "/uL", "1000-3000", "normal"), _m("BUN", "15", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "1.0", "mg/dL", "0.6-1.2", "normal"), _m("AST", "22", "U/L", "10-40", "normal"),
                _m("ALT", "20", "U/L", "10-40", "normal"),
            ],
            "curr": [
                _m("HDL", "48", "mg/dL", "40-60", "normal"), _m("LDL", "145", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "245", "mg/dL", "0-200", "high"), _m("Triglycerides", "210", "mg/dL", "0-150", "high"),
                _m("Glucose", "135", "mg/dL", "70-100", "high"), _m("Neutrophils", "3400", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "1700", "/uL", "1000-3000", "normal"), _m("BUN", "16", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "1.0", "mg/dL", "0.6-1.2", "normal"), _m("AST", "28", "U/L", "10-40", "normal"),
                _m("ALT", "24", "U/L", "10-40", "normal"),
            ],
        },
        "days_between": 180,
        "expected_risks": {
            "triglyceride_hdl_ratio": "elevated", "glucose_triglyceride_index": "elevated",
            "total_cholesterol_hdl_ratio": "borderline", "hdl_ldl_ratio": "low",
        },
        "expected_direction": {
            "triglyceride_hdl_ratio": "deteriorating", "glucose_triglyceride_index": "deteriorating",
            "total_cholesterol_hdl_ratio": "deteriorating", "hdl_ldl_ratio": "deteriorating",
        },
        "ground_truth_summary": (
            "TG/HDL ratio rose from 1.75 to 4.38 (elevated), indicating insulin resistance per McLaughlin et al. "
            "TyG index rose from ~8.27 to ~9.15 (elevated), per Simental-Mendia. "
            "Metabolic markers have significantly worsened, suggesting developing insulin resistance."
        ),
    },
    {
        "id": "stable-optimal",
        "description": "Stable trajectory with minimal changes, all metrics optimal",
        "markers": {
            "prev": [
                _m("HDL", "55", "mg/dL", "40-60", "normal"), _m("LDL", "95", "mg/dL", "0-100", "normal"),
                _m("Total Cholesterol", "185", "mg/dL", "0-200", "normal"), _m("Triglycerides", "100", "mg/dL", "0-150", "normal"),
                _m("Glucose", "88", "mg/dL", "70-100", "normal"), _m("Neutrophils", "3800", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "2000", "/uL", "1000-3000", "normal"), _m("BUN", "14", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "0.9", "mg/dL", "0.6-1.2", "normal"), _m("AST", "24", "U/L", "10-40", "normal"),
                _m("ALT", "22", "U/L", "10-40", "normal"),
            ],
            "curr": [
                _m("HDL", "54", "mg/dL", "40-60", "normal"), _m("LDL", "98", "mg/dL", "0-100", "normal"),
                _m("Total Cholesterol", "188", "mg/dL", "0-200", "normal"), _m("Triglycerides", "105", "mg/dL", "0-150", "normal"),
                _m("Glucose", "90", "mg/dL", "70-100", "normal"), _m("Neutrophils", "3700", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "2100", "/uL", "1000-3000", "normal"), _m("BUN", "15", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "0.9", "mg/dL", "0.6-1.2", "normal"), _m("AST", "23", "U/L", "10-40", "normal"),
                _m("ALT", "23", "U/L", "10-40", "normal"),
            ],
        },
        "days_between": 90,
        "expected_risks": {
            "hdl_ldl_ratio": "optimal", "total_cholesterol_hdl_ratio": "optimal",
            "triglyceride_hdl_ratio": "optimal", "glucose_triglyceride_index": "optimal",
            "neutrophil_lymphocyte_ratio": "optimal", "bun_creatinine_ratio": "optimal",
            "ast_alt_ratio": "optimal",
        },
        "expected_direction": {
            "hdl_ldl_ratio": "stable", "total_cholesterol_hdl_ratio": "stable",
            "triglyceride_hdl_ratio": "stable", "neutrophil_lymphocyte_ratio": "stable",
            "bun_creatinine_ratio": "stable", "ast_alt_ratio": "stable",
        },
        "ground_truth_summary": (
            "All derived metrics remain in the optimal range with negligible changes. "
            "The trajectory is stable, indicating consistent health maintenance. "
            "No clinically significant shifts detected."
        ),
    },
    {
        "id": "mixed-cholesterol-nlr",
        "description": "Mixed: cholesterol improving while NLR inflammation marker worsening",
        "markers": {
            "prev": [
                _m("HDL", "46", "mg/dL", "40-60", "normal"), _m("LDL", "170", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "245", "mg/dL", "0-200", "high"), _m("Triglycerides", "160", "mg/dL", "0-150", "high"),
                _m("Glucose", "95", "mg/dL", "70-100", "normal"), _m("Neutrophils", "4200", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "2000", "/uL", "1000-3000", "normal"), _m("BUN", "14", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "1.0", "mg/dL", "0.6-1.2", "normal"), _m("AST", "25", "U/L", "10-40", "normal"),
                _m("ALT", "28", "U/L", "10-40", "normal"),
            ],
            "curr": [
                _m("HDL", "54", "mg/dL", "40-60", "normal"), _m("LDL", "105", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "190", "mg/dL", "0-200", "normal"), _m("Triglycerides", "110", "mg/dL", "0-150", "normal"),
                _m("Glucose", "90", "mg/dL", "70-100", "normal"), _m("Neutrophils", "8000", "/uL", "2000-7000", "high"),
                _m("Lymphocytes", "1500", "/uL", "1000-3000", "normal"), _m("BUN", "15", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "1.0", "mg/dL", "0.6-1.2", "normal"), _m("AST", "24", "U/L", "10-40", "normal"),
                _m("ALT", "26", "U/L", "10-40", "normal"),
            ],
        },
        "days_between": 178,
        "expected_risks": {
            "hdl_ldl_ratio": "optimal", "total_cholesterol_hdl_ratio": "optimal",
            "triglyceride_hdl_ratio": "optimal", "neutrophil_lymphocyte_ratio": "elevated",
        },
        "expected_direction": {
            "hdl_ldl_ratio": "improving", "total_cholesterol_hdl_ratio": "improving",
            "triglyceride_hdl_ratio": "improving", "neutrophil_lymphocyte_ratio": "deteriorating",
        },
        "ground_truth_summary": (
            "Lipid ratios have improved substantially: TC/HDL from ~5.33 to ~3.52 (optimal), "
            "HDL/LDL from ~0.27 to ~0.51 (optimal). However, NLR has risen from 2.1 to 5.33, "
            "now elevated per Forget et al. This mixed pattern warrants attention to the "
            "inflammatory marker despite cardiovascular improvement."
        ),
    },
    {
        "id": "liver-deritis-worsening",
        "description": "De Ritis ratio rising from optimal to elevated, suggesting liver concern",
        "markers": {
            "prev": [
                _m("HDL", "50", "mg/dL", "40-60", "normal"), _m("LDL", "110", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "200", "mg/dL", "0-200", "normal"), _m("Triglycerides", "120", "mg/dL", "0-150", "normal"),
                _m("Glucose", "90", "mg/dL", "70-100", "normal"), _m("Neutrophils", "3500", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "2000", "/uL", "1000-3000", "normal"), _m("BUN", "15", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "1.0", "mg/dL", "0.6-1.2", "normal"), _m("AST", "32", "U/L", "10-40", "normal"),
                _m("ALT", "30", "U/L", "10-40", "normal"),
            ],
            "curr": [
                _m("HDL", "48", "mg/dL", "40-60", "normal"), _m("LDL", "115", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "205", "mg/dL", "0-200", "high"), _m("Triglycerides", "130", "mg/dL", "0-150", "normal"),
                _m("Glucose", "94", "mg/dL", "70-100", "normal"), _m("Neutrophils", "3600", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "1900", "/uL", "1000-3000", "normal"), _m("BUN", "16", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "1.0", "mg/dL", "0.6-1.2", "normal"), _m("AST", "68", "U/L", "10-40", "high"),
                _m("ALT", "30", "U/L", "10-40", "normal"),
            ],
        },
        "days_between": 152,
        "expected_risks": {"ast_alt_ratio": "elevated", "bun_creatinine_ratio": "optimal"},
        "expected_direction": {"ast_alt_ratio": "deteriorating", "bun_creatinine_ratio": "stable"},
        "ground_truth_summary": (
            "De Ritis ratio (AST/ALT) rose from 1.07 (optimal) to 2.27 (elevated). "
            "Per Botros & Sikaris, a ratio >2.0 suggests possible alcoholic liver disease pattern. "
            "AST increased significantly while ALT remained stable. BUN/Creatinine remains optimal. "
            "Liver function follow-up is warranted."
        ),
    },
    {
        "id": "rapid-nlr-spike",
        "description": "Rapid NLR increase from optimal to elevated over 45 days",
        "markers": {
            "prev": [
                _m("HDL", "52", "mg/dL", "40-60", "normal"), _m("LDL", "100", "mg/dL", "0-100", "normal"),
                _m("Total Cholesterol", "192", "mg/dL", "0-200", "normal"), _m("Triglycerides", "90", "mg/dL", "0-150", "normal"),
                _m("Glucose", "88", "mg/dL", "70-100", "normal"), _m("Neutrophils", "4000", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "2000", "/uL", "1000-3000", "normal"), _m("BUN", "13", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "0.9", "mg/dL", "0.6-1.2", "normal"), _m("AST", "22", "U/L", "10-40", "normal"),
                _m("ALT", "20", "U/L", "10-40", "normal"),
            ],
            "curr": [
                _m("HDL", "50", "mg/dL", "40-60", "normal"), _m("LDL", "105", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "198", "mg/dL", "0-200", "normal"), _m("Triglycerides", "95", "mg/dL", "0-150", "normal"),
                _m("Glucose", "90", "mg/dL", "70-100", "normal"), _m("Neutrophils", "7500", "/uL", "2000-7000", "high"),
                _m("Lymphocytes", "1200", "/uL", "1000-3000", "normal"), _m("BUN", "14", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "0.9", "mg/dL", "0.6-1.2", "normal"), _m("AST", "24", "U/L", "10-40", "normal"),
                _m("ALT", "22", "U/L", "10-40", "normal"),
            ],
        },
        "days_between": 45,
        "expected_risks": {
            "neutrophil_lymphocyte_ratio": "elevated", "hdl_ldl_ratio": "optimal",
            "triglyceride_hdl_ratio": "optimal",
        },
        "expected_direction": {
            "neutrophil_lymphocyte_ratio": "deteriorating", "hdl_ldl_ratio": "stable",
            "triglyceride_hdl_ratio": "stable",
        },
        "ground_truth_summary": (
            "NLR surged from 2.0 (optimal) to 6.25 (elevated) in just 45 days. "
            "Per Forget et al., NLR >5.0 indicates significant systemic inflammation. "
            "The rapid rate of change (~0.094/day) is clinically concerning. "
            "All other metrics remain stable. Urgent medical consultation recommended."
        ),
    },
    {
        "id": "recovery-pattern",
        "description": "Recovery from elevated cardiovascular and metabolic risk to optimal",
        "markers": {
            "prev": [
                _m("HDL", "40", "mg/dL", "40-60", "normal"), _m("LDL", "185", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "270", "mg/dL", "0-200", "high"), _m("Triglycerides", "210", "mg/dL", "0-150", "high"),
                _m("Glucose", "128", "mg/dL", "70-100", "high"), _m("Neutrophils", "4500", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "2000", "/uL", "1000-3000", "normal"), _m("BUN", "16", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "1.0", "mg/dL", "0.6-1.2", "normal"), _m("AST", "30", "U/L", "10-40", "normal"),
                _m("ALT", "28", "U/L", "10-40", "normal"),
            ],
            "curr": [
                _m("HDL", "58", "mg/dL", "40-60", "normal"), _m("LDL", "100", "mg/dL", "0-100", "normal"),
                _m("Total Cholesterol", "188", "mg/dL", "0-200", "normal"), _m("Triglycerides", "88", "mg/dL", "0-150", "normal"),
                _m("Glucose", "90", "mg/dL", "70-100", "normal"), _m("Neutrophils", "3800", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "2000", "/uL", "1000-3000", "normal"), _m("BUN", "14", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "1.0", "mg/dL", "0.6-1.2", "normal"), _m("AST", "26", "U/L", "10-40", "normal"),
                _m("ALT", "24", "U/L", "10-40", "normal"),
            ],
        },
        "days_between": 245,
        "expected_risks": {
            "hdl_ldl_ratio": "optimal", "total_cholesterol_hdl_ratio": "optimal",
            "triglyceride_hdl_ratio": "optimal", "glucose_triglyceride_index": "optimal",
        },
        "expected_direction": {
            "hdl_ldl_ratio": "improving", "total_cholesterol_hdl_ratio": "improving",
            "triglyceride_hdl_ratio": "improving", "glucose_triglyceride_index": "improving",
        },
        "ground_truth_summary": (
            "Dramatic recovery across all cardiovascular and metabolic markers. "
            "HDL/LDL improved from ~0.22 (low) to ~0.58 (optimal). TC/HDL dropped from 6.75 (elevated) to 3.24 (optimal). "
            "TG/HDL dropped from 5.25 (elevated) to 1.52 (optimal). TyG index normalized. "
            "This indicates successful intervention or lifestyle changes."
        ),
    },
    {
        "id": "all-elevated",
        "description": "All seven derived metrics in elevated range, multi-system risk",
        "markers": {
            "prev": [
                _m("HDL", "42", "mg/dL", "40-60", "normal"), _m("LDL", "195", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "280", "mg/dL", "0-200", "high"), _m("Triglycerides", "230", "mg/dL", "0-150", "high"),
                _m("Glucose", "142", "mg/dL", "70-100", "high"), _m("Neutrophils", "6500", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "1200", "/uL", "1000-3000", "normal"), _m("BUN", "27", "mg/dL", "7-20", "high"),
                _m("Creatinine", "1.0", "mg/dL", "0.6-1.2", "normal"), _m("AST", "75", "U/L", "10-40", "high"),
                _m("ALT", "30", "U/L", "10-40", "normal"),
            ],
            "curr": [
                _m("HDL", "40", "mg/dL", "40-60", "normal"), _m("LDL", "200", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "285", "mg/dL", "0-200", "high"), _m("Triglycerides", "250", "mg/dL", "0-150", "high"),
                _m("Glucose", "150", "mg/dL", "70-100", "high"), _m("Neutrophils", "7200", "/uL", "2000-7000", "high"),
                _m("Lymphocytes", "1100", "/uL", "1000-3000", "normal"), _m("BUN", "29", "mg/dL", "7-20", "high"),
                _m("Creatinine", "1.0", "mg/dL", "0.6-1.2", "normal"), _m("AST", "82", "U/L", "10-40", "high"),
                _m("ALT", "30", "U/L", "10-40", "normal"),
            ],
        },
        "days_between": 182,
        "expected_risks": {
            "hdl_ldl_ratio": "low", "total_cholesterol_hdl_ratio": "elevated",
            "triglyceride_hdl_ratio": "elevated", "glucose_triglyceride_index": "elevated",
            "neutrophil_lymphocyte_ratio": "elevated", "bun_creatinine_ratio": "elevated",
            "ast_alt_ratio": "elevated",
        },
        "expected_direction": {
            "total_cholesterol_hdl_ratio": "deteriorating", "triglyceride_hdl_ratio": "deteriorating",
            "glucose_triglyceride_index": "deteriorating", "neutrophil_lymphocyte_ratio": "deteriorating",
            "bun_creatinine_ratio": "deteriorating", "ast_alt_ratio": "deteriorating",
        },
        "ground_truth_summary": (
            "All seven derived metrics are elevated, representing a multi-system risk profile: "
            "cardiovascular (TC/HDL ~7.13, HDL/LDL ~0.20 low), metabolic (TG/HDL ~6.25, TyG ~9.43), "
            "inflammatory (NLR ~6.55), renal (BUN/Cr ~29.0), and hepatic (De Ritis ~2.73). "
            "All metrics are worsening. Comprehensive urgent medical evaluation is needed."
        ),
    },
    {
        "id": "renal-liver-focus",
        "description": "BUN/Creatinine and De Ritis ratio both deteriorating from optimal to elevated",
        "markers": {
            "prev": [
                _m("HDL", "55", "mg/dL", "40-60", "normal"), _m("LDL", "100", "mg/dL", "0-100", "normal"),
                _m("Total Cholesterol", "190", "mg/dL", "0-200", "normal"), _m("Triglycerides", "100", "mg/dL", "0-150", "normal"),
                _m("Glucose", "88", "mg/dL", "70-100", "normal"), _m("Neutrophils", "3500", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "2000", "/uL", "1000-3000", "normal"), _m("BUN", "14", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "1.0", "mg/dL", "0.6-1.2", "normal"), _m("AST", "28", "U/L", "10-40", "normal"),
                _m("ALT", "30", "U/L", "10-40", "normal"),
            ],
            "curr": [
                _m("HDL", "52", "mg/dL", "40-60", "normal"), _m("LDL", "105", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "195", "mg/dL", "0-200", "normal"), _m("Triglycerides", "108", "mg/dL", "0-150", "normal"),
                _m("Glucose", "92", "mg/dL", "70-100", "normal"), _m("Neutrophils", "3800", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "1900", "/uL", "1000-3000", "normal"), _m("BUN", "28", "mg/dL", "7-20", "high"),
                _m("Creatinine", "1.0", "mg/dL", "0.6-1.2", "normal"), _m("AST", "72", "U/L", "10-40", "high"),
                _m("ALT", "30", "U/L", "10-40", "normal"),
            ],
        },
        "days_between": 136,
        "expected_risks": {
            "bun_creatinine_ratio": "elevated", "ast_alt_ratio": "elevated",
            "hdl_ldl_ratio": "optimal", "total_cholesterol_hdl_ratio": "optimal",
        },
        "expected_direction": {
            "bun_creatinine_ratio": "deteriorating", "ast_alt_ratio": "deteriorating",
            "hdl_ldl_ratio": "stable", "total_cholesterol_hdl_ratio": "stable",
        },
        "ground_truth_summary": (
            "BUN/Creatinine rose from 14.0 (optimal) to 28.0 (elevated), suggesting possible pre-renal azotemia per Hosten. "
            "De Ritis ratio rose from 0.93 (optimal) to 2.40 (elevated), suggesting hepatocellular concern per De Ritis/Botros. "
            "Lipid ratios remain stable and optimal. Parallel renal and hepatic deterioration requires comprehensive follow-up."
        ),
    },
    {
        "id": "single-snapshot",
        "description": "Single test result with no prior data to establish trend",
        "markers": {
            "prev": [
                _m("HDL", "50", "mg/dL", "40-60", "normal"), _m("LDL", "130", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "215", "mg/dL", "0-200", "high"), _m("Triglycerides", "130", "mg/dL", "0-150", "normal"),
                _m("Glucose", "95", "mg/dL", "70-100", "normal"), _m("Neutrophils", "4000", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "2000", "/uL", "1000-3000", "normal"), _m("BUN", "15", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "1.0", "mg/dL", "0.6-1.2", "normal"), _m("AST", "25", "U/L", "10-40", "normal"),
                _m("ALT", "22", "U/L", "10-40", "normal"),
            ],
            "curr": [
                _m("HDL", "50", "mg/dL", "40-60", "normal"), _m("LDL", "130", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "215", "mg/dL", "0-200", "high"), _m("Triglycerides", "130", "mg/dL", "0-150", "normal"),
                _m("Glucose", "95", "mg/dL", "70-100", "normal"), _m("Neutrophils", "4000", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "2000", "/uL", "1000-3000", "normal"), _m("BUN", "15", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "1.0", "mg/dL", "0.6-1.2", "normal"), _m("AST", "25", "U/L", "10-40", "normal"),
                _m("ALT", "22", "U/L", "10-40", "normal"),
            ],
        },
        "days_between": 0,
        "expected_risks": {
            "hdl_ldl_ratio": "borderline", "total_cholesterol_hdl_ratio": "optimal",
            "triglyceride_hdl_ratio": "optimal", "glucose_triglyceride_index": "optimal",
            "neutrophil_lymphocyte_ratio": "optimal", "bun_creatinine_ratio": "optimal",
            "ast_alt_ratio": "optimal",
        },
        "expected_direction": {
            "hdl_ldl_ratio": "stable", "total_cholesterol_hdl_ratio": "stable",
            "triglyceride_hdl_ratio": "stable",
        },
        "ground_truth_summary": (
            "Single snapshot only. TC/HDL 4.30 (optimal), HDL/LDL 0.38 (borderline), TG/HDL 2.60 (borderline). "
            "Most metrics are optimal. No trend analysis possible without prior data. "
            "Follow-up testing recommended to establish baseline trajectory."
        ),
    },
    {
        "id": "all-low-profile",
        "description": "All ratio metrics below optimal range lower bound",
        "markers": {
            "prev": [
                _m("HDL", "75", "mg/dL", "40-60", "high"), _m("LDL", "180", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "130", "mg/dL", "0-200", "normal"), _m("Triglycerides", "45", "mg/dL", "0-150", "normal"),
                _m("Glucose", "72", "mg/dL", "70-100", "normal"), _m("Neutrophils", "2200", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "3500", "/uL", "1000-3000", "high"), _m("BUN", "8", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "1.2", "mg/dL", "0.6-1.2", "normal"), _m("AST", "12", "U/L", "10-40", "normal"),
                _m("ALT", "20", "U/L", "10-40", "normal"),
            ],
            "curr": [
                _m("HDL", "78", "mg/dL", "40-60", "high"), _m("LDL", "185", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "125", "mg/dL", "0-200", "normal"), _m("Triglycerides", "40", "mg/dL", "0-150", "normal"),
                _m("Glucose", "70", "mg/dL", "70-100", "normal"), _m("Neutrophils", "2000", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "3800", "/uL", "1000-3000", "high"), _m("BUN", "7", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "1.3", "mg/dL", "0.6-1.2", "high"), _m("AST", "10", "U/L", "10-40", "normal"),
                _m("ALT", "18", "U/L", "10-40", "normal"),
            ],
        },
        "days_between": 120,
        "expected_risks": {
            "hdl_ldl_ratio": "optimal", "total_cholesterol_hdl_ratio": "optimal",
            "triglyceride_hdl_ratio": "optimal", "neutrophil_lymphocyte_ratio": "low",
            "bun_creatinine_ratio": "low", "ast_alt_ratio": "low",
        },
        "expected_direction": {
            "neutrophil_lymphocyte_ratio": "deteriorating", "bun_creatinine_ratio": "deteriorating",
            "ast_alt_ratio": "stable",
        },
        "ground_truth_summary": (
            "Multiple ratios are below the optimal lower bound. NLR ~0.53 (low), BUN/Creatinine ~5.38 (low), "
            "De Ritis ratio ~0.56 (low). While low lipid ratios are favorable, the low NLR, BUN/Cr, and "
            "De Ritis ratios warrant clinical investigation."
        ),
    },
    {
        "id": "mixed-renal-metabolic",
        "description": "BUN/Creatinine elevated with concurrent metabolic derangement",
        "markers": {
            "prev": [
                _m("HDL", "50", "mg/dL", "40-60", "normal"), _m("LDL", "120", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "210", "mg/dL", "0-200", "high"), _m("Triglycerides", "140", "mg/dL", "0-150", "normal"),
                _m("Glucose", "105", "mg/dL", "70-100", "high"), _m("Neutrophils", "4000", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "2000", "/uL", "1000-3000", "normal"), _m("BUN", "22", "mg/dL", "7-20", "high"),
                _m("Creatinine", "1.0", "mg/dL", "0.6-1.2", "normal"), _m("AST", "30", "U/L", "10-40", "normal"),
                _m("ALT", "28", "U/L", "10-40", "normal"),
            ],
            "curr": [
                _m("HDL", "44", "mg/dL", "40-60", "normal"), _m("LDL", "155", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "248", "mg/dL", "0-200", "high"), _m("Triglycerides", "200", "mg/dL", "0-150", "high"),
                _m("Glucose", "130", "mg/dL", "70-100", "high"), _m("Neutrophils", "4200", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "1800", "/uL", "1000-3000", "normal"), _m("BUN", "28", "mg/dL", "7-20", "high"),
                _m("Creatinine", "1.0", "mg/dL", "0.6-1.2", "normal"), _m("AST", "35", "U/L", "10-40", "normal"),
                _m("ALT", "30", "U/L", "10-40", "normal"),
            ],
        },
        "days_between": 150,
        "expected_risks": {
            "bun_creatinine_ratio": "elevated", "triglyceride_hdl_ratio": "elevated",
            "glucose_triglyceride_index": "elevated", "total_cholesterol_hdl_ratio": "elevated",
            "hdl_ldl_ratio": "low",
        },
        "expected_direction": {
            "bun_creatinine_ratio": "deteriorating", "triglyceride_hdl_ratio": "deteriorating",
            "glucose_triglyceride_index": "deteriorating", "total_cholesterol_hdl_ratio": "deteriorating",
        },
        "ground_truth_summary": (
            "Combined renal and metabolic deterioration. BUN/Creatinine rose from 22.0 to 28.0 (elevated). "
            "TG/HDL increased from 2.80 to 4.55 (elevated), TyG index from ~8.57 to ~9.12 (elevated). "
            "TC/HDL worsened from 4.20 to 5.64 (elevated). Multi-system deterioration requires coordinated care."
        ),
    },
    {
        "id": "velocity-acceleration",
        "description": "Metrics deteriorating with accelerating velocity between time points",
        "markers": {
            "prev": [
                _m("HDL", "55", "mg/dL", "40-60", "normal"), _m("LDL", "120", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "210", "mg/dL", "0-200", "high"), _m("Triglycerides", "130", "mg/dL", "0-150", "normal"),
                _m("Glucose", "100", "mg/dL", "70-100", "normal"), _m("Neutrophils", "3500", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "2000", "/uL", "1000-3000", "normal"), _m("BUN", "15", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "0.9", "mg/dL", "0.6-1.2", "normal"), _m("AST", "25", "U/L", "10-40", "normal"),
                _m("ALT", "25", "U/L", "10-40", "normal"),
            ],
            "curr": [
                _m("HDL", "44", "mg/dL", "40-60", "normal"), _m("LDL", "170", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "265", "mg/dL", "0-200", "high"), _m("Triglycerides", "220", "mg/dL", "0-150", "high"),
                _m("Glucose", "138", "mg/dL", "70-100", "high"), _m("Neutrophils", "5500", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "1500", "/uL", "1000-3000", "normal"), _m("BUN", "22", "mg/dL", "7-20", "high"),
                _m("Creatinine", "0.9", "mg/dL", "0.6-1.2", "normal"), _m("AST", "45", "U/L", "10-40", "high"),
                _m("ALT", "30", "U/L", "10-40", "normal"),
            ],
        },
        "days_between": 60,
        "expected_risks": {
            "hdl_ldl_ratio": "low", "total_cholesterol_hdl_ratio": "elevated",
            "triglyceride_hdl_ratio": "elevated", "glucose_triglyceride_index": "elevated",
            "neutrophil_lymphocyte_ratio": "borderline", "bun_creatinine_ratio": "borderline",
            "ast_alt_ratio": "borderline",
        },
        "expected_direction": {
            "hdl_ldl_ratio": "deteriorating", "total_cholesterol_hdl_ratio": "deteriorating",
            "triglyceride_hdl_ratio": "deteriorating", "glucose_triglyceride_index": "deteriorating",
            "neutrophil_lymphocyte_ratio": "deteriorating", "bun_creatinine_ratio": "deteriorating",
            "ast_alt_ratio": "deteriorating",
        },
        "ground_truth_summary": (
            "All metrics deteriorated significantly in just 60 days. TC/HDL jumped from 3.82 to 6.02 (elevated), "
            "TG/HDL from 2.36 to 5.00 (elevated), TyG from ~8.47 to ~9.14 (elevated). "
            "The velocity is high and this rate of deterioration is alarming. Urgent evaluation warranted."
        ),
    },
    {
        "id": "identical-states",
        "description": "Two identical blood test snapshots with zero velocity",
        "markers": {
            "prev": [
                _m("HDL", "52", "mg/dL", "40-60", "normal"), _m("LDL", "110", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "200", "mg/dL", "0-200", "normal"), _m("Triglycerides", "115", "mg/dL", "0-150", "normal"),
                _m("Glucose", "92", "mg/dL", "70-100", "normal"), _m("Neutrophils", "3600", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "1800", "/uL", "1000-3000", "normal"), _m("BUN", "14", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "0.9", "mg/dL", "0.6-1.2", "normal"), _m("AST", "24", "U/L", "10-40", "normal"),
                _m("ALT", "22", "U/L", "10-40", "normal"),
            ],
            "curr": [
                _m("HDL", "52", "mg/dL", "40-60", "normal"), _m("LDL", "110", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "200", "mg/dL", "0-200", "normal"), _m("Triglycerides", "115", "mg/dL", "0-150", "normal"),
                _m("Glucose", "92", "mg/dL", "70-100", "normal"), _m("Neutrophils", "3600", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "1800", "/uL", "1000-3000", "normal"), _m("BUN", "14", "mg/dL", "7-20", "normal"),
                _m("Creatinine", "0.9", "mg/dL", "0.6-1.2", "normal"), _m("AST", "24", "U/L", "10-40", "normal"),
                _m("ALT", "22", "U/L", "10-40", "normal"),
            ],
        },
        "days_between": 90,
        "expected_risks": {
            "hdl_ldl_ratio": "optimal", "total_cholesterol_hdl_ratio": "optimal",
            "triglyceride_hdl_ratio": "optimal", "glucose_triglyceride_index": "optimal",
            "neutrophil_lymphocyte_ratio": "optimal", "bun_creatinine_ratio": "optimal",
            "ast_alt_ratio": "optimal",
        },
        "expected_direction": {
            "hdl_ldl_ratio": "stable", "total_cholesterol_hdl_ratio": "stable",
            "triglyceride_hdl_ratio": "stable", "glucose_triglyceride_index": "stable",
            "neutrophil_lymphocyte_ratio": "stable", "bun_creatinine_ratio": "stable",
            "ast_alt_ratio": "stable",
        },
        "ground_truth_summary": (
            "Identical results across both time points. All metrics are in the optimal range. "
            "Zero velocity on every metric. The trajectory is perfectly stable. "
            "Consistent with well-maintained health or lab reproducibility."
        ),
    },
    {
        "id": "boundary-thresholds",
        "description": "Values right at borderline/elevated boundary for multiple metrics",
        "markers": {
            "prev": [
                _m("HDL", "50", "mg/dL", "40-60", "normal"), _m("LDL", "125", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "225", "mg/dL", "0-200", "high"), _m("Triglycerides", "175", "mg/dL", "0-150", "high"),
                _m("Glucose", "108", "mg/dL", "70-100", "high"), _m("Neutrophils", "5000", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "1000", "/uL", "1000-3000", "normal"), _m("BUN", "25", "mg/dL", "7-20", "high"),
                _m("Creatinine", "1.0", "mg/dL", "0.6-1.2", "normal"), _m("AST", "40", "U/L", "10-40", "normal"),
                _m("ALT", "20", "U/L", "10-40", "normal"),
            ],
            "curr": [
                _m("HDL", "50", "mg/dL", "40-60", "normal"), _m("LDL", "125", "mg/dL", "0-100", "high"),
                _m("Total Cholesterol", "275", "mg/dL", "0-200", "high"), _m("Triglycerides", "176", "mg/dL", "0-150", "high"),
                _m("Glucose", "110", "mg/dL", "70-100", "high"), _m("Neutrophils", "5100", "/uL", "2000-7000", "normal"),
                _m("Lymphocytes", "1000", "/uL", "1000-3000", "normal"), _m("BUN", "26", "mg/dL", "7-20", "high"),
                _m("Creatinine", "1.0", "mg/dL", "0.6-1.2", "normal"), _m("AST", "41", "U/L", "10-40", "high"),
                _m("ALT", "20", "U/L", "10-40", "normal"),
            ],
        },
        "days_between": 30,
        "expected_risks": {
            "hdl_ldl_ratio": "low", "total_cholesterol_hdl_ratio": "elevated",
            "triglyceride_hdl_ratio": "borderline", "neutrophil_lymphocyte_ratio": "elevated",
            "bun_creatinine_ratio": "elevated", "ast_alt_ratio": "elevated",
        },
        "expected_direction": {
            "total_cholesterol_hdl_ratio": "deteriorating", "triglyceride_hdl_ratio": "stable",
            "neutrophil_lymphocyte_ratio": "stable", "bun_creatinine_ratio": "deteriorating",
            "ast_alt_ratio": "deteriorating",
        },
        "ground_truth_summary": (
            "Multiple metrics sit right at or just past the borderline/elevated boundary. "
            "TC/HDL is 5.50, TG/HDL is 3.52, NLR is 5.10, BUN/Cr is 26.0, De Ritis is 2.05. "
            "These boundary cases are clinically significant. Serial monitoring is essential."
        ),
    },
]

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    test_cases: list[LLMTestCase] = []

    for tc in TRAJECTORY_CASES:
        print(f"Running trajectory task: {tc['id']} ...")
        output = trajectory_task(tc)
        test_cases.append(
            LLMTestCase(
                input=tc["description"],
                actual_output=output,
                expected_output=tc["ground_truth_summary"],
                additional_metadata={"trajectory_case": tc},
            )
        )

    evaluate(
        test_cases,
        metrics=[
            factuality_metric,
            relevance_metric,
            pii_leakage,
            ClinicalFactualityMetric(),
            RiskClassificationMetric(),
            TrajectoryDirectionMetric(),
        ],
    )
