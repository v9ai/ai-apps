That 20-point performance drop you heard about? It wasn’t from removing contaminated data—it was from removing a line break.

The frenzy around LLM “data contamination” is often a mirage. New analysis from DeepSeek-V3 shows sensational benchmark collapses occur simply by reformatting the prompt, revealing models have overfit to evaluation formats, not memorized test sets.

• On GPQA Diamond, switching from the standard HuggingFace prompt to a decontaminated one crashed scores from 75.1% to 53.7%.
• Simply shuffling multiple-choice labels (A,B,C,D) can cause huge accuracy swings—models learn patterns, not answers.
• Performance can fluctuate >5% by just adding or removing a space, showing extreme format sensitivity, not knowledge.

This isn’t just a DeepSeek issue. It’s a systemic benchmark rot: we’ve been measuring format recognition, not generalization.

Stop trusting single-number scores. Demand sensitivity analyses.
Test your prompts with multiple formats.
The leaderboard chase is broken.

Dig into the full breakdown of the data contamination mirage and what it means for evaluating AI.

[Link to Blog Post]

#LLMEvaluation #Benchmarking #DeepSeek #PromptEngineering #AIMetrics #ModelValidation