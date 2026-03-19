"""Research paper types and utilities."""

from __future__ import annotations

import asyncio
import functools
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


class PaperSource(Enum):
    SEMANTIC_SCHOLAR = "SemanticScholar"
    OPENALEX = "OpenAlex"
    CROSSREF = "Crossref"
    CORE = "CORE"
    # Editorial sources
    INFOQ = "InfoQ"
    THE_NEW_STACK = "TheNewStack"

    TOWARDS_DATA_SCIENCE = "TowardsDataScience"


@dataclass
class ResearchPaper:
    title: str
    authors: list[str] = field(default_factory=list)
    year: int | None = None
    citation_count: int | None = None
    abstract_text: str | None = None
    doi: str | None = None
    url: str | None = None
    pdf_url: str | None = None
    source: PaperSource = PaperSource.SEMANTIC_SCHOLAR
    source_id: str = ""
    fields_of_study: list[str] | None = None


def retry_async(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    fallback: Callable[[], T] | None = None,
):
    """Decorator: retry an async function with exponential backoff.

    On final failure returns ``fallback()`` if provided, otherwise re-raises.
    """

    def decorator(fn):
        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            last_exc: Exception | None = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return await fn(*args, **kwargs)
                except Exception as exc:
                    last_exc = exc
                    if attempt < max_attempts:
                        delay = base_delay * (2 ** (attempt - 1))
                        logger.warning(
                            "%s attempt %d/%d failed (%s), retrying in %.1fs",
                            fn.__qualname__,
                            attempt,
                            max_attempts,
                            exc,
                            delay,
                        )
                        await asyncio.sleep(delay)
            if fallback is not None:
                logger.warning(
                    "%s exhausted %d attempts, returning fallback",
                    fn.__qualname__,
                    max_attempts,
                )
                return fallback()
            raise last_exc  # type: ignore[misc]

        return wrapper

    return decorator
