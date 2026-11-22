# 03: The club a player was last seen with, as an abbreviation beside the name

**Blocked by:** — (independent of 01/02, but it lands in the same list and should reuse
whatever the sort work adds to `players.json`)
**Status:** todo

## What to build

On `/players`, each row reads `Faker  T1` — the player's name, then the abbreviation of
the club they were last seen with in this corpus, in the same muted mono style the
teams index uses for `Karmine Corp  KC`. The name stays the link to the player; the
abbreviation is a label, not a second link.

## What "current team" means here, and what it must not imply

The model has no contract table, no roster table and no transfer dates. Two honest
rules exist and only one is consistent with the rest of the site:

1. the club the player appeared for in their **most recent game** — this is the rule
   `TeamDetail` already uses for its "Current roster" (`rosterOfGame` over the last
   visible game), so the two pages cannot disagree about who plays where;
2. the club with the most games in the corpus — cheaper, but it would print a club the
   player left five years ago under the word "current".

Take rule 1. The label is then **"last seen with"**, and the column header or the
page's lead must say so in those words. A reader who assumes a contract from a
one-word label is being misled by the site, not by the data.

Two consequences worth stating in the copy: a player whose last game is in 2013 keeps
that club forever, because nothing later exists to move it; and a player whose last
game names no club (`team_key` 0) shows nothing rather than "Unknown".

## Scope

- `docs/metric-definitions.md` first: a **Current club (last seen)** row naming
  `fact_player_game` + `fact_game_side`, the rule, and the limits above.
- `pipeline/sql/06_indexes.sql`: `player_index` gains `latest_team_key` (from the
  player's latest game by `date_time_utc`, then `game_key` so a same-instant tie is
  deterministic); `players.json` carries the key, and the page resolves it against
  `teams.json` for the abbreviation — which keeps the artifact a key and not a
  duplicated name.
- The row layout in `EntityIndex`: name, then abbreviation; truncation must keep the
  abbreviation visible when the name is long (it is `shrink-0` in the teams index,
  same here).
- The `Unknown` club (key 0) renders nothing.

## Acceptance criteria

- [ ] Every player with at least one game shows the club of their last game; the
      number who show nothing equals the number whose last game names no club.
- [ ] The abbreviation matches the one on the team's page (`dim_team.short`), not a
      re-derivation from the name.
- [ ] A player who moved clubs shows the later one — checked on a real transfer in the
      corpus, named in the test.
- [ ] The lead sentence says the club is the one last seen with, and the page never
      says "current" without it.
- [ ] The teams index's row layout and the players index's row layout agree: same
      mono size, same gap, abbreviation never wraps or truncates.
- [ ] Long names truncate with the abbreviation intact, at 390 px and at 1440 px.

## Validation

A pipeline test comparing `player_index.latest_team_key` against a hand-written query
for two players (one who moved, one whose club states no short), and the page read
through the Playwright MCP server at both widths.
