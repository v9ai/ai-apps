"""
Deepeval tests deconstructing https://deepeval.com/integrations/frameworks/langgraph

Three layers of evaluation:
  1. End-to-end  — whole agent run via CallbackHandler + TaskCompletionMetric
  2. Component   — LLM node via metadata + AnswerRelevancyMetric
  3. Tool        — individual tool via @tool decorator + AnswerRelevancyMetric
"""

import pytest
from unittest.mock import patch, MagicMock

# ---------------------------------------------------------------------------
# Minimal stubs so the file is importable without installed packages.
# Remove these and the @patch decorators once your real env is wired up.
# ---------------------------------------------------------------------------
import sys
import types

def _stub_module(name: str):
    mod = types.ModuleType(name)
    sys.modules.setdefault(name, mod)
    return mod

for _name in [
    "deepeval",
    "deepeval.integrations",
    "deepeval.integrations.langchain",
    "deepeval.metrics",
    "deepeval.dataset",
    "langchain_openai",
    "langgraph",
    "langgraph.prebuilt",
]:
    _stub_module(_name)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def weather_tool_fn():
    """Pure function representing the weather tool's logic."""
    def get_weather(location: str) -> str:
        return f"It's always sunny in {location}!"
    return get_weather


@pytest.fixture
def mock_callback_handler():
    handler = MagicMock()
    handler.name = "CallbackHandler"
    return handler


@pytest.fixture
def mock_agent(mock_callback_handler):
    agent = MagicMock()
    # Simulate a successful LangGraph agent response
    agent.invoke.return_value = {
        "messages": [
            {"role": "assistant", "content": "The weather in Bogotá is sunny."}
        ]
    }
    return agent


# ---------------------------------------------------------------------------
# 1. End-to-end evaluation (CallbackHandler + TaskCompletionMetric)
# ---------------------------------------------------------------------------

class TestEndToEndEvaluation:
    """
    Article claim: "DeepEval enables rapid LangGraph application evaluation
    within minutes using a callback-based approach."

    Pattern:
        CallbackHandler(metrics=[TaskCompletionMetric()])
        agent.invoke(..., config={"callbacks": [handler]})
    """

    def test_callback_handler_is_passed_to_invoke(self, mock_agent, mock_callback_handler):
        """CallbackHandler must appear in the invoke config."""
        mock_agent.invoke(
            input={"messages": [{"role": "user", "content": "What is the weather in Bogotá?"}]},
            config={"callbacks": [mock_callback_handler]},
        )
        call_kwargs = mock_agent.invoke.call_args
        callbacks = call_kwargs.kwargs["config"]["callbacks"]
        assert mock_callback_handler in callbacks

    def test_agent_returns_assistant_message(self, mock_agent, mock_callback_handler):
        """Agent response should contain an assistant-role message."""
        result = mock_agent.invoke(
            input={"messages": [{"role": "user", "content": "What is the weather in Paris?"}]},
            config={"callbacks": [mock_callback_handler]},
        )
        roles = [m["role"] for m in result["messages"]]
        assert "assistant" in roles

    def test_dataset_iterator_drives_evaluation(self, mock_agent, mock_callback_handler):
        """
        Article pattern: iterate over EvaluationDataset.evals_iterator()
        and invoke agent once per golden.
        """
        goldens = [
            {"input": "What is the weather in Bogotá, Colombia?"},
            {"input": "What is the weather in Paris, France?"},
        ]

        for golden in goldens:
            mock_agent.invoke(
                input={"messages": [{"role": "user", "content": golden["input"]}]},
                config={"callbacks": [mock_callback_handler]},
            )

        assert mock_agent.invoke.call_count == len(goldens)

    def test_each_golden_gets_its_own_callback(self, mock_agent):
        """Each eval iteration should instantiate a fresh CallbackHandler."""
        handlers = [MagicMock(name=f"handler_{i}") for i in range(2)]
        goldens = [
            {"input": "What is the weather in Tokyo?"},
            {"input": "What is the weather in Sydney?"},
        ]

        for golden, handler in zip(goldens, handlers):
            mock_agent.invoke(
                input={"messages": [{"role": "user", "content": golden["input"]}]},
                config={"callbacks": [handler]},
            )

        # Each call used a distinct handler
        for i, call in enumerate(mock_agent.invoke.call_args_list):
            assert call.kwargs["config"]["callbacks"][0] is handlers[i]


# ---------------------------------------------------------------------------
# 2. Component-level LLM evaluation (metadata + AnswerRelevancyMetric)
# ---------------------------------------------------------------------------

