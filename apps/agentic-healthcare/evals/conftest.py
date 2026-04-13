"""
Shared fixtures for the medical embeddings eval suite.

Provides:
  - DeepSeekEvalLLM judge model (local :19836 or api.deepseek.com)
  - GEval metric factory (creates metrics backed by DeepSeek, not OpenAI)
  - Pytest marks: `llm_judge` for tests that need the judge LLM
  - Auto-skip when DEEPSEEK_API_KEY is missing and no local instance available
"""

from __future__ import annotations

import os
import sys
from typing import Optional

import pytest
from dotenv import load_dotenv
from openai import OpenAI

from deepeval.models import DeepEvalBaseLLM
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

# Load .env.local from the project root (one level up from evals/)
_PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..")
load_dotenv(os.path.join(_PROJECT_ROOT, ".env.local"), override=False)

# Add langgraph/ to path so eval files can import project modules
sys.path.insert(0, os.path.join(_PROJECT_ROOT, "langgraph"))

# ---------------------------------------------------------------------------
# DeepSeek judge configuration
# ---------------------------------------------------------------------------

_DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
_DEEPSEEK_BASE_URL = os.environ.get(
    "DEEPSEEK_BASE_URL", "http://localhost:19836/v1"
)

_DASHSCOPE_API_KEY = os.environ.get("DASHSCOPE_API_KEY", "")
_DASHSCOPE_BASE_URL = os.environ.get(
    "DASHSCOPE_BASE_URL",
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
)


def _probe_local_deepseek() -> bool:
    """Check if the local DeepSeek instance is reachable."""
    try:
        client = OpenAI(
            api_key=_DEEPSEEK_API_KEY or "local",
            base_url="http://localhost:19836/v1",
        )
        client.models.list()
        return True
    except Exception:
        return False


# Determine whether we have a usable judge LLM
HAS_LOCAL_DEEPSEEK = _probe_local_deepseek()
HAS_DEEPSEEK_KEY = bool(_DEEPSEEK_API_KEY)
HAS_DASHSCOPE_KEY = bool(_DASHSCOPE_API_KEY)
HAS_JUDGE = HAS_LOCAL_DEEPSEEK or HAS_DEEPSEEK_KEY


# ---------------------------------------------------------------------------
# DeepSeekEvalLLM — wraps any OpenAI-compatible endpoint for DeepEval
# ---------------------------------------------------------------------------


class DeepSeekEvalLLM(DeepEvalBaseLLM):
    """DeepEval judge model backed by DeepSeek (local or API)."""

    def __init__(
        self,
        model: str = "deepseek-chat",
        api_key: str | None = None,
        base_url: str | None = None,
    ) -> None:
        self.model = model
        self._api_key = api_key or _DEEPSEEK_API_KEY or "local"
        self._base_url = base_url or _DEEPSEEK_BASE_URL
        self._client = OpenAI(api_key=self._api_key, base_url=self._base_url)

    def load_model(self) -> OpenAI:
        return self._client

    def generate(self, prompt: str, schema: Optional[type] = None) -> str:
        response = self._client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
        )
        return response.choices[0].message.content or ""

    async def a_generate(self, prompt: str, schema: Optional[type] = None) -> str:
        return self.generate(prompt, schema)

    def get_model_name(self) -> str:
        return self.model


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def judge_model() -> DeepSeekEvalLLM:
    """Session-scoped DeepSeek judge for GEval metrics."""
    if HAS_LOCAL_DEEPSEEK:
        return DeepSeekEvalLLM(
            model="deepseek-chat",
            api_key=_DEEPSEEK_API_KEY or "local",
            base_url="http://localhost:19836/v1",
        )
    if HAS_DEEPSEEK_KEY:
        return DeepSeekEvalLLM(
            model="deepseek-chat",
            api_key=_DEEPSEEK_API_KEY,
            base_url="https://api.deepseek.com/v1",
        )
    pytest.skip("No DeepSeek judge available (set DEEPSEEK_API_KEY or run local instance)")


@pytest.fixture(scope="session")
def dashscope_client() -> OpenAI:
    """Session-scoped DashScope (Qwen) client."""
    if not HAS_DASHSCOPE_KEY:
        pytest.skip("DASHSCOPE_API_KEY not set")
    return OpenAI(api_key=_DASHSCOPE_API_KEY, base_url=_DASHSCOPE_BASE_URL)


# ---------------------------------------------------------------------------
# GEval factory — creates metrics with the correct judge model
# ---------------------------------------------------------------------------


