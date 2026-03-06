Based on the comprehensive research findings from all teammates, I'll now synthesize a detailed knowledge layer design document for the Adversarial Brief Stress-Tester.

# KNOWLEDGE LAYER DESIGN DOCUMENT: Adversarial Brief Stress-Tester

## Executive Summary

This document synthesizes findings from temporal knowledge graphs, narrative coherence, legal analogy, and knowledge-grounded generation into a comprehensive knowledge layer design for the Adversarial Brief Stress-Tester. The system extends the existing BS Detector app (apps/law/) by adding symmetric adversarial argument analysis through a multi-agent architecture (Attacker/Defender/Judge) that stress-tests legal briefs before filing.

## 1. Legal Knowledge Graph Schema

### 1.1 Core Entity Types with Temporal Properties

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Temporal Legal Knowledge Graph Schema            │
├─────────────────────────────────────────────────────────────────────┤
│  Entity Type           │ Temporal Properties        │ Key Attributes │
├────────────────────────┼────────────────────────────┼────────────────┤
│ LegalCase              │ decision_date              │ case_id, court, │
│                        │ valid_from                 │ jurisdiction,   │
│                        │ valid_until (nullable)     │ outcome,        │
│                        │ overruled_by[]             │ citation_count  │
├────────────────────────┼────────────────────────────┼────────────────┤
│ Statute                │ enactment_date             │ statute_id,     │
│                        │ amendment_dates[]          │ title, section, │
│                        │ repeal_date (nullable)     │ jurisdiction,   │
│                        │ version_history            │ hierarchy_level │
├────────────────────────┼────────────────────────────┼────────────────┤
│ LegalDoctrine          │ emergence_date             │ doctrine_id,    │
│                        │ evolution_timeline[]       │ name, definition│
│                        │ current_status             │ supporting_cases│
├────────────────────────┼────────────────────────────┼────────────────┤
│ LegalConcept           │ definition_timeline[]      │ concept_id,     │
│                        │ interpretation_history[]   │ term, domain,   │
│                        │ current_interpretation     │ ambiguity_score │
├────────────────────────┼────────────────────────────┼────────────────┤
│ Jurisdiction           │ rule_change_timeline[]     │ jurisdiction_id,│
│                        │ court_hierarchy_evolution  │ name, level,    │
│                        │                            │ parent_juris    │
├────────────────────────┼────────────────────────────┼────────────────┤
│ ArgumentComponent      │ creation_date              │ arg_id, type,   │
│                        │ modification_dates[]       │ text, strength, │
│                        │                            │ confidence      │
└────────────────────────┴────────────────────────────┴────────────────┘
```

### 1.2 Temporal Relation Types

```json
{
  "relation_schema": {
    "overrules": {
      "source": "LegalCase",
      "target": "LegalCase", 
      "temporal_properties": {
        "relation_valid_from": "date",
        "scope": "string",  // e.g., "doctrine:separate_but_equal"
        "jurisdiction": "string",
        "partial_overruling": "boolean"
      }
    },
    "cites": {
      "source": "LegalCase|Statute|Argument",
      "target": "LegalCase|Statute",
      "temporal_properties": {
        "citation_date": "date",
        "interpretation_type": ["supporting", "distinguishing", "criticizing"],
        "strength_weight": "float"
      }
    },
    "amends": {
      "source": "Statute",
      "target": "Statute",
      "temporal_properties": {
        "amendment_date": "date",
        "amendment_type": ["addition", "modification", "repeal"],
        "scope": "string"
      }
    },
    "applies_doctrine": {
      "source": "LegalCase",
      "target": "LegalDoctrine",
      "temporal_properties": {
        "application_date": "date",
        "application_type": ["establishes", "extends", "limits"],
        "interpretation_novelty": "float"
      }
    },
    "defines_concept": {
      "source": "LegalCase|Statute",
      "target": "LegalConcept",
      "temporal_properties": {
        "definition_date": "date",
        "definition_type": ["original", "clarifying", "expanding"],
        "authority_level": ["binding", "persuasive", "dicta"]
      }
    }
  }
}
```

### 1.3 SAT-Graph RAG Integration (Structure-Aware Temporal Graph)

Based on the Ontology-Driven Graph RAG findings (2025), implement:

```python
class SATLegalKnowledgeGraph:
    def __init__(self):
        self.temporal_layers = {
            "statutory_hierarchy": self.build_statutory_hierarchy(),
            "precedent_network": self.build_precedent_network(),
            "doctrine_evolution": self.build_doctrine_evolution(),
            "jurisdictional_rules": self.build_jurisdictional_rules()
        }
        
        self.diachronic_models = {
            "precedent_decay": self.model_precedent_decay(),
            "statutory_interpretation_trends": self.model_interpretation_trends(),
            "doctrine_application_patterns": self.model_doctrine_patterns()
        }
    
    def query_temporal_context(self, entity_id, target_date, jurisdiction):
        """Retrieve entity state at specific temporal point"""
        return {
            "entity": self.get_entity(entity_id),
            "valid_at_date": self.check_temporal_validity(entity_id, target_date),
            "applicable_version": self.get_applicable_version(entity_id, target_date),
            "jurisdiction_applicability": self.check_jurisdiction(entity_id, jurisdiction, target_date),
            "strength_at_time": self.calculate_strength(entity_id, target_date)
        }
