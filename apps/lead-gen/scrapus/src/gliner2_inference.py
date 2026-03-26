"""
M1OptimizedNER: Production inference class for GLiNER2 on Apple M1
Supports both CoreML (Neural Engine) and ONNX (CPU fallback)
"""

import json
import logging
import time
from typing import Dict, List, Optional, Tuple, Union
from dataclasses import dataclass, asdict, field
from pathlib import Path
import numpy as np
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    import onnxruntime as ort
    import coremltools as ct
    from transformers import AutoTokenizer
except ImportError as e:
    logger.error(f"Missing dependencies: {e}")
    raise


@dataclass
class Entity:
    """Extracted entity"""
    text: str
    type: str  # ORG, PERSON, LOCATION, PRODUCT, FUNDING_ROUND, TECHNOLOGY
    span: Tuple[int, int]  # (start, end) character positions
    confidence: float
    
    def to_dict(self) -> Dict:
        return {
            "text": self.text,
            "type": self.type,
            "span": self.span,
            "confidence": float(self.confidence),
        }


@dataclass
class NERPrediction:
    """Result from NER inference"""
    text: str
    entities: List[Entity]
    inference_time_ms: float
    model_used: str  # "coreml" or "onnx"
    confidence_scores: Dict[str, float] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "text": self.text,
            "entities": [e.to_dict() for e in self.entities],
            "inference_time_ms": float(self.inference_time_ms),
            "model_used": self.model_used,
            "confidence_scores": self.confidence_scores,
        }


@dataclass
class M1OptimizedNERConfig:
    """Configuration for M1 optimized NER"""
    model_bundle_dir: str
    primary_backend: str = "coreml"  # "coreml" or "onnx"
    fallback_backend: str = "onnx"
    tokenizer_name: str = "urchade/gliner2-base"
    max_seq_length: int = 512
    entity_confidence_threshold: float = 0.5
    batch_size: int = 32
    num_threads: int = 4
    enable_fallback: bool = True
    
    # Entity types to extract
    entity_types: List[str] = field(default_factory=lambda: [
        "ORG", "PERSON", "LOCATION", "PRODUCT", "FUNDING_ROUND", "TECHNOLOGY"
    ])


