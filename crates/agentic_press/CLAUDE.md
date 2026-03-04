# agentic_press

Journalism pipeline for the remote EU job market. A team of 5 specialist agents — Researcher, Data Journalist, SEO Strategist, Writer, and Editor — that produce publication-ready articles driven by data from [nomadically.work](../apps/nomadically.work).

## Structure

```
crates/agentic_press/
├── .claude/
│   ├── commands/
│   │   └── journalism-team.md      # Orchestrator — invoke with /journalism-team
│   └── skills/
│       ├── journalism-research/    # Researcher specialist
│       ├── journalism-data/        # Data Journalist specialist
│       ├── journalism-seo/         # SEO Strategist specialist
│       ├── journalism-writer/      # Writer specialist
│       └── journalism-editor/      # Editor specialist
└── articles/
    ├── drafts/                     # Writer output (in progress)
    ├── published/                  # Editor-approved final versions
    ├── research/                   # Research briefs + SEO strategies
    └── data/                       # Data analysis reports
```

## Usage

Run Claude Code from this directory (`crates/agentic_press/`) to use the journalism team:

```
/journalism-team <topic>              # Full pipeline
/journalism-team research <topic>     # Research only
/journalism-team data <query>         # Data analysis only
/journalism-team seo <topic>          # SEO strategy only
/journalism-team write <brief>        # Write from brief (skips research)
/journalism-team edit <file>          # Edit existing draft
```

## Data Source

Job market data is pulled from the nomadically.work D1 database:
- Schema: `../apps/nomadically.work/src/db/schema.ts`
- GraphQL API: `http://localhost:3000/api/graphql`

## Published Destination

Editor-approved articles are moved to `/Users/vadimnicolai/Public/vadim.blog` for deployment.
