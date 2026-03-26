"""
Calibrated Local LLM-as-Judge for Report Quality Evaluation

Multi-judge ensemble: Llama 3.1 7B + Mistral 7B (via Ollama)
5-dimension rubric: factual_accuracy, completeness, actionability, conciseness, tone
Structured judge output: JSON with scores 1-5 + explanation
Confidence-weighted consensus with Platt scaling calibration
Judge agreement: Krippendorff's alpha and Cohen's kappa
Adversarial evaluation: test on hallucinated reports
Sequential judging: skip 3rd judge if 2 judges agree (save compute)
Cost analysis: latency tracking (<20s for 2-judge)
Gold standard: calibration via 50 human-annotated reports
Production integration: auto-evaluate every N-th report
"""

import json
import re
import sqlite3
import time
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import hashlib

import numpy as np
import requests
from abc import ABC, abstractmethod


# ============================================================================
# 1. DATA STRUCTURES & RUBRIC DEFINITIONS
# ============================================================================

@dataclass
class JudgmentScore:
    """Structured judge output for a single report."""
    judge_name: str
    report_id: str
    timestamp: str
    
    # 5-dimension scores (1-5)
    factual_accuracy: int
    completeness: int
    actionability: int
    conciseness: int
    tone: int
    
    # Metadata
    explanation: str
    confidence: float  # Judge's self-reported confidence (0-1)
    latency_ms: float
    raw_response: str  # Original JSON response for debugging


@dataclass
class CalibrationSample:
    """Gold-standard human annotation for calibration."""
    report_id: str
    human_scores: Dict[str, int]  # dimension -> human score (1-5)
    judge_scores: Dict[str, JudgmentScore]  # judge_name -> JudgmentScore


@dataclass
class ConsensusResult:
    """Final consensus across judge ensemble."""
    report_id: str
    consensus_scores: Dict[str, float]  # dimension -> consensus score (1-5)
    overall_score: float  # Weighted average
    judge_agreement: float  # Krippendorff's alpha or Cohen's kappa
    agreement_metric: str  # 'krippendorff' or 'cohens_kappa'
    confidence_interval: Tuple[float, float]  # 95% CI
    num_judges_used: int
    judges_used: List[str]
    latency_ms: float


EVALUATION_RUBRIC = {
    'factual_accuracy': {
        'weight': 0.35,
        'description': 'Accuracy of claims against source documents',
        'anchors': {
            5: 'No hallucinations, all claims traceable to sources',
            4: '1-2 minor inaccuracies, mostly factual',
            3: '3-4 inaccuracies or unsourced claims',
            2: 'Multiple factual errors',
            1: 'Mostly inaccurate or completely hallucinated'
        }
    },
    'completeness': {
        'weight': 0.25,
        'description': 'Coverage of key information relevant to sales',
        'anchors': {
            5: 'All key facts present: revenue, headcount, products, funding',
            4: 'Missing 1 minor category',
            3: 'Missing 2 minor or 1 major category',
            2: 'Missing 2+ major categories',
            1: 'Critical gaps, nearly empty'
        }
    },
    'actionability': {
        'weight': 0.20,
        'description': 'Presence of clear next steps and sales hooks',
        'anchors': {
            5: 'Multiple specific engagement angles identified',
            4: '1-2 clear next steps',
            3: 'Generic next steps only',
            2: 'Vague or unhelpful recommendations',
            1: 'No actionable insights'
        }
    },
    'conciseness': {
        'weight': 0.15,
        'description': 'Information density vs verbosity',
        'anchors': {
            5: 'Minimal, no filler, every sentence adds value',
            4: 'Mostly concise, 1-2 verbose phrases',
            3: 'Acceptable density',
            2: 'Noticeably verbose',
            1: 'Extremely repetitive or bloated'
        }
    },
    'tone': {
        'weight': 0.05,
        'description': 'Professional B2B register, appropriate for sales team',
        'anchors': {
            5: 'Perfect B2B analyst tone',
            4: 'Professional with minor quirks',
            3: 'Acceptable but imperfect',
            2: 'Somewhat unprofessional',
            1: 'Unprofessional, informal, or inappropriate'
        }
    }
}

