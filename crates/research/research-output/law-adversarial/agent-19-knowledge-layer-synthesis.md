Let me proceed with the knowledge layer design based on the comprehensive findings already provided.

# Knowledge Layer Design Document: Adversarial Brief Stress-Tester

## Executive Summary

This document outlines the knowledge layer architecture for an Adversarial Brief Stress-Tester—a multi-agent legal AI system where AI agents take opposing sides (attacker/defender/judge) to stress-test legal briefs before filing. The system extends the existing BS Detector app by adding symmetric adversarial argument analysis with explainable outputs, citation grounding, hallucination detection, and structured argument graphs.

## 1. Legal Knowledge Graph Schema

### 1.1 Core Entity Types

#### **Temporal Entities with Validity Windows**
```yaml
Case:
  - id: UUID
  - citation: String (standard legal format)
  - court: Enum (Supreme, Appellate, District, State)
  - jurisdiction: String (e.g., "9th Circuit", "NY")
  - decision_date: Date
  - holding: Text
  - facts: List[Fact]
  - reasoning: Text
  - status: Enum (Active, Overruled, Distinguished, Modified)
  - valid_from: Date (decision_date)
  - valid_to: Date (overruling_date or null)
  - precedential_weight: Float (0-1)

Statute:
  - id: UUID
  - citation: String (e.g., "42 U.S.C. §1983")
  - title: String
  - text: Text
  - enactment_date: Date
  - amendments: List[Amendment]
  - current_version: Version
  - valid_from: Date
  - valid_to: Date (sunset_date or null)

LegalPrinciple:
  - id: UUID
  - name: String (e.g., "Strict Scrutiny")
  - description: Text
  - doctrinal_area: Enum (Constitutional, Contract, Tort, etc.)
  - evolution_timeline: List[TimelineEntry]
  - supporting_cases: List[Case]
  - conflicting_principles: List[LegalPrinciple]

ArgumentComponent:
  - id: UUID
  - type: Enum (Claim, Premise, Evidence, Warrant, Backing, Rebuttal)
  - text: Text
  - strength: Float (0-1)
  - confidence: Float (0-1)
  - citations: List[Citation]
  - temporal_context: DateRange
```

### 1.2 Temporal Relations

#### **Version-Aware Relationships**
```yaml
overrules:
  - source: Case
  - target: Case
  - date: Date (overruling_date)
  - explicit: Boolean
  - partial: Boolean (if only partially overruled)

amends:
  - source: StatuteVersion
  - target: StatuteVersion
  - effective_date: Date
  - scope: Enum (Minor, Major, Complete)

interprets:
  - source: Case
  - target: Statute
  - interpretation_date: Date
  - interpretation_type: Enum (Textualist, Purposive, etc.)

distinguishes:
  - source: Case
  - target: Case
  - distinguishing_factors: List[String]
  - date: Date

extends:
  - source: Case
  - target: LegalPrinciple
  - extension_date: Date
  - scope: Enum (Narrow, Broad)
```

### 1.3 Temporal Properties Schema

#### **Time-Stamped Triples**
```json
{
  "subject": "Case:123",
  "predicate": "establishes_principle",
  "object": "Principle:456",
  "validity": {
    "start": "1995-03-22",
    "end": "2010-06-28",
    "certainty": 0.95
  },
  "metadata": {
    "jurisdiction": "US_Federal",
    "court_level": "Supreme",
    "citation_count": 1250
  }
}
```

#### **Version Chains**
```yaml
StatuteEvolution:
  original: Statute_v1 (1990-01-01 to 1995-12-31)
  amendment_1: Statute_v2 (1996-01-01 to 2005-12-31)
  amendment_2: Statute_v3 (2006-01-01 to present)
  
PrecedentChain:
  foundational: Case_A (1980)
  extension: Case_B (1990)
  limitation: Case_C (2000)
  overruling: Case_D (2010)
```

## 2. Case Similarity Engine Design

### 2.1 Multi-Dimensional Similarity Framework

