# Specs

One index of every plan in this repository, in the order the work was built. A round
is a phase or a round of work between phases, and the number is the order, not the
plan: `3d` sits after `3b` because it was built after it, even though both amend the
phase 3 surfaces. `docs/roadmap.md` carries the same sequence with what each round
delivered; this file says where each plan lives and what state it is in.

A spec is named `YYYY-MM-DD-<slug>.md`, where the date is the day the plan was
written — never the day it was built. A spec written in November can describe work
that landed later, and a rewrite keeps the date and changes the slug, so a filename
never claims a writing date the document does not have. **The order below is the
`Round` column, not the date.**

| Round | Spec (date written) | Status |
|---|---|---|
| 0 | Foundation | built — roadmap entry only |
| 1 | [Phase 1 — Era detail](2026-11-20-phase-1-era-detail.md) (2026-11-20) | built and deployed; retrospective, and includes phase 0 |
| 2 | [Phase 2 — Event and game](2026-11-20-phase-2-event-and-game.md) (2026-11-20) | built and deployed |
| 3 | [Phase 3 — Entities, and the local/global split](2026-11-20-phase-3-entities.md) (2026-11-20) | built and deployed |
| 3b | Polish round | built — tickets only, no top-level spec |
| 3c | Structure before phase 4 | built — roadmap entry only |
| 3d | [Sorting the three indexes](2026-11-22-index-sorting.md) (2026-11-22) | built |
| 3e | [Player distinctions](2026-11-22-player-distinctions.md) (2026-11-22) | built |
| 4a | [Phase 4 — The Almanac](2026-11-20-phase-4-crystal-ball.md) (2026-11-20; amended 2026-11-26) | in build — tickets 00–05 built; 06–08 planned |
| 4b | Calibration, the backtest | proposed — the "Phase 4b" section of the 4a spec |
| 5 | [Phase 5 — Design pass](2026-11-20-phase-5-design-pass.md) (2026-11-20) | proposed |
| 6 | Prediction | deferred, not scheduled — definition of ready in the 4a spec |

Phase 0, 3c and 6 have roadmap entries but no spec of their own: two were small
enough to record in the roadmap, and the third is deferred work whose entry criteria
are a section of the phase 4 spec. The 3b round exists as fourteen tickets.

## Ticket directories

A round larger than a few screens is broken into tickets, in dependency order. Each
ticket is a spec of its own: the behaviour, the seam it is proved at, and its
acceptance criteria.

| Round | Directory | Serves | Status |
|---|---|---|---|
| 3 | [`2026-11-20-phase-3-entities/`](tickets/2026-11-20-phase-3-entities/) | phase 3 | built (7 tickets) |
| 3b | [`2026-11-20-polish-round/`](tickets/2026-11-20-polish-round/) | the polish round | built (14 tickets) |
| 3d | [`2026-11-22-index-sorting/`](tickets/2026-11-22-index-sorting/) | the index sorting spec | built (4 tickets) |
| 3e | [`2026-11-22-player-distinctions/`](tickets/2026-11-22-player-distinctions/) | the distinctions spec | built (3 tickets) |
| 4a | [`2026-11-20-phase-4-crystal-ball/`](tickets/2026-11-20-phase-4-crystal-ball/) | the Almanac | in build (6 of 9 built) |

## What moved, and when

The phase 4 number has held two different plans. It carried **head-to-head**, two
teams side by side with their record and no prediction. It now carries the **crystal
ball**: the eighteen recurring pick'em questions, answered as records with intervals.

The reason is in the spec, and it is worth stating here because it is the kind of
change a reader should be able to audit: the head-to-head page was careful — counts
only, no predicted winner — but a reader uses it to decide a pick, so it is read as a
recommendation whatever it prints. Phase 4 was reopened as the catalogue of records a
pick'em asks for, and prediction — including that comparison as an interactive
recommendation — is **deferred to phase 6, not dropped**. Its definition of ready is
a section of the phase 4 spec.

The backtest that would tell us whether any ranking beats a carry-over baseline is
4b: a separate round inside the same document, because the catalogue is useful before
it is calibrated and neither should borrow the other's credibility.

Two decisions from the head-to-head plan survive, because they were right: the pair
of teams is a filter on games and not a new table (a wider claim — same event, same
era, both beat a common opponent — is a different claim), and the small-sample
warning is a component with a named threshold rather than a copy tweak. Whichever
phase rebuilds it inherits them.

**The 4a amendment (2026-11-26).** The pin audit moved three things, and they are
recorded here because the spec alone cannot show them. The index is grouped by
**class** — champions, players, teams, events — and the answer family is a tag,
because a pick'em reader browses by subject. The catalogue is **generic**: the four
questions that named a player or a team (Faker's 700 kills, Peyz vs Gumayusi, HLE vs
T1, an LCS team) are deferred with their queries kept, and player kills, team win
rate and region knockouts take their place. The windows are **seasons derived from
Worlds**, not calendar years: season N runs from the day after Worlds N−1 final to
Worlds N final, and the pin's one exception is IPL 5 (season 2013). The champion
deaths card became a champion KDA card. The dossier is
`docs/analysis/crystal-ball-audit.md`; the tickets are the nine beside it.
