# The crystal ball catalogue — the eighteen cards, measured

State: decided
Pinned at: tag `v1.2.0` · model `manifestSha256` `f919082ad4ab90fa8c7e8a88d2bd55528bdc9739f0393cf02dcfb3a4e991a67d` · read on 2026-11-26
Answers: which eighteen generic questions ship as The Almanac, in which four classes,
over which windows, and what each one's denominator is.

## The question as a decision

The phase 4 spec had eighteen questions grouped by answer family, four of them about
a named player or team, and a window expressed as a competition and a year. A pick'em
reader does not browse by answer family, and a question that names an entity is a
different product from a catalogue of records. What has to be chosen here is the
catalogue's shape: its classes, how generic each question is, what a season is, and
which figures in the spec the pin actually supports.

- Option A — eighteen cards grouped by answer family, including Faker's 700 kills,
  Peyz vs Gumayusi, HLE vs T1 and an LCS team. The old plan.
- Option B — eighteen **generic** cards in four classes (champions, players, teams,
  events), with the named-entity questions deferred to a later round, seasons derived
  from Worlds, and the champion deaths card replaced by a champion KDA card. Chosen.
- Not on the table now: eras, relative ranges ("last 6 months") and event windows.
  The class page works with "all games" and the sixteen seasons first; the other
  window kinds are a later round and would multiply the precomputed records.

The findings below are the measurements that decided the details: the season rule,
the denominators, the corrections to the spec, and the one question that stays
`not_verifiable`.

## Findings

### F1 — the corpus is 3,091 games, 54 events, 1,140 players

```sql
select (select count(*) from dim_game where game_key <> 0),
       (select count(*) from dim_match where match_key <> 0),
       (select count(*) from dim_event where event_key <> 0),
       (select count(*) from dim_player where player_key <> 0),
       (select count(*) from dim_team where team_key <> 0),
       (select count(*) from dim_champion where champion_key <> 0);
```

Result: 3,091 games, 2,068 series, 54 admitted events, 1,140 players, 197 teams, 171
champions. 52 of the 54 events have a game.

Method: none — plain SQL.

What it changes: "all games" is the default window, and the catalogue's denominators
are read against these totals, not against the 235 candidate events.

### F2 — presence is pick ∪ ban, once per game

```sql
with g as (select game_key from game_facts
           where event_key = (select event_key from dim_event where event_name = 'Worlds 2025')),
p as (select distinct game_key, champion_key from fact_player_game
      where game_key in (select game_key from g) and champion_key <> 0),
b as (select distinct game_key, champion_key from fact_draft_slot
      where game_key in (select game_key from g) and phase = 'ban' and champion_key <> 0),
x as (select champion_key, count(*) n from (select * from p union select * from b) group by 1)
select c.champion_name, x.n, (select count(*) from g) games
from x join dim_champion c using (champion_key) order by x.n desc limit 5;
```

Result: Worlds 2025 has 84 games; Yunara is present in 74 of them (88%), Azir 69,
Orianna 66, Poppy 58, Neeko 56.

- Picks live on `fact_player_game` (30,910 rows) and bans on `fact_draft_slot` where
  `phase = 'ban'` (28,306 rows over 3,088 games). They disagree by two rows: 30,908
  pick slots against 30,910 player rows, because one game (IEM Season 7 World
  Championship 2013, Gambit Gaming vs Millenium) records 8 pick slots for 10 players.
- Three games state picks and no bans (Mid-Season Cup 2020, blind pick).
- Three games have the same champion on both sides; presence counts it once.

Method: none — plain SQL. The union is the rule.

What it changes: `cb_game_presence` is one row per game and champion; presence is a
game measure, never a player-row count.

### F3 — a game's length is one game, not two side rows

```sql
select count(*) side_rows, count(duration_seconds) stated_rows,
       count(distinct game_key) filter (where duration_seconds is not null) games
from fact_game_side;
select count(*), count(duration_seconds),
       count(*) filter (where duration_seconds <= 1920) fast
from game_facts;
```

Result: 6,182 side rows, 6,168 of them state a duration, 3,084 distinct games state
one. Of those games, 1,513 finished at or under 32:00 (49.06%; Wilson 95% 47.3–50.8%).

