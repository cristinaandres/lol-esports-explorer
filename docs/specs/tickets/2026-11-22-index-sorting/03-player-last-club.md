# 03: The club a player last played for, as an abbreviation beside the name

**Blocked by:** — (independent of 01/02, but it lands in the same list and should reuse
whatever the sort work adds to `players.json`)
**Status:** todo

## What to build

On `/players`, each row reads `Faker  T1  2026` — the player's name, the abbreviation of
the club they last played for in this corpus, and the year of that last game, in the
same muted mono style the teams index uses for `Karmine Corp  KC`. The name stays the
link to the player; the abbreviation and the year are labels, not links.

## What the club is, and why the word "current" is banned

The model has no contract table and no roster table, and a roster changes between
seasons — so "current team" is a claim the data cannot support and the label must not
make it. What the corpus *can* support is the club a player appeared for in their most
recent game. That is the same rule `TeamDetail` already uses for its roster
(`rosterOfGame` over the last game of the selection), so a player's row and a team's
roster cannot disagree about each other.

The label is therefore **"last played for"**, with the year beside it: `Faker  T1  2026`
reads as a record, `Faker  T1` alone reads as a contract. A player whose last game is in
2013 keeps that club and shows 2013, which is true and visibly old.

Three consequences the copy and tests carry:

- the year is the year of that last game, not a season label the dataset does not have;
- a player whose last game names no club (`team_key` 0) shows nothing at all, not
  "Unknown";
- a player with no game is not in this index already, so the empty case is unreachable.

## Scope

- `docs/metric-definitions.md` first: a **Last club (last played for)** row naming
  `fact_player_game`, `fact_game_side` and `dim_game.date_time_utc`, the rule, and the
  limits above.
- `pipeline/sql/06_indexes.sql`: `player_index` gains `latest_team_key` and
  `latest_game_date`, taken from the player's last game ordered by
  `date_time_utc desc, game_key desc` so a same-instant tie is deterministic.
- `players.json` carries the key and the date; the page resolves the key against
  `teams.json` for the abbreviation, which keeps the artifact a key rather than a copied
  name.
- The row layout in `EntityIndex`: name, abbreviation, year; the abbreviation and year
  are `shrink-0` so a long name truncates instead of hiding them.

## Acceptance criteria

- [ ] Every player in the index shows the club of their last game, and the year of it.
- [ ] The abbreviation is the one the team's own page shows (`dim_team.short`), not
      re-derived from the name.
- [ ] A player who moved clubs shows the later one — checked against a named transfer in
      the corpus, and against the team page's roster for the same club.
- [ ] Nothing on the page or in the docs says "current" about a player's club.
- [ ] A last game with `team_key` 0 renders no club and no year rather than "Unknown".
- [ ] Long names truncate with the abbreviation and year intact, at 390 px and 1440 px.

## Validation

A pipeline test comparing `player_index.latest_team_key` and `latest_game_date` against
a hand-written query for two players (one who transferred, one whose last club states no
short), and the page read through the Playwright MCP server at both widths.
