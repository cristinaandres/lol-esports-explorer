# 01: Publish the alias bridge, so a name from 2020 finds the team it is today

**Blocked by:** None (can start immediately)
**Status:** ready

## What to build

Two questions answered from committed data, with no UI yet:

1. **Which names did this entity play under, and when?** `MAD Lions`,
   `MAD Lions KOI` and `MKOI` are all Movistar KOI, each with the window the
   source states. `MAD Team` is a different team, and must stay different.
2. **Which entity does this typed name belong to?** The same answer, run backwards,
   for search.

This is a prefactor. Three later tickets need it and none of them should invent it
again: the team page lists renames, the champion page lists retired display names,
and search has to match a name nobody uses any more.

## Scope

- A pipeline view over the alias bridge and a published artifact carrying every
  alias with its kind, the entity it resolves to, the validity window and the
  evidence string the model recorded.
- A pure module with two entry points: the names for an entity, and the entities a
  typed string resolves to. No React.
- The module distinguishes a **stated** name from a **redirect**: a name with a
  validity window was used in that period and may be shown to a reader; a bare
  redirect is searchable but not listed, because listing every wiki redirect would
  turn a team page into a thesaurus.

No page changes in this ticket.

## Acceptance criteria

- [ ] The artifact carries all 3,791 aliases (2,872 player, 747 team, 172
      champion) with kind, alias, entity id and window.
- [ ] `MAD Lions`, `MAD Lions KOI`, `MKOI` and `Mad Lions` all resolve to Movistar
      KOI, which is the case the review named.
- [ ] `MAD Team` resolves to a different entity — the LMS team — and never merges
      into Movistar KOI.
- [ ] A name with no stated window still resolves for search.
- [ ] An entity with no alias returns an empty list, not a list containing its own
      current name.
- [ ] A string matching two different entities returns both, and the caller can
      tell that it did rather than getting a silent first match.

## Validation

Unit tests over the module for the four cases above, and a data test over the
committed artifact asserting the alias count and the Movistar KOI / MAD Team
separation. This ticket covers no numbered behaviour in the phase 3 spec on its
own; it is the ground R5 and R6 stand on.
