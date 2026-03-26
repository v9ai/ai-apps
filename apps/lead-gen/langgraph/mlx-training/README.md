# MLX Local Inference for nomadically.work

Local ML inference on Apple Silicon (M1 16GB) replacing DeepSeek/Claude API calls.

## What's Here

### Contact Scoring — `score_ai_recruiters.py`

Scores 9,148 contacts using MLX Metal GPU embeddings to find AI recruiters.

```bash
# Score all contacts and tag in Neon DB
cd langgraph
python3 mlx-training/score_ai_recruiters.py --tag-db

# Export tier 1+2 to CSV
python3 mlx-training/score_ai_recruiters.py --csv mlx-training/ai_recruiters.csv

# Show top 50 only
python3 mlx-training/score_ai_recruiters.py --top 50
```

- Uses `all-MiniLM-L6-v2` via `mlx-embeddings` on Metal GPU (~4,600 texts/sec warm)
- Keyword boosts for AI recruiter titles, AI companies, EU/EMEA region
- Crypto/Web3 penalty (-0.30), non-recruiter penalty (-0.12)
- Tags contacts as `ai-recruiter-tier-1` / `ai-recruiter-tier-2` in Neon
- Results: 536 Tier 1, 2,007 Tier 2, 413 outreach-ready (verified email + Tier 1)

### Email Generation — Local LLM via `mlx_lm.server`

Replaces DeepSeek API for the email outreach pipeline (3 calls per email: analyze_post, draft_email, refine_email).

```bash
# Terminal 1: Start local LLM on Metal GPU
python3 -m mlx_lm.server --model mlx-community/Qwen2.5-3B-Instruct-4bit --port 8080

# Terminal 2: Run email outreach with local model
DEEPSEEK_BASE_URL=http://localhost:8080/v1 \
DEEPSEEK_API_KEY=local \
DEEPSEEK_MODEL=default_model \
  .venv/bin/python -m cli email-outreach --post-url "https://linkedin.com/..."
```

- Qwen2.5-3B-Instruct-4bit (~1.8GB) — good JSON instruction following
- If quality is insufficient, upgrade: `mlx-community/Qwen2.5-7B-Instruct-4bit` (~4.5GB)
- Pipeline auto-detects localhost and skips `response_format` (unsupported by mlx_lm.server)
- Prompts reinforced with `CRITICAL: Respond with ONLY a valid JSON object`
- Existing `json.loads()` fallback blocks handle any parse failures

### Files Modified

| File | Change |
|------|--------|
| `src/graphs/email_outreach/nodes.py` | `_get_llm_json()` skips `response_format` for localhost |
| `src/graphs/email_outreach/prompts.py` | All 4 prompts: JSON-only reinforcement |

## Benchmarks (M1 MacBook Pro, 16GB)

| Task | Backend | Speed |
|------|---------|-------|
| Embed 9,148 contacts | CPU (torch) | 7.75s (1,181/sec) |
| Embed 9,148 contacts | MPS (torch Metal) | 3.04s (3,013/sec) |
| Embed 9,148 contacts | **MLX Metal (warm)** | **1.98s (4,618/sec)** |
| Email generation (3 calls) | DeepSeek API | ~3-5s + API cost |
| Email generation (3 calls) | **MLX local (Qwen 3B)** | **~2-3s, $0** |

## Dependencies

```bash
pip3 install mlx mlx-lm mlx-embeddings mlx-metal  # MLX framework
pip3 install mlx-vlm                                # required by mlx-embeddings
pip3 install psycopg2-binary                        # Neon DB access
# sentence-transformers, torch, onnxruntime — already installed
```

## Models (downloaded to ~/.cache/huggingface/)

| Model | Size | Use |
|-------|------|-----|
| `sentence-transformers/all-MiniLM-L6-v2` | 90MB | Contact scoring embeddings |
| `mlx-community/Qwen2.5-3B-Instruct-4bit` | 1.8GB | Email generation |
| `cross-encoder/ms-marco-MiniLM-L-6-v2` | 86MB | (research-thera reranker) |
