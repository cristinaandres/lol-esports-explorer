# Phase 4 — The crystal ball

Status: round 4a — proposed; round 4b (the backtest) is a section of this document,
not a second spec. Depends on phase 3 (entity identity and the alias bridge: a
question about a player or a champion needs a name that resolves) and on the pinned
model. It replaces the head-to-head plan that carried this phase number; "Deferred /
Roadmap" says what went, where it went and why. 4a is the catalogue and 4b is what
measures it: built afterwards, scored separately.

## Objective

Before an international event the pick'em asks recurring questions: which champion
was present most, will a player reach fifteen kills, how many champions will be
drafted, which role takes Finals MVP. The dataset can answer most of them today,
and it can answer them *with their denominator*, which is the only thing this site
promises.

This phase builds the crystal ball: a closed catalogue of eighteen questions, each
answered as a record — a number, its interval, the sample it was measured on, the
window it came from, and the sentences that say what it does not license anyone to
conclude. It is descriptive and probabilistic. It does not predict a match, and the
section "Deferred / Roadmap" says where prediction moved to, because it moved and
was not dropped.

## The audit — eighteen questions against the schema

Every question in the catalogue, its field(s) as `data/model/data-dictionary.md`
names them, whether the field exists, and the family that decides how the answer is
shaped. This table is the deliverable that justifies the scope: a question is in
phase 4 because a column carries it, and the three marked ⚠️ are in the catalogue
precisely because a column does *not*.

| # | Question (pick'em) | Family | Field(s), as the dictionary names them | In schema | Verdict | Method |
|---|---|---|---|---|---|---|
| 1 | Highest champion presence | Top-1 | `fact_player_game.champion_key` (picks) ∪ `fact_draft_slot.champion_key` where `phase = 'ban'` | yes, two tables | ✅ | `cb_champion_presence`; presence rate per game, top-K |
| 2 | Highest champion win rate | Top-1 | picks + `fact_game_side.is_winner`, joined on `(game_key, side)` | yes, via join | ✅ n ≥ 20 | `cb_champion_win_rate`; Wilson, top-K |
| 3 | Highest champion deaths per game | Top-1 | `fact_player_game.deaths`, `champion_key` | yes | ✅ | `cb_champion_deaths`; mean per champion game |
| 4 | Highest player KDA | Top-1 | `fact_player_game.kills`, `deaths`, `assists` | yes | ✅ | `cb_player_kda`; derived measure, bootstrap interval |
| 5 | Highest player damage per game | Top-1 | `fact_player_game.damage` | yes, half the rows | ✅ | `cb_player_damage`; denominator is rows that state damage |
| 6 | Highest player kill participation | Top-1 | `fact_player_game.kills`, `assists` + `fact_game_side.kills` on the same side | yes, via join | ✅ | `cb_player_kill_participation`; share of the team's kills |
| 7 | Will Teemo be picked? | Yes/No | picks by `champion_key` (`fact_player_game`), release date in `dim_champion.release_date` | yes | ✅ | `cb_champion_base_rate`; games picked / games eligible |
| 8 | Will Faker reach 700 Worlds kills? | Yes/No | `fact_player_game.kills` accumulated over `dim_event.league = 'World Championship'` | yes | ✅ | `cb_player_threshold`; cumulative as of the cut date |
| 9 | Will a player reach 15 kills? | Yes/No | `fact_player_game.kills` | yes | ✅ | `cb_player_threshold`; player-games with `kills >= 15` |
| 10 | Will a player reach 450 CS? | Yes/No | `fact_player_game.cs` | yes | ✅ | `cb_player_threshold`; player-games with `cs >= 450` |
| 11 | How many unique champions? | Count | `fact_draft_slot.champion_key`, `phase = 'pick'`, `game_key` per event | yes, needs simulation | ✅ | `cb_champion_pool_size` + seeded Monte Carlo over the format |
| 12 | More games before or after 32:00? | Count | `fact_game_side.duration_seconds` | yes, repeated per side | ✅ | `cb_game_length_share`; deduplicated to one row per game |
| 13 | Peyz vs Gumayusi: more total kills? | A vs B | `fact_player_game.kills`, `game_key` | yes | ✅ range + sample warning | `cb_player_compare`; totals, per-game rates, overlap test |
| 14 | Who places higher: HLE or T1? | A vs B | `dim_match.tab`, `is_nullified`, `forfeit` — **no placement column** | partial | ⚠️ | `cb_stage_reach`; blocked on a stage-order table |
| 15 | Who wins the shortest game? | A vs B | `duration_seconds` + `fact_game_side.is_winner`, `side` | yes | ✅ | `cb_shortest_game`; reframed as a base rate over the shortest decile |
| 16 | Which role wins Finals MVP? | Categorical | `fact_player_honour.title` + `fact_player_game.role` on `(player_key, event_key)` | yes, via join | ✅ n = 11, census | `cb_finals_mvp_role`; award grain, then role |
| 17 | How many regions reach knockouts? | Categorical | `dim_team.region` + `dim_match.tab` | partial: no stage column, region is a current label | ⚠️ | `cb_region_knockouts`; blocked on stage order and region vocabulary |
| 18 | Will an LCS team reach knockouts? | Categorical | `dim_team` has **no league**; `dim_event.league` never says LCS | no | ⚠️ | `cb_team_region_league`; needs a curated league↔team mapping |

