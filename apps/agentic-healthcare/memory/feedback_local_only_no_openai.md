---
name: Local only, no OpenAI
description: Agentic healthcare must use local-only models — no OpenAI API calls for embeddings or any other component
type: feedback
---

No OpenAI. Use local-only models for embeddings and all other AI components.

**Why:** User explicitly wants local-first development with no cloud API dependencies for core AI operations.

**How to apply:** Never suggest OpenAI API as a primary or fallback option for embeddings, LLM, or other AI components in the agentic-healthcare app. Use FastEmbed (ONNX), MLX, or other local inference solutions.
