# Phase 2 — Event and game

Status: built and deployed. Depends on nothing; phase 3 depends on it. What the
build changed against the plan is recorded at the end of this document.

## Objective

The era page currently lists events as inert rows. A spectator who wants to know
who played what in one game has nowhere to go. This phase builds the three levels
between an era and a specific game — event, series, game — so that the draft of a
real match is two clicks from the era that contains it.

## Current behavior

- `/eras/:era` renders the event table with no `<a>` in the body; the page says
  "Event pages open in the next phase".
- The committed artifacts are `eras.json`, `events.json`, `totals.json`,
  `meta.json` — 37 KB total. There is no game-level artifact.
- Measured on the real model (2026-11-20), the artifacts this phase needs:

  | Artifact | Rows | JSON | gzip |
  |---|---|---|---|
  | `games.json` | 3,091 | 1,718 KB | 140 KB |
  | `player-games.json` | 30,910 | 7,886 KB | 661 KB |
  | `bans.json` | 28,306 | 3,065 KB | 134 KB |

- Played series by format: best-of-one 1,455, best-of-three 289, best-of-five 324,
  one unknown. Games with no series: 42. Drafts with unknown pick order: 641 of
  3,091.

## Required behavior

- **R1** `/events/:id` renders the event header — name, competition, year, era
  or eras it spans, dates, teams, games — and its games ordered by date.
- **R2** A best-of-one row links directly to its game. A best-of-three or
  best-of-five row links to the series. The level that exists for one third of
  the corpus is not imposed on the other two thirds.
- **R3** `/series/:id` renders the games of one series with its score. A typed URL
  for a best-of-one redirects to its single game rather than rendering a list of
  one.
- **R4** `/games/:id` renders both sides with team, side, winner, kills, gold,
  towers, inhibitors, dragons by type, barons, duration, patch and era, plus the
  coverage markers for that game.
- **R5** The draft board renders picks in slot order when the draft fidelity is
  `ordered` (2,450 games) and without an order when it is `unordered` (641),
  labelled with which of the two it is. An unordered draft is not sorted into a
  fake order.
- **R6** A game that declares no pick-ban phase renders "no draft", with the
  format reason from the upstream format table. It does not render an empty
  board. *(Built, and vacuous in this corpus: every one of the 3,091 games has
  player rows, so no game lacks a draft. The real case is the inverse — three
  2020 Mid-Season Cup blind-pick games have picks and no bans — and the board
  names it rather than drawing an empty ban list.)*
- **R7** The 42 games with no series appear on their event page in their own
  group, reachable, not hidden behind a series that does not exist.
- **R8** Player and team names are text in this phase, not links: the entity
  routes arrive with phase 3, and a link to a page that 404s is worse than plain
  text.

## Non-goals

Search, filters, entity pages, comparisons, charts over time, and any timeline or
per-minute visual. The model carries per-game totals only; a gold curve cannot be
drawn from it and must not be faked from the final gold.

## Constraints

- No server. The artifacts are static files, fetched once and held in memory.
- Payload budget: the eager set stays well under ~200 KB gzip for a first visit.
  Measured today it is ~46 KB: eras, events, totals, the pin and the name files.
  The two game-level artifacts — `games.json` (91 KB gzip) and `matches.json`
  (54 KB) — are fetched by the pages that draw games, and `player-games.json`
  (688 KB) and `bans.json` (140 KB) load lazily on the first game page; all four
  are cached for the session, so an era page never pays for any of them.
- Every game in the corpus must be reachable from its event; none may become
  unreachable because it lacks a series, a patch or a draft.

## Design decisions

- **`games.json` and `matches.json` are game-level, not eager.** The event page
  needs the game list to draw its table, and 145 KB gzip is affordable for a page
  that draws games; it is not affordable for an era page, which reads 26 events
  and no games at all — the largest era holds 1,325 games, which is why the era
  page lists events. The two files were eager at first and made an era page pay
  145 KB for figures it already had in `eras.json`; they now load as one pair, once
  per session, behind `useGameCorpus()`.
- **Picks are not in `bans.json`.** Every player row already states the champion
  that player played, so picks come from `fact_player_game` and only bans come
  from `fact_draft_slot` — 28,306 rows instead of 59,214 slots. One artifact and
  one join saved, with no loss: the pick slot number is still needed for R5 and
  comes from the draft slots for ordered drafts only.
- **`draft_switched_sides` reorders the display, not the picks.** Four games in
  the corpus (2020 Mid-Season Cup) state the draft with the sides swapped; the
  champion list is correct either way and only the column placement flips.
- **Series stays a real route rather than a tab** because it has its own identity:
  a best-of-five has a score, and the score is what the event table reports.

## Test seams

- **Pipeline** — `pipeline/build.py --check` already proves the artifacts are
  current; the new queries are covered by the same gate.
- **`src/lib/draft.ts`** — pure functions `readDraftState`, `slotsFor`,
  `sortSlots`, `slotSide` and `playersByRole`, tested with three fixtures:
  ordered, unordered, no draft.
