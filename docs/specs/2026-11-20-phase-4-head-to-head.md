# Phase 4 — Head to head, the pick'em view

Status: proposed. Depends on phase 3 (team pages and team identity).

## Objective

Before an international event, a spectator filling in a pick'em asks one question:
*which of these two teams should I pick?* The honest answer is a record with its
sample size, not a prediction. This phase builds the one page that puts two teams
side by side, and it is the page that most clearly embodies the product rule.

## Current behavior

- Teams appear only as names on a game page (phase 2) and as a single page (phase
  3). There is no page that compares two of them.
- Measured: 181 teams appear in at least one game. Head-to-head samples are small —
  at Worlds 2019, 120 games are spread across 24 teams, so two teams meeting five
  times is already unusual.
- The model carries per-game totals only: no timeline, no per-minute gold, no
  draft order for 641 games.

## Required behavior

- **R1** `/compare?a=team:<id>&b=team:<id>` renders the two teams side by side,
  with the URL reproducing the view.
- **R2** A head-to-head block shows the games where the two teams were the two
  sides of one game: games, wins each, and the side split, always with the
  denominator.
- **R3** When the head-to-head denominator is below five, the block is visibly
  marked as a small sample and no percentage is emphasised. The threshold is a
  named constant, not a number buried in a component.
- **R4** Recent form shows each team's last *n* games with dates, marked as
  recent, with *n* taken from the URL and defaulting to 10.
- **R5** Champion pool overlap: champions both teams have played, with the counts
  on each side.
- **R6** The page never states or implies a predicted winner, a score, or a win
  probability. There is no number on it that is not a count, a sum of counts, or a
  ratio of two displayed counts.
- **R7** Either team id missing, unknown or equal to the other renders an
  instructive state that names what is wrong, not a blank comparison.

## Non-goals

Any predictive model, any rating (Elo or otherwise), any "form index", and any
scoreline prediction. These are refused on purpose, not deferred.

## Constraints

- No additional artifact: the comparison is computed from `games.json` and
  `player-games.json`, both already available after phases 2 and 3.
- The page must answer within the same in-memory budget as the entity pages.
- Two teams with zero games between them is a normal case, not an error.

## Design decisions

- **Head-to-head is a filter on games, not a new table.** Both teams being the two
  sides of one game is the whole definition; anything wider (same event, same
  era, both beat a common opponent) is a different claim and would be labelled
  differently or not shown.
- **Recent form is stated as recent.** A team's last ten games come from whatever
  events it played, which may be a year apart. The dates are shown so the reader
  can see that the "form" spans eighteen months.
- **The small-sample marking is a component, not a copy tweak**, so the threshold
  is enforced in one place and every future comparison inherits it.

## Test seams

- **`src/lib/headToHead.ts`** — `headToHead(a, b)` tested with: teams that never
  met (zero), teams that met once, and teams that met across two events. The
  function returns counts only, which makes the no-prediction rule testable.
- **A test that the rendered comparison contains no percentage above the
  small-sample threshold without its denominator.**
- **Data test** — the total of every head-to-head pair across the corpus equals the
  number of games both teams played, so no game is counted twice.

## Acceptance criteria

- [ ] Two teams that never met render an honest zero, not an empty page.
- [ ] A one-game head-to-head is marked as a small sample and shows no emphasised
      percentage.
- [ ] `?n=` changes the recent-form window and the URL reproduces it.
- [ ] No string on the page states a predicted outcome; a test greps the rendered
      output for the words this rule forbids.
- [ ] Every number on the page is a count or a ratio of two displayed counts.

## Verification

```bash
npm run check
duckdb -c ".read pipeline/sql/01_semantic_views.sql" \
       -c "select count(*) from game_facts
           where (blue_team_key = :a and red_team_key = :b)
              or (blue_team_key = :b and red_team_key = :a);"
# and the same pair on /compare must show that number as n
```

## Open assumptions

- **That spectators want a comparison rather than a recommendation.** The product
  bet is that a reader who is shown `2–1, three games` is better served than a
  reader told `67%`. If that bet is wrong, the fix is a different page, not a
  model bolted onto this one.
- **That recent form should be measured in games, not days.** Ten games in the
  same event is a different claim from ten games across two years; the dates are
  shown so the reader can tell which they are looking at.
