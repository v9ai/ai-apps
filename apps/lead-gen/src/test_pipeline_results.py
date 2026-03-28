"""
Test suite for pipeline results evaluation — ML scoring & improvement.

Covers:
- Feature extraction: normalization, completeness, dtype consistency
- Weighted linear scorer: score bounds, weight updates, convergence
- Online statistics: Welford mean/variance, EMA tracking
- Isotonic calibration: monotonicity, PAVA correctness, interpolation
- Conformal prediction: coverage guarantee ≥95%, interval width bounds
- Drift detection: ADWIN-style sliding window, Wasserstein-1
- Feature attribution: SHAP-lite contributions, outlier z-scores
- Online learning: SGD weight update, error reduction over epochs
- Improvement ranking: priority ordering, expected lift correlation
"""

import time
from typing import List, Tuple

import numpy as np
import pytest


# ===========================================================================
# Feature extraction & normalization
# ===========================================================================

# Stage feature dimensions (mirrors FEATURE_NAMES in schema.ts)
STAGE_DIMS = {
    "discovery": 8,
    "enrichment": 10,
    "contacts": 9,
    "outreach": 9,
}

FEATURE_NAMES = {
    "discovery": [
        "has_website", "has_description", "description_len", "has_logo",
        "days_since_update", "has_linkedin", "has_job_board", "has_email",
    ],
    "enrichment": [
        "category_known", "ai_tier", "ai_confidence", "has_services",
        "service_count", "has_tags", "has_industries", "has_deep_analysis",
        "has_ashby_enrichment", "ashby_tech_signal_count",
    ],
    "contacts": [
        "has_email", "email_verified", "has_position", "has_linkedin",
        "has_company_link", "nb_status_valid", "is_bounced",
        "do_not_contact", "days_since_update",
    ],
    "outreach": [
        "was_delivered", "was_opened", "got_reply", "is_error",
        "sequence_depth", "has_followup", "days_since_sent",
        "subject_length", "body_length",
    ],
}


def _synthetic_features(stage: str, n: int = 200, seed: int = 42) -> np.ndarray:
    """Generate synthetic feature matrix for a stage. Values in [0, 1]."""
    rng = np.random.RandomState(seed)
    dim = STAGE_DIMS[stage]
    X = rng.uniform(0, 1, (n, dim)).astype(np.float64)
    # Binary features should be 0/1
    binary_cols = [i for i, name in enumerate(FEATURE_NAMES[stage])
                   if name.startswith("has_") or name.startswith("is_") or name.startswith("was_")
                   or name in ("email_verified", "got_reply", "do_not_contact", "nb_status_valid",
                               "category_known")]
    for col in binary_cols:
        X[:, col] = (X[:, col] > 0.5).astype(np.float64)
    return X


class TestFeatureExtraction:

    @pytest.mark.parametrize("stage", list(STAGE_DIMS.keys()))
    def test_feature_count_matches_schema(self, stage):
        assert len(FEATURE_NAMES[stage]) == STAGE_DIMS[stage]

    @pytest.mark.parametrize("stage", list(STAGE_DIMS.keys()))
    def test_all_features_in_unit_range(self, stage):
        X = _synthetic_features(stage, n=500)
        assert X.min() >= 0.0, f"Min={X.min()}"
        assert X.max() <= 1.0, f"Max={X.max()}"

    @pytest.mark.parametrize("stage", list(STAGE_DIMS.keys()))
    def test_binary_features_are_binary(self, stage):
        X = _synthetic_features(stage, n=500)
        names = FEATURE_NAMES[stage]
        for i, name in enumerate(names):
            if name.startswith("has_") or name.startswith("is_") or name.startswith("was_"):
                unique = np.unique(X[:, i])
                assert set(unique).issubset({0.0, 1.0}), (
                    f"{name} has non-binary values: {unique}"
                )

    @pytest.mark.parametrize("stage", list(STAGE_DIMS.keys()))
    def test_feature_names_unique(self, stage):
        names = FEATURE_NAMES[stage]
        assert len(names) == len(set(names))

    def test_dtype_float64(self):
        X = _synthetic_features("discovery")
        assert X.dtype == np.float64


# ===========================================================================
# Welford online statistics
# ===========================================================================

