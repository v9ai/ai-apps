# Retrieval Strategies: Hybrid Search, Reranking & HyDE

The retrieval stage of a RAG pipeline determines the upper bound on answer quality -- an LLM cannot reason over information it never receives. Yet the design space for retrieval is vast: dense vs. sparse representations, single-stage vs. multi-stage pipelines, query-centric vs. document-centric approaches. This article provides a rigorous examination of modern retrieval strategies, from foundational hybrid search architectures through advanced techniques like Hypothetical Document Embeddings (HyDE) and learned reranking, grounded in both research findings and production experience.

## Dense vs. Sparse Retrieval: Complementary Strengths

Understanding when and why dense and sparse retrieval methods fail differently is essential for building robust retrieval systems.

### Sparse Retrieval: BM25 and Its Descendants

BM25 (Robertson and Zaragoza, 2009) remains the most widely deployed retrieval algorithm. It scores documents based on term frequency (TF), inverse document frequency (IDF), and document length normalization:

```
BM25(q, d) = sum_{t in q} IDF(t) * (tf(t,d) * (k1 + 1)) / (tf(t,d) + k1 * (1 - b + b * |d|/avgdl))
```

where `k1` (typically 1.2-2.0) controls term frequency saturation and `b` (typically 0.75) controls length normalization.

**Strengths of sparse retrieval**:
- Exact term matching: "CUDA 12.3 compatibility" retrieves documents containing those exact terms
- No training required: works out of the box on any corpus
- Interpretable: you can inspect which terms contributed to the score
- Handles rare terms well: domain-specific terminology, proper nouns, error codes

**Failure modes**:
- Vocabulary mismatch: query "car repair" won't match "automobile maintenance"
- Semantic understanding: "animals that can fly" won't match documents about birds that never use the word "fly"
- No understanding of negation or qualification

### Dense Retrieval: Semantic Matching

Dense retrieval encodes queries and documents into learned vector representations, with similarity computed as dot product or cosine similarity. Models like DPR (Karpukhin et al., 2020), Contriever (Izacard et al., 2022), and modern embedding models (BGE, E5, GTE) have dramatically improved dense retrieval quality.

**Strengths of dense retrieval**:
- Semantic matching: understands synonyms, paraphrases, conceptual similarity
- Cross-lingual transfer: multilingual models enable retrieval across languages
- Generalizable: pre-trained models transfer across domains

**Failure modes**:
- Rare entities and terms: embeddings of infrequent tokens are poorly calibrated
- Exact match requirements: searching for "error code 0x80070005" may miss exact matches in favor of semantically similar but incorrect error descriptions
- Out-of-distribution queries: performance degrades on domains far from training data
- Sensitivity to query formulation: semantically equivalent queries can produce different results

### The Complementarity Argument

Dense and sparse methods fail on different queries. Empirical analysis on the BEIR benchmark (Thakur et al., 2021) shows that on datasets like TREC-COVID and SciFact, BM25 outperforms many dense retrievers. On Natural Questions and MS MARCO, dense retrievers dominate. The correlation between their error sets is surprisingly low -- meaning they frequently disagree on which documents are relevant.

This complementarity is the fundamental motivation for hybrid search.

## Hybrid Search Architecture

### Reciprocal Rank Fusion (RRF)

RRF (Cormack et al., 2009) is the most commonly used fusion method due to its simplicity and robustness. It combines rankings without requiring score normalization:

```python
def reciprocal_rank_fusion(
    rankings: list[list[str]],
    k: int = 60,
    weights: list[float] = None
) -> list[tuple[str, float]]:
    """
    Fuse multiple ranked lists using Reciprocal Rank Fusion.

    Args:
        rankings: List of ranked document ID lists (best first)
        k: RRF constant (default 60, from original paper)
        weights: Optional weights per ranking source
    """
    if weights is None:
        weights = [1.0] * len(rankings)

    fused_scores: dict[str, float] = {}

    for ranking, weight in zip(rankings, weights):
        for rank, doc_id in enumerate(ranking):
            if doc_id not in fused_scores:
                fused_scores[doc_id] = 0.0
            fused_scores[doc_id] += weight / (k + rank + 1)

    # Sort by fused score descending
    sorted_results = sorted(fused_scores.items(), key=lambda x: x[1], reverse=True)
    return sorted_results
```

The constant `k` controls how much rank position matters. With k=60, the difference between rank 1 and rank 2 is small (1/61 vs 1/62), making RRF relatively rank-stable. Lower k values amplify the importance of top positions.

**Why RRF works well**: It doesn't require score normalization between different retrieval systems (which have incomparable score scales). It's robust to one system returning many irrelevant results (they receive low RRF scores). And it's simple to implement, debug, and reason about.

### Weighted Linear Combination

