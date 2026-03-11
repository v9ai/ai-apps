# Search & Recommendations with LLMs

The integration of large language models into search and recommendation systems represents a paradigm shift from keyword matching and collaborative filtering to semantic understanding and generative retrieval. Modern systems combine dense embeddings, learned re-ranking, and LLM-powered query understanding to deliver results that feel almost telepathic. This article examines the architecture patterns, retrieval strategies, and production engineering behind LLM-powered search and recommendation systems.

## Semantic Search Foundations

### From BM25 to Dense Retrieval

Traditional search relies on BM25 (Best Matching 25), a term-frequency-based scoring function that remains remarkably competitive despite its simplicity. BM25 counts how many query terms appear in a document, weighted by inverse document frequency and document length normalization.

Dense retrieval replaces term matching with semantic similarity in embedding space. Instead of asking "do the same words appear?", it asks "do these texts mean the same thing?"

```python
# Traditional BM25 vs. Dense Retrieval comparison

# BM25: Term matching
# Query: "python memory management"
# Matches: Documents containing "python", "memory", "management"
# Misses: "CPython garbage collector reference counting" (semantic match, no term overlap)

# Dense retrieval: Semantic matching
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer('BAAI/bge-large-en-v1.5')

query_embedding = model.encode("python memory management")
doc_embeddings = model.encode([
    "CPython garbage collector reference counting",      # Semantically relevant
    "Python tutorial for beginners",                      # Keyword match, less relevant
    "Managing memory allocations in Python applications", # Both keyword and semantic
    "Java virtual machine memory model",                  # Related concept, wrong language
])

similarities = np.dot(doc_embeddings, query_embedding)
# Dense retrieval correctly ranks the semantic matches higher
```

The key models powering dense retrieval:

- **BGE (BAAI General Embedding)**: Strong open-source embedding models with instruction-tuned variants
- **E5 (Embeddings from bidirectional Encoder rEpresentations)**: Microsoft's embedding models trained with contrastive learning on diverse text pairs
- **Cohere Embed v3**: Commercial embedding model with int8 and binary quantization support
- **OpenAI text-embedding-3-large**: High-dimensional embeddings with Matryoshka representation learning for dimension reduction
- **Nomic Embed**: Open-source model with long context support (8192 tokens)

### Hybrid Retrieval

In practice, neither BM25 nor dense retrieval alone is optimal. Hybrid retrieval combines both:

```python
class HybridRetriever:
    def __init__(self, bm25_index, vector_index, alpha=0.5):
        self.bm25 = bm25_index
        self.vector = vector_index
        self.alpha = alpha  # Weight for dense vs. sparse

    def search(self, query, top_k=20):
        # Sparse retrieval (BM25)
        bm25_results = self.bm25.search(query, top_k=top_k * 2)
        bm25_scores = self.normalize_scores(bm25_results)

        # Dense retrieval (vector similarity)
        query_embedding = self.encoder.encode(query)
        vector_results = self.vector.search(query_embedding, top_k=top_k * 2)
        vector_scores = self.normalize_scores(vector_results)

        # Reciprocal Rank Fusion (RRF) - more robust than linear combination
        combined = self.reciprocal_rank_fusion(
            [bm25_results, vector_results],
            k=60,  # RRF constant
        )

        return combined[:top_k]

    def reciprocal_rank_fusion(self, result_lists, k=60):
        """Combine multiple ranked lists using RRF"""
        scores = defaultdict(float)
        for result_list in result_lists:
            for rank, (doc_id, _) in enumerate(result_list):
                scores[doc_id] += 1.0 / (k + rank + 1)

        return sorted(scores.items(), key=lambda x: -x[1])

    def normalize_scores(self, results):
        """Min-max normalization"""
        if not results:
            return results
        scores = [s for _, s in results]
        min_s, max_s = min(scores), max(scores)
        if max_s == min_s:
            return [(doc_id, 1.0) for doc_id, _ in results]
        return [(doc_id, (s - min_s) / (max_s - min_s)) for doc_id, s in results]
```

Reciprocal Rank Fusion (Cormack et al., 2009) is preferred over linear score combination because it doesn't require score calibration between different retrieval methods - it operates purely on rank positions.

