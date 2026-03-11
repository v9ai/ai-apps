# LLM Evaluation Fundamentals: Metrics, Datasets & Methodology

Evaluating large language models requires a principled framework that goes far beyond simple accuracy checks. The rapid proliferation of LLMs has exposed deep methodological gaps in how we measure model quality, from metric selection to dataset construction to statistical rigor. This article provides a research-grounded tour of evaluation fundamentals, covering the metrics that matter, the benchmarks that define the field, and the methodology needed to draw valid conclusions.

## Why Evaluation Is Hard for Language Models

Traditional machine learning evaluation assumes a well-defined task with clear ground truth. Language models break this assumption in several ways. First, many LLM tasks are open-ended: there is no single correct answer to "write a poem about autumn." Second, the same semantic content can be expressed in countless surface forms, making string-matching metrics unreliable. Third, LLMs are increasingly used as general-purpose systems, meaning evaluation must cover a combinatorial explosion of capabilities.

The consequence is that LLM evaluation is inherently multi-dimensional. A model might excel at factual recall but fail at reasoning. It might produce fluent text that is subtly wrong. The evaluation framework must capture these distinctions, which means understanding what each metric actually measures and where it breaks down.

## Core Metrics: What They Measure and Where They Fail

### Accuracy and Exact Match

The simplest metric: does the model's output exactly match the reference? Exact match (EM) is used in extractive QA benchmarks like SQuAD (Rajpurkar et al., 2016) and closed-form tasks where the answer space is constrained. Accuracy generalizes this to classification tasks.

The limitation is obvious: exact match penalizes correct answers that differ in surface form. "Barack Obama" vs "Obama" vs "the 44th president" are all correct but only one matches. For this reason, exact match is typically paired with softer metrics.

### F1 Score (Token-Level)

Token-level F1, as used in SQuAD evaluation, treats the prediction and reference as bags of tokens and computes precision and recall over their overlap. This is more forgiving than exact match but still operates at the lexical level. It cannot recognize paraphrases or handle cases where the model provides additional correct context.

```python
def token_f1(prediction: str, reference: str) -> float:
    pred_tokens = prediction.lower().split()
    ref_tokens = reference.lower().split()
    common = set(pred_tokens) & set(ref_tokens)
    if len(common) == 0:
        return 0.0
    precision = len(common) / len(pred_tokens)
    recall = len(common) / len(ref_tokens)
    return 2 * (precision * recall) / (precision + recall)
```

### BLEU Score

BLEU (Papineni et al., 2002) was developed for machine translation and measures n-gram overlap between generated text and one or more references. It computes modified precision for n-grams of size 1 through 4 and applies a brevity penalty to discourage overly short outputs.

BLEU has well-documented limitations for LLM evaluation. It correlates poorly with human judgment on open-ended generation tasks (Callison-Burch et al., 2006). It is insensitive to semantic correctness: a sentence with all the right words in the wrong order can score well. It penalizes valid paraphrases. Despite this, BLEU remains widely reported due to its simplicity and the need for comparable numbers across papers.

### ROUGE

ROUGE (Lin, 2004) is the standard metric for summarization. ROUGE-N measures n-gram recall between the generated summary and reference. ROUGE-L computes the longest common subsequence. ROUGE-Lsum applies this at the sentence level for multi-sentence summaries.

ROUGE shares many of BLEU's limitations regarding surface-form dependence. However, its focus on recall rather than precision makes it more appropriate for summarization, where the question is "did the summary capture the key content?" rather than "is every generated word in the reference?"

### BERTScore

BERTScore (Zhang et al., 2020) addresses the lexical matching limitation by computing similarity in embedding space. It uses contextual embeddings from a pretrained model (typically RoBERTa) to compute token-level cosine similarities between the candidate and reference, then aggregates via greedy matching.

```python
from bert_score import score

candidates = ["The cat sat on the mat."]
references = ["A feline was resting on the rug."]

P, R, F1 = score(candidates, references, lang="en", rescale_with_baseline=True)
print(f"BERTScore F1: {F1.item():.4f}")
```

BERTScore correlates better with human judgment than BLEU or ROUGE on many tasks, but it is not without issues. The choice of underlying model affects results. The metric can be computationally expensive. And it still requires reference text, which limits its applicability to open-ended generation.

### Perplexity and Its Limitations

Perplexity measures how well a language model predicts a held-out text corpus. Formally, it is the exponentiated average negative log-likelihood per token:

$$PPL = \exp\left(-\frac{1}{N}\sum_{i=1}^{N}\log p(x_i | x_{<i})\right)$$

Lower perplexity means the model assigns higher probability to the observed text. Perplexity is useful for comparing models trained on similar data with similar tokenizers, but it has critical limitations:

1. **Tokenizer dependence**: Models with different tokenizers produce incomparable perplexity values because they define "token" differently.
2. **Not a task metric**: Low perplexity does not imply good task performance. A model can be excellent at next-token prediction while being terrible at following instructions.
3. **Distribution sensitivity**: Perplexity on one corpus says little about performance on a different distribution.

