{
  "id": "cb2aadce",
  "title": "Stop search calling a short name a former name",
  "tags": [
    "bug",
    "search",
    "data",
    "high"
  ],
  "status": "done",
  "created_at": "2026-11-21T13:02:34.282Z"
}

Searching an abbreviation renders the team as a former name: `100t` → "100 Thieves formerly 100T", `rge` → "Rogue formerly RGE", `fw` → "Flash Wolves formerly FW". `kc` is correct ("Karmine Corp KC"), so the shape is right and the data path is wrong.

Root cause: `aliases.json` carries the same `(entity_id, alias_string)` twice — one `evidence: "redirect"` row and one `evidence: "shortname"` row, redirect first. `buildSearchIndex` pushes both; `search()` keeps the first at equal rank, so `abbreviation` is false and SearchBox takes the "formerly" branch. `search.ts`'s own comment states the invariant this breaks: "a result must not say 'formerly KC'". 81 team abbreviations are affected; players and champions, none.

Two candidate fixes, pick one and say why: prefer the `shortname` row at equal rank in the index, or stop emitting the duplicate triple in `pipeline/sql/08_shortnames.sql` (join against the bridge so a name the bridge already carries is not re-added). The data-side merger found the same duplication from the other end: 78 triples, 12 of them redundant no-window pairs.

Check: the four queries above render the abbreviation chip, not "formerly"; a unit test over the committed `aliases.json` pins it, so the SQL and the index cannot drift apart again.

## What changed

`buildSearchIndex` (`src/lib/search.ts`) now keeps one entry per entity and folded
name instead of one per artifact row. Two rows that state the same name merge, and
any `shortname` row makes the name an abbreviation, so the result no longer depends
on the order `aliases.json` happens to sort in. A name the entity still goes by
stays `current` and is never labelled an abbreviation. `SearchBox` is unchanged: it
still renders the one flag the index gives it.

The rejected alternative — deduplicating in `pipeline/sql/08_shortnames.sql` — does
not fix the defect. Skipping short names the bridge already carries leaves the
redirect row, which search still reads as a former name; applying that dedupe to the
committed artifact left all 71 visible cases rendering as "formerly". The short-name
row is also the only row that says the string is an abbreviation. No SQL changed.

Measured over the committed `aliases.json` (3,985 rows): 78 exact
`(kind, entity_id, alias_string)` duplicate groups, all teams, two rows each — 68
`redirect` + `shortname`, 2 `registry` + `shortname`, 8 dated
`registry;redirect;observed` + `shortname`, 70 no-window pairs. The `shortname` row
sorts last in every group. Before the fix 71 of the 193 pinned short names rendered
as former names (the 68 exact duplicates plus iG/Ig, ahq/AHQ, aAa/AAA, which only the
folded comparison sees); after it, 0.

## Verified

`npm run check` passes (17 test files, 222 tests, artifact freshness, build). New
tests run over the committed artifact in `src/lib/data.test.ts` — every pinned short
name must be current or an abbreviation but never "formerly", `100t`/`rge`/`fw`/
`njbs`/`kc` must carry the chip, and `mad lions`/`Splyce` must still reach Movistar
KOI as former names — plus fixture cases in `src/lib/search.test.ts` for the merge
and for a name that is also current. Reverting `search.ts` turns 4 of them red.

Browser check on the built site (`vite preview` + headless Chromium): `100t` →
"100 Thieves 100T", `rge` → "Rogue RGE", `fw` → "Flash Wolves FW", `njbs` →
"NaJin Black Sword NJBS", `kc` → "Karmine Corp KC", `mad lions` → "Movistar KOI
formerly MAD Lions", `faker` → "Faker".
