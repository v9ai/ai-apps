"""Prompts for email reply generation — ported from src/lib/email/reply-generation.ts."""

REPLY_TYPE_INSTRUCTIONS = {
    "polite_decline": (
        "Politely decline the opportunity or request. Keep it brief, professional, "
        "and leave the door open for future opportunities."
    ),
    "interested": (
        "Express genuine interest in the opportunity. Ask for more details and "
        "suggest next steps (call, meeting, or more information)."
    ),
    "interested_also_in_permanent": (
        "Express genuine interest in the opportunity. Mention that while you're "
        "primarily looking for contract roles, you're also open to permanent "
        "positions for the right opportunity. Ask for more details and suggest "
        "next steps (call, meeting, or more information)."
    ),
    "attach_cv": (
        "Express interest and mention that you're attaching your CV for their "
        "review. Keep it professional and suggest next steps for discussion."
    ),
    "follow_up_2weeks": (
        "Acknowledge their message and politely ask if it would be okay to follow "
        "up in 1 week. Keep it brief and professional."
    ),
    "follow_up_1month": (
        "Acknowledge their message and politely ask if it would be okay to follow "
        "up in 1 month. Keep it brief and professional."
    ),
    "request_more_info": (
        "Express interest and ask for more specific details about the opportunity "
        "(role details, tech stack, team size, compensation range, etc.)."
    ),
    "thank_you": (
        "Send a genuine thank you message. Be warm and appreciative while keeping "
        "it concise."
    ),
}


def build_system_prompt(tone: str | None = None) -> str:
    tone_desc = tone or "professional"
    return f"""You are an expert email writer helping Vadim Nicolai craft thoughtful email replies.

Your role is to generate {tone_desc} replies that:
1. Acknowledge and address points from the original email
2. Are concise and to the point
3. Feel personal and genuine
4. Include specific details when requested
5. Have a clear next step or response

Background on Vadim:
- Senior Frontend Engineer with 10+ years experience
- Currently contributing to Nautech Systems open source trading engine
- Built production exchange adapters for dYdX v4 and Hyperliquid in Rust
- Expertise in React, TypeScript, Rust, and trading systems
- Looking for opportunities in crypto/DeFi

Format requirements:
- Start with a greeting using only the first name from the original sender
- Keep paragraphs short and scannable
- Reference specific points from the original email when relevant
- End with a clear next step
- Sign off as "Vadim"
- Be responsive to the original email's tone and content"""


def build_user_prompt(
    original_email: str,
    sender: str,
    reply_type: str = "",
    additional_details: str = "",
    instructions: str = "",
    include_calendly: bool = False,
) -> str:
    parts: list[str] = [
        "Generate a reply to the following email:",
        "\n--- Original Email ---",
        f"From: {sender}",
        f"Content:\n{original_email}",
        "--- End Original Email ---\n",
    ]

    if reply_type and reply_type in REPLY_TYPE_INSTRUCTIONS:
        parts.append(
            f"REPLY TYPE INSTRUCTION (must follow this):\n{REPLY_TYPE_INSTRUCTIONS[reply_type]}"
        )

    if additional_details:
        parts.append(
            f"Additional details to include in the reply:\n{additional_details}"
        )

    if instructions:
        parts.append(
            f"IMPORTANT - Special Instructions (must follow these carefully):\n{instructions}"
        )

    if include_calendly:
        parts.append(
            'IMPORTANT - Include Calendly link:\nWhen suggesting a call or meeting, '
            'naturally include: "You can book a convenient time via my Calendly: '
            'https://calendly.com/nicolad"'
        )

    instructions_note = (
        "\n- ENSURE you incorporate the special instructions above" if instructions else ""
    )
    parts.append(f"""
Generate a subject line and reply body in the following format:

Subject: Re: [maintain or improve the original subject]

Body: [your reply body here]

The reply should:
- Be at least 150 characters
- Start with an appropriate greeting
- Address key points from the original email
- Include the additional details if provided
- Have a clear next step or call to action
- End with "Thanks,\\nVadim" or "Best,\\nVadim" as appropriate{instructions_note}""")

    return "\n\n".join(parts)
