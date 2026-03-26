"""DeepEval tracing integration for LlamaIndex."""


def setup_tracing() -> None:
    """Instrument LlamaIndex with DeepEval tracing.

    Call once at CLI startup before running any workflow.
    Falls back silently if deepeval is not configured.
    """
    try:
        from llama_index.core import set_global_handler
        set_global_handler("deepeval")
        print("DeepEval tracing enabled for LlamaIndex")
    except Exception as e:
        print(f"DeepEval tracing not available: {e}")