#### **Fact-Pattern Similarity**
```python
class FactPatternSimilarity:
    def compute_similarity(self, case1, case2):
        # Extract legally significant facts
        facts1 = self.extract_legal_facts(case1)
        facts2 = self.extract_legal_facts(case2)
        
        # Multi-factor similarity
        similarity = (
            0.4 * self.entity_alignment(facts1.entities, facts2.entities) +
            0.3 * self.relation_similarity(facts1.relations, facts2.relations) +
            0.2 * self.temporal_alignment(facts1.timeline, facts2.timeline) +
            0.1 * self.jurisdictional_proximity(case1.court, case2.court)
        )
        
        return similarity
```

#### **Legal Issue Similarity**
```python
class IssueSimilarityEngine:
    def __init__(self):
        self.issue_taxonomy = self.load_legal_taxonomy()
        self.embedding_model = LegalBERT()
        
    def compute_issue_similarity(self, brief_issues, case_issues):
        # Hierarchical issue matching
        similarity = 0.0
        
        for b_issue in brief_issues:
            best_match = 0.0
            for c_issue in case_issues:
                # Taxonomic distance
                tax_distance = self.issue_taxonomy.distance(b_issue, c_issue)
                
                # Semantic similarity
                sem_similarity = cosine_similarity(
                    self.embedding_model.encode(b_issue),
                    self.embedding_model.encode(c_issue)
                )
                
                # Combined score
                match_score = 0.6 * (1 - tax_distance) + 0.4 * sem_similarity
                best_match = max(best_match, match_score)
            
            similarity += best_match
        
        return similarity / len(brief_issues)
```

### 2.2 Analogical Reasoning Engine

#### **Analogy Detection Pipeline**
```python
class LegalAnalogyDetector:
    def find_analogous_cases(self, target_case, strategy="attacker"):
        # Different strategies for attacker vs defender
        if strategy == "attacker":
            return self.find_distinguishing_cases(target_case)
        elif strategy == "defender":
            return self.find_supporting_cases(target_case)
        
    def find_distinguishing_cases(self, target_case):
        # Find cases with similar facts but different outcomes
        similar_cases = self.similarity_engine.find_similar(
            target_case, threshold=0.7
        )
        
        distinguishing_cases = []
        for case in similar_cases:
            if self.has_different_outcome(target_case, case):
                # Extract distinguishing factors
                factors = self.extract_distinguishing_factors(
                    target_case, case
                )
                distinguishing_cases.append({
                    "case": case,
                    "distinguishing_factors": factors,
                    "attack_strength": self.compute_attack_strength(factors)
                })
        
        return sorted(distinguishing_cases, 
                     key=lambda x: x["attack_strength"], 
                     reverse=True)
```

#### **Cross-Jurisdictional Analogy**
```python
class CrossJurisdictionalAnalogy:
    def __init__(self):
        self.jurisdiction_mapper = JurisdictionMapper()
        self.principle_extractor = LegalPrincipleExtractor()
        
    def find_analogies(self, source_case, target_jurisdiction):
        # Extract core legal principles
        principles = self.principle_extractor.extract(source_case)
        
        # Map principles to target jurisdiction
        mapped_principles = self.jurisdiction_mapper.map_principles(
            principles, target_jurisdiction
        )
        
        # Find cases in target jurisdiction applying similar principles
        analogous_cases = []
        for principle in mapped_principles:
            cases = self.find_cases_by_principle(
                principle, target_jurisdiction
            )
            analogous_cases.extend(cases)
        
        return self.rank_by_relevance(analogous_cases, source_case)
```

## 3. Narrative Coherence Checker

### 3.1 Coherence Detection Algorithm