```

## 2. Case Similarity Engine Design

### 2.1 Multi-Modal Similarity Framework

```python
class LegalCaseSimilarityEngine:
    def __init__(self):
        # Based on Mandal et al. (2021) - 56 methodologies evaluated
        self.similarity_methods = {
            "fact_pattern": {
                "bert_embeddings": LegalBERTEmbedder(),
                "tf_idf_weighted": TFIDFWeightedSimilarity(),
                "doc2vec_paragraph": Doc2VecParagraphSimilarity(),
                "hybrid_ensemble": HybridEnsembleSimilarity()
            },
            "legal_issues": {
                "law_match": LawMatchSimilarity(),  # Sun et al. (2022)
                "issue_embedding": IssueEmbeddingSimilarity(),
                "doctrine_alignment": DoctrineAlignmentSimilarity()
            },
            "outcome_prediction": {
                "outcome_similarity": OutcomeSimilarityCalculator(),
                "precedent_strength": PrecedentStrengthSimilarity(),
                "jurisdiction_adjusted": JurisdictionAdjustedSimilarity()
            }
        }
        
        self.distinction_detectors = {
            "factual_distinctions": FactualDistinctionDetector(),
            "legal_issue_variations": LegalIssueVariationDetector(),
            "jurisdictional_differences": JurisdictionalDifferenceDetector(),
            "temporal_factors": TemporalFactorDetector(),
            "procedural_variations": ProceduralVariationDetector()
        }
    
    def find_analogous_cases(self, target_case, precedent_pool, similarity_threshold=0.7):
        """Multi-dimensional case similarity search"""
        results = []
        
        for precedent in precedent_pool:
            similarity_scores = {}
            
            # Compute similarity across all dimensions
            for dimension, methods in self.similarity_methods.items():
                dimension_scores = []
                for method_name, method in methods.items():
                    score = method.compute_similarity(target_case, precedent)
                    dimension_scores.append((method_name, score))
                
                similarity_scores[dimension] = {
                    "scores": dimension_scores,
                    "ensemble": self.ensemble_scores(dimension_scores)
                }
            
            # Compute overall similarity
            overall_similarity = self.compute_overall_similarity(similarity_scores)
            
            if overall_similarity >= similarity_threshold:
                # Find distinguishing factors
                distinctions = {}
                for detector_name, detector in self.distinction_detectors.items():
                    distinctions[detector_name] = detector.detect_distinctions(
                        target_case, precedent
                    )
                
                results.append({
                    "precedent": precedent,
                    "similarity_scores": similarity_scores,
                    "overall_similarity": overall_similarity,
                    "distinguishing_factors": distinctions,
                    "analogy_type": self.classify_analogy_type(
                        target_case, precedent, similarity_scores
                    )
                })
        
        return sorted(results, key=lambda x: x["overall_similarity"], reverse=True)
