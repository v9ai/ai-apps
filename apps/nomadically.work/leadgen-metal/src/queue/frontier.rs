use crossbeam::queue::SegQueue;
use ahash::AHashSet;
use parking_lot::Mutex;
use std::time::Instant;

#[derive(Debug, Clone)]
pub struct CrawlTask {
    pub url: String,
    pub domain: String,
    pub depth: u8,
    pub priority: u8,
    pub enqueued_at: Instant,
}

pub struct UrlFrontier {
    queue: SegQueue<CrawlTask>,
    seen_bloom: Mutex<crate::bloom::BloomFilter>,
    seen_exact: Mutex<AHashSet<u64>>,
    domain_last_access: Mutex<ahash::AHashMap<String, Instant>>,
    enqueued: std::sync::atomic::AtomicU64,
    dequeued: std::sync::atomic::AtomicU64,
    duplicates_skipped: std::sync::atomic::AtomicU64,
}

impl UrlFrontier {
    pub fn new(expected_urls: usize) -> Self {
        Self {
            queue: SegQueue::new(),
            seen_bloom: Mutex::new(crate::bloom::BloomFilter::new(expected_urls, 0.001)),
            seen_exact: Mutex::new(AHashSet::with_capacity(expected_urls)),
            domain_last_access: Mutex::new(ahash::AHashMap::new()),
            enqueued: std::sync::atomic::AtomicU64::new(0),
            dequeued: std::sync::atomic::AtomicU64::new(0),
            duplicates_skipped: std::sync::atomic::AtomicU64::new(0),
        }
    }

    pub fn push(&self, url: &str, depth: u8, priority: u8) -> bool {
        let url_bytes = url.as_bytes();

        {
            let bloom = self.seen_bloom.lock();
            if bloom.contains(url_bytes) {
                let url_hash = ahash::RandomState::new().hash_one(url);
                let exact = self.seen_exact.lock();
                if exact.contains(&url_hash) {
                    self.duplicates_skipped.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                    return false;
                }
            }
        }

        {
            let mut bloom = self.seen_bloom.lock();
            bloom.insert(url_bytes);
        }
        {
            let url_hash = ahash::RandomState::new().hash_one(url);
            let mut exact = self.seen_exact.lock();
            if !exact.insert(url_hash) {
                self.duplicates_skipped.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                return false;
            }
        }

        let domain = extract_domain(url);

        self.queue.push(CrawlTask {
            url: url.to_string(),
            domain,
            depth,
            priority,
            enqueued_at: Instant::now(),
        });

        self.enqueued.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        true
    }

    pub fn pop(&self, min_domain_delay_ms: u64) -> Option<CrawlTask> {
        let task = self.queue.pop()?;

        let min_delay = std::time::Duration::from_millis(min_domain_delay_ms);
        let mut last_access = self.domain_last_access.lock();

        if let Some(last) = last_access.get(&task.domain) {
            let elapsed = last.elapsed();
            if elapsed < min_delay {
                self.queue.push(task);
                return None;
            }
        }

        last_access.insert(task.domain.clone(), Instant::now());
        self.dequeued.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        Some(task)
    }

    pub fn push_domain_pages(&self, domain: &str, pages: &[&str]) {
        for page in pages {
            let url = format!("https://{}{}", domain, page);
            self.push(&url, 0, 1);
        }
    }

    pub fn len(&self) -> usize { self.queue.len() }
    pub fn is_empty(&self) -> bool { self.queue.is_empty() }

    pub fn stats(&self) -> FrontierStats {
        FrontierStats {
            enqueued: self.enqueued.load(std::sync::atomic::Ordering::Relaxed),
            dequeued: self.dequeued.load(std::sync::atomic::Ordering::Relaxed),
            duplicates_skipped: self.duplicates_skipped.load(std::sync::atomic::Ordering::Relaxed),
            queue_size: self.queue.len() as u64,
            bloom_fp_rate: self.seen_bloom.lock().false_positive_rate(),
        }
    }
}

pub struct FrontierStats {
    pub enqueued: u64,
    pub dequeued: u64,
    pub duplicates_skipped: u64,
    pub queue_size: u64,
    pub bloom_fp_rate: f64,
}

fn extract_domain(url: &str) -> String {
    url.split("://").nth(1)
        .and_then(|s| s.split('/').next())
        .unwrap_or(url)
        .to_lowercase()
}
