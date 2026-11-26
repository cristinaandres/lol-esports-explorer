"""The refusals that keep a stale pin or an unrecorded file out of the build.

`pipeline/build.py` stops when `data/upstream/manifest.json` is not the file
`pipeline/source.json` pins, when it is missing, when a recorded file is missing or
has moved, when a file in a pinned directory is on disk but unrecorded, when a
pinned directory holds something that is not a plain regular file, and when the pin
records no per-file hashes at all. Each refusal was proved by hand in `/tmp`;
nothing in the repository failed if a later edit deleted a call, so these tests are
the proof rather than the transcript of one.

Four choices keep them cheap and honest:

  * The module is imported, not run as a subprocess. Every refusal in `render()` is
    decided before DuckDB is asked for a row, so a connection stub reaches them in
    milliseconds. A subprocess would need a copy of `data/model/` and a real DuckDB
    run -- seconds per case -- and would cover the refusal no better.
  * `08_shortnames.sql` reads a column of the model rather than a second pinned file,
    so it is covered by its own small tests at the bottom: a three-row `dim_team` in a
    temporary directory runs the real SQL against real DuckDB, which avoids copying the
    5 MB model, and the claims are the ones the file makes -- one alias per team that
    states a short, none for a row that states none, and no refusal when two teams
    share one.
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


def test_render_accepts_the_manifest_the_pin_names(
    root: pathlib.Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The control: with a matching manifest the same paths render."""

    pin_tree(root)
    # The Almanac builder needs a real DuckDB; the refusal tests use a stub connection,
    # so the builder is stubbed here and tested in test_crystal_ball.py.
    monkeypatch.setattr(build.crystal_ball, "build", lambda connection, pin: {})
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

# 08_shortnames.sql reads the model by the path the build reads it by, so these tests
# chdir into a directory holding a three-row model and run the file's real SQL. The
# header is the model's own; `short` is empty for the row that states none, which is how
# a CSV writes a null.
SHORTNAME_HEADER = b"team_key,team_id,team_name,overview_page,region,short\n"


def shortname_connection(tmp_path: pathlib.Path, monkeypatch: pytest.MonkeyPatch, teams: bytes) -> duckdb.DuckDBPyConnection:
    """A real DuckDB with `08_shortnames.sql` loaded over a three-row model.

    The file's last view unions the alias bridge, which is not what these tests ask
    about, so the bridge is a view of no rows with the bridge's columns. Everything
    else -- `team_short_name`, `shortname_aliases`, `alias_all` -- is the file's own SQL.
    """
    repo = tmp_path / "shortnamed"
    (repo / "data" / "model").mkdir(parents=True)
    (repo / "data" / "model" / "dim_team.csv").write_bytes(SHORTNAME_HEADER + teams)
    monkeypatch.chdir(repo)

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