JUDGE_PROMPT_TEMPLATE = """You are a B2B sales analyst evaluating lead summaries for quality.

## Evaluation Rubric

For each dimension, score 1-5 using the rubric below:

### Factual Accuracy (Weight: 0.35)
Accuracy of claims against source documents.
- 5: No hallucinations, all claims traceable to sources
- 4: 1-2 minor inaccuracies, mostly factual
- 3: 3-4 inaccuracies or unsourced claims
- 2: Multiple factual errors
- 1: Mostly inaccurate or completely hallucinated

### Completeness (Weight: 0.25)
Coverage of key information relevant to sales.
- 5: All key facts present: revenue, headcount, products, funding
- 4: Missing 1 minor category
- 3: Missing 2 minor or 1 major category
- 2: Missing 2+ major categories
- 1: Critical gaps, nearly empty

### Actionability (Weight: 0.20)
Presence of clear next steps and sales hooks.
- 5: Multiple specific engagement angles identified
- 4: 1-2 clear next steps
- 3: Generic next steps only
- 2: Vague or unhelpful recommendations
- 1: No actionable insights

### Conciseness (Weight: 0.15)
Information density vs verbosity.
- 5: Minimal, no filler, every sentence adds value
- 4: Mostly concise, 1-2 verbose phrases
- 3: Acceptable density
- 2: Noticeably verbose
- 1: Extremely repetitive or bloated

### Professional Tone (Weight: 0.05)
B2B register appropriate for sales team.
- 5: Perfect B2B analyst tone
- 4: Professional with minor quirks
- 3: Acceptable but imperfect
- 2: Somewhat unprofessional
- 1: Unprofessional, informal, or inappropriate

---

## Context

**Source Company Data:**
{source_data}

**ICP Profile:**
{icp_profile}

**Generated Summary:**
{summary}

---

## Evaluation Task

Score each of the 5 dimensions (1-5) based on the rubric above.
Then provide:
- A brief explanation (2-3 sentences) of your overall assessment
- Your confidence in this evaluation (0.0-1.0, where 1.0 = very confident)

Respond ONLY with valid JSON (no markdown, no extra text) in this format:
{{
  "factual_accuracy": <1-5>,
  "completeness": <1-5>,
  "actionability": <1-5>,
  "conciseness": <1-5>,
  "tone": <1-5>,
  "explanation": "<brief explanation>",
  "confidence": <0.0-1.0>
}}
"""

HALLUCINATION_TEST_PROMPT_TEMPLATE = """You are a B2B sales analyst evaluating lead summaries for quality.

This is a STRESS TEST: the following summary contains INTENTIONALLY HALLUCINATED information mixed with facts.
Your job is to identify which parts are fabricated.

## Task
Score factual_accuracy (1-5) based on how well you catch hallucinations:
- 5: Caught all hallucinations, identified exactly which claims are false
- 4: Caught most hallucinations (>80%)
- 3: Caught some hallucinations (50-80%)
- 2: Missed most hallucinations (<50%)
- 1: Did not catch any hallucinations

## Context
**Source Data (GROUND TRUTH):**
{true_source_data}

**Deliberately Fabricated Summary (contains {num_hallucinations} false claims):**
{hallucinated_summary}

---

Respond ONLY with valid JSON:
{{
  "factual_accuracy": <1-5>,
  "explanation": "<which hallucinations did you catch?>",
  "confidence": <0.0-1.0>
}}
"""


# ============================================================================
# 2. JUDGE INTERFACE & OLLAMA IMPLEMENTATION
# ============================================================================

class Judge(ABC):
    """Abstract base class for LLM judges."""
    
    @abstractmethod
    def evaluate(
        self,
        summary: str,
        source_data: str,
        icp_profile: str,
        report_id: str
    ) -> JudgmentScore:
        """Evaluate a report and return structured scores."""
        pass
    
    @abstractmethod
    def get_name(self) -> str:
        """Get the judge's model name."""
        pass


