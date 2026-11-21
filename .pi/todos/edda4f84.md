{
  "id": "edda4f84",
  "title": "Announce the two pulse placeholders that are not the Skeleton",
  "tags": [
    "ui",
    "a11y"
  ],
  "status": "done",
  "created_at": "2026-11-21T13:02:57.166Z"
}

Two loading states still hand-roll pulse blocks instead of using the `Skeleton` that was built to replace them, and neither announces itself:

- `GameDetail.tsx` (the `detail.status === 'loading'` branch): two raw `animate-pulse` divs.
- `TeamDetail.tsx` (roster and everyone-who-played): four raw blocks.

DOM-verified while the artifact was held: no `role`, no `aria-busy`, no live region — a screen-reader user gets silence during exactly the window these exist for. The shared `Skeleton` sets `role="status" aria-busy="true" aria-live="polite" aria-label="Loading"` and is verified live on a held home load; its own header argues for one component because there is one idea.

Fix: extend `Skeleton`'s `TableHeight` union (or add the shapes these two need) and use it, rather than wrapping the custom divs in an announcement. If a shape genuinely does not fit, say why in the component's comment instead of leaving a fourth copy.

Check: with the relevant artifact held, both surfaces expose a status region, and no route renders an `animate-pulse` outside `Skeleton`.

## Done — a fourth shape, `stack`

`Skeleton` owns both surfaces now: `GameDetail`'s loading branch is
`<Skeleton shape="stack" heights={['h-40', 'h-56']} />`, and `TeamDetail`'s current
roster and everyone-who-played placeholders are `stack` with `['h-24']` and
`['h-32']`. `grep -rn animate-pulse src` has one hit, the component's own root.

`table` was not extended, because it fits neither caller: its first block is a fixed
h-24 summary strip, while the game page reserves h-40 then h-56 (the scoreboard and
the draft board) and the team page reserves a single block per list. The new shape
is "the cards inside a page that has already rendered its headings and prose": one
card, or a few stacked at the page's own 12 px gap. Heights come from a
`StackHeight` union of literal utilities (`h-24`, `h-32`, `h-40`, `h-56`), for the
same reason `tableHeight` is a union: a page cannot ask for a class Tailwind never
generated. One status region covers the whole stack, so the game page announces its
loading state once rather than once per card.

Heights unchanged. Measured in headless Chromium (Chromium 141) against the
production build at 1440x900, the artifact held with CDP `Fetch.requestPaused` and
left paused — never failed — so the loading branch stayed observable:

| page | before | after |
| --- | --- | --- |
| game `gm-71d0e275529b`, `sides.json` held | 160 px @ y=354 + 224 px @ y=526, no role | same two blocks inside one 396 px `role="status"` region @ y=354 |
| game page height | 943 px | 943 px |
| team `tm-01149467eceb`, `player-games.json` held | 96 px @ y=1237 + 128 px @ y=1470, no role | each block is its own `role="status"` region, same y and height |
| team page height | 1791 px | 1791 px |

Every new region carries `role="status"`, `aria-busy="true"`, `aria-live="polite"`
and `aria-label="Loading"`; no `.animate-pulse` element sits outside a status region
on either page. With the artifacts not held, both pages render as before: zero
`.animate-pulse`, content lists present.

`npm run check` passes: oxlint clean, 232 vitest tests (17 files), 10 pipeline
tests, `data:check` (16 files current), production build.