def test_short_names_come_from_the_team_row(tmp_path: pathlib.Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """One alias per team that states a short, and the list prints the same value.

    The model states the abbreviation on the row it belongs to, so there is no name to
    fold and no second row to rank: the artifact's short name and the searchable alias
    are the same column, and a change upstream is the only thing that can move either.
    """
    teams = b"1,tm-one,T1 Esports,T1 Esports,Korea,T1\n"
    teams += b"2,tm-two,T1 Academy,T1 Academy,Korea,T1A\n"
    con = shortname_connection(tmp_path, monkeypatch, teams)

    assert con.execute("select team_key, short_name from team_short_name order by team_key").fetchall() == [
        (1, "T1"),
        (2, "T1A"),
    ]
    aliases = con.execute(
        "select alias_string, entity_id, entity_name, evidence from shortname_aliases order by alias_string"
    ).fetchall()
    assert aliases == [
        ("T1", "tm-one", "T1 Esports", "shortname"),
        ("T1A", "tm-two", "T1 Academy", "shortname"),
    ]
    # The alias carries no validity window, as every searchable name that no page prints.
    windows = con.execute("select count(*) from alias_all where valid_from is not null").fetchall()
    assert windows == [(0,)]


def test_a_team_that_states_no_short_contributes_no_alias(tmp_path: pathlib.Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """A missing label is not a defect: four teams state none today.

    The pin this replaced had to refuse a row that reached no team, because a dropped
    abbreviation was invisible. A null column is visible: there is nothing to drop, and
    "no abbreviation" is exactly what the model says.
    """
    teams = b"1,tm-one,T1 Esports,T1 Esports,Korea,T1\n"
    teams += b"2,tm-two,Some Minted Team,Some Minted Team,EMEA,\n"
    con = shortname_connection(tmp_path, monkeypatch, teams)

    assert con.execute("select count(*) from team_short_name").fetchall() == [(1,)]
    assert con.execute("select alias_string from shortname_aliases").fetchall() == [("T1",)]
    # The team itself is untouched: it is still a team, with games and a page.
    assert con.execute("select count(*) from dim_team").fetchall() == [(2,)]


def test_two_teams_may_state_the_same_short(tmp_path: pathlib.Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Shared abbreviations are the model's truth, not an ambiguity to refuse.

    ESC, GMB, IM and RED each denote two organisations upstream, and the upstream
    release says the short is a label rather than an identity. Folding names onto teams
    made this a defect to report; a column on the row makes it an ordinary repeat.
    """
    teams = b"1,tm-one,Excel Esports,Excel Esports,EMEA,ESC\n"
    teams += b"2,tm-two,Eschalot Esports,Eschalot Esports,EMEA,ESC\n"
    con = shortname_connection(tmp_path, monkeypatch, teams)

    rows = con.execute("select short_name, count(*) from team_short_name group by short_name").fetchall()
    assert rows == [("ESC", 2)]
    assert con.execute("select count(*) from shortname_aliases where alias_string = 'ESC'").fetchall() == [(2,)]


def test_main_writes_the_artifacts_when_the_pin_holds(root: pathlib.Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """The control: nothing else gates `main()` now that the short-name guard is gone."""
    pin_tree(root)
    monkeypatch.setattr(build, "connect", NoRowsConnection)
    monkeypatch.setattr(build.crystal_ball, "build", lambda connection, pin: {})

    cwd = os.getcwd()
    try:
        status = build.main([])
    finally:
        os.chdir(cwd)

    assert status == 0
    assert (root / "public" / "data" / "teams.json").is_file()


def test_honour_place_number_is_declared_rather_than_sniffed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A wholly empty column is VARCHAR to DuckDB and INTEGER to the dictionary.

    `place_number` is empty on every recorded row, so an undeclared read would type it
    as text -- and the first pin that states a place would change the artifact's type
    without a commit to `types.ts`. The view declares the column; this reads the
    declaration off a real DuckDB, over the real pinned file, rather than trusting the
    SQL to have kept it.
    """
    monkeypatch.chdir(build.ROOT)
    con = build.connect()
    columns = {
        row[0]: row[1]
        for row in con.execute("describe select * from fact_player_honour").fetchall()
    }

    assert columns["place_number"] == "INTEGER"
    assert columns["place"] == "VARCHAR"
    assert columns["player_key"] == "INTEGER"
    assert columns["title"] == "VARCHAR"

    # And the view reads the pinned fact rather than a copy: the row count is the CSV's.
    csv = build.MODEL_DIR / "fact_player_honour.csv"
    stated = len(csv.read_text(encoding="utf-8").strip().splitlines()) - 1
    assert con.execute("select count(*) from fact_player_honour").fetchall() == [(stated,)]


def test_primary_roles_resolve_ties_by_the_canonical_order(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The two tied champions and one ordinary one, read off the real SQL.

    Rammus (Jungle 4, Top 4) and Teemo (Top 2, Bot 2) are the only champions whose top
    role is a tie on this pin. The rule says the canonical order decides, so both are
    Top; a later refactor that ranked by row order or by name would answer differently
    and this is the test that would notice. Ahri is the control: 287 Mid rows against 1
    Bot, so the tie-break is not doing the work.
    """
    monkeypatch.chdir(build.ROOT)
    con = build.connect()

    roles = dict(
        con.execute(
            "select champion_name, primary_role from champion_index "
            "where champion_name in ('Rammus', 'Teemo', 'Ahri')"
        ).fetchall()
    )
    assert roles == {"Rammus": "Top", "Teemo": "Top", "Ahri": "Mid"}

    counts = dict(
        con.execute(
            "select player_name, primary_role from player_index "
            "where player_name in ('Exosen', 'Shushei', 'Faker')"
        ).fetchall()
    )
    # Exosen played Bot 8 and Mid 8; Mid comes first in the canonical order.
    # Shushei played Mid 8 and Top 8; Top does.
    assert counts == {"Exosen": "Mid", "Shushei": "Top", "Faker": "Mid"}

    # Every published row has a role: a champion or player with no game would state
    # none, and this pin has none. The five roles are the only values there are.
    for view, expected in (("champion_index", 171), ("player_index", 1140)):
        rows, with_role = con.execute(f"select count(*), count(primary_role) from {view}").fetchall()[0]
        assert (rows, with_role) == (expected, expected), view
        roles = {
            row[0]
            for row in con.execute(f"select distinct primary_role from {view}").fetchall()
        }
        assert roles <= {"Top", "Jungle", "Mid", "Bot", "Support"}, view


def test_last_club_is_the_club_of_the_latest_game(monkeypatch: pytest.MonkeyPatch) -> None:
    """The club a player last played for, checked against a transfer.

    Zeus won Worlds 2023 with T1 and was playing for Hanwha Life Esports in 2026, so a
    rule that took the club with the most games would answer T1 and this asserts HLE.
    Kingen is the second case: Kiwoom DRX at Worlds 2022, Nongshim RedForce last. Every
    player the index publishes has a last game, and its date is the latest of theirs.
    """
    monkeypatch.chdir(build.ROOT)
    con = build.connect()

    rows = dict(
        con.execute(
            "select player_name, last_team_key from player_index "
            "where player_name in ('Zeus', 'Kingen')"
        ).fetchall()
    )
    expected = dict(
        con.execute(
            "select team_name, team_key from dim_team "
            "where team_name in ('Hanwha Life Esports', 'Nongshim RedForce')"
        ).fetchall()
    )
    assert rows == {"Zeus": expected["Hanwha Life Esports"], "Kingen": expected["Nongshim RedForce"]}

    # The date is the player's own latest game, not the corpus's latest or the club's.
    latest = dict(
        con.execute(
            """
            select player_key, max(date_time_utc) from (
              select pg.player_key, g.date_time_utc
              from fact_player_game pg join dim_game g using (game_key)
              where pg.player_key in (select player_key from dim_player where player_name in ('Zeus', 'Kingen'))
            ) group by player_key
            """
        ).fetchall()
    )
    # The artifact publishes the year; the instant stays on `player_last_game`, which is
    # where a reader of the SQL (and this test) can compare it.
    stored = dict(
        con.execute(
            "select player_key, last_game_date from player_last_game "
            "where player_key in (select player_key from dim_player where player_name in ('Zeus', 'Kingen'))"
        ).fetchall()
    )
    assert stored == latest

    years = dict(
        con.execute(
            "select player_key, last_game_year from player_index "
            "where player_name in ('Zeus', 'Kingen')"
        ).fetchall()
    )
    assert years == {key: value[:4] for key, value in latest.items()}

    players, with_year = con.execute(
        "select count(*), count(last_game_year) from player_index"
    ).fetchall()[0]
    assert (players, with_year) == (1140, 1140)
