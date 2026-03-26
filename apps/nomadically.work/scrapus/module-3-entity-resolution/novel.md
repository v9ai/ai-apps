# Novel Insights -- Module 3: Entity Resolution

## Surprising Findings

- **LLM zero-shot beats Siamese with 5,000 labeled pairs.** Zero-shot GPT-class models hit 85-92% F1 on standard ER benchmarks. The current Scrapus Siamese encoder, trained on 5,000 hand-labeled pairs, achieves 90.1% F1. The labeled data investment buys you nothing over a prompt. The crossover point where fine-tuned models pull ahead is around 10-100 few-shot examples for LLMs vs. 1,000+ for BERT-family models -- meaning the entire Siamese training pipeline is negative ROI if you have API access to a 7B+ model.

- **Schema variation is the real killer, not accuracy on clean data.** Siamese networks suffer a 45% F1 drop under schema variation (missing fields, reordered attributes, renamed columns). Transformers drop only 5-15%. This means the Scrapus Siamese encoder's 90.1% F1 on the held-out set is misleadingly optimistic -- the test set shares the same schema as training. In production, where scraped entities arrive with wildly inconsistent schemas, real F1 is likely closer to 50-60%.

- **Blocking recall is the bottleneck, not matcher quality.** The current prefix+Soundex blocking achieves ~78% recall. This means 22% of true matches never reach the matcher at all -- they are killed at the blocking stage. Replacing Soundex with SBERT-based DBSCAN blocking jumps recall to 92% while *reducing* candidate pairs by 40%. Investing in a better matcher while keeping bad blocking is optimizing the wrong stage.

- **GNN consistency catches 15-25% of errors that pairwise matchers structurally cannot.** Pairwise matchers violate transitivity: they can say A=B and B=C but miss A=C. 3-hop message passing on a resolution graph repairs these inconsistencies. This is not a marginal improvement -- it is a category of error that no amount of pairwise threshold tuning can fix.

- **Hard negative mining curriculum matters more than architecture.** The research documents show that random negatives in early epochs, online hard negatives in middle epochs, and semi-hard negatives with margin annealing in late epochs dramatically outperforms any single strategy. Pure hard negative mining from epoch 1 causes training collapse. This curriculum effect is architecture-agnostic and applies equally to Siamese, Ditto, and adapter-tuned models.

## Unconventional Techniques

- **ER as graph partitioning (ITER + CliqueRank).** Zhang et al. (2018) reframe ER as finding cliques in a record similarity graph, then rank cliques by internal density vs. external connectivity. This bypasses pairwise thresholds entirely -- instead of "is this pair a match?", you ask "does this cluster have higher internal cohesion than any alternative partitioning?" The modularity optimization objective (ModER, 2022) makes this fully unsupervised.

- **ER via LLM debate.** Not in the papers, but implied by the cascade architecture: route ambiguous pairs (SBERT cosine 0.3-0.9) to two competing LLM calls -- one prompted to argue for match, one prompted to argue against. The confidence delta between the two arguments is a better calibrated signal than a single LLM's raw probability. Cost: 2x tokens on only 20% of pairs (the ambiguous zone), so ~40% overhead on the hard tail, zero on the easy 80%.

- **Self-supervised ER pre-training via data augmentation.** Ditto's key innovation is not the transformer -- it is that you can generate synthetic training pairs by corrupting real entities (delete attributes, swap words, replace with synonyms). This turns unlabeled entity lists into labeled pair datasets. The 5,000 hand-labeled pairs in Scrapus could be replaced by 50,000 augmented pairs from the existing company table, with only 500 real labels needed for validation.

- **Blocking-aware RAG for LLM matchers (CE-RAG4EM).** Instead of prompting an LLM with a single entity pair, retrieve the entire blocking neighborhood and present it as context. The LLM sees the cluster structure and makes more consistent decisions. This reduces LLM cost by 60-75% because one call resolves an entire block rather than one pair at a time. The blocking topology itself becomes part of the prompt.

- **Confidence-based cascading as an architectural primitive.** The three-tier cascade (SBERT auto-match > 0.9 / auto-reject < 0.3 / LLM for the middle) is not just cost optimization. It is a way to get calibrated confidences from heterogeneous matchers. The SBERT tier provides well-calibrated probabilities at the extremes where neural models are reliable. The LLM tier handles the ambiguous middle where calibration matters less because a human-in-the-loop or audit log absorbs the uncertainty.

## Hidden Gems (Papers)

- **Genossar et al. (2023) "The Battleship Approach to Low Resource ER"** -- Frames active learning for ER as a Battleship game: each labeled pair "hits" or "misses" and informs where to probe next. Achieves 90% of max accuracy with 20% of labels. The key insight is that diversity sampling (covering different regions of the embedding space) matters almost as much as uncertainty sampling (probing the decision boundary). Optimal mix: 60% uncertainty + 40% diversity.

- **Arora & Dell (2024) "LinkTransformer"** -- A unified Python package that wraps transformer-based record linkage into a scikit-learn-compatible API. Not a research breakthrough, but drastically lowers implementation cost. Drop-in replacement for custom Siamese training code. Supports fine-tuning on domain-specific pairs with < 20 lines of code.

- **Ma et al. (2026) "CE-RAG4EM"** -- The first paper to formally analyze the cost-accuracy Pareto frontier of LLM-based ER. Shows that naive LLM matching is 10-50x more expensive than necessary. The blocking-aware batch retrieval trick alone cuts cost by 40%, and dynamic prompt compression (schema-aware summarization that strips irrelevant attributes) cuts another 35%.

