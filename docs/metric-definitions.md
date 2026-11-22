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
can check against the games. It is shown with its formula and its game count,
never in a leaderboard.

## Pinned facts

| Fact | Rule |
|---|---|
| Release date | The champion's live date, `dim_champion.release_date` in the model. Never derived from the champion's first appearance in the corpus. |
| Team short name | The abbreviation the model states on the team row (`dim_team.short`), used to resolve a search and never shown as a name. A label, not an identity: two teams can state the same one. |

## Deliberately absent

| Not shown | Why |
|---|---|
| KDA in a leaderboard | It appears on an entity page with its formula and its game count, never ranked beside players with ten times fewer games. |
| Gold per minute, CS per minute, damage share | Per-minute measures divide by a game length that changed across eras, and damage is stated on half the rows. The pages divide by the rows that state the measure, per game, and print how many did. |

## Planned, with the formula fixed now

This arrives with the phase that needs it. Fixing the formula here first stops
two pages from computing the same name two ways.

| Metric | Definition | Phase |
|---|---|---|
| Head-to-head | Games where the two teams are the two sides of one game; the denominator is those games, nothing wider | 4 |
