-- Why the corpus holds these events and not others.
--
-- The dataset publishes its own audit trail: every candidate event it considered,
-- with the decision and the rule key that produced it. That is the difference
-- between a rule the reader has to trust and one they can check.

create or replace view selection_candidates as
select
  entry.id,
  entry.name,
  entry.league,
  entry.region,
  entry.decision,
  entry.rule,
  entry.key
from read_json(
  'data/upstream/event-selection.json',
  columns = { candidates: 'STRUCT(id VARCHAR, name VARCHAR, league VARCHAR, region VARCHAR, decision VARCHAR, rule VARCHAR, key VARCHAR)[]' },
  maximum_object_size = 10000000
) as data,
lateral unnest(data.candidates) as t(entry);

-- Coverage per event, folded into the events artifact so an event can state what
-- could be measured in it without a second fetch.
create or replace view event_coverage_report as
select
  entry.eventId   as event_id,
  entry.games     as coverage_games,
  entry.coverage.teamStats.complete    as team_complete,
  entry.coverage.draft.complete        as draft_complete,
  entry.coverage.playerStats.complete  as player_complete
from read_json(
  'data/upstream/event-coverage.json',
  columns = { events: 'STRUCT("eventId" VARCHAR, "eventName" VARCHAR, "overviewPage" VARCHAR, eras VARCHAR[], games BIGINT, coverage STRUCT("teamStats" STRUCT(complete BIGINT, partial BIGINT, unavailable BIGINT, state VARCHAR), draft STRUCT(complete BIGINT, partial BIGINT, unavailable BIGINT, state VARCHAR), "playerStats" STRUCT(complete BIGINT, partial BIGINT, unavailable BIGINT, state VARCHAR)))[]' },
  maximum_object_size = 10000000
) as data,
lateral unnest(data.events) as t(entry);
