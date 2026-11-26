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
5. **Tables, not screenshots, and no committed notebook.** The dossier is the
   record; a notebook is the instrument, and it lives in `scratch/` — ignored by git,
   never committed. Its results are copied here as a table with its query.

## Structure

One dossier per question, named after it (`champion-presence.md`), starting from
[`TEMPLATE.md`](TEMPLATE.md). Deliberately **without a date in the filename**: a
spec is written once and dated, a dossier is kept current and dates its sections
inside. The catalogue audit is the exception: one dossier for the whole catalogue,
because the decision it settles is the catalogue's shape, not one card's layout.

| Dossier | Question | State |
|---|---|---|
| [`crystal-ball-audit.md`](crystal-ball-audit.md) | which eighteen generic questions ship as The Almanac, in which classes, over which windows | decided |

## How a dossier is written

1. Explore in `scratch/`, in a notebook or in the DuckDB CLI. Keep the queries that
   survive the exploration; everything else disappears with the directory.
2. Write the dossier top-down: the decision to be made, then findings, then the
   decisions table.
3. Fill **What I did not check**. It is the first section a reviewer reads and the
   one that keeps the document honest.
4. When a dossier changes a page, the change goes through the phase 4 spec and its
   ticket, not directly into a component. A dossier argues; a spec decides.

## Doing the analysis

In `scratch/`, which git ignores, so nothing half-finished reaches a commit. From the
repository root:

```bash
uv run --project pipeline --with jupyterlab jupyter lab --no-browser --port 8888
```

`--with` installs Jupyter for that run and leaves `pipeline/pyproject.toml` alone, so
`duckdb==2.0.0` — the version `data:check` compares bytes against — does not move.
There is no Jupyter dependency to keep current and nothing for CI to install.

First cell of any notebook, because the semantic SQL reads `data/model/*.csv` with
relative paths and the kernel has to sit at the repository root:

```python
import os, pathlib

here = pathlib.Path.cwd()
for candidate in (here, *here.parents):
    if (candidate / "data" / "model" / "fact_draft_slot.csv").exists():
        os.chdir(candidate)
        break
else:
    raise RuntimeError("not inside the repository: no data/model/ above this directory")

import duckdb
con = duckdb.connect()
for sql_file in sorted(pathlib.Path("pipeline/sql").glob("0[1-4]_*.sql")):
    con.execute(sql_file.read_text())
print("cwd:", pathlib.Path.cwd())
```

### When a number is not SQL

Almost every finding here is a query and a table. A few are not, and they are the
exception the rules above leave room for:

| Finding | What the dossier carries |
|---|---|
| A count, a sum, a mean, a median | the query and the table — nothing else |
| A proportion with an interval | the query, the table, and one line: `Wilson 95%` (a named formula needs no code) |
| Anything resampled | the query, the table, and `bootstrap percentile, 10 000 resamples, seed <…>` |
| A simulation with no standard form — the tournament format step for *how many champions* | the steps, the seed, the replications, **and the function pasted in**. This is the one case in the eighteen where code belongs in a dossier, because it cannot be named instead of shown |

If more than one dossier ever needs the same function, it stops being a paste and
becomes a `pipeline/` module with a test — that is a later decision, with two
findings behind it instead of one guess.

## What a dossier is not

- **Not a spec.** It states no required behaviour and no acceptance criteria; those
  live in `docs/specs/`.
- **Not a metric definition.** Anything a page prints is defined in
  `docs/metric-definitions.md` first.
- **Not exhaustive.** It records what was asked, measured and decided — not
  everything the corpus can say.
