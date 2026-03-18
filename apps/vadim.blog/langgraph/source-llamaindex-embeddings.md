# LlamaIndex Embeddings for Healthcare RAG: From PDF to pgvector in Production

## Overview

This is a production embedding pipeline for a healthcare application that processes blood test PDFs, extracts clinical markers, computes derived clinical metrics, embeds seven entity types into PostgreSQL with pgvector, and serves hybrid search. The entire pipeline is built on LlamaIndex abstractions (Document, TextNode, IngestionPipeline, VectorStoreIndex) with FastEmbed (BAAI/bge-large-en-v1.5, 1024-dim vectors). A 500+ line eval suite validates that the embeddings actually cluster, rank, and retrieve correctly using geometric assertions, LlamaIndex VectorStoreIndex retrieval tests, and LLM-judged quality via DeepEval with a DeepSeek judge.

---

## The Embedding Model: BAAI/bge-large-en-v1.5

The pipeline uses a single embedding model throughout: BAAI/bge-large-en-v1.5 via LlamaIndex's FastEmbedEmbedding integration, producing 1024-dimensional vectors.

```python
from llama_index.embeddings.fastembed import FastEmbedEmbedding

_embed_model: FastEmbedEmbedding | None = None

def get_embed_model() -> FastEmbedEmbedding:
    global _embed_model
    if _embed_model is None:
        _embed_model = FastEmbedEmbedding(model_name=app_settings.embed_model)
    return _embed_model

def generate_embedding(text: str) -> list[float]:
    model = get_embed_model()
    return model.get_text_embedding(text)

async def agenerate_embedding(text: str) -> list[float]:
    model = get_embed_model()
    return await model.aget_text_embedding(text)
```

Critical design decision: the pipeline does NOT set Settings.embed_model globally because the chat server's RAG pipeline uses a different, smaller model (bge-small-en-v1.5, 384-dim). The IngestionPipeline receives the model explicitly as a transformation, keeping the two pipelines isolated.

---

## LlamaIndex Document and TextNode Abstractions

### The Marker Dataclass

Blood test markers are represented as a simple Python dataclass:

```python
@dataclass
class Marker:
    name: str
    value: str
    unit: str
    reference_range: str
    flag: str  # "normal", "high", "low"

    def to_dict(self) -> dict[str, str]:
        return asdict(self)
```

### Blood Test Document

A single blood test PDF produces one LlamaIndex Document representing the entire test:

```python
def build_test_document(
    markers: list[Marker], meta: dict[str, str],
    test_id: str, user_id: str,
) -> Document:
    content = format_test_for_embedding(markers, meta)
    return Document(
        doc_id=f"test:{test_id}",
        text=content,
        metadata={
            "test_id": test_id, "user_id": user_id,
            "file_name": meta["fileName"], "uploaded_at": meta["uploadedAt"],
            "marker_count": len(markers),
            "abnormal_count": sum(1 for m in markers if m.flag != "normal"),
            "node_type": "blood_test",
        },
    )
```

### Per-Marker TextNodes

Each extracted marker gets its own LlamaIndex TextNode:

```python
def build_marker_nodes(
    markers: list[Marker], marker_ids: list[str],
    test_id: str, user_id: str, meta: dict[str, str],
) -> list[TextNode]:
    nodes: list[TextNode] = []
    for marker, mid in zip(markers, marker_ids):
        content = format_marker_for_embedding(marker, meta)
        nodes.append(TextNode(
            id_=f"marker:{mid}",
            text=content,
            metadata={
                "marker_id": mid, "test_id": test_id, "user_id": user_id,
                "marker_name": marker.name, "flag": marker.flag,
                "node_type": "blood_marker",
            },
        ))
    return nodes
```

### Health State Node with Derived Clinical Ratios

The third node type combines all markers with computed clinical ratios and risk classifications:

```python
def build_health_state_node(
    markers: list[Marker], test_id: str, user_id: str, meta: dict[str, str],
) -> TextNode:
    derived = compute_derived_metrics(markers)
    content = format_health_state_for_embedding(markers, derived, meta)
    return TextNode(
        id_=f"health_state:{test_id}",
        text=content,
        metadata={
            "test_id": test_id, "user_id": user_id,
            "derived_metrics": {k: v for k, v in derived.items() if v is not None},
            "node_type": "health_state",
        },
    )
```

---

## Text Formatting Pipeline

