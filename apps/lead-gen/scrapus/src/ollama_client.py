"""
Async Ollama client for the Scrapus pipeline.

Replaces scattered synchronous `requests` calls with a single httpx-based
async client. Used by pipeline_stages.py and structured_output.py.

Usage:
    client = OllamaClient()
    ok = await client.health_check()
    text = await client.generate("prompt", model="llama3.1:8b-instruct-q4_K_M")
    json_str = await client.generate_json("prompt", schema={...})
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore[assignment]

logger = logging.getLogger("scrapus.ollama")

_DEFAULT_BASE = "http://localhost:11434"


@dataclass
class GenerateResult:
    """Response from an Ollama /api/generate call."""
    text: str
    model: str
    total_duration_ns: int = 0
    eval_count: int = 0
    prompt_eval_count: int = 0

    @property
    def eval_duration_ms(self) -> float:
        return self.total_duration_ns / 1_000_000


class OllamaClient:
    """Thin async wrapper around the Ollama HTTP API."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: float = 60.0,
    ):
        self.base_url = (
            base_url
            or os.environ.get("OLLAMA_HOST")
            or _DEFAULT_BASE
        ).rstrip("/")
        self.timeout = timeout

        if httpx is None:
            raise ImportError(
                "httpx is required for OllamaClient. Install: pip install httpx"
            )

        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(timeout, connect=10.0),
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def __aenter__(self) -> "OllamaClient":
        return self

    async def __aexit__(self, *exc: Any) -> None:
        await self.close()

    # ------------------------------------------------------------------
    # Health
    # ------------------------------------------------------------------

    async def health_check(self) -> bool:
        """Return True if Ollama is reachable and responsive."""
        try:
            resp = await self._client.get("/api/tags")
            return resp.status_code == 200
        except (httpx.ConnectError, httpx.TimeoutException):
            return False

    async def list_models(self) -> List[str]:
        """Return names of locally available models."""
        try:
            resp = await self._client.get("/api/tags")
            resp.raise_for_status()
            data = resp.json()
            return [m["name"] for m in data.get("models", [])]
        except Exception as exc:
            logger.warning("Failed to list Ollama models: %s", exc)
            return []

    async def has_model(self, model: str) -> bool:
        """Check if a specific model is pulled locally."""
        models = await self.list_models()
        # Match with or without tag (e.g. "llama3.1" matches "llama3.1:latest")
        return any(model in m or m.startswith(model) for m in models)

    # ------------------------------------------------------------------
    # Generation
    # ------------------------------------------------------------------

    async def generate(
        self,
        prompt: str,
        *,
        model: str = "llama3.1:8b-instruct-q4_K_M",
        max_tokens: int = 2048,
        temperature: float = 0.1,
        stop: Optional[List[str]] = None,
        system: Optional[str] = None,
    ) -> GenerateResult:
        """Generate text completion via /api/generate."""
        payload: Dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "temperature": temperature,
            },
        }
        if stop:
            payload["options"]["stop"] = stop
        if system:
            payload["system"] = system

        resp = await self._client.post("/api/generate", json=payload)
        resp.raise_for_status()
        body = resp.json()

        return GenerateResult(
            text=body.get("response", ""),
            model=body.get("model", model),
            total_duration_ns=body.get("total_duration", 0),
            eval_count=body.get("eval_count", 0),
            prompt_eval_count=body.get("prompt_eval_count", 0),
        )

    async def generate_json(
        self,
        prompt: str,
        *,
        model: str = "llama3.1:8b-instruct-q4_K_M",
        schema: Optional[Dict[str, Any]] = None,
        max_tokens: int = 300,
        temperature: float = 0.1,
    ) -> GenerateResult:
        """Generate JSON-constrained output via Ollama's format parameter."""
        payload: Dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "num_predict": max_tokens,
                "temperature": temperature,
            },
        }

        if schema:
            schema_hint = json.dumps(schema, indent=2)
            payload["prompt"] = (
                f"{prompt}\n\nRespond with JSON matching this schema:\n{schema_hint}"
            )

        resp = await self._client.post("/api/generate", json=payload)
        resp.raise_for_status()
        body = resp.json()

        return GenerateResult(
            text=body.get("response", ""),
            model=body.get("model", model),
            total_duration_ns=body.get("total_duration", 0),
            eval_count=body.get("eval_count", 0),
            prompt_eval_count=body.get("prompt_eval_count", 0),
        )

    async def chat(
        self,
        messages: List[Dict[str, str]],
        *,
        model: str = "llama3.1:8b-instruct-q4_K_M",
        max_tokens: int = 2048,
        temperature: float = 0.1,
    ) -> GenerateResult:
        """Chat completion via /api/chat."""
        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "temperature": temperature,
            },
        }

        resp = await self._client.post("/api/chat", json=payload)
        resp.raise_for_status()
        body = resp.json()

        msg = body.get("message", {})
        return GenerateResult(
            text=msg.get("content", ""),
            model=body.get("model", model),
            total_duration_ns=body.get("total_duration", 0),
            eval_count=body.get("eval_count", 0),
            prompt_eval_count=body.get("prompt_eval_count", 0),
        )

    # ------------------------------------------------------------------
    # Model management
    # ------------------------------------------------------------------

    async def pull(self, model: str) -> bool:
        """Pull a model. Returns True on success."""
        try:
            resp = await self._client.post(
                "/api/pull",
                json={"name": model, "stream": False},
                timeout=httpx.Timeout(600.0, connect=10.0),
            )
            return resp.status_code == 200
        except Exception as exc:
            logger.error("Failed to pull model %s: %s", model, exc)
            return False

    async def ensure_model(self, model: str) -> bool:
        """Check if model is available locally; pull it if not."""
        if await self.has_model(model):
            return True
        logger.info("Model %s not found locally, pulling...", model)
        return await self.pull(model)

    async def embeddings(
        self,
        text: str,
        *,
        model: str = "nomic-embed-text",
    ) -> List[float]:
        """Generate embeddings via /api/embeddings."""
        payload = {"model": model, "prompt": text}
        resp = await self._client.post("/api/embeddings", json=payload)
        resp.raise_for_status()
        return resp.json().get("embedding", [])
