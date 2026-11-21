-- One row per era, for the first level of the site.
--
-- Coverage is reported as counts, never as a pre-computed percentage: the page
-- renders "2 438 / 3 091" and lets the reader see the denominator. That rule is
-- the whole point of the product, so the SQL does not hide the denominator.

-- The corpus as a whole, one row. Every figure carries its denominator elsewhere
-- on the site; this view is the headline strip, and it is still counted from the
-- facts rather than asserted.
create or replace view corpus_totals as
select
  count(*)                                                  as games,
  count(distinct match_key) filter (where match_key <> 0)   as series,
  count(distinct event_key)                                 as events,
  (select count(*) from (
     select blue_team_key as team_key from game_facts where blue_team_key <> 0
     union
     select red_team_key as team_key from game_facts where red_team_key <> 0
   ))                                                       as teams,
  (select count(distinct player_key) from fact_player_game) as players,
  -- Admitted is not the same as played: two admitted events carry no game at
  -- all, and 104 admitted series were never played. Reporting both keeps the
  -- headline honest against the dataset it came from.
  (select count(*) from dim_event where event_key <> 0) as events_admitted,
  (select count(*) from dim_match where match_key <> 0) as series_admitted,
  (select count(*) from dim_team where team_key <> 0)  as teams_registered,
  count(distinct patch_key) filter (where patch_key <> 0)   as patches,
  min(substr(date_time_utc, 1, 10))                         as first_date,
  max(substr(date_time_utc, 1, 10))                         as last_date,
  count(*) filter (where blue_win = 1)                      as blue_wins
from game_facts;

create or replace view era_summary as
with games as (
  select
    era,
    count(*)                                          as games,
    count(distinct match_key) filter (where match_key <> 0) as series,
    count(distinct event_key)                         as events,
    count(distinct blue_team_key) + count(distinct red_team_key) as team_slots,
    min(substr(date_time_utc, 1, 10))                 as first_date,
    max(substr(date_time_utc, 1, 10))                 as last_date,
    count(*) filter (where blue_win = 1)              as blue_wins,
    count(*) filter (where blue_win = 0)              as red_wins,
    count(*) filter (where draft_coverage = 'complete')        as games_draft_complete,
    count(*) filter (where player_stats_coverage = 'complete') as games_player_complete,
    count(*) filter (where team_stats_coverage = 'complete')   as games_team_complete,
    -- The average is over the games that state a length, not over the era. count(expr)
    -- skips nulls, so this is exactly the row set avg() divides by; the page prints it.
    count(duration_seconds)                           as games_duration_stated,
    round(avg(duration_seconds))                      as avg_duration_seconds,
    count(distinct patch_key) filter (where patch_key <> 0) as patches
  from game_facts
  group by era
),
team_count as (
  select era, count(*) as teams from (
    select distinct era, team_key from (
      select era, blue_team_key as team_key from game_facts
      union all
      select era, red_team_key as team_key from game_facts
    ) where team_key <> 0
  ) group by era
),
player_count as (
  select g.era, count(distinct p.player_key) as players
  from fact_player_game p join dim_game g using (game_key)
  group by g.era
)
select
  games.era,
  games.first_date,
  games.last_date,
  games.games,
  games.series,
  games.events,
  coalesce(team_count.teams, 0)      as teams,
  coalesce(player_count.players, 0)  as players,
  games.blue_wins,
  games.red_wins,
  games.games_draft_complete,
  games.games_player_complete,
  games.games_team_complete,
  games.games_duration_stated,
  games.avg_duration_seconds,
  games.patches
from games
left join team_count   on team_count.era = games.era
left join player_count on player_count.era = games.era
order by games.first_date;
