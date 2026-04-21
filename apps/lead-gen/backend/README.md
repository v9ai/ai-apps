# lead-gen backend

LangGraph dev server that hosts 5 graphs (`email_compose`, `email_reply`,
`email_outreach`, `admin_chat`, `text_to_sql`). Declared in `langgraph.json`,
implemented under `leadgen_agent/`, consumed by the Next.js app via
`src/lib/langgraph-client.ts`.

## Run modes

Three supported modes, same binary in each case:

| Mode | `LANGGRAPH_URL` | `LANGGRAPH_AUTH_TOKEN` | Use |
|---|---|---|---|
| Local-only | `http://127.0.0.1:8002` (default) | unset | Frontend + backend both on your Mac |
| Tunnel, dev | Cloudflare quick-tunnel URL | unset | Throwaway demos, short-lived share |
| Tunnel, stable | Named Cloudflare tunnel hostname | set (shared secret) | Vercel-deployed frontend → local backend |

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
