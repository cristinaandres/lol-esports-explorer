# Phase 4 — The Almanac (the crystal ball)

Status: round 4a — **in build: tickets 00–03 built, 04–08 planned**; round 4b (the backtest) is a
section of this document, not a second spec. Amended 2026-11-26 after the pin audit:
the page is **The Almanac**, the catalogue is **generic** and grouped by **class**
rather than by answer family, the windows are **seasons derived from Worlds**, and the
champion-deaths card is a **champion KDA** card. `docs/analysis/crystal-ball-audit.md`
carries the queries and the figures behind every change. The tickets are in
`docs/specs/tickets/2026-11-20-phase-4-crystal-ball/`.

## Objective

Before an international event the pick'em asks recurring questions: which champion
was present most, will a player reach fifteen kills, how many champions will be
drafted, which role takes Finals MVP. The dataset can answer most of them today, and
it can answer them *with their denominator*, which is the only thing this site
promises.

The Almanac is a closed catalogue of eighteen **generic** questions in four classes —
champions, players, teams, events — each answered as a record: a number, its
interval, the sample it was measured on, the season it came from, and the sentences
that say what it does not license anyone to conclude. It is descriptive and
probabilistic. It does not predict a match, and "Deferred / Roadmap" says where
prediction moved to.

A question that names a player or a team — Faker's 700 kills, Peyz vs Gumayusi, HLE
vs T1, an LCS team — is **deferred**, not dropped: the generic question replaces it
now, and the named page returns when the catalogue has the comparison family and the
source has a placement. The four deferred questions keep their queries in this
document.

## The catalogue — eighteen generic cards

| # | Class | Card (`id`) | Question | Family | Method | Ends |
|---|---|---|---|---|---|---|
| 1 | Champions | `champion-presence` | Which champion was present in the most games? | top-1 | pick ∪ ban per game; Wilson | best |
| 2 | Champions | `champion-win-rate` | Which champion won the most, and the least? | top-1 | picks won / picks; Wilson; `n ≥ 20` picks | best + worst |
| 3 | Champions | `champion-kda` | Which champion had the best KDA, and the worst? | top-1 | KDA bootstrap; kills, deaths, assists and KP in the table | best + worst |
| 4 | Champions | `unique-champions` | How many distinct champions will a season hold? | count | seeded Monte Carlo over the format; median + 90% | — |
| 5 | Champions | `teemo-picked` | Will Teemo be picked? | yes-no | games with Teemo / eligible games; Wilson | — |
| 6 | Players | `player-kda` | Which player had the best KDA? | top-1 | KDA bootstrap; `n ≥ 20` player-games | best |
| 7 | Players | `player-kills` | Which player got the most kills per game? | top-1 | kills / games; bootstrap; totals beside the rate | best |
| 8 | Players | `player-kill-participation` | Which player took part in the most of their team's kills? | top-1 | (kills + assists) / team kills; Wilson | best |
| 9 | Players | `player-damage` | Which player dealt the most damage per game? | top-1 | damage / rows stating damage; bootstrap | best |
| 10 | Players | `player-kills-threshold` | Will a player reach 15 kills in a game? | yes-no | player-games with `kills ≥ 15` / player-games; Wilson | — |
| 11 | Players | `player-cs-threshold` | Will a player reach 450 CS in a game? | yes-no | player-games with `cs ≥ 450` / player-games; Wilson | — |
| 12 | Teams | `team-win-rate` | Which team won the most, and the least? | top-1 | sides won / sides; Wilson; `n ≥ 20` team-games | best + worst |
| 13 | Teams | `team-kills` | Which team got the most kills per game? | top-1 | kills / rows stating kills; bootstrap | best |
| 14 | Teams | `team-gold` | Which team got the most gold per game? | top-1 | gold / rows stating gold; bootstrap | best |
| 15 | Events | `game-length-32` | More games before or after 32:00? | yes-no | games ≤ 1920 s / games stating a duration; Wilson | — |
| 16 | Events | `shortest-game` | Who wins the shortest game? | yes-no | blue-side share of the shortest decile; Wilson | — |
| 17 | Events | `finals-mvp-role` | Which role wins Finals MVP? | categorical | census at award grain; `n = 11` | — |
| 18 | Events | `region-knockouts` | How many regions reach knockouts? | categorical | ⚠️ `not_verifiable` — no stage column, no region era | — |

Ten top-1 cards, five shares, one count and two categorical cards; twenty-one records
because three cards carry a best and a worst end. The record ids follow the table, so
the schema and the audit can be checked row by row.

**What the audit established, measured on the pin.**

