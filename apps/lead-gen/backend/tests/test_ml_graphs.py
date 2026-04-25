"""Tests for ml/ml_graphs/{bge_m3_embed,jobbert_ner}.py — StateGraph nodes that validate against contracts.

The ml/ container's heavy dependencies (sentence-transformers, torch, transformers,
huggingface_hub, safetensors) are not installed in the dev/test env. We inject
lightweight fakes into ``sys.modules`` BEFORE importing the graph modules so the
top-level imports succeed without any model downloads.

We also set ``ML_EAGER_LOAD=0`` so ``bge_m3_embed`` does not call ``_load_model``
at import time, then patch ``_ModelHolder.model`` with a fake encoder.
"""

from __future__ import annotations

import os
import subprocess
import sys
import types
from pathlib import Path

import numpy as np
import pytest
from pydantic import ValidationError

ROOT = Path(__file__).parent.parent
ML_DIR = ROOT / "ml"

# ---------------------------------------------------------------------------
# Stub heavy deps BEFORE importing the graph modules. Order matters: the import
# of ``ml_graphs.bge_m3_embed`` evaluates ``from sentence_transformers import
# SentenceTransformer`` at module load time, so the fake must already be in
# ``sys.modules`` when that happens.
# ---------------------------------------------------------------------------

os.environ["ML_EAGER_LOAD"] = "0"


class _FakeSentenceTransformer:
    """Stand-in for sentence_transformers.SentenceTransformer.

    The real class is never instantiated in tests — we patch
    ``_ModelHolder.model`` with a per-test fake. This shim only needs to exist
    so the ``from sentence_transformers import SentenceTransformer`` import
    succeeds.
    """

    def __init__(self, *_args, **_kwargs) -> None:  # pragma: no cover
        self.max_seq_length = 512

    def encode(self, *_args, **_kwargs):  # pragma: no cover
        raise RuntimeError("real model should never be called in tests")


def _install_fake_sentence_transformers() -> None:
    if "sentence_transformers" in sys.modules:
        return
    fake = types.ModuleType("sentence_transformers")
    fake.SentenceTransformer = _FakeSentenceTransformer  # type: ignore[attr-defined]
    sys.modules["sentence_transformers"] = fake


def _install_fake_jobbert_infer() -> None:
    """Replace ``leadgen_agent.jobbert_infer`` with a stub that does not import torch.

    The real module imports torch/transformers at the top, which are not
    installed in the dev env. ``ml_graphs.jobbert_ner`` only needs the
    ``extract_skills`` callable, which we override in tests via monkeypatch.
    """
    name = "leadgen_agent.jobbert_infer"
    if name in sys.modules:
        return
    fake = types.ModuleType(name)

    def _placeholder_extract_skills(_text: str) -> list[dict]:  # pragma: no cover
        raise RuntimeError("tests must monkeypatch extract_skills before invoking the graph")

    fake.extract_skills = _placeholder_extract_skills  # type: ignore[attr-defined]
    sys.modules[name] = fake


_install_fake_sentence_transformers()
_install_fake_jobbert_infer()

# Make ``ml_graphs`` importable. The production container runs from ml/ as the
# working dir; in tests we add it to sys.path explicitly.
sys.path.insert(0, str(ML_DIR))

from leadgen_agent.contracts import (  # noqa: E402
    SCHEMA_VERSION,
    BgeM3EmbedOutput,
    JobbertNerOutput,
)
from ml_graphs import bge_m3_embed as bge_mod  # noqa: E402
from ml_graphs import jobbert_ner as ner_mod  # noqa: E402


# ---------------------------------------------------------------------------
# bge_m3_embed
# ---------------------------------------------------------------------------


class _FakeEncoder:
    """Returns ``np.ones((len(texts), 1024), dtype=float32)`` for any input."""

    def encode(self, texts, **_kwargs):
        n = len(list(texts))
        return np.ones((n, 1024), dtype=np.float32)


async def test_bge_m3_encode_happy_path(monkeypatch):
    monkeypatch.setattr(bge_mod._ModelHolder, "model", _FakeEncoder())
    out = await bge_mod.graph.ainvoke({"texts": ["alpha", "beta"]})

    assert out["schema_version"] == SCHEMA_VERSION
    assert out["dim"] == 1024
    assert out["model"] == "BAAI/bge-m3"
    assert len(out["vectors"]) == 2
    assert len(out["vectors"][0]) == 1024
    # Validates cleanly against the contract.
    BgeM3EmbedOutput.model_validate(out)


async def test_bge_m3_empty_texts_raises(monkeypatch):
    monkeypatch.setattr(bge_mod._ModelHolder, "model", _FakeEncoder())
    with pytest.raises(ValidationError):
        await bge_mod.graph.ainvoke({"texts": []})


async def test_bge_m3_too_many_texts_raises(monkeypatch):
    monkeypatch.setattr(bge_mod._ModelHolder, "model", _FakeEncoder())
    with pytest.raises(ValidationError):
        await bge_mod.graph.ainvoke({"texts": ["x"] * 200})


# ---------------------------------------------------------------------------
# jobbert_ner
# ---------------------------------------------------------------------------


async def test_jobbert_extract_happy_path(monkeypatch):
    canned = [
        {"span": "react", "label": "SKILL", "score": 0.9, "start": 0, "end": 5},
    ]
    monkeypatch.setattr(ner_mod, "extract_skills", lambda _text: canned)

    out = await ner_mod.graph.ainvoke({"text": "react developer"})

    JobbertNerOutput.model_validate(out)
    assert out["schema_version"] == SCHEMA_VERSION
    assert len(out["spans"]) == 1
    assert out["spans"][0]["span"] == "react"
    assert out["spans"][0]["label"] == "SKILL"


async def test_jobbert_invalid_input(monkeypatch):
    # Defensive: extract_skills must not be reached when the input fails validation.
    def _should_not_be_called(_text):  # pragma: no cover
        raise AssertionError("extract_skills called despite invalid input")

    monkeypatch.setattr(ner_mod, "extract_skills", _should_not_be_called)

    # JobbertNerInput.text has min_length=1 → empty string must raise.
    with pytest.raises(ValidationError):
        await ner_mod.graph.ainvoke({"text": ""})


# ---------------------------------------------------------------------------
# Regression guard: no interrupt() calls in ml/ or research/
# ---------------------------------------------------------------------------


def test_ci_guard_no_interrupt_in_ml_or_research():
    result = subprocess.run(
        [sys.executable, "scripts/ci_guard_interrupt.py"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, (
        f"ci_guard_interrupt failed:\nstdout={result.stdout}\nstderr={result.stderr}"
    )
