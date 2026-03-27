use crate::pipeline::EvalSignal;
use serde::{Deserialize, Serialize};

/// Aggregate metrics for a single pipeline stage.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StageMetrics {
    pub count: usize,
    pub mean: f64,
    pub min: f64,
    pub max: f64,
    pub stddev: f64,
    pub sum: f64,
}

impl StageMetrics {
    pub fn from_signals(signals: &[&EvalSignal]) -> Self {
        if signals.is_empty() {
            return Self {
                count: 0,
                mean: 0.0,
                min: 0.0,
                max: 0.0,
                stddev: 0.0,
                sum: 0.0,
            };
        }

        let values: Vec<f64> = signals.iter().map(|s| s.value).collect();
        let count = values.len();
        let sum: f64 = values.iter().sum();
        let mean = sum / count as f64;
        let min = values.iter().cloned().fold(f64::INFINITY, f64::min);
        let max = values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let variance = values.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / count as f64;
        let stddev = variance.sqrt();

        Self {
            count,
            mean,
            min,
            max,
            stddev,
            sum,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn signal(stage: &str, metric: &str, value: f64) -> EvalSignal {
        EvalSignal {
            stage_name: stage.into(),
            metric_name: metric.into(),
            value,
            timestamp: "2024-01-01T00:00:00Z".into(),
        }
    }

    #[test]
    fn metrics_from_signals() {
        let s1 = signal("crawl", "pages", 10.0);
        let s2 = signal("crawl", "pages", 20.0);
        let s3 = signal("crawl", "pages", 30.0);
        let refs: Vec<&EvalSignal> = vec![&s1, &s2, &s3];
        let m = StageMetrics::from_signals(&refs);

        assert_eq!(m.count, 3);
        assert!((m.mean - 20.0).abs() < 0.001);
        assert!((m.min - 10.0).abs() < 0.001);
        assert!((m.max - 30.0).abs() < 0.001);
        assert!((m.sum - 60.0).abs() < 0.001);
    }

    #[test]
    fn empty_signals() {
        let refs: Vec<&EvalSignal> = vec![];
        let m = StageMetrics::from_signals(&refs);
        assert_eq!(m.count, 0);
        assert_eq!(m.mean, 0.0);
    }
}
