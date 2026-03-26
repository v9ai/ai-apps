"""
Audit Decorators for Automatic Pipeline Event Logging
for Scrapus M1 Local Deployment

Provides:
1. @audited(stage, action) -- decorator that auto-logs function calls
2. @audit_batch(stage) -- context manager for batch audit logging
3. Integration helpers for each pipeline stage
4. Configurable detail level (minimal, standard, verbose)
5. Performance target: <0.5ms overhead per logged event

Usage:

    from audit_trail import AuditTrail, AuditStage, AuditAction
    from audit_decorators import audited, audit_batch, set_audit_trail

    trail = AuditTrail()
    set_audit_trail(trail)

    @audited(AuditStage.NER_EXTRACTION, AuditAction.ENTITY_EXTRACTED)
    def extract_entities(page_url: str, html: str) -> List[Entity]:
        ...

    # Batch context for high-throughput stages
    with audit_batch(AuditStage.NER_EXTRACTION, AuditAction.ENTITY_EXTRACTED) as batch:
        for entity in entities:
            batch.add(entity_id=entity.id, details={"type": entity.type})

Dependencies: stdlib only (functools, time, threading, contextlib)
"""

import functools
import logging
import threading
import time
from contextlib import contextmanager
from typing import Any, Callable, Dict, List, Optional, Tuple, TypeVar

from audit_trail import (
    AuditAction,
    AuditStage,
    AuditTrail,
    DetailLevel,
)

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Any])

# ============================================================================
# Global audit trail registry
# ============================================================================

_trail_lock = threading.Lock()
_global_trail: Optional[AuditTrail] = None


def set_audit_trail(trail: AuditTrail) -> None:
    """
    Register the global AuditTrail instance used by decorators.
    Must be called once during pipeline initialization.
    """
    global _global_trail
    with _trail_lock:
        _global_trail = trail
    logger.info("Global audit trail registered for decorators")


def get_audit_trail() -> Optional[AuditTrail]:
    """Get the currently registered global AuditTrail."""
    return _global_trail


def _require_trail() -> AuditTrail:
    """Get the global trail or raise if not registered."""
    trail = _global_trail
    if trail is None:
        raise RuntimeError(
            "No AuditTrail registered. Call set_audit_trail() during pipeline init."
        )
    return trail


# ============================================================================
# @audited decorator
# ============================================================================

def audited(
    stage: AuditStage,
    action: AuditAction,
    entity_id_param: Optional[str] = None,
    include_result: bool = False,
    detail_keys: Optional[List[str]] = None,
) -> Callable[[F], F]:
    """
    Decorator that automatically logs a function call to the audit trail.

    The decorated function is called normally. Before return, an audit
    event is logged with the function's inputs (or a subset) and
    optionally the return value.

    Overhead: <0.5ms per call (SHA-256 hash + dict construction).

    Args:
        stage: Pipeline stage producing the event.
        action: Audit action type.
        entity_id_param: Name of the kwarg/arg to use as entity_id.
                         If None, entity_id is omitted from the log.
        include_result: If True, include the return value in details.
        detail_keys: If set, only include these kwargs in the details
                     dict. If None, include all non-large kwargs.

    Example:
        @audited(AuditStage.CRAWLER, AuditAction.PAGE_CRAWLED,
                 entity_id_param="url", include_result=True)
        def crawl_page(url: str, timeout: int = 30) -> CrawlResult:
            ...
    """
    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            trail = _global_trail
            if trail is None:
                # No trail registered: execute without auditing
                return func(*args, **kwargs)

            t0 = time.perf_counter()

            # Extract entity_id from args/kwargs
            entity_id = _extract_entity_id(func, args, kwargs, entity_id_param)

            # Execute the actual function
            result = func(*args, **kwargs)

            elapsed_ms = (time.perf_counter() - t0) * 1000

            # Build details
            details = _build_details(
                func, args, kwargs, result,
                elapsed_ms, include_result, detail_keys,
            )

            # Log the event
            try:
                trail.log(
                    stage=stage,
                    action=action,
                    entity_id=entity_id,
                    details=details,
                )
            except Exception as e:
                # Audit logging must never crash the pipeline
                logger.warning(
                    "Audit logging failed for %s.%s: %s",
                    func.__module__, func.__qualname__, e,
                )

            return result

        return wrapper  # type: ignore[return-value]
    return decorator


