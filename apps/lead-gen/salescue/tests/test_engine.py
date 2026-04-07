"""Tests for salescue.engine — Engine batch processing."""

import pytest

from salescue.engine import Engine, list_modules, _ensure_registry, MODULE_REGISTRY


class TestRegistry:
    def test_ensure_registry_populates(self):
        _ensure_registry()
        assert len(MODULE_REGISTRY) == 12

    def test_list_modules(self):
        modules = list_modules()
        assert "score" in modules
        assert "spam" in modules
        assert "intent" in modules
        assert len(modules) == 12


class TestEngine:
    def test_init_with_specific_modules(self):
        engine = Engine(modules=["spam"])
        assert engine.module_names == ["spam"]
        assert not engine._loaded

    def test_init_all_modules(self):
        engine = Engine()
        assert len(engine.module_names) == 12

    def test_preload_returns_self(self):
        engine = Engine(modules=["spam"])
        result = engine.preload()
        assert result is engine
        assert engine._loaded

    def test_unknown_module_raises_on_preload(self):
        engine = Engine(modules=["nonexistent"])
        with pytest.raises(ValueError, match="Unknown module"):
            engine.preload()

    def test_run_single(self, encoder_loaded):
        engine = Engine(modules=["spam"]).preload()
        result = engine.run("test email")
        assert "results" in result
        assert "timings" in result
        assert "errors" in result
        assert "spam" in result["results"]
        assert result["total_time"] > 0

    def test_run_auto_preloads(self, encoder_loaded):
        engine = Engine(modules=["spam"])
        result = engine.run("test email")
        assert engine._loaded
        assert "spam" in result["results"]

    def test_run_batch(self, encoder_loaded):
        engine = Engine(modules=["spam"]).preload()
        results = engine.run_batch(["email 1", "email 2"])
        assert len(results) == 2
        assert "spam" in results[0]["results"]

    def test_unload(self):
        engine = Engine(modules=["spam"]).preload()
        assert engine._loaded
        engine.unload()
        assert not engine._loaded
        assert len(engine._modules) == 0

    def test_repr(self):
        engine = Engine(modules=["spam", "score"])
        r = repr(engine)
        assert "Engine" in r
        assert "not loaded" in r

    def test_repr_loaded(self):
        engine = Engine(modules=["spam"]).preload()
        r = repr(engine)
        assert "loaded" in r
