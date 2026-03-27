pub mod bloom;
pub mod dedup;
pub mod dns;
pub mod email_metal;
pub mod index;
pub mod kernel;
pub mod net;
pub mod pipeline;
pub mod queue;
pub mod similarity;
pub mod storage;
pub mod teams;

use std::io;
use std::path::Path;

use dedup::blocking;
use index::posting::InvertedIndex;
use similarity::embeddings::{EmbeddingStore, QuantizedEmbeddingStore};
use storage::{btree::{BTreeOps, RecordPtr}, page::PageFile, record, wal::WriteAheadLog};

#[cfg(not(feature = "kernel-btree"))]
use storage::btree::MemoryBTreeIndex;

#[cfg(feature = "kernel-btree")]
use kernel::bplus::BPlusTreeIndex;

/// Connects all subsystems into a single lead-generation pipeline.
///
/// Data flow:
///   Frontier → DNS MX → Email patterns → SMTP verify → Storage (WAL + pages)
///                                                          ↓
///                                              Index (posting lists) + Embeddings
///                                                          ↓
///                                                    Dedup (blocking)
pub struct Pipeline {
    pub wal: WriteAheadLog,
    pub pages: PageFile,
    pub companies: Box<dyn BTreeOps>,
    pub contacts: Box<dyn BTreeOps>,
    pub postings: InvertedIndex,
    pub frontier: queue::frontier::UrlFrontier,
    pub embeddings: EmbeddingStore,
    /// INT8 quantized embeddings — 4x memory reduction over FP32.
    pub embeddings_q: QuantizedEmbeddingStore,
    /// Bloom filter for fast-path domain duplicate check (avoids B-tree lookup).
    domain_bloom: parking_lot::Mutex<bloom::BloomFilter>,
    /// Bloom filter for fast-path email duplicate check.
    email_bloom: parking_lot::Mutex<bloom::BloomFilter>,
}

impl Pipeline {
    pub fn open(dir: &Path) -> io::Result<Self> {
        std::fs::create_dir_all(dir)?;

        let wal = WriteAheadLog::open(
            dir.join("leadgen.wal").to_str().unwrap(),
            64,
        )?;
        let pages = PageFile::open(
            dir.join("leadgen.pages").to_str().unwrap(),
            1024,
        )?;

        // Feature-flagged index construction:
        // kernel-btree: disk-resident B+ tree (persistent, no WAL rebuild)
        // safe: in-memory BTreeMap (rebuilt from WAL on startup)
        #[cfg(feature = "kernel-btree")]
        let (companies, contacts): (Box<dyn BTreeOps>, Box<dyn BTreeOps>) = {
            let c = BPlusTreeIndex::open(
                dir.join("companies.bpt").to_str().unwrap(),
                256,
            )?;
            let t = BPlusTreeIndex::open(
                dir.join("contacts.bpt").to_str().unwrap(),
                256,
            )?;
            (Box::new(c), Box::new(t))
        };

        #[cfg(not(feature = "kernel-btree"))]
        let (companies, contacts): (Box<dyn BTreeOps>, Box<dyn BTreeOps>) = {
            let c = MemoryBTreeIndex::new();
            let t = MemoryBTreeIndex::new();

            // Rebuild indexes from WAL replay
            c.rebuild_from_wal(&wal, |data| {
                let reader = record::RecordReader::from_bytes(data)?;
                if reader.record_type() == record::RecordType::Company {
                    reader.field_str(record::company_fields::DOMAIN)
                        .map(|s| s.as_bytes().to_vec())
                } else {
                    None
                }
            });
            t.rebuild_from_wal(&wal, |data| {
                let reader = record::RecordReader::from_bytes(data)?;
                if reader.record_type() == record::RecordType::Contact {
                    reader.field_str(record::contact_fields::EMAIL)
                        .map(|s| s.as_bytes().to_vec())
                } else {
                    None
                }
            });

            (Box::new(c), Box::new(t))
        };

        // Ensure page 0 is allocated for data storage
        if pages.alloc_page().is_err() {
            // Already allocated on existing file — that's fine
        }

        let postings = InvertedIndex::new();
        let frontier = queue::frontier::UrlFrontier::new(100_000);
        let embeddings = EmbeddingStore::new(384);
        let embeddings_q = QuantizedEmbeddingStore::new(384);

        // Bloom filters for fast-path duplicate rejection (0.1% false positive rate)
        let domain_bloom = parking_lot::Mutex::new(bloom::BloomFilter::new(100_000, 0.001));
        let email_bloom = parking_lot::Mutex::new(bloom::BloomFilter::new(500_000, 0.001));

        Ok(Self {
            wal, pages, companies, contacts, postings, frontier,
            embeddings, embeddings_q, domain_bloom, email_bloom,
        })
    }

