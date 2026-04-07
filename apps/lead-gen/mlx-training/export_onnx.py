#!/usr/bin/env python3
"""Export HuggingFace models to ONNX for Rust ONNX Runtime inference.

Exports three models used by the lead-gen pipeline:
  1. BAAI/bge-small-en-v1.5  → embeddings (384-dim)
  2. dslim/bert-base-NER     → token classification (9 BIO labels)
  3. cross-encoder/ms-marco-MiniLM-L6-v2 → reranking (single score)

Usage:
    python export_onnx.py --model bge          # Export embeddings model
    python export_onnx.py --model ner          # Export NER model
    python export_onnx.py --model reranker     # Export reranker model
    python export_onnx.py --all                # Export all three

Output directory: ~/.cache/leadgen-ml/<model-name>/
Each directory contains: model.onnx, tokenizer.json

Requirements:
    pip install transformers torch onnx optimum[onnxruntime] tokenizers
"""

import argparse
import shutil
from pathlib import Path

CACHE_DIR = Path.home() / ".cache" / "leadgen-ml"


def export_bge():
    """Export BAAI/bge-small-en-v1.5 to ONNX."""
    from optimum.onnxruntime import ORTModelForFeatureExtraction
    from transformers import AutoTokenizer

    model_name = "BAAI/bge-small-en-v1.5"
    output_dir = CACHE_DIR / "bge-small-en-v1.5"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Exporting {model_name} → {output_dir}")

    # Export using Optimum (handles graph optimization)
    model = ORTModelForFeatureExtraction.from_pretrained(
        model_name, export=True
    )
    model.save_pretrained(output_dir)

    # Save tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    tokenizer.save_pretrained(output_dir)

    # Verify tokenizer.json exists (needed by Rust tokenizers crate)
    assert (output_dir / "tokenizer.json").exists(), "tokenizer.json not found"

    # Rename ONNX file to model.onnx if needed
    onnx_files = list(output_dir.glob("*.onnx"))
    if onnx_files and not (output_dir / "model.onnx").exists():
        shutil.move(str(onnx_files[0]), str(output_dir / "model.onnx"))

    print(f"  ✓ model.onnx: {(output_dir / 'model.onnx').stat().st_size / 1e6:.1f} MB")
    print(f"  ✓ tokenizer.json")


def export_ner():
    """Export dslim/bert-base-NER to ONNX."""
    from optimum.onnxruntime import ORTModelForTokenClassification
    from transformers import AutoTokenizer

    model_name = "dslim/bert-base-NER"
    output_dir = CACHE_DIR / "bert-base-NER"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Exporting {model_name} → {output_dir}")

    model = ORTModelForTokenClassification.from_pretrained(
        model_name, export=True
    )
    model.save_pretrained(output_dir)

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    tokenizer.save_pretrained(output_dir)

    assert (output_dir / "tokenizer.json").exists(), "tokenizer.json not found"

    onnx_files = list(output_dir.glob("*.onnx"))
    if onnx_files and not (output_dir / "model.onnx").exists():
        shutil.move(str(onnx_files[0]), str(output_dir / "model.onnx"))

    print(f"  ✓ model.onnx: {(output_dir / 'model.onnx').stat().st_size / 1e6:.1f} MB")
    print(f"  ✓ tokenizer.json")


def export_reranker():
    """Export cross-encoder/ms-marco-MiniLM-L6-v2 to ONNX."""
    from optimum.onnxruntime import ORTModelForSequenceClassification
    from transformers import AutoTokenizer

    model_name = "cross-encoder/ms-marco-MiniLM-L6-v2"
    output_dir = CACHE_DIR / "ms-marco-MiniLM-L6-v2"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Exporting {model_name} → {output_dir}")

    model = ORTModelForSequenceClassification.from_pretrained(
        model_name, export=True
    )
    model.save_pretrained(output_dir)

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    tokenizer.save_pretrained(output_dir)

    assert (output_dir / "tokenizer.json").exists(), "tokenizer.json not found"

    onnx_files = list(output_dir.glob("*.onnx"))
    if onnx_files and not (output_dir / "model.onnx").exists():
        shutil.move(str(onnx_files[0]), str(output_dir / "model.onnx"))

    print(f"  ✓ model.onnx: {(output_dir / 'model.onnx').stat().st_size / 1e6:.1f} MB")
    print(f"  ✓ tokenizer.json")


def verify_exports():
    """Verify all exported models load correctly."""
    import onnxruntime as ort

    models = {
        "bge-small-en-v1.5": {"inputs": 3, "desc": "embeddings"},
        "bert-base-NER": {"inputs": 3, "desc": "NER"},
        "ms-marco-MiniLM-L6-v2": {"inputs": 3, "desc": "reranker"},
    }

    print("\nVerification:")
    for name, info in models.items():
        onnx_path = CACHE_DIR / name / "model.onnx"
        tok_path = CACHE_DIR / name / "tokenizer.json"

        if not onnx_path.exists():
            print(f"  ✗ {name}: model.onnx not found")
            continue

        session = ort.InferenceSession(str(onnx_path))
        inputs = [inp.name for inp in session.get_inputs()]
        outputs = [out.name for out in session.get_outputs()]

        tok_ok = "✓" if tok_path.exists() else "✗"
        print(f"  ✓ {name} ({info['desc']}): inputs={inputs}, outputs={outputs}, tokenizer={tok_ok}")


def main():
    parser = argparse.ArgumentParser(description="Export HuggingFace models to ONNX")
    parser.add_argument("--model", choices=["bge", "ner", "reranker"], help="Model to export")
    parser.add_argument("--all", action="store_true", help="Export all models")
    parser.add_argument("--verify", action="store_true", help="Verify exported models")
    args = parser.parse_args()

    if not args.model and not args.all and not args.verify:
        parser.print_help()
        return

    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    if args.all:
        export_bge()
        export_ner()
        export_reranker()
        verify_exports()
    elif args.model == "bge":
        export_bge()
    elif args.model == "ner":
        export_ner()
    elif args.model == "reranker":
        export_reranker()

    if args.verify:
        verify_exports()


if __name__ == "__main__":
    main()