Perplexity is best understood as an intrinsic metric that measures language modeling quality, not as an extrinsic metric that measures usefulness.

## Benchmark Suites: The Standard Evaluations

### MMLU (Massive Multitask Language Understanding)

MMLU (Hendrycks et al., 2021) tests knowledge across 57 subjects spanning STEM, humanities, social sciences, and professional domains. Each question is multiple-choice with four options. The benchmark ranges from elementary-level to professional-exam difficulty.

MMLU has become the de facto standard for measuring broad knowledge. However, it has known issues: some questions are ambiguous, the multiple-choice format constrains evaluation, and high-performing models are approaching saturation on certain subjects. The 5-shot evaluation protocol (providing 5 examples before each question) is standard but introduces sensitivity to example selection.

### HellaSwag

HellaSwag (Zellers et al., 2019) evaluates commonsense reasoning through sentence completion. Given a context, the model must select the most plausible continuation from four options. The dataset was constructed using adversarial filtering against BERT-era models, making the distractors challenging.

HellaSwag tests a specific type of reasoning: understanding what typically happens next in everyday scenarios. Models have improved dramatically on this benchmark, with frontier models now scoring above 95%, raising questions about whether it still discriminates meaningfully between top models.

### HumanEval

HumanEval (Chen et al., 2021) evaluates code generation through 164 Python programming problems. Each problem includes a function signature, docstring, and test cases. The primary metric is pass@k: the probability that at least one of k generated samples passes all test cases.

```python
# Example HumanEval problem structure
def has_close_elements(numbers: List[float], threshold: float) -> bool:
    """Check if in given list of numbers, are any two numbers
    closer to each other than given threshold.
    >>> has_close_elements([1.0, 2.0, 3.0], 0.5)
    False
    >>> has_close_elements([1.0, 2.8, 3.0, 4.0, 5.0, 2.0], 0.3)
    True
    """
```

Pass@k is estimated using an unbiased estimator rather than simply generating k samples and checking:

$$\text{pass@k} = 1 - \frac{\binom{n-c}{k}}{\binom{n}{k}}$$

where n is total samples generated and c is the number that pass. HumanEval has spawned extensions like HumanEval+ (Liu et al., 2023) with more rigorous test cases and MultiPL-E for multilingual code evaluation.

### Other Notable Benchmarks

- **GSM8K** (Cobbe et al., 2021): Grade school math word problems testing multi-step arithmetic reasoning.
- **TruthfulQA** (Lin et al., 2022): Questions designed to elicit common misconceptions, testing whether models reproduce popular falsehoods.
- **WinoGrande** (Sakaguchi et al., 2020): Pronoun resolution requiring commonsense reasoning.
- **ARC** (Clark et al., 2018): Science questions from grade school exams, with an easy set and a challenge set.
- **BBH (BIG-Bench Hard)** (Suzgun et al., 2022): A curated subset of BIG-Bench tasks where language models previously performed below average human raters.

## Evaluation Methodology: Getting It Right

### Held-Out Test Sets and Data Contamination

The most fundamental requirement in evaluation is that the model has not seen the test data during training. With LLMs trained on massive web corpora, this is increasingly difficult to guarantee. Benchmark contamination, where test examples appear in training data, is a pervasive concern addressed in detail in the benchmark design literature.

For custom evaluations, the standard practice is a train/validation/test split. The test set must be held out entirely during development, including hyperparameter tuning. The validation set is used for development decisions. This discipline is critical: optimizing against the test set, even indirectly, invalidates results.

### Cross-Validation for LLMs

Traditional k-fold cross-validation is rarely applied to LLM pretraining due to computational cost. However, it is relevant for:

1. **Few-shot prompt selection**: When choosing between prompt templates or few-shot examples, cross-validation over the evaluation set prevents overfitting to a particular split.
2. **Fine-tuning evaluation**: When fine-tuning on small datasets, k-fold cross-validation provides more robust performance estimates.
3. **Evaluation set construction**: Stratified sampling ensures the evaluation set covers the distribution of interest.

```python
from sklearn.model_selection import StratifiedKFold
import numpy as np

def cross_validate_prompt(examples, labels, prompt_fn, model, k=5):
    skf = StratifiedKFold(n_splits=k, shuffle=True, random_state=42)
    scores = []
    for train_idx, test_idx in skf.split(examples, labels):
        few_shot = [examples[i] for i in train_idx[:5]]
        test_examples = [examples[i] for i in test_idx]
        test_labels = [labels[i] for i in test_idx]
        predictions = [model(prompt_fn(few_shot, ex)) for ex in test_examples]
        scores.append(compute_metric(predictions, test_labels))
    return np.mean(scores), np.std(scores)
```

### Statistical Significance in Evaluation

Reporting a single accuracy number without confidence intervals is unfortunately common but methodologically insufficient. Key practices include:

**Bootstrap confidence intervals**: Resample the test set with replacement many times, compute the metric on each resample, and report the 95% confidence interval. This is assumption-free and works for any metric.

