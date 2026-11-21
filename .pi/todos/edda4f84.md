{
  "id": "edda4f84",
  "title": "Announce the two pulse placeholders that are not the Skeleton",
  "tags": [
    "ui",
    "a11y"
  ],
  "status": "open",
  "created_at": "2026-11-21T13:02:57.166Z"
}

Two loading states still hand-roll pulse blocks instead of using the `Skeleton` that was built to replace them, and neither announces itself:

- `GameDetail.tsx` (the `detail.status === 'loading'` branch): two raw `animate-pulse` divs.
- `TeamDetail.tsx` (roster and everyone-who-played): four raw blocks.

DOM-verified while the artifact was held: no `role`, no `aria-busy`, no live region — a screen-reader user gets silence during exactly the window these exist for. The shared `Skeleton` sets `role="status" aria-busy="true" aria-live="polite" aria-label="Loading"` and is verified live on a held home load; its own header argues for one component because there is one idea.

Fix: extend `Skeleton`'s `TableHeight` union (or add the shapes these two need) and use it, rather than wrapping the custom divs in an announcement. If a shape genuinely does not fit, say why in the component's comment instead of leaving a fourth copy.

Check: with the relevant artifact held, both surfaces expose a status region, and no route renders an `animate-pulse` outside `Skeleton`.
