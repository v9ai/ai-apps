"""Tests for the _run_agent helper function.

The pipeline uses DeepSeekClient (not a LangChain LLM).  _run_agent builds a
ReAct loop using client.chat(), ChatMessage, and DeepSeek tool_calls.

Validates:
- No-tools path calls client.chat once and returns content
- Tool-equipped path executes tools and iterates
- Error handling wraps exceptions in error strings
- Empty response content is handled gracefully
- tools=None / tools=[] use the no-tools path
"""

import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent.parent / "pypackages" / "deepseek" / "src"))
from deepseek_client.types import ToolCall, ToolCallFunction  # noqa: E402

from research_pipeline import _run_agent


def _make_direct_response(content: str):
    """Build a minimal mock for a chat response with no tool calls."""
    msg = MagicMock()
    msg.content = content
    msg.tool_calls = None
    choice = MagicMock()
    choice.message = msg
    resp = MagicMock()
    resp.choices = [choice]
    return resp


def _make_tool_call_response(tool_name: str, args: str, call_id: str = "call_1"):
    """Build a mock response that contains one tool call (using proper ToolCall pydantic model)."""
    tc = ToolCall(id=call_id, function=ToolCallFunction(name=tool_name, arguments=args))

    msg = MagicMock()
    msg.content = ""
    msg.tool_calls = [tc]

    choice = MagicMock()
    choice.message = msg
    resp = MagicMock()
    resp.choices = [choice]
    return resp


# ── No-tools path ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_no_tools_path_returns_content():
    """Without tools, _run_agent calls client.chat once and returns content."""
    mock_client = AsyncMock()
    mock_client.chat.return_value = _make_direct_response("Direct response")

    result = await _run_agent(mock_client, "You are a bio writer", "Write a bio")

    assert result == "Direct response"
    mock_client.chat.assert_called_once()


@pytest.mark.asyncio
async def test_no_tools_path_passes_system_and_user_messages():
    """_run_agent passes system prompt as SystemMessage and task as HumanMessage."""
    mock_client = AsyncMock()
    mock_client.chat.return_value = _make_direct_response("ok")

    await _run_agent(mock_client, "System prompt here", "Task prompt here")

    call_args = mock_client.chat.call_args
    messages = call_args[0][0]  # first positional arg
    assert len(messages) == 2
    assert messages[0].role == "system"
    assert messages[0].content == "System prompt here"
    assert messages[1].role == "user"
    assert messages[1].content == "Task prompt here"


# ── Error handling ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_exception_returns_error_string():
    """Exceptions are caught and returned as error strings."""
    mock_client = AsyncMock()
    mock_client.chat.side_effect = ConnectionError("Network unreachable")

    result = await _run_agent(mock_client, "System", "Task")

    assert "agent error" in result.lower()
    assert "Network unreachable" in result


@pytest.mark.asyncio
async def test_error_string_is_non_empty():
    """Error strings always have content."""
    mock_client = AsyncMock()
    mock_client.chat.side_effect = RuntimeError("Timeout")

    result = await _run_agent(mock_client, "S", "T")
    assert len(result) > 0


# ── tools=None / tools=[] use no-tools path ───────────────────────────────


@pytest.mark.asyncio
async def test_none_tools_uses_no_tools_path():
    """Passing tools=None triggers the no-tools (direct chat) path."""
    mock_client = AsyncMock()
    mock_client.chat.return_value = _make_direct_response("No tools response")

    result = await _run_agent(mock_client, "S", "T", tools=None)
    assert result == "No tools response"
    mock_client.chat.assert_called_once()


@pytest.mark.asyncio
async def test_empty_tools_list_uses_no_tools_path():
    """Passing tools=[] also triggers the no-tools path."""
    mock_client = AsyncMock()
    mock_client.chat.return_value = _make_direct_response("Empty tools response")

    result = await _run_agent(mock_client, "S", "T", tools=[])
    assert result == "Empty tools response"
    mock_client.chat.assert_called_once()


# ── Empty content ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_empty_response_content():
    """Empty LLM response content is returned as empty string."""
    mock_client = AsyncMock()
    mock_client.chat.return_value = _make_direct_response("")

    result = await _run_agent(mock_client, "S", "T")
    assert result == ""


# ── Tool execution path ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_with_tools_executes_tool_and_returns_final_response():
    """With tools, _run_agent executes the tool call and returns the final answer."""
    mock_client = AsyncMock()

    # First call: returns a tool call; second call: returns final answer
    mock_client.chat.side_effect = [
        _make_tool_call_response("web_search", '{"query": "test query"}'),
        _make_direct_response("Final answer after tool"),
    ]

    mock_tool = MagicMock()

    with patch("research_pipeline._TOOL_FNS", {"web_search": lambda **kw: "search results"}):
        result = await _run_agent(mock_client, "S", "T", tools=[mock_tool])

    assert result == "Final answer after tool"
    assert mock_client.chat.call_count == 2


@pytest.mark.asyncio
async def test_with_tools_handles_unknown_tool_gracefully():
    """Unknown tool calls return a sentinel string rather than raising."""
    mock_client = AsyncMock()

    mock_client.chat.side_effect = [
        _make_tool_call_response("nonexistent_tool", "{}"),
        _make_direct_response("Handled unknown tool"),
    ]

    with patch("research_pipeline._TOOL_FNS", {}):
        result = await _run_agent(mock_client, "S", "T", tools=[MagicMock()])

    assert isinstance(result, str)
    assert len(result) > 0
