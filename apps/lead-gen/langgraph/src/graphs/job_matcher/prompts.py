TARGET_ROLES = [
    "AI Engineer",
    "Machine Learning Engineer",
    "React Developer",
    "Frontend Developer",
    "Full Stack Developer",
]
ROLE_SCORE_THRESHOLD = 0.4
MAX_CANDIDATES = 50


def build_scoring_messages(titles: list[str]) -> list[dict]:
    target_str = ", ".join(TARGET_ROLES)
    titles_str = "\n".join(f"- {t}" for t in titles)
    prompt = (
        f"You are a job relevance scorer. Target roles: {target_str}.\n"
        f"For each job title below, return a JSON object mapping the exact title "
        f"to a score from 0.0 to 1.0, where 1.0 = perfect match for target roles "
        f"and 0.0 = completely unrelated.\n"
        f'Example output: {{"AI Engineer": 0.95, "3D Furniture Designer": 0.02}}\n'
        f"Respond ONLY with valid JSON. No explanation, no markdown.\n\n"
        f"Titles:\n{titles_str}"
    )
    return [
        {"role": "system", "content": "You are a JSON-only job relevance scorer."},
        {"role": "user", "content": prompt},
    ]
