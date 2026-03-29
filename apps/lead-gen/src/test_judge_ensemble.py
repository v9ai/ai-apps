"""Tests for the async OllamaJudge and JudgeEnsemble."""
from __future__ import annotations

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from ollama_client import OllamaClient, GenerateResult


# Gate imports behind availability
try:
    from llm_judge_ensemble import (
        OllamaJudge,
        JudgeEnsemble,
        JudgmentScore,
        EVALUATION_RUBRIC,
    )
    HAS_JUDGE = True
except ImportError:
    HAS_JUDGE = False


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _mock_ollama_client() -> OllamaClient:
    """Build an OllamaClient with a mocked httpx transport."""
    with patch("ollama_client.httpx") as mock_httpx:
        mock_httpx.Timeout = MagicMock()
        mock_httpx.ConnectError = Exception
        mock_httpx.TimeoutException = Exception
        client_instance = AsyncMock()
        mock_httpx.AsyncClient.return_value = client_instance
        return OllamaClient(base_url="http://test:11434")


def _judge_json_response() -> str:
    """Valid JSON judge response."""
    return json.dumps({
        "factual_accuracy": 4,
        "completeness": 3,
        "actionability": 4,
        "conciseness": 5,
        "tone": 4,
        "explanation": "Report covers key facts accurately.",
        "confidence": 0.85,
    })


# ---------------------------------------------------------------------------
# OllamaJudge
# ---------------------------------------------------------------------------

@pytest.mark.skipif(not HAS_JUDGE, reason="llm_judge_ensemble not importable")
class TestOllamaJudge:

    @pytest.fixture
    def mock_client(self):
        client = MagicMock(spec=OllamaClient)
        client.health_check = AsyncMock(return_value=True)
        client.has_model = AsyncMock(return_value=True)
        client.list_models = AsyncMock(return_value=["llama3.1:8b-instruct-q4_K_M"])
        client.generate = AsyncMock(return_value=GenerateResult(
            text=_judge_json_response(),
            model="llama3.1:8b-instruct-q4_K_M",
            total_duration_ns=300_000_000,
            eval_count=50,
        ))
        return client

    @pytest.fixture
    def judge(self, mock_client):
        return OllamaJudge(
            model_name="llama3.1:8b-instruct-q4_K_M",
            ollama_client=mock_client,
        )

    @pytest.mark.asyncio
    async def test_verify_connectivity_healthy(self, judge):
        await judge.verify_connectivity()
        judge._client.health_check.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_verify_connectivity_unhealthy(self, mock_client):
        mock_client.health_check = AsyncMock(return_value=False)
        mock_client.base_url = "http://test:11434"
        judge = OllamaJudge(model_name="llama3.1:8b-instruct-q4_K_M", ollama_client=mock_client)
        with pytest.raises(RuntimeError, match="Cannot connect"):
            await judge.verify_connectivity()

    @pytest.mark.asyncio
    async def test_verify_connectivity_model_missing(self, mock_client):
        mock_client.has_model = AsyncMock(return_value=False)
        judge = OllamaJudge(model_name="nonexistent", ollama_client=mock_client)
        with pytest.raises(RuntimeError, match="not found"):
            await judge.verify_connectivity()

    @pytest.mark.asyncio
    async def test_evaluate_returns_judgment(self, judge):
        result = await judge.evaluate(
            summary="Acme Corp is a fast-growing cybersecurity startup.",
            source_data="Founded 2022, $12M Series A, 50 employees.",
            icp_profile="B2B SaaS, 50-200 headcount, global",
            report_id="report_001",
        )
        assert isinstance(result, JudgmentScore)
        assert result.factual_accuracy == 4
        assert result.completeness == 3
        assert result.confidence == pytest.approx(0.85)
        assert result.judge_name == "llama3.1:8b-instruct-q4_K_M"
        assert result.report_id == "report_001"
        assert result.latency_ms > 0

    @pytest.mark.asyncio
    async def test_evaluate_calls_generate(self, judge, mock_client):
        await judge.evaluate("summary", "source", "icp", "r001")
        mock_client.generate.assert_awaited_once()
        call_kwargs = mock_client.generate.call_args
        assert call_kwargs.kwargs["model"] == "llama3.1:8b-instruct-q4_K_M"
        assert call_kwargs.kwargs["max_tokens"] == 500

    @pytest.mark.asyncio
    async def test_evaluate_propagates_errors(self, mock_client):
        mock_client.generate = AsyncMock(side_effect=Exception("timeout"))
        judge = OllamaJudge(model_name="llama3.1:8b-instruct-q4_K_M", ollama_client=mock_client)
        with pytest.raises(RuntimeError, match="Ollama judge error"):
            await judge.evaluate("s", "d", "p", "r")

    def test_get_name(self, judge):
        assert judge.get_name() == "llama3.1:8b-instruct-q4_K_M"


# ---------------------------------------------------------------------------
# JudgeEnsemble
# ---------------------------------------------------------------------------

@pytest.mark.skipif(not HAS_JUDGE, reason="llm_judge_ensemble not importable")
class TestJudgeEnsemble:

    @pytest.fixture
    def mock_judges(self):
        """Create two mock judges with matching scores."""
        def _make_judge(name: str) -> OllamaJudge:
            client = MagicMock(spec=OllamaClient)
            client.generate = AsyncMock(return_value=GenerateResult(
                text=_judge_json_response(), model=name,
                total_duration_ns=200_000_000, eval_count=40,
            ))
            judge = OllamaJudge(model_name=name, ollama_client=client)
            return judge

        return [_make_judge("judge-a"), _make_judge("judge-b")]

    @pytest.fixture
    def ensemble(self, mock_judges):
        return JudgeEnsemble(judges=mock_judges, skip_third_on_agreement=True)

    @pytest.mark.asyncio
    async def test_evaluate_summary_returns_consensus(self, ensemble):
        result = await ensemble.evaluate_summary(
            summary="Test summary for evaluation.",
            source_data="Some source data.",
            icp_profile="B2B SaaS target profile",
            report_id="r_ensemble_001",
        )
        assert hasattr(result, "report_id")
        assert result.report_id == "r_ensemble_001"

    @pytest.mark.asyncio
    async def test_two_judges_called(self, ensemble, mock_judges):
        await ensemble.evaluate_summary("s", "d", "p", "r")
        for judge in mock_judges:
            judge._client.generate.assert_awaited_once()
