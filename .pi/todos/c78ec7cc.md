{
  "id": "c78ec7cc",
  "title": "Report short names that join to no team",
  "tags": [
    "review",
    "bug",
    "pipeline"
  ],
  "status": "open",
  "created_at": "2026-11-20T23:20:34.832Z"
}

data/upstream/team-shortnames.json maps "Pain Gaming" to PG, but dim_team spells it "paiN Gaming", so the join in pipeline/sql/08_shortnames.sql drops the row silently: searching PG finds nothing.

The mismatch is written into the pin by refresh-shortnames.py, which asks the wiki for the model's spelling and stores the wiki's answer.

Make the build print (and fail on?) team_shortnames rows that fail the join, so a dropped alias is a message rather than a test note.