## Re-Ranking with LLMs

### Cross-Encoder Re-Ranking

The retrieve-then-rerank pattern is fundamental to modern search. First-stage retrieval (BM25 + dense) is fast but coarse. A cross-encoder re-ranker then scores each candidate with full query-document attention:

```python
from sentence_transformers import CrossEncoder

# Cross-encoder scores query-document pairs jointly
reranker = CrossEncoder('BAAI/bge-reranker-v2-m3')

query = "how to handle errors in async python"
candidates = first_stage_retrieval(query, top_k=100)

# Score each candidate against the query
pairs = [(query, doc.text) for doc in candidates]
scores = reranker.predict(pairs)

# Re-rank by cross-encoder scores
reranked = sorted(zip(candidates, scores), key=lambda x: -x[1])
final_results = [doc for doc, score in reranked[:10]]
```

Cross-encoders are much slower than bi-encoders (they process query and document together rather than independently) but significantly more accurate because they can model fine-grained interactions between query and document tokens.

### LLM-Based Re-Ranking

Using instruction-following LLMs as re-rankers has emerged as a powerful approach. RankGPT (Sun et al., 2023) demonstrated that LLMs can perform listwise re-ranking by being given a list of passages and asked to order them by relevance:

```python
async def llm_rerank(query, documents, llm_client, window_size=20):
    """Sliding window listwise re-ranking with an LLM"""

    # Process in windows (LLMs struggle with very long lists)
    ranked_docs = list(documents)

    for start in range(0, len(ranked_docs), window_size // 2):
        window = ranked_docs[start:start + window_size]

        prompt = f"""Given the query: "{query}"

Rank the following {len(window)} passages from most relevant to least relevant.
Output only the passage numbers in order, separated by > symbols.

{chr(10).join(f'[{i+1}] {doc.text[:200]}' for i, doc in enumerate(window))}

Ranking:"""

        response = await llm_client.generate(prompt)
        # Parse ranking: "3 > 1 > 5 > 2 > 4"
        order = parse_ranking(response, len(window))

        # Apply the ranking to the window
        reordered_window = [window[i] for i in order]
        ranked_docs[start:start + window_size] = reordered_window

    return ranked_docs
```

### Cohere Rerank API

Cohere's Rerank API provides a production-ready re-ranking service that balances quality and latency:

```python
import cohere

co = cohere.Client("your-api-key")

results = co.rerank(
    query="What is the capital of France?",
    documents=[
        "Paris is the capital of France.",
        "London is the capital of England.",
        "The Eiffel Tower is in Paris.",
        "France is a country in Europe.",
    ],
    model="rerank-english-v3.0",
    top_n=3,
)

for result in results.results:
    print(f"Score: {result.relevance_score:.4f} | {result.document.text}")
```

## Query Understanding

### Query Expansion and Reformulation

LLMs excel at understanding user intent and expanding queries to improve recall:

```python
class LLMQueryProcessor:
    def __init__(self, llm_client):
        self.llm = llm_client

    async def expand_query(self, original_query):
        """Generate multiple query formulations to improve recall"""
        response = await self.llm.generate(
            prompt=f"""Given the search query: "{original_query}"

Generate 3 alternative formulations that capture the same intent
but use different vocabulary. Also identify:
1. Key entities mentioned
2. The likely intent (navigational, informational, transactional)
3. Any implicit constraints

Format as JSON.""",
        )

        expansions = parse_json(response)
        return expansions

    async def decompose_complex_query(self, query):
        """Break complex queries into sub-queries"""
        response = await self.llm.generate(
            prompt=f"""The user searched for: "{query}"

This appears to be a complex query. Break it down into simpler
sub-queries that, when combined, would answer the original question.

Return a JSON array of sub-queries with their relationship
(AND/OR) to the original.""",
        )
        return parse_json(response)

# Example:
# Input: "best laptop under $1000 for machine learning with good battery"
# Output: {
#   "intent": "transactional",
#   "entities": ["laptop"],
#   "constraints": {"price": "<1000", "use_case": "machine learning", "feature": "good battery"},
#   "reformulations": [
#     "budget laptop for deep learning training",
#     "affordable ML development notebook long battery life",
#     "laptop GPU machine learning under 1000 dollars"
#   ],
#   "sub_queries": [
#     {"query": "laptops with GPU under $1000", "relation": "AND"},
#     {"query": "laptop battery life comparison", "relation": "AND"},
#     {"query": "machine learning laptop requirements", "relation": "CONTEXT"}
#   ]
# }
```

