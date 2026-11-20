# 04: Split a career by role when there is more than one

**Blocked by:** None (can start immediately)
**Status:** ready

## What to build

68 of the 1,140 players in the corpus played in more than one role, and their career
page averages the two together: Perkz reads as one 173-game career instead of 119 mid
and 54 bot. The champion pool already separates roles; the figures above it do not.

When a player has more than one role, the page gets a per-role breakdown: games, win
rate, KDA and the champions played in each. A single-role player sees no extra
section, because the label would repeat what the eyebrow already says.

## Scope

- A per-role summary in the career module, sharing the denominator rules already
  there.
- A section on the player page, shown only when there is more than one role.
- Nothing changes for the 1,072 single-role players.

## Acceptance criteria

- [ ] Perkz shows mid and bot separately, with each role's games and win rate.
- [ ] The roles sum to the career total; a test asserts it.
- [ ] A single-role player renders no role section at all.
- [ ] Each role's figures follow the same coverage rules as the career.

## Validation

Unit tests with a two-role career and a one-role career, plus a data test that the
per-role games add up to the career games for every player with more than one role.
