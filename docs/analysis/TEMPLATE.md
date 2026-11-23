# <Question> — which evidence blocks, and why

> Copy to `<question>.md` and fill it in. Delete this block when the copy is real.
> The section headings stay: they are what makes two dossiers comparable, and what
> a reviewer checks for.

> Queries in this document assume the semantic views are loaded from the repository
> root: `.read pipeline/sql/01_semantic_views.sql`. They are evidence, not scripts:
> nothing runs them.

State: exploring · decided · superseded by `<file>`
Pinned at: tag `<vX.Y.Z>` · model `manifestSha256` `<f919082a…>` · read on `<date>`
Answers: `<the decision this dossier settles, in one sentence>`

## The question as a decision

What has to be chosen here — blocks, axes, filters, thresholds — in the product's
words. Not what the data says yet. One paragraph, and the alternatives that were on
the table.

- Option A: `<one line>`
- Option B: `<one line>`
- Not on the table, and why: `<one line>`

## Findings

One subsection per finding. A finding is a claim, the query that proves it, the
result, and the decision it moves. If a finding moves nothing, delete it.

### F1 — `<one-line claim>`

```sql
-- the query, runnable against pipeline/sql/ with .read pipeline/sql/01_semantic_views.sql
```

Result (as of the pin above):

| `<column>` | `<column>` | `<column>` |
|---|---|---|
|  |  |  |

Method: `<none — plain SQL | Wilson 95% | bootstrap percentile, 10 000 resamples |
simulation, 10 000 replications>` · Seed: `<20261123, only when there is randomness>`
— a count needs no method line; a proportion with an interval, or anything random,
does. Without the method the number is an opinion, and without the seed it cannot be
reproduced.

What it changes: `<the decision, or the block it rules out>`

### F2 — `<one-line claim>`

```sql
```

Result:

| `<column>` | `<column>` |
|---|---|
|  |  |

What it changes: `<…>`

## Decisions

| # | Decision | Because | What would reverse it |
|---|---|---|---|
| D1 | `<the block ships / does not ship / carries this caveat>` | `F1` | `<a measurement that would settle it the other way>` |
| D2 |  |  |  |

## What I did not check

- `<the window not looked at, the field assumed clean, the question deferred>`
- `<the measurement that would be needed to go further>`

## Change log

Append-only. One line per edit, newest last.

| Date | Change | Why |
|---|---|---|
| `<YYYY-MM-DD>` | first version | — |
