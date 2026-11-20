-- Team short names, for search.
--
-- "KC" has to find Karmine Corp. The wiki states the short name on its Teams table
-- (field Short), and the dimensional model carries neither: dim_team has a name and
-- a region. So the field is pinned like the champion release dates.
--
-- They are emitted as aliases with no validity window, which is the existing rule for
-- a searchable name that no page should print: the alias bridge's "Also known as" only
-- lists dated names, and a short name is not a former name.

create or replace view team_shortnames as
select entry.name, entry.short
from read_json(
  'data/upstream/team-shortnames.json',
  columns = { teams: 'STRUCT(name VARCHAR, short VARCHAR)[]' },
  maximum_object_size = 10000000
) as data,
lateral unnest(data.teams) as t(entry);

create or replace view shortname_aliases as
select
  'team'         as kind,
  s.short        as alias_string,
  t.team_id      as entity_id,
  t.team_name    as entity_name,
  null           as valid_from,
  null           as valid_to,
  'shortname'    as evidence
from team_shortnames s
join dim_team t on t.team_name = s.name;

-- Every name the site can resolve: the bridge's own rows plus the pinned short names.
create or replace view alias_all as
select kind, alias_string, entity_id, entity_name, valid_from, valid_to, evidence
from alias_rows
union all
select kind, alias_string, entity_id, entity_name, valid_from, valid_to, evidence
from shortname_aliases;
