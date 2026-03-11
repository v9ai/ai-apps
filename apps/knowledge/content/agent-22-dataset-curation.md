# Dataset Curation: Synthetic Data, Quality Filtering & Annotation

The quality of training data is the single most consequential factor in fine-tuning success, yet dataset curation remains the least glamorous and most underinvested part of the AI engineering pipeline. This article examines the full lifecycle of instruction dataset creation, from synthetic data generation via Self-Instruct and Evol-Instruct to quality filtering heuristics, human annotation workflows, decontamination procedures, and the practical tooling (Argilla, Label Studio) that ties it all together. Whether you are building a domain-specific assistant or aligning a general-purpose model, the techniques covered here directly determine whether your fine-tuned model will be useful or merely trained.

## The Data Bottleneck

The LIMA paper (Zhou et al., 2023) demonstrated that 1,000 carefully curated instruction-response pairs could produce a model competitive with those trained on 52,000 examples (Alpaca) or 70,000+ examples (various open-source instruction sets). This finding crystallized a principle that experienced practitioners already knew: data quality dominates data quantity, often by an order of magnitude.

However, "quality" is multidimensional:

- **Correctness**: Responses must be factually accurate and logically sound
- **Completeness**: Responses should fully address the instruction
- **Diversity**: The dataset should cover the full distribution of expected tasks
- **Consistency**: Formatting, tone, and level of detail should be uniform
- **Difficulty calibration**: The mix of easy and hard examples should match target use cases
- **Decontamination**: Training data must not overlap with evaluation benchmarks

Building datasets that satisfy all these criteria requires systematic processes, not ad-hoc data collection.

## Instruction Dataset Formats

Two dominant formats have emerged for instruction fine-tuning:

### Alpaca Format

Introduced by the Stanford Alpaca project, this format uses three fields:

```json
{
    "instruction": "Explain the concept of gravitational lensing.",
    "input": "",
    "output": "Gravitational lensing occurs when a massive object..."
}
```

The optional `input` field provides additional context. This format is simple but limited to single-turn interactions.

### ShareGPT / Conversation Format

Used for multi-turn training data, this format represents full conversations:

```json
{
    "conversations": [
        {"from": "human", "value": "What is gravitational lensing?"},
        {"from": "gpt", "value": "Gravitational lensing is a phenomenon..."},
        {"from": "human", "value": "How was it first observed?"},
        {"from": "gpt", "value": "The first observation of gravitational lensing..."}
    ]
}
```

Most modern fine-tuning frameworks (Axolotl, LLaMA-Factory, TRL) support both formats and can convert between them. The conversation format is generally preferred because it teaches the model to handle multi-turn interactions naturally.

### Chat Template Application

Training data must be formatted using the model's chat template, which defines how system prompts, user messages, and assistant responses are tokenized:

```python
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3-8B-Instruct")

messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is gravitational lensing?"},
    {"role": "assistant", "content": "Gravitational lensing occurs when..."}
]

formatted = tokenizer.apply_chat_template(
    messages,
    tokenize=False,
    add_generation_prompt=False
)
```

Getting the chat template wrong is a common source of degraded fine-tuning performance. The model learns spurious patterns from incorrect formatting rather than the intended instruction-following behavior.

## Synthetic Data Generation

### Self-Instruct

Wang et al. (2023) introduced Self-Instruct, a method for generating instruction datasets using a language model itself. The process:

1. Start with a seed set of 175 manually written instructions
2. Prompt the model to generate new instructions inspired by (but different from) random samples of existing instructions
3. For each generated instruction, prompt the model to identify whether it needs an input field and to produce the input if so
4. Prompt the model to generate the output (response)
5. Filter generated examples for quality

```python
SELF_INSTRUCT_PROMPT = """Come up with a series of tasks and their solutions.
Here are some examples:

Task: {seed_example_1}
Solution: {solution_1}

Task: {seed_example_2}
Solution: {solution_2}

Task: {seed_example_3}
Solution: {solution_3}

Now generate a new, different task and its solution:

Task:"""

def self_instruct_generate(seed_examples, generator_model, n_samples=1000):
    generated = []
    pool = seed_examples.copy()

    for _ in range(n_samples):
        # Sample 3 random examples from the pool
        samples = random.sample(pool, min(3, len(pool)))
        prompt = format_prompt(samples)

        # Generate new instruction + response
        output = generator_model.generate(prompt, temperature=0.7, max_tokens=1024)
        instruction, response = parse_output(output)

        # Basic quality filtering
        if len(instruction.split()) < 3 or len(response.split()) < 10:
            continue
        if any(is_too_similar(instruction, ex['instruction']) for ex in pool):
            continue

        new_example = {"instruction": instruction, "output": response}
        generated.append(new_example)
        pool.append(new_example)

    return generated
```

