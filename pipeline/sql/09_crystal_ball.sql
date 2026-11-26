-- The Almanac's views: the season spine, and the finest grain each question needs.
--
-- The season is derived from Worlds, not read from dim_event.year. Season N runs
-- from the day after Worlds N-1's final to Worlds N's final; season 2011 starts at
-- the first game of the corpus. The pin's one exception is IPL 5 (29 Nov - 3 Dec
-- 2012), which belongs to season 2013 because Worlds 2012 ended on 14 October.
--
-- Every view publishes the grain its question needs and nothing coarser: a game is
-- one row, a champion-game is one player row on a champion, a side is one team's row
-- in a game. The Python step aggregates and computes intervals; it never re-derives
-- the grain.

-- One row per event, with the dates the season rule needs. The two admitted events
-- with no game keep their date_start, so every event has a season.
create or replace view cb_event_span as
select
  e.event_key,
  e.event_name,
  e.league,
  e.year,
  coalesce(min(g.date_time_utc)::date, cast(e.date_start as date)) as date_from,
  coalesce(max(g.date_time_utc)::date, cast(e.date_start as date)) as date_to,
  count(g.game_key) as games
from dim_event e
left join game_facts g using (event_key)
where e.event_key <> 0
group by e.event_key, e.event_name, e.league, e.year, e.date_start;

-- The final of each Worlds edition: the date that closes its season.
create or replace view cb_worlds_final as
select year, max(date_to) as final_date
from cb_event_span
where league = 'World Championship'
group by year;

-- The season an event belongs to: the first Worlds final on or after its last game.
-- An event after the last Worlds in the corpus keeps the last season; none does at
-- this pin.
create or replace view cb_event_season as
select
  s.*,
  coalesce(
    (select min(w.year) from cb_worlds_final w where w.final_date >= s.date_to),
    (select max(year) from cb_worlds_final)
  ) as season
from cb_event_span s;

-- One row per season: the window, its games and the events that played one.
create or replace view cb_season_window as
select
  season,
  min(date_from) filter (where games > 0) as date_from,
  max(date_to) filter (where games > 0) as date_to,
  max(date_to) filter (where games > 0) as cut_date,
  sum(games) as games,
  count(distinct event_key) filter (where games > 0) as events
from cb_event_season
group by season;

-- The patches a season was played on, with the games each one governs. Ordered by
-- the first game they governed, because patch_key is a lexical natural key (9.8 sorts
-- after 9.19) and a reader wants the order the season was played in. patch_key 0 is
-- the model's unknown member and is named 'unknown' rather than dropped: 279 games
-- state no patch, and a window must not silently exclude them.
create or replace view cb_season_patches as
select
  s.season,
  coalesce(nullif(p.patch, ''), 'unknown') as patch,
  min(g.date_time_utc) as first_game,
  count(distinct g.game_key) as games
from cb_event_season s
join game_facts g using (event_key)
join dim_patch p on p.patch_key = g.patch_key
group by 1, 2;

-- The corpus as one window, for the 'all' key.
create or replace view cb_corpus_window as
select
  min(date_time_utc)::date as date_from,
  max(date_time_utc)::date as date_to,
  max(date_time_utc)::date as cut_date,
  count(*) as games,
  count(distinct event_key) as events
from game_facts;

-- Every game with its season, once. A game measure repeated on two side rows is
-- read here, not in fact_game_side.
create or replace view cb_game_season as
select g.game_key, s.season, g.event_key, g.duration_seconds
from game_facts g
join cb_event_season s using (event_key);

-- Presence: a champion once per game, whether it arrived as a pick or a ban.
-- Picks come from the player rows and bans from the draft slots; they disagree by
-- two rows and by three games, and the union is the rule.
create or replace view cb_game_presence as
select distinct game_key, season, champion_key
from (
  select g.game_key, s.season, pg.champion_key
  from fact_player_game pg
  join cb_event_season s using (event_key)
  join game_facts g using (game_key)
  where pg.champion_key <> 0
  union all
  select g.game_key, s.season, d.champion_key
  from fact_draft_slot d
  join cb_event_season s using (event_key)
  join game_facts g using (game_key)
  where d.phase = 'ban' and d.champion_key <> 0
) slots;

-- The picks alone, for the unique-champions question: a ban is not a picked champion.
create or replace view cb_game_picks as
select distinct g.game_key, s.season, pg.champion_key
from fact_player_game pg
join cb_event_season s using (event_key)
join game_facts g using (game_key)
where pg.champion_key <> 0 and pg.player_key <> 0;

