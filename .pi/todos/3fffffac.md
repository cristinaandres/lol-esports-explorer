{
  "id": "3fffffac",
  "title": "Fix the four broken failure messages",
  "tags": [
    "review",
    "bug",
    "ui"
  ],
  "status": "open",
  "created_at": "2026-11-20T23:20:34.937Z"
}

- src/routes/PhaseDetail.tsx prints an empty error: {status === 'failed' ? '' : ''}.
- src/routes/SeriesDetail.tsx has no failed branch, so a load error renders "No series called X".
- src/routes/EventsIndex.tsx still renders "Loading…", the string the skeleton ticket removed everywhere else.
- src/routes/Home.tsx tells the reader to run "node tools/check.ts"; no tools/ directory exists.
