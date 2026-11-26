#!/usr/bin/env python3
"""Build The Almanac: eighteen questions, their season windows, and their records.

The site never computes an interval. This module reads the finest-grain views in
pipeline/sql/09_crystal_ball.sql, applies the `n >= 20` gate, computes Wilson or
bootstrap intervals once, and writes one artifact per question plus the index. The
same input must produce the same bytes: seeds are fixed, candidates are sorted by a
rule, dictionary keys are sorted by the serialiser, and no timestamp is written.

The season is derived from Worlds, not read from dim_event.year. Season N runs from
the day after Worlds N-1's final to Worlds N's final; the pin's one exception is IPL 5
(29 Nov - 3 Dec 2012), which belongs to season 2013.
"""

from __future__ import annotations

import json
import math
import zlib
from dataclasses import dataclass

import duckdb
import numpy as np

MIN_N = 20
TOP_K = 5
TOP_MAX = 20
RESAMPLES = 10_000
SEED = 20261126
Z = 1.959963984540054
LEVEL = 0.95
SIM_LEVEL = 0.90
SHORTEST_DECILE = 0.10
THIRTY_TWO_MINUTES = 32 * 60

BIAS = (
    "Only teams that qualified for an international event appear in the corpus; "
    "a player's record is a record of the games they reached."
)
ALL_PATCHES = "all patches"
ROLES = ("Top", "Jungle", "Mid", "Bot", "Support")


@dataclass(frozen=True)
class Question:
    id: str
    cls: str
    family: str
    question: str
    view: str
    metric: str
    unit: str | None
    grain: str
    kind: str
    threshold: str
    threshold_label: str
    ends: tuple[str, ...]
    limits: tuple[str, ...]


QUESTIONS: tuple[Question, ...] = (
    Question(
        "champion-presence", "champions", "top-1",
        "Which champion was present in the most games?",
        "cb_season_presence", "presence", "share", "game", "presence", "part",
        "presences",
        ("best",),
        (BIAS, "A presence is a pick or a ban, not a probability."),
    ),
    Question(
        "champion-win-rate", "champions", "top-1",
        "Which champion won the most, and the least?",
        "cb_champion_games", "win rate", "share", "champion-game", "champion_win_rate",
        "n", "picks",
        ("best", "worst"),
        (BIAS, "A win is the picking side's side row; the denominator is picks, not games."),
    ),
    Question(
        "champion-kda", "champions", "top-1",
        "Which champion had the best KDA, and the worst?",
        "cb_champion_games", "KDA", "kda", "champion-game", "champion_kda", "n",
        "champion-games",
        ("best", "worst"),
        (BIAS, "KDA is a ratio of counts, not a share; the interval is a bootstrap."),
    ),
    Question(
        "unique-champions", "champions", "count",
        "How many distinct champions will a season hold?",
        "cb_game_picks", "unique champions", "count", "game", "unique", "none",
        "games",
        ("best",),
        (BIAS, "A simulation draws from this window's observed pick sets; it is a distribution, not a forecast."),
    ),
    Question(
        "teemo-picked", "champions", "yes-no",
        "Will Teemo be picked?",
        "cb_season_presence", "presence", "share", "game", "teemo", "part", "games with Teemo",
        ("best",),
        (BIAS, "The denominator is games, not player rows: a pick happens in a game."),
    ),
    Question(
        "player-kda", "players", "top-1",
        "Which player had the best KDA?",
        "cb_player_games", "KDA", "kda", "player-game", "player_kda", "n",
        "player-games",
        ("best",),
        (BIAS, "KDA is a ratio of counts, not a share; the interval is a bootstrap."),
    ),
    Question(
        "player-kills", "players", "top-1",
        "Which player got the most kills per game?",
        "cb_player_games", "kills per game", "per-game", "player-game", "player_kills",
        "n", "player-games",
        ("best",),
        (BIAS, "Totals are exposure; the card ranks the per-game rate and prints the games beside it."),
    ),
    Question(
        "player-kill-participation", "players", "top-1",
        "Which player took part in the most of their team's kills?",
        "cb_player_games", "kill participation", "share", "player-game", "player_kp",
        "n", "player-games",
        ("best",),
        (BIAS, "The denominator is the team's kills, not the player's."),
    ),
    Question(
        "player-damage", "players", "top-1",
        "Which player dealt the most damage per game?",
        "cb_player_games", "damage per game", "per-game", "player-game", "player_damage",
        "n", "player-games",
        ("best",),
        (BIAS, "The denominator is the rows that state damage, never the row count."),
    ),
    Question(
        "player-kills-threshold", "players", "yes-no",
        "Will a player reach 15 kills in a game?",
        "cb_player_games", "player-games with 15 kills", "share", "player-game",
        "threshold_kills", "part", "player-games with 15 kills",
        ("best",),
        (BIAS, "The denominator is every player-game in the window."),
    ),
    Question(
        "player-cs-threshold", "players", "yes-no",
        "Will a player reach 450 CS in a game?",
        "cb_player_games", "player-games with 450 CS", "share", "player-game",
        "threshold_cs", "part", "player-games with 450 CS",
        ("best",),
        (BIAS, "The denominator is every player-game in the window."),
    ),
    Question(
        "team-win-rate", "teams", "top-1",
        "Which team won the most, and the least?",
        "cb_team_games", "win rate", "share", "side", "team_win_rate", "n",
        "team-games",
        ("best", "worst"),
        (BIAS, "A side is the unit; a series is a different denominator."),
    ),
    Question(
        "team-kills", "teams", "top-1",
        "Which team got the most kills per game?",
        "cb_team_games", "kills per game", "per-game", "side", "team_kills", "n",
        "team-games",
        ("best",),
        (BIAS, "The denominator is the side rows that state kills; a team whose rows state none is absent, not zero."),
    ),
    Question(
        "team-gold", "teams", "top-1",
        "Which team got the most gold per game?",
        "cb_team_games", "gold per game", "per-game", "side", "team_gold", "n",
        "team-games",
        ("best",),
        (BIAS, "The denominator is the side rows that state gold; a team whose rows state none is absent, not zero."),
    ),
    Question(
        "game-length-32", "events", "yes-no",
        "More games before or after 32:00?",
        "cb_game_length", "games at or under 32:00", "share", "game", "game_length",
        "part", "games at or under 32:00",
        ("best",),
        (BIAS, "A game is counted once, not once per side; seven games state no duration."),
    ),
    Question(
        "shortest-game", "events", "yes-no",
        "Who wins the shortest game?",
        "cb_game_length", "blue-side wins in the shortest decile", "share", "game",
        "shortest", "part", "games in the shortest decile",
        ("best",),
        (BIAS, "The shortest decile is a named rule; the record holder is a citation, not the answer."),
    ),
    Question(
        "finals-mvp-role", "events", "categorical",
        "Which role wins Finals MVP?",
        "cb_awards", "Finals MVP role", "count", "award", "mvp", "none", "awards",
        ("best",),
        (BIAS, "Eleven awards is a census; the join is at award grain, not game grain."),
    ),
    Question(
        "region-knockouts", "events", "categorical",
        "How many regions reach knockouts?",
        "cb_region_verification", "regions in knockouts", None, "game", "regions", "none",
        "regions",
        ("best",),
        (BIAS, "No stage column and no region era exist at the pin; the query is the answer."),
    ),
)


