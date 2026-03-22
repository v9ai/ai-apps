"""Golden sample fixtures for press pipeline tests and evals."""

GOOD_ARTICLE = """\
---
title: "Remote Work Productivity: What the Data Actually Shows"
description: "Four large-scale studies find remote workers are 13–20% more productive than on-site peers—but the effect disappears for junior engineers without mentorship infrastructure."
date: 2026-03-16
tags: [remote-work, productivity, engineering-teams]
status: draft
---

# Remote Work Productivity: What the Data Actually Shows

A [Stanford study of 16,000 employees](https://nber.org/papers/w18871) found a 13% productivity
gain for remote workers—but that headline number conceals a split: senior engineers improved 18%,
while engineers with less than two years of experience showed no gain at all.

The nuance matters because most "remote work is productive" arguments cite aggregate studies.
Once you break the data down by seniority and role type, the picture changes significantly.

## What the Large-Scale Studies Find

[Microsoft's 2022 Work Trend Index](https://microsoft.com/en-us/worklab/work-trend-index/great-expectations)
surveyed 31,000 workers across 31 countries. Remote and hybrid workers reported equivalent output
on individual tasks, but 43% said collaboration had become harder.

[GitLab's 2023 Global DevSecOps Survey](https://about.gitlab.com/developer-survey/) found
that 56% of remote developers shipped more code than their in-office counterparts, measured
by merged pull requests per quarter.

## Where Remote Work Fails Junior Engineers

The Stanford data shows the productivity gap is not about remote work itself—it's about
access to informal mentorship. In-office environments provide what researchers call
"hallway learning": overheard conversations, shoulder-taps, and ambient knowledge transfer.

A [2023 paper from the National Bureau of Economic Research](https://nber.org/papers/w31515)
found that junior engineers' career advancement slowed 25% in fully remote settings,
measured by time-to-promotion over three years.

## The Infrastructure Gap

Companies that close the productivity gap share three practices:
- Structured pairing programs for engineers in their first two years
- Async documentation culture (decisions recorded, not just discussed)
- Explicit on-call rotations that include junior engineers

[Basecamp's *Shape Up* methodology](https://basecamp.com/shapeup) documents how async-first
teams maintain productivity without real-time coercion—a model that works specifically because
documentation is a first-class deliverable, not an afterthought.

## What the Critics Get Right

The case for in-person work is strongest for specific roles: onboarding, crisis response,
and highly interdependent design work. A [2022 MIT study](https://mitsloan.mit.edu/ideas-made-to-matter/remote-work-may-slow-down-junior-employees)
found that new employees took 20% longer to reach full productivity in fully remote settings.

The debate is not remote vs. in-person—it's about matching work mode to task type.

## Practical Takeaways

If you are a team lead deciding on a remote policy, the data suggests:
1. **Senior engineers**: remote works; trust the data
2. **Junior engineers (<2 years)**: require in-person or structured pairing, not just Slack access
3. **Measure output, not hours**: pull request volume, shipped features, and incident response time
   are more predictive than seat time

The strongest predictor of remote productivity is not the policy itself—it is whether the
company has invested in async communication infrastructure before mandating it.
"""

BAD_ARTICLE = """\
# Remote Work

In today's rapidly evolving digital landscape, remote work has become increasingly important
for many organizations. It is worth noting that this is a very significant topic that affects
a lot of people in today's world. As we all know, the pandemic changed everything.

## Remote Work is Great

Remote work is really amazing because it allows workers to work from home. Many studies
have shown that remote workers are more productive. Experts say this is due to fewer
distractions in the home environment. Companies are basically seeing huge improvements
in their performance metrics.

The data suggests that remote work may potentially be one of the most transformative
shifts in how work gets done. It's an absolutely revolutionary development.

## Challenges

Of course, there are also some challenges. Some people find it hard to work from home.
Communication can be difficult. Various stakeholders have expressed concerns about
collaboration and team cohesion.

## Conclusion

In conclusion, remote work is a very interesting topic that we should all think about.
It is essentially changing the way we work. The future of work will likely involve
some combination of remote and in-person arrangements going forward.
"""

