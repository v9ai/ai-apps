Deploy the current app to Vercel production.

Determine which app to deploy from the current working directory. Extract the app name from the path (the directory name under `apps/`).

Use this mapping to find the correct deploy script:

| App directory | Deploy command |
|---|---|
| knowledge | `pnpm deploy:k` |
| lead-gen | `pnpm deploy:n` |
| law-adversarial | `pnpm deploy:l` |
| agentic-healthcare | `pnpm deploy:h` |
| research-thera | `pnpm deploy:r` |
| real-estate | `pnpm deploy:re` |
| vadim.blog | `pnpm deploy:blog` |
| todo | `pnpm deploy:t` |
| hoa | `pnpm deploy:p` |
| bricks | `pnpm deploy:br` |
| travel | `pnpm deploy:tr` |
| my-car | `pnpm deploy:c` |

If `$ARGUMENTS` is provided (e.g., `/deploy knowledge`), use that as the app name instead of CWD.

To deploy **all** apps: `/deploy all` runs `pnpm deploy:all`.

Run the deploy command from the monorepo root: `/Users/vadimnicolai/Public/ai-apps`.

Do NOT fabricate Vercel project IDs. Always use the `pnpm deploy:*` scripts from `package.json` — they contain the correct project IDs.

If the app is not in the mapping, say so and list the available apps.
