-- Migration: Create tables needed for workers-to-langgraph conversion.
--
-- These tables were previously in Cloudflare D1 and are now migrated to Neon PostgreSQL.
-- Run against Neon: psql $DATABASE_URL -f migrations/001_worker_tables.sql

-- 1. job_sources — unified ATS source registry (from janitor.ts)
CREATE TABLE IF NOT EXISTS job_sources (
    id SERIAL PRIMARY KEY,
    source_kind TEXT NOT NULL,
    token TEXT NOT NULL,
    last_synced_at TIMESTAMPTZ,
    consecutive_errors INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(source_kind, token)
);

CREATE INDEX IF NOT EXISTS idx_job_sources_stale
    ON job_sources (last_synced_at ASC NULLS FIRST)
    WHERE consecutive_errors < 5;

-- 2. resume_chunks — pgvector storage for resume RAG (from resume-rag worker)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS resume_chunks (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    resume_id TEXT NOT NULL,
    chunk_index INT NOT NULL,
    total_chunks INT,
    text TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resume_chunks_user
    ON resume_chunks (user_id, resume_id);

CREATE INDEX IF NOT EXISTS idx_resume_chunks_embedding
    ON resume_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- 3. Report columns on jobs table (from job-reporter-llm worker)
-- These columns may already exist if the worker was deployed; safe to add conditionally.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'report_reason') THEN
        ALTER TABLE jobs ADD COLUMN report_reason TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'report_confidence') THEN
        ALTER TABLE jobs ADD COLUMN report_confidence REAL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'report_reasoning') THEN
        ALTER TABLE jobs ADD COLUMN report_reasoning TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'report_tags') THEN
        ALTER TABLE jobs ADD COLUMN report_tags JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'report_action') THEN
        ALTER TABLE jobs ADD COLUMN report_action TEXT;
    END IF;
END $$;