Self-Instruct's limitation is that the generated data quality is bounded by the generating model's capabilities. If the model cannot solve a task correctly, it produces incorrect training data.

### Evol-Instruct

WizardLM (Xu et al., 2023) introduced Evol-Instruct, which iteratively evolves simple instructions into more complex ones through a series of evolution strategies:

**Depth evolution** (increasing complexity):
- Add constraints ("...in under 100 words, using only simple language")
- Increase reasoning depth ("...and explain why each step is necessary")
- Concretize abstract instructions with specific scenarios
- Replace general concepts with domain-specific terminology

**Breadth evolution** (increasing diversity):
- Generate entirely new instructions inspired by existing ones
- Mutate topic domains while preserving task structure
- Vary response formats (lists, essays, code, tables)

```python
EVOLUTION_STRATEGIES = {
    "add_constraints": "Rewrite the following instruction by adding 1-2 "
        "specific constraints that make it more challenging:\n{instruction}",
    "deepen_reasoning": "Rewrite the following instruction to require "
        "multi-step reasoning:\n{instruction}",
    "concretize": "Make the following instruction more concrete and "
        "specific with a real-world scenario:\n{instruction}",
    "increase_complexity": "Add one more requirement to the following "
        "instruction to make it harder:\n{instruction}",
}

def evol_instruct(seed_instructions, evolver_model, generations=4):
    current = seed_instructions.copy()

    for gen in range(generations):
        evolved = []
        for instruction in current:
            strategy = random.choice(list(EVOLUTION_STRATEGIES.keys()))
            prompt = EVOLUTION_STRATEGIES[strategy].format(instruction=instruction)
            new_instruction = evolver_model.generate(prompt)

            # Verify the evolved instruction is actually harder
            if complexity_score(new_instruction) > complexity_score(instruction):
                evolved.append(new_instruction)

        current = evolved

    # Generate responses for all evolved instructions
    return generate_responses(current, evolver_model)
```

### Magpie: Alignment Data from Scratch

Xu et al. (2024) introduced Magpie, a clever technique for generating instruction data by exploiting how instruction-tuned models behave when given only a system prompt without a user message. By providing just the chat template prefix (system prompt + user turn marker), the model "hallucinates" a plausible user instruction, which can then be completed with a response.

This approach generates highly naturalistic instructions that reflect how users actually interact with chat models, unlike the somewhat artificial prompts produced by Self-Instruct.

## Quality Filtering

Raw synthetic data is noisy. Quality filtering is essential to extract the signal:

### Heuristic Filters

```python
def apply_quality_filters(examples):
    filtered = []
    for ex in examples:
        instruction = ex.get("instruction", "")
        response = ex.get("output", "")

        # Length filters
        if len(response.split()) < 15:
            continue  # Too short to be useful
        if len(response.split()) > 2000:
            continue  # Suspiciously long, likely degenerate

        # Repetition filter
        if has_excessive_repetition(response, threshold=3):
            continue

        # Language quality
        if response.count("I'm sorry") > 0 and len(response.split()) < 50:
            continue  # Refusal without substance

        # Instruction-response alignment
        if starts_with_instruction_echo(response, instruction):
            continue  # Response just repeats the instruction

        # Format consistency
        if response.startswith("Sure!") or response.startswith("Of course!"):
            response = remove_sycophantic_prefix(response)
            ex["output"] = response

        filtered.append(ex)

    return filtered

def has_excessive_repetition(text, threshold=3):
    """Detect degenerate repetitive outputs."""
    sentences = text.split(". ")
    if len(sentences) < 4:
        return False
    # Check for repeated n-grams
    trigrams = [tuple(sentences[i:i+3]) for i in range(len(sentences)-2)]
    return max(Counter(trigrams).values()) >= threshold
```

### Model-Based Quality Scoring

Use a strong language model to score data quality:

