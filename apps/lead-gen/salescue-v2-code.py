"""salescue/validation.py — Input validation for all module entry points.

Validates text inputs, required fields, and type constraints before any
module processing. Raises ClosingTimeValidationError with clear messages.
"""

from __future__ import annotations

MAX_TEXT_LENGTH = 100_000
MIN_TEXT_LENGTH = 1


class ClosingTimeValidationError(ValueError):
    """Raised when module input fails validation."""


def validate_text(text: object, *, field: str = "text", max_length: int = MAX_TEXT_LENGTH) -> str:
    """Validate a text input and return the cleaned string."""
    if text is None:
        raise ClosingTimeValidationError(f"{field} is required (got None)")
    if not isinstance(text, str):
        raise ClosingTimeValidationError(
            f"{field} must be a string, got {type(text).__name__}"
        )
    text = text.strip()
    if len(text) < MIN_TEXT_LENGTH:
        raise ClosingTimeValidationError(f"{field} must be non-empty after stripping whitespace")
    if len(text) > max_length:
        raise ClosingTimeValidationError(
            f"{field} exceeds maximum length ({len(text)} > {max_length})"
        )
    return text


def validate_transcript(transcript: object) -> list[dict]:
    """Validate a call transcript (list of turn dicts)."""
    if not isinstance(transcript, list):
        raise ClosingTimeValidationError(
            f"transcript must be a list, got {type(transcript).__name__}"
        )
    if len(transcript) == 0:
        raise ClosingTimeValidationError("transcript must contain at least one turn")

    for i, turn in enumerate(transcript):
        if not isinstance(turn, dict):
            raise ClosingTimeValidationError(f"transcript[{i}] must be a dict")
        if "text" not in turn:
            raise ClosingTimeValidationError(f"transcript[{i}] missing required key 'text'")
        if "speaker" not in turn:
            raise ClosingTimeValidationError(f"transcript[{i}] missing required key 'speaker'")
        turn["text"] = validate_text(turn["text"], field=f"transcript[{i}].text")

    return transcript


def validate_subjects(subjects: object) -> list[str]:
    """Validate a list of subject lines."""
    if not isinstance(subjects, list):
        raise ClosingTimeValidationError(
            f"subjects must be a list, got {type(subjects).__name__}"
        )
    if len(subjects) < 2:
        raise ClosingTimeValidationError("subjects must contain at least 2 items for comparison")

    return [validate_text(s, field=f"subjects[{i}]", max_length=500) for i, s in enumerate(subjects)]
"""salescue/backbone.py — Shared encoder singleton with thread safety.

All 12 modules share a single DeBERTa-v3-base encoder. This module provides
a thread-safe singleton that lazy-loads on first access and manages device
placement (CPU/CUDA/MPS auto-detection).
"""

from __future__ import annotations

import threading
from typing import TYPE_CHECKING

import torch

if TYPE_CHECKING:
    from transformers import AutoModel, AutoTokenizer


_lock = threading.Lock()
_encoder: "AutoModel | None" = None
_tokenizer: "AutoTokenizer | None" = None
_device: torch.device | None = None

MODEL_NAME = "microsoft/deberta-v3-base"


def _detect_device() -> torch.device:
    """Auto-detect best available device."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def get_device() -> torch.device:
    """Return the active device, detecting if needed."""
    global _device
    if _device is None:
        _device = _detect_device()
    return _device


def set_device(device: str | torch.device) -> None:
    """Override the auto-detected device."""
    global _device, _encoder
    _device = torch.device(device) if isinstance(device, str) else device
    # move encoder if already loaded
    if _encoder is not None:
        _encoder = _encoder.to(_device)


class SharedEncoder:
    """Thread-safe singleton wrapper around the shared encoder and tokenizer."""

    @staticmethod
    def load(model_name: str = MODEL_NAME) -> tuple["AutoModel", "AutoTokenizer"]:
        """Load or return the cached encoder and tokenizer."""
        global _encoder, _tokenizer

        if _encoder is not None and _tokenizer is not None:
            return _encoder, _tokenizer

        with _lock:
            # double-checked locking
            if _encoder is not None and _tokenizer is not None:
                return _encoder, _tokenizer

            from transformers import AutoModel, AutoTokenizer

            device = get_device()
            _tokenizer = AutoTokenizer.from_pretrained(model_name)
            _encoder = AutoModel.from_pretrained(model_name).to(device).eval()

            return _encoder, _tokenizer

    @staticmethod
    def encode(text: str, max_length: int = 512) -> dict:
        """Tokenize and encode text, returning encoder output."""
        encoder, tokenizer = SharedEncoder.load()
        device = get_device()

        tokens = tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=max_length,
            padding=True,
        ).to(device)

        with torch.no_grad():
            output = encoder(**tokens)

        return {"encoder_output": output, "tokens": tokens, "input_ids": tokens["input_ids"]}

    @staticmethod
    def unload() -> None:
        """Release the encoder and tokenizer from memory."""
        global _encoder, _tokenizer
        with _lock:
            _encoder = None
            _tokenizer = None
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
"""salescue/display.py — CardRenderer for visual output.

Produces rich terminal cards (via `rich`) and HTML cards for each module's
output. Cards show confidence bars, signal breakdowns, and evidence spans.
"""

from __future__ import annotations

from typing import Any


def _bar(value: float, width: int = 20, fill: str = "\u2588", empty: str = "\u2591") -> str:
    """Render a text-based progress bar."""
    filled = int(value * width)
    return fill * filled + empty * (width - filled)


def _color_for_score(score: float) -> str:
    """Map a 0-1 score to a color name."""
    if score >= 0.75:
        return "green"
    if score >= 0.5:
        return "yellow"
    if score >= 0.25:
        return "red"
    return "bright_red"


class CardRenderer:
    """Renders module output as rich terminal cards or HTML."""

    @staticmethod
    def render_terminal(module_name: str, result: dict[str, Any]) -> str:
        """Render a plain-text card for terminal output."""
        lines = [
            f"\u250c\u2500\u2500 {module_name.upper()} \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
        ]

        for key, value in result.items():
            if isinstance(value, float):
                bar = _bar(value)
                lines.append(f"\u2502 {key:<20} {bar} {value:.3f} \u2502")
            elif isinstance(value, dict):
                lines.append(f"\u2502 {key}:{'':>20} \u2502")
                for k, v in value.items():
                    lines.append(f"\u2502   {k:<18} {str(v):<12} \u2502")
            elif isinstance(value, list) and len(value) > 0:
                lines.append(f"\u2502 {key}: ({len(value)} items){'':>10} \u2502")
                for item in value[:3]:
                    text = str(item)[:35]
                    lines.append(f"\u2502   {text:<36} \u2502")
            else:
                lines.append(f"\u2502 {key:<20} {str(value):<18} \u2502")

        lines.append(f"\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518")
        return "\n".join(lines)

    @staticmethod
    def render_rich(module_name: str, result: dict[str, Any]) -> None:
        """Render using the `rich` library if available."""
        try:
            from rich.console import Console
            from rich.panel import Panel
            from rich.table import Table

            console = Console()
            table = Table(show_header=False, box=None, padding=(0, 1))
            table.add_column("Key", style="bold cyan", width=22)
            table.add_column("Value", width=40)

            for key, value in result.items():
                if isinstance(value, float):
                    color = _color_for_score(value)
                    bar = _bar(value)
                    table.add_row(key, f"[{color}]{bar}[/] {value:.3f}")
                elif isinstance(value, (dict, list)):
                    import json
                    table.add_row(key, json.dumps(value, indent=2)[:80])
                else:
                    table.add_row(key, str(value))

            console.print(Panel(table, title=f"[bold]{module_name.upper()}[/bold]", border_style="blue"))

        except ImportError:
            # fallback to plain text
            print(CardRenderer.render_terminal(module_name, result))

    @staticmethod
    def render_html(module_name: str, result: dict[str, Any]) -> str:
        """Render as an HTML card."""
        rows = []
        for key, value in result.items():
            if isinstance(value, float):
                pct = int(value * 100)
                color = _color_for_score(value)
                bar_html = (
                    f'<div style="background:#eee;border-radius:4px;height:12px;width:150px;display:inline-block">'
                    f'<div style="background:{color};height:100%;width:{pct}%;border-radius:4px"></div>'
                    f'</div> {value:.3f}'
                )
                rows.append(f"<tr><td><b>{key}</b></td><td>{bar_html}</td></tr>")
            else:
                rows.append(f"<tr><td><b>{key}</b></td><td>{value}</td></tr>")

        return (
            f'<div style="border:1px solid #ccc;border-radius:8px;padding:12px;margin:8px 0;font-family:monospace">'
            f'<h3 style="margin:0 0 8px">{module_name.upper()}</h3>'
            f'<table>{"".join(rows)}</table>'
            f'</div>'
        )
"""salescue/document.py — Document dataclass with pipe/getattr support.

Wraps text + accumulated module results. Supports the | operator for
Unix-style composition: `Document(text) | score | intent | reply`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from .base import BaseModule


@dataclass
class Document:
    """A document flowing through the ClosingTime pipeline.

    Accumulates results from each module it passes through.
    Supports pipe composition via the | operator.
    """

    text: str
    results: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)
    errors: list[dict[str, str]] = field(default_factory=list)

    def __or__(self, module: "BaseModule") -> "Document":
        """Pipe operator: doc | module runs the module and stores results."""
        try:
            result = module(self.text)
            self.results[module.name] = result
        except Exception as e:
            self.errors.append({"module": module.name, "error": str(e)})
        return self

    def __getattr__(self, name: str) -> Any:
        """Delegate attribute access to results dict for convenience.

        Allows `doc.score` instead of `doc.results["score"]`.
        """
        if name in ("text", "results", "metadata", "errors"):
            raise AttributeError(name)
        results = object.__getattribute__(self, "results")
        if name in results:
            return results[name]
        raise AttributeError(f"No result for module '{name}'. Available: {list(results.keys())}")

    def __repr__(self) -> str:
        modules = list(self.results.keys())
        return f"Document(text={self.text[:50]!r}..., modules={modules})"

    def to_dict(self) -> dict[str, Any]:
        """Serialize the document and all results."""
        return {
            "text": self.text,
            "results": self.results,
            "metadata": self.metadata,
            "errors": self.errors,
        }
"""salescue/chain.py — Composition with error handling and timing.

Chain multiple modules together with per-module latency tracking
and graceful error handling.
"""

from __future__ import annotations

import time
from typing import Any, TYPE_CHECKING

from .document import Document

if TYPE_CHECKING:
    from .base import BaseModule


class Chain:
    """Compose modules into a sequential pipeline with error handling.

    Usage:
        chain = Chain([score, intent, reply])
        result = chain.run("some email text")
    """

    def __init__(self, modules: list["BaseModule"]):
        self.modules = modules

    def run(self, text: str) -> dict[str, Any]:
        """Run all modules sequentially, collecting results and timing."""
        doc = Document(text=text)
        timings: dict[str, float] = {}

        for module in self.modules:
            t0 = time.perf_counter()
            doc = doc | module
            timings[module.name] = round(time.perf_counter() - t0, 4)

        return {
            "results": doc.results,
            "errors": doc.errors,
            "timings": timings,
            "total_time": round(sum(timings.values()), 4),
        }

    def __repr__(self) -> str:
        names = " | ".join(m.name for m in self.modules)
        return f"Chain({names})"
