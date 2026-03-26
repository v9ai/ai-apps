Based on my research, I'll now provide comprehensive implementation guidance for your Scrapus pipeline. Let me synthesize the findings from the literature:

# Implementation Best Practices for Scrapus Information Extraction Pipeline

Based on literature research, here are actionable implementation guidelines for your B2B lead generation pipeline:

## 1. BERT NER Fine-tuning on Custom B2B Entities

### Data Labeling Strategy
**Literature Insight:** **Zhang et al. (2019)** [ERNIE: Enhanced Language Representation with Informative Entities](https://doi.org/10.18653/v1/p19-1139) demonstrates that incorporating external knowledge (like knowledge graphs) during pre-training improves entity recognition performance.

**Implementation Recommendations:**

1. **Weak Supervision for Data Labeling:**
   - Use **Snorkel** (Ratner et al., 2020) for programmatic labeling of press releases
   - Create labeling functions based on:
     - Pattern matching (regex for company names, products)
     - Dictionary lookups (industry term lists)
     - Distant supervision from existing knowledge bases

2. **Few-shot Adaptation:**
   - Start with CoNLL-2003 fine-tuned BERT as base
   - Use **P-Tuning v2** (Liu et al., 2022) [P-Tuning: Prompt Tuning Can Be Comparable to Fine-tuning Across Scales and Tasks](https://doi.org/10.18653/v1/2022.acl-short.8) for efficient adaptation with limited labeled data
   - Implement progressive fine-tuning: CoNLL → general business text → B2B press releases

3. **Entity Type Expansion:**
   - Add B2B-specific entity types:
     - `PRODUCT/SERVICE`: Use product catalogs for distant supervision
     - `INDUSTRY`: Map to standard industry classifications (NAICS/SIC)
     - `FUNDING_ROUND`: Pattern-based extraction (Series A, Seed, etc.)

### Training Configuration
```python
# Recommended hyperparameters from literature
training_config = {
    "learning_rate": 2e-5,  # Lower for fine-tuning
    "batch_size": 16,       # Adjust based on GPU memory
    "max_seq_length": 512,  # BERT's maximum
    "num_epochs": 3,        # Early stopping recommended
    "warmup_steps": 500,
    "weight_decay": 0.01,
    "gradient_accumulation_steps": 2,  # For larger effective batch size
}
```

## 2. spaCy + Transformers Integration

### Pipeline Component Design
**Literature Insight:** **Sun et al. (2020)** [ERNIE 2.0: A Continual Pre-Training Framework for Language Understanding](https://doi.org/10.1609/aaai.v34i05.6428) shows that multi-task learning improves performance on related NLP tasks.

**Implementation Recommendations:**

1. **Custom spaCy Pipeline:**
```python
import spacy
from spacy_transformers import Transformer, TransformerModel

nlp = spacy.blank("en")

# Add transformer component
config = {
    "model": {
        "@architectures": "spacy-transformers.TransformerModel.v3",
        "name": "bert-base-cased",
        "tokenizer_config": {"use_fast": True},
    }
}
nlp.add_pipe("transformer", config=config)

# Add custom NER component
@Language.factory("custom_ner")
def create_custom_ner(nlp, name):
    return CustomNERComponent(nlp)

class CustomNERComponent:
    def __init__(self, nlp):
        self.model = load_bert_ner_model()
    
    def __call__(self, doc):
        # Get transformer outputs
        trf_data = doc._.trf_data
        # Run custom NER logic
        entities = self.model.predict(trf_data)
        # Add to doc.ents
        doc.ents = [Span(doc, start, end, label) 
                   for (start, end, label) in entities]
        return doc
```

2. **Efficient Processing:**
   - Use spaCy's `nlp.pipe()` for batch processing
   - Implement streaming for large documents
   - Cache transformer embeddings for reuse in multiple components

## 3. Relation Extraction Model Training

### Dataset Construction
**Literature Insight:** Hybrid approaches combining dependency parsing with neural classifiers show strong performance for relation extraction.

**Implementation Recommendations:**

1. **Negative Sampling Strategy:**
```python
def generate_negative_examples(positive_pairs, sentences, n_negatives=3):
    """Generate hard negative examples for relation classification"""
    negatives = []
    for sent, (ent1, ent2, relation) in positive_pairs:
        # Strategy 1: Random entity pairs from same sentence
        all_entities = extract_all_entities(sent)
        for _ in range(n_negatives):
            if len(all_entities) >= 2:
                neg_pair = random.sample(all_entities, 2)
                if neg_pair != (ent1, ent2):
                    negatives.append((sent, neg_pair[0], neg_pair[1], "none"))
        
        # Strategy 2: Same entities, different contexts
        # Find sentences with same entities but no relation
        # (requires corpus search)
    
    return negatives
```

2. **Hybrid Architecture:**
```python
class HybridRelationExtractor:
    def __init__(self):
        self.dep_parser = spacy.load("en_core_web_sm")
        self.bert_classifier = BertForSequenceClassification.from_pretrained(
            "bert-base-cased", num_labels=13  # 12 relations + "none"
        )
    
    def extract_candidate_pairs(self, doc):
        """Use dependency parsing to find candidate entity pairs"""
        candidates = []
        for ent1 in doc.ents:
            for ent2 in doc.ents:
                if ent1 != ent2:
                    # Check dependency path distance
                    path = self.get_dependency_path(ent1, ent2)
                    if len(path) <= 4:  # Configurable threshold
                        candidates.append((ent1, ent2, path))
        return candidates
    
    def classify_relation(self, sent, ent1, ent2):
        """BERT-based relation classification"""
        # Create input: [CLS] sent [SEP] ent1 [SEP] ent2 [SEP]
        input_text = f"[CLS] {sent} [SEP] {ent1.text} [SEP] {ent2.text} [SEP]"
        # Run through BERT classifier
        return self.bert_classifier(input_text)
```

## 4. Efficient Inference Optimization

### ONNX Export and Quantization
**Literature Insight:** **Shuvo et al. (2022)** [Efficient Acceleration of Deep Learning Inference on Resource-Constrained Edge Devices](https://doi.org/10.1109/jproc.2022.3226481) provides comprehensive techniques for optimizing inference.

**Implementation Recommendations:**

1. **Model Optimization Pipeline:**
```python
# Step 1: Export to ONNX
from transformers import BertTokenizer, BertForTokenClassification
import torch.onnx

model = BertForTokenClassification.from_pretrained("bert-ner-model")
tokenizer = BertTokenizer.from_pretrained("bert-base-cased")

# Create dummy input
dummy_input = tokenizer("Example text", return_tensors="pt")

# Export
torch.onnx.export(
    model,
    tuple(dummy_input.values()),
    "bert_ner.onnx",
    input_names=["input_ids", "attention_mask", "token_type_ids"],
    output_names=["logits"],
    dynamic_axes={
        "input_ids": {0: "batch_size", 1: "sequence_length"},
        "attention_mask": {0: "batch_size", 1: "sequence_length"},
        "token_type_ids": {0: "batch_size", 1: "sequence_length"},
        "logits": {0: "batch_size", 1: "sequence_length"}
    },
    opset_version=13
)

# Step 2: Quantization
import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType

quantize_dynamic(
    "bert_ner.onnx",
    "bert_ner_quantized.onnx",
    weight_type=QuantType.QUInt8  # or QInt8 for better accuracy
)
```

2. **Batching Strategies:**
```python
class OptimizedInference:
    def __init__(self, model_path, batch_size=32, max_seq_len=512):
        self.session = ort.InferenceSession(model_path)
        self.batch_size = batch_size
        self.max_seq_len = max_seq_len
        self.tokenizer = BertTokenizerFast.from_pretrained("bert-base-cased")
    
    def dynamic_batching(self, texts):
        """Dynamic batching based on sequence length"""
        # Sort by length for efficient padding
        texts.sort(key=len)
        batches = []
        
        for i in range(0, len(texts), self.batch_size):
            batch_texts = texts[i:i+self.batch_size]
            # Pad to max length in batch (not global max)
            max_len = min(max(len(t) for t in batch_texts), self.max_seq_len)
            inputs = self.tokenizer(
                batch_texts,
                padding="max_length",
                max_length=max_len,
                truncation=True,
                return_tensors="np"
            )
            batches.append(inputs)
        
        return batches
    
    async def process_batch(self, batch_inputs):
        """Async batch processing"""
        outputs = await asyncio.get_event_loop().run_in_executor(
            None, self.session.run, None, dict(batch_inputs)
        )
        return outputs
```

3. **Performance Optimization:**
   - Use **mixed precision inference** (FP16) where supported
   - Implement **model caching** for frequently seen patterns
   - Use **CPU optimizations**: MKL-DNN for Intel, OpenBLAS for AMD
   - Consider **model distillation** to smaller architectures (DistilBERT, TinyBERT)

## 5. ChromaDB Ingestion Patterns

### Metadata Schema Design
**Implementation Recommendations:**

1. **Optimized Schema:**
```python
page_schema = {
    "required_fields": {
        "url_hash": "str",           # Primary key
        "embedding": "float32[384]", # Sentence transformer embedding
        "clean_text": "str",         # First 2000 chars
        "timestamp": "float64",      # Unix timestamp
    },
    "indexed_fields": {
        "domain": "str",             # For domain-based queries
        "has_org_entity": "bool",    # For filtering
        "crawl_date": "date",        # Date partitioning
    },
    "unindexed_fields": {
        "entities_json": "str",      # JSON string
        "relations_json": "str",     # JSON string  
        "topics_json": "str",        # JSON string
        "title": "str",              # Page title
        "raw_url": "str",            # Original URL
    }
}
```

2. **Chunking Strategy for Large Documents:**
```python
def chunk_document(text, max_chunk_size=1000, overlap=200):
    """Smart document chunking preserving entity context"""
    chunks = []
    
    # Sentence segmentation
    sentences = sent_tokenize(text)
    
    current_chunk = []
    current_length = 0
    
    for sentence in sentences:
        sent_length = len(sentence.split())
        
        if current_length + sent_length > max_chunk_size and current_chunk:
            # Save current chunk
            chunks.append(" ".join(current_chunk))
            
            # Start new chunk with overlap
            overlap_sentences = current_chunk[-3:]  # Last 3 sentences
            current_chunk = overlap_sentences + [sentence]
            current_length = sum(len(s.split()) for s in current_chunk)
        else:
            current_chunk.append(sentence)
            current_length += sent_length
    
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    return chunks

# Store chunks with parent-child relationships
for i, chunk in enumerate(chunks):
    page_collection.add(
        ids=[f"{url_hash}_chunk_{i}"],
        embeddings=[chunk_embedding],
        metadatas=[{
            "parent_id": url_hash,
            "chunk_index": i,
            "total_chunks": len(chunks),
            "contains_entities": has_entities(chunk),
            **base_metadata
        }],
        documents=[chunk]
    )
```

3. **Deduplication Strategy:**
```python
def check_duplicate(url_hash, content_embedding, threshold=0.05):
    """Check for near-duplicate content"""
    results = page_collection.query(
        query_embeddings=[content_embedding],
        n_results=5,
        where={"domain": current_domain},  # Filter by domain
        include=["metadatas", "distances"]
    )
    
    if results["distances"][0] and results["distances"][0][0] < threshold:
        # Near-duplicate found
        duplicate_id = results["ids"][0][0]
        duplicate_metadata = results["metadatas"][0][0]
        
        # Update metadata with new reference
        update_duplicate_chain(duplicate_id, url_hash)
        
        return True, duplicate_id
    
    return False, None
```

## 6. Production Deployment Considerations

### Monitoring and Quality Assurance
1. **Performance Metrics:**
   - Throughput: documents/second
   - Latency: P95, P99 inference times
   - Accuracy: F1 score on validation set
   - Memory usage: peak RAM consumption

2. **Quality Monitoring:**
```python
class QualityMonitor:
    def __init__(self):
        self.entity_counts = defaultdict(int)
        self.relation_counts = defaultdict(int)
        self.error_log = []
    
    def track_extraction_quality(self, page_profile, ground_truth=None):
        """Monitor extraction quality over time"""
        metrics = {
            "entities_found": len(page_profile["entities"]),
            "relations_found": len(page_profile["relations"]),
            "org_entities": sum(1 for e in page_profile["entities"] 
                              if e["type"] == "ORG"),
            "unique_entities": len(set(e["name"] for e in page_profile["entities"])),
        }
        
        if ground_truth:
            metrics.update({
                "entity_precision": calculate_precision(
                    page_profile["entities"], ground_truth["entities"]),
                "entity_recall": calculate_recall(
                    page_profile["entities"], ground_truth["entities"]),
                "relation_precision": calculate_precision(
                    page_profile["relations"], ground_truth["relations"]),
            })
        
        return metrics
```

### Scalability Patterns
1. **Worker Pool Architecture:**
```python
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor

class ExtractionWorkerPool:
    def __init__(self, num_workers=None):
        self.num_workers = num_workers or mp.cpu_count() - 1
        self.model_cache = {}  # Shared model cache
    
    def process_batch(self, html_documents):
        """Parallel batch processing"""
        with ProcessPoolExecutor(max_workers=self.num_workers) as executor:
            # Chunk documents for parallel processing
            chunk_size = len(html_documents) // self.num_workers
            chunks = [html_documents[i:i+chunk_size] 
                     for i in range(0, len(html_documents), chunk_size)]
            
            # Process in parallel
            futures = [executor.submit(self.process_chunk, chunk) 
                      for chunk in chunks]
            
            # Collect results
            results = []
            for future in futures:
                results.extend(future.result())
            
            return results
    
    def process_chunk(self, chunk):
        """Worker process function"""
        # Load models on first use (cached per process)
        if "models" not in self.model_cache:
            self.model_cache["models"] = {
                "ner": load_ner_model(),
                "relation": load_relation_model(),
                "topic": load_topic_model(),
            }
        
        models = self.model_cache["models"]
        results = []
        
        for html in chunk:
            profile = self.extract_page_profile(html, models)
            results.append(profile)
        
        return results
```

## References

1. **Zhang et al. (2019)** [ERNIE: Enhanced Language Representation with Informative Entities](https://doi.org/10.18653/v1/p19-1139)
2. **Liu et al. (2022)** [P-Tuning: Prompt Tuning Can Be Comparable to Fine-tuning Across Scales and Tasks](https://doi.org/10.18653/v1/2022.acl-short.8)
3. **Sun et al. (2020)** [ERNIE 2.0: A Continual Pre-Training Framework for Language Understanding](https://doi.org/10.1609/aaai.v34i05.6428)
4. **Martin et al. (2020)** [CamemBERT: a Tasty French Language Model](https://doi.org/10.18653/v1/2020.acl-main.645)
5. **Shuvo et al. (2022)** [Efficient Acceleration of Deep Learning Inference on Resource-Constrained Edge Devices](https://doi.org/10.1109/jproc.2022.3226481)
6. **Ratner et al. (2020)** [Snorkel: rapid training data creation with weak supervision](https://pubmed.ncbi.nlm.nih.gov/32214778)
7. **Khurana et al. (2022)** [Natural language processing: state of the art, current trends and challenges](https://doi.org/10.1007/s11042-022-13428-4)

These implementation guidelines provide a production-ready foundation for your Scrapus pipeline, balancing accuracy, efficiency, and maintainability based on current literature and best practices.