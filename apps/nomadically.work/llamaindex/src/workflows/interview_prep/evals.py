"""
Evals for the interview prep workflow.

Run:
    python -m cli eval-interview-prep

Three phases per job:
1. Hard structural assertions — fail fast on counts, types, required fields
2. Semantic assertions — tech stack items present in JD, role_type/seniority match
3. deepeval GEval metrics — LLM-judged quality for parsing, questions, and report
"""

from dotenv import load_dotenv

load_dotenv()

import asyncio
import json
import os

from deepeval import evaluate
from deepeval.metrics import GEval
from deepeval.models import DeepEvalBaseLLM
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from llama_index.llms.deepseek import DeepSeek

from .prompts import CATEGORIES
from .workflow import InterviewPrepWorkflow


# ---------------------------------------------------------------------------
# DeepSeek as judge model
# ---------------------------------------------------------------------------

class DeepSeekJudge(DeepEvalBaseLLM):
    def __init__(self):
        self._llm = DeepSeek(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            api_key=os.environ["DEEPSEEK_API_KEY"],
            temperature=0.0,
        )

    def load_model(self):
        return self._llm

    def generate(self, prompt: str, **kwargs) -> str:
        from llama_index.core.llms import ChatMessage
        response = self._llm.chat([ChatMessage(role="user", content=prompt)])
        return response.message.content

    async def a_generate(self, prompt: str, **kwargs) -> str:
        from llama_index.core.llms import ChatMessage
        response = await self._llm.achat([ChatMessage(role="user", content=prompt)])
        return response.message.content

    def get_model_name(self) -> str:
        return os.getenv("DEEPSEEK_MODEL", "deepseek-chat")


_judge = DeepSeekJudge()

# ---------------------------------------------------------------------------
# Mock JDs
# ---------------------------------------------------------------------------

MOCK_JOBS = [
    {
        "name": "Senior ML Engineer @ Mistral AI",
        "job_title": "Senior Machine Learning Engineer",
        "company_name": "Mistral AI",
        "job_description": (
            "We are building the next generation of open-weight large language models.\n"
            "As a Senior ML Engineer you will:\n"
            "- Design and implement training pipelines for LLMs using PyTorch and CUDA\n"
            "- Optimize distributed training across thousands of H100 GPUs with DeepSpeed\n"
            "- Build data preprocessing pipelines in Python and contribute to our Hugging Face "
            "Transformers-based codebase\n"
            "- Work closely with research scientists to productionize new model architectures\n\n"
            "Requirements:\n"
            "- 5+ years experience in machine learning engineering\n"
            "- Deep expertise in PyTorch, CUDA kernel optimization, or custom CUDA ops\n"
            "- Experience with distributed training (FSDP, DeepSpeed, Megatron)\n"
            "- Proficiency in Python and familiarity with Rust or C++ a plus\n"
            "- Strong understanding of transformer architectures and training dynamics\n\n"
            "Fully remote, EU timezone."
        ),
        "expected_role_type": "ml",
        "expected_seniority": "senior",
        "expected_tech_stack_contains": ["PyTorch", "Python"],
    },
    {
        "name": "Senior Backend Engineer @ Linear",
        "job_title": "Senior Backend Engineer",
        "company_name": "Linear",
        "job_description": (
            "Linear builds the issue tracking tool loved by high-performance engineering teams.\n"
            "We're looking for a Senior Backend Engineer to scale our real-time infrastructure.\n\n"
            "You will:\n"
            "- Architect and implement high-throughput APIs in TypeScript and Node.js\n"
            "- Manage PostgreSQL schemas and optimize complex queries\n"
            "- Build reliable background job systems using Redis queues\n"
            "- Deploy and monitor services on AWS using Kubernetes and Terraform\n\n"
            "Requirements:\n"
            "- 5+ years backend engineering experience\n"
            "- Strong TypeScript and Node.js skills\n"
            "- Experience with PostgreSQL at scale (indexing, query planning, replication)\n"
            "- Knowledge of Redis, event-driven systems, and WebSockets for real-time features\n"
            "- AWS or GCP experience with Kubernetes\n\n"
            "Remote-first, EU timezone preferred."
        ),
        "expected_role_type": "backend",
        "expected_seniority": "senior",
        "expected_tech_stack_contains": ["TypeScript", "PostgreSQL"],
    },
    {
        "name": "Lead Fullstack Engineer @ Vercel",
        "job_title": "Lead Fullstack Engineer",
        "company_name": "Vercel",
        "job_description": (
            "Vercel is the platform for frontend developers. We deploy millions of Next.js apps daily.\n"
            "We need a Lead Fullstack Engineer to drive our dashboard and developer experience.\n\n"
            "Responsibilities:\n"
            "- Lead a team of 4 engineers building Vercel's dashboard (React, Next.js, TypeScript)\n"
            "- Design GraphQL APIs consumed by web and CLI clients\n"
            "- Build CI/CD pipeline integrations with GitHub, GitLab, and Bitbucket\n"
            "- Own backend services written in Go that power our edge infrastructure\n\n"
            "Requirements:\n"
            "- 7+ years engineering experience, 2+ in a lead or staff role\n"
            "- Expert-level React and Next.js skills\n"
            "- GraphQL API design experience (Apollo Server or similar)\n"
            "- Go proficiency for backend services\n"
            "- Understanding of edge computing and CDN architecture\n\n"
            "Fully remote."
        ),
        "expected_role_type": "fullstack",
        "expected_seniority": "lead",
        "expected_tech_stack_contains": ["React", "Next.js"],
    },
]