@dataclass(frozen=True)
class Window:
    key: str
    label: str
    season: int | None
    date_from: str
    date_to: str
    cut_date: str
    patches: list[str] | str
    games: int
    events: int


# ---------------------------------------------------------------------------
# Statistics


def wilson_p(p: float, n: int, z: float = Z) -> tuple[float, float]:
    """The Wilson score interval for a proportion p over n trials."""
    if n <= 0:
        return 0.0, 1.0
    p = min(1.0, max(0.0, p))
    denominator = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / denominator
    margin = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denominator
    return max(0.0, centre - margin), min(1.0, centre + margin)


def wilson(part: int, n: int, z: float = Z) -> tuple[float, float]:
    """The Wilson score interval, including at p = 0 and p = 1."""
    if n <= 0:
        return 0.0, 1.0
    return wilson_p(part / n, n, z)


def _seed_for(*parts: object) -> int:
    return int(zlib.crc32("|".join(str(part) for part in parts).encode("utf-8")) & 0xFFFFFFFF)


def _bootstrap_means(values: np.ndarray, seed: int) -> tuple[float, float]:
    rng = np.random.default_rng(seed)
    index = rng.integers(0, len(values), size=(RESAMPLES, len(values)))
    means = values[index].mean(axis=1)
    low, high = np.percentile(means, [2.5, 97.5])
    return float(low), float(high)


def _bootstrap_kda(
    kills: np.ndarray, deaths: np.ndarray, assists: np.ndarray, seed: int
) -> tuple[float, float]:
    rng = np.random.default_rng(seed)
    index = rng.integers(0, len(kills), size=(RESAMPLES, len(kills)))
    totals = (kills[index].sum(axis=1) + assists[index].sum(axis=1)) / np.maximum(
        1, deaths[index].sum(axis=1)
    )
    low, high = np.percentile(totals, [2.5, 97.5])
    return float(low), float(high)


def _interval(low: float, high: float, method: str = "wilson", level: float = LEVEL) -> dict:
    return {"level": level, "low": low, "high": high, "method": method}


def _wilson_interval(part: int, n: int) -> dict:
    low, high = wilson(part, n)
    return _interval(low, high)


def _wilson_share(part: int, n: int, denominator: int | None) -> dict:
    """A share whose denominator is not its sample size (kill participation).

    Kill participation divides by the team's kills, but the interval is taken over the
    games it was measured on, as metric-definitions.md states. The point estimate is
    part / denominator; the Wilson interval uses that proportion and n games.
    """
    total = denominator if denominator is not None else n
    low, high = wilson_p(part / total if total else 0.0, n)
    return _interval(low, high)


def _bootstrap_interval(low: float, high: float) -> dict:
    return _interval(low, high, "bootstrap-percentile")


# ---------------------------------------------------------------------------
# Formatting. The same sentence the browser prints; the reference is
# src/lib/answer.ts#formatAnswer.


def _percent_number(value: float) -> str:
    scaled = value * 100
    if scaled >= 10:
        return f"{scaled:.0f}"
    if scaled >= 1:
        return f"{scaled:.1f}"
    return f"{scaled:.2f}"


def _value_text(value: float, unit: str | None) -> str:
    if unit == "share":
        return f"{_percent_number(value)}%"
    if unit == "kda":
        return f"{value:.2f}"
    if unit == "per-game":
        return f"{value:.1f}" if value < 100 else f"{round(value):,}"
    if unit == "count":
        return f"{round(value):,}"
    if unit == "seconds":
        return f"{round(value):,} s"
    return str(value)


def _bound_text(value: float, unit: str | None) -> str:
    if unit == "share":
        return _percent_number(value)
    if unit == "kda":
        return f"{value:.2f}"
    if unit == "per-game":
        return f"{value:.1f}" if value < 100 else f"{round(value):,}"
    if unit == "count":
        return f"{round(value):,}"
    return str(value)


def _interval_text(interval: dict, unit: str | None, n: int) -> str:
    if interval["method"] == "simulation-percentile":
        return f"90% of {n:,} simulations"
    level = f"{round(interval['level'] * 100)}%"
    if unit == "share":
        return f"{level} CI: {_percent_number(interval['low'])}–{_percent_number(interval['high'])}%"
    return f"{level} CI: {_bound_text(interval['low'], unit)}–{_bound_text(interval['high'], unit)}"


def format_answer(headline: dict, verdict: str) -> str:
    if verdict != "answered" or headline["value"] is None or headline["interval"] is None:
        return headline["text"]
    if headline["unit"] == "count":
        interval = headline["interval"]
        return (
            f"{_value_text(interval['low'], 'count')}–{_value_text(interval['high'], 'count')} "
            f"({_interval_text(interval, 'count', headline['n'])})"
        )
    return (
        f"{_value_text(headline['value'], headline['unit'])} "
        f"({_interval_text(headline['interval'], headline['unit'], headline['n'])}, "
        f"n={headline['n']:,})"
    )


# ---------------------------------------------------------------------------
# Windows


def _rows(con: duckdb.DuckDBPyConnection, sql: str, params: tuple = ()) -> list[dict]:
    cursor = con.execute(sql, params)
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _iso(value: object) -> str:
    return value.isoformat() if hasattr(value, "isoformat") else str(value)


def windows(con: duckdb.DuckDBPyConnection) -> list[Window]:
    corpus = _rows(con, "select * from cb_corpus_window")[0]
    seasons = _rows(con, "select * from cb_season_window order by season")
    patches = _rows(con, "select season, patch from cb_season_patches order by season, first_game")
    by_season: dict[int, list[str]] = {}
    for row in patches:
        by_season.setdefault(row["season"], []).append(row["patch"])

    result = [
        Window(
            key="all",
            label="All games",
            season=None,
            date_from=_iso(corpus["date_from"]),
            date_to=_iso(corpus["date_to"]),
            cut_date=_iso(corpus["cut_date"]),
            patches=ALL_PATCHES,
            games=corpus["games"],
            events=corpus["events"],
        )
    ]
    for row in seasons:
        result.append(
            Window(
                key=f"season:{row['season']}",
                label=f"Season {row['season']}",
                season=row["season"],
                date_from=_iso(row["date_from"]),
                date_to=_iso(row["date_to"]),
                cut_date=_iso(row["cut_date"]),
                patches=by_season.get(row["season"], []) or [ALL_PATCHES],
                games=row["games"],
                events=row["events"],
            )
        )
    return result


