Based on the comprehensive research synthesis from all teammates, I'll now produce a detailed, implementable architecture document for the Adversarial Brief Stress-Tester. This document synthesizes findings from argumentation frameworks, legal NLP, multi-agent debate, counter-argument generation, argument strength prediction, explainable reasoning, knowledge-grounded generation, and all other research areas covered.

# Adversarial Brief Stress-Tester: Complete Architecture Document

## Executive Summary

The Adversarial Brief Stress-Tester is a multi-agent legal AI system that performs symmetric adversarial analysis on legal briefs before filing. It extends the existing BS Detector app by adding three specialized AI agents (Attacker, Defender, Judge) that stress-test legal arguments through formal argumentation frameworks, ensuring EU AI Act compliance (August 2026), citation grounding, hallucination detection, and structured argument graph outputs.

## 1. System Architecture Overview

### 1.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Adversarial Brief Stress-Tester                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  Input Layer                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Legal Brief Ingestion & Preprocessing                              │   │
│  │  • Document parsing (PDF/DOCX)                                      │   │
│  │  • Citation extraction & validation                                 │   │
│  │  • Argument structure analysis (IRAC detection)                     │   │
│  │  • Temporal legal context establishment                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                        │
│  Core Processing Layer                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Multi-Agent Coordination Framework                                 │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │   │
│  │  │  Attacker   │  │  Defender   │  │    Judge    │                │   │
│  │  │   Agent     │◄─┤   Agent     │◄─┤    Agent    │                │   │
│  │  │             │  │             │  │             │                │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                │   │
│  │         │                 │                 │                      │   │
│  │         └─────────────────┼─────────────────┘                      │   │
│  │                           │                                        │   │
│  │         ┌─────────────────┼─────────────────┐                      │   │
│  │         ▼                 ▼                 ▼                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │   │
│  │  │  Temporal   │  │  Knowledge  │  │  Uncertainty│                │   │
│  │  │  Legal KG   │  │  Grounding  │  │  Engine     │                │   │
│  │  │             │  │   Module    │  │             │                │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                        │
│  Output Layer                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Structured Output Generation                                       │   │
│  │  • Argument graphs (Dung AFs/ASPIC+/BAFs)                          │   │
│  │  • Vulnerability reports with confidence scores                     │   │
│  │  • Strengthening recommendations                                    │   │
│  │  • EU AI Act compliance documentation                              │   │
│  │  • Hallucination detection flags                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Agent Specifications

#### **Attacker Agent**
**Primary Function**: Identify weaknesses and generate counter-arguments
**Capabilities**:
- Vulnerability detection across logical, factual, and legal dimensions
- Multi-type attack generation (undermine, undercut, rebut)
- Citation-based attacks using conflicting precedents
- Temporal attacks on outdated authorities
- Jurisdictional attacks on inapplicable case law
- Strength-controlled counter-argument generation

**Technical Implementation**:
```python
class AttackerAgent:
    def __init__(self):
        self.weakness_detector = WeaknessDetector()
        self.counter_argument_generator = CounterArgumentGenerator()
        self.precedent_finder = PrecedentFinder()
        self.citation_validator = CitationValidator()
        self.strategy_optimizer = RLStrategyOptimizer()
    
    def attack_brief(self, brief: LegalBrief) -> AttackReport:
        weaknesses = self.detect_weaknesses(brief)
        counter_arguments = self.generate_counter_arguments(brief, weaknesses)
        attacks = self.generate_attacks(counter_arguments)
        return AttackReport(weaknesses, counter_arguments, attacks)
```

#### **Defender Agent**
**Primary Function**: Strengthen brief against identified attacks
**Capabilities**:
- Preemptive strengthening of weak points
- Rebuttal generation for potential counter-arguments
- Additional authority retrieval and citation
- Argument restructuring for robustness
- Alternative legal theory development
- Style adaptation for specific judges/courts

