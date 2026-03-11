# Embedding Models: Representations, Similarity & Fine-tuning

Text embeddings have become the foundational primitive powering modern search, retrieval-augmented generation, and recommendation systems. This article examines how embedding models transform variable-length text into fixed-dimensional vector representations, the training objectives that produce semantically meaningful spaces, and the practical considerations of selecting, evaluating, and fine-tuning embedding models for production AI systems.

## From Words to Vectors: The Embedding Paradigm

The central insight behind text embeddings is deceptively simple: map text into a continuous vector space where semantic similarity corresponds to geometric proximity. What makes modern embedding models powerful is the quality of this mapping -- the degree to which the resulting geometry captures nuanced relationships between concepts, intents, and meaning.

### The Evolution of Text Representations

Early approaches like TF-IDF and BM25 represented documents as sparse vectors over vocabulary terms. While effective for lexical matching, these representations fail to capture synonymy ("car" vs. "automobile") or compositional meaning. Word2Vec (Mikolov et al., 2013) demonstrated that neural networks trained on word co-occurrence could learn dense vectors where semantic relationships emerged as linear directions in the space (the famous "king - man + woman = queen" analogy).

However, word-level embeddings face a fundamental limitation: a single vector per word cannot capture polysemy ("bank" as financial institution vs. riverbank) or compositional meaning at the sentence level. The transformer revolution, beginning with BERT (Devlin et al., 2019), enabled contextual representations where each token's embedding depends on its surrounding context. Yet BERT's native [CLS] token or mean-pooled outputs produce surprisingly poor sentence embeddings out of the box -- a problem that Sentence-BERT (Reimers and Gurevych, 2019) specifically addressed.

### Sentence Transformers Architecture

Sentence-BERT (SBERT) introduced the now-standard approach: a siamese or triplet network architecture where a pre-trained transformer encodes two sentences independently, and a pooling operation (typically mean pooling over token embeddings) produces fixed-size sentence vectors. The key innovation was the training objective -- rather than fine-tuning on downstream tasks with cross-attention between sentence pairs (which is effective but computationally prohibitive for search), SBERT optimizes the pooled representations directly.

The architecture enables efficient similarity computation at inference time. Given a corpus of N documents, you encode each document once. At query time, you encode the query and compute similarity against all document vectors -- an operation that can be accelerated with approximate nearest neighbor (ANN) algorithms.

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('BAAI/bge-large-en-v1.5')

# Encode documents (done once, stored in vector DB)
documents = [
    "Retrieval-augmented generation combines search with LLMs",
    "Photosynthesis converts light energy into chemical energy",
    "Vector databases enable efficient similarity search"
]
doc_embeddings = model.encode(documents, normalize_embeddings=True)

# Encode query (done per request)
query = "How does RAG work?"
query_embedding = model.encode([query], normalize_embeddings=True)

