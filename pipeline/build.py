#!/usr/bin/env python3
"""Build the browser artifacts the site reads from the pinned dimensional model.

The site never queries a server: every view is answered from a handful of JSON
files loaded once. Those files are generated here, from the DuckDB SQL in
pipeline/sql/, and committed, so a clone renders without running Python.

Two properties matter more than speed:

  * Determinism. The same input yields the same bytes -- no timestamps, no set
    ordering, no float formatting drift -- so --check can prove a committed
    artifact is current, the same way the upstream dataset proves its own build.
  * Provenance. meta.json pins the upstream tag, commit and model-file hashes,
    so a reader can walk from a number on the site back to the payload it came
    from.

Usage:
    uv run python pipeline/build.py          # write public/data/*.json
    uv run python pipeline/build.py --check  # fail if the committed files differ
"""

from __future__ import annotations

import argparse
import decimal
import hashlib
import json
import pathlib
import sys

import duckdb

import crystal_ball

ROOT = pathlib.Path(__file__).resolve().parent.parent
SQL_DIR = ROOT / "pipeline" / "sql"
SOURCE_FILE = ROOT / "pipeline" / "source.json"
MODEL_DIR = ROOT / "data" / "model"
UPSTREAM_DIR = ROOT / "data" / "upstream"
ERA_TABLE = UPSTREAM_DIR / "game-eras.json"
OUT_DIR = ROOT / "public" / "data"

# Artifact name -> the view it serialises. One file per level of the site, so a
# page loads its level and nothing else. The era artifact is the exception: it is
# assembled in build_eras(), because its spine is declared upstream, not derived.
#
# Ordering is in the query, not in a component: the site trusts the file order and
# the check compares bytes, so an unordered select would make the artifact flap.
ARTIFACTS: dict[str, str] = {
    # Eager: loaded by every page.
    "totals.json": "select * from corpus_totals",
    "events.json": """
        select e.*, c.coverage_games, c.team_complete, c.draft_complete, c.player_complete
        from event_summary e
        left join event_coverage_report c using (event_id)
        order by e.date_start, e.event_name
    """,
    # id ends the order: two pairs tie on decision, rule and name (the two
    # All-Star 2018 Las Vegas and the two IEM Global Challenge Sao Paulo rows),
    # and a tie is not an order.
    "selection.json": """
        select * from selection_candidates order by decision, rule, name, id
    """,
    "games.json": "select * from game_rows order by date_time_utc, game_key",
    "matches.json": "select * from match_rows order by match_key",
    # Names. Loaded eagerly because every page resolves a key to a name.
    # The short name is the model's own column (dim_team.short, upstream v1.2.0); the
    # view only renames it and drops the rows that state none.
    "teams.json": """
        select t.*, s.short_name
        from team_index t
        left join team_short_name s using (team_key)
        order by t.team_key
    """,
    # Spelled out rather than `select *`: the view keeps `primary_role_games` for the
    # pipeline test, and a `*` would carry that deciding count to every first page load
    # although nothing renders it.
    "players.json": """
        select player_key, player_id, player_name, overview_page, games,
               primary_role, last_team_key, last_game_year
        from player_index
        order by player_key
    """,
    # Spelled out rather than `c.*`: the release date now sits on champion_index,
    # and the artifact's key order is part of its bytes, so a `select *` would churn
    # every row to move one field. Games before the date, as it has always been.
    "champions.json": """
        select c.champion_key, c.champion_id, c.champion_name, c.riot_key,
               c.games, c.release_date, c.primary_role
        from champion_index c
        order by c.champion_key
    """,
    "patches.json": "select * from patch_rows order by patch_key",
    # Distinctions: the awards the source states for a player at a tournament, one row
    # per player, event and title. A pass-through with no derived column -- counting
    # them is a GROUP BY -- published whole because it is 24 rows and both entity
    # pages and event pages read it. Ordered by the fact's grain key, then the title,
    # so the file is deterministic and the same pin always writes the same bytes.
    "honours.json": """
        select player_key, event_key, team_key, title, type, source_page, place, place_number
        from fact_player_honour
        order by event_key, player_key, title
    """,
    # Renames. Loaded by the entity pages and by search, not by the lists.
    # NULLS LAST is spelled out: the short names carry no window, and where nulls land
    # is a DuckDB setting rather than a property of the data. An artifact whose row
    # order depends on a default fails --check on a machine with a different one.
    "aliases.json": """
        select * from alias_all
        order by kind, entity_id, alias_string,
                 valid_from nulls last, valid_to nulls last, evidence
    """,
    # Lazy: fetched on the first game page and cached for the session.
    "sides.json": "select * from side_rows order by game_key, side",
    "player-games.json": "select * from player_rows order by game_key, side, player_key",
    "bans.json": "select * from ban_rows order by game_key, side, entry_index",
    "picks.json": "select * from pick_rows order by game_key, side, entry_index",
}

