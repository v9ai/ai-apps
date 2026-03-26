"""Tests for the Ollama async client."""
from __future__ import annotations

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from ollama_client import OllamaClient, GenerateResult


@pytest.fixture
def mock_httpx():
    """Patch httpx.AsyncClient for unit tests."""
    with patch("ollama_client.httpx") as mock:
        mock.Timeout = MagicMock()
        mock.ConnectError = Exception
        mock.TimeoutException = Exception
        client_instance = AsyncMock()
        mock.AsyncClient.return_value = client_instance
        yield client_instance


@pytest.fixture
def client(mock_httpx):
    """Return an OllamaClient with mocked transport."""
    return OllamaClient(base_url="http://test:11434")


class TestHealthCheck:
    @pytest.mark.asyncio
    async def test_healthy(self, client, mock_httpx):
        resp = AsyncMock()
        resp.status_code = 200
        mock_httpx.get.return_value = resp
        assert await client.health_check() is True

    @pytest.mark.asyncio
    async def test_unreachable(self, client, mock_httpx):
        mock_httpx.get.side_effect = Exception("connection refused")
        assert await client.health_check() is False


class TestListModels:
    @pytest.mark.asyncio
    async def test_list(self, client, mock_httpx):
        resp = AsyncMock()
        resp.status_code = 200
        resp.raise_for_status = MagicMock()
        resp.json.return_value = {
            "models": [
                {"name": "llama3.1:8b-instruct-q4_K_M"},
                {"name": "nomic-embed-text:latest"},
            ]
        }
        mock_httpx.get.return_value = resp
        models = await client.list_models()
        assert len(models) == 2
        assert "llama3.1:8b-instruct-q4_K_M" in models

    @pytest.mark.asyncio
    async def test_has_model(self, client, mock_httpx):
        resp = AsyncMock()
        resp.status_code = 200
        resp.raise_for_status = MagicMock()
        resp.json.return_value = {
            "models": [{"name": "llama3.1:8b-instruct-q4_K_M"}]
        }
        mock_httpx.get.return_value = resp
        assert await client.has_model("llama3.1") is True
        assert await client.has_model("mistral") is False


class TestGenerate:
    @pytest.mark.asyncio
    async def test_generate(self, client, mock_httpx):
        resp = AsyncMock()
        resp.raise_for_status = MagicMock()
        resp.json.return_value = {
            "response": "Hello world",
            "model": "llama3.1:8b-instruct-q4_K_M",
            "total_duration": 500_000_000,
            "eval_count": 10,
            "prompt_eval_count": 5,
        }
        mock_httpx.post.return_value = resp

        result = await client.generate("Say hello")
        assert isinstance(result, GenerateResult)
        assert result.text == "Hello world"
        assert result.eval_count == 10
        assert result.eval_duration_ms == 500.0

    @pytest.mark.asyncio
    async def test_generate_json(self, client, mock_httpx):
        report = {"summary": "test", "confidence": 0.9}
        resp = AsyncMock()
        resp.raise_for_status = MagicMock()
        resp.json.return_value = {
            "response": json.dumps(report),
            "model": "llama3.1:8b-instruct-q4_K_M",
            "total_duration": 300_000_000,
            "eval_count": 8,
        }
        mock_httpx.post.return_value = resp

        result = await client.generate_json("Generate JSON", schema={"type": "object"})
        parsed = json.loads(result.text)
        assert parsed["summary"] == "test"


class TestChat:
    @pytest.mark.asyncio
    async def test_chat(self, client, mock_httpx):
        resp = AsyncMock()
        resp.raise_for_status = MagicMock()
        resp.json.return_value = {
            "message": {"role": "assistant", "content": "I can help with that."},
            "model": "llama3.1:8b-instruct-q4_K_M",
            "total_duration": 200_000_000,
            "eval_count": 6,
        }
        mock_httpx.post.return_value = resp

        result = await client.chat([{"role": "user", "content": "Help me"}])
        assert result.text == "I can help with that."


class TestEnsureModel:
    @pytest.mark.asyncio
    async def test_already_available(self, client, mock_httpx):
        resp = AsyncMock()
        resp.status_code = 200
        resp.raise_for_status = MagicMock()
        resp.json.return_value = {"models": [{"name": "llama3.1:latest"}]}
        mock_httpx.get.return_value = resp

        assert await client.ensure_model("llama3.1") is True
        mock_httpx.post.assert_not_called()

    @pytest.mark.asyncio
    async def test_pulls_missing(self, client, mock_httpx):
        # First call: list_models returns empty
        list_resp = AsyncMock()
        list_resp.status_code = 200
        list_resp.raise_for_status = MagicMock()
        list_resp.json.return_value = {"models": []}
        mock_httpx.get.return_value = list_resp

        # pull returns success
        pull_resp = AsyncMock()
        pull_resp.status_code = 200
        mock_httpx.post.return_value = pull_resp

        assert await client.ensure_model("llama3.1") is True


class TestEmbeddings:
    @pytest.mark.asyncio
    async def test_embeddings(self, client, mock_httpx):
        resp = AsyncMock()
        resp.raise_for_status = MagicMock()
        resp.json.return_value = {"embedding": [0.1, 0.2, 0.3]}
        mock_httpx.post.return_value = resp

        result = await client.embeddings("test text")
        assert result == [0.1, 0.2, 0.3]
