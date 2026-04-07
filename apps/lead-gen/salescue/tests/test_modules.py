"""Tests for salescue.modules — all 12 ML modules."""

import pytest
import torch

from salescue.modules import MODULE_CLASSES
from salescue.modules.score import LeadScorer, LearnedInterventionAttribution
from salescue.modules.spam import SpamHead, PerplexityRatioDetector
from salescue.modules.intent import NeuralHawkesIntentPredictor
from salescue.modules.reply import ReplyHead
from salescue.modules.triggers import TemporalDisplacementModel
from salescue.modules.objection import ObjectionPreClassifier
from salescue.modules.sentiment import DisentangledSentimentIntentHead
from salescue.modules.entities import EntityExtractor
from salescue.modules.call import ConversationNeuralProcess
from salescue.modules.icp import WassersteinICPMatcher
from salescue.modules.subject import ContextualBradleyTerry
from salescue.modules.emailgen import EmailGenerator


class TestModuleRegistry:
    def test_all_12_modules_registered(self):
        assert len(MODULE_CLASSES) == 12

    def test_expected_module_names(self):
        expected = {
            "score", "intent", "reply", "triggers", "icp",
            "call", "spam", "subject", "sentiment", "entities",
            "objection", "emailgen",
        }
        assert set(MODULE_CLASSES.keys()) == expected

    def test_all_values_are_classes(self):
        for name, cls in MODULE_CLASSES.items():
            assert isinstance(cls, type), f"{name} is not a class"


class TestModuleInstantiation:
    """Verify all nn.Module-based modules instantiate without errors."""

    @pytest.mark.parametrize("name,cls", [
        ("score", LeadScorer),
        ("spam", SpamHead),
        ("intent", NeuralHawkesIntentPredictor),
        ("reply", ReplyHead),
        ("triggers", TemporalDisplacementModel),
        ("objection", ObjectionPreClassifier),
        ("sentiment", DisentangledSentimentIntentHead),
        ("entities", EntityExtractor),
        ("call", ConversationNeuralProcess),
        ("icp", WassersteinICPMatcher),
        ("subject", ContextualBradleyTerry),
    ])
    def test_instantiate(self, name, cls):
        module = cls(hidden=768)
        assert isinstance(module, torch.nn.Module)
        assert module.name == name

    @pytest.mark.parametrize("name,cls", [
        ("score", LeadScorer),
        ("spam", SpamHead),
        ("intent", NeuralHawkesIntentPredictor),
        ("reply", ReplyHead),
        ("triggers", TemporalDisplacementModel),
        ("objection", ObjectionPreClassifier),
        ("sentiment", DisentangledSentimentIntentHead),
        ("entities", EntityExtractor),
        ("call", ConversationNeuralProcess),
        ("icp", WassersteinICPMatcher),
        ("subject", ContextualBradleyTerry),
    ])
    def test_has_description(self, name, cls):
        module = cls(hidden=768)
        assert module.description, f"{name} has empty description"

    def test_emailgen_instantiates(self):
        gen = EmailGenerator()
        assert gen.name == "emailgen"


class TestModuleProcess:
    """Test process() with mock encoded input on CPU for speed."""

    def test_score_process(self, mock_encoded):
        module = LeadScorer(hidden=768).cpu().eval()
        result = module.process(mock_encoded, "test text")
        assert "label" in result
        assert result["label"] in ("hot", "warm", "cold", "disqualified")
        assert "score" in result
        assert 0 <= result["score"] <= 100
        assert "confidence" in result
        assert "signals" in result

    def test_spam_process(self, mock_encoded):
        module = SpamHead(hidden=768).cpu().eval()
        result = module.process(mock_encoded, "test email")
        assert "spam_score" in result
        assert "ai_risk" in result
        assert "deliverability" in result
        assert "provider_scores" in result
        assert result["risk_level"] in ("low", "medium", "high")

    def test_intent_process(self, mock_encoded):
        module = NeuralHawkesIntentPredictor(hidden=768).cpu().eval()
        result = module.process(mock_encoded, "test text")
        assert "stage" in result
        assert "confidence" in result
        assert "distribution" in result

    def test_reply_process(self, mock_encoded):
        module = ReplyHead(hidden=768).cpu().eval()
        result = module.process(mock_encoded, "test text")
        assert "active" in result
        assert "scores" in result

    def test_triggers_process(self, mock_encoded):
        module = TemporalDisplacementModel(hidden=768).cpu().eval()
        result = module.process(mock_encoded, "test text")
        assert "events" in result
        assert isinstance(result["events"], list)

    def test_objection_process(self, mock_encoded):
        module = ObjectionPreClassifier(hidden=768).cpu().eval()
        result = module.process(mock_encoded, "test text")
        assert "category" in result
        assert result["category"] in ("genuine_objection", "stall", "misunderstanding")
        assert "objection_type" in result

    def test_sentiment_process(self, mock_encoded):
        module = DisentangledSentimentIntentHead(hidden=768).cpu().eval()
        result = module.process(mock_encoded, "test text")
        assert "sentiment" in result
        assert "intent" in result
        assert "confidence" in result

    def test_entities_process(self, mock_encoded):
        module = EntityExtractor(hidden=768).cpu().eval()
        result = module.process(mock_encoded, "Jane Smith from Acme Corp")
        assert "entities" in result
        assert isinstance(result["entities"], list)

    def test_icp_process_raises(self, mock_encoded):
        module = WassersteinICPMatcher(hidden=768).cpu().eval()
        with pytest.raises(NotImplementedError, match="requires separate"):
            module.process(mock_encoded, "test text")


class TestLearnedInterventionAttribution:
    def test_detect_signals(self):
        attr = LearnedInterventionAttribution(hidden=768, n_signals=15)
        tokens = torch.randn(1, 32, 768)
        signal_embeds, strengths, attn_weights = attr.detect_signals(tokens)
        assert signal_embeds.shape == (1, 15, 192)  # h/4 = 192
        assert strengths.shape == (1, 15)
        assert attn_weights.shape == (1, 15, 32)
        assert (strengths >= 0).all() and (strengths <= 1).all()

    def test_estimate_causal_effects(self):
        attr = LearnedInterventionAttribution(hidden=768, n_signals=15)
        signal_embeds = torch.randn(1, 15, 192)
        strengths = torch.rand(1, 15)
        effects = attr.estimate_causal_effects(signal_embeds, strengths)
        assert effects.shape == (1, 15)


class TestPerplexityRatioDetector:
    def test_structural_features(self):
        detector = PerplexityRatioDetector(hidden=768)
        features = detector.compute_structural_features(
            "Hello! I'm interested in your product. Can we talk?"
        )
        assert features.shape == (8,)

    def test_structural_features_empty(self):
        detector = PerplexityRatioDetector(hidden=768)
        features = detector.compute_structural_features("")
        assert features.shape == (8,)
        assert (features == 0).all()


class TestICPMatcher:
    def test_match(self):
        module = WassersteinICPMatcher(hidden=768).eval()
        icp_cls = torch.randn(1, 768)
        prospect_cls = torch.randn(1, 768)
        result = module.match(icp_cls, prospect_cls)
        assert "score" in result
        assert "qualified" in result
        assert "dimensions" in result
        assert "dealbreakers" in result
        assert set(result["dimensions"].keys()) == {"industry", "size", "tech", "role", "signal"}
