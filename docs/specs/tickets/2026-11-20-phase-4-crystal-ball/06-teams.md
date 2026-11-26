# 06: Teams, the three cards

**Blocked by:** 01, 02 (03 for the page)
**Status:** done

## What to build

The three generic team cards, replacing the named HLE vs T1 question.

- **Win rate, best and worst** (`team-win-rate`): sides won over sides played, per
  team, Wilson; `n ≥ 20` team-games; best ordered by the lower bound, worst by the
  upper bound. The table shows the games, the wins and the share.
- **Kills per game** (`team-kills`): `sum(kills) / count(kills)` over the team's
  side rows; bootstrap; the denominator is the side rows that state kills.
- **Gold per game** (`team-gold`): `sum(gold) / count(gold)` over the team's side
  rows; bootstrap; the denominator is the side rows that state gold.

The pin has 74 teams with at least 20 games, and 5,624 of 6,182 side rows state
kills and gold.

## Scope

- Every card states the team's games, the season's patches and the cut date.
- A team's win rate is its sides won, not series won: the side is the unit the model
  states, and a series is a different denominator.
- The table shows the region as a label (a current label, not a historical one) with
  the caveat the region question already carries.

## Acceptance criteria

- [ ] Win rate: the best and worst ends render with their intervals; a team under
      20 games is `insufficient_data` with its count.
- [ ] Kills and gold: the denominator (rows that state the measure) is printed.
- [ ] A team with no zone of stated kills or gold is reported as such, not as a
      zero.
- [ ] Each card's chart has its table and its `n`.

## Validation

`npm run data:test`, the data tests for the team artifacts, and a Playwright read of
each card.

## Built

- **The three team cards are live** on `/almanac/:id`: win rate (best and worst), kills per game and gold per game.
- **Win rate carries its wins.** The pipeline writes `wins` on each candidate; the table shows Wins beside Value, interval, n and the games. Best at the pin: T1, 70% (293 of 419 side rows); worst: PENTAGRAM, 21% (5 of 24). The census keeps the teams under 20 games visible (Ascension Gaming, 19).
- **Kills and gold divide by the rows that state them.** Hanwha Life Esports 17.3 kills per game over 103 side rows; Samsung Galaxy 70,828 gold per game over 36. The Answer and the table print the stated-row `n`, and the limit says a team whose rows state none is absent, not zero.
- **The series is honest about the threshold.** Team win rate and kills have by-season points; team gold has none, because Samsung Galaxy never reaches 20 games in a single season (17 in 2016, 19 in 2017) — the threshold, not a gap in the chart.
- Two new pipeline tests (wins, stated-row denominators) and three new entry tests; Playwright read the best and worst win rate, the kills and the gold cards. `npm run check` is green.