- **Hassanzadeh et al. (2009) on per-cluster thresholds** -- Old but deeply underrated. Shows that a single global threshold is provably suboptimal when entity density varies across blocks. Per-cluster threshold estimation using intra-cluster distance distributions gives 8-12% F1 improvement over global thresholds, with no additional training data. The Scrapus static 0.05 threshold is particularly vulnerable because different industries have different name-similarity distributions.

- **Kirielle et al. (2023) "Unsupervised Graph-Based ER for Complex Entities"** -- Combines relationship structure with attribute similarity for ER without any labeled data. Uses the insight that two entities sharing multiple relational neighbors are far more likely to be the same entity than attribute similarity alone would suggest. Directly applicable to Scrapus's SQLite graph where edges encode acquisitions, employment, and product relationships.

## Contrarian Takes

- **More blocking is not always better.** The instinct to add more blocking keys (trigrams, n-grams, multiple phonetic codes) increases recall but also increases block sizes, which makes pairwise comparison quadratically more expensive. The SBERT+DBSCAN approach is better precisely because it *reduces* candidate pairs while increasing recall. Density-aware blocking self-regulates block size. The 200-candidate cap in Scrapus is a symptom of bad blocking, not a feature.

- **Siamese networks are overkill for this scale.** At 10K-100K entities with a well-designed blocking strategy, the number of candidate pairs per entity is small (< 50). At this scale, an SBERT cosine similarity check plus a few-shot LLM call for ambiguous cases will outperform a custom-trained Siamese network in accuracy, maintenance cost, and development time. Siamese networks shine at millions of entities where you need sub-millisecond inference -- that is not the Scrapus regime.

- **The Siamese 128-dim embedding is an information bottleneck.** Compressing name + location + industry into 128 floats loses cross-attribute interactions. DeBERTa's 768-dim contextualized representations capture "this name is unusual for this industry" signals that fixed-width embeddings cannot. The 128-dim choice was likely inherited from face verification literature where input dimensionality is much higher (images), making compression necessary. For text ER with 3-5 short fields, it is unnecessary lossy compression.

- **Precision > recall is the wrong default for a knowledge graph that runs multiple passes.** The README argues that false merges are worse than missed merges because "missed merges can be caught in later passes." But this assumes later passes actually happen and that the blocking index evolves. In practice, if two entities are not blocked together in pass 1, they will not be blocked together in pass N either (same blocking keys, same miss). High-recall blocking with conservative matching is strictly better than low-recall blocking with any matcher quality.

- **Contrastive loss is the wrong loss function.** Contrastive loss with a fixed margin (1.0) treats all negative pairs equally beyond the margin. Triplet loss with semi-hard mining, or the more modern InfoNCE / NT-Xent losses, produce better-calibrated embeddings because they consider the relative ordering of all negatives in the batch, not just whether each negative exceeds a margin. The contrastive loss + margin 1.0 choice in the training spec is a 2015-era default that has been superseded.

## Wild Ideas

- **Generative ER: generate the canonical entity instead of picking a winner.** Instead of deciding "is A the same as B?" and then merging fields via COALESCE, use an LLM to generate the canonical entity representation from all candidate profiles simultaneously. Prompt: "Given these 5 company profiles that may refer to the same entity, generate a single authoritative profile." This handles conflicting attributes (different founding years, different employee counts) more gracefully than COALESCE, which just picks the first non-null value with no quality assessment.

- **ER as RLHF.** Train a reward model on human merge/reject decisions. Use it to score candidate merges. Then fine-tune the matcher via PPO to maximize the reward model's score. The reward model captures implicit human preferences about merge quality that are hard to encode as rules (e.g., "humans prefer conservative merges for large companies but aggressive merges for startups"). This is feasible at Scrapus scale if the merge audit log (Production Gap #3) is implemented.

- **Entity embeddings in a shared latent space with relationships.** Instead of encoding entities independently, train a knowledge graph embedding (TransE, RotatE) on the SQLite graph. Entities that share relational structure (same acquirer, same industry cluster, overlapping employees) end up close in the latent space even if their names are dissimilar. This catches mergers, rebrands, and subsidiaries that text-based matchers miss entirely. The SQLite adjacency list is already the right input format.

- **ER via spectral clustering on the Laplacian of the similarity graph.** Build a weighted graph where edge weights are pairwise similarities from any matcher. Compute the graph Laplacian and find clusters via eigengap analysis. The number of clusters (distinct entities) emerges from the spectrum rather than being imposed by a threshold. This eliminates threshold tuning entirely and handles the transitivity problem as a side effect.

- **Adversarial ER training.** Train a generator that creates synthetic hard negatives (entity profiles that look like matches but are not) and a discriminator that tries to distinguish real matches from adversarial fakes. The generator learns the failure modes of the current matcher and produces increasingly difficult training examples. This is GAN-style training applied to pair classification rather than image generation. Particularly useful for the "same industry, different entity" failure mode that the current 30% hard negative ratio only partially addresses.

- **Temporal ER with entity lifecycle modeling.** Companies are born, merge, rebrand, split, and die. Current ER treats entities as static. Model the entity lifecycle as a hidden Markov model where states are {active, merged, rebranded, acquired, defunct} and transitions are observed events. Two entities with name similarity 0.7 are probably the same entity if one became inactive around the time the other appeared. The `company_facts` table already captures some of these events -- the signal is there but unused for matching.
