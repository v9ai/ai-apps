# File: /Users/vadimnicolai/Public/ai-apps/apps/lead-gen/scrapus/module-2-extraction/topic_extraction.py

"""
Module 2 Integration: Topic Modeling with Persistence
Replaces existing BERTopic with M1-optimized incremental version.
"""

import logging
from pathlib import Path
from typing import List, Dict, Optional
import pickle
import json

from topic_modeling_optimized import (
    BERTopicM1Optimized,
    MemoryProfiler,
    integrate_bertopic_optimized,
)

logger = logging.getLogger(__name__)


class TopicExtractionPipeline:
    """
    Stateful topic extraction with disk persistence.
    Loads persisted model on startup, updates incrementally with new docs.
    """
    
    def __init__(
        self,
        persistence_dir: str = "scrapus_data/persistence",
        batch_size: int = 500,
        enable_profiling: bool = False,
    ):
        self.persistence_dir = Path(persistence_dir)
        self.batch_size = batch_size
        self.enable_profiling = enable_profiling
        
        # Load or initialize model
        self.model = BERTopicM1Optimized(
            persistence_dir=str(self.persistence_dir)
        )
        
        # Metrics tracking
        self.extraction_metrics = {
            "total_documents_processed": 0,
            "total_batches_processed": 0,
            "peak_memory_mb": 0.0,
            "topics_discovered": set(),
        }
    
    def extract_topics(self, documents: List[str]) -> Dict:
        """
        Extract topics from documents.
        
        Returns:
            {
                "topics": [topic_id for each doc],
                "probabilities": [confidence array for each doc],
                "topic_info": {topic_id: [top_terms]},
                "memory_stats": {...},
            }
        """
        
        logger.info(f"Extracting topics from {len(documents)} documents")
        
        if self.enable_profiling:
            profiler = MemoryProfiler()
        
        # Fit model with incremental learning
        with self.model.memory_profiler.track("topic_extraction"):
            result = self.model.fit_batch(documents, batch_size=self.batch_size)
        
        # Extract topics
        topics = result["topics"]
        topic_info = {}
        for topic_id in set(topics):
            if topic_id != -1:  # -1 = outliers
                terms = self.model.get_topics(topic_id)
                topic_info[topic_id] = terms
        
        # Update metrics
        self.extraction_metrics["total_documents_processed"] += len(documents)
        self.extraction_metrics["topics_discovered"].update(set(topics))
        self.extraction_metrics["peak_memory_mb"] = max(
            self.extraction_metrics["peak_memory_mb"],
            result["memory"]["peak_rss_mb"],
        )
        
        return {
            "topics": topics,
            "probabilities": result["probabilities"],
            "topic_info": topic_info,
            "memory_stats": result["memory"],
        }
    
    def get_metrics(self) -> Dict:
        """Return extraction metrics."""
        return {
            **self.extraction_metrics,
            "topics_discovered": list(self.extraction_metrics["topics_discovered"]),
        }
    
    def save_metrics(self):
        """Persist metrics to disk."""
        metrics_file = self.persistence_dir / "topic_metrics.json"
        with open(metrics_file, "w") as f:
            metrics = self.get_metrics()
            metrics["topics_discovered"] = list(metrics["topics_discovered"])
            json.dump(metrics, f, indent=2)
        logger.info(f"Saved metrics to {metrics_file}")


# Integration with extraction worker
def extract_page_profile_with_topics(html_bytes: bytes, url: str) -> Dict:
    """
    Extract page profile including optimized topic modeling.
    
    Called from module-2 extraction worker.
    """
    from trafilatura import extract as extract_text
    
    # Parse HTML
    text = extract_text(html_bytes.decode("utf-8", errors="replace"))
    if not text or len(text.strip()) < 50:
        return None
    
    # Initialize topic pipeline (cached in memory)
    global _topic_pipeline
    if "_topic_pipeline" not in globals():
        _topic_pipeline = TopicExtractionPipeline(batch_size=500)
    
    # Extract entities (from module 2 existing code)
    # ... NER extraction code ...
    
    # Extract topics
    topic_result = _topic_pipeline.extract_topics([text])
    
    page_profile = {
        "url": url,
        "clean_text": text,
        "entities": [],  # From NER pipeline
        "relations": [],  # From relation extraction
        "topics": {
            "topic_id": topic_result["topics"][0],
            "topic_probability": topic_result["probabilities"][0],
            "topic_terms": topic_result["topic_info"].get(
                topic_result["topics"][0], []
            ),
        },
        "timestamp": time.time(),
    }
    
    return page_profile