#### **Logical Flow Analysis**
```python
class NarrativeCoherenceChecker:
    def analyze_coherence(self, legal_brief):
        # Extract argument structure
        arguments = self.extract_arguments(brief)
        
        # Build argument graph
        graph = self.build_argument_graph(arguments)
        
        # Detect coherence issues
        issues = []
        
        # 1. Logical gaps
        issues.extend(self.detect_logical_gaps(graph))
        
        # 2. Contradictions
        issues.extend(self.detect_contradictions(graph))
        
        # 3. Temporal inconsistencies
        issues.extend(self.detect_temporal_inconsistencies(graph))
        
        # 4. Citation misalignment
        issues.extend(self.detect_citation_misalignment(graph))
        
        # 5. Narrative flow problems
        issues.extend(self.analyze_narrative_flow(graph))
        
        return {
            "coherence_score": self.compute_overall_coherence(issues),
            "issues": issues,
            "recommendations": self.generate_recommendations(issues)
        }
    
    def detect_logical_gaps(self, argument_graph):
        gaps = []
        
        # Find claims without sufficient support
        for node in argument_graph.nodes:
            if node.type == "claim":
                supporting_nodes = argument_graph.get_supporting_nodes(node)
                if len(supporting_nodes) < self.min_support_threshold:
                    gaps.append({
                        "type": "insufficient_support",
                        "claim": node.text,
                        "missing_support": self.identify_missing_support(node)
                    })
        
        # Find missing inference steps
        for edge in argument_graph.edges:
            if edge.relation == "infers" and edge.strength < 0.3:
                gaps.append({
                    "type": "weak_inference",
                    "from": edge.source.text,
                    "to": edge.target.text,
                    "strength": edge.strength,
                    "suggestion": "Add intermediate reasoning step"
                })
        
        return gaps
```

#### **Temporal Consistency Checker**
```python
class TemporalConsistencyChecker:
    def check_temporal_consistency(self, argument_graph):
        inconsistencies = []
        
        # Check citation timelines
        for node in argument_graph.nodes:
            if hasattr(node, 'citations'):
                for citation in node.citations:
                    # Verify citation is valid at argument time
                    if not self.is_citation_valid_at_time(
                        citation, node.temporal_context
                    ):
                        inconsistencies.append({
                            "type": "temporal_citation_mismatch",
                            "citation": citation,
                            "argument_time": node.temporal_context,
                            "citation_validity": self.get_citation_validity(citation)
                        })
        
        # Check narrative timeline consistency
        timeline = self.extract_narrative_timeline(argument_graph)
        inconsistencies.extend(self.find_timeline_conflicts(timeline))
        
        return inconsistencies
```

### 3.2 IRAC Structure Compliance

#### **IRAC Pattern Detection**
```python
class IRACComplianceChecker:
    IRAC_PATTERNS = {
        "issue": ["whether", "issue", "question"],
        "rule": ["rule", "statute", "precedent", "principle"],
        "application": ["applies", "because", "therefore", "thus"],
        "conclusion": ["therefore", "accordingly", "conclude"]
    }
    
    def check_irac_structure(self, section_text):
        # Detect IRAC components
        components = self.extract_irac_components(section_text)
        
        # Check completeness
        missing = []
        for component in ["issue", "rule", "application", "conclusion"]:
            if component not in components:
                missing.append(component)
        
        # Check ordering
        ordering_score = self.evaluate_ordering(components)
        
        # Check coherence between components
        coherence_score = self.evaluate_coherence(components)
        
        return {
            "completeness": len(missing) == 0,
            "missing_components": missing,
            "ordering_score": ordering_score,
            "coherence_score": coherence_score,
            "suggestions": self.generate_irac_suggestions(components, missing)
        }
```

## 4. Precedent Network Analysis

### 4.1 Citation Chain Strength Evaluation