# Compute cosine similarity (dot product when normalized)
similarities = query_embedding @ doc_embeddings.T
```

## Contrastive Learning: The Training Engine

Modern embedding models are predominantly trained with contrastive learning objectives. The core idea, borrowed from computer vision (SimCLR, Chen et al., 2020), is to pull representations of semantically similar pairs closer together while pushing dissimilar pairs apart.

### InfoNCE and In-Batch Negatives

The most common training objective is InfoNCE (Noise Contrastive Estimation), which for a batch of positive pairs (q_i, d_i+) treats all other documents in the batch as negatives:

```
L = -log( exp(sim(q_i, d_i+) / tau) / sum_j(exp(sim(q_i, d_j) / tau)) )
```

where `tau` is a temperature parameter controlling the sharpness of the distribution. This "in-batch negatives" strategy is remarkably efficient -- a batch of 1024 pairs provides 1023 negatives per query for free. The temperature parameter is critical: too high and the model fails to discriminate between similar and dissimilar pairs; too low and gradient signal vanishes for most negatives.

### Hard Negative Mining

Not all negatives are equally useful. Random negatives (e.g., pairing a question about machine learning with a passage about cooking) provide little learning signal since the model can easily distinguish them. Hard negatives -- documents that are superficially similar but not actually relevant -- force the model to learn finer-grained distinctions.

Effective strategies for hard negative mining include:

1. **BM25 negatives**: Retrieve lexically similar but semantically irrelevant documents
2. **Cross-encoder distillation**: Use a more powerful cross-encoder to identify hard negatives
3. **In-batch hard negatives**: Select the highest-scoring negatives within each batch
4. **Mined from previous model checkpoints**: Use an earlier version of the embedding model itself

The E5 model family (Wang et al., 2022) demonstrated that carefully curated training data with hard negatives, combined with a two-stage training process (pre-training on weakly supervised text pairs followed by fine-tuning on labeled data), could achieve state-of-the-art performance.

### Multi-Stage Training

Modern high-performing embedding models typically follow a multi-stage training pipeline:

1. **Pre-training**: Large-scale weakly supervised contrastive learning on naturally occurring text pairs (title-body, question-answer, etc.)
2. **Fine-tuning**: Supervised contrastive learning on curated, high-quality labeled pairs with hard negatives
3. **Distillation** (optional): Training smaller models to mimic the similarity scores of larger cross-encoder teachers

BGE (BAAI General Embedding) models exemplify this approach. They pre-train on large-scale text pairs, fine-tune with carefully mined hard negatives, and add a special instruction prefix mechanism that allows the model to adapt its representation based on the task.

## Similarity Metrics: Geometry of the Embedding Space

The choice of similarity metric defines the geometry of semantic comparison. While closely related mathematically, different metrics have practical implications.

### Cosine Similarity

Cosine similarity measures the angle between two vectors, ignoring magnitude:

```
cos(u, v) = (u . v) / (||u|| * ||v||)
```

Range: [-1, 1]. This is the most commonly used metric for text embeddings because it is magnitude-invariant -- a longer document and a shorter document expressing the same idea will have high similarity regardless of vector norms.

### Dot Product

The raw dot product `u . v` incorporates both direction and magnitude. When vectors are L2-normalized (unit length), dot product equals cosine similarity. Some models (e.g., OpenAI's embeddings) return normalized vectors, making the distinction moot. However, unnormalized dot product can be useful when magnitude encodes relevance signal -- for instance, a model might learn to assign higher magnitude to more "important" or "confident" embeddings.

### Euclidean Distance

L2 distance `||u - v||` measures straight-line distance in the embedding space. For normalized vectors, minimizing L2 distance is equivalent to maximizing cosine similarity (since `||u - v||^2 = 2 - 2 cos(u, v)` when `||u|| = ||v|| = 1`). In practice, Euclidean distance is less commonly used for text retrieval but appears in some clustering applications.

### Practical Impact

```python
import numpy as np

def compare_metrics(u, v):
    cosine = np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v))
    dot = np.dot(u, v)
    euclidean = np.linalg.norm(u - v)

    # For normalized vectors, these are all equivalent rankings
    u_norm = u / np.linalg.norm(u)
    v_norm = v / np.linalg.norm(v)
    assert np.isclose(np.dot(u_norm, v_norm), cosine)

    return {"cosine": cosine, "dot_product": dot, "euclidean": euclidean}
```

The critical insight: always match the metric to what the model was trained with. Using Euclidean distance with a model trained to optimize cosine similarity will produce suboptimal results, even though the ranking may be similar for normalized vectors.

## Matryoshka Representation Learning

A significant practical challenge with embeddings is the trade-off between dimensionality and performance. Higher dimensions capture more information but increase storage costs and slow similarity computation. Matryoshka Representation Learning (MRL), introduced by Kusupati et al. (2022), offers an elegant solution.

### The Nested Doll Principle

MRL trains embedding models so that the first d dimensions of a D-dimensional embedding form a useful d-dimensional embedding on their own. Like Russian nesting dolls (matryoshka), representations at multiple granularities are nested within a single vector.

The training objective modifies the standard contrastive loss to optimize at multiple dimensionalities simultaneously:

```
L_MRL = sum_{d in dims} w_d * L_contrastive(truncate(embeddings, d))
```

where `dims` might be {32, 64, 128, 256, 512, 768} and `w_d` are dimension-specific weights.

### Practical Benefits

The impact is substantial. OpenAI's `text-embedding-3-large` (3072 dimensions) can be truncated to 256 dimensions with only ~4% degradation on retrieval benchmarks. This means:

- **Storage**: 12x reduction in vector database size
- **Search speed**: Proportional speedup in similarity computation
- **Flexibility**: Choose dimensionality based on accuracy-cost trade-off per use case

```python
from openai import OpenAI

