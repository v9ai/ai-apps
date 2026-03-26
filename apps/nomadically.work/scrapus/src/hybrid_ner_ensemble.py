from dataclasses import dataclass
from typing import List, Dict, Tuple

@dataclass
class Entity:
    """Unified entity representation."""
    text: str
    type: str
    start: int
    end: int
    confidence: float
    source: str  # "rule", "distilbert", "gliner"
    
    def overlaps_with(self, other: 'Entity', min_overlap_ratio: float = 0.5) -> bool:
        """Check if two entities overlap by at least min_overlap_ratio."""
        if self.type != other.type:
            return False
        
        overlap_start = max(self.start, other.start)
        overlap_end = min(self.end, other.end)
        
        if overlap_start >= overlap_end:
            return False
        
        overlap_len = overlap_end - overlap_start
        self_len = self.end - self.start
        other_len = other.end - other.start
        
        # Jaccard overlap
        union_len = self_len + other_len - overlap_len
        jaccard = overlap_len / union_len
        
        return jaccard >= min_overlap_ratio

class ConflictResolver:
    """Resolve conflicts between predictions from multiple NER models."""
    
    def __init__(self):
        self.router = HybridNERRouter()
    
    def resolve_conflicts(self, 
                         rule_entities: List[Entity],
                         bert_entities: List[Entity],
                         gliner_entities: List[Entity]) -> List[Entity]:
        """Merge predictions from 3 models with conflict resolution.
        
        Priority:
        1. Rule-based entities (deterministic) always win
        2. For BERT vs GLiNER conflicts: weighted vote by confidence
        3. No overlap: keep both
        """
        
        # Start with rule-based entities (these are ground truth)
        merged = rule_entities.copy()
        merged_spans = set((e.start, e.end, e.type) for e in merged)
        
        # Stage 1: Add non-conflicting BERT entities
        for bert_entity in bert_entities:
            span = (bert_entity.start, bert_entity.end, bert_entity.type)
            
            # Check overlap with existing (including rules)
            conflicting = [
                e for e in merged 
                if bert_entity.overlaps_with(e)
            ]
            
            if not conflicting:
                # No conflict - add it
                merged.append(bert_entity)
                merged_spans.add(span)
            else:
                # Conflict with rule or existing
                # Only add if rule source was not involved
                has_rule = any(e.source == "rule" for e in conflicting)
                if not has_rule:
                    # Weighted voting: BERT vs GLiNER
                    # But we need to defer to next stage
                    bert_entity._competing = conflicting
                    merged.append(bert_entity)
        
        # Stage 2: Add non-conflicting GLiNER entities
        for gliner_entity in gliner_entities:
            # Check overlap
            conflicting = [
                e for e in merged 
                if gliner_entity.overlaps_with(e)
            ]
            
            if not conflicting:
                merged.append(gliner_entity)
            else:
                # Check if we can improve confidence via voting
                has_rule = any(e.source == "rule" for e in conflicting)
                if has_rule:
                    # Rule wins - skip
                    continue
                
                # Conflict is BERT vs GLiNER
                bert_conflicts = [e for e in conflicting if e.source == "distilbert"]
                if bert_conflicts:
                    # Weighted vote
                    winner = self._weighted_vote(bert_conflicts[0], gliner_entity)
                    if winner == gliner_entity:
                        # Replace BERT with GLiNER
                        merged = [e for e in merged if e not in bert_conflicts]
                        merged.append(gliner_entity)
        
        return merged
    
    def _weighted_vote(self, entity1: Entity, entity2: Entity) -> Entity:
        """Winner of weighted vote between two entities (same span)."""
        # Weight by model reliability (learned from calibration)
        weights = {
            "rule": 1.0,
            "distilbert": 0.85,
            "gliner": 0.70,
        }
        
        score1 = entity1.confidence * weights[entity1.source]
        score2 = entity2.confidence * weights[entity2.source]
        
        if score1 > score2:
            # Average confidences for final score
            entity1.confidence = (entity1.confidence + entity2.confidence) / 2
            return entity1
        else:
            entity2.confidence = (entity1.confidence + entity2.confidence) / 2
            return entity2
    
    def vote_on_conflicting_types(self, 
                                  entity_span: Tuple[int, int],
                                  predictions: Dict[str, Entity]) -> Entity:
        """When multiple models predict different types for same span.
        
        Example: ("Acme", 10, 14)
        - DistilBERT: ORG (conf=0.88)
        - GLiNER: ORGANIZATION (conf=0.72)
        - Rules: (no match)
        
        Decision: ORG (DistilBERT wins by higher confidence + known type)
        """
        
        # Map GLiNER labels to standard types
        label_mapping = {
            "organization": "ORG",
            "person": "PERSON",
            "location": "LOCATION",
            "product": "PRODUCT",
        }
        
        # Normalize labels
        normalized = {}
        for model, entity in predictions.items():
            entity_type = entity.type
            if model == "gliner":
                entity_type = label_mapping.get(entity_type.lower(), entity_type)
            normalized[model] = (entity_type, entity.confidence)
        
        # Weight by source reliability
        scores = {}
        for model, (entity_type, conf) in normalized.items():
            weight = {"rule": 1.0, "distilbert": 0.85, "gliner": 0.70}[model]
            scores[entity_type] = scores.get(entity_type, 0) + conf * weight
        
        # Return type with highest weighted score
        best_type = max(scores, key=scores.get)
        best_entity = next(
            e for e in predictions.values() 
            if (e.type if e.source != "gliner" else label_mapping.get(e.type.lower())) == best_type
        )
        
        return best_entity
