# Roadmap

Each phase ends with something visible on the deployed site and green in
`npm run check`. No phase links to a route that does not exist yet.

This file is one sequence of **rounds**: a phase, or a round of work between phases.
The numbers are the order it was built in, not the order it was planned in, so `3d`
sits after `3b` even though both belong to phase 3. Phases 2 to 5 each have a spec
under `docs/specs/`; phase 6 does not have one yet, and that is deliberate — it is
deferred work with a definition of ready, recorded in the phase 4 spec.
`docs/specs/README.md` indexes every spec by round and status.

A spec is the plan, and its acceptance criteria are the plan's checklist: phase 1
keeps them ticked, while the later specs leave the boxes as written and record the
outcome in their "Built" or "Post-review changes" section, as every closed ticket
does. Code alone is not done: a phase is done when it is built, `npm run check` is
green, and the spec says what the build changed against the plan — a criterion that
shipped differently is recorded there, not left as a silent unticked box.

## 0 — Foundation *(done)*

- Repository, licence, attribution, provenance pin.
- DuckDB pipeline: semantic views, era spine joined to measured facts, totals.
- Deterministic artifacts with `--check`.
- Era spine and era detail pages, glossary, 404, skeleton states.
- Deploy to GitHub Pages on every push to `main`.

## 1 — Era detail, complete *(done)*

Spec: `docs/specs/2026-11-20-phase-1-era-detail.md`

Coverage panel, boundary citation, event table, previous/next era.

Empty declared eras are kept in the data but removed from the navigation: they are
documented below the era grid and in the glossary, and their pages remain
reachable by URL for citation. A card that opens onto nothing is not a level.

## 2 — Event and game *(done)*

Spec: `docs/specs/2026-11-20-phase-2-event-and-game.md`

`/events/:id`, `/series/:id` (best-of-three and above only, and a best-of-one
redirects to its game), `/games/:id` with the scoreboard, the draft board and the
player rows, and the 42 series-less games reachable from their event.

Player and team names were text in this phase; phase 3 made them links, once the
routes existed.

## 3 — Entities *(done)*

Spec: `docs/specs/2026-11-20-phase-3-entities.md`
Tickets: `docs/specs/tickets/2026-11-20-phase-3-entities/` (seven, in dependency order)

The alias bridge first, then `/players/:id` with the competition → year filters and
the context/career split, `/teams/:id` with a derived roster and its renames,
`/champions/:id` across eras, and search by any former name.

## 3b — Polish round *(done)*

Tickets: `docs/specs/tickets/2026-11-20-polish-round/` (fourteen, in dependency order)

Review findings turned into work: the event selection audit, per-event coverage, a
player's recent form and role split, the event's champion and teams, and eight
consistency and accessibility fixes. Eleven can start immediately; three wait for the
pages they touch.

## 3c — Structure before phase 4 *(done)*

Filed as `4b` when it was built, because it came before phase 4. It takes the round
number it earned in hindsight: `4b` is the crystal ball's backtest, and a round that
amends the phase 3 surfaces belongs beside the other ones.

- `/eras` as a real index, so the breadcrumb can say `Home / Eras / …` without
  claiming the home page is the era list.
- Phases inside a competition: the event page groups its series by `tab`, and each
  phase is a page of its own.
- Every trail starts at Home; every entity trail passes through its index.

## 3d — Index sorting, and the club a player last played for *(done)*

Spec: `docs/specs/2026-11-22-index-sorting.md`
Tickets: `docs/specs/tickets/2026-11-22-index-sorting/` (four, in dependency order)

Four small changes that share two decisions: a sort is a query parameter, and every
label a row prints is a derived measure with a documented rule. The champions and
players indexes sort by the role each was played in most (tie broken by the canonical
role order), a player's row states the club the corpus last saw them play for and the
year of that game, and the events index sorts by competition or by year. The
distinction between "the club they played for" and "their club now" is the point: the
model has no contracts.

## 3e — Player distinctions *(done)*

Spec: `docs/specs/2026-11-22-player-distinctions.md`
Tickets: `docs/specs/tickets/2026-11-22-player-distinctions/` (three, in dependency order)

