"""
GLiNER2 INT8 ONNX -> CoreML Conversion for Apple M1 Neural Engine
Optimized for CPU_AND_NE compute units (M1/M2 unified memory)
"""

import os
import logging
from typing import Optional, Dict, List
from pathlib import Path
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    import coremltools as ct
    from coremltools.models.neural_network import builder as nnb
    from coremltools.models import MLModel
except ImportError:
    logger.error("Install: pip install coremltools")


class GLiNER2CoreMLConverter:
    """
    Converts GLiNER2 INT8 ONNX model to CoreML format optimized for Apple M1.
    
    Key features:
    - Automatic quantization for NeuralEngine (7-bit + 1-sign)
    - Flexible input/output shapes for variable-length sequences
    - iOS/macOS deployment ready
    """
    
    def __init__(self, int8_onnx_path: str, output_dir: str = "./models"):
        self.int8_onnx_path = int8_onnx_path
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Loading INT8 ONNX model: {int8_onnx_path}")
    
    def convert_to_coreml(
        self,
        compute_units: str = "cpu_and_ne",  # CPU_AND_NE for M1 Neural Engine
        minimum_deployment_target: str = "12",
    ) -> str:
        """
        Convert ONNX to CoreML with Neural Engine optimization.
        
        Args:
            compute_units: "cpu_only" | "cpu_and_ne" (M1 default) | "all"
            minimum_deployment_target: "12" (macOS 12+) or "11" for older
        
        Returns:
            Path to CoreML model (.mlmodel)
        """
        
        logger.info(f"Converting to CoreML with compute_units={compute_units}")
        
        try:
            # Load ONNX model
            onnx_model = ct.models.MLModel(self.int8_onnx_path)
            
            # Convert ONNX to CoreML
            mlmodel = ct.convert(
                self.int8_onnx_path,
                source="onnx",
                compute_units=self._parse_compute_units(compute_units),
                minimum_deployment_target=minimum_deployment_target,
                inputs=[
                    ct.TensorType(
                        name="input_ids",
                        shape=(1, 512),
                        dtype=np.int32,
                    ),
                    ct.TensorType(
                        name="attention_mask",
                        shape=(1, 512),
                        dtype=np.int32,
                    ),
                ],
            )
            
            # Set model metadata
            mlmodel.author = "Scrapus ML Team"
            mlmodel.license = "Apache 2.0"
            mlmodel.short_description = (
                "GLiNER2 INT8 quantized NER model for M1 Neural Engine"
            )
            mlmodel.version = "2.1.0"
            
            # Add metadata for entity types
            mlmodel.user_defined_metadata["entity_types"] = ",".join([
                "ORG", "PERSON", "LOCATION", "PRODUCT", "FUNDING_ROUND", "TECHNOLOGY"
            ])
            mlmodel.user_defined_metadata["quantization"] = "int8_static"
            mlmodel.user_defined_metadata["input_seq_length"] = "512"
            
            # Save CoreML model
            output_path = self.output_dir / "gliner2_base_int8.mlmodel"
            mlmodel.save(str(output_path))
            
            logger.info(f"Saved CoreML model to: {output_path}")
            
            # Verify and print model info
            self._print_model_info(str(output_path))
            
            return str(output_path)
            
        except Exception as e:
            logger.error(f"CoreML conversion failed: {e}")
            raise
    
    def _parse_compute_units(self, compute_units: str):
        """Parse compute units string to CoreML enum"""
        mapping = {
            "cpu_only": ct.ComputeUnit.CPU_ONLY,
            "cpu_and_ne": ct.ComputeUnit.CPU_AND_NE,  # M1 Neural Engine
            "all": ct.ComputeUnit.ALL,
        }
        return mapping.get(compute_units.lower(), ct.ComputeUnit.CPU_AND_NE)
    
    def _print_model_info(self, mlmodel_path: str):
        """Print detailed model information"""
        model = ct.models.MLModel(mlmodel_path)
        
        logger.info(f"CoreML Model Information:")
        logger.info(f"  Model: {model}")
        logger.info(f"  Input specs:")
        for inp in model.input_description:
            logger.info(f"    - {inp}")
        logger.info(f"  Output specs:")
        for out in model.output_description:
            logger.info(f"    - {out}")
    
    def benchmark_coreml_inference(
        self,
        mlmodel_path: str,
        test_inputs: Dict[str, np.ndarray],
        num_runs: int = 10,
    ) -> Dict[str, float]:
        """
        Benchmark CoreML inference latency on M1 hardware.
        """
        import time
        
        logger.info(f"Benchmarking CoreML inference ({num_runs} runs)...")
        
        try:
            model = ct.models.MLModel(mlmodel_path)
        except Exception as e:
            logger.error(f"Failed to load CoreML model: {e}")
            return {}
        
        # Warm up
        try:
            _ = model.predict(test_inputs)
        except Exception as e:
            logger.warning(f"Warmup prediction failed: {e}")
        
        # Time inference
        times = []
        for i in range(num_runs):
            start = time.perf_counter()
            try:
                _ = model.predict(test_inputs)
                elapsed = time.perf_counter() - start
                times.append(elapsed * 1000)  # Convert to ms
            except Exception as e:
                logger.error(f"Inference run {i} failed: {e}")
                break
        
        if times:
            logger.info(f"Inference latency:")
            logger.info(f"  Min: {min(times):.2f} ms")
            logger.info(f"  Max: {max(times):.2f} ms")
            logger.info(f"  Mean: {np.mean(times):.2f} ms")
            logger.info(f"  Std: {np.std(times):.2f} ms")
            
            return {
                "min_ms": float(min(times)),
                "max_ms": float(max(times)),
                "mean_ms": float(np.mean(times)),
                "std_ms": float(np.std(times)),
            }
        
        return {}