# Era-level fields the site reads; zero when the era governs no game.
ERA_FIELDS = (
    "first_date", "last_date", "games", "series", "events", "teams", "players",
    "blue_wins", "red_wins", "games_draft_complete", "games_player_complete",
    "games_team_complete", "games_duration_stated", "avg_duration_seconds", "patches",
)


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pinned_files(directory: pathlib.Path) -> dict[str, str]:
    """Every pinned file in a directory, hashed, keyed by name.

    The rule is the directory, not an extension list: `data/model/` holds the model
    CSVs, the data dictionary and the DDL, and `data/upstream/` holds the era table,
    the build manifest and the curated files. Hashing `*.csv` alone let three files
    the provenance document calls pinned go unrecorded, which is the kind of gap a
    reader only finds by checking by hand.

    Two exceptions, both because the alternative is an artifact that depends on the
    machine rather than on the pin:

      * A dotfile is the operating system's, not the pin's. macOS writes `.DS_Store`
        into any directory it lists, `.gitignore` already ignores it, and hashing it
        would make `--check` fail on one contributor's laptop and pass on another.
      * Anything that is not a plain regular file -- a subdirectory, a symlink -- is
        refused rather than skipped, because skipping it is how a pinned file ends up
        recorded nowhere, which is the defect this function exists to close.

    Deterministic: names are sorted, and a new file changes the artifact once, on
    purpose, so the diff says what was added.
    """
    pinned: dict[str, str] = {}
    for path in sorted(directory.iterdir()):
        if path.name.startswith("."):
            continue
        if path.is_symlink() or not path.is_file():
            raise SystemExit(
                f"error: {path.relative_to(ROOT)} is not a regular file; "
                "a pinned directory holds pinned files only"
            )
        pinned[path.name] = sha256(path)
    return pinned


def verify_manifest(source: dict[str, object]) -> None:
    """The pinned manifest must be the one `pipeline/source.json` names.

    `manifest.json` is the upstream build manifest, and until now its hash was
    recorded in source.json and checked against nothing: the file it described was
    not in the repository. It is committed, and this is the comparison that makes
    the recorded hash mean something -- the build refuses to produce artifacts from a
    manifest that is missing or that some later refresh replaced without updating the
    pin.
    """
    manifest = UPSTREAM_DIR / "manifest.json"
    expected = source.get("manifestSha256")
    if not manifest.is_file():
        raise SystemExit(
            "error: data/upstream/manifest.json is missing; run pipeline/refresh-data.sh"
        )
    if not isinstance(expected, str):
        raise SystemExit("error: pipeline/source.json states no manifestSha256")
    actual = sha256(manifest)
    if actual != expected:
        raise SystemExit(
            "error: data/upstream/manifest.json is not the manifest pipeline/source.json pins\n"
            f"  pinned:    {expected}\n"
            f"  on disk:   {actual}\n"
            "  re-pin with pipeline/refresh-data.sh <tag>, then rebuild"
        )


