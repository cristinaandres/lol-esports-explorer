# 10: Keep the game chips on the series row, aligned right

**Blocked by:** None (can start immediately)
**Status:** ready

## What to build

In a series row the format — "best of 5" — and the game chips `G1 G2 G3` are two cells
in a three-column grid, so the chips fall to a second line under the row and the list
reads as pairs of rows instead of one row per series.

The format and the chips share the last cell: the format first, the chips right-aligned
beside it, on one line. Below the breakpoint where a row stops fitting, the pair stacks
in the same order it reads now.

## Scope

- The shared series row component; the event page and the phase page both get it.
- No change to what a chip opens.

## Acceptance criteria

- [ ] At 1440 and 1024 a series row is one line, however many games it has.
- [ ] The chips sit at the right edge of the row.
- [ ] At 390 the row stacks and every part stays readable.
- [ ] A best-of-five with five chips still fits one line at 1024.

## Validation

A browser check measuring the row height at three widths, and a screenshot of a
five-game series.
