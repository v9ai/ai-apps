---
title: "Learning to Attack: A Bandit Approach to Adversarial Context Poisoning"
authors: ["Ray Telikani", "Amir H. Gandomi"]
year: 2026
venue: "ArXiv.org"
doi: ""
arxiv_id: ""
url: "http://arxiv.org/abs/2603.00567"
citations: 0
source: openalex
tier: core
query: "NeuralUCB neural contextual bandit recommendation"
tags: ["bandits", "entity-resolution"]
---

# Learning to Attack: A Bandit Approach to Adversarial Context Poisoning

**Authors.** Ray Telikani, Amir H. Gandomi

**Venue / year.** ArXiv.org · 2026

**Links.** [source](http://arxiv.org/abs/2603.00567)

**Abstract.**

Neural contextual bandits are vulnerable to adversarial attacks, where subtle perturbations to rewards, actions, or contexts induce suboptimal decisions. We introduce AdvBandit, a black-box adaptive attack that formulates context poisoning as a continuous-armed bandit problem, enabling the attacker to jointly learn and exploit the victim's evolving policy. The attacker requires no access to the victim's internal parameters, reward function, or gradient information; instead, it constructs a surrogate model using a maximum-entropy inverse reinforcement learning module from observed context-action pairs and optimizes perturbations against this surrogate using projected gradient descent. An upper confidence bound-aware Gaussian process guides arm selection. An attack-budget control mechanism is also introduced to limit detection risk and overhead. We provide theoretical guarantees, including sublinear attacker regret and lower bounds on victim regret linear in the number of attacks. Experiments on three real-world datasets (Yelp, MovieLens, and Disin) against various victim contextual bandits demonstrate that our attack model achieves higher cumulative victim regret than state-of-the-art baselines.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 
