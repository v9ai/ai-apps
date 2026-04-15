"""HuggingFace Inference API client — same interface as MLXClient.

Uses serverless inference (Qwen2.5-72B-Instruct by default) for
synthesis-heavy agents that don't need tool calling. Supports
concurrent requests via asyncio — multiple agents can run in parallel.

Usage:
    client = HFClient(HFConfig(model="Qwen/Qwen2.5-72B-Instruct"))
    resp = await client.chat([ChatMessage(role="user", content="Hello")])
    print(resp.choices[0].message.content)
"""

from __future__ import annotations

import json
import os
import time
import uuid
from typing import Any, List, Literal, Optional

from huggingface_hub import InferenceClient

from mlx_client import (
    ChatCompletionChoice,
    ChatCompletionResponse,
    ChatMessage,
    FunctionTool,
    TokenUsage,
    ToolCall,
    ToolCallFunction,
)

DEFAULT_HF_MODEL = "Qwen/Qwen2.5-72B-Instruct"


class HFConfig:
    def __init__(
        self,
        model: str = "",
        token: str = "",
        default_temperature: float = 0.2,
        default_max_tokens: int = 8192,
    ):
        self.model = model or os.environ.get("HF_MODEL", DEFAULT_HF_MODEL)
        self.token = token or os.environ.get("HF_TOKEN", "")
        self.default_temperature = default_temperature
        self.default_max_tokens = default_max_tokens


class HFClient:
    """HuggingFace Inference API client. Drop-in replacement for MLXClient."""

    def __init__(self, config: Optional[HFConfig] = None) -> None:
        cfg = config or HFConfig()
        self._model = cfg.model
        self._default_temperature = cfg.default_temperature
        self._default_max_tokens = cfg.default_max_tokens
        kwargs: dict[str, Any] = {"model": self._model}
        if cfg.token:
            kwargs["token"] = cfg.token
        self._client = InferenceClient(**kwargs)

    async def __aenter__(self) -> HFClient:
        return self

    async def __aexit__(self, *exc: Any) -> None:
        pass

    async def close(self) -> None:
        pass

    async def chat(
        self,
        messages: List[ChatMessage],
        *,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        tools: Optional[List[FunctionTool]] = None,
        tool_choice: Any = None,
        **kwargs: Any,
    ) -> ChatCompletionResponse:
        """Chat completion via HuggingFace Inference API."""
        temp = temperature or self._default_temperature
        max_tok = max_tokens or self._default_max_tokens

        # Convert ChatMessage to dicts
        msgs = [{"role": m.role, "content": m.content} for m in messages
                if m.role in ("system", "user", "assistant")]
        # Add tool results as user messages (HF API doesn't have tool role natively)
        for m in messages:
            if m.role == "tool" and m not in [msg for msg in messages if msg.role in ("system", "user", "assistant")]:
                pass  # handled below

        # Rebuild messages properly for HF API
        hf_messages: list[dict[str, Any]] = []
        for m in messages:
            msg: dict[str, Any] = {"role": m.role, "content": m.content}
            if m.tool_calls:
                msg["tool_calls"] = [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                    }
                    for tc in m.tool_calls
                ]
            if m.tool_call_id:
                msg["tool_call_id"] = m.tool_call_id
            hf_messages.append(msg)

        # Build API call kwargs
        api_kwargs: dict[str, Any] = {
            "messages": hf_messages,
            "temperature": temp,
            "max_tokens": max_tok,
        }
        if tools:
            api_kwargs["tools"] = [t.model_dump() for t in tools]
            if tool_choice:
                api_kwargs["tool_choice"] = tool_choice

        resp = self._client.chat_completion(**api_kwargs)

        # Parse response
        choice = resp.choices[0]
        msg_out = choice.message

        # Extract tool calls if present
        tool_calls: list[ToolCall] = []
        if msg_out.tool_calls:
            for tc in msg_out.tool_calls:
                args = tc.function.arguments
                if isinstance(args, dict):
                    args = json.dumps(args)
                tool_calls.append(ToolCall(
                    id=tc.id or f"call_{uuid.uuid4().hex[:8]}",
                    function=ToolCallFunction(
                        name=tc.function.name,
                        arguments=str(args),
                    ),
                ))

        content = msg_out.content or ""
        finish_reason: Optional[Literal["stop", "length", "tool_calls"]] = (
            "tool_calls" if tool_calls else "stop"
        )

        return ChatCompletionResponse(
            id=f"hf-{uuid.uuid4().hex[:12]}",
            created=int(time.time()),
            model=self._model,
            choices=[ChatCompletionChoice(
                index=0,
                message=ChatMessage(
                    role="assistant",
                    content=content,
                    tool_calls=tool_calls if tool_calls else None,
                ),
                finish_reason=finish_reason,
            )],
            usage=TokenUsage(
                prompt_tokens=getattr(resp.usage, "prompt_tokens", 0) if resp.usage else 0,
                completion_tokens=getattr(resp.usage, "completion_tokens", 0) if resp.usage else 0,
                total_tokens=getattr(resp.usage, "total_tokens", 0) if resp.usage else 0,
            ),
        )