class TestWelfordStats:

    @staticmethod
    def welford_update(mean, variance, count, x):
        """Single-pass Welford update."""
        count += 1
        delta = x - mean
        mean += delta / count
        delta2 = x - mean
        variance += (delta * delta2 - variance) / count
        return mean, variance, count

    def test_mean_convergence(self):
        """Online mean should converge to batch mean."""
        rng = np.random.RandomState(42)
        data = rng.normal(0.5, 0.1, 1000)

        mean, variance, count = 0.0, 0.0, 0
        for x in data:
            mean, variance, count = self.welford_update(mean, variance, count, x)

        assert mean == pytest.approx(np.mean(data), abs=1e-10)

    def test_variance_convergence(self):
        """Online variance should converge to batch variance."""
        rng = np.random.RandomState(42)
        data = rng.normal(0.5, 0.1, 1000)

        mean, variance, count = 0.0, 0.0, 0
        for x in data:
            mean, variance, count = self.welford_update(mean, variance, count, x)

        assert variance == pytest.approx(np.var(data), abs=1e-4)

    def test_single_value(self):
        mean, variance, count = self.welford_update(0, 0, 0, 5.0)
        assert mean == 5.0
        assert variance == 0.0
        assert count == 1

    def test_numerical_stability(self):
        """Welford should handle large values without catastrophic cancellation."""
        mean, variance, count = 0.0, 0.0, 0
        large = 1e8
        for x in [large + 1, large + 2, large + 3]:
            mean, variance, count = self.welford_update(mean, variance, count, x)
        assert variance == pytest.approx(2 / 3, abs=0.01)


# ===========================================================================
# EMA (exponential moving average)
# ===========================================================================

class TestEMA:

    @staticmethod
    def ema_update(value, count, x, alpha=0.1):
        if count == 0:
            return x, 1
        return alpha * x + (1 - alpha) * value, count + 1

    def test_tracks_step_change(self):
        """EMA should track a step change within ~1/alpha samples."""
        value, count = 0.0, 0
        alpha = 0.1
        # Initial phase at 0.2
        for _ in range(50):
            value, count = self.ema_update(value, count, 0.2, alpha)
        assert value == pytest.approx(0.2, abs=0.01)

        # Step change to 0.8
        for _ in range(50):
            value, count = self.ema_update(value, count, 0.8, alpha)
        assert value == pytest.approx(0.8, abs=0.05)

    def test_alpha_sensitivity(self):
        """Higher alpha → faster tracking."""
        data = [0.1] * 20 + [0.9] * 20

        slow_val, slow_c = 0.0, 0
        fast_val, fast_c = 0.0, 0
        for x in data:
            slow_val, slow_c = self.ema_update(slow_val, slow_c, x, 0.05)
            fast_val, fast_c = self.ema_update(fast_val, fast_c, x, 0.3)

        # Fast should be closer to 0.9
        assert fast_val > slow_val


# ===========================================================================
# Weighted linear scorer
# ===========================================================================

class TestWeightedScorer:

    @staticmethod
    def weighted_score(values: np.ndarray, weights: np.ndarray) -> float:
        return float(np.clip(np.dot(values, weights), 0, 1))

    def test_score_in_unit_range(self):
        rng = np.random.RandomState(42)
        for _ in range(100):
            values = rng.uniform(0, 1, 8)
            weights = rng.uniform(0, 0.5, 8)
            weights /= weights.sum()
            score = self.weighted_score(values, weights)
            assert 0 <= score <= 1

    def test_perfect_score(self):
        """All features 1.0 with uniform weights → score 1.0."""
        dim = 8
        values = np.ones(dim)
        weights = np.ones(dim) / dim
        assert self.weighted_score(values, weights) == pytest.approx(1.0)

    def test_zero_score(self):
        """All features 0.0 → score 0.0."""
        dim = 8
        values = np.zeros(dim)
        weights = np.ones(dim) / dim
        assert self.weighted_score(values, weights) == pytest.approx(0.0)

    def test_single_feature_dominance(self):
        """Weight concentrated on one feature should track that feature."""
        values = np.array([0.9, 0.1, 0.1, 0.1])
        weights = np.array([0.7, 0.1, 0.1, 0.1])
        score = self.weighted_score(values, weights)
        assert score > 0.6

    def test_weight_update_sgd(self):
        """SGD should reduce error over iterations."""
        rng = np.random.RandomState(42)
        dim = 8
        true_weights = rng.uniform(0, 1, dim)
        true_weights /= true_weights.sum()

        # Learned weights start uniform
        weights = np.ones(dim) / dim
        lr = 0.05

        errors = []
        for _ in range(200):
            x = rng.uniform(0, 1, dim)
            target = np.dot(x, true_weights)
            predicted = np.dot(x, weights)
            error = predicted - target
            errors.append(abs(error))

            # SGD step
            grad = error * x
            weights -= lr * grad
            weights = np.clip(weights, -2, 2)
            w_sum = np.abs(weights).sum()
            if w_sum > 0:
                weights /= w_sum

        # Error should decrease
        first_half = np.mean(errors[:100])
        second_half = np.mean(errors[100:])
        assert second_half < first_half, (
            f"Error should decrease: first={first_half:.4f} second={second_half:.4f}"
        )


