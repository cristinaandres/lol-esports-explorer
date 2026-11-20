# Information architecture

The spine, the URL for each level, and the component rules each screen must obey.
This document is also the brief for the Figma file: the names below are the frame
names.

## Two axes

**Axis A — the record: what happened.** Era → event → series (only when it is not
a best-of-one) → game. Chronological, narrowing.

**Axis B — the entity: who did it.** Player, team, champion. These do not hang
under an era; they cross every era and take the era as a filter. Each kind has an
index of its own, and an entity page's breadcrumb starts there — `Players / Faker`,
not `Eras / Faker`.

The two axes meet at a game page, where every name is a link into Axis B that
carries its context.

```
/                       the era spine
/eras/:era              coverage, boundaries, the events in it
/events/:id             teams, format, series list, leaders, draft pool
/series/:id             only for best-of-three and above
/games/:id              scoreboard, draft, player rows
/players                index: every player, with the games they appear in
/teams                  index: every team, grouped by region
/champions              index: every champion, with the games it appears in
/players/:id            context (if arrived from a game) + career with filters
/teams/:id              same shape
/champions/:id          pick and ban record across eras
/compare                two teams side by side: the pick'em view
/glossary               every term, including the absent ones
```

## Level 0 — the era spine

Six cards carry games; two declared eras are shown as gaps, because the game
changed during a window in which no international event ran.

Each card: index, era title, competitive span, games, patches recorded, and the
one sentence on what changed. A gap card states why it is empty.

**Figma frames:** `00-home`, `00-home/mobile`, `00-home/skeleton`.

## Level 1 — era

- Stat row: games, series, events, teams, players, average length.
- "What this era can be measured on": draft, player stats, team stats, blue-side
  share, each as `share (n/total)`.
- "Why this boundary": the upstream citation, verbatim. This is the page's
  credibility, not a footnote.
- The event table for the era.
- Previous / next era, including gaps — the spine navigates in both directions.

**Figma frames:** `10-era`, `10-era/coverage`, `10-era/gap`.

## Level 2 — event (next phase)

Teams, format, the series list, leaders per role, draft pool with pick and ban
counts. Rows that are best-of-one link straight to a game; the rest link to a
series.

## Level 3 — series (conditional)

Only rendered for best-of-three and above. For a best-of-one, the event links
directly to the game: a level that exists for one third of the corpus is a level
the reader has to learn for no reason.

## Level 4 — game (next phase)

Two-sided scoreboard, the full draft with its fidelity (`ordered` or `unordered`),
player rows with role and champion, and the reconciled team totals.

Each player name links to `/players/:id?from=game:xxx`.

## Level 5 — entity, and the local/global split

The pattern the reader asked for, made explicit. Arriving from a game:

```
┌ Context ─────────────────────────────────────────────────┐
│ 2025 Worlds · Final · Game 3 · T1 (blue) · WIN           │
│ Azir · 7/2/9 · 178 CS · 14.2k gold · era: atakhan        │
└──────────────────────────────────────────────────────────┘
   [ Career view → ]
```

Career view filters, in this order:

1. **Competition** — Worlds, MSI, IEM, Rift Rivals, Esports World Cup, First
   Stand, IPL, WCG, Mid-Season Cup.
2. **Year** — from the years the entity actually has games in.
3. **Era** — read-only, derived from the years selected. It is never chosen
   directly, because era and year together allow empty combinations.

Every filter is a query parameter, so `/players/faker?competition=Worlds&year=2025`
is a link that reproduces the view.

The career block always shows: games (`n`), wins and losses, win share with its
denominator, KDA with its formula, per-game averages, and the champion pool with
counts. Nothing is shown when the sample is zero — the page says so instead.

**Figma frames:** `50-player/context`, `50-player/career`, `50-player/filters`.

## Cross-cutting components

| Component | Rule |
|---|---|
| `Ratio` | Renders `62% (8/13)`. The only way a share may appear. |
| `CoverageBadge` | `complete` / `partial` / `unavailable`, with the group it refers to. |
| `Breadcrumbs` | The path from the top is always visible; back is a link, not a gesture. |
| `EmptyState` | Says what is missing and why, never just "no data". |

## Visual rules

- One accent (gold) for the current selection and for emphasis on a number.
  Blue and red appear only where a side is meant.
- Numbers are tabular; alignment carries comparison.
- A number that is absent renders as `—`, never `0`.
- Colour never carries meaning alone; every coloured state has a label.
- **The date is stated once per page.** A list row carries its own date, because
  a list is many days at once. A detail page states the date in the header and
  nowhere else: repeating it per game row makes it look like two competing dates,
  and 1,931 of 1,964 series fit on one day. A series that spans two days states the
  range in the header, not a date on each row.
- **A level states what it is; the level below states how.** The series page says
  which team won each game; which side they won on belongs to the game, where the
  scoreboard can show both sides at once.

Tokens live in `src/index.css` under `@theme`. Figma variables must use the same
names (`ink-950`, `fog-300`, `gold`, `side-blue`, `side-red`) so a design and the
build cannot drift.
