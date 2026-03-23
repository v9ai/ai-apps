Your AI pipeline generates a LEGO parts list. The text looks plausible. But does the part image actually match the description? Would this list help someone build the MOC?

Unit tests can't answer these questions. Multi-modal evaluation can.

I built a production evaluation pipeline with DeepEval that tests AI-generated LEGO parts lists across 5 axes:

1. G-Eval with custom LEGO-specific criteria (real part numbers, realistic colors, contextual quantities)
2. ImageCoherenceMetric -- does each part image match its surrounding text?
3. ImageReferenceMetric -- is the image accurately described?
4. ImageHelpfulnessMetric -- would this genuinely help a builder?
5. RAG metrics (Faithfulness + AnswerRelevancy) against a LEGO parts catalog

The judge model? DeepSeek-chat at temperature 0.0. Not GPT-4o. Custom DeepEvalBaseLLM wrapper, structured output via json_mode, both sync and async. The economics matter when you're running 6 metrics across multiple test cases in CI.

The pipeline under test is a 3-node LangGraph graph that classifies MOC build type, generates category-specific parts using curated part pools (140+ real LEGO element numbers), and validates the output. The evaluation catches what unit tests miss: hallucinated part numbers that look valid, mismatched images, castle MOCs with Technic gears.

Key insight: image metrics catch failures text metrics miss entirely. A parts list can score perfectly on text plausibility while failing ImageCoherence because the CDN serves a different part variant.

Full walkthrough with production code: [Link to Blog Post]

#DeepEval #LangGraph #MultiModalAI #LEGO #AIEvaluation #DeepSeek
