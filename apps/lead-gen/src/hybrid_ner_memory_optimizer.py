import gc
import psutil
import torch
from contextlib import contextmanager
from typing import Optional

class M1MemoryManager:
    """Manage model loading/unloading for M1 16GB constraint."""
    
    def __init__(self, max_memory_mb: int = 480):
        self.max_memory_mb = max_memory_mb
        self.current_memory_mb = 0
        self.loaded_models = {}
        
    def get_memory_usage(self) -> float:
        """Get current process memory in MB."""
        proc = psutil.Process()
        return proc.memory_info().rss / (1024 * 1024)
    
    @contextmanager
    def load_model_context(self, model_name: str, loader_func, max_size_mb: int = 300):
        """Context manager: load model, track memory, unload on exit.
        
        Usage:
            with mem_manager.load_model_context("distilbert", load_bert_ner) as model:
                results = model.predict(texts)
        """
        before_mb = self.get_memory_usage()
        
        print(f"[M1] Loading {model_name} (target {max_size_mb}MB)")
        model = loader_func()
        self.loaded_models[model_name] = model
        
        after_mb = self.get_memory_usage()
        delta_mb = after_mb - before_mb
        
        if delta_mb > max_size_mb * 1.2:
            print(f"[M1] WARNING: {model_name} used {delta_mb:.1f}MB (target {max_size_mb}MB)")
        
        self.current_memory_mb += delta_mb
        print(f"[M1] Total memory: {self.current_memory_mb:.1f}MB / {self.max_memory_mb}MB")
        
        try:
            yield model
        finally:
            # Cleanup
            print(f"[M1] Unloading {model_name}")
            del model
            if model_name in self.loaded_models:
                del self.loaded_models[model_name]
            gc.collect()
            torch.cuda.empty_cache() if torch.cuda.is_available() else None
            
            after_cleanup_mb = self.get_memory_usage()
            freed_mb = after_mb - after_cleanup_mb
            self.current_memory_mb -= freed_mb
            print(f"[M1] Memory after cleanup: {self.current_memory_mb:.1f}MB")


