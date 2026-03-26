"""
Complete Integration Example: M1 GLiNER2 Pipeline
Demonstrates all components working together
"""

import logging
from pathlib import Path
from typing import List, Dict
from m1_optimized_ner import M1OptimizedNER, M1OptimizedNERConfig, NERPrediction
import json
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ScrapusM1Pipeline:
    """
    Complete Scrapus Module 2 extraction pipeline optimized for M1.
    """
    
    def __init__(self, model_bundle_dir: str = "./models/gliner2_m1_bundle"):
        self.model_bundle_dir = model_bundle_dir
        
        # Initialize NER model
        config = M1OptimizedNERConfig(
            model_bundle_dir=model_bundle_dir,
            primary_backend="coreml",
            batch_size=32,
            entity_types=[
                "ORG",
                "PERSON",
                "LOCATION",
                "PRODUCT",
                "FUNDING_ROUND",
                "TECHNOLOGY"
            ],
        )
        
        self.ner = M1OptimizedNER(config)
        logger.info("Initialized Scrapus M1 Pipeline")
    
    def process_page(self, page: Dict) -> Dict:
        """
        Process single page: extract entities, relationships, topics.
        
        Args:
            page: {
                "url": str,
                "title": str,
                "clean_text": str,
                "domain": str,
            }
        
        Returns:
            {
                "url": str,
                "entities": List[Entity],
                "extraction_metrics": {...},
                "quality_score": float,
            }
        """
        
        start_time = time.perf_counter()
        
        # Extract entities
        ner_result = self.ner.extract(
            page["clean_text"],
            entity_types=self.ner.config.entity_types,
        )
        
        # Quality scoring
        quality_score = self._compute_quality_score(ner_result)
        
        elapsed = time.perf_counter() - start_time
        
        return {
            "url": page.get("url", ""),
            "title": page.get("title", ""),
            "entities": [e.to_dict() for e in ner_result.entities],
            "entity_count": len(ner_result.entities),
            "extraction_metrics": {
                "inference_time_ms": ner_result.inference_time_ms,
                "model_used": ner_result.model_used,
                "entities_per_100_tokens": (
                    len(ner_result.entities) * 100 /
                    len(page["clean_text"].split())
                ),
            },
            "quality_score": quality_score,
            "processing_time_sec": elapsed,
        }
    
    def process_batch(
        self,
        pages: List[Dict],
        show_progress: bool = True,
    ) -> List[Dict]:
        """
        Process batch of pages efficiently.
        """
        
        logger.info(f"Processing {len(pages)} pages...")
        
        texts = [p["clean_text"] for p in pages]
        ner_results = self.ner.extract_batch(texts, show_progress=show_progress)
        
        results = []
        for page, ner_result in zip(pages, ner_results):
            quality_score = self._compute_quality_score(ner_result)
            
            results.append({
                "url": page.get("url", ""),
                "title": page.get("title", ""),
                "entities": [e.to_dict() for e in ner_result.entities],
                "entity_count": len(ner_result.entities),
                "extraction_metrics": {
                    "inference_time_ms": ner_result.inference_time_ms,
                    "model_used": ner_result.model_used,
                    "entities_per_100_tokens": (
                        len(ner_result.entities) * 100 /
                        len(page["clean_text"].split())
                        if page["clean_text"] else 0
                    ),
                },
                "quality_score": quality_score,
            })
        
        return results
    
    def _compute_quality_score(self, ner_result: NERPrediction) -> float:
        """
        Compute extraction quality score (0-1).
        
        Factors:
        - Average entity confidence
        - Entity diversity
        - Inference time (faster = more likely production-ready)
        """
        
        if not ner_result.entities:
            return 0.0
        
        # Average confidence
        avg_confidence = sum(e.confidence for e in ner_result.entities) / len(ner_result.entities)
        
        # Entity type diversity (reward multiple types)
        entity_types = set(e.type for e in ner_result.entities)
        type_diversity = len(entity_types) / len(ner_result.config.entity_types)
        
        # Inference time score (penalize slow inference)
        inference_score = max(0, 1 - ner_result.inference_time_ms / 100)
        
        # Combined score
        quality = (
            0.5 * avg_confidence +
            0.2 * type_diversity +
            0.3 * inference_score
        )
        
        return min(1.0, max(0.0, quality))
    
    def get_pipeline_metrics(self) -> Dict:
        """Get overall pipeline performance metrics"""
        
        ner_metrics = self.ner.get_metrics()
        
        return {
            "ner_metrics": ner_metrics,
            "pipeline_summary": {
                "primary_backend": self.ner.active_backend,
                "fallback_active": self.ner.fallback_in_use,
                "entity_types_supported": len(self.ner.config.entity_types),
            },
        }


# Example usage
def main():
    # Create pipeline
    pipeline = ScrapusM1Pipeline(
        model_bundle_dir="./models/gliner2_m1_bundle"
    )
    
    # Sample B2B pages
    sample_pages = [
        {
            "url": "https://techcrunch.com/stripe-series-h",
            "title": "Stripe Raises $95B in Series H Funding",
            "clean_text": (
                "Stripe announced today that it has raised $95B in Series H funding "
                "in a round led by Sequoia Capital. The fintech company, founded by "
                "Patrick and John Collison, now has a valuation of $95B. "
                "CEO Patrick Collison said in a statement that the funding will help "
                "the company expand its AI-powered payment processing platform across "
                "new markets in Asia and Europe."
            ),
            "domain": "techcrunch.com",
        },
        {
            "url": "https://openai.com/llama-3-announcement",
            "title": "Meta Releases Llama 3.1 Open Source Model",
            "clean_text": (
                "Meta Platforms announced the release of Llama 3.1, a new open source "
                "large language model with 405B parameters. The model was trained by "
                "Meta AI researchers and is available for commercial and research use. "
                "Llama 3.1 outperforms GPT-4 on several benchmarks including MMLU. "
                "Mark Zuckerberg, Meta CEO, stated that open source AI is critical for "
                "democratizing artificial intelligence."
            ),
            "domain": "openai.com",
        },
        {
            "url": "https://apple.com/iphone-15-announcement",
            "title": "Apple Unveils iPhone 15 with A17 Pro Chip",
            "clean_text": (
                "Apple Inc. today announced iPhone 15, featuring the new A17 Pro chip "
                "manufactured using TSMC's cutting-edge 3nm process. Tim Cook, Apple CEO, "
                "unveiled the device at Apple Park in Cupertino, California. "
                "The A17 Pro features 6 CPU cores and 6 GPU cores, providing 20% "
                "performance improvement over the A16 Bionic. iPhone 15 will be available "
                "in five colors starting September 22."
            ),
            "domain": "apple.com",
        },
    ]
    
    # Process batch
    logger.info("Processing B2B pages...")
    results = pipeline.process_batch(sample_pages)
    
    # Print results
    for result in results:
        logger.info(f"\nPage: {result['title']}")
        logger.info(f"Entities extracted: {result['entity_count']}")
        logger.info(f"Quality score: {result['quality_score']:.2f}")
        logger.info(f"Inference time: {result['extraction_metrics']['inference_time_ms']:.2f}ms")
        
        for entity in result["entities"][:5]:  # Show first 5
            logger.info(f"  - {entity['text']} ({entity['type']}) [{entity['confidence']:.2f}]")
    
    # Print pipeline metrics
    metrics = pipeline.get_pipeline_metrics()
    logger.info(f"\nPipeline Metrics:")
    logger.info(json.dumps(metrics, indent=2))
    
    return results


if __name__ == "__main__":
    results = main()
