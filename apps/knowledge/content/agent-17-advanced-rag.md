# Advanced RAG: Agentic, Graph-Based & Multi-Hop Retrieval

Standard RAG pipelines follow a linear retrieve-then-generate pattern that works well for single-hop factual questions but breaks down for complex information needs requiring synthesis across multiple documents, reasoning over relationships, or dynamic retrieval strategies. This article examines the frontier of RAG research and practice -- agentic retrieval that makes iterative decisions, graph-structured knowledge retrieval, and self-correcting systems that detect and recover from retrieval failures.

## The Limitations of Naive RAG

Before examining advanced patterns, it is worth understanding precisely where simple retrieve-then-generate fails.

**Single retrieval pass**: A query like "Compare the environmental policies of the EU and US regarding carbon markets" requires retrieving information about EU policies and US policies separately. A single embedding-based retrieval may return documents about one but not the other.

**No reasoning over retrieval quality**: If retrieved documents are irrelevant, the LLM either hallucinates an answer or produces a vague non-answer. There is no mechanism to recognize retrieval failure and try again with a different strategy.

**No relationship awareness**: Questions like "Which companies funded by Sequoia went public in 2023?" require understanding the relationship between funding rounds and IPO events across multiple documents. Flat retrieval treats each document independently.

**Fixed retrieval strategy**: The same embedding similarity search is applied whether the query needs a code example, a statistical fact, or a conceptual explanation. Different information types may require different retrieval approaches.

## Agentic RAG Patterns

Agentic RAG transforms retrieval from a single function call into an iterative reasoning process where an LLM agent decides what to retrieve, evaluates the results, and adapts its strategy.

### Query Routing

The simplest agentic pattern: classify the query and route it to the appropriate retrieval pipeline.

```python
from enum import Enum
from pydantic import BaseModel

class QueryType(str, Enum):
    FACTUAL = "factual"          # Direct fact lookup
    CONCEPTUAL = "conceptual"    # Explanation/understanding
    COMPARATIVE = "comparative"  # Compare multiple entities
    PROCEDURAL = "procedural"    # How-to / step-by-step
    ANALYTICAL = "analytical"    # Requires reasoning over data

class QueryRoute(BaseModel):
    query_type: QueryType
    sub_queries: list[str]
    data_sources: list[str]

def route_query(query: str) -> QueryRoute:
    """Use an LLM to analyze and route the query."""
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "system",
            "content": """Analyze the query and determine:
            1. Query type (factual, conceptual, comparative, procedural, analytical)
            2. Sub-queries needed to fully answer it
            3. Which data sources to search (docs, code, api_reference, changelog)"""
        }, {
            "role": "user",
            "content": query
        }],
        response_format={"type": "json_object"}
    )
    return QueryRoute.model_validate_json(response.choices[0].message.content)
```

### Tool-Augmented Retrieval

A more powerful pattern gives the LLM agent access to retrieval as a tool, allowing it to make multiple retrieval calls with different queries and strategies:

```python
import json

tools = [
    {
        "type": "function",
        "function": {
            "name": "vector_search",
            "description": "Search documents by semantic similarity",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "collection": {"type": "string", "enum": ["docs", "code", "api"]},
                    "top_k": {"type": "integer", "default": 5}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "keyword_search",
            "description": "Search documents by exact keyword matching (BM25)",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "filters": {
                        "type": "object",
                        "properties": {
                            "date_range": {"type": "string"},
                            "category": {"type": "string"}
                        }
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "lookup_entity",
            "description": "Look up a specific entity (person, company, concept) in the knowledge graph",
            "parameters": {
                "type": "object",
                "properties": {
                    "entity_name": {"type": "string"},
                    "relation_type": {"type": "string", "enum": ["all", "funded_by", "competes_with", "authored"]}
                },
                "required": ["entity_name"]
            }
        }
    }
]

async def agentic_rag(query: str, max_iterations: int = 5) -> str:
    """RAG with an agent loop -- the LLM decides what to retrieve."""
    messages = [
        {"role": "system", "content": """You are a research assistant. Use the available tools
        to find information needed to answer the user's question. Make multiple searches if needed.
        When you have sufficient information, provide a comprehensive answer with citations."""},
        {"role": "user", "content": query}
    ]

    retrieved_context = []

    for iteration in range(max_iterations):
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=tools,
            tool_choice="auto"
        )

        message = response.choices[0].message

        if message.tool_calls:
            messages.append(message)
            for tool_call in message.tool_calls:
                result = await execute_tool(tool_call)
                retrieved_context.append(result)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result)
                })
        else:
            # Agent has decided it has enough information
            return message.content

    return messages[-1].content if messages else "Unable to find sufficient information."
```

