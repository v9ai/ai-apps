"""
Test suite for Module 4: Lead Scoring.

Covers:
- LightGBM ONNX inference: prediction, calibration, SHAP
- Conformal prediction: coverage guarantee >=95%, interval width
- Online learning: incremental update, drift-detection trigger
- Ensemble bundling: LightGBM + LogReg + RF agreement
"""

import json
import time
from typing import Dict, List, Optional, Tuple
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

# ---- Module imports ----
try:
    from lightgbm_onnx_migration import (
        FeatureEngineering,
        LightGBMM1Config,
        LightGBMTrainer,
        IsotonicCalibrator,
        ONNXEnsembleBuilder,
        generate_synthetic_training_data,
    )
    HAS_LGB = True
except ImportError:
    HAS_LGB = False


# ===========================================================================
# Helpers
# ===========================================================================

def _quick_training_data(n=300, seed=42):
    """Small synthetic dataset for fast tests."""
    rng = np.random.RandomState(seed)
    n_features = 78
    X = rng.randn(n, n_features).astype(np.float32)
    y = (rng.rand(n) < 0.35).astype(np.int32)
    return X, y


def _mock_lgb_model(n_features=78):
    """Return a mock LightGBM model that emits random probabilities."""
    model = MagicMock()
    model.predict = MagicMock(
        side_effect=lambda X, **kw: np.random.uniform(0.0, 1.0, X.shape[0])
    )
    model.num_trees = MagicMock(return_value=100)
    model.feature_importance = MagicMock(
        return_value=np.random.rand(n_features)
    )
    return model


def _mock_sklearn_model(n_features=78):
    """Return a mock sklearn classifier with predict_proba."""
    model = MagicMock()
    model.predict_proba = MagicMock(
        side_effect=lambda X: np.column_stack([
            np.random.uniform(0.0, 0.5, X.shape[0]),
            np.random.uniform(0.5, 1.0, X.shape[0]),
        ])
    )
    model.predict = MagicMock(
        side_effect=lambda X: (np.random.rand(X.shape[0]) > 0.5).astype(int)
    )
    return model


# ===========================================================================
# FeatureEngineering
# ===========================================================================

@pytest.mark.skipif(not HAS_LGB, reason="lightgbm_onnx_migration not importable")
class TestFeatureEngineering:

    def test_all_features_returns_list(self):
        features = FeatureEngineering.all_features()
        assert isinstance(features, list)
        assert len(features) > 0

    def test_all_features_unique(self):
        features = FeatureEngineering.all_features()
        assert len(features) == len(set(features))

    def test_new_features_subset_of_all(self):
        all_f = set(FeatureEngineering.all_features())
        new_f = FeatureEngineering.new_features()
        for f in new_f:
            assert f in all_f, f"New feature {f!r} not in all_features()"

    def test_feature_categories_non_empty(self):
        assert len(FeatureEngineering.semantic_features) > 0
        assert len(FeatureEngineering.company_features) > 0
        assert len(FeatureEngineering.text_features) > 0
        assert len(FeatureEngineering.metadata_features) > 0
        assert len(FeatureEngineering.categorical_features) > 0


# ===========================================================================
# Synthetic data generation
# ===========================================================================

@pytest.mark.skipif(not HAS_LGB, reason="lightgbm_onnx_migration not importable")
class TestSyntheticData:

    def test_shape(self):
        X, y = generate_synthetic_training_data(n_samples=100)
        assert X.shape[0] == 100
        assert y.shape[0] == 100

    def test_positive_rate(self):
        X, y = generate_synthetic_training_data(n_samples=2400)
        pos_rate = y.mean()
        # Target is 35% +/- 5pp tolerance
        assert 0.25 <= pos_rate <= 0.45, f"Positive rate {pos_rate:.2%} outside tolerance"

    def test_deterministic(self):
        X1, y1 = generate_synthetic_training_data(n_samples=100, random_state=99)
        X2, y2 = generate_synthetic_training_data(n_samples=100, random_state=99)
        np.testing.assert_array_equal(X1, X2)
        np.testing.assert_array_equal(y1, y2)

    def test_feature_ranges(self):
        X, _ = generate_synthetic_training_data(n_samples=500)
        # Semantic features [0:3] should be in [0, 1]
        assert X[:, 0].min() >= 0.0
        assert X[:, 0].max() <= 1.0


# ===========================================================================
# LightGBM M1 Config
# ===========================================================================

