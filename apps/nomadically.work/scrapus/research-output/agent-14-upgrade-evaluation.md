Based on my research findings, I'll now provide a comprehensive upgrade blueprint:

# UPGRADE BLUEPRINT: Scrapus Pipeline Evaluation Infrastructure

## Executive Summary

This blueprint addresses critical gaps in the original Scrapus evaluation methodology by incorporating 2024-2026 advances in ML monitoring, LLM evaluation, and pipeline reliability engineering. The proposed system moves beyond static accuracy metrics to dynamic, continuous evaluation with automated quality gates.

## 1. Advanced Data Drift Detection with Evidently AI 2.0

### Research Foundation
**Pahune & Akhtar (2025)** [Transitioning from MLOps to LLMOps: Navigating the Unique Challenges of Large Language Models](https://doi.org/10.3390/info16020087) identifies that traditional MLOps tools fail to capture LLM-specific drift patterns like prompt injection susceptibility and output distribution shifts.

**Bayram & Ahmed (2024)** [Towards Trustworthy Machine Learning in Production: An Overview of the Robustness in MLOps Approach](https://doi.org/10.1145/3708497) introduces the "Robustness in MLOps" framework emphasizing multi-dimensional drift detection.

### Implementation Architecture

```python
# scrapus_monitoring/drift_detector.py
import evidently
from evidently.metrics import *
from evidently.report import Report
from evidently.test_suite import TestSuite
from evidently.test_preset import DataDriftTestPreset
import pandas as pd
from datetime import datetime, timedelta

class ScrapusDriftMonitor:
    def __init__(self, reference_window_days=30):
        self.reference_data = {}
        self.drift_thresholds = {
            'crawl_distribution': 0.15,  # KL divergence threshold
            'entity_distribution': 0.10,
            'embedding_cosine': 0.20,
            'summary_quality': 0.25  # ROUGE-L drop
        }
        
    def monitor_crawl_distribution(self, current_crawl_stats):
        """Monitor domain and content type distribution shifts"""
        report = Report(metrics=[
            DataDriftPreset(),
            DatasetSummaryMetric(),
            ColumnDriftMetric(column_name="domain"),
            ColumnDriftMetric(column_name="content_type"),
            ColumnDriftMetric(column_name="page_rank"),
            ColumnDistributionMetric(column_name="crawl_depth")
        ])
        
        # Calculate temporal drift using Wasserstein distance
        temporal_drift = self._calculate_temporal_drift(
            current_crawl_stats, 
            self.reference_data.get('crawl_stats')
        )
        
        return {
            'drift_detected': temporal_drift > self.drift_thresholds['crawl_distribution'],
            'drift_score': temporal_drift,
            'affected_domains': self._identify_drift_domains(current_crawl_stats)
        }
    
    def monitor_entity_distribution(self, extracted_entities):
        """Monitor NER output distribution shifts"""
        # Track industry-specific entity prevalence
        industry_entities = self._categorize_entities_by_industry(extracted_entities)
        
        drift_report = {
            'industry_shifts': {},
            'new_entity_types': [],
            'vanished_entity_types': []
        }
        
        for industry, entities in industry_entities.items():
            reference = self.reference_data.get(f'entities_{industry}', {})
            if reference:
                js_divergence = self._jensen_shannon_divergence(
                    entities, reference
                )
                drift_report['industry_shifts'][industry] = {
                    'divergence': js_divergence,
                    'significant': js_divergence > 0.1
                }
        
        return drift_report
    
    def monitor_embedding_space(self, current_embeddings):
        """Monitor embedding distribution shifts using PCA and t-SNE"""
        from sklearn.decomposition import PCA
        from sklearn.manifold import TSNE
        
        # Dimensionality reduction for visualization
        pca = PCA(n_components=2)
        current_pca = pca.fit_transform(current_embeddings)
        reference_pca = pca.transform(self.reference_data.get('embeddings', []))
        
        # Calculate centroid shift
        current_centroid = np.mean(current_pca, axis=0)
        reference_centroid = np.mean(reference_pca, axis=0)
        centroid_shift = np.linalg.norm(current_centroid - reference_centroid)
        
        return {
            'centroid_shift': centroid_shift,
            'pca_variance_ratio': pca.explained_variance_ratio_.tolist(),
            'embedding_drift': centroid_shift > 0.15
        }

# Dashboard Integration
class ScrapusMonitoringDashboard:
    def __init__(self):
        self.drift_monitor = ScrapusDriftMonitor()
        self.alert_system = AlertSystem()
        
    def generate_dashboard(self):
        """Generate Grafana-compatible metrics"""
        return {
            'panels': [
                {
                    'title': 'Crawl Distribution Drift',
                    'type': 'timeseries',
                    'metrics': ['crawl_drift_score', 'domain_drift_alert']
                },
                {
                    'title': 'Entity Extraction Stability',
                    'type': 'heatmap',
                    'metrics': ['industry_entity_drift', 'new_entity_alerts']
                },
                {
                    'title': 'Embedding Space Evolution',
                    'type': 'scatter',
                    'metrics': ['embedding_centroid_shift', 'pca_variance']
                }
            ]
        }
```

## 2. LLM-as-Judge Protocol with Multi-Model Consensus

### Research Foundation
**Li et al. (2025)** [From Generation to Judgment: Opportunities and Challenges of LLM-as-a-judge](https://doi.org/10.18653/v1/2025.emnlp-main.138) demonstrates that single LLM judges exhibit positional bias and inconsistency, recommending multi-model consensus approaches.

**Croxford et al. (2025)** [Evaluating clinical AI summaries with large language models as judges](https://doi.org/10.1038/s41746-025-02005-2) validates LLM-based evaluation against human gold standards in high-stakes domains.

### Implementation Architecture

```python
# scrapus_evaluation/llm_judge.py
from typing import List, Dict, Any
import json
from dataclasses import dataclass
from enum import Enum

class EvaluationDimension(Enum):
    FACTUAL_ACCURACY = "factual_accuracy"
    RELEVANCE = "relevance"
    CONCISENESS = "conciseness"
    ACTIONABILITY = "actionability"
    PROFESSIONAL_TONE = "professional_tone"

@dataclass
class LeadSummaryEvaluation:
    summary: str
    source_content: List[str]
    icp_profile: Dict[str, Any]
    
class LLMJudgeProtocol:
    def __init__(self, judge_models: List[str] = None):
        self.judge_models = judge_models or [
            'gpt-4-turbo',
            'claude-3-opus',
            'llama-3.1-70b',
            'gemini-1.5-pro'
        ]
        
        self.evaluation_rubric = {
            EvaluationDimension.FACTUAL_ACCURACY: {
                'description': 'Alignment with source content',
                'levels': {
                    '5': 'Perfect alignment, no hallucinations',
                    '4': 'Minor omissions but no inaccuracies',
                    '3': 'Some inaccuracies but mostly correct',
                    '2': 'Significant factual errors',
                    '1': 'Completely inaccurate'
                }
            },
            EvaluationDimension.RELEVANCE: {
                'description': 'Relevance to ICP profile',
                'levels': {
                    '5': 'Perfectly tailored to ICP needs',
                    '4': 'Highly relevant with minor gaps',
                    '3': 'Moderately relevant',
                    '2': 'Limited relevance',
                    '1': 'Completely irrelevant'
                }
            },
            EvaluationDimension.ACTIONABILITY: {
                'description': 'Provides clear next steps',
                'levels': {
                    '5': 'Clear, specific action items',
                    '4': 'Actionable but somewhat vague',
                    '3': 'Somewhat actionable',
                    '2': 'Limited actionable content',
                    '1': 'No actionable insights'
                }
            }
        }
    
    def evaluate_summary(self, evaluation: LeadSummaryEvaluation) -> Dict:
        """Multi-model consensus evaluation"""
        judgments = []
        
        for model in self.judge_models:
            judgment = self._get_judgment(model, evaluation)
            judgments.append({
                'model': model,
                'scores': judgment['scores'],
                'rationale': judgment['rationale'],
                'confidence': judgment['confidence']
            })
        
        # Calculate consensus scores with confidence weighting
        consensus = self._calculate_consensus(judgments)
        
        return {
            'consensus_scores': consensus['scores'],
            'judge_agreement': consensus['agreement'],
            'individual_judgments': judgments,
            'quality_grade': self._assign_grade(consensus['scores'])
        }
    
    def _get_judgment(self, model: str, evaluation: LeadSummaryEvaluation) -> Dict:
        """Get judgment from specific LLM"""
        prompt = self._build_evaluation_prompt(evaluation)
        
        # Implementation would use appropriate model API
        response = self._call_llm_api(model, prompt)
        
        return self._parse_judgment_response(response)
    
    def _build_evaluation_prompt(self, evaluation: LeadSummaryEvaluation) -> str:
        """Build structured evaluation prompt"""
        return f"""
        You are evaluating a B2B lead summary for quality. Use the following rubric:
        
        {json.dumps(self.evaluation_rubric, indent=2)}
        
        SOURCE CONTENT:
        {json.dumps(evaluation.source_content, indent=2)}
        
        ICP PROFILE:
        {json.dumps(evaluation.icp_profile, indent=2)}
        
        SUMMARY TO EVALUATE:
        {evaluation.summary}
        
        Provide scores for each dimension (1-5) with brief rationale.
        Format: JSON with 'scores', 'rationale', 'confidence' (0-1)
        """
    
    def _calculate_consensus(self, judgments: List[Dict]) -> Dict:
        """Calculate weighted consensus across judges"""
        weighted_scores = {}
        
        for dim in EvaluationDimension:
            dim_scores = []
            confidences = []
            
            for judgment in judgments:
                dim_scores.append(judgment['scores'][dim.value])
                confidences.append(judgment['confidence'])
            
            # Weight by confidence
            weighted_avg = np.average(dim_scores, weights=confidences)
            weighted_scores[dim.value] = weighted_avg
        
        # Calculate inter-judge agreement
        agreement_score = self._calculate_agreement(judgments)
        
        return {
            'scores': weighted_scores,
            'agreement': agreement_score
        }

# Quality Gate Integration
class SummaryQualityGate:
    def __init__(self, min_scores: Dict[EvaluationDimension, float]):
        self.min_scores = min_scores
        self.judge_protocol = LLMJudgeProtocol()
    
    def evaluate_and_gate(self, summary_evaluation: LeadSummaryEvaluation) -> Dict:
        """Evaluate summary and apply quality gate"""
        evaluation = self.judge_protocol.evaluate_summary(summary_evaluation)
        
        passes_gate = True
        failed_dimensions = []
        
        for dim, min_score in self.min_scores.items():
            if evaluation['consensus_scores'][dim.value] < min_score:
                passes_gate = False
                failed_dimensions.append({
                    'dimension': dim.value,
                    'score': evaluation['consensus_scores'][dim.value],
                    'minimum': min_score
                })
        
        return {
            'passes': passes_gate,
            'evaluation': evaluation,
            'failed_dimensions': failed_dimensions,
            'recommendation': 'REJECT' if not passes_gate else 'ACCEPT'
        }
```

## 3. Error Propagation Matrix with Causal Analysis

### Research Foundation
**Uçar et al. (2024)** [Artificial Intelligence for Predictive Maintenance Applications: Key Components, Trustworthiness, and Future Trends](https://doi.org/10.3390/app14020898) introduces causal inference methods for error attribution in complex systems.

**Lambert et al. (2024)** [Trustworthy clinical AI solutions: A unified review of uncertainty quantification in Deep Learning models for medical image analysis](https://doi.org/10.1016/j.artmed.2024.102830) provides methods for uncertainty propagation through pipelines.

### Implementation Architecture

```python
# scrapus_monitoring/error_propagation.py
import networkx as nx
from typing import Dict, List, Tuple
import numpy as np
from scipy import stats

class ErrorPropagationAnalyzer:
    def __init__(self):
        self.pipeline_graph = self._build_pipeline_graph()
        self.error_metrics = {}
        
    def _build_pipeline_graph(self) -> nx.DiGraph:
        """Build directed graph of pipeline stages"""
        G = nx.DiGraph()
        
        # Define pipeline stages
        stages = [
            ('crawling', 'extraction'),
            ('extraction', 'matching'),
            ('matching', 'summarization'),
            ('crawling', 'matching'),  # Direct error propagation
            ('extraction', 'summarization')  # Direct error propagation
        ]
        
        for source, target in stages:
            G.add_edge(source, target)
            
        return G
    
    def track_error_propagation(self, pipeline_execution: Dict) -> Dict:
        """Track errors through pipeline execution"""
        error_matrix = np.zeros((len(self.pipeline_graph.nodes), 
                                len(self.pipeline_graph.nodes)))
        
        stages = list(self.pipeline_graph.nodes)
        stage_indices = {stage: i for i, stage in enumerate(stages)}
        
        # Calculate error propagation probabilities
        for source in stages:
            for target in stages:
                if self.pipeline_graph.has_edge(source, target):
                    propagation_prob = self._calculate_propagation_probability(
                        pipeline_execution[source]['errors'],
                        pipeline_execution[target]['errors']
                    )
                    error_matrix[stage_indices[source]][stage_indices[target]] = propagation_prob
        
        # Calculate cascade metrics
        cascade_metrics = self._calculate_cascade_metrics(error_matrix, stages)
        
        return {
            'error_matrix': error_matrix.tolist(),
            'stage_labels': stages,
            'cascade_metrics': cascade_metrics,
            'critical_paths': self._identify_critical_paths(error_matrix, stages)
        }
    
    def _calculate_propagation_probability(self, source_errors: List, target_errors: List) -> float:
        """Calculate probability that source errors cause target errors"""
        if not source_errors:
            return 0.0
        
        # Use causal inference to estimate propagation
        causal_links = 0
        for s_error in source_errors:
            for t_error in target_errors:
                if self._is_causally_linked(s_error, t_error):
                    causal_links += 1
        
        return causal_links / len(source_errors) if source_errors else 0.0
    
    def _calculate_cascade_metrics(self, error_matrix: np.ndarray, stages: List[str]) -> Dict:
        """Calculate cascade error metrics"""
        n_stages = len(stages)
        
        # Cascade Error Rate (CER)
        cer = np.sum(error_matrix) / (n_stages * (n_stages - 1))
        
        # Error Amplification Factor (EAF)
        incoming_errors = np.sum(error_matrix, axis=0)
        outgoing_errors = np.sum(error_matrix, axis=1)
        eaf = np.mean(outgoing_errors / (incoming_errors + 1e-10))
        
        # Pipeline Robustness Score
        total_possible_propagation = n_stages * (n_stages - 1)
        actual_propagation = np.count_nonzero(error_matrix > 0.1)  # Threshold for significant propagation
        robustness = 1 - (actual_propagation / total_possible_propagation)
        
        return {
            'cascade_error_rate': float(cer),
            'error_amplification_factor': float(eaf),
            'pipeline_robustness': float(robustness),
            'most_vulnerable_stage': stages[np.argmax(np.sum(error_matrix, axis=1))],
            'most_resilient_stage': stages[np.argmin(np.sum(error_matrix, axis=1))]
        }
    
    def _identify_critical_paths(self, error_matrix: np.ndarray, stages: List[str]) -> List[Dict]:
        """Identify critical error propagation paths"""
        critical_paths = []
        threshold = 0.3  # Propagation probability threshold
        
        for i, source in enumerate(stages):
            for j, target in enumerate(stages):
                if error_matrix[i][j] > threshold:
                    critical_paths.append({
                        'source': source,
                        'target': target,
                        'propagation_probability': float(error_matrix[i][j]),
                        'severity': self._calculate_path_severity(source, target)
                    })
        
        return sorted(critical_paths, key=lambda x: x['propagation_probability'], reverse=True)

# Real-time Monitoring Integration
class PipelineHealthMonitor:
    def __init__(self):
        self.error_analyzer = ErrorPropagationAnalyzer()
        self.historical_data = []
        
    def monitor_pipeline_health(self, execution_id: str, stage_results: Dict) -> Dict:
        """Monitor pipeline health in real-time"""
        error_analysis = self.error_analyzer.track_error_propagation(stage_results)
        
        # Check for anomaly conditions
        anomalies = self._detect_anomalies(error_analysis)
        
        # Update historical data
        self.historical_data.append({
            'execution_id': execution_id,
            'timestamp': datetime.now(),
            'error_analysis': error_analysis,
            'anomalies': anomalies
        })
        
        # Generate health score
        health_score = self._calculate_health_score(error_analysis)
        
        return {
            'health_score': health_score,
            'anomalies_detected': len(anomalies) > 0,
            'anomaly_details': anomalies,
            'recommended_actions': self._generate_recommendations(error_analysis, anomalies),
            'error_propagation_analysis': error_analysis
        }
```

## 4. Shadow Pipeline for A/B Testing Upgrades

### Research