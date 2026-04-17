CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "event_type" text NOT NULL,
  "email_id" text,
  "from_email" text,
  "to_emails" text,
  "subject" text,
  "payload" text,
  "http_status" integer,
  "error" text,
  "created_at" text DEFAULT now()::text NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_webhook_events_event_type" ON "webhook_events" USING btree ("event_type");
CREATE INDEX IF NOT EXISTS "idx_webhook_events_email_id" ON "webhook_events" USING btree ("email_id");
CREATE INDEX IF NOT EXISTS "idx_webhook_events_created_at" ON "webhook_events" USING btree ("created_at");
