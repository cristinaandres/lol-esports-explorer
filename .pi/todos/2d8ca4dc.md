{
  "id": "2d8ca4dc",
  "title": "Decide whether an era page may load games.json",
  "tags": [
    "review",
    "perf",
    "decision"
  ],
  "status": "done",
  "created_at": "2026-11-21T09:07:37.895Z"
}

Decided in favour of the page, not the document: an era page does not load a game-level artifact again, and the two criteria that promised it are now written to what the network tab shows.

Three tiers in `src/lib/data.ts` instead of two. The eager set is eras, events, totals, the pin and the name files — 45 KB gzip, measured. `games.json` (83 KB) and `matches.json` (50 KB) are a game level behind `loadGames()`/`loadMatches()`, composed by `loadGameCorpus()`, fetched once per session only by the pages that draw a game, a series, a draft or a title. The deepest lazy set (player rows, scoreboards, bans, picks) is unchanged.

Eight routes moved: champion (games only — it counts across the corpus but never names a series), event, events index, game, phase, player, series, team. Each gained the `failed` branch with a retry; series detail had none at all and would have reported a network failure as "No series called X".

Measured, not estimated: an era page requests 8 data files and 45 KB gzip where it asked for 10 and 178 KB; a game page still requests 14 including both, and the events index and player page still request both because they read them.

Docs corrected with the numbers: phase 1's R8, phase 2's acceptance criterion, and the budget paragraph that still reasoned from a 37 KB corpus and a 140 KB `games.json` (both stale — the file is 83 KB today).

213 tests (two new ones at the loader seam: the era page requests neither file; the corpus is fetched once and the games reused), artifacts current, lint silent, build green.
