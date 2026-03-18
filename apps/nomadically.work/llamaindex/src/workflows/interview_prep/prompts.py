"""Prompt templates for interview prep workflow."""

PARSE_JD_SYSTEM = (
    "You are an expert technical recruiter. Analyse the job description and return JSON:\n"
    "- tech_stack: list of technology/tool names mentioned (max 15, strings)\n"
    "- requirements: list of key hard requirements as short phrases (max 10, strings)\n"
    "- role_type: one of 'frontend', 'backend', 'fullstack', 'ml', 'devops', 'data', 'other'\n"
    "- seniority: one of 'junior', 'mid', 'senior', 'lead', 'staff'\n"
    "Return ONLY valid JSON, no markdown fences."
)

GENERATE_QUESTIONS_SYSTEM = (
    "You are an expert interview coach. Return ONLY valid JSON with this structure:\n"
    '{"qa_pairs": [{"question": "...", "answer": "..."}, ...]}\n'
    "No markdown fences, no extra keys."
)

CATEGORY_SPECS = {
    "technical": {
        "count": 6,
        "question_prompt": (
            "Generate {count} challenging technical interview questions for a {seniority} {role_type} engineer at {company}. "
            "Focus on the tech stack: {tech_stack}. Mix conceptual, practical, and architecture questions."
        ),
        "answer_prompt": (
            "For each question, write a strong 3–5 sentence model answer a senior candidate would give. "
            "Be specific, mention trade-offs, and reference the tech stack where relevant."
        ),
    },
    "behavioral": {
        "count": 5,
        "question_prompt": (
            "Generate {count} behavioral interview questions (STAR format) for a {seniority} {role_type} engineer at {company}. "
            "Draw from: {requirements}. Focus on ownership, quality, autonomy, and collaboration."
        ),
        "answer_prompt": (
            "For each question, write a concise STAR model answer (Situation → Task → Action → Result) "
            "a strong candidate would give, referencing the role context."
        ),
    },
    "system_design": {
        "count": 3,
        "question_prompt": (
            "Generate {count} system design / architecture questions for a {seniority} {role_type} engineer at {company}. "
            "The role involves: {requirements}. Questions should probe architectural thinking and trade-off reasoning."
        ),
        "answer_prompt": (
            "For each question, write a structured model answer covering: approach, key trade-offs, "
            "and concrete implementation details relevant to the tech stack: {tech_stack}."
        ),
    },
    "company_culture": {
        "count": 4,
        "question_prompt": (
            "Generate {count} thoughtful questions a candidate should ask the interviewer at {company} "
            "to assess culture, team dynamics, and growth opportunities for a {seniority} {role_type} engineer."
        ),
        "answer_prompt": (
            "For each question, write 2–3 sentences describing what a strong / red-flag answer from the interviewer "
            "would look like, so the candidate knows what to listen for."
        ),
    },
}

CATEGORIES = ["technical", "behavioral", "system_design", "company_culture"]

CATEGORY_LABELS = {
    "technical": "Technical Questions",
    "behavioral": "Behavioral Questions (STAR)",
    "system_design": "System Design / Architecture",
    "company_culture": "Questions to Ask the Interviewer",
}
