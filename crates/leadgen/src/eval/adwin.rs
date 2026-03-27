/// ADWIN — Adaptive Windowing drift detector.
///
/// Reference: Bifet & Gavaldà, "Learning from Time-Changing Data with
/// Adaptive Windowing", SDM 2007.
///
/// # Algorithm summary
///
/// ADWIN maintains a compressed representation of a sliding window using
/// *exponentially growing buckets*:
///
/// - Level 0 holds buckets of width 1 (single observations).
/// - Level k holds buckets of width 2^k (merged pairs from level k-1).
/// - Each level holds at most `max_buckets` (= 5 by default) buckets.
///
/// On every new observation:
/// 1. Insert a bucket of size 1 at the front (smallest level).
/// 2. *Compress*: whenever any level has more than `max_buckets` buckets,
///    merge the two oldest (rightmost) into one bucket at the next level.
/// 3. *Drift check*: scan all possible window splits (w₀ | w₁).
///    If  |mean₀ − mean₁| > ε_cut  for the Hoeffding-bound threshold:
///       drop the oldest sub-window (w₀) and mark drift detected.
///
/// # Complexity
///
/// Memory:   O(log n) — at most `max_buckets · log₂(n)` buckets.
/// Per-step: O(log² n) — compression + drift scan.
///
/// # Confidence parameter `delta`
///
/// `delta` controls the false-positive rate (default: 0.002).
/// Smaller `delta` means fewer false alarms but slower drift detection.

// ---------------------------------------------------------------------------
// Bucket (compressed window element)
// ---------------------------------------------------------------------------

/// A single compressed bucket holding the statistics for a sub-window of
/// `count` observations whose values sum to `sum`.
#[derive(Debug, Clone)]
struct Bucket {
    count: u64,
    sum: f64,
}

// ---------------------------------------------------------------------------
// ADWIN
// ---------------------------------------------------------------------------

/// ADWIN adaptive-windowing drift detector.
///
/// # Example
///
/// ```rust,ignore
/// let mut adwin = Adwin::new(0.002);
/// for v in stable_stream {
///     assert!(adwin.update(v).is_none());
/// }
/// // introduce a mean shift
/// for v in shifted_stream {
///     if let Some(change) = adwin.update(v) {
///         println!("Drift detected, magnitude: {change:.4}");
///     }
/// }
/// ```
pub struct Adwin {
    /// Confidence parameter δ — governs Hoeffding bound threshold.
    delta: f64,
    /// Maximum number of buckets per level before merging (default 5).
    max_buckets: usize,
    /// Bucket list per level; `buckets[0]` is level 0 (finest granularity).
    /// Within each level the newest bucket is at index 0, oldest at the back.
    buckets: Vec<Vec<Bucket>>,
    /// Total number of observations currently in the window.
    total_count: u64,
    /// Sum of all values in the current window.
    total_sum: f64,
    /// Welford-style variance accumulator (sum of squared deviations).
    ///
    /// Updated incrementally: used to track within-window variance without
    /// rescanning all values.
    variance_sum: f64,
}

