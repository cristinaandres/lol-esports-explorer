# Provenance

Every number on the site is derived from the files in this directory, which are
copied byte-for-byte from one pinned build of the upstream dataset. Nothing here
is hand-written, and nothing here is fetched at runtime.

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
data/upstream/game-eras.json
                          the declared era table: which fields could exist when,
                          with the patch citation for each boundary
data/upstream/manifest.json
                          the upstream build manifest, for cross-checking hashes
data/upstream/champion-releases.json
                          champion release dates, pinned from Leaguepedia because the
                          dimensional model has no such column

```

`public/data/meta.json` records the sha256 of every one of those files at build
time, so a reader can walk from a figure on the site to the file it came from
without trusting this document. If a pinned file is ever edited by hand, the
artifact hashes change and `npm run data:check` fails.

## The one file that is not from the model

\`champion-releases.json\` is fetched from the same wiki the upstream dataset
crawls, with the query recorded inside the file and the date it was pinned. It
exists because a champion without a release date cannot be read: "picked in 21 of
495 games" means one thing for a champion released in 2011 and another for one
released in 2014. Refresh it with \`pipeline/refresh-releases.sh\` and read the diff.

## Refreshing the pin

```bash
pipeline/refresh-data.sh v1.2.0
npm run data:build
```

The script re-copies the model, rewrites `pipeline/source.json` from the tag it
checked out, and prints what changed. Refreshing is deliberate, not automatic: a
new upstream tag can move counts, and a site that silently renumbers itself is a
site whose history cannot be cited.

## Licence

Game data comes from [Leaguepedia](https://lol.fandom.com), licensed CC BY-SA
3.0. See `ATTRIBUTION.md` for the obligations that follow.