def _window_filter(season: int | None) -> tuple[str, tuple]:
    if season is None:
        return "", ()
    return " where season = ?", (season,)


def _window_artifact(window: Window) -> dict:
    return {
        "key": window.key,
        "label": window.label,
        "season": window.season,
        "date_from": window.date_from,
        "date_to": window.date_to,
        "cut_date": window.cut_date,
        "patches": window.patches,
        "games": window.games,
        "events": window.events,
    }


def _window_limit(window: Window) -> str:
    if window.patches == ALL_PATCHES:
        return "All patches across fifteen years; the pooled figure is not any one era's."
    return f"{window.label} spans {', '.join(window.patches)}; the record is not a forecast."


# ---------------------------------------------------------------------------
# Candidates and records


def _share_candidate(
    name: str, path: str, part: int, n: int, denominator: int | None = None,
    threshold: str = "part",
) -> dict:
    total = denominator if denominator is not None else n
    metric = part / total if total else 0.0
    interval = _wilson_share(part, n, total)
    return {
        "name": name,
        "path": path,
        "metric": metric,
        "part": part,
        "n": n,
        "denominator": total,
        "interval": interval,
        "lower_bound": interval["low"],
        "upper_bound": interval["high"],
        "eligible": (part if threshold == "part" else n) >= MIN_N,
    }


def _ratio_candidate(
    name: str, path: str, value: float, n: int, interval: dict, part: int | None = None,
    denominator: int | None = None, components: dict | None = None,
) -> dict:
    candidate = {
        "name": name,
        "path": path,
        "metric": value,
        "part": part,
        "n": n,
        "denominator": denominator,
        "interval": interval,
        "lower_bound": interval["low"],
        "upper_bound": interval["high"],
        "eligible": n >= MIN_N,
    }
    if components is not None:
        candidate["components"] = components
    return candidate


def _sorted(candidates: list[dict], end: str) -> list[dict]:
    eligible = [candidate for candidate in candidates if candidate["eligible"]]
    if end == "worst":
        return sorted(eligible, key=lambda c: (c["upper_bound"], c["metric"], c["name"]))
    return sorted(eligible, key=lambda c: (-c["lower_bound"], -c["metric"], c["name"]))


def _take_top(candidates: list[dict], end: str) -> list[dict]:
    chosen = candidates[:TOP_MAX]
    if not chosen:
        return chosen
    edge = chosen[-1]["lower_bound"] if end == "best" else chosen[-1]["upper_bound"]
    for candidate in candidates[TOP_MAX:]:
        value = candidate["lower_bound"] if end == "best" else candidate["upper_bound"]
        if value == edge and len(chosen) < TOP_MAX + 1:
            chosen.append(candidate)
        else:
            break
    return chosen


def _candidate_out(candidate: dict) -> dict:
    out = {
        "name": candidate["name"],
        "path": candidate["path"],
        "metric": candidate["metric"],
        "part": candidate["part"],
        "n": candidate["n"],
        "interval": candidate["interval"],
        "lower_bound": candidate["lower_bound"],
        "upper_bound": candidate["upper_bound"],
    }
    if "components" in candidate:
        out["components"] = candidate["components"]
    return out


def _census(candidates: list[dict], threshold: str) -> list[dict]:
    excluded = [candidate for candidate in candidates if not candidate["eligible"]]
    key = "part" if threshold == "part" else "n"
    excluded.sort(key=lambda c: (-(c[key] or 0), c["name"]))
    return [
        {"name": candidate["name"], "count": candidate[key] or 0, "n": candidate["n"]}
        for candidate in excluded[:5]
    ]


def _record_answer(q: Question, window: Window, candidates: list[dict], end: str) -> dict:
    ordered = _sorted(candidates, end)
    chosen = _take_top(ordered, end)
    if not chosen:
        return _record_insufficient_top(q, window, candidates)
    first = chosen[0]
    interval = first["interval"]
    headline = {
        "text": "",
        "value": first["metric"],
        "unit": q.unit,
        "n": first["n"],
        "interval": interval,
    }
    headline["text"] = format_answer(headline, "answered")
    census = _census(candidates, q.threshold)
    record = {
        "end": end,
        "verdict": "answered",
        "headline": headline,
        "evidence": {
            "metric": q.metric,
            "value": first["metric"],
            "part": first["part"],
            "n": first["n"],
            "denominator": first["denominator"] if q.unit == "share" else None,
            "grain": q.grain,
            "role": None,
        },
        "candidates": [_candidate_out(candidate) for candidate in chosen],
        "top": TOP_MAX,
        "limits": [_window_limit(window)],
    }
    if census:
        record["census"] = census
    return record


def _record_insufficient_top(q: Question, window: Window, candidates: list[dict]) -> dict:
    key = "part" if q.threshold == "part" else "n"
    ordered = sorted(candidates, key=lambda c: (-(c[key] or 0), c["name"]))
    census = [
        {"name": candidate["name"], "count": candidate[key] or 0, "n": candidate["n"]}
        for candidate in ordered[:5]
    ]
    headline = {
        "text": f"Insufficient data: no candidate reached {MIN_N} {q.threshold_label} in {window.label}.",
        "value": None,
        "unit": q.unit,
        "n": window.games,
        "interval": None,
    }
    return {
        "end": "best",
        "verdict": "insufficient_data",
        "headline": headline,
        "evidence": {
            "metric": q.metric,
            "value": None,
            "part": None,
            "n": window.games,
            "denominator": None,
            "grain": q.grain,
            "role": None,
        },
        "census": census,
        "limits": [_window_limit(window)],
    }


