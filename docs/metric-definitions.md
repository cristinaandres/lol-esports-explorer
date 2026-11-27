# Metric definitions

Every measure the site shows, what it is computed from, and the era it is valid
in. If a metric is not here, it is not on the site.

Metric names on the site are the names in this table. Formulas live in
`pipeline/sql/` for anything baked into an artifact, and in `src/lib/` for what
the browser derives from rows it already holds; nothing is computed in a
component except a ratio of two displayed counts.

## Counts

| Metric | Definition | Source | Valid |
|---|---|---|---|
| Games | Distinct `game_key` in the facts; the unknown member (key 0) excluded. | `game_facts` | all eras |
| Series played | Distinct `match_key` on a game. Series admitted but never played are reported separately. | `game_facts` | all eras |
| Events played | Distinct `event_key` on a game. Admitting an event does not mean a game was played in it. | `game_facts` | all eras |
| Patches recorded | Distinct `patch_key` on a game. A game with no stated patch is not counted, so this is a floor, not a patch history. | `game_facts` | all eras |
| Average length | Mean of `duration_seconds` over games that state one. The count it was measured over is printed beside it, because an average states its n on this site the way a share states its denominator. | `fact_game_side` | all eras |
| Titles | Events whose final is the single series named Finals, won by the team with more game wins in it. Events that name several such series — most Rift Rivals relays, whose winner is a region — award nothing. A relay with one decisive final does award its winner. | `fact_game_side`, `dim_match`; derived in `src/lib/titles.ts` | all eras |
| Distinctions | Awards the source states for a player at a tournament, in its own words (`Finals MVP`, `All Pro Team`, `MVP`) — one row per player, event and title, never normalised into one label and never merged with Titles, which is derived. Not a measure: a count of them is a `GROUP BY`. They exist for 19 of the 54 events, and the gaps are the source's (no MVP row for Worlds 2012/2013/2015/2016/2018–2020, nor MSI 2017–2021), so a player without one has not been told anything. | `fact_player_honour` | all eras |

## Derived labels

Not measures: a word printed next to a name, which the site therefore states a rule for.

| Label | Rule | Source | Limits |
|---|---|---|---|
| Role (champion) | The role the champion appears in most: most `fact_player_game` rows in one role, tie broken by the canonical order `Top, Jungle, Mid, Bot, Support` (`06_indexes.sql`, `role_rank`). | `fact_player_game.role` | 139 of the 171 champions appear in more than one role, and two tie at the top: the tie-break is a decidable answer, not a better one. It is where the corpus played the champion, never its design or a claim about a patch. |
| Last club (last played for) | The club the player appeared for in their most recent game: `fact_player_game.team_key` on the row with the greatest `dim_game.date_time_utc`, ties by `game_key`. The year printed beside it is the year of that game — the artifact carries the year, and `player_last_game` keeps the instant. | `fact_player_game`, `dim_game` | The model has no contracts and no roster table, and rosters change between seasons, so this is a record of where the corpus last saw the player — never "current". A player whose last game is in 2013 keeps that club and shows 2013, which is true and visibly old. A last game naming no club (key `0`) prints nothing. |
| Season | The window from the day after Worlds N−1 final to Worlds N final; season 2011 starts at the first game of the corpus. Derived from the Worlds game dates, never read from `dim_event.year`. | `game_facts`, `dim_event` | The calendar year and the season disagree once at this pin: IPL 5 (29 Nov – 3 Dec 2012) belongs to season 2013. A season is a window of international games, not a domestic season. |
| Role (player) | The same rule over the player's own rows, with the same tie-break. | `fact_player_game.role` | 68 of the 1,140 players appear in **more than one** role — 57 in exactly two, 11 in three or four — and six tie at the top, which the pipeline test names. It is the position they played most in this corpus, not the position they are known for, and not a contract role. |

## Shares

All shares are `part / total` and are always rendered with both numbers.

| Metric | Definition | Denominator |
|---|---|---|
| Blue side won | Games won by the team on the blue side | all games in scope |
| Draft complete | Games whose draft coverage is `complete` | all games in scope |
| Player statistics complete | Games whose player-statistics coverage is `complete` | all games in scope |
| Team statistics complete | Games whose team-statistics coverage is `complete` | all games in scope |
| Win rate | Games won by the team, player or champion in the current selection. Named "rate" because that is what a League reader calls it; the denominator is always printed. | all games in scope |
| Picked | Games in which the champion was picked | games in scope on or after its release date |
| Presence | Games in which the champion was picked or banned, counted once when both sides played it | games in scope on or after its release date |

Coverage is judged only against the fields eligible in the game's era. A 2013 game
with no Voidgrubs is not partial for it: Voidgrubs did not exist.

A champion's shares count only the games played on or after its release date. A
champion cannot be picked before it exists, so those games leave the denominator
rather than counting as absences.

