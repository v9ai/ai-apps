# Tokenization: BPE, SentencePiece & Vocabulary Design

Tokenization is the critical interface between raw text and neural language models, yet it remains one of the most underexamined components of the LLM pipeline. The choice of tokenization algorithm, vocabulary size, and training data directly impacts model quality, inference speed, multilinguality, and even what tasks a model can perform. This article provides a deep technical examination of modern tokenization methods, from the foundational Byte-Pair Encoding algorithm through SentencePiece and tiktoken, and explores the engineering tradeoffs that shape vocabulary design decisions in production systems.

## Why Tokenization Matters

A language model does not see characters or words — it sees token IDs. Every design choice in the tokenizer cascades through the entire system:

- **Sequence length**: A tokenizer that encodes English text at 4 characters per token produces sequences half the length of one that averages 2 characters per token. Since transformer cost is $O(n^2)$ in sequence length, this directly impacts training and inference cost.
- **Vocabulary coverage**: Tokens the model has never seen during training are broken into subtokens or individual bytes, often degrading quality. Languages underrepresented in the tokenizer's training data suffer disproportionately.
- **Numerical reasoning**: How numbers are tokenized (as individual digits, multi-digit tokens, or inconsistent chunks) affects arithmetic and numerical understanding.
- **Code generation**: Whitespace handling, indentation consistency, and special character tokenization all affect code quality.

Despite its importance, tokenization is often treated as a preprocessing step and given far less attention than architecture or training methodology. As **Kudo and Richardson (2018)** noted, "the choice of subword segmentation algorithm significantly affects the quality of the resulting model."

## Byte-Pair Encoding (BPE)

Byte-Pair Encoding, originally a data compression algorithm by **Gage (1994)**, was adapted for neural machine translation by **Sennrich et al. (2016)** and has become the dominant tokenization approach for LLMs.

### Algorithm

BPE starts with a base vocabulary (typically individual characters or bytes) and iteratively merges the most frequent adjacent pair of tokens:

```python
def learn_bpe(corpus, num_merges):
    """Simplified BPE training algorithm."""
    # Initialize: split each word into characters + end-of-word marker
    vocab = {}
    for word, freq in corpus.items():
        vocab[tuple(word) + ('</w>',)] = freq

    merges = []
    for i in range(num_merges):
        # Count all adjacent pairs
        pairs = {}
        for tokens, freq in vocab.items():
            for j in range(len(tokens) - 1):
                pair = (tokens[j], tokens[j + 1])
                pairs[pair] = pairs.get(pair, 0) + freq

        if not pairs:
            break

        # Find most frequent pair
        best_pair = max(pairs, key=pairs.get)
        merges.append(best_pair)

        # Merge the best pair everywhere in the vocabulary
        new_vocab = {}
        for tokens, freq in vocab.items():
            new_tokens = []
            i = 0
            while i < len(tokens):
                if (i < len(tokens) - 1 and
                    tokens[i] == best_pair[0] and
                    tokens[i + 1] == best_pair[1]):
                    new_tokens.append(best_pair[0] + best_pair[1])
                    i += 2
                else:
                    new_tokens.append(tokens[i])
                    i += 1
            new_vocab[tuple(new_tokens)] = freq
        vocab = new_vocab

    return merges
```

At encoding time, the learned merge operations are applied greedily in the order they were learned:

```python
def encode_bpe(text, merges):
    """Apply BPE merges to tokenize text."""
    tokens = list(text) + ['</w>']

    for pair in merges:
        i = 0
        new_tokens = []
        while i < len(tokens):
            if (i < len(tokens) - 1 and
                tokens[i] == pair[0] and
                tokens[i + 1] == pair[1]):
                new_tokens.append(pair[0] + pair[1])
                i += 2
            else:
                new_tokens.append(tokens[i])
                i += 1
        tokens = new_tokens

    return tokens
```

### Properties of BPE

BPE has several characteristics that explain its dominance:

