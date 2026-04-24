-- Therapeutic games / exercises. One table with a type discriminator, JSON content.
-- Types: CBT_REFRAME, MINDFULNESS, JOURNAL_PROMPT. Source: SEED | USER | AI.

BEGIN;

CREATE TABLE IF NOT EXISTS games (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  goal_id integer,
  issue_id integer,
  family_member_id integer,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  content text NOT NULL,
  language text,
  estimated_minutes integer,
  source text NOT NULL DEFAULT 'USER',
  created_at text NOT NULL DEFAULT NOW(),
  updated_at text NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_user_created
  ON games (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_games_type
  ON games (type);

CREATE INDEX IF NOT EXISTS idx_games_goal_id
  ON games (goal_id);

CREATE INDEX IF NOT EXISTS idx_games_issue_id
  ON games (issue_id);

CREATE TABLE IF NOT EXISTS game_completions (
  id serial PRIMARY KEY,
  game_id integer NOT NULL,
  user_id text NOT NULL,
  duration_seconds integer,
  responses text,
  linked_note_id integer,
  completed_at text NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_completions_game
  ON game_completions (game_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_completions_user
  ON game_completions (user_id, completed_at DESC);

-- Seed games (shared across all users via user_id = '__seed__'; listGames unions them in).
INSERT INTO games (user_id, type, title, description, content, language, estimated_minutes, source)
VALUES
  (
    '__seed__',
    'MINDFULNESS',
    'Box breathing (4-4-4-4)',
    'A grounding breath practice used by Navy SEALs and therapists alike. Four minutes.',
    '{"steps":[{"durationSeconds":20,"instruction":"Settle in. Uncross your legs, relax your shoulders.","cue":"Settle"},{"durationSeconds":4,"instruction":"Inhale slowly through your nose.","cue":"Inhale"},{"durationSeconds":4,"instruction":"Hold.","cue":"Hold"},{"durationSeconds":4,"instruction":"Exhale slowly through your mouth.","cue":"Exhale"},{"durationSeconds":4,"instruction":"Hold empty.","cue":"Hold"},{"durationSeconds":4,"instruction":"Inhale.","cue":"Inhale"},{"durationSeconds":4,"instruction":"Hold.","cue":"Hold"},{"durationSeconds":4,"instruction":"Exhale.","cue":"Exhale"},{"durationSeconds":4,"instruction":"Hold.","cue":"Hold"},{"durationSeconds":4,"instruction":"Inhale.","cue":"Inhale"},{"durationSeconds":4,"instruction":"Hold.","cue":"Hold"},{"durationSeconds":4,"instruction":"Exhale.","cue":"Exhale"},{"durationSeconds":4,"instruction":"Hold.","cue":"Hold"},{"durationSeconds":30,"instruction":"Notice how you feel now compared to when you started.","cue":"Notice"}]}',
    'en',
    4,
    'SEED'
  ),
  (
    '__seed__',
    'MINDFULNESS',
    '5-4-3-2-1 grounding',
    'A sensory check-in for anxious moments. Name what you can see, hear, feel, smell, taste.',
    '{"steps":[{"durationSeconds":20,"instruction":"Pause. Feet on the floor.","cue":"Arrive"},{"durationSeconds":40,"instruction":"Look around. Name 5 things you can see.","cue":"See 5"},{"durationSeconds":40,"instruction":"Name 4 things you can feel — the chair, your breath, fabric, temperature.","cue":"Feel 4"},{"durationSeconds":40,"instruction":"Name 3 things you can hear.","cue":"Hear 3"},{"durationSeconds":40,"instruction":"Name 2 things you can smell (or 2 smells you like).","cue":"Smell 2"},{"durationSeconds":40,"instruction":"Name 1 thing you can taste (or 1 taste you enjoy).","cue":"Taste 1"},{"durationSeconds":20,"instruction":"Take one slow breath. You''re here.","cue":"Return"}]}',
    'en',
    4,
    'SEED'
  ),
  (
    '__seed__',
    'CBT_REFRAME',
    'Catch the distortion',
    'A classic CBT exercise: notice the automatic thought, name the distortion, reframe it.',
    '{"steps":[{"kind":"situation","prompt":"Describe the situation briefly. What happened, where, when?"},{"kind":"thought","prompt":"What went through your mind? Write the exact automatic thought."},{"kind":"distortion","prompt":"Which distortion fits best?","options":["All-or-nothing thinking","Catastrophizing","Mind reading","Fortune telling","Personalization","Should statements","Emotional reasoning","Labeling","Discounting the positive","Mental filter"]},{"kind":"reframe","prompt":"Write a more balanced, evidence-based thought. What would you tell a friend in this situation?"}]}',
    'en',
    6,
    'SEED'
  ),
  (
    '__seed__',
    'JOURNAL_PROMPT',
    'Evening reflection',
    'Three prompts for the end of the day. Saves to your notes.',
    '{"prompts":["What went better than expected today?","What drained you, and what would you do differently?","One small thing you''re grateful for right now."],"writeToNote":true}',
    'en',
    8,
    'SEED'
  );

COMMIT;

-- =============================================================================
-- DOWN (copy into psql to roll back):
-- =============================================================================
-- BEGIN;
-- DROP INDEX IF EXISTS idx_game_completions_user;
-- DROP INDEX IF EXISTS idx_game_completions_game;
-- DROP TABLE IF EXISTS game_completions;
-- DROP INDEX IF EXISTS idx_games_issue_id;
-- DROP INDEX IF EXISTS idx_games_goal_id;
-- DROP INDEX IF EXISTS idx_games_type;
-- DROP INDEX IF EXISTS idx_games_user_created;
-- DROP TABLE IF EXISTS games;
-- COMMIT;
