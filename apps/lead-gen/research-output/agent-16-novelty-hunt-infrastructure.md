# NOVELTY HUNT: Local-First ML Pipeline Infrastructure Beyond DuckDB + LanceDB v2

**Date**: 2026-03-26
**Scope**: Late 2025 / early 2026 breakthroughs NOT already covered in the Scrapus upgrade blueprint
**Exclusions**: DuckDB replacing SQLite (QuackIR, Ge et al. 2025), LanceDB v2 replacing ChromaDB (ZSTD compression), unified query interface -- all already in DEEP_SYNTHESIS.md

---

## Finding 1: Burn 0.20 + CubeCL Unified Kernel Compiler

**Source**: Burn 0.20.0 Release (January 2026) -- https://burn.dev/blog/release-0.20.0/
**Repo**: https://github.com/tracel-ai/burn (12k+ stars)

**What it does**: Burn 0.20 introduces CubeCL, a Rust macro (`#[cube]`) that compiles a single kernel definition to CUDA, ROCm, Metal, Vulkan/wgpu, and WebGPU/WASM backends. The same Rust code runs on Apple Silicon GPU (via Metal), in-browser (via WebGPU/WASM), or on NVIDIA servers -- with zero code changes. The release also introduces the `burnpack` format: a native serialization format enabling zero-copy model loading via memory-mapped tensor references.

**Key benchmarks**:
- CubeCL CPU backend achieves **up to 4x speedup over LibTorch** on common operations
- Max Pool 2D: 5.73ms vs LibTorch's 18.51ms (3.2x)
- Reduce-argmin: 6.89ms vs LibTorch's 230.4ms (33x)
- GPU matmul (4096x4096): 639us, matching LibTorch's 627us baseline
- ONNX models import directly into Burn's native graph, then benefit from automatic kernel fusion across all backends

**Why it's novel for Scrapus**: The current blueprint proposes ONNX Runtime via the `ort` crate for inference. Burn 0.20 offers a fundamentally different approach: import the ONNX model once, convert to Burn's native Rust representation with burnpack zero-copy format, and deploy the SAME binary to Metal (local Mac), WebGPU (browser demo), or server -- with automatic kernel fusion that ONNX Runtime cannot do. For Scrapus's NER models (GLiNER2), entity matching (SupCon), and lead scoring (FT-Transformer), this eliminates the need to maintain separate ONNX export paths and runtime configurations per platform.

**Applicability Score**: 4/5 -- Directly applicable for Scrapus's inference stack. The ONNX-to-burnpack pipeline is production-ready. The one caveat is that Burn's transformer support is still maturing compared to ort's battle-tested HuggingFace ecosystem.

---

## Finding 2: Turso (Limbo) -- Async-First SQLite Rewrite in Rust with MVCC + Vector Search

**Source**: Turso Alpha Release (early 2026) -- https://turso.tech/blog/turso-the-next-evolution-of-sqlite
**Repo**: https://github.com/tursodatabase/turso
**Paper context**: The SQLite Renaissance article (DEV Community, 2026) positions Turso as the new standard for distributed SQLite

**What it does**: Turso is a ground-up Rust rewrite of SQLite with three features critical for ML pipelines: (1) MVCC-based concurrent writes via `BEGIN CONCURRENT` achieving 4x write throughput over SQLite (eliminating SQLITE_BUSY errors entirely), (2) native async I/O with io_uring on Linux, and (3) built-in vector search ported from Turso Cloud. It compiles to WASM for browser environments with a VFS that works with Drizzle ORM out of the box. Uses Deterministic Simulation Testing (DST) for reliability -- they offer $1,000 bounties for data corruption bugs.

**Key benchmarks**:
- 4x write throughput vs SQLite with concurrent transactions
- SQLite baseline: 150k rows/sec insert; with 1ms compute: 80k rows/sec. Turso sustains higher throughput under compute load via MVCC
- Native async eliminates blocking I/O that currently throttles Scrapus's crawl-to-store pipeline