def _record_share(
    q: Question, window: Window, part: int, n: int, label: str,
    denominator: int | None = None,
) -> dict:
    total = denominator if denominator is not None else n
    threshold = part if q.threshold == "part" else n
    if threshold < MIN_N:
        headline = {
            "text": f"Insufficient data: {part:,} of {n:,} {q.threshold_label}.",
            "value": None,
            "unit": q.unit,
            "n": n,
            "interval": None,
        }
        return {
            "end": "best",
            "verdict": "insufficient_data",
            "headline": headline,
            "evidence": {
                "metric": q.metric,
                "value": None,
                "part": part,
                "n": n,
                "denominator": total,
                "grain": q.grain,
                "role": None,
            },
            "census": [{"name": label, "count": part, "n": n}],
            "limits": [_window_limit(window)],
        }
    interval = _wilson_interval(part, n)
    headline = {
        "text": "",
        "value": part / total if total else 0.0,
        "unit": q.unit,
        "n": n,
        "interval": interval,
    }
    headline["text"] = format_answer(headline, "answered")
    return {
        "end": "best",
        "verdict": "answered",
        "headline": headline,
        "evidence": {
            "metric": q.metric,
            "value": part / total if total else 0.0,
            "part": part,
            "n": n,
            "denominator": total,
            "grain": q.grain,
            "role": None,
        },
        "limits": [_window_limit(window)],
    }


# ---------------------------------------------------------------------------
# The question builders


def _presence_rows(con: duckdb.DuckDBPyConnection, season: int | None) -> list[dict]:
    if season is None:
        return _rows(
            con,
            """
            select p.champion_key, c.champion_id, c.champion_name, sum(p.part) part, sum(p.n) n
            from mt_cb_season_presence p join dim_champion c using (champion_key)
            group by 1, 2, 3
            """,
        )
    return _rows(
        con,
        """
        select p.champion_key, c.champion_id, c.champion_name, p.part, p.n
        from mt_cb_season_presence p join dim_champion c using (champion_key)
        where p.season = ?
        """,
        (season,),
    )


def build_presence(con: duckdb.DuckDBPyConnection, q: Question, window: Window) -> tuple[dict, dict | None]:
    candidates = [
        _share_candidate(
            row["champion_name"], f"/champions/{row['champion_id']}", row["part"], row["n"]
        )
        for row in _presence_rows(con, window.season)
    ]
    return _record_answer(q, window, candidates, "best"), None


def build_champion_win_rate(con: duckdb.DuckDBPyConnection, q: Question, window: Window) -> tuple[dict, dict | None]:
    where, params = _window_filter(window.season)
    rows = _rows(
        con,
        f"""
        select champion_key, champion_id, champion_name, count(*) n, sum(is_winner) part
        from mt_cb_champion_games {where} {"and" if where else "where"} is_winner is not null
        group by 1, 2, 3
        """,
        params,
    )
    candidates = [
        _share_candidate(
            row["champion_name"], f"/champions/{row['champion_id']}", row["part"], row["n"],
            None, "n",
        )
        for row in rows
    ]
    return (
        _record_answer(q, window, candidates, "best"),
        _record_answer(q, window, candidates, "worst"),
    )


def _champion_rows(con: duckdb.DuckDBPyConnection, season: int | None) -> list[dict]:
    where, params = _window_filter(season)
    return _rows(
        con,
        f"""
        select champion_key, champion_id, champion_name, kills, deaths, assists, team_kills
        from mt_cb_champion_games{where}
        """,
        params,
    )


def build_champion_kda(con: duckdb.DuckDBPyConnection, q: Question, window: Window) -> tuple[dict, dict | None]:
    grouped: dict[int, dict] = {}
    for row in _champion_rows(con, window.season):
        entry = grouped.setdefault(
            row["champion_key"],
            {
                "name": row["champion_name"],
                "path": f"/champions/{row['champion_id']}",
                "k": [],
                "d": [],
                "a": [],
                "team_kills": 0,
            },
        )
        entry["k"].append(row["kills"])
        entry["d"].append(row["deaths"])
        entry["a"].append(row["assists"])
        entry["team_kills"] += row["team_kills"] or 0

    candidates = []
    for key in sorted(grouped):
        entry = grouped[key]
        kills = np.array(entry["k"], dtype=float)
        deaths = np.array(entry["d"], dtype=float)
        assists = np.array(entry["a"], dtype=float)
        n = len(kills)
        value = (kills.sum() + assists.sum()) / max(1.0, deaths.sum())
        low, high = _bootstrap_kda(
            kills, deaths, assists, _seed_for(q.id, window.key, str(key))
        )
        kills_sum = int(kills.sum())
        deaths_sum = int(deaths.sum())
        assists_sum = int(assists.sum())
        team_kills = int(entry["team_kills"])
        kp_part = kills_sum + assists_sum
        kp_interval = _wilson_share(kp_part, n, team_kills)
        kp_value = kp_part / team_kills if team_kills else 0.0
        components = {
            "kills": kills_sum,
            "deaths": deaths_sum,
            "assists": assists_sum,
            "kp": (
                f"{_percent_number(kp_value)}% "
                f"(95% CI: {_percent_number(kp_interval['low'])}–"
                f"{_percent_number(kp_interval['high'])}%)"
            ),
        }
        candidates.append(
            _ratio_candidate(
                entry["name"], entry["path"], float(value), n,
                _bootstrap_interval(low, high),
                part=kp_part,
                denominator=team_kills,
                components=components,
            )
        )
    return (
        _record_answer(q, window, candidates, "best"),
        _record_answer(q, window, candidates, "worst"),
    )


def build_unique(con: duckdb.DuckDBPyConnection, q: Question, window: Window) -> tuple[dict, dict | None]:
    where, params = _window_filter(window.season)
    rows = _rows(
        con,
        f"select game_key, champion_key from mt_cb_game_picks{where}",
        params,
    )
    sets: dict[int, set[int]] = {}
    for row in rows:
        sets.setdefault(row["game_key"], set()).add(row["champion_key"])
    if window.season is None:
        game_keys = _rows(con, "select game_key from mt_cb_game_season order by game_key")
    else:
        game_keys = _rows(
            con,
            "select game_key from mt_cb_game_season where season = ? order by game_key",
            (window.season,),
        )
    games = [sets.get(row["game_key"], set()) for row in game_keys]

    champion_count = max((max(game) if game else 0 for game in games), default=0)
    if not games or champion_count == 0:
        return _record_insufficient_top(q, window, []), None
    matrix = np.zeros((champion_count, len(games)), dtype=bool)
    for index, game in enumerate(games):
        for champion in game:
            matrix[champion - 1, index] = True
    rng = np.random.default_rng(_seed_for(q.id, window.key))
    counts = []
    for _ in range(RESAMPLES):
        sample = rng.integers(0, len(games), size=len(games))
        counts.append(int(matrix[:, sample].any(axis=1).sum()))
    counts_array = np.array(counts)
    values, frequencies = np.unique(counts_array, return_counts=True)
    bins = [
        {"key": str(int(value)), "label": str(int(value)), "count": int(frequency)}
        for value, frequency in zip(values, frequencies)
    ]
    low, high = np.percentile(counts_array, [5, 95])
    median = float(np.median(counts_array))
    interval = _interval(float(low), float(high), "simulation-percentile", SIM_LEVEL)
    headline = {
        "text": f"{round(low):,}–{round(high):,} (90% of {RESAMPLES:,} simulations)",
        "value": median,
        "unit": "count",
        "n": RESAMPLES,
        "interval": interval,
    }
    return {
        "end": "best",
        "verdict": "answered",
        "headline": headline,
        "evidence": {
            "metric": q.metric,
            "value": median,
            "part": None,
            "n": RESAMPLES,
            "denominator": None,
            "grain": q.grain,
            "role": None,
        },
        "bins": bins,
        "limits": [_window_limit(window)],
    }, None