**Technical Implementation**:
```python
class DefenderAgent:
    def __init__(self):
        self.argument_strengthener = ArgumentStrengthener()
        self.evidence_adder = EvidenceAdder()
        self.rebuttal_generator = RebuttalGenerator()
        self.style_adapter = StyleAdapter()
        self.citation_enhancer = CitationEnhancer()
    
    def defend_brief(self, brief: LegalBrief, attacks: List[Attack]) -> DefenseReport:
        strengthened_brief = self.strengthen_arguments(brief, attacks)
        rebuttals = self.generate_rebuttals(attacks)
        enhanced_brief = self.add_supporting_evidence(strengthened_brief)
        return DefenseReport(enhanced_brief, rebuttals)
```

#### **Judge Agent**
**Primary Function**: Score argument strength with explainable reasoning
**Capabilities**:
- Multi-dimensional scoring (logical, legal, structural, persuasive)
- Formal argumentation framework application (Dung AFs, ASPIC+)
- Bayesian belief updating during debates
- Uncertainty quantification and confidence scoring
- Explainable assessment generation
- Hallucination detection and flagging

**Technical Implementation**:
```python
class JudgeAgent:
    def __init__(self):
        self.strength_scorer = ArgumentStrengthScorer()
        self.explainability_module = ExplainabilityGenerator()
        self.citation_verifier = CitationVerifier()
        self.uncertainty_quantifier = UncertaintyQuantifier()
        self.bayesian_updater = BayesianUpdater()
    
    def evaluate_arguments(self, arguments: List[Argument]) -> EvaluationReport:
        scores = self.score_arguments(arguments)
        explanations = self.generate_explanations(scores)
        confidence_intervals = self.quantify_uncertainty(scores)
        return EvaluationReport(scores, explanations, confidence_intervals)
```

## 2. Argument Graph Data Model

### 2.1 Core Node Types

```typescript
interface ArgumentNode {
  id: string;
  type: NodeType; // 'claim' | 'evidence' | 'rule' | 'authority' | 'premise' | 'conclusion'
  text: string;
  metadata: {
    strength: number; // 0-1
    confidence: number; // 0-1 with uncertainty
    citations: Citation[];
    temporal_validity: TemporalRange;
    jurisdiction: Jurisdiction;
    source: 'original' | 'attacker' | 'defender';
    creation_round: number;
  };
  embeddings: {
    semantic: number[];
    legal: number[];
    temporal: number[];
  };
}

interface Citation {
  id: string;
  type: 'case' | 'statute' | 'regulation' | 'secondary';
  reference: string;
  verified: boolean;
  verification_source: string;
  relevance_score: number;
  authority_weight: number;
  temporal_validity: TemporalRange;
  holding_summary: string;
}

interface TemporalRange {
  start_date: Date;
  end_date: Date | null; // null for current
  effective_at_case_date: boolean;
}
```

### 2.2 Edge Types and Relations

```typescript
interface ArgumentEdge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  relation: EdgeRelation;
  strength: number; // 0-1
  metadata: {
    attack_type?: 'undermine' | 'undercut' | 'rebut';
    support_type?: 'evidential' | 'inferential' | 'authoritative';
    temporal_constraint?: TemporalConstraint;
    jurisdiction_constraint?: JurisdictionConstraint;
    created_by: 'attacker' | 'defender' | 'judge';
    creation_round: number;
  };
}

type EdgeRelation = 
  | 'supports'        // Positive support
  | 'attacks'         // Direct contradiction
  | 'undermines'      // Attacks premises
  | 'undercuts'       // Attacks inference
  | 'distinguishes'   // Factual distinction
  | 'overrules'       // Supersedes authority
  | 'interprets'      // Statutory interpretation
  | 'applies'         // Rule application
  | 'analogizes'      // Analogical reasoning
  | 'cites';          // Citation reference
```

### 2.3 Graph Semantics and Extensions