def verify_pin(source: dict[str, object]) -> None:
    """Every pinned file must be the one `pipeline/source.json` records.

    The manifest used to be the only pinned file this build checked. It refused a
    manifest that was not the pin's, then hashed whatever else it found into
    meta.json -- so a hand-edited CSV rewrote the artifacts and the new meta.json
    described the drift instead of the pin. `pipeline/refresh-data.sh` now records
    the sha256 of every file it installs, keyed by its path from the repository
    root, and this is the comparison that makes the record a proof.

    Three refusals, because a pin is only worth what it can reject:

      * a recorded file that is missing from the disk;
      * a recorded file whose bytes moved, which names both hashes;
      * a file on disk that the record does not name. This is a refusal rather than
        a warning because `pinned_files()` already decides meta.json by the
        directory: a file the pin does not record would otherwise be described by
        the artifact and not by the pin, which is the same gap in a new place.

    Recorded paths are read as repository-relative, and sorted, so the refusal a
    reader sees is the first file in the pin and not the first the filesystem
    happened to list.
    """
    recorded = source.get("files")
    if not isinstance(recorded, dict) or not recorded:
        raise SystemExit(
            "error: pipeline/source.json records no per-file hashes\n"
            "  re-pin with pipeline/refresh-data.sh <tag>"
        )

    for relative in sorted(recorded):
        expected = recorded[relative]
        path = ROOT / relative
        if not path.is_file():
            raise SystemExit(
                f"error: {relative} is missing; run pipeline/refresh-data.sh"
            )
        actual = sha256(path)
        if actual != expected:
            raise SystemExit(
                f"error: {relative} is not the file pipeline/source.json pins\n"
                f"  pinned:    {expected}\n"
                f"  on disk:   {actual}\n"
                "  re-pin with pipeline/refresh-data.sh <tag>, then rebuild"
            )

    on_disk: set[str] = set()
    for directory in (MODEL_DIR, UPSTREAM_DIR):
        prefix = directory.relative_to(ROOT).as_posix()
        on_disk.update(f"{prefix}/{name}" for name in pinned_files(directory))
    unrecorded = sorted(on_disk - set(recorded))
    if unrecorded:
        raise SystemExit(
            f"error: {unrecorded[0]} is not recorded in pipeline/source.json\n"
            "  the pin names every file it installs; a file it does not name is not part of it\n"
            "  re-pin with pipeline/refresh-data.sh <tag>, or remove the file"
        )


def plain(value: object) -> object:
    """Coerce DuckDB's decimal/date values into JSON-native ones."""
    if isinstance(value, decimal.Decimal):
        return float(value)
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def connect() -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    for path in sorted(SQL_DIR.glob("*.sql")):
        con.execute(path.read_text(encoding="utf-8"))
    return con


def build_eras(con: duckdb.DuckDBPyConnection) -> list[dict[str, object]]:
    """The era spine: declared eras joined to what the corpus actually contains.

    The spine comes from data/upstream/game-eras.json -- the upstream rule that
    says which fields could exist when -- not from the games. Two declared eras
    ('herald' and 'hextech-chemtech') govern no game at all, because no
    international event was played in their window; the site shows them as gaps
    rather than pretending the game did not change.
    """
    declared = json.loads(ERA_TABLE.read_text(encoding="utf-8"))
    eras = declared["groups"]["team-stats"]

    cursor = con.execute("select * from era_summary")
    columns = [column[0] for column in cursor.description]
    measured = {
        row[columns.index("era")]: dict(zip(columns, row)) for row in cursor.fetchall()
    }

    spine: list[dict[str, object]] = []
    for era in eras:
        facts = measured.get(era["id"], {})
        entry: dict[str, object] = {
            "era": era["id"],
            "from": era["from"],
            "cites": era["cites"],
            "eligible_fields": len(era["eligible"]),
            # The field names that could hold a value in this era, as the upstream
            # rule spells them. The game page uses them to say "this did not exist
            # yet" instead of "the source has no value", which are different facts.
            "eligible": era["eligible"],
        }
        for field in ERA_FIELDS:
            entry[field] = plain(facts.get(field, 0))
        for field in ("first_date", "last_date", "avg_duration_seconds"):
            entry[field] = plain(facts.get(field))
        spine.append(entry)
    return spine


