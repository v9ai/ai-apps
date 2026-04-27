"""Global LlamaIndex settings — local LLM + local embeddings.

Import and call ``configure_llamaindex()`` early (e.g. in chat_server.py
before the graph import) so every LlamaIndex component defaults to the
local mlx_lm.server and FastEmbed model.
"""

from __future__ import annotations

from llama_index.core import Settings
from llama_index.llms.openai_like import OpenAILike

from config import settings as app_settings
from embeddings import get_embed_model


def configure_llamaindex() -> None:
    """Set global LlamaIndex Settings for local-only inference."""
    base = app_settings.llm_base_url.rstrip("/")
    if not base.endswith("/v1"):
        base += "/v1"

    Settings.llm = OpenAILike(
        model=app_settings.llm_model,
        api_base=base,
        api_key=app_settings.llm_api_key,
        is_chat_model=True,
        temperature=0.0,
        max_tokens=1024,
    )
    Settings.embed_model = get_embed_model()
