# 03: An event page that names who the source honoured, before its phases

**Blocked by:** 01
**Status:** done

## What to build

A `Distinctions` section on `/events/:id`, before `Phases`: the players the source
names at this event and the titles it gave them — `Faker — MVP`, `Looper — All Pro
Team`, and so on — each player linked, each team linked unless the key is 0.

It is absent entirely for the 35 events that state none, which is not an error and
not a gap the site can fill: the source's coverage says so, and the section is for
the events where a statement exists.

## Scope

- The section and its copy, stating that the titles are the source's words and that
  most events in the corpus state none.
- Ordering: MVP-named titles first, then the others alphabetically, then player name,
  so a six-row MSI 2016 reads MVP above the five All-Pro places.
- The glossary entry `Distinction` (this ticket owns it), linked from both pages,
  so the term is lookable from wherever a reader meets it.

## Acceptance criteria

- [ ] MSI 2016 lists six rows: Faker `MVP`, then five `All Pro Team` players, each
      linked, each with their team where the source states one.
- [ ] Worlds 2024 lists Ruler's `Finals MVP` — one row, one player, one team.
- [ ] An event with no distinction row renders no section, no heading and no empty
      list; the page is not longer than it was.
- [ ] The section sits above `Phases`, so a reader sees who was honoured before the
      bracket.
- [ ] `/glossary#distinction` exists, and the anchor test in `glossary.test.ts` passes.

## Validation

`honours.test.ts` for the ordering and the six-row case, `glossary.test.ts` for the
anchor, and a browser pass on `/events/<msi-2016>` and one event with no award.

## Built

- **The section sits above `Phases`** (verified in the rendered page: the heading is
  50 lines before the bracket in the accessibility tree), and it is absent — heading,
  copy and all — for the 35 events that state none.
- **MSI 2016 renders MVP first, then the five All-Pro places**, each player linked,
  each team linked where the source states one.
- **`Distinction` is a glossary entry**, so the link both sections print resolves,
  and `glossary.test.ts` holds it there.
