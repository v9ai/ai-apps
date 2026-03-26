"""Configuration for the LanceDB vectordb module."""

from pathlib import Path

LANCE_DB_PATH = str(Path.home() / ".lance" / "lead-gen")
LANCE_LINKEDIN_PATH = str(Path.home() / ".lance" / "linkedin")  # Rust store (read-only)

MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIM = 384
MAX_TOKEN_LENGTH = 128
BATCH_SIZE = 256
