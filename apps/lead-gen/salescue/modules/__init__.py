from .score import LeadScorer, LearnedInterventionAttribution
from .intent import NeuralHawkesIntentPredictor, STAGES
from .reply import ReplyHead, ConstrainedMultiLabelCRF, LABELS as REPLY_LABELS
from .triggers import TemporalDisplacementModel, EVENTS
from .icp import WassersteinICPMatcher, DIMS as ICP_DIMS
from .call import ConversationNeuralProcess
from .spam import (
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
from .subject import ContextualBradleyTerry
from .sentiment import DisentangledSentimentIntentHead, SENTIMENTS, INTENTS
from .entities import EntityExtractor, PointerNER, RetypingLayer
from .objection import ObjectionPreClassifier, OBJECTION_TYPES, COACHING_CARDS
from .emailgen import EmailGenerator, EmailGenConfig, ProspectContext

MODULE_CLASSES = {
    "score": LeadScorer,
    "intent": NeuralHawkesIntentPredictor,
    "reply": ReplyHead,
    "triggers": TemporalDisplacementModel,
    "icp": WassersteinICPMatcher,
    "call": ConversationNeuralProcess,
    "spam": SpamHead,
    "subject": ContextualBradleyTerry,
    "sentiment": DisentangledSentimentIntentHead,
    "entities": EntityExtractor,
    "objection": ObjectionPreClassifier,
    "emailgen": EmailGenerator,
}

__all__ = [
    "LeadScorer", "LearnedInterventionAttribution",
    "NeuralHawkesIntentPredictor", "STAGES",
    "ReplyHead", "ConstrainedMultiLabelCRF", "REPLY_LABELS",
    "TemporalDisplacementModel", "EVENTS",
    "WassersteinICPMatcher", "ICP_DIMS",
    "ConversationNeuralProcess",
    "SpamHead", "HierarchicalBayesianAttentionGate",
    "AdversarialStyleTransferDetector", "HeaderAnalyzer",
    "TemporalBurstDetector", "CampaignSimilarityDetector",
    "ProviderCalibration", "SPAM_CATEGORIES", "RISK_FACTORS",
    "ContextualBradleyTerry",
    "DisentangledSentimentIntentHead", "SENTIMENTS", "INTENTS",
    "EntityExtractor", "PointerNER", "RetypingLayer",
    "ObjectionPreClassifier", "OBJECTION_TYPES", "COACHING_CARDS",
    "EmailGenerator", "EmailGenConfig", "ProspectContext",
    "MODULE_CLASSES",
]