- **Deterministic given the merge table**: the same input always produces the same output, which is important for reproducibility and caching.
- **Frequency-adaptive**: common words become single tokens, while rare words are decomposed into subword units. The word "running" might be a single token, while "pneumonoultramicroscopicsilicovolcanoconiosis" would be split into several.
- **Open vocabulary**: by starting from bytes or characters, BPE can encode any input, eliminating the out-of-vocabulary problem that plagued word-level tokenizers.

## WordPiece

**WordPiece** (**Schuster and Nakajima, 2012**), used by BERT and related models, is similar to BPE but differs in its merge criterion. Instead of merging the most frequent pair, WordPiece merges the pair that maximizes the likelihood of the training data under a unigram language model:

$$\text{score}(a, b) = \frac{\text{freq}(ab)}{\text{freq}(a) \times \text{freq}(b)}$$

This tends to produce slightly different vocabularies than BPE — WordPiece prefers merges that create tokens with high mutual information rather than simply high frequency. In practice, the differences are modest for large vocabularies.

WordPiece uses a "##" prefix to denote continuation tokens (tokens that do not start a new word), e.g., "playing" might be tokenized as `["play", "##ing"]`. This explicit word boundary marking differs from BPE's approach and has implications for tasks that need to reconstruct word boundaries.

## Unigram Language Model

**Kudo (2018)** proposed the Unigram Language Model approach, which takes a fundamentally different strategy: instead of building up a vocabulary through merges, it starts with a large vocabulary and iteratively prunes it.

The algorithm:

1. Start with a large seed vocabulary (all substrings up to some length, or all frequent substrings).
2. For each candidate vocabulary, compute the optimal segmentation of the training corpus using the Viterbi algorithm under a unigram language model.
3. Remove tokens that contribute least to the corpus likelihood (measured by the increase in loss when removed).
4. Repeat until the desired vocabulary size is reached.

```python
def viterbi_tokenize(text, vocab_with_scores):
    """Find the highest-probability segmentation under a unigram model."""
    n = len(text)
    best_score = [float('-inf')] * (n + 1)
    best_score[0] = 0.0
    best_edge = [None] * (n + 1)

    for end in range(1, n + 1):
        for begin in range(end):
            substr = text[begin:end]
            if substr in vocab_with_scores:
                score = best_score[begin] + vocab_with_scores[substr]
                if score > best_score[end]:
                    best_score[end] = score
                    best_edge[end] = begin

    # Backtrack to find segmentation
    tokens = []
    pos = n
    while pos > 0:
        begin = best_edge[pos]
        tokens.append(text[begin:pos])
        pos = begin
    return list(reversed(tokens))
```

A distinctive feature of the Unigram model is that it can produce **multiple segmentations** with different probabilities, enabling **subword regularization** — sampling different segmentations during training as a form of data augmentation. **Kudo (2018)** showed this improves robustness, particularly for low-resource languages.

## SentencePiece

**SentencePiece** (**Kudo and Richardson, 2018**) is not a tokenization algorithm per se but a library and framework that treats tokenization as a language-independent, purely data-driven process. Its key innovations:

### Whitespace as a Token

SentencePiece treats the input as a raw unicode string and replaces spaces with a special unicode character (U+2581, the "lower one-eighth block" character, rendered as `_`). This means whitespace is explicitly part of the vocabulary rather than being used as a word boundary:

```
Input:  "Hello World"
SentencePiece: ["_Hello", "_World"]
```

This design eliminates the need for language-specific pre-tokenization (splitting on whitespace and punctuation), making SentencePiece truly language-agnostic. Languages like Chinese, Japanese, and Thai, which do not use whitespace to separate words, are handled naturally.

### Supported Algorithms

SentencePiece supports both BPE and Unigram models as backend algorithms. In practice, most LLMs that use SentencePiece (Llama, T5, mBART) use it with BPE, while some use the Unigram model.

### Byte Fallback

SentencePiece's byte fallback mode ensures that any unicode character can be encoded by falling back to individual bytes when a character is not in the vocabulary. This is implemented by adding 256 byte tokens (`<0x00>` through `<0xFF>`) to the vocabulary. The byte fallback ensures complete coverage without needing an `<unk>` token.

