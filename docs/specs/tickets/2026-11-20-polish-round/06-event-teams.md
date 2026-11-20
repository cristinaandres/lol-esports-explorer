# 06: List the teams that played an event

**Blocked by:** None (can start immediately)
**Status:** done

## What to build

The event page shows a team count — "5 teams" — and never names them. A reader cannot
tell whether the event had five teams because it was a small invitational or because
the corpus lost half the bracket.

A section lists the event's teams with games played and win rate, linked to their
pages, ordered by games. It is derived from the games the event already carries, so
it cannot drift from the series below it.

## Scope

- A summary over the event's games; no new artifact.
- One section, placed after the phases, because team totals are a summary rather
  than an entry point.

## Acceptance criteria

- [ ] The teams listed reconcile with the event's games: the games column sums to
      twice the event's game count.
- [ ] Each team links to its page.
- [ ] A team with one game shows one game, not a blank.
- [ ] The count in the stat strip equals the number of rows that have games.

## Validation

A data test asserting the sum of the listed teams' games equals twice the event's
games, for every event.

## Built

A Teams section listing every team the event's games name, with games and win rate. The
games column sums to twice the event's game count, which is what makes it reconcile
with the phases above rather than being a separate claim.
