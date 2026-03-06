import logging
import sys
import os
from typing import Optional, Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv

load_dotenv()

# Add backend to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

app = FastAPI(title="BS Detector", description="Legal brief verification pipeline")

CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5175").split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

MAX_DOC_KEY_LEN = 64
MAX_DOC_VALUE_LEN = 100_000
MAX_DOCUMENTS = 10
MAX_CASE_ID_LEN = 256


class AnalyzeRequest(BaseModel):
    case_id: Optional[str] = Field(None, max_length=MAX_CASE_ID_LEN)
    documents: Optional[Dict[str, str]] = None

    @field_validator("documents")
    @classmethod
    def validate_documents(cls, v):
        if v is None:
            return v
        if len(v) > MAX_DOCUMENTS:
            raise ValueError(f"Too many documents ({len(v)}), maximum is {MAX_DOCUMENTS}")
        for key, value in v.items():
            if len(key) > MAX_DOC_KEY_LEN:
                raise ValueError(f"Document key '{key[:20]}...' exceeds {MAX_DOC_KEY_LEN} chars")
            if len(value) > MAX_DOC_VALUE_LEN:
                raise ValueError(f"Document '{key}' exceeds {MAX_DOC_VALUE_LEN} chars ({len(value)})")
        return v


@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    """Run the multi-agent verification pipeline on case documents."""
    from agents.orchestrator import PipelineOrchestrator

    orchestrator = PipelineOrchestrator()
    report = await orchestrator.analyze(documents=request.documents, case_id=request.case_id)
    return {"report": report}


@app.get("/health")
async def health():
    return {"status": "ok"}