- **Presence is not one field.** Picks live on `fact_player_game`; bans live on
  `fact_draft_slot`. They disagree by two rows: 30,908 pick slots against 30,910
  player rows, because one game (IEM 2013, Gambit Gaming vs Millenium) records 8 pick
  slots for 10 players. Picks therefore come from the player rows and bans from the
  draft slots. Three games state picks and no bans (MSC 2020, blind pick); three games
  have the same champion on both sides, and presence counts a champion once per game.
- **`duration_seconds` is a game measure repeated on both side rows** — 6,168 rows for
  3,084 games that state a length. Any share over it must deduplicate.
- **`damage` is stated on 15,870 of 30,910 player rows.** `kills`, `deaths`, `assists`
  and `cs` are stated on all 30,910; `gold` on 29,160; `vision` on 19,610. Side kills
  and side gold are stated on 5,624 of 6,182 rows. A measure's denominator is the rows
  that state it, and the page says so.
- **The threshold bites hardest where it should.** 156 of 171 champions reach 20
  picks across the whole corpus, but only 13 reach 20 picks inside the 84 games of
  Worlds 2025 and 32 reach 20 games of presence. A per-season champion question will
  often answer `insufficient_data`, and that is the honest outcome.
- **The corpus is international only.** Every "will X happen" answer is conditioned
  on a team that qualified; the domestic season that got it there is absent. Every
  answer says so in its limits.
- **The pin corrects three spec claims**: Faker has 667 Worlds kills, not 822; a game
  has 10.0 picked champions (19.2 by presence), not 1.7; Teemo's four picks are 4 of
  3,091 games, not 4 of 30,910 player-games. The dossier has the queries.

## Seasons, the window

A question about a future event is answered from a window of the past, and the window
this round publishes is the **season**. Season N runs from **the day after Worlds
N−1's final to Worlds N's final**; season 2011 starts at the first game of the
corpus. A season ends with Worlds, which is the product's definition, not the calendar
year. On this pin the two disagree once: **IPL 5 (29 Nov – 3 Dec 2012) belongs to
season 2013**, because Worlds 2012 ended on 14 October 2012. Every other event falls
in its own year.

- **Windows.** `all` (the corpus) plus `season:2011` … `season:2026`. "All" is the
  default; a season is selected on the entry page and in the URL.
- **Cut date.** The season's last game — the Worlds final that closes it — or the
  corpus's last game for `all`. The page prints it.
- **Patches.** A season lists every patch in it (season 2025: 25.05, 25.13, 25.2), or
  says `all patches` for `all`. A window never aggregates patches silently.
- **Deferred window kinds.** Eras, relative ranges ("last 6 months", "last year") and
  event windows are **not in 4a**. They multiply the precomputed records and the
  bootstrap cost; the page starts with seasons and can add them with the measured
  cost in hand.

## Required behavior

- **R1** `/almanac` lists the eighteen cards grouped by class — Champions, Players,
  Teams, Events — each with its question, its family as a tag, its verdict and the
  headline of the default window. The family is a tag, not the navigation.
- **R2** `/almanac/:id` renders exactly one `Answer` for one window:
  `?season=2025`, `?end=worst` on a two-ended card, `?top=10` for a wider ranking. A
  question id that is not in the catalogue is a 404, not an empty answer. A season the
  artifact does not carry says so and names the seasons it does.
- **R3** Every answer renders the four blocks of the contract — headline, evidence,
  limits, source — and there is no code path that renders one without the others. A
  number without its interval and its `n` is a bug, the same way a share without its
  denominator is.
- **R4** Every proportion carries a Wilson interval at 95%, computed once, in the
  pipeline, and never recomputed in the browser. It is printed with its level and its
  `n`: `34% (95% CI: 28–41%, n=112)`.
- **R5** `n ≥ 20` is the publication threshold, configurable in one place. Below it
  the verdict is `insufficient_data`, the headline says so in words, and no interval or
  point estimate is printed. The counts stay visible as a census: a count is not a
  claim about the future, and hiding it would be the silent filtering this product
  refuses.
- **R6** A top-1 card returns a **top-K**, five by default (the record stores up to
  twenty; the page offers 5, 10 and 20). The best end is ordered by the lower bound,
  the worst by the upper bound; the page prints the rule and the K. A tie at the last
  shown place extends the list by one and says so rather than inventing a tie-break.
- **R7** Every answer names its season's patches, or says `all patches`, and its cut
  date. A window that spans several patches says so; a champion's presence is where
  it was played, not where it will be.
- **R8** Every answer states its cut date: the season's last game, printed beside the
  window. An answer is a record as of a date, never as of "now".