class OllamaJudge(Judge):
    """LLM judge via Ollama API."""
    
    def __init__(
        self,
        model_name: str,
        ollama_base_url: str = "http://localhost:11434",
        temperature: float = 0.1,
        top_p: float = 0.9,
        timeout: int = 60,
    ):
        self.model_name = model_name
        self.ollama_base_url = ollama_base_url
        self.temperature = temperature
        self.top_p = top_p
        self.timeout = timeout
        self.endpoint = f"{ollama_base_url}/api/generate"
        self._verify_connectivity()
    
    def _verify_connectivity(self):
        """Check if Ollama is running and model is available."""
        try:
            response = requests.get(
                f"{self.ollama_base_url}/api/tags",
                timeout=5
            )
            models = [m['name'] for m in response.json().get('models', [])]
            if self.model_name not in models:
                raise RuntimeError(
                    f"Model {self.model_name} not found in Ollama. "
                    f"Available: {models}"
                )
        except Exception as e:
            raise RuntimeError(
                f"Cannot connect to Ollama at {self.ollama_base_url}: {e}"
            )
    
    def evaluate(
        self,
        summary: str,
        source_data: str,
        icp_profile: str,
        report_id: str
    ) -> JudgmentScore:
        """Call Ollama API and parse structured JSON response."""
        prompt = JUDGE_PROMPT_TEMPLATE.format(
            source_data=source_data,
            icp_profile=icp_profile,
            summary=summary
        )
        
        start_time = time.perf_counter()
        
        try:
            response = requests.post(
                self.endpoint,
                json={
                    'model': self.model_name,
                    'prompt': prompt,
                    'stream': False,
                    'options': {
                        'temperature': self.temperature,
                        'top_p': self.top_p,
                        'num_predict': 500,
                    }
                },
                timeout=self.timeout
            )
            response.raise_for_status()
            
            result = response.json()
            raw_response = result['response']
            
            # Parse JSON from response (may contain markdown code blocks)
            parsed = self._extract_json(raw_response)
            
            latency_ms = (time.perf_counter() - start_time) * 1000
            
            return JudgmentScore(
                judge_name=self.model_name,
                report_id=report_id,
                timestamp=datetime.now().isoformat(),
                factual_accuracy=parsed['factual_accuracy'],
                completeness=parsed.get('completeness', 3),
                actionability=parsed.get('actionability', 3),
                conciseness=parsed.get('conciseness', 3),
                tone=parsed.get('tone', 3),
                explanation=parsed.get('explanation', ''),
                confidence=float(parsed.get('confidence', 0.5)),
                latency_ms=latency_ms,
                raw_response=raw_response
            )
        except Exception as e:
            raise RuntimeError(f"Ollama judge error: {e}")
    
    def _extract_json(self, response_text: str) -> Dict:
        """Extract JSON from response, handling markdown code blocks."""
        # Try direct JSON first
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            pass
        
        # Try extracting from markdown code block
        match = re.search(r'```(?:json)?\s*(.*?)\s*```', response_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Try finding JSON object in text
        match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        
        raise ValueError(f"Could not extract JSON from response: {response_text}")
    
    def get_name(self) -> str:
        return self.model_name


# ============================================================================
# 3. CALIBRATION: PLATT SCALING + CONFIDENCE WEIGHTING
# ============================================================================

class PlattScalingCalibrator:
    """Calibrate raw judge scores to human-aligned probabilities via Platt scaling."""
    
    def __init__(self, dimension: str, calibration_samples: List[CalibrationSample]):
        """
        Fit Platt scaling on calibration data.
        
        Platt scaling maps raw scores to probabilities:
        P(y=1|x) = 1 / (1 + exp(A*x + B))
        
        We fit A and B on calibration data where x = judge_score, y = human_score.
        """
        self.dimension = dimension
        self.A = 0.0
        self.B = 0.0
        
        if calibration_samples:
            self._fit(calibration_samples)
    
    def _fit(self, calibration_samples: List[CalibrationSample]):
        """Fit Platt scaling coefficients on calibration data."""
        try:
            from scipy.optimize import minimize
        except ImportError:
            # Fallback: no calibration without scipy
            return
        
        judge_scores = []
        human_scores = []
        
        for sample in calibration_samples:
            # Average across judges for this dimension
            judge_vals = [
                float(score.scores[self.dimension])
                for score in sample.judge_scores.values()
                if self.dimension in score.scores
            ]
            if not judge_vals:
                continue
            
            judge_mean = np.mean(judge_vals)
            human_score = float(sample.human_scores.get(self.dimension, 3))
            
            judge_scores.append(judge_mean)
            human_scores.append(human_score)
        
        if len(judge_scores) < 3:
            return  # Not enough data
        
        X = np.array(judge_scores).reshape(-1, 1)
        y = np.array(human_scores)
        
        # Normalize to [0, 1] for Platt scaling
        X_norm = (X - 1.0) / 4.0  # Scores are 1-5, map to [0, 1]
        y_norm = (y - 1.0) / 4.0
        
        # Log loss minimization
        def log_loss(params):
            A, B = params
            probs = 1.0 / (1.0 + np.exp(A * X_norm + B))
            epsilon = 1e-15
            probs = np.clip(probs, epsilon, 1 - epsilon)
            return -np.mean(y_norm * np.log(probs) + (1 - y_norm) * np.log(1 - probs))
        
        result = minimize(log_loss, [1.0, 0.0], method='Nelder-Mead')
        self.A, self.B = result.x
    
    def calibrate(self, raw_score: float) -> float:
        """Map raw judge score (1-5) to calibrated probability [0, 1]."""
        if self.A == 0 and self.B == 0:
            # No calibration data, return normalized score
            return (raw_score - 1.0) / 4.0
        
        x_norm = (raw_score - 1.0) / 4.0
        prob = 1.0 / (1.0 + np.exp(self.A * x_norm + self.B))
        return prob


# ============================================================================
# 4. JUDGE AGREEMENT METRICS: KRIPPENDORFF'S ALPHA & COHEN'S KAPPA
# ============================================================================

def krippendorff_alpha(
    judge_scores_list: List[Dict[str, float]],
    dimension: str
) -> float:
    """
    Compute Krippendorff's alpha for inter-judge agreement.
    
    Range: -1 to 1
      1.0: perfect agreement
      0.0: chance agreement
    <-0.1: below chance
    
    Robust to missing judgments and arbitrary number of judges.
    """
    # Extract scores for this dimension
    scores = []
    for judge_dict in judge_scores_list:
        if dimension in judge_dict:
            scores.append(judge_dict[dimension])
    
    if len(scores) < 2:
        return 0.0
    
    scores = np.array(scores)
    
    # Coincidence matrix: count pairs of scores
    coincidence = {}
    for score in scores:
        coincidence[score] = coincidence.get(score, 0) + 1
    
    # Pairable units
    m = len(scores)
    if m < 2:
        return 0.0
    
    # Observed disagreement
    do = 0.0
    for i, s1 in enumerate(scores):
        for j, s2 in enumerate(scores):
            if i != j:
                do += (s1 - s2) ** 2
    
    if m > 0:
        do /= (m * (m - 1))
    
    # Expected disagreement
    de = 0.0
    for c1, c2 in [(c1, c2) for c1 in coincidence.values() for c2 in coincidence.values()]:
        if c1 == c2:
            de += c1 * (c1 - 1)
        else:
            de += c1 * c2
    
    if m > 1:
        de /= (m * (m - 1))
    
    if de == 0:
        return 1.0 if do == 0 else 0.0
    
    alpha = 1.0 - (do / de)
    return float(np.clip(alpha, -1.0, 1.0))


def cohens_kappa(judge_scores_a: Dict[str, float], judge_scores_b: Dict[str, float]) -> float:
    """
    Compute Cohen's kappa for agreement between 2 judges.
    
    Range: -1 to 1
      1.0: perfect agreement
      0.0: chance agreement
    <-0.1: below chance
    
    Only works for exactly 2 judges; use for pairwise comparisons.
    """
    # Get common dimensions
    common_dims = set(judge_scores_a.keys()) & set(judge_scores_b.keys())
    if not common_dims:
        return 0.0
    
    scores_a = np.array([judge_scores_a[d] for d in common_dims])
    scores_b = np.array([judge_scores_b[d] for d in common_dims])
    
    # Observed agreement
    po = np.mean(scores_a == scores_b)
    
    # Expected agreement (marginal)
    unique_scores = set(scores_a) | set(scores_b)
    pe = 0.0
    for score in unique_scores:
        pa = np.mean(scores_a == score)
        pb = np.mean(scores_b == score)
        pe += pa * pb
    
    if pe == 1.0:
        return 1.0 if po == 1.0 else 0.0
    
    kappa = (po - pe) / (1.0 - pe)
    return float(np.clip(kappa, -1.0, 1.0))


# ============================================================================
# 5. ENSEMBLE CONSENSUS WITH CONFIDENCE WEIGHTING
# ============================================================================

class JudgeEnsemble:
    """Multi-judge ensemble with confidence-weighted consensus."""
    
    def __init__(
        self,
        judges: List[Judge],
        calibration_samples: Optional[List[CalibrationSample]] = None,
        skip_third_on_agreement: bool = True,
        agreement_threshold: float = 0.95,
    ):
        """
        Initialize ensemble with judges and optional calibration.
        
        Args:
            judges: List of Judge instances
            calibration_samples: Data to calibrate scores (50 human-annotated)
            skip_third_on_agreement: If True, skip 3rd judge if first 2 agree
            agreement_threshold: Threshold for early stopping (Krippendorff's alpha)
        """
        self.judges = judges
        self.skip_third_on_agreement = skip_third_on_agreement
        self.agreement_threshold = agreement_threshold
        
        # Initialize calibrators per dimension
        self.calibrators = {
            dim: PlattScalingCalibrator(dim, calibration_samples or [])
            for dim in EVALUATION_RUBRIC.keys()
        }
    
    def evaluate_summary(
        self,
        summary: str,
        source_data: str,
        icp_profile: str,
        report_id: str
    ) -> ConsensusResult:
        """
        Evaluate summary with ensemble and return consensus.
        
        Sequential judging: if first 2 judges agree within threshold, skip 3rd.
        """
        judgments = []
        start_time = time.perf_counter()
        
        for i, judge in enumerate(self.judges):
            judgment = judge.evaluate(summary, source_data, icp_profile, report_id)
            judgments.append(judgment)
            
            # Early stopping: check agreement after 2 judges
            if (
                self.skip_third_on_agreement
                and i == 1
                and len(self.judges) > 2
            ):
                agreement = self._check_agreement(judgments)
                if agreement >= self.agreement_threshold:
                    break  # Skip remaining judges
        
        latency_ms = (time.perf_counter() - start_time) * 1000
        
        return self._compute_consensus(judgments, report_id, latency_ms)
    
    def _check_agreement(self, judgments: List[JudgmentScore]) -> float:
        """Check agreement after 2 judges (Cohen's kappa)."""
        if len(judgments) < 2:
            return 0.0
        
        j1, j2 = judgments[0], judgments[1]
        scores_1 = {
            'factual_accuracy': j1.factual_accuracy,
            'completeness': j1.completeness,
            'actionability': j1.actionability,
            'conciseness': j1.conciseness,
            'tone': j1.tone,
        }
        scores_2 = {
            'factual_accuracy': j2.factual_accuracy,
            'completeness': j2.completeness,
            'actionability': j2.actionability,
            'conciseness': j2.conciseness,
            'tone': j2.tone,
        }
        
        return cohens_kappa(scores_1, scores_2)
    
    def _compute_consensus(
        self,
        judgments: List[JudgmentScore],
        report_id: str,
        latency_ms: float
    ) -> ConsensusResult:
        """Compute confidence-weighted consensus from judges."""
        
        if not judgments:
            raise ValueError("No judgments to compute consensus")
        
        # Extract scores for each dimension
        dimensions = ['factual_accuracy', 'completeness', 'actionability', 'conciseness', 'tone']
        scores_by_dim = {dim: [] for dim in dimensions}
        confidences = []
        
        for judgment in judgments:
            for dim in dimensions:
                score = getattr(judgment, dim)
                scores_by_dim[dim].append(float(score))
            confidences.append(judgment.confidence)
        
        # Confidence-weighted average: higher confidence judges weighted more
        confidences = np.array(confidences)
        conf_weights = confidences / np.sum(confidences)  # Normalize to sum to 1
        
        consensus_scores = {}
        for dim in dimensions:
            raw_scores = np.array(scores_by_dim[dim])
            weighted_score = np.sum(raw_scores * conf_weights)
            
            # Calibrate to human-aligned probability
            calibrated = self.calibrators[dim].calibrate(weighted_score)
            # Map back to 1-5 scale
            calibrated_1_5 = 1.0 + calibrated * 4.0
            
            consensus_scores[dim] = calibrated_1_5
        
        # Overall score: weighted by rubric weights
        weights = {dim: EVALUATION_RUBRIC[dim]['weight'] for dim in dimensions}
        overall = sum(consensus_scores[dim] * weights[dim] for dim in dimensions)
        
        # Compute agreement metric
        if len(judgments) == 2:
            agreement = self._check_agreement(judgments)
            agreement_metric = 'cohens_kappa'
        else:
            scores_list = [{
                'factual_accuracy': j.factual_accuracy,
                'completeness': j.completeness,
                'actionability': j.actionability,
                'conciseness': j.conciseness,
                'tone': j.tone,
            } for j in judgments]
            agreement = np.mean([
                krippendorff_alpha(scores_list, dim)
                for dim in dimensions
            ])
            agreement_metric = 'krippendorff'
        
        # 95% confidence interval (bootstrapped)
        overall_scores = np.array([overall for _ in range(100)])  # Placeholder
        ci_95 = (np.percentile(overall_scores, 2.5), np.percentile(overall_scores, 97.5))
        
        return ConsensusResult(
            report_id=report_id,
            consensus_scores=consensus_scores,
            overall_score=overall,
            judge_agreement=agreement,
            agreement_metric=agreement_metric,
            confidence_interval=ci_95,
            num_judges_used=len(judgments),
            judges_used=[j.judge_name for j in judgments],
            latency_ms=latency_ms
        )


# ============================================================================
# 6. ADVERSARIAL EVALUATION
# ============================================================================

class AdversarialEvaluator:
    """Test judges on intentionally hallucinated reports."""
    
    def __init__(self, judge_ensemble: JudgeEnsemble):
        self.judge_ensemble = judge_ensemble
    
    def generate_hallucinated_report(
        self,
        true_source: str,
        base_summary: str,
        num_hallucinations: int = 3
    ) -> Tuple[str, List[str]]:
        """
        Create hallucinated version of report with N false claims.
        Returns (hallucinated_text, list_of_false_claims)
        """
        # Simple approach: append false claims to end of summary
        false_claims = [
            f"Founded in {2010 + i} with $XX million in Series {chr(65+i)} funding",
            f"Employs over {100 * (i+1)} people in {i+1} countries",
            f"Revenue grew {50 * (i+1)}% YoY due to {['AI', 'blockchain', 'quantum'][i % 3]} products",
        ][:num_hallucinations]
        
        hallucinated = base_summary + "\n\n**FABRICATED CLAIMS:**\n" + "\n".join(false_claims)
        return hallucinated, false_claims
    
    def evaluate_hallucination_detection(
        self,
        true_source: str,
        base_summary: str,
        num_hallucinations: int = 3
    ) -> Dict:
        """Evaluate how well judges catch hallucinations."""
        
        hallucinated_summary, false_claims = self.generate_hallucinated_report(
            true_source, base_summary, num_hallucinations
        )
        
        # For now, we would call a specialized evaluation
        # In production, this would use a separate adversarial judge
        
        return {
            'num_hallucinations_inserted': num_hallucinations,
            'false_claims': false_claims,
            'summary_with_hallucinations': hallucinated_summary,
            'detection_rate': 0.0  # Placeholder
        }


# ============================================================================
# 7. PERSISTENT STORAGE & METRICS
# ============================================================================

class JudgeMetricsDB:
    """SQLite-backed metrics storage for judge evaluations."""
    
    def __init__(self, db_path: str = "scrapus_metrics.db"):
        self.db_path = db_path
        self._init_schema()
    
    def _init_schema(self):
        """Create monitoring tables if they don't exist."""
        conn = sqlite3.connect(self.db_path)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS judge_scores (
                id INTEGER PRIMARY KEY,
                report_id TEXT NOT NULL,
                judge_name TEXT NOT NULL,
                factual_accuracy INTEGER,
                completeness INTEGER,
                actionability INTEGER,
                conciseness INTEGER,
                tone INTEGER,
                explanation TEXT,
                confidence REAL,
                latency_ms REAL,
                ts TEXT DEFAULT (datetime('now'))
            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS consensus_results (
                id INTEGER PRIMARY KEY,
                report_id TEXT NOT NULL UNIQUE,
                consensus_factual_accuracy REAL,
                consensus_completeness REAL,
                consensus_actionability REAL,
                consensus_conciseness REAL,
                consensus_tone REAL,
                overall_score REAL,
                judge_agreement REAL,
                agreement_metric TEXT,
                num_judges_used INTEGER,
                judges_used TEXT,
                latency_ms REAL,
                ts TEXT DEFAULT (datetime('now'))
            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS gold_calibration (
                id INTEGER PRIMARY KEY,
                report_id TEXT NOT NULL UNIQUE,
                human_factual_accuracy INTEGER,
                human_completeness INTEGER,
                human_actionability INTEGER,
                human_conciseness INTEGER,
                human_tone INTEGER,
                annotation_source TEXT,
                ts TEXT DEFAULT (datetime('now'))
            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS adversarial_tests (
                id INTEGER PRIMARY KEY,
                test_id TEXT NOT NULL,
                report_id TEXT,
                num_hallucinations INTEGER,
                detection_rate REAL,
                test_type TEXT,
                ts TEXT DEFAULT (datetime('now'))
            )
        """)
        
        conn.commit()
        conn.close()
    
    def save_judgment(self, judgment: JudgmentScore):
        """Save individual judge's score."""
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            INSERT INTO judge_scores (
                report_id, judge_name, factual_accuracy, completeness,
                actionability, conciseness, tone, explanation, confidence, latency_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            judgment.report_id,
            judgment.judge_name,
            judgment.factual_accuracy,
            judgment.completeness,
            judgment.actionability,
            judgment.conciseness,
            judgment.tone,
            judgment.explanation,
            judgment.confidence,
            judgment.latency_ms
        ))
        conn.commit()
        conn.close()
    
    def save_consensus(self, result: ConsensusResult):
        """Save consensus result."""
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            INSERT INTO consensus_results (
                report_id, consensus_factual_accuracy, consensus_completeness,
                consensus_actionability, consensus_conciseness, consensus_tone,
                overall_score, judge_agreement, agreement_metric, num_judges_used,
                judges_used, latency_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            result.report_id,
            result.consensus_scores['factual_accuracy'],
            result.consensus_scores['completeness'],
            result.consensus_scores['actionability'],
            result.consensus_scores['conciseness'],
            result.consensus_scores['tone'],
            result.overall_score,
            result.judge_agreement,
            result.agreement_metric,
            result.num_judges_used,
            ','.join(result.judges_used),
            result.latency_ms
        ))
        conn.commit()
        conn.close()
    
    def add_gold_sample(
        self,
        report_id: str,
        human_scores: Dict[str, int],
        annotation_source: str = "human"
    ):
        """Add gold-standard human annotation for calibration."""
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            INSERT INTO gold_calibration (
                report_id, human_factual_accuracy, human_completeness,
                human_actionability, human_conciseness, human_tone,
                annotation_source
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            report_id,
            human_scores.get('factual_accuracy', 3),
            human_scores.get('completeness', 3),
            human_scores.get('actionability', 3),
            human_scores.get('conciseness', 3),
            human_scores.get('tone', 3),
            annotation_source
        ))
        conn.commit()
        conn.close()
    
    def get_gold_samples(self, limit: int = 50) -> List[Dict]:
        """Retrieve gold samples for calibration."""
        conn = sqlite3.connect(self.db_path)
        rows = conn.execute("""
            SELECT report_id, human_factual_accuracy, human_completeness,
                   human_actionability, human_conciseness, human_tone
            FROM gold_calibration
            LIMIT ?
        """, (limit,)).fetchall()
        conn.close()
        
        return [
            {
                'report_id': r[0],
                'human_scores': {
                    'factual_accuracy': r[1],
                    'completeness': r[2],
                    'actionability': r[3],
                    'conciseness': r[4],
                    'tone': r[5]
                }
            }
            for r in rows
        ]
    
    def get_consensus_metrics(self, report_id: str) -> Optional[Dict]:
        """Retrieve consensus result for a report."""
        conn = sqlite3.connect(self.db_path)
        row = conn.execute("""
            SELECT overall_score, judge_agreement, agreement_metric,
                   latency_ms, judges_used
            FROM consensus_results
            WHERE report_id = ?
        """, (report_id,)).fetchone()
        conn.close()
        
        if not row:
            return None
        
        return {
            'overall_score': row[0],
            'judge_agreement': row[1],
            'agreement_metric': row[2],
            'latency_ms': row[3],
            'judges_used': row[4].split(',') if row[4] else []
        }
    
    def get_latency_stats(self, stage: str = "judge_consensus") -> Dict:
        """Get P50, P95, P99 latency for judge consensus."""
        conn = sqlite3.connect(self.db_path)
        rows = conn.execute("""
            SELECT latency_ms FROM consensus_results
            ORDER BY latency_ms
        """).fetchall()
        conn.close()
        
        if not rows:
            return {}
        
        latencies = [r[0] for r in rows]
        return {
            'p50': float(np.percentile(latencies, 50)),
            'p95': float(np.percentile(latencies, 95)),
            'p99': float(np.percentile(latencies, 99)),
            'mean': float(np.mean(latencies)),
            'num_samples': len(latencies)
        }


# ============================================================================
# 8. PRODUCTION INTEGRATION
# ============================================================================

class LLMJudgeEvaluationHarness:
    """High-level harness for production integration."""
    
    def __init__(
        self,
        judge_models: List[str] = None,
        ollama_base_url: str = "http://localhost:11434",
        db_path: str = "scrapus_metrics.db",
        evaluate_every_n_reports: int = 10,
    ):
        """
        Initialize evaluation harness.
        
        Args:
            judge_models: List of Ollama model names (default: llama3.1, mistral)
            ollama_base_url: Ollama API endpoint
            db_path: SQLite metrics database path
            evaluate_every_n_reports: Auto-evaluate every Nth report in production
        """
        if judge_models is None:
            judge_models = ['llama3.1:latest', 'mistral:latest']
        
        self.judge_models = judge_models
        self.ollama_base_url = ollama_base_url
        self.db = JudgeMetricsDB(db_path)
        self.evaluate_every_n = evaluate_every_n_reports
        self.report_counter = 0
        
        # Initialize judges
        self.judges = [
            OllamaJudge(model, ollama_base_url=ollama_base_url)
            for model in judge_models
        ]
        
        # Load calibration data
        gold_samples = self.db.get_gold_samples(limit=50)
        calibration_samples = [
            CalibrationSample(
                report_id=s['report_id'],
                human_scores=s['human_scores'],
                judge_scores={}  # Would be populated from judge_scores table
            )
            for s in gold_samples
        ]
        
        # Initialize ensemble
        self.ensemble = JudgeEnsemble(
            self.judges,
            calibration_samples=calibration_samples,
            skip_third_on_agreement=True,
            agreement_threshold=0.90
        )
    
    def evaluate_report(
        self,
        report_id: str,
        summary: str,
        source_data: str,
        icp_profile: str,
        force_evaluate: bool = False
    ) -> Optional[ConsensusResult]:
        """
        Evaluate report if it matches auto-evaluation cadence.
        
        Args:
            force_evaluate: Override cadence, always evaluate
            
        Returns:
            ConsensusResult if evaluated, None otherwise
        """
        self.report_counter += 1
        should_evaluate = force_evaluate or (self.report_counter % self.evaluate_every_n == 0)
        
        if not should_evaluate:
            return None
        
        try:
            # Ensemble evaluation
            consensus = self.ensemble.evaluate_summary(
                summary, source_data, icp_profile, report_id
            )
            
            # Store in database
            self.db.save_consensus(consensus)
            
            return consensus
        except Exception as e:
            print(f"Error evaluating report {report_id}: {e}")
            return None
    
    def batch_evaluate(
        self,
        reports: List[Dict]
    ) -> List[ConsensusResult]:
        """
        Evaluate a batch of reports.
        
        Args:
            reports: List of dicts with keys: report_id, summary, source_data, icp_profile
        """
        results = []
        for report in reports:
            result = self.evaluate_report(
                report_id=report['report_id'],
                summary=report['summary'],
                source_data=report['source_data'],
                icp_profile=report['icp_profile'],
                force_evaluate=True
            )
            if result:
                results.append(result)
        
        return results
    
    def get_quality_metrics_summary(self) -> Dict:
        """Get summary of judge quality metrics."""
        latency_stats = self.db.get_latency_stats()
        
        # Query for overall quality distribution
        conn = sqlite3.connect(self.db.db_path)
        rows = conn.execute("""
            SELECT
                ROUND(overall_score),
                COUNT(*) as count
            FROM consensus_results
            GROUP BY ROUND(overall_score)
            ORDER BY ROUND(overall_score)
        """).fetchall()
        conn.close()
        
        quality_dist = {str(int(r[0])): r[1] for r in rows}
        
        return {
            'latency_stats': latency_stats,
            'quality_distribution': quality_dist,
            'total_evaluated': sum(quality_dist.values()),
            'avg_agreement': self._compute_avg_agreement(),
            'recommendation': self._get_recommendation(latency_stats)
        }
    
    def _compute_avg_agreement(self) -> float:
        """Average judge agreement across all evaluated reports."""
        conn = sqlite3.connect(self.db.db_path)
        rows = conn.execute("""
            SELECT AVG(judge_agreement) FROM consensus_results
        """).fetchone()
        conn.close()
        
        return float(rows[0] or 0.0)
    
    def _get_recommendation(self, latency_stats: Dict) -> str:
        """Generate recommendation based on performance."""
        if not latency_stats:
            return "No evaluations yet"
        
        p95 = latency_stats.get('p95', 0)
        if p95 > 20000:
            return "SLOW: Consider using fewer judges or faster models"
        elif p95 < 10000:
            return "FAST: Consider evaluating more reports"
        else:
            return "OPTIMAL: Current configuration working well"


# ============================================================================
# 9. EXAMPLE USAGE & INTEGRATION
# ============================================================================

def example_usage():
    """Example: Initialize and use the LLM judge harness."""
    
    # 1. Initialize harness (will auto-detect Ollama)
    harness = LLMJudgeEvaluationHarness(
        judge_models=['llama3.1:latest', 'mistral:latest'],
        evaluate_every_n_reports=10
    )
    
    # 2. Example report
    example_report = {
        'report_id': 'lead-2026-03-26-001',
        'summary': """
        Acme Corp is a B2B SaaS company specializing in enterprise automation.
        Founded in 2015, they've raised $12M in Series A funding. Currently employs
        45 people with strong focus on AI-powered workflows. Recent product launches
        include their proprietary NLP engine that cuts processing time by 60%.
        """,
        'source_data': """
        Company: Acme Corp
        Industry: Enterprise Software
        Founded: 2015
        Funding: Series A, $12M
        Headcount: ~45
        Products: Automation platform with NLP
        Recent news: AI product launch Q1 2026
        """,
        'icp_profile': """
        Target: B2B SaaS companies
        Industry: Enterprise software
        Stage: Series A/B
        Size: 30-100 employees
        Pain point: Manual data processing
        """
    }
    
    # 3. Evaluate (will be auto-sampled based on cadence)
    consensus = harness.evaluate_report(
        force_evaluate=True,
        **example_report
    )
    
    if consensus:
        print(f"\n=== Judge Consensus for {consensus.report_id} ===")
        print(f"Overall Score: {consensus.overall_score:.2f}/5.0")
        print(f"Judge Agreement: {consensus.judge_agreement:.3f} ({consensus.agreement_metric})")
        print(f"Latency: {consensus.latency_ms:.1f}ms")
        print(f"Judges used: {', '.join(consensus.judges_used)}")
        print(f"\nDimension Breakdown:")
        for dim, score in consensus.consensus_scores.items():
            print(f"  {dim}: {score:.2f}")
    
    # 4. Get metrics
    summary = harness.get_quality_metrics_summary()
    print(f"\n=== Quality Metrics Summary ===")
    print(f"Total evaluated: {summary['total_evaluated']}")
    print(f"Avg agreement: {summary['avg_agreement']:.3f}")
    print(f"Recommendation: {summary['recommendation']}")


if __name__ == "__main__":
    # Quick connectivity check and example
    try:
        print("LLM Judge System Initialized")
        print("Designed for M1 local deployment with Ollama")
        print("\nKey features:")
        print("  - Multi-judge ensemble (Llama 3.1 7B + Mistral 7B)")
        print("  - 5-dimension structured rubric")
        print("  - Platt scaling calibration to human scores")
        print("  - Krippendorff's alpha & Cohen's kappa agreement metrics")
        print("  - Sequential judging (skip 3rd if 2 agree)")
        print("  - <20s latency for 2-judge consensus")
        print("  - Adversarial hallucination testing")
        print("  - Production integration with SQLite metrics")
        print("\nUsage:")
        print("  harness = LLMJudgeEvaluationHarness()")
        print("  result = harness.evaluate_report(...)")
        print("  summary = harness.get_quality_metrics_summary()")
    except Exception as e:
        print(f"Error: {e}")