class M1OptimizedNER:
    """
    Production-ready NER inference class for Apple M1/M2/M3.
    
    Features:
    - Primary CoreML (Neural Engine) + ONNX fallback
    - Batch processing for high throughput
    - Async processing
    - Benchmark and monitoring
    """
    
    def __init__(self, config: M1OptimizedNERConfig):
        self.config = config
        self.tokenizer = AutoTokenizer.from_pretrained(config.tokenizer_name)
        
        # Load models
        self.coreml_session = None
        self.onnx_session = None
        self.fallback_in_use = False
        
        self._load_models()
        
        # Performance tracking
        self.inference_times = []
        self.batch_sizes_processed = []
        self._lock = threading.Lock()
        
        logger.info(f"Initialized M1OptimizedNER with config: {config}")
    
    def _load_models(self):
        """Load CoreML and ONNX models from bundle"""
        
        bundle_path = Path(self.config.model_bundle_dir)
        
        # Try loading CoreML
        if self.config.primary_backend == "coreml":
            try:
                coreml_model = bundle_path / "model.mlmodel"
                if coreml_model.exists():
                    self.coreml_session = ct.models.MLModel(str(coreml_model))
                    logger.info(f"Loaded CoreML model: {coreml_model}")
                else:
                    logger.warning(f"CoreML model not found: {coreml_model}")
            except Exception as e:
                logger.warning(f"Failed to load CoreML model: {e}")
        
        # Load ONNX fallback
        try:
            onnx_model = bundle_path / "model_fallback.onnx"
            if onnx_model.exists():
                self.onnx_session = ort.InferenceSession(
                    str(onnx_model),
                    providers=["CoreMLExecutionProvider", "CPUExecutionProvider"]
                )
                logger.info(f"Loaded ONNX model: {onnx_model}")
            else:
                logger.warning(f"ONNX model not found: {onnx_model}")
        except Exception as e:
            logger.warning(f"Failed to load ONNX model: {e}")
        
        # Verify at least one model loaded
        if not self.coreml_session and not self.onnx_session:
            raise RuntimeError(
                "Failed to load both CoreML and ONNX models. "
                "Check bundle directory and model files."
            )
        
        # Determine which backend to use
        if self.coreml_session:
            logger.info("Using CoreML (Neural Engine) as primary backend")
            self.active_backend = "coreml"
        else:
            logger.warning("CoreML not available, using ONNX (CPU) backend")
            self.active_backend = "onnx"
            self.fallback_in_use = True
    
    def extract(
        self,
        text: str,
        entity_types: Optional[List[str]] = None,
    ) -> NERPrediction:
        """
        Extract entities from single text (synchronous).
        
        Args:
            text: Input text
            entity_types: Override default entity types
        
        Returns:
            NERPrediction with extracted entities
        """
        
        if entity_types is None:
            entity_types = self.config.entity_types
        
        start_time = time.perf_counter()
        
        try:
            # Tokenize
            inputs = self._tokenize_text(text)
            
            # Inference
            if self.active_backend == "coreml":
                outputs = self._inference_coreml(inputs)
            else:
                outputs = self._inference_onnx(inputs)
            
            # Post-process
            entities = self._postprocess_outputs(
                text, outputs, entity_types
            )
            
            inference_time = (time.perf_counter() - start_time) * 1000
            
            # Track performance
            with self._lock:
                self.inference_times.append(inference_time)
            
            return NERPrediction(
                text=text,
                entities=entities,
                inference_time_ms=inference_time,
                model_used=self.active_backend,
            )
            
        except Exception as e:
            logger.error(f"Inference failed: {e}")
            
            # Attempt fallback
            if self.config.enable_fallback and self.onnx_session:
                logger.info("Attempting ONNX fallback...")
                try:
                    inputs = self._tokenize_text(text)
                    outputs = self._inference_onnx(inputs)
                    entities = self._postprocess_outputs(
                        text, outputs, entity_types
                    )
                    
                    inference_time = (time.perf_counter() - start_time) * 1000
                    self.fallback_in_use = True
                    
                    return NERPrediction(
                        text=text,
                        entities=entities,
                        inference_time_ms=inference_time,
                        model_used="onnx_fallback",
                    )
                except Exception as fallback_e:
                    logger.error(f"Fallback also failed: {fallback_e}")
                    raise
            else:
                raise
    
    def extract_batch(
        self,
        texts: List[str],
        entity_types: Optional[List[str]] = None,
        show_progress: bool = True,
    ) -> List[NERPrediction]:
        """
        Extract entities from batch of texts (optimized for throughput).
        
        Args:
            texts: List of input texts
            entity_types: Override default entity types
            show_progress: Print progress bar
        
        Returns:
            List of NERPrediction results
        """
        
        if entity_types is None:
            entity_types = self.config.entity_types
        
        results = []
        batch_size = self.config.batch_size
        
        for batch_start in range(0, len(texts), batch_size):
            batch_end = min(batch_start + batch_size, len(texts))
            batch = texts[batch_start:batch_end]
            
            # Tokenize batch
            batch_inputs = self._tokenize_batch(batch)
            
            # Inference
            start_time = time.perf_counter()
            if self.active_backend == "coreml":
                batch_outputs = self._inference_coreml_batch(batch_inputs)
            else:
                batch_outputs = self._inference_onnx_batch(batch_inputs)
            
            inference_time = (time.perf_counter() - start_time) * 1000
            
            # Post-process
            for i, text in enumerate(batch):
                outputs_i = {k: v[i] if isinstance(v, np.ndarray) else v
                            for k, v in batch_outputs.items()}
                entities = self._postprocess_outputs(
                    text, outputs_i, entity_types
                )
                
                results.append(NERPrediction(
                    text=text,
                    entities=entities,
                    inference_time_ms=inference_time / len(batch),
                    model_used=self.active_backend,
                ))
            
            with self._lock:
                self.batch_sizes_processed.append(len(batch))
            
            if show_progress:
                logger.info(
                    f"Processed {batch_end}/{len(texts)} texts "
                    f"({inference_time:.1f}ms for batch of {len(batch)})"
                )
        
        return results
    
    async def extract_async(
        self,
        text: str,
        entity_types: Optional[List[str]] = None,
    ) -> NERPrediction:
        """
        Async extraction for integration with async frameworks.
        """
        
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor(max_workers=1) as executor:
            return await loop.run_in_executor(
                executor,
                self.extract,
                text,
                entity_types,
            )
    
    def _tokenize_text(self, text: str) -> Dict[str, np.ndarray]:
        """Tokenize single text"""
        inputs = self.tokenizer(
            text,
            max_length=self.config.max_seq_length,
            padding="max_length",
            truncation=True,
            return_tensors="np",
        )
        return {k: v.astype(np.int32) for k, v in inputs.items()}
    
    def _tokenize_batch(self, texts: List[str]) -> Dict[str, np.ndarray]:
        """Tokenize batch with dynamic padding"""
        inputs = self.tokenizer(
            texts,
            max_length=self.config.max_seq_length,
            padding="max_length",
            truncation=True,
            return_tensors="np",
        )
        return {k: v.astype(np.int32) for k, v in inputs.items()}
    
    def _inference_coreml(
        self,
        inputs: Dict[str, np.ndarray],
    ) -> Dict[str, np.ndarray]:
        """CoreML inference"""
        try:
            outputs = self.coreml_session.predict(inputs)
            return outputs
        except Exception as e:
            logger.error(f"CoreML inference failed: {e}")
            if self.onnx_session:
                logger.info("Falling back to ONNX")
                return self._inference_onnx(inputs)
            raise
    
    def _inference_coreml_batch(
        self,
        inputs: Dict[str, np.ndarray],
    ) -> Dict[str, np.ndarray]:
        """CoreML batch inference"""
        # CoreML processes single samples, loop over batch
        batch_size = inputs["input_ids"].shape[0]
        outputs = {}
        
        for i in range(batch_size):
            sample = {k: v[i:i+1] for k, v in inputs.items()}
            sample_outputs = self._inference_coreml(sample)
            
            # Accumulate outputs
            for k, v in sample_outputs.items():
                if k not in outputs:
                    outputs[k] = [v]
                else:
                    outputs[k].append(v)
        
        # Stack outputs
        outputs = {k: np.vstack(v) for k, v in outputs.items()}
        return outputs
    
    def _inference_onnx(
        self,
        inputs: Dict[str, np.ndarray],
    ) -> Dict[str, np.ndarray]:
        """ONNX inference"""
        outputs = self.onnx_session.run(None, inputs)
        
        # Convert list outputs to dict
        if isinstance(outputs, list):
            # Assuming outputs are [entity_span_logits, entity_type_logits]
            return {
                "entity_span_logits": outputs[0],
                "entity_type_logits": outputs[1] if len(outputs) > 1 else outputs[0],
            }
        return outputs
    
    def _inference_onnx_batch(
        self,
        inputs: Dict[str, np.ndarray],
    ) -> Dict[str, np.ndarray]:
        """ONNX batch inference"""
        return self._inference_onnx(inputs)
    
    def _postprocess_outputs(
        self,
        text: str,
        outputs: Dict[str, np.ndarray],
        entity_types: List[str],
    ) -> List[Entity]:
        """
        Post-process model outputs to extract entities.
        
        Converts span logits and type logits to entities with confidence scores.
        """
        
        entities = []
        
        # Extract span predictions from biaffine logits
        span_logits = outputs.get("entity_span_logits", np.array([]))[0]
        type_logits = outputs.get("entity_type_logits", np.array([]))[0]
        
        if span_logits.size == 0:
            return entities
        
        # Find spans with high confidence
        threshold = self.config.entity_confidence_threshold
        seq_len = span_logits.shape[0] if span_logits.ndim > 0 else 1
        
        # Decode span predictions (simplified)
        # In practice, use more sophisticated decoding (e.g., BIO tagging)
        for start in range(seq_len):
            for end in range(start + 1, min(start + 20, seq_len)):
                confidence = float(np.max(span_logits[start, end:end+1]))
                
                if confidence >= threshold:
                    # Decode span to text
                    token_ids = self.tokenizer.encode(text)[start:end]
                    span_text = self.tokenizer.decode(token_ids)
                    
                    # Determine entity type
                    if type_logits.size > 0:
                        type_scores = type_logits[start]
                        entity_type_idx = int(np.argmax(type_scores))
                        if entity_type_idx < len(entity_types):
                            entity_type = entity_types[entity_type_idx]
                        else:
                            entity_type = "UNKNOWN"
                    else:
                        entity_type = "UNKNOWN"
                    
                    # Find character span in original text
                    char_start = len(text) // seq_len * start
                    char_end = len(text) // seq_len * end
                    
                    entities.append(Entity(
                        text=span_text,
                        type=entity_type,
                        span=(char_start, char_end),
                        confidence=confidence,
                    ))
        
        return entities
    
    def get_metrics(self) -> Dict[str, float]:
        """Get inference performance metrics"""
        
        with self._lock:
            if not self.inference_times:
                return {}
            
            times = np.array(self.inference_times)
            
            return {
                "num_inferences": len(self.inference_times),
                "mean_inference_ms": float(np.mean(times)),
                "median_inference_ms": float(np.median(times)),
                "min_inference_ms": float(np.min(times)),
                "max_inference_ms": float(np.max(times)),
                "std_inference_ms": float(np.std(times)),
                "total_texts_processed": sum(self.batch_sizes_processed),
                "avg_batch_size": float(np.mean(self.batch_sizes_processed))
                    if self.batch_sizes_processed else 0,
                "fallback_in_use": self.fallback_in_use,
                "active_backend": self.active_backend,
            }


def main():
    # Example usage
    config = M1OptimizedNERConfig(
        model_bundle_dir="./models/gliner2_m1_bundle",
        primary_backend="coreml",
        batch_size=32,
    )
    
    ner = M1OptimizedNER(config)
    
    # Single text inference
    text = "Stripe raised $95B in Series H funding led by Sequoia Capital."
    result = ner.extract(text)
    
    logger.info(f"Entities found: {[e.to_dict() for e in result.entities]}")
    logger.info(f"Inference time: {result.inference_time_ms:.2f}ms")
    
    # Batch inference
    texts = [
        "Apple Inc. launched iPhone 15 with A17 Pro chip.",
        "Meta announced Llama 3.1 open source model.",
        "Google announced Gemini 2.0 with multimodal reasoning.",
    ]
    
    batch_results = ner.extract_batch(texts)
    
    logger.info(f"Processed {len(batch_results)} texts")
    
    # Metrics
    metrics = ner.get_metrics()
    logger.info(f"Performance metrics: {metrics}")
    
    return ner


if __name__ == "__main__":
    ner = main()
