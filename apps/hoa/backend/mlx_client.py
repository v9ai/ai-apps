"""Local LLM client using Apple MLX — fully offline, no API keys.

Loads a Qwen2.5-Instruct model via mlx_lm and exposes the same interface
as the former DeepSeek API client. Supports tool/function calling via
Qwen2.5's native chat template.

Usage:
    client = MLXClient(MLXConfig(model="mlx-community/Qwen2.5-7B-Instruct-4bit"))
    resp = await client.chat([ChatMessage(role="user", content="Hello")])
    print(resp.choices[0].message.content)
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import time
import uuid
from typing import Any, Dict, List, Literal, Optional, Tuple

from pydantic import BaseModel, Field

# ── Types ─────────────────────────────────────────────────────────────────

MessageRole = Literal["system", "user", "assistant", "tool"]

DEFAULT_MODEL = "mlx-community/Qwen2.5-7B-Instruct-4bit"


class ToolCallFunction(BaseModel):
    name: str
    arguments: str


class ToolCall(BaseModel):
    id: str
    type: Literal["function"] = "function"
    function: ToolCallFunction


class FunctionToolDef(BaseModel):
    name: str
    description: Optional[str] = None
    parameters: Optional[dict] = None


class FunctionTool(BaseModel):
    type: Literal["function"] = "function"
    function: FunctionToolDef


class ChatMessage(BaseModel):
    role: MessageRole
    content: str
    tool_calls: Optional[List[ToolCall]] = None
    tool_call_id: Optional[str] = None


class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class ChatCompletionChoice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: Optional[Literal["stop", "length", "tool_calls"]] = None


class ChatCompletionResponse(BaseModel):
    id: str
    object: Literal["chat.completion"] = "chat.completion"
    created: int
    model: str
    choices: List[ChatCompletionChoice]
    usage: TokenUsage


class MLXConfig(BaseModel):
    model: str = Field(default_factory=lambda: os.environ.get("MLX_MODEL", DEFAULT_MODEL))
    default_temperature: float = 0.2
    default_max_tokens: int = 4096


# ── Model singleton cache ────────────────────────────────────────────────

_model_cache: Dict[str, Tuple[Any, Any]] = {}


def _load_model(model_name: str) -> Tuple[Any, Any]:
    """Load model+tokenizer into cache. Returns (model, tokenizer)."""
    if model_name not in _model_cache:
        import mlx_lm
        from rich.console import Console
        console = Console()
        console.print(f"[bold cyan]Loading MLX model:[/] {model_name}")
        model, tokenizer = mlx_lm.load(model_name)
        _model_cache[model_name] = (model, tokenizer)
        console.print(f"[green]Model loaded.[/]")
    return _model_cache[model_name]


# ── Tool call parser ─────────────────────────────────────────────────────

# Grab everything between <tool_call> and </tool_call> or end-of-string
_TOOL_CALL_BLOCK_RE = re.compile(
    r"<tool_call>\s*(.*?)\s*(?:</tool_call>|$)", re.S
)
# For stripping tool call blocks from the response text
_TOOL_CALL_STRIP_RE = re.compile(r"<tool_call>.*?(?:</tool_call>|$)", re.S)


def _extract_json_obj(raw: str) -> Optional[dict]:
    """Try to extract a JSON object from a raw string, handling doubled braces."""
    s = raw.strip()
    # Strip outer doubled braces: {{...}} → {...}
    while s.startswith("{{") and s.endswith("}}"):
        s = s[1:-1]
    # Try parsing as-is, then try stripping trailing extra braces
    for candidate in [s, s.rstrip("}") + "}" if s.endswith("}}") else s]:
        try:
            obj = json.loads(candidate)
            if isinstance(obj, dict):
                return obj
        except json.JSONDecodeError:
            continue
    # Brute-force: find the outermost balanced {} pair
    depth = 0
    start = None
    for i, c in enumerate(s):
        if c == "{":
            if start is None:
                start = i
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0 and start is not None:
                try:
                    obj = json.loads(s[start : i + 1])
                    if isinstance(obj, dict):
                        return obj
                except json.JSONDecodeError:
                    pass
                break
    return None


def _parse_tool_calls(text: str) -> List[ToolCall]:
    """Extract tool calls from Qwen2.5 <tool_call> blocks."""
    calls: List[ToolCall] = []
    for m in _TOOL_CALL_BLOCK_RE.finditer(text):
        obj = _extract_json_obj(m.group(1))
        if obj is None:
            continue
        name = obj.get("name", "")
        if not name:
            continue
        args = obj.get("arguments", {})
        if isinstance(args, dict):
            args = json.dumps(args)
        calls.append(ToolCall(
            id=f"call_{uuid.uuid4().hex[:8]}",
            function=ToolCallFunction(name=name, arguments=str(args)),
        ))
    return calls


# ── MLXClient ─────────────────────────────────────────────────────────────


class MLXClient:
    """Local LLM client using mlx_lm. Drop-in replacement for DeepSeekClient."""

    def __init__(self, config: Optional[MLXConfig] = None) -> None:
        cfg = config or MLXConfig()
        self._model_name = cfg.model
        self._default_temperature = cfg.default_temperature
        self._default_max_tokens = cfg.default_max_tokens
        # Eagerly load model on first client creation
        self._model, self._tokenizer = _load_model(self._model_name)

    async def __aenter__(self) -> MLXClient:
        return self

    async def __aexit__(self, *exc: Any) -> None:
        pass

    async def close(self) -> None:
        pass

    # ── Chat ──────────────────────────────────────────────────────────

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
        """Generate a chat completion using the local MLX model."""
        temp = temperature or self._default_temperature
        max_tok = max_tokens or self._default_max_tokens

        # Build messages for the tokenizer
        msgs = self._format_messages(messages)
        tool_defs = [t.model_dump() for t in tools] if tools else None

        # Apply chat template
        prompt = self._tokenizer.apply_chat_template(
            msgs,
            tools=tool_defs,
            tokenize=False,
            add_generation_prompt=True,
        )

        # Generate (offload to thread to not block event loop)
        raw = await asyncio.to_thread(
            self._generate_sync, prompt, temp, max_tok
        )

        # Parse tool calls from output
        tool_calls = _parse_tool_calls(raw) if tools else []

        if tool_calls:
            # Strip tool_call XML from content
            content = _TOOL_CALL_STRIP_RE.sub("", raw).strip()
            finish_reason: Optional[Literal["stop", "length", "tool_calls"]] = "tool_calls"
        else:
            content = raw.strip()
            finish_reason = "stop"

        return ChatCompletionResponse(
            id=f"mlx-{uuid.uuid4().hex[:12]}",
            created=int(time.time()),
            model=self._model_name,
            choices=[ChatCompletionChoice(
                index=0,
                message=ChatMessage(
                    role="assistant",
                    content=content,
                    tool_calls=tool_calls if tool_calls else None,
                ),
                finish_reason=finish_reason,
            )],
            usage=TokenUsage(),
        )

    def _generate_sync(self, prompt: str, temperature: float, max_tokens: int) -> str:
        """Synchronous generation call."""
        import mlx_lm
        from mlx_lm.sample_utils import make_sampler
        sampler = make_sampler(temp=temperature)
        return mlx_lm.generate(
            self._model,
            self._tokenizer,
            prompt=prompt,
            max_tokens=max_tokens,
            sampler=sampler,
        )

    def _format_messages(self, messages: List[ChatMessage]) -> List[Dict[str, Any]]:
        """Convert ChatMessage objects to dicts for apply_chat_template."""
        out: List[Dict[str, Any]] = []
        for msg in messages:
            d: Dict[str, Any] = {"role": msg.role, "content": msg.content}
            if msg.tool_calls:
                d["tool_calls"] = [
                    {
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in msg.tool_calls
                ]
            out.append(d)
        return out