Every row renders the same `Answer` contract (§ The answer contract below); the
family decides which branch of it — candidates, a single record, a census, or the
verification block — and no row may render outside it.

The record ids in `answers.json` follow the table in order, so the schema and the
audit can be checked row by row: `champion-presence`, `champion-win-rate`,
`champion-deaths`, `player-kda`, `player-damage`, `player-kill-participation`,
`teemo-picked`, `faker-700-kills`, `player-kills-threshold`, `player-cs-threshold`,
`unique-champions`, `game-length-32`, `player-totals-compare`, `stage-reach`,
`shortest-game`, `finals-mvp-role`, `region-knockouts`,
`team-league-knockouts`.

What the audit established, measured on the pinned tag:

- **Fifteen questions are answerable** and **three are not yet**, and the three are
  documented with the SQL that shows why rather than deleted. Deleting them would
  hide the fact that the dataset knows who reached the final but not who placed
  third.
- **Presence is not one field.** Picks live on `fact_player_game`; bans live on
  `fact_draft_slot`. They disagree by two rows: `fact_draft_slot` states 30,908
  picks against 30,910 player rows, because one game (IEM Season 7 World
  Championship 2013, Gambit Gaming vs Millenium) records 8 pick slots for 10
  players. Picks therefore come from the player rows and bans from the draft slots.
- **Three games state picks and no bans** (2020 Mid-Season Cup blind pick), and in
  three games both sides picked the same champion. Presence counts a champion once
  per game, which is the rule `metric-definitions.md` already states.
- **`duration_seconds` is a game measure repeated on both side rows** — 6,168 rows
  for 3,084 games that state a length. Any share over it must deduplicate.
- **`damage` is stated on 15,870 of 30,910 player rows.** `kills`, `deaths`,
  `assists` and `cs` are stated on all 30,910; `gold` on 29,160; `vision` on 19,610.
  A damage answer's denominator is the rows that state damage, and it says so.
- **The threshold bites hardest where it should.** 156 of 171 champions reach 20
  picks across the whole corpus, but only 13 reach 20 picks inside Worlds 2025 and
  32 reach 20 games of presence. A per-event champion win-rate question will mostly
  be answered "insufficient data", and that is the honest outcome, not a defect
  to tune away.
- **The corpus is international only.** Every "will X happen" answer is conditioned
  on a team that qualified; the domestic season that got it there is absent. Every
  answer says so in its limits.

## Required behavior

- **R1** `/answers` lists the eighteen questions grouped by family, each with its
  verdict and the window it would be answered over.
- **R2** `/answers/:id` renders exactly one `Answer`, and the URL reproduces the
  window: `?competition=Worlds&year=2025&cut=2025-09-30`. A question id that is not
  in the catalogue is a 404, not an empty answer.
- **R3** Every answer renders the four blocks of the contract — headline,
  evidence, limits, source — and there is no code path that renders one of them
  without the others. A number without its interval and its `n` is a bug, the same
  way a share without its denominator is.
- **R4** Every proportion carries a Wilson interval at 95%, computed once, in the
  pipeline, and never recomputed in the browser. The interval is printed with its
  level and its `n`: `34% (95% CI: 28–41%, n=112)`.
- **R5** `n ≥ 20` is the publication threshold and it is configurable in one place.
  Below it the answer's verdict is `insufficient_data`, its headline says so in
  words, and no interval or point estimate is printed. The counts it was judged on
  stay visible in the evidence block, labelled a census: a count is not a claim
  about the future, and hiding it would be the silent filtering this product
  refuses.
- **R6** A top-1 question returns a **top-K** (default K = 5, stated on the page),
  ordered by the lower bound of the interval, not by the point estimate. The page
  prints the order rule and the K it used.
- **R7** An answer whose window aggregates more than one patch lists every patch in
  it. A window that spans patches the target tournament will not be played on
  carries an explicit warning that the transfer is weaker.
- **R8** Every answer states its cut date: the last game date in its window, printed
  beside the window. An answer is a record as of a date, never as of "now".
- **R9** Every answer states the role it is scoped to when the subject is a
  champion, taken from `fact_player_game.role` and never from the champion's design.
- **R10** Every answer states the selection bias in its limits: the corpus holds
  only events a team qualified for, so a player's record is a record of the games
  they reached.
- **R11** A question whose verdict is `not_verifiable` renders the verification
  query, its result today, and the decision that would unblock it. It renders no
  number that would look like an answer.
- **R12** An answer links only to routes that exist: `/players/:id`, `/teams/:id`,
  `/champions/:id`, `/events/:id`, `/games/:id`. `/calibracion` is linked only after
  phase 4b ships it.
- **R13** The catalogue is closed and versioned. A new question is a spec change and
  a new row in the audit table, not a runtime string.