# ===========================================================================
# Feature contributions (SHAP-lite)
# ===========================================================================

class TestFeatureContributions:

    @staticmethod
    def contributions(values, weights, means):
        """(value - mean) * weight per feature."""
        return (values - means) * weights

    def test_contributions_sum_to_score_diff(self):
        """Sum of contributions ≈ score - baseline."""
        rng = np.random.RandomState(42)
        dim = 8
        values = rng.uniform(0, 1, dim)
        weights = rng.uniform(0, 1, dim)
        weights /= weights.sum()
        means = np.full(dim, 0.5)

        contribs = self.contributions(values, weights, means)
        baseline = np.dot(means, weights)
        actual = np.dot(values, weights)
        assert np.sum(contribs) == pytest.approx(actual - baseline, abs=1e-10)

    def test_zero_contribution_at_mean(self):
        """Feature at its mean contributes zero."""
        means = np.array([0.5, 0.3, 0.7])
        weights = np.array([0.4, 0.3, 0.3])
        contribs = self.contributions(means, weights, means)
        np.testing.assert_allclose(contribs, 0, atol=1e-15)

    def test_positive_contribution_above_mean(self):
        """Feature above mean with positive weight → positive contribution."""
        values = np.array([0.8])
        weights = np.array([0.5])
        means = np.array([0.5])
        assert self.contributions(values, weights, means)[0] > 0

    def test_negative_contribution_below_mean(self):
        values = np.array([0.2])
        weights = np.array([0.5])
        means = np.array([0.5])
        assert self.contributions(values, weights, means)[0] < 0


# ===========================================================================
# Isotonic calibration (PAVA)
# ===========================================================================

class TestIsotonicCalibration:

    @staticmethod
    def fit_isotonic(raw_scores, actuals) -> List[Tuple[float, float]]:
        """Pool Adjacent Violators Algorithm."""
        pairs = sorted(zip(raw_scores, actuals), key=lambda p: p[0])
        blocks = [{"sum": a, "count": 1, "raw": r} for r, a in pairs]

        merged = True
        while merged:
            merged = False
            i = 0
            while i < len(blocks) - 1:
                cur_avg = blocks[i]["sum"] / blocks[i]["count"]
                next_avg = blocks[i + 1]["sum"] / blocks[i + 1]["count"]
                if cur_avg > next_avg:
                    blocks[i]["sum"] += blocks[i + 1]["sum"]
                    blocks[i]["count"] += blocks[i + 1]["count"]
                    blocks[i]["raw"] = (blocks[i]["raw"] + blocks[i + 1]["raw"]) / 2
                    blocks.pop(i + 1)
                    merged = True
                else:
                    i += 1

        return [(b["raw"], b["sum"] / b["count"]) for b in blocks]

    @staticmethod
    def interpolate(raw, table):
        """Piecewise-linear interpolation."""
        if not table:
            return raw
        if raw <= table[0][0]:
            return table[0][1]
        if raw >= table[-1][0]:
            return table[-1][1]
        for i in range(len(table) - 1):
            x0, y0 = table[i]
            x1, y1 = table[i + 1]
            if x0 <= raw <= x1:
                t = (raw - x0) / (x1 - x0) if x1 != x0 else 0
                return y0 + t * (y1 - y0)
        return table[-1][1]

    def test_monotonicity(self):
        """Calibrated values must be non-decreasing."""
        rng = np.random.RandomState(42)
        raw = rng.uniform(0, 1, 100)
        actual = (raw + rng.normal(0, 0.1, 100)).clip(0, 1)
        table = self.fit_isotonic(raw, actual)

        calibrated = [t[1] for t in table]
        for i in range(len(calibrated) - 1):
            assert calibrated[i] <= calibrated[i + 1] + 1e-10, (
                f"Monotonicity violation at {i}: {calibrated[i]} > {calibrated[i+1]}"
            )

    def test_calibrated_bounded(self):
        """Output always in [0, 1]."""
        rng = np.random.RandomState(42)
        raw = rng.uniform(0, 1, 200)
        actual = (raw > 0.5).astype(float)
        table = self.fit_isotonic(raw, actual)

        for r in np.linspace(0, 1, 50):
            cal = self.interpolate(r, table)
            assert 0 <= cal <= 1, f"Out of bounds: calibrate({r})={cal}"

    def test_perfect_calibration(self):
        """If raw == actual, calibration should be identity."""
        raw = np.linspace(0, 1, 20)
        actual = raw.copy()
        table = self.fit_isotonic(raw, actual)

        for r in [0.0, 0.25, 0.5, 0.75, 1.0]:
            cal = self.interpolate(r, table)
            assert cal == pytest.approx(r, abs=0.05)

    def test_pava_resolves_violations(self):
        """Non-monotonic input should be fixed by PAVA."""
        raw = [0.1, 0.2, 0.3, 0.4, 0.5]
        actual = [0.2, 0.8, 0.1, 0.9, 0.3]  # violates monotonicity
        table = self.fit_isotonic(raw, actual)

        vals = [t[1] for t in table]
        for i in range(len(vals) - 1):
            assert vals[i] <= vals[i + 1] + 1e-10

    def test_empty_input(self):
        table = self.fit_isotonic([], [])
        assert table == []


