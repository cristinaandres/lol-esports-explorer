# 13: Stop making phones scroll tables sideways

**Blocked by:** None for the tables that exist today; see the note on ordering
**Status:** done

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

## Built

Verified at 390 px on sixteen routes: **no page scrolls horizontally, and no table
inside a page does either**. Before this, eight tables did.

Two changes, and the split is deliberate:

  - The tables that could not fit — the ten-column player table, the era's event
    table, a player's recent form and a champion's per-era table — render through a
    shared `DataTable`: a real table from `sm` up, and one stacked block per row below
    it, each value carrying its label. Both copies are in the DOM with one hidden, so
    a screen reader reads the visible one and nothing is announced twice.
  - The narrow numeric tables — four columns of short values — simply fit once the
    minimum width is gone and the cells tighten on mobile. Stacking them would have
    made a phone read like a spreadsheet printed on a till roll.

Every value on desktop is visible on a phone; nothing is dropped or folded away.
