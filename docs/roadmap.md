# Roadmap

Each phase ends with something visible on the deployed site and green in
`npm run check`. No phase links to a route that does not exist yet.

Phases 2 to 5 each have a spec under `docs/specs/`. A spec is the plan; the phase
is done when its acceptance criteria are ticked, not when the code exists.

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

Player and team names are still text: the links arrive with phase 3, because a
link to a route that does not exist yet is worse than plain text.

## 3 — Entities

Spec: `docs/specs/2026-11-20-phase-3-entities.md`

`/players/:id` with the context/career split and the competition → year filters,
`/teams/:id` with a derived roster, `/champions/:id` across eras.

## 4 — The pick'em view

Spec: `docs/specs/2026-11-20-phase-4-head-to-head.md`

`/compare`: two teams, the head-to-head record with its `n`, recent form, and a
champion pool overlap. No prediction, by design.

## 5 — Design and polish

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
