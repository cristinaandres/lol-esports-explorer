# 06: A champion page across eras, not across patches it did not exist in

**Blocked by:** 02 (the entity page shell)
**Status:** done

## What to build

`/champions/:id` — when a champion was picked, when it was banned, and how that
changed across eras. Every figure carries the games it is measured over, and a
champion is never penalised for not existing: Azir has no games before 2014
because Azir did not exist, which is the same distinction the scoreboard already
makes for objectives.

Champions get renamed too, though far less than teams. Measured on the bridge: of
its 172 champion rows, 170 repeat the current name and **two** are real renames
(Nunu → Nunu & Willump). So the page shows a former name when there is one and says
nothing when there is not, rather than reserving a section for a case that occurs
twice in sixteen years.

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
- [ ] A champion with a former display name lists it with its window — Nunu is the
      case that exists — and a champion without one has no empty section.
- [ ] Champion names in the draft board and the player table link here.
- [ ] An unknown id renders the 404 page.

## Validation

Unit tests over the per-era aggregation (a champion present in every era, one
released mid-corpus, one never banned), and a data test asserting that the sum of a
champion's per-era picks equals its total picks. Covers spec R6.

## Built

- Presence is pick plus ban over the games played in the era, with the games of the
  era as the denominator. Dividing by the games the champion appears in would only
  ever say it was present when it was present.
- A blind-pick game where both sides played the champion counts once: it is one
  game and one side won it.
- A champion released mid-corpus shows nothing before its first game, which the
  spec asks for and which is not the same fact as zero.
- Verified: Azir 9% (293/3,091) picked, 12% banned, 21% presence, 50% won when
  picked, present in all six eras; Nunu lists the name it replaced and the other
  170 champions show no empty section.
- Champion names link here from the draft board and the player table.
- The page asks the network for two artifacts, not four. It counts bans and reads
  no pick, so it loads `player-games.json` and `bans.json` and leaves `sides.json`
  and `picks.json` — 236 KB gzip it never renders — to the game page. Measured in
  headless Chromium: a champion page requests those two files from the draft and
  nothing else.
