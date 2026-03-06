from abc import ABC, abstractmethod
from typing import Any, Dict, Type, Optional
import asyncio
import logging
from pydantic import BaseModel


class AgentError(Exception):
    pass


class BaseAgent(ABC):
    def __init__(self, name: str, llm_service=None):
        self.name = name
        self.llm_service = llm_service
        self.logger = logging.getLogger(f"agent.{name}")

    @abstractmethod
    async def execute(self, input_data: Any, context: Dict[str, Any] = None) -> Any:
        pass

    async def _call_llm(self, prompt: str, response_model: Type[BaseModel],
                        system_prompt: str = "", timeout: int = 120) -> BaseModel:
        try:
            return await asyncio.wait_for(
                self.llm_service.get_structured_response(
                    prompt=prompt, response_model=response_model, system_prompt=system_prompt
                ),
                timeout=timeout,
            )
        except asyncio.TimeoutError:
            raise AgentError(f"{self.name}: LLM call timed out after {timeout}s")
        except Exception as e:
            raise AgentError(f"{self.name}: LLM call failed: {e}")

    async def _call_llm_text(self, system: str, user: str, timeout: int = 120) -> str:
        try:
            return await asyncio.wait_for(
                self.llm_service.get_completion(system=system, user=user),
                timeout=timeout,
            )
        except asyncio.TimeoutError:
            raise AgentError(f"{self.name}: LLM call timed out after {timeout}s")
        except Exception as e:
            raise AgentError(f"{self.name}: LLM call failed: {e}")
