# Implementation Guide -- Module 2: Information Extraction

Consolidated from `research-output/agent-03-ner-extraction-research.md` and
`research-output/agent-10-ner-extraction-impl.md`.

---

## 1. BERT NER Fine-tuning on Custom B2B Entities

### Data Labeling Strategy

**Literature basis:** Zhang et al. (2019) -- ERNIE demonstrates that
incorporating external knowledge (knowledge graphs) during pre-training
improves entity recognition. Ratner et al. (2020) -- Snorkel enables
programmatic labeling at scale.

**Labeling pipeline:**

1. **Weak supervision (Snorkel)** for press releases:
   - Pattern matching (regex for company names, products)
   - Dictionary lookups (industry term lists, Crunchbase exports)
   - Distant supervision from existing knowledge bases
2. **Progressive fine-tuning:** CoNLL-2003 -> general business text -> B2B
   press releases
3. **P-Tuning v2** (Liu et al., 2022) for efficient adaptation with limited
   labeled data -- avoids full weight updates

### Entity Type Definitions

| Type             | Source for distant supervision          |
|------------------|-----------------------------------------|
| `ORG`            | Crunchbase company names, SEC filings   |
| `PERSON`         | LinkedIn profiles, author bylines       |
| `LOCATION`       | GeoNames, OpenStreetMap                 |
| `PRODUCT`        | Product catalogs, press release titles  |
| `INDUSTRY`       | NAICS/SIC code descriptions             |
| `FUNDING_ROUND`  | Pattern-based (Series A, Seed, etc.)    |

### Training Configuration

```python
training_config = {
    "learning_rate": 2e-5,
    "batch_size": 16,
    "max_seq_length": 512,
    "num_epochs": 3,            # early stopping recommended
    "warmup_steps": 500,
    "weight_decay": 0.01,
    "gradient_accumulation_steps": 2,
}
```

---

## 2. spaCy + Transformers Integration

**Literature basis:** Sun et al. (2020) -- ERNIE 2.0 shows multi-task learning
improves performance on related NLP tasks, validating the shared-backbone
approach.

### Custom spaCy Pipeline

```python
import logging
import spacy
from spacy.tokens import Span
from spacy.language import Language
from spacy_transformers import Transformer

logger = logging.getLogger(__name__)

nlp = spacy.blank("en")

config = {
    "model": {
        "@architectures": "spacy-transformers.TransformerModel.v3",
        "name": "bert-base-cased",
        "tokenizer_config": {"use_fast": True},
    }
}
nlp.add_pipe("transformer", config=config)


@Language.factory("custom_ner")
def create_custom_ner(nlp, name):
    return CustomNERComponent(nlp)


class CustomNERComponent:
    def __init__(self, nlp):
        self.model = load_bert_ner_model()

    def __call__(self, doc):
        try:
            trf_data = doc._.trf_data
            entities = self.model.predict(trf_data)
            doc.ents = [
                Span(doc, start, end, label)
                for (start, end, label) in entities
            ]
        except Exception as exc:
            logger.error("NER failed for doc len=%d: %s", len(doc), exc)
            # Return doc with empty ents rather than crashing the pipeline
        return doc
```

**Processing tips:**

- Use `nlp.pipe()` for batch processing -- avoids per-document overhead
- Implement streaming for large documents via `Doc.from_docs()`
- Cache transformer embeddings for reuse across NER, relation, and topic
  components

---

## 3. Relation Extraction Model Training

### Negative Sampling

```python
import random
import logging

logger = logging.getLogger(__name__)


def generate_negative_examples(positive_pairs, n_negatives=3):
    """Generate hard negative examples for relation classification."""
    negatives = []
    for sent, (ent1, ent2, _relation) in positive_pairs:
        all_entities = extract_all_entities(sent)
        if len(all_entities) < 2:
            continue
        for _ in range(n_negatives):
            neg_pair = random.sample(all_entities, 2)
            if tuple(neg_pair) != (ent1, ent2):
                negatives.append((sent, neg_pair[0], neg_pair[1], "none"))
    logger.info("Generated %d negatives from %d positives",
                len(negatives), len(positive_pairs))
    return negatives
```