def build_teemo(con: duckdb.DuckDBPyConnection, q: Question, window: Window) -> tuple[dict, dict | None]:
    row = _rows(
        con,
        """
        select p.part, p.n from mt_cb_season_presence p join dim_champion c using (champion_key)
        where c.champion_name = 'Teemo' and (p.season = ? or ? is null)
        """,
        (window.season, window.season),
    )
    if not row:
        return _record_insufficient_top(q, window, []), None
    part = sum(item["part"] for item in row)
    n = sum(item["n"] for item in row)
    return _record_share(q, window, part, n, "Teemo"), None


def _player_rows(con: duckdb.DuckDBPyConnection, season: int | None) -> list[dict]:
    where, params = _window_filter(season)
    return _rows(
        con,
        f"""
        select player_key, player_id, player_name, kills, deaths, assists, cs, damage, team_kills
        from mt_cb_player_games{where}
        """,
        params,
    )


def _player_groups(con: duckdb.DuckDBPyConnection, season: int | None) -> dict[int, dict]:
    grouped: dict[int, dict] = {}
    for row in _player_rows(con, season):
        entry = grouped.setdefault(
            row["player_key"],
            {
                "name": row["player_name"],
                "path": f"/players/{row['player_id']}",
                "kills": [],
                "deaths": [],
                "assists": [],
                "cs": [],
                "damage": [],
                "team_kills": 0,
                "kp_part": 0,
                "kp_denominator": 0,
                "kp_n": 0,
            },
        )
        entry["kills"].append(row["kills"])
        entry["deaths"].append(row["deaths"])
        entry["assists"].append(row["assists"])
        entry["cs"].append(row["cs"])
        if row["damage"] is not None:
            entry["damage"].append(row["damage"])
        entry["team_kills"] += row["team_kills"] or 0
        if row["team_kills"] is not None:
            entry["kp_part"] += row["kills"] + row["assists"]
            entry["kp_denominator"] += row["team_kills"]
            entry["kp_n"] += 1
    return grouped


def build_player_kda(con: duckdb.DuckDBPyConnection, q: Question, window: Window) -> tuple[dict, dict | None]:
    candidates = []
    for key, entry in sorted(_player_groups(con, window.season).items()):
        kills = np.array(entry["kills"], dtype=float)
        deaths = np.array(entry["deaths"], dtype=float)
        assists = np.array(entry["assists"], dtype=float)
        n = len(kills)
        value = (kills.sum() + assists.sum()) / max(1.0, deaths.sum())
        low, high = _bootstrap_kda(
            kills, deaths, assists, _seed_for(q.id, window.key, str(key))
        )
        kills_sum = int(kills.sum())
        deaths_sum = int(deaths.sum())
        assists_sum = int(assists.sum())
        team_kills = int(entry["team_kills"])
        kp_part = kills_sum + assists_sum
        kp_interval = _wilson_share(kp_part, n, team_kills)
        kp_value = kp_part / team_kills if team_kills else 0.0
        components = {
            "kills": kills_sum,
            "deaths": deaths_sum,
            "assists": assists_sum,
            "kp": (
                f"{_percent_number(kp_value)}% "
                f"(95% CI: {_percent_number(kp_interval['low'])}–"
                f"{_percent_number(kp_interval['high'])}%)"
            ),
        }
        candidates.append(
            _ratio_candidate(
                entry["name"], entry["path"], float(value), n,
                _bootstrap_interval(low, high),
                part=kp_part,
                denominator=team_kills,
                components=components,
            )
        )
    return _record_answer(q, window, candidates, "best"), None


def build_player_kills(con: duckdb.DuckDBPyConnection, q: Question, window: Window) -> tuple[dict, dict | None]:
    candidates = []
    for key, entry in sorted(_player_groups(con, window.season).items()):
        values = np.array(entry["kills"], dtype=float)
        n = len(values)
        low, high = _bootstrap_means(values, _seed_for(q.id, window.key, str(key)))
        candidates.append(
            _ratio_candidate(
                entry["name"], entry["path"], float(values.mean()), n,
                _bootstrap_interval(low, high),
                components={"kills": int(values.sum())},
            )
        )
    return _record_answer(q, window, candidates, "best"), None


def build_player_kp(con: duckdb.DuckDBPyConnection, q: Question, window: Window) -> tuple[dict, dict | None]:
    candidates = []
    for _key, entry in sorted(_player_groups(con, window.season).items()):
        part = entry["kp_part"]
        denominator = entry["kp_denominator"]
        n = entry["kp_n"]
        if n == 0 or denominator == 0:
            continue
        candidate = _share_candidate(entry["name"], entry["path"], part, n, denominator, "n")
        candidate["components"] = {"team_kills": int(denominator)}
        candidates.append(candidate)
    return _record_answer(q, window, candidates, "best"), None


def build_player_damage(con: duckdb.DuckDBPyConnection, q: Question, window: Window) -> tuple[dict, dict | None]:
    candidates = []
    for key, entry in sorted(_player_groups(con, window.season).items()):
        values = np.array(entry["damage"], dtype=float)
        n = len(values)
        if n == 0:
            continue
        low, high = _bootstrap_means(values, _seed_for(q.id, window.key, str(key)))
        candidates.append(
            _ratio_candidate(
                entry["name"], entry["path"], float(values.mean()), n,
                _bootstrap_interval(low, high),
            )
        )
    return _record_answer(q, window, candidates, "best"), None


