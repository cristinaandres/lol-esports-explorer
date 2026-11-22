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
-- A champion that appears in several roles is decided by count and then by the canonical
-- order above, so the value never depends on row order; which champions tie is a fact
-- about the pin, and `test_primary_roles_resolve_ties_by_the_canonical_order` names them.
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

-- The same rule for a player: an entity that appears in several roles is decided by count
-- and then by the canonical order, and the players who tie are named in the pipeline test
-- rather than here, so a re-pin cannot leave a stale sentence behind.
create or replace view player_primary_role as
select player_key, role as primary_role, games as primary_role_games
from player_role_games
qualify row_number() over (
  partition by player_key
  order by games desc, role_order
) = 1;

-- The club a player last played for, and when.
--
-- The same rule the team page's roster uses, so a player's row and a club's roster
-- cannot disagree about each other. The model has no contracts, so this is what the
-- corpus last saw rather than where a player is now: a player last seen in 2013 keeps
-- that club, and the page prints the year so the staleness is visible.
create or replace view player_last_game as
select
  pg.player_key,
  pg.team_key                  as last_team_key,
  g.date_time_utc              as last_game_date
from fact_player_game pg
join dim_game g using (game_key)
where pg.player_key <> 0
qualify row_number() over (
  partition by pg.player_key
  order by g.date_time_utc desc, pg.game_key desc
) = 1;

create or replace view player_index as
select
  p.player_key,
  p.player_id,
  p.player_name,
  p.overview_page,
  count(distinct f.game_key) as games,
  r.primary_role,
  coalesce(l.last_team_key, 0) as last_team_key,
  -- The year, not the instant: the index prints "Zeus HLE 2026" and a full ISO
  -- timestamp is 20 characters per player carried by every first page load for a
  -- four-character label. The instant stays on player_last_game, which is where a test
  -- can compare it.
  left(l.last_game_date::varchar, 4) as last_game_year
from dim_player p
left join fact_player_game f on f.player_key = p.player_key
left join player_primary_role r on r.player_key = p.player_key
left join player_last_game l on l.player_key = p.player_key
where p.player_key <> 0
group by p.player_key, p.player_id, p.player_name, p.overview_page,
         r.primary_role, l.last_team_key, l.last_game_date;

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