## tiktoken and GPT Tokenization

OpenAI's **tiktoken** is a fast BPE implementation used by GPT-3.5, GPT-4, and related models. Its key characteristics:

### Byte-Level BPE

tiktoken operates on bytes rather than unicode characters. The input text is first encoded to UTF-8, and BPE operates on the byte sequence. This automatically handles any unicode input without requiring a separate byte fallback mechanism.

### Regex-Based Pre-Tokenization

Before applying BPE, tiktoken splits the input using a regex pattern that separates text into categories:

```python
# Approximate GPT-4 pre-tokenization pattern
import regex
GPT4_PATTERN = r"""'(?i:[sdmt]|ll|ve|re)|[^\r\n\p{L}\p{N}]?+\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]++[\r\n]*|\s*[\r\n]|\s+(?!\S)|\s+"""
```

This pre-tokenization step prevents BPE from merging tokens across certain boundaries — for example, it prevents a space at the end of one word from merging with the first letter of the next word. This produces more linguistically sensible tokens.

### Performance

tiktoken is implemented in Rust and is significantly faster than the original Python BPE implementations. Tokenization speed matters at serving time, where every millisecond of latency counts, and during data preprocessing for training, where trillions of tokens must be encoded.

```python
import tiktoken

enc = tiktoken.encoding_for_model("gpt-4")
tokens = enc.encode("Hello, world! This is a test.")
print(f"Tokens: {tokens}")
print(f"Decoded: {enc.decode(tokens)}")
print(f"Token strings: {[enc.decode([t]) for t in tokens]}")
```

## Vocabulary Size Tradeoffs

The choice of vocabulary size is one of the most consequential tokenization decisions, and there is no universally optimal answer.

### Small Vocabularies (4K-16K tokens)

- **Pro**: Smaller embedding matrices, lower memory footprint, more compositional (the model must learn to compose meaning from smaller units).
- **Con**: Longer sequences (more tokens per text), higher inference cost, potentially worse performance on tasks requiring whole-word understanding.

### Medium Vocabularies (32K-64K tokens)

- **Pro**: Good balance of sequence length and embedding size. Most modern LLMs use this range (Llama: 32K, GPT-4: ~100K, Claude: ~100K).
- **Con**: May still fragment rare words and non-English text.

### Large Vocabularies (100K-250K tokens)

- **Pro**: Shorter sequences, better coverage of multilingual text, specialized tokens for code and structured data.
- **Con**: Larger embedding matrices (which can dominate parameter count for smaller models), more tokens with very low training frequency (potentially undertrained embeddings).

### The Embedding Tax

For a model with hidden dimension $d$ and vocabulary size $V$, the embedding and output projection matrices together have $2Vd$ parameters. For a 7B model with $d = 4096$ and $V = 100000$, that is $2 \times 100000 \times 4096 = 819M$ parameters — about 12% of total parameters. For smaller models, this fraction grows, making vocabulary size a critical architectural parameter.

## Multilingual Tokenization Challenges

Tokenization quality varies dramatically across languages, and this variation is a major source of cross-lingual performance disparities.

### The Fertility Problem

**Petrov et al. (2023)** documented that GPT-4's tokenizer requires 2-10x more tokens to encode the same semantic content in non-English languages compared to English. For example, encoding the equivalent text in Burmese or Tibetan may require 10x the tokens of English, meaning:

- Users pay 10x more per API call
- The effective context window is 10x smaller
- Latency is proportionally higher

This disparity stems from the tokenizer's training data composition. If the BPE training corpus is 90% English, the learned merges will predominantly benefit English text, and other languages will be segmented into shorter, less meaningful units.

### Addressing Multilingual Imbalance

Several approaches have been developed:

1. **Balanced training data**: ensuring the BPE training corpus has adequate representation of all target languages. **Conneau et al. (2020)** in XLM-R used exponential smoothing to upweight low-resource languages during tokenizer training.

2. **Language-specific pre-tokenization**: applying language-specific word segmentation before BPE. This helps for languages like Chinese (character segmentation) and Japanese (morphological analysis).