```python
QUALITY_SCORING_PROMPT = """Rate the quality of this instruction-response pair
on a scale of 1-5:

Instruction: {instruction}
Response: {response}

Criteria:
- Accuracy: Is the response factually correct?
- Completeness: Does it fully address the instruction?
- Clarity: Is it well-written and easy to understand?
- Helpfulness: Would a user find this response useful?

Provide a single score (1-5) and a brief justification.
Score:"""

def score_examples(examples, scorer_model, threshold=4):
    """Filter examples using a model-based quality scorer."""
    high_quality = []
    for ex in examples:
        prompt = QUALITY_SCORING_PROMPT.format(
            instruction=ex["instruction"],
            response=ex["output"]
        )
        result = scorer_model.generate(prompt, max_tokens=100)
        score = extract_score(result)
        if score >= threshold:
            high_quality.append(ex)
    return high_quality
```

### Deduplication

Near-duplicate examples waste training budget and can cause overfitting to specific patterns:

```python
from datasketch import MinHash, MinHashLSH

def deduplicate_instructions(examples, threshold=0.7):
    """Remove near-duplicate instructions using MinHash LSH."""
    lsh = MinHashLSH(threshold=threshold, num_perm=128)
    unique = []

    for i, ex in enumerate(examples):
        # Create MinHash for the instruction
        mh = MinHash(num_perm=128)
        for word in ex["instruction"].lower().split():
            mh.update(word.encode('utf-8'))

        # Check if similar instruction already exists
        try:
            result = lsh.query(mh)
            if not result:
                lsh.insert(str(i), mh)
                unique.append(ex)
        except ValueError:
            lsh.insert(str(i), mh)
            unique.append(ex)

    return unique
```

## Data Decontamination

Training on data that overlaps with evaluation benchmarks inflates performance metrics and gives a misleading picture of model capabilities. Decontamination removes or flags such overlaps.

### N-gram Contamination Detection

```python
def detect_contamination(train_examples, benchmark_examples, n=13):
    """Detect n-gram overlaps between training data and benchmarks."""
    # Build n-gram index from benchmark
    benchmark_ngrams = set()
    for ex in benchmark_examples:
        text = ex["question"] + " " + ex.get("answer", "")
        words = text.lower().split()
        for i in range(len(words) - n + 1):
            benchmark_ngrams.add(tuple(words[i:i+n]))

    # Check each training example
    contaminated = []
    clean = []
    for ex in train_examples:
        text = ex["instruction"] + " " + ex["output"]
        words = text.lower().split()
        is_contaminated = False
        for i in range(len(words) - n + 1):
            if tuple(words[i:i+n]) in benchmark_ngrams:
                is_contaminated = True
                break
        if is_contaminated:
            contaminated.append(ex)
        else:
            clean.append(ex)

    print(f"Found {len(contaminated)} contaminated examples "
          f"({len(contaminated)/len(train_examples)*100:.1f}%)")
    return clean, contaminated
```

Standard benchmarks to check against include MMLU, HellaSwag, ARC, GSM8K, HumanEval, TruthfulQA, and WinoGrande. The GPT-4 technical report used 13-gram overlap detection as its primary decontamination method.

## Human Annotation Platforms

When synthetic data is insufficient, human annotation provides ground truth. Two open-source platforms dominate:

### Argilla

Argilla is purpose-built for AI data annotation, with native support for text classification, NER, preference ranking, and instruction-response evaluation:

```python
import argilla as rg

# Connect to Argilla server
rg.init(api_url="http://localhost:6900", api_key="your-api-key")

# Create a dataset for preference annotation
dataset = rg.FeedbackDataset(
    fields=[
        rg.TextField(name="instruction"),
        rg.TextField(name="response_a"),
        rg.TextField(name="response_b"),
    ],
    questions=[
        rg.RatingQuestion(
            name="preference",
            title="Which response is better?",
            values=[1, 2, 3, 4, 5],
            description="1=Response A much better, 5=Response B much better"
        ),
        rg.TextQuestion(
            name="justification",
            title="Why did you choose this preference?",
            required=False
        ),
    ],
    guidelines="Compare the two responses and rate which one better "
               "addresses the instruction. Consider accuracy, completeness, "
               "and clarity."
)

# Push to Argilla for annotation
dataset.push_to_argilla(name="preference-annotation")
```

Argilla's strengths include integration with Hugging Face datasets, built-in inter-annotator agreement metrics, and support for active learning workflows where the most uncertain examples are prioritized for annotation.

### Label Studio

Label Studio is a more general-purpose annotation platform that supports text, images, audio, and video:

