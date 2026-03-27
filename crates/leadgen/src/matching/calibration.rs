/// Online probability calibration via an isotonic-regression approximation with a
/// sliding window.  Grounded in the COP/SmartCal 2025 research line on streaming
/// calibration for production ML systems.
///
/// Design decisions:
/// - Pool-Adjacent-Violators (PAV) isotonic regression is run on the retained
///   window every time a calibrated prediction is requested.  For window sizes
///   used in lead-gen (<= 2 000 observations) this is cheap enough to do inline.
/// - ECE is computed with 10 equal-width bins over [0, 1].
/// - No external crates beyond `std` are needed.
use serde::{Deserialize, Serialize};

const NUM_BINS: usize = 10;
const DEFAULT_WINDOW: usize = 500;

/// A single (predicted_probability, actual_outcome) observation.
#[derive(Debug, Clone, Copy)]
pub struct Observation {
    pub predicted: f64,
    pub actual: f64, // 0.0 or 1.0
}

/// Summary statistics returned after a calibration pass.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalibrationResult {
    /// Expected Calibration Error over 10 equal-width bins.
    pub ece: f64,
    /// Average predicted probability in the window.
    pub mean_predicted: f64,
    /// Average actual outcome (base rate) in the window.
    pub mean_actual: f64,
    /// Number of observations used.
    pub n: usize,
}

/// Streaming calibrator that maintains a fixed-size sliding window of
/// observations and applies PAV isotonic regression to calibrate new
/// raw scores on demand.
pub struct StreamingCalibrator {
    window: Vec<Observation>,
    capacity: usize,
    /// Cached PAV solution — invalidated on every new `observe` call.
    pav_cache: Option<Vec<(f64, f64)>>, // (x, calibrated_y) pairs
}

impl StreamingCalibrator {
    /// Create a new calibrator with the given sliding-window size.
    pub fn new(window_size: usize) -> Self {
        Self {
            window: Vec::with_capacity(window_size),
            capacity: window_size,
            pav_cache: None,
        }
    }

    /// Create a calibrator with the library default window (500 observations).
    pub fn default_window() -> Self {
        Self::new(DEFAULT_WINDOW)
    }

    /// Record a new (predicted, actual) pair.  The oldest observation is
    /// evicted once the window is full (ring-buffer semantics via rotate).
    pub fn observe(&mut self, predicted: f64, actual: f64) {
        let obs = Observation {
            predicted: predicted.clamp(0.0, 1.0),
            actual: actual.clamp(0.0, 1.0),
        };
        if self.window.len() == self.capacity {
            self.window.remove(0);
        }
        self.window.push(obs);
        self.pav_cache = None; // invalidate
    }

    /// Batch-observe a slice of (predicted, actual) pairs.
    pub fn observe_batch(&mut self, pairs: &[(f64, f64)]) {
        for &(p, a) in pairs {
            self.observe(p, a);
        }
    }

    /// Return the number of observations currently in the window.
    pub fn len(&self) -> usize {
        self.window.len()
    }

    pub fn is_empty(&self) -> bool {
        self.window.is_empty()
    }

    /// Calibrate a raw predicted probability using the PAV solution fitted on
    /// the current window.  Returns the raw value unchanged if the window has
    /// fewer than 2 observations.
    pub fn calibrate(&mut self, raw: f64) -> f64 {
        let raw = raw.clamp(0.0, 1.0);
        if self.window.len() < 2 {
            return raw;
        }
        let pav = self.pav_solution();
        interpolate_pav(pav, raw)
    }