## The answer contract

One component, one artifact shape, one JSON schema. A question that cannot fill the
shape cannot be published.

### Component — `src/components/Answer.tsx`

```
┌ Answer ────────────────────────────────────────────────────────────────┐
│ 88% (95% CI: 80–93%, n=84) presence      [Worlds 2025 · patch 25.2]    │
│ ───────────────────────────────────────────────────────────────────────│
│ Evidence   presence · 74 of 84 games · Wilson 95% · cut 2025-11-09      │
│ Limits     · only teams that qualified appear in the corpus             │
│            · one event, one patch: not a statement about the next one   │
│            · a presence is a pick or a ban, not a probability           │
│ Source     cb_champion_presence · answers.json · sha256 9f2c…           │
└────────────────────────────────────────────────────────────────────────┘
```

`Answer` takes one `AnswerRecord` and renders: the headline with number,
uncertainty and `n` together; the evidence line (metric, value, `n`, denominator,
interval, window, cut date); a `limits` list of at most four short sentences; the
source line with the artifact's recorded `sha256` (its entry in
`meta.json.artifacts`, which the build writes). The verdict is a labelled chip
(`answered`, `insufficient_data`, `not_verifiable`) so colour never carries it
alone. `limits` is rendered as visible text, never behind a hover: a limit nobody
reads is not a limit.

