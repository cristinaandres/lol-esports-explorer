# 02: A players index that sorts by name or role

**Blocked by:** 01 (for the shared sort control and the `?sort=` convention)
**Status:** done

## What to build

`/players?sort=name|role`: 1,140 players, grouped by name initial (today) or by role.
`name` stays the default.

## The rule

A player's role is the role they appear in most in `fact_player_game`, tie broken by
the canonical order `Top, Jungle, Mid, Bot, Support` — the same rule ticket 01 settles
for a champion, applied to a player's own rows. 68 of the 1,140 players appear in two
roles and **6 tie at the top**, so the tie-break and its test are the substance of this
ticket rather than an afterthought.

The artifact carries the count behind the decision (`primary_role_games`), so the page
can say "Mid, 214 of 410 games" if it ever wants to, and a reader can tell a majority
from a coin flip.

## Region: dropped, on purpose

The first draft of this ticket also sorted by region. It is not built: measurement says
1,062 of 1,140 players appeared for clubs in more than one region, so any single label
is a "most games in" statement that reads as a nationality claim however it is worded,
and a player's region is not a fact the corpus states. A region belongs to a team, where
the model does state it. If region-per-player is ever wanted, it needs a discussion about
what it is for before it needs a column.

## Scope

- `docs/metric-definitions.md` first: a **Role (player)** row with its source
  (`fact_player_game.role`), its tie-break, and what it is not (not the player's main
  position over their whole career, not a contract role).
- `player_index` gains `primary_role` and `primary_role_games`; `players.json` carries
  them.
- The shared sort control from ticket 01; `?sort=` parsed and validated in one place,
  with a name tie-break in every comparator.
- The `Unknown` role group is not expected on this pin — every player row states a role
  — but a player the pipeline cannot place gets one rather than being dropped.
- The lead/eyebrow copy follows the sort.

## Acceptance criteria

- [ ] The two sort modes both list 1,140 players, each in exactly one group.
- [ ] The 6 players with a tied top role resolve by canonical order, deterministically.
- [ ] `?sort=name` is today's page, a bare `/players` means `name`, and an unknown value
      falls back to it.
- [ ] The filter box composes with both sorts.
- [ ] The role group header states the role and its count; no percentage appears.
- [ ] The page says the role is the one a player appeared in most, not the position they
      are known for.

## Validation

A pipeline test per column against a hand-counted player with two roles (one of the six
ties), vitest for the grouping and tie-break, then the page read through the Playwright
MCP server for the group counts.

## Built

- Same pipeline shape as ticket 01: `player_role_games` and `player_primary_role`, with
  `primary_role` and `primary_role_games` on `player_index` and in `players.json`.
- The six players who tie at the top are named in the test (Exosen, Hamezz, Kaigu,
  Reyk, Rock, Shushei); Exosen resolves to Mid and Shushei to Top by the canonical order,
  which is the one assertion a name-based tie-break would fail.
- `?sort=role` on the page: Top 231, Jungle 241, Mid 218, Bot 225, Support 225 — 1,140
  rows, every one in exactly one group.
- Region sort was dropped before the build, per the decision above; nothing in the code
  refers to it.