### Hypothetical Document Embeddings (HyDE)

HyDE (Gao et al., 2022) is a clever technique that uses an LLM to generate a hypothetical answer to the query, then uses that answer's embedding for retrieval instead of the query embedding:

```python
async def hyde_search(query, llm_client, encoder, vector_store, top_k=10):
    """Hypothetical Document Embedding search"""

    # Step 1: Generate a hypothetical answer
    hypothetical_doc = await llm_client.generate(
        prompt=f"Write a passage that answers the following question: {query}",
        max_tokens=200,
    )

    # Step 2: Encode the hypothetical answer (not the query)
    hyde_embedding = encoder.encode(hypothetical_doc)

    # Step 3: Search with the hypothetical document embedding
    results = vector_store.search(hyde_embedding, top_k=top_k)

    return results

# Why this works:
# - Query: "what causes aurora borealis" (short, question format)
# - Hypothetical doc: "Aurora borealis, or northern lights, are caused by
#   charged particles from the sun interacting with gases in Earth's
#   atmosphere..." (looks like a real document)
# - The hypothetical doc's embedding is closer to real relevant documents
#   than the query embedding would be
```

HyDE works because document-to-document similarity is generally more reliable than query-to-document similarity, since queries and documents live in different "styles" of language.

## Personalization

### User Embedding Models

Personalization in LLM-powered search requires representing user preferences in a way that can interact with content embeddings:

```python
class UserEmbeddingModel:
    def __init__(self, content_encoder, user_dim=256):
        self.content_encoder = content_encoder
        self.user_history_encoder = TransformerEncoder(
            input_dim=content_encoder.output_dim,
            output_dim=user_dim,
            num_layers=2,
        )
        self.projection = nn.Linear(user_dim, content_encoder.output_dim)

    def compute_user_embedding(self, interaction_history):
        """Compute user embedding from interaction history"""
        # Encode interacted items
        item_embeddings = torch.stack([
            self.content_encoder.encode(item)
            for item in interaction_history
        ])

        # Weight by recency and interaction type
        weights = self.compute_attention_weights(interaction_history)
        weighted_embeddings = item_embeddings * weights.unsqueeze(-1)

        # Aggregate into user embedding
        user_emb = self.user_history_encoder(weighted_embeddings)
        return self.projection(user_emb)

    def personalized_search(self, query, user_embedding, alpha=0.3):
        """Blend query relevance with personalization"""
        query_embedding = self.content_encoder.encode(query)

        # Interpolate between query and user preference
        personalized_query = (
            (1 - alpha) * query_embedding +
            alpha * user_embedding
        )

        return self.vector_store.search(personalized_query)
```

### LLM-Based Personalization

LLMs can incorporate user context directly in the prompt for personalized results:

```python
async def personalized_rerank(query, results, user_profile, llm_client):
    """Re-rank results based on user profile and preferences"""

    profile_summary = f"""User Profile:
- Role: {user_profile.role} ({user_profile.experience_level})
- Interests: {', '.join(user_profile.interests)}
- Past purchases: {', '.join(user_profile.recent_purchases[:5])}
- Preferred brands: {', '.join(user_profile.preferred_brands)}
- Price sensitivity: {user_profile.price_sensitivity}
"""

    response = await llm_client.generate(
        prompt=f"""{profile_summary}

Given this user's profile, re-rank these search results for the
query "{query}" from most to least relevant for THIS specific user.

Results:
{format_results(results)}

Consider the user's experience level, interests, and preferences
when ranking. A result that's generally relevant but doesn't match
this user's level or interests should be ranked lower.

Output the result IDs in order:""",
    )

    return parse_and_reorder(response, results)
```

## Embedding-Based Recommendations

### Content-Based Recommendations

The simplest recommendation approach uses content embeddings to find similar items:

