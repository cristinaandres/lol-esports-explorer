# Provenance

Every number on the site is derived from the files in this directory, which are
pinned to one upstream build. The model and the tables are copies; the two curated
audit files are the upstream JSONL wrapped with their source and pin date by the
refresh script. Nothing here is hand-written, and nothing here is fetched at
runtime -- including the champion release dates and the team short names, which the
model states itself as of `v1.2.0`.

| Field | Value |
|---|---|
| Repository | [RRiboulet/lol-dataset](https://github.com/RRiboulet/lol-dataset) |
| Tag | `v1.2.0` |
| Commit | `4044872c410e1f91ab597838c808d133b64a0202` |
| Curated manifest sha256 | `f919082ad4ab90fa8c7e8a88d2bd55528bdc9739f0393cf02dcfb3a4e991a67d` |

## What is pinned here

```
data/model/*.csv          the dimensional model: dimensions, bridge and facts
data/model/data-dictionary.md
                          the upstream data dictionary for those columns
data/model/schema.sql     the DDL those CSVs load into, column for column
data/upstream/game-eras.json
                          the declared era table: which fields could exist when,
                          with the patch citation for each boundary
data/upstream/manifest.json
                          the upstream build manifest: the curated files it was
                          built from, and the raw wiki payloads behind them
data/upstream/event-selection.json
                          every candidate event the rule considered, with its decision
                          (upstream data/curated/event-selection.jsonl, rewrapped)
data/upstream/event-coverage.json
                          coverage per event, as the dataset measured it
                          (upstream data/curated/event-coverage.jsonl, rewrapped)
```

`pipeline/source.json` records the sha256 of every pinned file above -- all 19,
keyed by their path from the repository root -- and `public/data/meta.json` copies
that record into the artifact. The build verifies every hash before it renders
anything: a recorded file that is missing, a recorded file whose bytes moved (the
refusal names the file and both hashes), and a file on disk that the record does not
name are each a refusal, not a new meta.json describing the drift. The directory is
the rule in both directions: a file added here cannot be pinned and unrecorded, and
a recorded file cannot vanish. The exceptions are stated in the build: a dotfile is
the operating system's rather than the pin's (`.DS_Store` is ignored, or the
artifact would depend on which laptop ran the build), and anything that is not a
plain file -- a subdirectory, a symlink -- stops the build instead of being skipped.
A reader can walk from a figure on the site to the file it came from without
trusting this document, and a hand-edited pinned file fails the build before any
artifact is rewritten.

What the manifest can and cannot prove: it records a sha256 for each curated
JSONL, but the two files pinned here are those records rewrapped, so their bytes
are not the JSONL's. The manifest is the pin's own receipts, not a second copy of
the files.

## The facts that used to need their own files

Champion release dates and team short names were pinned from Leaguepedia until
`v1.2.0`, because the model could not answer for them: a champion carried no live
date, and a team carried a name and a region but no abbreviation. `v1.2.0` added
both -- `dim_champion.release_date` and `dim_team.short` -- from the registry rows
the dataset already reads, so the site takes them from the model and the two files
and the two fetch scripts are gone. Measured before removing them: the dates agreed
on all 171 champions both named, and the shorts on all 193 teams both named.

The one thing that changed on the site is a search alias. The wiki pin spelled one
team twice, and the folded join carried both abbreviations; the model states one per
team, so "PG" no longer resolves to paiN Gaming, whose row says `PAIN`. No date and
no printed abbreviation moved.

## Refreshing the pin

```bash
pipeline/refresh-data.sh v1.2.0
npm run data:build
```

The script re-copies the model (its CSVs, the data dictionary and the DDL), the era
table, the manifest and the two curated audit files, rewrites `pipeline/source.json`
from the tag it checked out -- the tag, the commit, the manifest hash and a sha256
for every pinned file -- and prints what changed. Refreshing the current pin is
a no-op: when the tag and the records have not moved, the audit files keep their pin
date and the bytes do not change.

Refreshing is deliberate, not automatic: a new upstream tag can move counts, and a
site that silently renumbers itself is a site whose history cannot be cited.

## Licence

Game data comes from [Leaguepedia](https://lol.fandom.com), licensed CC BY-SA
3.0. See `ATTRIBUTION.md` for the obligations that follow.
