# Agent Teams — Tasks

## Phase 1: Spec-Kit Foundation

- [x] Create `.speckit/constitution.md`
- [x] Create `.speckit/features/agent-teams/spec.md`
- [x] Create `.speckit/features/agent-teams/plan.md`
- [x] Create `.speckit/features/agent-teams/tasks.md`
- [x] Create team spec: `research-pipeline`
- [x] Create team spec: `claim-verification`
- [x] Create team spec: `feature-build`
- [x] Create team spec: `code-review`
- [x] Create team spec: `debug-squad`

## Phase 2: Claude Code Agent Files

- [x] Create `.claude/agents/backend-dev.md`
- [x] Create `.claude/agents/frontend-dev.md`
- [x] Create `.claude/agents/qa-engineer.md`
- [x] Create `.claude/agents/security-reviewer.md`
- [x] Create `.claude/agents/evidence-hunter.md`
- [x] Create `.claude/agents/counter-evidence.md`
- [x] Create `.claude/agents/evidence-judge.md`
- [ ] Update existing `.claude/agents/research-analyst.md` (remove Mastra refs)

## Phase 3: Claude Code Integration

- [x] Add Agent Teams section to `CLAUDE.md` (team catalog, how-to-create, file ownership)
- [x] Create `/team` skill (`.claude/skills/team/SKILL.md`) — spawns teams from specs
- [x] Create `/team-list` skill — lists available team specs
- [x] Create `TeammateIdle` hook (`.claude/hooks/teammate-idle.sh`)
- [x] Create `TaskCompleted` hook (`.claude/hooks/task-completed.sh`)
- [x] Wire hooks in `.claude/settings.json`

## Phase 4: Test & Iterate

- [ ] Test `feature-build` team on a real feature
- [ ] Test `code-review` team on a real PR
- [ ] Test `debug-squad` on a real bug
- [ ] Refine prompts based on team performance
