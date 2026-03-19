"""LangGraph TTS graph — synthesizes audio from story text via Qwen or OpenAI TTS."""
from __future__ import annotations

import asyncio
import io
import os
import struct
import uuid
from datetime import datetime, timezone
from typing import Optional, TypedDict

import boto3
import httpx
import psycopg

from dotenv import load_dotenv
from pathlib import Path
from langgraph.graph import StateGraph, START, END

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

QWEN_MAX_CHARS = 500
OPENAI_MAX_CHARS = 4000
WAV_HEADER_SIZE = 44
DASHSCOPE_URL = "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"

DEFAULT_TTS_INSTRUCTIONS = (
    "Speak in a calm, warm, and gentle therapeutic voice. "
    "Pace yourself slowly and deliberately. "
    "Pause naturally at sentence boundaries and after pause cues. "
    "Use a soothing, reassuring tone throughout."
)


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

class TTSState(TypedDict, total=False):
    story_id: int
    language: Optional[str]
    voice: Optional[str]
    instructions: Optional[str]
    user_email: Optional[str]
    # outputs
    audio_url: str
    audio_key: str
    error: str
    # internal
    _text: str
    _voice: str
    _model: str
    _is_qwen: bool
    _chunks: list[str]
    _audio_bytes: bytes


# ---------------------------------------------------------------------------
# Text chunking (ported from crates/tts/src/split.rs)
# ---------------------------------------------------------------------------

def _split_sentences(text: str) -> list[str]:
    sentences: list[str] = []
    current = ""
    for ch in text:
        current += ch
        if ch in ".!?":
            sentences.append(current)
            current = ""
    if current.strip():
        sentences.append(current)
    return sentences


def _hard_split(text: str, max_chars: int) -> list[str]:
    words = text.split()
    chunks: list[str] = []
    current = ""
    for word in words:
        sep = 1 if current else 0
        if len(current) + sep + len(word) > max_chars and current:
            chunks.append(current)
            current = ""
        current = f"{current} {word}" if current else word
    if current:
        chunks.append(current)
    return chunks


def chunk_text(text: str, max_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    sentences = _split_sentences(text)
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        trimmed = sentence.strip()
        if not trimmed:
            continue
        if len(trimmed) > max_chars:
            if current:
                chunks.append(current.strip())
                current = ""
            chunks.extend(_hard_split(trimmed, max_chars))
            continue
        sep = 1 if current else 0
        if len(current) + sep + len(trimmed) > max_chars and current:
            chunks.append(current.strip())
            current = ""
        current = f"{current} {trimmed}" if current else trimmed
    if current.strip():
        chunks.append(current.strip())
    return chunks or [text]


def _strip_markdown(text: str) -> str:
    import re
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text, flags=re.DOTALL)
    text = re.sub(r"\*(.+?)\*", r"\1", text, flags=re.DOTALL)
    text = re.sub(r"__(.+?)__", r"\1", text, flags=re.DOTALL)
    text = re.sub(r"_(.+?)_", r"\1", text, flags=re.DOTALL)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ---------------------------------------------------------------------------
# TTS API calls
# ---------------------------------------------------------------------------

async def _synthesize_qwen(client: httpx.AsyncClient, text: str, voice: str, model: str, instructions: str | None) -> bytes:
    api_key = os.environ.get("DASHSCOPE_API_KEY", "")
    body: dict = {
        "model": model,
        "input": {"text": text, "voice": voice},
    }
    if instructions:
        body["input"]["instructions"] = instructions
        body["parameters"] = {"optimize_instructions": True}

    resp = await client.post(
        DASHSCOPE_URL,
        json=body,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()

    audio_url = data.get("output", {}).get("audio", {}).get("url")
    if audio_url:
        audio_resp = await client.get(audio_url, timeout=60)
        audio_resp.raise_for_status()
        return audio_resp.content

    audio_data = data.get("output", {}).get("audio", {}).get("data")
    if audio_data:
        import base64
        return base64.b64decode(audio_data)

    raise ValueError("DashScope returned no audio URL or data")


async def _synthesize_openai(client: httpx.AsyncClient, text: str, voice: str, model: str, instructions: str | None) -> bytes:
    api_key = os.environ.get("OPENAI_API_KEY", "")
    body: dict = {
        "model": model,
        "input": text,
        "voice": voice,
        "response_format": "mp3",
    }
    if instructions:
        body["instructions"] = instructions

    resp = await client.post(
        "https://api.openai.com/v1/audio/speech",
        json=body,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        timeout=120,
    )
    resp.raise_for_status()
    return resp.content


# ---------------------------------------------------------------------------
# Audio merging
# ---------------------------------------------------------------------------

def _merge_wav(buffers: list[bytes]) -> bytes:
    if len(buffers) == 1:
        return buffers[0]
    parts = [buffers[0]]
    for buf in buffers[1:]:
        parts.append(buf[WAV_HEADER_SIZE:] if len(buf) > WAV_HEADER_SIZE else buf)
    combined = b"".join(parts)
    if len(combined) > WAV_HEADER_SIZE:
        ba = bytearray(combined)
        struct.pack_into("<I", ba, 4, len(ba) - 8)
        struct.pack_into("<I", ba, 40, len(ba) - WAV_HEADER_SIZE)
        combined = bytes(ba)
    return combined


def _strip_id3v2(buf: bytes) -> bytes:
    if len(buf) >= 10 and buf[:3] == b"ID3":
        size = ((buf[6] & 0x7F) << 21) | ((buf[7] & 0x7F) << 14) | ((buf[8] & 0x7F) << 7) | (buf[9] & 0x7F)
        return buf[10 + size:]
    return buf


def _merge_mp3(buffers: list[bytes]) -> bytes:
    if len(buffers) == 1:
        return buffers[0]
    return buffers[0] + b"".join(_strip_id3v2(b) for b in buffers[1:])


# ---------------------------------------------------------------------------
# R2 upload
# ---------------------------------------------------------------------------

def _upload_to_r2(audio: bytes, content_type: str, ext: str) -> tuple[str, str]:
    account_id = os.environ["R2_ACCOUNT_ID"]
    access_key = os.environ["R2_ACCESS_KEY_ID"]
    secret_key = os.environ["R2_SECRET_ACCESS_KEY"]
    bucket = os.environ.get("R2_BUCKET_NAME", "longform-tts")
    public_domain = os.environ.get("R2_PUBLIC_DOMAIN", "")

    s3 = boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="auto",
    )
    key = f"graphql-tts/{uuid.uuid4()}.{ext}"
    s3.upload_fileobj(
        io.BytesIO(audio),
        bucket,
        key,
        ExtraArgs={"ContentType": content_type},
    )
    public_url = f"{public_domain}/{key}" if public_domain else key
    return key, public_url


# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------

def _conn_str() -> str:
    return os.environ.get("NEON_DATABASE_URL", "")


async def load_story(state: TTSState) -> dict:
    story_id = state.get("story_id")
    if not story_id:
        return {"error": "story_id is required"}

    try:
        async with await psycopg.AsyncConnection.connect(_conn_str()) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT content, language FROM stories WHERE id = %s", (story_id,)
                )
                row = await cur.fetchone()
                if not row:
                    return {"error": f"Story {story_id} not found"}
                text, lang = row
    except Exception as exc:
        return {"error": f"load_story failed: {exc}"}

    language = state.get("language") or lang or "English"
    is_romanian = language.lower() == "romanian"
    is_qwen = not is_romanian

    if is_qwen:
        voice = state.get("voice") or "cherry"
        instructions = state.get("instructions") or DEFAULT_TTS_INSTRUCTIONS
        model = "qwen3-tts-instruct-flash" if instructions else "qwen3-tts-flash"
    else:
        voice = state.get("voice") or "onyx"
        model = "gpt-4o-mini-tts"
        instructions = state.get("instructions") or DEFAULT_TTS_INSTRUCTIONS

    clean_text = _strip_markdown(text or "")
    max_chars = QWEN_MAX_CHARS if is_qwen else OPENAI_MAX_CHARS
    chunks = chunk_text(clean_text, max_chars)

    return {
        "_text": clean_text,
        "_voice": voice,
        "_model": model,
        "_is_qwen": is_qwen,
        "_chunks": chunks,
        "instructions": instructions,
    }


async def synthesize(state: dict) -> dict:
    if state.get("error"):
        return {}

    chunks: list[str] = state.get("_chunks", [])
    voice: str = state.get("_voice", "cherry")
    model: str = state.get("_model", "qwen3-tts-instruct-flash")
    is_qwen: bool = state.get("_is_qwen", True)
    instructions: str | None = state.get("instructions")

    concurrency = 3 if is_qwen else 5
    async with httpx.AsyncClient() as client:
        sem = asyncio.Semaphore(concurrency)

        async def synth_one(chunk: str) -> bytes:
            async with sem:
                for attempt in range(3):
                    try:
                        if is_qwen:
                            return await _synthesize_qwen(client, chunk, voice, model, instructions)
                        else:
                            return await _synthesize_openai(client, chunk, voice, model, instructions)
                    except httpx.HTTPStatusError as e:
                        if e.response.status_code == 429 and attempt < 2:
                            await asyncio.sleep(2 ** attempt)
                            continue
                        raise
                raise RuntimeError("unreachable")

        try:
            buffers = await asyncio.gather(*[synth_one(c) for c in chunks])
        except Exception as exc:
            return {"error": f"synthesize failed: {exc}"}

    if is_qwen:
        audio = _merge_wav(list(buffers))
    else:
        audio = _merge_mp3(list(buffers))

    return {"_audio_bytes": audio}


async def upload_and_save(state: dict) -> dict:
    if state.get("error") or not state.get("_audio_bytes"):
        return {}

    audio: bytes = state["_audio_bytes"]
    is_qwen: bool = state.get("_is_qwen", True)
    story_id = state.get("story_id")
    ext = "wav" if is_qwen else "mp3"
    content_type = f"audio/{ext}"

    try:
        key, public_url = _upload_to_r2(audio, content_type, ext)
    except Exception as exc:
        return {"error": f"R2 upload failed: {exc}"}

    if story_id:
        try:
            now = datetime.now(timezone.utc).isoformat()
            async with await psycopg.AsyncConnection.connect(_conn_str()) as conn:
                async with conn.cursor() as cur:
                    await cur.execute(
                        "UPDATE stories SET audio_key = %s, audio_url = %s, audio_generated_at = %s, updated_at = %s WHERE id = %s",
                        (key, public_url, now, now, story_id),
                    )
        except Exception as exc:
            return {"error": f"DB update failed: {exc}"}

    return {"audio_url": public_url, "audio_key": key}


# ---------------------------------------------------------------------------
# Graph
# ---------------------------------------------------------------------------

def create_tts_graph():
    builder = StateGraph(TTSState)
    builder.add_node("load_story", load_story)
    builder.add_node("synthesize", synthesize)
    builder.add_node("upload_and_save", upload_and_save)

    builder.add_edge(START, "load_story")
    builder.add_edge("load_story", "synthesize")
    builder.add_edge("synthesize", "upload_and_save")
    builder.add_edge("upload_and_save", END)

    return builder.compile()


graph = create_tts_graph()
