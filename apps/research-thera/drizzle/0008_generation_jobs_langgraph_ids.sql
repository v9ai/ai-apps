ALTER TABLE "generation_jobs" ADD COLUMN IF NOT EXISTS "langgraph_thread_id" text;
ALTER TABLE "generation_jobs" ADD COLUMN IF NOT EXISTS "langgraph_run_id" text;
