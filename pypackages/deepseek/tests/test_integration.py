"""Integration tests — hit the live DeepSeek API.

Run:  uv run --extra test pytest -m integration
Skip: runs automatically when DEEPSEEK_API_KEY is unset.
"""

import json

import pytest

from deepseek_client import (
    ChatMessage,
    DeepSeekClient,
    DeepSeekConfig,
    DEEPSEEK_MODELS,
    chat,
)

pytestmark = pytest.mark.integration


# ── Fixtures ─────────────────────────────────────────────────────────


@pytest.fixture
async def client():
    cfg = DeepSeekConfig(timeout=120.0)
    async with DeepSeekClient(cfg) as c:
        yield c


# ── Chat ─────────────────────────────────────────────────────────────


async def test_chat_basic(client: DeepSeekClient):
    resp = await client.chat(
        [ChatMessage(role="user", content="Reply with exactly: pong")],
        max_tokens=16,
        temperature=0,
    )
    assert len(resp.choices) == 1
    assert "pong" in resp.choices[0].message.content.lower()
    assert resp.usage.total_tokens > 0


async def test_chat_with_system_prompt(client: DeepSeekClient):
    resp = await client.chat(
        [
            ChatMessage(role="system", content="You only answer in uppercase."),
            ChatMessage(role="user", content="Say hello"),
        ],
        max_tokens=32,
        temperature=0,
    )
    text = resp.choices[0].message.content.strip()
    assert text == text.upper()


async def test_chat_simple(client: DeepSeekClient):
    text = await client.chat_simple(
        "What is 2+2? Reply with just the number.",
        temperature=0,
        max_tokens=8,
    )
    assert "4" in text


async def test_chat_json_mode(client: DeepSeekClient):
    resp = await client.chat(
        [ChatMessage(role="user", content='Return a JSON object with key "color" and value "blue".')],
        response_format={"type": "json_object"},
        max_tokens=32,
        temperature=0,
    )
    data = json.loads(resp.choices[0].message.content)
    assert data["color"] == "blue"


# ── Streaming ────────────────────────────────────────────────────────


async def test_chat_stream(client: DeepSeekClient):
    chunks = []
    async for chunk in client.chat_stream(
        [ChatMessage(role="user", content="Count from 1 to 3.")],
        max_tokens=32,
        temperature=0,
    ):
        chunks.append(chunk)

    assert len(chunks) > 0
    text = "".join(c.choices[0].delta.content or "" for c in chunks)
    assert "1" in text and "3" in text


# ── Reasoner ─────────────────────────────────────────────────────────


async def test_reasoner_model(client: DeepSeekClient):
    resp = await client.chat(
        [ChatMessage(role="user", content="What is 15 * 17? Reply with just the number.")],
        model=DEEPSEEK_MODELS.REASONER,
        max_tokens=128,
    )
    assert "255" in resp.choices[0].message.content


# ── Tool calling ─────────────────────────────────────────────────────


async def test_tool_calling(client: DeepSeekClient):
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get the current weather for a city",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "city": {"type": "string", "description": "City name"},
                    },
                    "required": ["city"],
                },
            },
        }
    ]

    resp = await client.chat(
        [ChatMessage(role="user", content="What's the weather in London?")],
        tools=tools,
        tool_choice="auto",
        max_tokens=64,
        temperature=0,
    )

    choice = resp.choices[0]
    assert choice.finish_reason == "tool_calls"
    assert choice.message.tool_calls is not None
    assert len(choice.message.tool_calls) > 0

    call = choice.message.tool_calls[0]
    assert call.function.name == "get_weather"
    args = json.loads(call.function.arguments)
    assert "london" in args["city"].lower()


# ── Top-level helper ─────────────────────────────────────────────────


async def test_top_level_chat():
    text = await chat("Say 'hi'.", max_tokens=8, temperature=0)
    assert "hi" in text.lower()


# ── Config ───────────────────────────────────────────────────────────


async def test_custom_config():
    cfg = DeepSeekConfig(default_model=DEEPSEEK_MODELS.CHAT, timeout=30.0)
    async with DeepSeekClient(cfg) as client:
        text = await client.chat_simple("Reply with 'ok'.", max_tokens=8, temperature=0)
        assert "ok" in text.lower()


# ── Error handling ───────────────────────────────────────────────────


async def test_invalid_api_key():
    cfg = DeepSeekConfig(api_key="sk-invalid-key-for-testing")
    async with DeepSeekClient(cfg) as client:
        with pytest.raises(Exception):
            await client.chat(
                [ChatMessage(role="user", content="hello")],
                max_tokens=8,
            )