- **R9** Every answer states the role it is scoped to when the subject is a champion.
  In 4a the scope is `all roles`, from `fact_player_game.role` and never from the
  champion's design; a role filter is a later round.
- **R10** Every answer states the selection bias in its limits: the corpus holds only
  events a team qualified for, so a player's record is a record of the games they
  reached.
- **R11** A card whose verdict is `not_verifiable` renders the verification query, its
  result today and the decision that would unblock it. It renders no number that would
  look like an answer, and no chart.
- **R12** An answer links only to routes that exist: `/players/:id`, `/teams/:id`,
  `/champions/:id`, `/events/:id`, `/games/:id`. `/calibracion` is linked only after
  round 4b ships it.
- **R13** The catalogue is closed and versioned. A new question is a spec change and a
  new row in this table, not a runtime string.
- **R14** The season is derived from Worlds, never read from `dim_event.year`; the
  pipeline asserts one season per event, and the page states the one event whose season
  differs from its year on the season it belongs to.
- **R15** A card's evidence body is a table plus a chart, and **no chart renders
  without its table** (or, where a table is impossible, without its `n` and its
  denominator in the caption). The chart is a view of the table; the table is the
  accessible source. The number is never only in a tooltip.
- **R16** The controls are query parameters — `season`, `end`, `top` — so every view
  is a link. Changing one re-renders from the artifact; it never recomputes a number.
- **R17** The source line prints the pin's `manifestSha256` (the source the number came
  from), and `meta.json` keeps the artifact's own hash. A file cannot contain its own
  hash; the two records are different proofs.

## The answer contract

One component, one artifact shape, one JSON schema. A question that cannot fill the
shape cannot be published.

### Component — `src/components/Answer.tsx`

```
┌ Answer ────────────────────────────────────────────────────────────────┐
│ 64% (95% CI: 57–70%, n=232) presence    [Season 2025 · 25.05, 25.13, 25.2] │
│ ───────────────────────────────────────────────────────────────────────│
│ Evidence   presence · 148 of 232 games · Wilson 95% · cut 2025-11-09    │
│ Limits     · only teams that qualified appear in the corpus             │
│            · three patches in one season: not a statement about the next │
│            · a presence is a pick or a ban, not a probability           │
│ Source     cb_game_presence · almanac-champion-presence.json · pin 9f2c… │
└─────────────────────────────────────────────────────────────────────────┘
```

`Answer` takes one window record and renders: the headline with number, uncertainty
and `n` together; the evidence line (metric, part, `n`, denominator, interval, window,
cut date); a `limits` list of at most four short sentences; the source line with the
pin's checksum. The verdict is a labelled chip (`answered`, `insufficient_data`,
`not_verifiable`) so colour never carries it alone. `limits` is visible text, never
behind a hover.

### Artifact — one file per question, one index

`almanac.json` is the index: eighteen cards with their class, family, question,
default-window headline and the artifact name. `almanac-<id>.json` is one question:
the thresholds, the source, the shared limits, the windows and the series the chart
reads. A page fetches the index and its own file, never the other seventeen.

```json
{
  "id": "champion-presence",
  "class": "champions",
  "family": "top-1",
  "question": "Which champion was present in the most games?",
  "thresholds": {"min_n": 20, "top_k": 5, "top_max": 20, "resamples": 10000},
  "source": {"view": "cb_game_presence", "artifact": "almanac-champion-presence.json", "sha256": "<pin manifestSha256>"},
  "limits": ["Only teams that qualified for an international event appear.", "..."],
  "windows": [{
    "key": "season:2025", "label": "Season 2025", "season": 2025,
    "date_from": "2025-03-10", "date_to": "2025-11-09", "cut_date": "2025-11-09",
    "patches": ["25.05", "25.13", "25.2"], "games": 232, "events": 4,
    "records": {
      "best": {
        "verdict": "answered",
        "headline": {"text": "64% (95% CI: 57–70%, n=232)", "value": 0.638, "unit": "share", "n": 232,
                     "interval": {"level": 0.95, "low": 0.574, "high": 0.697, "method": "wilson"}},
        "evidence": {"metric": "presence", "value": 0.638, "part": 148, "n": 232, "denominator": 232,
                     "grain": "game", "role": null},
        "candidates": [{"name": "Azir", "path": "/champions/ch-…", "metric": 0.638, "part": 148, "n": 232,
                        "interval": {"level": 0.95, "low": 0.574, "high": 0.697, "method": "wilson"},
                        "lower_bound": 0.574, "upper_bound": 0.697}],
        "top": 5
      }
    }
  }],
  "series": [{"bucket": "season", "label": "2025", "value": 0.638, "part": 148, "n": 232,
              "interval": {"level": 0.95, "low": 0.574, "high": 0.697, "method": "wilson"}}]
}
```