client = OpenAI()

# Get full embedding
response = client.embeddings.create(
    model="text-embedding-3-large",
    input="Matryoshka embeddings enable flexible dimensionality",
    dimensions=256  # Truncated from 3072 -- still effective
)
```

## MTEB: The Embedding Benchmark

The Massive Text Embedding Benchmark (Muennighoff et al., 2023) provides a comprehensive evaluation framework spanning 8 task categories and 58+ datasets. Understanding MTEB is essential for informed model selection.

### Task Categories

1. **Retrieval**: Given a query, rank documents by relevance (e.g., MS MARCO, NQ)
2. **Semantic Textual Similarity (STS)**: Score similarity between sentence pairs
3. **Classification**: Use embeddings as features for text classification
4. **Clustering**: Group semantically similar texts
5. **Pair Classification**: Binary similarity decisions (e.g., paraphrase detection)
6. **Reranking**: Reorder a candidate set by relevance
7. **Summarization**: Evaluate summary-document similarity
8. **BitextMining**: Cross-lingual parallel sentence matching

### Reading MTEB Results Critically

Aggregate MTEB scores can be misleading. A model that excels at STS may underperform on retrieval, and vice versa. Key considerations:

- **Retrieval performance** matters most for RAG applications -- focus on nDCG@10 on datasets like MS MARCO, NQ, and BEIR
- **Domain mismatch**: MTEB datasets are predominantly general-domain English; performance on specialized domains (legal, medical, code) may differ dramatically
- **Dimensionality-adjusted performance**: Compare models at the same dimensionality for fair assessment
- **Inference speed**: A model with 2% higher MTEB but 10x slower inference may not be the right choice

## Model Comparison: The Current Landscape

### OpenAI Embeddings

- **text-embedding-3-large**: 3072 dimensions, supports Matryoshka truncation, strong general-purpose performance. Proprietary API, ~$0.13/1M tokens.
- **text-embedding-3-small**: 1536 dimensions, more cost-effective at ~$0.02/1M tokens, with surprisingly competitive retrieval performance.
- Trade-off: Ease of use and consistent quality vs. vendor lock-in and per-request costs.

### Cohere Embed

- **embed-v3**: 1024 dimensions, supports multiple input types (search_document, search_query, classification, clustering), strong multilingual support across 100+ languages.
- The input type distinction is notable -- the model adapts its representation based on how the embedding will be used, similar to BGE's instruction prefix approach.

### BGE (BAAI General Embedding)

- **bge-large-en-v1.5**: 1024 dimensions, open-source, competitive with proprietary models. Trained with RetroMAE pre-training and fine-tuned with hard negatives.
- **bge-m3**: Hybrid model supporting dense retrieval, sparse (lexical) retrieval, and multi-vector (ColBERT-style) retrieval in a single model. 8192 token context.
- Strength: Open-source, self-hostable, no per-request costs at scale.

### E5 Family

- **e5-mistral-7b-instruct**: Uses a 7B LLM backbone, achieving top MTEB scores but at significant computational cost. Demonstrates that larger backbones yield better embeddings.
- **multilingual-e5-large**: Strong multilingual performance, 560M parameters.
- The E5 line of work (Wang et al., 2022) demonstrated the importance of training data curation -- their "Embeddings from Every Angle" approach mines diverse text pairs from web data.

### GTE (General Text Embeddings)

- **gte-Qwen2-7B-instruct**: Built on Qwen2 backbone, competitive with e5-mistral on MTEB. Supports 8192 token context.
- Represents the trend of using instruction-tuned LLMs as embedding backbones.

## Fine-Tuning Embeddings with Synthetic Data

Off-the-shelf embedding models often underperform on domain-specific data. Fine-tuning with task-specific data is the standard remedy, but labeled data is expensive. Synthetic data generation offers a practical path forward.

### The Synthetic Data Pipeline

```python
from openai import OpenAI

