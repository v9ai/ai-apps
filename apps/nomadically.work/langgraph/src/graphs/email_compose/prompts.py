"""Prompts for email compose — ported from src/prompts/compose-email.ts."""

SENDER_BACKGROUND = """- Vadim Nicolai, Senior Frontend Engineer — experienced in React, TypeScript, AI/ML, and systems engineering

SKILLS (highlight only what overlaps with the job/context):
- Frontend: React, TypeScript, Next.js, JavaScript
- AI/ML: LLM integration, RAG pipelines, AI SDK, prompt engineering, multi-agent orchestration
- Backend: Node.js, Go, GraphQL, Apollo, REST APIs, gRPC, microservices
- Systems: Rust, WebAssembly, Cloudflare Workers
- Infra: AWS, Cloudflare, Docker, CI/CD, Turborepo
- Databases: MongoDB, DynamoDB, PostgreSQL, SQLite, D1

SEEKING: fully remote EU engineering roles"""

SYSTEM_PROMPT = """You are an expert email writer. Always respond with valid JSON matching the requested structure."""


def build_compose_prompt(
    recipient_name: str,
    company_name: str = "",
    instructions: str = "",
    recipient_context: str = "",
    linkedin_post_content: str = "",
) -> str:
    first_name = recipient_name.split(" ")[0] if recipient_name else recipient_name

    parts = [
        f"You are helping Vadim Nicolai craft a personalized outreach email.",
        "",
        "RECIPIENT DETAILS:",
        f'- Name: {recipient_name} (use "{first_name}" in greeting)',
    ]

    if company_name:
        parts.append(f"- Company: {company_name}")
    if recipient_context:
        parts.append(f"- Context: {recipient_context}")

    parts.extend([
        "",
        "SENDER BACKGROUND:",
        SENDER_BACKGROUND,
        "",
    ])

    if instructions:
        parts.extend([
            f"SPECIAL INSTRUCTIONS (CRITICAL):",
            instructions,
            "",
        ])

    if linkedin_post_content:
        parts.extend([
            "LINKEDIN POST CONTEXT:",
            "The recipient recently shared this on LinkedIn:",
            "---",
            linkedin_post_content,
            "---",
            "Reference their post naturally — show genuine interest in their perspective. "
            "Do NOT quote verbatim or sound like you scraped their content.",
            "",
        ])

    parts.extend([
        "REQUIREMENTS:",
        f'1. Generate a professional email',
        f'2. Start with "Hey {first_name},"',
        "3. Keep it concise (150-300 words)",
        "4. Highlight ONLY skills that are relevant to the recipient's context or company",
        "5. Include a clear CTA",
        '6. End with "Thanks,\\nVadim"',
        "7. Do NOT make up facts about the recipient or claim skills/credentials not listed above",
        "",
        "Generate the email as a JSON object:",
        '{"subject": "Your subject line here", "body": "Your email body here"}',
    ])

    return "\n".join(parts)


def build_batch_prompt(
    company_name: str = "",
    instructions: str = "",
    job_title: str = "",
    job_location: str = "",
    job_skills: str = "",
    job_description: str = "",
    applied_at: str = "",
    status: str = "",
) -> str:
    parts: list[str] = []

    if instructions:
        parts.extend([
            "PRIMARY GOAL (most important — the entire email must serve this):",
            instructions,
            "",
            "INTERPRETATION GUIDE:",
            "- If the goal mentions 'applied', 'application', 'no response', 'follow up' → write a FOLLOW-UP email.",
            "- If the goal is cold outreach → write an introduction email.",
            "- If the goal mentions a specific ask → make that the clear CTA.",
            "",
        ])

    if company_name:
        parts.extend([f"TARGET COMPANY: {company_name}", ""])

    if job_title:
        parts.append("JOB CONTEXT:")
        parts.append(f"- Role: {job_title}")
        if job_location:
            parts.append(f"- Location: {job_location}")
        if job_skills:
            parts.append(f"- Required Skills: {job_skills}")
        if job_description:
            parts.append(f"- Description excerpt: {job_description[:500]}")
        parts.append("")

    if applied_at or status:
        parts.append("APPLICATION HISTORY:")
        if applied_at:
            parts.append(f"- Applied: {applied_at}")
        if status:
            parts.append(f"- Current status: {status}")
        parts.extend([
            '- Reference the timeline naturally (e.g. "I applied X weeks ago").',
            "",
        ])

    parts.extend([
        "SENDER BACKGROUND:",
        SENDER_BACKGROUND,
        "",
        "RULES:",
        "- Use {{name}} as placeholder for recipient's first name",
        "- Keep under 180 words",
        "- Be direct and purposeful",
        "",
        'Return ONLY a JSON: {"subject": "...", "body": "..."}',
    ])

    return "\n".join(parts)
