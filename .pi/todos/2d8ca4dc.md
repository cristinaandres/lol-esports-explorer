{
  "id": "2d8ca4dc",
  "title": "Decide whether an era page may load games.json",
  "tags": [
    "review",
    "perf",
    "decision"
  ],
  "status": "open",
  "created_at": "2026-11-21T09:07:37.895Z"
}

`docs/specs/2026-11-20-phase-2-event-and-game.md` states that an era page loads no game-level artifact, and phase 1's R8 says the same. It is not true today: `loadDataset()` fetches `games.json` (92 KB gzip) on every route, era pages included.

Two honest outcomes. Either the criterion is stale and should be rewritten to what the site does and why, or the eager set should be split so an era page does not pay for the games — and then the criterion stands.

The payload split is a stated budget (`src/lib/data.ts` doc block); a criterion that is quietly false is worse than no criterion, because the next reader budgets against it.

Check: the document and the loader agree, and the number in the doc block matches a measurement.
