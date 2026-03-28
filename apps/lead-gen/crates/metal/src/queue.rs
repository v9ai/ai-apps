use ahash::{AHashMap, AHashSet};
use parking_lot::Mutex;
use std::cmp::Ordering;
use std::collections::BinaryHeap;
use std::time::Instant;

#[derive(Debug, Clone)]
pub struct CrawlTask {
    pub url: String,
    pub domain: String,
    pub depth: u8,
    pub priority: u8,
    pub enqueued_at: Instant,
}

/// Per-domain crawl statistics for authority scoring.
#[derive(Debug, Default)]
pub struct DomainStats {
    pub pages_crawled: u32,
    pub leads_found: u32,
}

impl DomainStats {
    /// Authority score: reward domains with consistent high-quality yields.
    /// lead_rate * sqrt(sample_size) balances quality with confidence.
    pub fn authority_score(&self) -> f64 {
        if self.pages_crawled == 0 {
            return 0.0;
        }
        let lead_rate = self.leads_found as f64 / self.pages_crawled as f64;
        lead_rate * (self.pages_crawled as f64).sqrt()
    }
}

/// Minimal xoshiro128+ PRNG for Thompson sampling.
struct Xoshiro128Plus {
    s: [u32; 4],
}

impl Xoshiro128Plus {
    fn new(seed: u64) -> Self {
        Self {
            s: [
                seed as u32,
                (seed >> 32) as u32,
                seed.wrapping_mul(0x6c62272e07bb0142) as u32,
                (seed.wrapping_mul(0x6c62272e07bb0142) >> 32) as u32,
            ],
        }
    }

    fn next_u32(&mut self) -> u32 {
        let result = self.s[0].wrapping_add(self.s[3]);
        let t = self.s[1] << 9;
        self.s[2] ^= self.s[0];
        self.s[3] ^= self.s[1];
        self.s[1] ^= self.s[2];
        self.s[0] ^= self.s[3];
        self.s[2] ^= t;
        self.s[3] = self.s[3].rotate_left(11);
        result
    }

    /// Uniform f64 in (0, 1)
    fn next_f64(&mut self) -> f64 {
        (self.next_u32() as f64 + 1.0) / (u32::MAX as f64 + 2.0)
    }
}

/// Thompson sampling bandit for domain selection.
/// Each domain is a Beta-Bernoulli arm: Beta(successes+1, failures+1).
pub struct ThompsonBandit {
    arms: AHashMap<String, (u32, u32)>, // (successes, failures)
    rng: Xoshiro128Plus,
}

impl ThompsonBandit {
    pub fn new() -> Self {
        let seed = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos() as u64;
        Self {
            arms: AHashMap::new(),
            rng: Xoshiro128Plus::new(seed),
        }
    }

    #[cfg(test)]
    fn new_seeded(seed: u64) -> Self {
        Self {
            arms: AHashMap::new(),
            rng: Xoshiro128Plus::new(seed),
        }
    }

    /// Sample from Beta(alpha, beta) for a domain.
    /// Uses Gamma ratio: Beta(a,b) = G_a / (G_a + G_b)
    /// Gamma(k,1) for integer k = sum of k Exponential(1) variates
    pub fn sample(&mut self, domain: &str) -> f64 {
        let (successes, failures) = self.arms.get(domain).copied().unwrap_or((0, 0));
        let alpha = successes + 1;
        let beta = failures + 1;

        let g_alpha = self.sample_gamma(alpha);
        let g_beta = self.sample_gamma(beta);

        g_alpha / (g_alpha + g_beta + 1e-10)
    }

    pub fn update(&mut self, domain: &str, success: bool) {
        let entry = self.arms.entry(domain.to_string()).or_insert((0, 0));
        if success {
            entry.0 = entry.0.saturating_add(1);
        } else {
            entry.1 = entry.1.saturating_add(1);
        }
    }

    /// Sample from Gamma(k, 1) where k is a positive integer.
    /// Gamma(k, 1) = sum of k independent Exp(1) random variables.
    /// Exp(1) = -ln(U) where U ~ Uniform(0, 1).
    fn sample_gamma(&mut self, k: u32) -> f64 {
        let mut sum = 0.0f64;
        for _ in 0..k {
            sum += -self.rng.next_f64().ln();
        }
        sum
    }

    /// Get the current (successes, failures) for a domain, if any.
    pub fn get_arm(&self, domain: &str) -> Option<(u32, u32)> {
        self.arms.get(domain).copied()
    }
}

/// Wrapper for priority-based dequeuing.
struct PrioritizedTask {
    task: CrawlTask,
    effective_priority: f64,
}

