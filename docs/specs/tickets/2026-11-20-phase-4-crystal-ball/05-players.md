# 05: Players, the six cards

**Blocked by:** 01, 02 (03 for the page)
**Status:** planned

## What to build

The six player cards, all generic: the subject is "a player", never a named one.

- **KDA** (`player-kda`): `(kills + assists) / max(1, deaths)` summed over the
  player's games first; bootstrap; `n ≥ 20` player-games. The table also states the
  games, the kills, the deaths and the assists.
- **Kills per game** (`player-kills`): `sum(kills) / games`; bootstrap; the table
  shows the total kills and the games, so exposure is visible beside the rate.
- **Kill participation** (`player-kill-participation`): `(kills + assists) / team
  kills in the same games`; Wilson over the player-games; the denominator is the
  team's kills, not the player's.
- **Damage per game** (`player-damage`): `sum(damage) / count(damage)`; bootstrap;
  the denominator is the rows that state damage, and the limits say 15,870 of
  30,910.
- **15 kills** (`player-kills-threshold`): player-games with `kills ≥ 15` over all
  player-games; Wilson; the census is 49 of 30,910 at the pin.
- **450 CS** (`player-cs-threshold`): player-games with `cs ≥ 450` over all
  player-games; Wilson; the census is 401 of 30,910.

## Scope

- Every card states the season's games and patches, the cut date and the selection
  bias (only teams that qualified appear).
- The threshold cards print the distribution with the threshold marked, not only the
  share, so a reader can see how far the tail is from the line.
- The KDA card is the ranked form the metric definition now allows; it carries its
  interval, its game count and the `n ≥ 20` gate. It is never a leaderboard outside
  the `Answer`.

## Acceptance criteria

- [ ] KDA: the best end at the pin, its interval and its game count; a player with
      19 games is `insufficient_data` with the count visible.
- [ ] Kills per game: total kills and games beside the rate.
- [ ] Kill participation: the team-kills denominator is printed, not implied.
- [ ] Damage: the denominator is the rows that state damage.
- [ ] 15 kills and 450 CS: the share, the interval, the counts and the histogram
      with the threshold line.
- [ ] No card names a player in the question; the names appear only as candidates.

## Validation

`npm run data:test`, the data tests for the player artifacts, and a Playwright read
of each card.
