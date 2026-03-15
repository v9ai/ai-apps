-- Rename characteristic_id → issue_id in all referencing tables
ALTER TABLE therapy_research RENAME COLUMN characteristic_id TO issue_id;
ALTER TABLE behavior_observations RENAME COLUMN characteristic_id TO issue_id;
ALTER TABLE goal_stories RENAME COLUMN characteristic_id TO issue_id;
ALTER TABLE unique_outcomes RENAME COLUMN characteristic_id TO issue_id;
