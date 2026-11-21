{
  "id": "95cac9dd",
  "title": "Re-measure the figures the comments state",
  "tags": [
    "cleanup",
    "review"
  ],
  "status": "open",
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
