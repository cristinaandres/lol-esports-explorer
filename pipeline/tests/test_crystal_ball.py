"""The Almanac's seams: the season spine, the intervals, and the grain traps.

These run against the pinned model through the real SQL, because every claim here is
about the corpus rather than about a fixture. The build itself is proved by
`npm run data:check`; the cases below are the ones that would survive a rebuild with
the wrong answer.
"""

from __future__ import annotations

import pathlib
import sys

import pytest

PIPELINE_DIR = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PIPELINE_DIR))

import build  # noqa: E402
import crystal_ball  # noqa: E402


@pytest.fixture(scope="module")
def con():
    connection = build.connect()
    crystal_ball._materialise(connection)
    yield connection
    connection.close()


def scalar(con, sql: str, params: tuple = ()):
    return con.execute(sql, params).fetchone()[0]


def test_the_season_ends_at_worlds(con) -> None:
    windows = crystal_ball.windows(con)
    assert [window.key for window in windows][:2] == ["all", "season:2011"]
    assert len(windows) == 17
    assert [window.season for window in windows[1:]] == list(range(2011, 2027))

    # The pin's one exception: IPL 5 is a 2012 event in season 2013.
    assert scalar(con, "select season from cb_event_season where event_name = 'IPL 5'") == 2013
    assert scalar(con, "select count(distinct season) from cb_event_season where games > 0") == 16
    assert scalar(con, "select count(*) from cb_event_season where games > 0") == 52

    season_2025 = next(window for window in windows if window.season == 2025)
    assert season_2025.games == 232
    assert season_2025.date_from == "2025-03-10"
    assert season_2025.cut_date == "2025-11-09"
    assert season_2025.patches == ["25.05", "25.13", "25.2"]


def test_wilson_includes_the_extremes() -> None:
    low, high = crystal_ball.wilson(0, 4)
    assert low == 0.0
    assert high == pytest.approx(0.49, abs=0.01)

    low, high = crystal_ball.wilson(4, 4)
    assert low == pytest.approx(0.51, abs=0.01)
    assert high == 1.0

    low, high = crystal_ball.wilson(74, 84)
    assert low == pytest.approx(0.795, abs=0.005)
    assert high == pytest.approx(0.936, abs=0.005)

    assert crystal_ball.wilson(0, 0) == (0.0, 1.0)


def test_presence_is_pick_union_ban_once_per_game(con) -> None:
    assert scalar(
        con,
        "select count(*) from (select game_key, champion_key from cb_game_presence group by 1, 2 having count(*) > 1)",
    ) == 0

    # Game 2060 has the same two champions on both sides (blind pick). Presence counts
    # each champion once, while the player rows state four picks.
    picks = scalar(con, "select count(*) from fact_player_game where game_key = 2060 and champion_key in (56, 147)")
    once = scalar(con, "select count(*) from cb_game_presence where game_key = 2060 and champion_key in (56, 147)")
    assert picks == 4
    assert once == 2


def test_a_game_length_is_one_game(con) -> None:
    games, fast = con.execute(
        "select count(*), count(*) filter (where duration_seconds <= 1920) from cb_game_length"
    ).fetchone()
    assert (games, fast) == (3084, 1513)


def test_damage_reports_the_rows_that_state_it(con) -> None:
    stated, rows = con.execute(
        "select count(damage), count(*) from cb_player_games"
    ).fetchone()
    assert (stated, rows) == (15870, 30910)


def test_the_awards_are_one_row_per_award(con) -> None:
    awards, players, events = con.execute(
        "select count(*), count(distinct player_key), count(distinct event_key) from cb_awards"
    ).fetchone()
    assert (awards, players, events) == (11, 9, 11)

    fanout = scalar(
        con,
        "select count(*) from fact_player_honour h join fact_player_game g "
        "on g.player_key = h.player_key and g.event_key = h.event_key "
        "where h.title = 'Finals MVP'",
    )
    assert fanout == 208


def test_teemo_is_a_census_without_an_interval(con) -> None:
    question = next(q for q in crystal_ball.QUESTIONS if q.id == "teemo-picked")
    window = next(window for window in crystal_ball.windows(con) if window.key == "all")
    best, _ = crystal_ball.build_window(con, question, window)

    assert best["verdict"] == "insufficient_data"
    assert best["headline"]["interval"] is None
    assert best["census"] == [{"name": "Teemo", "count": 4, "n": 3091}]
    assert "4 of 3,091" in best["headline"]["text"]


