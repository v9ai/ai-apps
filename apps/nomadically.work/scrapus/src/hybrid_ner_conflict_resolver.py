from enum import Enum
from typing import Literal

class EntityTypeCategory(Enum):
    """Categorize entity types by optimal detection model."""
    HIGH_FREQUENCY = "high_freq"      # ORG, PERSON, LOCATION -> DistilBERT
    RULE_BASED = "rule_based"          # EMAIL, PHONE, URL, DATE -> spaCy rules
    ZERO_SHOT = "zero_shot"            # FUNDING_ROUND, TECHNOLOGY -> GLiNER2

class HybridNERRouter:
    """Route entity types to optimal NER model based on characteristics."""
    
    TYPE_ROUTING = {
        # High-frequency, fine-tuned BERT types
        "ORG": EntityTypeCategory.HIGH_FREQUENCY,
        "PERSON": EntityTypeCategory.HIGH_FREQUENCY,
        "LOCATION": EntityTypeCategory.HIGH_FREQUENCY,
        "PRODUCT": EntityTypeCategory.HIGH_FREQUENCY,
        
        # Deterministic patterns
        "EMAIL": EntityTypeCategory.RULE_BASED,
        "PHONE": EntityTypeCategory.RULE_BASED,
        "URL": EntityTypeCategory.RULE_BASED,
        "DATE": EntityTypeCategory.RULE_BASED,
        "FUNDING_ROUND": EntityTypeCategory.RULE_BASED,
        "IP_ADDRESS": EntityTypeCategory.RULE_BASED,
        
        # Zero-shot types
        "TECHNOLOGY": EntityTypeCategory.ZERO_SHOT,
        "INDUSTRY": EntityTypeCategory.ZERO_SHOT,
        "FUNDING_AMOUNT": EntityTypeCategory.ZERO_SHOT,
        "COMPETITOR": EntityTypeCategory.ZERO_SHOT,
        "SKILL": EntityTypeCategory.ZERO_SHOT,
    }
    
    def route_entity_type(self, entity_type: str) -> EntityTypeCategory:
        """Determine which model(s) should extract this entity type."""
        return self.TYPE_ROUTING.get(entity_type, EntityTypeCategory.ZERO_SHOT)
    
    def get_confidence_threshold(self, entity_type: str) -> float:
        """Return confidence threshold by entity type and model."""
        category = self.route_entity_type(entity_type)
        
        if category == EntityTypeCategory.RULE_BASED:
            return 0.99  # Rules are deterministic
        elif category == EntityTypeCategory.HIGH_FREQUENCY:
            return 0.75  # DistilBERT is well-calibrated on frequent types
        else:  # ZERO_SHOT
            return 0.55  # GLiNER2 zero-shot is more conservative
    
    def should_run_model(self, model_name: str, entity_types: list) -> bool:
        """Check if a model should be executed for the given entity types."""
        if model_name == "rule":
            # Always run rules - they're fast and deterministic
            return True
        elif model_name == "distilbert":
            # Run if any high-frequency types are needed
            for et in entity_types:
                if self.route_entity_type(et) == EntityTypeCategory.HIGH_FREQUENCY:
                    return True
            return False
        elif model_name == "gliner":
            # Run if any zero-shot types are needed
            for et in entity_types:
                if self.route_entity_type(et) == EntityTypeCategory.ZERO_SHOT:
                    return True
            return False
        return False
