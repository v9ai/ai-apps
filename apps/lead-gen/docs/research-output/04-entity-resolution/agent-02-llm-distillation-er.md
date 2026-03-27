Based on my comprehensive search, I can provide you with findings on knowledge distillation for entity resolution from 2024-2026. Let me summarize what I found:

## Summary of Findings on Knowledge Distillation for Entity Resolution (2024-2026)

After searching through multiple queries, I found several relevant papers and trends in the field:

### Key Papers Found:

1. **"Cost-Efficient RAG for Entity Matching with LLMs: A Blocking-based Exploration" (2026)**
   - **Authors**: Chuangtao Ma, Zeyu Zhang, Arijit Khan, Sebastian Schelter, Paul Groth
   - **Key Insight**: This paper addresses the high computational cost of using LLMs for entity matching by introducing CE-RAG4EM, a cost-efficient RAG architecture that reduces computation through blocking-based batch retrieval and generation.
   - **Relevance**: While not strictly about distillation, this paper focuses on cost reduction for LLM-based entity matching, which aligns with your interest in trading accuracy for lower inference costs.

2. **"A Survey on Symbolic Knowledge Distillation of Large Language Models" (2024)**
   - **Authors**: K. Acharya, Alvaro Velasquez, Houbing Song
   - **Key Insight**: Comprehensive survey on distilling intricate, often implicit knowledge from LLMs like GPT-3 and BERT into more efficient representations.
   - **Relevance**: Provides theoretical foundation for knowledge distillation approaches applicable to entity resolution.

### Key Trends and Gaps:

**What I found:**
- **Cost Efficiency Focus**: Multiple papers (like CE-RAG4EM) focus on reducing computational costs of LLMs for entity matching tasks
- **Edge Deployment**: Several surveys discuss deploying LLMs in resource-constrained environments
- **Small Language Models**: Growing interest in SLMs (<15B parameters) as efficient alternatives to large LLMs

**What I didn't find (specific to your query):**
- No papers specifically titled "DistillER" or explicitly describing distillation of GPT-4 into 1B-3B models for entity resolution
- Limited papers with exact metrics on F1 vs GPT-4 teacher, distillation data size, or inference latency in ms/pair
- No papers with detailed cost analysis of GPT-4 labels ($20 for 10K pairs) training local models

### Relevant Research Directions:

1. **Symbolic Knowledge Distillation**: The 2024 survey indicates this is an active area for extracting structured knowledge from LLMs
2. **Edge Intelligence**: Papers discuss challenges in deploying LLMs on edge devices with resource constraints
3. **Small Language Models**: Research on SLMs as efficient alternatives to large LLMs

### Recommendations for Further Search:

Based on the search results, it appears that while knowledge distillation for entity resolution is an emerging area, the specific configuration you mentioned (GPT-4 → 1B-3B model with exact cost metrics) may not have been extensively published in 2024-2026. The research seems to be more focused on:

1. **RAG optimization** for entity matching (CE-RAG4EM)
2. **General knowledge distillation** surveys
3. **Edge deployment** challenges for LLMs

You might want to look at:
- **Older papers** (pre-2024) on knowledge distillation for NLP tasks
- **Industry blogs or technical reports** from companies implementing such systems
- **Database conference proceedings** (SIGMOD, VLDB, ICDE) for entity matching papers
- **Workshops** on efficient NLP or model compression

The most directly relevant paper appears to be "Cost-Efficient RAG for Entity Matching with LLMs: A Blocking-based Exploration" (2026), which addresses the cost efficiency aspect of your query, though not specifically through knowledge distillation.