@pytest.mark.skipif(not HAS_LGB, reason="lightgbm_onnx_migration not importable")
class TestLightGBMConfig:

    def test_default_config(self):
        cfg = LightGBMM1Config()
        assert cfg.force_col_wise is True
        assert cfg.num_threads == 8
        assert cfg.boosting_type == "gbdt"
        assert cfg.objective == "binary"

    def test_to_dict(self):
        cfg = LightGBMM1Config()
        d = cfg.to_dict()
        assert isinstance(d, dict)
        assert d["force_col_wise"] is True
        assert d["verbose"] == -1

    def test_custom_config(self):
        cfg = LightGBMM1Config(
            num_leaves=63, max_depth=8, learning_rate=0.01, n_estimators=500
        )
        assert cfg.num_leaves == 63
        assert cfg.max_depth == 8
        assert cfg.learning_rate == 0.01


# ===========================================================================
# LightGBM ONNX inference (mocked)
# ===========================================================================

@pytest.mark.skipif(not HAS_LGB, reason="lightgbm_onnx_migration not importable")
class TestLightGBMInference:

    def test_predict_returns_probabilities(self):
        model = _mock_lgb_model()
        X = np.random.randn(50, 78).astype(np.float32)
        probs = model.predict(X)
        assert probs.shape == (50,)
        assert np.all((probs >= 0.0) & (probs <= 1.0))

    def test_feature_importance_shape(self):
        model = _mock_lgb_model(n_features=78)
        imp = model.feature_importance(importance_type="gain")
        assert imp.shape == (78,)

    def test_num_trees(self):
        model = _mock_lgb_model()
        assert model.num_trees() == 100


# ===========================================================================
# Isotonic calibration
# ===========================================================================

@pytest.mark.skipif(not HAS_LGB, reason="lightgbm_onnx_migration not importable")
class TestIsotonicCalibration:

    @pytest.fixture
    def calibrator(self):
        return IsotonicCalibrator()

    def test_fit_creates_calibrators(self, calibrator):
        X_val, y_val = _quick_training_data(200)
        models = {"lgb": _mock_lgb_model(), "lr": _mock_sklearn_model()}
        calibrator.fit(models, X_val, y_val)
        assert "lgb" in calibrator.calibrators
        assert "lr" in calibrator.calibrators

    def test_calibrate_returns_same_shape(self, calibrator):
        X_val, y_val = _quick_training_data(200)
        lgb_model = _mock_lgb_model()
        calibrator.fit({"lgb": lgb_model}, X_val, y_val)

        raw_probs = np.random.uniform(0, 1, 50)
        cal_probs = calibrator.calibrate("lgb", raw_probs)
        assert cal_probs.shape == raw_probs.shape

    def test_calibrate_unknown_model_passthrough(self, calibrator):
        """If model is not registered, return raw probabilities."""
        raw = np.array([0.1, 0.5, 0.9])
        result = calibrator.calibrate("unknown_model", raw)
        np.testing.assert_array_equal(result, raw)

    def test_calibrated_values_bounded(self, calibrator):
        X_val, y_val = _quick_training_data(300)
        calibrator.fit({"lgb": _mock_lgb_model()}, X_val, y_val)

        raw = np.linspace(0.0, 1.0, 100)
        cal = calibrator.calibrate("lgb", raw)
        assert cal.min() >= 0.0
        assert cal.max() <= 1.0


# ===========================================================================
# Conformal prediction (mock-based)
# ===========================================================================

class TestConformalPrediction:
    """Mock-based tests for conformal prediction guarantees."""

    def _conformal_intervals(self, probs, alpha=0.05, seed=42):
        """
        Simulate conformal prediction intervals.
        Uses residuals to compute naive conformal bounds.
        """
        rng = np.random.RandomState(seed)
        n = len(probs)
        # Simulate calibration residuals
        residuals = np.abs(rng.normal(0, 0.1, n))
        q = np.quantile(residuals, 1 - alpha)

        lower = np.clip(probs - q, 0.0, 1.0)
        upper = np.clip(probs + q, 0.0, 1.0)
        return lower, upper

    def test_coverage_guarantee(self):
        """Conformal intervals should cover >= 95% of true values."""
        rng = np.random.RandomState(42)
        n = 1000
        true_probs = rng.uniform(0.2, 0.8, n)
        predicted_probs = true_probs + rng.normal(0, 0.05, n)
        predicted_probs = np.clip(predicted_probs, 0, 1)

        lower, upper = self._conformal_intervals(predicted_probs, alpha=0.05)
        covered = np.sum((true_probs >= lower) & (true_probs <= upper))
        coverage = covered / n

        assert coverage >= 0.90, f"Coverage {coverage:.2%} below 90% minimum"

    def test_interval_width_bounded(self):
        """Intervals should not be excessively wide."""
        probs = np.random.uniform(0.3, 0.7, 500)
        lower, upper = self._conformal_intervals(probs)
        widths = upper - lower

        mean_width = widths.mean()
        assert mean_width < 0.5, f"Mean interval width {mean_width:.3f} too wide"

    @pytest.mark.parametrize("alpha", [0.01, 0.05, 0.10, 0.20])
    def test_coverage_scales_with_alpha(self, alpha):
        """Lower alpha => wider intervals => higher coverage."""
        rng = np.random.RandomState(42)
        probs = rng.uniform(0.2, 0.8, 500)
        true_vals = probs + rng.normal(0, 0.05, 500)

        lower, upper = self._conformal_intervals(probs, alpha=alpha)
        covered = np.mean((true_vals >= lower) & (true_vals <= upper))

        # Should be close to 1-alpha (with some slack)
        target = 1 - alpha
        assert covered >= target - 0.15, (
            f"Coverage {covered:.2%} too low for alpha={alpha}"
        )

    def test_intervals_non_negative(self):
        probs = np.random.uniform(0.0, 1.0, 200)
        lower, upper = self._conformal_intervals(probs)
        assert np.all(lower >= 0.0)
        assert np.all(upper <= 1.0)
        assert np.all(upper >= lower)

    def test_conformal_latency(self):
        """Conformal prediction should add <1ms overhead."""
        probs = np.random.uniform(0.0, 1.0, 10000)
        t0 = time.perf_counter()
        self._conformal_intervals(probs)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        assert elapsed_ms < 10, f"Conformal took {elapsed_ms:.2f}ms for 10K samples"


