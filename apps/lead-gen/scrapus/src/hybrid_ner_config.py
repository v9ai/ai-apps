# deployment_config.yaml
HYBRID_NER_CONFIG = {
    "models": {
        "distilbert": {
            "model_id": "distilbert-base-uncased",
            "model_type": "token-classification",
            "entity_types": ["ORG", "PERSON", "LOCATION", "PRODUCT"],
            "confidence_threshold": 0.75,
            "max_memory_mb": 250,
            "calibration_temperature": 1.15,  # From calibration phase
        },
        "gliner": {
            "model_id": "urchade/gliner2-base",
            "model_type": "zero-shot-ner",
            "entity_types": ["TECHNOLOGY", "FUNDING_AMOUNT", "INDUSTRY", "COMPETITOR"],
            "confidence_threshold": 0.55,
            "max_memory_mb": 200,
            "calibration_temperature": 0.95,
        },
        "spacy_rules": {
            "patterns": {
                "EMAIL": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
                "PHONE": r'\+?1?\s?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',
                "URL": r'https?://[^\s]+',
                "DATE": r'\b\d{1,2}/\d{1,2}/\d{2,4}\b',
                "IP_ADDRESS": r'\b(?:\d{1,3}\.){3}\d{1,3}\b',
                "FUNDING_ROUND": r'\b(Seed|Series\s+[A-Z]|IPO)\b',
            },
            "confidence": 0.99,
        }
    },
    "ensemble": {
        "conflict_resolution": "weighted_voting",
        "weights": {
            "rule": 1.0,
            "distilbert": 0.85,
            "gliner": 0.70,
        },
        "min_overlap_ratio": 0.5,
    },
    "memory": {
        "max_total_mb": 480,
        "os_headroom_mb": 3500,
        "max_M1_utilization": 0.3,
    },
    "output_format": {
        "include_confidence": True,
        "include_source": True,
        "normalize_types": True,
    }
}