An alternative to RRF normalizes scores from each source and combines them linearly:

```python
def weighted_combination(
    vector_results: list[tuple[str, float]],  # (doc_id, similarity_score)
    bm25_results: list[tuple[str, float]],     # (doc_id, bm25_score)
    alpha: float = 0.7                          # weight for vector search
) -> list[tuple[str, float]]:
    """Combine dense and sparse scores with min-max normalization."""

    def normalize(results):
        scores = [s for _, s in results]
        min_s, max_s = min(scores), max(scores)
        if max_s == min_s:
            return [(doc_id, 1.0) for doc_id, _ in results]
        return [(doc_id, (s - min_s) / (max_s - min_s)) for doc_id, s in results]

    norm_vector = dict(normalize(vector_results))
    norm_bm25 = dict(normalize(bm25_results))

    all_docs = set(norm_vector.keys()) | set(norm_bm25.keys())

    combined = []
    for doc_id in all_docs:
        score = alpha * norm_vector.get(doc_id, 0.0) + (1 - alpha) * norm_bm25.get(doc_id, 0.0)
        combined.append((doc_id, score))

    return sorted(combined, key=lambda x: x[1], reverse=True)
```

The alpha parameter requires tuning per use case. For technical documentation with precise terminology, lower alpha (more BM25 weight) often works better. For conversational queries, higher alpha (more vector weight) is typically preferred.

### Production Hybrid Search Pipeline

```python
class HybridSearchPipeline:
    def __init__(self, vector_store, bm25_index, reranker=None):
        self.vector_store = vector_store
        self.bm25_index = bm25_index
        self.reranker = reranker

    async def search(
        self,
        query: str,
        top_k: int = 10,
        candidate_multiplier: int = 3,
        alpha: float = 0.7
    ) -> list[dict]:
        """Full hybrid search pipeline with optional reranking."""
        n_candidates = top_k * candidate_multiplier

        # Stage 1: Parallel retrieval
        vector_results, bm25_results = await asyncio.gather(
            self.vector_store.search(query, limit=n_candidates),
            self.bm25_index.search(query, limit=n_candidates)
        )

        # Stage 2: Fusion
        fused = reciprocal_rank_fusion(
            [
                [r.id for r in vector_results],
                [r.id for r in bm25_results]
            ],
            weights=[alpha, 1 - alpha]
        )

        # Stage 3: Optional reranking
        if self.reranker:
            candidates = [self.get_document(doc_id) for doc_id, _ in fused[:n_candidates]]
            reranked = self.reranker.rerank(query, candidates, top_k=top_k)
            return reranked

        return [self.get_document(doc_id) for doc_id, _ in fused[:top_k]]
```

## Reranking: The Second Stage

First-stage retrieval (dense, sparse, or hybrid) prioritizes recall -- casting a wide net. Reranking prioritizes precision -- selecting the best results from the candidate set using a more powerful (and expensive) model.

### Cross-Encoder Reranking

Cross-encoders process the query-document pair jointly through a transformer, enabling full attention between query and document tokens. This is fundamentally more powerful than bi-encoder (embedding) approaches, which encode query and document independently.

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-12-v2')

def rerank(query: str, documents: list[str], top_k: int = 5) -> list[tuple[str, float]]:
    """Rerank documents using a cross-encoder."""
    # Create query-document pairs
    pairs = [[query, doc] for doc in documents]

    # Score all pairs
    scores = reranker.predict(pairs)

    # Sort by score
    scored_docs = list(zip(documents, scores))
    scored_docs.sort(key=lambda x: x[1], reverse=True)

    return scored_docs[:top_k]
```

**Why cross-encoders outperform bi-encoders**: In a bi-encoder, the query embedding and document embedding are computed independently -- there's no mechanism for the model to attend from a specific query term to specific document terms. A cross-encoder sees both simultaneously, enabling it to resolve ambiguities ("bank" in the context of "river bank" vs. "bank account") and assess fine-grained relevance.

**The cost trade-off**: Cross-encoders are O(N) in the number of candidates, computing a full transformer forward pass per pair. For 100 candidates with a 12-layer model, this takes ~50-200ms on a GPU. This is why reranking is a second stage applied to a small candidate set, not a first-stage retrieval method.

### Cohere Rerank

Cohere offers a managed reranking API that achieves strong performance without infrastructure management:

```python
import cohere

co = cohere.Client("your-api-key")

results = co.rerank(
    model="rerank-english-v3.0",
    query="What is the capital of France?",
    documents=[
        "Paris is the capital of France.",
        "Berlin is the capital of Germany.",
        "France is a country in Western Europe."
    ],
    top_n=2,
    return_documents=True
)

for result in results.results:
    print(f"Score: {result.relevance_score:.4f} | {result.document.text}")
