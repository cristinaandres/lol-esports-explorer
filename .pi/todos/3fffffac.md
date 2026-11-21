{
  "id": "3fffffac",
  "title": "Fix the four broken failure messages",
  "tags": [
    "review",
    "bug",
    "ui"
  ],
  "status": "done",
  "created_at": "2026-11-20T23:20:34.937Z"
}

- src/routes/PhaseDetail.tsx prints an empty error: {status === 'failed' ? '' : ''}.
- src/routes/SeriesDetail.tsx has no failed branch, so a load error renders "No series called X".
- src/routes/EventsIndex.tsx still renders "Loading…", the string the skeleton ticket removed everywhere else.
- src/routes/Home.tsx tells the reader to run "node tools/check.ts"; no tools/ directory exists.

Fixed, plus one more of the same kind found while there.

- `PhaseDetail` printed `Could not load the dataset: ` with the message assembled from
  `{status === 'failed' ? '' : ''}` — an empty sentence. It now renders `LoadFailure`
  with the loader's message and a retry.
- `SeriesDetail` had no failed branch at all, so a load error read "No series called X".
  Fixed earlier, in the eager-set split (#17), because that change gave the page a
  second state it could not ignore.
- `EventsIndex` rendered the literal `Loading…`, the string the skeleton ticket removed
  everywhere else. It renders the shared skeleton now.
- `Home` told the reader to run `node tools/check.ts`, a directory that does not exist.
  It now says the artifacts may be mid-deploy and to reload.
- **Fifth, found while surveying the routes:** `EraDetail` collapsed "not ready" into
  "Nothing to show.", so a failed load told the reader the era held no games. It renders
  `LoadFailure` now; a failure is never an absence.

`Glossary` is the one route left without a failed branch: its prose stands on its own and
a failed dataset leaves it saying less rather than saying something false. `NotFound`
cannot fail, and every other route (including `Selection`) branches.

Proved on the built site with `eras.json` refused: the phase page and the era page both
render "Could not load the dataset.", the loader's message and "Try again". With the
request held instead of refused, the events index shows the skeleton and no "Loading…"
text.