### Marker Formatting

```python
def format_marker_for_embedding(marker: Marker, meta: dict[str, str]) -> str:
    return "\n".join([
        f"Marker: {marker.name}",
        f"Value: {marker.value} {marker.unit}",
        f"Reference range: {marker.reference_range or 'N/A'}",
        f"Flag: {marker.flag}",
        f"Test: {meta['fileName']}",
        f"Date: {meta['testDate']}",
    ])
```

Including `Flag: high/low/normal` directly in the embedded text creates an abnormal-first retrieval bias: risk queries like "elevated LDL cholesterol cardiovascular risk" are semantically closer to `Flag: high` LDL markers than `Flag: normal` ones.

### Test Summary Formatting

```python
def format_test_for_embedding(markers: list[Marker], meta: dict[str, str]) -> str:
    flagged = [m for m in markers if m.flag != "normal"]
    summary = (
        f"{len(flagged)} abnormal marker(s): {', '.join(f'{m.name} ({m.flag})' for m in flagged)}"
        if flagged else "All markers within normal range"
    )
    lines = [
        f"{m.name}: {m.value} {m.unit} (ref: {m.reference_range or 'N/A'}) [{m.flag}]"
        for m in markers
    ]
    return "\n".join([
        f"Blood test: {meta['fileName']}", f"Date: {meta['uploadedAt']}",
        f"Summary: {summary}", "", *lines,
    ])
```

### Entity Formatters (Conditions, Medications, Symptoms, Appointments)

Every formatter starts with a type label that acts as a type discriminator in embedding space:

```python
def format_condition_for_embedding(name: str, notes: str | None) -> str:
    return f"Health condition: {name}\nNotes: {notes}" if notes else f"Health condition: {name}"

def format_medication_for_embedding(name: str, *, dosage=None, frequency=None, notes=None) -> str:
    lines = [f"Medication: {name}"]
    if dosage: lines.append(f"Dosage: {dosage}")
    if frequency: lines.append(f"Frequency: {frequency}")
    if notes: lines.append(f"Notes: {notes}")
    return "\n".join(lines)

def format_symptom_for_embedding(description: str, *, severity=None, logged_at=None) -> str:
    lines = [f"Symptom: {description}"]
    if severity: lines.append(f"Severity: {severity}")
    if logged_at: lines.append(f"Date: {logged_at}")
    return "\n".join(lines)

def format_appointment_for_embedding(title: str, *, provider=None, notes=None, appointment_date=None) -> str:
    lines = [f"Appointment: {title}"]
    if provider: lines.append(f"Provider: {provider}")
    if appointment_date: lines.append(f"Date: {appointment_date}")
    if notes: lines.append(f"Notes: {notes}")
    return "\n".join(lines)
```

---

## Derived Clinical Metrics

### Marker Alias Resolution

Lab reports use inconsistent naming. The system maps aliases to canonical keys:

```python
MARKER_ALIAS_MAP: dict[str, list[str]] = {
    "hdl": ["hdl", "hdl cholesterol", "hdl-c", "hdl-cholesterol"],
    "ldl": ["ldl", "ldl cholesterol", "ldl-c", "ldl-cholesterol"],
    "total_cholesterol": ["total cholesterol", "cholesterol total", "cholesterol"],
    "triglycerides": ["triglycerides", "triglyceride", "trig"],
    "glucose": ["glucose", "fasting glucose", "blood glucose"],
    "neutrophils": ["neutrophils", "neutrophil", "neutrophil count", "neut"],
    "lymphocytes": ["lymphocytes", "lymphocyte", "lymphocyte count", "lymph"],
    "bun": ["bun", "blood urea nitrogen", "urea nitrogen"],
    "creatinine": ["creatinine", "creat"],
    "ast": ["ast", "aspartate aminotransferase", "sgot"],
    "alt": ["alt", "alanine aminotransferase", "sgpt"],
}
```

### Seven Computed Clinical Ratios

