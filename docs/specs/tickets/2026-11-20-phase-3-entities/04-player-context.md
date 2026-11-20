# 04: Arrive at a player from the game they just played

**Blocked by:** 03 (shares the query-string contract and the page header)
**Status:** ready

## What to build

A reader on a game page clicks a player name and lands on that player's career with
the game they came from still in view: event, series, game number, side, result,
champion and that game's row. One control widens the view to the career and drops
the context from the URL, keeping the filters.

This is the pattern the product was designed around — the answer you asked for
first, the wider question one click away — and it is also the moment player names
stop being text and become links.

## Scope

- The context block: a compact card built from the game the reader came from.
- `?from=game:<id>`: read the game, tolerate an id that no longer exists, and
  degrade to the plain career view rather than erroring.
- Player names in the game page's player table become links carrying the context.
- The "Career view" control, which removes only the `from` parameter.

Leaves for later tickets: linking players from anywhere else (the era, event and
series pages), which needs its own decision about what context to carry.

## Acceptance criteria

- [ ] A player name on a game page links to that player with that game as context.
- [ ] Landing with `?from=` shows the context first and the career below it.
- [ ] The control that widens the view removes only the context, and the filters
      selected on the page survive it.
- [ ] `?from=` pointing at a game that does not exist renders the plain career view
      with no error and no empty block.
- [ ] The context block states the side, which the series page deliberately does
      not, because this is the level where the side belongs.
- [ ] Every other player name on the site is still not a link: no dead
      destinations are introduced.

## Validation

Unit tests on the context parameters (present, absent, stale id), and a browser
walk from a game to a player and back. Covers spec R2 and closes phase 2's R8,
which left the names as text on purpose.
