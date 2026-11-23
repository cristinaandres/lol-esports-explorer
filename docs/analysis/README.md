# Analysis

Data dossiers: the research that decides **what an answer page shows**, not what
the answer is. Each dossier belongs to one question from the phase 4 catalogue and
ends in decisions — which blocks of evidence a page carries, on which axis, with
which filters — so that a reader draws their own conclusion from the record.

The dossiers are the author's. This directory states how they are written and kept
honest; it does not contain findings of its own.

## Why this directory exists

A question like *highest champion presence* can be drawn a dozen ways: a share, a
split, a series over patches, a per-role table, a top-K with intervals, all of them.
Which ones ship is a product decision, and it deserves the same evidence as a
metric: measurements, a denominator, and a written reason. That is a dossier.

It is also the part of the work that cannot be recovered from the code. The site
will show whatever the components show; the dossier is what says *why* those and
not others, and what would make the choice wrong later.

## The rules

1. **Dated and pinned.** A number is never "currently". It is "as of tag `v1.2.0`,
   model `manifestSha256` `f919082a…`, read on 2026-11-23". A snapshot that says it
   is a snapshot ages visibly; a table of numbers with no date ages silently, which
   is worse.
2. **The query sits beside the number.** Every figure carries the SQL that produced
   it, copy-pasteable against `pipeline/sql/`. That is what turns "32" into
   something a reviewer can check.
3. **Every finding ends in a decision.** A measurement that changes nothing does not
   belong here; it belongs in a one-off report. The unit of a dossier is "this
   measurement, therefore this block ships / does not ship / carries this caveat".
4. **Append, do not overwrite.** A new pin opens a new dated section. Old numbers
   stay, with their pin, so the history of a decision is readable. A decision that
   reverses is recorded with its date and the measurement that caused it.
5. **Tables, not screenshots, and no committed notebook output.** The dossier is
   the record; a notebook is the instrument. Instruments live in
   [`notebooks/`](../notebooks/) — committed clean, without outputs — and their
   results are copied here as a table with its query.

## Structure

One dossier per question, named after it (`champion-presence.md`), starting from
[`TEMPLATE.md`](TEMPLATE.md). Deliberately **without a date in the filename**: a
spec is written once and dated, a dossier is kept current and dates its sections
inside.

| Dossier | Question | State |
|---|---|---|
| — | none written yet | — |

## How a dossier is written

1. Explore with whatever tool suits — [`notebooks/`](../notebooks/) has the setup
   cell, so the kernel finds the views from either the repo root or that directory.
   Keep the queries that survive the exploration.
2. Write the dossier top-down: the decision to be made, then findings, then the
   decisions table.
3. Fill **What I did not check**. It is the first section a reviewer reads and the
   one that keeps the document honest.
4. When a dossier changes a page, the change goes through the phase 4 spec and its
   ticket, not directly into a component. A dossier argues; a spec decides.

## What a dossier is not

- **Not a spec.** It states no required behaviour and no acceptance criteria; those
  live in `docs/specs/`.
- **Not a metric definition.** Anything a page prints is defined in
  `docs/metric-definitions.md` first.
- **Not exhaustive.** It records what was asked, measured and decided — not
  everything the corpus can say.
