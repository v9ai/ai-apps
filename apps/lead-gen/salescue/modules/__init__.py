from .score import LeadScorer, LearnedInterventionAttribution
from .intent import NeuralHawkesIntentPredictor, STAGES
from .reply import ReplyHead, ConstrainedMultiLabelCRF, LABELS as REPLY_LABELS
from .triggers import TemporalDisplacementModel, EVENTS
from .icp import WassersteinICPMatcher, ContrastiveProjectionHead, DIMS as ICP_DIMS
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
from .survival import DeepSurvivalMachine, RISK_GROUPS
from .anomaly import SignalAnomalyDetector, ANOMALY_TYPES, SIGNAL_CHANNELS
from .bandit import OutreachBandit, TEMPLATES, TIMINGS, SUBJECT_STYLES
from .graph import CompanyGraphScorer, EDGE_TYPES, GRAPH_LABELS
from .skills import SkillExtractor

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
    "survival": DeepSurvivalMachine,
    "anomaly": SignalAnomalyDetector,
    "bandit": OutreachBandit,
    "graph": CompanyGraphScorer,
    "skills": SkillExtractor,
}

__all__ = [
    "LeadScorer", "LearnedInterventionAttribution",
    "NeuralHawkesIntentPredictor", "STAGES",
    "ReplyHead", "ConstrainedMultiLabelCRF", "REPLY_LABELS",
    "TemporalDisplacementModel", "EVENTS",
    "WassersteinICPMatcher", "ContrastiveProjectionHead", "ICP_DIMS",
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
    "DeepSurvivalMachine", "RISK_GROUPS",
    "SignalAnomalyDetector", "ANOMALY_TYPES", "SIGNAL_CHANNELS",
    "OutreachBandit", "TEMPLATES", "TIMINGS", "SUBJECT_STYLES",
    "CompanyGraphScorer", "EDGE_TYPES", "GRAPH_LABELS",
    "SkillExtractor",
    "MODULE_CLASSES",
]
