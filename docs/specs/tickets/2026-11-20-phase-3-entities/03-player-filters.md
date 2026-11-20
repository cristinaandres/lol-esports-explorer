# 03: Narrow a career by competition, then by year

**Blocked by:** 02 (the page this narrows)
**Status:** ready

## What to build

A filter bar on the player page, in the order the product asked for:
**competition → year**. Every selection lives in the URL, so
`/players/faker?competition=Worlds&year=2025` reproduces the exact view somebody can
paste into a chat.

The **era is not a control**. It is derived from the selected years and shown as a
read-only chip, because era and year as two independent filters produce empty
combinations that read as a bug. When the selection crosses a boundary the chip
says so.

The options offered are only the ones the player actually has games in — offering
`First Stand` to a player who played in 2014 is a filter that can only fail.

An empty combination shows a state that **names the filter which emptied it**, and
offers the one action that undoes it.

## Scope

- The query-string contract: parse, serialise, and round-trip. One module, used by
  this ticket and by every later one that filters.
- The filter bar component, extracted so the team page (05) inherits it rather than
  copying it.
- The derived era chip.
- The empty state.

## Acceptance criteria

- [ ] Competition then year, in that order, and both in the URL.
- [ ] The era chip follows the years, is not clickable, and reads `mixed` when the
      selection crosses a boundary.
- [ ] Only competitions and years the player has games in are offered.
- [ ] An empty combination names the filter that emptied it, and one click restores
      a view with games.
- [ ] Parsing then serialising a filter state returns the same string, so a shared
      link does not drift.
- [ ] The URL carries only what differs from the default: `?competition=Worlds`, not
      `?competition=Worlds&year=all`.
- [ ] A malformed query string falls back to the unfiltered view instead of an error
      page.

## Validation

A round-trip test on the query-string module, unit tests on the derived era (one
era, several eras, a year inside no era), and a test that an empty selection
renders the empty state naming the filter. Covers spec R3 and R4.