**Why it's novel for Scrapus**: The blueprint proposes keeping SQLite for "WAL-critical ops" alongside DuckDB for analytics. Turso eliminates the primary reason for this split: SQLite's single-writer bottleneck. With MVCC concurrent writes, Turso could serve as the transactional backbone while DuckDB handles analytics -- and the built-in vector search means certain embedding operations don't need to round-trip to LanceDB. The async-first design also aligns with Scrapus's Rust crawler architecture, where io_uring integration could dramatically reduce crawl-store latency.

**Applicability Score**: 3/5 -- High potential but currently in alpha. Missing indexes, triggers, views, and multi-threading. The concurrent write + vector search combo is compelling for the crawl ingestion path, but production readiness is 6-12 months out.

---

## Finding 3: Loro CRDT -- Rust-Native Collaborative State Sync for ML Pipeline Metadata

**Source**: Loro 1.x (2025-2026) -- https://loro.dev
**Repo**: https://github.com/loro-dev/loro
**Conference**: FOSDEM 2026 -- "SQLRooms: Local-First Analytics with DuckDB, Collaborative Canvas, and Loro CRDT Sync"

**What it does**: Loro is a high-performance CRDT library written in Rust (with JS/WASM bindings) based on "Replayable Event Graph" theory. It supports rich text, lists, maps, and -- critically -- movable tree CRDTs with Fractional Index ordering. Unlike Yjs and Automerge, Loro stores the complete DAG of editing history per keystroke without requiring separate Version Vector + Delete Set overhead that Yjs incurs per saved version.