| Metric | Label | Optimal | Borderline |
|--------|-------|---------|------------|
| hdl_ldl_ratio | HDL/LDL Ratio | > 0.4 | 0.3 -- 0.4 |
| total_cholesterol_hdl_ratio | TC/HDL Ratio | < 4.5 | 4.5 -- 5.5 |
| triglyceride_hdl_ratio | TG/HDL Ratio | < 2.0 | 2.0 -- 3.5 |
| glucose_triglyceride_index | TyG Index | < 8.5 | 8.5 -- 9.0 |
| neutrophil_lymphocyte_ratio | NLR | 1.0 -- 3.0 | 3.0 -- 5.0 |
| bun_creatinine_ratio | BUN/Creatinine | 10 -- 20 | 20 -- 25 |
| ast_alt_ratio | De Ritis Ratio (AST/ALT) | 0.8 -- 1.2 | 1.2 -- 2.0 |

The TyG index (Triglyceride-Glucose Index) is computed as `ln(TG * Glucose * 0.5)` and is a proxy for insulin resistance.

```python
def compute_derived_metrics(markers: list[Marker]) -> dict[str, float | None]:
    # ... alias resolution, ratio helper ...
    trig = resolve("triglycerides")
    gluc = resolve("glucose")
    gti = math.log(trig * gluc * 0.5) if trig and gluc and trig > 0 and gluc > 0 else None
    return {
        "hdl_ldl_ratio": ratio("hdl", "ldl"),
        "total_cholesterol_hdl_ratio": ratio("total_cholesterol", "hdl"),
        "triglyceride_hdl_ratio": ratio("triglycerides", "hdl"),
        "glucose_triglyceride_index": gti,
        "neutrophil_lymphocyte_ratio": ratio("neutrophils", "lymphocytes"),
        "bun_creatinine_ratio": ratio("bun", "creatinine"),
        "ast_alt_ratio": ratio("ast", "alt"),
    }
```

### Risk Classification

```python
def classify_metric_risk(metric_key: str, value: float) -> str:
    ref = METRIC_REFERENCES.get(metric_key)
    if not ref: return "optimal"
    opt_lo, opt_hi = ref["optimal"]
    bord_lo, bord_hi = ref["borderline"]
    if value < opt_lo:
        return "borderline" if value >= bord_lo else "low"
    if value <= opt_hi: return "optimal"
    if value <= bord_hi: return "borderline"
    return "elevated"
```

The risk label (optimal, borderline, elevated, low) is embedded as text in the health state node, creating semantic bridges for clinical reasoning queries.

### Health State Text Format (Example)

```
Health state: lipid_panel.pdf
Date: 2024-01-15T10:00:00+00:00
Total markers: 5
Summary: 4 abnormal marker(s): Total Cholesterol (high), Triglycerides (high), HDL (low), LDL (high)

Derived metrics (with risk classification):
HDL/LDL Ratio: 0.2452 [low]
TC/HDL Ratio: 6.4474 [elevated]
TG/HDL Ratio: 5.5263 [elevated]
TyG Index: 9.8267 [elevated]

All markers:
Total Cholesterol: 245 mg/dL (ref: 0 - 200) [high]
...
```

---

## PDF Parsing: LlamaParse to Element Dicts

### LlamaParse Integration

```python
from llama_parse import LlamaParse

def _partition_pdf(file_bytes: bytes, file_name: str) -> list[dict]:
    parser = LlamaParse(api_key=settings.llama_cloud_api_key, result_type="markdown")
    suffix = os.path.splitext(file_name)[1] or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    try:
        docs = parser.load_data(tmp_path)
    finally:
        os.unlink(tmp_path)
    elements: list[dict] = []
    for doc in docs:
        elements.extend(_markdown_to_elements(doc.text))
    return elements
```

### Markdown to Element Conversion

```python
def _markdown_to_elements(md: str) -> list[dict]:
    table_re = re.compile(r"(\|.+\|\n\|[-| :]+\|\n(?:\|.+\|\n?)*)", re.MULTILINE)
    elements: list[dict] = []
    last = 0
    for m in table_re.finditer(md):
        pre = md[last : m.start()].strip()
        if pre:
            elements.append({"type": "NarrativeText", "text": pre, "metadata": {}})
        elements.append({
            "type": "Table", "text": "",
            "metadata": {"text_as_html": _md_table_to_html(m.group(0))},
        })
        last = m.end()
    tail = md[last:].strip()
    if tail:
        elements.append({"type": "NarrativeText", "text": tail, "metadata": {}})
    return elements
```

### Three-Tier Marker Extraction

Tier 1: HTML tables — Standard lab panels with columns for name, value, unit, reference range.

Tier 2: Title + FormKeysValues — Romanian/European lab format where marker names appear as titles followed by FormKeysValues elements.

