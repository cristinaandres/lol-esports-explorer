{
  "id": "cb2aadce",
  "title": "Stop search calling a short name a former name",
  "tags": [
    "bug",
    "search",
    "data",
    "high"
  ],
  "status": "open",
  "created_at": "2026-11-21T13:02:34.282Z"
}

Searching an abbreviation renders the team as a former name: `100t` → "100 Thieves formerly 100T", `rge` → "Rogue formerly RGE", `fw` → "Flash Wolves formerly FW". `kc` is correct ("Karmine Corp KC"), so the shape is right and the data path is wrong.

Root cause: `aliases.json` carries the same `(entity_id, alias_string)` twice — one `evidence: "redirect"` row and one `evidence: "shortname"` row, redirect first. `buildSearchIndex` pushes both; `search()` keeps the first at equal rank, so `abbreviation` is false and SearchBox takes the "formerly" branch. `search.ts`'s own comment states the invariant this breaks: "a result must not say 'formerly KC'". 81 team abbreviations are affected; players and champions, none.

Two candidate fixes, pick one and say why: prefer the `shortname` row at equal rank in the index, or stop emitting the duplicate triple in `pipeline/sql/08_shortnames.sql` (join against the bridge so a name the bridge already carries is not re-added). The data-side merger found the same duplication from the other end: 78 triples, 12 of them redundant no-window pairs.

Check: the four queries above render the abbreviation chip, not "formerly"; a unit test over the committed `aliases.json` pins it, so the SQL and the index cannot drift apart again.
