# Metric definitions

Every measure the site shows, what it is computed from, and the era it is valid
in. If a metric is not here, it is not on the site.

Metric names on the site are the names in this table. Formulas live in
`pipeline/sql/`; nothing is computed in a component except a ratio of two
displayed counts.

## Counts

| Metric | Definition | Source | Valid |
|---|---|---|---|
| Games | Distinct `game_key` in the facts; the unknown member (key 0) excluded. | `game_facts` | all eras |
| Series played | Distinct `match_key` on a game. Series admitted but never played are reported separately. | `game_facts` | all eras |
| Events played | Distinct `event_key` on a game. Admitting an event does not mean a game was played in it. | `game_facts` | all eras |
| Patches recorded | Distinct `patch_key` on a game. A game with no stated patch is not counted, so this is a floor, not a patch history. | `game_facts` | all eras |
| Average length | Mean of `duration_seconds` over games that state one. | `fact_game_side` | all eras |

## Shares

All shares are `part / total` and are always rendered with both numbers.

| Metric | Definition | Denominator |
|---|---|---|
| Blue side won | Games won by the team on the blue side | all games in scope |
| Draft complete | Games whose draft coverage is `complete` | all games in scope |
| Player statistics complete | Games whose player-statistics coverage is `complete` | all games in scope |
| Team statistics complete | Games whose team-statistics coverage is `complete` | all games in scope |

Coverage is judged only against the fields eligible in the game's era. A 2013 game
with no Voidgrubs is not partial for it: Voidgrubs did not exist.

## Deliberately absent

| Not shown | Why |
|---|---|
| Team win rate | It would mix eras, patches and formats into one number. The site shows blue-side shares and head-to-heads instead, each with its `n`. |
| KDA in a leaderboard | It appears on an entity page with its formula and its game count, never ranked beside players with ten times fewer games. |
| Gold per minute, damage share | Derived measures that invite comparison across eras where gold income and game length changed. |

## Planned, with the formula fixed now

These arrive with the phases that need them. Fixing the formula here first stops
two pages from computing the same name two ways.

| Metric | Definition | Phase |
|---|---|---|
| KDA | `(kills + assists) / max(1, deaths)`, summed first, then divided. | 3 |
| CS per minute | `sum(cs) / (sum(duration_seconds) / 60)` | 3 |
| Gold per minute | `sum(gold) / (sum(duration_seconds) / 60)` | 3 |
| Pick rate | `games with champion / games in scope`; bans reported separately | 2 |
| Head-to-head | Games where the two teams are the two sides of one game; the denominator is those games, nothing wider | 4 |
| Title | An event whose final is the single series named Finals, won by the team with more game wins in it. Events with several such series award nothing | phase 3 review |
| Presence (champion) | Pick plus ban over the games played in the scope **on or after the champion's release date**. A game where both sides played it counts once. Games from before it existed are excluded from the denominator, because it was not eligible for them | phase 3 review |
| Release date | Champion's live date, pinned from Leaguepedia. Not part of the model, and never derived from its first appearance in the corpus | phase 3 review |
| Win rate | Wins over games. Named "rate" because that is what a League reader calls it; the denominator is always printed | phase 3 review |
