# 06: Teams, the three cards

**Blocked by:** 01, 02 (03 for the page)
**Status:** planned

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
