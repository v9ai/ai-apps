"""Cloudflare Python Worker entry point."""

from workers import Response, WorkerEntrypoint
import json
import asyncio


class Default(WorkerEntrypoint):
    """Research pipeline worker."""

    async def fetch(self, request):
        env = self.env
        url = str(request.url)

        # Health check — no auth required
        if "/health" in url:
            d1_status = "untested"
            try:
                result = await env.D1.prepare(
                    "SELECT count(*) as cnt FROM goals"
                ).all()
                cnt = result.results.to_py()[0]["cnt"] if result.results.length > 0 else 0
                d1_status = f"ok rows={cnt}"
            except Exception as e:
                d1_status = f"error: {e}"
            return Response(
                json.dumps({"status": "ok", "d1": d1_status}),
                headers={"Content-Type": "application/json"},
            )

        # Auth check for all other endpoints
        auth = request.headers.get("Authorization", "")
        expected = f"Bearer {env.WORKER_AUTH_SECRET}"
        if auth != expected:
            return Response("Unauthorized", status=401)

        if "/run" in url and request.method == "POST":
            body = await request.json()
            job_id = body.get("job_id", "")

            # Run pipeline inline to catch errors
            try:
                await _execute_pipeline(body, env)
                return Response(
                    json.dumps({"ok": True, "thread_id": job_id}),
                    headers={"Content-Type": "application/json"},
                )
            except Exception as e:
                return Response(
                    json.dumps({"ok": False, "error": str(e)}),
                    headers={"Content-Type": "application/json"},
                    status=500,
                )

        return Response("Not Found", status=404)


async def _execute_pipeline(body: dict, env) -> None:
    """Run the full research pipeline and update the generation job."""
    from graph.builder import run_pipeline
    from db.d1_client import update_generation_job

    settings = {
        "d1": env.D1,
        "account_id": env.CLOUDFLARE_ACCOUNT_ID,
        "database_id": env.CLOUDFLARE_DATABASE_ID,
        "d1_token": getattr(env, "CLOUDFLARE_D1_TOKEN", ""),
        "deepseek_api_key": env.DEEPSEEK_API_KEY,
        "semantic_scholar_api_key": getattr(env, "SEMANTIC_SCHOLAR_API_KEY", ""),
        "openalex_api_key": getattr(env, "OPENALEX_API_KEY", ""),
    }

    job_id = body.get("job_id", "")

    result = await run_pipeline(
        {
            "user_id": body.get("user_email", ""),
            "goal_id": body.get("goal_id"),
            "job_id": job_id,
            "characteristic_id": body.get("characteristic_id"),
            "feedback_id": body.get("feedback_id"),
        },
        settings,
    )

    count = result.get("persisted_count", 0)
    diagnostics = result.get("diagnostics") or {}
    if count > 0:
        await update_generation_job(
            settings,
            job_id,
            status="SUCCEEDED",
            progress=100,
            result=json.dumps({"count": count, "diagnostics": diagnostics}),
        )
    else:
        message = result.get("message", "No papers met minimum quality thresholds")
        await update_generation_job(
            settings,
            job_id,
            status="FAILED",
            progress=100,
            error=json.dumps({"message": message}),
            result=json.dumps({"count": 0, "diagnostics": diagnostics}),
        )
