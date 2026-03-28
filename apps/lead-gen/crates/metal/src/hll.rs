//! HyperLogLog cardinality estimator.
//!
//! 64 registers (precision p=6), ~8% standard error, 64 bytes total memory.

use ahash::AHasher;
use std::hash::{Hash, Hasher};

const P: usize = 6;
const M: usize = 1 << P; // 64 registers
const ALPHA: f64 = 0.709; // bias correction for m=64

pub struct HyperLogLog {
    registers: [u8; M],
}

impl HyperLogLog {
    pub fn new() -> Self {
        Self {
            registers: [0u8; M],
        }
    }

    pub fn insert(&mut self, item: &[u8]) {
        let mut hasher = AHasher::default();
        item.hash(&mut hasher);
        let hash = hasher.finish();

        let idx = (hash >> (64 - P)) as usize; // top P bits = register index
        let remaining = (hash << P) | (1 << (P - 1)); // ensure at least 1 bit set
        let leading_zeros = remaining.leading_zeros() as u8 + 1;
        self.registers[idx] = self.registers[idx].max(leading_zeros);
    }

    pub fn cardinality(&self) -> f64 {
        let m = M as f64;
        let sum: f64 = self
            .registers
            .iter()
            .map(|&r| 2.0_f64.powi(-(r as i32)))
            .sum();
        let raw = ALPHA * m * m / sum;

        // Small range correction (linear counting)
        if raw <= 2.5 * m {
            let zeros = self.registers.iter().filter(|&&r| r == 0).count() as f64;
            if zeros > 0.0 {
                return m * (m / zeros).ln();
            }
        }
        raw
    }

    pub fn merge(&mut self, other: &Self) {
        for i in 0..M {
            self.registers[i] = self.registers[i].max(other.registers[i]);
        }
    }

    pub fn clear(&mut self) {
        self.registers = [0u8; M];
    }

    pub fn is_empty(&self) -> bool {
        self.registers.iter().all(|&r| r == 0)
    }
}

impl Default for HyperLogLog {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_cardinality() {
        let hll = HyperLogLog::new();
        assert!(hll.is_empty());
        // Empty HLL: all registers are 0, so linear counting gives m * ln(m/m) = m * ln(1) = 0
        // Actually: raw = ALPHA * m * m / m = ALPHA * m ≈ 45.4, which triggers small range correction
        // zeros = 64, so linear counting = 64 * ln(64/64) = 64 * 0 = 0
        let c = hll.cardinality();
        assert!(
            c < 1.0,
            "Empty HLL should have cardinality ~0, got {}",
            c
        );
    }

    #[test]
    fn test_small_set() {
        let mut hll = HyperLogLog::new();
        for i in 0..10u32 {
            hll.insert(&i.to_le_bytes());
        }
        let c = hll.cardinality();
        assert!(
            c >= 5.0 && c <= 20.0,
            "Expected cardinality in [5, 20] for 10 items, got {}",
            c
        );
    }

    #[test]
    fn test_large_set() {
        let mut hll = HyperLogLog::new();
        for i in 0..1000u32 {
            hll.insert(&i.to_le_bytes());
        }
        let c = hll.cardinality();
        let error = (c - 1000.0).abs() / 1000.0;
        assert!(
            error < 0.20,
            "Expected cardinality within 20% of 1000, got {} (error: {:.1}%)",
            c,
            error * 100.0
        );
    }

    #[test]
    fn test_merge() {
        let mut hll_a = HyperLogLog::new();
        let mut hll_b = HyperLogLog::new();

        // Disjoint sets
        for i in 0..500u32 {
            hll_a.insert(&i.to_le_bytes());
        }
        for i in 500..1000u32 {
            hll_b.insert(&i.to_le_bytes());
        }

        let card_a = hll_a.cardinality();
        let card_b = hll_b.cardinality();

        hll_a.merge(&hll_b);
        let merged = hll_a.cardinality();

        // Merged cardinality should be roughly the sum of individual cardinalities
        // (since the sets are disjoint), within HLL error bounds
        assert!(
            merged > card_a && merged > card_b,
            "Merged cardinality {} should exceed both individual ({}, {})",
            merged,
            card_a,
            card_b
        );

        let error = (merged - 1000.0).abs() / 1000.0;
        assert!(
            error < 0.25,
            "Merged cardinality should be within 25% of 1000, got {} (error: {:.1}%)",
            merged,
            error * 100.0
        );
    }

    #[test]
    fn test_clear() {
        let mut hll = HyperLogLog::new();
        for i in 0..100u32 {
            hll.insert(&i.to_le_bytes());
        }
        assert!(!hll.is_empty());

        hll.clear();
        assert!(hll.is_empty());
        assert!(
            hll.cardinality() < 1.0,
            "Cleared HLL should have cardinality ~0"
        );
    }

    #[test]
    fn test_deterministic() {
        let mut hll_once = HyperLogLog::new();
        hll_once.insert(b"same_item");
        let card_once = hll_once.cardinality();

        let mut hll_twice = HyperLogLog::new();
        hll_twice.insert(b"same_item");
        hll_twice.insert(b"same_item");
        let card_twice = hll_twice.cardinality();

        assert!(
            (card_once - card_twice).abs() < f64::EPSILON,
            "Inserting same item twice should not change cardinality: once={}, twice={}",
            card_once,
            card_twice
        );
    }
}
