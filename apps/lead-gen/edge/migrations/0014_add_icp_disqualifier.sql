-- ICP disqualifier columns — separate the two-stage filter:
--   gh_repos.icp_disqualifier        — set by gh_ai_repos.score_heuristic
--                                      from cheap README regex matches
--                                      (funding mentions, pedigree keywords).
--   gh_lead_research.icp_disqualifier — set by gh_lead_research.persist
--                                      from evidence assembled in the deep
--                                      pass (LLM-extracted fundraise,
--                                      contributor bios, partnership count).
--
-- Hot-list query treats null as "still in scope". Partial indexes only on
-- IS NULL rows so the hot-list lookup stays fast as disqualified rows
-- accumulate.

ALTER TABLE gh_repos          ADD COLUMN icp_disqualifier TEXT;
ALTER TABLE gh_lead_research  ADD COLUMN icp_disqualifier TEXT;

CREATE INDEX IF NOT EXISTS idx_gh_repos_icp_disq_open
  ON gh_repos(icp_disqualifier) WHERE icp_disqualifier IS NULL;

CREATE INDEX IF NOT EXISTS idx_gh_lead_research_icp_disq_open
  ON gh_lead_research(icp_disqualifier) WHERE icp_disqualifier IS NULL;