### Hybrid Architecture

```python
import logging
import spacy
from transformers import BertForSequenceClassification

logger = logging.getLogger(__name__)

RELATION_LABELS = [
    "company_in_industry", "company_launched_product",
    "company_acquired_company", "person_joined_company",
    "company_raised_funding", "company_partnered_company",
    "person_founded_company", "company_expanded_location",
    "person_left_company", "company_ipo", "company_hired_person",
    "company_merged_company", "none",
]


class HybridRelationExtractor:
    def __init__(self, dep_path_max=4):
        self.dep_parser = spacy.load("en_core_web_sm")
        self.bert_classifier = BertForSequenceClassification.from_pretrained(
            "bert-base-cased", num_labels=len(RELATION_LABELS)
        )
        self.dep_path_max = dep_path_max

    def extract_candidate_pairs(self, doc):
        """Dependency-parse filter: keep pairs within dep_path_max hops."""
        candidates = []
        for ent1 in doc.ents:
            for ent2 in doc.ents:
                if ent1 == ent2:
                    continue
                try:
                    path = self._get_dependency_path(ent1, ent2)
                    if len(path) <= self.dep_path_max:
                        candidates.append((ent1, ent2, path))
                except ValueError:
                    # Disconnected spans -- skip
                    continue
        return candidates

    def classify_relation(self, sent, ent1, ent2):
        """BERT classification with entity markers."""
        input_text = (
            f"[CLS] {sent} [SEP] {ent1.text} [SEP] {ent2.text} [SEP]"
        )
        try:
            return self.bert_classifier(input_text)
        except Exception as exc:
            logger.error("Relation classification failed: %s", exc)
            return None

    # ---- internal ----

    @staticmethod
    def _get_dependency_path(ent1, ent2):
        """Return shortest dependency path tokens between two entities."""
        head1 = ent1.root
        head2 = ent2.root
        path = []
        current = head1
        visited = set()
        while current != current.head and current not in visited:
            visited.add(current)
            path.append(current)
            current = current.head
            if current == head2:
                return path
        raise ValueError("No path found")
```

---

## 4. Efficient Inference Optimization

### ONNX Export and Quantization

```python
from transformers import BertTokenizer, BertForTokenClassification
import torch.onnx

model = BertForTokenClassification.from_pretrained("bert-ner-model")
tokenizer = BertTokenizer.from_pretrained("bert-base-cased")

dummy_input = tokenizer("Example text", return_tensors="pt")

torch.onnx.export(
    model,
    tuple(dummy_input.values()),
    "bert_ner.onnx",
    input_names=["input_ids", "attention_mask", "token_type_ids"],
    output_names=["logits"],
    dynamic_axes={
        "input_ids":      {0: "batch_size", 1: "sequence_length"},
        "attention_mask":  {0: "batch_size", 1: "sequence_length"},
        "token_type_ids":  {0: "batch_size", 1: "sequence_length"},
        "logits":          {0: "batch_size", 1: "sequence_length"},
    },
    opset_version=13,
)

from onnxruntime.quantization import quantize_dynamic, QuantType

quantize_dynamic(
    "bert_ner.onnx",
    "bert_ner_quantized.onnx",
    weight_type=QuantType.QUInt8,
)
```

### Batched Inference with Dynamic Padding

