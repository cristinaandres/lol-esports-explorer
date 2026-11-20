# 13: Stop making phones scroll tables sideways

**Blocked by:** None for the tables that exist today; see the note on ordering
**Status:** ready

## What to build

The player table, the per-game table and the event tables set a minimum width and let
the container scroll. At 390 px that means the most important column is off-screen
until the reader drags the table sideways — a gesture nothing on the screen announces.

Below the breakpoint each row becomes a stacked block: the name first, then the
figures as label and value pairs. Nothing is dropped and nothing is hidden; the
reading order simply changes.

## Scope

- The shared table patterns on the player, team, champion and event pages.
- No change to the data or to the desktop layout.

## Acceptance criteria

- [ ] No page scrolls horizontally at 390 px.
- [ ] Every value visible on desktop is visible on a phone.
- [ ] A row announces its team or side without needing the column header.
- [ ] Desktop layout is unchanged.

## Validation

A browser check that measures scroll width against client width on every route at
390, and a screenshot of the player table.

## Note on ordering

Blocked by the tickets that add columns or sections — 03, 04 and 06 — and worth doing
with 12, which touches the same loading shells.
