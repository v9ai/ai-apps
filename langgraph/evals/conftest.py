"""Shared fixtures and metrics for How It Works pipeline evaluations.

Metrics cover every dimension of quality for the pipeline's two LLM calls:
  1. analyze_node  → technical analysis (markdown)
  2. generate_node → structured HowItWorksData (JSON)

Run:
    uv run pytest evals/ -v -m eval       # full LLM-judged suite
    uv run pytest evals/ -v -m "not eval" # structural tests only (no API calls)
"""

from __future__ import annotations

import os

import pytest
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

from deepseek_model import DeepSeekModel

os.environ.setdefault("DEEPEVAL_TELEMETRY_OPT_OUT", "YES")

THRESHOLD = 0.7
STRICT_THRESHOLD = 0.85

model = DeepSeekModel()

# ═══════════════════════════════════════════════════════════════════════════════
# MARKDOWN STRUCTURE METRICS
# ═══════════════════════════════════════════════════════════════════════════════

markdown_heading_hierarchy_metric = GEval(
    name="Markdown Heading Hierarchy",
    criteria=(
        "Evaluate whether the markdown output uses a correct and consistent heading hierarchy. "
        "The expected structure is: one H2 (##) document title at the top, then H3 (###) headings "
        "for each of the 10 numbered analysis dimensions (### 1. Purpose, ### 2. Tech Stack, etc.). "
        "Check that: (1) There is exactly one H2 title heading, "
        "(2) There are exactly 10 H3 headings numbered 1–10 for the analysis dimensions, "
        "(3) No heading level is skipped (no H4 #### unless under an H3), "
        "(4) Headings are numbered sequentially matching the required dimensions, "
        "(5) Heading text is descriptive — not just a number, "
        "(6) No bare text blocks appear before the first heading (other than a title). "
        "A well-structured document should be navigable by headings alone."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

markdown_code_blocks_metric = GEval(
    name="Markdown Code Block Usage",
    criteria=(
        "Evaluate whether inline code and fenced code blocks are used correctly in the markdown. "
        "Check that: (1) File names are in inline code: `lib/auth.ts`, not lib/auth.ts, "
        "(2) Function/method names are in inline code: `getSession()`, not getSession(), "
        "(3) Package names are in inline code: `drizzle-orm`, not drizzle-orm, "
        "(4) SQL table/column names are in inline code: `user`, `todo.user_id`, "
        "(5) API paths are in inline code: `/api/todos`, not /api/todos, "
        "(6) Multi-line code snippets use fenced code blocks (``` ```) if present, "
        "(7) Inline code is not overused for non-code terms (e.g., regular English words). "
        "Every technical identifier from the source code should be in backticks."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

markdown_list_formatting_metric = GEval(
    name="Markdown List Formatting",
    criteria=(
        "Evaluate whether lists in the markdown are well-formatted and informative. "
        "Check that: (1) Unordered lists use consistent markers (all `-` or all `*`), "
        "(2) Ordered lists use sequential numbers (1. 2. 3.), "
        "(3) List items are substantive — not just single words or labels, "
        "(4) Nested lists use proper indentation (2 or 4 spaces), "
        "(5) The tech stack section uses a list with **bold** technology names followed by descriptions, "
        "(6) List items that describe data flow use numbered lists to show sequence, "
        "(7) No list has more than 10 items at a single level (break into sublists or sections). "
        "Lists should enhance scannability, not create walls of bullets."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

markdown_bold_emphasis_metric = GEval(
    name="Markdown Bold & Emphasis Usage",
    criteria=(
        "Evaluate whether bold (**) and italic (*) emphasis are used appropriately. "
        "Check that: (1) Technology names in the tech stack are bolded: **Next.js 15.0.0**, "
        "(2) Table names in the database section are bolded: **user**, **todo**, "
        "(3) Bold is used for key terms on first introduction, not for entire sentences, "
        "(4) Italic is used sparingly for definitions or clarifications, "
        "(5) No emphasis abuse — not every other word is bolded, "
        "(6) Emphasis aids scanning: a reader skimming bold words gets the key facts. "
        "Bold should highlight the MOST important terms; overuse dilutes its value."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

markdown_section_density_metric = GEval(
    name="Markdown Section Content Density",
    criteria=(
        "Evaluate whether each markdown section has appropriate content density. "
        "Check that: (1) No section is just a heading with a single sentence, "
        "(2) Each section has at least 2–3 substantive points or sentences, "
        "(3) The most important sections (Data Flow, Database, Architecture) are the longest, "
        "(4) Less relevant sections (e.g., AI/LLM if not applicable) can be brief but must "
        "explicitly state why they are brief ('No AI integration detected'), "
        "(5) No section exceeds 15 lines — long sections should use sublists or subheadings, "
        "(6) Overall balance: no single section dominates (>40%) the total content."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

markdown_link_quality_metric = GEval(
    name="Markdown Link & Reference Quality",
    criteria=(
        "Evaluate how well the markdown references and cross-references information. "
        "Check that: (1) File paths mentioned are formatted consistently as inline code, "
        "(2) When a function is referenced, its file location is mentioned at least once "
        "(e.g., '`getSession()` in `lib/auth.ts`'), "
        "(3) Database columns reference their table (e.g., '`todo.user_id`' not just '`user_id`'), "
        "(4) Version numbers accompany package names at least in the Tech Stack section, "
        "(5) Cross-references between sections are implicit but traceable "
        "(e.g., Auth section references same `getSession()` as API Design section). "
        "A reader should be able to trace any mentioned artefact back to its source file."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

markdown_readability_metric = GEval(
    name="Markdown Readability & Flow",
    criteria=(
        "Evaluate the overall readability and prose flow of the markdown document. "
        "Check that: (1) Sections transition logically — Purpose → Stack → Data Flow → Architecture, "
        "(2) Sentences within sections follow a logical order (general → specific), "
        "(3) No orphaned paragraphs that don't connect to surrounding content, "
        "(4) Technical jargon is used precisely — no buzzwords without specifics, "
        "(5) The document reads as a cohesive analysis, not disconnected bullet dumps, "
        "(6) Consistent voice and tense throughout (present tense for how things work), "
        "(7) No markdown rendering artifacts (unescaped special characters, broken formatting)."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

# ═══════════════════════════════════════════════════════════════════════════════
# ANALYSIS CONTENT METRICS
# ═══════════════════════════════════════════════════════════════════════════════

analysis_completeness_metric = GEval(
    name="Analysis Completeness",
    criteria=(
        "Evaluate whether the technical analysis covers all 10 required dimensions: "
        "(1) Purpose, (2) Tech stack, (3) Data flow, (4) Architecture, "
        "(5) Features, (6) AI/LLM integration, (7) Database & schema, "
        "(8) API design, (9) Auth & security, (10) Unique patterns. "
        "Each dimension should have substantive content, not just a heading. "
        "If the app genuinely lacks a dimension (e.g., no AI integration), "
        "the analysis should explicitly state that rather than omitting it."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

analysis_specificity_metric = GEval(
    name="Analysis Specificity",
    criteria=(
        "Evaluate whether the analysis names specific code artefacts from the input: "
        "actual file names (e.g., 'lib/auth.ts'), function names (e.g., 'getSession()'), "
        "component names (e.g., '<Dashboard />'), table names (e.g., 'users'), "
        "API paths (e.g., '/api/auth/[...all]'), package names with versions. "
        "Penalize vague statements like 'the app uses a database' or 'there is authentication'. "
        "Every claim should reference a concrete artefact from the source files."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

analysis_accuracy_metric = GEval(
    name="Analysis Accuracy",
    criteria=(
        "Given the source files (input) and the analysis (actual_output), "
        "verify that every factual claim in the analysis is supported by the source code. "
        "Check that: (1) named files actually exist in the input, "
        "(2) function/component names match what appears in the code, "
        "(3) dependency versions match package.json, "
        "(4) described data flows match the actual code logic, "
        "(5) no invented features or capabilities are attributed to the app. "
        "A claim is HALLUCINATED if it describes something not present in the input."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=STRICT_THRESHOLD,
)

analysis_data_flow_metric = GEval(
    name="Data Flow Clarity",
    criteria=(
        "Evaluate whether the analysis clearly traces the end-to-end data flow: "
        "how data enters the system (user input, API call, webhook), "
        "how it is processed (server actions, API routes, middleware), "
        "how it is stored (database tables, cache, file system), "
        "and how it is returned to the user (server components, client hydration, API response). "
        "The flow should be described as a concrete sequence of steps with named artefacts, "
        "not as abstract architecture. A reader should be able to trace a request through the code."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

analysis_no_filler_metric = GEval(
    name="No Generic Filler",
    criteria=(
        "Evaluate whether the analysis avoids generic best-practice advice and stays "
        "grounded in what the code actually does. Penalize for: "
        "(1) 'This follows best practices for...' without specifying which practices, "
        "(2) 'The app could benefit from...' or improvement suggestions, "
        "(3) 'Typically, applications like this...' or industry comparisons, "
        "(4) Generic descriptions like 'robust authentication' or 'scalable architecture' "
        "without explaining what makes it robust or scalable in THIS codebase. "
        "The analysis should describe WHAT IS, not what should be."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

# ═══════════════════════════════════════════════════════════════════════════════
# GENERATION METRICS (evaluate the structured JSON from generate_node)
# ═══════════════════════════════════════════════════════════════════════════════

papers_quality_metric = GEval(
    name="Papers / Foundations Quality",
    criteria=(
        "Evaluate the 'papers' (Technical Foundations) array in the JSON output. "
        "Each paper represents a key technology used in the app. Check that: "
        "(1) There are 5–10 entries covering the most significant technologies, "
        "(2) Each has a meaningful 'finding' that explains the technology's core capability, "
        "(3) Each has a specific 'relevance' that names actual code artefacts from the app, "
        "(4) Categories are correctly assigned (Frontend, Database, AI/LLM, etc.), "
        "(5) Category colors match the guide (Frontend→blue, Database→green, etc.), "
        "(6) No duplicate or trivially overlapping entries. "
        "Penalize generic relevance descriptions that could apply to any app."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

agents_pipeline_metric = GEval(
    name="Pipeline Stages Quality",
    criteria=(
        "Evaluate the 'agents' (Pipeline Stages) array in the JSON output. "
        "These represent the ordered data flow through the system. Check that: "
        "(1) There are 4–8 steps showing a logical progression, "
        "(2) Steps follow the actual data flow (not arbitrary grouping), "
        "(3) Each step names specific code artefacts (functions, components, routes), "
        "(4) Descriptions are 2–4 sentences with technical detail, not vague summaries, "
        "(5) The sequence makes sense end-to-end (a reader could follow a request through). "
        "Penalize steps that are too generic ('Data Processing') without naming HOW."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

stats_quality_metric = GEval(
    name="Stats / Metrics Quality",
    criteria=(
        "Evaluate the 'stats' array in the JSON output. These should be specific "
        "technical metrics or architectural facts. Check that: "
        "(1) There are 3–6 entries, "
        "(2) Numbers are specific and verifiable (not invented), "
        "(3) Labels are clear and concise, "
        "(4) Sources reference actual code or documentation, "
        "(5) Stats are meaningful and non-trivial (not just 'uses TypeScript'). "
        "Good examples: '8 API routes', '4 database tables', '1024-dim embeddings'. "
        "Bad examples: 'many features', 'fast performance'."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

story_quality_metric = GEval(
    name="Story / Narrative Quality",
    criteria=(
        "Evaluate the 'story' field in the JSON output. This should be a flowing "
        "3–5 sentence narrative of the complete end-to-end journey. Check that: "
        "(1) It mentions specific technologies and tools by name, "
        "(2) It traces a complete user journey from input to output, "
        "(3) It reads naturally as prose (not bullet points disguised as sentences), "
        "(4) It captures the app's unique technical approach, "
        "(5) It avoids marketing language ('revolutionary', 'cutting-edge'). "
        "The story should convey both WHAT the app does and HOW it does it technically."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

extra_sections_metric = GEval(
    name="Extra Sections Quality",
    criteria=(
        "Evaluate the 'extraSections' array in the JSON output. Check that: "
        "(1) There are 3–6 sections, "
        "(2) Required sections are present: System Architecture, Security & Auth, "
        "Deployment & Infrastructure, and Database Design (if the app has a DB), "
        "(3) AI Integration section is included if the app uses LLMs/embeddings, "
        "(4) Each section has 3–5 sentences of technical deep-dive, "
        "(5) Content names actual table names, function names, security patterns, "
        "(6) No section is just a restatement of another section's content."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

json_schema_compliance_metric = GEval(
    name="JSON Schema Compliance",
    criteria=(
        "Evaluate whether the JSON output strictly follows the required schema. "
        "Check that: (1) All required top-level keys are present (title, subtitle, story, "
        "papers, agents, stats, extraSections), "
        "(2) Each paper has required fields: slug, number, title, category, "
        "(3) Each agent has required fields: name, description, "
        "(4) Each stat has required fields: number, label, "
        "(5) Each extraSection has required fields: heading, content, "
        "(6) No extraneous keys are present, "
        "(7) Slugs are valid kebab-case, "
        "(8) Category colors use the var(--<color-name>-9) format where color-name "
        "is one of: blue, green, purple, amber, orange, red, cyan, indigo, gray, teal "
        "(e.g., var(--blue-9), var(--green-9), var(--purple-9))."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

# ═══════════════════════════════════════════════════════════════════════════════
# CROSS-CUTTING METRICS
# ═══════════════════════════════════════════════════════════════════════════════

anti_hallucination_metric = GEval(
    name="Anti-Hallucination",
    criteria=(
        "You are given a technical analysis (input) and structured JSON output (actual_output). "
        "For every factual claim in the JSON (paper titles, pipeline steps, stats, section content), "
        "check whether it is supported by the analysis text. "
        "A claim is HALLUCINATED if it: "
        "- References a technology not mentioned in the analysis, "
        "- Invents a function name, component, or table not in the analysis, "
        "- Attributes a capability to the app not described in the analysis, "
        "- Fabricates a statistic or metric. "
        "A claim is VALID if it directly corresponds to content in the analysis. "
        "Score 1.0 = no hallucinations; 0.0 = major fabrications."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=STRICT_THRESHOLD,
)

consistency_metric = GEval(
    name="Internal Consistency",
    criteria=(
        "Evaluate whether the JSON output is internally consistent. Check that: "
        "(1) Technologies in papers are referenced in pipeline agents and sections, "
        "(2) Stats numbers match claims elsewhere in the output, "
        "(3) The story narrative aligns with the pipeline steps, "
        "(4) Paper categories and category colors are consistent (same technology "
        "always gets the same category), "
        "(5) Extra sections don't contradict the papers or agents, "
        "(6) Paper numbers are sequential starting from 1."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

typescript_output_quality_metric = GEval(
    name="TypeScript Output Quality",
    criteria=(
        "Evaluate whether the generated TypeScript code (actual_output) would compile "
        "and render correctly as a React component. Check that: "
        "(1) Import statements reference valid package paths, "
        "(2) All string values are properly escaped and quoted, "
        "(3) Array syntax is valid TypeScript, "
        "(4) JSX expressions are valid React, "
        "(5) The data.tsx exports match what how-it-works-client.tsx imports, "
        "(6) The page.tsx has valid Next.js metadata and default export."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=STRICT_THRESHOLD,
)

# ═══════════════════════════════════════════════════════════════════════════════
# MARKDOWN-TO-JSON FIDELITY METRIC
# ═══════════════════════════════════════════════════════════════════════════════

markdown_to_json_fidelity_metric = GEval(
    name="Markdown-to-JSON Fidelity",
    criteria=(
        "You are given a markdown analysis (input) and a JSON output (actual_output) "
        "derived from that analysis. Evaluate whether the JSON faithfully preserves "
        "the technical content from the markdown. Check that: "
        "(1) Every technology listed in the markdown Tech Stack section appears as a paper, "
        "(2) The data flow described in markdown maps to the pipeline agents in JSON, "
        "(3) Database tables mentioned in markdown appear in extraSections, "
        "(4) Stats numbers are derivable from the markdown content (file counts, table counts, etc.), "
        "(5) The story in JSON is a faithful summary of the markdown's narrative, "
        "(6) No information is lost in the markdown→JSON transformation, "
        "(7) No information is invented that wasn't in the markdown. "
        "The JSON should be a structured mirror of the markdown, not a reinterpretation."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)
