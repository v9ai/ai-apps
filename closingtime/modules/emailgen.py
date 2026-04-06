"""closingtime/modules/emailgen.py — Mistral LoRA Email Generator (Separate)

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