```python
class EmbeddingRecommender:
    def __init__(self, item_embeddings, item_metadata):
        self.embeddings = item_embeddings  # {item_id: np.array}
        self.metadata = item_metadata
        self.index = self.build_ann_index()

    def similar_items(self, item_id, top_k=10, filters=None):
        """Find items similar to a given item"""
        query_embedding = self.embeddings[item_id]
        candidates = self.index.search(query_embedding, top_k=top_k * 3)

        # Apply filters (category, price range, availability)
        if filters:
            candidates = [
                (id, score) for id, score in candidates
                if self.passes_filters(id, filters)
            ]

        return candidates[:top_k]

    def user_recommendations(self, user_interactions, top_k=20):
        """Recommend items based on user's interaction history"""
        # Compute user preference vector as weighted average
        # of interacted item embeddings
        weights = []
        embeddings = []
        for interaction in user_interactions:
            weight = self.interaction_weight(interaction)
            embeddings.append(self.embeddings[interaction.item_id])
            weights.append(weight)

        weights = np.array(weights)
        weights = weights / weights.sum()
        user_vector = np.average(embeddings, axis=0, weights=weights)

        # Find items close to user preference vector
        candidates = self.index.search(user_vector, top_k=top_k * 3)

        # Filter out already-interacted items
        seen = {i.item_id for i in user_interactions}
        candidates = [(id, s) for id, s in candidates if id not in seen]

        return candidates[:top_k]

    def interaction_weight(self, interaction):
        """Weight interactions by type and recency"""
        type_weights = {
            "purchase": 5.0,
            "add_to_cart": 3.0,
            "long_view": 2.0,  # Viewed for >30s
            "click": 1.0,
            "impression": 0.1,
        }
        recency_decay = np.exp(-0.01 * interaction.days_ago)
        return type_weights.get(interaction.type, 1.0) * recency_decay
```

### Collaborative Filtering Meets LLMs

Traditional collaborative filtering (CF) finds users with similar behavior patterns and recommends what those similar users liked. LLMs can enhance CF in several ways:

**LLM-enriched item representations**: Instead of using sparse interaction data alone, use LLMs to generate rich item descriptions from metadata, reviews, and content:

```python
async def enrich_item_embedding(item, llm_client, encoder):
    """Create a rich item embedding by combining structured metadata
    with LLM-generated descriptions"""

    # Generate a comprehensive item description
    description = await llm_client.generate(
        prompt=f"""Describe this product in a way that captures its
key characteristics, target audience, and use cases:

Title: {item.title}
Category: {item.category}
Price: ${item.price}
Specs: {item.specs}
Top review excerpts: {item.top_reviews[:3]}

Write 2-3 sentences:""",
    )

    # Combine structured features with semantic embedding
    text_embedding = encoder.encode(description)
    categorical_features = encode_categorical(item.category, item.brand)
    numerical_features = normalize([item.price, item.rating, item.review_count])

    combined = np.concatenate([
        text_embedding * 0.6,
        categorical_features * 0.25,
        numerical_features * 0.15,
    ])

    return combined / np.linalg.norm(combined)
```

**Conversational recommendations**: LLMs can elicit preferences through dialogue rather than relying solely on behavioral data:

```
User: I'm looking for a new book to read
Bot:  I'd love to help! To give you a great recommendation:
      - What genres do you enjoy? (fiction, non-fiction, sci-fi, etc.)
      - What's the last book you really loved?
      - Are you in the mood for something light or thought-provoking?

User: I loved Project Hail Mary. Something similar but maybe more
      philosophical.

Bot:  Based on your love of Project Hail Mary's mix of science,
      problem-solving, and heart, here are some recommendations
      that lean more philosophical:

      1. "Blindsight" by Peter Watts - Hard sci-fi that deeply
         explores consciousness and what it means to be intelligent
      2. "Children of Time" by Adrian Tchaikovsky - Evolution and
         intelligence from a non-human perspective
      3. "The Three-Body Problem" by Liu Cixin - Physics-driven
         sci-fi with deep philosophical undertones

      Which of these sounds most interesting to you?
```

## Production Search Architecture

### System Architecture

