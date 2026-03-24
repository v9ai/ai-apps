"""Re-export shared model factories for backward compatibility."""

from models import build_fast, build_reasoner

__all__ = ["build_fast", "build_reasoner"]