    /// Compute calibration statistics over the current window.
    pub fn evaluate(&mut self) -> CalibrationResult {
        let n = self.window.len();
        if n == 0 {
            return CalibrationResult {
                ece: 0.0,
                mean_predicted: 0.0,
                mean_actual: 0.0,
                n: 0,
            };
        }

        let mean_predicted = self.window.iter().map(|o| o.predicted).sum::<f64>() / n as f64;
        let mean_actual = self.window.iter().map(|o| o.actual).sum::<f64>() / n as f64;

        let ece = self.compute_ece();

        CalibrationResult {
            ece,
            mean_predicted,
            mean_actual,
            n,
        }
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /// Build (or return cached) PAV solution.
    /// Returns a Vec of (predicted_x, calibrated_y) knot points, sorted by x.
    fn pav_solution(&mut self) -> &Vec<(f64, f64)> {
        if self.pav_cache.is_none() {
            self.pav_cache = Some(pool_adjacent_violators(&self.window));
        }
        self.pav_cache.as_ref().unwrap()
    }

    /// Expected Calibration Error over `NUM_BINS` equal-width bins.
    fn compute_ece(&self) -> f64 {
        let n = self.window.len() as f64;
        if n == 0.0 {
            return 0.0;
        }

        let mut bin_sum_pred = vec![0.0f64; NUM_BINS];
        let mut bin_sum_actual = vec![0.0f64; NUM_BINS];
        let mut bin_count = vec![0usize; NUM_BINS];

        for obs in &self.window {
            let bin = ((obs.predicted * NUM_BINS as f64) as usize).min(NUM_BINS - 1);
            bin_sum_pred[bin] += obs.predicted;
            bin_sum_actual[bin] += obs.actual;
            bin_count[bin] += 1;
        }

        let mut ece = 0.0f64;
        for b in 0..NUM_BINS {
            let count = bin_count[b];
            if count == 0 {
                continue;
            }
            let avg_pred = bin_sum_pred[b] / count as f64;
            let avg_actual = bin_sum_actual[b] / count as f64;
            ece += (count as f64 / n) * (avg_pred - avg_actual).abs();
        }
        ece
    }
}

/// Pool-Adjacent-Violators algorithm for isotonic regression (non-decreasing).
///
/// Returns a sorted Vec of (x, calibrated_y) knot points.
fn pool_adjacent_violators(observations: &[Observation]) -> Vec<(f64, f64)> {
    if observations.is_empty() {
        return vec![];
    }

    // Sort by predicted probability.
    let mut sorted: Vec<Observation> = observations.to_vec();
    sorted.sort_by(|a, b| a.predicted.partial_cmp(&b.predicted).unwrap());

    // PAV works on blocks of (sum_y, count) to compute running means.
    // Each block represents a group that has been pooled to a single mean.
    struct Block {
        sum_y: f64,
        count: f64,
        // representative x values (min x in block)
        x_min: f64,
        x_max: f64,
    }

    impl Block {
        fn mean(&self) -> f64 {
            self.sum_y / self.count
        }
    }

    let mut blocks: Vec<Block> = sorted
        .iter()
        .map(|o| Block {
            sum_y: o.actual,
            count: 1.0,
            x_min: o.predicted,
            x_max: o.predicted,
        })
        .collect();

    // Merge adjacent violating blocks (previous mean > current mean).
    let mut changed = true;
    while changed {
        changed = false;
        let mut i = 0;
        while i + 1 < blocks.len() {
            if blocks[i].mean() > blocks[i + 1].mean() {
                // Pool blocks[i] and blocks[i+1].
                let merged = Block {
                    sum_y: blocks[i].sum_y + blocks[i + 1].sum_y,
                    count: blocks[i].count + blocks[i + 1].count,
                    x_min: blocks[i].x_min,
                    x_max: blocks[i + 1].x_max,
                };
                blocks.splice(i..=i + 1, [merged]);
                changed = true;
            } else {
                i += 1;
            }
        }
    }

    // Build knot list: use midpoint x for each block.
    blocks
        .iter()
        .map(|b| ((b.x_min + b.x_max) / 2.0, b.mean()))
        .collect()
}

/// Linear interpolation over the PAV knot list.
fn interpolate_pav(knots: &[(f64, f64)], x: f64) -> f64 {
    if knots.is_empty() {
        return x;
    }
    if x <= knots[0].0 {
        return knots[0].1;
    }
    if x >= knots[knots.len() - 1].0 {
        return knots[knots.len() - 1].1;
    }
    // Binary search for the surrounding interval.
    let pos = knots.partition_point(|&(kx, _)| kx <= x);
    let (x0, y0) = knots[pos - 1];
    let (x1, y1) = knots[pos];
    if (x1 - x0).abs() < f64::EPSILON {
        return y0;
    }
    y0 + (y1 - y0) * (x - x0) / (x1 - x0)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    /// A perfectly calibrated model (predicted == actual on average per bin)
    /// should produce ECE close to zero.
    #[test]
    fn test_perfect_calibration_ece_near_zero() {
        let mut cal = StreamingCalibrator::new(1000);
        // For each decile, supply observations where mean(actual) == predicted.
        // E.g. at predicted=0.1 we produce 1 positive and 9 negatives, giving
        // mean_actual ≈ 0.10 in that bin.
        for decile in 1usize..=10 {
            let p = decile as f64 / 10.0;
            let positives = decile; // positives out of 10
            for _ in 0..positives {
                cal.observe(p, 1.0);
            }
            for _ in 0..(10 - positives) {
                cal.observe(p, 0.0);
            }
        }
        let result = cal.evaluate();
        // Allow up to 0.03 due to bin boundary discretisation.
        assert!(
            result.ece < 0.03,
            "ECE should be near 0 for a perfect model, got {:.4}",
            result.ece
        );
    }

    /// An overconfident model (always predicts 0.9 regardless of outcome)
    /// should produce a measurably higher ECE.
    #[test]
    fn test_overconfident_model_has_high_ece() {
        let mut cal = StreamingCalibrator::new(1000);
        // 50 % base rate but always predict 0.9.
        for i in 0..200 {
            cal.observe(0.9, if i % 2 == 0 { 1.0 } else { 0.0 });
        }
        let result = cal.evaluate();
        // 0.9 predicted vs 0.5 actual => ECE ≈ 0.4
        assert!(
            result.ece > 0.1,
            "ECE should be elevated for overconfident model, got {:.4}",
            result.ece
        );
    }

    /// Calibration should shift an overconfident raw score downward.
    #[test]
    fn test_calibrate_shifts_overconfident_score_down() {
        let mut cal = StreamingCalibrator::new(500);
        // Train: always predict 0.9 but base rate is 0.3.
        for i in 0..300 {
            let actual = if i < 90 { 1.0 } else { 0.0 };
            cal.observe(0.9, actual);
        }
        let calibrated = cal.calibrate(0.9);
        assert!(
            calibrated < 0.9,
            "Calibrated score should be lower than overconfident raw, got {:.4}",
            calibrated
        );
    }

    /// Sliding window eviction: adding observations beyond capacity should not panic.
    #[test]
    fn test_sliding_window_eviction() {
        let mut cal = StreamingCalibrator::new(10);
        for i in 0..50 {
            cal.observe(i as f64 / 50.0, if i % 3 == 0 { 1.0 } else { 0.0 });
        }
        assert_eq!(cal.len(), 10);
    }

    /// Empty calibrator returns raw score unchanged.
    #[test]
    fn test_empty_calibrator_passthrough() {
        let mut cal = StreamingCalibrator::new(100);
        assert!((cal.calibrate(0.72) - 0.72).abs() < f64::EPSILON);
    }

    /// batch_observe is equivalent to sequential observe calls.
    #[test]
    fn test_batch_observe_equivalence() {
        let pairs: Vec<(f64, f64)> = (0..20)
            .map(|i| (i as f64 / 20.0, if i % 2 == 0 { 1.0 } else { 0.0 }))
            .collect();

        let mut seq = StreamingCalibrator::new(100);
        for &(p, a) in &pairs {
            seq.observe(p, a);
        }

        let mut batch = StreamingCalibrator::new(100);
        batch.observe_batch(&pairs);

        let seq_result = seq.evaluate();
        let batch_result = batch.evaluate();
        assert!(
            (seq_result.ece - batch_result.ece).abs() < f64::EPSILON,
            "batch and sequential observe must produce identical ECE"
        );
    }
}
