-- 001_langgraph_runs.sql
--
-- Persists run-level metadata for the LangGraph FastAPI harness in app.py.
-- Replaces the in-process `_THREADS` dict whose state vanished on container
-- sleep / redeploy / OOM, leaving the TS langgraph-client polling into a void.
--
-- The LangGraph AsyncPostgresSaver (see research_agent/checkpointer.py) already
-- handles partial-graph-state durability inside graphs. This table tracks the
-- *outer* run lifecycle the harness exposes to the TS client: status, final
-- values, error message, and timestamps.
--
-- Apply via Neon MCP run_sql against project wandering-dew-31821015, db neondb.

CREATE TABLE IF NOT EXISTS langgraph_runs (
  run_id        TEXT PRIMARY KEY,
  thread_id     TEXT NOT NULL,
  assistant_id  TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('pending','running','success','error','interrupted','cancelled')),
  values        JSONB,
  error         TEXT,
  user_email    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_langgraph_runs_thread ON langgraph_runs(thread_id);
CREATE INDEX IF NOT EXISTS idx_langgraph_runs_updated ON langgraph_runs(updated_at);
CREATE INDEX IF NOT EXISTS idx_langgraph_runs_user_email ON langgraph_runs(user_email);