SAMPLE_RESEARCH_BRIEF = """\
# Research Brief: Remote Work Productivity

## Summary
Large-scale studies show a 13% productivity gain for remote workers overall, with senior
engineers outperforming (+18%) and junior engineers showing no gain. The primary variable
is access to mentorship, not the work location itself.

## Key Facts
- Stanford study of 16,000 employees: 13% overall productivity gain — Source: https://nber.org/papers/w18871
- Microsoft 2022 Work Trend Index, 31,000 workers, 31 countries: 43% said collaboration harder — Source: https://microsoft.com/en-us/worklab/work-trend-index/great-expectations
- GitLab 2023 DevSecOps Survey: 56% of remote developers shipped more code — Source: https://about.gitlab.com/developer-survey/
- NBER 2023 paper: junior engineers' career advancement slowed 25% in fully remote settings — Source: https://nber.org/papers/w31515
- MIT 2022 study: new employees 20% longer to reach full productivity in fully remote settings — Source: https://mitsloan.mit.edu/ideas-made-to-matter/remote-work-may-slow-down-junior-employees

## Needs Verification
- Claims about Basecamp Shape Up methodology outcomes (no independent study; self-reported)
"""

SAMPLE_SEO_DISCOVERY = """\
# SEO Discovery: Remote Work Productivity

## Target Keywords
| Keyword | Volume (est.) | Difficulty | Intent | Priority |
|---|---|---|---|---|
| remote work productivity | high | medium | informational | P1 |
| remote work productivity data | medium | low | informational | P2 |
| remote workers vs in-office productivity | medium | low | informational | P2 |

## Search Intent
Readers want data-backed analysis comparing remote vs in-office productivity outcomes.
Dominant intent is informational — they're evaluating a policy decision or defending one.

## SERP Features to Target
- **Featured Snippet**: Yes — open with a <=50-word direct answer summarising the key finding
- **People Also Ask**: "Is remote work more productive?", "What does research say about remote work?"
- **FAQ Schema**: Yes — article should include a dedicated FAQ section

## Semantic Topic Clusters
- Remote work infrastructure and tooling
- Junior engineer mentorship in distributed teams
- Return-to-office policy trade-offs
- Productivity measurement methodology

## Content Differentiation
Most coverage either cheers remote work productivity gains or dismisses them wholesale.
The gap: explaining WHO the gains apply to (individual-contributor roles with clear outputs)
and WHO they don't (junior engineers in learning phases needing mentorship proximity).
"""

SAMPLE_SEO_BLUEPRINT = """\
# SEO Blueprint: Remote Work Productivity

## Recommended Structure
- **Format**: data-driven analysis
- **Word count**: 1400–1800 words (~7–9 min read at 200 wpm)
- **URL Slug**: remote-work-productivity-data — primary keyword + qualifier, 4 words, no stop words
- **Title tag** (<=60 chars): "Remote Work Productivity: What the Data Actually Shows"
- **Meta description** (150–160 chars): "Four large-scale studies find remote workers are 13\u201320% more productive\u2014but the effect disappears for junior engineers without mentorship infrastructure."
- **H1**: Remote Work Productivity: What the Data Actually Shows
- **H2s**:
  1. What the Large-Scale Studies Find
  2. Where Remote Work Fails Junior Engineers
  3. The Infrastructure Gap
  4. What the Critics Get Right
  5. Practical Takeaways

## FAQ / People Also Ask
**Q: Is remote work more productive than working in an office?**
A: Large-scale studies show a 13\u201320% productivity increase for remote workers in structured roles, though the effect reverses for junior employees without adequate mentorship.

**Q: What does peer-reviewed research say about remote work productivity?**
A: Stanford economist Nicholas Bloom's study of 16,000 workers found a 13% output increase; follow-up research shows gains depend heavily on role type and collaboration infrastructure.

## Social Metadata
- **og:title**: "Remote Work Productivity: The Data Most Articles Get Wrong"
- **og:description**: "13\u201320% productivity gains sound convincing\u2014until you look at who the studies actually measured. The nuance changes the entire policy debate."

## E-E-A-T Signals
- **Experience**: Reference direct experience with distributed team architecture or remote-first tooling
- **Expertise**: Include specific numbers, methodology notes, and study limitations
- **Authority**: Cite Stanford NBER working paper, Microsoft Work Trend Index, GitLab DevSecOps Survey
- **Trust**: Acknowledge study limitations; state what the data covers vs what it doesn't
"""