### JSON schema — `answers.json`, one record per question and window

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://cristinaandres.github.io/lol-esports-explorer/schema/answer.json",
  "title": "Answer",
  "type": "object",
  "required": ["id", "family", "question", "verdict", "headline", "evidence", "limits", "source"],
  "additionalProperties": false,
  "properties": {
    "id": { "type": "string", "enum": [
      "champion-presence", "champion-win-rate", "champion-deaths", "player-kda",
      "player-damage", "player-kill-participation", "teemo-picked",
      "faker-700-kills", "player-kills-threshold", "player-cs-threshold",
      "unique-champions",
      "game-length-32", "player-totals-compare", "stage-reach",
      "shortest-game", "finals-mvp-role", "region-knockouts", "team-league-knockouts"
    ] },
    "family": { "type": "string", "enum": ["top-1", "yes-no", "count", "comparison", "categorical"] },
    "question": { "type": "string", "minLength": 1 },
    "verdict": { "type": "string", "enum": ["answered", "insufficient_data", "not_verifiable"] },
    "headline": {
      "type": "object",
      "required": ["text", "value", "n"],
      "additionalProperties": false,
      "properties": {
        "text": { "type": "string", "description": "Number, interval and n in one sentence." },
        "value": { "type": ["number", "null"] },
        "unit": { "type": ["string", "null"], "enum": ["share", "per-game", "count", "kda", "seconds", null] },
        "n": { "type": "integer", "minimum": 0 },
        "interval": {
          "type": ["object", "null"],
          "required": ["level", "low", "high", "method"],
          "additionalProperties": false,
          "properties": {
            "level": { "type": "number", "const": 0.95 },
            "low": { "type": "number" },
            "high": { "type": "number" },
            "method": { "type": "string", "enum": ["wilson", "bootstrap-percentile"] }
          }
        }
      }
    },
    "evidence": {
      "type": "object",
      "required": ["metric", "value", "n", "denominator", "grain", "window"],
      "additionalProperties": false,
      "properties": {
        "metric": { "type": "string" },
        "value": { "type": ["number", "null"] },
        "n": { "type": "integer" },
        "denominator": { "type": ["integer", "null"] },
        "grain": { "type": "string", "enum": ["game", "player-game", "side", "award", "champion-game"] },
        "window": {
          "type": "object",
          "required": ["competitions", "patches", "date_from", "date_to", "cut_date"],
          "additionalProperties": false,
          "properties": {
            "competitions": { "type": "array", "items": { "type": "string" } },
            "patches": { "type": ["array", "string"], "items": { "type": "string" } },
            "date_from": { "type": "string", "format": "date" },
            "date_to": { "type": "string", "format": "date" },
            "cut_date": { "type": "string", "format": "date" }
          }
        },
        "role": { "type": ["string", "null"] }
      }
    },
    "candidates": {
      "type": "array",
      "description": "Required when family is top-1 and verdict is answered. Five by default; six only when the fifth place ties.",
      "maxItems": 6,
      "items": {
        "type": "object",
        "required": ["name", "path", "metric", "n", "interval", "lower_bound"],
        "properties": {
          "name": { "type": "string" },
          "path": { "type": "string", "pattern": "^/(players|teams|champions)/" },
          "metric": { "type": "number" },
          "n": { "type": "integer" },
          "interval": { "type": ["object", "null"] },
          "lower_bound": { "type": "number" }
        }
      }
    },
    "limits": { "type": "array", "minItems": 1, "maxItems": 4, "items": { "type": "string" } },
    "source": {
      "type": "object",
      "required": ["view", "artifact", "sha256"],
      "additionalProperties": false,
      "properties": {
        "view": { "type": "string" },
        "artifact": { "type": "string" },
        "sha256": { "type": "string", "pattern": "^[0-9a-f]{64}$" }
      }
    },
    "verification": {
      "type": "object",
      "description": "Required when verdict is not_verifiable.",
      "required": ["query", "result_today", "unblocked_by"],
      "properties": {
        "query": { "type": "string" },
        "result_today": { "type": "string" },
        "unblocked_by": { "type": "string" }
      }
    }
  },
  "allOf": [
    {
      "if": { "required": ["family", "verdict"],
              "properties": { "family": { "const": "top-1" }, "verdict": { "const": "answered" } } },
      "then": { "required": ["candidates"] }
    },
    {
      "if": { "required": ["verdict"], "properties": { "verdict": { "const": "not_verifiable" } } },
      "then": { "required": ["verification"] }
    },
    {
      "if": { "required": ["verdict"], "properties": { "verdict": { "const": "insufficient_data" } } },
      "then": { "required": ["headline"],
                "properties": { "headline": { "properties": { "interval": { "const": null } } } } }
    }
  ]
}
```

The three `allOf` branches are the rule in structural form: a top-1 answer that says
it is answered must carry its candidates, a `not_verifiable` answer must carry the
query that says why, and an `insufficient_data` answer cannot carry an interval —
there is no shape in which a small sample acquires one.

### Two worked examples, with real numbers from the pin

Question 1 — highest champion presence, Worlds 2025, cut 2025-11-09:

> **88% (95% CI: 80–93%, n=84)** — Yunara was present in 74 of the 84 games of
> Worlds 2025. Presence counts a ban and a pick the same way.
> **Limits:** only teams that qualified appear; the window is one event on one
> patch (25.2), so this is where the champion was played, not where it will be.

Question 12 — more games before or after 32:00, all games, cut at the pin:

> **49% (95% CI: 47–51%, n=3,084)** — 1,513 games finished at or under 32:00.
> **Limits:** seven games state no duration and leave the denominator; a game is
> counted once even though its length is repeated on both side rows; the era mix
> inside the window is not held constant, and game length drifted across fifteen
> years, so the pooled share is not any one era's share.

Both are retrospective because they quote the pin. The pre-tournament form of the
same question carries a cut date *before* the event's first game and a window that
excludes it — which is exactly what phase 4b forces, and what makes the difference
between these two forms scoreable instead of arguable.

## Methodological rules (mandatory)

These are the rules a reviewer checks first. Each one exists because the corpus
breaks without it, and each names the measurement that proves it matters.

- **M1 — Presence is pick ∪ ban, per game.** Picks from
  `fact_player_game.champion_key`; bans from `fact_draft_slot` where
  `phase = 'ban'`. A champion present twice in one game — both sides picked it in
  the three blind-pick games — counts once. Publish nothing about bans until the
  completeness check passes: 28,306 ban rows over 3,088 games, three games with
  picks and no bans, and one game whose pick slots are two short of its players.
  Those four games are named in the answer's limits while they remain.
- **M2 — The patch window is always explicit.** A window either names its patches
  or says `all patches`. 279 games carry `patch_key = 0`: they are inside or outside
  a patch-scoped window by a stated rule, never by accident. Aggregating patches
  without declaring it is the defect this rule exists to prevent.
- **M3 — Wilson for proportions, always with `n`.** Wald intervals are not used:
  they collapse to a zero-width interval at `p = 0` and `p = 1`, which is exactly
  the low-base-rate case this catalogue is full of. Teemo's four picks in 30,910
  player-games give an upper bound of 0.04%, and a Wald interval would print 0.00%.
- **M4 — A ratio of counts is not a proportion.** KDA, deaths per game, damage per
  game and a difference of totals use a bootstrap percentile interval (10,000
  resamples, fixed seed recorded in the artifact) and print the method. Wilson is
  reserved for `part / total` over one denominator.
- **M5 — Below `n ≥ 20`, no estimate.** The verdict is `insufficient_data`, the
  headline says so, and no interval or probability is drawn. The raw counts stay
  visible as a census. The threshold lives in one constant, is copied into
  `answers.json` as `thresholds.min_n`, and is never re-derived in the browser.
- **M6 — The role is explicit where the subject is a champion.** Presence, win
  rate and deaths are reported per role where the reader asked by role, from
  `fact_player_game.role`, with the canonical order `Top, Jungle, Mid, Bot,
  Support` breaking ties (`06_indexes.sql`, `role_rank`). A champion's role is
  where the corpus played it, never its design.
- **M7 — Selection bias is printed, not implied.** The corpus is international
  only: 54 admitted events, no domestic league game, no roster table, no contract
  dates. "Will Teemo be picked?" is really "given a qualified field, was Teemo
  picked?" — and the answer's limits say so in those words.
- **M8 — Most played is not most likely.** A champion's presence share is a
  historical frequency under the patches it was measured on. The transfer to a
  future tournament needs patch coverage, so the answer prints the overlap between
  its window's patches and the target's first patch, and weakens the claim when the
  overlap is empty. "Yunara was banned in 58 of 84 games at Worlds 2025" is a fact;
  "Yunara will be banned at Worlds 2026" is a different sentence and this phase does
  not print it.
- **M9 — A game-level measure is counted once per game.** `duration_seconds` is
  repeated on both side rows; averaging over `fact_game_side` would be correct only
  because every game states it twice, and would stop being correct the day one side
  is partial. The views read `game_facts` and count games.
- **M10 — Counts are summed; shares are never averaged.** Each `cb_*` view publishes
  the finest grain its question needs — presence is one row per event and champion,
  beside that event's game count — and an answer aggregates with `sum(presence)`
  over `sum(games)`. Averaging per-event shares would weight an eighty-game MSI like
  a twenty-game event and would mean nothing outside the window it came from. The
  same rule is why an answer prints the denominator it divided by, not the one it
  started with.

## Family notes — how the answer shape differs

**Family 1, top-1 — the deliverable is a top-K, not a #1.** A single "most" is a
winner's curse: the champion that tops a table of 171 is usually the one whose small
sample got lucky. Every top-1 question therefore returns the five leading candidates
with their intervals, ordered by the lower bound, plus `regression to the mean` in
its limits: a share measured on a small `n` is expected to fall toward the pooled
rate on the next window, and the candidate list is a way of seeing the field rather
than a ranking of certainty. The K is printed; the order rule is printed; a tie at
the fifth place extends the list to six and says so rather than inventing a
tie-break.

**Family 2, yes/no with a low base rate — the denominator is the point.** A gate
question is answered as a share of the games it could have happened in, with its
interval. The measured extremes are instructive: 49 of 30,910 player-games hold 15
or more kills (0.16%), 401 hold 450 or more CS (1.3%), Teemo has been picked four
times ever and never banned. Faker's 700 Worlds kills is the opposite case — 822 as
of the pin, so the threshold is already crossed and the answer says "already true as
of the cut date" instead of printing a probability of a thing that happened. A
yes/no question without a date is a bug: the cut date is part of the URL.

**Family 3, count — the format simulation is a required step.** "How many unique
champions?" is not a share of a past tournament; it is a distribution over the
number of games a tournament will contain, which depends on its format. The step is
explicit:

1. Take the event's game count from its format (groups plus bracket, best-of, the
   series count) — for a completed event, `count(*)` over `game_facts`, so a game is
   counted once; for a future one, from the declared format in the event record.
2. Draw each game's champion set empirically from the window's per-game distribution
   (measured: 1.7 distinct champions per game, 38 to 118 champions per event over 52
   events, mean 70).
3. Simulate 10,000 tournaments with `random.Random(seed)`, count unique champions
   per replication, and report the median with a 90% interval.

The result is a range with its simulation count — "61 to 79 unique champions, 90% of
10,000 simulated tournaments" — never a single number. Differential patch coverage
inside the window is declared per M2.

**Family 4, A vs B — the exposure warning is mandatory.** Peyz has 635 kills in 110
games; Gumayusi has 1,056 in 237. "More total kills" is a question about exposure,
so the answer prints both totals, both per-game rates, and refuses a verdict when
the intervals overlap. HLE or T1 is ⚠️ for the reason in the next section. The
shortest game is reframed: nobody can say who wins a game that has not been played,
so the answer is the base rate over the shortest decile of the window — which side
wins the fast games — with its `n`, and the record holder (961 s, MSI 2019, Invictus
Gaming vs T1) as a citation rather than an answer.

**Family 5, categorical — census or estimate, never a blend.** Finals MVP is eleven
awards across eleven events and nine players, all of them unambiguous in role at
their event (Mid 5, Top 3, Bot 2, Support 1, Jungle 0). At `n = 11` the verdict is
`insufficient_data` for any probability, and the census is printed with its
denominator. The join is the trap: `fact_player_honour` joined to
`fact_player_game` on `(player_key, event_key)` fans out to every game the player
played, which reports 208 rows for eleven awards. The view aggregates to award grain
first and asserts one role per award.

## The three questions that are not yet answerable

They stay in the catalogue. Each carries the query that shows why, its result today,
and the decision that would unblock it. `verdict: not_verifiable` renders those three
things and nothing else.

**⚠️ 14 — Who places higher, HLE or T1?** No column states a placement. The only
trace of a stage is `dim_match.tab`, free text with 73 distinct values, and the
bracket is not a field.

```sql
select column_name from information_schema.columns
where table_name = 'dim_match' and column_name ilike '%place%';   -- 0 rows