A production LLM-powered search system has multiple layers:

```
User Query
    |
    v
[Query Processing Layer]
  - Query understanding (intent, entities)
  - Query expansion (HyDE, reformulation)
  - Spell correction and normalization
    |
    v
[Retrieval Layer - fast, high recall]
  - BM25 (Elasticsearch/OpenSearch)
  - Dense retrieval (vector DB: Pinecone, Weaviate, Qdrant)
  - Reciprocal Rank Fusion to combine
  - Target: retrieve top 100-500 candidates in <50ms
    |
    v
[Re-Ranking Layer - slower, high precision]
  - Cross-encoder re-ranking (top 100 -> top 20)
  - Optional: LLM re-ranking (top 20 -> top 10)
  - Personalization adjustments
  - Business rule application (boosting, filtering)
  - Target: <200ms for cross-encoder, <1s for LLM
    |
    v
[Presentation Layer]
  - Result formatting
  - Snippet generation / highlight extraction
  - Optional: LLM-generated answer synthesis (RAG)
  - Facet computation
    |
    v
User Results
```

### Indexing Pipeline

```python
class SearchIndexingPipeline:
    def __init__(self):
        self.text_processor = TextProcessor()
        self.embedding_model = SentenceTransformer('BAAI/bge-large-en-v1.5')
        self.bm25_index = ElasticsearchIndex()
        self.vector_index = QdrantIndex()

    async def index_document(self, document):
        # 1. Extract and clean text
        text = self.text_processor.extract(document)
        chunks = self.text_processor.chunk(
            text,
            chunk_size=512,
            chunk_overlap=50,
            strategy="semantic",  # Split at paragraph/section boundaries
        )

        # 2. Generate embeddings
        embeddings = self.embedding_model.encode(
            [chunk.text for chunk in chunks],
            batch_size=32,
            show_progress_bar=False,
        )

        # 3. Index in both stores (parallel)
        await asyncio.gather(
            self.bm25_index.index(document.id, chunks),
            self.vector_index.upsert([
                {
                    "id": f"{document.id}_{i}",
                    "vector": embedding.tolist(),
                    "payload": {
                        "document_id": document.id,
                        "chunk_index": i,
                        "text": chunk.text,
                        "metadata": document.metadata,
                    },
                }
                for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
            ]),
        )

    async def bulk_index(self, documents, batch_size=100):
        """Index documents in batches for efficiency"""
        for batch in chunked(documents, batch_size):
            await asyncio.gather(*[
                self.index_document(doc) for doc in batch
            ])
```

### Embedding Model Selection and Evaluation

Choosing the right embedding model requires evaluation on your specific domain:

```python
class EmbeddingModelEvaluator:
    def __init__(self, test_queries, relevance_judgments):
        self.queries = test_queries
        self.judgments = relevance_judgments  # {query_id: {doc_id: relevance}}

    def evaluate_model(self, model_name, encoder):
        metrics = {
            "ndcg@10": [],
            "mrr": [],
            "recall@100": [],
            "encoding_speed": [],
            "embedding_dim": encoder.get_sentence_embedding_dimension(),
        }

        for query in self.queries:
            # Measure encoding speed
            start = time.time()
            query_emb = encoder.encode(query.text)
            metrics["encoding_speed"].append(time.time() - start)

            # Retrieve and evaluate
            results = self.vector_store.search(query_emb, top_k=100)
            relevant = self.judgments[query.id]

            metrics["ndcg@10"].append(
                ndcg_score(results[:10], relevant)
            )
            metrics["mrr"].append(
                reciprocal_rank(results, relevant)
            )
            metrics["recall@100"].append(
                recall(results[:100], relevant)
            )

        return {k: np.mean(v) for k, v in metrics.items()}
```

Key evaluation metrics:
- **NDCG@k** (Normalized Discounted Cumulative Gain): Measures ranking quality, accounting for position
- **MRR** (Mean Reciprocal Rank): Where the first relevant result appears
- **Recall@k**: What fraction of relevant documents are in the top k results
- **Latency**: Encoding speed and search speed matter for production

### Scaling Vector Search

Production vector search at scale (millions to billions of embeddings) requires careful engineering:

