# 01: The distinction artifact, its type, and the module both pages share

**Blocked by:** — (needs the v1.2.0 pin)
**Status:** done

## What to build

`public/data/honours.json`: a pass-through of `fact_player_honour` — 24 rows, one
per player, event and title — plus the type, the lazy loader and the pure module
that answers the two questions the pages ask: *this player's distinctions* and
*this event's distinctions*.

## Scope

- A `fact_player_honour` view in `pipeline/sql/01_semantic_views.sql`, with its
  column types **declared**, not sniffed: `place_number` is empty on every recorded
  row, and DuckDB types a wholly empty column as `VARCHAR` — the integer the
  dictionary declares would arrive as text the day the source states one.
- The artifact in `build.py`, ordered `event_key, player_key, title` (the fact's
  grain key), with the columns spelled out in dictionary order.
- `HonourRow` in `src/lib/types.ts`, `loadHonours()` in `src/lib/data.ts` beside
  the alias loader — lazy, because only entity and event pages read it.
- `src/lib/honours.ts`: `distinctionsForPlayer`, `distinctionsForEvent`,
  `isMvpTitle`, and the grouping by competition the player page prints. Newest
  event first; MVP-named titles before the rest, then title, then player name.
- Two stale comments in `types.ts` that the pin refresh falsified: `Team.short_name`
  and `Champion.release_date` still claim they are pinned from the wiki.

## Acceptance criteria

- [ ] `honours.json` carries all 24 rows, ordered by `(event_key, player_key, title)`,
      and `npm run data:build` is deterministic.
- [ ] `place` and `place_number` are typed `INTEGER`/`VARCHAR` as the dictionary
      declares, proved by a pipeline test that describes the view.
- [ ] A distinction's team may be `0`; the module reports no team rather than a
      name, and the pages render nothing for it.
- [ ] The artifact contract in `src/lib/data.test.ts` admits exactly the two nulls
      the source states (`place`, `place_number`), and no others.
- [ ] `honours.test.ts` covers: event ordering newest-first, MVP titles first within
      an event, a player with no distinction, an event with none, and the unknown team.

## Validation

`npm run data:test` for the declared column types, `vitest` for the module, and
`data.test.ts` invariants that every `player_key`, `event_key` and non-zero
`team_key` in the artifact resolves in the eager index.

## Built

- **The column types are declared, and a test is why.** `place_number` is empty on
  every recorded row, and DuckDB types a wholly empty column as `VARCHAR`: the read
  would have typed the integer the dictionary declares as text, and the first pin
  that states a place would have changed this artifact's type with no commit to
  `types.ts`. `fact_player_honour` is read with `columns = {…}` like `dim_patch`,
  and `test_honour_place_number_is_declared_rather_than_sniffed` reads the
  declaration off a real DuckDB over the real file, then compares the row count to
  the CSV's.
- **`honours.json` is 24 rows and 17 artifacts are published now.** Ordered
  `(event_key, player_key, title)` — the fact's grain key — so the same pin writes
  the same bytes.
- **The module sorts by a rule, not by the file order.** A player's list runs newest
  event first; inside one event an MVP-named title comes before an All-Pro place,
  then the source's spelling, then the player's name. A distinction whose event the
  index cannot resolve is kept and sorted last rather than dropped: it is a stated
  fact, and the page renders no link for it.
- **Two comments the pin refresh had falsified were corrected** while here:
  `Team.short_name` and `Champion.release_date` still said they came from a wiki pin.