- **`src/lib/series.ts`** — `groupGamesBySeries` tested with a best-of-one event, a
  best-of-five event, and the 42-game orphan case.
- **Data test** — reading the committed `public/data/games.json`: exactly 3,091
  games; every `event_key` resolves in `events.json`; every game has a blue and a
  red side; 42 games carry `match_key = 0`; 641 carry `draft_fidelity =
  'unordered'`.

## Acceptance criteria

- [ ] Every one of the 3,091 games is reachable by clicking from its era, and a
      data test proves the count rather than a spot check.
- [ ] An era page loads no game-level artifact: its network tab shows the eras,
      events, totals, its pin and the name files, and neither `games.json` nor
      `matches.json`.
- [ ] A best-of-one event shows no series level anywhere in its pages.
- [ ] An unordered draft never renders an implied pick order.
- [ ] A game with no pick-ban phase says so and shows no champion.
- [ ] The 42 series-less games are reachable from their event page.
- [ ] `npm run check` passes, and the deployed site serves every new route from a
      cold deep link.

## Verification

```bash
npm run data:build && npm run check
# then, in the browser, one full walk:
#   /eras/atakhan → Esports World Cup 2026 → a best-of-five series → game 3
#   /eras/pre-herald → a best-of-one event → a game with no draft
```

Observed, not assumed: the walk above must reach a draft in under four clicks and
must show a coverage marker on every game that is not complete.

## Built — what changed against this plan

Written after the build, so the next reader knows where the plan and the code
diverged, and why.

- **One more artifact than planned: `matches.json`.** The series route needs a
  natural id and the event page needs the format. `match_key` is build-local — it
  renumbers on the next rebuild — so a URL carrying it would break every shared
  link. `matches.json` (446 KB raw, 54 KB gzip) carries `match_id` and 2,068 rows:
  the model's 2,069 include the key-0 "Unknown" sentinel, which no artifact
  publishes. It is a game-level artifact like `games.json`, not part of the eager
  set: the eager set is eight files at ~46 KB gzip, and a page that draws games
  pays the 145 KB the pair adds, inside the 200 KB budget.
- **Two draft artifacts instead of one.** A single `draft.json` was built first
  and came to 6.0 MB, because `is_ordered` was repeated on all 59,214 slots. It
  became `bans.json` (28,306 rows) plus `picks.json` (24,500 rows, ordered drafts
  only, no `is_ordered` — `games.json` already states the fidelity per game).
- **A fourth lazy artifact, `sides.json`, was not in the plan.** The scoreboard
  needs the full per-side statistics, and putting them in `games.json` would have
  added ~400 KB to what every visitor downloads. It is lazy, 117 KB gzip.
- **Eligibility is now published.** `eras.json` carries the upstream `eligible`
  field list, so the scoreboard drops an objective that did not exist in the era
  instead of printing an em dash that reads like a gap in the source.
- **Two defects were found by building it.** The first: casting the model's
  timestamp through DuckDB produced `2011-06-18 08:30:00+00` instead of the ISO
  string the site parses, and the page printed "NaN Sep 2020". The second, and the
  serious one: 250 games state their draft with the two sides exchanged
  (`draft_switched_sides`), and reading the slots without that flag puts 2,506
  picks on the wrong side. `src/lib/data.test.ts` now asserts that every one of
  the 24,500 picks names a champion a player on that side actually played. It is
  the single most valuable test in the repository.

Final payloads, measured (`gzip -6` output over 1,024 bytes):

| Artifact | Rows | gzip | When |
|---|---|---|---|
| `games.json` | 3,091 | 91 KB | game level |
| `matches.json` | 2,068 | 54 KB | game level |
| names (teams, players, champions, patches) | 1,550 | 39 KB | eager |
| eras, events, totals, meta | 64 | 7 KB | eager |
| `sides.json` | 6,182 | 117 KB | lazy |
| `player-games.json` | 30,910 | 688 KB | lazy |
| `picks.json` | 24,500 | 118 KB | lazy |
| `bans.json` | 28,306 | 140 KB | lazy |

### Review amendments

- **The series page does not state the side a game was won on.** It says which team
  won; the side belongs to the game page, where the two scoreboards are already
  side by side.
- **The date is stated once per page.** It left the game rows inside a series and
  stayed in the header, as a range for the 33 series that span two days. Repeating
  it per row made it look like two dates competing, and 1,931 of 1,964 series fit
  on one day.
- **The series title drops the source's date suffix.** Names arrive as "Worlds 2016
  — Quarterfinals — 2016-10-14"; the date is in the header, so the suffix is
  removed for display and kept in the title attribute.
- **Best-of-one rows are not yet visually distinguishable from best-of-three rows
  beyond their text.** That is a row-component decision and it moved to phase 5.

## Open assumptions

- **That a game page is worth its own artifact.** If the event page can draw every
  row it needs from `games.json` alone, that artifact stays. If a per-game
  breakdown proves heavier than 200 KB gzip, it gets split per event instead.
- **That no reader needs the ban list before opening a game.** If a later phase
  shows a champion's ban rate, `bans.json` becomes eager and the budget is
  revisited.
