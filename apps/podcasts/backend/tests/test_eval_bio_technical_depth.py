"""DeepEval evaluation suite for technical depth in contributor bios.

Tests whether bios mention concrete technologies, describe technical work
rather than just listing titles, and go beyond superficial career summaries.

Usage:
    pytest tests/test_eval_bio_technical_depth.py -v
    pytest tests/test_eval_bio_technical_depth.py -k "deepeval" -v
    deepeval test run tests/test_eval_bio_technical_depth.py
"""

import json
import os
from pathlib import Path
from typing import Any

import httpx
import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.models import DeepEvalBaseLLM
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

SCRIPT_DIR = Path(__file__).resolve().parent.parent.parent
RESEARCH_DIR = SCRIPT_DIR / "src" / "lib" / "research"


# ═══════════════════════════════════════════════════════════════════════════
# DeepSeek model for DeepEval
# ═══════════════════════════════════════════════════════════════════════════

class DeepSeekEvalModel(DeepEvalBaseLLM):
    def __init__(self):
        self._api_key = os.getenv("DEEPSEEK_API_KEY", "")
        self._base_url = "https://api.deepseek.com/v1"
        self._model_name = "deepseek-chat"
        super().__init__(model=self._model_name)

    def load_model(self):
        return self

    def get_model_name(self) -> str:
        return self._model_name

    def _call_api(self, prompt: str) -> str:
        if not self._api_key:
            raise RuntimeError("DEEPSEEK_API_KEY not set")
        with httpx.Client(timeout=60) as client:
            resp = client.post(
                f"{self._base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self._api_key}", "Content-Type": "application/json"},
                json={"model": self._model_name, "messages": [{"role": "user", "content": prompt}],
                      "temperature": 0.0, "max_tokens": 2048},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    def generate(self, prompt: str, **kwargs) -> str:
        return self._call_api(prompt)

    async def a_generate(self, prompt: str, **kwargs) -> str:
        import asyncio
        return await asyncio.to_thread(self._call_api, prompt)


_eval_model = None

def _get_eval_model() -> DeepSeekEvalModel:
    global _eval_model
    if _eval_model is None:
        _eval_model = DeepSeekEvalModel()
    return _eval_model


# ═══════════════════════════════════════════════════════════════════════════
# Data loader
# ═══════════════════════════════════════════════════════════════════════════

def _load_profiles() -> list[dict[str, Any]]:
    profiles = []
    if not RESEARCH_DIR.exists():
        return profiles
    for f in sorted(RESEARCH_DIR.glob("*.json")):
        if f.name.endswith("-timeline.json") or f.name.endswith(".eval.json"):
            continue
        try:
            data = json.loads(f.read_text())
            if isinstance(data, dict) and "slug" in data and "bio" in data:
                profiles.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return profiles


# ═══════════════════════════════════════════════════════════════════════════
# AI / tech term vocabulary (50+ terms)
# ═══════════════════════════════════════════════════════════════════════════

AI_TECH_TERMS = {
    # Architectures & models
    "transformer", "attention mechanism", "self-attention", "bert", "gpt",
    "llama", "diffusion model", "vae", "variational autoencoder", "gan",
    "generative adversarial", "autoencoder", "resnet", "convnet", "cnn",
    "rnn", "lstm", "sequence-to-sequence", "encoder-decoder",
    # Training & optimization
    "backpropagation", "gradient descent", "stochastic gradient",
    "fine-tuning", "pre-training", "rlhf", "reinforcement learning",
    "reward model", "distillation", "quantization", "pruning",
    "mixed precision", "loss function", "dropout", "batch normalization",
    # Frameworks & tools
    "pytorch", "tensorflow", "jax", "keras", "scikit-learn", "hugging face",
    "huggingface", "langchain", "langgraph", "llamaindex", "llama index",
    "vllm", "triton", "onnx", "cuda", "mlflow", "ray", "deepspeed",
    "megatron", "fairscale", "accelerate", "peft", "lora", "qlora",
    # Techniques & concepts
    "embedding", "tokenizer", "tokenization", "attention", "softmax",
    "beam search", "nucleus sampling", "chain-of-thought", "rag",
    "retrieval-augmented", "vector database", "vector search",
    "prompt engineering", "context window", "inference",
    "neural network", "deep learning", "machine learning",
    "computer vision", "natural language processing", "nlp",
    "speech recognition", "object detection", "image classification",
    "semantic search", "knowledge graph", "graph neural network",
    # Infrastructure
    "gpu", "tpu", "distributed training", "model parallelism",
    "data parallelism", "pipeline parallelism", "serving",
    "model serving", "batch inference", "streaming inference",
    # Specific contributions/papers
    "attention is all you need", "scaling law", "mixture of experts",
    "moe", "flash attention", "kv cache", "speculative decoding",
}


