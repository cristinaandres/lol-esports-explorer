/**
 * How an index is grouped, and how a sort is read from the URL.
 *
 * Two sorts, one shape: a list of groups, each with a label and its entries ordered by
 * games and then name. The difference is the label — an initial letter, or a role the
 * entity was played in most — and the order the groups come in.
 *
 * A sort lives in the URL (`?sort=role`), like the career filters, so a reader can send
 * the list they are looking at. An unknown value falls back to the default rather than
 * producing an empty page: a URL is typed by hand as often as it is copied.
 */

export type IndexSort = 'name' | 'role'

export const DEFAULT_SORT: IndexSort = 'name'

/** One row an index can show. `role` is the entity's most-played role, if it has one. */
export type IndexEntry = {
  id: string
  name: string
  games: number
  role: string | null
}

export type IndexGroup<T extends IndexEntry> = {
  label: string
  items: T[]
}

export function parseIndexSort(value: string | null | undefined): IndexSort {
  return value === 'role' ? 'role' : DEFAULT_SORT
}

/**
 * The order roles are read in: a draft order, not an alphabetical one.
 *
 * `Bot` is the model's word for bottom lane. A role outside this list — none exists
 * today, but a later pin could add one — sorts after the five rather than first, so a
 * vocabulary change shows up at the end of the page instead of at the top.
 */
export const ROLE_ORDER = ['Top', 'Jungle', 'Mid', 'Bot', 'Support'] as const

const UNKNOWN = 'Unknown'

function roleRank(role: string | null): number {
  const rank = role === null ? -1 : ROLE_ORDER.indexOf(role as (typeof ROLE_ORDER)[number])
  return rank
}

function initialOf(name: string): string {
  return /^[a-z]/i.test(name) ? name[0]!.toUpperCase() : '#'
}

/**
 * Group entries for one sort, with a stable order inside every group.
 *
 * Inside a group the order is games descending, then name: an index is for finding
 * something worth opening, so the most-played entity comes first, and the name tie-break
 * is what keeps two entities on the same count from swapping between renders.
 */
export function groupIndexEntries<T extends IndexEntry>(
  entries: readonly T[],
  sort: IndexSort,
): IndexGroup<T>[] {
  const groups = new Map<string, T[]>()

  for (const entry of entries) {
    const key = sort === 'role' ? (entry.role ?? UNKNOWN) : initialOf(entry.name)
    const bucket = groups.get(key)
    if (bucket) bucket.push(entry)
    else groups.set(key, [entry])
  }

  const ordered = [...groups.entries()].map(([label, items]) => ({
    label,
    items: [...items].sort((a, b) => b.games - a.games || a.name.localeCompare(b.name)),
  }))

  if (sort === 'role') {
    // The five roles in draft order, then anything the vocabulary does not know, then
    // the entities with no role at all — a stated absence is last, never first.
    return ordered.sort((a, b) => {
      const rank = (label: string) =>
        label === UNKNOWN ? 100 : roleRank(label) === -1 ? 50 : roleRank(label)
      return rank(a.label) - rank(b.label)
    })
  }

  return ordered.sort((a, b) => a.label.localeCompare(b.label))
}
