-- Merge goal_stories into stories table

-- Step 1: make goal_id nullable and add new columns
ALTER TABLE stories ALTER COLUMN goal_id DROP NOT NULL;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS issue_id INTEGER;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS feedback_id INTEGER;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS minutes INTEGER;

-- Step 2: add a temp tracking column so we can remap foreign-key references
ALTER TABLE stories ADD COLUMN _src_goal_story_id INTEGER;

-- Step 3: copy every goal_stories row into stories
INSERT INTO stories (
  goal_id, issue_id, feedback_id, user_id,
  content, language, minutes,
  audio_key, audio_url, audio_generated_at,
  created_at, updated_at,
  _src_goal_story_id
)
SELECT
  gs.goal_id,
  gs.issue_id,
  gs.feedback_id,
  COALESCE(
    (SELECT g.user_id FROM goals g WHERE g.id = gs.goal_id),
    (SELECT i.user_id FROM issues i WHERE i.id = gs.issue_id),
    (SELECT cf.user_id FROM contact_feedbacks cf WHERE cf.id = gs.feedback_id),
    'system'
  ),
  gs.text,
  gs.language,
  gs.minutes,
  gs.audio_key,
  gs.audio_url,
  gs.audio_generated_at,
  gs.created_at,
  gs.updated_at,
  gs.id
FROM goal_stories gs;

-- Step 4: remap text_segments.story_id to the new stories ids
UPDATE text_segments ts
SET story_id = s.id
FROM stories s
WHERE s._src_goal_story_id = ts.story_id
  AND ts.story_id IS NOT NULL;

-- Step 5: remap audio_assets.story_id to the new stories ids
UPDATE audio_assets aa
SET story_id = s.id
FROM stories s
WHERE s._src_goal_story_id = aa.story_id
  AND aa.story_id IS NOT NULL;

-- Step 6: drop temp column and old table
ALTER TABLE stories DROP COLUMN _src_goal_story_id;
DROP TABLE goal_stories;