The schema (`public/schema/answer.json`, shipped in ticket 01) adds `class`, `end`,
`top`, `part`, `census`, `simulation` and `verification`, and enforces these rules
structurally:

- a top-1 `answered` record carries `candidates`, ordered by the end's rule, no more
  than `top`;
- a `not_verifiable` record carries `verification: {query, result_today, unblocked_by}`
  and no headline value;
- an `insufficient_data` record carries no interval, and carries `census` when it has
  counts;
- a `simulation` interval uses `level: 0.9` and `method: "simulation-percentile"`;
  a `share` uses Wilson at 0.95; a ratio uses `bootstrap-percentile` at 0.95.

There is no shape in which a small sample acquires an interval, or a named question
without its verification.

### Three worked examples, with real numbers from the pin

**Presence, season 2025, cut 2025-11-09.**

> **64% (95% CI: 57–70%, n=232)** — Azir was present in 148 of the season's 232 games.
> The season spans three patches (25.05, 25.13, 25.2); presence counts a ban and a
> pick the same way, once per game.
> **Limits:** only teams that qualified appear; three patches in one season means this
> is where the champion was played, not where it will be; a presence is a pick or a
> ban, not a probability.

**Champion KDA, season 2025, cut 2025-11-09.**

> **8.44 (95% CI: 5.25–14.95, n=21)** — Senna's 21 champion-games: 79 kills, 34
> deaths, 208 assists. The table carries kill participation beside it, and the page
> toggles to the worst end.
> **Limits:** KDA is a ratio of counts, not a share, so the interval is a bootstrap;
> 21 champion-games is a small sample and the interval says so; only teams that
> qualified appear.

**Game length, all games, cut 2026-11-14.**

> **49% (95% CI: 47–51%, n=3,084)** — 1,513 games finished at or under 32:00.
> **Limits:** seven games state no duration and leave the denominator; a game is
> counted once even though its length is repeated on both side rows; the era mix is
> not held constant, and game length drifted across fifteen years, so the pooled share
> is not any one era's share.

## Methodological rules

- **M1 — Presence is pick ∪ ban, per game.** Picks from
  `fact_player_game.champion_key`; bans from `fact_draft_slot` where `phase = 'ban'`.
  A champion present twice in one game — both sides picked it in the three blind-pick
  games — counts once. The four incomplete-draft games are named in the answer's
  limits while they remain.
- **M2 — The season's patches are always explicit.** A window names its patches or
  says `all patches`. 279 games carry `patch_key = 0`: they are inside or outside a
  season by a stated rule, never by accident.
- **M3 — Wilson for proportions, always with `n`.** Wald intervals are not used: they
  collapse to a zero-width interval at `p = 0` and `p = 1`, which is exactly the
  low-base-rate case this catalogue is full of.
- **M4 — A ratio of counts is not a proportion.** KDA, kills per game, damage per
  game, team kills and team gold use a bootstrap percentile interval (10,000
  resamples, fixed seed recorded in the artifact) and print the method. Wilson is
  reserved for `part / total` over one denominator.
- **M5 — Below `n ≥ 20`, no estimate.** The verdict is `insufficient_data`, the
  headline says so, and no interval or probability is drawn. The raw counts stay
  visible as a census. The threshold lives in one constant, is copied into the
  artifact as `thresholds.min_n`, and is never re-derived in the browser.
- **M6 — The role is explicit where the subject is a champion.** 4a answers at
  `all roles` and prints it; a later round can ask by role from
  `fact_player_game.role`, with the canonical order `Top, Jungle, Mid, Bot, Support`.
  A champion's role is where the corpus played it, never its design.
- **M7 — Selection bias is printed, not implied.** The corpus is international only:
  54 admitted events, no domestic league game, no roster table, no contract dates.
  "Will Teemo be picked?" is really "given a qualified field, was Teemo picked?" — and
  the answer's limits say so in those words.
- **M8 — Most played is not most likely.** A champion's presence share is a historical
  frequency under the patches it was measured on. "Azir was in 148 of 232 games in
  season 2025" is a fact; "Azir will be in 64% of season 2026" is a different sentence
  and this round does not print it.
- **M9 — A game-level measure is counted once per game.** `duration_seconds` is
  repeated on both side rows; the views read `game_facts` and count games.
- **M10 — Counts are summed; shares are never averaged.** Each `cb_*` view publishes
  the finest grain its question needs; an answer aggregates with `sum(part)` over
  `sum(total)`. Averaging per-season shares would weight a 28-game season like a
  325-game one and would mean nothing outside the window it came from.
