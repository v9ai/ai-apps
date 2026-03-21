"""Tests for the _run_agent helper function.

Validates:
- LLM-only path (no tools) invokes ainvoke with correct messages
- Tool-equipped path creates a react agent and runs it
- Error handling wraps exceptions in error strings
- System prompt and task are passed correctly
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from crew import _run_agent


@pytest.mark.asyncio
async def test_no_tools_path_invokes_llm():
    """Without tools, _run_agent calls llm.ainvoke with SystemMessage + HumanMessage."""
    mock_llm = AsyncMock()
    mock_response = MagicMock()
    mock_response.content = "Direct LLM response"
    mock_llm.ainvoke.return_value = mock_response

    result = await _run_agent(mock_llm, "You are a bio writer", "Write a bio for X")

    assert result == "Direct LLM response"
    args = mock_llm.ainvoke.call_args[0][0]
    assert len(args) == 2
    assert args[0].content == "You are a bio writer"
    assert args[1].content == "Write a bio for X"


@pytest.mark.asyncio
async def test_with_tools_path_creates_react_agent():
    """With tools, _run_agent creates a react agent via create_react_agent."""
    mock_llm = MagicMock()
    mock_tool = MagicMock()
    mock_tool.name = "test_tool"

    mock_agent = AsyncMock()
    mock_agent.ainvoke.return_value = {
        "messages": [MagicMock(content="Agent with tools response")]
    }

    with patch("crew.create_react_agent", return_value=mock_agent) as mock_create:
        result = await _run_agent(mock_llm, "System prompt", "Task prompt", [mock_tool])

    assert result == "Agent with tools response"
    mock_create.assert_called_once_with(mock_llm, [mock_tool], prompt="System prompt")
    mock_agent.ainvoke.assert_called_once()


@pytest.mark.asyncio
async def test_error_returns_error_string():
    """Exceptions are caught and returned as error strings."""
    mock_llm = AsyncMock()
    mock_llm.ainvoke.side_effect = ConnectionError("Network unreachable")

    result = await _run_agent(mock_llm, "System", "Task")

    assert "agent error" in result.lower()
    assert "Network unreachable" in result


@pytest.mark.asyncio
async def test_tool_agent_error_returns_error_string():
    """Exceptions in tool-equipped agents are caught gracefully."""
    mock_llm = MagicMock()
    mock_tool = MagicMock()

    with patch("crew.create_react_agent", side_effect=ValueError("Bad tool config")):
        result = await _run_agent(mock_llm, "System", "Task", [mock_tool])

    assert "agent error" in result.lower()
    assert "Bad tool config" in result


@pytest.mark.asyncio
async def test_empty_response_content():
    """Empty LLM response content is returned as-is."""
    mock_llm = AsyncMock()
    mock_response = MagicMock()
    mock_response.content = ""
    mock_llm.ainvoke.return_value = mock_response

    result = await _run_agent(mock_llm, "System", "Task")
    assert result == ""


@pytest.mark.asyncio
async def test_none_tools_treated_as_no_tools():
    """Passing tools=None uses the LLM-only path."""
    mock_llm = AsyncMock()
    mock_response = MagicMock()
    mock_response.content = "No tools response"
    mock_llm.ainvoke.return_value = mock_response

    result = await _run_agent(mock_llm, "System", "Task", tools=None)
    assert result == "No tools response"
    mock_llm.ainvoke.assert_called_once()


@pytest.mark.asyncio
async def test_empty_tools_list_treated_as_no_tools():
    """Passing tools=[] uses the LLM-only path."""
    mock_llm = AsyncMock()
    mock_response = MagicMock()
    mock_response.content = "Empty tools response"
    mock_llm.ainvoke.return_value = mock_response

    result = await _run_agent(mock_llm, "System", "Task", tools=[])
    assert result == "Empty tools response"
    mock_llm.ainvoke.assert_called_once()
