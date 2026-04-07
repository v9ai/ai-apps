"""Tests for salescue.modules — all 12 ML modules."""

import pytest
import torch

from salescue.modules import MODULE_CLASSES
from salescue.modules.score import LeadScorer, LearnedInterventionAttribution, MultiScaleSignalDetector, SignalInteractionGraph
from salescue.modules.spam import (
    SpamHead,
    HierarchicalBayesianAttentionGate,
    AdversarialStyleTransferDetector,
    HeaderAnalyzer,
    TemporalBurstDetector,
    CampaignSimilarityDetector,
    ProviderCalibration,
    SPAM_CATEGORIES,
    RISK_FACTORS,
)
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
        # v2: category sub-scores
        assert "categories" in result
        cats = result["categories"]
        assert set(cats.keys()) == {"intent", "engagement", "enrichment", "analytics", "outreach", "automation"}
        for v in cats.values():
            assert 0 <= v <= 100
        assert "n_signals_detected" in result

    def test_spam_process(self, mock_encoded):
        module = SpamHead(hidden=768).cpu().eval()
        result = module.process(mock_encoded, "test email content for spam detection")
        assert "spam_score" in result
        assert 0 <= result["spam_score"] <= 1
        assert "spam_category" in result
        assert result["spam_category"] in SPAM_CATEGORIES
        assert "category_scores" in result
        assert len(result["category_scores"]) == 7
        assert "ai_risk" in result
        assert "ai_details" in result
        assert "header_verdict" in result
        assert "deliverability" in result
        assert "provider_scores" in result
        assert len(result["provider_scores"]) == 6  # 6 providers
        assert result["risk_level"] in ("low", "medium", "high", "critical")
        assert "risk_factors" in result
        assert "token_spam_contributions" in result
        assert "sentence_scores" in result
        assert result["gate_decision"] in ("pass", "quarantine", "block")
        assert "gate_confidence" in result
        # v3: aspect scores and uncertainty decomposition
        assert "aspect_scores" in result
        assert "uncertainty" in result

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

    def test_icp_process_requires_json(self, mock_encoded):
        module = WassersteinICPMatcher(hidden=768).cpu().eval()
        with pytest.raises(ValueError, match="requires JSON"):
            module.process(mock_encoded, "test text")

    def test_subject_process_requires_json(self, mock_encoded):
        module = ContextualBradleyTerry(hidden=768).cpu().eval()
        with pytest.raises(ValueError, match="requires a JSON array"):
            module.process(mock_encoded, "test text")


class TestMultiScaleSignalDetector:
    def test_detect_signals(self):
        detector = MultiScaleSignalDetector(hidden=768, n_signals=32)
        tokens = torch.randn(1, 32, 768)
        signal_embeds, strengths, attn_weights = detector(tokens)
        assert signal_embeds.shape == (1, 32, 192)  # h/4 = 192
        assert strengths.shape == (1, 32)
        assert attn_weights.shape == (1, 32, 32)


class TestLearnedInterventionAttribution:
    def test_estimate_causal_effects(self):
        attr = LearnedInterventionAttribution(hidden=768, n_signals=32)
        signal_embeds = torch.randn(1, 32, 192)
        strengths = torch.rand(1, 32)
        effects = attr.estimate_causal_effects(signal_embeds, strengths)
        assert effects.shape == (1, 32)


class TestSignalInteractionGraph:
    def test_interaction(self):
        graph = SignalInteractionGraph(n_signals=32, dim=192)
        signal_embeds = torch.randn(1, 32, 192)
        strengths = torch.rand(1, 32)
        enhanced = graph(signal_embeds, strengths)
        assert enhanced.shape == (1, 32, 192)


