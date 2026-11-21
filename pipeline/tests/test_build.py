"""The refusals that keep a stale pin or an unrecorded file out of the build.

`pipeline/build.py` stops when `data/upstream/manifest.json` is not the file
`pipeline/source.json` pins, when it is missing, and when a pinned directory holds
something that is not a plain regular file. Each refusal was proved by hand in
`/tmp`; nothing in the repository failed if a later edit deleted a call, so these
tests are the proof rather than the transcript of one.

Three choices keep them cheap and honest:

  * The module is imported, not run as a subprocess. Every refusal in `render()` is
    decided before DuckDB is asked for a row, so a connection stub reaches them in
    milliseconds. A subprocess would need a copy of `data/model/` and a real DuckDB
    run -- seconds per case -- and would cover the refusal no better.
  * The root is temporary and the paths are patched, so nothing here can write to
    the repository's `data/` or `public/data/`. `pipeline/source.json` is copied,
    which means the hash the tests compare against is the pin's real one.
  * A refusal is `SystemExit(str)`: the string is what the CLI prints to stderr and
    the status is 1 because the interpreter says so. Asserting the full message
    therefore covers what a reader sees and what a caller can rely on.
"""

from __future__ import annotations

import hashlib
import json
import pathlib
import shutil
import sys
from collections.abc import Callable

import pytest

PIPELINE_DIR = pathlib.Path(__file__).resolve().parents[1]
# build.py is a script, not a module of a package: the repository has no Python
# package and no install step, so the test puts its directory on the path.
sys.path.insert(0, str(PIPELINE_DIR))

import build  # noqa: E402

REAL_SOURCE = PIPELINE_DIR / "source.json"
REAL_PINNED_HASH = json.loads(REAL_SOURCE.read_text(encoding="utf-8"))["manifestSha256"]

# A manifest only has to be bytes whose hash the pin states, so the tests state a
# few instead of copying the 270 KB upstream manifest into a fixture.
TINY_MANIFEST = b'{"tag":"v1.1.0","files":[]}\n'
TINY_MANIFEST_HASH = hashlib.sha256(TINY_MANIFEST).hexdigest()
# render() reads the era spine past the refusals; an empty spine is enough for a
# test that stops while rendering.
TINY_ERAS = b'{"groups":{"team-stats":[]}}\n'


class EmptyCursor:
    """What DuckDB returns for a query over no rows, without starting DuckDB."""

    description: tuple[object, ...] = ()

    def fetchall(self) -> list[tuple[object, ...]]:
        return []


class NoRowsConnection:
    """Enough of a connection for render() to reach its refusals.

    The stub answers every query with no columns and no rows, which is all
    `render()` needs to serialise `[]` for each artifact. The refusals are decided
    before any row is read, so nothing here can mask one.
    """

    def execute(self, sql: str) -> EmptyCursor:
        return EmptyCursor()


@pytest.fixture
def root(tmp_path: pathlib.Path, monkeypatch: pytest.MonkeyPatch) -> pathlib.Path:
    """A repository skeleton holding only the files the refusals read."""
    repo = tmp_path / "repo"
    for directory in ("pipeline", "data/upstream", "data/model", "public/data"):
        (repo / directory).mkdir(parents=True)
    eras = repo / "data" / "upstream" / "game-eras.json"
    eras.write_bytes(TINY_ERAS)
    # The real pin, copied: its manifestSha256 still names the upstream manifest,
    # which is what makes writing a different file a tampered manifest.
    shutil.copyfile(REAL_SOURCE, repo / "pipeline" / "source.json")

    # monkeypatch restores these when the test ends, so one test cannot decide what
    # the next one sees, and no test points the build at the real root.
    monkeypatch.setattr(build, "ROOT", repo)
    monkeypatch.setattr(build, "SOURCE_FILE", repo / "pipeline" / "source.json")
    monkeypatch.setattr(build, "MODEL_DIR", repo / "data" / "model")
    monkeypatch.setattr(build, "UPSTREAM_DIR", repo / "data" / "upstream")
    monkeypatch.setattr(build, "ERA_TABLE", eras)
    monkeypatch.setattr(build, "OUT_DIR", repo / "public" / "data")
    return repo


def pin_manifest(repo: pathlib.Path, content: bytes = TINY_MANIFEST) -> pathlib.Path:
    """Write a manifest, and state its hash in the copied source.json."""
    manifest = repo / "data" / "upstream" / "manifest.json"
    manifest.write_bytes(content)
    source_path = repo / "pipeline" / "source.json"
    source = json.loads(source_path.read_text(encoding="utf-8"))
    source["manifestSha256"] = hashlib.sha256(content).hexdigest()
    source_path.write_text(json.dumps(source, indent=2) + "\n", encoding="utf-8")
    return manifest


def refused(call: Callable[[], object]) -> str:
    """Run a call that must stop the build, and return the message it stops with."""
    with pytest.raises(SystemExit) as exc:
        call()
    message = exc.value.code
    assert isinstance(message, str), "a refusal carries a message, not a bare status"
    assert message.startswith("error: ")
    return message


def test_render_accepts_the_manifest_the_pin_names(root: pathlib.Path) -> None:
    """The control: with a matching manifest the same paths render."""

    pin_manifest(root)
    rendered = build.render(NoRowsConnection())

    meta = json.loads(rendered["meta.json"])
    assert meta["source"]["manifestSha256"] == TINY_MANIFEST_HASH
    assert meta["upstreamFiles"]["manifest.json"] == TINY_MANIFEST_HASH
    assert "eras.json" in rendered


def test_render_refuses_a_manifest_that_is_not_the_one_pinned(root: pathlib.Path) -> None:
    # No re-pin: source.json still states the upstream manifest's hash.
    (root / "data" / "upstream" / "manifest.json").write_bytes(TINY_MANIFEST)

    message = refused(lambda: build.render(NoRowsConnection()))

    assert (
        "error: data/upstream/manifest.json is not the manifest pipeline/source.json pins"
        in message
    )
    assert f"  pinned:    {REAL_PINNED_HASH}" in message
    assert f"  on disk:   {TINY_MANIFEST_HASH}" in message
    assert "re-pin with pipeline/refresh-data.sh <tag>, then rebuild" in message


def test_render_refuses_a_missing_manifest(root: pathlib.Path) -> None:
    message = refused(lambda: build.render(NoRowsConnection()))

    assert (
        "error: data/upstream/manifest.json is missing; run pipeline/refresh-data.sh"
        in message
    )


@pytest.mark.parametrize("intruder", ["directory", "symlink"])
def test_render_refuses_what_is_not_a_regular_file(
    root: pathlib.Path, intruder: str
) -> None:
    """A subdirectory and a symlink, because each is skipped by a different bug.

    A directory fails `is_file()`; a symlink to a regular file passes it, so only
    the `is_symlink()` half of the test refuses it. Both would otherwise leave a
    file in a pinned directory recorded nowhere.
    """
    pin_manifest(root)
    upstream = root / "data" / "upstream"
    if intruder == "directory":
        (upstream / "notes").mkdir()
        name = "notes"
    else:
        try:
            (upstream / "manifest-copy.json").symlink_to("manifest.json")
        except OSError:
            pytest.skip("this filesystem does not create symlinks")
        name = "manifest-copy.json"

    message = refused(lambda: build.render(NoRowsConnection()))

    assert (
        f"error: data/upstream/{name} is not a regular file; "
        "a pinned directory holds pinned files only" in message
    )