client = OpenAI()

def generate_synthetic_queries(document: str, n: int = 5) -> list[str]:
    """Generate synthetic queries that a user might ask, answered by this document."""
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": f"""Given the following document, generate {n} diverse questions
            that this document would answer. Return only the questions, one per line.

            Document: {document}"""
        }],
        temperature=0.7
    )
    return response.choices[0].message.content.strip().split('\n')

# Generate training pairs
training_pairs = []
for doc in domain_documents:
    queries = generate_synthetic_queries(doc)
    for query in queries:
        training_pairs.append({"query": query, "positive": doc})
```

### Fine-Tuning with Sentence Transformers

```python
from sentence_transformers import SentenceTransformer, InputExample, losses
from torch.utils.data import DataLoader

model = SentenceTransformer('BAAI/bge-base-en-v1.5')

# Prepare training data
train_examples = [
    InputExample(texts=[pair["query"], pair["positive"]])
    for pair in training_pairs
]

train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=32)

# MultipleNegativesRankingLoss implements in-batch negatives
train_loss = losses.MultipleNegativesRankingLoss(model)

model.fit(
    train_objectives=[(train_dataloader, train_loss)],
    epochs=3,
    warmup_steps=100,
    output_path='./fine-tuned-embeddings'
)
```

### Key Fine-Tuning Considerations

1. **Don't over-fine-tune**: Embedding models can catastrophically forget general knowledge. Use a low learning rate (1e-5 to 5e-5) and few epochs (1-5).
2. **Batch size matters**: Larger batches provide more in-batch negatives. Use gradient accumulation if GPU memory is limited. A batch size of 256+ is ideal.
3. **Evaluate on held-out data**: Track retrieval metrics (nDCG@10, recall@k) on a held-out set to detect overfitting.
4. **Hard negatives amplify fine-tuning**: Mining hard negatives from BM25 or a previous model checkpoint dramatically improves fine-tuning effectiveness.

## Dimensionality, Context Length, and Practical Trade-offs

### Dimensionality Selection

Higher dimensionality captures more information but with diminishing returns:

| Dimensions | Typical Use Case | Storage per 1M vectors |
|-----------|-----------------|----------------------|
| 256 | Cost-sensitive, large-scale search | ~1 GB |
| 768 | General-purpose, balanced | ~3 GB |
| 1024 | High-accuracy retrieval | ~4 GB |
| 1536-3072 | Maximum recall, small corpora | ~6-12 GB |

For most RAG applications, 768-1024 dimensions provide the best accuracy-cost trade-off. With Matryoshka-trained models, you can start with lower dimensions and scale up if needed.

### Context Length Considerations

Embedding models have maximum context lengths ranging from 512 tokens (older models) to 8192+ tokens (modern models). However, longer inputs don't always produce better embeddings -- the mean-pooling operation can dilute signal when averaging over many tokens. This is why chunking strategy (covered in Article 15) is critical.

## Summary and Key Takeaways

- **Contrastive learning** is the dominant training paradigm for embedding models, with in-batch negatives and hard negative mining being the most impactful design choices.
- **Similarity metrics** (cosine, dot product, euclidean) are closely related for normalized vectors; always match the metric to the model's training objective.
- **Matryoshka embeddings** enable flexible dimensionality trade-offs without retraining, offering significant cost savings.
- **MTEB** is the standard benchmark, but retrieval-specific performance matters most for RAG -- don't over-index on aggregate scores.
- **Open-source models** (BGE, E5, GTE) have largely closed the gap with proprietary offerings (OpenAI, Cohere) and offer cost advantages at scale.
- **Fine-tuning with synthetic data** is a practical, accessible technique for domain adaptation, but requires care to avoid catastrophic forgetting.
- The field is converging on **LLM-backbone embeddings** (7B+ parameter models), which achieve the highest quality but at significant inference cost -- a trade-off that quantization and distillation are actively addressing.
