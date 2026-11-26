# 01: The Answer contract, and the interactive chart layer

**Blocked by:** 00
**Status:** done

## What to build

The seam every answer goes through, and the charts that make it explorable, proved
on fixtures before a real record exists.

- `public/schema/answer.json`: the formal 2020-12 schema for a question artifact
  and its window records, including `class`, `end`, `top`, `part`, `census`,
  `simulation` and `verification`.
- `src/lib/types.ts` and `src/lib/answer.ts`: `QuestionArtifact`, `Window`,
  `AnswerRecord`, `CensusRow`, `formatAnswer`, `verdictOf`, `assertShape`,
  `orderRule`, `windowKey`, `seasonLabel`. `assertShape` rejects a record whose
  headline has no `n`, whose candidates are not ordered by the end's rule, whose
  `insufficient_data` carries an interval, or whose `not_verifiable` carries a
  number that reads as an answer.
- `src/components/Answer.tsx`: headline with number, interval and `n`; evidence;
  visible limits; source with the pin's checksum; verdict as a labelled chip. The
  four blocks cannot be rendered apart.
- `src/components/charts/` with visx: `IntervalDotPlot` (top-K, best and worst),
  `IntervalBar` (a Wilson share), `Histogram` (durations, kills, CS) and
  `BucketColumns` (seasons, events). A shared `TimeControls` (season, end, top-N)
  and a `ChartTable` pairing.
- Fixtures for every branch: top-1 best, top-1 worst, yes/no, count simulation,
  categorical census, `insufficient_data`, `not_verifiable`.
- Dependencies: `@visx/scale`, `@visx/shape`, `@visx/axis`, `@visx/group`,
  `@visx/tooltip`, pinned by `package-lock.json`.
- `tsconfig.test.json` includes `src/**/*.test.tsx`, so the render test is
  type-checked like the rest.

## Scope

- **The order rule.** A best end is ordered by `lower_bound` descending; a worst end
  by `upper_bound` ascending. The page prints the rule and the K it used.
- **Top-N.** Five by default, ten and twenty selectable; the record stores up to
  twenty, the view slices. The backtest of 4b keeps K = 5.
- **The interaction.** Hover or focus a mark shows its value, interval, `n` and the
  entity link; hovering a table row highlights the mark and the reverse; clicking a
  candidate follows its link. No number lives only in a tooltip.
- **Chart and table.** No chart renders without the table that feeds it, or without
  its `n` and denominator in the caption. Charts use `@theme` tokens only.
- **The controls are the URL**: `season`, `end`, `top`, so a view is a link.

## Acceptance criteria

- [ ] The headline renders `value (95% CI: low–high, n=N)` for every unit.
- [ ] The render test asserts all four blocks and that the limits text is in the
      DOM rather than behind `title`.
- [ ] A best record ordered by `lower_bound` and a worst record ordered by
      `upper_bound` pass; a swapped one is rejected.
- [ ] `insufficient_data` has no interval; `not_verifiable` has no answer number.
- [ ] Charts render SVG server-side at a fixed size; the paired table exists and
      carries the same rows.
- [ ] Changing season, end or top updates the query string.
- [ ] The chart components use no literal colour.

## Validation

`npx vitest run src/lib/answer.test.ts src/components/Answer.test.tsx
src/components/charts`; the fixtures are hand-written and every one is put through
`assertShape` and the schema.

## Built

- **The contract is the schema, the module and the component.** `public/schema/answer.json` carries the three verdict branches and the two window shapes; `src/lib/answer.ts` carries `formatAnswer`, `verdictOf`, `assertShape`, `orderRule`, `limitsFor`, the window helpers and the seed; `Answer.tsx` renders the four blocks and no branch of it draws a number without its `n`.
- **The chart layer is visx.** `IntervalDotPlot`, `IntervalBar`, `Histogram`, `BucketColumns` and `TimeControls`, each with the table that feeds it, keyboard focus, a tooltip that repeats the table and table ↔ mark highlighting. `DataTable` gained `activeKey` / `onRowHover` without changing its existing API.
- **The seed is in the contract** (`thresholds.seed`). Ticket 02 writes it and a reader can reproduce an interval; it was added after the pipeline needed it, and the contract's fixtures and schema followed.
- **The evidence line was corrected in 03** for a share whose denominator is not its sample: kill participation now reads "part of N team kills over n player-games", not "part of N player-games".
- 34 vitest cases across the contract, the component and the charts; PR #80.