**Approximate Nearest Neighbor (ANN) algorithms**:
- **HNSW** (Hierarchical Navigable Small World): Best recall/speed tradeoff for most use cases. Used by Qdrant, Weaviate, pgvector.
- **IVF** (Inverted File Index): Partitions the space into clusters. Good for very large datasets. Used by FAISS.
- **ScaNN** (Scalable Nearest Neighbors): Google's library optimized for high-dimensional vectors.

**Quantization** reduces memory and improves speed:
- **Product Quantization (PQ)**: Compress 768-dim float32 vectors from 3KB to ~64 bytes
- **Binary Quantization**: Reduce to 1 bit per dimension (96 bytes for 768-dim), 32x memory reduction with ~5% recall loss
- **Matryoshka embeddings**: Models like text-embedding-3 support truncating dimensions (e.g., use 256 dims instead of 3072) with graceful quality degradation

```python
# Qdrant with quantization for cost-effective large-scale search
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams, Distance, QuantizationConfig,
    ScalarQuantization, ScalarType,
)

client = QdrantClient(url="http://localhost:6333")

client.create_collection(
    collection_name="products",
    vectors_config=VectorParams(
        size=1024,
        distance=Distance.COSINE,
    ),
    quantization_config=QuantizationConfig(
        scalar=ScalarQuantization(
            type=ScalarType.INT8,
            quantile=0.99,
            always_ram=True,  # Keep quantized vectors in RAM
        ),
    ),
    # Enable on-disk storage for original vectors (used for re-scoring)
    on_disk_payload=True,
)
```

## Evaluation and Monitoring

### Online Metrics

Production search systems need continuous monitoring:

```python
class SearchMetrics:
    def track_search(self, query, results, user_actions):
        self.emit({
            # Query metrics
            "query_length": len(query.split()),
            "has_results": len(results) > 0,
            "num_results": len(results),

            # Engagement metrics
            "click_through_rate": user_actions.clicks / len(results),
            "mean_reciprocal_rank": self.mrr(user_actions.clicked_positions),
            "clicks_at_position": user_actions.clicked_positions,

            # Satisfaction proxies
            "reformulation_rate": user_actions.reformulated,  # User searched again
            "dwell_time": user_actions.time_on_clicked_result,
            "bounce_rate": user_actions.returned_to_results_quickly,

            # Performance
            "retrieval_latency_ms": results.retrieval_time,
            "reranking_latency_ms": results.reranking_time,
            "total_latency_ms": results.total_time,
        })
```

### Offline Evaluation

Regular offline evaluation ensures model and index quality:

1. **Build evaluation sets**: Collect query-relevance pairs from click logs, human annotations, or LLM-generated judgments
2. **Test retrieval recall**: Ensure the first-stage retriever captures relevant documents
3. **Test re-ranking precision**: Ensure the re-ranker correctly promotes relevant results
4. **Regression testing**: Compare new models/configs against baselines before deployment
5. **Freshness testing**: Verify that new content is discoverable within expected time frames

## Summary and Key Takeaways

- **Hybrid retrieval** combining BM25 and dense search with Reciprocal Rank Fusion provides the best retrieval quality; neither alone is sufficient for production systems
- **Re-ranking** with cross-encoders or LLMs dramatically improves precision on the top results; the retrieve-then-rerank pattern is the standard architecture for high-quality search
- **Query understanding** with LLMs enables expansion, reformulation, and intent detection that traditional NLP pipelines cannot match; HyDE is a particularly effective technique for bridging the query-document gap
- **Personalization** can be achieved through user embedding models that blend with query embeddings, or through LLM-based re-ranking that considers user profiles
- **Embedding model selection** should be based on domain-specific evaluation, not just benchmark scores; the MTEB leaderboard is a starting point but not the final word
- **Vector search at scale** requires ANN indexes (HNSW is the default choice), quantization for memory efficiency, and careful capacity planning
- **Production monitoring** must track both system metrics (latency, throughput) and quality metrics (click-through rate, reformulation rate, dwell time)
- The frontier is moving toward end-to-end generative retrieval, where LLMs directly generate document identifiers, but retrieve-and-rerank remains the practical architecture for most production systems today