def audited_async(
    stage: AuditStage,
    action: AuditAction,
    entity_id_param: Optional[str] = None,
    include_result: bool = False,
    detail_keys: Optional[List[str]] = None,
) -> Callable[[F], F]:
    """
    Async version of @audited for coroutine functions.

    Same parameters and behavior as @audited, but works with
    async def functions.
    """
    def decorator(func: F) -> F:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            trail = _global_trail
            if trail is None:
                return await func(*args, **kwargs)

            t0 = time.perf_counter()
            entity_id = _extract_entity_id(func, args, kwargs, entity_id_param)

            result = await func(*args, **kwargs)

            elapsed_ms = (time.perf_counter() - t0) * 1000
            details = _build_details(
                func, args, kwargs, result,
                elapsed_ms, include_result, detail_keys,
            )

            try:
                trail.log(
                    stage=stage,
                    action=action,
                    entity_id=entity_id,
                    details=details,
                )
            except Exception as e:
                logger.warning(
                    "Async audit logging failed for %s.%s: %s",
                    func.__module__, func.__qualname__, e,
                )

            return result

        return wrapper  # type: ignore[return-value]
    return decorator


# ============================================================================
# Batch audit context manager
# ============================================================================

class AuditBatch:
    """
    Accumulates audit events and flushes them as a single batch.
    Used for high-throughput stages (NER can produce thousands of events).

    Events are buffered in memory and written to the audit trail in one
    call to log_batch(), which is significantly faster than individual
    log() calls due to reduced SQLite transaction overhead.
    """

    def __init__(
        self,
        trail: AuditTrail,
        stage: AuditStage,
        action: AuditAction,
    ):
        self._trail = trail
        self._stage = stage
        self._action = action
        self._buffer: List[Tuple[Optional[str], Optional[Dict[str, Any]]]] = []
        self._count = 0

    def add(
        self,
        entity_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Add an event to the batch buffer."""
        self._buffer.append((entity_id, details))
        self._count += 1

    def flush(self) -> List[str]:
        """Flush buffered events to the audit trail. Returns list of hashes."""
        if not self._buffer:
            return []
        hashes = self._trail.log_batch(
            stage=self._stage,
            action=self._action,
            entries=self._buffer,
        )
        count = len(self._buffer)
        self._buffer.clear()
        logger.debug("Flushed %d audit events for %s/%s", count, self._stage.value, self._action.value)
        return hashes

    @property
    def pending_count(self) -> int:
        """Number of events waiting to be flushed."""
        return len(self._buffer)

    @property
    def total_count(self) -> int:
        """Total events added (including already-flushed)."""
        return self._count


@contextmanager
def audit_batch(
    stage: AuditStage,
    action: AuditAction,
):
    """
    Context manager for batch audit logging.

    All events added via batch.add() are flushed atomically on exit.
    If an exception occurs, the batch is still flushed (partial results
    are better than no audit trail for error investigation).

    Usage:
        with audit_batch(AuditStage.NER_EXTRACTION, AuditAction.ENTITY_EXTRACTED) as batch:
            for entity in extracted_entities:
                batch.add(entity_id=entity.id, details={"type": entity.type})
        # All events flushed here
    """
    trail = _require_trail()
    batch = AuditBatch(trail, stage, action)
    try:
        yield batch
    finally:
        batch.flush()


# ============================================================================
# Stage lifecycle helpers
# ============================================================================

@contextmanager
def audit_stage(
    stage: AuditStage,
    run_id: Optional[str] = None,
):
    """
    Context manager that logs STAGE_STARTED and STAGE_COMPLETED events.

    Automatically captures elapsed time and items processed (if the
    yielded dict is updated with 'items_processed').

    Usage:
        with audit_stage(AuditStage.NER_EXTRACTION, run_id="run-123") as ctx:
            results = process_pages(pages)
            ctx["items_processed"] = len(results)
        # STAGE_COMPLETED logged with elapsed time and item count
    """
    trail = _require_trail()
    ctx: Dict[str, Any] = {"items_processed": 0}

    trail.log_stage_started(stage, run_id=run_id)
    t0 = time.perf_counter()

    try:
        yield ctx
    except Exception as e:
        elapsed = time.perf_counter() - t0
        trail.log_error(
            stage=stage,
            error_type=type(e).__name__,
            message=str(e),
        )
        raise
    finally:
        elapsed = time.perf_counter() - t0
        trail.log_stage_completed(
            stage=stage,
            items_processed=ctx.get("items_processed", 0),
            elapsed_s=elapsed,
            run_id=run_id,
        )


# ============================================================================
# Internal helpers
# ============================================================================

def _extract_entity_id(
    func: Callable,
    args: tuple,
    kwargs: Dict[str, Any],
    param_name: Optional[str],
) -> Optional[str]:
    """
    Extract the entity_id value from function arguments.
    Looks in kwargs first, then positional args by inspecting
    the function signature.
    """
    if param_name is None:
        return None

    # Check kwargs first
    if param_name in kwargs:
        val = kwargs[param_name]
        return str(val) if val is not None else None

    # Fall back to positional args via function code inspection
    try:
        code = func.__code__
        var_names = code.co_varnames[:code.co_argcount]
        if param_name in var_names:
            idx = list(var_names).index(param_name)
            if idx < len(args):
                val = args[idx]
                return str(val) if val is not None else None
    except (AttributeError, IndexError):
        pass

    return None


def _build_details(
    func: Callable,
    args: tuple,
    kwargs: Dict[str, Any],
    result: Any,
    elapsed_ms: float,
    include_result: bool,
    detail_keys: Optional[List[str]],
) -> Dict[str, Any]:
    """
    Build the details dict for an audited function call.

    Keeps it lightweight to stay under 0.5ms overhead:
    - Only serializable kwargs (skip large objects)
    - Truncate string values at 256 chars
    - Cap at 10 detail keys to prevent bloat
    """
    details: Dict[str, Any] = {
        "function": func.__qualname__,
        "elapsed_ms": round(elapsed_ms, 2),
    }

    # Add selected kwargs
    MAX_KEYS = 10
    MAX_STR_LEN = 256
    added = 0

    selected_kwargs = (
        {k: v for k, v in kwargs.items() if k in detail_keys}
        if detail_keys
        else kwargs
    )

    for key, value in selected_kwargs.items():
        if added >= MAX_KEYS:
            break
        if _is_serializable(value):
            if isinstance(value, str) and len(value) > MAX_STR_LEN:
                value = value[:MAX_STR_LEN] + "..."
            details[key] = value
            added += 1

    # Optionally include result summary
    if include_result and result is not None:
        details["result_type"] = type(result).__name__
        if isinstance(result, (list, tuple)):
            details["result_count"] = len(result)
        elif isinstance(result, dict):
            details["result_keys"] = list(result.keys())[:10]
        elif isinstance(result, (int, float, bool, str)):
            if isinstance(result, str) and len(result) > MAX_STR_LEN:
                details["result"] = result[:MAX_STR_LEN] + "..."
            else:
                details["result"] = result

    return details


def _is_serializable(value: Any) -> bool:
    """
    Quick check if a value is JSON-serializable without attempting
    full serialization (which would be too slow for <0.5ms target).
    """
    return isinstance(value, (str, int, float, bool, type(None), list, dict, tuple))
