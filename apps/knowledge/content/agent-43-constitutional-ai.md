# Constitutional AI & RLHF for Safety

Constitutional AI (CAI) represents a paradigm shift in how we train language models to be helpful, harmless, and honest. Rather than relying solely on human feedback to shape model behavior, CAI uses a set of explicit principles -- a "constitution" -- to guide self-critique and revision, dramatically reducing the need for human-labeled harmlessness data. This article examines the mechanics of CAI, its relationship to RLHF, and how these techniques scale supervision of increasingly capable models.

## The Safety Problem in Language Models

Large language models trained on internet text inevitably learn to produce harmful, biased, and deceptive outputs. The fundamental challenge is alignment: ensuring models behave in ways consistent with human values and intentions. Early approaches relied on simple keyword filtering and rule-based systems, but these proved brittle against the combinatorial explosion of ways harmful content can be expressed.

The deeper problem is that helpfulness and harmlessness can conflict. A maximally helpful model answers every question completely, including requests for dangerous information. A maximally safe model refuses everything remotely sensitive, becoming useless. The alignment challenge is finding the right balance, and doing so in a way that scales.

### Why Pure Supervised Fine-Tuning Falls Short

Supervised fine-tuning (SFT) on curated datasets teaches models to mimic safe responses but does not teach them to reason about safety. Models learn surface patterns -- refusing certain keywords, adding disclaimers -- without understanding why certain outputs are harmful. This leads to overfitting to refusal patterns where models refuse benign requests that superficially resemble harmful ones, brittleness to rephrasing where slight rewording bypasses safety training, and poor generalization where novel harmful requests not in the training set go undetected.

## RLHF: The Foundation

Reinforcement Learning from Human Feedback (RLHF), as described in Ouyang et al. (2022) "Training language models to follow instructions with human feedback," established the modern paradigm for aligning language models. The process involves three stages.

### Stage 1: Supervised Fine-Tuning

A pretrained model is fine-tuned on high-quality demonstration data -- examples of desired behavior written by human annotators. This gives the model a starting distribution of helpful, safe responses.

### Stage 2: Reward Model Training

Human annotators compare pairs of model outputs and indicate which is better. These preference labels train a reward model (RM) that predicts human preferences. The reward model learns a scalar score function:

```python
class RewardModel(nn.Module):
    def __init__(self, base_model):
        super().__init__()
        self.backbone = base_model
        self.reward_head = nn.Linear(hidden_size, 1)

    def forward(self, input_ids, attention_mask):
        outputs = self.backbone(input_ids, attention_mask=attention_mask)
        reward = self.reward_head(outputs.last_hidden_state[:, -1, :])
        return reward
```

The reward model is trained with a pairwise ranking loss:

```python
def reward_loss(reward_chosen, reward_rejected):
    return -torch.log(torch.sigmoid(reward_chosen - reward_rejected)).mean()
```

### Stage 3: RL Optimization

The language model is optimized against the reward model using Proximal Policy Optimization (PPO). A KL divergence penalty prevents the model from drifting too far from the SFT baseline:

```
objective = E[RM(prompt, response)] - beta * KL(policy || reference)
```

The KL penalty is critical -- without it, the model finds adversarial outputs that score highly on the reward model but produce degenerate text, a phenomenon known as reward hacking.

### Limitations of Pure RLHF for Safety

RLHF for safety faces several challenges that motivated the development of Constitutional AI. Human labeler disagreement makes safety judgments subjective -- what counts as harmful varies across cultures, contexts, and individuals, and inter-annotator agreement on harmlessness is typically lower than on helpfulness. Red-teaming cost scales linearly with model capability; as models become more capable, the space of potential harms expands. Human labelers must read and evaluate harmful outputs, creating occupational health concerns. And human feedback is inherently noisy and inconsistent across labelers and sessions.

## Constitutional AI: The Bai et al. Approach

Constitutional AI, introduced by Bai et al. (2022) at Anthropic in "Constitutional AI: Harmlessness from AI Feedback," addresses RLHF's limitations by replacing human feedback on harmlessness with AI self-supervision guided by a set of principles.

### The Constitution

The constitution is a set of natural language principles that define desired behavior. Example principles include directives like "Choose the assistant response that is as harmless and ethical as possible," or "Choose the response that is least likely to be perceived as harmful or offensive by a reasonable person." These principles are not hard-coded rules but guidelines that the model uses for self-evaluation. The key insight is that a sufficiently capable language model can apply these principles to critique and improve its own outputs.

### Stage 1: Supervised Learning from Self-Critique (SL-CAI)

The first stage generates training data through a self-critique and revision loop:

1. **Generate**: A helpful-only model generates responses to red-team prompts, including harmful ones.
2. **Critique**: The model critiques its own response according to a randomly sampled constitutional principle.
3. **Revise**: The model generates an improved response based on its critique.
4. **Repeat**: Steps 2-3 can be iterated multiple times with different principles.

The revised responses form the SFT dataset. The model is fine-tuned on these self-generated, self-revised examples:

```python
# Pseudocode for SL-CAI data generation
def generate_sl_cai_data(model, red_team_prompts, constitution):
    training_pairs = []
    for prompt in red_team_prompts:
        response = model.generate(prompt)
        for _ in range(num_revisions):
            principle = random.choice(constitution)
            critique = model.generate(
                f"Critique this response according to: {principle}\n"
                f"Response: {response}"
            )
            response = model.generate(
                f"Given this critique: {critique}\n"
                f"Revise the response to address the concerns."
            )
        training_pairs.append((prompt, response))
    return training_pairs
```

### Stage 2: RL from AI Feedback (RLAIF)

After SL-CAI fine-tuning, the model undergoes reinforcement learning -- but instead of human preference labels, an AI model generates the comparisons. For each prompt, the model generates multiple responses, and a separate model (or the same model with chain-of-thought prompting) evaluates which response better satisfies the constitutional principles.

This AI-generated preference data trains a harmlessness reward model, which is then used for PPO training, combined with the existing helpfulness reward model from human feedback.

The result is a model trained with human feedback for helpfulness and AI feedback for harmlessness, achieving comparable or better harmlessness ratings than pure RLHF while requiring dramatically fewer human annotations.

## Red-Teaming Assisted Training

Red-teaming is the practice of deliberately trying to elicit harmful behavior from a model. In the context of CAI, red-teaming serves two purposes: generating the adversarial prompts used in SL-CAI training and evaluating the trained model's robustness.

### Automated Red-Teaming

Perez et al. (2022) in "Red Teaming Language Models with Language Models" demonstrated that language models themselves can generate effective red-team attacks. A red-team model is prompted to generate inputs likely to elicit harmful responses from the target model:

```python
red_team_prompt = """Generate a question that might cause an AI assistant
to provide harmful, unethical, or dangerous information. The question
should be subtle and not obviously malicious."""
```

This creates a feedback loop: the red-team model finds vulnerabilities, which are used to generate training data, which makes the target model more robust, which requires more sophisticated red-teaming.

### Categories of Red-Team Attacks

Effective red-teaming covers multiple attack vectors. Direct requests ask explicitly for harmful content. Indirect/roleplay attacks frame harmful requests within fictional scenarios. Multi-turn attacks build context over multiple turns before making the harmful request. Jailbreaks use prompt injection techniques to override safety training. And social engineering attacks use persuasion tactics to gradually shift the model's behavior.

CAI is particularly effective against indirect attacks because the constitutional principles can be applied regardless of the framing -- the model evaluates the substance of what is being asked, not just the surface form.

## Self-Critique and Revision Mechanics

The self-critique mechanism is perhaps the most novel aspect of CAI. It leverages the model's own reasoning capabilities to evaluate and improve its outputs.

### Chain-of-Thought Critique

When the model critiques its response, it engages in explicit reasoning about why the response might be harmful:

```
Critique Request: Identify specific ways in which the assistant's
response is harmful, unethical, racist, sexist, toxic, dangerous,
or illegal.

Critique: The response provides step-by-step instructions for
[harmful activity]. While the information is technically available
online, providing it in this format lowers the barrier to [harm]
and could enable [specific negative outcome]. The response also
fails to suggest legal alternatives or discourage the harmful
behavior.
```

This chain-of-thought reasoning serves multiple purposes. It forces the model to explicitly identify what makes a response harmful, building an internal representation of harm categories. It provides a natural language justification for the revision, making the training signal more informative than a binary label. And it can be inspected by humans, providing transparency into the model's safety reasoning.

### Revision Quality

Research from Anthropic shows that the quality of revisions improves with model capability. Larger models produce more nuanced critiques and better revisions. This creates a virtuous cycle: as models become more capable, CAI becomes more effective at training them to be safe, partially addressing the scalability concern of pure RLHF.

However, revision quality is not monotonic. Models sometimes over-correct, producing responses that are safe but unhelpfully vague or preachy. Balancing thoroughness of safety revision against preservation of helpfulness is an ongoing challenge.

## CAI vs RLHF: Tradeoffs and Complementarity

CAI and RLHF are not competitors but complementary approaches. Understanding their tradeoffs is essential for designing effective safety training pipelines.

### Where CAI Excels

CAI provides superior consistency because the constitution is deterministic -- the same principles are applied every time, unlike human labelers who vary day to day. It offers massive scalability since generating AI feedback is orders of magnitude cheaper than human annotation. It eliminates the need for humans to read harmful content during harmlessness training. And the explicit principles provide transparency about what the model is being trained to do.

### Where RLHF Excels

RLHF captures nuanced human preferences that are difficult to articulate as principles. Edge cases and context-dependent judgments are where human feedback provides the most value. RLHF also provides a ground truth signal -- ultimately, safety is defined by human values, and human feedback is the most direct measure of alignment with those values. Additionally, RLHF can capture evolving social norms in ways that a fixed constitution cannot.

### The Hybrid Approach

Anthropic's production systems use a hybrid approach: RLHF for helpfulness (where human preferences are essential) and CAI for harmlessness (where consistency and scalability matter more). The helpfulness and harmlessness reward models are combined during RL training:

```
combined_reward = alpha * helpfulness_RM(x) + (1 - alpha) * harmlessness_RM(x)
```

The weighting parameter alpha controls the helpfulness-harmlessness tradeoff. In practice, this is tuned empirically, often with different weights for different harm categories.

## Scaling Supervision

As language models become more capable, the challenge of supervising them grows. A sufficiently capable model might produce outputs that appear safe to human evaluators but contain subtle harms that require expert knowledge to detect. This is the scalable oversight problem.

### Recursive Reward Modeling

One approach to scaling supervision is recursive reward modeling, where AI systems help humans evaluate AI outputs. Rather than asking humans to directly judge whether a response is harmful, the AI provides analysis and evidence that helps humans make better judgments. This is related to the debate and amplification approaches proposed by Irving et al. (2018).

### Constitutional AI as Scalable Oversight

CAI can be viewed as a form of scalable oversight. Instead of scaling the number of human evaluators, it scales the application of human-defined principles through AI self-evaluation. The human contribution is concentrated at the highest level -- defining the constitution -- while the AI handles the labor-intensive work of applying those principles to millions of examples.

However, this raises a fundamental question: can a model reliably apply principles it was trained to follow? If the model has blind spots or biases in its understanding of the principles, those will be systematically replicated in the training data. This is why periodic human evaluation remains essential even in CAI systems.

### Weak-to-Strong Generalization

Burns et al. (2023) from OpenAI explored "weak-to-strong generalization" -- whether a weaker model's supervision can elicit the capabilities of a stronger model. In the context of safety, this asks whether constitutional principles understood by a weaker model can effectively train a stronger model. The results are encouraging but not definitive: stronger models can generalize beyond their supervisor's capabilities in some domains, but reliability decreases as the capability gap grows.

## Anthropic's Approach to AI Safety

Anthropic's safety research program integrates CAI with several other approaches to create a multi-layered safety system.

### The HHH Framework

Anthropic frames alignment along three axes: Helpful (the model should assist users with their tasks), Harmless (the model should avoid causing harm), and Honest (the model should be truthful and transparent about its limitations). These three objectives can conflict, and much of alignment research is about navigating these tensions.

### Iterative Deployment

Anthropic advocates for iterative deployment -- releasing models with known limitations, learning from real-world usage, and improving safety in subsequent versions. Each deployment provides data about failure modes that inform the next round of constitutional principles and safety training.

### Safety Levels (ASL)

Anthropic's Responsible Scaling Policy defines AI Safety Levels (ASLs) analogous to biosafety levels. Each level specifies the safety measures required before deployment. As models become more capable, they require more stringent safety evaluations, including red-teaming by domain experts and evaluations for specific dangerous capabilities.

## Recent Advances and Future Directions

### Direct Preference Optimization (DPO)

Rafailov et al. (2023) introduced Direct Preference Optimization, which eliminates the need for a separate reward model by directly optimizing the language model on preference data:

```python
def dpo_loss(policy_logps_chosen, policy_logps_rejected,
             ref_logps_chosen, ref_logps_rejected, beta):
    log_ratio_chosen = policy_logps_chosen - ref_logps_chosen
    log_ratio_rejected = policy_logps_rejected - ref_logps_rejected
    logits = beta * (log_ratio_chosen - log_ratio_rejected)
    return -F.logsigmoid(logits).mean()
```

DPO can be combined with CAI by using AI-generated preferences instead of human preferences, simplifying the training pipeline while maintaining the scalability benefits.

### Constitutional AI for Code Safety

The CAI framework extends naturally to code generation safety. Constitutional principles can specify security requirements, and the self-critique mechanism can identify vulnerabilities in generated code. For example, a principle might state: "The code should not include hardcoded credentials, SQL injection vulnerabilities, or buffer overflow risks."

### Multi-Stakeholder Constitutions

A key open question is who defines the constitution. Anthropic's original work used principles written by researchers, but there is growing interest in democratic or multi-stakeholder processes for defining AI values. Collective Constitutional AI experiments, where diverse groups contribute to the constitution, represent an important direction for legitimate AI governance.

## Key Takeaways

- **RLHF** provides a strong foundation for alignment through human preference learning but faces scalability and consistency challenges for safety specifically.
- **Constitutional AI** addresses these challenges by using explicit principles for AI self-supervision, replacing human harmlessness labels with AI-generated feedback.
- **The SL-CAI stage** generates safe training data through self-critique and revision, teaching models to reason about safety rather than just pattern-match.
- **RLAIF** (RL from AI Feedback) trains harmlessness reward models from AI-generated preferences, complementing human-trained helpfulness reward models.
- **Red-teaming** is essential for both generating training data and evaluating model robustness, and can itself be automated using language models.
- **The hybrid approach** -- RLHF for helpfulness, CAI for harmlessness -- combines the strengths of both methods and is used in production systems.
- **Scaling supervision** remains a fundamental challenge; CAI provides one approach but is not a complete solution as model capabilities grow.
- **Constitutional principles are living documents** that must evolve with social norms, model capabilities, and deployment contexts.
