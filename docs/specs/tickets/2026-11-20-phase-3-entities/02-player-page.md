# 02: A player page that answers who this is and how they did

**Blocked by:** 01 (the alias bridge, for the names the player appeared under)
**Status:** ready

## What to build

`/players/:id` — a career page for one player, over every game they appear in:
games, wins and losses, win share **with its denominator**, KDA with its formula
shown, per-game averages, and the champion pool with counts. Arriving from a game
comes later; this ticket is the destination on its own.

The aggregation is a pure module with its own tests, not logic inside a component,
because three later tickets reuse parts of it.

## Scope

- The career summary module: filter the player's rows, sum them, derive the
  figures, and never produce a share without its total.
- The page, composed from the existing `Ratio`, `Stat` and `Breadcrumbs` pieces.
- The player's **stated** former handles from ticket 01, with their windows.
- An unknown id renders the same instructive 404 the other pages already use, not
  an empty career.

Leaves for later tickets: filters (03), arriving from a game (04), and the linking
of player names elsewhere in the site (04).

## Acceptance criteria

- [ ] `/players/faker` renders 410 games and a KDA of 4.11, which is the number the
      pipeline answers for the same question.
- [ ] Every figure on the page is a count, or a ratio with both values visible.
- [ ] A player whose career spans several eras shows the champion pool and the
      counts, and no claim about pick order.
- [ ] A player with a single game renders one game without dividing by zero
      anywhere.
- [ ] An id that does not exist renders the 404 page, and the back link returns to
      the era spine.
- [ ] The lazy artifacts are fetched once: a second player page in the same session
      makes no new request.

## Validation

Unit tests on the career module (a career spanning two eras, a career with zero
deaths, a single-game career, an empty filter), and a data test that cross-checks
the module's answer against the same aggregation in SQL for the most-modelled
player. Covers spec R1 and R7.
