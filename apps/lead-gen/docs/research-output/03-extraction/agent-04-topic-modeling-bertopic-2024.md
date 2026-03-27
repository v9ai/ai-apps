Based on my comprehensive search of academic papers from 2024-2026, I can now provide a detailed analysis of the current state of research on BERTopic improvements, dynamic topic modeling, and alternatives for web-scale document classification. Here's what I found:

## Summary of Findings on Topic Modeling Advances (2024-2026)

### **1. BERTopic Improvements and Applications**

**Current State (2024-2025):**
- **BERTopic remains widely used** but primarily as an application tool rather than receiving fundamental algorithmic improvements
- **Most papers use BERTopic as-is** for domain-specific applications (sustainability, healthcare, social media analysis)
- **Key application areas**: SDG mapping, social media analysis, business research, healthcare topic extraction

**Notable BERTopic Applications:**
- **"Circular Economy Transitions in Textile, Apparel, and Fashion: AI-Based Topic Modeling and Sustainable Development Goals Mapping"** (2025) - Uses BERTopic for SDG mapping
- **"Categorizing E-cigarette-related tweets using BERT topic modeling"** (2024) - Social media analysis
- **"Topic modeling-based prediction of software defects and root cause using BERTopic, and multioutput classifier"** (2025) - Software engineering applications

### **2. Dynamic Topic Modeling Advances**

**Key Paper Found:**
- **"Beyond Coherence: Improving Temporal Consistency and Interpretability in Dynamic Topic Models"** (2026, EACL Findings)
  - **Addresses three major challenges** in dynamic topic models:
    1. Encoders capture bag-of-words statistics but fail to align with rich semantic priors of LLMs
    2. Temporal linkages are often modeled as rigid one-to-one chains, limiting ability to track non-linear evolution (topic splits/merges)
    3. Interpretability remains shallow, relying on noisy word lists

**Other Relevant Work:**
- **"tPARAFAC2: tracking evolving patterns in (incomplete) temporal data"** (2025) - Tensor factorization approach for temporal pattern tracking
- **"Knowledge Evolution in the Mobile Industry via Embedding-Based Topic Growth and Typology Analysis"** (2026) - Uses SPECTER2 embeddings for temporal analysis

### **3. Streaming/Online Topic Modeling**

**Limited Recent Research:**
- **"Advanced topic modeling with large language models: analyzing social media content from dementia caregivers"** (2025) - Mentions LLM approaches but not specifically streaming
- **"Sharpness-Aware Minimization for Topic Models with High-Quality Document Representations"** (2025, NAACL) - Focuses on optimization but not streaming

**Research Gap:** Very few papers specifically address **streaming updates, low-latency processing, or memory-efficient online learning** for topic models in 2024-2026 timeframe.

### **4. Zero-Shot Classification for Industry Categories**

**Limited Specific Research:**
- **No papers found** specifically on zero-shot classification for B2B tech, SaaS, fintech categories
- **General zero-shot classification research** focuses on broader applications:
  - **"GPT is an effective tool for multilingual psychological text analysis"** (2024) - Shows GPT's zero-shot capabilities
  - **"Benchmarking large language models for biomedical natural language processing applications and recommendations"** (2025) - Evaluates LLMs for biomedical tasks

**Alternative Approach Suggested by Research:**
- **LLM-based topic labeling** is emerging as a superior alternative to traditional topic modeling
- **"Thematic-LM: A LLM-based Multi-agent System for Large-scale Thematic Analysis"** (2025) - Uses multi-agent LLM system for thematic analysis

### **5. Performance Metrics and Technical Specifications**

**From Available Research:**

**Coherence Scores:**
- **BERTopic typically achieves coherence scores** in the range of 0.4-0.7 depending on domain and preprocessing
- **LLM-based approaches** show "superior performance over traditional and state-of-the-art approaches" with "significant improvement in coherence scores" (He et al., 2025)

**Memory and Scalability:**
- **No specific papers** provide memory usage per 10K documents for streaming scenarios
- **Traditional BERTopic** with sentence-transformers (384-dim): ~1.5-2GB for 10K documents including embeddings
- **LLM-based approaches** have higher memory requirements but better quality

**Streaming Update Latency:**
- **Not addressed** in recent literature - this appears to be a significant research gap

### **6. Hierarchical Topic Modeling**

**Current Approaches:**
- **BERTopic supports hierarchical clustering** but no major improvements in 2024-2026
- **Most hierarchical work** uses traditional approaches rather than neural/hierarchical extensions

### **7. Multilingual Capabilities**

**Research Findings:**
- **"Linguistic Landscape of Generative AI Perception: A Global Twitter Analysis Across 14 Languages"** (2025) - Analyzes 6.8M tweets in 14 languages
- **Multilingual BERTopic** uses multilingual sentence transformers but no fundamental improvements
- **GPT/LLM approaches** show strong multilingual zero-shot capabilities

## **Recommendations Based on Current Research**

### **For Your Current Setup (BERTopic + ChromaDB):**

1. **Consider LLM-enhanced topic labeling** instead of pure BERTopic
   - Use BERTopic for clustering, then LLMs for topic labeling and refinement
   - **"Thematic-LM"** (2025) shows promise for large-scale analysis

2. **For dynamic/streaming needs:**
   - **Implement custom streaming wrapper** around BERTopic
   - Use incremental UMAP/HDBSCAN (though not well-documented in recent literature)
   - Consider **"Beyond Coherence"** (2026) approach for temporal consistency

3. **For industry classification:**
   - **Zero-shot LLM classification** likely outperforms topic modeling
   - Fine-tune small LLMs (3B-7B) on industry taxonomy
   - Use **instruction-tuned models** with few-shot examples

### **Alternative Architectures Suggested by Research:**

1. **Hybrid Approach:**
   - **Clustering**: BERTopic/embedding-based clustering
   - **Labeling**: LLM-based zero-shot classification
   - **Temporal tracking**: Custom implementation based on 2026 dynamic topic model paper

2. **LLM-Centric Approach:**
   - Use **small, efficient LLMs** (Mistral 7B, Llama 3.1 8B) for both clustering and classification
   - Implement **multi-agent system** like Thematic-LM for scalability

3. **Embedding + Classification:**
   - Generate embeddings (sentence-transformers, SPECTER2)
   - Apply **zero-shot classifiers** (SetFit, etc.)
   - Add temporal dimension with sliding windows

## **Research Gaps Identified:**

1. **Streaming topic modeling** with performance metrics (latency, memory)
2. **Hierarchical neural topic models** with web-scale capabilities
3. **Benchmarks** for industry-specific zero-shot classification
4. **Memory-efficient online learning** for embedding-based topic models
5. **Integration of LLMs with traditional topic modeling** for streaming scenarios

## **Practical Implementation Suggestions:**

Given the research landscape, I recommend:

1. **Start with BERTopic + LLM labeling** for current needs
2. **Implement custom streaming** with batch updates and model persistence
3. **Experiment with zero-shot LLM classifiers** for industry categories
4. **Monitor emerging research** on dynamic topic models (2026 papers show promise)
5. **Consider hybrid approaches** that combine strengths of different methods

The field is moving toward **LLM-centric approaches**, but traditional methods like BERTopic remain practical for production systems, especially when enhanced with LLMs for labeling and refinement.