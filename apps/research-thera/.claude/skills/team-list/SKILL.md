---
name: team-list
description: List all available agent team specs and their compositions. Shows what teams can be spawned with /team.
---

List all available agent team specs by reading each `.speckit/teams/*.md` file.

For each spec, show:
- **Name** (the filename without extension)
- **Description** (first line after the `# Team:` heading)
- **Agent count** (from the Team Composition table)
- **Roles** (agent names from the table)
- **When to use** (from the "When to Use" section)

Format as a table. Also mention that teams are spawned with `/team <spec-name> [context]`.