```xml
<!-- Label Studio XML config for instruction quality rating -->
<View>
  <Header value="Rate this instruction-response pair"/>
  <Text name="instruction" value="$instruction"/>
  <Text name="response" value="$response"/>
  <Rating name="quality" toName="response" maxRating="5"/>
  <Choices name="issues" toName="response" choice="multiple">
    <Choice value="Factually incorrect"/>
    <Choice value="Incomplete"/>
    <Choice value="Poorly written"/>
    <Choice value="Off-topic"/>
    <Choice value="Harmful content"/>
  </Choices>
  <TextArea name="notes" toName="response" placeholder="Optional notes..."/>
</View>
```

Label Studio excels at flexible annotation configurations and supports complex workflows with review stages, annotator management, and webhook integrations.

## Building a Complete Data Pipeline

Putting it all together, a production data curation pipeline looks like this:

```python
class DataCurationPipeline:
    def __init__(self, generator_model, scorer_model, benchmarks):
        self.generator = generator_model
        self.scorer = scorer_model
        self.benchmarks = benchmarks

    def run(self, seed_data, target_size=10000):
        # Stage 1: Generate synthetic data
        print("Stage 1: Generating synthetic instructions...")
        synthetic = self.generate_synthetic(seed_data, n=target_size * 3)

        # Stage 2: Apply heuristic filters
        print("Stage 2: Applying heuristic filters...")
        filtered = apply_quality_filters(synthetic)

        # Stage 3: Deduplicate
        print("Stage 3: Deduplicating...")
        deduped = deduplicate_instructions(filtered)

        # Stage 4: Model-based quality scoring
        print("Stage 4: Scoring quality...")
        scored = score_examples(deduped, self.scorer, threshold=4)

        # Stage 5: Decontaminate
        print("Stage 5: Decontaminating against benchmarks...")
        clean, _ = detect_contamination(scored, self.benchmarks)

        # Stage 6: Balance categories
        print("Stage 6: Balancing...")
        balanced = self.balance_categories(clean, target_size)

        # Stage 7: Format for training
        print("Stage 7: Formatting...")
        formatted = self.format_for_training(balanced)

        print(f"Final dataset: {len(formatted)} examples")
        return formatted

    def balance_categories(self, examples, target_size):
        """Ensure diverse task coverage."""
        categorized = categorize_by_task(examples)  # coding, math, writing, etc.
        balanced = []
        per_category = target_size // len(categorized)

        for category, exs in categorized.items():
            if len(exs) >= per_category:
                balanced.extend(random.sample(exs, per_category))
            else:
                balanced.extend(exs)  # Take all if insufficient

        return balanced
```

## Domain-Specific Data Strategies

### Medical/Legal/Scientific Domains

For specialized domains:
1. Start with domain-specific seed instructions written by subject matter experts
2. Use Evol-Instruct to generate variations within the domain
3. Have domain experts review a sample for accuracy (this is non-negotiable for high-stakes domains)
4. Mix in 10-20% general-domain instructions to maintain broad capabilities

### Code Generation

Code datasets have unique requirements:
- Include the full context (imports, function signatures, docstrings)
- Test generated code for correctness using execution-based validation
- Cover diverse programming languages and frameworks
- Include both generation (write code from spec) and comprehension (explain code) tasks

### Multi-Language

For multilingual datasets:
- Do not simply translate English data. Different languages have different conversational norms and task distributions.
- Include language-specific tasks (transliteration, formality levels, script-specific challenges)
- Balance language representation according to target user demographics

## Summary and Key Takeaways

- **Data quality dominates quantity**: 1,000 excellent examples outperform 50,000 mediocre ones (LIMA). Invest time in curation, not just generation.
- **Self-Instruct and Evol-Instruct** are the foundational synthetic data generation methods. Self-Instruct bootstraps from seed examples; Evol-Instruct systematically increases complexity.
- **Multi-stage quality filtering** is essential: heuristic filters catch obvious issues, model-based scoring identifies subtle quality problems, and deduplication prevents overfitting.
- **Decontamination** against evaluation benchmarks is a professional obligation. Use 13-gram overlap detection at minimum.
- **Two dataset formats dominate**: Alpaca (single-turn) and ShareGPT/conversation (multi-turn). Most modern training frameworks support both.
- **Annotation platforms** (Argilla, Label Studio) provide structured workflows for human review. Argilla is more AI-native; Label Studio is more flexible.
- **Domain-specific datasets** require subject matter expert involvement. No amount of synthetic generation compensates for domain-incorrect training data.
- The complete pipeline is: **generate -> filter -> deduplicate -> score -> decontaminate -> balance -> format**. Automating this pipeline with reproducible scripts is one of the highest-leverage investments in any fine-tuning project.
