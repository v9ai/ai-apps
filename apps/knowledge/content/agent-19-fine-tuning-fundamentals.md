# Fine-tuning Fundamentals: Full, Freeze & Transfer Learning

Fine-tuning pre-trained language models remains the most reliable method for adapting general-purpose models to domain-specific tasks, yet the decision space around when, how, and whether to fine-tune has grown considerably. This article examines the mechanics of full fine-tuning, feature extraction, and transfer learning strategies, covering learning rate scheduling, catastrophic forgetting mitigation, and the practical economics of fine-tuning versus prompt engineering. Understanding these fundamentals is essential before exploring parameter-efficient methods like LoRA or reinforcement learning from human feedback.

## The Transfer Learning Paradigm

Transfer learning in NLP underwent a phase transition with the introduction of large pre-trained language models. The core insight, articulated in Howard and Ruder's ULMFiT paper (2018) and later scaled by BERT (Devlin et al., 2019) and GPT (Radford et al., 2018), is that representations learned during unsupervised pre-training on large corpora encode general linguistic knowledge that transfers effectively to downstream tasks.

The transfer learning pipeline follows a two-stage process:

1. **Pre-training**: Learn general representations from large unlabeled corpora using self-supervised objectives (masked language modeling, next-token prediction, or denoising).
2. **Fine-tuning**: Adapt these representations to a specific task using labeled data, typically with a task-specific head appended to the pre-trained backbone.

This paradigm works because early layers capture low-level syntactic patterns (part-of-speech, phrase structure), middle layers encode semantic relationships, and later layers develop task-relevant abstractions. Fine-tuning adjusts all these layers to align with the target distribution.

### Feature Extraction vs. Fine-tuning

Two fundamental approaches exist for leveraging pre-trained models:

**Feature extraction** freezes all pre-trained weights and only trains a new classification head on top. The pre-trained model acts as a fixed feature extractor. This approach is computationally cheap and works well when the target domain is similar to the pre-training corpus.

```python
from transformers import AutoModel, AutoTokenizer
import torch.nn as nn

class FeatureExtractor(nn.Module):
    def __init__(self, model_name, num_classes):
        super().__init__()
        self.backbone = AutoModel.from_pretrained(model_name)
        # Freeze all backbone parameters
        for param in self.backbone.parameters():
            param.requires_grad = False
        self.classifier = nn.Linear(self.backbone.config.hidden_size, num_classes)

    def forward(self, input_ids, attention_mask):
        with torch.no_grad():
            outputs = self.backbone(input_ids, attention_mask=attention_mask)
        cls_embedding = outputs.last_hidden_state[:, 0, :]
        return self.classifier(cls_embedding)
```

**Full fine-tuning** updates all parameters, including the pre-trained backbone. This is more expressive but requires more data, more compute, and careful hyperparameter tuning to avoid catastrophic forgetting.

The choice between these approaches depends on several factors: dataset size, domain shift from pre-training data, compute budget, and the complexity of the target task. Research by Peters et al. (2019) in "To Tune or Not to Tune?" demonstrated that fine-tuning consistently outperforms feature extraction when sufficient labeled data is available, but the gap narrows for tasks closely aligned with pre-training objectives.

## Full Fine-tuning Mechanics

Full fine-tuning updates every parameter in the model using gradient descent on the task-specific loss. For a model with parameters $\theta$ pre-trained to $\theta_0$, fine-tuning solves:

$$\theta^* = \arg\min_\theta \mathcal{L}_{task}(D_{train}; \theta) + \lambda ||\theta - \theta_0||^2$$

The regularization term $\lambda ||\theta - \theta_0||^2$ (L2 regularization toward pre-trained weights, sometimes called "weight decay toward init") is optional but helps prevent the model from drifting too far from its pre-trained initialization.

### The Mechanics of Gradient Flow

During full fine-tuning, gradients flow from the task-specific loss through every layer. This means:

- **Output layers** receive the strongest gradient signal and change most rapidly
- **Middle layers** adjust their semantic representations to align with task requirements
- **Input layers** (embeddings, early attention) change least, as they encode fundamental linguistic patterns

