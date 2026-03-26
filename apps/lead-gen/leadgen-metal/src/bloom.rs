use ahash::AHasher;
use std::hash::{Hash, Hasher};

pub struct BloomFilter {
    bits: Vec<u64>,
    num_bits: usize,
    num_hashes: u32,
}

impl BloomFilter {
    pub fn new(capacity: usize, false_positive_rate: f64) -> Self {
        let num_bits = optimal_bits(capacity, false_positive_rate);
        let num_hashes = optimal_hashes(num_bits, capacity);
        let num_words = num_bits.div_ceil(64);

        Self {
            bits: vec![0u64; num_words],
            num_bits,
            num_hashes,
        }
    }

    pub fn insert(&mut self, item: &[u8]) {
        let (h1, h2) = double_hash(item);
        for i in 0..self.num_hashes {
            let bit = combined_hash(h1, h2, i) % self.num_bits as u64;
            self.bits[bit as usize / 64] |= 1u64 << (bit % 64);
        }
    }

    pub fn contains(&self, item: &[u8]) -> bool {
        let (h1, h2) = double_hash(item);
        for i in 0..self.num_hashes {
            let bit = combined_hash(h1, h2, i) % self.num_bits as u64;
            if self.bits[bit as usize / 64] & (1u64 << (bit % 64)) == 0 {
                return false;
            }
        }
        true
    }

    pub fn estimated_count(&self) -> usize {
        let set_bits: usize = self.bits.iter().map(|w| w.count_ones() as usize).sum();
        let m = self.num_bits as f64;
        let k = self.num_hashes as f64;
        let x = set_bits as f64;
        (-(m / k) * (1.0 - x / m).ln()) as usize
    }

    pub fn false_positive_rate(&self) -> f64 {
        let set_bits: usize = self.bits.iter().map(|w| w.count_ones() as usize).sum();
        let fill_ratio = set_bits as f64 / self.num_bits as f64;
        fill_ratio.powi(self.num_hashes as i32)
    }

    pub fn clear(&mut self) {
        for word in &mut self.bits { *word = 0; }
    }

    pub fn merge(&mut self, other: &BloomFilter) {
        assert_eq!(self.num_bits, other.num_bits);
        for (a, b) in self.bits.iter_mut().zip(other.bits.iter()) {
            *a |= *b;
        }
    }

    pub fn size_bytes(&self) -> usize {
        self.bits.len() * 8
    }
}

fn double_hash(item: &[u8]) -> (u64, u64) {
    let mut h1 = AHasher::default();
    item.hash(&mut h1);
    let hash1 = h1.finish();

    let mut h2 = AHasher::default();
    hash1.hash(&mut h2);
    item.hash(&mut h2);
    let hash2 = h2.finish();

    (hash1, hash2)
}

fn combined_hash(h1: u64, h2: u64, i: u32) -> u64 {
    h1.wrapping_add((i as u64).wrapping_mul(h2))
}

fn optimal_bits(n: usize, p: f64) -> usize {
    let ln2_sq = std::f64::consts::LN_2 * std::f64::consts::LN_2;
    (-(n as f64) * p.ln() / ln2_sq).ceil() as usize
}

fn optimal_hashes(m: usize, n: usize) -> u32 {
    let k = (m as f64 / n as f64) * std::f64::consts::LN_2;
    k.ceil().max(1.0) as u32
}
