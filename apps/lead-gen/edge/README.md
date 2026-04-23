# `@lead-gen/edge`

Cloudflare Worker + Durable Object rate limiter that will front the Vercel
origin once DNS is moved to Cloudflare.

## Status

**Parked.** DNS is not yet moved to CF, so this Worker is not in the hot
path. The in-memory limiter in `src/app/api/graphql/route.ts` remains
authoritative until cutover. See
`.claude/plans/check-deeply-existing-features-effervescent-sphinx.md`.

## Tiers

| Tier             | Detection                                                                 | Limit (req/min) | Key                 |
| ---------------- | ------------------------------------------------------------------------- | --------------- | ------------------- |
| `anon`           | no `better-auth.session_token` cookie                                     | 60              | `cf-connecting-ip`  |
| `admin-mutation` | cookie present + `POST /api/graphql` with body matching `/\bmutation\b/i` | 20              | session cookie      |
| `authed`         | cookie present (otherwise)                                                | 300             | session cookie      |

On allow: proxies to `env.ORIGIN + pathname + search`, injects
`x-ratelimit-*` headers. On deny: returns 429 with `retry-after`.

## Commands

```bash
pnpm install
pnpm typecheck          # tsc --noEmit against @cloudflare/workers-types
pnpm deploy:dry         # wrangler deploy --dry-run
pnpm wrangler deploy    # ACTUAL deploy to workers.dev (run when DNS is ready)
```

Nothing here deploys automatically — the parent `apps/lead-gen` build and
`vercel.json` are untouched.
