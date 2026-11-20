# 02: Show one event's coverage, not just its era's

**Blocked by:** None (can start immediately)
**Status:** ready

## What to build

The era page says what could be measured across a whole era; the event page says
nothing. But coverage is not uniform inside an era: IEM Season 6 reports team
statistics `unavailable` for all 44 of its games while its era is largely complete.
A reader deciding whether to trust an event's numbers has to be able to see that.

`event-coverage.jsonl` already carries, per event, the games and the
complete/partial/unavailable counts for team stats, draft and player stats. The
event page gets the same coverage panel the era page has, measured on one event.

## Scope

- Fold the per-event coverage into the events artifact rather than adding a file the
  site has to fetch separately.
- The coverage block on the event page, reusing the pattern from the era page.
- Nothing on the era page changes.

## Acceptance criteria

- [ ] An event shows three shares with denominators, not one summary badge.
- [ ] IEM Season 6 shows team statistics at 0 of 44, which is the case that proves
      the panel is real.
- [ ] An event with no games shows no coverage block rather than three zeroes.
- [ ] The numbers match the curated report, asserted by a data test.

## Validation

A data test comparing the folded values against the pinned report for every event.