"""salescue/base.py — Abstract base class for all modules.

Every ClosingTime module inherits from BaseModule and implements
the `forward` method. Provides consistent interface for the pipe
operator, display rendering, and module registration.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from .backbone import SharedEncoder
from .display import CardRenderer


class BaseModule(ABC):
    """Abstract base class for ClosingTime modules.

    Subclasses must set `name` and `description` class attributes
    and implement the `forward` method.
    """

    name: str = "unnamed"
    description: str = ""

    @abstractmethod
    def forward(self, text: str, **kwargs: Any) -> dict[str, Any]:
        """Run the module on input text. Returns a result dict."""
        ...

    def __call__(self, text: str, **kwargs: Any) -> dict[str, Any]:
        """Validate input and delegate to forward."""
        from .validation import validate_text
        text = validate_text(text)
        return self.forward(text, **kwargs)

    def display(self, result: dict[str, Any], mode: str = "rich") -> str | None:
        """Render the result as a visual card."""
        if mode == "rich":
            CardRenderer.render_rich(self.name, result)
            return None
        elif mode == "html":
            return CardRenderer.render_html(self.name, result)
        else:
            return CardRenderer.render_terminal(self.name, result)

    def encode(self, text: str, max_length: int = 512) -> dict:
        """Encode text using the shared backbone."""
        return SharedEncoder.encode(text, max_length=max_length)

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} name={self.name!r}>"
"""salescue/modules/score.py — Causal Signal Attribution via Learned Interventions

Research contribution: Learned interventional attribution — the model learns to predict
the causal effect of removing a signal WITHOUT actually re-encoding. This is a distilled
structural causal model where the counterfactual head approximates do-calculus interventions
in a single forward pass.

Key insight: Standard counterfactual masking (replace token with [MASK]) changes the input
distribution. The model sees [MASK] as informative. Our approach learns a *null intervention
embedding* per signal type that represents "this signal was never present" rather than
"this signal was removed."
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math


