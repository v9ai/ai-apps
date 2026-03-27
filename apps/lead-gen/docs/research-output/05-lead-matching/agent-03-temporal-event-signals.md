Based on my comprehensive search of papers from 2024-2026, I can provide you with a detailed analysis of the current state of research on using temporal event sequences for B2B lead scoring and business prediction. Here's what I found:

## Summary of Findings

The search revealed that while there is significant research on temporal event modeling and B2B lead scoring separately, there are relatively few papers that specifically combine temporal event sequences (funding rounds, hiring activity, tech stack changes) with advanced temporal models (Hawkes processes, transformers, graph networks) for B2B lead scoring in the 2024-2026 timeframe.

## Key Papers Identified

### 1. **"A Retentive Hawkes Process for Long Event Sequence Prediction" (2024)**
- **Authors**: Zeyu Huang, Zhaoman Zhong, Xinru Cui
- **Key Contribution**: Proposes RHP model using retention mechanism for linear memory complexity and reduced inference latency
- **Technical Details**: 
  - Addresses quadratic memory complexity issue in transformer-based point process models
  - Uses retention mechanism to simplify computations and enable recurrent formulation
  - Demonstrates significant performance improvements over traditional Transformer-based models and Hawkes Process variants
  - Shows promising scaling results in computational paradigms

### 2. **"The relevance of lead prioritization: a B2B lead scoring model based on machine learning" (2025)**
- **Authors**: Laura González-Flores, Jessica Rubiano-Moreno, Guillermo Sosa-Gómez
- **Key Contribution**: Case study of B2B software company's lead scoring model
- **Technical Details**:
  - Uses real lead data from January 2020 to April 2024
  - Evaluated 15 classification algorithms
  - Gradient Boosting Classifier showed superior performance in accuracy and ROC AUC
  - Feature importance analysis identified "source" and "lead status" as key predictors
- **Limitation**: Focuses on static features rather than temporal event sequences

### 3. **"Profiling before scoring: a two-stage predictive model for B2B lead prioritization" (2026)**
- **Authors**: Migao Wu, Pavel Andreev, Morad Benyoucef
- **Key Contribution**: Two-stage model for B2B lead prioritization
- **Note**: Limited abstract available, but appears relevant to the topic

### 4. **"Event Prediction Using Machine-Learning and Deep-Learning Approaches: A Comprehensive Review" (2024)**
- **Authors**: Ali Akbar Sadri, Zahra Abadi
- **Key Contribution**: Comprehensive review of event prediction methods
- **Relevance**: Likely covers temporal event modeling approaches applicable to business contexts

## Key Insights from the Search:

### **Model Architectures Identified**:
1. **Retentive Hawkes Process (RHP)**: Specifically designed for long event sequences with linear memory complexity
2. **Transformer-based point process models**: Mentioned as baseline comparison for RHP
3. **Gradient Boosting Classifiers**: Currently dominant in practical B2B lead scoring applications
4. **Temporal Graph Networks**: While not specifically found for B2B applications, the architecture is well-established for temporal relational data

### **Missing Information from Papers**:
Unfortunately, the papers found do not provide the specific metrics you requested:
- **AUC improvement vs static features**: Not quantified in the available abstracts
- **Event types used**: Not specified (funding rounds, hiring activity, tech stack changes)
- **Sequence length**: Only mentioned as "long sequences" in RHP paper
- **Model size**: Not specified
- **Inference latency**: RHP paper mentions "reduced inference latency" but no quantitative metrics

### **Research Gaps Identified**:
1. **Limited integration**: Few papers specifically combine temporal event sequences with advanced temporal models for B2B applications
2. **Focus on static features**: Most B2B lead scoring papers still focus on traditional static features rather than temporal event sequences
3. **Lack of standardized benchmarks**: No papers found comparing temporal vs static feature performance on B2B lead scoring tasks
4. **Industry-specific applications**: Limited research on using specific business events (funding rounds, hiring spikes, tech stack changes) as predictive signals

## Recommendations for Future Research:

Based on the search results, the most promising direction appears to be:

1. **Adapt RHP for business events**: The Retentive Hawkes Process architecture could be adapted for business event sequences (funding, hiring, product launches)
2. **Multi-modal temporal modeling**: Combine temporal event sequences with static company features
3. **Graph-enhanced temporal models**: Incorporate company relationship networks (investor networks, partnership networks) with temporal event sequences
4. **Benchmark creation**: Develop standardized datasets and benchmarks for temporal B2B lead scoring

The field appears to be in early stages for the specific combination of temporal event sequences and B2B lead scoring, with most current research focusing on either temporal modeling techniques or traditional B2B lead scoring approaches separately.