### Iterative Refinement

The agent can refine its retrieval strategy based on intermediate results:

1. **Initial retrieval** with the user's query
2. **Evaluate coverage**: Does the retrieved context contain enough information to answer?
3. **Gap identification**: What aspects of the question remain unanswered?
4. **Targeted follow-up**: Retrieve specifically for the identified gaps
5. **Synthesis**: Combine all retrieved information into a final answer

This mirrors how a human researcher works -- start with a broad search, identify what's missing, search specifically for those gaps.

## Graph-Based RAG

### Knowledge Graph RAG

Traditional RAG treats documents as independent entities in a flat vector space. Knowledge graph RAG adds explicit relationships between entities, enabling traversal-based retrieval.

```python
# Simple knowledge graph structure
class KnowledgeGraph:
    def __init__(self):
        self.entities = {}  # entity_id -> {name, type, description, embedding}
        self.relations = []  # (source_id, relation_type, target_id, properties)

    def add_entity(self, entity_id: str, name: str, entity_type: str, description: str):
        self.entities[entity_id] = {
            "name": name,
            "type": entity_type,
            "description": description,
            "embedding": embed(f"{name}: {description}")
        }

    def add_relation(self, source: str, relation: str, target: str, properties: dict = None):
        self.relations.append((source, relation, target, properties or {}))

    def get_neighbors(self, entity_id: str, relation_type: str = None, max_hops: int = 2):
        """Retrieve entities within max_hops of the given entity."""
        visited = set()
        frontier = {entity_id}
        results = []

        for hop in range(max_hops):
            next_frontier = set()
            for node in frontier:
                if node in visited:
                    continue
                visited.add(node)
                for source, rel, target, props in self.relations:
                    if source == node and (relation_type is None or rel == relation_type):
                        if target not in visited:
                            next_frontier.add(target)
                            results.append({
                                "entity": self.entities[target],
                                "relation": rel,
                                "from": self.entities[source]["name"],
                                "hop": hop + 1
                            })
                    elif target == node and (relation_type is None or rel == relation_type):
                        if source not in visited:
                            next_frontier.add(source)
                            results.append({
                                "entity": self.entities[source],
                                "relation": rel,
                                "from": self.entities[node]["name"],
                                "hop": hop + 1
                            })
            frontier = next_frontier

        return results
```

### Microsoft GraphRAG

Microsoft's GraphRAG (Edge et al., 2024) introduced a systematic approach to building knowledge graphs from document collections for retrieval. The process involves:

1. **Entity and relationship extraction**: Use an LLM to extract entities (people, organizations, concepts) and their relationships from each document chunk.

2. **Graph construction**: Build a graph where nodes are entities and edges are relationships, with each annotated by the source text.

3. **Community detection**: Apply the Leiden algorithm to identify clusters of closely related entities (communities).

4. **Community summarization**: Generate natural language summaries for each community, capturing the key entities, relationships, and themes at that level.

5. **Hierarchical summarization**: Build summaries at multiple levels of the community hierarchy, from specific (individual relationships) to abstract (high-level themes).

```python
# GraphRAG retrieval approaches

class GraphRAGRetriever:
    def local_search(self, query: str, top_k: int = 5):
        """
        Local search: Start from entities mentioned in the query,
        traverse the graph to find related context.
        Best for: Specific questions about particular entities.
        """
        # 1. Extract entities from query
        query_entities = self.extract_entities(query)

        # 2. Find matching entities in the graph
        matched = self.match_entities(query_entities)

        # 3. Traverse graph from matched entities
        context = []
        for entity in matched:
            neighbors = self.graph.get_neighbors(entity.id, max_hops=2)
            context.extend(neighbors)

        # 4. Retrieve source text chunks for context entities
        source_texts = self.get_source_texts(context)

        return source_texts

    def global_search(self, query: str, level: int = 1):
        """
        Global search: Use community summaries to answer broad questions.
        Best for: Thematic questions, summarization across the corpus.
        """
        # 1. Retrieve community summaries at the specified level
        summaries = self.get_community_summaries(level=level)

        # 2. Map: Generate partial answers from each relevant community
        partial_answers = []
        for summary in summaries:
            if self.is_relevant(query, summary):
                partial = self.generate_partial_answer(query, summary)
                partial_answers.append(partial)

        # 3. Reduce: Synthesize partial answers into a final answer
        final_answer = self.synthesize(query, partial_answers)

        return final_answer
```

