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
from src.graphs.text_to_sql.graph import build_text_to_sql_graph
from src.graphs.email_reply.graph import build_email_reply_graph
from src.graphs.admin_chat.graph import build_admin_chat_graph
from src.graphs.email_compose.graph import build_email_compose_graph
from src.graphs.eu_classifier.graph import build_eu_classifier_graph
from src.graphs.resume_rag.graph import build_resume_rag_graph

logging.basicConfig(stream=sys.stdout, level=logging.INFO)
log = logging.getLogger("langgraph-api")

# Compile graphs once at module load
email_outreach_graph = build_email_outreach_graph()
linkedin_contact_graph = build_linkedin_contact_graph()
save_contact_graph = build_save_contact_graph()
text_to_sql_graph = build_text_to_sql_graph()
email_reply_graph = build_email_reply_graph()
admin_chat_graph = build_admin_chat_graph()
email_compose_graph = build_email_compose_graph()
eu_classifier_graph = build_eu_classifier_graph()
resume_rag_graph = build_resume_rag_graph()

app = FastAPI(title="Lead Gen LangGraph API", version="0.1.0")

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


class TextToSqlRequest(BaseModel):
    question: str
    database_schema: str = ""


class TextToSqlResponse(BaseModel):
    sql: str
    explanation: str
    confidence: float = 0.5
    tables_used: list[str] = []


class EmailReplyRequest(BaseModel):
    original_email: str
    sender: str
    instructions: str = ""
    tone: str = "professional"
    reply_type: str = ""
    include_calendly: bool = False
    additional_details: str = ""


class EmailReplyResponse(BaseModel):
    subject: str
    body: str


class AdminChatRequest(BaseModel):
    prompt: str
    system: str = ""


class AdminChatResponse(BaseModel):
    response: str


class EmailComposeRequest(BaseModel):
    recipient_name: str
    company_name: str = ""
    instructions: str = ""
    recipient_context: str = ""
    linkedin_post_content: str = ""


class EmailComposeResponse(BaseModel):
    subject: str
    body: str


class ClassifyJobRequest(BaseModel):
    title: str
    location: str = ""
    description: str = ""


class ClassifyJobResponse(BaseModel):
    is_remote_eu: bool = False
    confidence: str = "low"
    reason: str = ""
    source: str = ""


class ResumeChatRequest(BaseModel):
    user_id: str
    question: str


class ResumeChatResponse(BaseModel):
    answer: str


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


@app.post("/text-to-sql", response_model=TextToSqlResponse)
async def text_to_sql(req: TextToSqlRequest):
    log.info("── text-to-sql request ──")
    log.info("  question: %s", req.question[:200])

    result = text_to_sql_graph.invoke(
        {
            "question": req.question,
            "database_schema": req.database_schema,
            "sql": "",
            "explanation": "",
            "confidence": 0.5,
            "tables_used": [],
        }
    )

    log.info("  sql: %s", result.get("sql", "")[:200])

    return TextToSqlResponse(
        sql=result.get("sql", ""),
        explanation=result.get("explanation", ""),
        confidence=result.get("confidence", 0.5),
        tables_used=result.get("tables_used", []),
    )


@app.post("/email-reply", response_model=EmailReplyResponse)
async def email_reply(req: EmailReplyRequest):
    log.info("── email-reply request ──")
    log.info("  sender: %s | type: %s", req.sender, req.reply_type)

    result = email_reply_graph.invoke(
        {
            "original_email": req.original_email,
            "sender": req.sender,
            "instructions": req.instructions,
            "tone": req.tone,
            "reply_type": req.reply_type,
            "include_calendly": req.include_calendly,
            "additional_details": req.additional_details,
            "subject": "",
            "body": "",
        }
    )

    log.info("  subject: %s", result.get("subject", "")[:80])

    return EmailReplyResponse(
        subject=result.get("subject", ""),
        body=result.get("body", ""),
    )


@app.post("/admin-chat", response_model=AdminChatResponse)
async def admin_chat(req: AdminChatRequest):
    log.info("── admin-chat request ──")
    log.info("  prompt: %s", req.prompt[:200])

    result = admin_chat_graph.invoke(
        {
            "prompt": req.prompt,
            "system": req.system,
            "response": "",
        }
    )

    log.info("  response_len: %d", len(result.get("response", "")))

    return AdminChatResponse(response=result.get("response", ""))


@app.post("/email-compose", response_model=EmailComposeResponse)
async def email_compose(req: EmailComposeRequest):
    log.info("── email-compose request ──")
    log.info("  recipient: %s | company: %s", req.recipient_name, req.company_name)

    result = email_compose_graph.invoke(
        {
            "recipient_name": req.recipient_name,
            "company_name": req.company_name,
            "instructions": req.instructions,
            "recipient_context": req.recipient_context,
            "linkedin_post_content": req.linkedin_post_content,
            "subject": "",
            "body": "",
        }
    )

    log.info("  subject: %s", result.get("subject", "")[:80])

    return EmailComposeResponse(
        subject=result.get("subject", ""),
        body=result.get("body", ""),
    )


@app.post("/classify-job", response_model=ClassifyJobResponse)
async def classify_job(req: ClassifyJobRequest):
    log.info("── classify-job request ──")
    log.info("  title: %s | location: %s", req.title, req.location)

    result = eu_classifier_graph.invoke(
        {
            "job": {
                "title": req.title,
                "location": req.location,
                "description": req.description,
            },
            "signals": None,
            "classification": None,
            "source": "",
        }
    )

    classification = result.get("classification") or {}
    source = result.get("source", "")

    log.info("  result: eu=%s source=%s", classification.get("isRemoteEU"), source)

    return ClassifyJobResponse(
        is_remote_eu=classification.get("isRemoteEU", False),
        confidence=classification.get("confidence", "low"),
        reason=classification.get("reason", ""),
        source=source,
    )


@app.post("/resume-chat", response_model=ResumeChatResponse)
async def resume_chat(req: ResumeChatRequest):
    log.info("── resume-chat request ──")
    log.info("  user: %s | question: %s", req.user_id, req.question[:200])

    result = resume_rag_graph.invoke(
        {
            "action": "chat",
            "user_id": req.user_id,
            "query": req.question,
            "resume_id": "",
            "resume_text": "",
            "pdf_base64": "",
            "filename": "",
            "limit": 8,
            "chunks_stored": 0,
            "search_results": [],
            "chat_response": "",
            "stats": {},
        }
    )

    answer = result.get("chat_response", "")
    log.info("  answer_len: %d", len(answer))

    return ResumeChatResponse(answer=answer)
