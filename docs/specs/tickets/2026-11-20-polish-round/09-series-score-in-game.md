# 09: Show the series score on a game

**Blocked by:** None (can start immediately)
**Status:** ready

## What to build

Landing on game 3 of a best-of-five, nothing on the page says the series stands at
2–1. The breadcrumb names the series, the scoreboard names the game. The score belongs
between them.

It goes beside the game's own line in the header, and disappears for a best-of-one,
where the score would be a restatement.

## Scope

- Derived from the series' games, already loaded.
- One line in the header; no new section.

## Acceptance criteria

- [ ] A game in a best-of-five shows the series score with both team names.
- [ ] A best-of-one shows nothing extra.
- [ ] A game with no series shows nothing and does not break the header.
- [ ] The score matches the series page for the same series.

## Validation

A browser check comparing the score on a game with the score on its series page.