```typescript
interface ArgumentGraph {
  nodes: ArgumentNode[];
  edges: ArgumentEdge[];
  semantics: {
    // Dung Abstract Argumentation Framework extensions
    extensions: {
      grounded: string[];      // Node IDs in grounded extension
      preferred: string[][];   // Multiple preferred extensions
      stable: string[][];      // Stable extensions
    };
    // Quantitative Bipolar Argumentation Framework
    qbaf_scores: Map<string, number>;
    // Temporal extensions
    temporal_validity: Map<string, TemporalRange>;
    // Jurisdictional constraints
    jurisdiction_map: Map<string, Jurisdiction[]>;
  };
  metadata: {
    created_at: Date;
    updated_at: Date;
    debate_rounds: number;
    convergence_status: 'converged' | 'diverging' | 'stable';
    overall_strength: number;
    top_vulnerabilities: Vulnerability[];
  };
}

interface Vulnerability {
  node_id: string;
  type: 'logical' | 'factual' | 'legal' | 'procedural' | 'citation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggested_fix: string;
  confidence: number;
}
```

## 3. Pipeline Flow

### 3.1 Complete Processing Pipeline

```
1. BRIEF INGESTION & PREPROCESSING
   └─ Input: Legal brief (PDF/DOCX)
   └─ Processing:
       1.1 Document parsing and segmentation
       1.2 Citation extraction and validation
       1.3 IRAC structure detection
       1.4 Temporal context establishment
       1.5 Jurisdiction identification
   └─ Output: Structured legal document with verified citations

2. ARGUMENT EXTRACTION & REPRESENTATION
   └─ Input: Structured legal document
   └─ Processing:
       2.1 Claim extraction using Legal-BERT
       2.2 Evidence identification and linking
       2.3 Rule extraction from statutes/cases
       2.4 Premise-conclusion structure mapping
       2.5 Initial argument graph construction
   └─ Output: Initial argument graph (Dung AF representation)

3. ADVERSARIAL ROUNDS (Iterative)
   └─ Round 1: Initial Attack
       3.1.1 Attacker: Identify top vulnerabilities
       3.1.2 Attacker: Generate counter-arguments
       3.1.3 Judge: Score initial arguments
   
   └─ Round 2: Defense & Strengthening
       3.2.1 Defender: Address identified vulnerabilities
       3.2.2 Defender: Add supporting evidence
       3.2.3 Judge: Score strengthened arguments
   
   └─ Round 3: Counter-Response
       3.3.1 Attacker: Respond to strengthened arguments
       3.3.2 Attacker: Find new weaknesses
       3.3.3 Judge: Score counter-responses
   
   └─ Round N: Until convergence (max 5 rounds)
       3.N.1 Multi-agent coordination
       3.N.2 Bayesian belief updating
       3.N.3 Strategy adaptation
       3.N.4 Convergence checking

4. SCORING & EVALUATION
   └─ Input: Final argument graph after N rounds
   └─ Processing:
       4.1 Multi-dimensional scoring (logical, legal, structural, persuasive)
       4.2 Formal semantics application (grounded/preferred extensions)
       4.3 Uncertainty quantification
       4.4 Hallucination detection and flagging
       4.5 Citation reliability assessment
   └─ Output: Comprehensive evaluation scores with confidence intervals

5. REPORT GENERATION
   └─ Input: Evaluation results + argument graph
   └─ Processing:
       5.1 Structured argument graph visualization
       5.2 Vulnerability report generation
       5.3 Strengthening recommendations
       5.4 EU AI Act compliance documentation
       5.5 Hallucination detection report
   └─ Output: Comprehensive stress-test report
```

### 3.2 Real-Time Adaptation Flow

```
Dynamic Adaptation Loop:
   Current State → Strategy Evaluation → Bayesian Update → 
   Reinforcement Learning → Strategy Adjustment → Next Action
   
Key Adaptation Mechanisms:
   1. Opponent Response Pattern Recognition
   2. Judge Feedback Integration
   3. Citation Effectiveness Tracking
   4. Logical Vulnerability Dynamic Detection
   5. Game-Theoretic Strategy Optimization
```

## 4. API Design

### 4.1 Core System API

