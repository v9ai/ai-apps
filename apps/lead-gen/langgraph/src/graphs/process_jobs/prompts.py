"""Prompt templates for the process_jobs pipeline.

Ported from workers/process-jobs/src/entry.py.
"""

from langchain_core.prompts import ChatPromptTemplate

# Phase 2 — Role Tagging
ROLE_TAGGING_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a job-classification specialist. "
        "Analyze job postings to identify target roles: Frontend/React engineers and AI/ML/LLM engineers. "
        "Return structured JSON with clear confidence assessment.",
    ),
    (
        "human",
        """Analyze this job posting and classify the role type.

JOB DETAILS:
- Title:       {title}
- Location:    {location}
- Description: {description}

CLASSIFICATION GUIDANCE:

FRONTEND/REACT INDICATOR:
- Look for: React, Vue, Angular, Next.js, TypeScript, JavaScript, HTML/CSS
- Look for: "Frontend Engineer", "UI Engineer", "Web Developer", "Full Stack (React focus)"
- HIGH confidence if: Title explicitly mentions React/Frontend AND description has React/JS frameworks

AI/ML/LLM ENGINEER INDICATOR:
- Look for: AI, Machine Learning, LLM, RAG, embeddings, vector search, transformers, PyTorch
- Look for: "AI Engineer", "ML Engineer", "Data Scientist (ML-focused)", "LLM Engineer"
- Look for: "NLP", "computer vision", "deep learning", "neural networks", "fine-tuning"
- Look for: "MLOps", "AI Architect", "ML Platform", "AI Infrastructure", "AI/ML"
- Look for: "GenAI", "Generative AI", "Foundation Model", "Prompt Engineer"
- Look for: "Applied Scientist", "Research Engineer", "Research Scientist"
- Look for: "AI Trainer" (if training AI models, not just annotating data)
- HIGH confidence if: Title or description explicitly includes AI/ML terminology

DUAL ROLES:
- Both can be true for "AI-powered React engineer" or "ML + Frontend" roles

CONFIDENCE LEVELS:
- HIGH: Role title or opening sentence clearly indicates specialization + skills match
- MEDIUM: Role could be either, mixed signals, or senior generalista with tech requirements
- LOW: Insufficient information, generic "engineer" title, or unclear skill requirements

Return ONLY valid JSON (no markdown):
{{
  "isFrontendReact": boolean,
  "isAIEngineer": boolean,
  "confidence": "high" | "medium" | "low",
  "reason": "Brief explanation of classification"
}}""",
    ),
])

# Phase 4 — Skill Extraction
SKILL_EXTRACTION_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a technical recruiter extracting skills from job descriptions. "
        "Only output canonical skill tags from the provided list. "
        "Do not invent tags. Return valid JSON only, no markdown.",
    ),
    (
        "human",
        """Extract technical skills from this job posting.

ALLOWED TAGS (use ONLY these exact strings): {tags}

JOB:
- Title: {title}
- Description: {description}

For each skill found, output:
- tag: exact string from the allowed list
- level: "required" (must-have), "preferred" (nice-to-have but important), or "nice" (bonus)
- confidence: 0.0-1.0 how certain you are this skill applies
- evidence: short quote from the description that supports this skill (min 10 chars)

Return ONLY valid JSON:
{{"skills": [{{"tag": "...", "level": "required|preferred|nice", "confidence": 0.0, "evidence": "..."}}]}}""",
    ),
])