impl PartialEq for PrioritizedTask {
    fn eq(&self, other: &Self) -> bool {
        self.effective_priority == other.effective_priority
    }
}
impl Eq for PrioritizedTask {}

impl PartialOrd for PrioritizedTask {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
impl Ord for PrioritizedTask {
    fn cmp(&self, other: &Self) -> Ordering {
        self.effective_priority
            .partial_cmp(&other.effective_priority)
            .unwrap_or(Ordering::Equal)
    }
}

pub struct UrlFrontier {
    queue: Mutex<BinaryHeap<PrioritizedTask>>,
    seen_bloom: Mutex<crate::bloom::BloomFilter>,
    seen_exact: Mutex<AHashSet<String>>,
    domain_last_access: Mutex<AHashMap<String, Instant>>,
    domain_stats: Mutex<AHashMap<String, DomainStats>>,
    bandit: Mutex<ThompsonBandit>,
    enqueued: std::sync::atomic::AtomicU64,
    dequeued: std::sync::atomic::AtomicU64,
    duplicates_skipped: std::sync::atomic::AtomicU64,
}

impl UrlFrontier {
    pub fn new(expected_urls: usize) -> Self {
        Self {
            queue: Mutex::new(BinaryHeap::new()),
            seen_bloom: Mutex::new(crate::bloom::BloomFilter::new(expected_urls, 0.001)),
            seen_exact: Mutex::new(AHashSet::with_capacity(expected_urls)),
            domain_last_access: Mutex::new(AHashMap::new()),
            domain_stats: Mutex::new(AHashMap::new()),
            bandit: Mutex::new(ThompsonBandit::new()),
            enqueued: std::sync::atomic::AtomicU64::new(0),
            dequeued: std::sync::atomic::AtomicU64::new(0),
            duplicates_skipped: std::sync::atomic::AtomicU64::new(0),
        }
    }

    pub fn push(&self, url: &str, depth: u8, priority: u8) -> bool {
        let url_bytes = url.as_bytes();

        // Fast path: bloom filter says "definitely not seen" -> skip exact check.
        // When the bloom reports a possible hit, confirm with the exact set.
        {
            let bloom = self.seen_bloom.lock();
            if bloom.contains(url_bytes) {
                let exact = self.seen_exact.lock();
                if exact.contains(url) {
                    self.duplicates_skipped
                        .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                    return false;
                }
            }
        }

        {
            let mut bloom = self.seen_bloom.lock();
            bloom.insert(url_bytes);
        }
        {
            let mut exact = self.seen_exact.lock();
            if !exact.insert(url.to_string()) {
                self.duplicates_skipped
                    .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                return false;
            }
        }

        let domain = extract_domain(url);

        let task = CrawlTask {
            url: url.to_string(),
            domain: domain.clone(),
            depth,
            priority,
            enqueued_at: Instant::now(),
        };

        // Compute effective priority using domain authority + Thompson sampling
        let effective_priority = {
            let age_secs = task.enqueued_at.elapsed().as_secs_f64();
            let freshness = (-age_secs / 3600.0).exp();
            let authority = self
                .domain_stats
                .lock()
                .get(&domain)
                .map(|s| s.authority_score())
                .unwrap_or(0.0);
            let thompson = self.bandit.lock().sample(&domain);
            task.priority as f64 * freshness + authority + thompson * 5.0
        };

        self.queue.lock().push(PrioritizedTask {
            task,
            effective_priority,
        });

        self.enqueued
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        true
    }

    pub fn pop(&self, min_domain_delay_ms: u64) -> Option<CrawlTask> {
        let ptask = self.queue.lock().pop()?;
        let task = ptask.task;

        let min_delay = std::time::Duration::from_millis(min_domain_delay_ms);
        let mut last_access = self.domain_last_access.lock();

        if let Some(last) = last_access.get(&task.domain) {
            let elapsed = last.elapsed();
            if elapsed < min_delay {
                // Re-insert with the same effective priority
                self.queue.lock().push(PrioritizedTask {
                    effective_priority: ptask.effective_priority,
                    task,
                });
                return None;
            }
        }

        last_access.insert(task.domain.clone(), Instant::now());
        self.dequeued
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        Some(task)
    }

    pub fn push_domain_pages(&self, domain: &str, pages: &[&str]) {
        for page in pages {
            let url = format!("https://{}{}", domain, page);
            self.push(&url, 0, 1);
        }
    }

    /// Record a crawl result for domain authority and Thompson bandit updates.
    pub fn record_crawl_result(&self, domain: &str, found_lead: bool) {
        let mut stats = self.domain_stats.lock();
        let entry = stats.entry(domain.to_string()).or_default();
        entry.pages_crawled += 1;
        if found_lead {
            entry.leads_found += 1;
        }
        drop(stats);

        let mut bandit = self.bandit.lock();
        bandit.update(domain, found_lead);
    }

