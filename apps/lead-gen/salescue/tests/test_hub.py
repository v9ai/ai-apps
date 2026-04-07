"""Tests for salescue.hub — HF Hub integration."""

import json
import os
import tempfile

import torch

from salescue.hub import ClosingTimeModel
from salescue.config import SPAM_CONFIG, SCORE_CONFIG, ALL_CONFIGS, HF_ORG
from salescue.modules.spam import SpamHead
from salescue.modules.score import LeadScorer


class TestSavePretrained:
    def test_creates_expected_files(self):
        module = SpamHead(hidden=768)
        model = ClosingTimeModel(module, SPAM_CONFIG)
        with tempfile.TemporaryDirectory() as tmpdir:
            model.save_pretrained(tmpdir)
            assert os.path.exists(os.path.join(tmpdir, "config.json"))
            assert os.path.exists(os.path.join(tmpdir, "head.pt"))
            assert os.path.exists(os.path.join(tmpdir, "README.md"))

    def test_config_json_valid(self):
        module = SpamHead(hidden=768)
        model = ClosingTimeModel(module, SPAM_CONFIG)
        with tempfile.TemporaryDirectory() as tmpdir:
            model.save_pretrained(tmpdir)
            with open(os.path.join(tmpdir, "config.json")) as f:
                data = json.load(f)
            assert data["module_name"] == "spam"
            assert data["labels"] == ["spam", "not_spam"]

    def test_head_pt_loadable(self):
        module = SpamHead(hidden=768)
        model = ClosingTimeModel(module, SPAM_CONFIG)
        with tempfile.TemporaryDirectory() as tmpdir:
            model.save_pretrained(tmpdir)
            state = torch.load(
                os.path.join(tmpdir, "head.pt"),
                map_location="cpu",
                weights_only=True,
            )
            assert isinstance(state, dict)
            assert len(state) > 0

    def test_trained_flag_in_readme(self):
        module = SpamHead(hidden=768)
        model = ClosingTimeModel(module, SPAM_CONFIG)
        with tempfile.TemporaryDirectory() as tmpdir:
            model.save_pretrained(tmpdir, trained=False)
            with open(os.path.join(tmpdir, "README.md")) as f:
                content = f.read()
            assert "`untrained`" in content

            model.save_pretrained(tmpdir, trained=True)
            with open(os.path.join(tmpdir, "README.md")) as f:
                content = f.read()
            assert "`trained`" in content


class TestFromPretrained:
    def test_roundtrip_spam(self):
        module = SpamHead(hidden=768)
        model = ClosingTimeModel(module, SPAM_CONFIG)
        with tempfile.TemporaryDirectory() as tmpdir:
            model.save_pretrained(tmpdir)
            loaded = ClosingTimeModel.from_pretrained(tmpdir)
            assert loaded.config.module_name == "spam"

    def test_roundtrip_score(self):
        module = LeadScorer(hidden=768)
        model = ClosingTimeModel(module, SCORE_CONFIG)
        with tempfile.TemporaryDirectory() as tmpdir:
            model.save_pretrained(tmpdir)
            loaded = ClosingTimeModel.from_pretrained(tmpdir)
            assert loaded.config.module_name == "score"

    def test_weights_match_after_roundtrip(self):
        module = SpamHead(hidden=768)
        model = ClosingTimeModel(module, SPAM_CONFIG)
        with tempfile.TemporaryDirectory() as tmpdir:
            model.save_pretrained(tmpdir)
            loaded = ClosingTimeModel.from_pretrained(tmpdir)
            for (n1, p1), (n2, p2) in zip(
                model._module.state_dict().items(),
                loaded._module.state_dict().items(),
            ):
                assert n1 == n2
                assert torch.allclose(p1.cpu(), p2.cpu()), f"Mismatch in {n1}"

    def test_custom_labels_override(self):
        module = SpamHead(hidden=768)
        model = ClosingTimeModel(module, SPAM_CONFIG)
        with tempfile.TemporaryDirectory() as tmpdir:
            model.save_pretrained(tmpdir)
            loaded = ClosingTimeModel.from_pretrained(tmpdir, labels=["a", "b", "c"])
            assert loaded.config.labels == ["a", "b", "c"]
            assert loaded.config.label2id == {"a": 0, "b": 1, "c": 2}


class TestModelCard:
    def test_yaml_frontmatter(self):
        module = SpamHead(hidden=768)
        model = ClosingTimeModel(module, SPAM_CONFIG)
        card = model._generate_model_card()
        assert "library_name: salescue" in card
        assert "pipeline_tag: text-classification" in card
        assert "license: mit" in card
        assert "base_model: microsoft/deberta-v3-base" in card
        assert "language:" in card

    def test_research_contribution_present(self):
        module = SpamHead(hidden=768)
        model = ClosingTimeModel(module, SPAM_CONFIG)
        card = model._generate_model_card()
        assert "## Research Contribution" in card
        assert "Perplexity Ratio" in card

    def test_score_research_contribution(self):
        module = LeadScorer(hidden=768)
        model = ClosingTimeModel(module, SCORE_CONFIG)
        card = model._generate_model_card()
        assert "Learned Interventions" in card
        assert "do-calculus" in card

    def test_intended_use_section(self):
        module = SpamHead(hidden=768)
        model = ClosingTimeModel(module, SPAM_CONFIG)
        card = model._generate_model_card()
        assert "## Intended Use" in card

    def test_limitations_section(self):
        module = SpamHead(hidden=768)
        model = ClosingTimeModel(module, SPAM_CONFIG)
        card = model._generate_model_card()
        assert "## Limitations" in card

    def test_labels_section(self):
        module = SpamHead(hidden=768)
        model = ClosingTimeModel(module, SPAM_CONFIG)
        card = model._generate_model_card()
        assert "## Labels" in card
        assert "`spam`" in card
        assert "`not_spam`" in card

    def test_all_publishable_modules_have_research(self):
        publishable = ["spam", "score", "intent", "reply", "triggers",
                       "objection", "sentiment", "entities", "call"]
        for name in publishable:
            assert name in ClosingTimeModel._MODULE_RESEARCH, (
                f"{name} missing from _MODULE_RESEARCH"
            )


class TestPredict:
    def test_predict_delegates(self, encoder_loaded):
        model = ClosingTimeModel.from_pretrained(
            next(iter(
                d for d in ["/tmp/test-salescue-spam"]
                if __import__("os").path.isdir(d)
            ), "v9ai/salescue-spam-v1"),
        )
        result = model.predict("test email text")
        assert isinstance(result, dict)
        assert "spam_score" in result

    def test_call_delegates_to_predict(self, encoder_loaded):
        # Use from_pretrained to get module on correct device
        import tempfile
        module = SpamHead(hidden=768)
        m = ClosingTimeModel(module, SPAM_CONFIG)
        with tempfile.TemporaryDirectory() as tmpdir:
            m.save_pretrained(tmpdir)
            model = ClosingTimeModel.from_pretrained(tmpdir)
        result = model("test email text")
        assert isinstance(result, dict)

    def test_repr(self):
        module = SpamHead(hidden=768)
        model = ClosingTimeModel(module, SPAM_CONFIG)
        r = repr(model)
        assert "spam" in r
        assert "ClosingTimeModel" in r
