# File: scrapus/module-3-entity-resolution/deploy.py
"""
Production deployment of trained DeBERTa adapter for entity matching.
"""

import logging
from pathlib import Path
from typing import Dict, Tuple, List
from inference import EntityMatcher
import json

logger = logging.getLogger(__name__)


class EntityResolutionService:
    """Production-ready entity resolution service."""
    
    def __init__(
        self,
        model_path: str,
        lancedb_path: str = "scrapus_data/lancedb",
        similarity_threshold: float = 0.7,
        device: str = "mps"
    ):
        logger.info("Initializing EntityResolutionService...")
        
        self.matcher = EntityMatcher(
            model_path=model_path,
            lancedb_path=lancedb_path,
            device=device,
            similarity_threshold=similarity_threshold
        )
        
        # Load config if exists
        config_path = Path(model_path) / "config.json"
        if config_path.exists():
            with open(config_path, 'r') as f:
                self.config = json.load(f)
            logger.info(f"Loaded config: {self.config}")
        
        logger.info("Service ready!")
    
    def resolve_entity(
        self,
        entity: Dict[str, str],
        k: int = 5
    ) -> Dict:
        """
        Resolve a single entity against database.
        
        Returns:
            {
                'is_match': bool,
                'confidence': float,
                'matched_entity': Dict or None,
                'candidates': List[Dict]
            }
        """
        
        is_match, confidence, matched_entity = self.matcher.match_entity(entity, k=k)
        
        # Get top candidates
        from inference import entity_to_text
        candidates = self.matcher.cache.search_similar_entities(
            entity, k=k, threshold=0.3
        )
        
        return {
            'is_match': is_match,
            'confidence': float(confidence),
            'matched_entity': matched_entity,
            'candidates': [
                {
                    'entity': e,
                    'similarity': float(sim)
                }
                for e, sim in candidates
            ]
        }
    
    def batch_resolve(
        self,
        entities: List[Dict[str, str]]
    ) -> List[Dict]:
        """Resolve multiple entities."""
        return [self.resolve_entity(e) for e in entities]


def load_production_model(
    checkpoint_dir: str = "scrapus_data/entity_matching/final_model"
) -> EntityMatcher:
    """Load trained model for inference."""
    return EntityMatcher(
        model_path=checkpoint_dir,
        device="mps"
    )


# Example usage in SQLite trigger/hook
def entity_resolution_hook(new_entity: Dict[str, str], db_conn) -> Tuple[bool, Dict]:
    """
    Hook called when new entity is inserted.
    Attempts to match and merge if found.
    """
    
    service = EntityResolutionService(
        model_path="scrapus_data/entity_matching/final_model"
    )
    
    result = service.resolve_entity(new_entity)
    
    if result['is_match'] and result['confidence'] > 0.85:
        # Merge entities
        matched = result['matched_entity']
        logger.info(f"Merging {new_entity['name']} -> {matched['name']}")
        return True, matched
    
    return False, None