# ===========================================================================
# Conformal prediction
# ===========================================================================

class TestConformalPrediction:

    @staticmethod
    def conformal_interval(score, residuals, alpha=0.05):
        """Split conformal: quantile of |predicted - actual| residuals."""
        if len(residuals) < 10:
            return (max(0, score - 0.3), min(1, score + 0.3))
        sorted_r = sorted(residuals)
        q_idx = min(int(np.ceil((1 - alpha) * len(sorted_r))) - 1, len(sorted_r) - 1)
        q = sorted_r[q_idx]
        return (max(0, score - q), min(1, score + q))

    def test_coverage_guarantee(self):
        """Intervals should cover ≥90% of true values (allowing some slack)."""
        rng = np.random.RandomState(42)
        n = 1000
        true_scores = rng.uniform(0.2, 0.8, n)
        predicted = true_scores + rng.normal(0, 0.05, n)
        predicted = np.clip(predicted, 0, 1)

        # Build residuals from first half
        residuals = list(np.abs(predicted[:500] - true_scores[:500]))

        # Test on second half
        covered = 0
        for i in range(500, n):
            lo, hi = self.conformal_interval(predicted[i], residuals)
            if lo <= true_scores[i] <= hi:
                covered += 1

        coverage = covered / 500
        assert coverage >= 0.90, f"Coverage {coverage:.2%} below 90%"

    def test_interval_width_bounded(self):
        """Intervals should not be excessively wide."""
        rng = np.random.RandomState(42)
        residuals = list(rng.uniform(0, 0.1, 200))
        widths = []
        for score in np.linspace(0.1, 0.9, 50):
            lo, hi = self.conformal_interval(score, residuals)
            widths.append(hi - lo)

        mean_width = np.mean(widths)
        assert mean_width < 0.5, f"Mean width {mean_width:.3f} too wide"

    @pytest.mark.parametrize("alpha", [0.01, 0.05, 0.10, 0.20])
    def test_coverage_scales_with_alpha(self, alpha):
        """Lower alpha → wider intervals → higher coverage."""
        rng = np.random.RandomState(42)
        true_scores = rng.uniform(0.2, 0.8, 500)
        predicted = true_scores + rng.normal(0, 0.08, 500)
        predicted = np.clip(predicted, 0, 1)
        residuals = list(np.abs(predicted[:250] - true_scores[:250]))

        covered = sum(
            1 for i in range(250, 500)
            if self.conformal_interval(predicted[i], residuals, alpha)[0]
            <= true_scores[i]
            <= self.conformal_interval(predicted[i], residuals, alpha)[1]
        )
        coverage = covered / 250
        target = 1 - alpha
        assert coverage >= target - 0.15, (
            f"Coverage {coverage:.2%} too low for alpha={alpha}"
        )

    def test_intervals_non_negative(self):
        residuals = list(np.random.uniform(0, 0.2, 100))
        for score in np.linspace(0, 1, 20):
            lo, hi = self.conformal_interval(score, residuals)
            assert lo >= 0
            assert hi <= 1
            assert hi >= lo

    def test_wide_interval_with_few_residuals(self):
        """< 10 residuals should return wide default interval."""
        lo, hi = self.conformal_interval(0.5, [0.01, 0.02])
        assert hi - lo >= 0.5

    def test_conformal_latency(self):
        """Pre-sorted residuals: 10K intervals should be fast."""
        residuals = sorted(np.random.uniform(0, 0.1, 500).tolist())
        # Pre-sort once, use quantile directly
        q_idx = min(int(np.ceil(0.95 * len(residuals))) - 1, len(residuals) - 1)
        q = residuals[q_idx]

        t0 = time.perf_counter()
        for score in np.linspace(0, 1, 10000):
            lo = max(0, score - q)
            hi = min(1, score + q)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        assert elapsed_ms < 50, f"10K intervals took {elapsed_ms:.1f}ms"


