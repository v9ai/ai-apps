# Interpretability & Explainability: Mechanistic & Feature-Level Analysis

Understanding what happens inside neural networks -- why they produce specific outputs for specific inputs -- remains one of the most important open problems in AI. Interpretability research aims to reverse-engineer the computations learned by neural networks, moving from treating models as black boxes to understanding their internal mechanisms. This article covers the frontier of interpretability research, from mechanistic interpretability and circuit discovery to practical explainability techniques for production systems.

## The Interpretability Spectrum

Interpretability and explainability are often used interchangeably, but they represent different goals. Interpretability seeks to understand the internal mechanisms of a model -- what computations it performs and why. Explainability seeks to provide human-understandable reasons for a model's outputs, without necessarily understanding the internal mechanism. A faithful explanation describes what the model actually does; a plausible explanation is one that humans find convincing, whether or not it is faithful.

The distinction matters for safety. An unfaithful explanation -- one that sounds right but does not reflect the model's actual reasoning -- can be worse than no explanation at all, because it creates a false sense of understanding. Mechanistic interpretability aims for faithful explanations by directly analyzing the model's computational structure.

### Why Interpretability Matters

For production AI systems, interpretability serves multiple purposes. Debugging enables identifying why a model fails on specific inputs, which is essential for systematic improvement rather than whack-a-mole patching. Safety verification allows confirming that models are not using prohibited features (such as race or gender) for decisions, even when those features are not explicit inputs. Trust calibration lets users and operators understand when to trust model outputs and when to seek verification. Regulatory compliance satisfies requirements like the EU AI Act's right to explanation for high-risk AI systems. And scientific understanding advances our understanding of how neural networks learn and represent knowledge.

## Mechanistic Interpretability

Mechanistic interpretability, pioneered by researchers at Anthropic, OpenAI, and academic labs, treats neural networks as objects to be reverse-engineered. Rather than probing models with inputs and observing outputs, it examines the weights, activations, and computational structure directly.

### Circuits

Olah et al. (2020) in "Zoom In: An Introduction to Circuits" introduced the circuits framework for understanding neural networks. The key claim is that neural networks can be understood as compositions of features (meaningful directions in activation space) connected by circuits (subgraphs of the network that implement specific computations).

A circuit is a minimal subgraph of the network that explains a specific behavior. For example, in a vision model, a "curve detection circuit" might consist of edge-detecting neurons in early layers connected to curve-detecting neurons in middle layers through specific weight patterns.

In transformer language models, circuits have been identified for tasks such as indirect object identification (Wang et al., 2022, "Interpretability in the Wild"), greater-than comparison (Hanna et al., 2023), and induction heads for in-context learning (Olsson et al., 2022, "In-context Learning and Induction Heads").

### The Induction Head Circuit

Induction heads, described by Olsson et al. (2022), are one of the best-understood circuits in transformer language models. They implement a simple but powerful pattern: if the model has seen the sequence [A][B] earlier in the context, and it encounters [A] again, an induction head will predict [B].

The circuit involves two attention heads working together:

```
Previous token head (Layer L):
  - Attends from position i to position i-1
  - Copies the previous token's information into position i

Induction head (Layer L+1):
  - Attends from position j to positions where the current token
    appeared previously
  - Uses the information copied by the previous token head to
    predict the next token
```

This two-layer circuit is responsible for a significant portion of in-context learning capability. Its discovery illustrates the power of mechanistic analysis: a seemingly complex capability (in-context learning) is implemented by a relatively simple circuit.

### Superposition

Superposition is the phenomenon where neural networks represent more features than they have dimensions. Elhage et al. (2022) in "Toy Models of Superposition" showed that when features are sparse (only a few are active for any given input), networks can encode many more features than the number of neurons by using non-orthogonal directions in activation space.

This has profound implications for interpretability. If each neuron corresponded to one feature, interpretation would be straightforward -- look at which neurons activate. But superposition means individual neurons are polysemantic, responding to multiple unrelated features. A single neuron might activate for both "academic citations" and "legal language" because these features rarely co-occur in the same input.

```python
# Simplified illustration of superposition
import torch

def demonstrate_superposition():
    # 5 features represented in 2 dimensions (superposition)
    n_features = 5
    n_dimensions = 2

    # Features are sparse: only 1-2 active at a time
    feature_probability = 0.2

    # The model learns non-orthogonal directions
    feature_directions = torch.randn(n_features, n_dimensions)
    feature_directions = feature_directions / feature_directions.norm(dim=1, keepdim=True)

    # Features interfere with each other
    interference = feature_directions @ feature_directions.T
    print("Feature interference matrix:")
    print(interference)
    # Off-diagonal elements show how much features interfere
    # With sparse features, this interference is tolerable
```