def _bio_mentions_tech(bio: str) -> list[str]:
    """Return all tech terms found in the bio text."""
    lower = bio.lower()
    return [term for term in AI_TECH_TERMS if term in lower]


# ═══════════════════════════════════════════════════════════════════════════
# Test 1: Structural — bio mentions at least one technology by name
# ═══════════════════════════════════════════════════════════════════════════

class TestBioMentionsTechnology:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles — run research_pipeline.py first")
        return p

    def test_bio_mentions_technology(self):
        """Assert each bio mentions at least one technology/framework/tool by name."""
        for profile in self._profiles():
            bio = profile.get("bio", "")
            found = _bio_mentions_tech(bio)
            assert found, (
                f"{profile['slug']} bio mentions zero AI tech terms. "
                f"Bio excerpt: {bio[:120]}..."
            )


# ═══════════════════════════════════════════════════════════════════════════
# Test 2: G-Eval — technical depth of bio
# ═══════════════════════════════════════════════════════════════════════════

class TestBioTechnicalDepthGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:10],
                             ids=lambda p: p.get("slug", "?"))
    def test_bio_technical_depth_geval(self, profile):
        """G-Eval: does this bio demonstrate understanding of the person's TECHNICAL work?"""
        bio = profile.get("bio", "")
        if len(bio) < 30:
            pytest.skip(f"Bio too short for {profile['slug']}")
        metric = GEval(
            name="Bio Technical Depth",
            criteria=(
                "Does this bio demonstrate understanding of the person's TECHNICAL work? "
                "Score 1.0 if it describes specific technical contributions (architectures, "
                "algorithms, frameworks built). Score 0.5 if it mentions tech superficially. "
                "Score 0.0 if purely about business/career without technical substance."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.4, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Write a technically detailed bio for AI contributor: {profile.get('name', profile['slug'])}",
            actual_output=bio,
        )
        assert_test(tc, [metric])


# ═══════════════════════════════════════════════════════════════════════════
# Test 3: G-Eval — bio goes beyond listing job titles
# ═══════════════════════════════════════════════════════════════════════════

class TestBioNotJustTitlesGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:10],
                             ids=lambda p: p.get("slug", "?"))
    def test_bio_not_just_titles(self, profile):
        """G-Eval: does this bio go beyond listing job titles?"""
        bio = profile.get("bio", "")
        if len(bio) < 30:
            pytest.skip(f"Bio too short for {profile['slug']}")
        metric = GEval(
            name="Bio Beyond Titles",
            criteria=(
                "Does this bio go beyond listing job titles? "
                "Score 1.0 if it explains WHAT the person built/discovered, "
                "not just WHERE they worked. Score 0.5 if it mixes substantive "
                "contributions with title-heavy language. Score 0.0 if it reads "
                "like a LinkedIn headline — only company names and job titles."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.5, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Write a bio for AI contributor: {profile.get('name', profile['slug'])}",
            actual_output=bio,
        )
        assert_test(tc, [metric])