    /// Ingest a company: WAL → page store → B-tree index → posting index → frontier.
    /// Bloom filter provides O(1) fast-path rejection for known duplicates.
    #[allow(clippy::too_many_arguments)]
    pub fn ingest_company(
        &self,
        id: &str, name: &str, domain: &str, industry: &str,
        employee_count: u32, tech_stack: &str, location: &str, description: &str,
    ) -> io::Result<()> {
        // Fast-path: bloom filter rejects definite duplicates without B-tree lookup
        if self.domain_bloom.lock().contains(domain.as_bytes())
            && self.companies.get(domain.as_bytes()).is_some()
        {
            return Ok(());
        }

        let data = record::build_company_record(
            id, name, domain, industry, employee_count, tech_stack, location, description,
        );

        self.wal.append(storage::wal::EntryType::CompanyInsert, &data)?;

        let page_id = 0;
        if let Some(slot) = self.pages.insert_into_page(page_id, &data) {
            let ptr = RecordPtr { page_id, slot_idx: slot };
            self.companies.insert(domain.as_bytes(), ptr);
            self.domain_bloom.lock().insert(domain.as_bytes());

            let doc_id = crc32fast::hash(id.as_bytes());
            self.postings.index_with_id(doc_id, name);
            self.postings.index_with_id(doc_id, industry);
            self.postings.index_with_id(doc_id, tech_stack);
        }

        self.frontier.push_domain_pages(domain, &["/", "/about", "/team", "/careers"]);

        Ok(())
    }

    /// Ingest a contact: WAL → page store → B-tree index → posting index.
    /// Bloom filter provides O(1) fast-path rejection for known duplicates.
    #[allow(clippy::too_many_arguments)]
    pub fn ingest_contact(
        &self,
        id: &str, company_id: &str, first: &str, last: &str,
        title: &str, seniority: &str, email: &str, status: &str,
    ) -> io::Result<()> {
        // Fast-path: bloom filter rejects definite duplicates without B-tree lookup
        if self.email_bloom.lock().contains(email.as_bytes())
            && self.contacts.get(email.as_bytes()).is_some()
        {
            return Ok(());
        }

        let data = record::build_contact_record(
            id, company_id, first, last, title, seniority, email, status,
        );

        self.wal.append(storage::wal::EntryType::ContactInsert, &data)?;

        let page_id = 0;
        if let Some(slot) = self.pages.insert_into_page(page_id, &data) {
            let ptr = RecordPtr { page_id, slot_idx: slot };
            self.contacts.insert(email.as_bytes(), ptr);
            self.email_bloom.lock().insert(email.as_bytes());

            let doc_id = crc32fast::hash(id.as_bytes());
            self.postings.index_with_id(doc_id, title);
            self.postings.index_with_id(doc_id, seniority);
        }

        Ok(())
    }

    /// Full-text search across companies and contacts.
    pub fn search(&self, query: &str, limit: usize) -> Vec<(u32, f64)> {
        self.postings.search_ranked(query, limit)
    }

