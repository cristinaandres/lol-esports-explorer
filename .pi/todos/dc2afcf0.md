{
  "id": "dc2afcf0",
  "title": "Surface the alias fetch failure in search",
  "tags": [
    "review",
    "bug",
    "ui"
  ],
  "status": "done",
  "created_at": "2026-11-20T23:20:34.906Z"
}

src/components/SearchBox.tsx calls loadAliases().then(...) with no .catch: an unhandled rejection, "Loading names…" forever, and a quieter failure on entity pages where former names silently become an empty list.

The box should say the names could not be loaded, and the entity pages should not pretend there are no former names.

## Done — fix(web) b234737

The search box now keeps the alias load as four states (idle, loading, ready,
failed) instead of `AliasRow[] | null`. A rejection sets `failed` and renders an
inline "Could not load other names. Try again" plus "Results match current names
only."; the current-name index stays usable, the existing live region announces
the degraded search, and the retry starts a fresh request because `memoised`
forgets a rejection. The empty state while failed says no *current* name matches.

The player, team and champion pages branch on `aliases.status === 'failed'` and
show "Could not load former names. Try again" in the page header. A successful
load with no dated names still renders no line, so "loaded, none" and "did not
load" are different answers. `LoadFailure` gained an `inline` variant so these
three headers and the search dropdown reuse the same sentence and retry action
without a card that would outweigh the one line it reports.

Verified with `npm run check` (lint, 208 tests, artifact freshness, production
build) and against the built site over CDP, failing `aliases.json` with
`Fetch.failRequest`. After the failure, typing "mad lions" showed the inline
notice and no results while "T1" still returned current-name matches. T1 showed
"Could not load former names. Try again", then "Previously SK Telecom T1
(2013-09-15 → 2019-11-03)" after allowing the request and retrying; Sw0rd and Nunu
& Willump behaved the same. `Runtime.exceptionThrown` stayed empty and no
`unhandledrejection` was recorded.
