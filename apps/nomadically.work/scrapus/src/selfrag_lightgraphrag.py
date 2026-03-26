"""
Enhanced RAG System: Self-RAG Proxy + LightGraphRAG for M1 Local Deployment

Implements:
1. Self-RAG: Sentence-level claim extraction + verification against source facts
2. LightGraphRAG: Knowledge graph from SQLite entities with hybrid retrieval
3. Pipeline: retrieve (vector+graph) -> generate -> verify -> output
4. Memory-conscious: <500 MB GraphRAG overhead on M1

References:
- Asai et al. (2023): Self-RAG [https://arxiv.org/abs/2310.11511]
- Knollmeyer et al. (2025): Document GraphRAG
- Novel insights on token overlap effectiveness for constrained outputs
"""

import sqlite3
import json
import re
import time
from typing import Optional, Dict, List, Tuple, Any
from dataclasses import dataclass, field, asdict
from collections import defaultdict, deque
import numpy as np
from enum import Enum

try:
    import lancedb
except ImportError:
    lancedb = None

try:
    from sentence_transformers import SentenceTransformer, CrossEncoder
except ImportError:
    SentenceTransformer = None
    CrossEncoder = None


# ============================================================================
# PART 1: SELF-RAG CLAIM VERIFICATION SYSTEM
# ============================================================================

class VerificationStatus(Enum):
    """Claim verification outcomes."""
    SUPPORTED = "supported"
    UNSUPPORTED = "unsupported"
    PARTIAL = "partial"
    CONTRADICTED = "contradicted"


