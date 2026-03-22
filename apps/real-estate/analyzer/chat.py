"""AI investment advisor chat."""

import json
import uuid
import logging
import asyncio
from datetime import datetime, timezone
from pydantic import BaseModel
import httpx
import psycopg
from psycopg.rows import dict_row
from fastapi import APIRouter, HTTPException
from .config import settings

logger = logging.getLogger(__name__)

_DEEPSEEK_BASE = "https://api.deepseek.com/v1"


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
# Tool implementations (async)
# ---------------------------------------------------------------------------

async def _lookup_analysis(url: str) -> str:
    """Look up a saved analysis for a listing URL."""
    async with await _conn(settings.database_url) as conn:
        cursor = await conn.execute(
            """SELECT url, title, city, zone, price_eur, price_per_m2, size_m2, rooms,
                      verdict, investment_score, price_deviation_pct, rental_estimate_eur,
                      rental_yield_pct, recommendation, condition, reasoning
               FROM listings WHERE url = %s""",
            (url,),
        )
        row = await cursor.fetchone()
    if not row:
        return f"No analysis found for {url}"
    return json.dumps({k: v for k, v in dict(row).items() if v is not None}, default=str)


async def _get_zone_stats(city: str, zone: str) -> str:
    """Get aggregate statistics for a specific zone."""
    async with await _conn(settings.database_url) as conn:
        cursor = await conn.execute(
            """SELECT zone, COUNT(*) as count, AVG(price_per_m2) as avg_ppm2,
                      AVG(investment_score) as avg_score, AVG(price_deviation_pct) as avg_dev
               FROM listings WHERE city = %s AND zone = %s AND price_per_m2 IS NOT NULL
               GROUP BY zone""",
            (city, zone),
        )
        row = await cursor.fetchone()
    if not row:
        return f"No data for {zone} in {city}"
    return json.dumps(dict(row), default=str)


async def _get_portfolio_summary() -> str:
    """Get a summary of the user's watchlist/portfolio."""
    async with await _conn(settings.database_url) as conn:
        cursor = await conn.execute("""
            SELECT w.url, w.label, w.city, w.zone, w.price_eur, w.verdict,
                   w.investment_score, l.rental_yield_pct
            FROM watchlist w
            LEFT JOIN listings l ON l.url = w.url
            ORDER BY w.added_at DESC LIMIT 20
        """)
        rows = await cursor.fetchall()
    if not rows:
        return "Portfolio is empty"
    return json.dumps([dict(r) for r in rows], default=str)


async def _compare_listings(url1: str, url2: str) -> str:
    """Compare two analyzed listings side by side."""
    async with await _conn(settings.database_url) as conn:
        cursor = await conn.execute(
            """SELECT url, title, city, zone, price_eur, price_per_m2, size_m2,
                      verdict, investment_score, rental_yield_pct, recommendation
               FROM listings WHERE url IN (%s, %s)""",
            (url1, url2),
        )
        rows = await cursor.fetchall()
    if len(rows) < 2:
        return "Could not find both listings"
    return json.dumps([dict(r) for r in rows], default=str)


async def _dispatch_tool(name: str, args: dict) -> str:
    if name == "lookup_analysis":
        return await _lookup_analysis(args["url"])
    if name == "get_zone_stats":
        return await _get_zone_stats(args["city"], args["zone"])
    if name == "get_portfolio_summary":
        return await _get_portfolio_summary()
    if name == "compare_listings":
        return await _compare_listings(args["url1"], args["url2"])
    return f"Unknown tool: {name}"


# ---------------------------------------------------------------------------
# Tool specs for function calling
# ---------------------------------------------------------------------------

_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "lookup_analysis",
            "description": "Look up a saved analysis for a listing URL. Returns key metrics.",
            "parameters": {
                "type": "object",
                "properties": {"url": {"type": "string", "description": "The listing URL"}},
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_zone_stats",
            "description": "Get aggregate statistics for a specific zone.",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string"},
                    "zone": {"type": "string"},
                },
                "required": ["city", "zone"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_portfolio_summary",
            "description": "Get a summary of the user's watchlist/portfolio.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_listings",
            "description": "Compare two analyzed listings side by side.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url1": {"type": "string"},
                    "url2": {"type": "string"},
                },
                "required": ["url1", "url2"],
            },
        },
    },
]


# ---------------------------------------------------------------------------
# Advisor Agent
# ---------------------------------------------------------------------------

ADVISOR_BACKSTORY = """You are an expert real estate investment advisor for Eastern European markets.
You help investors make buy/hold/sell decisions using data from analyzed listings.
You have access to tools that can look up specific listing analyses, compare listings,
check zone statistics, and review the user's portfolio.
Always back your advice with specific data from the tools.
Be concise but thorough. Use numbers and percentages to support your points."""


async def _run_advisor(prompt: str) -> str:
    """Run the advisor with a tool-calling loop."""
    messages: list[dict] = [
        {"role": "system", "content": ADVISOR_BACKSTORY},
        {"role": "user", "content": prompt},
    ]
    async with httpx.AsyncClient(timeout=120) as client:
        for _ in range(10):  # max iterations
            resp = await client.post(
                f"{_DEEPSEEK_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.deepseek_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": messages,
                    "tools": _TOOLS,
                    "tool_choice": "auto",
                },
            )
            resp.raise_for_status()
            choice = resp.json()["choices"][0]
            msg = choice["message"]
            messages.append(msg)

            if choice["finish_reason"] != "tool_calls":
                return msg.get("content") or ""

            for tc in msg.get("tool_calls", []):
                fn = tc["function"]
                args = json.loads(fn.get("arguments", "{}"))
                result = await _dispatch_tool(fn["name"], args)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": result,
                })

    return messages[-1].get("content") or ""


async def handle_chat(req: ChatRequest) -> ChatResponse:
    """Process a chat message and return the advisor's response."""
    session_id = req.session_id or str(uuid.uuid4())

    # Build context from URLs if provided
    context = ""
    if req.context_urls:
        for url in req.context_urls[:3]:
            result = await _lookup_analysis(url)
            context += f"\nContext for {url}:\n{result}\n"

    full_prompt = req.message
    if context:
        full_prompt = f"User has these listings in context:\n{context}\n\nUser question: {req.message}"

    response_text = await _run_advisor(full_prompt)

    assistant_msg = ChatMessage(
        role="assistant",
        content=response_text,
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