#### **Multi-Factor Strength Scoring**
```python
class PrecedentStrengthAnalyzer:
    def evaluate_citation_chain(self, citation_chain):
        strength_scores = []
        
        for citation in citation_chain:
            # Individual citation strength
            citation_strength = self.compute_citation_strength(citation)
            
            # Chain continuity strength
            if len(strength_scores) > 0:
                continuity = self.evaluate_continuity(
                    citation_chain[i-1], citation
                )
                citation_strength *= continuity
            
            strength_scores.append(citation_strength)
        
        # Overall chain strength (weakest link principle)
        chain_strength = min(strength_scores) if strength_scores else 0
        
        # Temporal decay adjustment
        temporal_decay = self.compute_temporal_decay(citation_chain)
        chain_strength *= temporal_decay
        
        # Jurisdictional alignment
        jurisdictional_alignment = self.evaluate_jurisdictional_alignment(
            citation_chain
        )
        chain_strength *= jurisdictional_alignment
        
        return {
            "overall_strength": chain_strength,
            "weakest_link": self.identify_weakest_link(strength_scores),
            "temporal_health": temporal_decay,
            "jurisdictional_fit": jurisdictional_alignment,
            "suggestions": self.generate_strengthening_suggestions(
                citation_chain, strength_scores
            )
        }
    
    def compute_citation_strength(self, citation):
        factors = {
            "authority_weight": self.get_authority_weight(citation.court),
            "recency_factor": self.get_recency_factor(citation.date),
            "citation_count": self.get_normalized_citation_count(citation),
            "treatment_status": self.get_treatment_score(citation),
            "directness": self.evaluate_direct_relevance(citation)
        }
        
        # Weighted combination
        weights = {
            "authority_weight": 0.3,
            "recency_factor": 0.25,
            "citation_count": 0.2,
            "treatment_status": 0.15,
            "directness": 0.1
        }
        
        strength = sum(factors[k] * weights[k] for k in factors)
        return strength
```

#### **Attack Vector Identification**
```python
class PrecedentAttackAnalyzer:
    def identify_attack_vectors(self, citation_chain):
        attack_vectors = []
        
        for i, citation in enumerate(citation_chain):
            # Check for overruled precedents
            if self.is_overruled(citation):
                attack_vectors.append({
                    "type": "overruled_precedent",
                    "citation": citation,
                    "overruling_case": self.get_overruling_case(citation),
                    "severity": "high",
                    "attack_strength": 0.9
                })
            
            # Check for distinguishing factors
            distinguishing_cases = self.find_distinguishing_cases(citation)
            if distinguishing_cases:
                attack_vectors.append({
                    "type": "distinguishable_precedent",
                    "citation": citation,
                    "distinguishing_cases": distinguishing_cases,
                    "severity": "medium",
                    "attack_strength": 0.7
                })
            
            # Check for conflicting authority
            conflicting_cases = self.find_conflicting_authority(citation)
            if conflicting_cases:
                attack_vectors.append({
                    "type": "conflicting_authority",
                    "citation": citation,
                    "conflicting_cases": conflicting_cases,
                    "severity": "medium",
                    "attack_strength": 0.6
                })
            
            # Check for weak analogical reasoning
            if i > 0:
                analogy_strength = self.evaluate_analogical_strength(
                    citation_chain[i-1], citation
                )
                if analogy_strength < 0.4:
                    attack_vectors.append({
                        "type": "weak_analogy",
                        "from_citation": citation_chain[i-1],
                        "to_citation": citation,
                        "analogy_strength": analogy_strength,
                        "severity": "low",
                        "attack_strength": 0.5
                    })
        
        return sorted(attack_vectors, 
                     key=lambda x: x["attack_strength"], 
                     reverse=True)
```

### 4.2 Shepardizing Automation

#### **Automated Treatment Analysis**
```python
class AutomatedShepardizer:
    def analyze_precedent_treatment(self, target_case):
        treatments = {
            "followed": [],
            "distinguished": [],
            "criticized": [],
            "overruled": [],
            "limited": []
        }
        
        # Find subsequent cases citing target
        subsequent_cases = self.find_subsequent_citations(target_case)
        
        for case in subsequent_cases:
            # Analyze treatment type
            treatment_type = self.classify_treatment(target_case, case)
            
            if treatment_type:
                treatments[treatment_type].append({
                    "case": case,
                    "reasoning": self.extract_treatment_reasoning(case),
                    "strength": self.evaluate_treatment_strength(case)
                })
        
        # Compute overall status
        status = self.determine_overall_status(treatments)
        
        return {
            "current_status": status,
            "treatments": treatments,
            "confidence": self.compute_confidence_score(treatments),
            "recommendation": self.generate_citation_recommendation(status)
        }
```

## 5. Integration with Argument Graph Architecture

### 5.1 Structured Argument Graph Schema

#### **Argument Graph Representation**
```json
{
  "argument_graph": {
    "metadata": {
      "brief_id": "uuid",
