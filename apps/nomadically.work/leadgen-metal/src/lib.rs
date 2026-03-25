pub mod bloom;
pub mod dedup;
pub mod dns;
pub mod email_metal;
pub mod index;
pub mod queue;
pub mod similarity;
pub mod storage;

use std::io;
use std::path::Path;

use dedup::blocking;
use index::posting::InvertedIndex;
use similarity::embeddings::EmbeddingStore;
use storage::{btree::BTreeIndex, page::PageFile, record, wal::WriteAheadLog};

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
    pub companies: BTreeIndex,
    pub contacts: BTreeIndex,
    pub postings: InvertedIndex,
    pub frontier: queue::frontier::UrlFrontier,
    pub embeddings: EmbeddingStore,
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

        let companies = BTreeIndex::new();
        let contacts = BTreeIndex::new();

        // Rebuild B-tree indexes from WAL replay
        companies.rebuild_from_wal(&wal, |data| {
            let reader = record::RecordReader::from_bytes(data)?;
            if reader.record_type() == record::RecordType::Company {
                reader.field_str(record::company_fields::DOMAIN)
                    .map(|s| s.as_bytes().to_vec())
            } else {
                None
            }
        });
        contacts.rebuild_from_wal(&wal, |data| {
            let reader = record::RecordReader::from_bytes(data)?;
            if reader.record_type() == record::RecordType::Contact {
                reader.field_str(record::contact_fields::EMAIL)
                    .map(|s| s.as_bytes().to_vec())
            } else {
                None
            }
        });

        // Ensure page 0 is allocated for data storage
        if pages.alloc_page().is_err() {
            // Already allocated on existing file — that's fine
        }

        let postings = InvertedIndex::new();
        let frontier = queue::frontier::UrlFrontier::new(100_000);
        let embeddings = EmbeddingStore::new(384);

        Ok(Self { wal, pages, companies, contacts, postings, frontier, embeddings })
    }

    /// Ingest a company: WAL → page store → B-tree index → posting index → frontier.
    pub fn ingest_company(
        &self,
        id: &str, name: &str, domain: &str, industry: &str,
        employee_count: u32, tech_stack: &str, location: &str, description: &str,
    ) -> io::Result<()> {
        // Skip if domain already indexed
        if self.companies.get(domain.as_bytes()).is_some() {
            return Ok(());
        }

        let data = record::build_company_record(
            id, name, domain, industry, employee_count, tech_stack, location, description,
        );

        // Durable: WAL first
        self.wal.append(storage::wal::EntryType::CompanyInsert, &data)?;

        // Page store
        let page_id = 0;
        if let Some(slot) = self.pages.insert_into_page(page_id, &data) {
            let ptr = storage::btree::RecordPtr { page_id, slot_idx: slot };

            // B-tree: lookup by domain
            self.companies.insert(domain.as_bytes(), ptr);

            // Posting index: full-text search on name, industry, tech stack
            let doc_id = crc32fast::hash(id.as_bytes());
            self.postings.index_with_id(doc_id, name);
            self.postings.index_with_id(doc_id, industry);
            self.postings.index_with_id(doc_id, tech_stack);
        }

        // Add to frontier for email discovery
        self.frontier.push_domain_pages(domain, &["/", "/about", "/team", "/careers"]);

        Ok(())
    }

    /// Ingest a contact: WAL → page store → B-tree index → posting index.
    pub fn ingest_contact(
        &self,
        id: &str, company_id: &str, first: &str, last: &str,
        title: &str, seniority: &str, email: &str, status: &str,
    ) -> io::Result<()> {
        if self.contacts.get(email.as_bytes()).is_some() {
            return Ok(());
        }

        let data = record::build_contact_record(
            id, company_id, first, last, title, seniority, email, status,
        );

        self.wal.append(storage::wal::EntryType::ContactInsert, &data)?;

        let page_id = 0;
        if let Some(slot) = self.pages.insert_into_page(page_id, &data) {
            let ptr = storage::btree::RecordPtr { page_id, slot_idx: slot };
            self.contacts.insert(email.as_bytes(), ptr);

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

    /// Find similar items by embedding vector (cosine similarity).
    pub fn find_similar(&self, query: &[f32], top_k: usize) -> Vec<(u32, f32)> {
        self.embeddings.top_k(query, top_k)
    }

    /// Discover email patterns for a domain using DNS + pattern generation + SMTP.
    pub async fn discover_emails(
        &self, domain: &str, first: &str, last: &str,
    ) -> Result<Vec<(String, email_metal::smtp_fsm::VerifyResult)>, String> {
        // 1. Resolve MX to verify the domain accepts mail
        let mx_records = dns::raw::resolve_mx_async(domain).await?;
        if mx_records.is_empty() {
            return Err(format!("no MX records for {}", domain));
        }

        // 2. Generate email candidates from name patterns
        let patterns = email_metal::pattern_fsm::all_patterns();
        let mut buf = [0u8; 256];
        let mut candidates = Vec::new();
        for (_name, pattern) in &patterns {
            if let Some(email) = pattern.generate_into(first, last, domain, &mut buf) {
                candidates.push(email.to_string());
            }
        }

        // 3. Verify each candidate via SMTP
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
        contacts: &[(String, String, String)], // (first, last, email)
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

        // Deduplicate pairs
        duplicates.sort_by(|a, b| {
            a.0.cmp(&b.0).then(a.1.cmp(&b.1))
        });
        duplicates.dedup_by(|a, b| a.0 == b.0 && a.1 == b.1);

        duplicates
    }

    pub fn flush(&self) -> io::Result<()> {
        self.wal.sync()?;
        self.pages.sync()?;
        Ok(())
    }
}
