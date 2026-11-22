-- Team short names, for search.
--
-- "KC" has to find Karmine Corp. The model states the abbreviation on the team row
-- itself -- `dim_team.short`, taken by the dataset from the registry entry that already
-- anchors the team's identity (upstream v1.2.0) -- so this file reads a column instead
-- of joining a second source on a folded name.
--
-- They are emitted as aliases with no validity window, which is the existing rule for
-- a searchable name that no page should print: the alias bridge's "Also known as" only
-- lists dated names, and a short name is not a former name.
--
-- A team row that states no short contributes no alias: four do today, rows the dataset
-- minted rather than read from the registry. That is a missing label, not a defect to
-- refuse -- the abbreviation is display and search furniture, never an identity, and the
-- corpus states no value to attach. Two teams legitimately share one (ESC, GMB, IM and
-- RED each denote two organisations), so nothing here asks a short to be unique.
--
-- What this file used to do and no longer needs to: the wiki pin it replaced was keyed
-- by team name rather than by team_key, so it had to fold spellings ("Pain Gaming" for
-- paiN Gaming), rank duplicate spellings so a list printed one, and refuse a row that
-- reached no team or more than one. A column on the team row cannot do any of that, and
-- the two refusal views it needed are gone with it.

create or replace view team_short_name as
select team_key, short as short_name
from dim_team
where short is not null;

create or replace view shortname_aliases as
select
  'team'         as kind,
  t.short        as alias_string,
  t.team_id      as entity_id,
  t.team_name    as entity_name,
  null           as valid_from,
  null           as valid_to,
  'shortname'    as evidence
from dim_team t
where t.short is not null;

-- Every name the site can resolve: the bridge's own rows plus the short names.
create or replace view alias_all as
select kind, alias_string, entity_id, entity_name, valid_from, valid_to, evidence
from alias_rows
union all
select kind, alias_string, entity_id, entity_name, valid_from, valid_to, evidence
from shortname_aliases;
