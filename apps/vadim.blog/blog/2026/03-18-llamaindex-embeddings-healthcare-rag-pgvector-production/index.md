---
slug: llamaindex-embeddings-healthcare-rag-pgvector-production
title: "LlamaIndex Embeddings for Healthcare RAG: From PDF to pgvector in Production"
description: "A production deep dive into building a healthcare embedding pipeline with LlamaIndex Document/TextNode abstractions, FastEmbed bge-large-en-v1.5, LlamaParse, pgvector hybrid search, derived clinical metrics, and a 500+ line eval suite."
date: 2026-03-18
authors: [nicolad]
tags:
  - llamaindex
  - embeddings
  - healthcare
  - pgvector
  - rag
  - python
  - fastapi
  - evals
---

<!-- truncate -->

Most embedding tutorials stop at `model.encode(text)`. Real systems don't. When you're building healthcare RAG that processes blood test PDFs, extracts clinical markers, computes derived metrics, embeds seven entity types into [pgvector](https://github.com/pgvector/pgvector), and serves hybrid search over all of it --- the embedding layer becomes the load-bearing wall of the entire system.

This post walks through a production embedding pipeline built on [LlamaIndex](https://docs.llamaindex.ai/en/stable/) that powers a healthcare application. Every code block comes from a working codebase. The pipeline handles PDF parsing via [LlamaParse](https://docs.cloud.llamaindex.ai/llamaparse/getting_started), clinical marker extraction through a three-tier fallback strategy, multi-node embedding through LlamaIndex's [IngestionPipeline](https://docs.llamaindex.ai/en/stable/module_guides/loading/ingestion_pipeline/), storage in PostgreSQL with [pgvector](https://github.com/pgvector/pgvector), and hybrid search that blends full-text search with cosine similarity. A 500+ line eval suite validates that the embeddings actually cluster, rank, and retrieve correctly.

---

## The embedding model: why BAAI/bge-large-en-v1.5

The entire pipeline uses a single model: [BAAI/bge-large-en-v1.5](https://huggingface.co/BAAI/bge-large-en-v1.5), producing 1024-dimensional vectors via [FastEmbed](https://github.com/qdrant/fastembed). The model is loaded as a lazy singleton through LlamaIndex's [FastEmbedEmbedding](https://docs.llamaindex.ai/en/stable/api_reference/embeddings/fastembed/) integration:

```python
from llama_index.embeddings.fastembed import FastEmbedEmbedding

_embed_model: FastEmbedEmbedding | None = None

def get_embed_model() -> FastEmbedEmbedding:
    global _embed_model
    if _embed_model is None:
        _embed_model = FastEmbedEmbedding(model_name=app_settings.embed_model)
    return _embed_model
```

The model loads once on first call and stays in memory for the process lifetime. Two convenience wrappers provide sync and async embedding generation:

```python
def generate_embedding(text: str) -> list[float]:
    model = get_embed_model()
    return model.get_text_embedding(text)

async def agenerate_embedding(text: str) -> list[float]:
    model = get_embed_model()
    return await model.aget_text_embedding(text)
```

A critical design decision: the pipeline does **not** set [`Settings.embed_model`](https://docs.llamaindex.ai/en/stable/module_guides/supporting_modules/settings/) globally. The chat server's RAG pipeline uses a different, smaller model (`bge-small-en-v1.5`, 384-dim). The [IngestionPipeline](https://docs.llamaindex.ai/en/stable/module_guides/loading/ingestion_pipeline/) receives the model explicitly as a transformation, keeping the two pipelines completely isolated:

```python
# Note: we do NOT set Settings.embed_model because the chat server's
# RAG pipeline uses a different model (bge-small-en-v1.5, 384-dim).
# The IngestionPipeline receives this model explicitly as a transformation.
```

Why `bge-large` and not `bge-small`? The eval suite answers this empirically. On medical synonym resolution, organ system separation, and abnormal-first retrieval bias, the 1024-dim model consistently outperforms the 384-dim variant. More on those evals below.

---

## LlamaIndex abstractions: Document and TextNode

The pipeline uses two core LlamaIndex types throughout: [`Document`](https://docs.llamaindex.ai/en/stable/api_reference/schema/#llama_index.core.schema.Document) for whole blood tests and [`TextNode`](https://docs.llamaindex.ai/en/stable/api_reference/schema/#llama_index.core.schema.TextNode) for individual markers and derived entities. The `Marker` dataclass represents extracted clinical values:

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

### Blood test document

A single blood test PDF produces one [`Document`](https://docs.llamaindex.ai/en/stable/api_reference/schema/#llama_index.core.schema.Document) representing the entire test:

```python
from llama_index.core.schema import Document, MetadataMode, TextNode

def build_test_document(
    markers: list[Marker],
    meta: dict[str, str],
    test_id: str,
    user_id: str,
) -> Document:
    content = format_test_for_embedding(markers, meta)
    return Document(
        doc_id=f"test:{test_id}",
        text=content,
        metadata={
            "test_id": test_id,
            "user_id": user_id,
            "file_name": meta["fileName"],
            "uploaded_at": meta["uploadedAt"],
            "marker_count": len(markers),
            "abnormal_count": sum(1 for m in markers if m.flag != "normal"),
            "node_type": "blood_test",
        },
    )
```

The `doc_id` uses a `test:{uuid}` pattern for deterministic identity. Metadata carries everything needed for filtering and diagnostics downstream --- `marker_count`, `abnormal_count`, and `node_type` are all available at query time without parsing the text.

### Per-marker TextNodes

Each extracted marker gets its own [`TextNode`](https://docs.llamaindex.ai/en/stable/api_reference/schema/#llama_index.core.schema.TextNode). A lipid panel with 5 markers produces 5 TextNodes, so a query like "what is my HDL cholesterol?" matches the specific HDL node, not the entire test:

```python
def build_marker_nodes(
    markers: list[Marker],
    marker_ids: list[str],
    test_id: str,
    user_id: str,
    meta: dict[str, str],
) -> list[TextNode]:
    nodes: list[TextNode] = []
    for marker, mid in zip(markers, marker_ids):
        content = format_marker_for_embedding(marker, meta)
        nodes.append(TextNode(
            id_=f"marker:{mid}",
            text=content,
            metadata={
                "marker_id": mid,
                "test_id": test_id,
                "user_id": user_id,
                "marker_name": marker.name,
                "flag": marker.flag,
                "node_type": "blood_marker",
            },
        ))
    return nodes
```

### Health state node with derived clinical ratios

The third node type is the most interesting. It combines all markers with **computed clinical ratios** and risk classifications:

```python
def build_health_state_node(
    markers: list[Marker],
    test_id: str,
    user_id: str,
    meta: dict[str, str],
) -> TextNode:
    derived = compute_derived_metrics(markers)
    content = format_health_state_for_embedding(markers, derived, meta)
    return TextNode(
        id_=f"health_state:{test_id}",
        text=content,
        metadata={
            "test_id": test_id,
            "user_id": user_id,
            "derived_metrics": {k: v for k, v in derived.items() if v is not None},
            "node_type": "health_state",
        },
    )
```

The `derived_metrics` dict is stored as structured metadata so you can filter or facet on computed ratios without re-parsing. This matters when a query like "am I at risk for metabolic syndrome?" needs to surface the patient's TyG index or TG/HDL ratio.

---

## Text formatting: the embedding's silent architect

The formatting layer is where most embedding pipelines succeed or fail. Raw data produces mediocre vectors. Structured, consistent text templates produce vectors that cluster and rank correctly. This is the primary interface for controlling vector geometry.

### Marker formatting

```python
def format_marker_for_embedding(
    marker: Marker,
    meta: dict[str, str],
) -> str:
    return "\n".join([
        f"Marker: {marker.name}",
        f"Value: {marker.value} {marker.unit}",
        f"Reference range: {marker.reference_range or 'N/A'}",
        f"Flag: {marker.flag}",
        f"Test: {meta['fileName']}",
        f"Date: {meta['testDate']}",
    ])
```

Every marker follows the same template: name, value with unit, reference range, flag, source file, and date. This consistency is what makes the embedding model "learn" the structure --- similar markers embed near each other because they share the same textual skeleton.

The `Flag:` line is critical. Including `high`, `low`, or `normal` directly in the embedded text creates an **abnormal-first retrieval bias**: when a user searches "elevated LDL cholesterol cardiovascular risk," the embedding of a `Flag: high` LDL marker is semantically closer to that query than a `Flag: normal` one. The eval suite proves this (see [TestAbnormalRetrievalBias](#e-abnormal-first-retrieval-bias) below).

### Test summary formatting

```python
def format_test_for_embedding(
    markers: list[Marker],
    meta: dict[str, str],
) -> str:
    flagged = [m for m in markers if m.flag != "normal"]
    summary = (
        f"{len(flagged)} abnormal marker(s): "
        f"{', '.join(f'{m.name} ({m.flag})' for m in flagged)}"
        if flagged
        else "All markers within normal range"
    )
    lines = [
        f"{m.name}: {m.value} {m.unit} (ref: {m.reference_range or 'N/A'}) [{m.flag}]"
        for m in markers
    ]
    return "\n".join([
        f"Blood test: {meta['fileName']}",
        f"Date: {meta['uploadedAt']}",
        f"Summary: {summary}",
        "",
        *lines,
    ])
```

The summary line front-loads abnormal findings. This isn't cosmetic --- it means the first tokens the embedding model sees are the clinically significant ones, biasing the vector representation toward risk signals.

### Entity formatters: type discriminators in embedding space

Beyond blood tests, the system embeds four additional entity types. Each formatter starts with a type label (`"Health condition:"`, `"Medication:"`, `"Symptom:"`, `"Appointment:"`) that acts as a **type discriminator** in embedding space:

```python
def format_condition_for_embedding(name: str, notes: str | None) -> str:
    return f"Health condition: {name}\nNotes: {notes}" if notes else f"Health condition: {name}"

def format_medication_for_embedding(
    name: str, *, dosage: str | None = None,
    frequency: str | None = None, notes: str | None = None,
) -> str:
    lines = [f"Medication: {name}"]
    if dosage: lines.append(f"Dosage: {dosage}")
    if frequency: lines.append(f"Frequency: {frequency}")
    if notes: lines.append(f"Notes: {notes}")
    return "\n".join(lines)

def format_symptom_for_embedding(
    description: str, *, severity: str | None = None,
    logged_at: str | None = None,
) -> str:
    lines = [f"Symptom: {description}"]
    if severity: lines.append(f"Severity: {severity}")
    if logged_at: lines.append(f"Date: {logged_at}")
    return "\n".join(lines)

def format_appointment_for_embedding(
    title: str, *, provider: str | None = None,
    notes: str | None = None, appointment_date: str | None = None,
) -> str:
    lines = [f"Appointment: {title}"]
    if provider: lines.append(f"Provider: {provider}")
    if appointment_date: lines.append(f"Date: {appointment_date}")
    if notes: lines.append(f"Notes: {notes}")
    return "\n".join(lines)
```

The eval suite confirms that queries like "What conditions have I been diagnosed with?" retrieve condition nodes, while "What medications am I taking?" retrieves medication nodes, even when conditions and medications share clinical vocabulary (both mention "diabetes").

---

## Derived clinical metrics: computed ratios as embedding signals

Raw marker values only tell part of the story. Clinicians reason about **ratios**: your TG/HDL ratio matters more for cardiovascular risk than either number alone. The pipeline computes seven derived metrics and embeds them as part of the health state node.

### Marker alias resolution

Lab reports use wildly inconsistent naming. The system maps aliases to canonical keys:

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

A `resolve(key)` function tries each alias against the marker lookup table, so "SGOT" resolves to AST regardless of what the lab printed on the PDF.

### The seven ratios

```python
def compute_derived_metrics(markers: list[Marker]) -> dict[str, float | None]:
    # ... alias resolution, ratio helper ...
    trig = resolve("triglycerides")
    gluc = resolve("glucose")
    gti = (
        math.log(trig * gluc * 0.5)
        if trig is not None and gluc is not None and trig > 0 and gluc > 0
        else None
    )
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

Each metric has a reference range with risk classification:

| Metric | Label | Optimal | Borderline |
|--------|-------|---------|------------|
| `hdl_ldl_ratio` | HDL/LDL Ratio | > 0.4 | 0.3 -- 0.4 |
| `total_cholesterol_hdl_ratio` | TC/HDL Ratio | < 4.5 | 4.5 -- 5.5 |
| `triglyceride_hdl_ratio` | TG/HDL Ratio | < 2.0 | 2.0 -- 3.5 |
| `glucose_triglyceride_index` | [TyG Index](https://en.wikipedia.org/wiki/Triglyceride-glucose_index) | < 8.5 | 8.5 -- 9.0 |
| `neutrophil_lymphocyte_ratio` | NLR | 1.0 -- 3.0 | 3.0 -- 5.0 |
| `bun_creatinine_ratio` | BUN/Creatinine | 10 -- 20 | 20 -- 25 |
| `ast_alt_ratio` | De Ritis Ratio (AST/ALT) | 0.8 -- 1.2 | 1.2 -- 2.0 |

The [TyG index](https://en.wikipedia.org/wiki/Triglyceride-glucose_index) (Triglyceride-Glucose Index) deserves special mention --- it's computed as `ln(TG * Glucose * 0.5)` and is a proxy for insulin resistance. Embedding this value with its risk label means a query about "insulin resistance and metabolic syndrome risk" retrieves the correct health state node even if the word "insulin" never appears in the raw markers.

### Risk classification

```python
def classify_metric_risk(metric_key: str, value: float) -> str:
    ref = METRIC_REFERENCES.get(metric_key)
    if not ref:
        return "optimal"
    opt_lo, opt_hi = ref["optimal"]
    bord_lo, bord_hi = ref["borderline"]
    if value < opt_lo:
        if value >= bord_lo:
            return "borderline"
        return "low"
    if value <= opt_hi:
        return "optimal"
    if value <= bord_hi:
        return "borderline"
    return "elevated"
```

The risk label (`optimal`, `borderline`, `elevated`, `low`) is embedded as text in the health state node. This creates semantic bridges: "elevated TG/HDL" in the embedded text is close in embedding space to a user query about "cardiovascular risk factors."

### Health state text format (example output)

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
Triglycerides: 210 mg/dL (ref: 0 - 150) [high]
HDL: 38 mg/dL (ref: 40 - 60) [low]
LDL: 155 mg/dL (ref: 0 - 100) [high]
Glucose: 130 mg/dL (ref: 70 - 100) [high]
```

This is what gets embedded as a 1024-dim vector. The combination of raw markers, computed ratios, and risk labels gives the embedding model enough signal to distinguish a healthy profile from a metabolic syndrome profile from an inflammatory profile.

---

## PDF parsing: LlamaParse to element dicts

Before anything can be embedded, PDFs need to be parsed. The pipeline uses [LlamaParse](https://docs.cloud.llamaindex.ai/llamaparse/getting_started) to convert PDFs to markdown, then transforms the markdown into structured element dicts compatible with the marker extraction pipeline.

```python
from llama_parse import LlamaParse

def _partition_pdf(file_bytes: bytes, file_name: str) -> list[dict]:
    parser = LlamaParse(
        api_key=settings.llama_cloud_api_key,
        result_type="markdown",
    )
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

[LlamaParse](https://docs.cloud.llamaindex.ai/llamaparse/getting_started) returns markdown. The `_markdown_to_elements()` function detects tables via regex and converts them to HTML for the table parser, while non-table content becomes `NarrativeText` elements:

```python
def _markdown_to_elements(md: str) -> list[dict]:
    table_re = re.compile(
        r"(\|.+\|\n\|[-| :]+\|\n(?:\|.+\|\n?)*)",
        re.MULTILINE,
    )
    elements: list[dict] = []
    last = 0
    for m in table_re.finditer(md):
        pre = md[last : m.start()].strip()
        if pre:
            elements.append({"type": "NarrativeText", "text": pre, "metadata": {}})
        elements.append({
            "type": "Table",
            "text": "",
            "metadata": {"text_as_html": _md_table_to_html(m.group(0))},
        })
        last = m.end()
    tail = md[last:].strip()
    if tail:
        elements.append({"type": "NarrativeText", "text": tail, "metadata": {}})
    return elements
```

### Three-tier marker extraction

The element dicts feed into a three-tier extraction strategy. This is the system's **graceful degradation** layer --- any single parsing method will fail on some real-world lab format. By running tiers in order and short-circuiting on first success, the system handles the widest range of PDFs.

**Tier 1: HTML tables** --- Standard lab panels with columns for name, value, unit, and reference range:

```python
def parse_html_table(html: str) -> list[Marker]:
    markers: list[Marker] = []
    for row_match in re.finditer(r"<tr[^>]*>([\s\S]*?)</tr>", html, re.I):
        cells = [_strip_html(c) for c in re.findall(
            r"<t[dh][^>]*>([\s\S]*?)</t[dh]>", row_match.group(1), re.I
        )]
        if len(cells) < 2:
            continue
        name, value = cells[0], cells[1]
        unit = cells[2] if len(cells) > 2 else ""
        reference_range = cells[3] if len(cells) > 3 else ""
        if not name or not re.search(r"\d", value) or re.match(r"^\d", name):
            continue
        markers.append(Marker(
            name=name.strip(), value=value.strip(),
            unit=unit.strip(), reference_range=reference_range.strip(),
            flag=compute_flag(value, reference_range),
        ))
    return markers
```

**Tier 2: Title + FormKeysValues** --- Romanian/European lab format where marker names appear as titles followed by `FormKeysValues` elements:

```python
def parse_form_key_values(elements: list[dict]) -> list[Marker]:
    markers: list[Marker] = []
    i = 0
    while i < len(elements) - 1:
        el, nxt = elements[i], elements[i + 1]
        if el.get("type") in ("Title", "NarrativeText") and nxt.get("type") == "FormKeysValues":
            name = (el.get("text") or "").strip()
            value_text = (nxt.get("text") or "").strip()
            vm = re.search(r"([\d.,]+)\s*([\w/µ%µgLdlUIuimlog]+)", value_text)
            if not vm:
                i += 1
                continue
            value, unit = vm.group(1), vm.group(2)
            refs = list(re.finditer(r"\(([^)]+)\)", value_text))
            reference_range = refs[-1].group(1) if refs else ""
            markers.append(Marker(
                name=name, value=value, unit=unit,
                reference_range=reference_range,
                flag=compute_flag(value, reference_range),
            ))
            i += 2
        else:
            i += 1
    return markers
```

**Tier 3: Free-text fallback** --- When neither tables nor form pairs are found, a regex scans for tab-separated or multi-space-separated marker lines.

The orchestrator runs tiers in order and short-circuits:

```python
def parse_markers(elements: list[dict]) -> list[Marker]:
    # 1. HTML tables
    table_markers: list[Marker] = []
    for el in elements:
        if el.get("type") == "Table" and el.get("metadata", {}).get("text_as_html"):
            table_markers.extend(parse_html_table(el["metadata"]["text_as_html"]))
    if table_markers:
        return _dedupe(table_markers)
    # 2. Title + FormKeysValues
    fkv = parse_form_key_values(elements)
    if fkv:
        return _dedupe(fkv)
    # 3. Text fallback
    text = "\n".join(el.get("text", "") for el in elements)
    return _dedupe(parse_text_markers(text))
```

Every tier deduplicates by marker name. The `compute_flag()` function handles the full range of reference range formats: `"0-200"`, `"<5.0"`, `">60"`, `"nedetectabil"` (Romanian for "undetectable"), and comma-as-decimal (`"1,5"` -> `1.5`).

---

## The IngestionPipeline: LlamaIndex's orchestration layer

The entire transform + embed flow is wired through LlamaIndex's [IngestionPipeline](https://docs.llamaindex.ai/en/stable/module_guides/loading/ingestion_pipeline/). This is the centerpiece of the architecture.

### Custom BloodTestNodeParser

A custom [`TransformComponent`](https://docs.llamaindex.ai/en/stable/api_reference/ingestion/#llama_index.core.ingestion.IngestionPipeline) transforms raw [LlamaParse](https://docs.cloud.llamaindex.ai/llamaparse/getting_started) output into clinical TextNodes:

```python
from llama_index.core.schema import BaseNode, TransformComponent

class BloodTestNodeParser(TransformComponent):
    """Transform a Document of raw LlamaParse elements into clinical TextNodes.

    Produces three types of nodes:
      - blood_test: summary of entire test
      - blood_marker: one per extracted marker
      - health_state: derived metrics + risk classification
    """

    def __call__(self, nodes: list[BaseNode], **kwargs) -> list[BaseNode]:
        out: list[BaseNode] = []
        for node in nodes:
            if not isinstance(node, Document):
                out.append(node)
                continue

            meta = node.metadata
            elements = meta.get("_raw_elements", [])
            test_id = meta.get("test_id", "")
            user_id = meta.get("user_id", "")
            file_name = meta.get("file_name", "")
            uploaded_at = meta.get("uploaded_at", "")
            test_date = meta.get("test_date") or uploaded_at
            marker_ids: list[str] = meta.get("_marker_ids", [])

            markers = parse_markers(elements)
            if not markers:
                out.append(node)
                continue

            embed_meta = {"fileName": file_name, "uploadedAt": uploaded_at}
            marker_meta = {"fileName": file_name, "testDate": test_date}

            # 1. Test-level document
            test_doc = build_test_document(markers, embed_meta, test_id, user_id)
            out.append(test_doc)

            # 2. Per-marker nodes
            marker_nodes = build_marker_nodes(markers, marker_ids, test_id, user_id, marker_meta)
            out.extend(marker_nodes)

            # 3. Health-state node
            hs_node = build_health_state_node(markers, test_id, user_id, embed_meta)
            out.append(hs_node)

        return out
```

One input `Document` produces **N+2** output nodes: 1 test summary + N marker nodes + 1 health state node.

### Pipeline assembly

```python
def build_ingestion_pipeline() -> IngestionPipeline:
    return IngestionPipeline(
        transformations=[
            BloodTestNodeParser(),
            get_embed_model(),
        ],
    )
```

Two transformations in sequence:
1. **BloodTestNodeParser** splits the Document into typed TextNodes
2. **[FastEmbedEmbedding](https://docs.llamaindex.ai/en/stable/api_reference/embeddings/fastembed/)** generates 1024-dim vectors for each node

### Background execution in FastAPI

The pipeline is invoked in a [FastAPI](https://fastapi.tiangolo.com/) background task so the upload endpoint returns immediately:

```python
@router.post("/upload", response_model=UploadResponse)
async def upload_blood_test(
    file: UploadFile,
    user_id: str = Form(...),
    test_date: str | None = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    x_api_key: str | None = Header(None),
) -> UploadResponse:
    _check_api_key(x_api_key)
    # ... upload to R2, insert blood_tests row ...

    # Parse PDF -> structured elements
    elements = _partition_pdf(file_bytes, file.filename)
    markers = parse_markers(elements)

    if markers:
        marker_ids = insert_blood_markers(test_id, [m.to_dict() for m in markers])
    update_blood_test_status(test_id, "done")

    # Run LlamaIndex IngestionPipeline in background (non-blocking)
    if markers:
        background_tasks.add_task(
            _run_ingestion,
            elements, test_id, user_id, file.filename, test_date, marker_ids,
        )

    return UploadResponse(test_id=test_id, markers_count=len(markers), status="done")
```

The `_run_ingestion` function builds a `Document` with raw elements in metadata, runs the pipeline, and persists the embedded nodes:

```python
def _run_ingestion(
    elements: list[dict], test_id: str, user_id: str,
    file_name: str, test_date: str | None, marker_ids: list[str],
) -> None:
    doc = Document(
        text="",
        metadata={
            "_raw_elements": elements,
            "_marker_ids": marker_ids,
            "test_id": test_id,
            "user_id": user_id,
            "file_name": file_name,
            "uploaded_at": now_iso,
            "test_date": test_date or now_iso,
        },
        excluded_embed_metadata_keys=[
            "_raw_elements", "_marker_ids", "test_id",
            "user_id", "node_type",
        ],
    )

    pipeline = build_ingestion_pipeline()
    nodes = pipeline.run(documents=[doc])
    _persist_nodes(nodes)
```

The `excluded_embed_metadata_keys` list prevents internal routing metadata from polluting the embedding text. The `_raw_elements` list (which can be large) is excluded from embedding but available to the `BloodTestNodeParser` during transformation.

---

## Vector storage: PostgreSQL + pgvector

All vectors are stored in PostgreSQL using [pgvector](https://github.com/pgvector/pgvector). The database layer uses [psycopg3](https://www.psycopg.org/psycopg3/docs/) with the [`pgvector.psycopg`](https://github.com/pgvector/pgvector-python) extension.

### Seven embedding tables

The schema has seven `vector(1024)` columns across seven tables:

| Table | Primary key | Vector column | Additional columns |
|-------|------------|---------------|-------------------|
| `blood_test_embeddings` | `test_id` (unique) | `embedding vector(1024)` | `content`, `user_id` |
| `blood_marker_embeddings` | `marker_id` (unique) | `embedding vector(1024)` | `content`, `marker_name`, `test_id`, `user_id` |
| `health_state_embeddings` | `test_id` (unique) | `embedding vector(1024)` | `content`, `derived_metrics jsonb`, `user_id` |
| `condition_embeddings` | `condition_id` (unique) | `embedding vector(1024)` | `content`, `user_id` |
| `medication_embeddings` | `medication_id` (unique) | `embedding vector(1024)` | `content`, `user_id` |
| `symptom_embeddings` | `symptom_id` (unique) | `embedding vector(1024)` | `content`, `user_id` |
| `appointment_embeddings` | `appointment_id` (unique) | `embedding vector(1024)` | `content`, `user_id` |

All tables use `ON CONFLICT ... DO UPDATE` for atomic upserts, so re-embedding a test or entity replaces the old vector without races.

### Connection management

```python
def _connect() -> psycopg.Connection:
    conn = psycopg.connect(settings.database_url, autocommit=False)
    register_vector(conn)
    return conn

@contextmanager
def get_conn() -> Generator[psycopg.Connection, None, None]:
    conn = _connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
```

The [`register_vector(conn)`](https://github.com/pgvector/pgvector-python?tab=readme-ov-file#psycopg-3) call registers the pgvector type adapter on every connection. This is what lets you pass NumPy arrays directly as query parameters.

### Upsert pattern

Every upsert follows the same pattern --- the vector is passed as a NumPy `float32` array, and the `pgvector.psycopg` extension handles serialization to PostgreSQL's `vector` type:

```python
def upsert_blood_test_embedding(
    *, test_id: str, user_id: str, content: str, embedding: list[float],
) -> None:
    import numpy as np
    vec = np.array(embedding, dtype=np.float32)
    now = datetime.now(timezone.utc)
    emb_id = str(uuid.uuid4())

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO blood_test_embeddings (id, test_id, user_id, content, embedding, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (test_id) DO UPDATE
            SET content = EXCLUDED.content,
                embedding = EXCLUDED.embedding,
                created_at = EXCLUDED.created_at
            """,
            (emb_id, test_id, user_id, content, vec, now),
        )
```

The `content` column stores the formatted text that was embedded --- useful for debugging and for returning search results without a re-embed.

---

## Search: pure vector and hybrid

### Pure cosine similarity

Blood tests, conditions, medications, symptoms, and appointments all use the same cosine similarity search with [pgvector](https://github.com/pgvector/pgvector)'s `<=>` operator:

```python
def search_blood_tests(
    embedding: list[float], user_id: str,
    threshold: float = 0.3, limit: int = 5,
) -> list[dict]:
    vec = np.array(embedding, dtype=np.float32)
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT e.id, e.test_id, e.content,
                   1 - (e.embedding <=> %s) as similarity,
                   t.file_name, t.test_date
            FROM blood_test_embeddings e
            JOIN blood_tests t ON t.id = e.test_id
            WHERE e.user_id = %s
              AND 1 - (e.embedding <=> %s) > %s
            ORDER BY e.embedding <=> %s
            LIMIT %s
            """,
            (vec, user_id, vec, threshold, vec, limit),
        ).fetchall()
```

The `<=>` operator is pgvector's [cosine distance](https://github.com/pgvector/pgvector?tab=readme-ov-file#querying). `1 - distance` gives similarity. The `WHERE` clause filters below the threshold **before** sorting, keeping results relevant.

### Hybrid search: FTS + vector for markers

Markers use a **hybrid search** that combines PostgreSQL full-text search with vector similarity:

```python
def search_markers_hybrid(
    query_text: str, embedding: list[float], user_id: str,
    threshold: float = 0.3, limit: int = 10,
) -> list[dict]:
    vec = np.array(embedding, dtype=np.float32)
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT marker_id, test_id, marker_name, content,
                   ts_rank(to_tsvector('english', content),
                           plainto_tsquery('english', %s)) as fts_rank,
                   1 - (embedding <=> %s) as vector_similarity,
                   (0.3 * ts_rank(to_tsvector('english', content),
                                  plainto_tsquery('english', %s))
                    + 0.7 * (1 - (embedding <=> %s))) as combined_score
            FROM blood_marker_embeddings
            WHERE user_id = %s
              AND 1 - (embedding <=> %s) > %s
            ORDER BY combined_score DESC
            LIMIT %s
            """,
            (query_text, vec, query_text, vec, user_id, vec, threshold, limit),
        ).fetchall()
```

The formula: **`combined_score = 0.3 * FTS_rank + 0.7 * vector_similarity`**

Vector similarity dominates (70% weight) because semantic matching catches synonyms and clinical context that keyword search misses. But FTS still contributes 30% because exact marker name matches ("HDL", "Creatinine") deserve a boost. The threshold filter applies to `vector_similarity` alone, preventing low-relevance results from sneaking in via high FTS scores on irrelevant keyword matches.

### Multi-entity search: embed once, search everywhere

The `/search/multi` endpoint generates the embedding once and fans it out across all seven entity tables:

```python
@router.post("/multi")
async def search_multi(req: SearchRequest, x_api_key: str | None = Header(None)) -> dict:
    """Embed once, search all entity tables --- returns combined results for RAG context."""
    _check_api_key(x_api_key)
    embedding = generate_embedding(req.query)
    return {
        "tests": search_blood_tests(embedding, req.user_id),
        "markers": search_markers_hybrid(req.query, embedding, req.user_id, limit=5),
        "conditions": search_conditions(embedding, req.user_id),
        "medications": search_medications(embedding, req.user_id),
        "symptoms": search_symptoms(embedding, req.user_id),
        "appointments": search_appointments(embedding, req.user_id),
    }
```

One embedding call, six parallel searches. This ensures consistent ranking across entity types because the same query vector is compared against all entity vectors.

### Marker trend search

The `/search/trend` endpoint joins `blood_marker_embeddings` with `blood_markers` and `blood_tests` to return value, unit, flag, and test_date alongside similarity --- enabling plotting of marker trends over time:

```python
@router.post("/trend")
async def search_trend(req: TrendRequest, x_api_key: str | None = Header(None)) -> dict:
    _check_api_key(x_api_key)
    embedding = generate_embedding(req.query)
    return {"results": search_marker_trend(embedding, req.user_id, req.marker_name)}
```

---

## Entity embedding routes

Beyond the upload pipeline, entities are embedded individually through dedicated [FastAPI](https://fastapi.tiangolo.com/) endpoints. All embedding operations are centralized in Python so TypeScript never touches vector math:

```python
@router.post("/condition", response_model=EmbedResult)
async def embed_condition(req: ConditionRequest, x_api_key: str | None = Header(None)) -> EmbedResult:
    _check_api_key(x_api_key)
    content = format_condition_for_embedding(req.name, req.notes)
    embedding = generate_embedding(content)
    upsert_condition_embedding(
        condition_id=req.condition_id,
        user_id=req.user_id,
        content=content,
        embedding=embedding,
    )
    return EmbedResult(ok=True)
```

The pattern is identical across all four entity types: format text, generate embedding, upsert to [pgvector](https://github.com/pgvector/pgvector). A `/embed/reembed` endpoint re-runs the full [IngestionPipeline](https://docs.llamaindex.ai/en/stable/module_guides/loading/ingestion_pipeline/) on an existing test when markers are updated. A `/embed/text` endpoint generates embeddings for arbitrary text (e.g., search queries from the TypeScript frontend).

The full API surface:

| Embedding Routes | Search Routes |
|---|---|
| `POST /embed/text` --- arbitrary text embedding | `POST /search/tests` --- blood test cosine search |
| `POST /embed/condition` --- persist condition vector | `POST /search/markers` --- hybrid FTS + vector |
| `POST /embed/medication` --- persist medication vector | `POST /search/multi` --- embed once, search all 7 tables |
| `POST /embed/symptom` --- persist symptom vector | `POST /search/trend` --- marker trend over time |
| `POST /embed/appointment` --- persist appointment vector | |
| `POST /embed/reembed` --- re-run IngestionPipeline | |

All routes enforce API key authentication via `X-API-Key` header.

---

## The eval suite: 500+ lines proving it works

Embedding pipelines are notoriously hard to test. Cosine similarity is continuous, semantic, and model-dependent. The eval suite uses a combination of **geometric assertions** (cosine similarity comparisons), **LlamaIndex retrieval tests** (build an in-memory [`VectorStoreIndex`](https://docs.llamaindex.ai/en/stable/api_reference/indices/vector_store/) and verify `top_k` results), and **LLM-judged quality** via [DeepEval](https://docs.confident-ai.com/) with a [DeepSeek](https://api.deepseek.com/) judge.

### A. Cross-organ semantic separation

The most fundamental property: markers from the same organ system should cluster closer together than markers from different systems. Five systems are tested: cardiovascular, metabolic, renal, hepatic, inflammatory.

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
            "metabolic": [...],
            "renal": [...],
            "hepatic": [...],
            "inflammatory": [...],
        }
        return {sys: [_embed(text) for text in texts] for sys, texts in systems.items()}
```

The test computes centroids for each organ system and asserts that **intra-system similarity exceeds inter-system similarity**:

```python
def test_cardiovascular_vs_renal(self, system_embeddings):
    intra_cv = np.mean([
        _cosine_sim(system_embeddings["cardiovascular"][i],
                     system_embeddings["cardiovascular"][j])
        for i in range(3) for j in range(i + 1, 3)
    ])
    inter_cv_renal = _cosine_sim(cv.tolist(), renal.tolist())
    assert intra_cv > inter_cv_renal
```

A broader test verifies that no two system centroids are > 0.95 similar:

```python
def test_all_systems_have_distinct_centroids(self, system_embeddings):
    for i, s1 in enumerate(systems):
        for s2 in systems[i + 1:]:
            sim = _cosine_sim(centroids[s1].tolist(), centroids[s2].tolist())
            assert sim < 0.95, f"{s1} and {s2} centroids are too similar ({sim:.3f})"
```

### B. Medical synonym resolution

A [`VectorStoreIndex`](https://docs.llamaindex.ai/en/stable/api_reference/indices/vector_store/) built from marker nodes is queried with lay terms and medical synonyms:

```python
class TestSynonymResolution:
    @pytest.mark.parametrize("query,expected_markers", [
        ("good cholesterol levels", ["HDL Cholesterol"]),
        ("bad cholesterol", ["LDL Cholesterol"]),
        ("kidney function", ["Creatinine", "BUN"]),
        ("AST ALT liver transaminases", ["AST", "ALT"]),
        ("blood sugar", ["Glucose"]),
        ("iron in blood", ["Hemoglobin"]),
        ("white blood cell differential", ["Neutrophils", "Lymphocytes"]),
        ("infection markers", ["Neutrophils"]),
    ])
    def test_synonym_retrieval(self, index, query, expected_markers):
        retriever = index.as_retriever(similarity_top_k=3)
        results = retriever.retrieve(query)
        retrieved_names = [r.metadata.get("marker_name", "") for r in results]
        assert any(exp in retrieved_names for exp in expected_markers)
```

"Good cholesterol" should retrieve HDL. "Blood sugar" should retrieve Glucose. "Kidney function" should retrieve BUN or Creatinine. These tests validate that [bge-large-en-v1.5](https://huggingface.co/BAAI/bge-large-en-v1.5) has sufficient medical domain knowledge for lay-term resolution.

### C. Entity embedding quality

Entities should cluster by semantic type. Diabetes medications should be closer to each other than to statins:

```python
def test_medications_cluster(self):
    metformin = _embed(format_medication_for_embedding(
        "Metformin", dosage="500mg", frequency="twice daily", notes="For type 2 diabetes"
    ))
    insulin = _embed(format_medication_for_embedding(
        "Insulin Glargine", dosage="20 units", frequency="once daily",
        notes="Basal insulin for diabetes"
    ))
    atorvastatin = _embed(format_medication_for_embedding(
        "Atorvastatin", dosage="40mg", frequency="once daily",
        notes="Cholesterol management"
    ))
    sim_diabetes = _cosine_sim(metformin, insulin)
    sim_cross = _cosine_sim(metformin, atorvastatin)
    assert sim_diabetes > sim_cross
```

Same symptom at different severities should be more similar than different symptoms:

```python
def test_symptoms_capture_severity(self):
    mild = _embed(format_symptom_for_embedding("Headache", severity="mild"))
    severe = _embed(format_symptom_for_embedding("Headache", severity="severe"))
    fatigue = _embed(format_symptom_for_embedding("Fatigue", severity="moderate"))
    sim_same = _cosine_sim(mild, severe)
    sim_diff = _cosine_sim(mild, fatigue)
    assert sim_same > sim_diff
```

### D. Health state embedding signal

Three synthetic health profiles --- healthy, metabolic syndrome, and inflammatory --- are indexed and queried:

```python
def test_metabolic_risk_query(self, index):
    retriever = index.as_retriever(similarity_top_k=1)
    results = retriever.retrieve("insulin resistance and metabolic syndrome risk")
    assert results[0].metadata["test_id"] == "test-metab"

def test_inflammation_query(self, index):
    retriever = index.as_retriever(similarity_top_k=1)
    results = retriever.retrieve("systemic inflammation and elevated NLR")
    assert results[0].metadata["test_id"] == "test-inflam"

def test_healthy_query(self, index):
    retriever = index.as_retriever(similarity_top_k=1)
    results = retriever.retrieve("all markers within normal range, healthy profile")
    assert results[0].metadata["test_id"] == "test-healthy"
```

The metabolic profile has high triglycerides, low HDL, and high glucose. The query mentions "insulin resistance" --- a concept not literally in the markers --- but the embedded derived metrics (TyG index, TG/HDL ratio) carry enough signal for the correct match.

### E. Abnormal-first retrieval bias

The most practically important test: risk queries should preferentially surface abnormal markers.

```python
def test_high_ldl_risk_query(self, index):
    retriever = index.as_retriever(similarity_top_k=2)
    results = retriever.retrieve("elevated LDL cholesterol cardiovascular risk")
    flags = [r.metadata.get("flag") for r in results]
    assert "high" in flags

def test_low_hdl_risk_query(self, index):
    retriever = index.as_retriever(similarity_top_k=2)
    results = retriever.retrieve("dangerously low HDL, cardiovascular protection lacking")
    flags = [r.metadata.get("flag") for r in results]
    assert "low" in flags
```

This works because the `Flag: high` / `Flag: low` text in the embedded content shifts the vector toward risk-associated regions of embedding space. The formatting layer does the heavy lifting.

### F. Temporal differentiation

Same marker, different dates: similar but not identical.

```python
def test_same_marker_different_dates_differ(self):
    marker = Marker("HDL", "55", "mg/dL", "40-60", "normal")
    meta_jan = {"fileName": "jan.pdf", "testDate": "2024-01-15"}
    meta_jun = {"fileName": "jun.pdf", "testDate": "2024-06-15"}
    emb_jan = _embed(format_marker_for_embedding(marker, meta_jan))
    emb_jun = _embed(format_marker_for_embedding(marker, meta_jun))
    sim = _cosine_sim(emb_jan, emb_jun)
    assert 0.85 < sim < 1.0

def test_different_values_same_marker_differ(self):
    emb_normal = _embed(format_marker_for_embedding(
        Marker("Glucose", "88", "mg/dL", "70-100", "normal"), meta))
    emb_high = _embed(format_marker_for_embedding(
        Marker("Glucose", "250", "mg/dL", "70-100", "high"), meta))
    sim = _cosine_sim(emb_normal, emb_high)
    assert 0.80 < sim < 0.99
```

These bounds (0.85--1.0 for date, 0.80--0.99 for value) are empirical thresholds tuned against [bge-large-en-v1.5](https://huggingface.co/BAAI/bge-large-en-v1.5).

### G. Multi-entity retrieval

The final test builds a unified index across all entity types and verifies natural language queries route to the correct type:

```python
def test_condition_query(self, index):
    results = retriever.retrieve("What conditions have I been diagnosed with?")
    types = [r.metadata.get("node_type") for r in results]
    assert "condition" in types

def test_medication_query(self, index):
    results = retriever.retrieve("What diabetes medication am I taking?")
    types = [r.metadata.get("node_type") for r in results]
    assert "medication" in types

def test_appointment_query(self, index):
    results = retriever.retrieve("When is my next doctor's appointment?")
    types = [r.metadata.get("node_type") for r in results]
    assert "appointment" in types
```

### Search ranking evals

Beyond embedding quality, the search eval suite validates ranking correctness:

```python
class TestSearchRanking:
    def test_cholesterol_query_ranks_lipid_over_renal(self, embed_model):
        q = embed_model.get_text_embedding("What are my cholesterol and lipid levels?")
        sim_lipid = cosine_sim(q, embed_model.get_text_embedding(_LIPID_TEST))
        sim_renal = cosine_sim(q, embed_model.get_text_embedding(_RENAL_TEST))
        assert sim_lipid > sim_renal

    def test_kidney_query_ranks_renal_over_cbc(self, embed_model):
        q = embed_model.get_text_embedding("How is my kidney function? BUN and creatinine?")
        sim_renal = cosine_sim(q, embed_model.get_text_embedding(_RENAL_TEST))
        sim_cbc = cosine_sim(q, embed_model.get_text_embedding(_CBC_TEST))
        assert sim_renal > sim_cbc

    def test_inflammation_query_ranks_cbc_over_lipid(self, embed_model):
        q = embed_model.get_text_embedding("WBC neutrophils infection inflammation?")
        sim_cbc = cosine_sim(q, embed_model.get_text_embedding(_CBC_TEST))
        sim_lipid = cosine_sim(q, embed_model.get_text_embedding(_LIPID_TEST))
        assert sim_cbc > sim_lipid
```

And hybrid search formula verification:

```python
class TestHybridSearchScoring:
    @pytest.mark.parametrize("fts,vec,expected", [
        (1.0, 1.0, 1.0),
        (0.0, 1.0, 0.7),
        (1.0, 0.0, 0.3),
        (0.5, 0.8, 0.71),
        (0.0, 0.0, 0.0),
    ])
    def test_combined_score_formula(self, fts, vec, expected):
        assert 0.3 * fts + 0.7 * vec == pytest.approx(expected, rel=1e-6)

    def test_vector_dominates_fts(self):
        high_fts_score = 0.3 * 1.0 + 0.7 * 0.0   # = 0.30
        high_vec_score = 0.3 * 0.0 + 0.7 * 1.0   # = 0.70
        assert high_vec_score > high_fts_score
```

### LLM-judged quality via DeepEval + DeepSeek

The eval suite includes [GEval](https://docs.confident-ai.com/docs/metrics-llm-evals) metrics judged by a [DeepSeek](https://api.deepseek.com/) model. The `DeepSeekEvalLLM` wrapper implements `DeepEvalBaseLLM` to plug DeepSeek into the [DeepEval](https://docs.confident-ai.com/) framework:

```python
class DeepSeekEvalLLM(DeepEvalBaseLLM):
    def __init__(self, model="deepseek-chat", api_key=None, base_url=None):
        self._client = OpenAI(api_key=self._api_key, base_url=self._base_url)

    def generate(self, prompt: str, schema=None) -> str:
        response = self._client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
        )
        return response.choices[0].message.content or ""
```

Search relevance test:

```python
@skip_no_judge
def test_cholesterol_search_relevance():
    metric = make_geval(
        name="Search Result Relevance",
        criteria=(
            "Given a search query (input) and retrieved blood test / health records "
            "(actual_output), evaluate whether the results are clinically relevant to "
            "the query. Top results should directly address the health concern."
        ),
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.7,
    )
    assert_test(
        LLMTestCase(
            input="What are my cholesterol levels and cardiovascular risk?",
            actual_output=f"{_LIPID_TEST}\n\n{_HDL_MARKER}",
        ),
        [metric],
    )
```

Negative test confirming irrelevant results score low:

```python
@skip_no_judge
def test_irrelevant_results_low_score():
    metric = make_geval(
        name="Search Result Relevance",
        criteria=_RELEVANCE_CRITERIA,
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    )
    test_case = LLMTestCase(
        input="What are my cholesterol and HDL levels?",
        actual_output=f"{_RENAL_TEST}\n\n{_BUN_MARKER}",
    )
    metric.measure(test_case)
    assert metric.score < 0.7, f"Expected score < 0.7 for off-topic results, got {metric.score}"
```

Multi-search coverage test:

```python
@skip_no_judge
def test_multi_search_coverage():
    metric = make_geval(
        name="Multi-Search Coverage",
        criteria=(
            "Given a health question (input) and combined search results covering "
            "blood tests, conditions, medications, and symptoms (actual_output), "
            "evaluate whether the retrieved context covers the most relevant health "
            "dimensions needed to answer the question."
        ),
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.7,
    )
    combined = "\n\n".join([
        f"=== Blood Tests ===\n{_LIPID_TEST}",
        f"=== Conditions ===\n{_CONDITION}",
        f"=== Medications ===\n{_MEDICATION}",
        f"=== Symptoms ===\n{_SYMPTOM}",
    ])
    assert_test(
        LLMTestCase(
            input="I have Type 2 Diabetes and take Metformin. How do my recent blood tests look?",
            actual_output=combined,
        ),
        [metric],
    )
```

The `make_geval()` factory auto-selects a local DeepSeek instance (port 19836) or the API, and `skip_no_judge` skips LLM-judged tests when neither is available --- keeping CI green even without API keys.

### Ingestion pipeline evals

The ingestion eval suite validates the full pipeline end-to-end:

```python
class TestBuildTestDocument:
    def test_produces_document(self):
        markers = parse_markers(_LIPID_ELEMENTS)
        doc = build_test_document(markers, {"fileName": "lipid.pdf", "uploadedAt": "2024-01-01"},
            "test-123", "user-456")
        assert isinstance(doc, Document)
        assert doc.metadata["node_type"] == "blood_test"
        assert doc.metadata["marker_count"] == 5
        assert doc.metadata["abnormal_count"] > 0

class TestBuildHealthStateNode:
    def test_contains_derived_metrics(self):
        markers = parse_markers(_LIPID_ELEMENTS)
        node = build_health_state_node(markers, "test-1", "user-1",
            {"fileName": "lipid.pdf", "uploadedAt": "2024-01-01"})
        dm = node.metadata.get("derived_metrics", {})
        assert "total_cholesterol_hdl_ratio" in dm
        assert "triglyceride_hdl_ratio" in dm
        assert "hdl_ldl_ratio" in dm

    def test_renal_panel_computes_bun_cr(self):
        markers = parse_markers(_RENAL_ELEMENTS)
        node = build_health_state_node(markers, "test-2", "user-1",
            {"fileName": "renal.pdf", "uploadedAt": "2024-01-01"})
        dm = node.metadata.get("derived_metrics", {})
        assert "bun_creatinine_ratio" in dm
        assert dm["bun_creatinine_ratio"] == pytest.approx(28 / 1.5, rel=0.01)

class TestEmbeddingDimension:
    def test_dimension_1024(self, embed_model):
        vec = embed_model.get_text_embedding("HDL Cholesterol: 55 mg/dL")
        assert len(vec) == 1024

    def test_deterministic(self, embed_model):
        text = "Glucose: 95 mg/dL (ref: 70 - 100) [normal]"
        v1 = embed_model.get_text_embedding(text)
        v2 = embed_model.get_text_embedding(text)
        np.testing.assert_allclose(v1, v2, atol=1e-6)
```

The retrieval quality tests build an in-memory [`VectorStoreIndex`](https://docs.llamaindex.ai/en/stable/api_reference/indices/vector_store/) from all three test types and verify queries route correctly:

```python
class TestRetrievalQuality:
    def test_cholesterol_query_retrieves_lipid(self, index):
        retriever = index.as_retriever(similarity_top_k=3)
        results = retriever.retrieve("What are my cholesterol levels?")
        texts = [r.get_content() for r in results]
        assert any("Cholesterol" in t or "HDL" in t or "LDL" in t for t in texts)

    def test_kidney_query_retrieves_renal(self, index):
        retriever = index.as_retriever(similarity_top_k=3)
        results = retriever.retrieve("How is my kidney function?")
        texts = [r.get_content() for r in results]
        assert any("BUN" in t or "Creatinine" in t for t in texts)

    def test_metabolic_query_retrieves_glucose_tg(self, index):
        retriever = index.as_retriever(similarity_top_k=5)
        results = retriever.retrieve("Am I at risk for metabolic syndrome?")
        texts = [r.get_content() for r in results]
        assert any("Glucose" in t or "Triglycerides" in t or "TG/HDL" in t for t in texts)
```

Running the full eval suite:

```bash
uv run --project langgraph pytest evals/embedding_quality_eval.py -v
uv run --project langgraph pytest evals/search_eval.py -v
uv run --project langgraph pytest evals/ingestion_eval.py -v
```

---

## The complete pipeline flow

```
PDF File
  -> LlamaParse (markdown)
    -> _markdown_to_elements()
      -> Document with _raw_elements metadata
        -> BloodTestNodeParser (TransformComponent)
          -> TextNodes: test summary + N markers + health state
            -> FastEmbedEmbedding (1024-dim bge-large-en-v1.5)
              -> _persist_nodes()
                -> PostgreSQL + pgvector (7 tables)
```

Entities (conditions, medications, symptoms, appointments) are embedded individually via `/embed/*` endpoints. Search is served via `/search/tests`, `/search/markers` (hybrid), `/search/multi` (all entities), and `/search/trend` (marker over time).

---

## Architecture decisions worth stealing

**1. One model, one dimension, everywhere.** Every vector in every table comes from the same [bge-large-en-v1.5](https://huggingface.co/BAAI/bge-large-en-v1.5) model. No dimension mismatches, no cross-model compatibility issues, no surprise failures when comparing vectors from different sources.

**2. Text formatting is the embedding API.** The formatters (`format_marker_for_embedding`, `format_condition_for_embedding`, etc.) are the true API surface of the embedding layer. They determine what information the model sees, in what order, with what emphasis. Change a formatter and you change the semantic geometry of the entire vector space.

**3. Derived metrics as embedding enrichment.** Raw lab values produce reasonable embeddings. Adding computed ratios and risk classifications produces embeddings that respond to clinical reasoning queries ("metabolic syndrome risk", "systemic inflammation") that don't match any single marker name.

**4. Hybrid search with vector dominance.** The 0.3/0.7 FTS/vector split is a pragmatic choice. Vector similarity handles semantic matching (synonyms, lay terms, clinical reasoning). FTS handles exact matches that embedding models sometimes miss. The threshold filter applies to vector similarity alone.

**5. Embed-once, search-many.** The `/search/multi` endpoint generates one embedding and queries seven tables. This ensures consistent ranking across entity types.

**6. Eval-driven embedding design.** The formatting templates were iterated until the evals passed. The abnormal-first bias, the type-discriminator prefixes, the derived metric inclusion --- all were driven by eval failures that revealed what the initial formatting was missing.

**7. All embedding ops in Python.** TypeScript never touches vectors. One language, one pipeline, one source of truth for all 1024-dim vectors in the database.

---

## What embedding tutorials miss

Most embedding content focuses on model selection and basic similarity search. Production healthcare RAG requires thinking about the entire pipeline:

- **Text formatting** determines embedding quality more than model choice
- **Derived metrics** bridge the gap between raw data and clinical reasoning
- **Hybrid search** catches what pure vector search misses (and vice versa)
- **Multi-entity embedding** under a single model prevents cross-table inconsistency
- **Eval suites** prove geometric properties (clustering, separation, bias) and retrieval correctness (ranking, synonym resolution, multi-entity routing)
- **LLM-judged evals** catch quality issues that cosine thresholds cannot express

The embedding model is necessary but not sufficient. The pipeline around it --- formatting, enrichment, storage, search, and evaluation --- is what turns "text goes in, vector comes out" into a system you can trust with clinical data.

---

## FAQ

**Q: What is the best embedding model for healthcare documents in LlamaIndex?**

A: [LlamaIndex](https://docs.llamaindex.ai/en/stable/) supports various models via integrations. The "best" model is context-dependent, balancing speed, cost, and accuracy. The engineering principle is to choose one and design your text formatting and evaluation suite to ensure it performs well on your specific data, rather than chasing marginal gains from model switching alone.

**Q: How do you handle compliance (e.g., HIPAA) when using pgvector for healthcare data?**

A: Compliance is achieved through system-level architecture: using a private PostgreSQL instance ([Neon](https://neon.tech/) in our case), encrypting data at rest and in transit, implementing strict access controls via API keys, and ensuring all embedding pipelines operate on properly consented data. The database tool ([pgvector](https://github.com/pgvector/pgvector)) is part of a larger, compliant system design.

**Q: Can LlamaIndex process scanned PDFs (non-searchable) for RAG?**

A: [LlamaParse](https://docs.cloud.llamaindex.ai/llamaparse/getting_started) handles OCR-like extraction from scanned PDFs. For pure OCR, you'd use a dedicated tool first. The three-tier marker extraction strategy in this pipeline handles the varied output formats that different PDF sources produce.

**Q: What is the advantage of using pgvector over dedicated vector databases?**

A: [pgvector](https://github.com/pgvector/pgvector)'s primary advantage is integration. It stores vector embeddings alongside structured relational data within a single PostgreSQL database. This simplifies architecture, ensures transactional integrity for upserts, and leverages existing operational expertise. The hybrid search combining `ts_rank` FTS with cosine similarity in a single SQL query is only possible because both live in the same database.