```python
import asyncio
import logging
import onnxruntime as ort
from transformers import BertTokenizerFast

logger = logging.getLogger(__name__)


class OptimizedInference:
    def __init__(self, model_path, batch_size=32, max_seq_len=512):
        self.session = ort.InferenceSession(model_path)
        self.batch_size = batch_size
        self.max_seq_len = max_seq_len
        self.tokenizer = BertTokenizerFast.from_pretrained("bert-base-cased")

    def dynamic_batching(self, texts):
        """Sort-then-batch to minimise padding waste."""
        indexed = sorted(enumerate(texts), key=lambda t: len(t[1]))
        batches = []
        for i in range(0, len(indexed), self.batch_size):
            batch = indexed[i : i + self.batch_size]
            batch_texts = [t for _, t in batch]
            original_indices = [idx for idx, _ in batch]
            max_len = min(
                max(len(t.split()) for t in batch_texts) + 10,
                self.max_seq_len,
            )
            inputs = self.tokenizer(
                batch_texts,
                padding="max_length",
                max_length=max_len,
                truncation=True,
                return_tensors="np",
            )
            batches.append((original_indices, inputs))
        return batches

    async def process_batch(self, batch_inputs):
        """Run inference off the event loop."""
        loop = asyncio.get_event_loop()
        try:
            outputs = await loop.run_in_executor(
                None, self.session.run, None, dict(batch_inputs)
            )
            return outputs
        except Exception as exc:
            logger.error("ONNX batch inference failed: %s", exc)
            return None
```

**Additional optimisation levers:**

- Mixed-precision inference (FP16) where hardware supports it
- Model distillation to DistilBERT/TinyBERT (2x speedup, <1% F1 drop)
- CPU back-ends: MKL-DNN (Intel), Accelerate (Apple Silicon)

---

## 5. ChromaDB Ingestion Patterns

### Schema

```python
page_schema = {
    "required": {
        "url_hash":   "str",            # primary key
        "embedding":  "float32[384]",   # sentence-transformer
        "clean_text": "str",            # first 2000 chars
        "timestamp":  "float64",        # unix
    },
    "indexed": {
        "domain":         "str",
        "has_org_entity": "bool",
        "crawl_date":     "date",
    },
    "unindexed": {
        "entities_json":  "str",
        "relations_json": "str",
        "topics_json":    "str",
        "title":          "str",
        "raw_url":        "str",
    },
}
```

### Chunking with Entity-Boundary Awareness

```python
from nltk.tokenize import sent_tokenize


def chunk_document(text, max_tokens=512, overlap_tokens=64):
    """Sentence-boundary-aware chunking with token overlap."""
    sentences = sent_tokenize(text)
    chunks, current, length = [], [], 0

    for sentence in sentences:
        n = len(sentence.split())
        if length + n > max_tokens and current:
            chunks.append(" ".join(current))
            # overlap: keep trailing sentences that fit within overlap budget
            tail, tail_len = [], 0
            for s in reversed(current):
                sn = len(s.split())
                if tail_len + sn > overlap_tokens:
                    break
                tail.insert(0, s)
                tail_len += sn
            current = tail + [sentence]
            length = sum(len(s.split()) for s in current)
        else:
            current.append(sentence)
            length += n

    if current:
        chunks.append(" ".join(current))
    return chunks
```

### Deduplication

```python
import logging

logger = logging.getLogger(__name__)


def check_duplicate(page_collection, content_embedding, domain, threshold=0.05):
    """Return (is_dup, existing_id | None)."""
    try:
        results = page_collection.query(
            query_embeddings=[content_embedding],
            n_results=5,
            where={"domain": domain},
            include=["metadatas", "distances"],
        )
    except Exception as exc:
        logger.error("ChromaDB query failed during dedup: %s", exc)
        return False, None

    dists = results.get("distances", [[]])[0]
    if dists and dists[0] < threshold:
        dup_id = results["ids"][0][0]
        logger.info("Near-duplicate found: %s (dist=%.4f)", dup_id, dists[0])
        return True, dup_id
    return False, None
```

---

## 6. Production Deployment

### Quality Monitoring

