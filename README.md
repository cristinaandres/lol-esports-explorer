# Rift Lens

An explorer for **3,091 international League of Legends games** played between
2011 and 2026 — from the era, to the event, to the series, to the game and its
draft. The repository is `lol-esports-explorer`; the site it builds is Rift Lens.
A *rift lens* is the glass you read the record through: it does not change what
happened, it decides how closely you are allowed to look.

**Live:** <https://cristinaandres.github.io/lol-esports-explorer/>

## Why it exists

Most League stat sites answer "who won" and stop there. The interesting question
before an international event is a different one: *what does this team's record
actually say, and how much of it is there?* A head-to-head between two teams at
Worlds is often three games. A win rate over three games is a coin, not a
prediction, and a tool that shows `67%` without the `3` is telling you something
it cannot know.

So this one has a rule: **no share renders without its denominator.** Every
percentage appears as `62% (8/13)`, every average carries its sample size, and
every game declares what the source could actually measure in the era it was
played in. The judgment stays with the reader — which is what a coach preparing a
draft, a broadcaster preparing a storyline, or a fan filling in a pick'em needs.

## The three layers

| Layer | What it is | Where it lives |
|---|---|---|
| **1. Model** | DuckDB SQL over a pinned dimensional model, emitted as small JSON artifacts | `pipeline/`, `public/data/` |
| **2. Information architecture** | The navigation spine, the component rules, the Figma brief | `docs/information-architecture.md`, `docs/design/` |
| **3. Site** | React + TypeScript + Tailwind, static, no backend | `src/` |

The data flows one way:

```
lol-dataset (pinned tag)
  └─ data/model/*.csv            5.3 MB, committed, hashed
       └─ pipeline/sql/*.sql     DuckDB views: eras, events, coverage
            └─ public/data/*.json     13.5 MB raw, 1.3 MB gzip, committed
                 └─ src/         loads once, filters in memory
```

There is no API and no database at runtime. A page's first fetch is 46 KB gzip;
the game-level files load when a page draws games, and the 5 MB of player rows only
when one opens a career or a game. Every filter after that is in memory.

## What makes the numbers trustworthy

- **The era spine is declared, not inferred.** `data/upstream/game-eras.json`
  says which statistics could exist when, with the patch that created each
  boundary cited. A 2013 game is not penalised for having no Voidgrubs.
- **Coverage is displayed, never filtered away.** A game is
  `complete`/`partial`/`unavailable` per group, and the site shows the counts.
- **Admitted is not the same as played.** 54 events were admitted upstream and 52
  carry a game; 2,068 series were admitted and 1,964 were played. Both numbers
  appear, because the gap is a fact about the source.
- **Every artifact is reproducible.** `npm run data:check` rebuilds the JSON in
  memory and fails if a committed file differs by one byte.
- **Every audit is re-runnable.** A number a spec claims about the data can be
  re-derived in `notebooks/`, which reads the model and the artifacts and never
  writes either.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173/lol-esports-explorer/

npm run check        # lint + tests + pipeline refusals + artifact freshness + build
npm run data:build   # regenerate public/data/ from data/model/
```

The pipeline needs [uv](https://docs.astral.sh/uv/) (it provides Python and
DuckDB); everything else is npm. To run the SQL by hand:

```bash
duckdb -c ".read pipeline/sql/01_semantic_views.sql" \
       -c ".read pipeline/sql/02_eras.sql" \
       -c "select era, games from era_summary;"
```

## Repository map

```
data/model/                pinned dimensional model (do not edit by hand)
data/upstream/             pinned era table and upstream manifest
data/PROVENANCE.md         what is pinned, from where, and how to refresh
pipeline/sql/              the semantic layer: DuckDB views over the model
pipeline/build.py          emits public/data/*.json, and --check
public/data/               the artifacts the site reads (generated, committed)
notebooks/                 read-only investigations, the evidence behind a claim
src/routes/                one file per level of the navigation
src/components/            Ratio, Scoreboard, DraftBoard, PlayerTable, Layout
src/lib/                   types, formatters, era copy
docs/                      product spec, IA, metric definitions, roadmap
```

## Scope

Built: the era spine, era detail with coverage, the event page, the series page, the
game page with its scoreboard, draft board and player rows, and the player, team and
champion pages with the context/career split and search. The 42 games the source
attaches to no series are reachable from their event.

Next: the crystal ball — the eighteen recurring pick'em questions, each answered as a
record with its interval, its sample and its limits — and then the backtest that
measures whether its rankings beat a carry-over baseline. Predicting a match winner
is not in that phase; it is deferred to a later one, and `docs/roadmap.md` says why
and what would have to be true first. See `docs/specs/README.md` for every spec.

## Licence

Code MIT; game data CC BY-SA 3.0 from [Leaguepedia](https://lol.fandom.com). See
`ATTRIBUTION.md`. Not endorsed by Riot Games.