Understanding superposition is essential because it explains why individual neurons are difficult to interpret and motivates the development of techniques like sparse autoencoders that can disentangle superposed features.

## Sparse Autoencoders for Feature Discovery

Sparse autoencoders (SAEs) have emerged as a primary tool for discovering interpretable features in neural networks. The key insight is that while individual neurons are polysemantic (due to superposition), the model's internal representations can be decomposed into a larger set of monosemantic features using an overcomplete sparse dictionary.

### Architecture and Training

An SAE is trained to reconstruct a model's internal activations using a sparse, overcomplete representation:

```python
class SparseAutoencoder(nn.Module):
    def __init__(self, d_model: int, n_features: int):
        super().__init__()
        # Encoder: map from model dimensions to feature dimensions
        self.encoder = nn.Linear(d_model, n_features, bias=True)
        # Decoder: map from feature dimensions back to model dimensions
        self.decoder = nn.Linear(n_features, d_model, bias=True)
        # n_features >> d_model (overcomplete)

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        # Encode to sparse feature activations
        feature_acts = torch.relu(self.encoder(x))
        # Decode back to model space
        reconstructed = self.decoder(feature_acts)
        return reconstructed, feature_acts

    def loss(self, x: torch.Tensor) -> torch.Tensor:
        reconstructed, feature_acts = self.forward(x)
        # Reconstruction loss
        reconstruction_loss = (x - reconstructed).pow(2).mean()
        # Sparsity penalty (L1 on feature activations)
        sparsity_loss = feature_acts.abs().mean()
        return reconstruction_loss + self.lambda_sparse * sparsity_loss
```

The L1 penalty encourages sparse activations -- most features should be inactive for any given input. This pushes the autoencoder to find monosemantic features: each feature should activate for one specific, interpretable concept.

### Anthropic's Interpretability Research with SAEs

Anthropic's "Scaling Monosemanticity" research (Templeton et al., 2024) applied sparse autoencoders to Claude 3 Sonnet, discovering millions of interpretable features. Key findings include:

**Features represent concepts at multiple levels of abstraction**. Some features correspond to simple concepts (specific languages, geographic locations), while others capture abstract concepts (deception, sycophancy, code security vulnerabilities).

**Features are causally relevant**. Artificially activating or suppressing specific features changes model behavior in predictable ways. Activating a "Golden Gate Bridge" feature causes the model to mention the bridge in unrelated contexts. Suppressing a "deception" feature reduces the model's tendency to produce misleading outputs.

**Feature geography reveals model organization**. Related features cluster together in the feature space, revealing how the model organizes knowledge internally.

```python
def analyze_sae_features(sae, model, dataset):
    """Identify and characterize discovered features."""
    feature_examples = defaultdict(list)

    for batch in dataset:
        activations = model.get_activations(batch, layer=target_layer)
        _, feature_acts = sae(activations)

        # For each active feature, record the input that activated it
        for sample_idx in range(batch.size(0)):
            active_features = torch.nonzero(
                feature_acts[sample_idx] > threshold
            ).squeeze()
            for feat_idx in active_features:
                feature_examples[feat_idx.item()].append({
                    "text": batch.text[sample_idx],
                    "activation": feature_acts[sample_idx, feat_idx].item(),
                })

    # Characterize each feature by its top-activating examples
    feature_descriptions = {}
    for feat_idx, examples in feature_examples.items():
        top_examples = sorted(
            examples, key=lambda x: x["activation"], reverse=True
        )[:20]
        feature_descriptions[feat_idx] = {
            "top_examples": top_examples,
            "activation_frequency": len(examples) / len(dataset),
            "mean_activation": np.mean([e["activation"] for e in examples]),
        }

    return feature_descriptions
```

## Probing Classifiers

Probing is a technique for determining what information is encoded in a model's internal representations. A probe is a simple classifier (typically linear) trained to predict a property of interest from the model's hidden states.

### Linear Probes

The key insight behind linear probing is that if a linear classifier can accurately predict a property from hidden states, that property is likely represented in a linearly accessible way:

```python
class LinearProbe(nn.Module):
    def __init__(self, d_model: int, n_classes: int):
        super().__init__()
        self.linear = nn.Linear(d_model, n_classes)

    def forward(self, hidden_states: torch.Tensor) -> torch.Tensor:
        return self.linear(hidden_states)

def train_probe(model, probe, dataset, property_labels):
    """Train a probe to predict a property from model hidden states."""
    optimizer = torch.optim.Adam(probe.parameters(), lr=1e-3)

    for epoch in range(num_epochs):
        for batch, labels in zip(dataset, property_labels):
            # Get hidden states from frozen model
            with torch.no_grad():
                hidden_states = model.get_hidden_states(batch, layer=target_layer)

            # Train probe
            predictions = probe(hidden_states)
            loss = F.cross_entropy(predictions, labels)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

    return probe
```

Probes have been used to investigate numerous questions about model representations. Tenney et al. (2019) in "BERT Rediscovers the Classical NLP Pipeline" showed that different layers of BERT encode different linguistic properties: part-of-speech in early layers, syntactic structure in middle layers, and semantic information in later layers. Li et al. (2023) used probes to show that language models develop internal "world models" -- linear probes can decode the state of a game board from a model trained only on game transcripts.

### Limitations of Probing

Probing has a fundamental limitation identified by Hewitt and Liang (2019) in "Designing and Interpreting Probes with Control Tasks": a sufficiently powerful probe can learn the property itself rather than detecting it in the representations. If a nonlinear probe achieves high accuracy, it might be computing the answer rather than reading it from the hidden states. This is why linear probes are preferred -- they limit the probe's computational power, ensuring that high accuracy reflects information genuinely present in the representations.

## Attention Visualization

Attention patterns provide one of the most intuitive windows into transformer behavior. Each attention head produces a matrix of attention weights showing how much each token attends to every other token.

### Attention Analysis

```python
def extract_attention_patterns(model, tokenizer, text: str) -> dict:
    """Extract and analyze attention patterns from a transformer model."""
    inputs = tokenizer(text, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs, output_attentions=True)

    attentions = outputs.attentions  # tuple of (batch, heads, seq, seq)
    tokens = tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])

    analysis = {}
    for layer_idx, layer_attention in enumerate(attentions):
        layer_analysis = {}
        for head_idx in range(layer_attention.size(1)):
            head_attn = layer_attention[0, head_idx].numpy()

            # Identify attention patterns
            pattern = classify_attention_pattern(head_attn)
            layer_analysis[f"head_{head_idx}"] = {
                "pattern_type": pattern,
                "entropy": compute_attention_entropy(head_attn),
                "top_attended_pairs": get_top_attention_pairs(
                    head_attn, tokens, top_k=5
                ),
            }
        analysis[f"layer_{layer_idx}"] = layer_analysis

    return analysis

def classify_attention_pattern(attn_matrix: np.ndarray) -> str:
    """Classify common attention patterns."""
    n = attn_matrix.shape[0]

    # Check for diagonal pattern (attend to self)
    diag_mass = np.trace(attn_matrix) / n
    if diag_mass > 0.5:
        return "self_attention"

    # Check for previous token pattern
    subdiag_mass = sum(attn_matrix[i, i-1] for i in range(1, n)) / (n - 1)
    if subdiag_mass > 0.5:
        return "previous_token"

    # Check for first token pattern (often [CLS] or [BOS])
    first_token_mass = np.mean(attn_matrix[:, 0])
    if first_token_mass > 0.5:
        return "first_token"

    # Check for uniform pattern
    expected_uniform = 1.0 / n
    uniformity = 1 - np.std(attn_matrix) / expected_uniform
    if uniformity > 0.8:
        return "uniform"

    return "mixed"
```

### Limitations of Attention as Explanation

Jain and Wallace (2019) in "Attention is not Explanation" raised important concerns about using attention weights as explanations. They showed that alternative attention distributions can produce the same predictions, meaning attention weights are not uniquely informative about the model's reasoning. Wiegreffe and Pinter (2019) in "Attention is not not Explanation" provided a more nuanced view: attention weights do carry some information about model behavior, but they should not be treated as faithful explanations of individual predictions.

For practical purposes, attention visualization is most useful for identifying broad patterns (which tokens the model focuses on) rather than explaining specific predictions.

## Feature Attribution Methods

Feature attribution methods assign importance scores to input features, answering "which parts of the input were most important for this output?"

