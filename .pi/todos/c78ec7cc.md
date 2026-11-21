{
  "id": "c78ec7cc",
  "title": "Report short names that join to no team",
  "tags": [
    "review",
    "bug",
    "pipeline"
  ],
  "status": "done",
  "created_at": "2026-11-20T23:20:34.832Z"
}

data/upstream/team-shortnames.json maps "Pain Gaming" to PG, but dim_team spells it "paiN Gaming", so the join in pipeline/sql/08_shortnames.sql drops the row silently: searching PG finds nothing.

The mismatch is written into the pin by refresh-shortnames.py, which asks the wiki for the model's spelling and stores the wiki's answer.

Make the build print (and fail on?) team_shortnames rows that fail the join, so a dropped alias is a message rather than a test note.

## Done — fix/shortname-join-report

The join folds names now, and a row that still does not meet a team is a build
error. Both halves were needed: folding alone fixes today's row but leaves the next
one silent, and the guard alone would turn a known pin defect into a failing build.

- `pipeline/sql/08_shortnames.sql` — `team_name_key()` folds case, accents,
  repeated spaces and `&amp;`, the normalisation `src/lib/aliases.ts` already applies
  to the alias bridge. `shortname_matches` joins on it; `unmatched_shortnames` holds
  the pin rows it does not reach; `ambiguous_shortnames` holds rows that would reach
  more than one team; `team_short_name` keeps one abbreviation per team for the list,
  preferring the row spelled the way the model spells the team.
- `pipeline/build.py` — `report_shortname_defects` reads both views before anything is
  rendered and exits 1 with each offending row printed, so `data:build` and
  `data:check` both fail; `teams.json` takes its short name from `team_short_name`.
- `src/lib/data.test.ts` — the count comment that recorded the drop (193 of 194) is
  replaced by the real totals and a test that `PG` resolves.
- `public/data/aliases.json`, `public/data/meta.json` — regenerated: one added row.
  `teams.json` is byte-identical. No pinned file was edited.

Counts, measured: 194 pinned rows, 193 joining exactly, 194 joining folded, 0
unmatched, 0 ambiguous; `dim_team`'s 198 names fold to 198 distinct keys. The row
that used to drop is `Pain Gaming` -> PG, now an alias of `tm-f642dbf0692c`
("paiN Gaming"), which therefore carries both PG and PAIN in `aliases.json` while
`teams.json` keeps printing PAIN.

The guard was proved on a scratch copy under `/tmp`, not on the pinned data: renaming
that row to "Pain Gamming" makes `pipeline/build.py` print

    error: pinned short name 'PG' for 'Pain Gamming' joins no team in dim_team
    error: 1 pinned short name(s) would be dropped; ...

and exit 1, with `--check` doing the same and no artifact written. A synthetic second
team named "PAIN GAMING" in the survey copy produces the ambiguous-row error instead.
`npm run check` passes (197 tests, artifacts current).
