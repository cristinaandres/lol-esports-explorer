{
  "id": "ceca2b3d",
  "title": "Cover the build's refusal paths with a test",
  "tags": [
    "review",
    "test",
    "pipeline"
  ],
  "status": "done",
  "created_at": "2026-11-21T09:40:37.016Z"
}

`pipeline/build.py` now refuses three things it used to accept quietly: a manifest that is not the one `pipeline/source.json` pins, a pinned directory containing something that is not a regular file, and (via `--check`) any artifact that drifted. All three were proved by hand in `/tmp` and none is covered by automation — the repo has no Python tests at all, so a red-path regression would be found by a person re-reading the code rather than by CI.

Add the smallest harness that makes these executable: `pytest` over temporary copies of `pipeline/source.json`, `data/upstream/manifest.json` and one pinned directory, asserting the exit status and the message for each refusal. Three cases are enough; the point is that a future edit to `verify_manifest` or `pinned_files` cannot quietly turn a refusal into a silent pass.

Two constraints: it must not need the 270 KB manifest duplicated in a fixture (build it from a few bytes and a matching hash), and `npm run check` must run it, or it is a test nobody runs.

Check: deleting the `verify_manifest` call makes a test fail; restoring it makes the suite green.

## Done — test/build-refusals

`pipeline/tests/test_build.py`, five tests, `npm run data:test`, run by
`npm run check` after vitest and before `data:check`. The module is imported, not
run as a subprocess: every refusal in `render()` is decided before DuckDB is asked
for a row, so a stub connection reaches them in half a second, where a subprocess
would need a second copy of the 5 MB model and a real DuckDB run per case. The
root is `tmp_path`, the module constants are patched with `monkeypatch` (restored
after each test), and nothing can touch the repository's `data/` or `public/data/`;
`git status` after the suite shows only the intended edits.

The cases, each asserting the refusal message in full:

- tampered manifest: the copied `source.json` still pins the upstream hash, the
  manifest on disk is a few bytes, and the message must carry the pinned hash, the
  actual one and the re-pin instruction.
- missing manifest: the pin names a hash, no file exists.
- non-regular file: parametrised over a subdirectory and a symlink to a regular
  file, because they are refused by different halves of `path.is_symlink() or not
  path.is_file()`; the symlink case skips itself where symlinks cannot be created.
- a control that renders with a matching manifest and asserts `meta.json` records
  its hash, so a red test cannot be red because the fixture is broken.

pytest 9.2.0 is pinned in `[dependency-groups] dev` in `pipeline/pyproject.toml`,
`pipeline/uv.lock` regenerated, `uv run` installs it by default.

Verified: `npm run check` green, the Python suite reporting `5 passed in 0.48s`.
Red both ways in a scratch copy under `/tmp`: with `verify_manifest(source)`
commented out of `render()`, `2 failed, 3 passed` (`DID NOT RAISE SystemExit` for
the tampered and missing cases); with it restored and the `raise SystemExit` in
`pinned_files` replaced by `continue`, `2 failed, 3 passed` again, both parameters
of the non-regular case.

CI runs it. `deploy.yml` runs the check's steps individually rather than through
`npm run check`, so a step of its own was needed and was added: the pytest suite
runs before the artifact check, which is the order that fails fastest. The two
commands are the same ones `npm run check` runs, so a local green and a CI green
mean the same thing.
