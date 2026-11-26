# Agent notes

A static explorer for every international League of Legends game in the
[lol-dataset](https://github.com/RRiboulet/lol-dataset) corpus. The dataset is the
upstream project and the source of truth for what a game *is*; this repository
only decides how it is navigated.

**Language.** Every commit message, comment, identifier, document and user-facing
string is in English. The project is public and meant to read internationally.

**Current state.** Rounds 0 to 3e are built: the era spine and era detail, event,
series and game pages, the player, team and champion pages with their indexes and
search, the glossary and the selection audit, the 3b polish round, the 3c structure
work, 3d index sorting with the club a player last played for, and 3e player
distinctions — over the DuckDB pipeline and the deploy. `docs/specs/README.md` lists
the rounds in their build order. Round 4a — The Almanac (`/almanac`, spec in
`docs/specs/2026-11-20-phase-4-crystal-ball.md`), whose first eight tickets (00–07) are built
and whose remaining one (08) is planned, its 4b backtest, and the phase 5 design pass are
not built. Prediction is
not built either, and is not scoped to phase 4: it is deferred to round 6, with its
definition of ready in the phase 4 spec.

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
   ordering surprises. `npm run data:check` fails if a committed file is stale. A
   notebook is never an artifact and one is never committed: analysis is done in
   `scratch/`, which git ignores, and what enters the repository is the dossier in
   `docs/analysis/` — a query, its result, the decision, the pin and the date, so it
   cannot go quietly stale.
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

After a release, prove what is deployed before calling it live. `gh run list
--limit 1` is not enough: for the first minute or two it can still return the
*previous* deploy, and a browser can serve the previous `index.html` from its
10-minute cache, so a check run too early measures the old build and looks like a
regression. Match the run to the merge commit and the bundle to the code:

```bash
gh run list --branch main --limit 1 --json headSha,status,conclusion   # headSha = the merge
js=$(curl -s "$SITE/" | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1)
curl -s "$SITE/$js" | grep -c "<a string only the new build contains>"  # 0 means still the old build
```

The artifacts are the other half: they keep stable names, so the fetch revalidates
them (`cache: 'no-cache'` in `src/lib/data.ts`) rather than trusting a 10-minute
browser cache. A page that renders new chrome with old labels — every champion
under "Unknown" — is that failure, not a data bug.

## Reviews

One review per change, and only when the user asks for it. `triage_change` gives a
recommendation and never launches anything; ask before starting a reviewer.
