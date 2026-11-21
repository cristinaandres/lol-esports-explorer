# Provenance

Every number on the site is derived from the files in this directory, which are
pinned to one upstream build or, where the model has no such column, to the wiki it
crawls. The model and the tables are copies; the two curated audit files are the
upstream JSONL wrapped with their source and pin date by the refresh script.
Nothing here is hand-written, and nothing here is fetched at runtime.

| Field | Value |
|---|---|
| Repository | [RRiboulet/lol-dataset](https://github.com/RRiboulet/lol-dataset) |
| Tag | `v1.1.0` |
| Commit | `714ce6fd0812a69e649c9bf77fb510fb079a71b6` |
| Curated manifest sha256 | `872b43cff39683cca16cf84e8af42d9d2cf658932acb75c1f50a963130a968f0` |

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
data/upstream/team-shortnames.json
                          team short names for search ("KC" must find Karmine Corp)
data/upstream/champion-releases.json
                          champion release dates, pinned from Leaguepedia because the
                          dimensional model has no such column

```

`pipeline/source.json` records the sha256 of every pinned file above -- all 20,
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

The two wiki-pinned files are recorded as installed: `refresh-data.sh` hashes the
copies already in `data/upstream/`, because it does not fetch them --
`refresh-shortnames.sh` and `refresh-releases.sh` do. A pin refresh therefore records
their current bytes, so refresh those first when they are due; from then on the build
verifies them like every other pinned file.

What the manifest can and cannot prove: it records a sha256 for each curated
JSONL, but the two files pinned here are those records rewrapped, so their bytes
are not the JSONL's. The manifest is the pin's own receipts, not a second copy of
the files.

## The files that are not from the model

`champion-releases.json` is fetched from the same wiki the upstream dataset
crawls, with the query recorded inside the file and the date it was pinned. It
exists because a champion without a release date cannot be read: "picked in 21 of
495 games" means one thing for a champion released in 2011 and another for one
released in 2014. Refresh it with `pipeline/refresh-releases.sh` and read the diff.

`team-shortnames.json` is fetched the same way. The wiki's Teams table states the
short name ("KC" for Karmine Corp) and the dimensional model carries neither it
nor the field; search needs it because nobody types the full name. Refresh it with
`pipeline/refresh-shortnames.sh` and read the diff: a new pin can add a short name
or move one, and the build refuses rather than drop a row that folds to no team.

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
