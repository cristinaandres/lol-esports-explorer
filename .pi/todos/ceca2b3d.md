{
  "id": "ceca2b3d",
  "title": "Cover the build's refusal paths with a test",
  "tags": [
    "review",
    "test",
    "pipeline"
  ],
  "status": "open",
  "created_at": "2026-11-21T09:40:37.016Z"
}

`pipeline/build.py` now refuses three things it used to accept quietly: a manifest that is not the one `pipeline/source.json` pins, a pinned directory containing something that is not a regular file, and (via `--check`) any artifact that drifted. All three were proved by hand in `/tmp` and none is covered by automation — the repo has no Python tests at all, so a red-path regression would be found by a person re-reading the code rather than by CI.

Add the smallest harness that makes these executable: `pytest` over temporary copies of `pipeline/source.json`, `data/upstream/manifest.json` and one pinned directory, asserting the exit status and the message for each refusal. Three cases are enough; the point is that a future edit to `verify_manifest` or `pinned_files` cannot quietly turn a refusal into a silent pass.

Two constraints: it must not need the 270 KB manifest duplicated in a fixture (build it from a few bytes and a matching hash), and `npm run check` must run it, or it is a test nobody runs.

Check: deleting the `verify_manifest` call makes a test fail; restoring it makes the suite green.