-- Both teams in one event is common; a shared stage ladder is not.
with co_attended as (
  select f.event_key
  from fact_game_side f join dim_team t using (team_key)
  where t.team_name in ('T1', 'Hanwha Life Esports')
  group by 1 having count(distinct t.team_key) = 2
)
select e.event_name, m.tab, count(distinct m.match_key) as series
from co_attended join dim_event e using (event_key)
join dim_match m using (event_key)
where m.match_key <> 0
group by 1, 2 order by 1, 2;
```

Today: 7 co-attended events (MSI 2026, Worlds 2021 and 2024–2026, Esports World Cup
2025 and 2026). In Worlds 2025, T1 reaches `Finals` while HLE stops at
`Quarterfinals` — so the answer exists in the labels and nowhere in a column.
**Unblocked by:** a committed stage-order table per event (an ordered list of `tab`
values, with its source and its pin date), after which "furthest stage reached" is a
`max()` over a declared order instead of a string comparison. Until then the page
naming the query is the deliverable.

**⚠️ 17 — How many regions reach knockouts?** Two gaps, one query each.

```sql
-- A "knockout" is not a value: the labels are free text and 'Group Stage' is the
-- only group marker, while 'Bracket Round 1' and 'Quarterfinals' are both knockouts.
select count(distinct tab) from dim_match where tab <> '';                 -- 73
select tab, count(*) from dim_match group by 1 order by 2 desc;

