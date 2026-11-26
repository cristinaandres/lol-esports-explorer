# 00: The audit, the amended plan, and the nine tickets

**Blocked by:** — (needs the `v1.2.0` pin)
**Status:** done

## What to build

The round before any code: measure the catalogue against the pin, settle the
questions the 4a spec left open, and write the plan the other eight tickets follow.

- `docs/analysis/crystal-ball-audit.md`: the catalogue measured, with the query
  beside every figure, the season rule, and the corrections to the spec.
- The 4a spec amended: The Almanac, eighteen generic cards in four classes, the
  season window, the champion KDA card, the deferred named-entity questions, and
  the Answer contract gaps (`census`, `simulation`, `end`, `top`, a per-question
  artifact, the source hash).
- This ticket directory, nine tickets in dependency order.
- The documents that name the route: information architecture, roadmap, specs
  index, metric definitions, product spec, README and `AGENTS.md`.

## Scope

- **The catalogue**: 18 cards and 21 records, all generic. Champions 5, players 6,
  teams 3, events 4. The four named-entity questions — Faker's 700 kills, Peyz vs
  Gumayusi, HLE vs T1, an LCS team — are deferred with their generic replacements.
- **The season window**, derived from Worlds rather than the calendar year: season
  N runs from the day after Worlds N−1 final to Worlds N final. The pin has 16
  seasons, and exactly one event whose season differs from its `year`: IPL 5
  (29 Nov – 3 Dec 2012) belongs to season 2013.
- **The champion KDA card**, which replaces champion deaths per game: kills,
  deaths, assists and kill participation, with the best and worst ends on one page.
- **Teams**: win rate (best and worst), kills per game, gold per game.
- **The Answer contract changes** and the per-question artifact layout.
- **visx** for interactive charts; eras, relative ranges and event windows are
  deferred.

## Acceptance criteria

- [x] The dossier states every figure with its query, its method and the pin.
- [x] The spec's catalogue, routes, windows, contract and tests agree with the
      dossier.
- [x] The deferred named-entity questions keep their queries and name the generic
      question that replaces them.
- [x] `npm run check` is green (no code changed).

## Validation

`npm run check`; a read of the dossier against the spec; every figure re-run from
the query printed beside it.

## Built

- **The pin corrects three claims in the spec.** Faker has 667 kills in 184 Worlds
  player-games, not 822, so the 700 threshold is not crossed at the pin. A game
  holds 10.0 distinct picked champions (19.2 by presence), not 1.7. Teemo's four
  picks are four of 3,091 games, not four of 30,910 player-games; the 0.04% in the
  old spec was a different denominator, and the question is about a game.
- **The season rule is derived, and the pin has one exception.** The 16 seasons and
  the IPL 5 case are in the dossier with the query that produces them.
- **The catalogue is generic now.** The four named-entity questions are deferred,
  with player kills, team win rate and region knockouts as their generic
  replacements. Only the region question remains `not_verifiable`, so the comparison
  family and two of the three verification queries leave 4a.
- **The contract gaps are named.** `census` (the counts under the threshold and the
  MVP role census), `simulation` (the 90% interval of the unique-champion
  simulation), `end` and `top` (best/worst, 5/10/20), `part` on a share (a headline
  says "74 of 84", and the schema could not carry the 74), a per-question artifact,
  and a `source.sha256` that is the pin's manifest hash because a file cannot
  contain its own hash.
- **Charts are interactive, with visx**, and the windows are seasons first; eras,
  relative ranges and event windows are deferred.
- **Cost measured.** A pure-Python bootstrap of 20 candidates × 10,000 resamples ×
  50 values takes ~0.8 s; numpy takes ~0.05 s. Seventeen windows per question put
  the build in the 15–20 s range with numpy, which is why numpy is pinned.
