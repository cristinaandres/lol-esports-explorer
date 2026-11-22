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

-- A role's canonical order, and the role each entity was played in most.
--
-- The five roles are not alphabetical and not a continuum: a list sorted by role reads
-- Top, Jungle, Mid, Bot, Support, which is the order a draft is read in. Ties are
-- resolved by this order rather than by row order, because a tie is a tie and the
-- answer must not depend on which row the CSV happened to list first; `coalesce` keeps
-- a role the vocabulary does not know last rather than first.
create or replace macro role_rank(role) as
  coalesce(array_position(['Top', 'Jungle', 'Mid', 'Bot', 'Support'], role), 99);

create or replace view champion_role_games as
select
  champion_key,
  role,
  count(*)           as games,
  role_rank(role)    as role_order
from fact_player_game
where champion_key <> 0
group by champion_key, role;

-- One row per champion: the role it appears in most, and the rows that decided it.
-- 139 of the 171 champions appear in more than one role and two tie at the top --
-- Rammus (Jungle 4, Top 4) and Teemo (Top 2, Bot 2) -- so the rank is what makes this
-- a value rather than a coin flip.
create or replace view champion_primary_role as
select champion_key, role as primary_role, games as primary_role_games
from champion_role_games
qualify row_number() over (
  partition by champion_key
  order by games desc, role_order
) = 1;

create or replace view player_role_games as
select
  player_key,
  role,
  count(*)           as games,
  role_rank(role)    as role_order
from fact_player_game
where player_key <> 0
group by player_key, role;

-- The same rule for a player. 68 of the 1,140 played two roles and six tie at the top
-- (Exosen, Hamezz, Kaigu, Reyk, Rock, Shushei), which the test names.
create or replace view player_primary_role as
select player_key, role as primary_role, games as primary_role_games
from player_role_games
qualify row_number() over (
  partition by player_key
  order by games desc, role_order
) = 1;

create or replace view player_index as
select
  p.player_key,
  p.player_id,
  p.player_name,
  p.overview_page,
  count(distinct f.game_key) as games,
  r.primary_role,
  r.primary_role_games
from dim_player p
left join fact_player_game f on f.player_key = p.player_key
left join player_primary_role r on r.player_key = p.player_key
where p.player_key <> 0
group by p.player_key, p.player_id, p.player_name, p.overview_page,
         r.primary_role, r.primary_role_games;

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

-- Release dates live in the model: `dim_champion.release_date`, a dated attribute the
-- dataset reads from the registry row that already anchors the champion's identity
-- (upstream v1.2.0). It is deliberately not a `date_key` -- `dim_date` is the calendar
-- of the games the facts describe -- and it is never derived from a champion's first
-- appearance in the corpus: "picked in 21 of 495 games" means one thing for a champion
-- released in 2011 and another for one released in 2014, and only the source's own
-- date says which. All 171 champions the corpus fields state one today; a champion the
-- model does not carry does not exist for the site.
create or replace view champion_index as
select
  c.champion_key,
  c.champion_id,
  c.champion_name,
  c.riot_key,
  c.release_date,
  count(distinct p.game_key) as games,
  r.primary_role,
  r.primary_role_games
from dim_champion c
left join fact_player_game p on p.champion_key = c.champion_key
left join champion_primary_role r on r.champion_key = c.champion_key
where c.champion_key <> 0
group by c.champion_key, c.champion_id, c.champion_name, c.riot_key, c.release_date,
         r.primary_role, r.primary_role_games;