```python
# Main System Interface
class AdversarialBriefStressTester:
    def __init__(self, config: SystemConfig):
        self.attacker = AttackerAgent(config.attacker_config)
        self.defender = DefenderAgent(config.defender_config)
        self.judge = JudgeAgent(config.judge_config)
        self.knowledge_base = LegalKnowledgeBase(config.kb_config)
        self.uncertainty_engine = UncertaintyEngine(config.uncertainty_config)
    
    async def stress_test(
        self,
        brief: LegalBrief,
        params: StressTestParams
    ) -> StressTestReport:
        """Main entry point for stress testing a legal brief"""
        # Pipeline execution
        processed_brief = await self.preprocess_brief(brief)
        initial_graph = await self.extract_arguments(processed_brief)
        
        # Adversarial rounds
        for round_num in range(params.max_rounds):
            attack_report = await self.attacker.attack(initial_graph, round_num)
            defense_report = await self.defender.defend(initial_graph, attack_report)
            evaluation = await self.judge.evaluate(
                initial_graph, attack_report, defense_report
            )
            
            # Update graph and check convergence
            updated_graph = self.update_argument_graph(
                initial_graph, attack_report, defense_report
            )
            
            if self.check_convergence(updated_graph, evaluation):
                break
        
        # Generate final report
        final_report = await self.generate_report(
            updated_graph, evaluation, params
        )
        return final_report
    
    async def streaming_stress_test(
        self,
        brief: LegalBrief,
        callback: Callable[[StreamingUpdate], None]
    ) -> StressTestReport:
        """Real-time streaming version with progress updates"""
        # Implementation for interactive use
        pass
```

### 4.2 Attacker Agent API

```python
class AttackerAgentAPI:
    @abstractmethod
    async def find_weaknesses(
        self,
        argument_graph: ArgumentGraph,
        context: AttackContext
    ) -> List[Weakness]:
        """Identify vulnerabilities in arguments"""
        pass
    
    @abstractmethod
    async def generate_counter_arguments(
        self,
        argument_graph: ArgumentGraph,
        weaknesses: List[Weakness],
        strategy: AttackStrategy
    ) -> List[CounterArgument]:
        """Generate counter-arguments targeting weaknesses"""
        pass
    
    @abstractmethod
    async def generate_attacks(
        self,
        counter_arguments: List[CounterArgument],
        attack_types: List[AttackType]
    ) -> List[Attack]:
        """Formalize counter-arguments as attacks in argumentation framework"""
        pass
    
    @abstractmethod
    async def adapt_strategy(
        self,
        previous_round: AttackRound,
        judge_feedback: JudgeFeedback,
        opponent_response: DefenseResponse
    ) -> AttackStrategy:
        """Adapt attack strategy based on debate progress"""
        pass
```

### 4.3 Defender Agent API

```python
class DefenderAgentAPI:
    @abstractmethod
    async def strengthen_arguments(
        self,
        argument_graph: ArgumentGraph,
        attacks: List[Attack],
        strategy: DefenseStrategy
    ) -> ArgumentGraph:
        """Strengthen arguments against identified attacks"""
        pass
    
    @abstractmethod
    async def generate_rebuttals(
        self,
        attacks: List[Attack],
        context: DefenseContext
    ) -> List[Rebuttal]:
        """Generate rebuttals to counter-arguments"""
        pass
    
    @abstractmethod
    async def add_supporting_evidence(
        self,
        argument_graph: ArgumentGraph,
        evidence_sources: List[EvidenceSource]
    ) -> ArgumentGraph:
        """Add additional supporting evidence to arguments"""
        pass
    
    @abstractmethod
    async def adapt_style(
        self,
        argument_graph: ArgumentGraph,
        target_judge: JudgeProfile,
        court_rules: CourtRules
    ) -> ArgumentGraph:
        """Adapt argument style for specific judge/court"""
        pass
```

### 4.4 Judge Agent API

```python
class JudgeAgentAPI:
    @abstractmethod
    async def score_arguments(
        self,
        arguments: List[Argument],
        scoring_rubric: ScoringRubric
    ) -> Dict[str, ArgumentScore]:
        """Score arguments using multi-dimensional rubric"""
        pass
    
    @abstractmethod
    async