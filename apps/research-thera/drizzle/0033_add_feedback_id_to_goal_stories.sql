-- Add feedback_id column to goal_stories table
ALTER TABLE goal_stories ADD COLUMN feedback_id INTEGER REFERENCES contact_feedbacks(id);