```

### 2.2 Law-Match Causal Learning Framework

Based on Sun et al. (2022), implement instrumental variable decomposition:

```python
class LawMatchSimilarity:
    def __init__(self):
        self.law_article_encoder = LegalBERT()
        self.case_encoder = CaseEncoder()
        self.causal_decomposer = CausalDecomposer()
    
    def compute_similarity(self, case1, case2):
        """Decompose case embeddings using law articles as instrumental variables"""
        # Extract law articles cited in each case
        law_articles1 = self.extract_law_articles(case1)
        law_articles2 = self.extract_law_articles(case2)
        
        # Encode cases with law context
        encoded1 = self.encode_with_law_context(case1, law_articles1)
        encoded2 = self.encode_with_law_context(case2, law_articles2)
        
        # Decompose into law-related and law-unrelated parts
        decomposed1 = self.causal_decomposer.decompose(encoded1, law_articles1)
        decomposed2 = self.causal_decomposer.decompose(encoded2, law_articles2)
        
        # Compute similarity on decomposed components
        law_related_sim = cosine_similarity(
            decomposed1["law_related"], 
            decomposed2["law_related"]
        )
        law_unrelated_sim = cosine_similarity(
            decomposed1["law_unrelated"], 
            decomposed2["law_unrelated"]
        )
        
        return {
            "law_related_similarity": law_related_sim,
            "law_unrelated_similarity": law_unrelated_sim,
            "overall_similarity": 0.6 * law_related_sim + 0.4 * law_unrelated_sim
        }
```

### 2.3 Attacker Agent's Analogy Detection Module

```python
class AttackerAnalogyModule:
    def undermine_cited_precedent(self, brief, cited_case):
        """Find cases that undermine or distinguish cited precedent"""
        # Step 1: Find analogous cases with different outcomes
        analogous_cases = self.find_analogous_cases_different_outcome(
            cited_case, 
            self.legal_database
        )
        
        undermining_arguments = []
        for analog_case in analogous_cases:
            # Step 2: Identify distinguishing factors
            distinctions = self.identify_distinguishing_factors(cited_case, analog_case)
            
            # Step 3: Generate undermining argument with HalluGraph verification
            argument = self.generate_undermining_argument(
                cited_case, analog_case, distinctions, brief.context
            )
            
            # Step 4: Verify with HalluGraph for faithfulness
            faithfulness = self.hallugraph.verify_faithfulness(argument)
            
            undermining_arguments.append({
                "undermining_case": analog_case,
                "distinctions": distinctions,
                "argument": argument,
                "faithfulness_score": faithfulness["overall_score"],
                "strength_score": self.score_undermining_strength(distinctions)
            })
        
        return sorted(undermining_arguments, key=lambda x: x["strength_score"], reverse=True)
```

## 3. Narrative Coherence Checker Algorithm

### 3.1 Multi-Layer Coherence Analysis

```python
class NarrativeCoherenceChecker:
    def __init__(self):
        self.coherence_dimensions = {
            "temporal_coherence": TemporalCoherenceAnalyzer(),
            "causal_coherence": CausalCoherenceAnalyzer(),
            "thematic_coherence": ThematicCoherenceAnalyzer(),
            "referential_coherence": ReferentialCoherenceAnalyzer(),
            "logical_coherence": LogicalCoherenceAnalyzer()
        }
        
        self.legal_specific_checks = {
            "irac_structure": IRACStructureChecker(),
            "citation_flow": CitationFlowAnalyzer(),
            "precedent_consistency": PrecedentConsistencyChecker(),
            "burden_shifting": BurdenShiftingAnalyzer(),
            "standard_of_review": StandardOfReviewChecker()
        }
    
    def analyze_narrative_coherence(self, legal_brief):
        """Comprehensive narrative coherence analysis"""
        results = {
            "coherence_scores": {},
            "gaps_detected": [],
            "contradictions": [],
            "improvement_recommendations": []
        }
        
        # Analyze each coherence dimension
        for dimension_name, analyzer in self.coherence_dimensions.items():
            dimension_result = analyzer.analyze(legal_brief)
            results["coherence_scores"][dimension_name] = dimension_result["score"]
            results["gaps_detected"].extend(dimension_result.get("gaps", []))
            results["contradictions"].extend(dimension_result.get("contradictions", []))
        
        # Apply legal-specific checks
        for check_name, checker in self.legal_specific_checks.items():
            check_result = checker.check(legal_brief)
            if not check_result["passed"]:
                results["improvement_recommendations"].extend(
                    check_result.get("recommendations", [])
                )
        
        # Compute overall coherence score
        results["overall_coherence"] = self.compute_overall_coherence(
            results["coherence_scores"]
        )
        
        # Generate narrative flow visualization
        results["narrative_flow"] = self.generate_narrative_flow(legal_brief)
        
        return results
    
    def detect_logical_gaps(self, argument_chain):
        """Detect logical gaps in argument chains using RST and Centering Theory"""
        gaps = []
        
        # Rhetorical Structure Theory analysis
        rst_analysis = self.rst_analyzer.analyze(argument_chain)
        for relation in rst_analysis["missing_relations"]:
            gaps.append({
                "type": "rhetorical_gap",
                "location": relation["location"],
                "missing_relation": relation["relation_type"],
                "severity": relation["severity"]
            })
        
        # Centering Theory analysis for entity tracking
        centering_analysis = self.centering_analyzer.analyze(argument_chain)
        for entity_tracking_issue in centering_analysis["tracking_issues"]:
            gaps.append({
                "type": "entity_tracking_gap",
                "entity": entity_tracking_issue["entity"],
                "location": entity_tracking_issue["location"],
                "issue": entity_tracking_issue["issue_type"]
            })
        
        # Non-sequitur detection
        non_sequiturs = self.logic_analyzer.detect_non_sequiturs(argument_chain)
        gaps.extend(non_sequiturs)
        
        return gaps