    pub fn len(&self) -> usize {
        self.queue.lock().len()
    }
    pub fn is_empty(&self) -> bool {
        self.queue.lock().is_empty()
    }

    pub fn stats(&self) -> FrontierStats {
        FrontierStats {
            enqueued: self
                .enqueued
                .load(std::sync::atomic::Ordering::Relaxed),
            dequeued: self
                .dequeued
                .load(std::sync::atomic::Ordering::Relaxed),
            duplicates_skipped: self
                .duplicates_skipped
                .load(std::sync::atomic::Ordering::Relaxed),
            queue_size: self.queue.lock().len() as u64,
            bloom_fp_rate: self.seen_bloom.lock().false_positive_rate(),
            domain_count: self.domain_stats.lock().len(),
        }
    }
}

pub struct FrontierStats {
    pub enqueued: u64,
    pub dequeued: u64,
    pub duplicates_skipped: u64,
    pub queue_size: u64,
    pub bloom_fp_rate: f64,
    pub domain_count: usize,
}

fn extract_domain(url: &str) -> String {
    url.split("://")
        .nth(1)
        .and_then(|s| s.split('/').next())
        .unwrap_or(url)
        .to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_push_and_pop() {
        let frontier = UrlFrontier::new(100);
        assert!(frontier.push("https://example.com/page1", 0, 1));
        assert_eq!(frontier.len(), 1);
        let task = frontier.pop(0).unwrap();
        assert_eq!(task.url, "https://example.com/page1");
        assert_eq!(task.domain, "example.com");
    }

    #[test]
    fn test_duplicate_rejected() {
        let frontier = UrlFrontier::new(100);
        assert!(frontier.push("https://example.com/a", 0, 1));
        assert!(!frontier.push("https://example.com/a", 0, 1));
        assert_eq!(frontier.len(), 1);
    }

    #[test]
    fn test_push_domain_pages() {
        let frontier = UrlFrontier::new(100);
        frontier.push_domain_pages("example.com", &["/", "/about", "/careers"]);
        assert_eq!(frontier.len(), 3);
    }

    #[test]
    fn test_stats() {
        let frontier = UrlFrontier::new(100);
        frontier.push("https://a.com/1", 0, 1);
        frontier.push("https://b.com/2", 0, 1);
        frontier.push("https://a.com/1", 0, 1); // duplicate
        let stats = frontier.stats();
        assert_eq!(stats.enqueued, 2);
        assert_eq!(stats.duplicates_skipped, 1);
    }

    #[test]
    fn test_empty_frontier() {
        let frontier = UrlFrontier::new(100);
        assert!(frontier.is_empty());
        assert!(frontier.pop(0).is_none());
    }

    #[test]
    fn test_extract_domain() {
        assert_eq!(extract_domain("https://example.com/path"), "example.com");
        assert_eq!(
            extract_domain("http://sub.domain.org/a/b"),
            "sub.domain.org"
        );
        assert_eq!(extract_domain("no-protocol"), "no-protocol");
    }

    // --- New tests ---

    #[test]
    fn test_priority_ordering() {
        let frontier = UrlFrontier::new(100);
        // Push low priority first, then high priority (different domains to avoid dedup)
        frontier.push("https://low.com/page", 0, 1);
        frontier.push("https://high.com/page", 0, 100);

        // Pop should return the higher-priority task first
        let first = frontier.pop(0).unwrap();
        assert_eq!(
            first.priority, 100,
            "highest priority task should be popped first"
        );
        let second = frontier.pop(0).unwrap();
        assert_eq!(second.priority, 1);
    }

    #[test]
    fn test_freshness_decay() {
        // Verify that the freshness formula decays: exp(-age/3600)
        // A freshly enqueued task (age ~0) has freshness ~1.0
        // After 3600 seconds, freshness = exp(-1) ~ 0.368
        let age_0 = (-0.0f64 / 3600.0).exp();
        let age_3600 = (-3600.0f64 / 3600.0).exp();
        let age_7200 = (-7200.0f64 / 3600.0).exp();

        assert!((age_0 - 1.0).abs() < 1e-10, "freshness at t=0 should be 1.0");
        assert!(
            (age_3600 - (-1.0f64).exp()).abs() < 1e-10,
            "freshness at t=3600 should be e^-1"
        );
        assert!(
            age_0 > age_3600,
            "newer task should have higher freshness"
        );
        assert!(
            age_3600 > age_7200,
            "freshness should monotonically decrease"
        );
    }

    #[test]
    fn test_domain_authority() {
        let frontier = UrlFrontier::new(100);

        // Record some crawl results to build domain authority
        for _ in 0..10 {
            frontier.record_crawl_result("good.com", true);
        }
        for _ in 0..10 {
            frontier.record_crawl_result("bad.com", false);
        }

        // Push tasks for both domains
        frontier.push("https://good.com/page", 0, 1);
        frontier.push("https://bad.com/page", 0, 1);

        // The domain with authority (good.com) should be popped first
        let first = frontier.pop(0).unwrap();
        assert_eq!(
            first.domain, "good.com",
            "domain with higher authority should be popped first"
        );
    }

    #[test]
    fn test_record_crawl_result() {
        let frontier = UrlFrontier::new(100);

        frontier.record_crawl_result("test.com", true);
        frontier.record_crawl_result("test.com", false);
        frontier.record_crawl_result("test.com", true);

        let stats = frontier.domain_stats.lock();
        let ds = stats.get("test.com").unwrap();
        assert_eq!(ds.pages_crawled, 3);
        assert_eq!(ds.leads_found, 2);
        drop(stats);

        let bandit = frontier.bandit.lock();
        let (succ, fail) = bandit.get_arm("test.com").unwrap();
        assert_eq!(succ, 2);
        assert_eq!(fail, 1);
    }

    #[test]
    fn test_thompson_bandit_update() {
        let mut bandit = ThompsonBandit::new();

        bandit.update("a.com", true);
        bandit.update("a.com", true);
        bandit.update("a.com", false);

        let (succ, fail) = bandit.get_arm("a.com").unwrap();
        assert_eq!(succ, 2);
        assert_eq!(fail, 1);

        // Unknown domain should return None
        assert!(bandit.get_arm("unknown.com").is_none());
    }

    #[test]
    fn test_thompson_bandit_sample_range() {
        let mut bandit = ThompsonBandit::new_seeded(42);

        // Sample many times and verify all in [0, 1]
        for _ in 0..1000 {
            let s = bandit.sample("test.com");
            assert!(
                (0.0..=1.0).contains(&s),
                "Thompson sample {} should be in [0, 1]",
                s
            );
        }

        // Also test with some updates
        bandit.update("test.com", true);
        bandit.update("test.com", true);
        for _ in 0..1000 {
            let s = bandit.sample("test.com");
            assert!(
                (0.0..=1.0).contains(&s),
                "Thompson sample {} should be in [0, 1] after updates",
                s
            );
        }
    }

    #[test]
    fn test_domain_stats_authority() {
        // Zero pages -> score 0
        let empty = DomainStats::default();
        assert_eq!(empty.authority_score(), 0.0);

        // 10 pages, 5 leads -> lead_rate=0.5, sqrt(10)=3.162..., score=1.581...
        let good = DomainStats {
            pages_crawled: 10,
            leads_found: 5,
        };
        let score = good.authority_score();
        let expected = 0.5 * (10.0f64).sqrt();
        assert!(
            (score - expected).abs() < 1e-10,
            "authority_score={}, expected={}",
            score,
            expected
        );

        // 100 pages, 1 lead -> lead_rate=0.01, sqrt(100)=10, score=0.1
        let sparse = DomainStats {
            pages_crawled: 100,
            leads_found: 1,
        };
        assert!(
            (sparse.authority_score() - 0.1).abs() < 1e-10,
            "sparse domain authority score"
        );

        // Higher quality domain beats lower quality with more samples
        let high_quality = DomainStats {
            pages_crawled: 4,
            leads_found: 4,
        };
        // lead_rate=1.0, sqrt(4)=2.0, score=2.0
        assert!(
            (high_quality.authority_score() - 2.0).abs() < 1e-10,
            "perfect conversion domain"
        );
    }

    #[test]
    fn test_xoshiro_generates_different() {
        let mut rng = Xoshiro128Plus::new(12345);
        let a = rng.next_u32();
        let b = rng.next_u32();
        let c = rng.next_u32();

        // All three should be different
        assert_ne!(a, b, "consecutive values should differ");
        assert_ne!(b, c, "consecutive values should differ");
        assert_ne!(a, c, "non-consecutive values should differ");

        // Check f64 output is in (0, 1)
        for _ in 0..1000 {
            let v = rng.next_f64();
            assert!(v > 0.0 && v < 1.0, "next_f64() = {} not in (0, 1)", v);
        }
    }

    #[test]
    fn test_stats_domain_count() {
        let frontier = UrlFrontier::new(100);
        assert_eq!(frontier.stats().domain_count, 0);

        frontier.record_crawl_result("a.com", true);
        frontier.record_crawl_result("b.com", false);
        assert_eq!(frontier.stats().domain_count, 2);
    }
}