-- The region is the registry's label today, not the team's region at the event:
-- two vocabularies coexist, and 5 registry rows state none (4 pseudo-teams and the
-- unknown member, none of which has a game).
select region, count(*) from dim_team where team_key <> 0 group by 1 order by 2 desc;
```

Today: 19 region strings, including `Europe` beside `EMEA` and `LMS` beside
`Asia Pacific`. Counting "regions in knockouts" therefore depends on when a team was
renamed, not on where it played. **Unblocked by:** (a) the stage-order table above,
and (b) a declared region-vocabulary mapping with the era it applies to. Both are
data decisions with a source, not a guess in a view.

**⚠️ 18 — Will an LCS team reach knockouts?** The field does not exist.

```sql
select count(*) from dim_event where league ilike '%LCS%';   -- 0
select column_name from information_schema.columns where table_name = 'dim_team';
-- team_key, team_id, team_name, short, overview_page, region: no league.
```

`league` is an event attribute (`World Championship`, `Mid-Season Invitational`, …),
never a team attribute, and no event in the corpus is an LCS event. The corpus is
international, so the LCS appears only as a *registry* row — `LoL Championship
Series`, one of the four pseudo-teams with no region and no games. **Unblocked by:**
a curated team → league mapping (with its validity dates, because rosters and
leagues move), or re-wording the question to "will a North American team reach
knockouts?", which `dim_team.region` can answer with the caveat in ⚠️ 17. The
re-wording is a product decision and is not taken here.

## Phase 4b — the backtest

A separate deliverable, built after 4a is green, on its own page. It is the only
thing that turns the catalogue from a set of plausible records into a measured one.
4a ships without it; 4b is not optional forever.

**Procedure, per edition N and per question family.**

1. **Fix the cut.** `cut_date` = the first game date of Worlds N, minus one day. Only
   games with `dim_game.date_time_utc < cut_date` enter the training window; the
   window is the trailing 12 months, so the previous international cycle is in and
   the edition being scored is out.
2. **Fix the patch coverage.** Report the share of training games whose patch equals
   the event's first patch. A family whose coverage is below the declared minimum
   (a named constant, default 20%) is reported as not scored for that edition,
   rather than scored on a weaker transfer.
3. **Generate the ranking.** Run each 4a question on the training window and keep
   its top-K (K = 5), with intervals, exactly as published.
4. **Observe the outcome, from facts.** Presence at Worlds N is measured from the
   event's own draft rows. The participating teams are the teams that appear in
   `fact_game_side` for that event — the real list, read from the data on every run,
   never a roster assumed for the year.
5. **Score.** `precision@K = |topK ∩ observed| / K`, and Spearman's ρ between the
   candidate ranking and the observed presence counts. Both are reported with K and
   the candidate pool size.
6. **Baselines, or the number means nothing.** Random-K over the champions released
   before the cut (expected `K · m / pool`), and carry-over top-K from the previous
   edition. A family that does not beat carry-over has not been calibrated, it has
   been restated.

**Deliverables.** `pipeline/backtest.py` (deterministic, seeded, no network) →
`public/data/calibration.json`, and `/calibracion`: one row per edition
and family, with precision@K, Spearman, the baseline, the patch coverage, the
participant list, and the training window. Every row links to the question it
scored.

**Constraints.** No information from after the cut date may enter the training
side, including honour rows (`fact_player_honour` is stated per event and would leak
the answer to "which role wins Finals MVP"). No tuning of K per edition after seeing
the score: K is fixed at 5 and any change is a spec change with its own backtest.

**Acceptance for 4b.** Recomputing one edition by hand with the SQL printed on the
page reproduces the published precision@K and ρ to the digit; a test asserts the
recorded values for a fixed seed; and `/calibracion` states, in words, which
families it could not score and why.

## Deferred / Roadmap

**Prediction is postponed, not removed.** Match-winner probability, tournament-winner
probability, scorelines, ratings (Elo, Glicko or any other), any supervised model,
and the interactive head-to-head "who should I pick" page are **not part of phase
4**. They are on the roadmap as **Phase 6 — Prediction**, deferred and unscheduled
(phase 5 stays the design pass). The earlier head-to-head plan is rehomed there, and
it goes with its own record intact: that plan was careful — two teams' games, the
record with its `n`, a small-sample warning, and no predicted winner — but a page
built to answer "which of these two should I pick?" is read as a recommendation
whatever it prints, and the product decision was to keep it out of the phase whose
deliverable is a catalogue of records. Its two durable decisions (the pair is a
filter on games, not a new table; the sample warning is a component, not a copy
tweak) are recorded in `docs/specs/README.md`, so relaunching it loses nothing.

Why it is deferred rather than refused:

- **The data is international only.** 3,091 games, 2,068 series, ~120 games at a
  typical Worlds. Of the 1,023 team pairs that have ever met, 282 have met exactly
  once, and the largest rivalry in the corpus is 40 games. A model over pairs this
  thin would output certainty the evidence does not carry — the exact failure the
  product spec was written against.
- **The inputs a prediction needs are absent.** No rosters, no contract dates, no
  domestic-league form, no scrims, no travel, no bracket context. `dim_player` is a
  handle; `dim_team` is a name and a region. A "recent form" block over international
  games can span eighteen months.
- **Temporal validation would have to be built first.** Phase 4b builds the
  machinery — cut dates, held-out editions, baselines — for descriptive questions.
  Prediction should reuse it, and should not exist before it.
- **The product stance changes only by evidence.** Today the honest sentence is "here
  is the record". After 4b we will know whether any ranking beats carry-over at all;
  if none does, the deferral becomes a refusal and that will be a documented finding
  rather than a taste.

**Definition of ready for phase 6.** All four, not three: (1) phase 4b is green on at
least four Worlds editions and reports precision@K and ρ against both baselines;
(2) the dataset gains rosters with contract dates, or domestic-league games, or a
declared external ranking source with its licence; (3) a calibration story exists —
a predicted probability that carries its log-loss and a reliability curve, in the
same `Answer` shape, so a probability can never ship without the evidence that it
was calibrated; (4) the answer contract is extended with `prediction` fields in a
spec, not in a component.

## Non-goals

Only what this phase does not do, each pointing at where it went:

- **Match or tournament winner prediction — deferred to phase 6** (see Deferred).
- **Any supervised model, rating or form index — deferred to phase 6.**
- **The interactive head-to-head comparison — deferred to phase 6.**
- **Metrics the dataset does not carry**: per-minute gold, gold leads at 15, CS per
  minute, damage share, player ratings. Not deferred; they are absent from the
  model, and dividing by a game length that changed across eras would invent them.
- **Silent filtering of small samples.** A question under the threshold renders
  `insufficient_data` with its counts, never a bare number and never an empty page.
- **A free-text question box.** The catalogue is closed (R13); a model over an open
  question is phase 6 or later, and a keyword matcher pretending to be one is not a
  product.

## Constraints

- **No backend, no runtime query engine.** The answers are precomputed by
  `pipeline/crystal_ball.py` into `public/data/answers.json`, committed and
  checksummed like every other artifact. The browser filters and paints; it never
  computes an interval (R4).
- **The logic lives in DuckDB views.** `pipeline/sql/09_crystal_ball.sql` holds the
  `cb_*` views; the Python step applies the threshold, computes intervals and
  assembles the record. A number that exists only in a component does not exist.
- **Determinism.** Fixed seeds, no timestamps, sorted keys, `--check` byte-compares
  the artifact. A bootstrap or simulation that is not reproducible is not an
  artifact.
- **Payload.** `answers.json` is one record per question and window, well under
  100 KB gzip, and loads only on `/answers`. The eager set is unchanged.
- **The pin is the source of truth.** Every answer carries its view, artifact and
  `sha256`, consistent with `public/data/meta.json`; a re-pin that moves a number is
  a diff, not a silent change.
- **No invented fields.** Every column referenced here is in
  `data/model/data-dictionary.md`; a query that needs one that is not is a ⚠️
  question, not a new column.

## Design decisions

- **One catalogue, one shape.** Eighteen questions that each invent their own layout
  become eighteen places for a missing denominator. The `Answer` contract is the
  single seam, and its schema rejects a record whose headline has no `n`.
- **Insufficient data is a first-class answer.** The verdict is an enum value, not a
  copy tweak, so the page cannot accidentally print a point estimate next to
  "small sample" — the state is structural.
- **Top-K by the lower bound, not the point estimate.** Ordering by the estimate
  rewards the luckiest small sample; ordering by the lower bound asks "how good is
  this candidate if it is as bad as the evidence allows", which is the question a
  pick'em reader is actually asking.
- **Wilson, not Wald.** Stated with its reason in M3, because the low-base-rate
  family is exactly where the two disagree and exactly where this catalogue lives.
- **The cut date is in the URL.** An answer without a date is unfalsifiable; with
  the date in the query string, a shared link is a claim with its own expiry.
- **KDA's rule changes, and the change is written down.** `metric-definitions.md`
  said KDA is "never in a leaderboard". The crystal ball ranks it, so the definition
  becomes: ranked only inside the `Answer` contract, always with its game count, its
  interval and the `n ≥ 20` gate, never in a table where a 410-game career sits
  beside a 12-game one. The rule tightens rather than disappears.
- **The three ⚠️ questions ship as pages, not as omissions.** A reader who asks
  "who placed higher" deserves the query and its result, not a 404 that looks like a
  bug in the navigation.
- **4a and 4b are separate.** The catalogue is useful before it is calibrated, and
  calibrating it is a different kind of work with a different failure mode. Mixing
  them would let an uncalibrated answer borrow the credibility of a backtest page.

## Test seams

- **`pipeline/sql/09_crystal_ball.sql`** — the `cb_*` views. Tested through the
  pipeline tests, not by eye, because each one has a grain trap.
- **`pipeline/tests/test_crystal_ball.py`**
  - Wilson bounds against hand-computed values, including `p = 0` and `p = 1`
    (the interval is wide, not empty), and `n = 4` (Teemo).
  - Presence is `pick ∪ ban` and counts a champion once per game: the three
    blind-pick games with the same champion on both sides.
  - The IEM 2013 game with 8 pick slots against 10 players is reported as a ban/pick
    completeness gap, and no presence figure is published while it is.
  - Duration is averaged over 3,084 games, not 6,168 side rows.
  - Damage answers report the rows that state damage (15,870), not 30,910.
  - Every proportion below `n = 20` produces `insufficient_data` and no interval.
  - `fact_player_honour` joined at award grain gives 11 rows, not 208.
- **`src/lib/answer.ts`** — `formatAnswer`, `verdictOf` and `assertShape` are pure:
  a record whose headline lacks `n`, or whose `candidates` are unordered by
  `lower_bound`, is rejected. Fixtures: answered, insufficient, not-verifiable, and a
  top-K with a tie at K.
- **`src/components/Answer.tsx`** — a render test asserts the headline matches
  `number (95% CI: a–b%, n=c)`, that the four blocks are all present, and that the
  `limits` text is in the DOM rather than behind a `title`.
- **Data test** — `answers.json` covers all eighteen ids; every `source.sha256`
  matches the artifact's entry in `meta.json.artifacts`; every
  `verdict: insufficient_data` record has no `interval`;
  every `verdict: not_verifiable` record carries a `verification.query`.
- **Backtest test** — for a fixed seed and a fixed edition, precision@K and Spearman
  equal the recorded values, and no training row postdates the cut.
- **A test that no answer silently aggregates patches**: every record lists its
  patches or states `all patches`.

## Acceptance criteria

- [ ] `/answers` lists eighteen questions by family, each with its verdict.
- [ ] `/answers/champion-presence?competition=Worlds&year=2025&cut=2025-11-09`
      renders a top-K of five with intervals, the order rule and the K.
- [ ] A champion win-rate question at Worlds 2025 renders `insufficient_data` for the
      champions under 20 picks, with their counts still visible.
- [ ] No answer renders a number without its `n`; a render test proves it.
- [ ] The three ⚠️ questions render their query, its result and the unblocking
      decision, and no number that reads as an answer.
- [ ] Every answer names its window's patches and its cut date.
- [ ] Every answer's limits name the selection bias (only qualified teams).
- [ ] `answers.json` is deterministic: `npm run data:check` is green, and a rebuild
      produces byte-identical output.
- [ ] Every `source.sha256` matches `meta.json`.
- [ ] `npm run check` passes, and the deployed site serves `/answers/:id` from a
      cold deep link.

## Verification

```bash
npm run data:build && npm run check

