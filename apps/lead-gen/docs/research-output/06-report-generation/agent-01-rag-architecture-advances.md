Based on my searches, I've found several relevant papers on advanced RAG architectures from 2024-2026. Let me provide a comprehensive summary of the key findings:

## Summary of Advanced RAG Architectures (2024-2026)

### 1. **A-RAG: Scaling Agentic Retrieval-Augmented Generation via Hierarchical Retrieval Interfaces** (2026)
- **Architecture**: Hierarchical agentic RAG with three retrieval interfaces exposed to LLMs:
  1. Keyword search
  2. Semantic search  
  3. Chunk read
- **Key Innovation**: Allows LLMs to autonomously decide retrieval strategies rather than following predefined workflows
- **Performance**: Not explicitly stated for HotpotQA, but designed for multi-hop reasoning
- **Retrieval Rounds**: Dynamic, LLM-controlled
- **Separate Retrieval LLM**: No - uses the main LLM for retrieval decisions

### 2. **HopRAG: Multi-Hop Reasoning for Logic-Aware Retrieval-Augmented Generation** (2025)
- **Architecture**: Graph-based RAG with passage graphs and logical connections
- **Key Innovation**: Constructs passage graphs with text chunks as vertices and LLM-generated pseudo-queries as edges
- **Performance**: Specifically designed for multi-hop reasoning tasks
- **Retrieval Rounds**: Graph-based traversal rather than iterative rounds
- **Separate Retrieval LLM**: Uses LLM for edge generation during indexing

### 3. **EfficientRAG: Efficient Retriever for Multi-Hop Question Answering** (2024)
- **Architecture**: Iterative retrieval without LLM calls at each iteration
- **Key Innovation**: Generates new queries without LLM calls, filters irrelevant documents
- **Performance**: Evaluated on HotpotQA (though exact F1 not provided in abstract)
- **Retrieval Rounds**: Iterative but efficient (no LLM calls per iteration)
- **Separate Retrieval LLM**: No - avoids LLM calls entirely during retrieval

### 4. **Knowing You Don't Know: Learning When to Continue Search in Multi-round RAG through Self-Practicing** (2025)
- **Architecture**: Self-practicing multi-round RAG with termination learning
- **Key Innovation**: Learns when to stop searching to avoid unnecessary retrieval rounds
- **Performance**: Addresses over-retrieval and under-retrieval in complex tasks
- **Retrieval Rounds**: Adaptive based on learned termination criteria
- **Separate Retrieval LLM**: Not specified

### 5. **When Iterative RAG Beats Ideal Evidence: A Diagnostic Study in Scientific Multi-hop Question Answering** (2026)
- **Architecture**: Diagnostic study comparing iterative vs. static RAG
- **Key Finding**: Iterative RAG can outperform static RAG even with ideal evidence in scientific domains
- **Performance**: Focus on scientific multi-hop QA
- **Retrieval Rounds**: Iterative with synchronized retrieval-reasoning
- **Separate Retrieval LLM**: Not specified

### 6. **Tiny-Critic RAG: Empowering Agentic Fallback with Parameter-Efficient Small Language Models** (2026)
- **Architecture**: Uses small language models for routing decisions in agentic RAG
- **Key Innovation**: Reduces computational overhead of using large LLMs for binary routing decisions
- **Performance**: Designed for high-throughput systems
- **Retrieval Rounds**: Agentic with efficient routing
- **Separate Retrieval LLM**: Yes - uses small SLMs for routing

### 7. **Multi-Agent RAG Frameworks** (Multiple papers, 2025)
- **MARSHA**: Multi-agent RAG system for hazard adaptation
- **Entity Resolution Framework**: Multi-agent RAG for household entity resolution
- **Architecture**: Coordinated, task-specialized agents
- **Performance**: Various domain-specific applications
- **Retrieval Rounds**: Multi-agent coordination
- **Separate Retrieval LLM**: Multiple specialized agents

## Key Trends and Insights:

### **Performance Improvements**:
1. **Hierarchical Retrieval** (A-RAG): Enables more efficient scaling by exposing different retrieval granularities
2. **Graph-based Approaches** (HopRAG): Improves logical reasoning through structured knowledge representation
3. **Iterative Efficiency** (EfficientRAG): Reduces LLM inference calls while maintaining multi-hop capability
4. **Adaptive Termination** (Knowing You Don't Know): Optimizes retrieval rounds based on confidence

### **Architectural Patterns**:
1. **Agentic Control**: Moving from predefined workflows to LLM-controlled retrieval strategies
2. **Specialized Components**: Using smaller models for specific tasks (routing, retrieval decisions)
3. **Multi-Agent Coordination**: Decomposing complex tasks into specialized agents
4. **Graph Integration**: Incorporating knowledge graphs for better reasoning

### **Efficiency Considerations**:
1. **Reduced LLM Calls**: Approaches like EfficientRAG avoid LLM calls during iterative retrieval
2. **Small Model Routing**: Tiny-Critic RAG uses parameter-efficient models for routing
3. **Semantic Caching**: Implicit in several architectures to reduce redundant retrievals

### **Company Fact Handling**:
Most architectures are designed for multi-hop reasoning across disparate facts, which directly addresses the challenge of reasoning across company facts. Graph-based approaches (HopRAG) and hierarchical retrieval (A-RAG) are particularly well-suited for connecting information across different documents or data sources.

**Note**: While I found many relevant papers, the API limitations prevented me from extracting detailed performance metrics (exact F1 scores, latency numbers) from the full papers. However, the architectures described show clear advancements in handling multi-hop reasoning while addressing efficiency concerns through reduced LLM inference calls and optimized retrieval strategies.