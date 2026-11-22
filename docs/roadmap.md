# Roadmap

Each phase ends with something visible on the deployed site and green in
`npm run check`. No phase links to a route that does not exist yet.

Phases 2 to 5 each have a spec under `docs/specs/`. A spec is the plan, and its
acceptance criteria are the plan's checklist: phase 1 keeps them ticked, while the
later specs leave the boxes as written and record the outcome in their "Built" or
"Post-review changes" section, as every closed ticket does. Code alone is not done:
a phase is done when it is built, `npm run check` is green, and the spec says what
the build changed against the plan — a criterion that shipped differently is
recorded there, not left as a silent unticked box.

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

## 4 — The pick'em view *(not built)*

Spec: `docs/specs/2026-11-20-phase-4-head-to-head.md`

`/compare`: two teams, the head-to-head record with its `n`, recent form, and a
champion pool overlap. No prediction, by design.

## 3b — Polish round *(done)*

Tickets: `docs/specs/tickets/2026-11-20-polish-round/` (fourteen, in dependency order)

Review findings turned into work: the event selection audit, per-event coverage, a
player's recent form and role split, the event's champion and teams, and eight
consistency and accessibility fixes. Eleven can start immediately; three wait for the
pages they touch.

## 4b — Structure before phase 4 *(done)*

- `/eras` as a real index, so the breadcrumb can say `Home / Eras / …` without
  claiming the home page is the era list.
- Phases inside a competition: the event page groups its series by `tab`, and each
  phase is a page of its own.
- Every trail starts at Home; every entity trail passes through its index.

## 5 — Design and polish *(not built)*

Spec: `docs/specs/2026-11-20-phase-5-design-pass.md`

Figma frames named after the IA document, tokens kept in parity with `@theme`,
the five states designed, and an accessibility pass.

## Known follow-ups

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
