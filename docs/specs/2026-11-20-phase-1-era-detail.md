# Phase 1 — Era detail

Status: built and deployed. This is a retrospective spec: phases 0 and 1 landed
in the same commit (`f1140c3`), and this document separates them afterwards so
every phase has the same record and so a later change that removes a panel has
something to regress against.

## Objective

Phase 0 ended on a grid of era cards. Clicking one has to answer three questions a
reader cannot answer from the card alone:

1. **What could be measured in this era?** A 2013 game and a 2025 game are not
   the same measurement, and the page has to say which one you are looking at.
2. **Why does the era begin where it does?** A boundary that appears from nowhere
   is a boundary the reader has to trust.
3. **What is inside it?** Which events, how many games, and whose record.

## Current behavior (before this phase)

- `/` rendered the era spine and its totals.
- The era cards linked to `/eras/:era`, so the route had to exist for the
  navigation to be honest.
- No page existed that carried an era's coverage, its boundary citation, or the
  list of events it contains.

## Required behavior

- **R1** `/eras/:era` resolves for every era id present in the committed spine.
- **R2** A stat row shows games, series, events, teams, players and average length,
  each counted from the facts, with average length rendered `mm:ss`.
- **R3** A coverage panel shows draft, player statistics, team statistics and
  blue-side share, each as a share **with its denominator**.
- **R4** The boundary citation is rendered verbatim as published upstream, along
  with the count of fields judged in that era. It is not summarised or paraphrased.
- **R5** An event table lists the era's events with year, name, canonical
  competition, games, teams and blue-side share.
- **R6** Previous and next era navigation exists and never lands on an era the
  navigation does not show.
- **R7** An era with no game renders an explanation of why it is empty instead of a
  page of zeroes.
- **R8** The page loads no game-level artifact: it is served from the era and event
  artifacts alone.
- **R9** An unknown era id renders an instructive state with a link back to the
  spine, not a blank page.

**Amended in review.** R7 originally kept the empty eras as cards and as a step in
the previous/next chain. After review they were removed from the navigation
entirely (see D9 in `docs/product-spec.md`): a card that opens onto nothing is not
a navigable level. R7 now governs the page reached by URL, and R6 is what the
review changed.

## Non-goals

Event pages (phase 2), any chart over time, and any comparison between eras beyond
what the cards on the home page show.

## Constraints

- The page is served from `eras.json` (the declared spine joined to measured
  facts) and `events.json`. No new artifact was added for it.
- The era id in the URL is the upstream slug (`pre-herald`, `elemental-drakes`, …).
  It is stable because it is declared upstream, not derived here.
- The build stays deterministic: no timestamps on the page and none in the
  artifacts it reads.

## Design decisions

- **The declared spine, not the games, decides which eras exist.** Inferring the
  spine from the corpus would make the assertion "no game before a boundary
  carries a field that era cannot have" true by construction.
- **The citation is quoted, not summarised.** It is the page's only claim to
  authority over its own boundaries; a paraphrase would be this project asserting
  a fact it does not own.
- **Coverage is counts with denominators, plus a sentence explaining that partial
  is a fact about the source.** The panel is the place where the product rule
  either holds or does not.
- **An empty era explains itself by calling it a gap in the calendar, not a gap in
  the data.** The game changed; no international event was played while it did.

## Test seams

- **`src/lib/metrics.test.ts`** — every era in the committed spine has copy, and
  every era with zero games has an explanation. A new upstream era cannot ship as
  a blank card.
- **`pipeline/build.py --check`** — the spine artifact is rebuilt in memory and
  compared byte for byte, so a hand-edit to `eras.json` fails the build.
- **Manual width check** at 1440 px and 390 px, recorded here.

## Acceptance criteria

- [x] Every era with games has a page reachable from the spine.
- [x] The four coverage figures render with denominators. Observed on
      `elemental-drakes`: draft 88% (1,172/1,325), player statistics 24%
      (316/1,325), team statistics 24% (316/1,325), blue side won 53%
      (708/1,325).
- [x] The era that proves the rule renders zero rather than a blank: `pre-herald`
      shows 0% (0/495) for all three coverage groups, and the page explains that
      the sources record almost none of the detail.
- [x] The boundary citation renders verbatim, with its patch number and source URL.
- [x] Previous/next navigation skips the two eras that carry no game.
- [x] An empty era reached by URL explains itself and says it is not part of the
      navigation.
- [x] No game-level request is made by the page.
- [x] `npm run check` passes and the deployed deep link renders.

## Verification

```bash
npm run check
# the observed walk at review time:
#   /eras/elemental-drakes -> 26 events, 1,325 games, average length 33:37
#   /eras/pre-herald       -> 0% coverage on all three groups, 5 patches recorded
#   /eras/herald           -> "no international event was played in this window"
```

## Open assumptions

- **That a reader wants the era's own numbers before its event list.** The
  alternative is to lead with the events. It is a one-component reorder if the
  page turns out to be read by event rather than by era.
- **That the previous/next chain is enough to cross eras.** A cross-era comparison
  ("how did blue-side share move between eras") is a real question this page does
  not answer, and it was left out rather than half-built.