```

### 3.2 Story-Based Reasoning Integration

```python
class StoryBasedReasoningAnalyzer:
    def __init__(self):
        self.story_models = {
            "plaintiff_narrative": NarrativeModel(),
            "defendant_narrative": NarrativeModel(),
            "alternative_narratives": []
        }
        
        self.plausibility_metrics = {
            "factual_support": FactualSupportMetric(),
            "legal_alignment": LegalAlignmentMetric(),
            "temporal_consistency": TemporalConsistencyMetric(),
            "character_motivation": CharacterMotivationMetric()
        }
    
    def analyze_narrative_quality(self, legal_brief):
        """Analyze narrative persuasiveness and completeness"""
        # Extract narrative elements
        narrative_elements = self.extract_narrative_elements(legal_brief)
        
        # Build competing narratives
        primary_narrative = self.build_narrative(narrative_elements["primary"])
        alternative_narratives = self.generate_alternative_narratives(narrative_elements)
        
        # Evaluate narrative plausibility
        plausibility_scores = {}
        for metric_name, metric in self.plausibility_metrics.items():
            plausibility_scores[metric_name] = metric.evaluate(
                primary_narrative, legal_brief
            )
        
        # Identify narrative weaknesses
        weaknesses = self.identify_narrative_weaknesses(
            primary_narrative, alternative_narratives
        )
        
        return {
            "primary_narrative": primary_narrative,
            "alternative_narratives": alternative_narratives,
            "plausibility_scores": plausibility_scores,
            "narrative_weaknesses": weaknesses,
            "persuasion_effectiveness": self.calculate_persuasion_score(plausibility_scores)
        }
```

## 4. Precedent Network Analysis System

### 4.1 Citation Chain Strength Evaluation

```python
class PrecedentNetworkAnalyzer:
    def __init__(self):
        self.strength_metrics = {
            "citation_frequency": CitationFrequencyMetric(),
            "recency_weight": RecencyWeightMetric(),
            "jurisdiction_authority": JurisdictionAuthorityMetric(),
            "treatment_analysis": TreatmentAnalysisMetric(),
            "doctrinal_support": DoctrinalSupportMetric()
        }
        
        self.network_analyzers = {
            "citation_network": CitationNetworkAnalyzer(),
            "doctrine_network": DoctrineNetworkAnalyzer(),
            "jurisdiction_network": JurisdictionNetworkAnalyzer()
        }
    
    def evaluate_citation_chain(self, citation_chain, target_date, jurisdiction):
        """Evaluate strength of precedent citation chain"""
        chain_strength = 1.0
        chain_weaknesses = []
        
        for i, citation in enumerate(citation_chain):
            # Evaluate individual citation strength
            citation_strength = self.evaluate_single_citation(
                citation, target_date, jurisdiction
            )
            
            # Apply chain-specific adjustments
            if i > 0:  # Not the original precedent
                # Check for intermediate weakening
                chain_relation = self.analyze_chain_relation(
                    citation_chain[i-1],