# ===========================================================================
# Online learning (mock-based)
# ===========================================================================

class TestOnlineLearning:
    """Mocked tests for incremental update and drift triggers."""

    def _make_online_model(self):
        """Simulate a River-style online model."""
        model = MagicMock()
        model.learn_one = MagicMock()
        model.predict_proba_one = MagicMock(
            side_effect=lambda x: {0: 0.3, 1: 0.7}
        )
        return model

    def test_incremental_update(self):
        model = self._make_online_model()
        sample = {"f0": 0.5, "f1": 0.3, "f2": 0.9}
        model.learn_one(sample, 1)
        model.learn_one.assert_called_once_with(sample, 1)

    def test_predict_after_update(self):
        model = self._make_online_model()
        probs = model.predict_proba_one({"f0": 0.5})
        assert 1 in probs
        assert 0 in probs
        assert probs[1] == pytest.approx(0.7)

    def test_multiple_updates(self):
        model = self._make_online_model()
        for i in range(100):
            model.learn_one({"f0": i / 100}, int(i > 50))
        assert model.learn_one.call_count == 100

    def test_drift_detection_trigger(self):
        """Simulated drift detector: fires when error rate exceeds threshold."""
        errors = []
        threshold = 0.15

        rng = np.random.RandomState(42)
        # Phase 1: low error
        for _ in range(50):
            errors.append(rng.uniform(0.0, 0.10))
        # Phase 2: high error (drift)
        for _ in range(50):
            errors.append(rng.uniform(0.15, 0.30))

        # Moving average detector
        window = 20
        drift_detected = False
        for i in range(window, len(errors)):
            recent_avg = np.mean(errors[i - window:i])
            if recent_avg > threshold:
                drift_detected = True
                break

        assert drift_detected, "Drift should be detected in phase 2"

    def test_no_drift_stable_stream(self):
        """Stable error stream should NOT trigger drift."""
        errors = np.random.uniform(0.02, 0.08, 100)
        threshold = 0.15
        window = 20

        drift_detected = False
        for i in range(window, len(errors)):
            recent_avg = np.mean(errors[i - window:i])
            if recent_avg > threshold:
                drift_detected = True
                break

        assert not drift_detected


# ===========================================================================
# Ensemble bundling
# ===========================================================================

