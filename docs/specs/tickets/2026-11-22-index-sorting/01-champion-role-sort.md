# 01: A champion's most-played role, and a champions index that sorts by it

**Blocked by:** — (needs the metric definition below in `docs/metric-definitions.md` first)
**Status:** done

## What to build

`/champions?sort=role`: the same 171 champions, grouped by the position they were
most played in instead of by initial letter. `?sort=name` is today's grouping, and the
default.

## The rule, which is a decision and not a formula

A champion's role is the role it appears in most in `fact_player_game`. Measured, 139
of the 171 champions appear in more than one role, and exactly two tie at the top:

| Champion | Tied roles |
|---|---|
| **Rammus** | Jungle 4, Top 4 |
| **Teemo** | Top 2, Bot 2 |

So the tie-break is part of the definition, and both of those names belong in the test:

1. most player-game rows in that role;
2. on a tie, the role that appears first in the canonical order `Top, Jungle, Mid,
   Bot, Support` — a fixed order rather than count of games or name, because a tie is
   a tie and the answer must not depend on which row the CSV happened to list first;
3. and the artifact carries the count it was decided on, so a reader can see that
   112 of 288 games is a majority and not the whole story.

## Scope

- `docs/metric-definitions.md` first: a row for **Role (champion)** naming the source
  (`fact_player_game.role`), the rule above, and what it is not (not the champion's
  design, not its lane in a patch).
- `pipeline/sql/06_indexes.sql`: `champion_index` gains `primary_role` and
  `primary_role_games`; `champions.json` carries them, so the eager set stays 171
  rows and the page needs no lazy fetch.
- A shared sort control (ticket 02 uses it too) and the `?sort=` parameter.
- The grouped layout the index already has: a role group is a section with a count,
  and inside it the existing order (games desc, then name).
- The page's `eyebrow`/`lead` follow the sort (`grouped by role`), not a fixed string.

## Acceptance criteria

- [ ] `?sort=role` shows five groups whose row counts add up to 171, and a champion
      with no games is in none of them (the index already excludes those).
- [ ] The 2 champions with a tie resolve by the canonical role order, both before and
      after a rebuild — proved by a test, not by looking at the page once.
- [ ] `?sort=name` renders exactly today's page, byte for byte, and a bare `/champions`
      means `name`.
- [ ] An unknown `?sort=` value falls back to `name` rather than an empty page.
- [ ] Each group's header states the role and the count of champions in it; no
      percentage appears anywhere.
- [ ] The filter box and the sort compose: `?sort=role&q=kaisa` shows one group.

## Validation

A pipeline test that the SQL answer for a hand-checked champion (Ahri: 288 games, its
role split) matches `champion_index`, and a vitest for the grouping helper over a
fixture with a tie. Then the page, read through the Playwright MCP server, for the
five-group count and the fallback.

## Built

- `role_rank(role)` in `06_indexes.sql` is the canonical order as one macro, so the two
  entities that need it cannot drift; `champion_role_games` and
  `champion_primary_role` rank with `row_number() over (order by games desc, role_order)`.
- `champion_index` carries `primary_role` and `primary_role_games`; `champions.json`
  publishes both, so the index stays 171 rows and loads with the eager set.
- The sort is `?sort=name|role` and the filter is `?q=`, both URL parameters read through
  one `parseIndexSort`, with unknown values falling back to `name`.
- `src/lib/indexGroups.ts` owns the grouping and the stable order (games desc, then
  name); `SelectField` is the shared control, extracted from `CareerFilters`.
- Group counts on the page: Top 37, Jungle 38, Mid 39, Bot 28, Support 29 — 171 rows,
  and Rammus and Teemo appear under Top, which is the tie-break visible on the page.
- Tests: `indexGroups.test.ts` (initial grouping, draft-order role grouping, unknown
  role, tie stability, no row dropped) and
  `test_primary_roles_resolve_ties_by_the_canonical_order` in the pipeline suite, which
  asserts Rammus/Teemo/Hari and that every published row has one of the five roles.
