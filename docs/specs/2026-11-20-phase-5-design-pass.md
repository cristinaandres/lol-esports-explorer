# Phase 5 — Design pass

Status: round 5 — proposed. Runs alongside phases 2 to 4, and closes them.

## Objective

The site currently has a working visual language — a dark surface, one gold
accent, blue and red only where a side is meant — but no design file, no designed
empty state, and no accessibility pass. This phase turns the token set into a
Figma file someone else could design from, and finishes the states the phases
above will need.

## Current behavior

- Tokens live in `src/index.css` under `@theme`: ten greys, one accent, two side
  colours, two font stacks.
- All five states exist in code — a loading skeleton, a zero-sample filter state
  (`EmptyFilter`), partial coverage (`CoverageBadge`), a data-failure block
  (`LoadFailure`) and 404 — but none has a documented design. The empty declared
  eras are documented in the glossary rather than rendered as a sixth state.
- The layout has been checked at 1440 px and 390 px by screenshot; contrast,
  focus order and keyboard traversal through the tables have not been checked at
  all.

## Required behavior

- **R1** A Figma file whose frame names match the sections of
  `docs/information-architecture.md`, so "10-era/coverage" means the same thing in
  the design and in the repository.
- **R2** Figma variables named exactly like the `@theme` tokens, so a colour
  cannot drift between design and build. Where they disagree, the build wins and
  the design is corrected.
- **R3** Designed, not defaulted: loading, empty (zero sample), partial coverage,
  data-failure, and 404.
- **R4** Body text at 4.5:1 contrast or better, a visible focus ring on every
  interactive element, landmark regions, and a table that can be read with a
  keyboard and announced sensibly by a screen reader.
- **R5** Three widths designed: 390, 768, 1440. The comparison and draft boards
  are the cases that break first.
- **R6** Colour never carries meaning alone: every state that is coloured also has
  a word.
- **R7** A row in a series list declares its format, and a best-of-one is
  distinguishable from a best-of-three at a glance — without reading the score, in
  greyscale, and in a screen reader. Today the only separation is the words "best
  of 1" and the fact that a best-of-one links to a game rather than a series.
  Two thirds of the corpus is best-of-one, so this is the most common row on the
  site, not an edge case.

## Non-goals

A logo, a typeface licence, dark/light theming (the site is dark by decision), and
any animation that is not a state transition.

## Constraints

- The design must be implementable with the tokens that exist; a new colour is a
  change to `@theme` and to the Figma variables in the same commit.
- No webfont file unless the licence is recorded in `ATTRIBUTION.md`.

## Design decisions

- **The current palette is kept as the baseline.** It was chosen with the content
  in view (a dark surface makes the blue/red side distinction legible without
  shouting), and replacing it now would invalidate the screenshots the earlier
  phases were reviewed on.
- **The unit of design is a block, not a page.** Entity pages compose context,
  career, filters and a pool; designing those four blocks once covers all three
  entity types.
- **Motion is limited to state transitions** (a loading skeleton, a filter
  re-render), because this is a reading tool and animation competes with reading.

## Test seams

- **Token parity as a test** — a vitest case reads `@theme` from
  `src/index.css` and asserts every token name appears in the documented list in
  `docs/information-architecture.md`. A colour added to one and not the other
  fails.
- **Accessibility is checked by hand** against R4 and recorded in this file with
  the date, because an automated scan cannot judge whether a table announces its
  headers usefully.

## Acceptance criteria

- [ ] Every frame named in the IA document exists in the Figma file.
- [ ] Every `@theme` token has a Figma variable of the same name, and a test
      guards the list.
- [ ] The five states are designed and implemented, not only the happy path.
- [ ] Keyboard traversal through an era table and a game page is recorded with the
      order observed.
- [ ] The three widths are screenshotted and compared against the Figma frames.
- [ ] No colour-only state remains in the build.

## Verification

```bash
npm run check
# plus: a manual pass at 390 / 768 / 1440, keyboard only, recorded in this file
```

## Open assumptions

- **That Figma stays the source for the visual language.** If the design file
  drifts, the tokens in `src/index.css` become the source and the Figma file is
  regenerated from them; the direction is decided here, deliberately, so the
  question does not reopen every phase.
- **That the typeface stays the system stack.** A licensed typeface is a real
  improvement for a design portfolio and a real cost for a static site; it is left
  open rather than assumed.
