CREATE TABLE behavior_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_member_id INTEGER NOT NULL,
  goal_id INTEGER,
  user_id TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  observation_type TEXT NOT NULL,
  frequency INTEGER,
  intensity TEXT,
  context TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_behavior_observations_family_member ON behavior_observations(family_member_id);
CREATE INDEX idx_behavior_observations_goal ON behavior_observations(goal_id);
CREATE INDEX idx_behavior_observations_user ON behavior_observations(user_id);
