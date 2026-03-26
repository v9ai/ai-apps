from typing import TypedDict


class AdminChatState(TypedDict):
    prompt: str
    system: str  # optional custom system prompt
    response: str