Tier 3: Free-text fallback — Regex scans for tab/multi-space separated marker lines.

```python
def parse_markers(elements: list[dict]) -> list[Marker]:
    # 1. HTML tables
    table_markers = []
    for el in elements:
        if el.get("type") == "Table" and el.get("metadata", {}).get("text_as_html"):
            table_markers.extend(parse_html_table(el["metadata"]["text_as_html"]))
    if table_markers: return _dedupe(table_markers)
    # 2. Title + FormKeysValues
    fkv = parse_form_key_values(elements)
    if fkv: return _dedupe(fkv)
    # 3. Text fallback
    text = "\n".join(el.get("text", "") for el in elements)
    return _dedupe(parse_text_markers(text))
```

The `compute_flag()` function handles reference range formats: "0-200", "<5.0", ">60", "nedetectabil" (Romanian for "undetectable"), and comma-as-decimal ("1,5" -> 1.5).

---

## The IngestionPipeline: LlamaIndex Orchestration

### Custom BloodTestNodeParser (TransformComponent)

```python
class BloodTestNodeParser(TransformComponent):
    def __call__(self, nodes: list[BaseNode], **kwargs) -> list[BaseNode]:
        out: list[BaseNode] = []
        for node in nodes:
            if not isinstance(node, Document):
                out.append(node)
                continue
            meta = node.metadata
            elements = meta.get("_raw_elements", [])
            markers = parse_markers(elements)
            if not markers:
                out.append(node)
                continue
            # 1. Test-level document
            out.append(build_test_document(markers, embed_meta, test_id, user_id))
            # 2. Per-marker nodes
            out.extend(build_marker_nodes(markers, marker_ids, test_id, user_id, marker_meta))
            # 3. Health-state node
            out.append(build_health_state_node(markers, test_id, user_id, embed_meta))
        return out
```

One input Document produces N+2 output nodes: 1 test summary + N marker nodes + 1 health state node.

### Pipeline Assembly

```python
def build_ingestion_pipeline() -> IngestionPipeline:
    return IngestionPipeline(
        transformations=[BloodTestNodeParser(), get_embed_model()])
```

Two transformations: BloodTestNodeParser splits Documents into typed TextNodes, then FastEmbedEmbedding generates 1024-dim vectors.

### Background Execution

```python
@router.post("/upload", response_model=UploadResponse)
async def upload_blood_test(file: UploadFile, user_id: str = Form(...),
    test_date: str | None = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks()):
    # ... parse PDF, extract markers, store in PG ...
    if markers:
        background_tasks.add_task(
            _run_ingestion, elements, test_id, user_id, file.filename, test_date, marker_ids)
    return UploadResponse(test_id=test_id, markers_count=len(markers), status="done")
```

The `_run_ingestion` function builds a Document with raw elements in metadata, runs the pipeline, and persists embedded nodes. `excluded_embed_metadata_keys` prevents internal routing metadata from polluting the embedding text.

---

## Vector Storage: PostgreSQL + pgvector

### Seven Embedding Tables

| Table | Primary Key | Vector Column | Additional |
|-------|------------|---------------|------------|
| blood_test_embeddings | test_id (unique) | vector(1024) | content, user_id |
| blood_marker_embeddings | marker_id (unique) | vector(1024) | content, marker_name, test_id, user_id |
| health_state_embeddings | test_id (unique) | vector(1024) | content, derived_metrics jsonb, user_id |
| condition_embeddings | condition_id (unique) | vector(1024) | content, user_id |
| medication_embeddings | medication_id (unique) | vector(1024) | content, user_id |
| symptom_embeddings | symptom_id (unique) | vector(1024) | content, user_id |
| appointment_embeddings | appointment_id (unique) | vector(1024) | content, user_id |

All use ON CONFLICT ... DO UPDATE for upserts. Vectors passed as NumPy float32 arrays via pgvector.psycopg extension.

### Connection Management

```python
def _connect() -> psycopg.Connection:
    conn = psycopg.connect(settings.database_url, autocommit=False)
    register_vector(conn)
    return conn
```

`register_vector(conn)` registers the pgvector type adapter on every connection.

---

## Search: Pure Vector and Hybrid

### Pure Cosine Similarity

```python
def search_blood_tests(embedding, user_id, threshold=0.3, limit=5):
    # 1 - (embedding <=> query) as similarity
    # WHERE 1 - (embedding <=> query) > threshold
    # ORDER BY embedding <=> query
```