```python
import numpy as np

def bootstrap_ci(scores, n_bootstrap=10000, ci=0.95):
    bootstrapped = []
    for _ in range(n_bootstrap):
        sample = np.random.choice(scores, size=len(scores), replace=True)
        bootstrapped.append(np.mean(sample))
    lower = np.percentile(bootstrapped, (1 - ci) / 2 * 100)
    upper = np.percentile(bootstrapped, (1 + ci) / 2 * 100)
    return np.mean(scores), lower, upper
```

**Paired significance tests**: When comparing two models on the same test set, use paired tests (paired bootstrap or McNemar's test) that account for per-example correlation. This is more powerful than unpaired comparisons.

**Multiple comparison correction**: When evaluating across many benchmarks, apply Bonferroni correction or control the false discovery rate. Reporting the single benchmark where your model happens to win is a form of p-hacking.

**Effect size**: Statistical significance does not imply practical significance. A 0.1% accuracy improvement on MMLU may be statistically significant with enough test examples but practically meaningless. Report effect sizes alongside p-values.

### Sample Size Considerations

The precision of an evaluation depends on the number of test examples. For binary metrics like accuracy, the standard error is approximately:

$$SE = \sqrt{\frac{p(1-p)}{n}}$$

where p is the true accuracy and n is the number of examples. At 90% accuracy with 100 examples, the 95% confidence interval is roughly +/-6 percentage points. With 1000 examples, it narrows to +/-2 points. This has practical implications: small benchmarks may not distinguish between models with similar capabilities.

## Evaluation Protocols: Few-Shot, Chain-of-Thought, and Beyond

### Few-Shot Evaluation

The standard protocol for evaluating base models uses few-shot prompting: provide k examples of the task in the prompt before the test question. The choice of k, the selection of examples, and their ordering all affect results.

Best practices include:
- Report results averaged over multiple random selections of few-shot examples
- Use the same few-shot examples across all models being compared
- Specify the exact prompt template used

### Chain-of-Thought Evaluation

For reasoning tasks, chain-of-thought (CoT) prompting (Wei et al., 2022) can dramatically change results. The evaluation protocol must specify whether CoT is used and how the final answer is extracted from the reasoning trace. Common approaches include:

1. Parse the answer after a delimiter like "The answer is"
2. Use a separate extraction step to pull the answer from free-form reasoning
3. Evaluate the reasoning chain itself, not just the final answer

### Instruction-Following Evaluation

For chat models, evaluation often tests instruction following rather than raw knowledge. IFEval (Zhou et al., 2023) provides verifiable instruction-following tests where compliance can be checked programmatically (e.g., "write a response with exactly 3 paragraphs").

## Building a Robust Evaluation Pipeline

A production-grade evaluation pipeline should include:

1. **Version control for eval data**: Test sets should be versioned and immutable once published.
2. **Deterministic evaluation**: Set temperature to 0 or use fixed random seeds for reproducibility.
3. **Multiple metrics**: No single metric captures all aspects of quality. Report a suite of complementary metrics.
4. **Human evaluation as ground truth**: Automated metrics should be validated against human judgment for your specific task.
5. **Error analysis**: Beyond aggregate metrics, examine failure modes qualitatively. A model scoring 90% accuracy may fail systematically on a critical subclass.

```python
class EvalPipeline:
    def __init__(self, model, metrics, dataset):
        self.model = model
        self.metrics = metrics
        self.dataset = dataset

    def run(self, n_bootstrap=1000):
        predictions = [self.model.generate(ex["input"]) for ex in self.dataset]
        results = {}
        for metric_name, metric_fn in self.metrics.items():
            scores = [metric_fn(pred, ex["target"])
                      for pred, ex in zip(predictions, self.dataset)]
            mean, ci_low, ci_high = bootstrap_ci(scores, n_bootstrap)
            results[metric_name] = {
                "mean": mean,
                "ci_95": (ci_low, ci_high),
                "n": len(scores)
            }
        return results
```

## Summary and Key Takeaways

- **No single metric suffices.** BLEU, ROUGE, and exact match measure surface overlap; BERTScore captures semantics but still needs references; perplexity measures language modeling, not task performance. Use metrics appropriate to your task and report multiple complementary measures.
- **Benchmarks are snapshots, not ground truth.** MMLU, HellaSwag, and HumanEval are useful reference points but each has known limitations including contamination risk, saturation, and format constraints.
- **Statistical rigor is non-negotiable.** Always report confidence intervals. Use paired tests for model comparisons. Correct for multiple comparisons. Consider effect sizes.
- **Methodology matters as much as metrics.** The evaluation protocol (few-shot count, prompt template, answer extraction, CoT usage) can swing results by double-digit percentages. Document and standardize every choice.
- **Validate automated metrics against human judgment** for your specific use case. The correlation between automated metrics and human preferences varies dramatically across tasks and domains.

The field of LLM evaluation is evolving rapidly, but the fundamentals of sound experimental methodology remain constant. Rigorous evaluation is the foundation upon which all claims about model capability must rest.
