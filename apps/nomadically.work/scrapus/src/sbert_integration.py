"""
Integration example: SBERT blocking with SQLite graph store.

Shows how to:
1. Load entities from SQLite companies table
2. Run SBERT blocking
3. Store blocks and use for incremental ER
"""

import sqlite3
import logging
from sbert_blocker import SBERTBlocker

logger = logging.getLogger(__name__)


class EntityResolutionPipeline:
    """End-to-end ER pipeline with SBERT blocking."""
    
    def __init__(self, db_path: str = "scrapus_data/entity_resolution.db"):
        self.db_path = db_path
        self.blocker = SBERTBlocker(db_path=db_path)
    
    def resolve_new_entity(self, entity: Dict) -> Dict:
        """
        Resolve new entity: blocking -> matching -> merge.
        
        Args:
            entity: New entity dict with name, location, industry
        
        Returns:
            Match result: {"match_id": int, "confidence": float, "action": "merge|create"}
        """
        # 1. Encode entity
        embeddings = self.blocker.encode([entity])
        embedding = embeddings[entity["id"]]
        
        # 2. Get candidate entities via blocking
        candidates = self.blocker.block_entity(entity, embedding)
        logger.info(f"Blocking found {len(candidates)} candidates")
        
        # 3. Deep matching (would use DeBERTa in production)
        best_match = None
        best_score = 0.0
        
        for cand_id in candidates:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, location FROM companies WHERE id = ?", (cand_id,))
            row = cursor.fetchone()
            conn.close()
            
            if row:
                cand_entity = {"id": row[0], "name": row[1], "location": row[2]}
                score = self._match_score(entity, cand_entity)
                
                if score > best_score:
                    best_score = score
                    best_match = cand_entity
        
        # 4. Decision: merge or create
        if best_score > 0.85:
            self._merge_entities(best_match["id"], entity)
            return {"match_id": best_match["id"], "confidence": best_score, "action": "merge"}
        else:
            self._create_entity(entity)
            return {"match_id": entity["id"], "confidence": 0.0, "action": "create"}
    
    def _match_score(self, entity1: Dict, entity2: Dict) -> float:
        """Placeholder for deep matching score."""
        # In production: use DeBERTa adapter
        from difflib import SequenceMatcher
        
        name_ratio = SequenceMatcher(
            None,
            str(entity1.get("name", "")).lower(),
            str(entity2.get("name", "")).lower()
        ).ratio()
        
        return name_ratio
    
    def _merge_entities(self, target_id: int, source: Dict):
        """Merge source entity into target."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE companies
            SET name = COALESCE(?, name),
                location = COALESCE(?, location),
                industry = COALESCE(?, industry),
                updated_at = unixepoch('subsec')
            WHERE id = ?
        """, (
            source.get("name"),
            source.get("location"),
            source.get("industry"),
            target_id
        ))
        
        conn.commit()
        conn.close()
        logger.info(f"Merged entity into {target_id}")
    
    def _create_entity(self, entity: Dict):
        """Create new entity in SQLite."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO companies (name, location, industry, created_at, updated_at)
            VALUES (?, ?, ?, unixepoch('subsec'), unixepoch('subsec'))
        """, (
            entity.get("name"),
            entity.get("location"),
            entity.get("industry")
        ))
        
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        logger.info(f"Created new entity {new_id}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    pipeline = EntityResolutionPipeline()
    
    # Example: resolve new entity
    new_entity = {
        "id": 999,
        "name": "Acme Corporation",
        "location": "Berlin",
        "industry": "cybersecurity"
    }
    
    result = pipeline.resolve_new_entity(new_entity)
    print(f"Resolution result: {result}")