This natural gradient hierarchy is why discriminative learning rates (different learning rates per layer) can be effective. ULMFiT introduced this concept, applying progressively smaller learning rates to earlier layers:

```python
from torch.optim import AdamW

def get_discriminative_lr_params(model, base_lr=2e-5, decay_factor=0.95):
    """Apply discriminative learning rates: lower LR for earlier layers."""
    param_groups = []
    num_layers = model.config.num_hidden_layers

    # Embeddings get the smallest learning rate
    param_groups.append({
        'params': model.embeddings.parameters(),
        'lr': base_lr * (decay_factor ** num_layers)
    })

    # Each transformer layer gets a progressively higher LR
    for i, layer in enumerate(model.encoder.layer):
        param_groups.append({
            'params': layer.parameters(),
            'lr': base_lr * (decay_factor ** (num_layers - i - 1))
        })

    # Classification head gets the highest learning rate
    param_groups.append({
        'params': model.classifier.parameters(),
        'lr': base_lr
    })

    return param_groups

optimizer = AdamW(get_discriminative_lr_params(model))
```

### Gradual Unfreezing

An alternative to discriminative learning rates is gradual unfreezing, where layers are progressively unfrozen during training. Start by training only the classification head, then unfreeze the top transformer layer, then the next, and so on. This gives each layer time to adapt before earlier layers begin changing.

```python
def gradual_unfreeze(model, epoch, total_layers):
    """Unfreeze one additional layer per epoch, starting from the top."""
    # Freeze everything first
    for param in model.parameters():
        param.requires_grad = False

    # Always train the classification head
    for param in model.classifier.parameters():
        param.requires_grad = True

    # Unfreeze layers from top to bottom based on epoch
    layers_to_unfreeze = min(epoch + 1, total_layers)
    for i in range(total_layers - layers_to_unfreeze, total_layers):
        for param in model.encoder.layer[i].parameters():
            param.requires_grad = True
```

## Learning Rate Scheduling

Learning rate scheduling is arguably the single most impactful hyperparameter decision in fine-tuning. The wrong learning rate schedule can lead to catastrophic forgetting (too high), underfitting (too low), or unstable training (no warmup).

### Linear Warmup

Starting with a high learning rate on a fine-tuned model is dangerous because the randomly initialized classification head produces large gradients that can corrupt pre-trained weights. Linear warmup addresses this by gradually increasing the learning rate from near-zero over the first N steps:

$$lr(t) = lr_{max} \cdot \frac{t}{T_{warmup}} \quad \text{for } t \leq T_{warmup}$$

A typical warmup period is 6-10% of total training steps. The BERT paper used a warmup of 10% of training steps, which has become a common default.

### Cosine Decay

After warmup, cosine decay smoothly reduces the learning rate following a cosine curve:

$$lr(t) = lr_{min} + \frac{1}{2}(lr_{max} - lr_{min})(1 + \cos(\frac{t - T_{warmup}}{T_{total} - T_{warmup}} \cdot \pi))$$

Cosine decay avoids the sharp transitions of step-based schedules and provides a natural annealing that helps the model settle into flatter minima.

```python
from transformers import get_cosine_schedule_with_warmup

optimizer = AdamW(model.parameters(), lr=2e-5, weight_decay=0.01)
scheduler = get_cosine_schedule_with_warmup(
    optimizer,
    num_warmup_steps=int(0.06 * total_steps),  # 6% warmup
    num_training_steps=total_steps
)
```

### Warmup-Stable-Decay (WSD)

A newer schedule gaining traction, particularly for continual pre-training, is warmup-stable-decay (WSD). It maintains a constant learning rate for the majority of training after warmup, then applies a short decay phase at the end. MiniCPM (Hu et al., 2024) demonstrated that WSD enables efficient "anytime" training where checkpoints from the stable phase can be independently decayed.

## Catastrophic Forgetting Prevention

Catastrophic forgetting occurs when fine-tuning on a new task destroys the general knowledge acquired during pre-training. This is not merely a theoretical concern; aggressive fine-tuning on small datasets routinely causes models to lose fluency, factual knowledge, or performance on related tasks.

### Techniques for Mitigation