def test_the_simulation_is_a_ninety_percent_range(con) -> None:
    question = next(q for q in crystal_ball.QUESTIONS if q.id == "unique-champions")
    window = next(window for window in crystal_ball.windows(con) if window.season == 2011)
    best, _ = crystal_ball.build_window(con, question, window)

    assert best["verdict"] == "answered"
    assert best["headline"]["interval"]["method"] == "simulation-percentile"
    assert best["headline"]["interval"]["level"] == 0.9
    assert best["headline"]["n"] == 10_000


def test_a_record_is_deterministic(con) -> None:
    question = next(q for q in crystal_ball.QUESTIONS if q.id == "champion-kda")
    window = next(window for window in crystal_ball.windows(con) if window.season == 2025)
    first, _ = crystal_ball.build_window(con, question, window)
    second, _ = crystal_ball.build_window(con, question, window)
    assert crystal_ball.dumps(first) == crystal_ball.dumps(second)


def test_the_reference_sentence_matches_the_contract() -> None:
    share = {
        "text": "",
        "value": 0.638,
        "unit": "share",
        "n": 232,
        "interval": {"level": 0.95, "low": 0.574, "high": 0.697, "method": "wilson"},
    }
    assert crystal_ball.format_answer(share, "answered") == "64% (95% CI: 57–70%, n=232)"

    ratio = {
        "text": "",
        "value": 8.441176470588236,
        "unit": "kda",
        "n": 21,
        "interval": {
            "level": 0.95, "low": 5.24986111, "high": 14.95243506, "method": "bootstrap-percentile"
        },
    }
    assert crystal_ball.format_answer(ratio, "answered") == "8.44 (95% CI: 5.25–14.95, n=21)"

    count = {
        "text": "",
        "value": 70,
        "unit": "count",
        "n": 10_000,
        "interval": {"level": 0.9, "low": 61, "high": 79, "method": "simulation-percentile"},
    }
    assert crystal_ball.format_answer(count, "answered") == "61–79 (90% of 10,000 simulations)"


def test_the_win_rate_threshold_is_picks_not_wins(con) -> None:
    question = next(q for q in crystal_ball.QUESTIONS if q.id == "champion-win-rate")
    window = next(window for window in crystal_ball.windows(con) if window.season == 2025)
    best, _ = crystal_ball.build_window(con, question, window)

    assert all(candidate["n"] >= crystal_ball.MIN_N for candidate in best["candidates"])
    assert all(row["count"] < crystal_ball.MIN_N for row in best["census"])

    # Thirty picks with fifteen wins is a published rate; nineteen picks is not.
    assert crystal_ball._share_candidate("x", "/champions/x", 15, 30, None, "n")["eligible"]
    assert not crystal_ball._share_candidate("y", "/champions/y", 15, 19, None, "n")["eligible"]


def test_the_champion_kda_carries_its_components(con) -> None:
    question = next(q for q in crystal_ball.QUESTIONS if q.id == "champion-kda")
    window = next(window for window in crystal_ball.windows(con) if window.season == 2025)
    best, _ = crystal_ball.build_window(con, question, window)

    for candidate in best["candidates"]:
        components = candidate["components"]
        assert set(components) == {"kills", "deaths", "assists", "kp"}
        value = (components["kills"] + components["assists"]) / max(1, components["deaths"])
        assert value == pytest.approx(candidate["metric"], rel=1e-9)
        assert "95% CI" in components["kp"]

    senna = next(candidate for candidate in best["candidates"] if candidate["name"] == "Senna")
    assert senna["n"] == 21
    assert senna["components"]["kills"] == 79
    assert senna["components"]["deaths"] == 34
    assert senna["components"]["assists"] == 208


def test_the_unique_simulation_keeps_its_bins(con) -> None:
    question = next(q for q in crystal_ball.QUESTIONS if q.id == "unique-champions")
    window = next(window for window in crystal_ball.windows(con) if window.season == 2025)
    best, _ = crystal_ball.build_window(con, question, window)

    assert best["headline"]["n"] == crystal_ball.RESAMPLES
    assert best["headline"]["interval"]["level"] == 0.9
    assert sum(bin_["count"] for bin_ in best["bins"]) == crystal_ball.RESAMPLES
    assert all(int(bin_["key"]) == int(bin_["label"]) for bin_ in best["bins"])
