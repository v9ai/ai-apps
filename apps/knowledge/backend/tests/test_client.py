"""Tests for the LLM client module."""

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from graph.client import (
    ConfigError,
    GenerationError,
    _get_config,
    chat,
    get_client,
    close_client,
)


class TestGetConfig:
    def test_raises_without_api_key_or_base_url(self):
        with patch.dict(os.environ, {}, clear=True):
            # Remove both keys
            env = {k: v for k, v in os.environ.items()
                   if k not in ("DEEPSEEK_API_KEY", "LLM_BASE_URL")}
            with patch.dict(os.environ, env, clear=True):
                with pytest.raises(ConfigError, match="DEEPSEEK_API_KEY"):
                    _get_config()

    def test_accepts_api_key(self):
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": "test-key"}, clear=False):
            config = _get_config()
            assert config.api_key == "test-key"

    def test_accepts_base_url(self):
        with patch.dict(os.environ, {"LLM_BASE_URL": "http://localhost:8080"}, clear=False):
            config = _get_config()
            assert config.base_url == "http://localhost:8080"

    def test_default_model(self):
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": "k"}, clear=False):
            # Remove LLM_MODEL if set
            env = dict(os.environ)
            env.pop("LLM_MODEL", None)
            with patch.dict(os.environ, env, clear=True):
                config = _get_config()
                assert config.default_model == "deepseek-chat"

    def test_custom_model(self):
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": "k", "LLM_MODEL": "deepseek-reasoner"}):
            config = _get_config()
            assert config.default_model == "deepseek-reasoner"


class TestChat:
    @pytest.mark.asyncio
    async def test_returns_content_and_tokens(self):
        mock_resp = MagicMock()
        mock_resp.choices = [MagicMock()]
        mock_resp.choices[0].message.content = "Hello"
        mock_resp.usage = MagicMock()
        mock_resp.usage.total_tokens = 42

        with patch("graph.client.get_client") as mock_gc:
            mock_client = AsyncMock()
            mock_client.chat = AsyncMock(return_value=mock_resp)
            mock_gc.return_value = mock_client

            content, tokens = await chat("test prompt")
            assert content == "Hello"
            assert tokens == 42

    @pytest.mark.asyncio
    async def test_retries_on_timeout(self):
        mock_resp = MagicMock()
        mock_resp.choices = [MagicMock()]
        mock_resp.choices[0].message.content = "ok"
        mock_resp.usage = MagicMock()
        mock_resp.usage.total_tokens = 10

        call_count = [0]

        async def flaky_chat(messages, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                raise TimeoutError("timed out")
            return mock_resp

        with patch("graph.client.get_client") as mock_gc:
            mock_client = AsyncMock()
            mock_client.chat = flaky_chat
            mock_gc.return_value = mock_client

            with patch("graph.client.RETRY_DELAY", 0.01):
                content, tokens = await chat("test")
                assert content == "ok"
                assert call_count[0] == 2

    @pytest.mark.asyncio
    async def test_raises_generation_error_after_max_retries(self):
        async def always_fail(messages, **kwargs):
            raise TimeoutError("nope")

        with patch("graph.client.get_client") as mock_gc:
            mock_client = AsyncMock()
            mock_client.chat = always_fail
            mock_gc.return_value = mock_client

            with patch("graph.client.RETRY_DELAY", 0.01):
                with pytest.raises(GenerationError, match="failed after"):
                    await chat("test")

    @pytest.mark.asyncio
    async def test_no_usage_returns_zero_tokens(self):
        mock_resp = MagicMock()
        mock_resp.choices = [MagicMock()]
        mock_resp.choices[0].message.content = "no usage"
        mock_resp.usage = None

        with patch("graph.client.get_client") as mock_gc:
            mock_client = AsyncMock()
            mock_client.chat = AsyncMock(return_value=mock_resp)
            mock_gc.return_value = mock_client

            content, tokens = await chat("test")
            assert tokens == 0


class TestClientLifecycle:
    @pytest.mark.asyncio
    async def test_close_client_resets(self):
        import graph.client as mod
        mock_client = AsyncMock()
        mod._client = mock_client

        await close_client()
        assert mod._client is None
        mock_client.close.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_close_noop_when_none(self):
        import graph.client as mod
        mod._client = None
        await close_client()  # should not raise
