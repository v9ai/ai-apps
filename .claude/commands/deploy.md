Deploy the current app to Vercel production.

Determine which app to deploy from the current working directory. Extract the app name from the path (the directory name under `apps/`).

**CRITICAL:** All `deploy:*` scripts live in the monorepo root `package.json`. They will fail with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL: Command "deploy:X" not found` if run from an app subdirectory. Always chain `cd` + the command in a single Bash call so pnpm resolves the script from the root.

Use this mapping to find the correct deploy script:

| App directory | Deploy command (run from monorepo root) |
|---|---|
| knowledge | `cd /Users/vadimnicolai/Public/ai-apps && pnpm deploy:k` |
| lead-gen | `cd /Users/vadimnicolai/Public/ai-apps && pnpm deploy:n` |
| law-adversarial | `cd /Users/vadimnicolai/Public/ai-apps && pnpm deploy:l` |
| agentic-healthcare | `cd /Users/vadimnicolai/Public/ai-apps && pnpm deploy:h` |
| research-thera | `cd /Users/vadimnicolai/Public/ai-apps && pnpm deploy:r` |
| real-estate | `cd /Users/vadimnicolai/Public/ai-apps && pnpm deploy:re` |
| vadim.blog | `cd /Users/vadimnicolai/Public/ai-apps && pnpm deploy:blog` |
| todo | `cd /Users/vadimnicolai/Public/ai-apps && pnpm deploy:t` |
| hoa | `cd /Users/vadimnicolai/Public/ai-apps && pnpm deploy:p` |
| bricks | `cd /Users/vadimnicolai/Public/ai-apps && pnpm deploy:br` |
| travel | `cd /Users/vadimnicolai/Public/ai-apps && pnpm deploy:tr` |
| my-car | `cd /Users/vadimnicolai/Public/ai-apps && pnpm deploy:c` |

If `$ARGUMENTS` is provided (e.g., `/deploy knowledge`), use that as the app name instead of CWD.

To deploy **all** apps: `/deploy all` → `cd /Users/vadimnicolai/Public/ai-apps && pnpm deploy:all`.

Do NOT fabricate Vercel project IDs. Always use the `pnpm deploy:*` scripts from the root `package.json` — they contain the correct project IDs.

Per user preference (memory: `feedback_deploy_no_confirm`): do NOT ask for confirmation before promoting to production — run the deploy immediately.

If the app is not in the mapping, say so and list the available apps.