- **M11 — The season is derived from Worlds.** Season N runs from the day after Worlds
  N−1's final to Worlds N's final; the pipeline asserts one season per event and
  records the one event whose season differs from its calendar year.

## Family notes

**Top-1 — the deliverable is a top-K, not a #1.** A single "most" is a winner's
curse: the champion that tops a table of 171 is usually the one whose small sample got
lucky. Every top-1 card returns five candidates with their intervals, ordered by the
lower bound (best end) or the upper bound (worst end), plus regression to the mean in
its limits. The K and the order rule are printed; a tie at the last shown place
extends the list by one.

**Yes/no — the denominator is the point.** A gate question is answered as a share of
the games it could have happened in, with its interval. The measured extremes are
instructive: 49 of 30,910 player-games hold 15 or more kills (0.16%), 401 hold 450 or
more CS (1.3%), Teemo has been picked in 4 of 3,091 games and never banned. The
shortest-game card is a share of the shortest decile, not a team prediction; the
record holder is a citation.

**Count — the format simulation is a required step.** "How many unique champions?" is
a distribution over the number of games a season will contain. The step is explicit:
take the season's game count, draw each game's observed pick set (8–10 champions, mean
10.0), simulate 10,000 seasons with `random.Random(seed)` (or numpy's generator), and
report the median with a 90% interval. The result is a range with its replication
count, never a single number.

**Categorical — census or estimate, never a blend.** Finals MVP is eleven awards
across eleven events and nine players, all unambiguous in role at their event (Mid 5,
Top 3, Bot 2, Support 1, Jungle 0). At `n = 11` the verdict is `insufficient_data` for
any probability, and the census is printed with its denominator. The join is the trap:
`fact_player_honour` joined to `fact_player_game` on `(player_key, event_key)` fans out
to every game the player played, which is 208 rows for eleven awards. The view
aggregates to award grain first and asserts one role per award.

**The comparison family is not in 4a.** It left with the named-entity questions; the
shortest-game card is a share, not an A/B. The family returns with the named pages or
in phase 6.

## The question that is not yet answerable

It stays in the catalogue. It carries the query that shows why, its result today and
the decision that would unblock it. `verdict: not_verifiable` renders those three
things and nothing else.

**⚠️ 18 — How many regions reach knockouts?** Two gaps, one query each.

```sql
-- A "knockout" is not a value: the labels are free text and 'Group Stage' is the
-- only group marker, while 'Bracket Round 1' and 'Quarterfinals' are both knockouts.
select count(distinct tab) from dim_match where tab <> '';                 -- 73
select tab, count(*) from dim_match group by 1 order by 2 desc;

-- The region is the registry's label today, not the team's region at the event:
-- two vocabularies coexist, and 5 registry rows state none (4 pseudo-teams and the
-- unknown member, none of which has a game).
select coalesce(region, '<null>'), count(*) from dim_team where team_key <> 0 group by 1 order by 2 desc;
```

Today: 19 region strings including the null, with `Europe` beside `EMEA` and `LMS`
beside `Asia Pacific`. Counting "regions in knockouts" therefore depends on when a
team was renamed, not on where it played. **Unblocked by:** (a) a committed stage-order
table per event (an ordered list of `tab` values, with its source and pin date), and
(b) a declared region-vocabulary mapping with the era it applies to. Both are data
decisions with a source, not a guess in a view.

## Deferred named-entity questions

They are not in 4a, and they keep their queries so relaunching them loses nothing. The
generic card that replaces each one is named beside it.

**Faker's 700 Worlds kills → `player-kills`.** The pin has 667 kills in 184 Worlds
player-games (1,484 in 410 games across every event), so the threshold is 33 short,
not crossed as the old spec said. The generic card asks which player gets the most
kills per game.

```sql
select sum(pg.kills), count(*)
from fact_player_game pg join dim_player p using (player_key)
join dim_event e using (event_key)
where p.player_name = 'Faker' and e.league = 'World Championship';
```

**Peyz vs Gumayusi → `player-kills` and `player-kda`.** Peyz has 635 kills in 110
games; Gumayusi has 1,056 in 237. "More total kills" is a question about exposure, so
the generic card shows a per-game rate, and the totals beside it, and refuses a
verdict when the intervals overlap. The comparison family and its exposure warning
return with the named pages.

**HLE vs T1 → `team-win-rate`.** No column states a placement: `dim_match.tab` is free
text with 73 values and the bracket is not a field. They co-attended 7 events; at
Worlds 2025 T1 reached `Finals` while HLE stopped at `Quarterfinals`, so the answer
exists in the labels and nowhere in a column. **Unblocked by:** a committed stage-order
table per event.

```sql
select column_name from information_schema.columns
where table_name = 'dim_match' and column_name ilike '%place%';   -- 0 rows
```

**An LCS team in knockouts → `region-knockouts`.** `league` is an event attribute,
never a team attribute, and no event in the corpus is an LCS event; the LCS appears
only as a registry row with no region and no games.

```sql
select count(*) from dim_event where league ilike '%LCS%';   -- 0
select column_name from information_schema.columns where table_name = 'dim_team';
-- team_key, team_id, team_name, short, overview_page, region: no league.
```

## Phase 4b — the backtest

A separate deliverable, built after 4a is green, on its own page. It is the only thing
that turns the catalogue from a set of plausible records into a measured one.

**Procedure, per edition N and per question family.**

1. **Fix the cut.** `cut_date` = the first game date of Worlds N, minus one day. Only
   games with `dim_game.date_time_utc < cut_date` enter the training window; the
   window is the trailing 12 months, so the previous international cycle is in and the
   edition being scored is out. These are not the 4a season windows; the backtest
   scores an edition, not a season.
2. **Fix the patch coverage.** Report the share of training games whose patch equals
   the event's first patch. A family whose coverage is below the declared minimum
   (default 20%) is reported as not scored for that edition.
3. **Generate the ranking.** Run each **generic** 4a card on the training window and
   keep its top-K (K = 5), with intervals, exactly as published.
4. **Observe the outcome, from facts.** Presence and win rate at Worlds N are measured
   from the event's own draft and side rows. The participating teams are the teams
   that appear in `fact_game_side` for that event, read from the data on every run.
5. **Score.** `precision@K = |topK ∩ observed| / K`, and Spearman's ρ between the
   candidate ranking and the observed presence counts, with K and the pool size.
6. **Baselines.** Random-K over the champions released before the cut (expected
   `K · m / pool`), and carry-over top-K from the previous edition. A family that does
   not beat carry-over has not been calibrated, it has been restated.

**Deliverables.** `pipeline/backtest.py` (deterministic, seeded, no network) →
`public/data/calibration.json`, and `/calibracion`: one row per edition and family,
with precision@K, Spearman, the baseline, the patch coverage, the participant list and
the training window. Every row links to the card it scored.

**Constraints.** No information from after the cut date may enter the training side,
including honour rows. No tuning of K per edition after seeing the score: K is fixed
at 5 and any change is a spec change with its own backtest.

**Acceptance for 4b.** Recomputing one edition by hand with the SQL printed on the page
reproduces the published precision@K and ρ to the digit; a test asserts the recorded
values for a fixed seed; and `/calibracion` states, in words, which families it could
not score and why.

## Deferred / Roadmap

**Prediction is postponed, not removed.** Match-winner probability, tournament-winner
probability, scorelines, ratings (Elo, Glicko or any other), any supervised model, and
the interactive head-to-head "who should I pick" page are **not part of phase 4**. They
are on the roadmap as **Phase 6 — Prediction**, deferred and unscheduled (phase 5 stays
the design pass). The named-entity questions above are deferred with them: they need
the comparison family, a placement table, or both.

Why it is deferred rather than refused:

- **The data is international only.** 3,091 games, 2,068 series, ~120 games at a
  typical Worlds. Of the 1,023 team pairs that have ever met, 282 have met exactly
  once, and the largest rivalry in the corpus is 40 games. A model over pairs this thin
  would output certainty the evidence does not carry.
- **The inputs a prediction needs are absent.** No rosters, no contract dates, no
  domestic-league form, no scrims, no travel, no bracket context.
- **Temporal validation would have to be built first.** Phase 4b builds the machinery —
  cut dates, held-out editions, baselines — for descriptive questions.
- **The product stance changes only by evidence.** Today the honest sentence is "here
  is the record". After 4b we will know whether any ranking beats carry-over at all.

**Definition of ready for phase 6.** All four: (1) phase 4b is green on at least four
Worlds editions and reports precision@K and ρ against both baselines; (2) the dataset
gains rosters with contract dates, or domestic-league games, or a declared external
ranking source with its licence; (3) a calibration story exists — a predicted
probability that carries its log-loss and a reliability curve, in the same `Answer`
shape; (4) the answer contract is extended with `prediction` fields in a spec, not in a
component.

## Non-goals

Only what this round does not do, each pointing at where it went:

- **Named-entity questions** — deferred to a later round or phase 6 (above).
- **The comparison family** — deferred with them; the shortest-game card is a share.
- **Eras, relative ranges and event windows** — deferred; 4a publishes seasons first.
- **A per-role split** — deferred; the champion cards state "all roles".
- **Match or tournament winner prediction, any supervised model, any rating** —
  deferred to phase 6.
- **Metrics the dataset does not carry**: per-minute gold, gold leads at 15, CS per
  minute, damage share, player ratings. Not deferred; they are absent from the model.
- **Silent filtering of small samples.** A card under the threshold renders
  `insufficient_data` with its counts, never a bare number and never an empty page.
- **A free-text question box.** The catalogue is closed (R13).

## Constraints

- **No backend, no runtime query engine.** The answers are precomputed by
  `pipeline/crystal_ball.py` into `public/data/almanac*.json`, committed and
  checksummed like every other artifact. The browser filters and paints; it never
  computes an interval (R4).
- **The logic lives in DuckDB views.** `pipeline/sql/09_crystal_ball.sql` holds the
  `cb_*` views; the Python step applies the threshold, computes intervals and
  assembles the records. A number that exists only in a component does not exist.
- **numpy is pinned** like DuckDB, because the bootstrap and the simulation are the
  parts that must be reproducible. A different numpy is a deliberate bump with a
  regenerated diff, not a silent upgrade.
- **Determinism.** Fixed seeds, no timestamps, sorted keys, `--check` byte-compares
  every artifact. A bootstrap or simulation that is not reproducible is not an
  artifact.
- **Payload.** One file per question; a page fetches the index and its own file. Each
  file is measured; the eager set is unchanged.
- **The pin is the source of truth.** Every answer carries its view, its artifact and
  the pin's `sha256`; `meta.json` records the artifact's own hash. A re-pin that moves a
  number is a diff.
- **No invented fields.** Every column referenced here is in
  `data/model/data-dictionary.md`; a query that needs one that is not is a disabled
  question, not a new column.
- **The charts use visx** (`@visx/scale`, `shape`, `axis`, `group`, `tooltip`), pinned
  by the lockfile, with the marks drawn from the site's tokens.

## Design decisions

- **Classes for navigation, families for shape.** A pick'em reader browses champions,
  players, teams and events; the answer family decides how a record is drawn. Mixing
  the two made the index a taxonomy of statistics rather than a way to find a question.
- **Generic questions now, named ones when the data can carry them.** Eighteen generic
  cards are a catalogue; four named questions are four separate products, and two of
  them need a placement or a league column the model does not have.
- **The season ends at Worlds.** The calendar year is a filing decision; the season is
  the competitive unit. The one exception in the pin is stated rather than smoothed
  away.
- **The champion KDA card replaces the deaths card.** A champion ranked by deaths alone
  is a column, not a question; KDA with its kills, deaths, assists and participation
  is the question a reader asks.
- **One page per question.** A card index and an entry page: the card carries the
  default headline and the entry page carries the evidence. A single page with
  eighteen expanding blocks is a wall.
- **Charts are evidence, not ornament.** A table beside every chart; the number in the
  DOM, not only in a tooltip; the same tokens as the rest of the site.
- **Top-K by the bound, best and worst.** Ordering by the estimate rewards the
  luckiest small sample; the lower bound asks how good a candidate is if it is as bad
  as the evidence allows, and the upper bound does the same for the worst end.
- **Wilson, not Wald.** Stated with its reason in M3, because the low-base-rate family
  is exactly where the two disagree.
- **The cut date is in the URL.** An answer without a date is unfalsifiable; with the
  season in the query string, a shared link is a claim with its own expiry.
- **KDA's rule changes, and the change is written down.** `metric-definitions.md` said
  KDA is "never in a leaderboard". The Almanac ranks it, so the definition becomes:
  ranked only inside the `Answer` contract, always with the game count, its interval
  and the `n ≥ 20` gate, never in a table where a 410-game career sits beside a 12-game
  one.
- **The one ⚠️ question ships as a page, not as an omission.** A reader who asks "how
  many regions" deserves the query and its result, not a 404 that looks like a bug.
- **4a and 4b are separate.** The catalogue is useful before it is calibrated, and
  calibrating it is a different kind of work with a different failure mode.

## Test seams

- **`pipeline/sql/09_crystal_ball.sql`** — the `cb_*` views and the season spine.
  Tested through the pipeline tests, not by eye, because each one has a grain trap.
- **`pipeline/tests/test_crystal_ball.py`**
  - The season mapping: 16 seasons, one per event, IPL 5 in 2013.
  - Wilson bounds against hand-computed values, including `p = 0`, `p = 1` and
    `n = 4`.
  - Presence is `pick ∪ ban`, once per game, including the three blind-pick games.
  - The IEM 2013 game with 8 pick slots against 10 players is reported as a
    completeness gap, and no presence figure is published while it is.
  - Duration over 3,084 games, not 6,168 side rows.
  - Damage answers report 15,870 rows, not 30,910.
  - Every proportion below `n = 20` produces `insufficient_data` and no interval.
  - `fact_player_honour` joined at award grain is 11 rows, not 208.
- **`src/lib/answer.ts`** — `formatAnswer`, `verdictOf` and `assertShape` are pure: a
  record whose headline lacks `n`, whose candidates are unordered by the end's rule,
  or whose `insufficient_data` carries an interval is rejected. Fixtures: best, worst,
  share, count, categorical, insufficient, not-verifiable.
- **`src/components/Answer.tsx`** — a render test asserts the headline matches
  `value (95% CI: a–b, n=c)`, that the four blocks are present, and that `limits` is in
  the DOM rather than behind a `title`.
- **`src/components/charts/`** — every chart renders SVG server-side at a fixed size;
  the paired table exists; the tooltip is not the only place a value appears.
- **`src/lib/almanac.ts`** — grouping by class, resolving `season`/`end`/`top`, the
  default window and the canonical URL.
- **Data tests** — the eighteen ids; every `source.sha256` equals
  `meta.json.source.manifestSha256`; every `insufficient_data` has no interval and its
  census; every `not_verifiable` carries `verification.query`; every record lists its
  patches or says `all patches`; every record carries the selection-bias limit.
- **Backtest test** — for a fixed seed and a fixed edition, precision@K and Spearman
  equal the recorded values, and no training row postdates the cut.

## Acceptance criteria

- [ ] `/almanac` lists eighteen cards in four classes, each with its verdict.
- [ ] `/almanac/champion-presence?season=2025` renders a top-K of five with intervals,
      the order rule and the K, and the season's patches and cut.
- [ ] A champion win-rate card at season 2025 renders `insufficient_data` for the
      champions under 20 picks, with their counts still visible.
- [ ] The champion KDA card shows kills, deaths, assists and kill participation, with
      the best and worst ends on one page.
- [ ] A team card and a player card each render a chart with its table and its `n`.
- [ ] No answer renders a number without its `n`; a render test proves it.
- [ ] The region card renders its query, its result and the unblocking decision, and
      no number that reads as an answer.
- [ ] Every answer names its season's patches and its cut date.
- [ ] Every answer's limits name the selection bias (only qualified teams).
- [ ] The season mapping is 16 seasons with IPL 5 in 2013, and a test asserts it.
- [ ] `almanac*.json` is deterministic: `npm run data:check` is green, and a rebuild
      produces byte-identical output.
- [ ] Every `source.sha256` equals the pin's manifest hash.
- [ ] `npm run check` passes, and the deployed site serves `/almanac/:id` from a cold
      deep link.

## Verification

```bash
npm run data:build && npm run check

# the presence rule, by hand: pick ∪ ban, once per game
duckdb -c ".read pipeline/sql/01_semantic_views.sql" \
       -c ".read pipeline/sql/09_crystal_ball.sql" \
       -c "select champion_name, part, n, round(part::double/n, 3)
           from cb_season_presence where season = 2025
           order by part desc limit 5;"
# then the same question on /almanac/champion-presence?season=2025 must print that
# triple, its Wilson interval and its n — not a percentage on its own.

# the season rule, by hand
duckdb -c ".read pipeline/sql/09_crystal_ball.sql" \
       -c "select season, count(*), min(date_from), max(date_to) from cb_season_window group by 1 order by 1;"
# 16 rows; the event whose season differs from its year is IPL 5 (season 2013).

# the ⚠️ query is printed verbatim above; run it before shipping the page, because
# its result is what the page claims.
```

## Open assumptions

- **That a closed catalogue is the right shape.** The pick'em asks roughly these
  questions; a fixed list of eighteen can be audited and backtested. A nineteenth is a
  spec change, and the audit table is the cost.
- **That `n ≥ 20` is the right threshold.** At a single season most champion questions
  fall under it, so the Almanac will answer "insufficient data" more often than a
  reader might like. Lowering it is allowed once 4b shows what precision the answers
  carry.
- **That the top-K framing survives the pick'em.** A reader may want one name; the list
  is the honest version of one name, and 4b measures whether the first candidate is
  usually in the tournament's real pool.
- **That seasons are the right first window.** They match how a reader remembers the
  game, and seventeen windows fit the build. Eras, relative ranges and event windows
  can be added when their cost is measured.
- **That the deferred prediction phase is reachable.** If the dataset gains no rosters
  and no domestic games, phase 6 stays deferred indefinitely, and the deferral turns
  into the product spec's original refusal — a documented outcome.
