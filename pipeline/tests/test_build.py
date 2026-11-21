"""The refusals that keep a stale pin, an unrecorded file or a dropped short name out
of the build.

`pipeline/build.py` stops when `data/upstream/manifest.json` is not the file
`pipeline/source.json` pins, when it is missing, when a recorded file is missing or
has moved, when a file in a pinned directory is on disk but unrecorded, when a
pinned directory holds something that is not a plain regular file, and when a
pinned short name reaches no team or more than one. Each refusal was proved by hand
in `/tmp`; nothing in the repository failed if a later edit deleted a call, so
these tests are the proof rather than the transcript of one.

Four choices keep them cheap and honest:

  * The module is imported, not run as a subprocess. Every refusal in `render()` is
    decided before DuckDB is asked for a row, so a connection stub reaches them in
    milliseconds. A subprocess would need a copy of `data/model/` and a real DuckDB
    run -- seconds per case -- and would cover the refusal no better.
  * The short-name guard is the one refusal in `main()` rather than `render()`, so a
    stub that answers its two views is what covers the call. The views themselves are
    the other half: a three-row `dim_team` and a one-row pin in a temporary directory
    run the real `08_shortnames.sql` against real DuckDB, which a stub cannot prove,
    and avoid copying the 5 MB model to do it.
  * The root is temporary and the paths are patched, so nothing here can write to
    the repository's `data/` or `public/data/`. `pipeline/source.json` is copied,
    which means the hash the tests compare against is the pin's real one until a
    test records the fixture's own files in it.
  * A refusal is `SystemExit(str)`: the string is what the CLI prints to stderr and
    the status is 1 because the interpreter says so. Asserting the full message
    therefore covers what a reader sees and what a caller can rely on.
"""

from __future__ import annotations

import hashlib
import json
import os
import pathlib
import shutil
import sys
from collections.abc import Callable

import duckdb
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
# One model file, so the pin records a file in data/model/ as well as data/upstream/.
# A fixture is enough: the refusals compare hashes, not rows.
TINY_TEAM = b"team_key,team_name\nT1,T1 Esports\n"


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


class RowsCursor:
    """The rows a test gives one query."""

    description: tuple[object, ...] = ()

    def __init__(self, rows: list[tuple[object, ...]]) -> None:
        self._rows = rows

    def fetchall(self) -> list[tuple[object, ...]]:
        return list(self._rows)


class DefectConnection:
    """The two defect views `report_shortname_defects()` reads, with a test's rows.

    Nothing in `render()` reads these views, so a stub is the only way to reach the
    refusal in `main()` in milliseconds: it answers the query that names each view
    and refuses anything else, so a guard that asked for a third view, or a test
    that swapped two views' rows, fails here instead of passing quietly.
    """

    def __init__(
        self,
        unmatched: list[tuple[object, ...]] | None = None,
        ambiguous: list[tuple[object, ...]] | None = None,
    ) -> None:
        self._rows = {
            "unmatched_shortnames": unmatched or [],
            "ambiguous_shortnames": ambiguous or [],
        }

    def execute(self, sql: str) -> RowsCursor:
        for view, rows in self._rows.items():
            if view in sql:
                return RowsCursor(rows)
        # main() reads a defect view before anything else, so a query that names
        # neither is the build having gone past the guard -- the deletion this stub
        # exists to make a reader see.
        raise AssertionError(
            f"the build went past the short-name guard and asked for: {sql}"
        )


@pytest.fixture
def root(tmp_path: pathlib.Path, monkeypatch: pytest.MonkeyPatch) -> pathlib.Path:
    """A repository skeleton holding only the files the refusals read."""
    repo = tmp_path / "repo"
    for directory in ("pipeline", "data/upstream", "data/model", "public/data"):
        (repo / directory).mkdir(parents=True)
    eras = repo / "data" / "upstream" / "game-eras.json"
    eras.write_bytes(TINY_ERAS)
    (repo / "data" / "model" / "dim_team.csv").write_bytes(TINY_TEAM)
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


