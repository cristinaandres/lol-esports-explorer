# 07: Search by any name an entity ever had

**Blocked by:** 05 and 06 (both entity kinds must exist to link to)
**Status:** done

## What to build

A search box in the site header that finds a player, a team or a champion by any
name it has ever had. Typing `mad lions` finds Movistar KOI and says *formerly MAD
Lions*; typing `mkoi` finds the same page. Without this, the only way into an entity
is to arrive from a game that happens to contain it, which means most of the corpus
is unreachable except by guessing a URL.

Results are grouped by kind, because a player and a team can share a word. The box
is usable with a keyboard alone, announces how many results it found, and never
takes the reader somewhere else on its own.

## Scope

- The search index, built in the browser from the committed name lists and the
  alias bridge: 3,791 aliases plus 1,554 current names.
- Matching: case- and accent-insensitive, substring, with the current name ranked
  above a former one, and a former-name match labelled with the name that matched.
- The header control, its results list, and a no-results state that names the
  query.
- Links into the three entity pages built by tickets 02, 05 and 06.

## Acceptance criteria

- [ ] `mad lions` returns Movistar KOI, and the result says *formerly MAD Lions*.
- [ ] `MKOI` returns the same result, and `MAD Team` returns the LMS team.
- [ ] Results are grouped by kind and each group says how many it holds.
- [ ] A query with no match says so and names the query, and offers nothing else.
- [ ] The control is operable with the keyboard alone: a visible focus ring, arrow
      keys through results, Enter to open, Escape to close.
- [ ] The result count is announced to a screen reader, not only shown.
- [ ] Opening a result and coming back leaves the query as it was.
- [ ] The search costs no extra request on a page where it is not used.

## Validation

Unit tests on the matcher (exact, substring, accent, alias-hit, ambiguity), and a
browser check of the keyboard path from the header to a result and back. Covers no
numbered behaviour in the phase 3 spec: search was added in review, and it is the
entry point the spec left open.

## Built

- The alias bridge is fetched on first focus, not on mount: a page a reader is
  reading never pays 63 KB for a search they did not start. Verified in the network
  log — ten data requests before typing, `aliases.json` only after.
- Ranking is exact > prefix > substring, and a current name beats an alias at the
  same rank: an alias hit must not outrank the thing it is an alias of.
- One result per entity. A name that is both a current name and somebody's former
  handle returns both entities, which is why `APA` lists two players.
- The query is kept after opening a result, so coming back to the page shows what
  was typed instead of an empty box.
- Verified: `mad lions` returns Movistar KOI with *formerly MAD Lions*; `nunu`
  returns the champion with its former name; arrows and Enter open a result;
  Escape closes; the count is announced through a live region.
