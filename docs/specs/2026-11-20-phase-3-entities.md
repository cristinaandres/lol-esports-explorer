# Phase 3 — Entities, and the local/global split

Status: proposed, broken into tickets. Depends on phase 2 (player and team names
must be reachable from a game first). Phase 4 depends on this one for team identity.

Tickets: `docs/specs/tickets/2026-11-20-phase-3-entities/`.

| Ticket | Blocked by | Delivers |
|---|---|---|
| 01 | — | The alias bridge: renames, as data and as a pure module |
| 02 | 01 | The player page, its aggregation module and its tests |
| 03 | 02 | Competition → year filters, derived era, empty states |
| 04 | 03 | Arriving from a game: context block and player links |
| 05 | 03 | The team page, its filters, and renames shown |
| 06 | 02 | The champion page across eras |
| 07 | 05, 06 | Search by any name an entity ever had |

## Objective

A reader arrives at one game, sees a player, and wants to know what that player's
career looks like — not this one game, but every game, narrowed by competition and
year. Today there is no entity page at all: phase 2 deliberately renders those
names as text.

This phase builds three entity pages and, in doing so, settles the pattern the
whole product hangs on: **you keep the context you arrived with, and you can widen
it on demand.**

## Current behavior

- No `/players`, `/teams` or `/champions` routes exist.
- Phase 2 ships `player-games.json` (30,910 rows, 661 KB gzip) lazily loaded and
  cached, and `games.json` eagerly.
- Measured: 1,140 players appear in at least one game; 181 teams; 173 champions.
  The most-modelled player in the corpus has 410 games, the median far fewer.
- The model has **no per-minute data**. Career aggregates must be sums, ratios and
  counts over game rows; a "gold lead at 15" does not exist and cannot be derived.

## Required behavior

- **R1** `/players/:id` renders a career summary computed over every game the
  player appears in: games, wins and losses, win share with its denominator, KDA
  with its formula, per-game averages, and the champion pool with counts.
- **R2** `?from=game:<gameId>` renders the context block above the career block:
  the event, series, game number, side, result, champion and that game's row.
  A "Career view" control widens the view and removes the context from the URL.
- **R3** Career filters are **competition, then year**, both encoded in the URL.
  The era is derived from the selected years and shown as a read-only chip, and is
  never chosen directly, because era and year together produce empty combinations.
- **R4** Every share carries its denominator, and a filter combination with no
  games renders an empty state that names the filter which emptied it — not
  "no data".
- **R5** `/teams/:id` renders the event record, the side preference and the roster
  over time, derived from the player rows rather than from a roster table the
  model does not have. *(Extended in review: the page takes the competition → year
  filters, because a team unfiltered accumulates fifteen years of roster, and it
  lists the names the team played under — `MAD Lions`, `MAD Lions KOI` and
  `MKOI` are one team, and `MAD Team` is not.)*
- **R6** `/champions/:id` renders picks, bans and presence by era, each with the
  games it is measured over.
- **R7** An id that does not exist renders the 404 page, not an empty entity page.
- **R8** *(Added in review.)* A search control in the header finds a player, team or
  champion by any name it has ever had, and says which former name matched. Without
  it the only way into an entity is to arrive from a game that contains it, which
  leaves most of the corpus reachable only by guessing a URL.

## Renames are data, not a special case

The model already answers the review's example. `MAD Lions` (2020-09-25 to
2023-10-26), `MAD Lions KOI`, `MKOI` and `Mad Lions` all resolve to Movistar KOI
through the alias bridge, and `MAD Team` — the LMS team — stays separate. There are
3,791 aliases: 2,872 players, 747 teams, 172 champions. The bridge is therefore a
prefactor for this phase (ticket 01), not a detail of the team page.

## Non-goals

Head-to-head between two teams (phase 4), player search, player comparisons, any
ranking of players by a derived measure, and any per-minute or timeline figure.

## Constraints

- Aggregation happens in the browser over the already-loaded rows; no new
  artifact and no request per filter change.
- A filter change must stay under ~200 ms on a mid-range phone for the fullest
  career in the corpus (410 games). Measure it, do not assume it.
- Entity ids in URLs are the natural ids (`player_id`, `team_id`, `champion_id`);
  surrogate keys are build-local and would break every shared link on the next
  rebuild.