### SHAP (SHapley Additive exPlanations)

Lundberg and Lee (2017) unified several existing explanation methods under the framework of Shapley values from cooperative game theory. The Shapley value of a feature is its average marginal contribution across all possible feature coalitions:

```python
import shap

def explain_with_shap(model, tokenizer, text: str) -> dict:
    """Compute SHAP values for each token's contribution to the output."""
    def model_predict(texts):
        inputs = tokenizer(texts, return_tensors="pt", padding=True)
        with torch.no_grad():
            outputs = model(**inputs)
        return outputs.logits.numpy()

    explainer = shap.Explainer(model_predict, tokenizer)
    shap_values = explainer([text])

    tokens = tokenizer.tokenize(text)
    token_importance = list(zip(tokens, shap_values.values[0].tolist()))

    return {
        "token_attributions": token_importance,
        "base_value": shap_values.base_values[0],
    }
```

SHAP has theoretical guarantees (efficiency, symmetry, dummy, additivity) that other attribution methods lack, but computing exact Shapley values is exponential in the number of features. For text with hundreds of tokens, approximations like KernelSHAP or partition-based methods are necessary.

### Integrated Gradients

Sundararajan et al. (2017) in "Axiomatic Attribution for Deep Networks" proposed integrated gradients, which computes feature importance by integrating gradients along a path from a baseline input to the actual input:

```python
def integrated_gradients(
    model, input_embedding, baseline_embedding, n_steps: int = 50
) -> torch.Tensor:
    """Compute integrated gradients attribution."""
    # Generate interpolated inputs
    alphas = torch.linspace(0, 1, n_steps).unsqueeze(1).unsqueeze(2)
    interpolated = baseline_embedding + alphas * (
        input_embedding - baseline_embedding
    )

    # Compute gradients at each interpolation step
    interpolated.requires_grad_(True)
    outputs = model(inputs_embeds=interpolated)

    # Target: probability of the predicted class
    target = outputs.logits.max(dim=-1).values
    target.sum().backward()

    # Integrate gradients
    gradients = interpolated.grad  # (n_steps, seq_len, d_model)
    avg_gradients = gradients.mean(dim=0)  # (seq_len, d_model)

    # Attribution = (input - baseline) * average gradient
    attributions = (input_embedding - baseline_embedding) * avg_gradients

    # Aggregate across embedding dimensions
    token_attributions = attributions.sum(dim=-1)  # (seq_len,)

    return token_attributions
```

