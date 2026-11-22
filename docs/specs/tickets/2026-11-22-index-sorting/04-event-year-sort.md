# 04: An events index that can sort by year as well as by competition

**Blocked by:** — (needs the shared sort control from 01 only if that lands first)
**Status:** done

## What to build

`/events?sort=competition` (today), `?sort=year&order=desc` (newest first) and
`?sort=year&order=asc` (oldest first). 54 events, 10 competitions, 2011–2026.

## What "sort by year" changes, exactly

Today the page groups by competition and orders newest-first **inside** each group; the
groups themselves are ordered by size. Sorting by year inverts the shape of the page:
the group is the year, and the events inside it are ordered by event name, because a
year is not a rank. `order` therefore applies to the **year groups**, and the lead
sentence has to say which way round it is — "2026 first" is only obvious to the person
who asked for it.

Both directions are asked for, so `order` is a second parameter rather than two sort
values: `sort=year&order=asc` is the URL a reader can edit, and an unknown `order`
falls back to `desc`.

## Scope

- The shared sort control from ticket 01, plus a `direction` toggle shown only when the
  sort has one (by year), so the control does not offer a choice that does nothing.
- `?sort=` and `?order=` parsed and validated in one place, so a bad value cannot
  reach the comparator.
- The year group header prints the year and the count of events in it; the competition
  mode keeps its current header. The lead sentence follows the mode.
- Nothing about how an event is fetched, derived or linked changes: this is ordering
  and grouping only.

## Acceptance criteria

- [ ] The three modes' event counts all equal 54, and every event appears exactly once.
- [ ] `year&desc` starts at 2026 and ends at 2011; `year&asc` is its exact reverse.
- [ ] Inside a year group, events are ordered by name — a stable order, not the
      artifact's.
- [ ] `sort=competition` is today's page, and a bare `/events` means it.
- [ ] An unknown `sort` or `order` value falls back to the default with no error and no
      empty page.
- [ ] The direction toggle is not rendered in competition mode.
- [ ] Each state is linkable: the URL reproduces the page after a reload.

## Validation

Vitest over the grouping/order helper with a four-event fixture spanning two years and
two competitions, covering both directions and the fallbacks, then the page read
through the Playwright MCP server for the first and last year in each direction.

## Built

- `src/lib/eventGroups.ts` holds the two groupings and the URL parsing; `?sort=year` and
  `?order=asc|desc` are read through it, and an unknown value of either falls back to
  the default rather than emptying the page.
- `sort=competition` is unchanged: groups largest first, events newest first inside,
  and the direction is ignored — there is nothing for it to order when the groups are
  competitions, so the control is not rendered in that mode.
- `sort=year` groups by year and orders the groups by `order`; events inside a year are
  ordered by name, because a year is a date and not a ranking. The lead says which way
  round the list runs.
- No new data: the year and the competition were already on `events.json`, so this is
  grouping and ordering only.
- Tests: `eventGroups.test.ts` — both parsers and their fallbacks, competition order
  (size, then name, newest inside), year order in both directions and its exact reverse,
  name order inside a year, and no event dropped. On the page: 2026 → 2011 for `desc`,
  2011 → 2026 for `asc`, 54 events in every mode.