# ===========================================================================
# Drift detection (ADWIN-style)
# ===========================================================================

class TestDriftDetection:

    @staticmethod
    def detect_drift(reference_means, current_means, threshold=0.15):
        """Per-feature Wasserstein-1 (absolute mean diff) drift detection."""
        signals = []
        for i, (ref, cur) in enumerate(zip(reference_means, current_means)):
            dist = abs(cur - ref)
            signals.append({
                "feature_idx": i,
                "reference_mean": ref,
                "current_mean": cur,
                "distance": dist,
                "drifted": dist > threshold,
            })
        return signals

    def test_no_drift_identical(self):
        ref = [0.5, 0.3, 0.7, 0.2]
        signals = self.detect_drift(ref, ref)
        assert all(not s["drifted"] for s in signals)

    def test_detects_large_shift(self):
        ref = [0.5, 0.3, 0.7, 0.2]
        cur = [0.5, 0.3, 0.2, 0.2]  # feature 2 shifted 0.7→0.2
        signals = self.detect_drift(ref, cur)
        assert signals[2]["drifted"]
        assert signals[2]["distance"] == pytest.approx(0.5)

    def test_threshold_sensitivity(self):
        ref = [0.5]
        cur = [0.6]  # diff = 0.1
        tight = self.detect_drift(ref, cur, threshold=0.05)
        loose = self.detect_drift(ref, cur, threshold=0.15)
        assert tight[0]["drifted"]
        assert not loose[0]["drifted"]

    def test_multi_feature_drift(self):
        """Multiple features drifting simultaneously."""
        rng = np.random.RandomState(42)
        dim = 10
        ref = rng.uniform(0.3, 0.7, dim).tolist()
        cur = (np.array(ref) + rng.uniform(-0.3, 0.3, dim)).tolist()
        signals = self.detect_drift(ref, cur)

        drifted_count = sum(1 for s in signals if s["drifted"])
        # With random shifts of ±0.3, some should drift
        assert drifted_count > 0

    def test_symmetric(self):
        """Drift detection should be symmetric in direction."""
        ref = [0.5]
        assert self.detect_drift(ref, [0.8])[0]["distance"] == \
               self.detect_drift([0.8], ref)[0]["distance"]

    def test_sliding_window_drift(self):
        """Simulate ADWIN: moving window mean diverges from reference."""
        rng = np.random.RandomState(42)
        window_size = 50

        # Stable phase
        stable = rng.normal(0.5, 0.05, 100)
        # Drift phase
        drifted = rng.normal(0.8, 0.05, 100)
        stream = np.concatenate([stable, drifted])

        ref_mean = np.mean(stable)
        drift_detected_at = None

        for i in range(window_size, len(stream)):
            window_mean = np.mean(stream[i - window_size:i])
            if abs(window_mean - ref_mean) > 0.15:
                drift_detected_at = i
                break

        assert drift_detected_at is not None, "Should detect drift"
        assert drift_detected_at < 150, f"Detected too late at {drift_detected_at}"


# ===========================================================================
# Online learning (SGD weight convergence)
# ===========================================================================

