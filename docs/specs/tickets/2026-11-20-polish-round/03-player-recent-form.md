# 03: A player's recent form

**Blocked by:** None (can start immediately)
**Status:** done

## What to build

The question somebody actually has before a pick'em is *how is this player playing
now*, and the page answers it with a career average over fifteen years. A "recent
form" block shows the last ten games inside the current selection: date, competition,
opponent, champion, result and the player's own line.

Ten is a constant, not a filter: it is a reading habit, not a query, and the existing
filters already narrow the pool it draws from.

## Scope

- A function over the appearances the page already has, newest first, sliced to the
  constant. No new artifact.
- A compact table on the player page, above the full per-game breakdown.
- The block disappears when the player has no game in the selection.

## Acceptance criteria

- [ ] Shows at most ten games, newest first, each with opponent and result.
- [ ] Respects the active filters: filtering to Worlds 2025 shows the last ten of
      that selection, not the last ten overall.
- [ ] A player with three games shows three, with no empty rows.
- [ ] The slice size is a named constant, not a number inside a component.

## Validation

Unit tests over the slice: fewer games than the limit, exactly the limit, and an
empty selection.

## Built

A "Recent form" block above the per-game table: the last ten games of the current
selection, newest first, with competition, opponent, champion, result and the player's
line. `RECENT_FORM` is a named constant, and the slice respects the active filters.