def pin_tree(repo: pathlib.Path, content: bytes = TINY_MANIFEST) -> dict[str, str]:
    """Write a manifest and record every pinned file, as a refresh does.

    `files` is the per-file map `pipeline/refresh-data.sh` writes into
    `pipeline/source.json`: each pinned file's sha256, keyed by its path from the
    repository root. A test that tampers with a file moves it without recording it
    again, which is exactly the state the build must refuse.
    """
    manifest = repo / "data" / "upstream" / "manifest.json"
    manifest.write_bytes(content)
    files: dict[str, str] = {}
    for directory in (repo / "data" / "model", repo / "data" / "upstream"):
        for path in sorted(directory.iterdir()):
            files[path.relative_to(repo).as_posix()] = hashlib.sha256(
                path.read_bytes()
            ).hexdigest()
    source_path = repo / "pipeline" / "source.json"
    source = json.loads(source_path.read_text(encoding="utf-8"))
    source["manifestSha256"] = files["data/upstream/manifest.json"]
    source["files"] = files
    source_path.write_text(json.dumps(source, indent=2) + "\n", encoding="utf-8")
    return files


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

    pin_tree(root)
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
    pin_tree(root)
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


def test_render_refuses_a_pinned_file_whose_bytes_moved(root: pathlib.Path) -> None:
    """The defect the per-file map closes: a hand-edited CSV, manifest intact.

    The build used to hash whatever it found into meta.json and call that
    provenance, so this file would have produced a new artifact set describing the
    edit. Now the pin's own record is what the file is compared against.
    """
    pinned = pin_tree(root)
    target = root / "data" / "model" / "dim_team.csv"
    target.write_bytes(TINY_TEAM + b"T2,T2 Esports\n")

    message = refused(lambda: build.render(NoRowsConnection()))

    assert (
        "error: data/model/dim_team.csv is not the file pipeline/source.json pins"
        in message
    )
    assert f"  pinned:    {pinned['data/model/dim_team.csv']}" in message
    assert f"  on disk:   {hashlib.sha256(target.read_bytes()).hexdigest()}" in message
    assert "re-pin with pipeline/refresh-data.sh <tag>, then rebuild" in message


