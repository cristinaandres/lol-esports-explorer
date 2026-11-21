-- Team short names, for search.
--
-- "KC" has to find Karmine Corp. The wiki states the short name on its Teams table
-- (field Short), and the dimensional model carries neither: dim_team has a name and
-- a region. So the field is pinned like the champion release dates.
--
-- They are emitted as aliases with no validity window, which is the existing rule for
-- a searchable name that no page should print: the alias bridge's "Also known as" only
-- lists dated names, and a short name is not a former name.
--
-- Names are compared folded, not by raw equality. The pin is written by asking the
-- wiki for the model's spelling and storing the wiki's answer
-- (pipeline/refresh-shortnames.py), and the wiki does not always answer in the model's
-- spelling: it states "Pain Gaming" for the team dim_team calls "paiN Gaming". Raw
-- equality dropped that row without a word, so "PG" found nothing. The fold is the
-- one src/lib/aliases.ts already applies to the alias bridge -- case, accents,
-- repeated spaces and the HTML entity the source leaves in one name are not
-- differences between two teams -- so search and the pipeline agree on what "the same
-- name" means.
--
-- Folding is safe on this corpus, not merely convenient: all 194 pinned rows reach a
-- team, dim_team's 198 names fold to 198 distinct keys, and no pinned row reaches two
-- teams. One fold does change an answer: "Pain Gaming" now reaches paiN Gaming, which
-- already has a row stating PAIN. That team therefore carries two short names, both of
-- which resolve; the team list prints one, the row spelled the way the model spells the
-- team.

create or replace macro team_name_key(name) as
  lower(trim(regexp_replace(replace(strip_accents(name), '&amp;', '&'), '\s+', ' ', 'g')));

create or replace view team_shortnames as
select entry.name, entry.short
from read_json(
  'data/upstream/team-shortnames.json',
  columns = { teams: 'STRUCT(name VARCHAR, short VARCHAR)[]' },
  maximum_object_size = 10000000
) as data,
lateral unnest(data.teams) as t(entry);

-- The pinned rows that name a team, with the model's spelling of that team. Two pinned
-- spellings can reach one team, so the rank picks the row a team list prints: the one
-- spelled the way the model spells the team first, then by name, so the choice does not
-- depend on file order.
--
-- The rank is partitioned by team_key, not team_id. team_key is the row's primary key,
-- unique and never null, and it is the key every view joins on (team_short_name,
-- team_index, teams.json); team_id is only the natural key -- the DDL declares it UNIQUE,
-- but the build reads a CSV, so nothing enforces that. Keyed on team_id, a second row
-- under one team_id folded into the same partition: one of the two rows lost its short
-- name to the rank without a word, which is the silent drop this guard exists to refuse.
-- Every row with a null team_id folded together the same way. Keyed on team_key each row
-- ranks on its own, so a duplicated id shows up as two teams in ambiguous_shortnames
-- instead of disappearing here.
create or replace view shortname_matches as
select
  s.name      as stated_name,
  s.short,
  t.team_key,
  t.team_id,
  t.team_name,
  row_number() over (
    partition by t.team_key
    order by (s.name = t.team_name) desc, s.name, s.short
  )           as team_rank
from team_shortnames s
join dim_team t on team_name_key(t.team_name) = team_name_key(s.name);

-- A pinned row that folds to no team is a defect in the pin or in the fold, never a
-- row to ignore: build.py reads this view and refuses to write artifacts while it has
-- rows. An empty result is the assertion, so nothing has to maintain a count.
create or replace view unmatched_shortnames as
select s.name, s.short
from team_shortnames s
anti join dim_team t on team_name_key(t.team_name) = team_name_key(s.name);

-- The fold is only as safe as its keys: folding two teams' names together would bind
-- one abbreviation to both of them, silently. Measured on the pinned model the keys are
-- distinct, so this view is empty today and build.py fails on it if a later pin ever
-- makes it not.
--
-- Counted over team_key for the reason shortname_matches ranks over it: team_key is the
-- team, one row each, and it is the only column that stays one-per-row for a null team_id
-- too. Counting distinct team_id called a duplicated id one team, so two teams sharing an
-- id bound one abbreviation to both and this view said nothing; distinct team_key counts
-- them, and the build refuses.
create or replace view ambiguous_shortnames as
select
  s.name,
  s.short,
  count(distinct t.team_key)             as teams,
  string_agg(t.team_name, ' | ' order by t.team_name) as team_names
from team_shortnames s
join dim_team t on team_name_key(t.team_name) = team_name_key(s.name)
group by s.name, s.short
having count(distinct t.team_key) > 1;

create or replace view shortname_aliases as
select
  'team'         as kind,
  s.short        as alias_string,
  s.team_id      as entity_id,
  s.team_name    as entity_name,
  null           as valid_from,
  null           as valid_to,
  'shortname'    as evidence
from shortname_matches s;

-- The short name a team list prints: one row per team, whatever the pin states.
create or replace view team_short_name as
select team_key, short as short_name
from shortname_matches
where team_rank = 1;

-- Every name the site can resolve: the bridge's own rows plus the pinned short names.
create or replace view alias_all as
select kind, alias_string, entity_id, entity_name, valid_from, valid_to, evidence
from alias_rows
union all
select kind, alias_string, entity_id, entity_name, valid_from, valid_to, evidence
from shortname_aliases;
