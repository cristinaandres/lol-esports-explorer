# Information architecture

The spine, the URL for each level, and the component rules each screen must obey.
This document is also the brief for the Figma file: the names below are the frame
names.

## Two axes, and a third that hangs off them

**Axis A — the record: what happened.** Era → event → series (only when it is not
a best-of-one) → game. Chronological, narrowing.

**Axis B — the entity: who did it.** Player, team, champion. These do not hang
under an era; they cross every era and take the era as a filter. Each kind has an
index of its own, and every trail starts at **Home** — `Home / Players / Faker`,
never `Home / Eras / Faker`. The root crumb names the level, not what currently
fills it, so reorganising the home page does not falsify every breadcrumb.

The two axes meet at a game page, where every name is a link into Axis B that
carries its context.

**Axis C — the question: what is likely.** A pick'em asks about a tournament that
has not been played, so its answer cannot hang under either axis: it is a window of
the past, scored and labelled with its cut date. It has its own level, and its
routes are marked not built until round 4a ships them.

```
/                       the era spine: every era, as cards
/eras                   index: every era, with its span and games
/eras/:era              coverage, boundaries, the events in it
/events                 index: every event, grouped by competition
/events/:event         teams, coverage, series by phase, series-less games
/events/:event/phases/:phase
                        the series of one phase of an event (its `tab`)
/series/:series         only for best-of-three and above
/games/:game            scoreboard, draft, player rows
/players                index: every player, with the games they appear in
/players/:player        context (if arrived from a game) + career with filters
/teams                  index: every team, grouped by region
/teams/:team            same shape as a player, with its renames
/champions              index: every champion, with the games it appears in
/champions/:champion    pick and ban record across eras
/glossary               every term, including the absent ones
/selection              the audit: every candidate event and the rule that decided
/almanac                the eighteen questions, grouped by class
/almanac/:id            one question, one Answer, its season in the URL
/calibracion            (not built, round 4b) the backtest: precision@K per edition
*                       not found: the only route that claims nothing
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

## Level 2 — event

Teams with the games they played, the event's own coverage, the distinctions the
source states for its players, the series grouped by phase, and the games the source
attaches to no series. The header names the winner where the final is the single
series named Finals; an event that names several such series names nobody. The
distinctions block sits above the phases — who was honoured, in the source's words,
before how the bracket was played — and is absent for the 35 events that state none.
A series of one game links straight to the game; the rest link to a series.

## Level 3 — series (conditional)

Only rendered for best-of-three and above. For a best-of-one, the event links
directly to the game: a level that exists for one third of the corpus is a level
the reader has to learn for no reason.

## Level 4 — game

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

Below the derived `Titles` section, the player page states the source's own
`Distinctions` — MVPs and All-Pro places — in its own words and in its own section.
One is the site's reading of the bracket, the other is somebody's statement about
the player; nothing on the page merges them, and the copy names the events the
source says nothing about.

**Figma frames:** `50-player/context`, `50-player/career`, `50-player/filters`.

## Level Q — the question, and The Almanac

A third axis, and the only one that is not a level of the record: a question about
the future is answered from a window of the past. It hangs off no era and no entity,
because its subject is a tournament that has not been played.

```
/almanac                        every question, grouped by class
/almanac/:id?season=&end=&top=
                                one question, one Answer, its season in the URL
/calibracion                    (round 4b) the backtest, per edition and family
```

Four classes — champions, players, teams, events — and the answer family is a tag on
the card, not the navigation. Every card opens one page: the `Answer` (headline with
number, interval and `n`; evidence; visible limits; source with the pin's checksum),
then a table and an interactive chart for the reader to draw their own conclusion.

The window is a **season**, derived from Worlds: season N runs from the day after
Worlds N−1 final to Worlds N final. The page offers "all games" and the sixteen
seasons; `?end=worst` opens the other end of a two-ended card and `?top=10` widens the
ranking. A chart never appears without its table, or without its `n` and denominator,
and no number lives only in a tooltip. The one card the model cannot answer — regions
in knockouts — renders its verification query and the decision that would unblock it.

**Figma frames:** `60-almanac`, `60-almanac/answered`, `60-almanac/insufficient`,
`60-almanac/not-verifiable`, `60-almanac/top-k`, `61-calibration`.

## Cross-cutting components

| Component | Rule |
|---|---|
| `Ratio` | Renders `62% (8/13)`. The only way a share may appear. |
| `CoverageBadge` | `complete` / `partial` / `unavailable`, with the group it refers to. |
| `Breadcrumbs` | The path from the top is always visible; back is a link, not a gesture. |
| `EmptyFilter` | The state a filter produces when nothing survives it: names the half that emptied the view and offers one control that brings the games back. |
| `HoverNote` | The evidence behind a figure, on demand: a dotted underline under it, opening the note on hover and on keyboard focus, with a native `title` as the fallback. The bubble is clamped inside the viewport, because a trigger near either edge would otherwise clip it. |
| `SelectField` | The one labelled native `<select>`: the career filters and the index sort both use it. Native because it is keyboard-operable and announced correctly without a line of JavaScript. |
| `ClampedText` | Prose that has to match the height of the column beside it: two lines, an ellipsis, and a `See more` control rendered only when the text really overflows. The full text stays in the DOM, so nothing is hidden from a screen reader or a search engine. |
| `Answer` | The whole of an Almanac answer, and the only way one may be drawn: headline with number, interval and `n` together; evidence line with the season's patches and the cut date; a visible `limits` list; the source and the pin's checksum. Its verdict (`answered`, `insufficient_data`, `not_verifiable`) is a labelled chip, and no branch of it renders the number without the other three blocks. |
| `Chart` | A view of a table that is always beside it: interval dot plot, interval bar, histogram or bucket columns, drawn with visx and the site's tokens. Hover and focus show the numbers; the number also lives in the table. |

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