def build_threshold(
    con: duckdb.DuckDBPyConnection, q: Question, window: Window, column: str, cutoff: int
) -> tuple[dict, dict | None]:
    if window.season is None:
        sql = f"""select count(*) filter (where {column} >= ?) part, count(*) n from mt_cb_player_games"""
        values_sql = f"select {column} from mt_cb_player_games"
        params = (cutoff,)
        value_params: tuple = ()
    else:
        sql = f"""select count(*) filter (where {column} >= ?) part, count(*) n from mt_cb_player_games where season = ?"""
        values_sql = f"select {column} from mt_cb_player_games where season = ?"
        params = (cutoff, window.season)
        value_params = (window.season,)
    row = _rows(con, sql, params)[0]
    values = [item[column] for item in _rows(con, values_sql, value_params)]

    if column == "kills":
        edges = (0, 5, 10, 15, 20, 25)
        labels = ("0–4", "5–9", "10–14", "15–19", "20–24", "25+")
        marker = {"key": "15–19", "label": "15 kills"}
    else:
        edges = (0, 100, 200, 300, 400, 450, 500)
        labels = ("0–99", "100–199", "200–299", "300–399", "400–449", "450–499", "500+")
        marker = {"key": "450–499", "label": "450 CS"}

    bins = []
    for index, label in enumerate(labels):
        low = edges[index]
        high = edges[index + 1] if index + 1 < len(edges) else None
        count = sum(1 for value in values if value >= low and (high is None or value < high))
        bins.append({"key": label, "label": label, "count": count})

    record = _record_share(q, window, row["part"], row["n"], q.question)
    record["bins"] = bins
    record["marker"] = marker
    return record, None


def _team_rows(con: duckdb.DuckDBPyConnection, season: int | None) -> list[dict]:
    where, params = _window_filter(season)
    return _rows(
        con,
        f"select team_key, team_id, team_name, is_winner, kills, gold from mt_cb_team_games{where}",
        params,
    )


def build_team_win_rate(con: duckdb.DuckDBPyConnection, q: Question, window: Window) -> tuple[dict, dict | None]:
    grouped: dict[int, dict] = {}
    for row in _team_rows(con, window.season):
        if row["is_winner"] is None:
            continue
        entry = grouped.setdefault(
            row["team_key"],
            {"name": row["team_name"], "path": f"/teams/{row['team_id']}", "wins": 0, "n": 0},
        )
        entry["wins"] += row["is_winner"]
        entry["n"] += 1
    candidates = []
    for _key, entry in sorted(grouped.items()):
        candidate = _share_candidate(entry["name"], entry["path"], entry["wins"], entry["n"], None, "n")
        candidate["components"] = {"wins": int(entry["wins"])}
        candidates.append(candidate)
    return (
        _record_answer(q, window, candidates, "best"),
        _record_answer(q, window, candidates, "worst"),
    )


def _team_means(
    con: duckdb.DuckDBPyConnection, q: Question, window: Window, column: str
) -> tuple[dict, dict | None]:
    grouped: dict[int, dict] = {}
    for row in _team_rows(con, window.season):
        value = row[column]
        if value is None:
            continue
        entry = grouped.setdefault(
            row["team_key"],
            {"name": row["team_name"], "path": f"/teams/{row['team_id']}", "values": []},
        )
        entry["values"].append(value)
    candidates = []
    for key, entry in sorted(grouped.items()):
        values = np.array(entry["values"], dtype=float)
        n = len(values)
        low, high = _bootstrap_means(values, _seed_for(q.id, window.key, str(key)))
        candidates.append(
            _ratio_candidate(
                entry["name"], entry["path"], float(values.mean()), n,
                _bootstrap_interval(low, high),
            )
        )
    return _record_answer(q, window, candidates, "best"), None


def build_team_kills(con: duckdb.DuckDBPyConnection, q: Question, window: Window) -> tuple[dict, dict | None]:
    return _team_means(con, q, window, "kills")


def build_team_gold(con: duckdb.DuckDBPyConnection, q: Question, window: Window) -> tuple[dict, dict | None]:
    return _team_means(con, q, window, "gold")


def _durations(con: duckdb.DuckDBPyConnection, season: int | None) -> list[dict]:
    where, params = _window_filter(season)
    return _rows(
        con,
        f"select game_key, duration_seconds, blue_win from mt_cb_game_length{where}",
        params,
    )


def build_game_length(con: duckdb.DuckDBPyConnection, q: Question, window: Window) -> tuple[dict, dict | None]:
    rows = _durations(con, window.season)
    part = sum(1 for row in rows if row["duration_seconds"] <= THIRTY_TWO_MINUTES)
    return _record_share(q, window, part, len(rows), "games at or under 32:00"), None


def build_shortest(con: duckdb.DuckDBPyConnection, q: Question, window: Window) -> tuple[dict, dict | None]:
    rows = _durations(con, window.season)
    durations = np.array([row["duration_seconds"] for row in rows], dtype=float)
    if len(durations) == 0:
        return _record_insufficient_top(q, window, []), None
    threshold = float(np.percentile(durations, SHORTEST_DECILE * 100))
    decile = [row for row in rows if row["duration_seconds"] <= threshold]
    part = sum(int(row["blue_win"] or 0) for row in decile)
    record = _record_share(q, window, part, len(decile), "blue side in the shortest decile")
    record["limits"] = [
        _window_limit(window),
        f"The shortest decile is at or under {int(threshold):,} s in this window; the record holder is a citation, not the answer.",
    ]
    return record, None


def build_mvp(con: duckdb.DuckDBPyConnection, q: Question, window: Window) -> tuple[dict, dict | None]:
    where, params = _window_filter(window.season)
    rows = _rows(
        con,
        f"select role, count(*) n from mt_cb_awards{where} group by 1",
        params,
    )
    counts = {role: 0 for role in ROLES}
    for row in rows:
        counts[row["role"]] = row["n"]
    total = sum(counts.values())
    census = [
        {"name": role, "count": counts[role], "n": total}
        for role in sorted(ROLES, key=lambda role: (-counts[role], ROLES.index(role)))
    ]
    headline = {
        "text": f"Insufficient data: {total:,} Finals MVP awards; the counts are the answer.",
        "value": None,
        "unit": "count",
        "n": total,
        "interval": None,
    }
    return {
        "end": "best",
        "verdict": "insufficient_data",
        "headline": headline,
        "evidence": {
            "metric": q.metric,
            "value": None,
            "part": None,
            "n": total,
            "denominator": total,
            "grain": q.grain,
            "role": None,
        },
        "census": census,
        "limits": [_window_limit(window)],
    }, None


