-- Game-level views for phase 2: the event, series and game pages.
--
-- Two artifacts come out of here and they are loaded at different times.
-- `game_rows` is eager: every list in the site (an era's events, an event's
-- games) needs it. `side_rows`, `player_rows` and `draft_rows` are lazy: they are
-- fetched on the first game page a reader opens, because 91% of the traffic never
-- needs them.

-- One row per game with everything a list needs and nothing a scoreboard needs.
-- The full per-side statistics live in side_rows; keeping them here would add
-- ~400 KB to the payload every visitor downloads.
create or replace view game_rows as
select
  game_key,
  game_id,
  event_key,
  match_key,
  date_time_utc,
  era,
  patch_key,
  duration_seconds,
  blue_win,
  blue_team_key,
  red_team_key,
  draft_fidelity,
  draft_switched_sides,
  team_stats_coverage,
  draft_coverage,
  player_stats_coverage
from game_facts;

-- The scoreboard: one row per game per side, every objective the model carries.
create or replace view side_rows as
select
  game_key,
  side,
  team_key,
  is_winner,
  kills,
  gold,
  towers,
  inhibitors,
  barons,
  dragons,
  dragons_clouds,
  dragons_infernals,
  dragons_mountains,
  dragons_oceans,
  dragons_hextechs,
  dragons_chemtechs,
  dragons_elders,
  rift_heralds,
  void_grubs,
  atakhans
from fact_game_side;

-- One row per game per player. The champion is here, which is why picks do not
-- need a separate artifact: only the pick *order* does, and that is in draft_rows.
create or replace view player_rows as
select
  game_key,
  player_key,
  team_key,
  champion_key,
  side,
  role,
  kills,
  deaths,
  assists,
  cs,
  gold,
  damage,
  vision
from fact_player_game;

-- Bans, for every game that had a pick-ban phase. The order is the recorded one;
-- for a draft whose fidelity is 'unordered' the page does not imply one.
create or replace view ban_rows as
select
  game_key,
  side,
  entry_index,
  slot,
  champion_key
from fact_draft_slot
where phase = 'ban';

-- Pick slots, for drafts whose order the source stated (2,450 of 3,091 games).
-- The champion is already on the player row, so this artifact exists only to say
-- *when* each pick happened -- it is not a champion list. is_ordered is not
-- carried: games.json already declares the draft's fidelity per game, so
-- repeating it on every slot would be 24,500 copies of one bit.
create or replace view pick_rows as
select
  game_key,
  side,
  entry_index,
  slot,
  champion_key
from fact_draft_slot
where phase = 'pick' and is_ordered = 1;
