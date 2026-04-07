"""salescue/reproducibility.py — Deterministic mode for reproducible results.

Sets all random seeds and disables nondeterministic CUDA operations.
Use for testing, benchmarking, and result reproduction.
"""

from __future__ import annotations

import os
import random

import torch
import numpy as np


def set_deterministic(seed: int = 42) -> None:
    """Enable fully deterministic execution.

    Sets all random seeds across Python, NumPy, and PyTorch.
    Disables CUDA nondeterministic operations and configures
    cuBLAS workspace for determinism.

    Args:
        seed: Random seed to use across all libraries.
    """
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)

    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)

    torch.use_deterministic_algorithms(True, warn_only=True)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

    # Required for deterministic cuBLAS operations
    os.environ["CUBLAS_WORKSPACE_CONFIG"] = ":4096:8"


def set_seed(seed: int = 42) -> None:
    """Set random seeds without enabling full deterministic mode.

    Lighter weight than set_deterministic — sets seeds but doesn't
    disable nondeterministic algorithms. Use for general reproducibility
    when exact bit-for-bit reproduction isn't required.
    """
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)

    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