**When GraphRAG excels**: Questions requiring understanding of relationships ("Who are the key collaborators of researcher X?"), global summarization queries ("What are the main themes in this document collection?"), and multi-entity questions ("How are companies A, B, and C related?").

**Trade-offs**: GraphRAG requires significant upfront processing (LLM calls for entity extraction and summarization), the graph must be rebuilt when documents change, and it adds complexity to the RAG pipeline. For simple factual retrieval, it's overkill.

## Multi-Hop Retrieval

Multi-hop retrieval addresses questions that cannot be answered by any single document but require connecting information across multiple sources.

### The Multi-Hop Challenge

Consider: "What is the GDP per capita of the country where the inventor of the World Wide Web was born?"

This requires:
1. Retrieve: "Tim Berners-Lee invented the World Wide Web"
2. Retrieve: "Tim Berners-Lee was born in England (United Kingdom)"
3. Retrieve: "The GDP per capita of the United Kingdom is approximately $46,000"

No single retrieval step answers the question. Each step's answer informs the next step's query.

### Iterative Retrieval with Chain-of-Thought

```python
async def multi_hop_retrieve(
    query: str,
    retriever,
    max_hops: int = 4
) -> dict:
    """Multi-hop retrieval with explicit reasoning steps."""
    context = []
    reasoning_chain = []

    current_query = query

    for hop in range(max_hops):
        # Retrieve for current query
        results = await retriever.search(current_query, top_k=3)
        context.extend(results)

        # Ask the LLM: Do we have enough to answer? If not, what's missing?
        evaluation = client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "system",
                "content": """Given the original question and retrieved context, determine:
                1. Can the question be fully answered with the current context?
                2. If not, what specific information is still needed?
                3. What search query would find the missing information?

                Respond in JSON: {"answerable": bool, "missing": str, "next_query": str}"""
            }, {
                "role": "user",
                "content": f"Question: {query}\n\nContext so far:\n" +
                          "\n".join([f"[{i+1}] {r['text']}" for i, r in enumerate(context)])
            }]
        )

        eval_result = json.loads(evaluation.choices[0].message.content)
        reasoning_chain.append({
            "hop": hop + 1,
            "query": current_query,
            "found": [r["text"][:200] for r in results],
            "evaluation": eval_result
        })

        if eval_result["answerable"]:
            break

        current_query = eval_result["next_query"]

    return {
        "context": context,
        "reasoning_chain": reasoning_chain,
        "total_hops": len(reasoning_chain)
    }
```

## RAPTOR: Tree-Based Retrieval

RAPTOR (Sarthi et al., 2024) introduces a novel indexing structure that builds a tree of summaries over document chunks, enabling retrieval at multiple levels of abstraction.

### How RAPTOR Works

1. **Leaf nodes**: Chunk the document into small segments (the leaves of the tree)
2. **Clustering**: Cluster similar chunks using their embeddings (soft clustering with GMM)
3. **Summarization**: Generate summaries for each cluster using an LLM
4. **Recursion**: Treat summaries as new "documents," cluster and summarize again
5. **Repeat** until reaching a single root summary

```
                    [Root Summary]
                   /              \
          [Summary L2-A]     [Summary L2-B]
          /     |    \        /     |    \
    [Sum A1] [Sum A2] [Sum A3] [Sum B1] [Sum B2] [Sum B3]
    / | \    / | \              / | \
  [c1][c2][c3][c4][c5]      [c8][c9][c10]
```

### Retrieval Strategies

RAPTOR supports two retrieval approaches:

**Tree traversal**: Start at the root, decide which children are relevant, recurse down to find the most relevant leaf chunks. Good for focused queries.

**Collapsed tree**: Flatten all nodes (leaves + summaries at all levels) into a single index. Retrieve the most similar nodes regardless of level. A query about high-level themes might match a summary node; a detailed query might match a leaf.

