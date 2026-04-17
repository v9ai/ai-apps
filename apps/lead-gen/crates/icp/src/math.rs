use serde::{Deserialize, Serialize};

#[inline(always)]
pub fn fast_sigmoid(x: f32) -> f32 {
    if x >= 6.0 { return 1.0; }
    if x <= -6.0 { return 0.0; }

    let neg_x = -x;
    let bits = ((12102203.0f32 * neg_x) as i32 + 1065353216) as u32;
    let exp_neg_x = f32::from_bits(bits);
    1.0 / (1.0 + exp_neg_x)
}

#[inline]
pub fn sigmoid(x: f32) -> f32 {
    1.0 / (1.0 + (-x.clamp(-88.0, 88.0)).exp())
}

#[inline]
pub fn smooth_recency(days: u16) -> f32 {
    (-0.015 * days as f32).exp()
}

#[inline(always)]
pub fn prefetch_read<T>(ptr: *const T) {
    #[cfg(target_arch = "x86_64")]
    unsafe {
        std::arch::x86_64::_mm_prefetch(ptr as *const i8, std::arch::x86_64::_MM_HINT_T0);
    }
    #[cfg(not(target_arch = "x86_64"))]
    {
        unsafe {
            let _ = std::ptr::read_volatile(ptr as *const u8);
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WelfordStats {
    pub count: u64,
    pub mean: f32,
    pub m2: f32,
}

impl WelfordStats {
    pub fn new() -> Self {
        Self { count: 0, mean: 0.0, m2: 0.0 }
    }

    pub fn update(&mut self, value: f32) {
        self.count += 1;
        let delta = value - self.mean;
        self.mean += delta / self.count as f32;
        let delta2 = value - self.mean;
        self.m2 += delta * delta2;
    }

    pub fn variance(&self) -> f32 {
        if self.count < 2 { 1.0 } else { self.m2 / self.count as f32 }
    }

    pub fn std_dev(&self) -> f32 {
        self.variance().sqrt().max(1e-6)
    }

    pub fn normalize(&self, value: f32) -> f32 {
        (value - self.mean) / self.std_dev()
    }
}

impl Default for WelfordStats {
    fn default() -> Self {
        Self::new()
    }
}

pub fn clip_gradients(gradients: &mut [f32], max_norm: f32) {
    debug_assert!(max_norm > 0.0, "max_norm must be positive");
    let mut norm_sq = 0.0f32;
    for &g in gradients.iter() {
        norm_sq += g * g;
    }
    let norm = norm_sq.sqrt();
    if norm > max_norm {
        let scale = max_norm / norm;
        for g in gradients.iter_mut() {
            *g *= scale;
        }
    }
}

pub fn cosine_annealing(initial_lr: f32, step: u64, total_steps: u64) -> f32 {
    if total_steps == 0 {
        return initial_lr;
    }
    let progress = (step as f64 / total_steps as f64).min(1.0);
    let lr = initial_lr as f64 * 0.5 * (1.0 + (std::f64::consts::PI * progress).cos());
    (lr as f32).max(0.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fast_sigmoid_midpoint() {
        let mid = fast_sigmoid(0.0);
        assert!((mid - 0.5).abs() < 1e-6, "fast_sigmoid(0)={}", mid);
    }

    #[test]
    fn test_fast_sigmoid_bounds() {
        assert!((fast_sigmoid(7.0) - 1.0).abs() < 1e-6);
        assert!(fast_sigmoid(-7.0) < 1e-6);
    }

    #[test]
    fn test_fast_sigmoid_accuracy() {
        for i in -50..=50 {
            let x = i as f32 / 10.0;
            let fast = fast_sigmoid(x);
            let exact = sigmoid(x);
            let err = (fast - exact).abs();
            assert!(err < 0.02, "x={} fast={} exact={} err={}", x, fast, exact, err);
        }
    }

    #[test]
    fn test_fast_sigmoid_monotonic() {
        let mut prev = 0.0f32;
        for i in -100..=100 {
            let x = i as f32 / 10.0;
            let y = fast_sigmoid(x);
            assert!(y >= prev - 1e-6, "non-monotonic at x={}", x);
            prev = y;
        }
    }

    #[test]
    fn test_sigmoid_bounds() {
        assert!((sigmoid(0.0) - 0.5).abs() < 1e-6);
        assert!(sigmoid(100.0) > 0.999);
        assert!(sigmoid(-100.0) < 0.001);
    }

    #[test]
    fn test_smooth_recency() {
        assert!((smooth_recency(0) - 1.0).abs() < 1e-6);
        assert!((smooth_recency(46) - 0.5).abs() < 0.05);
        assert!(smooth_recency(180) < 0.1);
    }

    #[test]
    fn test_welford_stats_basic() {
        let mut ws = WelfordStats::new();
        for v in [2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0] {
            ws.update(v);
        }
        assert!((ws.mean - 5.0).abs() < 0.01);
        assert!((ws.variance() - 4.0).abs() < 0.01);
    }

    #[test]
    fn test_welford_stats_normalize() {
        let mut ws = WelfordStats::new();
        for v in [2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0] {
            ws.update(v);
        }
        assert!((ws.normalize(7.0) - 1.0).abs() < 0.01);
        assert!(ws.normalize(5.0).abs() < 0.01);
    }

    #[test]
    fn test_clip_gradients_within_norm() {
        let mut grad = vec![0.1, -0.1, 0.05];
        let original = grad.clone();
        clip_gradients(&mut grad, 1.0);
        for (g, o) in grad.iter().zip(original.iter()) {
            assert!((g - o).abs() < 1e-9);
        }
    }

    #[test]
    fn test_clip_gradients_exceeds_norm() {
        let mut grad = vec![3.0, 4.0];
        clip_gradients(&mut grad, 1.0);
        let norm: f32 = grad.iter().map(|g| g * g).sum::<f32>().sqrt();
        assert!((norm - 1.0).abs() < 1e-5);
    }

    #[test]
    fn test_cosine_annealing() {
        assert!((cosine_annealing(0.1, 0, 100) - 0.1).abs() < 1e-6);
        assert!(cosine_annealing(0.1, 100, 100).abs() < 1e-6);
        assert!((cosine_annealing(0.1, 50, 100) - 0.05).abs() < 1e-5);
    }
}
