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
from src.graphs.linkedin_contact.graph import build_linkedin_contact_graph
from src.graphs.save_contact.graph import build_save_contact_graph

logging.basicConfig(stream=sys.stdout, level=logging.INFO)
log = logging.getLogger("langgraph-api")

# Compile graphs once at module load
email_outreach_graph = build_email_outreach_graph()
linkedin_contact_graph = build_linkedin_contact_graph()
save_contact_graph = build_save_contact_graph()

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
    contact_id: int | None = None


class LinkedInContactRequest(BaseModel):
    linkedin_url: str
    name: str
    headline: str = ""
    about: str = ""
    location: str = ""


class LinkedInContactResponse(BaseModel):
    contact_id: int | None = None
    skipped: bool = False
    profile_analysis: dict | None = None


class SaveContactRequest(BaseModel):
    recipient_name: str
    recipient_role: str = ""
    recipient_email: str = ""
    post_url: str = ""


class SaveContactResponse(BaseModel):
    contact_id: int | None = None


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

    # Save contact in parallel (non-blocking for email response)
    contact_id = None
    try:
        contact_result = save_contact_graph.invoke(
            {
                "recipient_name": req.recipient_name,
                "recipient_role": req.recipient_role,
                "recipient_email": req.recipient_email,
                "post_url": req.post_url,
                "contact_id": None,
            }
        )
        contact_id = contact_result.get("contact_id")
    except Exception as e:
        log.warning("  save_contact failed: %s", e)

    log.info("── email-outreach result ──")
    log.info("  subject: %s", final["subject"])
    log.info("  text: %s", final["text"][:300])
    log.info("  contact_id: %s", contact_id)

    return EmailOutreachResponse(
        subject=final["subject"],
        text=final["text"],
        html=final["html"],
        contact_id=contact_id,
    )


@app.post("/linkedin-contact", response_model=LinkedInContactResponse)
async def linkedin_contact(req: LinkedInContactRequest):
    log.info("── linkedin-contact request ──")
    log.info("  url: %s | name: %s", req.linkedin_url, req.name)
    log.info("  headline: %s", req.headline)

    result = linkedin_contact_graph.invoke(
        {
            "linkedin_url": req.linkedin_url,
            "name": req.name,
            "headline": req.headline,
            "about": req.about,
            "location": req.location,
            "profile_analysis": None,
            "contact_id": None,
            "skipped": False,
        }
    )

    log.info("  contact_id: %s | skipped: %s", result.get("contact_id"), result.get("skipped"))

    return LinkedInContactResponse(
        contact_id=result.get("contact_id"),
        skipped=result.get("skipped", False),
        profile_analysis=result.get("profile_analysis"),
    )


@app.post("/save-contact", response_model=SaveContactResponse)
async def save_contact(req: SaveContactRequest):
    log.info("── save-contact request ──")
    log.info("  name: %s | role: %s | email: %s", req.recipient_name, req.recipient_role, req.recipient_email)

    result = save_contact_graph.invoke(
        {
            "recipient_name": req.recipient_name,
            "recipient_role": req.recipient_role,
            "recipient_email": req.recipient_email,
            "post_url": req.post_url,
            "contact_id": None,
        }
    )

    contact_id = result.get("contact_id")
    log.info("  contact_id: %s", contact_id)

    return SaveContactResponse(contact_id=contact_id)
