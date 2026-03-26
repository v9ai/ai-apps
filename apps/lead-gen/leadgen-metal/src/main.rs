use leadgen_metal::*;
use anyhow::Result;
use std::path::Path;

fn main() -> Result<()> {
    println!("=== Storage: WAL ===");
    std::fs::create_dir_all("data")?;
    let wal = storage::wal::WriteAheadLog::open("data/leadgen.wal", 16)?;

    let company = storage::record::build_company_record(
        "c001", "Acme Corp", "acme.com", "SaaS",
        50, "rust,go", "San Francisco", "B2B automation platform",
    );
    let seq = wal.append(storage::wal::EntryType::CompanyInsert, &company)?;
    println!("WAL append seq={}, record={} bytes", seq, company.len());

    let reader = storage::record::RecordReader::from_bytes(&company).unwrap();
    println!("  name={}", reader.field_str(storage::record::company_fields::NAME).unwrap());
    println!("  domain={}", reader.field_str(storage::record::company_fields::DOMAIN).unwrap());
    println!("  employees={}", reader.field_u32(storage::record::company_fields::EMPLOYEE_COUNT).unwrap());

    println!("\n=== Storage: Slotted Pages ===");
    let pages = storage::page::PageFile::open("data/pages.dat", 256)?;
    let page_id = pages.alloc_page()?;
    let slot = pages.insert_into_page(page_id, &company).unwrap();
    println!("Inserted into page={} slot={}", page_id, slot);
    let readback = pages.read_slot(page_id, slot).unwrap();
    println!("Read back {} bytes, matches={}", readback.len(), readback == company.as_slice());

    println!("\n=== DNS: Raw MX Resolver ===");
    match dns::raw::DnsResolver::default_resolver().resolve_mx("gmail.com") {
        Ok(records) => {
            for r in &records {
                println!("  MX priority={} exchange={}", r.priority, r.exchange);
            }
        }
        Err(e) => println!("  DNS error: {}", e),
    }

    println!("\n=== Similarity: String (Jaro-Winkler) ===");
    let sim = similarity::simd::jaro_winkler(b"john smith", b"john smyth");
    println!("  jaro_winkler('john smith', 'john smyth') = {:.4}", sim);
    let sim2 = similarity::simd::jaro_winkler_icase("John Smith", "john smith");
    println!("  jaro_winkler_icase('John Smith', 'john smith') = {:.4}", sim2);
    let lev = similarity::simd::levenshtein(b"kitten", b"sitting");
    println!("  levenshtein('kitten', 'sitting') = {}", lev);

    println!("\n=== Similarity: Embeddings (Cosine) ===");
    let emb_store = similarity::embeddings::EmbeddingStore::new(4);
    emb_store.insert(100, &[1.0, 0.0, 0.0, 0.0]);
    emb_store.insert(200, &[0.9, 0.1, 0.0, 0.0]);
    emb_store.insert(300, &[0.0, 0.0, 1.0, 0.0]);
    let top = emb_store.top_k(&[1.0, 0.0, 0.0, 0.0], 2);
    println!("  top-2 similar to [1,0,0,0]: {:?}", top);

    println!("\n=== Bitap Search ===");
    let text = b"The quick brown fox jumps over the lazy dog";
    let pos = similarity::simd::bitap_search(text, b"fox");
    println!("  bitap_search('fox') = {:?}", pos);

    println!("\n=== Bloom Filter ===");
    let mut bloom_filter = bloom::BloomFilter::new(10000, 0.01);
    bloom_filter.insert(b"john@acme.com");
    bloom_filter.insert(b"jane@acme.com");
    println!("  contains('john@acme.com') = {}", bloom_filter.contains(b"john@acme.com"));
    println!("  contains('bob@acme.com') = {}", bloom_filter.contains(b"bob@acme.com"));
    println!("  size = {} bytes, fp_rate = {:.6}", bloom_filter.size_bytes(), bloom_filter.false_positive_rate());

    println!("\n=== Inverted Index ===");
    let idx = index::posting::InvertedIndex::new();
    idx.index_with_id(0, "Acme Corp SaaS platform automation Rust");
    idx.index_with_id(1, "Beta Inc healthcare platform Python");
    idx.index_with_id(2, "Gamma LLC SaaS analytics Rust Go");

    let results = idx.search_and("SaaS Rust");
    println!("  AND('SaaS Rust') = {:?}", results);
    let results = idx.search_or("healthcare analytics");
    println!("  OR('healthcare analytics') = {:?}", results);
    let ranked = idx.search_ranked("SaaS platform", 10);
    println!("  BM25('SaaS platform') = {:?}", ranked);
    println!("  terms={}, docs={}", idx.term_count(), idx.doc_count());

    let bytes = idx.serialize();
    let idx2 = index::posting::InvertedIndex::deserialize(&bytes).unwrap();
    println!("  serialized={} bytes, restored terms={}", bytes.len(), idx2.term_count());

    println!("\n=== URL Frontier ===");
    let frontier = queue::frontier::UrlFrontier::new(100000);
    frontier.push_domain_pages("stripe.com", &["/", "/about", "/team", "/careers"]);
    frontier.push("https://stripe.com/about", 0, 1); // duplicate
    let stats = frontier.stats();
    println!("  enqueued={}, dupes_skipped={}, queue={}", stats.enqueued, stats.duplicates_skipped, stats.queue_size);

    println!("\n=== Email Pattern FSM ===");
    let patterns = email_metal::pattern_fsm::all_patterns();
    let mut buf = [0u8; 256];
    for (name, pat) in &patterns {
        if let Some(email) = pat.generate_into("John", "Smith", "acme.com", &mut buf) {
            println!("  {:<12} → {}", name, email);
        }
    }

    let known = vec![
        ("John".into(), "Smith".into(), "john.smith@acme.com".into()),
        ("Jane".into(), "Doe".into(), "jane.doe@acme.com".into()),
    ];
    if let Some((name, conf)) = email_metal::pattern_fsm::infer_pattern(&known, &patterns) {
        println!("  inferred: {} (confidence={:.2})", name, conf);
    }

    println!("\n=== Blocking (Entity Resolution) ===");
    let contacts = vec![
        ("John".to_string(), "Smith".to_string(), "john.smith@acme.com".to_string()),
        ("John".to_string(), "Smyth".to_string(), "j.smyth@acme.com".to_string()),
        ("Jane".to_string(), "Doe".to_string(), "jane@other.com".to_string()),
    ];
    let blocks = dedup::blocking::build_blocks(&contacts);
    println!("  blocks: {}", blocks.len());
    for (key, indices) in &blocks {
        println!("    {} → {:?}", key, indices);
    }

    println!("\n=== Soundex ===");
    let keys = dedup::blocking::blocking_keys_contact("Robert", "Smith", "robert@test.com");
    println!("  blocking keys for Robert Smith: {:?}", keys);

    println!("\n=== Pipeline (integrated) ===");
    let pipeline = Pipeline::open(Path::new("data/pipeline"))?;

    pipeline.ingest_company(
        "c100", "TechFlow", "techflow.io", "AI Infrastructure",
        200, "rust,python,kubernetes", "Berlin", "MLOps platform for EU teams",
    )?;
    pipeline.ingest_company(
        "c101", "DataWave", "datawave.eu", "Data Engineering",
        80, "python,spark,airflow", "Amsterdam", "Real-time data pipelines",
    )?;
    pipeline.ingest_contact(
        "ct001", "c100", "Anna", "Mueller", "VP Engineering", "VP", "anna.mueller@techflow.io", "verified",
    )?;
    pipeline.ingest_contact(
        "ct002", "c101", "Jan", "de Vries", "Head of AI", "Director", "jan.devries@datawave.eu", "unverified",
    )?;

    let search_results = pipeline.search("AI rust", 5);
    println!("  search('AI rust'): {:?}", search_results);

    // Embedding similarity
    pipeline.embeddings.insert(1, vec![0.5; 384].as_slice());
    pipeline.embeddings.insert(2, vec![0.3; 384].as_slice());
    let similar = pipeline.find_similar(&vec![0.5; 384], 2);
    println!("  embedding top-2: {:?}", similar);

    // Dedup across contacts
    let contact_list = vec![
        ("Anna".into(), "Mueller".into(), "anna.mueller@techflow.io".into()),
        ("Anna".into(), "Muller".into(), "a.muller@techflow.io".into()),
        ("Jan".into(), "de Vries".into(), "jan.devries@datawave.eu".into()),
    ];
    let dupes = pipeline.find_duplicates(&contact_list, 0.85);
    println!("  duplicates (threshold=0.85): {:?}", dupes);

    pipeline.flush()?;

    wal.sync()?;
    pages.sync()?;

    // === Kernel Modules ===
    #[cfg(feature = "kernel-arena")]
    {
        println!("\n=== Kernel: Arena Allocator ===");
        let arena = kernel::arena::Arena::new(1024 * 1024);
        let s1 = arena.copy_str("hello from arena");
        let s2 = arena.copy_str("zero-copy strings");
        let nums_ptr = arena.alloc_slice_ptr::<u64>(100);
        let nums = unsafe { std::slice::from_raw_parts_mut(nums_ptr, 100) };
        nums[0] = 42; nums[99] = 99;
        println!("  s1='{}' s2='{}'", s1, s2);
        println!("  nums[0]={} nums[99]={}", nums[0], nums[99]);
        println!("  used={} remaining={}", arena.used(), arena.remaining());
        arena.reset();
        println!("  after reset: used={}", arena.used());
    }

    #[cfg(feature = "kernel-btree")]
    {
        println!("\n=== Kernel: Disk-Resident B+ Tree ===");
        use kernel::bplus::BPlusTreeIndex;
        use storage::btree::BTreeOps;

        let btree_path = "data/kernel_demo.bpt";
        let _ = std::fs::remove_file(btree_path);
        let btree = BPlusTreeIndex::open(btree_path, 128).unwrap();

        for i in 0..500u32 {
            let key = format!("domain{:04}.com", i);
            btree.insert(key.as_bytes(), storage::btree::RecordPtr { page_id: i, slot_idx: 0 });
        }
        println!("  inserted 500 domains");
        println!("  len={}", btree.len());
        println!("  get('domain0042.com')={:?}", btree.get(b"domain0042.com"));

        let prefix = btree.prefix_scan(b"domain01");
        println!("  prefix_scan('domain01'): {} results", prefix.len());

        btree.delete(b"domain0042.com");
        println!("  after delete: get('domain0042.com')={:?}", btree.get(b"domain0042.com"));

        btree.sync().unwrap();
        println!("  synced to disk");

        let _ = std::fs::remove_file(btree_path);
    }

    #[cfg(feature = "kernel-scoring")]
    {
        println!("\n=== Kernel: Vectorized Batch Scoring ===");
        let mut batch = kernel::scoring::ContactBatch::new();
        batch.count = 5;

        // Simulate 5 contacts with varying ICP fit
        let matcher = kernel::scoring::IcpMatcher::default();
        matcher.populate_slot(&mut batch, 0, "AI Infrastructure", 200, "VP", "VP Engineering", "rust,python,kubernetes", "verified", 3);
        matcher.populate_slot(&mut batch, 1, "Data Engineering", 80, "Head", "Head of AI", "python,spark", "catch-all", 15);
        matcher.populate_slot(&mut batch, 2, "Fintech", 5000, "Junior", "Software Engineer", "java,spring", "unverified", 60);
        matcher.populate_slot(&mut batch, 3, "SaaS", 150, "Director", "Director of ML", "pytorch,python,kubernetes", "verified", 200);
        matcher.populate_slot(&mut batch, 4, "Crypto", 30, "CEO", "CEO", "solidity,rust", "verified", 5);

        batch.compute_scores();
        let top = batch.top_k_scored(3);
        println!("  top-3 scored contacts:");
        for (idx, score) in &top {
            println!("    [{}] score={:.1}", idx, score);
        }
        println!("  json: {}", batch.top_k_json(3));
    }

    #[cfg(feature = "kernel-html")]
    {
        println!("\n=== Kernel: Zero-Alloc HTML Scanner ===");
        let html = br#"
            <html><head><style>body{color:red}</style></head>
            <body>
            <script>var x = "hidden";</script>
            <h1>TechFlow Engineering</h1>
            <p>Contact our CTO at cto@techflow.io</p>
            <p>Or reach <a href="mailto:hiring@techflow.io?subject=Apply">hiring</a></p>
            <!-- hidden@secret.com should not appear -->
            <footer>info@techflow.io</footer>
            </body></html>
        "#;
        let result = kernel::html_scanner::scan_html_full(html);
        println!("  text: '{}'", result.text.trim());
        println!("  emails ({}):", result.emails.len());
        for e in &result.emails {
            println!("    {}", e);
        }
    }

    // ═══════════════════════════════════════════════════════
    // NEW v2 KERNEL MODULES
    // ═══════════════════════════════════════════════════════

    #[cfg(feature = "kernel-timer")]
    {
        println!("\n=== Kernel: Hardware Timer ===");
        let freq = kernel::timer::tsc_frequency_hz();
        let t = kernel::timer::Timer::start();
        let mut x = 0u64;
        for i in 0..10_000 { x = x.wrapping_add(i); }
        let _ = x;
        println!("  freq={}MHz resolution={}ns 10K-iters={:.0}ns",
            freq / 1_000_000, 1_000_000_000 / freq, t.elapsed_ns());
    }

    #[cfg(feature = "kernel-crc")]
    {
        println!("\n=== Kernel: Hardware CRC32C ===");
        #[cfg(feature = "kernel-timer")]
        let t = kernel::timer::Timer::start();
        let data = b"Senior Rust Engineer, Fully Remote, $160-200k, Cloudflare Workers";
        let iterations = 100_000u64;
        let mut crc = 0u32;
        for _ in 0..iterations {
            crc = kernel::crc::crc32c(data);
        }
        #[cfg(feature = "kernel-timer")]
        {
            let ns_per = t.elapsed_ns() / iterations;
            println!("  0x{:08x} ({} bytes, {}ns/op, {:.1}GB/s) hw={}",
                crc, data.len(), ns_per,
                (data.len() as f64 * iterations as f64) / (t.elapsed_ns() as f64),
                cfg!(target_arch = "aarch64") || cfg!(target_arch = "x86_64"));
        }
        #[cfg(not(feature = "kernel-timer"))]
        println!("  0x{:08x} ({} bytes)", crc, data.len());
    }

    #[cfg(feature = "kernel-ner")]
    {
        println!("\n=== Kernel: Job NER ===");
        #[cfg(feature = "kernel-timer")]
        let t = kernel::timer::Timer::start();
        let posting = b"Acme Corp | Senior Rust Engineer | Fully Remote | $160k-$200k\n\
            We're building edge infrastructure with Rust and WebAssembly.\n\
            Requirements: 5+ years experience with Rust, distributed systems,\n\
            and cloud infrastructure. Experience with Cloudflare Workers,\n\
            Docker, Kubernetes, and PostgreSQL preferred.\n\
            Fully remote position, async-first team across US/EU timezones.";

        let mut extraction = kernel::job_ner::JobExtraction::new();
        kernel::job_ner::extract_job_fields(posting, &mut extraction);

        #[cfg(feature = "kernel-timer")]
        println!("  company='{}' title='{}' | {:.1}us",
            extraction.company_str(), extraction.title_str(), t.elapsed_us());
        #[cfg(not(feature = "kernel-timer"))]
        println!("  company='{}' title='{}'",
            extraction.company_str(), extraction.title_str());
        println!("  salary=${}-${} remote={} exp={}+yr skills={}",
            extraction.salary_min, extraction.salary_max,
            extraction.remote_label(), extraction.experience_min, extraction.skills_count);
        print!("  skills: ");
        for i in 0..extraction.skills_count as usize {
            print!("{} ", extraction.skill_str(i));
        }
        println!();
        println!("  confidence: {}%", extraction.confidence);
    }

    #[cfg(feature = "kernel-ring")]
    {
        println!("\n=== Kernel: SPSC Ring Buffer ===");
        #[cfg(feature = "kernel-timer")]
        let t = kernel::timer::Timer::start();
        let ring = kernel::ring::SpscRing::new();

        for i in 0..10 {
            if let Some(slot) = ring.try_push() {
                let msg = format!("job posting #{}", i);
                slot.data[..msg.len()].copy_from_slice(msg.as_bytes());
                slot.len = msg.len() as u32;
                slot.source_board = (i % 3) as u8;
                ring.commit_push();
            }
        }

        let mut consumed = 0;
        while let Some(_slot) = ring.try_pop() {
            consumed += 1;
            ring.commit_pop();
        }

        #[cfg(feature = "kernel-timer")]
        println!("  produced=10 consumed={} remaining={} | {:.1}us",
            consumed, ring.len(), t.elapsed_us());
        #[cfg(not(feature = "kernel-timer"))]
        println!("  produced=10 consumed={} remaining={}", consumed, ring.len());
    }

    // Embedding Index (mmap-backed)
    {
        println!("\n=== Similarity: EmbeddingIndex (mmap INT8) ===");
        #[cfg(feature = "kernel-timer")]
        let t = kernel::timer::Timer::start();
        let idx_path = "data/jobs.embidx";
        let idx = similarity::embedding_index::EmbeddingIndex::create(idx_path, 384, 50_000).unwrap();

        let mut rng_state = 42u64;
        let fake_rng = |state: &mut u64| -> f32 {
            *state = state.wrapping_mul(6364136223846793005).wrapping_add(1);
            (*state >> 33) as f32 / (u32::MAX as f32) * 2.0 - 1.0
        };

        for i in 0..100u32 {
            let mut embedding = [0.0f32; 384];
            for v in &mut embedding { *v = fake_rng(&mut rng_state); }

            let mut meta = similarity::filter::VectorMeta::new();
            meta.set_job_id(&format!("job-{:05}", i));
            meta.pipeline_stage = pipeline::PipelineStage::Discovered as u8;
            meta.remote_policy = if i % 3 == 0 { 1 } else { 2 };
            meta.salary_min_k = 120 + (i as u16 % 80);
            meta.salary_max_k = 160 + (i as u16 % 80);
            meta.source_board = (i % 4) as u8;

            idx.append(&embedding, &meta);
        }

        #[cfg(feature = "kernel-timer")]
        println!("  inserted {} vectors (384-dim INT8) | {:.1}ms", idx.count(), t.elapsed_ms());
        #[cfg(not(feature = "kernel-timer"))]
        println!("  inserted {} vectors (384-dim INT8)", idx.count());

        // Search
        #[cfg(feature = "kernel-timer")]
        let t2 = kernel::timer::Timer::start();
        let mut query = [0.0f32; 384];
        for v in &mut query { *v = fake_rng(&mut rng_state); }

        let filter = similarity::filter::SearchFilter {
            remote_only: true,
            min_salary_k: 140,
            max_salary_k: 0,
            pipeline_stages: 0xFF,
            source_boards: 0xFF,
        };

        let results = idx.search(&query, 5, &filter);
        #[cfg(feature = "kernel-timer")]
        println!("  top-{} (remote, >$140k) in {:.1}us", results.len(), t2.elapsed_us());
        #[cfg(not(feature = "kernel-timer"))]
        println!("  top-{} (remote, >$140k)", results.len());

        for (rank, &(vec_idx, score)) in results.iter().enumerate() {
            let meta = idx.get_meta(vec_idx);
            // Copy packed fields to locals to avoid misaligned references
            let sal_min = meta.salary_min_k;
            let sal_max = meta.salary_max_k;
            let remote = meta.remote_policy;
            println!("    #{}: {} score={:.4} sal=${}-${}k remote={}",
                rank + 1, meta.job_id_str(), score, sal_min, sal_max, remote);
        }

        idx.sync().unwrap();
        std::fs::remove_file(idx_path).ok();
    }

    // Pipeline Stage
    {
        println!("\n=== Pipeline: Stage Machine ===");
        use pipeline::PipelineStage;
        let stages = [
            PipelineStage::Discovered,
            PipelineStage::Qualified,
            PipelineStage::Applied,
            PipelineStage::Rejected,
            PipelineStage::Offer,
        ];
        print!("  stages: ");
        for s in &stages {
            print!("{}", s.label());
            if let Some(label) = s.training_label() {
                print!("({})", if label == 1 { "+" } else { "-" });
            }
            print!(" ");
        }
        println!();

        let mut stats = pipeline::PipelineStats::default();
        for s in &stages { stats.record(*s); }
        println!("  qualification_rate={:.0}% interview_rate={:.0}%",
            stats.qualification_rate() * 100.0,
            stats.interview_rate() * 100.0);
    }

    // Memory Layout Report
    println!("\n┌──────────────────────────────────────────────────┐");
    println!("│ STRUCT SIZES                                     │");
    println!("├──────────────────────────────────────────────────┤");
    println!("│ VectorMeta:       {:>3} bytes                      │",
        std::mem::size_of::<similarity::filter::VectorMeta>());
    #[cfg(feature = "kernel-ner")]
    println!("│ JobExtraction:    {:>3} bytes                      │",
        std::mem::size_of::<kernel::job_ner::JobExtraction>());
    #[cfg(feature = "kernel-ring")]
    println!("│ RingSlot:        {:>4} bytes (1 page)              │",
        std::mem::size_of::<kernel::ring::RingSlot>());
    println!("│ SearchFilter:     {:>3} bytes                      │",
        std::mem::size_of::<similarity::filter::SearchFilter>());
    println!("└──────────────────────────────────────────────────┘");

    // M1 Memory Budget
    let embed_per_vec = 8 + 384; // QuantParams + INT8
    let meta_per_vec = similarity::filter::VECTOR_META_SIZE;
    let total_per_vec = embed_per_vec + meta_per_vec;
    println!("\n┌──────────────────────────────────────────────────┐");
    println!("│ M1 16GB MEMORY BUDGET                            │");
    println!("├──────────────────────────────────────────────────┤");
    println!("│ Per job vector:  {} bytes (INT8 384d+meta)       │", total_per_vec);
    println!("│ 10K jobs:        {:.1} MB                          │",
        10_000.0 * total_per_vec as f64 / 1_048_576.0);
    println!("│ 100K jobs:       {:.1} MB                         │",
        100_000.0 * total_per_vec as f64 / 1_048_576.0);
    println!("│ Max in 4GB:      {}K vectors                    │",
        4_000_000_000usize / total_per_vec / 1000);
    println!("└──────────────────────────────────────────────────┘");

    println!("\nAll systems operational.");
    Ok(())
}
