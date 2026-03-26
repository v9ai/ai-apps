# File: scrapus/module-3-entity-resolution/inference.py
"""
Inference optimization: precompute embeddings, cache in LanceDB.
"""

import lancedb
import numpy as np
from typing import List, Dict, Tuple
from sentence_transformers import SentenceTransformer
import logging
from pathlib import Path
import torch

logger = logging.getLogger(__name__)


class EntityEmbeddingCache:
    """Cache entity embeddings in LanceDB for fast matching."""
    
    def __init__(
        self,
        model: SentenceTransformer,
        db_path: str = "scrapus_data/lancedb",
        table_name: str = "entity_embeddings_deberta",
        device: str = "mps"
    ):
        self.model = model
        self.device = device
        self.table_name = table_name
        
        # Connect to LanceDB
        self.db = lancedb.connect(db_path)
        
        # Check if table exists
        try:
            self.table = self.db.open_table(table_name)
            logger.info(f"Opened existing table: {table_name}")
        except:
            logger.info(f"Creating new table: {table_name}")
            self.table = None
    
    def precompute_entity_embeddings(
        self,
        entities: List[Dict[str, str]],
        entity_id_field: str = 'id',
        batch_size: int = 64,
        force_recompute: bool = False
    ) -> int:
        """
        Precompute and cache embeddings for all entities.
        
        Args:
            entities: List of entity dicts
            entity_id_field: Field name containing entity ID
            batch_size: Batch size for encoding
            force_recompute: Recompute even if exists
        
        Returns:
            Number of entities cached
        """
        
        logger.info(f"Precomputing embeddings for {len(entities)} entities...")
        
        data_to_insert = []
        
        for i in range(0, len(entities), batch_size):
            batch = entities[i:i+batch_size]
            
            # Convert entities to text
            texts = [entity_to_text(e) for e in batch]
            
            # Encode
            with torch.no_grad():
                embeddings = self.model.encode(
                    texts,
                    convert_to_numpy=True,
                    show_progress_bar=False
                )
            
            # Prepare data for LanceDB
            for entity, embedding in zip(batch, embeddings):
                data_to_insert.append({
                    'id': entity.get(entity_id_field),
                    'name': entity.get('name', ''),
                    'location': entity.get('location', ''),
                    'industry': entity.get('industry', ''),
                    'embedding': embedding,  # LanceDB handles numpy arrays
                    'full_entity': entity
                })
            
            logger.info(f"  Processed {min(i+batch_size, len(entities))}/{len(entities)}")
        
        # Create or update table
        if self.table is None:
            logger.info(f"Creating LanceDB table with {len(data_to_insert)} entities")
            self.table = self.db.create_table(
                self.table_name,
                data=data_to_insert,
                mode="overwrite"
            )
        else:
            logger.info(f"Appending {len(data_to_insert)} embeddings to existing table")
            self.table.add(data_to_insert)
        
        logger.info(f"Cached {len(data_to_insert)} entity embeddings in LanceDB")
        return len(data_to_insert)
    
    def search_similar_entities(
        self,
        query_entity: Dict[str, str],
        k: int = 5,
        threshold: float = 0.5
    ) -> List[Tuple[Dict, float]]:
        """
        Search for similar entities using cached embeddings.
        
        Args:
            query_entity: Entity to match
            k: Number of results to return
            threshold: Min similarity threshold
        
        Returns:
            List of (entity, similarity) tuples
        """
        
        # Encode query
        query_text = entity_to_text(query_entity)
        with torch.no_grad():
            query_embedding = self.model.encode(
                [query_text],
                convert_to_numpy=True
            )[0]
        
        # Search in LanceDB
        results = self.table.search(query_embedding).limit(k*2).to_list()
        
        # Filter by threshold and return
        matches = []
        for result in results:
            # Compute similarity from distance
            distance = result.get('_distance', 1.0)
            similarity = 1 - distance  # L2 distance to similarity
            
            if similarity >= threshold:
                matches.append((result['full_entity'], similarity))
        
        return matches[:k]
    
    def batch_search(
        self,
        query_entities: List[Dict[str, str]],
        k: int = 5,
        threshold: float = 0.5
    ) -> List[List[Tuple[Dict, float]]]:
        """
        Search for multiple entities in batch.
        """
        results = []
        for entity in query_entities:
            matches = self.search_similar_entities(entity, k, threshold)
            results.append(matches)
        return results


def entity_to_text(entity: Dict[str, str], sep: str = " | ") -> str:
    """Convert entity dict to text format."""
    parts = []
    for field in ['name', 'location', 'industry']:
        if field in entity and entity[field]:
            parts.append(f"{field.upper()}: {entity[field]}")
    return sep.join(parts) or "UNKNOWN"


class EntityMatcher:
    """End-to-end entity matching with DeBERTa adapter."""
    
    def __init__(
        self,
        model_path: str,
        lancedb_path: str = "scrapus_data/lancedb",
        device: str = "mps",
        similarity_threshold: float = 0.7
    ):
        logger.info(f"Loading model from {model_path}")
        self.model = SentenceTransformer(model_path)
        self.model = self.model.to(device)
        self.model.eval()
        
        self.cache = EntityEmbeddingCache(
            self.model,
            db_path=lancedb_path,
            device=device
        )
        
        self.similarity_threshold = similarity_threshold
    
    def match_entity(
        self,
        entity: Dict[str, str],
        k: int = 5
    ) -> Tuple[bool, float, Dict | None]:
        """
        Match entity against cached database.
        
        Returns:
            (is_match, confidence, matched_entity or None)
        """
        
        # Search in cache
        results = self.cache.search_similar_entities(
            entity, k=k, threshold=0.3  # Lower threshold to get candidates
        )
        
        if not results:
            return False, 0.0, None
        
        # Get best match
        best_match_entity, best_similarity = results[0]
        
        is_match = best_similarity >= self.similarity_threshold
        
        return is_match, best_similarity, best_match_entity if is_match else None
    
    def precompute_embeddings(self, entities: List[Dict[str, str]]):
        """Precompute embeddings for all entities."""
        return self.cache.precompute_entity_embeddings(entities)
