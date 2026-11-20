# 05: A team page that survives a rename

**Blocked by:** 03 (inherits the filter bar and the query-string contract)
**Status:** ready

## What to build

`/teams/:id` — a team's record: the events it played, its side preference, and the
roster over time, all narrowed by the same competition → year filters the player
page uses.

The rename case is the reason this ticket exists. `MAD Lions`, `MAD Lions KOI` and
`MKOI` are one team, Movistar KOI, and the page has to say so: a reader who
remembers the 2021 roster looks for "MAD Lions" and must find this page, and a
reader who lands here should see the names the team played under, with the years
they applied. `MAD Team` is a different organisation and must not appear.

The roster is **derived**: the model has no roster table, so a team's players are
the people who appeared in its games. That is a fact about who played, not who was
signed, and the page says so rather than implying a transfer history it cannot
know.

## Scope

- The team page: event record, side preference, roster over time.
- The filter bar from ticket 03, applied here (the phase 3 spec left filters out of
  teams; the review added them, because a team accumulates fifteen years of roster
  and unfiltered it is a wall).
- The former names, from ticket 01, shown with their windows and never merged with
  another team.
- Team names in the game scoreboard and in the event table become links.

## Acceptance criteria

- [ ] `/teams/` for Movistar KOI lists MAD Lions, MAD Lions KOI and MKOI with their
      windows, and does not list MAD Team.
- [ ] Filtering to a competition and a year narrows the event record and the roster
      together, not one of them.
- [ ] The roster is labelled as derived from appearances, and names the games it is
      derived from.
- [ ] Side preference shows its denominator and the era it was measured in, because
      side advantage is an era property, not a team property.
- [ ] A team with one event and three games renders honestly rather than looking
      broken.
- [ ] Team names in the scoreboard and the event table link here.
- [ ] An unknown id renders the 404 page.

## Validation

Unit tests on the roster derivation (a player who appears, leaves, and returns; a
team that changed region), a data test that every team's appearance total equals
the rows that reference it, and a browser walk from a scoreboard into a team.
Covers spec R5, extended by the review.
