# 07: Events, the four cards, and the one that is not verifiable

**Blocked by:** 01, 02 (03 for the page)
**Status:** planned

## What to build

The four event cards.

- **More games before or after 32:00** (`game-length-32`): games with
  `duration_seconds ≤ 1920` over the games that state a duration; a game is counted
  once, not once per side (3,084 games, not 6,168 side rows); Wilson. Chart: a
  histogram of durations with the 32:00 line, and the share.
- **Who wins the shortest game** (`shortest-game`): the base rate over the shortest
  decile of the season — the blue-side win share in those games, with its `n` — and
  the record holder as a citation, not an answer (961 s, MSI 2019, Invictus Gaming
  vs T1). Chart: the decile marked on the duration histogram, and the side split.
- **Which role wins Finals MVP** (`finals-mvp-role`): the 11 awards at award grain,
  the role each player played at that event, and the census (Mid 5, Top 3, Bot 2,
  Support 1, Jungle 0). At `n = 11` the verdict is `insufficient_data` for any
  probability, and the census is printed with its denominator. Chart: a labelled bar
  of the census.
- **How many regions reach knockouts** (`region-knockouts`): `not_verifiable`. The
  page renders the verification query, its result today (19 region strings, 73 free
  text `tab` labels, four non-zero registry rows with no region plus the unknown
  member) and the decision that would unblock it: a committed stage-order table per
  event and a declared region vocabulary with its eras. It renders no number that
  reads as an answer.

## Scope

- The shortest-game answer is a share of the shortest decile, not a team
  prediction; the record holder is named as a fact and linked.
- The Finals MVP join is at award grain first; the fan-out to 208 player rows is the
  trap the view avoids, and a pipeline test asserts 11.
- The region page has no chart. A chart would imply a denominator that does not
  exist in the model.

## Acceptance criteria

- [ ] 32:00: 1,513 of 3,084 at the pin, its interval, and the histogram with the
      line.
- [ ] The shortest decile's share and `n`; the record holder as a citation.
- [ ] Finals MVP: 11 awards, the role census, the verdict `insufficient_data`, no
      interval.
- [ ] Regions: the query, the result today, the unblocking decision, and no answer
      number.
- [ ] The season's patches and cut are stated on every card.

## Validation

`npm run data:test`, the data tests for the event artifacts, the hand-run of the
region query, and a Playwright read of each card.