Integrated gradients satisfy completeness (attributions sum to the difference between the model's output on the input and the baseline) and sensitivity (if changing a feature changes the output, it receives non-zero attribution). The choice of baseline is critical and application-dependent -- for text, an all-zeros embedding or a padding token embedding are common choices.

### Comparing Attribution Methods

Different attribution methods can produce different explanations for the same prediction. Practitioners should use multiple methods and look for agreement, treat attributions as approximations rather than ground truth, validate attributions against domain knowledge, and consider both the method's theoretical properties and computational cost.

## Practical Explainability for Production

While mechanistic interpretability is a research endeavor, production systems need practical explainability today. Several approaches bridge the gap between research-grade interpretability and user-facing explanations.

### Attention-Based Highlighting

For retrieval-augmented systems, highlighting which source passages most influenced the response provides useful transparency:

```python
class ExplainableRAGSystem:
    def __init__(self, model, retriever):
        self.model = model
        self.retriever = retriever

    def generate_with_explanation(self, query: str) -> dict:
        # Retrieve documents
        docs = self.retriever.retrieve(query, top_k=5)

        # Generate response with attention tracking
        response, attention_data = self.model.generate_with_attention(
            query=query,
            context=docs
        )

        # Identify which context chunks received highest attention
        chunk_importance = self.compute_chunk_importance(
            attention_data, docs
        )

        # Generate natural language explanation
        explanation = self.generate_explanation(
            query, response, chunk_importance
        )

        return {
            "response": response,
            "sources": [
                {
                    "text": doc.text,
                    "relevance_score": chunk_importance[i],
                    "metadata": doc.metadata,
                }
                for i, doc in enumerate(docs)
            ],
            "explanation": explanation,
        }

    def generate_explanation(self, query, response, importance) -> str:
        """Generate a natural language explanation of the response."""
        top_sources = sorted(
            enumerate(importance), key=lambda x: x[1], reverse=True
        )[:3]

        explanation_parts = ["This response was primarily based on:"]
        for idx, score in top_sources:
            explanation_parts.append(
                f"- Source {idx + 1} (relevance: {score:.0%})"
            )

        return "\n".join(explanation_parts)
```

### Counterfactual Explanations

Counterfactual explanations answer "what would need to change in the input for the output to be different?" This is often more useful to users than feature importance scores:

```python
def generate_counterfactual(
    model, original_input: str, original_output: str
) -> list[dict]:
    """Generate counterfactual explanations."""
    counterfactuals = []

    # Identify key entities and phrases
    key_phrases = extract_key_phrases(original_input)

    for phrase in key_phrases:
        # Generate alternative inputs with phrase removed/changed
        modified_input = original_input.replace(phrase, "[REMOVED]")
        modified_output = model.generate(modified_input)

        if significantly_different(original_output, modified_output):
            counterfactuals.append({
                "original_phrase": phrase,
                "impact": "Removing this phrase changes the response",
                "original_output_summary": summarize(original_output),
                "counterfactual_output_summary": summarize(modified_output),
            })

    return sorted(counterfactuals, key=lambda x: x["impact"], reverse=True)
```

### Confidence Communication

Transparently communicating model confidence is a form of explainability that helps users calibrate their trust:

```python
class ConfidenceExplainer:
    def explain_confidence(
        self, response: str, confidence_score: float,
        confidence_signals: dict
    ) -> str:
        """Generate human-readable confidence explanation."""
        if confidence_score > 0.9:
            level = "high"
            qualifier = "I'm quite confident about this"
        elif confidence_score > 0.7:
            level = "moderate"
            qualifier = "I'm fairly confident, but you may want to verify"
        elif confidence_score > 0.5:
            level = "low"
            qualifier = "I'm not fully certain about this"
        else:
            level = "very low"
            qualifier = "I have significant uncertainty about this"

        reasons = []
        if confidence_signals.get("source_grounding", 0) > 0.8:
            reasons.append("the answer is well-supported by the provided sources")
        if confidence_signals.get("self_consistency", 0) > 0.9:
            reasons.append("multiple reasoning paths lead to the same answer")
        if confidence_signals.get("knowledge_recency", 0) < 0.5:
            reasons.append(
                "this topic may have changed since my training data"
            )

        explanation = f"{qualifier}. "
        if reasons:
            explanation += "This is because " + ", and ".join(reasons) + "."

        return explanation
```

## The Frontier: Open Problems

Several open problems define the frontier of interpretability research.

**Scaling interpretability** to frontier models remains challenging. SAE-based analysis of Claude 3 Sonnet discovered millions of features, but interpreting them requires significant human effort. Automated interpretability -- using AI to interpret AI -- is an active area of research (Bills et al., 2023, "Language models can explain neurons in language models").

**Compositional understanding** of how features combine to produce complex behaviors is still in early stages. Individual features can be understood, but the circuits that compose them into higher-level computations are harder to trace.

**Faithfulness verification** -- how do we know our interpretations are correct? -- lacks a general solution. Causal interventions (ablating features and observing behavior changes) provide some validation, but comprehensive verification remains elusive.

**Interpretability for safety** is the ultimate goal: can we use interpretability to verify that models are safe before deployment? This requires not just understanding what features exist, but verifying the absence of dangerous capabilities -- a fundamentally harder problem.

## Key Takeaways

- **Mechanistic interpretability** seeks to reverse-engineer neural networks by identifying features (meaningful directions in activation space) and circuits (subgraphs implementing specific computations).
- **Superposition** means neurons are polysemantic, representing multiple features in overlapping directions. This is a fundamental challenge for neuron-level interpretation.
- **Sparse autoencoders** decompose superposed representations into monosemantic features, enabling the discovery of interpretable concepts at scale. Anthropic's work has demonstrated this at the scale of frontier models.
- **Probing classifiers** determine what information is encoded in hidden states, but linear probes are preferred to avoid the probe learning the task itself.
- **Attention visualization** provides intuitive insights but is not a faithful explanation of model behavior -- alternative attention patterns can produce identical outputs.
- **Feature attribution methods** (SHAP, integrated gradients) assign importance scores to input features. Use multiple methods and validate against domain knowledge.
- **Production explainability** should focus on practical techniques: source highlighting, counterfactual explanations, and transparent confidence communication.
- **The frontier** involves scaling interpretability to frontier models, understanding compositional circuits, and using interpretability for safety verification.
