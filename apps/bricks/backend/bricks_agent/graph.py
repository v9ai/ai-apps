"""LangGraph pipeline — analyzes YouTube LEGO videos and extracts building instructions."""

from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph

from .state import BricksState
from .youtube import extract_video_id, fetch_transcript, fetch_video_metadata

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model="deepseek-chat",
        api_key=os.environ.get("DEEPSEEK_API_KEY", ""),
        base_url="https://api.deepseek.com/v1",
        temperature=0.2,
    )


def _parse_json(text: str) -> dict | list:
    """Extract JSON from LLM response, handling markdown code fences."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]  # skip ```json
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    return json.loads(text)


# ── Node 1: Fetch video info + transcript ─────────────────────────────────


async def fetch_video_info(state: BricksState) -> dict:
    url = state.get("youtube_url", "")
    if not url:
        return {"error": "youtube_url is required"}
    try:
        video_info = await fetch_video_metadata(url)
        video_id = video_info["video_id"]
        transcript = fetch_transcript(video_id)
        return {"video_info": video_info, "transcript": transcript}
    except Exception as exc:
        return {"error": f"Failed to fetch video info: {exc}"}


# ── Node 2: Analyze transcript ────────────────────────────────────────────


async def analyze_transcript(state: BricksState) -> dict:
    if state.get("error"):
        return {}
    transcript = state.get("transcript", "")
    video_info = state.get("video_info", {})
    title = video_info.get("title", "Unknown")

    llm = _get_llm()
    resp = await llm.ainvoke(
        [
            {
                "role": "system",
                "content": (
                    "You are a LEGO building expert. Analyze the transcript of a LEGO building video "
                    "and extract what is being built and the raw building steps mentioned. "
                    "Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Video title: {title}\n\n"
                    f"Transcript:\n{transcript[:8000]}\n\n"
                    "Return JSON with this structure:\n"
                    '{"model_name": "name of the LEGO model", '
                    '"model_type": "car/robot/crane/building/etc", '
                    '"raw_steps": ["step 1 description", "step 2 description", ...]}'
                ),
            },
        ],
        response_format={"type": "json_object"},
    )
    analysis = _parse_json(resp.content)
    return {"analysis": analysis}


# ── Node 3: Extract parts list ────────────────────────────────────────────


async def extract_parts(state: BricksState) -> dict:
    if state.get("error"):
        return {}
    analysis = state.get("analysis", {})
    transcript = state.get("transcript", "")

    llm = _get_llm()
    resp = await llm.ainvoke(
        [
            {
                "role": "system",
                "content": (
                    "You are a LEGO parts expert. Given a building analysis and transcript, "
                    "identify all LEGO bricks and pieces needed. Be specific about colors and quantities. "
                    "Use standard LEGO terminology. Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Model: {analysis.get('model_name', 'Unknown')}\n"
                    f"Type: {analysis.get('model_type', 'Unknown')}\n"
                    f"Steps: {json.dumps(analysis.get('raw_steps', []))}\n\n"
                    f"Transcript excerpt:\n{transcript[:4000]}\n\n"
                    "Return JSON with this structure:\n"
                    '{"parts": [{"name": "2x4 Brick", "quantity": 4, "color": "Red", "part_number": "3001"}, ...]}'
                ),
            },
        ],
        response_format={"type": "json_object"},
    )
    data = _parse_json(resp.content)
    return {"parts_list": data.get("parts", data if isinstance(data, list) else [])}


# ── Node 4: Structure building steps ──────────────────────────────────────


async def structure_steps(state: BricksState) -> dict:
    if state.get("error"):
        return {}
    analysis = state.get("analysis", {})
    parts_list = state.get("parts_list", [])

    llm = _get_llm()
    resp = await llm.ainvoke(
        [
            {
                "role": "system",
                "content": (
                    "You are a LEGO instruction designer. Create clear, numbered building steps "
                    "from the raw analysis. Each step should reference which parts are used. "
                    "Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Model: {analysis.get('model_name', 'Unknown')}\n"
                    f"Raw steps: {json.dumps(analysis.get('raw_steps', []))}\n"
                    f"Available parts: {json.dumps(parts_list[:30])}\n\n"
                    "Return JSON with this structure:\n"
                    '{"steps": [{"step_number": 1, "description": "...", '
                    '"parts_used": ["2x4 Brick (Red) x2", ...], "notes": "..."}, ...]}'
                ),
            },
        ],
        response_format={"type": "json_object"},
    )
    data = _parse_json(resp.content)
    return {"building_steps": data.get("steps", data if isinstance(data, list) else [])}


# ── Node 5: Generate build scheme ─────────────────────────────────────────


async def generate_scheme(state: BricksState) -> dict:
    if state.get("error"):
        return {}
    analysis = state.get("analysis", {})
    building_steps = state.get("building_steps", [])

    llm = _get_llm()
    resp = await llm.ainvoke(
        [
            {
                "role": "system",
                "content": (
                    "You are a LEGO build planner. Create a high-level build scheme that groups "
                    "the building steps into logical phases. Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Model: {analysis.get('model_name', 'Unknown')} ({analysis.get('model_type', '')})\n"
                    f"Total steps: {len(building_steps)}\n"
                    f"Steps: {json.dumps(building_steps[:20])}\n\n"
                    "Return JSON with this structure:\n"
                    '{"phases": [{"name": "Phase name", "description": "...", '
                    '"step_range": [1, 5]}, ...], '
                    '"summary": "Overall build description in 2-3 sentences"}'
                ),
            },
        ],
        response_format={"type": "json_object"},
    )
    data = _parse_json(resp.content)
    return {"scheme": data}


# ── Graph wiring ──────────────────────────────────────────────────────────


def create_bricks_graph():
    builder = StateGraph(BricksState)
    builder.add_node("fetch_video_info", fetch_video_info)
    builder.add_node("analyze_transcript", analyze_transcript)
    builder.add_node("extract_parts", extract_parts)
    builder.add_node("structure_steps", structure_steps)
    builder.add_node("generate_scheme", generate_scheme)

    builder.add_edge(START, "fetch_video_info")
    builder.add_edge("fetch_video_info", "analyze_transcript")
    builder.add_edge("analyze_transcript", "extract_parts")
    builder.add_edge("extract_parts", "structure_steps")
    builder.add_edge("structure_steps", "generate_scheme")
    builder.add_edge("generate_scheme", END)

    return builder.compile()


graph = create_bricks_graph()