A champion's era table lists only the eras it could be drafted in: an era that
ended before its release date is not a row at all. Inside a listed era a pick
count of zero is measured against that era's games, so it reads as `0`; the dash
stays for a figure with no denominator, such as a win rate over no picks.

## Ratios that are not shares

| Metric | Definition | Denominator |
|---|---|---|
| KDA | `(kills + assists) / max(1, deaths)`, summed over the games first and divided once. | deaths, floored at one; the game count is printed beside it |

Not every quotient is a share: KDA divides by deaths, not by a total the reader
can check against the games. It is shown with its formula and its game count, never
in a leaderboard.

**Amendment for The Almanac (round 4a).** A question that asks for the highest
KDA cannot be answered without ranking it, so the rule becomes: ranked only inside
the `Answer` contract, always with the game count, a bootstrap interval and the
`n ≥ 20` gate, and never in a table where a 410-game career sits beside a 12-game
one. The prohibition survives where it mattered — the leaderboard without a sample
size — and the ranked form gains the three things that made it honest. The same
formula is used at champion grain (over the champion's player rows), with kills,
deaths, assists and kill participation beside it.

## Pinned facts

| Fact | Rule |
|---|---|
| Release date | The champion's live date, `dim_champion.release_date` in the model. Never derived from the champion's first appearance in the corpus. |
| Team short name | The abbreviation the model states on the team row (`dim_team.short`), used to resolve a search and never shown as a name. A label, not an identity: two teams can state the same one. |

## Deliberately absent

| Not shown | Why |
|---|---|
| KDA in a leaderboard | It appears on an entity page with its formula and its game count, never ranked beside players with ten times fewer games. The one ranked form is The Almanac's `Answer`, which prints the interval, the game count and the `n ≥ 20` gate beside every name — see the amendment under Ratios that are not shares. |
| Gold per minute, CS per minute, damage share | Per-minute measures divide by a game length that changed across eras, and damage is stated on half the rows. The pages divide by the rows that state the measure, per game, and print how many did. |

## Planned, with the formula fixed now

This arrives with the phase that needs it. Fixing the formula here first stops
two pages from computing the same name two ways.

| Metric | Definition | Round |
|---|---|---|
| Presence rate | Games in which the champion was picked or banned, counted once per game, over the games in scope on or after its release date. Picks come from `fact_player_game.champion_key`, bans from `fact_draft_slot` where `phase = 'ban'` — the two disagree by two rows and by three games, and the phase 4 spec says how. Wilson interval. | 4a |
| Champion win rate | Picks the picking side won (`fact_game_side.is_winner`, joined on `game_key` and `side`), over picks of that champion. Wilson interval; published only at `n ≥ 20` picks; best ordered by the lower bound, worst by the upper bound. | 4a |
| Champion KDA | `(sum(kills) + sum(assists)) / max(1, sum(deaths))` over the champion's player rows; a ratio of counts, so a bootstrap interval. The card prints kills, deaths, assists and kill participation beside it. | 4a |
| Kill participation | `(sum(kills) + sum(assists)) / sum(team kills in the same games)`, from `fact_game_side.kills` on the player's or the champion's side. A share, so Wilson, over the games it was measured on. The numerator, the denominator and the sample are the **games that state side kills**, which can be fewer than the player's or champion's games: a window that states none carries no share rather than a zero, and the row prints the denominator beside it. | 4a |
| Player kills per game | `sum(kills) / count(*)` over the player's games; a ratio of counts, so a bootstrap interval. The total kills and the games are printed beside the rate. | 4a |
| Team win rate | `sum(is_winner) / count(*)` over the team's side rows; Wilson; published only at `n ≥ 20` team-games; best by the lower bound, worst by the upper bound. | 4a |
| Team kills per game | `sum(kills) / count(kills)` over the team's side rows; a ratio of counts, so a bootstrap interval; the denominator is the rows that state kills. | 4a |
| Team gold per game | `sum(gold) / count(gold)` over the team's side rows; a bootstrap interval; the denominator is the rows that state gold. | 4a |
| Damage per game | `sum(damage) / count(damage)`: the denominator is the player rows that state damage (15,870 of 30,910), never the row count. A bootstrap interval. | 4a |
| Game length at 32:00 | Games with `duration_seconds <= 1920`, over the games that state a duration, counted once per game because the measure is repeated on both side rows. Wilson interval. | 4a |
| Shortest game | The blue-side share of the shortest decile of games that state a duration; the decile is a named constant. Wilson interval; the record holder is a citation, not the answer. | 4a |
| Unique champions | Not a share: the median and 90% interval of a seeded Monte Carlo over the season's games, drawing each game's observed pick set. The replication count and the seed are recorded. | 4a |
| Head-to-head | Games where the two teams are the two sides of one game; the denominator is those games, nothing wider. | 6 |
