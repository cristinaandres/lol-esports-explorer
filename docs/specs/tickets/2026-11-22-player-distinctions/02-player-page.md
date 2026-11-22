# 02: A player page that states their awards, and never claims more than the source

**Blocked by:** 01
**Status:** done

## What to build

A `Distinctions` section on `/players/:id`, directly under `Titles`: the awards the
source states for this player at a tournament, in the source's own words, grouped by
competition like `Titles` is, newest event first. Each row names the event (linked),
the title, and the team the source states (linked unless the key is 0).

## Scope

- The section, composed from the existing `Ratio`/`Stat` vocabulary only where a
  share exists — it does not: every figure here is a count or a stated string.
- Copy that separates it from `Titles` in one line: this is stated, that is derived.
  It names the source's gap, because a player with no award row must not read as a
  player who won nothing: the source states distinctions for 19 of the corpus's 54
  events, and says nothing at all for Worlds 2012/2013/2015/2016/2018–2020 and
  MSI 2017–2021.
- A glossary link to the `Distinction` entry (ticket 03 writes it).
- The empty state: one sentence saying the source states no distinction for this
  player, never a bare dash and never a zero.

## Acceptance criteria

- [ ] Faker's page lists three distinctions — Worlds 2024 `Finals MVP`, MSI 2016
      `MVP`, Esports World Cup 2024 `Most Valuable Player` — newest first.
- [ ] MSI 2016's six rows appear on the right players' pages as `All Pro Team` and
      `MVP`, spelled as the source spells them.
- [ ] A player the source says nothing about reads as "the source states none",
      not as an absence of achievement.
- [ ] A row whose team is the unknown member prints no team and no link.
- [ ] The section renders before the page's games tables, pays one extra request
      per session, and a second player page makes no new request.
- [ ] `Titles` and `Distinctions` cannot be mistaken for each other: each states
      where its rows come from.

## Validation

`honours.test.ts` (ticket 01) plus an artifact-driven test that Faker's three rows
and MSI 2016's six are the ones the page component receives, and a browser pass on
`/players/<faker>` reading the section off the page.

## Built

- **The section is under `Titles` and says what the difference is**: titles are the
  site's reading of the final, distinctions are the source's own statements. Neither
  the heading nor the copy merges them.
- **The coverage sentence is measured, not transcribed.** "The source states a
  distinction at 19 of the 54 events" is computed from the artifact and the event
  index on every render, so a pin bump moves both numbers together and the copy
  cannot go stale.
- **Three states, all visible.** Loading reserves one card; a failed load prints the
  loader's message with a retry rather than a section that silently vanished; a
  player the source says nothing about reads "that is what it says, not what they
  won".
- **A distinction with no team prints no team.** Kiin's Esports World Cup 2025 award
  is a player link, the title, and nothing else — no "Unknown", no dead link.
