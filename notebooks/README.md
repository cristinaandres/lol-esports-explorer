# Notebooks

The workshop. A notebook here is the **instrument**, not the record: you explore,
break things, delete eleven attempts, and keep one. What survives is a dossier in
[`docs/analysis/`](../docs/analysis/), which is what a reader — and a reviewer —
actually reads.

```
notebooks/<question>.ipynb     the instrument: run it, change it, throw it away
        │  you copy the few queries that held up, and their results
        ▼
docs/analysis/<question>.md    the record: query, result, decision, date, pin
```

The rule is the same one the pipeline lives by: a number the site shows is checked by
`npm run data:check`; a number a dossier argues is checked by a human with the query
beside it. A notebook output checks neither, which is why it is not the record.

## Starting one

From the repository root:

```bash
uv run --project pipeline --with jupyterlab jupyter lab --no-browser --port 8888
```

`--with` installs Jupyter for that run and leaves `pipeline/pyproject.toml` alone, so
`duckdb==2.0.0` — the version `data:check` compares bytes against — does not move.
There is no Jupyter dependency to keep current, and nothing for CI to install.

First cell, always:

```python
import os, pathlib

# The semantic SQL reads data/model/*.csv with relative paths, so the kernel has to
# sit in the repository root: `jupyter lab` starts there, `nbconvert` starts in this
# directory. This finds the root from either — and stops instead of climbing forever.
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

## Outputs

**Not committed.** The `.ipynb` is committed clean: the code, the markdown, no cell
outputs. Two reasons, and they are the same reason twice:

- A committed output is a number with no gate. Re-pin the model and it keeps
  asserting yesterday's figure while nothing goes red.
- A re-run rewrites the file wholesale, so the diff stops being reviewable.

To see the results, run it:

```bash
uv run --project pipeline --with jupyterlab \
  jupyter nbconvert --to notebook --execute --inplace notebooks/<question>.ipynb
```

…then leave the outputs out of the commit (`git checkout -- notebooks/<question>.ipynb`
after looking, or `nbstripout`).

**If a readable, rendered notebook is the point** — a portfolio piece rather than an
instrument — that is a legitimate exception, and it belongs in a repository whose
whole subject is that analysis, not in this one. Say so in the PR if you want it
here anyway: it is one line in this file and one decision written down.
