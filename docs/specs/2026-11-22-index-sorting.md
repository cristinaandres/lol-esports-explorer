# Sorting the three indexes, and the club a player was last seen with

Status: tickets only, nothing built. Four small navigation changes that share two
decisions — a sort is a query parameter, and every label they print is a derived
measure with a documented rule.

Tickets: `docs/specs/tickets/2026-11-22-index-sorting/`.

| Ticket | Delivers |
|---|---|
| 01 | Champions index: sort by name (as now) or by role, a champion's most-played position |
| 02 | Players index: sort by region, name, or role |
| 03 | Players index: the club a player was last seen with, as an abbreviation beside the name |
| 04 | Events index: sort by competition (as now) or by year, newest or oldest first |

## Why these belong together

None of them adds a page: each answers "I know what I am looking for, show me that
slice of this list" on a list that already exists. They share the mechanics, so they
should not each invent their own:

- **The sort is a query parameter**, like the career filters (`/players/faker?competition=Worlds`).
  `/champions?sort=role`, `/players?sort=region`, `/events?sort=year&order=asc` are
  links a reader can send; component state is not.
- **The control is one component**, a native `<select>` styled like the two in
  `CareerFilters` — not a bespoke dropdown per page.
- **No sort may produce an unstable order.** Every comparator in these tickets ends
  with the entry's name, so two rows with the same bucket cannot swap between
  renders: an artifact whose order depends on the sort implementation fails a
  reader's memory and `--check` on another machine alike.
- **A label printed next to a name is a fact about the data, so it is documented
  before it is built.** "Role", "region" and "current team" are derived here, and
  `docs/metric-definitions.md` states the rule for each before the SQL exists. That
  is rule 5 of `AGENTS.md`: no derived measure reaches an artifact without its
  definition written down first.

## What the data actually says

Measured on the v1.2.0 pin, because two of these tasks are less obvious than they
look:

| Fact | Value | Consequence |
|---|---|---|
| Roles in `fact_player_game` | 5 balanced (`Mid`, `Support`, `Jungle`, `Top`, `Bot`), 6,182 rows each | A role sort is a five-group list, not a spectrum |
| Champions that played more than one role | 139 of 171 | "Role" is "most played", never "the role" |
| Champions whose top role is a tie | 2 | Needs a tie-break, and one a reader can predict |
| Players that played more than one role | 68 of 1,140 | Same |
| Players whose top role is a tie | 6 | Same, and worth a test rather than a hope |
| Players who played for teams in more than one region | 1,062 of 1,140 | A player's "region" is a derived claim about the corpus, not a fact about a person |
| Regions a team can state | 19 values, plus 4 teams with none | The players index must have an `Unknown` bucket, or 4+ rows vanish |
| Events | 54, 10 competitions, 2011–2026 | Year is already the order inside each competition group |

## Out of scope

- No new measures, no leaderboards, no filtering by role or region: this is ordering
  a list that already exists.
- No roster or contract data. "Current team" is what the corpus last saw, and the
  copy says so; the model has no contract table and inventing one is a different
  project.
