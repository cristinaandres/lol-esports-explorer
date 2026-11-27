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
        assert set(components) == {
            "kills", "deaths", "assists", "team_kills", "kp", "kp_low", "kp_high", "kp_n"
        }
        value = (components["kills"] + components["assists"]) / max(1, components["deaths"])
        assert value == pytest.approx(candidate["metric"], rel=1e-9)
        # The share, its interval, its denominator and its sample are numbers the page
        # prints; a sentence would be formatted here and could not be checked.
        assert 0.0 <= components["kp_low"] <= components["kp"] <= components["kp_high"] <= 1.0
        assert 0 < components["kp_n"] <= candidate["n"]

    senna = next(candidate for candidate in best["candidates"] if candidate["name"] == "Senna")
    assert senna["n"] == 21
    assert senna["components"]["kills"] == 79
    assert senna["components"]["deaths"] == 34
    assert senna["components"]["assists"] == 208


def test_kill_participation_is_measured_on_the_games_that_state_it(con) -> None:
    """The numerator, the denominator and the sample are the same games.

    Side kills are stated on 5,624 of 6,182 rows, so summing the numerator over every
    row against a denominator over the stated ones once published shares above 100%
    (Janna, 111% at the pin) and a fabricated 0% in the seasons that state none.
    """
    question = next(q for q in crystal_ball.QUESTIONS if q.id == "champion-kda")
    windows = {window.key: window for window in crystal_ball.windows(con)}

    best, _ = crystal_ball.build_window(con, question, windows["all"])
    for candidate in best["candidates"]:
        components = candidate["components"]
        if components["kp"] is None:
            assert components["team_kills"] is None
            assert components["kp_n"] == 0
            continue
        assert 0.0 <= components["kp"] <= 1.0
        assert components["kp_n"] <= candidate["n"]

    # Season 2012 states no side kills at all: the card carries no share rather than 0%.
    early, _ = crystal_ball.build_window(con, question, windows["season:2012"])
    assert early["candidates"]
    assert all(candidate["components"]["kp"] is None for candidate in early["candidates"])


def test_the_threshold_census_names_the_measure(con) -> None:
    question = next(q for q in crystal_ball.QUESTIONS if q.id == "player-cs-threshold")
    window = next(window for window in crystal_ball.windows(con) if window.season == 2015)
    best, _ = crystal_ball.build_window(con, question, window)

    assert best["verdict"] == "insufficient_data"
    assert best["census"] == [
        {"name": "player-games with 450 CS", "count": 11, "n": 1200}
    ]


def test_the_unique_simulation_keeps_its_bins(con) -> None:
    question = next(q for q in crystal_ball.QUESTIONS if q.id == "unique-champions")
    window = next(window for window in crystal_ball.windows(con) if window.season == 2025)
    best, _ = crystal_ball.build_window(con, question, window)

    assert best["headline"]["n"] == crystal_ball.RESAMPLES
    assert best["headline"]["interval"]["level"] == 0.9
    assert sum(bin_["count"] for bin_ in best["bins"]) == crystal_ball.RESAMPLES
    assert all(int(bin_["key"]) == int(bin_["label"]) for bin_ in best["bins"])


def test_player_kills_carries_the_total(con) -> None:
    question = next(q for q in crystal_ball.QUESTIONS if q.id == "player-kills")
    window = next(window for window in crystal_ball.windows(con) if window.key == "all")
    best, _ = crystal_ball.build_window(con, question, window)

    first = best["candidates"][0]
    assert first["components"]["kills"] / first["n"] == pytest.approx(first["metric"], rel=1e-9)


def test_player_kill_participation_carries_the_team_kills(con) -> None:
    question = next(q for q in crystal_ball.QUESTIONS if q.id == "player-kill-participation")
    window = next(window for window in crystal_ball.windows(con) if window.key == "all")
    best, _ = crystal_ball.build_window(con, question, window)

    first = best["candidates"][0]
    assert first["components"]["team_kills"] > 0
    assert first["part"] / first["components"]["team_kills"] == pytest.approx(
        first["metric"], rel=1e-9
    )


