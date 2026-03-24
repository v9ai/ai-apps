"""Retry-with-backoff wrapper for LLM calls in LangGraph nodes."""

import logging
import time
from functools import wraps

logger = logging.getLogger(__name__)

# Retryable exception types from common LLM SDKs
_RETRYABLE_NAMES = {
    "RateLimitError",
    "APITimeoutError",
    "APIConnectionError",
    "InternalServerError",
    "ServiceUnavailableError",
}


def _is_retryable(exc: Exception) -> bool:
    return type(exc).__name__ in _RETRYABLE_NAMES


def with_retry(max_attempts: int = 3, base_delay: float = 1.0):
    """Decorator that retries a function on transient LLM API errors.

    Uses exponential backoff: base_delay * 2^attempt (1s, 2s, 4s).
    Only retries on rate-limit, timeout, and connection errors.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(max_attempts):
                try:
                    return fn(*args, **kwargs)
                except Exception as exc:
                    if not _is_retryable(exc) or attempt == max_attempts - 1:
                        raise
                    last_exc = exc
                    delay = base_delay * (2 ** attempt)
                    logger.warning(
                        "Retry %d/%d for %s after %s: %s",
                        attempt + 1, max_attempts, fn.__name__,
                        type(exc).__name__, exc,
                    )
                    time.sleep(delay)
            raise last_exc  # unreachable, but satisfies type checker
        return wrapper
    return decorator