The `<=>` operator is pgvector's cosine distance. `1 - distance` gives similarity. WHERE clause filters below threshold before sorting.

### Hybrid Search: FTS + Vector for Markers

```python
def search_markers_hybrid(query_text, embedding, user_id, threshold=0.3, limit=10):
    # combined_score = 0.3 * ts_rank(FTS) + 0.7 * (1 - cosine_distance)
    # Threshold filter applies to vector_similarity alone
```

Formula: `combined_score = 0.3 * FTS_rank + 0.7 * vector_similarity`

Vector similarity dominates (70%) because semantic matching catches synonyms and clinical context. FTS contributes 30% for exact marker name boosts.

### Multi-Entity Search: Embed Once, Search Everywhere

```python
@router.post("/multi")
async def search_multi(req: SearchRequest):
    embedding = generate_embedding(req.query)  # ONE embedding call
    return {
        "tests": search_blood_tests(embedding, req.user_id),
        "markers": search_markers_hybrid(req.query, embedding, req.user_id, limit=5),
        "conditions": search_conditions(embedding, req.user_id),
        "medications": search_medications(embedding, req.user_id),
        "symptoms": search_symptoms(embedding, req.user_id),
        "appointments": search_appointments(embedding, req.user_id),
    }
```

One embedding call, six parallel searches. Eval suite verifies this with a counting mock asserting call_count == 1.

### Marker Trend Search

```python
@router.post("/trend")
async def search_trend(req: TrendRequest):
    embedding = generate_embedding(req.query)
    return {"results": search_marker_trend(embedding, req.user_id, req.marker_name)}
```

Joins blood_marker_embeddings with blood_markers and blood_tests to return value, unit, flag, test_date alongside similarity — enables plotting marker trends over time.

---

## Entity Embedding Routes

All entity embedding operations centralized in Python so TypeScript never touches vector math:

```python
@router.post("/condition", response_model=EmbedResult)
async def embed_condition(req: ConditionRequest):
    content = format_condition_for_embedding(req.name, req.notes)
    embedding = generate_embedding(content)
    upsert_condition_embedding(condition_id=req.condition_id, user_id=req.user_id,
        content=content, embedding=embedding)
    return EmbedResult(ok=True)
```

Same pattern for /embed/medication, /embed/symptom, /embed/appointment. A /embed/reembed endpoint re-runs the full IngestionPipeline on existing tests. A /embed/text endpoint generates embeddings for arbitrary text.

---

## Eval Suite: 500+ Lines Proving It Works

### A. Cross-Organ Semantic Separation (5 Systems)

Tests that markers from the same organ system cluster closer together than markers from different systems. Five systems: cardiovascular, metabolic, renal, hepatic, inflammatory.

```python
class TestOrganSystemSeparation:
    @pytest.fixture(scope="class")
    def system_embeddings(self):
        systems = {
            "cardiovascular": [
                "Marker: Total Cholesterol\nValue: 245 mg/dL\nReference: 0-200\nFlag: high",
                "Marker: LDL Cholesterol\nValue: 155 mg/dL\nReference: 0-100\nFlag: high",
                "Marker: HDL Cholesterol\nValue: 38 mg/dL\nReference: 40-60\nFlag: low",
            ],
            "metabolic": [...], "renal": [...], "hepatic": [...], "inflammatory": [...],
        }
        return {sys: [_embed(text) for text in texts] for sys, texts in systems.items()}

    def test_cardiovascular_vs_renal(self, system_embeddings):
        intra_cv = np.mean([_cosine_sim(cv[i], cv[j]) for i in range(3) for j in range(i+1, 3)])
        inter_cv_renal = _cosine_sim(cv_centroid, renal_centroid)
        assert intra_cv > inter_cv_renal

    def test_all_systems_have_distinct_centroids(self, system_embeddings):
        for i, s1 in enumerate(systems):
            for s2 in systems[i+1:]:
                sim = _cosine_sim(centroids[s1], centroids[s2])
                assert sim < 0.95
```

### B. Medical Synonym & Lay-Term Resolution

Uses LlamaIndex VectorStoreIndex built from marker nodes, queried with lay terms:

```python
class TestSynonymResolution:
    @pytest.mark.parametrize("query,expected_markers", [
        ("good cholesterol levels", ["HDL Cholesterol"]),
        ("bad cholesterol", ["LDL Cholesterol"]),
        ("kidney function", ["Creatinine", "BUN"]),
        ("blood sugar", ["Glucose"]),
        ("iron in blood", ["Hemoglobin"]),
        ("infection markers", ["Neutrophils"]),
    ])
    def test_synonym_retrieval(self, index, query, expected_markers):
        retriever = index.as_retriever(similarity_top_k=3)
        results = retriever.retrieve(query)
        retrieved_names = [r.metadata.get("marker_name", "") for r in results]
        assert any(exp in retrieved_names for exp in expected_markers)
```

### C. Entity Embedding Quality

Tests that conditions cluster by disease type, medications cluster by indication, symptoms capture severity, appointments cluster by type:

```python
def test_medications_cluster(self):
    metformin = _embed(format_medication_for_embedding("Metformin", dosage="500mg", notes="For type 2 diabetes"))
    insulin = _embed(format_medication_for_embedding("Insulin Glargine", dosage="20 units", notes="Basal insulin"))
    atorvastatin = _embed(format_medication_for_embedding("Atorvastatin", dosage="40mg", notes="Cholesterol"))
    assert _cosine_sim(metformin, insulin) > _cosine_sim(metformin, atorvastatin)

def test_symptoms_capture_severity(self):
    mild = _embed(format_symptom_for_embedding("Headache", severity="mild"))
    severe = _embed(format_symptom_for_embedding("Headache", severity="severe"))
    fatigue = _embed(format_symptom_for_embedding("Fatigue", severity="moderate"))
    assert _cosine_sim(mild, severe) > _cosine_sim(mild, fatigue)
```

### D. Health State Embedding Signal

Three synthetic health profiles (healthy, metabolic syndrome, inflammatory) indexed and queried:

```python
def test_metabolic_risk_query(self, index):
    results = retriever.retrieve("insulin resistance and metabolic syndrome risk")
    assert results[0].metadata["test_id"] == "test-metab"

def test_inflammation_query(self, index):
    results = retriever.retrieve("systemic inflammation and elevated NLR")
    assert results[0].metadata["test_id"] == "test-inflam"
```

The metabolic query mentions "insulin resistance" -- a concept not literally in markers -- but embedded derived metrics (TyG index, TG/HDL ratio) carry enough signal.

### E. Abnormal-First Retrieval Bias

```python
def test_high_ldl_risk_query(self, index):
    results = retriever.retrieve("elevated LDL cholesterol cardiovascular risk")
    flags = [r.metadata.get("flag") for r in results]
    assert "high" in flags

def test_low_hdl_risk_query(self, index):
    results = retriever.retrieve("dangerously low HDL, cardiovascular protection lacking")
    flags = [r.metadata.get("flag") for r in results]
    assert "low" in flags
```

### F. Temporal Differentiation

```python
def test_same_marker_different_dates_differ(self):
    sim = _cosine_sim(emb_jan, emb_jun)
    assert 0.85 < sim < 1.0  # Similar but not identical

def test_different_values_same_marker_differ(self):
    sim = _cosine_sim(emb_normal, emb_high)
    assert 0.80 < sim < 0.99  # More distinct
```

Bounds (0.85-1.0 for date, 0.80-0.99 for value) are empirical thresholds tuned against bge-large-en-v1.5.

### G. Multi-Entity Retrieval

Unified index across all entity types:

```python
def test_condition_query(self, index):
    results = retriever.retrieve("What conditions have I been diagnosed with?")
    assert "condition" in [r.metadata.get("node_type") for r in results]

def test_medication_query(self, index):
    results = retriever.retrieve("What diabetes medication am I taking?")
    assert "medication" in [r.metadata.get("node_type") for r in results]

def test_appointment_query(self, index):
    results = retriever.retrieve("When is my next doctor's appointment?")
    assert "appointment" in [r.metadata.get("node_type") for r in results]
```

### Search Ranking Evals

```python
class TestSearchRanking:
    def test_cholesterol_query_ranks_lipid_over_renal(self):
        assert sim_lipid > sim_renal
    def test_kidney_query_ranks_renal_over_cbc(self):
        assert sim_renal > sim_cbc
    def test_inflammation_query_ranks_cbc_over_lipid(self):
        assert sim_cbc > sim_lipid
```

### Hybrid Search Formula Verification