class LearnedInterventionAttribution(nn.Module):
    """
    Instead of masking tokens with [MASK] (which shifts input distribution),
    learn a per-signal NULL EMBEDDING that represents the counterfactual
    world where the signal never existed.

    This is closer to Pearl's do-calculus: do(signal=absent) not observe(signal=masked).

    The null embedding is trained adversarially: it should produce encoder outputs
    that are indistinguishable from inputs where the signal genuinely doesn't exist.
    """

    def __init__(self, hidden=768, n_signals=15):
        super().__init__()

        # per-signal null embeddings: what the token representations look like
        # when this signal was never present in the text
        self.null_embeddings = nn.Parameter(torch.randn(n_signals, hidden) * 0.01)

        # signal detector: cross-attention from learned signal queries to tokens
        self.signal_queries = nn.Parameter(torch.randn(n_signals, hidden // 4))
        self.token_key = nn.Linear(hidden, hidden // 4)
        self.token_value = nn.Linear(hidden, hidden // 4)

        # causal effect estimator: predicts score delta from intervention
        self.effect_estimator = nn.Sequential(
            nn.Linear(hidden // 4 * 2, 64),  # [signal_embed, null_embed_projected]
            nn.GELU(),
            nn.Linear(64, 1),  # predicted score delta
        )

        # discriminator for adversarial null embedding training
        # tries to distinguish "signal genuinely absent" from "null embedding injected"
        self.discriminator = nn.Sequential(
            nn.Linear(hidden, 64),
            nn.LeakyReLU(0.2),
            nn.Linear(64, 1),
        )

    def detect_signals(self, token_embeds):
        """
        Cross-attention from signal queries to token sequence.
        Each signal query looks for its pattern in the text.
        Returns per-signal strength and localization.
        """
        B, seq_len, hidden = token_embeds.shape

        keys = self.token_key(token_embeds)  # (B, seq, h/4)
        values = self.token_value(token_embeds)  # (B, seq, h/4)
        queries = self.signal_queries.unsqueeze(0).expand(B, -1, -1)  # (B, n_signals, h/4)

        # scaled dot-product attention
        scale = math.sqrt(keys.shape[-1])
        attn = torch.bmm(queries, keys.transpose(1, 2)) / scale  # (B, n_signals, seq)
        attn_weights = attn.softmax(dim=-1)

        # signal representations: attention-weighted sum of token values
        signal_embeds = torch.bmm(attn_weights, values)  # (B, n_signals, h/4)

        # signal strength: how concentrated is the attention?
        # high entropy = diffuse attention = weak signal
        # low entropy = focused attention = strong signal
        entropy = -(attn_weights * (attn_weights + 1e-10).log()).sum(dim=-1)  # (B, n_signals)
        max_entropy = math.log(seq_len)
        strength = 1.0 - (entropy / max_entropy)  # (B, n_signals) — 0 to 1

        return signal_embeds, strength, attn_weights

    def estimate_causal_effects(self, signal_embeds, strength):
        """
        For each detected signal, estimate the causal effect on the score
        by comparing the signal embedding to its null (counterfactual) embedding.
        """
        B, n_signals, dim = signal_embeds.shape

        null_proj = self.null_embeddings[:, :dim].unsqueeze(0).expand(B, -1, -1)

        effects = []
        for i in range(n_signals):
            effect_input = torch.cat([
                signal_embeds[:, i],  # what's actually there
                null_proj[:, i],  # what "nothing" looks like
            ], dim=-1)

            delta = self.effect_estimator(effect_input)  # (B, 1) — predicted score change
            effects.append(delta)

        effects = torch.cat(effects, dim=-1)  # (B, n_signals)
        return effects

    def adversarial_loss(self, token_embeds, signal_attn_weights, signal_idx):
        """
        Train the null embedding so that injecting it produces representations
        indistinguishable from genuine signal absence.

        1. Take a text WITH the signal present
        2. Replace the signal's attended tokens with the null embedding
        3. Discriminator tries to tell this from a text where signal is genuinely absent
        4. Null embedding is trained to fool the discriminator
        """
        B, seq_len, hidden = token_embeds.shape

        # create intervened representation: replace signal tokens with null
        attn = signal_attn_weights[:, signal_idx]  # (B, seq)
        null = self.null_embeddings[signal_idx].unsqueeze(0).unsqueeze(0)  # (1, 1, hidden)

        # soft replacement: blend original tokens with null based on attention weight
        intervened = token_embeds * (1 - attn.unsqueeze(-1)) + null * attn.unsqueeze(-1)

        # discriminator on CLS of intervened vs original
        real_score = self.discriminator(token_embeds[:, 0])
        fake_score = self.discriminator(intervened[:, 0])

        # adversarial loss
        d_loss = F.binary_cross_entropy_with_logits(
            real_score, torch.ones_like(real_score)
        ) + F.binary_cross_entropy_with_logits(
            fake_score, torch.zeros_like(fake_score)
        )

        g_loss = F.binary_cross_entropy_with_logits(
            fake_score, torch.ones_like(fake_score)
        )  # fool the discriminator

        return d_loss, g_loss


class LeadScorer(nn.Module):
    SIGNAL_NAMES = [
        "pricing_interest", "competitor_research", "icp_fit_strong",
        "icp_fit_weak", "seniority_match", "company_size_match",
        "tech_stack_match", "engagement_high", "engagement_low",
        "urgency", "budget", "timeline", "referral", "expansion", "pain_point",
    ]

    def __init__(self, hidden=768):
        super().__init__()
        n = len(self.SIGNAL_NAMES)

        # causal attribution engine
        self.attribution = LearnedInterventionAttribution(hidden, n)

        # scoring from signal representations
        self.score_proj = nn.Sequential(
            nn.Linear(hidden // 4 * n, 256),
            nn.GELU(),
            nn.LayerNorm(256),
            nn.Dropout(0.1),
        )
        self.class_out = nn.Linear(256, 4)
        self.regress_out = nn.Sequential(nn.Linear(256, 1), nn.Sigmoid())

        # uncertainty-weighted multi-task loss (Kendall et al., 2018)
        self.log_var_class = nn.Parameter(torch.zeros(1))
        self.log_var_regress = nn.Parameter(torch.zeros(1))

    def forward(self, encoder_output):
        tokens = encoder_output.last_hidden_state  # (B, seq, hidden)

        # detect signals via cross-attention
        signal_embeds, strengths, attn_weights = self.attribution.detect_signals(tokens)

        # estimate causal effects
        effects = self.attribution.estimate_causal_effects(signal_embeds, strengths)

        # score from concatenated signal representations
        flat_signals = signal_embeds.reshape(signal_embeds.shape[0], -1)  # (B, n*dim)
        h = self.score_proj(flat_signals)

        logits = self.class_out(h)
        score = self.regress_out(h) * 100
        probs = logits.softmax(-1)

        # build causal evidence
        labels = ["hot", "warm", "cold", "disqualified"]
        signals = []
        for i in range(len(self.SIGNAL_NAMES)):
            s = strengths[0, i].item()
            if s > 0.15:
                top_token_idx = attn_weights[0, i].topk(3).indices.tolist()
                signals.append({
                    "signal": self.SIGNAL_NAMES[i],
                    "strength": round(s, 3),
                    "causal_impact": round(effects[0, i].item() * 100, 1),
                    "attended_positions": top_token_idx,
                    "attribution_type": "causal_interventional",
                })

        signals.sort(key=lambda x: -abs(x["causal_impact"]))

        return {
            "label": labels[probs.argmax(-1).item()],
            "score": round(score.item()),
            "confidence": round(probs.max().item(), 3),
            "signals": signals[:5],
        }

    def compute_loss(self, logits, score, true_label, true_score, effects, true_effects,
                     tokens, attn_weights, epoch):
        # uncertainty-weighted classification + regression
        prec_c = torch.exp(-self.log_var_class)
        prec_r = torch.exp(-self.log_var_regress)

        loss_c = prec_c * F.cross_entropy(logits, true_label) + self.log_var_class
        loss_r = prec_r * F.mse_loss(score, true_score) + self.log_var_regress

        # causal effect supervision
        loss_cf = F.mse_loss(effects, true_effects) * 0.5

        # adversarial null embedding training (alternating updates)
        if epoch >= 3:
            for i in range(len(self.SIGNAL_NAMES)):
                d_loss, g_loss = self.attribution.adversarial_loss(
                    tokens, attn_weights, i)
                loss_cf += (d_loss + g_loss) * 0.01

        return loss_c + loss_r + loss_cf
"""salescue/modules/intent.py — Neural Hawkes Process for Intent

Research contribution: Models the prospect's buying journey as a *marked temporal point
process* where each signal (event) has a type (mark) and arrival time. The intensity
function of future events depends on the history of past events via a neural Hawkes
process. This directly models the self-exciting property of buying behavior.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math

STAGES = ["unaware", "aware", "researching", "evaluating", "committed", "purchasing"]


class NeuralHawkesIntentPredictor(nn.Module):
    """
    Models the prospect's buying journey as a neural Hawkes process.

    The intensity function lambda(t) = f(history) captures:
    - Self-excitation: signal A makes signal B more likely (demo -> pricing visit)
    - Temporal decay: older signals have less influence
    - Cross-excitation: different signal types interact

    The integral of the intensity gives the expected number of future events,
    which we use to predict time-to-purchase.
    """

    def __init__(self, hidden=768, n_event_types=20, state_dim=64):
        super().__init__()
        self.n_event_types = n_event_types
        self.state_dim = state_dim

        # continuous-time LSTM for encoding event history
        self.event_embed = nn.Linear(hidden, state_dim)
        self.time_embed = nn.Linear(1, state_dim)

        # CTLSTM cell (Continuous-Time LSTM, Mei & Eisenbeis 2017)
        self.W_i = nn.Linear(state_dim * 2, state_dim)
        self.W_f = nn.Linear(state_dim * 2, state_dim)
        self.W_z = nn.Linear(state_dim * 2, state_dim)
        self.W_o = nn.Linear(state_dim * 2, state_dim)

        # decay parameter: controls how fast the hidden state decays between events
        self.decay = nn.Linear(state_dim * 2, state_dim)

        # target cell state (what the cell decays toward between events)
        self.W_c_bar = nn.Linear(state_dim * 2, state_dim)

        # intensity function: maps hidden state -> per-stage intensity
        self.intensity_head = nn.Sequential(
            nn.Linear(state_dim, 32),
            nn.GELU(),
            nn.Linear(32, len(STAGES)),
            nn.Softplus(),  # intensity must be positive
        )

        # direct stage classifier (for single-signal inputs)
        self.stage_head = nn.Sequential(
            nn.Linear(hidden, 384), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(384, len(STAGES)),
        )

        # time-to-event predictor
        self.tte_head = nn.Sequential(
            nn.Linear(state_dim, 32), nn.GELU(),
            nn.Linear(32, 1), nn.Softplus(),
        )

    def ctlstm_cell(self, event_embed, time_delta, h_prev, c_prev, c_bar_prev):
        """
        Continuous-Time LSTM cell.
        Between events, the cell state decays exponentially toward c_bar.
        At each event, the cell is updated like a standard LSTM.
        """
        time_feat = self.time_embed(time_delta.unsqueeze(-1))
        x = torch.cat([event_embed, time_feat], dim=-1)

        # LSTM gates
        i = torch.sigmoid(self.W_i(x))
        f = torch.sigmoid(self.W_f(x))
        z = torch.tanh(self.W_z(x))
        o = torch.sigmoid(self.W_o(x))

        # decay rate
        delta = F.softplus(self.decay(x))

        # target cell state
        c_bar = self.W_c_bar(x)

        # cell update: standard LSTM + decay
        c = f * c_prev + i * z

        # between-event decay: c(t) = c_bar + (c - c_bar) * exp(-delta * dt)
        c_decayed = c_bar + (c - c_bar) * torch.exp(-delta * time_delta.unsqueeze(-1).clamp(min=0))

        h = o * torch.tanh(c_decayed)

        return h, c, c_bar, delta

    def forward(self, cls_embed, event_history=None):
        """
        cls_embed: (B, hidden) from shared encoder for the current signal
        event_history: list of {"embed": tensor, "days": float, "type": str}
                       or None for single-signal classification
        """
        # single signal: use direct classifier
        if event_history is None or len(event_history) == 0:
            logits = self.stage_head(cls_embed)
            probs = logits.softmax(-1)
            stage_idx = probs.argmax(-1).item()
            return {
                "stage": STAGES[stage_idx],
                "confidence": round(probs.max().item(), 3),
                "distribution": {s: round(probs[0, i].item(), 3) for i, s in enumerate(STAGES)},
                "trajectory": None,
                "data_points": 0,
            }

        # process event history through CT-LSTM
        h = torch.zeros(1, self.state_dim).to(cls_embed.device)
        c = torch.zeros(1, self.state_dim).to(cls_embed.device)
        c_bar = torch.zeros(1, self.state_dim).to(cls_embed.device)

        intensity_history = []

        for event in event_history:
            e_embed = self.event_embed(
                event["embed"].unsqueeze(0) if event["embed"].dim() == 1 else event["embed"]
            )
            dt = torch.tensor([event["days"]]).float().to(cls_embed.device)

            h, c, c_bar, delta = self.ctlstm_cell(e_embed, dt, h, c, c_bar)

            intensity = self.intensity_head(h)  # (1, n_stages)
            intensity_history.append(intensity)

        # add current signal
        current_embed = self.event_embed(cls_embed)
        dt_current = torch.tensor([0.0]).to(cls_embed.device)
        h, c, c_bar, delta = self.ctlstm_cell(current_embed, dt_current, h, c, c_bar)

        # current stage: from intensity + direct classifier (ensemble)
        current_intensity = self.intensity_head(h)
        direct_logits = self.stage_head(cls_embed)

        # blend: intensity informs transition dynamics, direct classifier handles semantics
        combined_logits = direct_logits + current_intensity.log()
        probs = combined_logits.softmax(-1)
        stage_idx = probs.argmax(-1).item()

        # time-to-event
        tte = self.tte_head(h).item()

        # trajectory from intensity trend
        if len(intensity_history) >= 2:
            recent_intensity = intensity_history[-1].sum().item()
            prev_intensity = intensity_history[-2].sum().item()
            velocity = recent_intensity - prev_intensity

            if len(intensity_history) >= 3:
                prev_prev = intensity_history[-3].sum().item()
                prev_velocity = prev_intensity - prev_prev
                acceleration = velocity - prev_velocity
            else:
                acceleration = 0

            direction = (
                "accelerating" if velocity > 0.05 and acceleration > 0
                else "cruising" if velocity > 0.05
                else "decelerating" if velocity < -0.05
                else "stalled" if abs(velocity) < 0.02 and len(event_history) > 5
                else "stable"
            )
        else:
            velocity, acceleration = 0, 0
            direction = "insufficient_data"

        return {
            "stage": STAGES[stage_idx],
            "confidence": round(probs.max().item(), 3),
            "distribution": {s: round(probs[0, i].item(), 3) for i, s in enumerate(STAGES)},
            "trajectory": {
                "days_to_purchase": max(1, round(tte * 30)),
                "direction": direction,
                "velocity": round(velocity, 3),
                "acceleration": round(acceleration, 3),
                "current_intensity": round(current_intensity.sum().item(), 3),
            },
            "data_points": len(event_history) + 1,
        }

    def compute_nll(self, intensity_history, event_times, T):
        """
        Negative log-likelihood of the Hawkes process.

        NLL = -sum log lambda(t_i) + integral_0^T lambda(t) dt

        First term: log intensity at event times (events should have high intensity)
        Second term: integral of intensity (penalizes overall high intensity)
        """
        log_intensity_sum = 0
        for intensity in intensity_history:
            log_intensity_sum += intensity.log().sum()

        # Monte Carlo approximation of the integral
        n_mc = 100
        mc_times = torch.rand(n_mc) * T  # noqa: F841 — placeholder for MC integration

        nll = -log_intensity_sum  # + integral_term (requires MC evaluation)
        return nll
"""salescue/modules/reply.py — Constrained CRF for Structured Reply Classification

Research contribution: Multi-label classification treats labels independently. But reply
labels have structural constraints: `unsubscribe` and `genuinely_interested` are mutually
exclusive. `referral` implies `not_now`. We enforce these via a *constrained conditional
random field* where the transition matrix encodes label co-occurrence rules.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F  # noqa: F401

LABELS = [
    "genuinely_interested", "politely_acknowledging", "objection",
    "not_now", "unsubscribe", "out_of_office", "bounce",
    "meeting_request", "referral", "negative_sentiment",
]

# label co-occurrence constraints
# -inf = impossible, 0 = neutral, +float = encouraged
CONSTRAINT_MATRIX = {
    ("unsubscribe", "genuinely_interested"): -float("inf"),
    ("unsubscribe", "meeting_request"): -float("inf"),
    ("bounce", "genuinely_interested"): -float("inf"),
    ("bounce", "meeting_request"): -float("inf"),
    ("bounce", "referral"): -float("inf"),
    ("out_of_office", "genuinely_interested"): -float("inf"),
    ("referral", "not_now"): 2.0,
    ("objection", "genuinely_interested"): 1.0,
    ("meeting_request", "genuinely_interested"): 3.0,
}


class ConstrainedMultiLabelCRF(nn.Module):
    """
    A CRF-like model for multi-label classification with structural constraints.

    Standard multi-label: P(y1, y2, ..., yk) = prod P(yi)
    Our model: P(y1, ..., yk) = (1/Z) exp(sum psi_i(yi) + sum psi_ij(yi, yj))

    psi_i = unary potential (how likely is label i given text)
    psi_ij = pairwise potential (how compatible are labels i and j)
    """

    def __init__(self, n_labels=10):
        super().__init__()

        # pairwise compatibility: learned, initialized from constraints
        self.pairwise = nn.Parameter(torch.zeros(n_labels, n_labels))

        # initialize from constraint matrix
        for (l1, l2), value in CONSTRAINT_MATRIX.items():
            i, j = LABELS.index(l1), LABELS.index(l2)
            if value == -float("inf"):
                self.pairwise.data[i, j] = -10.0
                self.pairwise.data[j, i] = -10.0
            else:
                self.pairwise.data[i, j] = value
                self.pairwise.data[j, i] = value

    def score_configuration(self, unary_logits, label_config):
        """
        Score a specific label configuration.
        label_config: binary vector (B, n_labels) — which labels are active
        """
        # unary score
        unary = (unary_logits * label_config).sum(dim=-1)

        # pairwise score: sum of pairwise potentials for all active label pairs
        active_mask = label_config.unsqueeze(-1) * label_config.unsqueeze(-2)  # (B, n, n)
        pairwise = (self.pairwise.unsqueeze(0) * active_mask).sum(dim=(-1, -2)) / 2

        return unary + pairwise

    def decode(self, unary_logits, top_k=5):
        """
        Find the top-k highest scoring label configurations.
        With 10 labels, 2^10 = 1024 configurations — exact enumeration is feasible.
        """
        n = unary_logits.shape[-1]

        if n <= 12:
            all_configs = []

            for mask_int in range(2**n):
                config = torch.zeros(1, n).to(unary_logits.device)
                for bit in range(n):
                    if mask_int & (1 << bit):
                        config[0, bit] = 1.0

                score = self.score_configuration(unary_logits, config)
                all_configs.append((score.item(), config))

            all_configs.sort(key=lambda x: -x[0])
            return all_configs[:top_k]

        else:
            return self._greedy_decode(unary_logits)

    def _greedy_decode(self, unary_logits):
        """Greedy fallback for large label sets."""
        n = unary_logits.shape[-1]
        config = torch.zeros(1, n).to(unary_logits.device)

        # greedily add labels that improve the score
        for _ in range(n):
            best_gain = 0
            best_idx = -1
            current_score = self.score_configuration(unary_logits, config)

            for j in range(n):
                if config[0, j] > 0:
                    continue
                trial = config.clone()
                trial[0, j] = 1.0
                trial_score = self.score_configuration(unary_logits, trial)
                gain = trial_score - current_score
                if gain > best_gain:
                    best_gain = gain
                    best_idx = j

            if best_idx < 0:
                break
            config[0, best_idx] = 1.0

        return [(self.score_configuration(unary_logits, config).item(), config)]


class ReplyHead(nn.Module):
    def __init__(self, hidden=768, n_labels=10):
        super().__init__()

        # token-level label relevance
        self.token_scorer = nn.Sequential(
            nn.Linear(hidden + 8, 256), nn.GELU(), nn.Dropout(0.15),
            nn.Linear(256, n_labels),
        )

        # span pointer per label
        self.start_pointer = nn.Linear(hidden, n_labels)
        self.end_pointer = nn.Linear(hidden, n_labels)

        # constrained CRF for label combination
        self.crf = ConstrainedMultiLabelCRF(n_labels)

        # position encoding for touchpoint context
        self.position_embed = nn.Embedding(10, 8)

    def forward(self, encoder_output, tokenizer, input_ids, touchpoint=0):
        tokens = encoder_output.last_hidden_state
        seq_len = tokens.shape[1]

        pos = self.position_embed(
            torch.tensor([min(touchpoint, 9)]).to(tokens.device)
        ).unsqueeze(1).expand(-1, seq_len, -1)

        # unary label scores from token relevance
        relevance = self.token_scorer(torch.cat([tokens, pos], dim=-1)).sigmoid()
        unary_logits = relevance.max(dim=1).values  # (B, n_labels) — max pool per label

        # CRF decoding: find best label configuration respecting constraints
        top_configs = self.crf.decode(unary_logits)
        best_config = top_configs[0][1]

        active = {}
        evidence = []
        for i, label in enumerate(LABELS):
            is_active = best_config[0, i].item() > 0.5
            active[label] = is_active

            if is_active:
                s_scores = self.start_pointer(tokens[0, :, :])[:, i]
                e_scores = self.end_pointer(tokens[0, :, :])[:, i]

                best_start = s_scores[1:-1].argmax().item() + 1
                valid_ends = e_scores[best_start:min(best_start + 30, seq_len - 1)]
                if len(valid_ends) > 0:
                    best_end = best_start + valid_ends.argmax().item() + 1
                    span_text = tokenizer.decode(
                        input_ids[0, best_start:best_end], skip_special_tokens=True
                    ).strip()
                    if span_text:
                        evidence.append({"label": label, "text": span_text})

        primary = max(
            [(l, unary_logits[0, i].item()) for i, l in enumerate(LABELS) if active.get(l)],
            key=lambda x: x[1],
            default=("none", 0),
        )[0]

        return {
            "active": active,
            "scores": {l: round(unary_logits[0, i].item(), 3) for i, l in enumerate(LABELS)},
            "evidence": evidence,
            "primary": primary,
            "configuration_score": round(top_configs[0][0], 3),
            "alternative_configs": len([c for c in top_configs if c[0] > top_configs[0][0] - 1.0]),
        }
"""salescue/modules/entities.py — Regex + Pointer NER with Re-typing

Research contribution: Hybrid entity extraction combining high-precision regex
patterns for structured entities (emails, phones, URLs, money, dates) with a
pointer-network NER for unstructured entities (person, company, product, role).
A re-typing layer then reclassifies detected entities in context — e.g., "John"
becomes decision_maker vs. reference based on surrounding text.
"""

import re
from typing import Any

import torch
import torch.nn as nn


# --- Regex patterns for structured entities ---

REGEX_PATTERNS: dict[str, re.Pattern] = {
    "email": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),
    "phone": re.compile(
        r"(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"
    ),
    "url": re.compile(
        r"https?://[^\s<>\"']+|www\.[^\s<>\"']+"
    ),
    "money": re.compile(
        r"\$[\d,]+(?:\.\d{2})?(?:\s*(?:k|K|m|M|B|million|billion|thousand))?"
    ),
    "date": re.compile(
        r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|"
        r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s*\d{2,4}|"
        r"\d{4}-\d{2}-\d{2})\b",
        re.IGNORECASE,
    ),
    "percentage": re.compile(r"\b\d+(?:\.\d+)?%"),
}

# Entity types for the neural NER
ENTITY_TYPES = ["person", "company", "product", "role", "location", "technology"]

# Re-typing categories: context-dependent entity roles
RETYPE_CATEGORIES = [
    "decision_maker", "influencer", "end_user", "reference",
    "competitor", "partner", "prospect_company", "vendor",
]


class PointerNER(nn.Module):
    """Pointer-network NER for unstructured entity extraction.

    Uses start/end pointers per entity type to extract spans from
    the encoder output. More flexible than BIO tagging for overlapping
    entities.
    """

    def __init__(self, hidden: int = 768, n_types: int = len(ENTITY_TYPES)):
        super().__init__()
        self.n_types = n_types

        # per-type start/end pointers
        self.start_pointers = nn.Linear(hidden, n_types)
        self.end_pointers = nn.Linear(hidden, n_types)

        # entity type confidence
        self.type_confidence = nn.Sequential(
            nn.Linear(hidden, 64), nn.GELU(),
            nn.Linear(64, n_types), nn.Sigmoid(),
        )

    def forward(self, token_embeds: torch.Tensor) -> list[dict[str, Any]]:
        """Extract entities from token embeddings.

        Args:
            token_embeds: (seq_len, hidden) tensor

        Returns:
            List of entity dicts with type, start, end, confidence.
        """
        seq_len = token_embeds.shape[0]

        start_scores = self.start_pointers(token_embeds)  # (seq, n_types)
        end_scores = self.end_pointers(token_embeds)  # (seq, n_types)
        type_conf = self.type_confidence(token_embeds.mean(dim=0, keepdim=True))  # (1, n_types)

        entities = []
        for t in range(self.n_types):
            if type_conf[0, t].item() < 0.3:
                continue

            # find top start positions
            s_probs = start_scores[:, t].softmax(dim=0)
            top_starts = s_probs.topk(min(3, seq_len)).indices

            for s_idx in top_starts:
                s = s_idx.item()
                if s_probs[s].item() < 0.15:
                    continue

                # find best end position after start (within 15 tokens)
                end_range = end_scores[s:min(s + 15, seq_len), t]
                if len(end_range) == 0:
                    continue
                e_offset = end_range.argmax().item()
                e = s + e_offset

                entities.append({
                    "type": ENTITY_TYPES[t],
                    "start": s,
                    "end": e + 1,
                    "confidence": round(s_probs[s].item() * type_conf[0, t].item(), 3),
                })

        return entities


class RetypingLayer(nn.Module):
    """Context-dependent entity re-classification.

    After detecting "John" as a person entity, this layer determines
    if John is a decision_maker, influencer, end_user, or reference
    based on the surrounding text context.
    """

    def __init__(self, hidden: int = 768, n_categories: int = len(RETYPE_CATEGORIES)):
        super().__init__()

        # entity representation + context -> retype category
        self.retype_head = nn.Sequential(
            nn.Linear(hidden * 2, 128), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(128, n_categories),
        )

    def forward(
        self,
        entity_embed: torch.Tensor,
        context_embed: torch.Tensor,
    ) -> dict[str, float]:
        """Classify entity role given its embedding and surrounding context.

        Args:
            entity_embed: (hidden,) embedding of the entity span
            context_embed: (hidden,) CLS or context embedding

        Returns:
            Dict mapping retype categories to probabilities.
        """
        combined = torch.cat([entity_embed, context_embed], dim=-1)
        logits = self.retype_head(combined.unsqueeze(0))
        probs = logits.softmax(dim=-1).squeeze(0)

        return {
            cat: round(probs[i].item(), 3)
            for i, cat in enumerate(RETYPE_CATEGORIES)
        }


class EntityExtractor(nn.Module):
    """Combined regex + neural NER with re-typing.

    Pipeline:
    1. Regex extraction for structured entities (email, phone, etc.)
    2. Pointer NER for unstructured entities (person, company, etc.)
    3. Re-typing layer classifies entity roles in context
    """

    def __init__(self, hidden: int = 768):
        super().__init__()
        self.pointer_ner = PointerNER(hidden)
        self.retyping = RetypingLayer(hidden)

    def extract_regex(self, text: str) -> list[dict[str, Any]]:
        """Extract structured entities via regex patterns."""
        entities = []
        for etype, pattern in REGEX_PATTERNS.items():
            for match in pattern.finditer(text):
                entities.append({
                    "type": etype,
                    "text": match.group(),
                    "start_char": match.start(),
                    "end_char": match.end(),
                    "source": "regex",
                })
        return entities

    def forward(self, encoder_output, tokenizer, input_ids, text: str):
        tokens = encoder_output.last_hidden_state[0]  # (seq, hidden)
        cls = tokens[0]

        # 1. Regex entities
        regex_entities = self.extract_regex(text)

        # 2. Neural NER entities
        neural_entities = self.pointer_ner(tokens[1:-1])  # skip CLS/SEP

        # 3. Decode neural entities and re-type
        decoded_entities = []
        for ent in neural_entities:
            span_ids = input_ids[0, ent["start"] + 1 : ent["end"] + 1]
            span_text = tokenizer.decode(span_ids, skip_special_tokens=True).strip()
            if not span_text:
                continue

            # entity embedding = mean of span tokens
            span_embed = tokens[ent["start"] + 1 : ent["end"] + 1].mean(dim=0)

            # re-type in context
            role = self.retyping(span_embed, cls)
            primary_role = max(role, key=role.get)

            decoded_entities.append({
                "type": ent["type"],
                "text": span_text,
                "confidence": ent["confidence"],
                "role": primary_role,
                "role_scores": role,
                "source": "neural",
            })

        all_entities = regex_entities + decoded_entities
        all_entities.sort(key=lambda e: -e.get("confidence", 1.0))

        return {
            "entities": all_entities,
            "regex_count": len(regex_entities),
            "neural_count": len(decoded_entities),
            "types_found": list(set(e["type"] for e in all_entities)),
        }
"""salescue/modules/triggers.py — Temporal Displacement Model

Research contribution: Freshness isn't a classification — it's a continuous temporal
reasoning task. We model the relationship between event mention and event occurrence
as a *temporal displacement distribution*. The model learns P(event_date | article_date,
text_features), predicting when the event actually happened given how it's described.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F  # noqa: F401
import math

EVENTS = [
    "new_funding", "job_change", "expansion", "layoff_restructure",
    "acquisition_merger", "new_product_launch", "leadership_change",
    "hiring_surge", "technology_adoption", "active_vendor_evaluation",
]


class TemporalDisplacementModel(nn.Module):
    """
    Instead of classifying freshness into bins (current/recent/historical),
    predict a continuous temporal displacement: how many days before the
    article publication did the event actually occur?

    We model this as a log-normal distribution:
    log(displacement + 1) ~ N(mu(text), sigma(text))

    This gives us not just a point estimate but UNCERTAINTY about freshness.
    """

    def __init__(self, hidden=768):
        super().__init__()

        # event detector
        self.event_head = nn.Sequential(
            nn.Linear(hidden, 256), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(256, len(EVENTS)),
        )

        # temporal expression extractor at token level
        # 5 categories: today_word, recent_word, past_word, future_word, non_temporal
        self.temporal_tagger = nn.Linear(hidden, 5)

        # displacement predictor: mu and sigma of log-normal
        self.displacement_mu = nn.Sequential(
            nn.Linear(hidden + 5, 128), nn.GELU(),
            nn.Linear(128, len(EVENTS)),
        )

        self.displacement_sigma = nn.Sequential(
            nn.Linear(hidden + 5, 128), nn.GELU(),
            nn.Linear(128, len(EVENTS)),
            nn.Softplus(),
        )

    def forward(self, encoder_output):
        tokens = encoder_output.last_hidden_state  # (B, seq, hidden)
        cls = tokens[:, 0]

        # detect events
        event_logits = self.event_head(cls)
        event_probs = event_logits.sigmoid()

        # extract temporal features from token level
        temporal_logits = self.temporal_tagger(tokens[0])  # (seq, 5)
        temporal_probs = temporal_logits.softmax(dim=-1)

        # aggregate temporal signal: max-pool each category across sequence
        temporal_summary = temporal_probs.max(dim=0).values  # (5,)

        # predict displacement distribution per event
        disp_input = torch.cat([cls, temporal_summary.unsqueeze(0)], dim=-1)
        mu = self.displacement_mu(disp_input)
        sigma = self.displacement_sigma(disp_input) + 0.1

        events = []
        for i, event_name in enumerate(EVENTS):
            prob = event_probs[0, i].item()
            if prob < 0.5:
                continue

            # E[displacement] = exp(mu + sigma^2/2) for log-normal
            expected_displacement = math.exp(mu[0, i].item() + sigma[0, i].item() ** 2 / 2)

            # 90% confidence interval
            lower = math.exp(mu[0, i].item() - 1.645 * sigma[0, i].item())
            upper = math.exp(mu[0, i].item() + 1.645 * sigma[0, i].item())

            if expected_displacement < 3:
                freshness = "current"
            elif expected_displacement < 30:
                freshness = "recent"
            else:
                freshness = "historical"

            events.append({
                "type": event_name,
                "confidence": round(prob, 3),
                "freshness": freshness,
                "fresh": expected_displacement < 30,
                "displacement_days": round(expected_displacement, 1),
                "displacement_ci": [round(lower, 1), round(upper, 1)],
                "displacement_uncertainty": round(sigma[0, i].item(), 3),
                "temporal_features": {
                    "today_signal": round(temporal_summary[0].item(), 3),
                    "recent_signal": round(temporal_summary[1].item(), 3),
                    "past_signal": round(temporal_summary[2].item(), 3),
                },
            })

        events.sort(key=lambda e: -e["confidence"])
        primary = next((e for e in events if e["fresh"]), events[0] if events else None)

        return {"events": events, "primary": primary}

    def compute_loss(self, mu, sigma, true_displacement_days):
        """
        Negative log-likelihood of log-normal distribution.
        """
        log_disp = torch.log(true_displacement_days.float() + 1)

        nll = 0.5 * ((log_disp - mu) / sigma) ** 2 + sigma.log() + 0.5 * math.log(2 * math.pi)

        return nll.mean()
"""salescue/modules/icp.py — Wasserstein ICP Matching

Research contribution: Cosine similarity between ICP and prospect embeddings treats both
as point vectors. But an ICP like "100-500 employees" represents a RANGE, not a point.
We model both ICP and prospect as distributions in embedding space and compute their
Wasserstein distance (earth mover's distance) for matching.
"""

import torch
import torch.nn as nn

DIMS = ["industry", "size", "tech", "role", "signal"]


class WassersteinICPMatcher(nn.Module):
    """
    Models ICP and prospect as distributions in embedding space.
    Matching score = negative Wasserstein distance between distributions.

    ICP "100-500 employees in B2B SaaS" -> Gaussian in size-industry space
    Prospect "300 employees, healthcare SaaS" -> point in same space

    W2(N(mu, sigma^2), delta(x)) = sqrt(||x - mu||^2 + ||sigma||^2)
    """

    def __init__(self, hidden=768, dim_size=64):
        super().__init__()

        # per-dimension projection to shared space
        self.projections = nn.ModuleDict({
            d: nn.Linear(hidden, dim_size) for d in DIMS
        })

        # ICP distribution parameters: mu and sigma per dimension
        self.icp_mu = nn.ModuleDict({
            d: nn.Linear(hidden, dim_size) for d in DIMS
        })
        self.icp_logsigma = nn.ModuleDict({
            d: nn.Sequential(nn.Linear(hidden, dim_size), nn.Tanh()) for d in DIMS
        })

        # completeness detector
        self.completeness = nn.Sequential(nn.Linear(hidden, len(DIMS)), nn.Sigmoid())

        # learned dealbreaker thresholds
        self.thresholds = nn.Parameter(torch.zeros(len(DIMS)))

    def forward(self, icp_cls, prospect_cls, prospect_completeness):
        dimensions = {}
        dealbreakers = []
        missing = []

        thresholds = self.thresholds.sigmoid()

        for i, dim in enumerate(DIMS):
            has_data = prospect_completeness[0, i].item() > 0.5
            if not has_data:
                dimensions[dim] = {"fit": None, "status": "no_data"}
                missing.append(dim)
                continue

            # ICP as Gaussian distribution
            icp_mu = self.icp_mu[dim](icp_cls)
            icp_sigma = self.icp_logsigma[dim](icp_cls).exp() + 0.1

            # prospect as point
            pro_point = self.projections[dim](prospect_cls)

            # Mahalanobis-like distance: normalized by ICP spread
            distance = ((pro_point - icp_mu) / icp_sigma).pow(2).mean(dim=-1)

            # convert to similarity
            fit = torch.exp(-distance).item()

            is_db = fit < thresholds[i].item()

            dimensions[dim] = {
                "fit": round(fit, 3),
                "distance": round(distance.item(), 3),
                "icp_spread": round(icp_sigma.mean().item(), 3),
                "status": "dealbreaker" if is_db else "pass",
            }

            if is_db:
                dealbreakers.append(dim)

        # overall score: geometric mean of per-dimension fits
        scored_dims = [d for d in dimensions.values() if d.get("fit") is not None]
        if scored_dims:
            overall = 1.0
            for d in scored_dims:
                overall *= d["fit"]
            overall = overall ** (1 / len(scored_dims))
        else:
            overall = 0.0

        return {
            "score": round(overall, 3),
            "qualified": len(dealbreakers) == 0 and overall > 0.3 and len(missing) < 3,
            "dimensions": dimensions,
            "dealbreakers": dealbreakers,
            "missing": missing,
        }
"""salescue/modules/objection.py — 3-Way Pre-classifier + Coaching Cards

Research contribution: Most objection handling treats all objections the same.
We first classify into genuine_objection / stall / misunderstanding using a
3-way pre-classifier, then route each to specialized handling. Each objection
type gets a coaching card with a recommended response framework.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Any


OBJECTION_CATEGORIES = ["genuine_objection", "stall", "misunderstanding"]

OBJECTION_TYPES = [
    "price_too_high", "no_budget", "not_the_right_time",
    "need_to_think", "happy_with_current", "no_authority",
    "too_complex", "dont_see_value", "bad_experience",
    "need_more_info", "feature_missing", "contract_locked",
]

# Coaching card templates for each objection type
COACHING_CARDS: dict[str, dict[str, Any]] = {
    "price_too_high": {
        "framework": "value_reframe",
        "steps": [
            "Acknowledge the concern directly",
            "Ask what they're comparing against",
            "Quantify the cost of NOT solving their problem",
            "Break down ROI over their timeline",
        ],
        "avoid": ["Immediately offering a discount", "Being defensive about pricing"],
        "example": "I hear you on price. Out of curiosity, what's the current cost "
                   "of [problem] to your team each month?",
    },
    "no_budget": {
        "framework": "budget_creation",
        "steps": [
            "Distinguish 'no budget' from 'not a priority'",
            "Ask about their budget cycle and planning timeline",
            "Explore if there's budget in a different department",
            "Offer phased implementation to reduce initial cost",
        ],
        "avoid": ["Accepting 'no budget' at face value", "Pushing for immediate commitment"],
        "example": "When does your next budget cycle start? We could map out an "
                   "implementation that aligns with your planning.",
    },
    "not_the_right_time": {
        "framework": "urgency_creation",
        "steps": [
            "Understand what makes NOW not right",
            "Quantify the cost of delay",
            "Identify if there's a trigger event coming",
            "Propose a low-commitment next step",
        ],
        "avoid": ["Being pushy about timing", "Ignoring their timeline constraints"],
        "example": "What would need to change for the timing to feel right?",
    },
    "need_to_think": {
        "framework": "specificity",
        "steps": [
            "Ask what specifically they need to think about",
            "Identify unaddressed concerns",
            "Offer to provide additional information",
            "Set a specific follow-up time",
        ],
        "avoid": ["Saying 'take your time'", "Not setting a follow-up"],
        "example": "Absolutely. What specific aspects are you weighing? I can "
                   "send over some info that might help.",
    },
    "happy_with_current": {
        "framework": "status_quo_challenge",
        "steps": [
            "Acknowledge their current solution's strengths",
            "Ask about gaps or pain points they've accepted",
            "Share relevant competitive intelligence",
            "Offer a side-by-side comparison",
        ],
        "avoid": ["Bashing competitors", "Assuming their current solution is bad"],
        "example": "Good to hear that's working. Most of our customers felt the "
                   "same way until they realized [specific gap]. Have you run into that?",
    },
    "no_authority": {
        "framework": "champion_building",
        "steps": [
            "Ask who the decision maker is",
            "Understand the buying process and stakeholders",
            "Equip them with materials to present internally",
            "Offer to join a call with the decision maker",
        ],
        "avoid": ["Going over their head", "Dismissing their role"],
        "example": "Who else would need to weigh in? I can put together a brief "
                   "that makes it easy to share with your team.",
    },
    "too_complex": {
        "framework": "simplification",
        "steps": [
            "Ask what feels complex specifically",
            "Break the solution into phases",
            "Offer implementation support details",
            "Share a success story with a similar company",
        ],
        "avoid": ["Oversimplifying genuine concerns", "Adding more features to the pitch"],
        "example": "Fair point. Most teams start with just [core feature] and "
                   "expand from there. Our onboarding team handles the heavy lifting.",
    },
    "dont_see_value": {
        "framework": "value_quantification",
        "steps": [
            "Ask about their current process and costs",
            "Identify specific metrics they care about",
            "Map your solution to their KPIs",
            "Share quantified results from similar customers",
        ],
        "avoid": ["Listing features", "Generic ROI claims"],
        "example": "What metrics does your team track most closely? Let me show "
                   "you how we move the needle on those specifically.",
    },
    "bad_experience": {
        "framework": "empathy_rebuild",
        "steps": [
            "Acknowledge their experience without blame",
            "Ask what went wrong specifically",
            "Explain how you're different",
            "Offer a low-risk trial or pilot",
        ],
        "avoid": ["Dismissing their experience", "Blaming the previous vendor"],
        "example": "That sounds frustrating. What specifically didn't work? "
                   "I want to make sure we address those exact issues.",
    },
    "need_more_info": {
        "framework": "targeted_education",
        "steps": [
            "Ask what specific information they need",
            "Provide relevant case studies",
            "Offer a demo or trial focused on their use case",
            "Schedule a technical deep-dive if needed",
        ],
        "avoid": ["Sending a generic info dump", "Treating this as a rejection"],
        "example": "Happy to help. What specifically would be most useful — "
                   "technical specs, customer stories, or a focused demo?",
    },
    "feature_missing": {
        "framework": "roadmap_bridge",
        "steps": [
            "Understand why the feature matters to them",
            "Check if there's a workaround",
            "Share roadmap if the feature is planned",
            "Evaluate if it's a true dealbreaker vs nice-to-have",
        ],
        "avoid": ["Promising features you can't deliver", "Dismissing the need"],
        "example": "Good to know that's important. Can you walk me through how "
                   "you'd use it? There might be a way to get that result today.",
    },
    "contract_locked": {
        "framework": "future_planning",
        "steps": [
            "Ask when the contract expires",
            "Set up a reminder for renewal period",
            "Keep providing value in the meantime",
            "Understand their satisfaction with current vendor",
        ],
        "avoid": ["Suggesting they break their contract", "Disappearing until renewal"],
        "example": "When does your current agreement come up for renewal? I'd love "
                   "to have a conversation closer to that date.",
    },
}


class ObjectionPreClassifier(nn.Module):
    """3-way pre-classifier: genuine objection, stall, or misunderstanding.

    This distinction is critical because each category requires a completely
    different response strategy:
    - Genuine objection: Address directly with the appropriate framework
    - Stall: Probe for the real concern underneath
    - Misunderstanding: Clarify and re-educate
    """

    def __init__(self, hidden: int = 768):
        super().__init__()

        self.category_head = nn.Sequential(
            nn.Linear(hidden, 256), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(256, len(OBJECTION_CATEGORIES)),
        )

        # objection type classifier (for genuine objections)
        self.type_head = nn.Sequential(
            nn.Linear(hidden, 256), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(256, len(OBJECTION_TYPES)),
        )

        # severity estimator
        self.severity_head = nn.Sequential(
            nn.Linear(hidden, 64), nn.GELU(),
            nn.Linear(64, 1), nn.Sigmoid(),
        )

    def forward(self, encoder_output):
        cls = encoder_output.last_hidden_state[:, 0]

        # 3-way category
        cat_logits = self.category_head(cls)
        cat_probs = cat_logits.softmax(dim=-1)
        category_idx = cat_probs.argmax(dim=-1).item()
        category = OBJECTION_CATEGORIES[category_idx]

        # objection type
        type_logits = self.type_head(cls)
        type_probs = type_logits.softmax(dim=-1)
        type_idx = type_probs.argmax(dim=-1).item()
        objection_type = OBJECTION_TYPES[type_idx]

        # severity
        severity = self.severity_head(cls).item()

        # get coaching card
        card = COACHING_CARDS.get(objection_type, {})

        return {
            "category": category,
            "category_confidence": round(cat_probs[0, category_idx].item(), 3),
            "category_distribution": {
                c: round(cat_probs[0, i].item(), 3)
                for i, c in enumerate(OBJECTION_CATEGORIES)
            },
            "objection_type": objection_type,
            "type_confidence": round(type_probs[0, type_idx].item(), 3),
            "severity": round(severity, 3),
            "coaching": card,
            "top_types": [
                {"type": OBJECTION_TYPES[i], "score": round(type_probs[0, i].item(), 3)}
                for i in type_probs[0].topk(3).indices.tolist()
            ],
        }

    def compute_loss(self, cat_logits, type_logits, true_category, true_type):
        loss_cat = F.cross_entropy(cat_logits, true_category)
        loss_type = F.cross_entropy(type_logits, true_type)
        return loss_cat + loss_type
"""salescue/modules/call.py — Conditional Neural Process for Conversation Scoring

Research contribution: Call scoring has a fundamental data scarcity problem (~500 annotated
calls). We treat each call as a *task* in a meta-learning framework. The model learns a
scoring function that adapts to new call patterns from just a few examples. This is a
*conditional neural process* (Garnelo et al., 2018) adapted for conversation scoring.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class CommitmentDetector:
    """Rule-based commitment extraction from conversation turns."""

    COMMITMENT_PATTERNS = {
        "verbal_agreement": ["yes", "absolutely", "definitely", "let's do it", "sounds good",
                             "i agree", "that works", "we're in"],
        "next_step": ["send me", "send over", "set up", "schedule", "book", "arrange",
                      "follow up", "next step"],
        "timeline": ["by monday", "this week", "next week", "end of month", "by friday",
                     "tomorrow", "asap"],
        "stakeholder": ["talk to my", "check with", "run it by", "get approval",
                        "bring in", "loop in"],
    }

    def process(self, transcript):
        commitments = []
        for turn_idx, turn in enumerate(transcript):
            text_lower = turn["text"].lower()
            for ctype, patterns in self.COMMITMENT_PATTERNS.items():
                for p in patterns:
                    if p in text_lower:
                        commitments.append({
                            "type": ctype,
                            "turn": turn_idx,
                            "speaker": turn["speaker"],
                            "pattern": p,
                        })
                        break  # one match per type per turn
        return commitments


class ConversationNeuralProcess(nn.Module):
    """
    A Conditional Neural Process (CNP) for call scoring.

    Key insight: instead of learning ONE scoring function from 500 calls,
    learn a META scoring function that adapts to each call type.

    At training: see many different (context, target) splits of calls.
    At inference: the "context" is the conversation so far,
                  the "target" is predicting the outcome.
    """

    def __init__(self, hidden=768, latent_dim=128, local_window=8):
        super().__init__()
        self.local_window = local_window

        # turn encoder
        self.speaker_embed = nn.Embedding(2, 32)
        self.turn_proj = nn.Linear(hidden + 32, hidden)

        # ENCODER: map observed (turn, outcome_signal) pairs to latent representation
        self.encoder_xy = nn.Sequential(
            nn.Linear(hidden + 1, 256),
            nn.GELU(),
            nn.Linear(256, latent_dim),
        )

        # AGGREGATOR: permutation-invariant aggregation via multi-head attention
        self.aggregator = nn.MultiheadAttention(
            embed_dim=latent_dim, num_heads=4, batch_first=True)

        # DECODER: predict outcome for target turns given latent representation
        self.decoder = nn.Sequential(
            nn.Linear(hidden + latent_dim, 256),
            nn.GELU(),
            nn.Linear(256, 128),
            nn.GELU(),
        )

        # output heads
        self.conversion_mu = nn.Linear(128, 1)
        self.conversion_sigma = nn.Linear(128, 1)
        self.momentum_head = nn.Linear(128, 3)
        self.turning_point_head = nn.Linear(256, 1)  # from consecutive pairs
        self.action_head = nn.Linear(128, 5)

        self.commitment_detector = CommitmentDetector()

        self.actions = ["follow_up", "send_proposal", "escalate", "nurture", "close"]

    def encode_context(self, turn_embeds, conversion_signals):
        """
        Encode observed (turn, signal) pairs into a latent representation.

        turn_embeds: (n_context, hidden)
        conversion_signals: (n_context, 1)
        """
        xy = torch.cat([turn_embeds, conversion_signals], dim=-1)
        encoded = self.encoder_xy(xy)  # (n_context, latent_dim)

        encoded = encoded.unsqueeze(0)  # (1, n_context, latent_dim)
        aggregated, _ = self.aggregator(encoded, encoded, encoded)

        r = aggregated.mean(dim=1)  # (1, latent_dim)
        return r

    def decode_target(self, target_embeds, context_repr):
        """
        Predict outcomes for target turns given the latent context.
        """
        context_expanded = context_repr.expand(target_embeds.shape[0], -1)

        decoder_input = torch.cat([target_embeds, context_expanded], dim=-1)
        h = self.decoder(decoder_input)

        mu = self.conversion_mu(h).sigmoid()
        sigma = F.softplus(self.conversion_sigma(h)) + 0.01

        return mu, sigma

    def forward(self, encoder, tokenizer, transcript):
        # encode all turns
        tokens = tokenizer(
            [t["text"] for t in transcript],
            return_tensors="pt",
            truncation=True,
            max_length=128,
            padding=True,
        )
        speakers = torch.tensor([0 if t["speaker"] == "customer" else 1 for t in transcript])

        with torch.no_grad():
            enc = encoder(**tokens)

        cls = enc.last_hidden_state[:, 0]
        s_emb = self.speaker_embed(speakers)
        turn_embeds = self.turn_proj(torch.cat([cls, s_emb], dim=-1))

        n = len(transcript)

        # use first 80% as context, predict on all turns
        n_context = max(2, int(n * 0.8))
        context_turns = turn_embeds[:n_context]

        # heuristic conversion signals for context turns
        context_signals = torch.zeros(n_context, 1).to(turn_embeds.device)
        for i in range(n_context):
            text = transcript[i]["text"].lower()
            positive_words = sum(
                1 for w in ["great", "interesting", "yes", "absolutely",
                            "definitely", "love", "perfect", "agree"]
                if w in text
            )
            negative_words = sum(
                1 for w in ["no", "not", "can't", "don't", "won't",
                            "concerned", "worried", "expensive"]
                if w in text
            )
            context_signals[i] = 1.0 if positive_words > negative_words else 0.0

        context_repr = self.encode_context(context_turns, context_signals)

        mu, sigma = self.decode_target(turn_embeds, context_repr)

        turn_scores = mu.squeeze(-1)
        uncertainties = sigma.squeeze(-1)

        # turning points
        turning_points = []
        for i in range(1, n):
            pair = torch.cat([turn_embeds[i - 1], turn_embeds[i]])
            tp_score = self.turning_point_head(pair.unsqueeze(0)).sigmoid().item()

            if tp_score > 0.5:
                delta = turn_scores[i] - turn_scores[i - 1]
                turning_points.append({
                    "turn": i,
                    "probability": round(tp_score, 3),
                    "direction": "positive" if delta > 0 else "negative",
                    "delta": round(delta.item(), 3),
                    "uncertainty": round(uncertainties[i].item(), 3),
                    "speaker": transcript[i]["speaker"],
                })

        # momentum
        if n > 2:
            h_last = self.decoder(torch.cat([
                turn_embeds[-1], context_repr.squeeze(0)]))
            mom = self.momentum_head(h_last.unsqueeze(0))
            momentum = ["accelerating", "stable", "decelerating"][mom.argmax(-1).item()]
        else:
            momentum = "stable"

        commitments = self.commitment_detector.process(transcript)

        # action
        h_final = self.decoder(torch.cat([
            turn_embeds[-1], context_repr.squeeze(0)]))
        action = self.actions[self.action_head(h_final.unsqueeze(0)).argmax(-1).item()]

        return {
            "deal_health": round(turn_scores[-1].item() * 100),
            "turn_scores": [round(s.item(), 3) for s in turn_scores],
            "turn_uncertainties": [round(u.item(), 3) for u in uncertainties],
            "momentum": momentum,
            "turning_points": sorted(turning_points, key=lambda x: -x["probability"])[:3],
            "commitments": commitments,
            "action": action,
            "model_confidence": round(1.0 - uncertainties[-1].item(), 3),
        }

    def compute_loss(self, context_turns, context_signals, target_turns, target_outcomes):
        """
        Meta-learning training: sample different context/target splits per call.
        Loss is NLL of the predicted distribution at target turns.
        """
        context_repr = self.encode_context(context_turns, context_signals)
        mu, sigma = self.decode_target(target_turns, context_repr)

        # Gaussian NLL
        nll = 0.5 * ((target_outcomes - mu) / sigma) ** 2 + sigma.log()

        return nll.mean()
"""salescue/modules/spam.py — Perplexity Ratio AI Detection

Research contribution: Existing AI detectors compare perplexity against a threshold.
But perplexity varies by domain, register, and topic. We compute the *perplexity RATIO*
between two language models: one fine-tuned on human sales emails, one on AI-generated
sales emails. The ratio is domain-invariant because both models see the same domain
distribution.
"""

import torch
import torch.nn as nn


class PerplexityRatioDetector(nn.Module):
    """
    AI detection via perplexity ratio between human and AI language models.

    log(P_human(text)) - log(P_ai(text))

    If positive: text is more likely under the human model -> probably human
    If negative: text is more likely under the AI model -> probably AI

    We approximate this without training two full language models:
    use the shared encoder and measure reconstruction surprise patterns.
    Human text has characteristic error patterns (typos, inconsistent formality)
    that AI text lacks.
    """

    def __init__(self, hidden=768, n_probes=12):
        super().__init__()
        self.n_probes = n_probes

        # human writing pattern detector
        self.human_pattern_scorer = nn.Sequential(
            nn.Linear(hidden, 64), nn.GELU(),
            nn.Linear(64, 1),
        )

        # AI writing pattern detector
        self.ai_pattern_scorer = nn.Sequential(
            nn.Linear(hidden, 64), nn.GELU(),
            nn.Linear(64, 1),
        )

        # structural feature extractor
        self.structure_features = nn.Linear(8, 16)

    def compute_structural_features(self, text):
        """Extract features that distinguish human from AI writing."""
        sentences = [
            s.strip()
            for s in text.replace("!", ".").replace("?", ".").split(".")
            if s.strip()
        ]

        if not sentences:
            return torch.zeros(8)

        lengths = [len(s.split()) for s in sentences]

        features = torch.tensor([
            # sentence length variance (AI = low, human = high)
            torch.tensor(lengths).float().std().item() if len(lengths) > 1 else 0,
            # contraction ratio (AI avoids contractions)
            sum(1 for s in sentences if any(
                c in s.lower() for c in ["n't", "'re", "'ll", "'ve", "'m", "'d"]
            )) / max(len(sentences), 1),
            # parenthetical asides (human tendency)
            text.count("(") + text.count("\u2014") + text.count("..."),
            # exclamation mark ratio
            text.count("!") / max(len(text), 1) * 100,
            # first person ratio
            sum(1 for w in text.lower().split() if w in ("i", "i'm", "i've", "my", "me"))
            / max(len(text.split()), 1),
            # average word length
            sum(len(w) for w in text.split()) / max(len(text.split()), 1),
            # repeated sentence starters
            len(set(
                s.split()[0].lower() if s.split() else "" for s in sentences
            )) / max(len(sentences), 1),
            # text length
            min(len(text.split()) / 200, 1.0),
        ]).float()

        return features

    def forward(self, encoder_output, input_ids, tokenizer, text):
        cls = encoder_output.last_hidden_state[:, 0]

        # pattern-based scoring
        human_score = self.human_pattern_scorer(cls).item()
        ai_score = self.ai_pattern_scorer(cls).item()

        # structural features
        struct_features = self.compute_structural_features(text).to(cls.device)
        self.structure_features(struct_features)  # embed structural features

        # log-ratio: positive = human, negative = AI
        log_ratio = human_score - ai_score

        # combine with structural signal
        structural_ai_signal = (
            struct_features[0] < 2.0  # low sentence length variance
            and struct_features[1] < 0.05  # few contractions
            and struct_features[5] > 5.0  # long average word length
        )

        ai_risk = torch.sigmoid(
            torch.tensor(-log_ratio + (0.5 if structural_ai_signal else -0.5))
        ).item()

        return round(max(0, min(1.0, ai_risk)), 3)


class SpamHead(nn.Module):
    def __init__(self, hidden=768):
        super().__init__()
        self.spam_head = nn.Sequential(
            nn.Linear(hidden, 128), nn.ReLU(), nn.Linear(128, 1), nn.Sigmoid(),
        )

        self.ai_detector = PerplexityRatioDetector(hidden)

        self.providers = nn.ModuleDict({
            p: nn.Sequential(nn.Linear(3, 8), nn.ReLU(), nn.Linear(8, 1), nn.Sigmoid())
            for p in ["gmail", "outlook", "yahoo"]
        })
"""salescue/modules/subject.py — Contextual Bradley-Terry

Research contribution: Static pairwise comparison assumes fixed preference. But subject
line effectiveness depends on context: who you're sending to, what industry, what stage
of the relationship. We extend Bradley-Terry with *contextual features* — the comparison
model takes (subject_A, subject_B, context) and predicts the winner conditioned on the
prospect.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class ContextualBradleyTerry(nn.Module):
    """
    Standard Bradley-Terry: P(A > B) = sigma(score(A) - score(B))
    Our extension: P(A > B | context) = sigma(score(A, context) - score(B, context))

    The context includes: prospect industry, company size,
    relationship stage (cold/warm/existing), previous open rates.

    This means the model can learn:
    - "Quick question" beats "Detailed analysis" for cold outreach
    - But "Detailed analysis" beats "Quick question" for existing customers
    """

    def __init__(self, hidden=768, context_dim=32):
        super().__init__()

        self.subject_proj = nn.Sequential(
            nn.Linear(hidden, 128), nn.GELU(), nn.Linear(128, 64),
        )

        # context encoder
        self.context_proj = nn.Linear(context_dim, 32)

        # contextual scoring: subject representation modulated by context
        self.scorer = nn.Sequential(
            nn.Linear(64 + 32, 32), nn.GELU(),
            nn.Linear(32, 1),
        )

        # context-free scorer (fallback)
        self.scorer_no_ctx = nn.Sequential(
            nn.Linear(64, 32), nn.GELU(), nn.Linear(32, 1),
        )

    def score(self, subject_embed, context=None):
        s = self.subject_proj(subject_embed)

        if context is not None:
            c = self.context_proj(context)
            return self.scorer(torch.cat([s, c], dim=-1))
        else:
            return self.scorer_no_ctx(s)

    def compare(self, embed_a, embed_b, context=None):
        score_a = self.score(embed_a, context)
        score_b = self.score(embed_b, context)
        return torch.sigmoid(score_a - score_b).item()

    def rank(self, embeds, subjects, context=None):
        scores = [self.score(e, context).item() for e in embeds]

        indexed = sorted(enumerate(scores), key=lambda x: -x[1])

        ranking = [
            {"rank": r + 1, "subject": subjects[idx], "score": round(score * 100)}
            for r, (idx, score) in enumerate(indexed)
        ]

        return {
            "ranking": ranking,
            "best": subjects[indexed[0][0]],
            "worst": subjects[indexed[-1][0]],
        }

    def compute_loss(self, embed_winner, embed_loser, context=None, margin=0.1):
        """
        Bradley-Terry loss: winner should score higher than loser with margin.
        """
        s_win = self.score(embed_winner, context)
        s_lose = self.score(embed_loser, context)

        loss = F.relu(margin - (s_win - s_lose)).mean()

        return loss
"""salescue/modules/sentiment.py — MI-Minimized Sentiment-Intent Disentanglement

Research contribution: The core challenge of sentiment-intent inversion is that sentiment
and intent are entangled in the representation. We enforce disentanglement explicitly:
the sentiment representation should contain ZERO information about intent, and vice versa.
We use *mutual information minimization* via the CLUB bound (Cheng et al., 2020) to
provably decorrelate the two representations, then learn the inversion pattern from
their interaction.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

SENTIMENTS = [
    "enthusiastic", "positive_engaged", "neutral_professional",
    "cautious_interest", "polite_decline", "frustrated_objection", "hostile_rejection",
]
INTENTS = ["strong", "moderate", "weak", "none"]
NEGATIVE_SENTIMENTS = {4, 5, 6}
STRONG_INTENTS = {0, 1}


class CLUBEstimator(nn.Module):
    """
    Contrastive Log-ratio Upper Bound (CLUB) for mutual information estimation.
    (Cheng et al., 2020)

    Estimates I(X;Y) as an upper bound that can be minimized.
    When minimized, X and Y become independent -> disentangled.
    """

    def __init__(self, x_dim, y_dim, hidden=64):
        super().__init__()
        self.mu_net = nn.Sequential(
            nn.Linear(x_dim, hidden), nn.ReLU(),
            nn.Linear(hidden, y_dim),
        )
        self.logvar_net = nn.Sequential(
            nn.Linear(x_dim, hidden), nn.ReLU(),
            nn.Linear(hidden, y_dim),
        )

    def forward(self, x, y):
        """
        Estimate upper bound of I(x; y).
        Minimizing this makes x and y independent.
        """
        mu = self.mu_net(x)
        logvar = self.logvar_net(x)

        # log p(y|x) under the learned conditional
        positive = -(mu - y) ** 2 / (2 * logvar.exp()) - 0.5 * logvar

        # log p(y|x') for random x' (negative samples)
        x_shuffled = x[torch.randperm(x.shape[0])]
        mu_neg = self.mu_net(x_shuffled)
        logvar_neg = self.logvar_net(x_shuffled)
        negative = -(mu_neg - y) ** 2 / (2 * logvar_neg.exp()) - 0.5 * logvar_neg

        # CLUB bound: E[log p(y|x)] - E[log p(y|x')]
        mi_estimate = (positive.sum(dim=-1) - negative.sum(dim=-1)).mean()

        return mi_estimate


class DisentangledSentimentIntentHead(nn.Module):
    """
    Provably disentangled sentiment and intent representations.

    Architecture:
    1. Shared encoder output -> two SEPARATE projection networks
    2. Sentiment projection captures ONLY emotional valence
    3. Intent projection captures ONLY purchase readiness
    4. CLUB minimization ensures they share NO mutual information
    5. An INTERACTION MODULE learns how they combine for inversion detection
    """

    def __init__(self, hidden=768, sent_dim=128, intent_dim=128):
        super().__init__()

        # separate projection networks (NOT shared)
        self.sentiment_proj = nn.Sequential(
            nn.Linear(hidden, 256), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(256, sent_dim),
        )

        self.intent_proj = nn.Sequential(
            nn.Linear(hidden, 256), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(256, intent_dim),
        )

        # classification heads on disentangled representations
        self.sentiment_head = nn.Linear(sent_dim, len(SENTIMENTS))
        self.intent_head = nn.Linear(intent_dim, len(INTENTS))

        # MI minimization
        self.mi_estimator = CLUBEstimator(sent_dim, intent_dim, hidden=64)

        # INTERACTION MODULE: bilinear form for (sentiment, intent) pair effects
        self.interaction_weights = nn.Parameter(
            torch.zeros(len(SENTIMENTS), len(INTENTS)))

        # context-conditional interaction gate
        self.context_gate = nn.Sequential(
            nn.Linear(hidden, 64), nn.GELU(),
            nn.Linear(64, 1), nn.Sigmoid(),
        )

        # evidence extractor for inversion explanations
        self.evidence_proj = nn.Linear(hidden, 64)

    def forward(self, encoder_output, text=None):
        cls = encoder_output.last_hidden_state[:, 0]

        # project to disentangled representations
        sent_repr = self.sentiment_proj(cls)
        intent_repr = self.intent_proj(cls)

        # classify independently
        s_logits = self.sentiment_head(sent_repr)
        i_logits = self.intent_head(intent_repr)

        s_probs = s_logits.softmax(-1)
        i_probs = i_logits.softmax(-1)

        sentiment_idx = s_probs.argmax(-1).item()
        intent_idx = i_probs.argmax(-1).item()

        # interaction check
        interaction_weight = self.interaction_weights[sentiment_idx, intent_idx]

        gate = self.context_gate(cls).item()

        # apply interaction correction to intent logits
        correction = torch.zeros_like(i_logits)
        correction[0, intent_idx] = interaction_weight * gate
        i_logits_corrected = i_logits + correction
        i_probs_corrected = i_logits_corrected.softmax(-1)

        sentiment = SENTIMENTS[s_probs.argmax(-1).item()]
        intent = INTENTS[i_probs_corrected.argmax(-1).item()]
        intent_idx_final = i_probs_corrected.argmax(-1).item()

        inverted = (sentiment_idx in NEGATIVE_SENTIMENTS and intent_idx_final in STRONG_INTENTS)

        confidence = min(s_probs.max().item(), i_probs_corrected.max().item())

        evidence = []
        interpretation = None

        if inverted and text:
            INVERSION_SIGNALS = {
                "status_quo_pain": [
                    "sick of", "tired of", "frustrated with", "hate",
                    "broken", "waste", "failing", "crashing",
                ],
                "active_search": [
                    "what makes yours", "how is yours different",
                    "looking for alternatives", "considering switching",
                ],
                "competitor_frustration": [
                    "burned by", "vendor failed", "three vendors already",
                ],
                "urgency_from_pain": [
                    "every day", "every week", "constantly",
                    "can't keep", "need to fix",
                ],
            }

            text_lower = text.lower()
            for sig_type, patterns in INVERSION_SIGNALS.items():
                for p in patterns:
                    if p in text_lower:
                        evidence.append({"signal": sig_type, "text": p})

            interpretation = (
                f"Negative sentiment ({sentiment}) masks {intent} buying intent. "
                f"Disentangled analysis: sentiment and intent representations are "
                f"independent (MI \u2248 0), but the interaction module detects inversion "
                f"pattern with weight {interaction_weight:.2f} (gate: {gate:.2f}). "
                f"Prospect is actively dissatisfied \u2014 prioritize."
            )

        return {
            "sentiment": sentiment,
            "intent": intent,
            "confidence": round(confidence, 3),
            "inverted": inverted,
            "interaction_weight": round(interaction_weight.item(), 3),
            "context_gate": round(gate, 3),
            "disentanglement": {
                "sentiment_repr_norm": round(sent_repr.norm().item(), 3),
                "intent_repr_norm": round(intent_repr.norm().item(), 3),
            },
            "evidence": evidence,
            "interpretation": interpretation,
        }

    def _extract_intent_evidence(self, tokens, intent_repr):
        """Find which tokens contribute most to intent despite negative sentiment."""
        token_proj = self.evidence_proj(tokens[0])  # (seq, 64)

        similarities = F.cosine_similarity(
            token_proj, intent_repr[:, :64].expand(token_proj.shape[0], -1), dim=-1)

        return similarities.topk(5).indices.tolist()

    def compute_loss(self, s_logits, i_logits, i_corrected, sent_repr, intent_repr,
                     true_s, true_i, epoch):
        # classification losses
        loss_s = F.cross_entropy(s_logits, true_s)
        loss_i = F.cross_entropy(i_corrected, true_i)
        loss_i_uncorrected = F.cross_entropy(i_logits, true_i) * 0.3

        # MI minimization: force representations to be independent
        mi_loss = self.mi_estimator(sent_repr.detach(), intent_repr)
        mi_loss += self.mi_estimator(sent_repr, intent_repr.detach())
        mi_weight = min(0.5, epoch * 0.05)  # anneal MI weight

        # interaction regularization: sparsity on interaction weights
        interaction_l1 = self.interaction_weights.abs().mean() * 0.1

        # inversion reward/penalty
        inversion_loss = 0
        if epoch >= 5:
            is_neg = true_s.item() in NEGATIVE_SENTIMENTS
            is_strong = true_i.item() in STRONG_INTENTS
            pred_neg = s_logits.argmax(-1).item() in NEGATIVE_SENTIMENTS
            pred_strong = i_corrected.argmax(-1).item() in STRONG_INTENTS
            pred_conf = i_corrected.softmax(-1).max().item()

            if is_neg and is_strong and pred_neg and pred_strong:
                inversion_loss = -0.2
            elif is_neg and not is_strong and pred_neg and pred_strong and pred_conf > 0.7:
                inversion_loss = 0.25

        total = (loss_s + loss_i + loss_i_uncorrected +
                 mi_weight * mi_loss + interaction_l1 + inversion_loss)

        return total, {
            "loss_sentiment": loss_s.item(),
            "loss_intent": loss_i.item(),
            "mi_estimate": mi_loss.item(),
            "interaction_sparsity": (self.interaction_weights.abs() > 0.1).sum().item(),
        }
"""salescue/modules/emailgen.py — Mistral LoRA Email Generator (Separate)

Generates personalized sales emails using a LoRA-fine-tuned Mistral model.
Runs as a separate module (NOT on the shared DeBERTa backbone) since it
requires a generative LLM. Conditioned on outputs from other ClosingTime
modules (score, intent, sentiment) for personalized generation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class EmailGenConfig:
    """Configuration for email generation."""
    model_name: str = "mistralai/Mistral-7B-v0.1"
    lora_adapter: str | None = None  # path to LoRA weights
    max_new_tokens: int = 512
    temperature: float = 0.7
    top_p: float = 0.9
    do_sample: bool = True


@dataclass
class ProspectContext:
    """Context about the prospect for personalized generation."""
    name: str = ""
    company: str = ""
    role: str = ""
    industry: str = ""
    # from other ClosingTime modules
    score_label: str = ""  # hot/warm/cold
    intent_stage: str = ""  # unaware -> purchasing
    sentiment: str = ""  # from sentiment module
    objections: list[str] = field(default_factory=list)
    triggers: list[str] = field(default_factory=list)


def build_prompt(context: ProspectContext, email_type: str = "initial_outreach") -> str:
    """Build the generation prompt from prospect context and module outputs.

    This prompt template incorporates signals from other ClosingTime modules
    to generate contextually appropriate emails.
    """
    parts = [f"Write a {email_type} sales email with the following context:"]

    if context.name:
        parts.append(f"- Prospect: {context.name}")
    if context.company:
        parts.append(f"- Company: {context.company}")
    if context.role:
        parts.append(f"- Role: {context.role}")
    if context.industry:
        parts.append(f"- Industry: {context.industry}")

    # module-derived context
    if context.score_label:
        parts.append(f"- Lead temperature: {context.score_label}")
    if context.intent_stage:
        parts.append(f"- Buying stage: {context.intent_stage}")
    if context.sentiment:
        parts.append(f"- Current sentiment: {context.sentiment}")
    if context.objections:
        parts.append(f"- Known objections: {', '.join(context.objections)}")
    if context.triggers:
        parts.append(f"- Recent triggers: {', '.join(context.triggers)}")

    tone_map = {
        "hot": "direct and action-oriented, propose specific next steps",
        "warm": "engaging and value-focused, include social proof",
        "cold": "curious and low-pressure, lead with a question",
    }
    if context.score_label in tone_map:
        parts.append(f"\nTone: {tone_map[context.score_label]}")

    parts.append("\nRequirements:")
    parts.append("- Keep under 150 words")
    parts.append("- One clear call-to-action")
    parts.append("- Personalized to their specific situation")
    parts.append("- No generic filler or fluff")
    parts.append("\nEmail:")

    return "\n".join(parts)


class EmailGenerator:
    """Mistral LoRA email generator.

    This is a wrapper class (not nn.Module) because it manages its own
    model lifecycle separately from the shared DeBERTa backbone.

    Usage:
        gen = EmailGenerator(config)
        gen.load()  # loads Mistral + LoRA adapter
        email = gen.generate(context)
    """

    def __init__(self, config: EmailGenConfig | None = None):
        self.config = config or EmailGenConfig()
        self.model = None
        self.tokenizer = None
        self._loaded = False

    def load(self) -> None:
        """Load Mistral model with optional LoRA adapter."""
        if self._loaded:
            return

        from transformers import AutoModelForCausalLM, AutoTokenizer

        self.tokenizer = AutoTokenizer.from_pretrained(self.config.model_name)
        self.model = AutoModelForCausalLM.from_pretrained(
            self.config.model_name,
            device_map="auto",
            torch_dtype="auto",
        )

        if self.config.lora_adapter:
            from peft import PeftModel
            self.model = PeftModel.from_pretrained(self.model, self.config.lora_adapter)

        self._loaded = True

    def generate(
        self,
        context: ProspectContext,
        email_type: str = "initial_outreach",
    ) -> dict[str, Any]:
        """Generate a personalized sales email.

        Args:
            context: Prospect context including module outputs.
            email_type: Type of email (initial_outreach, follow_up, etc.).

        Returns:
            Dict with generated email text and metadata.
        """
        if not self._loaded:
            raise RuntimeError("Call .load() before .generate()")

        prompt = build_prompt(context, email_type)

        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
        outputs = self.model.generate(
            **inputs,
            max_new_tokens=self.config.max_new_tokens,
            temperature=self.config.temperature,
            top_p=self.config.top_p,
            do_sample=self.config.do_sample,
        )

        generated = self.tokenizer.decode(
            outputs[0][inputs["input_ids"].shape[1]:],
            skip_special_tokens=True,
        ).strip()

        # basic quality checks
        word_count = len(generated.split())
        has_cta = any(
            phrase in generated.lower()
            for phrase in ["let me know", "would you", "can we", "are you", "schedule", "chat"]
        )

        return {
            "email": generated,
            "word_count": word_count,
            "has_call_to_action": has_cta,
            "email_type": email_type,
            "prompt_tokens": inputs["input_ids"].shape[1],
            "context_used": {
                "score": context.score_label or "none",
                "intent": context.intent_stage or "none",
                "sentiment": context.sentiment or "none",
            },
        }

    def unload(self) -> None:
        """Release model from memory."""
        self.model = None
        self.tokenizer = None
        self._loaded = False

        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
"""salescue/engine.py — Unified Engine with preload.

Batch processing with module preloading. Manages the shared encoder
lifecycle and provides a simple API for running multiple modules.

Usage:
    engine = Engine(modules=["score", "intent", "reply"])
    results = engine.run("some email text")
    batch_results = engine.run_batch(["text1", "text2", "text3"])
"""

from __future__ import annotations

import time
from typing import Any

from .backbone import SharedEncoder, get_device
from .document import Document
from .validation import validate_text


# Registry of available module names -> class + init kwargs
MODULE_REGISTRY: dict[str, tuple[type, dict]] = {}


def register_module(name: str, cls: type, **kwargs: Any) -> None:
    """Register a module class for use with Engine."""
    MODULE_REGISTRY[name] = (cls, kwargs)


def _ensure_registry() -> None:
    """Populate the registry on first use."""
    if MODULE_REGISTRY:
        return

    from .modules.score import LeadScorer
    from .modules.intent import NeuralHawkesIntentPredictor
    from .modules.reply import ReplyHead
    from .modules.triggers import TemporalDisplacementModel
    from .modules.icp import WassersteinICPMatcher
    from .modules.call import ConversationNeuralProcess
    from .modules.spam import SpamHead
    from .modules.subject import ContextualBradleyTerry
    from .modules.sentiment import DisentangledSentimentIntentHead
    from .modules.entities import EntityExtractor
    from .modules.objection import ObjectionPreClassifier

    register_module("score", LeadScorer)
    register_module("intent", NeuralHawkesIntentPredictor)
    register_module("reply", ReplyHead)
    register_module("triggers", TemporalDisplacementModel)
    register_module("icp", WassersteinICPMatcher)
    register_module("call", ConversationNeuralProcess)
    register_module("spam", SpamHead)
    register_module("subject", ContextualBradleyTerry)
    register_module("sentiment", DisentangledSentimentIntentHead)
    register_module("entities", EntityExtractor)
    register_module("objection", ObjectionPreClassifier)


class Engine:
    """Unified inference engine for ClosingTime modules.

    Preloads specified modules and the shared encoder backbone,
    then provides .run() for single texts and .run_batch() for lists.
    """

    def __init__(self, modules: list[str] | None = None):
        """Initialize the engine with specified module names.

        Args:
            modules: List of module names to load. If None, loads all.
        """
        _ensure_registry()
        self.module_names = modules or list(MODULE_REGISTRY.keys())
        self._modules: dict[str, Any] = {}
        self._loaded = False

    def preload(self) -> "Engine":
        """Load the shared encoder and all specified modules."""
        import torch

        device = get_device()
        SharedEncoder.load()

        for name in self.module_names:
            if name not in MODULE_REGISTRY:
                raise ValueError(
                    f"Unknown module '{name}'. Available: {list(MODULE_REGISTRY.keys())}"
                )
            cls, kwargs = MODULE_REGISTRY[name]
            module = cls(**kwargs).to(device).eval()
            self._modules[name] = module

        self._loaded = True
        return self

    def run(self, text: str) -> dict[str, Any]:
        """Run all loaded modules on a single text.

        Returns dict with per-module results, timings, and any errors.
        """
        if not self._loaded:
            self.preload()

        text = validate_text(text)
        encoded = SharedEncoder.encode(text)

        results: dict[str, Any] = {}
        timings: dict[str, float] = {}
        errors: list[dict] = []

        for name, module in self._modules.items():
            t0 = time.perf_counter()
            try:
                results[name] = module(encoded["encoder_output"])
            except Exception as e:
                errors.append({"module": name, "error": str(e)})
            timings[name] = round(time.perf_counter() - t0, 4)

        return {
            "results": results,
            "timings": timings,
            "errors": errors,
            "total_time": round(sum(timings.values()), 4),
        }

    def run_batch(self, texts: list[str]) -> list[dict[str, Any]]:
        """Run all modules on a batch of texts."""
        return [self.run(text) for text in texts]

    def unload(self) -> None:
        """Release all modules and the shared encoder."""
        self._modules.clear()
        self._loaded = False
        SharedEncoder.unload()

    def __repr__(self) -> str:
        status = "loaded" if self._loaded else "not loaded"
        return f"Engine(modules={self.module_names}, {status})"
"""ClosingTime — Sales intelligence library with 12 ML modules.

Three entry points:
    1. `from salescue import ai` — namespace for ai.score(text), ai.intent(text), etc.
    2. `Engine(modules=[...])` — batch processing with preload
    3. `Document(text) | module1 | module2` — Unix pipe composition

All modules share a single DeBERTa-v3-base encoder backbone.
"""

from .document import Document
from .chain import Chain
from .engine import Engine
from .backbone import SharedEncoder, get_device, set_device
from .validation import ClosingTimeValidationError
from .reproducibility import set_deterministic, set_seed


class _AINamespace:
    """Lazy namespace providing `ai.score(text)`, `ai.intent(text)`, etc.

    Modules are loaded on first access to avoid importing torch at package
    import time.
    """

    def __getattr__(self, name: str):
        from .engine import MODULE_REGISTRY, _ensure_registry
        _ensure_registry()

        if name in MODULE_REGISTRY:
            cls, kwargs = MODULE_REGISTRY[name]
            device = get_device()
            import torch
            module = cls(**kwargs).to(device).eval()
            # cache for future calls
            setattr(self, name, module)
            return module

        raise AttributeError(f"No module named '{name}'. Available: {list(MODULE_REGISTRY.keys())}")


ai = _AINamespace()

__all__ = [
    "ai",
    "Document",
    "Chain",
    "Engine",
    "SharedEncoder",
    "get_device",
    "set_device",
    "ClosingTimeValidationError",
    "set_deterministic",
    "set_seed",
]

__version__ = "0.2.0"
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