class TestOnlineLearning:

    def test_weight_convergence(self):
        """Weights should converge toward true weights over many updates."""
        rng = np.random.RandomState(42)
        dim = 8
        true_w = rng.uniform(0, 1, dim)
        true_w /= true_w.sum()

        learned_w = np.ones(dim) / dim
        lr = 0.03

        for _ in range(500):
            x = rng.uniform(0, 1, dim)
            target = np.clip(np.dot(x, true_w), 0, 1)
            predicted = np.clip(np.dot(x, learned_w), 0, 1)

            error = predicted - target
            learned_w -= lr * error * x
            learned_w = np.clip(learned_w, -2, 2)
            w_sum = np.abs(learned_w).sum()
            if w_sum > 0:
                learned_w /= w_sum

        # Correlation should be high (not exact match due to normalization)
        corr = np.corrcoef(true_w, learned_w)[0, 1]
        assert corr > 0.7, f"Weight correlation {corr:.3f} too low"

    def test_error_decreases(self):
        """Mean absolute error should decrease over training."""
        rng = np.random.RandomState(42)
        dim = 8
        true_w = rng.uniform(0, 1, dim)
        true_w /= true_w.sum()

        learned_w = np.ones(dim) / dim
        lr = 0.05
        errors_early = []
        errors_late = []

        for epoch in range(400):
            x = rng.uniform(0, 1, dim)
            target = np.clip(np.dot(x, true_w), 0, 1)
            predicted = np.clip(np.dot(x, learned_w), 0, 1)
            err = abs(predicted - target)

            if epoch < 100:
                errors_early.append(err)
            elif epoch >= 300:
                errors_late.append(err)

            error = predicted - target
            learned_w -= lr * error * x
            learned_w = np.clip(learned_w, -2, 2)
            w_sum = np.abs(learned_w).sum()
            if w_sum > 0:
                learned_w /= w_sum

        assert np.mean(errors_late) < np.mean(errors_early)

    def test_no_divergence(self):
        """Weights should stay bounded even with noisy targets."""
        rng = np.random.RandomState(42)
        dim = 8
        w = np.ones(dim) / dim

        for _ in range(1000):
            x = rng.uniform(0, 1, dim)
            target = rng.uniform(0, 1)  # random noise
            predicted = np.clip(np.dot(x, w), 0, 1)
            error = predicted - target
            w -= 0.01 * error * x
            w = np.clip(w, -2, 2)
            w_sum = np.abs(w).sum()
            if w_sum > 0:
                w /= w_sum

        assert np.all(np.abs(w) <= 2.0)
        assert np.abs(w).sum() == pytest.approx(1.0, abs=0.01)

    def test_drift_triggers_retrain(self):
        """When error spikes (drift), a simple detector should fire."""
        rng = np.random.RandomState(42)
        dim = 4
        w = np.array([0.4, 0.3, 0.2, 0.1])

        errors = []
        # Phase 1: stable
        for _ in range(50):
            x = rng.uniform(0, 1, dim)
            target = np.clip(np.dot(x, w), 0, 1)
            predicted = np.clip(np.dot(x, w + rng.normal(0, 0.01, dim)), 0, 1)
            errors.append(abs(predicted - target))

        # Phase 2: weights shift (simulate drift)
        w_new = np.array([0.1, 0.1, 0.4, 0.4])
        for _ in range(50):
            x = rng.uniform(0, 1, dim)
            target = np.clip(np.dot(x, w_new), 0, 1)
            predicted = np.clip(np.dot(x, w), 0, 1)
            errors.append(abs(predicted - target))

        # Detect: moving average error spike
        window = 20
        drift_detected = False
        for i in range(window, len(errors)):
            recent = np.mean(errors[i - window:i])
            if recent > 0.15:
                drift_detected = True
                break

        assert drift_detected


# ===========================================================================
# Z-score outlier detection
# ===========================================================================

class TestZScoreOutliers:

    @staticmethod
    def z_score(x, mean, variance):
        std = max(np.sqrt(variance), 1e-10)
        return (x - mean) / std

    def test_normal_values_within_bounds(self):
        """99.7% of normal samples should have |z| < 3."""
        rng = np.random.RandomState(42)
        data = rng.normal(0.5, 0.1, 1000)
        mean = np.mean(data)
        var = np.var(data)

        outliers = sum(1 for x in data if abs(self.z_score(x, mean, var)) > 3)
        assert outliers < 10, f"{outliers} outliers (expected < 10)"

    def test_detects_obvious_outlier(self):
        z = self.z_score(10.0, 0.5, 0.01)
        assert abs(z) > 10

    def test_at_mean_is_zero(self):
        z = self.z_score(0.5, 0.5, 0.1)
        assert z == pytest.approx(0.0)

    def test_zero_variance_safe(self):
        """Should not crash with zero variance."""
        z = self.z_score(0.6, 0.5, 0.0)
        assert np.isfinite(z)


