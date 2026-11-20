# 01: Say which events were left out, and why

**Blocked by:** None (can start immediately)
**Status:** done

## What to build

A page that answers the question the corpus invites and never answers: *why is this
event here and that one not?* The dataset already carries the audit trail —
`event-selection.jsonl`, 235 candidate events, each with the decision, the rule and
the key that decided it — and the site only ever prints the totals `52 played of 54
admitted`.

The page groups the candidates by rule, shows how many each rule admitted and
rejected, and lists the rejected ones with the rule that excluded them. It is the
difference between a rule the reader has to trust and one they can check.

## Scope

- Pin `event-selection.jsonl` alongside the model, with its hash in `meta.json` and
  a line in `PROVENANCE.md`, and add it to the refresh script.
- One pipeline view over it and one artifact.
- A page under the footer's "about this" group, linked from every event page with
  one line: *why these events*.
- No filtering or search: 235 rows grouped by rule is already readable.

## Acceptance criteria

- [ ] The page states 235 candidates, how many were admitted and how many rejected.
- [ ] Each rule shows its admitted and rejected counts, and they sum to 235.
- [ ] Every rejected event names the rule that excluded it.
- [ ] The counts agree with the artifact; a test asserts the sum rather than trusting
      the page.
- [ ] Reachable from the footer and from a link on each event page.

## Validation

A data test over the pinned artifact: the decisions partition the 235 rows, and the
admitted set matches the events the site renders. Covers the corpus's own R1 claim.

## Built

`/selection` — 235 candidates, 54 admitted, 181 rejected, grouped by the six rules that
decided them, with every rejected event and the rule that excluded it. Linked from the
footer and from the foot of every event page.

The artifact is pinned as `data/upstream/event-selection.json`, with its source, the
pin date and a note explaining why it is here; `meta.json` hashes it with the rest.
