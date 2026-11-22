/**
 * How the events index is grouped, and how those choices are read from the URL.
 *
 * Two shapes over the same 54 events:
 *
 *  - **competition** — the page's original answer, and the default: a reader who
 *    follows Worlds wants Worlds together. Groups run largest first, and the events
 *    inside one run newest first, which is how a competition's history reads.
 *  - **year** — the other axis: what happened in 2026, then 2025. A year is not a
 *    rank, so the direction applies to the year groups and the events inside one are
 *    ordered by name.
 *
 * Both sorts are URL parameters (`?sort=year&order=asc`), so every view is a link a
 * reader can send, and an unknown value falls back to the default instead of an empty
 * page — a URL is typed by hand as often as it is copied.
 */

export type EventSort = 'competition' | 'year'
export type SortOrder = 'asc' | 'desc'

export const DEFAULT_EVENT_SORT: EventSort = 'competition'
export const DEFAULT_ORDER: SortOrder = 'desc'

export type EventRowLike = {
  event_name: string
  competition: string
  year: number
}

export type EventGroup<T extends EventRowLike> = {
  label: string
  events: T[]
}

export function parseEventSort(value: string | null | undefined): EventSort {
  return value === 'year' ? 'year' : DEFAULT_EVENT_SORT
}

export function parseSortOrder(value: string | null | undefined): SortOrder {
  return value === 'asc' ? 'asc' : DEFAULT_ORDER
}

/** Newest first: the order a competition's history and the year axis both default to. */
function byYearThenName<T extends EventRowLike>(a: T, b: T): number {
  return b.year - a.year || a.event_name.localeCompare(b.event_name)
}

export function groupEvents<T extends EventRowLike>(
  events: readonly T[],
  sort: EventSort,
  order: SortOrder,
): EventGroup<T>[] {
  const groups = new Map<string, T[]>()

  for (const event of events) {
    const key = sort === 'year' ? String(event.year) : event.competition
    const bucket = groups.get(key)
    if (bucket) bucket.push(event)
    else groups.set(key, [event])
  }

  const collected = [...groups.entries()].map(([label, rows]) => ({ label, events: [...rows] }))

  if (sort === 'year') {
    return collected
      .map((group) => ({
        ...group,
        // A year group reads as a list, not a ranking: inside it, name is the order.
        events: group.events.sort((a, b) => a.event_name.localeCompare(b.event_name)),
      }))
      .sort((a, b) => {
        const years = Number(a.label) - Number(b.label)
        return order === 'asc' ? years : -years
      })
  }

  return collected
    .map((group) => ({ ...group, events: group.events.sort(byYearThenName) }))
    .sort(
      (a, b) =>
        b.events.length - a.events.length || a.label.localeCompare(b.label),
    )
}