Method: Wilson 95%.

What it changes: the 32:00 answer's denominator is 3,084 games, and the histogram
counts a game once. Averaging over `fact_game_side` would double the weight of every
game and stop being right the day one side is partial.

### F4 — a measure's denominator is the rows that state it

```sql
select count(*) filter (where damage is not null) damage_rows,
       count(*) filter (where gold is not null) gold_rows,
       count(*) filter (where vision is not null) vision_rows,
       count(*) rows
from fact_player_game;
select count(*) filter (where kills is not null),
       count(*) filter (where gold is not null), count(*) from fact_game_side;
```

Result: damage 15,870 of 30,910 player rows; gold 29,160; vision 19,610; kills,
deaths, assists and CS on all 30,910. On the side table, kills and gold are stated on
5,624 of 6,182 rows.

Method: none — plain SQL.

What it changes: damage-per-game divides by 15,870, never by 30,910; team kills and
team gold divide by the side rows that state them. The limit is printed, not implied.

### F5 — the threshold bites, and Teemo's grain is the game

```sql
select count(*) filter (where kills >= 15) fifteen,
       count(*) filter (where cs >= 450) cs450, count(*) from fact_player_game;
select count(*) from fact_player_game
where champion_key = (select champion_key from dim_champion where champion_name = 'Teemo');
select count(distinct game_key) from fact_player_game
where champion_key = (select champion_key from dim_champion where champion_name = 'Teemo');
```

Result: 49 of 30,910 player-games reach 15 kills (0.16%; Wilson 0.1–0.2%), 401 reach
450 CS (1.3%; 1.2–1.4%). Teemo has 4 picks and 0 bans: 4 of 3,091 games (0.13%;
Wilson 0.1–0.3%), not 4 of 30,910 player-games (0.013%; upper 0.04%).

Method: Wilson 95%.

What it changes: the yes/no cards are answered at the grain where the event happens.
A pick happens in a game, so Teemo's denominator is games; "a player reaches 15
kills" happens in a player-game, so that denominator is player-games. The old spec
mixed the two, and its 0.04% was the wrong grain for the question.

### F6 — Faker is 667 Worlds kills, not 822

```sql
select sum(pg.kills), count(*)
from fact_player_game pg
join dim_player p using (player_key)
join dim_event e using (event_key)
where p.player_name = 'Faker' and e.league = 'World Championship';
-- all events, for contrast:
select sum(pg.kills), count(*) from fact_player_game pg
join dim_player p using (player_key) where p.player_name = 'Faker';
```

Result: 667 kills in 184 Worlds player-games (1,484 in 410 games across every event).

Method: none — plain SQL.

What it changes: the spec's "822, already crossed" is false at the pin; the threshold
is 33 kills short. Faker's question is deferred anyway (see the spec's deferred
named-entity section): the generic player-kills card replaces it, and the dossier
keeps the corrected figure.

### F7 — a game has ten picked champions, not 1.7

```sql
with x as (select game_key, count(distinct champion_key) c
           from fact_player_game where champion_key <> 0 group by 1)
select round(avg(c), 2), min(c), max(c) from x;
with x as (select game_key, count(distinct champion_key) c from (
             select game_key, champion_key from fact_player_game where champion_key <> 0
             union select game_key, champion_key from fact_draft_slot
                   where phase = 'ban' and champion_key <> 0) group by 1)
select round(avg(c), 2), min(c), max(c) from x;
```

Result: 10.0 picked champions per game (8–10); 19.2 champions per game by presence
(8–20). Per event, 38 to 118 distinct champions over 52 events, mean 70.5.

Method: none — plain SQL.

What it changes: the unique-champions simulation draws a game's observed pick set
(8–10 champions), not a number close to 1.7. A per-event answer is a range, not a
point.

### F8 — Finals MVP is 11 awards, 9 players, and the join fans out to 208 rows

```sql
select count(*) awards, count(distinct player_key) players,
       count(distinct event_key) events
from fact_player_honour where title = 'Finals MVP';
select count(*)
from fact_player_honour h join fact_player_game g
  on g.player_key = h.player_key and g.event_key = h.event_key
where h.title = 'Finals MVP';
```