def make_geval(
    name: str,
    criteria: str,
    evaluation_params: list[LLMTestCaseParams],
    threshold: float = 0.7,
    model: DeepSeekEvalLLM | None = None,
) -> GEval:
    """Create a GEval metric backed by DeepSeek instead of OpenAI."""
    if model is None:
        if HAS_LOCAL_DEEPSEEK:
            model = DeepSeekEvalLLM(base_url="http://localhost:19836/v1")
        elif HAS_DEEPSEEK_KEY:
            model = DeepSeekEvalLLM()
    return GEval(
        name=name,
        criteria=criteria,
        evaluation_params=evaluation_params,
        threshold=threshold,
        model=model,
    )


# ---------------------------------------------------------------------------
# Pytest markers
# ---------------------------------------------------------------------------

skip_no_judge = pytest.mark.skipif(
    not HAS_JUDGE,
    reason="No DeepSeek judge available (set DEEPSEEK_API_KEY or run local instance)",
)

skip_no_dashscope = pytest.mark.skipif(
    not HAS_DASHSCOPE_KEY,
    reason="DASHSCOPE_API_KEY not set",
)


# ---------------------------------------------------------------------------
# Backward-compatible shims for eval files
#
# Production code no longer uses LlamaIndex types (Document, TextNode,
# BaseEmbedding, etc.), but evals still test with LlamaIndex for quality
# validation (VectorStoreIndex, ContextChatEngine, etc.).
# These helpers bridge the gap.
# ---------------------------------------------------------------------------


def get_embed_model():
    """Return a LlamaIndex-compatible APIEmbedding for eval tests.

    Replaces the removed embeddings.get_embed_model().
    """
    from llama_index.core.base.embeddings.base import BaseEmbedding, Embedding
    from embeddings import (
        generate_embedding,
        agenerate_embedding,
        _call_embed_api,
        _acall_embed_api,
    )
    from config import settings as app_settings

    class APIEmbedding(BaseEmbedding):
        model_name: str = app_settings.embed_api_model

        def _get_query_embedding(self, query: str) -> Embedding:
            return generate_embedding(query)

        async def _aget_query_embedding(self, query: str) -> Embedding:
            return await agenerate_embedding(query)

        def _get_text_embedding(self, text: str) -> Embedding:
            return generate_embedding(text)

        async def _aget_text_embedding(self, text: str) -> Embedding:
            return await agenerate_embedding(text)

        def _get_text_embeddings(self, texts: list[str]) -> list[Embedding]:
            return _call_embed_api(texts)

        async def _aget_text_embeddings(self, texts: list[str]) -> list[Embedding]:
            return await _acall_embed_api(texts)

    return APIEmbedding()


def get_llama_index_llm():
    """Return a LlamaIndex OpenAILike LLM for eval tests.

    Replaces the removed llm_backend.get_llama_index_llm().
    """
    from llama_index.llms.openai_like import OpenAILike
    from config import settings

    base_url = settings.llm_base_url.rstrip("/")
    if not base_url.endswith("/v1"):
        base_url += "/v1"

    return OpenAILike(
        model=settings.llm_model,
        api_base=base_url,
        api_key=settings.llm_api_key,
        is_chat_model=True,
        temperature=0.0,
        max_tokens=1024,
    )


def make_blood_test_node_parser():
    """Return a LlamaIndex TransformComponent wrapping parse_blood_test_nodes.

    Replaces the removed ingestion_pipeline.BloodTestNodeParser class.
    """
    from llama_index.core import Document
    from llama_index.core.schema import BaseNode, TextNode, TransformComponent

    from ingestion_pipeline import parse_blood_test_nodes

    class BloodTestNodeParser(TransformComponent):
        def __call__(self, nodes: list[BaseNode], **kwargs) -> list[BaseNode]:
            out: list[BaseNode] = []
            for node in nodes:
                if not isinstance(node, Document):
                    out.append(node)
                    continue

                meta = node.metadata
                elements = meta.get("_raw_elements", [])
                test_id = meta.get("test_id", "")
                user_id = meta.get("user_id", "")
                file_name = meta.get("file_name", "")
                uploaded_at = meta.get("uploaded_at", "")
                test_date = meta.get("test_date") or uploaded_at
                marker_ids: list[str] = meta.get("_marker_ids", [])

                embedding_nodes = parse_blood_test_nodes(
                    elements, test_id, user_id, file_name, uploaded_at, test_date, marker_ids,
                )
                if not embedding_nodes:
                    out.append(node)
                    continue

                for en in embedding_nodes:
                    out.append(TextNode(
                        id_=en.id_,
                        text=en.text,
                        metadata=en.metadata,
                    ))
            return out

    return BloodTestNodeParser()


def build_ingestion_pipeline():
    """Return a LlamaIndex IngestionPipeline for eval tests.

    Replaces the removed ingestion_pipeline.build_ingestion_pipeline().
    """
    from llama_index.core.ingestion import IngestionPipeline

    return IngestionPipeline(
        transformations=[
            make_blood_test_node_parser(),
            get_embed_model(),
        ],
    )
