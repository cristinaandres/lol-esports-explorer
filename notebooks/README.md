# Notebooks

Read-only investigations over the pinned model. A notebook here reads `data/model/`
and `public/data/` and writes nothing: the artifacts the site serves come from
`pipeline/build.py` and from nowhere else.

| Notebook | Answers | Round |
|---|---|---|
| [`bans-audit.ipynb`](bans-audit.ipynb) | Are the bans complete, and can a champion appear twice in one draft? 28,306 bans over 3,088 games; twelve integrity checks; the 22 games one ban short; the three blind-pick games | 4a |

## Running one

From the repository root:

```bash
uv run --project pipeline --with jupyterlab jupyter lab --no-browser --port 8888
```

`--with` installs Jupyter for that run and leaves `pipeline/pyproject.toml` alone, so
the pinned `duckdb==2.0.0` — the one `npm run data:check` compares bytes against —
does not move. There is no Jupyter dependency to keep current, and nothing to update
in CI.

The semantic SQL reads `data/model/*.csv` with **relative** paths, so the kernel has
to sit in the repository root. Each notebook's second cell finds the root and
`chdir`s to it, which is what lets `jupyter lab` (started at the root) and
`nbconvert` (which runs the kernel in this directory) both work unchanged.

## Outputs are committed, and that is deliberate

A notebook without its outputs is unreadable on GitHub, and being readable there is
the point: these are the evidence behind the numbers the specs claim. So the outputs
*tables* are committed — and never the environment: no absolute paths, no timing, no
cell counters that matter.

Regenerate them, do not edit them:

```bash
uv run --project pipeline --with jupyterlab \
  jupyter nbconvert --to notebook --execute --inplace notebooks/bans-audit.ipynb
```

That command is also the test: it fails if the queries stop running against the pin,
which is the only failure mode a notebook can have that matters here.
