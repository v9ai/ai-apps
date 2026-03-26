Now I have enough research to create a comprehensive upgrade blueprint. Let me compile the findings and create the upgrade specifications.

# UPGRADE BLUEPRINT: Scrapus Pipeline Advanced RAG Architecture

## Executive Summary

Based on deep research of 2024-2026 literature, this blueprint proposes five architectural upgrades to transform Scrapus from a basic RAG system to a state-of-the-art, fully local B2B lead generation platform. The upgrades address limitations identified in prior findings and incorporate cutting-edge techniques from recent research.

## 1. Self-RAG: Retrieval-Augmented Generation with Self-Reflection

### Research Foundation
**Asai et al. (2023)** [Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection](http://arxiv.org/abs/2310.11511) introduces a framework where LLMs learn to retrieve, generate, and critique through self-reflection tokens. This addresses the limitation of indiscriminate retrieval in traditional RAG systems.

**Gupta et al. (2024)** [A Comprehensive Survey of Retrieval-Augmented Generation (RAG): Evolution, Current Landscape and Future Directions](http://arxiv.org/abs/2410.12837) categorizes Self-RAG as part of the "Advanced RAG" paradigm that moves beyond static retrieval pipelines.

### Implementation Blueprint

```python
class SelfRAGPipeline:
    def __init__(self, llm, retriever, critique_model):
        self.llm = llm
        self.retriever = retriever
        self.critique_model = critique_model
        self.reflection_tokens = {
            "retrieve": "[RETRIEVE]",
            "generate": "[GENERATE]", 
            "critique": "[CRITIQUE]",
            "continue": "[CONTINUE]",
            "support": "[SUPPORT]",
            "contradict": "[CONTRADICT]"
        }
    
    def generate_with_reflection(self, query: str, company_data: dict) -> dict:
        """Self-RAG pipeline with reflection tokens"""
        
        # Step 1: Decide if retrieval is needed
        reflection_prompt = f"""
        Analyze if retrieval is needed for this B2B lead analysis query.
        Query: {query}
        Available SQLite facts: {len(company_data['facts'])}
        
        Output format: [RETRIEVE] or [GENERATE]
        Reasoning: <brief explanation>
        """
        
        decision = self.llm.generate(reflection_prompt)
        
        retrieved_docs = []
        if "[RETRIEVE]" in decision:
            # Adaptive retrieval based on query complexity
            retrieved_docs = self.adaptive_retrieval(query, company_data)
        
        # Step 2: Generate with self-critique
        generation_prompt = self.build_selfrag_prompt(query, company_data, retrieved_docs)
        
        # Generate with reflection tokens interleaved
        response = ""
        for chunk in self.llm.stream_generate(generation_prompt):
            response += chunk
            
            # Check for critique tokens
            if any(token in chunk for token in self.reflection_tokens.values()):
                critique_result = self.apply_critique(response, retrieved_docs)
                if critique_result["needs_correction"]:
                    # Regenerate problematic sections
                    response = self.correct_generation(response, critique_result)
        
        # Step 3: Final verification
        verification = self.verify_factual_alignment(response, company_data)
        
        return {
            "summary": response,
            "retrieval_decision": decision,
            "retrieved_docs": retrieved_docs,
            "verification_score": verification["score"],
            "supported_claims": verification["supported_claims"]
        }
    
    def adaptive_retrieval(self, query: str, company_data: dict) -> list:
        """Dynamically adjust retrieval based on query complexity"""
        complexity_score = self.assess_query_complexity(query)
        
        if complexity_score < 0.3:
            # Simple query: retrieve from SQLite only
            return company_data['facts'][:5]
        elif complexity_score < 0.7:
            # Moderate: SQLite + ChromaDB
            sqlite_facts = company_data['facts']
            chroma_results = self.retriever.query(
                query_texts=[query],
                n_results=3,
                where={"company_id": company_data['company']['id']}
            )
            return sqlite_facts + chroma_results
        else:
            # Complex: Multi-hop retrieval
            return self.multi_hop_retrieval(query, company_data)
```

## 2. GraphRAG: Multi-Hop Entity Relationship Reasoning

### Research Foundation
**Knollmeyer et al. (2025)** [Document GraphRAG: Knowledge Graph Enhanced Retrieval Augmented Generation for Document Question Answering Within the Manufacturing Domain](https://doi.org/10.3390/electronics14112102) demonstrates that knowledge graphs built from document structure significantly improve retrieval robustness and answer generation.

**Zhang et al. (2025)** [A Survey of Graph Retrieval-Augmented Generation for Customized Large Language Models](http://arxiv.org/abs/2501.13958) provides comprehensive taxonomy of GraphRAG approaches, highlighting their superiority for complex reasoning tasks.

**HopRAG (2025)** [HopRAG: Multi-Hop Reasoning for Logic-Aware Retrieval-Augmented Generation](https://doi.org/10.18653/v1/2025.findings-acl.97) introduces graph-structured knowledge exploration with retriever-reason-prune mechanism.

### Implementation Blueprint

```python
class GraphRAGSystem:
    def __init__(self, sqlite_db, chroma_db, llm):
        self.db = sqlite_db
        self.chroma = chroma_db
        self.llm = llm
        self.kg = self.build_knowledge_graph()
    
    def build_knowledge_graph(self) -> nx.Graph:
        """Construct knowledge graph from SQLite and ChromaDB data"""
        G = nx.Graph()
        
        # Extract entities and relationships from SQLite
        companies = self.db.execute("SELECT id, name, industry FROM companies").fetchall()
        for company in companies:
            G.add_node(f"company_{company['id']}", 
                      type="company",
                      name=company['name'],
                      industry=company['industry'])
        
        # Add relationships: company -> people
        people = self.db.execute("""
            SELECT p.name, p.role, p.company_id 
            FROM persons p
            JOIN companies c ON p.company_id = c.id
        """).fetchall()
        
        for person in people:
            person_id = f"person_{hash(person['name'])}"
            G.add_node(person_id, type="person", name=person['name'], role=person['role'])
            G.add_edge(f"company_{person['company_id']}", person_id, 
                      relationship="employs")
        
        # Add funding events as temporal relationships
        funding_facts = self.db.execute("""
            SELECT cf.company_id, cf.fact_text
            FROM company_facts cf
            WHERE cf.fact_type LIKE '%funding%' OR cf.fact_type LIKE '%investment%'
        """).fetchall()
        
        for fact in funding_facts:
            event_id = f"event_{hash(fact['fact_text'])}"
            G.add_node(event_id, type="event", description=fact['fact_text'])
            G.add_edge(f"company_{fact['company_id']}", event_id,
                      relationship="received_funding")
        
        return G
    
    def multi_hop_retrieval(self, query: str, company_id: int, max_hops: int = 3) -> list:
        """Perform graph-based multi-hop retrieval"""
        
        # Extract entities from query
        entities = self.extract_entities(query)
        
        # Find relevant subgraph
        subgraph_nodes = set()
        for entity in entities:
            # Find matching nodes in KG
            matches = [n for n, attr in self.kg.nodes(data=True) 
                      if entity.lower() in attr.get('name', '').lower() or
                         entity.lower() in attr.get('description', '').lower()]
            
            # Expand to connected nodes up to max_hops
            for match in matches:
                subgraph_nodes.add(match)
                # Get neighbors within max_hops
                for neighbor in nx.single_source_shortest_path_length(self.kg, match, cutoff=max_hops):
                    subgraph_nodes.add(neighbor)
        
        # Extract facts from subgraph
        retrieved_facts = []
        for node in subgraph_nodes:
            node_data = self.kg.nodes[node]
            if node_data['type'] == 'company' and node_data.get('name'):
                retrieved_facts.append(f"Company: {node_data['name']}")
            elif node_data['type'] == 'event':
                retrieved_facts.append(f"Event: {node_data['description']}")
        
        # Get relationships
        subgraph = self.kg.subgraph(subgraph_nodes)
        for u, v, data in subgraph.edges(data=True):
            u_name = self.kg.nodes[u].get('name', u)
            v_name = self.kg.nodes[v].get('name', v)
            retrieved_facts.append(f"Relationship: {u_name} {data['relationship']} {v_name}")
        
        return retrieved_facts
    
    def generate_with_graph_context(self, query: str, company_id: int) -> dict:
        """Generate report using graph-enhanced context"""
        
        # Get company data
        company_data = self.get_company_data(company_id)
        
        # Perform graph-based retrieval
        graph_context = self.multi_hop_retrieval(query, company_id)
        
        # Find similar companies in graph
        similar_companies = self.find_similar_companies(company_id, top_k=3)
        
        prompt = f"""
        Generate a B2B lead analysis report using the following graph-structured knowledge:
        
        TARGET COMPANY:
        - Name: {company_data['name']}
        - Industry: {company_data['industry']}
        - Location: {company_data['location']}
        
        GRAPH-DERIVED CONTEXT:
        {chr(10).join(graph_context[:10])}
        
        SIMILAR COMPANIES (for benchmarking):
        {chr(10).join([f"- {c['name']}: {c['similarity_reason']}" for c in similar_companies])}
        
        ANALYSIS INSTRUCTIONS:
        1. Identify key growth signals from the graph relationships
        2. Compare with similar companies for market positioning
        3. Highlight multi-hop connections (e.g., funding → hiring → expansion)
        4. Provide confidence scores for each insight based on graph evidence
        
        Output in structured JSON format.
        """
        
        return self.llm.generate(prompt)
```

## 3. Structured Generation with Schema Enforcement

### Research Foundation
**Geng et al. (2025)** [JSONSchemaBench: A Rigorous Benchmark of Structured Outputs for Language Models](http://arxiv.org/abs/2501.10868) establishes standardized evaluation for structured generation with JSON Schema compliance.

**Dong et al. (2024)** [XGrammar: Flexible and Efficient Structured Generation Engine for Large Language Models](http://arxiv.org/abs/2411.15100) introduces context-free grammar based structured generation with reduced overhead.

**Lu et al. (2025)** [Learning to Generate Structured Output with Schema Reinforcement Learning](https://doi.org/10.18653/v1/2025.acl-long.243) demonstrates schema reinforcement learning for reliable structured generation.

### Implementation Blueprint

```python
from outlines import generate, models
import json
from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class LeadReportSchema(BaseModel):
    """Pydantic schema for structured lead reports"""
    company_name: str = Field(..., description="Name of the company")
    executive_summary: str = Field(..., description="2-3 sentence overview")
    
    # Structured sections
    financial_analysis: Dict[str, str] = Field(
        default_factory=dict,
        description="Key financial indicators and analysis"
    )
    technology_stack: List[str] = Field(
        default_factory=list,
        description="Technologies and platforms used"
    )
    team_strength: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Key personnel and their expertise"
    )
    growth_signals: List[Dict[str, str]] = Field(
        default_factory=list,
        description="Growth indicators with evidence"
    )
    risk_factors: List[Dict[str, str]] = Field(
        default_factory=list,
        description="Potential risks and mitigations"
    )
    
    # Metadata
    confidence_scores: Dict[str, float] = Field(
        default_factory=dict,
        description="Confidence scores per section (0-1)"
    )
    source_attributions: List[Dict[str, str]] = Field(
        default_factory=list,
        description="Sources for key claims"
    )
    generated_at: str = Field(
        default_factory=lambda: datetime.now().isoformat()
    )

class StructuredReportGenerator:
    def __init__(self, model_name: str = "llama3.1:8b"):
        self.model = models.transformers(model_name)
        self.schema = LeadReportSchema.schema_json()
    
    def generate_structured_report(self, company_data: dict, 
                                  graph_context: list = None) -> LeadReportSchema:
        """Generate schema-enforced structured report"""
        
        # Build constrained prompt
        prompt = self.build_structured_prompt(company_data, graph_context)
        
        # Generate with schema constraints using Outlines
        structured_text = generate.json(self.model, self.schema)(prompt)
        
        # Parse and validate
        report_dict = json.loads(structured_text)
        report = LeadReportSchema(**report_dict)
        
        # Add automatic confidence scoring
        report.confidence_scores = self.calculate_confidence_scores(report, company_data)
        
        return report
    
    def build_structured_prompt(self, company_data: dict, graph_context: list) -> str:
        """Build prompt for structured generation"""
        
        return f"""
        Generate a structured B2B lead report following the exact JSON schema.
        
        COMPANY DATA:
        {json.dumps(company_data, indent=2)}
        
        GRAPH CONTEXT (if available):
        {json.dumps(graph_context[:5], indent=2) if graph_context else "No graph context"}
        
        INSTRUCTIONS:
        1. Fill ALL required fields in the JSON schema
        2. For financial_analysis: Include revenue trends, funding history, burn rate indicators
        3. For technology_stack: Extract from company descriptions, job postings, news
        4. For team_strength: Highlight key hires, executive experience, technical expertise
        5. For growth_signals: Include specific metrics with evidence
        6. For risk_factors: Identify realistic business/technical risks
        
        Output MUST be valid JSON matching the schema.
        """
    
    def calculate_confidence_scores(self, report: LeadReportSchema, 
                                   source_data: dict) -> Dict[str, float]:
        """Calculate confidence scores based on source coverage"""
        
        scores = {}
        
        # Financial analysis confidence
        financial_sources = len([f for f in source_data.get('facts', []) 
                               if any(term in f['fact_type'].lower() 
                                     for term in ['funding', 'revenue', 'financial'])])
        scores['financial_analysis'] = min(1.0, financial_sources / 3)
        
        # Technology stack confidence
        tech_mentions = len([f for f in source_data.get('facts', [])
                           if any(term in f['fact_text'].lower()
                                 for term in ['tech', 'platform', 'software', 'ai'])])
        scores['technology_stack'] = min(1.0, tech_mentions / 2)
        
        # Team strength confidence
        team_size = len(source_data.get('people', []))
        scores['team_strength'] = min(1.0, team_size / 5)
        
        return scores
```

## 4. Citation Verification Pipeline

### Research Foundation
**Wu et al. (2025)** [An automated framework for assessing how well LLMs cite relevant medical references](https://doi.org/10.1038/s41467-025-58551-6) introduces SourceCheckup, an agent-based pipeline for evaluating source relevance and supportiveness.

**Saxena et al. (2024)** [Attribution in Scientific Literature: New Benchmark and Methods](http://arxiv.org/abs/2405.02228) provides benchmarks and methods for accurate source attribution in LLM outputs.

### Implementation Blueprint

```python
class CitationVerificationPipeline:
    def __init__(self, llm, embedding_model):
        self.llm = llm
        self.embedding_model = embedding_model
        self.verification_threshold = 0.7
    
    def extract_claims(self, text: str) -> List[Dict]:
        """Extract factual claims from generated text"""
        
        prompt = f"""
        Extract all factual claims from the following text. For each claim:
        1. Identify the specific fact being stated
        2. Note any quantitative information (dates, amounts, percentages)
        3. Flag claims that require external verification
        
        Text: {text}
        
        Output JSON format:
        {{
            "claims": [
                {{
                    "claim_text": "string",
                    "claim_type": "financial|technical|team|event",
                    "requires_verification": boolean,
                    "confidence": float
                }}
            ]
        }}
        """
        
        response = self.llm.generate(prompt)
        return json.loads(response)["claims"]
    
    def match_claims_to_sources(self, claims: List[Dict], 
                               sources: List[Dict]) -> List[Dict]:
        """Match each claim to supporting sources"""
        
        verified_claims = []
        
        for claim in claims:
            if not claim["requires_verification"]:
                claim["verification_status"] = "self-evident"
                claim["supporting_sources"] = []
                verified_claims.append(claim)
                continue
            
            # Find supporting sources via semantic similarity
            claim_embedding = self.embedding_model.encode(claim["claim_text"])
            
            source_matches = []
            for source in sources:
                source_embedding = self.embedding_model.encode(
                    f"{source.get('title', '')} {source.get('content', '')}"
                )
                
                similarity = cosine_similarity([claim_embedding], [source_embedding])[0][0]
                
                if similarity > self.verification_threshold:
                    source_matches.append({
                        "source_id": source.get("id"),
                       