Result: 11 awards, 9 players, 11 events; the naive join is 208 rows. The roles at
award grain are Mid 5, Top 3, Bot 2, Support 1, Jungle 0, and every award has exactly
one role.

Method: none — plain SQL.

What it changes: `cb_awards` aggregates to award grain first and asserts one role per
award; the card is a census at `n = 11`, so it is `insufficient_data` for a
probability and prints its counts.

### F9 — the season ends at Worlds, and the pin has one exception

```sql
with ev as (
  select e.event_key, min(g.date_time_utc)::date d0, max(g.date_time_utc)::date d1
  from dim_event e join game_facts g using (event_key) group by 1),
wf as (
  select e.year, max(ev.d1) final
  from ev join dim_event e using (event_key)
  where e.league = 'World Championship' group by 1),
es as (
  select ev.*, coalesce((select min(w.year) from wf w where w.final >= ev.d1),
                        (select max(year) from wf)) season
  from ev)
select e.event_name, e.year, es.season, es.d0, es.d1
from es join dim_event e using (event_key) where es.season <> e.year;
```

Result: 16 seasons, 2011–2026. Season N runs from the day after Worlds N−1 final to
Worlds N final; season 2011 starts at the first game. **One event differs from its
calendar year: IPL 5 (29 Nov – 3 Dec 2012) belongs to season 2013** because Worlds
2012 ended on 14 October 2012. Every other event falls in its own year. Season 2011
has 28 games; season 2026 is the largest with 446 games and four events; season 2025
has 232 games, 4 events, 22 teams, 115 players and three patches (25.05, 25.13, 25.2).

Method: none — plain SQL.

What it changes: the window model is `all` plus the sixteen seasons, and the season
is derived from Worlds rather than read from `dim_event.year`. The one exception is
stated on the page that uses it.

### F10 — the team cards are answerable

```sql
with x as (select team_key, count(*) games, sum(is_winner) wins
           from fact_game_side where is_winner is not null and team_key <> 0
           group by 1)
select t.team_name, x.games, x.wins, round(x.wins * 1.0 / x.games, 3)
from x join dim_team t using (team_key) where x.games >= 20
order by x.wins * 1.0 / x.games desc limit 5;
-- and the same with `asc` for the worst end
```

Result: 74 teams have at least 20 games. Best: Samsung Galaxy 77.8% (28/36), Samsung
White 76.9% (20/26), T1 69.9% (293/419), Moscow 5 69.0% (20/29), RNG 68.2% (116/170).
Worst: PENTAGRAM 20.8% (5/24), FURIA 27.3% (9/33), EVOS 30.0% (6/20), 100 Thieves
32.4% (11/34), Rogue 33.3% (8/24). Kills and gold are stated on 5,624 of 6,182 side
rows; best kills per game Sentinels 17.43 (21 games), HLE 17.33 (103); best gold per
game Samsung Galaxy 70,828 (36), Sentinels 67,574 (21).

Method: Wilson 95% for the win rates; bootstrap percentile, 10,000 resamples, fixed
seed for the per-game ratios.

What it changes: teams get three generic cards — win rate (best and worst), kills per
game, gold per game — and the named HLE vs T1 question is deferred.

### F11 — regions are not a column, so the question stays `not_verifiable`

```sql
select coalesce(region, '<null>') region, count(*)
from dim_team where team_key <> 0 group by 1 order by 2 desc;
select count(distinct tab) from dim_match where tab <> '';
select team_key, team_name from dim_team
where team_key <> 0 and (region is null or region = '');
```

Result: 19 distinct region values including the null (18 named strings: Korea, North
America, China, Asia Pacific, EMEA, Europe, Brazil, SEA, CIS, Oceania, LMS, Turkey,
Americas, Vietnam, LAN, Latin America, Japan, LAS). 73 distinct `tab` labels. Four
non-zero registry rows state no region (Team Baron, Team Dragon, LoL Championship
Series, LoL EMEA Championship) plus the unknown member. `Europe` and `EMEA`, `LMS`
and `Asia Pacific` coexist, so "regions in knockouts" depends on when a team was
renamed, not on where it played.

