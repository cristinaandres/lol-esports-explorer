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
    # The short name comes from team_short_name, which pairs the pin's rows with teams
    # on the folded name and keeps one per team: the pin can state two spellings of a
    # team's name, and a list needs a single abbreviation for it.
    "teams.json": """
        select t.*, s.short_name
        from team_index t
        left join team_short_name s using (team_key)
        order by t.team_key
    """,
    "players.json": "select * from player_index order by player_key",
    "champions.json": """
        select c.*, r.release_date
        from champion_index c
        left join champion_releases r on r.name = c.champion_name
        order by c.champion_key
    """,
    "patches.json": "select * from dim_patch order by patch_key",
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
    "games_team_complete", "avg_duration_seconds", "patches",
)


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


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


def report_shortname_defects(con: duckdb.DuckDBPyConnection) -> bool:
    """Fail the build when a pinned short name cannot be attached to one team.

    The join in 08_shortnames.sql folds names before comparing them, because the pin
    stores the wiki's spelling rather than the model's. A fold can still miss a team,
    and a missed row is invisible in the artifacts: the team simply has no short name
    and the abbreviation resolves to nothing, which is how "PG" disappeared. So the
    dropped rows are a printed build error, not a count a test has to notice.

    The opposite defect is reported too: a name that folds onto two teams would bind
    one abbreviation to both, which the artifacts cannot show either.

    Runs before anything is rendered or written, so a failed build leaves the committed
    artifacts untouched. Returns True when every pinned row reached exactly one team.
    """
    unmatched = con.execute(
        "select name, short from unmatched_shortnames order by name, short"
    ).fetchall()
    for name, short in unmatched:
        print(
            f"error: pinned short name {short!r} for {name!r} joins no team in dim_team",
            file=sys.stderr,
        )
    if unmatched:
        print(
            f"error: {len(unmatched)} pinned short name(s) would be dropped; fix the pin "
            "(pipeline/refresh-shortnames.py) or the fold in pipeline/sql/08_shortnames.sql",
            file=sys.stderr,
        )

    ambiguous = con.execute(
        "select name, short, team_names from ambiguous_shortnames order by name, short"
    ).fetchall()
    for name, short, team_names in ambiguous:
        print(
            f"error: pinned short name {short!r} for {name!r} folds onto more than one "
            f"team: {team_names}",
            file=sys.stderr,
        )
    if ambiguous:
        print(
            f"error: {len(ambiguous)} pinned short name(s) name more than one team; the "
            "fold in pipeline/sql/08_shortnames.sql is too coarse for these names",
            file=sys.stderr,
        )

    return not unmatched and not ambiguous


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


def render(con: duckdb.DuckDBPyConnection) -> dict[str, str]:
    """Return artifact name -> serialised UTF-8 JSON text."""
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

    source = json.loads(SOURCE_FILE.read_text(encoding="utf-8"))
    meta = {
        "source": source,
        "modelFiles": {path.name: sha256(path) for path in sorted(MODEL_DIR.glob("*.csv"))},
        "upstreamFiles": {path.name: sha256(path) for path in sorted(UPSTREAM_DIR.glob("*.json"))},
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

    # read_csv() resolves paths relative to the process working directory, and
    # the SQL files spell them relative to the repository root on purpose, so the
    # same file works from the CLI and from here.
    import os

    os.chdir(ROOT)

    con = connect()
    if not report_shortname_defects(con):
        return 1
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
