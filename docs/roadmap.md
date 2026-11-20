# Roadmap

Each phase ends with something visible on the deployed site and green in
`npm run check`. No phase links to a route that does not exist yet.

## 0 — Foundation *(done)*

- Repository, licence, attribution, provenance pin.
- DuckDB pipeline: semantic views, era spine joined to measured facts, totals.
- Deterministic artifacts with `--check`.
- Era spine and era detail pages, glossary, 404, skeleton states.
- Deploy to GitHub Pages on every push to `main`.

## 1 — Era detail, complete *(done)*

Coverage panel, boundary citation, event table, previous/next era including gaps.

## 2 — Event and game

- `/events/:id`: format, teams, the series and game list, leaders per role, draft
  pool with pick and ban counts.
- `/series/:id`: only for best-of-three and above.
- `/games/:id`: scoreboard, draft board with fidelity, player rows.
- New artifacts: `games.json`, `player-games.json`, `bans.json`. Bans are lazily
  loaded on the game page; picks come from the player rows already, because every
  player row states the champion.

## 3 — Entities

- `/players/:id` with the context/career split and the competition → year filters.
- `/teams/:id`: roster over time, side preference, event record.
- `/champions/:id`: pick and ban record across eras and patches.

## 4 — The pick'em view

- `/compare`: two teams, their record with `n`, head-to-head with `n`, side
  preference, champion pool overlap, and recent form marked as recent.

## 5 — Design and polish

- Figma file matching `docs/information-architecture.md`, tokens exported to
  `@theme`.
- Empty, partial and error states designed rather than defaulted.
- Accessibility pass: focus order, contrast, landmark regions.

## Known follow-ups

- `.devcontainer/docker-compose.yml` still names its volume `lol-dataset-pi-config`.
  Renaming it would create a new empty volume and drop the container's gh
  credentials, so it is left alone deliberately.
- `public/data/events.json` is 24 KB and is loaded on every page. If a later
  artifact pushes the payload past ~150 KB, split it per era.
- `data/model/` is committed as a pinned snapshot. If it grows past ~20 MB, move to
  a release artifact and keep only the hashes.
