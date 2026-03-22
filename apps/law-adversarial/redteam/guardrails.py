"""
Production guardrails for the law-adversarial app.

Use these guards to protect the app at runtime:
  - Input guards: validate incoming brief text before passing to agents
  - Output guards: validate agent outputs before storing/streaming

Usage:
    from redteam.guardrails import input_guards, output_guards

    safe_input = input_guards.guard_input(brief_text)
    if not safe_input.is_safe:
        raise ValueError(safe_input.reason)

    raw_output = await run_attacker(ctx)
    safe_output = output_guards.guard_output(input=brief_text, output=raw_output)
    if not safe_output.is_safe:
        raw_output = fallback_output()
"""

from deepteam.guardrails import Guardrails, PromptInjectionGuard, HallucinationGuard, TopicalGuard

input_guards = Guardrails(
    input_guards=[
        PromptInjectionGuard(),
        TopicalGuard(
            system_prompt=(
                "You are a legal brief analysis system. "
                "You only analyze legal documents, court briefs, motions, and memoranda of law."
            ),
        ),
    ],
)

output_guards = Guardrails(
    output_guards=[
        HallucinationGuard(),
    ],
)
