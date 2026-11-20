{
  "id": "dc2afcf0",
  "title": "Surface the alias fetch failure in search",
  "tags": [
    "review",
    "bug",
    "ui"
  ],
  "status": "open",
  "created_at": "2026-11-20T23:20:34.906Z"
}

src/components/SearchBox.tsx calls loadAliases().then(...) with no .catch: an unhandled rejection, "Loading names…" forever, and a quieter failure on entity pages where former names silently become an empty list.

The box should say the names could not be loaded, and the entity pages should not pretend there are no former names.
