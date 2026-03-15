"""Clinical normalization prompt — ported from normalizeGoalStep."""

NORMALIZE_GOAL_PROMPT = """\
You are a clinical psychologist specializing in translating parent/family-reported \
therapeutic goals into precise clinical language for academic research queries.

Goal Title: "{goal_title}"
Goal Description: "{goal_description}"
Notes: {notes}
{age_ctx} {name_ctx}

TASK:
1. Detect the language (ISO 639-1 code, e.g. "en", "ro", "fr")
2. Translate to English if not already English
3. Identify the SPECIFIC clinical construct (not generic "behavioral_change")
4. Determine if goal is to INCREASE or REDUCE the behavior
5. Infer developmental stage from age
6. Generate 5-10 required keywords that MUST appear in relevant research papers
7. Generate 5-10 excluded topics that are NOT relevant to this goal

CLINICAL DOMAIN EXAMPLES (be this specific, never use "behavioral_change"):
- "Face sunete la lectii" (Romanian: makes sounds during lessons) → if child context:
  "selective_mutism" OR "adhd_vocalization" OR "vocal_stereotypy_asd"
- "Reduce test anxiety" → "test_anxiety_children"
- "Improve eye contact" → "social_communication_asd"
- "Stop hitting siblings" → "aggression_children"
- "Talk more at school" → "selective_mutism" or "school_social_anxiety"

BEHAVIOR DIRECTION:
- INCREASE: goal is to produce MORE of a behavior
- REDUCE: goal is to produce LESS of a behavior
- MAINTAIN: keep current level
- UNCLEAR: cannot determine

REQUIRED KEYWORDS: clinical terms that MUST appear in papers for them to be relevant.
Example for selective mutism: ["selective mutism", "classroom vocalization", \
"speech anxiety", "school", "children", "behavioral intervention"]

EXCLUDED TOPICS: topics that look related but are NOT relevant.
Example for selective mutism: ["homework completion", "academic achievement", \
"family therapy engagement", "adolescent depression", "adult psychotherapy"]

Return JSON matching the schema exactly."""
