"""DeepSeek API types. Mirrors packages/deepseek/src/types.ts."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

MessageRole = Literal["system", "user", "assistant", "tool"]


class ToolCall(BaseModel):
    id: str
    type: Literal["function"] = "function"
    function: ToolCallFunction


class ToolCallFunction(BaseModel):
    name: str
    arguments: str


class FunctionTool(BaseModel):
    type: Literal["function"] = "function"
    function: FunctionToolDef


class FunctionToolDef(BaseModel):
    name: str
    description: str | None = None
    parameters: dict | None = None


class ChatMessage(BaseModel):
    role: MessageRole
    content: str
    reasoning_content: str | None = None
    name: str | None = None
    tool_calls: list[ToolCall] | None = None
    tool_call_id: str | None = None
    prefix: bool | None = None


class ChatCompletionRequest(BaseModel):
    model: str
    messages: list[ChatMessage]
    temperature: float | None = None
    max_tokens: int | None = None
    top_p: float | None = None
    frequency_penalty: float | None = None
    presence_penalty: float | None = None
    stop: str | list[str] | None = None
    stream: bool = False
    tools: list[FunctionTool] | None = None
    tool_choice: str | dict | None = None
    response_format: dict | None = None
    logprobs: bool | None = None
    top_logprobs: int | None = None
    n: int | None = None
    user: str | None = None


class TokenUsage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    prompt_cache_hit_tokens: int | None = None
    prompt_cache_miss_tokens: int | None = None


class ChatCompletionChoice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: Literal["stop", "length", "tool_calls", "content_filter"] | None = None
    logprobs: dict | None = None


class ChatCompletionResponse(BaseModel):
    id: str
    object: Literal["chat.completion"] = "chat.completion"
    created: int
    model: str
    choices: list[ChatCompletionChoice]
    usage: TokenUsage
    system_fingerprint: str | None = None


class ChatCompletionStreamDelta(BaseModel):
    role: MessageRole | None = None
    content: str | None = None
    reasoning_content: str | None = None
    tool_calls: list[dict] | None = None


class ChatCompletionStreamChoice(BaseModel):
    index: int
    delta: ChatCompletionStreamDelta
    finish_reason: Literal["stop", "length", "tool_calls", "content_filter"] | None = None


class ChatCompletionStreamChunk(BaseModel):
    id: str
    object: Literal["chat.completion.chunk"] = "chat.completion.chunk"
    created: int
    model: str
    choices: list[ChatCompletionStreamChoice]
    usage: TokenUsage | None = None


class FIMCompletionRequest(BaseModel):
    model: str
    prompt: str
    suffix: str | None = None
    max_tokens: int | None = 4096
    temperature: float | None = None
    top_p: float | None = None
    frequency_penalty: float | None = None
    presence_penalty: float | None = None
    stop: str | list[str] | None = None
    stream: bool = False
    user: str | None = None


class FIMCompletionChoice(BaseModel):
    text: str
    index: int
    logprobs: dict | None = None
    finish_reason: Literal["stop", "length"] | None = None


class FIMCompletionResponse(BaseModel):
    id: str
    object: Literal["text_completion"] = "text_completion"
    created: int
    model: str
    choices: list[FIMCompletionChoice]
    usage: TokenUsage


class DeepSeekError(BaseModel):
    message: str
    type: str | None = None
    code: str | int | None = None
    param: str | None = None


class DeepSeekConfig(BaseModel):
    api_key: str | None = None
    base_url: str | None = None
    max_retries: int = Field(default=3)
    timeout: float = Field(default=60.0)
    default_model: str = Field(default="deepseek-chat")
    default_temperature: float | None = None
    default_max_tokens: int | None = None
    use_beta: bool = False
