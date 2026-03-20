"""AI investment advisor chat backed by CrewAI."""

import json
import uuid
import logging
import asyncio
from datetime import datetime, timezone
from pydantic import BaseModel
import psycopg
from psycopg.rows import dict_row
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from crewai import Agent as CrewAgent, Task, Crew, LLM
from crewai.tools import tool
from .config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: str | None = None


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str
    context_urls: list[str] = []


class ChatResponse(BaseModel):
    session_id: str
    message: ChatMessage
    context_used: list[str] = []


# ---------------------------------------------------------------------------
# SQL schema
# ---------------------------------------------------------------------------

CREATE_CHAT_SESSIONS = """
CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    messages JSONB DEFAULT '[]'::jsonb,
    context_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _conn(conn_str: str):
    return await psycopg.AsyncConnection.connect(conn_str, row_factory=dict_row)


async def init_chat_tables(conn_str: str):
    """Create chat_sessions table if it doesn't exist."""
    async with await _conn(conn_str) as conn:
        await conn.execute(CREATE_CHAT_SESSIONS)
        await conn.commit()


# ---------------------------------------------------------------------------
# Tools for the advisor agent
# ---------------------------------------------------------------------------

@tool
def lookup_analysis(url: str) -> str:
    """Look up a saved analysis for a listing URL. Returns key metrics."""
    async def _fetch():
        async with await _conn(settings.database_url) as conn:
            cursor = await conn.execute(
                """SELECT url, title, city, zone, price_eur, price_per_m2, size_m2, rooms,
                          verdict, investment_score, price_deviation_pct, rental_estimate_eur,
                          rental_yield_pct, recommendation, condition, reasoning
                   FROM listings WHERE url = %s""",
                (url,),
            )
            return await cursor.fetchone()

    row = asyncio.get_event_loop().run_until_complete(_fetch())
    if not row:
        return f"No analysis found for {url}"
    return json.dumps({k: v for k, v in dict(row).items() if v is not None}, default=str)


@tool
def get_zone_stats(city: str, zone: str) -> str:
    """Get aggregate statistics for a specific zone."""
    async def _fetch():
        async with await _conn(settings.database_url) as conn:
            cursor = await conn.execute(
                """SELECT zone, COUNT(*) as count, AVG(price_per_m2) as avg_ppm2,
                          AVG(investment_score) as avg_score, AVG(price_deviation_pct) as avg_dev
                   FROM listings WHERE city = %s AND zone = %s AND price_per_m2 IS NOT NULL
                   GROUP BY zone""",
                (city, zone),
            )
            return await cursor.fetchone()

    row = asyncio.get_event_loop().run_until_complete(_fetch())
    if not row:
        return f"No data for {zone} in {city}"
    return json.dumps(dict(row), default=str)


@tool
def get_portfolio_summary() -> str:
    """Get a summary of the user's watchlist/portfolio."""
    async def _fetch():
        async with await _conn(settings.database_url) as conn:
            cursor = await conn.execute("""
                SELECT w.url, w.label, w.city, w.zone, w.price_eur, w.verdict,
                       w.investment_score, l.rental_yield_pct
                FROM watchlist w
                LEFT JOIN listings l ON l.url = w.url
                ORDER BY w.added_at DESC LIMIT 20
            """)
            return await cursor.fetchall()

    rows = asyncio.get_event_loop().run_until_complete(_fetch())
    if not rows:
        return "Portfolio is empty"
    return json.dumps([dict(r) for r in rows], default=str)


@tool
def compare_listings(url1: str, url2: str) -> str:
    """Compare two analyzed listings side by side."""
    async def _fetch():
        async with await _conn(settings.database_url) as conn:
            cursor = await conn.execute(
                """SELECT url, title, city, zone, price_eur, price_per_m2, size_m2,
                          verdict, investment_score, rental_yield_pct, recommendation
                   FROM listings WHERE url IN (%s, %s)""",
                (url1, url2),
            )
            return await cursor.fetchall()

    rows = asyncio.get_event_loop().run_until_complete(_fetch())
    if len(rows) < 2:
        return "Could not find both listings"
    return json.dumps([dict(r) for r in rows], default=str)


# ---------------------------------------------------------------------------
# Advisor Agent
# ---------------------------------------------------------------------------

def _build_advisor_llm() -> LLM:
    return LLM(
        model="openai/deepseek-chat",
        api_key=settings.deepseek_api_key,
        base_url="https://api.deepseek.com/v1",
    )


ADVISOR_BACKSTORY = """You are an expert real estate investment advisor for Eastern European markets.
You help investors make buy/hold/sell decisions using data from analyzed listings.
You have access to tools that can look up specific listing analyses, compare listings,
check zone statistics, and review the user's portfolio.
Always back your advice with specific data from the tools.
Be concise but thorough. Use numbers and percentages to support your points."""


async def handle_chat(req: ChatRequest) -> ChatResponse:
    """Process a chat message and return the advisor's response."""
    session_id = req.session_id or str(uuid.uuid4())

    # Build context from URLs if provided
    context = ""
    if req.context_urls:
        for url in req.context_urls[:3]:
            result = lookup_analysis.run(url)
            context += f"\nContext for {url}:\n{result}\n"

    full_prompt = req.message
    if context:
        full_prompt = f"User has these listings in context:\n{context}\n\nUser question: {req.message}"

    agent = CrewAgent(
        role="Real Estate Investment Advisor",
        goal="Provide data-backed investment advice for Eastern European property markets",
        backstory=ADVISOR_BACKSTORY,
        llm=_build_advisor_llm(),
        tools=[lookup_analysis, get_zone_stats, get_portfolio_summary, compare_listings],
        verbose=False,
    )

    task = Task(
        description=full_prompt,
        expected_output="Clear, actionable investment advice backed by data from the tools",
        agent=agent,
    )

    crew = Crew(agents=[agent], tasks=[task], verbose=False)
    result = await asyncio.to_thread(crew.kickoff)

    assistant_msg = ChatMessage(
        role="assistant",
        content=result.raw,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

    # Save to DB
    try:
        now = datetime.now(timezone.utc)
        user_msg = {"role": "user", "content": req.message, "timestamp": now.isoformat()}
        assistant_dict = assistant_msg.model_dump()
        new_messages = json.dumps([user_msg, assistant_dict])

        async with await _conn(settings.database_url) as conn:
            await conn.execute("""
                INSERT INTO chat_sessions (id, messages, context_urls, created_at, updated_at)
                VALUES (%s, %s::jsonb, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    messages = chat_sessions.messages || %s::jsonb,
                    context_urls = %s,
                    updated_at = %s
            """, (
                session_id,
                new_messages,
                req.context_urls,
                now,
                now,
                new_messages,
                req.context_urls,
                now,
            ))
            await conn.commit()
    except Exception as e:
        logger.warning("Failed to save chat session: %s", e)

    return ChatResponse(
        session_id=session_id,
        message=assistant_msg,
        context_used=req.context_urls,
    )


# ---------------------------------------------------------------------------
# FastAPI router
# ---------------------------------------------------------------------------

chat_router = APIRouter(tags=["chat"])


@chat_router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    return await handle_chat(req)


@chat_router.get("/chat/{session_id}")
async def get_session(session_id: str):
    async with await _conn(settings.database_url) as conn:
        cursor = await conn.execute(
            "SELECT * FROM chat_sessions WHERE id = %s", (session_id,)
        )
        row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "Session not found")
    return row