impl Adwin {
    /// Create an ADWIN detector with the given confidence parameter `delta`.
    ///
    /// # Panics
    ///
    /// Panics if `delta` is not in the open interval (0.0, 1.0).
    pub fn new(delta: f64) -> Self {
        assert!(
            delta > 0.0 && delta < 1.0,
            "delta must be in (0, 1), got {delta}"
        );
        Self {
            delta,
            max_buckets: 5,
            buckets: Vec::new(),
            total_count: 0,
            total_sum: 0.0,
            variance_sum: 0.0,
        }
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /// Incorporate a new observation and test for distribution drift.
    ///
    /// Returns `Some(mean_change)` — the magnitude of the detected mean shift
    /// — when drift is found, or `None` when the window remains stationary.
    ///
    /// On drift the oldest sub-window that caused the violation is dropped;
    /// subsequent calls reflect the shrunk window.
    pub fn update(&mut self, value: f64) -> Option<f64> {
        // 1. Update global Welford statistics before insertion.
        let old_mean = self.mean_unchecked();
        self.total_count += 1;
        self.total_sum += value;
        // Welford online variance update.
        let new_mean = self.mean_unchecked();
        self.variance_sum += (value - old_mean) * (value - new_mean);

        // 2. Insert a single-observation bucket at level 0.
        self.insert_bucket(0, Bucket { count: 1, sum: value });

        // 3. Compress: merge same-size buckets when level overflows.
        self.compress();

        // 4. Drift check: scan all sub-window splits oldest-to-newest.
        self.detect_drift()
    }

    /// Mean of all values currently in the window.
    ///
    /// Returns `0.0` for an empty window.
    pub fn mean(&self) -> f64 {
        self.mean_unchecked()
    }

    /// Number of observations currently retained in the window.
    pub fn width(&self) -> u64 {
        self.total_count
    }

    /// Sample variance of the current window.
    ///
    /// Returns `0.0` for windows with fewer than 2 observations.
    pub fn variance(&self) -> f64 {
        if self.total_count < 2 {
            return 0.0;
        }
        self.variance_sum / (self.total_count - 1) as f64
    }

    /// Number of active buckets across all levels — useful for verifying
    /// O(log n) memory behaviour in tests.
    pub fn bucket_count(&self) -> usize {
        self.buckets.iter().map(|level| level.len()).sum()
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    #[inline]
    fn mean_unchecked(&self) -> f64 {
        if self.total_count == 0 {
            0.0
        } else {
            self.total_sum / self.total_count as f64
        }
    }

    /// Ensure level `idx` exists in the bucket list, growing it as needed.
    fn ensure_level(&mut self, idx: usize) {
        while self.buckets.len() <= idx {
            self.buckets.push(Vec::new());
        }
    }

    /// Prepend a bucket at level `idx` (index 0 = newest).
    fn insert_bucket(&mut self, idx: usize, bucket: Bucket) {
        self.ensure_level(idx);
        self.buckets[idx].insert(0, bucket);
    }

    /// Compress the bucket list: whenever a level has more than `max_buckets`
    /// buckets, merge the two oldest into a single bucket at the next level.
    ///
    /// This is called after every insertion and maintains the O(log n) memory
    /// invariant.
    fn compress(&mut self) {
        let mut level = 0;
        loop {
            if level >= self.buckets.len() {
                break;
            }
            if self.buckets[level].len() <= self.max_buckets {
                break;
            }
            // Pop the two oldest (right-end) buckets at this level.
            let b2 = self.buckets[level].pop().expect("level non-empty");
            let b1 = self.buckets[level].pop().expect("level non-empty after first pop");
            let merged = Bucket {
                count: b1.count + b2.count,
                sum: b1.sum + b2.sum,
            };
            self.ensure_level(level + 1);
            // Merged bucket is the *oldest* at the next level — append at back.
            self.buckets[level + 1].push(merged);
            level += 1;
        }
    }

    /// Scan all possible contiguous splits of the current window for drift.
    ///
    /// The window is treated as a sequence of sub-windows (from the bucket
    /// list, coarsest-to-finest).  For each prefix w₀ (oldest portion) and
    /// suffix w₁ (newest portion):
    ///
    ///   |mean(w₀) − mean(w₁)| > ε_cut(n₀, n₁)  → drift
    ///
    /// where ε_cut = √( (1/n₀ + 1/n₁) · ln(4·n·log₂(n)/δ) )
    ///
    /// This is derived from the Hoeffding/Chernoff bound used in the original
    /// ADWIN paper (equation 1).
    ///
    /// On detection: the oldest sub-window (w₀) is dropped from the window,
    /// global stats are updated, and `Some(|mean₀ − mean₁|)` is returned.
    fn detect_drift(&mut self) -> Option<f64> {
        if self.total_count < 2 {
            return None;
        }

        // Build an ordered list of (count, sum) for all buckets from oldest
        // to newest.  Buckets within the same level are ordered newest-first
        // (index 0), so we reverse each level and then iterate levels from
        // coarsest to finest.
        let ordered: Vec<(u64, f64)> = self
            .buckets
            .iter()
            .rev() // coarsest level first
            .flat_map(|level| level.iter().rev()) // oldest bucket first in each level
            .map(|b| (b.count, b.sum))
            .collect();

        let n = self.total_count;
        let ln_factor = (4.0 * n as f64 * (n as f64).log2().max(1.0) / self.delta).ln();

        // Prefix accumulator representing the "oldest" sub-window w₀.
        let mut prefix_count: u64 = 0;
        let mut prefix_sum: f64 = 0.0;

        for (bc, bs) in &ordered {
            prefix_count += bc;
            prefix_sum += bs;

            // The suffix w₁ is everything after this prefix.
            let suffix_count = n - prefix_count;
            if suffix_count == 0 {
                break; // no suffix remains
            }
            let suffix_sum = self.total_sum - prefix_sum;

            let mean_prefix = prefix_sum / prefix_count as f64;
            let mean_suffix = suffix_sum / suffix_count as f64;
            let mean_diff = (mean_prefix - mean_suffix).abs();

            // Hoeffding threshold.
            let eps_cut =
                ((1.0 / prefix_count as f64 + 1.0 / suffix_count as f64) * ln_factor).sqrt();

            if mean_diff > eps_cut {
                // Drift detected: discard the oldest sub-window (w₀).
                self.drop_oldest(prefix_count, prefix_sum);
                return Some(mean_diff);
            }
        }

        None
    }

    /// Remove the oldest `drop_count` observations from the window.
    ///
    /// Drops complete buckets from the back of each level (coarsest first)
    /// until `drop_count` observations have been removed, then updates global
    /// stats from scratch to avoid floating-point accumulation drift.
    fn drop_oldest(&mut self, drop_count: u64, _drop_sum: f64) {
        // Iterate levels from coarsest to finest, removing whole buckets.
        let mut remaining = drop_count;
        for level in (0..self.buckets.len()).rev() {
            while remaining > 0 {
                if self.buckets[level].is_empty() {
                    break;
                }
                let oldest_count = self.buckets[level].last().expect("checked non-empty").count;
                if oldest_count <= remaining {
                    self.buckets[level].pop();
                    remaining -= oldest_count;
                } else {
                    // Partial removal: shrink the oldest bucket proportionally.
                    let last = self.buckets[level].last_mut().expect("checked non-empty");
                    let frac = remaining as f64 / last.count as f64;
                    last.sum -= frac * last.sum;
                    last.count -= remaining;
                    remaining = 0;
                }
            }
            if remaining == 0 {
                break;
            }
        }

        // Recompute totals from the bucket list to eliminate any accumulated
        // floating-point error.
        self.total_count = self.buckets.iter().flat_map(|l| l.iter()).map(|b| b.count).sum();
        self.total_sum = self.buckets.iter().flat_map(|l| l.iter()).map(|b| b.sum).sum();

        // Variance sum must be recomputed from scratch after a drop; we
        // approximate by scaling by the fraction of remaining data.
        // The Welford accumulator does not support element deletion directly.
        // This is a standard approximation used by most ADWIN implementations.
        if self.total_count > 0 {
            let remaining_frac =
                self.total_count as f64 / (self.total_count + drop_count) as f64;
            self.variance_sum *= remaining_frac;
        } else {
            self.variance_sum = 0.0;
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // --- Stable stream -------------------------------------------------------

    #[test]
    fn no_drift_on_constant_stream() {
        let mut adwin = Adwin::new(0.002);
        for _ in 0..500 {
            let result = adwin.update(1.0);
            assert!(
                result.is_none(),
                "constant stream must not trigger drift"
            );
        }
    }

    #[test]
    fn no_drift_on_low_variance_stream() {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut adwin = Adwin::new(0.002);
        // Pseudo-random values tightly clustered around 5.0.
        let mut drift_count = 0;
        for i in 0u64..300 {
            let mut h = DefaultHasher::new();
            i.hash(&mut h);
            let noise = (h.finish() % 100) as f64 / 10_000.0; // ±0.01 max
            let v = 5.0 + noise;
            if adwin.update(v).is_some() {
                drift_count += 1;
            }
        }
        assert_eq!(drift_count, 0, "stable low-variance stream should not drift");
    }

    // --- Step change ---------------------------------------------------------

    #[test]
    fn drift_detected_on_step_change() {
        let mut adwin = Adwin::new(0.002);
        // Phase 1: stable baseline at 0.0
        for _ in 0..200 {
            adwin.update(0.0);
        }
        // Phase 2: sudden shift to 10.0 — drift must be detected within 100 obs.
        let mut detected = false;
        for _ in 0..100 {
            if adwin.update(10.0).is_some() {
                detected = true;
                break;
            }
        }
        assert!(detected, "step change from 0 to 10 must be detected");
    }

    // --- Gradual shift -------------------------------------------------------

    #[test]
    fn drift_detected_on_gradual_shift() {
        let mut adwin = Adwin::new(0.002);
        // Phase 1: stable at 0.0 for 300 observations.
        for _ in 0..300 {
            adwin.update(0.0);
        }
        // Phase 2: gradual linear ramp from 0 to 5 over 200 obs.
        let mut detected = false;
        for i in 0..200u64 {
            let v = i as f64 * 5.0 / 200.0;
            if adwin.update(v).is_some() {
                detected = true;
                break;
            }
        }
        assert!(detected, "gradual shift must be detected");
    }

    // --- Window shrinks after drift -----------------------------------------

    #[test]
    fn window_shrinks_after_drift() {
        let mut adwin = Adwin::new(0.002);
        for _ in 0..200 {
            adwin.update(0.0);
        }
        let width_before = adwin.width();

        // Force a drift by injecting a large step.
        let mut shrunk = false;
        for _ in 0..50 {
            if adwin.update(100.0).is_some() {
                shrunk = adwin.width() < width_before;
                break;
            }
        }
        assert!(shrunk, "window must shrink after drift is detected");
    }

    // --- Mean tracking -------------------------------------------------------

    #[test]
    fn mean_tracks_true_mean_on_constant_stream() {
        let mut adwin = Adwin::new(0.002);
        for _ in 0..100 {
            adwin.update(7.0);
        }
        let m = adwin.mean();
        assert!(
            (m - 7.0).abs() < 1e-6,
            "mean should track constant input: got {m}"
        );
    }

    #[test]
    fn mean_after_drift_reflects_new_distribution() {
        let mut adwin = Adwin::new(0.002);
        for _ in 0..300 {
            adwin.update(0.0);
        }
        // Inject shift and let ADWIN drop the old window.
        for _ in 0..100 {
            adwin.update(10.0);
        }
        // After enough steps, the retained mean should be closer to 10.
        let m = adwin.mean();
        assert!(
            m > 5.0,
            "mean after drift should reflect new distribution (>5), got {m}"
        );
    }

    // --- O(log n) bucket count ----------------------------------------------

    #[test]
    fn bucket_count_is_logarithmic() {
        let mut adwin = Adwin::new(0.002);
        for i in 0..1024 {
            adwin.update(i as f64);
        }
        let bcount = adwin.bucket_count();
        // With n=1024 and max_buckets=5 per level, expected upper bound is
        // max_buckets * log2(1024) = 5 * 10 = 50.
        assert!(
            bcount <= 60,
            "bucket count must be O(log n): n=1024, got {bcount}"
        );
    }

    // --- Edge cases ----------------------------------------------------------

    #[test]
    fn empty_detector_has_zero_width_and_mean() {
        let adwin = Adwin::new(0.002);
        assert_eq!(adwin.width(), 0);
        assert_eq!(adwin.mean(), 0.0);
        assert_eq!(adwin.variance(), 0.0);
    }

    #[test]
    fn single_observation_has_zero_variance() {
        let mut adwin = Adwin::new(0.002);
        adwin.update(42.0);
        assert_eq!(adwin.variance(), 0.0);
        assert_eq!(adwin.mean(), 42.0);
    }

    #[test]
    fn variance_positive_for_heterogeneous_stream() {
        let mut adwin = Adwin::new(0.002);
        for v in [0.0, 1.0, 2.0, 3.0, 4.0] {
            adwin.update(v);
        }
        assert!(adwin.variance() > 0.0, "variance must be positive for distinct values");
    }

    #[test]
    #[should_panic]
    fn new_panics_on_invalid_delta() {
        Adwin::new(0.0);
    }
}