def build_regions(con: duckdb.DuckDBPyConnection, q: Question, window: Window) -> tuple[dict, dict | None]:
    rows = _rows(con, "select metric, value from mt_cb_region_verification")
    values = {row["metric"]: row["value"] for row in rows}
    result = (
        f"{values.get('region values', 0)} region values including the null, "
        f"{values.get('tab labels', 0)} tab labels, "
        f"{values.get('rows with no region', 0)} non-zero registry rows with no region "
        f"plus the unknown member."
    )
    headline = {
        "text": "Not verifiable: the model has no stage column and no region era.",
        "value": None,
        "unit": None,
        "n": 0,
        "interval": None,
    }
    return {
        "end": "best",
        "verdict": "not_verifiable",
        "headline": headline,
        "evidence": {
            "metric": q.metric,
            "value": None,
            "part": None,
            "n": 0,
            "denominator": None,
            "grain": q.grain,
            "role": None,
        },
        "verification": {
            "query": (
                "select count(distinct tab) from dim_match where tab <> '';\n"
                "select coalesce(region, '<null>'), count(*) from dim_team "
                "where team_key <> 0 group by 1 order by 2 desc;"
            ),
            "result_today": result,
            "unblocked_by": (
                "A committed stage-order table per event and a declared region vocabulary "
                "with its era."
            ),
        },
        "limits": [_window_limit(window)],
    }, None


BUILDERS = {
    "presence": build_presence,
    "champion_win_rate": build_champion_win_rate,
    "champion_kda": build_champion_kda,
    "unique": build_unique,
    "teemo": build_teemo,
    "player_kda": build_player_kda,
    "player_kills": build_player_kills,
    "player_kp": build_player_kp,
    "player_damage": build_player_damage,
    "team_win_rate": build_team_win_rate,
    "team_kills": build_team_kills,
    "team_gold": build_team_gold,
    "game_length": build_game_length,
    "shortest": build_shortest,
    "mvp": build_mvp,
    "regions": build_regions,
}


def build_window(
    con: duckdb.DuckDBPyConnection, q: Question, window: Window
) -> tuple[dict, dict | None]:
    if q.kind == "threshold_kills":
        return build_threshold(con, q, window, "kills", 15)
    if q.kind == "threshold_cs":
        return build_threshold(con, q, window, "cs", 450)
    return BUILDERS[q.kind](con, q, window)


# ---------------------------------------------------------------------------
# Series: the chart's buckets. For a top-1 the bucket is the all-window leading
# candidate; for a share it is the share itself; for the count it is the observed
# number of champions in the season. The series never aggregates in the browser.


def _series_candidate(
    con: duckdb.DuckDBPyConnection, q: Question, season: int, key: int, name: str, path: str
) -> dict | None:
    if q.kind == "presence":
        row = _rows(
            con,
            "select part, n from mt_cb_season_presence where season = ? and champion_key = ?",
            (season, key),
        )
        if not row or row[0]["part"] < MIN_N:
            return None
        part, n = row[0]["part"], row[0]["n"]
        return {"value": part / n, "part": part, "n": n, "denominator": n, "interval": _wilson_interval(part, n)}
    if q.kind == "champion_win_rate":
        row = _rows(
            con,
            """
            select count(*) n, sum(is_winner) part from mt_cb_champion_games
            where season = ? and champion_key = ? and is_winner is not null
            """,
            (season, key),
        )
        if not row or row[0]["part"] is None or row[0]["n"] < MIN_N:
            return None
        part, n = row[0]["part"], row[0]["n"]
        return {"value": part / n, "part": part, "n": n, "denominator": n, "interval": _wilson_interval(part, n)}
    if q.kind in ("champion_kda", "player_kda"):
        table = "mt_cb_champion_games" if q.kind == "champion_kda" else "mt_cb_player_games"
        column = "champion_key" if q.kind == "champion_kda" else "player_key"
        rows = _rows(
            con,
            f"select kills, deaths, assists from {table} where season = ? and {column} = ?",
            (season, key),
        )
        if len(rows) < MIN_N:
            return None
        kills = np.array([row["kills"] for row in rows], dtype=float)
        deaths = np.array([row["deaths"] for row in rows], dtype=float)
        assists = np.array([row["assists"] for row in rows], dtype=float)
        value = (kills.sum() + assists.sum()) / max(1.0, deaths.sum())
        low, high = _bootstrap_kda(kills, deaths, assists, _seed_for(q.id, season, str(key)))
        return {"value": float(value), "part": None, "n": len(rows), "denominator": None, "interval": _bootstrap_interval(low, high)}
    if q.kind in ("player_kills", "player_damage"):
        column = "kills" if q.kind == "player_kills" else "damage"
        rows = _rows(
            con,
            f"select {column} from mt_cb_player_games where season = ? and player_key = ? and {column} is not null",
            (season, key),
        )
        if len(rows) < MIN_N:
            return None
        values = np.array([row[column] for row in rows], dtype=float)
        low, high = _bootstrap_means(values, _seed_for(q.id, season, str(key)))
        return {"value": float(values.mean()), "part": None, "n": len(rows), "denominator": None, "interval": _bootstrap_interval(low, high)}
    if q.kind == "player_kp":
        row = _rows(
            con,
            """
            select sum(kills + assists) part, sum(team_kills) denominator, count(*) n
            from mt_cb_player_games
            where season = ? and player_key = ? and team_kills is not null
            """,
            (season, key),
        )
        if not row or row[0]["part"] is None or row[0]["n"] < MIN_N:
            return None
        part, denominator, n = row[0]["part"], row[0]["denominator"], row[0]["n"]
        return {"value": part / denominator if denominator else 0.0, "part": part, "n": n, "denominator": denominator, "interval": _wilson_share(part, n, denominator)}
    if q.kind == "team_win_rate":
        row = _rows(
            con,
            """
            select count(*) n, sum(is_winner) part from mt_cb_team_games
            where season = ? and team_key = ? and is_winner is not null
            """,
            (season, key),
        )
        if not row or row[0]["part"] is None or row[0]["n"] < MIN_N:
            return None
        part, n = row[0]["part"], row[0]["n"]
        return {"value": part / n, "part": part, "n": n, "denominator": n, "interval": _wilson_interval(part, n)}
    if q.kind in ("team_kills", "team_gold"):
        column = "kills" if q.kind == "team_kills" else "gold"
        rows = _rows(
            con,
            f"select {column} from mt_cb_team_games where season = ? and team_key = ? and {column} is not null",
            (season, key),
        )
        if len(rows) < MIN_N:
            return None
        values = np.array([row[column] for row in rows], dtype=float)
        low, high = _bootstrap_means(values, _seed_for(q.id, season, str(key)))
        return {"value": float(values.mean()), "part": None, "n": len(rows), "denominator": None, "interval": _bootstrap_interval(low, high)}
    if q.kind == "shortest":
        rows = _durations(con, season)
        durations = np.array([row["duration_seconds"] for row in rows], dtype=float)
        if len(durations) == 0:
            return None
        threshold = float(np.percentile(durations, SHORTEST_DECILE * 100))
        decile = [row for row in rows if row["duration_seconds"] <= threshold]
        part = sum(int(row["blue_win"] or 0) for row in decile)
        if len(decile) < MIN_N:
            return None
        return {"value": part / len(decile), "part": part, "n": len(decile), "denominator": len(decile), "interval": _wilson_interval(part, len(decile))}
    return None


