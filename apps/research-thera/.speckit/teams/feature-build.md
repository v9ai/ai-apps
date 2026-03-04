# Team: feature-build

Full-stack feature implementation with parallel backend/frontend.

## When to Use

- Adding a new feature that spans schema, resolvers, DB, and UI
- Estimated >30 minutes of work for a single agent
- Clear separation between backend and frontend work

## Team Composition

| Agent | Role | Model | Plan Required | Color |
|-------|------|-------|---------------|-------|
| `team-lead` | coordinator | sonnet | no | — |
| `backend-dev` | developer | opus | **yes** | blue |
| `frontend-dev` | developer | opus | **yes** | green |
| `qa` | tester | opus | no | red |

## File Ownership

```
backend-dev:
  - schema/schema.graphql
  - schema/resolvers/**
  - schema/operations/**
  - src/db/schema.ts
  - src/db/index.ts
  - src/trigger/**
  - drizzle/**

frontend-dev:
  - app/components/**
  - app/goals/**
  - app/notes/**
  - app/stories/**
  - app/providers/**
  - app/lib/**

qa:
  - **/*.test.ts
  - **/*.spec.ts
  - __tests__/**

lead:
  - Coordination only (no file edits)
```

## Task Structure (Template)

```
1. [pending] Define schema changes (→ backend-dev)
   depends_on: []
2. [pending] Design component structure (→ frontend-dev)
   depends_on: []
3. [pending] Implement resolvers + DB operations (→ backend-dev)
   depends_on: [1]
4. [pending] Run codegen after schema changes (→ backend-dev)
   depends_on: [1]
5. [pending] Build UI components (→ frontend-dev)
   depends_on: [4]
6. [pending] Write backend tests (→ qa)
   depends_on: [3]
7. [pending] Write frontend tests (→ qa)
   depends_on: [5]
8. [pending] Integration verification (→ lead)
   depends_on: [6, 7]
```

## Lead Prompt

```
You are coordinating a full-stack feature build for research-thera.

Read the feature request, then:
1. Break it into backend and frontend tasks
2. Assign schema + resolver work to backend-dev
3. Assign component + page work to frontend-dev
4. Both work in parallel — backend-dev starts with schema, frontend-dev starts with component design
5. After backend-dev runs `pnpm codegen`, frontend-dev can use generated hooks
6. QA writes tests as each layer completes
7. You verify the integration at the end

CRITICAL: Require plan approval from both devs before they start implementing.
Review plans for:
- File ownership violations (no agent edits another's files)
- Schema changes include `pnpm codegen` step
- Frontend uses generated Apollo hooks (not manual fetch)
- Backend validates input and handles errors

Project context:
- GraphQL schema-first: schema/schema.graphql
- Codegen: pnpm codegen (generates app/__generated__/)
- DB: Cloudflare D1 via Drizzle ORM
- UI: Radix UI Themes (dark mode, Indigo accent)
- Auth: Clerk (@clerk/nextjs)
- State: Apollo Client with cache

Communication rules:
- backend-dev: message frontend-dev when codegen is done
- frontend-dev: message backend-dev if API shape needs changes
- qa: message the dev whose code fails tests
- lead: broadcast feature context at start
```