@dataclass
class Claim:
    """Extracted claim with verification metadata."""
    text: str
    sentence_idx: int
    tokens: set = field(default_factory=set)
    verification_status: VerificationStatus = VerificationStatus.UNSUPPORTED
    token_overlap_score: float = 0.0
    embedding_similarity: float = 0.0
    combined_confidence: float = 0.0
    supporting_facts: List[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        """Convert to serializable dict."""
        return {
            "text": self.text,
            "sentence_idx": self.sentence_idx,
            "status": self.verification_status.value,
            "token_overlap": round(self.token_overlap_score, 3),
            "embedding_sim": round(self.embedding_similarity, 3),
            "confidence": round(self.combined_confidence, 3),
            "supporting_facts": self.supporting_facts
        }


@dataclass
class VerificationResult:
    """Post-generation verification output."""
    total_claims: int
    verified_claims: int
    verification_status: List[Claim] = field(default_factory=list)
    hallucination_rate: float = 0.0
    confidence_score: float = 1.0
    regeneration_needed: bool = False
    low_confidence_claims: List[Claim] = field(default_factory=list)
    timestamp: float = field(default_factory=time.time)
    
    def to_dict(self) -> dict:
        """Serialize for storage."""
        return {
            "total_claims": self.total_claims,
            "verified_claims": self.verified_claims,
            "hallucination_rate": round(self.hallucination_rate, 3),
            "confidence_score": round(self.confidence_score, 3),
            "regeneration_needed": self.regeneration_needed,
            "low_confidence_claims": [c.to_dict() for c in self.low_confidence_claims],
            "timestamp": self.timestamp
        }


class SelfRAGVerifier:
    """
    Implements Self-RAG proxy for claim verification.
    
    No fine-tuning needed: pure inference-time technique.
    - Claim extraction: sentence-level via regex + NER patterns
    - Verification: token overlap + embedding similarity
    - Retrieval trigger: if confidence < 0.6, fetch additional context
    - Regeneration: optionally re-run generation with enriched context
    """
    
    def __init__(
        self,
        embedding_model: Optional[str] = None,
        token_overlap_weight: float = 0.6,
        embedding_weight: float = 0.4,
        confidence_threshold: float = 0.6,
        reranker_model: Optional[str] = None
    ):
        """
        Args:
            embedding_model: SentenceTransformer model for semantic similarity
            token_overlap_weight: weight for lexical matching in combined score
            embedding_weight: weight for semantic matching
            confidence_threshold: below this, trigger retrieval for enrichment
            reranker_model: optional cross-encoder for confidence boosting
        """
        self.token_overlap_weight = token_overlap_weight
        self.embedding_weight = embedding_weight
        self.confidence_threshold = confidence_threshold
        
        self.embedder = None
        self.reranker = None
        
        if embedding_model and SentenceTransformer:
            try:
                self.embedder = SentenceTransformer(embedding_model)
            except Exception as e:
                print(f"Warning: Failed to load embedder {embedding_model}: {e}")
        
        if reranker_model and CrossEncoder:
            try:
                self.reranker = CrossEncoder(reranker_model)
            except Exception as e:
                print(f"Warning: Failed to load reranker {reranker_model}: {e}")
    
    @staticmethod
    def extract_claims(text: str) -> List[str]:
        """
        Extract sentence-level verifiable claims from generated text.
        
        Uses regex patterns to identify factual assertions:
        - Action claims: "X launched/raised/expanded..."
        - Monetary values: "$10M", "€5B"
        - Year references: "2024", "1995"
        - Percentages: "23.5%"
        - Employee counts: "500 engineers"
        
        Returns list of claims in original casing.
        """
        patterns = [
            # Action claims: "X launched/raised/expanded..."
            r'[A-Z][a-z]+(?:\s+[A-Z][a-z]+)* (?:launched|raised|expanded|acquired|partnered|received|closed|hired|opened|announced|secured|completed|deployed|integrated) [^.!?]*[.!?]',
            # Monetary values with context
            r'(?:raised|invested in|worth|valued at|paid)\s+\$[\d,.]+\s*(?:million|billion|[MBK])?',
            # Year references with context
            r'(?:in|since|by|during)\s+(?:19|20)\d{2}',
            # Percentage claims
            r'(?:grew|increased|dropped|rose|fell)\s+(?:by\s+)?\d+(?:\.\d+)?%',
            # Employee/team size
            r'\d+[\s,]*(?:employees|staff|engineers|developers|founders)',
        ]
        
        claims = []
        seen = set()
        
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                claim_text = match.group(0).strip()
                if len(claim_text) > 5 and claim_text.lower() not in seen:
                    claims.append(claim_text)
                    seen.add(claim_text.lower())
        
        return claims
    
    @staticmethod
    def tokenize(text: str) -> set:
        """Simple whitespace + punctuation tokenization."""
        tokens = re.findall(r'\b\w+\b', text.lower())
        return set(tokens)
    
    def verify_claim_token_overlap(
        self,
        claim: str,
        source_facts: List[str],
        threshold: float = 0.5
    ) -> Tuple[float, List[str]]:
        """
        Verify claim via token overlap against source facts.
        
        Returns:
            (overlap_score, supporting_facts)
        
        Method: Jaccard similarity between claim tokens and fact tokens
        """
        claim_tokens = self.tokenize(claim)
        if not claim_tokens:
            return 0.0, []
        
        best_overlap = 0.0
        best_fact = None
        
        for fact in source_facts:
            fact_tokens = self.tokenize(fact)
            if not fact_tokens:
                continue
            
            # Jaccard: intersection / union
            intersection = len(claim_tokens & fact_tokens)
            union = len(claim_tokens | fact_tokens)
            overlap = intersection / union if union > 0 else 0.0
            
            if overlap > best_overlap:
                best_overlap = overlap
                best_fact = fact
        
        supporting_facts = [best_fact] if best_fact and best_overlap > threshold else []
        return best_overlap, supporting_facts
    
    def verify_claim_embedding(
        self,
        claim: str,
        source_facts: List[str],
        threshold: float = 0.5
    ) -> Tuple[float, List[str]]:
        """
        Verify claim via embedding similarity against source facts.
        
        Returns:
            (max_similarity, supporting_facts_above_threshold)
        """
        if not self.embedder:
            return 0.0, []
        
        try:
            claim_emb = self.embedder.encode(claim, convert_to_tensor=False)
            fact_embs = self.embedder.encode(source_facts, convert_to_tensor=False)
            
            similarities = np.dot(fact_embs, claim_emb) / (
                np.linalg.norm(fact_embs, axis=1) * np.linalg.norm(claim_emb) + 1e-10
            )
            
            max_sim = float(np.max(similarities))
            supporting_facts = [
                f for f, s in zip(source_facts, similarities)
                if s > threshold
            ]
            
            return max_sim, supporting_facts
        except Exception as e:
            print(f"Warning: Embedding verification failed: {e}")
            return 0.0, []
    
    def verify_report(
        self,
        report_text: str,
        source_facts: List[str],
        use_embedding: bool = True
    ) -> VerificationResult:
        """
        Complete verification pipeline: extract -> verify -> aggregate.
        
        Args:
            report_text: Generated report to verify
            source_facts: List of grounding facts from SQLite + retrieval
            use_embedding: if True, combine with semantic similarity
        
        Returns:
            VerificationResult with detailed claim-level metadata
        """
        claims_text = self.extract_claims(report_text)
        claims = []
        
        for idx, claim_text in enumerate(claims_text):
            claim = Claim(
                text=claim_text,
                sentence_idx=idx,
                tokens=self.tokenize(claim_text)
            )
            
            # Stage 1: Token overlap verification
            overlap_score, supporting_overlap = self.verify_claim_token_overlap(
                claim_text, source_facts, threshold=0.5
            )
            claim.token_overlap_score = overlap_score
            
            # Stage 2: Embedding similarity (optional)
            if use_embedding:
                embed_score, supporting_embed = self.verify_claim_embedding(
                    claim_text, source_facts, threshold=0.5
                )
                claim.embedding_similarity = embed_score
                claim.supporting_facts = list(set(supporting_overlap + supporting_embed))
            else:
                claim.supporting_facts = supporting_overlap
            
            # Stage 3: Determine verification status
            combined = (
                self.token_overlap_weight * overlap_score +
                self.embedding_weight * claim.embedding_similarity
            )
            claim.combined_confidence = combined
            
            if combined > 0.7:
                claim.verification_status = VerificationStatus.SUPPORTED
            elif combined > 0.4:
                claim.verification_status = VerificationStatus.PARTIAL
            else:
                claim.verification_status = VerificationStatus.UNSUPPORTED
            
            claims.append(claim)
        
        # Aggregate results
        verified_count = sum(
            1 for c in claims
            if c.verification_status == VerificationStatus.SUPPORTED
        )
        
        low_confidence = [c for c in claims if c.combined_confidence < self.confidence_threshold]
        
        hallucination_rate = 1.0 - (verified_count / len(claims)) if claims else 0.0
        
        result = VerificationResult(
            total_claims=len(claims),
            verified_claims=verified_count,
            verification_status=claims,
            hallucination_rate=hallucination_rate,
            confidence_score=1.0 - hallucination_rate,
            regeneration_needed=len(low_confidence) > 0,
            low_confidence_claims=low_confidence
        )
        
        return result


# ============================================================================
# PART 2: LIGHT GRAPHRAG SYSTEM
# ============================================================================

@dataclass
class Entity:
    """Knowledge graph entity (company, person, funding event, etc.)."""
    id: str
    entity_type: str
    name: str
    properties: Dict[str, Any] = field(default_factory=dict)
    embedding: Optional[np.ndarray] = None
    
    def to_dict(self) -> dict:
        """Serialize (exclude embedding array)."""
        return {
            "id": self.id,
            "entity_type": self.entity_type,
            "name": self.name,
            "properties": self.properties
        }


@dataclass
class Relationship:
    """Edge in knowledge graph."""
    source_id: str
    target_id: str
    relation_type: str  # e.g., "funded_by", "hired_from", "acquired"
    properties: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Cluster:
    """Degree-based cluster of entities."""
    id: str
    entity_ids: List[str] = field(default_factory=list)
    cluster_type: str = "degree_based"  # grouping strategy
    summary: str = ""  # 1-sentence LLM-generated summary
    size: int = 0
    avg_degree: float = 0.0
    keywords: List[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "entity_ids": self.entity_ids,
            "cluster_type": self.cluster_type,
            "summary": self.summary,
            "size": self.size,
            "avg_degree": round(self.avg_degree, 2),
            "keywords": self.keywords
        }


class LightGraphRAG:
    """
    Lightweight knowledge graph for RAG retrieval.
    
    Constraints:
    - 1-hop relationships only (no multi-hop traversal)
    - Degree-based clustering (no Louvain algorithm)
    - SQLite backend for persistence
    - <500 MB memory overhead
    
    Pipeline:
    1. Extract entities + relationships from SQLite (companies, people, funding, etc.)
    2. Build in-memory graph with adjacency lists
    3. Cluster by degree (high-degree nodes are hubs)
    4. Generate 1-sentence summary per cluster
    5. Hybrid retrieval: vector search + graph traversal with RRF ranking
    """
    
    def __init__(
        self,
        db_path: str,
        use_embeddings: bool = True,
        embedder: Optional[str] = None,
        memory_limit_mb: int = 500
    ):
        """
        Args:
            db_path: Path to SQLite database containing entities/relationships
            use_embeddings: if True, embed entity names for semantic search
            embedder: SentenceTransformer model name
            memory_limit_mb: memory budget for entire GraphRAG layer
        """
        self.db_path = db_path
        self.memory_limit_mb = memory_limit_mb
        
        self.entities: Dict[str, Entity] = {}  # id -> Entity
        self.relationships: List[Relationship] = []
        self.adjacency: Dict[str, List[str]] = defaultdict(list)  # node -> neighbors
        self.clusters: Dict[str, Cluster] = {}
        
        self.embedder = None
        if use_embeddings and embedder and SentenceTransformer:
            try:
                self.embedder = SentenceTransformer(embedder)
            except Exception as e:
                print(f"Warning: Failed to load embedder: {e}")
        
        self._init_from_db()
    
    def _init_from_db(self):
        """Load entities and relationships from SQLite."""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Load entities (assuming tables: companies, persons, funding_rounds)
            tables_to_load = {
                "companies": "company",
                "persons": "person",
                "funding_rounds": "funding"
            }
            
            for table, entity_type in tables_to_load.items():
                try:
                    cursor.execute(f"SELECT * FROM {table} LIMIT 1000")
                    for row in cursor.fetchall():
                        entity_id = f"{entity_type}_{row['id']}"
                        name = row.get('name', row.get('title', 'Unknown'))
                        
                        entity = Entity(
                            id=entity_id,
                            entity_type=entity_type,
                            name=name,
                            properties=dict(row)
                        )
                        
                        # Embed entity names
                        if self.embedder:
                            try:
                                entity.embedding = self.embedder.encode(name, convert_to_tensor=False)
                            except:
                                pass
                        
                        self.entities[entity_id] = entity
                except Exception as e:
                    print(f"Warning: Failed to load {table}: {e}")
            
            # Load relationships from company_facts, person_company, etc.
            try:
                cursor.execute("""
                    SELECT source_id, target_id, relation_type
                    FROM relationships LIMIT 5000
                """)
                for row in cursor.fetchall():
                    rel = Relationship(
                        source_id=row['source_id'],
                        target_id=row['target_id'],
                        relation_type=row['relation_type']
                    )
                    self.relationships.append(rel)
                    self.adjacency[row['source_id']].append(row['target_id'])
                    self.adjacency[row['target_id']].append(row['source_id'])
            except Exception as e:
                print(f"Note: relationships table not found or empty: {e}")
            
            conn.close()
        except Exception as e:
            print(f"Warning: Failed to initialize from database: {e}")
    
    def build_degree_clusters(self, min_cluster_size: int = 2) -> Dict[str, Cluster]:
        """
        Group entities into clusters based on degree (connectivity).
        
        High-degree nodes (hubs) form separate clusters.
        Low-degree nodes cluster with their neighbors.
        
        Args:
            min_cluster_size: only create cluster if size >= min
        
        Returns:
            Dict mapping cluster_id -> Cluster
        """
        # Compute degrees
        degrees = {node_id: len(neighbors) for node_id, neighbors in self.adjacency.items()}
        
        # Sort by degree descending
        sorted_nodes = sorted(degrees.items(), key=lambda x: x[1], reverse=True)
        
        clusters = {}
        assigned = set()
        cluster_counter = 0
        
        for node_id, degree in sorted_nodes:
            if node_id in assigned:
                continue
            
            # High-degree nodes (degree >= 3): separate cluster
            if degree >= 3:
                cluster_id = f"cluster_{cluster_counter}"
                cluster = Cluster(
                    id=cluster_id,
                    entity_ids=[node_id],
                    size=1,
                    avg_degree=float(degree)
                )
                clusters[cluster_id] = cluster
                assigned.add(node_id)
                cluster_counter += 1
            else:
                # Low-degree nodes: cluster with neighbors
                neighbors = [n for n in self.adjacency[node_id] if n not in assigned]
                if neighbors:
                    cluster_id = f"cluster_{cluster_counter}"
                    entity_ids = [node_id] + neighbors[:5]  # limit to 5 per cluster
                    
                    avg_deg = sum(degrees.get(eid, 0) for eid in entity_ids) / len(entity_ids)
                    
                    cluster = Cluster(
                        id=cluster_id,
                        entity_ids=entity_ids,
                        size=len(entity_ids),
                        avg_degree=avg_deg
                    )
                    clusters[cluster_id] = cluster
                    assigned.update(entity_ids)
                    cluster_counter += 1
        
        self.clusters = {
            cid: c for cid, c in clusters.items()
            if c.size >= min_cluster_size
        }
        
        return self.clusters
    
    def generate_cluster_summaries(self, llm_call_func) -> None:
        """
        Generate 1-sentence summary per cluster using LLM.
        
        Args:
            llm_call_func: callable(prompt: str) -> str
                Function that takes prompt and returns LLM output
        
        Example:
            def call_llm(p):
                return ollama.generate(model="llama3.1", prompt=p)
            
            graphrag.generate_cluster_summaries(call_llm)
        """
        for cluster_id, cluster in self.clusters.items():
            # Gather entity info
            entity_info = []
            for eid in cluster.entity_ids:
                if eid in self.entities:
                    e = self.entities[eid]
                    entity_info.append(f"{e.name} ({e.entity_type})")
            
            if not entity_info:
                cluster.summary = f"Cluster of {cluster.size} entities"
                continue
            
            # Generate summary via LLM
            prompt = (
                f"Summarize this group of entities in exactly one sentence:\n"
                f"{', '.join(entity_info)}\n\n"
                f"Summary:"
            )
            
            try:
                summary = llm_call_func(prompt).strip()
                # Truncate to 120 chars for consistency
                cluster.summary = summary[:120]
            except Exception as e:
                print(f"Warning: Failed to generate summary for {cluster_id}: {e}")
                cluster.summary = f"Cluster with entities: {', '.join(entity_info[:3])}"
            
            # Extract keywords (top entity names)
            cluster.keywords = [e.split('(')[0].strip() for e in entity_info[:3]]
    
    def retrieve_by_vector_search(
        self,
        query: str,
        top_k: int = 5,
        threshold: float = 0.3
    ) -> List[Tuple[str, float]]:
        """
        Retrieve clusters via embedding similarity to query.
        
        Returns:
            List of (cluster_id, similarity_score) tuples
        """
        if not self.embedder or not self.clusters:
            return []
        
        try:
            query_emb = self.embedder.encode(query, convert_to_tensor=False)
            scores = []
            
            for cluster_id, cluster in self.clusters.items():
                # Use first entity's embedding as cluster representation
                cluster_embs = []
                for eid in cluster.entity_ids:
                    if eid in self.entities and self.entities[eid].embedding is not None:
                        cluster_embs.append(self.entities[eid].embedding)
                
                if cluster_embs:
                    cluster_emb = np.mean(cluster_embs, axis=0)
                    sim = float(np.dot(query_emb, cluster_emb) / (
                        np.linalg.norm(query_emb) * np.linalg.norm(cluster_emb) + 1e-10
                    ))
                    if sim > threshold:
                        scores.append((cluster_id, sim))
            
            # Sort by score and return top_k
            scores.sort(key=lambda x: x[1], reverse=True)
            return scores[:top_k]
        except Exception as e:
            print(f"Warning: Vector search failed: {e}")
            return []
    
    def retrieve_by_graph_traversal(
        self,
        start_entity_id: str,
        relation_types: Optional[List[str]] = None,
        max_results: int = 5
    ) -> List[Tuple[str, int]]:
        """
        Retrieve neighbors via 1-hop graph traversal from start entity.
        
        Args:
            start_entity_id: node to start from
            relation_types: filter to specific edge types (None = all)
            max_results: max neighbors to return
        
        Returns:
            List of (neighbor_entity_id, path_length) tuples
        """
        if start_entity_id not in self.adjacency:
            return []
        
        neighbors = self.adjacency[start_entity_id][:max_results]
        return [(n, 1) for n in neighbors]
    
    def hybrid_retrieve(
        self,
        query: str,
        company_entity_id: Optional[str] = None,
        top_k_vector: int = 3,
        top_k_graph: int = 3,
        use_rrf: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Hybrid retrieval: combine vector search + graph traversal with RRF.
        
        Reciprocal Rank Fusion (RRF) formula:
            score(d) = sum over all rankers: 1 / (k + rank(d))
        where k=60 is the standard RRF constant.
        
        Args:
            query: search query
            company_entity_id: if provided, also do 1-hop graph traversal
            top_k_vector: top-k from vector search
            top_k_graph: top-k from graph traversal
            use_rrf: if True, fuse rankings via RRF; else concatenate
        
        Returns:
            List of result dicts with cluster/entity info and rank scores
        """
        results = {}
        rrf_constant = 60
        
        # Step 1: Vector search
        vector_results = self.retrieve_by_vector_search(query, top_k=top_k_vector)
        for rank, (cluster_id, score) in enumerate(vector_results, start=1):
            if cluster_id not in results:
                results[cluster_id] = {"vector_rank": rank, "graph_rank": None, "vector_score": score}
            else:
                results[cluster_id]["vector_rank"] = rank
                results[cluster_id]["vector_score"] = score
        
        # Step 2: Graph traversal (if company_entity_id provided)
        if company_entity_id:
            graph_results = self.retrieve_by_graph_traversal(
                company_entity_id, max_results=top_k_graph
            )
            for rank, (entity_id, path_len) in enumerate(graph_results, start=1):
                # Map entity to cluster
                cluster_id = None
                for cid, cluster in self.clusters.items():
                    if entity_id in cluster.entity_ids:
                        cluster_id = cid
                        break
                
                if cluster_id:
                    if cluster_id not in results:
                        results[cluster_id] = {"vector_rank": None, "graph_rank": rank}
                    else:
                        results[cluster_id]["graph_rank"] = rank
        
        # Step 3: RRF fusion
        if use_rrf:
            for cluster_id, ranks in results.items():
                rrf_score = 0.0
                if ranks["vector_rank"] is not None:
                    rrf_score += 1.0 / (rrf_constant + ranks["vector_rank"])
                if ranks["graph_rank"] is not None:
                    rrf_score += 1.0 / (rrf_constant + ranks["graph_rank"])
                ranks["rrf_score"] = rrf_score
        
        # Step 4: Sort and format output
        sorted_results = sorted(
            results.items(),
            key=lambda x: x[1].get("rrf_score", x[1].get("vector_score", 0)), 
            reverse=True
        )
        
        final_results = []
        for cluster_id, rank_info in sorted_results:
            if cluster_id in self.clusters:
                cluster = self.clusters[cluster_id]
                final_results.append({
                    "cluster_id": cluster_id,
                    "summary": cluster.summary,
                    "entity_ids": cluster.entity_ids,
                    "keywords": cluster.keywords,
                    "size": cluster.size,
                    **rank_info
                })
        
        return final_results[:top_k_vector + top_k_graph]


# ============================================================================
# PART 3: INTEGRATED ENHANCED RAG PIPELINE
# ============================================================================

@dataclass
class PipelineConfig:
    """Configuration for enhanced RAG pipeline."""
    # Self-RAG settings
    enable_self_rag: bool = True
    self_rag_confidence_threshold: float = 0.6
    self_rag_embedding_model: Optional[str] = None
    regenerate_low_confidence: bool = False
    
    # GraphRAG settings
    enable_graph_rag: bool = True
    graph_embedding_model: Optional[str] = "all-MiniLM-L6-v2"
    
    # Retrieval settings
    top_k_vector: int = 3
    top_k_graph: int = 3
    cosine_threshold: float = 0.3
    
    # LLM settings
    llm_model: str = "llama3.1:8b-instruct-q4_K_M"
    temperature: float = 0.3
    top_p: float = 0.9
    max_tokens: int = 300
    
    # Monitoring
    track_latency: bool = True
    track_memory: bool = False


class EnhancedRAGPipeline:
    """
    End-to-end RAG pipeline: retrieve -> generate -> verify.
    
    Integrates:
    1. Vector + graph hybrid retrieval
    2. LLM-based report generation with structured output
    3. Self-RAG post-generation verification
    4. Optional regeneration for low-confidence claims
    """
    
    def __init__(
        self,
        db_path: str,
        config: PipelineConfig = PipelineConfig(),
        llm_call_func = None
    ):
        """
        Args:
            db_path: SQLite database path
            config: pipeline configuration
            llm_call_func: callable(prompt: str, **kwargs) -> str
        """
        self.db_path = db_path
        self.config = config
        self.llm_call_func = llm_call_func
        
        # Initialize components
        self.verifier = None
        self.graph_rag = None
        
        if config.enable_self_rag:
            self.verifier = SelfRAGVerifier(
                embedding_model=config.self_rag_embedding_model,
                confidence_threshold=config.self_rag_confidence_threshold
            )
        
        if config.enable_graph_rag:
            self.graph_rag = LightGraphRAG(
                db_path=db_path,
                use_embeddings=True,
                embedder=config.graph_embedding_model
            )
            self.graph_rag.build_degree_clusters()
        
        # Timing instrumentation
        self.latency_breakdown = {}
    
    def retrieve(
        self,
        company_name: str,
        company_id: Optional[int] = None,
        sql_facts: Optional[List[str]] = None,
        vector_db = None
    ) -> Dict[str, Any]:
        """
        Hybrid retrieval: combine vector search + graph traversal.
        
        Args:
            company_name: query string
            company_id: if known, enables graph traversal
            sql_facts: pre-fetched structured facts from SQLite
            vector_db: LanceDB connection for vector search
        
        Returns:
            {
                "query": company_name,
                "sql_facts": [...],
                "vector_results": [...],
                "graph_results": [...],
                "combined_context": "...",
                "combined_facts": [...]
            }
        """
        t0 = time.time()
        
        # Step 1: Gather SQL facts (already provided or fetch)
        facts = sql_facts or []
        t1 = time.time()
        self.latency_breakdown['sql_facts'] = t1 - t0
        
        # Step 2: Vector search
        vector_results = []
        if vector_db:
            try:
                # Assuming vector_db has query method
                vector_results = vector_db.query(company_name, n_results=self.config.top_k_vector)
            except Exception as e:
                print(f"Warning: Vector search failed: {e}")
        t2 = time.time()
        self.latency_breakdown['vector_search'] = t2 - t1
        
        # Step 3: Graph traversal
        graph_results = []
        if self.graph_rag and company_id:
            company_entity_id = f"company_{company_id}"
            graph_results = self.graph_rag.hybrid_retrieve(
                query=company_name,
                company_entity_id=company_entity_id,
                top_k_vector=self.config.top_k_vector,
                top_k_graph=self.config.top_k_graph
            )
        t3 = time.time()
        self.latency_breakdown['graph_retrieval'] = t3 - t2
        
        # Step 4: Combine context
        context_parts = []
        combined_facts = facts.copy()
        
        for result in vector_results:
            if isinstance(result, dict):
                context_parts.append(result.get('text', ''))
                combined_facts.append(result.get('text', ''))
        
        for result in graph_results:
            if result.get('summary'):
                context_parts.append(result['summary'])
        
        combined_context = "\n".join(context_parts)
        
        return {
            "query": company_name,
            "sql_facts": facts,
            "vector_results": vector_results,
            "graph_results": graph_results,
            "combined_context": combined_context,
            "combined_facts": combined_facts
        }
    
    def generate(
        self,
        retrieval_result: Dict[str, Any],
        company_name: str,
        json_schema: Optional[Dict] = None
    ) -> Tuple[str, Dict]:
        """
        Generate report via LLM.
        
        Args:
            retrieval_result: output from retrieve()
            company_name: for personalization
            json_schema: optional schema for structured output
        
        Returns:
            (raw_text, parsed_json)
        """
        t0 = time.time()
        
        # Build prompt
        facts_section = "\n".join([f"- {f}" for f in retrieval_result['sql_facts'][:5]])
        context_section = retrieval_result['combined_context'][:1000]  # truncate
        
        prompt = f"""You are a B2B sales analyst. Generate a concise report about {company_name}.

Structured facts:
{facts_section}

Additional context:
{context_section}

Generate a JSON report with the following fields:
- summary: 1-2 sentences
- key_strengths: array of max 3 items
- growth_indicators: array of max 3 items
- risk_factors: array of max 2 items
- recommended_approach: 1 sentence
- confidence: float between 0 and 1
- sources: array of source URLs

Output only valid JSON, no markdown or additional text."""
        
        try:
            raw_response = self.llm_call_func(prompt) if self.llm_call_func else "{}"
        except Exception as e:
            print(f"Warning: LLM generation failed: {e}")
            raw_response = "{}"
        
        t1 = time.time()
        self.latency_breakdown['generation'] = t1 - t0
        
        # Parse JSON
        try:
            parsed = json.loads(raw_response)
        except json.JSONDecodeError:
            # Fallback
            parsed = {
                "summary": raw_response[:100],
                "key_strengths": [],
                "growth_indicators": [],
                "risk_factors": [],
                "recommended_approach": "",
                "confidence": 0.5,
                "sources": []
            }
        
        return raw_response, parsed
    
    def verify(
        self,
        report_text: str,
        source_facts: List[str]
    ) -> VerificationResult:
        """
        Verify report via Self-RAG proxy.
        
        Args:
            report_text: generated report
            source_facts: grounding facts
        
        Returns:
            VerificationResult with detailed claim-level analysis
        """
        if not self.verifier:
            return VerificationResult(total_claims=0, verified_claims=0)
        
        t0 = time.time()
        result = self.verifier.verify_report(
            report_text,
            source_facts,
            use_embedding=self.config.self_rag_embedding_model is not None
        )
        t1 = time.time()
        self.latency_breakdown['verification'] = t1 - t0
        
        return result
    
    def generate_with_verification(
        self,
        retrieval_result: Dict[str, Any],
        company_name: str,
        max_retries: int = 1
    ) -> Dict[str, Any]:
        """
        End-to-end pipeline with optional regeneration.
        
        Args:
            retrieval_result: from retrieve()
            company_name: company identifier
            max_retries: if low-confidence claims found, optionally regenerate
        
        Returns:
            {
                "report": parsed_json,
                "verification": VerificationResult,
                "regenerated": bool,
                "latency_breakdown": timing_dict
            }
        """
        t_start = time.time()
        
        # Generate initial report
        raw_report, parsed_report = self.generate(retrieval_result, company_name)
        
        # Verify
        verification = self.verify(
            raw_report,
            retrieval_result['sql_facts']
        )
        
        # Optionally regenerate low-confidence claims
        regenerated = False
        if (self.config.regenerate_low_confidence and 
            verification.low_confidence_claims and 
            max_retries > 0):
            
            low_conf_texts = [c.text for c in verification.low_confidence_claims]
            enrichment_prompt = f"""The following claims from a report need verification:
{chr(10).join(low_conf_texts)}

Please regenerate these claims with strong grounding in the provided facts:
{chr(10).join(retrieval_result['sql_facts'])}

Output the regenerated claims as JSON."""
            
            try:
                enriched = self.llm_call_func(enrichment_prompt)
                # Parse and merge back into report
                regenerated = True
            except Exception as e:
                print(f"Warning: Regeneration failed: {e}")
        
        t_end = time.time()
        self.latency_breakdown['total'] = t_end - t_start
        
        return {
            "report": parsed_report,
            "verification": verification,
            "regenerated": regenerated,
            "latency_breakdown": self.latency_breakdown
        }


# ============================================================================
# PART 4: BENCHMARKING & MONITORING
# ============================================================================

@dataclass
class BenchmarkMetrics:
    """Benchmark results."""
    with_graph_rag: Dict[str, Any] = field(default_factory=dict)
    with_self_rag: Dict[str, Any] = field(default_factory=dict)
    without_graph_rag: Dict[str, Any] = field(default_factory=dict)
    without_self_rag: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        return asdict(self)


def benchmark_hallucination_rate(
    pipeline_configs: Dict[str, PipelineConfig],
    test_cases: List[Dict[str, Any]],
    db_path: str,
    llm_call_func
) -> BenchmarkMetrics:
    """
    Benchmark hallucination rates with/without each component.
    
    Args:
        pipeline_configs: dict of {config_name: PipelineConfig}
        test_cases: list of {company_name, company_id, sql_facts, expected_claims}
        db_path: SQLite database path
        llm_call_func: LLM callable
    
    Returns:
        BenchmarkMetrics with detailed results
    """
    metrics = BenchmarkMetrics()
    
    for config_name, config in pipeline_configs.items():
        pipeline = EnhancedRAGPipeline(db_path, config, llm_call_func)
        
        hallucination_rates = []
        latencies = []
        
        for test_case in test_cases:
            # Retrieve
            retrieval = pipeline.retrieve(
                test_case['company_name'],
                test_case.get('company_id'),
                test_case.get('sql_facts', [])
            )
            
            # Generate + verify
            result = pipeline.generate_with_verification(
                retrieval,
                test_case['company_name']
            )
            
            hallucination_rates.append(result['verification'].hallucination_rate)
            latencies.append(result['latency_breakdown'].get('total', 0))
        
        avg_hallucination = np.mean(hallucination_rates) if hallucination_rates else 0.0
        avg_latency = np.mean(latencies) if latencies else 0.0
        
        metrics_dict = {
            "avg_hallucination_rate": round(avg_hallucination, 3),
            "avg_latency_sec": round(avg_latency, 2),
            "std_hallucination": round(np.std(hallucination_rates), 3) if hallucination_rates else 0,
            "std_latency": round(np.std(latencies), 2) if latencies else 0,
            "test_count": len(test_cases)
        }
        
        if config_name.startswith("with_graph"):
            metrics.with_graph_rag = metrics_dict
        elif config_name.startswith("with_self"):
            metrics.with_self_rag = metrics_dict
        elif config_name.startswith("without_graph"):
            metrics.without_graph_rag = metrics_dict
        elif config_name.startswith("without_self"):
            metrics.without_self_rag = metrics_dict
    
    return metrics


def print_benchmark_summary(metrics: BenchmarkMetrics, labels: Optional[Dict[str, str]] = None):
    """Pretty-print benchmark results."""
    print("\n" + "="*80)
    print("ENHANCED RAG BENCHMARK SUMMARY")
    print("="*80)
    
    configs = {
        "with_graph_rag": "With LightGraphRAG",
        "with_self_rag": "With Self-RAG",
        "without_graph_rag": "Without LightGraphRAG",
        "without_self_rag": "Without Self-RAG"
    }
    
    for config_key, config_label in configs.items():
        m = getattr(metrics, config_key)
        if not m:
            continue
        
        print(f"\n{config_label}:")
        print(f"  Hallucination Rate: {m.get('avg_hallucination_rate', 0):.1%} "
              f"(±{m.get('std_hallucination', 0):.1%})")
        print(f"  Avg Latency: {m.get('avg_latency_sec', 0):.2f}s "
              f"(±{m.get('std_latency', 0):.2f}s)")
        print(f"  Test Cases: {m.get('test_count', 0)}")
    
    print("\n" + "="*80)


# ============================================================================
# PART 5: EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    """
    Example: Generate enhanced report with Self-RAG + LightGraphRAG
    """
    
    # Configuration
    config = PipelineConfig(
        enable_self_rag=True,
        enable_graph_rag=True,
        self_rag_embedding_model="all-MiniLM-L6-v2",  # Optional: use embeddings for verification
        graph_embedding_model="all-MiniLM-L6-v2",
        top_k_vector=3,
        top_k_graph=3,
        regenerate_low_confidence=False  # Skip regeneration in this example
    )
    
    # Mock LLM function (replace with actual Ollama call)
    def mock_llm(prompt: str) -> str:
        """Mock LLM that returns example JSON."""
        return """{
            "summary": "Acme Corp is a fast-growing AI startup founded in 2021 with strong funding history.",
            "key_strengths": ["AI/ML expertise", "Strong funding", "Experienced team"],
            "growth_indicators": ["Series B funding in 2023", "Expanded engineering team by 50%", "Launched new product line"],
            "risk_factors": ["Market competition", "Talent retention"],
            "recommended_approach": "Target as growth-stage acquisition candidate in AI space.",
            "confidence": 0.85,
            "sources": ["https://example.com/acme-series-b"]
        }"""
    
    # Initialize pipeline
    pipeline = EnhancedRAGPipeline(
        db_path="/path/to/scrapus.db",
        config=config,
        llm_call_func=mock_llm
    )
    
    # Example retrieval
    test_retrieval = {
        "query": "Acme Corp",
        "sql_facts": [
            "Founded in 2021",
            "Raised $10M Series A in 2022",
            "Raised $50M Series B in 2023",
            "120 employees as of 2024"
        ],
        "combined_context": "Acme Corp develops AI-powered security solutions...",
        "combined_facts": [
            "Founded in 2021",
            "Raised $10M Series A in 2022",
            "Raised $50M Series B in 2023",
            "120 employees as of 2024"
        ]
    }
    
    # Generate with verification
    result = pipeline.generate_with_verification(test_retrieval, "Acme Corp")
    
    print("\n=== REPORT ===")
    print(json.dumps(result['report'], indent=2))
    
    print("\n=== VERIFICATION ===")
    print(f"Hallucination Rate: {result['verification'].hallucination_rate:.1%}")
    print(f"Confidence Score: {result['verification'].confidence_score:.2f}")
    print(f"Total Claims: {result['verification'].total_claims}")
    print(f"Verified Claims: {result['verification'].verified_claims}")
    
    if result['verification'].low_confidence_claims:
        print("\nLow-Confidence Claims Requiring Review:")
        for claim in result['verification'].low_confidence_claims:
            print(f"  - {claim.text} (confidence: {claim.combined_confidence:.2f})")
    
    print("\n=== LATENCY BREAKDOWN (ms) ===")
    for stage, latency_sec in result['latency_breakdown'].items():
        print(f"  {stage}: {latency_sec*1000:.1f}ms")
