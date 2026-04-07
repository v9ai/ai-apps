"""Shared fixtures for salescue tests.

Uses real backbone for integration tests. Tests that don't need the encoder
should mock SharedEncoder.encode() for speed.
"""

import pytest
import torch

from salescue.backbone import SharedEncoder, get_device
from salescue.reproducibility import set_seed


@pytest.fixture(autouse=True)
def _seed():
    """Set seed before every test for deterministic behavior."""
    set_seed(42)


@pytest.fixture(scope="session")
def device():
    return get_device()


@pytest.fixture(scope="session")
def encoder_loaded():
    """Load the shared encoder once for the whole session."""
    SharedEncoder.load()
    return True


@pytest.fixture
def sample_email():
    return "We need to see pricing for 500 seats by end of quarter. Can you send a proposal?"


@pytest.fixture
def spam_email():
    return "CONGRATULATIONS! You've won a FREE iPhone! Click here NOW!!!"


@pytest.fixture
def mock_encoded():
    """Create a mock encoder output on CPU for unit tests that don't need real encoding.

    Uses CPU to avoid device mismatch with freshly instantiated modules.
    """
    batch_size, seq_len, hidden = 1, 32, 768

    class FakeOutput:
        def __init__(self):
            self.last_hidden_state = torch.randn(batch_size, seq_len, hidden)

    return {
        "encoder_output": FakeOutput(),
        "tokens": {"input_ids": torch.ones(batch_size, seq_len, dtype=torch.long)},
        "input_ids": torch.ones(batch_size, seq_len, dtype=torch.long),
        "attention_mask": torch.ones(batch_size, seq_len, dtype=torch.long),
    }