SAMPLE_SEO_STRATEGY = SAMPLE_SEO_DISCOVERY + "\n---\n\n" + SAMPLE_SEO_BLUEPRINT

# ── Publish integrity test fixtures ──────────────────────────────────────────

DOUBLE_FM_ARTICLE = """\
---
slug: test-article
title: "Test Article"
description: "test"
date: 2026-03-16
authors: [nicolad]
tags:
  - test
  - article
---

---
title: "The Real Title of This Article"
description: "A proper description of the article content."
date: "2024-10-15"
tags: [testing, quality, publishing]
status: published
---

Body content here.
"""

CLEAN_ARTICLE = """\
---
slug: remote-work-productivity
title: "Remote Work Productivity: What the Data Shows"
description: "Four large-scale studies find remote workers are 13-20 percent more productive than on-site peers."
date: 2026-03-16
authors: [nicolad]
tags:
  - remote work
  - productivity
  - engineering teams
---

A [Stanford study](https://nber.org/papers/w18871) found 13% productivity gains.
[GitLab's survey](https://about.gitlab.com/company/culture/all-remote/) of 4,000 developers
found 52% felt more productive. The [Owl Labs 2023 report](https://owllabs.com/state-of-remote-work/2023)
corroborates this finding.
"""

SLUG_TAGS_ARTICLE = """\
---
slug: the-strategic-case-against-mandatory-work
title: "The Strategic Case Against Mandatory Work"
description: "A comprehensive analysis of the strategic case against mandatory work policies in modern organizations."
date: 2026-03-16
tags:
  - strategic
  - case
  - against
  - mandatory
  - work
---

Body.
"""

NO_LINKS_ARTICLE = """\
---
slug: remote-work-analysis
title: "Remote Work Analysis: Why It Matters"
description: "An analysis of remote work trends and their impact on modern organizations."
date: 2026-03-16
authors: [nicolad]
tags:
  - remote work
  - productivity
---

Remote work is increasingly popular. A Stanford study found 13% productivity gains.
GitLab surveyed 4,000 developers and found 52% felt more productive remotely.

## The Data

Multiple studies confirm these findings. The evidence is clear.
"""

FEW_LINKS_ARTICLE = """\
---
slug: remote-work-analysis
title: "Remote Work Analysis: Why It Matters"
description: "An analysis of remote work trends and their impact on modern organizations."
date: 2026-03-16
authors: [nicolad]
tags:
  - remote work
  - productivity
---

A [Stanford study](https://nber.org/papers/w18871) found 13% productivity gains.
GitLab surveyed 4,000 developers and found 52% felt more productive remotely.

## The Data

Multiple studies confirm these findings. The evidence is clear.
"""

WELL_LINKED_ARTICLE = """\
---
slug: remote-work-analysis
title: "Remote Work Analysis: Why It Matters"
description: "An analysis of remote work trends and their impact on modern organizations."
date: 2026-03-16
authors: [nicolad]
tags:
  - remote work
  - productivity
---

A [Stanford study](https://nber.org/papers/w18871) found 13% productivity gains.
[GitLab's survey](https://about.gitlab.com/company/culture/all-remote/) of 4,000 developers
found 52% felt more productive. The [Owl Labs 2023 report](https://owllabs.com/state-of-remote-work/2023)
corroborates this finding.

## The Data

The [NBER paper](https://nber.org/papers/w30810) confirms no negative impact on productivity.
"""
