-- Semantic views over the pinned dimensional model in data/model/.
--
-- These files are plain DuckDB SQL and run as-is, from the repository root:
--   duckdb -c ".read pipeline/sql/01_semantic_views.sql"
--   duckdb -c "select * from era_summary;"
--
-- Keeping them runnable by hand is deliberate: an analyst must be able to
-- reproduce any number the site shows without going through the build script.

-- Timestamp and date columns are read as ISO-8601 text rather than as DuckDB
-- temporal types. The model defines those columns as text ("YYYY-MM-DD" and
-- "YYYY-MM-DDTHH:MM:SSZ"), the site renders them verbatim, and a timestamp
-- round-tripped through a timezone-aware type would reintroduce a timezone the
-- source never stated.
create or replace view dim_event as
  select * replace (cast(date_start as varchar) as date_start)
  from read_csv('data/model/dim_event.csv', header = true);
create or replace view dim_match as
  select * replace (cast(date_time_utc as varchar) as date_time_utc)
  from read_csv('data/model/dim_match.csv', header = true);
create or replace view dim_game as
  select * replace (cast(date_time_utc as varchar) as date_time_utc)
  from read_csv('data/model/dim_game.csv', header = true);
create or replace view dim_team as
  select * from read_csv('data/model/dim_team.csv', header = true);
create or replace view dim_player as
  select * from read_csv('data/model/dim_player.csv', header = true);
create or replace view dim_champion as
  select * from read_csv('data/model/dim_champion.csv', header = true);
create or replace view dim_patch as
  select * from read_csv('data/model/dim_patch.csv', header = true);
create or replace view dim_date as
  select * replace (cast(date as varchar) as date)
  from read_csv('data/model/dim_date.csv', header = true);
create or replace view fact_game_side as
  select * from read_csv('data/model/fact_game_side.csv', header = true);
create or replace view fact_player_game as
  select * from read_csv('data/model/fact_player_game.csv', header = true);
create or replace view fact_draft_slot as
  select * from read_csv('data/model/fact_draft_slot.csv', header = true);

-- One row per game, with the question "who won and on which side" already
-- answered. Both sides are pivoted onto the game row because every page needs
-- the pair together: a scoreboard without the opponent is not a scoreboard.
--
-- A game whose series is unknown carries match_key 0; it is kept, not dropped,
-- so the 42 series-less games stay reachable from the event page.
create or replace view game_facts as
select
  g.game_key,
  g.game_id,
  g.game_name,
  g.date_time_utc,
  g.era,
  g.team_stats_coverage,
  g.draft_coverage,
  g.player_stats_coverage,
  g.draft_fidelity,
  g.draft_switched_sides,
  f.event_key,
  f.match_key,
  f.patch_key,
  f.date_key,
  blue.team_key            as blue_team_key,
  red.team_key             as red_team_key,
  blue.duration_seconds    as duration_seconds,
  blue.is_winner           as blue_win,
  blue.kills               as blue_kills,
  red.kills                as red_kills,
  blue.gold                as blue_gold,
  red.gold                 as red_gold
from dim_game g
left join (select distinct game_key, event_key, match_key, patch_key, date_key
           from fact_game_side) f on f.game_key = g.game_key
left join fact_game_side blue on blue.game_key = g.game_key and blue.side = 'blue'
left join fact_game_side red  on red.game_key  = g.game_key and red.side  = 'red'
-- The unknown member (key 0) is a row in every dimension so an absent reference
-- has somewhere to point. It is not a game, and counting it would put one
-- phantom game in the headline figure.
where g.game_key <> 0;
