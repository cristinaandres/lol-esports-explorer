-- Index views: every entity with the one number that makes a list useful.
--
-- Without a count, an index of 1,140 players is a wall of names in which nothing
-- stands out. The count is the number of games the entity appears in, and it is
-- what turns the index into a way of finding the ones worth opening.
--
-- The joins are LEFT joins on purpose: an entity with no game keeps its row with a
-- count of zero. Dropping it would hide the players and champions the corpus
-- carries a record for but no game, which is a fact worth showing.
--
-- The model's unknown member (key 0) is a different row, and it is not published:
-- every dimension carries it so an absent reference has somewhere to point, but no
-- artifact names it -- no game lists it as a side and no player row names it as a
-- player, a team or a champion. Publishing it would put "Unknown" in an index as
-- if it could be opened, and hand `teamPath(0)` a `/teams/null` link. It is the
-- only row whose id (and a champion's riot_key) is null, so dropping it is what
-- makes those declarations true.

create or replace view player_index as
select
  p.player_key,
  p.player_id,
  p.player_name,
  p.overview_page,
  count(distinct f.game_key) as games
from dim_player p
left join fact_player_game f on f.player_key = p.player_key
where p.player_key <> 0
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
where t.team_key <> 0
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
where c.champion_key <> 0
group by c.champion_key, c.champion_id, c.champion_name, c.riot_key;


-- Release dates live outside the model. They are joined on the champion's name,
-- which is how the wiki keys them, and an unmatched champion keeps a null rather
-- than a guessed date.
--
-- Two rows match no champion today (Akshan, Briar). That is expected rather than
-- drift: the wiki states a release date as soon as a champion exists, and the model
-- only carries champions that appear in a game, so a champion released but not yet
-- played is pinned here and absent there. Release dates are moving into the dataset
-- itself, which will make this file redundant; until then an unmatched row is the
-- same fact as a champion the corpus never fields, not a join to guard.
create or replace view champion_releases as
select entry.name, entry.releaseDate as release_date
from read_json(
  'data/upstream/champion-releases.json',
  columns = { champions: 'STRUCT(name VARCHAR, releaseDate VARCHAR)[]' },
  maximum_object_size = 10000000
) as data,
lateral unnest(data.champions) as t(entry);
