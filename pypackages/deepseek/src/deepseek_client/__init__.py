"""DeepSeek API Client — shared across Python apps."""

from .client import DeepSeekClient, create_client, chat
from .constants import DEEPSEEK_MODELS, DEEPSEEK_API_BASE_URL, DEEPSEEK_API_BETA_URL, DEFAULT_CONFIG
from .types import (
    ChatMessage,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionStreamChunk,
    FIMCompletionRequest,
    FIMCompletionResponse,
    DeepSeekConfig,
    DeepSeekError,
    MessageRole,
    TokenUsage,
    FunctionTool,
    ToolCall,
)

__all__ = [
    "DeepSeekClient",
    "create_client",
    "chat",
    "DEEPSEEK_MODELS",
    "DEEPSEEK_API_BASE_URL",
    "DEEPSEEK_API_BETA_URL",
    "DEFAULT_CONFIG",
    "ChatMessage",
    "ChatCompletionRequest",
    "ChatCompletionResponse",
    "ChatCompletionStreamChunk",
    "FIMCompletionRequest",
    "FIMCompletionResponse",
    "DeepSeekConfig",
    "DeepSeekError",
    "MessageRole",
    "TokenUsage",
    "FunctionTool",
    "ToolCall",
]