Method: none — plain SQL.

What it changes: `region-knockouts` is the only `not_verifiable` card left in 4a. It
renders the query, the result above and the unblocking decision (a stage-order table
per event and a declared region vocabulary with its eras). It has no chart.

### F12 — seventeen windows are affordable, with numpy

```python
# 20 candidates x 10,000 resamples x n = 50 values
# pure Python, statistics.fmean + random.choices: 0.81 s
# numpy, default_rng(seed).integers + mean(axis=1): 0.05 s
```

Result: the pure-Python bootstrap costs ~0.8 s per question-window with 20 candidates;
numpy costs ~0.05 s. Seventeen windows (all plus sixteen seasons) per question put
the build at ~15–20 s with numpy, against 7 s today.

Method: benchmark on the container, not a claim about another machine.

What it changes: numpy is pinned in the pipeline, and the artifact is one file per
question (`almanac-<id>.json`) plus an index, so a page pays for its question rather
than for all eighteen.

## Decisions

| # | Decision | Because | What would reverse it |
|---|---|---|---|
| D1 | Eighteen generic cards in four classes: champions 5, players 6, teams 3, events 4 | A pick'em reader browses by subject; the answer family is a tag, not a group | Readers asking for a named player's page first |
| D2 | The four named-entity questions are deferred, with generic replacements | 4a is a catalogue of records, not a head-to-head; the named pages need the placement data and the comparison family | A committed placement table, or phase 6 |
| D3 | Windows are `all` plus sixteen seasons | Seasons are the unit a pick'em reader thinks in, and seventeen windows fit the build | The measured build missing its target, or a request for eras/events |
| D4 | A season ends at Worlds; the rule is derived, not the calendar year | "La season termina con los worlds" is the product's definition; IPL 5 is the pin's one exception | A source stating a season column |
| D5 | The champion deaths card becomes a KDA card with K, D, A and KP | Ranking a champion by deaths alone is a column, not a question; KDA needs its components and its participation | A reader asking only for deaths |
| D6 | Teams get three cards: win rate (best/worst), kills per game, gold per game | These are the answerable team questions a pick'em asks; placement is not a column | A placement or league table in the source |
| D7 | Best ends are ordered by the lower bound; worst ends by the upper bound | A winner's curse exists at both ends; ordering by the point estimate rewards the luckiest sample | A score that shows the point estimate is the better rule |
| D8 | Wilson for proportions, bootstrap for ratios, and `n ≥ 20` in one constant | Wald collapses at 0 and 1; a ratio of counts is not a proportion | A method that beats both on the catalogue's own backtest |
| D9 | Top-N: 5 by default, 10 and 20 selectable; the record stores 20 | A reader can widen the ranking without a rebuild; 4b still measures K = 5 | A payload or ordering problem at 20 |
| D10 | One artifact per question plus an index | Seventeen windows × twenty-one records per question is a page payload, not an index payload | The measured per-question payload being trivial |
| D11 | visx, not a batteries-included chart library | The central chart is a dot with an interval, which the high-level libraries do not draw; visx gives scales, axes and the tooltip while the marks stay ours | A chart need that visx makes expensive |
| D12 | `source.sha256` is the pin's manifest hash, not the artifact's own | A file cannot contain its own hash; the pin is the source the number came from, and `meta.json` keeps the file's hash | A two-file build that hashes one and writes the other |

## What I did not check

- **The event, era and relative-range windows.** They are deferred; their record
  counts and build cost are not measured.
- **The per-role split.** The spec's M6 asks for a role where the reader asks; 4a
  states "all roles" and does not precompute the five roles.
- **Which team question a pick'em reader actually asks most.** Win rate, kills and
  gold are a product judgement, not a survey.
- **The visual design.** The chart shapes are decided; their look belongs to phase 5.
- **4b.** The backtest is not measured here; the catalogue is only described.
- **The named-entity questions.** Their queries are kept, but their pages are not
  costed.

## Change log

| Date | Change | Why |
|---|---|---|
| 2026-11-26 | first version | the 4a amendment: generic catalogue, classes, seasons, champion KDA |
