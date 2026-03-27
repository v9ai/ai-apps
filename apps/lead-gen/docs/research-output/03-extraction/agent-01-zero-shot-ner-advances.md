Based on my extensive searches, I can provide you with a comprehensive analysis of the current state of zero-shot NER models from 2024-2026. However, I need to note that the API is having trouble accessing detailed content from specific papers. Let me provide you with what I've found from the search results and abstracts:

## Summary of Zero-Shot NER Models (2024-2026)

### **1. GLiNER (Generalist Model for Named Entity Recognition)**
- **Year**: 2024 (NAACL)
- **Authors**: Urchade Zaratiana, Nadi Tomeh, Pierre Holat, Thierry Charnois
- **Key Features**: 
  - Bidirectional transformer architecture
  - Span-based NER approach
  - Zero-shot and few-shot capabilities
  - Can recognize new entity types without fine-tuning
- **Performance**: According to the paper, GLiNER shows strong performance on standard NER benchmarks while supporting zero-shot generalization to new entity types
- **Citations**: 47 (indicating significant impact)

### **2. GLiNER Multi-Task (2024)**
- **Year**: 2024
- **Authors**: Ihor Stepanov, Mykhailo Shtopko
- **Key Features**: Extends GLiNER for various information extraction tasks beyond NER
- **Approach**: Lightweight model designed for multiple IE tasks with zero-shot capabilities

### **3. Modified GLiNER for Ukrainian (2025)**
- **Year**: 2025
- **Authors**: Kashperova S, Shapoval N
- **Key Features**: 
  - Modified GLiNER architecture for Ukrainian language
  - Uses Snowflake Arctic-Embed 2.0 encoder
  - Addresses low-resource language challenges
  - Zero-shot and few-shot NER capabilities

### **4. LOGICAL (Local Obfuscation by GLiNER) - 2025**
- **Year**: 2025
- **Authors**: Prakrithi Shivaprakash et al.
- **Application**: PII removal system using GLiNER
- **Key Insight**: Demonstrates GLiNER's practical application in privacy-preserving text processing

### **5. Other Notable Zero-Shot NER Approaches**

**A. LLM-Based Approaches:**
- **GoLLIE (2023)**: Annotation guidelines improve zero-shot IE
- **C-ICL (2024)**: Contrastive in-context learning for IE
- **PaDeLLM-NER (2024)**: Parallel decoding in LLMs for NER
- **G&O (2024)**: Simple but effective approach to improve structured LLM output for IE

**B. Instruction-Tuned Models:**
- **ProgGen (2024)**: Generating NER datasets step-by-step with self-reflexive LLMs
- **Skill-LLM (2024)**: Repurposing general-purpose LLMs for skill extraction
- **Universal Information Extraction models**: Various approaches focusing on cross-domain generalization

### **6. Span-Based NER Models**
While the search didn't reveal specific new span-based models from 2024-2026, the GLiNER architecture itself is span-based. The survey papers indicate that span-based approaches remain competitive for zero-shot NER due to their ability to handle arbitrary entity spans without token-level constraints.

### **7. Performance Comparison Challenges**

Based on the search results, I couldn't extract exact F1 scores for CoNLL-2003 or specific zero-shot performance on new entity types like SKILL, FUNDING_AMOUNT, DATE. However, here's what the literature suggests:

**Standard NER Performance (CoNLL-2003):**
- **BERT baseline**: ~92.3% F1 (as you mentioned)
- **GLiNER and similar models**: Likely competitive with or slightly below BERT on standard types
- **Trade-off**: Zero-shot models typically sacrifice some performance on standard types for generalization to new types

**Zero-Shot Performance on New Types:**
- Models like GLiNER show "strong performance" on zero-shot tasks according to abstracts
- Performance varies significantly by domain and entity type complexity
- New entity types like SKILL, FUNDING_AMOUNT would likely see lower F1 than standard types

**Inference Speed & Model Size:**
- **GLiNER variants**: Likely in the 100-500MB range (based on BERT-like architectures)
- **Inference speed**: Span-based models are generally faster than LLM-based approaches
- **LLM-based NER**: Much larger models (7B+ parameters) with slower inference but potentially better zero-shot performance

### **8. Key Trends (2024-2026)**

1. **Hybrid Approaches**: Combining LLMs with specialized NER models
2. **Instruction Tuning**: Improving zero-shot capabilities through better prompting
3. **Multi-task Learning**: Models that handle multiple IE tasks simultaneously
4. **Domain Adaptation**: Focus on specialized domains (clinical, legal, cybersecurity)
5. **Low-Resource Languages**: Extending zero-shot NER to underrepresented languages

### **9. Recommendations**

For your use case (matching BERT NER F1 on standard types while supporting new types):

1. **GLiNER** appears to be the most promising architecture specifically designed for zero-shot NER
2. **LLM-based approaches** (like instruction-tuned models) offer better zero-shot generalization but at higher computational cost
3. **Hybrid approaches** that combine specialized NER models with LLM guidance might offer the best balance

**Note**: To get exact performance numbers (F1 scores, inference speed, model sizes), you would need to:
1. Access the full GLiNER paper and other specific model papers
2. Look at their experimental sections and benchmarks
3. Check model repositories (Hugging Face) for implementation details and performance metrics

The field is rapidly evolving, with 2025-2026 papers showing continued innovation in zero-shot NER, particularly for specialized domains and low-resource scenarios.