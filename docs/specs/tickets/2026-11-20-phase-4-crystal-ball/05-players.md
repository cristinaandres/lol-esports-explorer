# 05: Players, the six cards

**Blocked by:** 01, 02 (03 for the page)
**Status:** done

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

## Built

- **The six player cards are live** on `/almanac/:id`: KDA, kills per game, kill participation, damage per game, 15 kills and 450 CS.
- **The KDA table states its parts.** The pipeline writes kills, deaths, assists and kill participation on each player KDA candidate; the table shows them after Value, interval and n. The best end at the pin is Bang, 6.38 in 118 player-games.
- **Kills and participation carry their denominators.** Kills per game adds the total kills beside the rate (Peyz: 5.8 in 110 games, 635 kills); kill participation adds the team's kills (Meiko: 75%, 1,537 of 2,053 team kills in 144 player-games). Damage's `n` is the rows that state damage, as the limit says.
- **The threshold cards show their distribution.** The pipeline bins the window's player-games — 0–4, 5–9, 10–14, 15–19, 20–24, 25+ for kills; 0–99 … 500+ for CS — and marks the threshold bin. All games: 49 of 30,910 player-games reach 15 kills (0.16%; the 15–19 bin holds 47 and the two above it the other 2); 401 reach 450 CS (1.3%; 236 in 450–499 and 165 at 500+). The histogram marks 15 kills / 450 CS and the table carries each bin's share of the window.
- **No question names a player**; names appear only as candidates, linked to `/players/:id`.
- Three new pipeline tests (the total kills, the team-kills denominator, the threshold bins and markers) and four new entry tests; Playwright read the player KDA, kills, participation and both threshold distributions. `npm run check` is green.
