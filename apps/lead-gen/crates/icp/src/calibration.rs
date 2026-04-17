use crate::scoring::ContactBatch;

pub struct IsotonicCalibrator {
    breakpoints: Vec<(f32, f32)>,
    pub fitted: bool,
}

impl IsotonicCalibrator {
    pub fn new() -> Self {
        Self {
            breakpoints: Vec::new(),
            fitted: false,
        }
    }

    pub fn fit(&mut self, scores: &[f32], labels: &[f32]) {
        assert_eq!(scores.len(), labels.len(), "scores and labels must have same length");
        if scores.is_empty() {
            return;
        }

        let mut pairs: Vec<(f32, f32)> = scores.iter().copied().zip(labels.iter().copied()).collect();
        pairs.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));

        let mut blocks: Vec<(f32, f32, usize)> = Vec::new();
        for (score, label) in &pairs {
            blocks.push((*score, *label, 1));

            while blocks.len() >= 2 {
                let n = blocks.len();
                let avg_last = blocks[n - 1].1 / blocks[n - 1].2 as f32;
                let avg_prev = blocks[n - 2].1 / blocks[n - 2].2 as f32;
                if avg_last < avg_prev {
                    let last = blocks.pop().unwrap();
                    let prev = blocks.last_mut().unwrap();
                    prev.0 += last.0;
                    prev.1 += last.1;
                    prev.2 += last.2;
                } else {
                    break;
                }
            }
        }

        self.breakpoints.clear();
        for (score_sum, label_sum, count) in &blocks {
            let avg_score = score_sum / *count as f32;
            let avg_label = label_sum / *count as f32;
            self.breakpoints.push((avg_score, avg_label));
        }

        self.fitted = true;
    }

    pub fn calibrate(&self, raw_score: f32) -> f32 {
        if !self.fitted || self.breakpoints.is_empty() {
            return raw_score;
        }

        if raw_score <= self.breakpoints[0].0 {
            return self.breakpoints[0].1;
        }
        let last = self.breakpoints.len() - 1;
        if raw_score >= self.breakpoints[last].0 {
            return self.breakpoints[last].1;
        }

        let pos = self.breakpoints.partition_point(|bp| bp.0 <= raw_score);
        if pos == 0 {
            return self.breakpoints[0].1;
        }

        let (x0, y0) = self.breakpoints[pos - 1];
        let (x1, y1) = self.breakpoints[pos];

        let t = if (x1 - x0).abs() < 1e-10 { 0.5 } else { (raw_score - x0) / (x1 - x0) };
        y0 + t * (y1 - y0)
    }

    pub fn calibrate_batch(&self, batch: &mut ContactBatch) {
        for i in 0..batch.count {
            let raw = batch.scores[i] / 100.0;
            batch.scores[i] = self.calibrate(raw) * 100.0;
        }
    }
}

impl Default for IsotonicCalibrator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_isotonic_identity() {
        let mut cal = IsotonicCalibrator::new();
        let scores = vec![0.1, 0.3, 0.5, 0.7, 0.9];
        let labels = vec![0.1, 0.3, 0.5, 0.7, 0.9];
        cal.fit(&scores, &labels);
        assert!(cal.fitted);
        for &s in &scores {
            let c = cal.calibrate(s);
            assert!((c - s).abs() < 0.01);
        }
    }

    #[test]
    fn test_isotonic_monotonic_output() {
        let mut cal = IsotonicCalibrator::new();
        let scores = vec![0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
        let labels = vec![0.5, 0.3, 0.6, 0.2, 0.7, 0.4, 0.8, 0.5, 0.9];
        cal.fit(&scores, &labels);

        let mut prev = f32::NEG_INFINITY;
        for i in 0..100 {
            let s = i as f32 / 100.0;
            let c = cal.calibrate(s);
            assert!(c >= prev - 1e-6);
            prev = c;
        }
    }

    #[test]
    fn test_isotonic_unfitted_passthrough() {
        let cal = IsotonicCalibrator::new();
        assert_eq!(cal.calibrate(0.42), 0.42);
    }
}