```python
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)


class QualityMonitor:
    def __init__(self):
        self.entity_counts = defaultdict(int)
        self.relation_counts = defaultdict(int)
        self.error_log = []

    def track(self, profile, ground_truth=None):
        metrics = {
            "entities_found": len(profile.get("entities", [])),
            "relations_found": len(profile.get("relations", [])),
            "org_entities": sum(
                1 for e in profile.get("entities", []) if e["type"] == "ORG"
            ),
        }
        if ground_truth:
            metrics["entity_precision"] = _precision(
                profile["entities"], ground_truth["entities"]
            )
            metrics["entity_recall"] = _recall(
                profile["entities"], ground_truth["entities"]
            )
        return metrics
```

### Worker Pool

```python
import logging
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor, as_completed

logger = logging.getLogger(__name__)


class ExtractionWorkerPool:
    def __init__(self, num_workers=None):
        self.num_workers = num_workers or max(mp.cpu_count() - 1, 1)

    def process_batch(self, html_documents):
        chunk_size = max(len(html_documents) // self.num_workers, 1)
        chunks = [
            html_documents[i : i + chunk_size]
            for i in range(0, len(html_documents), chunk_size)
        ]
        results = []
        with ProcessPoolExecutor(max_workers=self.num_workers) as pool:
            futures = {
                pool.submit(_process_chunk, chunk): idx
                for idx, chunk in enumerate(chunks)
            }
            for future in as_completed(futures):
                try:
                    results.extend(future.result())
                except Exception as exc:
                    logger.error("Worker chunk %d failed: %s",
                                 futures[future], exc)
        return results


def _process_chunk(chunk):
    """Top-level function so it is picklable."""
    models = {
        "ner": load_ner_model(),
        "relation": load_relation_model(),
        "topic": load_topic_model(),
    }
    out = []
    for html in chunk:
        try:
            out.append(extract_page_profile(html, models))
        except Exception as exc:
            logger.error("Extraction failed for document: %s", exc)
    return out
```

---

## References

1. Zhang et al. (2019) -- [ERNIE: Enhanced Language Representation with Informative Entities](https://doi.org/10.18653/v1/p19-1139)
2. Liu et al. (2022) -- [P-Tuning v2](https://doi.org/10.18653/v1/2022.acl-short.8)
3. Sun et al. (2020) -- [ERNIE 2.0](https://doi.org/10.1609/aaai.v34i05.6428)
4. Shuvo et al. (2022) -- [Efficient Acceleration of Deep Learning Inference on Resource-Constrained Edge Devices](https://doi.org/10.1109/jproc.2022.3226481)
5. Ratner et al. (2020) -- [Snorkel: Rapid Training Data Creation with Weak Supervision](https://pubmed.ncbi.nlm.nih.gov/32214778)
6. Khurana et al. (2022) -- [NLP: State of the Art, Trends and Challenges](https://doi.org/10.1007/s11042-022-13428-4)
7. Reimers & Gurevych (2019) -- [Sentence-BERT](https://doi.org/10.18653/v1/d19-1410)
8. Barbaresi (2021) -- [Trafilatura](https://doi.org/10.18653/v1/2021.acl-demo.15)
9. Devlin et al. (2018) -- [BERT](https://drops.dagstuhl.de/entities/document/10.4230/OASIcs.LDK.2019.21)
10. Ding et al. (2021) -- [Few-NERD](https://doi.org/10.18653/v1/2021.acl-long.248)
11. Zhong & Chen (2021) -- [A Frustratingly Easy Approach for Entity and Relation Extraction](https://doi.org/10.18653/v1/2021.naacl-main.5)
12. Wu et al. (2024) -- [A Survey on Neural Topic Models](https://doi.org/10.1007/s10462-023-10661-7)
13. Ma et al. (2023) -- [LLM Is Not a Good Few-shot IE, but a Good Reranker](https://doi.org/10.18653/v1/2023.findings-emnlp.710)
14. Xiang et al. (2023) -- [ChatIE: Zero-Shot IE via ChatGPT](http://arxiv.org/abs/2302.10205)