class HybridNERPipeline:
    """Complete M1-optimized hybrid NER pipeline."""
    
    def __init__(self, 
                 bert_model_path: str = "distilbert-base-uncased",
                 gliner_model_path: str = "urchade/gliner2-base",
                 max_memory_mb: int = 480):
        self.mem_manager = M1MemoryManager(max_memory_mb)
        self.router = HybridNERRouter()
        self.resolver = ConflictResolver()
        self.normalizer = ScoreNormalizer()
        
        self.bert_model_path = bert_model_path
        self.gliner_model_path = gliner_model_path
        
        # Lazy load (don't load until needed)
        self.rule_matcher = self._init_rule_matcher()
    
    def _init_rule_matcher(self):
        """Initialize deterministic rule patterns."""
        import re
        return {
            "EMAIL": re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            "PHONE": re.compile(r'\+?1?\s?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'),
            "URL": re.compile(r'https?://[^\s]+'),
            "DATE": re.compile(r'\b\d{1,2}/\d{1,2}/\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b'),
            "IP_ADDRESS": re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b'),
            "FUNDING_ROUND": re.compile(
                r'\b(Seed|Series\s+[A-Z]|Pre-Seed|IPO|Private Placement|Round\s+[0-9]+)\b',
                re.IGNORECASE
            ),
        }
    
    def _extract_rule_entities(self, text: str) -> List[Entity]:
        """Extract deterministic patterns from text."""
        entities = []
        
        for entity_type, pattern in self.rule_matcher.items():
            for match in pattern.finditer(text):
                entities.append(Entity(
                    text=match.group(),
                    type=entity_type,
                    start=match.start(),
                    end=match.end(),
                    confidence=0.99,  # Rules are deterministic
                    source="rule"
                ))
        
        return entities
    
    def _load_and_extract_bert(self, text: str) -> List[Entity]:
        """Load DistilBERT, extract, unload."""
        from transformers import pipeline
        
        def load_bert():
            return pipeline(
                "token-classification",
                model=self.bert_model_path,
                aggregation_strategy="simple"
            )
        
        with self.mem_manager.load_model_context("distilbert", load_bert, max_size_mb=250) as ner:
            results = ner(text)
            entities = []
            
            for result in results:
                entity = Entity(
                    text=result['word'].replace(' ##', ''),
                    type=result['entity_group'],
                    start=result.get('start', 0),
                    end=result.get('end', len(text)),
                    confidence=result.get('score', 0.5),
                    source="distilbert"
                )
                entities.append(entity)
            
            return entities
    
    def _load_and_extract_gliner(self, text: str, entity_types: List[str]) -> List[Entity]:
        """Load GLiNER2, extract, unload."""
        from gliner import GLiNER
        
        def load_gliner():
            return GLiNER.from_pretrained(self.gliner_model_path)
        
        with self.mem_manager.load_model_context("gliner", load_gliner, max_size_mb=200) as model:
            results = model.predict_entities(
                text,
                entity_types,
                threshold=0.5
            )
            
            entities = []
            for result in results:
                entity = Entity(
                    text=result['text'],
                    type=result['label'],
                    start=result['start'],
                    end=result['end'],
                    confidence=result['score'],
                    source="gliner"
                )
                entities.append(entity)
            
            return entities
    
    def process(self, text: str, 
                entity_types: Optional[List[str]] = None) -> List[Entity]:
        """Full pipeline: run appropriate models, resolve conflicts, return final entities.
        
        Args:
            text: Input text to extract entities from
            entity_types: List of entity types to extract. If None, extract all.
        
        Returns:
            List of Entity objects with normalized confidence scores
        """
        if entity_types is None:
            entity_types = list(self.router.TYPE_ROUTING.keys())
        
        # Stage 1: Rule-based (always run, fast)
        print(f"[Pipeline] Stage 1: Rule-based extraction")
        rule_entities = self._extract_rule_entities(text)
        print(f"  Found {len(rule_entities)} rule entities")
        
        predictions = {"rule": rule_entities}
        
        # Stage 2: DistilBERT (if high-frequency types needed)
        if self.router.should_run_model("distilbert", entity_types):
            print(f"[Pipeline] Stage 2: DistilBERT extraction")
            bert_entities = self._load_and_extract_bert(text)
            print(f"  Found {len(bert_entities)} BERT entities")
            predictions["distilbert"] = bert_entities
        
        # Stage 3: GLiNER2 (if zero-shot types needed)
        if self.router.should_run_model("gliner", entity_types):
            print(f"[Pipeline] Stage 3: GLiNER2 extraction")
            zero_shot_types = [
                et for et in entity_types 
                if self.router.route_entity_type(et) == EntityTypeCategory.ZERO_SHOT
            ]
            if zero_shot_types:
                gliner_entities = self._load_and_extract_gliner(text, zero_shot_types)
                print(f"  Found {len(gliner_entities)} GLiNER entities")
                predictions["gliner"] = gliner_entities
        
        # Stage 4: Normalize confidence scores
        print(f"[Pipeline] Stage 4: Confidence normalization")
        normalized = self.normalizer.normalize_scores({
            k: [
                {"text": e.text, "type": e.type, "confidence": e.confidence, "source": e.source}
                for e in v
            ]
            for k, v in predictions.items()
        })
        
        # Stage 5: Conflict resolution
        print(f"[Pipeline] Stage 5: Conflict resolution")
        rule_ents = [e for e in rule_entities]
        bert_ents = predictions.get("distilbert", [])
        gliner_ents = predictions.get("gliner", [])
        
        final_entities = self.resolver.resolve_conflicts(rule_ents, bert_ents, gliner_ents)
        
        print(f"[Pipeline] Complete: {len(final_entities)} final entities")
        return final_entities
