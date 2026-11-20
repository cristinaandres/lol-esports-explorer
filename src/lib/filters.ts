
/**
 * The filter a reader narrows a career with, and the URL that carries it.
 *
 * Competition first, then year, because that is the order the question is asked
 * in: "how did they do at Worlds", and then "in which year". Both live in the
 * query string, so a filtered view is a link somebody can paste.
 *
 * The era is deliberately absent from this type. It is not a choice the reader
 * makes: it is derived from the games that survive the filter, because era and
 * year as two independent controls allow combinations that can never exist.
 */

export type CareerFilter = {
  /** The canonical competition, or null for all of them. */
  competition: string | null
  /** A four-digit year taken from the game's date, or null for all of them. */
  year: number | null
}

/**
 * What a filter needs from a row: the competition it belongs to and when it was
 * played. Career appearances and team appearances both satisfy it, which is why
 * the filter is written once and applied to both.
 */
export type Filterable = {
  competition: string
  game: { date_time_utc: string }
}

export const NO_FILTER: CareerFilter = { competition: null, year: null }

/**
 * Read a filter out of a query string.
 *
 * Only a four-digit year is accepted; anything else is dropped rather than
 * coerced, so a hand-edited `?year=last` opens the unfiltered page instead of an
 * error page. A competition the reader typed and no game carries is kept: it
 * filters to nothing, and the empty state says so, which is more useful than
 * silently ignoring what they asked for.
 */
export function parseFilter(search: URLSearchParams): CareerFilter {
  const competition = search.get('competition')
  const rawYear = search.get('year')
  const year = rawYear !== null && /^\d{4}$/.test(rawYear) ? Number(rawYear) : null

  return {
    competition: competition && competition.length > 0 ? competition : null,
    year,
  }
}

/**
 * Write a filter as a query string, with a leading '?'.
 *
 * The URL carries only what differs from the default: `?competition=Worlds`, not
 * `?competition=Worlds&year=all`. A view that spells out its defaults cannot be
 * compared to the unfiltered one by eye.
 */
export function filterSearch(filter: CareerFilter): string {
  const params = new URLSearchParams()
  if (filter.competition) params.set('competition', filter.competition)
  if (filter.year !== null) params.set('year', String(filter.year))

  const text = params.toString()
  return text ? `?${text}` : ''
}

export function isEmptyFilter(filter: CareerFilter): boolean {
  return filter.competition === null && filter.year === null
}

/** A four-digit year from the model's ISO instant, without constructing a Date. */
export function yearOf(iso: string): number {
  return Number(iso.slice(0, 4))
}

export function matches<T extends Filterable>(item: T, filter: CareerFilter): boolean {
  if (filter.competition !== null && item.competition !== filter.competition) return false
  if (filter.year !== null && yearOf(item.game.date_time_utc) !== filter.year) return false
  return true
}

export function applyFilter<T extends Filterable>(items: T[], filter: CareerFilter): T[] {
  if (isEmptyFilter(filter)) return items
  return items.filter((item) => matches(item, filter))
}

/**
 * The choices to offer, taken from every game the player has rather than from the
 * filtered set.
 *
 * Narrowing the year must not make the competition disappear from the list: the
 * reader would be unable to go back to it. Both lists are therefore the player's
 * whole range, and the ones that would empty the view are simply not reachable by
 * picking the other first.
 */
export function optionsFor<T extends Filterable>(items: T[]): { competitions: string[]; years: number[] } {
  const competitions = new Set<string>()
  const years = new Set<number>()

  for (const item of items) {
    competitions.add(item.competition)
    years.add(yearOf(item.game.date_time_utc))
  }

  return {
    competitions: [...competitions].sort((a, b) => a.localeCompare(b)),
    years: [...years].sort((a, b) => b - a),
  }
}

/**
 * Which filter emptied the view.
 *
 * Asked by applying one half at a time: if the competition alone leaves games,
 * the year is what emptied it. Naming the culprit is the difference between "no
 * games" and "no games at Worlds in 2013, try another year".
 */
export function emptyReason<T extends Filterable>(
  items: T[],
  filter: CareerFilter,
): 'competition' | 'year' | null {
  if (items.length === 0) return null
  if (applyFilter(items, filter).length > 0) return null
  if (filter.competition !== null && filter.year !== null) {
    const byCompetition = items.filter((item) => item.competition === filter.competition)
    return byCompetition.length > 0 ? 'year' : 'competition'
  }
  return filter.competition !== null ? 'competition' : 'year'
}

/**
 * The filter that brings the games back.
 *
 * Drops the half that emptied the view, and falls back to no filter at all when
 * even that leaves nothing -- so the one control on the empty state can promise
 * that the view it produces has games in it.
 */
export function recoverFilter<T extends Filterable>(items: T[], filter: CareerFilter): CareerFilter {
  const reason = emptyReason(items, filter)
  const candidates: CareerFilter[] =
    reason === 'year'
      ? [{ ...filter, year: null }, NO_FILTER]
      : [{ ...filter, competition: null }, NO_FILTER]

  return candidates.find((candidate) => applyFilter(items, candidate).length > 0) ?? NO_FILTER
}