    /// Find similar items by embedding vector (cosine similarity, FP32).
    pub fn find_similar(&self, query: &[f32], top_k: usize) -> Vec<(u32, f32)> {
        self.embeddings.top_k(query, top_k)
    }

    /// Find similar items using INT8 quantized embeddings (4x less memory).
    pub fn find_similar_quantized(&self, query: &[f32], top_k: usize) -> Vec<(u32, f32)> {
        self.embeddings_q.top_k(query, top_k)
    }

    /// Score a batch of contacts against an ICP profile.
    /// Returns top-k (index, score) pairs sorted descending.
    #[cfg(feature = "kernel-scoring")]
    pub fn score_batch(
        &self,
        batch: &mut kernel::scoring::ContactBatch,
        top_k: usize,
    ) -> Vec<(usize, f32)> {
        batch.compute_scores();
        batch.top_k_scored(top_k)
    }

    /// Score a batch with a custom ICP profile.
    #[cfg(feature = "kernel-scoring")]
    pub fn score_batch_with(
        &self,
        batch: &mut kernel::scoring::ContactBatch,
        icp: &kernel::scoring::IcpProfile,
        top_k: usize,
    ) -> Vec<(usize, f32)> {
        batch.compute_scores_with(icp);
        batch.top_k_scored(top_k)
    }

    /// Discover email patterns for a domain using DNS + pattern generation + SMTP.
    pub async fn discover_emails(
        &self, domain: &str, first: &str, last: &str,
    ) -> Result<Vec<(String, email_metal::smtp_fsm::VerifyResult)>, String> {
        let mx_records = dns::raw::resolve_mx_async(domain).await?;
        if mx_records.is_empty() {
            return Err(format!("no MX records for {}", domain));
        }

        let patterns = email_metal::pattern_fsm::all_patterns();
        let mut buf = [0u8; 256];
        let mut candidates = Vec::new();
        for (_name, pattern) in &patterns {
            if let Some(email) = pattern.generate_into(first, last, domain, &mut buf) {
                candidates.push(email.to_string());
            }
        }

        let mx_host = &mx_records[0].exchange;
        let mut results = Vec::new();
        for candidate in &candidates {
            let result = email_metal::smtp_fsm::verify_email_fsm(
                candidate, mx_host, "verify.leadgen.local",
            ).await;
            results.push((candidate.clone(), result));
        }

        Ok(results)
    }

    /// Deduplicate contacts using blocking keys + string similarity.
    pub fn find_duplicates(
        &self,
        contacts: &[(String, String, String)],
        similarity_threshold: f64,
    ) -> Vec<(usize, usize, f64)> {
        let blocks = blocking::build_blocks(contacts);
        let mut duplicates = Vec::new();

        for (_key, indices) in &blocks {
            for i in 0..indices.len() {
                for j in (i + 1)..indices.len() {
                    let a = indices[i];
                    let b = indices[j];
                    let name_a = format!("{} {}", contacts[a].0, contacts[a].1);
                    let name_b = format!("{} {}", contacts[b].0, contacts[b].1);
                    let sim = similarity::simd::jaro_winkler_icase(&name_a, &name_b);
                    if sim >= similarity_threshold {
                        duplicates.push((a, b, sim));
                    }
                }
            }
        }

        duplicates.sort_by(|a, b| a.0.cmp(&b.0).then(a.1.cmp(&b.1)));
        duplicates.dedup_by(|a, b| a.0 == b.0 && a.1 == b.1);

        duplicates
    }

    /// Check if a domain is already known (bloom filter fast-path + B-tree confirm).
    pub fn domain_known(&self, domain: &str) -> bool {
        self.domain_bloom.lock().contains(domain.as_bytes())
            && self.companies.get(domain.as_bytes()).is_some()
    }

    pub fn flush(&self) -> io::Result<()> {
        self.wal.sync()?;
        self.pages.sync()?;
        self.companies.sync()?;
        self.contacts.sync()?;
        Ok(())
    }
}
