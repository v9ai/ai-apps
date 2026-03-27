Based on my searches, I have found several relevant papers from 2024-2026 on document chunking strategies for RAG. Let me now provide a comprehensive summary of the key findings:

## Summary of Document Chunking Strategies for RAG (2024-2026)

### **Key Findings from Recent Research:**

### 1. **Semantic Chunking Approaches**

**Max-Min Semantic Chunking (Kiss et al., 2025)**
- **Method**: Uses semantic similarity and Max-Min algorithm to identify semantically coherent text chunks
- **Performance**: Achieved average AMI scores of 0.85, 0.90 (vs. Llama Semantic Splitter: 0.68, 0.70)
- **Accuracy**: 0.56 average accuracy on RAG-based multiple-choice QA (vs. 0.53 for Llama Semantic Splitter)
- **Key Insight**: Statistically significant improvements in semantic coherence preservation

**Comparative Evaluation for Clinical Decision Support (Gomez-Cabello et al., 2025)**
- **Tested Strategies**: Adaptive length, proposition, semantic, and fixed token-dependent baseline
- **Results**: Adaptive chunking achieved highest accuracy (87% vs baseline 50%) and relevance (93%)
- **Retrieval Metrics**: Adaptive chunking: precision 0.50, recall 0.88, F1 0.64 vs baseline: 0.17, 0.40, 0.24
- **Clinical Relevance**: Adaptive chunking scored 2.90 ± 0.40 on 3-point Likert scale

### 2. **Hierarchical & Document Structure-Aware Chunking**

**MultiDocFusion (Shin et al., 2025)**
- **Approach**: Multimodal hierarchical chunking pipeline using vision-based document parsing and LLM-based document section hierarchical parsing
- **Performance**: Improves retrieval precision by 8-15% and ANLS QA scores by 2-3% over baselines
- **Method**: DFS-based grouping for hierarchical chunk construction
- **Key Insight**: Explicitly leveraging document hierarchy is critical for multimodal document-based QA

**Document Segmentation Matters (Wang et al., 2025)**
- **Finding**: Document segmentation significantly impacts RAG performance
- **Recommendation**: Structure-aware chunking preserves contextual integrity

### 3. **Systematic Investigation of Chunking Strategies (Shaukat et al., 2026)**

**Comprehensive Benchmark**: 36 segmentation methods across 6 domains with 5 embedding models
- **Top Performer**: Paragraph Group Chunking achieved highest overall accuracy (mean nDCG@5~0.459)
- **Baseline Comparison**: Fixed-size character chunking performed poorly (nDCG@5 < 0.244, Precision@1~2-3%)
- **Domain-Specific Findings**:
  - Dynamic token sizing strongest in biology, physics, health
  - Paragraph grouping strongest in legal and maths
- **Embedding Sensitivity**: Larger embedding models yield higher scores but remain sensitive to suboptimal segmentation

### 4. **Cross-Document & Topic-Aligned Approaches**

**GraphRAG Approaches**: Several papers (Knollmeyer et al., 2025; Zhang et al., 2025) show knowledge graph-enhanced RAG improves cross-document reasoning
- **Document GraphRAG**: Incorporates KGs built on document's intrinsic structure
- **Performance**: Enhances retrieval robustness and answer generation

**MEBench (Teng et al., 2025)**: Benchmark for cross-document multi-entity QA, highlighting need for specialized chunking strategies

### 5. **Chunk Size & Memory Considerations**

**From Systematic Investigation (Shaukat et al., 2026)**:
- **Efficiency Trade-offs**: Producing more, smaller chunks increases index size and latency
- **Optimal Balance**: Dynamic chunking approaches optimal effectiveness-efficiency balance
- **Memory Overhead**: Advanced chunking methods increase index size but provide better retrieval accuracy

**From Clinical Study (Gomez-Cabello et al., 2025)**:
- **Chunk Size Recommendation**: Adaptive chunking based on logical topic boundaries
- **Memory Impact**: Structure-aware chunking reduces noise and improves precision without modifying LLM

### 6. **Embedding Model Compatibility**

**Key Findings from Systematic Investigation**:
- **Model Sensitivity**: All embedding models (including larger ones) remain sensitive to chunking quality
- **Complementary Benefits**: Better chunking + large embeddings provide complementary benefits
- **Recommended Models**: Papers mention BGE base en v1.5 embeddings, but larger models like OpenAI embeddings also benefit from proper chunking

### 7. **Faithfulness & Answer Relevance Metrics**

**Clinical Study Metrics**:
- **Faithfulness**: Measured via medical accuracy (Likert scale) - Adaptive chunking: 2.37 ± 0.72 vs baseline: 1.63 ± 0.72
- **Answer Relevance**: Adaptive chunking: 2.90 ± 0.40
- **Statistical Significance**: p = 0.001 for accuracy improvements

**RAGAS/TruLens Benchmarks**: While not explicitly mentioned in most papers, the clinical study uses similar evaluation frameworks (accuracy, relevance, retrieval metrics)

### **Recommendations for Current ChromaDB Setup (384-dim embeddings):**

1. **Immediate Improvements**:
   - Switch from basic fixed-size chunking to **adaptive/semantic chunking**
   - Implement **paragraph grouping** for structured documents
   - Consider **hierarchical chunking** for complex documents

2. **Chunk Size Guidelines**:
   - **Semantic chunking**: Variable sizes based on topic boundaries
   - **Paragraph grouping**: Group related paragraphs (typically 3-5 paragraphs)
   - **Adaptive chunking**: 500-1000 tokens with logical boundaries

3. **Memory Optimization**:
   - Balance chunk count vs. retrieval quality
   - Consider **two-stage retrieval**: Coarse-grained → fine-grained
   - Implement **parent-child relationships** for hierarchical documents

4. **Embedding Compatibility**:
   - 384-dim embeddings work well with proper chunking
   - Consider upgrading to larger models (768+ dim) for complex domains
   - Ensure chunking strategy complements embedding model capabilities

The research consistently shows that **content-aware, structure-preserving chunking strategies significantly outperform naive fixed-length segmentation** across all evaluation metrics including faithfulness, answer relevance, and retrieval precision.