# 02: The pipeline, the season windows, and the artifacts

**Blocked by:** 00
**Status:** done

## What to build

- `pipeline/sql/09_crystal_ball.sql`: the season spine and the `cb_*` views, each at
  the finest grain the question needs.
- `pipeline/crystal_ball.py`: Wilson, the bootstrap percentile interval, the
  unique-champion simulation, the window builder, the record assembler and the
  artifact writer.
- `build.py`: `almanac.json` (the index) and `almanac-<id>.json` (one file per
  question), included in `meta.json.artifacts`; `--check` covers them.
- `numpy` pinned in `pipeline/pyproject.toml`, for the bootstrap and the simulation.
- `pipeline/tests/test_crystal_ball.py`.

## Scope

- **The season rule.** Season N runs from the day after Worlds N−1 final to Worlds N
  final; season 2011 starts at the first game of the corpus. `cb_worlds_final`,
  `cb_event_season` and `cb_season_window` implement it; the pin's one exception is
  IPL 5 (season 2013). Every event gets exactly one season.
- **The windows.** `all` plus `season:2011` … `season:2026`. Each carries
  `date_from`, `date_to`, `cut_date`, `patches` (or `all patches`), `games`,
  `events`, `teams` and `players`.
- **The finest-grain views.** `cb_game_presence` (a champion once per game, pick ∪
  ban), `cb_season_presence` (the season aggregate the presence card reads),
  `cb_champion_games` (kills, deaths, assists, team kills, wins, presence),
  `cb_player_games` (kills, deaths, assists, cs, damage, team kills), `cb_team_games`
  (wins, kills, gold), `cb_game_length`, `cb_awards` (award grain), and the region
  verification query.
- **The assembler.** Applies `min_n = 20`, K = 5 with twenty stored, the best/worst
  order, the shared and record limits, the season's patches, and
  `source.sha256 = meta.source.manifestSha256`. The pin is the source; the artifact's
  own hash stays in `meta.json`.
- **Determinism.** Fixed seeds, no timestamps, sorted keys; a rebuild is
  byte-identical. The unique-champion simulation is 10,000 replications with its
  seed recorded.

## Acceptance criteria

- [ ] The season mapping: 16 seasons, IPL 5 in 2013, one season per event.
- [ ] Wilson against hand-computed values, including `p = 0`, `p = 1` and `n = 4`.
- [ ] Presence is pick ∪ ban and counts a champion once per game, including the
      three blind-pick games.
- [ ] Duration is counted over 3,084 games, not 6,168 side rows.
- [ ] Damage's denominator is 15,870; gold and vision use the rows that state them.
- [ ] The Finals MVP view is 11 awards, not 208 rows.
- [ ] `almanac.json` and the eighteen question files are deterministic and recorded
      in `meta.json`; `npm run data:check` is green.
- [ ] Payload per question and in total is measured; the build time is measured,
      with the 60 s target and the fallback named if it is missed.
- [ ] No interval is computed in the browser.

## Validation

`npm run data:build`, `npm run data:test`, `npm run data:check`, and the season query
run by hand against `09_crystal_ball.sql`.

## Built

- **The season spine.** `cb_event_season` assigns every event to the first Worlds final on or after its last game; `cb_season_window` builds the sixteen windows; IPL 5 is season 2013. `cb_game_presence`, `cb_season_presence`, `cb_champion_games`, `cb_player_games`, `cb_team_games`, `cb_game_length`, `cb_awards` and the region verification view publish the grain each question needs.
- **Intervals once, in the pipeline.** Wilson for shares, bootstrap percentile (10,000 resamples, seed `20261126`) for ratios, and a 90% simulation for the unique-champion count. `numpy==2.4.6` is pinned.
- **Artifacts.** Eighteen question files plus `almanac.json`; 36 files in `meta.json`, deterministic and `data:check`-green. The build is 50 s; the question files total 171 KB gzip (largest 31 KB) and the index is 2 KB.
- **The grain traps are tests**: presence as pick ∪ ban once per game, duration over 3,084 games, damage over 15,870 rows, 11 awards against the 208-row fan-out, Teemo's 4 of 3,091, the 90% simulation and determinism.
- **Three fixes found while building 03.** Kill participation uses only the games that state the team's kills (the old denominator made a 141% share); presence's all-window denominator includes zero-presence champion-seasons (Teemo was 4 of 408 instead of 4 of 3,091); the patches list is ordered by the first game each patch governed in the season, not lexicographically (2019 reads 9.8, 9.12, 9.13, 9.19; the model's `patch_key` is a lexical natural key, not a release order).
- 27 pipeline tests; PR #81.
