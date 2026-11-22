# Agent notes

A static explorer for every international League of Legends game in the
[lol-dataset](https://github.com/RRiboulet/lol-dataset) corpus. The dataset is the
upstream project and the source of truth for what a game *is*; this repository
only decides how it is navigated.

**Language.** Every commit message, comment, identifier, document and user-facing
string is in English. The project is public and meant to read internationally.

**Current state.** Phases 2 and 3 are built, along with the 3b polish round and
the 4b structure work: the era spine and era detail, event, series and game
pages, the player, team and champion pages with their indexes and search, the
glossary and the selection audit, over the DuckDB pipeline and the deploy. Phase
4 (`/compare`) and the phase 5 design pass are not built.

## The rules that matter here

1. **No share without its denominator.** Percentages render through the `Ratio`
   component, which always prints `part` and `total`. A table that shows `67%`
   alone is a bug, not a style choice.
2. **No dead links.** A route is linked only when it exists, and a link's label
   names where it actually goes. When a level is not built yet, the row says where
   it opens rather than offering a link that would 404.
3. **Data is pinned, never hand-edited.** `data/` holds one upstream tag. The
   model's CSVs, its data dictionary and DDL, the era table and the build manifest
   are byte-for-byte copies of it; the two curated audit files are that tag's JSONL
   rewrapped with its source and pin date by the refresh script, because the
   pipeline reads a wrapper. Everything is pinned, nothing is hand-edited:
   changing any of it means running `pipeline/refresh-data.sh <tag>` and committing
   the diff, so `pipeline/source.json`, the files and `public/data/meta.json` stay
   in agreement. The build verifies the recorded sha256 of every pinned file before
   it renders: a recorded file that is missing, a recorded file whose bytes moved,
   and a file on disk the pin does not record are each a refusal naming the file,
   and `meta.json` copies the record.
4. **Artifacts are generated and committed.** `public/data/*.json` is written by
   `pipeline/build.py` and is deterministic: no timestamps, no dictionary
   ordering surprises. `npm run data:check` fails if a committed file is stale.
5. **No derived measures in the facts.** The upstream model refuses columns named
   like `kda`, `gpm` or `win_rate`. If the site needs one, it is computed in SQL
   in `pipeline/sql/` and documented in `docs/metric-definitions.md` first.
6. **Tokens, not hex.** Colour and type come from `@theme` in `src/index.css`.
   A component with a literal `#ff0000` is a bug.

## Structure

```
bin/           the devcontainer helper (`devc`), which the site does not use
data/          pinned model + era table; see data/PROVENANCE.md
pipeline/      DuckDB SQL and the build script (needs uv)
public/data/   generated artifacts the site fetches (committed)
src/           the site: routes, components, lib
docs/          product spec, information architecture, metrics, roadmap
```

## Checks

```bash
npm run check        # lint, vitest, pipeline tests, artifact freshness, production build
npm run dev          # http://localhost:5173/lol-esports-explorer/
```

Run `npm run data:build` after touching `pipeline/sql/`, then `npm run check`.

`npm run check` never sees a rendered page. For that, start `npm run dev` and
drive it through the Playwright MCP server `.pi/mcp.json` declares: a headless
Chromium that answers with the accessibility snapshot, console messages and
screenshots of the running site, so a claim about layout or wiring is read off
the page instead of inferred from the source. Its tools use `codemode` exposure,
so reach them from a script:

```js
await tools.mcp__playwright__browser_navigate({ url: 'http://127.0.0.1:5173/lol-esports-explorer/eras' })
const snapshot = (await tools.mcp__playwright__browser_snapshot({})).content[0].text
```

The pages fetch their artifacts after mount, so a navigation returns before
anything is rendered: wait for `main` to stop growing before asserting, or the
snapshot is a skeleton. Screenshots and page dumps land in `scratch/playwright/`,
which is ignored. The browser build belongs to the container, not the checkout:
`postCreate.sh` installs it and `npm run browser:install` repeats that by hand.

## Branches and pull requests

Two long-lived branches: `dev` carries work in flight, `main` is what is released
and what Pages deploys. Start a feature branch from `dev`, never from `main` or
another feature branch, and check the base before committing:

```bash
git fetch origin
git merge-base --is-ancestor dev HEAD    # 0 = base is right
git log --oneline dev..HEAD              # only this change's commits
```

A branch merges into `dev` through a pull request; `gh pr create --base dev`
explicitly, because the repository default is `main`. Releases are `dev` → `main`
with a merge commit, not a squash.

## Reviews

One review per change, and only when the user asks for it. `triage_change` gives a
recommendation and never launches anything; ask before starting a reviewer.
