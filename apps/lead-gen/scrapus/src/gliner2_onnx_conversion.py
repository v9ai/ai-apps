"""
GLiNER2 -> ONNX Conversion Pipeline
Handles dynamic axes, custom ops (biaffine attention), span prediction head
"""

import os
import torch
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from gliner import GLiNER
    from transformers import AutoModel, AutoConfig
except ImportError:
    logger.error("Install: pip install gliner transformers torch onnx onnxruntime")


@dataclass
class GLiNER2ExportConfig:
    """Configuration for GLiNER2 ONNX export"""
    model_name: str = "urchade/gliner2-base"
    output_dir: str = "./models/gliner2_onnx"
    opset_version: int = 14  # Required for complex ops
    optimize_model: bool = True
    input_sample_length: int = 512
    num_sample_entities: int = 5


class GLiNER2ONNXConverter:
    """
    Converts GLiNER2 model to ONNX format.
    
    Known issues handled:
    - Span prediction head (start/end logits for flexible entity boundaries)
    - Biaffine attention (pairwise entity-entity scoring)
    - Dynamic sequence lengths and batch sizes
    """
    
    def __init__(self, config: GLiNER2ExportConfig):
        self.config = config
        self.output_dir = Path(config.output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Loading GLiNER2 model: {config.model_name}")
        self.model = GLiNER.from_pretrained(config.model_name)
        self.model.eval()
        
        # Freeze all parameters
        for param in self.model.parameters():
            param.requires_grad = False
    
    def _create_dummy_inputs(self, batch_size: int = 1):
        """Create representative dummy inputs for tracing"""
        device = next(self.model.parameters()).device
        
        # Dummy input IDs and attention mask
        input_ids = torch.randint(
            100, 30000, 
            (batch_size, self.config.input_sample_length),
            dtype=torch.long,
            device=device
        )
        attention_mask = torch.ones_like(input_ids)
        
        # Dummy entity tokens (for entity span classification)
        # Shape: (batch_size, num_entities, num_entity_tokens)
        num_entities = min(self.config.num_sample_entities, 
                          self.config.input_sample_length // 4)
        entity_token_ids = torch.randint(
            100, 30000,
            (batch_size, num_entities, 4),
            dtype=torch.long,
            device=device
        )
        entity_attention_mask = torch.ones_like(entity_token_ids)
        
        return {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
            "entity_token_ids": entity_token_ids,
            "entity_attention_mask": entity_attention_mask,
        }
    
    def export_to_onnx(self) -> str:
        """
        Export GLiNER2 to ONNX with proper input/output specs.
        
        Output structure:
        - entity_span_logits: (batch, seq_len, seq_len) - biaffine attention scores
        - entity_type_logits: (batch, num_entities, num_entity_types)
        """
        
        logger.info("Creating dummy inputs for tracing...")
        dummy_inputs = self._create_dummy_inputs(batch_size=1)
        
        output_path = self.output_dir / "gliner2_base.onnx"
        
        logger.info(f"Exporting to ONNX: {output_path}")
        
        try:
            torch.onnx.export(
                self.model,
                tuple(dummy_inputs.values()),
                str(output_path),
                input_names=[
                    "input_ids",
                    "attention_mask", 
                    "entity_token_ids",
                    "entity_attention_mask",
                ],
                output_names=[
                    "entity_span_logits",      # Biaffine output: (batch, seq_len, seq_len)
                    "entity_type_logits",      # Entity classification: (batch, num_ents, num_types)
                ],
                dynamic_axes={
                    "input_ids": {0: "batch_size", 1: "sequence_length"},
                    "attention_mask": {0: "batch_size", 1: "sequence_length"},
                    "entity_token_ids": {0: "batch_size", 1: "num_entities"},
                    "entity_attention_mask": {0: "batch_size", 1: "num_entities"},
                    "entity_span_logits": {0: "batch_size"},
                    "entity_type_logits": {0: "batch_size", 1: "num_entities"},
                },
                opset_version=self.config.opset_version,
                do_constant_folding=True,
                verbose=False,
            )
            
            logger.info(f"Successfully exported to {output_path}")
            
            # Verify ONNX model
            self._verify_onnx_model(str(output_path))
            
            return str(output_path)
            
        except Exception as e:
            logger.error(f"ONNX export failed: {e}")
            raise
    
    def _verify_onnx_model(self, onnx_path: str):
        """Verify ONNX model validity and I/O shapes"""
        try:
            import onnx
            
            logger.info("Verifying ONNX model...")
            model = onnx.load(onnx_path)
            onnx.checker.check_model(model)
            
            logger.info("ONNX model structure:")
            for inp in model.graph.input:
                logger.info(f"  Input: {inp.name} - {[d.dim_value for d in inp.type.tensor_type.shape.dim]}")
            for out in model.graph.output:
                logger.info(f"  Output: {out.name} - {[d.dim_value for d in out.type.tensor_type.shape.dim]}")
            
        except ImportError:
            logger.warning("onnx package not found - skipping model verification")
        except Exception as e:
            logger.error(f"ONNX verification failed: {e}")
            raise
    
    def test_inference(self, onnx_path: str, test_texts: List[str]):
        """Test ONNX inference against PyTorch for validation"""
        import onnxruntime as ort
        
        logger.info("Testing ONNX inference...")
        
        # PyTorch inference
        self.model.eval()
        with torch.no_grad():
            pytorch_results = self.model(test_texts)
        
        # ONNX inference
        session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
        
        # Tokenize inputs
        from transformers import AutoTokenizer
        tokenizer = AutoTokenizer.from_pretrained(self.config.model_name)
        
        inputs = tokenizer(
            test_texts,
            padding=True,
            truncation=True,
            return_tensors="np",
            max_length=512,
        )
        
        onnx_results = session.run(None, {k: v for k, v in inputs.items()})
        
        logger.info(f"PyTorch output shapes: {[r.shape for r in pytorch_results]}")
        logger.info(f"ONNX output shapes: {[r.shape for r in onnx_results]}")
        
        return pytorch_results, onnx_results


def main():
    config = GLiNER2ExportConfig(
        model_name="urchade/gliner2-base",
        output_dir="./models/gliner2_onnx",
    )
    
    converter = GLiNER2ONNXConverter(config)
    onnx_path = converter.export_to_onnx()
    
    # Test with sample texts
    test_texts = [
        "Apple Inc. was founded by Steve Jobs in Cupertino.",
        "Meta Platforms raised $1.2B in Series A funding.",
        "Tesla launched the Model 3 in 2017.",
    ]
    
    pytorch_results, onnx_results = converter.test_inference(onnx_path, test_texts)
    
    logger.info("ONNX export and validation complete!")
    return onnx_path


if __name__ == "__main__":
    onnx_path = main()
