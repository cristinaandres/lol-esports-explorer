# 04: Champions, the five cards

**Blocked by:** 01, 02 (03 for the page)
**Status:** done

## What to build

The five champion cards, each with its records, its table and its chart.

- **Presence** (`champion-presence`): games in which the champion was picked or
  banned, once per game, over the season's games and on or after its release date;
  Wilson, top-K. Chart: interval dot plot.
- **Win rate, best and worst** (`champion-win-rate`): picks the picking side won,
  over picks of that champion; Wilson; best ordered by the lower bound, worst by the
  upper bound; `n ≥ 20` picks. Chart: two-ended dot plot.
- **KDA, best and worst** (`champion-kda`): `(kills + assists) / max(1, deaths)` over
  the champion's player rows, with kills, deaths, assists and kill participation
  (`(kills + assists) / team kills`) in the table; KDA by bootstrap, KP by Wilson;
  `n ≥ 20` champion-games. The card replaces the old champion-deaths question;
  deaths are a column here, not a question on their own.
- **Unique champions** (`unique-champions`): the median and 90% interval of a seeded
  Monte Carlo over the season's game count, drawing each game's pick set from the
  window's empirical per-game distribution. Chart: histogram of the 10,000
  replications.
- **Teemo** (`teemo-picked`): games with Teemo picked over the games it was eligible
  for, Wilson; below `n ≥ 20` the verdict is `insufficient_data` with the census (four
  picks) visible.

## Scope

- The evidence panels carry the metric, the interval, the `n`, the denominator and
  the season's patches. Every share says what it is a share of.
- The per-role split is not built in 4a: the evidence states `role: null` and the
  page says "all roles". A role filter is a later round.
- Presence counts a pick and a ban the same way, and says so in the limits.

## Acceptance criteria

- [ ] Season 2025 presence: Azir in 148 of 232 games, its interval and its top five,
      ordered by the lower bound.
- [ ] Season 2025 win rate: the best and worst ends render, and a champion under 20
      picks renders `insufficient_data` with its counts.
- [ ] Season 2025 KDA: Senna's 21 champion-games show K, D, A, KDA and KP, each with
      its interval; the deaths column is visible.
- [ ] Unique champions: a median, a 90% interval and the replication count, never a
      single number.
- [ ] Teemo: the four picks stay visible as a census and no interval is drawn.
- [ ] The three blind-pick games count once in presence.
- [ ] Each card's chart has its table and its `n`.

## Validation

`npm run data:test`, the data tests for `almanac-champion-*.json`, and a Playwright
read of each card.

## Built

- **The five champion cards are live** on `/almanac/:id`: presence, win rate (best and worst), champion KDA (best and worst), unique champions and Teemo.
- **KDA carries its parts.** The pipeline writes `components` on each KDA candidate — kills, deaths, assists and kill participation with its Wilson interval — and the dot plot's table appends Kills, Deaths, Assists and Kill participation after the contract's Name, Value, interval and n. Season 2025: Senna, 8.44 in 21 champion-games, 79 / 34 / 208, KP 83% (95% CI: 62–93%).
- **The unique-champion simulation ships its distribution.** The pipeline stores the 10,000 replications as integer bins; the page renders the histogram with the replications' share of 10,000 and the observed by-season series beside it. Season 2025: 114–123, 90% of 10,000 simulations.
- **The win-rate threshold was corrected to picks.** The old gate filtered on wins (`part`), so a champion with 30 picks and 15 wins was excluded; it now gates on picks (`n`), as the audit says. The census shows the champions under 20 picks with their pick counts (season 2025: Bel'Veth 17 picks).
- **Presence and Teemo** were already correct: Azir 148 of 232 in season 2025, top five ordered by the lower bound; Teemo's four picks stay a census with no interval.
- 3 new pipeline tests (threshold on picks, KDA components, simulation bins) and 3 new entry tests; Playwright read the KDA table, the simulation histogram and the win-rate census. `npm run check` is green.
