-- Index views: every entity with the one number that makes a list useful.
--
-- Without a count, an index of 1,140 players is a wall of names in which nothing
-- stands out. The count is the number of games the entity appears in, and it is
-- what turns the index into a way of finding the ones worth opening.
--
-- The joins are LEFT joins on purpose: an entity with no game keeps its row with a
-- count of zero. Dropping it would hide the players and champions the corpus
-- carries a record for but no game, which is a fact worth showing.

create or replace view player_index as
select
  p.player_key,
  p.player_id,
  p.player_name,
  p.overview_page,
  count(distinct f.game_key) as games
from dim_player p
left join fact_player_game f on f.player_key = p.player_key
group by p.player_key, p.player_id, p.player_name, p.overview_page;

create or replace view team_index as
select
  t.team_key,
  t.team_id,
  t.team_name,
  t.overview_page,
  t.region,
  count(distinct f.game_key) as games
from dim_team t
left join fact_game_side f on f.team_key = t.team_key
group by t.team_key, t.team_id, t.team_name, t.overview_page, t.region;

create or replace view champion_index as
select
  c.champion_key,
  c.champion_id,
  c.champion_name,
  c.riot_key,
  count(distinct p.game_key) as games
from dim_champion c
left join fact_player_game p on p.champion_key = c.champion_key
group by c.champion_key, c.champion_id, c.champion_name, c.riot_key;