3. **Larger vocabularies**: increasing vocabulary size disproportionately benefits non-English languages by allowing more language-specific tokens.

4. **Separate tokenizers per language**: some multilingual systems use different tokenizers for different languages, though this complicates the model architecture.

## Special Topics in Tokenization

### Number Tokenization

How numbers are tokenized has outsized impact on arithmetic capability. If the number "12345" is tokenized as `["123", "45"]`, the model must learn that the boundary between tokens has no mathematical significance — a challenging implicit task.

Several approaches have been explored:

- **Individual digit tokenization**: always splitting numbers into individual digits, as used by some math-focused models.
- **Right-to-left digit grouping**: **Nogueira et al. (2021)** showed that reversing the digit order during tokenization improved arithmetic.
- **Fixed-width tokenization**: using consistent grouping (e.g., 3 digits per token) to align token boundaries with mathematical structure.

### Code Tokenization

Tokenizers designed for natural language often handle code poorly:

- **Indentation**: Python's significant whitespace may be tokenized inconsistently, with different numbers of spaces mapping to different token sequences.
- **Identifiers**: camelCase and snake_case variable names may be split at arbitrary points.
- **Special characters**: characters common in code (`{}`, `->`, `=>`, `::`) may not be single tokens.

Models designed for code (CodeLlama, StarCoder) typically train their tokenizers on code-heavy corpora to ensure sensible code tokenization.

### Adding Special Tokens

Modern LLMs use various special tokens for control and formatting:

```python
special_tokens = {
    "<|begin_of_text|>": "Start of document",
    "<|end_of_text|>": "End of document",
    "<|start_header_id|>": "Start of role header",
    "<|end_header_id|>": "End of role header",
    "<|eot_id|>": "End of turn",
    "<|python_tag|>": "Start of tool call",
}
```

These tokens are added to the vocabulary after BPE training and initialized with random or zero embeddings. They are learned during fine-tuning. The design of special token schemes has become an important aspect of chat model development.

## Tokenization-Free Approaches

A growing line of research seeks to eliminate the tokenization step entirely:

### Byte-Level Models

**Xue et al. (2022)** with ByT5 and **Yu et al. (2023)** with MegaByte showed that models operating directly on bytes can achieve competitive performance, particularly for multilingual and noise-robust applications.

The challenge is sequence length: byte-level sequences are 3-5x longer than token-level sequences, making the $O(n^2)$ attention cost prohibitive. MegaByte addresses this with a hierarchical architecture that processes patches of bytes locally and attends across patches globally.

### Character-Level Models

**Tay et al. (2022)** explored character-level transformers and found them competitive at sufficient scale, especially for tasks requiring character-level understanding (spelling, morphology, phonetics).

These approaches remain niche but may become more practical as attention efficiency improves (through Flash Attention, linear attention approximations, or state-space models).

## Summary and Key Takeaways

- **BPE** (Sennrich et al., 2016) remains the dominant tokenization algorithm, operating either on characters (original) or bytes (tiktoken). Its frequency-based merging produces vocabularies well-adapted to the training data distribution.
- **SentencePiece** (Kudo and Richardson, 2018) provides language-agnostic tokenization by treating whitespace as part of the vocabulary, with byte fallback for complete unicode coverage.
- **Vocabulary size** is a significant architectural parameter: larger vocabularies shorten sequences but increase the embedding parameter tax. Most modern LLMs use 32K-100K+ tokens.
- **Multilingual tokenization** remains a major challenge, with non-English languages suffering 2-10x token fertility penalties due to English-dominated tokenizer training data.
- **Number and code tokenization** have outsized impact on model capabilities in those domains. Tokenizer design choices directly affect what tasks a model can learn well.
- **Pre-tokenization** (regex-based splitting before BPE) is critical for producing linguistically sensible tokens and is a key differentiator between tokenizer implementations.
- **Tokenization-free** approaches (byte-level, character-level) are an active research area but remain impractical at scale due to sequence length costs.
- When choosing or designing a tokenizer, consider the full cost: embedding parameters, sequence length, multilingual coverage, and domain-specific needs (code, math, structured data).