```python
class RAPTORIndex:
    def __init__(self, embedding_model, llm):
        self.embedding_model = embedding_model
        self.llm = llm
        self.tree_nodes = []  # All nodes at all levels

    def build_tree(self, chunks: list[str], max_levels: int = 3):
        """Build the RAPTOR tree from leaf chunks."""
        current_level = chunks
        level = 0

        # Store leaf nodes
        for chunk in chunks:
            self.tree_nodes.append({
                "text": chunk,
                "level": 0,
                "embedding": self.embedding_model.encode(chunk)
            })

        while len(current_level) > 1 and level < max_levels:
            # Cluster current level
            embeddings = self.embedding_model.encode(current_level)
            clusters = self.cluster(embeddings, current_level)

            # Summarize each cluster
            summaries = []
            for cluster_texts in clusters:
                summary = self.summarize(cluster_texts)
                summaries.append(summary)
                self.tree_nodes.append({
                    "text": summary,
                    "level": level + 1,
                    "embedding": self.embedding_model.encode(summary),
                    "children": cluster_texts
                })

            current_level = summaries
            level += 1

    def collapsed_tree_search(self, query: str, top_k: int = 5):
        """Search across all levels of the tree."""
        query_embedding = self.embedding_model.encode(query)
        similarities = [
            (node, np.dot(query_embedding, node["embedding"]))
            for node in self.tree_nodes
        ]
        similarities.sort(key=lambda x: x[1], reverse=True)
        return [node for node, _ in similarities[:top_k]]
```

**Why RAPTOR works**: For questions requiring high-level understanding ("What are the main contributions of this paper?"), summary nodes provide pre-computed abstractions that match better than any individual chunk. For detailed questions, leaf nodes provide specifics. The tree structure enables retrieval at the right level of abstraction.

## Corrective RAG (CRAG)

Corrective RAG (Yan et al., 2024) introduces a self-evaluation mechanism that assesses the quality of retrieved documents and takes corrective action when retrieval fails.

### The CRAG Pipeline

```python
class CorrectiveRAG:
    def __init__(self, retriever, evaluator, web_searcher):
        self.retriever = retriever
        self.evaluator = evaluator
        self.web_searcher = web_searcher

    async def answer(self, query: str) -> str:
        # Step 1: Initial retrieval
        documents = await self.retriever.search(query, top_k=5)

        # Step 2: Evaluate each document's relevance
        evaluations = []
        for doc in documents:
            score = self.evaluator.evaluate_relevance(query, doc)
            evaluations.append({"doc": doc, "score": score})

        # Step 3: Triage based on evaluation
        relevant = [e for e in evaluations if e["score"] > 0.7]
        ambiguous = [e for e in evaluations if 0.3 <= e["score"] <= 0.7]
        irrelevant = [e for e in evaluations if e["score"] < 0.3]

        if len(relevant) >= 2:
            # Sufficient relevant documents -- proceed with generation
            context = [e["doc"] for e in relevant]
            action = "CORRECT"
        elif len(relevant) + len(ambiguous) >= 2:
            # Some relevant content, supplement with web search
            context = [e["doc"] for e in relevant + ambiguous]
            web_results = await self.web_searcher.search(query)
            context.extend(web_results[:3])
            action = "AMBIGUOUS"
        else:
            # Retrieval failed -- fall back to web search entirely
            context = await self.web_searcher.search(query)
            action = "INCORRECT"

        # Step 4: Knowledge refinement -- extract only relevant sentences
        refined_context = self.refine_context(query, context)

        # Step 5: Generate answer
        answer = self.generate(query, refined_context, action)
        return answer

    def refine_context(self, query: str, documents: list) -> list[str]:
        """Extract only the sentences relevant to the query from each document."""
        refined = []
        for doc in documents:
            sentences = split_sentences(doc["text"])
            relevant_sentences = [
                s for s in sentences
                if self.evaluator.evaluate_relevance(query, {"text": s}) > 0.5
            ]
            if relevant_sentences:
                refined.append(" ".join(relevant_sentences))
        return refined
```

The key insight of CRAG is the triage mechanism: rather than treating all retrieved documents equally, it explicitly evaluates and categorizes them, taking different corrective actions based on the assessment.

## Self-RAG: Retrieval with Self-Reflection

Self-RAG (Asai et al., 2023) takes a more radical approach: it trains the LLM itself to decide when to retrieve, evaluate what was retrieved, and critique its own generated output.