def build_series(
    con: duckdb.DuckDBPyConnection, q: Question, all_windows: list[Window],
    seasons: list[Window], best_record: dict | None,
) -> list[dict]:
    if q.kind in ("mvp", "regions"):
        return []
    if q.kind == "unique":
        points = []
        for window in seasons:
            row = _rows(
                con,
                "select count(distinct champion_key) value, count(distinct game_key) n "
                "from mt_cb_game_picks where season = ?",
                (window.season,),
            )[0]
            points.append(
                {
                    "bucket": "season",
                    "label": str(window.season),
                    "value": row["value"],
                    "part": None,
                    "n": row["n"],
                    "denominator": None,
                    "interval": None,
                }
            )
        return points
    if q.kind in ("presence", "champion_win_rate", "champion_kda", "player_kda", "player_kills", "player_kp", "player_damage", "team_win_rate", "team_kills", "team_gold"):
        if best_record is None or best_record["verdict"] != "answered" or "candidates" not in best_record:
            return []
        first = best_record["candidates"][0]
        key = _candidate_key(con, q, first["path"])
        if key is None:
            return []
        points = []
        for window in seasons:
            point = _series_candidate(con, q, window.season, key, first["name"], first["path"])
            if point is None:
                continue
            points.append(
                {
                    "bucket": "season",
                    "label": str(window.season),
                    "value": point["value"],
                    "part": point["part"],
                    "n": point["n"],
                    "denominator": point["denominator"],
                    "interval": point["interval"],
                }
            )
        return points
    # A single share across seasons.
    points = []
    for window in seasons:
        if q.kind == "teemo":
            row = _rows(
                con,
                "select p.part, p.n from mt_cb_season_presence p join dim_champion c using (champion_key) "
                "where c.champion_name = 'Teemo' and p.season = ?",
                (window.season,),
            )
            if not row:
                continue
            part, n = row[0]["part"], row[0]["n"]
        elif q.kind == "game_length":
            rows = _durations(con, window.season)
            part = sum(1 for row in rows if row["duration_seconds"] <= THIRTY_TWO_MINUTES)
            n = len(rows)
        elif q.kind in ("threshold_kills", "threshold_cs"):
            column, cutoff = ("kills", 15) if q.kind == "threshold_kills" else ("cs", 450)
            row = _rows(
                con,
                f"select count(*) filter (where {column} >= ?) part, count(*) n "
                f"from mt_cb_player_games where season = ?",
                (cutoff, window.season),
            )[0]
            part, n = row["part"], row["n"]
        elif q.kind == "shortest":
            rows = _durations(con, window.season)
            durations = np.array([row["duration_seconds"] for row in rows], dtype=float)
            if len(durations) == 0:
                continue
            threshold = float(np.percentile(durations, SHORTEST_DECILE * 100))
            decile = [row for row in rows if row["duration_seconds"] <= threshold]
            part = sum(int(row["blue_win"] or 0) for row in decile)
            n = len(decile)
        else:
            continue
        if part < MIN_N:
            continue
        points.append(
            {
                "bucket": "season",
                "label": str(window.season),
                "value": part / n if n else 0.0,
                "part": part,
                "n": n,
                "denominator": n,
                "interval": _wilson_interval(part, n),
            }
        )
    return points


def _candidate_key(con: duckdb.DuckDBPyConnection, q: Question, path: str) -> int | None:
    identifier = path.rstrip("/").split("/")[-1]
    if q.kind in ("presence", "champion_win_rate", "champion_kda"):
        row = _rows(con, "select champion_key from dim_champion where champion_id = ?", (identifier,))
        return row[0]["champion_key"] if row else None
    if q.kind in ("player_kda", "player_kills", "player_kp", "player_damage"):
        row = _rows(con, "select player_key from dim_player where player_id = ?", (identifier,))
        return row[0]["player_key"] if row else None
    if q.kind in ("team_win_rate", "team_kills", "team_gold"):
        row = _rows(con, "select team_key from dim_team where team_id = ?", (identifier,))
        return row[0]["team_key"] if row else None
    return None


# ---------------------------------------------------------------------------
# The artifact writer


def _materialise(con: duckdb.DuckDBPyConnection) -> None:
    """Freeze the expensive views once; the builders query them many times."""
    for view in (
        "cb_corpus_window", "cb_game_season", "cb_game_presence", "cb_game_picks",
        "cb_season_presence", "cb_champion_games", "cb_player_games", "cb_team_games",
        "cb_game_length", "cb_awards", "cb_region_verification",
    ):
        con.execute(f"create or replace temp table mt_{view} as select * from {view}")


def dumps(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"


def build(con: duckdb.DuckDBPyConnection, pin_sha: str) -> dict[str, str]:
    """Return artifact file name -> serialised JSON text."""
    _materialise(con)
    all_windows = windows(con)
    season_windows = [window for window in all_windows if window.season is not None]
    thresholds = {
        "min_n": MIN_N,
        "top_k": TOP_K,
        "top_max": TOP_MAX,
        "resamples": RESAMPLES,
        "seed": SEED,
    }
    rendered: dict[str, str] = {}
    cards: list[dict] = []

    for q in QUESTIONS:
        windows_out = []
        default_record = None
        for window in (all_windows if q.kind != "regions" else all_windows[:1]):
            best, worst = build_window(con, q, window)
            records = {"best": best, "worst": worst if "worst" in q.ends else None}
            entry = _window_artifact(window)
            entry["records"] = records
            windows_out.append(entry)
            if window.key == "all":
                default_record = best
        series = build_series(con, q, all_windows, season_windows, default_record)
        artifact = {
            "id": q.id,
            "class": q.cls,
            "family": q.family,
            "question": q.question,
            "thresholds": thresholds,
            "source": {
                "view": q.view,
                "artifact": f"almanac-{q.id}.json",
                "sha256": pin_sha,
            },
            "limits": list(q.limits),
            "windows": windows_out,
            "series": series,
        }
        name = f"almanac-{q.id}.json"
        rendered[name] = dumps(artifact)
        cards.append(
            {
                "id": q.id,
                "class": q.cls,
                "family": q.family,
                "question": q.question,
                "verdict": default_record["verdict"] if default_record else "not_verifiable",
                "headline": default_record["headline"] if default_record else {
                    "text": "Not verifiable", "value": None, "unit": None, "n": 0, "interval": None
                },
                "artifact": name,
            }
        )

    rendered["almanac.json"] = dumps({"thresholds": thresholds, "cards": cards})
    return rendered