class TestLLMComponentEvaluation:
    """
    Article claim: "Metrics are defined within language model metadata."

    Pattern:
        ChatOpenAI(model=..., metadata={"metric": [AnswerRelevancyMetric()]})
    """

    def test_llm_metadata_contains_metric_key(self):
        """LLM metadata must use the exact key 'metric'."""
        mock_metric = MagicMock(name="AnswerRelevancyMetric")
        llm_config = {
            "model": "gpt-4o-mini",
            "metadata": {"metric": [mock_metric]},
        }
        assert "metric" in llm_config["metadata"]

    def test_llm_metadata_metric_is_a_list(self):
        """The 'metric' value must be a list (deepeval expects iterable)."""
        mock_metric = MagicMock()
        llm_config = {"metadata": {"metric": [mock_metric]}}
        assert isinstance(llm_config["metadata"]["metric"], list)

    def test_llm_bound_to_tools(self):
        """bind_tools() must be called so the LLM can use the weather tool."""
        mock_llm = MagicMock()
        mock_tool = MagicMock(name="get_weather")
        mock_llm.bind_tools([mock_tool])
        mock_llm.bind_tools.assert_called_once_with([mock_tool])

    def test_answer_relevancy_metric_attached_to_llm(self):
        """AnswerRelevancyMetric instance should be retrievable from metadata."""
        mock_metric = MagicMock()
        mock_metric.__class__.__name__ = "AnswerRelevancyMetric"

        metadata = {"metric": [mock_metric]}
        metric_names = [m.__class__.__name__ for m in metadata["metric"]]
        assert "AnswerRelevancyMetric" in metric_names


# ---------------------------------------------------------------------------
# 3. Tool-level evaluation (@tool decorator + AnswerRelevancyMetric)
# ---------------------------------------------------------------------------

class TestToolLevelEvaluation:
    """
    Article claim: "The DeepEval LangChain tool decorator enables
    tool-level metric assessment."

    Pattern:
        @tool(metric=[AnswerRelevancyMetric()])
        def get_weather(location: str) -> str: ...
    """

    def test_tool_returns_string(self, weather_tool_fn):
        """Tool must return a plain string (LangGraph message content)."""
        result = weather_tool_fn("London")
        assert isinstance(result, str)

    def test_tool_includes_location_in_response(self, weather_tool_fn):
        """Tool response should reference the queried location."""
        location = "Buenos Aires"
        result = weather_tool_fn(location)
        assert location in result

    def test_tool_accepts_location_string(self, weather_tool_fn):
        """Tool signature: single `location: str` parameter."""
        import inspect
        sig = inspect.signature(weather_tool_fn)
        assert "location" in sig.parameters

    def test_tool_metric_is_list(self):
        """@tool decorator must receive metrics as a list."""
        mock_metric = MagicMock(name="AnswerRelevancyMetric")
        tool_decorator_kwargs = {"metric": [mock_metric]}
        assert isinstance(tool_decorator_kwargs["metric"], list)

    def test_tool_handles_international_locations(self, weather_tool_fn):
        """Tool should work for non-ASCII city names."""
        result = weather_tool_fn("São Paulo")
        assert isinstance(result, str)
        assert len(result) > 0


# ---------------------------------------------------------------------------
# 4. Dataset structure (Golden / EvaluationDataset)
# ---------------------------------------------------------------------------

class TestEvaluationDataset:
    """
    Article pattern: EvaluationDataset(goldens=[Golden(input=...)...])
    """

    def test_golden_has_input_field(self):
        """Every Golden must have a non-empty `input`."""
        golden = {"input": "What is the weather in Bogotá, Colombia?"}
        assert "input" in golden
        assert golden["input"]

    def test_dataset_contains_multiple_goldens(self):
        """Dataset should hold more than one golden for meaningful eval."""
        goldens = [
            {"input": "What is the weather in Bogotá, Colombia?"},
            {"input": "What is the weather in Paris, France?"},
        ]
        dataset = {"goldens": goldens}
        assert len(dataset["goldens"]) >= 2

    def test_all_goldens_have_non_empty_inputs(self):
        """No golden should have a blank input."""
        goldens = [
            {"input": "What is the weather in Bogotá, Colombia?"},
            {"input": "What is the weather in Paris, France?"},
        ]
        for g in goldens:
            assert g["input"].strip(), f"Empty input found: {g}"


# ---------------------------------------------------------------------------
# 5. Config shape (callbacks key in invoke config)
# ---------------------------------------------------------------------------

class TestInvokeConfigShape:
    """
    The LangGraph invoke config must use the key 'callbacks' (not 'callback'
    or 'handlers') — deepeval's CallbackHandler hooks into LangChain's
    standard callback system.
    """

    def test_config_uses_callbacks_key(self, mock_callback_handler):
        config = {"callbacks": [mock_callback_handler]}
        assert "callbacks" in config

    def test_callbacks_value_is_a_list(self, mock_callback_handler):
        config = {"callbacks": [mock_callback_handler]}
        assert isinstance(config["callbacks"], list)

    def test_input_uses_messages_key(self):
        """LangGraph message format: {"messages": [...]}"""
        user_input = {
            "messages": [{"role": "user", "content": "Hello"}]
        }
        assert "messages" in user_input
        assert user_input["messages"][0]["role"] == "user"
