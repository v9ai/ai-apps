"""Merge the contact-score LoRA adapter into Qwen2.5-1.5B and quantize to GGUF.

Pipeline:
  1. Load base + adapter via PEFT, ``merge_and_unload()``, save merged model.
  2. Convert merged HF model → FP16 GGUF via llama.cpp's convert_hf_to_gguf.py.
  3. Quantize FP16 GGUF → Q4_K_M GGUF via llama.cpp's llama-quantize.
  4. Smoke-test: load the Q4_K_M with llama_cpp.Llama and run a sample profile.

The Q4_K_M GGUF is the artifact the HF Space (``apps/lead-gen/lora-serve/``)
loads at runtime. Uploaded to ``v9ai/contact-score-qwen-1.5b-gguf`` via the
standard ``huggingface-cli upload`` (see ``mlx-training/hub.py``).

Prereqs:
  - LoRA adapter in ``mlx-training/models/contact-score-qwen-1.5b/``
    (produced by ``train_contact_score_lora.py``).
  - llama.cpp checked out and built. By default we look in
    ``$LLAMA_CPP_HOME`` or ``~/llama.cpp``. Build with:
        git clone https://github.com/ggerganov/llama.cpp
        cd llama.cpp && cmake -B build && cmake --build build -j
  - Python deps: ``pip install transformers peft torch huggingface-hub llama-cpp-python``

Runs locally on M1 (llama.cpp compiles + runs fine on Apple silicon) or in
the same Colab session right after training. No GPU required — merge is
CPU-only for a 1.5B model (~3 GB RAM peak).

Usage:
    python3 mlx-training/merge_and_quantize_contact_score.py
    python3 mlx-training/merge_and_quantize_contact_score.py --skip-smoke-test
    python3 mlx-training/merge_and_quantize_contact_score.py \\
        --adapter-dir path/to/lora --out-dir path/to/gguf
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


DEFAULT_BASE = "Qwen/Qwen2.5-1.5B-Instruct"
DEFAULT_ADAPTER = Path("mlx-training/models/contact-score-qwen-1.5b")
DEFAULT_OUT = Path("mlx-training/models/contact-score-qwen-1.5b-gguf")

# Keep in sync with apps/lead-gen/lora-serve/app.py and label_contact_score.py.
SCORE_SYSTEM = """You rate B2B sales contacts on fit for outreach. Output strict JSON only, no prose.
Schema: {"tier": "A"|"B"|"C"|"D", "score": number in [0,1], "reasons": string[] (1-3 items)}
Tier rubric:
- A: decision-maker at ICP-fit company, strong signal (title, past roles, technical depth)
- B: influencer or junior decision-maker; clear buying role but not final authority
- C: relevant but indirect (adjacent role, unclear authority)
- D: wrong role / wrong company / low signal / likely bounce"""

SMOKE_PROFILE = (
    "NAME: Jane Doe\n"
    "TITLE: VP Engineering\n"
    "COMPANY: Acme AI (series_b), 120 employees\n"
    "COMPANY_DESC: ML platform and LLM infrastructure for enterprise.\n"
    "BIO: Led ML platform team at 2 prior AI startups. NeurIPS 2023 co-author.\n"
    "SKILLS: Python, PyTorch, Kubernetes, LLM ops\n"
    "SENIORITY: VP\nDEPARTMENT: Engineering\nAUTHORITY_SCORE: 0.85"
)


def _find_llama_cpp() -> Path:
    root = os.environ.get("LLAMA_CPP_HOME")
    candidates = [Path(root)] if root else []
    candidates.append(Path.home() / "llama.cpp")
    for c in candidates:
        if (c / "convert_hf_to_gguf.py").exists():
            return c
    raise SystemExit(
        "ERROR: llama.cpp not found. Set LLAMA_CPP_HOME or clone to ~/llama.cpp.\n"
        "  git clone https://github.com/ggerganov/llama.cpp ~/llama.cpp\n"
        "  cd ~/llama.cpp && cmake -B build && cmake --build build -j"
    )


def _find_quantize_bin(llama_cpp_dir: Path) -> Path:
    for rel in ("build/bin/llama-quantize", "build/bin/quantize", "llama-quantize"):
        p = llama_cpp_dir / rel
        if p.exists() and os.access(p, os.X_OK):
            return p
    # Fall back to PATH
    from_path = shutil.which("llama-quantize") or shutil.which("quantize")
    if from_path:
        return Path(from_path)
    raise SystemExit(
        f"ERROR: llama-quantize binary not found under {llama_cpp_dir}/build/bin "
        "or on PATH. Build llama.cpp first: cmake --build build -j"
    )


def merge_adapter(base: str, adapter_dir: Path, merged_dir: Path) -> None:
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel

    print(f"Loading base {base}…")
    base_model = AutoModelForCausalLM.from_pretrained(
        base, torch_dtype=torch.float16, device_map="cpu",
    )
    tokenizer = AutoTokenizer.from_pretrained(base, use_fast=True)

    print(f"Attaching adapter from {adapter_dir}…")
    peft_model = PeftModel.from_pretrained(base_model, str(adapter_dir))

    print("merge_and_unload()…")
    merged = peft_model.merge_and_unload()

    merged_dir.mkdir(parents=True, exist_ok=True)
    print(f"Saving merged model to {merged_dir}")
    merged.save_pretrained(merged_dir, safe_serialization=True)
    tokenizer.save_pretrained(merged_dir)


def convert_to_gguf_fp16(llama_cpp: Path, merged_dir: Path, out_path: Path) -> None:
    script = llama_cpp / "convert_hf_to_gguf.py"
    print(f"Converting to FP16 GGUF via {script.name}…")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.check_call([
        sys.executable, str(script),
        str(merged_dir),
        "--outtype", "f16",
        "--outfile", str(out_path),
    ])


def quantize_q4km(quant_bin: Path, fp16_gguf: Path, out_path: Path) -> None:
    print(f"Quantizing to Q4_K_M via {quant_bin.name}…")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.check_call([str(quant_bin), str(fp16_gguf), str(out_path), "Q4_K_M"])


def smoke_test(gguf_path: Path) -> None:
    try:
        from llama_cpp import Llama
    except ImportError:
        print("  (llama-cpp-python not installed; skipping smoke test)", file=sys.stderr)
        return
    print("Loading Q4_K_M for smoke test…")
    llm = Llama(model_path=str(gguf_path), n_ctx=2048, n_threads=2, verbose=False)
    out = llm.create_chat_completion(
        messages=[
            {"role": "system", "content": SCORE_SYSTEM},
            {"role": "user", "content": SMOKE_PROFILE},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=256,
    )
    content = out["choices"][0]["message"]["content"]
    print(f"Raw output: {content}")
    try:
        parsed = json.loads(content)
        print(f"Parsed: tier={parsed.get('tier')} score={parsed.get('score')} "
              f"reasons={len(parsed.get('reasons') or [])}")
    except json.JSONDecodeError as e:
        print(f"WARNING: smoke test output is not valid JSON: {e}", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description="Merge contact-score LoRA and export Q4_K_M GGUF")
    parser.add_argument("--base-model", default=DEFAULT_BASE)
    parser.add_argument("--adapter-dir", type=Path, default=DEFAULT_ADAPTER)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--merged-dir", type=Path, default=None,
                        help="Where to save the merged FP16 HF model (default: <out-dir>/merged)")
    parser.add_argument("--skip-smoke-test", action="store_true")
    parser.add_argument("--keep-fp16", action="store_true",
                        help="Don't delete the intermediate FP16 GGUF after quantizing")
    args = parser.parse_args()

    if not args.adapter_dir.exists():
        raise SystemExit(f"ERROR: adapter dir missing: {args.adapter_dir}\n"
                         "Run train_contact_score_lora.py first.")

    merged_dir = args.merged_dir or (args.out_dir / "merged")
    fp16_path = args.out_dir / "contact-score.f16.gguf"
    q4km_path = args.out_dir / "contact-score.Q4_K_M.gguf"

    llama_cpp = _find_llama_cpp()
    quant_bin = _find_quantize_bin(llama_cpp)

    merge_adapter(args.base_model, args.adapter_dir, merged_dir)
    convert_to_gguf_fp16(llama_cpp, merged_dir, fp16_path)
    quantize_q4km(quant_bin, fp16_path, q4km_path)

    size_mb = q4km_path.stat().st_size / (1024 * 1024)
    print(f"\nQ4_K_M GGUF: {q4km_path}  ({size_mb:.1f} MB)")

    if not args.keep_fp16 and fp16_path.exists():
        fp16_path.unlink()
        print(f"Deleted intermediate FP16 GGUF: {fp16_path}")

    if not args.skip_smoke_test:
        smoke_test(q4km_path)

    print("\nNext: upload to HF")
    print(f"  huggingface-cli upload v9ai/contact-score-qwen-1.5b-gguf {q4km_path} contact-score.Q4_K_M.gguf")


if __name__ == "__main__":
    main()
