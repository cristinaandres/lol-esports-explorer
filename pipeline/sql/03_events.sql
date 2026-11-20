-- One row per event, for the second level of the site.
--
-- An event can in principle span two eras (a qualifier played in March and a
-- final in November); the era list is therefore aggregated rather than picked,
-- so the page can say "elemental-drakes" or "elemental-drakes + chemtech-withdrawn"
-- without the SQL choosing a winner.

-- The source's `league` string is not stable: the Leaguepedia page for the
-- 2018 Rift Rivals editions is titled "Rift Rivals 2017 ...", so reading it as a
-- competition puts a 2018 event in 2017. This view is the canonical competition
-- the site filters and displays on, and the raw string stays available for
-- provenance.
create or replace view competition_of as
select
  event_key,
  league,
  case
    when league = 'World Championship'          then 'Worlds'
    when league = 'Mid-Season Invitational'     then 'MSI'
    when league = 'Mid-Season Cup 2020'         then 'Mid-Season Cup'
    when league = 'Intel Extreme Masters'       then 'IEM'
    when league like 'Rift Rivals%'             then 'Rift Rivals'
    when league = 'Esports World Cup'           then 'Esports World Cup'
    when league = 'First Stand'                 then 'First Stand'
    when league = 'IGN Pro League'              then 'IPL'
    when league = 'World Cyber Games'           then 'WCG'
    when league = '' or league is null          then 'Unknown'
    else league
  end as competition
from dim_event;

-- Series metadata. The event page needs the format (best-of) and the series name,
-- and the series route needs a natural id: match_key is build-local and would
-- break every shared link on the next rebuild, so the route uses match_id.
create or replace view match_rows as
select
  match_key,
  match_id,
  event_key,
  match_name,
  date_time_utc,
  best_of,
  tab,
  is_nullified,
  forfeit
from dim_match;

create or replace view event_summary as
with per_game as (
  select
    event_key,
    count(*)                                              as games,
    count(distinct match_key) filter (where match_key <> 0) as series,
    min(substr(date_time_utc, 1, 10))                     as first_date,
    max(substr(date_time_utc, 1, 10))                     as last_date,
    count(*) filter (where blue_win = 1)                  as blue_wins,
    round(avg(duration_seconds))                          as avg_duration_seconds,
    string_agg(distinct era, ', ' order by era)           as eras
  from game_facts
  group by event_key
),
teams as (
  select event_key, count(distinct team_key) as teams from (
    select event_key, blue_team_key as team_key from game_facts
    union all
    select event_key, red_team_key as team_key from game_facts
  ) where team_key <> 0 and event_key <> 0
  group by event_key
),
players as (
  select f.event_key, count(distinct p.player_key) as players
  from fact_player_game f join dim_player p using (player_key)
  where f.event_key <> 0
  group by f.event_key
)
select
  e.event_key,
  e.event_id,
  e.event_name,
  e.league,
  coalesce(c.competition, 'Unknown') as competition,
  e.region,
  e.year,
  e.date_start,
  coalesce(per_game.games, 0)  as games,
  coalesce(per_game.series, 0) as series,
  coalesce(teams.teams, 0)     as teams,
  coalesce(players.players, 0) as players,
  per_game.first_date,
  per_game.last_date,
  per_game.blue_wins,
  per_game.avg_duration_seconds,
  per_game.eras
from dim_event e
left join competition_of c on c.event_key = e.event_key
left join per_game on per_game.event_key = e.event_key
left join teams     on teams.event_key     = e.event_key
left join players   on players.event_key   = e.event_key
where e.event_key <> 0
order by e.date_start, e.event_name;
