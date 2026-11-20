# 12: A skeleton on every route, not the word Loading

**Blocked by:** None for the routes that exist today; see the note on ordering
**Status:** done

## What to build

The home page shows a skeleton while the dataset loads; every other route prints
"Loading…" in body text, which is the one thing a loading state should not do —
announce that nothing is ready and then move everything when it is.

Every route gets a skeleton that reserves the height of what is coming, so the page
does not jump when the data lands.

## Scope

- One shared skeleton with a few variants (figures, table, card grid).
- Every route that fetches, including the index pages and the entity details.
- The lazy blocks inside a page (draft, players, roster) keep their own skeletons.

## Acceptance criteria

- [ ] No route renders the string "Loading" to the user.
- [ ] The height reserved is within a few pixels of the loaded content at 390 and
      1440, so nothing jumps.
- [ ] A failed fetch still shows an error, not a skeleton forever.
- [ ] The skeleton is announced to a screen reader as busy, not as content.

## Validation

A browser check per route: capture the layout box during load and after, and compare.

## Note on ordering

Do this after the tickets that add or move sections on these pages — 03, 04, 05 and 06
— or the skeletons will describe a layout that no longer exists.

## Built

`PageSkeleton` replaces the word "Loading" on all eleven routes that fetch: a header
bar, a lead, six figure cells and two blocks, announced with `role="status"` and
`aria-busy` rather than read as content.

Verified with the data requests delayed by 700 ms on seven routes: the skeleton appears
on all of them and no route renders "Loading…" as text.
