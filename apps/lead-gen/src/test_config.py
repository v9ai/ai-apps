"""Tests for the TOML config system and validation."""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest

from config import (
    ScrapusConfig,
    GeneralConfig,
    CrawlerConfig,
    NERConfig,
    ScoringConfig,
    ReportConfig,
    MemoryConfig,
    ConfigValidationError,
    _validate,
    _deep_merge,
    _coerce_value,
    _populate_dataclass,
    load_config,
)


# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------

class TestDefaults:

    def test_default_config_creates(self):
        cfg = ScrapusConfig()
        assert cfg.crawler.max_pages == 10_000
        assert cfg.report.llm_backend == "ollama"
        assert cfg.memory.budget_gb == 12.5

    def test_data_dir_property(self):
        cfg = ScrapusConfig()
        assert cfg.data_dir == Path("./scrapus_data")

    def test_sqlite_path(self):
        cfg = ScrapusConfig()
        assert cfg.sqlite_path == Path("./scrapus_data/scrapus.db")

    def test_to_dict_round_trip(self):
        cfg = ScrapusConfig()
        d = cfg.to_dict()
        assert d["crawler"]["max_pages"] == 10_000
        assert d["report"]["llm_backend"] == "ollama"
        assert isinstance(d["ner"]["entity_types"], list)


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

class TestValidation:

    def test_valid_defaults_pass(self):
        cfg = ScrapusConfig()
        warns = _validate(cfg)
        # May have warnings (stage budget vs total) but should not raise
        assert isinstance(warns, list)

    def test_invalid_log_level_raises(self):
        cfg = ScrapusConfig(general=GeneralConfig(log_level="VERBOSE"))
        with pytest.raises(ConfigValidationError, match="log_level"):
            _validate(cfg)

    def test_invalid_ner_backend_raises(self):
        cfg = ScrapusConfig(ner=NERConfig(model_backend="gpt4"))
        with pytest.raises(ConfigValidationError, match="model_backend"):
            _validate(cfg)

    def test_invalid_llm_backend_raises(self):
        cfg = ScrapusConfig(report=ReportConfig(llm_backend="deepseek"))
        with pytest.raises(ConfigValidationError, match="llm_backend"):
            _validate(cfg)

    def test_invalid_scoring_model_type_raises(self):
        cfg = ScrapusConfig(scoring=ScoringConfig(model_type="catboost"))
        with pytest.raises(ConfigValidationError, match="model_type"):
            _validate(cfg)

    def test_memory_over_physical_raises(self):
        cfg = ScrapusConfig(memory=MemoryConfig(budget_gb=20.0))
        with pytest.raises(ConfigValidationError, match="exceeds physical"):
            _validate(cfg)

    def test_conformal_out_of_range_raises(self):
        cfg = ScrapusConfig(scoring=ScoringConfig(conformal_coverage=1.5))
        with pytest.raises(ConfigValidationError):
            _validate(cfg)

    def test_zero_max_pages_raises(self):
        cfg = ScrapusConfig(crawler=CrawlerConfig(max_pages=0))
        with pytest.raises(ConfigValidationError, match="max_pages"):
            _validate(cfg)

    def test_zero_max_workers_raises(self):
        cfg = ScrapusConfig(general=GeneralConfig(max_workers=0))
        with pytest.raises(ConfigValidationError, match="max_workers"):
            _validate(cfg)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class TestDeepMerge:

    def test_simple_merge(self):
        base = {"a": 1, "b": {"c": 2}}
        override = {"b": {"c": 3, "d": 4}}
        result = _deep_merge(base, override)
        assert result == {"a": 1, "b": {"c": 3, "d": 4}}

    def test_base_not_mutated(self):
        base = {"x": {"y": 1}}
        _deep_merge(base, {"x": {"y": 99}})
        assert base["x"]["y"] == 1

    def test_new_keys_added(self):
        result = _deep_merge({"a": 1}, {"b": 2})
        assert result == {"a": 1, "b": 2}


class TestCoerceValue:

    def test_bool_true(self):
        assert _coerce_value("true", bool) is True
        assert _coerce_value("1", bool) is True
        assert _coerce_value("yes", bool) is True

    def test_bool_false(self):
        assert _coerce_value("false", bool) is False
        assert _coerce_value("0", bool) is False

    def test_int(self):
        assert _coerce_value("42", int) == 42

    def test_float(self):
        assert _coerce_value("3.14", float) == pytest.approx(3.14)

    def test_str_passthrough(self):
        assert _coerce_value("hello", str) == "hello"


class TestPopulateDataclass:

    def test_known_fields_only(self):
        data = {"max_pages": 5000, "unknown_field": "ignored"}
        result = _populate_dataclass(CrawlerConfig, data)
        assert result.max_pages == 5000

    def test_defaults_used_for_missing(self):
        result = _populate_dataclass(CrawlerConfig, {})
        assert result.max_pages == 10_000  # default


# ---------------------------------------------------------------------------
# to_pipeline_config bridge
# ---------------------------------------------------------------------------

class TestPipelineConfigBridge:

    def test_bridge_creates_pipeline_config(self):
        cfg = ScrapusConfig(
            crawler=CrawlerConfig(seed_urls=["https://example.com"], max_pages=500),
            scoring=ScoringConfig(qualification_threshold=0.7),
            memory=MemoryConfig(budget_gb=10.0),
        )
        try:
            pc = cfg.to_pipeline_config()
            assert pc.seed_urls == ["https://example.com"]
            assert pc.max_pages == 500
            assert pc.score_threshold == 0.7
            assert pc.rss_abort_threshold_gb == 10.0
        except ImportError:
            pytest.skip("pipeline_orchestrator not importable")

    def test_bridge_llm_backend_ollama(self):
        cfg = ScrapusConfig(report=ReportConfig(llm_backend="ollama", llm_model="llama3.1"))
        try:
            pc = cfg.to_pipeline_config()
            assert pc.llm_backend == "ollama"
            assert pc.ollama_model == "llama3.1"
        except ImportError:
            pytest.skip("pipeline_orchestrator not importable")


# ---------------------------------------------------------------------------
# TOML loading
# ---------------------------------------------------------------------------

class TestLoadConfig:

    def test_load_nonexistent_toml_raises(self):
        """Explicit nonexistent path should raise FileNotFoundError."""
        with pytest.raises(FileNotFoundError):
            load_config(Path("/nonexistent/path.toml"))

    def test_load_none_path_uses_defaults(self, tmp_path, monkeypatch):
        """When path is None and no scrapus.toml discovered, use defaults."""
        monkeypatch.chdir(tmp_path)  # no scrapus.toml here
        cfg = load_config()
        assert cfg.crawler.max_pages == 10_000

    def test_load_valid_toml(self, tmp_path):
        toml_file = tmp_path / "test.toml"
        toml_file.write_text("""\
[crawler]
max_pages = 999
seed_urls = ["https://a.com"]

[report]
llm_backend = "mlx"
""")
        cfg = load_config(toml_file)
        assert cfg.crawler.max_pages == 999
        assert cfg.crawler.seed_urls == ["https://a.com"]
        assert cfg.report.llm_backend == "mlx"