```python
class TestHybridSearchScoring:
    @pytest.mark.parametrize("fts,vec,expected", [
        (1.0, 1.0, 1.0), (0.0, 1.0, 0.7), (1.0, 0.0, 0.3), (0.5, 0.8, 0.71),
    ])
    def test_combined_score_formula(self, fts, vec, expected):
        assert 0.3 * fts + 0.7 * vec == pytest.approx(expected, rel=1e-6)
```

### LLM-Judged Quality via DeepEval + DeepSeek

```python
class DeepSeekEvalLLM(DeepEvalBaseLLM):
    def generate(self, prompt: str, schema=None) -> str:
        response = self._client.chat.completions.create(
            model=self.model, messages=[{"role": "user", "content": prompt}], temperature=0.0)
        return response.choices[0].message.content or ""

@skip_no_judge
def test_cholesterol_search_relevance():
    metric = make_geval(name="Search Result Relevance",
        criteria="Given a search query and retrieved health records, evaluate clinical relevance...",
        threshold=0.7)
    assert_test(LLMTestCase(
        input="What are my cholesterol levels and cardiovascular risk?",
        actual_output=f"{_LIPID_TEST}\n\n{_HDL_MARKER}"), [metric])

@skip_no_judge
def test_irrelevant_results_low_score():
    # Query about cholesterol, but serve renal results -> should score < 0.7
    metric.measure(test_case)
    assert metric.score < 0.7
```

The `make_geval()` factory auto-selects local DeepSeek (port 19836) or API. `skip_no_judge` keeps CI green without API keys.

### Ingestion Pipeline Evals

```python
class TestBuildTestDocument:
    def test_produces_document(self):
        assert isinstance(doc, Document)
        assert doc.metadata["node_type"] == "blood_test"
        assert doc.metadata["marker_count"] == 5

class TestBuildMarkerNodes:
    def test_one_node_per_marker(self):
        assert len(nodes) == len(markers)

class TestBuildHealthStateNode:
    def test_contains_derived_metrics(self):
        dm = node.metadata.get("derived_metrics", {})
        assert "total_cholesterol_hdl_ratio" in dm
        assert "triglyceride_hdl_ratio" in dm

class TestEmbeddingDimension:
    def test_dimension_1024(self):
        assert len(vec) == 1024
    def test_deterministic(self):
        np.testing.assert_allclose(v1, v2, atol=1e-6)

class TestRetrievalQuality:
    def test_cholesterol_query_retrieves_lipid(self, index):
        assert any("Cholesterol" in t or "HDL" in t for t in texts)
    def test_kidney_query_retrieves_renal(self, index):
        assert any("BUN" in t or "Creatinine" in t for t in texts)
```

---

## Architecture Decisions

1. One model, one dimension, everywhere — every vector from bge-large-en-v1.5, no cross-model issues
2. Text formatting is the embedding API — formatters determine semantic geometry
3. Derived metrics as embedding enrichment — computed ratios enable clinical reasoning queries
4. Hybrid search with vector dominance — 0.3/0.7 FTS/vector split
5. Embed-once, search-many — /search/multi generates one embedding, queries seven tables
6. Eval-driven embedding design — formatting templates iterated until evals passed
7. All embedding ops in Python — TypeScript never touches vectors, single source of truth

---

## API Surface

### Embedding Routes (/embed)
- POST /embed/text — Generate embedding for arbitrary text
- POST /embed/condition — Embed & persist condition
- POST /embed/medication — Embed & persist medication
- POST /embed/symptom — Embed & persist symptom
- POST /embed/appointment — Embed & persist appointment
- POST /embed/reembed — Re-run IngestionPipeline on existing test

### Search Routes (/search)
- POST /search/tests — Search blood test embeddings (pure cosine)
- POST /search/markers — Hybrid search markers (FTS + vector)
- POST /search/multi — Single embed, search all 7 entity tables
- POST /search/trend — Search marker trend over time

All routes enforce API key authentication via X-API-Key header.

---

## Dependencies

```
llama-index>=0.12.0
llama-index-llms-openai-like>=0.3.0
llama-index-embeddings-fastembed>=0.3.0
llama-index-readers-file>=0.4.0
llama-parse>=0.5.0
fastembed>=0.4.0
pgvector>=0.3.0
psycopg[binary]>=3.2.0
ragas>=0.2.0
deepeval>=2.0.0
```
