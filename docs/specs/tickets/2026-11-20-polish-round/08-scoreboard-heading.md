# 08: Give the scoreboard a heading

**Blocked by:** None (can start immediately)
**Status:** ready

## What to build

The scoreboard is the first and most important block of a game page, and it is the
only one without a visible heading: the draft and the players have one, the scoreboard
has an `aria-label` and nothing else. A screen reader user gets a landmark; a sighted
reader gets an unlabelled table that could be anything.

It gets a heading like every other block, and the series header box on the series page
gets one too, for the same reason.

## Scope

- Headings only; no layout change beyond the label.
- Check the heading order of every page while there.

## Acceptance criteria

- [ ] The scoreboard has a visible heading, and the page's headings run h1, h2, h2
      with no level skipped.
- [ ] The series page's score box has a heading or is inside one.
- [ ] Nothing moves position; only the label is added.

## Validation

A browser check of the heading outline of each route, asserting no skipped level.