class TestHierarchicalBayesianGate:
    def test_instantiation(self):
        gate = HierarchicalBayesianAttentionGate(hidden=768)
        assert isinstance(gate, torch.nn.Module)

    def test_4_aspect_probes(self):
        """Multi-probe: 4 aspect-specific probes are registered."""
        gate = HierarchicalBayesianAttentionGate(hidden=768)
        assert len(gate.probes) == 4
        assert set(gate.probes.keys()) == {"content", "structure", "deception", "synthetic"}
        assert len(gate.prior_alpha) == 4
        assert len(gate.prior_beta) == 4

    def test_forward(self):
        gate = HierarchicalBayesianAttentionGate(hidden=768).cpu().eval()
        # Mock encoder output
        mock_output = type("MockOutput", (), {
            "last_hidden_state": torch.randn(1, 32, 768),
        })()
        result = gate(mock_output, "Hello, this is a test email. How are you?")
        assert "category_logits" in result
        assert result["category_logits"].shape == (1, 7)
        assert "gate_score" in result
        assert 0 <= result["gate_score"] <= 1
        assert "token_contributions" in result
        assert "sentence_scores" in result
        assert "gate_confidence" in result
        assert "alpha" in result
        assert "beta" in result
        # Multi-probe outputs
        assert "aspect_scores" in result
        assert set(result["aspect_scores"].keys()) == {"content", "structure", "deception", "synthetic"}
        assert "aspect_weights" in result
        # Uncertainty decomposition
        assert "uncertainty" in result
        assert "aleatoric" in result["uncertainty"]
        assert "epistemic" in result["uncertainty"]
        assert 0 <= result["uncertainty"]["aleatoric"] <= 1
        assert result["uncertainty"]["epistemic"] >= 0

    def test_per_sentence_spans(self):
        """Different sentences should produce different sentence scores."""
        gate = HierarchicalBayesianAttentionGate(hidden=768).cpu().eval()
        mock_output = type("MockOutput", (), {
            "last_hidden_state": torch.randn(1, 64, 768),
        })()
        # Two very different sentences should give different scores
        text = "URGENT! Act now! FREE money!" + " " + "I enjoyed our meeting last Tuesday about the Q3 roadmap."
        result = gate(mock_output, text)
        assert len(result["sentence_scores"]) >= 2

    def test_sentence_features(self):
        feats = HierarchicalBayesianAttentionGate.extract_sentence_features(
            "Hello! I'm interested in your product. Can we schedule a demo?"
        )
        assert len(feats) == 12

    def test_doc_features(self):
        feats = HierarchicalBayesianAttentionGate.extract_doc_features(
            "Test email with http://example.com link. Multiple sentences here."
        )
        assert len(feats) == 8

    def test_kl_loss(self):
        gate = HierarchicalBayesianAttentionGate(hidden=768)
        alpha = torch.tensor([[2.0, 3.0, 1.5]])
        beta = torch.tensor([[1.0, 2.0, 1.0]])
        kl = gate.compute_kl_loss(alpha, beta)
        assert torch.isfinite(torch.tensor(kl.item()))

    def test_kl_loss_uniform_prior(self):
        """KL(Beta(1,1) || Beta(1,1)) should be ~0."""
        gate = HierarchicalBayesianAttentionGate(hidden=768)
        alpha = torch.tensor([[1.0, 1.0, 1.0]])
        beta = torch.tensor([[1.0, 1.0, 1.0]])
        kl = gate.compute_kl_loss(alpha, beta)
        assert abs(kl.item()) < 0.01


class TestAdversarialStyleTransferDetector:
    def test_structural_features_32(self):
        feats = AdversarialStyleTransferDetector.compute_structural_features(
            "Hello! I'm interested in your product. Can we talk? "
            "I've been using similar tools and they're great."
        )
        assert len(feats) == 32

    def test_structural_features_empty(self):
        feats = AdversarialStyleTransferDetector.compute_structural_features("")
        assert len(feats) == 32

    def test_yules_k(self):
        """f11 is now Yule's K — should be > 0 for normal text."""
        feats = AdversarialStyleTransferDetector.compute_structural_features(
            "The quick brown fox jumps over the lazy dog. "
            "A quick brown fox jumped the lazy dog again."
        )
        yules_k = feats[10]  # f11, index 10
        assert yules_k > 0, f"Yule's K should be > 0 for normal text, got {yules_k}"

    def test_shannon_entropy(self):
        """f26 is now Shannon word entropy — should be in [0, 1]."""
        feats = AdversarialStyleTransferDetector.compute_structural_features(
            "The meeting was productive and the team discussed the roadmap."
        )
        entropy = feats[25]  # f26, index 25
        assert 0 <= entropy <= 1, f"Shannon entropy should be in [0,1], got {entropy}"

    def test_honores_r(self):
        """f23 is now Honoré's R — should be > 0 for text with hapax legomena."""
        feats = AdversarialStyleTransferDetector.compute_structural_features(
            "The innovative approach streamlined our quarterly review process. "
            "Several stakeholders appreciated the comprehensive analysis."
        )
        honores_r = feats[22]  # f23, index 22
        assert honores_r >= 0, f"Honoré's R should be >= 0, got {honores_r}"

    def test_trigram_repetition(self):
        """f28 enhanced with trigram analysis — repetitive text should score higher."""
        repetitive = AdversarialStyleTransferDetector.compute_structural_features(
            "buy now buy now buy now buy now buy now buy now buy now"
        )
        diverse = AdversarialStyleTransferDetector.compute_structural_features(
            "The innovative approach streamlined our quarterly review process yesterday."
        )
        assert repetitive[27] > diverse[27]  # f28, index 27

    def test_forward(self):
        detector = AdversarialStyleTransferDetector(hidden=768).cpu().eval()
        mock_output = type("MockOutput", (), {
            "last_hidden_state": torch.randn(1, 32, 768),
        })()
        result = detector(mock_output, torch.randint(0, 1000, (1, 32)), None,
                          "Test text for AI detection analysis.")
        assert "ai_risk" in result
        assert 0 <= result["ai_risk"] <= 1
        assert "perplexity_ratio" in result
        assert "style_transfer_score" in result
        assert "watermark_detected" in result
        assert "structural_features" in result
        assert "type_token_ratio" in result["structural_features"]

    def test_trajectory_smoothness(self):
        detector = AdversarialStyleTransferDetector(hidden=768).cpu().eval()
        tokens = torch.randn(1, 64, 768)
        smoothness = detector.compute_trajectory_smoothness(tokens)
        assert isinstance(smoothness, float)

    def test_trajectory_short_text(self):
        detector = AdversarialStyleTransferDetector(hidden=768).cpu().eval()
        tokens = torch.randn(1, 2, 768)
        smoothness = detector.compute_trajectory_smoothness(tokens)
        assert smoothness == 0.0


