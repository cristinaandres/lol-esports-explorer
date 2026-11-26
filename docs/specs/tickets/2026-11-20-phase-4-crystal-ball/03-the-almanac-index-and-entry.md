# 03: The Almanac index and the entry page

**Blocked by:** 01, 02
**Status:** done

## What to build

`/almanac` and `/almanac/:id`, the shell the four class tickets fill.

- `src/routes/AlmanacIndex.tsx`: the eighteen cards in four class sections
  (champions, players, teams, events), each with the question, its family as a tag,
  its verdict chip and the headline of the default window (`all`), linking to
  `/almanac/<id>`.
- `src/routes/AlmanacEntry.tsx`: breadcrumbs, the question, the class and family
  tags, the window controls, the `Answer`, the evidence panels (table and chart),
  and the entity links the answer names. The top of the page states the season, its
  patches and its cut date.
- `src/lib/almanac.ts`: the pure helpers the two routes share — grouping by class,
  resolving `season`/`end`/`top`, the default window, the entry's label and the
  canonical URL.
- `src/lib/data.ts`: `loadAlmanac()` for the index and `loadQuestion(id)` for one
  file, both lazy and memoised like the existing loaders.
- The navigation entry (The Almanac), a home-page card, and a glossary entry for
  "season" and "Almanac".

## Scope

- **One page per question**, per the class decision: the index is the overview and
  the entry page is the evidence. A card carries the default headline so a reader
  who does not click still has a number with its denominator.
- **The window is seasons.** `?season=2025` selects a season; no parameter is
  `all`. `?season=2025&end=worst` selects the other end of a two-ended question;
  `?top=10` widens the ranking. An unknown question id is a 404; a season the
  artifact does not carry is a page that says so, not an empty answer.
- **No dead links.** Only `/players`, `/teams`, `/champions`, `/events`, `/games`
  and the Almanac itself are linked. `/calibracion` is not linked until 4b ships it.
- **No number without its context.** The entry page prints the cut date, the
  season's patches and the selection-bias limit above or beside the evidence, not in
  a footnote.

## Acceptance criteria

- [ ] `/almanac` lists eighteen cards in four classes, each with a verdict and a
      headline.
- [ ] `/almanac/champion-presence?season=2025` renders the top five with intervals,
      the order rule and the K used.
- [ ] The two-ended pages (`champion-win-rate`, `champion-kda`, `team-win-rate`)
      switch ends without reloading the artifact.
- [ ] `?top=10` and `?top=20` slice the stored candidates and print the K.
- [ ] An unknown id is a 404; an unknown season names the seasons the artifact
      carries.
- [ ] A cold deep link renders the entry page, its window and its controls.
- [ ] The page names every link it draws and draws none that 404s.
- [ ] A Playwright snapshot of the index and one entry page is read, not inferred.

## Validation

`npx vitest run src/lib/almanac.test.ts src/routes/AlmanacIndex.test.tsx
src/routes/AlmanacEntry.test.tsx`, then `npm run dev` and the Playwright MCP server
for the rendered page.

## Built

- **`/almanac`** groups the committed index into four class sections, each card with its family, verdict and all-games headline: 18 cards, 5 / 6 / 3 / 4.
- **`/almanac/:id`** resolves `season`, `end` and `top` from the URL and renders the `Answer`, the window (season, games, events, patches, cut), the current-window chart with its table, the by-season chart, and the order/K lines. `?season=1999` says the season is not published and offers all games; an unknown id is the 404; a two-ended card switches ends; `top=10` and `top=20` slice the stored ranking and print the K.
- **The chart layer is used, not just proved**: the top-K dot plot with its table and entity links, the interval bar for a share, the census histogram, the by-season columns; the count card shows the observed series.
- **The route is split.** `React.lazy` keeps the visx code out of the first load: the main bundle is 117 KB gzip, the entry chunk 25 KB and the shared Almanac chunk 4 KB.
- **The evidence line for kill participation** names the team kills as its denominator, and the patches are in the order the season played them (2019 reads 9.8, 9.12, 9.13, 9.19).
- **Proved in the browser.** Playwright read `/almanac`, `/almanac/champion-presence?season=2025`, `?top=10`, the worst end, Teemo's census, the region verification, an unpublished season and an unknown id; no console error beyond the dev server's `/favicon.ico` request.
- 19 new tests (the helpers, the index view, the entry view); `npm run check` green.
