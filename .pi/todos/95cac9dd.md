{
  "id": "95cac9dd",
  "title": "Re-measure the figures the comments state",
  "tags": [
    "cleanup",
    "review"
  ],
  "status": "done",
  "created_at": "2026-11-21T13:02:57.173Z"
}

Comments and test comments carry numbers nothing re-measures, and some are knowingly wrong. Measured (gzip −6) versus stated:

- `src/lib/data.ts:84,167`: player rows "620 KB" → **688**; the "950" alternative → **1,063**.
- `src/lib/loader.test.ts:127`: "133 KB" for games+matches → **145**; `:167` "330 KB" for sides+picks+bans → **375**.
- `vite.config.ts:17`: "32 files instead of 16" → **34 vs 17**.
- `src/lib/career.test.ts:167`: "15,910 rows carry no damage" → **15,040**.
- `src/lib/data.ts:32-34`: "the events index … never ask[s] for them" — it does, by design (it derives each event's champion from games and matches); the commit message says so, the module comment does not.
- `src/lib/draft.ts:25`: "the three 2020 Mid-Season Cup blind-pick games have picks but no bans" — those three have **zero picks and zero bans**, and no game anywhere has picks without bans. `DraftBoard.tsx:19`: "picks range from 8 to 10" → always exactly **10** (2,450 games).
- `src/lib/types.ts:129`: `best_of`'s "one series in the corpus" — the only null is the `match_key 0` placeholder, which is not a series.

Fix: prefer a number that a test computes over one typed into a comment; where the comment justifies real logic (draft state, the failure modes), keep the reasoning and drop or correct the illustrative figure.

Check: a grep for the stale figures finds nothing, and any replacement figure is either measured in the commit body or asserted by a test.

## What changed

Every figure was re-measured from the committed artifacts rather than taken from
this ticket. Sizes are `gzip -6` output over 1,024, which is the convention the
comments already used.

| figure | was | measured | now says |
| --- | --- | --- | --- |
| player rows (`gzip -6 -c public/data/player-games.json \| wc -c` = 704,581) | 620 KB | 688 KB | 688 KB |
| whole lazy detail (player rows + sides + picks + bans = 1,088,469) | 950 KB | 1,063 KB | 1,063 |
| games + matches (93,745 + 55,056 = 148,801) | 133 KB | 145 KB | 145 |
| sides + picks (120,329 + 120,474 = 240,803) | 236 KB | 235 KB | 235 |
| sides + picks + bans (+ 143,085 = 383,888) | 330 KB | 375 KB | 375 |
| test files a worktree doubles (`find src -name '*.test.*' \| wc -l`) | 32 vs 16 | 34 vs 17 | 34 instead of 17 |
| player rows with no damage (`damage` null, 30,910 rows) | 15,910 | 15,040 | 15,040 |
| player rows with damage (`career.ts`, same count from the recorded side) | 15,910 | 15,870 | 15,870 |
| picks per draft (`picks.json`: 24,500 rows over 2,450 games) | 8 to 10 | 10 in every draft that has picks | every draft that has picks has ten |
| 2020 Mid-Season Cup blind-pick games (`game_key` 1594, 2253, 2060) | picks but no bans | 0 picks, 0 bans | neither picks nor bans |
| `best_of` null in `matches.json` | one series | 0 of 2,068; only the model's `match_key` 0 is null | the model's unknown member, not published |
| events index and the game-level artifacts | never asks | asks through `useGameCorpus()` | asks, to derive each event's champion |

`src/lib/data.ts` now says the events index does ask for games and matches, and
why: `EventsIndex` passes them to `championships()` for each event's derived
champion. `src/lib/career.ts` repeated the damage count from the recorded side in
the same sentence the ticket flagged in `career.test.ts`; it is corrected too, so
no stale 15,910 is left beside the corrected 15,040.

## Verified

`npm run check`: oxlint clean, 17 vitest files and 226 tests pass, 5 pipeline
tests pass, `data:check` says `public/data is current (16 files)`, and the
production build succeeds. A grep of `src/` and `vite.config.ts` for each stale
figure returns nothing.

## Not changed, for a later ticket

- `docs/specs/` repeats several of these figures (620 KB, 950 KB, 133 KB,
  236 KB); the ticket scoped the fix to source comments.
- `src/components/SearchBox.tsx:25` says the alias bridge is 63 KB; it is 67 KB
  (`gzip -6 -c public/data/aliases.json | wc -c` = 68,506).
- `src/lib/data.ts:26` says the eager set is ~45 KB; it is 46 KB
  (47,184 bytes across its eight files).
- `src/lib/data.test.ts:253` says "One series states no format. The unknown
  member is not published at all." The first sentence is the same claim corrected
  in `types.ts`: no published series states no format.
- `src/components/DraftBoard.tsx:17-18` says a zero-ban column is a source gap,
  not a game played without bans. The three zero-ban games are the 2020
  Mid-Season Cup blind-pick games; whether blind pick has no bans by format is a
  product question, and the page's text needs that decision, not a figure fix.
