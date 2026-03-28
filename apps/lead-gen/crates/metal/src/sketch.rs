//! Count-Min Sketch for frequency estimation.
//!
//! Parameterized by (epsilon, delta) for error/confidence trade-off.
//! - epsilon controls width (accuracy): smaller epsilon = wider table = more accurate
//! - delta controls depth (confidence): smaller delta = deeper table = higher confidence

use ahash::AHasher;
use std::hash::{Hash, Hasher};

pub struct CountMinSketch {
    width: usize,
    depth: usize,
    table: Vec<u32>,
    seeds: Vec<u64>,
}

impl CountMinSketch {
    /// Create with error rate `epsilon` and confidence `delta`.
    ///
    /// Memory: `width * depth * 4` bytes, where:
    /// - `width = ceil(e / epsilon)`
    /// - `depth = ceil(ln(1 / delta))`
    pub fn new(epsilon: f64, delta: f64) -> Self {
        let width = (std::f64::consts::E / epsilon).ceil() as usize;
        let depth = (1.0 / delta).ln().ceil() as usize;
        let seeds: Vec<u64> = (0..depth)
            .map(|i| (i as u64).wrapping_mul(0x517cc1b727220a95))
            .collect();
        Self {
            width,
            depth,
            table: vec![0u32; width * depth],
            seeds,
        }
    }

    /// Increment the count of `item` by `count`.
    pub fn increment(&mut self, item: &[u8], count: u32) {
        for d in 0..self.depth {
            let idx = self.hash_to_idx(item, d);
            self.table[d * self.width + idx] =
                self.table[d * self.width + idx].saturating_add(count);
        }
    }

    /// Query the estimated count of `item`.
    ///
    /// Returns the minimum across all hash rows (never underestimates true count).
    pub fn query(&self, item: &[u8]) -> u32 {
        (0..self.depth)
            .map(|d| {
                let idx = self.hash_to_idx(item, d);
                self.table[d * self.width + idx]
            })
            .min()
            .unwrap_or(0)
    }

    /// Merge another sketch into this one (element-wise addition).
    ///
    /// Both sketches must have the same dimensions.
    pub fn merge(&mut self, other: &Self) {
        assert_eq!(self.width, other.width, "Width mismatch on merge");
        assert_eq!(self.depth, other.depth, "Depth mismatch on merge");
        for i in 0..self.table.len() {
            self.table[i] = self.table[i].saturating_add(other.table[i]);
        }
    }

    /// Total memory used by the count table in bytes.
    pub fn memory_bytes(&self) -> usize {
        self.width * self.depth * std::mem::size_of::<u32>()
    }

    fn hash_to_idx(&self, item: &[u8], depth: usize) -> usize {
        let mut hasher = AHasher::default();
        self.seeds[depth].hash(&mut hasher);
        item.hash(&mut hasher);
        (hasher.finish() as usize) % self.width
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_increment_query() {
        let mut cms = CountMinSketch::new(0.01, 0.01);
        for _ in 0..5 {
            cms.increment(b"hello", 1);
        }
        let count = cms.query(b"hello");
        assert!(
            count >= 5,
            "Expected count >= 5 for 'hello', got {}",
            count
        );
    }

    #[test]
    fn test_overcount_not_undercount() {
        let mut cms = CountMinSketch::new(0.01, 0.01);
        let true_count = 42u32;
        for _ in 0..true_count {
            cms.increment(b"test_item", 1);
        }
        // Also add noise from other items
        for i in 0..1000u32 {
            cms.increment(&i.to_le_bytes(), 1);
        }
        let estimated = cms.query(b"test_item");
        assert!(
            estimated >= true_count,
            "CMS must never undercount: estimated={}, true={}",
            estimated,
            true_count
        );
    }

    #[test]
    fn test_frequency_ordering() {
        let mut cms = CountMinSketch::new(0.001, 0.001);
        for _ in 0..100 {
            cms.increment(b"frequent", 1);
        }
        for _ in 0..10 {
            cms.increment(b"infrequent", 1);
        }
        let freq_count = cms.query(b"frequent");
        let infreq_count = cms.query(b"infrequent");
        assert!(
            freq_count > infreq_count,
            "frequent ({}) should be higher than infrequent ({})",
            freq_count,
            infreq_count
        );
    }

    #[test]
    fn test_merge() {
        let mut cms_a = CountMinSketch::new(0.01, 0.01);
        let mut cms_b = CountMinSketch::new(0.01, 0.01);

        for _ in 0..10 {
            cms_a.increment(b"item", 1);
        }
        for _ in 0..20 {
            cms_b.increment(b"item", 1);
        }

        cms_a.merge(&cms_b);
        let count = cms_a.query(b"item");
        assert!(
            count >= 30,
            "Merged count should be >= 30, got {}",
            count
        );
    }

    #[test]
    fn test_memory() {
        let cms = CountMinSketch::new(0.01, 0.01);
        let width = (std::f64::consts::E / 0.01).ceil() as usize;
        let depth = (1.0 / 0.01_f64).ln().ceil() as usize;
        let expected = width * depth * std::mem::size_of::<u32>();
        assert_eq!(
            cms.memory_bytes(),
            expected,
            "Memory bytes mismatch: got {}, expected {}",
            cms.memory_bytes(),
            expected
        );
    }
}