The awards the source states for a player at a tournament — `Finals MVP`,
`All Pro Team`, `MVP` — on the player page and the event page, in the source's own
words. A team-page version was built and reverted in review (#55, #56); the awards
belong to the event and the player, not to the club. They sit in their own section,
below the derived `Titles`, and
nothing merges the two: one is the site's reading of the bracket, the other is
somebody's statement about the player. The block is absent for the 35 events that
state none, and the copy says so rather than printing an empty table.

## 4a — The crystal ball *(not built)*

Spec: `docs/specs/2026-11-20-phase-4-crystal-ball.md` (its "Phase 4b" section is the
next round, kept in the same document because both are the same catalogue).

`/answers`: the eighteen recurring pick'em questions, grouped in five answer families
and each rendered as one record — a number with its interval and its `n`, the window
it was measured on, its cut date, and the sentences that say what it does not license.
The catalogue is closed, the publication threshold is `n ≥ 20`, a top-1 question
returns a top-K rather than a winner, and three questions ship as `not_verifiable`
with the query that shows why.

This phase number used to hold the head-to-head comparison. Prediction moved out of
it; "Deferred" below says where it went.

## 4b — Calibration, the backtest *(not built)*

Spec: `docs/specs/2026-11-20-phase-4-crystal-ball.md`, section "Phase 4b — the
backtest"; no separate spec, on purpose: the backtest measures the catalogue and
nothing else.

`/calibracion`: for each Worlds edition, the catalogue's rankings generated from a
window that ends before the tournament, scored against what actually happened —
precision@K and rank correlation, against random-K and carry-over baselines, with the
teams that really played the event read from the facts. A separate deliverable from
4a: the catalogue is useful before it is calibrated, and neither borrows the other's
credibility.

## 5 — Design and polish *(not built)*

Spec: `docs/specs/2026-11-20-phase-5-design-pass.md`

Figma frames named after the IA document, tokens kept in parity with `@theme`,
the five states designed, and an accessibility pass.

## 6 — Prediction *(deferred, not scheduled)*

No spec yet, on purpose. Match-winner and tournament-winner probability, ratings of
any kind, any supervised model, and the interactive head-to-head that phase 4 used to
hold. **Deferred, not dropped**: the dataset today has no rosters, no contract dates
and no domestic-league form, and the temporal validation it needs is the machinery
phase 4b builds. The definition of ready — four conditions, all of them — is in
`docs/specs/2026-11-20-phase-4-crystal-ball.md` under "Deferred / Roadmap".

## Known follow-ups

- **Three crystal-ball questions need a data decision, not a query.** A stage-order
  table per event (so "who placed higher" and "how many regions reached knockouts"
  stop being string comparisons), a declared region vocabulary with its eras, and a
  curated team → league mapping. Until each exists, the phase 4 spec ships the
  question as `not_verifiable` with its verification query printed on the page.
- **Deep links return HTTP 404 on GitHub Pages.** The single-page fallback serves
  the app for any path, so `/eras/atakhan` renders correctly, but the status code
  is 404. Fixing it means a static host that rewrites, or pre-rendering each route.
- `.devcontainer/docker-compose.yml` still names its volume `lol-dataset-pi-config`.
  Renaming it would create a new empty volume and drop the container's gh
  credentials, so it is left alone deliberately.
- `public/data/events.json` is 24 KB and is loaded on every page. The phase 2 spec
  keeps the total first-load payload under ~200 KB gzip; if a later artifact
  pushes past it, split by level.
- `data/model/` is committed as a pinned snapshot. If it grows past ~20 MB, move to
  a release artifact and keep only the hashes.
- `.devcontainer/Dockerfile` installs Chromium's system libraries for the Playwright
  MCP server, pinned to the Playwright build `@playwright/mcp` uses. That layer is the
  one change CI cannot exercise: it is proved by a `devc rebuild` followed by
  postCreate printing "Playwright Chromium is installed and launches". Until that has
  been run once, the layer is written but unverified.
- The player/event "Distinctions" render no `place`: `place` and `place_number` are
  empty on every row of the pinned tag, so All-Pro first team and second team read as
  one string. Reported upstream (`RRiboulet/lol-dataset#42`); render the place when a
  tag carries one.
