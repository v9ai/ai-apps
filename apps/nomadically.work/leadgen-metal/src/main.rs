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
    pipeline.embeddings.insert(1, &vec![0.5; 384].as_slice());
    pipeline.embeddings.insert(2, &vec![0.3; 384].as_slice());
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

    println!("\nAll systems operational.");
    Ok(())
}