def test_main_refuses_before_duckdb_reads_the_model(
    root: pathlib.Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A changed CSV must be the pin's message, not a DuckDB exception.

    main() used to connect first, and the connection creates the views that read the
    pinned CSVs: a hand-edited file could fail with a binder error, and a missing one
    with an IOException, before `render()` reached the comparison. Verifying the pin
    first makes either edit the documented refusal, whatever the edit does to the
    CSV parser.
    """
    pin_tree(root)
    (root / "data" / "model" / "dim_team.csv").write_bytes(TINY_TEAM + b"T2,T2 Esports\n")

    def no_duckdb() -> object:
        raise AssertionError("DuckDB was asked to read the model before the pin was verified")

    monkeypatch.setattr(build, "connect", no_duckdb)

    message = refused(lambda: build.main([]))

    assert (
        "error: data/model/dim_team.csv is not the file pipeline/source.json pins"
        in message
    )


def test_render_refuses_a_recorded_file_that_is_missing(root: pathlib.Path) -> None:
    pin_tree(root)
    (root / "data" / "model" / "dim_team.csv").unlink()

    message = refused(lambda: build.render(NoRowsConnection()))

    assert (
        "error: data/model/dim_team.csv is missing; run pipeline/refresh-data.sh"
        in message
    )


def test_render_refuses_a_file_the_pin_does_not_record(root: pathlib.Path) -> None:
    """A file the pin does not name is refused, not warned about.

    meta.json would record it -- the pinned directory is the rule -- so the pin and
    the artifact would disagree about what this tag contains, which is how the
    unrecorded file gets cited back to a tag that never shipped it.
    """
    pin_tree(root)
    (root / "data" / "model" / "notes.csv").write_bytes(b"a\n")

    message = refused(lambda: build.render(NoRowsConnection()))

    assert "error: data/model/notes.csv is not recorded in pipeline/source.json" in message
    assert "re-pin with pipeline/refresh-data.sh <tag>, or remove the file" in message


def test_render_refuses_a_pin_that_records_no_files(root: pathlib.Path) -> None:
    """An older pin, or an edit that drops the map, is not silently unchecked."""
    pin_tree(root)
    source_path = root / "pipeline" / "source.json"
    source = json.loads(source_path.read_text(encoding="utf-8"))
    del source["files"]
    source_path.write_text(json.dumps(source, indent=2) + "\n", encoding="utf-8")

    message = refused(lambda: build.render(NoRowsConnection()))

    assert "error: pipeline/source.json records no per-file hashes" in message
    assert "re-pin with pipeline/refresh-data.sh <tag>" in message


# 08_shortnames.sql reads these paths relative to the working directory, as the build
# runs it, so a test can chdir into a directory holding a model of two rows and a pin
# of one, and exercise the real views without the pinned model. The header is the
# model's own.
GUARD_TEAM_HEADER = b"team_key,team_id,team_name,overview_page,region\n"
# The pin states one name. Two rows state it too, which is the state the guard is for.
GUARD_PINNED_SHORTNAMES = b'{"teams":[{"name":"T1 Esports","short":"T1"}]}\n'


def guard_connection() -> duckdb.DuckDBPyConnection:
    """A real DuckDB with `08_shortnames.sql` loaded over the caller's directory.

    The caller has chdir'd into `guard_repo()`, because the file reads its model and
    its pin by the paths the build reads them by. The file's last view unions the
    alias bridge, which is not what this guard asks about, so the bridge is a view of
    no rows with the bridge's columns. Everything else -- the fold, the rank, the two
    defect views -- is the file's own SQL.
    """
    con = duckdb.connect()
    con.execute(
        """
        create or replace view alias_rows as
        select null::varchar as kind, null::varchar as alias_string,
               null::varchar as entity_id, null::varchar as entity_name,
               null::varchar as valid_from, null::varchar as valid_to,
               null::varchar as evidence
        where false
        """
    )
    con.execute(
        "create or replace view dim_team as "
        "select * from read_csv('data/model/dim_team.csv', header = true)"
    )
    con.execute((PIPELINE_DIR / "sql" / "08_shortnames.sql").read_text(encoding="utf-8"))
    return con


def guard_repo(tmp_path: pathlib.Path, teams: bytes) -> pathlib.Path:
    """A directory holding the two files 08_shortnames.sql reads by relative path."""
    repo = tmp_path / "guarded"
    (repo / "data" / "model").mkdir(parents=True)
    (repo / "data" / "upstream").mkdir(parents=True)
    (repo / "data" / "model" / "dim_team.csv").write_bytes(GUARD_TEAM_HEADER + teams)
    (repo / "data" / "upstream" / "team-shortnames.json").write_bytes(
        GUARD_PINNED_SHORTNAMES
    )
    return repo


@pytest.mark.parametrize(
    ("case", "first_id", "second_id"),
    [
        ("the same team_id twice", b"tm-shared", b"tm-shared"),
        # An empty CSV field reads as NULL, which the unknown member already carries.
        ("a null team_id", b"", b""),
    ],
)
def test_shortname_guard_sees_two_teams_under_one_id(
    tmp_path: pathlib.Path,
    monkeypatch: pytest.MonkeyPatch,
    case: str,
    first_id: bytes,
    second_id: bytes,
) -> None:
    """The blind spot: two team rows sharing an id are two teams, not one.

    The DDL declares `team_id` UNIQUE, but the build reads the CSV, so nothing rejects
    a duplicate id, and the model's real key is `team_key`. Keyed on `team_id`, both
    rows fell in one rank partition -- the second row's short name was dropped with no
    word -- and the ambiguity view counted one team. The build succeeded and the pin's
    abbreviation was gone from `teams.json`, which is the defect this test pins down.
    """
    teams = b"1," + first_id + b",T1 Esports,T1 Esports,Korea\n"
    teams += b"2," + second_id + b",T1 Esports,T1 Esports,Korea\n"
    repo = guard_repo(tmp_path, teams)
    monkeypatch.chdir(repo)
    con = guard_connection()

    ambiguous = con.execute(
        "select name, short, teams, team_names from ambiguous_shortnames"
    ).fetchall()
    assert ambiguous == [("T1 Esports", "T1", 2, "T1 Esports | T1 Esports")], case

    # Both rows rank first on their own key, so neither can lose its short name to the
    # other; the ambiguity above is what refuses the build.
    ranks = con.execute(
        "select team_key, team_rank from shortname_matches order by team_key"
    ).fetchall()
    assert ranks == [(1, 1), (2, 1)], case


def test_shortname_guard_is_quiet_when_each_name_reaches_one_team(
    tmp_path: pathlib.Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The control: keying on `team_key` must not refuse an ordinary model.

    One pinned name, one team it reaches, and a second team the pin does not name. Both
    defect views are empty, which is the state the build proceeds on.
    """
    teams = b"1,tm-one,T1 Esports,T1 Esports,Korea\n"
    teams += b"2,tm-two,T1 Academy,T1 Academy,Korea\n"
    repo = guard_repo(tmp_path, teams)
    monkeypatch.chdir(repo)
    con = guard_connection()

    assert con.execute("select count(*) from ambiguous_shortnames").fetchone() == (0,)
    assert con.execute("select count(*) from unmatched_shortnames").fetchone() == (0,)
    assert con.execute("select team_key, short_name from team_short_name").fetchall() == [
        (1, "T1")
    ]


def test_main_refuses_a_pinned_short_name_that_joins_no_team(
    root: pathlib.Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    """The refusal `render()` never reaches, because it runs in `main()` on both paths.

    Nothing else in this suite fails if the `report_shortname_defects(con)` call is
    deleted from `main()`: the build proceeds and the team's row in `teams.json` loses
    its short name, silently. This is the test that makes that deletion red.
    """
    pin_tree(root)
    monkeypatch.setattr(
        build, "connect", lambda: DefectConnection(unmatched=[("T9 Esports", "T9")])
    )

    cwd = os.getcwd()
    try:
        status = build.main([])
    finally:
        os.chdir(cwd)

    assert status == 1
    error = capsys.readouterr().err
    assert (
        "error: pinned short name 'T9' for 'T9 Esports' joins no team in dim_team" in error
    )
    assert "error: 1 pinned short name(s) would be dropped" in error
    assert not list((root / "public" / "data").iterdir()), (
        "a refused build writes no artifact"
    )


def test_main_refuses_a_pinned_short_name_that_names_two_teams(
    root: pathlib.Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    """The other defect the same call reports, with the same status and no artifact."""
    pin_tree(root)
    monkeypatch.setattr(
        build,
        "connect",
        lambda: DefectConnection(
            ambiguous=[("T1 Esports", "T1", "T1 Esports | T1 Academy")]
        ),
    )

    cwd = os.getcwd()
    try:
        status = build.main([])
    finally:
        os.chdir(cwd)

    assert status == 1
    error = capsys.readouterr().err
    assert (
        "error: pinned short name 'T1' for 'T1 Esports' folds onto more than one team: "
        "T1 Esports | T1 Academy" in error
    )
    assert "error: 1 pinned short name(s) name more than one team" in error
    assert not list((root / "public" / "data").iterdir()), (
        "a refused build writes no artifact"
    )


def test_main_builds_when_every_pinned_row_reaches_one_team(
    root: pathlib.Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The control: an empty defect set is what lets `main()` write the artifacts."""
    pin_tree(root)
    monkeypatch.setattr(build, "connect", NoRowsConnection)

    cwd = os.getcwd()
    try:
        status = build.main([])
    finally:
        os.chdir(cwd)

    assert status == 0
    assert (root / "public" / "data" / "teams.json").is_file()