```

### ColBERT: Late Interaction Reranking

ColBERT (Khattab and Zaharia, 2020) represents an intermediate approach between bi-encoders and cross-encoders. It encodes query and document independently (like a bi-encoder), but retains per-token embeddings (rather than pooling into a single vector). Relevance is computed via "late interaction" -- a MaxSim operation:

```
Score(q, d) = sum_{i in q_tokens} max_{j in d_tokens} sim(q_i, d_j)
```

For each query token, find the most similar document token, then sum these maximum similarities. This captures fine-grained term-level matching while maintaining the efficiency of independent encoding.

**ColBERTv2** (Santhanam et al., 2022) adds residual compression, reducing storage requirements by 6-10x while maintaining effectiveness.

```python
from colbert import Searcher
from colbert.infra import ColBERTConfig

config = ColBERTConfig(
    nbits=2,  # Quantization for storage efficiency
    doc_maxlen=300,
    query_maxlen=32
)

searcher = Searcher(index="my_index", config=config)
results = searcher.search("retrieval augmented generation", k=10)
```

**Trade-offs**: ColBERT provides better ranking quality than bi-encoders with lower latency than cross-encoders. The main cost is storage -- retaining per-token embeddings requires ~100x more storage than single-vector representations.

## HyDE: Hypothetical Document Embeddings

HyDE (Gao et al., 2022) addresses a fundamental asymmetry in retrieval: queries and documents are different kinds of text. A query like "What causes aurora borealis?" is short and interrogative, while the relevant document is a long, declarative explanation. Their embedding space locations may be far apart even when semantically related.

### The HyDE Approach

HyDE uses an LLM to generate a hypothetical document that would answer the query, then embeds this generated document for retrieval:

```python
from openai import OpenAI

client = OpenAI()

def hyde_retrieval(query: str, vector_store, embedding_model, top_k: int = 5):
    """Retrieve using Hypothetical Document Embeddings."""

    # Step 1: Generate a hypothetical answer document
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": f"""Write a short, detailed passage that would answer this question.
            Write as if this is from an authoritative source.
            Do not include phrases like "the answer is" -- just provide the information directly.

            Question: {query}"""
        }],
        temperature=0.7
    )
    hypothetical_doc = response.choices[0].message.content

    # Step 2: Embed the hypothetical document (not the query)
    hyde_embedding = embedding_model.encode(hypothetical_doc)

    # Step 3: Search with the hypothetical document embedding
    results = vector_store.search(hyde_embedding, limit=top_k)

    return results, hypothetical_doc
```

### Why HyDE Works

The generated document, even if factually incorrect, is linguistically similar to real documents in the corpus. It uses the vocabulary, structure, and phrasing that actual documents use. This means its embedding is closer to relevant documents in the embedding space than the original query would be.

Gao et al. (2022) showed that HyDE improves retrieval on 11 out of 11 evaluation datasets, with particularly large gains on tasks where the query-document vocabulary gap is largest.

### HyDE Limitations and When to Avoid It

- **Latency**: Requires an LLM call before retrieval, adding 200-2000ms
- **Cost**: Every search query incurs an LLM API call
- **Hallucination risk**: If the LLM generates a plausible but wrong hypothetical document, retrieval may be biased toward documents that confirm the hallucination
- **Simple factual queries**: "What is the population of Tokyo?" doesn't benefit from HyDE -- the query is already in the right form
- **Best for**: Complex, conceptual queries where the information need is abstract ("How does attention mechanism differ from traditional sequence-to-sequence models?")

## Query Expansion and Transformation

### Multi-Query Retrieval

A single query may not capture all aspects of an information need. Multi-query retrieval generates multiple reformulations and retrieves against each:

```python
def multi_query_retrieval(
    query: str,
    vector_store,
    embedding_model,
    n_queries: int = 3,
    top_k: int = 10
) -> list[dict]:
    """Generate multiple query variants and merge results."""

    # Generate query variants
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": f"""Generate {n_queries} different versions of this search query
            that capture different aspects or phrasings of the same information need.
            Return only the queries, one per line.

            Original query: {query}"""
        }]
    )
    queries = [query] + response.choices[0].message.content.strip().split('\n')

    # Retrieve for each query
    all_rankings = []
    for q in queries:
        embedding = embedding_model.encode(q)
        results = vector_store.search(embedding, limit=top_k * 2)
        all_rankings.append([r.id for r in results])

    # Fuse results using RRF
    fused = reciprocal_rank_fusion(all_rankings)

    return [vector_store.get(doc_id) for doc_id, _ in fused[:top_k]]
```

### Query Decomposition

For complex queries, decomposing into sub-queries can improve retrieval:

```python
def decompose_query(query: str) -> list[str]:
    """Decompose a complex query into simpler sub-queries."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": f"""Break this complex question into simpler sub-questions that,
            when answered together, would answer the original question.
            Return only the sub-questions, one per line.

            Question: {query}"""
        }]
    )
    sub_queries = response.choices[0].message.content.strip().split('\n')
    return sub_queries

