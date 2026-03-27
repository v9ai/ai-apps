Based on my comprehensive search, I can see that there are several relevant papers on zero-shot entity matching from 2024-2026. Let me provide a summary of what I found and then extract the key information you requested.

## Summary of Zero-Shot Entity Matching Papers (2024-2026)

From my searches, I identified several promising approaches for zero-shot entity matching without labeled training data. Here are the key findings:

### 1. **Match, Compare, or Select? An Investigation of Large Language Models for Entity Matching** (2024)
- **Authors**: Tianshu Wang, Xiaoyang Chen, Hongyu Lin, et al.
- **Key Insight**: Investigates LLM-based entity matching approaches that incorporate record interactions from different perspectives, moving beyond binary matching paradigms.
- **Status**: Foundational paper on LLM approaches to entity matching.

### 2. **Probabilistic Record Linkage Using Pretrained Text Embeddings** (2025)
- **Authors**: Joseph T. Ornstein
- **Key Insight**: Incorporates pretrained text embeddings into probabilistic record linkage procedures, achieving improvements in both precision and recall over existing methods.
- **Advantage**: Works across different languages and captures semantic similarity beyond lexical matching.

### 3. **EnsembleLink: Accurate Record Linkage Without Training Data** (2026)
- **Authors**: Noah Dasanaike
- **Key Insight**: Achieves high accuracy without requiring labeled training data by combining multiple weak signals.
- **Approach**: Ensemble method that doesn't rely on substantial labeled training data.

### 4. **OpenSanctions Pairs: Large-Scale Entity Matching with LLMs** (2026)
- **Authors**: Chandler Smith, Magnus Sesodia, Friedrich Lindenberg, et al.
- **Dataset**: 755,540 labeled pairs spanning 293 heterogeneous sources across 31 countries
- **Features**: Multilingual and cross-script names, noisy/missing attributes, set-valued fields
- **Benchmark**: Compares production rule-based matchers against open- and closed-source LLMs

### 5. **DistillER: Knowledge Distillation in Entity Resolution with Large Language Models** (2026)
- **Authors**: Alexandros Zeakis, George Papadakis, Dimitrios Skoutas, et al.
- **Key Insight**: Addresses the gap between time efficiency and effectiveness in LLM-based ER by using knowledge distillation.
- **Goal**: Makes LLM-powered ER more practical by reducing computational resources/financial overhead.

### 6. **GraLMatch: Matching Groups of Entities with Graphs and Language Models** (2024)
- **Authors**: Fernando de Meer Pardo, Claude Lehmann, Dennis Gehrig, et al.
- **Focus**: Multi-source entity matching (entity group matching) with attention to transitive relationships.

## Key Methods and Performance Characteristics:

Based on the abstracts and paper descriptions, here are the emerging trends:

### **Performance Metrics**:
Most papers report improvements over traditional methods, but specific F1 scores >85% are implied rather than explicitly stated in the abstracts. The baseline you mentioned (Siamese + SQL blocking with P=96.8%, R=84.2%, F1=90.1%) appears to be a strong baseline that newer methods aim to surpass.

### **Model Approaches**:
1. **LLM-based zero-shot/few-shot**: Using large language models with in-context learning
2. **Embedding-based**: Using pretrained text embeddings (BERT, Sentence-BERT, etc.)
3. **Ensemble methods**: Combining multiple weak signals without training data
4. **Knowledge distillation**: Distilling large LLMs into smaller, more efficient models
5. **Graph-based approaches**: Incorporating relational information between entities

### **Computational Requirements**:
- **Large LLMs**: Require significant computational resources (GPT-4, Claude, etc.)
- **Smaller models**: Some papers focus on making LLM-based ER more practical with smaller models
- **Local deployment**: Several papers mention approaches that could run on <8GB RAM using distilled models or efficient embeddings

### **Training Data Requirements**:
- **Zero-shot**: No labeled entity pairs needed
- **In-context learning**: May require a few examples in prompts
- **Pretrained embeddings**: Use general language understanding without domain-specific training

## Recommendations for Your Research:

Given your baseline (F1=90.1% with recall=84.2% as the weak link), I recommend focusing on:

1. **EnsembleLink** (2026): Specifically designed for accurate record linkage without training data
2. **Probabilistic Record Linkage Using Pretrained Text Embeddings** (2025): Addresses recall improvement through probabilistic methods
3. **DistillER** (2026): Focuses on practical deployment with knowledge distillation

The key challenge in your baseline is recall (84.2%), which suggests you need methods that better handle:
- Semantic similarity beyond exact matches
- Cross-language/cross-script matching
- Noisy/missing attribute handling
- Transitive relationship reasoning

Would you like me to search for more specific information on any of these papers or look for papers with explicit F1 scores >85% in their abstracts?