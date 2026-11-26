# 08: The round close

**Blocked by:** 03, 04, 05, 06, 07
**Status:** done

## What to build

The proof that the Almanac is whole, and the documents that say so.

- **Data tests** over the twenty-one records in the eighteen question files:
  - the eighteen ids are exactly the catalogue, and each declares its class and
    family;
  - every `source.sha256` equals `meta.json.source.manifestSha256`, and every
    `source.artifact` is recorded in `meta.json.artifacts`;
  - every `insufficient_data` record has no interval and carries its census;
  - every `not_verifiable` record carries `verification.query`, `result_today` and
    `unblocked_by`;
  - every answered top-1 carries candidates ordered by the end's rule and no more
    than `top`;
  - every record lists its season's patches or states `all patches`;
  - every record carries the selection-bias limit;
  - the windows are `all` plus the 16 seasons, with one `cut_date` each.
- **The docs**: the spec's acceptance criteria recorded against what shipped,
  `docs/specs/README.md` and `docs/roadmap.md` moved to built, `AGENTS.md`'s current
  state updated, the glossary entry checked.
- **The check**: `npm run check` green, from a cold clone's perspective.
- **The deploy proof**: the release is only called live when the run matches the
  merge commit, the bundle is the new one, and a cold deep link to
  `/almanac/champion-presence?season=2025` renders.

## Scope

- No new behaviour. This ticket only proves what the previous ones built and records
  the gap between the plan and the result.
- The 4b backtest stays out: `/calibracion` is not linked and no calibration data is
  written.

## Acceptance criteria

- [ ] The data tests above exist and pass.
- [ ] `npm run check` passes.
- [ ] The spec's acceptance criteria are ticked or explained in its "Built" section.
- [ ] The deployed site serves `/almanac` and one entry page from a cold deep link.
- [ ] The payload and the build time recorded in ticket 02 are still the measured
      ones.

## Validation

`npm run check`; the deploy commands in `AGENTS.md`; a Playwright read of the
deployed entry page.

## Built

- **The data contract is a test, not a convention.** `src/lib/almanacData.test.ts` reads the committed index and every question artifact and asserts: the eighteen ids and the class counts; every `source.sha256` equals the pin's manifest hash and every artifact is in `meta.json`; every `class`, `family` and threshold; `all` plus the sixteen seasons (region-knockouts has only `all`); a cut date equal to the end date; patches or `all patches`; every record through `assertShape`; the selection-bias limit; no interval on `insufficient_data` and a census; a verification block on `not_verifiable`; ordered candidates; the bins, marker and citation; and that the index card prints the default window's headline and verdict.
- **The test found one honest gap.** A window can hold games but no rows for a measure (2011 states no damage; some seasons state no team kills). An `insufficient_data` record with empty candidates had an empty census; it now shows a `0 of 0` census for the measure, because an empty census would be the silent filtering R5 refuses.
- **`npm run check` is green** over the 36 artifacts.
- **The release** is a `dev → main` merge commit; the proof is the Pages run whose `headSha` is that merge and the bundle that contains `Almanac`, followed by a cold deep link to `/almanac/champion-presence?season=2025`. The commands are in `AGENTS.md`.