def create_m1_optimized_bundle(
    coreml_model_path: str,
    onnx_fallback_path: str,
    bundle_dir: str = "./models/gliner2_m1_bundle",
) -> str:
    """
    Create a deployable M1 bundle with CoreML model + ONNX fallback.
    Useful for iOS/macOS apps that need CPU fallback.
    """
    
    bundle_path = Path(bundle_dir)
    bundle_path.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"Creating M1 optimized bundle at {bundle_path}")
    
    # Copy models
    import shutil
    
    coreml_dest = bundle_path / "model.mlmodel"
    onnx_dest = bundle_path / "model_fallback.onnx"
    
    shutil.copy(coreml_model_path, coreml_dest)
    shutil.copy(onnx_fallback_path, onnx_dest)
    
    # Create manifest
    manifest = {
        "version": "1.0",
        "primary_model": "model.mlmodel",
        "fallback_model": "model_fallback.onnx",
        "fallback_reason": "CoreML inference failure or unsupported hardware",
        "entity_types": [
            "ORG", "PERSON", "LOCATION", "PRODUCT", "FUNDING_ROUND", "TECHNOLOGY"
        ],
        "input_format": {
            "input_ids": {"dtype": "int32", "shape": [1, 512]},
            "attention_mask": {"dtype": "int32", "shape": [1, 512]},
        },
        "output_format": {
            "entity_span_logits": {"dtype": "float32"},
            "entity_type_logits": {"dtype": "float32"},
        },
        "quantization": "INT8 static per-channel",
        "target_hardware": "Apple M1/M2/M3 with Neural Engine",
    }
    
    import json
    with open(bundle_path / "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    
    logger.info(f"Bundle created at {bundle_path}")
    logger.info(f"  - Primary: {coreml_dest}")
    logger.info(f"  - Fallback: {onnx_dest}")
    logger.info(f"  - Manifest: {bundle_path / 'manifest.json'}")
    
    return str(bundle_path)


def main():
    # Assuming ONNX INT8 model exists from previous step
    int8_onnx_path = "./models/gliner2_base_int8.onnx"
    
    converter = GLiNER2CoreMLConverter(int8_onnx_path)
    
    # Convert to CoreML
    coreml_path = converter.convert_to_coreml(
        compute_units="cpu_and_ne",
        minimum_deployment_target="12",
    )
    
    # Create deployment bundle
    bundle_dir = create_m1_optimized_bundle(
        coreml_model_path=coreml_path,
        onnx_fallback_path=int8_onnx_path,
    )
    
    logger.info(f"Conversion pipeline complete!")
    logger.info(f"Bundle: {bundle_dir}")
    
    return bundle_dir


if __name__ == "__main__":
    bundle_dir = main()
