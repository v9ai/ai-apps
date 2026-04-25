---
title: lead-gen LangGraph
emoji: 🦜
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# lead-gen backend

LangGraph graphs (`email_compose`, `email_reply`, `email_outreach`,
`admin_chat`, `text_to_sql`) under `leadgen_agent/`, consumed by the Next.js
app via `src/lib/langgraph-client.ts`.

Two runtimes share the same graph code:

- **`langgraph dev`** (`langgraph.json`) — local dev server on `:8002` with
  Studio UI. In-memory checkpointer only.
- **`app.py`** (FastAPI + uvicorn) — containerized for Hugging Face Spaces on
  `:7860`, with `AsyncPostgresSaver` backed by Neon so threads survive the
  free-tier Space's sleep/wake cycle.

## Run modes

| Mode | `LANGGRAPH_URL` | `LANGGRAPH_AUTH_TOKEN` | Use |
|---|---|---|---|
| Local-only | `http://127.0.0.1:8002` (default) | unset | Frontend + backend both on your Mac |
| Tunnel, dev | Cloudflare quick-tunnel URL | unset | Throwaway demos, short-lived share |
| Tunnel, stable | Named Cloudflare tunnel hostname | set (shared secret) | Vercel-deployed frontend → local backend |
| HF Spaces | `https://<user>-<space>.hf.space` | set (shared secret) | Vercel-deployed frontend → always-on HF container |

Everything boots with `pnpm backend-dev` from the repo root. The bearer-token
middleware lives in `leadgen_agent/custom_app.py` and is wired in via the
`http.app` field in `langgraph.json`; it is a no-op when
`LANGGRAPH_AUTH_TOKEN` is unset.

## Local-only

```bash
pnpm backend-dev          # binds :8002
pnpm dev                  # Next.js on :3004
```

## Tunnel to a Vercel-deployed frontend

1. **Pick a secret** and put it in `backend/.env` and in Vercel:

   ```bash
   token=$(openssl rand -hex 32)
   echo "LANGGRAPH_AUTH_TOKEN=$token" >> backend/.env
   vercel env add LANGGRAPH_AUTH_TOKEN production  # paste $token
   ```

2. **Start the backend** (the middleware now enforces the bearer check):

   ```bash
   pnpm backend-dev
   ```

3. **Start the tunnel** in another terminal:

   ```bash
   make tunnel          # quick tunnel — random *.trycloudflare.com URL
   # or, once bootstrapped:
   make tunnel-named    # stable hostname
   ```

4. **Point Vercel at the tunnel URL** (copy from the `cloudflared` output):

   ```bash
   vercel env add LANGGRAPH_URL production
   # paste: https://<your-tunnel>.trycloudflare.com
   ```

5. **Redeploy** so the new env is picked up:

   ```bash
   pnpm deploy
   ```

### Verify

```bash
# Should 401
curl -X POST "$LANGGRAPH_URL/runs/wait" \
  -H 'content-type: application/json' \
  -d '{"assistant_id":"admin_chat","input":{"prompt":"ping","system":""}}'

# Should 200
curl -X POST "$LANGGRAPH_URL/runs/wait" \
  -H "authorization: Bearer $LANGGRAPH_AUTH_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"assistant_id":"admin_chat","input":{"prompt":"ping","system":""}}'
```

## Named tunnel bootstrap (one-time)

Quick tunnels are fine, but the random URL churns on every restart. For a
stable hostname you control:

```bash
brew install cloudflared
cloudflared tunnel login                           # opens browser, picks a zone
cloudflared tunnel create leadgen-backend          # stores creds in ~/.cloudflared
cloudflared tunnel route dns leadgen-backend \
  leadgen-backend.<your-domain>                    # adds a CNAME in Cloudflare
```

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: leadgen-backend
credentials-file: /Users/<you>/.cloudflared/<tunnel-uuid>.json
ingress:
  - hostname: leadgen-backend.<your-domain>
    service: http://localhost:8002
  - service: http_status:404
```

Then `make tunnel-named` runs it; the hostname stays put across restarts, so
`LANGGRAPH_URL` in Vercel never has to change.

## Ngrok alternative

```bash
ngrok http 8002
# or with HTTP basic auth instead of bearer token:
ngrok http 8002 --basic-auth "user:pass"
```

Copy the `https://*.ngrok-free.app` URL into Vercel's `LANGGRAPH_URL`. If you
stick with ngrok basic-auth rather than our bearer middleware, unset
`LANGGRAPH_AUTH_TOKEN` in Vercel and include `user:pass@` in the URL itself.

## Deploy to Hugging Face Spaces

Always-on alternative to the tunnel. HF Spaces Docker SDK runs the Dockerfile
in this directory; `app.py` binds `0.0.0.0:7860` (the only port Spaces
exposes) and uses Neon Postgres for the `AsyncPostgresSaver` checkpointer so
threads persist across the free-tier Space's sleep/wake cycle.

### One-time: provision Neon

1. Create a Neon project (Free Plan, Frankfurt / `eu-central-1` — same region
   as most HF Spaces). 0.5 GB storage + 5 GB egress is plenty for
   checkpointer tables.
2. Grab the **pooled** connection string (hostname contains `-pooler`) and
   append `?sslmode=require`:

   ```
   postgresql://<user>:<pass>@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

   The non-pooled URL works too, but pgBouncer keeps Neon's idle-timeout from
   biting on the Space's next wake.

### One-time: create the Space

1. New Space → SDK: **Docker** → Blank template → push an empty repo.
2. In the Space's **Settings → Variables and secrets**, add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Neon pooled URL above |
   | `LANGGRAPH_AUTH_TOKEN` | `openssl rand -hex 32` |
   | `LLM_BASE_URL` | `https://api.deepseek.com` |
   | `LLM_MODEL` | `deepseek-v4-pro` |
   | `OPENAI_API_KEY` | your DeepSeek API key (the OpenAI-compatible client reads this name) |
   | `NEON_DATABASE_URL` | same as `DATABASE_URL` *(used by `admin_chat` / `email_outreach` read-only queries)* |

### Push

```bash
cd apps/lead-gen/backend
git init
git remote add space https://huggingface.co/spaces/<user>/<space-name>
git add .
git commit -m "initial deploy"
git push space main
```

HF builds the Dockerfile, starts the container, and tails logs in the Space
UI. First boot is ~3–5 min; subsequent boots are ~30 s from cold sleep.

### Point Vercel at the Space

```bash
vercel env add LANGGRAPH_URL production
# paste: https://<user>-<space-name>.hf.space

vercel env add LANGGRAPH_AUTH_TOKEN production
# paste the same token set in the Space secrets

pnpm deploy
```

### Verify

```bash
BASE="https://<user>-<space-name>.hf.space"

# Liveness (no DB/LLM touched, always 200)
curl "$BASE/health"
# {"status":"ok"}

# Without token → 401
curl -X POST "$BASE/runs/wait" \
  -H 'content-type: application/json' \
  -d '{"assistant_id":"admin_chat","input":{"prompt":"ping","system":""}}'

# With token → 200
curl -X POST "$BASE/runs/wait" \
  -H "authorization: Bearer $LANGGRAPH_AUTH_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"assistant_id":"admin_chat","input":{"prompt":"ping","system":""}}'
```