**1. Low learning rates**: The simplest defense. BERT-scale models typically use learning rates of 1e-5 to 5e-5, roughly 10-100x smaller than training from scratch.

**2. Short training duration**: Fine-tuning typically runs for 2-5 epochs. Prolonged training increases the risk of overfitting and forgetting. Many practitioners use early stopping based on validation loss.

**3. Regularization toward pre-trained weights**: Explicitly penalizing divergence from pre-trained weights constrains how far the model can drift:

```python
def l2_regularization_to_init(model, pretrained_params, lambda_reg=0.01):
    reg_loss = 0
    for name, param in model.named_parameters():
        if name in pretrained_params:
            reg_loss += torch.sum((param - pretrained_params[name]) ** 2)
    return lambda_reg * reg_loss
```

**4. Elastic Weight Consolidation (EWC)**: Originally proposed by Kirkpatrick et al. (2017) for continual learning, EWC uses the Fisher information matrix to identify which parameters are important for previously learned tasks and penalizes changes to those parameters more heavily. This is explored in depth in the continual learning article.

**5. Mixout regularization**: Proposed by Lee et al. (2020), mixout stochastically replaces fine-tuned weights with their pre-trained values during training, similar to dropout but replacing with the pre-trained value instead of zero.

**6. Data mixing**: Including a small percentage of general-domain data during fine-tuning helps maintain broad capabilities. This approach is common in instruction tuning, where general instruction-following data is mixed with domain-specific examples.

## When to Fine-tune vs. Prompt

The decision between fine-tuning and prompt engineering (including in-context learning and RAG) depends on several interconnected factors:

### Favor Prompting When:
- You have fewer than ~100 labeled examples
- The task is well-represented in the model's pre-training data
- You need flexibility to change task definitions quickly
- Latency requirements allow for longer prompts
- You lack GPU infrastructure for training

### Favor Fine-tuning When:
- You have 1,000+ labeled examples (more is better)
- The task requires domain-specific knowledge not in pre-training data
- You need to reduce inference costs (shorter prompts, smaller models)
- Consistency and reliability matter more than flexibility
- You need to encode specific formatting or style requirements

### The Cost Crossover

There is a cost crossover point where fine-tuning becomes cheaper than prompting. Consider a classification task where:

- **Prompting**: Each request includes a system prompt with instructions and examples (~1,000 tokens). At $10/million input tokens, processing 1 million requests costs $10,000 in input tokens alone.
- **Fine-tuning**: A fine-tuned model needs no examples in the prompt (~50 tokens per request). At $10/million input tokens, 1 million requests cost $500. Fine-tuning itself might cost $100-$1,000 depending on dataset size and model.

At scale, fine-tuning amortizes its fixed cost across many inferences. The crossover typically occurs between 10,000 and 100,000 requests, depending on prompt length reduction.

## Data Requirements

The amount of data needed for fine-tuning depends on the task, model size, and desired performance:

### Rules of Thumb

- **Text classification**: 500-5,000 labeled examples per class for strong performance. Fewer examples work with larger pre-trained models.
- **Named entity recognition**: 5,000-20,000 annotated sentences for reasonable coverage of entity types.
- **Instruction tuning**: Research suggests that even 1,000 high-quality instruction-response pairs can meaningfully improve model behavior (Zhou et al., 2023, "LIMA: Less Is More for Alignment").
- **Domain adaptation**: 10,000-100,000 domain-specific documents for continual pre-training before task-specific fine-tuning.

### Data Quality Over Quantity

The LIMA paper demonstrated that 1,000 carefully curated examples can rival models trained on 50,000+ examples of lower quality. Key quality indicators include:

- **Diversity**: Cover the full range of expected inputs
- **Correctness**: Ensure labels/responses are accurate
- **Consistency**: Apply uniform labeling standards
- **Representativeness**: Match the distribution of real production data
- **Difficulty calibration**: Include both easy and hard examples

```python
# Quality filtering heuristic for instruction data
def filter_instruction_data(examples):
    filtered = []
    for ex in examples:
        # Remove very short responses (likely low quality)
        if len(ex['response'].split()) < 20:
            continue
        # Remove exact duplicates
        if ex['instruction'] in seen_instructions:
            continue
        # Remove examples where response doesn't address instruction
        if not is_relevant(ex['instruction'], ex['response']):
            continue
        seen_instructions.add(ex['instruction'])
        filtered.append(ex)
    return filtered
```

