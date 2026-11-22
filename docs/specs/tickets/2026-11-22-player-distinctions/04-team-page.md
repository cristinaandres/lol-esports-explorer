# 04: A team page that states its players' awards, and keeps them with the club named

**Blocked by:** 01 (the artifact and the module)
**Status:** done

## What to build

A `Distinctions` section on `/teams/:id`, after `Titles` and before `Events`: the
awards the source states for this club's players, grouped by competition, newest
event first — the same shape the player page prints, with the player named instead
of the event.

This was scoped out of the first pass (spec R7) and asked for afterwards. The
reason it is not free is the one the copy has to carry: **the team is the one the
source names at that event**, not the roster as it stands today. A distinction is a
statement about one tournament, so an award follows the club the player was playing
for, and a club that bought a player afterwards does not inherit it.

## Scope

- `distinctionsForTeam` in `src/lib/honours.ts`, sharing the ordering rule with
  `distinctionsForPlayer`: newest event first, MVP-named titles before other places
  within one event, then the source's spelling, then the player's name.
- Key `0` resolves to no list, not to a list under "Unknown": the unknown member has
  no club page, and a stated absence is not a club.
- The section, its empty state, and the same three visible states the player page
  uses (loading card, failure with retry, "the source states none").
- The coverage sentence, measured on render exactly as it is on the player page.

## Acceptance criteria

- [ ] T1 lists five distinctions over five events, Faker twice, and a club with none
      says the source states none rather than showing nothing.
- [ ] The unknown team contributes no row to any club's list.
- [ ] The copy says an award stays with the club the source names at that event, so a
      transfer does not move it.
- [ ] `distinctionsForTeam` and `distinctionsForPlayer` cannot disagree about order:
      both use one comparator, and the tests cover both against the same rows.
- [ ] The page pays one extra request per session for the distinctions, and a second
      team page makes no new request.

## Validation

`honours.test.ts` (three cases: ordering, MVP-first, unknown team), the artifact
invariant that T1 carries five rows over five events, and a browser pass on T1 and on
a club the source says nothing about.

## Built

- **One comparator, two lists.** `byEventThenTitle` is shared, so the player's list
  and the club's list cannot drift: the rule is stated once, and the tests exercise
  both against the same rows.
- **The transfer question is answered in the copy, not inferred by a reader.** An
  award follows the club the source names at that event; T1's five rows are Faker's
  EWC 2024 and Worlds 2024, Zeus's Worlds 2023, Gumayusi's Worlds 2025 and Faker's
  MSI 2016.
- **13 clubs carry at least one award on this pin**, and one row names none, which is
  why key 0 is a test rather than a footnote.