**The SQLRooms architecture insight**: At FOSDEM 2026, the SQLRooms project demonstrated a pattern directly applicable to Scrapus: use DuckDB as a read-only query engine (data doesn't need to be synced), and use Loro CRDTs only for collaborative/configuration state (queries, pipeline configs, annotations). This separation means CRDT overhead is minimal -- you're only syncing kilobytes of config, not megabytes of lead data.

**Why it's novel for Scrapus**: Scrapus currently has no sync story. If a user runs the pipeline on their MacBook, then wants to continue on a different machine, there's no mechanism for state transfer. Loro + the SQLRooms pattern enables: (1) sync pipeline configuration, scoring rules, and entity type definitions across devices via CRDTs, (2) keep actual lead data local (only DuckDB analytics), (3) enable multi-user annotation of leads with conflict-free merge. The movable tree CRDT is directly applicable to Scrapus's hierarchical entity graph where company-subsidiary relationships need reordering.

**Applicability Score**: 4/5 -- The SQLRooms DuckDB+Loro pattern maps almost 1:1 to Scrapus's architecture. Loro is Rust-native, so integration is straightforward. The caveat is that Loro's API/encoding schema is still marked experimental.

---

## Finding 4: mlx-rs + mlx-rs-burn -- Rust Bindings for Apple MLX with Burn Backend

**Source**: mlx-rs 0.25.3 (active development through March 2026) -- https://crates.io/crates/mlx-rs
**Bridge crate**: mlx-rs-burn (released December 31, 2025) -- https://crates.io/crates/mlx-rs-burn
**Apple research**: "Exploring LLMs with MLX and the Neural Accelerators in the M5 GPU" -- https://machinelearning.apple.com/research/exploring-llms-mlx-m5

**What it does**: mlx-rs provides Rust FFI bindings to Apple's MLX framework, enabling Rust code to leverage Apple Silicon's unified memory architecture and (on M5) the new Neural Accelerators embedded in GPU cores. The mlx-rs-burn crate bridges this to Burn's backend system, meaning a Burn model can transparently use MLX as its compute backend on Apple Silicon.

**M5 Neural Accelerator benchmarks** (Apple ML Research, November 2025):
- Time-to-first-token: 4.06x faster than M4 (Qwen 14B 4-bit)
- Token generation: 19-27% faster (memory-bandwidth bound: 153 vs 120 GB/s on M5 vs M4)
- M5 processes a prompt that took M4 81 seconds in just 18 seconds (4.4x TTFT improvement)

**Why it's novel for Scrapus**: The existing blueprint mentions MLX for local inference but uses Python mlx_lm. The mlx-rs-burn bridge enables a pure Rust path: Scrapus's Burn-based models use MLX as a backend on Apple Silicon, getting hardware-specific optimizations (unified memory, Neural Accelerators on M5) without leaving Rust. On non-Apple hardware, the same Burn model falls back to WGPU or CUDA. This eliminates the Python dependency for local inference entirely. Combined with the M1 Metal constraints already documented in project memory (68.25 GB/s bandwidth, 8MB SLC), this provides a clear hardware-aware optimization path.

**Applicability Score**: 5/5 -- Directly applicable. Scrapus already targets Apple Silicon (M1 per project memory). mlx-rs-burn gives Burn models native MLX performance without Python. The crate is actively maintained and the Burn integration is clean.

---

## Finding 5: Apache DataFusion as Embeddable Query Engine (Alternative/Complement to DuckDB)

**Source**: Apache DataFusion (graduated to top-level Apache project, 2025) -- https://datafusion.apache.org/
**Repo**: https://github.com/apache/datafusion
**Paper**: "Apache Arrow DataFusion: A Fast, Embeddable, Modular Analytic Query Engine" (SIGMOD 2024)

**What it does**: DataFusion is a pure-Rust, Apache Arrow-native query engine with SQL and DataFrame APIs. Unlike DuckDB (C++ with Rust bindings), DataFusion is Rust all the way down -- meaning it compiles natively into Scrapus's Rust binary without FFI overhead. It features streaming multi-threaded vectorized execution, 10+ extension APIs, and native Parquet/CSV/JSON/Avro support. Used in production by InfluxDB 3.0, GreptimeDB, and Coralogix.

**Why it's novel for Scrapus**: The blueprint proposes DuckDB for analytics, which requires C++ FFI bindings. DataFusion provides comparable analytical query performance (benchmarked competitively against DuckDB in the SIGMOD paper) but as a pure Rust library -- it's a crate dependency, not an external binary. For Scrapus's local-first architecture, this means: (1) single binary deployment with zero external dependencies, (2) custom query operators for lead scoring that plug directly into the query plan via Rust traits, (3) native async execution with Rust's tokio runtime (DuckDB's async story requires bridging), (4) zero-copy Arrow interop with LanceDB (both are Arrow-native).

**Applicability Score**: 3/5 -- Strong technical fit but the DuckDB ecosystem (extensions, community, tooling) is significantly larger. DataFusion is most compelling if Scrapus needs custom query operators for the ML pipeline (e.g., a custom lead scoring UDF that runs inside the query engine). For standard analytics, DuckDB is still the pragmatic choice.

---

## Finding 6: EdgeFlex-Transformer -- Training-Free Model Compression for Edge NER

**Source**: Mohammad, Song & Zhu (December 2025) -- arXiv:2512.19741
**Code**: https://github.com/Shoaib-git20/EdgeFlex.git

**What it does**: A four-stage optimization pipeline for deploying transformer models on edge devices WITHOUT retraining: (1) activation profiling to identify low-importance channels, (2) memory-aware structured pruning of MLP layers, (3) selective FP16 mixed-precision conversion, (4) Activation-Aware Quantization (AWQ) to INT8. Starting from ViT-Huge (632M params), achieves 76% memory reduction and 6x latency improvement while maintaining or improving accuracy on CIFAR-10.

**Why it's novel for Scrapus**: The blueprint proposes GLiNER2 and SupCon models but doesn't address the model compression pipeline for local deployment. EdgeFlex's approach is training-free and modular -- it can be applied post-hoc to any transformer model. For Scrapus, this means: take the trained GLiNER2 NER model, run EdgeFlex's 4-stage compression, and deploy a model that uses 76% less memory and runs 6x faster -- critical for the M1's 8GB unified memory constraint. The AWQ INT8 quantization aligns with the M1 Metal constraints already documented (INT8 quantization rules in project memory).

**Applicability Score**: 4/5 -- Directly applicable to Scrapus's NER and entity matching models. The technique is model-agnostic and training-free, so it slots into the existing pipeline without modifying training. The caveat is that the paper benchmarks on vision tasks; NLP validation on GLiNER2 specifically would need verification.

---

## Finding 7: Hariharan Samson (2026) -- Lightweight Transformer Survey with Edge NER Benchmarks

**Source**: "Lightweight Transformer Architectures for Edge Devices in Real-Time Applications" -- arXiv:2601.03290 (January 5, 2026)

**What it does**: Comprehensive survey establishing that 15-40M parameter transformer models achieve optimal hardware utilization (60-75% efficiency) on edge devices, with mixed-precision INT8/FP16 quantization as the most effective optimization strategy. Benchmarks MobileBERT, TinyBERT, and DistilBERT on GLUE/SQuAD across TFLite, ONNX Runtime, PyTorch Mobile, and CoreML.

**Key finding**: Models in the 15-40M parameter range hit the sweet spot -- 75-96% of full model accuracy with 4-10x size reduction and 3-9x latency reduction, deployable on devices consuming only 2-5W.

**Why it's novel for Scrapus**: Provides concrete evidence for the optimal model size target for Scrapus's local-first NER. GLiNER2-base is ~209M params -- this survey suggests a distilled 15-40M variant could retain 75-96% accuracy while fitting comfortably in the M1's memory budget. The ONNX Runtime benchmarks are directly applicable to Scrapus's current ort-based inference path. Specifically, the survey identifies hardware-aware NAS (Neural Architecture Search) as the technique to find the optimal architecture for a specific target device.

**Applicability Score**: 3/5 -- Provides the research backing to justify model distillation for GLiNER2, but doesn't provide the distillation recipe itself. Most useful as a decision framework for choosing model size targets.

---

## Finding 8: ADBC (Arrow Database Connectivity) -- Zero-Copy Query Protocol

**Source**: Arrow Database Connectivity specification + DuckDB ADBC driver -- https://arrow.apache.org/adbc/
**Rust crate**: adbc_core -- https://docs.rs/adbc_core/latest/adbc_core/

**What it does**: ADBC is a database-agnostic API that returns query results directly as Arrow RecordBatches, eliminating serialization/deserialization overhead. DuckDB's ADBC driver achieves near-zero-cost result transfer due to DuckDB's internal Arrow format alignment. The adbc_core Rust crate provides native trait-based abstractions without C FFI overhead.

**Benchmarks**: ADBC shows 21x speedup over JDBC in Python; in Rust, the benefit is eliminating the ser/deser step entirely -- query results land directly in Arrow memory that LanceDB, DataFusion, or Burn can consume.

**Why it's novel for Scrapus**: The blueprint proposes DuckDB + LanceDB v2 but doesn't specify the data transfer protocol between them. Without ADBC, results must be serialized from DuckDB's internal format, then deserialized into Arrow for LanceDB ingestion. With ADBC, the path is: DuckDB query -> Arrow RecordBatch (zero-copy) -> LanceDB ingest or Burn tensor conversion. For the lead scoring pipeline that queries DuckDB analytics and feeds results to the FT-Transformer model, this eliminates a serialization bottleneck.

**Applicability Score**: 4/5 -- Low-effort, high-impact. The adbc_core crate already exists, DuckDB's driver is mature, and the integration is a plumbing change that yields measurable latency reduction on every query-to-model path.

---

## Finding 9: PRDTs -- Composable Protocol Replicated Data Types

**Source**: arXiv:2504.05173 (April 2025), presented at ECOOP 2025 PLF+PLAID workshop
**Authors**: Distributed systems research group

**What it does**: PRDTs (Protocol Replicated Data Types) extend CRDTs by treating replicated state as a knowledge store that monotonically accumulates until consensus is reached. Unlike CRDTs (which resolve conflicts automatically but can't express consensus), PRDTs enable composable protocol building blocks -- you can build voting, leader election, or quorum-based decisions on top of replicated data types.

**Why it's novel for Scrapus**: If Scrapus evolves toward multi-user or multi-device operation, PRDTs enable something CRDTs alone cannot: consensus on pipeline decisions. Example: two users annotate the same lead differently -- CRDTs would merge both annotations, but PRDTs could implement a voting protocol where the higher-confidence annotation wins, with the protocol logic itself being replicated and conflict-free. This is the theoretical foundation for "collaborative ML annotation with consensus" in a local-first system.

**Applicability Score**: 2/5 -- Theoretically interesting but the implementation maturity is academic. Most applicable if Scrapus adds multi-user lead annotation with quality-gated consensus. Worth monitoring but not actionable today.

---

## Finding 10: Optimizing CRDTs for Low Memory Environments

**Source**: Vandermotten (VUB), ECOOP 2025 PLF+PLAID workshop
**URL**: https://2025.ecoop.org/details/plf-plaid-2025-papers/3/Optimizing-CRDTs-for-Low-Memory-Environments

**What it does**: Addresses the metadata overhead problem in CRDTs -- each replica must track causality metadata that grows with operation count. This paper presents techniques to reduce CRDT memory consumption for edge/embedded devices, making CRDTs viable on hardware with limited RAM.

**Why it's novel for Scrapus**: If Loro CRDTs are adopted for pipeline config sync (Finding 3), this research directly addresses the concern of metadata bloat over time. On an M1 MacBook with 8GB unified memory shared between OS, GPU, and Scrapus, every MB of CRDT metadata is a MB less for model inference. The optimizations in this paper could keep Loro's metadata footprint manageable even after months of configuration changes.

**Applicability Score**: 3/5 -- Relevant if Loro adoption proceeds. The techniques are complementary to Loro's Replayable Event Graph approach and could be integrated upstream.

---

## Finding 11: edge-transformers + ort 2.0 -- Rust-Native HuggingFace Pipeline at the Edge

**Source**: edge-transformers crate -- https://github.com/npc-engine/edge-transformers
**ORT 2.0**: ort 2.0.0-rc.12 (production-ready, 2026) -- https://github.com/pykeio/ort
**Blog**: https://dasroot.net/posts/2026/03/onnx-runtime-rust-ml-inference-optimization/

**What it does**: edge-transformers wraps ort to provide HuggingFace Optimum-compatible pipelines in Rust, including token classification (NER), sequence classification, question answering, and text generation. ORT 2.0 (via the ort crate) now delivers 9x faster inference vs naive setups, 13x smaller serving size, and 1.93x speedup over Python equivalents on benchmarks like Silero VAD. ONNX Runtime 2.10 (2026) adds enhanced hardware acceleration for CUDA, OpenVINO, QNN, and CANN backends.

**Why it's novel for Scrapus**: The blueprint proposes GLiNER2 for NER but the implementation pseudocode uses Python (`from gliner import GLiNER`). edge-transformers provides the Rust-native path: export GLiNER2 to ONNX, then run it through edge-transformers' token classification pipeline in pure Rust. Combined with ort 2.0's CoreML execution provider on Apple Silicon, this creates a zero-Python inference path: GLiNER2 ONNX model -> edge-transformers pipeline -> CoreML/Metal acceleration. The NER, zero-shot classification, and QA pipelines map directly to Scrapus's extraction module.

**Applicability Score**: 4/5 -- Directly applicable. The edge-transformers NER pipeline is exactly what Scrapus needs for the GLiNER2 deployment. The main work is exporting GLiNER2 to ONNX format, which HuggingFace Optimum already supports.

---

## Synthesis: Recommended Integration Architecture

```
                          Scrapus 2026+ Infrastructure Stack
                          ==================================

    [Crawl Ingest] --async io--> [Turso/Limbo*] --MVCC writes-->
                                       |
                        [ADBC zero-copy Arrow transfer]
                                       |
                                  [DuckDB Analytics]
                                       |
                        [ADBC zero-copy Arrow transfer]
                                       |
    [LanceDB v2] <-- vectors     [Burn 0.20 Inference Engine]
         |                              |
         |                    [CubeCL -> Metal/WGPU/WASM]
         |                              |
         |                    [mlx-rs-burn on Apple Silicon]
         |                              |
    [Loro CRDT] <-- config sync    [edge-transformers NER pipeline]
         |                              |
    [Multi-device state]          [EdgeFlex compression]
                                       |
                               [Burnpack zero-copy models]

    * = when Turso reaches production readiness
```

### Priority Ranking for Implementation

| Priority | Finding | Effort | Impact | Timeline |
|----------|---------|--------|--------|----------|
| P0 | **ADBC zero-copy** (Finding 8) | Low | Medium-High | Week 1-2 |
| P0 | **edge-transformers + ort 2.0** (Finding 11) | Medium | High | Week 2-4 |
| P1 | **mlx-rs-burn** (Finding 4) | Medium | High | Week 4-8 |
| P1 | **Burn 0.20 + burnpack** (Finding 1) | High | Very High | Week 8-16 |
| P1 | **EdgeFlex compression** (Finding 6) | Medium | High | Week 8-12 |
| P2 | **Loro CRDT config sync** (Finding 3) | Medium | Medium | Week 12-16 |
| P3 | **Turso/Limbo** (Finding 2) | Low (monitor) | High (future) | When stable |
| P3 | **DataFusion** (Finding 5) | High | Medium | Only if custom UDFs needed |

---

## Sources

- [Burn 0.20.0 Release](https://burn.dev/blog/release-0.20.0/)
- [Burn 0.19.0 Release (Quantization, LLVM)](https://burn.dev/blog/release-0.19.0/)
- [CubeCL on Hacker News](https://news.ycombinator.com/item?id=43777731)
- [Turso: The Next Evolution of SQLite](https://turso.tech/blog/turso-the-next-evolution-of-sqlite)
- [Turso Concurrent Writes](https://turso.tech/blog/beyond-the-single-writer-limitation-with-tursos-concurrent-writes)
- [Turso GitHub](https://github.com/tursodatabase/turso)
- [Loro CRDT](https://loro.dev)
- [Loro Movable Tree CRDTs](https://loro.dev/blog/movable-tree)
- [SQLRooms (FOSDEM 2026)](https://fosdem.org/2026/schedule/event/FGDCP7-sqlrooms-local-first-analytics-duckdb-loro/)
- [SQLRooms GitHub](https://github.com/sqlrooms/sqlrooms)
- [mlx-rs crate](https://crates.io/crates/mlx-rs)
- [mlx-rs-burn crate](https://crates.io/crates/mlx-rs-burn)
- [Apple MLX M5 Neural Accelerators](https://machinelearning.apple.com/research/exploring-llms-mlx-m5)
- [Apache DataFusion](https://datafusion.apache.org/)
- [EdgeFlex-Transformer (arXiv:2512.19741)](https://arxiv.org/abs/2512.19741)
- [Lightweight Transformers for Edge (arXiv:2601.03290)](https://arxiv.org/abs/2601.03290)
- [ADBC Arrow Database Connectivity](https://arrow.apache.org/adbc/)
- [adbc_core Rust crate](https://docs.rs/adbc_core/latest/adbc_core/)
- [PRDTs (arXiv:2504.05173)](https://arxiv.org/abs/2504.05173)
- [Optimizing CRDTs for Low Memory (ECOOP 2025)](https://2025.ecoop.org/details/plf-plaid-2025-papers/3/Optimizing-CRDTs-for-Low-Memory-Environments)
- [edge-transformers](https://github.com/npc-engine/edge-transformers)
- [ort crate (ONNX Runtime for Rust)](https://github.com/pykeio/ort)
- [ONNX Runtime Rust Optimization (2026)](https://dasroot.net/posts/2026/03/onnx-runtime-rust-ml-inference-optimization/)
- [FOSDEM 2026 Local-First Devroom](https://fosdem.org/2026/schedule/track/local-first/)
- [NextGraph Sync Engine](https://fosdem.org/2026/schedule/event/J3ZBYC-nextgraph-sync-engine-sdk-reactive-orm/)
- [Client-side inference with ONNX Runtime (2026)](https://tty4.dev/development/2026-02-26-onnxruntime-ml-on-edge/)
- [ML Inference Runtimes in 2026](https://medium.com/@digvijay17july/ml-inference-runtimes-in-2026-an-architects-guide-to-choosing-the-right-engine-d3989a87d052)