# the presence rule, by hand: pick ∪ ban, once per game
duckdb -c ".read pipeline/sql/01_semantic_views.sql" \
       -c ".read pipeline/sql/09_crystal_ball.sql" \
       -c "select champion_name, presence, games, round(presence::double/games, 3)
           from cb_champion_presence where event_name = 'Worlds 2025'
           order by presence desc limit 5;"
# then the same question on /answers/champion-presence must print that pair,
# its Wilson interval and its n — not a percentage on its own.

# the three ⚠️ queries are printed verbatim in the sections above; run them
# before shipping the pages, because their results are what the pages claim.
```

## Open assumptions

- **That a closed catalogue is the right shape.** The pick'em asks roughly these
  questions; a fixed list of eighteen can be audited, checked against the schema and
  backtested. If readers want a nineteenth every week, the answer is a spec change
  per question — the audit table is the cost, and paying it is the point.
- **That `n ≥ 20` is the right threshold.** It is a named constant, not a law: at a
  single event most champion questions fall under it, which will make the crystal
  ball answer "insufficient data" more often than a reader might like. Lowering it
  is allowed once 4b shows what precision the answers actually carry; lowering it
  without that is how a site starts printing noise with a confidence interval.
- **That the top-K framing survives the pick'em.** A reader may want one name. The
  list is the honest version of one name, and the page will be judged on whether the
  first candidate is usually in the tournament's real pool — which is precisely what
  4b measures.
- **That the deferred prediction phase is reachable.** If the dataset gains no
  rosters and no domestic games, phase 6 stays deferred indefinitely, and the
  deferral turns into the product spec's original refusal — a documented outcome, not
  a silent one.
