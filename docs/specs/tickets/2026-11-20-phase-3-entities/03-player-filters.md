# 03: Narrow a career by competition, then by year

**Blocked by:** 02 (the page this narrows)
**Status:** done

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

## Built

- **The career was split into appearances and a summary.** A filter now narrows the
  appearance list first, and the summary is computed over what is left, so no
  figure can be reported over a set the page is not showing. `careerFor()` remains
  for callers that need no filtering.
- **The empty state's button is tested, not asserted.** It drops the half that
  emptied the view and, if that still leaves nothing, drops both; a test walks
  every competition × year combination and proves the recovered filter always has
  games in it. An empty state whose button lands on another empty state is worse
  than no button.
- **The options do not cascade.** Narrowing to a year must not shrink the
  competition list to one entry, or the reader loses the way back. Both lists are
  always the player's whole range, and a test pins that.
- **Filter changes replace the history entry** rather than pushing one, so Back
  returns to the previous page instead of walking through every dropdown change.
- **A malformed `?year=last` falls back to the unfiltered view** but the URL keeps
  the parameter. Cleaning it would be a second navigation for no benefit; the page
  shows the honest default and the reader can see what they typed.
- Measured on Faker: 410 games overall, 184 at Worlds, 24 at Worlds in 2025. The era
  chip reads `mixed` unfiltered and `Atakhan` for 2025.
