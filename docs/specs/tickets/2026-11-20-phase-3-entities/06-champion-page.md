# 06: A champion page across eras, not across patches it did not exist in

**Blocked by:** 02 (the entity page shell)
**Status:** ready

## What to build

`/champions/:id` — when a champion was picked, when it was banned, and how that
changed across eras. Every figure carries the games it is measured over, and a
champion is never penalised for not existing: Azir has no games before 2014
because Azir did not exist, which is the same distinction the scoreboard already
makes for objectives.

Champions also get renamed and retired — 172 aliases in the bridge — so the page
shows the display names it had, with their windows.

## Scope

- The champion page: picks, bans, presence by era, each with its denominator.
- Former names from ticket 01 (172 champion aliases).
- Champion names in the draft board and in the player table become links.
- No filters: the era axis is the point of the page, and filtering by year would
  turn it into the same page the player has.

## Acceptance criteria

- [ ] Pick and ban counts are shown against the games of the era they were measured
      in, never against the whole corpus.
- [ ] A champion released mid-corpus shows no presence before its first game, and
      the page says why rather than showing zero.
- [ ] An era the champion never appeared in is stated as such, not rendered as an
      empty chart.
- [ ] Retired or former display names are listed with their windows.
- [ ] Champion names in the draft board and the player table link here.
- [ ] An unknown id renders the 404 page.

## Validation

Unit tests over the per-era aggregation (a champion present in every era, one
released mid-corpus, one never banned), and a data test asserting that the sum of a
champion's per-era picks equals its total picks. Covers spec R6.