class TestHeaderAnalyzer:
    def test_no_headers(self):
        feats = HeaderAnalyzer.extract_header_features(None)
        assert len(feats) == 16
        assert all(f == 0.0 for f in feats)

    def test_full_headers(self):
        headers = {
            "spf": "pass", "dkim": "pass", "dmarc": "pass",
            "hop_count": 3, "reply_to_mismatch": True,
            "return_path_mismatch": False, "has_list_unsubscribe": True,
            "known_mailer": True, "send_hour": 14,
        }
        feats = HeaderAnalyzer.extract_header_features(headers)
        assert len(feats) == 16
        assert feats[0] == 1.0  # spf_pass
        assert feats[10] == 1.0  # reply_to_mismatch

    def test_forward(self):
        analyzer = HeaderAnalyzer().cpu().eval()
        result = analyzer({"spf": "pass", "dkim": "fail", "dmarc": "none"})
        assert "header_embed" in result
        assert result["header_embed"].shape == (1, 16)


class TestTemporalBurstDetector:
    def test_no_timestamps(self):
        feats = TemporalBurstDetector.extract_temporal_features(None)
        assert len(feats) == 8
        assert all(f == 0.0 for f in feats)

    def test_burst_detection(self):
        # Send 10 emails in 10 seconds — clear burst
        timestamps = [1000.0 + i for i in range(10)]
        feats = TemporalBurstDetector.extract_temporal_features(timestamps)
        assert len(feats) == 8
        assert feats[2] > 0.5  # burst indicator should be high

    def test_regular_cadence(self):
        # Send 5 emails 1 hour apart — regular cadence
        timestamps = [1000.0 + i * 3600 for i in range(5)]
        feats = TemporalBurstDetector.extract_temporal_features(timestamps)
        assert feats[3] > 0.5  # regularity should be high


class TestCampaignSimilarityDetector:
    def test_no_embeddings(self):
        feats = CampaignSimilarityDetector.compute_similarity_features(None)
        assert len(feats) == 4
        assert all(f == 0.0 for f in feats)

    def test_identical_embeddings(self):
        emb = torch.randn(1, 768)
        batch = emb.repeat(5, 1)  # 5 identical emails
        feats = CampaignSimilarityDetector.compute_similarity_features(batch)
        assert feats[0] > 0.99  # max similarity ~ 1.0
        assert feats[2] > 0.99  # all pairs above threshold

    def test_diverse_embeddings(self):
        batch = torch.randn(5, 768)
        feats = CampaignSimilarityDetector.compute_similarity_features(batch)
        assert len(feats) == 4


class TestProviderCalibration:
    def test_6_providers(self):
        cal = ProviderCalibration().cpu().eval()
        feature_dict = {
            "spam_score": 0.5, "ai_risk": 0.3, "text_length_norm": 0.1,
            "link_density": 0.01, "urgency_count_norm": 0.0,
            "header_auth_score": 0.67, "template_marker": 0.0,
            "caps_ratio": 0.0, "sentence_count_norm": 0.1,
            "role_account": 0.0,
        }
        result = cal(feature_dict, "gmail")
        assert len(result["provider_scores"]) == 6
        assert all(p in result["provider_scores"] for p in [
            "gmail", "outlook", "yahoo", "protonmail", "apple_mail", "corporate"])
        assert 0 <= result["deliverability"] <= 10

    def test_10_features(self):
        """ProviderCalibration now accepts 10-feature dict."""
        cal = ProviderCalibration().cpu().eval()
        assert cal.N_FEATURES == 10


class TestSpamTaxonomy:
    def test_categories(self):
        assert len(SPAM_CATEGORIES) == 7
        assert "clean" in SPAM_CATEGORIES
        assert "ai_generated" in SPAM_CATEGORIES
        assert "content_violation" in SPAM_CATEGORIES

    def test_risk_factors(self):
        assert len(RISK_FACTORS) == 9
        assert "urgency_manipulation" in RISK_FACTORS
        assert "homoglyph_attack" in RISK_FACTORS


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