- The derived era label must come from the era table, not from a hard-coded year
  range in a component.

## Design decisions

- **The context block is first, the career block second.** The reader arrived with
  a question about one game; answering it before offering the wider view respects
  why they clicked.
- **The era is a consequence, not a control.** Offering era and year as two
  independent filters would let a reader select 2013 and `atakhan` and get nothing,
  which reads as a bug. Deriving one from the other makes the empty state
  unreachable.
- **`?from=` is a hint, not a parent.** A player page is a valid destination on
  its own; the parameter only adds a block and a back-link. A stale game id
  degrades to the plain career view instead of erroring.
- **KDA is displayed with its formula and its game count**, per
  `metric-definitions.md`, and never in a leaderboard.

## Test seams

- **`src/lib/career.ts`** — `filterPlayerGames`, `summarise` and `deriveEra` are
  pure and tested against fixtures: a career spanning two eras, a career with one
  competition and no games in the year selected, and a career with zero deaths.
- **Cross-check against the pipeline** — a data test asserts that the browser
  summary for the most-modelled player equals the answer the same question gets in
  SQL (410 games, KDA 4.11). If the two diverge, one of them is wrong, and this is
  the seam where that shows up.
- **URL round-trip** — a test asserts that parsing then serialising a filter state
  returns the same string, so a shared link is stable.

## Acceptance criteria

- [ ] `/players/faker?from=game:<id>` shows that game first, and one control
      widens to the career.
- [ ] Selecting `Competition: Worlds` then a year re-renders without a network
      request, and the URL reproduces the exact view.
- [ ] The era chip changes to `mixed` when the selected years cross a boundary.
- [ ] Every figure on a career block carries its denominator or its game count.
- [ ] An empty filter combination explains which filter emptied it.
- [ ] The browser summary for the most-modelled player matches the SQL answer.
- [ ] A filter change on the fullest career stays under 200 ms.

## Verification

```bash
npm run check
duckdb -c ".read pipeline/sql/01_semantic_views.sql" \
       -c "select count(*), round((sum(kills)+sum(assists))/sum(deaths),2)
           from fact_player_game where player_key = 1;"
# then compare with the same figure rendered on /players/<that player>
```

## Open assumptions

- **That filters need no precomputed artifact.** 30,910 rows is small enough to
  filter in memory; if a career page proves slower than the budget, the fallback
  is one precomputed `player-career.json` keyed by player and competition, not a
  backend.
- **That rosters can be derived.** The model has no roster table, so a team's
  roster is inferred from who appears in its games. That is a fact about who
  played, not who was signed, and the page must say so.

## Post-review changes

Five changes asked for after the phase shipped, and what each settled.

1. **A series row is one link again.** Making the two team names separately
   clickable inside an event's series row split one destination into three. The row
   links to the series or the game; the page it opens is where a team name becomes a
   link, because that is the level where the team is the subject.
2. **The team page separates the current roster from everyone.** "Current" is the
   players who appeared in the team's most recent game in the selection: the corpus
   has no roster table and no contract dates, so the last game is the only evidence
   of who is on the team now.
3. **The champion page got filters and a breakdown.** Competition → year now narrow
   it like the other entity pages, and the page answers *where* the champion is
   played — a per-role table with picks, share, win rate and KDA — and *who* picks it,
   instead of a single table. A list of teams was built and removed in review: the
   teams that picked a champion are already on every game page that fields it.
4. **A competition in the team's event table is a control.** Clicking it applies the
   visible filter rather than opening a hidden one: the bar updates, the URL shows
   it, and the reader can undo it. A filter nobody can see is a filter nobody can
   trust.
5. **Titles are derived, and the rule is stated on the page.** The model has no
   champion column, so a title is inferred: an event's final is the single series
   named Finals, and the title goes to the team that won more games in it. The rule
   reproduces eleven known results (Worlds 2015–2024, MSI 2016–2024) and awards
   nothing where it cannot name one team — twelve events that name several series
   Finals, most of them Rift Rivals relays whose winner is a region. A relay is not
   disqualifying in itself: Rift Rivals 2017 NA-EU was decided by one best-of-five and
   awards TSM, which is correct. What decides is whether the event has one final to
   point at, not what kind of event it is.
