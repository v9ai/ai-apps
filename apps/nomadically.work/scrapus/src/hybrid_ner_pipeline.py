# scrapus/module-2-extraction/hybrid_ner_pipeline.py

from hybrid_ner_ensemble import (
    HybridNERPipeline,
    M1MemoryManager,
    ConflictResolver,
    ScoreNormalizer,
)

# Initialize once at startup
hybrid_ner = HybridNERPipeline(
    bert_model_path="distilbert-base-uncased",
    gliner_model_path="urchade/gliner2-base",
    max_memory_mb=480
)

async def extract_entities_from_page(clean_text: str) -> list:
    """Extract entities using hybrid pipeline."""
    
    # Process text through all 3 systems
    final_entities = hybrid_ner.process(
        clean_text,
        entity_types=["ORG", "PERSON", "LOCATION", "PRODUCT", 
                     "EMAIL", "PHONE", "TECHNOLOGY", "FUNDING_ROUND"]
    )
    
    # Convert to page profile format
    return [
        {
            "name": entity.text,
            "type": entity.type,
            "span": [entity.start, entity.end],
            "confidence": entity.confidence,
            "source": entity.source,
        }
        for entity in final_entities
    ]