# Example:
# "How does transformer attention compare to LSTM for long sequences?"
# -> "How does transformer attention work?"
# -> "How do LSTMs process sequences?"
# -> "What are the limitations of LSTMs for long sequences?"
# -> "What are the limitations of transformers for long sequences?"
```

### Step-Back Prompting for Retrieval

Step-back prompting (Zheng et al., 2023) generates a more abstract version of the query before retrieval. Instead of searching for "Why does my Python Flask app crash with a 502 error on Heroku?", a step-back query might be "Common causes of 502 errors in Python web applications deployed to cloud platforms." The more abstract query is more likely to match general reference documents.

```python
def step_back_query(query: str) -> str:
    """Generate a more abstract version of the query."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": f"""Given this specific question, generate a more general question
            that would help find background information useful for answering the original.

            Specific question: {query}
            General question:"""
        }]
    )
    return response.choices[0].message.content.strip()
```

## Retrieval-Aware Prompting

How you present retrieved documents to the LLM significantly impacts answer quality.

### Document Ordering

Research by Liu et al. (2023) in "Lost in the Middle" demonstrated that LLMs are sensitive to the position of relevant information in the context. Models tend to better utilize information presented at the beginning or end of the context, with degraded performance for information in the middle. Practical implications:

- Place the most relevant documents first and last
- Consider duplicating the most relevant document at both positions
- For long contexts with many documents, alternate relevant and less-relevant documents

### Citation and Grounding

Instruct the LLM to cite its sources by chunk ID or index, enabling verification:

```python
def rag_prompt(query: str, documents: list[dict]) -> str:
    """Build a RAG prompt with citation instructions."""
    context = "\n\n".join([
        f"[Document {i+1}]: {doc['text']}"
        for i, doc in enumerate(documents)
    ])

    return f"""Answer the question based on the provided documents.
Cite your sources using [Document N] notation.
If the documents don't contain enough information, say so.

Documents:
{context}

Question: {query}
Answer:"""
```

## Putting It All Together: A Multi-Stage Pipeline

```python
class AdvancedRetrievalPipeline:
    """Production retrieval pipeline with multiple stages."""

    async def retrieve(self, query: str, top_k: int = 5) -> list[dict]:
        # Stage 0: Query analysis and transformation
        query_type = self.classify_query(query)

        if query_type == "complex":
            sub_queries = decompose_query(query)
            queries = [query] + sub_queries
        elif query_type == "conceptual":
            hyde_doc = self.generate_hyde(query)
            queries = [query, hyde_doc]
        else:
            queries = [query]

        # Stage 1: Multi-source retrieval
        all_rankings = []
        for q in queries:
            vector_results = await self.vector_store.search(q, limit=top_k * 5)
            bm25_results = await self.bm25_index.search(q, limit=top_k * 5)
            all_rankings.extend([
                [r.id for r in vector_results],
                [r.id for r in bm25_results]
            ])

        # Stage 2: Fusion
        fused = reciprocal_rank_fusion(all_rankings)
        candidates = [self.get_document(doc_id) for doc_id, _ in fused[:top_k * 3]]

        # Stage 3: Reranking
        reranked = self.reranker.rerank(query, candidates, top_k=top_k)

        # Stage 4: Deduplication and diversity
        final = self.deduplicate_and_diversify(reranked, top_k)

        return final
```

## Summary and Key Takeaways

- **Hybrid search** (dense + sparse) outperforms either approach alone because they fail on different queries. This should be the default architecture.
- **BM25 remains essential** for exact term matching, rare entities, and domain-specific terminology. Don't discard it in favor of pure vector search.
- **Reciprocal Rank Fusion** is the simplest and most robust fusion method. Start with RRF before exploring learned fusion.
- **Cross-encoder reranking** provides the largest quality improvement per engineering hour. Even a simple reranker applied to top-30 candidates significantly improves top-5 precision.
- **ColBERT** offers a compelling middle ground between bi-encoder efficiency and cross-encoder quality, particularly for latency-sensitive applications.
- **HyDE** is most valuable for complex, conceptual queries where query-document vocabulary gap is large. Avoid it for simple factual queries due to latency and cost overhead.
- **Multi-query retrieval** is a low-cost, high-impact technique. Generating 3-5 query variants and fusing results consistently improves recall.
- **Query decomposition** is essential for complex, multi-faceted questions that no single retrieval hit can fully answer.
- The retrieval pipeline is not static: monitor retrieval quality metrics (recall@k, nDCG) and adapt strategies based on observed failure modes.
