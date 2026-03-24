"""LangGraph API server.

Run: uv run uvicorn server:app --port 8002 --reload
"""

import logging
import sys

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

from src.graphs.email_outreach.graph import build_email_outreach_graph

logging.basicConfig(stream=sys.stdout, level=logging.INFO)
log = logging.getLogger("langgraph-api")

# Compile graph once at module load
email_outreach_graph = build_email_outreach_graph()

app = FastAPI(title="Nomadically LangGraph API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3004"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


# ── Models ──────────────────────────────────────────────────


class EmailOutreachRequest(BaseModel):
    recipient_name: str
    recipient_role: str = ""
    recipient_email: str
    post_text: str
    post_url: str = ""
    tone: str = "professional and friendly"


class EmailOutreachResponse(BaseModel):
    subject: str
    text: str
    html: str


# ── Routes ──────────────────────────────────────────────────


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/email-outreach", response_model=EmailOutreachResponse)
async def email_outreach(req: EmailOutreachRequest):
    log.info("── email-outreach request ──")
    log.info("  to: %s", req.recipient_email)
    log.info("  name: %s | role: %s", req.recipient_name, req.recipient_role)
    log.info("  post_text: %s", req.post_text[:200])
    log.info("  tone: %s", req.tone)

    result = email_outreach_graph.invoke(
        {
            "recipient_name": req.recipient_name,
            "recipient_role": req.recipient_role,
            "post_text": req.post_text[:2000],
            "post_url": req.post_url,
            "recipient_email": req.recipient_email,
            "tone": req.tone,
            "contact_context": "",
            "company_context": "",
            "post_analysis": None,
            "draft": None,
            "final": None,
        }
    )

    final = result.get("final") or result.get("draft")
    if not final:
        raise HTTPException(status_code=500, detail="Pipeline produced no output")

    log.info("── email-outreach result ──")
    log.info("  subject: %s", final["subject"])
    log.info("  text: %s", final["text"][:300])

    return EmailOutreachResponse(
        subject=final["subject"],
        text=final["text"],
        html=final["html"],
    )
