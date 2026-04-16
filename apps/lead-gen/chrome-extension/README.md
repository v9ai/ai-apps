# Agentic Lead Gen Assistant

Chrome extension (Manifest V3) for automated B2B lead generation on LinkedIn. Scrapes profiles, posts, and company data; imports contacts into the lead-gen database; and triggers AI-powered outreach — all from a single popup button.

---

## What it does

The extension runs a **5-phase unified pipeline** against LinkedIn:

| Phase | Action |
|-------|--------|
| 1 — Jobs | Scrapes job search results; auto-dismisses excluded locations |
| 2 — Connections | Fetches all LinkedIn connections via Voyager API (handles 17K+ in ~2–3 min) |
| 3 — Import | Bulk-imports contacts into the Neon database via GraphQL |
| 4 — Posts | Visits each contact's activity feed; extracts posts, engagement metrics, likes |
| 5 — Companies | Collects company "about" data from post authors |

Beyond the pipeline, the extension injects two buttons into LinkedIn pages:

- **Send Email** — appears on LinkedIn posts; extracts post context and triggers the LangGraph outreach pipeline to draft a personalized email.
- **Connect All** — appears on LinkedIn people-search pages; iterates all connect buttons automatically.

---

## Architecture

```
Popup (React)
    └─ startUnifiedPipeline message
         ↓
Background service worker (background/index.ts)
    ├─ keep-alive heartbeat (prevents 30s SW termination)
    ├─ LinkedIn Voyager API  →  connection fetching (CSRF-token auth)
    ├─ chrome.scripting      →  DOM scraping (tabs, content scripts)
    ├─ GraphQL client        →  localhost:3004/api/graphql  (contacts, companies, email)
    └─ Rust server           →  localhost:9876  (posts, likes, stats)

Content scripts
    ├─ linkedin-helper.ts    →  DOM injection (buttons), job dismissal
    └─ webapp-bridge.ts      →  postMessage relay between web app and extension
```

---

## Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19, Mantine v8, Tailwind CSS 4 |
| Build | Vite + @crxjs/vite-plugin (MV3) |
| Language | TypeScript strict |
| GraphQL client | graphql-request |
| Backend | Next.js GraphQL API (Apollo Server 5) + SQLite (posts) |

---

## Permissions

| Permission | Why |
|------------|-----|
| `activeTab`, `tabs`, `scripting` | Navigate and scrape LinkedIn tabs |
| `cookies` | Read LinkedIn JSESSIONID for Voyager API CSRF token |
| `storage`, `alarms` | Persist state, scheduled keep-alive |
| `host_permissions` | `*.linkedin.com`, `localhost:3000/3004/9876` |

---

## Development

```bash
# Install
pnpm install

# Dev (hot-reload)
pnpm dev

# Production build
pnpm build          # Chrome
pnpm build:firefox  # Firefox
```

Load the `dist/` folder as an unpacked extension in `chrome://extensions`.

The popup connects to the GraphQL API at `VITE_API_BASE_URL` (defaults to `localhost:3004`) and the Rust stats server at `localhost:9876`. Both must be running for the pipeline to work.

---

## Integration points

| Service | URL | Used for |
|---------|-----|---------|
| GraphQL API | `localhost:3004/api/graphql` | Create contacts, companies, trigger outreach |
| Rust server | `localhost:9876` | Store posts, likes, pipeline stats |
| LinkedIn Voyager | `api.linkedin.com/v2/...` | Fetch connections (internal LinkedIn API) |

---

## Popup UI

The popup (384 × 500 px, dark theme) shows:

- **Server health** — green/red dot confirming the Rust stats server is reachable
- **Counts** — live contact and post totals from the Rust server
- **Phase badge** — current pipeline phase (e.g., "3/5 Import")
- **Progress bar** — per-phase completion percentage
- **Status alert** — real-time messages (contact names, post counts, filter stats)
- **Scrape / Stop** buttons — start or cancel the pipeline