def dumps(rows: list[dict[str, object]]) -> str:
    """Serialise a table as JSON with one row per line.

    Two reasons, both about reading a diff rather than a payload: a compact
    two-space-indented array of 30,910 objects is a megabyte of indentation, and
    an unchanged file should produce an unchanged line. gzip does not care, and
    neither does the browser.
    """
    if not rows:
        return "[]\n"
    body = ",\n".join(
        json.dumps(row, ensure_ascii=False, separators=(",", ":")) for row in rows
    )
    return "[\n" + body + "\n]\n"


def read_pin() -> dict[str, object]:
    """Read the pin and prove it, before anything reads a pinned file.

    Every refusal here happens before DuckDB opens a CSV, so a file whose bytes
    moved is the pin's refusal even when the edit would not load: the same bytes
    that make a view fail are the bytes `source.json` does not record. Reading it a
    second time in `render()` costs a few milliseconds and keeps the refusal where
    a caller of `render()` expects it.
    """
    source = json.loads(SOURCE_FILE.read_text(encoding="utf-8"))
    verify_manifest(source)
    verify_pin(source)
    return source


def render(con: duckdb.DuckDBPyConnection) -> dict[str, str]:
    """Return artifact name -> serialised UTF-8 JSON text."""
    # Read and verify the pin first: a pinned file that disagrees with source.json
    # makes every artifact below untrustworthy, so the build stops before writing
    # any. The manifest is checked on its own as well, because its refusal is the
    # one a reader already knows and it names the file a refresh moves first.
    source = read_pin()

    rendered: dict[str, str] = {
        "eras.json": dumps(build_eras(con))
    }
    for name, query in ARTIFACTS.items():
        cursor = con.execute(query)
        columns = [column[0] for column in cursor.description]
        rows = [
            {column: plain(value) for column, value in zip(columns, row)}
            for row in cursor.fetchall()
        ]
        rendered[name] = dumps(rows)

    # The Almanac is assembled by its own module: the views in
    # 09_crystal_ball.sql, the Wilson and bootstrap intervals, and one artifact per
    # question. It returns serialised text, because the numbers are written once and
    # never recomputed in the browser.
    rendered.update(crystal_ball.build(con, str(source["manifestSha256"])))

    meta = {
        "source": source,
        "modelFiles": pinned_files(MODEL_DIR),
        "upstreamFiles": pinned_files(UPSTREAM_DIR),
        "artifacts": {
            name: hashlib.sha256(text.encode("utf-8")).hexdigest()
            for name, text in rendered.items()
        },
    }
    rendered["meta.json"] = json.dumps(meta, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    return rendered


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if the committed artifacts are stale")
    args = parser.parse_args(argv)

    if not MODEL_DIR.is_dir():
        print(f"error: {MODEL_DIR} is missing; run pipeline/refresh-data.sh", file=sys.stderr)
        return 2

    # The pin is checked before DuckDB reads a CSV, so a missing or edited model
    # file is the refusal in read_pin() rather than a DuckDB binder or IO error.
    read_pin()

    # read_csv() resolves paths relative to the process working directory, and
    # the SQL files spell them relative to the repository root on purpose, so the
    # same file works from the CLI and from here.
    import os

    os.chdir(ROOT)

    con = connect()
    rendered = render(con)

    if args.check:
        stale = [
            name
            for name, text in rendered.items()
            if not (OUT_DIR / name).is_file() or (OUT_DIR / name).read_text(encoding="utf-8") != text
        ]
        extra = sorted(p.name for p in OUT_DIR.glob("*.json") if p.name not in rendered) if OUT_DIR.is_dir() else []
        if stale or extra:
            for name in stale:
                print(f"stale: public/data/{name}", file=sys.stderr)
            for name in extra:
                print(f"unexpected: public/data/{name}", file=sys.stderr)
            return 1
        print(f"public/data is current ({len(rendered)} files)")
        return 0

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for path in OUT_DIR.glob("*.json"):
        if path.name not in rendered:
            path.unlink()
            print(f"removed public/data/{path.name}")
    for name, text in rendered.items():
        (OUT_DIR / name).write_text(text, encoding="utf-8")
    print(f"wrote {len(rendered)} files to public/data/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
