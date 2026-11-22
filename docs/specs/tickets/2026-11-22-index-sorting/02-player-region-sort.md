# 02: A players index that sorts by region, name or role

**Blocked by:** 01 (for the shared sort control and the `?sort=` convention)
**Status:** todo

## What to build

`/players?sort=region|name|role`: 1,140 players, grouped by name initial (today),
by role, or by region. `name` stays the default.

## The two rules, which are the whole ticket

**Role (player)** — the same rule as ticket 01, over the player's own rows: most
player-game rows in a role, tie broken by the canonical order `Top, Jungle, Mid, Bot,
Support`. 68 players appear in two roles; 6 tie at the top.

**Region (player)** — and this one needs saying plainly, because it is a claim about a
person that the corpus cannot really make. `dim_player` has no region. What the corpus
has is which club a player appeared for, and a club states a region. So the rule is:

1. the region of the clubs the player appeared for, by games;
2. a tie broken alphabetically, the `Unknown` region last;
3. a player with no club region at all groups under `Unknown`.

Measured: **1,062 of the 1,140 players appeared for clubs in more than one region**, so
this is a majority derived label, not an edge case. The copy must therefore say what
it is — "the region they played most of their games in" — and never imply nationality
or registration. If that copy cannot be written without misleading a reader, the
honest alternative is to drop the region sort and keep role; raise it before building.

## Scope

- `docs/metric-definitions.md` first: rows for **Role (player)** and **Region
  (player)**, each with its source, its tie-break, and its limits.
- `player_index` gains `primary_role`, `primary_role_games`, `region`; `players.json`
  carries them. The eager set grows by three small fields per row.
- The shared sort control from ticket 01; `?sort=` + a name tie-break in every
  comparator.
- The `Unknown` region group renders like any other, and its count is the number of
  players whose clubs state no region — never hidden.
- The lead/eyebrow copy follows the sort.

## Acceptance criteria

- [ ] The three groups' counts add up to 1,140 for each sort, and no player appears in
      two groups.
- [ ] A player whose clubs span regions lands in the one with the most games; a tie
      resolves alphabetically; the page says "played most of their games in".
- [ ] The 6 players with a tied top role resolve by canonical order, deterministically.
- [ ] `?sort=name` is today's page, a bare `/players` means `name`, and an unknown
      value falls back to it.
- [ ] The filter box composes with all three sorts.
- [ ] No player is dropped for having no role or no region: they group under
      `Unknown`, with the count printed.

## Validation

A pipeline test per derived column against a hand-counted player with two roles and
two regions, vitest for the grouping and tie-breaks, and the page read through the
Playwright MCP server for the three group counts and the `Unknown` bucket.