## Practical Cost Analysis

Fine-tuning costs encompass compute, data preparation, evaluation, and ongoing maintenance.

### Compute Costs

For full fine-tuning, the compute requirement scales linearly with model size and dataset size. Approximate GPU-hours for single-epoch training:

| Model Size | Dataset (10K examples) | GPU Type | Approximate Time |
|-----------|----------------------|----------|-----------------|
| 350M params | 10K | A100 40GB | ~15 minutes |
| 7B params | 10K | A100 80GB | ~2-4 hours |
| 13B params | 10K | 2x A100 80GB | ~4-8 hours |
| 70B params | 10K | 8x A100 80GB | ~12-24 hours |

Cloud compute costs for A100 instances range from $1.50-$3.50/GPU-hour, making a 7B fine-tune cost roughly $5-$15 per run. API-based fine-tuning (OpenAI, Anthropic) abstracts these details but charges per training token.

### Hidden Costs

- **Data preparation**: Often 60-80% of total project time. Cleaning, formatting, deduplicating, and validating training data.
- **Hyperparameter search**: Multiple training runs to find optimal learning rate, batch size, number of epochs.
- **Evaluation infrastructure**: Automated evaluation suites, human evaluation, A/B testing.
- **Model hosting**: Serving a fine-tuned model requires dedicated inference infrastructure.
- **Maintenance**: Models degrade over time as data distributions shift, requiring periodic retraining.

## The Fine-tuning Recipe

Based on accumulated practical experience and research, here is a reliable recipe for fine-tuning transformer models:

```python
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    TrainingArguments,
    Trainer
)

model_name = "meta-llama/Llama-3-8B"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(
    model_name, num_labels=num_classes
)

training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=3,
    per_device_train_batch_size=8,
    per_device_eval_batch_size=16,
    learning_rate=2e-5,
    weight_decay=0.01,
    warmup_ratio=0.06,
    lr_scheduler_type="cosine",
    evaluation_strategy="steps",
    eval_steps=500,
    save_strategy="steps",
    save_steps=500,
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
    fp16=True,
    gradient_accumulation_steps=4,
    logging_steps=100,
    dataloader_num_workers=4,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    tokenizer=tokenizer,
)

trainer.train()
```

### Key Hyperparameters

- **Learning rate**: 1e-5 to 5e-5 for most tasks. Start with 2e-5.
- **Batch size**: As large as GPU memory allows. Use gradient accumulation to simulate larger batches.
- **Epochs**: 2-5 for most tasks. Use early stopping.
- **Weight decay**: 0.01-0.1. Helps regularization.
- **Warmup ratio**: 0.06-0.10 of total steps.
- **Max sequence length**: Match your data. Padding to max model length wastes compute.

## Summary and Key Takeaways

- **Transfer learning** is the foundation of modern NLP: pre-train on large unlabeled data, fine-tune on task-specific labeled data. Feature extraction freezes the backbone; full fine-tuning updates everything.
- **Learning rate scheduling** is critical. Use linear warmup (6-10% of steps) followed by cosine decay. Discriminative learning rates and gradual unfreezing offer finer control.
- **Catastrophic forgetting** is a real risk. Mitigate with low learning rates, short training runs, regularization toward pre-trained weights, and data mixing.
- **Fine-tuning vs. prompting** is a cost-benefit analysis. Fine-tuning wins at scale when you have sufficient data; prompting wins for flexibility and low-data regimes.
- **Data quality dominates data quantity**. One thousand high-quality examples can outperform fifty thousand noisy ones (LIMA).
- **The full fine-tuning recipe** is well-established: AdamW optimizer, cosine schedule with warmup, 2-5 epochs, learning rate around 2e-5, weight decay of 0.01. Start here and adjust based on validation metrics.
- For most practitioners working with models above 7B parameters, **parameter-efficient methods** (LoRA, QLoRA) offer a more practical path than full fine-tuning, trading minimal quality for dramatic compute savings.