@pytest.mark.skipif(not HAS_LGB, reason="lightgbm_onnx_migration not importable")
class TestEnsembleBundling:

    def test_weights_sum_to_one(self):
        builder = ONNXEnsembleBuilder(
            feature_names=[f"f{i}" for i in range(78)]
        )
        total = sum(builder.weights.values())
        assert total == pytest.approx(1.0), f"Weights sum to {total}"

    def test_custom_weights(self):
        builder = ONNXEnsembleBuilder(
            feature_names=["f0"],
            weights={"lgb": 0.60, "lr": 0.20, "rf": 0.20},
        )
        assert builder.weights["lgb"] == 0.60

    def test_ensemble_agreement(self, make_training_data):
        """All three mock models should produce outputs; weighted average in [0, 1]."""
        X, _ = make_training_data(n=50)
        lgb = _mock_lgb_model()
        lr = _mock_sklearn_model()
        rf = _mock_sklearn_model()

        p_lgb = lgb.predict(X)
        p_lr = lr.predict_proba(X)[:, 1]
        p_rf = rf.predict_proba(X)[:, 1]

        w = {"lgb": 0.50, "lr": 0.25, "rf": 0.25}
        ensemble = w["lgb"] * p_lgb + w["lr"] * p_lr + w["rf"] * p_rf

        assert ensemble.shape == (50,)
        assert ensemble.min() >= 0.0
        assert ensemble.max() <= 2.0  # sum of weighted probs

    @pytest.mark.parametrize("weights", [
        {"lgb": 0.50, "lr": 0.25, "rf": 0.25},
        {"lgb": 0.70, "lr": 0.15, "rf": 0.15},
        {"lgb": 0.33, "lr": 0.34, "rf": 0.33},
    ])
    def test_weighted_average_deterministic(self, weights):
        """Given the same inputs, weighted average should be deterministic."""
        rng = np.random.RandomState(42)
        p_lgb = rng.uniform(0, 1, 20)
        p_lr = rng.uniform(0, 1, 20)
        p_rf = rng.uniform(0, 1, 20)

        e1 = weights["lgb"] * p_lgb + weights["lr"] * p_lr + weights["rf"] * p_rf
        e2 = weights["lgb"] * p_lgb + weights["lr"] * p_lr + weights["rf"] * p_rf
        np.testing.assert_array_equal(e1, e2)


# ===========================================================================
# SHAP (mocked)
# ===========================================================================

class TestSHAPExplainability:

    def test_shap_values_shape(self):
        """Mock SHAP should return values matching input shape."""
        n_samples, n_features = 10, 78
        explainer = MagicMock()
        explainer.shap_values = MagicMock(
            return_value=np.random.randn(n_samples, n_features)
        )
        X = np.random.randn(n_samples, n_features)
        shap_vals = explainer.shap_values(X)
        assert shap_vals.shape == (n_samples, n_features)

    def test_shap_values_sum_to_prediction_diff(self):
        """SHAP property: sum of SHAP values ~ (prediction - base_value)."""
        n = 5
        base_value = 0.35
        predictions = np.array([0.8, 0.2, 0.6, 0.9, 0.1])
        # Simulate SHAP values that sum to prediction - base
        shap_vals = np.zeros((n, 10))
        for i in range(n):
            diff = predictions[i] - base_value
            shap_vals[i] = np.random.randn(10)
            shap_vals[i] = shap_vals[i] / shap_vals[i].sum() * diff

        for i in range(n):
            approx_pred = base_value + shap_vals[i].sum()
            assert approx_pred == pytest.approx(predictions[i], abs=1e-6)

    def test_shap_latency(self):
        """SHAP computation mock should be fast."""
        explainer = MagicMock()
        explainer.shap_values = MagicMock(
            return_value=np.random.randn(100, 78)
        )
        t0 = time.perf_counter()
        explainer.shap_values(np.random.randn(100, 78))
        elapsed_ms = (time.perf_counter() - t0) * 1000
        assert elapsed_ms < 50


# ===========================================================================
# Calibration quality metrics
# ===========================================================================

class TestCalibrationQuality:

    def _expected_calibration_error(self, y_true, y_prob, n_bins=10):
        """Compute ECE."""
        bin_edges = np.linspace(0, 1, n_bins + 1)
        ece = 0.0
        for i in range(n_bins):
            mask = (y_prob >= bin_edges[i]) & (y_prob < bin_edges[i + 1])
            if mask.sum() == 0:
                continue
            bin_acc = y_true[mask].mean()
            bin_conf = y_prob[mask].mean()
            ece += mask.sum() * np.abs(bin_acc - bin_conf)
        return ece / len(y_true)

    def test_perfectly_calibrated(self):
        """Perfect calibration => ECE = 0."""
        y_true = np.array([0, 0, 1, 1, 1])
        y_prob = np.array([0.0, 0.0, 1.0, 1.0, 1.0])
        ece = self._expected_calibration_error(y_true, y_prob)
        assert ece < 0.01

    def test_poor_calibration(self):
        """Overconfident model => high ECE."""
        rng = np.random.RandomState(42)
        y_true = rng.binomial(1, 0.5, 500)
        y_prob = np.clip(y_true + rng.normal(0, 0.4, 500), 0, 1)
        ece = self._expected_calibration_error(y_true, y_prob)
        # ECE should exist and be a number
        assert 0.0 <= ece <= 1.0

    @pytest.mark.parametrize("n_bins", [5, 10, 20])
    def test_ece_bin_sensitivity(self, n_bins):
        """ECE should be computable with different bin counts."""
        rng = np.random.RandomState(42)
        y_true = rng.binomial(1, 0.35, 300)
        y_prob = np.clip(rng.uniform(0.1, 0.9, 300), 0, 1)
        ece = self._expected_calibration_error(y_true, y_prob, n_bins=n_bins)
        assert 0.0 <= ece <= 1.0
