"""Model abstraction and routing — DeepSeek only."""

from __future__ import annotations

import os
from enum import Enum

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()


DEEPSEEK_REASONER = "deepseek-reasoner"
DEEPSEEK_CHAT = "deepseek-chat"


class TeamRole(Enum):
    REASONER = "reasoner"
    FAST = "fast"
    REVIEWER = "reviewer"


class ModelPool:
    """DeepSeek model pool — reasoner for heavy tasks, chat for fast tasks."""

    def __init__(self, reasoner: ChatOpenAI, fast: ChatOpenAI):
        self.reasoner = reasoner
        self.fast = fast

    @classmethod
    def from_env(cls) -> ModelPool:
        api_key = os.environ["DEEPSEEK_API_KEY"]
        base_url = "https://api.deepseek.com/v1"

        reasoner = ChatOpenAI(
            model=DEEPSEEK_REASONER,
            api_key=api_key,
            base_url=base_url,
            temperature=0,
        )
        fast = ChatOpenAI(
            model=DEEPSEEK_CHAT,
            api_key=api_key,
            base_url=base_url,
            temperature=0,
        )

        return cls(reasoner=reasoner, fast=fast)

    def for_role(self, role: TeamRole) -> ChatOpenAI:
        if role in (TeamRole.REASONER, TeamRole.REVIEWER):
            return self.reasoner
        return self.fast

    def label(self) -> str:
        return f"{DEEPSEEK_REASONER} + {DEEPSEEK_CHAT}"