CATEGORY_COUNTS = {
    "technical": 6,
    "behavioral": 5,
    "system_design": 3,
    "company_culture": 4,
}

VALID_ROLE_TYPES = {"frontend", "backend", "fullstack", "ml", "devops", "data", "other"}
VALID_SENIORITIES = {"junior", "mid", "senior", "lead", "staff"}

# ---------------------------------------------------------------------------
# deepeval metrics
# ---------------------------------------------------------------------------

jd_parsing_metric = GEval(
    model=_judge,
    name="JD Parsing Relevance",
    criteria=(
        "The 'parsed' JSON must accurately reflect the job description. "
        "tech_stack items should be technologies actually mentioned or strongly implied by the JD. "
        "requirements should be concrete hard requirements, not generic phrases. "
        "role_type and seniority must match the seniority signals in the title and responsibilities."
    ),
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.EXPECTED_OUTPUT,
    ],
    threshold=0.7,
)

question_relevance_metric = GEval(
    model=_judge,
    name="Question Relevance",
    criteria=(
        "Each question must be specific to the role, company, and tech stack in the job description. "
        "Generic questions applicable to any software engineering role are poor quality. "
        "Technical questions should reference actual technologies from the JD. "
        "Behavioral questions should relate to the role's stated responsibilities."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    threshold=0.65,
)

answer_quality_metric = GEval(
    model=_judge,
    name="Answer Quality",
    criteria=(
        "Model answers must be substantive (at least 2–3 sentences), specific, and reference the role "
        "context. For behavioral questions the answer must follow STAR format "
        "(Situation / Task / Action / Result). For system design, the answer must cover trade-offs. "
        "Empty or single-sentence answers are unacceptable."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    threshold=0.65,
)

report_completeness_metric = GEval(
    model=_judge,
    name="Report Completeness",
    criteria=(
        "The markdown report must contain all four sections: "
        "'## Technical Questions', '## Behavioral Questions', '## System Design', "
        "and '## Questions to Ask the Interviewer'. "
        "The header must include the job title and company name. "
        "No section should show '*(no questions generated)*'. "
        "Tech stack should be listed near the top."
    ),
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.EXPECTED_OUTPUT,
    ],
    threshold=0.8,
)


# ---------------------------------------------------------------------------
# Hard assertions
# ---------------------------------------------------------------------------

def _assert_parsed(parsed: dict, job: dict) -> None:
    assert isinstance(parsed.get("tech_stack"), list), "tech_stack must be a list"
    assert len(parsed["tech_stack"]) > 0, f"tech_stack is empty for {job['name']}"

    assert isinstance(parsed.get("requirements"), list), "requirements must be a list"
    assert len(parsed["requirements"]) > 0, f"requirements is empty for {job['name']}"

    assert parsed.get("role_type") in VALID_ROLE_TYPES, (
        f"{job['name']}: invalid role_type '{parsed.get('role_type')}'"
    )
    assert parsed.get("seniority") in VALID_SENIORITIES, (
        f"{job['name']}: invalid seniority '{parsed.get('seniority')}'"
    )

    assert parsed["role_type"] == job["expected_role_type"], (
        f"{job['name']}: expected role_type={job['expected_role_type']}, got {parsed['role_type']}"
    )
    assert parsed["seniority"] == job["expected_seniority"], (
        f"{job['name']}: expected seniority={job['expected_seniority']}, got {parsed['seniority']}"
    )

    captured_lower = {t.lower() for t in parsed["tech_stack"]}
    for tech in job["expected_tech_stack_contains"]:
        assert any(tech.lower() in t for t in captured_lower), (
            f"{job['name']}: expected '{tech}' in tech_stack, got {parsed['tech_stack']}"
        )


def _assert_question_sets(question_sets: list, job: dict) -> None:
    by_category = {qs["category"]: qs for qs in question_sets}

    for cat in CATEGORIES:
        assert cat in by_category, f"{job['name']}: missing category '{cat}'"
        pairs = by_category[cat]["qa_pairs"]
        expected = CATEGORY_COUNTS[cat]

        assert len(pairs) == expected, (
            f"{job['name']} [{cat}]: expected {expected} Q&A pairs, got {len(pairs)}"
        )
        for i, pair in enumerate(pairs):
            assert pair.get("question"), f"{job['name']} [{cat}] pair {i}: empty question"
            assert pair.get("answer"), f"{job['name']} [{cat}] pair {i}: empty answer"
            assert len(pair["question"]) > 20, (
                f"{job['name']} [{cat}] pair {i}: question too short"
            )
            assert len(pair["answer"]) > 50, (
                f"{job['name']} [{cat}] pair {i}: answer too short (< 50 chars)"
            )


def _assert_report(report: str, job: dict) -> None:
    assert job["job_title"] in report, f"{job['name']}: report missing job title"
    assert job["company_name"] in report, f"{job['name']}: report missing company name"

    for header in [
        "## Technical Questions",
        "## Behavioral Questions",
        "## System Design",
        "## Questions to Ask the Interviewer",
    ]:
        assert header in report, f"{job['name']}: report missing section '{header}'"

    assert "*(no questions generated)*" not in report, (
        f"{job['name']}: report has at least one empty section"
    )


# ---------------------------------------------------------------------------
# Build test cases
# ---------------------------------------------------------------------------

def build_test_cases() -> tuple[list[LLMTestCase], list[LLMTestCase], list[LLMTestCase]]:
    """Run workflow on all mock jobs, assert hard constraints, return deepeval cases."""
    workflow = InterviewPrepWorkflow(timeout=120, verbose=False)
    parsing_cases: list[LLMTestCase] = []
    question_cases: list[LLMTestCase] = []
    report_cases: list[LLMTestCase] = []

    for job in MOCK_JOBS:
        print(f"\n  Running workflow: {job['name']} ...")
        async def _run():
            return await workflow.run(
                job_title=job["job_title"],
                company_name=job["company_name"],
                job_description=job["job_description"],
                company_key="",
            )

        result = asyncio.run(_run())

        parsed = result["parsed"]
        question_sets = result["question_sets"]
        report = result["report"]

        qs_summary = [f"{qs['category']}={len(qs['qa_pairs'])}" for qs in question_sets]
        print(f"    parsed: role_type={parsed['role_type']}, seniority={parsed['seniority']}, "
              f"tech_stack={parsed['tech_stack'][:3]}...")
        print(f"    question_sets: {qs_summary}")
        print(f"    report: {len(report)} chars")

        # Phase 1 + 2: hard assertions
        _assert_parsed(parsed, job)
        _assert_question_sets(question_sets, job)
        _assert_report(report, job)

        # deepeval — JD parsing
        parsing_cases.append(LLMTestCase(
            name=f"{job['name']} — JD Parsing",
            input=(
                f"Title: {job['job_title']}\n"
                f"Company: {job['company_name']}\n\n"
                f"{job['job_description']}"
            ),
            actual_output=json.dumps(parsed, indent=2),
            expected_output=json.dumps({
                "role_type": job["expected_role_type"],
                "seniority": job["expected_seniority"],
                "tech_stack_contains": job["expected_tech_stack_contains"],
            }),
        ))

        # deepeval — Q&A quality per category
        by_cat = {qs["category"]: qs["qa_pairs"] for qs in question_sets}
        for cat in CATEGORIES:
            question_cases.append(LLMTestCase(
                name=f"{job['name']} — {cat}",
                input=(
                    f"Role: {job['job_title']} @ {job['company_name']}\n"
                    f"Category: {cat}\n\n"
                    f"{job['job_description'][:1000]}"
                ),
                actual_output=json.dumps(by_cat.get(cat, []), indent=2),
            ))

        # deepeval — report completeness
        report_cases.append(LLMTestCase(
            name=f"{job['name']} — Report",
            input=(
                f"Title: {job['job_title']}\n"
                f"Company: {job['company_name']}\n"
                f"Parsed: {json.dumps(parsed)}"
            ),
            actual_output=report,
            expected_output=(
                f"Markdown report with header '# Interview Prep — {job['job_title']} @ {job['company_name']}', "
                "tech stack listed, and all four sections populated: "
                "Technical Questions (6 Q&A), Behavioral Questions (5 Q&A), "
                "System Design (3 Q&A), Questions to Ask the Interviewer (4 Q&A)."
            ),
        ))

    return parsing_cases, question_cases, report_cases


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    total_jobs = len(MOCK_JOBS)
    total_cats = len(CATEGORIES)
    print(f"Running interview prep workflow on {total_jobs} mock jobs ({total_cats} categories each)...\n")

    parsing_cases, question_cases, report_cases = build_test_cases()

    print(
        f"\nAll hard structural + semantic assertions passed "
        f"({total_jobs} jobs × {total_cats} categories = "
        f"{total_jobs * total_cats} question sets verified)."
    )
    print(
        f"Running deepeval metrics: "
        f"{len(parsing_cases)} parsing, "
        f"{len(question_cases)} question, "
        f"{len(report_cases)} report cases...\n"
    )

    evaluate(test_cases=parsing_cases, metrics=[jd_parsing_metric])
    evaluate(
        test_cases=question_cases,
        metrics=[question_relevance_metric, answer_quality_metric],
    )
    evaluate(test_cases=report_cases, metrics=[report_completeness_metric])


if __name__ == "__main__":
    main()
