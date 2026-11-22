# Player distinctions — the awards the source states

Status: built, broken into tickets. Depends on the v1.2.0 pin (PR #52), which
carries `fact_player_honour` in the model and retired the two wiki pins.

Tickets: `docs/specs/tickets/2026-11-22-player-distinctions/`.

| Ticket | Blocked by | Delivers |
|---|---|---|
| 01 | — | The distinction artifact, its type and loader, and the module the pages share |
| 02 | 01 | The player page's `Distinctions` section, under `Titles` |
| 03 | 01 | The event page's `Distinctions` section, before `Phases`, and the glossary entry |

## Objective

A reader on Faker's page learns he won three Worlds. They should also learn what
the source states about him as an individual — Finals MVP in 2024, MVP at MSI 2016
— and a reader on the MSI 2016 page should see who the source named that year,
without leaving for the player pages to find out.

The distinction is a **stated fact**, not a derived one. `Titles` is inferred from
which team won the final (`src/lib/titles.ts`, with the rule written down because
it is an inference). A distinction is in the model, in the source's own words:
MVP, Finals MVP, All-Pro Team. The two must never be merged, because one is the
site's reading of the bracket and the other is somebody's statement about a player.

## Current behavior

- `fact_player_honour` is pinned and read by nothing: 24 rows over 19 players and
  19 events. `public/data/honours.json` does not exist.
- `Titles` on the player page is derived from finals and says so. There is no
  place where an award is stated.
- The event page shows coverage, phases, teams and un-serialised games; the
  header names the winner where the final can be named. No awards.
- The team page is untouched by this spec.

Measured on the pin (`v1.2.0`, `4044872`):

| Fact | Value |
|---|---|
| Rows | 24, over 19 players and 19 events (of 1,140 players and 54 events) |
| Titles | 6 source strings: `Finals MVP` (11), `All Pro Team` (5), `Most Valuable Player` (5), `MSI MVP`, `MVP`, `Tournament MVP` |
| `type` | `Season Award` on every row |
| `place`, `place_number` | empty on all 24 rows |
| `team_key` | `0` (unknown) on one row: Kiin, Esports World Cup 2025 |
| Coverage | Worlds 9 editions, MSI 7 (MSI 2016 states 6 rows), Esports World Cup 3 |
| Gap | the source's own: no MVP row for Worlds 2012/2013/2015/2016/2018–2020, nor MSI 2017–2021 |

Every honour's player and event is already on the site, so no link is speculative;
the pages still guard, because the next pin can add an event the site does not admit.

## Required behavior

- **R1 — The fact is published as its own artifact.** `public/data/honours.json` is
  a pass-through of `fact_player_honour`, one row per player, event and title, with
  no derived column and no count. It is ordered explicitly, so it is deterministic.
- **R2 — Distinctions never merge with Titles.** They are separate sections with
  separate copy. `Titles` says it is derived from the final; `Distinctions` says it
  is stated by the source.
- **R3 — The source's words are kept.** A row prints its `title` verbatim (`All Pro
  Team`, `MSI MVP`), not normalised into one of the site's own labels. The single
  award `type` is stated once in the copy, never repeated on every row.
- **R4 — An empty list is not "won nothing".** The sections name the source's
  coverage gap, because it states distinctions for 19 of the corpus's 54 events. A
  player with no distinction is told what that means.
- **R5 — No dead links.** An event or a team is linked only when the index resolves
  it; `team_key` 0 renders no team at all rather than "Unknown" or a link to it.
- **R6 — The event page states its own awards before its phases.** The section
  names the winners and the titles given, in the source's words, and is absent
  entirely for the 35 events that state none.
- **R7 — The team page is out of scope.** An award's team is the team the source
  states at the time, and one row names no team; a team-page list is a later
  question, not a free addition.

## Non-goals

- No ranking, no leaderboard of MVPs, no "distinctions per game" measure. A count
  of rows is a `GROUP BY` a reader can do; nothing here is a rate.
- No normalising of titles into canonical award names. Upstream keeps `MVP`, `MSI
  MVP` and `Most Valuable Player` as three strings on purpose; the site shows them
  as the source wrote them.
- No use of `place`/`place_number` in this pass: both are empty on every row. They
  are carried in the artifact, typed as the dictionary declares them, so a later
  pin that states a place does not need a new build.
