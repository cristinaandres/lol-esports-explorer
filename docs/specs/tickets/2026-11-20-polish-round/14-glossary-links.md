# 14: Let the technical words link to what they mean

**Blocked by:** None for the text that exists today; see the note on ordering
**Status:** ready

## What to build

The glossary left the navigation for the footer, which is right — but it is now a page
nothing points to, and the site is full of words that need it: *presence*, *coverage*,
*era*, *KDA*, *nullified*.

Each entry gets a stable anchor, and the first use of a term in a caption or a
definition links to it. Not every occurrence: a page that links "presence" five times
is a page that reads like a thesaurus.

## Scope

- Anchors on the glossary entries.
- Target links in the captions that define a term — coverage on the era and event
  pages, presence on the champion page, KDA on the player page.
- A test that every anchor the site links to exists, so a rename cannot leave a dead
  link.

## Acceptance criteria

- [ ] Each glossary entry has an id and the page links to them from the footer.
- [ ] At least the five terms above link from the caption that uses them.
- [ ] No term is linked twice in the same block.
- [ ] A test asserts every linked anchor resolves.

## Validation

A test collecting the anchors the source links to and comparing them with the ones
the glossary renders, plus a browser check of one link per term.

## Note on ordering

Blocked by 01, 03, 04, 05 and 06, whose captions introduce the text this links from.
