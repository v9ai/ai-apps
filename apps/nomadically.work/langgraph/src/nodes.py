from langgraph.types import Send

from .classifier import classify
from .data import fetch_jobs
from .models import PipelineState, RemoteAICompany


def fetch_jobs_node(state: PipelineState) -> dict:
    jobs = fetch_jobs()
    print(f"Loaded {len(jobs)} jobs")
    return {"jobs": jobs, "classifications": []}


def route_to_classify(state: PipelineState) -> list[Send] | str:
    """Fan out to classify_job in parallel, one Send per job."""
    jobs = state.get("jobs") or []
    if not jobs:
        return "aggregate"
    return [Send("classify_job", {"job": job}) for job in jobs]


def classify_job_node(state: dict) -> dict:
    """Classify a single job — called in parallel via Send."""
    job = state["job"]
    print(f"  → {job['title']} @ {job.get('company_name', '?')}")
    result = classify(job)
    label = "AI+Remote" if result.is_ai_company and result.is_fully_remote else "skip"
    print(f"    [{label}] ai={result.ai_confidence}, remote={result.remote_confidence}")
    return {"classifications": [result]}


def aggregate_node(state: PipelineState) -> dict:
    """Group qualifying jobs by company and build the final ranked list."""
    classifications = state.get("classifications") or []
    job_map = {j["id"]: j for j in (state.get("jobs") or [])}

    company_map: dict[str, RemoteAICompany] = {}
    for c in classifications:
        if not (c.is_ai_company and c.is_fully_remote):
            continue
        name = c.company_name
        if name not in company_map:
            company_map[name] = {
                "name": name,
                "job_count": 0,
                "sample_titles": [],
                "sample_urls": [],
                "ai_confidence": c.ai_confidence,
                "remote_confidence": c.remote_confidence,
            }
        company_map[name]["job_count"] += 1
        if len(company_map[name]["sample_titles"]) < 3:
            job = job_map.get(c.job_id)
            if job and job.get("title"):
                company_map[name]["sample_titles"].append(job["title"])
            if c.job_url and c.job_url not in company_map[name]["sample_urls"]:
                company_map[name]["sample_urls"].append(c.job_url)

    companies = sorted(company_map.values(), key=lambda c: c["job_count"], reverse=True)
    return {"remote_ai_companies": companies}
