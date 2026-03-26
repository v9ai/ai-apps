"""Interview Prep Workflow — LlamaIndex Workflows equivalent of the LangGraph StateGraph."""

import json

from llama_index.core.llms import ChatMessage
from llama_index.core.workflow import (
    Context,
    StartEvent,
    StopEvent,
    Workflow,
    step,
)

from src.config import get_llm_json
from .events import GenerateQuestionsEvent, ParsedJDEvent, QuestionSetCompleteEvent
from .prompts import (
    CATEGORIES,
    CATEGORY_LABELS,
    CATEGORY_SPECS,
    GENERATE_QUESTIONS_SYSTEM,
    PARSE_JD_SYSTEM,
)


def _fetch_company_context(company_key: str) -> str:
    """Fetch all jobs for the company from DB and compile a context string."""
    try:
        from src.db.connection import get_connection

        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT title, ashby_department, workplace_type,
                       salary_min, salary_max, salary_currency,
                       LEFT(description, 600) AS desc_excerpt
                FROM jobs
                WHERE company_key = %s
                  AND description IS NOT NULL
                  AND status != 'stale'
                ORDER BY ashby_department, title
                """,
                [company_key],
            )
            rows = cur.fetchall()
        conn.close()
    except Exception as e:
        print(f"  Warning: could not fetch company jobs — {e}")
        return ""

    if not rows:
        return ""

    by_dept: dict[str, list] = {}
    for r in rows:
        dept = r.get("ashby_department") or "Other"
        by_dept.setdefault(dept, []).append(r)

    lines = [f"## All open roles at this company ({len(rows)} total)\n"]
    for dept, jobs in sorted(by_dept.items()):
        lines.append(f"### {dept}")
        for j in jobs:
            remote = j.get("workplace_type") or "?"
            sal = ""
            if j.get("salary_min") and j.get("salary_max"):
                sal = f" | {j['salary_min']:,}–{j['salary_max']:,} {j.get('salary_currency', '')}"
            lines.append(f"- **{j['title']}** ({remote}){sal}")
            if j.get("desc_excerpt"):
                excerpt = j["desc_excerpt"].strip().replace("\n", " ")
                sentences = excerpt.split(". ")
                short = ". ".join(sentences[:2]).strip()
                if short:
                    lines.append(f"  > {short}")
        lines.append("")

    print(f"  Loaded {len(rows)} company jobs for context ({len(by_dept)} departments)")
    return "\n".join(lines)


class InterviewPrepWorkflow(Workflow):
    """Fan-out interview question generation across 4 categories."""

    @step
    async def parse_jd(self, ctx: Context, ev: StartEvent) -> ParsedJDEvent:
        """Extract tech_stack, requirements, role_type, seniority from JD."""
        job_title = ev.job_title
        company_name = ev.company_name
        job_description = ev.job_description
        company_key = ev.get("company_key", "")

        llm = get_llm_json()
        messages = [
            ChatMessage(role="system", content=PARSE_JD_SYSTEM),
            ChatMessage(
                role="user",
                content=f"Job title: {job_title}\nCompany: {company_name}\n\n{job_description}",
            ),
        ]
        response = await llm.achat(messages)

        try:
            raw = json.loads(response.message.content)
            tech_stack = raw.get("tech_stack", [])
            requirements = raw.get("requirements", [])
            role_type = raw.get("role_type", "other")
            seniority = raw.get("seniority", "senior")
        except (json.JSONDecodeError, KeyError):
            tech_stack, requirements, role_type, seniority = [], [], "other", "senior"

        print(f"Parsed JD — role_type={role_type}, seniority={seniority}")
        print(f"  Tech stack: {', '.join(tech_stack)}")

        company_context = _fetch_company_context(company_key)

        # Store input data for later steps
        await ctx.store.set("application_id", ev.get("application_id", 0))
        await ctx.store.set("job_title", job_title)
        await ctx.store.set("company_name", company_name)
        await ctx.store.set("job_description", job_description)

        return ParsedJDEvent(
            tech_stack=tech_stack,
            requirements=requirements,
            role_type=role_type,
            seniority=seniority,
            company_context=company_context,
        )

    @step
    async def fan_out_categories(self, ctx: Context, ev: ParsedJDEvent) -> GenerateQuestionsEvent | None:
        """Send one GenerateQuestionsEvent per category."""
        job_title = await ctx.store.get("job_title")
        company_name = await ctx.store.get("company_name")
        job_description = await ctx.store.get("job_description")

        await ctx.store.set("num_categories", len(CATEGORIES))
        # Store parsed data for report
        await ctx.store.set("parsed", {
            "tech_stack": ev.tech_stack,
            "requirements": ev.requirements,
            "role_type": ev.role_type,
            "seniority": ev.seniority,
        })

        for cat in CATEGORIES:
            ctx.send_event(GenerateQuestionsEvent(
                category=cat,
                job_title=job_title,
                company_name=company_name,
                job_description=job_description,
                tech_stack=ev.tech_stack,
                requirements=ev.requirements,
                role_type=ev.role_type,
                seniority=ev.seniority,
                company_context=ev.company_context,
            ))

    @step(num_workers=4)
    async def generate_questions(self, ctx: Context, ev: GenerateQuestionsEvent) -> QuestionSetCompleteEvent:
        """Generate Q&A pairs for one category — runs in parallel."""
        category = ev.category
        spec = CATEGORY_SPECS[category]

        tech_stack = ", ".join(ev.tech_stack) or "the described tech stack"
        requirements = "; ".join(ev.requirements) or "the described requirements"
        role_type = ev.role_type or "software"
        seniority = ev.seniority or "senior"
        company = ev.company_name

        fmt = dict(
            count=spec["count"], seniority=seniority, role_type=role_type,
            company=company, tech_stack=tech_stack, requirements=requirements,
        )

        question_instr = spec["question_prompt"].format(**fmt)
        answer_instr = spec["answer_prompt"].format(**fmt)

        context_block = f"\n\n{ev.company_context}" if ev.company_context else ""

        llm = get_llm_json()
        messages = [
            ChatMessage(role="system", content=GENERATE_QUESTIONS_SYSTEM),
            ChatMessage(
                role="user",
                content=(
                    f"Role: {ev.job_title} at {company}\n\n"
                    f"Job description (excerpt):\n{ev.job_description[:2000]}"
                    f"{context_block}\n\n"
                    f"QUESTIONS: {question_instr}\n\n"
                    f"ANSWERS: {answer_instr}\n\n"
                    f"Return exactly {spec['count']} Q&A pairs as JSON."
                ),
            ),
        ]

        response = await llm.achat(messages)
        try:
            raw = json.loads(response.message.content)
            pairs = raw.get("qa_pairs") or raw.get("questions") or []
            qa_pairs = [
                {"question": p.get("question", ""), "answer": p.get("answer", "")}
                for p in pairs
                if isinstance(p, dict) and p.get("question")
            ]
        except (json.JSONDecodeError, KeyError, TypeError):
            qa_pairs = []

        print(f"  [{category}] {len(qa_pairs)} Q&A pairs")
        return QuestionSetCompleteEvent(category=category, qa_pairs=qa_pairs)

    @step
    async def compile_report(self, ctx: Context, ev: QuestionSetCompleteEvent) -> StopEvent | None:
        """Collect all 4 category results and assemble the markdown report."""
        num_categories = await ctx.store.get("num_categories")
        results = ctx.collect_events(ev, [QuestionSetCompleteEvent] * num_categories)
        if results is None:
            return None

        parsed = await ctx.store.get("parsed")
        job_title = await ctx.store.get("job_title")
        company_name = await ctx.store.get("company_name")

        sets_by_category = {r.category: r.qa_pairs for r in results}

        lines = [f"# Interview Prep — {job_title} @ {company_name}", ""]
        if parsed and parsed.get("tech_stack"):
            lines += [f"**Tech stack:** {', '.join(parsed['tech_stack'])}", ""]

        for cat in CATEGORIES:
            label = CATEGORY_LABELS[cat]
            pairs = sets_by_category.get(cat, [])
            lines += [f"## {label}", ""]

            if not pairs:
                lines += ["*(no questions generated)*", ""]
                continue

            answer_label = "What to listen for" if cat == "company_culture" else "Model answer"
            for i, pair in enumerate(pairs, 1):
                lines += [
                    f"### {i}. {pair['question']}",
                    "",
                    f"**{answer_label}:** {pair['answer']}",
                    "",
                ]

        report = "\n".join(lines)
        question_sets = [
            {"category": cat, "qa_pairs": sets_by_category.get(cat, [])}
            for cat in CATEGORIES
        ]

        # Persist to local filesystem
        try:
            from src.storage import store_interview_prep
            application_id = await ctx.store.get("application_id", 0)
            store_interview_prep(
                application_id=application_id,
                job_title=job_title,
                company_name=company_name,
                report=report,
                parsed=parsed,
                question_sets=question_sets,
            )
        except Exception as e:
            print(f"  Warning: local storage failed — {e}")

        return StopEvent(result={
            "report": report,
            "parsed": parsed,
            "question_sets": question_sets,
        })
