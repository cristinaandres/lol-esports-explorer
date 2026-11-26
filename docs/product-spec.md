# Product spec

Status: decided, in build. Written before the first page existed, so the shape of
the navigation is argued here rather than discovered in a component.

## Who it is for

**Primary — the spectator filling in a pick'em.** They open the site before an
international event, find two teams, and want to know what the record says. They
have no patience for a table they cannot read on a phone, and no way to check
whether "67%" means twenty games or three.

**Secondary — the analyst or coach.** They want the same pages with more depth:
draft tendencies, side preferences, how a team's numbers move across patches. They
are the reason the site never rounds away the sample size — they would notice, and
they are the audience whose trust is worth the most.

A broadcast producer sits in between: they need a storyline they can defend on
air, which is a record with a denominator, not a prediction.

## The one rule

> No percentage is drawn without its denominator, and no average without its
> sample size and its coverage.

Implemented as the `Ratio` component rather than a convention, so it cannot be
forgotten: `62% (8/13)`.

## What it refuses to do — and what it defers

- **No predicted winner, in this phase.** A model over this corpus would be trained
  on a few hundred games per era, most between teams that met once. Its output would
  look more certain than the evidence. The site puts the record in front of the reader
  instead. Prediction is deferred to round 6, not dropped: the phase 4 spec says why,
  and what would have to be true before it is built.
- **No invented metrics.** Every measure is either a source-stated count or a
  ratio of two of them, and every one is defined in `metric-definitions.md`.
- **No silent filtering.** A partial game is shown and marked, not dropped.
- **No number without its uncertainty, since The Almanac.** A share carries its
  interval and its `n`; below `n ≥ 20` the answer says "insufficient data" instead
  of drawing one.

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | Era is the first level of the site | The game changed six times in fifteen years. A kill count from 2013 and one from 2025 are not the same measurement, so the comparability rule has to come before the data, not after a filter. |
| D2 | The era spine is declared upstream, not derived from games | Inferring it would make "no game before a boundary carries a field that era cannot have" true by construction. Two declared eras govern no game; the site shows them as gaps. |
| D3 | Entity pages sit outside the era axis | A player's career crosses every era. Nesting players under events would make "Faker across Worlds" unreachable. |
| D4 | Filters live in the URL | Every view is a link someone can paste into Discord. A filter state that only exists in memory is a filter state nobody shares. |
| D5 | No backend, no runtime query engine | The pinned model is 5.5 MB and the eager payload is ~46 KB gzip. Shipping DuckDB-WASM (~30 MB) to query it in the browser would cost more than it returns. |
| D6 | Artifacts are committed and checksummed | A clone renders without Python, and `data:check` proves the committed bytes are current. |
| D7 | Coverage is shown per game, not summarised away | Partial is a property of the source. Hiding it would make the chart clean and the claim false. |
| D8 | Series is a level only when best-of is greater than one | 1,389 of the 1,964 played series are best-of-one (1,455 of the 2,068 admitted). A three-level spine that assumes a series would be wrong two thirds of the time. |
| D9 | Empty declared eras are documented, not navigable | Two of the eight declared eras govern no game. Keeping them as cards puts two dead doors in the primary navigation; dropping them from the data would break the chain of patch citations. They stay in the data, appear in the glossary, and remain reachable by URL. |
| D10 | The product name is not the repository name | A repository is a filing decision, a product is a brand decision, and they change for different reasons. The name lives in `src/lib/site.ts`; the repository stays descriptive so it is findable. |

## Success, observably

- A first-time visitor reaches a specific game and its draft in under a minute,
  on a phone, without a search box being the only way in.
- Every figure on screen has a denominator, a source file and a rebuild command.
- The repository explains the pipeline, the design and the data without the site
  running.

## Out of scope

Accounts, favourites, comments, live match data, and anything requiring a server.
