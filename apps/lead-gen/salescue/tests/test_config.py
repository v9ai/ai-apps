"""Tests for salescue.config — configuration system."""

import json
import os
import tempfile

from salescue.config import (
    ClosingTimeConfig,
    ALL_CONFIGS,
    HF_ORG,
    BACKBONE_MODEL,
    SCORE_CONFIG,
    SPAM_CONFIG,
    REPLY_CONFIG,
    INTENT_CONFIG,
)


class TestClosingTimeConfig:
    def test_default_values(self):
        cfg = ClosingTimeConfig()
        assert cfg.model_type == "salescue"
        assert cfg.hidden_size == 768
        assert cfg.module_name == ""

    def test_auto_label_mappings(self):
        cfg = ClosingTimeConfig(module_name="test", labels=["a", "b", "c"])
        assert cfg.id2label == {0: "a", 1: "b", 2: "c"}
        assert cfg.label2id == {"a": 0, "b": 1, "c": 2}

    def test_auto_model_id(self):
        cfg = ClosingTimeConfig(module_name="score", version="1")
        assert cfg.model_id == f"{HF_ORG}/salescue-score-v1"

    def test_to_dict(self):
        cfg = SCORE_CONFIG
        d = cfg.to_dict()
        assert d["model_type"] == "salescue"
        assert d["module_name"] == "score"
        assert d["labels"] == ["hot", "warm", "cold", "disqualified"]
        assert d["architectures"] == ["LeadScorer"]

    def test_save_and_load_pretrained(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            SPAM_CONFIG.save_pretrained(tmpdir)
            config_path = os.path.join(tmpdir, "config.json")
            assert os.path.exists(config_path)

            with open(config_path) as f:
                data = json.load(f)
            assert data["module_name"] == "spam"

            loaded = ClosingTimeConfig.from_pretrained(tmpdir)
            assert loaded.module_name == "spam"
            assert loaded.labels == ["spam", "not_spam"]

    def test_save_load_roundtrip_preserves_fields(self):
        original = ClosingTimeConfig(
            module_name="custom",
            labels=["x", "y"],
            version="3",
            hidden_size=1024,
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            original.save_pretrained(tmpdir)
            loaded = ClosingTimeConfig.from_pretrained(tmpdir)
            assert loaded.module_name == "custom"
            assert loaded.labels == ["x", "y"]
            assert loaded.version == "3"
            assert loaded.hidden_size == 1024


class TestAllConfigs:
    def test_all_expected_modules_present(self):
        expected = {
            "score", "intent", "reply", "triggers", "icp",
            "objection", "sentiment", "spam", "entities",
            "call", "subject", "emailgen",
        }
        assert set(ALL_CONFIGS.keys()) == expected

    def test_all_configs_have_module_name(self):
        for name, cfg in ALL_CONFIGS.items():
            assert cfg.module_name == name, f"{name} config has wrong module_name"

    def test_all_configs_have_architectures(self):
        for name, cfg in ALL_CONFIGS.items():
            assert len(cfg.architectures) >= 1, f"{name} config missing architectures"

    def test_all_configs_have_model_id(self):
        for name, cfg in ALL_CONFIGS.items():
            assert cfg.model_id, f"{name} config missing model_id"
            assert cfg.model_id.startswith(HF_ORG + "/")

    def test_score_config_labels(self):
        assert SCORE_CONFIG.labels == ["hot", "warm", "cold", "disqualified"]

    def test_reply_config_labels(self):
        assert len(REPLY_CONFIG.labels) == 10
        assert "genuinely_interested" in REPLY_CONFIG.labels
        assert "unsubscribe" in REPLY_CONFIG.labels

    def test_intent_config_stages(self):
        assert INTENT_CONFIG.labels == [
            "unaware", "aware", "researching", "evaluating", "committed", "purchasing"
        ]


class TestBackboneAlignment:
    def test_backbone_model_matches_deberta(self):
        assert BACKBONE_MODEL == "microsoft/deberta-v3-base"

    def test_all_configs_use_correct_backbone(self):
        for name, cfg in ALL_CONFIGS.items():
            if name == "emailgen":
                assert "mistral" in cfg.backbone.lower()
            else:
                assert cfg.backbone == BACKBONE_MODEL, f"{name} has wrong backbone"
