-- Therapeutic games / exercises. One table with a type discriminator, JSON content.
-- Types: CBT_REFRAME, MINDFULNESS, JOURNAL_PROMPT. Source: SEED | USER | AI.
-- Seed content is designed for kids ~6-8 (evidence-based: Turtle Technique,
-- Worry Bug externalization, glitter-jar visualization, feelings weather).

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
-- Designed for ~7-year-olds: concrete metaphors, playful cues, short sessions.

INSERT INTO games (user_id, type, title, description, content, language, estimated_minutes, source)
VALUES
  (
    '__seed__',
    'MINDFULNESS',
    'Dragon Breath',
    'Breathe like a dragon — fill up with fire, hold it strong, blow it out slow.',
    '{"steps":[{"durationSeconds":10,"instruction":"Stand tall like a dragon. Feet on the ground, shoulders soft.","cue":"Stand tall"},{"durationSeconds":4,"instruction":"Breathe in through your nose… fill your belly with fire.","cue":"Fill up"},{"durationSeconds":4,"instruction":"Hold your fire strong.","cue":"Hold"},{"durationSeconds":4,"instruction":"Blow it out slow — a gentle dragon breath.","cue":"Blow"},{"durationSeconds":4,"instruction":"Rest. Feel your chest.","cue":"Rest"},{"durationSeconds":4,"instruction":"Fill up with fire.","cue":"Fill up"},{"durationSeconds":4,"instruction":"Hold.","cue":"Hold"},{"durationSeconds":4,"instruction":"Blow it out slow.","cue":"Blow"},{"durationSeconds":4,"instruction":"Rest.","cue":"Rest"},{"durationSeconds":4,"instruction":"Last time — fill up.","cue":"Fill up"},{"durationSeconds":4,"instruction":"Hold.","cue":"Hold"},{"durationSeconds":4,"instruction":"Blow it all out.","cue":"Blow"},{"durationSeconds":15,"instruction":"Notice — does your body feel a little softer now?","cue":"Notice"}]}',
    'en',
    2,
    'SEED'
  ),
  (
    '__seed__',
    'MINDFULNESS',
    'Turtle Shell',
    'When feelings feel too big — tuck in like a turtle, breathe inside your shell, come out when you''re ready.',
    '{"steps":[{"durationSeconds":15,"instruction":"Something feels really big right now. That''s okay.","cue":"It''s okay"},{"durationSeconds":15,"instruction":"Curl in tight, like a turtle in its shell. Arms tucked, chin down.","cue":"Tuck in"},{"durationSeconds":8,"instruction":"Breathe in slowly inside your shell.","cue":"Breathe in"},{"durationSeconds":8,"instruction":"Breathe out even slower.","cue":"Breathe out"},{"durationSeconds":8,"instruction":"Breathe in.","cue":"In"},{"durationSeconds":8,"instruction":"Breathe out.","cue":"Out"},{"durationSeconds":8,"instruction":"Breathe in.","cue":"In"},{"durationSeconds":8,"instruction":"Breathe out.","cue":"Out"},{"durationSeconds":15,"instruction":"What color is your shell right now? Picture it.","cue":"Imagine"},{"durationSeconds":10,"instruction":"Slowly… peek your eyes out.","cue":"Peek"},{"durationSeconds":10,"instruction":"Now your head, nice and slow.","cue":"Come out"},{"durationSeconds":15,"instruction":"Shake your body gently. Look around. You''re safe.","cue":"Safe"}]}',
    'en',
    3,
    'SEED'
  ),
  (
    '__seed__',
    'MINDFULNESS',
    'Calm Down Jar',
    'Imagine a jar of glitter. Shake it wild, then watch the glitter settle — your mind can settle too.',
    '{"steps":[{"durationSeconds":10,"instruction":"Sit comfortably. Imagine a jar — any shape or color you like.","cue":"Imagine"},{"durationSeconds":10,"instruction":"Fill it with glitter. Lots of swirly, shiny glitter.","cue":"Fill"},{"durationSeconds":15,"instruction":"Shake the jar hard. Feel how wild the glitter is — just like busy thoughts.","cue":"Shake"},{"durationSeconds":20,"instruction":"Now hold it still. Just watch.","cue":"Watch"},{"durationSeconds":25,"instruction":"The glitter is slowing down… piece by piece.","cue":"Settle"},{"durationSeconds":25,"instruction":"Notice the pieces landing at the bottom.","cue":"Settle"},{"durationSeconds":15,"instruction":"The jar is clear now. You can see through it.","cue":"Clear"},{"durationSeconds":10,"instruction":"Your mind can settle like that too. Well done.","cue":"Rest"}]}',
    'en',
    2,
    'SEED'
  ),
  (
    '__seed__',
    'CBT_REFRAME',
    'Catch the Worry Bug',
    'Name the trick the Worry Bug is playing — then answer with your Brave Voice.',
    '{"steps":[{"kind":"situation","prompt":"What happened that made you feel worried? Tell it in one or two sentences."},{"kind":"thought","prompt":"What did the Worry Bug whisper in your ear?"},{"kind":"distortion","prompt":"Which trick was the Worry Bug using?","options":["Monster Maker — makes tiny things feel huge","Crystal Ball — pretends to know the future","Mean Judge — calls you bad names","Always-Never — says things will always or never happen"]},{"kind":"reframe","prompt":"What would your Brave Voice say instead? Your Brave Voice tells the truth and is kind."}]}',
    'en',
    5,
    'SEED'
  ),
  (
    '__seed__',
    'JOURNAL_PROMPT',
    'My Feelings Weather',
    'Describe today as weather — sunny, cloudy, stormy, or calm — and notice what helps the weather change.',
    '{"prompts":["What was the weather inside you today? (sunny, cloudy, rainy, stormy, or foggy?)","What made that weather happen?","Was there a moment when the weather got sunnier? What helped?","What weather do you hope for tomorrow?"],"writeToNote":true}',
    'en',
    6,
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
