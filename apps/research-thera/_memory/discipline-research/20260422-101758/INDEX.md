---
run: discipline-research
run-timestamp: 20260422-101758
teams: 4
total-items: 105
---

# Discipline Research — Index (Run 20260422-101758)

Four independent research teams ran in parallel across two topics and two content types. Each team produced one markdown deliverable; this index is the reading guide.

## Axes

|                  | **Papers** (peer-reviewed)   | **Books** (trade / academic)   |
| ---------------- | ---------------------------- | ------------------------------ |
| **As parent**    | [parent/papers.md](parent/papers.md) — **35 papers** | [parent/books.md](parent/books.md) — **18 books** |
| **As individual**| [self/papers.md](self/papers.md) — **35 papers**   | [self/books.md](self/books.md) — **17 books**   |

**Total:** 70 peer-reviewed papers + 35 curated books = **105 items**, all with verifiable DOIs or ISBN-13s.

## Distinctiveness (one line per slice)

- **parent/papers.md** — Meta-analytic consensus on authoritative parenting, harsh-discipline harms (Gershoff canon), and the big behavioral-parenting RCT programs (Triple P, Incredible Years, PCIT).
- **parent/books.md** — Clinician/researcher-authored trade titles grouped by school (positive discipline, neuro-based, collaborative problem-solving, evidence-based programs, emotion coaching, foundational classics).
- **self/papers.md** — Trait self-control's robust predictive gradient (Moffitt/Dunedin) alongside the replication crisis around **ego depletion**, **marshmallow**, and **grit** — with original claims AND their registered replications / meta-critiques both cited.
- **self/books.md** — Four-school map (willpower, habit systems, tiny-habits, self-compassion) with honest flags where the underlying lab claim has failed to replicate.

## Tag distribution (books)

|                | research-backed | practitioner synthesis | popular |
| -------------- | --------------: | ---------------------: | ------: |
| parent/books.md | 10              | 5                      | 2       |
| self/books.md   | 8               | 7                      | 2       |

Both book slices exceed the 50% "research-backed OR practitioner synthesis" threshold set in the team briefs (parent: 89%; self: 88%).

## Evidence posture (papers)

Both papers slices explicitly include **replication and critique literature** alongside original claims, not only confirmatory citations. This was a quality gate in the briefs because self-discipline research in particular has famous findings (ego depletion, marshmallow, grit) whose pop-cultural status outruns the current evidence. The parent-papers slice carries the same posture toward the corporal-punishment literature — Gershoff meta-analyses are represented but so are cultural-moderation critiques (Lansford) and the cross-cultural persistence finding (Pinquart 2021).

## Where the slices meet

- **Emotion regulation** appears on both sides: emotion-coaching / co-regulation papers on the parent side (Gottman tradition, Tuning in to Kids, Havighurst) and self-compassion papers on the individual side (Neff, Breines & Chen). These are methodologically related — both treat emotion as an input to behavior change rather than an obstacle.
- **Executive function** is the cross-sectional hinge: it appears as a longitudinal predictor of child outcomes on the parent side and as the architectural substrate of adult self-regulation on the individual side (Miyake unity/diversity, Diamond review).

## Editorial decisions

- **Becky Kennedy / *Good Inside*** — verified ISBN (9780008505554) but intentionally omitted from parent/books.md. Kennedy is a clinical psychologist, but the book is brand-driven and substantially overlaps Markham. Add if a "contemporary popular" slot is wanted.
- **Baumrind** — no standalone trade parenting book; her typology lives inside other entries (Darling & Steinberg 1993 in papers; Siegel, Nelsen, etc. in books).
- **Motivational Interviewing (Miller & Rollnick)** — excluded from self/books.md as a clinician manual rather than a consumer book.
- **Goggins / Willink / Robert Greene** — popular "pop-discipline" titles; none cleared the evidence bar for self/books.md.
- **Time-out** — no standalone high-quality meta-analysis exists in the parent-papers slice; its evidence lives inside the component-analysis meta-analyses (Kaminski 2008, Leijten 2018).
- **Semantic Scholar** — rate-limited during the parent-papers run; OpenAlex citation counts substituted. All DOIs in that slice were cross-verified against Crossref.

## How to use this set

- Starting point for a parent coaching session: `parent/papers.md` Summary + top 3 entries from *Parenting styles* and *Positive discipline programs* groups, paired with `parent/books.md` recommended-trio (Greene's *The Explosive Child*, Siegel & Bryson's *No-Drama Discipline*, Kazdin or Sanders).
- Starting point for an individual behavior-change session: `self/papers.md` Summary (note the replication caveats) + `self/books.md` recommended-trio (Clear's *Atomic Habits*, Wood's *Good Habits, Bad Habits*, Oettingen's *Rethinking Positive Thinking*).
- For claim verification: any cited paper's DOI resolves via `https://doi.org/<doi>`; any cited book's ISBN-13 resolves via Google Books or WorldCat.

## Provenance

All four teams ran as isolated async agents. Sources queried:
- Papers: Crossref, OpenAlex, PubMed, Semantic Scholar, Europe PMC (via public APIs, no auth).
- Books: Google Books API, Crossref monographs, OpenAlex books, publisher catalogs, curated bibliographies via WebSearch.

No database rows were written; this run is pure markdown so it can be re-reviewed, diffed, or shared without app-state side effects. Future runs land under `_memory/discipline-research/<new-timestamp>/`.