def test_the_threshold_distributions_mark_their_line(con) -> None:
    kills_question = next(q for q in crystal_ball.QUESTIONS if q.id == "player-kills-threshold")
    cs_question = next(q for q in crystal_ball.QUESTIONS if q.id == "player-cs-threshold")
    window = next(window for window in crystal_ball.windows(con) if window.key == "all")
    kills, _ = crystal_ball.build_window(con, kills_question, window)
    cs, _ = crystal_ball.build_window(con, cs_question, window)

    assert kills["marker"] == {"key": "15–19", "label": "15 kills"}
    assert sum(bin_["count"] for bin_ in kills["bins"]) == kills["headline"]["n"] == 30_910
    assert sum(
        bin_["count"] for bin_ in kills["bins"] if bin_["key"] in {"15–19", "20–24", "25+"}
    ) == 49

    assert cs["marker"] == {"key": "450–499", "label": "450 CS"}
    assert sum(
        bin_["count"] for bin_ in cs["bins"] if bin_["key"] in {"450–499", "500+"}
    ) == 401


def test_team_win_rate_carries_wins(con) -> None:
    question = next(q for q in crystal_ball.QUESTIONS if q.id == "team-win-rate")
    window = next(window for window in crystal_ball.windows(con) if window.key == "all")
    best, _ = crystal_ball.build_window(con, question, window)

    first = best["candidates"][0]
    assert first["components"]["wins"] / first["n"] == pytest.approx(first["metric"], rel=1e-9)


def test_team_measures_use_the_rows_that_state_them(con) -> None:
    window = next(window for window in crystal_ball.windows(con) if window.key == "all")
    for question_id, column in (("team-kills", "kills"), ("team-gold", "gold")):
        question = next(q for q in crystal_ball.QUESTIONS if q.id == question_id)
        best, _ = crystal_ball.build_window(con, question, window)
        first = best["candidates"][0]
        identifier = first["path"].rstrip("/").split("/")[-1]
        stated, total = con.execute(
            f"select count({column}), sum({column}) from mt_cb_team_games where team_id = ?",
            (identifier,),
        ).fetchone()
        assert first["n"] == stated
        assert first["metric"] == pytest.approx(total / stated, rel=1e-9)


def test_the_game_length_distribution_marks_32(con) -> None:
    question = next(q for q in crystal_ball.QUESTIONS if q.id == "game-length-32")
    window = next(window for window in crystal_ball.windows(con) if window.key == "all")
    best, _ = crystal_ball.build_window(con, question, window)

    assert best["marker"] == {"key": "32:01–34:59", "label": "32:00"}
    assert sum(bin_["count"] for bin_ in best["bins"]) == 3_084
    assert sum(
        bin_["count"] for bin_ in best["bins"] if bin_["key"] in {"≤ 24:59", "25:00–29:59", "30:00–32:00"}
    ) == 1_513


def test_the_shortest_game_cites_its_holder(con) -> None:
    question = next(q for q in crystal_ball.QUESTIONS if q.id == "shortest-game")
    window = next(window for window in crystal_ball.windows(con) if window.key == "all")
    best, _ = crystal_ball.build_window(con, question, window)

    assert best["citation"]["path"] == "/games/gm-e8b4d3c2a610"
    assert best["citation"]["detail"] == "961 s"
    assert "Invictus Gaming vs T1" in best["citation"]["label"]
    assert best["census"] == [
        {"name": "Blue side", "count": 184, "n": 309},
        {"name": "Red side", "count": 125, "n": 309},
    ]
    assert best["marker"]["key"] == "25:34–28:00"
    assert sum(bin_["count"] for bin_ in best["bins"][:4]) == 309