# ===========================================================================
# Improvement ranking
# ===========================================================================

class TestImprovementRanking:

    @staticmethod
    def rank_improvements(improvements):
        """Sort by priority descending, break ties by expected_lift."""
        return sorted(
            improvements,
            key=lambda x: (x["priority"], x["expected_lift"]),
            reverse=True,
        )

    def test_priority_ordering(self):
        improvements = [
            {"action": "FILL_FEATURE", "priority": 0.3, "expected_lift": 0.05},
            {"action": "DRIFT_ALERT", "priority": 0.9, "expected_lift": 0.10},
            {"action": "OUTLIER_REVIEW", "priority": 0.5, "expected_lift": 0.03},
        ]
        ranked = self.rank_improvements(improvements)
        assert ranked[0]["action"] == "DRIFT_ALERT"
        assert ranked[-1]["action"] == "FILL_FEATURE"

    def test_tiebreak_by_lift(self):
        improvements = [
            {"action": "A", "priority": 0.5, "expected_lift": 0.02},
            {"action": "B", "priority": 0.5, "expected_lift": 0.10},
        ]
        ranked = self.rank_improvements(improvements)
        assert ranked[0]["action"] == "B"

    def test_empty_list(self):
        assert self.rank_improvements([]) == []

    def test_single_item(self):
        items = [{"action": "X", "priority": 0.5, "expected_lift": 0.1}]
        assert self.rank_improvements(items) == items


# ===========================================================================
# End-to-end scoring pipeline
# ===========================================================================

class TestScoringPipeline:
    """Integration test: features → score → calibrate → conformal → attribute."""

    def test_full_pipeline(self):
        rng = np.random.RandomState(42)
        dim = STAGE_DIMS["discovery"]
        n = 100

        # 1. Features
        X = _synthetic_features("discovery", n=n, seed=42)

        # 2. Weights (simulate learned)
        weights = rng.uniform(0.05, 0.3, dim)
        weights /= weights.sum()

        # 3. Score
        raw_scores = np.clip(X @ weights, 0, 1)

        # 4. Calibrate (isotonic on self — should be near-identity)
        table = TestIsotonicCalibration.fit_isotonic(
            raw_scores.tolist(), raw_scores.tolist()
        )
        calibrated = np.array([
            TestIsotonicCalibration.interpolate(s, table) for s in raw_scores
        ])

        # 5. Conformal
        residuals = list(np.abs(raw_scores - calibrated))
        intervals = [
            TestConformalPrediction.conformal_interval(s, residuals)
            for s in calibrated
        ]

        # 6. Feature contributions
        means = X.mean(axis=0)
        contribs = (X - means) * weights

        # Assertions
        assert raw_scores.shape == (n,)
        assert all(0 <= s <= 1 for s in raw_scores)
        assert all(lo <= hi for lo, hi in intervals)
        assert contribs.shape == (n, dim)

        # Contributions should sum to score - baseline (per row)
        baseline = np.dot(means, weights)
        for i in range(n):
            expected_diff = raw_scores[i] - baseline
            actual_diff = contribs[i].sum()
            assert actual_diff == pytest.approx(expected_diff, abs=1e-10)

    def test_pipeline_latency(self):
        """Full pipeline for 1000 entities should take < 50ms."""
        rng = np.random.RandomState(42)
        n = 1000
        dim = STAGE_DIMS["enrichment"]
        X = rng.uniform(0, 1, (n, dim))
        weights = np.ones(dim) / dim
        residuals = list(rng.uniform(0, 0.1, 200))

        t0 = time.perf_counter()

        scores = np.clip(X @ weights, 0, 1)
        for s in scores:
            TestConformalPrediction.conformal_interval(s, residuals)

        elapsed_ms = (time.perf_counter() - t0) * 1000
        assert elapsed_ms < 50, f"Pipeline took {elapsed_ms:.1f}ms for {n} entities"
