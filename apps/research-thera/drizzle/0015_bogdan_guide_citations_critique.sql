ALTER TABLE bogdan_discussion_guides
  ADD COLUMN IF NOT EXISTS citations TEXT NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS critique TEXT;