### Self-RAG Special Tokens

Self-RAG introduces special reflection tokens that the model generates inline:

- **[Retrieve]**: Yes/No -- should the model retrieve additional information?
- **[IsRel]**: Relevant/Irrelevant -- is the retrieved passage relevant to the query?
- **[IsSup]**: Fully Supported/Partially Supported/No Support -- does the retrieved passage support the generated text?
- **[IsUse]**: Utility rating (1-5) -- how useful is the overall response?

```
Query: "What causes northern lights?"

Model output:
[Retrieve] Yes
[Retrieved passage: "Aurora borealis occurs when charged particles from
the solar wind interact with Earth's magnetosphere..."]
[IsRel] Relevant
The northern lights, or aurora borealis, are caused by charged particles
from the sun interacting with Earth's magnetic field.
[IsSup] Fully Supported
These particles are guided by the magnetosphere toward the poles, where
they collide with atmospheric gases, causing them to emit light.
[IsUse] 5
```

### Training Self-RAG

Self-RAG is trained in two phases:

1. **Critic model training**: Train a model to generate the reflection tokens given (query, passage, generation) triples. This is trained on human annotations or GPT-4 labels.

2. **Generator training**: Train the language model end-to-end to generate both reflection tokens and text. The model learns to interleave retrieval decisions and quality assessments with generation.

### Why Self-RAG Matters

Self-RAG shifts retrieval control from the application layer into the model itself. Instead of always retrieving (which wastes compute for queries the model already knows) or never retrieving (which causes hallucination), the model adaptively decides. Asai et al. (2023) showed that Self-RAG outperforms both standard RAG and vanilla LLMs across multiple benchmarks, with the added benefit of providing interpretable confidence signals via the reflection tokens.

## Practical Architecture: Combining Advanced Patterns

In practice, these techniques are combined based on the application's requirements:

```python
class AdvancedRAGSystem:
    """Production system combining multiple advanced RAG patterns."""

    async def answer(self, query: str) -> dict:
        # 1. Query analysis and routing
        route = self.route_query(query)

        # 2. Select retrieval strategy
        if route.requires_multi_hop:
            context = await self.multi_hop_retrieve(query)
        elif route.requires_graph_traversal:
            context = await self.graph_rag_retrieve(query)
        elif route.is_global_summary:
            context = await self.raptor_retrieve(query, level="summary")
        else:
            context = await self.hybrid_retrieve(query)

        # 3. Evaluate retrieval quality (CRAG-style)
        quality = self.evaluate_retrieval(query, context)

        if quality.score < 0.3:
            # Retrieval failed -- try alternative strategy
            context = await self.fallback_retrieve(query, tried=route.strategy)

        # 4. Generate with self-assessment
        answer = self.generate_with_reflection(query, context)

        return {
            "answer": answer.text,
            "sources": answer.citations,
            "confidence": answer.confidence,
            "retrieval_strategy": route.strategy,
            "hops": context.hop_count if hasattr(context, 'hop_count') else 1
        }
```

## Summary and Key Takeaways

- **Agentic RAG** transforms retrieval from a single function call into an iterative reasoning process. Query routing is the simplest entry point; tool-augmented retrieval with an agent loop is the most flexible.
- **GraphRAG** excels at relationship-heavy queries and global summarization but requires significant upfront processing. Use it when your documents contain rich entity relationships.
- **Multi-hop retrieval** is essential for complex questions that span multiple documents. The key is giving the LLM the ability to evaluate what's missing and formulate follow-up queries.
- **RAPTOR** enables retrieval at multiple levels of abstraction through a tree of summaries. Particularly valuable for document collections where both high-level themes and specific details are queried.
- **Corrective RAG** adds robustness by explicitly evaluating retrieval quality and taking corrective action (e.g., web search fallback) when retrieval fails.
- **Self-RAG** represents the most integrated approach, training the LLM itself to decide when to retrieve and assess what it retrieves. This is architecturally elegant but requires custom model training.
- In practice, combine these patterns based on query complexity. Simple factual queries don't need multi-hop retrieval; complex analytical queries don't benefit from simple vector search.
- The trend is clear: RAG is evolving from a static pipeline into a dynamic, adaptive system where the retrieval strategy is itself a decision made by an intelligent agent.
