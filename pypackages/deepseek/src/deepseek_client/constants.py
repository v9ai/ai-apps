"""DeepSeek API constants. Mirrors packages/deepseek/src/constants.ts."""

from typing import Final

DEEPSEEK_API_BASE_URL: Final = "https://api.deepseek.com"
DEEPSEEK_API_V1_URL: Final = "https://api.deepseek.com/v1"
DEEPSEEK_API_BETA_URL: Final = "https://api.deepseek.com/beta"


class DEEPSEEK_MODELS:
    """Available DeepSeek models."""

    CHAT: Final = "deepseek-chat"
    """DeepSeek-V3.2 Chat (128K context) — non-thinking mode."""

    REASONER: Final = "deepseek-reasoner"
    """DeepSeek-V3.2 Reasoner (128K context) — thinking mode with chain-of-thought."""


DEFAULT_CONFIG: Final = {
    "max_retries": 3,
    "timeout": 60.0,
    "temperature": 1.0,
    "max_tokens": 4096,
}