-- Presence per season and champion. The denominator is the games on or after the
-- champion's release date, never the season's games: a champion released in the
-- middle of a season was not eligible for the earlier games. A zero-presence
-- champion is not a candidate and is left out of the top-K.
create or replace view cb_season_presence as
with eligible as (
  select g.season, c.champion_key, count(*) as n
  from cb_game_season g
  join game_facts gg using (game_key)
  cross join dim_champion c
  where c.champion_key <> 0
    and (
      nullif(cast(c.release_date as varchar), '') is null
      or gg.date_time_utc::date >= cast(nullif(cast(c.release_date as varchar), '') as date)
    )
  group by 1, 2
),
present as (
  select season, champion_key, count(*) as part
  from cb_game_presence
  group by 1, 2
)
select e.season, e.champion_key, e.n, coalesce(p.part, 0) as part
from eligible e
left join present p using (season, champion_key);

-- One row per player row on a champion, with the side's kills and result. The grain
-- is the champion-game; KDA, win rate and kill participation are aggregates over it.
create or replace view cb_champion_games as
select
  pg.champion_key,
  c.champion_id,
  c.champion_name,
  s.season,
  pg.game_key,
  pg.side,
  pg.kills,
  pg.deaths,
  pg.assists,
  ps.kills as team_kills,
  ps.is_winner
from fact_player_game pg
join cb_event_season s using (event_key)
join dim_champion c using (champion_key)
join fact_game_side ps on ps.game_key = pg.game_key and ps.side = pg.side
where pg.champion_key <> 0;

-- One row per player-game, with the team's kills on the same side.
create or replace view cb_player_games as
select
  pg.player_key,
  p.player_id,
  p.player_name,
  s.season,
  pg.game_key,
  pg.side,
  pg.kills,
  pg.deaths,
  pg.assists,
  pg.cs,
  pg.damage,
  ps.kills as team_kills
from fact_player_game pg
join cb_event_season s using (event_key)
join dim_player p using (player_key)
join fact_game_side ps on ps.game_key = pg.game_key and ps.side = pg.side
where pg.player_key <> 0;

-- One row per team's side in a game. Kills and gold are null when the source states
-- none, and the denominator is the rows that state the measure.
create or replace view cb_team_games as
select
  f.team_key,
  t.team_id,
  t.team_name,
  s.season,
  f.game_key,
  f.is_winner,
  f.kills,
  f.gold
from fact_game_side f
join cb_event_season s using (event_key)
join dim_team t using (team_key)
where f.team_key <> 0;

-- A game's length, once. The measure is repeated on both side rows; this view reads
-- game_facts and keeps one row per game.
create or replace view cb_game_length as
select s.season, s.game_key, s.duration_seconds, g.blue_win
from cb_game_season s
join game_facts g using (game_key)
where s.duration_seconds is not null;

-- The Finals MVP awards at award grain, each with the role the player actually
-- played at that event. The join to fact_player_game fans out to every game the
-- player played (208 rows for eleven awards); the row_number picks the role with
-- the most games and breaks the tie in the canonical role order.
create or replace view cb_awards as
with award as (
  select player_key, event_key, title
  from fact_player_honour
  where title = 'Finals MVP'
),
roles as (
  select
    a.player_key,
    a.event_key,
    a.title,
    pg.role,
    count(*) as games,
    row_number() over (
      partition by a.player_key, a.event_key
      order by count(*) desc, role_rank(pg.role)
    ) as rn
  from award a
  join fact_player_game pg on pg.player_key = a.player_key and pg.event_key = a.event_key
  group by 1, 2, 3, 4
)
select
  r.player_key,
  p.player_id,
  p.player_name,
  r.event_key,
  e.event_name,
  s.season,
  r.title,
  r.role
from roles r
join dim_player p using (player_key)
join dim_event e using (event_key)
join cb_event_season s using (event_key)
where r.rn = 1;

-- The two colleagues the region question cannot answer without: a stage ladder and
-- a region era. The view is the query's result today, not a claim about it.
create or replace view cb_region_verification as
select 'region values' as metric, count(distinct coalesce(region, '<null>')) as value from dim_team where team_key <> 0
union all
select 'tab labels', count(distinct tab) from dim_match where tab <> ''
union all
select 'rows with no region', count(*) from dim_team where team_key <> 0 and (region is null or region = '')
union all
select 'unknown-member rows with no region', count(*) from dim_team where team_key = 0 and (region is null or region = '');
